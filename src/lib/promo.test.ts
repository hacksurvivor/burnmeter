import { describe, it, expect } from "vitest";
import { isPeak, isPromoActive, getNextTransition, getLocalPeakHours } from "./promo";

describe("isPromoActive", () => {
  it("returns true during promo period", () => {
    const during = new Date("2026-03-16T12:00:00Z");
    expect(isPromoActive(during)).toBe(true);
  });

  it("returns false before promo", () => {
    const before = new Date("2026-03-12T12:00:00Z");
    expect(isPromoActive(before)).toBe(false);
  });

  it("returns false after promo ends", () => {
    const after = new Date("2026-03-28T08:00:00Z");
    expect(isPromoActive(after)).toBe(false);
  });
});

describe("isPeak", () => {
  it("returns true at 8 AM PT on a weekday (Monday)", () => {
    // 2026-03-16 is Monday. 8 AM PDT = 15:00 UTC
    const monday8am = new Date("2026-03-16T15:00:00Z");
    expect(isPeak(monday8am)).toBe(true);
  });

  it("returns true at 5 AM PT on a weekday", () => {
    const monday5am = new Date("2026-03-16T12:00:00Z");
    expect(isPeak(monday5am)).toBe(true);
  });

  it("returns false at 4:59 AM PT on a weekday", () => {
    const monday459am = new Date("2026-03-16T11:59:00Z");
    expect(isPeak(monday459am)).toBe(false);
  });

  it("returns false at 11:00 AM PT on a weekday (end is exclusive)", () => {
    const monday11am = new Date("2026-03-16T18:00:00Z");
    expect(isPeak(monday11am)).toBe(false);
  });

  it("returns false on Saturday", () => {
    const sat8am = new Date("2026-03-14T15:00:00Z");
    expect(isPeak(sat8am)).toBe(false);
  });

  it("returns false on Sunday", () => {
    const sun8am = new Date("2026-03-15T15:00:00Z");
    expect(isPeak(sun8am)).toBe(false);
  });
});

describe("getNextTransition", () => {
  it("returns 11 AM PT same day when currently peak", () => {
    const now = new Date("2026-03-16T15:00:00Z");
    const next = getNextTransition(now);
    expect(next.getTime()).toBe(new Date("2026-03-16T18:00:00Z").getTime());
  });

  it("returns 5 AM PT next day when off-peak weekday after 11 AM", () => {
    const now = new Date("2026-03-16T21:00:00Z");
    const next = getNextTransition(now);
    expect(next.getTime()).toBe(new Date("2026-03-17T12:00:00Z").getTime());
  });

  it("returns 5 AM PT same day when off-peak weekday before 5 AM", () => {
    const now = new Date("2026-03-16T10:00:00Z");
    const next = getNextTransition(now);
    expect(next.getTime()).toBe(new Date("2026-03-16T12:00:00Z").getTime());
  });

  it("returns Monday 5 AM PT when off-peak on Friday after 11 AM", () => {
    const now = new Date("2026-03-20T21:00:00Z");
    const next = getNextTransition(now);
    expect(next.getTime()).toBe(new Date("2026-03-23T12:00:00Z").getTime());
  });

  it("returns Monday 5 AM PT when on Saturday", () => {
    const now = new Date("2026-03-21T19:00:00Z");
    const next = getNextTransition(now);
    expect(next.getTime()).toBe(new Date("2026-03-23T12:00:00Z").getTime());
  });

  it("returns Monday 5 AM PT when on Sunday", () => {
    const now = new Date("2026-03-22T19:00:00Z");
    const next = getNextTransition(now);
    expect(next.getTime()).toBe(new Date("2026-03-23T12:00:00Z").getTime());
  });
});

describe("getLocalPeakHours", () => {
  it("converts PT peak to UTC+3 (e.g., Istanbul)", () => {
    const { startHour, endHour } = getLocalPeakHours(
      "Europe/Istanbul",
      new Date("2026-03-16T12:00:00Z")
    );
    expect(startHour).toBe(15);
    expect(endHour).toBe(21);
  });

  it("handles timezone where peak crosses midnight", () => {
    const { startHour, endHour } = getLocalPeakHours(
      "Pacific/Kiritimati",
      new Date("2026-03-16T12:00:00Z")
    );
    expect(startHour).toBe(2);
    expect(endHour).toBe(8);
  });
});
