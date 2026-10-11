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
