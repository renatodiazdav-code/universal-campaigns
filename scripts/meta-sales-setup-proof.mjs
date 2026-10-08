import { loadMetaConnection } from "../src/application/meta-connection-store.mjs";
import { createMetaClient } from "../src/connectors/meta/client.mjs";
import { discoverMetaSalesSetup } from "../src/application/discover-meta-sales-setup.mjs";

const connection = await loadMetaConnection();

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

console.log(
  JSON.stringify(salesSetup, null, 2)
);