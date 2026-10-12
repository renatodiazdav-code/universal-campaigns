import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMetaAudienceTargeting,
  createAdvancedMetaAdSet,
} from "../src/connectors/meta/advanced-adset.mjs";

function jsonResponse(body, { ok = true } = {}) {
  return {
    ok,
    async json() {
      return body;
    },
  };
}

test("builds Advantage+ audience controls, suggestions and explicit Relay placements", () => {
  const targeting = buildMetaAudienceTargeting({
    countries: ["US"],
    ageMin: 21,
    ageMax: 45,
    gender: "FEMALE",
    advantageAudience: true,
    allowAgeExpansion: true,
    allowGenderExpansion: true,
    includedAudiences: [
      { id: "ca-1", name: "Website visitors", kind: "CUSTOM" },
      { id: "la-1", name: "Lookalike customers", kind: "LOOKALIKE" },
    ],
    excludedAudiences: [
      { id: "ca-2", name: "Purchasers", kind: "CUSTOM" },
    ],
    detailedTargeting: [
      { id: "interest-1", name: "Running", type: "interests" },
      {
        id: "behavior-1",
        name: "Frequent travelers",
        type: "behaviors",
      },
    ],
    publisherPlatforms: ["FACEBOOK", "INSTAGRAM"],
    facebookPositions: ["FEED", "REELS"],
    instagramPositions: ["STORIES"],
  });

  assert.deepEqual(targeting.geo_locations, { countries: ["US"] });
  assert.equal(targeting.age_min, 21);
  assert.equal(targeting.age_max, 45);
  assert.deepEqual(targeting.age_range, [21, 45]);
  assert.deepEqual(targeting.genders, [2]);
  assert.deepEqual(targeting.targeting_automation, {
    advantage_audience: 1,
    individual_setting: {
      age: 1,
      gender: 1,
    },
  });
  assert.deepEqual(targeting.custom_audiences, [
    { id: "ca-1" },
    { id: "la-1" },
  ]);
  assert.deepEqual(targeting.excluded_custom_audiences, [
    { id: "ca-2" },
  ]);
  assert.deepEqual(targeting.flexible_spec, [
    {
      interests: [{ id: "interest-1", name: "Running" }],
      behaviors: [
        {
          id: "behavior-1",
          name: "Frequent travelers",
        },
      ],
    },
  ]);
  assert.deepEqual(targeting.publisher_platforms, [
    "facebook",
    "instagram",
  ]);
  assert.deepEqual(targeting.facebook_positions, [
    "feed",
    "facebook_reels",
  ]);
  assert.deepEqual(targeting.instagram_positions, ["story"]);
  assert.equal("targeting_relaxation_types" in targeting, false);
});

test("specific audience delivery disables Advantage+ expansion", () => {
  const targeting = buildMetaAudienceTargeting({
    countries: ["PE"],
    ageMin: 25,
    ageMax: 40,
    gender: "MALE",
    advantageAudience: false,
    allowAgeExpansion: false,
    allowGenderExpansion: false,
  });

  assert.equal(targeting.age_min, 25);
  assert.equal(targeting.age_max, 40);
  assert.deepEqual(targeting.genders, [1]);
  assert.equal("age_range" in targeting, false);
  assert.deepEqual(targeting.targeting_automation, {
    advantage_audience: 0,
  });
});

test("creates a campaign-budget Meta ad set with audience targeting and Purchase optimization", async () => {
  let capturedUrl = null;
  let capturedBody = null;

  const result = await createAdvancedMetaAdSet({
    adAccountId: "act_123",
    accessToken: "token",
    name: "Relay Ad Set",
    campaignId: "campaign-1",
    budgetStrategy: "CAMPAIGN",
    budgetMode: "TOTAL",
    startTime: "2026-10-12T12:00:00.000Z",
    endTime: "2026-10-19T12:00:00.000Z",
    countries: ["PE"],
    ageMin: 18,
    ageMax: 35,
    gender: "ALL",
    advantageAudience: true,
    allowAgeExpansion: true,
    allowGenderExpansion: true,
    includedAudiences: [
      { id: "ca-1", name: "Website visitors", kind: "CUSTOM" },
    ],
    excludedAudiences: [
      { id: "ca-2", name: "Purchasers", kind: "CUSTOM" },
    ],
    detailedTargeting: [
      { id: "interest-1", name: "Running", type: "interests" },
    ],
    publisherPlatforms: ["FACEBOOK"],
    facebookPositions: ["FEED"],
    optimizationGoal: "OFFSITE_CONVERSIONS",
    bidAmount: 1750,
    pixelId: "pixel-1",
    conversionEvent: "PURCHASE",
    status: "PAUSED",
    fetchImpl: async (url, options) => {
      capturedUrl = new URL(url);
      capturedBody = options.body;
      return jsonResponse({ id: "adset-1" });
    },
  });

  assert.equal(capturedUrl.pathname, "/v26.0/act_123/adsets");
  assert.ok(capturedBody instanceof URLSearchParams);
  assert.equal(capturedBody.get("campaign_id"), "campaign-1");
  assert.equal(capturedBody.get("optimization_goal"), "OFFSITE_CONVERSIONS");
  assert.equal(capturedBody.get("status"), "PAUSED");
  assert.equal(capturedBody.get("bid_amount"), "1750");
  assert.equal(capturedBody.has("daily_budget"), false);
  assert.equal(capturedBody.has("lifetime_budget"), false);
  assert.deepEqual(JSON.parse(capturedBody.get("promoted_object")), {
    pixel_id: "pixel-1",
    custom_event_type: "PURCHASE",
  });

  const targeting = JSON.parse(capturedBody.get("targeting"));
  assert.deepEqual(targeting.custom_audiences, [{ id: "ca-1" }]);
  assert.deepEqual(targeting.excluded_custom_audiences, [
    { id: "ca-2" },
  ]);
  assert.deepEqual(targeting.flexible_spec, [
    {
      interests: [{ id: "interest-1", name: "Running" }],
    },
  ]);
  assert.equal(result.id, "adset-1");
});
