import { withUser } from "../../../src/application/auth-http.mjs";
import { createConnectionStore } from "../../../src/application/connection-store.mjs";
import { getShopifyProducts, shopifyProductToUniversalProduct } from "../../../src/connectors/shopify/products.mjs";

export const GET = withUser(async function GET(request, { user }) {
  const connection = await createConnectionStore().forUser(user.id).get("shopify");
  if (!connection?.accessToken || !connection.shop) return Response.json({ error: "Connect your Shopify store to load products.", status: "NOT_CONNECTED" }, { status: 409 });
  try {
    const products = await getShopifyProducts({ shop: connection.shop, accessToken: connection.accessToken });
    return Response.json({ products: products.map((product) => shopifyProductToUniversalProduct(product, connection.shop)) });
  } catch (error) {
    console.error("Shopify product loading failed:", error.message);
    return Response.json({ error: "Could not load your store products. Check your Shopify connection." }, { status: 502 });
  }
});
