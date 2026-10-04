#!/usr/bin/env python3
"""Renders Clippy's app icon: a flame cooking under a Dynamic Island pill.

    pip install pillow numpy
    python3 scripts/make-icon.py      # writes Resources/AppIcon.icns and Resources/AppIcon.png
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 1024          # canvas
SS = 4            # supersampling for shapes drawn with Pillow
OUT = Path(__file__).resolve().parent.parent / "Resources"

yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) + 0.5


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def over(dst, color, alpha):
    """Composite a solid color (or per-pixel color array) with per-pixel alpha onto dst (RGBA float)."""
    a = alpha[..., None]
    rgb = color if color.ndim == 3 else color[None, None, :]
    dst[..., :3] = rgb * a + dst[..., :3] * (1 - a)
    dst[..., 3:] = a + dst[..., 3:] * (1 - a)


def bezier(p0, p1, p2, p3, n=60):
    t = np.linspace(0, 1, n)[:, None]
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3


def flame_points(cx, bottom, w, h):
    """A slightly asymmetric flame, as a closed polygon in canvas coordinates."""
    P = lambda x, y: np.array([cx + (x - 0.5) * w, bottom - (1 - y) * h])
    tip = P(0.56, 0.0)
    segments = [
        (tip, P(0.66, 0.20), P(1.02, 0.34), P(1.0, 0.63)),
        (P(1.0, 0.63), P(0.98, 0.87), P(0.77, 1.0), P(0.5, 1.0)),
        (P(0.5, 1.0), P(0.23, 1.0), P(0.0, 0.87), P(0.0, 0.62)),
        (P(0.0, 0.62), P(-0.01, 0.42), P(0.16, 0.33), P(0.24, 0.24)),
        (P(0.24, 0.24), P(0.26, 0.36), P(0.33, 0.43), P(0.38, 0.45)),
        (P(0.38, 0.45), P(0.36, 0.28), P(0.44, 0.12), tip),
    ]
    return np.concatenate([bezier(*seg) for seg in segments])


def polygon_mask(points, blur=0.0):
    img = Image.new("L", (S * SS, S * SS), 0)
    ImageDraw.Draw(img).polygon([tuple(p * SS) for p in points], fill=255)
    img = img.resize((S, S), Image.LANCZOS)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(img, np.float32) / 255


def capsule_mask(cx, cy, w, h):
    # Signed distance to a horizontal capsule, antialiased over ~1px.
    r = h / 2
    dx = np.maximum(np.abs(xx - cx) - (w / 2 - r), 0)
    d = np.sqrt(dx ** 2 + (yy - cy) ** 2) - r
    return 1 - smoothstep(-0.75, 0.75, d)


img = np.zeros((S, S, 4), np.float32)

# 1. Squircle body on Apple's icon grid (824pt body, 100pt margin).
body, margin = 824, 100
n = 5.0
u = np.abs((xx - S / 2) / (body / 2))
v = np.abs((yy - S / 2) / (body / 2))
f = u ** n + v ** n
squircle = 1 - smoothstep(1 - 0.006, 1 + 0.006, f)

# Drop shadow beneath the body.
shadow = Image.fromarray((squircle * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))
shadow = np.roll(np.asarray(shadow, np.float32) / 255, 14, axis=0) * 0.45
over(img, hex_rgb("#000000"), shadow)

# Background: warm charcoal, lighter at the top.
t = ((yy - margin) / body)[..., None]
bg = hex_rgb("#33221b") * (1 - t) + hex_rgb("#110b09") * t
over(img, bg, squircle)

# Ember glow rising from where the flame sits.
glow = np.exp(-(((xx - 512) / 300) ** 2 + ((yy - 690) / 230) ** 2)) * 0.55
over(img, hex_rgb("#ff6a1f"), glow * squircle)

# 2. Flame: outer body, then a hot inner core.
cx, bottom = 512, 812
outer = flame_points(cx, bottom, 360, 470)
inner = flame_points(cx + 6, bottom - 6, 196, 270)

halo = polygon_mask(outer, blur=26) * 0.75
over(img, hex_rgb("#ff7a2a"), halo * squircle)

t = smoothstep(bottom - 470, bottom, yy)[..., None]
outer_fill = hex_rgb("#ff4d2e") * (1 - t) + hex_rgb("#ff9a3c") * t
over(img, outer_fill, polygon_mask(outer))

t = smoothstep(bottom - 270, bottom, yy)[..., None]
inner_fill = hex_rgb("#ffc24a") * (1 - t) + hex_rgb("#fff3c4") * t
over(img, inner_fill, polygon_mask(inner))

# 3. The island: a black pill near the top with a live "done" dot.
pill_cx, pill_cy, pill_w, pill_h = 512, 222, 430, 112
pill_shadow = Image.fromarray((capsule_mask(pill_cx, pill_cy + 10, pill_w, pill_h) * 255).astype(np.uint8))
pill_shadow = np.asarray(pill_shadow.filter(ImageFilter.GaussianBlur(14)), np.float32) / 255 * 0.6
over(img, hex_rgb("#000000"), pill_shadow * squircle)
over(img, hex_rgb("#050505"), capsule_mask(pill_cx, pill_cy, pill_w, pill_h))
# Faint rim light along the pill's top edge.
rim = capsule_mask(pill_cx, pill_cy, pill_w, pill_h) - capsule_mask(pill_cx, pill_cy + 3, pill_w - 4, pill_h - 2)
over(img, hex_rgb("#ffffff"), np.clip(rim, 0, 1) * 0.18 * (yy < pill_cy))

# Left: a tiny ember. Right: a green "done" dot with its own glow.
dot = lambda x, y, r: 1 - smoothstep(r - 0.8, r + 0.8, np.sqrt((xx - x) ** 2 + (yy - y) ** 2))
over(img, hex_rgb("#ff8a3d"), dot(pill_cx - pill_w / 2 + 62, pill_cy, 17))
green_glow = np.exp(-(((xx - (pill_cx + pill_w / 2 - 62)) ** 2 + (yy - pill_cy) ** 2) / (2 * 26 ** 2))) * 0.7
over(img, hex_rgb("#34d26b"), green_glow * capsule_mask(pill_cx, pill_cy, pill_w, pill_h))
over(img, hex_rgb("#3ee07a"), dot(pill_cx + pill_w / 2 - 62, pill_cy, 19))

# 4. A subtle glassy sheen across the top of the body.
sheen = smoothstep(560, 100, yy) * 0.06
over(img, hex_rgb("#ffffff"), sheen * squircle)

# Keep everything inside the squircle except the shadow.
final = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGBA")

OUT.mkdir(exist_ok=True)
final.save(OUT / "AppIcon.png")
final.save(OUT / "AppIcon.icns", sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
print("wrote", OUT / "AppIcon.icns")
