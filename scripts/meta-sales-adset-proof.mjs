import { loadMetaConnection } from "../src/application/meta-connection-store.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

const connection = await loadMetaConnection();

if (!connection?.accessToken) {
  throw new Error("Meta is not connected");
}

const adAccount = connection.setup?.adAccount;
const pixel = connection.salesSetup?.pixel;

if (!adAccount?.id) {
  throw new Error("No Meta ad account found");
}

if (!pixel?.id) {
  throw new Error("No Meta sales pixel selected");
}

const meta = createMetaClient({
  adAccountId: adAccount.id,
  accessToken: connection.accessToken,
});

console.log("Creating PAUSED Meta sales campaign...");

const campaign = await meta.createCampaign({
  name: "Relay Sales Proof",
  objective: "OUTCOME_SALES",
  status: "PAUSED",
});

console.log("Campaign created:", campaign.id);

console.log("Creating PAUSED purchase-optimized ad set...");

const adSet = await meta.createAdSet({
  name: "Relay Sales Proof - Purchase",
  campaignId: campaign.id,

  // Meta expects money in minor units.
  // 400 PEN cents = S/4.00 daily budget.
  dailyBudget: 400,

  countries: ["PE"],
  ageMin: 18,
  ageMax: 35,

  optimizationGoal: "OFFSITE_CONVERSIONS",
  pixelId: pixel.id,
  conversionEvent: "PURCHASE",

  status: "PAUSED",
});

console.log(
  JSON.stringify(
    {
      status: "SUCCESS",
      campaign: {
        id: campaign.id,
        status: "PAUSED",
        objective: "OUTCOME_SALES",
      },
      adSet: {
        id: adSet.id,
        status: "PAUSED",
        optimizationGoal: "OFFSITE_CONVERSIONS",
        conversionEvent: "PURCHASE",
      },
      pixel: {
        id: pixel.id,
        name: pixel.name,
      },
    },
    null,
    2
  )
);