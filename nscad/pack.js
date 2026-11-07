/* 用紙に詰める計算（長方形・回転なし）。事業主 2026-11-08「選択した図形を、印刷時に余白を作らないように最適な配置にする（複製して配置）機能が欲しい。共有できる直線は重ねて統合」。
   部品（つながった図形のまとまり）を、外接の長方形として、すき間 gap で詰める。gap = 0 なら、辺がぴったり接する（直線の辺は、あとで1本に統合できる）。
   方法：MaxRects（Best Short Side Fit）。向きを変えない（革の目の向きを守る）。順番を変えて何通りか試し、入った最初のものを使う。DOM・図面に依存しない（試験できる）。 */
const PK_EPS = 1e-9;
const pkContains = (a, b) => b.x >= a.x - PK_EPS && b.y >= a.y - PK_EPS && b.x + b.w <= a.x + a.w + PK_EPS && b.y + b.h <= a.y + a.h + PK_EPS;
/** 1通りの順番で置く。items は、すき間ぶん大きくした {id, w, h}。入りきらなければ null、入れば [{ id, x, y }]。 */
function pkPlaceInOrder(items, W, H) {
  let free = [{ x: 0, y: 0, w: W, h: H }]; const placed = [];
  for (const it of items) {
    let best = null;
    for (const f of free) {
      if (it.w > f.w + PK_EPS || it.h > f.h + PK_EPS) continue;
      const lw = f.w - it.w, lh = f.h - it.h, short = Math.min(lw, lh), long = Math.max(lw, lh);
      const better = !best || short < best.short - PK_EPS || (Math.abs(short - best.short) <= PK_EPS && (long < best.long - PK_EPS || (Math.abs(long - best.long) <= PK_EPS && (f.y < best.y - PK_EPS || (Math.abs(f.y - best.y) <= PK_EPS && f.x < best.x - PK_EPS)))));
      if (better) best = { x: f.x, y: f.y, short, long };
    }
    if (!best) return null;
    placed.push({ id: it.id, x: best.x, y: best.y });
    const u = { x: best.x, y: best.y, w: it.w, h: it.h }, next = [];
    for (const f of free) {
      if (!(u.x < f.x + f.w - PK_EPS && u.x + u.w > f.x + PK_EPS && u.y < f.y + f.h - PK_EPS && u.y + u.h > f.y + PK_EPS)) { next.push(f); continue; }
      if (u.x > f.x + PK_EPS) next.push({ x: f.x, y: f.y, w: u.x - f.x, h: f.h });
      if (u.x + u.w < f.x + f.w - PK_EPS) next.push({ x: u.x + u.w, y: f.y, w: f.x + f.w - u.x - u.w, h: f.h });
      if (u.y > f.y + PK_EPS) next.push({ x: f.x, y: f.y, w: f.w, h: u.y - f.y });
      if (u.y + u.h < f.y + f.h - PK_EPS) next.push({ x: f.x, y: u.y + u.h, w: f.w, h: f.y + f.h - u.y - u.h });
    }
    free = next.filter((a, i) => !next.some((b, j) => i !== j && pkContains(b, a) && (!pkContains(a, b) || j < i)));   /* 別の空きに含まれる空きは捨てる（同じ空きは1つだけ残す） */
  }
  return placed;
}
const PK_ORDERS = [
  (p, q) => q.h - p.h || q.w - p.w,                         // 高い順
  (p, q) => q.w * q.h - p.w * p.h || q.h - p.h,             // 面積の大きい順
  (p, q) => Math.max(q.w, q.h) - Math.max(p.w, p.h) || q.w * q.h - p.w * p.h,   // 長い辺の大きい順
  (p, q) => q.w - p.w || q.h - p.h,                         // 幅の広い順
];
/** 長方形 rects（{ id, w, h }）を、W×H の枠に、すき間 gap で詰める（回転なし）。入れば [{ id, x, y }]（x・y は枠の左上から）、入りきらなければ null。 */
export function packRects(rects, W, H, gap = 0) {
  if (!rects.length) return [];
  const items = rects.map(r => ({ id: r.id, w: r.w + gap, h: r.h + gap }));   // すき間ぶん大きくして、枠も同じだけ大きくする（枠の縁にはすき間を作らない）
  for (const cmp of PK_ORDERS) { const out = pkPlaceInOrder([...items].sort(cmp), W + gap, H + gap); if (out) return out; }
  return null;
}
/** 1セット（items）を n セット、1枚の枠に詰める。入れば [{ itemId, copy, x, y }]、入らなければ null。 */
function pkFitSets(items, n, W, H, gap) {
  const rects = []; for (let c = 0; c < n; c++) for (const it of items) rects.push({ id: c + '|' + it.id, w: it.w, h: it.h, itemId: it.id, copy: c });
  const out = packRects(rects, W, H, gap); if (!out) return null;
  const meta = new Map(rects.map(r => [r.id, r])); return out.map(p => ({ itemId: meta.get(p.id).itemId, copy: meta.get(p.id).copy, x: p.x, y: p.y }));
}
/** 1枚に入る最大のセット数（0 なら、1セットも入らない）。 */
function pkMaxSets(items, W, H, gap) {
  if (!pkFitSets(items, 1, W, H, gap)) return 0;
  let lo = 1, hi = 2; while (hi <= 400 && pkFitSets(items, hi, W, H, gap)) { lo = hi; hi *= 2; }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pkFitSets(items, mid, W, H, gap)) lo = mid; else hi = mid; }
  while (lo < 400 && pkFitSets(items, lo + 1, W, H, gap)) lo++;   // 順番の相性で、あと1セット入ることがある
  return lo;
}
/** 部品を、1枚に収まらないとき：入る枚に、順に振り分ける（大きい順に、入る最初の枚へ）。 */
function pkSpread(rects, W, H, gap) {
  const sheets = [], sorted = [...rects].sort((p, q) => q.w * q.h - p.w * p.h);
  for (const r of sorted) {
    let done = false;
    for (const sh of sheets) { const out = packRects([...sh.rects, r], W, H, gap); if (out) { sh.rects.push(r); sh.pos = out; done = true; break; } }
    if (!done) sheets.push({ rects: [r], pos: packRects([r], W, H, gap) });
  }
  return sheets.map(sh => { const meta = new Map(sh.rects.map(r => [r.id, r])); return sh.pos.map(p => ({ itemId: meta.get(p.id).itemId, copy: meta.get(p.id).copy, x: p.x, y: p.y })); });
}
/**
 * 選んだ部品（items＝[{ id, w, h }]・外接の長方形の幅と高さ mm）を、用紙に詰めてコピーする計画を作る（回転なし）。
 *  sheetW×sheetH：用紙（mm・向きは orient で決まる）／margin：印刷余白（四辺）／gap：部品どうしのすき間（0 なら辺がぴったり接する）／copies：作るセット数（null＝1枚に入るだけ）／orient：'auto'（縦・横を試して良い方）・'portrait'・'landscape'。
 *  戻り値 { ok:true, orient, sheetW, sheetH, margin, gap, perSheet（1枚に入るセット数・0＝1セットが1枚に入らず分けた）, sets（全部のセット数）, sheets:[[{ itemId, copy, x, y }]]（x・y は用紙の左上から・余白込み）, usage（印刷できる範囲の使用率 0〜1） }
 *  または { ok:false, reason:'empty' | 'tooBig', tooBig:[id] }。 */
export function packSets(items, sheetW, sheetH, { margin = 0, gap = 0, copies = null, orient = 'auto' } = {}) {
  if (!items.length) return { ok: false, reason: 'empty', tooBig: [] };
  const want = copies && copies > 0 ? Math.floor(copies) : null, tries = [];
  let bigAll = null;
  for (const o of orient === 'auto' ? ['portrait', 'landscape'] : [orient]) {
    const SW = o === 'portrait' ? Math.min(sheetW, sheetH) : Math.max(sheetW, sheetH), SH = o === 'portrait' ? Math.max(sheetW, sheetH) : Math.min(sheetW, sheetH), W = SW - 2 * margin, H = SH - 2 * margin;
    if (W <= 0 || H <= 0) { bigAll = bigAll || items.map(i => i.id); continue; }
    const big = items.filter(it => it.w > W + PK_EPS || it.h > H + PK_EPS); if (big.length) { bigAll = bigAll && bigAll.length <= big.length ? bigAll : big.map(i => i.id); continue; }
    const per = pkMaxSets(items, W, H, gap); let sheets;
    if (per >= 1) {
      const total = want ?? per, n = Math.ceil(total / per); sheets = [];
      for (let k = 0; k < n; k++) { const here = Math.min(per, total - k * per), plan = pkFitSets(items, here, W, H, gap); sheets.push(plan.map(p => ({ ...p, copy: p.copy + k * per }))); }
    } else {
      const rects = []; for (let c = 0; c < (want ?? 1); c++) for (const it of items) rects.push({ id: c + '|' + it.id, w: it.w, h: it.h, itemId: it.id, copy: c });
      sheets = pkSpread(rects, W, H, gap);
    }
    const total = want ?? Math.max(per, 1), area = sheets.reduce((a, sh) => a + sh.reduce((b, p) => { const it = items.find(i => i.id === p.itemId); return b + it.w * it.h; }, 0), 0);
    tries.push({ ok: true, orient: o, sheetW: SW, sheetH: SH, margin, gap, perSheet: per, sets: total, sheets: sheets.map(sh => sh.map(p => ({ ...p, x: p.x + margin, y: p.y + margin }))), usage: area / (sheets.length * W * H) });
  }
  if (!tries.length) return { ok: false, reason: 'tooBig', tooBig: bigAll || [] };
  tries.sort((p, q) => (want ? p.sheets.length - q.sheets.length : q.perSheet - p.perSheet || p.sheets.length - q.sheets.length) || q.usage - p.usage);   // 縦・横のうち、枚数が少ない／1枚に多く入る／使用率の高い方
  return tries[0];
}
