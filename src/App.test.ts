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
  it("uses the lowest 5h remaining value for the menu bar title", () => {
    const usage: UsageData = {
      providers: [
        provider({ provider: "claude", label: "Claude", five_hour_pct: 10, seven_day_pct: 60 }),
        provider({ provider: "codex", label: "Codex", five_hour_pct: 15, seven_day_pct: 30 }),
      ],
      errors: [],
    };

    expect(traySummary(usage)?.title).toBe("85%");
  });

  it("does not use the 7d window even when it has less remaining capacity", () => {
    const usage: UsageData = {
      providers: [provider({ five_hour_pct: 15, seven_day_pct: 90 })],
      errors: [],
    };

    expect(traySummary(usage)?.title).toBe("85%");
  });
});
