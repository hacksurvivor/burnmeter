import { Header } from "./components/Header";
import { PromoTimer } from "./components/PromoTimer";
import { UsageLimits } from "./components/UsageLimits";
import { QuickInfo } from "./components/QuickInfo";
import { useUsageData } from "./hooks/useUsageData";
import { usePromoStatus } from "./hooks/usePromoStatus";
import { usePromoConfig } from "./hooks/usePromoConfig";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import type { TrayStatus } from "./lib/constants";

export default function App() {
  const { usage, error, lastUpdated, isStale } = useUsageData();
  const config = usePromoConfig();
  const { promo, timezone, utcOffset, peakStartLocal, peakEndLocal, currentHour, isWeekend, promoEndDate } =
    usePromoStatus(config);

  useEffect(() => {
    let status: TrayStatus;
    if (!promo.isPromoActive) status = "gray";
    else if (promo.isPeak) status = "orange";
    else status = "green";
    const pct = usage ? Math.round(100 - usage.five_hour_pct) : null;
    invoke("update_tray_status", { status, pct }).catch(() => {});
  }, [promo.isPromoActive, promo.isPeak, usage]);

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
        isPromoActive={promo.isPromoActive}
        promoEndDate={promoEndDate}
        lastUpdated={lastUpdated}
        error={error}
      />
    </div>
  );
}
