import test from "node:test";
import assert from "node:assert/strict";

import {
  getMetaCampaignPerformance,
} from "../src/application/get-meta-campaign-performance.mjs";

test("normalizes Meta insights into simple Relay performance metrics", async () => {
  const calls = [];

  const fakeMeta = {
    async getCampaignInsights(
      campaignId,
      options = {}
    ) {
      calls.push({ campaignId, options });

      if (
        options.breakdowns?.includes(
          "publisher_platform"
        )
      ) {
        return [
          {
            publisher_platform: "facebook",
            spend: "50.00",
            impressions: "8000",
            clicks: "200",
            account_currency: "PEN",
            actions: [
              {
                action_type:
                  "offsite_conversion.fb_pixel_purchase",
                value: "4",
              },
            ],
            action_values: [
              {
                action_type:
                  "offsite_conversion.fb_pixel_purchase",
                value: "300.00",
              },
            ],
          },
          {
            publisher_platform: "instagram",
            spend: "34.00",
            impressions: "4500",
            clicks: "140",
            account_currency: "PEN",
            actions: [
              {
                action_type:
                  "offsite_conversion.fb_pixel_purchase",
                value: "2",
              },
            ],
            action_values: [
              {
                action_type:
                  "offsite_conversion.fb_pixel_purchase",
                value: "120.00",
              },
            ],
          },
        ];
      }

      return [
        {
          campaign_id: campaignId,
          campaign_name: "Test Sneakers Campaign",
          spend: "84.00",
          impressions: "12500",
          clicks: "340",
          account_currency: "PEN",
          date_start: "2026-10-01",
          date_stop: "2026-10-10",
          actions: [
            {
              action_type: "omni_purchase",
              value: "7",
            },
            {
              action_type:
                "offsite_conversion.fb_pixel_purchase",
              value: "6",
            },
          ],
          action_values: [
            {
              action_type: "omni_purchase",
              value: "490.00",
            },
            {
              action_type:
                "offsite_conversion.fb_pixel_purchase",
              value: "420.00",
            },
          ],
        },
      ];
    },
  };

  const result =
    await getMetaCampaignPerformance({
      storedCampaign: {
        execution: {
          meta: {
            campaignId: "campaign-123",
          },
        },
      },
      connection: null,
      metaClient: fakeMeta,
    });

  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].campaignId,
    "campaign-123"
  );
  assert.deepEqual(
    calls[1].options.breakdowns,
    ["publisher_platform"]
  );

  assert.equal(result.platform, "META");
  assert.equal(result.metrics.spend, 84);
  assert.equal(result.metrics.sales, 6);
  assert.equal(result.metrics.revenue, 420);
  assert.equal(result.metrics.costPerSale, 14);
  assert.equal(result.metrics.roas, 5);
  assert.equal(result.metrics.impressions, 12500);
  assert.equal(result.metrics.clicks, 340);
  assert.equal(result.metrics.currency, "PEN");

  assert.equal(
    result.breakdowns.publisherPlatform.length,
    2
  );
  assert.equal(
    result.breakdowns.publisherPlatform[0].name,
    "Facebook"
  );
  assert.equal(
    result.breakdowns.publisherPlatform[0]
      .metrics.sales,
    4
  );
  assert.equal(
    result.breakdowns.publisherPlatform[1].name,
    "Instagram"
  );
  assert.equal(
    result.breakdowns.publisherPlatform[1]
      .metrics.roas,
    120 / 34
  );

  assert.ok(result.checkedAt);
});

test("returns empty performance when Meta has no insights yet", async () => {
  const fakeMeta = {
    async getCampaignInsights() {
      return [];
    },
  };

  const result =
    await getMetaCampaignPerformance({
      storedCampaign: {
        execution: {
          meta: {
            campaignId: "campaign-123",
          },
        },
      },
      connection: null,
      metaClient: fakeMeta,
    });

  assert.equal(result.metrics.spend, 0);
  assert.equal(result.metrics.sales, 0);
  assert.equal(result.metrics.revenue, 0);
  assert.equal(result.metrics.costPerSale, null);
  assert.equal(result.metrics.roas, null);
  assert.deepEqual(
    result.breakdowns.publisherPlatform,
    []
  );
});

test("does not invent revenue when purchase value is unavailable", async () => {
  const fakeMeta = {
    async getCampaignInsights() {
      return [
        {
          spend: "25.00",
          actions: [
            {
              action_type:
                "offsite_conversion.fb_pixel_purchase",
              value: "2",
            },
          ],
        },
      ];
    },
  };

  const result =
    await getMetaCampaignPerformance({
      storedCampaign: {
        execution: {
          meta: {
            campaignId: "campaign-123",
          },
        },
      },
      connection: null,
      metaClient: fakeMeta,
    });

  assert.equal(result.metrics.sales, 2);
  assert.equal(result.metrics.revenue, null);
  assert.equal(result.metrics.costPerSale, 12.5);
  assert.equal(result.metrics.roas, null);
});
