import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
const userId = process.env.RELAY_USER_ID;
if (!userId) throw new Error("Set RELAY_USER_ID to the account running this proof");
import { loadMetaConnection } from "../src/application/meta-connection-store.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";

const connection = await loadMetaConnection(userId);

if (!connection?.accessToken) {
  throw new Error("Meta is not connected");
}

const adAccount = connection.setup?.adAccount;

if (!adAccount?.id) {
  throw new Error("No Meta ad account found in saved connection");
}

const meta = createMetaClient({
  accessToken: connection.accessToken,
});

const pixels = await meta.getAdAccountPixels(adAccount.id);

console.log(
  JSON.stringify(
    {
      adAccount: {
        id: adAccount.id,
        name: adAccount.name,
      },
      pixels,
    },
    null,
    2
  )
);
