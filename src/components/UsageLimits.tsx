import type { UsageData } from "../types/usage";

interface Props {
  usage: UsageData | null;
  isStale: boolean;
}

function fmt(t: number): string {
  if (t >= 1_000_000_000) return (t / 1_000_000_000).toFixed(1);
  if (t >= 1_000_000) return (t / 1_000_000).toFixed(1);
  if (t >= 1_000) return (t / 1_000).toFixed(1);
  return `${t}`;
}

function unit(t: number): string {
  if (t >= 1_000_000_000) return "B";
  if (t >= 1_000_000) return "M";
  if (t >= 1_000) return "K";
  return "";
}

export function UsageLimits({ usage, isStale }: Props) {
  if (!usage) return null;
  return (
    <div className={isStale ? "usage stale" : "usage"}>
      <div className="usage__head">Usage</div>
      <div className="usage__grid">
        <Card label="5h window" tokens={usage.session_tokens} msgs={usage.message_count_5h} />
        <Card label="7d window" tokens={usage.weekly_tokens} msgs={usage.message_count_7d} />
      </div>
    </div>
  );
}

function Card({ label, tokens, msgs }: { label: string; tokens: number; msgs: number }) {
  return (
    <div className="usage__card">
      <div className="usage__card-title">{label}</div>
      <div>
        <span className="usage__big">{fmt(tokens)}</span>
        <span className="usage__unit">{unit(tokens)} tok</span>
      </div>
      <div className="usage__sub">{msgs.toLocaleString()} msgs</div>
    </div>
  );
}
