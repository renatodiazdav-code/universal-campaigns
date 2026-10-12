import { createDefaultMetaAdvancedForm, buildMetaOverridesFromForm } from "./meta-advanced-form.mjs";

const GROUPS = {
  audience: ["audienceStrategy", "includedAudiences", "excludedAudiences", "detailedTargeting"],
  bidding: ["biddingStrategy", "costCap"],
  attribution: ["attributionMode", "clickAttributionDays", "viewAttributionDays", "engagedViewAttributionDays"],
  placements: ["placementsMode", "facebookPositions", "instagramPositions"],
};

export function createMetaSettingsState() {
  return { form: createDefaultMetaAdvancedForm(), customized: {} };
}

export function resolveMetaSettingsForm(state, shared) {
  const form = { ...state.form };
  if (!state.customized.audience) form.audienceStrategy = shared.audienceMode === "SPECIFIC" ? "MANUAL" : "ADVANTAGE_PLUS";
  if (!state.customized.bidding) {
    form.biddingStrategy = shared.biddingStrategy;
    form.costCap = shared.costCap;
  }
  return form;
}

export function updateMetaSettingsState(state, update, shared) {
  const current = resolveMetaSettingsForm(state, shared);
  const form = typeof update === "function" ? update(current) : update;
  const customized = { ...state.customized };
  for (const [group, fields] of Object.entries(GROUPS)) {
    if (fields.some((key) => JSON.stringify(form[key]) !== JSON.stringify(current[key]))) customized[group] = true;
  }
  return { form, customized };
}

export function buildScopedMetaOverrides(state, shared) {
  const all = buildMetaOverridesFromForm(resolveMetaSettingsForm(state, shared));
  const result = {};
  if (state.customized.audience) {
    result.audienceStrategy = all.audienceStrategy;
    result.audience = all.audience;
  }
  for (const group of ["bidding", "attribution", "placements"]) {
    if (state.customized[group]) result[group] = all[group];
  }
  return result;
}

export function universalSettingsFromForm(form) {
  return {
    audience: { mode: form.audienceMode },
    bidding: {
      strategy: form.biddingStrategy,
      ...(form.biddingStrategy === "COST_CAP" ? { costCap: Number(form.costCap) } : {}),
    },
  };
}

export function combinePlatformOverrides(sharedFields, nativeSettings) {
  return {
    ...sharedFields, ...nativeSettings,
    ...(sharedFields.audience || nativeSettings.audience ? {
      audience: { ...nativeSettings.audience, ...sharedFields.audience },
    } : {}),
  };
}
