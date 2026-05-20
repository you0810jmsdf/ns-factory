// 解説・動画・編集方針の手動管理ファイル。
// hitsukiData.js は build_data.py が自動生成するため直接編集禁止。
// このファイルのみ直接編集してよい。

const HITSUKI_SOURCES = {
  volumeIndex: 'https://hifumi.uresi.org/link.html',
  wikiRoot: 'https://wiki.hifumi.online/',
  miharuChannel: 'https://www.youtube.com/@369katakamuna',
  miharuSearch: 'https://www.youtube.com/@369katakamuna/search?query=%E6%97%A5%E6%9C%88%E7%A5%9E%E7%A4%BA'
};

const HITSUKI_COMMENTARIES = [
  {
    id: 'uetsu-001',
    volumeId: 'uetsu',
    chapterKeys: ['001'],
    title: '第一帖の入口',
    status: 'draft',
    summary: '冒頭句から、日月神示の語りが「世の刷新」と「身魂磨き」を同時に立ち上げることを整理する。',
    tags: ['身魂磨き', '入口', '日本晴れ']
  },
  {
    id: 'uetsu-002',
    volumeId: 'uetsu',
    chapterKeys: ['002'],
    title: '神の愛と大峠――第二帖の核心',
    status: 'published',
    summary: `神は人間の親として苦労を与えているが、人間は期待を裏切り堕落している。ネズミ以下の存在に成り下がった人民への嘆きから始まり、「木の根でも食っておれ」という食糧難の予言と、木の根（木のエネ＝六十干支の第一番・甲子）が示す「原点回帰」の二重の意味を持つ。

【第二帖の主要テーマ】

■ 神と人の関係
神は人間の親として、愛情ゆえに苦労を与えている。しかし人間は苦に負け、神の期待を大きく裏切っている。

■ 人間の無力さへの嘆き
「ネズミでも三日先のことを知るのに、臣民は一寸先さえ分からぬ」――目先すら読めない状態に堕した人民を嘆く。「曇り」とは魂・心の汚れ・鈍化を指す。

■ 食糧難の予言と「木の根」の二重の意味
「食べ物が無くなっても死にはせぬ、木の根でも食っておれ」。表の意味は食糧難の到来と忍耐、裏の意味は木のエネ（甲子＝六十干支の第一番）＝原点・スタートへの回帰を指す。神から与えられた命であることを深く認識し、人生を全うせよというメッセージ。

■ 陰徳の教え
「手柄は千倍万倍にして返すから、人に知れたら長引きとなるから」――努力・善行は千倍万倍になって返るが、ひけらかした瞬間に帳消しになる。影となり、人知れず人・国のために働くことが神の臣民の姿。

■ 弥勒の世の到来
規制のない自由な「弥勒の世」という理想郷が必ず来る。それまでの忍耐が求められる。神に従わなければ世界は泥海となり、多くの人が沈む。

■ 人間の知恵の限界
「人の知恵で一つでも善きことをしたか」――神の力・天の理は人間の知恵の遠く及ばないところにある。できないことをできると勘違いして事態を悪化させるな。謙虚になれ、過信するな。

■ それでも見捨てない神の心
助かる気もなく自分を過信する者を泥海に沈めるのは容易。しかし大元の神（ウス様）に申し訳ないのであえて救いの手を差し伸べている。それでも聞かなければ痛い目に遭わせざるを得ない。

■ 日本分割の予言
「神の国日本を八つに切って殺す悪の計画」――日本を八分割して国家として滅ぼす計画の存在を昭和19年時点で予言。実際に第二次世界大戦後の対日占領分割計画と一致。79年周期説に基づけば、現代にも同様の動きが進行している可能性がある。

■ 善悪の顕現
弥勒の世になれば誰が神の民か悪の民か一目瞭然になる。神の意を組んだ全うな生き方をせよ。`,
    tags: ['大峠', '食糧難', '弥勒の世', '日本分割', '木のエネ', '原点回帰', '陰徳', '泥海', '試練']
  },
  {
    id: 'hinode-north',
    volumeId: 'hinode',
    chapterKeys: ['007', '020'],
    title: '北から来るという表現',
    status: 'outline',
    summary: '北方への警戒表現を、時代背景・象徴解釈・現代の動画解説の三層に分けて扱う。',
    tags: ['北', '大峠', '予言解説']
  },
  {
    id: 'shikin-005',
    volumeId: 'shikin',
    chapterKeys: ['005'],
    title: '火の雨と大洗濯',
    status: 'outline',
    summary: '災厄表現を恐怖訴求だけにせず、神示内の浄化思想と倫理的な受け止め方へ接続する。',
    tags: ['大洗濯', '火の雨', '浄化']
  }
];

const HITSUKI_VIDEOS = [
  {
    id: '1qhncgQPf3Q',
    channel: '預言天狗の開運お告げ',
    host: '預言天狗みはる',
    title: '【日月神示の預言】完全解説シリーズ 上巻第2帖',
    url: 'https://www.youtube.com/watch?v=1qhncgQPf3Q',
    publishedAt: '2025-02-08',
    duration: '',
    sourceUrl: 'https://www.youtube.com/watch?v=1qhncgQPf3Q&list=PLYps5cufwnAHfpb3bZ_oWV-S74NHVM2p5',
    themes: ['大峠', '食糧難', '弥勒の世', '日本分割', '木のエネ', '陰徳', '試練'],
    mappedTo: [
      { volumeId: 'uetsu', chapterKeys: ['002'], note: '上つ巻第二帖の完全解説動画。食糧難・弥勒の世・日本分割の予言を詳述。' }
    ]
  },
  {
    id: 'mguh3OvKMH8',
    channel: '預言天狗の開運お告げ',
    host: '預言天狗みはる',
    title: '日月神示完全解説：北から攻めてくる',
    url: 'https://www.youtube.com/watch?v=mguh3OvKMH8',
    publishedAt: '2025-07-08',
    duration: '33:29',
    sourceUrl: 'https://yutura.net/channel/53380/video/mguh3OvKMH8/',
    themes: ['北', '大峠', '終わりの始まり'],
    mappedTo: [
      { volumeId: 'uetsu',  chapterKeys: ['025'], note: '北から来るという警告表現の照合候補。' },
      { volumeId: 'hinode', chapterKeys: ['007', '020'], note: '動画テーマと直接対応しやすい候補。' },
      { volumeId: 'shikin', chapterKeys: ['005'], note: '大洗濯・災厄表現の補助参照。' }
    ]
  }
];

const EDITORIAL_WORKFLOW = [
  {
    title: '本文の扱いを決める',
    body: '全文転載は著作権・出典・許諾を確認してから。まずは巻名・帖番号・短い引用・出典リンクの管理に留める。'
  },
  {
    title: '帖ごとの解説を作る',
    body: '本文をそのまま置くだけでなく、時代背景、用語、関連巻、現代的な読みを分ける。'
  },
  {
    title: '動画を紐付ける',
    body: 'YouTube動画はタイトルだけでなく、該当する巻・帖・テーマ・根拠メモを残す。'
  },
  {
    title: '公開前に検証する',
    body: '予言系の断定表現は煽りになりやすいので、引用・解釈・個人的考察を明確に分ける。'
  }
];

window.HITSUKI_DATA = {
  sources:      HITSUKI_SOURCES,
  volumes:      window.HITSUKI_VOLUMES || [],
  commentaries: HITSUKI_COMMENTARIES,
  videos:       HITSUKI_VIDEOS,
  workflow:     EDITORIAL_WORKFLOW
};
