import { withUser } from "../../../../../src/application/auth-http.mjs";
import {
  loadMetaConnection,
  saveMetaConnection,
  saveMetaPixelSelection,
} from "../../../../../src/application/meta-connection-store.mjs";
import { inspectMetaSetup } from "../../../../../src/application/inspect-meta-setup.mjs";
import { createMetaClient } from "../../../../../src/connectors/meta/client.mjs";
import { getMetaInstagramAccounts } from "../../../../../src/connectors/meta/instagram-accounts.mjs";
import {
  getMetaPixelDetails,
  getMetaPixelEventStats,
} from "../../../../../src/connectors/meta/pixel-health.mjs";

export const POST = withUser(async function POST(request, { user }) {
  try {
    const { pixelId } = await request.json();
    if (!pixelId) {
      return Response.json({ error: "Choose a Meta Pixel/Dataset." }, { status: 400 });
    }

    const connection = await loadMetaConnection(user.id);
    if (!connection?.accessToken) {
      return Response.json({ error: "Meta is not connected." }, { status: 401 });
    }

    const meta = createMetaClient({ accessToken: connection.accessToken });
    const inspection = await inspectMetaSetup({
      connection,
      meta,
      getInstagramAccounts: getMetaInstagramAccounts,
      getPixelDetails: getMetaPixelDetails,
      getPixelEventStats: getMetaPixelEventStats,
    });
    const pixel = inspection.tracking?.pixel?.pixels?.find(
      (candidate) => String(candidate.id) === String(pixelId)
    );

    if (!pixel) {
      return Response.json(
        { error: "That Pixel/Dataset is not available in this Meta ad account." },
        { status: 400 }
      );
    }

    const updatedConnection = await saveMetaPixelSelection(pixel, user.id);
    const refreshedInspection = await inspectMetaSetup({
      connection: updatedConnection,
      meta,
      getInstagramAccounts: getMetaInstagramAccounts,
      getPixelDetails: getMetaPixelDetails,
      getPixelEventStats: getMetaPixelEventStats,
    });

    await saveMetaConnection(
      {
        ...updatedConnection,
        setupSnapshot: refreshedInspection,
        setupSnapshotUpdatedAt: refreshedInspection.checkedAt,
      },
      user.id
    );

    return Response.json({ status: "SELECTED", snapshot: refreshedInspection });
  } catch (error) {
    console.error("Meta Pixel selection error:", error);
    return Response.json(
      { error: error.message || "Could not select the Meta Pixel/Dataset." },
      { status: 500 }
    );
  }
});