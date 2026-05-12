#!/usr/bin/env python3
"""OKJ (旧OKCoin Japan) の BTC/JPY 価格を 10 万円帯ごとに ntfy.sh へ通知する。

GitHub Actions の cron で定期実行することを想定している。
直前に通知した「10 万円帯」を state ファイルに保存し、現在の帯と
異なるときだけ通知を送る（同じ帯に留まっている間は無通知）。

環境変数:
  NTFY_TOPIC          (必須) ntfy.sh のトピック名。例: "okj-btc-zX91kQ"
  NTFY_SERVER         (任意) ntfy サーバ URL。既定 "https://ntfy.sh"
  NTFY_TOKEN          (任意) ntfy アクセストークン（保護されたトピック用）
  NTFY_USERNAME       (任意) Basic 認証ユーザ
  NTFY_PASSWORD       (任意) Basic 認証パスワード
  THRESHOLD_JPY       (任意) 通知粒度。既定 100000 (10 万円)
  OKCOIN_STATE_FILE   (任意) state ファイルのパス。既定 "okcoin-state.json"
"""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PRIMARY_URL = "https://www.okj.com/api/spot/v3/instruments/BTC-JPY/ticker"
FALLBACK_URL = "https://www.okcoin.jp/api/spot/v3/instruments/BTC-JPY/ticker"
TIMEOUT_SEC = 15
USER_AGENT = "ns-factory-okcoin-notifier/1.0 (+github actions)"


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def fetch_ticker() -> tuple[dict, str]:
    last_err: Exception | None = None
    for url in (PRIMARY_URL, FALLBACK_URL):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
                payload = json.load(resp)
            if isinstance(payload, list):
                payload = payload[0] if payload else {}
            if not isinstance(payload, dict) or "best_ask" not in payload:
                raise ValueError(f"unexpected payload shape from {url}: {payload!r}")
            return payload, url
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
            last_err = e
            print(f"[warn] fetch failed for {url}: {e}", file=sys.stderr)
    raise SystemExit(f"All endpoints failed. last error: {last_err}")


def load_state(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"[warn] state file unreadable, ignoring: {e}", file=sys.stderr)
        return {}


def save_state(path: Path, state: dict) -> None:
    path.write_text(
        json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def post_ntfy(title: str, body: str, *, priority: str = "default", tags: str = "") -> None:
    topic = env("NTFY_TOPIC")
    if not topic:
        raise SystemExit("NTFY_TOPIC is not set; cannot send notification")
    server = (env("NTFY_SERVER") or "https://ntfy.sh").rstrip("/")
    url = f"{server}/{topic}"

    headers = {
        "User-Agent": USER_AGENT,
        "Title": title.encode("utf-8").decode("latin-1", "ignore") or "OKJ BTC/JPY",
        "Priority": priority,
        "Content-Type": "text/plain; charset=utf-8",
    }
    # ntfy reads Title/Tags from HTTP headers, which must be ISO-8859-1 safe.
    # For non-ASCII titles, use RFC 2047 encoded-word so iOS/Android render Japanese correctly.
    if any(ord(c) > 127 for c in title):
        b64 = base64.b64encode(title.encode("utf-8")).decode("ascii")
        headers["Title"] = f"=?UTF-8?B?{b64}?="
    if tags:
        headers["Tags"] = tags

    token = env("NTFY_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        user = env("NTFY_USERNAME")
        pwd = env("NTFY_PASSWORD")
        if user and pwd:
            creds = base64.b64encode(f"{user}:{pwd}".encode("utf-8")).decode("ascii")
            headers["Authorization"] = f"Basic {creds}"

    req = urllib.request.Request(
        url,
        data=body.encode("utf-8"),
        method="POST",
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
        if resp.status >= 300:
            raise SystemExit(f"ntfy POST failed: HTTP {resp.status}")


def format_jpy(value: float | int) -> str:
    return f"¥{int(round(float(value))):,}"


def main() -> int:
    threshold = int(env("THRESHOLD_JPY") or "100000")
    if threshold <= 0:
        raise SystemExit(f"THRESHOLD_JPY must be positive, got {threshold}")

    state_path = Path(env("OKCOIN_STATE_FILE") or "okcoin-state.json")

    ticker, used_url = fetch_ticker()
    try:
        ask = float(ticker["best_ask"])
        bid = float(ticker["best_bid"])
        last = float(ticker["last"])
        high24 = float(ticker.get("high_24h") or last)
        low24 = float(ticker.get("low_24h") or last)
        open24 = float(ticker.get("open_24h") or last)
        ts_api = ticker.get("timestamp") or ""
    except (KeyError, TypeError, ValueError) as e:
        raise SystemExit(f"unexpected ticker payload: {ticker!r} ({e})")

    current_band = int(ask // threshold)
    state = load_state(state_path)
    last_band = state.get("last_notified_band")
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")

    notified = False
    reason = ""

    if last_band is None:
        reason = "init"
        print(f"[init] band={current_band} ask={ask:.0f} — state initialized, no notification")
    elif int(last_band) == current_band:
        reason = "noop"
        print(f"[noop] band={current_band} ask={ask:.0f} — no crossing")
    else:
        last_band = int(last_band)
        diff_bands = current_band - last_band
        direction_up = diff_bands > 0
        arrow = "↑" if direction_up else "↓"
        crossed = abs(diff_bands)
        change24_pct = (last - open24) / open24 * 100 if open24 else 0.0

        band_label_prev = format_jpy(last_band * threshold)
        band_label_curr = format_jpy(current_band * threshold)
        units = f"{(crossed * threshold) // 10000}万円"

        title = f"OKJ BTC/JPY {arrow} {format_jpy(ask)}"
        body = (
            f"購入価格(ask)  : {format_jpy(ask)}\n"
            f"売却価格(bid)  : {format_jpy(bid)}\n"
            f"直近約定(last) : {format_jpy(last)}\n"
            f"\n"
            f"24h 始値       : {format_jpy(open24)}\n"
            f"24h 高値       : {format_jpy(high24)}\n"
            f"24h 安値       : {format_jpy(low24)}\n"
            f"24h 変動率     : {change24_pct:+.2f} %\n"
            f"\n"
            f"前回通知帯      : {band_label_prev} 〜\n"
            f"今回帯          : {band_label_curr} 〜\n"
            f"跨いだ価格幅    : {units} ({crossed} 段階) {arrow}\n"
            f"\n"
            f"API timestamp  : {ts_api}\n"
            f"取得時刻        : {now_iso}\n"
            f"取得元 URL      : {used_url}\n"
        )
        priority = "high" if crossed >= 2 else "default"
        tags = "chart_with_upwards_trend" if direction_up else "chart_with_downwards_trend"
        post_ntfy(title, body, priority=priority, tags=tags)
        notified = True
        reason = f"crossed {last_band}->{current_band}"
        print(f"[notify] {reason} ask={ask:.0f} sent to ntfy")

    state.update(
        {
            "last_notified_band": current_band,
            "last_price_ask": ask,
            "last_checked_at": now_iso,
            "last_ticker_timestamp": ts_api,
            "threshold_jpy": threshold,
            "last_reason": reason,
            "last_notified": notified,
        }
    )
    save_state(state_path, state)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
