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

const DETAILED_TARGETING_TYPES = new Set([
  "interests",
  "behaviors",
  "life_events",
  "family_statuses",
  "industries",
  "work_employers",
  "work_positions",
  "education_schools",
  "education_majors",
  "income",
  "home_ownership",
  "home_type",
  "household_composition",
  "generation",
  "moms",
  "office_type",
]);

const ATTRIBUTION_WINDOWS = Object.freeze({
  CLICK_THROUGH: new Set([1, 7]),
  VIEW_THROUGH: new Set([1]),
  ENGAGED_VIDEO_VIEW: new Set([1]),
});

function getAdAccountNodeId(adAccountId) {
  if (!adAccountId) {
    throw new Error("Missing Meta ad account ID");
  }

  return String(adAccountId).startsWith("act_")
    ? String(adAccountId)
    : `act_${adAccountId}`;
}

function buildGenderTargeting(gender) {
  const value = String(gender ?? "ALL").toUpperCase();

  if (value === "ALL") return null;
  if (value === "MALE") return [1];
  if (value === "FEMALE") return [2];

  throw new Error(`Unsupported Meta gender: ${gender}`);
}

function buildPublisherPlatforms(platforms) {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return null;
  }

  const allowed = new Set(["FACEBOOK", "INSTAGRAM"]);
  const normalized = platforms.map((platform) =>
    String(platform).toUpperCase()
  );

  for (const platform of normalized) {
    if (!allowed.has(platform)) {
      throw new Error(`Unsupported Relay Meta publisher: ${platform}`);
    }
  }

  return [...new Set(normalized)].map((platform) =>
    platform.toLowerCase()
  );
}

function buildPlacementPositions(positions, label, map) {
  if (positions == null) return null;
  if (!Array.isArray(positions)) {
    throw new Error(`${label} positions must be an array`);
  }

  return [...new Set(positions.map((position) => String(position).toUpperCase()))]
    .map((position) => {
      if (!(position in map)) {
        throw new Error(`Unsupported ${label} position: ${position}`);
      }
      return map[position];
    });
}

function normalizeAudienceIds(values) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const result = [];

  for (const audience of values) {
    const id = String(audience?.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ id });
  }

  return result;
}

function buildTargetingRelaxationTypes(
  includedAudiences,
  advantageAudience
) {
  if (!Array.isArray(includedAudiences)) {
    return null;
  }

  let hasCustomAudience = false;
  let hasLookalike = false;

  for (const audience of includedAudiences) {
    const kind = String(
      audience?.kind ?? audience?.subtype ?? "CUSTOM"
    ).toUpperCase();

    if (kind === "LOOKALIKE") {
      hasLookalike = true;
    } else {
      hasCustomAudience = true;
    }
  }

  if (!hasCustomAudience && !hasLookalike) {
    return null;
  }

  const relaxation = {};

  if (hasCustomAudience) {
    // Meta allows Custom Audience expansion to be disabled after switching
    // to the specific/original audience flow. In Advantage+ it is a suggestion.
    relaxation.custom_audience = advantageAudience ? 1 : 0;
  }

  if (hasLookalike) {
    // For Sales/Purchase conversion optimization, Lookalike targeting remains
    // expanded/a suggestion even when Advantage+ Audience is switched off.
    relaxation.lookalike = 1;
  }

  return relaxation;
}

function buildDetailedTargetingGroup(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const group = {};
  const seen = new Set();

  for (const item of values) {
    const id = String(item?.id ?? "").trim();
    const name = String(item?.name ?? "").trim();
    const type = String(item?.type ?? "").toLowerCase();

    if (!id || !name || !type) continue;
    if (!DETAILED_TARGETING_TYPES.has(type)) {
      throw new Error(`Unsupported Meta detailed targeting type: ${type}`);
    }

    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    group[type] ??= [];
    group[type].push({ id, name });
  }

  return Object.keys(group).length > 0 ? group : null;
}

export function normalizeMetaAttributionSpec(spec) {
  if (spec == null) {
    return null;
  }

  if (!Array.isArray(spec) || spec.length === 0) {
    throw new Error("Meta attribution spec must be a non-empty array");
  }

  const normalized = [];
  const seen = new Set();

  for (const entry of spec) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Meta attribution spec entries must be objects");
    }

    const eventType = String(entry.event_type ?? "").toUpperCase();
    const windowDays = Number(entry.window_days);
    const allowedWindows = ATTRIBUTION_WINDOWS[eventType];

    if (!allowedWindows) {
      throw new Error(
        `Unsupported Meta attribution event type: ${eventType}`
      );
    }

    if (!allowedWindows.has(windowDays)) {
      throw new Error(
        `Unsupported Meta attribution window for ${eventType}: ${windowDays}`
      );
    }

    if (seen.has(eventType)) {
      throw new Error(
        `Duplicate Meta attribution event type: ${eventType}`
      );
    }

    seen.add(eventType);
    normalized.push({
      event_type: eventType,
      window_days: windowDays,
    });
  }

  if (!seen.has("CLICK_THROUGH")) {
    throw new Error(
      "Meta attribution spec must include CLICK_THROUGH"
    );
  }

  return normalized;
}

export function buildMetaAudienceTargeting({
  countries = ["PE"],
  ageMin = 18,
  ageMax = 35,
  gender = "ALL",
  publisherPlatforms = null,
  facebookPositions = null,
  instagramPositions = null,
  advantageAudience = true,
  allowAgeExpansion = true,
  allowGenderExpansion = true,
  includedAudiences = [],
  excludedAudiences = [],
  detailedTargeting = [],
}) {
  const minAge = Number(ageMin);
  const maxAge = Number(ageMax);

  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
    throw new Error("Meta audience ages must be numbers");
  }

  if (maxAge < minAge) {
    throw new Error("Meta maximum age must be greater than or equal to minimum age");
  }

  const targeting = {
    geo_locations: {
      countries: countries.map(String),
    },
    age_min: minAge,
    age_max: maxAge,
  };

  const genders = buildGenderTargeting(gender);
  if (genders) {
    targeting.genders = genders;
  }

  if (advantageAudience) {
    // Meta's current Advantage+ audience UI treats maximum age and gender as
    // suggestions while location/minimum age remain controls. age_range is the
    // explicit age-range suggestion used by current Marketing API targeting.
    targeting.age_range = [minAge, maxAge];
    targeting.targeting_automation = {
      advantage_audience: 1,
      individual_setting: {
        age: allowAgeExpansion ? 1 : 0,
        gender: allowGenderExpansion ? 1 : 0,
      },
    };
  } else {
    targeting.targeting_automation = {
      advantage_audience: 0,
    };
  }

  const included = normalizeAudienceIds(includedAudiences);
  if (included.length > 0) {
    targeting.custom_audiences = included;

    const relaxation = buildTargetingRelaxationTypes(
      includedAudiences,
      advantageAudience
    );

    if (relaxation) {
      targeting.targeting_relaxation_types = relaxation;
    }
  }

  const excluded = normalizeAudienceIds(excludedAudiences);
  if (excluded.length > 0) {
    targeting.excluded_custom_audiences = excluded;
  }

  const flexibleGroup = buildDetailedTargetingGroup(detailedTargeting);
  if (flexibleGroup) {
    // One flexible_spec group matches Ads Manager's default "at least one"
    // detailed-targeting group. With Sales/Purchase conversion optimization,
    // Meta can expand beyond these inputs even in the specific-audience flow.
    targeting.flexible_spec = [flexibleGroup];
  }

  const normalizedPublishers = buildPublisherPlatforms(publisherPlatforms);
  if (normalizedPublishers) {
    targeting.publisher_platforms = normalizedPublishers;
  }

  const normalizedFacebookPositions = buildPlacementPositions(
    facebookPositions,
    "Facebook",
    FACEBOOK_POSITION_MAP
  );

  if (normalizedFacebookPositions?.length) {
    if (!normalizedPublishers?.includes("facebook")) {
      throw new Error(
        "Facebook positions require Facebook publisher placement"
      );
    }
    targeting.facebook_positions = normalizedFacebookPositions;
  }

  const normalizedInstagramPositions = buildPlacementPositions(
    instagramPositions,
    "Instagram",
    INSTAGRAM_POSITION_MAP
  );

  if (normalizedInstagramPositions?.length) {
    if (!normalizedPublishers?.includes("instagram")) {
      throw new Error(
        "Instagram positions require Instagram publisher placement"
      );
    }
    targeting.instagram_positions = normalizedInstagramPositions;
  }

  return targeting;
}

export async function createAdvancedMetaAdSet({
  adAccountId,
  accessToken,
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
  allowAgeExpansion = true,
  allowGenderExpansion = true,
  includedAudiences = [],
  excludedAudiences = [],
  detailedTargeting = [],
  attributionSpec = null,
  optimizationGoal = "LINK_CLICKS",
  bidStrategy = "LOWEST_COST_WITHOUT_CAP",
  bidAmount = null,
  pixelId = null,
  conversionEvent = "PURCHASE",
  status = "PAUSED",
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }
  if (!campaignId) {
    throw new Error("Missing Meta campaign ID");
  }
  if (!startTime || !endTime) {
    throw new Error("Meta ad set schedule is required");
  }

  const strategy = String(budgetStrategy).toUpperCase();
  const mode = String(budgetMode).toUpperCase();

  if (strategy !== "CAMPAIGN" && strategy !== "AD_SET") {
    throw new Error("Meta budget strategy must be CAMPAIGN or AD_SET");
  }
  if (mode !== "DAILY" && mode !== "TOTAL") {
    throw new Error("Meta budget mode must be TOTAL or DAILY");
  }
  if (optimizationGoal === "OFFSITE_CONVERSIONS" && !pixelId) {
    throw new Error("Meta pixel ID is required for conversion optimization");
  }

  const targeting = buildMetaAudienceTargeting({
    countries,
    ageMin,
    ageMax,
    gender,
    publisherPlatforms,
    facebookPositions,
    instagramPositions,
    advantageAudience,
    allowAgeExpansion,
    allowGenderExpansion,
    includedAudiences,
    excludedAudiences,
    detailedTargeting,
  });

  const normalizedAttributionSpec = normalizeMetaAttributionSpec(
    attributionSpec
  );

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

  if (normalizedAttributionSpec) {
    body.attribution_spec = JSON.stringify(
      normalizedAttributionSpec
    );
  }

  if (strategy === "AD_SET") {
    body.bid_strategy = bidStrategy;

    if (mode === "DAILY") {
      if (!dailyBudget || dailyBudget <= 0) {
        throw new Error("Meta daily budget must be greater than zero");
      }
      body.daily_budget = String(dailyBudget);
    } else {
      if (!lifetimeBudget || lifetimeBudget <= 0) {
        throw new Error("Meta lifetime budget must be greater than zero");
      }
      body.lifetime_budget = String(lifetimeBudget);
    }
  }

  if (bidAmount != null) {
    const numericBidAmount = Number(bidAmount);
    if (!Number.isFinite(numericBidAmount) || numericBidAmount <= 0) {
      throw new Error("Meta bid amount must be greater than zero");
    }
    body.bid_amount = String(Math.round(numericBidAmount));
  }

  if (optimizationGoal === "OFFSITE_CONVERSIONS") {
    body.promoted_object = JSON.stringify({
      pixel_id: pixelId,
      custom_event_type: conversionEvent,
    });
  }

  const response = await fetchImpl(
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
