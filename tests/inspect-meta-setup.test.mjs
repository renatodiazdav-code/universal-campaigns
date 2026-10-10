import test from "node:test";
import assert from "node:assert/strict";

import { inspectMetaSetup } from "../src/application/inspect-meta-setup.mjs";

function createConnection({
  pixel = { id: "pixel-1", name: "Store Pixel" },
} = {}) {
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
    salesSetup: pixel
      ? {
          pixel,
        }
      : {},
  };
}

function createMeta({
  accountStatus = 1,
  pages = [{ id: "page-1", name: "Store Page" }],
  pixels = [{ id: "pixel-1", name: "Store Pixel" }],
} = {}) {
  return {
    async getBusinessAdAccounts() {
      return [
        {
          id: "act_123",
          name: "Store Ads",
          account_status: accountStatus,
          currency: "PEN",
        },
      ];
    },

    async getBusinessPages() {
      return pages;
    },

    async getAdAccountPixels() {
      return pixels;
    },
  };
}

async function noInstagramAccounts() {
  return [];
}

test("returns READY when core Meta sales setup is valid even without Instagram", async () => {
  const result = await inspectMetaSetup({
    connection: createConnection(),
    meta: createMeta(),
    getInstagramAccounts: noInstagramAccounts,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.business.status, "READY");
  assert.equal(result.adAccount.status, "READY");
  assert.equal(result.adAccount.currency, "PEN");
  assert.equal(result.facebookPage.status, "READY");
  assert.equal(result.tracking.pixel.status, "READY");
  assert.equal(result.tracking.pixel.selected.id, "pixel-1");
  assert.equal(result.instagram.status, "NONE_FOUND");
  assert.equal(result.tracking.purchaseEvent.status, "NOT_CHECKED");
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "META_INSTAGRAM_IDENTITY_MISSING" &&
        issue.severity === "WARNING"
    )
  );
});

test("returns NEEDS_SETUP when no Meta Pixel or Dataset is available", async () => {
  const result = await inspectMetaSetup({
    connection: createConnection({ pixel: null }),
    meta: createMeta({ pixels: [] }),
    getInstagramAccounts: noInstagramAccounts,
  });

  assert.equal(result.status, "NEEDS_SETUP");
  assert.equal(result.tracking.pixel.status, "NONE_FOUND");
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "META_PIXEL_MISSING" &&
        issue.severity === "BLOCKER"
    )
  );
});

test("returns NEEDS_SELECTION when multiple pixels exist and none is selected", async () => {
  const result = await inspectMetaSetup({
    connection: createConnection({ pixel: null }),
    meta: createMeta({
      pixels: [
        { id: "pixel-1", name: "Pixel One" },
        { id: "pixel-2", name: "Pixel Two" },
      ],
    }),
    getInstagramAccounts: noInstagramAccounts,
  });

  assert.equal(result.status, "NEEDS_SELECTION");
  assert.equal(result.tracking.pixel.status, "NEEDS_SELECTION");
  assert.equal(result.tracking.pixel.count, 2);
});

test("returns NEEDS_SETUP when the selected ad account is not active", async () => {
  const result = await inspectMetaSetup({
    connection: createConnection(),
    meta: createMeta({ accountStatus: 2 }),
    getInstagramAccounts: noInstagramAccounts,
  });

  assert.equal(result.status, "NEEDS_SETUP");
  assert.equal(result.adAccount.status, "NEEDS_SETUP");
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "META_AD_ACCOUNT_NOT_ACTIVE"
    )
  );
});
