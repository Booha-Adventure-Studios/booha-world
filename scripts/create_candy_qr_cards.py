#!/usr/bin/env python3
"""Create one large, landscape A4 QR poster for each Candy Forest ghost."""

from io import BytesIO
from pathlib import Path
import re

from PIL import Image, ImageColor, ImageDraw
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
QR_DIR = ROOT / "assets/events/qr/candy-forest"
BASE_GHOST = ROOT / "assets/events/ghosts/booha-ghost-red.png"
OUTPUT = ROOT / "output/pdf/booha-candy-forest-qr-cards.pdf"

GHOSTS = [
    ("red", "Red", "赤", "#EF5264"),
    ("pink", "Pink", "ピンク", "#EC82AE"),
    ("yellow", "Yellow", "黄色", "#F4CF45"),
    ("blue", "Blue", "青", "#4E9FE8"),
    ("light-blue", "Light Blue", "水色", "#8ED1E9"),
    ("green", "Green", "緑", "#58B96D"),
    ("light-green", "Light Green", "黄緑", "#A8D65D"),
    ("black", "Black", "黒", "#24252B"),
    ("white", "White", "白", "#F5F0E4"),
    ("orange", "Orange", "オレンジ", "#EE844D"),
    ("purple", "Purple", "紫", "#9A67D4"),
    ("brown", "Brown", "茶色", "#9A6847"),
]


def parse_qr(svg_path):
    source = svg_path.read_text(encoding="utf-8")
    rects = re.findall(
        r'<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"',
        source,
    )
    return [(float(x), float(y), float(w), float(h)) for x, y, w, h in rects]


def draw_qr(pdf, svg_path, x, y, size):
    """Draw the existing vector QR with its quiet zone preserved."""
    qr_size = 512.0
    scale = size / qr_size
    pdf.setFillColor(white)
    pdf.roundRect(x - 9, y - 9, size + 18, size + 18, 12, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#111111"))
    for rx, ry, rw, rh in parse_qr(svg_path):
        pdf.rect(x + rx * scale, y + (qr_size - ry - rh) * scale, rw * scale, rh * scale, fill=1, stroke=0)


def solid_ghost(color):
    """Flatten the body, then redraw crisp black eyes and white highlights."""
    source = Image.open(BASE_GHOST).convert("RGBA")
    alpha = source.getchannel("A")
    rgb = ImageColor.getrgb(color)
    solid = Image.new("RGBA", source.size, (*rgb, 255))
    solid.putalpha(alpha)

    # These are the eye positions from the supplied Booha artwork. Redrawing
    # them removes the original glossy red shading and preserves high contrast
    # when the poster is printed or viewed from farther away.
    draw = ImageDraw.Draw(solid)
    draw.ellipse((408, 302, 570, 585), fill="#000000")
    draw.ellipse((618, 302, 786, 585), fill="#000000")
    draw.ellipse((471, 407, 529, 472), fill="#FFFFFF")
    draw.ellipse((681, 407, 739, 472), fill="#FFFFFF")

    # Remove the transparent canvas around the supplied artwork so the
    # silhouette can fill the landscape sheet when it is printed and cut out.
    bbox = alpha.getbbox()
    if bbox:
        solid = solid.crop(bbox)

    stream = BytesIO()
    solid.save(stream, format="PNG", optimize=True)
    stream.seek(0)
    return ImageReader(stream)


def draw_poster(pdf, ghost, page_w, page_h):
    ghost_id, _label, _label_jp, color = ghost
    # No page rectangle is drawn: the paper is left clear around the
    # transparent artwork so the printed sheet can be cut to the Booha shape.
    ghost_margin = 12
    ghost_x = ghost_margin
    ghost_y = ghost_margin
    ghost_w = page_w - (ghost_margin * 2)
    ghost_h = page_h - (ghost_margin * 2)
    pdf.drawImage(
        solid_ghost(color),
        ghost_x,
        ghost_y,
        width=ghost_w,
        height=ghost_h,
        mask="auto",
    )

    # Keep the QR itself square, but center it horizontally across Booha's
    # stomach and place it below the eyes on the broad belly area.
    qr_size = 245
    qr_x = (page_w - qr_size) / 2
    qr_y = 34
    pdf.setFillColor(white)
    pdf.roundRect(qr_x - 18, qr_y - 18, qr_size + 36, qr_size + 36, 18, fill=1, stroke=0)
    draw_qr(pdf, QR_DIR / f"ghost-{ghost_id}.svg", qr_x, qr_y, qr_size)


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page_w, page_h = landscape(A4)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=(page_w, page_h))
    pdf.setTitle("Candy Forest Booha Ghost QR Posters")
    for ghost in GHOSTS:
        draw_poster(pdf, ghost, page_w, page_h)
        pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
