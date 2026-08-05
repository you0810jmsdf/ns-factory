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
