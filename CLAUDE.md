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
  - フォールバックの `<li>` は更新されないので徐々に古くなる。表示に使われるのは fetch 失敗時だけ。
