import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createCampaignStore,
} from "../src/application/campaign-store.mjs";

test("saves and lists Relay campaigns", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "relay-campaign-store-")
  );

  const filePath = join(
    directory,
    "campaigns.json"
  );

  try {
    const store = createCampaignStore({
      filePath,
    });

    const saved = await store.save({
      name: "Test Sneakers Campaign",
      status: "PAUSED",

      input: {
        product: {
          title: "Test Sneakers",
        },

        budget: {
          total: 28,
          currency: "PEN",
          durationDays: 7,
        },
      },

      resolvedConfiguration: {
        meta: {
          objective: "OUTCOME_SALES",
          optimizationGoal: "OFFSITE_CONVERSIONS",
          conversionEvent: "PURCHASE",
          bidStrategy: "LOWEST_COST_WITHOUT_CAP",
        },
      },

      execution: {
        meta: {
          campaignId: "campaign-123",
          adSetId: "adset-123",
          creativeId: "creative-123",
          adId: "ad-123",
        },
      },
    });

    assert.ok(saved.id);
    assert.equal(
      saved.name,
      "Test Sneakers Campaign"
    );
    assert.equal(saved.status, "PAUSED");

    const campaigns = await store.list();

    assert.equal(campaigns.length, 1);
    assert.equal(
      campaigns[0].id,
      saved.id
    );

    assert.equal(
      campaigns[0]
        .resolvedConfiguration
        .meta
        .conversionEvent,
      "PURCHASE"
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("campaigns survive a new store instance", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "relay-campaign-store-")
  );

  const filePath = join(
    directory,
    "campaigns.json"
  );

  try {
    const firstStore = createCampaignStore({
      filePath,
    });

    const saved = await firstStore.save({
      name: "Persistent Campaign",
      status: "PAUSED",
    });

    const secondStore = createCampaignStore({
      filePath,
    });

    const recovered =
      await secondStore.getById(saved.id);

    assert.ok(recovered);

    assert.equal(
      recovered.name,
      "Persistent Campaign"
    );

    assert.equal(
      recovered.status,
      "PAUSED"
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});