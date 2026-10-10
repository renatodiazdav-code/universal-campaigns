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

  const params = new URLSearchParams({
    base: normalizedBase,
    symbols: normalizedQuote,
  });

  const response = await fetchImpl(
    `https://api.frankfurter.dev/v1/latest?${params}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Exchange rate lookup failed: ${response.status}`
    );
  }

  const rate = Number(
    result?.rates?.[normalizedQuote]
  );

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      `No exchange rate available for ${normalizedBase}/${normalizedQuote}`
    );
  }

  const value = {
    base: normalizedBase,
    quote: normalizedQuote,
    rate,
    date: result.date ?? null,
    source: "FRANKFURTER",
  };

  cache.set(key, {
    cachedAt: now,
    value,
  });

  return value;
}
