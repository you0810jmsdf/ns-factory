/**
 * PDF販売の「カードで購入」ボタン（Stripe Checkout・配信GAS refill_sales）
 *
 * ページ側の書き方:
 *   <a href="#" data-checkout="jhcs-02" style="display:none">カードで購入する（¥<span data-price>1,500</span>）</a>
 *   <p data-checkout-off="jhcs-02">カード決済が使えない間だけ出すもの（任意）</p>
 *   <p data-checkout-on="jhcs-02" style="display:none">カード決済が使えるときだけ出す案内（任意・押しても決済は始まらない）</p>
 *   <script src="assets/pdf-checkout.js"></script>   ← </body> の直前
 *
 * 表示の流れ（2026-09-14 事業主決定「すぐ表示・裏で確認」）:
 *   1. 読み込んだ瞬間に、ページにある商品のカードボタンを出す（GASの応答を待たない）。
 *      GAS の ping は 7〜18秒かかったり 404 で失敗したりし、その間ボタンが出ず売り逃していたため。
 *   2. 裏で ?action=ping を送り、返事が来たら正確な状態に合わせる:
 *      販売中の商品だけ残す・鍵が無い／テスト鍵（?stripe_test=1 なし）なら全部振込表示に戻す・価格をGASの値に書き換える。
 *   3. ping が最後まで失敗したら、ボタンは出したまま（押したときに決済画面を作れるかで確かめる）。
 *   4. 押して決済画面を作れなかったら、その商品を振込の申込表示に切り替えて案内する（復旧導線）。
 * ⛔ テスト鍵の間でも、ping が失敗するとボタンは見えたままになる。その場合も GAS 側がテスト決済を
 *    事業主アドレス以外に配信しないので、無料で入手されることはない。
 * ⛔ 初期状態の HTML は style="display:none" のまま（JS が動かない環境では振込申込だけが見える）。
 *    hidden 属性はページの .btn{display:…} に負けるので使わない。
 * ⛔ 再送は「GASに届かなかった応答」（HTTP非200・本文先頭が '<'）だけに限る。
 */
(function () {
  var GAS = 'https://script.google.com/macros/s/AKfycbw6KnJJdWoF3-tPwzg0GslEuN3upEykW9EhFVIdTn54FNq0UuHnryPH0MoaGVKV8px9/exec';
  var TEST_OK = /[?&]stripe_test=1(&|$)/.test(location.search);
  var BUSY_TEXT = '決済画面を準備しています…';
  var current = {};   // いま「カードで買える」扱いにしている商品 { code: {code, amount} }

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
    current = ready;
    each('[data-checkout]', function (el) {
      var p = ready[el.getAttribute('data-checkout')];
      if (el.getAttribute('aria-busy') !== 'true') el.style.display = p ? '' : 'none';
      if (p && p.amount) {
        Array.prototype.forEach.call(el.querySelectorAll('[data-price]'), function (s) { s.textContent = Number(p.amount).toLocaleString('ja-JP'); });
      }
    });
    // on / off は商品コードを空白区切りで複数書ける（どれか1つでも買えれば「買える」扱い）
    function any(el, attr) { return el.getAttribute(attr).split(/\s+/).some(function (c) { return !!ready[c]; }); }
    each('[data-checkout-off]', function (el) { el.style.display = any(el, 'data-checkout-off') ? 'none' : ''; });
    each('[data-checkout-on]', function (el) { el.style.display = any(el, 'data-checkout-on') ? '' : 'none'; });
  }

  /** 決済画面を作れなかった商品を、振込の申込表示に切り替える。 */
  function fallBack(code) {
    var next = {};
    Object.keys(current).forEach(function (c) { if (c !== code) next[c] = current[c]; });
    apply(next);
  }

  function start(el) {
    if (el.getAttribute('aria-busy') === 'true') return;
    var code = el.getAttribute('data-checkout');
    el.setAttribute('data-label', el.innerHTML);
    el.setAttribute('aria-busy', 'true');
    el.textContent = BUSY_TEXT;
    gas('action=checkout&product=' + encodeURIComponent(code), 3)
      .then(function (d) {
        if (!d.ok || !d.url) throw new Error(d.error || '決済画面を作れませんでした');
        location.href = d.url;
      })
      .catch(function (e) {
        reset(el);
        fallBack(code);
        alert('カード決済の画面を開けませんでした（' + (e && e.message ? e.message : e) + '）。\n銀行振込でのお申し込みに切り替えました。表示されたボタンからメールでお申し込みください。');
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

  // 1. すぐ表示（ページにある商品を全部「買える」扱いにする。価格はページに書いてある値のまま）
  var optimistic = {};
  each('[data-checkout]', function (el) { var c = el.getAttribute('data-checkout'); optimistic[c] = { code: c, amount: 0 }; });
  apply(optimistic);

  // 2. 裏で確認して正確な状態に合わせる（3. 失敗したら表示はそのまま）
  gas('action=ping', 3)
    .then(function (d) {
      if (!d || !d.ok) return;
      var ready = {};
      var usable = d.mode === 'live' || (d.mode === 'test' && TEST_OK);
      if (usable) (d.products || []).forEach(function (p) { if (p.ready) ready[p.code] = p; });
      if (d.mode === 'test' && TEST_OK) console.info('[pdf-checkout] Stripe テストモードで表示中');
      apply(ready);
    })
    .catch(function () { /* 表示はそのまま。押したときに決済画面を作れなければ振込に切り替える */ });
})();
