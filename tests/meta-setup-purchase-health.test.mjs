import test from "node:test";
import assert from "node:assert/strict";

import { inspectMetaSetup } from "../src/application/inspect-meta-setup.mjs";

function connection() {
  return {
    accessToken: "fake-token",
    setup: {
      status: "READY",
      business: { id: "business-1", name: "Store Business" },
      adAccount: {
        id: "act_123",
        name: "Store Ads",
        account_status: 1,
        currency: "PEN",
      },
      page: { id: "page-1", name: "Store Page" },
    },
    salesSetup: {
      pixel: { id: "pixel-1", name: "Store Pixel" },
    },
  };
}

function meta() {
  return {
    async getBusinessAdAccounts() {
      return [
        {
          id: "act_123",
          name: "Store Ads",
          account_status: 1,
          currency: "PEN",
        },
      ];
    },
    async getBusinessPages() {
      return [{ id: "page-1", name: "Store Page" }];
    },
    async getAdAccountPixels() {
      return [{ id: "pixel-1", name: "Store Pixel" }];
    },
  };
}

async function noInstagramAccounts() {
  return [];
}

test("adds a warning when the selected Meta Pixel has stale activity", async () => {
  const result = await inspectMetaSetup({
    connection: connection(),
    meta: meta(),
    getInstagramAccounts: noInstagramAccounts,
    getPixelDetails: async () => ({
      id: "pixel-1",
      name: "Store Pixel",
      last_fired_time: "2026-01-14T15:50:10-0500",
    }),
    getPixelEventStats: async () => [],
    now: new Date("2026-10-11T13:08:47.000Z"),
  });

  assert.equal(result.status, "READY");
  assert.equal(result.tracking.purchaseEvent.status, "NEEDS_CHECK");
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "META_PIXEL_ACTIVITY_STALE" &&
        issue.severity === "WARNING"
    )
  );
});

test("marks Purchase tracking READY when Meta reports recent Purchase events", async () => {
  const result = await inspectMetaSetup({
    connection: connection(),
    meta: meta(),
    getInstagramAccounts: noInstagramAccounts,
    getPixelDetails: async () => ({
      id: "pixel-1",
      name: "Store Pixel",
      last_fired_time: "2026-10-11T12:00:00+0000",
    }),
    getPixelEventStats: async () => [
      {
        data: [{ event: "Purchase", count: 1 }],
      },
    ],
    now: new Date("2026-10-11T13:08:47.000Z"),
  });

  assert.equal(result.tracking.purchaseEvent.status, "READY");
  assert.equal(result.tracking.purchaseEvent.recentEventCount, 1);
  assert.equal(
    result.issues.some((issue) => issue.code === "META_PIXEL_ACTIVITY_STALE"),
    false
  );
});
