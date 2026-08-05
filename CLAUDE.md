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
