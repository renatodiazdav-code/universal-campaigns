import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMetaOverridesFromForm,
  createDefaultMetaAdvancedForm,
  resolveEffectiveMetaPublishers,
  validateMetaAdvancedForm,
} from "../src/application/meta-advanced-form.mjs";

test("maps default Meta advanced form to Relay recommended overrides", () => {
  const form = createDefaultMetaAdvancedForm();
  const overrides = buildMetaOverridesFromForm(form);

  assert.deepEqual(overrides, {
    audienceStrategy: "ADVANTAGE_PLUS",
    bidding: {
      strategy: "LOWEST_COST",
    },
    placements: {
      mode: "RECOMMENDED",
    },
  });
});

test("maps manual audience cost cap and manual placements", () => {
  const overrides = buildMetaOverridesFromForm({
    audienceStrategy: "MANUAL",
    biddingStrategy: "COST_CAP",
    costCap: "17.50",
    placementsMode: "MANUAL",
    facebookPositions: ["FEED", "REELS"],
    instagramPositions: ["STORIES"],
  });

  assert.deepEqual(overrides, {
    audienceStrategy: "MANUAL",
    bidding: {
      strategy: "COST_CAP",
      costCap: 17.5,
    },
    placements: {
      mode: "MANUAL",
      facebook: ["FEED", "REELS"],
      instagram: ["STORIES"],
    },
  });
});

test("manual placements disable a publisher when none of its placements remain", () => {
  const publishers = resolveEffectiveMetaPublishers({
    metaEnabled: true,
    facebookEnabled: true,
    instagramEnabled: true,
    form: {
      placementsMode: "MANUAL",
      facebookPositions: ["FEED"],
      instagramPositions: [],
    },
  });

  assert.deepEqual(publishers, {
    enabled: true,
    facebook: true,
    instagram: false,
  });
});

test("rejects invalid cost cap and empty manual placements", () => {
  assert.deepEqual(
    validateMetaAdvancedForm({
      biddingStrategy: "COST_CAP",
      costCap: 0,
      placementsMode: "RECOMMENDED",
    }),
    {
      valid: false,
      error: "Cost cap must be greater than 0.",
    }
  );

  assert.deepEqual(
    validateMetaAdvancedForm({
      biddingStrategy: "LOWEST_COST",
      placementsMode: "MANUAL",
      facebookPositions: [],
      instagramPositions: [],
    }),
    {
      valid: false,
      error: "Select at least one Facebook or Instagram placement.",
    }
  );
});
