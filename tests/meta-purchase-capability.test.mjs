import test from "node:test";
import assert from "node:assert/strict";

import { deriveMetaCapabilities } from "../src/application/derive-meta-capabilities.mjs";

function snapshotWithPurchaseStatus(status, message) {
  return {
    version: 1,
    status: "READY",
    checkedAt: "2026-10-11T13:08:47.000Z",
    adAccount: {
      status: "READY",
      selected: { id: "act_123", account_status: 1, currency: "PEN" },
    },
    facebookPage: {
      status: "READY",
      selected: { id: "page-1", name: "Store Page" },
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
        selected: { id: "pixel-1", name: "Store Pixel" },
        pixels: [{ id: "pixel-1", name: "Store Pixel" }],
        count: 1,
      },
      purchaseEvent: {
        status,
        message,
      },
    },
  };
}

test("keeps stale Purchase tracking as UNKNOWN instead of blocking Sales setup", () => {
  const message =
    "The selected Meta Pixel/Dataset has not fired recently. Verify store tracking before activating ad spend.";

  const result = deriveMetaCapabilities(
    snapshotWithPurchaseStatus("NEEDS_CHECK", message)
  );

  assert.equal(
    result.capabilities.canRunFacebookSales.status,
    "AVAILABLE"
  );
  assert.equal(
    result.capabilities.canOptimizeForPurchase.status,
    "UNKNOWN"
  );
  assert.equal(
    result.capabilities.canOptimizeForPurchase.reason,
    message
  );
});
