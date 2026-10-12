const AUDIENCE_STRATEGIES = new Set([
  "ADVANTAGE_PLUS",
  "MANUAL",
]);

const BIDDING_STRATEGIES = new Set([
  "LOWEST_COST",
  "COST_CAP",
]);

const PLACEMENT_MODES = new Set([
  "RECOMMENDED",
  "MANUAL",
]);

const PLACEMENT_POSITIONS = new Set([
  "FEED",
  "STORIES",
  "REELS",
]);

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

const RECOMMENDED_POSITIONS = [
  "FEED",
  "STORIES",
  "REELS",
];

function normalizeObject(value, label) {
  if (value == null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function toPositiveNumber(value, label) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }

  return number;
}

function normalizeAudienceList(value, label) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  const normalized = [];
  const seen = new Set();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label} entries must be objects`);
    }

    const id = String(item.id ?? "").trim();
    const name = String(item.name ?? "").trim();

    if (!id || !name) {
      throw new Error(`${label} entries need an id and name`);
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    const subtype = String(item.subtype ?? "UNKNOWN").toUpperCase();

    normalized.push({
      id,
      name,
      subtype,
      kind:
        String(item.kind ?? subtype).toUpperCase() === "LOOKALIKE"
          ? "LOOKALIKE"
          : "CUSTOM",
    });
  }

  return normalized;
}

function normalizeDetailedTargeting(value) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("Meta detailed targeting must be an array");
  }

  const normalized = [];
  const seen = new Set();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Meta detailed targeting entries must be objects");
    }

    const id = String(item.id ?? "").trim();
    const name = String(item.name ?? "").trim();
    const type = String(item.type ?? "").toLowerCase();

    if (!id || !name || !type) {
      throw new Error(
        "Meta detailed targeting entries need an id, name and type"
      );
    }

    if (!DETAILED_TARGETING_TYPES.has(type)) {
      throw new Error(`Unsupported Meta detailed targeting type: ${type}`);
    }

    const key = `${type}:${id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      id,
      name,
      type,
      path: Array.isArray(item.path) ? item.path.map(String) : [],
    });
  }

  return normalized;
}

function resolveMetaAudience(metaOverrides, audienceStrategy) {
  const audienceInput = normalizeObject(
    metaOverrides.audience,
    "Meta audience"
  );

  const mode =
    audienceStrategy === "MANUAL"
      ? "SPECIFIC"
      : "ADVANTAGE_PLUS";

  return {
    strategy: audienceStrategy,
    mode,
    advantageAudience: audienceStrategy === "ADVANTAGE_PLUS",
    // In Meta's Advantage+ flow, maximum age and gender are suggestions.
    // In the specific-audience flow they are restrictions. Location and
    // minimum age remain campaign controls either way.
    allowAgeExpansion: audienceStrategy === "ADVANTAGE_PLUS",
    allowGenderExpansion: audienceStrategy === "ADVANTAGE_PLUS",
    includedAudiences: normalizeAudienceList(
      audienceInput.includedAudiences,
      "Meta included audiences"
    ),
    excludedAudiences: normalizeAudienceList(
      audienceInput.excludedAudiences,
      "Meta excluded audiences"
    ),
    detailedTargeting: normalizeDetailedTargeting(
      audienceInput.detailedTargeting
    ),
  };
}

function normalizePlacementPositions(value, label) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} placements must be an array`);
  }

  const normalized = value.map((position) =>
    String(position).toUpperCase()
  );

  for (const position of normalized) {
    if (!PLACEMENT_POSITIONS.has(position)) {
      throw new Error(
        `Unsupported ${label} placement: ${position}`
      );
    }
  }

  return [...new Set(normalized)];
}

function resolveMetaPlacements(
  metaOverrides,
  {
    facebookEnabled = true,
    instagramEnabled = true,
  } = {}
) {
  const placementsInput = normalizeObject(
    metaOverrides.placements,
    "Meta placements"
  );

  const mode = String(
    placementsInput.mode ?? "RECOMMENDED"
  ).toUpperCase();

  if (!PLACEMENT_MODES.has(mode)) {
    throw new Error(
      `Unsupported Meta placement mode: ${mode}`
    );
  }

  let facebook = [];
  let instagram = [];

  if (mode === "RECOMMENDED") {
    facebook = facebookEnabled
      ? [...RECOMMENDED_POSITIONS]
      : [];
    instagram = instagramEnabled
      ? [...RECOMMENDED_POSITIONS]
      : [];
  } else {
    facebook = normalizePlacementPositions(
      placementsInput.facebook,
      "Facebook"
    );
    instagram = normalizePlacementPositions(
      placementsInput.instagram,
      "Instagram"
    );

    if (!facebookEnabled && facebook.length > 0) {
      throw new Error(
        "Facebook placements cannot be selected when Facebook is disabled"
      );
    }

    if (!instagramEnabled && instagram.length > 0) {
      throw new Error(
        "Instagram placements cannot be selected when Instagram is disabled"
      );
    }
  }

  const publisherPlatforms = [];

  if (facebook.length > 0) {
    publisherPlatforms.push("FACEBOOK");
  }

  if (instagram.length > 0) {
    publisherPlatforms.push("INSTAGRAM");
  }

  if (publisherPlatforms.length === 0) {
    throw new Error(
      "At least one Facebook or Instagram placement must be selected"
    );
  }

  return {
    mode,
    publisherPlatforms,
    facebook,
    instagram,
  };
}

function resolveMetaCreativeAdaptation() {
  return {
    mode: "AUTOMATIC",
    adaptToPlacement: true,
    imageAutoCrop: true,
    videoAutoCrop: true,
    generativeExpansion: false,
  };
}

export function resolveMetaAdvancedSettings(
  overrides = {},
  platformContext = {}
) {
  const metaOverrides = normalizeObject(
    overrides,
    "Meta overrides"
  );

  const audienceStrategy = String(
    metaOverrides.audienceStrategy ?? "ADVANTAGE_PLUS"
  ).toUpperCase();

  if (!AUDIENCE_STRATEGIES.has(audienceStrategy)) {
    throw new Error(
      `Unsupported Meta audience strategy: ${audienceStrategy}`
    );
  }

  const biddingInput = normalizeObject(
    metaOverrides.bidding,
    "Meta bidding"
  );

  const biddingStrategy = String(
    biddingInput.strategy ?? "LOWEST_COST"
  ).toUpperCase();

  if (!BIDDING_STRATEGIES.has(biddingStrategy)) {
    throw new Error(
      `Unsupported Meta bidding strategy: ${biddingStrategy}`
    );
  }

  let costCap = null;

  if (biddingStrategy === "COST_CAP") {
    costCap = toPositiveNumber(
      biddingInput.costCap,
      "Meta cost cap"
    );
  } else if (biddingInput.costCap != null) {
    throw new Error(
      "Meta cost cap can only be used with COST_CAP"
    );
  }

  return {
    audience: resolveMetaAudience(
      metaOverrides,
      audienceStrategy
    ),

    bidding: {
      strategy: biddingStrategy,
      apiStrategy:
        biddingStrategy === "COST_CAP"
          ? "COST_CAP"
          : "LOWEST_COST_WITHOUT_CAP",
      costCap,
    },

    placements: resolveMetaPlacements(
      metaOverrides,
      platformContext
    ),

    // Relay owns this preset in the MVP. We adapt the uploaded creative
    // to the selected placements without silently removing placements.
    creativeAdaptation: resolveMetaCreativeAdaptation(),
  };
}
