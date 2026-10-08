export async function discoverMetaSalesSetup(meta, {
  adAccountId,
}) {
  if (!adAccountId) {
    throw new Error("Missing Meta ad account ID");
  }

  const pixels = await meta.getAdAccountPixels(adAccountId);

  if (pixels.length === 0) {
    return {
      status: "NO_PIXEL",
      pixels: [],
    };
  }

  if (pixels.length === 1) {
    return {
      status: "READY",
      pixel: pixels[0],
    };
  }

  return {
    status: "NEEDS_PIXEL_SELECTION",
    pixels,
  };
}