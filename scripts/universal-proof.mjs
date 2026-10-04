import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";

const campaign = createUniversalCampaign({
  name: "Test Sneakers Campaign",

  goal: "SALES",

  product: {
    source: "SHOPIFY",
    id: "gid://shopify/Product/7996943040563",
    title: "Test Sneakers",
    price: 49.99,
    currency: "PEN",
    imageUrl: null,
    destinationUrl: "https://luvixy.myshopify.com/products/test-sneakers",
  },

  audience: {
    countries: ["PE"],
    ageMin: 18,
    ageMax: 35,
    gender: "ALL",
  },

  budget: {
    total: 100,
    currency: "PEN",
    durationDays: 7,
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
    primaryText: "Discover our Test Sneakers.",
    headline: "Test Sneakers",
  },
});

console.log("\nUniversal Campaign created ✓\n");
console.log(JSON.stringify(campaign, null, 2));