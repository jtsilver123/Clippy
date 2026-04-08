"""Generate the small promo tile (440x280) and marquee (1400x560) in
the same visual language as the icon and store screenshots.

Both tiles are saved as 24-bit RGB PNGs (no alpha) so they slot into
the Chrome Web Store dashboard with no extra processing.
"""

import os
from PIL import Image, ImageDraw

from _shared import (
    CLIPPY_BG_DEEP,
    CLIPPY_BLUE,
    CLIPPY_BLUE_LIGHT,
    CLIPPY_TEXT_DIM,
    CLIPPY_TEXT_PRIMARY,
    CLIPPY_TEXT_SECONDARY,
    draw_clippy_cursor,
    draw_radial_glow,
    draw_speech_bubble,
    load_font,
    measure_text_width,
    save_as_rgb_png,
)

OUTPUT_DIRECTORY = "/home/user/Clippy/marketing"


# ----- Small promo tile (440x280) --------------------------------------

def render_small_promo_tile():
    canvas_width, canvas_height = 440, 280
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (*CLIPPY_BG_DEEP, 255))

    canvas = draw_radial_glow(
        canvas, center_xy=(380, 220), radius_in_pixels=140,
        color_rgb=CLIPPY_BLUE, max_alpha=110, blur_radius=14,
    )

    draw = ImageDraw.Draw(canvas)

    # Big cursor in bottom right.
    canvas = draw_clippy_cursor(canvas, center_xy=(370, 200), scale_factor=3.0)

    draw_after = ImageDraw.Draw(canvas)

    title_font = load_font(56, prefer_bold=True)
    body_font = load_font(15)
    cta_font = load_font(13, prefer_bold=True)

    draw_after.text((28, 46), "Clippy", font=title_font, fill=CLIPPY_TEXT_PRIMARY)

    draw_after.text((28, 122), "Talk to your tab.", font=load_font(20, prefer_bold=True), fill=CLIPPY_BLUE_LIGHT)

    body_lines = [
        "An AI buddy that lives next to",
        "your cursor in Chrome. Sees the",
        "page, talks back, points at things.",
    ]
    for line_index, line_text in enumerate(body_lines):
        draw_after.text((28, 160 + line_index * 22), line_text, font=body_font, fill=CLIPPY_TEXT_SECONDARY)

    draw_after.text((28, 240), "$1 ONE-TIME · BYO API KEY", font=cta_font, fill=CLIPPY_BLUE_LIGHT)

    return canvas


# ----- Marquee tile (1400x560) -----------------------------------------

def render_marquee_tile():
    canvas_width, canvas_height = 1400, 560
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (*CLIPPY_BG_DEEP, 255))

    canvas = draw_radial_glow(
        canvas, center_xy=(1100, 200), radius_in_pixels=320,
        color_rgb=CLIPPY_BLUE, max_alpha=90, blur_radius=22,
    )
    canvas = draw_radial_glow(
        canvas, center_xy=(280, 460), radius_in_pixels=240,
        color_rgb=CLIPPY_BLUE, max_alpha=60, blur_radius=22,
    )

    draw = ImageDraw.Draw(canvas)

    title_font = load_font(108, prefer_bold=True)
    sub_font = load_font(34)
    smallprint_font = load_font(22)

    draw.text((80, 130), "Clippy", font=title_font, fill=CLIPPY_TEXT_PRIMARY)
    draw.text((80, 268), "An AI buddy that lives in", font=sub_font, fill=CLIPPY_TEXT_SECONDARY)
    draw.text((80, 314), "your browser.", font=sub_font, fill=CLIPPY_TEXT_SECONDARY)
    draw.text((80, 380), "Sees your tab. Talks back.", font=sub_font, fill=CLIPPY_TEXT_SECONDARY)
    draw.text((80, 426), "Points at things.", font=sub_font, fill=CLIPPY_TEXT_SECONDARY)
    draw.text(
        (80, 488),
        "Bring your own Anthropic or Gemini key. $1 one-time unlock.",
        font=smallprint_font,
        fill=CLIPPY_TEXT_DIM,
    )

    # Big cursor + bubble on the right.
    canvas = draw_clippy_cursor(canvas, center_xy=(1170, 170), scale_factor=6.0)
    bubble_font = load_font(28)
    canvas = draw_speech_bubble(
        canvas,
        bubble_top_left=(820, 280),
        bubble_size=(500, 150),
        body_text_lines=[
            "look at the top right —",
            "that's the publish button.",
        ],
        body_font=bubble_font,
    )

    return canvas


def main():
    os.makedirs(OUTPUT_DIRECTORY, exist_ok=True)

    promo_tile = render_small_promo_tile()
    save_as_rgb_png(
        promo_tile,
        os.path.join(OUTPUT_DIRECTORY, "promo-tile-440x280.png"),
        background_color=CLIPPY_BG_DEEP,
    )
    print("wrote promo-tile-440x280.png")

    marquee_tile = render_marquee_tile()
    save_as_rgb_png(
        marquee_tile,
        os.path.join(OUTPUT_DIRECTORY, "marquee-1400x560.png"),
        background_color=CLIPPY_BG_DEEP,
    )
    print("wrote marquee-1400x560.png")


if __name__ == "__main__":
    main()
