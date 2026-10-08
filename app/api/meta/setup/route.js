import { createMetaClient } from "../../../../src/connectors/meta/client.mjs";
import { discoverMetaSetup } from "../../../../src/application/discover-meta-setup.mjs";
import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";

export async function GET() {
  try {
    const connection = await loadMetaConnection();

    if (!connection?.accessToken) {
      return Response.json(
        {
          status: "NOT_CONNECTED",
        },
        {
          status: 401,
        }
      );
    }

    const meta = createMetaClient({
      accessToken: connection.accessToken,
    });

    const setup = await discoverMetaSetup(meta);

    return Response.json(setup);
  } catch (error) {
    console.error("Meta setup discovery error:", error);

    return Response.json(
      {
        status: "ERROR",
        error:
          error.message ||
          "Could not discover Meta setup",
      },
      {
        status: 500,
      }
    );
  }
}