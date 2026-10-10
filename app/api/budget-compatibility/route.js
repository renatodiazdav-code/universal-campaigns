import { checkBudgetCompatibility } from "../../../src/application/check-budget-compatibility.mjs";

export async function POST(request) {
  try {
    const input = await request.json();

    const compatibility =
      await checkBudgetCompatibility(input);

    return Response.json(compatibility, {
      status: compatibility.eligible
        ? 200
        : 400,
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
