#!/usr/bin/env node
/**
 * 作品集の静的フォールバック works-data.json を生成する。
 *
 * 背景（2026-08-04）:
 *   GAS WebApp が断続的に404/HTMLを返す時間帯があり、実測で失敗率6/8・
 *   成功しても平均9.6秒・最悪164秒だった。作品集がGAS頼みだと、その間
 *   お客様に何も表示できない。そこで同じ内容をリポジトリにも置いておき、
 *   GASが落ちている間はそちらを表示する。
 *
 * ⛔ ここに書き出してよいのは api=products が返す商品データだけ。
 *    顧客フォルダ名など商品マスター以外のものを混ぜないこと。
 *    （旧 mini6-photos.json はキーがお客様のお名前で、GAS障害時に
 *      作品集へそのまま出てしまった。2026-08-04 に廃止済み）
 *
 * 使い方: node tools/build_works_data.js
 */

const fs = require('fs');
const path = require('path');

const API = 'https://script.google.com/macros/s/AKfycbw-ghhuzw8WYH7w4Png96Qt3s5EYbVaK_P32UJvqvhr28Ck2mxQJkedbAimogVHExeouw/exec?api=products';
const OUT = path.join(__dirname, '..', 'works-data.json');

/** 商品1件で保持するフィールド。ここに無いものは書き出さない（想定外データの混入防止） */
const ALLOWED_KEYS = [
  'id', 'name', 'category', 'material', 'color', 'size',
  'price', 'soldout', 'noRestock', 'stock', 'date',
  'shortDesc', 'longDesc', 'status', 'folderId', 'mainPhoto',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchProducts(maxRounds = 12) {
  let lastErr = '';
  for (let i = 1; i <= maxRounds; i++) {
    const started = Date.now();
    try {
      const res = await fetch(API);
      const text = await res.text();
      const head = text.trim().charAt(0);
      if (head !== '[') {
        lastErr = `HTTP ${res.status} / 本文先頭 "${text.trim().slice(0, 20)}"`;
        console.log(`  試行${i}: 失敗 (${Date.now() - started}ms) ${lastErr}`);
      } else {
        const data = JSON.parse(text);
        if (!Array.isArray(data) || !data.length) {
          lastErr = '空配列が返りました';
          console.log(`  試行${i}: 失敗 (${Date.now() - started}ms) ${lastErr}`);
        } else {
          console.log(`  試行${i}: 成功 (${Date.now() - started}ms) ${data.length}件`);
          return data;
        }
      }
    } catch (e) {
      lastErr = e.message;
      console.log(`  試行${i}: 例外 (${Date.now() - started}ms) ${lastErr}`);
    }
    await sleep(2000);
  }
  throw new Error(`GASから取得できませんでした: ${lastErr}`);
}

/** 想定フィールドだけに絞る */
function sanitize(products) {
  return products.map((p) => {
    const out = {};
    ALLOWED_KEYS.forEach((k) => { if (p[k] !== undefined) out[k] = p[k]; });
    return out;
  });
}

(async () => {
  console.log('GASから商品データを取得します…');
  const raw = await fetchProducts();

  // 想定外フィールドがあれば知らせる（GAS側の変更に気づくため。中断はしない）
  const unexpected = new Set();
  raw.forEach((p) => Object.keys(p).forEach((k) => {
    if (!ALLOWED_KEYS.includes(k)) unexpected.add(k);
  }));
  if (unexpected.size) {
    console.log('※ 想定外のフィールドを検出（書き出しからは除外）:', [...unexpected].join(', '));
  }

  const data = sanitize(raw);
  const json = JSON.stringify(data);

  // 中身が減っていたら事故の可能性があるので止める
  if (fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      if (Array.isArray(prev) && prev.length > data.length * 1.5) {
        throw new Error(`件数が大きく減っています（前回 ${prev.length}件 → 今回 ${data.length}件）。中止します。`);
      }
    } catch (e) {
      if (e.message.includes('件数が大きく減って')) throw e;
      // 前回ファイルが壊れている場合は無視して上書きする
    }
  }

  fs.writeFileSync(OUT, json, 'utf8');
  console.log(`書き出し完了: ${OUT}`);
  console.log(`  ${data.length}件 / ${Math.round(json.length / 1024)}KB`);
})().catch((e) => {
  console.error('エラー:', e.message);
  process.exit(1);
});
