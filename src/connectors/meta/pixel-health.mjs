const META_API_VERSION = "v26.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

function requirePixelId(pixelId) {
  if (!pixelId) {
    throw new Error("Missing Meta pixel ID");
  }

  return String(pixelId);
}

function toUnixSeconds(value, label) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}`);
  }

  return Math.floor(date.getTime() / 1000);
}

export async function getMetaPixelDetails({
  pixelId,
  accessToken,
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const id = requirePixelId(pixelId);
  const params = new URLSearchParams({
    fields: "id,name,last_fired_time",
    access_token: accessToken,
  });

  const response = await fetchImpl(
    `${META_GRAPH_URL}/${id}?${params}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta get pixel details failed: ${JSON.stringify(result)}`
    );
  }

  return result;
}

export async function getMetaPixelEventStats({
  pixelId,
  accessToken,
  event = "Purchase",
  startTime,
  endTime,
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  const id = requirePixelId(pixelId);

  if (!event?.trim()) {
    throw new Error("Meta pixel event name is required");
  }

  const params = new URLSearchParams({
    aggregation: "event",
    event: event.trim(),
    start_time: String(toUnixSeconds(startTime, "pixel stats start time")),
    end_time: String(toUnixSeconds(endTime, "pixel stats end time")),
    access_token: accessToken,
  });

  const response = await fetchImpl(
    `${META_GRAPH_URL}/${id}/stats?${params}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta get pixel event stats failed: ${JSON.stringify(result)}`
    );
  }

  return result.data ?? [];
}
