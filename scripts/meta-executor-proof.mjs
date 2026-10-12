import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
const userId = process.env.RELAY_USER_ID;
if (!userId) throw new Error("Set RELAY_USER_ID to the account running this proof");
import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";
import { loadMetaConnection } from "../src/application/meta-connection-store.mjs";

const connection = await loadMetaConnection(userId);

if (!connection?.accessToken) {
  throw new Error("Meta is not connected");
}

if (!connection?.salesSetup?.pixel?.id) {
  throw new Error("No Meta sales pixel selected");
}

console.log("Loading Shopify product...");

const productsResponse = await fetch(
  "http://localhost:3000/api/products"
);

const productsData = await productsResponse.json();

if (!productsResponse.ok) {
  throw new Error(
    productsData.error || "Could not load Shopify products"
  );
}

const product =
  productsData.products.find(
    (product) => product.title === "Test Sneakers"
  ) ?? productsData.products[0];

if (!product) {
  throw new Error("No Shopify products found");
}

console.log("Product:", product.title);

const campaign = createUniversalCampaign({
  name: "Relay End-to-End Meta Proof",
  goal: "SALES",

  product: {
    source: "SHOPIFY",
    id: product.id,
    title: product.title,
    price: Number(product.price),
    currency: product.currency,
    imageUrl: product.imageUrl,
    destinationUrl: product.destinationUrl,
  },

  audience: {
    countries: ["PE"],
    ageMin: 18,
    ageMax: 35,
    gender: "ALL",
  },

  budget: {
    total: 28,
    currency: product.currency,
    durationDays: 7,

    allocation: {
      mode: "MANUAL",
      meta: 28,
      tiktok: 0,
    },
  },

  platforms: {
    meta: {
      enabled: true,
      facebook: true,
      instagram: true,
    },

    tiktok: {
      enabled: false,
    },
  },

  creative: {
    type: "IMAGE",
    primaryText: `Discover ${product.title}.`,
    headline: product.title,
    destinationUrl: product.destinationUrl,
  },
});

console.log("Executing Universal Campaign on Meta...");
console.log("Everything will remain PAUSED.");

const result = await executeMetaCampaign({
  campaign,
  connection,
});

console.log(
  JSON.stringify(result, null, 2)
);
