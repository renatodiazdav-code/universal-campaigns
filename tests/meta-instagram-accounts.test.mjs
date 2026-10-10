import test from "node:test";
import assert from "node:assert/strict";

import { getMetaInstagramAccounts } from "../src/connectors/meta/instagram-accounts.mjs";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test("discovers Instagram identities from the Meta ad account", async () => {
  let capturedUrl = null;

  const accounts = await getMetaInstagramAccounts({
    adAccountId: "123",
    accessToken: "fake-token",
    fetchImpl: async (url) => {
      capturedUrl = new URL(url);
      return jsonResponse({
        data: [
          {
            id: "ig-123",
            username: "luvixy",
            name: "Luvixy",
          },
        ],
      });
    },
  });

  assert.equal(
    capturedUrl.pathname,
    "/v26.0/act_123/instagram_accounts"
  );
  assert.equal(capturedUrl.searchParams.get("fields"), "id,username,name");
  assert.equal(capturedUrl.searchParams.get("access_token"), "fake-token");
  assert.deepEqual(accounts, [
    {
      id: "ig-123",
      username: "luvixy",
      name: "Luvixy",
    },
  ]);
});

test("returns an empty list when the ad account has no Instagram identity", async () => {
  const accounts = await getMetaInstagramAccounts({
    adAccountId: "act_123",
    accessToken: "fake-token",
    fetchImpl: async () => jsonResponse({ data: [] }),
  });

  assert.deepEqual(accounts, []);
});

test("surfaces Meta errors during Instagram identity discovery", async () => {
  await assert.rejects(
    () =>
      getMetaInstagramAccounts({
        adAccountId: "act_123",
        accessToken: "fake-token",
        fetchImpl: async () =>
          jsonResponse(
            {
              error: {
                message: "Permissions error",
              },
            },
            {
              ok: false,
              status: 400,
            }
          ),
      }),
    /Meta get Instagram accounts failed/
  );
});
