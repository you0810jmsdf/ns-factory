"""宿（stays.json）・名産（specialties.json）を作るスクリプトの共通部品。

鍵は 保全部\\.env の RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID。
値の後ろの「  # 発行メモ」は除いて読む。鍵は表示も保存もしない。
置き場所は環境変数 NSF_ENV_FILE で指定できる（旧PCなど、ユーザー名が違う場合）。
"""
import datetime, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)          # shrine-note/
ORIGIN = "https://you0810jmsdf.github.io"
REFERER = ORIGIN + "/ns-factory/"
AFF_HOST = "https://hb.afl.rakuten.co.jp/"

ENV_CANDIDATES = [
    os.environ.get("NSF_ENV_FILE", ""),
    r"C:\Users\you08\OneDrive\レザークラフト\保全部\.env",
    r"C:\Users\nsfactory\OneDrive\レザークラフト\保全部\.env",
]


def today():
    return datetime.datetime.now().strftime("%Y-%m-%d")


def env_path():
    for p in ENV_CANDIDATES:
        if p and os.path.exists(p):
            return p
    raise FileNotFoundError(".env が見つからない（NSF_ENV_FILE で指定してください）")


def load_env():
    env = {}
    for line in open(env_path(), encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.rstrip("\r\n"))
        if m:
            env[m.group(1)] = re.split(r"\s+#", m.group(2))[0].strip().strip('"').strip("'")
    for k in ("RAKUTEN_APP_ID", "RAKUTEN_ACCESS_KEY", "RAKUTEN_AFFILIATE_ID"):
        if not env.get(k):
            raise KeyError(k + " が .env に無い")
    return env


def read_json(name, default=None):
    p = os.path.join(BASE, name)
    if not os.path.exists(p):
        return default
    return json.load(open(p, encoding="utf-8"))


def write_json(name, data):
    p = os.path.join(BASE, name)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return p


def load_shrines():
    return read_json("shrines.json")["shrines"]


def oldest(entries, fallback):
    """全体の取得日＝いちばん古い取得日（画面の注記は古い方に合わせる）。"""
    dates = [e.get("fetched_at") or fallback for e in entries] or [fallback]
    return min(d for d in dates if d)
