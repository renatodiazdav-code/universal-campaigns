import { resolveBudgetAllocation } from "./resolve-budget-allocation.mjs";

export async function resolveCampaignBudgetInput(
  input,
  options = {}
) {
  const allocationMode = String(
    input?.budget?.allocation?.mode ?? "MANUAL"
  ).toUpperCase();

  if (allocationMode !== "AUTO") {
    return {
      input,
      allocation: null,
    };
  }

  const allocation = await resolveBudgetAllocation(
    {
      budget: {
        mode: input?.budget?.mode,
        amount:
          input?.budget?.amount ??
          input?.budget?.total,
        currency: input?.budget?.currency,
        durationDays: input?.budget?.durationDays,
      },
      platforms: input?.platforms,
    },
    options
  );

  if (!allocation.eligible || !allocation.allocation) {
    const error = new Error(
      allocation.message ||
        "Relay could not create a valid automatic budget allocation."
    );

    error.code =
      allocation.code ||
      "AUTO_ALLOCATION_FAILED";
    error.allocation = allocation;

    throw error;
  }

  return {
    input: {
      ...input,
      budget: {
        ...input.budget,
        allocation: {
          mode: "AUTO",
          meta: allocation.allocation.meta,
          tiktok: allocation.allocation.tiktok,
        },
      },
    },
    allocation,
  };
}
