import { withUser, appOrigin } from "../../../../../src/application/auth-http.mjs";
import { NextResponse } from "next/server";

export const GET = withUser(async function GET(request, { user, sessionHash, auth }) {
  const appId = process.env.META_APP_ID;

  if (!appId) {
    return NextResponse.json(
      {
        error: "META_APP_ID is missing",
      },
      {
        status: 500,
      }
    );
  }

  const redirectUri = `${appOrigin(request)}/api/meta/auth/callback`;

  const scopes = [
    "ads_management",
    "ads_read",
    "pages_show_list",
    "business_management",
  ];

  const state = auth.issueOAuthState(user.id, sessionHash);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes.join(","),
    response_type: "code",
    state,
  });

  const authorizationUrl =
    `https://www.facebook.com/v26.0/dialog/oauth?${params.toString()}`;

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: appOrigin(request).startsWith("https:"),
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
});
