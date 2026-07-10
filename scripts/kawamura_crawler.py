# -*- coding: utf-8 -*-
"""カワムラレザー公式サイト 定期巡回クローラー
==============================================================
kawamuraleather.com の各商品ページから
  1) ds単価（税込）  → order_estimate/leather-series-price.csv を更新
  2) サイト在庫数    → order_estimate/leather-site-stock.csv を出力
を取得する。自社の半裁残量（leather-stock.csv）には一切触らない。

実行:
  py -X utf8 scripts/kawamura_crawler.py                # 巡回本番
  py -X utf8 scripts/kawamura_crawler.py --limit 5      # 動作確認（5件のみ・CSVは更新しない）
  py -X utf8 scripts/kawamura_crawler.py --sleep 0.5    # 巡回間隔を指定
  py -X utf8 scripts/kawamura_crawler.py --build-map    # pid対応表の再生成のみ

pid対応表（order_estimate/kawamura-products.csv）は build_kawamura_catalog.py の
調査データから生成する。カタログに色を追加したら --build-map を再実行すること。

GitHub Actions（.github/workflows/kawamura-crawl.yml）から週1回自動実行される。
標準ライブラリのみ使用（requests不要）。
"""
import csv
import io
import json
import os
import re
import statistics
import sys
import time
import urllib.request
from datetime import datetime, timezone, timedelta

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP_CSV = os.path.join(ROOT, 'order_estimate', 'kawamura-products.csv')
PRICE_CSV = os.path.join(ROOT, 'order_estimate', 'leather-series-price.csv')
SITE_STOCK_CSV = os.path.join(ROOT, 'order_estimate', 'leather-site-stock.csv')
CATALOG_JSON = os.path.join(ROOT, 'order_estimate', 'leather-catalog.json')

BASE_URL = 'https://kawamuraleather.com/?pid={pid}'
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NsFactoryPriceBot/1.0'
JST = timezone(timedelta(hours=9))

# ページ内パターン（2026-07-10 実ページ調査に基づく）
#   <strong>ds単価：￥163- (+税)</strong><span ...>（税込￥179）</span>
#   埋め込みJSON: "stock_num":282
RE_DS_TAXIN = re.compile(r'ds単価[^<]*?</strong>[^（]*?（税込￥([\d,]+)）')
RE_DS_TAXIN2 = re.compile(r'ds単価[：:]\s*￥?([\d,]+)[^税]*?税込￥?([\d,]+)')
RE_STOCK = re.compile(r'"stock_num":(\d+)')


# ------------------------------------------------------------------
# pid対応表の生成（build_kawamura_catalog.py の調査データを再利用）
# ------------------------------------------------------------------
def build_map():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_kawamura_catalog as bk

    with open(CATALOG_JSON, encoding='utf-8') as f:
        catalog = json.load(f)['leathers']
    by_id = {e['id']: e for e in catalog}
    existing = [e for e in catalog if not e['id'].startswith('kw')]

    rows, unmatched = [], []
    for series_key, pid, color, _img in bk.DATA:
        prefix, _sub, _tanner, stag, _tan, _extra = bk.META[series_key]
        if pid in bk.SKIP_PIDS:
            reason = bk.SKIP_PIDS[pid]
            m = re.search(r'既存[^a-z0-9_]*([a-z][a-z0-9_]+)', reason)
            if m and m.group(1) in by_id:
                cid = m.group(1)
            else:
                # 系列prefix＋色名で既存エントリを照合（ALASKA/MARIANO/MFOG/LVB等）
                # 完全一致を優先（「ブルー」が「アイスブルー」に部分一致する誤爆対策）
                cands = [e for e in existing if e['name'] == prefix + ' ' + color]
                if not cands:
                    cands = [e for e in existing
                             if e['name'].startswith(prefix) and color in e['name']]
                if len(cands) != 1:
                    unmatched.append((series_key, pid, color, reason, len(cands)))
                    continue
                cid = cands[0]['id']
        else:
            cid = 'kw' + pid
        name = by_id.get(cid, {}).get('name', prefix + ' ' + color)
        rows.append((cid, pid, stag, name))

    with open(MAP_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\r\n')
        w.writerow(['id', 'pid', 'series_tag', 'name'])
        w.writerows(rows)

    print(f'pid対応表を生成: {len(rows)}件 -> {MAP_CSV}')
    if unmatched:
        print(f'未対応 {len(unmatched)}件（対応表から除外・要手動確認）:')
        for u in unmatched:
            print('  -', u)
    return rows


# ------------------------------------------------------------------
# 巡回
# ------------------------------------------------------------------
def fetch_page(pid):
    req = urllib.request.Request(BASE_URL.format(pid=pid),
                                 headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode('euc_jp', errors='replace')


def parse_page(html):
    price = None
    m = RE_DS_TAXIN.search(html) or RE_DS_TAXIN2.search(html)
    if m:
        price = int(m.group(m.lastindex).replace(',', ''))
    stock = None
    m = RE_STOCK.search(html)
    if m:
        stock = int(m.group(1))
    return price, stock


def load_map():
    with open(MAP_CSV, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def crawl(limit=None, sleep_sec=1.0):
    items = load_map()
    if limit:
        items = items[:limit]
    results = {}   # pid -> dict(price, stock, error)
    fails = 0
    print(f'巡回開始: {len(items)}件（{sleep_sec}秒間隔）')
    for i, row in enumerate(items):
        pid = row['pid']
        try:
            html = fetch_page(pid)
            price, stock = parse_page(html)
            results[pid] = {'price': price, 'stock': stock, 'error': None}
        except Exception as ex:
            results[pid] = {'price': None, 'stock': None, 'error': str(ex)}
            fails += 1
            print(f'  FAIL pid={pid}: {ex}')
        time.sleep(sleep_sec)
        if (i + 1) % 50 == 0:
            print(f'  {i + 1}/{len(items)}', flush=True)
    print(f'巡回完了: 成功 {len(items) - fails} / 失敗 {fails}')
    return items, results, fails


def update_price_csv(items, results, today):
    """leather-series-price.csv を更新（CRLF・コメント行・note列を保持）"""
    # 価格の集計: id直接 と 系列タグ別リスト
    id_price = {}
    series_prices = {}
    for row in items:
        r = results.get(row['pid'])
        if not r or r['price'] is None:
            continue
        id_price[row['id']] = r['price']
        series_prices.setdefault(row['series_tag'], []).append(r['price'])

    raw = open(PRICE_CSV, encoding='utf-8', newline='').read()
    lines = raw.split('\r\n')
    changed = []
    for idx, line in enumerate(lines):
        if not line or line.startswith('key,'):
            continue
        if line.startswith('#'):
            lines[idx] = re.sub(r'（税込[^）]*）',
                                f'（税込・自動巡回 {today}更新）', line)
            continue
        parts = line.split(',')
        if len(parts) < 2:
            continue
        key, old = parts[0], parts[1]
        new = None
        if key.startswith('kw') and key[2:].isdigit():
            new = id_price.get(key)
        elif key in id_price:
            new = id_price[key]
        elif key in series_prices:
            new = statistics.mode(series_prices[key])
            uniq = set(series_prices[key])
            if len(uniq) > 1:
                print(f'  注意: 系列 {key} 内で単価が不一致 {sorted(uniq)} → 最頻値 {new} を採用')
        if new is not None and str(new) != old:
            changed.append((key, old, new))
            parts[1] = str(new)
            lines[idx] = ','.join(parts)
    with open(PRICE_CSV, 'w', encoding='utf-8', newline='') as f:
        f.write('\r\n'.join(lines))
    if changed:
        print(f'ds単価の変更 {len(changed)}件:')
        for k, o, n in changed:
            print(f'  {k}: {o} -> {n}')
    else:
        print('ds単価の変更なし')
    return changed


def write_site_stock_csv(items, results, today):
    """カワムラ側の在庫数を書き出す（自社残量の leather-stock.csv とは別物）"""
    with open(SITE_STOCK_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\r\n')
        w.writerow(['id', 'name', 'pid', 'site_stock_num', 'status', 'checked_at'])
        for row in items:
            r = results.get(row['pid'], {})
            stock = r.get('stock')
            if r.get('error'):
                status = 'fetch_error'
            elif stock is None:
                status = 'unknown'
            elif stock <= 0:
                status = 'sold_out'
            elif stock <= 2:
                status = 'low'
            else:
                status = 'in_stock'
            w.writerow([row['id'], row['name'], row['pid'],
                        '' if stock is None else stock, status, today])
    print(f'サイト在庫を出力: {len(items)}件 -> {SITE_STOCK_CSV}')


def arg_value(args, name, default=None):
    if name not in args:
        return default
    idx = args.index(name)
    if idx + 1 >= len(args):
        raise SystemExit(f'{name} の値を指定してください')
    return args[idx + 1]


def main():
    args = sys.argv[1:]
    if '--build-map' in args:
        build_map()
        return
    limit = None
    if '--limit' in args:
        limit = int(arg_value(args, '--limit'))
    sleep_sec = float(arg_value(args, '--sleep', '1.0'))
    if not os.path.exists(MAP_CSV):
        print('pid対応表がないため生成します')
        build_map()
    today = datetime.now(JST).strftime('%Y-%m-%d')
    items, results, fails = crawl(limit=limit, sleep_sec=sleep_sec)
    if limit:
        ok = len(items) - fails
        print(f'動作確認モードのためCSV更新はスキップします: 成功 {ok} / 失敗 {fails}')
        if items and fails / len(items) > 0.3:
            print('::error::取得失敗率が30%を超えました。サイト構造変更の可能性あり')
            sys.exit(1)
        return
    update_price_csv(items, results, today)
    write_site_stock_csv(items, results, today)
    if len(items) > 0 and fails / len(items) > 0.3:
        print('::error::取得失敗率が30%を超えました。サイト構造変更の可能性あり')
        sys.exit(1)


if __name__ == '__main__':
    main()
