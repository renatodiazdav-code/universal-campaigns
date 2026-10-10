import test from "node:test";
import assert from "node:assert/strict";

import { checkMetaCampaignPreflight } from "../src/application/check-meta-campaign-preflight.mjs";

function campaign({ facebook = true, instagram = false } = {}) {
  return {
    platforms: {
      meta: {
        enabled: facebook || instagram,
        facebook,
        instagram,
      },
    },
  };
}

function capability(status, reason = null) {
  return {
    status,
    available: status === "AVAILABLE",
    reason,
  };
}

function capabilities({
  create = "AVAILABLE",
  facebook = "AVAILABLE",
  instagram = "NEEDS_SETUP",
  purchase = "UNKNOWN",
} = {}) {
  return {
    version: 1,
    status: "PARTIAL",
    sourceCheckedAt: "2026-10-10T21:15:59.639Z",
    capabilities: {
      canCreateCampaigns: capability(create),
      canRunFacebookSales: capability(facebook),
      canRunInstagramSales: capability(
        instagram,
        instagram === "NEEDS_SETUP"
          ? "No Instagram identity is connected to this Meta advertising setup."
          : null
      ),
      canUseSelectedPixel: capability("AVAILABLE"),
      canOptimizeForPurchase: capability(
        purchase,
        purchase === "UNKNOWN"
          ? "Relay has a Pixel/Dataset, but Purchase event health has not been verified yet."
          : null
      ),
    },
  };
}

test("allows Facebook-only Sales with a warning when Purchase health is unknown", () => {
  const result = checkMetaCampaignPreflight({
    campaign: campaign({ facebook: true, instagram: false }),
    metaCapabilities: capabilities(),
  });

  assert.equal(result.status, "READY_WITH_WARNINGS");
  assert.equal(result.ready, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.equal(
    result.warnings[0].id,
    "META_PURCHASE_OPTIMIZATION"
  );
});

test("blocks an Instagram Sales campaign when Instagram identity needs setup", () => {
  const result = checkMetaCampaignPreflight({
    campaign: campaign({ facebook: true, instagram: true }),
    metaCapabilities: capabilities(),
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.ready, false);
  assert.equal(result.blockers.length, 1);
  assert.equal(
    result.blockers[0].id,
    "META_INSTAGRAM_SALES"
  );
});

test("returns READY when every required Meta capability is available", () => {
  const result = checkMetaCampaignPreflight({
    campaign: campaign({ facebook: true, instagram: true }),
    metaCapabilities: capabilities({
      instagram: "AVAILABLE",
      purchase: "AVAILABLE",
    }),
  });

  assert.equal(result.status, "READY");
  assert.equal(result.ready, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length, 0);
});

test("returns NOT_APPLICABLE when Meta is disabled", () => {
  const result = checkMetaCampaignPreflight({
    campaign: campaign({ facebook: false, instagram: false }),
    metaCapabilities: capabilities(),
  });

  assert.equal(result.status, "NOT_APPLICABLE");
  assert.equal(result.ready, true);
  assert.deepEqual(result.checks, []);
});
