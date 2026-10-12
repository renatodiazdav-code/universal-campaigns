# Merchant Shopify connection

## Configure the Relay app

1. Run `npm run setup:local` if `.env.local` is not configured.
2. Set `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` to the Relay Shopify app credentials in `.env.local`. These belong to Relay, not to individual merchants. Do not commit or send them in chat.
3. Set `SHOPIFY_INSTALL_URL` to the official install/listing link supplied by Shopify for the app (not a made-up OAuth URL). The landing button goes there, where Shopify handles account/store selection. Set the app's **App URL** to the public Relay origin plus `/api/shopify/onboarding/entry`; Shopify must launch that URL with signed `shop`, `hmac` and `timestamp` parameters. Set the allowed OAuth redirect URL to the same origin plus `/api/shopify/onboarding/callback`. The older signed-in `/api/shopify/auth/*` routes remain for existing accounts, with their own callback URL.
4. Configure `read_products` access in the app. Relay currently requests only this scope; no customer, order or write access is requested.

For an isolated local test store, `SHOPIFY_SHOP=luvixy` and the server-side development token endpoint can still be used by a signed-in tester; it is not exposed as merchant onboarding UI.

For a local Cloudflare tunnel, set `APP_URL` to its HTTPS origin and restart Relay. Shopify's App URL and redirect URL must use that identical origin. Quick-tunnel URLs change when restarted, so update both settings when the URL changes. Live OAuth cannot be verified with a simulated Shopify provider. External merchant OAuth needs the appropriate app distribution and live validation before opening Relay to other stores.

## Implemented behavior

| Endpoint | Behavior |
|---|---|
| GET `/api/shopify/onboarding/install` | Redirects to the configured official Shopify installation link; no store address input in Relay |
| GET `/api/shopify/onboarding/entry` | Verifies Shopify's signed app launch, identifies the store, binds an OAuth state to this browser and redirects to Shopify's authorization page |
| POST `/api/shopify/onboarding/start` | Public same-origin `{shop}` request returns official Shopify authorization URL and sets a short-lived, HttpOnly browser nonce |
| GET `/api/shopify/onboarding/callback` | Verifies Shopify HMAC, timestamp and one-use state tied to the browser/store; creates or finds the store-owned Relay account, stores encrypted tokens, issues a Relay session and redirects to `/campaigns` |
| POST `/api/shopify/auth/start` | Requires a session and same-origin request; accepts `{shop}` and returns Shopify's authorization URL |
| GET `/api/shopify/auth/callback` | Verifies Shopify HMAC, timestamp and a single-use nonce tied to the user/session/store; exchanges the code and redirects to `/campaigns` |
| GET `/api/connections` | Returns store name, domain, currency and connection state; never returns credentials |
| GET `/api/products` | Returns the current user's Shopify products, images, price range, publication state, real storefront URL and page information |
| DELETE `/api/connections` | With `{provider:"shopify"}`, removes only the signed-in user's stored connection |

The catalog accepts `first` (1–100, default 50), `after` and `search`. API consumers can page through the catalog; the current campaign selector loads the first page. Products without a published storefront URL cannot be selected for an ad. Tracking installation is a separate integration and is not authorized by `read_products`.

OAuth uses expiring offline tokens (`expiring=1`), with automatic refresh before access-token expiry. Access and refresh tokens are encrypted in the existing owner-scoped connection store. Refresh is coalesced in-process and leased in SQLite; conditional updates prevent an old refresh from restoring a disconnected or replaced connection. Temporary provider failures preserve credentials; expiry/revocation prompts reconnection. Shopify hosts are validated and redirects are refused on server-side provider requests.

## Verification and remaining launch work

Automated checks cover signatures, replay/cross-user attacks, token exchange/renewal, refresh races, encryption, catalog pagination, unpublished products and sanitized provider errors. HTTP and browser checks use a simulated Shopify provider; they are not evidence of a live Shopify grant. A real approval and catalog load still need the configured app and an accessible store.

This block does not add Shopify uninstall/privacy webhooks, order synchronization or sales attribution. Configure and implement the required lifecycle/compliance webhooks before public distribution. The existing single-server persistent SQLite deployment constraint still applies; see `docs/backend-accounts.md`.

Official contracts: [standalone authorization flow](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps), [Product object](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product), and [Shopify SDK HMAC validation](https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/lib/utils/hmac-validator.ts).
