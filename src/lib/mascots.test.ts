import { describe, expect, it } from "vitest";
import {
  MASCOT_FRAME_COUNT,
  MASCOT_IDS,
  MASCOT_MOODS,
  MASCOT_STYLES,
  isMascotId,
  isMascotStyle,
  mascotFrame,
  mascotQuip,
  moodFor,
} from "./mascots";
import { tightestLimit } from "./limits";
import type { UsageData } from "../types/usage";

describe("mascot frames", () => {
  it("has a rendered frame for every style, mascot, mood and frame", () => {
    for (const style of MASCOT_STYLES) for (const id of MASCOT_IDS) for (const mood of MASCOT_MOODS) {
      for (let frame = 0; frame < MASCOT_FRAME_COUNT; frame++) {
        expect(mascotFrame(style, id, mood, frame), `${style}/${id}/${mood}/${frame}`).toMatch(/\.png/);
      }
      expect(mascotQuip(id, mood).length).toBeGreaterThan(3);
    }
  });

  it("validates stored settings", () => {
    expect(isMascotId("wallet")).toBe(true);
    expect(isMascotId("candle")).toBe(false);
    expect(isMascotId(null)).toBe(false);
    expect(isMascotStyle("pixel")).toBe(true);
    expect(isMascotStyle("ascii")).toBe(false);
  });
});

describe("moodFor", () => {
  it("maps remaining percent to a mood", () => {
    expect(moodFor(null)).toBe("plenty");
    expect(moodFor(54)).toBe("plenty");
    expect(moodFor(30)).toBe("plenty");
    expect(moodFor(29)).toBe("low");
    expect(moodFor(0.4)).toBe("low");
    expect(moodFor(0)).toBe("out");
  });
});

describe("tightestLimit", () => {
  const provider = (label: string, five: number | null, seven: number | null) => ({
    provider: label.toLowerCase(),
    label,
    five_hour_pct: five,
    five_hour_resets_at: null,
    seven_day_pct: seven,
    seven_day_resets_at: "2099-01-01T00:00:00Z",
    extra_usage_enabled: false,
    plan_type: null,
    activity: null,
    boosts: [],
  });

  it("picks the window closest to running out", () => {
    const usage: UsageData = { providers: [provider("Claude", 10, 46), provider("Codex", null, 8)], errors: [] };
    expect(tightestLimit(usage)).toMatchObject({ providerLabel: "Claude", windowLabel: "weekly", remainingPct: 54 });
  });

  it("returns null without usage", () => {
    expect(tightestLimit(null)).toBeNull();
    expect(tightestLimit({ providers: [provider("Codex", null, null)], errors: [] })).toBeNull();
  });
});
