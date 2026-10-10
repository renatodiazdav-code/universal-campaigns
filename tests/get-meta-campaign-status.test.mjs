import test from "node:test";
import assert from "node:assert/strict";

import {
  getMetaCampaignStatus,
} from "../src/application/get-meta-campaign-status.mjs";

test("gets the real Meta status for a stored Relay campaign", async () => {
  const calls = [];

  const fakeMeta = {
    async getCampaign(id) {
      calls.push(["campaign", id]);

      return {
        id,
        name: "Test Sneakers Campaign",
        status: "PAUSED",
        effective_status: "PAUSED",
      };
    },

    async getAdSet(id) {
      calls.push(["adSet", id]);

      return {
        id,
        name: "Test Sneakers Ad Set",
        status: "PAUSED",
        effective_status: "PAUSED",
      };
    },

    async getAd(id) {
      calls.push(["ad", id]);

      return {
        id,
        name: "Test Sneakers Ad",
        status: "PAUSED",
        effective_status: "PAUSED",
      };
    },
  };

  const result =
    await getMetaCampaignStatus({
      storedCampaign: {
        execution: {
          meta: {
            campaignId: "campaign-123",
            adSetId: "adset-123",
            adId: "ad-123",
          },
        },
      },

      connection: null,

      metaClient: fakeMeta,
    });

  assert.deepEqual(calls, [
    ["campaign", "campaign-123"],
    ["adSet", "adset-123"],
    ["ad", "ad-123"],
  ]);

  assert.equal(
    result.campaign.effectiveStatus,
    "PAUSED"
  );

  assert.equal(
    result.adSet.effectiveStatus,
    "PAUSED"
  );

  assert.equal(
    result.ad.effectiveStatus,
    "PAUSED"
  );

  assert.ok(result.checkedAt);
});