# make_mascot_transparent.py
# 外周連結白領域のみ透過（フラッドフィル方式）
# rembg 使用禁止 / Pillow のみ使用
# 出力: showroom/assets/mascot/{staffId}.png (幅512px・透過PNG)
#
# ID対応:
#   kojinjigyonusi  <- 個人事業主（幕僚ではない）.png
#   sakusen         <- sakusen.png
#   hannbai         <- hanbai.png      ※ファイル名は hanbai だが staffId は hannbai
#   kanri           <- kanri.png
#   kouhou          <- pr.png          ← 広報幕僚 (pr.png)
#   kouhou_room     <- kouhou.png      ← 後方幕僚 (kouhou.png)
#   hozen           <- hozen.png
#   digital         <- digital-new.png （破綻なければ新版優先）
#   jinji           <- jinji.png
#   kyouiku         <- kyouiku.png

import os, sys
from pathlib import Path
from collections import deque
from PIL import Image

SRC_DIR = Path(r"C:\Users\nsfactory\OneDrive\レザークラフト\広報部\マスコット\20260520-2_髪型髪色差別化")
DST_DIR = Path(r"C:\Users\nsfactory\OneDrive\レザークラフト\デジタル部\サイト管理\ns-factory\showroom\assets\mascot")
TARGET_W = 512
THRESHOLD = 15   # 白(255)からのユークリッド距離閾値

# staffId -> 元ファイル名
ID_MAP = {
    "kojinjigyonusi": "個人事業主（幕僚ではない）.png",
    "sakusen":        "sakusen.png",
    "hannbai":        "hanbai.png",
    "kanri":          "kanri.png",
    "kouhou":         "pr.png",       # 広報幕僚
    "kouhou_room":    "kouhou.png",   # 後方幕僚
    "hozen":          "hozen.png",
    "digital":        "digital-new.png",
    "jinji":          "jinji.png",
    "kyouiku":        "kyouiku.png",
}

DST_DIR.mkdir(parents=True, exist_ok=True)

def is_near_white(r, g, b, thresh):
    return (255 - r)**2 + (255 - g)**2 + (255 - b)**2 <= thresh * thresh * 3

def flood_fill_transparent(img_rgba, thresh):
    """外周から連結している白近傍ピクセルのみAlpha=0にする"""
    pixels = img_rgba.load()
    w, h = img_rgba.size
    visited = [[False]*h for _ in range(w)]
    queue = deque()

    # 外周の白近傍をシードに追加
    for x in range(w):
        for y in [0, h-1]:
            r,g,b,a = pixels[x,y]
            if not visited[x][y] and is_near_white(r,g,b, thresh):
                queue.append((x,y))
                visited[x][y] = True
    for y in range(h):
        for x in [0, w-1]:
            r,g,b,a = pixels[x,y]
            if not visited[x][y] and is_near_white(r,g,b, thresh):
                queue.append((x,y))
                visited[x][y] = True

    # BFS で連結白領域を透過
    count = 0
    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (255, 255, 255, 0)
        count += 1
        for nx, ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                r,g,b,a = pixels[nx,ny]
                if is_near_white(r,g,b, thresh):
                    visited[nx][ny] = True
                    queue.append((nx,ny))
    return count

results = {}
for staff_id, src_name in ID_MAP.items():
    src_path = SRC_DIR / src_name
    dst_path = DST_DIR / f"{staff_id}.png"

    # digital-new.png が存在しない場合 digital.png にフォールバック
    if staff_id == "digital" and not src_path.exists():
        src_path = SRC_DIR / "digital.png"
        print(f"[digital] digital-new.png が見つかりません。digital.png を使用します。")

    if not src_path.exists():
        print(f"[ERROR] ファイルが見つかりません: {src_path}")
        results[staff_id] = "ERROR: file not found"
        continue

    img = Image.open(src_path).convert("RGBA")

    # リサイズ（幅512px基準、縦はアスペクト維持）
    w, h = img.size
    new_h = int(h * TARGET_W / w)
    img = img.resize((TARGET_W, new_h), Image.LANCZOS)

    # フラッドフィル透過
    removed = flood_fill_transparent(img, THRESHOLD)

    img.save(dst_path, "PNG")
    results[staff_id] = f"OK ({TARGET_W}x{new_h}, 透過px={removed})"
    print(f"[{staff_id}] {src_name} -> {dst_path.name}  {results[staff_id]}")

print("\n=== 完了 ===")
for k, v in results.items():
    print(f"  {k}: {v}")
