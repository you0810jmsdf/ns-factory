#!/usr/bin/env python3
"""神社うんちくページ（uncha.html・uncha-en.html）を uncha.json から作る。
使い方: py -X utf8 shrine-note/tools/build_uncha.py        （ns-factory の作業ツリーの直下で）
⛔ uncha.html / uncha-en.html は手で直さない。直すのは shrine-note/uncha.json。
uncha.json の形は README の「神社うんちく」の項を参照（ja/en の対で書く）。"""
import json, html, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))            # shrine-note/
D = json.load(open(os.path.join(ROOT, 'uncha.json'), encoding='utf-8'))
SHR = {s['id']: s for s in json.load(open(os.path.join(ROOT, 'shrines.json'), encoding='utf-8'))['shrines']}
DEI = {d['id']: d for d in json.load(open(os.path.join(ROOT, 'deities.json'), encoding='utf-8'))['deities']}
EN = json.load(open(os.path.join(ROOT, 'i18n', 'en.json'), encoding='utf-8'))

LBL = {
    'ja': {'title': '神社うんちく｜神社巡りノート', 'back': '← 神社巡りノートへ戻る', 'switch': 'English', 'switch_href': 'uncha-en.html',
           'verdict': {'correct': '正しい', 'partly': '一部正しい', 'myth': '俗説', 'unknown': '分かっていない'},
           'sources': '出典（資料の原文）', 'unknown_h': '資料では確かめられなかったこと', 'shrine': '神社', 'deity': '主な祭神', 'dir': '向き',
           'what': '何の向き', 'src': '出典', 'target': {'本殿': '本殿', '社殿': '社殿', 'その他': '神殿・境内'},
           'updated': '更新', 'legend': '判定のしるし', 'link': '資料を開く', 'other_page': '日本語'},
    'en': {'title': 'Shrine Lore | Shrine Note', 'back': '← Back to Shrine Note', 'switch': '日本語', 'switch_href': 'uncha.html',
           'verdict': {'correct': 'Correct', 'partly': 'Partly true', 'myth': 'Myth', 'unknown': 'Unknown'},
           'sources': 'Sources (original wording)', 'unknown_h': 'What the sources could not confirm', 'shrine': 'Shrine', 'deity': 'Main deity', 'dir': 'Faces',
           'what': 'What faces it', 'src': 'Source', 'target': {'本殿': 'Main hall (honden)', '社殿': 'Shrine buildings', 'その他': 'Hall / grounds'},
           'updated': 'Updated', 'legend': 'How we label claims', 'link': 'Open source', 'other_page': 'English'},
}

def e(s): return html.escape(s or '', quote=True)
def T(o, lg): return o.get(lg) or o.get('ja') or ''

CSS = """
:root { --bg: #0d100d; --panel: #161b15; --ink: #e9e7dc; --soft: #b9b8a8; --muted: #8b8c7c; --gold: #c9a96e; --line: rgba(201,169,110,.28);
  --ok: #7fb08a; --part: #d8b560; --myth: #d98a7a; --unk: #9a9cae; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg: #f6f3ea; --panel: #ffffff; --ink: #1f2420; --soft: #4a5048; --muted: #6d7167; --gold: #8a6a2f; --line: rgba(138,106,47,.35);
  --ok: #2f7a4a; --part: #8a6a2f; --myth: #a8432f; --unk: #5b5e73; } }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.9 "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", Georgia, serif; }
main { max-width: 760px; margin: 0 auto; padding: 28px 16px 72px; }
nav { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 18px; font: 13px system-ui, sans-serif; }
.eyebrow { font: 600 11px/1 system-ui, sans-serif; letter-spacing: .3em; color: var(--gold); }
h1 { margin: 10px 0 6px; font-size: 27px; line-height: 1.4; }
h2 { margin: 44px 0 6px; font-size: 21px; color: var(--gold); letter-spacing: .04em; line-height: 1.5; }
h3 { margin: 22px 0 6px; font-size: 16px; color: var(--gold); }
.lead { color: var(--soft); margin: 0 0 18px; }
.summary { background: var(--panel); border: 1px solid var(--line); border-left: 4px solid var(--gold); border-radius: 10px; padding: 12px 16px; margin: 14px 0; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
.card p { margin: 6px 0 0; color: var(--soft); font-size: 15px; }
.claim { font-weight: 600; }
.badge { display: inline-block; font: 700 12px/1 system-ui, sans-serif; padding: 5px 9px; border-radius: 99px; margin-right: 8px; border: 1px solid currentColor; vertical-align: 2px; }
.v-correct { color: var(--ok); } .v-partly { color: var(--part); } .v-myth { color: var(--myth); } .v-unknown { color: var(--unk); }
details { margin: 8px 0 0; }
summary { cursor: pointer; font: 13px system-ui, sans-serif; color: var(--muted); }
details li, details p { color: var(--soft); font-size: 14px; line-height: 1.7; }
blockquote { margin: 6px 0; padding: 2px 10px; border-left: 2px solid var(--line); color: var(--soft); font-size: 14px; }
table { width: 100%; border-collapse: collapse; font: 14px/1.6 system-ui, sans-serif; margin: 10px 0; }
th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; font-size: 12px; }
.dir { font-weight: 700; white-space: nowrap; }
.tbl { overflow-x: auto; }
.tbl table { min-width: 540px; }
.tbl td:first-child, .tbl td:last-child { white-space: nowrap; }
.note { color: var(--muted); font-size: 13px; }
a { color: var(--gold); }
.legend span { margin-right: 6px; }
ul.unk { padding-left: 1.2em; }
"""

def render(lg):
    L = LBL[lg]
    out = []
    A = out.append
    page = 'uncha.html' if lg == 'ja' else 'uncha-en.html'
    A(f'<!doctype html>\n<html lang="{lg}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
    A(f'<title>{e(L["title"])}</title>')
    A(f'<meta name="description" content="{e(T(D["description"], lg))}">')
    if D.get('noindex'): A('<meta name="robots" content="noindex, nofollow">')   # 確認が済むまで検索に出さない（uncha.json の noindex を false にすると外れる）
    A('<meta name="theme-color" content="#10130f">')
    A(f'<link rel="canonical" href="https://you0810jmsdf.github.io/ns-factory/shrine-note/{page}">')
    A(f'<link rel="alternate" hreflang="ja" href="https://you0810jmsdf.github.io/ns-factory/shrine-note/uncha.html">')
    A(f'<link rel="alternate" hreflang="en" href="https://you0810jmsdf.github.io/ns-factory/shrine-note/uncha-en.html">')
    A(f'<style>{CSS}</style>\n</head>\n<body>\n<main>')
    A(f'<nav><a href="map/{"?lang=en" if lg == "en" else ""}">{e(L["back"])}</a><a href="{L["switch_href"]}">{e(L["switch"])}</a></nav>')
    A('<div class="eyebrow">SHRINE LORE</div>')
    A(f'<h1>{e(T(D["h1"], lg))}</h1>')
    A(f'<p class="lead">{e(T(D["intro"], lg))}</p>')
    A(f'<div class="card"><b>{e(L["legend"])}</b><p class="legend">' +
      ''.join(f'<span class="badge v-{k}">{e(L["verdict"][k])}</span>' for k in ('correct', 'partly', 'myth', 'unknown')) + f'</p><p>{e(T(D["method"], lg))}</p></div>')
    for t in D['topics']:
        A(f'<section id="{e(t["id"])}">')
        A(f'<h2>{e(T(t["title"], lg))}</h2>')
        A(f'<p class="lead">{e(T(t["lead"], lg))}</p>')
        A(f'<div class="summary">{e(T(t["summary"], lg))}</div>')
        tb = t.get('table')
        if tb:
            A(f'<h3>{e(T(tb["caption"], lg))}</h3>')
            A(f'<div class="tbl"><table><tr><th>{e(L["shrine"])}</th><th>{e(L["deity"])}</th><th>{e(L["dir"])}</th><th>{e(L["what"])}</th><th>{e(L["src"])}</th></tr>')
            for r in tb['rows']:
                s = SHR[r['id']]
                name = (EN.get('shrines', {}).get(r['id'], {}).get('name') if lg == 'en' else None) or s['name']
                dids = s.get('deity_ids') or []
                dn = ''
                if dids:
                    d0 = DEI.get(dids[0], {})
                    dn = (EN.get('deities', {}).get(dids[0], {}).get('name') if lg == 'en' else None) or d0.get('name', '')
                note = T(r.get('note', {}), lg) if r.get('note') else ''
                A(f'<tr><td>{e(name)}</td><td>{e(dn)}</td><td class="dir">{e(T(r["dir"], lg))}</td>'
                  f'<td>{e(L["target"].get(r["target"], r["target"]))}{("<br><span class=note>" + e(note) + "</span>") if note else ""}</td>'
                  f'<td><a href="{e(r["url"])}" target="_blank" rel="noopener">{e(L["link"])}</a></td></tr>')
            A('</table></div>')
            if tb.get('foot'): A(f'<p class="note">{e(T(tb["foot"], lg))}</p>')
        for c in t['claims']:
            v = c['verdict']
            A(f'<div class="card"><div class="claim"><span class="badge v-{v}">{e(L["verdict"][v])}</span>{e(T(c["claim"], lg))}</div>')
            A(f'<p>{e(T(c["explanation"], lg))}</p>')
            if c.get('sources'):
                A(f'<details><summary>{e(L["sources"])}</summary><ul>')
                for s in c['sources']:
                    A(f'<li><blockquote>{e(s["quote"])}</blockquote><a href="{e(s["url"])}" target="_blank" rel="noopener">{e(s["label"])}</a></li>')
                A('</ul></details>')
            A('</div>')
        if t.get('unknown'):
            A(f'<details><summary>{e(L["unknown_h"])}</summary><ul class="unk">')
            for u in t['unknown']: A(f'<li>{e(T(u, lg))}</li>')
            A('</ul></details>')
        A('</section>')
    A(f'<p class="note" style="margin-top:40px">{e(L["updated"])}: {e(D["updated"])}</p>')
    A('</main>\n</body>\n</html>\n')
    return '\n'.join(out)

for lg, name in (('ja', 'uncha.html'), ('en', 'uncha-en.html')):
    open(os.path.join(ROOT, name), 'w', encoding='utf-8', newline='\n').write(render(lg))
    print('書き出し:', name)
