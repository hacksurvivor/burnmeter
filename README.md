# Claude X2 Tracker

macOS menu bar app that tracks Claude's 2× usage promotion and usage limits with a retro CRT aesthetic.

```
╔══════════════════════════════════════════╗
║   ╔═╗ ╦   ╔═╗ ╦ ╦ ╔╦╗ ╔═╗             ║
║   ║   ║   ╠═╣ ║ ║  ║║ ╠═              ║
║   ╚═╝ ╩═╝ ╩ ╩ ╚═╝ ═╩╝ ╚═╝             ║
║              ×2 TRACKER                  ║
╠══════════════════════════════════════════╣
║  📍 You: Europe/Istanbul (UTC+3)         ║
║  ── PROMO STATUS ──────────────────────  ║
║  ⚡ OFF-PEAK (2×)     ⏱  3h 24m left    ║
║  Next peak: 15:00 - 21:00 (your time)   ║
║  ░░░░████████████░░░░░░░░░░░░░░░░░░░░   ║
║  ── USAGE LIMITS ──────────────────────  ║
║  5h Window                               ║
║  [████████████░░░░░░░░] 62% remaining    ║
║  7d Window                               ║
║  [██████░░░░░░░░░░░░░░] 31% remaining   ║
╚══════════════════════════════════════════╝
```

## Features

- Promotion timer with peak/off-peak status and countdown
- Automatic timezone detection and conversion
- 5-hour and 7-day usage limit tracking
- Retro CRT terminal aesthetic with Claude's design language
- System tray icon with status colors
- Click-away dismissal
- Lightweight (~5MB, Tauri v2)

## Prerequisites

- macOS
- Claude Code (for `claude login` — provides the OAuth token)
- Rust
- Node.js 20+
- pnpm

## Installation

```bash
git clone https://github.com/your-username/claude-x2.git
cd claude-x2
pnpm install
pnpm tauri build
# Open the .dmg from src-tauri/target/release/bundle/dmg/
```

## How it works

- Reads Claude Code's OAuth token from macOS Keychain (read-only)
- Polls `api.anthropic.com/api/oauth/usage` every 60 seconds
- Calculates promotion windows using IANA timezone `America/Los_Angeles`
- Auto-detects user's timezone and converts peak hours to local time

## Tech stack

- **Tauri v2** — native macOS app shell
- **Rust** — Keychain access, system tray, background polling
- **React + TypeScript** — UI
- **Vite** — frontend build

## Contributing

PRs welcome. Please open an issue first for significant changes.

## License

MIT — see [LICENSE](LICENSE).
