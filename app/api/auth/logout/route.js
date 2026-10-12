import { withUser, readSessionToken, sessionCookie } from "../../../../src/application/auth-http.mjs";

export const POST = withUser(async function POST(request, { auth }) {
  auth.logout(readSessionToken(request));
  return Response.json({ success: true }, { headers: { "Set-Cookie": sessionCookie("", request, { clear: true }) } });
});
