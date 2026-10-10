import { campaignStore } from "../../../src/application/campaign-store.mjs";
import { loadMetaConnection } from "../../../src/application/meta-connection-store.mjs";
import { getMetaCampaignStatus } from "../../../src/application/get-meta-campaign-status.mjs";
import { getMetaCampaignPerformance } from "../../../src/application/get-meta-campaign-performance.mjs";

function metaReadError(error) {
  return {
    platform: "META",
    error: error.message,
    checkedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const campaigns = await campaignStore.list();
    const connection = await loadMetaConnection();

    const campaignsWithMetaData = await Promise.all(
      campaigns.map(async (campaign) => {
        if (
          !campaign.execution?.meta ||
          !connection?.accessToken
        ) {
          return {
            ...campaign,
            liveStatus: null,
            performance: null,
          };
        }

        const [liveStatus, performance] =
          await Promise.all([
            getMetaCampaignStatus({
              storedCampaign: campaign,
              connection,
            }).catch(metaReadError),

            getMetaCampaignPerformance({
              storedCampaign: campaign,
              connection,
            }).catch(metaReadError),
          ]);

        return {
          ...campaign,
          liveStatus,
          performance,
        };
      })
    );

    return Response.json({
      campaigns: campaignsWithMetaData,
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
