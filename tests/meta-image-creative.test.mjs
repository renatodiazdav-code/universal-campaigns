import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { buildMetaCampaignPlan } from "../src/adapters/meta/campaign-plan.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";
import { uploadMetaAdImage } from "../src/connectors/meta/image-upload.mjs";

function createImageInput() {
  return {
    name: "Image Campaign",
    goal: "SALES",
    product: {
      source: "SHOPIFY",
      id: "product-1",
      title: "Test Sneakers",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/shopify-image.jpg",
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
        instagram: false,
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
      platformAssets: {
        meta: {
          imageHash: "hash-123",
        },
      },
      callToAction: "SHOP_NOW",
    },
  };
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
    async createAdVideo(input) {
      calls.push({ method: "createAdVideo", input });
      return { id: "video-123" };
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

function createJsonResponse(body, { ok = true } = {}) {
  return {
    ok,
    async json() {
      return body;
    },
  };
}

test("uploads an image file to Meta and returns its image hash", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedBody = null;

  globalThis.fetch = async (url, options = {}) => {
    capturedUrl = url;
    capturedBody = options.body;

    return createJsonResponse({
      images: {
        "creative.png": {
          hash: "hash-123",
          url: "https://meta.example.com/creative.png",
        },
      },
    });
  };

  try {
    const file = new File(["image-bytes"], "creative.png", {
      type: "image/png",
    });

    const result = await uploadMetaAdImage({
      adAccountId: "act_123",
      accessToken: "fake-token",
      file,
    });

    assert.match(capturedUrl, /\/act_123\/adimages$/);
    assert.ok(capturedBody instanceof FormData);
    assert.equal(capturedBody.get("access_token"), "fake-token");
    assert.equal(capturedBody.get("source").name, "creative.png");
    assert.equal(result.hash, "hash-123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-image files before calling Meta", async () => {
  const file = new File(["not-an-image"], "notes.txt", {
    type: "text/plain",
  });

  await assert.rejects(
    () =>
      uploadMetaAdImage({
        adAccountId: "act_123",
        accessToken: "fake-token",
        file,
      }),
    /must be an image/
  );
});

test("uses uploaded Meta image hash instead of the Shopify picture URL", async () => {
  const originalFetch = globalThis.fetch;
  let capturedStory = null;

  globalThis.fetch = async (_url, options = {}) => {
    capturedStory = JSON.parse(
      options.body.get("object_story_spec")
    );
    return createJsonResponse({ id: "creative-123" });
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    await meta.createAdCreative({
      name: "Image Creative",
      pageId: "page-123",
      message: "Buy now",
      headline: "Test Sneakers",
      destinationUrl: "https://example.com/products/test-sneakers",
      imageUrl: "https://example.com/shopify-image.jpg",
      imageHash: "hash-123",
      creativeType: "IMAGE",
      callToAction: "SHOP_NOW",
    });

    assert.equal(capturedStory.link_data.image_hash, "hash-123");
    assert.equal("picture" in capturedStory.link_data, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("plans and executes an uploaded image asset without replacing it", async () => {
  const campaign = createUniversalCampaign(createImageInput());
  const plan = buildMetaCampaignPlan(campaign);

  assert.equal(plan.creative.metaImageHash, "hash-123");

  const calls = [];
  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");
  assert.deepEqual(
    calls.map((call) => call.method),
    [
      "createCampaign",
      "createAdSet",
      "createAdCreative",
      "createAd",
    ]
  );
  assert.equal(calls[2].input.imageHash, "hash-123");
  assert.equal(result.creative.imageHash, "hash-123");
  assert.equal(result.configuration.imageHash, "hash-123");
});
