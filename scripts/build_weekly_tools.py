"""ツール人気ランキング（週1回SNS配信）の画像と投稿文を作る。

作品集閲覧ランキング（build_weekly_top.py）のツール版。2026-11-12 事業主指示。

流れ:
  1. weekly-tools/config.json と weekly-tools/catalog.json（紹介するツールの台帳）を読む
  2. アクセスカウンターGASの action=daily から、過去 N 日（今日を除く）のページ別の人数を取る
     （事業主の端末・自動操作の閲覧は access-counter.js 側で数えていない）
  3. 台帳のツールごとに人数を合計し、上位3つを、ロゴ・使用画面・特徴つきで1枚のJPEG（1080x1350）にする
  4. weekly-tools/latest.json に投稿文3種（Threads / Facebook / Instagram）と画像URLを書く

投稿は SNS投稿GAS（sns-gas-nsfactory/WeeklyTools.gs）が latest.json を読んで行う。
latest.json の post が true のときだけ投稿される。手元での試し実行は既定で false。

⛔ 台帳に無いページ（入口の tools/・digital-room/ など）は数えない。新しいツールを紹介したいときは
   catalog.json に1件足し、ロゴと使用画面を assets/weekly-tools/ に置く（無いと生成が止まる）。

使い方:
  py scripts/build_weekly_tools.py                     # 試し（post=false）
  py scripts/build_weekly_tools.py --post              # 定期実行用（post=true）
  py scripts/build_weekly_tools.py --out <フォルダ>     # 出力先を変える（手元確認用）
  py scripts/build_weekly_tools.py --data <json>       # action=daily の応答を手元のファイルから読む（確認用）
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta

from PIL import Image, ImageDraw, ImageOps

from build_weekly_top import (BG, GOLD, GRAY, H, JST, SITE, THREADS_MAX, W, WHITE,
                              draw_center, fetch, fit_text, font)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COUNTER_GAS = ("https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-"
               "RTbFvZwOzHL3JHWEVRIQ/exec")
PANEL = (27, 24, 20)
LINE = (70, 60, 46)


def fetch_daily(days):
    url = f"{COUNTER_GAS}?action=daily&days={days}"
    for i in range(5):
        body, _ = fetch(url)
        try:
            data = json.loads(body.decode("utf-8"))
        except ValueError:
            print(f"  JSONでない応答（{i + 1}/5）。取り直します")  # GASは200でもHTMLを返すことがある
            time.sleep(20)
            continue
        if not data.get("ok"):
            raise RuntimeError(f"アクセス日次APIがエラー: {data.get('error')}")
        return data
    raise RuntimeError("アクセス日次APIからJSONが返りませんでした")


def norm_page(p):
    p = str(p or "").strip().lstrip("/")
    if p.endswith("/") or p == "":
        p += "index.html"
    return p


def rank_tools(rows, catalog, start, end):
    """期間内の行を台帳のツールごとに合計する。戻り値は人数の多い順（同数は閲覧数・台帳の順）。"""
    tools = [dict(t, _re=[re.compile(x) for x in t["pages"]], uu=0, pv=0, _order=i)
             for i, t in enumerate(catalog["tools"])]
    for r in rows:
        if not (start <= r.get("date", "") <= end):
            continue
        page = norm_page(r.get("page"))
        for t in tools:
            if any(rx.fullmatch(page) for rx in t["_re"]):
                t["uu"] += int(r.get("uu") or 0)
                t["pv"] += int(r.get("pv") or 0)
                break
    used = [t for t in tools if t["uu"] > 0]
    used.sort(key=lambda t: (-t["uu"], -t["pv"], t["_order"]))
    return used


def wrap(draw, text, fnt, max_w, max_lines):
    """日本語を1文字ずつ詰めて折り返す。入りきらない最終行は … で切る。"""
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=fnt) <= max_w:
            cur += ch
            continue
        lines.append(cur)
        cur = ch
        if len(lines) == max_lines:
            break
    else:
        if cur:
            lines.append(cur)
        return lines
    lines[-1] = fit_text(draw, lines[-1] + "…" * 2, fnt, max_w)
    return lines


def load_asset(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        raise RuntimeError(f"台帳の画像がありません: {rel}")
    return Image.open(path).convert("RGB")


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = Image.new("RGB", img.size, PANEL)
    out.paste(img, (0, 0), mask)
    return out


def draw_card(canvas, box, rank, tool):
    x, y, w, h = box
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([x, y, x + w, y + h], 18, fill=PANEL, outline=GOLD if rank == 1 else LINE, width=2)

    pad = 20
    # 左：使用画面（16:10）
    sw = 440
    sh = h - pad * 2
    shot = ImageOps.fit(load_asset(tool["shot"]), (sw, sh), Image.LANCZOS, centering=(0.5, 0.0))
    canvas.paste(rounded(shot, 10), (x + pad, y + pad))
    # 順位の札（画面の左上に重ねる）
    f_rank = font("serif_bold", 34)
    label = f"No.{rank}"
    lw = int(d.textlength(label, font=f_rank)) + 28
    d.rounded_rectangle([x + pad, y + pad, x + pad + lw, y + pad + 54], 10, fill=(14, 13, 11))
    d.text((x + pad + 14, y + pad + 6), label, font=f_rank, fill=GOLD)

    # 右：ロゴ・名前・特徴
    tx = x + pad + sw + 24
    tw = x + w - pad - tx
    logo = ImageOps.fit(load_asset(tool["logo"]), (96, 96), Image.LANCZOS)
    canvas.paste(rounded(logo, 14), (tx, y + pad))
    f_name = font("serif_bold", 32)
    f_tag = font("sans", 20)
    nx = tx + 110
    d.text((nx, y + pad + 4), fit_text(d, tool["name"], f_name, tw - 110), font=f_name, fill=WHITE)
    tag_lines = wrap(d, tool["tagline"], f_tag, tw - 110, 2)
    for i, ln in enumerate(tag_lines):
        d.text((nx, y + pad + 50 + i * 26), ln, font=f_tag, fill=GRAY)

    f_pt = font("sans", 21)
    f_only = font("sans", 21)
    only = wrap(d, tool["only"], f_only, tw - 26, 2)
    oy = y + h - pad - len(only) * 29 - 4          # ★の行（下端にそろえる）
    room = oy - 14 - (y + pad + 116)                # 特徴に使える高さ
    pts = [wrap(d, pt, f_pt, tw - 22, 2) for pt in tool["points"][:2]]
    if sum(len(p) * 29 + 4 for p in pts) > room:    # 入らなければ1行ずつに詰める（★の行と重ねない）
        pts = [wrap(d, pt, f_pt, tw - 22, 1) for pt in tool["points"][:2]]
    cy = y + pad + 116
    for lines in pts:
        for i, ln in enumerate(lines):
            if i == 0:
                d.text((tx, cy), "・", font=f_pt, fill=GOLD)
            d.text((tx + 22, cy), ln, font=f_pt, fill=WHITE)
            cy += 29
        cy += 4
    d.line([(tx, oy - 10), (x + w - pad, oy - 10)], fill=LINE, width=1)
    for i, ln in enumerate(only):
        if i == 0:
            d.text((tx, oy), "★", font=f_only, fill=GOLD)
        d.text((tx + 26, oy), ln, font=f_only, fill=GOLD)
        oy += 29


def build_image(top, period_line, cfg):
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)
    t = cfg["text"]
    draw_center(d, 54, "TOOL RANKING", font("serif", 26), GOLD, spacing=6)
    draw_center(d, 96, t["title"], font("serif_bold", 58), WHITE)
    draw_center(d, 178, f"{period_line}　{t['metricLine']}", font("sans", 26), GRAY)
    d.line([(W / 2 - 60, 230), (W / 2 + 60, 230)], fill=GOLD, width=2)

    margin, gap, top_y, bottom = 40, 22, 256, 1246
    n = len(top)
    ch = (bottom - top_y - gap * 2) // 3
    for i, tool in enumerate(top):
        draw_card(canvas, (margin, top_y + i * (ch + gap), W - margin * 2, ch), i + 1, tool)
    if n < 3:
        draw_center(d, top_y + n * (ch + gap) + ch // 2 - 20, "ほかのツールも、ツール一覧からどうぞ", font("sans", 26), GRAY)

    draw_center(d, 1268, t["footer"], font("sans", 24), GRAY)
    draw_center(d, 1302, "N's factory", font("serif", 30), GOLD)
    return canvas


def build_texts(cfg, top, period_line, with_urls):
    t = cfg["text"]
    head = [f"{t['title']}（{period_line}）", "", t["intro"].replace("{n}", str(len(top))), ""]
    body = []
    for i, tool in enumerate(top):
        body.append(f"{i + 1}位　{tool['name']}")
        body.append(tool["caption"])
        if with_urls:
            body.append(tool["url"])
        body.append("")
    common = head + body + [t["outro"], ""]
    with_link = "\n".join(common + ([] if with_urls else [t["linkLine"], cfg["toolsUrl"]]))
    insta_body = []
    for i, tool in enumerate(top):
        insta_body += [f"{i + 1}位　{tool['name']}", tool["caption"], ""]
    instagram = "\n".join(head + insta_body + [t["outro"], "", t["instagramLinkLine"]])
    return with_link.rstrip("\n"), instagram


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--post", action="store_true", help="latest.json を投稿対象にする（定期実行用）")
    ap.add_argument("--out", default=os.path.join(ROOT, "weekly-tools"), help="出力先フォルダ")
    ap.add_argument("--data", help="action=daily の応答JSON（手元確認用）")
    args = ap.parse_args()

    base = os.path.join(ROOT, "weekly-tools")
    with open(os.path.join(base, "config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    with open(os.path.join(base, "catalog.json"), encoding="utf-8") as f:
        catalog = json.load(f)
    days = max(1, min(int(cfg.get("periodDays", 7)), 60))
    top_n = max(1, min(int(cfg.get("topN", 3)), 3))
    if not re.fullmatch(r"([01]?\d|2[0-3]):[0-5]\d", str(cfg.get("postTime", "20:00"))):
        print(f"config.json の postTime が時刻の形ではありません: {cfg.get('postTime')!r}")
        return 1

    for tool in catalog["tools"]:  # 画像の有無を先に確かめる（投稿の直前に欠けて気付くのを防ぐ）
        load_asset(tool["logo"]), load_asset(tool["shot"])

    now = datetime.now(JST)
    end_d = now.date() - timedelta(days=1)          # 今日は途中なので数えない
    start_d = end_d - timedelta(days=days - 1)
    if args.data:
        with open(args.data, encoding="utf-8") as f:
            data = json.load(f)
    else:
        print(f"アクセス日次を取得: {start_d}〜{end_d}")
        data = fetch_daily(days + 1)
    ranked = rank_tools(data.get("rows", []), catalog, start_d.isoformat(), end_d.isoformat())
    top = ranked[:top_n]
    for t in ranked[:8]:
        print(f"  {t['uu']:>4}人 {t['pv']:>4}回  {t['name']}")
    if not top:
        print("台帳のツールの利用がありません。latest.json は更新しません。")
        return 0

    period_line = f"過去{days}日間・{start_d.month}/{start_d.day}〜{end_d.month}/{end_d.day}"
    img = build_image(top, period_line, cfg)

    with_link, instagram = build_texts(cfg, top, period_line, with_urls=True)
    if len(with_link) > THREADS_MAX:
        with_link, _ = build_texts(cfg, top, period_line, with_urls=False)
    if len(with_link) > THREADS_MAX:
        print(f"投稿文が{len(with_link)}字でThreadsの上限を超えます。台帳の caption を短くしてください。")
        return 1
    if "http" in instagram or "#" in instagram or "＃" in instagram or "#" in with_link:
        print("Instagram文にURL、またはどこかに # が残っています。中止します。")
        return 1

    week_id = now.strftime("%Y-%m-%d")
    os.makedirs(os.path.join(args.out, "img"), exist_ok=True)
    img_rel = f"img/{week_id}.jpg"
    img.save(os.path.join(args.out, img_rel), "JPEG", quality=88, optimize=True, progressive=False)

    latest = {
        "weekId": week_id,
        "post": bool(args.post),
        "generatedAt": now.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "settings": {"periodDays": days, "topN": top_n},
        "period": {"from": start_d.isoformat(), "to": end_d.isoformat()},
        "items": [{"rank": i + 1, "id": t["id"], "name": t["name"], "uu": t["uu"]} for i, t in enumerate(top)],
        "image": f"{SITE}/weekly-tools/{img_rel}",
        "postTime": str(cfg.get("postTime", "20:00")),
        "platforms": cfg.get("platforms", {"threads": True, "instagram": True, "facebook": True}),
        "text": {"threads": with_link, "facebook": with_link, "instagram": instagram},
    }
    with open(os.path.join(args.out, "latest.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(latest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"作成: {img_rel}・投稿文 {len(with_link)}字 / Instagram {len(instagram)}字・post={latest['post']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
