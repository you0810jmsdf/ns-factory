// 金具の寸法を事業主がブラウザで直して保存する（この PC だけ・公開データは CSV 経由）。純粋関数。画面は app.js。
// 保存の形：{ v: 1, specs: { [id]: { parent?, names?, plate?, refill?: { wMm, hMm }, rings?: { options: [...] }, rivets? } } }
//   既にある規格・製品の id なら上書き、無い id は「新しい製品」（parent の写しから始める）。
import { ringSizeOf, binderBase } from './hardware.js';
import { cleanShopUrl } from './buy.js';

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

/** 2026-11-08 より前の不具合の跡（事業主 2026-11-09「リングアームの間隔がおかしい」）：アームの欄を触らずに保存しただけで、A5 の 19/19/70/19/19 が「中央の間隔 70 ずつ」の等間隔に書き換わって残っていた。
 *  元の並び cur が等間隔でなく、保存された並び saved が「本数が同じで、間隔がぜんぶ元の中央の間隔」なら、その保存はこの不具合の跡。使わずに、元の並びのままにする（正しい並びは後方幕僚の規格図鑑どおり：A5・A5 Slim は 19/19/70/19/19）。 */
export function isEqualizedByOldBug(cur, saved) {
  const c = cur?.pitchMm, sv = saved?.pitchMm, mid = Number(cur?.centerPitchMm);
  if (!Array.isArray(c) || !Array.isArray(sv) || c.length < 2 || sv.length !== c.length || cur.count !== saved.count || !(mid > 0)) return false;
  return new Set(c.map(Number)).size > 1 && sv.every(x => Number(x) === mid);
}
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
    if (e.armsFrom) { const src = specs.find(x => x.id === e.armsFrom && !x.parent); if (src) { s.holes = clone(src.holes); s.rings = clone(src.rings); s.armsFrom = e.armsFrom; } }   /* アームの規格を借りる（知らない規格なら親のまま・2026-11-04） */
    if (e.plate) {
      /* 台座の幅を直したら、開閉部品（レバー）の台座をまたぐ向きの長さ（lengthMm）も同じ割合で伸縮する（事業主 2026-11-04「リング幅変えたら、レバーも幅を合わせてほしい」） */
      const w0 = Number(s.base?.sectionWidthMm ?? s.plate?.widthMm); if (e.plate.widthMm != null && w0 > 0 && Math.abs(w0 - e.plate.widthMm) > 1e-9 && Array.isArray(s.mechanism?.parts)) { const k = e.plate.widthMm / w0; s.mechanism = { ...s.mechanism, parts: s.mechanism.parts.map(q => (Number(q.lengthMm) > 0 ? { ...q, lengthMm: round1(q.lengthMm * k) } : q)) }; }
      s.plate = { ...s.plate, ...e.plate };
      if (s.base) { const m = { lengthMm: 'lengthMm', widthMm: 'sectionWidthMm', thicknessMm: 'thicknessMm', cornerRMm: 'cornerRMm' }; for (const [k, b] of Object.entries(m)) if (e.plate[k] != null) s.base[b] = e.plate[k]; }
      /* 実測の断面（sectionPoints）がある規格で幅を直したときは、断面の点を中心から横に同じ割合で伸縮して新しい幅に合わせる（形は保つ）。そうしないと平面図の台座だけ変わり、断面の台座は実測の幅のままになる（事業主 2026-11-04「台座の幅が反映されません」） */
      if (e.plate.widthMm != null && Array.isArray(s.base?.sectionPoints) && s.base.sectionPoints.length >= 2) { const xs = s.base.sectionPoints.map(q => q.x), lo = Math.min(...xs), hi = Math.max(...xs), w0 = hi - lo; if (w0 > 0 && Math.abs(w0 - e.plate.widthMm) > 1e-9) { const cx = (lo + hi) / 2, k = e.plate.widthMm / w0; s.base.sectionPoints = s.base.sectionPoints.map(q => ({ ...q, x: Math.round((cx + (q.x - cx) * k) * 1000) / 1000 })); } }
    }
    /* リフィルの大きさ（事業主 2026-11-09「A5_standard は標準の A5 リフィルとして扱う」：新しい製品は親の写しから始まるので、A5 Slim（110×210）を親にすると、リフィルも 110×210 を引き継いでいた）。リング規格（穴・台座・リング径）とは別に、製品ごとに持てる */
    if (e.refill) s.refill = { ...(s.refill || {}), wMm: e.refill.wMm, hMm: e.refill.hMm };
    if (e.rings?.options) {
      const options = e.rings.options.map(clone);
      s.rings = { ...s.rings, options, diameterOptionsMm: options.map(o => round1(ringSizeOf(null, o).inner)) };
    }
    if (e.rivets) s.rivets = clone(e.rivets);
    /* レバー（事業主 2026-11-08「レバーはバインダ金具の両端にあるべきもの」）：台座の両端に1つずつ、端にぴったり付ける（Mini6・M5 の実測と同じ：中心 ＝ 長さの半分 ＋ レバーの長さの半分）。台座の長さを直しても追従する。ボタンなど、ほかの開閉部品は残す。null ならレバーを外す */
    if (e.lever !== undefined) {
      const keep = (s.mechanism?.parts || []).filter(q => q.kind !== 'lever');
      if (e.lever) {
        const b = binderBase(s), lv = e.lever, w = lv.widthMm, l = lv.lengthMm ?? b.sectionWidthMm, at = Math.round((b.lengthMm / 2 + w / 2) * 100) / 100;
        const mk = sign => ({ xMm: sign * at, yMm: 0, widthMm: w, lengthMm: l, heightMm: lv.heightMm, diameterMm: null, kind: 'lever', note: 'この PC で直した値（台座の両端）', cornerOuterRMm: lv.cornerOuterRMm || null, cornerInnerRMm: lv.cornerInnerRMm || null });
        s.mechanism = { ...(s.mechanism || {}), parts: [mk(-1), mk(1), ...keep] };
      } else s.mechanism = { ...(s.mechanism || {}), parts: keep };
    }
    if (e.holes && !isEqualizedByOldBug(s.holes, e.holes)) { s.holes = { ...s.holes, ...clone(e.holes) }; s.rings = { ...s.rings, countPerSide: e.holes.count }; }   /* アームの本数・間隔（2026-11-04）。古い不具合で 70 ずつに書き換わった保存は使わない */
    s.edited = true;
  }
  return out;
}

/** 画面の入力を保存用の上書きにする（検算つき）。だめなら Error（message はエラーの種類：plate / name / rings / ring / ringUrl / dup / mount / lever / refill）。
 *  form = { parent?, names?: { ja, en }, plate: { lengthMm, widthMm, thicknessMm, cornerRMm, confidence }, rings: [{ innerDiameterMm, outerDiameterMm?, wireDiameterMm?, embedDepthMm?, confidence? }], rivets: [{ xMm, yMm, dMm }], arms?: { count, pitchMm }, refill?: { wMm, hMm }（リフィルの大きさ。無ければ触らない）, lever?: { widthMm, lengthMm?, heightMm, cornerOuterRMm?, cornerInnerRMm? }（レバー。台座の両端に1つずつ・無ければ触らない・全部空欄ならレバーなし） }
 *  keepHoles（2026-11-08）：アームの欄を触っていないときに残す今の holes（本数・間隔の並び）。arms が無いときだけ使う。
 *  arms（事業主決定A 2026-11-04：金具＝土台（ブランドごと）＋アーム（規格ごと））：本数と間隔。空欄なら触らない。入れると holes（count・pitchMm・centerPitchMm・span1toLastMm）と rings.countPerSide を上書きする
 *  armsFrom（2026-11-04 改善案1）：アームの規格を別の規格から借りる（その規格の holes と rings をそのまま写す）。借りるときは rings・arms の欄は要らない（無視する） */
export function editFromForm(form) {
  const num = v => (v === '' || v == null) ? null : Number(v), pos = v => Number.isFinite(v) && v > 0, fin = v => Number.isFinite(v);
  const p = form.plate || {}, plate = { lengthMm: num(p.lengthMm), widthMm: num(p.widthMm), thicknessMm: num(p.thicknessMm), cornerRMm: num(p.cornerRMm) ?? 0 };
  if (!pos(plate.lengthMm) || !pos(plate.widthMm) || !pos(plate.thicknessMm) || !(fin(plate.cornerRMm) && plate.cornerRMm >= 0)) throw new Error('plate');
  if (['measured', 'spec', 'estimated'].includes(p.confidence)) plate.confidence = p.confidence;
  const out = { plate };
  if (form.parent) { out.parent = form.parent; const ja = String(form.names?.ja || '').trim(); if (!ja) throw new Error('name'); out.names = { ja, en: String(form.names?.en || '').trim() || ja }; }
  else if (form.names?.ja) out.names = { ja: String(form.names.ja).trim(), en: String(form.names.en || form.names.ja).trim() };
  if (form.lever !== undefined) {   /* レバー：form.lever が無ければ触らない・全部空欄ならレバーなし（null）・長さと高さが正の数なら両端に付ける（lengthMm 空欄＝台座の幅・角R 空欄＝0） */
    const lv = form.lever || {}, w = num(lv.widthMm), l = num(lv.lengthMm), h = num(lv.heightMm), ro = num(lv.cornerOuterRMm), ri = num(lv.cornerInnerRMm);
    if (w == null && l == null && h == null && ro == null && ri == null) out.lever = null;
    else {
      if (!pos(w) || !pos(h) || (l != null && !pos(l)) || (ro != null && !(fin(ro) && ro >= 0)) || (ri != null && !(fin(ri) && ri >= 0))) throw new Error('lever');
      out.lever = { widthMm: w, lengthMm: l, heightMm: h, cornerOuterRMm: ro ?? 0, cornerInnerRMm: ri ?? 0 };
    }
  }
  if (form.refill) {   /* リフィルの大きさ：form.refill が無ければ触らない。幅・高さが正の数でなければエラー（refill） */
    const w = num(form.refill.wMm), h = num(form.refill.hMm); if (!pos(w) || !pos(h)) throw new Error('refill'); out.refill = { wMm: w, hMm: h };
  }
  const armsFrom = typeof form.armsFrom === 'string' && /^[a-zA-Z0-9_-]+$/.test(form.armsFrom) ? form.armsFrom : '';
  if (armsFrom) {   /* アームは借りる：リングも本数・間隔も、借りた規格のもの */
    out.armsFrom = armsFrom;
    out.rivets = (form.rivets || []).filter(m => m && !(m.xMm === '' && m.yMm === '' && m.dMm === '')).map(m => { const x = num(m.xMm) ?? 0, y = num(m.yMm) ?? 0, d = num(m.dMm); if (!fin(x) || !fin(y) || !pos(d)) throw new Error('mount'); return { xMm: x, yMm: y, dMm: d }; });
    return out;
  }
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
    const shop = String(r.shopName ?? '').trim().slice(0, 60), url = cleanShopUrl(r.shopUrl);   /* 購入先（店名・商品ページの URL）：どこで売っているかを残す。URL は http・https だけ */
    if (url === null) throw new Error('ringUrl'); if (shop) o.shopName = shop; if (url) o.shopUrl = url;
    const size = ringSizeOf(null, o), key = round1(size.inner); if (seen.has(key)) throw new Error('dup'); seen.add(key);
    return o;
  }) };
  out.rivets = (form.rivets || []).filter(m => m && !(m.xMm === '' && m.yMm === '' && m.dMm === '')).map(m => { const x = num(m.xMm) ?? 0, y = num(m.yMm) ?? 0, d = num(m.dMm); if (!fin(x) || !fin(y) || !pos(d)) throw new Error('mount'); return { xMm: x, yMm: y, dMm: d }; });
  const ac = num(form.arms?.count), ap = num(form.arms?.pitchMm);
  if (ac != null) {
    if (!(Number.isInteger(ac) && ac >= 1) || (ac > 1 && !pos(ap))) throw new Error('arms');
    const pitch = ac > 1 ? ap : 0; out.holes = { count: ac, pitchMm: Array.from({ length: ac - 1 }, () => pitch), centerPitchMm: pitch, span1toLastMm: round1(pitch * (ac - 1)) }; out.rings.countPerSide = ac;
  } else if (form.keepHoles && Number.isInteger(form.keepHoles.count) && Array.isArray(form.keepHoles.pitchMm)) {   /* アームの欄を触っていないとき：今のアームの形（19/19/70/19/19 のような等間隔でない並びも）をそのまま残す。欄の値（中央の間隔）で作り直さない */
    out.holes = clone(form.keepHoles); out.rings.countPerSide = form.keepHoles.count;
  }
  return out;
}

/** 直した値だけを CSV の行にする（tools/import_binder_csv.js で取り込める列名）。製品の親の行（id だけ）も入れる。 */
export function editsToCsv(applied, edits) {
  const ids = Object.keys(edits?.specs || {}).filter(id => applied.some(s => s.id === id)); if (!ids.length) return null;
  const enc = v => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }, row = a => a.map(enc).join(',');
  const specs = ['id,parent,name_ja,name_en,base_length_mm,base_section_width_mm,base_thickness_mm,base_corner_r_mm,conf_base,ring_count,ring_pitch_mm,ring_span_mm,ring_center_pitch_mm,refill_w_mm,refill_h_mm'], rings = ['spec_id,ring_inner_mm,ring_outer_mm,ring_wire_mm,wire_source,ring_embed_mm,conf_ring,ring_shop,ring_url'], parts = ['spec_id,part_kind,x_mm,y_mm,diameter_mm,mount_kind,width_mm,length_mm,height_mm,corner_outer_r_mm,corner_inner_r_mm'];
  const parents = new Set();
  for (const id of ids) {
    const s = applied.find(x => x.id === id), p = s.plate || {};
    if (s.parent && !ids.includes(s.parent)) parents.add(s.parent);
    const ed = edits.specs[id]; specs.push(row([s.id, s.parent || '', s.names.ja, s.names.en, p.lengthMm, p.widthMm, p.thicknessMm, p.cornerRMm, p.confidence || '', ed?.holes || ed?.armsFrom ? s.holes.count : '', ed?.holes || ed?.armsFrom ? s.holes.pitchMm.join(';') : '', ed?.holes || ed?.armsFrom ? s.holes.span1toLastMm ?? '' : '', ed?.holes || ed?.armsFrom ? s.holes.centerPitchMm ?? '' : '', ed?.refill ? s.refill?.wMm ?? '' : '', ed?.refill ? s.refill?.hMm ?? '' : '']));   /* アームの本数・間隔（と、最初から最後までの距離・中央の間隔）は、直したか借りたときだけ出す */
    for (const o of s.rings.options || []) { const size = ringSizeOf(s, o); rings.push(row([s.id, size.inner, size.outer, size.wire, size.wireSource, o.embedDepthMm ?? '', o.confidence || '', o.shopName || '', o.shopUrl || ''])); }
    for (const r of s.rivets || []) parts.push(row([s.id, 'mount', r.xMm, r.yMm, r.dMm, 'rivet', '', '', '', '', '']));
    for (const q of s.mechanism?.parts || []) parts.push(row([s.id, q.kind === 'button' ? 'button' : 'lever', q.xMm, q.yMm, q.diameterMm ?? '', '', q.widthMm ?? '', q.lengthMm ?? '', q.heightMm ?? '', q.cornerOuterRMm ?? '', q.cornerInnerRMm ?? '']));   /* 開閉部品（レバー等）：台座の幅に合わせて伸縮した長さを、取り込みにも渡す（2026-11-04） */
  }
  for (const pid of parents) specs.splice(1, 0, row([pid, '', '', '', '', '', '', '', '', '', '', '', '', '', '']));   // 親の規格は id だけ（既存の値のまま）
  return { 'binder_specs.csv': specs.join('\n') + '\n', 'binder_rings.csv': rings.join('\n') + '\n', 'binder_parts.csv': parts.join('\n') + '\n' };
}

/** 新しい製品の id：親の id + "-p" + 番号（使われていないもの）。 */
export function newProductId(specs, parentId) { let n = 1; while (specs.some(s => s.id === `${parentId}-p${n}`)) n++; return `${parentId}-p${n}`; }
