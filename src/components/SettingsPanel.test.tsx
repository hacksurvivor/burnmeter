import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PROVIDERS, SettingsPanel } from "./SettingsPanel";

describe("provider settings", () => {
  it("only includes providers with live in-app usage meters", () => {
    expect(PROVIDERS.map((provider) => provider.id)).toEqual(["claude", "codex"]);
  });

  it("gives every provider a local connection action", () => {
    for (const provider of PROVIDERS) {
      expect(provider.command, provider.label).toBeTruthy();
      expect(provider.connectUrl, provider.label).toBeNull();
      expect(provider.actionLabel, provider.label).toBeTruthy();
      expect(provider.available, provider.label).toBe(true);
    }
  });

  it("keeps native usage providers on local OAuth commands", () => {
    expect(PROVIDERS.find((provider) => provider.id === "claude")?.command).toBe("claude login");
    expect(PROVIDERS.find((provider) => provider.id === "codex")?.command).toBe("codex login");
  });

  it("places update and launch controls below the provider list", () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        usage={null}
        updateInfo={null}
        updateError={null}
        launchAtLogin={false}
        launchSettingsError={null}
        menuBarProvider="rotate"
        menuBarRotationMinutes={1}
        openWhenProviderStarts={false}
        onLaunchAtLoginChange={() => Promise.resolve()}
        onMenuBarProviderChange={() => {}}
        onMenuBarRotationMinutesChange={() => {}}
        onOpenWhenProviderStartsChange={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html.indexOf("Claude")).toBeLessThan(html.indexOf("Updates"));
    expect(html.indexOf("Codex")).toBeLessThan(html.indexOf("Open at login"));
  });

  it("shows the persisted menu bar provider selection", () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        usage={{
          providers: [{
            provider: "claude",
            label: "Claude",
            five_hour_pct: 10,
            five_hour_resets_at: null,
            seven_day_pct: 20,
            seven_day_resets_at: null,
            extra_usage_enabled: false,
            plan_type: null,
            activity: null,
            boosts: [],
          }],
          errors: [],
        }}
        updateInfo={null}
        updateError={null}
        launchAtLogin={false}
        launchSettingsError={null}
        menuBarProvider="claude"
        menuBarRotationMinutes={5}
        openWhenProviderStarts={false}
        onLaunchAtLoginChange={() => Promise.resolve()}
        onMenuBarProviderChange={() => {}}
        onMenuBarRotationMinutesChange={() => {}}
        onOpenWhenProviderStartsChange={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain("Menu bar");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('disabled=""');
  });

  it("shows persisted rotation interval choices only in Rotate mode", () => {
    const html = renderToStaticMarkup(
      <SettingsPanel
        usage={null}
        updateInfo={null}
        updateError={null}
        launchAtLogin={false}
        launchSettingsError={null}
        menuBarProvider="rotate"
        menuBarRotationMinutes={15}
        openWhenProviderStarts={false}
        onLaunchAtLoginChange={() => Promise.resolve()}
        onMenuBarProviderChange={() => {}}
        onMenuBarRotationMinutesChange={() => {}}
        onOpenWhenProviderStartsChange={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain("Change every");
    expect(html).toContain(">15m<");
  });
});
