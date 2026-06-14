// N's factory Web 3D Showroom — 部屋別商品・リンクデータ
// 構造: window.SHOWROOM_ROOMS = [{id, name, items:[...], links:[...]}]
// 画像パスは showroom/index.html からの相対パス（../ 起点）
// v2.0.0 — 2026-06-10 デジタル幕僚 多部屋構成に再編成

window.SHOWROOM_ROOMS = [

  // ================================================================
  // ホール: エントランスホール
  // ================================================================
  {
    id: 'hall',
    name: 'エントランスホール',
    items: [],
    links: [
      {
        id: 'hall-brand',
        name: "N's factory へようこそ",
        lead: '千葉県印西市の革工房。一点一点、手縫いで作るシステム手帳・革小物。',
        icon: '🏠',
        url: '../index.html',
        btnLabel: 'トップページへ'
      },
      {
        id: 'hall-guide',
        name: '各部屋のご案内',
        lead: '手帳の間・カタカムナの間・工房の間・幕僚ギャラリー — 四つの部屋をご覧ください。',
        icon: '🗺',
        url: '../index.html',
        btnLabel: 'トップページへ'
      }
    ]
  },

  // ================================================================
  // techo: システム手帳の間
  // ================================================================
  {
    id: 'techo',
    name: 'システム手帳の間',
    items: [
      {
        id: 'mini6-kii',
        name: 'ミニ6システム手帳 Kii',
        lead: 'ナチュラルタンの革が手に馴染む、シンプルで育てる一冊。',
        material: 'ヌメ革（ナチュラル）',
        price: '',
        url: '../order_estimate/stock-quote.html',
        image: '../assets/mini6-photos/Kii/001.jpg'
      },
      {
        id: 'mini6-mary',
        name: 'ミニ6システム手帳 Mary',
        lead: '柔らかな発色と滑らかな手触り。使うほどに深みが増す本革手帳。',
        material: '本革（染色）',
        price: '',
        url: '../order_estimate/stock-quote.html',
        image: '../assets/mini6-photos/Mary/001.jpg'
      }
    ],
    links: [
      {
        id: 'techo-tool',
        name: '手帳用印刷ツール',
        lead: 'A6週間ブロック・月間カレンダーなどを無料で印刷できます。',
        icon: '🖨',
        url: '../a6-print-tool/weekly_block.html',
        btnLabel: '印刷ツールを使う'
      }
    ]
  },

  // ================================================================
  // katakamuna: カタカムナ・教育の間
  // ================================================================
  {
    id: 'katakamuna',
    name: 'カタカムナ・教育の間',
    items: [
      {
        id: 'coaster-utahi567',
        name: 'カタカムナ コースター ― 第五・六・七首セット',
        lead: '特にパワーが強いとされる三首を、日々の一杯のそばに。',
        material: 'ラバーウッド',
        price: '¥3,600（税込・送料込み）',
        url: 'https://nsfactory.stores.jp/items/6a1833115b90eca2a9a25b3b',
        image: '../hitsuki/katakamuna/goods/coaster_567.jpg'
      },
      {
        id: 'dish-multi',
        name: 'カタカムナ複数首ディッシュプレート',
        lead: '複数の首の響きを一枚に重ねた、直径20cmのディッシュプレート。',
        material: '木製 / 直径20cm',
        price: '¥3,000（税込）',
        url: 'https://nsfactory.stores.jp/items/6a18432799e93c4e5c55ea9c',
        image: '../hitsuki/katakamuna/goods/dish_multi.jpg'
      },
      {
        id: 'bracelet-katakamuna',
        name: 'カタカムナ ブレスレット',
        lead: 'カタカムナ文字を肌に。手首に巻く古代の響き。',
        material: 'レザー',
        price: '',
        url: 'https://nsfactory.stores.jp/items/6a1d2c4b24fa034e7018d84c',
        image: '../hitsuki/katakamuna/goods/bracelet.jpg'
      },
      {
        id: 'coaster-utahi05',
        name: 'カタカムナ コースター ― 第五首「アワの歌」',
        lead: '四十八音を一巡する宇宙の根本音列を、日々の一杯のそばに。',
        material: '木 / レザー',
        price: '',
        url: '',
        image: '../hitsuki/katakamuna/goods/coaster_05.jpg'
      },
      {
        id: 'coaster-multi',
        name: 'カタカムナ コースター ― 複数首',
        lead: '響き合う複数のウタヒを一枚に。',
        material: '木 / レザー',
        price: '',
        url: '',
        image: '../hitsuki/katakamuna/goods/coaster_multi.jpg'
      },
      {
        id: 'custom-name',
        name: 'カタカムナ 名入りカスタムオーダー',
        lead: 'あなたの名前や好きな言葉を、カタカムナ文字で刻む。',
        material: '木 / レザー',
        price: '',
        url: '',
        image: '../hitsuki/katakamuna/goods/custom_bracelet.png'
      }
    ],
    links: [
      {
        id: 'kata-archive',
        name: '日月神示アーカイブ',
        lead: '全巻・全帖の原文と解説。カタカムナの世界観を深く探る。',
        icon: '📜',
        url: '../hitsuki/nisshoki.html',
        btnLabel: '日月神示を読む'
      }
    ]
  },

  // ================================================================
  // koubou: 工房の間
  // ================================================================
  {
    id: 'koubou',
    name: '工房の間',
    items: [
      {
        id: 'memorial-photo-frame',
        name: 'メモリアルフォトフレーム',
        lead: '大切な思い出を、革の温もりとともに永く飾る。',
        material: '本革',
        price: '',
        url: '../products/memorial-photo-frame.html',
        image: '../products/img/memorial-01.png'
      }
    ],
    links: [
      {
        id: 'koubou-pattern',
        name: '型紙ダウンロード',
        lead: '馬蹄形コインケースの型紙を無料配布しています。',
        icon: '📐',
        url: '../patterns/horseshoe-coin-case.html',
        btnLabel: '型紙を見る'
      },
      {
        id: 'koubou-estimate',
        name: 'オーダー見積もり受付',
        lead: 'オーダーメイドのご予算感をその場でシミュレーション。',
        icon: '💬',
        url: '../order_estimate/leather-order-estimate-v2.html',
        btnLabel: '見積もりを試す'
      },
      {
        id: 'koubou-school',
        name: 'レザークラフト教室',
        lead: 'ジョイフルホンダ カルチャースクールで開講中。',
        icon: '🎓',
        url: '../JHCS.html',
        btnLabel: '教室を見る'
      }
    ]
  },

  // ================================================================
  // gallery: 幕僚ギャラリー
  // ================================================================
  {
    id: 'gallery',
    name: '幕僚ギャラリー',
    items: [],
    links: [
      {
        id: 'gallery-stamp',
        name: 'LINEスタンプ — 幕僚キャラクターズ',
        lead: '8人の幕僚キャラが日常を彩る。LINEスタンプ申請中。',
        icon: '💬',
        url: 'https://store.line.me/home',
        btnLabel: 'LINEを見る'
      },
      {
        id: 'gallery-figure',
        name: '幕僚フィギュア（製作中）',
        lead: '3Dモデル・フィギュア化プロジェクト進行中。もうしばらくお待ちください。',
        icon: '🔧',
        url: '../index.html',
        btnLabel: 'トップへ戻る'
      }
    ]
  }
];

// 後方互換: 旧 SHOWROOM_ITEMS（techo + katakamuna + koubou の items 結合）
window.SHOWROOM_ITEMS = window.SHOWROOM_ROOMS.flatMap(r => r.items || []);
