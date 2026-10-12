import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { openRelayDatabase } from "../src/infrastructure/database.mjs";
import { createConnectionStore } from "../src/application/connection-store.mjs";
import { createShopifyOnboarding } from "../src/application/shopify-onboarding.mjs";
import { createAuthService } from "../src/application/auth-service.mjs";

const now = 1800000000000;
const secret = "test-shopify-secret";
function sign(fields) {
  const params = new URLSearchParams(fields);
  const sorted = new URLSearchParams([...params].sort(([a], [b]) => a.localeCompare(b)));
  params.set("hmac", createHmac("sha256", secret).update(sorted.toString().replace(/\+/g, "%20")).digest("hex"));
  return params;
}
function callback(start, fields = {}) {
  return sign({ shop: "luvixy.myshopify.com", code: "one-use-code", state: new URL(start.authorizationUrl).searchParams.get("state"), timestamp: String(now / 1000), ...fields });
}
function setup() {
  const db = openRelayDatabase(":memory:");
  const connections = createConnectionStore({ db, encryptionKey: randomBytes(32) });
  let exchanges = 0;
  const fetchImpl = async (url, options) => {
    if (url.endsWith("/oauth/access_token")) {
      exchanges++;
      assert.equal(options.body.get("expiring"), "1");
      return Response.json({ access_token: "secret-access", refresh_token: "secret-refresh", scope: "read_products", expires_in: 3600, refresh_token_expires_in: 360000 });
    }
    return Response.json({ data: { shop: { id: "gid://shopify/Shop/1", name: "Luvixy", myshopifyDomain: "luvixy.myshopify.com", currencyCode: "PEN", primaryDomain: { url: "https://luvixy.test" } } } });
  };
  const onboarding = createShopifyOnboarding({ db, connections, fetchImpl, now: () => now, clientId: "test-client", clientSecret: secret });
  return { db, connections, onboarding, getExchanges: () => exchanges };
}

test("Shopify sign-up creates one store-owned account, encrypted connection and a real Relay session", async () => {
  const { db, connections, onboarding, getExchanges } = setup();
  try {
    const first = onboarding.start({ shop: "luvixy", redirectUri: "https://relay.test/api/shopify/onboarding/callback" });
    const authorize = new URL(first.authorizationUrl);
    assert.equal(authorize.hostname, "luvixy.myshopify.com");
    assert.equal(authorize.searchParams.get("scope"), "read_products");
    assert.equal(authorize.searchParams.get("redirect_uri"), "https://relay.test/api/shopify/onboarding/callback");
    const result = await onboarding.complete({ params: callback(first), browserNonce: first.browserNonce });
    assert.equal(result.shop, "luvixy.myshopify.com");
    const auth = createAuthService({ db, now: () => now }).authenticate(result.token);
    assert.equal(auth.user.id, result.userId);
    assert.equal(auth.user.email, null);
    const saved = await connections.forUser(result.userId).get("shopify");
    assert.equal(saved.store.name, "Luvixy");
    assert.equal(saved.accessToken, "secret-access");
    assert.ok(!db.prepare("SELECT encrypted_payload FROM connections").get().encrypted_payload.includes("secret-access"));
    await assert.rejects(onboarding.complete({ params: callback(first), browserNonce: first.browserNonce }), (error) => error.code === "INVALID_STATE");
    const second = onboarding.start({ shop: "luvixy.myshopify.com", redirectUri: "https://relay.test/api/shopify/onboarding/callback" });
    const returnVisit = await onboarding.complete({ params: callback(second), browserNonce: second.browserNonce });
    assert.equal(returnVisit.userId, result.userId);
    assert.equal(db.prepare("SELECT count(*) AS total FROM users").get().total, 1);
    assert.equal(getExchanges(), 2);
  } finally { db.close(); }
});

test("wrong browser, wrong store, expired state and forged signature cannot exchange a code", async () => {
  const { db, onboarding, getExchanges } = setup();
  try {
    const start = onboarding.start({ shop: "luvixy", redirectUri: "https://relay.test/callback" });
    await assert.rejects(onboarding.complete({ params: callback(start), browserNonce: randomBytes(32).toString("base64url") }), (error) => error.code === "INVALID_STATE");
    await assert.rejects(onboarding.complete({ params: callback(start, { shop: "another.myshopify.com" }), browserNonce: start.browserNonce }), (error) => error.code === "INVALID_STATE");
    const forged = callback(start); forged.set("code", "forged");
    await assert.rejects(onboarding.complete({ params: forged, browserNonce: start.browserNonce }), (error) => error.code === "INVALID_SIGNATURE");
    assert.equal(getExchanges(), 0);
  } finally { db.close(); }
});
