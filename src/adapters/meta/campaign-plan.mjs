import { resolveMetaAdvancedSettings } from "./advanced-settings.mjs";
import { resolvePlatformConfiguration } from "../../domain/platform-configuration.mjs";

export function buildMetaAttributionSpec(attribution, creativeType) {
  if (!attribution || attribution.mode === "AUTO") {
    return null;
  }

  const spec = [
    {
      event_type: "CLICK_THROUGH",
      window_days: attribution.clickWindowDays,
    },
  ];

  if (attribution.viewWindowDays === 1) {
    spec.push({
      event_type: "VIEW_THROUGH",
      window_days: 1,
    });
  }

  if (
    attribution.engagedViewWindowDays === 1 &&
    String(creativeType).toUpperCase() === "VIDEO"
  ) {
    spec.push({
      event_type: "ENGAGED_VIDEO_VIEW",
      window_days: 1,
    });
  }

  return spec;
}

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

  const resolved = resolvePlatformConfiguration(campaign, "meta");
  const advanced = resolveMetaAdvancedSettings(
    {
      audienceStrategy: resolved.settings.audience.mode === "SPECIFIC" ? "MANUAL" : "ADVANTAGE_PLUS",
      bidding: {
        strategy: resolved.settings.bidding.strategy,
        ...(resolved.settings.bidding.strategy === "COST_CAP" ? { costCap: resolved.settings.bidding.costCap } : {}),
      },
      ...resolved.overrides,
    },
    {
      facebookEnabled,
      instagramEnabled,
    }
  );

  const metaVideoId =
    campaign.creative.platformAssets?.meta?.videoId ?? null;
  const metaImageHash =
    campaign.creative.platformAssets?.meta?.imageHash ?? null;

  if (
    campaign.creative.type === "VIDEO" &&
    !metaVideoId &&
    !campaign.creative.videoUrl
  ) {
    throw new Error(
      "Meta VIDEO creative needs an uploaded Meta video asset or a video URL"
    );
  }

  if (
    campaign.creative.type === "IMAGE" &&
    !metaImageHash &&
    !campaign.product.imageUrl
  ) {
    throw new Error(
      "Meta IMAGE creative needs an uploaded Meta image asset or a product image URL"
    );
  }

  const attributionSpec = buildMetaAttributionSpec(
    advanced.attribution,
    campaign.creative.type
  );

  return {
    platform: "META",

    campaign: {
      name: campaign.name,
      objective: "OUTCOME_SALES",
    },

    audience: {
      countries: resolved.audience.countries,
      ageMin: resolved.audience.ageMin,
      ageMax: resolved.audience.ageMax,
      gender: resolved.audience.gender,
      strategy: advanced.audience.strategy,
      mode: advanced.audience.mode,
      advantageAudience:
        advanced.audience.advantageAudience,
      allowAgeExpansion:
        advanced.audience.allowAgeExpansion,
      allowGenderExpansion:
        advanced.audience.allowGenderExpansion,
      includedAudiences:
        advanced.audience.includedAudiences,
      excludedAudiences:
        advanced.audience.excludedAudiences,
      detailedTargeting:
        advanced.audience.detailedTargeting,
    },

    bidding: advanced.bidding,

    attribution: {
      ...advanced.attribution,
      spec: attributionSpec,
    },

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
      primaryText: resolved.creative.primaryText,
      headline: resolved.creative.headline,
      destinationUrl: resolved.creative.destinationUrl,
      imageUrl: campaign.product.imageUrl,
      metaImageHash,
      videoUrl: campaign.creative.videoUrl ?? null,
      metaVideoId,
      thumbnailUrl:
        campaign.creative.thumbnailUrl ??
        campaign.product.imageUrl ??
        null,
      callToAction: resolved.creative.callToAction,
      adaptation: advanced.creativeAdaptation,
    },

    overrides: campaign.overrides?.meta ?? {},

    sourceCampaignVersion: campaign.version,
  };
}
