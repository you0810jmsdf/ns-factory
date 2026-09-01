#!/usr/bin/env node
/**
 * CLAUDE.md の「直近の作業記録」から古い月を docs/worklog/YYYY-MM.md へ切り出す。
 *
 * CLAUDE.md は Claude Code がこのリポジトリを開くたび全文を読む。放っておくと
 * 作業記録が積み上がって毎セッションのトークンを食う（2026-09-01 に 866行/約38,000
 * トークンまで肥大したのでこの仕組みを作った）。月が変わったらこれを走らせる。
 *
 * 使い方:
 *   node tools/archive_claudemd.js                    ドライラン（何がどこへ移るか出すだけ）
 *   node tools/archive_claudemd.js --apply            実際に書き換える
 *   node tools/archive_claudemd.js --before 2026-09-01 --apply
 *
 *   --before  この日付より前の記録を退避する。省略時は「先月の1日」。
 *             つまり当月と先月は本体に残り、それより古い月が退避される。
 *             月が変わった直後に走らせても直前の1か月分が消えないようにしてある。
 *   --apply   これを付けたときだけファイルを書き換える。既定は必ずドライラン。
 *
 * 触る範囲:
 *   「## 直近の作業記録」ブロックの中の `## YYYY-MM-DD — …` セクションだけ。
 *   ⛔ 恒久ルール / 領域別ノート / 過去の作業記録（索引）には手を出さない。
 *   恒久ルールは日付ではなく主題で引くものなので、退避しても索引に残り続ける。
 *
 * 冪等性:
 *   移したセクションは CLAUDE.md から消えるので、二度目の実行では対象0件になる。
 *   退避先に同じ見出しが既にあればスキップする（手で移した後に走らせても壊れない）。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');
const WORKLOG_DIR = path.join(ROOT, 'docs', 'worklog');

const EOL = '\r\n';
const H_RECENT = '## 直近の作業記録';
const H_NOTES = '## 領域別ノート';
const H_PAST = '## 過去の作業記録';

// ---------------------------------------------------------------- 引数

function parseArgs(argv) {
  const opts = { apply: false, before: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') opts.apply = true;
    else if (a === '--before') opts.before = argv[++i];
    else if (a === '-h' || a === '--help') opts.help = true;
    else throw new Error(`知らない引数です: ${a}`);
  }
  if (opts.before && !/^\d{4}-\d{2}-\d{2}$/.test(opts.before)) {
    throw new Error(`--before は YYYY-MM-DD 形式で指定してください: ${opts.before}`);
  }
  if (!opts.before) {
    // 先月の1日。当月と先月は残す（月初に走らせて直前の記録が消えるのを防ぐ）
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    opts.before = `${y}-${m}-01`;
  }
  return opts;
}

// ---------------------------------------------------------------- 入出力

function readLines(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
}

function writeLines(file, lines) {
  fs.writeFileSync(file, lines.join(EOL), 'utf8');
}

// ---------------------------------------------------------------- 解析

/** 指定の見出しで始まる行の位置。見つからなければ -1。 */
function indexOfHeading(lines, prefix) {
  return lines.findIndex((l) => l.startsWith(prefix));
}

/**
 * 「直近の作業記録」ブロックの範囲を返す。
 * start は見出しの次の行、end は次のセクション見出しの手前（区切り線 `---` は外に置く）。
 */
function recentRange(lines) {
  const head = indexOfHeading(lines, H_RECENT);
  if (head < 0) throw new Error(`見出しが見つかりません: ${H_RECENT}`);

  let next = lines.length;
  for (let i = head + 1; i < lines.length; i++) {
    if (lines[i].startsWith(H_NOTES) || lines[i].startsWith(H_PAST)) { next = i; break; }
  }
  // 次の見出しの手前にある区切り線と空行は、ブロックの外側として残す
  let end = next;
  for (let i = next - 1; i >= head; i--) {
    if (lines[i].trim() === '') continue;
    if (lines[i].trim() === '---') { end = i; continue; }
    break;
  }
  return { head, start: head + 1, end };
}

/** `## YYYY-MM-DD — …` 単位に切る。末尾の空行は落とす。 */
function splitSections(lines) {
  const marks = [];
  lines.forEach((l, i) => { if (/^## /.test(l)) marks.push(i); });

  return marks.map((start, k) => {
    const end = k < marks.length - 1 ? marks[k + 1] - 1 : lines.length - 1;
    let body = lines.slice(start, end + 1);
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    const m = /^## (\d{4}-\d{2}-\d{2})/.exec(body[0]);
    return {
      order: k,
      heading: body[0],
      title: body[0].replace(/^## /, ''),
      date: m ? m[1] : null,
      month: m ? m[1].slice(0, 7) : null,
      text: body.join(EOL),
    };
  });
}

/** 日付降順。同じ日付なら元の並び順を保つ。 */
function byDateDesc(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.order - b.order;
}

// ---------------------------------------------------------------- 退避先

function worklogHeader(month) {
  const [y, m] = month.split('-');
  return [
    `# 作業記録アーカイブ — ${y}年${Number(m)}月`,
    '',
    '> [../../CLAUDE.md](../../CLAUDE.md) から退避した過去の作業記録。',
    '> 恒久的な禁止事項（⛔）は CLAUDE.md 冒頭の「恒久ルール」に索引がある。',
    '> **このファイルは通常セッションでは読み込まない。** 該当箇所を触るときだけ開くこと。',
    '',
    '---',
    '',
  ].join(EOL);
}

/**
 * docs/worklog/YYYY-MM.md へマージする。既存の記録は残し、日付降順に並べ直す。
 * 同じ見出しが既にあるセクションは足さない（冪等）。
 * @returns {{path:string, added:number, skipped:number, total:number, text:string}}
 */
function buildWorklog(month, incoming) {
  const file = path.join(WORKLOG_DIR, `${month}.md`);
  let header = worklogHeader(month);
  let existing = [];

  if (fs.existsSync(file)) {
    const lines = readLines(file);
    const first = lines.findIndex((l) => /^## /.test(l));
    if (first >= 0) {
      header = lines.slice(0, first).join(EOL);
      if (!header.endsWith(EOL)) header += EOL;
      existing = splitSections(lines.slice(first));
    } else {
      header = lines.join(EOL);
    }
  }

  const seen = new Set(existing.map((s) => s.heading));
  const added = [];
  let skipped = 0;
  for (const s of incoming) {
    if (seen.has(s.heading)) { skipped++; continue; }
    seen.add(s.heading);
    added.push(s);
  }

  // 既存はファイル内の並びを、新規は CLAUDE.md での並びを維持したうえで日付降順
  const merged = existing
    .map((s, i) => ({ ...s, order: i }))
    .concat(added.map((s, i) => ({ ...s, order: existing.length + i })))
    .sort(byDateDesc);

  const text = header + merged.map((s) => s.text).join(EOL + EOL) + EOL;
  return { path: file, added: added.length, skipped, total: merged.length, text };
}

// ---------------------------------------------------------------- 索引

/**
 * 「過去の作業記録（アーカイブ）」の索引に、退避した月のブロックを反映する。
 * 既存の月はリストと件数を更新し、新しい月はブロックごと月の降順で差し込む。
 */
function updateIndex(lines, monthSummaries) {
  const pastIdx = indexOfHeading(lines, H_PAST);
  if (pastIdx < 0) throw new Error(`見出しが見つかりません: ${H_PAST}`);

  const out = lines.slice(0, pastIdx);
  const tail = lines.slice(pastIdx);

  // 索引ブロックを「### [..](docs/worklog/YYYY-MM.md)」単位に分解
  const marks = [];
  tail.forEach((l, i) => { if (/^### .*docs\/worklog\/\d{4}-\d{2}\.md/.test(l)) marks.push(i); });

  const lead = tail.slice(0, marks.length ? marks[0] : tail.length);
  const blocks = marks.map((start, k) => {
    const end = k < marks.length - 1 ? marks[k + 1] - 1 : tail.length - 1;
    let body = tail.slice(start, end + 1);
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    const month = /docs\/worklog\/(\d{4}-\d{2})\.md/.exec(body[0])[1];
    return { month, lines: body };
  });

  for (const sum of monthSummaries) {
    const found = blocks.find((b) => b.month === sum.month);
    if (found) {
      // 見出しの件数を更新し、リスト行をマージして日付降順に
      found.lines[0] = found.lines[0].replace(/— \d+件\s*$/, `— ${sum.total}件`);
      const items = found.lines.filter((l) => l.startsWith('- '));
      const others = found.lines.filter((l, i) => i > 0 && !l.startsWith('- ') && l.trim() !== '');
      const incoming = sum.titles.map((t) => `- ${t}`);
      const all = incoming.concat(items.filter((l) => !incoming.includes(l)));
      all.sort((a, b) => {
        const da = /(\d{4}-\d{2}-\d{2})/.exec(a);
        const db = /(\d{4}-\d{2}-\d{2})/.exec(b);
        if (!da || !db || da[1] === db[1]) return 0;
        return da[1] < db[1] ? 1 : -1;
      });
      found.lines = [found.lines[0]].concat(others.length ? others.concat(['']) : ['']).concat(all);
      if (others.length) {
        // 「8月19日まで」のような手書きの但し書きは中身が増えても自動では直せない
        console.warn(`⚠ ${sum.month} の索引に手書きの説明行があります。実態とずれていないか確認してください:`);
        others.forEach((l) => console.warn(`   ${l}`));
      }
    } else {
      const [y, m] = sum.month.split('-');
      blocks.push({
        month: sum.month,
        lines: [
          `### [${y}年${Number(m)}月](docs/worklog/${sum.month}.md) — ${sum.total}件`,
          '',
        ].concat(sum.titles.map((t) => `- ${t}`)),
      });
    }
  }

  blocks.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));

  const rebuilt = lead.concat(
    blocks.flatMap((b, i) => (i === 0 ? b.lines : [''].concat(b.lines)))
  );
  while (rebuilt.length && rebuilt[rebuilt.length - 1].trim() === '') rebuilt.pop();
  return out.concat(rebuilt, ['']);
}

// ---------------------------------------------------------------- 本体

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
    return 0;
  }

  const lines = readLines(CLAUDE_MD);
  const range = recentRange(lines);
  const sections = splitSections(lines.slice(range.start, range.end));

  const undated = sections.filter((s) => !s.date);
  if (undated.length) {
    console.warn(`⚠ 日付が読めないセクションが ${undated.length} 件あります（そのまま残します）:`);
    undated.forEach((s) => console.warn(`   ${s.heading}`));
  }

  const move = sections.filter((s) => s.date && s.date < opts.before).sort(byDateDesc);
  const keep = sections.filter((s) => !(s.date && s.date < opts.before)).sort(byDateDesc);

  console.log(`CLAUDE.md: 直近の作業記録 ${sections.length}件（${lines.length}行）`);
  console.log(`基準日: ${opts.before} より前を退避`);

  if (!move.length) {
    console.log('→ 退避対象はありません。');
    return 0;
  }

  // 月ごとにまとめる
  const months = [...new Set(move.map((s) => s.month))].sort().reverse();
  const summaries = [];
  for (const month of months) {
    const incoming = move.filter((s) => s.month === month);
    const built = buildWorklog(month, incoming);
    summaries.push({ month, built, titles: incoming.map((s) => s.title), total: built.total });
    console.log(`\n■ ${month} → ${path.relative(ROOT, built.path).replace(/\\/g, '/')}`);
    console.log(`   追加 ${built.added}件 / 既にあり ${built.skipped}件 / 退避先の合計 ${built.total}件`);
    incoming.forEach((s) => console.log(`   - ${s.title}`));
  }

  // CLAUDE.md を組み直す
  const oldest = keep.filter((s) => s.date).map((s) => s.date).sort()[0];
  const newHead = oldest
    ? `${H_RECENT}（${oldest} 以降）`
    : lines[range.head];

  const kept = keep.map((s) => s.text).join(EOL + EOL);
  let rebuilt = lines
    .slice(0, range.head)
    .concat([newHead, ''])
    .concat(kept ? kept.split(EOL).concat(['']) : [])
    .concat(lines.slice(range.end));

  rebuilt = updateIndex(rebuilt, summaries.map((s) => ({ month: s.month, titles: s.titles, total: s.total })));

  console.log(`\nCLAUDE.md: ${lines.length}行 → ${rebuilt.length}行`);

  if (!opts.apply) {
    console.log('\n[ドライラン] ファイルは変更していません。--apply を付けると書き換えます。');
    return 0;
  }

  if (!fs.existsSync(WORKLOG_DIR)) fs.mkdirSync(WORKLOG_DIR, { recursive: true });
  for (const s of summaries) fs.writeFileSync(s.built.path, s.built.text, 'utf8');
  writeLines(CLAUDE_MD, rebuilt);
  console.log('\n書き換えました。git diff で確認してからコミットしてください。');
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error(`エラー: ${err.message}`);
  process.exit(1);
}
