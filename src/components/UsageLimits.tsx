import { ActivityHeatmap } from "./ActivityHeatmap";
import { ProviderBoosts } from "./ProviderBoosts";
import { ProviderLogo } from "./ProviderLogo";
import { Gauge } from "./charts/gauge";
import { useEffect, useState } from "react";
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

function fmtReset(isoDate: string | null): string {
  if (!isoDate) return "unknown";
  const resetMs = new Date(isoDate).getTime();
  const nowMs = Date.now();
  const diffSec = Math.max(0, Math.floor((resetMs - nowMs) / 1000));
  if (diffSec <= 0) return "now";
  const d = Math.floor(diffSec / 86400);
  const h = Math.floor((diffSec % 86400) / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function UsageLimits({ usage, isStale, onRetry, onSettingsClick }: Props) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  useEffect(() => {
    setExpandedProvider((current) => {
      if (!usage || usage.providers.length === 0) return null;
      if (current && usage.providers.some((provider) => provider.provider === current)) return current;
      return usage.providers[0]?.provider ?? null;
    });
  }, [usage]);

  if (!usage) return null;

  return (
    <div className={isStale ? "stale" : ""}>
      <div className="usage__head">Usage</div>
      {usage.providers.length === 0 ? (
        <OfflineUsage errors={usage.errors} onRetry={onRetry} onSettingsClick={onSettingsClick} />
      ) : null}
      <div className="usage__providers">
        {usage.providers.map((provider) => {
          const isExpanded = expandedProvider === provider.provider;
          const detailsId = `provider-details-${provider.provider}`;
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
                        {provider.plan_type ? <span className="usage__chip">{provider.plan_type}</span> : null}
                      </div>
                      <div className="usage__provider-sub">{providerSubtitle(provider.provider)}</div>
                    </div>
                  </div>
                  <span className="usage__provider-toggle" aria-hidden="true" />
                </div>
                <div className="usage__limits">
                  <LimitGauge
                    label="5h window"
                    pct={provider.five_hour_pct}
                    resetsAt={provider.five_hour_resets_at}
                    provider={provider.provider}
                  />
                  <LimitGauge
                    label="7d window"
                    pct={provider.seven_day_pct}
                    resetsAt={provider.seven_day_resets_at}
                    provider={provider.provider}
                  />
                </div>
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

function providerSubtitle(provider: string): string {
  const subtitles: Record<string, string> = {
    claude: "Claude subscription",
    codex: "ChatGPT subscription",
  };
  return subtitles[provider] ?? "LLM subscription";
}

function LimitGauge({ label, pct, resetsAt, provider }: {
  label: string;
  pct: number;
  resetsAt: string | null;
  provider: string;
}) {
  const remaining = Math.max(0, 100 - pct);
  const activeGradient = gaugeGradient(provider, remaining);
  const shortLabel = label.split(" ")[0] ?? label;

  return (
    <div className="usage__gauge-card">
      <div className="usage__card-label">{shortLabel}</div>
      <div className="usage__gauge-chart" aria-hidden="true">
        <Gauge
          activeGradient={activeGradient}
          centerValue={Math.round(remaining)}
          defaultLabel="% left"
          enterStaggerScale={0.55}
          height={72}
          inactiveFill="rgba(219,226,234,0.13)"
          inactiveFillOpacity={1}
          minWidth={0}
          notchCornerRadius={2}
          notchLengthPercent={64}
          spacing={38}
          totalNotches={30}
          useGradient
          value={remaining}
          width={96}
        />
      </div>
      <div className="usage__gauge-copy">
        <div className="usage__gauge-inline">
          <span>{Math.round(remaining)}%</span>
          <span>left</span>
        </div>
        <div className="usage__reset">Resets in {fmtReset(resetsAt)}</div>
      </div>
    </div>
  );
}

function gaugeGradient(provider: string, remaining: number): readonly [string, string] {
  if (remaining <= 20) return ["#ff7f5c", "#ef4444"];
  if (remaining <= 50) return ["#ffb86b", "#ff7f5c"];
  if (provider === "claude") return ["#ff7f5c", "#8fd16a"];
  return ["#66a3ff", "#8fd16a"];
}
