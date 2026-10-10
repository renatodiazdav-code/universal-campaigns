const META_API_VERSION = "v26.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

function getAdAccountNodeId(adAccountId) {
  if (!adAccountId) {
    throw new Error("Missing Meta ad account ID");
  }

  return String(adAccountId).startsWith("act_")
    ? String(adAccountId)
    : `act_${adAccountId}`;
}

export async function getMetaInstagramAccounts({
  adAccountId,
  accessToken,
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const params = new URLSearchParams({
    fields: "id,username,name",
    access_token: accessToken,
  });

  const response = await fetchImpl(
    `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/instagram_accounts?${params}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta get Instagram accounts failed: ${JSON.stringify(result)}`
    );
  }

  return result.data ?? [];
}
