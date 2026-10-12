import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
import { createMetaClient } from "../src/connectors/meta/client.mjs";

const adAccountId = process.env.META_SANDBOX_AD_ACCOUNT_ID;
const accessToken = process.env.META_SANDBOX_ACCESS_TOKEN;

// Usa una campaña sandbox existente.
const campaignId = "120330000577924814";

const meta = createMetaClient({
  adAccountId,
  accessToken,
});

const adSet = await meta.createAdSet({
  name: "Relay Sandbox Ad Set Test",
  campaignId,
  dailyBudget: 400,
  countries: ["PE"],
  ageMin: 18,
  ageMax: 35,
});

console.log("Created ad set:");
console.log(JSON.stringify(adSet, null, 2));
