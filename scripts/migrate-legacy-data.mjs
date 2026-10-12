import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
import { readFile } from "node:fs/promises";
import { getRelayDatabase } from "../src/infrastructure/database.mjs";
import { createConnectionStore } from "../src/application/connection-store.mjs";
import { campaignStore } from "../src/application/campaign-store.mjs";
import { getDevShopifyAccessToken } from "../src/connectors/shopify/dev-auth.mjs";

const index = process.argv.indexOf("--email");
const email = process.argv[index + 1]?.trim().toLowerCase();
if (index < 0 || !email) throw new Error("Usage: npm run migrate:legacy -- --email YOUR_REGISTERED_EMAIL");
const user = getRelayDatabase().prepare("SELECT id FROM users WHERE email = ?").get(email);
if (!user) throw new Error("Create your Relay account before importing legacy data.");
const connections = createConnectionStore().forUser(user.id);
async function legacyFile(path) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
const meta = await legacyFile("data/meta-connection.json");
if (meta && !await connections.get("meta")) await connections.save("meta", meta);
let imported = 0;
const store = campaignStore.forUser(user.id);
for (const record of await legacyFile("data/campaigns.json") || []) {
  if (record.id && await store.getById(record.id)) continue;
  await store.save(record); imported++;
}
if (!await connections.get("shopify") && process.env.SHOPIFY_SHOP && process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET) {
  const token = await getDevShopifyAccessToken({ shop: process.env.SHOPIFY_SHOP, clientId: process.env.SHOPIFY_CLIENT_ID, clientSecret: process.env.SHOPIFY_CLIENT_SECRET });
  await connections.save("shopify", { shop: process.env.SHOPIFY_SHOP, accessToken: token.access_token, connectedAt: new Date().toISOString(), source: "DEVELOPMENT_IMPORT" });
}
console.log(`Imported ${imported} campaigns for the selected account. Existing source files were preserved.`);
