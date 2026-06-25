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
import type { UsageData } from "./types/usage";

export default function App() {
  const { usage, error, isStale, retry } = useUsageData();
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  return (
    <div className="app dark">
      <Header
        timezone={timezone}
        utcOffset={utcOffset}
        settingsOpen={settingsOpen}
        onSettingsClick={() => setSettingsOpen((open) => !open)}
      />
      {settingsOpen ? (
        <div
          className="settings-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <SettingsPanel usage={usage} onClose={() => setSettingsOpen(false)} />
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

function traySummary(usage: UsageData): { title: string; tooltip: string } | null {
  if (usage.providers.length === 0) return null;

  const providers = usage.providers.map((provider) => {
    const fiveHour = remainingPercent(provider.five_hour_pct);
    const sevenDay = remainingPercent(provider.seven_day_pct);
    const tightest = Math.min(fiveHour, sevenDay);
    return { provider, fiveHour, sevenDay, tightest };
  });
  const tightestProvider = providers.reduce((lowest, current) =>
    current.tightest < lowest.tightest ? current : lowest,
  );
  const title = `${tightestProvider.tightest}%`;
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
