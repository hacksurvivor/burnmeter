import type { UsageData } from "../types/usage";

interface UsageLimitsProps {
  usage: UsageData | null;
  isStale: boolean;
}

function fmtTokens(t: number): string {
  if (t >= 1_000_000) return (t / 1_000_000).toFixed(1);
  if (t >= 1_000) return (t / 1_000).toFixed(1);
  return `${t}`;
}

function unit(t: number): string {
  if (t >= 1_000_000) return "M";
  if (t >= 1_000) return "K";
  return "";
}

export function UsageLimits({ usage, isStale }: UsageLimitsProps) {
  if (!usage) return null;

  return (
    <div className={isStale ? "stale" : ""}>
      <div className="usage__label">Usage</div>
      <div className="usage__grid">
        <div className="usage__card">
          <div className="usage__card-label">5h window</div>
          <div>
            <span className="usage__card-value">{fmtTokens(usage.session_tokens)}</span>
            <span className="usage__card-unit">{unit(usage.session_tokens)} tok</span>
          </div>
          <div className="usage__card-sub">{usage.message_count_5h.toLocaleString()} msgs</div>
        </div>
        <div className="usage__card">
          <div className="usage__card-label">7d window</div>
          <div>
            <span className="usage__card-value">{fmtTokens(usage.weekly_tokens)}</span>
            <span className="usage__card-unit">{unit(usage.weekly_tokens)} tok</span>
          </div>
          <div className="usage__card-sub">{usage.message_count_7d.toLocaleString()} msgs</div>
        </div>
      </div>
    </div>
  );
}
