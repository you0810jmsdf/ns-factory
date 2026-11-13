"""古事記アーカイブの検査。原文を中文維基文庫から取り直し、data/myths.json の引用が一字一句含まれるかを確かめる。
使い方: python3 hitsuki/kojiki/tools/verify.py
見るもの: 原文の引用（quotes）・日本書紀の引用（nihonshoki.quote）が、指定した段落に含まれるか／段落番号が話の範囲か／
神様のIDが shrine-note/deities.json にあるか／ポイントが4〜6個で、「解説」には出典URLがあるか。
段落番号（K1〜・N1-1〜・N2-1〜）は、下の clean() で整えた本文の、空行で区切った段落の通し番号。"""
import json, os, re, sys, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))

def fetch(title):
    url = 'https://zh.wikisource.org/w/index.php?' + urllib.parse.urlencode({'title': title, 'action': 'raw'})
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (kojiki-archive verifier)'})
    return urllib.request.urlopen(req, timeout=60).read().decode('utf-8')

def clean(t):
    t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S); t = re.sub(r'<ref[^>]*/>', '', t)
    for _ in range(3):
        t = re.sub(r'\{\{另\|([^|{}]*)\|[^{}]*\}\}', r'\1', t)
        t = re.sub(r'\{\{\*\|([^{}]*)\}\}', r'〔\1〕', t)
        t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    return t

def paras(raw, pre, start=None, end=None):
    if start: raw = raw[raw.find(start):]
    if end and end in raw: raw = raw[:raw.find(end)]
    ps = [s.strip() for s in clean(raw).split('\n')]
    ps = [s for s in ps if s and not s.startswith(('==', '|', '{{', '}}'))]
    return {f'{pre}{i}': p for i, p in enumerate(ps, 1)}

K = paras(fetch('古事記/上卷'), 'K', '== 上卷 ==', '== 註釋 ==')
N = {**paras(fetch('日本書紀/卷第一'), 'N1-'), **paras(fetch('日本書紀/卷第二'), 'N2-')}
D = {d['id'] for d in json.load(open(os.path.join(ROOT, 'shrine-note', 'deities.json'), encoding='utf-8'))['deities']}
myths = json.load(open(os.path.join(HERE, '..', 'data', 'myths.json'), encoding='utf-8'))['myths']
strip = lambda s: re.sub(r'〔[^〕]*〕', '', s)
has = lambda par, q: q in par or strip(q) in strip(par) or q in strip(par)
bad = 0
for m in myths:
    lo, hi = (int(x[1:]) for x in m['span'])
    inspan = lambda r: r.startswith('K') and r[1:].isdigit() and lo <= int(r[1:]) <= hi
    probs = []
    if not 4 <= len(m['points']) <= 6: probs.append('points の数')
    for p in m['points']:
        if p['kind'] == '解説' and not p.get('src'): probs.append('解説に出典なし')
    for q in m['quotes']:
        if not (inspan(q['ref']) and q['ref'] in K and has(K[q['ref']], q['text'])): probs.append(f'原文の引用 {q["ref"]}: {q["text"]}')
    for q in m.get('nihonshoki', []):
        if q.get('quote') and not (q['ref'] in N and has(N[q['ref']], q['quote'])): probs.append(f'書紀の引用 {q["ref"]}: {q["quote"]}')
    for i in m['deities']:
        if i not in D: probs.append(f'神様ID {i}')
    bad += len(probs)
    print(f'第{m["no"]}話 {m["title"]}: ' + ('OK' if not probs else ' / '.join(probs)))
print(f'段落数 古事記上巻 {len(K)}・書紀 {len(N)}　問題 {bad} 件')
sys.exit(1 if bad else 0)
