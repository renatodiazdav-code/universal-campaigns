# Relay Meta Performance V1

Relay reads campaign-level Meta Insights and normalizes them into simple merchant-facing metrics.

## Primary metrics

- Spend
- Sales
- Revenue
- Cost per sale
- ROAS

## Platform breakdown

Relay may request `publisher_platform` from Meta Insights to separate delivery across Facebook, Instagram, Messenger, and Audience Network.

This breakdown is diagnostic and explanatory. Relay should keep the primary experience centered on total campaign results rather than exposing Ads Manager complexity.

## Product principle

A merchant should be able to answer three questions without opening Ads Manager:

1. How much did I spend?
2. How much did I sell?
3. Where did the results come from?

Detailed Meta fields remain internal or advanced/debug information.
