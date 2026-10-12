import { appOrigin, sessionCookie } from "../../../../../src/application/auth-http.mjs";
import { createShopifyOnboarding, SHOPIFY_ONBOARDING_COOKIE } from "../../../../../src/application/shopify-onboarding.mjs";
import { shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";

export async function GET(request) {
  const secure = appOrigin(request).startsWith("https:");
  const name = `${secure ? "__Host-" : ""}${SHOPIFY_ONBOARDING_COOKIE}`;
  const nonce = (request.headers.get("cookie") || "").split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
  try {
    const { token } = await createShopifyOnboarding().complete({ params: new URL(request.url).searchParams, browserNonce: nonce });
    const headers = new Headers({ Location: `${appOrigin(request)}/campaigns`, "Cache-Control": "no-store" });
    headers.append("Set-Cookie", sessionCookie(token, request));
    headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
    return new Response(null, { status: 303, headers });
  } catch (error) { return shopifyErrorResponse(error); }
}
