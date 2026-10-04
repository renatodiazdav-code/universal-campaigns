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

  if (!input.budget?.total || input.budget.total <= 0) {
    throw new Error("Budget must be greater than 0");
  }

  const metaEnabled = input.platforms?.meta?.enabled === true;
  const tiktokEnabled = input.platforms?.tiktok?.enabled === true;

  if (!metaEnabled && !tiktokEnabled) {
    throw new Error("At least one advertising platform must be enabled");
  }

  if (!input.creative?.type) {
    throw new Error("Creative type is required");
  }

const metaBudget = input.budget.allocation?.meta ?? 0;
const tiktokBudget = input.budget.allocation?.tiktok ?? 0;

if (!metaEnabled && metaBudget > 0) {
  throw new Error("Meta budget cannot be assigned when Meta is disabled");
}

if (!tiktokEnabled && tiktokBudget > 0) {
  throw new Error("TikTok budget cannot be assigned when TikTok is disabled");
}

const allocatedBudget = metaBudget + tiktokBudget;

if (allocatedBudget !== input.budget.total) {
  throw new Error(
    `Platform budgets must equal total budget. Expected ${input.budget.total}, got ${allocatedBudget}`
  );
}
  
  return {
    version: 1,

    name: input.name.trim(),

    goal: "SALES",

    product: {
      source: input.product.source,
      id: input.product.id,
      title: input.product.title,
      price: input.product.price,
      currency: input.product.currency,
      imageUrl: input.product.imageUrl ?? null,
      destinationUrl: input.product.destinationUrl ?? null,
    },

    audience: {
      countries: input.audience.countries,
      ageMin: input.audience.ageMin ?? 18,
      ageMax: input.audience.ageMax ?? null,
      gender: input.audience.gender ?? "ALL",
    },

    budget: {
  total: input.budget.total,
  currency: input.budget.currency,
  durationDays: input.budget.durationDays,

  allocation: {
    mode: input.budget.allocation?.mode ?? "MANUAL",
    meta: input.budget.allocation?.meta ?? 0,
    tiktok: input.budget.allocation?.tiktok ?? 0,
  },
},

    platforms: {
      meta: {
        enabled: metaEnabled,
        facebook: input.platforms?.meta?.facebook ?? false,
        instagram: input.platforms?.meta?.instagram ?? false,
      },

      tiktok: {
        enabled: tiktokEnabled,
      },
    },

    creative: {
      type: input.creative.type,
      primaryText: input.creative.primaryText ?? "",
      headline: input.creative.headline ?? "",
      destinationUrl:
        input.creative.destinationUrl ??
        input.product.destinationUrl ??
        null,
    },

    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };
}