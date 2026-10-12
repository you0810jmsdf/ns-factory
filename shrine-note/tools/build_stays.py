"""神社の座標から近くの宿を楽天トラベルAPIで探し、shrine-note/stays.json を作る。

使い方:
  py tools/build_stays.py                      全神社を取り直す（全社上書き）
  py tools/build_stays.py kashima katori       指定した神社だけ取り直して、ほかはそのまま残す
  py tools/build_stays.py --missing            stays.json に無い神社だけ取り足す（自動実行用）
鍵の読み方は affiliate_common.py を参照。金額は保存しない。
"""
import json, re, sys, time, unicodedata, urllib.request, urllib.parse, urllib.error

import affiliate_common as C

API = "https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426"
HITS = 30         # 検索で取る件数（APIの上限）
SHOW = 3          # 載せる件数
MIN_REVIEWS = 10  # 口コミがこの件数以上
MIN_AVG = 3.5     # 評価がこの値以上
RADIUS_KM = 3     # 神社からの検索半径（最大3）
MAX_PAGES = 6     # 条件に合う宿が足りないときに読むページ数の上限
ENOUGH = 6        # 条件に合う宿がこの数そろったら、それ以上のページは読まない


def search(env, lat, lon, page=1):
    q = {
        "applicationId": env["RAKUTEN_APP_ID"], "accessKey": env["RAKUTEN_ACCESS_KEY"],
        "affiliateId": env["RAKUTEN_AFFILIATE_ID"], "format": "json", "formatVersion": 2,
        "latitude": lat, "longitude": lon, "searchRadius": RADIUS_KM, "datumType": 1,
        "hits": HITS, "sort": "standard", "page": page,
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(q))
    req.add_header("Origin", C.ORIGIN)
    req.add_header("Referer", C.REFERER)
    for i in range(3):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:           # 1秒1回の制限。待って戻す
                time.sleep(2 + i)
                continue
            if e.code == 404:           # 該当する宿なし
                return {"hotels": []}
            raise
    raise RuntimeError("429が続いた")


def tidy(t):
    """全角英数を半角に直し、末尾の記号（＾）と余分な空白を除く。"""
    t = unicodedata.normalize("NFKC", t or "")
    t = re.sub(r"\s*\^+\s*$", "", t)
    return re.sub(r"\s+", " ", t).strip()


def flat(h):
    """formatVersion=2 は項目ごとの辞書の配列。1つの辞書にまとめる。"""
    out = {}
    for part in h:
        if isinstance(part, dict):
            for v in part.values():
                if isinstance(v, dict):
                    out.update(v)
    return out


def fetch_hotels(env, s):
    cand = []
    for page in range(1, MAX_PAGES + 1):
        d = search(env, s["lat"], s["lon"], page)
        for h in d.get("hotels", []):
            b = flat(h["hotel"] if isinstance(h, dict) else h)
            avg, cnt = b.get("reviewAverage"), b.get("reviewCount")
            if avg is None or cnt is None or cnt < MIN_REVIEWS or avg < MIN_AVG:
                continue
            cand.append({
                "name": tidy(b.get("hotelName")),
                "area": tidy(b.get("address1", "") + b.get("address2", "")),
                "url": b.get("hotelInformationUrl"),
                "review_average": avg,
                "review_count": cnt,
                "status": "candidate",
            })
        pages = (d.get("pagingInfo") or {}).get("pageCount") or 1
        if len(cand) >= ENOUGH or page >= pages:
            break
        time.sleep(1.2)
    cand.sort(key=lambda x: (-x["review_average"], -x["review_count"]))
    return cand[:SHOW]


def missing_ids():
    have = {e["shrine_id"] for e in (C.read_json("stays.json", {"stays": []})["stays"])}
    return [s["id"] for s in C.load_shrines() if s["id"] not in have]


def build(ids=None, missing=False, log=sys.stderr):
    shrines = C.load_shrines()
    old = C.read_json("stays.json", {"stays": [], "fetched_at": None})
    old_top = old.get("fetched_at")
    old_entries = {e["shrine_id"]: e for e in old["stays"]}
    if missing:
        targets = [s for s in shrines if s["id"] not in old_entries]
    elif ids:
        targets = [s for s in shrines if s["id"] in ids]
    else:
        targets = list(shrines)
    if not targets:
        return []
    env = C.load_env()
    now = C.today()
    fresh = {}
    for s in targets:
        fresh[s["id"]] = {"shrine_id": s["id"], "shrine_name": s["name"], "fetched_at": now,
                          "hotels": fetch_hotels(env, s)}
        print(s["id"], len(fresh[s["id"]]["hotels"]), file=log)
        time.sleep(1.2)
    entries = []
    for s in shrines:
        e = fresh.get(s["id"]) or old_entries.get(s["id"])
        if e:
            e = dict(e)
            e.setdefault("fetched_at", old_top or now)
            entries.append(e)
    data = {
        "fetched_at": C.oldest(entries, now),
        "source": "楽天トラベル（アフィリエイトリンク）",
        "radius_km": RADIUS_KM,
        "filter": {"min_reviews": MIN_REVIEWS, "min_average": MIN_AVG, "show": SHOW},
        "stays": entries,
    }
    print("wrote", C.write_json("stays.json", data), file=log)
    return [s["id"] for s in targets]


if __name__ == "__main__":
    args = sys.argv[1:]
    build(ids=[a for a in args if not a.startswith("--")], missing="--missing" in args)
