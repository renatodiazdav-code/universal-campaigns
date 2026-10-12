import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

import { createMetaClient } from "../src/connectors/meta/client.mjs";
import { discoverMetaSetup } from "../src/application/discover-meta-setup.mjs";

const accessToken = process.env.META_ACCESS_TOKEN;

const meta = createMetaClient({
  accessToken,
});

const setup = await discoverMetaSetup(meta);

console.log("Discovered Meta setup:");
console.log(JSON.stringify(setup, null, 2));
