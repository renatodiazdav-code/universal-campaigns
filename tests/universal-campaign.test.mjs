import test from "node:test";
import assert from "node:assert/strict";

import {
  createUniversalCampaign,
} from "../src/domain/universal-campaign.mjs";

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

test("creates a valid Universal Campaign", () => {
  const campaign = createUniversalCampaign(createValidInput());

  assert.equal(campaign.goal, "SALES");
  assert.equal(campaign.budget.total, 100);
  assert.equal(campaign.budget.allocation.meta, 60);
  assert.equal(campaign.budget.allocation.tiktok, 40);
  assert.equal(campaign.status, "DRAFT");
});

test("rejects budget allocation greater than total budget", () => {
  const input = createValidInput();

  input.budget.allocation.meta = 100;
  input.budget.allocation.tiktok = 100;

  assert.throws(
    () => createUniversalCampaign(input),
    /Platform budgets must equal total budget/
  );
});

test("rejects budget allocation lower than total budget", () => {
  const input = createValidInput();

  input.budget.allocation.meta = 30;
  input.budget.allocation.tiktok = 40;

  assert.throws(
    () => createUniversalCampaign(input),
    /Platform budgets must equal total budget/
  );
});

test("rejects Meta budget when Meta is disabled", () => {
  const input = createValidInput();

  input.platforms.meta.enabled = false;

  assert.throws(
    () => createUniversalCampaign(input),
    /Meta budget cannot be assigned when Meta is disabled/
  );
});

test("rejects TikTok budget when TikTok is disabled", () => {
  const input = createValidInput();

  input.platforms.tiktok.enabled = false;

  assert.throws(
    () => createUniversalCampaign(input),
    /TikTok budget cannot be assigned when TikTok is disabled/
  );
});

test("rejects campaign when no platform is enabled", () => {
  const input = createValidInput();

  input.platforms.meta.enabled = false;
  input.platforms.tiktok.enabled = false;

  input.budget.allocation.meta = 0;
  input.budget.allocation.tiktok = 0;

  assert.throws(
    () => createUniversalCampaign(input),
    /At least one advertising platform must be enabled/
  );
});

test("rejects zero budget", () => {
  const input = createValidInput();

  input.budget.total = 0;
  input.budget.allocation.meta = 0;
  input.budget.allocation.tiktok = 0;

  assert.throws(
    () => createUniversalCampaign(input),
    /Budget must be greater than 0/
  );
});