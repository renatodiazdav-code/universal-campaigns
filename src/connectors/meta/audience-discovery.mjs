const META_API_VERSION = "v26.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export const META_DETAILED_TARGETING_TYPES = Object.freeze([
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

const META_DETAILED_TARGETING_TYPE_SET = new Set(
  META_DETAILED_TARGETING_TYPES
);

export const META_TARGETING_BROWSE_GROUPS = Object.freeze({
  INTERESTS: ["interests"],
  BEHAVIORS: ["behaviors"],
  DEMOGRAPHICS: [
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
  ],
});

const TARGETING_RESULT_FIELDS = [
  "id",
  "name",
  "type",
  "path",
  "description",
  "audience_size_lower_bound",
  "audience_size_upper_bound",
].join(",");

function getAdAccountNodeId(adAccountId) {
  if (!adAccountId) {
    throw new Error("Missing Meta ad account ID");
  }

  return String(adAccountId).startsWith("act_")
    ? String(adAccountId)
    : `act_${adAccountId}`;
}

async function readMetaJson(url, fetchImpl) {
  const response = await fetchImpl(url);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta audience discovery failed: ${JSON.stringify(result)}`
    );
  }

  return result;
}

function normalizeExistingAudience(audience) {
  if (!audience?.id || !audience?.name) {
    return null;
  }

  const subtype = String(audience.subtype ?? "UNKNOWN").toUpperCase();

  return {
    id: String(audience.id),
    name: String(audience.name),
    subtype,
    kind: subtype === "LOOKALIKE" ? "LOOKALIKE" : "CUSTOM",
    description: audience.description ?? null,
    approximateCountLowerBound:
      audience.approximate_count_lower_bound ?? null,
    approximateCountUpperBound:
      audience.approximate_count_upper_bound ?? null,
    deliveryStatus: audience.delivery_status ?? null,
    operationStatus: audience.operation_status ?? null,
  };
}

function normalizeTargetingOption(option) {
  if (!option?.id || !option?.name || !option?.type) {
    return null;
  }

  const type = String(option.type).toLowerCase();

  if (!META_DETAILED_TARGETING_TYPE_SET.has(type)) {
    return null;
  }

  return {
    id: String(option.id),
    name: String(option.name),
    type,
    path: Array.isArray(option.path)
      ? option.path.map(String)
      : option.path
        ? [String(option.path)]
        : [],
    description: option.description ?? null,
    audienceSizeLowerBound:
      option.audience_size_lower_bound ?? null,
    audienceSizeUpperBound:
      option.audience_size_upper_bound ?? null,
  };
}

export async function listMetaExistingAudiences({
  adAccountId,
  accessToken,
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const params = new URLSearchParams({
    fields: [
      "id",
      "name",
      "subtype",
      "description",
      "delivery_status",
      "operation_status",
      "approximate_count_lower_bound",
      "approximate_count_upper_bound",
    ].join(","),
    limit: "200",
    access_token: accessToken,
  });

  const result = await readMetaJson(
    `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/customaudiences?${params}`,
    fetchImpl
  );

  return (result.data ?? [])
    .map(normalizeExistingAudience)
    .filter(Boolean);
}

export async function searchMetaDetailedTargeting({
  adAccountId,
  accessToken,
  query,
  countries = [],
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const q = String(query ?? "").trim();

  if (q.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q,
    objective: "OUTCOME_SALES",
    optimization_goal: "OFFSITE_CONVERSIONS",
    whitelisted_types: JSON.stringify(META_DETAILED_TARGETING_TYPES),
    fields: TARGETING_RESULT_FIELDS,
    limit: "50",
    access_token: accessToken,
  });

  if (Array.isArray(countries) && countries.length > 0) {
    params.set("countries", JSON.stringify(countries.map(String)));
  }

  const result = await readMetaJson(
    `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/targetingsearch?${params}`,
    fetchImpl
  );

  return (result.data ?? [])
    .map(normalizeTargetingOption)
    .filter(Boolean);
}

export async function browseMetaDetailedTargeting({
  adAccountId,
  accessToken,
  group,
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const normalizedGroup = String(group ?? "").toUpperCase();
  const whitelistedTypes = META_TARGETING_BROWSE_GROUPS[normalizedGroup];

  if (!whitelistedTypes) {
    throw new Error(`Unsupported Meta targeting browse group: ${group}`);
  }

  const params = new URLSearchParams({
    optimization_goal: "OFFSITE_CONVERSIONS",
    whitelisted_types: JSON.stringify(whitelistedTypes),
    fields: TARGETING_RESULT_FIELDS,
    limit: "100",
    access_token: accessToken,
  });

  const result = await readMetaJson(
    `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/targetingbrowse?${params}`,
    fetchImpl
  );

  return (result.data ?? [])
    .map(normalizeTargetingOption)
    .filter(Boolean);
}
