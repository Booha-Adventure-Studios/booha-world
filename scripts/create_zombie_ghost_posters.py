#!/usr/bin/env python3
"""Zombie Scavenger Hunt ghost posters: 15 slime-green Booha ghosts, two per landscape A4.

Each ghost shows a huge number and one symbol (no QR code). The game asks teams which
symbol they saw, so the symbols here are read straight from events/events.js.
The round white eyes are where the reflective tape goes.

Usage:  python3 scripts/create_zombie_ghost_posters.py
Output: output/pdf/booha-zombie-ghosts-A4.pdf  (+ PNG previews in output/png/zombie-posters/)
Needs:  pip install pillow numpy opencv-python svg.path
"""
from pathlib import Path
import re
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
from svg.path import parse_path

ROOT = Path(__file__).resolve().parents[1]
EVENTS = ROOT / "events/events.js"
OUT_PDF = ROOT / "output/pdf/booha-zombie-ghosts-A4.pdf"
OUT_PNG = ROOT / "output/png/zombie-posters"

DPI = 300
MM = DPI / 25.4
PAGE_W, PAGE_H = round(297 * MM), round(210 * MM)        # landscape A4
HALF_W = PAGE_W // 2
INK = (20, 26, 14)
SLIMES = [  # odd slime greens: body, goo cap
    ("#b5f23b", "#7fcf2a"), ("#86e07a", "#4fb86a"), ("#d2f25a", "#a6cf3a"), ("#6fe3a5", "#3fbf86"),
    ("#a3d94a", "#c8f06a"), ("#c4ee6e", "#8fd14a"), ("#7ad957", "#b2f06a"), ("#9fe86f", "#5fc25a"),
]
FONT_CANDIDATES = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W9.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc",
    "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
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


def read_event_data():
    text = EVENTS.read_text(encoding="utf-8")
    ghosts = re.search(r'zombie:\s*\{.*?ghosts:\s*\[([^\]]*)\]', text, re.S).group(1)
    order = re.findall(r'"([a-z-]+)"', ghosts)
    symbols = {m.group(1): m.group(2) for m in re.finditer(r'(\w+): \{ jp: "[^"]*", en: "[^"]*", d: "([^"]+)" \}', text)}
    return order, symbols


def outline_points(cx, top, scale):
    """Booha silhouette (same shape as the Candy Forest ghosts), scaled and placed."""
    pts = []
    for t in np.linspace(np.pi, 2 * np.pi, 140):
        pts.append((105 + 94 * np.cos(t), 92 + 84 * np.sin(t)))
    for y in np.linspace(92, 262, 50):
        k = (y - 92) / 170
        pts.append((199 + 4 * k * k, y))
    left, right, lobes = 7, 203, 4
    lw = (right - left) / lobes
    for i in reversed(range(lobes)):
        lc = left + lw * (i + .5)
        for t in np.linspace(0, np.pi, 40):
            pts.append((lc + lw / 2 * np.cos(t), 262 + 27 * np.sin(t)))
    for y in np.linspace(262, 92, 50):
        k = (y - 92) / 170
        pts.append((11 - 4 * k * k, y))
    pts = np.array(pts)
    pts[:, 0] = cx + (pts[:, 0] - 105) * scale
    pts[:, 1] = top + (pts[:, 1] - 8) * scale
    return pts


def fill_mask(points_mm, w, h):
    big = np.zeros((h * 4, w * 4), np.uint8)
    cv2.fillPoly(big, [(points_mm * MM * 4).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    return cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def goo_points(cx, top, scale, seed):
    """Slime cap over the head with drips hanging down."""
    rng = np.random.default_rng(seed)
    pts = []
    for t in np.linspace(np.pi, 2 * np.pi, 120):
        pts.append((105 + 100 * np.cos(t), 92 + 90 * np.sin(t)))
    base = 104
    xs = np.linspace(205, 5, 400)
    drips = sorted(rng.uniform(20, 190, 6))
    for x in xs:
        y = base + 5 * np.sin(x / 9 + seed)
        for dx in drips:
            w = 7 + (dx % 5)
            if abs(x - dx) < w:
                y += (34 + (dx * 7 % 30)) * np.sqrt(1 - ((x - dx) / w) ** 2)
        pts.append((x, y))
    pts = np.array(pts)
    pts[:, 0] = cx + (pts[:, 0] - 105) * scale
    pts[:, 1] = top + (pts[:, 1] - 8) * scale
    return pts


def shade(mask, color_hex, w, h, radius_mm=26, strength=1.0):
    hard = (mask > .5).astype(np.uint8)
    dist = cv2.distanceTransform(hard, cv2.DIST_L2, 5)
    R = px(radius_mm)
    d = np.minimum(dist, R)
    height = np.sqrt(np.maximum(R * R - (R - d) ** 2, 0))
    height = cv2.GaussianBlur(height, (0, 0), px(2.5))
    gy, gx = np.gradient(height)
    n = np.dstack([-gx, -gy, np.ones_like(height)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    light = np.array([-.45, -.55, .70]); light /= np.linalg.norm(light)
    halfway = light + np.array([0, 0, 1.0]); halfway /= np.linalg.norm(halfway)
    diffuse = np.clip(n @ light, 0, 1)
    spec = np.clip(n @ halfway, 0, 1) ** 36
    base = hex_rgb(color_hex)
    col = base[None, None] * (.66 + .42 * diffuse[..., None]) + 255 * .6 * spec[..., None] * strength
    return np.clip(col, 0, 255)


def svg_polygons(d, x, y, size):
    """Sample an SVG path (100x100 box) into polygons placed at x,y with the given size in px."""
    polys, current, last_end = [], [], None
    for seg in parse_path(d):
        name = type(seg).__name__
        if name == "Move":
            if len(current) > 2:
                polys.append(current)
            current, last_end = [], None
            continue
        steps = 1 if name in ("Line", "Close") else 24
        for i in range(0 if last_end is None else 1, steps + 1):
            p = seg.point(i / steps)
            current.append((x + p.real / 100 * size, y + p.imag / 100 * size))
        last_end = seg.end
    if len(current) > 2:
        polys.append(current)
    return polys


def draw_ghost(page, half_index, number, symbol_d, slime):
    body_hex, goo_hex = slime
    ox = half_index * HALF_W
    scale = .69
    cx_mm = 148.5 / 2
    top_mm = 7
    pts = outline_points(cx_mm, top_mm, scale)
    w, h = HALF_W, PAGE_H
    mask = fill_mask(pts, w, h)
    goo = fill_mask(goo_points(cx_mm, top_mm, scale, number), w, h) * mask
    region = np.zeros((h, w, 3), np.float32) + 255
    outline = cv2.dilate((mask * 255).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px(3.6), px(3.6))))
    outline = cv2.GaussianBlur(outline, (0, 0), 1.2).astype(np.float32) / 255
    region = region * (1 - outline[..., None]) + np.array(INK, np.float32) * outline[..., None]
    body = shade(mask, body_hex, w, h)
    region = region * (1 - mask[..., None]) + body * mask[..., None]
    goo_col = shade((goo > .5).astype(np.float32), goo_hex, w, h, radius_mm=9, strength=1.3)
    # thin dark edge under the goo so the drips read
    goo_edge = cv2.dilate((goo * 255).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px(1.6), px(1.6)))).astype(np.float32) / 255 * mask
    region = region * (1 - goo_edge[..., None] * .55) + np.array(INK, np.float32) * goo_edge[..., None] * .55
    region = region * (1 - goo[..., None]) + goo_col * goo[..., None]
    img = Image.fromarray(region.astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(img)

    # round eyes: white with outline, sized for reflective tape
    eye_r = px(11.5)
    for ex in (-19, 19):
        ecx, ecy = px(cx_mm + ex * scale * 1.42), px(top_mm + 50 * scale)
        d.ellipse((ecx - eye_r, ecy - eye_r, ecx + eye_r, ecy + eye_r), fill=(255, 255, 255, 255), outline=INK + (255,), width=px(1.6))

    # huge number with a white outline
    num = str(number)
    f_num = font(px(78 if number < 10 else 66))
    nx, ny = px(cx_mm), px(top_mm + 132 * scale)
    d.text((nx, ny), num, font=f_num, fill=INK + (255,), anchor="mm", stroke_width=px(3.2), stroke_fill=(255, 255, 255, 255))

    # symbol under the number, also outlined in white
    size = px(40)
    sx, sy = px(cx_mm) - size // 2, px(top_mm + 226 * scale) - size // 2
    sym = Image.new("L", (w, h), 0)
    sd = ImageDraw.Draw(sym)
    for poly in svg_polygons(symbol_d, sx, sy, size):
        sd.polygon(poly, fill=255)
    sym_np = np.array(sym)
    halo = cv2.dilate(sym_np, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px(5.5), px(5.5))))
    img.paste((255, 255, 255, 255), (0, 0), Image.fromarray(halo))
    img.paste(INK + (255,), (0, 0), sym)
    page.alpha_composite(img, (ox, 0))
    return img


def main():
    order, symbols = read_event_data()
    assert len(order) == 15 and all(s in symbols for s in order), "check zombie ghosts/symbols in events/events.js"
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    pages = []
    for page_index in range((len(order) + 1) // 2):
        page = Image.new("RGBA", (PAGE_W, PAGE_H), (255, 255, 255, 255))
        for half in (0, 1):
            n = page_index * 2 + half + 1
            if n > len(order):
                continue
            draw_ghost(page, half, n, symbols[order[n - 1]], SLIMES[(n - 1) % len(SLIMES)])
            print(f"ghost {n:2d}: {order[n - 1]}")
        d = ImageDraw.Draw(page)
        for y in range(px(4), PAGE_H - px(4), px(6)):             # light cut guide between the two ghosts
            d.line((HALF_W, y, HALF_W, y + px(3)), fill=(190, 190, 190, 255), width=2)
        page = page.convert("RGB")
        page.save(OUT_PNG / f"zombie-page-{page_index + 1}.png", dpi=(DPI, DPI))
        pages.append(page)
    pages[0].save(OUT_PDF, save_all=True, append_images=pages[1:], resolution=DPI)
    print(f"Saved {OUT_PDF}")


if __name__ == "__main__":
    main()
