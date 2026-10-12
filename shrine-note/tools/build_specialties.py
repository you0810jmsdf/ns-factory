"""神社の都道府県ごとに、楽天市場の「名産・お取り寄せ」商品を探し、shrine-note/specialties.json を作る。

使い方:
  py tools/build_specialties.py                  全神社を取り直す（全社上書き）
  py tools/build_specialties.py kashima katori   指定した神社だけ取り直して、ほかはそのまま残す
  py tools/build_specialties.py --missing        specialties.json に無い神社だけ取り足す（自動実行用）
                                                 同じ都道府県のデータが既にあれば、それをコピーする（API は呼ばない）
金額は保存しない。画像は使わない。リンクは楽天のアフィリエイトURLのみ。
鍵の読み方は affiliate_common.py を参照。
"""
import json, re, sys, time, unicodedata, urllib.request, urllib.parse, urllib.error

import affiliate_common as C

API = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701"
FOOD_GENRE = 100227        # 食品
HITS = 30
SHOW = 3
MIN_REVIEWS = 10
MIN_AVG = 4.2


def search(env, keyword):
    q = {
        "applicationId": env["RAKUTEN_APP_ID"], "affiliateId": env["RAKUTEN_AFFILIATE_ID"],
        "format": "json", "formatVersion": 2, "keyword": keyword, "genreId": FOOD_GENRE,
        "hits": HITS, "sort": "-reviewCount", "availability": 1, "imageFlag": 0,
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(q))
    req.add_header("accessKey", env["RAKUTEN_ACCESS_KEY"])
    req.add_header("Origin", C.ORIGIN)
    req.add_header("Referer", C.REFERER)
    for i in range(3):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 + i)
                continue
            raise
    raise RuntimeError("429が続いた")


def tidy(t, n=44):
    t = unicodedata.normalize("NFKC", t or "")
    t = re.sub(r"[【\[（(][^】\]）)]{0,20}[】\]）)]", " ", t)   # 【送料無料】などの飾りを除く
    t = re.sub(r"[★☆◆◇■□●○▼▲♪※]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t if len(t) <= n else t[:n].rstrip() + "…"


def fetch_items(env, pref):
    short = pref if pref == "北海道" else pref.rstrip("県府都")
    d = search(env, short + " 名産")
    items = []
    for it in d.get("Items", []):
        it = it.get("Item", it)
        url = it.get("affiliateUrl") or ""
        if not url.startswith(C.AFF_HOST):
            continue
        rc, ra = it.get("reviewCount") or 0, it.get("reviewAverage") or 0
        if rc < MIN_REVIEWS or float(ra) < MIN_AVG:
            continue
        items.append({"name": tidy(it.get("itemName")), "shop": tidy(it.get("shopName"), 20), "url": url,
                      "review_average": float(ra), "review_count": rc, "_shop": it.get("shopName")})
    seen, uniq = set(), []
    for x in items:                      # 同じ店の商品が並ばないよう、店ごとに1つ
        if x["_shop"] in seen:
            continue
        seen.add(x["_shop"]); uniq.append(x)
    return [{k: v for k, v in x.items() if k != "_shop"} for x in uniq[:SHOW]]


def missing_ids():
    have = {e["shrine_id"] for e in (C.read_json("specialties.json", {"specialties": []})["specialties"])}
    return [s["id"] for s in C.load_shrines() if s["id"] not in have]


def build(ids=None, missing=False, log=sys.stderr):
    shrines = C.load_shrines()
    old = C.read_json("specialties.json", {"specialties": [], "fetched_at": None})
    old_top = old.get("fetched_at")
    old_entries = {e["shrine_id"]: e for e in old["specialties"]}
    if missing:
        targets = [s for s in shrines if s["id"] not in old_entries]
    elif ids:
        targets = [s for s in shrines if s["id"] in ids]
    else:
        targets = list(shrines)
    if not targets:
        return []
    env = None
    now = C.today()
    pref_cache = {}                      # 都道府県 → (商品, 取得日)
    if missing or ids:                   # 取り足すとき：対象外の既存データを、同じ都道府県で再利用
        target_ids = {t["id"] for t in targets}
        for e in old_entries.values():
            if e.get("items") and e["shrine_id"] not in target_ids:
                pref_cache.setdefault(e["pref"], (e["items"], e.get("fetched_at") or old_top or now))
    fresh = {}
    for s in targets:
        pref = s["pref"]
        if pref not in pref_cache:
            env = env or C.load_env()
            pref_cache[pref] = (fetch_items(env, pref), now)
            print(pref, len(pref_cache[pref][0]), file=log)
            time.sleep(1.2)
        items, at = pref_cache[pref]
        fresh[s["id"]] = {"shrine_id": s["id"], "pref": pref, "fetched_at": at, "items": items}
    entries = []
    for s in shrines:
        e = fresh.get(s["id"]) or old_entries.get(s["id"])
        if e:
            e = dict(e)
            e.setdefault("fetched_at", old_top or now)
            entries.append(e)
    data = {
        "fetched_at": C.oldest(entries, now),
        "source": "楽天市場（アフィリエイトリンク）",
        "filter": {"min_reviews": MIN_REVIEWS, "min_average": MIN_AVG, "show": SHOW},
        "specialties": entries,
    }
    print("wrote", C.write_json("specialties.json", data), file=log)
    return [s["id"] for s in targets]


if __name__ == "__main__":
    args = sys.argv[1:]
    build(ids=[a for a in args if not a.startswith("--")], missing="--missing" in args)
