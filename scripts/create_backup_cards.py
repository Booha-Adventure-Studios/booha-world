#!/usr/bin/env python3
"""Paper backup cards for the Halloween hunts (for a forgotten or dead phone).

A5 portrait cards, two per landscape A4 sheet, with a dotted cut line between them.
  Pages 1-4: Candy Forest cards A-H (each a different color order; photo each ghost)
  Pages 5-8: Zombie Scavenger Hunt cards A-H (different number orders; tear the matching mark)
  Page 9:    Staff sheet (how to check cards) + Zombie answer key (keep hidden)

Colors, symbols and the secret phrase are read from events/events.js, so the cards
always match the game.

Usage:  python3 scripts/create_backup_cards.py
Output: output/pdf/booha-backup-cards-A5.pdf
Needs:  pip install pillow svg.path
"""
from pathlib import Path
import random
import re
from PIL import Image, ImageDraw, ImageFont
from svg.path import parse_path

ROOT = Path(__file__).resolve().parents[1]
EVENTS = ROOT / "events/events.js"
OUT_PDF = ROOT / "output/pdf/booha-backup-cards-A5.pdf"

DPI = 300
MM = DPI / 25.4
PAGE_W, PAGE_H = round(297 * MM), round(210 * MM)
HALF = PAGE_W // 2
INK = (37, 16, 52)
GREY = (110, 100, 120)
PINK = (255, 95, 162)
SLIME = (88, 170, 60)
LETTERS = "ABCDEFGH"
FONT_CANDIDATES = {
    "bold": ["/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc", "/System/Library/Fonts/ヒラギノ角ゴシック W7.ttc",
             "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"],
    "black": ["/System/Library/Fonts/ヒラギノ角ゴシック W9.ttc", "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"],
    "regular": ["/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"],
}
_font_cache = {}


def font(weight, size_mm):
    key = (weight, size_mm)
    if key not in _font_cache:
        for path in FONT_CANDIDATES[weight]:
            if Path(path).exists():
                try:
                    _font_cache[key] = ImageFont.truetype(path, round(size_mm * MM))
                    break
                except OSError:
                    continue
        else:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def px(v):
    return round(v * MM)


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def read_event_data():
    text = EVENTS.read_text(encoding="utf-8")
    candy = [(m.group(1), m.group(2), m.group(3), m.group(4)) for m in re.finditer(
        r'\{ id: "([a-z-]+)", label: "([^"]+)", jp: "[^"]*", kana: "([^"]+)", color: "(#[0-9a-fA-F]{6})" \}', text)]
    zombie_block = re.search(r'zombie:\s*\{(.*?)\n    \},', text, re.S).group(1)
    phrase = re.findall(r'"([^"]+)"', re.search(r'phrase:\s*\[([^\]]*)\]', zombie_block).group(1))
    phrase_en = re.search(r'phraseEN:\s*"([^"]+)"', zombie_block).group(1)
    order = re.findall(r'"([a-z-]+)"', re.search(r'ghosts:\s*\[([^\]]*)\]', zombie_block).group(1))
    symbols = {m.group(1): (m.group(2), m.group(3), m.group(4)) for m in re.finditer(
        r'(\w+): \{ jp: "([^"]*)", en: "([^"]*)", d: "([^"]+)" \}', text)}
    return candy, phrase, phrase_en, order, symbols


def card_orders(items, count, seed):
    """Different shuffled orders; every version starts on a different item."""
    rng = random.Random(seed)
    firsts = rng.sample(items, count)
    orders = []
    for first in firsts:
        rest = [x for x in items if x != first]
        rng.shuffle(rest)
        orders.append([first] + rest)
    return orders


def svg_polygons(d, x, y, size):
    polys, current, started = [], [], False
    for seg in parse_path(d):
        name = type(seg).__name__
        if name == "Move":
            if len(current) > 2:
                polys.append(current)
            current, started = [], False
            continue
        steps = 1 if name in ("Line", "Close") else 20
        for i in range(0 if not started else 1, steps + 1):
            p = seg.point(i / steps)
            current.append((x + p.real / 100 * size, y + p.imag / 100 * size))
        started = True
    if len(current) > 2:
        polys.append(current)
    return polys


def draw_symbol(d, symbol_d, cx, cy, size, fill=INK):
    for poly in svg_polygons(symbol_d, cx - size / 2, cy - size / 2, size):
        d.polygon(poly, fill=fill)


def text(d, xy, s, weight, size_mm, fill=INK, anchor="la"):
    d.text(xy, s, font=font(weight, size_mm), fill=fill, anchor=anchor)


def header(d, ox, title_jp, title_en, letter, accent):
    d.rounded_rectangle((ox + px(8), px(8), ox + HALF - px(8), px(30)), px(4), fill=accent)
    text(d, (ox + px(13), px(13)), title_jp, "black", 6.2, fill=(255, 255, 255))
    text(d, (ox + px(13), px(22.5)), title_en, "bold", 3.4, fill=(255, 255, 255))
    # version letter badge
    cx, cy, r = ox + HALF - px(19), px(19), px(8.5)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255), outline=INK, width=px(.7))
    text(d, (cx, cy + px(.3)), letter, "black", 8, anchor="mm")


def name_line(d, ox, y):
    text(d, (ox + px(10), y), "チームのなまえ", "bold", 3.6)
    text(d, (ox + px(10), y + px(4.6)), "Team name", "regular", 2.6, fill=GREY)
    d.line((ox + px(40), y + px(7.5), ox + HALF - px(10), y + px(7.5)), fill=INK, width=px(.4))


def wrap_lines(d, ox, y, lines, size_jp=3.3, size_en=2.6, gap=1.2):
    for jp, en in lines:
        text(d, (ox + px(10), y), jp, "bold", size_jp)
        y += px(size_jp + .9)
        text(d, (ox + px(10), y), en, "regular", size_en, fill=GREY)
        y += px(size_en + gap + .6)
    return y


def camera_icon(d, cx, cy, w):
    h = w * .68
    d.rounded_rectangle((cx - w / 2, cy - h / 2 + w * .08, cx + w / 2, cy + h / 2 + w * .08), w * .12, outline=GREY, width=px(.45))
    d.rectangle((cx - w * .18, cy - h / 2 - w * .06, cx + w * .12, cy - h / 2 + w * .08), fill=GREY)
    r = w * .2
    d.ellipse((cx - r, cy - r + w * .08, cx + r, cy + r + w * .08), outline=GREY, width=px(.45))


def candy_card(page, half, letter, order, candy_by_id):
    ox = half * HALF
    d = ImageDraw.Draw(page)
    header(d, ox, "キャンディのもり ゴーストハント", "Candy Forest Ghost Hunt · paper card", letter, PINK)
    name_line(d, ox, px(35))
    y = wrap_lines(d, ox, px(49), [
        ("うえから じゅんばんに、この いろの ゴーストを さがそう。", "Find the ghosts in order, from the top."),
        ("みつけたら、ゴーストと いっしょに しゃしんを とってね。", "At each ghost, take a photo with it. No signal needed."),
    ])
    top, bottom = y + px(2), px(188)
    row_h = (bottom - top) / len(order)
    for i, gid in enumerate(order):
        _, label, kana, color = candy_by_id[gid]
        ry = top + i * row_h
        cy = ry + row_h / 2
        if i % 2 == 0:
            d.rounded_rectangle((ox + px(9), ry + px(.4), ox + HALF - px(9), ry + row_h - px(.4)), px(2), fill=(255, 241, 248))
        text(d, (ox + px(16), cy), str(i + 1), "black", 4.4, fill=GREY, anchor="mm")
        r = px(3.8)
        d.ellipse((ox + px(27) - r, cy - r, ox + px(27) + r, cy + r), fill=hex_rgb(color), outline=INK, width=px(.5))
        text(d, (ox + px(34), cy), kana, "black", 5.2, anchor="lm")
        text(d, (ox + px(70), cy), label.upper(), "bold", 3.2, fill=GREY, anchor="lm")
        camera_icon(d, ox + HALF - px(18), cy, px(8))
    text(d, (ox + HALF / 2, px(193)), "12まい とれたら、ブライアンに しゃしんを みせてね！", "black", 3.8, anchor="mm")
    text(d, (ox + HALF / 2, px(199)), "When you have all 12 photos, show them to Bryan.", "regular", 2.8, fill=GREY, anchor="mm")


def zombie_choices(order, symbol_by_number, all_symbols, seed):
    """For every ghost on a card: the correct symbol plus 3 others, shuffled."""
    rng = random.Random(seed)
    out = []
    for number in order:
        correct = symbol_by_number[number - 1]
        others = rng.sample([s for s in all_symbols if s != correct], 3)
        choices = [correct] + others
        rng.shuffle(choices)
        out.append(choices)
    return out


def zombie_card(page, half, letter, order, choices, symbols):
    ox = half * HALF
    d = ImageDraw.Draw(page)
    header(d, ox, "ゾンビ・スカベンジャーハント", "Zombie Scavenger Hunt · paper card", letter, SLIME)
    name_line(d, ox, px(35))
    y = wrap_lines(d, ox, px(49), [
        ("1ばんめ から じゅんばんに、この ばんごうの ゴーストを さがそう。", "Find the ghosts in order: 1st, 2nd, 3rd…"),
        ("ゴーストと おなじ マークを 1つ やぶってね。", "Tear the one mark that matches the ghost."),
    ])
    cols, rows = 3, 5
    gx0, gx1 = ox + px(9), ox + HALF - px(9)
    gy0, gy1 = y + px(2), px(188)
    cw, ch = (gx1 - gx0) / cols, (gy1 - gy0) / rows
    for i, number in enumerate(order):
        c, r = i % cols, i // cols
        x0, y0 = gx0 + c * cw, gy0 + r * ch
        d.rounded_rectangle((x0 + px(.8), y0 + px(.8), x0 + cw - px(.8), y0 + ch - px(.8)), px(2.5), outline=(150, 190, 130), width=px(.4), fill=(244, 251, 240))
        text(d, (x0 + px(2.6), y0 + px(2.2)), f"{i + 1}ばんめ", "bold", 2.5, fill=GREY)
        text(d, (x0 + px(8.6), y0 + ch / 2 + px(1.8)), str(number), "black", 8 if number < 10 else 6.4, anchor="mm")
        text(d, (x0 + px(8.6), y0 + ch - px(3.2)), "ばん", "bold", 2.4, fill=GREY, anchor="mm")
        # 2 x 2 tear squares
        sx0 = x0 + px(16.5)
        sw = (cw - px(16.5) - px(2)) / 2
        sh = (ch - px(3)) / 2
        for k, sym in enumerate(choices[i]):
            bx = sx0 + (k % 2) * sw
            by = y0 + px(1.5) + (k // 2) * sh
            box = (bx + px(.6), by + px(.6), bx + sw - px(.6), by + sh - px(.6))
            d.rounded_rectangle(box, px(1.4), fill=(255, 255, 255))
            dash = px(1.1)
            x_a, y_a, x_b, y_b = box
            for t in range(int(x_a), int(x_b), dash * 2):
                d.line((t, y_a, min(t + dash, x_b), y_a), fill=GREY, width=px(.3))
                d.line((t, y_b, min(t + dash, x_b), y_b), fill=GREY, width=px(.3))
            for t in range(int(y_a), int(y_b), dash * 2):
                d.line((x_a, t, x_a, min(t + dash, y_b)), fill=GREY, width=px(.3))
                d.line((x_b, t, x_b, min(t + dash, y_b)), fill=GREY, width=px(.3))
            draw_symbol(d, symbols[sym][2], (x_a + x_b) / 2, (y_a + y_b) / 2, min(sw, sh) - px(3.2))
    text(d, (ox + HALF / 2, px(193)), "ぜんぶ やぶったら ホスピタルデスクへ！", "black", 3.8, anchor="mm")
    text(d, (ox + HALF / 2, px(199)), "When every ghost has one torn mark, bring this card to the Hospital Desk.", "regular", 2.6, fill=GREY, anchor="mm")


def staff_guide(page, half):
    ox = half * HALF
    d = ImageDraw.Draw(page)
    header(d, ox, "スタッフよう", "Staff sheet · backup cards", "S", INK)
    y = px(38)
    blocks = [
        ("キャンディのもり", "Candy Forest", [
            ("カードを1まい わたす（A〜H、となりの かぞくと ちがう もの）。", "Give one card (A–H). Give neighbors different letters."),
            ("12まいの しゃしんを カードの じゅんばんで チェック → キャンディバッグ。", "Check the 12 photos in the card's order → candy bag."),
        ]),
        ("ゾンビ・スカベンジャーハント", "Zombie Scavenger Hunt", [
            ("カードを1まい わたす。あかりが ひつようです（かしだしスマホ など）。", "Give one card. Paper teams need a light (loaner phone, etc.)."),
            ("こたえシートで、やぶった マークを チェック（1つの ゴーストに 1つ）。", "Check each torn mark against the answer key (one per ghost)."),
            ("ぜんぶ あっていたら、ひみつのことばを おしえて ゴール。", "All correct → tell them the secret phrase. They finish."),
            ("まちがいが あったら、その ゴーストに もういちど。", "Any wrong tear → send them back to that ghost."),
        ]),
        ("トラブルのとき", "If something goes wrong", [
            ("でんちぎれ → モバイルバッテリー。でんぱが よわい → ちゅうしゃじょうで ページを ひらく。", "Dead battery → power bank. Weak signal → open the page in the parking lot."),
            ("LINE・Facebookで ひらいている → 「ブラウザで ひらく」。", "Opened inside LINE/Facebook → use “Open in browser”."),
        ]),
    ]
    for title_jp, title_en, lines in blocks:
        text(d, (ox + px(10), y), title_jp, "black", 4.6)
        text(d, (ox + px(10), y + px(6)), title_en, "bold", 3, fill=GREY)
        y += px(11)
        for jp, en in lines:
            text(d, (ox + px(13), y), "・" + jp, "bold", 3.0)
            y += px(4.2)
            text(d, (ox + px(16), y), en, "regular", 2.6, fill=GREY)
            y += px(5.6)
        y += px(3)


def answer_key(page, half, order, symbols, phrase, phrase_en):
    ox = half * HALF
    d = ImageDraw.Draw(page)
    header(d, ox, "ゾンビ こたえ（ひみつ）", "Zombie answer key · keep hidden", "S", (120, 20, 40))
    top = px(36)
    row_h = px(8.6)
    for i, sym in enumerate(order):
        n = i + 1
        col, row = (0, i) if i < 8 else (1, i - 8)
        x0 = ox + px(10) + col * px(65)
        cy = top + row * row_h + row_h / 2
        jp, en, d_path = symbols[sym]
        text(d, (x0 + px(7), cy), str(n), "black", 5, anchor="rm")
        text(d, (x0 + px(8.5), cy), "ばん", "bold", 2.6, fill=GREY, anchor="lm")
        draw_symbol(d, d_path, x0 + px(22), cy, px(7))
        text(d, (x0 + px(28), cy - px(1.6)), jp, "black", 3.3, anchor="lm")
        text(d, (x0 + px(28), cy + px(2.4)), en, "regular", 2.4, fill=GREY, anchor="lm")
    y = top + 8 * row_h + px(8)
    d.rounded_rectangle((ox + px(10), y, ox + HALF - px(10), y + px(30)), px(3), outline=(120, 20, 40), width=px(.6), fill=(255, 244, 246))
    text(d, (ox + px(14), y + px(3)), "ひみつのことば / Secret phrase", "bold", 3, fill=(120, 20, 40))
    text(d, (ox + HALF / 2, y + px(15)), "".join(phrase), "black", 5.6, anchor="mm")
    text(d, (ox + HALF / 2, y + px(24)), phrase_en, "regular", 2.8, fill=GREY, anchor="mm")


def new_page():
    page = Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))
    d = ImageDraw.Draw(page)
    for yy in range(px(4), PAGE_H - px(4), px(6)):
        d.line((HALF, yy, HALF, yy + px(3)), fill=(185, 185, 185), width=2)
    return page


def main():
    candy, phrase, phrase_en, zombie_symbols_by_number, symbols = read_event_data()
    assert len(candy) >= 2 and len(zombie_symbols_by_number) == len(phrase), "check events/events.js"
    candy_by_id = {c[0]: c for c in candy}
    candy_orders = card_orders([c[0] for c in candy], len(LETTERS), seed=1031)
    zombie_orders = card_orders(list(range(1, len(zombie_symbols_by_number) + 1)), len(LETTERS), seed=1831)
    zombie_choice_sets = [zombie_choices(o, zombie_symbols_by_number, list(symbols), seed=2031 + i) for i, o in enumerate(zombie_orders)]
    pages = []
    for p in range(0, len(LETTERS), 2):
        page = new_page()
        for h in (0, 1):
            candy_card(page, h, LETTERS[p + h], candy_orders[p + h], candy_by_id)
        pages.append(page)
    for p in range(0, len(LETTERS), 2):
        page = new_page()
        for h in (0, 1):
            zombie_card(page, h, LETTERS[p + h], zombie_orders[p + h], zombie_choice_sets[p + h], symbols)
        pages.append(page)
    page = new_page()
    staff_guide(page, 0)
    answer_key(page, 1, zombie_symbols_by_number, symbols, phrase, phrase_en)
    pages.append(page)
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(OUT_PDF, save_all=True, append_images=pages[1:], resolution=DPI)
    for letter, o in zip(LETTERS, candy_orders):
        print("candy ", letter, " ".join(o))
    for letter, o in zip(LETTERS, zombie_orders):
        print("zombie", letter, " ".join(map(str, o)))
    print(f"Saved {OUT_PDF}")
    return pages


if __name__ == "__main__":
    main()
