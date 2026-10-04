import "dotenv/config";

import {
  buildPlatformPlans,
} from "../src/application/build-platform-plans.mjs";

import {
  getDevShopifyAccessToken,
} from "../src/connectors/shopify/dev-auth.mjs";

import {
  getShopifyProducts,
  shopifyProductToUniversalProduct,
} from "../src/connectors/shopify/products.mjs";

import {
  createUniversalCampaign,
} from "../src/domain/universal-campaign.mjs";



const shop = process.env.SHOPIFY_SHOP;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

if (!shop || !clientId || !clientSecret) {
  throw new Error("Missing Shopify environment variables");
}

console.log("\n1. Connecting to Shopify...");

const tokenData = await getDevShopifyAccessToken({
  shop,
  clientId,
  clientSecret,
});

console.log("Shopify connected ✓");

console.log("\n2. Getting products...");

const products = await getShopifyProducts({
  shop,
  accessToken: tokenData.access_token,
});

if (products.length === 0) {
  throw new Error("No Shopify products found");
}

const shopifyProduct = products[0];

console.log(`Product found: ${shopifyProduct.title} ✓`);

console.log("\n3. Converting Shopify product...");

const product = shopifyProductToUniversalProduct(
  shopifyProduct,
  shop
);

console.log("Universal product created ✓");

console.log("\n4. Creating Universal Campaign...");

const campaign = createUniversalCampaign({
  name: `${product.title} Campaign`,

  goal: "SALES",

  product,

  audience: {
    countries: ["PE"],
    ageMin: 18,
    ageMax: 35,
    gender: "ALL",
  },

  budget: {
  total: 100,
  currency: product.currency,
  durationDays: 7,

  allocation: {
    mode: "MANUAL",
    meta: 60,
    tiktok: 40,
  },
},

  platforms: {
    meta: {
      enabled: true,
      facebook: true,
      instagram: true,
    },

    tiktok: {
      enabled: true,
    },
  },

  creative: {
    type: "IMAGE",
    primaryText: `Discover ${product.title}.`,
    headline: product.title,
  },
});

console.log("\nUniversal Campaign created from Shopify ✓\n");
console.log(JSON.stringify(campaign, null, 2));

console.log("\n5. Building platform plans...");

const platformPlans = buildPlatformPlans(campaign);

console.log("Platform plans created ✓\n");
console.log(JSON.stringify(platformPlans, null, 2));