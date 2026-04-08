#!/usr/bin/env bash
# Build a single downloadable ZIP that contains every marketing asset
# the user needs to upload to the Chrome Web Store: the icon, the
# small promo tile, the marquee, and all five 1280x800 screenshots,
# plus a small README explaining where each file goes.
#
# Usage: ./scripts/build-marketing-bundle.sh
#
# Output: releases/clippy-marketing-assets.zip
#
# The user can download this single file from GitHub and upload its
# contents to the Web Store dashboard.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASES_DIR="$REPO_ROOT/releases"
TEMP_STAGING_DIR="$(mktemp -d)"

mkdir -p "$RELEASES_DIR"
mkdir -p "$TEMP_STAGING_DIR/clippy-marketing-assets/screenshots"
mkdir -p "$TEMP_STAGING_DIR/clippy-marketing-assets/tiles"
mkdir -p "$TEMP_STAGING_DIR/clippy-marketing-assets/icon"

# Icon (used for the listing icon as well as the toolbar)
cp "$REPO_ROOT/extension/icons/icon-128.png" "$TEMP_STAGING_DIR/clippy-marketing-assets/icon/"

# Promo tile + marquee
cp "$REPO_ROOT/marketing/promo-tile-440x280.png" "$TEMP_STAGING_DIR/clippy-marketing-assets/tiles/"
cp "$REPO_ROOT/marketing/marquee-1400x560.png"   "$TEMP_STAGING_DIR/clippy-marketing-assets/tiles/"

# Screenshots
cp "$REPO_ROOT/marketing/screenshot-1-hero.png"           "$TEMP_STAGING_DIR/clippy-marketing-assets/screenshots/"
cp "$REPO_ROOT/marketing/screenshot-2-overlay-demo.png"   "$TEMP_STAGING_DIR/clippy-marketing-assets/screenshots/"
cp "$REPO_ROOT/marketing/screenshot-3-pointing.png"       "$TEMP_STAGING_DIR/clippy-marketing-assets/screenshots/"
cp "$REPO_ROOT/marketing/screenshot-4-providers.png"      "$TEMP_STAGING_DIR/clippy-marketing-assets/screenshots/"
cp "$REPO_ROOT/marketing/screenshot-5-privacy.png"        "$TEMP_STAGING_DIR/clippy-marketing-assets/screenshots/"

# README explaining what's in the bundle and where each file goes
cp "$REPO_ROOT/marketing/README.txt" "$TEMP_STAGING_DIR/clippy-marketing-assets/README.txt"

OUTPUT_ZIP_PATH="$RELEASES_DIR/clippy-marketing-assets.zip"
rm -f "$OUTPUT_ZIP_PATH"

cd "$TEMP_STAGING_DIR"
zip -r -q -X "$OUTPUT_ZIP_PATH" clippy-marketing-assets

cd "$REPO_ROOT"
rm -rf "$TEMP_STAGING_DIR"

echo "wrote $OUTPUT_ZIP_PATH"
ls -lh "$OUTPUT_ZIP_PATH"
