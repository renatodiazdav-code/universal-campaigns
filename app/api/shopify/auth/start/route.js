import { withUser, appOrigin, readAuthInput } from "../../../../../src/application/auth-http.mjs";
import { createShopifyConnectionService, shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";

export const POST = withUser(async function POST(request, { user, sessionHash }) {
  const { shop } = await readAuthInput(request);
  try {
    return Response.json(createShopifyConnectionService().begin({ userId: user.id, sessionHash, shop, redirectUri: `${appOrigin(request)}/api/shopify/auth/callback` }));
  } catch (error) { return shopifyErrorResponse(error); }
});
