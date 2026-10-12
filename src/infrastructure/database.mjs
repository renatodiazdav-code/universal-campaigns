import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function openRelayDatabase(filePath = process.env.RELAY_DATABASE_PATH || join(process.cwd(), "data", "relay.sqlite")) {
  if (filePath !== ":memory:") mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS campaigns_by_user ON campaigns(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS connections (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id, provider)
    );
    CREATE TABLE IF NOT EXISTS oauth_states (
      state_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_hash TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_limits (
      key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shopify_oauth_states (
      state_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_hash TEXT NOT NULL, shop TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shopify_onboarding_states (
      state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, shop TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shopify_identities (
      shop TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS connection_refresh_locks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL,
      lease_id TEXT NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(user_id, provider)
    );
  `);
  if (filePath !== ":memory:") {
    for (const path of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
      if (existsSync(path)) chmodSync(path, 0o600);
    }
  }
  return db;
}

let database;
export function getRelayDatabase() {
  database ??= openRelayDatabase();
  return database;
}

export function requireOwner(db, userId) {
  if (typeof userId !== "string" || !userId || !db.prepare("SELECT id FROM users WHERE id = ?").get(userId)) {
    throw new Error("An existing user is required");
  }
}
