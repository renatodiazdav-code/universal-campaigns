import test from "node:test";
import assert from "node:assert/strict";

import { refreshMetaSetupSnapshot } from "../src/application/refresh-meta-setup-snapshot.mjs";

function createConnection() {
  return {
    accessToken: "fake-token",
    setup: {
      status: "READY",
      business: {
        id: "business-1",
        name: "Store Business",
      },
      adAccount: {
        id: "act_123",
        name: "Store Ads",
        account_status: 1,
        currency: "PEN",
      },
      page: {
        id: "page-1",
        name: "Store Page",
      },
    },
  };
}

function createMeta({ pixels = [{ id: "pixel-1", name: "Pixel 1" }] } = {}) {
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
      return pixels;
    },
  };
}

test("persists a setup snapshot, auto-selects one pixel, and stores Page fallback when Instagram is missing", async () => {
  let saved = null;

  const result = await refreshMetaSetupSnapshot({
    connection: createConnection(),
    meta: createMeta(),
    getInstagramAccounts: async () => [],
    saveConnection: async (connection) => {
      saved = connection;
    },
  });

  assert.equal(result.snapshot.status, "READY");
  assert.equal(result.snapshot.tracking.pixel.status, "READY");
  assert.equal(result.snapshot.tracking.pixel.selected.id, "pixel-1");
  assert.equal(saved.salesSetup.pixel.id, "pixel-1");
  assert.equal(saved.identity.instagram.mode, "PAGE_FALLBACK");
  assert.equal(saved.identity.instagram.account, null);
  assert.equal(saved.setupSnapshot.status, "READY");
  assert.equal(saved.setupSnapshotUpdatedAt, result.snapshot.checkedAt);
});

test("persists one discovered Instagram identity automatically", async () => {
  let saved = null;

  const result = await refreshMetaSetupSnapshot({
    connection: createConnection(),
    meta: createMeta(),
    getInstagramAccounts: async () => [
      {
        id: "ig-1",
        username: "store",
        name: "Store",
      },
    ],
    saveConnection: async (connection) => {
      saved = connection;
    },
  });

  assert.equal(result.snapshot.instagram.status, "READY");
  assert.equal(result.snapshot.instagram.selected.id, "ig-1");
  assert.equal(saved.identity.instagram.mode, "INSTAGRAM_ACCOUNT");
  assert.equal(saved.identity.instagram.account.id, "ig-1");
});

test("does not fail Meta setup when optional Instagram discovery fails", async () => {
  let saved = null;

  const result = await refreshMetaSetupSnapshot({
    connection: createConnection(),
    meta: createMeta(),
    getInstagramAccounts: async () => {
      throw new Error("Instagram endpoint unavailable");
    },
    saveConnection: async (connection) => {
      saved = connection;
    },
  });

  assert.equal(result.snapshot.status, "READY");
  assert.equal(result.snapshot.instagram.status, "DISCOVERY_ERROR");
  assert.equal(
    result.snapshot.issues.some(
      (issue) => issue.code === "META_INSTAGRAM_DISCOVERY_FAILED"
    ),
    true
  );
  assert.equal(saved.setupSnapshot.status, "READY");
  assert.equal(saved.salesSetup.pixel.id, "pixel-1");
});
