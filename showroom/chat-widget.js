/* =============================================================
   N's factory ショールーム チャットウィジェット（複数マウント対応）
   index.html 内に元々インラインで書かれていたチャット機能
  （通常チャット・ヒアリング・在庫アラート・カラーギャラリー）を
   ここへ切り出したもの。見た目・動作は元のまま。

   使い方:
     var widget = NsfChatWidget.mount(containerEl, {
       apiUrl: 'https://script.google.com/.../exec', // 省略時 SHOWROOM_CONFIG.chatApi
       getFallbackLines: function(staffId){ ... },     // 省略時 SHOWROOM_STAFF.lines参照
     });
     widget.open(staffId, productContext); // productContext は省略可

   containerEl の中に、元と同じ id を持つ要素が必要:
     #chat-area, #chat-messages, #chat-quick, #chat-input, #chat-send,
     #sc-avatar, #sc-name
   複数マウントするときは containerEl ごとに上記要素一式を用意すること
  （id は containerEl 内で一意であればよい。querySelector は
   containerEl.querySelector('#chat-area') のように毎回コンテナ起点で解決するため、
   同じidが複数のコンテナに存在しても干渉しない）。
   ===============================================================*/
(function (global) {
  'use strict';

  // このスクリプト自身の設置場所（.../showroom/chat-widget.js）を検出し、
  // 呼び出し元ページ（works.html＝ns-factory直下／showroom/index.html＝showroom配下）
  // に依存しない絶対パスを組み立てる基点にする。
  // document.currentScript は静的<script src="...">タグの実行中にのみ有効なため、
  // works.html・showroom/index.html どちらも動的挿入ではなく静的タグで読み込んでいる
  // 現状の実装であれば確実に取得できる。
  var NSF_SHOWROOM_BASE = (function () {
    try {
      var cs = document.currentScript;
      if (cs && cs.src) return cs.src.replace(/[^\/]*$/, ''); // 例: https://.../ns-factory/showroom/
    } catch (e) {}
    return ''; // 取得できない場合は従来の相対パス（'../'）にフォールバック
  })();
  // order_estimate/ カラーシミュレーター/ など showroom の1つ上（ns-factory直下）を指す絶対パス基点
  var NSF_ROOT_BASE = NSF_SHOWROOM_BASE ? NSF_SHOWROOM_BASE.replace(/showroom\/$/, '') : '../';

  function mount(container, opts) {
    opts = opts || {};
    container = container || document;

    // ── このマウント専用の状態（クロージャでスコープを分離） ──────
    var chatHistories = {};
    var chatTurnCount = {};
    var CHAT_MAX_TURNS = 10;
    var CHAT_HISTORY_MAX = 8;
    var currentChatStaffId = null;
    var currentProductContext = null; // このマウントで開いているチャットの商品コンテキスト（任意）
    var isChatSending = false;

    function $(sel) { return container.querySelector(sel); }

    function getFallbackLines(staffId) {
      if (typeof opts.getFallbackLines === 'function') {
        return opts.getFallbackLines(staffId) || ['少々お待ちください。'];
      }
      var staff = (global.SHOWROOM_STAFF || []).find(function (s) { return s.id === staffId; });
      return (staff && staff.lines) ? staff.lines : ['少々お待ちください。'];
    }

    // opts.productContext: mount時点の既定コンテキスト。open()の第2引数が渡されればそちらを優先。
    function openChatInner(staffId, productContext) {
      currentChatStaffId = staffId;
      currentProductContext = productContext || opts.productContext || null;
      isChatSending = false;
      var area = $('#chat-area');
      if (!area) return;
      area.classList.remove('chat-closed');
      $('#chat-messages').innerHTML = '';
      $('#chat-input').value = '';
      var sendBtn = $('#chat-send');
      if (sendBtn) sendBtn.disabled = false;
      var turns = chatTurnCount[staffId] || 0;
      if (turns >= CHAT_MAX_TURNS) { showChatLimit(); }
      // 販売幕僚だけ、オーダー相談（ヒアリング）の入口チップを出す
      hearingReset();
      nsfDefaultChips();
      // productContext付きで開かれた場合（works.html等の商品モーダル経由）のみ、
      // 商品名入りの自動挨拶を表示する。sendChat()は通さず、送信回数も消費しない。
      // showroom本体の通常呼び出し（productContextなし）は既存のsc-line演出のみで、
      // ここでは何もしない（デグレ防止）。
      if (currentProductContext && currentProductContext.name) {
        appendStaffMsg('『' + currentProductContext.name + '』について、仕様のご相談などお聞かせください😊');
      }
    }

    function chatTimeNow() {
      var d = new Date();
      return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }

    function buildChatMeta(name) {
      var meta = document.createElement('div');
      meta.className = 'chat-meta';
      var nm = document.createElement('span');
      nm.className = 'chat-name';
      nm.textContent = name;
      var tm = document.createElement('span');
      tm.className = 'chat-time';
      tm.textContent = chatTimeNow();
      meta.appendChild(nm);
      meta.appendChild(tm);
      return meta;
    }

    function appendStaffMsg(text, isFallback) {
      var msgs = $('#chat-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'chat-msg staff';
      var scAvatar = $('#sc-avatar');
      if (scAvatar && scAvatar.src) {
        var av = document.createElement('img');
        av.className = 'chat-avatar';
        av.src = scAvatar.src;
        av.alt = '';
        div.appendChild(av);
      }
      var col = document.createElement('div');
      col.className = 'chat-col';
      var scName = $('#sc-name');
      col.appendChild(buildChatMeta(scName && scName.textContent ? scName.textContent : 'スタッフ'));
      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble' + (isFallback ? ' fallback-notice' : '');
      bubble.textContent = text + (isFallback ? '\n（AIスタッフは席を外しています）' : '');
      col.appendChild(bubble);
      div.appendChild(col);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function appendUserMsg(text) {
      var msgs = $('#chat-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'chat-msg user';
      var col = document.createElement('div');
      col.className = 'chat-col';
      col.appendChild(buildChatMeta('あなた'));
      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = text;
      col.appendChild(bubble);
      div.appendChild(col);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping() {
      var msgs = $('#chat-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.id = 'typing-indicator';
      div.className = 'chat-typing';
      div.textContent = '…';
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function hideTyping() {
      var el = $('#typing-indicator');
      if (el) el.remove();
    }

    function showChatLimit() {
      var msgs = $('#chat-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'chat-limit-msg';
      div.textContent = 'ありがとうございます。続きはぜひ実物でお会いしましょう。';
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      var area = $('#chat-area');
      if (area) area.classList.add('chat-closed');
    }

    /* ===== オーダー相談（ヒアリング）モード：販売幕僚専用・端末内で完結 =====
       知識・フローは ../order_estimate/hearing-core.js ＋ hearing-kb.json を共用。
       通常のAIチャット（GAS）とは独立して動き、送信回数制限も消費しない。 */
    var hearingKB = global.NSF_HEARING ? global.NSF_HEARING.DEFAULT_KB : null;
    // assetBase: hearing-core.js内の革画像パス（quickチップのimage）はここを基点に解決される。
    // 既定値'../'はshowroom基準の相対パスのため、works.html等の別階層から呼ばれると404になる。
    var hearingCore = global.NSF_HEARING ? global.NSF_HEARING.build(hearingKB, null, { assetBase: NSF_ROOT_BASE }) : null;
    var hearing = null; // {picking, prodKey, flow, step, answers, awaitKey, isLast, done}
    var hearingLeathers = null;
    // 革カタログ読込完了を外部（works.html等）から待てるようにする（自動色ギャラリー表示用）
    var hearingReadyPromise = Promise.resolve();
    if (global.NSF_HEARING) {
      hearingReadyPromise = Promise.all([
        global.NSF_HEARING.loadKB(NSF_ROOT_BASE + 'order_estimate/hearing-kb.json'),
        global.NSF_HEARING.loadLeathers(NSF_ROOT_BASE + 'order_estimate/leather-catalog.json')
      ]).then(function (res) {
        hearingKB = res[0];
        hearingLeathers = res[1];
        hearingCore = global.NSF_HEARING.build(hearingKB, hearingLeathers, { assetBase: NSF_ROOT_BASE });
      });
    }

    function clearChips() { var q = $('#chat-quick'); if (q) q.innerHTML = ''; }
    function renderChips(items) {
      var q = $('#chat-quick'); if (!q) return;
      q.innerHTML = '';
      (items || []).forEach(function (it) {
        var b = document.createElement('button');
        b.className = 'chat-chip' + (it.exit ? ' chip-exit' : '') + (it.image ? ' chip-img' : '');
        if (it.image) {
          var img = document.createElement('img');
          img.src = it.image; img.loading = 'lazy'; img.alt = '';
          img.addEventListener('error', function () { img.remove(); b.classList.remove('chip-img'); });
          b.appendChild(img);
        }
        var lb = document.createElement('span');
        lb.className = 'chip-label';
        lb.textContent = it.label;
        b.appendChild(lb);
        if (it.sub) { var s = document.createElement('span'); s.className = 'chip-sub'; s.textContent = it.sub; b.appendChild(s); }
        b.addEventListener('click', function () { it.onClick ? it.onClick() : hearingAnswer(it.val, it.label); });
        q.appendChild(b);
      });
    }
    function hearingReset() { hearing = null; clearChips(); }
    function hearingStart() {
      if (!hearingCore) return;
      hearing = { picking: true, answers: {}, step: 0 };
      appendStaffMsg(hearingKB.greeting || 'どんなアイテムをお考えですか？');
      var prods = hearingCore.PRODUCTS;
      var chips = Object.keys(prods).map(function (k) {
        return { label: prods[k].emoji + ' ' + prods[k].name, sub: prods[k].sub || '', val: k };
      });
      chips.push({ label: '相談をやめる', exit: true, onClick: hearingExit });
      renderChips(chips);
    }
    function hearingExit() {
      hearingReset();
      appendStaffMsg('オーダー相談を終了しました。またいつでもお声がけください。');
      nsfDefaultChips();
    }
    function hearingRunStep() {
      var a = hearing.answers;
      var step = hearing.flow[hearing.step];
      while (step && step.skipIf && step.skipIf(a)) { hearing.step++; step = hearing.flow[hearing.step]; }
      if (!step) { hearingFinish(); return; }
      var sayText = (typeof step.say === 'function') ? step.say(a) : step.say;
      var tipText = step.tip ? ((typeof step.tip === 'function') ? step.tip(a) : step.tip) : '';
      hearing.isLast = !!step.last;
      appendStaffMsg(sayText + (tipText ? '\n\n' + tipText : ''));
      var items = (typeof step.quick === 'function') ? step.quick(a) : (step.quick || []);
      var chips = (items || []).map(function (it) { return { label: it.label, sub: it.sub || '', val: it.val, image: it.image }; });
      chips.push({ label: '相談をやめる', exit: true, onClick: hearingExit });
      renderChips(chips);
      hearing.awaitKey = (typeof step.key === 'function') ? step.key(a) : step.key;
    }
    function hearingAnswer(val, label) {
      if (!hearing || hearing.done) return;
      if (hearing.picking) {
        if (!hearingCore.PRODUCTS[val]) return;
        appendUserMsg(label || val);
        hearing.picking = false;
        hearing.prodKey = val;
        hearing.flow = hearingCore.PRODUCTS[val].steps.concat(hearingCore.COMMON_TAIL);
        hearing.step = 0;
        clearChips();
        hearingRunStep();
        return;
      }
      appendUserMsg(label || val);
      if (hearing.awaitKey) hearing.answers[hearing.awaitKey] = val;
      hearing.awaitKey = null;
      clearChips();
      if (hearing.isLast) { hearingFinish(); return; }
      hearing.step++;
      hearingRunStep();
    }
    function hearingFinish() {
      if (!hearing || hearing.done) return;
      hearing.done = true;
      var r = hearingCore.buildOrderRows(hearing.prodKey, hearing.answers);
      var sheet = r.rows.map(function (row) { return '・' + row[0] + '：' + row[1]; }).join('\n');
      appendStaffMsg('ありがとうございました！ご要望を発注票にまとめました📋\n\n【発注票（ヒアリングまとめ）】\n' + sheet + '\n概算目安：' + r.rangeTxt + '\n\n※ 概算は目安です。正確なお見積りは職人が確認のうえご案内します。');
      var copyText = "【N's factory " + r.prod.name + 'オーダー 発注票】\n' + r.rows.map(function (row) { return row[0] + '：' + row[1]; }).join('\n') + '\n概算目安：' + r.rangeTxt;
      renderChips([
        { label: '📋 発注票をコピー', onClick: function () {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(copyText).then(function () {
                appendStaffMsg('発注票をコピーしました。LINEやメールに貼り付けてお送りください。');
              }).catch(function () {});
            }
          } },
        { label: '🧵 くわしく相談ページへ', onClick: function () { global.open(NSF_ROOT_BASE + 'order_estimate/hearing-ai.html', '_blank'); } },
        { label: '最初からやり直す', onClick: hearingStart },
        { label: '終了する', exit: true, onClick: hearingExit }
      ]);
    }

    /* ===== 在庫データ（革・リング） =====
       革在庫: order_estimate/leather-stock.csv（id,name,stock_status,note）
       リング在庫: order_estimate/ring-price-stock.csv（見積もりページと共用・
       在庫判定は「stock_status=in_stock かつ stock_qty>0」で見積もりページと同一）
       ※ どちらも window 直下に置き、みんなのチャット側スクリプトからも共用する */
    var nsfLeatherStock = null;  // id -> true(在庫あり)/false(お取り寄せ)
    var nsfRingRows = null;      // ring-price-stock.csv の全行

    function nsfParseCsv(text) {
      var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
      var head = lines.shift().split(',');
      return lines.map(function (line) {
        var cols = line.split(',');
        var o = {};
        head.forEach(function (h, i) { o[h.trim()] = (cols[i] || '').trim(); });
        return o;
      });
    }
    var nsfLeatherStockRows = null; // アラート用（name含む生データ）
    var nsfStockFetchedAt = 0;
    function nsfLoadLeatherStock() {
      // キャッシュ回避（GitHub Pages CDN・ブラウザキャッシュで古い在庫が残らないように）
      return fetch(NSF_ROOT_BASE + 'order_estimate/leather-stock.csv?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) {
          if (!t) return;
          var rows = nsfParseCsv(t);
          var map = {};
          rows.forEach(function (r) {
            var p = (r.stock_pct === undefined || r.stock_pct === '') ? null : Number(r.stock_pct);
            map[r.id] = (p !== null && isFinite(p)) ? Math.max(0, Math.min(100, p)) : null;
          });
          nsfLeatherStock = map;
          nsfLeatherStockRows = rows;
          global.nsfLeatherStock = map;
          nsfStockFetchedAt = Date.now();
          nsfShowOwnerStockAlert();
        }).catch(function () {});
    }
    function nsfLoadRingStock() {
      return fetch(NSF_ROOT_BASE + 'order_estimate/ring-price-stock.csv?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) {
          if (!t) return;
          nsfRingRows = nsfParseCsv(t);
          global.nsfRingRows = nsfRingRows;
        }).catch(function () {});
    }
    nsfLoadLeatherStock();
    nsfLoadRingStock();
    // 監理画面での更新を「開きっぱなしのタブ」にも反映する:
    // タブに戻ってきたとき（2分以上経過時）と、10分ごとに在庫を再取得
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() - nsfStockFetchedAt > 2 * 60 * 1000) {
        nsfLoadLeatherStock();
        nsfLoadRingStock();
      }
    });
    setInterval(function () {
      nsfLoadLeatherStock();
      nsfLoadRingStock();
    }, 10 * 60 * 1000);

    /* 在庫判定（半裁の残量%）:
         out   = 0%       … 現在在庫なし。お取り寄せ2〜3週間＋取寄せ経費が若干
         low   = 20%以下  … 残りわずか
         fresh = 80%以上  … 入荷したて（エイジング未進行でおすすめ）
         ok    = その他・%未入力 … 通常在庫
       %未入力（空欄）は在庫扱い（安全側＝案内を止めない） */
    function nsfLeatherTier(l) {
      if (!nsfLeatherStock) return null; // CSV未読込
      var p = nsfLeatherStock[l.id];
      if (p === null || p === undefined) return { key: 'ok', pct: null };
      if (p <= 0)  return { key: 'out',   pct: p };
      if (p <= 20) return { key: 'low',   pct: p };
      if (p >= 80) return { key: 'fresh', pct: p };
      return { key: 'ok', pct: p };
    }
    var NSF_TIER_BADGE = { fresh: '✨ 入荷したて', ok: '✅ 在庫あり', low: '⚠️ 残りわずか', out: '📦 お取り寄せ' };
    var NSF_TIER_RANK  = { fresh: 0, ok: 1, low: 2, out: 3 };
    /* みんなのチャット側スクリプトから使う共用ヘルパー */
    global.nsfLeatherTierKey = function (id) {
      var t = nsfLeatherTier({ id: id });
      return t ? t.key : null;
    };

    /* 在庫のあるリングを「シリーズ サイズ（手帳タイプ）: 色」の行に整形 */
    function nsfRingStockLines() {
      if (!nsfRingRows) return null;
      var inRows = nsfRingRows.filter(function (r) {
        return r.stock_status === 'in_stock' && Number(r.stock_qty || 0) > 0;
      });
      if (!inRows.length) return '';
      var groups = {}, order = [];
      inRows.forEach(function (r) {
        var key = r.series_label + ' ' + r.size_label + (r.planner_type ? '（' + r.planner_type + '）' : '');
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(r.color_label + (Number(r.stock_qty) > 1 ? '×' + r.stock_qty : ''));
      });
      return order.map(function (k) { return '・' + k + ': ' + groups[k].join('、'); }).join('\n');
    }

    /* ===== 革の色 即答ギャラリー =====
       「赤系の革ある？」等の直球の色質問に、オーダー相談フローを経ずその場で
       写真スワッチを表示する（GASに送らない＝送信回数も消費しない）。
       カタログ・色系統解決は hearing-core.js（resolveTone/leathersByTone）を共用。 */
    function nsfLeatherImg(l) { return NSF_ROOT_BASE + l.image; }

    function nsfColorFamilies() {
      if (!hearingLeathers) return [];
      var seen = {}, fams = [];
      hearingLeathers.forEach(function (l) {
        (l.tags || []).forEach(function (t) {
          if (/系$/.test(t) && !seen[t]) { seen[t] = 1; fams.push(t); }
        });
      });
      return fams;
    }

    /* ===== 店長向け 革在庫アラート =====
       店長キー保存済み端末でショールームを開いたとき、残量20%以下（0%含む）の革が
       あれば一覧パネルを表示する。来店者には表示されない。 */
    function nsfShowOwnerStockAlert() {
      try { if (!localStorage.getItem('nsf_owner_key')) return; } catch (e) { return; }
      if (!nsfLeatherStockRows || global.__nsfStockAlertClosed) return;
      var existing = document.getElementById('nsf-stock-alert');
      if (existing) existing.remove(); // 在庫再取得時は最新内容で描き直す
      var lows = nsfLeatherStockRows.filter(function (r) {
        if (r.stock_pct === undefined || r.stock_pct === '') return false;
        var p = Number(r.stock_pct);
        return isFinite(p) && p <= 20;
      });
      if (!lows.length) return;
      var box = document.createElement('div');
      box.id = 'nsf-stock-alert';
      var head = document.createElement('div');
      head.className = 'sa-head';
      head.textContent = '⚠️ 革在庫 ' + lows.length + '色が20%以下（店長のみ表示）';
      var close = document.createElement('button');
      close.className = 'sa-close';
      close.textContent = '✕';
      close.addEventListener('click', function () {
        global.__nsfStockAlertClosed = true; // このタブでは再表示しない
        box.remove();
      });
      head.appendChild(close);
      box.appendChild(head);
      var body = document.createElement('div');
      body.className = 'sa-body';
      lows.sort(function (a, b) { return Number(a.stock_pct) - Number(b.stock_pct); })
        .forEach(function (r) {
          var d = document.createElement('div');
          d.className = 'sa-row';
          var p = Number(r.stock_pct);
          d.textContent = (p <= 0 ? '📦 ' : '⚠️ ') + r.name + ' — 残り' + p + '%';
          body.appendChild(d);
        });
      box.appendChild(body);
      var link = document.createElement('a');
      link.className = 'sa-link';
      link.href = 'https://github.com/you0810jmsdf/ns-factory/edit/main/order_estimate/leather-stock.csv';
      link.target = '_blank'; link.rel = 'noopener';
      link.textContent = '📝 在庫CSVを編集する';
      box.appendChild(link);
      document.body.appendChild(box);
    }

    /* リング在庫の質問か判定 */
    function nsfDetectRingQuery(text) {
      return /リング/.test(text) && /(在庫|ある|あり|何|どんな|種類|色|サイズ|一覧|欲し|ほし)/.test(text);
    }

    /* 革の在庫の質問か判定（色指定なしの「革の在庫ある？」等） */
    function nsfDetectLeatherStockQuery(text) {
      return /(革|レザー)/.test(text) && /(在庫|取り寄せ)/.test(text);
    }

    /* リング在庫の即答 */
    function showRingStock() {
      var lines = nsfRingStockLines();
      if (lines === null) {
        appendStaffMsg('リングの在庫情報を読み込み中です。少しだけお待ちください🙏');
        return;
      }
      if (!lines) {
        appendStaffMsg('申し訳ありません、ただいまリングの在庫を切らしております。お取り寄せでご対応しますので、お気軽にご相談ください🙏');
      } else {
        appendStaffMsg('いま在庫のあるリングはこちらです📋\n' + lines + '\n\nここにない仕様（サイズ・色）もお取り寄せできます。');
      }
      renderChips([
        { label: '📋 見積もりページで詳しく見る', onClick: function () { global.open(NSF_ROOT_BASE + 'order_estimate/leather-order-estimate-v2.html', '_blank'); } },
        { label: '閉じる', exit: true, onClick: nsfDefaultChips }
      ]);
    }

    /* 革在庫の即答（系統別の在庫内訳→系統チップで写真へ） */
    function showLeatherStockSummary() {
      if (!hearingLeathers || !nsfLeatherStock) {
        appendStaffMsg('革の在庫情報を読み込み中です。少しだけお待ちください🙏');
        return;
      }
      var totals = { in: 0, fresh: 0, low: 0, out: 0 };
      var lines = [];
      var famChips = nsfColorFamilies().map(function (f) {
        var list = global.NSF_HEARING.leathersByTone(hearingLeathers, f);
        var c = { fresh: 0, ok: 0, low: 0, out: 0 };
        list.forEach(function (l) { c[nsfLeatherTier(l).key]++; });
        var inN = c.fresh + c.ok + c.low;
        totals.in += inN; totals.fresh += c.fresh; totals.low += c.low; totals.out += c.out;
        var extra = [];
        if (c.fresh) extra.push('✨' + c.fresh);
        if (c.low) extra.push('⚠️' + c.low);
        if (c.out) extra.push('📦' + c.out);
        lines.push('・' + f + ': 在庫' + inN + '色/全' + list.length + '色' + (extra.length ? '（' + extra.join('・') + '）' : ''));
        return { label: f, sub: '在庫' + inN + '色', onClick: function () { showLeatherGallery(f); } };
      });
      var msg = 'いま工房に在庫のある革は' + totals.in + '色です📷\n' + lines.join('\n');
      if (totals.fresh) msg += '\n\n✨入荷したて（' + totals.fresh + '色）はエイジングがまったく進んでいない状態から育てられるのでおすすめです！';
      if (totals.low) msg += '\n⚠️残りわずか（' + totals.low + '色）は気になっていたらお早めに。';
      if (totals.out) msg += '\n📦お取り寄せ（' + totals.out + '色）は2〜3週間ほど＋取寄せ経費が若干かかります。';
      msg += '\n\n系統を選ぶと写真をご覧いただけます。';
      appendStaffMsg(msg);
      renderChips(famChips.concat([{ label: '閉じる', exit: true, onClick: nsfDefaultChips }]));
    }

    /* 革シリーズ名の検知（カタログの系列タグと対応。GAS側 SERIES_MAP と同期を保つこと） */
    var NSF_SERIES_MAP = [
      [/ホースバット|ホースレザー|ホースハイド/i, 'ホースバット'],
      [/コードバン/i, 'コードバン'],
      [/リスシオ|LISCIO/i, 'リスシオ'],
      [/マルゴー?\s*フォグ|MARGOT\s*FOG/i, 'MARGOT FOG'],
      [/マルゴー?|MARGOT/i, 'MARGOT'],
      [/ヴァスカ|バスカ|VASCA/i, 'LINEA VASCA Box'],
      [/ブルガロ|BULGARO/i, 'BULGARO'],
      [/ネブラスカ|NEBRASKA/i, 'NEBRASKA'],
      [/テンダー|TENDER/i, 'TENDER'],
      [/リベルソ|レベルソ|REVERSO/i, 'REVERSO'],
      [/ツイスト|TWIST/i, 'TWIST'],
      [/アラスカ|ALASKA/i, 'ALASKA'],
      [/アマゾニア|AMAZZONIA/i, 'AMAZZONIA'],
      [/クラスト|CRUST/i, 'CRUST'],
      [/カントリー|COUNTRY/i, 'COUNTRY'],
      [/マリアーノ|MARIANO/i, 'MARIANO'],
      [/テキサス|TEXAS/i, 'TEXAS'],
      [/シビラ|SIBILLA/i, 'SIBILLA Liscio'],
      [/アヴァンコルピ|AVANCORPI|ホースフロント/i, 'AVANCORPI'],
      [/クロムエクセル|CHROMEXCEL/i, 'CHROMEXCEL'],
      [/デロリアン|DELOREAN|ダイニーマ/i, 'DELOREAN'],
      [/ランダード|ローンダード|LAUNDERED|洗える革/i, 'LAUNDERED'],
      [/ドリットン|ドリトン|DRITTON|ゴアテックス|GORE-?TEX/i, 'DRITTON G8'],
      [/ドロイド|DROID/i, 'DROID'],
      [/馬革/, '馬革'],
      [/ヌメ/, 'ヌメ革']
    ];
    function nsfDetectSeries(text) {
      if (!hearingLeathers) return null;
      if (!/(革|レザー|ある|あり|見せ|在庫|ほし|欲し|ください|どんな|何|色|カラー|サイズ|[？?])/.test(text)) return null;
      for (var i = 0; i < NSF_SERIES_MAP.length; i++) {
        if (NSF_SERIES_MAP[i][0].test(text)) {
          var tag = NSF_SERIES_MAP[i][1];
          // カタログに該当タグの革が存在するときだけシリーズ扱い
          if (global.NSF_HEARING.leathersByTone(hearingLeathers, tag).length) return tag;
        }
      }
      return null;
    }

    /* 商品の材質名（例:「アマゾニア」）からカタログの系列タグ（例:'AMAZZONIA'）を判定する。
       nsfDetectSeries()と違い会話文の文脈ガードを掛けない（商品データの単語をそのまま渡す用途のため）。
       商品モーダルの「オーダー相談」チャットを開いた直後の色ギャラリー自動絞り込みに使う。 */
    function nsfSeriesTagFromMaterial(text) {
      if (!hearingLeathers || !text) return null;
      for (var i = 0; i < NSF_SERIES_MAP.length; i++) {
        if (NSF_SERIES_MAP[i][0].test(text)) {
          var tag = NSF_SERIES_MAP[i][1];
          if (global.NSF_HEARING.leathersByTone(hearingLeathers, tag).length) return tag;
        }
      }
      return null;
    }

    /* 色の直球質問か判定: 系統が特定できれば系統名、色全般の質問なら 'ask'、違えば null */
    function nsfDetectLeatherColor(text) {
      if (!global.NSF_HEARING || !hearingLeathers) return null;
      if (!/(革|レザー|色|カラー)/.test(text)) return null;
      var fam = global.NSF_HEARING.resolveTone(text);
      if (fam && global.NSF_HEARING.leathersByTone(hearingLeathers, fam).length) return fam;
      if (/(色|カラー)/.test(text)) return 'ask';
      return null;
    }

    /* 待機時の入口チップ（オーダー相談＝販売幕僚のみ／革の色＝販売幕僚・個人事業主） */
    function nsfDefaultChips() {
      clearChips();
      if (!global.NSF_HEARING) return;
      var chips = [];
      if (currentChatStaffId === 'hannbai') {
        chips.push({ label: '🧵 オーダー相談（ヒアリング）を始める', onClick: hearingStart });
      }
      if (currentChatStaffId === 'hannbai' || currentChatStaffId === 'kojinjigyonusi') {
        chips.push({ label: '🎨 革の色を見る', onClick: function () { showLeatherGallery('ask'); } });
      }
      if (chips.length) renderChips(chips);
    }

    function showLeatherGallery(fam) {
      if (!hearingLeathers) {
        appendStaffMsg('革カタログを読み込み中です。少しだけお待ちください🙏');
        return;
      }
      if (fam === 'ask') {
        var fams = nsfColorFamilies();
        appendStaffMsg('革のお色は ' + fams.join('・') + ' をご用意しています🎨 どの系統がお好みですか？\nシリーズ名（ホースバット・コードバン・ブルガロ など）で聞いていただいてもOKです！');
        renderChips(fams.map(function (f) {
          var n = global.NSF_HEARING.leathersByTone(hearingLeathers, f).length;
          return { label: f, sub: n + '色', onClick: function () { showLeatherGallery(f); } };
        }).concat([{ label: '閉じる', exit: true, onClick: nsfDefaultChips }]));
        return;
      }
      var list = global.NSF_HEARING.leathersByTone(hearingLeathers, fam).slice();
      // 入荷したて→在庫あり→残りわずか→お取り寄せの順に並べ、%区分バッジを付ける
      var stockKnown = !!nsfLeatherStock;
      var cnt = { fresh: 0, ok: 0, low: 0, out: 0 };
      if (stockKnown) {
        list.forEach(function (l) { cnt[nsfLeatherTier(l).key]++; });
        list.sort(function (a, b) {
          return NSF_TIER_RANK[nsfLeatherTier(a).key] - NSF_TIER_RANK[nsfLeatherTier(b).key];
        });
      }
      var lead;
      if (stockKnown) {
        var inStockN = cnt.fresh + cnt.ok + cnt.low;
        lead = fam + 'は全' + list.length + '色、いま在庫があるのは' + inStockN + '色です📷';
        if (cnt.fresh) lead += '\n✨入荷したてが' + cnt.fresh + '色。エイジングがまったく進んでいない状態から育てられるのでおすすめです！';
        if (cnt.low) lead += '\n⚠️残りわずかが' + cnt.low + '色。気になっていたらお早めにどうぞ。';
        if (cnt.out) lead += '\n📦お取り寄せが' + cnt.out + '色。現在在庫がなく、お取り寄せに2〜3週間ほど＋取寄せ経費が若干かかります。';
        lead += '\nスワッチをタップすると拡大写真が開きます。';
      } else {
        lead = fam + 'は' + list.length + '色ございます📷 スワッチをタップすると拡大写真が開きます。';
      }
      appendStaffMsg(lead);
      var chips = list.map(function (l) {
        var t = stockKnown ? nsfLeatherTier(l) : null;
        return { label: l.name, sub: t ? NSF_TIER_BADGE[t.key] : (l.sub || ''), image: nsfLeatherImg(l),
                 onClick: function () { global.open(nsfLeatherImg(l), '_blank'); } };
      });
      chips.push({ label: '🎨 カラーシミュレーターで試す', onClick: function () { global.open(NSF_ROOT_BASE + 'カラーシミュレーター/simulator.html', '_blank'); } });
      chips.push({ label: '他の系統も見る', onClick: function () { showLeatherGallery('ask'); } });
      chips.push({ label: '閉じる', exit: true, onClick: nsfDefaultChips });
      renderChips(chips);
    }

    /* ===== この内容で作家に送信（オーダー相談の内容をGASへ送る） =====
       .oc-overlay-head 内の送信ボタンから呼ばれる。GASチャットへの通常送信とは別系統で、
       送信回数制限（CHAT_MAX_TURNS）は消費しない。二重送信防止のため isConsultationSent を見る。 */
    var isConsultationSent = false;

    // 会話履歴から名乗りパターン（「〇〇です」「〇〇と申します」）を検出する簡易正規表現
    function nsfDetectClientName(historyText) {
      var m = historyText.match(/([一-龠ぁ-んァ-ヶA-Za-zＡ-Ｚａ-ｚ0-9]{1,20})(?:と申します|です[。.\s]|といいます)/);
      return m ? m[1] : '';
    }

    // 会話履歴からメールアドレス・電話番号を検出する簡易正規表現
    function nsfDetectContact(historyText) {
      var email = historyText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (email) return email[0];
      var tel = historyText.match(/0\d{1,4}-?\d{1,4}-?\d{3,4}/);
      return tel ? tel[0] : '';
    }

    // 購入手段・希望サイトのラベル（stock-quote.htmlのPLATFORM_FEESと表記を合わせる）
    var NSF_PURCHASE_METHOD_LABELS = {
      bank: '銀行振込', btc: 'Bitcoin（BTC）', mercari: 'メルカリ', rakuma: 'ラクマ',
      paypay: 'PayPayフリマ', creema: 'Creema', minne: 'minne', base: 'BASE',
      store: 'STORES', pinkoi: 'Pinkoi'
    };

    function sendToArtisan() {
      if (isConsultationSent) return;
      var staffId = currentChatStaffId;
      var history = chatHistories[staffId] || [];
      if (!history.length) {
        global.alert('まだ会話内容がありません。チャットで相談内容を入力してから送信してください。');
        return;
      }
      var historyText = history.map(function (h) {
        return (h.role === 'user' ? 'お客様: ' : 'スタッフ: ') + h.text;
      }).join('\n');
      // 明示入力欄（works.html側で追加）があればそれを優先し、無ければ会話文からの自動抽出を使う
      var methodSel = container.querySelector('#oc-purchase-method');
      var nameInput = container.querySelector('#oc-contact-name');
      var contactInput = container.querySelector('#oc-contact-info');
      var explicitName = nameInput ? nameInput.value.trim() : '';
      var explicitContact = contactInput ? contactInput.value.trim() : '';
      var methodVal = methodSel ? methodSel.value : '';
      var methodLabel = methodVal ? (NSF_PURCHASE_METHOD_LABELS[methodVal] || methodVal) : '';
      var client = explicitName || nsfDetectClientName(historyText);
      var contact = explicitContact || nsfDetectContact(historyText);
      if (!client && !contact) {
        var proceed = global.confirm('お名前・ご連絡先が入力・会話内に見当たりませんでした。このまま送信しますか？\n（送信後、作家が返信のためにご連絡先を別途確認する場合があります）');
        if (!proceed) return;
      }
      // 注意: ここは通常のAIチャット用GAS（SHOWROOM_CONFIG.chatApi）とは別プロジェクト。
      // オーダー進捗管理GAS（order_progress_GAS.js／addConsultationアクション）宛に送る。
      var apiUrl = opts.orderProgressApiUrl || (global.SHOWROOM_CONFIG && global.SHOWROOM_CONFIG.orderProgressApi) || '';
      if (!apiUrl) {
        global.alert('送信先が未設定です。管理者にご連絡ください。');
        return;
      }
      var memoWithMethod = (methodLabel ? '【購入手段・希望サイト】' + methodLabel + '\n\n' : '') + historyText;
      var payload = {
        action: 'addConsultation',
        client: client,
        contact: contact,
        item: (currentProductContext && currentProductContext.name) || '',
        memo: memoWithMethod
      };
      var sendBtn = container.querySelector('#oc-send-to-artisan');
      if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '送信中…'; }
      fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ok) {
            isConsultationSent = true;
            if (sendBtn) { sendBtn.textContent = '送信済み✓'; }
            appendStaffMsg('この内容を作家に送信しました。追ってご連絡いたします。');
          } else {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'この内容で作家に送信'; }
            global.alert('送信に失敗しました。時間をおいて再度お試しください。');
          }
        })
        .catch(function () {
          if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'この内容で作家に送信'; }
          global.alert('通信エラーのため送信できませんでした。');
        });
    }

    // オーダー相談チャットを開き直したら、送信済み状態もリセットする
    function openChat(staffId, productContext) {
      isConsultationSent = false;
      var sendBtn = container.querySelector('#oc-send-to-artisan');
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'この内容で作家に送信'; }
      openChatInner(staffId, productContext);
    }

    var ocSendBtn = container.querySelector('#oc-send-to-artisan');
    if (ocSendBtn) ocSendBtn.addEventListener('click', sendToArtisan);

    function sendChat() {
      if (isChatSending) return;
      var input = $('#chat-input');
      var sendBtn = $('#chat-send');
      var text = input ? input.value.trim() : '';
      if (!text || !currentChatStaffId) return;
      if (text.length > 200) return;

      // ヒアリング中は自由入力も回答として扱う（GASチャットには送らない）
      if (hearing && !hearing.done) {
        if (input) input.value = '';
        if (hearing.picking) {
          appendUserMsg(text);
          appendStaffMsg('上の選択肢から、作りたいアイテムをお選びください🙂');
          return;
        }
        hearingAnswer(text, text);
        return;
      }

      // リング・革シリーズ・革在庫・革の色の直球質問 → その場で即答（GAS送信なし・回数消費なし）
      if (nsfDetectRingQuery(text)) {
        if (input) input.value = '';
        appendUserMsg(text);
        showRingStock();
        return;
      }
      var seriesTag = nsfDetectSeries(text);
      if (seriesTag) {
        if (input) input.value = '';
        appendUserMsg(text);
        showLeatherGallery(seriesTag);
        return;
      }
      var colorFam = nsfDetectLeatherColor(text);
      if (!colorFam && nsfDetectLeatherStockQuery(text)) {
        if (input) input.value = '';
        appendUserMsg(text);
        showLeatherStockSummary();
        return;
      }
      if (colorFam) {
        if (input) input.value = '';
        appendUserMsg(text);
        showLeatherGallery(colorFam);
        return;
      }

      var staffId = currentChatStaffId;
      var turns = chatTurnCount[staffId] || 0;
      if (turns >= CHAT_MAX_TURNS) { showChatLimit(); return; }

      isChatSending = true;
      if (sendBtn) sendBtn.disabled = true;
      if (input) input.value = '';

      appendUserMsg(text);
      if (!chatHistories[staffId]) chatHistories[staffId] = [];
      chatHistories[staffId].push({ role: 'user', text: text });

      showTyping();

      var apiUrl = opts.apiUrl || (global.SHOWROOM_CONFIG && global.SHOWROOM_CONFIG.chatApi) || '';
      var historySlice = chatHistories[staffId].slice(-CHAT_HISTORY_MAX - 1, -1);

      if (apiUrl) {
        var payloadObj = { staffId: staffId, message: text, history: historySlice };
        if (currentProductContext) payloadObj.productContext = currentProductContext;
        var payload = JSON.stringify(payloadObj);
        fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload })
          .then(function(res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
          .then(function(data) {
            hideTyping();
            var reply, isFallback;
            if (data.fallback || !data.reply) {
              var lines = getFallbackLines(staffId);
              reply = lines[Math.floor(Math.random() * lines.length)]; isFallback = true;
            } else { reply = data.reply; isFallback = false; }
            appendStaffMsg(reply, isFallback);
            chatHistories[staffId].push({ role: 'model', text: reply });
            chatTurnCount[staffId] = (chatTurnCount[staffId] || 0) + 1;
            if (chatTurnCount[staffId] >= CHAT_MAX_TURNS) showChatLimit();
            isChatSending = false;
            var area = $('#chat-area');
            if (area && !area.classList.contains('chat-closed')) {
              if (sendBtn) sendBtn.disabled = false;
              if (input) input.focus();
            }
          }).catch(function() {
            hideTyping();
            var lines = getFallbackLines(staffId);
            var reply = lines[Math.floor(Math.random() * lines.length)];
            appendStaffMsg(reply, true);
            chatHistories[staffId].push({ role: 'model', text: reply });
            chatTurnCount[staffId] = (chatTurnCount[staffId] || 0) + 1;
            if (chatTurnCount[staffId] >= CHAT_MAX_TURNS) showChatLimit();
            isChatSending = false;
            if (sendBtn) sendBtn.disabled = false;
          });
      } else {
        hideTyping();
        var lines = getFallbackLines(staffId);
        var reply = lines[Math.floor(Math.random() * lines.length)];
        appendStaffMsg(reply, true);
        chatHistories[staffId].push({ role: 'model', text: reply });
        chatTurnCount[staffId] = (chatTurnCount[staffId] || 0) + 1;
        if (chatTurnCount[staffId] >= CHAT_MAX_TURNS) showChatLimit();
        isChatSending = false;
        if (sendBtn) sendBtn.disabled = false;
      }
    }

    // ── イベントバインド（このコンテナ内の要素にのみ紐づく） ────────
    var sendBtn = $('#chat-send');
    if (sendBtn) sendBtn.addEventListener('click', sendChat);
    var chatInput = $('#chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
      });
    }

    // ── 公開API ───────────────────────────────────────────────
    return {
      open: openChat,
      send: sendChat,
      ready: hearingReadyPromise,
      showColors: showLeatherGallery,
      resolveSeriesTag: nsfSeriesTagFromMaterial
    };
  }

  global.NsfChatWidget = { mount: mount };
})(window);
