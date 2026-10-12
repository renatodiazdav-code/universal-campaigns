import { withUser } from "../../../../../src/application/auth-http.mjs";
import {
  loadMetaConnection,
  saveMetaConnection,
} from "../../../../../src/application/meta-connection-store.mjs";
import { refreshMetaSetupSnapshot } from "../../../../../src/application/refresh-meta-setup-snapshot.mjs";
import { createMetaClient } from "../../../../../src/connectors/meta/client.mjs";
import { getMetaInstagramAccounts } from "../../../../../src/connectors/meta/instagram-accounts.mjs";
import {
  getMetaPixelDetails,
  getMetaPixelEventStats,
} from "../../../../../src/connectors/meta/pixel-health.mjs";

export const POST = withUser(async function POST(request, { user }) {
  try {
    const connection = await loadMetaConnection(user.id);

    if (!connection?.accessToken) {
      return Response.json(
        {
          version: 1,
          status: "NOT_CONNECTED",
          error: "Meta is not connected.",
        },
        {
          status: 401,
        }
      );
    }

    const meta = createMetaClient({
      accessToken: connection.accessToken,
    });

    const result = await refreshMetaSetupSnapshot({
      connection,
      meta,
      getInstagramAccounts: getMetaInstagramAccounts,
      getPixelDetails: getMetaPixelDetails,
      getPixelEventStats: getMetaPixelEventStats,
      saveConnection: (connection) => saveMetaConnection(connection, user.id),
    });

    return Response.json({
      status: "REFRESHED",
      snapshot: result.snapshot,
    });
  } catch (error) {
    console.error("Meta setup refresh error:", error);

    return Response.json(
      {
        version: 1,
        status: "ERROR",
        error:
          error.message ||
          "Could not refresh Meta setup",
      },
      {
        status: 500,
      }
    );
  }
});
