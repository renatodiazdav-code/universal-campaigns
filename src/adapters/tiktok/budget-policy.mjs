const CAMPAIGN_MIN_USD_EXCLUSIVE = 50;
const AD_GROUP_DAILY_MIN_USD = 20;

function roundUpMoney(value) {
  return Math.ceil(Number(value) * 100) / 100;
}

export async function evaluateTikTokBudget({
  enabled,
  allocatedBudget,
  currency,
  durationDays,
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

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      platform: "TIKTOK",
      selected: true,
      eligible: false,
      code: "TIKTOK_BUDGET_REQUIRED",
      message: "TikTok needs a budget greater than zero.",
      allocatedBudget: 0,
      currency,
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
      error: error.message,
    };
  }

  // TikTok requires campaign budgets to be greater than USD 50.
  // Add one cent so Relay never treats exactly USD 50 as sufficient.
  const campaignMinimumUsd =
    CAMPAIGN_MIN_USD_EXCLUSIVE + 0.01;

  // For lifetime budgets, TikTok's ad group minimum is
  // USD 20 multiplied by the number of scheduled days.
  const adGroupMinimumUsd =
    AD_GROUP_DAILY_MIN_USD * days;

  const effectiveMinimumUsd = Math.max(
    campaignMinimumUsd,
    adGroupMinimumUsd
  );

  const minimumAmount = roundUpMoney(
    effectiveMinimumUsd * fx.rate
  );

  const eligible = amount >= minimumAmount;

  return {
    platform: "TIKTOK",
    selected: true,
    eligible,
    code: eligible
      ? null
      : "TIKTOK_MINIMUM_BUDGET_NOT_MET",
    message: eligible
      ? null
      : `TikTok needs at least ${currency} ${minimumAmount.toFixed(2)} for ${days} day${days === 1 ? "" : "s"} with a lifetime budget.`,
    allocatedBudget: amount,
    currency,
    budgetMode: "LIFETIME",
    minimumRequired: {
      amount: minimumAmount,
      currency,
      usdEquivalent: effectiveMinimumUsd,
      campaignMinimumUsd,
      adGroupMinimumUsd,
      durationDays: days,
    },
    exchangeRate: fx,
    rules: {
      campaignMinimumUsdExclusive:
        CAMPAIGN_MIN_USD_EXCLUSIVE,
      adGroupDailyMinimumUsd:
        AD_GROUP_DAILY_MIN_USD,
      sourceUpdated: "2026-08",
    },
  };
}
