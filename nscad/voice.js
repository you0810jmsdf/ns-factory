// 音声／テキスト命令の文法（純粋関数）。parseVoice(text, lang, state) → {cmd, args, confirm?} ／ {ask:[候補]} ／ {free:text}。
// state = {pending:{cmd,args}|null}（確認待ちの命令）。認識 API 自体はここに持たない（app.js が Web Speech API を呼ぶ）。
const TOOL_WORDS = {
  select: { ja: ['選択', 'せんたく', '矢印'], en: ['select', 'selection', 'arrow', 'pointer'] },
  line: { ja: ['直線', '線', 'ライン'], en: ['line', 'straight'] },
  circle: { ja: ['円', 'まる', '丸', 'サークル'], en: ['circle', 'round'] },
  rect: { ja: ['長方形', '四角形', '四角', '矩形', 'レクタングル'], en: ['rectangle', 'rect'] },
  arc: { ja: ['円弧', '弧', 'アーク'], en: ['arc'] },
  bezier: { ja: ['ベジェ', 'ベジエ', '曲線'], en: ['bezier', 'bézier', 'curve'] },
  path: { ja: ['ペン', 'パス', '折れ線', 'おれせん', 'ポリライン'], en: ['pen', 'path', 'polyline', 'polygon'] }, /* 折れ線ツールは無い（ペンで、クリックだけなら直線）。言い方だけペンへ */
  text: { ja: ['文字', 'テキスト'], en: ['text', 'label'] },
  dimension: { ja: ['寸法', '寸法線'], en: ['dimension', 'measure'] },
  fillet: { ja: ['丸め', 'フィレット', '角丸'], en: ['fillet', 'round corner'] },
  chamfer: { ja: ['面取り', '面取', 'チャンファー'], en: ['chamfer'] },
  offset: { ja: ['オフセット'], en: ['offset'] },
  trim: { ja: ['トリム', '切り取り'], en: ['trim'] },
  mirror: { ja: ['線対称', '対称コピー', 'ミラー'], en: ['mirror', 'symmetry'] },
  fold: { ja: ['折り線', '折れ目'], en: ['fold'] },
  koma: { ja: ['駒合わせ', 'こまあわせ'], en: ['koma', 'butt stitch'] },
  stitch: { ja: ['目打ち', 'めうち', '縫い穴', '菱目'], en: ['stitch', 'stitching', 'holes', 'pricking'] },
};
const ACTION_WORDS = {
  undo: { ja: ['元に戻す', '戻す', 'アンドゥ', '取り消し'], en: ['undo', 'go back'] },
  redo: { ja: ['やり直し', 'やり直す', 'リドゥ'], en: ['redo'] },
  delete: { ja: ['削除', '消して', '消す', 'デリート'], en: ['delete', 'remove', 'erase'], confirm: true },
  copy: { ja: ['コピー', '複製'], en: ['copy', 'duplicate'] },
  mirrorX: { ja: ['左右反転', '左右'], en: ['flip horizontal', 'flip horizontally', 'mirror horizontal'] },
  mirrorY: { ja: ['上下反転', '上下'], en: ['flip vertical', 'flip vertically', 'mirror vertical'] },
  selectAll: { ja: ['全部選択', '全て選択', 'すべて選択', '全選択'], en: ['select all', 'select everything'] },
  save: { ja: ['保存', 'セーブ'], en: ['save'], confirm: true },
  exportSvg: { ja: ['svg', 'エスブイジー'], en: ['svg'] },
  exportDxf: { ja: ['dxf', 'ディーエックスエフ'], en: ['dxf'] },
  exportPdf: { ja: ['pdf', 'ピーディーエフ'], en: ['pdf'] },
  print: { ja: ['印刷', 'プリント'], en: ['print'], confirm: true },
  view3d: { ja: ['3d', '三次元', '立体'], en: ['3d', 'three d'] },
  view2d: { ja: ['2d', '平面', '二次元'], en: ['2d', 'two d', 'flat'] },
  help: { ja: ['ヘルプ', '説明', '使い方'], en: ['help', 'manual'] },
  zoomIn: { ja: ['拡大', 'ズームイン', '大きく'], en: ['zoom in', 'bigger', 'larger'] },
  zoomOut: { ja: ['縮小', 'ズームアウト', '小さく'], en: ['zoom out', 'smaller'] },
  fit: { ja: ['全体表示', '全体', 'フィット'], en: ['fit', 'show all', 'whole'] },
  zoom: { ja: ['ズーム', '倍率'], en: ['zoom'] },
  grid: { ja: ['グリッド', '方眼'], en: ['grid'] },
  cancel: { ja: ['キャンセル', '中止', 'やめる'], en: ['cancel', 'stop', 'escape'] },
};
const YES = { ja: ['はい', 'うん', 'おーけー', 'ok', 'オッケー', '実行', 'やって'], en: ['yes', 'ok', 'okay', 'yep', 'sure', 'do it', 'confirm'] };
const NO = { ja: ['いいえ', 'やめる', 'キャンセル', '中止', 'ちがう', '違う'], en: ['no', 'cancel', 'nope', 'stop'] };
/** 全角→半角・小文字・空白圧縮。 */
export function normalizeVoice(text) { return String(text || '').replace(/[Ａ-Ｚａ-ｚ０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[、。,!！?？]|(?<!\d)\.|\.(?!\d)/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim(); }
/** 文中の数値を抜く：{length, angle, radius, value, side, placement}。 */
export function extractNumbers(text, lang) {
  const t = normalizeVoice(text), nums = [...t.matchAll(/(-?\d+(?:\.\d+)?)/g)].map(m => Number(m[1]));
  const out = {}; const grab = re => { const m = t.match(re); return m ? Number(m[1]) : undefined; };
  out.angle = grab(lang === 'ja' ? /角度\s*(-?\d+(?:\.\d+)?)/ : /(?:angle|at)\s*(-?\d+(?:\.\d+)?)\s*(?:deg|degrees|°)?/) ?? grab(/(-?\d+(?:\.\d+)?)\s*(?:度|deg|degrees|°)/);
  out.radius = grab(lang === 'ja' ? /半径\s*(\d+(?:\.\d+)?)/ : /radius\s*(\d+(?:\.\d+)?)/) ?? grab(/(\d+(?:\.\d+)?)\s*(?:ミリ|mm|millimeters?)?\s*(?:の半径|radius)/);
  const rest = nums.filter(n => n !== out.angle && n !== out.radius);
  if (rest.length) out.value = rest[0]; for (const k of ['angle', 'radius']) if (out[k] === undefined) delete out[k];
  if (/内側|inside|inner|inward/.test(t)) out.side = 'inside'; else if (/外側|outside|outer|outward/.test(t)) out.side = 'outside';
  if (/可変|variable/.test(t)) out.placement = 'variable'; else if (/固定|fixed/.test(t)) out.placement = 'fixed'; else if (/等分|equal/.test(t)) out.placement = 'equal';
  return out;
}
function findWord(table, t, lang) {
  const hits = [];
  for (const [key, def] of Object.entries(table)) for (const w of def[lang] || []) { const i = t.indexOf(w); if (i >= 0) hits.push({ key, w, i, len: w.length }); }
  hits.sort((a, b) => b.len - a.len || a.i - b.i); return hits[0] || null;
}
function editDistance(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
function similar(table, t, lang) {
  const out = [];
  for (const [key, def] of Object.entries(table)) for (const w of def[lang] || []) {
    const score = lang === 'ja' ? [...new Set(w)].filter(c => t.includes(c)).length / Math.max(2, [...new Set(w)].length) : (t.split(' ').some(x => x.length >= 3 && editDistance(x, w) <= Math.max(1, Math.floor(w.length / 4))) ? 0.6 : 0);
    if (score >= 0.5 && w.length >= 2) { out.push({ key, w, score }); break; }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}
/* ───────── 描く文法（事業主 2026-10-23「音声作図機能は相変わらず何も機能しない」）：「幅100高さ50の長方形」「直径20の円」「右に100 上に50 左に100 閉じる」のように、数字つきで言えば、いまの点から直接描く。
   向き：右・左・上・下は、画面で見える向き（図面の座標は下向きが＋なので、実行側で上下を合わせる）。単位：ミリ（mm）が標準・センチは10倍。 */
const VOICE_KANJI_DIGIT = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function voiceKanjiNum(s) {
  if (/^[〇零一二三四五六七八九]+$/.test(s)) return Number([...s].map(c => VOICE_KANJI_DIGIT[c]).join(''));
  let total = 0, cur = 0;
  for (const ch of s) { if (ch in VOICE_KANJI_DIGIT) cur = VOICE_KANJI_DIGIT[ch]; else { const m = { 十: 10, 百: 100, 千: 1000 }[ch]; if (!m) return NaN; total += (cur || 1) * m; cur = 0; } }
  return total + cur;
}
/** 「百二十ミリ」「半径五十」のような漢数字を算用数字にする（単位・「半径」「右に」などの直前直後だけ。「二つ折り」「三つ折り」は変えない）。 */
export function kanjiNumbersToArabic(t) {
  const K = '〇零一二三四五六七八九十百千';
  return String(t).replace(new RegExp(`([${K}]+)(?=\\s*(?:ミリ|センチ|mm|cm|度))|(?<=(?:半径|直径|幅|高さ|横|縦|長さ|角度|[右左上下][にへ]))([${K}]+)`, 'g'), (m, a, b) => { const n = voiceKanjiNum(a || b); return Number.isFinite(n) ? String(n) : m; });
}
const DRAW_NUM = '(\\d+(?:\\.\\d+)?)', DRAW_UNIT = '\\s*(ミリメートル|ミリ|mm|センチメートル|センチ|cm|millimeters?|centimeters?)?';
const drawToMm = (v, u) => Math.round((/センチ|cm|centi/.test(u || '') ? Number(v) * 10 : Number(v)) * 1e4) / 1e4;
const DRAW_DIR = { 右: 'right', 左: 'left', 上: 'up', 下: 'down', right: 'right', left: 'left', up: 'up', down: 'down' };
/** 描く文法。描く内容があれば { cmd:'draw', ops:[{op:'origin'}|{op:'rect',w,h}|{op:'circle',r}|{op:'move',dir,len}|{op:'close'}] }、大きさが足りないときは { cmd:'draw', ops:[], need:'rectSize' }、無ければ null。 */
export function parseDraw(t, lang = 'ja') {
  const ja = lang === 'ja', ops = [];
  const sz = re => { const m = new RegExp(re).exec(t); return m ? drawToMm(m[1], m[2]) : undefined; };
  const origin = ja ? /原点|げんてん/.test(t) : /\borigin\b/.test(t);
  if (origin) ops.push({ op: 'origin' });
  const square = ja ? /正方形|せいほうけい|スクエア/.test(t) : /\bsquare\b/.test(t), rectW = ja ? /長方形|四角形|四角|矩形|レクタングル/.test(t) : /\b(rectangle|rect|box)\b/.test(t);
  if (square || rectW) {
    let w = sz(`(?:幅|はば|横|よこ|width|wide)\\s*(?:は|が|を|:|of)?\\s*${DRAW_NUM}${DRAW_UNIT}`), h = sz(`(?:高さ|たかさ|縦|たて|height|high|tall)\\s*(?:は|が|を|:|of)?\\s*${DRAW_NUM}${DRAW_UNIT}`);
    const nums = [...t.matchAll(new RegExp(DRAW_NUM + DRAW_UNIT, 'g'))].map(m => drawToMm(m[1], m[2]));
    if (square && !rectW) { const side = w ?? h ?? nums[0]; return side > 0 ? { cmd: 'draw', ops: [...ops, { op: 'rect', w: side, h: side }] } : null; }
    if (w === undefined && h === undefined) { const pair = new RegExp(`${DRAW_NUM}${DRAW_UNIT}\\s*(?:x|×|掛け|かけ|by|と)\\s*${DRAW_NUM}${DRAW_UNIT}`).exec(t); if (pair) { w = drawToMm(pair[1], pair[2]); h = drawToMm(pair[3], pair[4]); } else if (nums.length >= 2) { w = nums[0]; h = nums[1]; } }
    if (w === undefined && h === undefined && nums.length === 0) return null;   /* 数字が無い：「長方形」だけ→ツールを選ぶ */
    if (!(w > 0 && h > 0)) return { cmd: 'draw', ops: [], need: 'rectSize' };
    return { cmd: 'draw', ops: [...ops, { op: 'rect', w, h }] };
  }
  const circle = ja ? /円|丸|まる|サークル/.test(t) : /\bcircle\b/.test(t), diameter = ja ? /直径|ちょっけい/.test(t) : /\bdiameter\b/.test(t);
  if (circle && diameter) { const d = sz(`(?:直径|ちょっけい|diameter)\\s*(?:は|が|を|:|of)?\\s*${DRAW_NUM}${DRAW_UNIT}`) ?? sz(DRAW_NUM + DRAW_UNIT); return d > 0 ? { cmd: 'draw', ops: [...ops, { op: 'circle', r: Math.round(d / 2 * 1e4) / 1e4 }] } : null; }
  const dirA = ja ? '([右左上下])(?![右左上下])\\s*(?:に|へ|方向に|方向へ|方向)?' : '\\b(right|left|up|down)\\b\\s*(?:by\\s*)?', dirB = ja ? '\\s*(?:だけ)?\\s*([右左上下])(?![右左上下])(?:に|へ|方向に|方向へ|方向)?' : '\\s*(?:to\\s*the\\s*)?\\b(right|left|up|down)\\b';
  const re = new RegExp(`${dirA}${DRAW_NUM}${DRAW_UNIT}|${DRAW_NUM}${DRAW_UNIT}${dirB}`, 'g'); let m, moves = 0;
  while ((m = re.exec(t))) { const A = m[1] !== undefined; ops.push({ op: 'move', dir: DRAW_DIR[A ? m[1] : m[6]], len: drawToMm(A ? m[2] : m[4], A ? m[3] : m[5]) }); moves++; }
  if (!moves) {   /* 「100ミリの線を右に引いて」：向きと数字が離れている→線の語があり、数字が1つ、向きが1つのときだけ */
    const lineW = ja ? /線|ライン/.test(t) : /\bline\b/.test(t), nums = [...t.matchAll(new RegExp(DRAW_NUM + DRAW_UNIT, 'g'))], dirs = ja ? [...t.matchAll(/[右左上下](?![右左上下])/g)].filter(x => !/左右|上下/.test(t.slice(Math.max(0, x.index - 1), x.index + 2))) : [...t.matchAll(/\b(right|left|up|down)\b/g)];
    if (lineW && nums.length === 1 && dirs.length === 1 && drawToMm(nums[0][1], nums[0][2]) > 0) { ops.push({ op: 'move', dir: DRAW_DIR[dirs[0][0]], len: drawToMm(nums[0][1], nums[0][2]) }); moves++; }
  }
  if (!moves) return null;
  if (ops.some(o => o.op === 'move' && !(o.len > 0))) return { cmd: 'draw', ops: [], need: 'moveLen' };
  if (ja ? /閉じ|とじ/.test(t) : /\bclose\b/.test(t)) ops.push({ op: 'close' });
  return { cmd: 'draw', ops };
}
/** 文が「描く言い方」か（数字つきの長方形・円・向きと長さ）：デザインの依頼と取り違えないための判定（「A5の長方形を作って」は描く言い方）。 */
export function voiceIsDraw(text, lang = 'ja') { return !!parseDraw(kanjiNumbersToArabic(normalizeVoice(text)), lang); }
/** 命令の説明ラベル（候補表示用）。 */
export function labelOf(result, lang) { if (result.tool) return (TOOL_WORDS[result.tool]?.[lang] || [result.tool])[0]; return (ACTION_WORDS[result.cmd]?.[lang] || [result.cmd])[0]; }
/** 認識文・言語・状態から命令を返す。確認が要る命令は confirm:true（state.pending があり「はい」なら confirmed:true で返す）。 */
export function parseVoice(text, lang = 'ja', state = {}) {
  const t = kanjiNumbersToArabic(normalizeVoice(text)); if (!t) return { free: '' };
  const isYes = YES[lang].some(w => t === w || t.startsWith(w + ' ')), isNo = NO[lang].some(w => t === w);
  if (state.pending) { if (isYes) return { ...state.pending, confirmed: true }; if (isNo) return { cmd: 'cancel', args: {} }; }
  else if (isYes) return { cmd: 'noop', args: {} };
  const drawn = parseDraw(t, lang); if (drawn) return drawn;   /* 長方形・正方形・直径の円・「右に100」・閉じる（数字つきで描ける言い方） */
  const nums = extractNumbers(t, lang);
  let action = findWord(ACTION_WORDS, t, lang), tool = findWord(TOOL_WORDS, t, lang);
  const longText = lang === 'ja' ? t.length > 12 : t.split(' ').length > 6; // 長い文で命令語が文頭にないものは自由文（AI 行き）
  if (longText) { if (action && action.i > 0) action = null; if (tool && tool.i > 0) tool = null; }
  if (action && (!tool || action.len >= tool.len)) {
    const def = ACTION_WORDS[action.key], args = {};
    if (action.key === 'zoom' || action.key === 'grid') { if (nums.value === undefined) return { ask: [{ cmd: 'zoomIn', args: {} }, { cmd: 'zoomOut', args: {} }, { cmd: 'fit', args: {} }].filter(x => action.key === 'zoom' || x.cmd === 'fit') }; args.value = nums.value; }
    return { cmd: action.key, args, ...(def.confirm ? { confirm: true } : {}) };
  }
  if (tool) {
    const args = {}; if (nums.value !== undefined) args.value = nums.value; if (nums.angle !== undefined) args.angle = nums.angle; if (nums.radius !== undefined) args.radius = nums.radius; if (nums.side) args.side = nums.side; if (nums.placement) args.placement = nums.placement;
    return { cmd: 'tool', tool: tool.key, args };
  }
  const cand = [...similar(TOOL_WORDS, t, lang).map(c => ({ cmd: 'tool', tool: c.key, args: {}, score: c.score })), ...similar(ACTION_WORDS, t, lang).map(c => ({ cmd: c.key, args: {}, score: c.score, ...(ACTION_WORDS[c.key].confirm ? { confirm: true } : {}) }))].sort((a, b) => b.score - a.score).slice(0, 3);
  if (cand.length && t.length <= 12) return { ask: cand.map(({ score, ...c }) => c) };
  return { free: String(text).trim() };
}
/** ヘルプ用：言語ごとの命令一覧（キー → 代表語）。 */
export function voiceCommandList(lang) { return { tools: Object.entries(TOOL_WORDS).map(([k, d]) => ({ key: k, words: d[lang] })), actions: Object.entries(ACTION_WORDS).map(([k, d]) => ({ key: k, words: d[lang], confirm: !!d.confirm })) }; }
