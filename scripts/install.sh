#!/usr/bin/env bash
# Installs (or updates) Clippy into /Applications and launches it.
#
#   curl -fsSL https://raw.githubusercontent.com/jtsilver123/Clippy/main/scripts/install.sh | bash
#
# Downloading with curl skips the "downloaded from the internet" quarantine flag, so macOS
# opens Clippy without the "Apple could not verify" prompt (Clippy isn't notarized yet).
set -euo pipefail

URL="https://github.com/jtsilver123/Clippy/releases/download/latest-build/Clippy.zip"
DEST="/Applications"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading Clippy…"
curl -fsSL "$URL" -o "$TMP/Clippy.zip"
ditto -x -k "$TMP/Clippy.zip" "$TMP"

# Quit a running copy so it can be replaced.
osascript -e 'quit app "Clippy"' >/dev/null 2>&1 || true
pkill -x Clippy >/dev/null 2>&1 || true

if [[ -w "$DEST" ]]; then
  rm -rf "$DEST/Clippy.app"
  ditto "$TMP/Clippy.app" "$DEST/Clippy.app"
else
  echo "Installing to $DEST needs your password."
  sudo rm -rf "$DEST/Clippy.app"
  sudo ditto "$TMP/Clippy.app" "$DEST/Clippy.app"
fi
xattr -dr com.apple.quarantine "$DEST/Clippy.app" 2>/dev/null || true

open "$DEST/Clippy.app"
echo "Clippy is running. Look for the flame in your menu bar."
