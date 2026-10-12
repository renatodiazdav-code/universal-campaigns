import { createHmac, timingSafeEqual } from "node:crypto";

export const SHOPIFY_API_VERSION = "2026-10";
export const SHOPIFY_PRODUCT_SCOPES = ["read_products"];

export class ShopifyError extends Error {
  constructor(message, status = 502, code = "SHOPIFY_ERROR") {
    super(message); this.status = status; this.code = code;
  }
}

export function normalizeShopDomain(value) {
  if (typeof value !== "string" || value.length > 200) throw new ShopifyError("Enter your Shopify store address.", 400, "INVALID_SHOP");
  let shop = value.trim().toLowerCase();
  if (shop.startsWith("https://")) {
    let url;
    try { url = new URL(shop); } catch { /* validated below */ }
    if (!url || url.username || url.password || url.port || url.search || url.hash || !["", "/"].includes(url.pathname)) {
      throw new ShopifyError("Use your store’s myshopify.com address.", 400, "INVALID_SHOP");
    }
    shop = url.hostname;
  }
  if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(shop)) shop += ".myshopify.com";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(shop)) {
    throw new ShopifyError("Use your store’s myshopify.com address.", 400, "INVALID_SHOP");
  }
  return shop;
}

export function verifyShopifyCallback(params, secret, now = Date.now()) {
  if (!secret || !(params instanceof URLSearchParams)) return false;
  const seen = new Set();
  for (const [key] of params) { if (seen.has(key)) return false; seen.add(key); }
  const supplied = params.get("hmac");
  const timestamp = Number(params.get("timestamp"));
  if (!/^[a-fA-F0-9]{64}$/.test(supplied ?? "") || !params.has("timestamp") ||
      !Number.isInteger(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > 90) return false;
  // Match the Admin HMAC canonicalization used by Shopify's official JS SDK.
  const sorted = [...params].filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right));
  const message = new URLSearchParams(sorted).toString().replace(/\+/g, "%20");
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(supplied, "hex"));
}

export function hasProductScope(scope) {
  const scopes = new Set(String(scope ?? "").split(",").map((value) => value.trim()));
  return scopes.has("read_products") || scopes.has("write_products");
}

export function normalizeOfflineToken(data, now = Date.now(), previousScope = null) {
  const scope = data?.scope ?? previousScope;
  if (!hasProductScope(scope)) throw new ShopifyError("Approve product access to connect your store.", 403, "MISSING_SCOPE");
  if (typeof data?.access_token !== "string" || !data.access_token || typeof data.refresh_token !== "string" || !data.refresh_token ||
      !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0 ||
      !Number.isFinite(Number(data.refresh_token_expires_in)) || Number(data.refresh_token_expires_in) <= 0) {
    throw new ShopifyError("Shopify returned an incomplete authorization. Connect your store again.", 502, "INVALID_TOKEN_RESPONSE");
  }
  return {
    accessToken: data.access_token, refreshToken: data.refresh_token,
    scope, expiresAt: now + Number(data.expires_in) * 1000,
    refreshExpiresAt: now + Number(data.refresh_token_expires_in) * 1000,
  };
}

export async function shopifyFetch(url, options, fetchImpl = fetch) {
  try { return await fetchImpl(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15000) }); }
  catch { throw new ShopifyError("Shopify could not be reached. Try again shortly.", 503, "SHOPIFY_UNAVAILABLE"); }
}

async function tokenRequest({ shop, clientId, clientSecret, parameters, fetchImpl }) {
  if (!clientId || !clientSecret) throw new ShopifyError("Shopify connection is not configured yet.", 503, "APP_NOT_CONFIGURED");
  const response = await shopifyFetch(`https://${normalizeShopDomain(shop)}/admin/oauth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...parameters }),
  }, fetchImpl);
  if (!response.ok) {
    if (response.status === 401) throw new ShopifyError("Reconnect Shopify to restore access.", 409, "REAUTHORIZE");
    if (response.status === 429 || response.status >= 500) throw new ShopifyError("Shopify is temporarily unavailable. Try again shortly.", 503, "SHOPIFY_UNAVAILABLE");
    throw new ShopifyError("Shopify authorization could not be completed. Start the connection again.", 502, "TOKEN_EXCHANGE_FAILED");
  }
  try { return await response.json(); }
  catch { throw new ShopifyError("Shopify returned an invalid response. Try connecting again.", 502, "INVALID_TOKEN_RESPONSE"); }
}

export function exchangeShopifyCode(options) {
  return tokenRequest({ ...options, parameters: { code: options.code, expiring: "1" } });
}
export function refreshShopifyToken(options) {
  return tokenRequest({ ...options, parameters: { grant_type: "refresh_token", refresh_token: options.refreshToken } });
}

export async function shopifyGraphql({ shop, accessToken, query, variables = {}, fetchImpl = fetch }) {
  const response = await shopifyFetch(`https://${normalizeShopDomain(shop)}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query, variables }),
  }, fetchImpl);
  if (response.status === 401) throw new ShopifyError("Reconnect Shopify to restore access.", 409, "REAUTHORIZE");
  if (response.status === 429 || response.status >= 500) throw new ShopifyError("Shopify is temporarily unavailable. Try again shortly.", 503, "SHOPIFY_UNAVAILABLE");
  if (!response.ok) throw new ShopifyError("Shopify could not provide the requested data. Check your permissions.", 502, "SHOPIFY_REQUEST_FAILED");
  let result;
  try { result = await response.json(); } catch { throw new ShopifyError("Shopify returned an invalid response.", 502, "INVALID_RESPONSE"); }
  if (Array.isArray(result.errors) && result.errors.length) {
    if (result.errors.some((error) => error.extensions?.code === "THROTTLED")) throw new ShopifyError("Shopify is busy. Try again shortly.", 503, "SHOPIFY_UNAVAILABLE");
    if (result.errors.some((error) => error.extensions?.code === "ACCESS_DENIED")) throw new ShopifyError("Approve product access by reconnecting Shopify.", 403, "MISSING_SCOPE");
    throw new ShopifyError("Shopify could not provide the requested data.", 502, "SHOPIFY_REQUEST_FAILED");
  }
  if (!result.data) throw new ShopifyError("Shopify returned no data.", 502, "INVALID_RESPONSE");
  return result.data;
}

export async function getShopifyStore(options) {
  const data = await shopifyGraphql({ ...options, query: "query RelayStore { shop { id name myshopifyDomain currencyCode primaryDomain { url } } }" });
  const store = data.shop;
  if (!store?.id || typeof store.myshopifyDomain !== "string" || normalizeShopDomain(store.myshopifyDomain) !== normalizeShopDomain(options.shop)) {
    throw new ShopifyError("Shopify returned a different store. Start the connection again.", 502, "SHOP_MISMATCH");
  }
  return { id: store.id, name: store.name, domain: store.myshopifyDomain, currency: store.currencyCode, storefrontUrl: store.primaryDomain?.url ?? null };
}
