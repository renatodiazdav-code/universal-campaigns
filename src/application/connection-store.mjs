import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getRelayDatabase, requireOwner } from "../infrastructure/database.mjs";

const PROVIDERS = new Set(["meta", "tiktok", "shopify"]);
function keyFromEnvironment() {
  const value = process.env.RELAY_ENCRYPTION_KEY || "";
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) throw new Error("RELAY_ENCRYPTION_KEY must be a 32-byte base64 key");
  return key;
}

export function createConnectionStore({ db = getRelayDatabase(), encryptionKey = keyFromEnvironment } = {}) {
  function key() {
    const value = typeof encryptionKey === "function" ? encryptionKey() : encryptionKey;
    if (!Buffer.isBuffer(value) || value.length !== 32) throw new Error("Invalid connection encryption key");
    return value;
  }
  return {
    forUser(userId) {
      requireOwner(db, userId);
      function provider(value) { if (!PROVIDERS.has(value)) throw new Error("Unsupported connection provider"); }
      return {
        async save(name, connection) {
          provider(name);
          if (!connection || typeof connection !== "object" || Array.isArray(connection)) throw new Error("A connection is required");
          const iv = randomBytes(12);
          const cipher = createCipheriv("aes-256-gcm", key(), iv);
          cipher.setAAD(Buffer.from(`${userId}:${name}`));
          const payload = Buffer.concat([cipher.update(JSON.stringify(connection), "utf8"), cipher.final()]);
          const envelope = JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), payload: payload.toString("base64") });
          db.prepare(`INSERT INTO connections (user_id, provider, encrypted_payload, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, provider) DO UPDATE SET encrypted_payload = excluded.encrypted_payload, updated_at = excluded.updated_at`)
            .run(userId, name, envelope, new Date().toISOString());
          return connection;
        },
        async getVersioned(name) {
          provider(name);
          const row = db.prepare("SELECT encrypted_payload FROM connections WHERE user_id = ? AND provider = ?").get(userId, name);
          if (!row) return null;
          const envelope = JSON.parse(row.encrypted_payload);
          if (envelope.version !== 1) throw new Error("Unsupported connection encryption format");
          const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(envelope.iv, "base64"));
          decipher.setAAD(Buffer.from(`${userId}:${name}`));
          decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
          return { value: JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.payload, "base64")), decipher.final()]).toString("utf8")), revision: row.encrypted_payload };
        },
        async get(name) { return (await this.getVersioned(name))?.value ?? null; },
        async updateIfCurrent(name, connection, revision) {
          provider(name);
          if (!connection || typeof connection !== "object" || Array.isArray(connection) || typeof revision !== "string") throw new Error("A versioned connection is required");
          const iv = randomBytes(12);
          const cipher = createCipheriv("aes-256-gcm", key(), iv);
          cipher.setAAD(Buffer.from(`${userId}:${name}`));
          const payload = Buffer.concat([cipher.update(JSON.stringify(connection), "utf8"), cipher.final()]);
          const envelope = JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), payload: payload.toString("base64") });
          return db.prepare("UPDATE connections SET encrypted_payload = ?, updated_at = ? WHERE user_id = ? AND provider = ? AND encrypted_payload = ?")
            .run(envelope, new Date().toISOString(), userId, name, revision).changes === 1;
        },
        async delete(name) { provider(name); db.prepare("DELETE FROM connections WHERE user_id = ? AND provider = ?").run(userId, name); },
      };
    },
  };
}
