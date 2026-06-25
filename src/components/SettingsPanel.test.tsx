import { describe, expect, it } from "vitest";
import { PROVIDERS } from "./SettingsPanel";

describe("provider settings", () => {
  it("gives every provider a truthful account action", () => {
    for (const provider of PROVIDERS) {
      expect(provider.command ?? provider.connectUrl, provider.label).toBeTruthy();
      expect(provider.actionLabel, provider.label).toBeTruthy();
    }
  });

  it("keeps native usage providers on local OAuth commands", () => {
    expect(PROVIDERS.find((provider) => provider.id === "claude")?.command).toBe("claude login");
    expect(PROVIDERS.find((provider) => provider.id === "codex")?.command).toBe("codex login");
  });

  it("opens official account and setup entry points for external providers", () => {
    expect(PROVIDERS.find((provider) => provider.id === "gemini")?.connectUrl).toBe(
      "https://gemini.google.com/app",
    );
    expect(PROVIDERS.find((provider) => provider.id === "grok")?.connectUrl).toBe(
      "https://x.ai/news/grok-build-cli",
    );
    expect(PROVIDERS.find((provider) => provider.id === "grok")?.actionLabel).toBe("CLI");
    expect(PROVIDERS.find((provider) => provider.id === "cursor")?.connectUrl).toBe(
      "https://cursor.com/dashboard",
    );
    expect(PROVIDERS.find((provider) => provider.id === "cursor")?.actionLabel).toBe("Usage");
    expect(PROVIDERS.find((provider) => provider.id === "kimi")?.connectUrl).toBe(
      "https://moonshotai.github.io/kimi-cli/en/guides/getting-started.html",
    );
    expect(PROVIDERS.find((provider) => provider.id === "glm")?.connectUrl).toBe(
      "https://docs.z.ai/devpack/quick-start",
    );
  });
});
