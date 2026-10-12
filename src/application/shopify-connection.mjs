import { randomBytes, randomUUID } from "node:crypto";
import { hashToken } from "./auth-service.mjs";
import { createConnectionStore } from "./connection-store.mjs";
import { getRelayDatabase } from "../infrastructure/database.mjs";
import {
  ShopifyError, SHOPIFY_PRODUCT_SCOPES, normalizeShopDomain, verifyShopifyCallback,
  normalizeOfflineToken, exchangeShopifyCode, refreshShopifyToken, getShopifyStore,
} from "../connectors/shopify/client.mjs";

const refreshes = new WeakMap();

export function createShopifyConnectionService({
  db = getRelayDatabase(), store = createConnectionStore({ db }), fetchImpl = fetch, now = Date.now,
  clientId = process.env.SHOPIFY_CLIENT_ID, clientSecret = process.env.SHOPIFY_CLIENT_SECRET,
} = {}) {
  function credentials() {
    if (!clientId || !clientSecret) throw new ShopifyError("Shopify connection is not configured yet.", 503, "APP_NOT_CONFIGURED");
  }
  function activeSession(userId, sessionHash) {
    const session = db.prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?").get(sessionHash, now());
    if (!session || session.user_id !== userId) throw new ShopifyError("Sign in again before connecting Shopify.", 401, "INVALID_SESSION");
  }
  async function latestOrError(userId) {
    const latest = await store.forUser(userId).get("shopify");
    if (!latest?.accessToken) throw new ShopifyError("Connect your Shopify store first.", 409, "NOT_CONNECTED");
    return latest;
  }
  async function refresh(userId) {
    const lease = randomUUID();
    const acquired = db.prepare(`INSERT INTO connection_refresh_locks (user_id, provider, lease_id, expires_at) VALUES (?, 'shopify', ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET lease_id = excluded.lease_id, expires_at = excluded.expires_at
      WHERE connection_refresh_locks.expires_at <= ?`).run(userId, lease, now() + 45000, now());
    if (acquired.changes !== 1) throw new ShopifyError("Your Shopify connection is refreshing. Try again shortly.", 503, "REFRESH_IN_PROGRESS");
    try {
      const scoped = store.forUser(userId);
      const current = await scoped.getVersioned("shopify");
      if (!current?.value.accessToken) throw new ShopifyError("Connect your Shopify store first.", 409, "NOT_CONNECTED");
      const connection = current.value;
      if (connection.expiresAt == null || connection.expiresAt > now() + 60000) return connection;
      try {
        credentials();
        if (!connection.refreshToken || (connection.refreshExpiresAt != null && connection.refreshExpiresAt <= now())) {
          throw new ShopifyError("Reconnect Shopify to restore access.", 409, "REAUTHORIZE");
        }
        const token = await refreshShopifyToken({ shop: connection.shop, refreshToken: connection.refreshToken, clientId, clientSecret, fetchImpl });
        const updated = { ...connection, ...normalizeOfflineToken(token, now(), connection.scope), status: "CONNECTED", refreshedAt: new Date(now()).toISOString() };
        if (!await scoped.updateIfCurrent("shopify", updated, current.revision)) return latestOrError(userId);
        return updated;
      } catch (error) {
        if (error.code === "REAUTHORIZE") {
          const invalidated = await scoped.updateIfCurrent("shopify", { ...connection, accessToken: null, refreshToken: null, status: "REAUTHORIZE_REQUIRED" }, current.revision);
          if (!invalidated) return latestOrError(userId);
        }
        throw error;
      }
    } finally {
      db.prepare("DELETE FROM connection_refresh_locks WHERE user_id = ? AND provider = 'shopify' AND lease_id = ?").run(userId, lease);
    }
  }
  return {
    begin({ userId, sessionHash, shop, redirectUri }) {
      credentials(); activeSession(userId, sessionHash);
      shop = normalizeShopDomain(shop);
      const state = randomBytes(32).toString("base64url");
      db.prepare("DELETE FROM shopify_oauth_states WHERE expires_at <= ?").run(now());
      db.prepare("INSERT INTO shopify_oauth_states (state_hash, user_id, session_hash, shop, expires_at) VALUES (?, ?, ?, ?, ?)")
        .run(hashToken(state), userId, sessionHash, shop, now() + 10 * 60 * 1000);
      const params = new URLSearchParams({ client_id: clientId, scope: SHOPIFY_PRODUCT_SCOPES.join(","), redirect_uri: redirectUri, state });
      return { authorizationUrl: `https://${shop}/admin/oauth/authorize?${params}`, shop };
    },
    async complete({ userId, sessionHash, params }) {
      credentials(); activeSession(userId, sessionHash);
      if (!verifyShopifyCallback(params, clientSecret, now())) throw new ShopifyError("Shopify authorization could not be verified. Start the connection again.", 403, "INVALID_SIGNATURE");
      const shop = normalizeShopDomain(params.get("shop"));
      const state = params.get("state");
      const code = params.get("code");
      if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !code || code.length > 512) throw new ShopifyError("Start connecting Shopify again.", 400, "INVALID_CALLBACK");
      const consumed = db.prepare(`DELETE FROM shopify_oauth_states WHERE state_hash = ? AND user_id = ? AND session_hash = ? AND shop = ? AND expires_at > ?
        AND EXISTS (SELECT 1 FROM sessions WHERE token_hash = ? AND user_id = ? AND expires_at > ?)`).run(hashToken(state), userId, sessionHash, shop, now(), sessionHash, userId, now());
      if (consumed.changes !== 1) throw new ShopifyError("This connection request expired or belongs to a different session. Start again.", 403, "INVALID_STATE");
      const response = await exchangeShopifyCode({ shop, code, clientId, clientSecret, fetchImpl });
      const token = normalizeOfflineToken(response, now());
      let metadata = null;
      try { metadata = await getShopifyStore({ shop, accessToken: token.accessToken, fetchImpl }); }
      catch (error) { if (error.code !== "SHOPIFY_UNAVAILABLE") throw error; }
      const connection = { shop, ...token, store: metadata, source: "OAUTH", status: "CONNECTED", connectedAt: new Date(now()).toISOString() };
      await store.forUser(userId).save("shopify", connection);
      return { shop, store: metadata, scope: token.scope };
    },
    async get(userId) {
      const connection = await store.forUser(userId).get("shopify");
      if (!connection?.accessToken) throw new ShopifyError(connection?.status === "REAUTHORIZE_REQUIRED" ? "Reconnect Shopify to restore access." : "Connect your Shopify store first.", 409, connection?.status === "REAUTHORIZE_REQUIRED" ? "REAUTHORIZE" : "NOT_CONNECTED");
      normalizeShopDomain(connection.shop);
      if (connection.expiresAt == null || connection.expiresAt > now() + 60000) return connection;
      let pending = refreshes.get(db);
      if (!pending) { pending = new Map(); refreshes.set(db, pending); }
      if (!pending.has(userId)) {
        const operation = refresh(userId).finally(() => pending.delete(userId));
        pending.set(userId, operation);
      }
      return pending.get(userId);
    },
    async invalidate(userId, accessToken) {
      const scoped = store.forUser(userId);
      const current = await scoped.getVersioned("shopify");
      // A late error from an old token must not disconnect a newer authorization.
      if (current?.value.accessToken === accessToken) await scoped.updateIfCurrent("shopify", {
        ...current.value, accessToken: null, refreshToken: null, status: "REAUTHORIZE_REQUIRED",
      }, current.revision);
    },
  };
}

export function shopifyErrorResponse(error) {
  if (!(error instanceof ShopifyError)) console.error("Shopify connection failed:", error.message);
  return Response.json({ error: error instanceof ShopifyError ? error.message : "Could not complete your Shopify connection.", code: error instanceof ShopifyError ? error.code : "SHOPIFY_ERROR" },
    { status: error instanceof ShopifyError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
