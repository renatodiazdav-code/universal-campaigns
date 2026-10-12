import { createConnectionStore } from "./connection-store.mjs";

export async function saveMetaConnection(connection, userId) {
  return createConnectionStore().forUser(userId).save("meta", connection);
}
export async function loadMetaConnection(userId) {
  return createConnectionStore().forUser(userId).get("meta");
}
export async function deleteMetaConnection(userId) {
  return createConnectionStore().forUser(userId).delete("meta");
}

export async function saveMetaPixelSelection(pixel, userId) {
  const connection = await loadMetaConnection(userId);

  if (!connection) {
    throw new Error("Meta is not connected");
  }

  const updatedConnection = {
    ...connection,
    salesSetup: {
      ...(connection.salesSetup ?? {}),
      pixel,
    },
  };

  await saveMetaConnection(updatedConnection, userId);

  return updatedConnection;
}

export async function saveMetaSetupSnapshot(snapshot, userId) {
  const connection = await loadMetaConnection(userId);

  if (!connection) {
    throw new Error("Meta is not connected");
  }

  const updatedConnection = {
    ...connection,
    setupSnapshot: snapshot,
    setupSnapshotUpdatedAt:
      snapshot?.checkedAt ?? new Date().toISOString(),
  };

  await saveMetaConnection(updatedConnection, userId);

  return updatedConnection;
}
