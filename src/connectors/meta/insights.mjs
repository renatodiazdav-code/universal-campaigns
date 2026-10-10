const META_API_VERSION = "v26.0";
const META_GRAPH_URL =
  `https://graph.facebook.com/${META_API_VERSION}`;

const DEFAULT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "spend",
  "impressions",
  "clicks",
  "actions",
  "action_values",
  "account_currency",
  "date_start",
  "date_stop",
].join(",");

export async function getMetaCampaignInsights({
  campaignId,
  accessToken,
  datePreset = "maximum",
  breakdowns = [],
  fetchImpl = fetch,
}) {
  if (!campaignId) {
    throw new Error("Missing Meta campaign ID");
  }

  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const params = new URLSearchParams({
    fields: DEFAULT_FIELDS,
    date_preset: datePreset,
    action_report_time: "conversion",
    access_token: accessToken,
  });

  if (breakdowns.length > 0) {
    params.set(
      "breakdowns",
      breakdowns.join(",")
    );
  }

  const response = await fetchImpl(
    `${META_GRAPH_URL}/${campaignId}/insights?${params}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta campaign insights failed: ${JSON.stringify(result)}`
    );
  }

  return result.data ?? [];
}
