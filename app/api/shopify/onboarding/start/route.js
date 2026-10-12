import { appOrigin, assertSameOrigin, readAuthInput, authErrorResponse } from "../../../../../src/application/auth-http.mjs";
import { createShopifyOnboarding, SHOPIFY_ONBOARDING_COOKIE } from "../../../../../src/application/shopify-onboarding.mjs";
import { shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";
import { ShopifyError } from "../../../../../src/connectors/shopify/client.mjs";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { shop } = await readAuthInput(request);
    const { authorizationUrl, browserNonce } = createShopifyOnboarding().start({ shop,
      redirectUri: `${appOrigin(request)}/api/shopify/onboarding/callback` });
    const secure = appOrigin(request).startsWith("https:");
    const cookie = `${secure ? "__Host-" : ""}${SHOPIFY_ONBOARDING_COOKIE}=${browserNonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`;
    return Response.json({ authorizationUrl }, { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
  } catch (error) { return error instanceof ShopifyError ? shopifyErrorResponse(error) : authErrorResponse(error); }
}
