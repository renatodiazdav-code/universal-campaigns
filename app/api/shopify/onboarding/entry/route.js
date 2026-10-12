import { appOrigin } from "../../../../../src/application/auth-http.mjs";
import { createShopifyOnboarding, SHOPIFY_ONBOARDING_COOKIE } from "../../../../../src/application/shopify-onboarding.mjs";
import { shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";

export async function GET(request) {
  try {
    const origin = appOrigin(request);
    const { authorizationUrl, browserNonce } = createShopifyOnboarding().startFromShopifyLaunch({
      params: new URL(request.url).searchParams,
      redirectUri: `${origin}/api/shopify/onboarding/callback`,
    });
    const secure = origin.startsWith("https:");
    const name = `${secure ? "__Host-" : ""}${SHOPIFY_ONBOARDING_COOKIE}`;
    const headers = new Headers({ Location: authorizationUrl, "Cache-Control": "no-store" });
    headers.append("Set-Cookie", `${name}=${browserNonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`);
    return new Response(null, { status: 303, headers });
  } catch (error) { return shopifyErrorResponse(error); }
}
