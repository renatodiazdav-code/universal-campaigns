import test from "node:test";
import assert from "node:assert/strict";

import { resolveMetaAdvancedSettings } from "../src/adapters/meta/advanced-settings.mjs";

test("defaults Meta to Advantage+ audience and lowest cost bidding", () => {
  const resolved = resolveMetaAdvancedSettings();

  assert.equal(
    resolved.audience.strategy,
    "ADVANTAGE_PLUS"
  );
  assert.equal(resolved.audience.advantageAudience, true);
  assert.equal(resolved.audience.allowAgeExpansion, false);
  assert.equal(resolved.audience.allowGenderExpansion, false);

  assert.equal(resolved.bidding.strategy, "LOWEST_COST");
  assert.equal(
    resolved.bidding.apiStrategy,
    "LOWEST_COST_WITHOUT_CAP"
  );
  assert.equal(resolved.bidding.costCap, null);
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

test("supports manual audience and a positive Meta cost cap", () => {
  const resolved = resolveMetaAdvancedSettings({
    audienceStrategy: "MANUAL",
    bidding: {
      strategy: "COST_CAP",
      costCap: 12.5,
    },
  });

  assert.equal(resolved.audience.strategy, "MANUAL");
  assert.equal(resolved.audience.advantageAudience, false);
  assert.equal(resolved.bidding.strategy, "COST_CAP");
  assert.equal(resolved.bidding.apiStrategy, "COST_CAP");
  assert.equal(resolved.bidding.costCap, 12.5);
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
