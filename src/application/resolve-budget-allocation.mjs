import { evaluateTikTokBudget } from "../adapters/tiktok/budget-policy.mjs";
import { getExchangeRate } from "../connectors/fx/frankfurter.mjs";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export async function resolveBudgetAllocation(
  input,
  {
    exchangeRateProvider = getExchangeRate,
  } = {}
) {
  const budget = input?.budget ?? {};
  const platforms = input?.platforms ?? {};

  const budgetMode = String(
    budget.mode ?? "TOTAL"
  ).toUpperCase();

  const amount = toNumber(
    budget.amount ?? budget.total
  );

  const durationDays = toNumber(
    budget.durationDays
  );

  const currency = String(
    budget.currency || "USD"
  ).toUpperCase();

  const metaEnabled =
    Boolean(platforms?.meta?.enabled);
  const tiktokEnabled =
    Boolean(platforms?.tiktok?.enabled);

  const projectedTotal =
    budgetMode === "DAILY"
      ? roundMoney(amount * durationDays)
      : roundMoney(amount);

  if (
    budgetMode !== "TOTAL" &&
    budgetMode !== "DAILY"
  ) {
    return {
      version: 1,
      mode: "AUTO",
      eligible: false,
      code: "BUDGET_MODE_INVALID",
      message:
        "Choose Total budget or Daily budget.",
    };
  }

  if (amount <= 0 || durationDays <= 0) {
    return {
      version: 1,
      mode: "AUTO",
      eligible: false,
      code: "BUDGET_INPUT_INVALID",
      message:
        "Budget and duration must be greater than zero.",
    };
  }

  if (!metaEnabled && !tiktokEnabled) {
    return {
      version: 1,
      mode: "AUTO",
      eligible: false,
      code: "NO_PLATFORM_SELECTED",
      message:
        "Select at least one advertising platform.",
    };
  }

  if (metaEnabled && !tiktokEnabled) {
    return {
      version: 1,
      mode: "AUTO",
      eligible: true,
      budgetMode,
      budgetAmount: amount,
      projectedTotal,
      durationDays,
      currency,
      allocation: {
        meta: roundMoney(amount),
        tiktok: 0,
      },
      strategy: "SINGLE_PLATFORM",
    };
  }

  const tiktokEvaluation =
    await evaluateTikTokBudget({
      enabled: true,
      allocatedBudget: amount,
      currency,
      durationDays,
      budgetMode,
      getExchangeRate: exchangeRateProvider,
    });

  if (
    tiktokEvaluation.code ===
    "CURRENCY_CONVERSION_UNAVAILABLE"
  ) {
    return {
      version: 1,
      mode: "AUTO",
      eligible: false,
      code: tiktokEvaluation.code,
      message: tiktokEvaluation.message,
      budgetMode,
      budgetAmount: amount,
      projectedTotal,
      durationDays,
      currency,
      allocation: null,
    };
  }

  const tiktokMinimum = Number(
    tiktokEvaluation.minimumRequired?.amount ?? 0
  );

  if (!metaEnabled && tiktokEnabled) {
    const eligible = amount >= tiktokMinimum;

    return {
      version: 1,
      mode: "AUTO",
      eligible,
      code: eligible
        ? null
        : "TIKTOK_MINIMUM_BUDGET_NOT_MET",
      message: eligible
        ? null
        : tiktokEvaluation.message,
      budgetMode,
      budgetAmount: amount,
      projectedTotal,
      durationDays,
      currency,
      allocation: {
        meta: 0,
        tiktok: roundMoney(amount),
      },
      tiktokMinimum:
        tiktokEvaluation.minimumRequired,
      strategy: "SINGLE_PLATFORM",
    };
  }

  // Meta + TikTok selected.
  // Start from a neutral 50/50 split. If TikTok's technical minimum
  // is higher than its half, only move enough budget to make TikTok
  // technically launchable. This is a rules-based MVP allocation,
  // not a performance optimization claim.
  const half = roundMoney(amount / 2);
  const tiktokBudget = roundMoney(
    Math.max(half, tiktokMinimum)
  );
  const metaBudget = roundMoney(
    amount - tiktokBudget
  );

  if (metaBudget <= 0) {
    return {
      version: 1,
      mode: "AUTO",
      eligible: false,
      code: "COMBINED_BUDGET_TOO_LOW",
      message:
        `The ${budgetMode === "DAILY" ? "daily" : "total"} budget is too low to fund both Meta and TikTok.`,
      budgetMode,
      budgetAmount: amount,
      projectedTotal,
      durationDays,
      currency,
      allocation: null,
      minimumForTikTok:
        tiktokEvaluation.minimumRequired,
      minimumCombinedAmount: roundMoney(
        tiktokMinimum + 0.01
      ),
    };
  }

  return {
    version: 1,
    mode: "AUTO",
    eligible: true,
    budgetMode,
    budgetAmount: amount,
    projectedTotal,
    durationDays,
    currency,
    allocation: {
      meta: metaBudget,
      tiktok: tiktokBudget,
    },
    strategy:
      tiktokBudget > half
        ? "EQUAL_SPLIT_ADJUSTED_FOR_TIKTOK_MINIMUM"
        : "EQUAL_SPLIT",
    minimums: {
      tiktok:
        tiktokEvaluation.minimumRequired,
    },
  };
}
