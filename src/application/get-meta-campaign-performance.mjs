import { getMetaCampaignInsights } from "../connectors/meta/insights.mjs";
import {
  normalizeMetaCampaignInsights,
  normalizeMetaPublisherBreakdown,
} from "../adapters/meta/campaign-performance.mjs";

export async function getMetaCampaignPerformance({
  storedCampaign,
  connection,
  metaClient = null,
}) {
  const campaignId =
    storedCampaign?.execution?.meta?.campaignId;

  if (!campaignId) {
    throw new Error("Meta campaign ID is missing");
  }

  if (!connection?.accessToken && !metaClient) {
    throw new Error("Meta is not connected");
  }

  async function readInsights(options = {}) {
    if (metaClient) {
      return metaClient.getCampaignInsights(
        campaignId,
        options
      );
    }

    return getMetaCampaignInsights({
      campaignId,
      accessToken: connection.accessToken,
      ...options,
    });
  }

  const [insights, publisherInsights] =
    await Promise.all([
      readInsights(),
      readInsights({
        breakdowns: ["publisher_platform"],
      }),
    ]);

  return {
    platform: "META",
    campaignId,
    metrics:
      normalizeMetaCampaignInsights(insights),
    breakdowns: {
      publisherPlatform:
        normalizeMetaPublisherBreakdown(
          publisherInsights
        ),
    },
    checkedAt: new Date().toISOString(),
  };
}
