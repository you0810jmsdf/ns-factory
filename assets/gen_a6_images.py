"""Generate a6-print-tool images for N's factory LP and SNS."""
from PIL import Image, ImageDraw, ImageFont
import os, math

FD = 'C:/Windows/Fonts/'

def fnt(name, size):
    for n in ([name] if isinstance(name, str) else name):
        try:
            return ImageFont.truetype(FD + n, size)
        except:
            pass
    return ImageFont.load_default()

# ── Shared colors ──────────────────────────────────────────────
BG_WARM     = (243, 236, 228)
WHITE       = (255, 255, 255)
DARK        = ( 29,  29,  31)
DARK_BROWN  = (122,  85,  64)
ACCENT      = (160, 120,  90)
GOLD        = (176, 140,  90)
GRAY        = (153, 153, 153)
GRAY_LIGHT  = (228, 225, 220)
SUN_RED     = (192,  57,  43)
SAT_BLUE    = ( 36, 113, 163)
SHADOW_COL  = (200, 185, 170)

# ── IMAGE 1: LP説明用 720×480 ──────────────────────────────────
W1, H1 = 720, 480
img1 = Image.new('RGB', (W1, H1), BG_WARM)
d1   = ImageDraw.Draw(img1)

# fonts
f_brand  = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 13)
f_label  = fnt('NotoSansJP-VF.ttf', 11)
f_tag    = fnt('NotoSansJP-VF.ttf',  9)
f_tiny   = fnt('NotoSansJP-VF.ttf',  7)
f_date   = fnt(['YuGothB.ttc', 'BIZ-UDGothicB.ttc'], 22)
f_wd     = fnt('NotoSansJP-VF.ttf',  8)
f_time   = fnt('NotoSansJP-VF.ttf',  6)
f_month  = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 14)

# A4 mockup
A4W, A4H = 260, 368
A4X = (W1 - A4W) // 2
A4Y = 52

# shadow
d1.rectangle([A4X+5, A4Y+5, A4X+A4W+5, A4Y+A4H+5], fill=SHADOW_COL)
# paper
d1.rectangle([A4X, A4Y, A4X+A4W, A4Y+A4H], fill=WHITE)
d1.rectangle([A4X, A4Y, A4X+A4W, A4Y+A4H], outline=(215, 205, 195), width=1)

SW = A4W // 2  # slot width  = 130
SH = A4H // 2  # slot height = 184

def dashed(draw, x1, y1, x2, y2, dash=3, gap=3, color=GRAY):
    if x1 == x2:
        y = y1
        while y < y2:
            draw.line([(x1, y), (x1, min(y+dash, y2))], fill=color, width=1)
            y += dash + gap
    else:
        x = x1
        while x < x2:
            draw.line([(x, y1), (min(x+dash, x2), y1)], fill=color, width=1)
            x += dash + gap

dashed(d1, A4X+SW, A4Y,    A4X+SW, A4Y+A4H)
dashed(d1, A4X,    A4Y+SH, A4X+A4W, A4Y+SH)

SLOTS = [
    (0,  0,  21, '月', DARK),
    (SW, 0,  22, '火', DARK),
    (0,  SH, 26, '土', SAT_BLUE),
    (SW, SH, 27, '日', SUN_RED),
]

HS = 8    # hole strip width
HR = 2    # hole radius

for sx, sy, dnum, wday, dcol in SLOTS:
    ax, ay = A4X + sx, A4Y + sy

    # hole strip separator
    d1.line([(ax+HS, ay), (ax+HS, ay+SH)], fill=GRAY_LIGHT, width=1)

    # 6 holes
    for i in range(6):
        hy = int(ay + (i + 0.7) * SH / 6.4)
        hx = ax + HS // 2
        d1.ellipse([hx-HR, hy-HR, hx+HR, hy+HR], outline=(190,185,180), fill=WHITE)

    # content area
    cx = ax + HS + 2
    cw = SW - HS - 2

    # date number
    d1.text((cx, ay + 1), str(dnum), font=f_date, fill=dcol)
    date_bbox = d1.textbbox((0,0), str(dnum), font=f_date)
    dw = date_bbox[2] - date_bbox[0]
    # weekday
    d1.text((cx + dw + 2, ay + 12), wday, font=f_wd, fill=dcol)
    # month abbr (right)
    d1.text((ax + SW - 18, ay + 3), 'APR', font=f_time, fill=GRAY)

    # header line
    HEADER_H = 20
    d1.line([(cx - 2, ay + HEADER_H), (ax + SW - 1, ay + HEADER_H)],
            fill=(80, 70, 60), width=1)

    # time grid
    MEMO_H   = 22
    TG_H     = SH - HEADER_H - MEMO_H
    T_START, T_END = 6, 23
    T_HOURS  = T_END - T_START

    for t in range(T_HOURS + 1):
        ty = ay + HEADER_H + int(t * TG_H / T_HOURS)
        if ty >= ay + SH - MEMO_H:
            break
        d1.line([(cx - 2, ty), (ax + SW - 1, ty)], fill=GRAY_LIGHT, width=1)
        if t % 3 == 0 and t < T_HOURS:
            d1.text((cx, ty + 1), f'{T_START+t:02d}', font=f_time, fill=GRAY)

    # memo area
    memo_y = ay + SH - MEMO_H
    d1.line([(cx - 2, memo_y), (ax + SW - 1, memo_y)], fill=(170,160,150), width=1)
    d1.text((cx, memo_y + 2), 'memo', font=f_time, fill=GRAY)
    for ml in range(1, 3):
        ly = memo_y + ml * 7
        if ly < ay + SH - 2:
            d1.line([(cx - 2, ly), (ax + SW - 1, ly)], fill=GRAY_LIGHT, width=1)

# Labels
d1.text((A4X, A4Y - 20), "N's factory", font=f_brand, fill=DARK_BROWN)

lbl = 'A6リフィル印刷ツール'
lbb = d1.textbbox((0,0), lbl, font=f_label)
d1.text((A4X + A4W - (lbb[2]-lbb[0]), A4Y - 20), lbl, font=f_label, fill=DARK)

tag = 'ブラウザだけで完結 • 無料 • カスタマイズ自由'
tbb = d1.textbbox((0,0), tag, font=f_tag)
d1.text(((W1 - (tbb[2]-tbb[0])) // 2, A4Y + A4H + 12), tag, font=f_tag, fill=GRAY)

# thin border
d1.rectangle([8, 8, W1-9, H1-9], outline=(212, 184, 150), width=1)

out1 = r'C:\Users\nsfactory\OneDrive\レザークラフト\広報部\サイト管理\ns-factory\assets\a6-print-tool-main.png'
img1.save(out1, 'PNG')
print(f'Image1 saved: {out1}')


# ── IMAGE 2: SNS 1080×1080 ─────────────────────────────────────
W2, H2 = 1080, 1080
LEATHER  = ( 61,  31,  15)   # #3D1F0F
LEATHER2 = ( 80,  45,  20)   # slightly lighter center
CREAM    = (243, 236, 228)
GOLD2    = (176, 140,  90)
GOLD3    = (210, 175, 120)
MUTED_G  = (130, 100,  65)

img2 = Image.new('RGB', (W2, H2), LEATHER)
d2   = ImageDraw.Draw(img2)

# radial-ish gradient (concentric rectangles)
steps = 60
for i in range(steps, 0, -1):
    t = i / steps
    r = int(LEATHER[0] + (LEATHER2[0] - LEATHER[0]) * (1 - t**1.5))
    g = int(LEATHER[1] + (LEATHER2[1] - LEATHER[1]) * (1 - t**1.5))
    b = int(LEATHER[2] + (LEATHER2[2] - LEATHER[2]) * (1 - t**1.5))
    margin = int(i * 4)
    d2.rectangle([margin, margin, W2-margin, H2-margin], fill=(r, g, b))

# outer gold border
BORDER_IN = 32
d2.rectangle([BORDER_IN, BORDER_IN, W2-BORDER_IN, H2-BORDER_IN],
             outline=GOLD2, width=2)

# thin inner border
BI2 = 44
d2.rectangle([BI2, BI2, W2-BI2, H2-BI2], outline=MUTED_G, width=1)

# SNS fonts
f_h1    = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 96)
f_h2    = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 80)
f_sub   = fnt('NotoSansJP-VF.ttf', 32)
f_feat  = fnt('NotoSansJP-VF.ttf', 28)
f_brand2= fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 48)
f_url   = fnt('NotoSansJP-VF.ttf', 18)

# series label (top center)
series_lbl = "N's notebook Series"
slbb = d2.textbbox((0,0), series_lbl, font=f_url)
sw = slbb[2] - slbb[0]
d2.text(((W2-sw)//2, 80), series_lbl, font=f_url, fill=MUTED_G)

# decorative rule
rule_y = 115
d2.line([(BI2+20, rule_y), (W2//2-60, rule_y)], fill=MUTED_G, width=1)
d2.line([(W2//2+60, rule_y), (W2-BI2-20, rule_y)], fill=MUTED_G, width=1)
# small diamond ornament
cx2 = W2 // 2
d2.polygon([(cx2, rule_y-5), (cx2+5, rule_y), (cx2, rule_y+5), (cx2-5, rule_y)], fill=GOLD2)

# Main headline lines
lines = ['A6リフィル', '印刷ツール', '公開しました']
font_sizes = [f_h1, f_h1, f_h2]
y_cursor = 155
for i, (line, font) in enumerate(zip(lines, font_sizes)):
    bb = d2.textbbox((0,0), line, font=font)
    lw = bb[2] - bb[0]
    lh = bb[3] - bb[1]
    col = WHITE if i < 2 else CREAM
    d2.text(((W2-lw)//2, y_cursor), line, font=font, fill=col)
    y_cursor += lh + 8

# rule below headline
y_cursor += 16
d2.line([(BI2+40, y_cursor), (W2-BI2-40, y_cursor)], fill=GOLD2, width=1)
y_cursor += 24

# sub
sub_txt = 'ブラウザだけで動作 • 無料'
sbb = d2.textbbox((0,0), sub_txt, font=f_sub)
d2.text(((W2-(sbb[2]-sbb[0]))//2, y_cursor), sub_txt, font=f_sub, fill=CREAM)
y_cursor += (sbb[3]-sbb[1]) + 36

# divider rule + diamonds
d2.line([(BI2+60, y_cursor), (W2-BI2-60, y_cursor)], fill=MUTED_G, width=1)
y_cursor += 30

# Features
feats = [
    'A4 → A6 × 4面 自動配置',
    '日付・時間・メモ欄 自由調整',
    '穴ガイド・透かし対応',
    '日英切替対応',
]
feat_x = (W2 - 400) // 2
for feat in feats:
    d2.text((feat_x, y_cursor), '▸  ' + feat, font=f_feat, fill=CREAM)
    fbb = d2.textbbox((0,0), feat, font=f_feat)
    y_cursor += (fbb[3]-fbb[1]) + 16
y_cursor += 20

# rule above brand
d2.line([(BI2+40, y_cursor), (W2-BI2-40, y_cursor)], fill=GOLD2, width=1)
y_cursor += 32

# N's factory brand
brand_txt = "N's factory"
bbb = d2.textbbox((0,0), brand_txt, font=f_brand2)
d2.text(((W2-(bbb[2]-bbb[0]))//2, y_cursor), brand_txt, font=f_brand2, fill=GOLD3)
y_cursor += (bbb[3]-bbb[1]) + 16

# URL
url_txt = 'you0810jmsdf.github.io/ns-factory'
ubb = d2.textbbox((0,0), url_txt, font=f_url)
d2.text(((W2-(ubb[2]-ubb[0]))//2, y_cursor), url_txt, font=f_url, fill=MUTED_G)

# bottom monitor tag
monitor_txt = '１週間限定 モニター公開中'
mbb = d2.textbbox((0,0), monitor_txt, font=f_sub)
mw = mbb[2]-mbb[0]
my = H2 - BORDER_IN - 62
# pill background
pad = 16
d2.rounded_rectangle([(W2-mw)//2 - pad, my - 6,
                       (W2+mw)//2 + pad, my + (mbb[3]-mbb[1]) + 6],
                      radius=20, fill=GOLD2)
d2.text(((W2-mw)//2, my), monitor_txt, font=f_sub, fill=LEATHER)

out2 = r'C:\Users\nsfactory\OneDrive\レザークラフト\広報部\サイト管理\ns-factory\assets\a6-print-tool-sns.png'
img2.save(out2, 'PNG')
print(f'Image2 saved: {out2}')
print('Done.')
