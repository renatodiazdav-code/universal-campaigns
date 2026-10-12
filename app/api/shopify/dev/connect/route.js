import { withUser } from "../../../../../src/application/auth-http.mjs";
import { createShopifyConnectionService, shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";

export const POST = withUser(async function POST(request, { user, sessionHash }) {
  try {
    return Response.json(await createShopifyConnectionService().connectDevelopmentStore({ userId: user.id, sessionHash }));
  } catch (error) { return shopifyErrorResponse(error); }
});
