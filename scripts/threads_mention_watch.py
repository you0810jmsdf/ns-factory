#!/usr/bin/env python3
"""Threads の公開投稿から N's factory / 中司祐樹 への言及を拾い、GitHub Issue に起票する。

ブランドモニタリング用。批判・悪評・誹謗中傷だけでなく、口コミ・紹介・好意的な投稿も
まとめて「言及そのもの」を検出する。GitHub Actions の cron で毎時実行する想定。

重複起票の防止は二重にしている:
  1. state ファイル(scripts/threads_watch_state.json)に通知済み Post ID を保存する
  2. 既存 Issue の本文に埋め込んだ  <!-- threads-post-id: XXX -->  を毎回読み直す
state が失われても(2)で救われ、Issue を消しても(1)で救われる。

検出できないもの:
  屋号・氏名を含まない表現(例:「例の革屋」)。キーワード検索の原理上どうにもならない。

環境変数:
  THREADS_ACCESS_TOKEN          (必須) Threads の長期アクセストークン
  GITHUB_TOKEN                  (必須) Issue 起票用。Actions が自動で渡す
  GITHUB_REPOSITORY             (必須) "owner/repo"。Actions が自動で渡す
  THREADS_WATCH_ISSUE_REPO      (任意) 起票先リポジトリ。既定は GITHUB_REPOSITORY
  THREADS_WATCH_WINDOW_MINUTES  (任意) 検索対象の遡り時間(分)。既定 90
  THREADS_WATCH_KEYWORDS_FILE   (任意) 既定 scripts/threads_watch_keywords.json
  THREADS_WATCH_STATE_FILE      (任意) 既定 scripts/threads_watch_state.json
  THREADS_WATCH_LABEL           (任意) 既定 "threads-mention"
  THREADS_WATCH_DRY_RUN         (任意) "1" なら Issue を作らず標準出力に出すだけ
  THREADS_WATCH_FIXTURE         (任意) 動作確認用。API の代わりにこの JSON を読む
  THREADS_TOKEN_SET_ON          (任意) トークンを Secret に入れた日 (YYYY-MM-DD)。
                                        45日を超えたら「失効前に更新せよ」と Issue で警告する
"""

from __future__ import annotations

import json
import os
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

API_BASE = "https://graph.threads.net/v1.0"
GITHUB_API = "https://api.github.com"
FIELDS = "id,text,media_type,permalink,timestamp,username,is_quote_post,is_reply"
TIMEOUT_SEC = 30
MAX_PAGES = 5          # 1キーワードあたりの追加ページ取得上限
RETENTION_DAYS = 180   # state に残す Post ID の保存期間
TOKEN_LIFETIME_DAYS = 60   # Threads の長期トークンの寿命（公式仕様）
TOKEN_WARN_DAYS = 45       # この日数を超えたら失効前に警告する
USER_AGENT = "ns-factory-threads-mention-watch/1.0 (+github actions)"
JST = timezone(timedelta(hours=9))
ID_MARKER = "threads-post-id"
ALERT_LABEL = "threads-mention-alert"

REPO_ROOT = Path(__file__).resolve().parent.parent


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return default if value is None or value == "" else value


def log(msg: str) -> None:
    print(msg, flush=True)


# --------------------------------------------------------------------------
# 文字列の正規化 / 照合
# --------------------------------------------------------------------------

APOSTROPHES = "'‘’‛＇`´"


def normalize(text: str) -> str:
    """NFKC正規化 + 小文字化 + アポストロフィ除去 + 空白圧縮。

    "N's factory" / "N’s factory" / "Ｎｓ　Factory" を同一視するため。
    """
    if not text:
        return ""
    s = unicodedata.normalize("NFKC", text).lower()
    s = "".join(ch for ch in s if ch not in APOSTROPHES)
    return " ".join(s.split())


class Keyword:
    def __init__(self, q: str, match: list[str], note: str = ""):
        self.q = q
        self.match = [m for m in (normalize(x) for x in match) if m]
        self.note = note

    def hits(self, text: str) -> bool:
        if not self.match:
            return True
        n = normalize(text)
        return any(m in n for m in self.match)


def load_keywords(path: Path) -> tuple[list[Keyword], dict]:
    conf = json.loads(path.read_text(encoding="utf-8"))
    keywords: list[Keyword] = []
    for raw in conf.get("keywords", []):
        if isinstance(raw, str):
            keywords.append(Keyword(raw, [raw]))
            continue
        if not isinstance(raw, dict):
            raise ValueError(f"keywords の要素が文字列でもオブジェクトでもない: {raw!r}")
        if raw.get("enabled") is False:
            continue
        q = raw.get("q")
        if not q:
            raise ValueError(f"keywords のオブジェクトに q がない: {raw!r}")
        match = raw["match"] if isinstance(raw.get("match"), list) else [q]
        keywords.append(Keyword(q, match, raw.get("note", "")))
    if not keywords:
        raise ValueError("有効なキーワードが1件もない")
    return keywords, conf


# --------------------------------------------------------------------------
# Threads API
# --------------------------------------------------------------------------

class ThreadsAuthError(RuntimeError):
    """トークンが無効・期限切れ。人間の対応が要る。"""


class ThreadsPermissionError(RuntimeError):
    """トークンに threads_keyword_search が付いていない（＝検索できない）。

    2026-08-25 実測: 投稿用スコープだけのトークンで /keyword_search を叩くと
    HTTP 500 / code=1 "An unknown error occurred" が返る。権限不足を素直に
    401/403 で返してくれないため、この形を権限不足として扱う。
    App Review 待ちの間もこの状態が続くので、**ジョブは落とさない**。
    """


def threads_search(token: str, keyword: Keyword, since_ts: int) -> list[dict]:
    """1キーワード分の公開投稿を取得する(ページングあり)。"""
    fixture = env("THREADS_WATCH_FIXTURE")
    if fixture:
        data = json.loads(Path(fixture).read_text(encoding="utf-8"))
        return data.get(keyword.q, data.get("_default", []))

    params = {
        "q": keyword.q,
        "search_type": "RECENT",
        "search_mode": "KEYWORD",
        "since": str(since_ts),
        "fields": FIELDS,
        "limit": "100",
        "access_token": token,
    }
    url = f"{API_BASE}/keyword_search?" + urllib.parse.urlencode(params)

    out: list[dict] = []
    for page in range(MAX_PAGES + 1):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
                payload = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = _threads_error(e)
            if detail["auth"]:
                raise ThreadsAuthError(detail["message"]) from None
            if detail["permission"]:
                # HTTP 500 は「権限不足」と「Meta側の一時障害」の区別がつかない。
                # /me が通るなら token は生きている＝検索権限だけが無い、と判定する。
                if detail["code_1_5xx"] and not _token_alive(token):
                    raise RuntimeError(
                        f"Threads API が応答しません (q={keyword.q}): {detail['message']}"
                    ) from None
                raise ThreadsPermissionError(detail["message"]) from None
            raise RuntimeError(f"Threads API エラー (q={keyword.q}): {detail['message']}") from None
        out.extend(payload.get("data") or [])
        nxt = (payload.get("paging") or {}).get("next")
        if not nxt or page >= MAX_PAGES:
            break
        url = nxt
        time.sleep(0.5)
    return out


def _threads_error(e: urllib.error.HTTPError) -> dict:
    """Threads のエラー本文を読み、トークン起因かどうかを判定する。"""
    try:
        raw = e.read().decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        raw = str(e.reason)
    try:
        err = json.loads(raw).get("error", {})
    except (ValueError, AttributeError):
        err = {}
    code = err.get("code")
    etype = err.get("type", "")
    message = err.get("message") or raw[:400]
    # 190=トークン無効/期限切れ, 102=セッション切れ
    auth = (
        e.code in (400, 401, 403)
        and (code in (102, 190) or etype == "OAuthException")
    )
    # 10/200/2500 は権限不足。加えて HTTP 500 / code=1 も権限不足として扱う
    # （2026-08-25 実測: threads_keyword_search を持たないトークンはこの形で返る）。
    permission = (not auth) and (
        code in (10, 200, 2500)
        or (e.code >= 500 and code in (1, None))
        or "permission" in message.lower()
    )
    return {
        "auth": auth,
        "permission": permission,
        "code_1_5xx": e.code >= 500 and code in (1, None),
        "message": f"HTTP {e.code} / code={code} / {message}",
    }


def _token_alive(token: str) -> bool:
    """トークンが生きているかだけを確かめる（/me は threads_basic だけで通る）。"""
    url = f"{API_BASE}/me?fields=id&access_token={urllib.parse.quote(token)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
            return res.status == 200
    except Exception:  # noqa: BLE001 - 落ちたら「生きていない」で十分
        return False


# --------------------------------------------------------------------------
# GitHub API
# --------------------------------------------------------------------------

def gh_request(method: str, path: str, token: str, body: dict | None = None) -> tuple[int, dict | list]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Authorization": f"Bearer {token}",
    }
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{GITHUB_API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
            raw = res.read().decode("utf-8")
            return res.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"message": raw[:400]}


def gh_known_post_ids(repo: str, token: str, label: str) -> set[str]:
    """既存 Issue の本文に埋め込んだ Post ID を集める(state が失われても重複を防ぐ)。"""
    found: set[str] = set()
    marker = f"<!-- {ID_MARKER}: "
    for page in range(1, 6):
        q = urllib.parse.urlencode(
            {"labels": label, "state": "all", "per_page": "100", "page": str(page)}
        )
        status, items = gh_request("GET", f"/repos/{repo}/issues?{q}", token)
        if status != 200 or not isinstance(items, list):
            log(f"::warning::既存Issueの取得に失敗しました (HTTP {status})。state ファイルのみで重複判定します")
            break
        for it in items:
            body = it.get("body") or ""
            idx = body.find(marker)
            if idx >= 0:
                end = body.find(" -->", idx)
                if end > 0:
                    found.add(body[idx + len(marker):end].strip())
        if len(items) < 100:
            break
    return found


def gh_ensure_label(repo: str, token: str, name: str, color: str, description: str) -> None:
    status, _ = gh_request("GET", f"/repos/{repo}/labels/{urllib.parse.quote(name)}", token)
    if status == 200:
        return
    status, res = gh_request(
        "POST", f"/repos/{repo}/labels", token,
        {"name": name, "color": color, "description": description},
    )
    if status not in (201, 422):  # 422 = 競合(同時実行で既に作られた)
        log(f"::warning::ラベル '{name}' を作れませんでした (HTTP {status}: {res})")


def fence(text: str) -> str:
    """投稿本文をコードフェンスに入れる。

    Threads 本文は第三者が書いた文字列なので、そのまま Markdown にすると
    @mention が無関係の GitHub ユーザへ通知を飛ばす。コードフェンス内なら通知されない。
    """
    safe = (text or "(本文なし)").replace("`````", "` ` ` ` `")
    return "`````text\n" + safe + "\n`````"


def build_issue(post: dict, keyword: Keyword) -> tuple[str, str]:
    username = post.get("username") or "(不明)"
    ts_raw = post.get("timestamp") or ""
    ts_jst = ts_raw
    try:
        ts_jst = (
            datetime.strptime(ts_raw, "%Y-%m-%dT%H:%M:%S%z")
            .astimezone(JST)
            .strftime("%Y-%m-%d %H:%M JST")
        )
    except ValueError:
        pass

    text = (post.get("text") or "").strip()
    excerpt = " ".join(text.split())[:40]
    title = f"[Threads言及] {keyword.q} — @{username} {ts_jst}"
    if excerpt:
        title += f" 「{excerpt}」"
    title = title[:240]

    kinds = []
    if post.get("is_reply"):
        kinds.append("返信")
    if post.get("is_quote_post"):
        kinds.append("引用")
    kind_suffix = ("／" + "・".join(kinds)) if kinds else ""

    body = "\n".join([
        "| 項目 | 内容 |",
        "|---|---|",
        f"| 検出キーワード | `{keyword.q}` |",
        f"| 投稿者 | @{username} |",
        f"| 投稿日時 | {ts_jst}（原文: `{ts_raw}`） |",
        f"| 投稿URL | {post.get('permalink') or '(取得できず)'} |",
        f"| Threads Post ID | `{post.get('id')}` |",
        f"| 種別 | {post.get('media_type') or '-'}{kind_suffix} |",
        "",
        "### 投稿本文",
        "",
        fence(text),
        "",
        "---",
        "",
        "自動検出（`.github/workflows/threads-mention-watch.yml`）。"
        "対応が済んだら Close してください。Close 済みでも再起票はされません。",
        "",
        f"<!-- {ID_MARKER}: {post.get('id')} -->",
    ])
    return title, body


def gh_create_issue(repo: str, token: str, title: str, body: str, labels: list[str]) -> int | None:
    status, res = gh_request(
        "POST", f"/repos/{repo}/issues", token,
        {"title": title, "body": body, "labels": labels},
    )
    if status == 201 and isinstance(res, dict):
        return res.get("number")
    log(f"::error::Issue の作成に失敗しました (HTTP {status}: {res})")
    return None


TOKEN_FIX_STEPS = [
    "### 直し方（5分）",
    "",
    "1. https://developers.facebook.com/apps/ を開き、対象アプリを選ぶ",
    "2. 左メニュー「Threads API」→「Generate access token」で長期トークンを取り直す",
    "3. リポジトリの Settings → Secrets and variables → Actions →",
    "   `THREADS_ACCESS_TOKEN` を **Update secret** で貼り替える",
    "4. 同じ画面の **Variables** タブで `THREADS_TOKEN_SET_ON` を今日の日付（YYYY-MM-DD）に直す",
    "5. Actions タブ →「Threads言及監視」→ Run workflow で手動実行し、緑になるのを確認する",
    "6. 緑になったらこの Issue を Close する",
    "",
    "※ Threads の長期トークンは発行から **60日** で失効する（公式仕様）。",
]


PERMISSION_FIX_STEPS = [
    "### 直し方",
    "",
    "1. https://developers.facebook.com/apps/ →「スレッズ自動投稿」アプリを開く",
    "2. ユースケース「Threads API」→ 権限の一覧で **`threads_keyword_search`** を追加する",
    "   （標準アクセスなら審査不要で追加できる）",
    "3.「Threads API」→ アクセストークンを生成。**`threads_keyword_search` にチェックを入れる**",
    "   ⚠ 既存の投稿用トークン（`保全部\\.env` / GAS）は**触らない**。監視用に別途1本発行する",
    "4. Secret `THREADS_ACCESS_TOKEN` を新しいトークンに更新し、",
    "   Variable `THREADS_TOKEN_SET_ON` を今日の日付にする",
    "5. Actions →「Threads言及監視」→ Run workflow（`dry_run=true`）で確認する",
    "",
    "**自分の投稿しかヒットしない場合はそれで正常。**",
    "他人の公開投稿まで検索するには App Review で `threads_keyword_search` の",
    "詳細アクセス（Advanced Access）を取る必要がある。",
]


def gh_alert(repo: str, token: str, title: str, lines: list[str],
             steps: list[str] | None = None) -> None:
    """人間の対応が要ることを Issue で伝える。開いている警告 Issue があれば作らない。"""
    q = urllib.parse.urlencode({"labels": ALERT_LABEL, "state": "open", "per_page": "5"})
    status, items = gh_request("GET", f"/repos/{repo}/issues?{q}", token)
    if status == 200 and isinstance(items, list) and items:
        log("既に警告 Issue が開いているため、追加起票しません。")
        return
    gh_ensure_label(repo, token, ALERT_LABEL, "b60205", "Threads監視の異常通知")
    body = "\n".join(lines + [""] + (steps if steps is not None else TOKEN_FIX_STEPS))
    gh_create_issue(repo, token, title, body, [ALERT_LABEL])


def gh_raise_permission_alert(repo: str, token: str, message: str) -> None:
    """検索権限が付いていないことを伝える。監視は動いていないが、ジョブは落とさない。"""
    gh_alert(
        repo, token,
        "⚠️ Threads言及監視: トークンに検索権限（threads_keyword_search）がありません",
        [
            "`/keyword_search` が権限不足で失敗しました。**言及の検出はできていません。**",
            "（トークン自体は生きています。投稿用の自動投稿には影響しません）",
            "",
            "```",
            message,
            "```",
        ],
        steps=PERMISSION_FIX_STEPS,
    )


def gh_raise_alert(repo: str, token: str, message: str) -> None:
    """トークンが使えず監視が止まったことを伝える。"""
    gh_alert(
        repo, token,
        "⚠️ Threads言及監視が停止しています（アクセストークン要更新）",
        [
            "Threads API の呼び出しがトークン起因で失敗しました。**監視は止まっています。**",
            "",
            "```",
            message,
            "```",
        ],
    )


def check_token_age(repo: str | None, gh_token: str | None, dry_run: bool) -> None:
    """トークンの発行日から日数を数え、失効前に警告する。

    過去に Gmail 連携トークンの失効へ8日間気付かず証憑取得が止まった。同じ轍を踏まないため、
    切れてから騒ぐのではなく、切れる前に Issue を立てる。
    """
    set_on = env("THREADS_TOKEN_SET_ON")
    if not set_on:
        return
    try:
        issued = datetime.strptime(set_on.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        log(f"::warning::THREADS_TOKEN_SET_ON の書式が YYYY-MM-DD ではありません: {set_on!r}")
        return
    age = (datetime.now(timezone.utc) - issued).days
    left = TOKEN_LIFETIME_DAYS - age
    log(f"アクセストークン: 発行から {age} 日経過（残り約 {left} 日）")
    if age < TOKEN_WARN_DAYS:
        return
    log(f"::warning::アクセストークンの失効まで残り約 {left} 日です")
    if dry_run or not repo or not gh_token:
        return
    gh_alert(
        repo, gh_token,
        f"⚠️ Threads言及監視のアクセストークンが残り約{left}日で失効します",
        [
            f"`THREADS_ACCESS_TOKEN` を設定してから **{age}日** 経ちました"
            f"（Threads の長期トークンの寿命は{TOKEN_LIFETIME_DAYS}日）。",
            "",
            "**まだ監視は動いています。** 切れる前に取り替えてください。",
        ],
    )


# --------------------------------------------------------------------------
# state
# --------------------------------------------------------------------------

def load_state(path: Path) -> dict:
    if not path.exists():
        return {"version": 1, "updated_at": None, "seen": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        log(f"::warning::{path} が壊れています。既存Issueだけで重複判定して作り直します")
        return {"version": 1, "updated_at": None, "seen": {}}
    data.setdefault("seen", {})
    return data


def prune(state: dict) -> None:
    limit = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    for pid, rec in list(state["seen"].items()):
        try:
            seen_at = datetime.fromisoformat(rec.get("first_seen", ""))
        except ValueError:
            continue
        if seen_at < limit:
            del state["seen"][pid]


def save_state(path: Path, state: dict) -> bool:
    """内容が変わったときだけ書く。戻り値は「書いたか」。"""
    state["seen"] = dict(sorted(state["seen"].items()))
    text = json.dumps(state, ensure_ascii=False, indent=2) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.write_text(text, encoding="utf-8")
    return True


# --------------------------------------------------------------------------

def main() -> int:
    token = env("THREADS_ACCESS_TOKEN")
    if not token:
        log("::error::Secret THREADS_ACCESS_TOKEN が未設定です。"
            "scripts/threads_mention_watch_README.md の手順を参照してください")
        return 1

    dry_run = env("THREADS_WATCH_DRY_RUN") == "1"
    gh_token = env("GITHUB_TOKEN")
    repo = env("THREADS_WATCH_ISSUE_REPO") or env("GITHUB_REPOSITORY")
    label = env("THREADS_WATCH_LABEL", "threads-mention")
    if not dry_run and (not gh_token or not repo):
        log("::error::GITHUB_TOKEN / GITHUB_REPOSITORY が未設定です")
        return 1

    kw_path = Path(env("THREADS_WATCH_KEYWORDS_FILE")
                   or REPO_ROOT / "scripts" / "threads_watch_keywords.json")
    st_path = Path(env("THREADS_WATCH_STATE_FILE")
                   or REPO_ROOT / "scripts" / "threads_watch_state.json")
    window = int(env("THREADS_WATCH_WINDOW_MINUTES", "90"))

    keywords, conf = load_keywords(kw_path)
    exclude_authors = {normalize(a).lstrip("@") for a in conf.get("exclude_authors", [])}
    exclude_texts = [normalize(t) for t in conf.get("exclude_if_text_contains", []) if t]
    verify = conf.get("verify_text_match", True)

    check_token_age(repo, gh_token, dry_run)

    state = load_state(st_path)
    known: set[str] = set(state["seen"].keys())
    if not dry_run:
        gh_ensure_label(repo, gh_token, label, "0e8a16", "Threadsで検出したN's factoryへの言及")
        known |= gh_known_post_ids(repo, gh_token, label)

    now = datetime.now(timezone.utc)
    since_ts = int((now - timedelta(minutes=window)).timestamp())
    since_jst = datetime.fromtimestamp(since_ts, JST).strftime("%Y-%m-%d %H:%M JST")
    log(f"検索対象: 直近 {window} 分（since={since_ts} / {since_jst} 以降）")
    log(f"キーワード {len(keywords)} 件 / 既知の Post ID {len(known)} 件")

    new_hits: list[tuple[dict, Keyword]] = []
    picked: set[str] = set()
    for kw in keywords:
        try:
            posts = threads_search(token, kw, since_ts)
        except ThreadsAuthError as e:
            log(f"::error::Threads のアクセストークンが使えません: {e}")
            if not dry_run:
                gh_raise_alert(repo, gh_token, str(e))
            return 1
        except ThreadsPermissionError as e:
            # App Review 待ちの間ずっとこの状態になる。毎時ジョブを赤くしても
            # 情報量がないので、警告 Issue を1本立てて正常終了する。
            log(f"::warning::トークンに threads_keyword_search がありません: {e}")
            log("::warning::権限を付けるまで言及は検出できません。手順は警告Issueを参照してください")
            if not dry_run:
                gh_raise_permission_alert(repo, gh_token, str(e))
            return 0
        log(f"  q={kw.q!r}: {len(posts)} 件")

        for post in posts:
            pid = str(post.get("id") or "")
            if not pid or pid in known or pid in picked:
                continue
            author = normalize(post.get("username") or "").lstrip("@")
            if author and author in exclude_authors:
                continue
            text = post.get("text") or ""
            n_text = normalize(text)
            if exclude_texts and any(x in n_text for x in exclude_texts):
                continue
            # 本文が空(画像のみ等)のときは取りこぼしを避けるため照合をスキップする
            if verify and text.strip() and not kw.hits(text):
                continue
            picked.add(pid)
            new_hits.append((post, kw))

    if not new_hits:
        log("新しい言及はありませんでした。")
        return 0

    log(f"新しい言及 {len(new_hits)} 件")
    for post, kw in new_hits:
        title, body = build_issue(post, kw)
        if dry_run:
            log("\n--- DRY RUN ---\n" + title + "\n" + body)
            continue
        number = gh_create_issue(repo, gh_token, title, body, [label])
        if number is None:
            return 1
        log(f"  Issue #{number} を作成: {title}")
        state["seen"][str(post["id"])] = {
            "first_seen": now.isoformat(),
            "issue": number,
            "keyword": kw.q,
        }

    if dry_run:
        return 0

    prune(state)
    state["updated_at"] = now.isoformat()
    if save_state(st_path, state):
        log(f"{st_path} を更新しました。")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 - Actions のログに理由を残して落とす
        log(f"::error::予期しないエラー: {type(exc).__name__}: {exc}")
        raise
