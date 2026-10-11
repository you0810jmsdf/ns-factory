// グループ化：図形の `groupId`（同じ値の図形が1つのグループ）を扱う純関数。入力は変えない。
// 選ぶ・動かす・変形するときは、グループ全体が1つの図形のように扱われる（中の1つを直すときはダブルクリックで選ぶ）。

/** 図形の groupId。無ければ null。 */
export const groupIdOf = s => (typeof s?.groupId === 'string' && s.groupId ? s.groupId : null);

/** 選んだ id の集合に、同じグループの図形をすべて足した新しい集合を返す。 */
export function expandToGroups(shapes, ids) {
  const groups = new Set();
  for (const s of shapes) if (ids.has(s.id)) { const g = groupIdOf(s); if (g) groups.add(g); }
  const out = new Set(ids);
  if (groups.size) for (const s of shapes) if (groups.has(groupIdOf(s))) out.add(s.id);
  return out;
}

/** 選んだ図形（すでにグループなら、そのグループ全体）を、新しい groupId でまとめる。2つ未満なら何もしない。 */
export function groupShapes(shapes, ids, groupId) {
  const all = expandToGroups(shapes, ids);
  if (all.size < 2) return { shapes, changed: false, groupId: null };
  return { shapes: shapes.map(s => all.has(s.id) ? { ...s, groupId } : s), changed: true, groupId };
}

/** 選んだ図形が属するグループを、すべて解除する。 */
export function ungroupShapes(shapes, ids) {
  const all = expandToGroups(shapes, ids);
  let changed = false;
  const out = shapes.map(s => { if (!all.has(s.id) || !groupIdOf(s)) return s; changed = true; const { groupId, ...rest } = s; return rest; });
  return { shapes: changed ? out : shapes, changed };
}

/** 複製・貼り付けで増やした図形の groupId を、グループごとに新しい値へ振り替える（元のグループとつながらないように）。newId() は新しい groupId を返す関数。 */
export function remapGroupIds(shapes, newId) {
  const map = new Map();
  return shapes.map(s => { const g = groupIdOf(s); if (!g) return s; if (!map.has(g)) map.set(g, newId()); return { ...s, groupId: map.get(g) }; });
}

/** まだ使われていない新しい groupId（grp1, grp2, …）を返す。 */
export function nextGroupId(shapes) {
  const used = new Set(shapes.map(groupIdOf).filter(Boolean));
  let n = 1; while (used.has('grp' + n)) n++;
  return 'grp' + n;
}
