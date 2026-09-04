/* Offline workshop record: quote and its immutable calculation snapshot in one file. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function save(snapshot) {
    if (!snapshot?.selection.brandId || !snapshot?.selection.sizeId || !snapshot?.curve) {
      alert('構造とサイズを選択し、工数曲線を読み込んでから保存してください。'); return;
    }
    const name = prompt('見積書とカーブを紐付ける管理名（お客様名・見積番号など）', '');
    if (name === null) return;
    if (!name.trim()) { alert('管理名を入力してください。'); return; }
    const record = JSON.parse(JSON.stringify({ version: 1, savedAt: new Date().toISOString(), managementName: name.trim(), ...snapshot }));
    const points = record.curve;
    const xmax = Math.max(...points.map(p => p.area), record.calculation.productionArea) * 1.1;
    const ymax = Math.max(1, ...points.map(p => p.hours), record.calculation.totalHours) * 1.1;
    const sx = x => 60 + x / xmax * 620, sy = y => 265 - y / ymax * 235;
    let d = '';
    for (let i = 0; i <= 240; i++) { const x = xmax * i / 240; d += `${i ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(NSFLaborCurveModel.evaluate(points, x)).toFixed(2)}`; }
    const graph = `<svg viewBox="0 0 720 310" role="img" aria-label="保存時の工数曲線"><path d="M60,30V265H680" fill="none" stroke="#777"/><text x="10" y="20">工数 h</text><text x="550" y="300">革面積 ds</text><path d="${d}" fill="none" stroke="#986429" stroke-width="3"/>${points.map(p => `<circle cx="${sx(p.area)}" cy="${sy(p.hours)}" r="5" fill="#986429"/>`).join('')}<circle cx="${sx(record.calculation.productionArea)}" cy="${sy(record.calculation.totalHours)}" r="8" fill="#21625c"/></svg>`;
    const coefficients = NSFLaborCurveModel.segments(points);
    record.coefficients = coefficients;
    const json = JSON.stringify(record, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>見積控え ${esc(name)}</title>
<style>body{font:15px/1.6 system-ui,sans-serif;color:#302419;max-width:900px;margin:30px auto;padding:0 20px}h1{font-size:24px}h2{font-size:19px}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;white-space:pre-wrap}td:last-child{text-align:right}svg{width:100%;background:#fff}pre{white-space:pre-wrap;overflow-wrap:anywhere}.internal{background:#faf3e9;padding:20px;margin-top:30px;border:1px solid #dcc5a9}.notice{padding:12px;background:#fff2d5}button{padding:10px;font:inherit}@media print{.internal,.actions{display:none!important}body{margin:0;max-width:none}tr{break-inside:avoid}}</style>
<div class="actions notice">工房保管用のHTMLです。カーブ・原価情報を含むため、このファイル自体はお客様へ渡さず「お客様用に印刷／PDF保存」を使ってください。<p><button onclick="window.print()">お客様用に印刷／PDF保存</button></p></div>
<h1>お見積書 — N's factory</h1><p>管理名：${esc(name)}<br>作成日時：${esc(new Date(record.savedAt).toLocaleString('ja-JP'))}</p>
<table>${record.quoteRows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</table>
<section class="internal"><h2>工房控え：この見積もりで使用したカーブ</h2><p>構造：${esc(record.selection.brand)} ／ サイズ：${esc(record.selection.size)}<br>緑の点：${record.calculation.productionArea.toFixed(4)} ds → ${record.calculation.totalHours.toFixed(4)} h<br>設定：${record.curveSource === 'draft' ? '見積作成時の端末下書き' : '見積作成時の公開値'}。以後の設定変更はこの控えに影響しません。</p>${graph}
<h2>制御点</h2><table><tr><th>基準点</th><th>面積 ds</th><th>工数 h</th></tr>${points.map(p => `<tr><td>${esc(p.label)}</td><td>${p.area}</td><td>${p.hours}</td></tr>`).join('')}</table>
<h2>計算条件・係数</h2><p>h = a + b·t + c·t² + d·t³（t = 面積 − 区間開始）。モデル：単調3次Hermite v1。</p><pre>${esc(JSON.stringify({calculation:record.calculation,settings:record.settings,coefficients}, null, 2))}</pre></section>
<script type="application/json" id="quote-snapshot">${json}</script></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `見積控え_${record.savedAt.replace(/[:.]/g, '-')}_${name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 60)}.html`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.NSFQuoteArchive = { save };
})();
