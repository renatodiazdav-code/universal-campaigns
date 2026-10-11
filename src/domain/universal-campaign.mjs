const BUDGET_MODES = new Set(["TOTAL", "DAILY"]);
const CALL_TO_ACTIONS = new Set([
  "SHOP_NOW",
  "LEARN_MORE",
  "GET_OFFER",
  "SIGN_UP",
]);

function toPositiveNumber(value, label) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }

  return number;
}

function normalizePlatformOverrides(value, label) {
  if (value == null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} overrides must be an object`);
  }

  return { ...value };
}

function normalizeCampaignOverrides(value) {
  if (value == null) {
    return {
      meta: {},
      tiktok: {},
    };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Campaign overrides must be an object");
  }

  return {
    meta: normalizePlatformOverrides(value.meta, "Meta"),
    tiktok: normalizePlatformOverrides(value.tiktok, "TikTok"),
  };
}

export function createUniversalCampaign(input) {
  if (!input.name?.trim()) {
    throw new Error("Campaign name is required");
  }

  if (input.goal !== "SALES") {
    throw new Error("MVP only supports SALES campaigns");
  }

  if (!input.product?.id || !input.product?.title) {
    throw new Error("A product is required");
  }

  if (!input.audience?.countries?.length) {
    throw new Error("At least one country is required");
  }

  const budgetMode = String(
    input.budget?.mode ?? "TOTAL"
  ).toUpperCase();

  if (!BUDGET_MODES.has(budgetMode)) {
    throw new Error(
      "Budget mode must be TOTAL or DAILY"
    );
  }

  const durationDays = toPositiveNumber(
    input.budget?.durationDays,
    "Campaign duration"
  );

  const budgetAmount = toPositiveNumber(
    input.budget?.amount ?? input.budget?.total,
    "Budget"
  );

  const metaEnabled =
    input.platforms?.meta?.enabled === true;
  const tiktokEnabled =
    input.platforms?.tiktok?.enabled === true;

  if (!metaEnabled && !tiktokEnabled) {
    throw new Error(
      "At least one advertising platform must be enabled"
    );
  }

  if (!input.creative?.type) {
    throw new Error("Creative type is required");
  }

  const callToAction = String(
    input.creative?.callToAction ?? "SHOP_NOW"
  ).toUpperCase();

  if (!CALL_TO_ACTIONS.has(callToAction)) {
    throw new Error(
      `Unsupported call to action: ${callToAction}`
    );
  }

  const metaBudget = Number(
    input.budget?.allocation?.meta ?? 0
  );
  const tiktokBudget = Number(
    input.budget?.allocation?.tiktok ?? 0
  );

  if (!Number.isFinite(metaBudget) || metaBudget < 0) {
    throw new Error("Meta budget cannot be negative");
  }

  if (
    !Number.isFinite(tiktokBudget) ||
    tiktokBudget < 0
  ) {
    throw new Error("TikTok budget cannot be negative");
  }

  if (!metaEnabled && metaBudget > 0) {
    throw new Error(
      "Meta budget cannot be assigned when Meta is disabled"
    );
  }

  if (!tiktokEnabled && tiktokBudget > 0) {
    throw new Error(
      "TikTok budget cannot be assigned when TikTok is disabled"
    );
  }

  const allocatedBudget = metaBudget + tiktokBudget;

  if (
    Math.abs(allocatedBudget - budgetAmount) > 0.000001
  ) {
    const budgetLabel =
      budgetMode === "DAILY"
        ? "daily budget"
        : "total budget";

    throw new Error(
      `Platform budgets must equal ${budgetLabel}. Expected ${budgetAmount}, got ${allocatedBudget}`
    );
  }

  const projectedTotal =
    budgetMode === "DAILY"
      ? budgetAmount * durationDays
      : budgetAmount;

  return {
    version: 2,

    name: input.name.trim(),

    goal: "SALES",

    product: {
      source: input.product.source,
      id: input.product.id,
      title: input.product.title,
      price: input.product.price,
      currency: input.product.currency,
      imageUrl: input.product.imageUrl ?? null,
      destinationUrl:
        input.product.destinationUrl ?? null,
    },

    audience: {
      countries: input.audience.countries,
      ageMin: input.audience.ageMin ?? 18,
      ageMax: input.audience.ageMax ?? null,
      gender: input.audience.gender ?? "ALL",
    },

    budget: {
      mode: budgetMode,
      amount: budgetAmount,
      total: projectedTotal,
      projectedTotal,
      currency: input.budget.currency,
      durationDays,

      allocation: {
        mode: input.budget.allocation?.mode ?? "MANUAL",
        meta: metaBudget,
        tiktok: tiktokBudget,
      },
    },

    platforms: {
      meta: {
        enabled: metaEnabled,
        facebook:
          input.platforms?.meta?.facebook ?? false,
        instagram:
          input.platforms?.meta?.instagram ?? false,
      },

      tiktok: {
        enabled: tiktokEnabled,
      },
    },

    creative: {
      type: input.creative.type,
      primaryText:
        input.creative.primaryText ?? "",
      headline: input.creative.headline ?? "",
      destinationUrl:
        input.creative.destinationUrl ??
        input.product.destinationUrl ??
        null,
      callToAction,
    },

    overrides: normalizeCampaignOverrides(input.overrides),

    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };
}
