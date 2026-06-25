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
        openWhenProviderStarts={false}
        onLaunchAtLoginChange={() => Promise.resolve()}
        onOpenWhenProviderStartsChange={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html.indexOf("Claude")).toBeLessThan(html.indexOf("Updates"));
    expect(html.indexOf("Codex")).toBeLessThan(html.indexOf("Open at login"));
  });
});
