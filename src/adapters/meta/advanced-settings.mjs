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
    audience: {
      strategy: audienceStrategy,
      advantageAudience:
        audienceStrategy === "ADVANTAGE_PLUS",
      // Basic age and gender remain hard limits in Relay.
      allowAgeExpansion: false,
      allowGenderExpansion: false,
    },

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
