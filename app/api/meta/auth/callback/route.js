import { withUser, appOrigin } from "../../../../../src/application/auth-http.mjs";
import { NextResponse } from "next/server";
import { saveMetaConnection } from "../../../../../src/application/meta-connection-store.mjs";
import { createMetaClient } from "../../../../../src/connectors/meta/client.mjs";
import { discoverMetaSetup } from "../../../../../src/application/discover-meta-setup.mjs";
import { refreshMetaSetupSnapshot } from "../../../../../src/application/refresh-meta-setup-snapshot.mjs";
import { getMetaInstagramAccounts } from "../../../../../src/connectors/meta/instagram-accounts.mjs";
import {
  getMetaPixelDetails,
  getMetaPixelEventStats,
} from "../../../../../src/connectors/meta/pixel-health.mjs";

export const GET = withUser(async function GET(request, { user, sessionHash, auth }) {
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
      returnedState !== storedState ||
      !auth.consumeOAuthState(returnedState, user.id, sessionHash)
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

    const redirectUri = `${appOrigin(request)}/api/meta/auth/callback`;

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

    const connection = {
      accessToken,
      setup,
      connectedAt: new Date().toISOString(),
    };

    await refreshMetaSetupSnapshot({
      connection,
      meta,
      getInstagramAccounts: getMetaInstagramAccounts,
      getPixelDetails: getMetaPixelDetails,
      getPixelEventStats: getMetaPixelEventStats,
      saveConnection: (connection) => saveMetaConnection(connection, user.id),
    });

    const response = NextResponse.redirect(
      `${appOrigin(request)}/campaigns?meta=connected`
    );

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
});
