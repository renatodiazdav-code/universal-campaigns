import { withUser } from "../../../../src/application/auth-http.mjs";
import { createConnectionStore } from "../../../../src/application/connection-store.mjs";
import { inspectShopifyWebPixelAccess } from "../../../../src/connectors/shopify/web-pixel.mjs";

export const GET = withUser(async function GET(request, { user }) {
  try {
    const connection = await createConnectionStore().forUser(user.id).get("shopify");
    if (!connection?.shop || !connection.accessToken) return Response.json({ status: "NOT_CONNECTED", error: "Connect your Shopify store first." }, { status: 409 });
    const shop = connection.shop;

    const webPixel = await inspectShopifyWebPixelAccess({
      shop,
      accessToken: connection.accessToken,
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
});
