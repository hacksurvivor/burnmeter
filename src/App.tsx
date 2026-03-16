import { Header } from "./components/Header";
import { PromoTimer } from "./components/PromoTimer";
import { UsageLimits } from "./components/UsageLimits";
import { QuickInfo } from "./components/QuickInfo";
import { useUsageData } from "./hooks/useUsageData";
import { usePromoStatus } from "./hooks/usePromoStatus";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import type { TrayStatus } from "./lib/constants";
import { PROMO_END, PROMO_TZ } from "./lib/constants";

// Derive promo end date string from the constant, displayed in user's timezone
const promoEndRaw = new Date(PROMO_END + "Z"); // treat as UTC for parsing
// Promo ends at 2026-03-28T00:00:00 PT, show the last day (Mar 27)
const lastPromoDay = new Date(promoEndRaw.getTime() - 86400000); // subtract 1 day
const promoEndDate = lastPromoDay.toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  timeZone: PROMO_TZ,
});

export default function App() {
  const { usage, error, lastUpdated, isStale } = useUsageData();
  const { promo, timezone, utcOffset, peakStartLocal, peakEndLocal, currentHour, isWeekend } =
    usePromoStatus();

  useEffect(() => {
    let status: TrayStatus;
    if (!promo.isPromoActive) status = "gray";
    else if (promo.isPeak) status = "orange";
    else status = "green";
    invoke("update_tray_status", { status }).catch(() => {});
  }, [promo.isPromoActive, promo.isPeak]);

  return (
    <div className="app">
      <Header timezone={timezone} utcOffset={utcOffset} />
      <PromoTimer
        promo={promo}
        peakStartLocal={peakStartLocal}
        peakEndLocal={peakEndLocal}
        currentHour={currentHour}
        isWeekend={isWeekend}
      />
      <div className="divider" />
      <UsageLimits usage={usage} isStale={isStale} />
      <QuickInfo
        plan={null}
        isPromoActive={promo.isPromoActive}
        promoEndDate={promoEndDate}
        lastUpdated={lastUpdated}
        error={error}
      />
    </div>
  );
}
