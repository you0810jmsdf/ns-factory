# A6リフィルメーカー 引き継ぎノート

## 目的
`planner.html` を新規作成する。A6サイズのシステム手帳用リフィルを自由にレイアウト・印刷できるウェブアプリ。

## 作業ブランチ
`claude/planner-refill-generator-LN3bW`

## 作成ファイル
`/home/user/ns-factory/planner.html`（未作成・これが今セッションのゴール）

---

## 要件

### ページタイプ（5種）
| キー | 内容 | ページ数 |
|------|------|---------|
| `daily1` | デイリー1ページ | A6×1 |
| `daily2` | デイリー見開き | A6×2（左右） |
| `weekly` | ウィークリー見開き | A6×2 |
| `monthly` | マンスリー見開き | A6×2 |
| `annual` | 年間カレンダー見開き | A6×2 |

### カスタマイズ機能
- フォント選択（system / Noto Sans JP / Noto Serif JP / さわらび明朝 / Zen角ゴシック / しっぽり明朝）
- アクセントカラー・罫線カラー・ヘッダー背景色（カラーピッカー）
- 画像アップロード（透かし or そのまま挿入、不透明度スライダー、位置選択）
- レイアウトオプション（タイムスロット表示・時間範囲、優先事項行数、メモ行数 等）
- フッターテキスト（"N's notebook" デフォルト）

### 印刷仕様
- A4用紙に4面付け（2列×2行、各スロット105mm×148mm）
- カット目安線（点線）あり
- `@page { size:A4 portrait; margin:0; }`
- フォントはGoogle FontsのURLをprintウィンドウにも埋め込む

---

## 設計メモ

### 寸法
- A6 = 105mm × 148mm
- 穴あけ代（punch strip）= 左端 13mm
- 有効コンテンツ幅 = 92mm

### 印刷レイアウト（全タイプ共通）
```
A4 (210mm × 296mm) を 2列×2行 のグリッドに分割
┌────────────┬────────────┐
│  スロット1  │  スロット2  │ ← 148mm
├────────────┼────────────┤  ← 点線カット
│  スロット3  │  スロット4  │ ← 148mm
└────────────┴────────────┘
   105mm        105mm
```
- 全タイプで同じA4グリッドを使用
- spread系（daily2/weekly/monthly/annual）はスロット1=左ページ、スロット2=右ページ（1スプレッド分）、スロット3・4=2スプレッド目 or コピー

### A6ページ構造
```html
<div class="a6-page">
  <div class="punch"></div>   <!-- 13mm, border-right -->
  <div class="pg">
    <div class="pg-head">...</div>   <!-- 日付ヘッダー -->
    <div class="sec-lbl">...</div>   <!-- セクションラベル -->
    <!-- タイムスロット / カレンダーグリッド / 罫線 -->
    <div class="pg-foot">...</div>   <!-- フッター -->
  </div>
</div>
```

### JavaScriptアーキテクチャ
```javascript
const state = {
  type: 'daily1',
  date: new Date(),
  weekStart: getMondayOf(new Date()),
  year, month, count,
  font, accentColor, lineColor, headerBg,
  showTimeSlots, timeStart, timeEnd, timeStep,
  showPriority, priorityLines,
  showMemo, memoLines,
  image, imageMode, imageOpacity, imagePos,
  showBrand, brandText
};

// 関数構成
getPageCSS(state)          // A6ページ用CSS（mm単位）
buildDaily1Page(state, date)
buildDaily2Pages(state, date)   // [left, right]
buildWeeklyPages(state, weekStart)
buildMonthlyPages(state, year, month)
buildAnnualPages(state, year)

wrapForPreview(state)      // iframe srcdoc用HTML
wrapForPrint(state)        // window.open用 A4グリッドHTML

updatePreview()            // iframe.srcdoc に書き込む
printPages()               // window.open → window.print()
```

### プレビュー方式
- `<iframe id="preview-frame" sandbox="allow-same-origin">` に srcdoc を設定
- 96dpi換算: 105mm=397px, 148mm=559px（single）/ 210mm=794px（spread）
- CSS `transform: scale(fit)` でプレビューエリアに収める

---

## デザイントークン（既存サイトから引継ぎ）
```css
--ink:#1D1D1F; --muted:#636366; --line:#E8E8ED;
--soft:#F5F5F7; --paper:#FFFFFF;
--accent:#A0785A; --accent-soft:#F3ECE4; --accent-dark:#7A5540;
font-family:-apple-system,'SF Pro Text','Hiragino Sans','Yu Gothic',sans-serif;
```

## 参考ファイル
- `password-note/js/print.js` — A6カード印刷の実装例（4面付け、mm単位CSS）
- `password-note/style.css` — アプリUIスタイル参考
- `index.html` / `JHCS.html` — ナビゲーションスタイル参考

---

## 次セッションでやること
1. `planner.html` を新規作成（上記設計に基づき）
2. ブランチ `claude/planner-refill-generator-LN3bW` にコミット＆プッシュ
3. Claude Design の件についてユーザーに回答する

## Claude Design について（ユーザーからの質問・未回答）
ユーザーが「Claude Designはどうやって使う？このアプリには使えない？」と質問。
→ 次セッション冒頭で回答すること。
→ 回答方針: Anthropic公式の「Claude Design」という製品名は現時点では認識していない。claude.ai の Artifacts機能（HTMLをリアルタイムでレンダリングする機能）のことを指している可能性が高い。Claude Codeで直接コードを書いて実装するのが本プロジェクトには適している旨を説明する。
