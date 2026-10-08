const META_API_VERSION = "v26.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

function getAdAccountNodeId(adAccountId) {
  if (!adAccountId) {
    throw new Error("Missing Meta ad account ID");
  }

  return adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;
}

export function createMetaClient({
  adAccountId,
  accessToken,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  async function getBusinesses() {
    const params = new URLSearchParams({
      fields: "id,name",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/me/businesses?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get businesses failed: ${JSON.stringify(result)}`
      );
    }

    return result.data ?? [];
  }

  async function getBusinessAdAccounts(businessId) {
    const params = new URLSearchParams({
      fields: "id,name,account_status,currency",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/${businessId}/owned_ad_accounts?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get business ad accounts failed: ${JSON.stringify(result)}`
      );
    }

    return result.data ?? [];
  }

  async function getBusinessPages(businessId) {
    const params = new URLSearchParams({
      fields: "id,name",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/${businessId}/owned_pages?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get business pages failed: ${JSON.stringify(result)}`
      );
    }

    return result.data ?? [];
  }

  async function getAdAccountPixels(accountId) {
    const adAccountNodeId = getAdAccountNodeId(accountId);

    const params = new URLSearchParams({
      fields: "id,name",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/${adAccountNodeId}/adspixels?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get ad account pixels failed: ${JSON.stringify(result)}`
      );
    }

    return result.data ?? [];
  }

  async function createCampaign({
    name,
    objective,
    specialAdCategories = [],
    isAdsetBudgetSharingEnabled = false,
    status = "PAUSED",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/campaigns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name,
          objective,
          special_ad_categories:
            JSON.stringify(specialAdCategories),
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
    optimizationGoal = "LINK_CLICKS",
    pixelId = null,
    conversionEvent = "PURCHASE",
    status = "PAUSED",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    if (
      optimizationGoal === "OFFSITE_CONVERSIONS" &&
      !pixelId
    ) {
      throw new Error(
        "Meta pixel ID is required for conversion optimization"
      );
    }

    const body = {
      name,
      campaign_id: campaignId,
      daily_budget: String(dailyBudget),
      billing_event: "IMPRESSIONS",
      optimization_goal: optimizationGoal,
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
    };

    if (optimizationGoal === "OFFSITE_CONVERSIONS") {
      body.promoted_object = JSON.stringify({
        pixel_id: pixelId,
        custom_event_type: conversionEvent,
      });
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/adsets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body),
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
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

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
      `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/adcreatives`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name,
          object_story_spec:
            JSON.stringify(objectStorySpec),
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
    getBusinesses,
    getBusinessAdAccounts,
    getBusinessPages,
    getAdAccountPixels,

    createCampaign,
    getCampaign,
    createAdSet,
    createAdCreative,
  };
}