import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
import { createMetaClient } from "../src/connectors/meta/client.mjs";

const adAccountId = "1201509875458218";
const accessToken = process.env.META_ACCESS_TOKEN;

const meta = createMetaClient({
  adAccountId,
  accessToken,
});

const creative = await meta.createAdCreative({
  name: "Relay Test Sneakers Creative",
  pageId: "1454711261048590",
  message: "Discover Test Sneakers.",
  headline: "Test Sneakers",
  destinationUrl: "https://luvixy.myshopify.com/products/test-sneakers",
  imageUrl:
    "https://cdn.shopify.com/s/files/1/0712/6905/6563/files/mono-monoserio.png?v=1791131386",
});

console.log("Created ad creative:");
console.log(JSON.stringify(creative, null, 2));
