import { Header } from "./components/Header";
import { PromoTimer } from "./components/PromoTimer";
import { UsageLimits } from "./components/UsageLimits";
import { QuickInfo } from "./components/QuickInfo";
import { useUsageData } from "./hooks/useUsageData";
import { usePromoStatus } from "./hooks/usePromoStatus";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import type { TrayStatus } from "./lib/constants";

export default function App() {
  const { usage, error, lastUpdated, isStale } = useUsageData();
  const { promo, timezone, utcOffset, peakStartLocal, peakEndLocal, currentHour } =
    usePromoStatus();

  useEffect(() => {
    let status: TrayStatus;
    if (!promo.isPromoActive) {
      status = "gray";
    } else if (promo.isPeak) {
      status = "orange";
    } else {
      status = "green";
    }
    invoke("update_tray_status", { status }).catch(() => {});
  }, [promo.isPromoActive, promo.isPeak]);

  return (
    <div className="app crt crt--flicker">
      <div className="app__content">
        <Header timezone={timezone} utcOffset={utcOffset} />
        <PromoTimer
          promo={promo}
          peakStartLocal={peakStartLocal}
          peakEndLocal={peakEndLocal}
          currentHour={currentHour}
        />
        <UsageLimits usage={usage} isStale={isStale} />
        <QuickInfo
          plan={usage?.plan ?? null}
          isPromoActive={promo.isPromoActive}
          promoEndDate="Mar 27"
          lastUpdated={lastUpdated}
          error={error}
        />
      </div>
    </div>
  );
}
