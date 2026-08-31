// 品目名から食品データを引き当てる共通処理。
//
// テキスト入力（views/meal.js）と写真解析の修正（photo.js）の両方から使う。
// ⛔ 片方だけ直さないこと。同じ言葉で結果が変わると利用者が混乱する。
//
// 経緯: 「ご飯」「味噌汁」「焼きビーフン」「生卵」は食品データに該当があるのに
//       1件も引けていなかった（2026-08-31 実測 0/19）。単純な includes 比較では
//       漢字とひらがなの違い・数量の混入・修飾語で全滅する。

// 漢字などの別表記を、食品データ側の書き方（ひらがな）へ寄せる。
// ⛔ 憶測で大量に足さないこと。実際に引けなかった記録をもとに増やす。
const ALIASES = Object.freeze([
  ['ご飯', 'ごはん'],
  ['御飯', 'ごはん'],
  ['白飯', 'ごはん'],
  ['白米', 'ごはん'],
  ['味噌', 'みそ'],
  ['玉子', '卵'],
  ['たまご', '卵'],
  ['タマゴ', '卵'],
  ['お茶', '緑茶'],
  ['珈琲', 'コーヒー'],
  ['牛乳', 'ぎゅうにゅう']
]);

// 名前の先頭・末尾に付きやすい調理法や飾りの語。落として再検索する。
// ⛔ 「焼き肉」「揚げ出し豆腐」のように語の一部が消えると別物になる場合があるため、
//    落とすのは最後の手段（完全一致・前方一致・部分一致で引けなかったとき）に限る。
// ⛔ 「大」「小」を入れないこと。「大豆」が「豆」に化ける。
const MODIFIERS = Object.freeze([
  '焼き', '生', 'ゆで', '茹で', '蒸し', '炒め', '揚げ',
  '冷やし', 'ミニ', '特大'
]);

// 末尾に付く数量表現。「甘栗4個」「大豆30g」「サイコロステーキ3つ」を落とす。
const QUANTITY_RE = /[0-9０-９]+\s*(個|つ|枚|本|杯|皿|袋|パック|切れ|尾|房|片|玉|人前|人分|g|ｇ|グラム|ml|ｍｌ|cc)?$/;

/**
 * カタカナをひらがなに変換する。
 * @param {string} s 入力。
 * @returns {string} 変換後。
 */
function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * 比較用に品目名をならす。
 * @param {string} value 品目名。
 * @returns {string} 正規化した文字列。
 */
export function normalizeFoodName(value) {
  let s = String(value || '').trim().toLocaleLowerCase('ja-JP');
  // 全角英数を半角へ
  s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  // 括弧の中身と記号・空白を落とす（「ごはん（白米）」と「ごはん」を揃えるため）
  s = s.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s・･、,，.。／/\-ー―–—]/g, '');
  s = kataToHira(s);
  ALIASES.forEach(([from, to]) => {
    s = s.split(kataToHira(String(from).toLocaleLowerCase('ja-JP'))).join(kataToHira(to));
  });
  return s;
}

/**
 * 末尾の数量表現を落とす。「甘栗4個」→「甘栗」。
 * @param {string} value 品目名。
 * @returns {string} 落とした結果。落とせなければ元のまま。
 */
export function stripQuantity(value) {
  const s = String(value || '').trim();
  const cut = s.replace(QUANTITY_RE, '').trim();
  return cut || s;
}

/**
 * 先頭・末尾の調理法を落とす。「焼きビーフン」→「ビーフン」。
 * @param {string} value 品目名。
 * @returns {Array<string>} 試す価値のある候補（元の語は含まない）。
 */
export function stripModifiers(value) {
  const s = String(value || '').trim();
  const out = [];
  // ⛔ 長い語から試し、当たったら短い語は試さないこと。
  //    「焼き肉」は「焼き」を落とすと「肉」（短すぎるので不採用）だが、
  //    「焼」を落とすと「き肉」となり「牛ひき肉」に化ける（2026-08-31 実測）。
  const sorted = MODIFIERS.slice().sort((a, b) => b.length - a.length);
  const MIN_REST = 2;
  for (const m of sorted) {
    if (s.startsWith(m)) {
      const rest = s.slice(m.length);
      if (rest.length >= MIN_REST) out.push(rest);
      break;
    }
  }
  for (const m of sorted) {
    if (s.endsWith(m)) {
      const rest = s.slice(0, -m.length);
      if (rest.length >= MIN_REST) out.push(rest);
      break;
    }
  }
  return out;
}

function rankOf(normName, normKana, q) {
  if (normName === q || normKana === q) return 0;
  if (normName.startsWith(q) || normKana.startsWith(q)) return 1;
  if (normName.includes(q) || normKana.includes(q)) return 2;
  // 入力のほうが長い場合（「豆乳カフェオレ」に「豆乳」が含まれる等）
  if (q.includes(normName) || (normKana && q.includes(normKana))) return 3;
  return -1;
}

function searchOnce(query, foods) {
  const q = normalizeFoodName(query);
  if (!q) return null;
  const scored = [];
  foods.forEach((f) => {
    const n = normalizeFoodName(f.name);
    const k = normalizeFoodName(f.kana || '');
    const r = rankOf(n, k, q);
    if (r >= 0) scored.push({ food: f, rank: r, len: f.name.length });
  });
  if (!scored.length) return null;
  // ⛔ 順位付けを変えないこと。「ごはん」で「玄米ごはん」（部分一致）より
  //    「ごはん（白米）」（完全一致）を先に出すためにこの順序が要る。
  scored.sort((a, b) => a.rank - b.rank || a.len - b.len);
  return scored[0].food;
}

/**
 * 品目名から食品データを1件引き当てる。
 * 完全一致 → 前方一致 → 部分一致 で引けなければ、数量・調理法を落として再挑戦する。
 * @param {string} name 品目名。
 * @param {Array<object>} foods 食品データ（BUILTIN_FOODS とマイメニューの合成でよい）。
 * @returns {{food:object, matchedBy:string}|null} 見つからなければ null。
 */
export function findFoodEntry(name, foods) {
  const list = Array.isArray(foods) ? foods : [];
  if (!list.length) return null;

  let hit = searchOnce(name, list);
  if (hit) return { food: hit, matchedBy: 'そのまま' };

  const noQty = stripQuantity(name);
  if (noQty !== String(name || '').trim()) {
    hit = searchOnce(noQty, list);
    if (hit) return { food: hit, matchedBy: '数量を除いて' };
  }

  // ⛔ 調理法落としは最後にすること。先にやると「焼き肉」が「肉」に化ける。
  for (const cand of stripModifiers(noQty)) {
    hit = searchOnce(cand, list);
    if (hit) return { food: hit, matchedBy: '「' + cand + '」として' };
  }
  return null;
}

/**
 * 1人前ぶんのカロリーを求める。目安が無ければ100gあたりの値を使う。
 * @param {object} food 食品データ1件。
 * @returns {{kcal:number, label:string, grams:number}} 1人前の情報。
 */
export function servingCalories(food) {
  const grams = food.serving && Number.isFinite(food.serving.g) ? food.serving.g : food.per;
  const ratio = food.per ? grams / food.per : 1;
  return {
    kcal: Math.round((food.kcal || 0) * ratio),
    grams,
    label: food.serving && food.serving.label ? food.serving.label : `${grams}${food.unit || 'g'}`
  };
}
