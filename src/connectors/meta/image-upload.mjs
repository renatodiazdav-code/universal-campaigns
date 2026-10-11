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

export async function uploadMetaAdImage({
  adAccountId,
  accessToken,
  file,
}) {
  if (!accessToken) {
    throw new Error("Missing Meta access token");
  }

  if (!file) {
    throw new Error("Image file is required");
  }

  if (
    file.type &&
    !String(file.type).toLowerCase().startsWith("image/")
  ) {
    throw new Error("Uploaded file must be an image");
  }

  const body = new FormData();
  body.append("source", file, file.name || "relay-image");
  body.append("access_token", accessToken);

  const response = await fetch(
    `${META_GRAPH_URL}/${getAdAccountNodeId(adAccountId)}/adimages`,
    {
      method: "POST",
      body,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta image upload failed: ${JSON.stringify(result)}`
    );
  }

  const uploadedImage = Object.values(result.images ?? {})[0] ?? null;

  if (!uploadedImage?.hash) {
    throw new Error("Meta image upload did not return an image hash");
  }

  return {
    hash: String(uploadedImage.hash),
    url: uploadedImage.url ?? null,
    raw: result,
  };
}
