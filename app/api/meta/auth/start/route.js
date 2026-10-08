import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET() {
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

  const redirectUri =
    "http://localhost:3000/api/meta/auth/callback";

  const scopes = [
    "ads_management",
    "ads_read",
    "pages_show_list",
    "business_management",
  ];

  const state = crypto.randomBytes(32).toString("hex");

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
    secure: false,
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}