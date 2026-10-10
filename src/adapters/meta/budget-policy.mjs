export function evaluateMetaBudget({
  enabled,
  allocatedBudget,
  currency,
  budgetMode = "TOTAL",
}) {
  if (!enabled) {
    return {
      platform: "META",
      selected: false,
      eligible: true,
    };
  }

  const amount = Number(allocatedBudget);
  const mode = String(budgetMode).toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      platform: "META",
      selected: true,
      eligible: false,
      code: "META_BUDGET_REQUIRED",
      message: "Meta needs a budget greater than zero.",
      allocatedBudget: 0,
      currency,
      budgetMode: mode,
    };
  }

  return {
    platform: "META",
    selected: true,
    eligible: true,
    allocatedBudget: amount,
    currency,
    budgetMode: mode,
    minimumRequired: null,
    note:
      "Relay does not apply a universal Meta minimum because Meta budget constraints can vary by account and campaign configuration.",
  };
}
