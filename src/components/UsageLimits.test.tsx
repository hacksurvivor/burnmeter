import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UsageLimits } from "./UsageLimits";
import type { UsageData } from "../types/usage";

function renderUsage(usage: UsageData) {
  return renderToStaticMarkup(
    <UsageLimits
      usage={usage}
      isStale={false}
      onRetry={() => {}}
      onSettingsClick={() => {}}
    />,
  );
}

describe("UsageLimits", () => {
  it("renders a Codex weekly-only limit without an invented 5h meter", () => {
    const html = renderUsage({
      providers: [{
        provider: "codex",
        label: "Codex",
        five_hour_pct: null,
        five_hour_resets_at: null,
        seven_day_pct: 75,
        seven_day_resets_at: "2099-01-01T00:00:00Z",
        extra_usage_enabled: false,
        plan_type: "pro",
        activity: null,
        boosts: [],
      }],
      errors: [],
    });

    expect(html).toContain("usage__limits--single");
    expect(html).toContain(">7d<");
    expect(html).toContain(">25%<");
    expect(html).not.toContain(">5h<");
    expect(html).not.toContain("Resets in unknown");
  });
});
