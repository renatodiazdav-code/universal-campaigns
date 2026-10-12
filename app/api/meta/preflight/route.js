import { withUser } from "../../../../src/application/auth-http.mjs";
import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import { deriveMetaCapabilities } from "../../../../src/application/derive-meta-capabilities.mjs";
import { checkMetaCampaignPreflight } from "../../../../src/application/check-meta-campaign-preflight.mjs";
import { resolveCampaignBudgetInput } from "../../../../src/application/resolve-campaign-budget-input.mjs";
import { createUniversalCampaign } from "../../../../src/domain/universal-campaign.mjs";

export const POST = withUser(async function POST(request, { user }) {
  try {
    const rawCampaignInput = await request.json();

    const connection = await loadMetaConnection(user.id);

    if (!connection?.accessToken) {
      return Response.json(
        {
          status: "NOT_CONNECTED",
          ready: false,
          error: "Meta is not connected",
        },
        {
          status: 401,
        }
      );
    }

    if (!connection.setupSnapshot) {
      return Response.json(
        {
          status: "NEEDS_SETUP_REFRESH",
          ready: false,
          error:
            "Meta setup has not been inspected yet. Refresh the Meta setup before preflight.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      input: campaignInput,
      allocation,
    } = await resolveCampaignBudgetInput(rawCampaignInput);

    const campaign = createUniversalCampaign(campaignInput);
    const capabilities = deriveMetaCapabilities(
      connection.setupSnapshot
    );

    const preflight = checkMetaCampaignPreflight({
      campaign,
      metaCapabilities: capabilities,
    });

    return Response.json({
      ...preflight,
      campaign: {
        name: campaign.name,
        goal: campaign.goal,
        platforms: campaign.platforms,
      },
      allocation,
      capabilitiesStatus: capabilities.status,
    });
  } catch (error) {
    console.error("Meta campaign preflight error:", error);

    return Response.json(
      {
        status: "ERROR",
        ready: false,
        error:
          error.message ||
          "Could not run Meta campaign preflight",
        allocation: error.allocation ?? null,
      },
      {
        status: 400,
      }
    );
  }
});
