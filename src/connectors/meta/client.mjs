const META_API_VERSION = "v26.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export function createMetaClient({ adAccountId, accessToken }) {
  if (!adAccountId || !accessToken) {
    throw new Error("Missing Meta ad account ID or access token");
  }

  async function createCampaign({
    name,
    objective,
    specialAdCategories = [],
    isAdsetBudgetSharingEnabled = false,
    status = "PAUSED",
  }) {
    const response = await fetch(
      `${META_GRAPH_URL}/act_${adAccountId}/campaigns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name,
          objective,
          special_ad_categories: JSON.stringify(specialAdCategories),
          is_adset_budget_sharing_enabled:
            String(isAdsetBudgetSharingEnabled),
          status,
          access_token: accessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta create campaign failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async function getCampaign(campaignId) {
    const params = new URLSearchParams({
      fields: "id,name,status,objective",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/${campaignId}?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get campaign failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  return {
    createCampaign,
    getCampaign,
  };
}