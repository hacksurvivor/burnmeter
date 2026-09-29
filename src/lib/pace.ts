export const FIVE_HOUR_SECONDS = 5 * 60 * 60;
export const WEEK_SECONDS = 7 * 24 * 60 * 60;

// Too little of the window has passed to extrapolate a burn rate.
const MIN_ELAPSED_FRACTION = 0.05;
// Running dry only minutes (or hours, on the weekly window) before the reset is still on pace.
const FAST_MARGIN_FRACTION = 0.05;

export type PaceStatus = "on-pace" | "fast" | "limit" | "early";

export interface LimitPace {
  /** Remaining % you would have if usage were spread evenly across the window. */
  evenPaceRemainingPct: number;
  status: PaceStatus;
  /** Seconds until the limit runs out at the current rate, when that is before the reset. */
  runsOutInSeconds: number | null;
}

export function limitPace(
  usedPct: number,
  resetsAt: string | null,
  windowSeconds: number,
  nowMs = Date.now(),
): LimitPace | null {
  if (!resetsAt) return null;
  const resetMs = new Date(resetsAt).getTime();
  if (!Number.isFinite(resetMs)) return null;

  const secondsLeft = clamp((resetMs - nowMs) / 1000, 0, windowSeconds);
  const elapsedSeconds = windowSeconds - secondsLeft;
  const evenPaceRemainingPct = (secondsLeft / windowSeconds) * 100;
  const used = clamp(usedPct, 0, 100);

  if (used >= 100) return { evenPaceRemainingPct, status: "limit", runsOutInSeconds: 0 };
  if (used === 0) return { evenPaceRemainingPct, status: "on-pace", runsOutInSeconds: null };
  if (elapsedSeconds / windowSeconds < MIN_ELAPSED_FRACTION) {
    return { evenPaceRemainingPct, status: "early", runsOutInSeconds: null };
  }

  const usedPerSecond = used / elapsedSeconds;
  const secondsToEmpty = (100 - used) / usedPerSecond;
  if (secondsToEmpty < secondsLeft - windowSeconds * FAST_MARGIN_FRACTION) {
    return { evenPaceRemainingPct, status: "fast", runsOutInSeconds: secondsToEmpty };
  }
  return { evenPaceRemainingPct, status: "on-pace", runsOutInSeconds: null };
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(m, 1)}m`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
