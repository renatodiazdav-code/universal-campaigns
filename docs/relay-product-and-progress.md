# Relay product and implementation context

Updated: 2026-10-12

## Confirmed product direction

- Shopify ecommerce sales is the initial scope.
- The landing links to Shopify's official installation flow without asking for a store address. Shopify's signed app launch identifies the store; an authorization grant then links it to the merchant's Relay account before the dashboard. Meta is connected there; TikTok awaits approval and implementation.
- One campaign creator: product, platforms, audience/budget, creative, review.
- Universal configures shared values. Meta Ads and TikTok Ads allow independent overrides.
- Facebook and Instagram belong to the Meta integration.
- Only Basic and Advanced Settings. Advanced uses collapsible sections; there is no Expert tier.
- Beginners can keep recommended defaults. Experienced users can change supported controls.
- Reporting defaults to Universal, with platform views and a more detailed dashboard.
- Product changes should be explained to Renato in ordinary language; routine engineering does not require repeated confirmation.

## Implemented in the Universal settings change

- Shared audience and bidding choices translate into platform plans.
- Per-platform country, age, gender, ad text, headline, destination and CTA overrides.
- Field-level inheritance and reset to Universal; native Meta advanced settings inherit independently by section.
- Platform tabs in audience/budget and creative steps.
- Review displays resolved configurations, not only the shared input.
- Meta execution uses resolved audience and creative fields.
- Overrides cannot change the authorized budget allocation.
- Stored campaign inputs include Universal settings and platform overrides.

## Backend accounts change

- Shopify-first sign-up from the landing, with legacy email registration available separately for existing account workflows.
- Meta OAuth state is tied to the initiating user/session and callback URLs use APP_URL.
- Business endpoints never fall back to global developer connections.
- Explicit migration preserves old developer files and assigns their data only to a chosen registered account.

## Current limitations and next work

- Meta creates paused campaigns; activation/pause management is still pending.
- TikTok execution and authorization are not implemented. Its plan is a Relay plan, not a verified native API payload.
- Renato reports a TikTok Business account under review. Confirm which account/app approval is pending before live integration tests.
- Merchant sign-up begins on the landing, using a Shopify authorization grant to establish or recover a Relay session tied to the verified store. An HttpOnly browser-bound, single-use state protects onboarding. Existing Relay email sign-in and owner-scoped connection remain for compatibility. Product APIs use the store's encrypted expiring token, support pagination/search, and retain Shopify's published storefront URLs. See `docs/shopify-connection.md` for app setup and live validation requirements.
- Account registration/login/logout, expiring sessions, authenticated APIs, owner-scoped SQLite campaigns and encrypted per-user connections are implemented. See `docs/backend-accounts.md` for setup and deployment constraints. Email verification and recovery remain pending.
- Universal reporting currently receives only Meta metrics. TikTok reporting and attribution reconciliation are pending.
- The first beta has a three-week target. API approvals and live validation are external dependencies.

Next engineering block: live Shopify authorization with the configured app, then Meta activation/pause and review status. Prepare TikTok OAuth/execution against official API contracts while its account/app approval is pending. Public distribution, required Shopify compliance/uninstall webhooks, hosted database setup and live provider validation remain launch requirements.
