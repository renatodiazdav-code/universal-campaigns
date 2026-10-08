import { createMetaClient } from "../../../../src/connectors/meta/client.mjs";
import { discoverMetaSetup } from "../../../../src/application/discover-meta-setup.mjs";

export async function GET() {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!accessToken) {
      return Response.json(
        {
          status: "NOT_CONNECTED",
          error: "Meta access token is missing",
        },
        {
          status: 401,
        }
      );
    }

    const meta = createMetaClient({
      accessToken,
    });

    const setup = await discoverMetaSetup(meta);

    return Response.json(setup);
  } catch (error) {
    console.error("Meta setup discovery error:", error);

    return Response.json(
      {
        status: "ERROR",
        error:
          error.message ||
          "Could not discover Meta setup",
      },
      {
        status: 500,
      }
    );
  }
}