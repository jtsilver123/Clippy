#!/usr/bin/env bash
# Builds Cooked.app (menu bar only, ad-hoc signed) into ./build.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${VERSION:-0.1.0}"
swift build -c release --product Cooked
BIN="$(swift build -c release --show-bin-path)/Cooked"

APP="build/Cooked.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/Cooked"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>Cooked</string>
    <key>CFBundleDisplayName</key><string>Cooked</string>
    <key>CFBundleIdentifier</key><string>app.cooked.Cooked</string>
    <key>CFBundleExecutable</key><string>Cooked</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>${VERSION}</string>
    <key>CFBundleVersion</key><string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key><string>13.0</string>
    <key>LSUIElement</key><true/>
    <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

codesign --force --deep --sign - "$APP"
(cd build && rm -f Cooked.zip && ditto -c -k --keepParent Cooked.app Cooked.zip)
echo "Built $APP"
