# OKJ BTC/JPY 価格通知（ntfy.sh）

OKJ（旧 OKCoin Japan）の BTC/JPY 価格を **10 万円帯ごと** に検知し、
スマホに **ntfy.sh** 経由でプッシュ通知する仕組みです。

- 監視: GitHub Actions の cron（5 分間隔）
- 通知先: [ntfy.sh](https://ntfy.sh)（スマホアプリ無料）
- 状態保存: GitHub Actions Cache（コミット不要）

```
価格 5,099,999 → 帯=50  ┐
価格 5,100,000 → 帯=51  ├─ 帯が変わったタイミングで通知
価格 4,950,000 → 帯=49  ┘
```

---

## 1. ntfy アプリを入れる

スマホに ntfy アプリをインストール。

- iOS: App Store で「ntfy」検索 → `ntfy` をインストール
- Android: Google Play で「ntfy」検索、または F-Droid

アプリを開いたら **トピック名** を 1 つ決めます。

> **重要**: ntfy.sh のトピック名は **「知っている人＝購読できる人」** です。
> 第三者に予測されない、十分長くランダムな文字列にしてください。
>
> 例: `okj-btc-zX91kQ7vN3` のように 12〜20 文字程度のランダム文字列。

アプリで「+」→「Subscribe to topic」→ 上で決めたトピック名を入力 →
サーバは `https://ntfy.sh`（既定）のまま購読開始。

動作確認のため、PC や iPhone のブラウザから

```sh
curl -d "hello" https://ntfy.sh/<決めたトピック名>
```

を送って、スマホに通知が来ることを確認しましょう。

---

## 2. GitHub Secrets を設定する

リポジトリの **Settings → Secrets and variables → Actions → Secrets** で、
以下を登録します。

| キー | 必須 | 値 |
|---|---|---|
| `NTFY_TOPIC` | ✔ | 上で決めたトピック名（例: `okj-btc-zX91kQ7vN3`） |
| `NTFY_SERVER` | – | 自前 ntfy サーバを使うときだけ（既定 `https://ntfy.sh`） |
| `NTFY_TOKEN` | – | 保護されたトピックを使うときのアクセストークン |
| `NTFY_USERNAME` | – | Basic 認証ユーザ（トークン未設定時のみ） |
| `NTFY_PASSWORD` | – | Basic 認証パスワード |

通知の粒度（既定 10 万円）を変えたい場合は、
**Settings → Secrets and variables → Actions → Variables** に
`THRESHOLD_JPY` を設定します（例: `50000` で 5 万円帯、`200000` で 20 万円帯）。

---

## 3. ワークフローを有効化

`claude/okcoin-price-notifications-ZxYrM` ブランチを **main にマージ** すると、
GitHub Actions の cron 起動が始まります。

> GitHub Actions の cron はデフォルトブランチのワークフローのみ自動実行されます。

手動で試す場合は **Actions タブ → 「OKJ BTC/JPY 価格通知」→ Run workflow** から
即時実行できます。

---

## 4. 通知例

```
タイトル: OKJ BTC/JPY ↑ ¥5,123,400

購入価格(ask)  : ¥5,123,400
売却価格(bid)  : ¥5,122,800
直近約定(last) : ¥5,123,100

24h 始値       : ¥4,980,000
24h 高値       : ¥5,150,000
24h 安値       : ¥4,950,000
24h 変動率     : +2.87 %

前回通知帯      : ¥5,000,000 〜
今回帯          : ¥5,100,000 〜
跨いだ価格幅    : 10万円 (1 段階) ↑
```

---

## 5. 仕様メモ

- **判定対象**: `best_ask`（板の最安売り = 今すぐ買うときの価格）
- **帯判定**: `floor(ask / THRESHOLD_JPY)`。前回通知時の帯と異なれば通知。
- **初回実行 (cache miss)**: state を初期化するだけで通知は送らない（誤発火防止）。
- **境界振動の抑制はしていません**: たとえば帯境界付近で
  4,999,500 ⇄ 5,000,500 と往復すると毎回通知が来ます。必要なら
  `THRESHOLD_JPY` を大きめにする、または将来的にヒステリシスを実装してください。
- **API**: `https://www.okj.com/api/spot/v3/instruments/BTC-JPY/ticker` を
  優先、失敗時は `https://www.okcoin.jp/...` にフォールバック。
- **cron 間隔**: 5 分。`.github/workflows/okcoin-price-notify.yml` の
  `cron:` を編集すれば変更可能（GitHub Actions の cron は最短 5 分）。

---

## 6. ローカル動作テスト

```sh
export NTFY_TOPIC="あなたのトピック名"
export THRESHOLD_JPY=100000
export OKCOIN_STATE_FILE=/tmp/okcoin-state.json

# 1 回目: 初期化のみ、通知なし
python3 scripts/okcoin_price_notify.py

# 強制的に通知を出したい場合は state をいじって 1 回目と違う帯にする
python3 -c "import json,sys; \
  p='/tmp/okcoin-state.json'; \
  s=json.load(open(p)); s['last_notified_band']-=1; \
  json.dump(s,open(p,'w'))"

# 2 回目: 帯が変わった扱いになり ntfy へ通知が飛ぶ
python3 scripts/okcoin_price_notify.py
```

---

## 7. 通知を止める / 一時停止する

- 一時停止: **Actions タブ → 「OKJ BTC/JPY 価格通知」→ 右上「⋯」→ Disable workflow**
- 完全削除: `.github/workflows/okcoin-price-notify.yml` を削除してコミット
- 通知先だけ替える: `NTFY_TOPIC` Secret を別トピックに差し替え
- 初期化やり直し: 手動実行時に `reset_state: true` を指定
