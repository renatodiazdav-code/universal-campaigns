const DEFAULT_POSITIONS = ["FEED", "STORIES", "REELS"];

export function createDefaultMetaAdvancedForm() {
  return {
    audienceStrategy: "ADVANTAGE_PLUS",
    biddingStrategy: "LOWEST_COST",
    costCap: "",
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
  const placementsMode = String(
    form?.placementsMode ?? "RECOMMENDED"
  ).toUpperCase();

  const bidding = {
    strategy: biddingStrategy,
  };

  if (biddingStrategy === "COST_CAP") {
    bidding.costCap = Number(form?.costCap);
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
    bidding,
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
