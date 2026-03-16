import { useState, useEffect } from "react";
import { isPeak, isPromoActive, getNextTransition, getLocalPeakHours } from "../lib/promo";
import { formatTimeRange } from "../lib/format";
import type { PromoStatus } from "../types/usage";

export function usePromoStatus(): {
  promo: PromoStatus;
  timezone: string;
  utcOffset: string;
  peakStartLocal: number;
  peakEndLocal: number;
  currentHour: number;
} {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Extract UTC offset string
  const offsetParts = now.toLocaleString("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const gmtMatch = offsetParts.match(/GMT([+-]\d+(?::\d+)?)/);
  const utcOffset = gmtMatch ? `UTC${gmtMatch[1]}` : "UTC";

  const promoActive = isPromoActive(now);
  const peak = promoActive ? isPeak(now) : false;
  const nextTransition = promoActive ? getNextTransition(now) : now;
  const timeLeftSeconds = Math.max(0, (nextTransition.getTime() - now.getTime()) / 1000);

  const { startHour, endHour } = getLocalPeakHours(timezone, now);

  const promo: PromoStatus = {
    isPromoActive: promoActive,
    isPeak: peak,
    label: peak ? "PEAK (1×)" : "OFF-PEAK (2×)",
    timeLeftSeconds,
    nextTransitionLabel: peak
      ? `Off-peak starts at ${formatTimeRange(endHour, endHour).split(" - ")[0]} (your time)`
      : `Next peak: ${formatTimeRange(startHour, endHour)} (your time)`,
  };

  const currentHour = now.getHours() + now.getMinutes() / 60;

  return { promo, timezone, utcOffset, peakStartLocal: startHour, peakEndLocal: endHour, currentHour };
}
