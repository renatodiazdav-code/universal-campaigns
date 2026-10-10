export function buildMetaCampaignPlan(campaign) {
  if (!campaign.platforms?.meta?.enabled) {
    throw new Error("Meta is not enabled for this campaign");
  }

  if (campaign.goal !== "SALES") {
    throw new Error("Meta MVP only supports SALES");
  }

  const placements = [];

  if (campaign.platforms.meta.facebook) {
    placements.push("FACEBOOK");
  }

  if (campaign.platforms.meta.instagram) {
    placements.push("INSTAGRAM");
  }

  if (placements.length === 0) {
    throw new Error(
      "At least one Meta placement must be enabled"
    );
  }

  return {
    platform: "META",

    campaign: {
      name: campaign.name,
      objective: "OUTCOME_SALES",
    },

    audience: {
      countries: campaign.audience.countries,
      ageMin: campaign.audience.ageMin,
      ageMax: campaign.audience.ageMax,
      gender: campaign.audience.gender,
    },

    budget: {
      mode: campaign.budget.mode ?? "TOTAL",
      allocated: campaign.budget.allocation.meta,
      currency: campaign.budget.currency,
      durationDays: campaign.budget.durationDays,
    },

    placements,

    creative: {
      type: campaign.creative.type,
      primaryText: campaign.creative.primaryText,
      headline: campaign.creative.headline,
      destinationUrl: campaign.creative.destinationUrl,
      imageUrl: campaign.product.imageUrl,
    },

    sourceCampaignVersion: campaign.version,
  };
}
