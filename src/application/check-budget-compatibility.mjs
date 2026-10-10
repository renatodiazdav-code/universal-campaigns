import { evaluateMetaBudget } from "../adapters/meta/budget-policy.mjs";
import { evaluateTikTokBudget } from "../adapters/tiktok/budget-policy.mjs";
import { getExchangeRate } from "../connectors/fx/frankfurter.mjs";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function checkBudgetCompatibility(
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

  const currency =
    String(budget.currency || "USD").toUpperCase();

  const projectedTotal =
    budgetMode === "DAILY"
      ? amount * durationDays
      : amount;

  const metaEnabled =
    Boolean(platforms?.meta?.enabled);
  const tiktokEnabled =
    Boolean(platforms?.tiktok?.enabled);

  const metaBudget = toNumber(
    budget?.allocation?.meta
  );
  const tiktokBudget = toNumber(
    budget?.allocation?.tiktok
  );

  const issues = [];

  if (
    budgetMode !== "TOTAL" &&
    budgetMode !== "DAILY"
  ) {
    issues.push({
      code: "BUDGET_MODE_INVALID",
      message:
        "Choose Total budget or Daily budget.",
    });
  }

  if (!metaEnabled && !tiktokEnabled) {
    issues.push({
      code: "NO_PLATFORM_SELECTED",
      message:
        "Select at least one advertising platform.",
    });
  }

  if (amount <= 0) {
    issues.push({
      code: "BUDGET_REQUIRED",
      message:
        "Campaign budget must be greater than zero.",
    });
  }

  if (durationDays <= 0) {
    issues.push({
      code: "DURATION_REQUIRED",
      message:
        "Campaign duration must be greater than zero.",
    });
  }

  if (
    Math.abs(
      metaBudget + tiktokBudget - amount
    ) > 0.000001
  ) {
    issues.push({
      code: "ALLOCATION_MISMATCH",
      message:
        `Platform budgets must add up to the ${budgetMode === "DAILY" ? "daily" : "total"} campaign budget.`,
    });
  }

  if (!metaEnabled && metaBudget > 0) {
    issues.push({
      code: "META_DISABLED_WITH_BUDGET",
      message:
        "Meta cannot receive budget when it is disabled.",
    });
  }

  if (!tiktokEnabled && tiktokBudget > 0) {
    issues.push({
      code: "TIKTOK_DISABLED_WITH_BUDGET",
      message:
        "TikTok cannot receive budget when it is disabled.",
    });
  }

  const meta = evaluateMetaBudget({
    enabled: metaEnabled,
    allocatedBudget: metaBudget,
    currency,
    budgetMode,
  });

  const tiktok = await evaluateTikTokBudget({
    enabled: tiktokEnabled,
    allocatedBudget: tiktokBudget,
    currency,
    durationDays,
    budgetMode,
    getExchangeRate: exchangeRateProvider,
  });

  for (const result of [meta, tiktok]) {
    if (
      result.selected &&
      !result.eligible
    ) {
      issues.push({
        platform: result.platform,
        code: result.code,
        message: result.message,
      });
    }
  }

  return {
    version: 2,
    eligible: issues.length === 0,
    currency,
    budgetMode,
    budgetAmount: amount,
    durationDays,
    projectedTotal,
    platforms: {
      meta,
      tiktok,
    },
    issues,
    checkedAt: new Date().toISOString(),
  };
}
