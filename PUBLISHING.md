# Publishing Clippy to the Chrome Web Store

This guide is for someone who doesn't write code. Follow the steps exactly
and you'll end up with Clippy live on the Chrome Web Store, collecting $1
per user through Gumroad.

Estimated cost to publish:
- Chrome Web Store: one-time **$5** developer fee
- Gumroad: **free** (they take a small cut of each $1 sale)
- Hosting/servers: **$0** (Clippy is 100% client-side — there's no backend)

## How Clippy makes money

Chrome Web Store no longer lets extensions take payments directly, so we
use **Gumroad**. Here's the flow from a user's perspective:

1. They install Clippy from the Chrome Web Store (free install).
2. They open the extension and see a "Buy for $1" button.
3. That button takes them to your Gumroad product page.
4. They pay $1, and Gumroad emails them a license key.
5. They paste the license key back into Clippy's popup and click "Activate".
6. Clippy calls Gumroad's verify API to confirm the key is real, then
   unlocks forever on that browser.

They also need to paste their own **Anthropic API key** — this is how Clippy
talks to Claude. Anthropic gives new users free credits to start with, and
any usage after that is billed directly to the user, not to you. **You never
touch their API keys, and you never pay for their Claude usage.**

## Step 1: Create the Gumroad product

1. Go to <https://gumroad.com> and sign up for a free account.
2. In the Gumroad dashboard, click **Products → New product**.
3. Pick **Digital product**.
4. Set:
   - **Name**: `Clippy License Key`
   - **Price**: `$1`
   - **Description**: "Unlock Clippy, the AI buddy that lives next to your
     cursor in Chrome. One-time purchase."
5. In the content area (what buyers get), just type: "Thanks! Your license
   key is in your Gumroad receipt email. Paste it into Clippy's popup and
   click Activate."
6. Scroll down to **Additional features** and turn on **Generate
   license keys**. This is the important part — without it Gumroad won't
   send buyers a key.
7. Click **Publish**.

Your product now has a public URL that looks like this:

```
https://yourname.gumroad.com/l/something
```

You also need your **Product ID**, which is different from the URL.
Open the product on Gumroad → Settings → click **Show advanced
settings** → copy the value labeled **Product ID**. It looks like a
base64 string ending in `==`, for example `kfdfheAnlmG1qTakDI7QBg==`.
You need this because Gumroad's license verification API requires the
Product ID, not the URL slug. Write down both the URL and the Product
ID — you'll need them in Step 2.

## Step 2: Plug your Gumroad product into Clippy

1. Open `extension/config.js` in any text editor (even Notepad or TextEdit
   is fine).
2. Find these two lines near the top:

   ```js
   export const GUMROAD_PRODUCT_ID = "kfdfheAnlmG1qTakDI7QBg==";
   export const GUMROAD_BUY_URL = "https://silverstream421.gumroad.com/l/snixl";
   ```

3. Replace `GUMROAD_PRODUCT_ID` with the Product ID you copied in Step 1.
4. Replace `GUMROAD_BUY_URL` with your full product page URL.
5. Save the file. That's the only code change you need to make.

## Step 3: Test Clippy locally before publishing

1. Buy your own product once on Gumroad so you have a real license key to
   test with (you can refund yourself after).
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top right toggle).
4. Click **Load unpacked** and pick the `extension/` folder in this repo.
5. Clippy should appear in your toolbar. Click it.
6. Paste your Anthropic API key (get one at
   <https://console.anthropic.com/settings/keys>).
7. Paste your Gumroad license key and click **Activate**. It should say
   "License activated."
8. Open any web page, press **Ctrl + Shift + E** (or
   **⌘ + Shift + E** on Mac), and talk to Clippy. It should answer out
   loud and, when appropriate, animate a blue cursor toward the thing it's
   pointing at.

If all that works, you're ready to publish.

## Step 4: Package the extension

1. Make sure the `extension/` folder contains only the files Clippy needs —
   no `.DS_Store` or other junk. (If you're on Mac, run `find extension -name
   .DS_Store -delete` in Terminal first.)
2. In Finder / File Explorer, compress the `extension/` folder into a ZIP
   file. The ZIP should contain `manifest.json` at the top level (not nested
   inside another folder).

## Step 5: Submit to the Chrome Web Store

1. Go to <https://chrome.google.com/webstore/devconsole>.
2. Pay the one-time **$5 developer fee** if you haven't already.
3. Click **New item** and upload the ZIP from Step 4.
4. Fill in the store listing:
   - **Name**: Clippy
   - **Summary**: "An AI teacher that lives next to your cursor. It sees
     your tab, talks back, and points at things."
   - **Category**: Productivity
   - **Language**: English
5. Upload screenshots (1280x800 is the recommended size). Take these by
   running Clippy on a real web page.
6. Upload a promotional tile (440x280). The `extension/icons/icon-128.png`
   can be a starting point — just scale it up or have a friend design one.
7. In **Privacy practices**, be honest and check:
   - "Collects personally identifiable information" → **No**
   - "Collects location" → **No**
   - Justify every permission the extension requests:
     - `activeTab` / `tabs` / `scripting`: needed to capture a screenshot
       of the visible page and draw the Clippy overlay on top of it.
     - `storage`: needed to remember the user's Anthropic API key and
       license key between browser restarts.
     - `host_permissions` for `api.anthropic.com`: needed to send the user's
       voice transcript and screenshot to Claude.
     - `host_permissions` for `api.gumroad.com`: needed to verify the user's
       license key.
8. Paste a privacy policy URL. Clippy's is extremely simple — you can host
   a Gist on GitHub or use a free service like GitHub Pages. A good
   template:

   > Clippy stores your Anthropic API key and Gumroad license key locally in
   > your browser using `chrome.storage.local`. The API key is only sent to
   > `api.anthropic.com`. The license key is only sent to `api.gumroad.com`
   > for verification. Clippy does not collect, transmit, or store any
   > personal information on any server we operate. There is no backend.

9. Submit for review.

Approval usually takes a few business days. Don't change anything while
it's in review.

## Step 6: Go live

Once Google approves it, Clippy shows up on the store. Share the store
link anywhere you'd share a product: X, Reddit, Hacker News, Product Hunt,
etc.

When you want to ship an update:

1. Bump the `"version"` field in `extension/manifest.json` (for example
   `1.0.0` → `1.0.1`).
2. Re-zip the `extension/` folder.
3. Upload the new ZIP in the developer console under **Package**.
4. Submit for review again.

## If something goes wrong

- **"Couldn't reach Gumroad"** in the popup: you're offline, or you typed
  the Product ID wrong. Double-check `extension/config.js`.
- **"License key not accepted"**: the license was refunded, the
  Product ID doesn't match the product the key was bought from, or the
  buyer copy-pasted with extra spaces.
- **"The 'product_id' parameter is required"**: you used a permalink
  instead of the Product ID. Open your Gumroad product → Settings →
  Show advanced settings → copy the Product ID and paste it into
  `GUMROAD_PRODUCT_ID` in `extension/config.js`.
- **"Speech recognition error: not-allowed"**: the user hasn't granted
  microphone permission to Chrome. Open `chrome://settings/content/microphone`.
- **The cursor doesn't move**: the Claude response didn't include a
  `[POINT:...]` tag. This is normal for general questions. The cursor only
  flies to a point when the answer is about something visible on the page.
- **Chrome rejected the submission for "excessive permissions"**: Clippy
  uses the minimum set. If rejected, include the permission justifications
  from Step 5 in your reviewer notes.

## FAQ

**Can I charge more than $1?**
Yes. Change the price on Gumroad. No code change needed — the popup reads
"Buy for $1" but you can also edit that string in `extension/popup.html`
and `extension/lib/gumroad.js` if you want to rename it to "Buy for $5"
or similar.

**Can I use a different payment processor (Stripe, LemonSqueezy)?**
Yes, but you'll need someone to write a small bit of code. Gumroad was
picked because its license verification is a single public HTTP call with
no backend required. If you switch, you'll need to replace
`extension/lib/gumroad.js`.

**What if a user installs Clippy on a new computer?**
They paste the same license key into the popup on the new computer. A
Gumroad license works on unlimited devices by default — if you want to
limit that, flip `increment_uses_count` to `"true"` in
`extension/lib/gumroad.js` and add a max-uses check.

**How do I give someone Clippy for free?**
Gumroad lets you mark certain sales as free (price `$0`) or generate
promo codes. The extension doesn't care how the key was purchased — if
Gumroad says it's valid, Clippy unlocks.
