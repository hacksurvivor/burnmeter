import { useState, useEffect } from "react";
import { isPeak, isPromoActive, getNextTransition, getLocalPeakHours } from "../lib/promo";
import { formatTimeRange } from "../lib/format";
import type { PromoStatus } from "../types/usage";
import { PROMO_TZ } from "../lib/constants";

export function usePromoStatus() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const offsetParts = now.toLocaleString("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const gmtMatch = offsetParts.match(/GMT([+-]\d+(?::\d+)?)/);
  const utcOffset = gmtMatch ? `UTC${gmtMatch[1]}` : "UTC";

  // Check if it's a weekend in PT
  const ptDayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PROMO_TZ,
    weekday: "short",
  });
  const ptDay = ptDayFmt.format(now);
  const isWeekend = ptDay === "Sat" || ptDay === "Sun";

  const promoActive = isPromoActive(now);
  const peak = promoActive ? isPeak(now) : false;
  const nextTransition = promoActive ? getNextTransition(now) : now;
  const timeLeftSeconds = Math.max(0, (nextTransition.getTime() - now.getTime()) / 1000);

  const { startHour, endHour } = getLocalPeakHours(timezone, now);

  let nextLabel: string;
  if (isWeekend) {
    nextLabel = "Weekend — all day 2x bonus tokens";
  } else if (peak) {
    nextLabel = `Off-peak at ${formatTimeRange(endHour, endHour).split(" - ")[0]} (your time)`;
  } else {
    nextLabel = `Next peak: ${formatTimeRange(startHour, endHour)} (your time)`;
  }

  const promo: PromoStatus = {
    isPromoActive: promoActive,
    isPeak: peak,
    label: peak ? "PEAK (1x)" : "OFF-PEAK (2x)",
    timeLeftSeconds,
    nextTransitionLabel: nextLabel,
  };

  const currentHour = now.getHours() + now.getMinutes() / 60;

  return {
    promo,
    timezone,
    utcOffset,
    peakStartLocal: startHour,
    peakEndLocal: endHour,
    currentHour,
    isWeekend,
  };
}
