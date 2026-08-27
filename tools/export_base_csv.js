#!/usr/bin/env node
/**
 * works-data.json から BASE CSV商品管理 App 用の下書きCSVを生成する。
 *
 * 目的:
 * - SOLDOUTはオーダーメイドの過去作品として無視し、登録候補から外さない。
 * - 価格未設定はBASE登録CSVに入れず、価格確認CSVへ分ける。
 * - 個人名・ハンドル名・連絡先らしき文字列を含む作品は登録CSVに入れず、
 *   個人名候補確認CSVへ分ける。
 *
 * 使い方:
 *   node tools/export_base_csv.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKS_DATA = path.join(ROOT, 'works-data.json');
const OUT_DIR = path.join(__dirname, 'output', 'base-export');

const SHOP_BASE_URL = 'https://you0810jmsdf.github.io/ns-factory';
const BASE_IMPORT_HEADERS = [
  '商品ID',
  '商品名',
  '説明',
  '価格',
  '税率',
  '在庫数',
  '公開状態',
  '表示順',
  '画像(1)',
];

const REVIEW_HEADERS = [
  '作品ID',
  '作品名',
  '価格',
  '理由',
  '確認箇所',
  '該当文字列',
  '前後の文脈',
  '作品URL',
];

const SUMMARY_HEADERS = ['項目', '件数'];

const PII_RULES = [
  {
    label: 'メールアドレス',
    re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  },
  {
    label: '電話番号',
    re: /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/g,
  },
  {
    label: '郵便番号',
    re: /〒?\s?\d{3}-\d{4}/g,
  },
  {
    label: 'SNS/ECハンドル',
    re: /(?:Instagram|Insta|インスタ|X（Twitter）|Twitter|Threads|Creema|minne|メルカリ|mercari|ラクマ|PayPay|Pinkoi)\s*[:：_\-]?\s*[@A-Za-z0-9_.\-]{2,}/gi,
  },
  {
    label: '敬称つき氏名候補',
    re: /(?:^|[\s、。：「」『』【】（(])([一-龥々ぁ-んァ-ンーA-Za-z0-9_.・\-]{2,16})(様|さん|氏|先生)(?=$|[\s、。：「」『』【】）)のへよりからにと])/g,
    format: (match) => `${match[1]}${match[2]}`,
    ignore: (match) => isGenericHonorific(`${match[1]}${match[2]}`),
  },
  {
    label: '顧客情報ラベル',
    re: /(?:依頼者|顧客名|お客様名|氏名|宛名|アカウント名|ハンドルネーム)\s*[:：]\s*[^\n\r、。]{2,40}/g,
  },
];

const GENERIC_HONORIFICS = new Set([
  'お客様',
  '皆様',
  '神様',
  '仏様',
  'お子様',
  '奥様',
  '旦那様',
  'たくさん',
  '職人さん',
  '作家さん',
]);

function isGenericHonorific(value) {
  const text = String(value || '');
  return GENERIC_HONORIFICS.has(text)
    || text.endsWith('仕様')
    || text.endsWith('模様')
    || text.endsWith('同様')
    || text.endsWith('多様')
    || text.endsWith('様々')
    || text.endsWith('様子');
}

const LINE_DROP_RULES = [
  /(?:依頼者|顧客名|お客様名|氏名|宛名|アカウント名|ハンドルネーム)\s*[:：]/,
  /(?:Instagram|Insta|インスタ|X（Twitter）|Twitter|Threads|Creema|minne|メルカリ|mercari|ラクマ|PayPay|Pinkoi)\s*[:：_\-]?\s*[@A-Za-z0-9_.\-]{2,}/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/,
  /〒?\s?\d{3}-\d{4}/,
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stripFourByteChars(value) {
  return String(value || '').replace(/[\u{10000}-\u{10FFFF}]/gu, '');
}

function normalizeText(value) {
  return stripFourByteChars(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanTitle(value) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .slice(0, 220)
    .trim();
}

function numberOrZero(value) {
  const n = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function hasValidPrice(work) {
  return numberOrZero(work.price) >= 50;
}

function workUrl(work) {
  return `${SHOP_BASE_URL}/works/${encodeURIComponent(work.id)}.html`;
}

function mainPhotoFileName(work) {
  if (!work.mainPhoto) return '';
  return `${work.id}_01.jpg`;
}

function csvEscape(value) {
  const s = String(value == null ? '' : value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  });
  return `${lines.join('\r\n')}\r\n`;
}

function findPrivacyHits(work) {
  const fields = [
    ['作品名', work.name],
    ['短い説明', work.shortDesc],
    ['長い説明', work.longDesc],
  ];
  const hits = [];
  fields.forEach(([field, value]) => {
    const text = normalizeText(value);
    if (!text) return;
    PII_RULES.forEach((rule) => {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(text)) !== null) {
        if (rule.ignore && rule.ignore(match)) {
          if (match[0].length === 0) rule.re.lastIndex += 1;
          continue;
        }
        const matchedText = rule.format ? rule.format(match) : match[0];
        hits.push({
          field,
          label: rule.label,
          match: matchedText,
          snippet: snippet(text, match.index, match[0].length),
        });
        if (match[0].length === 0) rule.re.lastIndex += 1;
      }
    });
  });
  return hits;
}

function snippet(text, index, length) {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return text.slice(start, end).replace(/\n/g, ' / ');
}

function sanitizeDescriptionText(value) {
  const text = normalizeText(value);
  if (!text) return '';
  return text
    .split('\n')
    .filter((line) => !LINE_DROP_RULES.some((rule) => rule.test(line)))
    .join('\n')
    .replace(/[一-龥々ぁ-んァ-ンーA-Za-z0-9_.・\-]{2,24}(?:様|さん|氏|先生)/g, 'お客様')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildDescription(work) {
  const parts = [];
  const intro = sanitizeDescriptionText(work.longDesc || work.shortDesc);
  const shortDesc = sanitizeDescriptionText(work.shortDesc);

  parts.push('こちらは過去に制作した作品をもとにした、オーダーメイド受付用の商品ページです。');
  parts.push('革の色・素材・金具・サイズは、在庫状況やご希望に合わせて調整できます。');
  parts.push('');
  parts.push('【作品情報】');
  parts.push(`作品番号：${work.id || ''}`);
  parts.push(`カテゴリ：${work.category || '革小物'}`);
  if (work.material) parts.push(`素材：${work.material}`);
  if (work.color) parts.push(`色：${work.color}`);
  if (work.size) parts.push(`サイズ：${work.size}`);

  if (shortDesc) {
    parts.push('');
    parts.push('【ひとこと紹介】');
    parts.push(shortDesc);
  }

  if (intro) {
    parts.push('');
    parts.push('【作品紹介】');
    parts.push(intro);
  }

  parts.push('');
  parts.push('【ご注文前に】');
  parts.push('天然革を使用しているため、しわ・傷・色むら・血筋などが入る場合があります。革の個性としてお楽しみください。');
  parts.push('受注製作のため、材料の在庫や仕様によって価格・納期が変わる場合があります。気になる点はご注文前にお問い合わせください。');
  parts.push('');
  parts.push(`作品集ページ：${workUrl(work)}`);

  return normalizeText(parts.join('\n'));
}

function baseImportRow(work, index) {
  const title = cleanTitle(`${work.id} ${work.name || 'Nsfactory order item'}`);
  return {
    商品ID: '',
    商品名: title,
    説明: buildDescription(work),
    価格: String(numberOrZero(work.price)),
    税率: '1',
    在庫数: String(Math.max(1, numberOrZero(work.stock) || 1)),
    公開状態: '0',
    表示順: String(index + 1),
    '画像(1)': mainPhotoFileName(work),
  };
}

function reviewRow(work, reason, hit) {
  return {
    作品ID: work.id || '',
    作品名: cleanTitle(work.name || ''),
    価格: work.price || '',
    理由: reason,
    確認箇所: hit ? hit.field : '',
    該当文字列: hit ? hit.match : '',
    前後の文脈: hit ? hit.snippet : '',
    作品URL: work.id ? workUrl(work) : '',
  };
}

function imageListRow(work) {
  return {
    作品ID: work.id || '',
    画像ファイル名: mainPhotoFileName(work),
    代表写真URL: work.mainPhoto || '',
    作品URL: work.id ? workUrl(work) : '',
  };
}

function main() {
  if (!fs.existsSync(WORKS_DATA)) {
    throw new Error(`works-data.json が見つかりません: ${WORKS_DATA}`);
  }

  ensureDir(OUT_DIR);
  const works = JSON.parse(fs.readFileSync(WORKS_DATA, 'utf8'));
  if (!Array.isArray(works)) {
    throw new Error('works-data.json の形式が配列ではありません。');
  }

  const ready = [];
  const priceReview = [];
  const privacyReview = [];
  const imageList = [];

  works.forEach((work) => {
    const priceOk = hasValidPrice(work);
    const hits = findPrivacyHits(work);

    if (!priceOk) {
      priceReview.push(reviewRow(work, '価格が50円未満または未設定', null));
    }

    if (hits.length) {
      hits.forEach((hit) => {
        privacyReview.push(reviewRow(work, hit.label, hit));
      });
    }

    if (priceOk && !hits.length) {
      ready.push(work);
      imageList.push(imageListRow(work));
    }
  });

  const readyRows = ready.map(baseImportRow);
  const summaryRows = [
    { 項目: '作品集総件数', 件数: works.length },
    { 項目: 'BASE登録CSVへ出力', 件数: readyRows.length },
    { 項目: '価格確認が必要', 件数: priceReview.length },
    { 項目: '個人名候補の確認が必要', 件数: new Set(privacyReview.map((r) => r.作品ID)).size },
    { 項目: '個人名候補ヒット数', 件数: privacyReview.length },
  ];

  fs.writeFileSync(path.join(OUT_DIR, 'base_import_ready.csv'), toCsv(BASE_IMPORT_HEADERS, readyRows), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'base_price_review.csv'), toCsv(REVIEW_HEADERS, priceReview), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'base_privacy_review.csv'), toCsv(REVIEW_HEADERS, privacyReview), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'base_image_download_list.csv'), toCsv(Object.keys(imageListRow({})), imageList), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'summary.csv'), toCsv(SUMMARY_HEADERS, summaryRows), 'utf8');

  console.log(`出力先: ${OUT_DIR}`);
  summaryRows.forEach((row) => console.log(`${row.項目}: ${row.件数}`));
  console.log('BASE登録CSVは安全確認のため公開状態=0で出力しています。');
  console.log('画像(1)には予定ファイル名だけを入れています。BASEへ画像付きで入れる場合は、同名画像をZIP化してください。');
}

try {
  main();
} catch (e) {
  console.error(`エラー: ${e.message}`);
  process.exit(1);
}
