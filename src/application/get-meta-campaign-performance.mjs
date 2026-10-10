import { getMetaCampaignInsights } from "../connectors/meta/insights.mjs";
import { normalizeMetaCampaignInsights } from "../adapters/meta/campaign-performance.mjs";

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

  const insights = metaClient
    ? await metaClient.getCampaignInsights(campaignId)
    : await getMetaCampaignInsights({
        campaignId,
        accessToken: connection.accessToken,
      });

  return {
    platform: "META",
    campaignId,
    metrics:
      normalizeMetaCampaignInsights(insights),
    checkedAt: new Date().toISOString(),
  };
}
