import { loadMetaConnection } from "../../../../../src/application/meta-connection-store.mjs";
import { inspectMetaSetup } from "../../../../../src/application/inspect-meta-setup.mjs";
import { createMetaClient } from "../../../../../src/connectors/meta/client.mjs";
import { getMetaInstagramAccounts } from "../../../../../src/connectors/meta/instagram-accounts.mjs";

export async function GET() {
  try {
    const connection = await loadMetaConnection();

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
}
