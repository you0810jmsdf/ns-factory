// 定型句：よく使う文（複数行）を名前付きでこの PC のブラウザに保存し、クリックした位置に 1 行ずつ文字図形として置く。純粋関数。画面は app.js。
export const PHRASES_KEY = 'leather-cad.phrases';
export const PHRASE_MAX_LINES = 20;
export const PHRASE_LINE_GAP = 1.4;   /* 行間 ＝ 文字サイズ × 1.4 */

/** 保存文字列を読み戻す。壊れていれば空の一覧。 */
export function parsePhrases(text) {
  let j; try { j = JSON.parse(text); } catch { return []; }
  if (!j || j.v !== 1 || !Array.isArray(j.items)) return [];
  return j.items.filter(p => p && typeof p.name === 'string' && p.name.trim() && typeof p.text === 'string').map(p => ({ name: p.name.trim(), text: p.text }));
}
export function serializePhrases(items) { return JSON.stringify({ v: 1, items: items.map(p => ({ name: p.name, text: p.text })) }); }

/** 名前が同じものは置き換え、無ければ末尾に足す。名前が空なら本文の 1 行目を名前にする。入力は変えない。 */
export function upsertPhrase(items, name, text) {
  const lines = phraseLines(text); if (!lines.some(Boolean)) throw new Error('empty');
  const n = String(name || '').trim() || lines.find(Boolean).slice(0, 20);
  const out = items.map(p => ({ ...p })), i = out.findIndex(p => p.name === n);
  if (i >= 0) out[i] = { name: n, text }; else out.push({ name: n, text });
  return { items: out, name: n };
}
export function removePhrase(items, name) { return items.filter(p => p.name !== name); }

/** 本文を行に分ける（右端の空白を落とし、末尾の空行は捨てる。途中の空行は残して行間だけ空ける）。上限 20 行。 */
export function phraseLines(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\s+$/, ''));
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.slice(0, PHRASE_MAX_LINES);
}

/** クリックした位置 at（1 行目の左下）から下へ、1 行ずつ文字図形を作る。空行は図形を作らず行間だけ空ける。 */
export function phraseShapes(lines, at, sizeMm, layer, gap = PHRASE_LINE_GAP) {
  const out = [];
  lines.forEach((text, i) => { if (!text) return; out.push({ type: 'text', layer, x: at.x, y: at.y + i * sizeMm * gap, text, sizeMm, angleDeg: 0 }); });
  return out;
}

/** 読み込んだ一覧を今の一覧に合流する（同じ名前は置き換え・新しい名前は末尾に）。{ items, added, replaced }。 */
export function mergePhrases(items, incoming) {
  const out = items.map(p => ({ ...p })); let added = 0, replaced = 0;
  for (const p of incoming) { const i = out.findIndex(q => q.name === p.name); if (i >= 0) { out[i] = { name: p.name, text: p.text }; replaced++; } else { out.push({ name: p.name, text: p.text }); added++; } }
  return { items: out, added, replaced };
}
