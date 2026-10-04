#!/usr/bin/env bash
# Builds Clippy.app (menu bar only, ad-hoc signed) into ./build.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${VERSION:-0.1.0}"
# Universal binary (Apple Silicon + Intel). Set ARCHS="" to build for this Mac only.
ARCH_FLAGS=()
for arch in ${ARCHS-arm64 x86_64}; do ARCH_FLAGS+=(--arch "$arch"); done
swift build -c release --product Clippy "${ARCH_FLAGS[@]}"
BIN="$(swift build -c release "${ARCH_FLAGS[@]}" --show-bin-path)/Clippy"

APP="build/Clippy.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/Clippy"
cp Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>Clippy</string>
    <key>CFBundleDisplayName</key><string>Clippy</string>
    <key>CFBundleIdentifier</key><string>app.clippy.Clippy</string>
    <key>CFBundleExecutable</key><string>Clippy</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleIconFile</key><string>AppIcon</string>
    <key>CFBundleShortVersionString</key><string>${VERSION}</string>
    <key>CFBundleVersion</key><string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key><string>13.0</string>
    <key>LSUIElement</key><true/>
    <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

codesign --force --deep --sign - "$APP"
(cd build && rm -f Clippy.zip && ditto -c -k --keepParent Clippy.app Clippy.zip)
echo "Built $APP"
