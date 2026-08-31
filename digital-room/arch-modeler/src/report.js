// 木造壁量計算書（仕様規定検討書・参考様式）の帳票生成
// checkWallQuantity＋computeStructureの結果から確認申請様式に準じたHTML帳票を
// 別ウィンドウに生成し、ブラウザの印刷機能でPDF保存できるようにする
// ※あくまで設計検討用の参考資料。確認申請には建築士による検証・正規の図書作成が必要

const fmt = (v, d = 1) => v == null ? '－' : v.toFixed(d);
const cm = v => `${Math.round(v)}`;
const pct = r => r === Infinity ? '∞' : `${Math.round(r * 100)}%`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ROOF_LABEL = { none: 'なし', flat: '陸屋根', gable: '切妻', hip: '寄棟' };
const DIR_LABEL = { x: 'X方向（東西）', z: 'Z方向（南北）' };

/**
 * 計算書を別ウィンドウで開く
 * @param {object} state 共有状態（屋根情報の表示に使用）
 * @param {object} res checkWallQuantityの結果
 * @param {object} st computeStructureの結果（ecc/nvalues/beams/foundation）
 * @param {object} info {name, addr} 建物概要の入力値
 * @returns {boolean} ウィンドウを開けたか
 */
export function openWallReport(state, res, st, info) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(buildHtml(state, res, st, info));
  win.document.close();
  return true;
}

function buildHtml(state, res, st, info) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const roof = state.roof ?? { type: 'none' };
  const m = res.meta;
  const f = st.foundation;

  // 総合判定: 壁量・四分割・偏心率・基礎
  let wallOk = true, quarterOk = true;
  for (const s of res.stories) for (const dir of ['x', 'z']) {
    if (!s.dirs[dir].ok) wallOk = false;
    if (s.quarters[dir] && !s.quarters[dir].ok) quarterOk = false;
  }
  const eccOk = st.ecc.every(e => e.error || (e.okX && e.okZ));
  const foundOk = f.okStrip || f.okMat;
  const allOk = wallOk && quarterOk && eccOk && foundOk;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>木造構造検討書（参考）</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Meiryo", "Yu Gothic", sans-serif; color: #2b3440; font-size: 11px;
         max-width: 178mm; margin: 0 auto; line-height: 1.6; }
  h1 { font-size: 20px; color: #1a4f8b; text-align: center; margin: 24px 0 4px;
       border-bottom: 3px double #1a4f8b; padding-bottom: 8px; }
  .subtitle { text-align: center; color: #b07c10; font-weight: bold; margin-bottom: 16px; }
  h2 { font-size: 14px; color: #fff; background: #1a4f8b; padding: 4px 10px;
       margin: 22px 0 8px; border-radius: 3px; }
  h3 { font-size: 12px; color: #1a4f8b; border-left: 4px solid #e8a020;
       padding-left: 6px; margin: 14px 0 6px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  th, td { border: 1px solid #9aa8b8; padding: 3px 6px; font-size: 11px; }
  th { background: #e8eef5; color: #1a4f8b; font-weight: bold; text-align: center; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.ctr { text-align: center; }
  .ok { color: #2e7d32; font-weight: bold; }
  .ng { color: #c62828; font-weight: bold; }
  .warn-box { border: 2px solid #c62828; background: #fdf0f0; color: #b03030;
              padding: 10px 14px; margin: 14px 0; font-weight: bold; border-radius: 4px; }
  .note { font-size: 10px; color: #5a6a7e; }
  .pagebreak { page-break-before: always; }
  .toolbar { text-align: center; margin: 14px 0; }
  .toolbar button { font-size: 14px; padding: 8px 24px; background: #1a4f8b; color: #fff;
                    border: none; border-radius: 4px; cursor: pointer; }
  svg { display: block; margin: 8px auto; }
  .legend { font-size: 10px; text-align: center; color: #5a6a7e; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>

<div class="toolbar"><button onclick="window.print()">🖨 印刷 / PDF保存</button></div>

<h1>木造構造検討書</h1>
<div class="subtitle">— 壁量・四分割法・偏心率・N値計算・横架材・基礎の検討（参考様式） —</div>

<div class="warn-box">
本検討書はアプリによる簡易計算の参考資料です。確認申請に使用するには、建築士による
入力条件・計算結果の検証と、正規の設計図書としての作成・記名が必要です。
N値計算・偏心率・横架材・基礎の各章は簡易法・略算によるもので、詳細条件により結果が変わります。
</div>

<h2>1. 建物概要</h2>
<table>
  <tr><th style="width:24%">建物名称</th><td>${esc(info.name) || '－'}</td>
      <th style="width:24%">作成日</th><td>${dateStr}</td></tr>
  <tr><th>所在地</th><td>${esc(info.addr) || '－'}</td>
      <th>構造・階数</th><td>木造軸組工法・${m.n}階建て</td></tr>
  <tr><th>屋根</th><td>${ROOF_LABEL[roof.type] ?? roof.type}${roof.type !== 'none' && roof.type !== 'flat' ? `（勾配${roof.pitch}°・軒の出${roof.overhang}m）` : ''}
      重さ区分: ${m.roofWeight === 'heavy' ? '重い屋根（瓦等）' : '軽い屋根（金属・スレート等）'}</td>
      <th>採用壁倍率</th><td>${m.wallRatio}（全壁一律）</td></tr>
  <tr><th>地耐力</th><td>${f.soil} kN/㎡（長期許容・設定値）</td>
      <th>床面積</th><td>${res.stories.map(s => `${s.name}: ${fmt(s.area)}㎡`).join('　')}　延べ ${fmt(f.totalFloor)}㎡</td></tr>
</table>
<p class="note">※床面積は壁芯外形矩形による近似値（凹型平面では過大＝安全側の評価）。</p>

<h2>2. 地震力に対する必要壁量</h2>
<table>
  <tr><th>階</th><th>床面積 A (㎡)</th><th>係数 c (cm/㎡)</th><th>必要壁量 A×c (cm)</th></tr>
  ${res.stories.map(s => `<tr><td class="ctr">${s.name}</td><td class="num">${fmt(s.area)}</td>
    <td class="num">${s.coef}</td><td class="num">${cm(s.coef * s.area)}</td></tr>`).join('')}
</table>
<p class="note">係数は令46条表2による（${m.n}階建て・${m.roofWeight === 'heavy' ? '重い屋根' : '軽い屋根'}）。</p>

<h2>3. 風圧力に対する必要壁量</h2>
${res.stories.map(s => ['x', 'z'].map(dir => {
  const fc = s.dirs[dir].facade;
  return `<h3>${s.name} ${DIR_LABEL[dir]}（見付面積の内訳）</h3>
<table>
  <tr><th>部位</th><th>幅 (m)</th><th>高さ (m)</th><th>面積 (㎡)</th></tr>
  ${fc.rows.map(r => `<tr><td class="ctr">${r.label}</td><td class="num">${fmt(r.w, 2)}</td>
    <td class="num">${fmt(r.h, 2)}</td><td class="num">${fmt(r.area, 2)}</td></tr>`).join('')}
  <tr><th colspan="3">見付面積合計 S</th><td class="num">${fmt(fc.total, 2)}</td></tr>
  <tr><th colspan="3">必要壁量 S×50 (cm)</th><td class="num">${cm(s.dirs[dir].reqWind)}</td></tr>
</table>`;
}).join('')).join('')}
<p class="note">見付面積は対象階の床面＋1.35mより上の立面投影面積（上階壁面・屋根を含む）。係数50cm/㎡（特定行政庁指定区域では割増あり・未考慮）。</p>

<h2 class="pagebreak">4. 存在壁量（耐力壁の内訳）</h2>
${res.stories.map(s => `<h3>${s.name}</h3>
<table>
  <tr><th>壁番号</th><th>方向</th><th>全長 (m)</th><th>開口計 (m)</th><th>有効長 (m)</th><th>倍率</th><th>壁量 (cm)</th></tr>
  ${s.wallRows.map(r => `<tr><td class="ctr">${r.no}</td><td class="ctr">${r.dirLabel}</td>
    <td class="num">${fmt(r.len, 2)}</td><td class="num">${fmt(r.openSum, 2)}</td>
    <td class="num">${r.dir ? fmt(r.effSum, 2) : '対象外'}</td>
    <td class="num">${r.dir ? m.wallRatio : '－'}</td><td class="num">${r.dir ? cm(r.amount) : '－'}</td></tr>`).join('')}
  <tr><th colspan="6">X方向 合計</th><td class="num">${cm(s.dirs.x.exist)}</td></tr>
  <tr><th colspan="6">Z方向 合計</th><td class="num">${cm(s.dirs.z.exist)}</td></tr>
</table>`).join('')}
<p class="note">有効長は開口部（窓・ドア）を除いた長さ0.9m以上の壁区間の合計。垂れ壁・腰壁は耐力壁に算入しない。</p>

<h2>5. 壁量判定</h2>
<table>
  <tr><th>階</th><th>方向</th><th>存在壁量 (cm)</th><th>必要壁量 地震 (cm)</th><th>必要壁量 風 (cm)</th><th>判定用必要壁量 (cm)</th><th>充足率</th><th>判定</th></tr>
  ${res.stories.map(s => ['x', 'z'].map(dir => {
    const d = s.dirs[dir];
    return `<tr><td class="ctr">${s.name}</td><td class="ctr">${DIR_LABEL[dir]}</td>
      <td class="num">${cm(d.exist)}</td><td class="num">${cm(d.reqQuake)}</td>
      <td class="num">${cm(d.reqWind)}</td><td class="num">${cm(d.req)}</td>
      <td class="num">${pct(d.ratio)}</td>
      <td class="ctr ${d.ok ? 'ok' : 'ng'}">${d.ok ? '適合' : '不適合'}</td></tr>`;
  }).join('')).join('')}
</table>

<h2>6. 四分割法による壁配置の検討</h2>
<table>
  <tr><th>階</th><th>方向</th><th>側端部</th><th>存在壁量 (cm)</th><th>必要壁量 (cm)</th><th>充足率</th><th>壁率比</th><th>判定</th></tr>
  ${res.stories.map(s => ['x', 'z'].map(dir => {
    const q = s.quarters[dir];
    if (!q) return '';
    const sideNames = dir === 'x' ? ['北側', '南側'] : ['西側', '東側'];
    return `<tr><td class="ctr" rowspan="2">${s.name}</td><td class="ctr" rowspan="2">${DIR_LABEL[dir]}</td>
      <td class="ctr">${sideNames[0]}1/4</td><td class="num">${cm(q.e1)}</td><td class="num">${cm(q.need)}</td><td class="num">${pct(q.r1)}</td>
      <td class="num ctr" rowspan="2">${q.balance === Infinity ? '－' : q.balance.toFixed(2)}</td>
      <td class="ctr ${q.ok ? 'ok' : 'ng'}" rowspan="2">${q.ok ? '適合' : '不適合'}</td></tr>
    <tr><td class="ctr">${sideNames[1]}1/4</td><td class="num">${cm(q.e2)}</td><td class="num">${cm(q.need)}</td><td class="num">${pct(q.r2)}</td></tr>`;
  }).join('')).join('')}
</table>
<p class="note">両側端部の充足率がともに1.0以上、または壁率比（小／大）が0.5以上で適合。</p>

<h2 class="pagebreak">7. 偏心率の検討</h2>
<table>
  <tr><th>階</th><th>方向</th><th>重心 (m)</th><th>剛心 (m)</th><th>偏心距離 e (m)</th><th>弾力半径 re (m)</th><th>偏心率 Re</th><th>判定 (≦0.3)</th></tr>
  ${st.ecc.map(e => e.error
    ? `<tr><td class="ctr">${e.name}</td><td colspan="7" class="ctr">${e.error}</td></tr>`
    : `<tr><td class="ctr" rowspan="2">${e.name}</td><td class="ctr">X方向（Z軸まわり）</td>
        <td class="num">Zg=${fmt(e.Zg, 2)}</td><td class="num">Zr=${fmt(e.Zr, 2)}</td>
        <td class="num">${fmt(e.ey, 2)}</td><td class="num">${fmt(e.rex, 2)}</td>
        <td class="num">${fmt(e.Rex, 3)}</td><td class="ctr ${e.okX ? 'ok' : 'ng'}">${e.okX ? '適合' : '不適合'}</td></tr>
      <tr><td class="ctr">Z方向（X軸まわり）</td>
        <td class="num">Xg=${fmt(e.Xg, 2)}</td><td class="num">Xr=${fmt(e.Xr, 2)}</td>
        <td class="num">${fmt(e.ex, 2)}</td><td class="num">${fmt(e.rez, 2)}</td>
        <td class="num">${fmt(e.Rez, 3)}</td><td class="ctr ${e.okZ ? 'ok' : 'ng'}">${e.okZ ? '適合' : '不適合'}</td></tr>`
  ).join('')}
</table>
<p class="note">剛心は耐力壁剛性（長さ×倍率）の重み付き平均位置、重心は床面の図心（部屋検出による）。
座標は図面原点基準。品確法の性能表示では偏心率0.3以下（耐震等級2・3では0.15以下が目安）。</p>

<h2>8. N値計算（柱頭柱脚接合金物）</h2>
${st.nvalues.map(nv => `<h3>${nv.name}</h3>
<table>
  <tr><th>柱</th><th>位置 x,z (m)</th><th>出隅</th><th>A1（当該階倍率差）</th><th>A2（上階倍率差）</th><th>N値</th><th>金物（告示1460号）</th></tr>
  ${nv.rows.map(r => `<tr><td class="ctr">${r.no}</td>
    <td class="ctr">${fmt(r.x, 2)}, ${fmt(r.z, 2)}</td>
    <td class="ctr">${r.corner ? '○' : '－'}</td>
    <td class="num">${fmt(r.A1, 1)}</td><td class="num">${fmt(r.A2, 1)}</td>
    <td class="num">${fmt(r.N, 2)}</td>
    <td>(${r.sym}) ${r.hwName}</td></tr>`).join('')}
</table>`).join('')}
<p class="note">N = A1×B1 ＋ A2×B2 − L（B1,B2: 一般0.5/出隅0.8、L: 最上階0.6/出隅0.4・その他の階1.6/出隅1.0）。
柱は耐力壁有効区間の端部に立つものとして抽出した簡易計算（管柱・通し柱の区別、実際の柱割りは未考慮）。
壁倍率は全壁一律のため、実仕様での倍率差により結果が変わります。</p>

<h2 class="pagebreak">9. 横架材（梁せい）の目安</h2>
<table>
  <tr><th>部屋</th><th>内法 (m)</th><th>短辺スパン (m)</th><th>部位</th><th>梁せい目安</th></tr>
  ${st.beams.map(b => `<tr><td class="ctr">${b.room}</td>
    <td class="ctr">${fmt(b.w, 1)} × ${fmt(b.d, 1)}</td>
    <td class="num">${fmt(b.span, 2)}</td><td class="ctr">${b.kind}</td>
    <td class="ctr ${b.ok ? '' : 'ng'}">${b.depth}</td></tr>`).join('')}
</table>
<p class="note">部屋の短辺方向に梁を架ける想定のスパン表目安（梁幅105mm・梁間隔910mm・無等級材・住宅の床荷重相当）。
実際の梁せいは梁間隔・荷重条件・樹種等級により異なるため、プレカット業者または構造設計者の検定が必要。</p>

<h2>10. 基礎の検討（接地圧）</h2>
<table>
  <tr><th>項目</th><th>値</th><th>備考</th></tr>
  <tr><td>概算建物重量 W</td><td class="num">${fmt(f.W, 0)} kN</td><td>延床${fmt(f.totalFloor, 1)}㎡ × ${f.unit} kN/㎡（固定＋積載＋基礎自重の概算）</td></tr>
  <tr><td>布基礎 接地圧</td><td class="num">${fmt(f.qStrip, 1)} kN/㎡</td><td>1F壁下 総延長${fmt(f.wallLen, 1)}m × 底盤幅${f.stripW * 1000}mm</td></tr>
  <tr><td>べた基礎 接地圧</td><td class="num">${fmt(f.qMat, 1)} kN/㎡</td><td>建築面積 ${fmt(f.W / f.qMat, 1)}㎡ で支持</td></tr>
  <tr><td>地耐力（設定）</td><td class="num">${f.soil} kN/㎡</td><td>長期許容応力度</td></tr>
  <tr><td>判定</td>
      <td class="ctr ${f.okStrip ? 'ok' : (f.okMat ? 'ok' : 'ng')}">布基礎: ${f.okStrip ? '適合' : '不適合'}　べた基礎: ${f.okMat ? '適合' : '不適合'}</td>
      <td class="${f.okStrip || f.okMat ? 'ok' : 'ng'}">${f.recommend}</td></tr>
</table>
<p class="note">建物重量は概算係数による略算。実際の基礎設計は地盤調査（SWS試験等）に基づき、
基礎形式・配筋・底盤幅を決定すること。地耐力20kN/㎡未満はべた基礎でも沈下検討が必要（令38条・告示1347号）。</p>

<h2 class="pagebreak">11. 耐力壁配置図</h2>
${res.stories.map((s, i) => `<h3>${s.name}</h3>${planSvg(s, st.ecc[i])}`).join('')}
<div class="legend">■ <span style="color:#1a4f8b">青＝X方向の耐力壁（有効区間）</span>
■ <span style="color:#2e7d32">緑＝Z方向の耐力壁（有効区間）</span>
グレー＝壁（開口部は白抜き）　点線＝四分割線
<span style="color:#2e7d32">●G＝重心</span>　<span style="color:#c62828">●K＝剛心</span></div>

<h2>12. 総合判定・注記</h2>
<table>
  <tr><th>検討項目</th><th>判定</th></tr>
  <tr><td>壁量（地震力・風圧力）</td><td class="ctr ${wallOk ? 'ok' : 'ng'}">${wallOk ? '適合' : '不適合'}</td></tr>
  <tr><td>四分割法（壁配置バランス）</td><td class="ctr ${quarterOk ? 'ok' : 'ng'}">${quarterOk ? '適合' : '不適合'}</td></tr>
  <tr><td>偏心率（Re≦0.3）</td><td class="ctr ${eccOk ? 'ok' : 'ng'}">${eccOk ? '適合' : '不適合'}</td></tr>
  <tr><td>基礎（接地圧）</td><td class="ctr ${foundOk ? 'ok' : 'ng'}">${foundOk ? '適合' : '不適合'}</td></tr>
  <tr><td>N値計算・横架材</td><td class="ctr">選定結果・目安を8章・9章に記載</td></tr>
</table>
<p style="font-size:14px" class="${allOk ? 'ok' : 'ng'}">
総合判定: ${allOk ? '適合 — 各検討項目とも基準値を満たしています' : '不適合 — 不足箇所があります（各章の「不適合」欄を参照）'}
</p>
<ul class="note">
  <li>本計算はアプリ内の壁データに基づく簡易計算であり、結果の正確性は入力に依存します。</li>
  <li>壁倍率は全壁一律の仮定値です。実際は耐力壁の仕様（筋かい・面材の種別）ごとに告示の倍率を適用してください。</li>
  <li>N値計算は耐力壁端部柱のみの簡易抽出です。全柱の検定・通し柱の検討は別途必要です。</li>
  <li>横架材は短辺スパンによる表引きの目安、基礎は概算重量による接地圧チェックのみです。</li>
  <li>風圧力係数は一般区域の50cm/㎡を使用。特定行政庁が指定する強風区域では割増が必要です。</li>
  <li>確認申請に使用するには建築士による検証・正規図書の作成が必要です。</li>
</ul>

</body>
</html>`;
}

/** 階の耐力壁配置図SVGを生成する（重心G・剛心Kマーカー付き） */
function planSvg(s, ecc) {
  const b = s.bbox;
  const pad = 0.8;
  const w = (b.maxX - b.minX) + pad * 2, h = (b.maxZ - b.minZ) + pad * 2;
  const scale = Math.min(560 / w, 360 / h);
  const W = Math.round(w * scale), H = Math.round(h * scale);
  const X = x => ((x - b.minX + pad) * scale).toFixed(1);
  const Y = z => ((z - b.minZ + pad) * scale).toFixed(1);

  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #c0c9d4">`;

  // 四分割線（点線）
  for (let q = 1; q <= 3; q++) {
    const gx = b.minX + (b.maxX - b.minX) * q / 4;
    const gz = b.minZ + (b.maxZ - b.minZ) * q / 4;
    svg += `<line x1="${X(gx)}" y1="${Y(b.minZ - 0.3)}" x2="${X(gx)}" y2="${Y(b.maxZ + 0.3)}" stroke="#c8a050" stroke-width="0.8" stroke-dasharray="4 3"/>`;
    svg += `<line x1="${X(b.minX - 0.3)}" y1="${Y(gz)}" x2="${X(b.maxX + 0.3)}" y2="${Y(gz)}" stroke="#c8a050" stroke-width="0.8" stroke-dasharray="4 3"/>`;
  }

  // 壁（グレー）と開口（白抜き）
  for (const w2 of s.walls) {
    const t = Math.max(2, w2.thickness * scale);
    svg += `<line x1="${X(w2.x1)}" y1="${Y(w2.y1)}" x2="${X(w2.x2)}" y2="${Y(w2.y2)}" stroke="#aab4c0" stroke-width="${t.toFixed(1)}"/>`;
    const len = Math.hypot(w2.x2 - w2.x1, w2.y2 - w2.y1);
    if (len < 0.01) continue;
    const ux = (w2.x2 - w2.x1) / len, uz = (w2.y2 - w2.y1) / len;
    for (const o of w2.openings) {
      const a = o.offset - o.width / 2, c = o.offset + o.width / 2;
      svg += `<line x1="${X(w2.x1 + ux * a)}" y1="${Y(w2.y1 + uz * a)}" x2="${X(w2.x1 + ux * c)}" y2="${Y(w2.y1 + uz * c)}" stroke="#ffffff" stroke-width="${(t + 1).toFixed(1)}"/>`;
    }
  }

  // 有効区間（耐力壁）の色付け
  for (const dir of ['x', 'z']) {
    const color = dir === 'x' ? '#1a4f8b' : '#2e7d32';
    for (const seg of s.segs[dir]) {
      const l = seg.line;
      svg += `<line x1="${X(l.x1)}" y1="${Y(l.y1)}" x2="${X(l.x2)}" y2="${Y(l.y2)}" stroke="${color}" stroke-width="4" stroke-linecap="butt"/>`;
    }
  }

  // 壁番号ラベル
  for (const r of s.wallRows) {
    const mx = (r.x1 + r.x2) / 2, mz = (r.y1 + r.y2) / 2;
    const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1) || 1;
    const nx = -(r.y2 - r.y1) / len, nz = (r.x2 - r.x1) / len;
    svg += `<text x="${X(mx + nx * 0.35)}" y="${Y(mz + nz * 0.35)}" font-size="10" fill="#b07c10" text-anchor="middle" font-family="Meiryo,sans-serif">${r.no}</text>`;
  }

  // 重心G・剛心Kマーカー
  if (ecc && !ecc.error) {
    svg += `<circle cx="${X(ecc.Xg)}" cy="${Y(ecc.Zg)}" r="6" fill="#2e7d32" fill-opacity="0.85"/>`;
    svg += `<text x="${X(ecc.Xg)}" y="${(parseFloat(Y(ecc.Zg)) + 3.5).toFixed(1)}" font-size="9" fill="#fff" text-anchor="middle" font-weight="bold">G</text>`;
    svg += `<circle cx="${X(ecc.Xr)}" cy="${Y(ecc.Zr)}" r="6" fill="#c62828" fill-opacity="0.85"/>`;
    svg += `<text x="${X(ecc.Xr)}" y="${(parseFloat(Y(ecc.Zr)) + 3.5).toFixed(1)}" font-size="9" fill="#fff" text-anchor="middle" font-weight="bold">K</text>`;
  }

  // 方位
  svg += `<text x="14" y="18" font-size="12" fill="#1a4f8b" font-weight="bold" font-family="Meiryo,sans-serif">N↑</text>`;
  svg += `</svg>`;
  return svg;
}
