import { loadMetaConnection } from "../../../../src/application/meta-connection-store.mjs";
import { getMetaInstagramAccounts } from "../../../../src/connectors/meta/instagram-accounts.mjs";

export async function GET() {
  try {
    const connection = await loadMetaConnection();

    if (!connection?.accessToken) {
      return Response.json(
        {
          status: "NOT_CONNECTED",
          accounts: [],
        },
        {
          status: 401,
        }
      );
    }

    const adAccountId = connection.setup?.adAccount?.id;

    if (!adAccountId) {
      return Response.json(
        {
          status: "NO_AD_ACCOUNT",
          accounts: [],
        },
        {
          status: 400,
        }
      );
    }

    const accounts = await getMetaInstagramAccounts({
      adAccountId,
      accessToken: connection.accessToken,
    });

    return Response.json({
      status:
        accounts.length === 0
          ? "NONE_FOUND"
          : accounts.length === 1
            ? "READY"
            : "NEEDS_SELECTION",
      accounts,
      count: accounts.length,
      selected: accounts.length === 1 ? accounts[0] : null,
    });
  } catch (error) {
    console.error("Meta Instagram identity discovery error:", error);

    return Response.json(
      {
        status: "ERROR",
        accounts: [],
        error:
          error.message ||
          "Could not discover Meta Instagram identities",
      },
      {
        status: 500,
      }
    );
  }
}
