import { randomUUID } from "node:crypto";
import { getRelayDatabase, requireOwner } from "../infrastructure/database.mjs";

export function createCampaignStore({ db = getRelayDatabase() } = {}) {
  return {
    forUser(userId) {
      requireOwner(db, userId);
      return {
        async save(record) {
          if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Campaign record is required");
          const now = new Date().toISOString();
          const stored = { ...record, id: record.id || randomUUID(), userId, createdAt: record.createdAt || now, updatedAt: now };
          const result = db.prepare(`INSERT INTO campaigns (id, user_id, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
            WHERE campaigns.user_id = excluded.user_id`)
            .run(stored.id, userId, JSON.stringify(stored), stored.createdAt, now);
          if (result.changes !== 1) throw new Error("Campaign does not belong to this user");
          return stored;
        },
        async list() {
          return db.prepare("SELECT payload FROM campaigns WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId)
            .map((row) => JSON.parse(row.payload));
        },
        async getById(id) {
          const row = db.prepare("SELECT payload FROM campaigns WHERE user_id = ? AND id = ?").get(userId, id);
          return row ? JSON.parse(row.payload) : null;
        },
      };
    },
  };
}

export const campaignStore = { forUser: (userId) => createCampaignStore().forUser(userId) };
