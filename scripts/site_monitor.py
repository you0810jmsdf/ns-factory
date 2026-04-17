#!/usr/bin/env python3
"""
N's factory public site monitor.

Checks public pages and Drive/GAS-backed endpoints for common broken states.
If SMTP settings are present, sends email only when the alert state changes.
"""
from __future__ import annotations

import json
import os
import smtplib
import ssl
import sys
import textwrap
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parents[3]
SECURE_ENV = PROJECT_ROOT / "保全部" / ".env"
LOCAL_ENV = ROOT / ".env"
STATE_FILE = ROOT / ".monitor" / "site-watch-state.json"
TIMEOUT_SECONDS = 20

PUBLIC_URLS = [
    "https://you0810jmsdf.github.io/ns-factory/",
    "https://you0810jmsdf.github.io/ns-factory/works.html",
    "https://you0810jmsdf.github.io/ns-factory/JHCS.html",
    "https://you0810jmsdf.github.io/ns-factory/orderprogress.html",
    "https://you0810jmsdf.github.io/ns-factory/links.html",
    "https://you0810jmsdf.github.io/ns-factory/profile.html",
    "https://you0810jmsdf.github.io/ns-factory/order_estimate/leather-order-estimate-v2.html",
]

DATA_URLS = [
    "https://you0810jmsdf.github.io/ns-factory/mini6-photos.json",
]

GAS_URLS = [
    "https://script.google.com/macros/s/AKfycbw-ghhuzw8WYH7w4Png96Qt3s5EYbVaK_P32UJvqvhr28Ck2mxQJkedbAimogVHExeouw/exec?api=products&callback=siteMonitor",
]

BROKEN_MARKERS = [
    "accounts.google.com",
    "ServiceLogin",
    "ファイルを開くことができません",
    "アドレスを確認して、もう一度試してください",
    "file cannot be opened",
    "404 Not Found",
    "Page not found",
    "<title>Sign in",
    "<title>ログイン",
]


@dataclass
class CheckResult:
    name: str
    url: str
    ok: bool
    detail: str


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def fetch(url: str) -> tuple[int, str, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "NsfactorySiteMonitor/1.0",
            "Accept": "text/html,application/json,text/javascript,*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as response:
        status = int(response.status)
        final_url = response.geturl()
        body = response.read(250_000).decode("utf-8", errors="replace")
        return status, final_url, body


def check_url(name: str, url: str, expect_json: bool = False, expect_jsonp: bool = False) -> CheckResult:
    try:
        status, final_url, body = fetch(url)
    except urllib.error.HTTPError as exc:
        return CheckResult(name, url, False, f"HTTP {exc.code}")
    except Exception as exc:
        return CheckResult(name, url, False, f"{type(exc).__name__}: {exc}")

    if status != 200:
        return CheckResult(name, url, False, f"HTTP {status}")

    marker = next((m for m in BROKEN_MARKERS if m.lower() in (body + final_url).lower()), None)
    if marker:
        return CheckResult(name, url, False, f"broken marker detected: {marker}")

    if expect_json:
        try:
            json.loads(body)
        except json.JSONDecodeError as exc:
            return CheckResult(name, url, False, f"invalid JSON: {exc}")

    if expect_jsonp:
        stripped = body.strip()
        if not stripped.startswith("siteMonitor(") or not stripped.endswith(");"):
            return CheckResult(name, url, False, "invalid JSONP response")

    return CheckResult(name, url, True, f"HTTP 200 ({len(body)} bytes)")


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def smtp_configured() -> bool:
    required = [
        "SITE_MONITOR_EMAIL_TO",
        "SITE_MONITOR_EMAIL_FROM",
        "SITE_MONITOR_SMTP_HOST",
        "SITE_MONITOR_SMTP_USER",
        "SITE_MONITOR_SMTP_PASSWORD",
    ]
    return all(os.environ.get(key) for key in required)


def send_email(subject: str, body: str) -> None:
    if not smtp_configured():
        return

    host = os.environ["SITE_MONITOR_SMTP_HOST"]
    port = int(os.environ.get("SITE_MONITOR_SMTP_PORT", "587"))
    user = os.environ["SITE_MONITOR_SMTP_USER"]
    password = os.environ["SITE_MONITOR_SMTP_PASSWORD"]

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ["SITE_MONITOR_EMAIL_FROM"]
    msg["To"] = os.environ["SITE_MONITOR_EMAIL_TO"]
    msg.set_content(body)

    context = ssl.create_default_context()
    if port == 465:
      with smtplib.SMTP_SSL(host, port, context=context, timeout=TIMEOUT_SECONDS) as smtp:
          smtp.login(user, password)
          smtp.send_message(msg)
    else:
      with smtplib.SMTP(host, port, timeout=TIMEOUT_SECONDS) as smtp:
          smtp.starttls(context=context)
          smtp.login(user, password)
          smtp.send_message(msg)


def format_report(results: list[CheckResult]) -> str:
    bad = [r for r in results if not r.ok]
    ok = [r for r in results if r.ok]
    lines = [
        "N's factory サイト監視結果",
        f"実行時刻: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        f"判定: {'異常あり' if bad else '正常'}",
        f"正常: {len(ok)} / 異常: {len(bad)}",
        "",
    ]
    if bad:
        lines.append("異常:")
        lines.extend(f"- {r.name}: {r.detail}\n  {r.url}" for r in bad)
        lines.append("")
    lines.append("正常:")
    lines.extend(f"- {r.name}: {r.detail}" for r in ok)
    return "\n".join(lines)


def main() -> int:
    load_env_file(SECURE_ENV)
    load_env_file(LOCAL_ENV)

    results: list[CheckResult] = []
    results.extend(check_url(f"公開ページ {i + 1}", url) for i, url in enumerate(PUBLIC_URLS))
    results.extend(check_url("写真JSON", url, expect_json=True) for url in DATA_URLS)
    results.extend(check_url("Drive/GAS作品API", url, expect_jsonp=True) for url in GAS_URLS)

    bad = [r for r in results if not r.ok]
    state = load_state()
    previous_bad = state.get("bad_urls", [])
    current_bad = [r.url + " :: " + r.detail for r in bad]
    changed = current_bad != previous_bad

    report = format_report(results)
    print(report)

    notify_on_ok = os.environ.get("SITE_MONITOR_NOTIFY_ON_OK", "").lower() in {"1", "true", "yes"}
    if (bad and changed) or (not bad and previous_bad and notify_on_ok):
        subject = "【N's factory】サイト監視: 異常あり" if bad else "【N's factory】サイト監視: 復旧"
        send_email(subject, report)
        if not smtp_configured():
            print("\nメール通知: SMTP設定がないため未送信です。")

    save_state({
        "checked_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "bad_urls": current_bad,
    })
    return 2 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
