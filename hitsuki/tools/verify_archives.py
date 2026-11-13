"""古事記アーカイブ・日本書紀アーカイブの検査。原文を中文維基文庫から取り直し、引用が一字一句含まれるかを確かめる。
使い方: python3 hitsuki/tools/verify_archives.py
段落番号：古事記 上巻 K1〜／中巻 C1〜、日本書紀 巻第n N{n}-1〜（下の clean() で整えた本文の、空行で区切った段落の通し番号）。
見るもの：引用（quotes・nihonshoki・kojiki）が指定の段落に含まれるか／段落番号が範囲（span）の中か／
神様IDが shrine-note/deities.json にあるか／ポイントが4〜6個で「解説」に出典URLがあるか／古事記⇔日本書紀の対応先があるか。"""
import json, os, re, sys, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
HIT = os.path.normpath(os.path.join(HERE, '..'))
ROOT = os.path.normpath(os.path.join(HIT, '..'))

def fetch(title):
    url = 'https://zh.wikisource.org/w/index.php?' + urllib.parse.urlencode({'title': title, 'action': 'raw'})
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (kiki-archive verifier)'})
    return urllib.request.urlopen(req, timeout=60).read().decode('utf-8')

def clean(t):
    t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S); t = re.sub(r'<ref[^>]*/>', '', t)
    for _ in range(3):
        t = re.sub(r'\{\{另\|([^|{}]*)\|[^{}]*\}\}', r'\1', t)
        t = re.sub(r'\{\{\*\|([^{}]*)\}\}', r'〔\1〕', t)
        t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    return t

def paras(raw, pre, start=None, end=None):
    if start and start in raw: raw = raw[raw.find(start):]
    if end and end in raw: raw = raw[:raw.find(end)]
    ps = [s.strip() for s in clean(raw).split('\n')]
    ps = [s for s in ps if s and not s.startswith(('==', '|', '{{', '}}'))]
    return {f'{pre}{i}': p for i, p in enumerate(ps, 1)}

VOL = ['卷第一', '卷第二', '卷第三', '卷第四', '卷第五', '卷第六', '卷第七', '卷第八', '卷第九', '卷第十']
T = {}
T.update(paras(fetch('古事記/上卷'), 'K', '== 上卷 ==', '== 註釋 =='))
T.update(paras(fetch('古事記/中卷'), 'C', None, '== 註釋 =='))
for n, v in enumerate(VOL, 1):
    T.update(paras(fetch('日本書紀/' + v), f'N{n}-'))
D = {d['id'] for d in json.load(open(os.path.join(ROOT, 'shrine-note', 'deities.json'), encoding='utf-8'))['deities']}
KOJ = json.load(open(os.path.join(HIT, 'kojiki', 'data', 'myths.json'), encoding='utf-8'))['myths']
SHO = json.load(open(os.path.join(HIT, 'shoki', 'data', 'episodes.json'), encoding='utf-8'))['episodes']
KIDS = {m['id'] for m in KOJ}
strip = lambda s: re.sub(r'〔[^〕]*〕', '', s)
has = lambda par, q: q in par or strip(q) in strip(par) or q in strip(par)

def key(r):  # 段落番号を (書, 番号) に
    m = re.match(r'^(K|C|N\d+-)(\d+)$', r or '')
    return (m.group(1), int(m.group(2))) if m else (None, None)

def inspan(r, span):
    a, b, c = key(r), key(span[0]), key(span[1])
    return a[0] is not None and a[0] == b[0] == c[0] and b[1] <= a[1] <= c[1]

bad = 0
def check(label, m, own_quotes_key, other_key):
    global bad
    probs = []
    if not 4 <= len(m['points']) <= 6: probs.append('points の数')
    for p in m['points']:
        if p['kind'] == '解説' and not p.get('src'): probs.append('解説に出典なし')
    for s in m['story']:
        for r in s.get('refs', []):
            if not inspan(r, m['span']): probs.append(f'story の段落 {r}')
    for q in m['quotes']:
        if not (inspan(q['ref'], m['span']) and q['ref'] in T and has(T[q['ref']], q['text'])): probs.append(f'原文の引用 {q["ref"]}: {q["text"]}')
    for q in m.get(other_key, []):
        if q.get('quote') and not (q.get('ref') in T and has(T[q['ref']], q['quote'])): probs.append(f'比較の引用 {q.get("ref")}: {q["quote"]}')
    for v in m.get('variants', []):
        if v.get('ref') and not inspan(v['ref'], m['span']): probs.append(f'一書の段落 {v["ref"]}')
    for i in m['deities']:
        if i not in D: probs.append(f'神様ID {i}')
    for k in m.get('kojiki_pages', []):
        if k not in KIDS: probs.append(f'対応する古事記のページ {k}')
    bad += len(probs)
    print(f'{label}: ' + ('OK' if not probs else ' / '.join(probs)))

for m in KOJ: check(f'古事記 {m.get("kan", "上巻")} 第{m["no"]}話 {m["title"]}', m, 'quotes', 'nihonshoki')
for s in SHO: check(f'日本書紀 {s["kan"]} {s["title"]}', s, 'quotes', 'kojiki')
print(f'問題 {bad} 件')
sys.exit(1 if bad else 0)
