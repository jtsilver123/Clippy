# Chrome Web Store listing copy

Copy-paste the blocks below into the Chrome Web Store developer dashboard
when you submit Clippy. Every field the dashboard asks for is written out
here so you don't have to think about wording.

Dashboard: <https://chrome.google.com/webstore/devconsole>

---

## Name

```
Clippy — AI buddy next to your cursor
```

(Max 50 characters. This one is 40.)

---

## Summary

```
An AI teacher that sees your tab, talks back, and points at things. Bring your own Claude or Gemini key.
```

(Max 132 characters.)

---

## Category

```
Productivity
```

---

## Language

```
English (United States)
```

---

## Detailed description

```
Clippy is a friendly AI buddy that lives next to your cursor inside Chrome. Press a shortcut, talk out loud, and Clippy sees your current tab, answers you in a real voice, and flies a little blue cursor over to the exact thing it's explaining.

Think of it as having a teacher sitting next to you while you browse.

HOW IT WORKS
• Press Ctrl + Shift + E (or Cmd + Shift + E on Mac) on any web page.
• Talk to Clippy. Ask what something on the page means, how to do a thing, where a button is, anything.
• Clippy answers out loud using Claude and the browser's built-in text-to-speech.
• If the answer is about something on the page, Clippy flies a blue cursor over to it and highlights it.

BRING YOUR OWN API KEY — TWO OPTIONS
Clippy lets you choose between two AI providers in the popup:

• Anthropic Claude (Sonnet 4.6 / Opus 4.6) — highest quality. Requires API credit on your Anthropic developer account, separate from any claude.ai subscription. Get a key at https://console.anthropic.com/settings/keys.

• Google Gemini (2.5 Flash / 2.5 Pro) — free for everyone. Free tier of 1,500 requests per day on Gemini Flash with vision support, no card required. Get a key at https://aistudio.google.com/app/apikey.

Either way, your API key lives in your browser, never on a server, and is only sent to the provider you picked.

ONE-TIME $1 UNLOCK
Clippy itself is a one-time $1 purchase to unlock the extension. Buy a license on Gumroad, paste the key into Clippy's popup, and you're done. No subscriptions. No recurring charges.

PRIVACY (THE SHORT VERSION)
Clippy has no backend. There is no server to phone home to.
• Your API key and license key live in your browser's local storage and never leave your computer except to the two places you'd expect: Anthropic (to answer you) and Gumroad (to verify your license).
• Clippy never reads any page in the background. It only captures a screenshot when you press the shortcut and actively talk to it.
• No analytics, no tracking, no ad IDs, no cookies.

Full privacy policy: https://jtsilver123.github.io/Clippy/privacy.html

WHAT CLIPPY IS GREAT FOR
• Learning something new on the fly without leaving the page
• Navigating unfamiliar web apps ("where do I publish this post?")
• Getting quick explanations of code, math, forms, or jargon
• Writing help that can see what you're writing
• Research and brainstorming with a buddy that actually sees your screen

REQUIREMENTS
• Chrome 116 or newer (or any Chromium-based browser with Web Speech API support)
• An Anthropic API key (free to create, small pay-as-you-go usage charges from Anthropic)
• A $1 Clippy license from Gumroad
• A working microphone
• Most web pages work, but speech recognition only works on HTTPS pages (Chrome requirement)

OPEN SOURCE
Clippy is open source. The full code is on GitHub:
https://github.com/jtsilver123/Clippy

Clippy is inspired by Clicky, the open-source macOS menu bar companion by @farzatv. This is a Chrome extension reimagining of the same idea with a zero-backend architecture suited for the browser.

QUESTIONS OR BUG REPORTS
Open an issue on GitHub: https://github.com/jtsilver123/Clippy/issues
```

(Max 16,000 characters. This one is around 2,800.)

---

## Single purpose description

```
Clippy lets you talk to Claude about the web page you're currently looking at. When you press a shortcut, Clippy captures a screenshot of the visible tab, sends your spoken question plus that screenshot to the Anthropic API using your own API key, and speaks Claude's answer aloud while optionally animating a visual cursor to the element Claude is referring to.
```

---

## Justifications for permissions

### activeTab

```
activeTab is used to capture a PNG screenshot of the user's currently visible tab at the exact moment they press the push-to-talk shortcut. The screenshot is sent directly from the user's browser to api.anthropic.com along with their spoken question so Claude can answer in context. Clippy does not access the tab at any other time.
```

### tabs

```
tabs is used to identify which tab is active so that chrome.tabs.captureVisibleTab can screenshot the correct window, and to send the streamed Claude response back to the content script in that specific tab. Clippy does not read tab URLs or titles beyond the current active tab.
```

### scripting

```
scripting is used to inject the Clippy overlay (a small blue cursor and a response bubble rendered inside a Shadow DOM) onto the user's current tab when they press the push-to-talk shortcut. The overlay is purely visual and does not read, modify, or submit any page content.
```

### storage

```
storage is used to persist three things on the user's local machine so they don't have to re-enter them every session: (1) the user's Anthropic API key, (2) the user's Gumroad license key, (3) the user's selected Claude model and preferences. Nothing in storage is ever sent anywhere except back to Anthropic (api key) and Gumroad (license key).
```

### Host permission: api.anthropic.com

```
When the user picks "Anthropic Claude" as their AI provider in Clippy's popup, Clippy sends the user's spoken transcript and a PNG screenshot of the current tab directly to the Anthropic Messages API, authenticated with the user's own API key. This is one of two AI providers the user can choose between.
```

### Host permission: generativelanguage.googleapis.com

```
When the user picks "Google Gemini" as their AI provider in Clippy's popup, Clippy sends the user's spoken transcript and a PNG screenshot of the current tab directly to the Google Gemini API, authenticated with the user's own Google AI Studio API key. This is one of two AI providers the user can choose between.
```

### Host permission: api.gumroad.com

```
Clippy calls Gumroad's public license verification endpoint exactly once per activation, to confirm that the user's pasted license key corresponds to a valid purchase of the Clippy product on Gumroad. No other data is sent to Gumroad.
```

### Why remote code is not used

```
Clippy does not execute any remote code. All JavaScript in the extension ships in the submitted package. Network requests go only to api.anthropic.com (for the Claude API) and api.gumroad.com (for license verification), and the responses are treated strictly as JSON or streamed text — never evaluated as code.
```

---

## Privacy practices form

All of the following are **No**:

- Personally identifiable information — **No**
- Health information — **No**
- Financial and payment information — **No**
- Authentication information — **No**
- Personal communications — **No**
- Location — **No**
- Web history — **No**
- User activity — **No**
- Website content — **No** (Clippy sends screenshots to Anthropic, but only at the moment the user explicitly invokes push-to-talk, and only to the API the user configured with their own key. The extension itself does not collect or store any page content.)

Certification checkboxes (tick all):

- I do not sell or share user data to third parties outside of the approved use cases
- I do not use or transfer user data for purposes unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Privacy policy URL

```
https://jtsilver123.github.io/Clippy/privacy.html
```

(This URL will be live automatically once you enable GitHub Pages on the
repository. See CHECKLIST.md step 3.)

---

## Store listing images

Upload the files from the `marketing/` folder in the repo:

| Field | File | Dimensions |
|---|---|---|
| Icon | `extension/icons/icon-128.png` | 128x128 |
| Small promo tile (required) | `marketing/promo-tile-440x280.png` | 440x280 |
| Marquee promo tile (optional) | `marketing/marquee-1400x560.png` | 1400x560 |
| Screenshot 1 | `marketing/screenshot-1-overlay.png` | 1280x800 |
| Screenshot 2 | `marketing/screenshot-2-popup.png` | 1280x800 |
| Screenshot 3 | `marketing/screenshot-3-features.png` | 1280x800 |

---

## Support email

Use your own email address — whichever one you want to receive support
emails from Clippy users at. The Chrome Web Store requires this.

---

## Website (optional)

```
https://github.com/jtsilver123/Clippy
```
