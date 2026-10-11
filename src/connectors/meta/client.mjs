const META_API_VERSION = "v26.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const FACEBOOK_POSITION_MAP = Object.freeze({
  FEED: "feed",
  STORIES: "story",
  REELS: "facebook_reels",
});

const INSTAGRAM_POSITION_MAP = Object.freeze({
  FEED: "stream",
  STORIES: "story",
  REELS: "reels",
});

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

function buildMetaPlacementPositions(
  positions,
  label,
  positionMap
) {
  if (positions == null) {
    return null;
  }

  if (!Array.isArray(positions)) {
    throw new Error(`${label} positions must be an array`);
  }

  const normalized = positions.map((position) =>
    String(position).toUpperCase()
  );

  for (const position of normalized) {
    if (!(position in positionMap)) {
      throw new Error(
        `Unsupported ${label} position: ${position}`
      );
    }
  }

  return [...new Set(normalized)].map(
    (position) => positionMap[position]
  );
}

function buildMetaTargetingAutomation({
  advantageAudience,
  allowAgeExpansion,
  allowGenderExpansion,
}) {
  if (!advantageAudience) {
    return {
      advantage_audience: 0,
    };
  }

  return {
    advantage_audience: 1,
    individual_setting: {
      age: allowAgeExpansion ? 1 : 0,
      gender: allowGenderExpansion ? 1 : 0,
    },
  };
}

function buildMetaCreativeAdaptation(
  creativeAdaptation = {},
  creativeType = "IMAGE"
) {
  const mode = String(
    creativeAdaptation?.mode ?? "AUTOMATIC"
  ).toUpperCase();

  if (mode !== "AUTOMATIC") {
    throw new Error(
      `Unsupported Meta creative adaptation mode: ${mode}`
    );
  }

  const type = String(creativeType).toUpperCase();

  if (type !== "IMAGE" && type !== "VIDEO") {
    throw new Error(`Unsupported Meta creative type: ${type}`);
  }

  const creativeFeaturesSpec = {};

  if (creativeAdaptation?.adaptToPlacement !== false) {
    creativeFeaturesSpec.adapt_to_placement = {
      enroll_status: "OPT_IN",
    };
  }

  if (
    type === "IMAGE" &&
    creativeAdaptation?.imageAutoCrop !== false
  ) {
    creativeFeaturesSpec.image_auto_crop = {
      enroll_status: "OPT_IN",
    };
  }

  if (
    type === "VIDEO" &&
    creativeAdaptation?.videoAutoCrop !== false
  ) {
    creativeFeaturesSpec.video_auto_crop = {
      enroll_status: "OPT_IN",
    };
  }

  return {
    creative_features_spec: creativeFeaturesSpec,
  };
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
    budgetMode = null,
    dailyBudget = null,
    lifetimeBudget = null,
    bidStrategy = "LOWEST_COST_WITHOUT_CAP",
    startTime = null,
    endTime = null,
    status = "PAUSED",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    const body = {
      name,
      objective,
      special_ad_categories:
        JSON.stringify(specialAdCategories),
      status,
      access_token: accessToken,
    };

    if (budgetMode != null) {
      const mode = String(budgetMode).toUpperCase();

      if (mode === "DAILY") {
        if (!dailyBudget || dailyBudget <= 0) {
          throw new Error(
            "Meta campaign daily budget must be greater than zero"
          );
        }
        body.daily_budget = String(dailyBudget);
      } else if (mode === "TOTAL") {
        if (!lifetimeBudget || lifetimeBudget <= 0) {
          throw new Error(
            "Meta campaign lifetime budget must be greater than zero"
          );
        }
        body.lifetime_budget = String(lifetimeBudget);
      } else {
        throw new Error(
          "Meta campaign budget mode must be TOTAL or DAILY"
        );
      }

      body.bid_strategy = bidStrategy;

      if (startTime) {
        body.start_time = startTime;
      }

      if (endTime) {
        body.stop_time = endTime;
      }
    } else {
      body.is_adset_budget_sharing_enabled =
        String(isAdsetBudgetSharingEnabled);
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/campaigns`,
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
        `Meta create campaign failed: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async function getCampaign(campaignId) {
    const params = new URLSearchParams({
      fields:
        "id,name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy,start_time,stop_time",
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
        "id,name,status,effective_status,optimization_goal,start_time,end_time,daily_budget,lifetime_budget,bid_amount",
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
    budgetStrategy = "AD_SET",
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
    facebookPositions = null,
    instagramPositions = null,
    advantageAudience = true,
    allowAgeExpansion = false,
    allowGenderExpansion = false,
    optimizationGoal = "LINK_CLICKS",
    bidStrategy = "LOWEST_COST_WITHOUT_CAP",
    bidAmount = null,
    pixelId = null,
    conversionEvent = "PURCHASE",
    status = "PAUSED",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    const strategy = String(budgetStrategy).toUpperCase();
    const mode = String(budgetMode).toUpperCase();

    if (strategy !== "CAMPAIGN" && strategy !== "AD_SET") {
      throw new Error(
        "Meta budget strategy must be CAMPAIGN or AD_SET"
      );
    }

    if (mode !== "DAILY" && mode !== "TOTAL") {
      throw new Error(
        "Meta budget mode must be TOTAL or DAILY"
      );
    }

    if (strategy === "AD_SET") {
      if (mode === "DAILY") {
        if (!dailyBudget || dailyBudget <= 0) {
          throw new Error(
            "Meta daily budget must be greater than zero"
          );
        }
      } else if (!lifetimeBudget || lifetimeBudget <= 0) {
        throw new Error(
          "Meta lifetime budget must be greater than zero"
        );
      }
    }

    if (bidAmount != null) {
      const numericBidAmount = Number(bidAmount);

      if (!Number.isFinite(numericBidAmount) || numericBidAmount <= 0) {
        throw new Error(
          "Meta bid amount must be greater than zero"
        );
      }
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
      targeting_automation: buildMetaTargetingAutomation({
        advantageAudience,
        allowAgeExpansion,
        allowGenderExpansion,
      }),
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

    const normalizedFacebookPositions =
      buildMetaPlacementPositions(
        facebookPositions,
        "Facebook",
        FACEBOOK_POSITION_MAP
      );

    if (
      normalizedFacebookPositions &&
      normalizedFacebookPositions.length > 0
    ) {
      if (!normalizedPublisherPlatforms?.includes("facebook")) {
        throw new Error(
          "Facebook positions require Facebook publisher placement"
        );
      }

      targeting.facebook_positions =
        normalizedFacebookPositions;
    }

    const normalizedInstagramPositions =
      buildMetaPlacementPositions(
        instagramPositions,
        "Instagram",
        INSTAGRAM_POSITION_MAP
      );

    if (
      normalizedInstagramPositions &&
      normalizedInstagramPositions.length > 0
    ) {
      if (!normalizedPublisherPlatforms?.includes("instagram")) {
        throw new Error(
          "Instagram positions require Instagram publisher placement"
        );
      }

      targeting.instagram_positions =
        normalizedInstagramPositions;
    }

    const body = {
      name,
      campaign_id: campaignId,
      start_time: startTime,
      end_time: endTime,
      billing_event: "IMPRESSIONS",
      optimization_goal: optimizationGoal,
      targeting: JSON.stringify(targeting),
      status,
      access_token: accessToken,
    };

    if (strategy === "AD_SET") {
      body.bid_strategy = bidStrategy;

      if (mode === "DAILY") {
        body.daily_budget = String(dailyBudget);
      } else {
        body.lifetime_budget = String(lifetimeBudget);
      }
    }

    if (bidAmount != null) {
      body.bid_amount = String(Math.round(Number(bidAmount)));
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

  async function createAdVideo({
    fileUrl,
    title = "Relay video creative",
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    if (!fileUrl?.trim?.()) {
      throw new Error("Meta video file URL is required");
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/advideos`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          file_url: fileUrl,
          title,
          access_token: accessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Meta create ad video failed: ${JSON.stringify(result)}`
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
    imageHash = null,
    creativeType = "IMAGE",
    videoId = null,
    callToAction = "SHOP_NOW",
    instagramActorId = null,
    creativeAdaptation = {
      mode: "AUTOMATIC",
      adaptToPlacement: true,
      imageAutoCrop: true,
      videoAutoCrop: true,
    },
  }) {
    if (!adAccountId) {
      throw new Error("Missing Meta ad account ID");
    }

    const type = String(creativeType).toUpperCase();

    if (type !== "IMAGE" && type !== "VIDEO") {
      throw new Error(`Unsupported Meta creative type: ${type}`);
    }

    const objectStorySpec = {
      page_id: pageId,
    };

    if (type === "IMAGE") {
      if (!imageHash && !imageUrl) {
        throw new Error(
          "Meta image hash or image URL is required for IMAGE creatives"
        );
      }

      objectStorySpec.link_data = {
        link: destinationUrl,
        message,
        name: headline,
        call_to_action: {
          type: callToAction,
        },
      };

      if (imageHash) {
        objectStorySpec.link_data.image_hash = String(imageHash);
      } else {
        objectStorySpec.link_data.picture = imageUrl;
      }
    } else {
      if (!videoId) {
        throw new Error("Meta video ID is required for VIDEO creatives");
      }

      objectStorySpec.video_data = {
        video_id: String(videoId),
        message,
        title: headline,
        call_to_action: {
          type: callToAction,
          value: {
            link: destinationUrl,
          },
        },
      };

      if (imageUrl) {
        objectStorySpec.video_data.image_url = imageUrl;
      }
    }

    if (instagramActorId) {
      objectStorySpec.instagram_actor_id = String(instagramActorId);
    }

    const degreesOfFreedomSpec =
      buildMetaCreativeAdaptation(
        creativeAdaptation,
        type
      );

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
          degrees_of_freedom_spec:
            JSON.stringify(degreesOfFreedomSpec),
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

    createAdVideo,
    createAdCreative,

    createAd,
    getAd,
  };
}
