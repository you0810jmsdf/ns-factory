# お知らせ欄「掲載する」と Threads 告知

## 現状（2026-08-06 時点）

**「掲載する」はすでに動いています。** PC のブラウザから押すと、GAS が GitHub API で
`index.html` のお知らせ欄 `<ul>` に `<li>` を1行追記してコミットします。

実測: 2026-08-06 07:57 のコミット
`NEWS自動追記: 2026年8月 — 作品集のSOLDOUT表示を改善しました。`

GAS プロジェクトは **`Nsfactory-SNS-AutoPost`**（Threads 自動投稿と同じプロジェクト）。
「掲載する」も Threads の「⚡ 今すぐ投稿」も、**同じウェブアプリ**（デプロイID
`AKfycbxZztUxgw06jJX3E...`）の `action=approve` で処理されています。

残っている課題は次の2つ。

| 課題 | 直す場所 |
| --- | --- |
| スマホのメールアプリから押すと Google のログイン画面で止まる | GAS のデプロイ設定（§1） |
| 掲載しても Threads で告知されない | GAS にコード追加（§2） |

## サイト側の描画について（リポジトリ側・対応済み）

`index.html` のお知らせ欄は、**HTML に書かれている `<li>` に `news-data.json` の内容を
足し込む**方式にしてある（置き換えではない）。書き込み経路が2つあるため:

- ① GAS の「掲載する」→ `index.html` の `<li>` を直接コミット（**現行の経路**）
- ② Actions の `news-publish` → `news-data.json` を更新（§3 の任意経路）

置き換えにすると ① で書かれた分が消えるので、足し込みにしてある。
**同じ本文は自動的に1件にまとめる**ので、二重に載ることはない
（実際に 2026-08-06 に重複が発生したため、この保険を入れてある）。

つまり **GAS 側を変えなくてもサイト反映は動く**。§2 の Threads 告知だけ足せばよい。

---

## §1 スマホから押せるようにする（デプロイ設定）

PC では押せてスマホで止まるのは、デプロイの公開範囲が原因。メールアプリ内のブラウザは
Google にログインしていないため、認証画面に落ちる。

GAS エディタ → 右上「デプロイ」→「デプロイを管理」→ 鉛筆アイコン（✏️）

| 項目 | 設定する値 |
| --- | --- |
| 次のユーザーとして実行 | **自分**（`you0810jmsdf@gmail.com`） |
| アクセスできるユーザー | **全員** |

⚠️ 再デプロイすると `/exec` の URL が変わる。**メール送信側のボタンURLも差し替えること。**

---

## §2 Threads で告知できるようにする

`Nsfactory-SNS-AutoPost` に以下を追加する。**既存の掲載処理はそのまま残してよい**
（サイト反映は今のままで動く。ここで足すのは告知だけ）。

### 2-1. 告知用の関数

```js
/** お知らせ本文から Threads 投稿文を組み立てる */
function buildNewsThreadsText_(text) {
  return '【お知らせ】' + text + '\n\n' +
         'サイトのお知らせ欄を更新しました。\n' +
         'https://you0810jmsdf.github.io/ns-factory/\n\n' +
         '#レザークラフト #手縫い革 #Nsfactory';
}

/**
 * Threads へ告知する。
 * 同じ token で2回押されても二重投稿しないよう、CacheService で抑止する。
 */
function announceNewsOnThreads_(text, token) {
  var cache = CacheService.getScriptCache();
  var key = 'news_sns_' + token;
  if (cache.get(key)) return { skipped: true };   // 再送・押し直し

  var body = buildNewsThreadsText_(text);

  // ★ このプロジェクトには既に Threads 投稿の関数があるはず。
  //   関数名がわかったらここを差し替えると、トークン管理を二重に持たずに済む。
  //   例: postToThreads_(body);
  var result = postThreadsText_(body);

  cache.put(key, '1', 21600);  // 6時間
  return result;
}

/** Threads API へ直接投稿する（既存の投稿関数を使えない場合の実装） */
function postThreadsText_(body) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('THREADS_ACCESS_TOKEN');
  var userId = props.getProperty('THREADS_USER_ID');
  if (!token || !userId) {
    throw new Error('スクリプトプロパティ THREADS_ACCESS_TOKEN / THREADS_USER_ID が未設定です');
  }

  var base = 'https://graph.threads.net/v1.0/' + userId;

  var created = UrlFetchApp.fetch(base + '/threads', {
    method: 'post',
    payload: { media_type: 'TEXT', text: body, access_token: token },
    muteHttpExceptions: true
  });
  if (created.getResponseCode() !== 200) {
    throw new Error('Threadsコンテナ作成失敗: ' + created.getContentText());
  }
  var creationId = JSON.parse(created.getContentText()).id;

  Utilities.sleep(3000);  // コンテナ生成待ち

  var published = UrlFetchApp.fetch(base + '/threads_publish', {
    method: 'post',
    payload: { creation_id: creationId, access_token: token },
    muteHttpExceptions: true
  });
  if (published.getResponseCode() !== 200) {
    throw new Error('Threads公開失敗: ' + published.getContentText());
  }
  return JSON.parse(published.getContentText());
}
```

> **確認してほしいこと**
> プロジェクトの設定 → スクリプト プロパティ を開き、Threads のトークンが
> どんな名前で入っているか見てください。`THREADS_ACCESS_TOKEN` /
> `THREADS_USER_ID` 以外の名前なら、上のコードのその2箇所を実際の名前に直します。
> 既存の投稿関数（`runScheduledPosts` から呼ばれているもの）の名前がわかれば、
> `postThreadsText_(body)` をその関数に置き換えるほうが確実です。

### 2-2. ボタンを1つ増やす（おすすめ）

すべてのお知らせを Threads に流す必要はない（サイトの内部改修などは告知に向かない）。
**「掲載のみ」と「掲載＋告知」を分ける**のがおすすめ。

候補メールを組み立てている箇所に、ボタンをもう1つ足す:

```js
'<a href="' + webAppUrl + '?action=approve_sns&token=' + token + '" ' +
'style="background:#0a8a4a;color:#fff;padding:10px 20px;text-decoration:none;' +
'border-radius:6px;margin-right:8px">📣 掲載＋Threads告知</a>'
```

`doGet` の振り分けに `approve_sns` を足す:

```js
if (action === 'approve_sns') {
  var item = getNewsCandidate_(token);        // ← 既存の候補取得処理に合わせる
  approveNews_(token);                        // ← 既存の「掲載する」処理をそのまま呼ぶ
  announceNewsOnThreads_(item.text, token);   // 告知を追加
  return htmlMessage_('掲載し、Threadsにも告知しました。');
}
```

全部まとめて告知したい場合は、既存の `action === 'approve'` の中に
`announceNewsOnThreads_(item.text, token);` を1行足すだけでもよい。

---

## §3（任意）news-data.json 経由に切り替える

現行の「`index.html` を直接書き換える」方式でも動くが、次の弱点がある。

- 同じ内容を2回押すと `<li>` が2行入る（2026-08-06 に発生。表示側で畳んでいるが、
  ファイルには残る）
- 年が変わったときのグループ分けを GAS 側で面倒みる必要がある

リポジトリ側に受け口を用意してあるので、切り替えると重複防止・年グループ分け・
並べ替えが自動になる。**切り替える場合は、既存の `index.html` 直接書き込みは外すこと。**

### 3-1. トークンを作る

🔗 https://github.com/settings/personal-access-tokens/new

- Repository access: `you0810jmsdf/ns-factory` のみ
- Permissions → Repository permissions → **Contents: Read and write**

スクリプト プロパティに `GITHUB_TOKEN` として登録する（値をソースに直接書かない）。

### 3-2. 送信処理

```js
const GH_OWNER = 'you0810jmsdf';
const GH_REPO  = 'ns-factory';

/**
 * @param {string} dateLabel 「2026年8月」のように西暦4桁+年で始めること
 * @param {string} text      本文（HTMLタグ不可・200字まで）
 * @param {string} id        候補メールの token をそのまま渡す（二重掲載の防止に使う）
 */
function publishNews_(dateLabel, text, id) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('スクリプトプロパティ GITHUB_TOKEN が未設定です');

  const res = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
      payload: JSON.stringify({
        event_type: 'news-publish',
        client_payload: { date: dateLabel, text: text, id: id }
      }),
      muteHttpExceptions: true
    }
  );

  const code = res.getResponseCode();
  if (code !== 204) throw new Error('dispatch失敗: ' + code + ' ' + res.getContentText());
}
```

`id` には**候補メールの `token` をそのまま渡すこと**。同じ `id` が既にあれば
`tools/add_news.js` は何もせず終了するので、2回押しても二重に載らない。

### 3-3. 動作確認

🔗 https://github.com/you0810jmsdf/ns-factory/actions/workflows/news-publish.yml

「Run workflow」で `date` に `2026年8月`、`text` に適当な文言を入れて実行。
同じ内容でもう一度実行して「既に掲載済みのため何もしません」と出れば冪等性もOK。

---

## 補足

- 候補メールの見出しが `������` になっているのは、GAS 側ソースの絵文字の文字化け。
  動作に影響はないが、開いたついでに直せる。
- 候補の中身が「サイトの内部改修」に偏っている（実測3件がすべて開発作業）。
  お知らせ欄に並んでいるのは新サービス・新ツール・決済手段といった顧客向けの発表なので、
  検知条件を「顧客に影響するものだけ」に絞ると精度が上がる。
