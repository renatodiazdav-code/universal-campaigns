import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";

function createInput({
  budgetMode = "TOTAL",
  amount = 100,
  meta = 60,
  tiktok = 40,
} = {}) {
  return {
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
      mode: budgetMode,
      amount,
      currency: "PEN",
      durationDays: 7,

      allocation: {
        mode: "MANUAL",
        meta,
        tiktok,
      },
    },

    platforms: {
      meta: {
        enabled: true,
        facebook: true,
        instagram: true,
      },

      tiktok: {
        enabled: tiktok > 0,
      },
    },

    creative: {
      type: "IMAGE",
      primaryText: "Discover Test Sneakers.",
      headline: "Test Sneakers",
      destinationUrl:
        "https://example.com/products/test-sneakers",
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

test("executes a TOTAL Universal Campaign with Meta lifetime budget", async () => {
  const campaign = createUniversalCampaign(
    createInput()
  );
  const calls = [];

  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");
  assert.equal(result.platform, "META");
  assert.equal(result.campaign.id, "campaign-123");
  assert.equal(result.adSet.id, "adset-123");
  assert.equal(result.creative.id, "creative-123");
  assert.equal(result.ad.id, "ad-123");
  assert.equal(calls.length, 4);

  assert.equal(calls[1].method, "createAdSet");
  assert.equal(
    calls[1].input.optimizationGoal,
    "OFFSITE_CONVERSIONS"
  );
  assert.equal(calls[1].input.pixelId, "pixel-123");
  assert.equal(
    calls[1].input.conversionEvent,
    "PURCHASE"
  );
  assert.equal(calls[1].input.budgetMode, "TOTAL");
  assert.equal(calls[1].input.lifetimeBudget, 6000);
  assert.equal(calls[1].input.dailyBudget, null);
  assert.equal(
    calls[1].input.startTime,
    "2026-10-10T12:00:00.000Z"
  );
  assert.equal(
    calls[1].input.endTime,
    "2026-10-17T12:00:00.000Z"
  );
  assert.equal(calls[1].input.status, "PAUSED");
  assert.equal(calls[3].input.status, "PAUSED");

  assert.equal(result.configuration.budgetMode, "TOTAL");
  assert.equal(result.configuration.lifetimeBudget, 6000);
  assert.equal(result.configuration.dailyBudget, null);
});

test("executes a DAILY Universal Campaign with Meta daily budget and an end date", async () => {
  const campaign = createUniversalCampaign(
    createInput({
      budgetMode: "DAILY",
      amount: 30,
      meta: 30,
      tiktok: 0,
    })
  );
  const calls = [];

  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");
  assert.equal(calls[1].input.budgetMode, "DAILY");
  assert.equal(calls[1].input.dailyBudget, 3000);
  assert.equal(calls[1].input.lifetimeBudget, null);
  assert.equal(
    calls[1].input.endTime,
    "2026-10-17T12:00:00.000Z"
  );

  assert.equal(result.configuration.budgetMode, "DAILY");
  assert.equal(result.configuration.dailyBudget, 3000);
  assert.equal(result.configuration.lifetimeBudget, null);
});
