import test from "node:test";
import assert from "node:assert/strict";

import { deriveMetaCapabilities } from "../src/application/derive-meta-capabilities.mjs";

function createSnapshot(overrides = {}) {
  return {
    version: 1,
    status: "READY",
    checkedAt: "2026-10-10T21:16:10.235Z",

    adAccount: {
      status: "READY",
      selected: {
        id: "act_123",
        account_status: 1,
        currency: "PEN",
      },
    },

    facebookPage: {
      status: "READY",
      selected: {
        id: "page-123",
        name: "Test Page",
      },
    },

    instagram: {
      status: "NONE_FOUND",
      selected: null,
      accounts: [],
      count: 0,
    },

    tracking: {
      pixel: {
        status: "READY",
        selected: {
          id: "pixel-123",
          name: "Test Pixel",
        },
        pixels: [
          {
            id: "pixel-123",
            name: "Test Pixel",
          },
        ],
        count: 1,
      },
      purchaseEvent: {
        status: "NOT_CHECKED",
      },
    },

    ...overrides,
  };
}

test("derives partial capabilities for a valid Facebook setup without Instagram", () => {
  const result = deriveMetaCapabilities(createSnapshot());

  assert.equal(result.status, "PARTIAL");
  assert.equal(
    result.capabilities.canCreateCampaigns.status,
    "AVAILABLE"
  );
  assert.equal(
    result.capabilities.canRunFacebookSales.status,
    "AVAILABLE"
  );
  assert.equal(
    result.capabilities.canRunInstagramSales.status,
    "NEEDS_SETUP"
  );
  assert.equal(
    result.capabilities.canUseSelectedPixel.status,
    "AVAILABLE"
  );
  assert.equal(
    result.capabilities.canOptimizeForPurchase.status,
    "UNKNOWN"
  );
});

test("returns READY when all Meta sales capabilities are verified", () => {
  const snapshot = createSnapshot({
    instagram: {
      status: "READY",
      selected: {
        id: "ig-123",
        username: "teststore",
      },
      accounts: [
        {
          id: "ig-123",
          username: "teststore",
        },
      ],
      count: 1,
    },
    tracking: {
      pixel: {
        status: "READY",
        selected: {
          id: "pixel-123",
          name: "Test Pixel",
        },
        pixels: [
          {
            id: "pixel-123",
            name: "Test Pixel",
          },
        ],
        count: 1,
      },
      purchaseEvent: {
        status: "READY",
      },
    },
  });

  const result = deriveMetaCapabilities(snapshot);

  assert.equal(result.status, "READY");

  for (const capability of Object.values(result.capabilities)) {
    assert.equal(capability.status, "AVAILABLE");
    assert.equal(capability.available, true);
  }
});

test("propagates a missing Pixel into Sales and Purchase capabilities", () => {
  const snapshot = createSnapshot({
    tracking: {
      pixel: {
        status: "NONE_FOUND",
        selected: null,
        pixels: [],
        count: 0,
      },
      purchaseEvent: {
        status: "NOT_CHECKED",
      },
    },
  });

  const result = deriveMetaCapabilities(snapshot);

  assert.equal(
    result.capabilities.canRunFacebookSales.status,
    "NEEDS_SETUP"
  );
  assert.equal(
    result.capabilities.canUseSelectedPixel.status,
    "NEEDS_SETUP"
  );
  assert.equal(
    result.capabilities.canOptimizeForPurchase.status,
    "NEEDS_SETUP"
  );
});

test("propagates Pixel selection requirements instead of treating them as missing", () => {
  const snapshot = createSnapshot({
    tracking: {
      pixel: {
        status: "NEEDS_SELECTION",
        selected: null,
        pixels: [
          { id: "pixel-1" },
          { id: "pixel-2" },
        ],
        count: 2,
      },
      purchaseEvent: {
        status: "NOT_CHECKED",
      },
    },
  });

  const result = deriveMetaCapabilities(snapshot);

  assert.equal(
    result.capabilities.canRunFacebookSales.status,
    "NEEDS_SELECTION"
  );
  assert.equal(
    result.capabilities.canUseSelectedPixel.status,
    "NEEDS_SELECTION"
  );
  assert.equal(
    result.capabilities.canOptimizeForPurchase.status,
    "NEEDS_SELECTION"
  );
});

test("returns setup requirements when Meta is not connected", () => {
  const result = deriveMetaCapabilities({
    status: "NOT_CONNECTED",
  });

  assert.equal(result.status, "NOT_CONNECTED");

  for (const capability of Object.values(result.capabilities)) {
    assert.equal(capability.status, "NEEDS_SETUP");
    assert.equal(capability.available, false);
  }
});
