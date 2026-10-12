import { shopifyInstallUrl } from "../../../../../src/application/shopify-install-link.mjs";
import { shopifyErrorResponse } from "../../../../../src/application/shopify-connection.mjs";

export async function GET() {
  try {
    return new Response(null, { status: 303, headers: { Location: shopifyInstallUrl(), "Cache-Control": "no-store" } });
  } catch (error) { return shopifyErrorResponse(error); }
}
