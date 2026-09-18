"""作品集閲覧ランキング（週1回SNS配信）の画像と投稿文を作る。

流れ:
  1. weekly-top/config.json を読む（期間・指標・件数などはここで変える）
  2. 商品登録GASの api=rankingBy から順位を取る（作家自身の閲覧は除外済み・人数は返らない）
  3. works-data.json と突き合わせ、上位の写真を1枚のJPEG（1080x1350）に合成する
  4. weekly-top/latest.json に投稿文3種（Threads / Facebook / Instagram）と画像URLを書く

投稿そのものは SNS投稿GAS（sns-gas-nsfactory/WeeklyTop.gs）が latest.json を読んで行う。
latest.json の post が true のときだけ投稿される。手元での試し実行や手動実行は既定で false。

使い方:
  py scripts/build_weekly_top.py                     # 試し（post=false）
  py scripts/build_weekly_top.py --post              # 定期実行用（post=true）
  py scripts/build_weekly_top.py --out <フォルダ>     # 出力先を変える（手元確認用）
"""

import argparse
import io
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://you0810jmsdf.github.io/ns-factory"
GAS = "https://script.google.com/macros/s/AKfycbw-ghhuzw8WYH7w4Png96Qt3s5EYbVaK_P32UJvqvhr28Ck2mxQJkedbAimogVHExeouw/exec"
JST = timezone(timedelta(hours=9))
UA = "Mozilla/5.0 (ns-factory weekly-top)"

THREADS_MAX = 500

W, H = 1080, 1350
BG = (14, 13, 11)
GOLD = (201, 169, 110)
WHITE = (240, 236, 228)
GRAY = (150, 144, 134)


def fetch(url, tries=5, wait=20, timeout=90):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read(), r.headers.get("Content-Type", "")
        except Exception as e:  # GASは間欠的に落ちるので待って取り直す
            last = e
            print(f"  取得失敗（{i + 1}/{tries}）: {e}")
            if i < tries - 1:
                time.sleep(wait)
    raise RuntimeError(f"取得できませんでした: {url} ({last})")


def fetch_ranking(days, metric, limit):
    url = f"{GAS}?api=rankingBy&days={days}&metric={metric}&limit={limit}"
    for i in range(5):
        body, _ = fetch(url)
        try:
            data = json.loads(body.decode("utf-8"))
        except ValueError:
            # 200でもHTMLが返ることがある（GASの既知の不調）
            print(f"  JSONでない応答（{i + 1}/5）。取り直します")
            time.sleep(20)
            continue
        if not data.get("ok"):
            raise RuntimeError(f"ランキングAPIがエラー: {data.get('error')}")
        return data
    raise RuntimeError("ランキングAPIからJSONが返りませんでした")


def photo_url(main_photo):
    """build_work_pages.js の ogImage と同じ変換（DriveのサムネイルURL→転送なしの直URL）。"""
    import re
    url = str(main_photo or "")
    if not url:
        return ""
    m = re.search(r"[?&]id=([A-Za-z0-9_-]+)", url)
    if m:
        return f"https://lh3.googleusercontent.com/d/{m.group(1)}=w1200"
    return re.sub(r"([?&]sz=)w\d+", r"\1w1200", url)


def font_path(kind):
    cands = {
        "serif": [
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
            "C:/Windows/Fonts/yumin.ttf",
            "C:/Windows/Fonts/NotoSerifJP-VF.ttf",
        ],
        "serif_bold": [
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
            "C:/Windows/Fonts/yumindb.ttf",
            "C:/Windows/Fonts/yumin.ttf",
        ],
        "sans": [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "C:/Windows/Fonts/YuGothM.ttc",
            "C:/Windows/Fonts/meiryo.ttc",
        ],
    }[kind]
    for p in cands:
        if os.path.exists(p):
            return p
    raise RuntimeError(f"日本語フォントが見つかりません（{kind}）")


def font(kind, size):
    return ImageFont.truetype(font_path(kind), size)


def cover(img, w, h):
    return ImageOps.fit(img.convert("RGB"), (w, h), Image.LANCZOS, centering=(0.5, 0.5))


def fit_text(draw, text, fnt, max_w):
    if draw.textlength(text, font=fnt) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=fnt) > max_w:
        text = text[:-1]
    return text + "…"


def draw_center(draw, y, text, fnt, fill, spacing=0):
    if spacing:
        widths = [draw.textlength(c, font=fnt) for c in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = (W - total) / 2
        for c, cw in zip(text, widths):
            draw.text((x, y), c, font=fnt, fill=fill)
            x += cw + spacing
    else:
        tw = draw.textlength(text, font=fnt)
        draw.text(((W - tw) / 2, y), text, font=fnt, fill=fill)


def label(canvas, box, rank, name, big):
    """写真の下端に順位と作品名を重ねる（下から暗くするグラデーション）。"""
    x, y, w, h = box
    gh = int(h * (0.42 if big else 0.5))
    grad = Image.new("L", (1, gh))
    for i in range(gh):
        grad.putpixel((0, i), int(215 * (i / gh) ** 1.4))
    grad = grad.resize((w, gh))
    shade = Image.new("RGB", (w, gh), (0, 0, 0))
    canvas.paste(shade, (x, y + h - gh), grad)

    d = ImageDraw.Draw(canvas)
    f_rank = font("serif_bold", 46 if big else 36)
    f_name = font("sans", 28 if big else 22)
    pad = 26 if big else 18
    name_y = y + h - pad - (34 if big else 28)
    rank_y = name_y - (58 if big else 46)
    d.text((x + pad, rank_y), f"No.{rank}", font=f_rank, fill=GOLD)
    d.text((x + pad, name_y), fit_text(d, name, f_name, w - pad * 2), font=f_name, fill=WHITE)


def build_image(items, photos, sub_line, title):
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)
    draw_center(d, 62, "WORKS RANKING", font("serif", 26), GOLD, spacing=6)
    draw_center(d, 106, title, font("serif_bold", 60), WHITE)
    draw_center(d, 192, sub_line, font("sans", 28), GRAY)
    d.line([(W / 2 - 60, 250), (W / 2 + 60, 250)], fill=GOLD, width=2)

    margin, gap, top, bottom = 60, 24, 282, 1236
    n = len(photos)
    if n == 1:
        boxes = [(margin, top, W - margin * 2, bottom - top)]
    else:
        hero_h = 600
        boxes = [(margin, top, W - margin * 2, hero_h)]
        cols = n - 1
        cw = (W - margin * 2 - gap * (cols - 1)) // cols
        for c in range(cols):
            boxes.append((margin + c * (cw + gap), top + hero_h + gap, cw, bottom - top - hero_h - gap))

    for i, (item, img) in enumerate(zip(items, photos)):
        x, y, w, h = boxes[i]
        canvas.paste(cover(img, w, h), (x, y))
        label(canvas, boxes[i], item["rank"], item["name"], big=(i == 0))

    draw_center(d, 1262, "N's factory", font("serif", 32), GOLD)
    return canvas


def clean_name(name):
    # ハッシュタグ全面禁止（2026-09-18）。名前に # が入っていてもタグにならないよう外す
    # アンダーバーは空白にする（事業主指示 2026-09-18・作品名はそれ以外そのまま）
    name = str(name).replace("#", "").replace("＃", "").replace("_", " ")
    return " ".join(name.split())


def short(name, n):
    return name if len(name) <= n else name[: n - 1] + "…"


def build_texts(cfg, items, period_line, name_max):
    t = cfg["text"]
    intro = (t["introPv"] if cfg["metric"] == "pv" else t["introVv"]).replace("{n}", str(len(items)))
    lines = [f"{it['rank']}位　{short(it['name'], name_max)}" for it in items]
    head = [f"{t['title']}（{period_line}）", "", intro, "", *lines, "", t["outro"], ""]
    with_link = "\n".join(head + [t["linkLine"], cfg["worksUrl"]])
    instagram = "\n".join(head + [t["instagramLinkLine"]])
    return with_link, instagram


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--post", action="store_true", help="latest.json を投稿対象にする（定期実行用）")
    ap.add_argument("--out", default=os.path.join(ROOT, "weekly-top"), help="出力先フォルダ")
    args = ap.parse_args()

    with open(os.path.join(ROOT, "weekly-top", "config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    days = int(cfg.get("periodDays", 7))
    metric = "pv" if cfg.get("metric") == "pv" else "vv"
    top_n = max(1, min(int(cfg.get("topN", 10)), 30))
    photo_n = max(1, min(int(cfg.get("photoCount", 3)), 3))
    cfg["metric"] = metric
    import re
    if not re.fullmatch(r"([01]?\d|2[0-3]):[0-5]\d", str(cfg.get("postTime", "20:00"))):
        print(f"config.json の postTime が時刻の形ではありません: {cfg.get('postTime')!r}（例: \"20:00\"）")
        return 1

    with open(os.path.join(ROOT, "works-data.json"), encoding="utf-8") as f:
        works = {str(w["id"]): w for w in json.load(f)}

    print(f"ランキング取得: 期間{days or '全'}日・{metric}・上位{top_n}")
    data = fetch_ranking(days, metric, 50)

    items = []
    for r in data.get("ranking", []):
        w = works.get(str(r.get("id") or ""))
        if cfg.get("onlyInWorks", True) and not w:
            continue
        if cfg.get("excludeSoldout") and w and w.get("soldout"):
            continue
        items.append({"id": r.get("id") or "", "name": clean_name(r.get("name") or (w or {}).get("name", "")),
                      "photo": photo_url((w or {}).get("mainPhoto"))})
        if len(items) >= top_n:
            break
    for i, it in enumerate(items):
        it["rank"] = i + 1
    if not items:
        print("対象の作品がありません。latest.json は更新しません。")
        return 0

    photos, photo_items = [], []
    for it in items:
        if len(photos) >= photo_n:
            break
        if not it["photo"]:
            continue
        try:
            body, ctype = fetch(it["photo"], tries=3, wait=5, timeout=60)
            photos.append(Image.open(io.BytesIO(body)))
            photo_items.append(it)
        except Exception as e:
            print(f"  写真を取れず飛ばします: {it['id']} ({e})")
    if not photos:
        print("写真が1枚も取れませんでした。latest.json は更新しません。")
        return 1

    now = datetime.now(JST)
    week_id = now.strftime("%Y-%m-%d")
    if days > 0:
        start = now - timedelta(days=days)
        period_line = f"過去{days}日間・{start.month}/{start.day}〜{now.month}/{now.day}"
    else:
        period_line = f"これまでの累計・{now.month}/{now.day}時点"
    metric_line = "見てくださった方の人数順" if metric == "vv" else "閲覧回数順"

    img = build_image(photo_items, photos, f"{period_line}　{metric_line}", cfg["text"]["title"])

    name_max = int(cfg.get("nameMaxLength", 28))
    while True:
        with_link, instagram = build_texts(cfg, items, period_line, name_max)
        if len(with_link) <= THREADS_MAX or name_max <= 10:
            break
        name_max -= 2  # Threads の500字に収まるまで作品名を詰める
    if len(with_link) > THREADS_MAX:
        print(f"投稿文が{len(with_link)}字でThreadsの上限を超えます。topN を減らしてください。")
        return 1
    if "http" in instagram or "#" in instagram or "#" in with_link:
        print("Instagram文にURL、またはどこかに # が残っています。中止します。")
        return 1

    os.makedirs(os.path.join(args.out, "img"), exist_ok=True)
    img_rel = f"img/{week_id}.jpg"
    img.save(os.path.join(args.out, img_rel), "JPEG", quality=88, optimize=True, progressive=False)

    latest = {
        "weekId": week_id,
        "post": bool(args.post),
        "generatedAt": now.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "settings": {"periodDays": days, "metric": metric, "topN": top_n, "photoCount": photo_n,
                     "excludeSoldout": bool(cfg.get("excludeSoldout")), "onlyInWorks": bool(cfg.get("onlyInWorks", True))},
        "period": {"from": data.get("from", ""), "to": data.get("to", "")},
        "items": [{"rank": it["rank"], "id": it["id"], "name": it["name"]} for it in items],
        "image": f"{SITE}/weekly-top/{img_rel}",
        "postTime": str(cfg.get("postTime", "20:00")),
        "platforms": cfg.get("platforms", {"threads": True, "instagram": True, "facebook": True}),
        "text": {"threads": with_link, "facebook": with_link, "instagram": instagram},
    }
    with open(os.path.join(args.out, "latest.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(latest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"作成: {img_rel}（写真{len(photos)}枚）・投稿文 {len(with_link)}字 / Instagram {len(instagram)}字・post={latest['post']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
