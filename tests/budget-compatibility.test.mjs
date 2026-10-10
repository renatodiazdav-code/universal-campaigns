import test from "node:test";
import assert from "node:assert/strict";

import {
  checkBudgetCompatibility,
} from "../src/application/check-budget-compatibility.mjs";

function fakeRate(rate = 3.5) {
  return async ({ base, quote }) => ({
    base,
    quote,
    rate,
    date: "2026-10-10",
    source: "TEST",
  });
}

test("allows a Meta-only campaign with a positive budget", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        total: 50,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 50,
          tiktok: 0,
        },
      },
      platforms: {
        meta: { enabled: true },
        tiktok: { enabled: false },
      },
    },
    {
      exchangeRateProvider: fakeRate(),
    }
  );

  assert.equal(result.eligible, true);
  assert.equal(result.platforms.meta.eligible, true);
});

test("rejects a 7-day TikTok allocation below the lifetime minimum", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        total: 300,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 0,
          tiktok: 300,
        },
      },
      platforms: {
        meta: { enabled: false },
        tiktok: { enabled: true },
      },
    },
    {
      exchangeRateProvider: fakeRate(3.5),
    }
  );

  assert.equal(result.eligible, false);
  assert.equal(
    result.platforms.tiktok.minimumRequired.usdEquivalent,
    140
  );
  assert.equal(
    result.platforms.tiktok.minimumRequired.amount,
    490
  );
  assert.equal(
    result.platforms.tiktok.code,
    "TIKTOK_MINIMUM_BUDGET_NOT_MET"
  );
});

test("allows a 7-day TikTok allocation that meets the lifetime minimum", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        total: 500,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 0,
          tiktok: 500,
        },
      },
      platforms: {
        meta: { enabled: false },
        tiktok: { enabled: true },
      },
    },
    {
      exchangeRateProvider: fakeRate(3.5),
    }
  );

  assert.equal(result.eligible, true);
  assert.equal(result.platforms.tiktok.eligible, true);
});

test("validates TikTok's allocation instead of the total multi-platform budget", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        total: 700,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 400,
          tiktok: 300,
        },
      },
      platforms: {
        meta: { enabled: true },
        tiktok: { enabled: true },
      },
    },
    {
      exchangeRateProvider: fakeRate(3.5),
    }
  );

  assert.equal(result.eligible, false);
  assert.equal(result.platforms.meta.eligible, true);
  assert.equal(result.platforms.tiktok.eligible, false);
});

test("uses TikTok's campaign floor for a one-day campaign", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        total: 175,
        currency: "PEN",
        durationDays: 1,
        allocation: {
          meta: 0,
          tiktok: 175,
        },
      },
      platforms: {
        meta: { enabled: false },
        tiktok: { enabled: true },
      },
    },
    {
      exchangeRateProvider: fakeRate(3.5),
    }
  );

  assert.equal(result.eligible, false);
  assert.equal(
    result.platforms.tiktok.minimumRequired.usdEquivalent,
    50.01
  );
  assert.equal(
    result.platforms.tiktok.minimumRequired.amount,
    175.04
  );
});
