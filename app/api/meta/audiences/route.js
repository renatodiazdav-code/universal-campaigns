import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import { listMetaExistingAudiences } from "../../../../src/connectors/meta/audience-discovery.mjs";

export async function GET() {
  try {
    const connection = await loadMetaConnection();

    if (!connection?.accessToken) {
      return Response.json(
        { status: "NOT_CONNECTED", error: "Meta is not connected" },
        { status: 401 }
      );
    }

    const adAccountId = connection.setup?.adAccount?.id;

    if (!adAccountId) {
      return Response.json(
        {
          status: "NEEDS_SETUP",
          error: "Meta ad account is not configured",
        },
        { status: 400 }
      );
    }

    const audiences = await listMetaExistingAudiences({
      adAccountId,
      accessToken: connection.accessToken,
    });

    return Response.json({
      status: "READY",
      audiences,
    });
  } catch (error) {
    console.error("Meta audiences error:", error);

    return Response.json(
      {
        status: "ERROR",
        error: error.message || "Could not load Meta audiences",
      },
      { status: 500 }
    );
  }
}
