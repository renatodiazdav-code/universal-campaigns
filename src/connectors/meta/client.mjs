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

function buildMetaGenderTargeting(gender) {
  const value = String(gender ?? "ALL").toUpperCase();

  if (value === "ALL") {
    return null;
  }

  if (value === "MALE") {
    return [1];
  }

  if (value === "FEMALE") {
    return [2];
  }

  throw new Error(`Unsupported Meta gender: ${gender}`);
}

function buildMetaPublisherPlatforms(platforms) {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return null;
  }

  const allowed = new Set([
    "FACEBOOK",
    "INSTAGRAM",
    "MESSENGER",
    "AUDIENCE_NETWORK",
  ]);

  const normalized = platforms.map((platform) =>
    String(platform).toUpperCase()
  );

  for (const platform of normalized) {
    if (!allowed.has(platform)) {
      throw new Error(
        `Unsupported Meta publisher platform: ${platform}`
      );
    }
  }

  return normalized.map((platform) =>
    platform.toLowerCase()
  );
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
      fields: "id,name,status,effective_status,objective",
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

  async function getAdSet(adSetId) {
    const params = new URLSearchParams({
      fields:
        "id,name,status,effective_status,optimization_goal,start_time,end_time,daily_budget,lifetime_budget",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/${adSetId}?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get ad set failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async function getAd(adId) {
    const params = new URLSearchParams({
      fields: "id,name,status,effective_status",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_URL}/${adId}?${params}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta get ad failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async function createAdSet({
    name,
    campaignId,
    budgetMode = "TOTAL",
    dailyBudget = null,
    lifetimeBudget = null,
    startTime,
    endTime,
    countries = ["PE"],
    ageMin = 18,
    ageMax = 35,
    gender = "ALL",
    publisherPlatforms = null,
    optimizationGoal = "LINK_CLICKS",
    pixelId = null,
    conversionEvent = "PURCHASE",
    status = "PAUSED",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    const mode = String(budgetMode).toUpperCase();

    if (mode === "DAILY") {
      if (!dailyBudget || dailyBudget <= 0) {
        throw new Error(
          "Meta daily budget must be greater than zero"
        );
      }
    } else if (mode === "TOTAL") {
      if (!lifetimeBudget || lifetimeBudget <= 0) {
        throw new Error(
          "Meta lifetime budget must be greater than zero"
        );
      }
    } else {
      throw new Error(
        "Meta budget mode must be TOTAL or DAILY"
      );
    }

    if (!startTime || !endTime) {
      throw new Error("Meta ad set schedule is required");
    }

    if (
      optimizationGoal === "OFFSITE_CONVERSIONS" &&
      !pixelId
    ) {
      throw new Error(
        "Meta pixel ID is required for conversion optimization"
      );
    }

    const targeting = {
      geo_locations: {
        countries,
      },
      age_min: ageMin,
      age_max: ageMax,
      targeting_automation: {
        advantage_audience: 0,
      },
    };

    const genders = buildMetaGenderTargeting(gender);
    if (genders) {
      targeting.genders = genders;
    }

    const normalizedPublisherPlatforms =
      buildMetaPublisherPlatforms(publisherPlatforms);
    if (normalizedPublisherPlatforms) {
      targeting.publisher_platforms =
        normalizedPublisherPlatforms;
    }

    const body = {
      name,
      campaign_id: campaignId,
      start_time: startTime,
      end_time: endTime,
      billing_event: "IMPRESSIONS",
      optimization_goal: optimizationGoal,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: JSON.stringify(targeting),
      status,
      access_token: accessToken,
    };

    if (mode === "DAILY") {
      body.daily_budget = String(dailyBudget);
    } else {
      body.lifetime_budget = String(lifetimeBudget);
    }

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
    callToAction = "SHOP_NOW",
    instagramActorId = null,
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
        call_to_action: {
          type: callToAction,
        },
      },
    };

    if (instagramActorId) {
      objectStorySpec.instagram_actor_id = String(instagramActorId);
    }

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

  async function createAd({
    name,
    adSetId,
    creativeId,
    status = "PAUSED",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    if (!adSetId) {
      throw new Error("Missing Meta ad set ID");
    }

    if (!creativeId) {
      throw new Error("Missing Meta creative ID");
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/ads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name,
          adset_id: adSetId,
          creative: JSON.stringify({
            creative_id: creativeId,
          }),
          status,
          access_token: accessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta create ad failed: ${JSON.stringify(result)}`
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
    getAdSet,

    createAdCreative,

    createAd,
    getAd,
  };
}
