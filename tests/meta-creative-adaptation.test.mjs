import test from "node:test";
import assert from "node:assert/strict";

import { createMetaClient } from "../src/connectors/meta/client.mjs";
import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";

function createJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test("opts image creatives into Meta placement adaptation and auto crop only", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = null;

  globalThis.fetch = async (_url, options = {}) => {
    capturedBody = options.body;
    return createJsonResponse({ id: "creative-123" });
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    await meta.createAdCreative({
      name: "Relay Adapted Creative",
      pageId: "page-123",
      message: "Discover Test Sneakers.",
      headline: "Test Sneakers",
      destinationUrl:
        "https://example.com/products/test-sneakers",
      imageUrl: "https://example.com/sneakers.jpg",
      callToAction: "SHOP_NOW",
      creativeAdaptation: {
        mode: "AUTOMATIC",
        adaptToPlacement: true,
        imageAutoCrop: true,
        videoAutoCrop: true,
        generativeExpansion: false,
      },
    });

    const spec = JSON.parse(
      capturedBody.get("degrees_of_freedom_spec")
    );

    assert.deepEqual(spec.creative_features_spec, {
      adapt_to_placement: {
        enroll_status: "OPT_IN",
      },
      image_auto_crop: {
        enroll_status: "OPT_IN",
      },
    });

    assert.equal(
      "image_uncrop" in spec.creative_features_spec,
      false
    );
    assert.equal(
      "video_auto_crop" in spec.creative_features_spec,
      false
    );
    assert.equal(
      "text_optimizations" in spec.creative_features_spec,
      false
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("passes Relay automatic creative adaptation through Meta execution", async () => {
  const campaign = createUniversalCampaign({
    name: "Test Sneakers Campaign",
    goal: "SALES",
    product: {
      source: "SHOPIFY",
      id: "product-1",
      title: "Test Sneakers",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/sneakers.jpg",
      destinationUrl:
        "https://example.com/products/test-sneakers",
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
      destinationUrl:
        "https://example.com/products/test-sneakers",
    },
  });

  const calls = [];
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
    connection: {
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
    },
    metaClient: fakeMeta,
    now: new Date("2026-10-11T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");

  const creativeCall = calls.find(
    (call) => call.method === "createAdCreative"
  );

  assert.deepEqual(creativeCall.input.creativeAdaptation, {
    mode: "AUTOMATIC",
    adaptToPlacement: true,
    imageAutoCrop: true,
    videoAutoCrop: true,
    generativeExpansion: false,
  });

  assert.deepEqual(result.configuration.creativeAdaptation, {
    mode: "AUTOMATIC",
    adaptToPlacement: true,
    imageAutoCrop: true,
    videoAutoCrop: true,
    generativeExpansion: false,
  });
});
