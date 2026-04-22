"""Generate weekly-block-main.png for N's factory LP."""
from PIL import Image, ImageDraw, ImageFont
import math

FD = 'C:/Windows/Fonts/'

def fnt(name, size):
    for n in ([name] if isinstance(name, str) else name):
        try:
            return ImageFont.truetype(FD + n, size)
        except:
            pass
    return ImageFont.load_default()

# ── Colors ──────────────────────────────────────────────────────
BG          = (243, 236, 228)
WHITE       = (255, 255, 255)
DARK        = ( 42,  35,  28)
DARK_BROWN  = (122,  85,  64)
ACCENT      = (160, 120,  90)
GRAY        = (150, 140, 130)
GRAY_LIGHT  = (225, 218, 210)
SUN_RED     = (192,  57,  43)
SAT_BLUE    = ( 36, 113, 163)
CARD_STROKE = (215, 205, 195)
PILL_BG     = (240, 232, 222)
SHADOW      = (205, 192, 178)

W, H = 720, 480
img = Image.new('RGB', (W, H), BG)
d   = ImageDraw.Draw(img)

# ── Fonts ───────────────────────────────────────────────────────
f_brand = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 13)
f_label = fnt('NotoSansJP-VF.ttf', 11)
f_body  = fnt('NotoSansJP-VF.ttf', 12)
f_tag   = fnt('NotoSansJP-VF.ttf', 10)
f_tiny  = fnt('NotoSansJP-VF.ttf',  9)
f_h2    = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 28)
f_price = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 18)
f_badge = fnt('NotoSansJP-VF.ttf', 10)

# ── Main Card ───────────────────────────────────────────────────
CX, CY, CW, CH, CR = 20, 20, W-40, H-40, 18
d.rounded_rectangle([CX+5, CY+5, CX+CW+5, CY+CH+5], radius=CR, fill=SHADOW)
d.rounded_rectangle([CX, CY, CX+CW, CY+CH], radius=CR, fill=WHITE, outline=CARD_STROKE, width=1)

# ── Left: Text Content ──────────────────────────────────────────
LX = CX + 28
LY = CY + 28

# Logo
d.text((LX, LY), "N's factory", font=f_brand, fill=DARK_BROWN)

# Badge (top-right of card interior)
badge = 'Weekly Block'
bbb = d.textbbox((0,0), badge, font=f_badge)
bw = bbb[2]-bbb[0]
bx = CX + CW - 24 - bw
by = LY - 1
d.rounded_rectangle([bx-7, by-3, bx+bw+7, by+15], radius=8, fill=WHITE, outline=ACCENT, width=1)
d.text((bx, by), badge, font=f_badge, fill=ACCENT)

# Divider
LY += 22
d.line([(LX, LY), (CX + CW//2 - 20, LY)], fill=GRAY_LIGHT, width=1)
LY += 14

# Label
d.text((LX, LY), 'リフィル印刷ツール', font=f_label, fill=GRAY)
LY += 20

# Title (2 lines)
d.text((LX, LY), '週間ブロック', font=f_h2, fill=DARK)
LY += 38
d.text((LX, LY), 'A6リフィル', font=f_h2, fill=DARK)
LY += 40

# Description
for line in ['曜日ブロック型スケジュール帳を自由にカスタマイズ。', 'ブラウザで完結、印刷ボタン1クリックで出力。']:
    d.text((LX, LY), line, font=f_body, fill=(100, 90, 80))
    LY += 18
LY += 8

# Pills (2×2)
pills = ['月曜/日曜始まり', '土日カラー対応', '月次一括印刷', '日英切替対応']
for i, txt in enumerate(pills):
    pbb = d.textbbox((0,0), txt, font=f_tag)
    pw, ph = pbb[2]-pbb[0], pbb[3]-pbb[1]
    px = LX + (i % 2) * 165
    py = LY + (i // 2) * 28
    d.rounded_rectangle([px-6, py-4, px+pw+6, py+ph+4], radius=10, fill=PILL_BG)
    d.text((px, py), txt, font=f_tag, fill=DARK_BROWN)
LY += 65

# Free label
d.text((LX, LY), '無料公開中', font=f_price, fill=DARK_BROWN)
fb = d.textbbox((0,0), '無料公開中', font=f_price)
fw = fb[2]-fb[0]
d.text((LX + fw + 10, LY + 5), '— ブラウザで動作・インストール不要', font=f_tiny, fill=GRAY)

# ── Right: Weekly Page Mockup ───────────────────────────────────
MX = CX + CW // 2 + 20   # mockup area left
MW = CW // 2 - 30
MCX = MX + MW // 2 + 10
MCY = CY + CH // 2 + 5

PW, PH = 175, 245
TILT = 6  # degrees

def rotated_polygon(cx, cy, w, h, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    pts = [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]
    return [(cx + x*ca - y*sa, cy + x*sa + y*ca) for x,y in pts]

# Shadow
for i in range(6, 0, -1):
    alpha = int(40 + i * 8)
    sc = tuple(max(0, c - 30 + i*4) for c in SHADOW)
    d.polygon(rotated_polygon(MCX+8, MCY+8, PW+i, PH+i, -TILT), fill=sc)

# Back card (tilted more)
d.polygon(rotated_polygon(MCX+4, MCY+3, PW, PH, -TILT-4), fill=(232, 224, 214))
d.polygon(rotated_polygon(MCX+4, MCY+3, PW, PH, -TILT-4), outline=CARD_STROKE, width=1)

# Draw weekly page content on a temp surface, then rotate & paste
SCALE = 3
TW, TH = PW * SCALE, PH * SCALE
tmp = Image.new('RGBA', (TW, TH), (0,0,0,0))
td  = ImageDraw.Draw(tmp)

# card background
td.rectangle([0,0,TW-1,TH-1], fill=WHITE)
td.rectangle([0,0,TW-1,TH-1], outline=(210,200,190), width=2)

# Week header
HDR_H = 24 * SCALE
td.rectangle([0, 0, TW-1, HDR_H-1], fill=DARK)

tf_hdr   = fnt('NotoSansJP-VF.ttf', 9)
tf_month = fnt(['NotoSerifJP-VF.ttf', 'yumin.ttf'], 16)
tf_dnum  = fnt(['YuGothB.ttc','BIZ-UDGothicB.ttc'], 14)
tf_wd    = fnt('NotoSansJP-VF.ttf', 8)
tf_week  = fnt('NotoSansJP-VF.ttf', 8)

td.text((8*SCALE//SCALE, 7*SCALE//SCALE), '4/21 – 4/27', font=tf_hdr, fill=WHITE)
# W## label
td.text((8, 7+14), 'W17', font=tf_week, fill=(120,110,100))
# Month abbr
mbb = td.textbbox((0,0), 'APR', font=tf_month)
td.text((TW - mbb[2]-mbb[0] - 16, 5), 'APR', font=tf_month, fill=(120,110,100))

# Day rows
DAYS = [
    (21,'月',DARK,(255,255,255)),
    (22,'火',DARK,(255,255,255)),
    (23,'水',DARK,(255,255,255)),
    (24,'木',DARK,(255,255,255)),
    (25,'金',DARK,(255,255,255)),
    (26,'土',SAT_BLUE,(240,244,255)),
    (27,'日',SUN_RED,(255,240,240)),
]
ROW_H = (TH - HDR_H) // 7
LBL_W = 22 * SCALE // SCALE

for i, (dnum, wd, dcol, bg) in enumerate(DAYS):
    ry = HDR_H + i * ROW_H
    # background
    if bg != (255,255,255):
        td.rectangle([0, ry, TW-1, ry+ROW_H-1], fill=bg)
    # bottom separator
    if i < 6:
        td.line([(0, ry+ROW_H), (TW-1, ry+ROW_H)], fill=(215,210,205), width=1)
    # label/content divider
    td.line([(LBL_W, ry), (LBL_W, ry+ROW_H)], fill=(210,205,200), width=1)
    # date number
    td.text((4, ry + 3), str(dnum), font=tf_dnum, fill=dcol)
    # weekday
    td.text((4, ry + 20), wd, font=tf_wd, fill=dcol)
    # ruling lines (3 per row)
    for li in range(1, 4):
        ly = ry + li * ROW_H // 4
        td.line([(LBL_W + 4, ly), (TW - 6, ly)], fill=(228,222,215), width=1)

# Rotate and paste
rotated = tmp.rotate(TILT, resample=Image.BICUBIC, expand=True)
rw, rh = int(PW*1.05), int(PH*1.05)
rotated = rotated.resize((rw, rh), Image.LANCZOS)
px = MCX - rw//2
py = MCY - rh//2
img.paste(rotated, (px, py), rotated)

# Redraw main card border on top
d.rounded_rectangle([CX, CY, CX+CW, CY+CH], radius=CR, outline=CARD_STROKE, width=1)

# ── Save ────────────────────────────────────────────────────────
out = r'C:\Users\nsfactory\OneDrive\レザークラフト\広報部\サイト管理\ns-factory\assets\weekly-block-main.png'
img.save(out, 'PNG')
print(f'Saved: {out}')
