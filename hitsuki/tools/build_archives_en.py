"""English edition of the Kojiki & Nihon Shoki archives.
Usage: python3 hitsuki/tools/build_archives_en.py   (run build_archives.py first or after; both are independent)
Input:  hitsuki/kojiki/data/myths.json + myths.en.json, hitsuki/shoki/data/episodes.json + episodes.en.json
        (*.en.json = English overlay keyed by page id: title, lead, points[].text, story[].text, quotes[].note,
         figures[].name/role, compare[].where/text, variants[].name/text, kan_en),
        shrine-note/i18n/en.json for deity and shrine names.
Output: hitsuki/kojiki/en/<id>.html, hitsuki/shoki/en/<id>.html and an index.html in each.
Original-text quotations are shown as they are (classical Chinese); only explanations are translated."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_archives as B

e = B.e
HIT, ROOT, SITE = B.HIT, B.ROOT, B.SITE
KOJ, SHO = B.KOJ, B.SHO
KEN = json.load(open(os.path.join(HIT, 'kojiki', 'data', 'myths.en.json'), encoding='utf-8'))['pages']
SEN = json.load(open(os.path.join(HIT, 'shoki', 'data', 'episodes.en.json'), encoding='utf-8'))['pages']
SN = json.load(open(os.path.join(ROOT, 'shrine-note', 'i18n', 'en.json'), encoding='utf-8'))
MAP = '../../../shrine-note/map/'
KAN_EN = {'上巻': 'Part 1', '中巻': 'Part 2', '下巻': 'Part 3'}
KAN_SUB = {'上巻': 'the Age of the Gods', '中巻': 'from Emperor Jinmu to Emperor Ōjin', '下巻': 'from Emperor Nintoku to Empress Suiko'}
KIND = {'本文': ('', 'Main text'), '一書': ('k-var', 'Variant account'), '比較': ('k-cmp', 'Comparison'), '解説': ('k-int', 'Commentary')}
BOOK = {
    'kojiki': {'name': 'Kojiki Archive', 'mark': '古記', 'nav': [('./', 'All stories'), ('../../shoki/en/', 'Nihon Shoki Archive')]},
    'shoki': {'name': 'Nihon Shoki Archive', 'mark': '書紀', 'nav': [('./', 'All pages'), ('../../kojiki/en/', 'Kojiki Archive')]},
}
EXTRA_CSS = '''
    sup.ru { color: var(--muted); font-size: .7em; margin-left: 1px; cursor: help; }
    .orig { color: var(--muted); font-size: .85rem; }
    .langnote { color: var(--muted); font-size: .85rem; margin: 0 0 18px; }
'''

def head(book, title, desc, canon, ja_url, ja_rel):
    b = BOOK[book]
    nav = ''.join(f'\n      <a href="{h}">{e(t)}</a>' for h, t in b['nav'])
    nav += f'\n      <a href="{ja_rel}" lang="ja" hreflang="ja">日本語</a>'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#10130f">
  <title>{e(title)}</title>
{B.GA}
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{canon}">
  <link rel="alternate" hreflang="en" href="{canon}">
  <link rel="alternate" hreflang="ja" href="{ja_url}">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="en_US">
  <link rel="stylesheet" href="../../styles.css">
  <style>{B.CSS}{EXTRA_CSS}  </style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="./" aria-label="{e(b['name'])} home">
      <span class="brand-mark" aria-hidden="true">{e(b['mark'])}</span>
      <span>{e(b['name'])}</span>
    </a>
    <nav class="site-nav" aria-label="Site navigation">{nav}
    </nav>
  </header>
'''

FOOT = '''
<script src="../../../assets/access-counter.js"></script>
</body>
</html>
'''

def badge(k, book):
    c, label = KIND.get(k, ('', k))
    if k == '比較': label = 'Compared with the Nihon Shoki' if book == 'kojiki' else 'Compared with the Kojiki'
    return f'<span class="kind {c}">{e(label)}</span>'

def zipped(ja, en):
    en = en or []
    return [(a, en[i] if i < len(en) else {}) for i, a in enumerate(ja or [])]

def points_html(m, o, book):
    out = ['    <section class="pg-card pts" aria-labelledby="pts-title">', '      <h2 id="pts-title">Key points to remember</h2>', '      <ol>']
    for p, q in zipped(m['points'], o.get('points')):
        src = ''.join(f' <a href="{e(u)}" target="_blank" rel="noopener">[source, Japanese]</a>' for u in p.get('src', []))
        out.append(f'        <li>{badge(p["kind"], book)}{e(q.get("text", ""))}{src}</li>')
    return '\n'.join(out + ['      </ol>', '    </section>'])

def who_html(m, o):
    out = ['    <section class="pg-card" aria-labelledby="who-title">', '      <h2 id="who-title">Deities and people, and the shrines that enshrine them</h2>', '      <ul class="who">']
    for i in m['deities']:
        d = B.deities.get(i)
        if not d: continue
        name = (SN['deities'].get(i) or {}).get('name') or d['name']
        sh = [s for s in B.shrines if i in (s.get('deity_ids') or [])]
        shl = ', '.join(f'<a href="{MAP}?lang=en&amp;s={e(s["id"])}">{e((SN["shrines"].get(s["id"]) or {}).get("name") or s["name"])}</a>' for s in sh)
        out.append(f'        <li><b><a href="{MAP}?lang=en&amp;d={e(i)}">{e(name)}</a></b><small lang="ja">{e(d["name"])}</small>'
                   + (f'<span class="sh">Enshrined at: {shl}</span>' if sh else '<span class="sh">No shrine in Shrine Note enshrines this deity yet.</span>') + '</li>')
    for f, g in zipped(m.get('figures'), o.get('figures')):
        out.append(f'        <li><b>{e(g.get("name") or f["name"])}</b><span class="sh">{e(g.get("role", ""))}</span></li>')
    return '\n'.join(out + ['      </ul>', '      <p class="pg-note">Select a deity\'s name to open its page in Shrine Note (names and scenes in the Kojiki and the Nihon Shoki).</p>', '    </section>'])

def quotes_html(m, o):
    out = ['    <section class="pg-card" aria-labelledby="q-title">', '      <h2 id="q-title">In the original text</h2>']
    for q, n in zipped(m['quotes'], o.get('quotes')):
        out.append(f'      <div class="q"><blockquote lang="zh-Hant">{e(q["text"])}</blockquote><p>{e(n.get("note", ""))}</p></div>')
    return '\n'.join(out + ['    </section>'])

def cmp_html(items, en, title):
    if not items: return ''
    out = ['', '    <section class="pg-card" aria-labelledby="ns-title">', f'      <h2 id="ns-title">{e(title)}</h2>']
    for n, g in zipped(items, en):
        qt = f'<blockquote lang="zh-Hant">{e(n["quote"])}</blockquote>' if n.get('quote') else ''
        out.append(f'      <div class="ns"><span class="where">{e(g.get("where") or n.get("where"))}</span><p>{e(g.get("text", ""))}</p>{qt}</div>')
    return '\n'.join(out + ['    </section>'])

def pager(seq, en, i, unit, label):
    prev = seq[i - 1] if i else None
    nxt = seq[i + 1] if i + 1 < len(seq) else None
    t = lambda x: (en.get(x['id']) or {}).get('title') or x['title']
    p = '<nav class="pager" aria-label="Previous and next">'
    p += f'<a class="prev" href="{prev["id"]}.html"><small>← Previous {unit} ({e(label(prev))})</small>{e(t(prev))}</a>' if prev else '<span></span>'
    p += f'<a class="next" href="{nxt["id"]}.html"><small>Next {unit} ({e(label(nxt))}) →</small>{e(t(nxt))}</a>' if nxt else '<span></span>'
    return p + '</nav>'

WS = lambda t, label: f'<li><a href="https://zh.wikisource.org/wiki/{t}" target="_blank" rel="noopener">{e(label)}</a> — Chinese Wikisource</li>'

def src_list(urls, base):
    li = list(base)
    for u in urls:
        label = 'Kokugakuin University, Database of Deity Names (Japanese)' if 'kokugakuin' in u else u
        li.append(f'<li><a href="{e(u)}" target="_blank" rel="noopener">{e(label)}</a></li>')
    return ''.join(li)

def shoki_vols(refs):
    vs = sorted({int(r[1:].split('-')[0]) for r in refs if r.startswith('N') and '-' in r})
    return [WS(f'日本書紀/{B.SHOKI_VOL[v]}', f'Nihon Shoki, Book {v}') for v in vs]

def kl(m): return f'{KAN_EN[m["kan"]]}, story {m["no"]}'

def kojiki_page(i):
    m = KOJ[i]; o = KEN.get(m['id'], {})
    cnt = sum(1 for x in KOJ if x['kan'] == m['kan'])
    title = f"{o.get('title') or m['title']} | Kojiki {KAN_EN[m['kan']]}, story {m['no']} | Kojiki Archive"
    out = [head('kojiki', title, o.get('lead', ''), SITE + 'kojiki/en/' + m['id'] + '.html', SITE + 'kojiki/' + m['id'] + '.html', '../' + m['id'] + '.html')]
    xl = ''.join(f'<a href="../../shoki/en/{s["id"]}.html">Read in the Nihon Shoki: {e((SEN.get(s["id"]) or {}).get("title") or s["title"])} ›</a>' for s in B.K2S.get(m['id'], []))
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">Kojiki, {KAN_EN[m['kan']]} · story {m['no']} of {cnt}</p>
    <h1>{e(o.get('title') or m['title'])}</h1>
    <p class="orig" lang="ja">{e(m['title'])}</p>
    <p class="pg-lead">{e(o.get('lead', ''))}</p>
    {f'<div class="xlink">{xl}</div>' if xl else ''}
''')
    out.append(points_html(m, o, 'kojiki'))
    out.append('\n    <section class="pg-card" aria-labelledby="story-title">\n      <h2 id="story-title">The story</h2>')
    out += [f'      <p>{e(g.get("text", ""))}</p>' for _, g in zipped(m['story'], o.get('story'))]
    out.append('      <p class="pg-note">A plain retelling of what the original text of the Kojiki says (no published translation has been used).</p>\n    </section>\n')
    out.append(quotes_html(m, o)); out.append(''); out.append(who_html(m, o))
    out.append(cmp_html(m.get('nihonshoki'), o.get('compare'), 'In the Nihon Shoki'))
    base = [WS(B.KOJ_WS[m['kan']], f'Kojiki, {KAN_EN[m["kan"]]} (critical text)')] + shoki_vols([n.get('ref', '') for n in m.get('nihonshoki', [])])
    out.append(f'''
    {pager(KOJ, KEN, i, 'story', kl)}

    <section class="pg-card" aria-labelledby="src-title">
      <h2 id="src-title">Sources</h2>
      <p class="pg-note">"Main text" is what the Kojiki itself says; "Compared with the Nihon Shoki" is a difference checked in the original text of the Nihon Shoki; "Commentary" is an interpretation checked against a public institution's explanation. Quotations are copied character for character from the critical text on Chinese Wikisource (〔 〕 marks the original small notes). Names whose reading could not be confirmed are left in kanji.</p>
      <ul class="pg-src">
        {src_list(m.get('sources', []), base)}
      </ul>
      <a class="pg-back" href="./">← All stories</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def kojiki_index():
    kans = [k for k in ['上巻', '中巻', '下巻'] if any(m['kan'] == k for m in KOJ)]
    n = len(KOJ)
    title = 'Kojiki Archive — all three parts, story by story | N\'s factory'
    desc = f'The Kojiki (Records of Ancient Matters, 712) in {n} stories: for each, the key points to remember, the story, the original text, the deities and their shrines, and how the Nihon Shoki differs.'
    out = [head('kojiki', title, desc, SITE + 'kojiki/en/', SITE + 'kojiki/', '../')]
    jump = ''.join(f'<a href="#kan-{KAN_EN[k].replace(" ", "")}">{KAN_EN[k]}</a>' for k in kans) + '<a href="#review">Review the key points</a><a href="../../shoki/en/">Nihon Shoki Archive ›</a>'
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">Kojiki Archive</p>
    <h1>Kojiki Archive</h1>
    <p class="pg-lead">The Kojiki, completed in 712, tells of Japan from the age of the gods to Empress Suiko in three parts. Here it is divided into {n} stories. Each page begins with the key points to remember, followed by the story, short passages of the original text, the deities who appear, and how the Nihon Shoki tells the same events.</p>
    <div class="jump">{jump}</div>

    <section class="pg-card" aria-labelledby="how-title">
      <h2 id="how-title">How this archive is written</h2>
      <p>Everything here has been checked against the original text of the Kojiki. Where a later interpretation is given, it is marked "Commentary" and its source is a public institution's explanation. Each page also links to the same events in the Nihon Shoki Archive.</p>
      <div class="legend">{badge("本文", "kojiki")}What the Kojiki says {badge("比較", "kojiki")}How the Nihon Shoki differs {badge("解説", "kojiki")}Sourced interpretation</div>
    </section>
''')
    for k in kans:
        ms = [m for m in KOJ if m['kan'] == k]
        out.append(f'    <section class="pg-card" id="kan-{KAN_EN[k].replace(" ", "")}" aria-labelledby="toc-{k}">\n      <h2 id="toc-{k}">{KAN_EN[k]}: {KAN_SUB[k]} ({len(ms)} stories)</h2>\n      <ol class="toc">')
        for m in ms:
            o = KEN.get(m['id'], {})
            first = (o.get('points') or [{}])[0].get('text', '')
            out.append(f'        <li><a href="{m["id"]}.html"><span class="no">{m["no"]}</span><b>{e(o.get("title") or m["title"])}</b><span class="lead">{e(first)}</span></a></li>')
        out.append('      </ol>\n    </section>\n')
    out.append('    <section class="pg-card" id="review" aria-labelledby="all-title">\n      <h2 id="all-title">Key points of every story</h2>\n      <p class="pg-note">For review: the first two key points of each story.</p>')
    for m in KOJ:
        o = KEN.get(m['id'], {})
        out.append(f'      <h3><a href="{m["id"]}.html">{KAN_EN[m["kan"]]}, story {m["no"]}: {e(o.get("title") or m["title"])}</a></h3><ul style="margin:0;padding-left:1.2em;line-height:1.85;">'
                   + ''.join(f'<li>{e(p.get("text", ""))}</li>' for p in (o.get('points') or [])[:2]) + '</ul>')
    out.append('''    </section>

    <section class="pg-card" aria-labelledby="rel-title">
      <h2 id="rel-title">See also</h2>
      <p><a href="../../shoki/en/">Nihon Shoki Archive</a> — the same period told in the Nihon Shoki, with its main text and variant accounts.</p>
      <p><a href="../../../shrine-note/map/?lang=en">Shrine Note</a> — follow the shrines of these deities across a 3D map of the Japanese archipelago.</p>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def sl(s): return (SEN.get(s['id']) or {}).get('kan_en') or s['kan']

def shoki_page(i):
    s = SHO[i]; o = SEN.get(s['id'], {})
    title = f"{o.get('title') or s['title']} | {sl(s)} | Nihon Shoki Archive"
    out = [head('shoki', title, o.get('lead', ''), SITE + 'shoki/en/' + s['id'] + '.html', SITE + 'shoki/' + s['id'] + '.html', '../' + s['id'] + '.html')]
    xl = ''.join(f'<a href="../../kojiki/en/{k}.html">Read in the Kojiki: {e((KEN.get(k) or {}).get("title") or B.KBY[k]["title"])} ›</a>' for k in s.get('kojiki_pages', []) if k in B.KBY)
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">{e(sl(s))} · page {i + 1} of {len(SHO)}</p>
    <h1>{e(o.get('title') or s['title'])}</h1>
    <p class="orig" lang="ja">{e(s['title'])}</p>
    <p class="pg-lead">{e(o.get('lead', ''))}</p>
    {f'<div class="xlink">{xl}</div>' if xl else ''}
''')
    out.append(points_html(s, o, 'shoki'))
    out.append('\n    <section class="pg-card" aria-labelledby="story-title">\n      <h2 id="story-title">What the main text says</h2>')
    out += [f'      <p>{e(g.get("text", ""))}</p>' for _, g in zipped(s['story'], o.get('story'))]
    out.append('      <p class="pg-note">A plain retelling of what the main text of the Nihon Shoki says (no published translation has been used).</p>\n    </section>')
    if s.get('variants'):
        out.append('\n    <section class="pg-card" aria-labelledby="var-title">\n      <h2 id="var-title">Variant accounts</h2>\n      <p class="pg-note">After its main text, the Nihon Shoki often sets out other versions, introduced with words such as "a certain book says" (一書曰).</p>')
        out += [f'      <div class="var"><b>{e(g.get("name") or v["name"])}</b><p>{e(g.get("text", ""))}</p></div>' for v, g in zipped(s['variants'], o.get('variants'))]
        out.append('    </section>')
    out.append(''); out.append(quotes_html(s, o)); out.append(''); out.append(who_html(s, o))
    out.append(cmp_html(s.get('kojiki'), o.get('compare'), 'In the Kojiki'))
    if not s.get('kojiki') and B.vol_of(s) >= 23:
        out.append('\n    <section class="pg-card"><h2>In the Kojiki</h2><p>The Kojiki ends with the reign of Empress Suiko. The period of this book is recorded only in the Nihon Shoki.</p></section>')
    kv = sorted({{'K': '上巻', 'C': '中巻', 'G': '下巻'}[k['ref'][0]] for k in s.get('kojiki', []) if k.get('ref')})
    base = shoki_vols(s['span']) + [WS(B.KOJ_WS[v], f'Kojiki, {KAN_EN[v]} (critical text)') for v in kv]
    out.append(f'''
    {pager(SHO, SEN, i, 'page', sl)}

    <section class="pg-card" aria-labelledby="src-title">
      <h2 id="src-title">Sources</h2>
      <p class="pg-note">"Main text" is the main text of the Nihon Shoki; "Variant account" is one of the other versions that follow it; "Compared with the Kojiki" is a difference checked in the original text of the Kojiki; "Commentary" is an interpretation checked against a public institution's explanation. Years are given as in the original (reign years), not converted to the Western calendar. Quotations are copied character for character from Chinese Wikisource (〔 〕 marks the original small notes). Names whose reading could not be confirmed are left in kanji.</p>
      <ul class="pg-src">
        {src_list(s.get('sources', []), base)}
      </ul>
      <a class="pg-back" href="./">← All pages</a>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

def shoki_index():
    title = 'Nihon Shoki Archive — all thirty books, from the Age of the Gods to Empress Jitō | N\'s factory'
    desc = f'The Nihon Shoki (Chronicles of Japan, 720) in {len(SHO)} pages: the key points to remember, the main text, the variant accounts, the original text, and how the Kojiki differs.'
    out = [head('shoki', title, desc, SITE + 'shoki/en/', SITE + 'shoki/', '../')]
    ERA = [(1, 2, 'The Age of the Gods (Books 1–2)'), (3, 10, 'Emperor Jinmu to Emperor Ōjin (Books 3–10)'), (11, 22, 'Emperor Nintoku to Empress Suiko (Books 11–22)'), (23, 30, 'Emperor Jomei to Empress Jitō (Books 23–30)')]
    out.append(f'''  <main class="pg-main">
    <p class="eyebrow">Nihon Shoki Archive</p>
    <h1>Nihon Shoki Archive</h1>
    <p class="pg-lead">The Nihon Shoki, completed in 720, records Japan from the age of the gods to Empress Jitō in thirty books. Here it is divided into {len(SHO)} pages. The Age of the Gods is arranged by section, with the main text and its variant accounts side by side; from Book 3 onward, each reign has its own page. Up to Empress Suiko, the pages link to the same events in the Kojiki Archive; from Emperor Jomei onward, only the Nihon Shoki records the period.</p>
    <div class="jump"><a href="#era-1">Age of the Gods</a><a href="#era-2">Jinmu–Ōjin</a><a href="#era-3">Nintoku–Suiko</a><a href="#era-4">Jomei–Jitō</a><a href="#review">Review the key points</a><a href="../../kojiki/en/">Kojiki Archive ›</a></div>

    <section class="pg-card" aria-labelledby="how-title">
      <h2 id="how-title">How this archive is written</h2>
      <p>Everything here has been checked against the original text of the Nihon Shoki. Years are given as reign years, as in the original, and are not converted to the Western calendar. Where a later interpretation is given, it is marked "Commentary" and its source is a public institution's explanation.</p>
      <div class="legend">{badge("本文", "shoki")}Main text {badge("一書", "shoki")}Variant account {badge("比較", "shoki")}How the Kojiki differs {badge("解説", "shoki")}Sourced interpretation</div>
    </section>

    <section class="pg-card" aria-labelledby="toc-title">
      <h2 id="toc-title">All pages ({len(SHO)})</h2>''')
    shown = set(); last = None
    for j, s in enumerate(SHO):
        v = B.vol_of(s)
        for n, (a, b, name) in enumerate(ERA, 1):
            if a <= v <= b and n not in shown:
                if last is not None: out.append('      </ol>')
                shown.add(n); last = None
                out.append(f'      <h2 id="era-{n}" style="margin-top:26px;">{e(name)}</h2>')
        if last != s['kan']:
            if last is not None: out.append('      </ol>')
            out.append(f'      <h3>{e(sl(s))}</h3>\n      <ol class="toc">'); last = s['kan']
        o = SEN.get(s['id'], {})
        first = (o.get('points') or [{}])[0].get('text', '')
        out.append(f'        <li><a href="{s["id"]}.html"><span class="no">{j + 1}</span><b>{e(o.get("title") or s["title"])}</b><span class="lead">{e(first)}</span></a></li>')
    out.append('      </ol>\n    </section>\n\n    <section class="pg-card" id="review" aria-labelledby="all-title">\n      <h2 id="all-title">Key points of every page</h2>\n      <p class="pg-note">For review: the first two key points of each page.</p>')
    for s in SHO:
        o = SEN.get(s['id'], {})
        out.append(f'      <h3><a href="{s["id"]}.html">{e(sl(s))}: {e(o.get("title") or s["title"])}</a></h3><ul style="margin:0;padding-left:1.2em;line-height:1.85;">'
                   + ''.join(f'<li>{e(p.get("text", ""))}</li>' for p in (o.get('points') or [])[:2]) + '</ul>')
    out.append('''    </section>

    <section class="pg-card" aria-labelledby="rel-title">
      <h2 id="rel-title">See also</h2>
      <p><a href="../../kojiki/en/">Kojiki Archive</a> — the same period, story by story, in the Kojiki.</p>
      <p><a href="../../../shrine-note/map/?lang=en">Shrine Note</a> — follow the shrines of these deities across a 3D map of the Japanese archipelago.</p>
    </section>
  </main>
''')
    out.append(FOOT)
    return '\n'.join(out)

RU = re.compile(r'\s*\(reading unconfirmed\)')
RU2 = re.compile(r'\(reading unconfirmed[;,]\s*')
RU3 = re.compile(r'[;,]\s*reading unconfirmed\)')  # 「(十市縣主, reading unconfirmed)」の形
RU_NOTE = '<p class="pg-note">A small <sup class="ru">*</sup> after a name in kanji means that its reading could not be confirmed from the sources used here, so the name is left in its original characters.</p>'

def finish(html):
    """「(reading unconfirmed)」を、本文では小さな * に、title・meta では削って読みやすくする（意味は変えない）"""
    headpart, body = html.split('<body>', 1)
    headpart = RU3.sub(')', RU2.sub('(', RU.sub('', headpart)))
    mark = '<sup class="ru" title="reading unconfirmed">*</sup>'
    body = RU3.sub(')' + mark, RU2.sub(mark + ' (', RU.sub(mark, body)))
    body = body.replace('<section class="pg-card" aria-labelledby="src-title">\n      <h2 id="src-title">Sources</h2>', '<section class="pg-card" aria-labelledby="src-title">\n      <h2 id="src-title">Sources</h2>\n      ' + RU_NOTE, 1)
    body = body.replace('<h2 id="how-title">How this archive is written</h2>', '<h2 id="how-title">How this archive is written</h2>\n      ' + RU_NOTE, 1)
    return headpart + '<body>' + body

def write(path, html):
    open(path, 'w', encoding='utf-8').write(finish(html))

if __name__ == '__main__':
    for d in ('kojiki', 'shoki'): os.makedirs(os.path.join(HIT, d, 'en'), exist_ok=True)
    for i, m in enumerate(KOJ):
        write(os.path.join(HIT, 'kojiki', 'en', m['id'] + '.html'), kojiki_page(i))
    write(os.path.join(HIT, 'kojiki', 'en', 'index.html'), kojiki_index())
    for i, s in enumerate(SHO):
        write(os.path.join(HIT, 'shoki', 'en', s['id'] + '.html'), shoki_page(i))
    write(os.path.join(HIT, 'shoki', 'en', 'index.html'), shoki_index())
    print(f'English: Kojiki {len(KOJ)} pages, Nihon Shoki {len(SHO)} pages + 2 indexes')
