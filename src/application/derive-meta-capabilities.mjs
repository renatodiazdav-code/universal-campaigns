const AVAILABLE = "AVAILABLE";
const NEEDS_SETUP = "NEEDS_SETUP";
const NEEDS_SELECTION = "NEEDS_SELECTION";
const UNKNOWN = "UNKNOWN";

function capability(status, reason = null) {
  return {
    status,
    available: status === AVAILABLE,
    reason,
  };
}

function setupRequirementStatus(resourceStatus) {
  if (resourceStatus === "READY") {
    return AVAILABLE;
  }

  if (resourceStatus === "NEEDS_SELECTION") {
    return NEEDS_SELECTION;
  }

  return NEEDS_SETUP;
}

export function deriveMetaCapabilities(snapshot) {
  if (!snapshot || snapshot.status === "NOT_CONNECTED") {
    return {
      version: 1,
      status: "NOT_CONNECTED",
      sourceCheckedAt: snapshot?.checkedAt ?? null,
      capabilities: {
        canCreateCampaigns: capability(
          NEEDS_SETUP,
          "Meta is not connected."
        ),
        canRunFacebookSales: capability(
          NEEDS_SETUP,
          "Meta is not connected."
        ),
        canRunInstagramSales: capability(
          NEEDS_SETUP,
          "Meta is not connected."
        ),
        canUseSelectedPixel: capability(
          NEEDS_SETUP,
          "Meta is not connected."
        ),
        canOptimizeForPurchase: capability(
          NEEDS_SETUP,
          "Meta is not connected."
        ),
      },
    };
  }

  const adAccountStatus = setupRequirementStatus(
    snapshot.adAccount?.status
  );
  const pageStatus = setupRequirementStatus(
    snapshot.facebookPage?.status
  );
  const pixelStatus = setupRequirementStatus(
    snapshot.tracking?.pixel?.status
  );
  const instagramStatus = setupRequirementStatus(
    snapshot.instagram?.status
  );

  const canCreateCampaigns =
    adAccountStatus === AVAILABLE
      ? capability(AVAILABLE)
      : capability(
          adAccountStatus,
          adAccountStatus === NEEDS_SELECTION
            ? "Relay needs an ad account selected before creating Meta campaigns."
            : "Relay needs an active Meta ad account before creating campaigns."
        );

  let canUseSelectedPixel;
  if (pixelStatus === AVAILABLE && snapshot.tracking?.pixel?.selected) {
    canUseSelectedPixel = capability(AVAILABLE);
  } else if (pixelStatus === NEEDS_SELECTION) {
    canUseSelectedPixel = capability(
      NEEDS_SELECTION,
      "Relay found multiple Pixels/Datasets and needs one selected for this store."
    );
  } else {
    canUseSelectedPixel = capability(
      NEEDS_SETUP,
      "A Meta Pixel/Dataset is required for Sales conversion tracking."
    );
  }

  let canRunFacebookSales;
  if (adAccountStatus !== AVAILABLE) {
    canRunFacebookSales = capability(
      adAccountStatus,
      "An active Meta ad account is required for Facebook Sales campaigns."
    );
  } else if (pageStatus !== AVAILABLE) {
    canRunFacebookSales = capability(
      pageStatus,
      "A Facebook Page is required for Facebook Sales ads."
    );
  } else if (pixelStatus !== AVAILABLE) {
    canRunFacebookSales = capability(
      pixelStatus,
      pixelStatus === NEEDS_SELECTION
        ? "A Pixel/Dataset must be selected before Relay can run Facebook Sales campaigns."
        : "A Pixel/Dataset is required before Relay can run Facebook Sales campaigns."
    );
  } else {
    canRunFacebookSales = capability(AVAILABLE);
  }

  let canRunInstagramSales;
  if (!canRunFacebookSales.available) {
    canRunInstagramSales = capability(
      canRunFacebookSales.status,
      canRunFacebookSales.reason
    );
  } else if (instagramStatus !== AVAILABLE) {
    canRunInstagramSales = capability(
      instagramStatus,
      instagramStatus === NEEDS_SELECTION
        ? "Relay found multiple Instagram identities and needs one selected."
        : "No Instagram identity is connected to this Meta advertising setup."
    );
  } else {
    canRunInstagramSales = capability(AVAILABLE);
  }

  let canOptimizeForPurchase;
  const purchaseStatus = snapshot.tracking?.purchaseEvent?.status;

  if (!canUseSelectedPixel.available) {
    canOptimizeForPurchase = capability(
      canUseSelectedPixel.status,
      canUseSelectedPixel.reason
    );
  } else if (purchaseStatus === "READY") {
    canOptimizeForPurchase = capability(AVAILABLE);
  } else if (
    purchaseStatus === "MISSING" ||
    purchaseStatus === "NEEDS_SETUP"
  ) {
    canOptimizeForPurchase = capability(
      NEEDS_SETUP,
      "Purchase tracking needs setup before Relay can verify Purchase optimization."
    );
  } else {
    canOptimizeForPurchase = capability(
      UNKNOWN,
      "Relay has a Pixel/Dataset, but Purchase event health has not been verified yet."
    );
  }

  const capabilities = {
    canCreateCampaigns,
    canRunFacebookSales,
    canRunInstagramSales,
    canUseSelectedPixel,
    canOptimizeForPurchase,
  };

  const allAvailable = Object.values(capabilities).every(
    (item) => item.status === AVAILABLE
  );
  const hasUnknown = Object.values(capabilities).some(
    (item) => item.status === UNKNOWN
  );
  const hasSetupWork = Object.values(capabilities).some(
    (item) =>
      item.status === NEEDS_SETUP ||
      item.status === NEEDS_SELECTION
  );

  return {
    version: 1,
    status: allAvailable
      ? "READY"
      : hasSetupWork
        ? "PARTIAL"
        : hasUnknown
          ? "UNKNOWN"
          : "PARTIAL",
    sourceCheckedAt: snapshot.checkedAt ?? null,
    capabilities,
  };
}
