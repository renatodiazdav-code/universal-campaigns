import test from "node:test";
import assert from "node:assert/strict";

import { resolveCampaignBudgetInput } from "../src/application/resolve-campaign-budget-input.mjs";

function fakeRate(rate = 3.5) {
  return async ({ base, quote }) => ({
    base,
    quote,
    rate,
    date: "2026-10-10",
    source: "TEST",
  });
}

function baseInput() {
  return {
    budget: {
      mode: "TOTAL",
      amount: 700,
      currency: "PEN",
      durationDays: 7,
      allocation: {
        mode: "AUTO",
      },
    },
    platforms: {
      meta: {
        enabled: true,
      },
      tiktok: {
        enabled: true,
      },
    },
  };
}

test("resolves AUTO allocation on the server", async () => {
  const result = await resolveCampaignBudgetInput(
    baseInput(),
    {
      exchangeRateProvider: fakeRate(3.5),
    }
  );

  assert.equal(result.input.budget.allocation.mode, "AUTO");
  assert.equal(result.input.budget.allocation.meta, 210);
  assert.equal(result.input.budget.allocation.tiktok, 490);
  assert.equal(result.allocation.eligible, true);
});

test("leaves MANUAL allocation unchanged", async () => {
  const input = baseInput();

  input.budget.allocation = {
    mode: "MANUAL",
    meta: 300,
    tiktok: 400,
  };

  const result = await resolveCampaignBudgetInput(input, {
    exchangeRateProvider: fakeRate(3.5),
  });

  assert.equal(result.input, input);
  assert.equal(result.allocation, null);
});
