/* 血圧手帳 — 本体
   保存先はこの端末のブラウザ（localStorage）のみ。
   ⛔ ここに通信処理（fetch / XMLHttpRequest / 画像ビーコン）を足さないこと。
      血圧は医療情報にあたる。外部へ出さないことがこのアプリの前提になっている。
      index.html の CSP も connect-src を塞いでいる（両方を同時に直さない限り送れない）。 */

(function () {
  "use strict";

  var STORAGE_KEY = "bp-records-v1";
  var TAGS = ["飲酒", "塩分多め", "睡眠不足", "運動した", "服薬"];
  var WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

  /* ================= ユーティリティ ================= */

  function pad2(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayStr() { return ymd(new Date()); }

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return ymd(d);
  }

  function nextDayOf(s) {
    var p = s.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + 1);
    return ymd(d);
  }

  function fmtDate(s) {
    var p = s.split("-").map(Number);
    return p[1] + "/" + p[2] + "(" + WEEKDAYS[new Date(p[0], p[1] - 1, p[2]).getDay()] + ")";
  }

  function dowOf(s) {
    var p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).getDay();
  }

  /* 家庭血圧の目安によるゾーン判定（診察室基準ではなく家庭基準：135/85） */
  function zone(sys, dia) {
    if (sys >= 135 || dia >= 85) return { label: "高め", cls: "z-high", color: "#C0442E" };
    if (sys >= 125 || dia >= 75) return { label: "やや高め", cls: "z-warn", color: "#A87616" };
    return { label: "良好", cls: "z-good", color: "#2E7D5B" };
  }

  function avg(arr) {
    if (!arr.length) return null;
    return Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length);
  }

  /* ================= 保存 ================= */

  var records = [];

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // プライベートモードや保存無効時。記録は残らないが操作はできる状態にする。
      console.warn("記録を読み込めませんでした:", e);
    }
    return [];
  }

  function persist(next) {
    records = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (e) {
      console.error("記録を保存できませんでした:", e);
      return false;
    }
  }

  /* ================= サンプルデータ ================= */

  function makeSample() {
    var recs = [];
    for (var i = 27; i >= 0; i--) {
      var date = daysAgo(i);
      var dow = dowOf(date);
      var drink = (dow === 5 || dow === 6) ? Math.random() < 0.7 : Math.random() < 0.1;
      var base = 128 - i * 0.35; // ゆるやかに改善傾向
      ["am", "pm"].forEach(function (t) {
        if (Math.random() < 0.08) return; // たまに記録忘れ
        var bump = t === "am" ? 4 : 0;
        var drinkBump = (drink && t === "am") ? 7 : 0;
        var sys = Math.round(base + bump + drinkBump + (Math.random() * 10 - 5));
        var dia = Math.round(sys * 0.62 + (Math.random() * 6 - 3));
        recs.push({
          id: date + "-" + t,
          date: date, time: t, sys: sys, dia: dia,
          pulse: Math.round(68 + Math.random() * 12),
          tags: drink ? ["飲酒"] : []
        });
      });
    }
    return recs;
  }

  /* ================= 気づき生成 ================= */

  function buildInsights(recs) {
    var out = [];
    if (recs.length < 3) return out;

    function inRange(from, to) {
      return recs.filter(function (r) { return r.date >= from && r.date < to; });
    }

    // --- 今週 vs 先週 ---
    var thisWeek = inRange(daysAgo(6), daysAgo(-1)).map(function (r) { return r.sys; });
    var lastWeek = inRange(daysAgo(13), daysAgo(6)).map(function (r) { return r.sys; });
    if (thisWeek.length >= 3 && lastWeek.length >= 3) {
      var diff = avg(thisWeek) - avg(lastWeek);
      if (diff <= -3) out.push({ icon: "↓", good: true, text: "今週の上の血圧の平均は先週より " + (-diff) + " 下がっています。この調子です。" });
      else if (diff >= 3) out.push({ icon: "↑", good: false, text: "今週の上の血圧の平均は先週より " + diff + " 上がっています。塩分・睡眠を振り返ってみましょう。" });
      else out.push({ icon: "→", good: true, text: "今週の血圧は先週とほぼ同じ水準で安定しています。" });
    }

    // --- 朝と夜の差 ---
    var am = recs.filter(function (r) { return r.time === "am"; }).map(function (r) { return r.sys; });
    var pm = recs.filter(function (r) { return r.time === "pm"; }).map(function (r) { return r.sys; });
    if (am.length >= 3 && pm.length >= 3) {
      var d = avg(am) - avg(pm);
      if (d >= 5) out.push({ icon: "朝", good: false, text: "朝は夜より平均 " + d + " 高い「早朝高血圧」の傾向があります。診察時に伝える価値のある情報です。" });
      else if (d <= -5) out.push({ icon: "夜", good: false, text: "夜は朝より平均 " + (-d) + " 高い傾向があります。" });
      else out.push({ icon: "◎", good: true, text: "朝と夜の差が小さく、1日を通して安定しています。" });
    }

    // --- タグと翌朝の血圧の関係 ---
    TAGS.forEach(function (tag) {
      var tagDates = {};
      recs.forEach(function (r) { if (r.tags.indexOf(tag) !== -1) tagDates[r.date] = true; });
      var dateList = Object.keys(tagDates);
      if (dateList.length < 2) return;

      var affectedDates = {};
      dateList.forEach(function (t) { affectedDates[nextDayOf(t)] = true; });

      var affected = [], normal = [];
      recs.forEach(function (r) {
        if (r.time !== "am") return;
        if (affectedDates[r.date]) affected.push(r.sys);
        else normal.push(r.sys);
      });

      if (affected.length >= 2 && normal.length >= 2) {
        var gap = avg(affected) - avg(normal);
        if (Math.abs(gap) >= 4) {
          out.push({
            icon: "気", good: gap < 0,
            text: "「" + tag + "」の翌朝は、そうでない朝より平均 " + Math.abs(gap) + " " + (gap > 0 ? "高い" : "低い") + "傾向が出ています。"
          });
        }
      }
    });

    // --- 曜日のくせ ---
    var byDow = {};
    recs.forEach(function (r) {
      var k = dowOf(r.date);
      (byDow[k] = byDow[k] || []).push(r.sys);
    });
    var dows = Object.keys(byDow)
      .filter(function (k) { return byDow[k].length >= 3; })
      .map(function (k) { return [Number(k), avg(byDow[k])]; });
    if (dows.length >= 4) {
      dows.sort(function (a, b) { return b[1] - a[1]; });
      if (dows[0][1] - dows[dows.length - 1][1] >= 6) {
        out.push({
          icon: "週", good: false,
          text: WEEKDAYS[dows[0][0]] + "曜日は平均 " + dows[0][1] + " と、1週間で最も高い曜日です。前日の過ごし方に何かヒントがあるかもしれません。"
        });
      }
    }

    return out;
  }

  /* ================= 画面の状態 ================= */

  var state = {
    tab: "record",
    range: 14,
    importMode: "merge", // merge = 今の記録に足す / replace = 入れ替える
    form: {
      date: todayStr(),
      time: new Date().getHours() < 12 ? "am" : "pm",
      sys: "", dia: "", pulse: "", tags: []
    }
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ================= 描画 ================= */

  function renderHeader() {
    // 連続記録日数（今日がまだ未記録でも、昨日から数える）
    var dates = {};
    records.forEach(function (r) { dates[r.date] = true; });
    var n = 0;
    for (var i = 0; i < 365; i++) {
      if (dates[daysAgo(i)]) n++;
      else if (i === 0) continue;
      else break;
    }
    var box = $("streak");
    if (n > 0) {
      box.hidden = false;
      $("streak-days").textContent = String(n);
    } else {
      box.hidden = true;
    }
  }

  function renderHero() {
    var hero = $("hero");
    var latest = records[records.length - 1];
    if (!latest) { hero.hidden = true; return; }
    var z = zone(latest.sys, latest.dia);
    hero.hidden = false;
    hero.className = "hero " + z.cls;
    $("hero-zone").textContent = z.label;
    $("hero-nums").textContent = latest.sys + " / " + latest.dia;
    $("hero-unit").textContent = "mmHg" + (latest.pulse ? "・脈拍 " + latest.pulse : "");
    $("hero-meta").textContent = "最新の記録：" + fmtDate(latest.date) + " " + (latest.time === "am" ? "朝" : "夜");
  }

  function renderForm() {
    $("in-date").value = state.form.date;
    $("in-date").max = todayStr();
    $("seg-am").classList.toggle("on", state.form.time === "am");
    $("seg-pm").classList.toggle("on", state.form.time === "pm");
    $("in-sys").value = state.form.sys;
    $("in-dia").value = state.form.dia;
    $("in-pulse").value = state.form.pulse;

    var row = $("tagrow");
    row.textContent = "";
    TAGS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tag" + (state.form.tags.indexOf(t) !== -1 ? " on" : "");
      b.textContent = t;
      b.setAttribute("aria-pressed", state.form.tags.indexOf(t) !== -1 ? "true" : "false");
      b.addEventListener("click", function () {
        var i = state.form.tags.indexOf(t);
        if (i === -1) state.form.tags.push(t); else state.form.tags.splice(i, 1);
        renderForm();
      });
      row.appendChild(b);
    });
  }

  function renderLedger() {
    var empty = $("record-empty");
    var recent = $("recent");
    if (!records.length) {
      empty.hidden = false;
      recent.hidden = true;
      return;
    }
    empty.hidden = true;
    recent.hidden = false;

    var list = $("ledger");
    list.textContent = "";
    records.slice().reverse().slice(0, 10).forEach(function (r) {
      var rz = zone(r.sys, r.dia);
      var row = document.createElement("div");
      row.className = "lrow";

      var dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = rz.color;

      var d = document.createElement("span");
      d.className = "d";
      d.textContent = fmtDate(r.date);

      var t = document.createElement("span");
      t.className = "t";
      t.textContent = r.time === "am" ? "朝" : "夜";

      var v = document.createElement("span");
      v.className = "v";
      v.textContent = r.sys + "/" + r.dia;
      if (r.tags && r.tags.length) {
        var small = document.createElement("small");
        small.textContent = r.tags.join("・");
        v.appendChild(small);
      }

      var del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "×";
      del.setAttribute("aria-label", fmtDate(r.date) + " " + (r.time === "am" ? "朝" : "夜") + " の記録を削除");
      del.addEventListener("click", function () {
        persist(records.filter(function (x) { return x.id !== r.id; }));
        renderAll();
      });

      row.appendChild(dot); row.appendChild(d); row.appendChild(t);
      row.appendChild(v); row.appendChild(del);
      list.appendChild(row);
    });
  }

  function chartData() {
    var from = daysAgo(state.range - 1);
    var byDate = {};
    records.filter(function (r) { return r.date >= from; }).forEach(function (r) {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date };
      byDate[r.date][r.time === "am" ? "sysAm" : "sysPm"] = r.sys;
    });
    return Object.keys(byDate).sort().map(function (k) {
      var o = byDate[k];
      o.label = fmtDate(o.date).replace(/\(.\)/, "");
      return o;
    });
  }

  function renderChart() {
    $("range-14").classList.toggle("on", state.range === 14);
    $("range-30").classList.toggle("on", state.range === 30);

    var data = chartData();
    var empty = $("chart-empty");
    var wrap = $("chart");
    var pick = $("chart-pick");

    if (data.length < 2) {
      empty.hidden = false;
      wrap.hidden = true;
      pick.hidden = true;
      return;
    }
    empty.hidden = true;
    wrap.hidden = false;

    window.BPChart.render(wrap, data, function (p) {
      pick.hidden = false;
      pick.textContent = p.label + " " + p.time + "：上の血圧 " + p.value + " mmHg";
    });
  }

  function renderInsights() {
    var list = $("insight-list");
    var empty = $("insight-empty");
    var items = buildInsights(records);
    list.textContent = "";
    if (!items.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    items.forEach(function (it) {
      var box = document.createElement("div");
      box.className = "insight";
      var ic = document.createElement("div");
      ic.className = "ic " + (it.good ? "good" : "watch");
      ic.textContent = it.icon;
      var p = document.createElement("p");
      p.textContent = it.text;
      box.appendChild(ic);
      box.appendChild(p);
      list.appendChild(box);
    });
  }

  function renderReport() {
    var rs = records.filter(function (r) { return r.date >= daysAgo(27); });
    var body = $("report-body");
    var empty = $("report-empty");

    if (!rs.length) {
      empty.hidden = false;
      body.hidden = true;
      return;
    }
    empty.hidden = true;
    body.hidden = false;

    var am = rs.filter(function (r) { return r.time === "am"; });
    var pm = rs.filter(function (r) { return r.time === "pm"; });
    var days = {}, highDays = {};
    rs.forEach(function (r) {
      days[r.date] = true;
      if (r.sys >= 135 || r.dia >= 85) highDays[r.date] = true;
    });
    var sysList = rs.map(function (r) { return r.sys; });

    function dash(v) { return v === null || v === undefined ? "—" : v; }

    $("rep-days").textContent = Object.keys(days).length + " 日（" + rs.length + " 回）";
    $("rep-all").textContent = avg(sysList) + " / " + avg(rs.map(function (r) { return r.dia; })) + " mmHg";
    $("rep-am").textContent = dash(avg(am.map(function (r) { return r.sys; }))) + " / " + dash(avg(am.map(function (r) { return r.dia; }))) + " mmHg";
    $("rep-pm").textContent = dash(avg(pm.map(function (r) { return r.sys; }))) + " / " + dash(avg(pm.map(function (r) { return r.dia; }))) + " mmHg";
    $("rep-max").textContent = Math.max.apply(null, sysList) + " mmHg";
    $("rep-min").textContent = Math.min.apply(null, sysList) + " mmHg";
    $("rep-high").textContent = Object.keys(highDays).length + " 日";
  }

  function renderImportMode() {
    $("mode-merge").classList.toggle("on", state.importMode === "merge");
    $("mode-replace").classList.toggle("on", state.importMode === "replace");
  }

  function renderTab() {
    ["record", "chart", "insight", "report"].forEach(function (k) {
      $("tab-" + k).hidden = state.tab !== k;
      $("nav-" + k).classList.toggle("on", state.tab === k);
      $("nav-" + k).setAttribute("aria-current", state.tab === k ? "page" : "false");
    });
  }

  function renderAll() {
    renderHeader();
    renderHero();
    renderForm();
    renderLedger();
    renderChart();
    renderInsights();
    renderReport();
    renderImportMode();
    renderTab();
  }

  /* ================= 操作 ================= */

  function flash(id, msg) {
    var box = $(id);

    // 同じ場所の成功とエラーを同時に出さない。
    // 前回の赤い文字が残っていると、今の操作が失敗したように見えてしまう。
    var pairId = /-flash$/.test(id) ? id.replace(/-flash$/, "-error") : id.replace(/-error$/, "-flash");
    var other = document.getElementById(pairId);
    if (other && other !== box) {
      window.clearTimeout(other._timer);
      other.hidden = true;
    }

    box.textContent = msg;
    box.hidden = false;
    window.clearTimeout(box._timer);
    box._timer = window.setTimeout(function () { box.hidden = true; }, 2600);
  }

  /* ---------- バックアップ ----------
     記録は端末の中だけにあるため、機種変更やデータ削除で消える。
     ⛔ ここでもファイルは端末内で作って端末内で読むだけ。どこにも送らない。 */

  function exportBackup() {
    if (!records.length) {
      flash("backup-error", "書き出す記録がまだありません。");
      return;
    }
    var payload = {
      app: "bp-notebook",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      count: records.length,
      records: records
    };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "bp-backup-" + todayStr() + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      flash("backup-flash", records.length + " 件を書き出しました。ファイルは大切に保管してください。");
    } catch (e) {
      console.error(e);
      flash("backup-error", "書き出しに失敗しました。別のブラウザでお試しください。");
    }
  }

  /* 読み込んだ中身を1件ずつ検査する。
     ⛔ 検査を緩めないこと。壊れたファイルをそのまま取り込むと、
        画面が出なくなって既存の記録まで触れなくなる。 */
  function parseBackup(text) {
    var payload = JSON.parse(text);
    var list = null;
    if (payload && Array.isArray(payload.records)) list = payload.records;
    else if (Array.isArray(payload)) list = payload; // 記録の配列だけのファイルも受け付ける
    if (!list) throw new Error("形式が違います");

    var out = [], skipped = 0;
    list.forEach(function (r) {
      if (!r || typeof r !== "object") { skipped++; return; }
      var date = String(r.date || "");
      var time = (r.time === "am" || r.time === "pm") ? r.time : null;
      var sys = Number(r.sys), dia = Number(r.dia);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) { skipped++; return; }
      if (!sys || !dia || sys < 50 || sys > 260 || dia < 30 || dia > 180) { skipped++; return; }
      var pulse = Number(r.pulse);
      out.push({
        id: (typeof r.id === "string" && r.id) ? r.id : (date + "-" + time + "-" + Math.random().toString(36).slice(2)),
        date: date, time: time,
        sys: Math.round(sys), dia: Math.round(dia),
        pulse: (pulse > 0 && pulse < 300) ? Math.round(pulse) : null,
        tags: Array.isArray(r.tags) ? r.tags.filter(function (t) { return typeof t === "string"; }).slice(0, 10) : []
      });
    });
    return { records: out, skipped: skipped };
  }

  function importBackup() {
    var file = $("import-file").files && $("import-file").files[0];
    if (!file) {
      flash("backup-error", "先にファイルを選んでください。");
      return;
    }

    var reader = new FileReader();
    reader.onerror = function () { flash("backup-error", "ファイルを読み込めませんでした。"); };
    reader.onload = function () {
      var parsed;
      try {
        parsed = parseBackup(String(reader.result));
      } catch (e) {
        flash("backup-error", "このファイルは血圧手帳のバックアップではないようです。");
        return;
      }
      if (!parsed.records.length) {
        flash("backup-error", "読み取れる記録がありませんでした。" + (parsed.skipped ? "（" + parsed.skipped + " 件が形式違いでした）" : ""));
        return;
      }

      var msg = state.importMode === "replace"
        ? "今ある記録をすべて消して、ファイルの " + parsed.records.length + " 件に入れ替えます。よろしいですか？"
        : "ファイルの " + parsed.records.length + " 件を今の記録に足します。同じ日の同じ時間帯は、今ある記録をそのまま残します。よろしいですか？";
      if (!window.confirm(msg)) return;

      var before = records.length;
      var next;
      if (state.importMode === "replace") {
        next = parsed.records.slice();
      } else {
        var seen = {};
        records.forEach(function (r) { seen[r.date + r.time] = true; });
        next = records.concat(parsed.records.filter(function (r) { return !seen[r.date + r.time]; }));
      }
      next.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });

      if (!persist(next)) {
        flash("backup-error", "この端末では記録を保存できません（プライベートモードの可能性があります）。");
        return;
      }
      $("import-file").value = "";
      renderAll();

      var added = records.length - before;
      var note = state.importMode === "replace"
        ? records.length + " 件に入れ替えました。"
        : added + " 件を足しました（" + (parsed.records.length - added) + " 件はすでにある記録と同じ日時のため残しました）。";
      flash("backup-flash", note + (parsed.skipped ? "／" + parsed.skipped + " 件は形式違いのため取り込んでいません。" : ""));
    };
    reader.readAsText(file);
  }

  function save() {
    var sys = Number($("in-sys").value);
    var dia = Number($("in-dia").value);

    // ⚠ 入力が範囲外のときは黙って無視せず、必ず理由を出す。
    //    「押しても何も起きない」は利用者から見て故障と区別がつかない。
    if (!sys || !dia) {
      flash("save-error", "上と下の血圧を入力してください。");
      return;
    }
    if (sys < 50 || sys > 260 || dia < 30 || dia > 180) {
      flash("save-error", "数値を確認してください（上は50〜260、下は30〜180の範囲で入力できます）。");
      return;
    }

    var rec = {
      id: state.form.date + "-" + state.form.time + "-" + Date.now(),
      date: state.form.date,
      time: state.form.time,
      sys: sys, dia: dia,
      pulse: Number($("in-pulse").value) || null,
      tags: state.form.tags.slice()
    };

    // 同じ日の同じ時間帯は1件だけ。あとから入れ直した方を残す。
    var next = records.filter(function (r) {
      return !(r.date === rec.date && r.time === rec.time);
    }).concat([rec]).sort(function (a, b) {
      return (a.date + a.time).localeCompare(b.date + b.time);
    });

    var ok = persist(next);
    state.form.sys = ""; state.form.dia = ""; state.form.pulse = ""; state.form.tags = [];
    renderAll();
    if (ok) flash("save-flash", "記録しました");
    else flash("save-error", "この端末では記録を保存できません（ブラウザのプライベートモードの可能性があります）。");
  }

  function bind() {
    $("in-date").addEventListener("change", function () { state.form.date = this.value; });
    $("seg-am").addEventListener("click", function () { state.form.time = "am"; renderForm(); });
    $("seg-pm").addEventListener("click", function () { state.form.time = "pm"; renderForm(); });

    ["sys", "dia", "pulse"].forEach(function (k) {
      $("in-" + k).addEventListener("input", function () { state.form[k] = this.value; });
    });

    $("save").addEventListener("click", save);
    $("load-sample").addEventListener("click", function () {
      persist(makeSample());
      renderAll();
    });
    $("clear-all").addEventListener("click", function () {
      if (window.confirm("すべての記録を削除しますか？　この操作は取り消せません。")) {
        persist([]);
        renderAll();
      }
    });

    $("range-14").addEventListener("click", function () { state.range = 14; renderChart(); });
    $("range-30").addEventListener("click", function () { state.range = 30; renderChart(); });

    $("export").addEventListener("click", exportBackup);
    $("import").addEventListener("click", importBackup);
    ["merge", "replace"].forEach(function (m) {
      $("mode-" + m).addEventListener("click", function () {
        state.importMode = m;
        renderImportMode();
      });
    });

    ["record", "chart", "insight", "report"].forEach(function (k) {
      $("nav-" + k).addEventListener("click", function () {
        state.tab = k;
        renderTab();
        window.scrollTo(0, 0);
      });
    });
  }

  /* ================= 起動 ================= */

  records = load();
  bind();
  renderAll();
})();
