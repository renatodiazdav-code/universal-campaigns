const PLATFORMS = new Set(["meta", "tiktok"]);
const AUDIENCE_FIELDS = ["countries", "ageMin", "ageMax", "gender"];
const CREATIVE_FIELDS = ["primaryText", "headline", "destinationUrl", "callToAction"];
const CTAS = new Set(["SHOP_NOW", "LEARN_MORE", "GET_OFFER", "SIGN_UP"]);

function object(value, label) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function selectedFields(source, fields) {
  return Object.fromEntries(fields.filter((key) => Object.hasOwn(source, key))
    .map((key) => [key, source[key]]));
}

export function normalizeUniversalSettings(value) {
  const input = object(value, "Universal settings");
  const audience = object(input.audience, "Universal audience settings");
  const bidding = object(input.bidding, "Universal bidding settings");
  const mode = String(audience.mode ?? "AUTO").toUpperCase();
  const strategy = String(bidding.strategy ?? "LOWEST_COST").toUpperCase();
  if (!["AUTO", "SPECIFIC"].includes(mode)) {
    throw new Error("Audience delivery must be automatic or specific");
  }
  if (!["LOWEST_COST", "COST_CAP"].includes(strategy)) {
    throw new Error("Choose a supported bidding strategy");
  }
  const costCap = strategy === "COST_CAP" ? Number(bidding.costCap) : null;
  if (strategy === "COST_CAP" && (!Number.isFinite(costCap) || costCap <= 0)) {
    throw new Error("Target cost per purchase must be greater than 0");
  }
  return { audience: { mode }, bidding: { strategy, costCap } };
}

export function normalizeCampaignAudience(value, label = "Audience") {
  const audience = object(value, label);
  if (!Array.isArray(audience.countries) || audience.countries.length === 0 ||
      audience.countries.some((country) => typeof country !== "string" || !/^[A-Za-z]{2}$/.test(country))) {
    throw new Error(`${label}: choose at least one valid country`);
  }
  const ageMin = Number(audience.ageMin ?? 18);
  const ageMax = audience.ageMax == null ? null : Number(audience.ageMax);
  if (!Number.isInteger(ageMin) || ageMin < 18 || ageMin > 65 ||
      (ageMax !== null && (!Number.isInteger(ageMax) || ageMax < ageMin || ageMax > 65))) {
    throw new Error(`${label}: ages must be between 18 and 65, with maximum age at least minimum age`);
  }
  const gender = String(audience.gender ?? "ALL").toUpperCase();
  if (!["ALL", "MALE", "FEMALE"].includes(gender)) {
    throw new Error(`${label}: choose a valid gender`);
  }
  return {
    countries: [...new Set(audience.countries.map((country) => country.toUpperCase()))],
    ageMin, ageMax, gender,
  };
}

// Shared fields inherit independently. Native options remain in each adapter.
// Budgets always come from the validated allocation, never from overrides.
export function resolvePlatformConfiguration(campaign, platform) {
  if (!PLATFORMS.has(platform)) throw new Error("Unknown advertising platform");
  const label = platform === "meta" ? "Meta" : "TikTok";
  const overrides = object(campaign.overrides?.[platform], `${label} overrides`);
  if (Object.hasOwn(overrides, "budget")) {
    throw new Error(`${label}: change the shared budget distribution instead of overriding the budget`);
  }
  const audienceOverride = object(overrides.audience, `${label} audience`);
  const creativeOverride = object(overrides.creative, `${label} creative`);
  for (const key of Object.keys(creativeOverride)) {
    if (!CREATIVE_FIELDS.includes(key)) throw new Error(`${label}: unsupported creative override ${key}`);
    if (typeof creativeOverride[key] !== "string") throw new Error(`${label}: ${key} must be text`);
  }
  const audience = normalizeCampaignAudience({
    ...campaign.audience, ...selectedFields(audienceOverride, AUDIENCE_FIELDS),
  }, `${label} audience`);
  const creative = { ...campaign.creative, ...selectedFields(creativeOverride, CREATIVE_FIELDS) };
  creative.callToAction = String(creative.callToAction ?? "SHOP_NOW").toUpperCase();
  if (!CTAS.has(creative.callToAction)) throw new Error(`${label}: choose a supported call to action`);
  if (Object.hasOwn(creativeOverride, "destinationUrl")) {
    let url;
    try { url = new URL(creative.destinationUrl); } catch { /* handled below */ }
    if (!url || !["https:", "http:"].includes(url.protocol)) {
      throw new Error(`${label}: destination must be a valid website URL`);
    }
  }
  const shared = normalizeUniversalSettings(campaign.settings);
  const mode = platform === "meta" && overrides.audienceStrategy != null
    ? overrides.audienceStrategy === "MANUAL" ? "SPECIFIC" : "AUTO"
    : overrides.audienceMode ?? shared.audience.mode;
  const settings = normalizeUniversalSettings({
    audience: { mode },
    bidding: overrides.bidding ?? shared.bidding,
  });
  return { audience, creative, settings, overrides };
}
