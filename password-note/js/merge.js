// 同じパスワードのカードの検出と統合（計算だけ。画面・保存・同期・削除の墓標は app.js 側）
//
// 検出: 各カードの「最新のパスワード」が同じものを組にする（空のパスワードは対象外）。
// 統合: 残すカードに、ほかのカードの履歴を日付順に合体する。
//   - 履歴は1行も捨てない（同じ内容の行だけ1行にまとめる）。
//   - サービス名・URL・担当・概要が違えば、履歴に「統合」のメモ行（種別 other）として残す。
//   - 残すカードの URL・担当・概要が空なら、ほかのカードの値で埋める。
//   - 消えるカードの全内容は、残すカードの mergedFrom に控える（金庫の中・暗号化されたまま）。
const EntryMerge = (() => {
  const NOTE_FIELD_MAX = 300;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function clip(s, n) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  // 最新のパスワードが同じ組（2枚以上）。getCreds は app.js の getLatestCreds
  function groups(entries, getCreds) {
    const map = new Map();
    for (const e of entries || []) {
      const c = getCreds(e);
      const pw = c && c.password;
      if (!pw) continue;
      if (!map.has(pw)) map.set(pw, []);
      map.get(pw).push(e);
    }
    return [...map.values()]
      .filter(list => list.length >= 2)
      .sort((a, b) => b.length - a.length || String(a[0].title || '').localeCompare(String(b[0].title || ''), 'ja'));
  }

  function rowKey(h) {
    return [h.date || '', h.type || '', h.username || '', h.password || '', h.note || ''].join('\u0001');
  }

  // entries のうち keepId を残して合体する。戻り値 { merged, removedIds }
  function merge(entries, keepId, ctx) {
    const keep = entries.find(e => e.id === keepId);
    if (!keep) throw new Error('残すカードが見つかりません');
    const others = entries.filter(e => e.id !== keepId);
    if (others.length === 0) throw new Error('統合するカードがありません');
    const nowIso = ctx.now();
    const today = nowIso.slice(0, 10);

    const merged = clone(keep);
    const originals = others.map(clone);

    const seenKeys = new Set();
    const seenIds = new Set();
    const rows = [];
    const addRow = h => {
      if (!h) return null;
      const k = rowKey(h);
      if (seenKeys.has(k)) return null;
      seenKeys.add(k);
      const row = clone(h);
      if (!row.id || seenIds.has(row.id)) row.id = ctx.uuid();
      seenIds.add(row.id);
      rows.push(row);
      return row;
    };
    (keep.history || []).forEach(addRow);

    const noteRows = [];
    for (const o of originals) {
      // 元に戻すために、このカードから足した行のID・埋めた項目・メモ行のIDを控える
      o._undo = { addedRowIds: [], filled: [], noteRowId: '' };
      (o.history || []).forEach(h => { const r = addRow(h); if (r) o._undo.addedRowIds.push(r.id); });
      const diffs = [];
      for (const [field, label] of [['url', 'URL'], ['owner', '担当'], ['description', '説明']]) {
        const mine = String(merged[field] || '').trim();
        const theirs = String(o[field] || '').trim();
        if (!theirs) continue;
        if (!mine) { merged[field] = theirs; o._undo.filled.push(field); }   // 空なら埋める（情報は増えるだけ）
        else if (mine !== theirs) diffs.push(`${label}: ${clip(theirs, NOTE_FIELD_MAX)}`);
      }
      const title = String(o.title || '').trim();
      const titleDiff = title && title !== String(merged.title || '').trim();
      o._undo.noteRowId = ctx.uuid();
      noteRows.push({
        id: o._undo.noteRowId, date: today, type: 'other', username: '', password: '',
        note: `統合：同じパスワードの「${clip(title || '(名称なし)', 80)}」をこのカードに統合しました` +
          (titleDiff || diffs.length ? '。統合前の違い → ' + [titleDiff ? `サービス名: ${clip(title, 80)}` : '', ...diffs].filter(Boolean).join(' ／ ') : '')
      });
    }

    // 日付の古い順（日付なしは先頭）。同じ日付は元の順を保つ
    const indexed = rows.map((r, i) => ({ r, i }));
    indexed.sort((a, b) => String(a.r.date || '').localeCompare(String(b.r.date || '')) || a.i - b.i);
    merged.history = indexed.map(x => x.r).concat(noteRows);

    const created = [keep, ...others].map(e => e.createdAt).filter(Boolean).sort()[0];
    if (created) merged.createdAt = created;
    merged.updatedAt = nowIso;
    merged.mergedFrom = (Array.isArray(keep.mergedFrom) ? clone(keep.mergedFrom) : [])
      .concat(originals.map(o => { const u = o._undo; delete o._undo; return Object.assign(o, { mergedAt: nowIso, addedRowIds: u.addedRowIds, filled: u.filled, noteRowId: u.noteRowId }); }));

    return { merged, removedIds: others.map(e => e.id) };
  }

  const META_KEYS = ['mergedAt', 'addedRowIds', 'filled', 'noteRowId'];

  // 統合済みのカード keepId の控え mergedFrom から removedId を別のカードに戻す。
  // 戻り値 { keep, restored }。keep は統合で足した履歴行・メモ行・埋めた項目を外したカード。
  // 控えに行IDが無い古い統合（このボタンより前）は、履歴はそのまま残し（捨てない）、カードだけ戻す。
  function unmerge(entries, keepId, removedId, ctx) {
    const orig = entries.find(e => e.id === keepId);
    if (!orig) throw new Error('統合したカードが見つかりません');
    const item = (orig.mergedFrom || []).find(o => o.id === removedId);
    if (!item) throw new Error('戻す控えが見つかりません');
    const nowIso = ctx.now();

    const restored = clone(item);
    META_KEYS.forEach(k => delete restored[k]);
    if (entries.some(e => e.id === restored.id)) restored.id = ctx.uuid();
    restored.updatedAt = nowIso;

    const keep = clone(orig);
    const drop = new Set([...(item.addedRowIds || []), item.noteRowId].filter(Boolean));
    keep.history = (keep.history || []).filter(h => !drop.has(h.id));
    for (const f of item.filled || []) {
      if (String(keep[f] || '').trim() === String(item[f] || '').trim()) keep[f] = '';
    }
    keep.mergedFrom = (keep.mergedFrom || []).filter(o => o.id !== removedId);
    if (keep.mergedFrom.length === 0) delete keep.mergedFrom;
    keep.updatedAt = nowIso;
    return { keep, restored };
  }

  return { groups, merge, unmerge };
})();
