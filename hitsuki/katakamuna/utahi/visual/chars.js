/**
 * カタカムナ48音 SVGシンボル定義
 * katakamuna_01.png の文字表に基づく
 *
 * 座標系: 中心 (0,0), 半径 ±10 の範囲
 * stroke="currentColor" fill="none" をデフォルト想定
 * 小さな●は fill="currentColor" で指定
 */

window.KATAKAMUNA_CHARS = {

  /* ── ア行 ──────────────────────────────── */

  // ア: 十字 ＋ 右端に小丸
  'ア': `
    <line x1="0" y1="-8.5" x2="0" y2="8.5"/>
    <line x1="-8" y1="0" x2="7" y2="0"/>
    <circle cx="8.5" cy="0" r="2.2" fill="currentColor"/>
  `,

  // イ: 右半円（D字）＋ 下端に小丸
  'イ': `
    <path d="M 0 -9 A 9 9 0 0 1 0 9" fill="none"/>
    <circle cx="0" cy="9" r="2" fill="currentColor"/>
  `,

  // ウ: 右半円 ＋ 上に横線 ＋ 右端に小丸
  'ウ': `
    <path d="M 0 -6 A 9 9 0 0 1 0 9" fill="none"/>
    <line x1="-5" y1="-6" x2="4" y2="-6"/>
    <circle cx="5" cy="-6" r="2" fill="currentColor"/>
  `,

  // エ: 縦線 ＋ 下端に小円（輪郭）
  'エ': `
    <line x1="0" y1="-9" x2="0" y2="6.5"/>
    <circle cx="0" cy="8.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  // オ: 下半円 ＋ 下に小丸
  'オ': `
    <path d="M -8 2 A 9 9 0 0 0 8 2" fill="none"/>
    <circle cx="0" cy="8" r="2" fill="currentColor"/>
  `,

  /* ── カ行 ──────────────────────────────── */

  // カ: 大円 ＋ 縦横十字（4分割）
  'カ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <line x1="0" y1="-9" x2="0" y2="9"/>
  `,

  // キ: カと同形 ＋ 対角に小丸2個
  'キ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <circle cx="-6" cy="-6" r="1.8" fill="currentColor"/>
    <circle cx="6" cy="6" r="1.8" fill="currentColor"/>
  `,

  // ク: 右半円 ＋ 上に左伸び横線
  'ク': `
    <path d="M 0 -9 A 9 9 0 0 1 0 6" fill="none"/>
    <line x1="-7" y1="-9" x2="0" y2="-9"/>
  `,

  // ケ: 十字 ＋ 左端に小丸
  'ケ': `
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <line x1="-8" y1="0" x2="8" y2="0"/>
    <circle cx="-9.5" cy="0" r="2" fill="currentColor"/>
  `,

  // コ: 十字 ＋ 右下に小丸
  'コ': `
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <line x1="-8" y1="0" x2="8" y2="0"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
  `,

  /* ── サ行 ──────────────────────────────── */

  // サ: カと同形 ＋ 斜め対角に小丸2個（カと違う位置）
  'サ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <circle cx="-6" cy="6" r="1.8" fill="currentColor"/>
    <circle cx="6" cy="-6" r="1.8" fill="currentColor"/>
  `,

  // シ: 左半円（反D字）
  'シ': `
    <path d="M 0 -9 A 9 9 0 0 0 0 9" fill="none"/>
  `,

  // ス: 十字 ＋ 右端・下端に小丸
  'ス': `
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <line x1="-8" y1="0" x2="8" y2="0"/>
    <circle cx="9.5" cy="0" r="2" fill="currentColor"/>
    <circle cx="0" cy="9.5" r="2" fill="currentColor"/>
  `,

  // セ: 十字 ＋ 左端・下端に小丸
  'セ': `
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <line x1="-8" y1="0" x2="8" y2="0"/>
    <circle cx="-9.5" cy="0" r="2" fill="currentColor"/>
    <circle cx="0" cy="9.5" r="2" fill="currentColor"/>
  `,

  // ソ: 上半円（弓形）＋ 中央に小丸
  'ソ': `
    <path d="M 8 2 A 9 9 0 0 1 -8 2" fill="none"/>
    <circle cx="0" cy="-3" r="2" fill="currentColor"/>
  `,

  /* ── タ行 ──────────────────────────────── */

  // タ: 大円 ＋ 横線（Θ字）
  'タ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
  `,

  // チ: 上半円（弓形）＋ 上に縦線
  'チ': `
    <path d="M -8 1 A 9 9 0 0 1 8 1" fill="none"/>
    <line x1="0" y1="1" x2="0" y2="-8"/>
  `,

  // ツ: 十字 ＋ 4端に小丸
  'ツ': `
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <circle cx="0" cy="-9.5" r="2" fill="currentColor"/>
    <circle cx="9.5" cy="0" r="2" fill="currentColor"/>
    <circle cx="0" cy="9.5" r="2" fill="currentColor"/>
    <circle cx="-9.5" cy="0" r="2" fill="currentColor"/>
  `,

  // テ: 大円 ＋ 横線 ＋ 上端に小丸（タ＋小丸）
  'テ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <circle cx="0" cy="-9.5" r="2" fill="currentColor"/>
  `,

  // ト: 大円 ＋ 横線 ＋ 上に縦線（短）
  'ト': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <line x1="0" y1="-9" x2="0" y2="-3"/>
  `,

  /* ── ナ行 ──────────────────────────────── */

  // ナ: 下半円 ＋ 中心から上縦線
  'ナ': `
    <path d="M -8 3 A 9 9 0 0 0 8 3" fill="none"/>
    <line x1="0" y1="3" x2="0" y2="-8"/>
  `,

  // ニ: 下半円 ＋ 中央に小丸
  'ニ': `
    <path d="M -8 4 A 9 9 0 0 0 8 4" fill="none"/>
    <circle cx="0" cy="4" r="2.2" fill="currentColor"/>
  `,

  // ヌ: 横線 ＋ 両端から下弧
  'ヌ': `
    <line x1="-9" y1="-4" x2="9" y2="-4"/>
    <path d="M -9 -4 A 9 9 0 0 1 0 6" fill="none"/>
    <path d="M 9 -4 A 9 9 0 0 0 0 6" fill="none"/>
  `,

  // ネ: 小丸4個（2×2配置）
  'ネ': `
    <circle cx="-4.5" cy="-4.5" r="2.2" fill="currentColor"/>
    <circle cx="4.5" cy="-4.5" r="2.2" fill="currentColor"/>
    <circle cx="-4.5" cy="4.5" r="2.2" fill="currentColor"/>
    <circle cx="4.5" cy="4.5" r="2.2" fill="currentColor"/>
  `,

  // ノ: 大円 ＋ 上端に小丸（マと類似、位置が違う）
  'ノ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <circle cx="0" cy="-9.5" r="2" fill="currentColor"/>
  `,

  /* ── ハ行 ──────────────────────────────── */

  // ハ: 横線 ＋ 両端に小丸
  'ハ': `
    <line x1="-8" y1="0" x2="8" y2="0"/>
    <circle cx="-9.5" cy="0" r="2" fill="currentColor"/>
    <circle cx="9.5" cy="0" r="2" fill="currentColor"/>
  `,

  // ヒ: 右半円（D字）のみ
  'ヒ': `
    <path d="M 0 -9 A 9 9 0 0 1 0 9" fill="none"/>
  `,

  // フ: 左半円 ＋ 上に右伸び横線
  'フ': `
    <path d="M 0 -9 A 9 9 0 0 0 0 9" fill="none"/>
    <line x1="0" y1="-9" x2="7" y2="-9"/>
  `,

  // ヘ: 上半円（弓形、下向き開口）＋ 下中央に小丸
  'ヘ': `
    <path d="M -8 3 A 9 9 0 0 1 8 3" fill="none"/>
    <circle cx="0" cy="5" r="2" fill="currentColor"/>
  `,

  // ホ: 横線 ＋ 下に縦線 ＋ その下に短い横線
  'ホ': `
    <line x1="-8" y1="-1" x2="8" y2="-1"/>
    <line x1="0" y1="-1" x2="0" y2="7"/>
    <line x1="-5" y1="7" x2="5" y2="7"/>
  `,

  /* ── マ行 ──────────────────────────────── */

  // マ: 大円 ＋ 上端内側に小丸（ノとは異なり内側）
  'マ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <circle cx="0" cy="-6" r="2" fill="currentColor"/>
  `,

  // ミ: 左半円 ＋ 縦線 ＋ 横線（左半D＋十字）
  'ミ': `
    <path d="M 0 -9 A 9 9 0 0 0 0 9" fill="none"/>
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <line x1="-9" y1="0" x2="0" y2="0"/>
  `,

  // ム: 下半円 ＋ 左縦線 ＋ 上端に小丸
  'ム': `
    <path d="M -8 4 A 9 9 0 0 0 8 4" fill="none"/>
    <line x1="-8" y1="-7" x2="-8" y2="4"/>
    <circle cx="-8" cy="-8.5" r="2" fill="currentColor"/>
  `,

  // メ: 縦線（左寄り）＋ 右斜め下に折線 ＋ 上端に小丸
  'メ': `
    <line x1="-5" y1="-8" x2="-5" y2="3"/>
    <line x1="-5" y1="3" x2="6" y2="-3"/>
    <circle cx="-5" cy="-9.5" r="2" fill="currentColor"/>
  `,

  // モ: 横線 ＋ 下に大きめ小丸
  'モ': `
    <line x1="-8" y1="-2" x2="8" y2="-2"/>
    <circle cx="0" cy="6" r="3" fill="currentColor"/>
  `,

  /* ── ヤ行 ──────────────────────────────── */

  // ヤ: 下半円 ＋ 中心縦線 ＋ 横線（十字付き椀）
  'ヤ': `
    <path d="M -8 4 A 9 9 0 0 0 8 4" fill="none"/>
    <line x1="0" y1="4" x2="0" y2="-5"/>
    <line x1="-5" y1="-1" x2="5" y2="-1"/>
  `,

  // ユ: L字 ＋ 右端に小丸
  'ユ': `
    <line x1="-5" y1="-7" x2="-5" y2="4"/>
    <line x1="-5" y1="4" x2="5" y2="4"/>
    <circle cx="6.5" cy="4" r="2" fill="currentColor"/>
  `,

  // ヨ: 左半円 ＋ 上端に小丸
  'ヨ': `
    <path d="M 0 -9 A 9 9 0 0 0 0 9" fill="none"/>
    <circle cx="0" cy="-9.5" r="2" fill="currentColor"/>
  `,

  /* ── ラ行 ──────────────────────────────── */

  // ラ: 下半円 ＋ 右端に小丸
  'ラ': `
    <path d="M -8 4 A 9 9 0 0 0 8 4" fill="none"/>
    <circle cx="8" cy="4" r="2" fill="currentColor"/>
  `,

  // リ: 大円を縦線で2分割（左右の半円の合わせ）
  'リ': `
    <path d="M 0 -9 A 9 9 0 0 1 0 9" fill="none"/>
    <path d="M 0 -9 A 9 9 0 0 0 0 9" fill="none"/>
  `,

  // ル: リ ＋ 下端に小丸
  'ル': `
    <path d="M 0 -9 A 9 9 0 0 1 0 9" fill="none"/>
    <path d="M 0 -9 A 9 9 0 0 0 0 9" fill="none"/>
    <circle cx="0" cy="9.5" r="2" fill="currentColor"/>
  `,

  // レ: 右半円のみ（イと同形だが小丸なし）
  'レ': `
    <path d="M 0 -9 A 9 9 0 0 1 0 9" fill="none"/>
  `,

  // ロ: 縦線 ＋ 右に大きめ小丸
  'ロ': `
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <circle cx="7" cy="0" r="3" fill="currentColor"/>
  `,

  /* ── ワ行 ──────────────────────────────── */

  // ワ: 大円のみ
  'ワ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
  `,

  // ヲ: 左上縦線 ＋ 右横線 ＋ 上端に小丸
  'ヲ': `
    <line x1="-5" y1="-7" x2="-5" y2="6"/>
    <line x1="-5" y1="0" x2="6" y2="0"/>
    <circle cx="-5" cy="-8.5" r="2" fill="currentColor"/>
  `,

  // ン: 左に小丸 ＋ 右に縦線
  'ン': `
    <circle cx="-4" cy="-3" r="2.5" fill="currentColor"/>
    <line x1="4" y1="-8" x2="4" y2="8"/>
  `,

  /* ── 古語仮名（ヰ・ヱ）──────────────────── */

  // ヰ: カと同形 ＋ 水平線両端に小丸
  'ヰ': `
    <circle cx="0" cy="0" r="9" fill="none"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
    <line x1="0" y1="-9" x2="0" y2="9"/>
    <circle cx="-9.5" cy="0" r="2" fill="currentColor"/>
    <circle cx="9.5" cy="0" r="2" fill="currentColor"/>
  `,

  // ヱ: L字折れ（ユより短く小さめ）
  'ヱ': `
    <line x1="-5" y1="-4" x2="-5" y2="5"/>
    <line x1="-5" y1="5" x2="5" y2="5"/>
  `,

};

/**
 * 中心シンボル（カタカムナ文字）
 * 大円 ＋ 内円4点 ＋ 縦横十字
 */
window.KATAKAMUNA_CENTER_SYMBOL = `
  <circle cx="0" cy="0" r="11" fill="none" stroke-width="1.8"/>
  <circle cx="0" cy="0" r="4.5" fill="none" stroke-width="1.5"/>
  <line x1="-11" y1="0" x2="11" y2="0" stroke-width="1.5"/>
  <line x1="0" y1="-11" x2="0" y2="11" stroke-width="1.5"/>
  <circle cx="0" cy="-7.8" r="1.5" fill="currentColor"/>
  <circle cx="7.8" cy="0" r="1.5" fill="currentColor"/>
  <circle cx="0" cy="7.8" r="1.5" fill="currentColor"/>
  <circle cx="-7.8" cy="0" r="1.5" fill="currentColor"/>
`;
