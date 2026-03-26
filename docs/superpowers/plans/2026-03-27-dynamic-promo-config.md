# Dynamic Promo Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded promo dates/hours with a remote JSON config fetched from GitHub, so the promo UI auto-hides when a promo ends and adapts when dates change.

**Architecture:** A new `usePromoConfig` hook fetches `promo.json` from the repo on launch + every 60 minutes. All promo logic in `promo.ts` takes a config parameter instead of reading constants. When no config is available, promo UI is hidden.

**Tech Stack:** React hooks, browser `fetch()`, TypeScript, Vitest

---

### File Structure

| File | Responsibility |
|------|---------------|
| `promo.json` (repo root) | NEW — Remote promo config |
| `src/types/promo.ts` | NEW — `PromoConfig` type + validation |
| `src/hooks/usePromoConfig.ts` | NEW — Fetch + cache remote config |
| `src/lib/promo.ts` | MODIFY — Accept config param instead of constants |
| `src/lib/promo.test.ts` | MODIFY — Pass config to all functions |
| `src/hooks/usePromoStatus.ts` | MODIFY — Accept config, remove constant imports |
| `src/App.tsx` | MODIFY — Wire up usePromoConfig, remove hardcoded dates |
| `src/components/QuickInfo.tsx` | MODIFY — Derive end date from config |
| `src/lib/constants.ts` | MODIFY — Remove promo constants |

---

### Task 1: Create promo.json and PromoConfig Type

**Files:**
- Create: `promo.json`
- Create: `src/types/promo.ts`

- [ ] **Step 1: Create `promo.json` at repo root**

```json
{
  "active": true,
  "start": "2026-03-13",
  "end": "2026-03-28",
  "peakStartHour": 5,
  "peakEndHour": 11,
  "timezone": "America/Los_Angeles",
  "label": "2x off-peak bonus",
  "weekendsOffPeak": true
}
```

- [ ] **Step 2: Create `src/types/promo.ts`**

```typescript
export interface PromoConfig {
  active: boolean;
  start: string;
  end: string;
  peakStartHour: number;
  peakEndHour: number;
  timezone: string;
  label: string;
  weekendsOffPeak: boolean;
}

export function isValidPromoConfig(data: unknown): data is PromoConfig {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.active === "boolean" &&
    typeof d.start === "string" &&
    typeof d.end === "string" &&
    typeof d.peakStartHour === "number" &&
    typeof d.peakEndHour === "number" &&
    typeof d.timezone === "string" &&
    typeof d.label === "string" &&
    typeof d.weekendsOffPeak === "boolean"
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add promo.json src/types/promo.ts
git commit -m "feat: add promo.json config and PromoConfig type"
```

---

### Task 2: Refactor promo.ts to Accept Config Parameter

**Files:**
- Modify: `src/lib/promo.ts`
- Modify: `src/lib/promo.test.ts`

- [ ] **Step 1: Update tests to pass config**

Replace the entire contents of `src/lib/promo.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isPeak, isPromoActive, getNextTransition, getLocalPeakHours } from "./promo";
import type { PromoConfig } from "../types/promo";

const testConfig: PromoConfig = {
  active: true,
  start: "2026-03-13",
  end: "2026-03-28",
  peakStartHour: 5,
  peakEndHour: 11,
  timezone: "America/Los_Angeles",
  label: "2x off-peak bonus",
  weekendsOffPeak: true,
};

describe("isPromoActive", () => {
  it("returns true during promo period", () => {
    const during = new Date("2026-03-16T12:00:00Z");
    expect(isPromoActive(during, testConfig)).toBe(true);
  });

  it("returns false before promo", () => {
    const before = new Date("2026-03-12T12:00:00Z");
    expect(isPromoActive(before, testConfig)).toBe(false);
  });

  it("returns false after promo ends", () => {
    const after = new Date("2026-03-28T08:00:00Z");
    expect(isPromoActive(after, testConfig)).toBe(false);
  });

  it("returns false when config.active is false", () => {
    const during = new Date("2026-03-16T12:00:00Z");
    expect(isPromoActive(during, { ...testConfig, active: false })).toBe(false);
  });

  it("works with different date ranges", () => {
    const config = { ...testConfig, start: "2026-06-01", end: "2026-06-15" };
    expect(isPromoActive(new Date("2026-06-10T12:00:00Z"), config)).toBe(true);
    expect(isPromoActive(new Date("2026-05-31T12:00:00Z"), config)).toBe(false);
  });
});

describe("isPeak", () => {
  it("returns true at 8 AM PT on a weekday (Monday)", () => {
    // 2026-03-16 is Monday. 8 AM PDT = 15:00 UTC
    const monday8am = new Date("2026-03-16T15:00:00Z");
    expect(isPeak(monday8am, testConfig)).toBe(true);
  });

  it("returns true at 5 AM PT on a weekday", () => {
    const monday5am = new Date("2026-03-16T12:00:00Z");
    expect(isPeak(monday5am, testConfig)).toBe(true);
  });

  it("returns false at 4:59 AM PT on a weekday", () => {
    const monday459am = new Date("2026-03-16T11:59:00Z");
    expect(isPeak(monday459am, testConfig)).toBe(false);
  });

  it("returns false at 11:00 AM PT on a weekday (end is exclusive)", () => {
    const monday11am = new Date("2026-03-16T18:00:00Z");
    expect(isPeak(monday11am, testConfig)).toBe(false);
  });

  it("returns false on Saturday", () => {
    const sat8am = new Date("2026-03-14T15:00:00Z");
    expect(isPeak(sat8am, testConfig)).toBe(false);
  });

  it("returns false on Sunday", () => {
    const sun8am = new Date("2026-03-15T15:00:00Z");
    expect(isPeak(sun8am, testConfig)).toBe(false);
  });

  it("works with custom peak hours", () => {
    const config = { ...testConfig, peakStartHour: 9, peakEndHour: 17 };
    // 9 AM PDT = 16:00 UTC
    expect(isPeak(new Date("2026-03-16T16:00:00Z"), config)).toBe(true);
    // 8 AM PDT = 15:00 UTC (before custom peak)
    expect(isPeak(new Date("2026-03-16T15:00:00Z"), config)).toBe(false);
  });
});

describe("getNextTransition", () => {
  it("returns 11 AM PT same day when currently peak", () => {
    const now = new Date("2026-03-16T15:00:00Z");
    const next = getNextTransition(now, testConfig);
    expect(next.getTime()).toBe(new Date("2026-03-16T18:00:00Z").getTime());
  });

  it("returns 5 AM PT next day when off-peak weekday after 11 AM", () => {
    const now = new Date("2026-03-16T21:00:00Z");
    const next = getNextTransition(now, testConfig);
    expect(next.getTime()).toBe(new Date("2026-03-17T12:00:00Z").getTime());
  });

  it("returns 5 AM PT same day when off-peak weekday before 5 AM", () => {
    const now = new Date("2026-03-16T10:00:00Z");
    const next = getNextTransition(now, testConfig);
    expect(next.getTime()).toBe(new Date("2026-03-16T12:00:00Z").getTime());
  });

  it("returns Monday 5 AM PT when off-peak on Friday after 11 AM", () => {
    const now = new Date("2026-03-20T21:00:00Z");
    const next = getNextTransition(now, testConfig);
    expect(next.getTime()).toBe(new Date("2026-03-23T12:00:00Z").getTime());
  });

  it("returns Monday 5 AM PT when on Saturday", () => {
    const now = new Date("2026-03-21T19:00:00Z");
    const next = getNextTransition(now, testConfig);
    expect(next.getTime()).toBe(new Date("2026-03-23T12:00:00Z").getTime());
  });

  it("returns Monday 5 AM PT when on Sunday", () => {
    const now = new Date("2026-03-22T19:00:00Z");
    const next = getNextTransition(now, testConfig);
    expect(next.getTime()).toBe(new Date("2026-03-23T12:00:00Z").getTime());
  });
});

describe("getLocalPeakHours", () => {
  it("converts PT peak to UTC+3 (e.g., Istanbul)", () => {
    const { startHour, endHour } = getLocalPeakHours(
      "Europe/Istanbul",
      new Date("2026-03-16T12:00:00Z"),
      testConfig,
    );
    expect(startHour).toBe(15);
    expect(endHour).toBe(21);
  });

  it("handles timezone where peak crosses midnight", () => {
    const { startHour, endHour } = getLocalPeakHours(
      "Pacific/Kiritimati",
      new Date("2026-03-16T12:00:00Z"),
      testConfig,
    );
    expect(startHour).toBe(2);
    expect(endHour).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm test 2>&1 | tail -20`
Expected: FAIL — functions don't accept config param yet.

- [ ] **Step 3: Rewrite `src/lib/promo.ts` to accept config**

Replace the entire contents of `src/lib/promo.ts`:

```typescript
import type { PromoConfig } from "../types/promo";

function getComponents(date: Date, timezone: string): {
  year: number; month: number; day: number;
  hour: number; minute: number; dayOfWeek: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map(p => [p.type, p.value])
  );
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month),
    day: parseInt(parts.day),
    hour: parseInt(parts.hour === "24" ? "0" : parts.hour),
    minute: parseInt(parts.minute),
    dayOfWeek: dayMap[parts.weekday] ?? 0,
  };
}

function dateAtHour(ref: Date, hour: number, timezone: string, dayOffset = 0): Date {
  const { year, month, day } = getComponents(ref, timezone);
  const guess = new Date(Date.UTC(year, month - 1, day + dayOffset, hour + 7));
  const check = getComponents(guess, timezone);
  if (check.hour !== hour) {
    guess.setTime(guess.getTime() + (hour - check.hour) * 3600000);
  }
  return guess;
}

export function isPromoActive(now: Date, config: PromoConfig): boolean {
  if (!config.active) return false;
  const { year, month, day } = getComponents(now, config.timezone);
  const dateNum = year * 10000 + month * 100 + day;
  const [sy, sm, sd] = config.start.split("-").map(Number);
  const [ey, em, ed] = config.end.split("-").map(Number);
  const startNum = sy * 10000 + sm * 100 + sd;
  const endNum = ey * 10000 + em * 100 + ed;
  return dateNum >= startNum && dateNum < endNum;
}

export function isPeak(now: Date, config: PromoConfig): boolean {
  const { hour, dayOfWeek } = getComponents(now, config.timezone);
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (config.weekendsOffPeak && !isWeekday) return false;
  return isWeekday && hour >= config.peakStartHour && hour < config.peakEndHour;
}

export function getNextTransition(now: Date, config: PromoConfig): Date {
  const { hour, dayOfWeek } = getComponents(now, config.timezone);

  if (isPeak(now, config)) {
    return dateAtHour(now, config.peakEndHour, config.timezone);
  }

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (isWeekday && hour < config.peakStartHour) {
    return dateAtHour(now, config.peakStartHour, config.timezone);
  }

  let daysUntilNextWeekday: number;
  if (dayOfWeek === 5) daysUntilNextWeekday = 3;
  else if (dayOfWeek === 6) daysUntilNextWeekday = 2;
  else if (dayOfWeek === 0) daysUntilNextWeekday = 1;
  else daysUntilNextWeekday = 1;

  return dateAtHour(now, config.peakStartHour, config.timezone, daysUntilNextWeekday);
}

export function getLocalPeakHours(
  userTimezone: string,
  refDate: Date,
  config: PromoConfig,
): { startHour: number; endHour: number } {
  const peakStartUTC = dateAtHour(refDate, config.peakStartHour, config.timezone);
  const peakEndUTC = dateAtHour(refDate, config.peakEndHour, config.timezone);

  const getHourInTZ = (date: Date, tz: string) => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "2-digit", hour12: false,
    });
    const h = fmt.formatToParts(date).find(p => p.type === "hour")!.value;
    return parseInt(h === "24" ? "0" : h);
  };

  return {
    startHour: getHourInTZ(peakStartUTC, userTimezone),
    endHour: getHourInTZ(peakEndUTC, userTimezone),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm test 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo.ts src/lib/promo.test.ts
git commit -m "refactor: promo functions accept PromoConfig instead of hardcoded constants"
```

---

### Task 3: Create usePromoConfig Hook

**Files:**
- Create: `src/hooks/usePromoConfig.ts`

- [ ] **Step 1: Create `src/hooks/usePromoConfig.ts`**

```typescript
import { useState, useEffect, useCallback } from "react";
import type { PromoConfig } from "../types/promo";
import { isValidPromoConfig } from "../types/promo";

const CONFIG_URL =
  "https://raw.githubusercontent.com/hacksurvivor/burnmeter/main/promo.json";
const REFETCH_INTERVAL = 60 * 60 * 1000; // 1 hour

export function usePromoConfig() {
  const [config, setConfig] = useState<PromoConfig | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (isValidPromoConfig(data)) {
        setConfig(data);
      }
    } catch {
      // Keep cached config on failure
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  return config;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm build 2>&1 | tail -10`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePromoConfig.ts
git commit -m "feat: add usePromoConfig hook for remote promo config"
```

---

### Task 4: Update usePromoStatus to Use Config

**Files:**
- Modify: `src/hooks/usePromoStatus.ts`

- [ ] **Step 1: Rewrite `src/hooks/usePromoStatus.ts`**

Replace the entire contents:

```typescript
import { useState, useEffect } from "react";
import { isPeak, isPromoActive, getNextTransition, getLocalPeakHours } from "../lib/promo";
import { formatTimeRange } from "../lib/format";
import type { PromoStatus } from "../types/usage";
import type { PromoConfig } from "../types/promo";

export function usePromoStatus(config: PromoConfig | null) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const offsetParts = now.toLocaleString("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const gmtMatch = offsetParts.match(/GMT([+-]\d+(?::\d+)?)/);
  const utcOffset = gmtMatch ? `UTC${gmtMatch[1]}` : "UTC";

  if (!config) {
    const promo: PromoStatus = {
      isPromoActive: false,
      isPeak: false,
      label: "",
      timeLeftSeconds: 0,
      nextTransitionLabel: "",
    };
    return { promo, timezone, utcOffset, peakStartLocal: 0, peakEndLocal: 0, currentHour: 0, isWeekend: false, promoEndDate: "" };
  }

  const ptDayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "short",
  });
  const ptDay = ptDayFmt.format(now);
  const isWeekend = ptDay === "Sat" || ptDay === "Sun";

  const promoActive = isPromoActive(now, config);
  const peak = promoActive ? isPeak(now, config) : false;
  const nextTransition = promoActive ? getNextTransition(now, config) : now;
  const timeLeftSeconds = Math.max(0, (nextTransition.getTime() - now.getTime()) / 1000);

  const { startHour, endHour } = getLocalPeakHours(timezone, now, config);

  let nextLabel: string;
  if (isWeekend) {
    nextLabel = "Weekend — all day 2x bonus tokens";
  } else if (peak) {
    nextLabel = `Off-peak at ${formatTimeRange(endHour, endHour).split(" - ")[0]} (your time)`;
  } else {
    nextLabel = `Next peak: ${formatTimeRange(startHour, endHour)} (your time)`;
  }

  const promo: PromoStatus = {
    isPromoActive: promoActive,
    isPeak: peak,
    label: peak ? "PEAK (1x)" : "OFF-PEAK (2x)",
    timeLeftSeconds,
    nextTransitionLabel: nextLabel,
  };

  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Derive "Ends Mar 27" from config.end
  const [ey, em, ed] = config.end.split("-").map(Number);
  const endDate = new Date(ey, em - 1, ed - 1); // -1 because end is exclusive
  const promoEndDate = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    promo,
    timezone,
    utcOffset,
    peakStartLocal: startHour,
    peakEndLocal: endHour,
    currentHour,
    isWeekend,
    promoEndDate,
  };
}
```

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm test 2>&1 | tail -10`
Expected: All tests pass (only promo.test.ts has tests; hook is not unit-tested).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePromoStatus.ts
git commit -m "refactor: usePromoStatus accepts PromoConfig parameter"
```

---

### Task 5: Wire Up App.tsx and QuickInfo

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/QuickInfo.tsx`

- [ ] **Step 1: Update `src/App.tsx`**

Replace the entire contents:

```typescript
import { Header } from "./components/Header";
import { PromoTimer } from "./components/PromoTimer";
import { UsageLimits } from "./components/UsageLimits";
import { QuickInfo } from "./components/QuickInfo";
import { useUsageData } from "./hooks/useUsageData";
import { usePromoStatus } from "./hooks/usePromoStatus";
import { usePromoConfig } from "./hooks/usePromoConfig";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import type { TrayStatus } from "./lib/constants";

export default function App() {
  const { usage, error, lastUpdated, isStale } = useUsageData();
  const config = usePromoConfig();
  const { promo, timezone, utcOffset, peakStartLocal, peakEndLocal, currentHour, isWeekend, promoEndDate } =
    usePromoStatus(config);

  useEffect(() => {
    let status: TrayStatus;
    if (!promo.isPromoActive) status = "gray";
    else if (promo.isPeak) status = "orange";
    else status = "green";
    const pct = usage ? Math.round(100 - usage.five_hour_pct) : null;
    invoke("update_tray_status", { status, pct }).catch(() => {});
  }, [promo.isPromoActive, promo.isPeak, usage]);

  return (
    <div className="app">
      <Header timezone={timezone} utcOffset={utcOffset} />
      <PromoTimer
        promo={promo}
        peakStartLocal={peakStartLocal}
        peakEndLocal={peakEndLocal}
        currentHour={currentHour}
        isWeekend={isWeekend}
      />
      <div className="divider" />
      <UsageLimits usage={usage} isStale={isStale} />
      <QuickInfo
        isPromoActive={promo.isPromoActive}
        promoEndDate={promoEndDate}
        lastUpdated={lastUpdated}
        error={error}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/QuickInfo.tsx`**

Replace the entire contents:

```typescript
interface Props {
  isPromoActive: boolean;
  promoEndDate: string;
  lastUpdated: Date | null;
  error: string | null;
}

export function QuickInfo({ isPromoActive, promoEndDate, lastUpdated, error }: Props) {
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="foot">
      <span>
        {error ? (
          <span className="foot__err">{error}</span>
        ) : lastUpdated ? (
          <>{dayName} · {lastUpdated.toLocaleTimeString()}</>
        ) : null}
      </span>
      <span>{isPromoActive && promoEndDate ? `Ends ${promoEndDate}` : ""}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm build 2>&1 | tail -10`
Expected: No TypeScript errors.

- [ ] **Step 4: Run tests**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm test 2>&1 | tail -10`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/QuickInfo.tsx
git commit -m "feat: wire up remote promo config in App and QuickInfo"
```

---

### Task 6: Clean Up constants.ts

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Remove promo constants from `src/lib/constants.ts`**

Replace the entire contents:

```typescript
// Claude palette
export const COLORS = {
  dark: "#141413",
  light: "#faf9f5",
  orange: "#d97757",
  blue: "#6a9bcc",
  green: "#788c5d",
  midGray: "#b0aea5",
  lightGray: "#e8e6dc",
} as const;

// Tray icon states
export type TrayStatus = "green" | "orange" | "gray";
```

- [ ] **Step 2: Verify no remaining imports of removed constants**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && grep -r "PROMO_START\|PROMO_END\|PROMO_TZ\|PEAK_START_HOUR\|PEAK_END_HOUR" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: No matches.

- [ ] **Step 3: Run tests and build**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm test && pnpm build 2>&1 | tail -15`
Expected: All tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.ts
git commit -m "chore: remove hardcoded promo constants from constants.ts"
```

---

### Task 7: Manual Smoke Test

- [ ] **Step 1: Run the dev server**

Run: `cd "/Users/mac/Coding /Claude/claude-x2" && pnpm tauri dev`

- [ ] **Step 2: Verify promo UI shows**

With the current `promo.json` (active: true, dates covering today):
- Promo section should appear with PEAK/OFF-PEAK status
- Countdown timer should work
- "Ends Mar 27" should appear in footer

- [ ] **Step 3: Verify promo UI hides when inactive**

Temporarily edit `promo.json` to set `"active": false`, push to main, wait for the app to re-fetch (or restart). The promo section should disappear and tray should show `⚪ Burnmeter`.

- [ ] **Step 4: Verify custom peak hours work**

Temporarily edit `promo.json` to change `peakStartHour` to 9 and `peakEndHour` to 17. The schedule display and timeline should reflect the new hours in the user's local timezone.
