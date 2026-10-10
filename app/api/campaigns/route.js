import { campaignStore } from "../../../src/application/campaign-store.mjs";
import { loadMetaConnection } from "../../../src/application/meta-connection-store.mjs";
import { getMetaCampaignStatus } from "../../../src/application/get-meta-campaign-status.mjs";

export async function GET() {
  try {
    const campaigns = await campaignStore.list();
    const connection = await loadMetaConnection();

    const campaignsWithStatus = await Promise.all(
      campaigns.map(async (campaign) => {
        if (
          !campaign.execution?.meta ||
          !connection?.accessToken
        ) {
          return {
            ...campaign,
            liveStatus: null,
          };
        }

        try {
          const liveStatus =
            await getMetaCampaignStatus({
              storedCampaign: campaign,
              connection,
            });

          return {
            ...campaign,
            liveStatus,
          };
        } catch (error) {
          return {
            ...campaign,

            liveStatus: {
              platform: "META",
              error: error.message,
              checkedAt:
                new Date().toISOString(),
            },
          };
        }
      })
    );

    return Response.json({
      campaigns: campaignsWithStatus,
    });
  } catch (error) {
    console.error(
      "Could not load campaigns:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Could not load campaigns",
      },
      {
        status: 500,
      }
    );
  }
}