import { ShopifyError } from "../connectors/shopify/client.mjs";

export function shopifyInstallUrl(value = process.env.SHOPIFY_INSTALL_URL) {
  if (!value) throw new ShopifyError("Relay's Shopify installation link is not configured yet.", 503, "INSTALL_LINK_NOT_CONFIGURED");
  let url;
  try { url = new URL(value); } catch { /* handled below */ }
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port ||
      !(url.hostname === "admin.shopify.com" || url.hostname === "apps.shopify.com" || url.hostname === "accounts.shopify.com")) {
    throw new ShopifyError("Relay's Shopify installation link is invalid.", 503, "INVALID_INSTALL_LINK");
  }
  return url.toString();
}
