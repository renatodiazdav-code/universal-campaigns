function chooseSelectedItem(items, selectedId) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  if (selectedId) {
    const selected = items.find(
      (item) => String(item.id) === String(selectedId)
    );

    if (selected) {
      return selected;
    }
  }

  return items.length === 1 ? items[0] : null;
}

function buildSelectionState(items, selectedItem, {
  noneStatus = "NONE_FOUND",
  readyStatus = "READY",
  multipleStatus = "NEEDS_SELECTION",
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return noneStatus;
  }

  if (selectedItem) {
    return readyStatus;
  }

  return multipleStatus;
}

export async function inspectMetaSetup({
  connection,
  meta,
  getInstagramAccounts,
}) {
  if (!connection?.accessToken) {
    return {
      version: 1,
      status: "NOT_CONNECTED",
      checkedAt: new Date().toISOString(),
      issues: [
        {
          code: "META_NOT_CONNECTED",
          severity: "BLOCKER",
          message: "Meta is not connected.",
        },
      ],
    };
  }

  if (!meta) {
    throw new Error("Missing Meta client");
  }

  if (typeof getInstagramAccounts !== "function") {
    throw new Error("Missing Instagram discovery function");
  }

  const storedSetup = connection.setup ?? {};
  const storedBusiness = storedSetup.business ?? null;
  const storedAdAccount = storedSetup.adAccount ?? null;
  const storedPage = storedSetup.page ?? null;

  if (
    storedSetup.status !== "READY" ||
    !storedBusiness?.id ||
    !storedAdAccount?.id ||
    !storedPage?.id
  ) {
    return {
      version: 1,
      status:
        storedSetup.status === "NEEDS_SELECTION"
          ? "NEEDS_SELECTION"
          : "NEEDS_SETUP",
      checkedAt: new Date().toISOString(),
      selection: storedSetup,
      issues: [
        {
          code: "META_BASE_SETUP_INCOMPLETE",
          severity: "BLOCKER",
          message:
            "Relay still needs a valid Meta business, ad account, and Facebook Page selection.",
        },
      ],
    };
  }

  const [adAccounts, pages, pixels, instagramAccounts] =
    await Promise.all([
      meta.getBusinessAdAccounts(storedBusiness.id),
      meta.getBusinessPages(storedBusiness.id),
      meta.getAdAccountPixels(storedAdAccount.id),
      getInstagramAccounts({
        adAccountId: storedAdAccount.id,
        accessToken: connection.accessToken,
      }),
    ]);

  const liveAdAccount = adAccounts.find(
    (account) => String(account.id) === String(storedAdAccount.id)
  ) ?? null;

  const livePage = pages.find(
    (page) => String(page.id) === String(storedPage.id)
  ) ?? null;

  const storedPixelId = connection.salesSetup?.pixel?.id ?? null;
  const selectedPixel = chooseSelectedItem(pixels, storedPixelId);
  const pixelStatus = buildSelectionState(pixels, selectedPixel, {
    noneStatus: "NONE_FOUND",
    readyStatus: "READY",
    multipleStatus: "NEEDS_SELECTION",
  });

  const selectedInstagram = chooseSelectedItem(
    instagramAccounts,
    connection.identity?.instagram?.account?.id ?? null
  );
  const instagramStatus = buildSelectionState(
    instagramAccounts,
    selectedInstagram,
    {
      noneStatus: "NONE_FOUND",
      readyStatus: "READY",
      multipleStatus: "NEEDS_SELECTION",
    }
  );

  const issues = [];

  const adAccountActive = liveAdAccount?.account_status === 1;

  if (!liveAdAccount) {
    issues.push({
      code: "META_AD_ACCOUNT_NOT_ACCESSIBLE",
      severity: "BLOCKER",
      message:
        "The selected Meta ad account is no longer accessible to Relay.",
    });
  } else if (!adAccountActive) {
    issues.push({
      code: "META_AD_ACCOUNT_NOT_ACTIVE",
      severity: "BLOCKER",
      message:
        "The selected Meta ad account is not active and needs attention before Relay can launch ads.",
    });
  }

  if (!livePage) {
    issues.push({
      code: "META_PAGE_NOT_ACCESSIBLE",
      severity: "BLOCKER",
      message:
        "The selected Facebook Page is no longer accessible to Relay.",
    });
  }

  if (pixelStatus === "NONE_FOUND") {
    issues.push({
      code: "META_PIXEL_MISSING",
      severity: "BLOCKER",
      message:
        "Relay could not find a Meta Pixel/Dataset for this ad account. Sales campaigns need purchase tracking setup.",
    });
  } else if (pixelStatus === "NEEDS_SELECTION") {
    issues.push({
      code: "META_PIXEL_SELECTION_REQUIRED",
      severity: "ACTION",
      message:
        "Relay found multiple Meta Pixels/Datasets and needs to know which one belongs to this store.",
    });
  }

  if (instagramStatus === "NONE_FOUND") {
    issues.push({
      code: "META_INSTAGRAM_IDENTITY_MISSING",
      severity: "WARNING",
      message:
        "No Instagram identity is connected to this Meta ad account. Facebook campaigns can still be prepared, but Instagram identity may require setup.",
    });
  } else if (instagramStatus === "NEEDS_SELECTION") {
    issues.push({
      code: "META_INSTAGRAM_SELECTION_REQUIRED",
      severity: "ACTION",
      message:
        "Relay found multiple Instagram identities. An Instagram campaign will need one selected.",
    });
  }

  const hasBlocker = issues.some(
    (issue) => issue.severity === "BLOCKER"
  );
  const needsSelection = issues.some(
    (issue) => issue.severity === "ACTION"
  );

  const status = hasBlocker
    ? "NEEDS_SETUP"
    : needsSelection
      ? "NEEDS_SELECTION"
      : "READY";

  return {
    version: 1,
    status,
    checkedAt: new Date().toISOString(),

    business: {
      status: "READY",
      selected: storedBusiness,
    },

    adAccount: {
      status: adAccountActive ? "READY" : "NEEDS_SETUP",
      selected: liveAdAccount ?? storedAdAccount,
      currency:
        liveAdAccount?.currency ?? storedAdAccount?.currency ?? null,
      accountStatus:
        liveAdAccount?.account_status ?? null,
    },

    facebookPage: {
      status: livePage ? "READY" : "NEEDS_SETUP",
      selected: livePage ?? storedPage,
    },

    instagram: {
      status: instagramStatus,
      selected: selectedInstagram,
      accounts: instagramAccounts,
      count: instagramAccounts.length,
    },

    tracking: {
      pixel: {
        status: pixelStatus,
        selected: selectedPixel,
        pixels,
        count: pixels.length,
      },
      purchaseEvent: {
        status: "NOT_CHECKED",
        message:
          "Pixel presence is known, but purchase event health is not checked in Meta Setup Engine v1 yet.",
      },
    },

    issues,
  };
}
