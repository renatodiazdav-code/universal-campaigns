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

test("allows a Meta-only total campaign with a positive budget", async () => {
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
  assert.equal(result.budgetMode, "TOTAL");
  assert.equal(result.platforms.meta.eligible, true);
});

test("allows a Meta-only daily campaign and calculates projected spend", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "DAILY",
        amount: 20,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 20,
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
  assert.equal(result.budgetMode, "DAILY");
  assert.equal(result.budgetAmount, 20);
  assert.equal(result.projectedTotal, 140);
});

test("rejects a 7-day TikTok total allocation below the lifetime minimum", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "TOTAL",
        amount: 300,
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

test("allows a 7-day TikTok total allocation that meets the lifetime minimum", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "TOTAL",
        amount: 500,
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

test("rejects TikTok daily budget at or below the ad-group minimum", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "DAILY",
        amount: 70,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 0,
          tiktok: 70,
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
    20.01
  );
  assert.equal(
    result.platforms.tiktok.minimumRequired.amount,
    70.04
  );
  assert.equal(
    result.platforms.tiktok.minimumRequired.unit,
    "PER_DAY"
  );
});

test("allows TikTok daily budget above the ad-group minimum", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "DAILY",
        amount: 75,
        currency: "PEN",
        durationDays: 7,
        allocation: {
          meta: 0,
          tiktok: 75,
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
  assert.equal(result.projectedTotal, 525);
});

test("validates TikTok's allocation instead of the total multi-platform budget", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "TOTAL",
        amount: 700,
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

test("uses TikTok ad-group floor for a one-day total campaign", async () => {
  const result = await checkBudgetCompatibility(
    {
      budget: {
        mode: "TOTAL",
        amount: 69,
        currency: "PEN",
        durationDays: 1,
        allocation: {
          meta: 0,
          tiktok: 69,
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
    20
  );
  assert.equal(
    result.platforms.tiktok.minimumRequired.amount,
    70
  );
});
