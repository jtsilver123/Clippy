"""Generate the 5 Chrome Web Store screenshots for Clippy.

Output: marketing/screenshot-{1..5}-*.png
Each: 1280x800, 24-bit RGB, no alpha (Chrome Web Store requirement).

Screens:
  1. Hero — big brand statement
  2. Overlay demo — cursor + bubble on a generic-looking docs page
  3. Pointing — shows the cursor flying to a specific UI element
  4. Two providers — Anthropic Claude + Google Gemini (free tier)
  5. Privacy — zero servers, BYOK, $1 unlock

All page mockups use generic placeholder content (no real brand names,
no real logos) so the screenshots don't depend on third-party trademarks.
"""

import os
from PIL import Image, ImageDraw

from _shared import (
    CLIPPY_ANTHROPIC_CORAL,
    CLIPPY_BG_DEEP,
    CLIPPY_BG_INPUT,
    CLIPPY_BG_PANEL,
    CLIPPY_BG_PANEL_ELEVATED,
    CLIPPY_BLUE,
    CLIPPY_BLUE_BRIGHT,
    CLIPPY_BLUE_DARK,
    CLIPPY_BLUE_LIGHT,
    CLIPPY_BORDER,
    CLIPPY_BORDER_STRONG,
    CLIPPY_SUCCESS_GREEN,
    CLIPPY_TEXT_DIM,
    CLIPPY_TEXT_PRIMARY,
    CLIPPY_TEXT_SECONDARY,
    draw_clippy_cursor,
    draw_radial_glow,
    draw_rounded_rectangle,
    draw_speech_bubble,
    load_font,
    measure_text_width,
    save_as_rgb_png,
)

SCREENSHOT_OUTPUT_DIRECTORY = "/home/user/Clippy/marketing"
SCREENSHOT_WIDTH_IN_PIXELS = 1280
SCREENSHOT_HEIGHT_IN_PIXELS = 800


def fresh_canvas(background_color=CLIPPY_BG_DEEP):
    return Image.new(
        "RGBA",
        (SCREENSHOT_WIDTH_IN_PIXELS, SCREENSHOT_HEIGHT_IN_PIXELS),
        (*background_color, 255),
    )


# ----- Screenshot 1: Hero ----------------------------------------------

def render_screenshot_hero():
    canvas = fresh_canvas(CLIPPY_BG_DEEP)

    # Two soft blue glow blobs for a subtle aurora effect.
    canvas = draw_radial_glow(
        canvas, center_xy=(960, 220), radius_in_pixels=320,
        color_rgb=CLIPPY_BLUE, max_alpha=85, blur_radius=18,
    )
    canvas = draw_radial_glow(
        canvas, center_xy=(280, 620), radius_in_pixels=260,
        color_rgb=CLIPPY_BLUE_DEEPEST if False else CLIPPY_BLUE_DARK,
        max_alpha=75, blur_radius=22,
    )

    draw = ImageDraw.Draw(canvas)

    # Eyebrow badge.
    eyebrow_font = load_font(20, prefer_bold=True)
    eyebrow_text = "$1 ONE-TIME · BRING YOUR OWN KEY · NO SERVERS"
    eyebrow_width = measure_text_width(draw, eyebrow_text, eyebrow_font)
    draw_rounded_rectangle(
        draw,
        (640 - eyebrow_width // 2 - 22, 152, 640 + eyebrow_width // 2 + 22, 196),
        corner_radius=22,
        fill=(*CLIPPY_BLUE, 50),
        outline=(*CLIPPY_BLUE_LIGHT, 200),
        outline_width=2,
    )
    draw.text(
        (640 - eyebrow_width // 2, 162),
        eyebrow_text,
        font=eyebrow_font,
        fill=CLIPPY_BLUE_LIGHT,
    )

    # Massive title — two lines, centered.
    title_font = load_font(132, prefer_bold=True)
    line_one = "Talk to your tab."
    line_one_width = measure_text_width(draw, line_one, title_font)
    draw.text(
        (640 - line_one_width // 2, 240),
        line_one,
        font=title_font,
        fill=CLIPPY_TEXT_PRIMARY,
    )

    # Tagline below the title.
    tagline_font = load_font(34)
    tagline_text = "An AI buddy that lives next to your cursor in Chrome."
    tagline_width = measure_text_width(draw, tagline_text, tagline_font)
    draw.text(
        (640 - tagline_width // 2, 410),
        tagline_text,
        font=tagline_font,
        fill=CLIPPY_TEXT_SECONDARY,
    )
    tagline_two = "Sees what you see. Talks back. Points at things."
    tagline_two_width = measure_text_width(draw, tagline_two, tagline_font)
    draw.text(
        (640 - tagline_two_width // 2, 458),
        tagline_two,
        font=tagline_font,
        fill=CLIPPY_TEXT_SECONDARY,
    )

    # Big cursor flourish in the lower area, with a bubble that mirrors
    # the call-to-action.
    canvas = draw_radial_glow(
        canvas, center_xy=(820, 620), radius_in_pixels=110,
        color_rgb=CLIPPY_BLUE, max_alpha=170, blur_radius=14,
    )
    canvas = draw_clippy_cursor(canvas, center_xy=(820, 620), scale_factor=4.6)

    bubble_body_font = load_font(28)
    canvas = draw_speech_bubble(
        canvas,
        bubble_top_left=(870, 600),
        bubble_size=(360, 90),
        body_text_lines=["see this button right here?"],
        body_font=bubble_body_font,
    )

    # Footer-ish hint about the keyboard shortcut.
    shortcut_hint_font = load_font(20)
    draw_after_glow = ImageDraw.Draw(canvas)
    draw_after_glow.text(
        (60, 740),
        "Press Ctrl + Shift + E and start talking.",
        font=shortcut_hint_font,
        fill=CLIPPY_TEXT_DIM,
    )
    draw_after_glow.text(
        (1090, 740),
        "v1.2 · MV3",
        font=shortcut_hint_font,
        fill=CLIPPY_TEXT_DIM,
    )

    return canvas


# ----- Screenshot 2: Overlay demo --------------------------------------
#
# A generic-looking docs page (no real brand) with the Clippy cursor
# and bubble overlaid, like a real screenshot of the extension running.

def render_screenshot_overlay_demo():
    # Light page background, dark cursor + bubble overlay.
    canvas = fresh_canvas((247, 248, 251))
    draw = ImageDraw.Draw(canvas)

    # ----- Browser chrome -----
    chrome_height = 56
    draw.rectangle((0, 0, SCREENSHOT_WIDTH_IN_PIXELS, chrome_height), fill=(232, 234, 240))
    # Window dots
    for dot_index, dot_color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse((20 + dot_index * 24, 18, 36 + dot_index * 24, 34), fill=dot_color)
    # Address bar
    draw_rounded_rectangle(
        draw, (130, 14, SCREENSHOT_WIDTH_IN_PIXELS - 200, 42),
        corner_radius=14, fill=(255, 255, 255),
        outline=(220, 222, 230), outline_width=1,
    )
    url_font = load_font(15)
    draw.text((148, 21), "docs.acme.dev/quickstart", font=url_font, fill=(120, 124, 132))
    # Action icons placeholder
    for icon_index in range(2):
        draw.ellipse(
            (SCREENSHOT_WIDTH_IN_PIXELS - 170 + icon_index * 36, 18,
             SCREENSHOT_WIDTH_IN_PIXELS - 154 + icon_index * 36, 34),
            outline=(170, 174, 184), width=2,
        )

    # Faux sidebar nav
    draw.rectangle((0, chrome_height, 240, SCREENSHOT_HEIGHT_IN_PIXELS), fill=(243, 244, 248))
    sidebar_label_font = load_font(13, prefer_bold=True)
    sidebar_item_font = load_font(15)
    draw.text((28, 88), "GUIDES", font=sidebar_label_font, fill=(140, 144, 154))
    sidebar_items = [
        ("Quickstart", True),
        ("Installation", False),
        ("Authentication", False),
        ("Your first project", False),
        ("Inviting teammates", False),
        ("Going to production", False),
    ]
    for index, (label, is_active) in enumerate(sidebar_items):
        item_top = 124 + index * 38
        if is_active:
            draw_rounded_rectangle(
                draw, (16, item_top - 6, 224, item_top + 26),
                corner_radius=8, fill=(231, 237, 252),
            )
            text_color = (66, 110, 200)
        else:
            text_color = (60, 64, 76)
        draw.text((28, item_top), label, font=sidebar_item_font, fill=text_color)

    # Main content
    h1_font = load_font(54, prefer_bold=True)
    body_font = load_font(20)
    draw.text((310, 110), "Quickstart", font=h1_font, fill=(28, 30, 38))
    draw.text(
        (310, 184),
        "Get your first project running in under five minutes.",
        font=body_font,
        fill=(110, 114, 124),
    )

    # CTA button — this is what the cursor will point at.
    cta_button_box = (310, 240, 510, 296)
    draw_rounded_rectangle(
        draw, cta_button_box, corner_radius=14,
        fill=CLIPPY_BLUE,
    )
    cta_font = load_font(20, prefer_bold=True)
    cta_text = "Create project"
    cta_text_width = measure_text_width(draw, cta_text, cta_font)
    draw.text(
        (cta_button_box[0] + (cta_button_box[2] - cta_button_box[0]) // 2 - cta_text_width // 2,
         cta_button_box[1] + 18),
        cta_text,
        font=cta_font,
        fill=(255, 255, 255),
    )
    # Secondary button
    secondary_button_box = (530, 240, 720, 296)
    draw_rounded_rectangle(
        draw, secondary_button_box, corner_radius=14,
        fill=(255, 255, 255),
        outline=(204, 208, 218), outline_width=2,
    )
    secondary_text = "Read the docs"
    secondary_text_width = measure_text_width(draw, secondary_text, cta_font)
    draw.text(
        (secondary_button_box[0] + (secondary_button_box[2] - secondary_button_box[0]) // 2 - secondary_text_width // 2,
         secondary_button_box[1] + 18),
        secondary_text,
        font=cta_font,
        fill=(60, 64, 76),
    )

    # Body paragraphs
    body_paragraph_lines = [
        "Step 1.  Create an account using the button above.",
        "Step 2.  Verify your email — we'll send you a link.",
        "Step 3.  Add your first project from the dashboard.",
        "Step 4.  Invite teammates from project settings.",
        "Step 5.  Ship something. We're excited to have you.",
    ]
    body_paragraph_font = load_font(18)
    for line_index, paragraph_line in enumerate(body_paragraph_lines):
        draw.text(
            (310, 360 + line_index * 36),
            paragraph_line,
            font=body_paragraph_font,
            fill=(100, 104, 114),
        )

    # ----- Clippy overlay -----
    # Cursor + highlight ring on the "Create project" button.
    target_x = cta_button_box[0] + 36
    target_y = cta_button_box[1] + 28

    canvas = draw_radial_glow(
        canvas,
        center_xy=(target_x, target_y),
        radius_in_pixels=66,
        color_rgb=CLIPPY_BLUE,
        max_alpha=160,
        blur_radius=14,
    )

    overlay_draw = ImageDraw.Draw(canvas)
    overlay_draw.ellipse(
        (target_x - 38, target_y - 38, target_x + 38, target_y + 38),
        outline=CLIPPY_BLUE,
        width=3,
    )

    canvas = draw_clippy_cursor(canvas, center_xy=(target_x, target_y), scale_factor=2.6)

    bubble_font = load_font(26)
    canvas = draw_speech_bubble(
        canvas,
        bubble_top_left=(360, 530),
        bubble_size=(720, 130),
        body_text_lines=[
            "click create project right here. you'll be",
            "asked to name it on the next screen.",
        ],
        body_font=bubble_font,
    )

    return canvas


# ----- Screenshot 3: Pointing demo -------------------------------------
#
# Side-by-side: a pretend toolbar with several similar buttons, with
# Clippy correctly identifying THE specific one and pointing at it.

def render_screenshot_pointing_demo():
    canvas = fresh_canvas(CLIPPY_BG_DEEP)

    canvas = draw_radial_glow(
        canvas, center_xy=(940, 240), radius_in_pixels=300,
        color_rgb=CLIPPY_BLUE, max_alpha=80, blur_radius=18,
    )

    draw = ImageDraw.Draw(canvas)

    # Headline on the left.
    title_font = load_font(72, prefer_bold=True)
    sub_font = load_font(26)
    draw.text((80, 170), "Doesn't just talk.", font=title_font, fill=CLIPPY_TEXT_PRIMARY)
    draw.text((80, 256), "Points.", font=title_font, fill=CLIPPY_BLUE_LIGHT)
    draw.text(
        (80, 360),
        "Clippy doesn't guess pixel coordinates.",
        font=sub_font,
        fill=CLIPPY_TEXT_SECONDARY,
    )
    draw.text(
        (80, 396),
        "It finds the actual element on the page",
        font=sub_font,
        fill=CLIPPY_TEXT_SECONDARY,
    )
    draw.text(
        (80, 432),
        "and flies the cursor straight to it.",
        font=sub_font,
        fill=CLIPPY_TEXT_SECONDARY,
    )

    # Bottom-left: small metadata strip.
    meta_font = load_font(18, prefer_bold=True)
    draw.text((80, 540), "WORKS ON ANY HTTPS PAGE", font=meta_font, fill=CLIPPY_TEXT_DIM)
    draw.text((80, 568), "ANY ELEMENT WITH TEXT OR ARIA-LABEL", font=meta_font, fill=CLIPPY_TEXT_DIM)
    draw.text((80, 596), "BOTH CLAUDE AND GEMINI", font=meta_font, fill=CLIPPY_TEXT_DIM)

    # Right side: a faux floating toolbar with several similar-looking
    # buttons. Clippy will land on the third one ("Publish").
    toolbar_left = 680
    toolbar_top = 200
    toolbar_width = 540
    toolbar_height = 380
    draw_rounded_rectangle(
        draw, (toolbar_left, toolbar_top, toolbar_left + toolbar_width, toolbar_top + toolbar_height),
        corner_radius=22,
        fill=CLIPPY_BG_PANEL,
        outline=CLIPPY_BORDER,
        outline_width=2,
    )

    toolbar_label_font = load_font(13, prefer_bold=True)
    draw.text((toolbar_left + 28, toolbar_top + 24), "EDITOR ACTIONS", font=toolbar_label_font, fill=CLIPPY_TEXT_DIM)

    button_labels = [
        ("Save draft", False),
        ("Preview", False),
        ("Publish", True),       # the target
        ("Delete", False),
    ]
    button_font = load_font(20, prefer_bold=True)
    button_top = toolbar_top + 70
    for index, (label, is_target) in enumerate(button_labels):
        button_box = (
            toolbar_left + 28,
            button_top + index * 70,
            toolbar_left + toolbar_width - 28,
            button_top + index * 70 + 54,
        )
        if is_target:
            fill = CLIPPY_BLUE
            outline = CLIPPY_BLUE_LIGHT
            text_color = (255, 255, 255)
        else:
            fill = CLIPPY_BG_INPUT
            outline = CLIPPY_BORDER_STRONG
            text_color = CLIPPY_TEXT_SECONDARY
        draw_rounded_rectangle(draw, button_box, corner_radius=12, fill=fill, outline=outline, outline_width=2)
        label_width = measure_text_width(draw, label, button_font)
        draw.text(
            (button_box[0] + (button_box[2] - button_box[0]) // 2 - label_width // 2,
             button_box[1] + 16),
            label,
            font=button_font,
            fill=text_color,
        )

    # Cursor + highlight ring on the Publish button.
    publish_button_box = (toolbar_left + 28, button_top + 2 * 70,
                          toolbar_left + toolbar_width - 28, button_top + 2 * 70 + 54)
    publish_center_x = (publish_button_box[0] + publish_button_box[2]) // 2 - 110
    publish_center_y = (publish_button_box[1] + publish_button_box[3]) // 2

    canvas = draw_radial_glow(
        canvas, center_xy=(publish_center_x, publish_center_y),
        radius_in_pixels=70, color_rgb=CLIPPY_BLUE,
        max_alpha=160, blur_radius=14,
    )
    overlay_draw = ImageDraw.Draw(canvas)
    overlay_draw.ellipse(
        (publish_center_x - 36, publish_center_y - 36,
         publish_center_x + 36, publish_center_y + 36),
        outline=(255, 255, 255),
        width=3,
    )
    canvas = draw_clippy_cursor(canvas, center_xy=(publish_center_x, publish_center_y), scale_factor=2.4)

    # Bubble below the toolbar.
    bubble_font = load_font(24)
    canvas = draw_speech_bubble(
        canvas,
        bubble_top_left=(toolbar_left, toolbar_top + toolbar_height + 20),
        bubble_size=(toolbar_width, 90),
        body_text_lines=["that one — publish, third from the top."],
        body_font=bubble_font,
    )

    return canvas


# ----- Screenshot 4: Two providers -------------------------------------

def render_screenshot_providers():
    canvas = fresh_canvas(CLIPPY_BG_DEEP)

    canvas = draw_radial_glow(
        canvas, center_xy=(380, 250), radius_in_pixels=280,
        color_rgb=CLIPPY_ANTHROPIC_CORAL, max_alpha=55, blur_radius=22,
    )
    canvas = draw_radial_glow(
        canvas, center_xy=(900, 540), radius_in_pixels=320,
        color_rgb=CLIPPY_BLUE, max_alpha=85, blur_radius=22,
    )

    draw = ImageDraw.Draw(canvas)

    # Top headline.
    title_font = load_font(80, prefer_bold=True)
    sub_font = load_font(28)
    headline_text = "Two AIs. Your call."
    headline_width = measure_text_width(draw, headline_text, title_font)
    draw.text((640 - headline_width // 2, 80), headline_text, font=title_font, fill=CLIPPY_TEXT_PRIMARY)
    sub_text = "Premium quality with Claude, or completely free with Gemini."
    sub_width = measure_text_width(draw, sub_text, sub_font)
    draw.text((640 - sub_width // 2, 188), sub_text, font=sub_font, fill=CLIPPY_TEXT_SECONDARY)

    # Two big provider cards.
    card_width = 460
    card_height = 420
    cards_top = 280
    gap = 60
    total_cards_width = card_width * 2 + gap
    cards_left = (SCREENSHOT_WIDTH_IN_PIXELS - total_cards_width) // 2

    # Anthropic card on the left
    draw_provider_card(
        draw, canvas_for_blit=canvas,
        left=cards_left, top=cards_top, width=card_width, height=card_height,
        provider_name="Anthropic Claude",
        provider_tagline="Sonnet 4.6  ·  Opus 4.6",
        provider_description=("Top-tier vision and reasoning. "
                              "Pay-as-you-go on your Anthropic developer account."),
        accent_color=CLIPPY_ANTHROPIC_CORAL,
        badge_text=None,
    )
    # Gemini card on the right
    draw_provider_card(
        draw, canvas_for_blit=canvas,
        left=cards_left + card_width + gap, top=cards_top, width=card_width, height=card_height,
        provider_name="Google Gemini",
        provider_tagline="2.5 Flash  ·  2.5 Pro",
        provider_description=("Free tier: 1,500 requests per day on Flash. "
                              "No credit card required. Get a key in 30 seconds."),
        accent_color=CLIPPY_BLUE,
        badge_text="FREE",
    )

    # Bottom hint
    hint_font = load_font(20)
    hint_text = "Pick one or both. Switch any time from the popup."
    hint_width = measure_text_width(draw, hint_text, hint_font)
    draw.text((640 - hint_width // 2, 730), hint_text, font=hint_font, fill=CLIPPY_TEXT_DIM)

    return canvas


def draw_provider_card(
    draw, canvas_for_blit, left, top, width, height,
    provider_name, provider_tagline, provider_description, accent_color, badge_text,
):
    draw_rounded_rectangle(
        draw,
        (left, top, left + width, top + height),
        corner_radius=24,
        fill=CLIPPY_BG_PANEL,
        outline=CLIPPY_BORDER_STRONG,
        outline_width=2,
    )

    # Accent ring at the top
    draw.rectangle((left + 24, top + 24, left + 48, top + 28), fill=accent_color)

    # Big icon mark — a circle with a stylized glyph.
    icon_radius = 56
    icon_center_x = left + width // 2
    icon_center_y = top + 130
    draw.ellipse(
        (icon_center_x - icon_radius, icon_center_y - icon_radius,
         icon_center_x + icon_radius, icon_center_y + icon_radius),
        fill=(*accent_color, 60),
        outline=accent_color,
        width=3,
    )

    name_font = load_font(34, prefer_bold=True)
    name_width = measure_text_width(draw, provider_name, name_font)
    draw.text(
        (left + width // 2 - name_width // 2, top + 220),
        provider_name,
        font=name_font,
        fill=CLIPPY_TEXT_PRIMARY,
    )

    tagline_font = load_font(18)
    tagline_width = measure_text_width(draw, provider_tagline, tagline_font)
    draw.text(
        (left + width // 2 - tagline_width // 2, top + 268),
        provider_tagline,
        font=tagline_font,
        fill=CLIPPY_TEXT_DIM,
    )

    description_font = load_font(20)
    # Wrap manually to fit
    description_lines = wrap_text_to_pixel_width(
        draw, provider_description, description_font, width - 60
    )
    description_top = top + 320
    for line_index, line_text in enumerate(description_lines):
        line_width = measure_text_width(draw, line_text, description_font)
        draw.text(
            (left + width // 2 - line_width // 2, description_top + line_index * 28),
            line_text,
            font=description_font,
            fill=CLIPPY_TEXT_SECONDARY,
        )

    # FREE badge if requested.
    if badge_text:
        badge_font = load_font(16, prefer_bold=True)
        badge_text_width = measure_text_width(draw, badge_text, badge_font)
        badge_padding_x = 12
        badge_padding_y = 6
        badge_box = (
            left + width - 24 - badge_text_width - badge_padding_x * 2,
            top + 22,
            left + width - 24,
            top + 22 + 14 + badge_padding_y * 2 + 4,
        )
        draw_rounded_rectangle(
            draw, badge_box, corner_radius=8,
            fill=CLIPPY_SUCCESS_GREEN,
        )
        draw.text(
            (badge_box[0] + badge_padding_x, badge_box[1] + badge_padding_y),
            badge_text,
            font=badge_font,
            fill=(10, 11, 14),
        )


def wrap_text_to_pixel_width(draw, full_text, font, max_width_in_pixels):
    words = full_text.split()
    lines = []
    current_line_words = []
    for word in words:
        candidate_line = " ".join(current_line_words + [word])
        if measure_text_width(draw, candidate_line, font) <= max_width_in_pixels:
            current_line_words.append(word)
        else:
            if current_line_words:
                lines.append(" ".join(current_line_words))
            current_line_words = [word]
    if current_line_words:
        lines.append(" ".join(current_line_words))
    return lines


# ----- Screenshot 5: Privacy / trust -----------------------------------

def render_screenshot_privacy():
    canvas = fresh_canvas(CLIPPY_BG_DEEP)

    canvas = draw_radial_glow(
        canvas, center_xy=(640, 250), radius_in_pixels=380,
        color_rgb=CLIPPY_BLUE, max_alpha=70, blur_radius=24,
    )

    draw = ImageDraw.Draw(canvas)

    # Centered hero stack.
    title_font = load_font(96, prefer_bold=True)
    sub_font = load_font(30)
    line_one = "Zero servers."
    line_two = "Zero tracking."
    line_one_width = measure_text_width(draw, line_one, title_font)
    line_two_width = measure_text_width(draw, line_two, title_font)
    draw.text((640 - line_one_width // 2, 130), line_one, font=title_font, fill=CLIPPY_TEXT_PRIMARY)
    draw.text((640 - line_two_width // 2, 240), line_two, font=title_font, fill=CLIPPY_BLUE_LIGHT)

    sub_text = "Your API key lives in your browser. Nowhere else."
    sub_width = measure_text_width(draw, sub_text, sub_font)
    draw.text((640 - sub_width // 2, 372), sub_text, font=sub_font, fill=CLIPPY_TEXT_SECONDARY)

    # Three trust pillars in a row.
    pillar_top = 470
    pillar_width = 320
    pillar_height = 200
    pillar_gap = 40
    total_pillars_width = pillar_width * 3 + pillar_gap * 2
    pillars_left = (SCREENSHOT_WIDTH_IN_PIXELS - total_pillars_width) // 2

    pillars = [
        ("100% client-side",
         "Every request goes from your browser straight to the model — no Clippy server in between."),
        ("Bring your own key",
         "Your Anthropic or Gemini key is yours. We never see it, and you only ever pay your own provider."),
        ("$1 one-time unlock",
         "Pay once on Gumroad, paste the key, done. No subscriptions, no recurring bills."),
    ]

    pillar_title_font = load_font(22, prefer_bold=True)
    pillar_body_font = load_font(16)

    for pillar_index, (pillar_title, pillar_body) in enumerate(pillars):
        pillar_left = pillars_left + pillar_index * (pillar_width + pillar_gap)
        draw_rounded_rectangle(
            draw,
            (pillar_left, pillar_top, pillar_left + pillar_width, pillar_top + pillar_height),
            corner_radius=18,
            fill=CLIPPY_BG_PANEL,
            outline=CLIPPY_BORDER,
            outline_width=2,
        )
        # Small accent dot
        draw.ellipse(
            (pillar_left + 24, pillar_top + 24, pillar_left + 36, pillar_top + 36),
            fill=CLIPPY_BLUE,
        )
        draw.text(
            (pillar_left + 24, pillar_top + 56),
            pillar_title,
            font=pillar_title_font,
            fill=CLIPPY_TEXT_PRIMARY,
        )
        # Wrap body
        body_lines = wrap_text_to_pixel_width(
            draw, pillar_body, pillar_body_font, pillar_width - 48
        )
        for line_index, line_text in enumerate(body_lines):
            draw.text(
                (pillar_left + 24, pillar_top + 100 + line_index * 22),
                line_text,
                font=pillar_body_font,
                fill=CLIPPY_TEXT_SECONDARY,
            )

    # Footer credit
    footer_font = load_font(18)
    draw.text((60, 750), "Open source · github.com/jtsilver123/Clippy", font=footer_font, fill=CLIPPY_TEXT_DIM)

    return canvas


# ----- Main ------------------------------------------------------------

def main():
    os.makedirs(SCREENSHOT_OUTPUT_DIRECTORY, exist_ok=True)

    screenshot_specs = [
        ("screenshot-1-hero.png", render_screenshot_hero),
        ("screenshot-2-overlay-demo.png", render_screenshot_overlay_demo),
        ("screenshot-3-pointing.png", render_screenshot_pointing_demo),
        ("screenshot-4-providers.png", render_screenshot_providers),
        ("screenshot-5-privacy.png", render_screenshot_privacy),
    ]

    for filename, renderer in screenshot_specs:
        screenshot_image = renderer()
        output_path = os.path.join(SCREENSHOT_OUTPUT_DIRECTORY, filename)
        save_as_rgb_png(screenshot_image, output_path, background_color=CLIPPY_BG_DEEP)
        print(f"wrote {output_path}")


if __name__ == "__main__":
    main()
