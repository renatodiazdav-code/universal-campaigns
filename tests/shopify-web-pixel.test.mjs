import test from "node:test";
import assert from "node:assert/strict";

import { inspectShopifyWebPixelAccess } from "../src/connectors/shopify/web-pixel.mjs";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test("reports CONFIGURED when Relay has Shopify Web Pixel access and a pixel record", async () => {
  let requestedUrl = null;
  let requestedOptions = null;

  const result = await inspectShopifyWebPixelAccess({
    shop: "luvixy",
    accessToken: "fake-token",
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;

      return jsonResponse({
        data: {
          webPixel: {
            id: "gid://shopify/WebPixel/123",
            settings: { relay: true },
          },
        },
      });
    },
  });

  assert.equal(
    requestedUrl,
    "https://luvixy.myshopify.com/admin/api/2026-10/graphql.json"
  );
  assert.equal(
    requestedOptions.headers["X-Shopify-Access-Token"],
    "fake-token"
  );

  const body = JSON.parse(requestedOptions.body);
  assert.match(body.query, /webPixel/);
  assert.equal(result.status, "CONFIGURED");
  assert.equal(result.hasAccess, true);
  assert.equal(result.webPixel.id, "gid://shopify/WebPixel/123");
});

test("reports NOT_CONFIGURED when Relay can query Web Pixels but has no pixel record", async () => {
  const result = await inspectShopifyWebPixelAccess({
    shop: "luvixy",
    accessToken: "fake-token",
    fetchImpl: async () =>
      jsonResponse({
        data: {
          webPixel: null,
        },
      }),
  });

  assert.equal(result.status, "NOT_CONFIGURED");
  assert.equal(result.hasAccess, true);
  assert.equal(result.webPixel, null);
});

test("reports MISSING_SCOPE when Shopify denies read_pixels access", async () => {
  const result = await inspectShopifyWebPixelAccess({
    shop: "luvixy",
    accessToken: "fake-token",
    fetchImpl: async () =>
      jsonResponse({
        errors: [
          {
            message:
              "Access denied for webPixel field. Required access: `read_pixels` access scope.",
          },
        ],
      }),
  });

  assert.equal(result.status, "MISSING_SCOPE");
  assert.equal(result.hasAccess, false);
  assert.match(result.error, /read_pixels/);
});
