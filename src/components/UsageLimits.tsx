import { AsciiProgressBar } from "./AsciiProgressBar";
import { formatCountdown, formatPercent } from "../lib/format";
import type { UsageData } from "../types/usage";

interface UsageLimitsProps {
  usage: UsageData | null;
  isStale: boolean;
}

export function UsageLimits({ usage, isStale }: UsageLimitsProps) {
  const staleClass = isStale ? "stale" : "";

  return (
    <div className={`section ${staleClass}`}>
      <div className="section__title">── USAGE LIMITS ──────────────────</div>

      {!usage ? (
        <div className="text-muted">Loading usage data...</div>
      ) : (
        <>
          <UsageRow
            label="5h Window"
            usagePercent={usage.session.usagePercent}
            resetAt={usage.session.resetAt}
          />
          <UsageRow
            label="7d Window"
            usagePercent={usage.weekly.usagePercent}
            resetAt={usage.weekly.resetAt}
          />
        </>
      )}
    </div>
  );
}

function UsageRow({
  label,
  usagePercent,
  resetAt,
}: {
  label: string;
  usagePercent: number;
  resetAt: string;
}) {
  const remaining = Math.max(0, 100 - usagePercent);
  const resetSeconds = Math.max(0, (new Date(resetAt).getTime() - Date.now()) / 1000);

  const colorClass =
    remaining > 50 ? "text-green" : remaining > 20 ? "text-orange" : "text-red";

  return (
    <div className="usage-row">
      <div className="usage-row__label">{label}</div>
      <div className="usage-row__bar">
        <AsciiProgressBar percent={remaining} width={20} colorClass={colorClass} />
        <span className={colorClass}> {formatPercent(usagePercent)} remaining</span>
      </div>
      <div className="usage-row__reset text-muted">
        Resets in: {formatCountdown(resetSeconds)}
      </div>
    </div>
  );
}
