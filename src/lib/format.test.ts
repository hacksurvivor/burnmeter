import { describe, it, expect } from "vitest";
import { formatCountdown, formatPercent, formatTimeRange } from "./format";

describe("formatCountdown", () => {
  it("formats seconds into Xh Xm", () => {
    expect(formatCountdown(3600 + 1440)).toBe("1h 24m");
  });

  it("formats days", () => {
    expect(formatCountdown(4 * 86400 + 11 * 3600)).toBe("4d 11h");
  });

  it("formats minutes only when < 1 hour", () => {
    expect(formatCountdown(300)).toBe("5m");
  });

  it("returns '<1m' for tiny values", () => {
    expect(formatCountdown(30)).toBe("<1m");
  });
});

describe("formatPercent", () => {
  it("formats remaining percent", () => {
    expect(formatPercent(38.2)).toBe("62%");
  });

  it("clamps to 0", () => {
    expect(formatPercent(105)).toBe("0%");
  });

  it("shows 100% when usage is 0", () => {
    expect(formatPercent(0)).toBe("100%");
  });
});

describe("formatTimeRange", () => {
  it("formats hour range", () => {
    expect(formatTimeRange(15, 21)).toBe("15:00 - 21:00");
  });

  it("pads single digits", () => {
    expect(formatTimeRange(5, 11)).toBe("05:00 - 11:00");
  });
});
