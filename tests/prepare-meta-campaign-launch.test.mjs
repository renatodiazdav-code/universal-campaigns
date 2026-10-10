import test from "node:test";
import assert from "node:assert/strict";

import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { prepareMetaCampaignLaunch } from "../src/application/prepare-meta-campaign-launch.mjs";

function createCampaign({ instagram = false } = {}) {
  return createUniversalCampaign({
    name: "Preflight Launch Test",
    goal: "SALES",
    product: {
      source: "SHOPIFY",
      id: "product-1",
      title: "Test Sneakers",
      price: 49.99,
      currency: "PEN",
      imageUrl: "https://example.com/sneakers.jpg",
      destinationUrl: "https://example.com/products/test-sneakers",
    },
    audience: {
      countries: ["PE"],
      ageMin: 18,
      ageMax: 35,
      gender: "ALL",
    },
    budget: {
      mode: "TOTAL",
      amount: 50,
      currency: "PEN",
      durationDays: 7,
      allocation: {
        mode: "MANUAL",
        meta: 50,
        tiktok: 0,
      },
    },
    platforms: {
      meta: {
        enabled: true,
        facebook: true,
        instagram,
      },
      tiktok: {
        enabled: false,
      },
    },
    creative: {
      type: "IMAGE",
      primaryText: "Discover Test Sneakers.",
      headline: "Test Sneakers",
      destinationUrl: "https://example.com/products/test-sneakers",
      callToAction: "SHOP_NOW",
    },
  });
}

function createConnection() {
  return {
    accessToken: "fake-token",
    setup: {
      status: "READY",
      business: {
        id: "business-1",
        name: "Test Business",
      },
      adAccount: {
        id: "act_123",
        name: "Test Ad Account",
        account_status: 1,
        currency: "PEN",
      },
      page: {
        id: "page-123",
        name: "Test Page",
      },
    },
    salesSetup: {
      pixel: {
        id: "pixel-123",
        name: "Test Pixel",
      },
    },
  };
}

function createMeta() {
  return {
    async getBusinessAdAccounts() {
      return [
        {
          id: "act_123",
          name: "Test Ad Account",
          account_status: 1,
          currency: "PEN",
        },
      ];
    },
    async getBusinessPages() {
      return [
        {
          id: "page-123",
          name: "Test Page",
        },
      ];
    },
    async getAdAccountPixels() {
      return [
        {
          id: "pixel-123",
          name: "Test Pixel",
        },
      ];
    },
  };
}

async function prepare({ campaign, instagramAccounts }) {
  let savedConnection = null;

  const result = await prepareMetaCampaignLaunch({
    campaign,
    connection: createConnection(),
    meta: createMeta(),
    getInstagramAccounts: async () => instagramAccounts,
    saveConnection: async (connection) => {
      savedConnection = connection;
    },
  });

  return {
    result,
    savedConnection,
  };
}

test("allows Facebook-only launch preparation without Instagram identity", async () => {
  const { result, savedConnection } = await prepare({
    campaign: createCampaign({ instagram: false }),
    instagramAccounts: [],
  });

  assert.equal(result.preflight.ready, true);
  assert.equal(
    result.preflight.status,
    "READY_WITH_WARNINGS"
  );
  assert.equal(
    savedConnection.identity.instagram.mode,
    "PAGE_FALLBACK"
  );
  assert.equal(
    result.capabilities.capabilities.canRunFacebookSales.status,
    "AVAILABLE"
  );
});

test("blocks Instagram launch preparation when no Instagram identity exists", async () => {
  const { result } = await prepare({
    campaign: createCampaign({ instagram: true }),
    instagramAccounts: [],
  });

  assert.equal(result.preflight.ready, false);
  assert.equal(result.preflight.status, "BLOCKED");
  assert.equal(
    result.preflight.blockers[0].id,
    "META_INSTAGRAM_SALES"
  );
});

test("auto-selects one Instagram identity and allows Instagram preflight", async () => {
  const { result, savedConnection } = await prepare({
    campaign: createCampaign({ instagram: true }),
    instagramAccounts: [
      {
        id: "ig-123",
        username: "teststore",
        name: "Test Store",
      },
    ],
  });

  assert.equal(result.preflight.ready, true);
  assert.equal(
    result.preflight.status,
    "READY_WITH_WARNINGS"
  );
  assert.equal(
    savedConnection.identity.instagram.mode,
    "INSTAGRAM_ACCOUNT"
  );
  assert.equal(
    savedConnection.identity.instagram.account.id,
    "ig-123"
  );
  assert.equal(
    result.capabilities.capabilities.canRunInstagramSales.status,
    "AVAILABLE"
  );
});
