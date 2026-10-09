// 音声／テキスト命令の文法（純粋関数）。parseVoice(text, lang, state) → {cmd, args, confirm?} ／ {ask:[候補]} ／ {free:text}。
// state = {pending:{cmd,args}|null}（確認待ちの命令）。認識 API 自体はここに持たない（app.js が Web Speech API を呼ぶ）。
const TOOL_WORDS = {
  select: { ja: ['選択', 'せんたく', '矢印'], en: ['select', 'selection', 'arrow', 'pointer'] },
  line: { ja: ['直線', '線', 'ライン'], en: ['line', 'straight'] },
  circle: { ja: ['円', 'まる', '丸', 'サークル'], en: ['circle', 'round'] },
  arc: { ja: ['円弧', '弧', 'アーク'], en: ['arc'] },
  bezier: { ja: ['ベジェ', 'ベジエ', '曲線'], en: ['bezier', 'bézier', 'curve'] },
  path: { ja: ['ペン', 'パス'], en: ['pen', 'path'] },
  polyline: { ja: ['折れ線', 'おれせん', 'ポリライン'], en: ['polyline', 'polygon'] },
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
export function normalizeVoice(text) { return String(text || '').replace(/[Ａ-Ｚａ-ｚ０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[、。,.!！?？]/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim(); }
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
/** 命令の説明ラベル（候補表示用）。 */
export function labelOf(result, lang) { if (result.tool) return (TOOL_WORDS[result.tool]?.[lang] || [result.tool])[0]; return (ACTION_WORDS[result.cmd]?.[lang] || [result.cmd])[0]; }
/** 認識文・言語・状態から命令を返す。確認が要る命令は confirm:true（state.pending があり「はい」なら confirmed:true で返す）。 */
export function parseVoice(text, lang = 'ja', state = {}) {
  const t = normalizeVoice(text); if (!t) return { free: '' };
  const isYes = YES[lang].some(w => t === w || t.startsWith(w + ' ')), isNo = NO[lang].some(w => t === w);
  if (state.pending) { if (isYes) return { ...state.pending, confirmed: true }; if (isNo) return { cmd: 'cancel', args: {} }; }
  else if (isYes) return { cmd: 'noop', args: {} };
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
