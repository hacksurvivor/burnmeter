import type { UsageData } from "../types/usage";

interface Props {
  usage: UsageData | null;
  isStale: boolean;
}

function fmtReset(isoDate: string | null): string {
  if (!isoDate) return "";
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

export function UsageLimits({ usage, isStale }: Props) {
  if (!usage) return null;

  return (
    <div className={isStale ? "stale" : ""}>
      <div className="usage__head">Usage</div>
      <div className="usage__grid">
        <Card
          label="5h window"
          pct={usage.five_hour_pct}
          resetsAt={usage.five_hour_resets_at}
        />
        <Card
          label="7d window"
          pct={usage.seven_day_pct}
          resetsAt={usage.seven_day_resets_at}
        />
      </div>
    </div>
  );
}

function Card({ label, pct, resetsAt }: {
  label: string;
  pct: number;
  resetsAt: string | null;
}) {
  const remaining = Math.max(0, 100 - pct);
  const barColor = remaining > 20
    ? "var(--accent)"
    : "#c05050";

  return (
    <div className="usage__card">
      <div className="usage__card-label">{label}</div>
      <div>
        <span className="usage__val">{Math.round(remaining)}</span>
        <span className="usage__unit">% left</span>
      </div>
      <div className="usage__bar">
        <div className="usage__bar-track">
          <div
            className="usage__bar-fill"
            style={{ width: `${remaining}%`, background: barColor }}
          />
        </div>
      </div>
      <div className="usage__reset">
        Resets in {fmtReset(resetsAt)}
      </div>
    </div>
  );
}
