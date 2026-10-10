import { createUniversalCampaign } from "../../../../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../../../../src/application/execute-meta-campaign.mjs";
import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import { campaignStore } from "../../../../src/application/campaign-store.mjs";
import { checkBudgetCompatibility } from "../../../../src/application/check-budget-compatibility.mjs";
import { resolveCampaignBudgetInput } from "../../../../src/application/resolve-campaign-budget-input.mjs";

export async function POST(request) {
  try {
    const rawCampaignInput = await request.json();

    const {
      input: campaignInput,
      allocation,
    } = await resolveCampaignBudgetInput(
      rawCampaignInput
    );

    const campaign = createUniversalCampaign(
      campaignInput
    );

    const compatibility =
      await checkBudgetCompatibility(campaign);

    if (!compatibility.eligible) {
      return Response.json(
        {
          status: "ERROR",
          error:
            compatibility.issues[0]?.message ||
            "Campaign budget is not compatible with the selected platforms",
          compatibility,
          allocation,
        },
        {
          status: 400,
        }
      );
    }

    if (!campaign.platforms?.meta?.enabled) {
      return Response.json(
        {
          status: "ERROR",
          error: "Meta must be enabled for this launch proof",
        },
        {
          status: 400,
        }
      );
    }

    if (campaign.platforms?.tiktok?.enabled) {
      return Response.json(
        {
          status: "ERROR",
          error: "TikTok execution is not implemented yet",
          compatibility,
          allocation,
        },
        {
          status: 400,
        }
      );
    }

    const connection = await loadMetaConnection();

    if (!connection?.accessToken) {
      return Response.json(
        {
          status: "ERROR",
          error: "Meta is not connected",
        },
        {
          status: 401,
        }
      );
    }

    if (!connection?.salesSetup?.pixel?.id) {
      return Response.json(
        {
          status: "ERROR",
          error: "Meta sales pixel is not configured",
        },
        {
          status: 400,
        }
      );
    }

    const metaResult = await executeMetaCampaign({
      campaign,
      connection,
    });

    if (metaResult.status !== "CREATED") {
      return Response.json(
        {
          status: "FAILED",
          campaign,
          allocation,
          platforms: {
            meta: metaResult,
          },
        },
        {
          status: 502,
        }
      );
    }

    const storedCampaign = await campaignStore.save({
      name: campaign.name,
      status: "PAUSED",

      input: {
        goal: campaign.goal,
        product: campaign.product,
        audience: campaign.audience,
        budget: campaign.budget,
        platforms: campaign.platforms,
        creative: campaign.creative,
      },

      resolvedConfiguration: {
        meta: metaResult.configuration,
      },

      execution: {
        meta: {
          status: metaResult.status,
          campaignId: metaResult.campaign.id,
          adSetId: metaResult.adSet.id,
          creativeId: metaResult.creative.id,
          adId: metaResult.ad.id,
        },
      },
    });

    return Response.json({
      status: "CREATED",
      campaign,
      allocation,
      compatibility,
      storedCampaign,

      platforms: {
        meta: metaResult,
      },

      safety: {
        mode: "PAUSED",
        message:
          "All Meta advertising objects were created paused. No ad spend has been activated.",
      },
    });
  } catch (error) {
    console.error("Campaign launch error:", error);

    return Response.json(
      {
        status: "ERROR",
        error:
          error.message ||
          "Could not launch campaign",
        allocation: error.allocation ?? null,
      },
      {
        status: 500,
      }
    );
  }
}
