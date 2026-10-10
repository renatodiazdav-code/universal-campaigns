import { checkBudgetCompatibility } from "../../../src/application/check-budget-compatibility.mjs";

export async function POST(request) {
  try {
    const input = await request.json();

    const compatibility =
      await checkBudgetCompatibility(input);

    // An incompatible budget is a valid evaluation result, not an API failure.
    // Consumers should read `eligible` and `issues` to decide whether to proceed.
    return Response.json(compatibility, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Budget compatibility error:",
      error
    );

    return Response.json(
      {
        eligible: false,
        error:
          error.message ||
          "Could not validate campaign budget",
      },
      {
        status: 500,
      }
    );
  }
}
