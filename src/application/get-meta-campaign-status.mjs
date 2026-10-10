import { createMetaClient } from "../connectors/meta/client.mjs";

export async function getMetaCampaignStatus({
  storedCampaign,
  connection,
  metaClient = null,
}) {
  const metaExecution =
    storedCampaign?.execution?.meta;

  if (!metaExecution?.campaignId) {
    throw new Error("Meta campaign ID is missing");
  }

  if (!metaExecution?.adSetId) {
    throw new Error("Meta ad set ID is missing");
  }

  if (!metaExecution?.adId) {
    throw new Error("Meta ad ID is missing");
  }

  if (!connection?.accessToken && !metaClient) {
    throw new Error("Meta is not connected");
  }

  const meta =
    metaClient ||
    createMetaClient({
      accessToken: connection.accessToken,
      adAccountId:
        connection?.setup?.adAccount?.id,
    });

  const [
    campaign,
    adSet,
    ad,
  ] = await Promise.all([
    meta.getCampaign(
      metaExecution.campaignId
    ),

    meta.getAdSet(
      metaExecution.adSetId
    ),

    meta.getAd(
      metaExecution.adId
    ),
  ]);

  return {
    platform: "META",

    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      effectiveStatus:
        campaign.effective_status,
    },

    adSet: {
      id: adSet.id,
      name: adSet.name,
      status: adSet.status,
      effectiveStatus:
        adSet.effective_status,
    },

    ad: {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      effectiveStatus:
        ad.effective_status,
    },

    checkedAt: new Date().toISOString(),
  };
}