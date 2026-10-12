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
    audience: {
      mode: "ADVANTAGE_PLUS",
      includedAudiences: [],
      excludedAudiences: [],
      detailedTargeting: [],
    },
    bidding: {
      strategy: "LOWEST_COST",
    },
    attribution: {
      mode: "AUTO",
    },
    placements: {
      mode: "RECOMMENDED",
    },
  });
});

test("maps specific audience selections cost cap custom attribution and manual placements", () => {
  const overrides = buildMetaOverridesFromForm({
    audienceStrategy: "MANUAL",
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
    ],
    biddingStrategy: "COST_CAP",
    costCap: "17.50",
    attributionMode: "STANDARD",
    clickAttributionDays: "1",
    viewAttributionDays: "0",
    engagedViewAttributionDays: "1",
    placementsMode: "MANUAL",
    facebookPositions: ["FEED", "REELS"],
    instagramPositions: ["STORIES"],
  });

  assert.deepEqual(overrides, {
    audienceStrategy: "MANUAL",
    audience: {
      mode: "SPECIFIC",
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
      ],
    },
    bidding: {
      strategy: "COST_CAP",
      costCap: 17.5,
    },
    attribution: {
      mode: "STANDARD",
      clickWindowDays: 1,
      viewWindowDays: 0,
      engagedViewWindowDays: 1,
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
      audienceStrategy: "ADVANTAGE_PLUS",
      biddingStrategy: "COST_CAP",
      costCap: 0,
      attributionMode: "AUTO",
      placementsMode: "RECOMMENDED",
    }),
    {
      valid: false,
      error: "Cost cap must be greater than 0.",
    }
  );

  assert.deepEqual(
    validateMetaAdvancedForm({
      audienceStrategy: "ADVANTAGE_PLUS",
      biddingStrategy: "LOWEST_COST",
      attributionMode: "AUTO",
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

test("validates Standard attribution windows", () => {
  assert.deepEqual(
    validateMetaAdvancedForm({
      audienceStrategy: "ADVANTAGE_PLUS",
      biddingStrategy: "LOWEST_COST",
      attributionMode: "STANDARD",
      clickAttributionDays: "7",
      viewAttributionDays: "1",
      engagedViewAttributionDays: "1",
      placementsMode: "RECOMMENDED",
    }),
    {
      valid: true,
      error: null,
    }
  );

  assert.deepEqual(
    validateMetaAdvancedForm({
      audienceStrategy: "ADVANTAGE_PLUS",
      biddingStrategy: "LOWEST_COST",
      attributionMode: "STANDARD",
      clickAttributionDays: "3",
      viewAttributionDays: "1",
      engagedViewAttributionDays: "1",
      placementsMode: "RECOMMENDED",
    }),
    {
      valid: false,
      error: "Click attribution must be 1 or 7 days.",
    }
  );
});
