# サイト監視とメール通知

`site_monitor.py` は N's factory の公開ページと Drive/GAS 連携の異常を確認する監視スクリプトです。

## 監視対象

- GitHub Pages の主要ページが HTTP 200 で返ること
- Googleログイン画面、Google Drive エラー画面、404画面に化けていないこと
- `mini6-photos.json` がJSONとして読めること
- 作品集用GAS APIがJSONPとして返ること

## 実行方法

```powershell
cd C:\Users\nsfactory\OneDrive\レザークラフト\広報部\サイト管理\ns-factory
py scripts\site_monitor.py
```

異常がある場合は終了コード `2` で終了します。

## メール通知設定

メール通知を使う場合は、`C:\Users\nsfactory\OneDrive\レザークラフト\保全部\.env` に以下を設定します。

```env
SITE_MONITOR_EMAIL_TO=通知先メールアドレス
SITE_MONITOR_EMAIL_FROM=送信元メールアドレス
SITE_MONITOR_SMTP_HOST=smtp.gmail.com
SITE_MONITOR_SMTP_PORT=587
SITE_MONITOR_SMTP_USER=送信元メールアドレス
SITE_MONITOR_SMTP_PASSWORD=アプリパスワード
```

Gmailを使う場合、通常のGoogleアカウントパスワードではなく、Googleアカウント側で発行したアプリパスワードを使います。

通知は「正常から異常へ変わった時」など、異常状態が変化した時だけ送信します。同じ異常で毎回メールが飛ばないように、状態は `.monitor\site-watch-state.json` に保存します。
