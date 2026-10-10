function check(id, status, message, details = null) {
  return {
    id,
    status,
    message,
    details,
  };
}

function capabilityCheck({
  id,
  label,
  capability,
  unknownIsWarning = false,
}) {
  if (!capability) {
    return check(
      id,
      "BLOCKER",
      `${label} could not be evaluated.`
    );
  }

  if (capability.status === "AVAILABLE") {
    return check(id, "PASS", `${label} is ready.`);
  }

  if (capability.status === "UNKNOWN" && unknownIsWarning) {
    return check(
      id,
      "WARNING",
      capability.reason ?? `${label} has not been verified yet.`,
      {
        capabilityStatus: capability.status,
      }
    );
  }

  return check(
    id,
    "BLOCKER",
    capability.reason ?? `${label} needs setup before launch.`,
    {
      capabilityStatus: capability.status,
    }
  );
}

export function checkMetaCampaignPreflight({
  campaign,
  metaCapabilities,
}) {
  if (!campaign) {
    throw new Error("Missing campaign");
  }

  if (!metaCapabilities?.capabilities) {
    throw new Error("Missing Meta capabilities");
  }

  if (!campaign.platforms?.meta?.enabled) {
    return {
      version: 1,
      platform: "META",
      status: "NOT_APPLICABLE",
      ready: true,
      checks: [],
      blockers: [],
      warnings: [],
    };
  }

  const capabilities = metaCapabilities.capabilities;
  const checks = [];

  checks.push(
    capabilityCheck({
      id: "META_CAMPAIGN_CREATION",
      label: "Meta campaign creation",
      capability: capabilities.canCreateCampaigns,
    })
  );

  if (campaign.platforms.meta.facebook) {
    checks.push(
      capabilityCheck({
        id: "META_FACEBOOK_SALES",
        label: "Facebook Sales",
        capability: capabilities.canRunFacebookSales,
      })
    );
  }

  if (campaign.platforms.meta.instagram) {
    checks.push(
      capabilityCheck({
        id: "META_INSTAGRAM_SALES",
        label: "Instagram Sales",
        capability: capabilities.canRunInstagramSales,
      })
    );
  }

  checks.push(
    capabilityCheck({
      id: "META_PURCHASE_OPTIMIZATION",
      label: "Purchase optimization",
      capability: capabilities.canOptimizeForPurchase,
      unknownIsWarning: true,
    })
  );

  const blockers = checks.filter(
    (item) => item.status === "BLOCKER"
  );
  const warnings = checks.filter(
    (item) => item.status === "WARNING"
  );

  const status = blockers.length > 0
    ? "BLOCKED"
    : warnings.length > 0
      ? "READY_WITH_WARNINGS"
      : "READY";

  return {
    version: 1,
    platform: "META",
    status,
    ready: blockers.length === 0,
    sourceCheckedAt: metaCapabilities.sourceCheckedAt ?? null,
    checks,
    blockers,
    warnings,
  };
}
