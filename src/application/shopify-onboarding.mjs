import { randomBytes, randomUUID } from "node:crypto";
import { createAuthService, hashToken } from "./auth-service.mjs";
import { createConnectionStore } from "./connection-store.mjs";
import { getRelayDatabase } from "../infrastructure/database.mjs";
import { ShopifyError, SHOPIFY_PRODUCT_SCOPES, normalizeShopDomain, verifyShopifyCallback, exchangeShopifyCode, normalizeOfflineToken, getShopifyStore } from "../connectors/shopify/client.mjs";

const NONCE = /^[A-Za-z0-9_-]{43}$/;
export const SHOPIFY_ONBOARDING_COOKIE = "relay_shopify_onboarding";

export function createShopifyOnboarding({ db = getRelayDatabase(), connections = createConnectionStore({ db }), fetchImpl = fetch, now = Date.now,
  clientId = process.env.SHOPIFY_CLIENT_ID, clientSecret = process.env.SHOPIFY_CLIENT_SECRET } = {}) {
  function credentials() {
    if (!clientId || !clientSecret) throw new ShopifyError("Shopify sign-up is not configured yet.", 503, "APP_NOT_CONFIGURED");
  }
  return {
    start({ shop, redirectUri }) {
      credentials();
      shop = normalizeShopDomain(shop);
      const state = randomBytes(32).toString("base64url");
      const browserNonce = randomBytes(32).toString("base64url");
      db.prepare("DELETE FROM shopify_onboarding_states WHERE expires_at <= ?").run(now());
      db.prepare("INSERT INTO shopify_onboarding_states VALUES (?, ?, ?, ?)")
        .run(hashToken(state), hashToken(browserNonce), shop, now() + 10 * 60 * 1000);
      const params = new URLSearchParams({ client_id: clientId, scope: SHOPIFY_PRODUCT_SCOPES.join(","), redirect_uri: redirectUri, state });
      return { authorizationUrl: `https://${shop}/admin/oauth/authorize?${params}`, browserNonce };
    },
    async complete({ params, browserNonce }) {
      credentials();
      if (!verifyShopifyCallback(params, clientSecret, now())) throw new ShopifyError("Shopify could not verify this sign-up. Start again.", 403, "INVALID_SIGNATURE");
      const state = params.get("state"), code = params.get("code"), shop = normalizeShopDomain(params.get("shop"));
      if (!NONCE.test(state ?? "") || !NONCE.test(browserNonce ?? "") || !code || code.length > 512) {
        throw new ShopifyError("Start with Shopify again in the same browser.", 403, "INVALID_STATE");
      }
      const consumed = db.prepare("DELETE FROM shopify_onboarding_states WHERE state_hash = ? AND browser_hash = ? AND shop = ? AND expires_at > ?")
        .run(hashToken(state), hashToken(browserNonce), shop, now());
      if (consumed.changes !== 1) throw new ShopifyError("This Shopify sign-up expired or was already used. Start again.", 403, "INVALID_STATE");
      const response = await exchangeShopifyCode({ shop, code, clientId, clientSecret, fetchImpl });
      const token = normalizeOfflineToken(response, now());
      const metadata = await getShopifyStore({ shop, accessToken: token.accessToken, fetchImpl });
      // The verified Shopify store, not a merchant-supplied email, owns this Relay identity.
      let userId;
      db.exec("BEGIN IMMEDIATE");
      try {
        const existing = db.prepare("SELECT user_id FROM shopify_identities WHERE shop = ?").get(shop);
        userId = existing?.user_id ?? randomUUID();
        if (!existing) {
          const internalEmail = `shopify-${hashToken(shop)}@relay.invalid`;
          db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
            .run(userId, internalEmail, String(metadata.name || shop).slice(0, 100), "shopify-oauth-only", new Date(now()).toISOString());
          db.prepare("INSERT INTO shopify_identities (shop, user_id) VALUES (?, ?)").run(shop, userId);
        }
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
      await connections.forUser(userId).save("shopify", {
        shop, ...token, store: metadata, source: "OAUTH", status: "CONNECTED", connectedAt: new Date(now()).toISOString(),
      });
      return { userId, token: createAuthService({ db, now }).createSession(userId), shop };
    },
  };
}
