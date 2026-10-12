"""神社が増えたときに、宿（stays.json）と名産（specialties.json）を自動で取り足し、PR を作る。

使い方:
  py tools/refresh_affiliates.py              欠けた神社を取り足して検査 → ブランチ作成・PR 作成（自動実行用）
  py tools/refresh_affiliates.py --no-git     取得と検査だけ（ファイルは書き換える。git は触らない）
  py tools/refresh_affiliates.py --check      欠けの確認と検査だけ（API も git も使わない）

動く場所（作業用のクローン）は、他の作業と分けること。実行前に origin/main へ合わせ、ブランチ
auto/affiliate-refresh を作り直す。自動マージはしない（PR を作るところまで）。
結果は ~/.config/nsf/refresh_affiliates.log（NSF_REFRESH_LOG で変更可）に追記し、Windows のトーストで知らせる。
終了コード: 0=変更なし/成功、1=失敗（検査で不合格・API の失敗・git の失敗）
"""
import datetime, os, subprocess, sys

import affiliate_common as C
import build_stays, build_specialties

REPO = os.path.dirname(C.BASE)                       # リポジトリの根
LOG = os.environ.get("NSF_REFRESH_LOG") or os.path.join(os.path.expanduser("~"), ".config", "nsf", "refresh_affiliates.log")
BRANCH = "auto/affiliate-refresh"
FILES = ["shrine-note/stays.json", "shrine-note/specialties.json"]


def log(msg):
    line = "%s %s" % (datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), msg)
    print(line)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def toast(title, body):
    """Windows のトースト通知（失敗しても処理は止めない）。"""
    if os.name != "nt":
        return
    ps = (
        "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;"
        "$t=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent('ToastText02');"
        "$n=$t.GetElementsByTagName('text');"
        "$n.Item(0).AppendChild($t.CreateTextNode($env:NSF_T)) | Out-Null;"
        "$n.Item(1).AppendChild($t.CreateTextNode($env:NSF_B)) | Out-Null;"
        "$toast=[Windows.UI.Notifications.ToastNotification]::new($t);"
        "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('NsFactory').Show($toast)"
    )
    try:
        env = dict(os.environ, NSF_T=title, NSF_B=body)
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], env=env, timeout=30,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def run(args, check=True):
    # 無人実行で止まらないよう、入力待ちを禁止し、時間にも上限を付ける
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
    r = subprocess.run(args, cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       env=env, timeout=180)
    if check and r.returncode != 0:
        raise RuntimeError("%s → %s" % (" ".join(args), (r.stderr or r.stdout).strip()[:300]))
    return r


def missing():
    return {"stays": build_stays.missing_ids(), "specialties": build_specialties.missing_ids()}


def validate():
    """公開してよいデータかを検査。問題の文字列のリストを返す（空なら合格）。"""
    problems = []
    shrines = [s["id"] for s in C.load_shrines()]
    st = C.read_json("stays.json", {"stays": []})["stays"]
    sp = C.read_json("specialties.json", {"specialties": []})["specialties"]
    for name, rows in (("stays", st), ("specialties", sp)):
        ids = {r["shrine_id"] for r in rows}
        lost = [i for i in shrines if i not in ids]
        if lost:
            problems.append("%s に欠け: %s" % (name, ",".join(lost[:8])))
        if len(ids) != len(rows):
            problems.append("%s に重複" % name)
    for r in st:
        for h in r["hotels"]:
            if not str(h.get("url") or "").startswith(C.AFF_HOST):
                problems.append("stays 不正URL: %s" % r["shrine_id"])
            if "min_charge" in h or "price" in h:
                problems.append("stays に金額: %s" % r["shrine_id"])
    for r in sp:
        for i in r["items"]:
            if not str(i.get("url") or "").startswith(C.AFF_HOST):
                problems.append("specialties 不正URL: %s" % r["shrine_id"])
            if "price" in i or "min_charge" in i:
                problems.append("specialties に金額: %s" % r["shrine_id"])
    return problems


def main():
    args = sys.argv[1:]
    miss = missing()
    todo = sorted(set(miss["stays"]) | set(miss["specialties"]))
    if "--check" in args:
        probs = validate()
        log("確認: 欠け=%d社 検査=%s" % (len(todo), "合格" if not probs else "不合格 " + " / ".join(probs[:5])))
        return 1 if probs else 0
    if not todo:
        log("変更なし（欠けた神社はありません）")
        return 0
    use_git = "--no-git" not in args
    if use_git:
        status = run(["git", "status", "--porcelain", "--untracked-files=no"]).stdout.strip()
        if status:
            raise RuntimeError("作業用クローンに未コミットの変更があるため中止: " + status.replace("\n", " | ")[:200])
        run(["git", "fetch", "-q", "origin"])
        run(["git", "checkout", "-q", "-B", BRANCH, "origin/main"])
        miss = missing()
        todo = sorted(set(miss["stays"]) | set(miss["specialties"]))
        if not todo:
            log("変更なし（最新の main では欠けなし）")
            return 0
    log("欠けた神社: %s" % ",".join(todo))
    build_stays.build(missing=True)
    build_specialties.build(missing=True)
    probs = validate()
    if probs:
        if use_git:
            run(["git", "checkout", "--"] + FILES, check=False)
        log("検査で不合格のため中止: " + " / ".join(probs[:5]))
        toast("宿・名産の自動更新：失敗", "検査で不合格です。ログを確認してください。")
        return 1
    if not use_git:
        log("取得と検査まで完了（--no-git）: %d社" % len(todo))
        return 0
    run(["git", "add"] + FILES)
    if not run(["git", "diff", "--cached", "--name-only"]).stdout.strip():
        log("差分なし")
        return 0
    run(["git", "commit", "-q", "-m",
         "shrine-note: 宿・名産のデータを取り足し（%d社）\n\n追加: %s\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" % (len(todo), ",".join(todo))])
    run(["git", "push", "-q", "-f", "-u", "origin", BRANCH])
    body = ("神社の追加に合わせて、宿（楽天トラベル）と名産（楽天市場）のデータを取り足しました。\n\n"
            "追加した神社（%d社）: %s\n\n"
            "- 検査：全社そろっている／楽天以外のリンクなし／金額の混入なし\n"
            "- 自動で作成したPRです。**自動マージはしません**。内容を確認してマージしてください。\n\n"
            "🤖 Generated with [Claude Code](https://claude.com/claude-code)") % (len(todo), ", ".join(todo))
    pr = run(["gh", "pr", "list", "--head", BRANCH, "--state", "open", "--json", "url", "--jq", ".[0].url"], check=False).stdout.strip()
    if not pr:
        pr = run(["gh", "pr", "create", "--base", "main", "--head", BRANCH,
                  "--title", "神社巡りノート: 宿・名産のデータを取り足し（%d社）" % len(todo), "--body", body]).stdout.strip().splitlines()[-1]
    log("PR: %s（%d社）" % (pr, len(todo)))
    toast("宿・名産の自動更新：PRを作成", "%d社分。確認してマージしてください。" % len(todo))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:                                   # 想定外の失敗も、ログとトーストで知らせる
        log("失敗: %s" % e)
        toast("宿・名産の自動更新：失敗", str(e)[:120])
        sys.exit(1)
