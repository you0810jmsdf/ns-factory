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
