# Threads言及監視 セットアップ手順

Threads の公開投稿から `N's factory` / `中司祐樹` などへの言及を1時間ごとに探し、
見つかったら **GitHub Issue** に自動で記録する仕組み。

批判・悪評・誹謗中傷だけでなく、口コミ・紹介・好意的な投稿も同じように拾う
（＝ブランドモニタリング）。良し悪しの判定はせず、「言及があった」ことだけを機械的に記録する。

---

## 構成ファイル

| ファイル | 役割 |
|---|---|
| [.github/workflows/threads-mention-watch.yml](../.github/workflows/threads-mention-watch.yml) | 毎時 :07（UTC）に実行するGitHub Actions |
| [scripts/threads_mention_watch.py](threads_mention_watch.py) | 本体。Python標準ライブラリのみ（追加インストール不要） |
| [scripts/threads_watch_keywords.json](threads_watch_keywords.json) | **監視キーワード。ここだけ触れば追加・削除できる** |
| [scripts/threads_watch_state.json](threads_watch_state.json) | 通知済みPost IDの記録（自動更新。手で触らない） |

既存のサイト・GAS・他のワークフローには一切手を入れていない。
このジョブは sparse-checkout で上記3ファイルしか取得しないので、サイト本体を壊しようがない。

---

## 作業の順番と所要時間

| # | 作業 | 場所 | 目安 |
|---|---|---|---|
| 1 | Metaアプリを作る | Meta Developers | 10分 |
| 2 | 自分をThreadsテスターにする | Meta Developers + Threadsアプリ | 5分 |
| 3 | アクセストークンを発行する | Meta Developers | 5分 |
| 4 | GitHubにトークンを登録する | GitHub | 5分 |
| 5 | 手動実行して動作確認する | GitHub | 5分 |
| 6 | **App Review を申請する** | Meta Developers | 申請30分＋**審査数日〜数週間** |

> **先に6番の申請だけ出しておくのが得。** 審査待ちが一番長い。
> 1〜5だけでも仕組みは動くが、**審査が通るまでは自分の投稿しか検索できない**
> （＝他人の言及は0件のまま）。これは故障ではなく Meta の仕様。

---

## 1. Metaアプリを作る

1. https://developers.facebook.com/ を開き、Facebookアカウントでログインする
   （まだなら「開始」から開発者登録。電話番号の確認が要る）
2. 右上「マイアプリ」→「**アプリを作成**」
3. ユースケースの選択で「**Threads API**」を選ぶ
   - ここで Threads を選ばないと後の設定項目が出てこない。間違えたら作り直したほうが早い
4. アプリ名は自分が分かるものでよい（例: `nsfactory-threads-monitor`）
5. 作成後、左メニューに「**Threads API**」が出ていることを確認する

> 注意: このアプリ作成で「アプリID」が2つ表示されることがある。
> 使うのは **Threads側のID/シークレット**。

---

## 2. 自分をThreadsテスターにする

審査が通るまでは「テスター」として登録した自分のアカウントしか扱えない。

1. アプリ管理画面 → 左メニュー「**アプリの役割**」→「**役割**」タブ
2. 「**ユーザーを追加**（Add People）」→「**Threads Tester**」を選ぶ
3. 自分の Threads ユーザー名 `leathercraft_nsfactory` を入力して招待する
4. **スマホの Threads アプリ**を開く
   → プロフィール → 三本線メニュー → 「アカウント設定」→「**ウェブサイトの許可**」
   → 招待が来ているので「承認」する

この承認をしないと、次のトークン発行で対象アカウントが選べない。

---

## 3. アクセストークンを発行する

1. アプリ管理画面 → 左メニュー「**Threads API**」
2. 「**アクセストークンを生成**（Generate access token）」ボタンから
   `leathercraft_nsfactory` を選ぶ
3. 権限の確認画面で **`threads_basic`** と **`threads_keyword_search`** の両方に
   チェックが入っていることを確認して承認する
4. 出てきた長い文字列（`TH...` で始まる）を**その場でコピー**する
   - **この画面を閉じると二度と表示されない。** 消したら再発行になる
   - **絶対にメモ帳やチャットに貼らない。** 次の手順4で直接GitHubに貼る

> 確信度：中 — ボタンの名前と位置は Meta の管理画面改修でよく変わる。
> 「Generate access token」相当のボタンが見当たらない場合は、
> 左メニュー「Threads API」→「設定」あたりを一通り探す。
> それでも無ければ Meta 側が OAuth（Authorization Window）実装必須に変えた可能性がある。
> その場合は連絡してもらえれば OAuth 取得用のスクリプトを追加する。

---

## 4. GitHubにトークンを登録する

1. https://github.com/you0810jmsdf/ns-factory を開く
2. 上の「**Settings**」タブ →左メニュー「**Secrets and variables**」→「**Actions**」
3. 「**New repository secret**」を押す
   - Name: `THREADS_ACCESS_TOKEN`
   - Secret: 手順3でコピーした文字列を貼る
   - 「Add secret」
4. 同じ画面の「**Variables**」タブ →「**New repository variable**」
   - Name: `THREADS_TOKEN_SET_ON`
   - Value: 今日の日付（例 `2026-08-25`）
   - → **トークンが切れる前に警告Issueを立てるために使う**（後述）

> ⚠️ トークンをソースコードやコミットに書かないこと。
> リポジトリは public なので、1回でも push したら世界中から読める。

---

## 5. 手動実行して動作確認する

1. リポジトリの「**Actions**」タブ → 左の「**Threads言及監視**」
2. 右の「**Run workflow**」を押す
3. 入力欄が2つ出るので:
   - `window_minutes` … **`10080`**（＝過去7日分をまとめて確認する）
   - `dry_run` … **`true`**（Issueを作らず、ログに出すだけ）
4. 「Run workflow」→ 1〜2分待つ → 実行結果をクリックしてログを見る

**ログの読み方**

| ログ | 意味 |
|---|---|
| `q='中司祐樹': 0 件` がずらっと並ぶ | 正常。単に言及がないか、**まだApp Review未承認**（=自分の投稿しか見えない） |
| `新しい言及 N 件` + `--- DRY RUN ---` | 正常。この内容でIssueが作られる |
| `::error::Threads のアクセストークンが使えません` | トークンが違う／権限不足。手順3をやり直す |
| `::notice::Secret THREADS_ACCESS_TOKEN が未設定` | 手順4ができていない |

問題なければ、もう一度 `dry_run` を **`false`** にして実行する。
これで本当にIssueが作られる。あとは毎時 :07（UTC）に自動で回る。

---

## 6. App Review を申請する（他人の投稿を検索するために必須）

**これをしないと他人の言及は永久に0件のまま。** 一番時間がかかるので早めに出す。

1. アプリ管理画面 → 左メニュー「**アプリの審査**」→「**権限と機能**」
2. `threads_keyword_search` を探して「**詳細なアクセスをリクエスト**」
3. 申請フォームで聞かれること（日本語で書いてよいが、英語のほうが通りやすい）
   - **用途の説明** … 記入例:

     > 自社ブランド「N's factory」および事業主名に対する Threads 上の言及を
     > 定期的に検索し、顧客からの口コミ・質問・苦情を把握して
     > カスタマーサポートと品質改善に役立てるため。
     > 収集したデータは社内の非公開の記録にのみ利用し、第三者へ提供・販売しない。

   - **スクリーンキャスト（操作動画）** … 実際に動いている様子の録画が要る。
     手順5の Actions ログ画面と、生成された Issue を映した画面録画でよい
   - **プライバシーポリシーURL** … https://you0810jmsdf.github.io/ns-factory/gmail-app-privacy.html
     （※ Gmail用の既存ページ。Threads用の記載を足す必要があるかもしれない。要確認）
4. 場合によっては「**ビジネス認証**」も求められる（開業届・本人確認書類の提出）
5. 提出したら待つ。数日〜数週間

> 確信度：中 — 審査フォームの項目名と必要書類は Meta 側で頻繁に変わる。
> 上記で見つからない項目があれば、その画面のスクショを送ってもらえれば個別に見る。

---

## 運用

### キーワードを増やす・減らす

[scripts/threads_watch_keywords.json](threads_watch_keywords.json) の `keywords` に
文字列を足したり消したりするだけ。スクリプトは触らなくてよい。

```json
"keywords": [
  "N's factory",
  "エヌズファクトリー",
  { "q": "中司", "enabled": false }
]
```

- `"enabled": false` にすると、消さずに一時停止できる
- 照合は「全角半角・大文字小文字・アポストロフィ（`'` `’`）」を同一視するので、
  `N's factory` と `N’s factory` と `Ｎｓ　Factory` は同じ扱いになる
- `exclude_authors` に入れたアカウントは無視する（自社アカウントは登録済み）
- ノイズが多い語は `exclude_if_text_contains` に除外語を足すと減らせる

### 「中司」がうるさい場合

よくある姓なので他人の投稿が大量に引っかかる可能性が高い。
数日運用してうるさければ、次のどれかにする（上から推奨）。

1. `{ "q": "中司", "match": ["中司祐樹", "中司さん"] }` … 本文をさらに絞る
2. `{ "q": "中司", "enabled": false }` … 止める
3. そのまま放置して、Issueをまとめて Close する

### トークンの更新（60日ごと・重要）

Threads の長期トークンは **発行から60日で失効する**（Meta公式仕様）。
切れると監視は黙って止まる。過去に Gmail のトークン失効で 8日間 気付かなかった前例がある。

対策として、`THREADS_TOKEN_SET_ON` から **45日**経つと
「残りN日で失効します」という Issue が自動で立つようにしてある。
その Issue に直し方が書いてあるので、そのとおりに貼り替える。

### Issueの扱い

- ラベル `threads-mention` … 検出した言及
- ラベル `threads-mention-alert` … 仕組み自体の異常（要対応）
- **Close しても再起票されない。** 見終わったら遠慮なく Close してよい
- Issue本文のHTMLコメント `<!-- threads-post-id: ... -->` は重複判定に使うので消さない

---

## 制約（できないこと）

| 制約 | 内容 |
|---|---|
| **匿名の言及は拾えない** | 「例の革屋」「千葉の手帳屋さん」など、屋号・氏名を含まない表現はキーワード検索では原理的に検出できない |
| **Issueは公開される** | このリポジトリは public。**悪評の投稿本文がそのまま世界中から読めるIssueになる**。気になる場合は下記「起票先を変える」を参照 |
| **審査前は自分の投稿だけ** | `threads_keyword_search` が未承認の間は、自分の投稿しか検索対象にならない |
| **APIの上限** | 2,200クエリ／24時間。現在の設定（6キーワード×24回＝144件/日）なら余裕がある |
| **取りこぼしの可能性** | Actionsのcronは数十分遅れることがある。そのため直近**90分**を毎時見る（重なり分は重複判定で捨てる） |
| **センシティブ語は空になる** | Metaが「センシティブ／攻撃的」と判定したキーワードは、APIが常に空配列を返す |

### 起票先を別リポジトリに変えたい場合

1. Issue用の**privateリポジトリ**を用意する
2. そのリポジトリの Issues: Read and write を持つ fine-grained PAT を作る
3. Secret `THREADS_ISSUE_TOKEN` に入れ、ワークフローの `GITHUB_TOKEN:` の行を
   `${{ secrets.THREADS_ISSUE_TOKEN }}` に差し替える
4. Variable `THREADS_WATCH_ISSUE_REPO` に `owner/repo` を入れる

---

## ローカルで試す

```bash
cd デジタル部/サイト管理/ns-factory
THREADS_ACCESS_TOKEN=<トークン> THREADS_WATCH_DRY_RUN=1 THREADS_WATCH_WINDOW_MINUTES=10080 py scripts/threads_mention_watch.py
```

`THREADS_WATCH_DRY_RUN=1` の間はIssueを作らず、state も書き換えない。
