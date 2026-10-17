// 授乳アラームの通知を受け取るプログラム。
// vite.config.mjs の VitePWA(workbox.importScripts) で、生成される sw.js から読み込まれる。
// ⛔ ここは Service Worker の中で動く。画面（React）のコードや import は使えない。
// ⛔ このアプリは本番でサブパス（/ns-factory/sodatelog-.../）に置かれる。
//    URL は必ず self.registration.scope（このアプリの置き場所）を基準に解決し、"/" 始まりで書かない。

var DEFAULT_TITLE = 'そだてろぐ';
var DEFAULT_BODY = '授乳の時間かもしれません。';
// renotify: true を使うには tag が必須（無いと通知が出ずに例外になる）。サーバーが tag を付けなかったときの既定値。
var DEFAULT_TAG = 'feeding-alert';

function readPayload(event) {
  var payload = {};
  if (!event.data) {
    return payload;
  }
  try {
    var parsed = event.data.json();
    if (parsed && typeof parsed === 'object') {
      payload = parsed;
    }
  } catch (error) {
    // 中身が壊れていても通知は出す（既定の文言になる）
    payload = {};
  }
  return payload;
}

function asText(value, fallback) {
  return typeof value === 'string' && value ? value : fallback;
}

self.addEventListener('push', function (event) {
  var payload = readPayload(event);
  var options = {
    body: asText(payload.body, DEFAULT_BODY),
    tag: asText(payload.tag, DEFAULT_TAG),
    renotify: true,
    data: { url: asText(payload.url, './') }
  };
  event.waitUntil(self.registration.showNotification(asText(payload.title, DEFAULT_TITLE), options));
});

// 通知から開く先を、このアプリの置き場所の中に限って決める
function resolveTargetUrl(rawUrl) {
  var scope = self.registration.scope;
  try {
    // "/" 始まりだと置き場所ではなくサイトの一番上を指してしまうので、先頭の "/" は外して相対扱いにする
    var relative = String(rawUrl || './').replace(/^\/+/, '') || './';
    var target = new URL(relative, scope).href;
    return target.indexOf(scope) === 0 ? target : scope;
  } catch (error) {
    return scope;
  }
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var targetUrl = resolveTargetUrl(data.url);
  var scope = self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var index = 0; index < windowClients.length; index += 1) {
        var client = windowClients[index];
        if (client.url.indexOf(scope) === 0 && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
