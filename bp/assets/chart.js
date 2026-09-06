/* 血圧手帳 — 推移グラフ（自前SVG描画）
   元のArtifact版は recharts を使っていたが、このサイトのアプリは
   外部スクリプトを読み込まない方針（CSP script-src 'self'）のため自前で描いている。
   ⛔ ここにグラフライブラリを持ち込まないこと。 */

(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // 描画領域（viewBox基準・実表示は幅に応じて拡縮される）
  var W = 460, H = 260;
  var PAD = { top: 12, right: 12, bottom: 26, left: 34 };
  var Y_MIN = 70, Y_MAX = 170;
  var GUIDE = 135; // 家庭血圧 高血圧の目安（上）

  var COLOR = {
    am: "#1F2A44",     // 朝＝濃い線
    pm: "#8A97B4",     // 夜＝薄い線
    grid: "#EDF0F4",
    axis: "#7A8499",
    guide: "#C0442E"
  };

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    }
    return n;
  }

  function text(x, y, str, attrs) {
    var t = el("text", attrs || {});
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.textContent = str;
    return t;
  }

  /* 値 → Y座標。範囲外は上下端に丸める（線が枠外へ飛ばないように） */
  function yOf(v) {
    var clamped = Math.max(Y_MIN, Math.min(Y_MAX, v));
    var ratio = (clamped - Y_MIN) / (Y_MAX - Y_MIN);
    return H - PAD.bottom - ratio * (H - PAD.top - PAD.bottom);
  }

  function xOf(i, n) {
    var inner = W - PAD.left - PAD.right;
    if (n <= 1) return PAD.left + inner / 2;
    return PAD.left + (i / (n - 1)) * inner;
  }

  /* 欠測（記録忘れ）は飛ばして線を繋ぐ ＝ recharts の connectNulls 相当 */
  function linePath(data, key, n) {
    var d = "", started = false;
    for (var i = 0; i < data.length; i++) {
      var v = data[i][key];
      if (v === null || v === undefined) continue;
      var x = xOf(i, n).toFixed(1), y = yOf(v).toFixed(1);
      d += (started ? " L" : "M") + x + "," + y;
      started = true;
    }
    return d;
  }

  /* X軸ラベルの間引き。狭い画面で潰れないよう最大6個まで、両端は必ず出す */
  function labelIndexes(n) {
    if (n <= 6) {
      var all = [];
      for (var i = 0; i < n; i++) all.push(i);
      return all;
    }
    var step = Math.ceil((n - 1) / 5);
    var out = [];
    for (var j = 0; j < n; j += step) out.push(j);
    if (out[out.length - 1] !== n - 1) out.push(n - 1);
    return out;
  }

  /**
   * グラフを描画する。
   * @param {HTMLElement} container 描画先
   * @param {Array} data [{label, date, sysAm, sysPm}] 日付昇順
   * @param {Function} onPick 点をタップしたときに呼ばれる（{date,label,time,value}）
   */
  function render(container, data, onPick) {
    container.textContent = "";
    var n = data.length;
    if (!n) return;

    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label": "上の血圧の推移グラフ"
    });

    // --- 横罫線と目盛り ---
    [80, 100, 120, 140, 160].forEach(function (v) {
      var y = yOf(v);
      svg.appendChild(el("line", {
        x1: PAD.left, y1: y, x2: W - PAD.right, y2: y,
        stroke: COLOR.grid, "stroke-width": 1
      }));
      svg.appendChild(text(PAD.left - 6, y + 3.5, String(v), {
        "font-size": 10, fill: COLOR.axis, "text-anchor": "end"
      }));
    });

    // --- 135 の基準線 ---
    var gy = yOf(GUIDE);
    svg.appendChild(el("line", {
      x1: PAD.left, y1: gy, x2: W - PAD.right, y2: gy,
      stroke: COLOR.guide, "stroke-width": 1, "stroke-dasharray": "4 3"
    }));
    svg.appendChild(text(W - PAD.right, gy - 5, "135 高血圧の目安", {
      "font-size": 10, fill: COLOR.guide, "text-anchor": "end"
    }));

    // --- X軸ラベル ---
    labelIndexes(n).forEach(function (i) {
      svg.appendChild(text(xOf(i, n), H - PAD.bottom + 14, data[i].label, {
        "font-size": 10, fill: COLOR.axis, "text-anchor": "middle"
      }));
    });

    // --- 折れ線（夜を先に描いて、朝を手前に重ねる）---
    [["sysPm", COLOR.pm], ["sysAm", COLOR.am]].forEach(function (pair) {
      var d = linePath(data, pair[0], n);
      if (!d) return;
      svg.appendChild(el("path", {
        d: d, fill: "none", stroke: pair[1], "stroke-width": 2,
        "stroke-linejoin": "round", "stroke-linecap": "round"
      }));
    });

    // --- 点（タップで値を表示できるよう当たり判定を大きめに取る）---
    [["sysPm", COLOR.pm, "夜"], ["sysAm", COLOR.am, "朝"]].forEach(function (pair) {
      var key = pair[0], color = pair[1], timeLabel = pair[2];
      for (var i = 0; i < n; i++) {
        var v = data[i][key];
        if (v === null || v === undefined) continue;
        var cx = xOf(i, n), cy = yOf(v);

        var hit = el("circle", { cx: cx, cy: cy, r: 11, fill: "transparent", style: "cursor:pointer" });
        var title = el("title", {});
        title.textContent = data[i].label + " " + timeLabel + " " + v;
        hit.appendChild(title);
        if (typeof onPick === "function") {
          (function (rec, val) {
            hit.addEventListener("click", function () {
              onPick({ date: rec.date, label: rec.label, time: timeLabel, value: val });
            });
          })(data[i], v);
        }

        svg.appendChild(el("circle", { cx: cx, cy: cy, r: 2.5, fill: color }));
        svg.appendChild(hit);
      }
    });

    container.appendChild(svg);
  }

  global.BPChart = { render: render };
})(window);
