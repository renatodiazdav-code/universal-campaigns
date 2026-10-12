import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
const userId = process.env.RELAY_USER_ID;
if (!userId) throw new Error("Set RELAY_USER_ID to the account running this proof");
import { loadMetaConnection, saveMetaPixelSelection } from "../src/application/meta-connection-store.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";
import { discoverMetaSalesSetup } from "../src/application/discover-meta-sales-setup.mjs";

const pixelId = process.argv[2];

if (!pixelId) {
  throw new Error(
    "Usage: node scripts/meta-select-pixel-proof.mjs <pixel-id>"
  );
}

const connection = await loadMetaConnection(userId);

if (!connection?.accessToken) {
  throw new Error("Meta is not connected");
}

const adAccount = connection.setup?.adAccount;

if (!adAccount?.id) {
  throw new Error("No Meta ad account found");
}

const meta = createMetaClient({
  accessToken: connection.accessToken,
});

const salesSetup = await discoverMetaSalesSetup(meta, {
  adAccountId: adAccount.id,
});

const pixels =
  salesSetup.status === "READY"
    ? [salesSetup.pixel]
    : salesSetup.pixels ?? [];

const pixel = pixels.find(
  (candidate) => candidate.id === pixelId
);

if (!pixel) {
  throw new Error(
    "Selected pixel does not belong to this Meta ad account"
  );
}

await saveMetaPixelSelection(pixel, userId);

console.log(
  JSON.stringify(
    {
      status: "PIXEL_SELECTED",
      pixel,
    },
    null,
    2
  )
);
