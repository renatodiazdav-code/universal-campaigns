import "dotenv/config";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

const accessToken = process.env.META_ACCESS_TOKEN;

const meta = createMetaClient({
  accessToken,
});

const businesses = await meta.getBusinesses();

console.log("Businesses:");
console.log(JSON.stringify(businesses, null, 2));

for (const business of businesses) {
  console.log(`\nBusiness: ${business.name}`);

  const adAccounts =
    await meta.getBusinessAdAccounts(business.id);

  console.log("Ad accounts:");
  console.log(JSON.stringify(adAccounts, null, 2));

  const pages =
    await meta.getBusinessPages(business.id);

  console.log("Pages:");
  console.log(JSON.stringify(pages, null, 2));
}