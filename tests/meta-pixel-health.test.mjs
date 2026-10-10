import test from "node:test";
import assert from "node:assert/strict";

import {
  getMetaPixelDetails,
  getMetaPixelEventStats,
} from "../src/connectors/meta/pixel-health.mjs";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test("reads Meta pixel details including last fired time", async () => {
  let requestedUrl = null;

  const details = await getMetaPixelDetails({
    pixelId: "pixel-123",
    accessToken: "fake-token",
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return jsonResponse({
        id: "pixel-123",
        name: "Store Pixel",
        last_fired_time: "2026-10-10T20:00:00+0000",
      });
    },
  });

  assert.equal(details.id, "pixel-123");
  assert.equal(details.name, "Store Pixel");
  assert.equal(
    details.last_fired_time,
    "2026-10-10T20:00:00+0000"
  );
  assert.equal(requestedUrl.pathname, "/v26.0/pixel-123");
  assert.equal(
    requestedUrl.searchParams.get("fields"),
    "id,name,last_fired_time"
  );
  assert.equal(
    requestedUrl.searchParams.get("access_token"),
    "fake-token"
  );
});

test("queries Purchase event stats for an exact time window", async () => {
  let requestedUrl = null;

  const stats = await getMetaPixelEventStats({
    pixelId: "pixel-123",
    accessToken: "fake-token",
    event: "Purchase",
    startTime: new Date("2026-10-03T21:00:00.000Z"),
    endTime: new Date("2026-10-10T21:00:00.000Z"),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return jsonResponse({
        data: [
          {
            aggregation: "event",
            data: [{ event: "Purchase", count: 2 }],
          },
        ],
      });
    },
  });

  assert.equal(requestedUrl.pathname, "/v26.0/pixel-123/stats");
  assert.equal(requestedUrl.searchParams.get("aggregation"), "event");
  assert.equal(requestedUrl.searchParams.get("event"), "Purchase");
  assert.equal(
    requestedUrl.searchParams.get("start_time"),
    "1791061200"
  );
  assert.equal(
    requestedUrl.searchParams.get("end_time"),
    "1791666000"
  );
  assert.equal(
    requestedUrl.searchParams.get("access_token"),
    "fake-token"
  );
  assert.equal(stats.length, 1);
});

test("surfaces Meta errors from pixel stats without inventing health", async () => {
  await assert.rejects(
    () =>
      getMetaPixelEventStats({
        pixelId: "pixel-123",
        accessToken: "fake-token",
        event: "Purchase",
        startTime: new Date("2026-10-03T21:00:00.000Z"),
        endTime: new Date("2026-10-10T21:00:00.000Z"),
        fetchImpl: async () =>
          jsonResponse(
            {
              error: {
                message: "Unsupported request",
                code: 100,
              },
            },
            {
              ok: false,
              status: 400,
            }
          ),
      }),
    /Meta get pixel event stats failed/
  );
});
