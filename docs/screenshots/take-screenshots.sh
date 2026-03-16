#!/bin/bash
# Script to take screenshots of the Burnmeter app for the GitHub README.
# Run this manually: bash "docs/screenshots/take-screenshots.sh"

set -e

SCREENSHOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DMG="$(cd "$(dirname "$0")/../../src-tauri/target/release/bundle/dmg" && pwd)/Burnmeter_0.1.0_aarch64.dmg"

echo "Screenshot directory: $SCREENSHOT_DIR"
echo "DMG path: $APP_DMG"

# Step 1: Kill any running instance
echo ">>> Killing existing Burnmeter instances..."
pkill -f "claude-x2-tracker" 2>/dev/null || true
pkill -f "Burnmeter" 2>/dev/null || true
sleep 1

# Step 2: Mount DMG and launch app
echo ">>> Mounting DMG..."
hdiutil detach "/Volumes/Burnmeter" 2>/dev/null || true
hdiutil attach "$APP_DMG" -nobrowse
sleep 2

echo ">>> Launching Burnmeter..."
open "/Volumes/Burnmeter/Burnmeter.app"
sleep 5

echo ">>> App should now be running in the menu bar."
echo ""
echo "=== INSTRUCTIONS ==="
echo "1. The app should now be visible in the menu bar (top-right area)."
echo "2. Screenshots will be taken automatically in 3 seconds..."
sleep 3

# Step 3: Take menu bar screenshot (right side where tray icons live)
echo ">>> Taking menu bar screenshot..."
screencapture -x -R 800,0,800,40 "$SCREENSHOT_DIR/menubar-tray.png"
echo "    Saved: menubar-tray.png"

# Step 4: Take full menu bar screenshot
echo ">>> Taking full menu bar screenshot..."
screencapture -x -R 0,0,1600,40 "$SCREENSHOT_DIR/menubar.png"
echo "    Saved: menubar.png"

# Step 5: Now click the tray icon to open the popover
echo ""
echo "=== ACTION REQUIRED ==="
echo "Please CLICK the Burnmeter tray icon in the menu bar to open the popover."
echo "Press ENTER when the popover is visible..."
read -r

# Step 6: Take full screen screenshot showing the popover
echo ">>> Taking full screen screenshot with popover..."
screencapture -x "$SCREENSHOT_DIR/full-screen.png"
echo "    Saved: full-screen.png"

# Step 7: Take a focused screenshot of just the popover area (top-right)
echo ">>> Taking popover area screenshot..."
screencapture -x -R 600,0,1000,800 "$SCREENSHOT_DIR/popover.png"
echo "    Saved: popover.png"

# Step 8: Use screencapture interactive mode for a manual selection of just the popover
echo ""
echo "=== OPTIONAL ==="
echo "You can now take a manual selection screenshot of just the popover window."
echo "A crosshair cursor will appear - drag to select the popover area."
echo "Press ENTER to start (or Ctrl+C to skip)..."
read -r

screencapture -x -i "$SCREENSHOT_DIR/popover-cropped.png"
echo "    Saved: popover-cropped.png"

echo ""
echo "=== DONE ==="
echo "Screenshots saved to: $SCREENSHOT_DIR"
ls -la "$SCREENSHOT_DIR"/*.png 2>/dev/null
