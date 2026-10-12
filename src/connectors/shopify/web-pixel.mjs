import { normalizeShopDomain, shopifyFetch, ShopifyError, SHOPIFY_API_VERSION } from "./client.mjs";

function buildShopifyGraphqlUrl(shop) {
  if (!shop?.trim()) {
    throw new Error("Missing Shopify shop");
  }

  return `https://${normalizeShopDomain(shop)}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

function classifyGraphqlErrors(errors = []) {
  const message = errors
    .map((error) => error?.message)
    .filter(Boolean)
    .join(" | ");

  if (/read_pixels|access denied/i.test(message)) {
    return {
      status: "MISSING_SCOPE",
      hasAccess: false,
      webPixel: null,
      error: message || "Shopify Web Pixel access is not available",
    };
  }

  if (/no web pixel was found for this app/i.test(message)) {
    return {
      status: "NOT_CONFIGURED",
      hasAccess: true,
      webPixel: null,
      error: null,
    };
  }

  return {
    status: "ERROR",
    hasAccess: false,
    webPixel: null,
    error: message || "Shopify Web Pixel query failed",
  };
}

export async function inspectShopifyWebPixelAccess({
  shop,
  accessToken,
  fetchImpl = fetch,
}) {
  if (!accessToken) {
    throw new Error("Missing Shopify access token");
  }

  const query = `
    query RelayWebPixelProbe {
      webPixel {
        id
        settings
      }
    }
  `;

  const response = await shopifyFetch(
    buildShopifyGraphqlUrl(shop),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    },
    fetchImpl
  );

  if (response.status === 401) throw new ShopifyError("Reconnect Shopify to restore access.", 409, "REAUTHORIZE");
  if (!response.ok) {
    throw new ShopifyError("Could not inspect Shopify tracking capabilities. Try again shortly.", response.status === 429 || response.status >= 500 ? 503 : 502);
  }
  const result = await response.json();

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return classifyGraphqlErrors(result.errors);
  }

  const webPixel = result.data?.webPixel ?? null;

  return {
    status: webPixel ? "CONFIGURED" : "NOT_CONFIGURED",
    hasAccess: true,
    webPixel,
    error: null,
  };
}
