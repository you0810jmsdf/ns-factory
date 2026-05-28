// カタカムナグッズ 商品データ
// price と url は BASE に商品登録したあとで記入する（空のままだと「準備中」表示）。
// shopUrl に既存BASEショップのトップURLを入れると、各カードの予備リンク先になる。
window.KATAKAMNA_GOODS = {
  shopUrl: '',
  items: [
    {
      id: 'coaster-utahi567',
      name: 'カタカムナ コースター ― 第五・六・七首セット',
      song: '第五・六・七首',
      material: 'ラバーウッド',
      image: 'goods/coaster_567.jpg',
      lead: '特にパワーが強いとされる三首を、日々の一杯のそばに。',
      description: '特にパワーが強いとされるカタカムナウタヒ第五・六・七首を、一首ずつ渦巻き状に焼き込んだラバーウッド製のコースター三枚セット。第五首「アワの歌」は四十八声のすべてを一巡する根本音列です。手元に置くことで、巡りと調和を日々の所作に重ねられます。',
      price: '¥3,600（税込・送料込み）',
      url: 'https://nsfactory.stores.jp/items/6a1833115b90eca2a9a25b3b'
    },
    {
      id: 'coaster-utahi05',
      name: 'カタカムナ コースター ― 第五首「アワの歌」',
      song: '第五首',
      material: '木 / レザー',
      image: 'goods/coaster_05.jpg',
      lead: '四十八音を一巡する宇宙の根本音列を、日々の一杯のそばに。',
      description: '第五首「アカハナマ イキヒニミウク…」は、カタカムナ四十八声のすべてを一度に巡る根本音列で、「アワの歌」とも呼ばれます。万物を構成する音が滞りなく循環する様を映した首です。コースターとして手元に置くことで、巡りと調和を日常の所作に重ねられます。',
      price: '',
      url: ''
    },
    {
      id: 'coaster-multi',
      name: 'カタカムナ コースター ― 複数首',
      song: '複数首',
      material: '木 / レザー',
      image: 'goods/coaster_multi.jpg',
      lead: '響き合う複数のウタヒを一枚に。',
      description: '複数の首の図象を一枚に配したコースター。それぞれの首が持つ響きを組み合わせ、好みの一枚を手元に。来客のもてなしや贈り物にも向きます。',
      price: '',
      url: ''
    },
    {
      id: 'custom-name',
      name: 'カタカムナ 名入りカスタムオーダー（ブレスレット／チョーカー）',
      song: 'カスタム',
      material: '木 / レザー',
      image: 'goods/custom_bracelet.png',
      lead: 'あなたの名前や好きな言葉を、カタカムナ文字で刻む。',
      description: 'お名前や好きな言葉をカタカムナ48音の文字に変換し、ブレスレットやチョーカーに一点ずつ刻印します。「48音表」ページの文字列ジェネレーターで文字を作成・PNG保存し、ご注文時に画像を添えてお知らせください。世界にひとつだけのお守りに。',
      generatorUrl: 'moji/',
      price: '',
      url: ''
    }
  ]
};
