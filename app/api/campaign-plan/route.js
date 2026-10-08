import { createUniversalCampaign } from "../../../src/domain/universal-campaign.mjs";
import { buildPlatformPlans } from "../../../src/application/build-platform-plans.mjs";

export async function POST(request) {
  try {
    const input = await request.json();

    const campaign = createUniversalCampaign(input);

    const plans = buildPlatformPlans(campaign);

    return Response.json({
      campaign,
      plans,
    });
  } catch (error) {
    console.error("Campaign plan error:", error);

    return Response.json(
      {
        error: error.message || "Could not generate campaign plan",
      },
      {
        status: 400,
      }
    );
  }
}