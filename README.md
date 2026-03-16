# Burnmeter

Track your Claude usage and the March 2026 2x promotion — right from your menu bar.

## What it does

- Shows whether you're in **FREE 2x** (off-peak, bonus tokens) or **PEAK** (your plan tokens)
- Countdown to the next status change
- Real-time **5-hour** and **7-day** usage percentages from Anthropic's API
- Automatic timezone detection — shows peak hours in your local time
- Weekend detection — all day 2x on weekends

## Menu bar

```
🟢 FREE 2x · 80%     — off-peak, 80% of 5h limit remaining
🟠 PEAK · 45%         — peak hours, 45% remaining
```

## Install

### From source (macOS / Linux / Windows)

**Prerequisites:** [Rust](https://rustup.rs/), [Node.js](https://nodejs.org/) 20+, [pnpm](https://pnpm.io/), [Claude Code](https://claude.ai/code) (`claude login` required)

```bash
git clone https://github.com/anthropics/burnmeter.git
cd burnmeter
pnpm install
pnpm tauri build
```

**macOS:** DMG at `src-tauri/target/release/bundle/dmg/`
**Windows:** MSI/NSIS at `src-tauri/target/release/bundle/`
**Linux:** DEB/AppImage at `src-tauri/target/release/bundle/`

## How it works

1. Reads your Claude Code OAuth token (macOS Keychain / Linux+Windows credentials file) — **read-only, never writes**
2. Calls `api.anthropic.com/api/oauth/usage` every 60 seconds for real usage percentages
3. Calculates peak/off-peak windows using IANA timezone `America/Los_Angeles`
4. Converts to your local timezone automatically

## Promotion details

**March 13-27, 2026** — Anthropic doubles usage limits during off-peak hours:
- **Peak (1x):** 5-11 AM Pacific Time, weekdays only
- **Off-peak (2x):** Everything else, including all weekend hours
- **Plans:** Free, Pro, Max, Team (Enterprise excluded)

## Tech stack

| Component | Choice |
|-----------|--------|
| App shell | Tauri v2 |
| Backend | Rust |
| Frontend | React + TypeScript |
| Build | Vite |
| API | Anthropic OAuth usage endpoint |

## Contributing

PRs welcome. MIT license.

## License

MIT
