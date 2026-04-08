# Your publishing checklist

Everything Claude could automate is already done. This checklist is the
set of steps that genuinely require your hands — your email, your wallet,
your Google account. Work top to bottom. Expect about an hour of active
work spread over a few days of waiting for Google's review.

---

## 1. Enable GitHub Pages for the privacy policy (2 minutes, $0)

The Chrome Web Store requires a live privacy policy URL. I wrote one for
you at `docs/privacy.html`. You just need to turn on GitHub Pages so
Google can actually see it.

1. Open <https://github.com/jtsilver123/Clippy/settings/pages>
2. Under **Source**, pick **Deploy from a branch**
3. Branch: `main`, folder: `/docs`
4. Click **Save**
5. Wait about 60 seconds. Then check that
   <https://jtsilver123.github.io/Clippy/privacy.html> loads.

If it loads, this step is done. If not, wait a minute and refresh —
GitHub Pages sometimes takes a few minutes on first publish.

---

## 2. Create the Gumroad product (10 minutes, $0)

Clippy charges $1 via Gumroad. Chrome Web Store doesn't accept payments
directly anymore, so Gumroad is the workaround.

1. Sign up at <https://gumroad.com> (free).
2. Click **Products → New product**.
3. **Type**: Digital product.
4. **Name**: `Clippy License Key`
5. **Price**: `$1`
6. **Description**: paste this block exactly:
   ```
   Unlock Clippy, the AI buddy that lives next to your cursor in Chrome. One-time purchase. After buying, you'll get a license key by email — paste it into Clippy's popup and click Activate.
   ```
7. In the **Content** area (what buyers see after purchase), paste this:
   ```
   Thanks! Your license key is in your Gumroad receipt email. Open Clippy in Chrome, paste the key into the "License key" field, and click Activate.
   ```
8. Scroll down and enable **Generate a license key for each buyer**. THIS
   IS REQUIRED — without it Gumroad won't email a key.
9. Click **Publish**.
10. Copy two things from the published product page:
    - **Product page URL** — looks like
      `https://yourname.gumroad.com/l/something`. You'll paste this as
      the buy URL.
    - **Product ID** — open the product → Settings → "Show advanced
      settings" → copy the **Product ID**. It's a base64 string ending
      in `==`, for example `kfdfheAnlmG1qTakDI7QBg==`. Gumroad's
      verification API requires this exact id (not the permalink), so
      you have to grab it manually.

---

## 3. Plug the Gumroad product into Clippy (1 minute)

Open `extension/config.js` in any text editor. Find these two lines near
the top:

```js
export const GUMROAD_PRODUCT_ID = "kfdfheAnlmG1qTakDI7QBg==";
export const GUMROAD_BUY_URL = "https://silverstream421.gumroad.com/l/snixl";
```

Replace `GUMROAD_PRODUCT_ID` with the Product ID from step 2 and
`GUMROAD_BUY_URL` with your product page URL. Save.

Then rebuild the ZIP so the Web Store submission picks up the change:

```bash
./scripts/build-zip.sh
```

The updated ZIP will land at `releases/clippy-1.0.0.zip`. That's the
file you'll upload to the Chrome Web Store in step 5.

---

## 4. Test Clippy on your own machine (10 minutes)

Before submitting to Google, load Clippy in your local Chrome and make
sure it actually works end-to-end.

1. Buy your own Gumroad product once so you have a real license key to
   test with. You can refund yourself afterwards from the Gumroad
   dashboard.
2. Open Chrome → `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked** and select the `extension/` folder in this
   repo (not the ZIP — the folder)
5. Clippy icon should appear in the toolbar. Click it.
6. Paste an Anthropic API key from
   <https://console.anthropic.com/settings/keys>. Click **Save API key**.
7. Paste the Gumroad license key you got in your receipt email.
   Click **Activate**. You should see "License activated."
8. Open any HTTPS web page (like <https://en.wikipedia.org/wiki/Main_Page>).
9. Press **Ctrl + Shift + Space** (or **⌘ + Shift + Space** on Mac).
10. Grant microphone permission when Chrome asks.
11. Talk to Clippy: ask what's on the page, or ask it to point at
    something. Verify you hear a voice, see the bubble update, and see
    the blue cursor move if you asked about a UI element.

**Known issues to not panic about:**
- Speech recognition doesn't work on HTTP-only pages or `file://` URLs.
  That's a Chrome Web Speech API limitation, not a Clippy bug.
- On `chrome://` pages Clippy silently does nothing — you can't inject
  scripts into those pages by design.
- The first time you use it, there may be a half-second delay before
  text-to-speech starts because Chrome is warming up the voices list.

If any of the core flow is broken, stop here and tell Claude so we can
fix it before submission.

---

## 5. Pay the Chrome Web Store developer fee (5 minutes, $5)

You only have to do this once per Google account, ever.

1. Go to <https://chrome.google.com/webstore/devconsole>
2. Log in with the Google account you want to own this extension
3. Pay the one-time **$5** registration fee

---

## 6. Submit Clippy to the Chrome Web Store (20 minutes, $0)

1. In the developer console, click **New item**
2. Upload `releases/clippy-1.0.0.zip`
3. Fill in every field using `STORE_LISTING.md` as your copy-paste source:
   - Name
   - Summary
   - Detailed description
   - Category
   - Language
   - Store icon (use `extension/icons/icon-128.png`)
   - Small promo tile (use `marketing/promo-tile-440x280.png`)
   - Marquee promo tile (use `marketing/marquee-1400x560.png`)
   - Screenshots (use all three files in `marketing/`)
4. For the **Privacy practices** section, answer every question exactly
   as listed in `STORE_LISTING.md` under "Privacy practices form".
5. For each permission, paste the corresponding justification from
   `STORE_LISTING.md` under "Justifications for permissions".
6. Privacy policy URL: `https://jtsilver123.github.io/Clippy/privacy.html`
7. Support email: your email address.
8. Click **Submit for review**.

Approval usually takes a few business days. Don't edit anything while
it's in review. Google will email you when it's approved (or rejected
with reasons, which are almost always easy to fix).

---

## 7. Share it once it's live

Once approved, Clippy shows up on a public Chrome Web Store URL. Share
the URL wherever you'd share a product: X, Reddit, Hacker News, Product
Hunt, Discord servers, wherever your audience hangs out.

---

## 8. Updates

When you want to ship a fix or new feature later:

1. Change `"version"` in `extension/manifest.json` (for example
   `1.0.0` → `1.0.1`). Chrome requires every submission to bump the
   version.
2. Run `./scripts/build-zip.sh` to build a new ZIP.
3. In the Chrome Web Store developer console, go to your Clippy item
   → **Package** → upload the new ZIP.
4. Click **Submit for review**.

---

## Troubleshooting common rejections

**"Missing minimum functionality"**: this rejection means the reviewer
couldn't test the extension because it's gated behind a license key. If
this happens, temporarily send the reviewer a free test license key in
the "Notes for reviewer" field. You can generate one from the Gumroad
product page (Settings → Generate free license).

**"Excessive permissions"**: if this happens, add the permission
justifications from `STORE_LISTING.md` to the notes for the reviewer.
They're already worded for reviewer consumption.

**"Privacy policy insufficient"**: make sure the URL in step 3 is
reachable and matches what's in the submission form. If reviewers say
the policy is missing disclosures, tell Claude what they said and we'll
update `docs/privacy.html`.

---

## What's already done (you don't need to touch)

For reference, these things are already handled and don't require any
of your time:

- Extension source code (polished, reviewed, 100% client-side)
- Manifest V3 configuration with minimal permissions
- Built release ZIP at `releases/clippy-1.0.0.zip`
- Marketing assets in `marketing/`
- Privacy policy at `docs/privacy.html` (ready to serve via GitHub Pages)
- Store listing copy in `STORE_LISTING.md`
- Landing page at `docs/index.html`
- Build script at `scripts/build-zip.sh`
