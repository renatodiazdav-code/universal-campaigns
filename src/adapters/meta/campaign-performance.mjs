const PURCHASE_ACTION_TYPES = [
  "offsite_conversion.fb_pixel_purchase",
  "purchase",
  "omni_purchase",
  "onsite_conversion.purchase",
];

const PUBLISHER_PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
};

const PUBLISHER_PLATFORM_ORDER = [
  "facebook",
  "instagram",
  "messenger",
  "audience_network",
];

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getPreferredActionValue(stats) {
  if (!Array.isArray(stats)) {
    return null;
  }

  for (const actionType of PURCHASE_ACTION_TYPES) {
    const match = stats.find(
      (item) => item?.action_type === actionType
    );

    if (!match || match.value == null) {
      continue;
    }

    const value = Number(match.value);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function normalizeMetaCampaignInsights(insights) {
  const row = Array.isArray(insights)
    ? insights[0]
    : insights;

  if (!row) {
    return {
      spend: 0,
      sales: 0,
      revenue: 0,
      costPerSale: null,
      roas: null,
      impressions: 0,
      clicks: 0,
      currency: null,
      dateStart: null,
      dateStop: null,
    };
  }

  const spend = toFiniteNumber(row.spend);
  const sales =
    getPreferredActionValue(row.actions) ?? 0;

  const purchaseValue =
    getPreferredActionValue(row.action_values);

  const revenue =
    purchaseValue ?? (sales === 0 ? 0 : null);

  return {
    spend,
    sales,
    revenue,
    costPerSale:
      sales > 0
        ? spend / sales
        : null,
    roas:
      spend > 0 && revenue != null
        ? revenue / spend
        : null,
    impressions: toFiniteNumber(row.impressions),
    clicks: toFiniteNumber(row.clicks),
    currency: row.account_currency ?? null,
    dateStart: row.date_start ?? null,
    dateStop: row.date_stop ?? null,
  };
}

export function normalizeMetaPublisherBreakdown(insights) {
  if (!Array.isArray(insights)) {
    return [];
  }

  return insights
    .filter((row) => row?.publisher_platform)
    .map((row) => ({
      id: row.publisher_platform,
      name:
        PUBLISHER_PLATFORM_LABELS[
          row.publisher_platform
        ] ?? row.publisher_platform,
      metrics: normalizeMetaCampaignInsights(row),
    }))
    .sort((a, b) => {
      const aIndex =
        PUBLISHER_PLATFORM_ORDER.indexOf(a.id);
      const bIndex =
        PUBLISHER_PLATFORM_ORDER.indexOf(b.id);

      const safeA = aIndex === -1
        ? Number.MAX_SAFE_INTEGER
        : aIndex;
      const safeB = bIndex === -1
        ? Number.MAX_SAFE_INTEGER
        : bIndex;

      return safeA - safeB;
    });
}
