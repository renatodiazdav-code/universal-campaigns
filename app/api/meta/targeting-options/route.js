import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import {
  browseMetaDetailedTargeting,
  searchMetaDetailedTargeting,
} from "../../../../src/connectors/meta/audience-discovery.mjs";

export async function GET(request) {
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

    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const browse = url.searchParams.get("browse");

    let options = [];
    let mode = "SEARCH";

    if (browse) {
      mode = "BROWSE";
      options = await browseMetaDetailedTargeting({
        adAccountId,
        accessToken: connection.accessToken,
        group: browse,
      });
    } else {
      options = await searchMetaDetailedTargeting({
        adAccountId,
        accessToken: connection.accessToken,
        query,
      });
    }

    return Response.json({
      status: "READY",
      mode,
      options,
    });
  } catch (error) {
    console.error("Meta targeting options error:", error);

    const unsupportedBrowse = /Unsupported Meta targeting browse group/.test(
      error.message || ""
    );

    return Response.json(
      {
        status: "ERROR",
        error: error.message || "Could not load Meta targeting options",
      },
      { status: unsupportedBrowse ? 400 : 500 }
    );
  }
}
