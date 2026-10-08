import { NextResponse } from "next/server";

import { createMetaClient } from "../../../../../src/connectors/meta/client.mjs";
import { discoverMetaSetup } from "../../../../../src/application/discover-meta-setup.mjs";

export async function GET(request) {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const storedState =
      request.cookies.get("meta_oauth_state")?.value;

    if (error) {
      const response = NextResponse.json(
        {
          status: "AUTH_ERROR",
          error,
        },
        {
          status: 400,
        }
      );

      response.cookies.delete("meta_oauth_state");

      return response;
    }

    if (
      !returnedState ||
      !storedState ||
      returnedState !== storedState
    ) {
      const response = NextResponse.json(
        {
          status: "AUTH_ERROR",
          error: "Invalid OAuth state",
        },
        {
          status: 400,
        }
      );

      response.cookies.delete("meta_oauth_state");

      return response;
    }

    if (!code) {
      const response = NextResponse.json(
        {
          status: "AUTH_ERROR",
          error: "Missing Meta authorization code",
        },
        {
          status: 400,
        }
      );

      response.cookies.delete("meta_oauth_state");

      return response;
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          status: "SERVER_ERROR",
          error: "Meta app credentials are missing",
        },
        {
          status: 500,
        }
      );
    }

    const redirectUri =
      "http://localhost:3000/api/meta/auth/callback";

    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v26.0/oauth/access_token?${tokenParams}`
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        `Meta token exchange failed: ${JSON.stringify(tokenData)}`
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Meta did not return an access token");
    }

    const meta = createMetaClient({
      accessToken,
    });

    const setup = await discoverMetaSetup(meta);

    const response = NextResponse.json({
      status: "CONNECTED",
      setup,
    });

    response.cookies.delete("meta_oauth_state");

    return response;
  } catch (error) {
    console.error("Meta OAuth callback error:", error);

    const response = NextResponse.json(
      {
        status: "ERROR",
        error:
          error.message ||
          "Could not complete Meta connection",
      },
      {
        status: 500,
      }
    );

    response.cookies.delete("meta_oauth_state");

    return response;
  }
}