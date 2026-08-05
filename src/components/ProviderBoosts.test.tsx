import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProviderBoosts } from "./ProviderBoosts";

describe("ProviderBoosts", () => {
  it("shows promotion multipliers and descriptions", () => {
    const html = renderToStaticMarkup(
      <ProviderBoosts boosts={[{
        id: "codex-promo",
        label: "Codex launch promo",
        kind: "promo",
        status: "active",
        multiplier: 2,
        starts_at: null,
        ends_at: null,
        description: "More weekly usage",
        windows: [],
      }]} />,
    );

    expect(html).toContain("2× usage");
    expect(html).toContain("More weekly usage");
  });

  it("labels additional usage windows by their actual duration", () => {
    const html = renderToStaticMarkup(
      <ProviderBoosts boosts={[{
        id: "spark",
        label: "Spark",
        kind: "additional_limit",
        status: "available",
        multiplier: null,
        starts_at: null,
        ends_at: null,
        description: null,
        windows: [{
          label: "7d window",
          used_percent: 25,
          resets_at: null,
          limit_window_seconds: 604800,
        }],
      }]} />,
    );

    expect(html).toContain("7d window: 75% left");
  });
});
