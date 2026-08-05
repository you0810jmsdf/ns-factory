# お知らせ欄「掲載する」ボタンの配線手順

メールの「✅ 掲載する」を押すと ns-factory サイトのお知らせ欄に反映される、という流れを
実際に動かすための設定メモ。リポジトリ側（このドキュメント以外）はすでに実装済みで、
残りは **GAS 側の2箇所** だけ。

## 全体の流れ

```
候補メール「✅ 掲載する」
  └─ GAS WebApp /exec?action=approve&token=...
       └─ GitHub API /repos/you0810jmsdf/ns-factory/dispatches
            └─ Actions「お知らせ欄の掲載」(.github/workflows/news-publish.yml)
                 └─ tools/add_news.js が news-data.json に1件追加してコミット
                      └─ GitHub Pages 反映 → index.html が JSON を読んで表示
```

`index.html` のお知らせ欄は `news-data.json` を fetch して描画する。
JSON が読めなかったときは HTML にベタ書きしてあるフォールバックがそのまま出るので、
Actions が失敗してもお知らせ欄が空になることはない。

## 手順1 — GAS のデプロイ設定を直す（ログイン画面が出る問題）

2026-08-05 時点で、ボタンを押すと Google のログイン／権限画面が出て止まる。
これは GAS のデプロイ設定が原因。

GAS エディタ → 右上「デプロイ」→「デプロイを管理」→ 鉛筆アイコン:

| 項目 | 設定する値 |
| --- | --- |
| 次のユーザーとして実行 | **自分**（`you0810jmsdf@gmail.com`） |
| アクセスできるユーザー | **全員** |

どちらかが「アクセスしているユーザー」「自分のみ」になっていると、メールアプリ内の
ブラウザ（未ログイン／別アカウント）で開いた時点で認証画面に落ちる。

⚠️ 再デプロイすると `/exec` の URL が変わる。**メール送信側のボタンURLも新しいものに
差し替えること**。差し替えないと古い URL のまま同じ症状が続く。

## 手順2 — GitHub の Personal Access Token を GAS に登録する

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token
   - Repository access: `you0810jmsdf/ns-factory` のみ
   - Permissions → Repository permissions → **Contents: Read and write**
     （`dispatches` エンドポイントに必要）
   - 有効期限は任意。切れると掲載できなくなるので、期限をカレンダーに入れておく
2. GAS エディタ → プロジェクトの設定 → スクリプト プロパティ
   - プロパティ名 `GITHUB_TOKEN` / 値は上で作ったトークン
   - **トークンをソースに直接書かないこと**（GAS のソースはコピーが出回る）

## 手順3 — GAS に送信処理を追加する

`action=approve` の処理の中から、承認された候補1件ごとに `publishNews_()` を呼ぶ。

```js
const GH_OWNER = 'you0810jmsdf';
const GH_REPO  = 'ns-factory';

/**
 * お知らせ欄に1件掲載する。
 * @param {string} dateLabel 表示用ラベル。「2026年8月」のように西暦4桁+年で始めること
 * @param {string} text      本文（HTMLタグ不可・200字まで）
 * @param {string} id        再送しても二重掲載しないための識別子。候補のtokenをそのまま渡す
 */
function publishNews_(dateLabel, text, id) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('スクリプトプロパティ GITHUB_TOKEN が未設定です');

  const res = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json'
      },
      payload: JSON.stringify({
        event_type: 'news-publish',
        client_payload: { date: dateLabel, text: text, id: id }
      }),
      muteHttpExceptions: true
    }
  );

  const code = res.getResponseCode();
  if (code !== 204) {
    throw new Error('dispatch失敗: ' + code + ' ' + res.getContentText());
  }
}
```

### `id` について

`id` には**候補メールの `token` をそのまま渡すこと**。同じ `id` が既にあれば
`tools/add_news.js` は何もせず終了するので、ボタンを2回押しても二重に載らない。
`id` を省略すると日付+本文から自動生成されるが、本文を編集して再送すると別物と
判定されるため、`token` を渡すほうが安全。

## 動作確認

GAS を触る前でも、リポジトリ側だけで確認できる。

1. GitHub → Actions →「お知らせ欄の掲載」→ Run workflow
2. `date` に `2026年8月`、`text` に適当な文言を入れて実行
3. `news-data.json` に `auto: お知らせ欄に1件掲載` のコミットが入り、
   数分後にトップページのお知らせ欄へ出れば成功
4. 同じ内容でもう一度実行して「既に掲載済みのため何もしません」と出れば冪等性もOK

## 補足

- 候補メールの見出しが `������` になっているのは、GAS 側ソースの絵文字が文字化けして
  いるもの。動作には影響しないが、GAS を開いたついでに直せる。
- 本文に HTML タグは埋め込めない（`<` `>` があると `add_news.js` が弾く）。
  リンクを入れたいときは `client_payload` に `link_href` / `link_label` を足す。
