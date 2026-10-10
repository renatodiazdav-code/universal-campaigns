import test from "node:test";
import assert from "node:assert/strict";

import { createMetaClient } from "../src/connectors/meta/client.mjs";

function createJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test("encodes Relay gender and Meta publisher selection in ad set targeting", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return createJsonResponse({ id: "adset-123" });
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    await meta.createAdSet({
      name: "Test Ad Set",
      campaignId: "campaign-123",
      budgetMode: "TOTAL",
      lifetimeBudget: 5000,
      startTime: "2026-10-10T12:00:00.000Z",
      endTime: "2026-10-17T12:00:00.000Z",
      countries: ["PE"],
      ageMin: 18,
      ageMax: 35,
      gender: "MALE",
      publisherPlatforms: ["INSTAGRAM"],
      optimizationGoal: "OFFSITE_CONVERSIONS",
      pixelId: "pixel-123",
      conversionEvent: "PURCHASE",
      status: "PAUSED",
    });

    assert.equal(calls.length, 1);

    const body = calls[0].options.body;
    const targeting = JSON.parse(body.get("targeting"));

    assert.deepEqual(targeting.geo_locations.countries, ["PE"]);
    assert.equal(targeting.age_min, 18);
    assert.equal(targeting.age_max, 35);
    assert.deepEqual(targeting.genders, [1]);
    assert.deepEqual(targeting.publisher_platforms, ["instagram"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("omits gender restriction for Everyone targeting", async () => {
  const originalFetch = globalThis.fetch;
  let capturedTargeting = null;

  globalThis.fetch = async (_url, options = {}) => {
    capturedTargeting = JSON.parse(options.body.get("targeting"));
    return createJsonResponse({ id: "adset-123" });
  };

  try {
    const meta = createMetaClient({
      adAccountId: "act_123",
      accessToken: "fake-token",
    });

    await meta.createAdSet({
      name: "Test Ad Set",
      campaignId: "campaign-123",
      budgetMode: "TOTAL",
      lifetimeBudget: 5000,
      startTime: "2026-10-10T12:00:00.000Z",
      endTime: "2026-10-17T12:00:00.000Z",
      countries: ["PE"],
      ageMin: 18,
      ageMax: 35,
      gender: "ALL",
      publisherPlatforms: ["FACEBOOK", "INSTAGRAM"],
      optimizationGoal: "OFFSITE_CONVERSIONS",
      pixelId: "pixel-123",
      conversionEvent: "PURCHASE",
      status: "PAUSED",
    });

    assert.equal("genders" in capturedTargeting, false);
    assert.deepEqual(
      capturedTargeting.publisher_platforms,
      ["facebook", "instagram"]
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
