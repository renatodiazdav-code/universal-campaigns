import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import { deriveMetaCapabilities } from "../../../../src/application/derive-meta-capabilities.mjs";

export async function GET() {
  try {
    const connection = await loadMetaConnection();

    if (!connection?.accessToken) {
      const result = deriveMetaCapabilities({
        status: "NOT_CONNECTED",
      });

      return Response.json(result, {
        status: 401,
      });
    }

    if (!connection.setupSnapshot) {
      return Response.json(
        {
          version: 1,
          status: "NEEDS_REFRESH",
          sourceCheckedAt: null,
          capabilities: null,
          message:
            "Meta is connected, but Relay has not created a setup snapshot yet. Refresh Meta setup first.",
        },
        {
          status: 409,
        }
      );
    }

    return Response.json(
      deriveMetaCapabilities(connection.setupSnapshot)
    );
  } catch (error) {
    console.error("Meta capabilities error:", error);

    return Response.json(
      {
        version: 1,
        status: "ERROR",
        error:
          error.message ||
          "Could not derive Meta capabilities",
      },
      {
        status: 500,
      }
    );
  }
}
