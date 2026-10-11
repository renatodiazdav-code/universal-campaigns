import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

function createVideoInput() {
  return {
    name: "Video Campaign",
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
        instagram: false,
      },
      tiktok: {
        enabled: false,
      },
    },
    creative: {
      type: "VIDEO",
      primaryText: "Discover Test Sneakers.",
      headline: "Test Sneakers",
      destinationUrl: "https://example.com/products/test-sneakers",
      videoUrl: "https://cdn.example.com/sneakers.mp4",
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

test("normalizes a VIDEO Universal Campaign with a reusable video URL", () => {
  const campaign = createUniversalCampaign(createVideoInput());

  assert.equal(campaign.creative.type, "VIDEO");
  assert.equal(
    campaign.creative.videoUrl,
    "https://cdn.example.com/sneakers.mp4"
  );
  assert.equal(
    campaign.creative.thumbnailUrl,
    "https://example.com/sneakers.jpg"
  );
});

test("rejects a VIDEO creative without a video URL", () => {
  const input = createVideoInput();
  delete input.creative.videoUrl;

  assert.throws(
    () => createUniversalCampaign(input),
    /Video URL is required/
  );
});

test("uploads a remote video to the Meta ad account", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedBody = null;

  globalThis.fetch = async (url, options = {}) => {
    capturedUrl = url;
    capturedBody = options.body;
    return createJsonResponse({ id: "video-123" });
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    const result = await meta.createAdVideo({
      fileUrl: "https://cdn.example.com/sneakers.mp4",
      title: "Sneakers Video",
    });

    assert.equal(result.id, "video-123");
    assert.match(capturedUrl, /\/act_123\/advideos$/);
    assert.equal(
      capturedBody.get("file_url"),
      "https://cdn.example.com/sneakers.mp4"
    );
    assert.equal(capturedBody.get("title"), "Sneakers Video");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("encodes Meta video_data with CTA and automatic video cropping", async () => {
  const originalFetch = globalThis.fetch;
  let capturedStory = null;
  let capturedDegrees = null;

  globalThis.fetch = async (_url, options = {}) => {
    capturedStory = JSON.parse(
      options.body.get("object_story_spec")
    );
    capturedDegrees = JSON.parse(
      options.body.get("degrees_of_freedom_spec")
    );
    return createJsonResponse({ id: "creative-123" });
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    await meta.createAdCreative({
      name: "Video Creative",
      pageId: "page-123",
      message: "Buy now",
      headline: "Test Sneakers",
      destinationUrl: "https://example.com/products/test-sneakers",
      imageUrl: "https://example.com/sneakers.jpg",
      creativeType: "VIDEO",
      videoId: "video-123",
      callToAction: "SHOP_NOW",
      creativeAdaptation: {
        mode: "AUTOMATIC",
        adaptToPlacement: true,
        imageAutoCrop: true,
        videoAutoCrop: true,
      },
    });

    assert.equal("link_data" in capturedStory, false);
    assert.equal(capturedStory.video_data.video_id, "video-123");
    assert.equal(
      capturedStory.video_data.image_url,
      "https://example.com/sneakers.jpg"
    );
    assert.equal(
      capturedStory.video_data.call_to_action.type,
      "SHOP_NOW"
    );
    assert.equal(
      capturedStory.video_data.call_to_action.value.link,
      "https://example.com/products/test-sneakers"
    );
    assert.deepEqual(
      capturedDegrees.creative_features_spec.adapt_to_placement,
      { enroll_status: "OPT_IN" }
    );
    assert.deepEqual(
      capturedDegrees.creative_features_spec.video_auto_crop,
      { enroll_status: "OPT_IN" }
    );
    assert.equal(
      "image_auto_crop" in capturedDegrees.creative_features_spec,
      false
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executes a VIDEO campaign by uploading the video before the creative", async () => {
  const campaign = createUniversalCampaign(createVideoInput());
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
      "createAdVideo",
      "createAdCreative",
      "createAd",
    ]
  );
  assert.equal(
    calls[2].input.fileUrl,
    "https://cdn.example.com/sneakers.mp4"
  );
  assert.equal(calls[3].input.creativeType, "VIDEO");
  assert.equal(calls[3].input.videoId, "video-123");
  assert.equal(
    calls[3].input.imageUrl,
    "https://example.com/sneakers.jpg"
  );
  assert.equal(result.creative.type, "VIDEO");
  assert.equal(result.creative.videoId, "video-123");
  assert.equal(result.configuration.creativeType, "VIDEO");
  assert.equal(result.configuration.videoId, "video-123");
});
