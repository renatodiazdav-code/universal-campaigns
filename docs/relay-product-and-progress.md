# Relay product and implementation context

Updated: 2026-10-12

## Confirmed product direction

- Shopify ecommerce sales is the initial scope.
- Registration leads to the dashboard. Shopify, Meta and TikTok connections are available there.
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

## Current limitations and next work

- Meta creates paused campaigns; activation/pause management is still pending.
- TikTok execution and authorization are not implemented. Its plan is a Relay plan, not a verified native API payload.
- Renato reports a TikTok Business account under review. Confirm which account/app approval is pending before live integration tests.
- Shopify currently loads the server-configured development store. Merchant authorization is pending.
- User authentication, durable per-user storage and protected credential storage are pending.
- Universal reporting currently receives only Meta metrics. TikTok reporting and attribution reconciliation are pending.
- The first beta has a three-week target. API approvals and live validation are external dependencies.

Next engineering block: authentication and per-merchant connections/storage, then TikTok executor and live launch lifecycle.
