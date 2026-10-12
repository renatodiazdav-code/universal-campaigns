const DEFAULT_POSITIONS = ["FEED", "STORIES", "REELS"];

function copyAudienceSelection(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((item) => item?.id && item?.name)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      subtype: item.subtype ? String(item.subtype).toUpperCase() : "UNKNOWN",
      kind:
        String(item.kind ?? item.subtype ?? "CUSTOM").toUpperCase() ===
        "LOOKALIKE"
          ? "LOOKALIKE"
          : "CUSTOM",
    }));
}

function copyDetailedTargeting(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((item) => item?.id && item?.name && item?.type)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      type: String(item.type).toLowerCase(),
      path: Array.isArray(item.path) ? item.path.map(String) : [],
    }));
}

export function createDefaultMetaAdvancedForm() {
  return {
    audienceStrategy: "ADVANTAGE_PLUS",
    includedAudiences: [],
    excludedAudiences: [],
    detailedTargeting: [],
    biddingStrategy: "LOWEST_COST",
    costCap: "",
    attributionMode: "AUTO",
    clickAttributionDays: "7",
    viewAttributionDays: "1",
    engagedViewAttributionDays: "1",
    placementsMode: "RECOMMENDED",
    facebookPositions: [...DEFAULT_POSITIONS],
    instagramPositions: [...DEFAULT_POSITIONS],
  };
}

export function buildMetaOverridesFromForm(form) {
  const audienceStrategy = String(
    form?.audienceStrategy ?? "ADVANTAGE_PLUS"
  ).toUpperCase();
  const biddingStrategy = String(
    form?.biddingStrategy ?? "LOWEST_COST"
  ).toUpperCase();
  const attributionMode = String(
    form?.attributionMode ?? "AUTO"
  ).toUpperCase();
  const placementsMode = String(
    form?.placementsMode ?? "RECOMMENDED"
  ).toUpperCase();

  const audience = {
    mode:
      audienceStrategy === "MANUAL"
        ? "SPECIFIC"
        : "ADVANTAGE_PLUS",
    includedAudiences: copyAudienceSelection(
      form?.includedAudiences
    ),
    excludedAudiences: copyAudienceSelection(
      form?.excludedAudiences
    ),
    detailedTargeting: copyDetailedTargeting(
      form?.detailedTargeting
    ),
  };

  const bidding = {
    strategy: biddingStrategy,
  };

  if (biddingStrategy === "COST_CAP") {
    bidding.costCap = Number(form?.costCap);
  }

  const attribution = {
    mode: attributionMode,
  };

  if (attributionMode === "STANDARD") {
    attribution.clickWindowDays = Number(
      form?.clickAttributionDays ?? 7
    );
    attribution.viewWindowDays = Number(
      form?.viewAttributionDays ?? 1
    );
    attribution.engagedViewWindowDays = Number(
      form?.engagedViewAttributionDays ?? 1
    );
  }

  const placements = {
    mode: placementsMode,
  };

  if (placementsMode === "MANUAL") {
    placements.facebook = [...(form?.facebookPositions ?? [])];
    placements.instagram = [...(form?.instagramPositions ?? [])];
  }

  return {
    audienceStrategy,
    audience,
    bidding,
    attribution,
    placements,
  };
}

export function resolveEffectiveMetaPublishers({
  metaEnabled,
  facebookEnabled,
  instagramEnabled,
  form,
}) {
  if (!metaEnabled) {
    return {
      enabled: false,
      facebook: false,
      instagram: false,
    };
  }

  const placementsMode = String(
    form?.placementsMode ?? "RECOMMENDED"
  ).toUpperCase();

  if (placementsMode !== "MANUAL") {
    return {
      enabled: true,
      facebook: Boolean(facebookEnabled),
      instagram: Boolean(instagramEnabled),
    };
  }

  return {
    enabled: true,
    facebook:
      Boolean(facebookEnabled) &&
      Array.isArray(form?.facebookPositions) &&
      form.facebookPositions.length > 0,
    instagram:
      Boolean(instagramEnabled) &&
      Array.isArray(form?.instagramPositions) &&
      form.instagramPositions.length > 0,
  };
}

export function validateMetaAdvancedForm(form, { metaEnabled = true } = {}) {
  if (!metaEnabled) {
    return {
      valid: true,
      error: null,
    };
  }

  const audienceStrategy = String(
    form?.audienceStrategy ?? "ADVANTAGE_PLUS"
  ).toUpperCase();

  if (
    audienceStrategy !== "ADVANTAGE_PLUS" &&
    audienceStrategy !== "MANUAL"
  ) {
    return {
      valid: false,
      error: "Choose a valid Meta audience delivery mode.",
    };
  }

  const biddingStrategy = String(
    form?.biddingStrategy ?? "LOWEST_COST"
  ).toUpperCase();

  if (biddingStrategy === "COST_CAP") {
    const costCap = Number(form?.costCap);

    if (!Number.isFinite(costCap) || costCap <= 0) {
      return {
        valid: false,
        error: "Cost cap must be greater than 0.",
      };
    }
  }

  const attributionMode = String(
    form?.attributionMode ?? "AUTO"
  ).toUpperCase();

  if (attributionMode !== "AUTO" && attributionMode !== "STANDARD") {
    return {
      valid: false,
      error: "Choose a valid Meta attribution mode.",
    };
  }

  if (attributionMode === "STANDARD") {
    const clickWindowDays = Number(form?.clickAttributionDays ?? 7);
    const viewWindowDays = Number(form?.viewAttributionDays ?? 1);
    const engagedViewWindowDays = Number(
      form?.engagedViewAttributionDays ?? 1
    );

    if (![1, 7].includes(clickWindowDays)) {
      return {
        valid: false,
        error: "Click attribution must be 1 or 7 days.",
      };
    }

    if (![0, 1].includes(viewWindowDays)) {
      return {
        valid: false,
        error: "View attribution must be off or 1 day.",
      };
    }

    if (![0, 1].includes(engagedViewWindowDays)) {
      return {
        valid: false,
        error: "Engaged-view attribution must be off or 1 day.",
      };
    }
  }

  const placementsMode = String(
    form?.placementsMode ?? "RECOMMENDED"
  ).toUpperCase();

  if (placementsMode === "MANUAL") {
    const totalSelected =
      (form?.facebookPositions?.length ?? 0) +
      (form?.instagramPositions?.length ?? 0);

    if (totalSelected === 0) {
      return {
        valid: false,
        error: "Select at least one Facebook or Instagram placement.",
      };
    }
  }

  return {
    valid: true,
    error: null,
  };
}
