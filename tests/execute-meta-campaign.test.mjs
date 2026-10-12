import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";

function createInput({
  budgetMode = "TOTAL",
  amount = 100,
  meta = 60,
  tiktok = 40,
  gender = "ALL",
  facebook = true,
  instagram = true,
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
      gender,
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
        facebook,
        instagram,
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

test("executes a TOTAL Universal Campaign with Meta campaign lifetime budget", async () => {
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

  assert.equal(calls[0].method, "createCampaign");
  assert.equal(calls[0].input.budgetMode, "TOTAL");
  assert.equal(calls[0].input.lifetimeBudget, 6000);
  assert.equal(calls[0].input.dailyBudget, null);
  assert.equal(
    calls[0].input.bidStrategy,
    "LOWEST_COST_WITHOUT_CAP"
  );

  assert.equal(calls[1].method, "createAdSet");
  assert.equal(calls[1].input.budgetStrategy, "CAMPAIGN");
  assert.equal(calls[1].input.dailyBudget, undefined);
  assert.equal(calls[1].input.lifetimeBudget, undefined);
  assert.equal(
    calls[1].input.optimizationGoal,
    "OFFSITE_CONVERSIONS"
  );
  assert.equal(calls[1].input.pixelId, "pixel-123");
  assert.equal(
    calls[1].input.conversionEvent,
    "PURCHASE"
  );
  assert.equal(calls[1].input.gender, "ALL");
  assert.equal(calls[1].input.advantageAudience, true);
  assert.equal(calls[1].input.allowAgeExpansion, true);
  assert.equal(calls[1].input.allowGenderExpansion, true);
  assert.deepEqual(calls[1].input.includedAudiences, []);
  assert.deepEqual(calls[1].input.excludedAudiences, []);
  assert.deepEqual(calls[1].input.detailedTargeting, []);
  assert.equal(calls[1].input.bidAmount, null);
  assert.deepEqual(
    calls[1].input.publisherPlatforms,
    ["FACEBOOK", "INSTAGRAM"]
  );
  assert.deepEqual(
    calls[1].input.facebookPositions,
    ["FEED", "STORIES", "REELS"]
  );
  assert.deepEqual(
    calls[1].input.instagramPositions,
    ["FEED", "STORIES", "REELS"]
  );
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

  assert.equal(result.configuration.budgetStrategy, "CAMPAIGN");
  assert.equal(result.configuration.budgetMode, "TOTAL");
  assert.equal(result.configuration.lifetimeBudget, 6000);
  assert.equal(result.configuration.dailyBudget, null);
  assert.equal(result.configuration.audience.gender, "ALL");
  assert.equal(
    result.configuration.audience.strategy,
    "ADVANTAGE_PLUS"
  );
  assert.equal(result.configuration.audience.mode, "ADVANTAGE_PLUS");
  assert.deepEqual(result.configuration.audience.includedAudiences, []);
  assert.deepEqual(result.configuration.audience.excludedAudiences, []);
  assert.deepEqual(result.configuration.audience.detailedTargeting, []);
  assert.equal(
    result.configuration.bidding.strategy,
    "LOWEST_COST"
  );
  assert.deepEqual(
    result.configuration.placements,
    ["FACEBOOK", "INSTAGRAM"]
  );
  assert.equal(
    result.configuration.placementSettings.mode,
    "RECOMMENDED"
  );
  assert.deepEqual(
    result.configuration.placementSettings.facebook,
    ["FEED", "STORIES", "REELS"]
  );
  assert.deepEqual(
    result.configuration.placementSettings.instagram,
    ["FEED", "STORIES", "REELS"]
  );
});

test("executes a DAILY Universal Campaign with Meta campaign daily budget and an end date", async () => {
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
  assert.equal(calls[0].input.budgetMode, "DAILY");
  assert.equal(calls[0].input.dailyBudget, 3000);
  assert.equal(calls[0].input.lifetimeBudget, null);
  assert.equal(calls[1].input.budgetStrategy, "CAMPAIGN");
  assert.equal(calls[1].input.dailyBudget, undefined);
  assert.equal(calls[1].input.lifetimeBudget, undefined);
  assert.equal(
    calls[1].input.endTime,
    "2026-10-17T12:00:00.000Z"
  );

  assert.equal(result.configuration.budgetStrategy, "CAMPAIGN");
  assert.equal(result.configuration.budgetMode, "DAILY");
  assert.equal(result.configuration.dailyBudget, 3000);
  assert.equal(result.configuration.lifetimeBudget, null);
});

test("passes gender and selected Meta publishers into the ad set", async () => {
  const campaign = createUniversalCampaign(
    createInput({
      amount: 50,
      meta: 50,
      tiktok: 0,
      gender: "MALE",
      facebook: false,
      instagram: true,
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
  assert.equal(calls[1].input.gender, "MALE");
  assert.deepEqual(
    calls[1].input.publisherPlatforms,
    ["INSTAGRAM"]
  );
  assert.deepEqual(calls[1].input.facebookPositions, []);
  assert.deepEqual(
    calls[1].input.instagramPositions,
    ["FEED", "STORIES", "REELS"]
  );
  assert.equal(result.configuration.audience.gender, "MALE");
  assert.deepEqual(
    result.configuration.placements,
    ["INSTAGRAM"]
  );
});

test("executes Meta Cost Cap override while keeping campaign budget", async () => {
  const input = createInput({
    amount: 50,
    meta: 50,
    tiktok: 0,
  });

  input.overrides = {
    meta: {
      audienceStrategy: "MANUAL",
      bidding: {
        strategy: "COST_CAP",
        costCap: 12.5,
      },
    },
  };

  const campaign = createUniversalCampaign(input);
  const calls = [];

  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");
  assert.equal(calls[0].input.bidStrategy, "COST_CAP");
  assert.equal(calls[1].input.bidAmount, 1250);
  assert.equal(calls[1].input.advantageAudience, false);
  assert.equal(calls[1].input.allowAgeExpansion, false);
  assert.equal(calls[1].input.allowGenderExpansion, false);

  assert.equal(
    result.configuration.audience.strategy,
    "MANUAL"
  );
  assert.equal(result.configuration.audience.mode, "SPECIFIC");
  assert.equal(result.configuration.bidding.strategy, "COST_CAP");
  assert.equal(result.configuration.bidding.costCap, 12.5);
  assert.equal(result.configuration.bidding.bidAmount, 1250);
});

test("passes selected Custom Audiences, exclusions and detailed targeting into the Meta ad set", async () => {
  const input = createInput({
    amount: 50,
    meta: 50,
    tiktok: 0,
  });

  input.overrides = {
    meta: {
      audienceStrategy: "ADVANTAGE_PLUS",
      audience: {
        mode: "ADVANTAGE_PLUS",
        includedAudiences: [
          {
            id: "ca-1",
            name: "Website visitors",
            subtype: "WEBSITE",
            kind: "CUSTOM",
          },
          {
            id: "la-1",
            name: "Lookalike customers",
            subtype: "LOOKALIKE",
            kind: "LOOKALIKE",
          },
        ],
        excludedAudiences: [
          {
            id: "ca-2",
            name: "Purchasers",
            subtype: "WEBSITE",
            kind: "CUSTOM",
          },
        ],
        detailedTargeting: [
          {
            id: "interest-1",
            name: "Running",
            type: "interests",
          },
        ],
      },
    },
  };

  const campaign = createUniversalCampaign(input);
  const calls = [];

  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");
  assert.deepEqual(
    calls[1].input.includedAudiences.map((item) => item.id),
    ["ca-1", "la-1"]
  );
  assert.deepEqual(
    calls[1].input.excludedAudiences.map((item) => item.id),
    ["ca-2"]
  );
  assert.deepEqual(calls[1].input.detailedTargeting, [
    {
      id: "interest-1",
      name: "Running",
      type: "interests",
      path: [],
    },
  ]);
  assert.deepEqual(
    result.configuration.audience.includedAudiences.map((item) => item.id),
    ["ca-1", "la-1"]
  );
});

test("executes manual Facebook and Instagram placement subsets", async () => {
  const input = createInput({
    amount: 50,
    meta: 50,
    tiktok: 0,
  });

  input.overrides = {
    meta: {
      placements: {
        mode: "MANUAL",
        facebook: ["FEED", "REELS"],
        instagram: ["STORIES"],
      },
    },
  };

  const campaign = createUniversalCampaign(input);
  const calls = [];

  const result = await executeMetaCampaign({
    campaign,
    connection: createConnection(),
    metaClient: createFakeMeta(calls),
    now: new Date("2026-10-10T12:00:00.000Z"),
  });

  assert.equal(result.status, "CREATED");
  assert.deepEqual(
    calls[1].input.publisherPlatforms,
    ["FACEBOOK", "INSTAGRAM"]
  );
  assert.deepEqual(
    calls[1].input.facebookPositions,
    ["FEED", "REELS"]
  );
  assert.deepEqual(
    calls[1].input.instagramPositions,
    ["STORIES"]
  );

  assert.equal(
    result.configuration.placementSettings.mode,
    "MANUAL"
  );
  assert.deepEqual(
    result.configuration.placementSettings.facebook,
    ["FEED", "REELS"]
  );
  assert.deepEqual(
    result.configuration.placementSettings.instagram,
    ["STORIES"]
  );
});
