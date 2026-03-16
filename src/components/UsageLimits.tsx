import type { UsageData } from "../types/usage";

interface UsageLimitsProps {
  usage: UsageData | null;
  isStale: boolean;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return `${tokens}`;
}

export function UsageLimits({ usage, isStale }: UsageLimitsProps) {
  const staleClass = isStale ? "stale" : "";

  return (
    <div className={`section ${staleClass}`}>
      <div className="section__title">── USAGE (LOCAL) ─────────────────</div>

      {!usage ? (
        <div className="text-muted">Scanning local logs...</div>
      ) : (
        <>
          <div className="usage-row">
            <div className="usage-row__label">Last 5 hours</div>
            <div className="usage-row__bar">
              <span className="text-info">{formatTokens(usage.session_tokens)}</span>
              <span className="text-muted"> tokens</span>
              <span className="text-muted"> · </span>
              <span className="text-info">{usage.message_count_5h}</span>
              <span className="text-muted"> messages</span>
            </div>
          </div>
          <div className="usage-row">
            <div className="usage-row__label">Last 7 days</div>
            <div className="usage-row__bar">
              <span className="text-info">{formatTokens(usage.weekly_tokens)}</span>
              <span className="text-muted"> tokens</span>
              <span className="text-muted"> · </span>
              <span className="text-info">{usage.message_count_7d}</span>
              <span className="text-muted"> messages</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
