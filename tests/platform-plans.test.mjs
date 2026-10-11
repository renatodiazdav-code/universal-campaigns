import test from "node:test";
import assert from "node:assert/strict";

import {
  createUniversalCampaign,
} from "../src/domain/universal-campaign.mjs";

import {
  buildPlatformPlans,
} from "../src/application/build-platform-plans.mjs";

function createValidInput() {
  return {
    name: "Test Sneakers Campaign",

    goal: "SALES",

    product: {
      source: "SHOPIFY",
      id: "product-123",
      title: "Test Sneakers",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/shoe.jpg",
      destinationUrl: "https://example.com/products/test-sneakers",
    },

    audience: {
      countries: ["PE"],
      ageMin: 18,
      ageMax: 35,
      gender: "ALL",
    },

    budget: {
      total: 100,
      currency: "PEN",
      durationDays: 7,

      allocation: {
        mode: "MANUAL",
        meta: 60,
        tiktok: 40,
      },
    },

    platforms: {
      meta: {
        enabled: true,
        facebook: true,
        instagram: true,
      },

      tiktok: {
        enabled: true,
      },
    },

    creative: {
      type: "IMAGE",
      primaryText: "Discover Test Sneakers.",
      headline: "Test Sneakers",
      destinationUrl: "https://example.com/products/test-sneakers",
    },
  };
}

test("builds Meta and TikTok plans from one Universal Campaign", () => {
  const campaign = createUniversalCampaign(createValidInput());

  const plans = buildPlatformPlans(campaign);

  assert.ok(plans.meta);
  assert.ok(plans.tiktok);

  assert.equal(plans.meta.platform, "META");
  assert.equal(plans.tiktok.platform, "TIKTOK");
});

test("allocates the correct budget to each platform", () => {
  const campaign = createUniversalCampaign(createValidInput());

  const plans = buildPlatformPlans(campaign);

  assert.equal(plans.meta.budget.allocated, 60);
  assert.equal(plans.tiktok.budget.allocated, 40);
});

test("builds the expected Meta placements", () => {
  const campaign = createUniversalCampaign(createValidInput());

  const plans = buildPlatformPlans(campaign);

  assert.deepEqual(plans.meta.placements, [
    "FACEBOOK",
    "INSTAGRAM",
  ]);
  assert.equal(
    plans.meta.placementSettings.mode,
    "RECOMMENDED"
  );
  assert.deepEqual(
    plans.meta.placementSettings.facebook,
    ["FEED", "STORIES", "REELS"]
  );
  assert.deepEqual(
    plans.meta.placementSettings.instagram,
    ["FEED", "STORIES", "REELS"]
  );
});

test("routes advanced overrides only to their platform plan", () => {
  const input = createValidInput();

  input.overrides = {
    meta: {
      conversionEvent: "PURCHASE",
    },
    tiktok: {
      optimizationMode: "CONVERSION",
    },
  };

  const campaign = createUniversalCampaign(input);
  const plans = buildPlatformPlans(campaign);

  assert.deepEqual(plans.meta.overrides, {
    conversionEvent: "PURCHASE",
  });
  assert.deepEqual(plans.tiktok.overrides, {
    optimizationMode: "CONVERSION",
  });
});

test("only builds TikTok plan when Meta is disabled", () => {
  const input = createValidInput();

  input.platforms.meta.enabled = false;

  input.budget.allocation.meta = 0;
  input.budget.allocation.tiktok = 100;

  const campaign = createUniversalCampaign(input);

  const plans = buildPlatformPlans(campaign);

  assert.equal(plans.meta, undefined);
  assert.ok(plans.tiktok);
  assert.equal(plans.tiktok.budget.allocated, 100);
});

test("only builds Meta plan when TikTok is disabled", () => {
  const input = createValidInput();

  input.platforms.tiktok.enabled = false;

  input.budget.allocation.meta = 100;
  input.budget.allocation.tiktok = 0;

  const campaign = createUniversalCampaign(input);

  const plans = buildPlatformPlans(campaign);

  assert.ok(plans.meta);
  assert.equal(plans.tiktok, undefined);
  assert.equal(plans.meta.budget.allocated, 100);
});
