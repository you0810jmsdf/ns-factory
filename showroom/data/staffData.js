// N's factory Web 3D Showroom — スタッフデータ
// v3.0.0 — 2026-06-12 明るいガラスパビリオン対応（単一大空間・絶対座標）
// waypointsはワールド座標 [x, z] で記述（部屋オフセット加算不要）
//
// ゾーン配置（32×24大空間）:
//   中央ホール  x:  0    z:  0   （ブランドサイン・総司令官・作戦）
//   北ゾーン    x:  0    z: -8   （手帳の間: 販売・後方）
//   東ゾーン    x: +10   z:  0   （カタカムナの間: 教育・広報）
//   南ゾーン    x:  0    z: +8   （工房の間: 監理・人事）
//   西ゾーン    x: -10   z:  0   （ギャラリー: デジタル・保全）

window.SHOWROOM_STAFF = [

  // ===== 中央ホール =====
  {
    id: 'kojinjigyonusi',
    name: '個人事業主',
    role: '総司令官',
    room: 'hall',
    image: 'assets/staff/kojinjigyonusi.jpg',
    model: 'assets/models/kojinjigyonusi.glb',
    waypoints: [
      [  0.0,   0.5 ],
      [  1.5,   1.5 ],
      [  0.0,   2.5 ],
      [ -1.5,   1.5 ],
      [  0.0,   0.5 ]
    ],
    lines: [
      "いらっしゃいませ。N's factoryへようこそ。ゆっくりご覧ください。",
      'ひとつひとつ手で作った革製品を、どうぞお楽しみください。',
      '職人として、お客様の大切な一点をお作りしています。'
    ],
    btnLabel: 'ブランドについて',
    btnUrl: '../profile.html'
  },
  {
    id: 'sakusen',
    name: '作戦幕僚',
    role: '経営戦略担当',
    room: 'hall',
    image: 'assets/staff/sakusen.jpg',
    model: 'assets/models/sakusen.glb',
    waypoints: [
      [ -2.5,   0.0 ],
      [ -3.5,   1.5 ],
      [ -2.5,   3.0 ],
      [ -1.0,   1.5 ],
      [ -2.5,   0.0 ]
    ],
    lines: [
      "いらっしゃいませ。N's factoryの全体戦略を担当しております。",
      'ご要望やご相談はトップページからお気軽にどうぞ。',
      '最善のご提案ができるよう、常に戦略を練っております。'
    ],
    btnLabel: 'トップページへ',
    btnUrl: '../index.html'
  },

  // ===== 北ゾーン（手帳の間）=====
  {
    id: 'hannbai',
    name: '販売幕僚',
    role: '販売・受注担当',
    room: 'techo',
    image: 'assets/staff/hannbai.jpg',
    model: 'assets/models/hannbai.glb',
    waypoints: [
      [  2.0,  -7.0 ],
      [  3.5,  -8.5 ],
      [  1.5,  -10.0],
      [  0.0,  -8.5 ],
      [  2.0,  -7.0 ]
    ],
    lines: [
      'いらっしゃいませ。作品のご購入・受注を担当しております。',
      'お気に入りの作品が見つかりましたら、ぜひ作品一覧をご覧ください。',
      'カルチャースクール講座のご案内もしております。お気軽にどうぞ。'
    ],
    btnLabel: '作品を見る',
    btnUrl: '../works.html'
  },
  {
    id: 'kouhou_room',
    name: '後方幕僚',
    role: '仕入・CAD・自動化担当',
    room: 'techo',
    image: 'assets/staff/kouhou.jpg',
    model: 'assets/models/kouhou_room.glb',
    waypoints: [
      [ -2.0,  -7.0 ],
      [ -3.5,  -8.5 ],
      [ -2.0, -10.0 ],
      [ -0.5,  -8.5 ],
      [ -2.0,  -7.0 ]
    ],
    lines: [
      'いらっしゃいませ。制作の裏方を担当しております。',
      'お役立ちツールを各種ご用意しております。ぜひご活用ください。',
      '型紙設計から仕入れまで、ものづくりの基盤を支えております。'
    ],
    btnLabel: 'ツール一覧へ',
    btnUrl: '../tools/'
  },

  // ===== 東ゾーン（カタカムナの間）=====
  {
    id: 'kyouiku',
    name: '教育幕僚',
    role: '精神教育・カタカムナ担当',
    room: 'katakamuna',
    image: 'assets/staff/kyouiku.jpg',
    model: 'assets/models/kyouiku.glb',
    waypoints: [
      [ 10.0,  -1.5 ],
      [ 11.5,   0.0 ],
      [ 10.0,   1.5 ],
      [  8.5,   0.0 ],
      [ 10.0,  -1.5 ]
    ],
    lines: [
      'いらっしゃいませ。カタカムナと日月神示の世界をご案内しております。',
      '古代の叡智と現代の暮らしをつなぐコンテンツをご用意しております。',
      '心の学びに関心のある方、ぜひページをのぞいてみてください。'
    ],
    btnLabel: 'カタカムナ・日月神示',
    btnUrl: '../hitsuki/'
  },
  {
    id: 'kouhou',
    name: '広報幕僚',
    role: '情報発信・ブランド担当',
    room: 'katakamuna',
    image: 'assets/staff/pr.jpg',
    model: 'assets/models/kouhou.glb',
    waypoints: [
      [ 10.0,   2.0 ],
      [ 11.5,   3.5 ],
      [ 10.0,   5.0 ],
      [  8.5,   3.5 ],
      [ 10.0,   2.0 ]
    ],
    lines: [
      'いらっしゃいませ。SNSでの情報発信を担当しております。',
      '最新の作品情報や工房の日常をThreadsで発信中です。',
      'フォローいただくと新作をいち早くご覧いただけます。'
    ],
    btnLabel: 'Threadsを見る',
    btnUrl: 'https://www.threads.net/@you0810jmsdf'
  },

  // ===== 南ゾーン（工房の間）=====
  {
    id: 'kanri',
    name: '監理幕僚',
    role: '収支・お見積もり担当',
    room: 'koubou',
    image: 'assets/staff/kanri.jpg',
    model: 'assets/models/kanri.glb',
    waypoints: [
      [  2.0,   7.0 ],
      [  3.5,   8.5 ],
      [  1.5,  10.0 ],
      [  0.0,   8.5 ],
      [  2.0,   7.0 ]
    ],
    lines: [
      'いらっしゃいませ。お見積もりのご相談はお任せください。',
      'オーダーメイドのご予算感を、見積もりフォームでご確認いただけます。',
      'ご不明な点がございましたら、遠慮なくお問い合わせください。'
    ],
    btnLabel: 'お見積もりへ',
    btnUrl: '../order_estimate/stock-quote.html'
  },
  {
    id: 'jinji',
    name: '人事幕僚',
    role: 'レザークラフト教室担当',
    room: 'koubou',
    image: 'assets/staff/jinji.jpg',
    model: 'assets/models/jinji.glb',
    waypoints: [
      [ -2.0,   7.0 ],
      [ -3.5,   8.5 ],
      [ -2.0,  10.0 ],
      [ -0.5,   8.5 ],
      [ -2.0,   7.0 ]
    ],
    lines: [
      'いらっしゃいませ。レザークラフト教室のご案内を担当しております。',
      '革の手縫いや型紙づくりを一から丁寧にお教えしております。',
      'ご興味をお持ちの方はぜひ教室ページをご覧ください。'
    ],
    btnLabel: 'レザークラフト教室',
    btnUrl: '../JHCS.html'
  },

  // ===== 西ゾーン（幕僚ギャラリー）=====
  {
    id: 'digital',
    name: 'デジタル幕僚',
    role: 'サイト・デジタル戦略担当',
    room: 'gallery',
    image: 'assets/staff/digital.jpg',
    model: 'assets/models/digital.glb',
    waypoints: [
      [ -10.0,  -1.5 ],
      [ -11.5,   0.0 ],
      [ -10.0,   1.5 ],
      [  -8.5,   0.0 ],
      [ -10.0,  -1.5 ]
    ],
    lines: [
      'いらっしゃいませ。このWeb 3Dショールームを担当しております。',
      "バーチャル空間でN's factoryの作品をお楽しみいただけます。",
      'デジタルならではの体験をお届けできるよう努めております。'
    ],
    btnLabel: 'トップページへ',
    btnUrl: '../index.html'
  },
  {
    id: 'hozen',
    name: '保全幕僚',
    role: 'セキュリティ・リンク管理担当',
    room: 'gallery',
    image: 'assets/staff/hozen.jpg',
    model: 'assets/models/hozen.glb',
    waypoints: [
      [ -10.0,   2.0 ],
      [ -11.5,   3.5 ],
      [ -10.0,   5.0 ],
      [  -8.5,   3.5 ],
      [ -10.0,   2.0 ]
    ],
    lines: [
      'いらっしゃいませ。各種リンク・認証情報の管理を担当しております。',
      "N's factoryの関連サービスへのリンクをまとめております。",
      'ご利用のサービスへのアクセスはリンク集からどうぞ。'
    ],
    btnLabel: 'リンク集へ',
    btnUrl: '../links.html'
  }
];
