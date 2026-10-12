// スタンプ帳の集計（バッジ・地方ごとの進み具合）。画面の描画は map.js 側。
const REGIONS = [
  ['北海道', ['北海道']],
  ['東北', ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県']],
  ['関東', ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県']],
  ['中部', ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県']],
  ['近畿', ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県']],
  ['中国', ['鳥取県', '島根県', '岡山県', '広島県', '山口県']],
  ['四国', ['徳島県', '香川県', '愛媛県', '高知県']],
  ['九州・沖縄', ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']],
];
const COUNT_BADGES = [1, 10, 30, 50, 100];

export function regionOf(pref) {
  const r = REGIONS.find(([, ps]) => ps.includes(pref));
  return r ? r[0] : 'その他';
}

// shrines: 掲載中の神社の配列、visited: 参拝ずみの神社 ID の集合
export function summarize(shrines, visited) {
  const total = shrines.length, done = shrines.filter((s) => visited.has(s.id)).length;
  const regions = REGIONS.map(([name]) => ({ name, total: 0, done: 0 }));
  shrines.forEach((s) => {
    const r = regions.find((x) => x.name === regionOf(s.pref));
    if (!r) return;
    r.total++; if (visited.has(s.id)) r.done++;
  });
  const badges = [];
  COUNT_BADGES.forEach((n) => badges.push({
    key: 'n' + n, label: n === 1 ? 'はじめの一社' : n + '社 参拝', got: done >= n, remain: Math.max(0, n - done),
  }));
  regions.filter((r) => r.total > 0).forEach((r) => badges.push({
    key: 'r' + r.name, label: r.name + ' 制覇', got: r.done >= r.total, remain: r.total - r.done, sub: r.done + '／' + r.total,
  }));
  const next = badges.filter((b) => !b.got).sort((a, b) => a.remain - b.remain)[0] || null;
  return { total, done, regions, badges, next };
}
