import { loadMetaConnection } from "../../../../../../src/application/meta-connection-store.mjs";
import {
  getMetaPixelDetails,
  getMetaPixelEventStats,
} from "../../../../../../src/connectors/meta/pixel-health.mjs";

const WINDOW_DAYS = 7;

export async function GET() {
  try {
    const connection = await loadMetaConnection();

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

    const endTime = new Date();
    const startTime = new Date(
      endTime.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const [details, stats] = await Promise.all([
      getMetaPixelDetails({
        pixelId: pixel.id,
        accessToken: connection.accessToken,
      }),
      getMetaPixelEventStats({
        pixelId: pixel.id,
        accessToken: connection.accessToken,
        event: "Purchase",
        startTime,
        endTime,
      }),
    ]);

    return Response.json({
      version: 1,
      status: "DIAGNOSTIC",
      event: "Purchase",
      pixel: {
        id: details.id ?? pixel.id,
        name: details.name ?? pixel.name ?? null,
        lastFiredTime: details.last_fired_time ?? null,
      },
      window: {
        days: WINDOW_DAYS,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      stats,
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
}
