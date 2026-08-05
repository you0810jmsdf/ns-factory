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

`PostThreads.gs` の実装を確認済み。認証情報は `THREADS_ACCESS_TOKEN` /
`THREADS_USER_ID` の2つのスクリプト プロパティに入っている。

### 2-1. なぜ `postToThreadsGuarded` を使わないか

`postToThreadsGuarded()` は次の3つのガードを持つ。

| ガード | 告知で使えるか |
| --- | --- |
| KillSwitch がONなら throw | **尊重すべき**（止めている時に出したくない） |
| 投稿間隔ガード（`profile.min_interval_min`） | ⛔ 邪魔になる |
| 時間帯別 `max_posts` チェック | ⛔ 邪魔になる |

後ろ2つは**定期投稿の流量を抑えるためのもの**。手動で「掲載＋告知」を押した時に
これらに引っかかると `throw` して**告知できずに終わる**（定期投稿の直後だと確実に当たる）。

そこで、KillSwitch だけ尊重し、頻度ガードを通さない専用の呼び口を用意する。
**成否の記録（`_recordPostSuccess` / `_recordPostFailure`）は通常投稿と同じに残す**ので、
連続3失敗の自動 Kill と、月次の思想／告知比率レポートには従来どおり反映される。

### 2-2. 新しいファイルを1つ追加する

`Nsfactory-SNS-AutoPost` に **`NewsAnnounce.gs`** を新規作成して、以下を丸ごと貼る。
既存ファイルには手を入れないので、取り消したいときはこのファイルを消すだけで戻せる。

```js
// ============================================================
// お知らせ欄の掲載を Threads で告知する
// ============================================================

const NEWS_SITE_URL = 'https://you0810jmsdf.github.io/ns-factory/';

/** お知らせ本文から Threads 投稿文を組み立てる */
function buildNewsThreadsText_(text) {
  return '【お知らせ】' + text + '\n\n' +
         'サイトのお知らせ欄を更新しました。\n' +
         NEWS_SITE_URL + '\n\n' +
         '#レザークラフト #手縫い革 #Nsfactory';
}

/**
 * お知らせを Threads へ投稿する。
 *   - KillSwitch は尊重する
 *   - 間隔ガード／本数ガードは通さない（手動の告知は押した時に必ず出したいため）
 *   - 成否は通常投稿と同じく記録する
 * @param {string} text 投稿文
 * @returns {string} post_id
 */
function postNewsAnnouncement_(text) {
  if (isKillSwitchOn()) {
    const reason = PropertiesService.getScriptProperties()
      .getProperty(KS_KEYS.KILL_REASON) || 'unknown';
    throw new Error('KillSwitch ON のため告知を中止: ' + reason);
  }

  const profile = getCurrentProfile();
  try {
    const postId = postToThreads(text);
    _recordPostSuccess(profile, postId);
    return postId;
  } catch (err) {
    _recordPostFailure(profile, err);
    throw err;
  }
}

/**
 * 掲載済みのお知らせを Threads で告知する。
 * 同じ token で2回押されても二重投稿しないよう抑止する。
 * @param {string} text  お知らせ本文（日付ラベルは含めない）
 * @param {string} token 候補メールの token
 * @returns {{posted: boolean, postId: string, skipped: string}}
 */
function announceNewsOnThreads_(text, token) {
  const cache = CacheService.getScriptCache();
  const key = 'news_sns_' + token;
  if (cache.get(key)) return { posted: false, postId: '', skipped: '既に告知済み' };

  cache.put(key, '1', 21600);  // 6時間。押し直し・再送での二重投稿を防ぐ
  try {
    const postId = postNewsAnnouncement_(buildNewsThreadsText_(text));
    return { posted: true, postId: postId, skipped: '' };
  } catch (err) {
    cache.remove(key);          // 失敗したら押し直せるように戻す
    throw err;
  }
}
```

> 頻度ガードも効かせたい場合は、`postNewsAnnouncement_` の中身を
> `return postToThreadsGuarded(text);` の1行に差し替える。ただし定期投稿の直後は
> 告知が弾かれる。

### 2-3. 呼び出しを差し込む

`NewsPublish.gs` の掲載処理から1行呼ぶだけ。差し込み位置は
**掲載が成功したあと**（サイト反映に失敗したのに告知だけ出る事故を防ぐ）。

```js
announceNewsOnThreads_(text, token);
```

### 2-4. ボタンを分ける（おすすめ）

すべてのお知らせを Threads に流す必要はない。実測した候補3件はいずれも
サイトの内部改修で、告知には向かない内容だった。

候補メールにボタンをもう1つ足す:

```js
'<a href="' + webAppUrl + '?action=approve_sns&token=' + token + '" ' +
'style="background:#0a8a4a;color:#fff;padding:10px 20px;text-decoration:none;' +
'border-radius:6px;margin-right:8px">📣 掲載＋Threads告知</a>'
```

`Code.gs` の `doGet` に振り分けを足す（`action === 'approve'` の直後あたり）:

```js
if (action === 'approve_sns' && token) {
  return _handleApprove(token, { announce: true });
}
```

`_handleApprove` 側で、掲載が終わったあとに `opts.announce` なら
`announceNewsOnThreads_(text, token)` を呼ぶ。

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
