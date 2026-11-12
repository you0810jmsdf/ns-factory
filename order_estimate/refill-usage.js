/* リフィル機能の利用（管理画面のタブ・2026-11-13 事業主「N's CADと同様に分析タブを作って」決定A＝既存カウンター＋管理画面タブ）
 * 記録：assets/refill-extras.js が、リフィル印刷ツール（19本）とリフィルメーカーで使われた機能を
 *       event/f/<部品のid>/<ツール名>（1回の表示につき1機能1度）、PDF・印刷などを event/<種類>/<ツール名> としてアクセスカウンターへ送る。
 * 読み取り：アクセスカウンターGAS の action=counts（累計・見出しつき）と action=daily（日別）。GAS は無変更。
 * 開いた端末は localStorage nsf_internal=1（作家の端末）にして、以後は数えない（N's CAD 利用モニタと同じ考え方）。
 */
(function () {
  'use strict';
  const GAS = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';
  const SIZES = { a5: 'A5', a5slim: 'A5スリム', a6: 'A6', bible: 'バイブル', mini6: 'Mini6', micro5: 'Micro5' };
  const KINDS = { weekly: '週間', vertical: '週間バーチカル', monthly: '月間', daily: '日次' };
  const OPS = { pdf: 'PDFを生成', print: '印刷', reminder: 'カレンダーに次の予定', homescreen: 'ホーム画面に追加' };
  const RE = /^\/?event\/(f\/([^/]+)|pdf|print|reminder|homescreen)\/(.+)$/;
  let state = { counts: null, daily: null, period: '30', loading: false, wired: false };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function toolName(slug) {
    const m = /^(a5slim|a5|a6|bible|mini6|micro5)-(weekly|vertical|monthly|daily)$/.exec(slug);
    if (m) return SIZES[m[1]] + ' ' + KINDS[m[2]];
    if (slug === 'refill-maker') return 'リフィルメーカー';
    if (slug === 'a6-print-tool') return 'A6 印刷ツール（旧）';
    return slug;
  }
  function parse(page) {
    const m = RE.exec(String(page || ''));
    if (!m) return null;
    return m[2] ? { type: 'f', kind: m[2], tool: m[3] } : { type: 'op', kind: m[1], tool: m[3] };
  }
  async function getJson(url) {
    for (let i = 0; i < 3; i++) {
      const txt = await fetch(url + '&t=' + Date.now(), { cache: 'no-store' }).then(r => r.text());
      if (txt && txt.trim().charAt(0) !== '<') {     // GAS は 200 でも HTML を返すことがある
        const d = JSON.parse(txt);
        if (!d.ok) throw new Error(d.error || '応答が不正です');
        return d;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error('GASが集計ではなくHTMLを返しました。しばらくして「再読み込み」を押してください。');
  }

  // 期間の行を { page, pv, uu } にそろえる（累計＝counts、7日・30日＝daily を合算）
  function rowsFor(period) {
    if (period === 'all') return (state.counts || []).map(c => ({ page: c.page, pv: +c.pv || 0, uu: +c.uu || 0 }));
    const days = +period, since = new Date(Date.now() - (days - 1) * 86400000);
    const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const from = ymd(since), map = new Map();
    for (const r of state.daily || []) {
      if (r.date < from) continue;
      const k = String(r.page || '').replace(/^\/+/, '');
      const v = map.get(k) || { page: k, pv: 0, uu: 0 };
      v.pv += +r.pv || 0; v.uu += +r.uu || 0; map.set(k, v);
    }
    return [...map.values()];
  }
  function labels() {
    const lab = {};
    for (const c of state.counts || []) {
      const p = parse(c.page);
      if (!p || p.type !== 'f') continue;
      const m = /^\[機能\]\s*(.*?)｜/.exec(c.title || '');
      if (m && m[1] && m[1] !== p.kind) lab[p.kind] = m[1];
    }
    return lab;
  }

  function aggregate(period) {
    const lab = labels(), feats = new Map(), tools = new Map(), ops = { pdf: 0, print: 0, reminder: 0, homescreen: 0 };
    let featTotal = 0;
    for (const r of rowsFor(period)) {
      const p = parse(r.page);
      if (!p) continue;
      const t = tools.get(p.tool) || { tool: p.tool, feat: 0, pdf: 0, print: 0, kinds: new Map() };
      if (p.type === 'op') { ops[p.kind] = (ops[p.kind] || 0) + r.pv; if (p.kind in t) t[p.kind] += r.pv; tools.set(p.tool, t); continue; }
      featTotal += r.pv;
      const f = feats.get(p.kind) || { kind: p.kind, label: lab[p.kind] || p.kind, pv: 0, uu: 0, tools: new Set() };
      f.pv += r.pv; f.uu += r.uu; f.tools.add(p.tool); feats.set(p.kind, f);
      t.feat += r.pv; t.kinds.set(p.kind, (t.kinds.get(p.kind) || 0) + r.pv); tools.set(p.tool, t);
    }
    const featList = [...feats.values()].sort((a, b) => b.pv - a.pv || b.uu - a.uu);
    const toolList = [...tools.values()].sort((a, b) => (b.feat + b.pdf + b.print) - (a.feat + a.pdf + a.print));
    return { lab, featList, toolList, ops, featTotal };
  }
  function dailySeries(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      out.push({ date: k, f: 0, out: 0 });
    }
    const idx = new Map(out.map((o, i) => [o.date, i]));
    for (const r of state.daily || []) {
      const p = parse(String(r.page || '').replace(/^\/+/, ''));
      if (!p || !idx.has(r.date)) continue;
      const o = out[idx.get(r.date)];
      if (p.type === 'f') o.f += +r.pv || 0; else if (p.kind === 'pdf' || p.kind === 'print') o.out += +r.pv || 0;
    }
    return out;
  }

  function bar(v, max, color) {
    const w = max ? Math.max(2, Math.round(v / max * 100)) : 0;
    return `<div style="background:#F3ECE4;border-radius:4px;height:10px;width:100%;min-width:80px;"><div style="background:${color};height:10px;border-radius:4px;width:${w}%"></div></div>`;
  }
  function render() {
    const root = document.getElementById('refillUsageMount');
    if (!root) return;
    if (state.error) { root.innerHTML = `<div class="ru-box ru-err">読み込めませんでした：${esc(state.error)}<br><button type="button" class="ru-btn" data-ru="reload">もう一度読み込む</button></div>`; return; }
    if (!state.counts) { root.innerHTML = '<div class="ru-box">読み込み中…（アクセスカウンターから集計しています）</div>'; return; }
    const a = aggregate(state.period), maxF = a.featList[0] ? a.featList[0].pv : 0;
    const per = { '7': '過去7日', '30': '過去30日', all: '記録の始まりから' }[state.period];
    const featRows = a.featList.slice(0, 60).map((f, i) => `<tr><td class="ru-n">${i + 1}</td><td><b>${esc(f.label)}</b><div class="ru-id">${esc(f.kind)}</div></td><td class="ru-n">${f.pv}</td><td class="ru-n">${f.uu}</td><td class="ru-n">${f.tools.size}</td><td style="width:34%">${bar(f.pv, maxF, '#7A5540')}</td></tr>`).join('');
    const toolRows = a.toolList.map(t => {
      const top = [...t.kinds.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => `${esc(a.lab[k] || k)}（${n}）`).join('、');
      return `<tr><td><b>${esc(toolName(t.tool))}</b><div class="ru-id">${esc(t.tool)}</div></td><td class="ru-n">${t.feat}</td><td class="ru-n">${t.pdf}</td><td class="ru-n">${t.print}</td><td>${top || '<span class="ru-id">—</span>'}</td></tr>`;
    }).join('');
    const ds = dailySeries(30), maxD = Math.max(1, ...ds.map(d => Math.max(d.f, d.out)));
    const dayBars = ds.map(d => `<div class="ru-day" title="${d.date}：機能 ${d.f}・PDF/印刷 ${d.out}"><div class="ru-col"><div style="height:${Math.round(d.f / maxD * 100)}%;background:#7A5540"></div></div><div class="ru-col"><div style="height:${Math.round(d.out / maxD * 100)}%;background:#c9a96e"></div></div><span>${+d.date.slice(8)}</span></div>`).join('');
    root.innerHTML = `
      <div class="ru-head">
        <div class="ru-seg">${[['7', '7日'], ['30', '30日'], ['all', '累計']].map(([v, l]) => `<button type="button" data-ru-period="${v}" class="${state.period === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <button type="button" class="ru-btn" data-ru="reload">再読み込み</button>
      </div>
      <div class="ru-cards">
        <div class="ru-card"><span>機能を使った回数</span><b>${a.featTotal}</b></div>
        <div class="ru-card"><span>使われた機能の種類</span><b>${a.featList.length}</b></div>
        <div class="ru-card"><span>PDFを生成</span><b>${a.ops.pdf}</b></div>
        <div class="ru-card"><span>印刷</span><b>${a.ops.print}</b></div>
      </div>
      <h3 class="ru-h">機能ランキング（${per}）</h3>
      ${a.featList.length ? `<div class="ru-scroll"><table class="ru-t"><thead><tr><th>#</th><th>機能（画面の文字）</th><th>回数</th><th>人数</th><th>ツール数</th><th></th></tr></thead><tbody>${featRows}</tbody></table></div>` : '<div class="ru-box">この期間に記録された機能の利用はまだありません（機能の記録は 2026-11-13 から）。</div>'}
      <h3 class="ru-h">ツール別（${per}）</h3>
      ${toolRows ? `<div class="ru-scroll"><table class="ru-t"><thead><tr><th>ツール</th><th>機能の利用</th><th>PDF</th><th>印刷</th><th>よく使われた機能</th></tr></thead><tbody>${toolRows}</tbody></table></div>` : '<div class="ru-box">記録はまだありません。</div>'}
      <h3 class="ru-h">日別（過去30日）<small><i style="background:#7A5540"></i>機能の利用 <i style="background:#c9a96e"></i>PDF・印刷</small></h3>
      <div class="ru-days">${dayBars}</div>
      <p class="ru-note">数え方：同じ人が1回の表示で同じ機能を何度使っても1回（人数は日ごとの人数の合計）。PDF・印刷は押した回数（10秒以内の連打は1回）。入力した日付や文字は送っていません。<b>この端末は、このタブを開いた時点で「作家の端末」として除外しました</b>（N's CAD 利用モニタと同じ）。機能の記録は 2026-11-13 から、PDF・印刷は 2026-10-30 から。</p>`;
  }
  function style() {
    if (document.getElementById('ru-style')) return;
    const s = document.createElement('style');
    s.id = 'ru-style';
    s.textContent = `#refillUsageMount{font-size:13px;color:#3b2a1d}
      .ru-head{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}
      .ru-seg button{border:1px solid #E0D2C2;background:#fff;padding:5px 12px;cursor:pointer;font-size:12px}.ru-seg button:first-child{border-radius:6px 0 0 6px}.ru-seg button:last-child{border-radius:0 6px 6px 0}.ru-seg button.on{background:#7A5540;color:#fff;border-color:#7A5540}
      .ru-btn{border:1px solid #E0D2C2;background:#F3ECE4;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px}
      .ru-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
      .ru-card{background:#fff;border:1px solid #E0D2C2;border-radius:10px;padding:12px}.ru-card span{display:block;font-size:11px;color:#8a7362}.ru-card b{font-size:24px}
      .ru-h{font-size:14px;margin:18px 0 8px}.ru-h small{font-weight:400;font-size:11px;color:#8a7362;margin-left:10px}.ru-h i{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 3px 0 8px;vertical-align:-1px}
      .ru-scroll{overflow-x:auto;background:#fff;border:1px solid #E0D2C2;border-radius:10px}
      .ru-t{width:100%;border-collapse:collapse;min-width:560px}.ru-t th,.ru-t td{padding:8px 10px;border-bottom:1px solid #F0E7DC;text-align:left;vertical-align:middle}.ru-t th{background:#FAF6F1;font-size:11px;color:#7A5540}
      .ru-n{text-align:right!important;font-variant-numeric:tabular-nums;white-space:nowrap}.ru-id{font-size:10.5px;color:#a08d7c;font-family:monospace}
      .ru-days{display:flex;gap:3px;align-items:flex-end;height:120px;background:#fff;border:1px solid #E0D2C2;border-radius:10px;padding:10px 8px 20px;overflow-x:auto}
      .ru-day{flex:1 0 14px;height:100%;display:flex;gap:1px;align-items:flex-end;position:relative}.ru-day span{position:absolute;bottom:-17px;left:0;right:0;text-align:center;font-size:9px;color:#a08d7c}
      .ru-col{flex:1;height:100%;display:flex;align-items:flex-end}.ru-col div{width:100%;border-radius:2px 2px 0 0;min-height:0}
      .ru-box{background:#fff;border:1px dashed #E0D2C2;border-radius:10px;padding:14px;color:#8a7362}.ru-err{color:#9b2c2c;border-color:#e3b4b4}
      .ru-note{font-size:11.5px;color:#8a7362;line-height:1.8;margin-top:14px}`;
    document.head.appendChild(s);
  }
  async function load() {
    if (state.loading) return;
    state.loading = true; state.error = null; render();
    try {
      const [c, d] = await Promise.all([getJson(GAS + '?action=counts'), getJson(GAS + '?action=daily&days=60')]);
      state.counts = c.counts || []; state.daily = d.rows || [];
    } catch (e) { state.error = e.message || String(e); }
    state.loading = false; render();
  }
  function wire() {
    if (state.wired) return;
    state.wired = true;
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('#refillUsageMount [data-ru], #refillUsageMount [data-ru-period]');
      if (!b) return;
      if (b.dataset.ruPeriod) { state.period = b.dataset.ruPeriod; render(); }
      else if (b.dataset.ru === 'reload') load();
    });
  }
  window.RefillUsage = {
    start() {
      try { localStorage.setItem('nsf_internal', '1'); } catch (e) {}   // この端末を作家の端末として除外（以後は数えない）
      style(); wire();
      if (!state.counts && !state.loading) load(); else render();
    },
    _state: state, _parse: parse, _aggregate: aggregate, _toolName: toolName
  };
})();
