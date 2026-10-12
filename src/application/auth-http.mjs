import { AuthError, createAuthService, SESSION_COOKIE, SESSION_SECONDS } from "./auth-service.mjs";

export function appOrigin(request) {
  const configured = process.env.APP_URL;
  if (process.env.NODE_ENV === "production" && !configured) throw new Error("APP_URL must be configured for production");
  const url = new URL(configured || request.url);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("APP_URL must use HTTPS outside localhost");
  }
  return url.origin;
}

export function assertSameOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  if (request.headers.get("origin") !== appOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AuthError("This request is not allowed.", 403);
  }
}

export function readSessionToken(request) {
  const name = appOrigin(request).startsWith("https:") ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE;
  const entry = (request.headers.get("cookie") || "").split(";").map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

export async function readAuthInput(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Enter your account details.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new AuthError("Account request is too large.", 413); }
    chunks.push(Buffer.from(value));
  }
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AuthError("Enter valid account details."); }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthError("Enter valid account details.");
  return input;
}

export function sessionCookie(token, request, { clear = false } = {}) {
  const secure = appOrigin(request).startsWith("https:");
  const name = secure ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE;
  return `${name}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function authErrorResponse(error) {
  if (!(error instanceof AuthError)) console.error("Relay authentication request failed:", error.message);
  return Response.json({ error: error instanceof AuthError ? error.message : "Could not complete this request." },
    { status: error instanceof AuthError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}

export function withUser(handler) {
  return async function authenticated(request, context) {
    try {
      const auth = createAuthService();
      const identity = auth.authenticate(readSessionToken(request));
      if (!identity) throw new AuthError("Sign in to continue.", 401);
      assertSameOrigin(request);
      const response = await handler(request, { ...context, ...identity, auth });
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) { return authErrorResponse(error); }
  };
}
