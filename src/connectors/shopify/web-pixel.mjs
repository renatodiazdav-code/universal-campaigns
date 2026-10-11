const SHOPIFY_API_VERSION = "2026-10";

function buildShopifyGraphqlUrl(shop) {
  if (!shop?.trim()) {
    throw new Error("Missing Shopify shop");
  }

  return `https://${shop}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
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

  const response = await fetchImpl(
    buildShopifyGraphqlUrl(shop),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify Web Pixel request failed: ${response.status} ${JSON.stringify(result)}`
    );
  }

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
