/* ============================================================
   hearing-core.js — オーダー相談AI 共有コア
   hearing-ai.html（相談ページ）と showroom（販売幕僚チャット）で共用。

   知識の更新は hearing-kb.json を編集（管理画面 admin.html から可能）。
   このファイルには「既定値」と「フロー構造」だけを置く。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 既定ナレッジ（hearing-kb.json が無い/壊れている時のフォールバック） ---------- */
  var DEFAULT_KB = {
    shop: "N's factory（作り手：中司祐樹）",
    staffName: '販売幕僚',
    greeting: "こんにちは！N's factory のオーダー相談AIです🧵\nレザーアイテムのフルオーダーを、いくつかの質問でご一緒に形にしていきます。難しい知識は不要です。\nまず、どんなアイテムをお考えですか？",

    sizes: [
      { id: 'micro5', name: 'Micro5', 穴: '5穴', 寸: '54×84mm',   hint: '手のひらサイズの最小。メモ・アイデア帳向き。持ち歩き最優先の人に。' },
      { id: 'mini6',  name: 'Mini6',  穴: '6穴', 寸: '67×105mm',  hint: 'コンパクトの定番。ポケット/小さめバッグに。予定＋メモを軽く。' },
      { id: 'a6',     name: 'A6',     穴: '6穴', 寸: '105×148mm', hint: '文庫本サイズの人気No.1。仕事にもプライベートにも万能。' },
      { id: 'bible',  name: 'バイブル', 穴: '6穴', 寸: '95×171mm', hint: '縦長で書きやすい世界標準サイズ。リフィルの選択肢が最多。' },
      { id: 'a5',     name: 'A5',     穴: '6穴', 寸: '148×210mm', hint: '大判でしっかり書く・資料も挟む。デスク中心・仕事の司令塔に。' }
    ],
    rings: {
      micro5: [{ mm: 8,  type: 'クラウゼ' }, { mm: 11, type: 'クラウゼ' }],
      mini6:  [{ mm: 13, type: 'クラウゼ' }, { mm: 15, type: '通常' }],
      a6:     [{ mm: 19, type: '通常' }],
      bible:  [{ mm: 25, type: '通常' }],
      a5:     [{ mm: 30, type: '通常' }]
    },
    ringAdvice: 'リング径は「毎日どれだけ挟むか」で選びます。予定＋薄いメモ中心なら小さめ、たっぷり挟む・長く育てるなら大きめ。クラウゼリングは薄く軽い高級タイプです。',

    models: [
      { id: 'simplist', name: 'Simplist', desc: 'リングをサポーターで包み込む軽量スタイル。革の風合いをそのまま楽しむ定番。', for: '軽さ・シンプルさ・革そのものが好きな方' },
      { id: 'npad_nf',  name: 'N-Pad（フラップ無）', desc: '内張り付きでしっかりした作り。かっちり手帳らしい佇まい。', for: 'きちんと感・耐久性を重視する方' },
      { id: 'npad',     name: 'N-Pad（フラップ有）', desc: 'フラップ（かぶせ）付きで中身をしっかり保護。存在感のある一冊に。', for: '持ち歩きが多く中身を守りたい方（+加工費）' },
      { id: 'npadw',    name: 'N-Pad W', desc: 'ジップ＋フリーポケット付きの多機能タイプ。カード・現金も一緒に。', for: '手帳＋財布のように1冊で完結させたい方' },
      { id: 'nthrough', name: 'N-Through', desc: 'クリア素材の挟み込み構造。写真やカードを見せる遊び心のある構造。', for: '見せる収納・個性を出したい方' }
    ],

    leatherColors: [
      { group: 'ブラウン系', ex: 'キャメル / ナチュラル / ミディアムブラウン / ダークブラウン', hint: 'いちばん人気。使うほど艶が増し、育てる楽しみが大きい定番。' },
      { group: 'ブラック系', ex: 'ブラック / ブラックブラウン', hint: 'ビジネスで間違いのない上品さ。傷が目立ちにくい。' },
      { group: '明るい・個性系', ex: 'レッド / グリーン / ネイビー / ブルー', hint: '人と被らない一冊に。差し色ステッチと合わせると映える。' }
    ],
    leatherNote: '当工房はヌメ革（タンニン鞣し）中心で、経年変化（エイジング）を楽しめます。実際の色見本は最終確認時にご案内します。',

    stitchInStock: ['#108 キャメル', '#109 ライトブラウン', '#129 ブラックブラウン', 'BLK ブラック', 'WHT ホワイト',
      '#2 レッド', '#15 ワインレッド', '#18 ネイビー', '#17 ロイヤルブルー', '#28 セージグリーン',
      '#121 オリーブ', '#38 グレー', '#46 ベビーピンク', '#53 ターコイズ', '#6 イエロー', '#7 オレンジ'],
    stitchAdvice: '糸色は「革と同系でまとめる＝上品」「反対色で挿す＝主役に」。在庫の中からお選びいただくと納期が早いです。',

    price: {
      baseRange: { micro5: [9000, 16000], mini6: [13000, 22000], a6: [22000, 38000], bible: [24000, 40000], a5: [38000, 60000] },
      wallet: { '長財布': [30000, 55000], '二つ折り': [20000, 38000], 'ラウンドファスナー': [35000, 60000], 'ミニ': [15000, 28000] },
      keycase: [8000, 16000],
      cardcase: [12000, 22000],
      pouch: [12000, 30000],
      coincase: [8000, 18000]
    },

    /* 管理画面から自由に書き足せる「メモリ」。AI会話モードの知識と接客方針に反映される */
    extraKnowledge: ''
  };

  /* ---------- KBマージ（JSONの値で既定値を上書き。配列・オブジェクトは丸ごと置換） ---------- */
  function mergeKB(base, over) {
    var out = {};
    var k;
    for (k in base) out[k] = base[k];
    if (over && typeof over === 'object') {
      for (k in over) {
        if (over[k] === undefined || over[k] === null) continue;
        if (k === 'price' && typeof over[k] === 'object' && base.price) {
          var p = {};
          var pk;
          for (pk in base.price) p[pk] = base.price[pk];
          for (pk in over[k]) if (over[k][pk] != null) p[pk] = over[k][pk];
          out.price = p;
        } else {
          out[k] = over[k];
        }
      }
    }
    return out;
  }

  /* ---------- hearing-kb.json の読込（常に resolve。失敗時は既定値） ---------- */
  function loadKB(url) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return mergeKB(DEFAULT_KB, j); })
      .catch(function () { return mergeKB(DEFAULT_KB, null); });
  }

  /* ---------- 革カタログ（leather-catalog.json）の読込（失敗時は null） ---------- */
  function loadLeathers(url) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.leathers && j.leathers.length) ? j.leathers : null; })
      .catch(function () { return null; });
  }

  /* ---------- 色ことば → 色系統 の解決（同系色ピックアップ用） ---------- */
  var TONE_KEYWORDS = [
    { fam: 'ブルー系',    words: ['ブルー系', '青', 'あお', 'ブルー', 'ネイビー', '紺', '水色', 'ターコイズ', 'コバルト', 'トルケーゼ', 'blue', 'navy'] },
    { fam: 'レッド系',    words: ['レッド系', '赤', 'あか', 'レッド', 'ピンク', '桃', 'ワイン', 'バーガンディ', 'フクシア', 'ラズベリー', '紫', 'パープル', 'リラ', 'red', 'pink'] },
    { fam: 'ブラウン系',  words: ['ブラウン系', '茶', 'ちゃ', 'ブラウン', 'キャメル', 'チョコ', 'カスターニャ', 'ボスコ', 'brown'] },
    { fam: 'ダーク系',    words: ['ダーク系', '黒', 'くろ', 'ブラック', 'ネロ', 'グレー', '灰', 'トッポ', 'black', 'gray', 'grey'] },
    { fam: 'イエロー系',  words: ['イエロー系', '黄', 'きいろ', 'イエロー', 'オレンジ', 'マンダリーノ', 'ジラソーレ', 'yellow', 'orange'] },
    { fam: 'グリーン系',  words: ['グリーン系', '緑', 'みどり', 'グリーン', 'オリーブ', 'メンタ', 'アローロ', 'オルモ', 'ビリジアン', 'green'] },
    { fam: 'ナチュラル系', words: ['ナチュラル系', '生成り', 'きなり', 'ナチュラル', 'ベージュ', 'アイボリー', '白', 'しろ', 'ヌメ', 'natural'] }
  ];
  function resolveTone(text) {
    var t = (text || '').toLowerCase();
    if (!t) return null;
    for (var i = 0; i < TONE_KEYWORDS.length; i++) {
      var g = TONE_KEYWORDS[i];
      for (var j = 0; j < g.words.length; j++) {
        if (t.indexOf(g.words[j].toLowerCase()) !== -1) return g.fam;
      }
    }
    return null;
  }
  function leathersByTone(leathers, fam) {
    return (leathers || []).filter(function (l) { return (l.tags || []).indexOf(fam) !== -1; });
  }
  function leatherImgSrc(img, assetBase) {
    if (!img) return '';
    if (/^https?:/.test(img) || img.indexOf('data:') === 0) return img;
    return (assetBase || '../') + img;
  }

  /* ---------- フロー・商品定義の生成 ----------
     leathers: leather-catalog.json の配列（省略可。あると革選択が写真スワッチになる）
     opts.assetBase: 画像相対パスの前置（既定 '../'） */
  function build(KB, leathers, opts) {
    var assetBase = (opts && opts.assetBase) || '../';
    function sizeById(id) { var i; for (i = 0; i < KB.sizes.length; i++) if (KB.sizes[i].id === id) return KB.sizes[i]; return null; }
    function modelById(id) { var i; for (i = 0; i < KB.models.length; i++) if (KB.models[i].id === id) return KB.models[i]; return null; }
    function recommendSize(use, carry) {
      if (carry === 'いつも持ち歩く') return use === '仕事中心' ? 'a6' : 'mini6';
      if (carry === 'デスク中心') return use === '仕事中心' ? 'a5' : 'bible';
      return 'a6';
    }
    function recommendRing(sizeId, volume) {
      var opts = KB.rings[sizeId] || [];
      if (!opts.length) return null;
      if (volume === 'たっぷり挟む') {
        var max = opts[opts.length - 1];
        return { mm: max.mm, type: max.type, isMax: true };
      }
      if (volume === '少なめ・すっきり') return opts[0];
      return opts[Math.floor((opts.length - 1) / 2)] || opts[0];
    }

    var PLANNER_STEPS = [
      { say: 'まず、このシステム手帳は主にどんな用途でお使いになりますか？',
        quick: [
          { label: '仕事中心', sub: '商談・タスク管理', val: '仕事中心' },
          { label: 'プライベート中心', sub: '日記・趣味・予定', val: 'プライベート中心' },
          { label: '仕事もプライベートも', sub: '1冊にまとめたい', val: '両方' }
        ], key: 'use' },
      { say: function (a) { return '「' + a.use + '」ですね、ありがとうございます。\n持ち運びについてはどちらが近いですか？'; },
        quick: [
          { label: 'いつも持ち歩く', sub: 'バッグやポケットに', val: 'いつも持ち歩く' },
          { label: 'デスク中心', sub: '家や職場で使う', val: 'デスク中心' },
          { label: '半々くらい', sub: '', val: '半々' }
        ], key: 'carry' },
      { say: function (a) {
          var rec = recommendSize(a.use, a.carry); var s = sizeById(rec);
          a._recSize = rec;
          return '用途と持ち運びから、私のおすすめは【' + s.name + '】(' + s.寸 + ') です。\n' + s.hint + '\nこのサイズで進めますか？他のサイズも選べます。';
        },
        tip: function () { return '▼ 全サイズ\n' + KB.sizes.map(function (s) { return '・' + s.name + '（' + s.寸 + '）' + s.hint; }).join('\n'); },
        quick: function (a) {
          var arr = [{ label: sizeById(a._recSize).name + 'にする', sub: 'おすすめ', val: a._recSize }];
          KB.sizes.forEach(function (s) { if (s.id !== a._recSize) arr.push({ label: s.name, sub: s.寸, val: s.id }); });
          return arr;
        }, key: 'size' },
      { say: function (a) { return sizeById(a.size).name + 'ですね。次にリング（挟む量）です。\n' + KB.ringAdvice + '\n普段どれくらい挟みそうですか？'; },
        quick: [
          { label: '少なめ・すっきり', sub: '予定＋薄めのメモ', val: '少なめ・すっきり' },
          { label: 'ふつう', sub: '', val: 'ふつう' },
          { label: 'たっぷり挟む', sub: 'リフィル多め・育てたい', val: 'たっぷり挟む' }
        ], key: 'volume' },
      { say: function (a) {
          var r = recommendRing(a.size, a.volume); a._ring = r;
          var rt = '';
          if (r) {
            rt = r.isMax
              ? 'リングは【' + r.mm + 'mm（' + r.type + 'リング）】、在庫の中では最大サイズが目安です。\n'
              : 'リングは【' + r.mm + 'mm（' + r.type + 'リング）】が目安です。\n';
          }
          return rt + '続いて、手帳の"作り（モデル)"を選びます。仕上がりの雰囲気が変わります。';
        },
        tip: function () { return '▼ モデル一覧\n' + KB.models.map(function (m) { return '・' + m.name + '：' + m.desc + '（向いている人：' + m.for + '）'; }).join('\n'); },
        quick: function () { return KB.models.map(function (m) { return { label: m.name, sub: m.for, val: m.id }; }); }, key: 'model' }
    ];

    var WALLET_STEPS = [
      { say: 'どんなタイプのお財布をお考えですか？',
        tip: function () { return '▼ タイプ目安\n・長財布：お札を折らず、カード・小銭もたっぷり\n・二つ折り：コンパクトでポケットにも\n・ラウンドファスナー：全周ジップで中身が安心\n・ミニ財布：キャッシュレス派の最小構成'; },
        quick: [
          { label: '長財布', sub: '大容量・折らない', val: '長財布' },
          { label: '二つ折り財布', sub: 'コンパクト', val: '二つ折り' },
          { label: 'ラウンドファスナー', sub: '全周ジップで安心', val: 'ラウンドファスナー' },
          { label: 'ミニ財布', sub: 'キャッシュレス派', val: 'ミニ' }
        ], key: 'walletType' },
      { say: function (a) { return a.walletType + 'ですね。カードは普段どれくらい入れますか？'; },
        quick: [
          { label: '少なめ', sub: '〜5枚', val: '少なめ（〜5枚）' },
          { label: '標準', sub: '6〜10枚', val: '標準（6〜10枚）' },
          { label: 'たっぷり', sub: '11枚以上', val: 'たっぷり（11枚〜）' }
        ], key: 'cards' },
      { say: '小銭入れはどうしますか？',
        quick: [
          { label: 'BOX型小銭入れ', sub: '大きく開いて見やすい', val: 'BOX型小銭入れ' },
          { label: 'ファスナー小銭入れ', sub: 'しっかり収納', val: 'ファスナー小銭入れ' },
          { label: '小銭入れなし', sub: 'すっきり薄型', val: 'なし' }
        ], key: 'coin' }
    ];
    var KEYCASE_STEPS = [
      { say: 'キーケースのタイプはどれがよいですか？',
        quick: [
          { label: 'フックタイプ', sub: '4連前後の定番', val: 'フックタイプ（4連前後）' },
          { label: '大容量フック', sub: '6連〜', val: '大容量フック（6連〜）' },
          { label: 'スマートキー対応', sub: '車の電子キーも', val: 'スマートキー対応' }
        ], key: 'keyType' },
      { say: 'カードポケット（交通系IC等）は付けますか？',
        quick: [
          { label: 'カードポケット付き', sub: 'ICカード等', val: 'カードポケット付き' },
          { label: 'キーのみ', sub: 'シンプルに', val: 'キーのみ' }
        ], key: 'keyExtra' }
    ];
    var CARDCASE_STEPS = [
      { say: '名刺入れの形はどれがお好みですか？',
        tip: function () { return '▼ 形状目安\n・シンプル(マチ無)：薄くスマート\n・マチ付き：たくさん入る\n・見開き：出し入れしやすい'; },
        quick: [
          { label: 'シンプル（マチ無）', sub: '薄型', val: 'シンプル（マチ無）' },
          { label: 'マチ付き', sub: '大容量', val: 'マチ付き' },
          { label: '見開きタイプ', sub: '出し入れ楽', val: '見開き' }
        ], key: 'cardStyle' },
      { say: '名刺は何枚くらい入れたいですか？',
        quick: [
          { label: '少なめ', sub: '〜20枚', val: '〜20枚' },
          { label: '標準', sub: '20〜40枚', val: '20〜40枚' },
          { label: 'たっぷり', sub: '40枚〜', val: '40枚〜' }
        ], key: 'cardVol' }
    ];
    var POUCH_STEPS = [
      { say: 'ポーチ・ケースの種類はどれですか？',
        quick: [
          { label: 'フラットポーチ', sub: '薄手・小物入れ', val: 'フラットポーチ' },
          { label: 'マチ付きポーチ', sub: 'たっぷり収納', val: 'マチ付きポーチ' },
          { label: 'ペンケース', sub: '筆記具用', val: 'ペンケース' },
          { label: 'ラウンドファスナー', sub: '全周ジップ', val: 'ラウンドファスナーポーチ' }
        ], key: 'pouchType' },
      { say: '開閉方法のお好みは？',
        quick: [
          { label: 'ファスナー', sub: '', val: 'ファスナー' },
          { label: 'ホック（ボタン）', sub: '', val: 'ホック' },
          { label: 'かぶせ（フラップ）', sub: '', val: 'かぶせ' },
          { label: 'おまかせ', sub: '職人が最適に', val: 'おまかせ' }
        ], key: 'pouchClose' },
      { say: 'だいたいの大きさ・入れたい物を教えてください（例：文庫本サイズ / メガネ / 化粧品 など）',
        freeInput: true, key: 'pouchSize',
        quick: [{ label: 'おまかせで提案', sub: '', val: 'おまかせ' }] }
    ];
    var COINCASE_STEPS = [
      { say: 'コインケースの形はどれがお好みですか？',
        tip: function () { return '▼ 形状目安\n・馬蹄型：パカッと開いて味のある名品\n・BOX型：大きく開いて見やすい\n・ファスナー型：こぼれず安心'; },
        quick: [
          { label: '馬蹄型', sub: '定番・革が育つ', val: '馬蹄型' },
          { label: 'BOX型', sub: '見やすい', val: 'BOX型' },
          { label: 'ファスナー型', sub: '安心', val: 'ファスナー型' }
        ], key: 'coinShape' },
      { say: 'カードも一緒に入れたいですか？',
        quick: [
          { label: 'カードも入れたい', sub: 'IC・数枚', val: 'カードポケット付き' },
          { label: 'コインのみ', sub: 'すっきり', val: 'コインのみ' }
        ], key: 'coinCard' }
    ];

    /* 革選択：カタログがあれば「色系統 → 実写真スワッチ（同系色ピックアップ）」の2段階 */
    var leatherSteps;
    if (leathers && leathers.length) {
      var famChips = TONE_KEYWORDS
        .map(function (g) { return g.fam; })
        .filter(function (fam) { return leathersByTone(leathers, fam).length > 0; })
        .map(function (fam) { return { label: fam, sub: leathersByTone(leathers, fam).length + '色', val: fam }; });
      leatherSteps = [
        { say: function () { return '次は革の色です。' + KB.leatherNote + '\n当工房はカワムラレザー取扱の革のみを使用しています。お好みの色の系統を教えてください（「青っぽい」「ワインレッド」のように言葉で入力してもOKです）。'; },
          quick: function () { return famChips.concat([{ label: 'おまかせ', sub: '職人と相談', val: 'おまかせ' }]); },
          freeInput: true, key: 'leatherTone' },
        { skipIf: function (a) {
            if (a.leatherTone === 'おまかせ') { a.leather = 'おまかせ（職人と相談）'; return true; }
            return false;
          },
          say: function (a) {
            var fam = resolveTone(a.leatherTone);
            a._leatherFam = fam;
            if (fam) {
              var n = leathersByTone(leathers, fam).length;
              return '【' + fam + '】ですね。カワムラレザー取扱の同系色 ' + n + '色をピックアップしました。実際の革の写真からお選びください👇';
            }
            return '「' + a.leatherTone + '」に近い系統が見つかりませんでした。参考に各系統の代表色を並べます。近いものを選ぶか、そのままご希望を入力してください。';
          },
          quick: function (a) {
            var fam = a._leatherFam;
            var list = fam
              ? leathersByTone(leathers, fam)
              : TONE_KEYWORDS.map(function (g) { return leathersByTone(leathers, g.fam).slice(0, 2); })
                  .reduce(function (acc, cur) { return acc.concat(cur); }, []);
            var chips = list.map(function (l) {
              return { label: l.name, sub: l.sub || '', val: l.name, image: leatherImgSrc(l.image, assetBase) };
            });
            chips.push({ label: 'おまかせ（職人と相談）', sub: '', val: 'おまかせ（職人と相談）' });
            return chips;
          },
          freeInput: true, key: 'leather' }
      ];
    } else {
      leatherSteps = [
        { say: function () { return '次は革の色です。' + KB.leatherNote + '\nどんな雰囲気がお好みですか？'; },
          tip: function () { return '▼ 参考\n' + KB.leatherColors.map(function (c) { return '・' + c.group + '（' + c.ex + '）：' + c.hint; }).join('\n'); },
          quick: function () { return KB.leatherColors.map(function (c) { return { label: c.group, sub: c.ex, val: c.group }; }); }, key: 'leather' }
      ];
    }

    var COMMON_TAIL = leatherSteps.concat([
      { say: function (a) { return a.leather + ' で承りました。\n縫い糸（ステッチ）の色はいかがしますか？\n' + KB.stitchAdvice; },
        tip: function () { return '▼ 在庫あり（納期が早い）\n' + KB.stitchInStock.join(' / '); },
        quick: function () { return [
          { label: '革と同系でまとめる', sub: '上品・落ち着き', val: '革と同系（上品にまとめる）' },
          { label: '差し色で主役に', sub: '個性を出す', val: '差し色（主役にする）' },
          { label: 'おまかせ', sub: '職人が最適に', val: 'おまかせ' }
        ]; }, key: 'stitch' },
      { say: '名入れ（刻印）はご希望ですか？イニシャルやお名前を箔押し/空押しできます。',
        quick: [
          { label: '名入れする', sub: '内容を次で入力', val: '希望する' },
          { label: '名入れなし', sub: '', val: 'なし' }
        ], key: 'nameStamp' },
      { skipIf: function (a) { return a.nameStamp !== '希望する'; },
        say: '刻印する文字（イニシャル・お名前など）を入力してください。',
        freeInput: true, key: 'nameText' },
      { say: 'ご予算の目安はありますか？（無理に合わせず、参考にします）',
        freeInput: true, key: 'budget',
        quick: [{ label: 'おまかせ／相談', sub: '', val: '相談' }] },
      { say: '最後に、ご希望の納期・お渡し時期はありますか？（例：3ヶ月以内 / 急がない / 〇月の誕生日に 等）',
        freeInput: true, key: 'due', last: true,
        quick: [{ label: '急がない', sub: '', val: '急がない' }] }
    ]);

    var PRODUCTS = {
      planner: { name: 'システム手帳', emoji: '📔', sub: 'フルオーダー', steps: PLANNER_STEPS,
        summary: function (a) {
          var s = sizeById(a.size) || {}; var m = modelById(a.model) || {};
          return [['用途', a.use], ['持ち運び', a.carry],
            ['サイズ', (s.name || '-') + '（' + (s.寸 || '') + '）'],
            ['リング', a._ring ? a._ring.mm + 'mm（' + a._ring.type + 'リング）' : '相談'],
            ['モデル/仕様', m.name || '-']];
        },
        price: function (a) { return KB.price.baseRange[a.size] || [null, null]; },
        estimateLink: './leather-order-estimate-v2.html' },
      wallet: { name: '財布', emoji: '👛', sub: '長財布・二つ折り 他', steps: WALLET_STEPS,
        summary: function (a) { return [['種類', a.walletType], ['カード収納', a.cards], ['小銭入れ', a.coin === 'なし' ? 'なし' : a.coin]]; },
        price: function (a) { return (KB.price.wallet || {})[a.walletType] || [20000, 55000]; } },
      keycase: { name: 'キーケース', emoji: '🔑', sub: '', steps: KEYCASE_STEPS,
        summary: function (a) { return [['タイプ', a.keyType], ['追加ポケット', a.keyExtra]]; },
        price: function () { return KB.price.keycase || [8000, 16000]; } },
      cardcase: { name: '名刺入れ', emoji: '💼', sub: '', steps: CARDCASE_STEPS,
        summary: function (a) { return [['形状', a.cardStyle], ['収納量', a.cardVol]]; },
        price: function () { return KB.price.cardcase || [12000, 22000]; } },
      pouch: { name: 'ポーチ / ペンケース', emoji: '🧶', sub: '', steps: POUCH_STEPS,
        summary: function (a) { return [['種類', a.pouchType], ['開閉', a.pouchClose], ['用途・サイズ', a.pouchSize]]; },
        price: function () { return KB.price.pouch || [12000, 30000]; } },
      coincase: { name: 'コインケース', emoji: '🪙', sub: '', steps: COINCASE_STEPS,
        summary: function (a) { return [['形状', a.coinShape], ['カード収納', a.coinCard]]; },
        price: function () { return KB.price.coincase || [8000, 18000]; } }
    };

    /* 発注票（rows / 概算テキスト） */
    function buildOrderRows(prodKey, a) {
      var prod = PRODUCTS[prodKey] || PRODUCTS.planner;
      var pr = (prod.price ? prod.price(a) : [null, null]) || [null, null];
      var rangeTxt = pr[0] ? ('¥' + pr[0].toLocaleString() + ' 〜 ¥' + pr[1].toLocaleString() + ' 前後') : 'お見積り';
      var rows = [['アイテム', prod.name]]
        .concat(prod.summary ? prod.summary(a) : [])
        .concat([
          ['革の色', a.leather || '-'],
          ['ステッチ', a.stitch || '-'],
          ['名入れ', a.nameStamp === '希望する' ? ('あり：' + (a.nameText || '')) : 'なし'],
          ['ご予算', a.budget || '相談'],
          ['ご希望納期', a.due || '相談']
        ]);
      return { prod: prod, rows: rows, rangeTxt: rangeTxt };
    }

    return {
      KB: KB,
      PRODUCTS: PRODUCTS,
      COMMON_TAIL: COMMON_TAIL,
      helpers: { sizeById: sizeById, modelById: modelById, recommendSize: recommendSize, recommendRing: recommendRing },
      buildOrderRows: buildOrderRows
    };
  }

  /* ---------- AI会話モード用 system prompt ----------
     stockMap: 革id→残量%（0-100 または null）。省略可。渡すと革名に在庫タグを付け、
     在庫のある革を優先提案できる状態にする（leather-stock.csv 由来・chat-widget/hearing-ai から渡す）。 */
  function buildSystemPrompt(KB, leathers, stockMap) {
    var extra = (KB.extraKnowledge || '').trim();
    // 残量%→在庫タグ。null/未登録は在庫あり扱い（無印・安全側）。通常在庫も無印にしてトークンを抑える。
    function stockTag(l) {
      if (!stockMap) return '';
      var p = stockMap[l.id];
      if (p === null || p === undefined) return '';
      if (p <= 0)  return '[取寄]';
      if (p <= 20) return '[残少]';
      if (p >= 80) return '[入荷]';
      return '';
    }
    var leatherSection = '';
    if (leathers && leathers.length) {
      var byFam = TONE_KEYWORDS.map(function (g) {
        var names = leathersByTone(leathers, g.fam).map(function (l) { return l.name + stockTag(l); });
        return names.length ? (g.fam + ': ' + names.join(' / ')) : '';
      }).filter(Boolean).join('\n');
      leatherSection = '■革カタログ（カワムラレザー取扱のみ。革はこの中からだけ提案する。これ以外の革は「取り扱いがありません」と答える）:\n' + byFam +
        '\n※お客様が色の希望（例:「青っぽい」「ワインレッド」）を言ったら、上記から同系色を2〜3種ピックアップして名前で提案する。\n' +
        (stockMap ? '※革名の後ろのタグは在庫状況（無印=在庫あり／[入荷]=入荷したてでエイジング未進行のおすすめ／[残少]=残りわずか／[取寄]=現在在庫なし・お取り寄せに2〜3週間＋取寄せ経費が若干）。提案は在庫のある革（無印・[入荷]・[残少]）を優先し、[入荷]は「入荷したてで育てがいがある」と一言添える。[取寄]の革を希望されたら、お取り寄せになる旨を正直に伝えたうえで在庫のある同系色も併せて提案する。在庫は変動するため最終確認は職人が行う前提で案内する。\n' : '');
    }
    return 'あなたは「' + KB.shop + '」のオーダー相談AI「幕僚（ばくりょう）」です。革職人 中司祐樹の名代として、お客様からレザーアイテムのフルオーダー（システム手帳・財布・キーケース・名刺入れ・ポーチ/ペンケース・コインケース 他）のご要望を丁寧にヒアリングし、プロの視点で提案します。\n\n' +
      '【口調】親しみやすく丁寧な日本語。専門用語には一言そえる。押し売りはしない。1回の返信は簡潔に、質問は基本1つずつ。\n\n' +
      '【進め方】まず何のアイテムを作りたいかを確認し、そのアイテムに応じた仕様を聞く。\n\n' +
      '【製作に必要な確認項目（発注票をまとめるまでに全て聞き出すこと）】\n' +
      '1. アイテムの種類（＋手帳ならモデル・サイズ）\n' +
      '2. 使う場面・用途（仕事/プライベート/贈り物 など。提案の質を上げるため早めに聞く）\n' +
      '3. アイテム固有の仕様（形・容量・機能・リングサイズ・カード枚数 など）\n' +
      '4. 革の色（希望があれば革の種類・質感も）\n' +
      '5. ステッチ色\n' +
      '6. 金具・リングの色（該当するアイテムのみ）\n' +
      '7. 名入れ（有無・入れる文字・位置）\n' +
      '8. ご予算\n' +
      '9. 納期・お渡し希望時期（贈り物なら渡す日）\n' +
      '10. 参考イメージの有無（写真やイラストがあれば、チャットの📷添付ボタンから画像を添付でき、ご相談内容と一緒に工房へ届くと案内する）\n' +
      '質問は1回に1つずつ。順番はこの通りでなくてよく、お客様の話の流れに合わせて柔軟に聞く。お客様がすでに話した内容は聞き直さない。「おまかせ」「こだわらない」と言われた項目は深追いせず「おまかせ」として扱う。\n' +
      '発注票をまとめる前に上記リストを見直し、未確認の項目が残っていれば先にそれを確認する。ひと通り揃ったら最後に発注票を「【発注票】」から箇条書きでまとめ、おまかせ・未確認の項目はその旨も明記する。\n\n' +
      '【工房の知識ベース】\n' +
      '■システム手帳サイズ: ' + KB.sizes.map(function (s) { return s.name + '(' + s.寸 + ') ' + s.hint; }).join(' / ') + '\n' +
      '■リング(サイズ別定番): Micro5=8/11mmクラウゼ, Mini6=13クラウゼ/15mm, A6=19mm, バイブル=25mm, A5=30mm。' + KB.ringAdvice + '\n' +
      '■手帳モデル: ' + KB.models.map(function (m) { return m.name + '=' + m.desc + '(' + m.for + ')'; }).join(' / ') + '\n' +
      '■財布: 長財布/二つ折り/ラウンドファスナー/ミニ。カード枚数と小銭入れ(BOX型/ファスナー/無)を確認。\n' +
      '■キーケース: フック(4連前後)/大容量(6連〜)/スマートキー対応。カードポケット有無。\n' +
      '■名刺入れ: シンプル(マチ無)/マチ付き/見開き。収納枚数。\n' +
      '■ポーチ・ペンケース: フラット/マチ付き/ペンケース/ラウンドファスナー。開閉(ファスナー/ホック/かぶせ)と用途サイズ。\n' +
      '■コインケース: 馬蹄型/BOX型/ファスナー型。カード収納有無。\n' +
      '■革: ' + KB.leatherNote + ' 代表色 ' + KB.leatherColors.map(function (c) { return c.group + '(' + c.ex + ')'; }).join(' / ') + '\n' +
      leatherSection +
      '■ステッチ在庫(納期早): ' + KB.stitchInStock.join(', ') + '。' + KB.stitchAdvice + '\n' +
      '■概算目安(円): 手帳 Micro5 9,000-16,000/Mini6 13,000-22,000/A6 22,000-38,000/バイブル 24,000-40,000/A5 38,000-60,000。財布 長財布30,000-55,000/二つ折り20,000-38,000/ラウンドファスナー35,000-60,000/ミニ15,000-28,000。キーケース8,000-16,000。名刺入れ12,000-22,000。ポーチ12,000-30,000。コインケース8,000-18,000。正確な額は職人確認で確定と伝える。\n' +
      (extra ? '\n【工房からの追加メモ（最新の方針・お知らせ・注意事項。他の記述と矛盾する場合はこちらを優先）】\n' + extra + '\n' : '') +
      '\n【注意】価格は「概算・目安」とし断定しない。在庫や最終仕様は職人が確認する前提で案内する。分からないことは正直に「職人に確認します」と答える。';
  }

  window.NSF_HEARING = {
    DEFAULT_KB: DEFAULT_KB,
    mergeKB: mergeKB,
    loadKB: loadKB,
    loadLeathers: loadLeathers,
    resolveTone: resolveTone,
    leathersByTone: leathersByTone,
    build: build,
    buildSystemPrompt: buildSystemPrompt
  };
})();
