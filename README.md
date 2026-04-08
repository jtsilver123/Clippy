# Clippy

An AI teacher that lives next to your cursor — inside your browser. It
can see the tab you're looking at, talk to you, and even fly a little blue
cursor over to the thing it's explaining.

Clippy is a Chrome extension port of [farzaa/clicky](https://github.com/farzaa/clicky),
the open-source macOS menu bar companion. The original is a native Mac app
with a Cloudflare Worker proxy, AssemblyAI streaming transcription, and
ElevenLabs TTS. Clippy takes the same idea and ships it as a zero-backend
Chrome extension that runs entirely in the user's browser.

## How this version is different from the original

| | Original Clicky (Mac) | Clippy (Chrome extension) |
|---|---|---|
| Platform | macOS menu bar app | Chrome/Chromium extension (MV3) |
| Screen capture | ScreenCaptureKit (full screen) | `chrome.tabs.captureVisibleTab` (current tab) |
| Speech-to-text | AssemblyAI (paid, via proxy) | Built-in Web Speech API (free, in-browser) |
| Text-to-speech | ElevenLabs (paid, via proxy) | Built-in `speechSynthesis` (free, in-browser) |
| API key storage | Cloudflare Worker proxy | `chrome.storage.local` — bring your own |
| Backend | Cloudflare Worker | **None.** 100% client-side. |
| Monetization | Free | $1 one-time Gumroad license |

The result: you can ship Clippy to the Chrome Web Store without running
any servers, without paying for AssemblyAI or ElevenLabs, and users pay
for their own Claude usage via their own Anthropic API key.

## Project structure

```
Clippy/
├── extension/              The Chrome extension source
│   ├── manifest.json       MV3 manifest
│   ├── background.js       Service worker: Claude calls, screenshots, license verify
│   ├── content.js          Cursor overlay + push-to-talk running inside each tab
│   ├── popup.html          Settings popup (API key, license, model)
│   ├── popup.css
│   ├── popup.js
│   ├── config.js           The only file non-coders need to edit
│   ├── lib/
│   │   ├── claude.js       Streaming Claude API client
│   │   ├── gumroad.js      License key verification
│   │   ├── pointing.js     Parses [POINT:x,y:label] tags from Claude
│   │   ├── prompt.js       System prompt (adapted from the Mac app)
│   │   └── storage.js      chrome.storage wrapper
│   └── icons/              16/32/48/128 px PNG icons
├── upstream/               Read-only reference copy of farzaa/clicky
├── PUBLISHING.md           Step-by-step publishing guide for non-coders
└── README.md               This file
```

## Quick start (for developers)

```bash
# 1. Open chrome://extensions
# 2. Turn on Developer mode (top right)
# 3. Click "Load unpacked" and select the extension/ folder
# 4. Click the Clippy icon in the toolbar
# 5. Paste your Anthropic API key (https://console.anthropic.com/settings/keys)
# 6. Paste a valid Gumroad license key for your configured product
# 7. Open any web page
# 8. Press Ctrl + Shift + Space and talk
```

If you don't have a Gumroad product set up yet, the "Buy" button won't
work, but you can still test the rest by temporarily editing
`extension/background.js` to bypass the license check during dev.

## Shipping it

See [PUBLISHING.md](./PUBLISHING.md) for the complete non-coder publishing
walkthrough: creating the Gumroad product, plugging in the permalink,
packaging the extension, and submitting it to the Chrome Web Store.

## Credits

- Original Clicky by [@farzatv](https://x.com/farzatv) —
  <https://github.com/farzaa/clicky>. Clippy reuses the system prompt
  approach, the `[POINT:x,y:label]` protocol, and the blue-triangle-cursor
  visual identity.
- Built by [Claude Code](https://claude.com/claude-code).

## License

MIT. See the upstream project's `LICENSE` for the original Clicky terms;
this port inherits them for anything derived from the original.
