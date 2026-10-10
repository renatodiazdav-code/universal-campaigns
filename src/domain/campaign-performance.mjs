function toFiniteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function platformKey(platform) {
  if (!platform) {
    throw new Error("Performance platform is required");
  }

  return String(platform).toLowerCase();
}

export function createUniversalCampaignPerformance({
  platformPerformances = [],
  fallbackCurrency = null,
  now = () => new Date().toISOString(),
} = {}) {
  const sources = platformPerformances.filter(
    (performance) => performance?.metrics
  );

  const currencies = [
    ...new Set(
      sources
        .map((performance) => performance.metrics.currency)
        .filter(Boolean)
    ),
  ];

  if (currencies.length > 1) {
    throw new Error(
      `Cannot aggregate campaign performance across multiple currencies: ${currencies.join(", ")}`
    );
  }

  const currency = currencies[0] ?? fallbackCurrency ?? null;

  let spend = 0;
  let sales = 0;
  let impressions = 0;
  let clicks = 0;
  let revenue = 0;
  let revenueIsKnown = true;

  const platforms = {};

  for (const source of sources) {
    const key = platformKey(source.platform);

    if (platforms[key]) {
      throw new Error(
        `Duplicate performance source for platform: ${source.platform}`
      );
    }

    const metrics = source.metrics;

    spend += toFiniteNumber(metrics.spend);
    sales += toFiniteNumber(metrics.sales);
    impressions += toFiniteNumber(metrics.impressions);
    clicks += toFiniteNumber(metrics.clicks);

    if (metrics.revenue == null) {
      revenueIsKnown = false;
    } else {
      revenue += toFiniteNumber(metrics.revenue);
    }

    platforms[key] = {
      platform: source.platform,
      metrics,
      breakdowns: source.breakdowns ?? {},
      checkedAt: source.checkedAt ?? null,
    };
  }

  const totalRevenue = revenueIsKnown ? revenue : null;

  return {
    version: 1,
    metrics: {
      spend,
      sales,
      revenue: totalRevenue,
      costPerSale:
        sales > 0
          ? spend / sales
          : null,
      roas:
        spend > 0 && totalRevenue != null
          ? totalRevenue / spend
          : null,
      impressions,
      clicks,
      currency,
    },
    platforms,
    checkedAt: now(),
  };
}
