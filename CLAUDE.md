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
