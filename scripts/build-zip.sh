#!/usr/bin/env bash
# Build a release ZIP of the Clippy Chrome extension. The output is the ZIP
# you upload to the Chrome Web Store developer dashboard.
#
# Usage: ./scripts/build-zip.sh
#
# The ZIP is written to releases/clippy-<version>.zip where <version> comes
# from extension/manifest.json. manifest.json must be at the top level of the
# ZIP (not nested in a folder), or the Chrome Web Store will reject it.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_DIR="$REPO_ROOT/extension"
RELEASES_DIR="$REPO_ROOT/releases"

if [ ! -f "$EXTENSION_DIR/manifest.json" ]; then
  echo "error: extension/manifest.json not found" >&2
  exit 1
fi

VERSION_STRING="$(grep -o '"version"[^,]*' "$EXTENSION_DIR/manifest.json" | head -1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')"

if [ -z "$VERSION_STRING" ]; then
  echo "error: could not parse version from manifest.json" >&2
  exit 1
fi

mkdir -p "$RELEASES_DIR"

OUTPUT_ZIP_PATH="$RELEASES_DIR/clippy-$VERSION_STRING.zip"
rm -f "$OUTPUT_ZIP_PATH"

cd "$EXTENSION_DIR"

# Strip macOS junk before zipping so reviewers don't see .DS_Store, etc.
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete

# Zip from inside extension/ so manifest.json sits at the root of the archive.
zip -r -q -X "$OUTPUT_ZIP_PATH" . \
  -x "*.DS_Store" \
  -x "*Thumbs.db" \
  -x "*.swp"

cd "$REPO_ROOT"

echo "wrote $OUTPUT_ZIP_PATH"
ls -lh "$OUTPUT_ZIP_PATH"
