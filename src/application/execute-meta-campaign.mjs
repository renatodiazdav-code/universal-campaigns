import { buildMetaCampaignPlan } from "../adapters/meta/campaign-plan.mjs";
import { createMetaClient } from "../connectors/meta/client.mjs";

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function buildBudgetSchedule({
  budgetMode,
  allocatedBudget,
  durationDays,
  now = new Date(),
}) {
  if (!allocatedBudget || allocatedBudget <= 0) {
    throw new Error(
      "Meta campaign budget must be greater than zero"
    );
  }

  if (!durationDays || durationDays <= 0) {
    throw new Error(
      "Campaign duration must be greater than zero"
    );
  }

  const start = new Date(now);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid campaign start time");
  }

  const end = new Date(
    start.getTime() +
      Number(durationDays) * 24 * 60 * 60 * 1000
  );

  const mode = String(
    budgetMode ?? "TOTAL"
  ).toUpperCase();

  if (mode !== "TOTAL" && mode !== "DAILY") {
    throw new Error(
      "Meta budget mode must be TOTAL or DAILY"
    );
  }

  return {
    budgetMode: mode,
    dailyBudget:
      mode === "DAILY"
        ? toMinorUnits(allocatedBudget)
        : null,
    lifetimeBudget:
      mode === "TOTAL"
        ? toMinorUnits(allocatedBudget)
        : null,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

export async function executeMetaCampaign({
  campaign,
  connection,
  metaClient = null,
  now = new Date(),
}) {
  if (!campaign) {
    throw new Error("Missing Universal Campaign");
  }

  if (!connection?.accessToken) {
    throw new Error("Meta is not connected");
  }

  const adAccount = connection.setup?.adAccount;
  const page = connection.setup?.page;
  const pixel = connection.salesSetup?.pixel;

  if (!adAccount?.id) {
    throw new Error("Missing Meta ad account");
  }

  if (!page?.id) {
    throw new Error("Missing Meta Facebook Page");
  }

  if (!pixel?.id) {
    throw new Error("Missing Meta sales pixel");
  }

  const metaPlan = buildMetaCampaignPlan(campaign);

  const meta =
    metaClient ??
    createMetaClient({
      adAccountId: adAccount.id,
      accessToken: connection.accessToken,
    });

  const selectedInstagramAccount =
    campaign.platforms?.meta?.instagram &&
    connection.identity?.instagram?.mode === "INSTAGRAM_ACCOUNT"
      ? connection.identity.instagram.account ?? null
      : null;

  const created = {
    campaignId: null,
    adSetId: null,
    creativeId: null,
    adId: null,
  };

  try {
    const schedule = buildBudgetSchedule({
      budgetMode: metaPlan.budget.mode,
      allocatedBudget: metaPlan.budget.allocated,
      durationDays: campaign.budget.durationDays,
      now,
    });

    const bidAmount =
      metaPlan.bidding.costCap == null
        ? null
        : toMinorUnits(metaPlan.bidding.costCap);

    const metaCampaign = await meta.createCampaign({
      name: campaign.name,
      objective: metaPlan.campaign.objective,
      budgetMode: schedule.budgetMode,
      dailyBudget: schedule.dailyBudget,
      lifetimeBudget: schedule.lifetimeBudget,
      bidStrategy: metaPlan.bidding.apiStrategy,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: "PAUSED",
    });

    created.campaignId = metaCampaign.id;

    const adSet = await meta.createAdSet({
      name: `${campaign.name} - Ad Set`,
      campaignId: metaCampaign.id,
      budgetStrategy: metaPlan.budget.strategy,
      budgetMode: schedule.budgetMode,
      startTime: schedule.startTime,
      endTime: schedule.endTime,

      countries: metaPlan.audience.countries,
      ageMin: metaPlan.audience.ageMin,
      ageMax: metaPlan.audience.ageMax,
      gender: metaPlan.audience.gender,
      publisherPlatforms:
        metaPlan.placementSettings.publisherPlatforms,
      facebookPositions:
        metaPlan.placementSettings.facebook,
      instagramPositions:
        metaPlan.placementSettings.instagram,
      advantageAudience:
        metaPlan.audience.advantageAudience,
      allowAgeExpansion:
        metaPlan.audience.allowAgeExpansion,
      allowGenderExpansion:
        metaPlan.audience.allowGenderExpansion,

      optimizationGoal: "OFFSITE_CONVERSIONS",
      bidAmount,
      pixelId: pixel.id,
      conversionEvent: "PURCHASE",

      status: "PAUSED",
    });

    created.adSetId = adSet.id;

    const creative = await meta.createAdCreative({
      name: `${campaign.name} - Creative`,
      pageId: page.id,

      message: metaPlan.creative.primaryText,
      headline: metaPlan.creative.headline,
      destinationUrl: metaPlan.creative.destinationUrl,
      imageUrl: metaPlan.creative.imageUrl,
      callToAction: metaPlan.creative.callToAction,
      instagramActorId: selectedInstagramAccount?.id ?? null,
    });

    created.creativeId = creative.id;

    const ad = await meta.createAd({
      name: `${campaign.name} - Ad`,
      adSetId: adSet.id,
      creativeId: creative.id,
      status: "PAUSED",
    });

    created.adId = ad.id;

    return {
      status: "CREATED",
      platform: "META",

      campaign: {
        id: metaCampaign.id,
      },

      adSet: {
        id: adSet.id,
      },

      creative: {
        id: creative.id,
      },

      ad: {
        id: ad.id,
      },

      configuration: {
        objective: metaPlan.campaign.objective,
        optimizationGoal: "OFFSITE_CONVERSIONS",
        conversionEvent: "PURCHASE",
        callToAction: metaPlan.creative.callToAction,
        audience: {
          countries: metaPlan.audience.countries,
          ageMin: metaPlan.audience.ageMin,
          ageMax: metaPlan.audience.ageMax,
          gender: metaPlan.audience.gender,
          strategy: metaPlan.audience.strategy,
          advantageAudience:
            metaPlan.audience.advantageAudience,
        },
        bidding: {
          strategy: metaPlan.bidding.strategy,
          apiStrategy: metaPlan.bidding.apiStrategy,
          costCap: metaPlan.bidding.costCap,
          bidAmount,
        },
        placements: metaPlan.placements,
        placementSettings: {
          mode: metaPlan.placementSettings.mode,
          facebook: metaPlan.placementSettings.facebook,
          instagram: metaPlan.placementSettings.instagram,
        },
        pixel: {
          id: pixel.id,
          name: pixel.name,
        },
        page: {
          id: page.id,
          name: page.name,
        },
        instagramIdentity: selectedInstagramAccount
          ? {
              id: selectedInstagramAccount.id,
              username: selectedInstagramAccount.username ?? null,
              name: selectedInstagramAccount.name ?? null,
            }
          : null,
        budgetStrategy: metaPlan.budget.strategy,
        budgetMode: schedule.budgetMode,
        dailyBudget: schedule.dailyBudget,
        lifetimeBudget: schedule.lifetimeBudget,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        currency: metaPlan.budget.currency,
      },
    };
  } catch (error) {
    return {
      status: "FAILED",
      platform: "META",
      error: error.message,
      created,
    };
  }
}
