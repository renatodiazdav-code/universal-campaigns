import test from "node:test";
import assert from "node:assert/strict";

import {
  getMetaCampaignInsights,
} from "../src/connectors/meta/insights.mjs";

test("requests campaign-level Meta Insights with Relay MVP fields", async () => {
  let requestedUrl = "";

  const fetchImpl = async (url) => {
    requestedUrl = String(url);

    return {
      ok: true,
      async json() {
        return {
          data: [
            {
              spend: "10.00",
            },
          ],
        };
      },
    };
  };

  const result = await getMetaCampaignInsights({
    campaignId: "campaign-123",
    accessToken: "fake-token",
    fetchImpl,
  });

  const url = new URL(requestedUrl);

  assert.equal(
    url.pathname,
    "/v26.0/campaign-123/insights"
  );
  assert.equal(
    url.searchParams.get("date_preset"),
    "maximum"
  );
  assert.equal(
    url.searchParams.get("action_report_time"),
    "conversion"
  );
  assert.equal(
    url.searchParams.get("breakdowns"),
    null
  );
  assert.match(
    url.searchParams.get("fields"),
    /spend/
  );
  assert.match(
    url.searchParams.get("fields"),
    /actions/
  );
  assert.match(
    url.searchParams.get("fields"),
    /action_values/
  );
  assert.deepEqual(result, [
    {
      spend: "10.00",
    },
  ]);
});

test("supports Meta publisher platform breakdown", async () => {
  let requestedUrl = "";

  const fetchImpl = async (url) => {
    requestedUrl = String(url);

    return {
      ok: true,
      async json() {
        return {
          data: [],
        };
      },
    };
  };

  await getMetaCampaignInsights({
    campaignId: "campaign-123",
    accessToken: "fake-token",
    breakdowns: ["publisher_platform"],
    fetchImpl,
  });

  const url = new URL(requestedUrl);

  assert.equal(
    url.searchParams.get("breakdowns"),
    "publisher_platform"
  );
});
