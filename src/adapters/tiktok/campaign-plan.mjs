import { resolvePlatformConfiguration } from "../../domain/platform-configuration.mjs";

export function buildTikTokCampaignPlan(campaign) {
  if (!campaign.platforms?.tiktok?.enabled) {
    throw new Error("TikTok is not enabled for this campaign");
  }

  if (campaign.goal !== "SALES") {
    throw new Error("TikTok MVP only supports SALES");
  }

  const resolved = resolvePlatformConfiguration(campaign, "tiktok");
  return {
    platform: "TIKTOK",

    campaign: {
      name: campaign.name,
      objective: "SALES",
    },

    audience: {
      ...resolved.audience,
      mode: resolved.settings.audience.mode,
    },

    // Relay plan semantics; native TikTok payloads are validated by its connector.
    bidding: resolved.settings.bidding,

    budget: {
      mode: campaign.budget.mode ?? "TOTAL",
      allocated: campaign.budget.allocation.tiktok,
      currency: campaign.budget.currency,
      durationDays: campaign.budget.durationDays,
    },

    creative: {
      type: campaign.creative.type,
      primaryText: resolved.creative.primaryText,
      headline: resolved.creative.headline,
      destinationUrl: resolved.creative.destinationUrl,
      imageUrl: campaign.product.imageUrl,
      videoUrl: campaign.creative.videoUrl ?? null,
      videoId: campaign.creative.platformAssets?.tiktok?.videoId ?? null,
      callToAction: resolved.creative.callToAction,
    },

    overrides: campaign.overrides?.tiktok ?? {},

    sourceCampaignVersion: campaign.version,
  };
}
