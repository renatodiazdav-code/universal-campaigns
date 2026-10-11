import { resolveMetaAdvancedSettings } from "./advanced-settings.mjs";

export function buildMetaCampaignPlan(campaign) {
  if (!campaign.platforms?.meta?.enabled) {
    throw new Error("Meta is not enabled for this campaign");
  }

  if (campaign.goal !== "SALES") {
    throw new Error("Meta MVP only supports SALES");
  }

  const facebookEnabled = Boolean(
    campaign.platforms.meta.facebook
  );
  const instagramEnabled = Boolean(
    campaign.platforms.meta.instagram
  );

  if (!facebookEnabled && !instagramEnabled) {
    throw new Error(
      "At least one Meta placement must be enabled"
    );
  }

  const advanced = resolveMetaAdvancedSettings(
    campaign.overrides?.meta ?? {},
    {
      facebookEnabled,
      instagramEnabled,
    }
  );

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
      strategy: advanced.audience.strategy,
      advantageAudience:
        advanced.audience.advantageAudience,
      allowAgeExpansion:
        advanced.audience.allowAgeExpansion,
      allowGenderExpansion:
        advanced.audience.allowGenderExpansion,
    },

    bidding: advanced.bidding,

    budget: {
      strategy: "CAMPAIGN",
      mode: campaign.budget.mode ?? "TOTAL",
      allocated: campaign.budget.allocation.meta,
      currency: campaign.budget.currency,
      durationDays: campaign.budget.durationDays,
    },

    placements: advanced.placements.publisherPlatforms,
    placementSettings: advanced.placements,

    creative: {
      type: campaign.creative.type,
      primaryText: campaign.creative.primaryText,
      headline: campaign.creative.headline,
      destinationUrl: campaign.creative.destinationUrl,
      imageUrl: campaign.product.imageUrl,
      callToAction: campaign.creative.callToAction,
    },

    overrides: campaign.overrides?.meta ?? {},

    sourceCampaignVersion: campaign.version,
  };
}
