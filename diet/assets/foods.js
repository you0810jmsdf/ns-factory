// 出典: 文部科学省「日本食品標準成分表2020年版（八訂）増補2023年」の公表成分値を基に、可食部100g（飲料は100ml）あたりで整理。
// serving は日本の一般的な1人前の目安であり、成分表由来ではない。
// 食品DBは検索・入力補助用の静的データであり、外部通信は一切行わない。

export const FOOD_CATEGORIES = Object.freeze([
  '主食',
  '主菜(肉)',
  '主菜(魚)',
  '卵・大豆',
  '野菜',
  '果物',
  '乳製品',
  '汁物',
  '麺類',
  'パン',
  '惣菜・外食',
  '菓子',
  '飲料',
  '調味料'
]);

export const BUILTIN_FOODS = Object.freeze([
  { id: 'f001', name: 'ごはん（白米）', kana: 'ごはん', cat: '主食', unit: 'g', per: 100, kcal: 156, p: 2.5, f: 0.3, c: 37.1, serving: { label: '茶碗1杯', g: 150 } },
  { id: 'f002', name: '玄米ごはん', kana: 'げんまいごはん', cat: '主食', unit: 'g', per: 100, kcal: 152, p: 2.8, f: 1.0, c: 35.6, serving: { label: '茶碗1杯', g: 150 } },
  { id: 'f003', name: 'もち', kana: 'もち', cat: '主食', unit: 'g', per: 100, kcal: 223, p: 4.0, f: 0.6, c: 50.8, serving: { label: '切り餅1個', g: 50 } },
  { id: 'f004', name: '赤飯', kana: 'せきはん', cat: '主食', unit: 'g', per: 100, kcal: 190, p: 4.3, f: 0.6, c: 41.9, serving: { label: '茶碗1杯', g: 150 } },
  { id: 'f005', name: 'おかゆ（精白米）', kana: 'おかゆ', cat: '主食', unit: 'g', per: 100, kcal: 65, p: 1.1, f: 0.1, c: 15.7, serving: { label: '茶碗1杯', g: 250 } },
  { id: 'f006', name: 'すし飯', kana: 'すしめし', cat: '主食', unit: 'g', per: 100, kcal: 151, p: 2.5, f: 0.3, c: 36.5, serving: { label: '茶碗1杯', g: 150 } },
  { id: 'f007', name: '押麦ごはん', kana: 'おしむぎごはん', cat: '主食', unit: 'g', per: 100, kcal: 118, p: 2.2, f: 0.5, c: 27.8, serving: { label: '茶碗1杯', g: 150 } },
  { id: 'f008', name: 'オートミール', kana: 'おーとみーる', cat: '主食', unit: 'g', per: 100, kcal: 350, p: 13.7, f: 5.7, c: 69.1, serving: { label: '1食分', g: 30 } },
  { id: 'f009', name: 'コーンフレーク', kana: 'こーんふれーく', cat: '主食', unit: 'g', per: 100, kcal: 380, p: 7.8, f: 1.7, c: 83.6, serving: { label: '1食分', g: 40 } },
  { id: 'f010', name: '焼き芋', kana: 'やきいも', cat: '主食', unit: 'g', per: 100, kcal: 151, p: 1.4, f: 0.2, c: 39.0, serving: { label: '中1本', g: 200 } },

  { id: 'f011', name: '鶏むね肉（皮なし）', kana: 'とりむねにく', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 105, p: 23.3, f: 1.9, c: 0.1, serving: { label: '1人前', g: 100 } },
  { id: 'f012', name: '鶏もも肉（皮なし）', kana: 'とりももにく', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 113, p: 19.0, f: 5.0, c: 0.0, serving: { label: '1人前', g: 100 } },
  { id: 'f013', name: '鶏ささみ', kana: 'とりささみ', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 98, p: 23.9, f: 0.8, c: 0.1, serving: { label: '2本', g: 100 } },
  { id: 'f014', name: '豚ロース', kana: 'ぶたろーす', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 248, p: 19.3, f: 19.2, c: 0.2, serving: { label: '1人前', g: 100 } },
  { id: 'f015', name: '豚ヒレ', kana: 'ぶたひれ', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 118, p: 22.8, f: 1.9, c: 0.2, serving: { label: '1人前', g: 100 } },
  { id: 'f016', name: '豚もも（赤肉）', kana: 'ぶたもも', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 128, p: 22.1, f: 3.6, c: 0.2, serving: { label: '1人前', g: 100 } },
  { id: 'f017', name: '牛もも（赤肉）', kana: 'ぎゅうもも', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 140, p: 21.3, f: 5.7, c: 0.4, serving: { label: '1人前', g: 100 } },
  { id: 'f018', name: '牛肩ロース', kana: 'ぎゅうかたろーす', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 318, p: 16.2, f: 26.4, c: 0.2, serving: { label: '1人前', g: 100 } },
  { id: 'f019', name: '牛ひき肉', kana: 'ぎゅうひきにく', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 272, p: 17.1, f: 21.1, c: 0.3, serving: { label: '1人前', g: 100 } },
  { id: 'f020', name: '鶏ひき肉', kana: 'とりひきにく', cat: '主菜(肉)', unit: 'g', per: 100, kcal: 186, p: 17.5, f: 12.0, c: 0.0, serving: { label: '1人前', g: 100 } },

  { id: 'f021', name: '鮭', kana: 'さけ', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 124, p: 22.3, f: 4.1, c: 0.1, serving: { label: '1切れ', g: 80 } },
  { id: 'f022', name: 'さば', kana: 'さば', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 211, p: 20.6, f: 16.8, c: 0.3, serving: { label: '1切れ', g: 100 } },
  { id: 'f023', name: 'さんま', kana: 'さんま', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 287, p: 18.1, f: 25.6, c: 0.1, serving: { label: '1尾', g: 100 } },
  { id: 'f024', name: 'まぐろ（赤身）', kana: 'まぐろ', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 115, p: 26.4, f: 1.4, c: 0.1, serving: { label: '刺身1人前', g: 100 } },
  { id: 'f025', name: 'かつお', kana: 'かつお', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 108, p: 25.8, f: 0.5, c: 0.1, serving: { label: '刺身1人前', g: 100 } },
  { id: 'f026', name: 'ぶり', kana: 'ぶり', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 222, p: 21.4, f: 17.6, c: 0.3, serving: { label: '1切れ', g: 100 } },
  { id: 'f027', name: 'あじ', kana: 'あじ', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 112, p: 19.7, f: 4.5, c: 0.1, serving: { label: '1尾', g: 80 } },
  { id: 'f028', name: 'いわし', kana: 'いわし', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 156, p: 19.2, f: 9.2, c: 0.2, serving: { label: '1尾', g: 80 } },
  { id: 'f029', name: 'たら', kana: 'たら', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 72, p: 17.6, f: 0.2, c: 0.1, serving: { label: '1切れ', g: 100 } },
  { id: 'f030', name: 'しらす干し', kana: 'しらすぼし', cat: '主菜(魚)', unit: 'g', per: 100, kcal: 187, p: 40.5, f: 3.5, c: 0.5 },

  { id: 'f031', name: '卵（全卵）', kana: 'たまご', cat: '卵・大豆', unit: 'g', per: 100, kcal: 142, p: 12.2, f: 10.2, c: 0.4, serving: { label: '1個', g: 50 } },
  { id: 'f032', name: 'ゆで卵', kana: 'ゆでたまご', cat: '卵・大豆', unit: 'g', per: 100, kcal: 134, p: 12.5, f: 10.4, c: 0.3, serving: { label: '1個', g: 50 } },
  { id: 'f033', name: '納豆', kana: 'なっとう', cat: '卵・大豆', unit: 'g', per: 100, kcal: 184, p: 16.5, f: 10.0, c: 12.1, serving: { label: '1パック', g: 45 } },
  { id: 'f034', name: '木綿豆腐', kana: 'もめんどうふ', cat: '卵・大豆', unit: 'g', per: 100, kcal: 73, p: 7.0, f: 4.9, c: 1.5, serving: { label: '1/2丁', g: 150 } },
  { id: 'f035', name: '絹ごし豆腐', kana: 'きぬごしどうふ', cat: '卵・大豆', unit: 'g', per: 100, kcal: 56, p: 5.3, f: 3.5, c: 2.0, serving: { label: '1/2丁', g: 150 } },
  { id: 'f036', name: '油揚げ', kana: 'あぶらあげ', cat: '卵・大豆', unit: 'g', per: 100, kcal: 377, p: 23.4, f: 34.4, c: 0.4, serving: { label: '1枚', g: 30 } },
  { id: 'f037', name: '厚揚げ', kana: 'あつあげ', cat: '卵・大豆', unit: 'g', per: 100, kcal: 143, p: 10.7, f: 11.3, c: 0.9, serving: { label: '1/2枚', g: 100 } },
  { id: 'f038', name: '豆乳（無調整）', kana: 'とうにゅう', cat: '卵・大豆', unit: 'ml', per: 100, kcal: 44, p: 3.6, f: 2.0, c: 3.1, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f039', name: '枝豆', kana: 'えだまめ', cat: '卵・大豆', unit: 'g', per: 100, kcal: 125, p: 11.7, f: 6.2, c: 8.8, serving: { label: '小鉢1杯', g: 70 } },
  { id: 'f040', name: 'きな粉', kana: 'きなこ', cat: '卵・大豆', unit: 'g', per: 100, kcal: 451, p: 37.5, f: 25.7, c: 29.5 },

  { id: 'f041', name: 'キャベツ', kana: 'きゃべつ', cat: '野菜', unit: 'g', per: 100, kcal: 23, p: 1.3, f: 0.2, c: 5.2, serving: { label: 'サラダ1皿', g: 100 } },
  { id: 'f042', name: 'レタス', kana: 'れたす', cat: '野菜', unit: 'g', per: 100, kcal: 11, p: 0.6, f: 0.1, c: 2.8, serving: { label: 'サラダ1皿', g: 100 } },
  { id: 'f043', name: 'ほうれん草', kana: 'ほうれんそう', cat: '野菜', unit: 'g', per: 100, kcal: 18, p: 2.2, f: 0.4, c: 3.1, serving: { label: '小鉢1杯', g: 70 } },
  { id: 'f044', name: '小松菜', kana: 'こまつな', cat: '野菜', unit: 'g', per: 100, kcal: 13, p: 1.5, f: 0.2, c: 2.4, serving: { label: '小鉢1杯', g: 70 } },
  { id: 'f045', name: 'ブロッコリー', kana: 'ぶろっこりー', cat: '野菜', unit: 'g', per: 100, kcal: 37, p: 5.4, f: 0.6, c: 6.6, serving: { label: '小鉢1杯', g: 80 } },
  { id: 'f046', name: 'トマト', kana: 'とまと', cat: '野菜', unit: 'g', per: 100, kcal: 20, p: 0.7, f: 0.1, c: 4.7, serving: { label: '中1個', g: 150 } },
  { id: 'f047', name: 'きゅうり', kana: 'きゅうり', cat: '野菜', unit: 'g', per: 100, kcal: 13, p: 1.0, f: 0.1, c: 3.0, serving: { label: '1本', g: 100 } },
  { id: 'f048', name: 'にんじん', kana: 'にんじん', cat: '野菜', unit: 'g', per: 100, kcal: 35, p: 0.7, f: 0.2, c: 9.3, serving: { label: '1/2本', g: 75 } },
  { id: 'f049', name: '玉ねぎ', kana: 'たまねぎ', cat: '野菜', unit: 'g', per: 100, kcal: 33, p: 1.0, f: 0.1, c: 8.4, serving: { label: '1/2個', g: 100 } },
  { id: 'f050', name: 'だいこん', kana: 'だいこん', cat: '野菜', unit: 'g', per: 100, kcal: 15, p: 0.5, f: 0.1, c: 4.1, serving: { label: '輪切り3cm', g: 100 } },

  { id: 'f051', name: 'バナナ', kana: 'ばなな', cat: '果物', unit: 'g', per: 100, kcal: 93, p: 1.1, f: 0.2, c: 22.5, serving: { label: '1本', g: 100 } },
  { id: 'f052', name: 'りんご', kana: 'りんご', cat: '果物', unit: 'g', per: 100, kcal: 56, p: 0.2, f: 0.3, c: 16.2, serving: { label: '1個', g: 250 } },
  { id: 'f053', name: 'みかん', kana: 'みかん', cat: '果物', unit: 'g', per: 100, kcal: 49, p: 0.7, f: 0.1, c: 12.0, serving: { label: '1個', g: 80 } },
  { id: 'f054', name: 'オレンジ', kana: 'おれんじ', cat: '果物', unit: 'g', per: 100, kcal: 48, p: 0.9, f: 0.1, c: 11.8, serving: { label: '1個', g: 150 } },
  { id: 'f055', name: 'いちご', kana: 'いちご', cat: '果物', unit: 'g', per: 100, kcal: 31, p: 0.9, f: 0.1, c: 8.5, serving: { label: '5粒', g: 75 } },
  { id: 'f056', name: 'キウイフルーツ', kana: 'きういふるーつ', cat: '果物', unit: 'g', per: 100, kcal: 51, p: 1.0, f: 0.2, c: 13.5, serving: { label: '1個', g: 100 } },
  { id: 'f057', name: 'ぶどう', kana: 'ぶどう', cat: '果物', unit: 'g', per: 100, kcal: 58, p: 0.4, f: 0.1, c: 15.7, serving: { label: '小房1つ', g: 100 } },
  { id: 'f058', name: 'もも', kana: 'もも', cat: '果物', unit: 'g', per: 100, kcal: 38, p: 0.6, f: 0.1, c: 10.2, serving: { label: '1個', g: 200 } },
  { id: 'f059', name: 'なし', kana: 'なし', cat: '果物', unit: 'g', per: 100, kcal: 38, p: 0.3, f: 0.1, c: 11.3, serving: { label: '1/2個', g: 150 } },
  { id: 'f060', name: 'アボカド', kana: 'あぼかど', cat: '果物', unit: 'g', per: 100, kcal: 176, p: 2.1, f: 17.5, c: 7.9, serving: { label: '1/2個', g: 70 } },

  { id: 'f061', name: '牛乳', kana: 'ぎゅうにゅう', cat: '乳製品', unit: 'ml', per: 100, kcal: 61, p: 3.3, f: 3.8, c: 4.8, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f062', name: '低脂肪牛乳', kana: 'ていしぼうぎゅうにゅう', cat: '乳製品', unit: 'ml', per: 100, kcal: 42, p: 3.8, f: 1.0, c: 5.5, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f063', name: 'ヨーグルト（全脂無糖）', kana: 'よーぐると', cat: '乳製品', unit: 'g', per: 100, kcal: 56, p: 3.6, f: 3.0, c: 4.9, serving: { label: '小鉢1杯', g: 100 } },
  { id: 'f064', name: 'ヨーグルト（低脂肪無糖）', kana: 'ていしぼうよーぐると', cat: '乳製品', unit: 'g', per: 100, kcal: 40, p: 3.7, f: 1.0, c: 5.2, serving: { label: '小鉢1杯', g: 100 } },
  { id: 'f065', name: 'プロセスチーズ', kana: 'ぷろせすちーず', cat: '乳製品', unit: 'g', per: 100, kcal: 313, p: 22.7, f: 26.0, c: 1.3, serving: { label: '1切れ', g: 20 } },
  { id: 'f066', name: 'カマンベールチーズ', kana: 'かまんべーるちーず', cat: '乳製品', unit: 'g', per: 100, kcal: 291, p: 19.1, f: 24.7, c: 0.9, serving: { label: '1切れ', g: 25 } },
  { id: 'f067', name: 'カッテージチーズ', kana: 'かってーじちーず', cat: '乳製品', unit: 'g', per: 100, kcal: 99, p: 13.3, f: 4.5, c: 1.9, serving: { label: '小鉢1杯', g: 100 } },
  { id: 'f068', name: 'クリームチーズ', kana: 'くりーむちーず', cat: '乳製品', unit: 'g', per: 100, kcal: 313, p: 8.2, f: 33.0, c: 2.3, serving: { label: '1切れ', g: 20 } },
  { id: 'f069', name: '脱脂粉乳', kana: 'だっしふんにゅう', cat: '乳製品', unit: 'g', per: 100, kcal: 354, p: 34.0, f: 1.0, c: 53.3 },
  { id: 'f070', name: '飲むヨーグルト', kana: 'のむよーぐると', cat: '乳製品', unit: 'ml', per: 100, kcal: 64, p: 2.9, f: 0.5, c: 12.2, serving: { label: 'コップ1杯', g: 200 } },

  { id: 'f071', name: 'みそ汁', kana: 'みそしる', cat: '汁物', unit: 'g', per: 100, kcal: 36, p: 2.2, f: 1.2, c: 4.3, serving: { label: 'お椀1杯', g: 150 } },
  { id: 'f072', name: '豚汁', kana: 'とんじる', cat: '汁物', unit: 'g', per: 100, kcal: 72, p: 3.5, f: 4.3, c: 5.4, serving: { label: 'お椀1杯', g: 200 } },
  { id: 'f073', name: 'コーンポタージュ', kana: 'こーんぽたーじゅ', cat: '汁物', unit: 'g', per: 100, kcal: 76, p: 1.8, f: 3.1, c: 10.6, serving: { label: 'カップ1杯', g: 180 } },
  { id: 'f074', name: 'わかめスープ', kana: 'わかめすーぷ', cat: '汁物', unit: 'g', per: 100, kcal: 16, p: 1.0, f: 0.6, c: 2.0, serving: { label: 'お椀1杯', g: 150 } },
  { id: 'f075', name: '卵スープ', kana: 'たまごすーぷ', cat: '汁物', unit: 'g', per: 100, kcal: 35, p: 2.5, f: 1.8, c: 2.3, serving: { label: 'カップ1杯', g: 150 } },
  { id: 'f076', name: 'コンソメスープ', kana: 'こんそめすーぷ', cat: '汁物', unit: 'g', per: 100, kcal: 5, p: 0.4, f: 0.0, c: 0.7, serving: { label: 'カップ1杯', g: 150 } },
  { id: 'f077', name: 'けんちん汁', kana: 'けんちんじる', cat: '汁物', unit: 'g', per: 100, kcal: 45, p: 2.0, f: 2.0, c: 5.2, serving: { label: 'お椀1杯', g: 200 } },
  { id: 'f078', name: 'クラムチャウダー', kana: 'くらむちゃうだー', cat: '汁物', unit: 'g', per: 100, kcal: 93, p: 3.5, f: 5.8, c: 7.1, serving: { label: 'カップ1杯', g: 200 } },
  { id: 'f079', name: 'ミネストローネ', kana: 'みねすとろーね', cat: '汁物', unit: 'g', per: 100, kcal: 47, p: 1.7, f: 1.5, c: 7.7, serving: { label: 'カップ1杯', g: 200 } },
  { id: 'f080', name: 'すまし汁', kana: 'すましじる', cat: '汁物', unit: 'g', per: 100, kcal: 15, p: 1.0, f: 0.2, c: 2.0, serving: { label: 'お椀1杯', g: 150 } },

  { id: 'f081', name: 'うどん（ゆで）', kana: 'うどん', cat: '麺類', unit: 'g', per: 100, kcal: 95, p: 2.6, f: 0.4, c: 21.6, serving: { label: '1玉', g: 250 } },
  { id: 'f082', name: 'そば（ゆで）', kana: 'そば', cat: '麺類', unit: 'g', per: 100, kcal: 130, p: 4.8, f: 1.0, c: 26.0, serving: { label: '1玉', g: 200 } },
  { id: 'f083', name: '中華めん（ゆで）', kana: 'ちゅうかめん', cat: '麺類', unit: 'g', per: 100, kcal: 149, p: 4.9, f: 0.6, c: 29.2, serving: { label: '1玉', g: 200 } },
  { id: 'f084', name: 'スパゲッティ（ゆで）', kana: 'すぱげってぃ', cat: '麺類', unit: 'g', per: 100, kcal: 150, p: 5.8, f: 0.9, c: 32.2, serving: { label: '1皿', g: 250 } },
  { id: 'f085', name: 'そうめん（ゆで）', kana: 'そうめん', cat: '麺類', unit: 'g', per: 100, kcal: 127, p: 3.5, f: 0.4, c: 28.1, serving: { label: '1人前', g: 250 } },
  { id: 'f086', name: 'ラーメン（しょうゆ）', kana: 'らーめん', cat: '麺類', unit: 'g', per: 100, kcal: 76, p: 3.4, f: 2.0, c: 10.9, serving: { label: '1杯', g: 600 } },
  { id: 'f087', name: '焼きそば麺（蒸し）', kana: 'やきそばめん', cat: '麺類', unit: 'g', per: 100, kcal: 146, p: 4.9, f: 1.9, c: 28.4, serving: { label: '1玉', g: 150 } },
  { id: 'f088', name: '春雨（ゆで）', kana: 'はるさめ', cat: '麺類', unit: 'g', per: 100, kcal: 76, p: 0.0, f: 0.1, c: 19.1, serving: { label: '小鉢1杯', g: 80 } },
  { id: 'f089', name: 'ビーフン（ゆで）', kana: 'びーふん', cat: '麺類', unit: 'g', per: 100, kcal: 129, p: 0.9, f: 0.2, c: 31.7, serving: { label: '1皿', g: 200 } },
  { id: 'f090', name: '冷麦（ゆで）', kana: 'ひやむぎ', cat: '麺類', unit: 'g', per: 100, kcal: 127, p: 3.5, f: 0.4, c: 28.1, serving: { label: '1人前', g: 250 } },

  { id: 'f091', name: '食パン', kana: 'しょくぱん', cat: 'パン', unit: 'g', per: 100, kcal: 248, p: 8.9, f: 4.1, c: 46.4, serving: { label: '6枚切り1枚', g: 60 } },
  { id: 'f092', name: 'ロールパン', kana: 'ろーるぱん', cat: 'パン', unit: 'g', per: 100, kcal: 309, p: 10.1, f: 9.0, c: 48.6, serving: { label: '1個', g: 30 } },
  { id: 'f093', name: 'フランスパン', kana: 'ふらんすぱん', cat: 'パン', unit: 'g', per: 100, kcal: 289, p: 9.4, f: 1.3, c: 57.5, serving: { label: '1切れ', g: 30 } },
  { id: 'f094', name: 'クロワッサン', kana: 'くろわっさん', cat: 'パン', unit: 'g', per: 100, kcal: 406, p: 8.4, f: 26.8, c: 43.9, serving: { label: '1個', g: 45 } },
  { id: 'f095', name: 'ベーグル', kana: 'べーぐる', cat: 'パン', unit: 'g', per: 100, kcal: 270, p: 9.6, f: 1.5, c: 54.6, serving: { label: '1個', g: 90 } },
  { id: 'f096', name: 'ライ麦パン', kana: 'らいむぎぱん', cat: 'パン', unit: 'g', per: 100, kcal: 252, p: 8.4, f: 2.2, c: 52.7, serving: { label: '1枚', g: 60 } },
  { id: 'f097', name: 'イングリッシュマフィン', kana: 'いんぐりっしゅまふぃん', cat: 'パン', unit: 'g', per: 100, kcal: 228, p: 8.1, f: 3.9, c: 40.8, serving: { label: '1個', g: 60 } },
  { id: 'f098', name: 'ナン', kana: 'なん', cat: 'パン', unit: 'g', per: 100, kcal: 262, p: 10.3, f: 3.4, c: 47.6, serving: { label: '1枚', g: 100 } },
  { id: 'f099', name: 'あんパン', kana: 'あんぱん', cat: 'パン', unit: 'g', per: 100, kcal: 267, p: 7.9, f: 5.3, c: 47.5, serving: { label: '1個', g: 80 } },
  { id: 'f100', name: 'クリームパン', kana: 'くりーむぱん', cat: 'パン', unit: 'g', per: 100, kcal: 286, p: 7.9, f: 10.9, c: 38.4, serving: { label: '1個', g: 80 } },

  { id: 'f101', name: '鶏のから揚げ', kana: 'とりのからあげ', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 307, p: 13.8, f: 24.2, c: 9.2, serving: { label: '3個', g: 90 } },
  { id: 'f102', name: 'とんかつ', kana: 'とんかつ', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 344, p: 16.5, f: 26.9, c: 9.8, serving: { label: '1枚', g: 120 } },
  { id: 'f103', name: 'ハンバーグ', kana: 'はんばーぐ', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 223, p: 13.3, f: 13.4, c: 12.3, serving: { label: '1個', g: 150 } },
  { id: 'f104', name: 'カレーライス', kana: 'かれーらいす', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 129, p: 3.8, f: 4.4, c: 18.5, serving: { label: '1皿', g: 600 } },
  { id: 'f105', name: '牛丼', kana: 'ぎゅうどん', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 176, p: 5.9, f: 6.2, c: 23.1, serving: { label: '1杯', g: 500 } },
  { id: 'f106', name: '親子丼', kana: 'おやこどん', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 146, p: 6.7, f: 4.4, c: 20.7, serving: { label: '1杯', g: 500 } },
  { id: 'f107', name: 'チャーハン', kana: 'ちゃーはん', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 181, p: 5.7, f: 7.4, c: 23.4, serving: { label: '1皿', g: 400 } },
  { id: 'f108', name: '餃子', kana: 'ぎょうざ', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 209, p: 7.1, f: 10.0, c: 23.8, serving: { label: '6個', g: 120 } },
  { id: 'f109', name: 'コロッケ', kana: 'ころっけ', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 226, p: 4.9, f: 15.2, c: 18.1, serving: { label: '1個', g: 80 } },
  { id: 'f110', name: 'ポテトサラダ', kana: 'ぽてとさらだ', cat: '惣菜・外食', unit: 'g', per: 100, kcal: 122, p: 2.0, f: 8.1, c: 10.4, serving: { label: '小鉢1杯', g: 80 } },

  { id: 'f111', name: 'ショートケーキ', kana: 'しょーとけーき', cat: '菓子', unit: 'g', per: 100, kcal: 314, p: 6.9, f: 14.7, c: 38.0, serving: { label: '1切れ', g: 100 } },
  { id: 'f112', name: 'ドーナツ', kana: 'どーなつ', cat: '菓子', unit: 'g', per: 100, kcal: 379, p: 7.1, f: 20.3, c: 43.8, serving: { label: '1個', g: 60 } },
  { id: 'f113', name: 'チョコレート', kana: 'ちょこれーと', cat: '菓子', unit: 'g', per: 100, kcal: 550, p: 6.9, f: 34.1, c: 55.8, serving: { label: '板チョコ1/2枚', g: 25 } },
  { id: 'f114', name: 'ポテトチップス', kana: 'ぽてとちっぷす', cat: '菓子', unit: 'g', per: 100, kcal: 541, p: 4.7, f: 35.2, c: 54.7, serving: { label: '小袋1袋', g: 60 } },
  { id: 'f115', name: 'せんべい', kana: 'せんべい', cat: '菓子', unit: 'g', per: 100, kcal: 373, p: 7.8, f: 1.0, c: 83.1, serving: { label: '1枚', g: 20 } },
  { id: 'f116', name: '羊羹', kana: 'ようかん', cat: '菓子', unit: 'g', per: 100, kcal: 289, p: 3.6, f: 0.2, c: 70.0, serving: { label: '1切れ', g: 50 } },
  { id: 'f117', name: '大福', kana: 'だいふく', cat: '菓子', unit: 'g', per: 100, kcal: 235, p: 4.8, f: 0.5, c: 53.2, serving: { label: '1個', g: 100 } },
  { id: 'f118', name: 'プリン', kana: 'ぷりん', cat: '菓子', unit: 'g', per: 100, kcal: 116, p: 5.5, f: 5.0, c: 14.7, serving: { label: '1個', g: 100 } },
  { id: 'f119', name: 'アイスクリーム', kana: 'あいすくりーむ', cat: '菓子', unit: 'g', per: 100, kcal: 178, p: 3.9, f: 8.0, c: 22.4, serving: { label: 'カップ1個', g: 100 } },
  { id: 'f120', name: 'カステラ', kana: 'かすてら', cat: '菓子', unit: 'g', per: 100, kcal: 313, p: 6.2, f: 4.6, c: 61.8, serving: { label: '1切れ', g: 50 } },

  { id: 'f121', name: '水', kana: 'みず', cat: '飲料', unit: 'ml', per: 100, kcal: 0, p: 0.0, f: 0.0, c: 0.0, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f122', name: '緑茶', kana: 'りょくちゃ', cat: '飲料', unit: 'ml', per: 100, kcal: 2, p: 0.2, f: 0.0, c: 0.2, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f123', name: '麦茶', kana: 'むぎちゃ', cat: '飲料', unit: 'ml', per: 100, kcal: 1, p: 0.0, f: 0.0, c: 0.3, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f124', name: 'コーヒー（無糖）', kana: 'こーひー', cat: '飲料', unit: 'ml', per: 100, kcal: 4, p: 0.2, f: 0.0, c: 0.7, serving: { label: 'カップ1杯', g: 200 } },
  { id: 'f125', name: '紅茶（無糖）', kana: 'こうちゃ', cat: '飲料', unit: 'ml', per: 100, kcal: 1, p: 0.1, f: 0.0, c: 0.1, serving: { label: 'カップ1杯', g: 200 } },
  { id: 'f126', name: 'オレンジジュース', kana: 'おれんじじゅーす', cat: '飲料', unit: 'ml', per: 100, kcal: 45, p: 0.7, f: 0.1, c: 10.7, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f127', name: 'りんごジュース', kana: 'りんごじゅーす', cat: '飲料', unit: 'ml', per: 100, kcal: 43, p: 0.1, f: 0.2, c: 11.8, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f128', name: 'コーラ', kana: 'こーら', cat: '飲料', unit: 'ml', per: 100, kcal: 46, p: 0.0, f: 0.0, c: 11.4, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f129', name: 'スポーツドリンク', kana: 'すぽーつどりんく', cat: '飲料', unit: 'ml', per: 100, kcal: 21, p: 0.0, f: 0.0, c: 5.1, serving: { label: 'コップ1杯', g: 200 } },
  { id: 'f130', name: 'ビール', kana: 'びーる', cat: '飲料', unit: 'ml', per: 100, kcal: 40, p: 0.3, f: 0.0, c: 3.1, serving: { label: '缶1本', g: 350 } },
  // カフェオレ: 成分表のコーヒー浸出液(4kcal)と普通牛乳(61kcal)の1:1混合として算出（2026-08-24 利用者要望で追加）
  { id: 'f141', name: 'カフェオレ（無糖・牛乳1:1）', kana: 'かふぇおれ', cat: '飲料', unit: 'ml', per: 100, kcal: 33, p: 1.8, f: 1.9, c: 2.8, serving: { label: 'コップ1杯', g: 200 } },
  // ミルクティー: 紅茶浸出液(1kcal)と普通牛乳の3:1混合として算出
  { id: 'f142', name: 'ミルクティー（無糖）', kana: 'みるくてぃー', cat: '飲料', unit: 'ml', per: 100, kcal: 16, p: 0.9, f: 1.0, c: 1.3, serving: { label: 'カップ1杯', g: 200 } },

  { id: 'f131', name: 'こいくちしょうゆ', kana: 'こいくちしょうゆ', cat: '調味料', unit: 'g', per: 100, kcal: 76, p: 7.7, f: 0.0, c: 7.9 },
  { id: 'f132', name: 'みそ', kana: 'みそ', cat: '調味料', unit: 'g', per: 100, kcal: 182, p: 12.5, f: 6.0, c: 21.9 },
  { id: 'f133', name: '食塩', kana: 'しょくえん', cat: '調味料', unit: 'g', per: 100, kcal: 0, p: 0.0, f: 0.0, c: 0.0 },
  { id: 'f134', name: '砂糖', kana: 'さとう', cat: '調味料', unit: 'g', per: 100, kcal: 391, p: 0.0, f: 0.0, c: 99.3 },
  { id: 'f135', name: 'みりん', kana: 'みりん', cat: '調味料', unit: 'g', per: 100, kcal: 241, p: 0.3, f: 0.0, c: 43.2 },
  { id: 'f136', name: '料理酒', kana: 'りょうりしゅ', cat: '調味料', unit: 'g', per: 100, kcal: 107, p: 0.4, f: 0.0, c: 4.9 },
  { id: 'f137', name: 'マヨネーズ', kana: 'まよねーず', cat: '調味料', unit: 'g', per: 100, kcal: 668, p: 1.4, f: 76.0, c: 3.6 },
  { id: 'f138', name: 'トマトケチャップ', kana: 'とまとけちゃっぷ', cat: '調味料', unit: 'g', per: 100, kcal: 104, p: 1.6, f: 0.1, c: 27.4 },
  { id: 'f139', name: 'ウスターソース', kana: 'うすたーそーす', cat: '調味料', unit: 'g', per: 100, kcal: 117, p: 1.0, f: 0.1, c: 26.8 },
  { id: 'f140', name: 'オリーブ油', kana: 'おりーぶゆ', cat: '調味料', unit: 'g', per: 100, kcal: 894, p: 0.0, f: 100.0, c: 0.0 }
]);

/**
 * 食品名・かな・カテゴリを対象に部分一致検索する。
 * @param {string} query 検索語。
 * @param {{category?:string, limit?:number}} [options] 絞り込み条件。
 * @returns {Array<object>} 検索結果。
 */
export function searchFoods(query, options = {}) {
  const text = String(query || '').trim();
  const category = options.category || null;
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : Infinity;

  return BUILTIN_FOODS
    .filter((food) => !category || food.cat === category)
    .filter((food) => {
      if (!text) {
        return true;
      }
      return food.name.includes(text) || food.kana.includes(text);
    })
    .slice(0, limit);
}

/**
 * カテゴリ別の品目数を返す。
 * @returns {Record<string, number>} カテゴリ別件数。
 */
export function countFoodsByCategory() {
  return FOOD_CATEGORIES.reduce((counts, category) => {
    counts[category] = BUILTIN_FOODS.filter((food) => food.cat === category).length;
    return counts;
  }, {});
}

export default BUILTIN_FOODS;
