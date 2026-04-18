#!/usr/bin/env python3
"""
N's factory 公開サイト監視。

公開ページ、写真JSON、Drive/GAS連携APIを確認し、
異常状態が変化したときだけメール通知します。
"""
from __future__ import annotations

import json
import os
import smtplib
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parents[2]
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


@dataclass
class DiagnosticResult:
    name: str
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


def get_int_env(name: str, default: int) -> int:
    try:
        return max(1, int(os.environ.get(name, str(default))))
    except ValueError:
        return default


def should_retry(result: CheckResult) -> bool:
    detail = result.detail.lower()
    return (
        "timeouterror" in detail
        or "urlerror" in detail
        or "winerror 10061" in detail
        or "connection" in detail
        or "temporarily" in detail
        or detail.startswith("http 429")
        or detail.startswith("http 500")
        or detail.startswith("http 502")
        or detail.startswith("http 503")
        or detail.startswith("http 504")
    )


def check_url_once(name: str, url: str, expect_json: bool = False, expect_jsonp: bool = False) -> CheckResult:
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
        return CheckResult(name, url, False, f"異常マーカー検出: {marker}")

    if expect_json:
        try:
            json.loads(body)
        except json.JSONDecodeError as exc:
            return CheckResult(name, url, False, f"JSON形式不正: {exc}")

    if expect_jsonp:
        stripped = body.strip()
        if not stripped.startswith("siteMonitor(") or not stripped.endswith(");"):
            return CheckResult(name, url, False, "JSONP形式不正")

    return CheckResult(name, url, True, f"HTTP 200 ({len(body)} bytes)")


def check_url(name: str, url: str, expect_json: bool = False, expect_jsonp: bool = False) -> CheckResult:
    retries = get_int_env("SITE_MONITOR_RETRY_COUNT", 3)
    delay_seconds = get_int_env("SITE_MONITOR_RETRY_DELAY_SECONDS", 10)
    result = check_url_once(name, url, expect_json=expect_json, expect_jsonp=expect_jsonp)
    attempts = 1

    while not result.ok and should_retry(result) and attempts < retries:
        time.sleep(delay_seconds)
        attempts += 1
        result = check_url_once(name, url, expect_json=expect_json, expect_jsonp=expect_jsonp)

    if result.ok and attempts > 1:
        return CheckResult(
            result.name,
            result.url,
            True,
            f"{result.detail}; 自動再試行で復旧 {attempts}/{retries}",
        )

    if not result.ok and attempts > 1:
        return CheckResult(
            result.name,
            result.url,
            False,
            f"{result.detail}; 自動再試行後も失敗 {attempts}/{retries}",
        )

    return result


def run_diagnostics(bad: list[CheckResult]) -> list[DiagnosticResult]:
    diagnostics: list[DiagnosticResult] = []
    hosts = sorted(
        {
            urllib.parse.urlsplit(result.url).hostname
            for result in bad
            if urllib.parse.urlsplit(result.url).hostname
        }
    )

    for host in hosts:
        try:
            addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            unique_addresses = sorted({entry[4][0] for entry in addresses})
            diagnostics.append(
                DiagnosticResult(
                    f"DNS {host}",
                    True,
                    f"解決成功: {', '.join(unique_addresses[:6])}",
                )
            )
        except Exception as exc:
            diagnostics.append(DiagnosticResult(f"DNS {host}", False, f"{type(exc).__name__}: {exc}"))
            continue

        try:
            with socket.create_connection((host, 443), timeout=TIMEOUT_SECONDS):
                diagnostics.append(DiagnosticResult(f"TCP 443 {host}", True, "接続成功"))
        except Exception as exc:
            diagnostics.append(DiagnosticResult(f"TCP 443 {host}", False, f"{type(exc).__name__}: {exc}"))

    sample_checks = [
        ("代表HTTPS GitHub Pages", PUBLIC_URLS[0]),
        ("代表HTTPS Drive/GAS作品API", GAS_URLS[0]),
    ]
    for name, url in sample_checks:
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "NsfactorySiteMonitor/1.0"},
            )
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                diagnostics.append(DiagnosticResult(name, True, f"HTTP {response.status}"))
        except Exception as exc:
            diagnostics.append(DiagnosticResult(name, False, f"{type(exc).__name__}: {exc}"))

    return diagnostics


def diagnostics_succeeded(diagnostics: list[DiagnosticResult]) -> bool:
    return bool(diagnostics) and all(result.ok for result in diagnostics)


def response_action(result: CheckResult) -> str:
    detail = result.detail.lower()
    if is_reachability_issue(result):
        return "一時的な通信不調の可能性があります。自動再試行済みです。継続する場合は、まず監視元PCのネットワーク、DNS、プロキシ、外向き通信制限を確認し、その後でGitHub PagesまたはApps Script側の障害を確認します。"
    if "http 429" in detail or "http 5" in detail:
        return "外部サービス側の一時不調の可能性があります。自動再試行済みです。続く場合はGitHub PagesまたはApps Scriptの稼働状況を確認します。"
    if "http 404" in detail or "page not found" in detail:
        return "URLまたはGitHub Pagesの公開ファイルが消えていないか確認してください。直近のサイト更新・リンク変更が第一候補です。"
    if "http 403" in detail or "sign in" in detail or "accounts.google.com" in detail:
        return "公開権限を確認してください。Drive/GAS系ならデプロイ公開範囲とアクセス権限の再確認が必要です。"
    if "json形式不正" in detail or "jsonp形式不正" in detail:
        return "API応答形式が変わっています。Apps Scriptの返却内容、JSON/JSONPのcallback、公開設定を確認します。"
    return "対象URLをブラウザで開き、表示内容と公開設定を確認してください。サイト更新が原因なら監視条件を更新します。"


def is_reachability_issue(result: CheckResult) -> bool:
    detail = result.detail.lower()
    return (
        "winerror 10061" in detail
        or "urlerror" in detail
        or "timeouterror" in detail
        or "timeout" in detail
        or "connection" in detail
        or "temporarily" in detail
        or "http 429" in detail
        or "http 5" in detail
    )


def failure_category(result: CheckResult) -> str:
    detail = result.detail.lower()
    if "異常マーカー検出" in result.detail and (
        "accounts.google.com" in detail
        or "servicelogin" in detail
        or "sign in" in detail
        or "ログイン" in result.detail
    ):
        return "公開設定"
    if "http 404" in detail or "page not found" in detail:
        return "ファイル欠落"
    if "http 403" in detail:
        return "権限不足"
    if "json形式不正" in detail or "jsonp形式不正" in detail:
        return "応答形式"
    if is_reachability_issue(result):
        return "到達性"
    if "異常マーカー検出" in result.detail:
        return "文言差分"
    return "その他"


def retry_summary(result: CheckResult) -> str:
    detail = result.detail.lower()
    if "自動再試行で復旧" in result.detail or "auto recovered after retry" in detail:
        return "一時不調として自動再試行し、復旧を確認しました。"
    if (
        "自動再試行後も失敗" in result.detail
        or "retried" in detail
        or ("再試行" in result.detail and "失敗" in result.detail)
    ):
        return "一時不調として自動再試行しましたが、失敗が継続しました。"
    if should_retry(result):
        return "一時不調の候補ですが、設定回数内で再試行対象になりませんでした。"
    return "再試行対象外の異常として扱いました。"


def summarize_failures(results: list[CheckResult], bad: list[CheckResult]) -> list[str]:
    if not bad:
        return []

    categories: dict[str, int] = {}
    retries: dict[str, int] = {}
    for result in bad:
        category = failure_category(result)
        categories[category] = categories.get(category, 0) + 1
        summary = retry_summary(result)
        retries[summary] = retries.get(summary, 0) + 1

    lines = ["", "監視結果の要約:"]
    lines.extend(f"- 失敗カテゴリ: {category} {count}件" for category, count in sorted(categories.items(), key=lambda item: item[0]))
    lines.extend(f"- 再試行結果: {summary} ({count}件)" for summary, count in sorted(retries.items(), key=lambda item: item[0]))

    if len(bad) == len(results):
        lines.extend(
            [
                "- 優先順位: 全件異常のため、個別ページより先に監視元のネットワーク、DNS、プロキシ、外向き通信制限を確認してください。",
                "- 次点確認: 監視元に問題がなければ、GitHub Pages と Apps Script の稼働状況を確認してください。",
            ]
        )
    elif len(categories) == 1 and "到達性" in categories:
        lines.append("- 優先順位: 複数の到達性異常があるため、監視元ネットワーク経路を先に確認してください。")

    return lines


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


def send_email(subject: str, body: str) -> bool:
    if not smtp_configured():
        return False

    host = os.environ["SITE_MONITOR_SMTP_HOST"]
    port = int(os.environ.get("SITE_MONITOR_SMTP_PORT", "587"))
    user = os.environ["SITE_MONITOR_SMTP_USER"]
    password = os.environ["SITE_MONITOR_SMTP_PASSWORD"]

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ["SITE_MONITOR_EMAIL_FROM"]
    msg["To"] = os.environ["SITE_MONITOR_EMAIL_TO"]
    msg["Content-Language"] = "ja"
    msg.set_content(body, subtype="plain", charset="utf-8")

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
    return True


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
        lines.extend(summarize_failures(results, bad))
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
    diagnostics: list[DiagnosticResult] = []
    diagnostics_passed = False
    unresolved_bad = bad
    if bad:
        diagnostics = run_diagnostics(bad)
        diagnostics_passed = diagnostics_succeeded(diagnostics)
        if diagnostics_passed:
            unresolved_bad = []

    state = load_state()
    previous_bad = state.get("bad_urls", [])
    current_bad = [r.url + " :: " + r.detail for r in unresolved_bad]
    changed = current_bad != previous_bad

    report = format_report(results)
    if bad:
        action_lines = ["", "対応の目安:"]
        action_lines.extend(f"- {r.name}: {response_action(r)}" for r in bad)
        if diagnostics:
            action_lines.extend(["", "自動切り分け:"])
            action_lines.extend(f"- {d.name}: {d.detail}" for d in diagnostics)
            if diagnostics_passed:
                action_lines.extend(
                    [
                        "",
                        "判定:",
                        "- DNS / TCP 443 / 代表HTTPS が通ったため、一時的な通信不調として扱い、通知は保留しました。",
                    ]
                )
        action_lines.extend(
            [
                "",
                "自動処置:",
                "- WinError 10061、タイムアウト、HTTP 429、HTTP 5xx などは通知前に自動再試行します。",
                "- 同じ異常が続く場合は状態ファイルで重複通知を抑止します。",
                "- 復旧した場合は SITE_MONITOR_NOTIFY_ON_OK=true の設定で復旧メールを送ります。",
            ]
        )
        report = report + "\n" + "\n".join(action_lines)
    print(report)

    notify_on_ok = os.environ.get("SITE_MONITOR_NOTIFY_ON_OK", "").lower() in {"1", "true", "yes"}
    if (bool(unresolved_bad) and changed) or (not unresolved_bad and previous_bad and notify_on_ok):
        subject = "【N's factory】サイト監視: 異常あり" if unresolved_bad else "【N's factory】サイト監視: 復旧"
        sent = send_email(subject, report)
        print("\nメール通知: 送信しました" if sent else "\nメール通知: SMTP設定が不足しているため未送信です。")
    elif bad and diagnostics_passed:
        print("\nメール通知: 保留（自動切り分けで復旧相当）")

    save_state({
        "checked_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "bad_urls": current_bad,
    })
    return 2 if unresolved_bad else 0


if __name__ == "__main__":
    sys.exit(main())
