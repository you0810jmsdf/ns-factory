# アフィリエイトリンクの追加方法

JHCSページ下部の「レザークラフト道具リンク」は、基本データを `affiliate-links.json` から読み込みます。
ページ上の「道具リンクを追加」から追加した分は、GASのスプレッドシート `道具リンク` に保存されます。

## サイト上から追加する場合

1. JHCSページを開く
2. 「道具リンクを追加」を押す
3. 管理者パスワードを入力する
4. 楽天ROOMのURLを貼る
5. 「ROOMから取得」を押す
6. 道具名・カテゴリ・紹介文を整える
7. 「保存する」を押す

楽天ROOM側のページ構造によっては紹介文が取れない場合があります。その場合は手入力してください。

## GAS側の準備

Apps Script に `order_progress_GAS.js` の最新版を反映してください。
初回保存時に、スプレッドシートへ `道具リンク` シートが自動作成されます。

管理者パスワードは Script Properties の `JHCS_ADMIN_PASSWORD` または `ADMIN_PASSWORD` を参照します。

## JSONへ直接追加する場合

1. `affiliate-links.json` の `items` 配列に1件追加する
2. `name`, `category`, `description`, `links` を入力する
3. `links` は複数登録できます
4. 保存後、GitHub Pagesへ反映する

## 追加例

```json
{
  "name": "追加したい道具名",
  "category": "仕上げ",
  "description": "ページに表示する短い説明です。",
  "links": [
    {
      "label": "おすすめ",
      "url": "https://room.rakuten.co.jp/you0810jmsdf/xxxxxxxxxxxxxxxxxxxx",
      "kind": "楽天ROOM"
    }
  ]
}
```

`category` は既存カテゴリと同じ名前にすると、同じ絞り込みボタンにまとまります。
