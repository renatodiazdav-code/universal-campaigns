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

  async function createAdSet({
    name,
    campaignId,
    dailyBudget,
    countries = ["PE"],
    ageMin = 18,
    ageMax = 35,
    status = "PAUSED",
  }) {
    const response = await fetch(
      `${META_GRAPH_URL}/act_${adAccountId}/adsets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name,
          campaign_id: campaignId,
          daily_budget: String(dailyBudget),
          billing_event: "IMPRESSIONS",
          optimization_goal: "LINK_CLICKS",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",

          targeting: JSON.stringify({
            geo_locations: {
              countries,
            },
            age_min: ageMin,
            age_max: ageMax,
            targeting_automation: {
              advantage_audience: 0,
            },
          }),

          status,
          access_token: accessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta create ad set failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async function createAdCreative({
    name,
    pageId,
    message,
    headline,
    destinationUrl,
    imageUrl,
  }) {
    const objectStorySpec = {
      page_id: pageId,

      link_data: {
        link: destinationUrl,
        message,
        name: headline,
        picture: imageUrl,
      },
    };

    const response = await fetch(
      `${META_GRAPH_URL}/act_${adAccountId}/adcreatives`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name,
          object_story_spec: JSON.stringify(objectStorySpec),
          access_token: accessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta create ad creative failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  return {
    createCampaign,
    getCampaign,
    createAdSet,
    createAdCreative,
  };
}