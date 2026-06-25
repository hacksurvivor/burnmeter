import { Header } from "./components/Header";
import { PromoTimer } from "./components/PromoTimer";
import { UsageLimits } from "./components/UsageLimits";
import { QuickInfo } from "./components/QuickInfo";
import { SettingsPanel } from "./components/SettingsPanel";
import { useUsageData } from "./hooks/useUsageData";
import { usePromoStatus } from "./hooks/usePromoStatus";
import { usePromoConfig } from "./hooks/usePromoConfig";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { TrayStatus } from "./lib/constants";
import type { UpdateInfo, UsageData } from "./types/usage";

export default function App() {
  const { usage, error, isStale, retry } = useUsageData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const config = usePromoConfig();
  const { promo, timezone, utcOffset, peakStartLocal, peakEndLocal, currentHour, isWeekend, promoEndDate } =
    usePromoStatus(config);

  useEffect(() => {
    let status: TrayStatus;
    if (!promo.isPromoActive) status = "gray";
    else if (promo.isPeak) status = "orange";
    else status = "green";
    const tray = usage ? traySummary(usage) : null;
    invoke("update_tray_status", {
      status,
      summary: tray?.title ?? null,
      tooltip: tray?.tooltip ?? null,
    }).catch(() => {});
  }, [promo.isPromoActive, promo.isPeak, usage]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      invoke<UpdateInfo>("check_for_update")
        .then((info) => {
          if (!cancelled) {
            setUpdateInfo(info);
            setUpdateError(null);
          }
        })
        .catch((error) => {
          if (!cancelled) setUpdateError(String(error));
        });
    };
    check();
    const timer = window.setInterval(check, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="app dark">
      <Header
        timezone={timezone}
        utcOffset={utcOffset}
        settingsOpen={settingsOpen}
        updateAvailable={updateInfo?.available ?? false}
        onSettingsClick={() => setSettingsOpen((open) => !open)}
      />
      {settingsOpen ? (
        <div
          className="settings-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <SettingsPanel
            usage={usage}
            updateInfo={updateInfo}
            updateError={updateError}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      ) : null}
      {promo.isPromoActive ? (
        <>
          <PromoTimer
            promo={promo}
            peakStartLocal={peakStartLocal}
            peakEndLocal={peakEndLocal}
            currentHour={currentHour}
            isWeekend={isWeekend}
          />
          <div className="divider" />
        </>
      ) : null}
      <UsageLimits
        usage={usage}
        isStale={isStale}
        onRetry={retry}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <QuickInfo
        isPromoActive={promo.isPromoActive}
        promoEndDate={promoEndDate}
        error={error}
      />
    </div>
  );
}

export function traySummary(usage: UsageData): { title: string; tooltip: string } | null {
  if (usage.providers.length === 0) return null;

  const providers = usage.providers.map((provider) => {
    const fiveHour = remainingPercent(provider.five_hour_pct);
    const sevenDay = remainingPercent(provider.seven_day_pct);
    return { provider, fiveHour, sevenDay };
  });
  const lowestFiveHourProvider = providers.reduce((lowest, current) =>
    current.fiveHour < lowest.fiveHour ? current : lowest,
  );
  const title = `${lowestFiveHourProvider.fiveHour}%`;
  const tooltip = providers
    .map(({ provider, fiveHour, sevenDay }) => {
      const label = trayProviderLabel(provider.provider, provider.label);
      return `${label}: ${fiveHour}% 5h · ${sevenDay}% 7d`;
    })
    .join("\n");

  return { title, tooltip };
}

function trayProviderLabel(provider: string, label: string): string {
  const labels: Record<string, string> = {
    claude: "Claude",
    codex: "Codex",
  };
  return labels[provider] ?? label;
}

function remainingPercent(usagePercent: number): number {
  return Math.max(0, Math.round(100 - usagePercent));
}
