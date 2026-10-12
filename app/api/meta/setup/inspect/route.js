import { withUser } from "../../../../../src/application/auth-http.mjs";
import { loadMetaConnection } from "../../../../../src/application/meta-connection-store.mjs";
import { inspectMetaSetup } from "../../../../../src/application/inspect-meta-setup.mjs";
import { createMetaClient } from "../../../../../src/connectors/meta/client.mjs";
import { getMetaInstagramAccounts } from "../../../../../src/connectors/meta/instagram-accounts.mjs";
import {
  getMetaPixelDetails,
  getMetaPixelEventStats,
} from "../../../../../src/connectors/meta/pixel-health.mjs";

export const GET = withUser(async function GET(request, { user }) {
  try {
    const connection = await loadMetaConnection(user.id);

    if (!connection?.accessToken) {
      return Response.json(
        {
          version: 1,
          status: "NOT_CONNECTED",
          issues: [
            {
              code: "META_NOT_CONNECTED",
              severity: "BLOCKER",
              message: "Meta is not connected.",
            },
          ],
        },
        {
          status: 401,
        }
      );
    }

    const meta = createMetaClient({
      accessToken: connection.accessToken,
    });

    const inspection = await inspectMetaSetup({
      connection,
      meta,
      getInstagramAccounts: getMetaInstagramAccounts,
      getPixelDetails: getMetaPixelDetails,
      getPixelEventStats: getMetaPixelEventStats,
    });

    return Response.json(inspection);
  } catch (error) {
    console.error("Meta setup inspection error:", error);

    return Response.json(
      {
        version: 1,
        status: "ERROR",
        error:
          error.message ||
          "Could not inspect Meta setup",
      },
      {
        status: 500,
      }
    );
  }
});
