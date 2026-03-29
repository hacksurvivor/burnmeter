# Burnmeter Launch Copy

All promotion copy, ready to paste. Adjust screenshots/links as needed before posting.

---

## 1. Hacker News — Show HN

**Title:**

```
Show HN: Burnmeter – Menu bar app to track Claude API usage and the 2x off-peak bonus
```

**Comment:**

```
I kept getting blindsided by Claude Code's usage limits. I'd be deep in a session, hit the wall,
and realize I had no idea how close I was to the cap — or that I could've been doing this work
at off-peak hours for 2x the tokens.

Anthropic is running a promotion through March 27 where off-peak usage (basically anything
outside 5-11 AM Pacific on weekdays, plus all weekends) counts at double rate. There's no
dashboard for this. You just have to... know.

So I built Burnmeter. It sits in your menu bar and shows:

- Whether you're in peak or off-peak (FREE 2x) right now
- Your 5-hour and 7-day usage as percentages
- A countdown to the next peak/off-peak transition, in your local timezone

It reads the Claude Code OAuth token from your macOS Keychain (or credentials file on
Linux/Windows) — read-only, never writes anything. Polls the usage API once per minute.

The menu bar text looks like: 🟢 FREE 2x · 84%  or  🟠 PEAK · 84%

Tech stack: Tauri v2 with a Rust backend (reqwest + tokio for API calls, chrono for timezone
math) and a React/TypeScript frontend. Cross-platform — builds for macOS, Linux, and Windows.
Binary is ~8MB.

The 2x promo ends March 27, so this is time-sensitive if you want to take advantage of it.
After that I'll probably keep it running as a general usage monitor — knowing your remaining
capacity is useful regardless.

https://github.com/hacksurvivor/burnmeter
```

---

## 2. Reddit Posts

### r/ClaudeAI

**Title:** I built a free menu bar app to track your Claude usage and the 2x off-peak bonus (ends March 27)

**Body:**

```
If you're using Claude Code, you've probably hit the usage cap at the worst possible time.
I certainly have. Multiple times.

Anthropic's running a 2x off-peak promotion through March 27 — anything outside 5-11 AM
Pacific on weekdays (and all weekend) gives you double the tokens. But there's no way to
see this in the UI. You just have to manually check the time and guess how much usage
you have left.

I got annoyed enough to build something: **Burnmeter** is a menu bar app that shows your
usage percentage and peak/off-peak status at a glance.

What you see in the menu bar: `🟢 FREE 2x · 84%` or `🟠 PEAK · 84%`

Click it and you get the full breakdown — 5-hour window, 7-day window, countdown timer to
the next transition, all converted to your local timezone automatically.

It reads your existing Claude Code OAuth token (read-only — it never writes or stores
anything new). Polls the API once per minute. Works on macOS, Linux, and Windows.

Free and open source: https://github.com/hacksurvivor/burnmeter

Heads up: the promo ends March 27, so if you want to actually use the peak/off-peak
tracking, grab it soon. After that it'll still work as a general usage monitor.
```

---

### r/rust

**Title:** Built a cross-platform menu bar app with Tauri v2 + Rust — here's what I learned

**Body:**

```
I needed a small system tray app to monitor my Claude API usage and ended up building it with
Tauri v2. Wanted to share some notes since there aren't many write-ups about Tauri v2 tray
apps yet.

**The app:** Burnmeter — sits in your menu bar, shows Claude Code usage percentages and
whether you're in a peak or off-peak window (Anthropic is running a 2x off-peak promo
through March 27).

**Rust-side architecture:**

- `reqwest` (with rustls-tls, no OpenSSL dependency) + `tokio` for async API polling every 60s
- `chrono` for timezone calculations — the promotion is defined in America/Los_Angeles and
  needs to be converted to the user's local timezone
- Platform-specific keychain access: on macOS I shell out to `security find-generic-password`
  to read from Keychain. On Linux/Windows it reads a credentials JSON file from well-known
  paths. Conditional compilation with `#[cfg(target_os = "...")]` made this clean
- `serde_json` for parsing both the credentials (which can be nested JSON or a bare token
  string) and the API response
- The tray icon is a 1x1 transparent pixel — all the info is in the `set_title()` text. On
  macOS I use `icon_as_template(true)` so it respects dark/light mode

**Tauri v2 observations:**

- The tray API is solid. `TrayIconBuilder` with menu events, click handling for show/hide of
  the webview window — all straightforward
- Setting `ActivationPolicy::Accessory` on macOS keeps it out of the dock (menu bar only app)
- Window positioning near the tray required manual calculation with monitor scale factor
- The invoke handler bridge between Rust commands and the React frontend is seamless —
  `#[tauri::command]` with async support just works

**What I'd do differently:**

- The macOS keychain access via `security` CLI works but feels hacky. A proper
  Security.framework binding would be cleaner
- I'm doing all the promo/timezone logic on the TypeScript side. Moving it to Rust
  with chrono-tz would simplify the frontend

Final binary is ~8MB. Cross-platform builds for macOS (Universal), Linux (.deb/.AppImage),
and Windows (.msi).

Source: https://github.com/hacksurvivor/burnmeter

Happy to answer questions about the Tauri v2 experience.
```

---

### r/programming

**Title:** Show r/programming: Burnmeter — a cross-platform menu bar app for API usage tracking (Tauri v2 + Rust + React)

**Body:**

```
I built a menu bar / system tray app that monitors Claude API usage in real-time. The
interesting part (to me at least) was the cross-platform challenge.

**The problem:** Anthropic's Claude Code has usage limits but no persistent UI showing how
close you are. They're also running a time-limited 2x off-peak promotion, but whether you're
in peak or off-peak depends on Pacific time — not your timezone.

**The solution:** A lightweight tray app that:
1. Reads an OAuth token from the OS credential store (macOS Keychain, Linux/Windows
   credentials file)
2. Polls a usage API every 60 seconds
3. Shows a one-line status in the menu bar: `🟢 FREE 2x · 84%`
4. Click to expand: full usage breakdown, countdown timers, timezone conversion

**Architecture:**
- **Tauri v2** — Rust backend, React/TypeScript frontend, ~8MB binary
- **Rust side:** reqwest+tokio for HTTP, chrono for time, conditional compilation for
  platform-specific credential access (`#[cfg(target_os)]`)
- **Frontend:** React with Intl.DateTimeFormat for timezone conversion. The promo rules
  (peak = 5-11 AM Pacific, weekdays only) get converted to the user's IANA timezone
- **Tray:** 1x1 transparent icon, all information conveyed through `set_title()` text.
  Window anchored near tray with manual position calculation accounting for display
  scale factor

Cross-platform: macOS (.dmg, Universal Binary), Linux (.deb, .AppImage), Windows (.msi).
MIT licensed.

https://github.com/hacksurvivor/burnmeter
```

---

## 3. Twitter/X Thread

**Tweet 1:**

```
I kept burning through my Claude Code tokens without realizing it.

So I built Burnmeter — a menu bar app that shows your usage % and whether you're in
peak or off-peak (2x bonus) right now.

One glance: 🟢 FREE 2x · 84%

Free, open source, cross-platform.

[screenshot of menu bar + expanded panel]
```

**Tweet 2:**

```
How it works:

- Reads your Claude Code OAuth token (read-only, from Keychain/credentials file)
- Polls Anthropic's usage API every 60s
- Shows 5-hour and 7-day usage windows
- Converts peak hours (5-11 AM Pacific) to your local timezone
- Countdown timer to next peak/off-peak switch

[screenshot of the tray icon close-up]
```

**Tweet 3:**

```
Built with Tauri v2 + Rust + React. Binary is 8MB.

Anthropic's 2x off-peak promo runs through March 27 — after that
Burnmeter still works as a general usage tracker.

Grab it: github.com/hacksurvivor/burnmeter

#ClaudeCode #Rust #TauriApp #DevTools
```

**Suggested tags/mentions:**
- @AnthropicAI
- @anthropicclaude
- @nicogagelern (if applicable — Tauri maintainer)
- @nicklockwood (Tauri)
- #ClaudeCode #Rust #TauriApp #DevTools #OpenSource

---

## 4. Discord Messages

### Claude Discord (#showcase or #community-projects)

```
Built a small thing that's been saving me from hitting Claude Code usage limits blindly:

**Burnmeter** — a menu bar app that shows your usage percentage and peak/off-peak status
at a glance.

Menu bar shows: 🟢 FREE 2x · 84%  or  🟠 PEAK · 84%
Click to expand: full 5hr/7day breakdown, countdown timer, timezone conversion

Reads your existing Claude Code OAuth token (read-only). Polls usage API every 60s.
Works on macOS, Linux, Windows.

The 2x off-peak promo ends March 27, so grab it while it's useful for that:
https://github.com/hacksurvivor/burnmeter
```

### Tauri Discord (#showcase)

```
Sharing a Tauri v2 tray app I just shipped: **Burnmeter** — monitors Claude API usage
from the menu bar.

Some Tauri v2 specifics that might be useful to others:
- Tray-only app using `ActivationPolicy::Accessory` on macOS (no dock icon)
- 1x1 transparent tray icon, all info via `set_title()` text
- Window show/hide on left-click, positioned near tray with manual scale-factor math
- `#[tauri::command]` async handlers with reqwest for API polling
- Platform-conditional keychain access (`#[cfg(target_os)]`)

~8MB binary. macOS/Linux/Windows.
https://github.com/hacksurvivor/burnmeter
```

### Rust Discord (#showcase)

```
Just released a small Tauri v2 + Rust app: **Burnmeter** — menu bar tool for tracking
Claude API usage.

Rust side handles: OAuth token reading (macOS Keychain via `security` CLI, file-based
on Linux/Windows with `#[cfg]`), API polling with reqwest+tokio, tray management.

Nothing groundbreaking, but a decent example of a minimal Tauri v2 tray app if anyone's
looking for one. ~8MB binary, cross-platform.

https://github.com/hacksurvivor/burnmeter
```

---

## 5. Dev.to Article Outline

**Title:** I Built a Menu Bar App to Stop Burning Through My Claude Tokens

**Slug:** `burnmeter-menu-bar-claude-usage-tracker`

**Tags:** rust, webdev, opensource, productivity

### Outline:

**Introduction — The Problem**
- Using Claude Code daily, no idea how close I am to usage limits
- Hit the cap mid-session multiple times
- Anthropic launched a 2x off-peak promotion (March 13-27) but there's no UI for it
- You're supposed to just... know it's off-peak? And do timezone math in your head?

**What I Built**
- Burnmeter: a menu bar app showing usage % and peak/off-peak status
- Screenshot of the menu bar text: 🟢 FREE 2x · 84%
- Screenshot of the expanded panel: 5-hour window, 7-day window, countdown timer
- Available on macOS, Linux, Windows — free and open source

**How It Works (User Perspective)**
- Install the app, that's it — it finds your Claude Code OAuth token automatically
- macOS: reads from Keychain (same place Claude Code stores it)
- Linux/Windows: reads from the credentials JSON file
- Read-only access, never writes or stores credentials separately
- Polls Anthropic's usage API every 60 seconds
- Detects your timezone and converts peak hours (5-11 AM Pacific) automatically
- Weekends are always off-peak — the app knows this too

**Architecture Deep Dive**
- Why Tauri v2: native binary, small footprint (~8MB), Rust backend with web frontend
- Rust backend modules:
  - `keychain.rs` — platform-specific credential access with `#[cfg(target_os)]`
  - `api.rs` — reqwest + tokio async HTTP, response parsing with serde
  - `tray.rs` — TrayIconBuilder, window positioning, menu bar text updates
  - `lib.rs` — Tauri setup, activation policy, window event handling
- Frontend:
  - React + TypeScript + Vite
  - Promo logic: Intl.DateTimeFormat for timezone conversion without external deps
  - Custom hooks: `useUsageData` (polling), `usePromoStatus` (peak/off-peak state machine)
- The tray trick: 1x1 transparent PNG icon, all information conveyed through title text

**Cross-Platform Challenges**
- macOS Keychain access via `security` CLI vs. file-based credentials on Linux/Windows
- macOS `ActivationPolicy::Accessory` to hide from dock — no equivalent needed elsewhere
- Window positioning near tray: manual calculation with monitor scale factor
- Tray title rendering differences across platforms

**The Promotion Logic**
- Peak: 5-11 AM Pacific, weekdays only
- Off-peak: everything else, including all weekends
- The tricky part: converting Pacific time boundaries to arbitrary user timezones
- Used Intl.DateTimeFormat with IANA timezone identifiers — zero external dependencies
- Edge cases: DST transitions, midnight crossings, Friday-to-Monday transitions

**What's Next**
- The 2x promo ends March 27 — after that, still useful as a general usage monitor
- Might add: notification when approaching limit, historical usage chart, multi-account support
- Considering moving timezone logic from TypeScript to Rust (chrono-tz)

**Links**
- GitHub: https://github.com/hacksurvivor/burnmeter
- Download: https://github.com/hacksurvivor/burnmeter/releases/latest

---

## 6. Product Hunt

**Tagline (under 60 chars):**

```
Track your Claude usage from the menu bar
```

**Description:**

```
Burnmeter is a free, open-source menu bar app that shows your Claude Code usage at a
glance. See your remaining capacity as a percentage, whether you're in peak or off-peak
hours (with Anthropic's 2x bonus), and a countdown to the next transition — all in your
local timezone. Works on macOS, Linux, and Windows.
```

**Maker Comment:**

```
Hey everyone — I built Burnmeter because I kept hitting Claude Code's usage limits
without warning. There's no persistent indicator anywhere showing how much capacity you
have left, and with Anthropic's current 2x off-peak promotion (running through March 27),
I wanted a way to see at a glance whether I should be coding now or waiting an hour.

The app reads your existing Claude Code OAuth token (read-only) and polls the usage API
every 60 seconds. The menu bar shows something like 🟢 FREE 2x · 84% — so you always know
where you stand without opening anything.

It's built with Tauri v2 (Rust + React), so the binary is only about 8MB. Fully open
source under MIT.

I'd love feedback — especially from other Claude Code users who've been doing the
"am I in peak or off-peak right now?" mental math. That's exactly the itch this scratches.
```
