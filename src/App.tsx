import { Header } from "./components/Header";
import { PromoTimer } from "./components/PromoTimer";
import { UsageLimits } from "./components/UsageLimits";
import { QuickInfo } from "./components/QuickInfo";
import { SettingsPanel } from "./components/SettingsPanel";
import { useUsageData } from "./hooks/useUsageData";
import { usePromoStatus } from "./hooks/usePromoStatus";
import { usePromoConfig } from "./hooks/usePromoConfig";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useRef, useState } from "react";
import type { TrayStatus } from "./lib/constants";
import { tightestLimit } from "./lib/limits";
import { DEFAULT_MASCOT, DEFAULT_MASCOT_STYLE, isMascotId, isMascotStyle, type MascotId, type MascotStyle } from "./lib/mascots";
import type { UpdateInfo, UsageData } from "./types/usage";

const OPEN_ON_PROVIDER_KEY = "burnmeter.openWhenProviderStarts";
const MENU_BAR_PROVIDER_KEY = "burnmeter.menuBarProvider";
const MENU_BAR_ROTATION_INTERVAL_KEY = "burnmeter.menuBarRotationMinutes";
const MASCOT_KEY = "burnmeter.mascot";
const MASCOT_STYLE_KEY = "burnmeter.mascotStyle";
export const MENU_BAR_ROTATION_INTERVALS = [1, 5, 15, 30] as const;
const WINDOW_WIDTH = 380;
const MIN_WINDOW_HEIGHT = 240;
const MAX_WINDOW_HEIGHT = 600;

export type MenuBarProvider = "rotate" | "claude" | "codex";
export type MenuBarRotationMinutes = (typeof MENU_BAR_ROTATION_INTERVALS)[number];

export default function App() {
  const { usage, error, isStale, retry } = useUsageData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [launchAtLogin, setLaunchAtLogin] = useState<boolean | null>(null);
  const [launchSettingsError, setLaunchSettingsError] = useState<string | null>(null);
  const [openWhenProviderStarts, setOpenWhenProviderStarts] = useState(() => {
    return window.localStorage.getItem(OPEN_ON_PROVIDER_KEY) === "true";
  });
  const [menuBarProvider, setMenuBarProvider] = useState<MenuBarProvider>(() => {
    const stored = window.localStorage.getItem(MENU_BAR_PROVIDER_KEY);
    return stored === "claude" || stored === "codex" ? stored : "rotate";
  });
  const [menuBarRotationMinutes, setMenuBarRotationMinutes] = useState<MenuBarRotationMinutes>(() => {
    const stored = Number(window.localStorage.getItem(MENU_BAR_ROTATION_INTERVAL_KEY));
    return MENU_BAR_ROTATION_INTERVALS.includes(stored as MenuBarRotationMinutes)
      ? (stored as MenuBarRotationMinutes)
      : 1;
  });
  const [mascot, setMascot] = useState<MascotId>(() => {
    const stored = window.localStorage.getItem(MASCOT_KEY);
    return isMascotId(stored) ? stored : DEFAULT_MASCOT;
  });
  const [mascotStyle, setMascotStyle] = useState<MascotStyle>(() => {
    const stored = window.localStorage.getItem(MASCOT_STYLE_KEY);
    return isMascotStyle(stored) ? stored : DEFAULT_MASCOT_STYLE;
  });
  const [rotationIndex, setRotationIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const rotationSignature = usageProviderIds(usage).join(",");
  const config = usePromoConfig();
  const { promo, peakStartLocal, peakEndLocal, currentHour, isWeekend, promoEndDate } =
    usePromoStatus(config);

  useEffect(() => {
    let status: TrayStatus;
    if (!promo.isPromoActive) status = "gray";
    else if (promo.isPeak) status = "orange";
    else status = "green";
    const tray = usage ? traySummary(usage, menuBarProvider, rotationIndex) : null;
    invoke("update_tray_status", {
      status,
      summary: tray?.title ?? null,
      tooltip: tray?.tooltip ?? null,
      iconProvider: tray?.provider ?? null,
    }).catch(() => {});
  }, [menuBarProvider, promo.isPromoActive, promo.isPeak, rotationIndex, usage]);

  useEffect(() => {
    setRotationIndex(0);
    const providerCount = rotationSignature ? rotationSignature.split(",").length : 0;
    if (menuBarProvider !== "rotate" || providerCount < 2) return;

    const timer = window.setInterval(() => {
      setRotationIndex((current) => (current + 1) % providerCount);
    }, menuBarRotationMinutes * 60_000);
    return () => window.clearInterval(timer);
  }, [menuBarProvider, menuBarRotationMinutes, rotationSignature]);

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

  useEffect(() => {
    let cancelled = false;
    isEnabled()
      .then((enabled) => {
        if (!cancelled) {
          setLaunchAtLogin(enabled);
          setLaunchSettingsError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setLaunchSettingsError(String(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(OPEN_ON_PROVIDER_KEY, String(openWhenProviderStarts));
  }, [openWhenProviderStarts]);

  useEffect(() => {
    window.localStorage.setItem(MENU_BAR_PROVIDER_KEY, menuBarProvider);
  }, [menuBarProvider]);

  useEffect(() => {
    window.localStorage.setItem(MENU_BAR_ROTATION_INTERVAL_KEY, String(menuBarRotationMinutes));
  }, [menuBarRotationMinutes]);

  useEffect(() => {
    window.localStorage.setItem(MASCOT_KEY, mascot);
  }, [mascot]);

  useEffect(() => {
    window.localStorage.setItem(MASCOT_STYLE_KEY, mascotStyle);
  }, [mascotStyle]);

  useEffect(() => {
    if (!openWhenProviderStarts) return;

    let cancelled = false;
    // Unknown until the first poll, so apps already running at launch don't pop the panel open.
    let providersWereRunning: boolean | null = null;

    const poll = () => {
      invoke<string[]>("detect_running_provider_apps")
        .then(async (providers) => {
          if (cancelled) return;

          const providersRunning = providers.length > 0;
          if (providersRunning && providersWereRunning === false) {
            await invoke("show_panel");
          }
          providersWereRunning = providersRunning;
        })
        .catch(() => {});
    };

    poll();
    const timer = window.setInterval(poll, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [openWhenProviderStarts]);

  // Fit the popover to its content so it never shows an empty block below the cards.
  useEffect(() => {
    const content = contentRef.current;
    const app = content?.parentElement;
    if (!content || !app) return;

    const appWindow = getCurrentWindow();
    let lastHeight = 0;
    const fit = () => {
      const style = getComputedStyle(app);
      const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 2;
      const natural = Math.ceil(content.offsetHeight + chrome);
      const height = settingsOpen
        ? MAX_WINDOW_HEIGHT
        : Math.min(MAX_WINDOW_HEIGHT, Math.max(MIN_WINDOW_HEIGHT, natural));
      if (height === lastHeight) return;
      lastHeight = height;
      appWindow.setSize(new LogicalSize(WINDOW_WIDTH, height)).catch(() => {});
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(content);
    return () => observer.disconnect();
  }, [settingsOpen]);

  const setLaunchAtLoginEnabled = async (enabled: boolean) => {
    setLaunchSettingsError(null);
    try {
      if (enabled) await enable();
      else await disable();
      setLaunchAtLogin(enabled);
    } catch (error) {
      setLaunchSettingsError(String(error));
    }
  };

  return (
    <div className="app dark">
      <div className="app__content" ref={contentRef}>
        <Header
          mascot={mascot}
          mascotStyle={mascotStyle}
          tightest={tightestLimit(usage)}
          settingsOpen={settingsOpen}
          updateAvailable={updateInfo?.available ?? false}
          onSettingsClick={() => setSettingsOpen((open) => !open)}
        />
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
            launchAtLogin={launchAtLogin}
            launchSettingsError={launchSettingsError}
            menuBarProvider={menuBarProvider}
            menuBarRotationMinutes={menuBarRotationMinutes}
            mascot={mascot}
            mascotStyle={mascotStyle}
            onMascotChange={setMascot}
            onMascotStyleChange={setMascotStyle}
            openWhenProviderStarts={openWhenProviderStarts}
            onLaunchAtLoginChange={setLaunchAtLoginEnabled}
            onMenuBarProviderChange={setMenuBarProvider}
            onMenuBarRotationMinutesChange={setMenuBarRotationMinutes}
            onOpenWhenProviderStartsChange={setOpenWhenProviderStarts}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function traySummary(
  usage: UsageData,
  menuBarProvider: MenuBarProvider = "rotate",
  rotationIndex = 0,
): { title: string; tooltip: string; provider: string } | null {
  if (usage.providers.length === 0) return null;

  const providers = usage.providers
    .map((provider) => {
      const fiveHour = remainingPercent(provider.five_hour_pct);
      const sevenDay = remainingPercent(provider.seven_day_pct);
      return { provider, fiveHour, sevenDay, primary: fiveHour ?? sevenDay };
    })
    .filter((provider) => provider.primary !== null);
  const tooltipLines = providers
    .map(({ provider, fiveHour, sevenDay }) => {
      const label = trayProviderLabel(provider.provider, provider.label);
      const windows = [
        fiveHour === null ? null : `${fiveHour}% 5h`,
        sevenDay === null ? null : `${sevenDay}% 7d`,
      ].filter(Boolean);
      return `${label}: ${windows.join(" · ")}`;
    });

  if (menuBarProvider !== "rotate") {
    const pinned = providers.find(({ provider }) => provider.provider === menuBarProvider);
    const pinnedLabel = trayProviderLabel(menuBarProvider, menuBarProvider);
    if (!pinned) {
      return {
        title: "—",
        tooltip: [`Menu bar: ${pinnedLabel} (unavailable)`, ...tooltipLines].join("\n"),
        provider: menuBarProvider,
      };
    }

    return {
      title: `${pinned.primary}%`,
      tooltip: [`Menu bar: ${pinnedLabel}`, ...tooltipLines].join("\n"),
      provider: pinned.provider.provider,
    };
  }

  if (providers.length === 0) return null;
  const activeProvider = providers[rotationIndex % providers.length]!;
  const activeLabel = trayProviderLabel(activeProvider.provider.provider, activeProvider.provider.label);
  const title = `${activeProvider.primary}%`;
  const tooltip = [`Menu bar: Rotate · ${activeLabel}`, ...tooltipLines].join("\n");

  return { title, tooltip, provider: activeProvider.provider.provider };
}

function usageProviderIds(usage: UsageData | null): string[] {
  if (!usage) return [];
  return usage.providers
    .filter((provider) => provider.five_hour_pct !== null || provider.seven_day_pct !== null)
    .map((provider) => provider.provider);
}

function trayProviderLabel(provider: string, label: string): string {
  const labels: Record<string, string> = {
    claude: "Claude",
    codex: "Codex",
  };
  return labels[provider] ?? label;
}

function remainingPercent(usagePercent: number | null): number | null {
  if (usagePercent === null || !Number.isFinite(usagePercent)) return null;
  return Math.max(0, Math.round(100 - usagePercent));
}
