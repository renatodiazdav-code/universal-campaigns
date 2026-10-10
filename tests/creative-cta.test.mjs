import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

function createCampaign() {
  return createUniversalCampaign({
    name: "CTA Test Campaign",
    goal: "SALES",
    product: {
      source: "SHOPIFY",
      id: "product-1",
      title: "Test Product",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/product.jpg",
      destinationUrl: "https://example.com/products/test",
    },
    audience: {
      countries: ["PE"],
      ageMin: 18,
      ageMax: 35,
      gender: "ALL",
    },
    budget: {
      mode: "TOTAL",
      amount: 100,
      currency: "PEN",
      durationDays: 7,
      allocation: {
        mode: "MANUAL",
        meta: 100,
        tiktok: 0,
      },
    },
    platforms: {
      meta: {
        enabled: true,
        facebook: true,
        instagram: true,
      },
      tiktok: {
        enabled: false,
      },
    },
    creative: {
      type: "IMAGE",
      primaryText: "Buy this product.",
      headline: "Test Product",
      destinationUrl: "https://example.com/products/test",
    },
  });
}

function createConnection() {
  return {
    accessToken: "fake-token",
    setup: {
      adAccount: { id: "act_123", name: "Test account" },
      page: { id: "page-123", name: "Test page" },
    },
    salesSetup: {
      pixel: { id: "pixel-123", name: "Test pixel" },
    },
  };
}

test("defaults SALES creative CTA to SHOP_NOW and passes it to Meta execution", async () => {
  const campaign = createCampaign();
  const calls = [];

  assert.equal(campaign.creative.callToAction, "SHOP_NOW");

  const fakeMeta = {
    async createCampaign(input) {
      calls.push({ method: "createCampaign", input });
      return { id: "campaign-123" };
    },
    async createAdSet(input) {
      calls.push({ method: "createAdSet", input });
      return { id: "adset-123" };
    },
    async createAdCreative(input) {
      calls.push({ method: "createAdCreative", input });
      return { id: "creative-123" };
    },
    async createAd(input) {
      calls.push({ method: "createAd", input });
      return { id: "ad-123" };
    },
  };

  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: fakeMeta,
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  const creativeCall = calls.find(
    (call) => call.method === "createAdCreative"
  );

  assert.equal(creativeCall.input.callToAction, "SHOP_NOW");
  assert.equal(result.configuration.callToAction, "SHOP_NOW");
});

test("encodes SHOP_NOW inside Meta object_story_spec link_data", async () => {
  const originalFetch = globalThis.fetch;
  let capturedObjectStorySpec = null;

  globalThis.fetch = async (_url, options = {}) => {
    capturedObjectStorySpec = JSON.parse(
      options.body.get("object_story_spec")
    );

    return {
      ok: true,
      status: 200,
      async json() {
        return { id: "creative-123" };
      },
    };
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    await meta.createAdCreative({
      name: "CTA Creative",
      pageId: "page-123",
      message: "Buy now",
      headline: "Test Product",
      destinationUrl: "https://example.com/products/test",
      imageUrl: "https://example.com/product.jpg",
      callToAction: "SHOP_NOW",
    });

    assert.equal(
      capturedObjectStorySpec.link_data.call_to_action.type,
      "SHOP_NOW"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
