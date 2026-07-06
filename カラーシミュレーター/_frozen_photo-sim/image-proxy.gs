/**
 * image-proxy.gs — 画像プロキシ（カラーシミュレーター用）
 *
 * 目的:
 *   Google Drive 等の外部オリジン画像は、ブラウザのセキュリティ上そのままでは
 *   canvas で色データを読めず、カラーシミュレーターで色替えできません。
 *   この GAS が画像を取得して base64 (data URL) で返すことで、フロント側は
 *   同一オリジン扱いの data: URL として読み込め、色替えできるようになります。
 *
 * デプロイ手順（IMAGE_PROXY_SETUP.md 参照）:
 *   1. https://script.google.com で新規プロジェクトを作成
 *   2. このコードを貼り付けて保存
 *   3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *        - 実行ユーザー: 自分
 *        - アクセスできるユーザー: 全員
 *   4. 発行された /exec URL を photo-color.html の IMAGE_PROXY_URL に設定
 *      （または ?proxy=<URL> で動作確認）
 *
 * セキュリティ:
 *   任意URLの取得を防ぐため、Google の画像ホストのみ許可（ALLOWED_HOSTS）。
 */

var ALLOWED_HOSTS = [
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
  'googleusercontent.com'
];

var MAX_BYTES = 12 * 1024 * 1024; // 12MB 上限（保険）

function doGet(e) {
  var params = (e && e.parameter) || {};
  var url = params.url || '';
  var callback = params.callback || '';
  var result = {};

  try {
    if (!url) throw new Error('url is required');
    if (!isAllowed_(url)) throw new Error('domain not allowed');

    var resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (resp.getResponseCode() >= 400) {
      throw new Error('fetch failed: ' + resp.getResponseCode());
    }

    var blob = resp.getBlob();
    var bytes = blob.getBytes();
    if (bytes.length > MAX_BYTES) throw new Error('image too large');

    var contentType = blob.getContentType() || 'image/jpeg';
    if (contentType.indexOf('image/') !== 0) contentType = 'image/jpeg';

    result.dataUrl = 'data:' + contentType + ';base64,' + Utilities.base64Encode(bytes);
  } catch (err) {
    result.error = String(err && err.message ? err.message : err);
  }

  var json = JSON.stringify(result);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function isAllowed_(url) {
  var m = String(url).match(/^https?:\/\/([^\/]+)/i);
  if (!m) return false;
  var host = m[1].toLowerCase().split('@').pop().split(':')[0];
  return ALLOWED_HOSTS.some(function (d) {
    return host === d || host.slice(-(d.length + 1)) === '.' + d;
  });
}
