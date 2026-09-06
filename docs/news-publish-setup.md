# お知らせ欄「掲載する」と Threads 告知

## 現状（2026-09-06 時点）— §5「返信で承認」を本番実装済み

- GAS `Nsfactory-SNS-AutoPost` @50。ローカル正本は `レザークラフト\sns-gas-nsfactory\`（`NewsReply.gs`・`NewsAnnounce.gs` 新規）。
- **ボタンはスマホでも通る**（@50〜）。ボタン先は GAS 直ではなく `news-approve.html`（中継ページ）。
  スマホの Safari は複数アカウントの Cookie で `/exec` 直開きが「現在、ファイルを開くことができません」になる
  （通常Safari×・プライベート○で確定）。中継ページは Cookie なしで fetch するので通る（`sns-cancel.html` と同方式）。
  GAS 側は `format=json`（approve / approve_sns / cancel / draft_peek）で応答。⛔ ボタン先を GAS 直に戻さないこと。
- **返信でも同じ操作ができる**: 候補メールに「掲載」「告知」「不要」のどれかを返信。10分以内に結果が同スレッドへ届く。
  ボタンで処理済みの候補に返信しても二重掲載しない（下書きの有無で判定）。
- 実装は §5（返信）と §2（`NewsAnnounce.gs`）のとおり。「告知」＝掲載＋Threads投稿。告知の失敗で掲載は取り消さない。
  掲載後は `draft_<token>` を削除し、PCボタンの後押しで二重掲載しない。
- トリガーの入切・即時実行は Web経由: `?action=newsreply_trigger&pass=<合言葉>&on=1|0` / `&run=1`
  （合言葉は `保全部\.env` の `SNS_GAS_ADMIN_PASSPHRASE`）。**doGet に置く**（doPost だと無反応）。
- 8/6〜9/6 の間、この §5 は docs のみで GAS には入っていなかった（全46版に `checkNewsReplies` なし）。

## 経緯（2026-08-06 時点）

**「掲載する」はすでに動いている。** PC のブラウザから押すと GitHub Contents API で
`index.html` のお知らせ欄に `<li>` を1行追記してコミットする。

GAS プロジェクトは **`Nsfactory-SNS-AutoPost`**（Threads 自動投稿と同じプロジェクト）。

```
監理部\news_watcher.py（Claudeで日次判定）
  → doPost action=news_draft（Code.gs）→ ingestNewsDraft（NewsPublish.gs）
  → saveDraft(text,'news') + 承認メール送信
  → doGet ?action=approve（Code.gs）→ _handleApprove（kind==='news'分岐）
  → postNewsToSite（NewsPublish.gs）→ index.html へ <li> 追記
```

認証情報（スクリプト プロパティ）:

| 名前 | 用途 |
| --- | --- |
| `GITHUB_PAT_NS_FACTORY` | ns-factory 限定の Fine-grained PAT（Contents: Read and write） |
| `THREADS_ACCESS_TOKEN` / `THREADS_USER_ID` | Threads API |
| `NEWS_WATCHER_GAS_INGEST_SECRET` | news_watcher.py からの投入認証 |
| `APPROVAL_EMAIL_TO` | 承認メールの宛先 |

## 課題と対応

| # | 課題 | 対応 |
| --- | --- | --- |
| 1 | スマホのメールアプリから押すとログイン画面で止まる | §1 デプロイ設定 |
| 2 | Threads で告知されない | §2 `NewsAnnounce.gs` を追加 |
| 3 | **年がベタ書きで2027年に破綻する** | §3 掲載先を `news-data.json` に変更 |
| 4 | 告知するものを選びたい | §4 ボタンを分ける（任意） |
| 5 | **スマホで完結させたい**（事業主はPCをほとんど使わない） | §5 返信で承認する |

## サイト側の描画（リポジトリ側・対応済み）

`index.html` のお知らせ欄は、**HTML に書かれている `<li>` に `news-data.json` の内容を
足し込む**方式（置き換えではない）。書き込み経路が2つあるため。

- ① `postNewsToSite` → `index.html` の `<li>` を直接コミット（現行）
- ② Actions の `news-publish` → `news-data.json` を更新（§3 で切り替える先）

**どちらで書かれても表示される。** 同じ本文は表示時に1件へまとめるので二重に載らない。
つまり §3 に切り替えても、切り替えなくても、表示は壊れない。

---

## §1 スマホから押せるようにする（デプロイ設定）

PC では押せてスマホで止まるのは、デプロイの公開範囲が原因。メールアプリ内のブラウザは
Google にログインしていないため認証画面に落ちる。

GAS エディタ → 右上「デプロイ」→「デプロイを管理」→ 鉛筆アイコン（✏️）

| 項目 | 設定する値 |
| --- | --- |
| 次のユーザーとして実行 | **自分**（`you0810jmsdf@gmail.com`） |
| アクセスできるユーザー | **全員** |

⚠️ 再デプロイすると `/exec` の URL が変わる。`_webAppUrl()` が
`ScriptApp.getService().getUrl()` を返しているなら自動で追従するので確認すること。
固定値を返しているなら差し替えが必要。

---

## §2 Threads で告知できるようにする

### 2-1. なぜ `postToThreadsGuarded` を使わないか

`postToThreadsGuarded()` は3つのガードを持つ。

| ガード | 告知で使えるか |
| --- | --- |
| KillSwitch がONなら throw | **尊重すべき**（止めている時に出したくない） |
| 投稿間隔ガード（`profile.min_interval_min`） | ⛔ 邪魔になる |
| 時間帯別 `max_posts` チェック | ⛔ 邪魔になる |

後ろ2つは**定期投稿の流量を抑えるためのもの**。手動で押した告知がこれに当たると
`throw` して**告知できずに終わる**（定期投稿の直後だと確実に当たる）。

そこで KillSwitch だけ尊重し頻度ガードを通さない呼び口を用意する。
成否の記録（`_recordPostSuccess` / `_recordPostFailure`）は通常投稿と同じに残すので、
連続3失敗の自動 Kill と月次の思想／告知比率レポートには従来どおり反映される。

### 2-2. `NewsAnnounce.gs` を新規作成する

既存ファイルには手を入れないので、取り消したいときはこのファイルを消せば戻る。

```js
// ============================================================
// お知らせ欄の掲載を Threads で告知する
// ============================================================

var NEWS_SITE_URL = 'https://you0810jmsdf.github.io/ns-factory/';

/** 「2026年8月 — 本文」から日付ラベルを外して本文だけにする */
function _stripNewsDate_(text) {
  return String(text).replace(/^\s*\d{4}年[^—–-]*?\s*[—–-]\s*/, '').trim();
}

/** 二重投稿の抑止キー（本文から作るので token を引き回さなくてよい） */
function _newsCacheKey_(text) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, String(text), Utilities.Charset.UTF_8);
  var hex = digest.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
  return 'news_sns_' + hex;
}

/** お知らせ本文から Threads 投稿文を組み立てる */
function buildNewsThreadsText_(text) {
  return '【お知らせ】' + _stripNewsDate_(text) + '\n\n' +
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
    var reason = PropertiesService.getScriptProperties()
      .getProperty(KS_KEYS.KILL_REASON) || 'unknown';
    throw new Error('KillSwitch ON のため告知を中止: ' + reason);
  }

  var profile = getCurrentProfile();
  try {
    var postId = postToThreads(text);
    _recordPostSuccess(profile, postId);
    return postId;
  } catch (err) {
    _recordPostFailure(profile, err);
    throw err;
  }
}

/**
 * 掲載済みのお知らせを Threads で告知する。同じ本文の二重投稿は抑止する。
 * @param {string} newsText 掲載した1行（「2026年8月 — 本文」の形でよい）
 * @returns {{posted: boolean, postId: string, skipped: string}}
 */
function announceNewsOnThreads_(newsText) {
  var cache = CacheService.getScriptCache();
  var key = _newsCacheKey_(newsText);
  if (cache.get(key)) return { posted: false, postId: '', skipped: '既に告知済み' };

  cache.put(key, '1', 21600);  // 6時間。押し直し・再送での二重投稿を防ぐ
  try {
    var postId = postNewsAnnouncement_(buildNewsThreadsText_(newsText));
    return { posted: true, postId: postId, skipped: '' };
  } catch (err) {
    cache.remove(key);          // 失敗したら押し直せるように戻す
    throw err;
  }
}
```

> 頻度ガードも効かせたい場合は `postNewsAnnouncement_` の中身を
> `return postToThreadsGuarded(text);` の1行に差し替える。ただし定期投稿の直後は
> 告知が弾かれる。

### 2-3. 呼び出しを1行足す

`NewsPublish.gs` の `postNewsToSite` の **`return` の直前**に足す。
掲載が成功したあとに告知する順序にすること（サイト反映に失敗したのに
告知だけ Threads に出る事故を防ぐため）。

```js
  // 告知の失敗で掲載処理まで落とさない。掲載は既に完了しているため、
  // ここで throw すると「エラーに見えて押し直す」→ サイトに <li> が2行入る。
  try { announceNewsOnThreads_(newsText); } catch (e) { Logger.log('Threads告知失敗: ' + e); }
  return JSON.parse(putRes.getContentText()).commit.sha;
```

⛔ **`try` を外さないこと。** `postNewsToSite` には重複チェックが無いので、
告知の失敗で画面がエラーになると押し直しが起き、お知らせが二重に載る
（2026-08-06 に同じ状態が実際に発生している）。
告知が失敗したときは実行ログに `Threads告知失敗:` が残るので、そこで気づける。

これで全件が告知される。選びたい場合は §4 へ。

---

## §3 年のベタ書きを解消する（掲載先を news-data.json に変更）

### 3-1. 何が問題か

```js
var NEWS_SECTION_MARKER = '<span>2026年のお知らせ</span>';
```

**年が固定されている。** 2027年1月のお知らせは 2026年のグループに入る。
見出しを変更した場合は「NEWSセクションの目印が見つかりません」で掲載できなくなる。

また `postNewsToSite` は重複チェックをしないので、同じ内容を2回掲載すると
`<li>` が2行入る（2026-08-06 に実際に発生。表示側で畳んでいるがファイルには残る）。

### 3-2. 対応

掲載先を `index.html` の直接書き換えから `news-data.json` に変える。
年グループの生成・並べ替え・重複チェックは `tools/add_news.js` が行う。

**PAT は今あるものをそのまま使える**（`GITHUB_PAT_NS_FACTORY` は Contents:
Read and write なので `dispatches` も通る）。新しいトークンは不要。

`postNewsToSite` の**中身をこれに差し替える**。関数名と引数は変えないので
`_handleApprove` 側は無変更でよい。

```js
/**
 * 承認後、GitHub の repository_dispatch を投げて news-data.json を更新させる。
 * 年グループの生成・並べ替え・重複チェックはリポジトリ側（tools/add_news.js）が行う。
 * @param {string} newsText 「2026年8月 — 本文」の形の1行
 * @returns {string} 受け付けた印（デバッグ用）
 */
function postNewsToSite(newsText) {
  var pat = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT_NS_FACTORY');
  if (!pat) throw new Error('GITHUB_PAT_NS_FACTORY が Script Properties に未設定です');

  var res = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + NEWS_GITHUB_OWNER + '/' + NEWS_GITHUB_REPO + '/dispatches',
    {
      method: 'post',
      headers: { Authorization: 'token ' + pat, Accept: 'application/vnd.github+json' },
      contentType: 'application/json',
      payload: JSON.stringify({
        event_type: 'news-publish',
        client_payload: {
          line: String(newsText),
          id: _newsCacheKey_(newsText)   // 再送しても二重掲載しないための識別子
        }
      }),
      muteHttpExceptions: true
    }
  );

  var code = res.getResponseCode();
  if (code !== 204) throw new Error('dispatch失敗: ' + code + ' ' + res.getContentText());
  return 'dispatched';
}
```

`NEWS_SECTION_MARKER` と `checkNewsGithubAccess()` は使わなくなるので消してよい
（残しても害はない）。

### 3-3. 動作確認

GAS を触る前にリポジトリ側だけで確認できる。

🔗 https://github.com/you0810jmsdf/ns-factory/actions/workflows/news-publish.yml

「Run workflow」→ `line` に `2026年8月 — テスト掲載です。` を入れて実行。
同じ内容でもう一度実行して「既に掲載済みのため何もしません」と出れば冪等性もOK。

---

## §4（任意）告知するものを選べるようにする

すべてのお知らせを Threads に流す必要はない。実測した候補3件はいずれも
サイトの内部改修で、告知には向かない内容だった。

§2-3 の1行を入れず、代わりにボタンを分ける。

**メール文面**（`sendNewsApprovalEmail`）にボタンを1つ足す:

```js
  var approveSnsUrl = baseUrl + '?action=approve_sns&token=' + token;
```

```js
    '<a href="' + approveSnsUrl + '" style="background:#0a8a4a;color:#fff;padding:10px 20px;' +
    'text-decoration:none;border-radius:6px;margin-right:8px">📣 掲載＋Threads告知</a>' +
```

**`Code.gs` の `doGet`**（`action === 'approve'` の分岐の直後に足す）:

```js
  if (action === 'approve_sns' && token) {
    return _handleApprove(token, true);
  }
```

**`_handleApprove`** の `kind === 'news'` 分岐で、掲載が終わったあとに:

```js
function _handleApprove(token, announce) {
  // …既存の処理…
  //   kind === 'news' の分岐で postNewsToSite(text) を呼んでいるはずなので、その直後に:
  if (announce) announceNewsOnThreads_(text);
  // …
}
```

`announce` は既存の呼び出し（`_handleApprove(token)`）では `undefined` になるので、
Threads承認側の動作は変わらない。

---

## 補足

- 候補メールの見出し `📰` は、メールクライアントによっては `������` に化ける。
  ソース側の絵文字が壊れている可能性があるので、気になるなら貼り直すとよい。
- 候補の中身が「サイトの内部改修」に偏っている（実測3件がすべて開発作業）。
  お知らせ欄に並んでいるのは新サービス・新ツール・決済手段といった顧客向けの発表なので、
  `news_watcher.py` の判定条件を「顧客に影響するものだけ」に絞ると精度が上がる。

---

## §5 返信で承認する（スマホで完結させる）

### 5-1. なぜ必要か

メールのボタン方式は、**スマホのブラウザで Google の認証を通せること**が前提になっている。
実際、事業主のスマホでは「現在、ファイルを開くことができません」（Drive のエラー）で
止まり続けた。デプロイは「実行: 自分／アクセス: 全員」でアクティブ、URL もメールの
ボタンと完全一致していたにもかかわらず、である。

事業主は**PCをほとんど使わない**ため、ボタン方式のままでは運用に乗らない。
**ブラウザを開かない経路**に変える。

### 5-2. 仕組み

候補メールに**返信するだけ**。10分おきに GAS が返信を拾って処理する。

| 返信の1行目 | 動作 |
| --- | --- |
| `掲載` | サイトに掲載 |
| `告知` | サイトに掲載 ＋ Threads告知 |
| `不要` | 破棄 |
| `掲載 2026年8月 — 本文` | 本文を差し替えて掲載（`告知` も同様） |

- 処理結果は**返信で返る**ので、スマホだけで完結する
- 引用部分は読まない（引用の中の「掲載」で誤爆しない）
- コマンド以外の返信は何もしない
- 処理済みスレッドには `お知らせ処理済み` ラベルが付き、二重掲載しない
- **掲載に失敗したときはラベルを外す**ので、もう一度返信すれば再試行できる

### 5-3. `NewsReply.gs` を新規作成する

```js
// ============================================================
// お知らせ候補メールへの「返信」で掲載を承認する
//   返信の1行目:
//     掲載            → サイトに掲載
//     告知            → サイトに掲載＋Threads告知
//     不要            → 破棄
//     掲載 <本文>     → 本文を差し替えて掲載（告知も同様）
//   10分おきのトリガーで checkNewsReplies を回す。
// ============================================================

var NEWS_REPLY_SUBJECT = '【ns-factory お知らせ欄】掲載候補';
var NEWS_REPLY_LABEL   = 'お知らせ処理済み';

/** 返信本文の先頭行からコマンドを取り出す。引用に入ったら打ち切る。 */
function _parseNewsReply_(body) {
  var lines = String(body || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/^[\s　]+|[\s　]+$/g, '');
    if (!line) continue;
    if (line.charAt(0) === '>') return null;                       // 引用
    if (/^\d{4}年\d{1,2}月\d{1,2}日.*[:：]$/.test(line)) return null; // 引用ヘッダ
    if (/wrote:$/.test(line)) return null;
    var m = line.match(/^(掲載|告知|不要)(?:[\s　]+([\s\S]+))?$/);
    if (!m) return null;
    return { cmd: m[1], text: m[2] ? m[2].replace(/^[\s　]+|[\s　]+$/g, '') : '' };
  }
  return null;
}

/** 候補メール本文から掲載文を取り出す（グレーの枠の中身） */
function _extractNewsText_(htmlBody) {
  var m = String(htmlBody || '').match(/white-space:pre-wrap[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return '';
  return m[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/^[\s　]+|[\s　]+$/g, '');
}

/**
 * 候補メールへの返信を拾って掲載する。10分おきのトリガーから呼ぶ。
 */
function checkNewsReplies() {
  var label = GmailApp.getUserLabelByName(NEWS_REPLY_LABEL) || GmailApp.createLabel(NEWS_REPLY_LABEL);
  var query = 'subject:"' + NEWS_REPLY_SUBJECT + '" newer_than:14d -label:"' + NEWS_REPLY_LABEL + '"';
  var threads = GmailApp.search(query, 0, 20);

  for (var i = 0; i < threads.length; i++) {
    var th = threads[i];
    var msgs = th.getMessages();
    if (msgs.length < 2) continue;                       // まだ返信が無い

    var cmd = _parseNewsReply_(msgs[msgs.length - 1].getPlainBody());
    if (!cmd) continue;                                  // コマンドではない返信は無視

    if (cmd.cmd === '不要') {
      th.addLabel(label);
      th.reply('破棄しました。このお知らせは掲載しません。');
      continue;
    }

    var text = cmd.text || _extractNewsText_(msgs[0].getBody());
    if (!text) {
      th.reply('掲載文を読み取れませんでした。「掲載 2026年8月 — 本文」の形で本文も一緒に返信してください。');
      th.addLabel(label);
      continue;
    }

    // 先にラベルを付けて多重処理を防ぐ。失敗したら外して返信し直せるようにする。
    th.addLabel(label);
    try {
      postNewsToSite(text);
    } catch (err) {
      th.removeLabel(label);
      th.reply('掲載に失敗しました。もう一度返信すると再試行します。\n\n' + err);
      continue;
    }

    var note = '';
    if (cmd.cmd === '告知') {
      try {
        announceNewsOnThreads_(text);
        note = '\nThreadsにも告知しました。';
      } catch (err2) {
        note = '\n※Threads告知は失敗しました: ' + err2;
        Logger.log('Threads告知失敗: ' + err2);
      }
    }
    th.reply('掲載しました。\n\n' + text + note);
  }
}
```

### 5-4. トリガーを作る

1. Apps Script エディタ左メニューの ⏰（トリガー）→ 右下「トリガーを追加」
2. 実行する関数: **`checkNewsReplies`**
3. イベントのソース: **時間主導型**
4. 時間ベースのトリガーのタイプ: **分ベースのタイマー**
5. 時間の間隔: **10分おき**
6. 保存

> **画面でトリガーを作れないとき**
> 「ページを再読み込みして、もう一度お試しください。」というエラーが出ることがある
> （2026-08-06 に発生）。再読み込みして作り直せば通ることが多いが、通らない場合は
> `NewsReply.gs` の末尾に次を足して**1回だけ実行**すればよい。画面を使わずに済む。
>
> ```js
> /** 【1回だけ実行】返信チェックの10分おきトリガーを作る */
> function setupNewsReplyTrigger() {
>   ScriptApp.getProjectTriggers().forEach(function (t) {
>     if (t.getHandlerFunction() === 'checkNewsReplies') ScriptApp.deleteTrigger(t);
>   });
>   ScriptApp.newTrigger('checkNewsReplies').timeBased().everyMinutes(10).create();
>   Logger.log('トリガーを作成しました');
> }
> ```
>
> 既存の同じトリガーを消してから作るので、何回実行しても増えない。

### 5-5. 初回だけ手動で1回実行する（認証のため）

Gmail を読む権限がまだ許可されていないので、**エディタで `checkNewsReplies` を一度手動実行**して
承認ダイアログを通しておくこと。これをやらないとトリガーが毎回失敗する。

エディタ上部の関数ドロップダウンで `checkNewsReplies` を選び、**▶ 実行**。

### 5-6. 候補メールの文面を返信方式に合わせる

⚠️ **これをやらないと運用に乗らない。** 返信のコマンド（`掲載` / `告知` / `不要`）は
**メール本文に書いておかないと覚えられない**（事業主指摘）。

`NewsPublish.gs` の `sendNewsApprovalEmail` にある `var body = ...;` の代入を、
まるごと次に差し替える。

- **返信の書き方を本文の主役**にし、ボタンは補助として下に置く
- 見出しの絵文字を削除（メールで `������` に化けていたため）
- 変数（`approveUrl` / `editUrl` / `cancelUrl` / `text`）はそのまま使うので、
  関数の他の部分は変更不要

```js
var body =
  '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
  '<body style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:20px;line-height:1.8">' +
  '<h2 style="font-size:18px;margin:0 0 4px">サイトのお知らせ欄 掲載候補</h2>' +
  '<p style="margin:0 0 16px;color:#555;font-size:14px">業務日誌から自動検知した実績の下書きです。</p>' +

  '<div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;margin-bottom:20px">' +
  escapeHtml_(text) + '</div>' +

  '<div style="border:2px solid #1a1a1a;border-radius:8px;padding:16px;margin-bottom:24px">' +
  '<p style="margin:0 0 12px;font-weight:bold">このメールに<u>返信</u>して、1行目に次のどれかを書いてください</p>' +
  '<table style="border-collapse:collapse;width:100%;font-size:15px">' +
  '<tr><td style="padding:8px 10px;border-bottom:1px solid #ddd;font-weight:bold;white-space:nowrap;background:#fafafa">掲載</td>' +
  '<td style="padding:8px 10px;border-bottom:1px solid #ddd">サイトのお知らせ欄に載せる</td></tr>' +
  '<tr><td style="padding:8px 10px;border-bottom:1px solid #ddd;font-weight:bold;white-space:nowrap;background:#fafafa">告知</td>' +
  '<td style="padding:8px 10px;border-bottom:1px solid #ddd">サイトに載せる ＋ Threads にも投稿する</td></tr>' +
  '<tr><td style="padding:8px 10px;border-bottom:1px solid #ddd;font-weight:bold;white-space:nowrap;background:#fafafa">不要</td>' +
  '<td style="padding:8px 10px;border-bottom:1px solid #ddd">載せない</td></tr>' +
  '<tr><td style="padding:8px 10px;font-weight:bold;white-space:nowrap;background:#fafafa">返信しない</td>' +
  '<td style="padding:8px 10px">何も起きません</td></tr>' +
  '</table>' +
  '<p style="margin:14px 0 0;font-size:14px;color:#555">' +
  '文面を直したいときは<br><b>掲載 2026年8月 — 直した本文</b><br>' +
  'のように、コマンドの後ろに続けて書いてください。<br><br>' +
  '10分以内に処理して、結果をこのスレッドに返信します。</p>' +
  '</div>' +

  '<p style="font-size:13px;color:#888;margin:0 0 10px">PCのブラウザからはボタンでも操作できます（スマホでは返信をお使いください）。</p>' +
  '<a href="' + approveUrl + '" style="background:#1a1a1a;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;margin-right:8px;font-size:14px">掲載する</a>' +
  '<a href="' + editUrl + '" style="background:#0066cc;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;margin-right:8px;font-size:14px">編集</a>' +
  '<a href="' + cancelUrl + '" style="background:#cc0000;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:14px">不要</a>' +
  '</body></html>';
```

### 5-7. 注意

- ⛔ **ラベル名 `お知らせ処理済み` を変えるときは、コード内の `NEWS_REPLY_LABEL` も必ず揃える。**
  ずれると同じお知らせを毎回掲載し続ける。
- 掲載文の取り出しは、候補メール本文の `white-space:pre-wrap` の div に依存している。
  `sendNewsApprovalEmail` の文面を変えるときは `_extractNewsText_` も見直すこと。
  読み取れなかった場合は「本文も一緒に返信してください」と返信して止まる。
- ボタン方式（§1〜§4）と併用できる。PC を触るときはボタンでも掲載できる。
