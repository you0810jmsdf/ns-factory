/* N's CAD 利用モニタ（管理画面の「📡 N's CAD 利用モニタ」タブ・2026-10-28 事業主「他人がどの機能をよく使うかリアルタイムモニタしたい」）。
 * N's CAD が機能を使うたびに送る（匿名の印＋機能名）を、Cloudflare の中継（leather-cad-presence）が持っている。ここは /monitor を数秒ごとに読んで、ランキングと直近の操作を出すだけ。
 * 「自分は除く」：このタブを開いた端末には、作家の端末の印（localStorage nsf_ga_optout=1）を自動でつける。N's CAD はその印がある端末からは、GA4 にも中継にも送らない（以後その端末は数えない）。
 * 使い方：window.NCADLive.start()（タブを開いたとき）／stop()（ほかのタブへ移ったとき）。表示先は #ncadLiveMount。 */
(function () {
  'use strict';
  var MONITOR_URL = 'https://leather-cad-presence.bouncy-xenoposeidon.workers.dev/monitor';
  var OPTOUT_KEY = 'nsf_ga_optout', POLL_MS = 5000, GA_ID = 'G-ND1T7H067Y';
  var WINDOWS = [['m5', '直近5分'], ['h1', '直近1時間'], ['today', '今日'], ['d7', '7日間'], ['all', '全期間（記録のある間）']];
  /* 機能の名前（kind）の日本語名。無いものは、名前のまま出す */
  var JA = {
    tool_select: '選択', tool_line: '直線', tool_rect: '矩形', tool_circle: '円', tool_arc: '円弧', tool_bezier: 'ベジェ', tool_path: 'ペン', tool_text: '文字', tool_dimension: '寸法（1本ずつ）', tool_ruler: '定規', tool_dashed: '点線で描く',
    tool_stitch: '目打ち', tool_mark: '目印', tool_koma: '駒合わせ', tool_trim: 'トリム', tool_offset: 'オフセット', tool_mirror: '線対称', tool_fillet: '丸（角を丸くする）', tool_chamfer: '角（斜めに切る）', tool_divide: '分割線', tool_patchfill: '柄（パッチワーク）',
    undo: '元に戻す', redo: 'やり直し', fit: '全体表示', grid: 'グリッド', snap: 'スナップ', save: '保存', saveNative: 'N\'s CAD形式で保存', open: '開く', newDoc: '新規', copy: 'コピー', delete: '削除', mirrorX: '左右反転', mirrorY: '上下反転', rotate: '回転',
    scaleOpen: '拡大縮小', mergeLines: '1本に結合', dupMerge: '重なった線を1本に', closeGaps: '隙間を閉じる', symCheck: '対称チェック', unroll: '直線に展開', delHoles: '菱目を消す',
    exportSvg: 'SVG書き出し', exportDxf: 'DXF書き出し', exportPdf: 'PDF書き出し', exportPng: 'PNG書き出し', print: '印刷', view3d: '3D', sidePanelBtn: 'パネル', sideClose: 'パネルを閉じる', showStitch: '縫い目を見る', stitchFace: '縫い目の面',
    holeShapeApply: '菱目・丸目をまとめて変える', tfApply: '文字のフォントと大きさ', phraseSave: '定型句を保存', phraseDelete: '定型句を削除', restoreApply: '前回の続きを開く', restoreDiscard: '前回の続きを捨てる', tourSkip: 'ツアーをスキップ',
    updateNow: '新しい版：今すぐ更新', updateLater: '新しい版：あとで', bugLog: '不具合記録', hdrHide: '上の帯を隠す', hdrShow: '上の帯を出す', viewBtn: '表示メニュー', otherBtn: 'その他メニュー', releaseBtn: '更新履歴'
  };
  function nameOf(k) {
    if (JA[k]) return JA[k];
    var m;
    if ((m = /^ctx[_-](.+)$/.exec(k))) return '右クリック：' + (JA[m[1]] || m[1]);
    if ((m = /^card_(.+)$/.exec(k))) return 'カードを開く：' + m[1];
    if ((m = /^export:(.+)$/.exec(k))) return '書き出し：' + m[1];
    return '';
  }
  var timer = null, running = false, win = 'm5', last = null, err = '', paused = false, mount = null, els = {}, inflight = false;

  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }
  function markOwner() {   /* このタブを開いた端末を、作家の端末にする（N's CAD は、この印がある端末からは送らない） */
    var ok = false; try { localStorage.setItem(OPTOUT_KEY, '1'); ok = localStorage.getItem(OPTOUT_KEY) === '1'; window['ga-disable-' + GA_ID] = true; } catch (e) { /* 保存できない環境では印がつかない */ }
    return ok;
  }
  function isOwner() { try { return localStorage.getItem(OPTOUT_KEY) === '1'; } catch (e) { return false; } }
  function clock(t) { return new Date(t).toLocaleTimeString('ja-JP', { hour12: false, timeZone: 'Asia/Tokyo' }); }
  function ago(t, now) { var s = Math.max(0, Math.round((now - t) / 1000)); return s < 60 ? s + '秒前' : s < 3600 ? Math.floor(s / 60) + '分前' : Math.floor(s / 3600) + '時間前'; }

  function build() {
    mount = document.getElementById('ncadLiveMount'); if (!mount || mount.dataset.built) return !!mount;
    mount.dataset.built = '1'; mount.textContent = '';
    var head = el('div', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px');
    head.appendChild(el('h2', 'margin:0;font-size:16px;color:#5C3D2E', '📡 N\'s CAD 利用モニタ（リアルタイム）'));
    els.status = el('span', 'font-size:12px;color:#8a6a4a'); head.appendChild(els.status);
    els.pause = el('button', 'margin-left:auto;background:#fff3e0;border:1px solid #eadccf;border-radius:999px;padding:4px 12px;font-size:12px;color:#8B5E3C;cursor:pointer', '⏸ 止める'); els.pause.type = 'button';
    els.pause.onclick = function () { paused = !paused; els.pause.textContent = paused ? '▶ 再開' : '⏸ 止める'; if (!paused) tick(); else status(); };
    head.appendChild(els.pause); mount.appendChild(head);
    els.owner = el('div', 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#eef6ee;border:1px solid #b9d9b9;border-radius:8px;padding:8px 12px;font-size:12px;color:#2f5f2f;margin-bottom:12px');
    els.ownerText = el('span', '', ''); els.owner.appendChild(els.ownerText);
    els.ownerBtn = el('button', 'background:#fff;border:1px solid #b9d9b9;border-radius:999px;padding:3px 10px;font-size:11px;color:#2f5f2f;cursor:pointer', ''); els.ownerBtn.type = 'button';
    els.ownerBtn.onclick = function () { if (isOwner()) { try { localStorage.removeItem(OPTOUT_KEY); } catch (e) { /* 消せなくても続ける */ } } else markOwner(); ownerBanner(); };
    els.owner.appendChild(els.ownerBtn); mount.appendChild(els.owner);
    els.cards = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px'); mount.appendChild(els.cards);
    els.tabs = el('div', 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px');
    WINDOWS.forEach(function (w) { var b = el('button', '', w[1]); b.type = 'button'; b.dataset.win = w[0]; b.onclick = function () { win = w[0]; render(); }; els.tabs.appendChild(b); });
    mount.appendChild(els.tabs);
    els.rank = el('div', 'background:#fff;border:1px solid #eadccf;border-radius:12px;padding:12px 14px;margin-bottom:14px'); mount.appendChild(els.rank);
    els.hours = el('div', 'background:#fff;border:1px solid #eadccf;border-radius:12px;padding:12px 14px;margin-bottom:14px'); mount.appendChild(els.hours);
    var rh = el('div', 'font-size:14px;font-weight:700;color:#5C3D2E;margin:0 0 6px', '直近の操作（新しい順）'); mount.appendChild(rh);
    els.recent = el('div', 'background:#fff;border:1px solid #eadccf;border-radius:12px;padding:6px 10px;margin-bottom:12px'); mount.appendChild(els.recent);
    mount.appendChild(el('p', 'font-size:11px;color:#8a6a4a;line-height:1.7;margin:0',
      '端末の印（4文字）は、N\'s CAD を開くたびに作り直す匿名のランダム文字の先頭だけです（氏名・図形・ファイル名は届きません）。同じ人でも、開き直すと別の印になります。機能の名前は、ボタンの id など短い英数字そのままで、分かるものだけ日本語名を添えています。' +
      '作家の端末（上の緑の帯）の操作は、送られないので数えません。いまの人数は、右下に出る「利用中」と同じ数です。時間帯は日本時間で、「開いた」は、その日に N\'s CAD の画面を開いた端末の数（同じ端末は1日1回）です。'));
    return true;
  }
  function ownerBanner() {
    if (!els.owner) return; var on = isOwner();
    els.owner.style.background = on ? '#eef6ee' : '#fdf0e3'; els.owner.style.borderColor = on ? '#b9d9b9' : '#ecc9a0'; els.owner.style.color = on ? '#2f5f2f' : '#8a4a1a';
    els.ownerText.textContent = on ? '✔ この端末は「作家の端末」として除外しています（この端末での N\'s CAD の操作は、GA4 にも、このモニタにも送られません）。' : '⚠ この端末は除外していません（この端末での N\'s CAD の操作は、数えられます）。';
    els.ownerBtn.textContent = on ? '除外をやめる' : 'この端末を除外する';
  }
  function status() {
    if (!els.status) return;
    els.status.textContent = err ? '⚠ ' + err : paused ? '止めています' : last ? '● 5秒ごとに更新中（' + clock(last.now) + '）' : '読み込み中…';
    els.status.style.color = err ? '#b42318' : paused ? '#8a6a4a' : '#2f7a2f';
  }
  function card(label, value, note) {
    var c = el('div', 'background:#fff;border:1px solid #eadccf;border-radius:12px;padding:10px 12px');
    c.appendChild(el('div', 'font-size:11px;color:#8a6a4a', label)); c.appendChild(el('div', 'font-size:22px;font-weight:700;color:#5C3D2E;line-height:1.3', value)); if (note) c.appendChild(el('div', 'font-size:10px;color:#a08a74', note)); return c;
  }
  function render() {
    if (!build()) return; ownerBanner(); status(); if (!last) return;
    var d = last, w = d.windows[win] || {}, entries = Object.keys(w).map(function (k) { return [k, w[k]]; }).sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); });
    var total = entries.reduce(function (s, e) { return s + e[1]; }, 0);
    els.cards.textContent = '';
    els.cards.appendChild(card('いま開いている人数', String(d.online), '（利用中・作家の端末も含む）'));
    els.cards.appendChild(card('直近5分に操作した端末', String(d.users.m5), '匿名の印の数'));
    els.cards.appendChild(card('直近1時間に操作した端末', String(d.users.h1), '匿名の印の数'));
    els.cards.appendChild(card('選んだ期間の操作回数', String(total), WINDOWS.filter(function (x) { return x[0] === win; })[0][1]));
    Array.prototype.forEach.call(els.tabs.children, function (b) { var on = b.dataset.win === win; b.style.cssText = 'border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;border:1px solid ' + (on ? '#8B5E3C' : '#eadccf') + ';background:' + (on ? '#8B5E3C' : '#fff') + ';color:' + (on ? '#fff' : '#8B5E3C'); });
    els.rank.textContent = '';
    els.rank.appendChild(el('div', 'font-size:14px;font-weight:700;color:#5C3D2E;margin-bottom:8px', '機能別のランキング（' + WINDOWS.filter(function (x) { return x[0] === win; })[0][1] + '・上位20）'));
    if (!entries.length) els.rank.appendChild(el('div', 'font-size:12px;color:#8a6a4a;padding:8px 0', 'この期間の記録はまだありません（作家の端末以外で、N\'s CAD の機能が使われると、ここに出ます）。'));
    var max = entries.length ? entries[0][1] : 1;
    entries.slice(0, 20).forEach(function (e, i) {
      var row = el('div', 'display:grid;grid-template-columns:1.8em minmax(120px,240px) 1fr 3.4em;gap:8px;align-items:center;font-size:12px;padding:3px 0');
      row.appendChild(el('span', 'color:#a08a74;text-align:right', String(i + 1)));
      var nm = el('span', 'color:#5C3D2E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'); var ja = nameOf(e[0]); nm.textContent = ja || e[0]; nm.title = e[0] + (ja ? '（' + ja + '）' : ''); row.appendChild(nm);
      var bar = el('span', 'display:block;height:12px;background:#f5ece1;border-radius:6px;overflow:hidden'); var fill = el('span', 'display:block;height:100%;background:#c9a96e;width:' + Math.max(2, Math.round(e[1] / max * 100)) + '%'); bar.appendChild(fill); row.appendChild(bar);
      row.appendChild(el('span', 'text-align:right;font-weight:700;color:#5C3D2E', String(e[1]))); els.rank.appendChild(row);
    });
    renderHours(d);
    els.recent.textContent = '';
    if (!d.recent.length) els.recent.appendChild(el('div', 'font-size:12px;color:#8a6a4a;padding:8px 0', 'まだ操作の記録がありません。'));
    d.recent.slice(0, 30).forEach(function (r) {
      var row = el('div', 'display:grid;grid-template-columns:5.5em 4.2em 3.6em 1fr;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px dashed #f0e6da;align-items:baseline');
      row.appendChild(el('span', 'color:#8a6a4a;font-variant-numeric:tabular-nums', clock(r.t))); row.appendChild(el('span', 'color:#a08a74', ago(r.t, d.now)));
      row.appendChild(el('span', 'color:#a08a74;font-family:monospace', r.id)); var ja = nameOf(r.k); row.appendChild(el('span', 'color:#5C3D2E', ja ? ja + '　' + r.k : r.k)); els.recent.appendChild(row);
    });
  }
  /* 時間帯別（日本時間）：中継が日ごとに数えた「開いた端末」「押した端末」「押した回数」を、選んだ窓の分だけ24時間に足す。5分・1時間の窓は、今日の分で見る */
  function dayKeyOf(t) { return new Date(t + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, ''); }
  function hoursOf(d) {
    var daily = d.daily || {}, keys = Object.keys(daily).sort(), i, set = {};
    if (win === 'd7') { for (i = 0; i < 7; i++) set[dayKeyOf(d.now - i * 86400000)] = 1; keys = keys.filter(function (k) { return set[k]; }); }
    else if (win !== 'all') keys = keys.filter(function (k) { return k === dayKeyOf(d.now); });
    var r = { v: [], u: [], visitors: 0, pressers: 0, real: 0, days: keys.length };
    for (i = 0; i < 24; i++) { r.v.push(0); r.u.push(0); }
    keys.forEach(function (k) { var o = daily[k]; for (i = 0; i < 24; i++) { r.v[i] += o.v[i] || 0; r.u[i] += o.u[i] || 0; } r.visitors += o.visitors || 0; r.pressers += o.pressers || 0; r.real += o.real || 0; });
    return r;
  }
  function hourChart(title, values, color) {
    var wrap = el('div', 'margin:6px 0 12px'), max = Math.max.apply(null, values.concat([1]));
    wrap.appendChild(el('div', 'font-size:12px;color:#5C3D2E;margin-bottom:3px', title));
    var row = el('div', 'display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px;align-items:end;height:64px;border-bottom:1px solid #eadccf');
    values.forEach(function (n, h) {
      var col = el('div', 'display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:9px;color:#8a6a4a'); col.title = h + '時台：' + n;
      if (n) col.appendChild(el('span', '', String(n))); col.appendChild(el('span', 'display:block;width:100%;background:' + color + ';border-radius:2px 2px 0 0;height:' + (n ? Math.max(3, Math.round(n / max * 44)) : 0) + 'px')); row.appendChild(col);
    });
    wrap.appendChild(row);
    var lab = el('div', 'display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px;font-size:9px;color:#a08a74;text-align:center');
    for (var h = 0; h < 24; h++) lab.appendChild(el('span', '', h % 3 === 0 ? String(h) : ''));
    wrap.appendChild(lab); return wrap;
  }
  function renderHours(d) {
    if (!els.hours) return; els.hours.textContent = '';
    var label = WINDOWS.filter(function (x) { return x[0] === win; })[0][1], note = win === 'm5' || win === 'h1' ? '（5分・1時間の窓は「今日」の分）' : '';
    els.hours.appendChild(el('div', 'font-size:14px;font-weight:700;color:#5C3D2E;margin-bottom:4px', '時間帯別（日本時間）：開いた人のうち、何人が押したか'));
    if (!d.daily) { els.hours.appendChild(el('div', 'font-size:12px;color:#8a6a4a;padding:8px 0', '中継（Worker）が古い形のため、時間帯別はまだ出せません。')); return; }
    var h = hoursOf(d), since = d.hoursSince ? new Date(d.hoursSince).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false }) : '';
    els.hours.appendChild(el('div', 'font-size:11px;color:#8a6a4a;margin-bottom:8px', label + note + '・時間帯別の記録は' + (since ? ' ' + since + ' ' : '') + 'から（それより前の分はありません。作家の端末は除く）'));
    var cards = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:8px');
    var multi = h.days > 1, rate = h.visitors ? Math.round(h.pressers / h.visitors * 100) + '%' : '―';
    cards.appendChild(card('開いた端末', String(h.visitors), multi ? '日ごとの合計（' + h.days + '日分）' : '画面を開いた端末の数'));
    cards.appendChild(card('そのうち何か押した端末', String(h.pressers), '押した割合 ' + rate));
    cards.appendChild(card('本格的に使った端末', String(h.real), '開いた端末のうち ' + (h.visitors ? Math.round(h.real / h.visitors * 100) + '%' : '―')));
    els.hours.appendChild(cards);
    els.hours.appendChild(breakdown(h));
    if (!h.visitors) els.hours.appendChild(el('div', 'font-size:12px;color:#8a6a4a;padding:4px 0 8px', 'この期間は、作家の端末以外で N\'s CAD が開かれた記録がまだありません。'));
    els.hours.appendChild(hourChart('開いた端末（時間帯別・その日の初回）', h.v, '#c9a96e'));
    els.hours.appendChild(hourChart('押した回数（時間帯別）', h.u, '#8B5E3C'));
    els.hours.appendChild(weekChart(d));
  }
  /* 開いた端末の内訳：開いただけ／軽い操作だけ（ツアーのスキップ・更新通知・前回の続きの確認・更新履歴）／本格的に使った */
  function breakdown(h) {
    var wrap = el('div', 'margin:4px 0 12px'), look = Math.max(0, h.visitors - h.pressers), light = Math.max(0, h.pressers - h.real), tot = Math.max(1, h.visitors);
    var parts = [['開いただけ', look, '#e3d6c4'], ['軽い操作だけ（ツアーのスキップ・更新通知など）', light, '#c9a96e'], ['本格的に使った', h.real, '#8B5E3C']];
    wrap.appendChild(el('div', 'font-size:12px;color:#5C3D2E;margin-bottom:3px', '開いた端末の内訳'));
    var bar = el('div', 'display:flex;height:16px;border-radius:8px;overflow:hidden;background:#f5ece1');
    parts.forEach(function (x) { if (x[1]) { var seg = el('span', 'display:block;height:100%;background:' + x[2] + ';width:' + (x[1] / tot * 100) + '%'); seg.title = x[0] + '：' + x[1]; bar.appendChild(seg); } });
    wrap.appendChild(bar);
    var lg = el('div', 'display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#8a6a4a;margin-top:4px');
    parts.forEach(function (x) { var t = el('span', '', ''); t.appendChild(el('span', 'display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;background:' + x[2])); t.appendChild(document.createTextNode(x[0] + ' ' + x[1])); lg.appendChild(t); });
    wrap.appendChild(lg); return wrap;
  }
  /* 曜日別（日本時間）：記録のある全部の日を曜日ごとに足し、1日あたりの平均で出す（その曜日の日数が違っても比べられる）。窓の選択には連動しない */
  function weekChart(d) {
    var names = ['日', '月', '火', '水', '木', '金', '土'], acc = names.map(function () { return { days: 0, v: 0, real: 0 }; });
    Object.keys(d.daily || {}).forEach(function (k) {
      var o = d.daily[k], w = new Date(Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8))).getUTCDay(); acc[w].days++; acc[w].v += o.visitors || 0; acc[w].real += o.real || 0;
    });
    var wrap = el('div', 'margin:6px 0 4px'); wrap.appendChild(el('div', 'font-size:12px;color:#5C3D2E;margin-bottom:3px', '曜日別（1日あたりの平均・記録のある全部の日）'));
    var avg = function (x, key) { return x.days ? Math.round(x[key] / x.days * 10) / 10 : 0; }, max = 0;
    acc.forEach(function (x) { max = Math.max(max, avg(x, 'v'), avg(x, 'real')); }); max = max || 1;
    var row = el('div', 'display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:end;height:84px;border-bottom:1px solid #eadccf');
    acc.forEach(function (x, i) {
      var col = el('div', 'display:flex;gap:3px;align-items:flex-end;justify-content:center;height:100%'), a = avg(x, 'v'), b = avg(x, 'real'); col.title = names[i] + '曜日（' + x.days + '日分）：開いた ' + a + '／本格的に使った ' + b;
      [[a, '#c9a96e'], [b, '#8B5E3C']].forEach(function (y) { var c = el('div', 'display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:9px;color:#8a6a4a;width:42%'); if (y[0]) c.appendChild(el('span', '', String(y[0]))); c.appendChild(el('span', 'display:block;width:100%;border-radius:2px 2px 0 0;background:' + y[1] + ';height:' + (y[0] ? Math.max(3, Math.round(y[0] / max * 58)) : 0) + 'px')); col.appendChild(c); });
      row.appendChild(col);
    });
    wrap.appendChild(row);
    var lab = el('div', 'display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;font-size:10px;color:#a08a74;text-align:center');
    acc.forEach(function (x, i) { lab.appendChild(el('span', '', names[i] + '（' + x.days + '日分）')); }); wrap.appendChild(lab);
    wrap.appendChild(el('div', 'font-size:10px;color:#a08a74;margin-top:3px', '左の棒＝開いた端末・右の棒＝本格的に使った端末'));
    return wrap;
  }
  function tick() {
    if (!running || paused || inflight) return; if (document.visibilityState === 'hidden') { schedule(); return; }
    inflight = true; var ctl = typeof AbortController === 'function' ? new AbortController() : null, to = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
    fetch(MONITOR_URL, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      if (!j || !j.windows || !Array.isArray(j.recent)) throw new Error('形が違います'); last = j; err = ''; render();
    }).catch(function (e) { err = '中継に接続できません（' + (e && e.name === 'AbortError' ? '時間切れ' : e && e.message || e) + '）。続けて試します。'; status(); })
      .then(function () { inflight = false; if (to) clearTimeout(to); schedule(); });
  }
  function schedule() { if (timer) clearTimeout(timer); if (running && !paused) timer = setTimeout(tick, err ? POLL_MS * 2 : POLL_MS); }
  document.addEventListener('visibilitychange', function () { if (running && !paused && document.visibilityState === 'visible') { if (timer) clearTimeout(timer); tick(); } });
  window.NCADLive = {
    start: function () { if (!build()) return; if (!isOwner()) markOwner(); running = true; paused = false; if (els.pause) els.pause.textContent = '⏸ 止める'; ownerBanner(); status(); tick(); },
    stop: function () { running = false; if (timer) { clearTimeout(timer); timer = null; } },
    _state: function () { return { running: running, win: win, paused: paused, last: last, err: err }; }
  };
})();
