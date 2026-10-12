# Merchant Shopify connection

## Configure the Relay app

1. Run `npm run setup:local` if `.env.local` is not configured.
2. Set `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` to the Relay Shopify app credentials in `.env.local`. These belong to Relay, not to individual merchants. Do not commit or send them in chat.
3. For the existing development store, set `SHOPIFY_SHOP=luvixy` (or its `myshopify.com` address). Restart Relay, register/sign in, then use **Use configured Shopify test store** on `/campaigns`. This only appears locally and never in production.
4. Configure `read_products` access in the app. Relay currently requests only this scope; no customer, order or write access is requested.

The Dev Dashboard screen in Shopify does not show a redirect-URL field for this same-organization development-store flow. It uses the app's client credentials. Do not search for that field to test `luvixy`.

Use the configured development store for the first live check. External merchant OAuth still needs the redirect URL configured through the Shopify app's public distribution/CLI configuration before opening Relay to other stores. Production uses an HTTPS callback.

## Implemented behavior

| Endpoint | Behavior |
|---|---|
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
