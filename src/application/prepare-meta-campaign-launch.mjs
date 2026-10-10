import { refreshMetaSetupSnapshot } from "./refresh-meta-setup-snapshot.mjs";
import { deriveMetaCapabilities } from "./derive-meta-capabilities.mjs";
import { checkMetaCampaignPreflight } from "./check-meta-campaign-preflight.mjs";

export async function prepareMetaCampaignLaunch({
  campaign,
  connection,
  meta,
  getInstagramAccounts,
  saveConnection,
}) {
  if (!campaign) {
    throw new Error("Missing campaign");
  }

  if (!connection?.accessToken) {
    throw new Error("Meta is not connected");
  }

  const {
    snapshot,
    connection: refreshedConnection,
  } = await refreshMetaSetupSnapshot({
    connection,
    meta,
    getInstagramAccounts,
    saveConnection,
  });

  const capabilities = deriveMetaCapabilities(snapshot);

  const preflight = checkMetaCampaignPreflight({
    campaign,
    metaCapabilities: capabilities,
  });

  return {
    connection: refreshedConnection,
    snapshot,
    capabilities,
    preflight,
  };
}
