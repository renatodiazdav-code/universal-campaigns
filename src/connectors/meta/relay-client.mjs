import { createMetaClient } from "./client.mjs";
import { createAdvancedMetaAdSet } from "./advanced-adset.mjs";

export function createRelayMetaClient({
  adAccountId,
  accessToken,
}) {
  const baseClient = createMetaClient({
    adAccountId,
    accessToken,
  });

  return {
    ...baseClient,
    createAdSet(input) {
      return createAdvancedMetaAdSet({
        adAccountId,
        accessToken,
        ...input,
      });
    },
  };
}
