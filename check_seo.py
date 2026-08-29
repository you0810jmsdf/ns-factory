# -*- coding: utf-8 -*-
"""
公開ページのSEO基本項目を点検する。

2026-08-29、日月神示アーカイブが sitemap 未登録＋title に主題語が無いために
検索に載らず、旧Googleサイトに月200PV超の流入を取られていたことが判明した。
同じ穴が他のページにも空いていないか、機械的に確認する。

使い方:  py check_seo.py
"""
import io, os, re, glob, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# robots.txt の Disallow を読み、非公開ページは点検対象から外す
disallow = []
rp = os.path.join(ROOT, "robots.txt")
if os.path.exists(rp):
    for line in io.open(rp, encoding="utf-8"):
        m = re.match(r"\s*Disallow:\s*(\S+)", line)
        if m:
            disallow.append(m.group(1).replace("/ns-factory", "").lstrip("/"))

sitemap = ""
sp = os.path.join(ROOT, "sitemap.xml")
if os.path.exists(sp):
    sitemap = io.open(sp, encoding="utf-8").read()

def is_public(rel):
    for d in disallow:
        if not d:
            continue
        if rel == d or rel.startswith(d):
            return False
    return True

def tag(html, pattern):
    m = re.search(pattern, html, re.I | re.S)
    return m.group(1).strip() if m else ""

issues = []
checked = 0
for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    if "node_modules" in rel or "_frozen" in rel or "backup" in rel.lower():
        continue
    if not is_public(rel):
        continue
    try:
        html = io.open(path, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    checked += 1

    title = tag(html, r"<title[^>]*>(.*?)</title>")
    desc  = tag(html, r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']')
    noindex = bool(re.search(r'name=["\']robots["\'][^>]*noindex', html, re.I))

    # sitemap に載っているか（index.html はディレクトリ形でも可）
    in_sitemap = rel in sitemap
    if not in_sitemap and rel.endswith("index.html"):
        in_sitemap = (rel[:-len("index.html")] in sitemap) or (rel == "index.html" and "/ns-factory/</loc>" in sitemap)

    probs = []
    if not title:
        probs.append("titleなし")
    if not desc:
        probs.append("descriptionなし")
    elif re.search(r"プロトタイプ|テスト|仮|サンプル|TODO|ダミー", desc):
        probs.append("descriptionが開発時の文言")
    if not noindex and not in_sitemap:
        probs.append("sitemap未登録")
    if noindex:
        probs.append("(noindex・意図的なら問題なし)")

    if probs:
        issues.append((rel, title[:44], probs))

print("点検した公開ページ: %d件" % checked)
print("")
for rel, title, probs in issues:
    print("%-52s %s" % (rel, " / ".join(probs)))
    if title:
        print("%-52s   title: %s" % ("", title))

print("")
print("指摘あり: %d件" % len(issues))
sys.exit(0)
