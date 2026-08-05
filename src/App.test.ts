import { describe, expect, it } from "vitest";
import { traySummary } from "./App";
import type { UsageData } from "./types/usage";

function provider(overrides: Partial<UsageData["providers"][number]> = {}): UsageData["providers"][number] {
  return {
    provider: "codex",
    label: "Codex",
    five_hour_pct: 15,
    five_hour_resets_at: null,
    seven_day_pct: 40,
    seven_day_resets_at: null,
    extra_usage_enabled: false,
    plan_type: "pro",
    activity: null,
    boosts: [],
    ...overrides,
  };
}

describe("traySummary", () => {
  it("starts Rotate with the first available provider", () => {
    const usage: UsageData = {
      providers: [
        provider({ provider: "claude", label: "Claude", five_hour_pct: 10, seven_day_pct: 60 }),
        provider({ provider: "codex", label: "Codex", five_hour_pct: 15, seven_day_pct: 30 }),
      ],
      errors: [],
    };

    expect(traySummary(usage)).toEqual({
      title: "90%",
      tooltip: "Menu bar: Rotate · Claude\nClaude: 90% 5h · 40% 7d\nCodex: 85% 5h · 70% 7d",
      provider: "claude",
    });
  });

  it("rotates to the next provider by index", () => {
    const usage: UsageData = {
      providers: [
        provider({ provider: "claude", label: "Claude", five_hour_pct: 10, seven_day_pct: 60 }),
        provider({ provider: "codex", label: "Codex", five_hour_pct: 15, seven_day_pct: 90 }),
      ],
      errors: [],
    };

    expect(traySummary(usage, "rotate", 1)).toEqual({
      title: "85%",
      tooltip: "Menu bar: Rotate · Codex\nClaude: 90% 5h · 40% 7d\nCodex: 85% 5h · 10% 7d",
      provider: "codex",
    });
  });

  it("uses the explicitly pinned Claude provider", () => {
    const usage: UsageData = {
      providers: [
        provider({ provider: "claude", label: "Claude", five_hour_pct: 10, seven_day_pct: 60 }),
        provider({ provider: "codex", label: "Codex", five_hour_pct: 15, seven_day_pct: 30 }),
      ],
      errors: [],
    };

    expect(traySummary(usage, "claude")).toEqual({
      title: "90%",
      tooltip: "Menu bar: Claude\nClaude: 90% 5h · 40% 7d\nCodex: 85% 5h · 70% 7d",
      provider: "claude",
    });
  });

  it("does not silently switch when the pinned provider is unavailable", () => {
    const usage: UsageData = {
      providers: [provider({ provider: "codex", label: "Codex" })],
      errors: [{ provider: "claude", label: "Claude", message: "UNAUTHORIZED" }],
    };

    expect(traySummary(usage, "claude")).toEqual({
      title: "—",
      tooltip: "Menu bar: Claude (unavailable)\nCodex: 85% 5h · 60% 7d",
      provider: "claude",
    });
  });

  it("uses the weekly window when a provider no longer has a 5h limit", () => {
    const usage: UsageData = {
      providers: [provider({ five_hour_pct: null, seven_day_pct: 75 })],
      errors: [],
    };

    expect(traySummary(usage)).toEqual({
      title: "25%",
      tooltip: "Menu bar: Rotate · Codex\nCodex: 25% 7d",
      provider: "codex",
    });
  });

  it("omits providers whose API reports no usage windows", () => {
    const usage: UsageData = {
      providers: [provider({ five_hour_pct: null, seven_day_pct: null })],
      errors: [],
    };

    expect(traySummary(usage)).toBeNull();
  });
});
