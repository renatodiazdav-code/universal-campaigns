import test from "node:test";
import assert from "node:assert/strict";

import { inspectMetaPurchaseHealth } from "../src/application/inspect-meta-purchase-health.mjs";

const NOW = new Date("2026-10-11T13:08:47.000Z");
const PIXEL = {
  id: "pixel-1",
  name: "Store Pixel",
};

function recentDetails() {
  return Promise.resolve({
    id: "pixel-1",
    name: "Store Pixel",
    last_fired_time: "2026-10-11T12:00:00+0000",
  });
}

test("marks Purchase health READY when recent Purchase events are observed", async () => {
  const result = await inspectMetaPurchaseHealth({
    pixel: PIXEL,
    accessToken: "fake-token",
    getPixelDetails: recentDetails,
    getPixelEventStats: async () => [
      {
        aggregation: "event",
        data: [
          {
            event: "Purchase",
            count: 2,
          },
        ],
      },
    ],
    now: NOW,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.recentEventCount, 2);
  assert.equal(result.pixel.lastFiredTime, "2026-10-11T12:00:00+0000");
});

test("marks Purchase health NOT_OBSERVED when Pixel is active but no Purchase is seen", async () => {
  const result = await inspectMetaPurchaseHealth({
    pixel: PIXEL,
    accessToken: "fake-token",
    getPixelDetails: recentDetails,
    getPixelEventStats: async () => [],
    now: NOW,
  });

  assert.equal(result.status, "NOT_OBSERVED");
  assert.equal(result.recentEventCount, 0);
});

test("marks Purchase health NEEDS_CHECK when the Pixel has not fired in the checked window", async () => {
  const result = await inspectMetaPurchaseHealth({
    pixel: PIXEL,
    accessToken: "fake-token",
    getPixelDetails: async () => ({
      id: "pixel-1",
      name: "Store Pixel",
      last_fired_time: "2026-01-14T15:50:10-0500",
    }),
    getPixelEventStats: async () => [],
    now: NOW,
  });

  assert.equal(result.status, "NEEDS_CHECK");
  assert.equal(result.recentEventCount, 0);
  assert.match(result.message, /has not fired recently/i);
});

test("marks Purchase health UNVERIFIED when Meta stats cannot be queried", async () => {
  const result = await inspectMetaPurchaseHealth({
    pixel: PIXEL,
    accessToken: "fake-token",
    getPixelDetails: recentDetails,
    getPixelEventStats: async () => {
      throw new Error("Meta stats unavailable");
    },
    now: NOW,
  });

  assert.equal(result.status, "UNVERIFIED");
  assert.match(result.error, /Meta stats unavailable/);
});
