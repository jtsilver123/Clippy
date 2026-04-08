"""Shared rendering helpers for Clippy marketing assets.

Everything in marketing/ + extension/icons/ is generated from these
helpers so colors, typography, and the cursor mark stay perfectly
consistent across the icon, screenshots, promo tile, and marquee.

All assets are rendered RGBA at supersampled resolution and then
downsampled to the target size. Anything saved to disk is converted to
RGB first to satisfy the Chrome Web Store's "no alpha" rule for store
screenshots, and so the icon background is solid (not transparent).
"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ----- Color palette --------------------------------------------------

CLIPPY_BG_DEEP = (10, 11, 14)             # near-black backgrounds
CLIPPY_BG_PANEL = (20, 22, 28)            # panels and cards
CLIPPY_BG_PANEL_ELEVATED = (26, 29, 37)   # raised cards
CLIPPY_BG_INPUT = (28, 31, 39)            # input fields
CLIPPY_BORDER = (38, 41, 50)              # subtle borders
CLIPPY_BORDER_STRONG = (53, 57, 69)       # hover borders

CLIPPY_TEXT_PRIMARY = (246, 247, 251)
CLIPPY_TEXT_SECONDARY = (170, 176, 187)
CLIPPY_TEXT_DIM = (106, 111, 122)

CLIPPY_BLUE = (66, 133, 244)
CLIPPY_BLUE_BRIGHT = (90, 150, 246)
CLIPPY_BLUE_LIGHT = (126, 174, 251)
CLIPPY_BLUE_DARK = (31, 111, 214)
CLIPPY_BLUE_DEEPEST = (16, 64, 130)

CLIPPY_SUCCESS_GREEN = (109, 213, 140)
CLIPPY_WARNING_YELLOW = (245, 198, 93)
CLIPPY_ANTHROPIC_CORAL = (224, 137, 100)


# ----- Fonts ----------------------------------------------------------

FONT_CANDIDATES_REGULAR = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]
FONT_CANDIDATES_BOLD = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def load_font(target_pixel_size, prefer_bold=False):
    """Find a usable system TTF for the requested pixel size."""
    candidates = FONT_CANDIDATES_BOLD if prefer_bold else FONT_CANDIDATES_REGULAR
    fallbacks = candidates + (FONT_CANDIDATES_REGULAR if prefer_bold else FONT_CANDIDATES_BOLD)
    for candidate_path in fallbacks:
        if os.path.exists(candidate_path):
            try:
                return ImageFont.truetype(candidate_path, target_pixel_size)
            except OSError:
                continue
    return ImageFont.load_default()


def measure_text_width(image_draw, text, font):
    bbox = image_draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


# ----- Drawing helpers ------------------------------------------------

def draw_rounded_rectangle(image_draw, bounding_box, corner_radius, fill, outline=None, outline_width=0):
    image_draw.rounded_rectangle(
        bounding_box,
        radius=corner_radius,
        fill=fill,
        outline=outline,
        width=outline_width,
    )


def draw_radial_glow(base_image, center_xy, radius_in_pixels, color_rgb, max_alpha=70, blur_radius=14):
    """Stamp a soft radial glow onto an RGBA base image. Returns the
    composited image."""
    glow_layer = Image.new("RGBA", base_image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    rings = 10
    for ring_index in range(rings):
        ring_alpha = int(max_alpha * (1 - ring_index / rings))
        ring_radius = int(radius_in_pixels * (0.5 + ring_index * 0.1))
        glow_draw.ellipse(
            [
                center_xy[0] - ring_radius,
                center_xy[1] - ring_radius,
                center_xy[0] + ring_radius,
                center_xy[1] + ring_radius,
            ],
            fill=(*color_rgb, ring_alpha),
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    return Image.alpha_composite(base_image, glow_layer)


def draw_clippy_cursor(image, center_xy, scale_factor):
    """Draw the Clippy cursor (blue gradient triangle, white outline) on
    an RGBA image at the given center, with scale 1.0 ≈ 40px wide.

    Returns the composited image (call sites should reassign).
    """
    cx, cy = center_xy
    s = scale_factor

    # Cursor triangle vertex offsets (from center). Tuned by eye to look
    # like a friendly arrow leaning slightly down-right.
    triangle_offsets = [
        (-15, -22),
        (+22, +4),
        (-2, +6),
        (-9, +22),
    ]
    triangle_points = [(cx + ox * s, cy + oy * s) for (ox, oy) in triangle_offsets]

    # Render onto its own layer so we can fake a gradient by stacking two
    # fills with offset, then add a white stroke.
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)

    # Base dark blue fill.
    layer_draw.polygon(triangle_points, fill=(*CLIPPY_BLUE_DARK, 255))

    # Lighter highlight inset toward upper-left for a faux gradient.
    inset_amount = max(1, int(2 * s))
    highlight_points = [(x - inset_amount, y - inset_amount) for (x, y) in triangle_points]
    highlight_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight_layer)
    highlight_draw.polygon(highlight_points, fill=(*CLIPPY_BLUE_BRIGHT, 220))
    layer = Image.alpha_composite(layer, highlight_layer)

    # White outline so the cursor reads on any background.
    outline_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    outline_draw = ImageDraw.Draw(outline_layer)
    outline_width = max(2, int(2.4 * s))
    outline_draw.line(
        triangle_points + [triangle_points[0]],
        fill=(255, 255, 255, 240),
        width=outline_width,
        joint="curve",
    )
    layer = Image.alpha_composite(layer, outline_layer)

    return Image.alpha_composite(image, layer)


def draw_speech_bubble(
    image,
    bubble_top_left,
    bubble_size,
    body_text_lines,
    body_font,
    text_color=CLIPPY_TEXT_PRIMARY,
    bubble_fill=(18, 18, 22, 245),
    bubble_border=(255, 255, 255, 35),
):
    """Draw a Clippy speech bubble (rounded dark rectangle, faint border,
    multi-line body text) onto an RGBA image."""
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)
    left, top = bubble_top_left
    width, height = bubble_size
    layer_draw.rounded_rectangle(
        (left, top, left + width, top + height),
        radius=22,
        fill=bubble_fill,
        outline=bubble_border,
        width=2,
    )
    text_padding_x = 28
    text_padding_y = 26
    line_spacing = body_font.size + 10
    for line_index, line_text in enumerate(body_text_lines):
        layer_draw.text(
            (left + text_padding_x, top + text_padding_y + line_index * line_spacing),
            line_text,
            font=body_font,
            fill=text_color,
        )
    return Image.alpha_composite(image, layer)


def make_supersampled_canvas(target_width, target_height, supersample_factor=2):
    return Image.new(
        "RGBA",
        (target_width * supersample_factor, target_height * supersample_factor),
        (0, 0, 0, 0),
    ), supersample_factor


def downsample_to_target(image, target_width, target_height):
    return image.resize((target_width, target_height), Image.LANCZOS)


def save_as_rgb_png(image_rgba, output_path, background_color=CLIPPY_BG_DEEP):
    """Flatten the alpha channel onto a solid background and save as
    24-bit RGB PNG. The Chrome Web Store rejects PNGs with alpha for
    store screenshots."""
    background = Image.new("RGB", image_rgba.size, background_color)
    background.paste(image_rgba, mask=image_rgba.split()[-1] if image_rgba.mode == "RGBA" else None)
    background.save(output_path, "PNG", optimize=True)
