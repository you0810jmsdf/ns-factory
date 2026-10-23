# 改善要望「開発者からの返信」— GAS 側の追加手順

公開ツールの「💡 改善要望」ボタン（`assets/bug-report.js`）は、送信した要望の受付番号（rid）を端末に保存し、
`?action=myReports&rids=...` で返信を取りにいく。GAS（`access-counter.js` と同じデプロイ）に下記を足すと、
連絡先が未記入のユーザーにも返信が表示される。GAS 側が未対応の間、ボタンは「返信の確認機能は準備中」と出す。

## 1. スプレッドシート「不具合報告」に列を足す
見出し行に次の列を追加する（既存の `rid` 列・対応済み列はそのまま使う）。

| 見出し | 内容 |
|---|---|
| 返信 | 開発者からの返信（ここに書いて保存するだけで公開される） |
| 返信日時 | 返信を書いた日時（任意。新着の判定に使う） |

## 2. GAS に追加するコード
`doGet` の action 分岐に `myReports` を足す。**列名は実際の見出しに合わせて `COL` を直すこと**（下は仮置き）。

```js
// doGet(e) の中、他の action 分岐と同じ場所に追加
if (e.parameter.action === 'myReports') {
  return ContentService.createTextOutput(JSON.stringify(myReports_(e.parameter.rids || '')))
    .setMimeType(ContentService.MimeType.JSON);
}

function myReports_(ridsParam) {
  var COL = { rid: 'rid', reply: '返信', replyAt: '返信日時', done: '対応済み' }; // ← 見出しに合わせる
  var want = {};
  String(ridsParam).split(',').slice(0, 30).forEach(function (r) { r = r.trim(); if (r) want[r] = true; });
  var sh = SpreadsheetApp.getActive().getSheetByName('不具合報告');
  if (!sh) return { ok: false, error: 'no sheet' };
  var v = sh.getDataRange().getValues();
  var h = v[0], ix = {};
  Object.keys(COL).forEach(function (k) { ix[k] = h.indexOf(COL[k]); });
  if (ix.rid < 0) return { ok: false, error: 'no rid column' };
  var items = [];
  for (var i = 1; i < v.length; i++) {
    var rid = String(v[i][ix.rid] || '');
    if (!want[rid]) continue;            // 自分の rid だけ返す（他人の要望は見えない）
    items.push({
      rid: rid,
      reply: ix.reply >= 0 ? String(v[i][ix.reply] || '') : '',
      replyAt: ix.replyAt >= 0 && v[i][ix.replyAt] ? new Date(v[i][ix.replyAt]).toISOString() : '',
      done: ix.done >= 0 ? !!v[i][ix.done] : false
    });
  }
  return { ok: true, items: items };
}
```

- 返すのは「返信・返信日時・対応済み」だけ。要望本文・連絡先・端末情報は返さない。
- rid は送信時にブラウザが作る推測困難な文字列。持っている端末だけが自分の分を取得できる。
- 追加後は GAS を「新しいバージョンとしてデプロイ」し直す（URL は変わらない）。

## 3. 確認
1. 公開ツールで要望を1件送る（端末に rid が残る）。
2. スプレッドシートの該当行の「返信」に文字を書く。
3. 同じ端末・同じブラウザで任意の公開ツールを開く → 「改善要望」ボタンに赤い数字が出る。
4. ボタンを開き「📮 送った要望と返信を見る」で返信が表示される。
