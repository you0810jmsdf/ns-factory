# Claude Code 作業記録

このファイルは、Claude Code がリポジトリを開いたときに今回の変更意図を把握できるように残す作業メモです。

## 2026-07-15 — 商品登録画面「登録する」ボタン無効化の修正

- 対象: `register.html`
- 症状: 確認画面で「修正する」は押せるが、「登録する」ボタンが押せない。
- 原因: `registerBtn.disabled` が `true` のまま確認画面へ戻る経路があり、確認画面表示時にボタン状態を復旧していなかった。スクリーンショット上の薄いベージュ色は `.btn-primary:disabled` の表示と一致。
- 対策:
  - `prepareRegisterButton()` を追加し、確認画面に入るたびに `registerBtn` を有効化。
  - `registerInFlight` を追加し、送信中の二重送信だけを防止。
  - 登録処理失敗時は確認画面へ戻し、ボタンを再有効化。
  - 新規登録の `api=register` 呼び出しを GET から POST に変更し、長い説明文による URL 長制限リスクを回避。
- 検証:
  - `register.html` 内のインライン JavaScript 構文チェック通過。
  - `git diff --check -- register.html` 通過。
- 注意:
  - 作業時点で `order_estimate/leather-order-estimate-v2.html.bak_20260709` は未追跡ファイルとして存在していたが、今回の修正とは無関係のためコミット対象外。

## 2026-07-15 — 商品登録画面の下書き自動保存・復元

- 対象: `register.html`
- 背景: GitHub Pages のキャッシュや既に開いている古いタブでは、修正版 JavaScript が即時反映されない。入力済み内容を失わずに復旧できる仕組みが必要。
- 対策:
  - 新規登録モードで、商品基本情報・説明文・写真・代表写真・使用材料選択を IndexedDB に自動保存。
  - 認証後、編集モードでない場合に保存済み下書きの復元確認を表示。
  - 登録成功時と `resetAll()` 実行時に下書きを削除し、登録済み内容が次回誤復元されないようにした。
  - AI説明文生成・写真追加/削除・代表写真変更・材料選択変更も保存トリガーに含めた。
- 検証:
  - `register.html` 内のインライン JavaScript 構文チェック通過。

## 2026-08-04 — 商品登録の二重登録バグ修正（Google間欠障害への冪等リトライ）

- 対象: `register.html`（あわせて `Apps Script/product_register.js`）
- 症状: 「登録する」で `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`。スマホでも4件連続失敗し、準備中の重複行が残った。
- 原因: GAS WebAppの2段目（`script.googleusercontent.com/macros/echo`）が時間帯によってHTMLのエラーページを返す。**処理はGAS側で完了してから応答だけが失われる**ため、再試行のたびに同じ商品が二重登録されていた。失敗率はバースト性（実測: 悪い時間帯 4/10、直後 0/8）。
- 対策:
  - GAS `registerProductCore_`: ロック取得後に `requestId` を CacheService（6h）で照合し、再送なら前回結果を `replayed:true` で返す。
  - GAS `uploadPhotoCore_`: 同名ファイルが既にあれば再作成せず既存を返す。
  - `gasPostJson()` を追加し、HTML応答を検知したら最大5回・指数バックオフで再送。register / finalize / uploadPhoto を集約。
  - `requestId` は登録単位で固定し、手動の押し直しでも使い回す（成功時と `resetAll()` 時のみ破棄）。
  - `setProgress(pct, msg, agentMsg)` は pct/msg に null を渡すとその項目を据え置く。
- 検証:
  - 本番実測で register 3回連続 → 商品IDは1件のみ・全て replayed。uploadPhoto 2回 → fileId 同一。
  - インラインJS構文チェック通過、GitHub Pages反映を実測確認。
- 注意:
  - **HTTP 200 でもHTMLが返る**ため、ステータスコードではなく本文先頭が `<` かで判定すること。
  - 書き込み系APIを追加するときは、必ず冪等化してからリトライを付けること（単純リトライは重複を生む）。

## 2026-08-04 — 作品集 SOLDOUTのホワイトアウト廃止

- 対象: `works.html`
- 指示: SOLDOUTをホワイトアウトにせず、写真をそのままの色味で表示する（事業主）。
- 対策: `.work-card.is-unavailable .thumb / .thumb-placeholder` の `opacity: 0.55; filter: grayscale(0.4);` を削除。
- 理由: 作品集は「過去に製作した実績」を革の色味込みで見てもらう場。写真を薄く／グレーに落とすと同じ革でのオーダー相談につながらない。
- 検証: 本番ブラウザで computed style を実測（opacity=1 / filter=none）。SOLDOUTバッジと `is-unavailable` の付与ロジックは維持。カード582枚中571枚が該当。
- 注意:
  - ⛔ `.work-card.is-unavailable` に `opacity` / `filter: grayscale` を復活させないこと（CSS側にも同旨のコメントを残している）。
  - 販売状態の識別はバッジ `.badge-unavailable` と詳細側の注記が担う。`is-unavailable` クラス自体は今後の拡張用フックとして残してある。

## 2026-08-05 — お知らせ欄「掲載する」ボタンが効かない件（原因調査＋手動掲載）

- 対象: `index.html`（お知らせ欄。原因側は外部の GAS WebApp）
- 症状: 「【ns-factory お知らせ欄】掲載候補」メールの「✅ 掲載する」を押しても投稿できない。押すと Google のログイン／権限画面が出て止まる。
- 調査でわかったこと:
  - ボタンのリンク先は GAS WebApp の `/exec?action=approve&token=...`（`AKfycbxZztUxgw06jJX3EKLY5gHtYuq18lcGUeuRY9vYcUIwxvufqHp_dpYEMMMulvtM9xc`）。
  - ログイン画面が出るのは GAS の**デプロイ設定**の問題。「アクセスできるユーザー」が『自分のみ』、または「次のユーザーとして実行」が『アクセスしているユーザー』になっていると、メールアプリ内ブラウザ（未ログイン／別アカウント）から開いた時点で認証画面に落ちる。この設定はリポジトリ側からは直せない。
  - ⚠️ **さらに根本的な問題**: 仮に認証を通っても、サイト側に受け口が存在しない。`index.html` のお知らせ欄は `<ul><li>` のベタ書きで、お知らせ用の JSON も fetch も `repository_dispatch` も無い。GAS が書き込む先が無いので「即時反映」は構造上できない。コミット履歴上も GAS 由来のコミットは 1 件も無い（author は事業主と github-actions[bot] のみ）。
  - メール見出しの `������` は GAS 側ソースの絵文字が文字化けしているもの。動作には影響しないが、GAS を触るついでに直すとよい。
- 今回の対応:
  - 承認済みの 1 件「2026年8月 — 作品集のSOLDOUT表示を改善しました。」を `index.html` のお知らせ欄へ手動で追加（本来「掲載する」が行うはずだった処理）。
  - 未承認の候補（8/4 の名刺QR着地LP、8/1 の作品登録導線改善）は掲載していない。
- 残っている宿題（次にやるなら）:
  1. GAS のデプロイ設定を「次のユーザーとして実行: 自分」「アクセスできるユーザー: 全員」に変更して再デプロイし、新しい `/exec` URL でメールを送るようにする。
  2. お知らせ欄を `news-data.json` 等のデータ駆動に変更し、GAS から GitHub API または `repository_dispatch` で書き込めるようにする。これをやらない限りボタンは通っても反映されない。
- 注意:
  - この環境からは `script.google.com` へ出られない（ネットワークポリシーで CONNECT 403）。GAS の挙動はリポジトリ側からは実測できない。

## 2026-08-05 — 作品集にテクスチャシミュレーター導線を追加

- 対象: `works.html`（`chat-widget.js` と GAS は無改修）
- 指示: カラーテクスチャが使える作品は、AI相談経由だけでなく詳細ページから直接入れる導線も設ける。対象は svg1 / svg2 がある作品のみ。
- 実装:
  - `refreshTextureSimCta()` … 詳細を開くたび `action=svgList` で判定し、SVGがあるときだけ `#texture-sim-cta` を表示。folderId 単位でキャッシュ、HTML応答時は3回再試行、`textureCheckToken` で古い判定結果を破棄。
  - `openTextureSim()` … `カラーシミュレーター/pattern-color-proto/floodfill.html?folderId=...&embed=1` をフルスクリーンiframe（z-index 5000）で表示。
  - `nsfactory-floodfill-confirm` を受けたら閉じて `ocOpenChat()` → 選んだ革色・金具色を自動送信。
- 注意:
  - **`ocWidget.send` は引数を取らない**（`#chat-input` の値を送る実装）。呼ぶ前に入力欄へ流し込むこと。200字を超えると送信されない。
  - 判定条件は chat-widget.js と同一に保つこと。GAS の `findFileBySuffix_` は**接尾辞一致**なので `xxx_svg1.svg` も対象（2026-08-05時点で該当14作品）。
  - chat-widget.js 側にも同名 postMessage のリスナーがあるが、自前オーバーレイが開いているときだけ処理するため二重発火しない。
- 検証: 本番ブラウザで CTA表示（10.1秒）・iframe src・開閉・確定→相談への自動送信まで実測。
- 既知の制約: `svgList` がSVG本体まで返すため判定に約10秒かかる。即時化するには軽量な存在確認APIが必要。

## 2026-08-05 — 更新時の動画導線追加＋テクスチャ判定の軽量API化

- 対象: `register.html` / `works.html` / `Apps Script/order_progress/order_progress_GAS.js`
- ① 動画導線: 動画メーカーへのリンクが新規登録の完了画面にしか無く、既存作品を更新したときにたどり着けなかった。`editModePanel` に `#editMakeVideoLink` を常設し、作品番号の引き継ぎを `setVideoMakerLink(elementId, productId)` に共通化（完了画面 `#makeVideoLink` と共用）。
- ② 軽量API: 判定用の `action=svgExists`（`getSvgExists`）をGASに追加。SVG本体を返さず、フォルダを1回走査して名前だけ見る（両方見つかったら打ち切り）。`works.html` の判定をこれに切替。
  - 実測: 応答 約3.7秒→約1.6秒、サイズ 158,180字→57字。判定結果は `svgList` と全件一致。
  - clasp deploy は deploymentId 据え置き（@30）。
- 注意:
  - `getSvgExists` と `getSvgList` の**判定条件（末尾 svg1.svg / svg2.svg）は必ず揃えること**。片方だけ変えると導線とシミュレーター本体で食い違う。
  - 同ファイルに別セッション由来の `action=svgFolders`（`works-data.json` の `hasPattern` 生成用）も入っている。works.html の導線が二重実装にならないよう、どちらの方式を使うか整理が必要。

## 2026-08-05 — お知らせ欄をデータ駆動化し「掲載する」の受け口を作成

- 対象: `news-data.json`（新規）/ `index.html` / `tools/add_news.js`（新規）/ `.github/workflows/news-publish.yml`（新規）/ `docs/news-publish-setup.md`（新規）
- 背景: 同日の調査のとおり、お知らせ欄が `<ul><li>` のベタ書きで **GAS の書き込み先が存在しなかった**。ボタンの認証を直しても反映されないため、受け口を先に作った。
- 経路: 候補メール →（GAS）→ GitHub `repository_dispatch`（`news-publish`）→ Actions → `tools/add_news.js` が `news-data.json` を更新 → `index.html` が fetch して描画。
  - GAS 側を薄く（POST 1回）保ち、重複判定・年グループ分け・並べ替えはリポジトリ側に置いた。GAS は改修コストも障害率も高いため。
- 冪等性: **必須**。GAS は応答だけ失われて再送されうる（2026-08-04 の項参照）。`add_news.js` は同じ `id`、または同じ 日付+本文 があれば何もせず `exit 0`。GAS からは候補メールの `token` を `id` として渡すこと。
- 表示: `index.html` の `#news-accordion` は JSON が読めたときだけ差し替える。**HTML 側のベタ書きはフォールバックとして残してある**（Actions や Pages が落ちてもお知らせ欄が空にならない）。本文は `textContent` で入れ、リンクは `href` を検査してから付ける（`javascript:` 等を弾く）。
- 検証:
  - `add_news.js`: 正常追加／同 id 再送／id 無し同内容／新しい年のグループ自動生成／不正入力4種（日付形式・HTMLタグ・不正href・空）をすべて実測。
  - Chromium 実測: JSON 描画とフォールバック描画が **完全一致**（BTCのリンク含む）、アコーディオン開閉 OK、JSエラー無し。掲載1件追加 → 先頭に反映も確認。
  - `.github/workflows/news-publish.yml` は YAML パース通過。
- 残っている宿題（GAS 側。リポジトリからは触れない）:
  1. デプロイ設定を「実行: 自分」「アクセス: 全員」にして再デプロイ → メールのボタンURLも差し替え。
  2. スクリプトプロパティ `GITHUB_TOKEN` に fine-grained PAT（ns-factory / Contents: Read and write）を登録。
  3. `action=approve` から `publishNews_()` を呼ぶ。コードは `docs/news-publish-setup.md` に掲載。
- 注意:
  - 受け取った値は workflow の `env:` 経由でのみ渡すこと（`run:` に直接 `${{ }}` を展開しない）。

## 2026-08-06 — ⚠️ 前項の前提が誤りだった／お知らせ欄を「足し込み」描画に修正

- **訂正**: 前項の「GAS の書き込み先が無い」は**誤り**。GAS は GitHub API で `index.html` の
  `<ul>` に `<li>` を直接コミットする実装だった。押せなかっただけで、経路は存在していた。
  PC のブラウザから押したら成功し、`NEWS自動追記: ...` のコミットが入った（2026-08-06 07:57）。
- 判明したこと:
  - GAS プロジェクトは **`Nsfactory-SNS-AutoPost`**。Threads 自動投稿と同居している。
    根拠: Threads投稿承認メールの「⚡ 今すぐ投稿」と、お知らせ欄の「✅ 掲載する」の
    **デプロイIDが完全一致**（`AKfycbxZztUxgw06jJX3E...`）。見出しの `������` も両方に出る。
  - ウェブアプリはトリガー不要なので、マイトリガー一覧（19個）には出てこない。探すだけ無駄。
  - スマホで止まるのはデプロイの公開範囲の問題（PCではログイン済みなので通る）。
- 発生した問題: 前項で `news-data.json` 描画に**置き換え**たため、GAS が書いた `<li>` が
  表示されなくなる状態だった。さらに手動掲載分と GAS 分で `<li>` が重複した。
- 対策（`index.html`）:
  - 描画を**置き換えから足し込み（マージ）に変更**。HTML の `<li>` を残したまま、
    `news-data.json` にしか無い項目だけ足す。**どちらの経路で書かれても表示される。**
  - 本文が同じ項目は表示時に1件へ畳む（GAS 側に重複防止が無いため）。
  - 重複していた `<li>` 1行を削除。
- 検証（Chromium 実測・6シナリオ全て OK）:
  1. 現状（HTML と JSON が同内容）→ 重複なし
  2. GAS が index.html に追記（JSON に無い）→ 表示される
  3. GAS が同じ内容を2回書いた → 1件に畳まれる
  4. Actions が JSON に追加（HTML に無い）→ 先頭に出る
  5. JSON に新しい年のグループ → 生成され最初から開く
  6. JSON 取得失敗 → HTML のリストが残る
  - ※ ブラウザの HTTP キャッシュで誤検知が出るため、シナリオごとに context を分けること。
- 残作業（GAS 側。手順とコードは `docs/news-publish-setup.md`）:
  1. デプロイ設定を「実行: 自分」「アクセス: 全員」→ 再デプロイ → メールのURL差し替え。
  2. Threads 告知の追加（事業主要望）。`announceNewsOnThreads_()` を用意した。
     **既存の Threads 投稿関数名とトークンのプロパティ名は未確認**。わかり次第そちらに寄せる。
  3. 任意で `repository_dispatch` 方式へ切替（重複防止・年グループ分けが自動になる）。
- 注意:
  - ⛔ お知らせ欄の描画を「置き換え」に戻さないこと。GAS が書いた分が消える。
  - GAS 側に重複防止が無い。同じ内容を2回押すとファイルには2行残る（表示は畳まれる）。

## 2026-08-06 — お知らせのThreads告知コードを確定（GAS側・docs のみ）

- 対象: `docs/news-publish-setup.md` §2（リポジトリのコードは無変更）
- `Nsfactory-SNS-AutoPost` の構成が判明。`Code.gs`(doGet振り分け) / `NewsPublish.gs`(お知らせ掲載) /
  `PostThreads.gs`(Threads投稿) / `KillSwitch.gs` / `SchedulePost.gs` ほか。
  認証情報は `THREADS_ACCESS_TOKEN` / `THREADS_USER_ID`。
- **`postToThreadsGuarded()` は告知に使わない**と判断:
  - KillSwitch 以外に「投稿間隔ガード」「時間帯別 max_posts」があり、**定期投稿の直後に
    押すと throw して告知できない**。手動で押した告知は必ず出したい。
  - 代わりに `postNewsAnnouncement_()` を用意。KillSwitch だけ尊重し頻度ガードは通さない。
    `_recordPostSuccess` / `_recordPostFailure` は呼ぶので、連続3失敗の自動 Kill と
    月次の思想／告知比率レポートには従来どおり乗る。
- `announceNewsOnThreads_(text, token)` は CacheService（6h）で二重投稿を抑止。
  **失敗時は cache を消して押し直せるようにしてある**（put してから post、失敗時 remove）。
- 検証: 抽出したコードに GAS API のスタブを与えて実行。1回目投稿／2回目スキップ／
  記録1件のみ／API失敗時に押し直し可／KillSwitch ON で中止、を実測。投稿文は116字。
- 差し込みは「掲載成功後」に1行呼ぶだけ
  （サイト反映に失敗したのに告知だけ出る事故を防ぐため、順序は必ず掲載→告知）。
- ⛔ **差し込みは必ず `try/catch` で囲むこと。** `postNewsToSite` には重複チェックが無いため、
  告知の失敗で画面がエラーになると押し直しが起き、お知らせが二重に載る（2026-08-06 に発生済み）。
  失敗は `Logger.log('Threads告知失敗: ')` に残す。

## 2026-08-06 — NewsPublish.gs 全容判明／NEWS_LINE 形式を追加

- 対象: `tools/add_news.js` / `.github/workflows/news-publish.yml` / `docs/news-publish-setup.md`
- GAS 側の全経路が判明:
  `監理部\news_watcher.py` → `doPost action=news_draft` → `ingestNewsDraft`
  → `saveDraft(text,'news')` + 承認メール → `doGet ?action=approve`
  → `_handleApprove`(kind==='news') → `postNewsToSite` → GitHub Contents API で
  `index.html` に `<li>` 追記。
- ⚠️ **見つけた時限爆弾**: `NEWS_SECTION_MARKER = '<span>2026年のお知らせ</span>'` と
  **年がベタ書き**。2027年のお知らせが2026グループに入る。見出しを変えると
  「目印が見つかりません」で掲載不能になる。→ `postNewsToSite` を dispatch に
  差し替える手順を `docs/news-publish-setup.md` §3 に用意した。
- **PAT は既にある**（`GITHUB_PAT_NS_FACTORY` / Contents: Read and write）。
  `dispatches` もこの権限で通るので、新しいトークンは不要。§3 の手順もこれを使う。
- リポジトリ側の追加:
  - `add_news.js` に **`NEWS_LINE` 形式**を追加。「2026年8月 — 本文」の1行をそのまま
    渡せば日付ラベルと本文に分解する。GAS 側は掲載文を投げるだけで済む。
    区切りは em dash / en dash / ハイフンを受ける。
  - workflow に `line` 入力を追加。`date` / `text` は任意に変更。
- 検証:
  - `add_news.js`: NEWS_LINE 正常／同 id 再送／年またぎ／ハイフン区切り／
    **本文にハイフンを含むケース**（`A-B-C対応` が本文側に残る）／分解不能を実測。
  - GAS スニペット: スタブを与えて実行。日付除去4パターン、告知1回目／2回目スキップ／
    別内容は投稿／API失敗時に押し直し可／KillSwitch ON で中止を実測。
- 注意:
  - 二重投稿の抑止キーは **本文の MD5**（`_newsCacheKey_`）。token を引き回さなくて済むので、
    `postNewsToSite` の中からでも呼べる。dispatch の `id` にも同じ値を使う。
  - `postToThreadsGuarded` を告知に使わない理由は前項参照。

## 2026-08-06 — 過去分の「読み込み」がtimeoutになる件（読み取り系にリトライを追加）

- 対象: `register.html`（GASは無改修）
- 症状: 既存商品を「📂 読み込み」すると「読込エラー: timeout」。30秒待たされる。事業主の体感では特定の商品ID（NF2026_630）だけ。
- **原因は商品IDではなく GAS WebApp の間欠障害**（2026-08-04 の項と同じ現象の読み取り版）。
  - 実測: 同一URL・同一ID で10回連続 → **成功9／失敗1**。失敗時は HTTP 404 + HTMLエラーページで応答 **29,486ms**。成功時は 1,148〜10,298ms。
  - JSONP は HTML を読むと callback が呼ばれず timeout、404 では `onerror` で `'network'` になる。どちらも同じアラートに落ちていた。
  - 書き込み系は `gasPostJson()` でリトライ済だったが、**`jsonpCall` はタイムアウト30秒・リトライなしのまま残っていた**。
  - 「写真フォルダが巨大で走査が終わらない」説は否定（Drive実測で該当フォルダは11ファイル）。
- 対策:
  - `jsonpCallRetry(params, opts)` を新設。timeout 15秒 × 最大4回・指数バックオフ 0.8/1.6/3.2秒。
    **15秒にしたのは正常応答が実測で最大9.9秒だから**。30秒のままだと失敗判定が遅すぎる。
  - `loadProduct()` の `getProductById` のみ差し替え。編集バーの `#loadStatus` に「応答がないため再試行中… n/4」を表示。
  - 全滅時のアラートを「時間をおいて再実行」の案内に変更。
- 検証: インラインJS構文チェック通過／モックで単体検証（1回失敗→再送で成功・4回全滅で停止・呼び出し4回で打ち止め）／本番ブラウザ実測（JSONP 1,505ms応答・再試行UIの表示・JSエラー0）。
- 注意:
  - ⛔ **`jsonpCallRetry` を書き込み系に使わないこと。** `publishThreadsPost` はThreadsへの実投稿で二重投稿になる。`softDeleteProduct` は冪等性未検証、`generateThreadsPostText` はGeminiの二重課金。
  - 読み取り専用APIを追加するときは `jsonpCall` ではなく `jsonpCallRetry` を使う。
