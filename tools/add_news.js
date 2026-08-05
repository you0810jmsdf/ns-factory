#!/usr/bin/env node
/**
 * news-data.json にお知らせを1件追加する。
 *
 * GAS の「掲載する」ボタン → repository_dispatch → Actions から呼ばれる。
 * GAS WebApp は応答が失われても処理自体は完了していることがあり（CLAUDE.md
 * 2026-08-04 参照）、同じ内容が再送されうる。そのため **必ず冪等**にする：
 * 同じ id、または同じ 日付+本文 が既にあれば何もせず終了する。
 *
 * 入力は環境変数：
 *   NEWS_DATE       必須。「2026年8月」のような表示用ラベル（先頭は西暦4桁+年）
 *   NEWS_TEXT       必須。本文（HTMLタグ不可。そのまま textContent で表示される）
 *   NEWS_ID         任意。省略時は 日付+本文 から生成。再送時は同じ値を渡すこと
 *   NEWS_LINK_HREF  任意。リンク先（# / 相対パス / http(s) のみ）
 *   NEWS_LINK_LABEL 任意。リンクの表示文字
 *   NEWS_TEXT_AFTER 任意。リンクの後ろに置く文字（「。」など）
 *
 *   NEWS_LINE       NEWS_DATE / NEWS_TEXT の代わりに、表示される1行をそのまま渡す形。
 *                   「2026年8月 — 作品集のSOLDOUT表示を改善しました。」のように
 *                   日付ラベルと本文が「—」で繋がっている想定で、こちらで分解する。
 *                   GAS 側は掲載文をそのまま投げればよくなる。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_PATH = path.join(__dirname, '..', 'news-data.json');
const MAX_TEXT = 200;

function fail(msg) {
  console.error('エラー: ' + msg);
  process.exit(1);
}

function env(name) {
  return (process.env[name] || '').trim();
}

let date = env('NEWS_DATE');
let text = env('NEWS_TEXT');

// NEWS_LINE 形式（「2026年8月 — 本文」）で来たら日付ラベルと本文に分解する。
// 区切りは em dash / en dash / ハイフンのいずれも受ける（GAS 側の表記ゆれ対策）。
const line = env('NEWS_LINE');
if (line && !date && !text) {
  const m = line.match(/^\s*(\d{4}年[^—–-]*?)\s*[—–-]\s*([\s\S]+)$/);
  if (m) {
    date = m[1].trim();
    text = m[2].trim();
  } else {
    fail('NEWS_LINE を「2026年8月 — 本文」の形に分解できません: ' + line);
  }
}

if (!date) fail('NEWS_DATE が空です。');
if (!text) fail('NEWS_TEXT が空です。');

const yearMatch = date.match(/^(\d{4})年/);
if (!yearMatch) fail('NEWS_DATE は「2026年8月」のように西暦4桁+年で始めてください: ' + date);
const year = yearMatch[1];

if (text.length > MAX_TEXT) fail('NEWS_TEXT が長すぎます（' + text.length + '字 / 上限' + MAX_TEXT + '字）。');
if (/[<>]/.test(text)) fail('NEWS_TEXT に < > は使えません（HTMLは埋め込めません）。');

const linkHref = env('NEWS_LINK_HREF');
const linkLabel = env('NEWS_LINK_LABEL');
if (linkHref && !/^(#|\.{0,2}\/|https?:\/\/)/.test(linkHref)) {
  fail('NEWS_LINK_HREF は # / 相対パス / http(s) のみ指定できます: ' + linkHref);
}

const id = env('NEWS_ID') ||
  year + '-' + crypto.createHash('sha1').update(date + '\n' + text).digest('hex').slice(0, 10);

let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch (e) {
  fail('news-data.json を読めません: ' + e.message);
}
if (!data || !Array.isArray(data.groups)) fail('news-data.json の形式が想定と違います（groups が配列ではない）。');

// 冪等チェック：再送されても二重掲載しない
const duplicated = data.groups.some(function (g) {
  return (g.items || []).some(function (it) {
    return it.id === id || (it.date === date && it.text === text);
  });
});
if (duplicated) {
  console.log('既に掲載済みのため何もしません（id: ' + id + '）。');
  process.exit(0);
}

const item = { id: id, date: date, text: text };
if (linkHref && linkLabel) {
  item.link = { href: linkHref, label: linkLabel };
  const after = env('NEWS_TEXT_AFTER');
  if (after) item.text_after = after;
}

let group = data.groups.find(function (g) { return String(g.year) === year; });
if (!group) {
  group = { year: year, title: year + '年のお知らせ', open: false, items: [] };
  data.groups.unshift(group);
  console.log('新しい年のグループを追加しました: ' + group.title);
}
if (!Array.isArray(group.items)) group.items = [];
group.items.unshift(item);

// 年は新しい順（先頭グループが最初から開くため、並び順が表示に効く）
data.groups.sort(function (a, b) { return Number(b.year) - Number(a.year); });

const now = env('NEWS_NOW') || new Date().toISOString();
data.updated = now.slice(0, 10);

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('掲載しました: ' + date + ' — ' + text + '（id: ' + id + '）');
