#!/usr/bin/env python3
"""Candy Forest QR ghost posters: one tall Booha ghost per portrait A4 page.

Each ghost is drawn at 300 dpi with soft "vinyl toy" shading, Booha eyes, and a
huge QR code on a white tummy panel. Cut along the dark outline and laminate.

Usage:  python3 scripts/create_candy_ghost_posters.py            (real ghosts + jokers)
        python3 scripts/create_candy_ghost_posters.py --jokers   (jokers only)
Output: output/pdf/booha-candy-forest-ghosts-A4.pdf   (12 real ghosts)
        output/pdf/booha-candy-forest-jokers-A4.pdf   (6 joker ghosts)
        PNG previews in output/png/ghost-posters/
Needs:  pip install pillow numpy opencv-python qrcode
"""
from pathlib import Path
import sys
import numpy as np
import cv2
import qrcode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = ROOT / "output/pdf/booha-candy-forest-ghosts-A4.pdf"
OUT_JOKER_PDF = ROOT / "output/pdf/booha-candy-forest-jokers-A4.pdf"
OUT_PNG = ROOT / "output/png/ghost-posters"
BASE_URL = "https://booha-adventure-studios.github.io/booha-world/event.html?event=halloween-2026&ghost="

# Same ids and colors as events/events.js
GHOSTS = [
    ("red", "あか", "RED", "#ef5264"),
    ("pink", "ピンク", "PINK", "#ec82ae"),
    ("yellow", "きいろ", "YELLOW", "#f4cf45"),
    ("blue", "あお", "BLUE", "#4e9fe8"),
    ("light-blue", "みずいろ", "LIGHT BLUE", "#8ed1e9"),
    ("green", "みどり", "GREEN", "#58b96d"),
    ("light-green", "きみどり", "LIGHT GREEN", "#a8d65d"),
    ("black", "くろ", "BLACK", "#2c2d35"),
    ("white", "しろ", "WHITE", "#f2ede4"),
    ("orange", "オレンジ", "ORANGE", "#ee844d"),
    ("purple", "むらさき", "PURPLE", "#9a67d4"),
    ("brown", "ちゃいろ", "BROWN", "#9a6847"),
]

# Joker ghosts (same ids as events/events.js): misspelled name + a different eye tell each.
# (id, looks like, kana, English, left eye, right eye)
JOKERS = [
    ("pnik", "pink", "ピソク", "PNIK", "normal", "wink"),
    ("bleu", "blue", "おあ", "BLEU", "heart", "heart"),
    ("yelow", "yellow", "きいる", "YELOW", "big", "small"),
    ("ligth-green", "light-green", "きみとり", "LIGTH GREEN", "swirl", "swirl"),
    ("orenge", "orange", "オレソジ", "ORENGE", "sleepy", "sleepy"),
    ("wihte", "white", "レろ", "WIHTE", "noshine", "noshine"),
]

DPI = 300
MM = DPI / 25.4
W, H = round(210 * MM), round(297 * MM)          # 2480 x 3508
INK = (37, 16, 52)
FONT_CANDIDATES = [
    "/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
]


def font(size_px):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size_px)
            except OSError:
                continue
    return ImageFont.load_default()


def px(v):
    return round(v * MM)


def hex_rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)


def ghost_outline_points():
    """Tall Booha silhouette in mm (y down): round dome, gently flared sides, four skirt lobes."""
    pts = []
    cx, cy, rx, ry = 105, 92, 94, 84                    # dome
    for t in np.linspace(np.pi, 2 * np.pi, 160):         # left -> top -> right
        pts.append((cx + rx * np.cos(t), cy + ry * np.sin(t)))
    for y in np.linspace(92, 262, 60):                   # right side, flaring out
        k = (y - 92) / 170
        pts.append((199 + 4 * k * k, y))
    lobes = 4
    left, right = 7, 203
    lw = (right - left) / lobes
    for i in reversed(range(lobes)):                     # skirt, right to left
        lc = left + lw * (i + .5)
        for t in np.linspace(0, np.pi, 50):
            pts.append((lc + lw / 2 * np.cos(t), 262 + 27 * np.sin(t)))
    for y in np.linspace(262, 92, 60):                   # left side
        k = (y - 92) / 170
        pts.append((11 - 4 * k * k, y))
    return np.array(pts)


def body_mask():
    pts = (ghost_outline_points() * MM * 4).astype(np.int32)
    big = np.zeros((H * 4, W * 4), np.uint8)
    cv2.fillPoly(big, [pts], 255, lineType=cv2.LINE_AA)
    return cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def shade_body(mask, color_hex, ghost_id):
    """Inflated-vinyl lighting from a distance field, like the Booha render."""
    hard = (mask > .5).astype(np.uint8)
    dist = cv2.distanceTransform(hard, cv2.DIST_L2, 5)
    R = px(34)
    d = np.minimum(dist, R)
    height = np.sqrt(np.maximum(R * R - (R - d) ** 2, 0))
    height = cv2.GaussianBlur(height, (0, 0), px(3))
    gy, gx = np.gradient(height)
    n = np.dstack([-gx, -gy, np.ones_like(height) * 1.0])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    light = np.array([-.45, -.55, .70]); light /= np.linalg.norm(light)
    halfway = light + np.array([0, 0, 1.0]); halfway /= np.linalg.norm(halfway)
    diffuse = np.clip(n @ light, 0, 1)
    spec = np.clip(n @ halfway, 0, 1) ** 40
    yy = np.linspace(0, 1, H)[:, None]
    base = hex_rgb(color_hex)
    if ghost_id == "black":
        col = base[None, None] * (.75 + .55 * diffuse[..., None]) + 150 * spec[..., None]
    elif ghost_id == "white":
        col = base[None, None] * (.80 + .22 * diffuse[..., None]) + 60 * spec[..., None]
    else:
        col = base[None, None] * (.62 + .48 * diffuse[..., None]) + 255 * .55 * spec[..., None]
    col *= (1 - .10 * yy)[..., None]                     # a little darker toward the skirt
    rng = np.random.default_rng(7)
    col += rng.normal(0, 2.2, (H, W, 1))                 # faint matte grain
    return np.clip(col, 0, 255)


def heart_points(cx, cy, size, steps=60):
    pts = []
    for i in range(steps):
        t = 2 * np.pi * i / steps
        x = 16 * np.sin(t) ** 3
        y = 13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t)
        pts.append((cx + x * size / 17, cy - y * size / 17))
    return pts


def draw_eye(img, cx, cy, ghost_id, style="normal"):
    """Booha eye. Jokers use a style that differs from the real ghost."""
    scale = {"big": 1.25, "small": .78}.get(style, 1.0)
    rx, ry = round(px(13) * scale), round(px(17) * scale)
    big = 4
    pad = 30
    layer = Image.new("RGBA", (rx * 2 * big + pad * 2, ry * 2 * big + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ox, oy = pad, pad
    box = (ox, oy, ox + rx * 2 * big, oy + ry * 2 * big)
    ecx, ecy = ox + rx * big, oy + ry * big
    dark, rim, white = (28, 16, 18, 255), (44, 26, 30, 255), (255, 255, 255, 255)
    if style == "wink":
        d.arc((ox, oy + ry * big // 2, ox + rx * 2 * big, oy + ry * big // 2 + ry * 2 * big), start=200, end=340, fill=dark, width=px(4.2) * big)
    elif ghost_id == "black":
        d.ellipse(box, fill=(250, 248, 244, 255), outline=(20, 20, 24, 255), width=big * 6)
        pr = int(rx * big * .55)
        pcx, pcy = ecx + big * 6, ecy + big * 8
        d.ellipse((pcx - pr, pcy - int(pr * 1.25), pcx + pr, pcy + int(pr * 1.25)), fill=(18, 16, 22, 255))
        g = int(pr * .38)
        d.ellipse((pcx + pr * .15 - g, pcy - pr * .55 - g, pcx + pr * .15 + g, pcy - pr * .55 + g), fill=white)
    else:
        d.ellipse(box, fill=dark)
        inset = big * 10
        d.ellipse((box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset), fill=rim)
        gx, gy = ox + rx * big * 1.32, oy + ry * big * .78
        g = int(rx * big * .36)
        if style == "heart":
            d.polygon(heart_points(gx - g * .1, gy + g * .1, g * 1.35), fill=white)
        elif style == "swirl":
            pts = []
            turns, r_max = 2.1, rx * big * .74
            for i in range(240):
                t = i / 239
                a = t * turns * 2 * np.pi
                r = t * r_max
                pts.append((ecx + r * np.cos(a), ecy + r * np.sin(a) * ry / rx))
            d.line(pts, fill=white, width=big * 18, joint="curve")
        elif style == "sleepy":
            lid = oy + int(ry * 2 * big * .46)                      # top 46% closed
            d.rectangle((0, 0, layer.width, lid), fill=(0, 0, 0, 0))
            d.line((ox - big * 4, lid, box[2] + big * 4, lid), fill=dark, width=big * 9)
            g2 = int(g * .7)
            d.ellipse((gx - g2, lid + g2 * 1.6 - g2, gx + g2, lid + g2 * 1.6 + g2), fill=white)
        elif style == "noshine":
            pass
        else:                                                      # normal, big, small
            d.ellipse((gx - g, gy - g, gx + g, gy + g), fill=white)
    layer = layer.resize((layer.width // big, layer.height // big), Image.LANCZOS)
    img.alpha_composite(layer, (cx - layer.width // 2, cy - layer.height // 2))


def qr_matrix(url):
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_M, border=0)
    q.add_data(url)
    q.make(fit=True)
    return np.array(q.get_matrix(), dtype=bool)


def make_page(ghost_id, kana, english, color_hex, eyes=("normal", "normal"), style_id=None):
    look = style_id or ghost_id                            # jokers borrow the real ghost's shading
    mask = body_mask()
    # outline = cut line: body grown by 2.2 mm, filled with ink
    outline = cv2.dilate((mask * 255).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px(4.4), px(4.4))))
    outline = cv2.GaussianBlur(outline, (0, 0), 1.2).astype(np.float32) / 255
    page = np.full((H, W, 3), 255, np.float32)
    page = page * (1 - outline[..., None]) + np.array(INK, np.float32) * outline[..., None]
    body = shade_body(mask, color_hex, look)
    page = page * (1 - mask[..., None]) + body * mask[..., None]
    img = Image.fromarray(page.astype(np.uint8)).convert("RGBA")

    draw_eye(img, px(105 - 27), px(58), look, eyes[0])
    draw_eye(img, px(105 + 27), px(58), look, eyes[1])

    # tummy panel with a huge QR code (pure black on white, 4-module quiet zone)
    matrix = qr_matrix(BASE_URL + ghost_id)
    n = matrix.shape[0]
    module = 40                                            # px at 300 dpi = 3.39 mm
    qr_px = n * module
    quiet = 4 * module
    label_h = px(19)
    panel_w = qr_px + 2 * quiet
    panel_h = qr_px + quiet + quiet // 2 + label_h
    x0 = (W - panel_w) // 2
    y0 = px(82)
    d = ImageDraw.Draw(img)
    radius = px(9)
    shadow = px(2.6)
    d.rounded_rectangle((x0 + shadow, y0 + shadow, x0 + panel_w + shadow, y0 + panel_h + shadow), radius, fill=INK + (255,))
    d.rounded_rectangle((x0, y0, x0 + panel_w, y0 + panel_h), radius, fill=(255, 255, 255, 255), outline=INK + (255,), width=px(1.4))
    qx, qy = x0 + quiet, y0 + quiet
    for r in range(n):
        for c in range(n):
            if matrix[r, c]:
                d.rectangle((qx + c * module, qy + r * module, qx + (c + 1) * module - 1, qy + (r + 1) * module - 1), fill=(0, 0, 0, 255))

    # label under the code: a color dot, kana, English
    ly = qy + qr_px + quiet // 2 + label_h // 2
    f_jp, f_en = font(px(12)), font(px(7.5))
    jp_w = d.textlength(kana, font=f_jp)
    en_w = d.textlength(english, font=f_en)
    dot = px(10)
    gap = px(4)
    total = dot + gap + jp_w + gap + en_w
    sx = (W - total) / 2
    d.ellipse((sx, ly - dot / 2, sx + dot, ly + dot / 2), fill=tuple(int(v) for v in hex_rgb(color_hex)) + (255,), outline=INK + (255,), width=px(.9))
    d.text((sx + dot + gap, ly), kana, font=f_jp, fill=INK + (255,), anchor="lm")
    d.text((sx + dot + gap + jp_w + gap, ly), english, font=f_en, fill=INK + (255,), anchor="lm")
    return img.convert("RGB"), BASE_URL + ghost_id


def main():
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    if "--jokers" not in sys.argv:
        build_real_ghosts()
    build_jokers()


def build_real_ghosts():
    pages = []
    for ghost_id, kana, english, color in GHOSTS:
        page, url = make_page(ghost_id, kana, english, color)
        page.save(OUT_PNG / f"ghost-{ghost_id}.png", dpi=(DPI, DPI))
        pages.append(page)
        print(f"{ghost_id:12s} {url}")
    pages[0].save(OUT_PDF, save_all=True, append_images=pages[1:], resolution=DPI)
    print(f"Saved {OUT_PDF}")


def build_jokers():
    colors = {ghost_id: color for ghost_id, _, _, color in GHOSTS}
    joker_pages = []
    for joker_id, looks_like, kana, english, left_eye, right_eye in JOKERS:
        page, url = make_page(joker_id, kana, english, colors[looks_like], eyes=(left_eye, right_eye), style_id=looks_like)
        page.save(OUT_PNG / f"joker-{joker_id}.png", dpi=(DPI, DPI))
        joker_pages.append(page)
        print(f"joker {joker_id:12s} {url}")
    joker_pages[0].save(OUT_JOKER_PDF, save_all=True, append_images=joker_pages[1:], resolution=DPI)
    print(f"Saved {OUT_JOKER_PDF}")


if __name__ == "__main__":
    main()
