"""Generate the Clippy extension icon at 16/32/48/128 px.

Design notes
------------
The 128px master is rendered at 4x supersampling (512px) and then
downsampled with LANCZOS for crisp edges. Smaller sizes are produced by
downsampling the same master. The cursor sits inside a 96x96 visual
safe area centered in the 128x128 canvas — this matches Chrome Web Store
icon conventions and keeps the cursor from getting clipped when Chrome
tightens the corner radius for the toolbar.

Each icon is saved as a 24-bit RGB PNG (no alpha) so the background is
solid in every context Chrome shows it.
"""

import os
from PIL import Image, ImageDraw

from _shared import (
    CLIPPY_BG_DEEP,
    CLIPPY_BG_PANEL_ELEVATED,
    CLIPPY_BLUE,
    CLIPPY_BLUE_BRIGHT,
    CLIPPY_BLUE_DARK,
    draw_clippy_cursor,
    draw_radial_glow,
    save_as_rgb_png,
)


OUTPUT_DIRECTORY = "/home/user/Clippy/extension/icons"


def render_master_icon_at_canvas_size(canvas_size_in_pixels):
    """Render the icon at the given canvas size. Used to produce both
    the master 128px file and to render extra-large for downsampling."""
    canvas = Image.new("RGBA", (canvas_size_in_pixels, canvas_size_in_pixels), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Background tile: rounded square with a soft blue gradient using
    # two stacked fills.
    corner_radius = int(canvas_size_in_pixels * 0.22)
    draw.rounded_rectangle(
        (0, 0, canvas_size_in_pixels - 1, canvas_size_in_pixels - 1),
        radius=corner_radius,
        fill=CLIPPY_BG_DEEP,
    )

    # Subtle highlight overlay across the top half (faux gradient).
    highlight_overlay = Image.new("RGBA", (canvas_size_in_pixels, canvas_size_in_pixels), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight_overlay)
    highlight_draw.rounded_rectangle(
        (0, 0, canvas_size_in_pixels - 1, canvas_size_in_pixels - 1),
        radius=corner_radius,
        fill=(*CLIPPY_BG_PANEL_ELEVATED, 100),
    )
    # Knock out the bottom half of the highlight by drawing a hard rect over it.
    highlight_draw.rectangle(
        (0, int(canvas_size_in_pixels * 0.55), canvas_size_in_pixels, canvas_size_in_pixels),
        fill=(0, 0, 0, 0),
    )
    canvas = Image.alpha_composite(canvas, highlight_overlay)

    # Soft blue glow centered slightly above the cursor so the cursor
    # appears to be backlit.
    canvas = draw_radial_glow(
        canvas,
        center_xy=(canvas_size_in_pixels // 2, int(canvas_size_in_pixels * 0.42)),
        radius_in_pixels=int(canvas_size_in_pixels * 0.32),
        color_rgb=CLIPPY_BLUE,
        max_alpha=110,
        blur_radius=int(canvas_size_in_pixels * 0.05),
    )

    # Draw the cursor centered. Scale ≈ 1.0 ≈ 40px wide cursor; we want
    # the cursor to occupy roughly 60-65% of the canvas, so scale ~1.7
    # for 128px master.
    cursor_scale = canvas_size_in_pixels / 128 * 2.0
    canvas = draw_clippy_cursor(
        canvas,
        center_xy=(canvas_size_in_pixels // 2, canvas_size_in_pixels // 2),
        scale_factor=cursor_scale,
    )

    # Subtle inner border so the rounded square reads on white-ish
    # toolbars.
    border_layer = Image.new("RGBA", (canvas_size_in_pixels, canvas_size_in_pixels), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_layer)
    border_draw.rounded_rectangle(
        (0, 0, canvas_size_in_pixels - 1, canvas_size_in_pixels - 1),
        radius=corner_radius,
        outline=(*CLIPPY_BLUE, 70),
        width=max(2, canvas_size_in_pixels // 64),
    )
    canvas = Image.alpha_composite(canvas, border_layer)

    return canvas


def main():
    os.makedirs(OUTPUT_DIRECTORY, exist_ok=True)

    # Render at 4x the largest target (128 * 4 = 512) once, then
    # downsample to each requested size for crisp output across all
    # toolbar densities.
    master_size = 512
    master_image = render_master_icon_at_canvas_size(master_size)

    for target_size in (16, 32, 48, 128):
        downsampled = master_image.resize((target_size, target_size), Image.LANCZOS)
        output_path = os.path.join(OUTPUT_DIRECTORY, f"icon-{target_size}.png")
        save_as_rgb_png(downsampled, output_path, background_color=CLIPPY_BG_DEEP)
        print(f"wrote {output_path}")


if __name__ == "__main__":
    main()
