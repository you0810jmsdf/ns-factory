# 作品集 縦スクロール動画（SNS投稿用）

`works.html`（作品集ページ）を上から下まで滑らかに縦スクロールしながら録画し、
SNS 投稿用の縦型（9:16 / 1080×1920）動画を生成するツールです。

## 生成物

- `assets/works-scroll-sns.mp4` — MP4 / H.264、1080×1920、約15秒。
  Instagram リール・TikTok・YouTube ショート・X などにそのまま投稿できます。

## 再生成手順

Playwright（Chromium）と ffmpeg が必要です。

```bash
# 1) リポジトリ直下でローカルサーバを起動（画像がローカル参照のため必須）
python3 -m http.server 8099

# 2) 別ターミナルで録画（webm を出力）
mkdir -p /tmp/works-video
node tools/scroll-video/record-works-scroll.js /tmp/works-video

# 3) SNS 向けに MP4(H.264) へ変換
ffmpeg -y -i /tmp/works-video/*.webm \
  -c:v libx264 -pix_fmt yuv420p -profile:v high -crf 20 -preset slow \
  -movflags +faststart -r 30 assets/works-scroll-sns.mp4
```

## 調整ポイント（`record-works-scroll.js`）

- `W`, `H` — 出力解像度。縦型は 1080×1920。正方形にするなら 1080×1080。
- スクロール速度 — `step`（1フレームあたりの移動px）と `frameMs`（フレーム間隔）。
  ゆっくりにするには `step` を小さく。
- 冒頭・末尾の静止時間 — `waitForTimeout(1200)` の値。
