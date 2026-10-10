const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

export async function getExchangeRate({
  base,
  quote,
  fetchImpl = fetch,
  now = Date.now(),
}) {
  const normalizedBase = String(base || "").toUpperCase();
  const normalizedQuote = String(quote || "").toUpperCase();

  if (!normalizedBase || !normalizedQuote) {
    throw new Error("Missing currency for exchange rate");
  }

  if (normalizedBase === normalizedQuote) {
    return {
      base: normalizedBase,
      quote: normalizedQuote,
      rate: 1,
      date: null,
      source: "IDENTITY",
    };
  }

  const key = `${normalizedBase}:${normalizedQuote}`;
  const cached = cache.get(key);

  if (
    cached &&
    now - cached.cachedAt < CACHE_TTL_MS
  ) {
    return cached.value;
  }

  const response = await fetchImpl(
    `https://api.frankfurter.dev/v2/rate/${normalizedBase.toLowerCase()}/${normalizedQuote.toLowerCase()}`
  );

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      `Exchange rate lookup failed: ${response.status}`
    );
  }

  const rate = Number(result?.rate);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      `No exchange rate available for ${normalizedBase}/${normalizedQuote}`
    );
  }

  const value = {
    base: normalizedBase,
    quote: normalizedQuote,
    rate,
    date: result?.date ?? null,
    source: "FRANKFURTER_V2",
  };

  cache.set(key, {
    cachedAt: now,
    value,
  });

  return value;
}
