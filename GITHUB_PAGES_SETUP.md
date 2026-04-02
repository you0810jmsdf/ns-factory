# GitHub Pages 公開手順

## 1. GitHub で空のリポジトリを作る

おすすめの名前:

- `nsfactory-pages`

作成時のポイント:

- `Public` で作成
- `README` は追加しない
- `.gitignore` も追加しない
- License も追加しない

## 2. このフォルダでコマンドを実行する

作業フォルダ:

- `C:\Users\nsfactory\OneDrive\Documents\Playground\nsfactory-pages`

GitHub で作ったURLを入れて、以下を PowerShell で実行します。

```powershell
cd C:\Users\nsfactory\OneDrive\Documents\Playground\nsfactory-pages
git remote add origin https://github.com/<your-account>/nsfactory-pages.git
git add .
git commit -m "Initial GitHub Pages publish"
git push -u origin main
```

## 3. GitHub Pages を有効化する

GitHub リポジトリの

- `Settings`
- `Pages`

で次を選びます。

- `Source`: `Deploy from a branch`
- `Branch`: `main`
- `Folder`: `/ (root)`

## 4. 公開URL

通常は次の形式になります。

```text
https://<your-account>.github.io/nsfactory-pages/
```

## 5. 公開後の確認

- トップページが開く
- 見積もりページへ自動移動する
- カラーシミュレーションが動く
- リング画像が表示される
- 管理画面が開く

管理画面URL:

```text
https://<your-account>.github.io/nsfactory-pages/order_estimate/ring-price-stock-admin.html
```
