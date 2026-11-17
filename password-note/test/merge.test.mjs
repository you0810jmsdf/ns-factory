// 同じパスワードのカードの検出と統合（merge.js）の試験。ダミー値のみ。
// 実行: node --test password-note/test/merge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../js/merge.js', import.meta.url), 'utf8');
const RawMerge = vm.runInNewContext(src + '\n;EntryMerge', {});
// vm 内で作られた配列は deepStrictEqual で型が違うと見なされるので、結果は通常のオブジェクトに直して比べる
const plain = v => JSON.parse(JSON.stringify(v));
const EntryMerge = {
  groups: (...a) => plain(RawMerge.groups(...a)),
  merge: (...a) => plain(RawMerge.merge(...a)),
  unmerge: (...a) => plain(RawMerge.unmerge(...a)),
};

// app.js の getLatestCreds と同じ（初期設定・変更・作成・更新のうち日付が最新の行）
function getLatestCreds(entry) {
  return [...(entry.history || [])]
    .filter(h => ['initial', 'change', 'create', 'update'].includes(h.type))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}

let n = 0;
const ctx = { now: () => '2026-11-17T12:00:00.000Z', uuid: () => 'new-' + (++n) };
const row = (id, date, type, username, password, note = '') => ({ id, date, type, username, password, note });

const A = {
  id: 'a', type: 'website', title: 'Google', owner: '', url: 'https://example.test/g', description: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
  history: [row('h1', '2026-01-01', 'initial', 'me@example.test', 'PW-SAME'), row('h2', '2026-03-01', 'other', '', '', '2段階認証あり')]
};
const B = {
  id: 'b', type: 'service', title: 'YouTube 家族アルバム', owner: '父', url: 'https://example.test/y', description: '家族用',
  createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-11-17T00:00:00.000Z',
  history: [row('h1', '2026-02-01', 'initial', 'me@example.test', 'PW-OLD'), row('h9', '2026-11-10', 'change', 'me@example.test', 'PW-SAME', '変更')]
};
const C = { id: 'c', title: 'Other', history: [row('x', '2026-01-01', 'initial', 'u', 'PW-DIFF')] };
const D = { id: 'd', title: 'NoPw', history: [row('y', '2026-01-01', 'initial', 'u', '')] };

test('最新のパスワードが同じ組だけを返す（空・古い履歴だけ一致は除く）', () => {
  const g = EntryMerge.groups([A, B, C, D], getLatestCreds);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].map(e => e.id).sort(), ['a', 'b']);
});

test('1枚だけ・パスワードなしでは組にならない', () => {
  assert.equal(EntryMerge.groups([C, D], getLatestCreds).length, 0);
  assert.equal(EntryMerge.groups([], getLatestCreds).length, 0);
});

test('合体: 履歴は1行も捨てず、日付順に並び、最新のパスワードが保たれる', () => {
  const { merged, removedIds } = EntryMerge.merge([A, B], 'a', ctx);
  assert.deepEqual(removedIds, ['b']);
  assert.equal(merged.id, 'a');
  assert.equal(merged.title, 'Google');
  const pws = merged.history.filter(h => h.password).map(h => h.password);
  assert.deepEqual(pws, ['PW-SAME', 'PW-OLD', 'PW-SAME']);      // 日付順（1/1, 2/1, 11/10）
  assert.equal(getLatestCreds(merged).password, 'PW-SAME');
  assert.ok(merged.history.some(h => h.note === '2段階認証あり'));
  // 元 2 + 3(重複なし) + 統合メモ 1
  assert.equal(merged.history.length, 2 + 2 + 1);
});

test('同じ id の履歴行は別の id に振り直す（衝突しない）', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  const ids = merged.history.map(h => h.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('同じ内容の履歴行は1行にまとめる', () => {
  const X = { id: 'x1', title: 'X', history: [row('p', '2026-05-01', 'initial', 'u', 'PW-SAME')] };
  const Y = { id: 'y1', title: 'Y', history: [row('q', '2026-05-01', 'initial', 'u', 'PW-SAME')] };
  const { merged } = EntryMerge.merge([X, Y], 'x1', ctx);
  assert.equal(merged.history.filter(h => h.type === 'initial').length, 1);
});

test('空欄は埋め、違う値は統合メモに残す', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  assert.equal(merged.owner, '父');                    // 空だったので埋めた
  assert.equal(merged.description, '家族用');          // 同上
  assert.equal(merged.url, 'https://example.test/g');  // 残すカードの値を優先
  const memo = merged.history.find(h => h.type === 'other' && h.note.startsWith('統合：'));
  assert.ok(memo.note.includes('YouTube 家族アルバム'));
  assert.ok(memo.note.includes('URL: https://example.test/y'));
  assert.ok(!memo.note.includes('PW-'));               // パスワードはメモに書かない
  assert.equal(memo.password, '');
});

test('消えるカードの全内容を mergedFrom に控える（元の履歴・パスワードごと）', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  assert.equal(merged.mergedFrom.length, 1);
  assert.equal(merged.mergedFrom[0].id, 'b');
  assert.equal(merged.mergedFrom[0].title, 'YouTube 家族アルバム');
  assert.equal(merged.mergedFrom[0].history.length, 2);
  assert.equal(merged.mergedFrom[0].mergedAt, '2026-11-17T12:00:00.000Z');
});

test('作成日は最も古いもの・更新日は今', () => {
  const { merged } = EntryMerge.merge([A, B], 'b', ctx);
  assert.equal(merged.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(merged.updatedAt, '2026-11-17T12:00:00.000Z');
  assert.equal(merged.id, 'b');
});

test('3枚の統合・入力は書き換えない', () => {
  const Z = { id: 'z', title: 'Z', history: [row('z1', '2026-08-01', 'initial', 'u', 'PW-SAME')] };
  const before = JSON.stringify([A, B, Z]);
  const { merged, removedIds } = EntryMerge.merge([A, B, Z], 'a', ctx);
  assert.deepEqual(removedIds.sort(), ['b', 'z']);
  assert.equal(merged.mergedFrom.length, 2);
  assert.equal(JSON.stringify([A, B, Z]), before);
});

test('すでに統合したカードへさらに統合しても過去の控えが残る', () => {
  const first = EntryMerge.merge([A, B], 'a', ctx).merged;
  const Z = { id: 'z', title: 'Z', history: [row('z1', '2026-08-01', 'initial', 'u', 'PW-SAME')] };
  const second = EntryMerge.merge([first, Z], 'a', ctx).merged;
  assert.deepEqual(second.mergedFrom.map(o => o.id), ['b', 'z']);
});

test('残すカードが無い・相手が無いときは例外', () => {
  assert.throws(() => EntryMerge.merge([A, B], 'nope', ctx));
  assert.throws(() => EntryMerge.merge([A], 'a', ctx));
});

test('元に戻す: 統合で足した行・メモ行・埋めた項目が外れ、相手が別カードに戻る', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  const { keep, restored } = EntryMerge.unmerge([merged], 'a', 'b', ctx);
  assert.deepEqual(keep.history, A.history);           // 統合前のAの履歴と同じ
  assert.equal(keep.owner, '');                        // 統合で埋めた担当は空に戻る
  assert.equal(keep.description, '');
  assert.equal(keep.mergedFrom, undefined);
  assert.equal(restored.id, 'b');
  assert.deepEqual(restored.history, B.history);       // Bの履歴は丸ごと戻る（パスワード行も）
  assert.equal(restored.owner, '父');
  assert.equal(restored.mergedAt, undefined);          // 控えの印は残らない
  assert.equal(restored.addedRowIds, undefined);
  assert.equal(restored.updatedAt, ctx.now());
});

test('元に戻す: 同じ内容でまとめられた行は残すカードの元の行なので外さない', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  // B の h1 は A の h1 と中身が違うので追加、A にある行は重複しない。ここでは同内容の行を持つ C を使う
  const C2 = { id: 'c2', title: 'A2', history: [row('q', '2026-01-01', 'initial', 'me@example.test', 'PW-SAME')] };
  const m2 = EntryMerge.merge([A, C2], 'a', ctx).merged;
  const { keep, restored } = EntryMerge.unmerge([m2], 'a', 'c2', ctx);
  assert.deepEqual(keep.history, A.history);
  assert.equal(restored.history.length, 1);
});

test('元に戻す: 3枚統合から1枚だけ戻しても、残りの控えは残る', () => {
  const Z = { id: 'z', title: 'Z', history: [row('z1', '2026-08-01', 'initial', 'u', 'PW-SAME')] };
  const { merged } = EntryMerge.merge([A, B, Z], 'a', ctx);
  const { keep, restored } = EntryMerge.unmerge([merged], 'a', 'z', ctx);
  assert.deepEqual(keep.mergedFrom.map(o => o.id), ['b']);
  assert.equal(restored.id, 'z');
  assert.equal(keep.history.some(h => h.id === 'z1'), false);
  assert.equal(keep.history.some(h => h.id === 'h9'), true);   // B から足した行は残る
});

test('元に戻す: 同じIDのカードが既にあれば新しいIDで戻す', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  const { restored } = EntryMerge.unmerge([merged, { id: 'b', title: 'new b', history: [] }], 'a', 'b', ctx);
  assert.notEqual(restored.id, 'b');
});

test('元に戻す: 行IDの控えが無い古い統合でも履歴は捨てずにカードだけ戻す', () => {
  const { merged } = EntryMerge.merge([A, B], 'a', ctx);
  merged.mergedFrom.forEach(o => { delete o.addedRowIds; delete o.noteRowId; delete o.filled; });
  const { keep, restored } = EntryMerge.unmerge([merged], 'a', 'b', ctx);
  assert.equal(keep.history.length, merged.history.length);
  assert.equal(restored.id, 'b');
});

test('元に戻す: 控えが無ければ例外', () => {
  assert.throws(() => EntryMerge.unmerge([A], 'a', 'b', ctx));
  assert.throws(() => EntryMerge.unmerge([A], 'nope', 'b', ctx));
});
