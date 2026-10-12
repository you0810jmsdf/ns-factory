// 金具の寸法を事業主がブラウザで直して保存する（この PC だけ・公開データは CSV 経由）。純粋関数。画面は app.js。
// 保存の形：{ v: 1, specs: { [id]: { parent?, names?, plate?, rings?: { options: [...] }, rivets? } } }
//   既にある規格・製品の id なら上書き、無い id は「新しい製品」（parent の写しから始める）。
import { ringSizeOf } from './hardware.js';

export const BINDER_EDITS_KEY = 'leather-cad.binderEdits';
const clone = v => JSON.parse(JSON.stringify(v));
const round1 = v => Math.round(v * 10) / 10;

export function emptyEdits() { return { v: 1, specs: {} }; }

/** 保存文字列を読み戻す。壊れていれば null。 */
export function parseEdits(text) {
  let j; try { j = JSON.parse(text); } catch { return null; }
  if (!j || j.v !== 1 || !j.specs || typeof j.specs !== 'object' || Array.isArray(j.specs)) return null;
  for (const [id, e] of Object.entries(j.specs)) if (!/^[a-zA-Z0-9_-]+$/.test(id) || !e || typeof e !== 'object') return null;
  return j;
}
export function serializeEdits(edits) { return JSON.stringify(edits); }

/** 元の金具データ（配列）に、直した値を重ねた新しい配列を返す。元は変えない。直した規格・製品には edited: true が付く。 */
export function applyBinderEdits(specs, edits) {
  const out = specs.map(clone);
  for (const [id, e] of Object.entries(edits?.specs || {})) {
    let s = out.find(x => x.id === id);
    if (!s) {
      const parent = out.find(x => x.id === e.parent && !x.parent); if (!parent) continue;   // 親が無い製品は無視（データが消えたとき）
      s = clone(parent); s.id = id; s.parent = parent.id; s.names = { ja: id, en: id, aliases: [] }; s.sourceNote = null; s.sources = []; delete s.drawings; out.push(s);
    }
    if (e.names) s.names = { ...s.names, ...e.names };
    if (e.plate) {
      s.plate = { ...s.plate, ...e.plate };
      if (s.base) { const m = { lengthMm: 'lengthMm', widthMm: 'sectionWidthMm', thicknessMm: 'thicknessMm', cornerRMm: 'cornerRMm' }; for (const [k, b] of Object.entries(m)) if (e.plate[k] != null) s.base[b] = e.plate[k]; }
    }
    if (e.rings?.options) {
      const options = e.rings.options.map(clone);
      s.rings = { ...s.rings, options, diameterOptionsMm: options.map(o => round1(ringSizeOf(null, o).inner)) };
    }
    if (e.rivets) s.rivets = clone(e.rivets);
    s.edited = true;
  }
  return out;
}

/** 画面の入力を保存用の上書きにする（検算つき）。だめなら Error（message はエラーの種類：plate / name / rings / ring / dup / mount）。
 *  form = { parent?, names?: { ja, en }, plate: { lengthMm, widthMm, thicknessMm, cornerRMm, confidence }, rings: [{ innerDiameterMm, outerDiameterMm?, wireDiameterMm?, embedDepthMm?, confidence? }], rivets: [{ xMm, yMm, dMm }] } */
export function editFromForm(form) {
  const num = v => (v === '' || v == null) ? null : Number(v), pos = v => Number.isFinite(v) && v > 0, fin = v => Number.isFinite(v);
  const p = form.plate || {}, plate = { lengthMm: num(p.lengthMm), widthMm: num(p.widthMm), thicknessMm: num(p.thicknessMm), cornerRMm: num(p.cornerRMm) ?? 0 };
  if (!pos(plate.lengthMm) || !pos(plate.widthMm) || !pos(plate.thicknessMm) || !(fin(plate.cornerRMm) && plate.cornerRMm >= 0)) throw new Error('plate');
  if (['measured', 'spec', 'estimated'].includes(p.confidence)) plate.confidence = p.confidence;
  const out = { plate };
  if (form.parent) { out.parent = form.parent; const ja = String(form.names?.ja || '').trim(); if (!ja) throw new Error('name'); out.names = { ja, en: String(form.names?.en || '').trim() || ja }; }
  else if (form.names?.ja) out.names = { ja: String(form.names.ja).trim(), en: String(form.names.en || form.names.ja).trim() };
  const rings = (form.rings || []).filter(r => r && !(r.innerDiameterMm === '' && (r.outerDiameterMm ?? '') === '')), seen = new Set();
  if (!rings.length) throw new Error('rings');
  out.rings = { options: rings.map(r => {
    const o = {}; const i = num(r.innerDiameterMm), oo = num(r.outerDiameterMm), w = num(r.wireDiameterMm), em = num(r.embedDepthMm);
    if (i != null) { if (!pos(i)) throw new Error('ring'); o.innerDiameterMm = i; }
    if (oo != null) { if (!pos(oo) || (i != null && oo <= i)) throw new Error('ring'); o.outerDiameterMm = oo; }
    if (w != null) { if (!pos(w)) throw new Error('ring'); o.wireDiameterMm = w; }
    if (i == null && oo == null) throw new Error('ring');
    if (em != null) { if (!(fin(em) && em >= 0)) throw new Error('ring'); o.embedDepthMm = em; }
    if (['measured', 'spec', 'estimated'].includes(r.confidence)) o.confidence = r.confidence;
    const size = ringSizeOf(null, o), key = round1(size.inner); if (seen.has(key)) throw new Error('dup'); seen.add(key);
    return o;
  }) };
  out.rivets = (form.rivets || []).filter(m => m && !(m.xMm === '' && m.yMm === '' && m.dMm === '')).map(m => { const x = num(m.xMm) ?? 0, y = num(m.yMm) ?? 0, d = num(m.dMm); if (!fin(x) || !fin(y) || !pos(d)) throw new Error('mount'); return { xMm: x, yMm: y, dMm: d }; });
  return out;
}

/** 直した値だけを CSV の行にする（tools/import_binder_csv.js で取り込める列名）。製品の親の行（id だけ）も入れる。 */
export function editsToCsv(applied, edits) {
  const ids = Object.keys(edits?.specs || {}).filter(id => applied.some(s => s.id === id)); if (!ids.length) return null;
  const enc = v => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }, row = a => a.map(enc).join(',');
  const specs = ['id,parent,name_ja,name_en,base_length_mm,base_section_width_mm,base_thickness_mm,base_corner_r_mm,conf_base'], rings = ['spec_id,ring_inner_mm,ring_outer_mm,ring_wire_mm,wire_source,ring_embed_mm,conf_ring'], parts = ['spec_id,part_kind,x_mm,y_mm,diameter_mm,mount_kind'];
  const parents = new Set();
  for (const id of ids) {
    const s = applied.find(x => x.id === id), p = s.plate || {};
    if (s.parent && !ids.includes(s.parent)) parents.add(s.parent);
    specs.push(row([s.id, s.parent || '', s.names.ja, s.names.en, p.lengthMm, p.widthMm, p.thicknessMm, p.cornerRMm, p.confidence || '']));
    for (const o of s.rings.options || []) { const size = ringSizeOf(s, o); rings.push(row([s.id, size.inner, size.outer, size.wire, size.wireSource, o.embedDepthMm ?? '', o.confidence || ''])); }
    for (const r of s.rivets || []) parts.push(row([s.id, 'mount', r.xMm, r.yMm, r.dMm, 'rivet']));
  }
  for (const pid of parents) specs.splice(1, 0, row([pid, '', '', '', '', '', '', '', '']));   // 親の規格は id だけ（既存の値のまま）
  return { 'binder_specs.csv': specs.join('\n') + '\n', 'binder_rings.csv': rings.join('\n') + '\n', 'binder_parts.csv': parts.join('\n') + '\n' };
}

/** 新しい製品の id：親の id + "-p" + 番号（使われていないもの）。 */
export function newProductId(specs, parentId) { let n = 1; while (specs.some(s => s.id === `${parentId}-p${n}`)) n++; return `${parentId}-p${n}`; }
