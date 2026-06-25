import { describe, expect, it } from "vitest";
import { PROVIDERS } from "./SettingsPanel";

describe("provider settings", () => {
  it("gives every provider a working connect path", () => {
    for (const provider of PROVIDERS) {
      expect(provider.command ?? provider.connectUrl, provider.label).toBeTruthy();
    }
  });

  it("keeps native usage providers on local OAuth commands", () => {
    expect(PROVIDERS.find((provider) => provider.id === "claude")?.command).toBe("claude login");
    expect(PROVIDERS.find((provider) => provider.id === "codex")?.command).toBe("codex login");
  });

  it("opens official account entry points for external providers", () => {
    expect(PROVIDERS.find((provider) => provider.id === "gemini")?.connectUrl).toBe(
      "https://gemini.google.com/",
    );
    expect(PROVIDERS.find((provider) => provider.id === "grok")?.connectUrl).toBe("https://grok.com/");
    expect(PROVIDERS.find((provider) => provider.id === "cursor")?.connectUrl).toBe("https://cursor.com/");
    expect(PROVIDERS.find((provider) => provider.id === "kimi")?.connectUrl).toBe(
      "https://www.kimi.com/en",
    );
    expect(PROVIDERS.find((provider) => provider.id === "glm")?.connectUrl).toBe("https://z.ai/chat");
  });
});
