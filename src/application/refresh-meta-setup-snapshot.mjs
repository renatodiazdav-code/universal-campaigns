import { inspectMetaSetup } from "./inspect-meta-setup.mjs";

export async function refreshMetaSetupSnapshot({
  connection,
  meta,
  getInstagramAccounts,
  saveConnection,
}) {
  if (!connection?.accessToken) {
    throw new Error("Meta is not connected");
  }

  if (typeof saveConnection !== "function") {
    throw new Error("Missing Meta connection persistence function");
  }

  const snapshot = await inspectMetaSetup({
    connection,
    meta,
    getInstagramAccounts,
  });

  const updatedConnection = {
    ...connection,
    setupSnapshot: snapshot,
    setupSnapshotUpdatedAt: snapshot.checkedAt,
  };

  if (
    snapshot.tracking?.pixel?.status === "READY" &&
    snapshot.tracking.pixel.selected
  ) {
    updatedConnection.salesSetup = {
      ...(connection.salesSetup ?? {}),
      pixel: snapshot.tracking.pixel.selected,
    };
  }

  if (
    snapshot.instagram?.status === "READY" &&
    snapshot.instagram.selected
  ) {
    updatedConnection.identity = {
      ...(connection.identity ?? {}),
      instagram: {
        mode: "INSTAGRAM_ACCOUNT",
        account: snapshot.instagram.selected,
      },
    };
  } else if (snapshot.instagram?.status === "NONE_FOUND") {
    updatedConnection.identity = {
      ...(connection.identity ?? {}),
      instagram: {
        mode: "PAGE_FALLBACK",
        account: null,
      },
    };
  }

  await saveConnection(updatedConnection);

  return {
    snapshot,
    connection: updatedConnection,
  };
}
