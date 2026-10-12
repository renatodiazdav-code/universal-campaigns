import test from "node:test";
import assert from "node:assert/strict";

import {
  browseMetaDetailedTargeting,
  listMetaExistingAudiences,
  searchMetaDetailedTargeting,
} from "../src/connectors/meta/audience-discovery.mjs";

function jsonResponse(body, { ok = true } = {}) {
  return {
    ok,
    async json() {
      return body;
    },
  };
}

test("loads existing Meta Custom and Lookalike Audiences from the ad account", async () => {
  let capturedUrl = null;

  const audiences = await listMetaExistingAudiences({
    adAccountId: "123",
    accessToken: "token",
    fetchImpl: async (url) => {
      capturedUrl = new URL(url);
      return jsonResponse({
        data: [
          {
            id: "ca-1",
            name: "Website visitors",
            subtype: "WEBSITE",
            approximate_count_lower_bound: 1000,
            approximate_count_upper_bound: 1500,
          },
          {
            id: "la-1",
            name: "Lookalike customers",
            subtype: "LOOKALIKE",
          },
        ],
      });
    },
  });

  assert.equal(capturedUrl.pathname, "/v26.0/act_123/customaudiences");
  assert.match(capturedUrl.searchParams.get("fields"), /subtype/);
  assert.equal(capturedUrl.searchParams.get("access_token"), "token");

  assert.deepEqual(
    audiences.map(({ id, name, kind, subtype }) => ({
      id,
      name,
      kind,
      subtype,
    })),
    [
      {
        id: "ca-1",
        name: "Website visitors",
        kind: "CUSTOM",
        subtype: "WEBSITE",
      },
      {
        id: "la-1",
        name: "Lookalike customers",
        kind: "LOOKALIKE",
        subtype: "LOOKALIKE",
      },
    ]
  );
});

test("searches real Meta detailed-targeting entities for Sales conversions", async () => {
  let capturedUrl = null;

  const options = await searchMetaDetailedTargeting({
    adAccountId: "act_123",
    accessToken: "token",
    query: "running",
    countries: ["US"],
    fetchImpl: async (url) => {
      capturedUrl = new URL(url);
      return jsonResponse({
        data: [
          {
            id: "interest-1",
            name: "Running",
            type: "interests",
            path: ["Interests", "Sports"],
          },
          {
            id: "behavior-1",
            name: "Frequent travelers",
            type: "behaviors",
          },
          {
            id: "unsupported-1",
            name: "Unsupported",
            type: "unsupported_type",
          },
        ],
      });
    },
  });

  assert.equal(capturedUrl.pathname, "/v26.0/act_123/targetingsearch");
  assert.equal(capturedUrl.searchParams.get("q"), "running");
  assert.equal(capturedUrl.searchParams.get("objective"), "OUTCOME_SALES");
  assert.equal(
    capturedUrl.searchParams.get("optimization_goal"),
    "OFFSITE_CONVERSIONS"
  );
  assert.deepEqual(
    JSON.parse(capturedUrl.searchParams.get("countries")),
    ["US"]
  );
  assert.ok(
    JSON.parse(
      capturedUrl.searchParams.get("whitelisted_types")
    ).includes("interests")
  );

  assert.deepEqual(
    options.map(({ id, name, type }) => ({ id, name, type })),
    [
      {
        id: "interest-1",
        name: "Running",
        type: "interests",
      },
      {
        id: "behavior-1",
        name: "Frequent travelers",
        type: "behaviors",
      },
    ]
  );
});

test("browses Meta demographics instead of using a hardcoded Relay catalogue", async () => {
  let capturedUrl = null;

  const options = await browseMetaDetailedTargeting({
    adAccountId: "123",
    accessToken: "token",
    group: "DEMOGRAPHICS",
    fetchImpl: async (url) => {
      capturedUrl = new URL(url);
      return jsonResponse({
        data: [
          {
            id: "parent-1",
            name: "Parents",
            type: "family_statuses",
            path: ["Demographics", "Parents"],
          },
        ],
      });
    },
  });

  assert.equal(capturedUrl.pathname, "/v26.0/act_123/targetingbrowse");
  const whitelist = JSON.parse(
    capturedUrl.searchParams.get("whitelisted_types")
  );
  assert.ok(whitelist.includes("family_statuses"));
  assert.equal(whitelist.includes("interests"), false);
  assert.equal(options[0].name, "Parents");
  assert.equal(options[0].type, "family_statuses");
});
