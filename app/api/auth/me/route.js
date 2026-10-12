import { withUser } from "../../../../src/application/auth-http.mjs";

export const GET = withUser(async function GET(request, { user }) {
  return Response.json({ user });
});
