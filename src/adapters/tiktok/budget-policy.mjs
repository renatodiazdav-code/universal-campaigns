const AD_GROUP_DAILY_MIN_USD_EXCLUSIVE = 20;

function roundUpMoney(value) {
  return Math.ceil(Number(value) * 100) / 100;
}

export async function evaluateTikTokBudget({
  enabled,
  allocatedBudget,
  currency,
  durationDays,
  budgetMode = "TOTAL",
  getExchangeRate,
}) {
  if (!enabled) {
    return {
      platform: "TIKTOK",
      selected: false,
      eligible: true,
    };
  }

  const amount = Number(allocatedBudget);
  const days = Number(durationDays);
  const mode = String(budgetMode).toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      platform: "TIKTOK",
      selected: true,
      eligible: false,
      code: "TIKTOK_BUDGET_REQUIRED",
      message: "TikTok needs a budget greater than zero.",
      allocatedBudget: 0,
      currency,
      budgetMode: mode,
    };
  }

  if (!Number.isFinite(days) || days <= 0) {
    return {
      platform: "TIKTOK",
      selected: true,
      eligible: false,
      code: "TIKTOK_DURATION_REQUIRED",
      message: "TikTok needs a campaign duration greater than zero.",
      allocatedBudget: amount,
      currency,
      budgetMode: mode,
    };
  }

  if (mode !== "TOTAL" && mode !== "DAILY") {
    return {
      platform: "TIKTOK",
      selected: true,
      eligible: false,
      code: "TIKTOK_BUDGET_MODE_UNSUPPORTED",
      message: "TikTok budget mode must be TOTAL or DAILY.",
      allocatedBudget: amount,
      currency,
      budgetMode: mode,
    };
  }

  let fx;

  try {
    fx = await getExchangeRate({
      base: "USD",
      quote: currency,
    });
  } catch (error) {
    return {
      platform: "TIKTOK",
      selected: true,
      eligible: false,
      code: "CURRENCY_CONVERSION_UNAVAILABLE",
      message:
        "Relay could not convert TikTok's USD budget minimum into the campaign currency. Try again before launching.",
      allocatedBudget: amount,
      currency,
      budgetMode: mode,
      error: error.message,
    };
  }

  // Relay v1 leaves TikTok's campaign-level budget open and controls
  // spend on the single ad group it creates for the campaign. TikTok's
  // technical minimum at ad-group level is > USD 20 for DAILY, while
  // TOTAL/LIFETIME uses USD 20 multiplied by scheduled days.
  const effectiveMinimumUsd =
    mode === "DAILY"
      ? AD_GROUP_DAILY_MIN_USD_EXCLUSIVE + 0.01
      : AD_GROUP_DAILY_MIN_USD_EXCLUSIVE * days;

  const minimumAmount = roundUpMoney(
    effectiveMinimumUsd * fx.rate
  );

  const eligible = amount >= minimumAmount;

  const unitLabel =
    mode === "DAILY"
      ? "per day"
      : `for ${days} day${days === 1 ? "" : "s"}`;

  return {
    platform: "TIKTOK",
    selected: true,
    eligible,
    code: eligible
      ? null
      : "TIKTOK_MINIMUM_BUDGET_NOT_MET",
    message: eligible
      ? null
      : `TikTok needs at least ${currency} ${minimumAmount.toFixed(2)} ${unitLabel} with a ${mode === "DAILY" ? "daily" : "total"} ad-group budget.`,
    allocatedBudget: amount,
    currency,
    budgetMode: mode,
    campaignBudgetStrategy: "NO_LIMIT",
    minimumRequired: {
      amount: minimumAmount,
      currency,
      usdEquivalent: effectiveMinimumUsd,
      durationDays: days,
      unit: mode === "DAILY" ? "PER_DAY" : "TOTAL",
    },
    exchangeRate: fx,
    rules: {
      campaignBudgetStrategy: "NO_LIMIT",
      adGroupDailyMinimumUsdExclusive:
        AD_GROUP_DAILY_MIN_USD_EXCLUSIVE,
      sourceUpdated: "2026-07",
    },
  };
}
