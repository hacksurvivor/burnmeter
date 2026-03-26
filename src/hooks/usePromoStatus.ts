import { useState, useEffect } from "react";
import { isPeak, isPromoActive, getNextTransition, getLocalPeakHours } from "../lib/promo";
import { formatTimeRange } from "../lib/format";
import type { PromoStatus } from "../types/usage";
import type { PromoConfig } from "../types/promo";

export function usePromoStatus(config: PromoConfig | null) {
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

  if (!config) {
    const promo: PromoStatus = {
      isPromoActive: false,
      isPeak: false,
      label: "",
      timeLeftSeconds: 0,
      nextTransitionLabel: "",
    };
    return { promo, timezone, utcOffset, peakStartLocal: 0, peakEndLocal: 0, currentHour: 0, isWeekend: false, promoEndDate: "" };
  }

  const ptDayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "short",
  });
  const ptDay = ptDayFmt.format(now);
  const isWeekend = ptDay === "Sat" || ptDay === "Sun";

  const promoActive = isPromoActive(now, config);
  const peak = promoActive ? isPeak(now, config) : false;
  const nextTransition = promoActive ? getNextTransition(now, config) : now;
  const timeLeftSeconds = Math.max(0, (nextTransition.getTime() - now.getTime()) / 1000);

  const { startHour, endHour } = getLocalPeakHours(timezone, now, config);

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

  // Derive "Ends Mar 27" from config.end
  const [ey, em, ed] = config.end.split("-").map(Number);
  const endDate = new Date(ey, em - 1, ed - 1); // -1 because end is exclusive
  const promoEndDate = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    promo,
    timezone,
    utcOffset,
    peakStartLocal: startHour,
    peakEndLocal: endHour,
    currentHour,
    isWeekend,
    promoEndDate,
  };
}
