"""神社の座標から近くの宿を楽天トラベルAPIで探し、shrine-note/stays.json を作る。

使い方:  py tools/build_stays.py kashima katori makata   （神社IDを並べる。省略時は全社）
鍵は 保全部\\.env の RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID。
値の後ろの「  # 発行メモ」は除いて読む。鍵は表示も保存もしない。
"""
import json, os, re, sys, time, datetime, unicodedata, urllib.request, urllib.parse, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ENV = r"C:\Users\you08\OneDrive\レザークラフト\保全部\.env"
API = "https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426"
ORIGIN = "https://you0810jmsdf.github.io"
HITS = 30         # 検索で取る件数（APIの上限）
SHOW = 3          # 載せる件数
MIN_REVIEWS = 10  # 口コミがこの件数以上
MIN_AVG = 3.5     # 評価がこの値以上
RADIUS_KM = 3     # 神社からの検索半径（最大3）


def load_env():
    env = {}
    for line in open(ENV, encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.rstrip("\r\n"))
        if m:
            env[m.group(1)] = re.split(r"\s+#", m.group(2))[0].strip().strip('"').strip("'")
    return env


def search(env, lat, lon):
    q = {
        "applicationId": env["RAKUTEN_APP_ID"], "accessKey": env["RAKUTEN_ACCESS_KEY"],
        "affiliateId": env["RAKUTEN_AFFILIATE_ID"], "format": "json", "formatVersion": 2,
        "latitude": lat, "longitude": lon, "searchRadius": RADIUS_KM, "datumType": 1,
        "hits": HITS, "sort": "standard",
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(q))
    req.add_header("Origin", ORIGIN)
    req.add_header("Referer", ORIGIN + "/ns-factory/")
    for i in range(3):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:           # 1秒1回の制限。待って1回だけ戻す
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


def main():
    ids = sys.argv[1:]
    shrines = json.load(open(os.path.join(BASE, "shrines.json"), encoding="utf-8"))
    shrines = shrines["shrines"] if isinstance(shrines, dict) else shrines
    pick = [s for s in shrines if not ids or s["id"] in ids]
    env = load_env()
    now = datetime.datetime.now().strftime("%Y-%m-%d")
    stays = []
    for s in pick:
        d = search(env, s["lat"], s["lon"])
        cand = []
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
        cand.sort(key=lambda x: (-x["review_average"], -x["review_count"]))
        hotels = cand[:SHOW]
        stays.append({"shrine_id": s["id"], "shrine_name": s["name"], "hotels": hotels})
        print(s["id"], len(hotels), file=sys.stderr)
        time.sleep(1.2)
    out = {
        "fetched_at": now,
        "source": "楽天トラベル（アフィリエイトリンク）",
        "radius_km": RADIUS_KM,
        "filter": {"min_reviews": MIN_REVIEWS, "min_average": MIN_AVG, "show": SHOW},
        "stays": stays,
    }
    path = os.path.join(BASE, "stays.json")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", path, file=sys.stderr)


if __name__ == "__main__":
    main()
