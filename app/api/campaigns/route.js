import { campaignStore } from "../../../src/application/campaign-store.mjs";
import { loadMetaConnection } from "../../../src/application/meta-connection-store.mjs";
import { getMetaCampaignStatus } from "../../../src/application/get-meta-campaign-status.mjs";
import { getMetaCampaignPerformance } from "../../../src/application/get-meta-campaign-performance.mjs";
import { createUniversalCampaignPerformance } from "../../../src/domain/campaign-performance.mjs";

function metaReadError(error) {
  return {
    platform: "META",
    error: error.message,
    checkedAt: new Date().toISOString(),
  };
}

function buildRelayPerformance({
  campaign,
  metaPerformance,
}) {
  if (metaPerformance?.error) {
    return {
      version: 1,
      metrics: null,
      platforms: {
        meta: metaPerformance,
      },
      error: metaPerformance.error,
      checkedAt: new Date().toISOString(),
    };
  }

  if (!metaPerformance?.metrics) {
    return null;
  }

  return createUniversalCampaignPerformance({
    platformPerformances: [metaPerformance],
    fallbackCurrency:
      campaign.input?.budget?.currency ?? null,
  });
}

export async function GET() {
  try {
    const campaigns = await campaignStore.list();
    const connection = await loadMetaConnection();

    const campaignsWithLiveData = await Promise.all(
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

        const [liveStatus, metaPerformance] =
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

        let performance;

        try {
          performance = buildRelayPerformance({
            campaign,
            metaPerformance,
          });
        } catch (error) {
          performance = {
            version: 1,
            metrics: null,
            platforms: {
              meta: metaPerformance,
            },
            error: error.message,
            checkedAt: new Date().toISOString(),
          };
        }

        return {
          ...campaign,
          liveStatus,
          performance,
        };
      })
    );

    return Response.json({
      campaigns: campaignsWithLiveData,
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
