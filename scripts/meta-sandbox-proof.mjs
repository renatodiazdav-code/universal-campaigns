import "dotenv/config";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

const adAccountId = process.env.META_SANDBOX_AD_ACCOUNT_ID;
const accessToken = process.env.META_SANDBOX_ACCESS_TOKEN;

const meta = createMetaClient({
  adAccountId,
  accessToken,
});

const campaign = await meta.createCampaign({
  name: "Relay Sandbox Test From Client",
  objective: "OUTCOME_SALES",
});

console.log("Created campaign:");
console.log(JSON.stringify(campaign, null, 2));

const verifiedCampaign = await meta.getCampaign(campaign.id);

console.log("Verified campaign:");
console.log(JSON.stringify(verifiedCampaign, null, 2));