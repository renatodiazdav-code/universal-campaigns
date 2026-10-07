import {
  getDevShopifyAccessToken,
} from "../../../src/connectors/shopify/dev-auth.mjs";

import {
  getShopifyProducts,
  shopifyProductToUniversalProduct,
} from "../../../src/connectors/shopify/products.mjs";

export async function GET() {
  try {
    const shop = process.env.SHOPIFY_SHOP;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!shop || !clientId || !clientSecret) {
      return Response.json(
        { error: "Missing Shopify environment variables" },
        { status: 500 }
      );
    }

    const tokenData = await getDevShopifyAccessToken({
      shop,
      clientId,
      clientSecret,
    });

    const products = await getShopifyProducts({
      shop,
      accessToken: tokenData.access_token,
    });

    const universalProducts = products.map((product) =>
      shopifyProductToUniversalProduct(product, shop)
    );

    return Response.json({
      products: universalProducts,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Could not load Shopify products" },
      { status: 500 }
    );
  }
}