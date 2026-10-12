import { withUser } from "../../../src/application/auth-http.mjs";
import { createShopifyConnectionService, shopifyErrorResponse } from "../../../src/application/shopify-connection.mjs";
import { listShopifyProducts, shopifyProductToUniversalProduct } from "../../../src/connectors/shopify/products.mjs";

export const GET = withUser(async function GET(request, { user }) {
  const service = createShopifyConnectionService();
  let connection;
  try {
    connection = await service.get(user.id);
    const params = new URL(request.url).searchParams;
    const result = await listShopifyProducts({ shop: connection.shop, accessToken: connection.accessToken,
      first: params.has("first") ? Number(params.get("first")) : 50, after: params.get("after"), search: params.get("search") });
    return Response.json({ products: result.products.map((product) => shopifyProductToUniversalProduct(product, connection.shop)), pageInfo: result.pageInfo });
  } catch (error) {
    if (error.code === "REAUTHORIZE" && connection) await service.invalidate(user.id, connection.accessToken);
    return shopifyErrorResponse(error);
  }
});
