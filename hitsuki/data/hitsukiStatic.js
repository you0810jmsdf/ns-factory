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
    status: 'published',
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
    id: 'uetsu-003',
    volumeId: 'uetsu',
    chapterKeys: ['003'],
    title: '第三帖：今の世の価値観は上下逆・海が陸に陸が海になる',
    status: 'published',
    summary: '現代社会で「良い」とされていることは神の世界と逆になっている。心の鏡を磨き、来る価値観の大逆転に備えよ。',
    tags: ['価値観逆転', '身魂磨き', '鏡']
  },
  {
    id: 'uetsu-004',
    volumeId: 'uetsu',
    chapterKeys: ['004'],
    title: '第四帖：神は急いでいる・神祀りが第一・上下揃った世が神の世',
    status: 'published',
    summary: '世の大改革は急を要するが人民は目覚めない。神祀りが政治の基本。支配者だけでも民衆だけでも不十分で、全てが行き届いた状態が神の世。',
    tags: ['神祀り', '弥勒の世', '富士見晴らし台']
  },
  {
    id: 'uetsu-005',
    volumeId: 'uetsu',
    chapterKeys: ['005'],
    title: '第五帖：富士とは神の山・神の米・ひむかのお役',
    status: 'published',
    summary: '富士山だけでなく神のいる山全てが「富士」。抽象度を高め神の視点で世界を見ることが日本人の使命。ひむかは人の病を直し神に向けさせる神の使い。',
    tags: ['富士', '神の米', '抽象度', 'ひむか']
  },
  {
    id: 'uetsu-006',
    volumeId: 'uetsu',
    chapterKeys: ['006'],
    title: '第六帖：10月まで待て・目先の騒ぎに惑わされるな',
    status: 'published',
    summary: '人民は目先しか見えず来る大困難に備えていない。秋（10月）になって初めて神の仕組みが発動する。今は慌てず神の言葉を深く理解する時。',
    tags: ['大峠', '10月', '目先']
  },
  {
    id: 'uetsu-007',
    volumeId: 'uetsu',
    chapterKeys: ['007'],
    title: '第七帖：因縁の身魂のみ神の御用・大きな病を直す',
    status: 'published',
    summary: 'あらかじめ神に定められた因縁を持つ者だけが神の御用を担える。大きな病（肉体・魂・社会・世界レベル）を癒す役割がある。',
    tags: ['因縁', '神の御用', '身魂']
  },
  {
    id: 'uetsu-008',
    volumeId: 'uetsu',
    chapterKeys: ['008'],
    title: '第八帖：秋から道が開く・今から腹に入れよ',
    status: 'published',
    summary: '秋から神の仕組みが本格的に動き出す。それまでに神の言葉を「腹に入れて」おくことが重要。知識ではなく行動に繋がる深い確信として身につけよ。',
    tags: ['秋', '準備', '弥勒の世', '腹に入れる']
  },
  {
    id: 'uetsu-009',
    volumeId: 'uetsu',
    chapterKeys: ['009'],
    title: '第九帖：日本一度潰れ・神も仏もない世が来る',
    status: 'published',
    summary: '日本が一度潰れたようになり、神も仏もないと誰もが思う時代が来る。それが大峠。そのような事態が来てから慌てても仕方ない。今のうちに備えよ。',
    tags: ['大峠', '日本', '絶望', '備え']
  },
  {
    id: 'uetsu-010',
    volumeId: 'uetsu',
    chapterKeys: ['010'],
    title: '第十帖：神に向けば映る・身魂掃除で神との繋がりが決まる',
    status: 'published',
    summary: '鏡（心）を神に向ければ神が映る。身魂掃除の程度によって神との繋がりの深さが決まる。どんな状況でもおかげを落とさず神への信頼を持ち続けよ。',
    tags: ['鏡', '身魂掃除', '神との繋がり', 'おかげ']
  },
  {
    id: 'uetsu-011',
    volumeId: 'uetsu',
    chapterKeys: ['011'],
    title: '第十一帖：東京元の土に一時帰る・復興も含む予言',
    status: 'published',
    summary: '東京が元の土に一時帰るという予言は東京大空襲として的中。「一時」という言葉に破壊だけでなく復興・再生の意味も含まれる。予言は対処の指針として使うもの。',
    tags: ['東京', '大峠', '予言', '復興']
  },
  {
    id: 'uetsu-012',
    volumeId: 'uetsu',
    chapterKeys: ['012'],
    title: '第十二帖：大将を守れ・大峠失敗への警告',
    status: 'published',
    summary: '大将を守ることが共同体存続の鍵。今の「おかしい」「腹が立つ」という感覚は大峠が来ている証拠かもしれない。人生の責任者は自分自身。大難をプラスに変えよ。',
    tags: ['大将', '大峠', '責任', '警告']
  },
  {
    id: 'uetsu-013',
    volumeId: 'uetsu',
    chapterKeys: ['013'],
    title: '第十三帖：59の身魂・世界は59人で変えられる',
    status: 'published',
    summary: '3＋7＋49＝59名の覚醒した身魂がいれば世界を変えられる。造化三神・七主権の神・49の因縁身魂の連鎖構造。自分が59名の1人かもしれないという自覚を持て。',
    tags: ['59の身魂', '因縁', '覚醒', '世界変革']
  },
  {
    id: 'uetsu-014',
    volumeId: 'uetsu',
    chapterKeys: ['014'],
    title: '第十四帖：59の身魂は神が守る・因縁の身魂に手柄を立てさせる',
    status: 'published',
    summary: '因縁の身魂は神が特別に守護し、使命の機会を意図的に用意している。神の期待を理解し期待に沿う行動をとることが、神からのサポートを受ける前提条件。',
    tags: ['神の守護', '手柄', '因縁', '使命']
  },
  {
    id: 'uetsu-015',
    volumeId: 'uetsu',
    chapterKeys: ['015'],
    title: '第十五帖：因縁の身魂を集めよ・見た目でなく身魂で判断せよ',
    status: 'published',
    summary: '外見・学歴・地位ではなく身魂の光で人を判断せよ。大峠の苦難の先には最高の理想の時代が来る。それが神の秘密。日本の未来は神の計画の中で最も輝かしい役割がある。',
    tags: ['身魂', '判断', '弥勒の世', '日本の未来']
  },
  {
    id: 'uetsu-016',
    volumeId: 'uetsu',
    chapterKeys: ['016'],
    title: '第十六帖：ひの火水は結び・日神月神で弥勒の世が実現',
    status: 'published',
    summary: '日（陽）と月（陰）の力が統合されることで弥勒の世が実現する。自分の陰陽を統合し神と人が一体となる境地に至ることが身魂磨きの究極の目標。',
    tags: ['火水', '日神', '月神', '弥勒の世', '統合']
  },
  {
    id: 'uetsu-017',
    volumeId: 'uetsu',
    chapterKeys: ['017'],
    title: '第十七帖：この世は全て神のもの・土の作物はまず神に供えよ',
    status: 'published',
    summary: 'この世は全て神のもの。土の作物はまず神に供えてから（感謝してから）いただく。神のお下がりを食べると身魂が太る。毎日の食事が身魂磨きの具体的な実践。',
    tags: ['神のもの', '感謝', '供え', '身魂磨き', '食事']
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
