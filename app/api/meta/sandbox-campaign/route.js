import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import { withUser } from "../../../../src/application/auth-http.mjs";
import { createMetaClient } from "../../../../src/connectors/meta/client.mjs";


export const POST = withUser(async function POST(request, { user }) {

  if (process.env.NODE_ENV !== "development") {
  return Response.json(
    { error: "Meta sandbox endpoint is only available in development" },
    { status: 403 }
  );
}

  try {
    const { metaPlan } = await request.json();

    if (!metaPlan) {
      return Response.json(
        { error: "Meta campaign plan is required" },
        { status: 400 }
      );
    }

    const connection = await loadMetaConnection(user.id);
    const adAccountId = connection?.setup?.adAccount?.id;
    const accessToken = connection?.accessToken;

    if (!adAccountId || !accessToken) {
      return Response.json(
        { error: "Connect your Meta account first" },
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
});
