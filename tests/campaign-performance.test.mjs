import test from "node:test";
import assert from "node:assert/strict";

import {
  createUniversalCampaignPerformance,
} from "../src/domain/campaign-performance.mjs";

test("aggregates platform performance into Relay campaign totals", () => {
  const result = createUniversalCampaignPerformance({
    platformPerformances: [
      {
        platform: "META",
        metrics: {
          spend: 60,
          sales: 5,
          revenue: 300,
          impressions: 10000,
          clicks: 250,
          currency: "PEN",
        },
        breakdowns: {
          publisherPlatform: [
            {
              id: "facebook",
              name: "Facebook",
              metrics: {
                spend: 40,
                sales: 4,
                revenue: 240,
                roas: 6,
              },
            },
          ],
        },
      },
      {
        platform: "TIKTOK",
        metrics: {
          spend: 40,
          sales: 3,
          revenue: 180,
          impressions: 8000,
          clicks: 180,
          currency: "PEN",
        },
      },
    ],
    now: () => "2026-10-10T16:30:00.000Z",
  });

  assert.equal(result.version, 1);
  assert.equal(result.metrics.spend, 100);
  assert.equal(result.metrics.sales, 8);
  assert.equal(result.metrics.revenue, 480);
  assert.equal(result.metrics.costPerSale, 12.5);
  assert.equal(result.metrics.roas, 4.8);
  assert.equal(result.metrics.impressions, 18000);
  assert.equal(result.metrics.clicks, 430);
  assert.equal(result.metrics.currency, "PEN");
  assert.ok(result.platforms.meta);
  assert.ok(result.platforms.tiktok);
  assert.equal(
    result.platforms.meta.breakdowns.publisherPlatform[0].name,
    "Facebook"
  );
  assert.equal(result.checkedAt, "2026-10-10T16:30:00.000Z");
});

test("does not invent total revenue or ROAS when one platform has unknown revenue", () => {
  const result = createUniversalCampaignPerformance({
    platformPerformances: [
      {
        platform: "META",
        metrics: {
          spend: 50,
          sales: 2,
          revenue: null,
          impressions: 1000,
          clicks: 50,
          currency: "PEN",
        },
      },
      {
        platform: "TIKTOK",
        metrics: {
          spend: 25,
          sales: 1,
          revenue: 80,
          impressions: 500,
          clicks: 20,
          currency: "PEN",
        },
      },
    ],
  });

  assert.equal(result.metrics.spend, 75);
  assert.equal(result.metrics.sales, 3);
  assert.equal(result.metrics.revenue, null);
  assert.equal(result.metrics.costPerSale, 25);
  assert.equal(result.metrics.roas, null);
});

test("rejects aggregation across different currencies", () => {
  assert.throws(
    () =>
      createUniversalCampaignPerformance({
        platformPerformances: [
          {
            platform: "META",
            metrics: {
              spend: 10,
              sales: 0,
              revenue: 0,
              currency: "PEN",
            },
          },
          {
            platform: "TIKTOK",
            metrics: {
              spend: 10,
              sales: 0,
              revenue: 0,
              currency: "USD",
            },
          },
        ],
      }),
    /multiple currencies/
  );
});

test("uses the campaign currency when the platform has no reporting currency yet", () => {
  const result = createUniversalCampaignPerformance({
    platformPerformances: [
      {
        platform: "META",
        metrics: {
          spend: 0,
          sales: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          currency: null,
        },
      },
    ],
    fallbackCurrency: "PEN",
  });

  assert.equal(result.metrics.currency, "PEN");
  assert.equal(result.metrics.spend, 0);
  assert.equal(result.metrics.sales, 0);
});
