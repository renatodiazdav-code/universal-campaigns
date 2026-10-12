import test from "node:test";
import assert from "node:assert/strict";

import { resolveMetaAdvancedSettings } from "../src/adapters/meta/advanced-settings.mjs";

test("defaults Meta to Advantage+ audience lowest cost bidding and automatic attribution", () => {
  const resolved = resolveMetaAdvancedSettings();

  assert.equal(
    resolved.audience.strategy,
    "ADVANTAGE_PLUS"
  );
  assert.equal(resolved.audience.mode, "ADVANTAGE_PLUS");
  assert.equal(resolved.audience.advantageAudience, true);
  assert.equal(resolved.audience.allowAgeExpansion, true);
  assert.equal(resolved.audience.allowGenderExpansion, true);
  assert.deepEqual(resolved.audience.includedAudiences, []);
  assert.deepEqual(resolved.audience.excludedAudiences, []);
  assert.deepEqual(resolved.audience.detailedTargeting, []);

  assert.equal(resolved.bidding.strategy, "LOWEST_COST");
  assert.equal(
    resolved.bidding.apiStrategy,
    "LOWEST_COST_WITHOUT_CAP"
  );
  assert.equal(resolved.bidding.costCap, null);

  assert.deepEqual(resolved.attribution, {
    mode: "AUTO",
    model: "STANDARD",
    clickWindowDays: null,
    viewWindowDays: null,
    engagedViewWindowDays: null,
  });
});

test("defaults Meta creative adaptation to automatic fitting without generative expansion", () => {
  const resolved = resolveMetaAdvancedSettings();

  assert.deepEqual(resolved.creativeAdaptation, {
    mode: "AUTOMATIC",
    adaptToPlacement: true,
    imageAutoCrop: true,
    videoAutoCrop: true,
    generativeExpansion: false,
  });
});

test("supports specific audience delivery and a positive Meta cost cap", () => {
  const resolved = resolveMetaAdvancedSettings({
    audienceStrategy: "MANUAL",
    bidding: {
      strategy: "COST_CAP",
      costCap: 12.5,
    },
  });

  assert.equal(resolved.audience.strategy, "MANUAL");
  assert.equal(resolved.audience.mode, "SPECIFIC");
  assert.equal(resolved.audience.advantageAudience, false);
  assert.equal(resolved.audience.allowAgeExpansion, false);
  assert.equal(resolved.audience.allowGenderExpansion, false);
  assert.equal(resolved.bidding.strategy, "COST_CAP");
  assert.equal(resolved.bidding.apiStrategy, "COST_CAP");
  assert.equal(resolved.bidding.costCap, 12.5);
});

test("supports custom Standard Meta attribution windows", () => {
  const resolved = resolveMetaAdvancedSettings({
    attribution: {
      mode: "STANDARD",
      clickWindowDays: 1,
      viewWindowDays: 0,
      engagedViewWindowDays: 1,
    },
  });

  assert.deepEqual(resolved.attribution, {
    mode: "STANDARD",
    model: "STANDARD",
    clickWindowDays: 1,
    viewWindowDays: 0,
    engagedViewWindowDays: 1,
  });
});

test("rejects unsupported Standard attribution windows", () => {
  assert.throws(
    () =>
      resolveMetaAdvancedSettings({
        attribution: {
          mode: "STANDARD",
          clickWindowDays: 28,
          viewWindowDays: 1,
          engagedViewWindowDays: 1,
        },
      }),
    /Meta click attribution window must be 1 or 7 days/
  );
});

test("resolves existing audiences and detailed targeting from Meta selections", () => {
  const resolved = resolveMetaAdvancedSettings({
    audienceStrategy: "ADVANTAGE_PLUS",
    audience: {
      includedAudiences: [
        {
          id: "ca-1",
          name: "Website visitors",
          subtype: "WEBSITE",
          kind: "CUSTOM",
        },
        {
          id: "la-1",
          name: "Lookalike customers",
          subtype: "LOOKALIKE",
          kind: "LOOKALIKE",
        },
      ],
      excludedAudiences: [
        {
          id: "ca-2",
          name: "Purchasers",
          subtype: "WEBSITE",
          kind: "CUSTOM",
        },
      ],
      detailedTargeting: [
        {
          id: "interest-1",
          name: "Running",
          type: "interests",
          path: ["Interests", "Sports"],
        },
        {
          id: "behavior-1",
          name: "Frequent travelers",
          type: "behaviors",
        },
      ],
    },
  });

  assert.deepEqual(
    resolved.audience.includedAudiences.map((item) => ({
      id: item.id,
      kind: item.kind,
    })),
    [
      { id: "ca-1", kind: "CUSTOM" },
      { id: "la-1", kind: "LOOKALIKE" },
    ]
  );
  assert.deepEqual(
    resolved.audience.excludedAudiences.map((item) => item.id),
    ["ca-2"]
  );
  assert.deepEqual(
    resolved.audience.detailedTargeting.map((item) => ({
      id: item.id,
      type: item.type,
    })),
    [
      { id: "interest-1", type: "interests" },
      { id: "behavior-1", type: "behaviors" },
    ]
  );
});

test("defaults Relay placements to Facebook and Instagram feed stories and reels", () => {
  const resolved = resolveMetaAdvancedSettings();

  assert.equal(resolved.placements.mode, "RECOMMENDED");
  assert.deepEqual(
    resolved.placements.publisherPlatforms,
    ["FACEBOOK", "INSTAGRAM"]
  );
  assert.deepEqual(
    resolved.placements.facebook,
    ["FEED", "STORIES", "REELS"]
  );
  assert.deepEqual(
    resolved.placements.instagram,
    ["FEED", "STORIES", "REELS"]
  );
});

test("supports manual Relay placement subsets", () => {
  const resolved = resolveMetaAdvancedSettings({
    placements: {
      mode: "MANUAL",
      facebook: ["FEED", "REELS"],
      instagram: ["STORIES"],
    },
  });

  assert.equal(resolved.placements.mode, "MANUAL");
  assert.deepEqual(
    resolved.placements.publisherPlatforms,
    ["FACEBOOK", "INSTAGRAM"]
  );
  assert.deepEqual(
    resolved.placements.facebook,
    ["FEED", "REELS"]
  );
  assert.deepEqual(
    resolved.placements.instagram,
    ["STORIES"]
  );
});

test("rejects placements for a disabled Meta publisher", () => {
  assert.throws(
    () =>
      resolveMetaAdvancedSettings(
        {
          placements: {
            mode: "MANUAL",
            facebook: [],
            instagram: ["REELS"],
          },
        },
        {
          facebookEnabled: true,
          instagramEnabled: false,
        }
      ),
    /Instagram placements cannot be selected/
  );
});

test("rejects an unsupported Meta audience strategy", () => {
  assert.throws(
    () =>
      resolveMetaAdvancedSettings({
        audienceStrategy: "MAGIC",
      }),
    /Unsupported Meta audience strategy/
  );
});

test("rejects an unsupported Meta detailed targeting type", () => {
  assert.throws(
    () =>
      resolveMetaAdvancedSettings({
        audience: {
          detailedTargeting: [
            {
              id: "unsupported-1",
              name: "Unsupported",
              type: "made_up_type",
            },
          ],
        },
      }),
    /Unsupported Meta detailed targeting type/
  );
});

test("requires a positive cost cap when Cost Cap bidding is selected", () => {
  assert.throws(
    () =>
      resolveMetaAdvancedSettings({
        bidding: {
          strategy: "COST_CAP",
          costCap: 0,
        },
      }),
    /Meta cost cap must be greater than 0/
  );
});
