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

  const total = toNumber(budget.total);
  const durationDays = toNumber(
    budget.durationDays
  );
  const currency =
    String(budget.currency || "USD").toUpperCase();

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

  if (!metaEnabled && !tiktokEnabled) {
    issues.push({
      code: "NO_PLATFORM_SELECTED",
      message:
        "Select at least one advertising platform.",
    });
  }

  if (total <= 0) {
    issues.push({
      code: "TOTAL_BUDGET_REQUIRED",
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
      metaBudget + tiktokBudget - total
    ) > 0.000001
  ) {
    issues.push({
      code: "ALLOCATION_MISMATCH",
      message:
        "Platform budgets must add up to the total campaign budget.",
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
  });

  const tiktok = await evaluateTikTokBudget({
    enabled: tiktokEnabled,
    allocatedBudget: tiktokBudget,
    currency,
    durationDays,
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
    version: 1,
    eligible: issues.length === 0,
    currency,
    totalBudget: total,
    durationDays,
    platforms: {
      meta,
      tiktok,
    },
    issues,
    checkedAt: new Date().toISOString(),
  };
}
