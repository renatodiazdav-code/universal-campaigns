import test from "node:test";
import assert from "node:assert/strict";

import {
  getExchangeRate,
} from "../src/connectors/fx/frankfurter.mjs";

test("reads an exchange rate from Frankfurter", async () => {
  let requestedUrl = "";

  const fetchImpl = async (url) => {
    requestedUrl = String(url);

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          amount: 1,
          base: "USD",
          date: "2026-10-10",
          rates: {
            PEN: 3.45,
          },
        };
      },
    };
  };

  const result = await getExchangeRate({
    base: "USD",
    quote: "PEN",
    fetchImpl,
    now: 1,
  });

  const url = new URL(requestedUrl);

  assert.equal(
    url.hostname,
    "api.frankfurter.dev"
  );
  assert.equal(
    url.searchParams.get("base"),
    "USD"
  );
  assert.equal(
    url.searchParams.get("symbols"),
    "PEN"
  );
  assert.equal(result.rate, 3.45);
  assert.equal(result.source, "FRANKFURTER");
});

test("returns an identity rate for the same currency", async () => {
  const result = await getExchangeRate({
    base: "USD",
    quote: "USD",
  });

  assert.equal(result.rate, 1);
  assert.equal(result.source, "IDENTITY");
});
