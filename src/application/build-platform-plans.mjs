import {
  buildMetaCampaignPlan,
} from "../adapters/meta/campaign-plan.mjs";

import {
  buildTikTokCampaignPlan,
} from "../adapters/tiktok/campaign-plan.mjs";

export function buildPlatformPlans(campaign) {
  const plans = {};

  if (campaign.platforms?.meta?.enabled) {
    plans.meta = buildMetaCampaignPlan(campaign);
  }

  if (campaign.platforms?.tiktok?.enabled) {
    plans.tiktok = buildTikTokCampaignPlan(campaign);
  }

  if (Object.keys(plans).length === 0) {
    throw new Error("No advertising platforms are enabled");
  }

  return plans;
}