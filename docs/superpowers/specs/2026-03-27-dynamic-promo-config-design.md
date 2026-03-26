# Dynamic Promo Config via Remote JSON

## Summary

Replace all hardcoded promo dates, peak hours, and messages with a remote JSON config file hosted on GitHub. Burnmeter fetches it on launch and every 60 minutes. When no promo is active (or config unavailable), the promo UI hides and the app shows only usage data.

## Motivation

Currently promo details are hardcoded in 3+ places across the codebase (`constants.ts`, `promo.ts`, `App.tsx`). If Anthropic extends the promo by an hour, changes peak hours, or launches a new promo, a new app release is required. A remote config lets the maintainer update a single JSON file without shipping a build.

## Design

### Remote config file

Hosted at: `https://raw.githubusercontent.com/hacksurvivor/burnmeter/main/promo.json`

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

Fields:
- `active` — master toggle. When `false`, promo UI is hidden regardless of dates.
- `start` / `end` — ISO date strings (YYYY-MM-DD). `end` is exclusive (promo is active up to but not including this date, in the specified timezone).
- `peakStartHour` / `peakEndHour` — 24-hour integers in the specified timezone. Peak = these hours on weekdays.
- `timezone` — IANA timezone string for interpreting peak hours and dates.
- `label` — display text for the promo badge (e.g., "2x off-peak bonus").
- `weekendsOffPeak` — when `true`, entire weekend is treated as off-peak (2x bonus).

### New type: `PromoConfig`

```typescript
interface PromoConfig {
  active: boolean;
  start: string;
  end: string;
  peakStartHour: number;
  peakEndHour: number;
  timezone: string;
  label: string;
  weekendsOffPeak: boolean;
}
```

### New hook: `usePromoConfig()`

- On mount: fetch config from the remote URL
- Re-fetch every 60 minutes via `setInterval`
- Stores latest valid config in React state
- Returns `{ config: PromoConfig | null, loading: boolean }`
- On fetch failure: keeps last successful config in state. If no config was ever fetched, returns `null`.
- Validates the response shape before accepting (all required fields present, correct types).

### Changes to `promo.ts`

All functions stop reading from `constants.ts` and instead accept config as a parameter:

- `isPromoActive(now: Date, config: PromoConfig): boolean` — checks `config.active`, `config.start`, `config.end` in `config.timezone`
- `isPeak(now: Date, config: PromoConfig): boolean` — checks `config.peakStartHour`, `config.peakEndHour`, `config.weekendsOffPeak` in `config.timezone`
- `getNextTransition(now: Date, config: PromoConfig): Date` — uses config peak hours/timezone
- `getLocalPeakHours(userTimezone: string, refDate: Date, config: PromoConfig): { startHour, endHour }` — uses config timezone/hours

The `PROMO_TZ` constant is replaced by `config.timezone` everywhere.

### Changes to `usePromoStatus`

- Accepts `config: PromoConfig | null` as a parameter (from `usePromoConfig`)
- When `config` is `null`, returns a promo status with `isPromoActive: false`
- Passes `config` to all promo functions instead of relying on hardcoded constants
- Derives `promoEndDate` display string from `config.end` instead of hardcoded `"Mar 27"`

### Changes to `App.tsx`

- Calls `usePromoConfig()` to get the remote config
- Passes config into `usePromoStatus(config)`
- Removes hardcoded `promoEndDate` constant
- Derives the "Ends ..." label from `config.end` if config exists

### Changes to `QuickInfo.tsx`

- `promoEndDate` prop derived from config, not hardcoded

### Changes to `constants.ts`

Remove:
- `PROMO_START`
- `PROMO_END`
- `PROMO_TZ`
- `PEAK_START_HOUR`
- `PEAK_END_HOUR`

Keep: `COLORS`, `TrayStatus` (unchanged).

### Changes to tray

When promo is not active (`config` is null or `active: false`), tray shows `⚪ Burnmeter · XX%` — just usage, no promo status. Already works this way via the `"gray"` status path.

### Fallback behavior

| Scenario | Behavior |
|----------|----------|
| First launch, fetch succeeds | Show promo UI |
| Fetch fails, no cached config | Hide promo UI, show usage only |
| Fetch fails, cached config exists | Use cached config |
| `active: false` in config | Hide promo UI |
| Config has dates in the past | `isPromoActive` returns false, promo UI hidden |
| Invalid JSON response | Ignore, keep cached config |

### Files changed

- Create: `promo.json` (repo root)
- Create: `src/hooks/usePromoConfig.ts`
- Create: `src/types/promo.ts` (PromoConfig type)
- Modify: `src/lib/promo.ts` — accept config params
- Modify: `src/lib/promo.test.ts` — pass config to functions
- Modify: `src/hooks/usePromoStatus.ts` — accept config param
- Modify: `src/components/PromoTimer.tsx` — no structural change (already conditionally renders)
- Modify: `src/components/QuickInfo.tsx` — derive end date from config
- Modify: `src/App.tsx` — wire up usePromoConfig, remove hardcoded dates
- Modify: `src/lib/constants.ts` — remove promo constants

### Testing

- Unit tests for `promo.ts` updated to pass config objects
- Unit tests for config validation in `usePromoConfig`
- Existing test patterns preserved, just with config params instead of hardcoded values

### No Rust changes

This is entirely frontend. Config is fetched via browser `fetch()`. No Tauri commands needed.
