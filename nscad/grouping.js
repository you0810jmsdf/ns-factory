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

/** まだ使われていない新しい groupId（grp1, grp2, …）を返す。穴（holes）にだけ残っている groupId も使われているものとして数える。 */
export function nextGroupId(shapes, holes = []) {
  const used = new Set([...shapes, ...holes].map(groupIdOf).filter(Boolean));
  let n = 1; while (used.has('grp' + n)) n++;
  return 'grp' + n;
}

/* ───── 穴（菱目）もグループの仲間になれる（事業主 2026-11-07「菱目といっしょにグループ化できない」）：穴にも図形と同じ groupId を付ける。
         持ち主の線が穴から遠くても、グループ化した時点で範囲の中にあった穴を入れる。入力は変えない。 ───── */

/** groupIds のどれかに入っている穴の id の一覧。 */
export function holesOfGroups(holes, groupIds) {
  const out = []; for (const h of holes) { const g = groupIdOf(h); if (g && groupIds.has(g)) out.push(h.id); } return out;
}

/** 穴（holeIds）を groupId のグループに入れる。旧グループ（oldGroupIds）の穴も、新しい groupId へ移す（図形を足して作り直したとき）。 */
export function groupHoles(holes, holeIds, groupId, oldGroupIds = new Set()) {
  const ids = new Set(holeIds); let changed = false;
  const out = holes.map(h => { if (!ids.has(h.id) && !oldGroupIds.has(groupIdOf(h))) return h; if (h.groupId === groupId) return h; changed = true; return { ...h, groupId }; });
  return { holes: changed ? out : holes, changed };
}

/** groupIds のグループに入っている穴を、グループから外す。 */
export function ungroupHoles(holes, groupIds) {
  let changed = false;
  const out = holes.map(h => { const g = groupIdOf(h); if (!g || !groupIds.has(g)) return h; changed = true; const { groupId, ...rest } = h; return rest; });
  return { holes: changed ? out : holes, changed };
}

/** expandToGroups に、同じグループの穴も足したもの（クリックでグループ全体を選ぶとき）。 */
export function expandToGroupsWithHoles(shapes, holes, ids) {
  const out = expandToGroups(shapes, ids), groups = new Set();
  for (const s of shapes) if (out.has(s.id)) { const g = groupIdOf(s); if (g) groups.add(g); }
  if (groups.size) for (const id of holesOfGroups(holes, groups)) out.add(id);
  return out;
}
