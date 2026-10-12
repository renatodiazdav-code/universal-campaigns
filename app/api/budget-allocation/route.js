import { withUser } from "../../../src/application/auth-http.mjs";
import { resolveBudgetAllocation } from "../../../src/application/resolve-budget-allocation.mjs";

export const POST = withUser(async function POST(request) {
  try {
    const input = await request.json();

    const allocation =
      await resolveBudgetAllocation(input);

    return Response.json(allocation);
  } catch (error) {
    console.error(
      "Budget allocation error:",
      error
    );

    return Response.json(
      {
        eligible: false,
        error:
          error.message ||
          "Could not resolve campaign budget allocation",
      },
      {
        status: 500,
      }
    );
  }
});
