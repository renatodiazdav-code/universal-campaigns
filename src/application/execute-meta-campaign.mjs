import { buildMetaCampaignPlan } from "../adapters/meta/campaign-plan.mjs";
import { createMetaClient } from "../connectors/meta/client.mjs";

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function calculateDailyBudget({
  totalBudget,
  durationDays,
}) {
  if (!totalBudget || totalBudget <= 0) {
    throw new Error("Meta campaign budget must be greater than zero");
  }

  if (!durationDays || durationDays <= 0) {
    throw new Error("Campaign duration must be greater than zero");
  }

  const dailyBudget =
    Number(totalBudget) / Number(durationDays);

  return toMinorUnits(dailyBudget);
}

export async function executeMetaCampaign({
  campaign,
  connection,
  metaClient = null,
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

  const created = {
    campaignId: null,
    adSetId: null,
    creativeId: null,
    adId: null,
  };

  try {
    const metaCampaign = await meta.createCampaign({
      name: campaign.name,
      objective: metaPlan.campaign.objective,
      status: "PAUSED",
    });

    created.campaignId = metaCampaign.id;

    const dailyBudget = calculateDailyBudget({
      totalBudget: metaPlan.budget.allocated,
      durationDays: campaign.budget.durationDays,
    });

    const adSet = await meta.createAdSet({
      name: `${campaign.name} - Ad Set`,
      campaignId: metaCampaign.id,
      dailyBudget,

      countries: metaPlan.audience.countries,
      ageMin: metaPlan.audience.ageMin,
      ageMax: metaPlan.audience.ageMax,

      optimizationGoal: "OFFSITE_CONVERSIONS",
      pixelId: pixel.id,
      conversionEvent: "PURCHASE",

      status: "PAUSED",
    });

    created.adSetId = adSet.id;

    const creative = await meta.createAdCreative({
      name: `${campaign.name} - Creative`,
      pageId: page.id,

      message: campaign.creative.primaryText,
      headline: campaign.creative.headline,
      destinationUrl: campaign.creative.destinationUrl,
      imageUrl: campaign.product.imageUrl,
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
        pixel: {
          id: pixel.id,
          name: pixel.name,
        },
        page: {
          id: page.id,
          name: page.name,
        },
        dailyBudget,
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