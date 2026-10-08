import { createUniversalCampaign } from "../../../../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../../../../src/application/execute-meta-campaign.mjs";
import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";

export async function POST(request) {
  try {
    const campaignInput = await request.json();

    const campaign = createUniversalCampaign(campaignInput);

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
          platforms: {
            meta: metaResult,
          },
        },
        {
          status: 502,
        }
      );
    }

    return Response.json({
      status: "CREATED",
      campaign,
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
      },
      {
        status: 500,
      }
    );
  }
}