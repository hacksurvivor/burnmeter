import { describe, expect, it } from "vitest";
import { FIVE_HOUR_SECONDS, WEEK_SECONDS, formatDuration, limitPace } from "./pace";

const NOW = Date.parse("2026-09-29T12:00:00Z");
const inSeconds = (seconds: number) => new Date(NOW + seconds * 1000).toISOString();

describe("limitPace", () => {
  it("is on pace when usage trails elapsed time", () => {
    // Half the week gone, 30% used.
    const pace = limitPace(30, inSeconds(WEEK_SECONDS / 2), WEEK_SECONDS, NOW);
    expect(pace?.status).toBe("on-pace");
    expect(pace?.evenPaceRemainingPct).toBeCloseTo(50);
  });

  it("predicts running out before the reset when burning fast", () => {
    // 1h of the 5h window gone, 50% used: empty in another hour, reset in 4h.
    const pace = limitPace(50, inSeconds(4 * 3600), FIVE_HOUR_SECONDS, NOW);
    expect(pace?.status).toBe("fast");
    expect(pace?.runsOutInSeconds).toBeCloseTo(3600);
  });

  it("treats running out just before the reset as on pace", () => {
    // 3.1 days in, 46% used: empty ~6h before the reset.
    const pace = limitPace(46, inSeconds(3.9 * 86400), WEEK_SECONDS, NOW);
    expect(pace?.status).toBe("on-pace");
  });

  it("does not extrapolate right after a reset", () => {
    const pace = limitPace(4, inSeconds(FIVE_HOUR_SECONDS - 60), FIVE_HOUR_SECONDS, NOW);
    expect(pace?.status).toBe("early");
  });

  it("reports a spent limit", () => {
    expect(limitPace(100, inSeconds(3600), FIVE_HOUR_SECONDS, NOW)?.status).toBe("limit");
  });

  it("needs a reset time", () => {
    expect(limitPace(40, null, WEEK_SECONDS, NOW)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("uses the two largest units", () => {
    expect(formatDuration(3 * 86400 + 5 * 3600 + 10)).toBe("3d 5h");
    expect(formatDuration(2 * 3600 + 48 * 60)).toBe("2h 48m");
    expect(formatDuration(20)).toBe("1m");
  });
});
