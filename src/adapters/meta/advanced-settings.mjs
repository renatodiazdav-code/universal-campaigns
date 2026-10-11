const AUDIENCE_STRATEGIES = new Set([
  "ADVANTAGE_PLUS",
  "MANUAL",
]);

const BIDDING_STRATEGIES = new Set([
  "LOWEST_COST",
  "COST_CAP",
]);

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

export function resolveMetaAdvancedSettings(overrides = {}) {
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
  };
}
