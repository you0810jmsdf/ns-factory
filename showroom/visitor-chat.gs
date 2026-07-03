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
var MAIL_COOLDOWN_MS = 60000;  // 来店通知メールの最短間隔（連続入店スパム防止）

/* 店長（個人事業主）モード:
   Script Properties に OWNER_KEY（店長キー・正本は 保全部\.env の SHOWROOM_OWNER_KEY）と
   NOTIFY_EMAIL（通知先。未設定ならGAS実行アカウント）を設定する。
   ページ側が okey パラメータで店長キーを送ってきたら「店長」として入店:
   - 3D空間では新アバターを出さず、徘徊中の個人事業主キャラに発言が吹き出し表示される
   - 店長在室中は雑談系の自動返答を休止（「ちえみ」名指し時のみ返答）。
     ただし即答系（色写真・革在庫・リング在庫）は店長在室中でも店長の発言でも常に応える
   - 店長の入店ではメール通知しない */

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
    var isOwner = isOwnerKey_(p.okey);
    var id, token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    if (isOwner) {
      id = 'owner';
      name = '店長';
      avatar = '🦉';
    } else {
      id = 'v' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    }
    visitors[id] = { name: name, avatar: avatar, token: token, last: now, lastSay: 0 };
    if (isOwner) visitors[id].owner = 1;
    writeJson_(cache, 'vc_visitors', visitors);
    if (isOwner) {
      addSystemMsg_(cache, '🦉 店長が売り場に出てきました');
    } else {
      addSystemMsg_(cache, avatar + ' ' + name + ' さんが来店しました');
      // 店長在室中は挨拶も店長に任せる（ボット休止）
      if (!ownerOnline_(visitors)) botGreet_(cache, name, now);
      notifyOwner_(cache, name, avatar, visitors, now);
    }
    return { ok: 1, id: id, token: token, owner: isOwner ? 1 : 0 };
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
      if (visitors[id].owner) o.owner = 1;
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
    var msg = { id: p.id, name: v.name, avatar: v.avatar, text: text };
    if (v.owner) msg.owner = 1;
    pushMsg_(cache, msg);
    // ボットの発言ルール:
    //   即答系（色写真・革在庫・リング在庫）= 店長在室中でも店長自身の発言でも常に即答
    //     （店長が「赤系見せて」と打てば、ちえみが写真を出してお客様にも見える＝接客支援）
    //   雑談系 = 店長在室中は休止（「ちえみ」名指し時のみ返答）。店長不在時は従来通り
    if (!botQuickReply_(cache, text, now)) {
      if (ownerOnline_(visitors)) {
        if (/ちえみ/.test(text)) botReply_(cache, text, now);
      } else {
        if (!botReply_(cache, text, now)) maybeStaffReply_(cache, text, now);
      }
    }
    return { ok: 1 };
  }

  if (action === 'leave') {
    addSystemMsg_(cache, v.owner ? '🦉 店長は工房に戻りました' : v.avatar + ' ' + v.name + ' さんが退店しました');
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
  { re: /(結婚|付き合って|付き合おう|デート|大好き|好きです|愛してる|愛してます)/, replies: [
      'ふふ、ありがとうございます😊 でもわたし、お店ひと筋なんです🧵',
      '照れちゃいますね…！お気持ちだけいただきます😊 代わりに素敵な革小物はいかがですか？',
      'えへへ、嬉しいです〜！その情熱、ぜひ手帳選びにも向けてください📔'] },
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

/* 革の色 直球質問の検知（ページ側が gallery フラグを見て写真スワッチを表示する）
   系統名は leather-catalog.json のタグと同期させること（現在7系統） */
var TONE_MAP = [
  { fam: 'ブルー系',    re: /青|あお|ブルー|ネイビー|紺|水色|ターコイズ|コバルト/ },
  { fam: 'レッド系',    re: /赤|あか|レッド|ピンク|ワイン|バーガンディ|紫|パープル/ },
  { fam: 'ブラウン系',  re: /茶|ブラウン|キャメル|チョコ/ },
  { fam: 'ダーク系',    re: /黒|くろ|ブラック|グレー|灰/ },
  { fam: 'グリーン系',  re: /緑|グリーン|カーキ|オリーブ/ },
  { fam: 'イエロー系',  re: /黄|イエロー|マスタード|オレンジ/ },
  { fam: 'ナチュラル系', re: /ナチュラル|生成り|ヌメ|ベージュ/ }
];
function detectLeatherColor_(text) {
  if (!/(革|レザー|色|カラー)/.test(text)) return null;
  for (var i = 0; i < TONE_MAP.length; i++) {
    if (TONE_MAP[i].re.test(text)) return TONE_MAP[i].fam;
  }
  if (/(色|カラー)/.test(text)) return 'ask';
  return null;
}
// 「？」で終わる質問にキーワードが合わなかったときの返事（無言にしない）
var BOT_QUESTION = [
  'うーん、それはわたしより店長が詳しいかもです！販売幕僚さんに聞いてみてください🧵',
  'いい質問ですね…！わたしにわかるのは手帳と革のことくらいなんです😊',
  'ごめんなさい、それはちょっとわからないです〜。革のことなら任せてください！'
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

/* ── 即答系（色写真・革在庫・リング在庫）──
   データを見せるだけの回答なので、店長在室中でも・店長自身の発言でも常に応える。
   返答したら true */
function botQuickReply_(cache, text, now) {
  // リング在庫の質問 → ページ側が ring-price-stock.csv から在庫一覧を描画
  if (/リング/.test(text) && /(在庫|ある|あり|何|どんな|種類|色|サイズ|一覧|欲し|ほし)/.test(text)) {
    cache.put('vc_bot_last', String(now), 21600);
    pushMsg_(cache, { id: BOT.id, name: BOT.name, avatar: BOT.avatar,
      text: 'いま在庫のあるリングはこちらです📋 ここにない仕様（サイズ・色）もお取り寄せできますよ',
      ringstock: 1 });
    return true;
  }
  // 革の在庫の質問（色指定なし）→ ページ側が leather-stock.csv から系統別サマリーを描画
  if (/(革|レザー)/.test(text) && /(在庫|取り寄せ)/.test(text) && !detectLeatherColor_(text.replace(/在庫|取り寄せ/g, ''))) {
    cache.put('vc_bot_last', String(now), 21600);
    pushMsg_(cache, { id: BOT.id, name: BOT.name, avatar: BOT.avatar,
      text: 'いま工房に在庫のある革はこちらです📷 「青系見せて」って言ってもらえたら写真もお出しします！',
      stockinfo: 1 });
    return true;
  }
  // 革の色の直球質問 → 写真付き回答
  var fam = detectLeatherColor_(text);
  if (fam) {
    cache.put('vc_bot_last', String(now), 21600);
    if (fam === 'ask') {
      pushMsg_(cache, { id: BOT.id, name: BOT.name, avatar: BOT.avatar,
        text: '革のお色はレッド系・ブルー系・ブラウン系・グリーン系・イエロー系・ナチュラル系・ダーク系がありますよ🎨 「青系見せて」みたいに聞いてくださいね！' });
    } else {
      pushMsg_(cache, { id: BOT.id, name: BOT.name, avatar: BOT.avatar,
        text: fam + 'の革はこちらです📷 タップで拡大できます。気になる色があったら教えてくださいね',
        gallery: fam });
    }
    return true;
  }
  return false;
}

/* ── 雑談系 ──
   返答したら true（その回は販売幕僚の相槌をスキップ）
   呼びかけ（「ちえみ」を含む）と質問（？で終わる）はクールダウン無視で必ず返事する */
function botReply_(cache, text, now) {
  var addressed = /ちえみ/.test(text);
  var isQuestion = /[？?]\s*$/.test(text);
  var last = Number(cache.get('vc_bot_last') || 0);
  if (!addressed && !isQuestion && now - last < BOT_COOLDOWN_MS) return false;
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
    } else if (isQuestion) {
      reply = BOT_QUESTION[Math.floor(Math.random() * BOT_QUESTION.length)];
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

/* ---------- 店長モード・来店メール通知 ---------- */
function isOwnerKey_(okey) {
  if (!okey) return false;
  var k = PropertiesService.getScriptProperties().getProperty('OWNER_KEY');
  return !!k && okey === k;
}

function ownerOnline_(visitors) {
  return Object.keys(visitors).some(function (id) { return visitors[id].owner; });
}

/* 来店をメール通知（店長が直接接客に出るため）。失敗しても入店処理は継続 */
function notifyOwner_(cache, name, avatar, visitors, now) {
  try {
    var last = Number(cache.get('vc_mail_last') || 0);
    if (now - last < MAIL_COOLDOWN_MS) return; // 連続入店はまとめる
    cache.put('vc_mail_last', String(now), 21600);
    var props = PropertiesService.getScriptProperties();
    var to = props.getProperty('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
    if (!to) return;
    var ids = Object.keys(visitors);
    var names = ids.map(function (id) {
      return visitors[id].avatar + ' ' + visitors[id].name;
    }).join(' ／ ');
    // 店長キー付きリンク: メールアプリ内ブラウザ等（キー未登録の環境）から
    // 開いても、そのまま店長として入店できる（開いた後キーはURLから自動消去される）
    var okey = props.getProperty('OWNER_KEY') || '';
    var link = 'https://you0810jmsdf.github.io/ns-factory/showroom/' +
      (okey ? '?okey=' + encodeURIComponent(okey) : '');
    MailApp.sendEmail({
      to: to,
      subject: '【ショールーム来店】' + avatar + ' ' + name + ' さんが入店（在室' + ids.length + '人）',
      body:
        name + ' さんがショールームの「みんなのチャット」に入店しました。\n\n' +
        '在室者: ' + names + '\n' +
        '時刻: ' + Utilities.formatDate(new Date(now), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n\n' +
        '▼ タップして店長として接客に出る\n' +
        link + '\n' +
        '（このリンクはどの端末・ブラウザで開いても店長として入店できます。入室画面が自動で開きます）\n\n' +
        '※ 通知は1分に1通まで。店長として入店中の来店にも通知は届きます。'
    });
  } catch (e) {
    // メール失敗でもチャット動作は継続。原因調査用に実行ログへは残す
    console.error('notifyOwner_ failed: ' + (e && e.message ? e.message : e));
  }
}

/* エディタから一度だけ実行: メール送信権限の承認＆通知テスト用
   （こちらは try/catch なし＝失敗したら赤いエラーが表示される） */
function testNotify() {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL')
        || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: to,
    subject: '【ショールーム来店通知テスト】この件名が届けば設定OK',
    body: '来店通知メールのテストです。\n宛先: ' + to +
          '\n残り送信可能数(今日): ' + MailApp.getRemainingDailyQuota() + '通'
  });
  console.log('テストメール送信完了 → ' + to);
  CacheService.getScriptCache().remove('vc_mail_last'); // 直後の実来店テストが抑止されないように
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
