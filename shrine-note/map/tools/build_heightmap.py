"""国土地理院「標高タイル(dem_png)」を1枚の高さ画像(heightmap.png)にまとめる。
出典: 国土地理院 https://maps.gsi.go.jp/development/ichiran.html (標高タイル)
符号化: 8bit グレー  v = sqrt(標高m / 3776) * 255  (海=0, 陸は最低1)。画面側で 標高=(v/255)^2*3776。
使い方: py build_heightmap.py   (標高タイルを取得するのでネット接続が必要)
"""
import math, io, urllib.request, os
import numpy as np
from PIL import Image

Z = 7
LON0, LON1, LAT0, LAT1 = 128.0, 146.0, 30.0, 45.9   # 九州〜北海道（沖縄・小笠原は含めない）
OUT_W = 1024
HMAX = 3776.0

def tx(lon, z): return (lon + 180.0) / 360.0 * (2 ** z)
def ty(lat, z):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * (2 ** z)

x0, x1 = tx(LON0, Z), tx(LON1, Z)
y0, y1 = ty(LAT1, Z), ty(LAT0, Z)
ix0, ix1, iy0, iy1 = int(x0), int(x1), int(y0), int(y1)
W = (ix1 - ix0 + 1) * 256
H = (iy1 - iy0 + 1) * 256
elev = np.zeros((H, W), dtype=np.float32)

for ix in range(ix0, ix1 + 1):
    for iy in range(iy0, iy1 + 1):
        url = f"https://cyberjapandata.gsi.go.jp/xyz/dem_png/{Z}/{ix}/{iy}.png"
        try:
            data = urllib.request.urlopen(url, timeout=30).read()
        except Exception:
            continue  # 海のみのタイルは存在しない
        a = np.array(Image.open(io.BytesIO(data)).convert("RGB"), dtype=np.int64)
        v = a[..., 0] * 65536 + a[..., 1] * 256 + a[..., 2]
        h = np.where(v < 2 ** 23, v * 0.01, np.where(v > 2 ** 23, (v - 2 ** 24) * 0.01, 0.0))
        h[v == 2 ** 23] = 0.0   # 無効値(海)
        elev[(iy - iy0) * 256:(iy - iy0 + 1) * 256, (ix - ix0) * 256:(ix - ix0 + 1) * 256] = np.maximum(h, 0)

cx0, cx1 = int((x0 - ix0) * 256), int((x1 - ix0) * 256)
cy0, cy1 = int((y0 - iy0) * 256), int((y1 - iy0) * 256)
elev = elev[cy0:cy1, cx0:cx1]
enc = np.sqrt(np.clip(elev / HMAX, 0, 1)) * 255.0
enc = np.where(elev > 0.5, np.maximum(enc, 1), 0)
img = Image.fromarray(enc.astype(np.uint8), "L")
out_h = round(OUT_W * img.height / img.width)
img = img.resize((OUT_W, out_h), Image.BILINEAR)
here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, "..", "data", "heightmap.png")
img.save(path, optimize=True)
print("saved", path, img.size, os.path.getsize(path), "bytes")
# 範囲(メルカトルのタイル座標)を画面側が使う
print({"lon0": LON0, "lon1": LON1, "lat0": LAT0, "lat1": LAT1})
