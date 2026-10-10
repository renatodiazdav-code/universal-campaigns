export function buildTikTokCampaignPlan(campaign) {
  if (!campaign.platforms?.tiktok?.enabled) {
    throw new Error("TikTok is not enabled for this campaign");
  }

  if (campaign.goal !== "SALES") {
    throw new Error("TikTok MVP only supports SALES");
  }

  return {
    platform: "TIKTOK",

    campaign: {
      name: campaign.name,
      objective: "SALES",
    },

    audience: {
      countries: campaign.audience.countries,
      ageMin: campaign.audience.ageMin,
      ageMax: campaign.audience.ageMax,
      gender: campaign.audience.gender,
    },

    budget: {
      mode: campaign.budget.mode ?? "TOTAL",
      allocated: campaign.budget.allocation.tiktok,
      currency: campaign.budget.currency,
      durationDays: campaign.budget.durationDays,
    },

    creative: {
      type: campaign.creative.type,
      primaryText: campaign.creative.primaryText,
      headline: campaign.creative.headline,
      destinationUrl: campaign.creative.destinationUrl,
      imageUrl: campaign.product.imageUrl,
      callToAction: campaign.creative.callToAction,
    },

    sourceCampaignVersion: campaign.version,
  };
}
