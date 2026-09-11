/**
 * PDF販売の「カードで購入」ボタン（Stripe Checkout・配信GAS refill_sales）
 *
 * ページ側の書き方:
 *   <a href="#" data-checkout="jhcs-02" style="display:none">カードで購入する（¥<span data-price>1,500</span>）</a>
 *   <p data-checkout-off="jhcs-02">カード決済が使えない間だけ出すもの（任意）</p>
 *   <p data-checkout-on="jhcs-02" style="display:none">カード決済が使えるときだけ出す案内（任意・押しても決済は始まらない）</p>
 *   <script src="assets/pdf-checkout.js"></script>   ← </body> の直前
 *
 * - 読み込み時に配信GASへ ?action=ping を1回送り、販売可能（ready）な商品のボタンだけ表示する。
 *   価格は商品シートが正本。ボタン内の [data-price] はGASの価格で書き換える。
 * - テスト鍵の間は URL に ?stripe_test=1 があるときだけ表示する（お客様にテスト決済を見せない）。
 * - 押すと ?action=checkout で決済画面を作ってもらい、Stripe の画面へ移動する。
 * ⛔ 初期状態は style="display:none" で隠す（hidden 属性はページの .btn{display:…} に負けて見えてしまう）。
 * ⛔ 再送は「GASに届かなかった応答」（HTTP非200・本文先頭が '<'）だけに限る。
 */
(function () {
  var GAS = 'https://script.google.com/macros/s/AKfycbw6KnJJdWoF3-tPwzg0GslEuN3upEykW9EhFVIdTn54FNq0UuHnryPH0MoaGVKV8px9/exec';
  var TEST_OK = /[?&]stripe_test=1(&|$)/.test(location.search);
  var BUSY_TEXT = '決済画面を準備しています…';

  function gas(query, tries) {
    return fetch(GAS + '?' + query + '&t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        return res.text().then(function (txt) {
          if (!res.ok || !txt || txt.trim().charAt(0) === '<') { var e = new Error('サーバーが混み合っています'); e.retry = true; throw e; }
          return JSON.parse(txt);
        });
      })
      .catch(function (e) {
        if (e.retry && tries > 1) {
          return new Promise(function (r) { setTimeout(r, 800); }).then(function () { return gas(query, tries - 1); });
        }
        throw e;
      });
  }

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function apply(ready) {
    each('[data-checkout]', function (el) {
      var p = ready[el.getAttribute('data-checkout')];
      el.style.display = p ? '' : 'none';
      if (p) {
        Array.prototype.forEach.call(el.querySelectorAll('[data-price]'), function (s) { s.textContent = Number(p.amount).toLocaleString('ja-JP'); });
      }
    });
    // on / off は商品コードを空白区切りで複数書ける（どれか1つでも買えれば「買える」扱い）
    function any(el, attr) { return el.getAttribute(attr).split(/\s+/).some(function (c) { return !!ready[c]; }); }
    each('[data-checkout-off]', function (el) { el.style.display = any(el, 'data-checkout-off') ? 'none' : ''; });
    each('[data-checkout-on]', function (el) { el.style.display = any(el, 'data-checkout-on') ? '' : 'none'; });
  }

  function start(el) {
    if (el.getAttribute('aria-busy') === 'true') return;
    el.setAttribute('data-label', el.innerHTML);
    el.setAttribute('aria-busy', 'true');
    el.textContent = BUSY_TEXT;
    gas('action=checkout&product=' + encodeURIComponent(el.getAttribute('data-checkout')), 3)
      .then(function (d) {
        if (!d.ok || !d.url) throw new Error(d.error || '決済画面を作れませんでした');
        location.href = d.url;
      })
      .catch(function (e) {
        reset(el);
        alert('決済画面を開けませんでした（' + (e && e.message ? e.message : e) + '）。\n時間をおいてもう一度お試しいただくか、メールでお問い合わせください。');
      });
  }

  function reset(el) {
    if (el.getAttribute('aria-busy') !== 'true') return;
    el.innerHTML = el.getAttribute('data-label') || el.innerHTML;
    el.removeAttribute('aria-busy');
  }

  each('[data-checkout]', function (el) {
    el.addEventListener('click', function (ev) { ev.preventDefault(); start(el); });
  });
  // Stripe の画面から「戻る」で帰ってきたとき、ボタンが「準備しています…」のまま残らないようにする
  window.addEventListener('pageshow', function () { each('[data-checkout]', reset); });

  gas('action=ping', 3)
    .then(function (d) {
      var ready = {};
      var usable = d && d.ok && (d.mode === 'live' || (d.mode === 'test' && TEST_OK));
      if (usable) (d.products || []).forEach(function (p) { if (p.ready) ready[p.code] = p; });
      if (d && d.mode === 'test' && TEST_OK) console.info('[pdf-checkout] Stripe テストモードで表示中');
      apply(ready);
    })
    .catch(function () { apply({}); });
})();
