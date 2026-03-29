# Contributing to Burnmeter

Thanks for your interest in contributing. This guide will help you get started.

## Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- Platform-specific Tauri v2 dependencies -- see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

## Setup

```sh
git clone https://github.com/nicholasgriffintn/claude-x2.git
cd claude-x2
pnpm install
pnpm tauri dev
```

## Project Structure

| Path | Description |
| --- | --- |
| `src/` | React + TypeScript frontend |
| `src-tauri/` | Rust backend (Tauri commands, system tray, state) |
| `.github/workflows/` | CI and release workflows |

## Submitting a Pull Request

1. Fork the repository and create a branch from `main`.
2. Make your changes.
3. Run `pnpm test` to verify nothing is broken.
4. Open a pull request against `main` and fill out the PR template.

Keep pull requests focused on a single change. If your PR addresses an open issue, reference it in the description (e.g. `Closes #42`).

## Code Style

- Frontend: follow the existing TypeScript/React conventions in `src/`.
- Backend: run `cargo fmt` and `cargo clippy` before committing Rust changes.
- Run `pnpm test` before submitting.

## Questions?

Open a thread in [GitHub Discussions](https://github.com/nicholasgriffintn/claude-x2/discussions) if you have questions or want to discuss an idea before writing code.
