import type { UsageData } from "../types/usage";

interface Props {
  usage: UsageData | null;
  isStale: boolean;
}

function fmtTok(t: number): string {
  if (t >= 1_000_000_000) return (t / 1_000_000_000).toFixed(1);
  if (t >= 1_000_000) return (t / 1_000_000).toFixed(1);
  if (t >= 1_000) return (t / 1_000).toFixed(0);
  return `${t}`;
}

function tokUnit(t: number): string {
  if (t >= 1_000_000_000) return "B";
  if (t >= 1_000_000) return "M";
  if (t >= 1_000) return "K";
  return "";
}

function fmtReset(seconds: number): string {
  if (seconds <= 0) return "now";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function UsageLimits({ usage, isStale }: Props) {
  if (!usage) return null;

  const sessionTotal = usage.session_input_tokens + usage.session_output_tokens;
  const weeklyTotal = usage.weekly_input_tokens + usage.weekly_output_tokens;

  return (
    <div className={isStale ? "stale" : ""}>
      <div className="usage__head">Usage</div>
      <div className="usage__grid">
        <Card
          label="5h window"
          output={usage.session_output_tokens}
          total={sessionTotal}
          msgs={usage.message_count_5h}
          resetIn={usage.session_reset_seconds}
        />
        <Card
          label="7d window"
          output={usage.weekly_output_tokens}
          total={weeklyTotal}
          msgs={usage.message_count_7d}
          resetIn={usage.weekly_reset_seconds}
        />
      </div>
    </div>
  );
}

function Card({ label, output, total, msgs, resetIn }: {
  label: string;
  output: number;
  total: number;
  msgs: number;
  resetIn: number;
}) {
  const pctOutput = total > 0 ? Math.round((output / total) * 100) : 0;

  return (
    <div className="usage__card">
      <div className="usage__card-label">{label}</div>
      <div>
        <span className="usage__val">{fmtTok(total)}</span>
        <span className="usage__unit">{tokUnit(total)} tok</span>
      </div>
      <div className="usage__sub">
        {pctOutput}% output · {msgs.toLocaleString()} msgs
      </div>
      <div className="usage__reset">
        Resets in {fmtReset(resetIn)}
      </div>
    </div>
  );
}
