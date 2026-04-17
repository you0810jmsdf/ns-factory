"""
mini6写真インデックス構築スクリプト
- クライアント名とローカルフォルダをマッチング
- 公開用写真をGitHub Pages用にコピー
- mini6-photos.json を生成
"""
import os, sys, json, shutil
sys.stdout.reconfigure(encoding='utf-8')

BASE  = r'C:\Users\nsfactory\OneDrive\レザークラフト\販売部\【商品データ】\●システム手帳（本体）\mini6'
REPO  = r'C:\Users\nsfactory\OneDrive\レザークラフト\広報部\サイト管理\ns-factory'
DEST  = os.path.join(REPO, 'assets', 'mini6-photos')
JSON_OUT = os.path.join(REPO, 'mini6-photos.json')

IMG_EXT = ('.jpg', '.jpeg', '.png', '.gif', '.webp')

def get_img_files(folder, recurse=False):
    imgs = []
    if not os.path.isdir(folder):
        return imgs
    if recurse:
        for root, dirs, files in os.walk(folder):
            for f in files:
                if f.lower().endswith(IMG_EXT):
                    imgs.append(os.path.join(root, f))
    else:
        for f in os.listdir(folder):
            if f.lower().endswith(IMG_EXT):
                imgs.append(os.path.join(folder, f))
    return sorted(imgs)

def best_photos(folder_path):
    pub = os.path.join(folder_path, '公開用')
    if os.path.isdir(pub):
        imgs = get_img_files(pub, recurse=True)
        if imgs:
            return imgs
    return get_img_files(folder_path, recurse=False)

# フォルダインデックス構築
folder_index = []
for root, dirs, files in os.walk(BASE):
    if root == BASE:
        continue
    rel = root.replace(BASE + os.sep, '')
    folder_index.append((rel.lower(), root))

def find_folder(client_name):
    key = client_name.lower()
    results = []
    for rel_lower, full in folder_index:
        parts = rel_lower.split(os.sep)
        last = parts[-1] if parts else ''
        # ブラケットマッチ [client] 系
        if '[' + key + ']' in last or '[' + key + '_' in last or '_' + key + ']' in last:
            depth = rel_lower.count(os.sep)
            results.append((depth, full))
    if results:
        results.sort()
        return results[0][1]
    # 部分一致（最後のフォルダ名のみ）
    for rel_lower, full in folder_index:
        parts = rel_lower.split(os.sep)
        last = parts[-1] if parts else ''
        if key in last:
            depth = rel_lower.count(os.sep)
            results.append((depth, full))
    if results:
        results.sort()
        return results[0][1]
    return None

# 手動マッピング（曖昧なケース）
MANUAL = {
    'ひまわり': os.path.join(BASE, 'ヌメ', '20240517[himawari6040]（Insta）'),
    'yuricka':  os.path.join(BASE, 'MARGOT FOG', 'Fuxia,oeder', '20251125_上西祐里佳（simplist,20mm）'),
    'ミホ':     os.path.join(BASE, 'MARGOT FOG', 'Girasole', '20250620_岩崎美穂_dr.organizer'),
    '月下美人': os.path.join(BASE, 'MARGOT FOG', 'alloro.order', '20240514_メルカリ（月下美人）=Instagram（camello0337）'),
    '大後':     os.path.join(BASE, 'MARGOT FOG', 'alloro.order', '20240525_minne（大後順子）（メール）'),
    'nami-wato':os.path.join(BASE, 'MARGOT FOG', 'Nature,order', '20241011_神那美子[Creema_ nami-wato]'),
    'rafirafi': os.path.join(BASE, 'MARGOT FOG', 'Nature,order', '20240901_白石佐和子[minne_rafirafi]'),
    'Panda':    os.path.join(BASE, 'MARGOT FOG', 'Nature,order', '20240926_島野洋子[panda]'),
    'code-u':   os.path.join(BASE, 'ALASKA', 'ピンク', '20240601_[code_u]眞鍋亜紀子'),
    'code_u':   os.path.join(BASE, 'ALASKA', 'ピンク', '20240601_[code_u]眞鍋亜紀子'),
    'PIPI':     os.path.join(BASE, 'ALASKA', 'ブラウン', '20250520_minne_pipi_関玲奈'),
    'pipi':     os.path.join(BASE, 'ALASKA', 'ブラウン', '20250520_minne_pipi_関玲奈'),
    'chi':      os.path.join(BASE, 'LINEA VASCA Box', 'topo', '20240524order_insta(関玲名,chi_mini____6）'),
    'marin':    os.path.join(BASE, 'ヌメ', '20250108_[mercari_marin][寺田優奈]'),
    'マル':     os.path.join(BASE, 'MARGOT FOG', 'Nature,order', '20250628_mercari_マル_W250H143'),
    'QOO':  None, 'JUN': None, 'shinra': None, 'azton06': None, 'a-noise': None,
    'hatohato': None, 'あゆほ': None, 'いとさん': None, 'うさぎ': None,
}

# mini6_import.json 読み込み
with open(r'C:\Users\nsfactory\OneDrive\レザークラフト\広報部\サイト管理\Apps Script\mini6_import.json', encoding='utf-8') as f:
    records = json.load(f)['records']

clients = sorted(set(r['client'] for r in records if r['client']))
photo_map = {}
matched = []
unmatched = []

for client in clients:
    if client in MANUAL:
        folder_path = MANUAL[client]
        if folder_path is None:
            unmatched.append(client)
            continue
    else:
        folder_path = find_folder(client)
        if not folder_path:
            unmatched.append(client)
            continue

    imgs = best_photos(folder_path)
    if imgs:
        photo_map[client] = imgs
        matched.append(client)
        print(f'✓ {client} ({len(imgs)}枚) ← {folder_path.replace(BASE+os.sep,"")}')
    else:
        unmatched.append(client)
        print(f'✗ {client} → 写真なし ({folder_path.replace(BASE+os.sep,"")})')

print(f'\n=== マッチ: {len(matched)}件 / 未マッチ: {len(unmatched)}件 ===')
print(f'未マッチ: {unmatched}\n')

# コピー＆JSONビルド
os.makedirs(DEST, exist_ok=True)
json_data = {}

for client, imgs in photo_map.items():
    # フォルダ名: クライアント名を安全な文字列に
    safe = client.replace('/', '_').replace('\\', '_').replace(' ', '_').replace('　', '_')
    out_dir = os.path.join(DEST, safe)
    os.makedirs(out_dir, exist_ok=True)
    urls = []
    for i, src in enumerate(imgs):
        ext = os.path.splitext(src)[1].lower()
        dst_name = f'{i+1:03d}{ext}'
        dst = os.path.join(out_dir, dst_name)
        if not os.path.exists(dst):
            shutil.copy2(src, dst)
        urls.append(f'assets/mini6-photos/{safe}/{dst_name}')
    json_data[client] = urls
    print(f'コピー完了: {client} → {safe}/ ({len(urls)}枚)')

with open(JSON_OUT, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print(f'\nmini6-photos.json 生成完了: {len(json_data)}クライアント')
