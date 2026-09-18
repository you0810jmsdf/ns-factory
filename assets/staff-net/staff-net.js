/* LP「N's factory を動かすスタッフ」の3D幕僚網（2026-09-18 事業主指示）。
   Jarvis（首席幕僚）の網を複写して使う。球に合わせると担当業務、クリックで各幕僚室へ。
   粒はノート数だけ（counts.json・ノート名は出さない）。書き出しは
   デジタル部\サイト管理\export_staff_note_counts.py。
   ⛔ Jarvis本体のAPI（/api/vault-graph）は公開ページから呼ばない。 */
(function () {
  'use strict';

  var ROOT = document.getElementById('staffNet');
  if (!ROOT) return;
  var BASE = ROOT.getAttribute('data-base') || './assets/staff-net/';

  // id は Jarvis の core.STAFF と同じ並び（粒の割り当て順が変わるため入れ替えない）
  var STAFF = [
    { id: 'operations', label: '作戦', en: 'Operations', href: './sakusen-room/', room: '作戦室',
      ja: ['全体戦略・意思決定', 'タスク管理・幕僚の調整'],
      enTasks: ['Overall strategy & decisions', 'Task management & coordination'] },
    { id: 'administration', label: '監理', en: 'Administration', href: './kanri-room/',
      ja: ['資金管理・財務戦略', '収支管理・原価計算'],
      enTasks: ['Finance & funding strategy', 'Bookkeeping & cost accounting'] },
    { id: 'sales', label: '販売', en: 'Sales', href: './hanbai-room/',
      ja: ['受注・オーダー相談', 'EC出品・マルシェ'],
      enTasks: ['Orders & custom consultations', 'Online shops & markets'] },
    { id: 'publicity', label: '広報', en: 'Publicity', href: './pr-room/',
      ja: ['SNS・ブランディング', '宣伝素材・ロゴ'],
      enTasks: ['SNS & branding', 'Promotion & logo design'] },
    { id: 'logistics', label: '後方', en: 'Logistics', href: './kouhou-room/',
      ja: ['物資調達・製造・型紙', '自動化の仕組みづくり'],
      enTasks: ['Materials, making & patterns', 'Automation tools'] },
    { id: 'security', label: '保全', en: 'Security', href: './hozen-room/',
      ja: ['情報資産の保全', '認証情報の管理'],
      enTasks: ['Protecting information assets', 'Credential management'] },
    { id: 'digital', label: 'デジタル', en: 'Digital', href: './digital-room/',
      ja: ['サイト管理・アクセス解析', '無料アプリ・デジタル販売'],
      enTasks: ['Website & analytics', 'Free apps & digital sales'] },
    { id: 'personnel', label: '人事', en: 'Personnel', href: './jinji-room/',
      ja: ['講座・カリキュラム企画', '人材戦略・組織づくり'],
      enTasks: ['Courses & curriculum', 'People & organization'] },
    { id: 'education', label: '教育', en: 'Education', href: './hitsuki/',
      ja: ['精神教育・道徳', '日月神示・カタカムナ'],
      enTasks: ['Spiritual & moral education', 'Hitsuki Shinji & Katakamuna'] }
  ];
  var BY_ID = {};
  STAFF.forEach(function (s) { BY_ID[s.id] = s; });

  function isEn() { return document.documentElement.getAttribute('lang') === 'en'; }
  function nameOf(s) { return isEn() ? s.en + ' Officer' : s.label + '幕僚'; }

  function showFallback() {
    ROOT.classList.add('is-fallback');
  }

  if (typeof window.StaffGraph3D !== 'function' || !window.THREE) { showFallback(); return; }

  // ピンチの寄り・引きの範囲（小さいほど寄る。初期値は下の graph.distance）
  var ZOOM_MIN = 3.5, ZOOM_MAX = 16;
  function clampZoom(d) { return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, d)); }

  var core = {
    STAFF: STAFF.map(function (s) { return { id: s.id, label: s.label, keywords: [] }; }),
    detectStaff: function () { return []; },
    staffPrompt: function () { return ''; }
  };

  class LpStaffNet extends window.StaffGraph3D {
    // 公開ページではJarvisのAPIを定期取得しない。counts.json を1回だけ読む。
    syncPolling() {
      if (this.countsRequested || this.destroyed) return;
      this.countsRequested = true;
      var self = this;
      fetch(BASE + 'counts.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('counts'); return r.json(); })
        .then(function (data) { if (!self.destroyed) self.applyVaultSnapshot(data); })
        .catch(function () { /* 粒なしでも球と線は表示される */ });
    }

    // ホイールはページのスクロールに使う（Jarvisの拡大縮小は無効）。
    // ただしタッチパッドのピンチ（ブラウザには Ctrl＋ホイールで届く）だけは拡大縮小にする。
    wheel(event) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      this.distance = clampZoom(this.distance * Math.exp(Math.max(-200, Math.min(200, event.deltaY)) * 0.01));
    }

    updateLabels() {
      if (!this.renderer) return;
      this.ctx.font = '11px "Yu Gothic UI", sans-serif';
      var width = Math.max(20, Math.min(250, this.width - 16) - 20);
      var en = isEn();
      for (var i = 0; i < this.nodes.length; i++) {
        var node = this.nodes[i];
        var s = BY_ID[node.id];
        var item = this.knowledge.get(node.id);
        node.labelText = s ? nameOf(s) : (en ? 'Chief of Staff' : node.label);
        node.countText = item ? String(item.count) : '';
        var lines = [node.labelText];
        if (s) {
          lines = lines.concat(en ? s.enTasks : s.ja);
          lines.push(en ? '▶ Click to open the room' : '▶ クリックで' + (s.room || s.label + '幕僚室') + 'へ');
        }
        node.tooltipLines = lines.map(function (line) { return this.fitText(line, width); }, this);
      }
    }

    keyDown(event) {
      super.keyDown(event);
      var node = this.nodes[this.focused];
      if (node && BY_ID[node.id]) {
        this.canvas.setAttribute('aria-label', nameOf(BY_ID[node.id]) +
          (isEn() ? ' selected. Press Enter to open the room.' : 'を選択中。Enterで幕僚室へ移動します。'));
      }
    }

    pointerDown(event) {
      this.lastPointerType = event.pointerType || 'mouse';
      super.pointerDown(event);
    }
  }

  var canvas = document.getElementById('staffNetCanvas');
  var webgl = document.getElementById('staffNetWebgl');
  var graph = null;
  var armed = null;

  function select(id) {
    var s = BY_ID[id];
    if (!s) return;
    // 指で触ったときは1回目で担当業務を見せ、同じ球の2回目で移動する
    if (graph && graph.lastPointerType && graph.lastPointerType !== 'mouse' && armed !== id) {
      armed = id;
      var node = graph.nodes.filter(function (n) { return n.id === id; })[0] || null;
      // 指を離した直後の pointerleave が吹き出しを消すため、その後に出す
      setTimeout(function () { graph.tooltipNode = node; }, 30);
      return;
    }
    armed = null;
    window.location.href = s.href;
  }

  try {
    graph = new LpStaffNet(canvas, {
      core: core,
      webglCanvas: webgl,
      portraitBase: BASE + 'portraits/',
      onSelect: select
    });
  } catch (e) {
    showFallback();
    return;
  }
  // Jarvisの既定（11.5）より寄せて、枠いっぱいに網を見せる（縦長のスマホは回転で端が切れないよう少し引く）
  graph.distance = ROOT.clientWidth < 520 ? 10.5 : 8.4;

  // 2本指ピンチで寄り・引き（2026-09-18 事業主指示「小さくて見えない。ピンチで拡大したい」）。
  // 複写元（Jarvis）のファイルは触らず、枠（ROOT）の捕捉段階で先に受けて、ピンチ中は回転・クリックへ渡さない。
  // 指1本の操作（回転・吹き出し・幕僚室への移動）とページの縦スクロールは従来どおり。
  (function () {
    var pts = {}, count = 0, pinch = null, swallow = false;
    function gap() {
      var ids = Object.keys(pts);
      if (ids.length < 2) return 0;
      var a = pts[ids[0]], b = pts[ids[1]];
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    function isTouch(e) { return e.pointerType === 'touch' && e.target === canvas; }
    ROOT.addEventListener('pointerdown', function (e) {
      if (!isTouch(e)) return;
      if (!pts[e.pointerId]) count++;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (count >= 2) {
        if (!pinch) {
          pinch = { d0: Math.max(10, gap()), z0: graph.distance };
          graph.releaseDrag();
          graph.tooltipNode = null;
          armed = null;
        }
        swallow = true;
        e.stopPropagation();
      }
    }, true);
    ROOT.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && count >= 2) {
        graph.distance = clampZoom(pinch.z0 * pinch.d0 / Math.max(10, gap()));
      }
      if (swallow) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    function lift(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      count--;
      if (count < 2) pinch = null;
      if (swallow) {
        e.stopPropagation();          // ピンチの指を離してもクリック（幕僚室へ移動）にしない
        if (count === 0) swallow = false;
      }
    }
    ROOT.addEventListener('pointerup', lift, true);
    ROOT.addEventListener('pointercancel', lift, true);
    // 2本指のときだけブラウザのページ拡大・スクロールを止める（1本指の縦スクロールは残す）
    function blockMulti(e) { if (e.touches && e.touches.length >= 2) e.preventDefault(); }
    canvas.addEventListener('touchstart', blockMulti, { passive: false });
    canvas.addEventListener('touchmove', blockMulti, { passive: false });
  })();

  // 画面外では描画を止める（LPのスクロールを重くしない）
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { graph.setVisible(en.isIntersecting); });
    }, { rootMargin: '120px 0px' }).observe(ROOT);
  }
  document.addEventListener('nsf:langchange', function () { graph.updateLabels(); });
})();
