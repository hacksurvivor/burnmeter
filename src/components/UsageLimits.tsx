import type { UsageData } from "../types/usage";

interface UsageLimitsProps {
  usage: UsageData | null;
  isStale: boolean;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return (tokens / 1_000_000).toFixed(1);
  if (tokens >= 1_000) return (tokens / 1_000).toFixed(1);
  return `${tokens}`;
}

function tokenUnit(tokens: number): string {
  if (tokens >= 1_000_000) return "M";
  if (tokens >= 1_000) return "K";
  return "";
}

export function UsageLimits({ usage, isStale }: UsageLimitsProps) {
  return (
    <div className={`usage ${isStale ? "stale" : ""}`}>
      <div className="usage__label">Usage</div>

      {!usage ? (
        <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
          Scanning logs...
        </div>
      ) : (
        <div className="usage__grid">
          <div className="usage__item">
            <div className="usage__item-label">5h window</div>
            <div>
              <span className="usage__item-value">
                {formatTokens(usage.session_tokens)}
              </span>
              <span className="usage__item-unit">{tokenUnit(usage.session_tokens)} tok</span>
            </div>
            <div className="usage__item-sub">
              {usage.message_count_5h} messages
            </div>
          </div>
          <div className="usage__item">
            <div className="usage__item-label">7d window</div>
            <div>
              <span className="usage__item-value">
                {formatTokens(usage.weekly_tokens)}
              </span>
              <span className="usage__item-unit">{tokenUnit(usage.weekly_tokens)} tok</span>
            </div>
            <div className="usage__item-sub">
              {usage.message_count_7d.toLocaleString()} messages
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
