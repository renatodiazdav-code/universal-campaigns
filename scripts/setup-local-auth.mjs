import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";

let content = "";
try { content = await readFile(".env.local", "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const match = content.match(/^RELAY_ENCRYPTION_KEY=(.*)$/m);
const configured = process.env.RELAY_ENCRYPTION_KEY || match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
if (configured) {
  const key = Buffer.from(configured, "base64");
  if (key.length !== 32 || key.toString("base64") !== configured) throw new Error("Existing encryption key is invalid. It was not changed.");
} else {
  const line = `RELAY_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`;
  content = match ? content.replace(/^RELAY_ENCRYPTION_KEY=.*$/m, line) : `${content}\n${line}\n`;
}
if (!process.env.APP_URL && !/^APP_URL=.+$/m.test(content)) {
  content = /^APP_URL=/m.test(content) ? content.replace(/^APP_URL=.*$/m, "APP_URL=http://localhost:3000") : `${content}\nAPP_URL=http://localhost:3000\n`;
}
await writeFile(".env.local", content, { mode: 0o600 });
await chmod(".env.local", 0o600);
console.log("Local authentication configuration is ready. Restart the dev server if it is running.");
