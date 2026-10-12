import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import {
  buildMetaAttributionSpec,
  buildMetaCampaignPlan,
} from "../src/adapters/meta/campaign-plan.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";

test("automatic attribution leaves Meta attribution spec unset", () => {
  assert.equal(
    buildMetaAttributionSpec(
      {
        mode: "AUTO",
        model: "STANDARD",
      },
      "IMAGE"
    ),
    null
  );
});

test("Standard attribution includes engaged-view only for video creative", () => {
  const attribution = {
    mode: "STANDARD",
    model: "STANDARD",
    clickWindowDays: 7,
    viewWindowDays: 1,
    engagedViewWindowDays: 1,
  };

  assert.deepEqual(
    buildMetaAttributionSpec(attribution, "IMAGE"),
    [
      { event_type: "CLICK_THROUGH", window_days: 7 },
      { event_type: "VIEW_THROUGH", window_days: 1 },
    ]
  );

  assert.deepEqual(
    buildMetaAttributionSpec(attribution, "VIDEO"),
    [
      { event_type: "CLICK_THROUGH", window_days: 7 },
      { event_type: "VIEW_THROUGH", window_days: 1 },
      { event_type: "ENGAGED_VIDEO_VIEW", window_days: 1 },
    ]
  );
});

function createCampaign() {
  return createUniversalCampaign({
    name: "Attribution test",
    goal: "SALES",
    product: {
      source: "SHOPIFY",
      id: "product-1",
      title: "Product",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/product.jpg",
      destinationUrl: "https://example.com/products/product",
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
        instagram: false,
      },
      tiktok: {
        enabled: false,
      },
    },
    creative: {
      type: "IMAGE",
      primaryText: "Buy now",
      headline: "Product",
      destinationUrl: "https://example.com/products/product",
      callToAction: "SHOP_NOW",
    },
    overrides: {
      meta: {
        attribution: {
          mode: "STANDARD",
          clickWindowDays: 1,
          viewWindowDays: 0,
          engagedViewWindowDays: 1,
        },
      },
    },
  });
}

test("campaign plan and executor carry custom attribution to the Meta ad set", async () => {
  const campaign = createCampaign();
  const plan = buildMetaCampaignPlan(campaign);

  assert.deepEqual(plan.attribution.spec, [
    { event_type: "CLICK_THROUGH", window_days: 1 },
  ]);

  const calls = [];
  const metaClient = {
    async createCampaign(input) {
      calls.push({ method: "createCampaign", input });
      return { id: "campaign-1" };
    },
    async createAdSet(input) {
      calls.push({ method: "createAdSet", input });
      return { id: "adset-1" };
    },
    async createAdCreative(input) {
      calls.push({ method: "createAdCreative", input });
      return { id: "creative-1" };
    },
    async createAd(input) {
      calls.push({ method: "createAd", input });
      return { id: "ad-1" };
    },
  };

  const result = await executeMetaCampaign({
    campaign,
    connection: {
      accessToken: "token",
      setup: {
        adAccount: { id: "act-1", name: "Account" },
        page: { id: "page-1", name: "Page" },
      },
      salesSetup: {
        pixel: { id: "pixel-1", name: "Pixel" },
      },
    },
    metaClient,
    now: new Date("2026-10-12T12:00:00.000Z"),
  });

  const adSetCall = calls.find((call) => call.method === "createAdSet");

  assert.equal(result.status, "CREATED");
  assert.deepEqual(adSetCall.input.attributionSpec, [
    { event_type: "CLICK_THROUGH", window_days: 1 },
  ]);
  assert.deepEqual(result.configuration.attribution.spec, [
    { event_type: "CLICK_THROUGH", window_days: 1 },
  ]);
});
