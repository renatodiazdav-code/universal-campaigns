const DEFAULT_WINDOW_DAYS = 7;

function asValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countObservedEvents(stats) {
  let count = 0;

  function visit(value) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(value, "count")) {
      const numericCount = Number(value.count);
      if (Number.isFinite(numericCount) && numericCount > 0) {
        count += numericCount;
      }
    }

    if (Object.prototype.hasOwnProperty.call(value, "data")) {
      visit(value.data);
    }
  }

  visit(stats);
  return count;
}

export async function inspectMetaPurchaseHealth({
  pixel,
  accessToken,
  getPixelDetails,
  getPixelEventStats,
  now = new Date(),
  windowDays = DEFAULT_WINDOW_DAYS,
}) {
  if (!pixel?.id) {
    return {
      status: "NOT_CHECKED",
      event: "Purchase",
      message: "No Meta Pixel/Dataset is selected.",
    };
  }

  if (!accessToken) {
    return {
      status: "UNVERIFIED",
      event: "Purchase",
      message: "Meta is not connected, so Purchase tracking could not be verified.",
    };
  }

  if (
    typeof getPixelDetails !== "function" ||
    typeof getPixelEventStats !== "function"
  ) {
    return {
      status: "NOT_CHECKED",
      event: "Purchase",
      message: "Purchase tracking diagnostics are not available in this check.",
    };
  }

  const endTime = asValidDate(now);
  if (!endTime) {
    throw new Error("Invalid Meta Purchase health check time");
  }

  const days = Number(windowDays);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("Meta Purchase health window must be greater than zero");
  }

  const startTime = new Date(
    endTime.getTime() - days * 24 * 60 * 60 * 1000
  );

  const [detailsResult, statsResult] = await Promise.allSettled([
    getPixelDetails({
      pixelId: pixel.id,
      accessToken,
    }),
    getPixelEventStats({
      pixelId: pixel.id,
      accessToken,
      event: "Purchase",
      startTime,
      endTime,
    }),
  ]);

  const details =
    detailsResult.status === "fulfilled"
      ? detailsResult.value
      : null;
  const stats =
    statsResult.status === "fulfilled"
      ? statsResult.value
      : null;

  const lastFiredTime = details?.last_fired_time ?? null;
  const recentEventCount = stats ? countObservedEvents(stats) : null;

  const base = {
    event: "Purchase",
    checkedAt: endTime.toISOString(),
    pixel: {
      id: details?.id ?? pixel.id,
      name: details?.name ?? pixel.name ?? null,
      lastFiredTime,
    },
    window: {
      days,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    },
    recentEventCount,
  };

  if (statsResult.status === "rejected") {
    return {
      ...base,
      status: "UNVERIFIED",
      message:
        "Relay could not verify recent Purchase events from Meta right now.",
      error: statsResult.reason?.message ?? String(statsResult.reason),
    };
  }

  if (recentEventCount > 0) {
    return {
      ...base,
      status: "READY",
      message: "Recent Purchase events were observed by this Meta Pixel/Dataset.",
    };
  }

  if (detailsResult.status === "rejected") {
    return {
      ...base,
      status: "UNVERIFIED",
      message:
        "Relay could not verify recent Pixel activity from Meta right now.",
      error: detailsResult.reason?.message ?? String(detailsResult.reason),
    };
  }

  const lastFiredDate = asValidDate(lastFiredTime);

  if (!lastFiredDate || lastFiredDate < startTime) {
    return {
      ...base,
      status: "NEEDS_CHECK",
      message:
        "The selected Meta Pixel/Dataset has not fired recently. Verify store tracking before activating ad spend.",
    };
  }

  return {
    ...base,
    status: "NOT_OBSERVED",
    message:
      "The Meta Pixel/Dataset has recent activity, but no Purchase event was observed in the checked window.",
  };
}
