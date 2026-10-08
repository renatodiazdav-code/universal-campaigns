export async function discoverMetaSetup(meta) {
  const businesses = await meta.getBusinesses();

  const validSetups = [];

  for (const business of businesses) {
    const adAccounts =
      await meta.getBusinessAdAccounts(business.id);

    const pages =
      await meta.getBusinessPages(business.id);

    const activeAdAccounts = adAccounts.filter(
      (account) => account.account_status === 1
    );

    if (
      activeAdAccounts.length === 0 ||
      pages.length === 0
    ) {
      continue;
    }

    validSetups.push({
      business,
      adAccounts: activeAdAccounts,
      pages,
    });
  }

  if (validSetups.length === 0) {
    return {
      status: "NO_VALID_SETUP",
      setups: [],
    };
  }

  if (
    validSetups.length === 1 &&
    validSetups[0].adAccounts.length === 1 &&
    validSetups[0].pages.length === 1
  ) {
    return {
      status: "READY",
      business: validSetups[0].business,
      adAccount: validSetups[0].adAccounts[0],
      page: validSetups[0].pages[0],
    };
  }

  return {
    status: "NEEDS_SELECTION",
    setups: validSetups,
  };
}