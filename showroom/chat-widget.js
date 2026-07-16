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
    // パーツ名→選択色 の構造化状態。同じパーツを選び直すと上書き（会話ログへの追記だけに頼らない）。
    // 商品を開くたび（openChatInner）にリセットする。
    var selections = {};
    // 革ギャラリーで「拡大写真を見ただけ」の候補（まだ決定していない）。
    // 「この色に決定する」を押すまでselectionsには反映されない。
    var pendingChoice = null;
    // テクスチャシミュレーター対応状況（商品ごとに1回だけ確認・案内する）
    var simChecked = false;
    var simPatternAvailable = undefined; // undefined=未確認, true/false=確認済み
    // シミュレーターで最後に確定したパーツ画像（sendToArtisan送信時に一緒に送るため保持）
    var lastTextureSimParts = null;
    // お客様が📷ボタンで添付した製作イメージ画像（sendToArtisan送信時に一緒に送る）
    var customerImages = [];
    // 2026-07-15 Phase4: AIにまだ渡していない添付画像のdataURL。
    // 添付直後の1ターンのみHearingAI-Proxyへ同梱してVision解釈させ、リクエスト発行時にクリアする
    // （毎ターン再送するとinputトークンを浪費するため。AIの解釈コメントは会話履歴テキストに残る）。
    var pendingAIImages = [];

    function $(sel) { return container.querySelector(sel); }

    // 通信エラー・一時的なAPI不調時にのみ表示する中立的なメッセージ。
    // ショールーム待機用の雑談セリフ（SHOWROOM_STAFF.lines）は流用しない。
    var CHAT_FALLBACK_LINES = [
      '只今混み合っております。少し経ってから、もう一度お試しいただけますでしょうか。',
      '申し訳ございません、只今お返事の準備に時間がかかっております。もう一度お試しください。'
    ];

    // 2026-07-10 Phase2: 自由入力層の振り分け先（Nsfactory-HearingAI-Proxy）。
    // 見積もり／作品提案／サイト案内の実務相談はこちらへ、幕僚キャラへの雑談・世間話は
    // 従来通り Nsfactory-Showroom-AIChat（opts.apiUrl / SHOWROOM_CONFIG.chatApi）へ送る。
    // Showroom-AIChat のGASコード自体は無編集（触れない方針を厳守）。
    var HEARING_AI_PROXY_URL = opts.hearingApiUrl ||
      'https://script.google.com/macros/s/AKfycbwABbFeZucU9N4k8YyhIKbUUo3JUTGX0vXPBuuX0mSEqIpblyZFtf66w7lCB9R_xkCE-w/exec';

    // 2026-07-16 Phase3: 道具の質問はキーワード辞書方式で判定し、Nsfactory-RakutenToolSearch
    // （後方幕僚室と共用のGAS。楽天API課金は無し）へ送る。
    // 2026-07-17 Phase5: 「全幕僚AIが同等の対応をできるようにする」方針（事業主指示）により
    // 旧・後方幕僚限定回答（決定事項2026-07-16）を撤廃し、全幕僚のチャットで回答する。
    // 口調のみ幕僚に合わせて切り替える（toolVoice参照）。
    var RAKUTEN_TOOL_API_URL = opts.rakutenToolApiUrl ||
      'https://script.google.com/macros/s/AKfycbxUoFN0_XMKGiI1voIKGdGioczn1WsYYTfUBI-tC-RIgnq05DfsooTcyOQlgIjTQCa95A/exec';

    function getFallbackLines(staffId) {
      if (typeof opts.getFallbackLines === 'function') {
        return opts.getFallbackLines(staffId) || CHAT_FALLBACK_LINES;
      }
      return CHAT_FALLBACK_LINES;
    }

    // opts.productContext: mount時点の既定コンテキスト。open()の第2引数が渡されればそちらを優先。
    function openChatInner(staffId, productContext) {
      currentChatStaffId = staffId;
      currentProductContext = productContext || opts.productContext || null;
      isChatSending = false;
      selections = {};
      pendingChoice = null;
      simChecked = false;
      simPatternAvailable = undefined;
      lastTextureSimParts = null;
      customerImages = [];
      pendingAIImages = [];
      lastShownTool = null;
      nsfRenderSelectionSummary();
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
        // 購入手段・連絡先入力欄（works.html等）がある画面でのみ、自由記述の案内を出す。
        // 革色・ステッチ色以外の要望や、メール・電話以外の連絡先の書き方が分からず
        // 埋もれてしまわないようにするための一言。
        if ($('#oc-purchase-method')) {
          appendStaffMsg('サイズの変更など、他にもご要望があればこのメッセージ欄に自由にご記入ください。ご連絡先がメール・電話以外（LINE・Instagramなど）の場合は、ご利用のSNS名とIDをこちらにご記入いただけると助かります。');
        }
      }

      // 商品にfolderIdがある場合、「革の色を見る」を選ぶ前の相談開始時点で
      // テクスチャシミュレーター対応状況を確認し、対応可否にかかわらず最初の画面から案内する。
      var simFolderId = currentProductContext && currentProductContext.folderId;
      if (simFolderId && (staffId === 'hannbai' || staffId === 'kojinjigyonusi')) {
        simChecked = true;
        checkPatternAvailability(simFolderId).then(function (avail) {
          simPatternAvailable = avail;
          appendStaffMsg(avail
            ? '🎉 この作品はテクスチャシミュレーターで革の質感を試せます！下の「テクスチャシミュレーターで試す」からどうぞ。'
            : '🎨 テクスチャシミュレーターは、この作品はまだ型紙データが未登録のため準備中です。');
          nsfDefaultChips();
        });
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
      bubble.textContent = text + (isFallback ? '\n※現在通信が混み合っております' : '');
      col.appendChild(bubble);
      div.appendChild(col);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    // 革スワッチの拡大写真をポップアップ表示（別タブだと戻り方が分からないお客様がいるため、
    // 同一画面内のライトボックスにする。DOM/スタイルはJSで自己完結させ、
    // works.html/showroom側にHTML追加を不要にしている）。
    function nsfShowImageLightbox(src) {
      var overlay = document.getElementById('nsf-img-lightbox');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'nsf-img-lightbox';
        overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(10,8,5,0.85);'
          + 'align-items:center;justify-content:center;padding:24px;cursor:zoom-out;';
        // 画像とボタンを同じ枠（frame）に入れ、×を画像の右上角に密着させる
        // （overlay基準の絶対配置だと、画像が小さい時にボタンだけ画面の隅へ離れてしまうため）。
        var frame = document.createElement('div');
        frame.style.cssText = 'position:relative;display:inline-block;max-width:100%;max-height:100%;cursor:default;';
        frame.addEventListener('click', function (e) { e.stopPropagation(); });
        var img = document.createElement('img');
        img.id = 'nsf-img-lightbox-img';
        img.style.cssText = 'display:block;max-width:100%;max-height:calc(100vh - 48px);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.5);';
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', '閉じる');
        closeBtn.style.cssText = 'position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;'
          + 'border:1px solid rgba(255,255,255,.5);background:#2a1e10;color:#fff;font-size:20px;'
          + 'line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);';
        function hide() { overlay.style.display = 'none'; }
        closeBtn.addEventListener('click', hide);
        overlay.addEventListener('click', hide);
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && overlay.style.display === 'flex') hide();
        });
        frame.appendChild(img);
        frame.appendChild(closeBtn);
        overlay.appendChild(frame);
        document.body.appendChild(overlay);
      }
      overlay.querySelector('#nsf-img-lightbox-img').src = src;
      overlay.style.display = 'flex';
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
    var hearingStitchColors = null;
    function loadStitchColors(url) {
      return fetch(url, { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return (j && j.stitchColors && j.stitchColors.length) ? j.stitchColors : null; })
        .catch(function () { return null; });
    }
    // 革カタログ読込完了を外部（works.html等）から待てるようにする（自動色ギャラリー表示用）
    var hearingReadyPromise = Promise.resolve();
    if (global.NSF_HEARING) {
      hearingReadyPromise = Promise.all([
        global.NSF_HEARING.loadKB(NSF_ROOT_BASE + 'order_estimate/hearing-kb.json'),
        global.NSF_HEARING.loadLeathers(NSF_ROOT_BASE + 'order_estimate/leather-catalog.json'),
        loadStitchColors(NSF_ROOT_BASE + 'order_estimate/stitch-colors.json')
      ]).then(function (res) {
        hearingKB = res[0];
        hearingLeathers = res[1];
        hearingStitchColors = res[2];
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
    // ステッチ糸在庫: order_estimate/stitch-thread-stock.csv（thread_id,name,label,available,note）
    // 革のような%残量ではなく単純な在庫あり/なし（available=TRUE/FALSE）。
    var nsfStitchStock = null; // thread_id(=stitch-colors.jsonのid) -> true/false
    function nsfLoadStitchStock() {
      return fetch(NSF_ROOT_BASE + 'order_estimate/stitch-thread-stock.csv?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) {
          if (!t) return;
          var rows = nsfParseCsv(t);
          var map = {};
          rows.forEach(function (r) { map[r.thread_id] = /^true$/i.test(r.available); });
          nsfStitchStock = map;
        }).catch(function () {});
    }
    nsfLoadLeatherStock();
    nsfLoadRingStock();
    nsfLoadStitchStock();
    // 監理画面での更新を「開きっぱなしのタブ」にも反映する:
    // タブに戻ってきたとき（2分以上経過時）と、10分ごとに在庫を再取得
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() - nsfStockFetchedAt > 2 * 60 * 1000) {
        nsfLoadLeatherStock();
        nsfLoadRingStock();
        nsfLoadStitchStock();
      }
    });
    setInterval(function () {
      nsfLoadLeatherStock();
      nsfLoadRingStock();
      nsfLoadStitchStock();
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

    /* 2026-07-16 Phase3: 道具の質問か判定（広めの網。厳密な工程・道具特定はGAS側の辞書で行う）。
       「道具/工具」の一般語に加え、頻出の工程名・道具名を列挙。他幕僚の会話に紛れ込む
       誤爆（例:「道具箱みたいな手帳」）は許容し、後方幕僚への案内で済ませる設計。 */
    var TOOL_INTENT_PATTERN = /(道具|工具|型紙|裁断|革包丁|漉き|すき|菱目打ち|菱目|穴あけ|菱ギリ|丸ギリ|コバ|へり落とし|ウッドスリッカー|トコノール|カービング|刻印|スーベル|ホック|カシメ|ハトメ|金具|木槌|ゴム板|手縫い針|蜜蝋|ビニモ|ステッチンググルーバー|ネジ捻|染色|染料|防水スプレー|レザークリーム|レーシング|革レース|フチ捻)/;
    function nsfDetectToolIntent(text) {
      return TOOL_INTENT_PATTERN.test(text);
    }

    /* 2026-07-16 品質改善: 直前に楽天商品を見せた道具を覚えておき、「安いのない？」等の
       追随質問に同じ道具の価格の安い順で再提案できるようにする（後方幕僚チャット限定）。 */
    var lastShownTool = null;
    var CHEAPER_FOLLOWUP_PATTERN = /(安い|お手頃|もっと(安|お手頃)|予算.{0,4}(内|以内)|格安)/;
    function nsfDetectCheaperFollowup(text) {
      return CHEAPER_FOLLOWUP_PATTERN.test(text);
    }

    /* 道具回答の口調切り替え（2026-07-17 Phase5）。
       後方幕僚＝無骨な職人口調（従来文をそのまま維持）。
       他幕僚＝丁寧口調＋「後方幕僚の道具ガイドと連携した」ことを明示して個性と役割分担を残す。 */
    function toolVoice() {
      if (currentChatStaffId === 'kouhou_room') {
        return {
          miss: '……すまん、うまく聞き取れなかった。工程名（型紙・裁断・コバ磨き等）か道具名で聞いてもらえるか。',
          intro: function (p) { return p ? (p + 'の道具なら、こいつらだ。') : 'それなら、こいつが要る。'; },
          rakuten: function (name, cheap) {
            return cheap ? name + 'の安い順ならこれだ📦（楽天市場・アフィリエイトリンク）'
                         : name + 'はこちらだ📦（楽天市場・アフィリエイトリンク／口コミが多い順）';
          },
          notFound: function (name) { return name + '……すまん、いま商品が見つからなかった。'; },
          offline: 'すまん、いま道具の検索がうまく繋がらない。後方幕僚室のページから直接探してもらえるか。',
          netErr: 'すまん、通信がうまく繋がらない。少ししてからもう一度試してくれ。'
        };
      }
      return {
        miss: '申し訳ありません、うまく特定できませんでした。工程名（型紙・裁断・コバ磨き等）か道具名でお尋ねください。',
        intro: function (p) {
          return '後方幕僚の道具ガイドで調べました🛠 ' + (p ? p + 'の道具でしたら、こちらです。' : 'それでしたら、こちらの道具がおすすめです。');
        },
        rakuten: function (name, cheap) {
          return cheap ? name + 'をお安い順でご紹介します📦（楽天市場・アフィリエイトリンク）'
                       : name + 'はこちらです📦（楽天市場・アフィリエイトリンク／口コミが多い順）';
        },
        notFound: function (name) { return '申し訳ありません、' + name + 'はただいま商品が見つかりませんでした。'; },
        offline: '申し訳ありません、いま道具の検索がつながりにくいようです。後方幕僚室の道具ガイドから直接お探しいただけます。',
        netErr: '申し訳ありません、通信がうまくつながりませんでした。少し経ってからもう一度お試しください。'
      };
    }

    /* 道具の質問にキーワード辞書方式で回答し、楽天市場の商品例を案内する（全幕僚共通・口調のみ切替） */
    function showToolRecommend(query) {
      var v = toolVoice();
      showTyping();
      fetch(RAKUTEN_TOOL_API_URL + '?action=recommend&q=' + encodeURIComponent(query))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          hideTyping();
          if (!data || !data.matched || !data.tools || !data.tools.length) {
            appendStaffMsg(v.miss);
            renderChips([
              { label: '🛠️ 道具ガイドで探す', onClick: function () { global.open(NSF_ROOT_BASE + 'kouhou-room/', '_blank'); } },
              { label: '閉じる', exit: true, onClick: nsfDefaultChips }
            ]);
            return;
          }
          var intro = v.intro(data.processName);
          var lines = data.tools.map(function (t) {
            return '・' + t.name + '（' + t.priority + '／目安' + t.priceRange + '）\n  ' + t.advice;
          }).join('\n\n');
          appendStaffMsg(intro + '\n\n' + lines);
          var chips = data.tools.map(function (t) {
            return { label: '🛒 ' + t.name + 'を楽天で見る', onClick: function () { showToolRakutenItems(t); } };
          });
          chips.push({ label: '🛠️ 道具ガイドで全部見る', onClick: function () { global.open(NSF_ROOT_BASE + 'kouhou-room/', '_blank'); } });
          chips.push({ label: '閉じる', exit: true, onClick: nsfDefaultChips });
          renderChips(chips);
        })
        .catch(function () {
          hideTyping();
          appendStaffMsg(v.offline);
          renderChips([
            { label: '🛠️ 後方幕僚室を開く', onClick: function () { global.open(NSF_ROOT_BASE + 'kouhou-room/', '_blank'); } },
            { label: '閉じる', exit: true, onClick: nsfDefaultChips }
          ]);
        });
    }

    /* 選ばれた道具の楽天検索結果を画像チップで表示（kouhou-room/index.htmlのGAS呼び出しと同一API）。
       sort省略時はGAS側デフォルト（口コミ数が多い順）。「安いのない？」follow-up時はsort=+itemPrice。 */
    function showToolRakutenItems(tool, sort) {
      var v = toolVoice();
      lastShownTool = tool;
      showTyping();
      var url = RAKUTEN_TOOL_API_URL + '?action=search&keyword=' + encodeURIComponent(tool.rakutenKeyword) + '&hits=3';
      if (sort) url += '&sort=' + encodeURIComponent(sort);
      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          hideTyping();
          if (!data || data.error || !data.items || !data.items.length) {
            appendStaffMsg(v.notFound(tool.name));
            renderChips([{ label: '閉じる', exit: true, onClick: nsfDefaultChips }]);
            return;
          }
          appendStaffMsg(v.rakuten(tool.name, sort === '+itemPrice'));
          var chips = data.items.map(function (it) {
            return {
              label: it.name.length > 26 ? it.name.slice(0, 26) + '…' : it.name,
              sub: '¥' + Number(it.price).toLocaleString() + (it.reviewCount ? '（口コミ' + it.reviewCount + '）' : ''),
              image: it.image,
              onClick: function () { global.open(it.url, '_blank'); }
            };
          });
          if (sort !== '+itemPrice') {
            chips.push({ label: '💰 もっと安いのを見る', onClick: function () { showToolRakutenItems(tool, '+itemPrice'); } });
          }
          chips.push({ label: '閉じる', exit: true, onClick: nsfDefaultChips });
          renderChips(chips);
        })
        .catch(function () {
          hideTyping();
          appendStaffMsg(toolVoice().netErr);
          renderChips([{ label: '閉じる', exit: true, onClick: nsfDefaultChips }]);
        });
    }

    /* 2026-07-17 Phase5: 業務相談（HearingAI-Proxy/Claude）でも幕僚の個性を保つための口調アドオン。
       ヒアリング手順・価格・在庫の正確さは hearing-core.js のプロンプトを最優先し、
       ここでは「誰が話しているか」の演技指示だけを足す（GAS側は無編集のまま全幕僚に対応できる）。
       キャラ設定は showroom_ai_chat GAS の PERSONAS・staffKnowledge.js と整合させること。 */
    var NSF_STAFF_PERSONA_LINES = {
      kojinjigyonusi: '総司令官（個人事業主・革職人の親方）。一人称は「わし」。職人気質で温かい口調。たまに親父ギャグを挟んで少し照れる。「うちの幕僚たちはAIだが、わしの腕は生身だ」が持ちネタ。',
      sakusen: '作戦幕僚（経営戦略担当）。軍師風の丁寧な口調で、たまに物事を「作戦」「布陣」に例える。孫子をゆるく引用しがち。',
      hannbai: '販売幕僚（EC販売担当）。明るく調子のよい商売人口調。「これ、売れてます！」が口癖で、お客様を褒めるのが得意。',
      kouhou_room: '後方幕僚（仕入・CAD・段取り担当）。無骨で口数少なめの職人口調（「〜だ」「〜してくれ」）。道具と段取りの話だけ饒舌。',
      kanri: '監理幕僚（収支・見積もり担当）。数字に厳格な経理の番人。「そろばんを弾くと…」等の言い回しで、予算には誠実に寄り添う。',
      kouhou: '広報幕僚（SNS・情報発信担当）。ノリが軽いトレンドハンター。「それ、バズりますよ」等、たまにハッシュタグ口調（#最高）を使う。',
      hozen: '保全幕僚（セキュリティ担当）。用心深い門番口調。「……確認しました。問題ありません」と確かめてから話す堅物だが、実は世話焼き。',
      digital: 'デジタル幕僚（サイト・3Dショールーム設計者）。新しい技術の話で早口になる。「それ、実装できますね」が口癖。',
      jinji: '人事幕僚（レザークラフト教室担当）。褒め上手な世話焼き先生口調。温かい励ましが得意。',
      kyouiku: '教育幕僚（カタカムナ・古代叡智担当）。神秘的で達観した語り部口調。「ふむ、それもまた巡りですな」等。'
    };
    function nsfPersonaAddendum(staffId) {
      var line = NSF_STAFF_PERSONA_LINES[staffId];
      if (!line) return '';
      return '\n\n【いま応対している幕僚キャラクター】' + line +
        '\nこのキャラクターとして一貫して応対し、毎回の返答で一人称・口癖・キャラらしい言い回しのいずれかを必ず1箇所以上使う' +
        '（冒頭の呼びかけ・相槌・締めの一言に入れると自然）。' +
        'ただしキャラ付けは口調・言い回しに留め、ヒアリングの進め方・価格・在庫・仕様の正確さを常に最優先する。' +
        '発注票のまとめ方や確認項目は上記の指示どおり変えないこと。';
    }

    /* 2026-07-17 Phase5-2: 自作派サポート知識（material-guide のAIナレッジ化）。
       素材ガイドページの内容を要約して業務相談AI（Claude）に注入する。
       素材ガイドのページが増えたらここへ追記する（正本: material-guide/ 配下のHTML）。 */
    var NSF_MATERIAL_GUIDE_ADDENDUM = '\n\n【自作派（レザークラフトDIY）サポート知識】' +
      '当工房は完成品オーダーのほか、自作する方向けの型紙PDF販売（N\'s pattern）とレザークラフト教室（ジョイフルホンダカルチャースクール）も行っている。' +
      '■馬蹄型コインケース: 型紙PDFをSTORESで販売中（¥2,800税込）。必要材料は 表革=タンニン鞣しヌメ革A4×1枚（サドルレザーが初心者向け）／バネホック1組／ロウ引き糸0.8〜1.0mm 約1m／レザー用丸針2本／菱目打ち2・4本目（ピッチ3mm）／革包丁またはカッター／ゴム板／コバ仕上げ剤（トコノール等）。' +
      '■購入先の使い分け: 少量・送料重視なら楽天市場のはぎれ・カット革、産地や鞣しの明確さ重視なら専門店（誠和・協進エル・レザーマニア）。' +
      '■自作の相談（材料・道具・作り方・型紙）を受けたら上記の知識で答え、詳しい購入先一覧として「馬蹄型コインケース 材料調達ガイド」ページ ' +
      'https://you0810jmsdf.github.io/ns-factory/material-guide/horseshoe-coin-case.html を案内してよい（このURLは案内許可済み）。' +
      '道具の実売品はチャットの「道具・工具の相談」メニューからも案内できる。';

    /* 2026-07-10 Phase2: 自由入力の振り分け判定（実務相談 → HearingAI-Proxy／それ以外 → 従来のShowroom-AIChat）。
       対象は「見積もり」「作品提案」「サイト案内（進捗確認等）」「オーダーの意思表示」の4系統。
       方針: どのパターンにも明確に一致しない発言（雑談・世間話・グレーゾーン）は、
       誤判定で幕僚キャラ雑談の体験を壊さないこと、HearingAI-Proxyの日次上限（20件/日）を
       雑談で浪費しないことを優先し、あえて振り分けず従来のShowroom-AIChatに残す。 */
    var BUSINESS_INTENT_PATTERNS = [
      /見積|いくら|価格|値段|料金|予算|幾ら/,                          // 見積もり質問
      /サンプル|おすすめ|提案して|似たよう|参考に|過去.{0,4}作品|ギャラリー|作れます?か|対応(できます|可能)|カスタム|仕様変更/, // 作品提案
      /種類|ラインナップ|バリエーション/,                             // 作品提案（2026-07-14ログ「どんな種類がありますか」取りこぼし対策）
      /(写真|画像).{0,6}(見せ|みせ|ある|ほし|欲し)/,                   // 作品提案（同「写真をみせてほしい」対策。色写真はローカル即答が先に拾う）
      /進捗|進み具合|どこで(見|確認)|ページ|リンク|url/i,               // サイト案内
      /オーダー|注文|発注|作りたい|作って/,                            // オーダーの意思表示（同「作ってほしい」対策）
      /(手帳|財布|キーケース|名刺入れ|ポーチ|ペンケース|コインケース|革|レザー).{0,12}(欲し|ほし)い/ // オーダーの意思表示（同「mini6手帳が欲しい」対策。商品語とセットの時だけ発火し依頼表現全般の誤爆を避ける）
    ];
    function nsfDetectBusinessIntent(text) {
      if (!text) return false;
      for (var i = 0; i < BUSINESS_INTENT_PATTERNS.length; i++) {
        if (BUSINESS_INTENT_PATTERNS[i].test(text)) return true;
      }
      return false;
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

    /* ── オーダー進捗の即答（2026-07-17 Phase5-2）──────────────────────────
       受付番号（OP-YYMM-NNN）を含む発言に対し、orderprogress.html と同じ公開GAS
       （全件JSON）から該当番号を探してその場で要約表示する（GAS AI送信なし・回数消費なし）。
       依頼者名・非公開メモは表示しない（公開進捗ページと同等の情報のみ）。 */
    var ORDER_NO_PATTERN = /OP[-\s]?(\d{4})[-\s]?(\d{1,4})/i;
    function showProgressPrompt() {
      appendStaffMsg('オーダー進捗の確認ですね📦 受付番号（例: OP-2607-001）をメッセージ欄に入力してください。この場でお調べします。\n受付番号が分からない場合は、進捗ページから一覧をご覧いただけます。');
      renderChips([
        { label: '📦 進捗ページを開く', onClick: function () { global.open(NSF_ROOT_BASE + 'orderprogress.html', '_blank'); } },
        { label: '閉じる', exit: true, onClick: nsfDefaultChips }
      ]);
    }
    function showOrderProgressLookup(rawText) {
      var m = ORDER_NO_PATTERN.exec(rawText);
      if (!m) { showProgressPrompt(); return; }
      var pad = m[2].length >= 3 ? m[2] : ('000' + m[2]).slice(-3);
      var displayNo = 'OP-' + m[1] + '-' + pad;
      var wanted = m[1] + pad; // 数字のみで照合（ハイフン・空白・大文字小文字の揺れを吸収）
      var progressChips = [
        { label: '📦 進捗ページで詳しく見る', onClick: function () { global.open(NSF_ROOT_BASE + 'orderprogress.html', '_blank'); } },
        { label: '閉じる', exit: true, onClick: nsfDefaultChips }
      ];
      showTyping();
      fetch(ORDER_PROGRESS_GAS_URL)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          hideTyping();
          var recs = (j && j.records) || [];
          var hit = null;
          for (var i = 0; i < recs.length; i++) {
            if (String(recs[i]['受付番号'] || '').replace(/[^0-9]/g, '') === wanted) { hit = recs[i]; break; }
          }
          if (!hit) {
            appendStaffMsg('受付番号「' + displayNo + '」のオーダーが見つかりませんでした🙏 番号をお確かめのうえ、もう一度ご入力ください。進捗ページの一覧からもご確認いただけます。');
            renderChips(progressChips);
            return;
          }
          var lines = ['📦 受付番号 ' + (hit['受付番号'] || displayNo) + ' の進捗です。'];
          if (hit['品名']) lines.push('・品名: ' + hit['品名'] + (hit['サイズ'] ? '（' + hit['サイズ'] + '）' : ''));
          if (hit['ステータス']) lines.push('・現在の状況: ' + hit['ステータス']);
          if (hit['受付日']) lines.push('・受付日: ' + hit['受付日']);
          if (hit['予定完了日']) lines.push('・完成予定: ' + hit['予定完了日']);
          var tl = hit['タイムライン'];
          if (tl && tl.length) {
            lines.push('・最近の進捗:\n' + tl.slice(-2).map(function (t) {
              return '　' + (t.date || '') + ' ' + (t.text || '');
            }).join('\n'));
          }
          appendStaffMsg(lines.join('\n') + '\n\n写真つきの詳しい進捗は進捗ページでご覧いただけます。');
          renderChips(progressChips);
        })
        .catch(function () {
          hideTyping();
          appendStaffMsg('申し訳ありません、いま進捗情報につながりにくいようです。少し経ってから、もう一度お試しいただくか進捗ページから直接ご確認ください🙏');
          renderChips(progressChips);
        });
    }

    /* ── 待機時の入口チップ（2026-07-17 Phase5: 全幕僚共通の機能メニュー化）──────────
       「全ての幕僚AIが同等の対応をできるようにする」方針（事業主指示2026-07-17）により、
       旧・幕僚限定チップ（オーダー相談=販売のみ／革色・ステッチ=販売・総司令官のみ）を撤廃。
       どの幕僚からでもオーダー相談・在庫確認・作品検索・見積もり・道具相談・進捗確認へ
       到達できるようにし、幕僚ごとの個性は「得意分野チップを先頭に出す並び順」で表現する。 */
    var NSF_WORKS_CATEGORY_CHIPS = [
      { label: '📔 システム手帳', q: 'cat=' + encodeURIComponent('システム手帳') },
      { label: '📄 リフィル・手帳パーツ', q: 'q=' + encodeURIComponent('システム手帳用') },
      { label: '👛 財布・ウォレット', q: 'q=' + encodeURIComponent('ウォレット') },
      { label: '💳 カードケース', q: 'cat=' + encodeURIComponent('カードケース') },
      { label: '🔑 キーケース・キーホルダー', q: 'q=' + encodeURIComponent('キー') },
      { label: '🖼 すべての作品を見る', q: '' }
    ];
    function showWorksMenu() {
      appendStaffMsg('作品集からお探しいただけます🖼 カテゴリを選ぶと、絞り込んだ作品一覧を新しいタブで開きます。気になる作品が見つかったら、そのままこのチャットでご相談ください。');
      renderChips(NSF_WORKS_CATEGORY_CHIPS.map(function (c) {
        return { label: c.label, onClick: function () {
          global.open(NSF_ROOT_BASE + 'works.html' + (c.q ? '?' + c.q : ''), '_blank');
        } };
      }).concat([{ label: '閉じる', exit: true, onClick: nsfDefaultChips }]));
    }
    function showToolPrompt() {
      appendStaffMsg('道具のご相談ですね🛠 気になる工程（裁断・菱目打ち・コバ磨き など）や道具名を、そのままメッセージ欄に入力してください。後方幕僚の道具ガイドと連携して、目安価格と楽天市場の商品例をご案内します。');
      renderChips([
        { label: '🛠️ 道具ガイドを開く', onClick: function () { global.open(NSF_ROOT_BASE + 'kouhou-room/', '_blank'); } },
        { label: '閉じる', exit: true, onClick: nsfDefaultChips }
      ]);
    }
    /* 幕僚ごとの得意分野（待機時に先頭へ出すチップ3枚）。個性はここで表現する。 */
    var NSF_STAFF_CHIP_ORDER = {
      kojinjigyonusi: ['hearing', 'colors', 'works'],
      sakusen: ['hearing', 'estimate', 'works'],
      hannbai: ['hearing', 'works', 'colors'],
      kouhou_room: ['tools', 'colors', 'hearing'],
      kanri: ['estimate', 'hearing', 'colors'],
      kouhou: ['works', 'hearing', 'colors'],
      hozen: ['progress', 'hearing', 'works'],
      digital: ['showroom', 'works', 'hearing'],
      jinji: ['tools', 'hearing', 'works'],
      kyouiku: ['works', 'hearing', 'colors']
    };
    var NSF_CHIP_ORDER_ALL = ['hearing', 'colors', 'stitch', 'works', 'estimate', 'tools', 'progress', 'showroom'];
    function nsfCapabilityChip(id) {
      switch (id) {
        case 'hearing':
          // productContext付き（works.html等で特定の作品を見ながら開いたチャット）では、
          // 「何を作りたいか」から始まるフルオーダーヒアリングは不自然なので出さない。
          // フルオーダーは既存の「仕様変更してフルオーダー見積もりへ」ボタンに一本化する。
          if (currentProductContext) return null;
          return { label: '🧵 オーダー相談を始める', onClick: hearingStart };
        case 'colors':
          return { label: '🎨 革の色・在庫を見る', onClick: function () { showLeatherGallery('ask'); } };
        case 'stitch':
          return { label: '🧵 ステッチ色を見る', onClick: showStitchGallery };
        case 'works':
          return { label: '🖼 作品を探す', onClick: showWorksMenu };
        case 'estimate':
          return { label: '📋 見積もりシミュレーター', onClick: function () { global.open(NSF_ROOT_BASE + 'order_estimate/leather-order-estimate-v2.html', '_blank'); } };
        case 'tools':
          return { label: '🛠️ 道具・工具の相談', onClick: showToolPrompt };
        case 'progress':
          // 2026-07-17 Phase5-2: ページ直行ではなく、受付番号を聞いてチャット内で即答する
          return { label: '📦 オーダー進捗を確認', onClick: showProgressPrompt };
        case 'showroom':
          return { label: '🏬 3Dショールームへ', onClick: function () { global.open(NSF_SHOWROOM_BASE || (NSF_ROOT_BASE + 'showroom/'), '_blank'); } };
        default:
          return null;
      }
    }
    function nsfBuildMenuChips(expanded) {
      var pref = NSF_STAFF_CHIP_ORDER[currentChatStaffId] || NSF_CHIP_ORDER_ALL.slice(0, 3);
      var order = expanded
        ? pref.concat(NSF_CHIP_ORDER_ALL.filter(function (id) { return pref.indexOf(id) < 0; }))
        : pref.slice(0, 3);
      var chips = [];
      order.forEach(function (id) {
        if (id === 'showroom' && opts.venue === 'showroom') return; // ショールーム内では自分自身への誘導は出さない
        var c = nsfCapabilityChip(id);
        if (c) chips.push(c);
      });
      // 一度でも対応確認済みでテクスチャシミュレーターが使える商品なら、待機チップに常設し、
      // 色決定後もこのチップからいつでもシミュレーターをやり直せるようにする（全幕僚共通）。
      var simFolderId = currentProductContext && currentProductContext.folderId;
      if (simFolderId && simPatternAvailable === true) {
        chips.push({ label: '🎨 テクスチャシミュレーターで試す', onClick: function () { openTextureSimulator(simFolderId); } });
      } else if (simFolderId && simPatternAvailable === false) {
        chips.push({ label: '🎨 型紙シミュレーター：準備中', onClick: function () {
          appendStaffMsg('🎨 テクスチャシミュレーターは、この作品はまだ型紙データの登録が完了していないため準備中です。今しばらくお待ちください🙏');
        } });
      }
      if (!expanded) {
        chips.push({ label: '🧭 メニューをすべて見る', onClick: function () { renderChips(nsfBuildMenuChips(true)); } });
      }
      return chips;
    }
    function nsfDefaultChips() {
      clearChips();
      if (!global.NSF_HEARING) return;
      renderChips(nsfBuildMenuChips(false));
    }

    // パーツ（革色・ステッチ色など）ごとの選択。同じパーツを選び直すとselections[partLabel]を上書きし、
    // 常時表示のサマリー欄（#oc-selection-summary。無ければ何もしない）に「現在の選択」を反映する。
    // 会話ログにも残す（sendToArtisan送信のトランスクリプトに含まれる）が、最終的な選択内容は
    // このselectionsオブジェクトを正とする（会話ログの出現順に頼らない）。
    function nsfSetSelection(partLabel, name) {
      selections[partLabel] = name;
      nsfRenderSelectionSummary();
      appendUserMsg(name);
      var staffId = currentChatStaffId;
      if (!chatHistories[staffId]) chatHistories[staffId] = [];
      chatHistories[staffId].push({ role: 'user', text: partLabel + ': ' + name });
      appendStaffMsg('✅「' + partLabel + '」を「' + name + '」に選択しました（変更したい場合は他の候補を選び直せば上書きされます）。決まったら上部の購入手段・お名前・連絡先をご入力の上、「この内容で作家に送信」からお送りください。');
      nsfDefaultChips();
    }

    function nsfRenderSelectionSummary() {
      var el = $('#oc-selection-summary');
      if (!el) return;
      var keys = Object.keys(selections);
      if (!keys.length) { el.textContent = ''; el.hidden = true; return; }
      el.hidden = false;
      el.textContent = '現在の選択： ' + keys.map(function (k) { return k + '=' + selections[k]; }).join(' ／ ');
    }

    // オーダー進捗GAS（deploymentId据え置き）。型紙SVGの登録有無を事前確認するために使う。
    var ORDER_PROGRESS_GAS_URL = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';
    // folderId内にsvg1.svg/svg2.svgが登録済みかどうかを確認する（同一folderIdは結果をキャッシュして再確認しない）
    var patternAvailabilityCache = {};
    function checkPatternAvailability(folderId) {
      if (Object.prototype.hasOwnProperty.call(patternAvailabilityCache, folderId)) {
        return Promise.resolve(patternAvailabilityCache[folderId]);
      }
      return fetch(ORDER_PROGRESS_GAS_URL + '?action=svgList&folderId=' + encodeURIComponent(folderId))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var available = !!(j.ok && j.svgs && j.svgs.length);
          patternAvailabilityCache[folderId] = available;
          return available;
        })
        .catch(function () { return false; });
    }

    // ── テクスチャシミュレーター（フルスクリーンオーバーレイ、このマウント専用にDOM生成） ──
    // 型紙SVG（svg1.svg/svg2.svg）がfolderId内に無い商品はfloodfill.html側が自動で「準備中」表示するため、
    // ここでは商品ごとのfolderIdの有無だけを見ればよい（マッピング表は不要）。
    var simOverlayEl = null;
    var simIframeEl = null;
    function ensureSimOverlay() {
      if (simOverlayEl) return;
      simOverlayEl = document.createElement('div');
      simOverlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:none;flex-direction:column';
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#3d1a08;color:#fff;flex-shrink:0';
      var title = document.createElement('h3');
      title.style.cssText = 'font-size:13px;font-weight:700;margin:0';
      title.textContent = '🎨 テクスチャシミュレーターで試す';
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '✕ 閉じる';
      closeBtn.style.cssText = 'background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer';
      closeBtn.onclick = closeTextureSimulator;
      bar.appendChild(title);
      bar.appendChild(closeBtn);
      simIframeEl = document.createElement('iframe');
      simIframeEl.style.cssText = 'flex:1;border:none;width:100%;background:#fff';
      simIframeEl.src = 'about:blank';
      simOverlayEl.appendChild(bar);
      simOverlayEl.appendChild(simIframeEl);
      document.body.appendChild(simOverlayEl);
    }
    function openTextureSimulator(folderId) {
      ensureSimOverlay();
      simIframeEl.src = NSF_ROOT_BASE + 'カラーシミュレーター/pattern-color-proto/floodfill.html?folderId=' + encodeURIComponent(folderId) + '&embed=1';
      simOverlayEl.style.display = 'flex';
    }
    function closeTextureSimulator() {
      if (!simOverlayEl) return;
      simOverlayEl.style.display = 'none';
      simIframeEl.src = 'about:blank';
      // シミュレーター内canvasの十字カーソル(crosshair)が閉じた後も残ることがあるため、
      // カーソルスタイルを一度明示的にリセットしてブラウザに再計算させる
      document.body.style.cursor = 'default';
      setTimeout(function () { document.body.style.cursor = ''; }, 50);
    }
    global.addEventListener('message', function (e) {
      var data = e.data;
      if (!data || data.type !== 'nsfactory-floodfill-confirm') return;
      if (!simOverlayEl || simOverlayEl.style.display !== 'flex') return; // 自分が開いたモーダルでなければ無視（複数マウント対策）
      var parts = data.parts || [];
      lastTextureSimParts = parts;
      var withLeather = parts.filter(function (p) { return p.leatherName; });
      closeTextureSimulator();
      // パーツが1つだけなら従来通り「革色」、2色使いなど複数パーツがあればパーツ名（その1／その2）ごとに反映する
      // （以前は先頭パーツの色しかselectionsに残らず、2色目が会話に出てこない不具合があった）
      withLeather.forEach(function (p) {
        nsfSetSelection(withLeather.length > 1 ? p.label : '革色', p.leatherName);
      });
      // 金具色は革色とは別枠で記録する（革色パレットで金具色を代用して記録が混同する不具合の対策）
      if (data.metalColor) {
        nsfSetSelection('金具色', data.metalColor);
      }
    });

    function showStitchGallery() {
      if (!hearingStitchColors) {
        appendStaffMsg('ステッチ色カタログを読み込み中です。少しだけお待ちください🙏');
        return;
      }
      var stockKnown = !!nsfStitchStock;
      var list = hearingStitchColors.slice();
      if (stockKnown) {
        list.sort(function (a, b) {
          var av = nsfStitchStock[a.id] !== false; // 未収録は在庫あり扱い（安全側）
          var bv = nsfStitchStock[b.id] !== false;
          return (av === bv) ? 0 : (av ? -1 : 1);
        });
      }
      if (stockKnown) {
        var inN = list.filter(function (c) { return nsfStitchStock[c.id] !== false; }).length;
        appendStaffMsg('ステッチ色は全' + list.length + '色、いま在庫があるのは' + inN + '色です🧵\n気に入った色をタップすると選択できます。');
      } else {
        appendStaffMsg('ステッチ色は' + list.length + '色ございます🧵 気に入った色をタップすると選択できます。');
      }
      var swatchChips = list.map(function (c) {
        var sub = stockKnown ? (nsfStitchStock[c.id] !== false ? '✅ 在庫あり' : '📦 お取り寄せ') : '';
        return { label: c.name, sub: sub, image: c.image, onClick: function () { nsfSetSelection('ステッチ色', c.name); } };
      });
      var chips = [{ label: '閉じる', exit: true, onClick: nsfDefaultChips }].concat(swatchChips);
      renderChips(chips);
    }

    function showLeatherGallery(fam) {
      if (!hearingLeathers) {
        appendStaffMsg('革カタログを読み込み中です。少しだけお待ちください🙏');
        return;
      }
      if (fam === 'ask') {
        var fams = nsfColorFamilies();
        appendStaffMsg('革のお色は ' + fams.join('・') + ' をご用意しています🎨 どの系統がお好みですか？\nシリーズ名（ホースバット・コードバン・ブルガロ など）で聞いていただいてもOKです！');
        renderChips([{ label: '閉じる', exit: true, onClick: nsfDefaultChips }].concat(fams.map(function (f) {
          var n = global.NSF_HEARING.leathersByTone(hearingLeathers, f).length;
          return { label: f, sub: n + '色', onClick: function () { showLeatherGallery(f); } };
        })));
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
        lead += '\nスワッチをタップすると拡大写真で確認できます。気に入ったら「この色に決定する」を押してください。';
      } else {
        lead = fam + 'は' + list.length + '色ございます📷 スワッチをタップすると拡大写真で確認できます。気に入ったら「この色に決定する」を押してください。';
      }
      appendStaffMsg(lead);

      var simFolderId = currentProductContext && currentProductContext.folderId;

      function refreshLeatherChips() {
        var swatchChips = list.map(function (l) {
          var t = stockKnown ? nsfLeatherTier(l) : null;
          var img = nsfLeatherImg(l);
          return { label: l.name, sub: t ? NSF_TIER_BADGE[t.key] : (l.sub || ''), image: img,
                   onClick: function () {
                     nsfShowImageLightbox(img);
                     pendingChoice = { partLabel: '革色', name: l.name };
                     refreshLeatherChips();
                   } };
        });
        var chips = [
          { label: '閉じる', exit: true, onClick: function () { pendingChoice = null; nsfDefaultChips(); } },
          { label: '他の系統も見る', onClick: function () { pendingChoice = null; showLeatherGallery('ask'); } }
        ];
        if (pendingChoice && pendingChoice.partLabel === '革色') {
          chips.splice(1, 0, { label: '✅「' + pendingChoice.name + '」に決定する', onClick: nsfConfirmPending });
        }
        if (simFolderId && simPatternAvailable === true) {
          chips.push({ label: '🎨 テクスチャシミュレーターで試す', onClick: function () { openTextureSimulator(simFolderId); } });
        } else if (simFolderId && simPatternAvailable === false) {
          chips.push({ label: '🎨 型紙シミュレーター：準備中', onClick: function () {
            appendStaffMsg('🎨 テクスチャシミュレーターは、この作品はまだ型紙データの登録が完了していないため準備中です。今しばらくお待ちください🙏');
          } });
        }
        renderChips(chips.concat(swatchChips));
      }
      refreshLeatherChips();

      // このチャットセッション中、商品ごとに1回だけテクスチャシミュレーターの対応状況を確認・案内する
      if (simFolderId && !simChecked) {
        simChecked = true;
        checkPatternAvailability(simFolderId).then(function (avail) {
          simPatternAvailable = avail;
          appendStaffMsg(avail
            ? '🎨 この作品はテクスチャシミュレーターで革の質感を試せます！下の「テクスチャシミュレーターで試す」からどうぞ。'
            : '🎨 テクスチャシミュレーターは、この作品はまだ型紙データが未登録のため準備中です。');
          refreshLeatherChips();
        });
      }
    }

    // 商品の各部分（本体・ベルト等）ごとに革色を分けたい場合のパーツ名候補。
    // 「革色」1本しか選ばない注文が大多数のため、1色目は従来通り即座に「革色」として記録し、
    // 2色目以降を選んだ時だけパーツ名を確認する（5色選んでも「革色」1件しか残らない不具合の対策）。
    var NSF_LEATHER_PART_LABELS = ['本体', 'ベルト', 'ポケット', 'カード入れ', 'ファスナー引手', 'リング'];

    function nsfHasLeatherSelection() {
      return Object.prototype.hasOwnProperty.call(selections, '革色') ||
        NSF_LEATHER_PART_LABELS.some(function (lb) { return Object.prototype.hasOwnProperty.call(selections, lb); });
    }

    function nsfAskLeatherPartLabel(leatherName) {
      appendStaffMsg('すでに別の革色をお選びのようです。この「' + leatherName + '」は商品のどの部分のお色ですか？（パーツごとに分けて記録します。同じ部分の色を変更したいだけの場合は「前の選択を変更する」をお選びください）');
      var chips = [{ label: '前の選択を変更する（上書き）', onClick: function () { nsfSetSelection('革色', leatherName); } }]
        .concat(NSF_LEATHER_PART_LABELS.map(function (lb) {
          return { label: lb, onClick: function () { nsfSetSelection(lb, leatherName); } };
        }));
      renderChips(chips);
    }

    // 拡大写真で確認しただけの候補（pendingChoice）を、正式な選択（selections）へ反映する。
    function nsfConfirmPending() {
      if (!pendingChoice) return;
      var pc = pendingChoice;
      pendingChoice = null;
      if (nsfHasLeatherSelection()) {
        nsfAskLeatherPartLabel(pc.name);
        return;
      }
      nsfSetSelection(pc.partLabel, pc.name);
    }

    /* ===== 製作イメージ画像の添付（お客様→作家）2026-07-14 Phase3 =====
       📷ボタンで選んだ画像を端末内で縮小（長辺1280px・JPEG化）して保持し、
       「この内容で作家に送信」時に既存のimages経路（submitChatOrder）で一緒に送る。
       AIには画像を渡さない（添付→作家送信のみ方式・追加課金なし）。 */
    var NSF_MAX_CUSTOMER_IMAGES = 3;
    var NSF_IMG_MAX_EDGE = 1280;

    function nsfCompressImage(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('read error')); };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error('decode error')); };
          img.onload = function () {
            var scale = Math.min(1, NSF_IMG_MAX_EDGE / Math.max(img.width, img.height));
            var cw = Math.max(1, Math.round(img.width * scale));
            var ch = Math.max(1, Math.round(img.height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function appendUserImageMsg(dataUrl, label) {
      var msgs = $('#chat-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'chat-msg user';
      var col = document.createElement('div');
      col.className = 'chat-col';
      col.appendChild(buildChatMeta('あなた'));
      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      var img = document.createElement('img');
      img.src = dataUrl;
      img.alt = label || '添付画像';
      img.style.cssText = 'max-width:160px;max-height:160px;border-radius:8px;display:block;cursor:zoom-in;';
      img.addEventListener('click', function () { nsfShowImageLightbox(dataUrl); });
      bubble.appendChild(img);
      var cap = document.createElement('div');
      cap.style.cssText = 'font-size:11px;opacity:.75;margin-top:4px;';
      cap.textContent = '📷 ' + (label || '添付画像');
      bubble.appendChild(cap);
      col.appendChild(bubble);
      div.appendChild(col);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function nsfHandleCustomerImages(files) {
      var list = Array.prototype.slice.call(files || []).filter(function (f) {
        return /^image\//.test(f.type);
      });
      if (!list.length) {
        appendStaffMsg('画像ファイル（JPEG・PNGなど）のみ添付できます🙏');
        return;
      }
      var room = NSF_MAX_CUSTOMER_IMAGES - customerImages.length;
      if (room <= 0) {
        appendStaffMsg('添付できる画像は' + NSF_MAX_CUSTOMER_IMAGES + '枚までです🙏');
        return;
      }
      if (list.length > room) {
        list = list.slice(0, room);
        appendStaffMsg('添付は' + NSF_MAX_CUSTOMER_IMAGES + '枚までのため、先頭の' + room + '枚のみお預かりします。');
      }
      // 添付順と表示順がずれないよう1枚ずつ直列に処理する
      list.reduce(function (chain, file) {
        return chain.then(function () {
          return nsfCompressImage(file).then(function (dataUrl) {
            var idx = customerImages.length + 1;
            var label = '製作イメージ' + idx;
            customerImages.push({
              fileName: 'customer_image_' + idx + '.jpg',
              label: 'お客様の' + label,
              dataUrl: dataUrl
            });
            pendingAIImages.push(dataUrl); // Phase4: 次のAI応答1ターンだけVision解釈に使う
            appendUserImageMsg(dataUrl, label);
            if (currentChatStaffId) {
              if (!chatHistories[currentChatStaffId]) chatHistories[currentChatStaffId] = [];
              chatHistories[currentChatStaffId].push({ role: 'user', text: '（📷 製作イメージ画像を添付: ' + label + '）' });
            }
          }).catch(function () {
            appendStaffMsg('申し訳ありません、画像の読み込みに失敗しました。別の画像でお試しください🙏');
          });
        });
      }, Promise.resolve()).then(function () {
        if (customerImages.length) {
          appendStaffMsg('画像をお預かりしました📷（' + customerImages.length + '/' + NSF_MAX_CUSTOMER_IMAGES + '枚）このままご希望をお送りいただくと、AIが画像を拝見してご提案します。「この内容で作家に送信」を押すと、ご相談内容と一緒に工房へも届きます。');
        }
      });
    }

    // 📷添付ボタンと非表示file inputを送信ボタンの隣にJSで生成する（works.html等のHTML変更は不要）
    (function setupImageAttach() {
      var sendBtnEl = $('#chat-send');
      if (!sendBtnEl || !sendBtnEl.parentNode) return;
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      var attachBtn = document.createElement('button');
      attachBtn.type = 'button';
      attachBtn.textContent = '📷';
      attachBtn.title = '製作イメージの画像を添付（AIが画像を見てご提案・作家に送信時にも一緒に届きます）';
      attachBtn.setAttribute('aria-label', '製作イメージの画像を添付');
      attachBtn.style.cssText = 'border:none;background:none;font-size:18px;line-height:1;cursor:pointer;padding:4px 6px;flex-shrink:0;';
      attachBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        nsfHandleCustomerImages(fileInput.files);
        fileInput.value = '';
      });
      sendBtnEl.parentNode.insertBefore(attachBtn, sendBtnEl);
      sendBtnEl.parentNode.appendChild(fileInput);
    })();

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
      var selectionKeys = Object.keys(selections);
      var selectionLine = selectionKeys.length
        ? '【選択内容】' + selectionKeys.map(function (k) { return k + ': ' + selections[k]; }).join(' / ') + '\n\n'
        : '';
      var memoWithMethod = selectionLine + (methodLabel ? '【購入手段・希望サイト】' + methodLabel + '\n\n' : '') + historyText;
      // テクスチャシミュレーターで確定した画像があれば一緒に送る（submitChatOrderはaddConsultationの
      // 上位互換で、imagesが空の場合は従来のaddConsultationと全く同じ挙動になる）
      var images = (lastTextureSimParts || []).map(function (p, i) {
        return {
          fileName: 'color_sim_' + (i + 1) + '.png',
          label: (p.label || ('パーツ' + (i + 1))) + (p.leatherName ? (': ' + p.leatherName) : ''),
          base64: p.imageDataUrl.split(',')[1]
        };
      });
      // お客様が📷ボタンで添付した製作イメージ画像も同じimages経路で送る
      customerImages.forEach(function (ci) {
        images.push({ fileName: ci.fileName, label: ci.label, base64: ci.dataUrl.split(',')[1] });
      });
      var payload = {
        action: 'submitChatOrder',
        client: client,
        contact: contact,
        item: (currentProductContext && currentProductContext.name) || '',
        memo: memoWithMethod,
        images: images
      };
      var sendBtn = container.querySelector('#oc-send-to-artisan');
      if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '送信中…'; }
      fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ok) {
            isConsultationSent = true;
            if (sendBtn) { sendBtn.textContent = '送信済み✓'; }
            // お客様がブラウザで見返せるよう、送信した注文内容の控えをlocalStorageへ保存する
            try {
              var receipt = {
                orderNo: data.orderNo || '',
                sentAt: new Date().toISOString(),
                item: payload.item,
                client: client,
                contact: contact,
                purchaseMethod: methodLabel,
                selections: selections,
                memo: memoWithMethod
              };
              var key = 'nsf_order_receipt_' + (data.orderNo || Date.now());
              global.localStorage.setItem(key, JSON.stringify(receipt));
            } catch (e) { /* localStorage不可の環境では控え保存のみ諦める */ }
            appendStaffMsg('この内容を作家に送信しました。内容を確認のうえ、お見積書を作成してお送りするか、追加で確認させていただきたいことがあればご記入いただいた連絡先へご連絡いたします。今しばらくお待ちください。');
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

      // 2026-07-17 Phase5-2: 受付番号（OP-xxxx-xxx）を含む発言 → 進捗をその場で即答
      // （GAS AI送信なし・回数消費なし。進捗GASの公開JSONを参照するのみ）
      if (ORDER_NO_PATTERN.test(text)) {
        if (input) input.value = '';
        appendUserMsg(text);
        showOrderProgressLookup(text);
        return;
      }
      // 受付番号なしの進捗質問 → 番号の入力を案内（Claude枠を消費しない）
      if (/(進捗|進み具合|進行状況)/.test(text)) {
        if (input) input.value = '';
        appendUserMsg(text);
        showProgressPrompt();
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

      // 2026-07-16 品質改善: 直前に道具を提示済みの状態で「安いのない？」等の追随質問が来たら、
      // 同じ道具を価格の安い順で再提案する（GAS送信なし・回数消費なし）。
      // 2026-07-17 Phase5: 後方幕僚限定を撤廃し全幕僚で有効化。
      if (lastShownTool && nsfDetectCheaperFollowup(text)) {
        if (input) input.value = '';
        appendUserMsg(text);
        showToolRakutenItems(lastShownTool, '+itemPrice');
        return;
      }

      // 2026-07-17 Phase5: 道具の質問はどの幕僚のチャットでもその場で回答する（GAS送信なし・回数消費なし）。
      // 旧・後方幕僚限定＋他幕僚は誘導のみ（決定事項2026-07-16）は「全幕僚が同等対応」方針
      // （事業主指示2026-07-17）により更新。口調は toolVoice() で幕僚に合わせて切り替える。
      if (nsfDetectToolIntent(text)) {
        if (input) input.value = '';
        appendUserMsg(text);
        showToolRecommend(text);
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

      // 2026-07-10 Phase2: 見積もり／作品提案／サイト案内の実務相談はHearingAI-Proxy（Claude・意図分岐）へ、
      // それ以外（雑談・世間話・グレーゾーン）は従来通りShowroom-AIChat（Gemini・幕僚キャラ）へ振り分ける。
      // 2026-07-15 Phase4: 未送信の添付画像がある間は、画像添付＝製作イメージ相談の強いシグナルとみなし、
      // 雑談判定でも次の1発言をHearingAI-Proxyへ送って画像を解釈させる（振り分けの取りこぼし防止）。
      var useHearingAI = !!global.NSF_HEARING && (pendingAIImages.length > 0 || nsfDetectBusinessIntent(text));

      var apiUrl, payload, contentType;
      if (useHearingAI) {
        apiUrl = HEARING_AI_PROXY_URL;
        // 2026-07-17 Phase5バグ修正: 'application/json' を指定するとブラウザがCORSプリフライト
        // (OPTIONS)を送るが、GAS WebAppはOPTIONSに応答できず全件「Failed to fetch」→
        // フォールバック文言になっていた（Phase2以来の潜在バグ・実測で確認）。
        // hearing-ai.html と同じく text/plain（プリフライト不要のsimple request）で送る。
        // GAS側は e.postData.contents をJSON.parseするだけなのでMIMEは影響しない。
        contentType = 'text/plain';
        // nsfLeatherStock（id→残量%。在庫CSV読込済み）を渡し、AIが在庫のある革を優先提案できるようにする
        var systemPrompt = global.NSF_HEARING.buildSystemPrompt(hearingKB, hearingLeathers, nsfLeatherStock) || '';
        // 2026-07-17 Phase5: 業務相談でも「どの幕僚と話しているか」を維持する（口調のみ・内容は不変）
        systemPrompt += nsfPersonaAddendum(staffId);
        // 2026-07-17 Phase5-2: 自作派サポート知識（素材ガイド）を注入
        systemPrompt += NSF_MATERIAL_GUIDE_ADDENDUM;
        var claudeHistory = chatHistories[staffId].slice(-CHAT_HISTORY_MAX).map(function (h) {
          return { role: h.role === 'model' ? 'assistant' : 'user', content: h.text };
        });
        var payloadHearing = { system: systemPrompt, history: claudeHistory };
        if (pendingAIImages.length) {
          payloadHearing.images = pendingAIImages.slice();
          pendingAIImages = []; // 1回送ったらクリア（失敗時も再送しない＝有料枠・トークンの浪費防止を優先）
        }
        payload = JSON.stringify(payloadHearing);
      } else {
        apiUrl = opts.apiUrl || (global.SHOWROOM_CONFIG && global.SHOWROOM_CONFIG.chatApi) || '';
        contentType = 'text/plain';
        var historySlice = chatHistories[staffId].slice(-CHAT_HISTORY_MAX - 1, -1);
        var payloadObj = { staffId: staffId, message: text, history: historySlice };
        // venue: 'showroom'（3Dショールーム内）を明示した場合のみそのまま送る。
        // 未指定（トップページ・商品ページ等）はGAS側で安全側の'site'として扱われる。
        if (opts.venue) payloadObj.venue = opts.venue;
        if (currentProductContext) payloadObj.productContext = currentProductContext;
        payload = JSON.stringify(payloadObj);
      }

      if (apiUrl) {
        fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': contentType }, body: payload })
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
