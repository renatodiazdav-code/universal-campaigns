import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

function createCampaign() {
  return createUniversalCampaign({
    name: "Instagram Identity Test",
    goal: "SALES",
    product: {
      source: "SHOPIFY",
      id: "product-1",
      title: "Test Sneakers",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/sneakers.jpg",
      destinationUrl: "https://example.com/products/test-sneakers",
    },
    audience: {
      countries: ["PE"],
      ageMin: 18,
      ageMax: 35,
      gender: "ALL",
    },
    budget: {
      mode: "TOTAL",
      amount: 50,
      currency: "PEN",
      durationDays: 7,
      allocation: {
        mode: "MANUAL",
        meta: 50,
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
      primaryText: "Discover Test Sneakers.",
      headline: "Test Sneakers",
      destinationUrl: "https://example.com/products/test-sneakers",
      callToAction: "SHOP_NOW",
    },
  });
}

function createConnection() {
  return {
    accessToken: "fake-token",
    setup: {
      adAccount: {
        id: "act_123",
        name: "Test Ad Account",
      },
      page: {
        id: "page-123",
        name: "Test Page",
      },
    },
    salesSetup: {
      pixel: {
        id: "pixel-123",
        name: "Test Pixel",
      },
    },
    identity: {
      instagram: {
        mode: "INSTAGRAM_ACCOUNT",
        account: {
          id: "ig-123",
          username: "teststore",
          name: "Test Store",
        },
      },
    },
  };
}

function createFakeMeta(calls) {
  return {
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
}

test("passes the selected Instagram identity through Meta execution", async () => {
  const calls = [];

  const result = await executeMetaCampaign({
    campaign: createCampaign(),
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  const creativeCall = calls.find(
    (call) => call.method === "createAdCreative"
  );

  assert.equal(result.status, "CREATED");
  assert.equal(creativeCall.input.instagramActorId, "ig-123");
  assert.equal(result.configuration.instagramIdentity.id, "ig-123");
  assert.equal(
    result.configuration.instagramIdentity.username,
    "teststore"
  );
});

test("encodes instagram_actor_id inside Meta object_story_spec", async () => {
  const originalFetch = globalThis.fetch;
  let capturedStory = null;

  globalThis.fetch = async (_url, options = {}) => {
    capturedStory = JSON.parse(
      options.body.get("object_story_spec")
    );

    return {
      ok: true,
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
      name: "Creative",
      pageId: "page-123",
      message: "Message",
      headline: "Headline",
      destinationUrl: "https://example.com/product",
      imageUrl: "https://example.com/image.jpg",
      callToAction: "SHOP_NOW",
      instagramActorId: "ig-123",
    });

    assert.equal(capturedStory.page_id, "page-123");
    assert.equal(capturedStory.instagram_actor_id, "ig-123");
    assert.equal(
      capturedStory.link_data.call_to_action.type,
      "SHOP_NOW"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
