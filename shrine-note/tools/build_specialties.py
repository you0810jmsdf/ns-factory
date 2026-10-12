"""神社の都道府県ごとに、楽天市場の「名産・お取り寄せ」商品を探し、shrine-note/specialties.json を作る。

使い方:  py tools/build_specialties.py [神社ID ...]   （省略時は全社）
鍵は 保全部\\.env の RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID（値の後ろの「  # メモ」は除く）。
金額は保存しない。画像は使わない。リンクは楽天のアフィリエイトURLのみ。
"""
import json, os, re, sys, time, datetime, unicodedata, urllib.request, urllib.parse, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ENV = r"C:\Users\you08\OneDrive\レザークラフト\保全部\.env"
API = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701"
ORIGIN = "https://you0810jmsdf.github.io"
FOOD_GENRE = 100227        # 食品
HITS = 30
SHOW = 3
MIN_REVIEWS = 10
MIN_AVG = 4.2
HOST = "https://hb.afl.rakuten.co.jp/"


def load_env():
    env = {}
    for line in open(ENV, encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.rstrip("\r\n"))
        if m:
            env[m.group(1)] = re.split(r"\s+#", m.group(2))[0].strip().strip('"').strip("'")
    return env


def search(env, keyword):
    q = {
        "applicationId": env["RAKUTEN_APP_ID"],
        "affiliateId": env["RAKUTEN_AFFILIATE_ID"], "format": "json", "formatVersion": 2,
        "keyword": keyword, "genreId": FOOD_GENRE, "hits": HITS, "sort": "-reviewCount",
        "availability": 1, "imageFlag": 0,
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(q))
    req.add_header("accessKey", env["RAKUTEN_ACCESS_KEY"])
    req.add_header("Origin", ORIGIN)
    req.add_header("Referer", ORIGIN + "/ns-factory/")
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


def main():
    ids = sys.argv[1:]
    shrines = json.load(open(os.path.join(BASE, "shrines.json"), encoding="utf-8"))["shrines"]
    pick = [s for s in shrines if not ids or s["id"] in ids]
    env = load_env()
    cache, out = {}, []
    for s in pick:
        pref = s["pref"]
        if pref not in cache:
            short = pref if pref == "北海道" else pref.rstrip("県府都")
            d = search(env, short + " 名産")
            items = []
            for it in d.get("Items", []):
                it = it.get("Item", it)
                url = it.get("affiliateUrl") or ""
                if not url.startswith(HOST):
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
            cache[pref] = [{k: v for k, v in x.items() if k != "_shop"} for x in uniq[:SHOW]]
            time.sleep(1.2)
        out.append({"shrine_id": s["id"], "pref": pref, "items": cache[pref]})
        print(s["id"], pref, len(cache[pref]), file=sys.stderr)
    data = {"fetched_at": datetime.datetime.now().strftime("%Y-%m-%d"), "source": "楽天市場（アフィリエイトリンク）",
            "filter": {"min_reviews": MIN_REVIEWS, "min_average": MIN_AVG, "show": SHOW}, "specialties": out}
    path = os.path.join(BASE, "specialties.json")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")
    print("wrote", path, file=sys.stderr)


if __name__ == "__main__":
    main()
