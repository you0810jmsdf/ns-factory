# Claude Code 作業記録

このファイルは、Claude Code がリポジトリを開いたときに今回の変更意図を把握できるように残す作業メモです。

## 2026-08-21 — 監理幕僚室に暗号資産 計算書ツールを新設

- 対象: `kanri-room/crypto-calc/index.html`（新設）/ `kanri-room/crypto-calc/crypto_calc.zip`（新設）/ `kanri-room/index.html`
- 目的: 国税庁「暗号資産の計算書（総平均法用）」の手計算をやめる。取引所CSVから自動計算する。
- 構成: HTML版（ブラウザ完結・日常の確認用）＋ Python版ZIP（提出用xlsx生成が必要なとき）。
  ロジックは同一で、HTML版は起動時にセルフテストを走らせて両者の一致を自己検証する。
- 対応取引所: メルコイン（月次CSV）/ GMOコイン（年間取引報告書CSV・**BOM付き**）/ OKJ（PDFのみのため手入力JSON）。
- ⛔ **JavaScript の Number で金額計算をしないこと。** 暗号資産の数量（小数8桁以上）と円建て金額の積で
  桁落ちし、総平均法は割り算を含むため誤差が年末残高に蓄積する。**BigInt の固定小数点（小数20桁）**で実装してある。
  `fmt()` は切り捨てではなく**四捨五入**にすること（切り捨てだと 3.475553315 が 3.475553314999… となり、
  繰越残高として翌年へ渡したときに誤差が残る）。
- ⛔ **総平均法は「通貨ごと」に全取引所を合算すること。** 取引所ごとに別々の計算書を作ると
  同じBTCに総平均単価が複数生まれて所得金額が変わる。国税庁様式が「暗号資産の名称」1件に対して
  「取引所の名称」を複数行持つ構造なのはこのため。
- GMOコインCSVの読み方（実測に基づく）:
  - 現物は精算区分 `販売所取引` / `取引所現物取引`。売却価額は**手数料差引後の「日本円受渡金額」**を採る
    （約定金額を使うと国税庁様式の値とずれる）。
  - 証拠金取引の損益 = `暗号資産FX取引` かつ取引区分 `決済` の受渡金額 ＋ `暗号資産FXレバレッジ手数料` の受渡金額。
    **新規建玉の行は損益ゼロなので集計しない。**
  - **年間取引報告書に翌年1月1日の行が混ざる。** 対象年以外は必ず除外すること（実測で3行混入していた）。
- プライバシー: 読み込んだCSVは**一切送信しない**（fetch/XHR なし・完全クライアント処理）。
  ZIPは配布前に個人情報・実取引データを除去済（氏名の既定値・docstringの実数値・READMEの運用実績を全て架空値化）。
  `保全部\check_public_leak.py` で危険度「高」ゼロを確認してから push した。
- ⛔ **ZIPを作り直すときは必ず漏洩検査を通すこと。** 初回ビルドで氏名・BTC保有量・
  マンション売却の決済日と金額まで混入していた（push前に検知して破棄）。`__pycache__` の混入にも注意。
- 検証: HTML版のセルフテスト合格／**Nodeで実データ183取引を通しPython版と全通貨の所得金額・
  年末残高が完全一致**（合計3,007,656円）／公開URLの HTTP 200 と ZIP 94,667バイトを実測。

## 2026-08-20 — SNS動画メーカー: 処理中の経過秒カウンター（動作中か固まったかの判別）

- 対象: `digital-room/sns-video-maker/index.html`
- 症状: 「7/8枚目のAIナレーションを生成中です。」が静止表示のため、**処理が進んでいるのか固まっているのか利用者が判別できない**（事業主報告）。実際は動作中だった。
- 対策: `startProgressTicker` / `updateProgressTicker` / `stopProgressTicker` を追加。1秒ごとに `（n秒経過）` を書き換える。
  - **数字が増え続ける＝生きている / 止まる＝固まっている**、を利用者自身が判別できる設計。
  - 稼働段階: AI音声生成（枚数ごとに見出し差し替え）→ AAC変換 → MP4合成。**経過秒は通しで継続**し、映像合成に入るときだけ `{resetElapsed:true}` でリセット。
  - AI音声生成中は `progressBar` も進める（従来は映像エンコード時のみ）。
  - `waitForEncoderQueue` の5秒通知も ticker へ統合。
  - 停止は `recordVideo` の `finally`（成功・失敗・中止の全経路が通る）。
- 注意:
  - ⛔ ticker 稼働中に `setLog` を呼んでも**毎秒の書き換えで即上書きされて見えない**。進行中の文言変更は必ず `updateProgressTicker` を使うこと。
  - ticker の2回目以降は `els.log.textContent` を直接書く。`setLog` を毎秒呼ぶとスマホのトーストが出っぱなしになるため。
  - 止め忘れると数字が動き続けて「まだ処理中」と誤解させる。出口を増やすときは必ず `stopProgressTicker()` を通すこと。
- 検証: 構文チェック通過／ブラウザ実測で 0→2→4秒のカウントアップ・段階変更時の見出し差し替えと経過秒継続・`{resetElapsed:true}` でのリセット・停止後に増えないこと・タイマー残留なしを確認。
  - ⚠ 検証時に秒数が実時間の2倍に見えたが、切り分けの結果**バックグラウンドタブのタイマー間引き**（`setTimeout(1000)` の実所要が1975ms、`performance.now()` と実時計は一致）であり、カウンター側の計算は正確だった。**バックグラウンドタブでは表示更新が飛び飛びになる**点は仕様として許容。

## 2026-08-12 — SNS動画メーカー: 保存失敗の「嘘の案内」修正＋診断情報＋成否統計

- 対象: `digital-room/sns-video-maker/index.html`
- ① **嘘の案内で待たせていた実害**: AIナレーション付きMP4が失敗すると「処理待ちが長すぎるため**方式を切り替えます**」と表示していたが、`recordVideo` の catch は `return` するだけで**切り替え先が存在しない**。事業主が切替完了を延々と待つ事故が発生。
  - 対策: 文言を「⛔ 停止しました。…**この保存は終了しています**」に変更し、次の一手（動画のみMP4／自分の声で録音／時間をおく）を案内。
  - ⚠ `waitForEncoderQueue` の throw は**保存全体を終わらせる**。ここのメッセージに「再試行」「切り替え」を匂わせる語を書かないこと。
  - なお 4793行付近の「WebMで再試行します」は**実際に再試行する**ので問題ない（嘘ではない）。
- ② 診断情報（原因が事業主環境でしか再現せず、こちらのブラウザは WebCodecs 非対応で実測不能だったため）:
  - `encoderDiag` に「何コマ目/全コマ・キュー残・最長待ち」を保持し、停止メッセージに `［診断: 742/1407コマ目 / キュー残30 / 状態configured / エンコーダ報告:…］` を載せる。音声側・映像側の両ループで共通。
  - 5秒待った時点で「待機中・あと最大10秒で中止します」を表示し、無言で待たせない。
  - 成功時も所要秒を `console.info` に残す。
  - 検証: 診断ロジックを抜き出して node で4パターン実測（15秒で停止＋診断付与／5秒で進行表示／エンコーダ報告の併記／正常時127msで通過／中止）。
- ③ 保存の成否統計（事業主の仮説「写真の枚数で成功率が変わる気がする」の検証用）:
  - `recordVideo` を統計記録でラップ（`recordVideoCore` に改名して本体を分離）。3モード共通の入口なのでここ1箇所で拾える。
  - 記録項目: 日時 / 種類 / 写真枚数 / 尺 / 解像度 / 成否 / 所要秒 / 失敗理由。localStorage `nsfVideoSaveStats` に上限50件。**外部送信なし**。
  - 表示: 保存欄の折りたたみに「写真の枚数別」「保存の種類別」の成功率と直近5件の失敗理由。コピー／消去ボタン付き。
  - 成功判定は `lastRecordingBlob` の有無（`lastRecordedBlob` は存在しない変数。命名を推測しないこと）。写真0枚で弾かれたケースは記録しない（統計が濁るため）。
  - 検証: 集計ロジックを node で実測（枚数帯の境界値 1/4/5/8/9/12/13/99 を含む）／ブラウザで描画確認（表2種・失敗欄・**`<script>` 文字列がエスケープされ実行されないこと**）。
- 注意:
  - 統計の枚数帯 `PHOTO_BUCKETS` を変えるときは `bucketOf` の境界も一緒に確認すること。
  - 失敗理由は利用者が貼り付けて共有する前提。`escapeHtml` を通さずに innerHTML へ入れないこと。

## 2026-08-12 — SNS動画メーカー: 作品集を静的JSON優先に切替（GAS断続障害の構造的回避）

- 対象: `digital-room/sns-video-maker/index.html`（GAS・ワークフローは無改修）
- 発端: 事業主から「特定デプロイの配信経路だけの不調なら構造を変えて直せないのか」。切り分けたところ**直せる部分と直せない部分が明確に分かれた**。
- 切り分けの実測（同一データで比較）:

  | 取得元 | 実測 | サイズ |
  |---|---|---|
  | GAS `api=products` | 2.5s / 2.5s / **37.6s**（時間帯により全滅） | 1,367,774B |
  | 静的 `works-data.json` | **0.86s / 0.38s / 1.09s（全成功）** | 1,368,039B |

  → **GASは同じ1.3MBを毎回Sheetsから生成しており、これが遅さと不安定さの主因**。同じデータは既に `works-data.yml`（3時間おき＋登録時の repository_dispatch）で静的生成されていた。**works.html は 2026-08-04 に同じ対策を入れ済みで、動画メーカーだけが取り残されていた。**
- 実装（works.html と同一作法）:
  - `loadStaticWorksCatalog()` … `../../works-data.json` を fetch。`adoptWorksCatalog()` で正規化・ピッカー投入を共通化。
  - `loadWorksCatalog()` … ①静的で即表示 → ②裏でGASを取り、取れたら差し替え（当日登録分の反映用）／静的が失敗or空配列ならGASへフォールバック／両方失敗なら従来のエラー表示＋promise破棄。
  - `isValidWorksData()` で**空配列・エラーオブジェクトを採用しない**（0件表示で障害が隠れるため。works.html の教訓と同じ）。
- 効果は二重: 作品集が取れないと folderId 不明 → 写真読み込みが「Driveルート全体を番号検索」する遅い経路へ落ちる連鎖があった。**作品集の安定化は写真取得の速度にも効く**。
- 検証: 構文チェック通過／本番の静的JSONで595件・folderId 594件を276msで取得／ツール本体の `loadWorksCatalog` 実行で**163ms・ピッカー596件・作品情報パネルsuccess表示**／フォールバック3経路（静的404→GAS・静的空→GAS・両方失敗→エラー表示とpromise破棄）を実測。
- 残る課題:
  - **写真本体（`api=snsVideoPhotos`）はGAS依存のまま**（実測 6.9s / 27.0s / 10.2s・714KB）。Driveの画像をbase64化して返す処理のため静的化できない。Drive API直叩きは公開範囲とCORS/ORBの検証が必要で未着手。
  - 静的JSONは最大3時間古い可能性（登録直後は repository_dispatch で数分）。当日登録分は裏のGAS更新が通れば反映される。
- 注意:
  - ⛔ `STATIC_WORKS_URL` の相対パス `../../works-data.json` はページ階層に依存する。ツールを別階層へ移すときは必ず追従させること。
  - GASを完全に切らないこと。静的は生成時点のスナップショットなので、当日登録分の反映にはGAS経路が要る。

## 2026-08-12 — SNS動画メーカー: 「写真を全部クリア」ボタンを追加

- 対象: `digital-room/sns-video-maker/index.html`
- 背景: **Drive読み込みは追記動作**（`addDataUrlPhotos` が `slides` に push）なので、写真を残したまま別作品を読むと混ざる。従来の回避策はページ再読み込み（台本・演出設定も消える）か1枚ずつ削除しかなかった。月4本運用で作品を連続処理するため一括クリアを追加。
- 実装:
  - `clearAllPhotos()` … confirm確認 → objectURL解放 → `slides=[]` / `selected=-1` / `previewReviewed=false` → `resetRecordingOutput()` → 再描画。**作品名・台本・演出プリセットは保持**（写真だけ消す）。
  - `updateClearAllPhotosUi()` を `updatePhotoPanelUi()` から呼び、**写真0枚のときはボタンと説明文を隠す**。
  - `stopPreviewPlayback()` は `playing || ttsBusy` のときだけ呼ぶ（無条件だと「確認再生を停止しました」の余計なログが毎回出る）。
  - driveStatus は `setDriveStatus('','')` ではなく className を `drive-status` に戻して枠ごと消す（`show` クラスが付くと空の枠が残るため）。
- 検証（ローカル実測・ダミー写真で通し）: 写真0枚→ボタン非表示／3枚→表示・「3 / 3枚を使用」／confirmキャンセル→3枚のまま／OK→0枚・selected=-1・ボタン再非表示・driveStatus空・作品名と見どころメモは保持／クリア後に2枚読み込み→前の3枚と混ざらず2枚のみ／JSエラー0。本番配信HTMLで実装7項目の反映を確認。
- 注意:
  - 写真追加が追記である前提は変えていない。**全クリアを経ずに別作品を読むと混ざる仕様のまま**（ツール内メッセージもその案内を維持）。
  - `slides` を直接空にする処理を他へ増やすときは、objectURL解放と `selected` リセットを必ずセットで行うこと（解放漏れはメモリリーク、`selected` 放置は描画時に範囲外参照になる）。

## 2026-08-12 — SNS動画メーカー: Drive通信の自動リトライ＋誤解を招くエラー文言の修正

- 対象: `digital-room/sns-video-maker/index.html`（GASは無改修）
- 症状: 「作品番号 633 の写真を読み込めませんでした。…folderIdとDriveフォルダ番号の不整合が疑われます」。作品ピッカーも「作品集を読み込み中」のまま固まる。
- **原因は folderId 不整合ではなく GAS WebApp の間欠障害**（2026-08-04/08-06 の register.html と同じ現象）。
  - 実測: `api=products` 同一URLで 5回連続成功 → 数分後に **成功2/失敗6**（404 HTML「ページが見つかりません」・タイムアウト混在）。`api=snsVideoPhotos` は 24秒後404や2分超ハングも観測。
  - このツールの `loadJsonp` は**リトライなしのまま**だったため、1回の失敗が即エラー表示になっていた。
- 対策:
  - `loadJsonp` を最大4回試行（バックオフ 1/2/4秒）に変更。実体は `loadJsonpOnce` に分離。**このパスは読み取り系GETのみ**（snsVideoPhotos / products / translateSnsMemo）なので副作用なし。
  - 写真読み込み失敗時の文言を出し分け: 全候補がネットワーク失敗（接続不可/タイムアウト）なら「Google側の一時的な不調」と案内し、folderId不整合を疑わせない。実際にAPIが不整合を返した場合のみ従来の詳細を表示。
  - `loadWorksCatalog` の失敗キャッシュを破棄するよう修正（従来は一度全滅するとリロードまで再試行されず「読み込み中」のまま残った）。失敗時はピッカー先頭を「読み込めませんでした（次の操作で自動再試行）」に変更。
- 検証: インラインJS構文チェック通過（node --check）／本番ブラウザで workNo=633 の写真8枚読み込み成功を実測（初回JSONPが失敗→自動リトライ15秒で作品集595件取得も確認）。
- 注意:
  - ⛔ `loadJsonp` のリトライを書き込み系に流用しないこと。書き込みAPIを足すときは register.html の `gasPostJson`（requestId冪等化）方式に倣う。
  - 45秒/回のタイムアウトは snsVideoPhotos が base64写真を返して遅い（正常時も10秒超あり）ため。register.html の15秒に合わせて短縮しないこと。
  - 事業主のブラウザに旧HTMLがキャッシュされていると旧文言のエラーが出続ける。**修正確認は Ctrl+F5 後に行うこと**（2026-07-10 の教訓と同じ）。

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

## 2026-08-06 — お知らせ承認を「メール返信」方式に変更（スマホ対応）

- 対象: `docs/news-publish-setup.md` §5（リポジトリのコードは無変更）
- 背景: **事業主はPCをほとんど使わない。** スマホのメールから「掲載する」を押すと
  Drive の「現在、ファイルを開くことができません」で止まり続けた。
  - デプロイは**アクティブ**、URL は**メールのボタンと完全一致**、
    「実行: 自分／アクセス: 全員」も設定済み。それでもスマホだけ通らない。
  - ボタン方式は「スマホのブラウザで Google 認証を通せること」が前提。
    ここが不安定な以上、ボタンを直しても再発する → **ブラウザを開かない経路**に変える。
- 方式: 候補メールに**返信するだけ**。10分おきのトリガーで `checkNewsReplies` が拾う。
  1行目が `掲載` / `告知`（＋Threads） / `不要`。`掲載 <本文>` で文面差し替えも可。
  結果は返信で返るのでスマホで完結する。
- 安全策:
  - 引用部分は読まない（引用中の「掲載」で誤爆しない）。コマンド以外の返信は何もしない。
  - 処理済みは Gmail ラベル `お知らせ処理済み` で判定。**掲載失敗時はラベルを外す**ので
    もう一度返信すれば再試行できる。告知だけの失敗では掲載を巻き戻さない。
- 検証: Gmail API のスタブを与えて9シナリオ実測（返信なし／掲載／告知／不要／本文差し替え／
  コマンド以外／引用中の掲載／掲載失敗／告知だけ失敗）。掲載文の抽出は**実際の候補メールの
  HTML** で確認。ドキュメント内のコードが検証済みコードと一致することも diff で確認。
- 注意:
  - ⛔ ラベル名 `お知らせ処理済み` を変えるときは `NEWS_REPLY_LABEL` も必ず揃える。
    ずれると同じお知らせを毎回掲載し続ける。
  - 掲載文の抽出は候補メールの `white-space:pre-wrap` の div に依存。
    `sendNewsApprovalEmail` の文面を変えるときは `_extractNewsText_` も見直すこと。
  - 初回だけ `checkNewsReplies` を手動実行して Gmail の認証を通す必要がある。

## 2026-08-06 — 候補メールの文面を返信方式に合わせる

- 対象: `docs/news-publish-setup.md` §5-6（リポジトリのコードは無変更）
- 事業主指摘: **「返信コマンドはメールに書いてないと覚えられない」**。そのとおりなので、
  `sendNewsApprovalEmail` の本文を差し替える手順を用意した。
- 変更点:
  - **返信の書き方（`掲載` / `告知` / `不要` / 返信しない）を本文の主役**にし、
    ボタンは「PCのブラウザからは」と添えて下に降ろした。
  - 見出しの絵文字を削除。メールで `������` に化けていたため（GAS 側ソースの文字化け）。
  - 変数（`approveUrl` / `editUrl` / `cancelUrl` / `text`）はそのまま使うので、
    `sendNewsApprovalEmail` の他の部分は無変更でよい。
- 検証: 生成される HTML を Chromium のスマホ幅（420px）で描画して確認。
  ドキュメント内のコードが実行できることも確認。
- 実地テスト結果（返信方式）: `不要` と返信 → `お知らせ処理済み` ラベルが付与され、
  `index.html` / `news-data.json` のどちらにも追加なし。**期待どおり**。
  `掲載` / `告知` は未テスト。
- 注意: PR は squash マージなので、**マージ後は必ず main からブランチを作り直すこと**。
  そのまま次の作業を積むと、同じ内容が別コミットとして残りコンフリクトになる（本日発生）。

## 2026-08-06 — 作品集カテゴリを3段階（大→中→小）に再編

- 対象: `works.html`（商品マスター・register.html は無改修）
- 構成: `MAJOR_CATEGORIES`（大6個）→ 既存カテゴリ（中・「／」複合は分割）→ システム手帳のみサイズ別小カテゴリ（`plannerSizeOf()` が名前とサイズ欄から判定）
- 状態は `activeMajor` / `activeCategory` / `activeSize` の3変数。大の切替で下位はリセット。
- 注意:
  - **対応表に無い新カテゴリは自動で「✨その他」に落ちる**。適切な大分類に出したいときは `MAJOR_CATEGORIES` の該当 `cats` 配列へカテゴリ名を追記する（登録フロー側の変更は不要）。
  - `?cat=中カテゴリ名` で開くリンクは互換維持（大カテゴリも連動展開）。既存の外部リンクを壊さないこと。
  - サイズ判定は正規表現（micro5/mini6/a6/b6/バイブル/a5）。新サイズ規格を扱い始めたら `PLANNER_SIZES` と `plannerSizeOf()` の両方に追加する。
- 検証: 全591件の振り分け机上検証（その他落ちゼロ）／本番で段階展開・件数・リセット・モバイル375px横スクロールなしを実測。

## 2026-08-06 — サイズ仕分けページ新設＋作品詳細→登録画面の直行ボタン

- 対象: `size-sort.html`（新設）/ `works.html` / `Apps Script/product_register.js` / `Apps Script/WebApp.js`
- `api=setSize`: F列（サイズ）だけを書き換える軽量API。**updateProduct をサイズ修正に使わないこと**（B〜J列を全上書きするため他欄を古い値で巻き戻す）。同値上書きで自然冪等。
- `size-sort.html`: サイズ不明のシステム手帳（カテゴリ=システム手帳/手帳カバーで detectSize が null）だけを一覧化。管理ゲートは works.html と同じ SHA-256 + sessionStorage('nsf_admin_key') 共有。
- **サイズ判定の正は3箇所で同一に保つ**: works.html `plannerSizeOf` / size-sort.html `detectSize`（表記ゆれ micor5・mni6・bivle 含む）。片方だけ変えると「作品集では不明扱いなのに仕分けページに出ない」等の不整合になる。
- works.html: `#admin-edit-link`（管理者パネル内）→ `register.html?edit=商品ID`。updateAdminUI 内で href を更新（updateModal 経由で作品切替に追従）。
- このページは常設の「取りこぼし回収箱」。サイズ表記なしで登録された作品が今後も自動で並ぶ。

## 2026-08-06 — 手帳カバーのサイズを判型系に分離＋仕分けページに自由入力

- 対象: `works.html` / `size-sort.html`（GAS・マスターは無改修）
- サイズの物差しは2系統: システム手帳=リング規格（`PLANNER_SIZES`）／手帳カバー=判型（`COVER_SIZES`: A6/B6/A5/B5/A4/新書判/トラベラーズ レギュラー・パスポート）。`sizeOf()` がカテゴリ「手帳カバー」の有無で判定系を選ぶ。
- 表記対応: torinco1→B6（B6変型手帳）、TNP→トラベラーズ パスポート。
- 特殊規格は仕分けページの「✏️ 自由入力」で任意文字列をF列へ保存。作品集では「その他サイズ」に分類される。
- **未仕分けの定義は「detectSizeがnull かつ サイズ欄が実質空」**（空欄 or「事前にお問い合わせください」）。実値が入っていれば定型に一致しなくても仕分け済み扱い（`hasNoSizeValue`）。この既定文を変えるときは同関数も更新すること。
- 注意:
  - 判定条件は works.html（plannerSizeOf/coverSizeOf）と size-sort.html（detectSize）で**同一に保つ**。
  - サイズチップは中カテゴリ選択に追従し、中切替で `activeSize` をリセットする。この挙動を外すと「文庫で絞ったままシステム手帳に切替」のような矛盾状態になる。
- 検証: 本番でカバー選択時チップ切替・パスポート2件絞り込み・仕分けページの行別ボタン出し分けを実測。

## 2026-08-12 — 登録・更新完了時に作品集静的データを即時再生成

- 対象: `register.html` / `.github/workflows/works-data.yml`
- 背景: works-data.json の更新が3時間おきのため、登録直後にGAS障害が重なると「登録したのに作品集に出ない」→二重登録が発生（NF2026_633/634事案）。
- 実装: 登録・更新完了時に `triggerWorksDataRebuild()` が `repository_dispatch`（event_type: product-registered）を発火 → works-data ワークフローが即時実行。
- 注意:
  - **workflow_dispatch ではなく repository_dispatch を使うこと。** 保有PAT（fine-grained / Contents: RW）で叩けるのは後者のみ（前者は actions: write が必要）。
  - 発火失敗は登録の成否に影響させない設計。完了画面の `#worksRebuildStatus` に結果を出し、失敗時は3時間おきの定期更新が保険で拾う。
  - スケジュール実行を削らないこと（ブラウザにトークン未設定の端末から登録した場合の唯一の反映経路）。
- 検証: 実PATで dispatch 204 → run が event=repository_dispatch で起動・success。GAS 5連続404の時間帯でもビルド側リトライ（6回目成功）で完走することを実証。

## 2026-08-12 — 作品を名指しで案内するリンクとSNSプレビュー

- 対象: `works.html` / `tools/build_work_pages.js`（新設）/ `.github/workflows/works-data.yml`
- 目的: SNSから約650件の作品集に送っても目当ての1点にたどり着けない。作品単位のURLとOGPを用意した。
- 構成: SNSに貼るのは `works/<商品ID>.html`（OGP付き・自動生成）。開くと `works.html?id=...` へ転送し詳細モーダルが直接開く。
- 注意:
  - **自動オープンは `deepLinkOpened` で1回だけ。** `applyData` は静的→GASの2回走るため、外すと閉じたモーダルが勝手に開き直す。
  - `works/` 配下は**全て自動生成**。手で編集しても次回のワークフローで上書きされる。文面を変えるときは `build_work_pages.js` を直すこと。
  - 生成は `build_works_data.js` の**後**に走らせる（works-data.json を入力にするため）。
  - OGP画像はDriveサムネイルを `sz=w1200` に正規化している。Twitterbot / facebookexternalhit から 200 image/jpeg で取得できることを実測済み（Driveだから駄目、ではない）。
  - 掲載を取り下げた作品のページは削除される。SNSに貼った旧URLは404になるが、削除済み商品が開けるより安全と判断。
- 検証: 両クローラUAでOGP取得・画像取得、ブラウザで転送→自動オープン→共有ボタンのコピー、再オープン抑止、生成の冪等性を本番実測。

## 2026-08-12 — Threadsでプレビューが出ない件の修正（OGPの落とし穴2つ）

- 対象: `tools/build_work_pages.js` / `works.html`
- ⛔ **作品ページに `meta http-equiv="refresh"` を復活させないこと。** Metaのクローラは refresh を追い、
  追った先（works.html）を読む。転送は `location.replace` だけにして、クローラはOGPを読んで止まらせる。
- ⛔ **og:image に `drive.google.com/thumbnail?id=...` を使わないこと。** 302で lh3 へ転送し、
  Metaのクローラが画像を拾えない。`https://lh3.googleusercontent.com/d/<fileId>=w1200` を
  ファイルIDから組み立てる（転送ゼロ・facebookexternalhit から200 image/jpeg を実測）。
- `works.html` にも共通OGPを入れてある（作品集トップが直接貼られたときの保険）。
  1作品を貼るときは `works/<商品ID>.html` を使うこと。
- SNSはOGPをURL単位でキャッシュする。直した後は新しい投稿で確認する（古い投稿は古い結果のまま）。
- 検証: facebookexternalhit / Twitterbot / Discordbot の3UAでOGPと画像取得（転送なし）を本番実測。
  人間側のJS転送→モーダル自動オープンも実測。

## 2026-08-12 — ?id= で詳細が開かない不具合の修正

- 対象: `works.html`
- ⛔ **`openDeepLinkedWork` で Drive の写真取得を待ってからモーダルを開かないこと。**
  GAS が不調だと `fetchJsonp` が返らず永久に開かない（2026-08-12 実害）。
  代表写真は静的データにあるので**まず開き、残りは裏で足して `updateModal()` で反映**する。
- `deepLinkOpened` は**実際に開けたときだけ立てる**。待つ前に立てると、後から届く
  GASデータでやり直せなくなる。
- 検証時の注意: GitHub Pages は `Cache-Control: max-age=600`。デプロイ直後の10分間は
  **サーバは新・ブラウザは旧**という状態が起きる。`?cb=` を付けるか、
  `document.documentElement.outerHTML` に目印の文字列が含まれるかで
  「今見ているのが新コードか」を必ず確認してから判定すること（今回2回誤判定した）。

## 2026-08-22 — 動画メーカー: Drive読み込み中の進行バナーを追加

- 対象: `digital-room/sns-video-maker/index.html`（GASは無改修）
- 症状: register.html の「動画をつくる」から遷移すると、写真が並ぶまで何も起きていないように見え、読み込み中か固まったのか分からない。
- 原因: 写真が出るまでに **5段階**（①作品情報の取得 ②Drive写真の取得 ③画像処理 ④作品情報の反映 ⑤長文英訳）を通るが、**①③④は完全に無表示**、②⑤も静的な1行だけ。さらに `setDriveStatus()` の出力先 `.drive-status` は `<details class="drive">` の中にあり、**閉じていると見えない**。
- 対策:
  - 折りたたみの外・写真パネル最上部に `#driveProgress` を新設。スピナー＋段階名＋**経過秒**＋「ステップ n / 5」。
  - `setDriveProgress(step, label)` / `stopDriveProgress()` を追加。1秒ごとに経過秒を書き換えるので、**数字が増え続けていれば生きている**と利用者が判別できる（2026-08-20 の progressTicker と同じ思想）。
  - URL起動時は最初の `syncWorkFromNumber()` から表示し `try/finally` で必ず消す。候補なしの早期return経路にも `stopDriveProgress()` を置いた。
- 実測（本番）: 読み込み全体で **28秒**（うちステップ2のDrive写真取得が約14秒以上）。別の回では **68秒**でもカウンターは正常。モバイル375pxで幅317・横スクロールなし・JSエラー0。
- 注意:
  - ⛔ `setDriveProgress` から `setLog` / `els.log` を触らないこと。毎秒呼ぶとスマホのトーストが出っぱなしになる（progressTicker と同じ罠）。
  - このバナーは**速度改善ではない**。Drive写真取得API自体の軽量化は未着手。
  - 段階を増やすときは `DRIVE_PROGRESS_STEPS` の配列も更新すること（「ステップ n / 5」の分母が配列長）。

## 2026-08-22 — 証憑チェックリスト: 証憑の中身をクリックで確認できるように

- 対象: `order_estimate/admin.html`（バックエンドはリポジトリ外の `監理部\receipt_viewer.py`）
- 従来: モーダルは `local_path` を文字列表示するだけで、中身を見る手段がなかった。
- 証憑本文には**氏名・自宅住所・メールアドレス・注文番号**が含まれる（Apple請求書で実測）。
  ⛔ **`receipt-checklist.json` に本文を入れないこと。** GitHub Pages は置いた時点で全世界公開。
- 方式: 事業主PCの中だけで動く閲覧サーバ（`監理部\receipt_viewer.py` / 127.0.0.1:8791）の
  `/view?path=...` を**新しいタブ**で開く。txtは本文、pdf・画像は埋め込みでサーバ側が整形する。
- ⛔ **ローカルサーバを fetch で呼ばないこと（2026-08-22 実測）。**
  本番（https://you0810jmsdf.github.io）から `http://127.0.0.1` への fetch は
  **ブラウザが送出前に遮断する**（`ERR_BLOCKED_BY_CLIENT`・ローカルサーバのログにも到達記録が残らない）。
  一方 `window.open` によるトップレベル遷移は通る（サーバ側ログで 200 を実測）。
  初版は fetch でモーダル内展開する実装だったため作り直した。`localhost:8000` で配信して開くと
  fetch も通ってしまうので、**この経路の検証は必ず本番URLで行うこと**。
- 同じ理由で `rcViewerAlive()` は本番では常に false になる。これを根拠に
  「ビューアが起動していません」と**断定表示しないこと**（起動中でも false になるため）。
  常設の「開かないときはここから起動」案内に留めてある。
- 起動ボタンは `nsf-receipt://` （HKCU に登録した URL プロトコル・`監理部\証憑ビューア_URL登録.reg`）。
  起動するのは固定batのみで URL の中身は引数として渡さないため、他サイトから踏まされても害はない。
- 検証: 証憑104件すべて `/view` が 200（NG 0件）／`監理部\.env`・確定申告フォルダ等4パターンは 404 で遮断／
  別オリジンには CORS ヘッダを返さない／**本番ページのボタン実クリックからサーバへ到達（200）**／
  インラインJS構文チェック通過／`check_public_leak.py` 危険度「高」ゼロ／Pages デプロイ success。
- 既知の課題: 証憑の実体が3フォルダに分散している（`receipts\processed` 82件 / `utility_bills` 24件 /
  `カルチャースクール\講師謝礼` 8件）。サーバの `ALLOWED_ROOTS` はこの3つを許可している。
  **証憑の保存先を増やしたら `ALLOWED_ROOTS` にも追記しないと「見つかりません」になる。**

## 2026-08-22 — 証憑チェックリスト: 取得が止まっていることを画面で分かるように

- 対象: `order_estimate/admin.html`（生成側は `監理部\fetch_email_receipts.py`）
- 発端: GmailのOAuthトークンが失効し、**証憑の自動取得が8日間止まっていた**のに、この画面は正常に見えていた。
- ⚠ **原因は「表が埋まっている＝取得できている」ではないこと。** チェックリストの更新には
  Gmailを使わない経路（`--checklist-only`）があり、保存済みファイルを数え直すだけで表が埋まり、
  成功ログまで残る。取得の生死が画面のどこにも出ていなかった。
- 実装: JSONに `health` を追加（`build_receipt_health()`）。`rcRenderHealth()` が表の上に出す。
  - 内容は**日付と件数だけ**。⛔ 認証情報を入れないこと（このJSONは公開される）。
  - しきい値は7日（OAuth同意画面が「テスト」状態だとリフレッシュトークンが7日で失効するため）。
  - 警告文には「表が埋まっていても取得できている証拠にはならない」を必ず残すこと。これが8日見逃した理由。
- 検証: 復旧前 token_age_days=8 で赤バー表示 → 再認証後 0 で消滅。**出る・消えるの両方向を本番で実測**。
- 復旧手順は `監理部\Gmail連携_失効対策手順.md`（リポジトリ外）。切れたら `token.json` を退避してから再認証する。

## 2026-08-23 — 証憑チェックリスト: ラクマ列の追加と、会計送信の二重計上防止

- 対象: `order_estimate/admin.html`（生成側は `監理部\fetch_email_receipts.py`）
- 楽天ラクマ（収入）を自動取得に追加。過去1年11件・計¥60,080を回収した。
  **売上証憑が1件も取れていない販売チャネルだった。**
- ⚠ **1取引で複数のメールが届くチャネルに注意。** ラクマは購入申請→決済完了→発送→受取→
  取引完了→評価と最大6通来る。件名を「取引完了」に絞っているのは、受取金額（手数料・送料の
  差引後＝入金額）を持つのがこの1通だけだから。⛔ 広げると同じ取引が二重計上になる。
- **二重計上の穴を2つ塞いだ:**
  1. 同じ請求の証憑が2枚あるケース（Microsoft 365 = メール領収書＋手動DL請求書、
     Claude Code = Anthropicメール＋Stripe請求書）。金額の抽出漏れを直した結果、
     両方が会計へ送られる状態になった。`rcSendAccountingRows` で
     「同じ列・日付・金額」を1件に畳む。実測 11行→10行。
     ⚠ **日付が違うものは畳まないこと**（Apple ¥150 の 2/11・2/14・2/20 は別々の課金）。
  2. `manual_pick`（個別採用）は `RC_ACCOUNT_DEFAULTS` に無く、フォールバックの「通信費」で
     送られていた。採り込んだ売上¥2,165が通信費で計上される。→ 会計送信の対象外にした。
- 金額表示の修正（前日からの続き）: Microsoft 365 の `JPY 14,900.00` に対応。
  同メールの「更新日:2027年6月13日」（次回更新日）を取引日と誤認していたため、
  **受信日より未来の日付は受信日で置き換える**汎用ルールを入れた。
  結果、全118レコードで未来日付0件・日付なし0件。残る金額なしは水道14件のみ
  （本文が通知URLだけで金額を持たないため原理的に不可）。
- 検証: 既存証憑の金額が書き換わっていないことをコミット間の差分で確認（変化は新規分のみ）／
  本番でラクマ列の表示と重複除去を実測／漏洩検査 危険度「高」ゼロ。

## 2026-08-23 — 監理幕僚室に「レシート取込（スマホ）」を新設

- 対象: `kanri-room/receipt-intake/index.html`（新設）/ `kanri-room/receipt-intake/rules.json`（新設）/ `kanri-room/index.html`
- 目的: スマホのカメラ・スクショからレシートをAIで読み取り、科目・税区分・家事按分を確認して台帳（GAS Sheets）＋Drive へ保存。MF仕訳帳CSVとの重複統合もここで行う。
- バックエンド: GAS `Nsfactory-ReceiptIntake`（`デジタル部\監理幕僚ROOM\GAS\receipt-intake\`・リポジトリ外）。台帳は `デジタル部\サイト管理\GASリンク台帳.md`。
- 認証: `admin-gate.js` 通過時の `sessionStorage('nsf_admin_key')` を GAS の key に使う（okj-notify と同方式）。
- ⛔ **解析モデルはサーバー側固定（claude-haiku-4-5）。** ページから model を送っても無視される設計。変更は ScriptProperties `RECEIPT_MODEL`。
- ⛔ **GAS 呼び出しは `gas()` ラッパーを通すこと。** HTML応答・間欠404を3回まで再送する。`register` は `requestId`＋画像ハッシュで冪等なので再送しても二重登録にならない。他の書き込みAPIを足すときも先に冪等化すること。
- ⛔ **rules.json だけを直さないこと。** 正本は `監理部\経理ルール.md`。両方を同時更新する。按分率「要決定」（ratio:null）の科目は登録時に手入力を強制する設計。
- 画像は端末側で長辺1280px・JPEG 0.85 に縮小してから送る（GAS側上限 base64 2MB）。
- 統合整理タブは MF仕訳帳CSV をブラウザ内で読み、外部送信しない。`receipt-checklist.json` は金額・日付・サブスク名だけ参照する。
- 検証: インラインJS構文チェック通過／`check_public_leak.py` 危険度「高」ゼロ／Pages deploy success／公開URL HTTP 200／ブラウザでルール描画・横はみ出しなし・JSエラー0を実測。
  **GAS本体は所有者のOAuth初回承認待ちのため未検証**（`/exec` が403）。承認後に通し検証を行うこと。

## 2026-08-23 — レシート取込: 経理ルールを非公開化＋証憑チェックリストにスマホ取込列

- 対象: `kanri-room/receipt-intake/index.html` / `order_estimate/admin.html`（`rules.json` は削除）
- ⛔ **経理ルールを公開ファイルに戻さないこと。** 店名（取引先）と家事按分率は事業の内部情報。
  GAS内蔵の `Rules.js` を `action=rules`（管理者キー必須）で取得する。正本は `監理部\経理ルール.md`。
  公開URL `kanri-room/receipt-intake/rules.json` が **404** であることを実測済み。
- ルールを取得できないときは科目「不明」1件だけの最小構成にフォールバックし、
  **登録できない旨を表示して手を止める**。誤った科目で登録されるより安全と判断した。
- 証憑チェックリストに `camera`（スマホ取込）列を追加。
  ⛔ **この列に店名・ファイルパス・メモを出さないこと**（`receipt-checklist.json` は公開される）。
  公開側は日付・金額・件数のみ、明細は管理者キーで保護されたレシート取込ツールで見る。
  コレクタは `collect_camera_records(month, detail=False/True)` の1本。detail=True は
  `export_tax_csv.py`（ローカル出力）専用。
- ⛔ **camera 列を会計送信の対象に戻さないこと。** レシート取込ツール側が「MF取込CSV（未登録分）」を
  出すため、admin.html からも送ると二重計上になる（`manual_pick` と同じ扱い）。
- **バグ修正**: 科目切替で前の按分率が残っていた（旅費交通費71.4% → 水道光熱費 で 0.714 が残存）。
  「要決定」の区分は必ず空欄にする。未決定の按分率のまま経費計上される事故を防ぐ。
- 検証: Playwright（管理者キー投入）で GAS 経由のルール取得・科目連動4パターン・修正前後の按分率を実測／
  公開URLの 404 と既存4ページの 200／検証データは台帳・Drive・ローカルから撤去済み。
