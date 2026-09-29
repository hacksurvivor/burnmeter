import type { UsageData } from "../types/usage";

export interface TightestLimit {
  providerLabel: string;
  windowLabel: string;
  remainingPct: number;
  resetsAt: string | null;
}

/** The limit closest to running out, across every provider and window. */
export function tightestLimit(usage: UsageData | null): TightestLimit | null {
  let tightest: TightestLimit | null = null;

  for (const provider of usage?.providers ?? []) {
    const windows = [
      { windowLabel: "5-hour", pct: provider.five_hour_pct, resetsAt: provider.five_hour_resets_at },
      { windowLabel: "weekly", pct: provider.seven_day_pct, resetsAt: provider.seven_day_resets_at },
    ];
    for (const window of windows) {
      if (typeof window.pct !== "number" || !Number.isFinite(window.pct)) continue;
      const remainingPct = Math.max(0, Math.min(100, 100 - window.pct));
      if (!tightest || remainingPct < tightest.remainingPct) {
        tightest = {
          providerLabel: provider.label,
          windowLabel: window.windowLabel,
          remainingPct,
          resetsAt: window.resetsAt,
        };
      }
    }
  }

  return tightest;
}
