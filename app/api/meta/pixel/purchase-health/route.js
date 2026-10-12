import { withUser } from "../../../../../src/application/auth-http.mjs";
import { loadMetaConnection } from "../../../../../src/application/meta-connection-store.mjs";
import { inspectMetaPurchaseHealth } from "../../../../../src/application/inspect-meta-purchase-health.mjs";
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
          error: "Meta is not connected",
        },
        {
          status: 401,
        }
      );
    }

    const pixel = connection.salesSetup?.pixel;

    if (!pixel?.id) {
      return Response.json(
        {
          version: 1,
          status: "NO_PIXEL",
          error: "No Meta Pixel/Dataset is selected",
        },
        {
          status: 400,
        }
      );
    }

    const health = await inspectMetaPurchaseHealth({
      pixel,
      accessToken: connection.accessToken,
      getPixelDetails: getMetaPixelDetails,
      getPixelEventStats: getMetaPixelEventStats,
    });

    return Response.json({
      version: 1,
      ...health,
    });
  } catch (error) {
    console.error("Meta Purchase health diagnostic error:", error);

    return Response.json(
      {
        version: 1,
        status: "ERROR",
        error:
          error.message ||
          "Could not inspect Meta Purchase event health",
      },
      {
        status: 500,
      }
    );
  }
});
