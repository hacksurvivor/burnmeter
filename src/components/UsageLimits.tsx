import { ActivityHeatmap } from "./ActivityHeatmap";
import { ProviderBoosts } from "./ProviderBoosts";
import { ProviderLogo } from "./ProviderLogo";
import { useEffect, useState } from "react";
import { FIVE_HOUR_SECONDS, WEEK_SECONDS, formatDuration, limitPace, type LimitPace } from "../lib/pace";
import {
  providerErrorDetail,
  providerErrorState,
  providerErrorTitle,
} from "../lib/usageErrors";
import type { UsageData, UsageError } from "../types/usage";

interface Props {
  usage: UsageData | null;
  isStale: boolean;
  onRetry: () => void;
  onSettingsClick: () => void;
}

function resetText(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const resetMs = new Date(isoDate).getTime();
  if (!Number.isFinite(resetMs)) return null;
  const diffSec = (resetMs - Date.now()) / 1000;
  return diffSec <= 60 ? "Resets now" : `Resets in ${formatDuration(diffSec)}`;
}

export function UsageLimits({ usage, isStale, onRetry, onSettingsClick }: Props) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  useEffect(() => {
    setExpandedProvider((current) => {
      if (!usage || usage.providers.length === 0) return null;
      if (current && usage.providers.some((provider) => provider.provider === current)) return current;
      return null;
    });
  }, [usage]);

  if (!usage) return <div className="usage__loading">Checking your limits…</div>;

  return (
    <div className={isStale ? "stale" : ""}>
      {usage.providers.length === 0 ? (
        <OfflineUsage errors={usage.errors} onRetry={onRetry} onSettingsClick={onSettingsClick} />
      ) : null}
      <div className="usage__providers">
        {usage.providers.map((provider) => {
          const isExpanded = expandedProvider === provider.provider;
          const detailsId = `provider-details-${provider.provider}`;
          const limitWindows = providerLimitWindows(provider);
          const toggleProvider = () => {
            setExpandedProvider((current) => (current === provider.provider ? null : provider.provider));
          };

          return (
            <section
              className={`usage__provider usage__provider--${isExpanded ? "expanded" : "collapsed"}`}
              key={provider.provider}
            >
              <div
                aria-controls={detailsId}
                aria-expanded={isExpanded}
                className="usage__provider-summary"
                onClick={toggleProvider}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleProvider();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="usage__provider-head">
                  <div className="usage__provider-title">
                    <ProviderMark label={provider.label} provider={provider.provider} />
                    <div>
                      <div className="usage__provider-name">
                        <span>{provider.label}</span>
                      </div>
                      <div className="usage__provider-sub">
                        {providerSubtitle(provider.provider, provider.plan_type)}
                      </div>
                    </div>
                  </div>
                  <span className="usage__provider-toggle" title={isExpanded ? "Hide details" : "Show details"} aria-hidden="true" />
                </div>
                {limitWindows.length > 0 ? (
                  <div className={`usage__limits${limitWindows.length === 1 ? " usage__limits--single" : ""}`}>
                    {limitWindows.map((window) => (
                      <LimitMeter
                        key={window.label}
                        label={window.label}
                        pct={window.pct}
                        resetsAt={window.resetsAt}
                        windowSeconds={window.windowSeconds}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="usage__limits-empty">Usage window unavailable</div>
                )}
              </div>

              {isExpanded ? (
                <div className="usage__provider-details" id={detailsId}>
                  <ProviderBoosts boosts={provider.boosts} />
                  {provider.activity ? (
                    <ActivityHeatmap activity={provider.activity} provider={provider.provider} />
                  ) : (
                    <div className="activity activity--empty">
                      <div className="activity__head">
                        <span>Token activity</span>
                        <span>No local history found</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function providerLimitWindows(provider: UsageData["providers"][number]) {
  return [
    {
      label: "5-hour",
      pct: provider.five_hour_pct,
      resetsAt: provider.five_hour_resets_at,
      windowSeconds: FIVE_HOUR_SECONDS,
    },
    {
      label: "Weekly",
      pct: provider.seven_day_pct,
      resetsAt: provider.seven_day_resets_at,
      windowSeconds: WEEK_SECONDS,
    },
  ].filter((window): window is { label: string; pct: number; resetsAt: string | null; windowSeconds: number } =>
    typeof window.pct === "number" && Number.isFinite(window.pct),
  );
}

const PROVIDER_FALLBACKS = [
  { provider: "claude", label: "Claude", subtitle: "Claude subscription" },
  { provider: "codex", label: "Codex", subtitle: "ChatGPT subscription" },
] as const;

function OfflineUsage({
  errors,
  onRetry,
  onSettingsClick,
}: {
  errors: UsageError[];
  onRetry: () => void;
  onSettingsClick: () => void;
}) {
  const errorsByProvider = new Map(errors.map((error) => [error.provider, error]));

  return (
    <section className="usage__offline">
      <div className="usage__offline-head">
        <div>
          <div className="usage__offline-title">Usage unavailable</div>
          <div className="usage__offline-sub">Subscription limits will reappear after the next successful refresh.</div>
        </div>
        <div className="usage__offline-actions">
          <button className="usage__action" onClick={onRetry}>Retry</button>
          <button className="usage__action usage__action--primary" onClick={onSettingsClick}>Settings</button>
        </div>
      </div>
      <div className="usage__offline-list">
        {PROVIDER_FALLBACKS.map((provider) => {
          const error = errorsByProvider.get(provider.provider);
          const state = error ? providerErrorState(error.message) : "Needs login";
          return (
            <div className="usage__offline-row" key={provider.provider}>
              <ProviderMark label={provider.label} provider={provider.provider} />
              <div className="usage__offline-copy">
                <div className="usage__offline-name">
                  <span>{provider.label}</span>
                  <span className={`usage__offline-state usage__offline-state--${state.toLowerCase().replace(" ", "-")}`}>
                    {state}
                  </span>
                </div>
                <div className="usage__offline-detail">
                  {error
                    ? `${providerErrorTitle(error.message)} · ${providerErrorDetail(provider.provider, error.message)}`
                    : provider.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProviderMark({ provider, label }: { provider: string; label: string }) {
  return (
    <span className={`usage__provider-mark usage__provider-mark--${provider}`}>
      <ProviderLogo label={label} provider={provider} />
    </span>
  );
}

function providerSubtitle(provider: string, planType?: string | null): string {
  const subtitles: Record<string, string> = {
    claude: "Claude subscription",
    codex: "ChatGPT subscription",
  };
  const subtitle = subtitles[provider] ?? "LLM subscription";
  return planType ? `${subtitle} · ${formatPlanType(planType)}` : subtitle;
}

function formatPlanType(planType: string): string {
  return planType.toLowerCase() === "pro" ? "Pro" : planType;
}

function LimitMeter({ label, pct, resetsAt, windowSeconds }: {
  label: string;
  pct: number;
  resetsAt: string | null;
  windowSeconds: number;
}) {
  const remaining = Math.round(Math.min(100, Math.max(0, 100 - pct)));
  const pace = limitPace(pct, resetsAt, windowSeconds);
  const tone = remaining <= 20 ? "low" : remaining <= 50 ? "mid" : "ok";
  const paceLabel = pace ? paceText(pace) : null;
  const reset = resetText(resetsAt);

  return (
    <div className={`meter meter--${tone}`}>
      <div className="meter__top">
        <span className="meter__label">{label}</span>
        {pace && paceLabel ? (
          <span className={`meter__pace meter__pace--${pace.status}`} title={paceTitle(pace)}>
            {paceLabel}
          </span>
        ) : null}
      </div>
      <div className="meter__value">
        <span>{remaining}%</span>
        <span>left</span>
      </div>
      <div
        className="meter__bar"
        role="meter"
        aria-label={`${label} limit remaining`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining}
      >
        <span className="meter__fill" style={{ width: `${remaining}%` }} />
        {pace && pace.status !== "limit" ? (
          <span className="meter__marker" style={{ left: `${pace.evenPaceRemainingPct}%` }} />
        ) : null}
      </div>
      {reset ? <div className="meter__reset">{reset}</div> : null}
    </div>
  );
}

function paceText(pace: LimitPace): string | null {
  switch (pace.status) {
    case "limit":
      return "Limit reached";
    case "fast":
      return `Out in ${formatDuration(pace.runsOutInSeconds ?? 0)}`;
    case "on-pace":
      return "On pace";
    case "early":
      return null;
  }
}

function paceTitle(pace: LimitPace): string {
  if (pace.status === "fast") {
    return `At this rate you'll run out in ${formatDuration(pace.runsOutInSeconds ?? 0)}, before the reset.`;
  }
  if (pace.status === "limit") return "This limit is used up until it resets.";
  return "At this rate the limit lasts until it resets. The tick marks an even pace.";
}
