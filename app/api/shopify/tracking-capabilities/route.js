import { getDevShopifyAccessToken } from "../../../../src/connectors/shopify/dev-auth.mjs";
import { inspectShopifyWebPixelAccess } from "../../../../src/connectors/shopify/web-pixel.mjs";

export async function GET() {
  try {
    const shop = process.env.SHOPIFY_SHOP;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!shop || !clientId || !clientSecret) {
      return Response.json(
        {
          version: 1,
          status: "NOT_CONNECTED",
          error: "Missing Shopify environment variables",
        },
        { status: 500 }
      );
    }

    const tokenData = await getDevShopifyAccessToken({
      shop,
      clientId,
      clientSecret,
    });

    const webPixel = await inspectShopifyWebPixelAccess({
      shop,
      accessToken: tokenData.access_token,
    });

    return Response.json({
      version: 1,
      status: "DIAGNOSTIC",
      shop,
      webPixel,
      capabilities: {
        canInspectRelayWebPixel: webPixel.hasAccess,
        canConfirmMetaSalesChannelTracking: false,
      },
      note:
        "This probe only checks Relay's Shopify Web Pixel API access. Relay does not treat it as proof that the Meta/Facebook sales-channel pixel is configured.",
    });
  } catch (error) {
    console.error("Shopify tracking capability probe error:", error);

    return Response.json(
      {
        version: 1,
        status: "ERROR",
        error:
          error.message ||
          "Could not inspect Shopify tracking capabilities",
      },
      { status: 500 }
    );
  }
}
