import { createUniversalCampaign } from "../../../src/domain/universal-campaign.mjs";
import { buildPlatformPlans } from "../../../src/application/build-platform-plans.mjs";
import { checkBudgetCompatibility } from "../../../src/application/check-budget-compatibility.mjs";
import { resolveCampaignBudgetInput } from "../../../src/application/resolve-campaign-budget-input.mjs";

export async function POST(request) {
  try {
    const rawInput = await request.json();

    const {
      input,
      allocation,
    } = await resolveCampaignBudgetInput(rawInput);

    const campaign = createUniversalCampaign(input);

    const compatibility =
      await checkBudgetCompatibility(campaign);

    if (!compatibility.eligible) {
      return Response.json(
        {
          error:
            compatibility.issues[0]?.message ||
            "Campaign budget is not compatible with the selected platforms",
          compatibility,
          allocation,
        },
        {
          status: 400,
        }
      );
    }

    const plans = buildPlatformPlans(campaign);

    return Response.json({
      campaign,
      allocation,
      compatibility,
      plans,
    });
  } catch (error) {
    console.error("Campaign plan error:", error);

    return Response.json(
      {
        error:
          error.message ||
          "Could not generate campaign plan",
        allocation: error.allocation ?? null,
      },
      {
        status: 400,
      }
    );
  }
}
