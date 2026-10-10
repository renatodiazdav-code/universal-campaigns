export function evaluateMetaBudget({
  enabled,
  allocatedBudget,
  currency,
}) {
  if (!enabled) {
    return {
      platform: "META",
      selected: false,
      eligible: true,
    };
  }

  const amount = Number(allocatedBudget);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      platform: "META",
      selected: true,
      eligible: false,
      code: "META_BUDGET_REQUIRED",
      message: "Meta needs a budget greater than zero.",
      allocatedBudget: 0,
      currency,
    };
  }

  return {
    platform: "META",
    selected: true,
    eligible: true,
    allocatedBudget: amount,
    currency,
    minimumRequired: null,
    note:
      "Relay does not apply a universal Meta minimum because Meta budget constraints can vary by account and campaign configuration.",
  };
}
