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

export async function uploadMetaAdVideo({
  adAccountId,
  accessToken,
  file,
  title = "Relay video creative",
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  if (!file) {
    throw new Error("Video file is required");
  }

  if (
    file.type &&
    !String(file.type).toLowerCase().startsWith("video/")
  ) {
    throw new Error("Uploaded file must be a video");
  }

  const body = new FormData();
  body.append("source", file, file.name || "relay-video");
  body.append("title", title);
  body.append("access_token", accessToken);

  const response = await fetch(
    `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/advideos`,
    {
      method: "POST",
      body,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta video upload failed: ${JSON.stringify(result)}`
    );
  }

  if (!result.id) {
    throw new Error("Meta video upload did not return a video ID");
  }

  return {
    id: String(result.id),
    raw: result,
  };
}
