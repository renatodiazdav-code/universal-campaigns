import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveBudgetAllocation,
} from "../src/application/resolve-budget-allocation.mjs";

function fakeRate(rate = 3.5) {
  return async ({ base, quote }) => ({
    base,
    quote,
    rate,
    date: "2026-10-10",
    source: "TEST",
  });
}

test("gives the full budget to Meta when Meta is the only platform", async () => {
  const result = await resolveBudgetAllocation(
    {
      budget: {
        mode: "TOTAL",
        amount: 100,
        currency: "PEN",
        durationDays: 7,
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
  assert.deepEqual(result.allocation, {
    meta: 100,
    tiktok: 0,
  });
});

test("gives the full budget to TikTok when TikTok is the only platform and the budget is valid", async () => {
  const result = await resolveBudgetAllocation(
    {
      budget: {
        mode: "TOTAL",
        amount: 500,
        currency: "PEN",
        durationDays: 7,
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
  assert.deepEqual(result.allocation, {
    meta: 0,
    tiktok: 500,
  });
});

test("uses a 50/50 split when both platforms are selected and the split already satisfies TikTok", async () => {
  const result = await resolveBudgetAllocation(
    {
      budget: {
        mode: "TOTAL",
        amount: 1000,
        currency: "PEN",
        durationDays: 7,
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

  assert.equal(result.eligible, true);
  assert.equal(result.strategy, "EQUAL_SPLIT");
  assert.deepEqual(result.allocation, {
    meta: 500,
    tiktok: 500,
  });
});

test("moves only enough budget to TikTok to satisfy its technical minimum", async () => {
  const result = await resolveBudgetAllocation(
    {
      budget: {
        mode: "TOTAL",
        amount: 700,
        currency: "PEN",
        durationDays: 7,
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

  assert.equal(result.eligible, true);
  assert.equal(
    result.strategy,
    "EQUAL_SPLIT_ADJUSTED_FOR_TIKTOK_MINIMUM"
  );
  assert.deepEqual(result.allocation, {
    meta: 210,
    tiktok: 490,
  });
});

test("rejects a combined budget that cannot leave any budget for Meta after satisfying TikTok", async () => {
  const result = await resolveBudgetAllocation(
    {
      budget: {
        mode: "TOTAL",
        amount: 400,
        currency: "PEN",
        durationDays: 7,
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
  assert.equal(result.code, "COMBINED_BUDGET_TOO_LOW");
  assert.equal(result.allocation, null);
});

test("supports DAILY budgets and adjusts TikTok using its daily minimum", async () => {
  const result = await resolveBudgetAllocation(
    {
      budget: {
        mode: "DAILY",
        amount: 100,
        currency: "PEN",
        durationDays: 7,
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

  assert.equal(result.eligible, true);
  assert.equal(result.projectedTotal, 700);
  assert.deepEqual(result.allocation, {
    meta: 29.96,
    tiktok: 70.04,
  });
});
