import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
const userId = process.env.RELAY_USER_ID;
if (!userId) throw new Error("Set RELAY_USER_ID to the account running this proof");
import { campaignStore } from "../src/application/campaign-store.mjs";
import { loadMetaConnection } from "../src/application/meta-connection-store.mjs";
import { getMetaCampaignStatus } from "../src/application/get-meta-campaign-status.mjs";

const campaigns = await campaignStore.forUser(userId).list();

if (campaigns.length === 0) {
  throw new Error("No stored campaigns found");
}

const storedCampaign = campaigns[0];

console.log("Stored Relay campaign:");
console.log(storedCampaign.name);

const connection = await loadMetaConnection(userId);

if (!connection?.accessToken) {
  throw new Error("Meta is not connected");
}

console.log("Checking real Meta status...");

const status = await getMetaCampaignStatus({
  storedCampaign,
  connection,
});

console.log(
  JSON.stringify(status, null, 2)
);
