import { withUser, appOrigin } from "../../../../../src/application/auth-http.mjs";
import { createShopifyConnectionService, shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";

export const GET = withUser(async function GET(request, { user, sessionHash }) {
  try {
    await createShopifyConnectionService().complete({ userId: user.id, sessionHash, params: new URL(request.url).searchParams });
    return new Response(null, { status: 303, headers: { Location: `${appOrigin(request)}/campaigns?shopify=connected` } });
  } catch (error) { return shopifyErrorResponse(error); }
});
