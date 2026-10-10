import { campaignStore } from "../../../src/application/campaign-store.mjs";

export async function GET() {
  try {
    const campaigns = await campaignStore.list();

    return Response.json({
      campaigns,
    });
  } catch (error) {
    console.error("Could not load campaigns:", error);

    return Response.json(
      {
        error: error.message || "Could not load campaigns",
      },
      {
        status: 500,
      }
    );
  }
}