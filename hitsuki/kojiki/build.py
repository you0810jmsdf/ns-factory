"""古事記アーカイブ（上巻の神話）のページを作る。
使い方: python3 hitsuki/kojiki/build.py
入力: hitsuki/kojiki/data/myths.json（話ごとの研究データ）、shrine-note/deities.json・shrines.json（神様の読み・祀る神社）
出力: hitsuki/kojiki/index.html と hitsuki/kojiki/<id>.html
データの決まり: 原文の引用は中文維基文庫の校訂本文から一字一句そのまま（検査は data/README.md の手順）。"""
import json, html, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
BASE = 'https://you0810jmsdf.github.io/ns-factory/hitsuki/kojiki/'
data = json.load(open(os.path.join(HERE, 'data', 'myths.json'), encoding='utf-8'))
myths = data['myths']
deities = {d['id']: d for d in json.load(open(os.path.join(ROOT, 'shrine-note', 'deities.json'), encoding='utf-8'))['deities']}
shrines = json.load(open(os.path.join(ROOT, 'shrine-note', 'shrines.json'), encoding='utf-8'))['shrines']
e = lambda s: html.escape(str(s or ''), quote=True)
MAP = '../../shrine-note/map/'

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
    .pg-card p { line-height: 1.95; margin: 0 0 12px; }
    .pg-card p:last-child { margin-bottom: 0; }
    .pts { border-color: var(--line-strong); background: rgba(216, 183, 102, 0.07); }
    .pts ol { margin: 0; padding-left: 1.4em; }
    .pts li { line-height: 1.85; margin: 0 0 10px; }
    .pts li:last-child { margin-bottom: 0; }
    .kind { display: inline-block; font-size: .72rem; line-height: 1; padding: 4px 7px; border-radius: 999px; border: 1px solid var(--line-strong); color: var(--gold); margin-right: 6px; vertical-align: 2px; white-space: nowrap; }
    .kind.k-cmp { color: #9fc3d8; border-color: rgba(159,195,216,.45); }
    .kind.k-int { color: #d9a7c7; border-color: rgba(217,167,199,.45); }
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
    .pg-note { color: var(--muted); font-size: .85rem; line-height: 1.8; margin: 0; }
    .pg-src { margin: 8px 0 0; padding-left: 1.2em; line-height: 1.9; font-size: .9rem; word-break: break-all; }
    .pager { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0 20px; }
    .pager a { flex: 1; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; color: var(--ink); text-decoration: none; line-height: 1.6; }
    .pager a small { display: block; color: var(--muted); font-size: .78rem; }
    .pager a.next { text-align: right; }
    .pager a:hover { border-color: var(--line-strong); }
    .toc { list-style: none; margin: 0; padding: 0; counter-reset: none; }
    .toc li { border-bottom: 1px solid rgba(245, 239, 225, 0.08); }
    .toc li:last-child { border-bottom: 0; }
    .toc a { display: grid; grid-template-columns: 2.6em 1fr; gap: 2px 10px; padding: 14px 4px; color: var(--ink); text-decoration: none; }
    .toc a:hover { background: rgba(216,183,102,.06); }
    .toc .no { color: var(--gold); font-variant-numeric: tabular-nums; grid-row: span 2; font-size: 1.1rem; }
    .toc b { font-size: 1.05rem; }
    .toc span.lead { color: var(--ink-soft); font-size: .9rem; line-height: 1.7; }
    .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .85rem; color: var(--ink-soft); margin: 0 0 12px; }
    @media (max-width: 640px) { .pager { flex-direction: column; } .pager a.next { text-align: left; } }
'''

def head(title, desc, canon):
    return f'''<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#10130f">
  <title>{e(title)}</title>
{GA}
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{canon}">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:type" content="article">
  <link rel="stylesheet" href="../styles.css">
  <style>{CSS}  </style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="./" aria-label="古事記アーカイブ トップへ">
      <span class="brand-mark" aria-hidden="true">古記</span>
      <span>古事記アーカイブ</span>
    </a>
    <nav class="site-nav" aria-label="ページ内ナビゲーション">
      <a href="./">話の一覧</a>
      <a href="../kiki.html">古事記と日本書紀</a>
      <a href="../index.html" class="nav-back">← 教育幕僚室へ戻る</a>
    </nav>
  </header>
'''

FOOT = '''
<script src="../../assets/access-counter.js"></script>
</body>
</html>
'''
KIND = {'本文': ('', '本文'), '比較': ('k-cmp', '日本書紀と比較'), '解説': ('k-int', '解説')}

def kind_badge(k):
    c, label = KIND.get(k, ('', k))
    return f'<span class="kind {c}">{e(label)}</span>'

def dname(i):
    d = deities.get(i)
    return (d['name'], d.get('reading', '')) if d else (i, '')

def shrines_of(i):
    return [s for s in shrines if i in (s.get('deity_ids') or [])]

def myth_page(m, prev, nxt):
    title = f"{m['title']}｜古事記 上巻 第{m['no']}話｜古事記アーカイブ"
    desc = m['lead']
    out = [head(title, desc, BASE + m['id'] + '.html')]
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">古事記 上巻・第{m['no']}話（全{len(myths)}話）</p>
    <h1>{e(m['title'])}</h1>
    <p class="pg-lead">{e(m['lead'])}</p>

    <section class="pg-card pts" aria-labelledby="pts-title">
      <h2 id="pts-title">覚えておくポイント</h2>
      <ol>''')
    for p in m['points']:
        src = ''.join(f' <a href="{e(u)}" target="_blank" rel="noopener">［出典］</a>' for u in p.get('src', []))
        out.append(f'        <li>{kind_badge(p["kind"])}{e(p["text"])}{src}</li>')
    out.append('''      </ol>
    </section>

    <section class="pg-card" aria-labelledby="story-title">
      <h2 id="story-title">どんな話か</h2>''')
    for s in m['story']:
        out.append(f'      <p>{e(s["text"])}</p>')
    out.append('''      <p class="pg-note">古事記の原文に書かれていることを、やさしい言葉でまとめたものです（訳書の文章は使っていません）。</p>
    </section>

    <section class="pg-card" aria-labelledby="q-title">
      <h2 id="q-title">原文で読む</h2>''')
    for q in m['quotes']:
        out.append(f'      <div class="q"><blockquote lang="zh-Hant">{e(q["text"])}</blockquote><p>{e(q["note"])}</p></div>')
    out.append('''    </section>

    <section class="pg-card" aria-labelledby="who-title">
      <h2 id="who-title">登場する神と、祀る神社</h2>
      <ul class="who">''')
    for i in m['deities']:
        n, r = dname(i)
        sh = shrines_of(i)
        shl = '、'.join(f'<a href="{MAP}?s={e(s["id"])}">{e(s["name"])}</a>' for s in sh)
        out.append(f'        <li><b><a href="{MAP}?d={e(i)}">{e(n)}</a></b>{f"<small>{e(r)}</small>" if r else ""}'
                   + (f'<span class="sh">祀る神社：{shl}</span>' if sh else '<span class="sh">神社巡りノートには、まだ祀る神社がありません</span>') + '</li>')
    for f in m.get('figures', []):
        out.append(f'        <li><b>{e(f["name"])}</b>{f"<small>{e(f.get("reading"))}</small>" if f.get("reading") else ""}<span class="sh">{e(f.get("role"))}</span></li>')
    out.append('''      </ul>
      <p class="pg-note">神の名前を押すと、神社巡りノートの神様のページ（古事記・日本書紀での名前と場面）が開きます。</p>
    </section>''')
    if m.get('nihonshoki'):
        out.append('''
    <section class="pg-card" aria-labelledby="ns-title">
      <h2 id="ns-title">日本書紀では</h2>''')
        for n in m['nihonshoki']:
            qt = f'<blockquote lang="zh-Hant">{e(n["quote"])}</blockquote>' if n.get('quote') else ''
            out.append(f'      <div class="ns"><span class="where">{e(n.get("where"))}</span><p>{e(n["text"])}</p>{qt}</div>')
        out.append('    </section>')
    srcs = ['<li><a href="https://zh.wikisource.org/wiki/古事記/上卷" target="_blank" rel="noopener">古事記 上巻 校訂本文</a>　中文維基文庫</li>']
    if m.get('nihonshoki'):
        srcs.append('<li><a href="https://zh.wikisource.org/wiki/日本書紀/卷第一" target="_blank" rel="noopener">日本書紀 巻第一 神代上</a>／<a href="https://zh.wikisource.org/wiki/日本書紀/卷第二" target="_blank" rel="noopener">巻第二 神代下</a>　中文維基文庫</li>')
    for u in m.get('sources', []):
        label = '國學院大學「神名データベース」' if 'kokugakuin' in u else u
        srcs.append(f'<li><a href="{e(u)}" target="_blank" rel="noopener">{e(label)}</a>　{e(u)}</li>')
    pager = '<nav class="pager" aria-label="前後の話">'
    pager += f'<a class="prev" href="{prev["id"]}.html"><small>← 前の話（第{prev["no"]}話）</small>{e(prev["title"])}</a>' if prev else '<span></span>'
    pager += f'<a class="next" href="{nxt["id"]}.html"><small>次の話（第{nxt["no"]}話）→</small>{e(nxt["title"])}</a>' if nxt else '<span></span>'
    pager += '</nav>'
    out.append(f'''
    {pager}

    <section class="pg-card" aria-labelledby="src-title">
      <h2 id="src-title">出典</h2>
      <p class="pg-note">「本文」は古事記に書かれていること、「日本書紀と比較」は日本書紀の原文で確かめた違い、「解説」は公的な機関の解説で確かめたことです。原文の引用は、中文維基文庫の校訂本文から一字一句そのまま写しています（〔 〕は原文の小注）。</p>
      <ul class="pg-src">
        {''.join(srcs)}
      </ul>
      <a class="pg-back" href="./">← 話の一覧へ</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def index_page():
    title = '古事記アーカイブ｜上巻の神話を一話ずつ｜教育幕僚室｜N\'s factory'
    desc = f'古事記 上巻の神話を{len(myths)}話に分け、話ごとに「覚えておくポイント」「どんな話か」「原文」「登場する神と祀る神社」「日本書紀との違い」をまとめた研究ノート。'
    out = [head(title, desc, BASE)]
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">Kojiki Archive</p>
    <h1>古事記アーカイブ　上巻の神話</h1>
    <p class="pg-lead">古事記の上巻（神々の時代）を{len(myths)}の話に分けて、一話ずつまとめました。どの話にも、まず「覚えておくポイント」があります。そのあとで、話の流れ・原文・登場する神・日本書紀との違いを読めます。</p>

    <section class="pg-card" aria-labelledby="how-title">
      <h2 id="how-title">このアーカイブの決まり</h2>
      <p>書いてあることは、古事記の原文で確かめたことだけです。後の時代の解釈を書くときは「解説」の印を付け、公的な機関の解説で確かめた出典を添えています。</p>
      <div class="legend">{kind_badge("本文")}古事記に書いてあること {kind_badge("比較")}日本書紀との違い {kind_badge("解説")}出典つきの解釈</div>
      <p class="pg-note">中巻・下巻（神武天皇から推古天皇まで）は、これから増やします。</p>
    </section>

    <section class="pg-card" aria-labelledby="toc-title">
      <h2 id="toc-title">話の一覧（上巻・全{len(myths)}話）</h2>
      <ol class="toc">''')
    for m in myths:
        out.append(f'        <li><a href="{m["id"]}.html"><span class="no">{m["no"]}</span><b>{e(m["title"])}</b><span class="lead">{e(m["points"][0]["text"])}</span></a></li>')
    out.append('''      </ol>
    </section>

    <section class="pg-card" aria-labelledby="all-title">
      <h2 id="all-title">全話の「覚えておくポイント」</h2>
      <p class="pg-note">復習用に、各話のポイントを上から2つずつ並べました。</p>''')
    for m in myths:
        out.append(f'      <h3 style="font-size:1rem;margin:18px 0 6px;"><a href="{m["id"]}.html">第{m["no"]}話　{e(m["title"])}</a></h3><ul style="margin:0;padding-left:1.2em;line-height:1.85;">'
                   + ''.join(f'<li>{e(p["text"])}</li>' for p in m['points'][:2]) + '</ul>')
    out.append('''    </section>

    <section class="pg-card" aria-labelledby="rel-title">
      <h2 id="rel-title">あわせて読む</h2>
      <p><a href="../kiki.html">古事記と日本書紀の関係</a>　二つの書は、いつ・誰が・どう作ったのか。</p>
      <p><a href="../../shrine-note/map/">神社巡りノート</a>　神様を祀る全国の神社を、日本列島の地図でたどれます。</p>
      <a class="pg-back" href="../index.html">← 教育幕僚室へ戻る</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

for i, m in enumerate(myths):
    open(os.path.join(HERE, m['id'] + '.html'), 'w', encoding='utf-8').write(myth_page(m, myths[i - 1] if i else None, myths[i + 1] if i + 1 < len(myths) else None))
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(index_page())
print(f'built {len(myths)} pages + index')
