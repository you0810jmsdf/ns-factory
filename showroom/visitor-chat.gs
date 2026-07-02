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
    botGreet_(cache, name, now);
    return { ok: 1, id: id, token: token };
  }

  var v = visitors[p.id];
  if (!v || v.token !== p.token) {
    if (changed) writeJson_(cache, 'vc_visitors', visitors);
    return { error: 'not_joined' };
  }

  if (action === 'poll') {
    v.last = now;
    // 3D空間内の現在位置（任意）。ページ側がカメラ位置を送ってくる
    if (p.x !== undefined && p.z !== undefined) {
      var px = Number(p.x), pz = Number(p.z);
      if (isFinite(px) && isFinite(pz)) { v.x = clamp_(px, -15, 15); v.z = clamp_(pz, -11, 11); }
    }
    writeJson_(cache, 'vc_visitors', visitors);
    var msgs = readJson_(cache, 'vc_msgs', []);
    var since = Number(p.since || 0);
    var fresh = msgs.filter(function (m) { return m.i > since; });
    var seq = msgs.length ? msgs[msgs.length - 1].i : since;
    var list = Object.keys(visitors).map(function (id) {
      var o = { id: id, name: visitors[id].name, avatar: visitors[id].avatar };
      if (visitors[id].x !== undefined) { o.x = visitors[id].x; o.z = visitors[id].z; }
      return o;
    });
    // スタッフ「ちえみ」は常に在室（店内を徘徊）
    var bp = botPos_(now);
    list.push({ id: BOT.id, name: BOT.name, avatar: BOT.avatar, x: bp.x, z: bp.z });
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
    // まずスタッフちえみが反応。しなかった時だけ販売幕僚が相槌（同時に喋らない）
    if (!botReply_(cache, text, now)) maybeStaffReply_(cache, text, now);
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

/* ---------- スタッフ「ちえみ」（常駐ボット） ----------
   N's factory（個人事業主）のスタッフとして常に在室。
   入店した方への挨拶・呼びかけ（「ちえみ」を含む発言）への返事・
   キーワードへのおしゃべりを担当。3D空間では店内をゆっくり歩き回る。 */
var BOT = { id: 'chiemi', name: 'ちえみ', avatar: '👩' };
var BOT_COOLDOWN_MS = 12000;   // おしゃべりの最短間隔（呼びかけ時は無視）
var BOT_RANDOM_RATE = 0.35;    // キーワード不一致時に反応する確率

var BOT_RULES = [
  { re: /(手帳|ノート|バインダー|リフィル)/, replies: [
      'わたしは Mini6 の手帳を使ってます📔 小さくてかわいいんですよ〜',
      '手帳、革の匂いがすごくいいんです。実物もぜひ見てほしいです！',
      'リフィルをたっぷり挟むならリング大きめがおすすめです◎'] },
  { re: /(財布|ウォレット|コインケース|小銭)/, replies: [
      '馬蹄型コインケース、わたしも愛用してます！開けるたびちょっと嬉しくなります',
      'お財布は色で選ぶのも楽しいですよ〜'] },
  { re: /(革|レザー|色|カラー)/, replies: [
      '革の色は「オーダー相談」で写真から選べますよ。わたしはターコイズ推しです💙',
      'ヌメ革は使ってると色がどんどん深くなるんです。育てがいがあります！'] },
  { re: /(かわいい|可愛い|素敵|すてき|いいね|おしゃれ|きれい|綺麗)/, replies: [
      'ですよね！わたしもお店のぜんぶお気に入りなんです😊',
      'ありがとうございます！店長に伝えたら喜びます〜'] },
  { re: /(こんにちは|こんばんは|おはよう|はじめまして|よろしく)/, replies: [
      'いらっしゃいませ〜！スタッフのちえみです。ごゆっくりどうぞ😊',
      'こんにちは！気になる作品があったら聞いてくださいね'] },
  { re: /(おすすめ|オススメ|人気)/, replies: [
      'おすすめは A6 の手帳と馬蹄コインケースです！どちらも革の香りがいいんですよ',
      '迷ったら販売幕僚さんの「オーダー相談」が便利です。写真で革を選べます📷'] },
  { re: /(ありがとう|たすかる|助かる)/, replies: [
      'こちらこそありがとうございます！またいつでも遊びにきてくださいね😊'] }
];
var BOT_GENERIC = [
  'ふふ、いいですね😊',
  'それ、わかります〜',
  '店長（個人事業主）にも伝えておきますね！'
];

/* 店内をゆっくり徘徊（時刻から決定＝全員に同じ位置が見える） */
function botPos_(now) {
  var t = now / 1000;
  return {
    x: Math.round(Math.sin(t / 37) * 6 * 10) / 10,
    z: Math.round((Math.cos(t / 51) * 4 + 3) * 10) / 10
  };
}

function botGreet_(cache, visitorName, now) {
  var last = Number(cache.get('vc_bot_last') || 0);
  if (now - last < 10000) return;
  cache.put('vc_bot_last', String(now), 21600);
  pushMsg_(cache, { id: BOT.id, name: BOT.name, avatar: BOT.avatar,
    text: 'いらっしゃいませ、' + visitorName + 'さん！スタッフのちえみです😊 気になる作品があったら気軽に聞いてくださいね' });
}

/* 返答したら true（その回は販売幕僚の相槌をスキップ） */
function botReply_(cache, text, now) {
  var addressed = /ちえみ/.test(text);
  var last = Number(cache.get('vc_bot_last') || 0);
  if (!addressed && now - last < BOT_COOLDOWN_MS) return false;
  var reply = null;
  for (var i = 0; i < BOT_RULES.length; i++) {
    if (BOT_RULES[i].re.test(text)) {
      var rs = BOT_RULES[i].replies;
      reply = rs[Math.floor(Math.random() * rs.length)];
      break;
    }
  }
  if (!reply) {
    if (addressed) {
      reply = 'はい、ちえみです😊 手帳や革のことなら何でも聞いてください！';
    } else {
      if (Math.random() > BOT_RANDOM_RATE) return false;
      reply = BOT_GENERIC[Math.floor(Math.random() * BOT_GENERIC.length)];
    }
  }
  cache.put('vc_bot_last', String(now), 21600);
  pushMsg_(cache, { id: BOT.id, name: BOT.name, avatar: BOT.avatar, text: reply });
  return true;
}

/* ---------- 販売幕僚の相槌（賑やかし） ----------
   お客様の発言にキーワード反応 or 低確率でひとこと。連発しないようクールダウン付き */
var STAFF_COOLDOWN_MS = 20000;   // 相槌の最短間隔
var STAFF_RANDOM_RATE = 0.2;     // キーワード不一致時に相槌する確率

var STAFF_RULES = [
  { re: /(手帳|ノート|バインダー|リフィル)/, replies: [
      'システム手帳でしたら A6 が一番人気です🧵 バイブルサイズも書きやすいですよ',
      '手帳は革が育つのが楽しいんです。ぜひ実物の艶をご覧ください',
      'リング径でも使い心地が変わります。お気軽にご相談ください📔'] },
  { re: /(財布|ウォレット|コインケース|小銭)/, replies: [
      'お財布は長財布からミニ財布までお仕立てできます👛',
      '馬蹄型コインケースは職人の自信作です。パカッと開く感じが気持ちいいですよ'] },
  { re: /(革|レザー|色|カラー)/, replies: [
      '当店の革はカワムラレザー取扱のみ。ブルー系だけでも12色ございます🎨',
      '色でお迷いでしたら、オーダー相談で同系色をまとめてご覧いただけます',
      'ヌメ革は使うほど色艶が深くなります。育てる楽しみをぜひ'] },
  { re: /(かわいい|可愛い|素敵|すてき|いいね|おしゃれ|きれい|綺麗)/, replies: [
      'ありがとうございます！職人が一点ずつ手縫いでお仕立てしています😊',
      'お目が高いです✨ 名入れ（刻印）もできますよ'] },
  { re: /(こんにちは|こんばんは|おはよう|はじめまして|よろしく)/, replies: [
      'いらっしゃいませ！ごゆっくりご覧ください🧵',
      'ようこそ N\'s factory へ。気になる作品があればお声がけください'] },
  { re: /(オーダー|注文|見積|値段|価格|いくら)/, replies: [
      'オーダーのご相談は、私（販売幕僚）をタップ→「オーダー相談」からどうぞ📋',
      'お見積りは仕様が決まればすぐお出しできます。お気軽に🧵'] }
];
var STAFF_GENERIC = [
  'ごゆっくりどうぞ🧵',
  '何かあればお声がけくださいね',
  '本日もご来店ありがとうございます😊'
];

function maybeStaffReply_(cache, text, now) {
  var last = Number(cache.get('vc_staff_last') || 0);
  if (now - last < STAFF_COOLDOWN_MS) return;
  var reply = null;
  for (var i = 0; i < STAFF_RULES.length; i++) {
    if (STAFF_RULES[i].re.test(text)) {
      var rs = STAFF_RULES[i].replies;
      reply = rs[Math.floor(Math.random() * rs.length)];
      break;
    }
  }
  if (!reply) {
    if (Math.random() > STAFF_RANDOM_RATE) return;
    reply = STAFF_GENERIC[Math.floor(Math.random() * STAFF_GENERIC.length)];
  }
  cache.put('vc_staff_last', String(now), 21600);
  pushMsg_(cache, { id: 'staff', name: '販売幕僚', avatar: '🧵', text: reply, staff: 1 });
}

/* ---------- helpers ---------- */
function clamp_(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
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
