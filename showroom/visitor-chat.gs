/**
 * visitor-chat.gs — 3Dショールーム 来店者チャット（お客様同士の会話）
 *
 * 仕組み:
 *   来店者の在室情報と直近メッセージを GAS の CacheService に短期保存し、
 *   ショールームのページが数秒おきにポーリングして表示します。
 *   スプレッドシート等は不要（メッセージは最大50件・在室情報は約60秒で自動消滅）。
 *
 * デプロイ手順（VISITOR_CHAT_SETUP.md 参照）:
 *   1. https://script.google.com で新規プロジェクト（例: nsfactory-visitor-chat）
 *   2. このコードを貼り付けて保存
 *   3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *        実行ユーザー: 自分 ／ アクセスできるユーザー: 全員
 *   4. 発行された /exec URL を showroom/index.html の
 *      SHOWROOM_CONFIG.visitorChatApi に設定
 *
 * API（すべて GET + JSONP。callback パラメータ必須）:
 *   ?action=join&name=<名前>&avatar=<絵文字>          → {ok,id,token}
 *   ?action=poll&id&token&since=<通し番号>            → {ok,visitors:[...],messages:[...],seq}
 *   ?action=say&id&token&text=<本文>                  → {ok} / {error}
 *   ?action=leave&id&token                            → {ok}
 */

var VISITOR_TTL_SEC = 60;      // ポーリングが途絶えて60秒で退室扱い
var MSG_KEEP = 50;             // 保持する直近メッセージ数
var MSG_MAX_LEN = 120;         // 1メッセージの最大文字数
var SAY_INTERVAL_MS = 2000;    // 連投制限（1人あたり2秒に1回）
var NAME_MAX_LEN = 12;

// 禁止ワード（必要に応じて追記）。含まれていたら投稿を拒否
var NG_WORDS = ['死ね', '殺す', 'カス', 'http://', 'https://'];

function doGet(e) {
  var p = (e && e.parameter) || {};
  var callback = p.callback || '';
  var out;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    out = handle_(p);
  } catch (err) {
    out = { error: String(err && err.message ? err.message : err) };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
  var json = JSON.stringify(out);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function handle_(p) {
  var cache = CacheService.getScriptCache();
  var now = Date.now();
  var visitors = readJson_(cache, 'vc_visitors', {});
  // 期限切れの来店者を掃除
  var changed = false;
  Object.keys(visitors).forEach(function (id) {
    if (now - (visitors[id].last || 0) > VISITOR_TTL_SEC * 1000) { delete visitors[id]; changed = true; }
  });

  var action = p.action || '';

  if (action === 'join') {
    var name = sanitize_(p.name, NAME_MAX_LEN) || 'ゲスト';
    var avatar = sanitize_(p.avatar, 4) || '🙂';
    var id = 'v' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    var token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    visitors[id] = { name: name, avatar: avatar, token: token, last: now, lastSay: 0 };
    writeJson_(cache, 'vc_visitors', visitors);
    addSystemMsg_(cache, avatar + ' ' + name + ' さんが来店しました');
    return { ok: 1, id: id, token: token };
  }

  var v = visitors[p.id];
  if (!v || v.token !== p.token) {
    if (changed) writeJson_(cache, 'vc_visitors', visitors);
    return { error: 'not_joined' };
  }

  if (action === 'poll') {
    v.last = now;
    writeJson_(cache, 'vc_visitors', visitors);
    var msgs = readJson_(cache, 'vc_msgs', []);
    var since = Number(p.since || 0);
    var fresh = msgs.filter(function (m) { return m.i > since; });
    var seq = msgs.length ? msgs[msgs.length - 1].i : since;
    var list = Object.keys(visitors).map(function (id) {
      return { id: id, name: visitors[id].name, avatar: visitors[id].avatar };
    });
    return { ok: 1, visitors: list, messages: fresh, seq: seq };
  }

  if (action === 'say') {
    if (now - (v.lastSay || 0) < SAY_INTERVAL_MS) return { error: 'slow_down' };
    var text = sanitize_(p.text, MSG_MAX_LEN);
    if (!text) return { error: 'empty' };
    for (var i = 0; i < NG_WORDS.length; i++) {
      if (text.toLowerCase().indexOf(NG_WORDS[i].toLowerCase()) !== -1) return { error: 'ng_word' };
    }
    v.last = now; v.lastSay = now;
    writeJson_(cache, 'vc_visitors', visitors);
    pushMsg_(cache, { id: p.id, name: v.name, avatar: v.avatar, text: text });
    return { ok: 1 };
  }

  if (action === 'leave') {
    addSystemMsg_(cache, v.avatar + ' ' + v.name + ' さんが退店しました');
    delete visitors[p.id];
    writeJson_(cache, 'vc_visitors', visitors);
    return { ok: 1 };
  }

  if (changed) writeJson_(cache, 'vc_visitors', visitors);
  return { error: 'unknown_action' };
}

/* ---------- helpers ---------- */
function sanitize_(s, maxLen) {
  return String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}
function readJson_(cache, key, fallback) {
  try { var raw = cache.get(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
}
function writeJson_(cache, key, obj) {
  cache.put(key, JSON.stringify(obj), 21600); // 6時間（キャッシュ上限）
}
function pushMsg_(cache, m) {
  var msgs = readJson_(cache, 'vc_msgs', []);
  var seq = Number(cache.get('vc_seq') || 0) + 1;
  cache.put('vc_seq', String(seq), 21600);
  m.i = seq; m.t = Date.now();
  msgs.push(m);
  if (msgs.length > MSG_KEEP) msgs = msgs.slice(msgs.length - MSG_KEEP);
  writeJson_(cache, 'vc_msgs', msgs);
}
function addSystemMsg_(cache, text) {
  pushMsg_(cache, { id: 'sys', name: '', avatar: '', text: text, sys: 1 });
}
