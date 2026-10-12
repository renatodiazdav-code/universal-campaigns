import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { getRelayDatabase } from "../infrastructure/database.mjs";

const derive = promisify(scrypt);
const PASSWORD_OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
let activeDerivations = 0;
const derivationQueue = [];
async function derivePassword(password, salt) {
  if (activeDerivations >= 4) {
    if (derivationQueue.length >= 16) throw new AuthError("Too many attempts. Try again later.", 429);
    await new Promise((resolve) => derivationQueue.push(resolve));
  } else activeDerivations++;
  try { return await derive(password, salt, 64, PASSWORD_OPTIONS); }
  finally {
    const next = derivationQueue.shift();
    if (next) next(); else activeDerivations--;
  }
}
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE = "relay_session";
export const hashToken = (value) => createHash("sha256").update(value).digest("hex");

export class AuthError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function normalizeEmail(value) {
  if (typeof value !== "string") throw new AuthError("Enter a valid email address.");
  value = value.trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new AuthError("Enter a valid email address.");
  }
  return value.trim().toLowerCase();
}

function validPassword(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) {
    throw new AuthError("Use a password between 12 and 128 characters.");
  }
}

export async function hashPassword(password) {
  validPassword(password);
  const salt = randomBytes(16).toString("hex");
  const key = await derivePassword(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || password.length > 128) return false;
  const parts = String(storedHash ?? "").split(":");
  const valid = parts[0] === "scrypt" && /^[a-f0-9]{32}$/.test(parts[1] ?? "") && /^[a-f0-9]{128}$/.test(parts[2] ?? "");
  // Unknown accounts do the same expensive derivation as known accounts.
  const key = await derivePassword(password, valid ? parts[1] : "0".repeat(32));
  return valid && timingSafeEqual(key, Buffer.from(parts[2], "hex"));
}

function publicUser(row) {
  return row ? { id: row.id, email: /^shopify-[a-f0-9]{64}@relay\.invalid$/.test(row.email) ? null : row.email, name: row.name, createdAt: row.created_at } : null;
}

export function createAuthService({ db = getRelayDatabase(), now = Date.now } = {}) {
  function limit(key, max, windowMs = 15 * 60 * 1000) {
    const time = now();
    db.prepare("DELETE FROM auth_limits WHERE expires_at <= ?").run(time);
    db.prepare(`INSERT INTO auth_limits (key, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1`).run(key, time + windowMs);
    if (db.prepare("SELECT attempts FROM auth_limits WHERE key = ?").get(key).attempts > max) {
      throw new AuthError("Too many attempts. Try again later.", 429);
    }
  }
  function createSession(userId) {
    const token = randomBytes(32).toString("base64url");
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run(hashToken(token), userId, now() + SESSION_SECONDS * 1000, now());
    return token;
  }
  return {
    createSession,
    async register({ email, name, password }) {
      email = normalizeEmail(email); validPassword(password);
      if (email.endsWith("@relay.invalid")) throw new AuthError("Enter a valid email address.");
      name = typeof name === "string" ? name.trim() : "";
      if (!name || name.length > 100) throw new AuthError("Enter your name (up to 100 characters).");
      limit("register", 30);
      if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) throw new AuthError("Unable to create this account. Try signing in.", 409);
      const passwordHash = await hashPassword(password);
      const userId = randomUUID();
      try {
        db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
          .run(userId, email, name, passwordHash, new Date(now()).toISOString());
      } catch (error) {
        if (error.code === "ERR_SQLITE_ERROR" && /UNIQUE/.test(error.message)) throw new AuthError("Unable to create this account. Try signing in.", 409);
        throw error;
      }
      return { user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId)), token: createSession(userId) };
    },
    async login({ email, password }) {
      email = normalizeEmail(email);
      limit(`login:${hashToken(email)}`, 10); limit("login:global", 100);
      const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!await verifyPassword(password, row?.password_hash)) throw new AuthError("Email or password is incorrect.", 401);
      db.prepare("DELETE FROM auth_limits WHERE key = ?").run(`login:${hashToken(email)}`);
      return { user: publicUser(row), token: createSession(row.id) };
    },
    authenticate(token) {
      if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const row = db.prepare(`SELECT u.*, s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`).get(hashToken(token), now());
      return row ? { user: publicUser(row), sessionHash: row.token_hash } : null;
    },
    logout(token) {
      if (typeof token === "string") db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    },
    issueOAuthState(userId, sessionHash) {
      const session = db.prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?").get(sessionHash, now());
      if (!session || session.user_id !== userId) throw new AuthError("Sign in again.", 401);
      const state = randomBytes(32).toString("base64url");
      db.prepare("DELETE FROM oauth_states WHERE expires_at <= ?").run(now());
      db.prepare("INSERT INTO oauth_states (state_hash, user_id, session_hash, expires_at) VALUES (?, ?, ?, ?)")
        .run(hashToken(state), userId, sessionHash, now() + 10 * 60 * 1000);
      return state;
    },
    consumeOAuthState(state, userId, sessionHash) {
      if (typeof state !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(state)) return false;
      const result = db.prepare(`DELETE FROM oauth_states WHERE state_hash = ? AND user_id = ? AND session_hash = ? AND expires_at > ?
        AND EXISTS (SELECT 1 FROM sessions WHERE token_hash = ? AND user_id = ? AND expires_at > ?)`)
        .run(hashToken(state), userId, sessionHash, now(), sessionHash, userId, now());
      return result.changes === 1;
    },
  };
}
