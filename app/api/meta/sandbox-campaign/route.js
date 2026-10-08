import { createMetaClient } from "../../../../src/connectors/meta/client.mjs";

export async function POST(request) {
  try {
    const { metaPlan } = await request.json();

    if (!metaPlan) {
      return Response.json(
        { error: "Meta campaign plan is required" },
        { status: 400 }
      );
    }

    const adAccountId = process.env.META_SANDBOX_AD_ACCOUNT_ID;
    const accessToken = process.env.META_SANDBOX_ACCESS_TOKEN;

    if (!adAccountId || !accessToken) {
      return Response.json(
        { error: "Meta sandbox configuration is missing" },
        { status: 500 }
      );
    }

    const objectiveMap = {
      SALES: "OUTCOME_SALES",
    };

    const objective =
      objectiveMap[metaPlan.campaign?.objective];

    if (!objective) {
      return Response.json(
        { error: "Unsupported Meta campaign objective" },
        { status: 400 }
      );
    }

    const meta = createMetaClient({
      adAccountId,
      accessToken,
    });

    const createdCampaign = await meta.createCampaign({
      name: metaPlan.campaign.name,
      objective,
      status: "PAUSED",
    });

    const verifiedCampaign = await meta.getCampaign(
      createdCampaign.id
    );

    return Response.json({
      success: true,
      campaign: verifiedCampaign,
    });
  } catch (error) {
    console.error("Meta sandbox campaign error:", error);

    return Response.json(
      {
        error:
          error.message ||
          "Could not create Meta sandbox campaign",
      },
      {
        status: 500,
      }
    );
  }
}