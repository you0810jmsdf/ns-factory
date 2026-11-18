"""古事記アーカイブ（上巻・中巻）と日本書紀アーカイブ（巻第一〜巻第十）のページを作る。
使い方: python3 hitsuki/tools/build_archives.py
入力: hitsuki/kojiki/data/myths.json・hitsuki/shoki/data/episodes.json（研究データ）、
      shrine-note/deities.json・shrines.json（神様の読み・祀る神社）
出力: hitsuki/kojiki/index.html・<id>.html、hitsuki/shoki/index.html・<id>.html
検査: python3 hitsuki/tools/verify_archives.py（原文を取り直して、引用が一字一句含まれるかを見る）"""
import json, html, os

HERE = os.path.dirname(os.path.abspath(__file__))
HIT = os.path.normpath(os.path.join(HERE, '..'))
ROOT = os.path.normpath(os.path.join(HIT, '..'))
SITE = 'https://you0810jmsdf.github.io/ns-factory/hitsuki/'
deities = {d['id']: d for d in json.load(open(os.path.join(ROOT, 'shrine-note', 'deities.json'), encoding='utf-8'))['deities']}
shrines = json.load(open(os.path.join(ROOT, 'shrine-note', 'shrines.json'), encoding='utf-8'))['shrines']
KOJ = json.load(open(os.path.join(HIT, 'kojiki', 'data', 'myths.json'), encoding='utf-8'))['myths']
SHO = json.load(open(os.path.join(HIT, 'shoki', 'data', 'episodes.json'), encoding='utf-8'))['episodes']
for m in KOJ: m.setdefault('kan', '上巻')
e = lambda s: html.escape(str(s or ''), quote=True)
MAP = '../../shrine-note/map/'

# 対応表：日本書紀のページ → 古事記のページ（両方向のリンクに使う）
K2S = {}
for s in SHO:
    for k in s.get('kojiki_pages', []):
        K2S.setdefault(k, []).append(s)
KBY = {m['id']: m for m in KOJ}
# 英語版のデータ（あれば日本語ページに English のリンクを出す）
HAS_EN = os.path.exists(os.path.join(HIT, 'kojiki', 'data', 'myths.en.json')) and os.path.exists(os.path.join(HIT, 'shoki', 'data', 'episodes.en.json'))
# 「読みもの」の型（扉絵・場面の小見出し・挿絵）。書いてある話だけ新しい型で作る。無い話は今までの型のまま
_LP = os.path.join(HIT, 'kojiki', 'data', 'layout.json')
LAYOUT = json.load(open(_LP, encoding='utf-8'))['pages'] if os.path.exists(_LP) else {}
_SLP = os.path.join(HIT, 'shoki', 'data', 'layout.json')
SLAYOUT = json.load(open(_SLP, encoding='utf-8'))['pages'] if os.path.exists(_SLP) else {}
ART = '../assets/kiki/book/'
ART_SIZE = {'tall': (810, 1440), 'port': (900, 1125), 'wide': (1152, 768)}

GA = '''<!-- Google tag (gtag.js) -->
<script>
try { if (localStorage.getItem('nsf_ga_optout') === '1') { window['ga-disable-G-ND1T7H067Y'] = true; } } catch (e) {}
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ND1T7H067Y"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ND1T7H067Y');
</script>'''

CSS = '''
    .pg-main { max-width: 860px; margin: 0 auto; padding: 96px 16px 64px; }
    .pg-main h1 { font-size: clamp(1.6rem, 4vw, 2.2rem); margin: 4px 0 8px; }
    .pg-lead { color: var(--ink-soft); margin: 0 0 24px; line-height: 1.9; }
    .pg-card { border: 1px solid var(--line); border-radius: var(--radius); background: rgba(24, 36, 27, 0.55); padding: 20px; margin-bottom: 20px; }
    .pg-card h2 { font-size: 1.1rem; margin: 0 0 14px; }
    .pg-card h3 { font-size: 1rem; margin: 18px 0 6px; }
    .pg-card p { line-height: 1.95; margin: 0 0 12px; }
    .pg-card p:last-child { margin-bottom: 0; }
    .pts { border-color: var(--line-strong); background: rgba(216, 183, 102, 0.07); }
    .pts ol { margin: 0; padding-left: 1.4em; }
    .pts li { line-height: 1.85; margin: 0 0 10px; }
    .pts li:last-child { margin-bottom: 0; }
    .kind { display: inline-block; font-size: .72rem; line-height: 1; padding: 4px 7px; border-radius: 999px; border: 1px solid var(--line-strong); color: var(--gold); margin-right: 6px; vertical-align: 2px; white-space: nowrap; }
    .kind.k-cmp { color: #9fc3d8; border-color: rgba(159,195,216,.45); }
    .kind.k-int { color: #d9a7c7; border-color: rgba(217,167,199,.45); }
    .kind.k-var { color: #b9d3a0; border-color: rgba(185,211,160,.45); }
    .q { margin: 0 0 14px; }
    .q:last-child { margin-bottom: 0; }
    .q blockquote { margin: 0; padding: 6px 0 6px 12px; border-left: 2px solid var(--gold); font-size: 1.05rem; line-height: 1.8; letter-spacing: .04em; }
    .q p { color: var(--ink-soft); font-size: .92rem; margin: 6px 0 0 14px; }
    .who { list-style: none; margin: 0; padding: 0; }
    .who li { padding: 10px 0; border-bottom: 1px solid rgba(245, 239, 225, 0.08); line-height: 1.75; }
    .who li:last-child { border-bottom: 0; }
    .who b { font-size: 1.02rem; }
    .who small { color: var(--muted); margin-left: 6px; }
    .who .sh { display: block; font-size: .88rem; color: var(--ink-soft); }
    .pg-card a, .pg-back { color: var(--gold); }
    .ns { margin: 0 0 14px; }
    .ns:last-child { margin-bottom: 0; }
    .ns .where { color: var(--muted); font-size: .85rem; }
    .ns blockquote { margin: 6px 0 0; padding-left: 10px; border-left: 2px solid rgba(159,195,216,.6); color: var(--ink-soft); font-size: .95rem; }
    .var { margin: 0 0 12px; padding-left: 12px; border-left: 2px solid rgba(185,211,160,.5); }
    .var:last-child { margin-bottom: 0; }
    .var b { color: #b9d3a0; font-size: .9rem; }
    .xlink { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
    .xlink a { border: 1px solid var(--line-strong); border-radius: 999px; padding: 6px 14px; font-size: .9rem; color: var(--gold); text-decoration: none; }
    .pg-note { color: var(--muted); font-size: .85rem; line-height: 1.8; margin: 0; }
    .pg-src { margin: 8px 0 0; padding-left: 1.2em; line-height: 1.9; font-size: .9rem; word-break: break-all; }
    .pager { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0 20px; }
    .pager a { flex: 1; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; color: var(--ink); text-decoration: none; line-height: 1.6; }
    .pager a small { display: block; color: var(--muted); font-size: .78rem; }
    .pager a.next { text-align: right; }
    .pager a:hover { border-color: var(--line-strong); }
    .toc { list-style: none; margin: 0; padding: 0; }
    .toc li { border-bottom: 1px solid rgba(245, 239, 225, 0.08); }
    .toc li:last-child { border-bottom: 0; }
    .toc a { display: grid; grid-template-columns: 2.6em 1fr; gap: 2px 10px; padding: 14px 4px; color: var(--ink); text-decoration: none; }
    .toc a:hover { background: rgba(216,183,102,.06); }
    .toc .no { color: var(--gold); font-variant-numeric: tabular-nums; grid-row: span 2; font-size: 1.1rem; }
    .toc b { font-size: 1.05rem; }
    .toc span.lead { color: var(--ink-soft); font-size: .9rem; line-height: 1.7; }
    .toc a.has-th { grid-template-columns: 2.6em 1fr 56px; }
    .toc img.th { grid-column: 3; grid-row: 1 / span 2; width: 56px; height: auto; border-radius: 6px; border: 1px solid var(--line); align-self: center; }
    .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .85rem; color: var(--ink-soft); margin: 0 0 12px; }
    .jump { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
    .jump a { border: 1px solid var(--line); border-radius: 999px; padding: 6px 14px; font-size: .9rem; color: var(--ink); text-decoration: none; }
    @media (max-width: 640px) { .pager { flex-direction: column; } .pager a.next { text-align: left; } }
'''

BK_CSS = '''    /* 「読みもの」の型（layout.json にある話） */
    .bk-open { display: grid; grid-template-columns: 1fr 300px; grid-template-areas: "head hero" "intro hero"; gap: 0 32px; align-items: start; margin-bottom: 36px; }
    .bk-open.nohero { grid-template-columns: 1fr; grid-template-areas: "head" "intro"; max-width: 700px; margin-left: auto; margin-right: auto; }
    .bk-head { grid-area: head; align-self: end; }
    .bk-intro { grid-area: intro; }
    .bk-hero { grid-area: hero; margin: 0; }
    .bk-lead { font-size: 1.05rem; line-height: 2; color: var(--ink-soft); margin: 0 0 14px; }
    .bk-meta { color: var(--muted); font-size: .88rem; margin: 0 0 16px; }
    .bk-meta a { color: var(--gold); }
    .bk figure { margin: 0; }
    .bk figure img { display: block; width: 100%; height: auto; border-radius: var(--radius); border: 1px solid var(--line); }
    .bk figcaption { color: var(--muted); font-size: .82rem; line-height: 1.7; margin-top: 8px; text-align: center; }
    .bk-story { max-width: 700px; margin: 0 auto 40px; }
    .bk-story h2 { font-family: "Yu Mincho", "Hiragino Mincho ProN", serif; font-size: 1.35rem; text-align: center; letter-spacing: .3em; margin: 0 0 8px; color: var(--gold); }
    .bk-story h3 { font-family: "Yu Mincho", "Hiragino Mincho ProN", serif; font-size: 1.2rem; line-height: 1.6; margin: 40px 0 12px; padding-left: 14px; border-left: 3px solid var(--gold); }
    .bk-story p.t { font-size: 1.05rem; line-height: 2.1; margin: 0 0 8px; }
    .bk-figs { display: grid; gap: 20px; margin: 28px auto 8px; justify-items: center; }
    .bk-figs figure { width: 100%; }
    .bk-figs .f-tall { max-width: 340px; }
    .bk-figs .f-port { max-width: 440px; }
    .bk-figs.two { grid-template-columns: 1fr 1fr; }
    .bk-story .pg-note { margin-top: 28px; text-align: center; }
    .bk-app details { border-top: 1px solid rgba(245, 239, 225, 0.1); padding: 12px 0; }
    .bk-app details:first-of-type { border-top: 0; }
    .bk-app summary { cursor: pointer; color: var(--gold); font-size: 1rem; line-height: 1.8; }
    .bk-app details[open] summary { margin-bottom: 14px; }
    @media (max-width: 720px) {
      .bk-open { grid-template-columns: 1fr; grid-template-areas: "head" "hero" "intro"; gap: 0; }
      .bk-open.nohero { grid-template-areas: "head" "intro"; }
      .bk-hero { max-width: 280px; margin: 8px auto 24px; }
      .bk-figs.two { grid-template-columns: 1fr; }
    }
'''

BOOK = {
    'kojiki': {'name': '古事記アーカイブ', 'mark': '古記', 'nav': [('./', '話の一覧'), ('../shoki/', '日本書紀アーカイブ'), ('../kiki.html', '古事記と日本書紀')]},
    'shoki': {'name': '日本書紀アーカイブ', 'mark': '書紀', 'nav': [('./', 'ページの一覧'), ('../kojiki/', '古事記アーカイブ'), ('../kiki.html', '古事記と日本書紀')]},
}
KIND = {'本文': ('', '本文'), '一書': ('k-var', '一書（別の伝え）'), '比較': ('k-cmp', '比較'), '解説': ('k-int', '解説')}

def en_url(canon):  # 日本語ページの英語版のURL（kojiki/xxx.html → kojiki/en/xxx.html）
    for bk in ('kojiki/', 'shoki/'):
        if bk in canon: return canon.replace(bk, bk + 'en/')
    return None

def head(book, title, desc, canon, extra_css=''):
    b = BOOK[book]
    nav = ''.join(f'\n      <a href="{h}">{e(t)}</a>' for h, t in b['nav'])
    en = en_url(canon) if HAS_EN else None
    rel = canon.split(book + '/', 1)[1]
    if en: nav += f'\n      <a href="en/{rel}" lang="en" hreflang="en">English</a>'
    alt = f'\n  <link rel="alternate" hreflang="ja" href="{canon}">\n  <link rel="alternate" hreflang="en" href="{en}">' if en else ''
    return f'''<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#10130f">
  <title>{e(title)}</title>
{GA}
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{canon}">{alt}
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:type" content="article">
  <link rel="stylesheet" href="../styles.css">
  <style>{CSS}{extra_css}  </style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="./" aria-label="{e(b['name'])} トップへ">
      <span class="brand-mark" aria-hidden="true">{e(b['mark'])}</span>
      <span>{e(b['name'])}</span>
    </a>
    <nav class="site-nav" aria-label="ページ内ナビゲーション">{nav}
      <a href="../index.html" class="nav-back">← 教育幕僚室へ戻る</a>
    </nav>
  </header>
'''

FOOT = '''
<script src="../../assets/access-counter.js"></script>
</body>
</html>
'''

def badge(k, book):
    c, label = KIND.get(k, ('', k))
    if k == '比較': label = '日本書紀と比較' if book == 'kojiki' else '古事記と比較'
    return f'<span class="kind {c}">{e(label)}</span>'

def points_html(m, book):
    out = ['    <section class="pg-card pts" aria-labelledby="pts-title">', '      <h2 id="pts-title">覚えておくポイント</h2>', '      <ol>']
    for p in m['points']:
        src = ''.join(f' <a href="{e(u)}" target="_blank" rel="noopener">［出典］</a>' for u in p.get('src', []))
        out.append(f'        <li>{badge(p["kind"], book)}{e(p["text"])}{src}</li>')
    out += ['      </ol>', '    </section>']
    return '\n'.join(out)

def who_html(m):
    out = ['    <section class="pg-card" aria-labelledby="who-title">', '      <h2 id="who-title">登場する神・人物と、祀る神社</h2>', '      <ul class="who">']
    for i in m['deities']:
        d = deities.get(i)
        if not d: continue
        sh = [s for s in shrines if i in (s.get('deity_ids') or [])]
        shl = '、'.join(f'<a href="{MAP}?s={e(s["id"])}">{e(s["name"])}</a>' for s in sh)
        out.append(f'        <li><b><a href="{MAP}?d={e(i)}">{e(d["name"])}</a></b>{f"<small>{e(d.get("reading"))}</small>" if d.get("reading") else ""}'
                   + (f'<span class="sh">祀る神社：{shl}</span>' if sh else '<span class="sh">神社巡りノートには、まだ祀る神社がありません</span>') + '</li>')
    for f in m.get('figures', []):
        out.append(f'        <li><b>{e(f["name"])}</b>{f"<small>{e(f.get("reading"))}</small>" if f.get("reading") else ""}<span class="sh">{e(f.get("role"))}</span></li>')
    out += ['      </ul>', '      <p class="pg-note">名前を押すと、神社巡りノートの神様のページ（古事記・日本書紀での名前と場面）が開きます。</p>', '    </section>']
    return '\n'.join(out)

def quotes_html(m):
    out = ['    <section class="pg-card" aria-labelledby="q-title">', '      <h2 id="q-title">原文で読む</h2>']
    for q in m['quotes']:
        out.append(f'      <div class="q"><blockquote lang="zh-Hant">{e(q["text"])}</blockquote><p>{e(q["note"])}</p></div>')
    out.append('    </section>')
    return '\n'.join(out)

def cmp_html(items, title, colorq=True):
    if not items: return ''
    out = ['', '    <section class="pg-card" aria-labelledby="ns-title">', f'      <h2 id="ns-title">{e(title)}</h2>']
    for n in items:
        qt = f'<blockquote lang="zh-Hant">{e(n["quote"])}</blockquote>' if n.get('quote') else ''
        out.append(f'      <div class="ns"><span class="where">{e(n.get("where"))}</span><p>{e(n["text"])}</p>{qt}</div>')
    out.append('    </section>')
    return '\n'.join(out)

def pager_html(seq, i, label, unit):
    prev = seq[i - 1] if i else None
    nxt = seq[i + 1] if i + 1 < len(seq) else None
    p = '<nav class="pager" aria-label="前後のページ">'
    p += f'<a class="prev" href="{prev["id"]}.html"><small>← 前の{unit}（{e(label(prev))}）</small>{e(prev["title"])}</a>' if prev else '<span></span>'
    p += f'<a class="next" href="{nxt["id"]}.html"><small>次の{unit}（{e(label(nxt))}）→</small>{e(nxt["title"])}</a>' if nxt else '<span></span>'
    return p + '</nav>'

def src_list(urls, base):
    li = list(base)
    for u in urls:
        label = '國學院大學「神名データベース」' if 'kokugakuin' in u else u
        li.append(f'<li><a href="{e(u)}" target="_blank" rel="noopener">{e(label)}</a>　{e(u)}</li>')
    return ''.join(li)

WS = lambda t, label: f'<li><a href="https://zh.wikisource.org/wiki/{t}" target="_blank" rel="noopener">{label}</a>　中文維基文庫</li>'
_K = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
      '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十']
KANJI = {i + 1: k for i, k in enumerate(_K)}
# 中文維基文庫の巻名（二十一〜二十九は「廿」）
SHOKI_VOL = {n: '卷第' + (k.replace('二十', '廿') if 21 <= n <= 29 else k) for n, k in KANJI.items()}
KOJ_WS = {'上巻': '古事記/上卷', '中巻': '古事記/中卷', '下巻': '古事記/下卷'}
KAN_SUB = {'上巻': '神々の時代', '中巻': '神武天皇から応神天皇まで', '下巻': '仁徳天皇から推古天皇まで'}
def vol_of(s): return int(s['span'][0][1:].split('-')[0])

def shoki_vols(refs):
    vs = sorted({int(r[1:].split('-')[0]) for r in refs if r.startswith('N') and '-' in r})
    return [WS(f'日本書紀/{SHOKI_VOL[v]}', f'日本書紀 巻第{KANJI[v]}') for v in vs]

# ---------- 古事記 ----------
def klabel(m): return f'{m["kan"]}・第{m["no"]}話'

def fig_html(f, eager=False):
    w, h = f.get('size') or ART_SIZE[f.get('shape', 'tall')]
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<figure class="f-{e(f.get("shape", "tall"))}"><img src="{ART}{e(f["img"])}" width="{w}" height="{h}" alt="{e(f["cap"])}" {load} decoding="async">'
            f'<figcaption>{e(f["cap"])}（想像図・AI生成）</figcaption></figure>')

def kojiki_book_page(i, lay):
    """読みものの型：扉絵と導入 → 場面ごとの物語 → 要点 → 神と神社 → 日本書紀との違い → 資料編。文章は myths.json のまま。"""
    m = KOJ[i]
    kan = m['kan']; cnt = sum(1 for x in KOJ if x['kan'] == kan)
    if len(lay['heads']) != len(m['story']): raise SystemExit(f'{m["id"]}: layout.json の heads が {len(lay["heads"])}個、story は {len(m["story"])}段です')
    title = f"{m['title']}｜古事記 {kan} 第{m['no']}話｜古事記アーカイブ"
    out = [head('kojiki', title, m['lead'], SITE + 'kojiki/' + m['id'] + '.html', BK_CSS)]
    xl = ''.join(f'<a href="../shoki/{s["id"]}.html">日本書紀で読む：{e(s["title"])} ›</a>' for s in K2S.get(m['id'], []))
    mins = max(1, -(-sum(len(s['text']) for s in m['story']) // 500))
    hero = dict(lay['hero'], shape='tall') if lay.get('hero') else None
    hero_html = f'<div class="bk-hero">{fig_html(hero, eager=True)}</div>' if hero else ''
    out.append(f'''  <main class="pg-main bk">
    <header class="bk-open{'' if hero else ' nohero'}">
      <div class="bk-head">
        <p class="eyebrow">古事記 {kan}・第{m['no']}話（全{cnt}話）</p>
        <h1>{e(m['title'])}</h1>
      </div>
      {hero_html}
      <div class="bk-intro">
        <p class="bk-lead">{e(m['lead'])}</p>
        <p class="bk-meta">物語を読む時間の目安：約{mins}分　／　<a href="#pts-title">要点だけ読む</a></p>
        {f'<div class="xlink">{xl}</div>' if xl else ''}
      </div>
    </header>

    <section class="bk-story" aria-labelledby="story-title">
      <h2 id="story-title">物語</h2>''')
    for n, s in enumerate(m['story']):
        out.append(f'      <h3>{e(lay["heads"][n])}</h3>\n      <p class="t">{e(s["text"])}</p>')
        fs = [f for f in lay.get('figs', []) if f['after'] == n]
        if fs: out.append(f'      <div class="bk-figs{" two" if len(fs) == 2 else ""}">' + ''.join(fig_html(f) for f in fs) + '</div>')
    out.append('      <p class="pg-note">古事記の原文に書かれていることを、やさしい言葉でまとめたものです（訳書の文章は使っていません）。小見出しは、読みやすくするために本文の言葉から付けました。</p>\n    </section>\n')
    out.append(points_html(m, 'kojiki').replace('覚えておくポイント', 'この話の要点'))
    out.append(''); out.append(who_html(m))
    out.append(cmp_html(m.get('nihonshoki'), '日本書紀との違い'))
    base = [WS(KOJ_WS[kan], f'古事記 {kan} 校訂本文')] + shoki_vols([n.get('ref', '') for n in m.get('nihonshoki', [])])
    qs = ''.join(f'\n          <div class="q"><blockquote lang="zh-Hant">{e(q["text"])}</blockquote><p>{e(q["note"])}</p></div>' for q in m['quotes'])
    out.append(f'''
    {pager_html(KOJ, i, klabel, '話')}

    <section class="pg-card bk-app" aria-labelledby="src-title">
      <h2 id="src-title">資料編</h2>
      <details>
        <summary>原文で読む（{len(m['quotes'])}か所）</summary>{qs}
      </details>
      <details>
        <summary>出典と、印の意味</summary>
        <p class="pg-note">「本文」は古事記に書かれていること、「日本書紀と比較」は日本書紀の原文で確かめた違い、「解説」は公的な機関の解説で確かめたことです。原文の引用は、中文維基文庫の校訂本文から一字一句そのまま写しています（〔 〕は原文の小注）。絵はすべて AI で作った想像図で、実在のご神体・社殿・人物を写したものではありません。</p>
        <ul class="pg-src">
          {src_list(m.get('sources', []), base)}
        </ul>
      </details>
      <a class="pg-back" href="./">← 話の一覧へ</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def kojiki_page(i):
    m = KOJ[i]
    if m['id'] in LAYOUT: return kojiki_book_page(i, LAYOUT[m['id']])
    kan = m['kan']; cnt = sum(1 for x in KOJ if x['kan'] == kan)
    title = f"{m['title']}｜古事記 {kan} 第{m['no']}話｜古事記アーカイブ"
    out = [head('kojiki', title, m['lead'], SITE + 'kojiki/' + m['id'] + '.html')]
    xl = ''.join(f'<a href="../shoki/{s["id"]}.html">日本書紀で読む：{e(s["title"])} ›</a>' for s in K2S.get(m['id'], []))
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">古事記 {kan}・第{m['no']}話（全{cnt}話）</p>
    <h1>{e(m['title'])}</h1>
    <p class="pg-lead">{e(m['lead'])}</p>
    {f'<div class="xlink">{xl}</div>' if xl else ''}
''')
    out.append(points_html(m, 'kojiki'))
    out.append('\n    <section class="pg-card" aria-labelledby="story-title">\n      <h2 id="story-title">どんな話か</h2>')
    out += [f'      <p>{e(s["text"])}</p>' for s in m['story']]
    out.append('      <p class="pg-note">古事記の原文に書かれていることを、やさしい言葉でまとめたものです（訳書の文章は使っていません）。</p>\n    </section>\n')
    out.append(quotes_html(m)); out.append(''); out.append(who_html(m))
    out.append(cmp_html(m.get('nihonshoki'), '日本書紀では'))
    base = [WS(KOJ_WS[kan], f'古事記 {kan} 校訂本文')] + shoki_vols([n.get('ref', '') for n in m.get('nihonshoki', [])])
    out.append(f'''
    {pager_html(KOJ, i, klabel, '話')}

    <section class="pg-card" aria-labelledby="src-title">
      <h2 id="src-title">出典</h2>
      <p class="pg-note">「本文」は古事記に書かれていること、「日本書紀と比較」は日本書紀の原文で確かめた違い、「解説」は公的な機関の解説で確かめたことです。原文の引用は、中文維基文庫の校訂本文から一字一句そのまま写しています（〔 〕は原文の小注）。</p>
      <ul class="pg-src">
        {src_list(m.get('sources', []), base)}
      </ul>
      <a class="pg-back" href="./">← 話の一覧へ</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def kojiki_index():
    kans = [k for k in ['上巻', '中巻', '下巻'] if any(m['kan'] == k for m in KOJ)]
    n = len(KOJ)
    title = "古事記アーカイブ｜上巻・中巻・下巻を一話ずつ｜教育幕僚室｜N's factory"
    desc = f'古事記の上巻（神々の時代）・中巻（神武天皇〜応神天皇）・下巻（仁徳天皇〜推古天皇）を{n}話に分け、話ごとに、場面ごとの物語・要点・登場する神と祀る神社・日本書紀との違い・原文をまとめた読みもの。'
    out = [head('kojiki', title, desc, SITE + 'kojiki/')]
    jump = ''.join(f'<a href="#kan-{k}">{k}</a>' for k in kans) + '<a href="#review">要点の復習</a><a href="../shoki/">日本書紀アーカイブ ›</a>'
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">Kojiki Archive</p>
    <h1>古事記アーカイブ</h1>
    <p class="pg-lead">古事記の上・中・下の三巻（神々の時代から推古天皇まで）を、{n}の話に分けて、一話ずつ読めるようにしました。どの話も、物語を場面ごとに読み、読み終えたあとに要点・登場する神・日本書紀との違いを確かめられます。原文と出典は、各話の末尾の「資料編」にあります。</p>
    <div class="jump">{jump}</div>

    <section class="pg-card" aria-labelledby="how-title">
      <h2 id="how-title">このアーカイブの決まり</h2>
      <p>書いてあることは、古事記の原文で確かめたことだけです。後の時代の解釈を書くときは「解説」の印を付け、公的な機関の解説で確かめた出典を添えています。同じ場面を日本書紀で読みたいときは、各話の上にある「日本書紀で読む」から移れます。</p>
      <div class="legend">{badge("本文", "kojiki")}古事記に書いてあること {badge("比較", "kojiki")}日本書紀との違い {badge("解説", "kojiki")}出典つきの解釈</div>
    </section>
''')
    for k in kans:
        ms = [m for m in KOJ if m['kan'] == k]
        sub = KAN_SUB[k]
        out.append(f'    <section class="pg-card" id="kan-{k}" aria-labelledby="toc-{k}">\n      <h2 id="toc-{k}">{k}（{sub}・全{len(ms)}話）</h2>\n      <ol class="toc">')
        for m in ms:
            hero = (LAYOUT.get(m['id']) or {}).get('hero')
            th = f'<img class="th" src="{ART}{e(hero["img"].replace("-hero", "-thumb"))}" width="160" height="284" alt="" loading="lazy" decoding="async">' if hero else ''
            cls = ' class="has-th"' if hero else ''
            out.append(f'        <li><a href="{m["id"]}.html"{cls}><span class="no">{m["no"]}</span><b>{e(m["title"])}</b><span class="lead">{e(m["points"][0]["text"])}</span>{th}</a></li>')
        out.append('      </ol>\n    </section>\n')
    out.append('    <section class="pg-card" id="review" aria-labelledby="all-title">\n      <h2 id="all-title">全話の要点（復習用）</h2>\n      <p class="pg-note">復習用に、各話の要点を上から2つずつ並べました。</p>')
    for m in KOJ:
        out.append(f'      <h3><a href="{m["id"]}.html">{m["kan"]} 第{m["no"]}話　{e(m["title"])}</a></h3><ul style="margin:0;padding-left:1.2em;line-height:1.85;">'
                   + ''.join(f'<li>{e(p["text"])}</li>' for p in m['points'][:2]) + '</ul>')
    out.append('''    </section>

    <section class="pg-card" aria-labelledby="rel-title">
      <h2 id="rel-title">あわせて読む</h2>
      <p><a href="../shoki/">日本書紀アーカイブ</a>　同じ時代を、日本書紀の本文と一書（別の伝え）で読む。</p>
      <p><a href="../kiki.html">古事記と日本書紀の関係</a>　二つの書は、いつ・誰が・どう作ったのか。</p>
      <p><a href="../../shrine-note/map/">神社巡りノート</a>　神様を祀る全国の神社を、日本列島の地図でたどれます。</p>
      <a class="pg-back" href="../index.html">← 教育幕僚室へ戻る</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

# ---------- 日本書紀 ----------
def slabel(s): return s['kan']

def shoki_book_page(i, lay):
    """読みものの型（日本書紀）：導入 → 場面ごとの本文の話 → 要点 → 一書 → 神と神社 → 古事記との違い → 資料編。文章は episodes.json のまま。"""
    s = SHO[i]
    if len(lay['heads']) != len(s['story']): raise SystemExit(f'{s["id"]}: layout.json の heads が {len(lay["heads"])}個、story は {len(s["story"])}段です')
    title = f"{s['title']}｜日本書紀 {s['kan']}｜日本書紀アーカイブ"
    out = [head('shoki', title, s['lead'], SITE + 'shoki/' + s['id'] + '.html', BK_CSS)]
    xl = ''.join(f'<a href="../kojiki/{k}.html">古事記で読む：{e(KBY[k]["title"])} ›</a>' for k in s.get('kojiki_pages', []) if k in KBY)
    mins = max(1, -(-sum(len(x['text']) for x in s['story']) // 500))
    hero = dict(lay['hero'], shape='tall') if lay.get('hero') else None
    hero_html = f'<div class="bk-hero">{fig_html(hero, eager=True)}</div>' if hero else ''
    out.append(f'''  <main class="pg-main bk">
    <header class="bk-open{'' if hero else ' nohero'}">
      <div class="bk-head">
        <p class="eyebrow">日本書紀 {e(s['kan'])}（全{len(SHO)}ページ中 {i + 1}）</p>
        <h1>{e(s['title'])}</h1>
      </div>
      {hero_html}
      <div class="bk-intro">
        <p class="bk-lead">{e(s['lead'])}</p>
        <p class="bk-meta">本文の話を読む時間の目安：約{mins}分　／　<a href="#pts-title">要点だけ読む</a></p>
        {f'<div class="xlink">{xl}</div>' if xl else ''}
      </div>
    </header>

    <section class="bk-story" aria-labelledby="story-title">
      <h2 id="story-title">本文の話</h2>''')
    for n, x in enumerate(s['story']):
        out.append(f'      <h3>{e(lay["heads"][n])}</h3>\n      <p class="t">{e(x["text"])}</p>')
        fs = [f for f in lay.get('figs', []) if f['after'] == n]
        if fs: out.append(f'      <div class="bk-figs{" two" if len(fs) == 2 else ""}">' + ''.join(fig_html(f) for f in fs) + '</div>')
    out.append('      <p class="pg-note">日本書紀の本文に書かれていることを、やさしい言葉でまとめたものです（訳書の文章は使っていません）。小見出しは、読みやすくするために本文の言葉から付けました。</p>\n    </section>\n')
    out.append(points_html(s, 'shoki').replace('覚えておくポイント', 'このページの要点'))
    if s.get('variants'):
        out.append(f'\n    <section class="pg-card bk-app" aria-labelledby="var-title">\n      <h2 id="var-title">一書（別の伝え）</h2>\n      <p class="pg-note">日本書紀は、本文のあとに「一書に曰く」として、別の伝えを並べています。名前を押すと開きます（全{len(s["variants"])}件）。</p>')
        out += [f'      <details><summary>{e(v["name"])}</summary><p>{e(v["text"])}</p></details>' for v in s['variants']]
        out.append('    </section>')
    out.append(''); out.append(who_html(s))
    out.append(cmp_html(s.get('kojiki'), '古事記との違い'))
    if not s.get('kojiki') and vol_of(s) >= 23:
        out.append('\n    <section class="pg-card"><h2>古事記では</h2><p>古事記は推古天皇の時代で終わります。この巻の時代は、日本書紀にしか書かれていません。</p></section>')
    kv = sorted({{'K': '上巻', 'C': '中巻', 'G': '下巻'}[k['ref'][0]] for k in s.get('kojiki', []) if k.get('ref')})
    base = shoki_vols(s['span']) + [WS(KOJ_WS[v], f'古事記 {v} 校訂本文') for v in kv]
    qs = ''.join(f'\n          <div class="q"><blockquote lang="zh-Hant">{e(q["text"])}</blockquote><p>{e(q["note"])}</p></div>' for q in s['quotes'])
    out.append(f'''
    {pager_html(SHO, i, slabel, 'ページ')}

    <section class="pg-card bk-app" aria-labelledby="src-title">
      <h2 id="src-title">資料編</h2>
      <details>
        <summary>原文で読む（{len(s['quotes'])}か所）</summary>{qs}
      </details>
      <details>
        <summary>出典と、印の意味</summary>
        <p class="pg-note">「本文」は日本書紀の本文、「一書」は本文のあとに並ぶ別の伝え、「古事記と比較」は古事記の原文で確かめた違い、「解説」は公的な機関の解説で確かめたことです。原文の引用は、中文維基文庫の本文から一字一句そのまま写しています（〔 〕は原文の小注）。年は原文の紀年のままで、西暦への換算はしていません。</p>
        <ul class="pg-src">
          {src_list(s.get('sources', []), base)}
        </ul>
      </details>
      <a class="pg-back" href="./">← ページの一覧へ</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def shoki_page(i):
    s = SHO[i]
    if s['id'] in SLAYOUT: return shoki_book_page(i, SLAYOUT[s['id']])
    title = f"{s['title']}｜日本書紀 {s['kan']}｜日本書紀アーカイブ"
    out = [head('shoki', title, s['lead'], SITE + 'shoki/' + s['id'] + '.html')]
    xl = ''.join(f'<a href="../kojiki/{k}.html">古事記で読む：{e(KBY[k]["title"])} ›</a>' for k in s.get('kojiki_pages', []) if k in KBY)
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">日本書紀 {e(s['kan'])}（全{len(SHO)}ページ中 {i + 1}）</p>
    <h1>{e(s['title'])}</h1>
    <p class="pg-lead">{e(s['lead'])}</p>
    {f'<div class="xlink">{xl}</div>' if xl else ''}
''')
    out.append(points_html(s, 'shoki'))
    out.append('\n    <section class="pg-card" aria-labelledby="story-title">\n      <h2 id="story-title">本文の話</h2>')
    out += [f'      <p>{e(x["text"])}</p>' for x in s['story']]
    out.append('      <p class="pg-note">日本書紀の本文に書かれていることを、やさしい言葉でまとめたものです（訳書の文章は使っていません）。</p>\n    </section>')
    if s.get('variants'):
        out.append('\n    <section class="pg-card" aria-labelledby="var-title">\n      <h2 id="var-title">一書（別の伝え）</h2>\n      <p class="pg-note">日本書紀は、本文のあとに「一書に曰く」として、別の伝えを並べています。</p>')
        out += [f'      <div class="var"><b>{e(v["name"])}</b><p>{e(v["text"])}</p></div>' for v in s['variants']]
        out.append('    </section>')
    out.append(''); out.append(quotes_html(s)); out.append(''); out.append(who_html(s))
    out.append(cmp_html(s.get('kojiki'), '古事記では'))
    if not s.get('kojiki') and vol_of(s) >= 23:
        out.append('\n    <section class="pg-card"><h2>古事記では</h2><p>古事記は推古天皇の時代で終わります。この巻の時代は、日本書紀にしか書かれていません。</p></section>')
    kv = sorted({{'K': '上巻', 'C': '中巻', 'G': '下巻'}[k['ref'][0]] for k in s.get('kojiki', []) if k.get('ref')})
    base = shoki_vols(s['span']) + [WS(KOJ_WS[v], f'古事記 {v} 校訂本文') for v in kv]
    out.append(f'''
    {pager_html(SHO, i, slabel, 'ページ')}

    <section class="pg-card" aria-labelledby="src-title">
      <h2 id="src-title">出典</h2>
      <p class="pg-note">「本文」は日本書紀の本文、「一書」は本文のあとに並ぶ別の伝え、「古事記と比較」は古事記の原文で確かめた違い、「解説」は公的な機関の解説で確かめたことです。原文の引用は、中文維基文庫の本文から一字一句そのまま写しています（〔 〕は原文の小注）。</p>
      <ul class="pg-src">
        {src_list(s.get('sources', []), base)}
      </ul>
      <a class="pg-back" href="./">← ページの一覧へ</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def shoki_index():
    title = "日本書紀アーカイブ｜神代から持統天皇まで全三十巻｜教育幕僚室｜N's factory"
    desc = f'日本書紀の全三十巻（神代と、神武天皇から持統天皇まで）を{len(SHO)}ページに分け、場面ごとの本文の話・要点・一書（別の伝え）・古事記との違い・原文をまとめた読みもの。'
    out = [head('shoki', title, desc, SITE + 'shoki/')]
    kans = []
    for s in SHO:
        if s['kan'] not in kans: kans.append(s['kan'])
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">Nihon Shoki Archive</p>
    <h1>日本書紀アーカイブ</h1>
    <p class="pg-lead">日本書紀の全三十巻を、{len(SHO)}ページに分けてまとめました。神代（巻第一・第二）は「段」ごとに、本文と一書（別の伝え）を並べています。巻第三からは、神武天皇から持統天皇までを天皇ごとに読めます。推古天皇までは古事記アーカイブと同じ場面どうしでつながり、舒明天皇から後は日本書紀だけが記す時代です。</p>
    <div class="jump"><a href="#era-1">神代</a><a href="#era-2">神武〜応神</a><a href="#era-3">仁徳〜推古</a><a href="#era-4">舒明〜持統</a><a href="#review">要点の復習</a><a href="../kojiki/">古事記アーカイブ ›</a></div>

    <section class="pg-card" aria-labelledby="how-title">
      <h2 id="how-title">このアーカイブの決まり</h2>
      <p>書いてあることは、日本書紀の原文で確かめたことだけです。年は原文の紀年のまま書き、西暦への換算はしていません。後の時代の解釈を書くときは「解説」の印を付け、公的な機関の解説で確かめた出典を添えています。</p>
      <div class="legend">{badge("本文", "shoki")}日本書紀の本文 {badge("一書", "shoki")}本文のあとの別の伝え {badge("比較", "shoki")}古事記との違い {badge("解説", "shoki")}出典つきの解釈</div>
    </section>

    <section class="pg-card" aria-labelledby="toc-title">
      <h2 id="toc-title">ページの一覧（全三十巻・全{len(SHO)}ページ）</h2>''')
    ERA = [(1, 2, '神代（巻第一・第二）'), (3, 10, '神武天皇〜応神天皇（巻第三〜第十）'), (11, 22, '仁徳天皇〜推古天皇（巻第十一〜第二十二）'), (23, 30, '舒明天皇〜持統天皇（巻第二十三〜第三十）')]
    shown = set()
    for k in kans:
        ss = [(j, s) for j, s in enumerate(SHO) if s['kan'] == k]
        v = vol_of(ss[0][1])
        for n, (a, b, name) in enumerate(ERA, 1):
            if a <= v <= b and n not in shown:
                shown.add(n); out.append(f'      <h2 id="era-{n}" style="margin-top:26px;">{e(name)}</h2>')
        out.append(f'      <h3>{e(k)}</h3>\n      <ol class="toc">')
        out += [f'        <li><a href="{s["id"]}.html"><span class="no">{j + 1}</span><b>{e(s["title"])}</b><span class="lead">{e(s["points"][0]["text"])}</span></a></li>' for j, s in ss]
        out.append('      </ol>')
    out.append('    </section>\n\n    <section class="pg-card" id="review" aria-labelledby="all-title">\n      <h2 id="all-title">全ページの要点（復習用）</h2>\n      <p class="pg-note">復習用に、各ページの要点を上から2つずつ並べました。</p>')
    for s in SHO:
        out.append(f'      <h3><a href="{s["id"]}.html">{e(s["kan"])}　{e(s["title"])}</a></h3><ul style="margin:0;padding-left:1.2em;line-height:1.85;">'
                   + ''.join(f'<li>{e(p["text"])}</li>' for p in s['points'][:2]) + '</ul>')
    out.append('''    </section>

    <section class="pg-card" aria-labelledby="rel-title">
      <h2 id="rel-title">あわせて読む</h2>
      <p><a href="../kojiki/">古事記アーカイブ</a>　同じ時代を、古事記の話ごとに読む。</p>
      <p><a href="../kiki.html">古事記と日本書紀の関係</a>　二つの書は、いつ・誰が・どう作ったのか。</p>
      <p><a href="../../shrine-note/map/">神社巡りノート</a>　神様を祀る全国の神社を、日本列島の地図でたどれます。</p>
      <a class="pg-back" href="../index.html">← 教育幕僚室へ戻る</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

if __name__ == '__main__':
  for i, m in enumerate(KOJ):
    open(os.path.join(HIT, 'kojiki', m['id'] + '.html'), 'w', encoding='utf-8').write(kojiki_page(i))
  open(os.path.join(HIT, 'kojiki', 'index.html'), 'w', encoding='utf-8').write(kojiki_index())
  for i, s in enumerate(SHO):
    open(os.path.join(HIT, 'shoki', s['id'] + '.html'), 'w', encoding='utf-8').write(shoki_page(i))
  open(os.path.join(HIT, 'shoki', 'index.html'), 'w', encoding='utf-8').write(shoki_index())
  print(f'古事記 {len(KOJ)}ページ・日本書紀 {len(SHO)}ページ＋一覧2')
