# Relay Meta Sales / Website / Purchase capability matrix

Status: product + engineering research baseline

Last reviewed: 2026-10-12

Confirmed product decisions and current implementation status: `docs/relay-product-and-progress.md`. The tables below remain a research backlog, not a guarantee that every listed control is available in Relay.

Scope: **Meta Ads for ecommerce stores using Sales -> Website -> Purchase.**

This is intentionally narrower than “everything Meta Ads can ever do”. Relay should be deep inside this lane instead of shallow across Awareness, Traffic, Leads, App Promotion, political ads, etc.

## Product rule

Relay should be **simple by default and deep on demand**.

- `BASIC`: a normal merchant may need to choose it.
- `AUTO`: Relay should choose/configure it automatically.
- `ADVANCED`: useful professional control; hidden behind Advanced Settings.
- Advanced remains a single level. More technical controls belong in their relevant Advanced section when supported; there is no Expert tier.
- `CONDITIONAL`: show only when the connected account/assets/region make it relevant.
- `LATER`: valid Meta capability, but too large, risky, or dependent for this MVP.
- `OUT`: intentionally outside the Sales / Website / Purchase MVP.

Implementation status:

- `BUILT`: current Relay code already carries the setting into the Meta plan/payload.
- `PARTIAL`: some backend/setup exists, but the complete user control or live proof does not.
- `NOT BUILT`: no complete Relay implementation yet.
- `RESEARCH`: Meta capability exists or appears in Ads Manager/API, but exact API/account behavior must be validated before productizing.

Meta changes Ads Manager frequently and rolls features out by account, country, objective, optimization goal and data availability. A control must not be rendered merely because Meta has it somewhere; Relay should capability-detect it whenever possible.

---

## 1. Campaign level

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Objective: Sales | Tells Meta the business outcome | AUTO | P0 | `OUTCOME_SALES` | BUILT |
| Campaign name | Internal organization | BASIC/AUTO | P0 | Standard campaign field | BUILT |
| Buying type: Auction | Uses Meta auction delivery | AUTO | P0 | Normal ecommerce path; API supports `buying_type` | PARTIAL — Relay currently relies on normal auction behavior rather than exposing it |
| Special Ad Categories | Applies legal/restriction rules for housing, employment, financial products/services, politics/issues where applicable | CONDITIONAL | P0 before external beta | Must not always be `[]` for every possible merchant | PARTIAL — connector supports field, product detection/prompt does not |
| Campaign budget vs ad-set budget | Decides where Meta owns budget allocation | AUTO / ADVANCED later | P0 | Relay currently uses campaign budget | BUILT for campaign budget |
| Daily budget | Spend amount per day | BASIC | P0 | Campaign budget supported | BUILT |
| Lifetime/total budget | Spend budget over campaign lifetime | BASIC | P0 | Campaign lifetime budget supported | BUILT |
| Start date/time | Delivery start | BASIC/AUTO | P0 | Ad-set schedule + campaign schedule | BUILT |
| End date/time / duration | Delivery end | BASIC | P0 | Relay derives from duration | BUILT |
| Campaign bid strategy | Campaign-level bidding behavior | ADVANCED | P0/P1 | Current API names include lowest cost, cost cap, bid cap patterns | PARTIAL |
| Campaign spending limit | Hard campaign-level ceiling separate from regular budget semantics | ADVANCED | P2 | Available only in eligible configurations | NOT BUILT |
| Budget scheduling / high-demand periods | Temporarily raises/changes budget in scheduled periods | ADVANCED | P2 | API exposes budget schedules/high-demand periods | NOT BUILT |
| A/B test / experiment | Controlled comparison of campaigns/variables | LATER | Post-MVP | Requires experiment lifecycle and analysis UX | NOT BUILT |
| Reserved buying | Reservation instead of auction | OUT | — | Not part of normal Shopify Sales MVP | NOT BUILT |
| Advantage+ sales campaign-specific automation | Meta-owned automation bundle around sales campaigns | AUTO / RESEARCH | P2 | Product/API behavior continues to evolve | NOT BUILT as a distinct mode |

## 2. Conversion and optimization at Ad Set level

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Conversion location: Website | Where the desired conversion happens | AUTO | P0 | Relay is Shopify website-first | BUILT semantically / PARTIAL as explicit destination field |
| Pixel / Dataset | Data source used for conversion optimization | AUTO when unambiguous; ADVANCED if multiple | P0/P1 | Discoverable from ad account | PARTIAL — auto discovery/selection exists; advanced selector does not |
| Conversion event: Purchase | Event Meta should optimize toward | AUTO | P0 | `promoted_object` with Purchase | BUILT |
| Maximize number of conversions | Finds more purchase conversions | AUTO | P0 | Current Relay uses offsite conversions/Purchase | BUILT |
| Maximize conversion value | Optimizes total purchase value rather than count | ADVANCED | P2 | Requires trustworthy purchase value tracking and compatible bidding | NOT BUILT |
| Landing page views | Optimizes page visits rather than purchases | OUT for current Sales/Purchase lane | — | Would weaken Relay’s fixed purchase thesis | NOT BUILT |
| Link clicks | Optimizes clicks rather than purchases | OUT for current Sales/Purchase lane | — | Not the MVP outcome | NOT BUILT |
| Destination type | Explicit website/app/messenger destination semantics | AUTO | P1 | Marketing API exposes destination-related fields | NOT BUILT explicitly |
| Billing event | Event used for billing semantics | AUTO | P0 | Relay uses impressions | BUILT |

## 3. Attribution

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Attribution model: Standard | Normal optimization/reporting using chosen attribution windows | AUTO by default; ADVANCED selector | P1 | Current Ads Manager default for common Website conversion setups | PARTIAL — currently relies on Meta default |
| Attribution model: Incremental | Optimizes for conversions Meta predicts were caused by the ad | CONDITIONAL / ADVANCED | P2 | Available for eligible conversion campaigns; can constrain other bid controls | RESEARCH / NOT BUILT |
| Personalized attribution | Uses eligible partner/analytics attribution signals | CONDITIONAL | Post-MVP unless partner available | Requires supported analytics integration/account eligibility | NOT BUILT |
| Click-through attribution window | How long after a link click Meta can credit conversion | ADVANCED | P1 | `attribution_spec` supported by Marketing API | NOT BUILT |
| Engage-through attribution window | Credits conversion after qualifying social interaction | ADVANCED | P1 | Meta changed naming/measurement in 2026 | NOT BUILT |
| View-through attribution window | Credits conversion after ad view without click | ADVANCED | P1 | Can be configured in eligible Standard setups | NOT BUILT |
| Unified attribution reporting behavior | Which configured attribution setting Insights uses | AUTO | P2 | Reporting concern, separate from delivery | NOT BUILT |

## 4. Bidding and value optimization

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Highest volume / Lowest cost | Spend budget to get the most results without a bid cap | AUTO default; ADVANCED | P0 | API value currently used by Relay: `LOWEST_COST_WITHOUT_CAP` | BUILT |
| Cost per result goal / Cost Cap | Tries to keep average result cost around a target | ADVANCED | P0/P1 | API uses Cost Cap semantics | BUILT but still needs live Meta validation for exact CBO combination |
| Bid Cap | Caps auction bid directly | ADVANCED | P1 | API supports `LOWEST_COST_WITH_BID_CAP` + bid amount | NOT BUILT |
| Highest value | Optimizes purchase value | ADVANCED | P2 | Requires value optimization and reliable revenue signals | NOT BUILT |
| Minimum ROAS / ROAS goal | Guides bidding toward a return target | ADVANCED | P2 | Requires value signal + compatible bid constraints | NOT BUILT |
| Bid adjustments / value rules | Gives selected conversions/audiences relatively more or less value | ADVANCED / CONDITIONAL | P3 | Eligibility and modern Value Rules behavior vary by account | NOT BUILT |

## 5. Audience

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Country | Geographic delivery | BASIC | P0 | `geo_locations.countries` | BUILT |
| Region/state | Geographic delivery | ADVANCED | P1 | Targeting geo API | NOT BUILT |
| City | Geographic delivery | ADVANCED | P1 | Targeting geo API | NOT BUILT |
| ZIP/postcode / radius where supported | Geographic delivery | ADVANCED | P2 | Country-dependent | NOT BUILT |
| Minimum age | Audience control | BASIC | P0 | Advantage+ treats minimum age as a control | BUILT |
| Maximum age | Audience range/suggestion depending on mode | BASIC | P0 | Semantics vary with Advantage+ | BUILT |
| Gender | Audience suggestion/control depending on mode | BASIC | P0 | Semantics vary with Advantage+ | BUILT |
| Languages | Language targeting/control | ADVANCED | P1 | Supported in targeting | NOT BUILT |
| Advantage+ Audience | Lets Meta expand beyond suggestions to find purchasers | AUTO default; ADVANCED | P0 | `targeting_automation` | BUILT |
| Specific/original audience mode | Reduces Advantage+ expansion where Meta allows it | ADVANCED | P1 | Not every signal becomes a hard constraint for Sales/Purchase | BUILT |
| Existing Custom Audience include | Uses an audience already on the user’s account | CONDITIONAL / ADVANCED | P1 | Only useful when account has one | BUILT |
| Existing Custom Audience exclude | Excludes known audiences such as buyers | CONDITIONAL / ADVANCED | P1 | Useful for acquisition/retargeting setups | BUILT |
| Existing Lookalike Audience | Uses Meta-created similar audience as a signal | CONDITIONAL / ADVANCED | P1 | Existing asset required | BUILT |
| Detailed targeting: Interests | Adds interest signals/options returned by Meta | ADVANCED | P1 | Dynamic `targetingsearch` | BUILT |
| Detailed targeting: Behaviors | Adds behavior signals/options returned by Meta | ADVANCED | P1 | Dynamic `targetingsearch` | BUILT |
| Detailed targeting: Demographics | Adds demographic targeting options returned by Meta | ADVANCED | P1 | Dynamic search/browse | BUILT |
| Browse detailed targeting | Lets expert browse Meta’s dynamic taxonomy | ADVANCED | P1 | `targetingbrowse` | BUILT |
| Create new Custom Audience inside Relay | Builds warm audiences from site/list/engagement/etc. | LATER | P3 | Requires many source-specific workflows and privacy UX | NOT BUILT |
| Create Lookalike inside Relay | Creates a new similar audience from a source audience | LATER | P3 | Requires source audience, location and similarity config | NOT BUILT |
| Detailed targeting exclusions | Exclude interests/behaviors | OUT | — | Meta removed this old capability from modern targeting | NOT BUILT |

## 6. Placements and delivery surfaces

Relay’s **current product decision** remains: recommended = Facebook + Instagram Feed, Stories and Reels. Messenger and Audience Network remain excluded from the MVP default/manual set unless product direction is explicitly changed.

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Relay Recommended placements | Uses FB/IG Feed, Stories, Reels | AUTO default | P0 | Relay-owned preset | BUILT |
| Facebook Feed | Delivery surface | ADVANCED | P0 | Manual placement | BUILT |
| Facebook Stories | Delivery surface | ADVANCED | P0 | Manual placement | BUILT |
| Facebook Reels | Delivery surface | ADVANCED | P0 | Manual placement | BUILT |
| Instagram Feed | Delivery surface | ADVANCED | P0 | Manual placement | BUILT |
| Instagram Stories | Delivery surface | ADVANCED | P0 | Manual placement | BUILT |
| Instagram Reels | Delivery surface | ADVANCED | P0 | Manual placement | BUILT |
| Meta Advantage+ placements | Lets Meta choose broadly across eligible placements | ADVANCED / RESEARCH | P2 | Different from Relay Recommended; not current product default | NOT BUILT as a selectable mode |
| Facebook Marketplace/Search/Right Column/video surfaces | Extra Facebook surfaces | ADVANCED / CONDITIONAL | P2 | Eligibility varies by objective/creative | NOT BUILT |
| Instagram Explore/Search | Extra Instagram surfaces | ADVANCED / CONDITIONAL | P2 | Eligibility varies | NOT BUILT |
| Threads | Threads placement | ADVANCED / CONDITIONAL | P2 | Expanded in 2026; account/format availability varies | NOT BUILT |
| Messenger | Messenger placements | ADVANCED / CONDITIONAL | P2 | Explicitly excluded from current MVP placement set | NOT BUILT |
| Audience Network | Third-party app/site inventory | ADVANCED / CONDITIONAL | P2 | Explicitly excluded from current MVP placement set | NOT BUILT |
| Device platform | Mobile/desktop targeting | ADVANCED | P2 | Targeting supports device platform | NOT BUILT |
| OS/device model | User OS/device targeting | ADVANCED | P3 | Very niche for Shopify web sales | NOT BUILT |
| Placement-specific creative assets | Different image/video per placement | ADVANCED | P1/P2 | Valuable for professionals; larger creative UX | NOT BUILT |

## 7. Schedule and pacing

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Start/end schedule | Campaign delivery dates | BASIC | P0 | Standard ad-set schedule | BUILT |
| Ad scheduling/dayparting | Limits delivery to chosen hours/days | ADVANCED | P2 | API has ad-set scheduling/time controls | NOT BUILT |
| Pacing | How spend is paced | AUTO | P3 | API exposes pacing-related fields; not usually merchant-facing | NOT BUILT |
| High-demand budget periods | Temporarily changes spend during promotions | ADVANCED | P2 | Requires budget schedule lifecycle | NOT BUILT |

## 8. Brand safety / suitability

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Inventory/content filter | Controls sensitivity of adjacent content | ADVANCED / CONDITIONAL | P2 | Relevant especially when broader placements are enabled | NOT BUILT |
| Publisher block lists | Blocks specific publishers/apps | ADVANCED | P3 | Requires list management | NOT BUILT |
| Publisher/content category exclusions | Excludes classes of adjacent content | ADVANCED | P3 | Availability changes with inventory/products | NOT BUILT |
| In-stream suitability controls | Video/in-stream safety behavior | CONDITIONAL | P3 | Only relevant if those placements are supported | NOT BUILT |

## 9. Ad identity

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Facebook Page | Facebook identity attached to creative | AUTO if one obvious; ADVANCED if multiple | P0/P1 | Relay discovers Pages | PARTIAL — automatic setup exists; advanced selector is not yet a normal campaign control |
| Instagram identity | Instagram identity attached to creative | AUTO if connected; ADVANCED if multiple | P0/P1 | Relay discovers compatible IG identity | PARTIAL |
| Partnership / branded content ad | Creator/business partnership identity | CONDITIONAL / LATER | P3 | Requires creator permissions and extra objects | NOT BUILT |
| Existing post identity | Promote an existing Page/IG post instead of a new creative | ADVANCED | P2 | Existing-post flow differs from manual creative | NOT BUILT |

## 10. Core creative

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Single image | Ad media | BASIC | P0 | Direct upload -> Meta image hash | BUILT, live asset upload confirmed |
| Single video | Ad media | BASIC | P0 | Direct upload -> Meta video ID | BUILT, live asset upload confirmed |
| Carousel | Multiple cards/products/assets | ADVANCED | P1/P2 | Useful ecommerce format | NOT BUILT |
| Flexible/multi-format creative | Lets Meta choose among creative formats/assets | ADVANCED / RESEARCH | P2 | Product/API evolving | NOT BUILT |
| Primary text | Main ad copy | BASIC | P0 | Link/video creative | BUILT |
| Headline | Headline | BASIC | P0 | Link/video creative | BUILT |
| Description | Secondary copy where placement supports it | ADVANCED | P1 | Creative field | NOT BUILT |
| CTA | Shop Now/Learn More/etc. | BASIC/ADVANCED | P0 | Relay already maps supported CTAs | BUILT |
| Destination URL | Click destination | AUTO/BASIC | P0 | Shopify product URL by default | BUILT |
| Display URL | Displayed/cosmetic URL where supported | ADVANCED | P2 | Creative setting | NOT BUILT |
| Multiple primary text variants | Gives Meta alternative copy variants | ADVANCED | P1 | Asset-feed / creative variation pattern | NOT BUILT |
| Multiple headline variants | Gives Meta alternative headlines | ADVANCED | P1 | Asset-feed / creative variation pattern | NOT BUILT |
| Multiple description variants | Gives Meta alternative descriptions | ADVANCED | P1/P2 | Format-dependent | NOT BUILT |
| Different creative per placement | Feed/Story/Reels-specific image/video | ADVANCED | P1 | Strong professional use case | NOT BUILT |
| Preview by placement | Shows how ad looks in Feed/Stories/Reels | ADVANCED/BASIC UX | P1 | Does not alter API payload but important trust UX | NOT BUILT; intentionally deferred to UI/UX phase |

## 11. Advantage+ Creative / enhancements

Relay currently only opts into **creative fitting/adaptation** needed to reuse the uploaded asset across selected placements. We should not silently opt users into generative changes that rewrite the ad or brand.

| Setting / family | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Adapt to placement | Fits asset to eligible placements | AUTO default | P0 | `degrees_of_freedom_spec` | BUILT |
| Image auto-crop / touch-up | Crops/fits image | AUTO default | P0 | Current Relay opt-in | BUILT |
| Video auto-crop / touch-up | Fits video | AUTO default | P0 | Current Relay opt-in | BUILT |
| Visual touch-ups | Additional visual optimization | ADVANCED | P2 | Enhancement availability varies | PARTIAL only through current fitting subset |
| Brightness/contrast | Adjusts visual levels | ADVANCED | P2 | Low-risk enhancement | NOT BUILT explicitly |
| Relevant comments | Can surface selected social proof comments | ADVANCED | P2 | Depends on ad/post behavior | NOT BUILT |
| Text improvements / text generation | Rewrites or generates copy variations | ADVANCED with preview | P2 | Generative; brand-risky | NOT BUILT |
| Image expansion | Generates/fills image edges for other ratios | ADVANCED with preview | P2 | Meta has API examples for image expansion | NOT BUILT explicitly |
| Background generation | Generates new backgrounds | ADVANCED with preview | P3 | Generative; brand-risky | NOT BUILT |
| Image generation | Generates new imagery | ADVANCED with preview | P3 | Generative; brand-risky | NOT BUILT |
| Animation / image-to-video effects | Adds motion to static creative | ADVANCED with preview | P3 | Enhancement availability varies | NOT BUILT |
| Music | Adds soundtrack | ADVANCED with preview | P3 | Can materially alter brand presentation | NOT BUILT |
| CTA enhancement | Changes presentation/emphasis of CTA | ADVANCED | P2 | Enhancement-specific | NOT BUILT |
| Translations | Generates/translates creative text/audio | CONDITIONAL / ADVANCED | P3 | Language/account/format dependent | NOT BUILT |
| Overlays/labels | Adds visual overlays/labels | ADVANCED | P2/P3 | Format/catalog dependent | NOT BUILT |

## 12. Creative setup extras and destination behavior

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Site links | Adds extra destination links under ad | ADVANCED | P1/P2 | Useful for stores with category/shipping/returns pages | NOT BUILT |
| Promotions / promo codes | Surfaces promotion information | CONDITIONAL / ADVANCED | P2 | Useful when merchant has an active promotion | NOT BUILT |
| Website highlights | Surfaces website/business details | ADVANCED | P2 | Availability varies | NOT BUILT |
| Summaries | Adds/uses generated or extracted summaries | ADVANCED | P3 | Availability varies | NOT BUILT |
| Product browsing | Lets people browse more products | CONDITIONAL | P2 | Catalog/website support required | NOT BUILT |
| Personalized destinations | Meta can choose among destinations/add-ons | ADVANCED / CONDITIONAL | P3 | Depends on account/assets | NOT BUILT |
| Browser add-ons (WhatsApp/IG Direct/Form/etc.) | Adds extra post-click/contact path | CONDITIONAL | P3 | Only useful for merchants that want those flows | NOT BUILT |

## 13. Tracking and measurement configuration

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Pixel/Dataset tracking | Website conversion signal | AUTO | P0 | Relay discovers selected pixel | PARTIAL: selection exists; Shopify tracking health is not fully solved |
| Purchase event tracking | Purchase optimization signal | AUTO | P0 | Needed before real spend | PARTIAL: Meta pixel health checks exist; actual Shopify Purchase tracking still needs stronger proof |
| URL parameters / UTMs | Adds analytics parameters to destination URL | ADVANCED | P1 | Ad creative supports URL tags/parameters | NOT BUILT |
| Dynamic UTM values | Inserts campaign/ad/ad-set/placement identifiers | ADVANCED | P1/P2 | Useful for analytics | NOT BUILT |
| Meta CAPI | Server-side conversion signal | AUTO | P0 before serious external beta | Requires tracking architecture/security/privacy work | NOT BUILT |
| Shopify Web Pixel integration | Browser-side Shopify event collection | AUTO | P0 before serious external beta | Relay currently only probes its own Web Pixel capability | PARTIAL |
| Offline events | Sends offline purchase/conversion signals | OUT/LATER | Post-MVP | Not necessary for Shopify-first online sales | NOT BUILT |

## 14. Catalog / ecommerce-specific Meta capabilities

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| Meta Catalog connection | Gives Meta structured store/product inventory | AUTO / CONDITIONAL | P2 | Shopify makes this strategically relevant | NOT BUILT |
| Product set | Restricts which catalog products are promoted | ADVANCED | P2 | Requires catalog | NOT BUILT |
| Dynamic/catalog ads | Dynamically selects products/creative | ADVANCED/AUTO | P2 | Powerful ecommerce path but larger integration | NOT BUILT |
| Catalog retargeting | Shows products based on viewed/cart/purchase behavior | ADVANCED/AUTO | P2/P3 | Requires catalog + tracking quality | NOT BUILT |
| Product tags | Adds product-specific tags/links | CONDITIONAL | P2/P3 | Catalog/shop dependent | NOT BUILT |
| Dynamic product overlays | Price/discount/product overlays | ADVANCED | P3 | Catalog creative feature | NOT BUILT |

## 15. Regional, policy and account-dependent controls

| Setting | What it changes | Relay UX | MVP priority | API / account notes | Relay status |
|---|---|---:|---:|---|---|
| DSA beneficiary | Identifies who benefits from ad in applicable regions | CONDITIONAL | P1 before EU beta | API exposes DSA beneficiary fields at ad-set level | NOT BUILT |
| DSA payor | Identifies who pays for ad in applicable regions | CONDITIONAL | P1 before EU beta | API exposes DSA payor fields | NOT BUILT |
| Political/social-issue authorization/disclaimer | Required authorization/disclosure for regulated content | OUT for initial ecommerce product | — | Better to reject unsupported campaigns than pretend generic support | NOT BUILT |
| Account currency | Currency used by ad account | AUTO | P0 | Relay discovers ad account currency | BUILT |
| Account timezone | Determines schedule semantics | AUTO | P1 | Must be respected before production scheduling | PARTIAL / needs explicit audit |
| Account spend cap | Ad-account-wide spend ceiling | DISPLAY/CONDITIONAL | P2 | Account-level rather than campaign-level | NOT BUILT |

---

# Recommended MVP architecture

## Basic screen

The merchant should only see the decisions most normal Shopify sellers understand:

1. Product
2. Platforms
3. Country
4. Age
5. Gender
6. Budget type + amount
7. Duration
8. Image/video
9. Primary text
10. Headline
11. CTA

Relay fills everything else with a technically valid recommended configuration.

## Advanced Settings

Use progressive disclosure instead of one enormous form:

- **Audience**
- **Bidding & value**
- **Placements**
- **Attribution**
- **Conversion & data source**
- **Creative controls**
- **Tracking**
- **Schedule**
- **Identity**

Each section should show a compact summary until opened.

## Conditional Advanced controls

If a user wants maximum control, expose **only controls actually available for that connected account and current campaign configuration**.

Example:

- One Pixel -> Relay selects it; no selector needed.
- Three Pixels -> Advanced shows a Pixel selector.
- Zero Custom Audiences -> do not show a giant empty Custom Audience editor.
- Existing Custom Audiences -> show include/exclude search.
- Personalized attribution not eligible -> do not show it.
- Instagram not connected -> do not pretend Instagram identity is configurable.

---

# Implementation waves

## Wave A — high-value professional controls with low product complexity

These should be investigated/implemented next before adding more exotic systems:

1. **Attribution windows** (`attribution_spec`) with Standard as automatic default.
2. **Conditional Pixel/Dataset selector** when more than one valid source exists.
3. **Languages + region/city geo targeting**.
4. **Bid Cap** in Advanced bidding, while keeping Highest Volume default and Cost Cap available.
5. **Description + multiple text/headline variants**.
6. **URL parameters / UTMs**, including optional dynamic identifiers.
7. **Conditional Page/Instagram identity selector** when multiple valid identities exist.

These are common professional controls, relatively bounded, and do not require Relay to become a new platform inside itself.

## Wave B — professional creative depth

1. Placement-specific creative assets.
2. Feed / Stories / Reels previews.
3. Carousel format.
4. Site links.
5. Curated low-risk Advantage+ Creative controls.
6. Optional broader Meta placement set only after explicit product decision and API/account validation.

## Wave C — data/value optimization

1. Maximize conversion value.
2. ROAS goal / minimum ROAS.
3. Incremental attribution where eligible.
4. Budget scheduling/high-demand periods.
5. Brand-safety controls if broader inventory is supported.
6. Meta Catalog / product-set integration.

## Wave D — larger systems, not just another field

1. Create Custom Audiences inside Relay.
2. Create Lookalikes inside Relay.
3. A/B testing/experiments.
4. Personalized attribution partner integrations.
5. Value Rules management.
6. Partnership ads.
7. Full generative creative suite.

These deserve their own product designs and should not be shoved into the MVP just to increase the option count.

---

# Current strategic conclusion

Relay should **not** be “Meta Ads with fewer settings”.

It should be:

> **The ecommerce Sales control surface where a beginner can launch with defaults, while an expert can progressively open nearly every important control without leaving Relay.**

Depth matters because an expert should not have to return to Ads Manager merely to change a legitimate optimization setting. Simplicity comes from defaults, automatic discovery and progressive disclosure — not from permanently removing professional capability.
