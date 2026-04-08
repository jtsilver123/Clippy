Clippy marketing assets — quick reference
==========================================

These files are everything you need to upload to the Chrome Web Store
developer dashboard. Every PNG here is 24-bit RGB (no alpha) at the
exact dimensions Google requires, so you can upload them as-is.

Where each file goes in the developer dashboard:
-------------------------------------------------

Store icon (128x128, required)
    extension/icons/icon-128.png
    Used as the listing's main square icon and in Chrome's toolbar.

Small promotional tile (440x280, required)
    promo-tile-440x280.png
    Shown in store listings and recommendations.

Marquee promotional tile (1400x560, optional but high visibility)
    marquee-1400x560.png
    Shown if Google features your extension on the storefront.

Store screenshots (1280x800, at least one required, up to five total)
    screenshot-1-hero.png             — brand hero
    screenshot-2-overlay-demo.png     — cursor + bubble in context
    screenshot-3-pointing.png         — element pointing feature
    screenshot-4-providers.png        — Anthropic + Gemini (free)
    screenshot-5-privacy.png          — zero servers / BYOK / $1

Notes:
------

- All store screenshots are 1280x800 RGB. They flatten any blue glow
  effects onto a solid dark background so they pass the "no alpha"
  requirement.
- The marquee and promo tile use the same visual language as the
  screenshots so the listing looks cohesive in carousels.
- The icon is rendered fresh from a 4x supersampled master at 16, 32,
  48, and 128 px so it stays crisp at every Chrome toolbar density.

Need to regenerate?
-------------------

The Python source for everything is in the repo at scripts/marketing/
(once you commit it). Re-run with:

    python3 scripts/marketing/make_icon.py
    python3 scripts/marketing/make_screenshots.py
    python3 scripts/marketing/make_tiles.py
