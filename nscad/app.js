import { binderSpecWithSection, normalizeSectionPoints, sectionPointsText } from './binder_section_edit.js';
import { arrayOffsets } from './array.js';
import { alignOffsets, distributeOffsets } from './align.js';
import { dotLen, filletCurves, roundLinesAt, cornerLimit, collinearChain, roundChainAt, allIntersections, splitShapeAt, contourFrom, contourStops, outlinePolygon, attachToLine, nearestSegmentOf, enclosedAreaAt, enclosedAreasAround } from './geometry.js';
import { resizeDiamondLoop, diamondLoopSizes, smallLoopCenters, straightRuns, collinearLineClusters, warpX, scaleGeometry, smoothPathNodes, distance, distToShape, healDoc, snapPoints, intersections, bboxOf, bboxOfDoc, newDoc, validateDoc, migrateDoc, arcSweep, circlePoint, chamferCorner, filletCorner, offsetShape, offsetPath, translate, rotate, mirrorX, mirrorY, arcLength, pointAtLength, chainShapes, resolvePath, pointsAlongShape, cornerHoles, toothPositions, projectOnPath, holeAppearance, defaultTools, dimension, areaOf, parseInput, pathSegments, pathNode, toPath, pathInsertNode, pathRemoveNode, reflectAcross, trimAt, flattenShape, ownHolePathIds, holeIsOwn } from './geometry.js';
import { scaleInput, calcExpr, fmtCalc } from './scale_input.js';
import { editVertex } from './vertex.js';
import { docToSvg, docToDxfR12, dxfToShapes, holesOnShapes, docToPdf, pagesFor, printLayout, pageSvg, calibrationFactor, calibrationScale } from './formats.js';
import { svgToShapes, dxfToShapesFull } from './importers.js';
import { beamStudioSvg, leathercraftDxf, importLeathercraft, recoverArcs, attachHoles } from './interop.js';
import { buildPanels, applyFolds, project, collisions, viewMatrix, orthoViews, viewsToSvg, defaultCamera, v3, unfold, triangulate } from './sim3d.js';
import { threeViewSolidAuto } from './threeview.js';
import { THREE_VIEW_LAYOUT, threeViewAreaAt, THREE_VIEW_MARGIN, threeViewFitLayout, threeViewMiter, threeViewMarks, threeViewGuideLines, threeViewCursorLines, threeViewSnap, threeViewOutlines, threeViewSameRect, threeViewSolid, threeViewShapeArea, threeViewFrameValid, threeViewBaseFrom, threeViewRectOf, threeViewFrameFromRect, threeViewSnapToLines, threeViewSheetMarks, threeViewSheetTargets, threeViewSheetCursor, threeViewSolidFromSheets, threeViewFollowDelta, threeViewFollowScale } from './threeview.js';
import { SUPPORTER_T_MM, METAL_COLORS, metalHex, binderRingCompare, closedBinderViews, closedBinderViewsSvg, foldRingParts, spineSim, spinePlayFromMeasured, spineSectionSvg, hardwareFootprint, placeFootprint, hwPoseOfOutline, sameShapes, binderViewShapes, binderSection, binderBase, ringSizeOf, wireOf, spineWidth, binderPlanSvg, binderSideSvg, binderFrontSvg, binderViewDrawing } from './hardware.js';
import { DATA_HARDWARE } from './data/hardware.js';
import { DATA_LIBRARY } from './data/library.js';
import { varStep, varOutOfRange, instantiateItem, extractSelection, encodeClipboard, decodeClipboard, mergePayload, checkLibraryItem, libraryFileText, parseLibraryFile, mergeLibraryItems, pushLibraryBackup, libraryBackupLabel } from './library.js';
import { docToAiJson, validateActions, estimateYen, roughTokens } from './ai_schema.js';
import { buildDoc, check, threadEstimate, defaultRecipe } from './autodesign.js';
import { traceImage, scaleFromTwoPoints, scaleFromDpi } from './trace.js';
import { DATA_LEATHER_COLORS } from './data/leather-colors.js';
import { DATA_TEXTURES } from './data/textures.js';
import { createPlayer } from './tutorial.js';
import { parseVoice, labelOf } from './voice.js';
import { lccToDoc, styleSummary } from './lcc.js';
import { loadDesign, filterDesigns } from './designs.js';
import { DATA_DESIGNS } from './data/designs.js';
import { DATA_STYLE } from './data/style.js';
import { TUTORIALS_BASICS } from './tutorials/basics.js';
import { TUTORIALS_STITCH } from './tutorials/stitch.js';
import { TUTORIALS_PEN } from './tutorials/pen.js';
import { TUTORIALS_OUTPUT } from './tutorials/output.js';
import { DATA_STITCH_COLORS } from './data/stitch-colors.js';
import { putImage, getImage, deleteImage, shrinkDataUrl } from './imgstore.js';
import { encodeStacks, decodeStacks, saveUndoRecord, loadUndoRecord, clearUndoRecord } from './undostore.js';
import { laminateCheck, laminateNow, partBox, lamFoldSpec } from './laminate.js';
import { saveToSharedDir, canPickDir, getSavedDir, BUGDIR_NAME } from './bugdir.js';
import { postChat } from './ai_client.js';
import { BINDER_SPECS } from './data/binder.js';
import { PHRASES_KEY, parsePhrases, serializePhrases, upsertPhrase, removePhrase, phraseLines, phraseShapes, mergePhrases } from './phrases.js';
import { coverLayout } from './hardware.js';
import { BINDER_EDITS_KEY, emptyEdits, parseEdits, serializeEdits, applyBinderEdits, editFromForm, editsToCsv, newProductId } from './binder_edits.js';
/** 元の金具データ（公開版の値）。事業主がこの PC で直した値（binder_edits）は起動時に重ねる（loadBinderEdits）。 */
const BINDER_ORIGINALS = JSON.parse(JSON.stringify(BINDER_SPECS));
let binderEdits = emptyEdits();
import { track } from './analytics.js';
import { createRegistration, regIsOwner } from './registration.js';
import { newRid, feedbackContext, sendFeedback } from './feedback.js';
import { AUTOSAVE_KEY, packAutosave, unpackAutosave } from './autosave.js';
import { expandToGroups, groupShapes, ungroupShapes, nextGroupId, groupIdOf } from './grouping.js';
import { foldAllowance, stackOffset, matchRoutes, mapHoleDistances, optimizePatchHoles, suggestPatchSize, patchGrid, extendAcrossFold, komaStitchLine, regionAt, fillRegionPattern, PATCH_PATTERNS, patchInsetStitch, PATCH_EDGE_MIN_MM, offsetSpan, offsetSpanResult, classifyJunctions, bendInnerSign, detourPath, foldSectionSpec, foldStackPlan, foldDesignPlan, foldUnfoldPlan, foldBendPitch, foldHoleSpacing, foldHoleMarks, findGaps, closeGaps, foldCutLine, foldCutPick, foldPanelBox, foldPlyLengths, foldBendRadii, foldBendWarp, foldBaselines, foldSectionPath, pointOnFoldPath, foldDimensions, foldHandles, projectOnFoldPath, foldSectionShapes, foldSectionMark } from './design.js';
import { t, setLang } from './i18n.js';
import { isShortcut, isUndo, isRedo, isCopy, isDelete, isSelectAll, arrowNudge, TOOL_KEYS, ACTION_KEYS, TOGGLE_KEYS, keyTarget, shortcutLines } from './shortcuts.js';
import { HELP_JA } from './help/ja.js';
import { HELP_EN } from './help/en.js';

if (globalThis.__LC_BOOTED) { /* file 互換ブロックが起動済み */ } else {
globalThis.__LC_BOOTED = true;

const $ = id => document.getElementById(id);
let longPressed = false; // ツールボタンを長押ししてヘルプを開いた直後のクリックは無視する
const canvas = $('canvas'); let ctx = canvas.getContext('2d'), exporting = false, exportColor = false, exportFilter = null;   /* exportFilter：「選んだ図形だけ出力」のとき { vis, hvis, ids }（描く図形・穴の条件と、選んだ id） */   /* exportColor：書き出し（PNG）のとき、革色・金属の色・糸の色も描く */
let doc = newDoc(), selected = new Set(), undo = [], redo = [];
const lamTouched = { o: false, i: false };   /* 貼り合わせの曲げ検証：厚みの欄を、事業主が書き換えたか（書き換えていなければ、部品の厚みを使う） */
let lamSig = null;   /* 検証カードの選択欄に出した部品の一覧（変わったときだけ作り直す） */
let undoSaveTimer = 0, undoAttaching = false, autosaveTimer = 0, autosaveWarned = false, autosaveReady = false, pendingRestore = null; /* 自動保存：保存待ちのタイマー・容量超えの案内を出したか・起動が済んだか（前の保存を見る前に空で消さない）・復元を決めるまでの前回の保存 */
let ruler = null; /* 定規の測定結果 {a, b}。図形ではなく表示だけ */
let mode = 'select', gesture = null, stage = null, space = false, cursor = { x: 0, y: 0 }, snap = null;
let width = 1, height = 1, scale = 4, origin = { x: 80, y: 400 }, snapCache = [];
let offsetSelection = null; /* オフセットで選んだ範囲 {points, closed, whole, layer}。距離を決めて Enter で実行 */
const opLog = []; /* 操作の記録（不具合調査用・最近300件） */
let dupGroups = []; /* 同じ形・同じ層・同じ線種で重なった図形の組（[{ ids }]）。赤く太く表示し、警告と「1本にまとめる」を出す */
let gaps = []; /* 切れ目：2mm 以内で触れていない端点の組（橙の輪・ダブルクリックの案内・隙間を閉じる） */
let junctions = { joined: [], loose: [] }; /* 交点の表示：ポインタが近いときだけ。結合＝赤い点／未結合＝白い縁の赤い点 */
let magnetGuide = []; /* ガイドの点：直線・折れ線の各辺・ベジェ/曲線の各区間・円弧の「中点と両端」、円の上下左右と斜め45度の8点、縫い穴・点の目印の中心（ポインタが近づくと印が出て、端点・中心と同じ磁石で吸い付く） */
let magnetEnds = [], magnetCenters = []; /* 端点・円/円弧の中心：スナップのチェックと無関係に吸い付く候補 */
let chainStops = null; /* ダブルクリックで輪郭を選んだとき、分岐で止まった端の位置（選択が変わったら出さない） */
let countStage = null; /* 個数指定の目打ち：始点の交点をクリックしたあと終点を待つ状態 */
let manualNext = null, activeLayer = 'pattern', nodeSel = null, lastPoint = { x: 0, y: 0 }, pairLines = [];
const isMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '');
/** 実線・点線の表示チェックを今の状態に合わせる。選択中の図形のうち、隠れたものは選択から外す。 */
function syncViewShow(save) {
  $('showSolid').checked = viewShow.solid; $('showDashed').checked = viewShow.dashed;
  if (save) { try { localStorage.setItem('leather-cad.view', JSON.stringify(viewShow)); } catch { /* 保存できなくても続ける */ } }
  selected = new Set([...selected].filter(id => { const x = doc.shapes.find(y => y.id === id); return !x || viewShows(x); })); cancel(); draw();
}
function gatherVisibleToActiveLayer() {
  const layer = doc.layers.find(l => l.id === activeLayer);
  if (!layer?.visible || layer.locked) { $('hint').textContent = t('gatherLocked'); return; }
  const moved = doc.shapes.filter(x => visible(x) && editable(x) && x.layer !== activeLayer);
  if (!moved.length) { $('hint').textContent = t('gatherNone'); return; }
  commit(() => { for (const x of moved) x.layer = activeLayer; });
  $('hint').textContent = t('gatherDone', { n: moved.length, layer: layerName(layer) });
}
function applyLanguage(lang) {
  const current = setLang(lang);
  try { localStorage.setItem('leather-cad.lang', current); } catch { /* file:// の保存制限でも操作を続ける。 */ }
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  $('language').value = current;
  for (const [id, key] of [['undo', 'Z'], ['redo', 'Y'], ['copy', 'D'], ['save', 'S'], ['open', 'O']]) $(id).title = t(id) + ' (' + (isMac ? (id === 'redo' ? '⌘⇧Z' : '⌘' + key) : 'Ctrl+' + key) + ')';
  document.querySelectorAll('kbd[data-mod]').forEach(el => { el.textContent = modLabel(el.dataset.mod); }); /* ヘッダーのボタンのキー表示（Mac は ⌘） */
  refreshModHelp(); $('hint').textContent = t('hint.' + mode); refreshTools(); renderLayers(); showCalibration(); if (typeof renderLibrary === 'function' && $('libItem')) { renderLibrary(); renderDesigns(); initTutorialSelect(); $('styleNote').textContent = styleSummary(DATA_STYLE, current === 'en' ? 'en' : 'ja'); } draw();
}
const world = p => { const o = paneOff(); return { x: (p.x - o.x - origin.x) / scale, y: (p.y - o.y - origin.y) / scale }; };
/** ポインタ位置（キャンバス内・描画の座標）。描画サイズ（ビットマップ）と表示サイズ（CSS）がずれているとき（表示だけ縮んで、描き直しが届いていない間）は、その比で補正して、見えている線の位置とクリックの位置を合わせる。ずれが1.5px 以内（小数の丸め）なら補正しない。 */
const local = e => {
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, bw = canvas.width / dpr, bh = canvas.height / dpr;
  const kx = r.width > 0 && Math.abs(bw - r.width) > 1.5 ? bw / r.width : 1, ky = r.height > 0 && Math.abs(bh - r.height) > 1.5 ? bh / r.height : 1;
  return { x: (e.clientX - r.left) * kx, y: (e.clientY - r.top) * ky };
};
/* 三面図（正面・上・右から見た図）の手伝い。計算は threeview.js。ここでは枠・45°の線・点線・奥行きの読みを描く。枠は目安で図形ではなく、描いた形に合わせて広がる。 */
let threeViewLayout = THREE_VIEW_LAYOUT, threeViewMarksCache = threeViewMarks([]), threeViewSolidCache = null, miniCam = { yaw: -35, pitch: -55 };
const threeViewOn = () => $('threeView').checked;
/** 描いてある図形に合わせて枠を広げ、「合わせたい位置」を集め直す（図形が変わるたび・rebuildSnaps から）。 */
/** 枠の出発点：文書に「枠の指定」（選んだ四角を枠にしたもの）があればそれ、無ければ標準の枠。 */
function threeViewBase() { const f = doc.threeView; return threeViewFrameValid(f) ? threeViewBaseFrom(f.front, f.depth) : THREE_VIEW_LAYOUT; }
function rebuildThreeViewMarks() { const shapes = doc.shapes.filter(s => visibleData(s) && s.type !== 'image'); threeViewLayout = threeViewFitLayout(shapes, threeViewBase()); threeViewMarksCache = threeViewMarks(shapes, threeViewLayout); threeViewSolidCache = threeViewOn() ? threeViewSolid(shapes, threeViewLayout, { specOf: binderSpec }) : null; }
/** 右上の空き（45°の線のある区画）：ここに小さな立体画面を出す。文書座標の四角。 */
function threeViewMiniBox() { const { top, side } = threeViewLayout; return { x: side.x, y: top.y, w: side.w, h: top.h }; }
/** 小さな立体画面（枠方式）：右上の空きに、三面図から組み立てた立体を描く（描くたびに更新・この中をドラッグすると回る）。点線はこの上に描かれる。 */
function drawThreeViewMini() {
  const b = threeViewMiniBox(); if (!(b.w > 0) || !(b.h > 0)) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSolidInRect(threeViewSolidCache, { x: origin.x + b.x * scale, y: origin.y + b.y * scale, w: b.w * scale, h: b.h * scale }, t(threeViewSolidCache ? 'threeViewMini' : 'threeViewMiniNone'));
  ctx.restore();
}
/** 「選んだ四角を枠にする」：まっすぐな四角を 1 つ選んで押すと、その四角がある枠（正面・上・右）の枠そのものにし、残りの枠は奥行きから作る。文書に残る（保存される）。 */
function setThreeViewFrame() {
  const picked = doc.shapes.filter(s => selected.has(s.id) && editable(s));
  const rect = picked.length === 1 ? threeViewRectOf(picked[0]) : null;
  if (!rect) { $('hint').textContent = t('threeViewFrameNeedRect'); return; }
  const area = threeViewShapeArea(picked[0], threeViewLayout);
  const frame = area ? threeViewFrameFromRect(rect, area, threeViewBase(), Number($('threeViewDepthIn').value)) : null;
  if (!frame) { $('hint').textContent = t('threeViewFrameWhere'); return; }
  commit(() => { doc.threeView = frame; });
  $('threeViewDepthIn').value = String(+frame.depth.toFixed(2));
  const fmt = v => String(+v.toFixed(2)), view = t(area === 'front' ? 'threeViewFront' : area === 'top' ? 'threeViewTop' : 'threeViewSide');
  $('hint').textContent = t('threeViewFrameDone', { view, w: fmt(frame.front.w), h: fmt(frame.front.h), d: fmt(frame.depth) });
}
function resetThreeViewFrame() { if (doc.threeView) commit(() => { delete doc.threeView; }); $('hint').textContent = t('threeViewFrameResetDone'); }
function strokeGuideLines(lines) { ctx.beginPath(); for (const l of lines) { ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); } ctx.stroke(); }
function drawThreeViewFrames() {
  const labels = { front: t('threeViewFront'), top: t('threeViewTop'), side: t('threeViewSide') }, m = threeViewMiter(threeViewLayout);
  ctx.save(); ctx.setLineDash([4 / scale, 3 / scale]); ctx.strokeStyle = '#4a4a3a'; ctx.lineWidth = 1 / scale;
  for (const key of ['front', 'top', 'side']) { const a = threeViewLayout[key]; ctx.strokeRect(a.x, a.y, a.w, a.h); }
  ctx.strokeStyle = '#7a6a38'; strokeGuideLines([m]); /* 45°の線：上の図の奥行きを右の図へ移すための線 */
  ctx.setLineDash([]); ctx.fillStyle = '#8a7a50'; ctx.font = `${12 / scale}px sans-serif`;
  for (const key of ['front', 'top', 'side']) { const a = threeViewLayout[key]; ctx.fillText(labels[key], a.x + 2 / scale, a.y - 3 / scale); }
  ctx.fillText(t('threeViewMiter'), m.x2 + 3 / scale, m.y2 + 12 / scale);
  ctx.restore();
}
/** 描いてある図形の角や端から、他の枠へ伸ばした点線（いつも表示・淡い色）。描いた線の高さ・横の位置・奥行きに合わせやすくする。 */
function drawThreeViewStaticGuides() {
  ctx.save(); ctx.setLineDash([3 / scale, 3 / scale]); ctx.strokeStyle = '#3f8aa0'; ctx.lineWidth = 0.9 / scale;
  strokeGuideLines(threeViewGuideLines(threeViewMarksCache, threeViewLayout)); ctx.restore();
}
/** 「上と右の図を作る」：正面の枠にある図形をぜんぶ囲む四角と「奥行き」の数字から、上から見た図と右から見た図の外形（四角）を描き足す。
 *  同じ四角が既にあれば作らない。元に戻すで取り消せる。細かい形は、この四角の上に点線に合わせて描き足してもらう。 */
function makeThreeViewOutlines() {
  const depth = Number($('threeViewDepthIn').value);
  if (!(depth > 0)) { $('hint').textContent = t('threeViewMakeBadDepth'); return; }
  const r = threeViewOutlines(doc.shapes.filter(s => visibleData(s)), depth, threeViewLayout);
  if (!r) { $('hint').textContent = t('threeViewMakeNoFront'); return; }
  const layer = doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked) || doc.layers.find(l => l.visible && !l.locked);
  if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const fresh = [r.top, r.side].filter(rect => !doc.shapes.some(s => visibleData(s) && threeViewSameRect(s, rect)));
  if (!fresh.length) { $('hint').textContent = t('threeViewMakeExists'); return; }
  cancel();
  commit(() => { const ids = [], tex = solidTextureOf('frame'); /* 正面の形の質感を、作った外形にも付ける（三面図・立体で同じ革に見える） */ for (const rect of fresh) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer: layer.id, type: 'polyline', closed: true, points: rect.points.map(p => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })), ...(tex ? { texture: tex } : {}) }); ids.push(id); } selected = new Set(ids); });
  updateUI();
  const fmt = v => String(+v.toFixed(2));
  $('hint').textContent = t('threeViewMakeDone', { w: fmt(r.width), h: fmt(r.height), d: fmt(r.depth) });
}
/** 円を描いている最中の読み：中心 c とカーソル p から半径・直径（mm）と表示する文字。 */
function circleReadout(c, p) { const r = distance(c, p); return { r, d: r * 2, text: t('circleLive', { r: r.toFixed(1), d: (r * 2).toFixed(1) }) }; }
/** 円ツールで中心から円周へドラッグしている間、カーソルのそばに「半径・直径」をリアルタイムで出す。 */
function drawCircleReadout() {
  if (mode !== 'circle' || gesture?.kind !== 'draw') return;
  const { text } = circleReadout(gesture.start, cursor);
  ctx.save(); ctx.setLineDash([]); ctx.fillStyle = '#c9a96e'; ctx.font = `${11 / scale}px sans-serif`; ctx.fillText(text, cursor.x + 8 / scale, cursor.y - 8 / scale); ctx.restore();
}
/** カーソルから他の 2 つの枠へ伸ばす線（水色）。上・右の図では 45°の線を通って奥行きを移し、奥行きの数字も出す。 */
function drawThreeViewGuides() {
  const g = threeViewCursorLines(cursor, threeViewLayout); if (!g) return;
  ctx.save(); ctx.setLineDash([3 / scale, 3 / scale]); ctx.strokeStyle = '#4fd0ff'; ctx.lineWidth = 1 / scale; strokeGuideLines(g.lines);
  if (g.depth !== null) { ctx.setLineDash([]); ctx.fillStyle = '#4fd0ff'; ctx.font = `${11 / scale}px sans-serif`; ctx.fillText(t('threeViewDepth', { d: g.depth.toFixed(1) }), cursor.x + 8 / scale, cursor.y - 8 / scale); }
  ctx.restore();
}

/* 三面図（4分割・紙を分ける）：正面・上・右をそれぞれ別のタブ（紙）にし、画面を 4 つの区画に分けて同時に見せる。
   左上＝上の紙・左下＝正面の紙・右下＝右の紙・右上＝立体。紙ごとに座標と拡大縮小が別で、つながりは点線だけ。
   上の紙は手前の線が y=0（奥は y が負＝画面の上）、右の紙は手前の線が x=0（奥は x が正）。 */
const quadOn = () => !!$('quadView').checked;
let quadMarksCache = null, quadSolidCache = null, quadHover = null;
function quadPane(role) { const w = width / 2, h = height / 2; return role === 'top' ? { x: 0, y: 0, w, h } : role === 'front' ? { x: 0, y: h, w, h } : role === 'side' ? { x: w, y: h, w, h } : { x: w, y: 0, w, h }; }
function quadRoleAt(p) { const left = p.x < width / 2, upper = p.y < height / 2; return left ? (upper ? 'top' : 'front') : (upper ? 'solid' : 'side'); }
function sheetRole(tab = tabs[activeTab]) { return tab?.doc?.threeViewSheet?.role || null; }
function quadRole() { return quadOn() && sheetRole() ? sheetRole() : 'front'; }
function paneOff() { return quadOn() ? quadPane(quadRole()) : { x: 0, y: 0 }; }
function viewW() { return quadOn() ? width / 2 : width; }
function viewH() { return quadOn() ? height / 2 : height; }
/** 同じ組（id）の紙のタブ：{ front, top, side } */
function quadSheets() { const id = tabs[activeTab]?.doc?.threeViewSheet?.id; const out = {}; if (!id) return out; for (const tb of tabs) if (tb.doc?.threeViewSheet?.id === id) out[tb.doc.threeViewSheet.role] = tb; return out; }
/** 4分割で、いまの紙の（見えていて動かせる）図形を全部選んでいるか。 */
function quadAllSelected() { if (!quadOn() || !sheetRole()) return false; const all = doc.shapes.filter(s => visible(s) && editable(s)); return all.length > 0 && all.every(s => selected.has(s.id)); }
/** 全選択で動かしたとき、残り2枚の紙の図形（ロックされた層を除く）も共有する軸の分だけ動かす。それぞれの紙の「元に戻す」に積む。 */
function quadFollowMove(dx, dy) {
  const follow = threeViewFollowDelta(sheetRole(), dx, dy), sheets = quadSheets(); let moved = 0;
  for (const [role, d] of Object.entries(follow)) {
    const tb = sheets[role]; if (!tb || tb === tabs[activeTab] || (!d.x && !d.y)) continue;
    const td = tb.doc, free = s => { const l = td.layers.find(x => x.id === s.layer || x.name === s.layer); return !l || !l.locked; };
    const before = JSON.stringify(td), ids = new Set(td.shapes.filter(free).map(s => s.id));
    if (!ids.size) continue;
    td.shapes = td.shapes.map(s => ids.has(s.id) ? translate(s, d.x, d.y) : s);
    const paths = new Set(td.paths.filter(p => p.shapeIds.every(id => ids.has(id))).map(p => p.id));
    td.holes = td.holes.map(h => paths.has(h.pathId) ? translate(h, d.x, d.y) : h);
    tb.undo = tb.undo || []; tb.undo.push(before); if (tb.undo.length > 100) tb.undo.shift(); tb.redo = []; tb.dirty = true; moved++;
  }
  if (moved) { renderTabs(); draw(); }
}
/** 全選択で伸縮したとき、残り2枚の紙の図形（ロックされた層を除く）も共有する軸の分だけ同じ倍率で伸縮する。quadFollowMove と同じく、それぞれの紙の「元に戻す」に積む。 */
function quadFollowScale(sx, sy, o) {
  const follow = threeViewFollowScale(sheetRole(), sx, sy, o), sheets = quadSheets(); let scaled = 0;
  for (const [role, f] of Object.entries(follow)) {
    const tb = sheets[role]; if (!tb || tb === tabs[activeTab] || (f.sx === 1 && f.sy === 1)) continue;
    const td = tb.doc, free = s => { const l = td.layers.find(x => x.id === s.layer || x.name === s.layer); return !l || !l.locked; };
    const before = JSON.stringify(td), ids = new Set(td.shapes.filter(free).map(s => s.id));
    if (!ids.size) continue;
    const org = { x: f.ox, y: f.oy };
    td.shapes = td.shapes.map(s => ids.has(s.id) ? scaleGeometry(s, f.sx, f.sy, org) : s);
    const paths = new Set(td.paths.filter(p => p.shapeIds.every(id => ids.has(id))).map(p => p.id));
    td.holes = td.holes.map(h => paths.has(h.pathId) ? scaleGeometry(h, f.sx, f.sy, org) : h);
    tb.undo = tb.undo || []; tb.undo.push(before); if (tb.undo.length > 100) tb.undo.shift(); tb.redo = []; tb.dirty = true; scaled++;
  }
  if (scaled) { renderTabs(); draw(); }
}
function sheetDoc(role) { const tb = quadSheets()[role]; return tb ? (tb === tabs[activeTab] ? doc : tb.doc) : null; }
/** 4分割を入れたとき：いまのタブを正面の紙にし、上の紙・右の紙のタブを作る（既にあればそのまま）。 */
function ensureSheetSet() {
  snapshotTab();
  let id = tabs[activeTab].doc.threeViewSheet?.id;
  if (!id) { id = 'sheet-' + Date.now().toString(36); tabs[activeTab].doc.threeViewSheet = { id, role: 'front' }; tabs[activeTab].dirty = true; }
  const cur = activeTab, sc = scale;
  for (const role of ['top', 'side']) if (!quadSheets()[role]) {
    newTab(t(role === 'top' ? 'threeViewTop' : 'threeViewSide')); doc.threeViewSheet = { id, role };
    scale = sc; origin = role === 'top' ? { x: 80, y: Math.max(60, height / 2 * 0.8) } : { x: Math.max(40, width / 2 * 0.2), y: 80 }; snapshotTab(); /* 上の紙は手前の線を下寄りに、右の紙は手前の線を左寄りに */
  }
  switchTab(cur); renderTabs();
}
/** 4分割を切ったとき：中身が空の「上から見た図」「右から見た図」のタブを閉じる（図が入っているタブは残す）。残る補助タブが無ければ、正面の紙の「組」の印も外す（次に開いたとき4分割が勝手に入らない）。閉じた数を返す。 */
function dropEmptySheetTabs() {
  const isSheet = tb => tb.doc?.threeViewSheet && tb.doc.threeViewSheet.role !== 'front', drop = tb => isSheet(tb) && !tb.doc.shapes.length && !tb.doc.holes?.length;
  if (!tabs.some(drop)) return 0; snapshotTab(); const cur = tabs[activeTab], n = tabs.filter(drop).length, keep = tabs.filter(tb => !drop(tb)); if (!keep.length) return 0;
  tabs = keep; for (const tb of tabs) if (tb.doc?.threeViewSheet?.role === 'front' && !tabs.some(o => isSheet(o) && o.doc.threeViewSheet.id === tb.doc.threeViewSheet.id)) delete tb.doc.threeViewSheet;
  const i = tabs.indexOf(cur); if (i >= 0) { activeTab = i; renderTabs(); } else { activeTab = -1; switchTab(0); } return n;
}
function switchSheet(role) { const tb = quadSheets()[role]; if (!tb) return false; const i = tabs.indexOf(tb); if (i !== activeTab) switchTab(i); return true; }
/** 図形（と、その図形だけで成り立つ経路・穴）を紙 src から紙 dst へ移す。座標は (dx, dy) だけずらす。id は移し先で付け直す。下絵は移さない。移した図形の数を返す */
function transferShapes(src, dst, ids, dx, dy) {
  const idSet = new Set(ids); if (!idSet.size) return 0;
  const layerOk = l => dst.layers.some(x => x.id === l) ? l : (dst.layers[0]?.id || 'pattern'), shapeMap = new Map(), pathMap = new Map();
  for (const s of src.shapes.filter(s => idSet.has(s.id) && s.type !== 'image')) { const id = freshId(dst.shapes, 's'); shapeMap.set(s.id, id); const moved = { ...translate(s, dx, dy), id, layer: layerOk(s.layer) }; if (moved.type === 'fold') moved.partId = null; dst.shapes.push(moved); }
  for (const p of src.paths.filter(p => p.shapeIds.length && p.shapeIds.every(i => shapeMap.has(i)))) { const id = freshId(dst.paths, 'p'); pathMap.set(p.id, id); dst.paths.push({ ...p, id, shapeIds: p.shapeIds.map(i => shapeMap.get(i)) }); }
  for (const h of src.holes.filter(h => pathMap.has(h.pathId))) dst.holes.push({ ...translate(h, dx, dy), id: freshId(dst.holes, 'h'), pathId: pathMap.get(h.pathId) });
  src.seams = (src.seams || []).filter(m => !pathMap.has(m.a.pathId) && !pathMap.has(m.b.pathId));
  src.holes = src.holes.filter(h => !pathMap.has(h.pathId)); src.paths = src.paths.filter(p => !pathMap.has(p.id)); src.shapes = src.shapes.filter(s => !shapeMap.has(s.id));
  for (const pt of src.parts || []) pt.shapeIds = pt.shapeIds.filter(i => !shapeMap.has(i));
  return shapeMap.size;
}
/** ほかの紙のタブに「元に戻す」の記録を積む（quadFollowMove と同じ） */
function pushTabUndo(tb, before) { tb.undo = tb.undo || []; tb.undo.push(before); if (tb.undo.length > 100) tb.undo.shift(); tb.redo = []; tb.dirty = true; }
/** 4分割 → 枠方式：上の紙・右の紙の図形を、正面の紙の上の枠・右の枠へ移す（手前の線＝枠の下の辺／左の辺に合わせる）。正面の図形が正面の枠の外にあれば枠の中へずらす（上・右も同じだけ）。移した数を返す */
function quadToFrames() {
  const sheets = quadSheets(); if (!sheets.front || (!sheets.top && !sheets.side)) return 0;
  switchSheet('front'); /* 枠方式は正面の紙 1 枚で見る */
  const base = threeViewBase(), bottomOfTop = base.top.y + base.top.h, leftOfSide = base.side.x, margin = THREE_VIEW_MARGIN;
  const own = doc.shapes.filter(s => visible(s) && s.type !== 'image'); let dx = 0, dy = 0;
  if (own.length) { const b = bboxOfDoc({ shapes: own, holes: [] }); if (b && threeViewAreaAt({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, base) !== 'front') { dx = base.front.x + margin - b.minX; dy = base.front.y + margin - b.minY; } }
  let moved = 0;
  commit(() => {
    if (dx || dy) { doc.shapes = doc.shapes.map(s => s.type === 'image' ? s : translate(s, dx, dy)); doc.holes = doc.holes.map(h => translate(h, dx, dy)); }
    for (const [role, ox, oy] of [['top', dx, bottomOfTop], ['side', leftOfSide, dy]]) {
      const tb = sheets[role]; if (!tb) continue; const src = tb.doc, before = JSON.stringify(src);
      const n = transferShapes(src, doc, src.shapes.map(s => s.id), ox, oy); if (n) { pushTabUndo(tb, before); moved += n; }
    }
  });
  rebuildThreeViewMarks(); renderTabs(); return moved;
}
/** 枠方式 → 4分割：正面の紙の上の枠・右の枠にある図形を、上の紙・右の紙へ移す（手前の線を 0 に）。紙は作ってから呼ぶ。移した数を返す */
function framesToQuad() {
  const sheets = quadSheets(); if (!sheets.top && !sheets.side) return 0;
  const layout = threeViewLayout, bottomOfTop = layout.top.y + layout.top.h, leftOfSide = layout.side.x, byArea = { top: [], side: [] };
  for (const s of doc.shapes) { if (s.type === 'image') continue; const a = threeViewShapeArea(s, layout); if (a === 'top' || a === 'side') byArea[a].push(s.id); }
  let moved = 0;
  commit(() => {
    for (const [role, ox, oy] of [['top', 0, -bottomOfTop], ['side', -leftOfSide, 0]]) {
      const tb = sheets[role], ids = byArea[role]; if (!tb || !ids.length || tb === tabs[activeTab]) continue; const before = JSON.stringify(tb.doc);
      const n = transferShapes(doc, tb.doc, ids, ox, oy); if (n) { pushTabUndo(tb, before); moved += n; }
    }
  });
  renderTabs(); return moved;
}
/** 3 枚の紙から「合わせたい位置」と立体を作り直す（図形が変わるたび・rebuildSnaps から）。 */
function rebuildQuad() {
  if (!quadOn()) { quadMarksCache = null; quadSolidCache = null; return; }
  const shapesOf = role => { const d = sheetDoc(role); return d ? d.shapes.filter(s => d.layers.find(l => l.id === s.layer)?.visible && s.type !== 'image') : []; };
  const f = shapesOf('front'), tp = shapesOf('top'), sd = shapesOf('side');
  quadMarksCache = threeViewSheetMarks(f, tp, sd); quadSolidCache = threeViewSolidFromSheets(f, tp, sd, { specOf: binderSpec });
}
/** ほかの紙の図形を、その紙の区画に描く（選択や作図中の線は無し）。sc はその紙の拡大率。 */
function drawPlainSheet(d, sc, lo, hi) {
  const saved = scale; scale = sc; ctx.lineWidth = 1 / sc;
  if ($('grid').checked) { let step = Number($('spacing').value) || 1; while (step * sc < 12) step *= 5; ctx.beginPath(); for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) { ctx.moveTo(x, lo.y); ctx.lineTo(x, hi.y); } for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) { ctx.moveTo(lo.x, y); ctx.lineTo(hi.x, y); } ctx.strokeStyle = '#1c1c1c'; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(lo.x, 0); ctx.lineTo(hi.x, 0); ctx.moveTo(0, lo.y); ctx.lineTo(0, hi.y); ctx.strokeStyle = '#454039'; ctx.stroke();
  ctx.lineWidth = 1.5 / sc;
  const vis = s => d.layers.find(l => l.id === s.layer)?.visible;
  if (viewShow.colors) drawLeatherFills(d, vis); /* ほかの紙でも革色・質感を塗る（いま描いている紙と同じ見え方） */
  for (const s of d.shapes.filter(s => vis(s) && s.type !== 'image')) strokeShape(s, s.type === 'dimension' || s.type === 'text' ? '#6f8898' : '#a0a0a0', s.lineStyle === 'dashed');
  ctx.setLineDash([]);
  for (const h of d.holes) { const a = holeAppearance(h, d); if (!a) continue; const pth = d.paths.find(q => q.id === h.pathId); if (pth && !pth.shapeIds.every(id => d.shapes.some(x => x.id === id && vis(x)))) continue; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angleDeg * Math.PI / 180); ctx.beginPath(); if (a.kind === 'circle' || a.kind === 'dot') ctx.arc(0, 0, a.width / 2, 0, Math.PI * 2); else if (a.kind === 'slit') { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(a.width / 2, 0); } else { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(0, -a.height / 2); ctx.lineTo(a.width / 2, 0); ctx.lineTo(0, a.height / 2); ctx.closePath(); } ctx.fillStyle = ctx.strokeStyle = '#bbb'; if (a.kind === 'slit') { ctx.lineWidth = a.height; ctx.stroke(); } else ctx.fill(); ctx.restore(); }
  scale = saved;
}
/** 紙の区画に、手前の線とほかの紙から来る点線（いつも表示）、いま描いている紙のカーソルに対応する線（水色）を描く。 */
function drawSheetGuides(role, lo, hi, sc) {
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = '#7a6a38'; ctx.lineWidth = 1 / sc; ctx.fillStyle = '#8a7a50'; ctx.font = `${11 / sc}px sans-serif`; ctx.beginPath();
  if (role === 'top') { ctx.moveTo(lo.x, 0); ctx.lineTo(hi.x, 0); ctx.stroke(); ctx.fillText(t('sheetNear'), lo.x + 6 / sc, -4 / sc); }
  if (role === 'side') { ctx.moveTo(0, lo.y); ctx.lineTo(0, hi.y); ctx.stroke(); ctx.fillText(t('sheetNear'), 4 / sc, lo.y + 14 / sc); }
  const tg = threeViewSheetTargets(role, quadMarksCache);
  ctx.setLineDash([3 / sc, 3 / sc]); ctx.strokeStyle = '#3f8aa0'; ctx.lineWidth = 0.9 / sc; ctx.beginPath();
  for (const x of tg.xs) { ctx.moveTo(x, lo.y); ctx.lineTo(x, hi.y); } for (const y of tg.ys) { ctx.moveTo(lo.x, y); ctx.lineTo(hi.x, y); } ctx.stroke();
  if (role !== quadRole() && quadHover === quadRole()) { const c = threeViewSheetCursor(quadRole(), cursor)[role]; if (c) { ctx.strokeStyle = '#4fd0ff'; ctx.lineWidth = 1 / sc; ctx.beginPath(); if ('x' in c) { ctx.moveTo(c.x, lo.y); ctx.lineTo(c.x, hi.y); } if ('y' in c) { ctx.moveTo(lo.x, c.y); ctx.lineTo(hi.x, c.y); } ctx.stroke(); } }
  ctx.restore();
}
/** 立体を画面の四角（px・変換なし）に描く。小さな立体画面（枠方式）と 4分割の右上で共用。 */
function drawSolidInRect(solid, b, label) {
  ctx.save(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(8,8,8,0.82)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#6a5a30'; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#8a7a50'; ctx.fillText(label, b.x + 4, b.y + b.h - 5);
  if (!solid) { ctx.restore(); return; }
  const pts = solid.faces.flatMap(f => f.points);
  const lo = k => Math.min(...pts.map(p => p[k])), hi = k => Math.max(...pts.map(p => p[k]));
  const size = Math.max(hi('x') - lo('x'), hi('y') - lo('y'), hi('z') - lo('z'), 1);
  const camMini = { yaw: miniCam.yaw, pitch: miniCam.pitch, distance: size * 4, ortho: true, zoom: Math.min(b.w, b.h) * 0.5 / size, target: v3((lo('x') + hi('x')) / 2, -(lo('y') + hi('y')) / 2, (lo('z') + hi('z')) / 2) };
  const flipped = solid.faces.map(f => ({ ...f, points: f.points.map(q => v3(q.x, -q.y, q.z)) })); /* 3D 画面（WebGL）と同じく y を反転して同じ向きに見せる */
  const proj = project(flipped, camMini, { width: b.w, height: b.h });
  ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); ctx.lineWidth = 0.5; ctx.strokeStyle = '#141414';
  for (const f of proj) { if (f.points.length < 3) continue; const c = partColor(f, false).map(v => Math.round(v * 255 * f.shade)); ctx.globalAlpha = ghostFace(f, solid) ? GHOST_ALPHA : 1; ctx.beginPath(); f.points.forEach((q, i) => { if (i) ctx.lineTo(b.x + q.x, b.y + q.y); else ctx.moveTo(b.x + q.x, b.y + q.y); }); ctx.closePath(); ctx.fillStyle = `rgb(${c.join(',')})`; ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
/** 4分割の描画：3 枚の紙の区画（いま描いている紙は普段どおり・ほかは図形だけ）＋右上の立体＋区画の枠と名前。 */
function drawQuad(dpr) {
  const sheets = quadSheets(), active = quadRole();
  for (const role of ['top', 'front', 'side']) {
    const pane = quadPane(role), tb = sheets[role], isActive = role === active;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.save(); ctx.beginPath(); ctx.rect(pane.x, pane.y, pane.w, pane.h); ctx.clip();
    if (isActive) { ctx.translate(pane.x + origin.x, pane.y + origin.y); ctx.scale(scale, scale); ctx.lineWidth = 1 / scale; const lo = world({ x: pane.x, y: pane.y }), hi = world({ x: pane.x + pane.w, y: pane.y + pane.h }); drawSheetBody(lo, hi); drawSheetGuides(role, lo, hi, scale); }
    else if (tb) { const o = tb.origin || { x: 80, y: 80 }, sc = tb.scale || 4; ctx.translate(pane.x + o.x, pane.y + o.y); ctx.scale(sc, sc); const lo = { x: -o.x / sc, y: -o.y / sc }, hi = { x: (pane.w - o.x) / sc, y: (pane.h - o.y) / sc }; drawPlainSheet(tb.doc, sc, lo, hi); drawSheetGuides(role, lo, hi, sc); }
    ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.setLineDash([]);
    ctx.strokeStyle = isActive ? '#c9a96e' : '#3a3a3c'; ctx.lineWidth = isActive ? 2 : 1; ctx.strokeRect(pane.x + 1, pane.y + 1, pane.w - 2, pane.h - 2);
    ctx.fillStyle = isActive ? '#c9a96e' : '#8a7a50'; ctx.font = '12px sans-serif'; ctx.fillText(t(role === 'top' ? 'threeViewTop' : role === 'front' ? 'threeViewFront' : 'threeViewSide') + (isActive ? t('sheetActive') : ''), pane.x + 8, pane.y + 16);
  }
  const sp = quadPane('solid'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSolidInRect(quadSolidCache, sp, t(quadSolidCache ? 'threeViewMini' : 'quadSolidNone'));
  ctx.strokeStyle = '#3a3a3c'; ctx.lineWidth = 1; ctx.strokeRect(sp.x + 1, sp.y + 1, sp.w - 2, sp.h - 2);
}
/* holeLink＝穴の経路のための補助の線（.lcc の取り込みで付く・もとの図面に無い線）。画面には出さず、クリックでも選ばれない（visible から除く）。全選択・範囲選択には入る（editable は層だけで決める）。穴の判定も層だけ（layerVisible／layerEditable）。 */
const layerVisible = s => doc.layers.find(l => l.id === s.layer)?.visible;
const layerEditable = s => { const l = doc.layers.find(l => l.id === s.layer); return l?.visible && !l.locked && !hwHidden(s) && (exporting || viewShows(s)); };
/** 実線・点線（ガイド）ごとの表示のオンオフ。レイヤーとは別で、画面だけの切り替え（印刷・書き出しには効かない）。点線＝線種が点線、またはガイドの層の線。文字・寸法・折り線・下絵は対象外。 */
const viewShow = { solid: true, dashed: true, colors: true, hardware: true };   /* hardware：金具（「金具」の層の図形・金属の色を付けた図形）を見せるか。画面と書き出し・印刷の両方に効く（保存はしない） */   /* colors：色（革色・質感・金属の色・糸の色）の塗りを見せるか（事業主の希望 2026-10-18「レーザーカットで不要な要素は非表示に」。画面と色つきの書き出し（PNG・SVG）に効く。保存はしない＝開き直すと色が出る） */
/** 菱目の見せ方：'auto'（今までどおり：画面は塗り・書き出しは線）・'fill'（塗り）・'line'（線）。目打ちの穴のデータは変えない。 */
const DIAMOND_KEY = 'leather-cad.diamondStyle';
/** 保存した「菱目の見せ方」を選択欄に戻す（開き直しても残る）。壊れた値は無視。 */
/** 全体の菱目（穴も菱の線も）を、中抜き（'line'）／中塗り（'fill'）に一斉に切り替える（事業主の希望 2026-10-18「塗りつぶしと中抜きの菱目が混在している…中抜き・中塗りの一斉置換もできるように」）。
 *  上の「菱目の見せ方」の選択欄を変えるのと同じ（画面・PNG・SVG に効く・保存される）。 */
function setDiamondMode(mode) {
  $('diamondStyle').value = mode; try { localStorage.setItem(DIAMOND_KEY, diamondMode()); } catch { /* 保存できなくても続ける */ }
  draw(); refreshInfo(); $('hint').textContent = t('diamondModeSet', { name: t('diamondModeName_' + diamondMode()) });
}
function restoreDiamondStyle() { try { const v = localStorage.getItem(DIAMOND_KEY); if ((v === 'auto' || v === 'fill' || v === 'line') && $('diamondStyle')) $('diamondStyle').value = v; } catch { /* 保存できない環境でも続ける */ } }
const diamondMode = () => { const v = $('diamondStyle')?.value; return v === 'fill' || v === 'line' ? v : 'auto'; };
/** 金具の図形か：「金具」の層・置いた金具の外形（hw）・金属の色を付けた図形。「金具を表示」を切ると、これらを隠す。 */
const isHardwareShape = s => s.layer === 'hardware' || !!s.hw || !!s.metal;
const hwHidden = s => !viewShow.hardware && isHardwareShape(s);
/** 書き出し・印刷に使う図面：「金具を表示」が切なら、金具の図形を除いた複製（SVG・DXF・PDF・印刷）。 */
const outputDoc = () => viewShow.hardware ? doc : { ...doc, shapes: doc.shapes.filter(s => !isHardwareShape(s)) };
const VIEW_FREE_TYPES = ['text', 'dimension', 'fold', 'image'];
const viewShows = s => VIEW_FREE_TYPES.includes(s.type) || viewShow[s.lineStyle === 'dashed' || s.layer === 'guide' ? 'dashed' : 'solid'];
try { const v = JSON.parse(localStorage.getItem('leather-cad.view') || '{}'); if (v.solid === false) viewShow.solid = false; if (v.dashed === false) viewShow.dashed = false; } catch { /* 保存できない環境でも操作を続ける */ }
const visible = s => layerVisible(s) && !s.holeLink && !hwHidden(s) && (exporting || viewShows(s));
/** 三面図・金具の自動生成など、図形の数値を使う計算では、実線・点線の表示切り替えを見ない（画面だけの切り替えのため）。 */
const visibleData = s => layerVisible(s) && !s.holeLink;
const editable = s => layerEditable(s); /* holeLink も「選べる」側（全選択・範囲選択に入れて、コピー・移動・複製に穴ごと付けるため）。クリックでは選ばれない（visible で除く） */
// 文字・寸法・折り線・下絵は縫い経路・オフセット・面取りの対象にしない。
const stitchable = s => !['text', 'dimension', 'fold', 'image'].includes(s.type) && !s.holeLink; /* 見えない補助の線（holeLink）は、目打ち・オフセット・クリックの当たり判定の相手にしない */
const partOf = s => doc.parts.find(p => p.shapeIds.includes(s.id)) || null;
const layerName = l => l.name === l.id && ['pattern', 'hardware', 'guide'].includes(l.id) ? t('layer.' + l.id) : l.name;
/** 層 id が無ければ作って返す（金具を置くときなど）。2番目（型紙の次）に入れる。 */
function ensureLayer(d, id) { if (!d.layers.some(l => l.id === id)) d.layers.splice(Math.min(1, d.layers.length), 0, { id, name: id, visible: true, locked: false }); return id; }

function selectedShapeIds() {
  const ids=new Set(doc.shapes.filter(s=>selected.has(s.id)&&editable(s)).map(s=>s.id));
  for(const p of doc.paths) if(p.shapeIds.some(id=>ids.has(id)) && p.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id))))p.shapeIds.forEach(id=>ids.add(id));
  for(const p of doc.paths) if(p.shapeIds.some(id=>!editable(doc.shapes.find(s=>s.id===id))))p.shapeIds.forEach(id=>ids.delete(id));
  return ids;
}
let ownPathsCache = null; const ownPaths = () => (ownPathsCache ||= ownHolePathIds(doc)); /* 独立した穴（.lcc の穴）の経路の集まり。描き直し・変更のたびに作り直す */
function holeVisible(h) { if (holeIsOwn(h, ownPaths())) return true; const p=doc.paths.find(p=>p.id===h.pathId);return p && p.shapeIds.every(id=>{const s=doc.shapes.find(s=>s.id===id);return s&&(layerVisible(s)||s.layer==='guide');}); } /* ガイドの層を隠しても、ガイドの線に乗った穴は消さない（穴は目印の線ではない） */
function holeEditable(h) { if (holeIsOwn(h, ownPaths())) return true; const p=doc.paths.find(p=>p.id===h.pathId);return p && p.shapeIds.every(id=>{const s=doc.shapes.find(s=>s.id===id);return s&&(layerEditable(s)||s.layer==='guide');}); }
function loadTools() {
  try { const list=JSON.parse(localStorage.getItem('leather-cad.tools')); if(Array.isArray(list)&&list.length){const d=newDoc();d.tools=list;if(validateDoc(d)){const have=new Set(list.map(x=>x.id)),added=defaultTools().filter(x=>!have.has(x.id));return added.length?[...list,...added]:list;}} } catch { /* 保存制限・旧設定は既定値で継続。 */ } /* 保存済みの工具一覧に、あとから増えた既定の工具（3.95mm など）が無いときは、足して返す */
  return defaultTools();
}
function persistTools() { try { localStorage.setItem('leather-cad.tools',JSON.stringify(doc.tools)); } catch { $('hint').textContent=t('storageUnavailable'); } }
/** 既定の工具の id：「既定にする」で決めたもの。無ければ 3.95mm の2本刃（2026-10-16 事業主指示）。いまの図面に無ければ空。 */
function defaultToolId() { let id = 'diamond-3.95-2'; try { id = localStorage.getItem('leather-cad.defaultTool') || id; } catch { /* 保存できなくても既定は 3.95mm */ } return doc.tools.some(t => t.id === id) ? id : (doc.tools.some(t => t.id === 'diamond-3.95-2') ? 'diamond-3.95-2' : ''); }
/** 3.95mm（2本刃）の工具が無い古い図面には足す（元の工具は変えない）。開いた図面でも、新しく打つ穴の既定が 3.95mm になるように。 */
function withDefaultTool(d) { if (Array.isArray(d.tools) && !d.tools.some(t => t.id === 'diamond-3.95-2')) { const add = defaultTools().find(t => t.id === 'diamond-3.95-2'); if (add) d.tools = [...d.tools, add]; } return d; }
/** 順目・逆目：押した側を選ぶ（いま選んでいる側を押しても反対にはならない）。 */
function slantPick(rev) { const el = $('reverseSlant'); if (el.checked === rev) return; el.checked = rev; el.dispatchEvent?.(new Event('change', { bubbles: true })); }
function refreshTools() {
  $('defaultMark').value=doc.mark; $('dotD').value=doc.dotD;
  const current=$('stitchTool').value; $('stitchTool').textContent='';
  for(const tool of doc.tools){const option=document.createElement('option');option.value=tool.id;option.textContent=tool.name===tool.id?t('toolSummary',{kind:t(tool.kind),pitch:tool.pitch,teeth:tool.teeth}):tool.name;$('stitchTool').appendChild(option);}
  $('stitchTool').value=doc.tools.some(t=>t.id===current)?current:defaultToolId()||doc.tools[0]?.id||'';   /* 選んでいた工具が無い図面でも、図面の先頭（4mm など）ではなく既定の工具（3.95mm か、「既定にする」で決めた工具）にする */
  const to=$('toolReassignTo'), keepTo=to.value; to.textContent=''; for(const tool of doc.tools){const o=document.createElement('option');o.value=tool.id;o.textContent=tool.name===tool.id?t('toolSummary',{kind:t(tool.kind),pitch:tool.pitch,teeth:tool.teeth}):tool.name;to.appendChild(o);} if(doc.tools.some(t=>t.id===keepTo))to.value=keepTo;
  fillTool();
}
/** 穴の工具を付け替える（fromId の穴を toId へ。onlySelected なら選択中の穴だけ）。戻り値は付け替えた穴数。 */
function reassignTool(fromId, toId, onlySelected = false) {
  if (!fromId || !toId || fromId === toId || !doc.tools.some(t => t.id === toId)) return 0; let n = 0;
  commit(() => { for (const h of doc.holes) if (h.toolId === fromId && (!onlySelected || selected.has(h.id))) { h.toolId = toId; n++; } if (!onlySelected) for (const p of doc.paths) for (const seg of p.segments) if (seg.toolId === fromId) seg.toolId = toId; });
  $('hint').textContent = t('toolReassigned', { n }); return n;
}
/** 現物合わせ用のテスト片：今の工具の穴を 1 列（10 個）と 50mm の目盛りを実寸で印刷する。 */
function printToolStrip() {
  const tool = doc.tools.find(t => t.id === $('stitchTool').value); if (!tool) return null;
  const tmp = newDoc(); /* テスト片は全部「型紙」の層に置く（ガイドは印刷に出ないため） */ tmp.tools = [tool]; const len = tool.pitch * 9;
  tmp.shapes.push({ id: 's1', layer: 'pattern', type: 'line', x1: 10, y1: 15, x2: 10 + len, y2: 15 }, { id: 's2', layer: 'pattern', type: 'line', x1: 10, y1: 25, x2: 60, y2: 25 }, { id: 's3', layer: 'pattern', type: 'line', x1: 10, y1: 23, x2: 10, y2: 27 }, { id: 's4', layer: 'pattern', type: 'line', x1: 60, y1: 23, x2: 60, y2: 27 }, { id: 's5', layer: 'pattern', type: 'text', x: 10, y: 33, text: `${tool.name}  ${tool.pitch}mm  ${tool.holeW}x${tool.holeH}mm  ${tool.angleDeg}deg   |---- 50mm ----|`, sizeMm: 3, angleDeg: 0 });
  tmp.paths.push({ id: 'p1', shapeIds: ['s1'], reversed: false, closed: false, segments: [{ from: 0, to: len, toolId: tool.id, pitch: tool.pitch, mode: 'fixed' }], mark: 'tool' });
  for (let i = 0; i <= 9; i++) tmp.holes.push({ id: 'h' + i, pathId: 'p1', s: i * tool.pitch, x: 10 + i * tool.pitch, y: 15, angleDeg: tool.angleDeg, toolId: tool.id, mark: 'tool' });
  return printPages(tmp, { dots: false });   /* 現物の刃と比べる紙なので、「縫い穴を点で印刷する」が入っていても穴の形のまま */
}
function fillTool() {
  const tool=doc.tools.find(t=>t.id===$('stitchTool').value);if(!tool)return;
  for(const key of ['name','kind','pitch','teeth','holeW','holeH','holeD','angleDeg'])$('tool-'+key).value=tool[key];
}
/** 目打ちのツールの穴の大きさ（幅・高さ）を、図面の菱の線に合わせる（事業主の指摘 2026-10-18「菱目の大きさがバラバラ・外周と同じ大きさにしたい」）。
 *  選んだ菱の線があればその大きさ、無ければ図面でいちばん多い大きさ（0.01mm に丸めて数える）。変えるのは、いま選んでいるツールと、図面の穴が使っている菱形のツール。ピッチ・歯数・角度は変えない。 */
function fitToolsToDiamondLines() {
  const chosen = diamondLoopSizes(doc.shapes.filter(sh => selected.has(sh.id))), sizes = chosen.length ? chosen : diamondLoopSizes(doc.shapes.filter(sh => layerVisible(sh) && !sh.holeLink));
  if (!sizes.length) { $('hint').textContent = t('toolFitNone'); return; }
  const key = z => z.w.toFixed(2) + 'x' + z.h.toFixed(2), count = new Map(); for (const z of sizes) count.set(key(z), (count.get(key(z)) || 0) + 1);
  const best = [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0], same = sizes.filter(z => key(z) === best), w = +(same.reduce((m, z) => m + z.w, 0) / same.length).toFixed(2), h = +(same.reduce((m, z) => m + z.h, 0) / same.length).toFixed(2);
  if (!(w >= 0.1 && h >= 0.1)) { $('hint').textContent = t('toolFitNone'); return; }
  const ids = new Set([$('stitchTool').value, ...doc.holes.map(x => x.toolId)]), tools = doc.tools.filter(tl => ids.has(tl.id) && tl.kind === 'diamond');
  if (!tools.length) { $('hint').textContent = t('toolFitNone'); return; }
  commit(() => { for (const tl of tools) { tl.holeW = w; tl.holeH = h; } });
  refreshTools(); fillTool(); persistTools();
  $('hint').textContent = t('toolFitDone', { w, h, n: sizes.length, tools: tools.map(tl => tl.name).join('・') });
}
function registerTool(replace) {
  const tool={id:replace?$('stitchTool').value:freshId(doc.tools,'tool'),mark:'tool'};
  for(const key of ['name','kind','pitch','teeth','holeW','holeH','holeD','angleDeg'])tool[key]=['name','kind'].includes(key)?$('tool-'+key).value:Number($('tool-'+key).value);
  const sample=newDoc();sample.tools=[tool];if(!tool.name.trim()||!validateDoc(sample)){ $('hint').textContent=t('invalidTool');return; }
  commit(()=>{const i=doc.tools.findIndex(t=>t.id===tool.id);if(i>=0)doc.tools[i]=tool;else doc.tools.push(tool);});
  refreshTools();$('stitchTool').value=tool.id;fillTool();manualNext=null;persistTools();
}
/** 新しく置く穴の刃の傾き（度）。既定は順目＝左から右の線で「／」（工具の傾きの符号を反転）。「逆目」にチェックすると「＼」（工具の傾きのまま）。 */
function slantOf(tool) { return $('reverseSlant').checked ? tool.angleDeg : -tool.angleDeg; }
function stitchOptions() {
  const start=Number($('offsetStart').value),end=Number($('offsetEnd').value),from=Number($('segmentFrom').value),raw=$('segmentTo').value,to=raw.trim()===''?Infinity:Number(raw);
  if(![start,end,from].every(n=>Number.isFinite(n)&&n>=0)||!(to>=from))throw new Error(t('invalidNumber'));
  return {offsetStart:start,offsetEnd:$('placement').value==='equal'?start:end,from,to,variable:$('placement').value!=='fixed',corner:$('cornerMode').value};
}
function routeForHit(hit) {
  let saved=doc.paths.find(p=>p.shapeIds.includes(hit.id));
  if(saved)return {saved,route:resolvePath(doc,saved),fresh:false};
  const candidates=$('chain').checked?doc.shapes.filter(s=>editable(s)&&stitchable(s)):[hit], chain=chainShapes(candidates).find(p=>p.shapeIds.includes(hit.id));
  if(!chain)return null;
  // 既に別の縫い経路に属する図形へは経路をまたがせない。
  const owned=new Set(doc.paths.flatMap(p=>p.shapeIds));
  const route=chain.shapeIds.some(id=>owned.has(id))?chainShapes([hit])[0]:chain;
  saved={id:freshId(doc.paths,'p'),shapeIds:route.shapeIds,reversed:$('reversePath').checked,closed:route.closed,segments:[],mark:'tool'};
  return {saved,route:{...route,reversed:saved.reversed},fresh:true};
}
/** 目打ち／目印ツールのクリック処理。markKind が 'tool' 以外（'dot'）なら、線・曲線の上の最寄り位置に点の目印を1つ打つ。 */
/** 経路 route（図形 ids）の上で、クリックの位置 p をはさむ、ほかの図形との交点から交点までの区間 [a, b]（経路の長さに沿った位置）。交点が無ければ全体。 */
function spanBetweenIntersections(route, ids, p) {
  const len = arcLength(route), mine = doc.shapes.filter(s => ids.includes(s.id)), others = doc.shapes.filter(s => !ids.includes(s.id) && visible(s) && stitchable(s)), cuts = [0, len];
  for (const q of allIntersections([...mine, ...others])) { if (!(q.ids.some(id => ids.includes(id)) && q.ids.some(id => !ids.includes(id)))) continue; const pr = projectOnPath(route, q); if (distance(pr, q) < 0.05) cuts.push(pr.s); }
  const sorted = [...new Set(cuts.map(v => Math.round(v * 1e4) / 1e4))].sort((x, y) => x - y), sc = projectOnPath(route, p).s; let k = 0; while (k + 2 < sorted.length && sc > sorted[k + 1]) k++;
  return { a: sorted[k], b: sorted[k + 1] };
}
function stampAt(p,single=false,markKind='tool',span=false) {
  const hit=doc.shapes.filter(s=>editable(s)&&stitchable(s)).reverse().find(s=>distTo(s,p)<=8/scale),tool=doc.tools.find(t=>t.id===$('stitchTool').value);
  if(!hit||!tool)return;
  try {
    const state=routeForHit(hit);if(!state?.route)return;
    const {saved,fresh}=state;
    if(!saved.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id))))return;
    const isMark=markKind!=='tool',reverse=isMark?!!saved.reversed:$('reversePath').checked, route={...state.route,reversed:reverse},len=arcLength(route),opts=stitchOptions(),manual=$('placement').value==='manual'||single;
    const sp=span&&!isMark?spanBetweenIntersections(route,saved.shapeIds,p):null; /* Shift+クリック：交点から交点までの区間だけに打つ */
    const from=isMark?0:Math.max(opts.from,opts.offsetStart+(sp?sp.a:0)),to=isMark?len:Math.min(opts.to,(sp?sp.b:len)-opts.offsetEnd); /* 目印は始端の空き・区間設定に縛られず、線上のどこにでも打てる */
    if(from>to || len<1e-9){$('hint').textContent=t('invalidRange');return;}
    let points,next=null;
    if(manual){
      let projected=projectOnPath(route,p).s;
      if(saved.closed&&Math.abs(projected-len)<1e-7)projected=0;
      let start=single?projected:manualNext?.pathId===saved.id&&manualNext.reversed===reverse?manualNext.s:projected;
      start=Math.max(from,start);
      if(start>to+1e-7){$('hint').textContent=t('pathEnd');return;}
      const result=toothPositions({...tool,teeth:single?1:tool.teeth},start,route);points=result.points.filter(p=>p.s<=to+1e-7);next=result.nextS;
    }else{
      points=pointsAlongShape(route,tool.pitch,{offsetStart:from,offsetEnd:len-to,variable:opts.variable});
      const corners=cornerHoles(route,opts.corner).filter(p=>p.s>=from-1e-7&&p.s<=to+1e-7);
      for(const c of corners){points=points.filter(p=>Math.abs(p.s-c.s)>1e-6);points.push(c);}
      if(opts.corner==='none'){const corners=cornerHoles(route);points=points.filter(p=>!corners.some(c=>Math.abs(c.s-p.s)<1e-6));}
    }
    commit(()=>{
      if(fresh)doc.paths.push(saved);
      if(saved.reversed!==reverse){saved.reversed=reverse;doc.holes.filter(h=>h.pathId===saved.id).forEach(h=>{const s=len-h.s;h.s=saved.closed&&Math.abs(s-len)<1e-7?0:s;});saved.segments=saved.segments.map(s=>({...s,from:len-s.to,to:len-s.from}));}
      if(!manual)doc.holes=doc.holes.filter(h=>h.pathId!==saved.id||h.s<from-1e-7||h.s>to+1e-7);
      if(!manual){saved.segments=saved.segments.flatMap(s=>s.to<from||s.from>to?[s]:[...(s.from<from?[{...s,to:from}]:[]),...(s.to>to?[{...s,from:to}]:[])]);}
      const added=[];
      for(const p of points){
        const position=saved.closed && Math.abs(p.s-len)<1e-7?0:p.s;
        if(doc.holes.some(h=>h.pathId===saved.id&&Math.abs(h.s-position)<1e-5))continue;
        const angle=isMark?p.angleDeg:($('followTangent').checked?p.angleDeg:0)+slantOf(tool),id=freshId(doc.holes,'h');
        doc.holes.push({...p,s:position,id,pathId:saved.id,toolId:tool.id,angleDeg:angle,mark:markKind});added.push(id);
      }
      saved.segments.push({from:manual?(points[0]?.s??from):from,to:manual?(points.at(-1)?.s??from):to,toolId:tool.id,pitch:tool.pitch,mode:manual?'manual':$('placement').value});
      selected=new Set(added);
    });
    manualNext=manual&&!single?{pathId:saved.id,s:next,reversed:reverse}:null;
    $('hint').textContent=t(manualNext?'nextStamp':'placed',{count:points.length,s:next?.toFixed(2)})+(sp?' '+t('stitchSpanNote',{a:sp.a.toFixed(1),b:sp.b.toFixed(1)}):'');draw();
  }catch(err){$('hint').textContent=err.message;}
}
/** 目打ちカードの「個数」（両端の穴を含む総数）。空欄・2未満なら 0。 */
function stitchCountN() { const n = Math.floor(Number($('stitchCount').value)); return Number.isFinite(n) && n >= 2 ? Math.min(n, 500) : 0; }
/** 配置方法：固定ピッチ・可変ピッチ・個数指定の3つ。保存済みの設定にある旧い値（均等・手動）は、近い方法に読み替える。 */
function placementKind() { const v = $('placement').value; return v === 'variable' || v === 'equal' ? 'variable' : v === 'count' ? 'count' : 'fixed'; }
/** 個数の欄は、配置方法が「個数指定」のときだけ見せる。 */
function syncPlacementFields() { const el = $('l-stitchCount'); if (el) el.hidden = $('placement').value !== 'count'; }
/** クリック位置の近くにある線ごとに、その線（つながった線の経路）の上の点を集める。点は、端・交点・すでにある穴にいちばん近いものへ吸着（画面14px以内）。無ければ、クリックした位置に一番近い線上の点。交点では複数の線が重なるので、候補は線の数だけ返す。 */
function stitchPointCandidates(w) {
  const out = [], seen = new Set();
  for (const hit of doc.shapes.filter(s => editable(s) && stitchable(s)).reverse()) {
    if (distTo(hit, w) > 8 / scale) continue;
    const state = routeForHit(hit); if (!state?.route) continue; const { saved, route } = state, key = saved.shapeIds.join(',');
    if (seen.has(key) || !saved.shapeIds.every(id => editable(doc.shapes.find(x => x.id === id)))) continue; seen.add(key);
    const ids = saved.shapeIds, len = arcLength(route), mine = doc.shapes.filter(x => ids.includes(x.id)), others = doc.shapes.filter(x => !ids.includes(x.id) && visible(x) && stitchable(x)), cands = [0, len];
    for (const q of allIntersections([...mine, ...others])) { if (!(q.ids.some(id => ids.includes(id)) && q.ids.some(id => !ids.includes(id)))) continue; const pr = projectOnPath(route, q); if (distance(pr, q) < 0.05) cands.push(pr.s); }
    for (const sh of mine) { const mp = pointAtLength(sh, arcLength(sh) / 2), pr = projectOnPath(route, mp); if (distance(pr, mp) < 0.05) cands.push(pr.s); } /* 図形（線）の中心（中点）にも吸い付く（事業主指摘 2026-10-17：終点を図形の中心に合わせたいがスナップが出ない） */
    if (!state.fresh) for (const sg of saved.segments) cands.push(sg.from, sg.to); /* 前に打った区間の始まり・終わり（つなぎ目）も吸着の点：隣のピッチの位置より、ちょうどそこをクリックしたときは、そこが優先される */
    if (!state.fresh) { const cur = doc.tools.find(x => x.id === $('stitchTool').value); for (const h of doc.holes) if (h.pathId === saved.id) { cands.push(h.s); /* 隣のピッチの位置（穴の位置 ± ピッチ）にも吸い付く：前の続きを、同じ固定幅でぴったり続けられる（事業主指摘 2026-10-17：均等化した場所だけで、隣のピッチからだとずれる） */ for (const pt of new Set([cur?.pitch, doc.tools.find(x => x.id === h.toolId)?.pitch].filter(v => Number.isFinite(v) && v > 0))) for (const q of [h.s - pt, h.s + pt]) if (q > 1e-6 && q < len - 1e-6) cands.push(q); } }
    let best = null, bd = Infinity; for (const c of cands) { const d = distance(pointAtLength(route, c), w); if (d < bd) { bd = d; best = c; } }
    const s = best !== null && bd <= 14 / scale ? best : projectOnPath(route, w).s;
    /* 別の経路の既存の穴にも吸着する（画面14px以内・その線から 1.5mm 以内）。吸着先より穴のほうがクリックに近いとき、その穴を「0番目の穴」とする：線の端より外にある穴なら、anchorS＝線の外の位置（始点側 −距離／終点側 長さ＋距離）。打ち始めは、この穴からピッチを続けて数える（つなぎ目を越えても間隔が変わらない・事業主指摘 2026-10-16） */
    let anchorS, ah = null, adist = Infinity;
    for (const h of doc.holes) { if (h.pathId === saved.id) continue; const dh = Math.hypot(h.x - w.x, h.y - w.y); if (dh > 14 / scale || dh >= adist) continue; if (best !== null && bd <= 14 / scale && dh >= bd - 1e-9) continue; const pr = projectOnPath(route, h); if (distance(pr, h) > 1.5) continue; ah = { h, pr }; adist = dh; }
    let sUse = s; if (ah) { const { h, pr } = ah; if (pr.s <= 1e-6) { anchorS = -distance(pointAtLength(route, 0), h); sUse = 0; } else if (pr.s >= len - 1e-6) { anchorS = len + distance(pointAtLength(route, len), h); sUse = len; } else { anchorS = pr.s; sUse = pr.s; } }
    out.push({ key, state, s: sUse, anchorS, p: pointAtLength(route, sUse) });
  }
  return out;
}
/** 目打ち：始点→終点の順に2回クリックして、その間に打つ。固定ピッチ＝始点からピッチずつ、終点を超えない所まで／可変ピッチ＝両端を含めて、間隔をそろえて／個数指定＝両端を含めて n 個を等間隔。
 *  つながった線もたどる（途中の交点は無視）。同じ位置の穴は1つにまとめ、線は切らない。始点・終点を決める前のクリックでは、何も打たない。 */
/** 目打ち（範囲）の1区間の計画：pair（始点の候補 first・終点の候補 c）の間に打つ穴を決める（図面は変えない）。失敗は { error: 案内の文 }。成功は { apply, info }。apply() は commit の中で呼ぶと、穴を打って、打った穴の id の一覧を返す。
 *  opt：noStartOffset／noEndOffset＝その側は「つなぎ目」なので、始端・終端の空きを入れない／forceAnchor＝始点の穴を、ちょうど anchorS に打った扱いにする（最初の穴は1ピッチ先）／jointS＝この経路の上のつなぎ目の位置（そこにあった前の穴は消す）。 */
/** 固定ピッチの最後の穴が、終点より、これ以下（mm）手前に来るときは、終点ぴったりに置く。目で合わせた「ぴったり」は、数字ではわずかにずれるため（事業主指摘 2026-10-17：つなぎ目とピッチをぴったりにしたつもりなのに、つなぎ目の穴が目落ちする）。 */
const STITCH_END_TOL_MM = 0.1;
function stitchRangePlan(pair, kind, n, tool, opt = {}) {
  const { saved, fresh, route } = pair.c.state, len = arcLength(route), lo = Math.min(pair.first.s, pair.c.s), hi = Math.max(pair.first.s, pair.c.s);
  let points, pitch, mode, leftover = null, anchoredHole = false; /* anchoredHole＝始点が、別の経路の既存の穴に吸着した（固定ピッチ） */ /* leftover＝固定ピッチのあまり（mm・終点側）。固定ピッチ以外は null */
  try {
    if (kind === 'count') { pitch = n > 1 ? (hi - lo) / (n - 1) : tool.pitch; mode = 'manual'; points = Array.from({ length: n }, (_, i) => { const s = i === n - 1 ? hi : lo + pitch * i; return { ...pointAtLength(route, s), s }; }); }
    else {
      /* 固定ピッチは、先にクリックした点（始点）から数え始める。始点が線の上の位置の大きいほう（hi）なら、hi から lo のほうへ数える。始端・終端の空きも、先にクリックした側が始端（事業主指摘 2026-10-16：右辺中央から上下へ打つと、下は点線側から数えていて、折り返しても重ならなかった） */
      const opts = stitchOptions(), startAtHi = pair.first.s > pair.c.s + 1e-9, offS = opt.noStartOffset ? 0 : opts.offsetStart, offE = opt.noEndOffset ? 0 : opts.offsetEnd, from = lo + (startAtHi ? offE : offS), to = hi - (startAtHi ? offS : offE); pitch = tool.pitch; mode = kind;
      if (from > to || len < 1e-9) return { error: t('invalidRange') };
      const anchorS = pair.first.anchorS; /* 始点を既存の穴に置いたとき：その穴を 0 番目として、ピッチを続けて数える */
      if (kind === 'fixed' && anchorS !== undefined && (opt.forceAnchor || Math.abs(anchorS - pair.first.s) > 1e-6)) {
        anchoredHole = true; points = []; if (!startAtHi) { for (let sp = anchorS + Math.max(1, Math.ceil((from - anchorS - 1e-9) / tool.pitch)) * tool.pitch; sp <= to + STITCH_END_TOL_MM; sp += tool.pitch) { const q = Math.min(sp, to); points.push({ ...pointAtLength(route, q), s: q }); } }
        else { for (let sp = anchorS - Math.max(1, Math.ceil((anchorS - to - 1e-9) / tool.pitch)) * tool.pitch; sp >= from - STITCH_END_TOL_MM; sp -= tool.pitch) { const q = Math.max(sp, from); points.push({ ...pointAtLength(route, q), s: q }); } points.sort((p, q) => p.s - q.s); }
      }
      else if (kind === 'fixed' && startAtHi) { const nFixed = Math.floor((to - from + STITCH_END_TOL_MM) / tool.pitch); points = Array.from({ length: nFixed + 1 }, (_, i) => { const sp = Math.max(from, to - i * tool.pitch); return { ...pointAtLength(route, sp), s: sp }; }); }
      else if (kind === 'fixed' && !saved.closed) { const nFixed = Math.floor((to - from + STITCH_END_TOL_MM) / tool.pitch); points = Array.from({ length: nFixed + 1 }, (_, i) => { const sp = Math.min(from + i * tool.pitch, to); return { ...pointAtLength(route, sp), s: sp }; }); }
      else points = pointsAlongShape(route, tool.pitch, { offsetStart: from, offsetEnd: len - to, variable: kind === 'variable' });
      const corners = cornerHoles(route, opts.corner).filter(p => p.s >= from - 1e-7 && p.s <= to + 1e-7);
      for (const c of corners) { points = points.filter(p => Math.abs(p.s - c.s) > 1e-6); points.push(c); }
      if (opts.corner === 'none') { const cs = cornerHoles(route); points = points.filter(p => !cs.some(c => Math.abs(c.s - p.s) < 1e-6)); }
      points.sort((p, q) => p.s - q.s);
      if (kind === 'fixed' && points.length) leftover = Math.max(0, startAtHi ? points[0].s - from : to - points.at(-1).s); /* 終点側に、どれだけあまるか */
    }
  } catch (err) { return { error: err.message }; }
  const joinPrev = saved.segments.find(sg => Math.abs(sg.to - lo) < 1e-6 && sg.toolId); /* 反対側の隣の区間（終点が、今打つ区間の始点側 lo にある）：今の区間を反対側（hi）から数えると、lo にぴったり穴が来ないので、つなぎ目が目落ちする（事業主指摘 2026-10-17：続きで目打ちをするとかならず目落ちする） */
  const joinNext = saved.segments.find(sg => Math.abs(sg.from - hi) < 1e-6 && sg.toolId); /* 隣の区間（始点が、今打つ区間の終点にある）。つなぎ目の穴の補いに使う（区間を切り分ける前の状態で調べる） */
  const apply = () => {
    if (fresh) { if (doc.paths.some(q => q.id === saved.id)) saved.id = freshId(doc.paths, 'p'); doc.paths.push(saved); } /* 新しい経路の id は、計画を立てたときに決めたもの。つなぎ目を越えて2本とも新しい経路のとき、同じ id になるので、重なるときは付け直す（不具合記録 2026-10-17：後半の菱目が抜けた） */
    /* 指定した区間の中にあった同じ線の穴は、打ち直す。ただし区間の両端（つなぎ目）の穴は、新しい穴がそこに来るときだけ置き換える。固定ピッチは終点ぴったりには打たないので、両端まで消すと、隣の区間の端の穴が消えて歯抜けになる（事業主指摘 2026-10-16） */
    const posOf = p => saved.closed && Math.abs(p.s - len) < 1e-7 ? 0 : p.s, newPos = points.map(posOf), atEdge = h => (Math.abs(h.s - lo) < 1e-7 || Math.abs(h.s - hi) < 1e-7) && !(opt.jointS !== undefined && Math.abs(h.s - opt.jointS) < 1e-7);   /* つなぎ目（別の経路との境）の穴は、ピッチが変わるので前のものを消す */
    doc.holes = doc.holes.filter(h => h.pathId !== saved.id || h.s < lo - 1e-7 || h.s > hi + 1e-7 || (atEdge(h) && !newPos.some(q => Math.abs(q - h.s) < 1e-5)));
    saved.segments = saved.segments.flatMap(s => s.to < lo || s.from > hi ? [s] : [...(s.from < lo ? [{ ...s, to: lo }] : []), ...(s.to > hi ? [{ ...s, from: hi }] : [])]);
    const added = [];
    for (const p of points) {
      const pos = saved.closed && Math.abs(p.s - len) < 1e-7 ? 0 : p.s;
      if (doc.holes.some(h => h.pathId === saved.id && Math.abs(h.s - pos) < 1e-5)) continue;
      const id = freshId(doc.holes, 'h'); doc.holes.push({ ...p, s: pos, id, pathId: saved.id, toolId: tool.id, angleDeg: ($('followTangent').checked ? p.angleDeg : 0) + slantOf(tool), mark: 'tool' }); added.push(id);
    }
    if (joinNext && !doc.holes.some(h => h.pathId === saved.id && Math.abs(h.s - hi) < 1e-5)) { /* 隣の区間の始点（つなぎ目）の穴が無いときは補う。固定ピッチは終点ぴったりには打たないので、つなぎ目の穴が消えていると歯抜けのままになる（事業主指摘 2026-10-16）。向き・工具は、つなぎ目のすぐ隣の穴に合わせる */
      const jt = doc.tools.find(x => x.id === joinNext.toolId) || tool, nb = doc.holes.filter(h => h.pathId === saved.id && h.s > hi && h.toolId === jt.id).sort((p, q) => p.s - q.s)[0], pj = pointAtLength(route, hi), follow = $('followTangent').checked;
      const delta = nb ? nb.angleDeg - (follow ? pointAtLength(route, nb.s).angleDeg : 0) : slantOf(jt), id = freshId(doc.holes, 'h');
      doc.holes.push({ ...pj, s: hi, id, pathId: saved.id, toolId: jt.id, angleDeg: (follow ? pj.angleDeg : 0) + delta, mark: 'tool' }); added.push(id);
    }
    if (joinPrev && !doc.holes.some(h => h.pathId === saved.id && Math.abs(h.s - lo) < 1e-5)) { /* 隣の区間の終点（つなぎ目）の穴が無いときは補う。向き・工具は、つなぎ目のすぐ隣の穴に合わせる */
      const jt = doc.tools.find(x => x.id === joinPrev.toolId) || tool, nb = doc.holes.filter(h => h.pathId === saved.id && h.s < lo && h.toolId === jt.id).sort((p, q) => q.s - p.s)[0], pj = pointAtLength(route, lo), follow = $('followTangent').checked;
      const delta = nb ? nb.angleDeg - (follow ? pointAtLength(route, nb.s).angleDeg : 0) : slantOf(jt), id = freshId(doc.holes, 'h');
      doc.holes.push({ ...pj, s: lo, id, pathId: saved.id, toolId: jt.id, angleDeg: (follow ? pj.angleDeg : 0) + delta, mark: 'tool' }); added.push(id);
    }
    saved.segments.push({ from: lo, to: hi, toolId: tool.id, pitch, mode }); return added;
  };
  return { apply, info: { points, pitch, mode, leftover, anchoredHole, lo, hi, len } };
}
/** 始点の候補 c1 と終点の候補 c2 が別の経路で、どちらかの端どうしが 0.05 mm 以内で接していれば { j1, j2 }（それぞれの経路の、接している端の位置）。閉じた経路は対象外。 */
function stitchJoint(c1, c2) {
  if (c1.key === c2.key || c1.state.saved.closed || c2.state.saved.closed) return null;
  const r1 = c1.state.route, r2 = c2.state.route, L1 = arcLength(r1), L2 = arcLength(r2); let best = null;
  for (const j1 of [0, L1]) for (const j2 of [0, L2]) { const d = distance(pointAtLength(r1, j1), pointAtLength(r2, j2)); if (d <= STITCH_JOINT_GAP_MM && (!best || d < best.d)) best = { j1, j2, d }; }
  return best;
}
/** つなぎ目のすき間（端どうしの距離）がこれ以下なら、つながっているものとして越えて打つ。ピッチ（3.95mm など）に比べてごく小さなすき間（不具合記録 2026-10-17：0.16mm のすき間で打てなかった）。ピッチは、すき間も含めた長さで続ける。 */
const STITCH_JOINT_GAP_MM = 0.5;
/** 始点の線の候補と終点の線の候補のうち、端どうしがいちばん近いもののすき間（mm）。閉じた線・同じ線は除く。無ければ Infinity。「つながっていない」案内に、すき間の大きさを添えるため。 */
function stitchNearestGap(list1, list2) {
  let best = Infinity;
  for (const c1 of list1) for (const c2 of list2) {
    if (c1.key === c2.key || c1.state.saved.closed || c2.state.saved.closed) continue;
    const r1 = c1.state.route, r2 = c2.state.route, L1 = arcLength(r1), L2 = arcLength(r2);
    for (const j1 of [0, L1]) for (const j2 of [0, L2]) best = Math.min(best, distance(pointAtLength(r1, j1), pointAtLength(r2, j2)));
  }
  return best;
}
/** つなぎ目を越えて打つ：始点（経路A）→接している端→終点（経路B）。固定ピッチ専用。区間1（始点→接点）の最後の穴から、ピッチを続けて区間2（接点→終点）を打つ。2区間の計画を先に作り、1回の commit で打つ（元に戻すは1回）。 */
function stitchJointPunch(c1, c2, joint, kind, n, tool) {
  const { j1, j2 } = joint, plans = []; let r = 0;
  if (Math.abs(c1.s - j1) > 1e-6) { const p1 = stitchRangePlan({ first: c1, c: { ...c1, s: j1 } }, kind, n, tool, { noEndOffset: true, jointS: j1 }); if (p1.error) { $('hint').textContent = p1.error; return; } plans.push(p1); r = (p1.info.leftover ?? 0) + (joint.d ?? 0); }
  if (Math.abs(c2.s - j2) > 1e-6) {
    const L2 = arcLength(c2.state.route), keep = plans.length > 0, exact = keep && r < 0.005, anchorS = !keep ? undefined : exact ? j2 : j2 === 0 ? -r : L2 + r;
    const p2 = stitchRangePlan({ first: { key: c2.key, s: j2, anchorS }, c: c2 }, kind, n, tool, { noStartOffset: true, forceAnchor: exact, jointS: j2 }); if (p2.error) { $('hint').textContent = p2.error; return; } plans.push(p2);
  }
  if (!plans.length) { $('hint').textContent = t('countSame'); return; }
  countStage = null; commit(() => { selected = new Set(plans.flatMap(p => p.apply())); });
  const last = plans.at(-1).info, total = plans.reduce((sum, p) => sum + p.info.points.length, 0), left = last.leftover ?? 0;
  $('hint').textContent = t('rangeJointPlaced', { n: total, pitch: last.pitch.toFixed(2), a: Math.abs(c1.s - j1).toFixed(2), b: Math.abs(c2.s - j2).toFixed(2) }) + ' ' + (left < 0.005 ? t('rangeLeftNone') : t('rangeLeft', { r: left.toFixed(2) })); draw();
}
/** つなぎ目を越えて、個数指定で打つ：始点（経路A）→接している端→終点（経路B）に、両端を含めて n 個を等間隔に打つ。間隔は、始点から終点までの長さ（つなぎ目のすき間も含む）を n−1 等分。穴の位置は、始点から k×間隔 の所（経路A の接点までに入る分は経路A・残りは経路B）。 */
function stitchJointCount(c1, c2, joint, n, tool) {
  const { j1, j2 } = joint, gap = joint.d ?? 0, a = Math.abs(c1.s - j1), b = Math.abs(c2.s - j2), T = a + gap + b;
  if (!(n >= 2) || !(T > 1e-9)) { $('hint').textContent = t('invalidRange'); return; }
  const P = T / (n - 1), dir1 = j1 >= c1.s ? 1 : -1, dir2 = c2.s >= j2 ? 1 : -1, plans = [];
  const n1 = a < 1e-6 ? 0 : b < 1e-6 && gap < 1e-9 ? n : Math.min(n - 1, Math.floor(a / P + 1e-9) + 1), n2 = n - n1;   /* 経路A に入る個数（始点が接点なら 0・終点が接点なら全部） */
  if (n1 > 0) { const p1 = stitchRangePlan({ first: c1, c: { ...c1, s: c1.s + dir1 * (n1 - 1) * P } }, 'count', n1, tool, { jointS: j1 }); if (p1.error) { $('hint').textContent = p1.error; return; } plans.push(p1); }
  if (n2 > 0) { const off = Math.max(0, n1 * P - a - gap), p2 = stitchRangePlan({ first: { key: c2.key, s: j2 + dir2 * off }, c: c2 }, 'count', n2, tool, { jointS: j2 }); if (p2.error) { $('hint').textContent = p2.error; return; } plans.push(p2); }
  countStage = null; commit(() => { selected = new Set(plans.flatMap(p => p.apply())); });
  $('hint').textContent = t('rangeJointPlaced', { n, pitch: P.toFixed(2), a: a.toFixed(2), b: b.toFixed(2) }); draw();
}
/** 始点と同じ場所をもう一度クリックしたとき：その点（経路 c の位置 c.s）に菱目を1つだけ打つ。そこにすでに菱目があれば、増やさずに案内する。 */
function stitchSingleAt(c, tool) {
  const { saved, fresh, route } = c.state, q = pointAtLength(route, c.s); countStage = null;
  if (doc.holes.some(h => holeVisible(h) && Math.hypot(h.x - q.x, h.y - q.y) < 0.05)) { $('hint').textContent = t('singleExists'); draw(); return; }
  commit(() => {
    if (fresh) { if (doc.paths.some(p => p.id === saved.id)) saved.id = freshId(doc.paths, 'p'); doc.paths.push(saved); }
    const id = freshId(doc.holes, 'h'); doc.holes.push({ ...q, s: c.s, id, pathId: saved.id, toolId: tool.id, angleDeg: ($('followTangent').checked ? q.angleDeg : 0) + slantOf(tool), mark: 'tool' });
    saved.segments.push({ from: c.s, to: c.s, toolId: tool.id, pitch: tool.pitch, mode: 'manual' }); selected = new Set([id]);
  });
  $('hint').textContent = t('singleDone'); draw();
}
function rangeStitchClick(w) {
  const tool = doc.tools.find(x => x.id === $('stitchTool').value), kind = placementKind(), n = stitchCountN(), near = stitchPointCandidates(w);
  if (!tool || !near.length) { $('hint').textContent = t('countNoLine'); return; }
  if (kind === 'count' && !n) { $('hint').textContent = t('countNeedN'); return; }
  const pair = countStage ? near.map(c => ({ c, first: countStage.list.find(f => f.key === c.key) })).find(x => x.first && Math.abs(x.first.s - x.c.s) > 1e-6) : null;
  if (!pair) { /* 始点（交点では重なった線の全部を候補にして、2回目のクリックで同じ線に当たったものを使う） */
    if (countStage) { const same = near.find(c => countStage.list.some(f => f.key === c.key && Math.abs(f.s - c.s) < 1e-6)); if (same) { stitchSingleAt(same, tool); return; } } /* 始点と同じ場所（交点など）をもう一度クリック：そこに菱目を1つだけ打つ（事業主指示 2026-10-17） */
    if (countStage) { /* 始点とは別の線をクリックした：端が接している線どうしなら、つなぎ目を越えて打つ（固定ピッチだけ）。接していなければ、ここを新しい始点にして、そのことを案内する */
      for (const c2 of near) for (const c1 of countStage.list) { const joint = stitchJoint(c1, c2); if (joint) { if (kind === 'count') { stitchJointCount(c1, c2, joint, n, tool); return; } if (kind !== 'fixed') { $('hint').textContent = t('rangeJointFixedOnly'); return; } stitchJointPunch(c1, c2, joint, kind, n, tool); return; } }
      const gap = stitchNearestGap(countStage.list, near); countStage = { list: near }; $('hint').textContent = t('rangeStartMoved') + (gap > STITCH_JOINT_GAP_MM && gap <= 10 ? ' ' + t('rangeGapNote', { gap: gap.toFixed(2) }) : ''); draw(); return;
    }
    countStage = { list: near }; $('hint').textContent = t(kind === 'count' ? 'countStart' : 'rangeStart', { n }); draw(); return;
  }
  countStage = null;
  const plan = stitchRangePlan(pair, kind, n, tool); if (plan.error) { $('hint').textContent = plan.error; return; }
  const { points, pitch, leftover, anchoredHole, lo, hi } = plan.info;
  commit(() => { selected = new Set(plan.apply()); });
  $('hint').textContent = (kind === 'count' ? t('countPlaced', { n, pitch: pitch.toFixed(2), len: (hi - lo).toFixed(2) }) : t('rangePlaced', { n: points.length, pitch: pitch.toFixed(2), len: (hi - lo).toFixed(2) })) + (leftover === null ? '' : ' ' + (leftover < 0.005 ? t(anchoredHole ? 'rangeAnchorLeftNone' : 'rangeLeftNone') : t(anchoredHole ? 'rangeAnchorLeft' : 'rangeLeft', { r: leftover.toFixed(2) }))); draw();
}
function drawChainStops() { /* 分岐で止まった端に青い印（選択がそのままのときだけ） */
  if (!chainStops || chainStops.ids.size !== selected.size || ![...selected].every(id => chainStops.ids.has(id))) return;
  ctx.save(); ctx.strokeStyle = '#6fa8ff'; ctx.fillStyle = '#6fa8ff'; ctx.lineWidth = 2 / scale;
  for (const p of chainStops.stops) { ctx.beginPath(); ctx.arc(p.x, p.y, 7 / scale, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 / scale, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
/** 目打ち：マウスの近く（画面14px以内）にある、吸い付く点（端・線の中心・線と線の交点・すでにある穴）のうち、いちばん近いもの。なければ null。マウスを動かすたびに計算するので、近くの線（最大12本）だけで求める。 */
let stitchHover = null;
function stitchHoverAt(w) {
  const reach = 14 / scale, near = doc.shapes.filter(s => visible(s) && editable(s) && stitchable(s) && !['text', 'dimension', 'image'].includes(s.type) && distTo(s, w) <= reach * 1.5).slice(0, 12), pts = [];
  for (const s of near) { const len = arcLength(s); pts.push(pointAtLength(s, 0), pointAtLength(s, len), pointAtLength(s, len / 2)); }
  if (near.length >= 2) pts.push(...allIntersections(near));
  for (const h of doc.holes) if (holeVisible(h) && Math.hypot(h.x - w.x, h.y - w.y) <= reach) pts.push({ x: h.x, y: h.y });
  let best = null, bd = reach; for (const q of pts) { const d = distance(w, q); if (d <= bd) { bd = d; best = { x: q.x, y: q.y }; } } return best;
}
function drawStitchHover() { if (mode !== 'stitch' || !stitchHover || exporting) return; ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(80,200,255,.95)'; ctx.lineWidth = 2 / scale; ctx.beginPath(); ctx.arc(stitchHover.x, stitchHover.y, 5 / scale, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
function drawCountStage() { if (!countStage) return; const p = countStage.list[0].p; ctx.save(); ctx.strokeStyle = '#c9a96e'; ctx.lineWidth = 2 / scale; ctx.beginPath(); ctx.arc(p.x, p.y, 6 / scale, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
/** 目印の「基準の点から線に沿って○mm」。0 や空欄なら使わない（＝クリックした場所に打つ従来の動き）。 */
function markDistance() { const d = Number($('markDist').value); return Number.isFinite(d) && d > 0 ? d : 0; }
/** 目印ツールの基準の点：クリックした位置に一番近い、線の端・角・ガイドの点（吸着距離内）か、交点（スナップがオンで画面9px内）へ合わせる。どれも無ければクリックした位置のまま（線へはあとで射影する）。 */
function markSnapPoint(click) {
  let best = null, near = Infinity; const reach = magnetRadiusMm();
  if (reach > 0) for (const c of [...magnetEnds, ...magnetGuide]) { const d = distance(click, c); if (d < reach && d < near) { near = d; best = c; } }
  if ($('snap').checked) for (const c of snapCache) { const d = distance(click, c); if (d < 9 / scale && d < near) { near = d; best = c; } }
  return best ? { x: best.x, y: best.y } : click;
}
/** 線に沿って位置 s から距離 d 離れた位置。開いた線で端をはみ出すなら null。閉じた線は 1 周して戻る。 */
function markTargetS(s, d, closed, len) { const v = s + d; if (closed) return ((v % len) + len) % len; return v < -1e-9 || v > len + 1e-9 ? null : Math.max(0, Math.min(len, v)); }
/** 目印ツールの距離指定。1 回目のクリック＝基準の点（線の端・角は磁石で正確に）、2 回目のクリック＝進む向き。開いた線の端が基準なら向きは線の内側に決まるので 1 回で打つ。距離は線に沿って測る（つながった線は結合点をまたぐ）。 */
function markByDistance(click) {
  const d = markDistance(), reach = magnetRadiusMm(), second = stage?.kind === 'markBase'; let base = second ? click : markSnapPoint(click); /* 2回目は進む向きを決めるクリックなので吸着しない */
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distTo(s, base) <= 8 / scale);
  if (!hit) { $('hint').textContent = t('markNoLine'); return; }
  const state = routeForHit(hit); if (!state?.route) return;
  const closed = !!state.saved.closed, route = { ...state.route, reversed: !!state.saved.reversed }, len = arcLength(route);
  const key = [...state.saved.shapeIds].sort().join(','), s0 = projectOnPath(route, base).s;
  const place = (from, dir) => {
    const s = markTargetS(from, dir * d, closed, len);
    if (s === null) { $('hint').textContent = t('markOutside', { len: len.toFixed(1), d: d }); return false; }
    stage = null; stampAt(pointAtLength(route, s), true, 'dot'); return true;
  };
  if (!second || stage.key !== key) { /* 1 回目（別の線をクリックしたときも、そこから基準をやり直す） */
    const atStart = !closed && s0 < 1e-4, atEnd = !closed && s0 > len - 1e-4;
    if (atStart || atEnd) { place(s0, atStart ? 1 : -1); return; }
    const cand = [-1, 1].map(dir => { const s = markTargetS(s0, dir * d, closed, len); return s === null ? null : pointAtLength(route, s); });
    stage = { kind: 'markBase', key, at: pointAtLength(route, s0), s: s0, cand }; $('hint').textContent = t('markPickSide', { d: d }); draw(); return;
  }
  let diff = s0 - stage.s; if (closed) diff = ((diff + len / 2) % len + len) % len - len / 2;
  if (Math.abs(diff) < 1e-6) { $('hint').textContent = t('markSameSpot'); return; }
  place(stage.s, diff > 0 ? 1 : -1);
}
/** 分割数（2 以上の整数）。1 以下・空は 0（＝分割して打たない）。 */
function markDivisions() { const n = Math.floor(Number($('markDiv').value)); return Number.isFinite(n) && n >= 2 ? Math.min(n, 100) : 0; }
/** 目印ツールの分割指定。1 回目＝線の上の1点目（端・角は磁石で正確に）、2 回目＝同じ線の上の2点目。その間（線に沿って測る）を n 等分する位置に目印を打つ（2＝中心）。元に戻すは1回。 */
function markByDivision(click) {
  const n = markDivisions(), reach = magnetRadiusMm(), second = stage?.kind === 'markDiv'; let base = markSnapPoint(click);
  /* 交点では複数の線が重なる。クリック位置に乗っている線をすべて拾い（上にある線が先）、1点目はその全部の位置を覚え、2点目は1点目と共通の線を使う。 */
  const cands = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().filter(s => distTo(s, base) <= 8 / scale).map(hit => { const state = routeForHit(hit); if (!state?.route) return null; const route = { ...state.route, reversed: !!state.saved.reversed }; return { route, key: [...state.saved.shapeIds].sort().join(','), s: projectOnPath(route, base).s }; }).filter(Boolean);
  if (!cands.length) { $('hint').textContent = t('markNoLine'); return; }
  const common = second ? cands.find(c => stage.hits.some(h => h.key === c.key)) : null;
  if (!common) { const first = cands[0]; stage = { kind: 'markDiv', hits: cands.map(c => ({ key: c.key, s: c.s })), at: pointAtLength(first.route, first.s), cand: [] }; $('hint').textContent = t('markDivSecond', { n }); draw(); return; }
  const from = stage.hits.find(h => h.key === common.key).s, span = common.s - from; if (Math.abs(span) < 1e-6) { $('hint').textContent = t('markSameSpot'); return; }
  const before = undo.length; stage = null;
  for (let k = 1; k < n; k++) stampAt(pointAtLength(common.route, from + span * k / n), true, 'dot');
  if (undo.length > before + 1) undo.splice(before + 1); /* 途中の保存をまとめて、元に戻すを1回にする */
  $('hint').textContent = t('markDivDone', { n: n - 1 }); draw();
}
function holePosition(h,p) {
  if(!$('constrainHole').checked)return {...h,x:p.x,y:p.y};
  const saved=doc.paths.find(path=>path.id===h.pathId),route=saved&&resolvePath(doc,saved);if(!route)return h;
  const old=pointAtLength(route,h.s),next=projectOnPath(route,p);
  return {...h,x:next.x,y:next.y,s:next.s,angleDeg:h.angleDeg+($('followTangent').checked?next.angleDeg-old.angleDeg:0)};
}
/** 穴の傾きの種類：'fwd'（順目）・'rev'（逆目）・'other'（どちらでもない）。順目＝線の向きに対して、置くときの既定の傾き（工具の傾きの符号を反転）。逆目＝その鏡写し（誤差1°まで）。
 *  線が見つからない穴・傾きの区別がない工具（0°・90°）・どちらにも合わない穴は 'other'。 */
function holeSlantKind(h, tool, route) {
  const m180 = d => ((d % 180) + 180) % 180, near = (a, b) => { const d = m180(a - b); return Math.min(d, 180 - d) < 1; };
  if (!tool || !route || near(tool.angleDeg, -tool.angleDeg)) return 'other';
  const rel = h.angleDeg - pointAtLength(route, h.s).angleDeg;
  return near(rel, -tool.angleDeg) ? 'fwd' : near(rel, tool.angleDeg) ? 'rev' : 'other';
}
/** 選んだ穴の傾きを数える（情報カード用）。数えるのは、入れ替えの対象（菱目・切れ目）だけ。 */
function holeSlantCounts(hs) {
  const n = { fwd: 0, rev: 0, other: 0 }, routes = new Map();
  for (const h of hs) {
    const tool = doc.tools.find(x => x.id === h.toolId); if (!routes.has(h.pathId)) { const p = doc.paths.find(q => q.id === h.pathId); routes.set(h.pathId, p ? resolvePath(doc, p) : null); }
    n[holeSlantKind(h, tool, routes.get(h.pathId))]++;
  }
  return n;
}
/** 傾きを変える対象の穴の id：選んだ穴・選んだ線の経路の穴・選んだ線の上（0.5mm以内）に乗っている穴（穴の付いた線に重なった別の線を選んでも効く）。入れ替えと、順目・逆目にそろえるで共通。 */
function slantPickedIds() {
  const sel = doc.shapes.filter(s => selected.has(s.id) && s.type !== 'text' && s.type !== 'dimension' && s.type !== 'image'), picked = new Set(affectedHoles().map(h => h.id));
  for (const h of doc.holes) if (!picked.has(h.id) && holeEditable(h) && sel.some(s => distToShape(s, h) < 0.5)) picked.add(h.id);
  return picked;
}

/** 「順目⇔逆目」：選んだ線の上の菱目（菱目を選んでいればその菱目だけ）の傾きを、線の向きを軸に鏡写しにして、順目と逆目を入れ替える（事業主指示 2026-10-16）。
 *  対象は、選んだ線の経路の穴・選んだ穴・選んだ線の上（0.5mm以内）に乗っている穴（穴の付いた線に重なった別の線を選んでも効く）。点の目印・円の穴は対象外（傾きの意味が違う）。 */
function flipSlantOfSelection() {
  const picked = slantPickedIds();   /* 選んだ穴・選んだ線の経路の穴・選んだ線の上に乗っている穴 */
  const routes = new Map(), made = [];
  for (const h of doc.holes) {
    if (!picked.has(h.id) || !['diamond', 'slit'].includes(holeAppearance(h, doc)?.kind)) continue;
    if (!routes.has(h.pathId)) { const p = doc.paths.find(q => q.id === h.pathId); routes.set(h.pathId, p ? resolvePath(doc, p) : null); }
    const route = routes.get(h.pathId); if (route) made.push({ id: h.id, angleDeg: (((2 * pointAtLength(route, h.s).angleDeg - h.angleDeg) % 360) + 360) % 360 });
  }
  if (!made.length) { $('hint').textContent = t('noHolesToFlip'); return; }
  commit(() => { for (const m of made) { const h = doc.holes.find(x => x.id === m.id); if (h) h.angleDeg = m.angleDeg; } });
  $('hint').textContent = t('slantFlipped', { n: made.length });
}
/** 「順目に揃える／逆目に揃える」（事業主の選択 2026-10-18 案C）：選んだ菱目のうち、反対側の穴だけを入れ替えて、順目（'fwd'）または逆目（'rev'）にそろえる。
 *  どちらでもない穴（途中で角度を変えた穴・傾きの区別がない工具・線の無い穴）は、意図した角度を壊さないので変えない。対象は入れ替えと同じ（slantPickedIds）。何も変えないときは履歴に残さず、案内だけ出す。 */
function unifySlantOfSelection(kind) {
  const picked = slantPickedIds(), from = kind === 'fwd' ? 'rev' : 'fwd', routes = new Map(), made = []; let keep = 0;
  for (const h of doc.holes) {
    if (!picked.has(h.id) || !['diamond', 'slit'].includes(holeAppearance(h, doc)?.kind)) continue;
    if (!routes.has(h.pathId)) { const p = doc.paths.find(q => q.id === h.pathId); routes.set(h.pathId, p ? resolvePath(doc, p) : null); }
    const route = routes.get(h.pathId);
    if (holeSlantKind(h, doc.tools.find(x => x.id === h.toolId), route) === from) made.push({ id: h.id, angleDeg: (((2 * pointAtLength(route, h.s).angleDeg - h.angleDeg) % 360) + 360) % 360 }); else keep++;
  }
  const name = t(kind === 'fwd' ? 'slantNameFwd' : 'slantNameRev');
  if (!made.length) { $('hint').textContent = t(keep ? 'slantAlready' : 'noHolesToFlip', { name }); return; }
  commit(() => { for (const m of made) { const h = doc.holes.find(x => x.id === m.id); if (h) h.angleDeg = m.angleDeg; } });
  $('hint').textContent = t('slantUnified', { n: made.length, name, keep });
}
/** 「穴の点検」：選んだ線（経路）の上で、穴の間隔が空きすぎている所（歯抜け）を探し、隙間の中で等間隔に穴を補う（事業主指示 2026-10-16・補い方は「隙間の中で等間隔」・範囲は「選んだ線だけ」）。
 *  歯抜けとみなすのは、隣り合う同じ工具の穴の間隔が、ピッチの整数倍（2倍以上・誤差はピッチの0.3倍まで）のとき。わざと空けた所（整数倍でない隙間）は補わない。向きは両隣の穴の間をなめらかにつなぐ。 */
/** 隣の穴との間隔が、ピッチどおり（誤差15%以内）か。隣が無い（null）ときは、問わない。 */
const regularGap = (g, pitch) => g === null || Math.abs(g - pitch) <= 0.15 * pitch;
const MAX_GAP_HOLES = 3; /* 歯抜けは最大3個続きまで。それより長い空きは、わざと打っていない区間 */
const isGapLike = (g, pitch) => { const n = Math.round(g / pitch) - 1; return n >= 1 && n <= MAX_GAP_HOLES && Math.abs(g - (n + 1) * pitch) <= 0.3 * pitch; };
function findHoleGaps(wholeDoc = false) {
  /* 対象：選んだ図形の経路と、選んだ菱目の経路。さらに、選んだ線の上（0.5mm以内）に穴が乗っている経路（穴の付いた線に、別の線が重なっているとき、上の線を選んでも点検できる）。後者は、選んだ線の上にある歯抜けだけを補う（事業主指摘 2026-10-16 「反応なし」） */
  const ids = new Set(), onlyNear = new Set(), sel = doc.shapes.filter(s => selected.has(s.id) && s.type !== 'text' && s.type !== 'dimension' && s.type !== 'image');
  for (const p of doc.paths) if (wholeDoc || p.shapeIds.some(id => selected.has(id)) || doc.holes.some(h => h.pathId === p.id && selected.has(h.id))) ids.add(p.id);
  for (const p of doc.paths) if (!wholeDoc && !ids.has(p.id) && sel.length && doc.holes.some(h => h.pathId === p.id && sel.some(s => distToShape(s, h) < 0.5))) { ids.add(p.id); onlyNear.add(p.id); }
  const add = []; let gapCount = 0;
  for (const pid of ids) {
    const path = doc.paths.find(p => p.id === pid), route = path && resolvePath(doc, path); if (!route) continue;
    const hs = doc.holes.filter(h => h.pathId === pid && h.mark === 'tool' && holeEditable(h)).sort((p, q) => p.s - q.s);
    for (let i = 1; i < hs.length; i++) {
      const a = hs[i - 1], b = hs[i], tool = doc.tools.find(t => t.id === a.toolId); if (!tool || a.toolId !== b.toolId) continue;
      const g = b.s - a.s, n = Math.round(g / tool.pitch) - 1; if (n < 1 || n > MAX_GAP_HOLES || Math.abs(g - (n + 1) * tool.pitch) > 0.3 * tool.pitch) continue;
      const iv = k => k >= 1 && k < hs.length ? hs[k].s - hs[k - 1].s : null; let lo = i, hi = i; /* 続けて歯抜けの間隔（ピッチの整数倍）が並ぶ範囲を求め、その外側の間隔がピッチどおりのときだけ歯抜けとする */
      while (iv(lo - 1) !== null && isGapLike(iv(lo - 1), tool.pitch)) lo--; while (iv(hi + 1) !== null && isGapLike(iv(hi + 1), tool.pitch)) hi++;
      const fl = iv(lo - 1), fr = iv(hi + 1); if ((fl === null && fr === null) || !regularGap(fl, tool.pitch) || !regularGap(fr, tool.pitch)) continue; /* もともと2倍ピッチで並ぶ列・ピッチが途中で変わる列は、対象外 */
      const mid = pointAtLength(route, a.s + g / 2); if (onlyNear.has(pid) && !sel.some(s => distToShape(s, mid) < 0.5)) continue; /* 重なった線を選んだときは、その線の上の歯抜けだけ */
      gapCount++; const gid = gapCount, dAng = ((b.angleDeg - a.angleDeg + 540) % 360) - 180;
      for (let k = 1; k <= n; k++) { const t01 = k / (n + 1), s = a.s + g * t01, pt = pointAtLength(route, s); add.push({ ...pt, s, gapId: gid, pathId: pid, toolId: a.toolId, angleDeg: a.angleDeg + dAng * t01, mark: 'tool' }); }
    }
  }
  /* 別々の2本の経路が端でつながっているつなぎ目をまたぐ歯抜け（事業主指摘 2026-10-16：線のつなぎ目の穴が抜けていた）。経路の端から、いちばん近い穴までの距離を足して、ピッチの整数倍なら、隙間を等分して補う。選んだ経路か、選んだ線の上の経路が片側にあれば対象 */
  const ends = [];
  for (const p of doc.paths) {
    if (p.closed) continue; const route = resolvePath(doc, p); if (!route || route.closed) continue; const L = arcLength(route);
    const hs = doc.holes.filter(h => h.pathId === p.id && h.mark === 'tool' && holeEditable(h)); if (!hs.length) continue;
    const sorted = [...hs].sort((a, b) => a.s - b.s), first = sorted[0], last = sorted.at(-1);
    ends.push({ pid: p.id, route, L, which: 'start', pt: pointAtLength(route, 0), hole: first, d: first.s, nb: sorted.length > 1 ? sorted[1].s - first.s : null }, { pid: p.id, route, L, which: 'end', pt: pointAtLength(route, L), hole: last, d: L - last.s, nb: sorted.length > 1 ? last.s - sorted.at(-2).s : null });
  }
  const routeOf = new Map(ends.map(e => [e.pid, e.route]));
  for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
    const e1 = ends[i], e2 = ends[j]; if (e1.pid === e2.pid || Math.hypot(e1.pt.x - e2.pt.x, e1.pt.y - e2.pt.y) > 0.05 || e1.hole.toolId !== e2.hole.toolId) continue;
    if (!(ids.has(e1.pid) && !onlyNear.has(e1.pid)) && !(ids.has(e2.pid) && !onlyNear.has(e2.pid))) continue; /* どちらかが、選んだ図形の経路 */
    const tool = doc.tools.find(t => t.id === e1.hole.toolId); if (!tool) continue;
    const g = e1.d + e2.d, n = Math.round(g / tool.pitch) - 1; if (n < 1 || n > MAX_GAP_HOLES || Math.abs(g - (n + 1) * tool.pitch) > 0.3 * tool.pitch) continue;
    if ((e1.nb === null && e2.nb === null) || !regularGap(e1.nb, tool.pitch) || !regularGap(e2.nb, tool.pitch)) continue; /* 両隣がピッチどおりのときだけ */
    gapCount++; const gid = gapCount, dAng = ((e2.hole.angleDeg - e1.hole.angleDeg + 540) % 360) - 180;
    for (let k = 1; k <= n; k++) {
      const tt = k * g / (n + 1); let pid, s;
      if (tt <= e1.d) { pid = e1.pid; s = e1.which === 'end' ? e1.hole.s + tt : e1.hole.s - tt; } else { const u = tt - e1.d; pid = e2.pid; s = e2.which === 'start' ? u : e2.L - u; }
      s = Math.max(0, Math.min(pid === e1.pid ? e1.L : e2.L, s)); const pt = pointAtLength(routeOf.get(pid), s);
      add.push({ ...pt, s, gapId: gid, pathId: pid, toolId: e1.hole.toolId, angleDeg: e1.hole.angleDeg + dAng * k / (n + 1), mark: 'tool' });
    }
  }
  return { add, gapCount };
}
/** ボタンの表示：押す前に、歯抜けが何か所ありそうかを知らせる。選択・穴が変わったときだけ数え直す（描き直しのたびには数えない）。 */
/** 図面を開いた直後の案内：図面全体の歯抜けの可能性を数え、あれば案内の末尾に足す（無ければ何も言わない・事業主指示 2026-10-16）。 */
function noticeGaps() { let n = 0; try { const g = findHoleGaps(true); n = g.gapCount; openGapMarks = g.add; } catch { /* 数えられなくても、開く処理は止めない */ } if (n) $('hint').textContent = ($('hint').textContent ? $('hint').textContent + ' ' : '') + t('gapNotice', { n }); }
let gapKey = null, selGapMarks = [], openGapMarks = []; /* 歯抜けの赤い輪の位置。selGapMarks＝選んだ線の歯抜け（選んでいる間）／openGapMarks＝図面を開いた直後の図面全体の歯抜け（編集・タブ切り替えで消える） */
/** 歯抜けの場所に、赤い輪を描く（補う予定の位置・事業主指示 2026-10-16）。書き出し・印刷には出さない。 */
function drawGapMarks() {
  if (exporting) return; const list = [...selGapMarks, ...openGapMarks]; if (!list.length) return;
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2 / scale; const r = Math.max(2.2, 9 / scale);
  for (const m of list) { ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function refreshGapCount() {
  const key = [...selected].join(',') + '|' + undo.length + '|' + redo.length + '|' + doc.holes.length + '|' + activeTab + '|' + t('checkHoles'); if (key === gapKey) return; gapKey = key;
  const gs = selected.size ? findHoleGaps() : { gapCount: 0, add: [] }, n = gs.gapCount, changed = gs.add.length !== selGapMarks.length || gs.add.some((m, i) => Math.abs(m.x - selGapMarks[i].x) > 1e-6 || Math.abs(m.y - selGapMarks[i].y) > 1e-6); selGapMarks = gs.add;
  $('checkHolesLabel').textContent = n ? t('checkHolesN', { n }) : t('checkHoles'); $('checkHoles').title = n ? t('checkHolesTip') + ' — ' + t('checkHolesN', { n }) : t('checkHolesTip');
  if (changed) draw(); /* 印を出す・消すために、一度だけ描き直す（同じ状態では、ここへ来ても何もしない） */
}
function checkHoles() {
  const { add, gapCount } = findHoleGaps();
  if (!add.length) { $('hint').textContent = t('noGapFound'); return; }
  commit(() => { selected = new Set(addGapHoles(add)); });
  $('hint').textContent = t('holesFilled', { gaps: gapCount, n: add.length });
}
/** 歯抜けの穴を図面に足す（commit の中で呼ぶ）。足した穴の id の並びを返す。 */
function addGapHoles(list) { const made = []; for (const { gapId, ...h } of list) { const id = freshId(doc.holes, 'h'); doc.holes.push({ ...h, id }); made.push(id); } return made; }
/** 赤い輪をクリックしたとき：クリックの近くの輪（いちばん近いもの）と、その輪の所属（選んだ線の分／開いた直後の分）を返す。無ければ null。 */
function gapMarkAt(p) {
  const tol = Math.max(2.2, 9 / scale) + 2 / scale; let best = null, bd = Infinity;
  for (const list of [selGapMarks, openGapMarks]) for (const m of list) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d <= tol && d < bd) { bd = d; best = { m, list }; } }
  return best;
}
/** 赤い輪をクリック：その1か所の歯抜け（続けて抜けた穴はいっしょに）だけを補う。選択は変えない（続けて、ほかの輪も押せる）。事業主指示 2026-10-16 */
function fillOneGap({ m, list }) {
  const entries = list.filter(x => x.gapId === m.gapId), wasOpen = list === openGapMarks; if (!entries.length) return;
  cancel(); commit(() => { addGapHoles(entries); });
  if (wasOpen) openGapMarks = findHoleGaps(true).add; /* commit が消した、開いた直後の印を、残りの歯抜けの分だけ出し直す */
  $('hint').textContent = t('holesFilled', { gaps: 1, n: entries.length }); draw();
}
/** 「菱目を消す」：選んだ線の上の菱目をすべて（線は残す）。菱目を選んでいれば、その菱目だけ。 */
function deleteSelectedHoles() {
  const ids = new Set(affectedHoles().map(h => h.id)); if (!ids.size) { $('hint').textContent = t('noHolesToDelete'); return; }
  commit(() => { doc.holes = doc.holes.filter(h => !ids.has(h.id)); for (const id of ids) selected.delete(id); manualNext = null; });
  $('hint').textContent = t('holesDeleted', { n: ids.size });
}
function affectedHoles(all=false) {
  const paths=new Set(doc.paths.filter(p=>p.shapeIds.some(id=>selected.has(id))).map(p=>p.id));
  return doc.holes.filter(h=>holeEditable(h)&&(all||selected.has(h.id)||paths.has(h.pathId)));
}
function markHoles(mark,all=false) { commit(()=>affectedHoles(all).forEach(h=>h.mark=mark)); }
// ツール id → ヘルプのページ id（文脈ヘルプ：ツールボタンを右クリック／長押しで開く）
const TOOL_HELP = { patchfill: 'design', ruler: 'text-dimension', rect: 'drawing', mark: 'stitching', select: 'drawing', line: 'drawing', circle: 'drawing', arc: 'drawing', bezier: 'drawing', polyline: 'drawing', path: 'pen', text: 'text-dimension', dimension: 'text-dimension', fillet: 'drawing', chamfer: 'drawing', offset: 'drawing', detour: 'drawing', trim: 'trim-mirror', mirror: 'trim-mirror', stitch: 'stitching', fold: 'design', koma: 'design', hardware: 'hardware', library: 'library', imgScale: 'underlay' };
function helpData() { return document.documentElement.lang === 'en' ? HELP_EN : HELP_JA; }
function renderHelpSelect() {
  const sel = $('helpPage'), q = ($('helpSearch').value || '').toLowerCase(), keep = sel.value; sel.textContent = '';
  const all = document.createElement('option'); all.value = ''; all.textContent = t('helpAll'); sel.appendChild(all);
  for (const p of helpData().pages.filter(p => !q || (p.title + ' ' + p.body).toLowerCase().includes(q))) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.title; sel.appendChild(o); }
  sel.value = keep && helpData().pages.some(p => p.id === keep) ? keep : '';
}
/** ヘッダーのキー表示用：'S'→「Ctrl+S」（Mac は ⌘S）・'Shift+S'→「Ctrl+Shift+S」（⌘⇧S）・'Redo'→「Ctrl+Y」（⌘⇧Z）。 */
function modLabel(k) { if (k === 'Redo') return isMac ? '⌘⇧Z' : 'Ctrl+Y'; const shift = k.startsWith('Shift+'), key = k.replace('Shift+', ''); return isMac ? '⌘' + (shift ? '⇧' : '') + key : 'Ctrl+' + (shift ? 'Shift+' : '') + key; }
/** ショートカット一覧の項目名：左メニューのボタン・上部のチェックに付いている言葉をそのまま使う（言語に合わせて変わる）。 */
function keyLabel(id) { const el = document.querySelector?.(`[data-tool="${id}"]`) || $(id), src = el?.closest?.('label') || el, k = src?.querySelector?.('[data-i18n]')?.dataset?.i18n || src?.dataset?.i18n; return k ? t(k) : id; }
function showHelp(shortcuts = false, pageId = null) {
  const data = helpData();
  if (shortcuts) { $('helpBody').textContent = t('shortcutsText', { mod: isMac ? '⌘' : 'Ctrl+' }) + '\n\n' + t('shortcutsToolsHead') + '\n' + shortcutLines(keyLabel).join('\n'); $('helpDialog').showModal(); return; }
  if (pageId !== null) $('helpPage').value = pageId;
  renderHelpSelect();
  const q = ($('helpSearch').value || '').toLowerCase(); if (!$('helpPage').value && !q && data.pages.length) $('helpPage').value = data.pages[0].id; const id = $('helpPage').value;
  const pages = data.pages.filter(p => (!id || p.id === id) && (!q || (p.title + ' ' + p.body).toLowerCase().includes(q)));
  $('helpBody').textContent = pages.length ? pages.map(p => p.title + '\n' + p.body).join('\n\n') : t('helpNoMatch');
  $('helpDialog').showModal();
}
/** 自動保存：変更の1.5秒後に、全タブの図面を localStorage へ入れる。復元するか決める前は、前回の保存を上書きしない。 */
function scheduleAutosave() { if (typeof setTimeout !== 'function') return; if (typeof clearTimeout === 'function') clearTimeout(autosaveTimer); autosaveTimer = setTimeout(flushAutosave, 1500); }
function flushAutosave() {
  if (typeof clearTimeout === 'function') clearTimeout(autosaveTimer); autosaveTimer = 0; if (!autosaveReady || pendingRestore) return;
  snapshotTab(); const r = packAutosave(tabs.map(tb => ({ name: tb.name, doc: tb.doc, ...(tb.scale && tb.origin ? { view: { scale: tb.scale, cx: (viewW() / 2 - tb.origin.x) / tb.scale, cy: (viewH() / 2 - tb.origin.y) / tb.scale } } : {}) })), activeTab); /* 見ていた位置（画面の中心の図面座標）と倍率も、タブごとに保存する */
  try {
    if (r.status === 'ok') { localStorage.setItem(AUTOSAVE_KEY, r.text); autosaveWarned = false; scheduleUndoSave(r.savedAt); }
    else if (r.status === 'empty') { localStorage.removeItem(AUTOSAVE_KEY); clearUndoRecord().catch(() => {}); }
    else if (!autosaveWarned) { autosaveWarned = true; $('hint').textContent = t('autosaveTooLarge'); }
  } catch { if (!autosaveWarned) { autosaveWarned = true; $('hint').textContent = t('storageUnavailable'); } }
}
/** 元に戻す履歴の保管（事業主指示 2026-10-17：再起動しても Undo が残る）：自動保存の2秒後に、全タブの履歴を圧縮して IndexedDB へ。自動保存と同じ時刻（savedAt）を付け、復元のときは時刻が合うものだけ使う（図面とずれた履歴で戻して、作業を失わないため）。 */
function scheduleUndoSave(savedAt) {
  if (undoAttaching || typeof setTimeout !== 'function') return; if (typeof clearTimeout === 'function') clearTimeout(undoSaveTimer);
  const stacks = tabs.map(tb => ({ undo: tb.undo.slice(), redo: tb.redo.slice() })); /* その時点の履歴を控える（2秒のあいだに増えても、この時刻の図面に合う分だけ） */
  undoSaveTimer = setTimeout(async () => { try { await saveUndoRecord({ savedAt, tabs: await Promise.all(stacks.map(st => st.undo.length || st.redo.length ? encodeStacks(st) : null)) }); } catch { /* 保管できない環境では何もしない */ } }, 2000);
}
/** 「前回の続き」で復元したタブに、保管した履歴を戻す。時刻が合わない・もう編集を始めた（履歴が空でない）タブには戻さない。 */
async function attachSavedUndo(info, base) {
  undoAttaching = true;
  try {
    const rec = await loadUndoRecord(); if (!rec || rec.savedAt !== info.savedAt || !Array.isArray(rec.tabs)) return;
    for (let i = 0; i < info.tabs.length; i++) {
      const st = rec.tabs[i] ? await decodeStacks(rec.tabs[i]) : null, idx = base + i, tb = tabs[idx]; if (!st || !tb) continue;
      const cur = idx === activeTab ? undo : tb.undo; if (cur.length || (idx === activeTab ? redo : tb.redo).length) continue;
      tb.undo = st.undo; tb.redo = st.redo; if (idx === activeTab) { undo = tb.undo; redo = tb.redo; }
    }
    updateUI();
  } catch { /* 履歴が読めなくても、図面の復元はそのまま */ } finally { undoAttaching = false; }
}
/** 起動時：前回の保存があれば「前回の続き」バーを出す（勝手には戻さない）。壊れた保存は消す。 */
function offerRestore() {
  let text = null; try { text = localStorage.getItem(AUTOSAVE_KEY); } catch { /* 保存を読めない環境では何もしない */ }
  const info = text ? unpackAutosave(text, d => { const m = migrateDoc(d); healDoc(m); return validateDoc(m); }) : null;   /* 部品が消えた図形を指したままの壊れた保存も、直せるなら捨てない */   /* 古い版の保存（層の変更前など）も、版上げしてから検査する */
  if (!info) { if (text) try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* 無視 */ } return; }
  const d = new Date(info.savedAt), p2 = n => String(n).padStart(2, '0'), when = `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  pendingRestore = info; $('restoreInfo').textContent = t('restoreInfo', { when, n: info.shapes, tabs: info.tabs.length }); $('restoreBar').hidden = false;
}
function restoreAutosave() {
  const info = pendingRestore; if (!info) return; pendingRestore = null; $('restoreBar').hidden = true; snapshotTab();
  const empty = tabs.every(tb => !tb.doc.shapes.length), base = empty ? 0 : tabs.length; if (empty) tabs.length = 0;   /* 空の図面なら置き換え・描き始めていれば新しいタブで足す */
  for (const tb of info.tabs) tabs.push({ name: tb.name, doc: (() => { const m = withDefaultTool(migrateDoc(tb.doc)); healDoc(m); return m; })(), undo: [], redo: [], selected: new Set(), activeLayer: 'pattern', dirty: true, ...(tb.view ? { scale: tb.view.scale, origin: { x: viewW() / 2 - tb.view.cx * tb.view.scale, y: viewH() / 2 - tb.view.cy * tb.view.scale } } : {}) });   /* 保存に見ていた位置があれば、そのタブの表示（倍率・位置）に戻す */
  if (!featureLocked() && info.tabs.some(tb => tb.doc.threeViewSheet)) { $('quadView').checked = true; if ($('threeView')) $('threeView').checked = false; }
  activeTab = -1; switchTab(base + info.active); if (!info.tabs[info.active].view) fit(); /* 見ていた位置が保存に無い古いデータだけ、全体表示 */ $('hint').textContent = t('restored'); noticeGaps(); undoAttaching = true; attachSavedUndo(info, base); flushAutosave();
}
function discardAutosave() { pendingRestore = null; $('restoreBar').hidden = true; try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* 無視 */ } clearUndoRecord().catch(() => {}); flushAutosave(); }
$('restoreApply').onclick = restoreAutosave; $('restoreDiscard').onclick = discardAutosave;
function showTour() {
  let done = false; try { done = localStorage.getItem('leather-cad.tourDone') === '1'; } catch { done = true; }
  if (done) return; let i = 0;
  const render = () => { $('tourBody').textContent = t('tour.' + (i + 1)); $('tourStep').textContent = `${i + 1} / 5`; $('tourNext').textContent = i >= 4 ? t('tourFinish') : t('tourNext'); };
  $('tourNext').onclick = () => { if (i >= 4) { $('tourDialog').close(); if ($('tourSkipAlways').checked) { try { localStorage.setItem('leather-cad.tourDone', '1'); } catch { /* 省略 */ } } } else { i++; render(); } };
  $('tourSkip').onclick = () => { $('tourDialog').close(); if ($('tourSkipAlways').checked) { try { localStorage.setItem('leather-cad.tourDone', '1'); } catch { /* 省略 */ } } };
  render(); $('tourDialog').showModal();
}
function saveSnapDist() { try { localStorage.setItem('leather-cad.snapDist', String(Math.max(0, Number($('snapDist').value) || 0))); } catch { /* 保存できなくても続ける */ } }
/* ---- 設定セット：設定値と登録した工具をまとめて名前を付けて保存・呼び出し（ブラウザ内の一覧＋JSON ファイル） ---- */
const PRESET_KEY = 'leather-cad.presets', PRESET_MAX = 30, PRESET_APP = "N's CAD settings";
const PRESET_FIELDS = ['stitchTool', 'placement', 'chain', 'reversePath', 'offsetStart', 'offsetEnd', 'segmentFrom', 'segmentTo', 'cornerMode', 'followTangent', 'reverseSlant', 'constrainHole', 'holeAngle', 'holeMark', 'defaultMark', 'dotD',
  'textSize', 'dimOffset', 'offsetJoin', 'mirrorHoles', 'arcMethod', 'arcDir', 'arcRadius', 'snapDist', 'offsetDist', 'offsetSide',
  'patchPitch', 'patchTol', 'patchClear', 'patchTargetW', 'patchTargetH', 'patchAllowance', 'patchCols', 'patchRows', 'seamStyle', 'patchPattern', 'patchCell', 'patchStitch', 'patchHole', 'patchInset', 'patchEdgeBan', 'patchTexA', 'patchTexB',
  'komaThickness', 'komaInward', 'grid', 'spacing', 'snap'];
/** いまの設定値（画面の入力欄）と登録した工具を、保存用のデータにまとめる。 */
function captureSettings() {
  const values = {};
  for (const id of PRESET_FIELDS) { const el = document.getElementById(id); if (!el) continue; values[id] = el.type === 'checkbox' ? !!el.checked : String(el.value); }
  return { app: PRESET_APP, version: 1, savedAt: new Date().toISOString(), tools: JSON.parse(JSON.stringify(doc.tools)), values };
}
/** 保存した設定を画面に戻す。工具は同じ id を置き換え・無ければ追加（元に戻せる）。読み込めないデータなら false。 */
function applySettings(data) {
  if (!data || data.app !== PRESET_APP || !data.values || typeof data.values !== 'object' || !Array.isArray(data.tools) || !data.tools.length) return false;
  const sample = newDoc(); sample.tools = data.tools; if (!validateDoc(sample)) return false;
  commit(() => {
    for (const tool of data.tools) { const i = doc.tools.findIndex(x => x.id === tool.id); if (i >= 0) doc.tools[i] = tool; else doc.tools.push(tool); }
    if (['tool', 'diamond', 'dot', 'circle', 'slit'].includes(data.values.defaultMark)) doc.mark = data.values.defaultMark;
    const d = Number(data.values.dotD); if (Number.isFinite(d) && d > 0) doc.dotD = d;
  });
  refreshTools(); persistTools();
  for (const id of PRESET_FIELDS) {
    if (!(id in data.values)) continue; const el = document.getElementById(id); if (!el) continue; const v = data.values[id];
    if (el.type === 'checkbox') el.checked = !!v; else if (el.tagName === 'SELECT') { if ([...el.options].some(o => o.value === String(v))) el.value = String(v); } else el.value = String(v);
  }
  fillTool(); saveSnapDist(); manualNext = null; draw(); return true;
}
function loadPresets() { try { const list = JSON.parse(localStorage.getItem(PRESET_KEY)); return Array.isArray(list) ? list.filter(p => p && typeof p.name === 'string' && p.data) : []; } catch { return []; } }
function persistPresets(list) { try { localStorage.setItem(PRESET_KEY, JSON.stringify(list.slice(0, PRESET_MAX))); return true; } catch { $('hint').textContent = t('storageUnavailable'); return false; } }
function renderPresets(selectName = null) {
  const sel = $('presetList'); sel.textContent = '';
  for (const p of loadPresets()) { const o = document.createElement('option'); o.value = p.name; o.textContent = p.name + '（' + String(p.savedAt || '').slice(0, 16).replace('T', ' ') + '）'; sel.appendChild(o); }
  if (selectName !== null) sel.value = selectName;
}
function storePreset(name, data) {
  const list = loadPresets().filter(p => p.name !== name); list.unshift({ name, savedAt: data.savedAt || new Date().toISOString(), data });
  if (persistPresets(list)) renderPresets(name);
}
function initPresets() {
  renderPresets();
  $('presetSave').onclick = () => { const name = $('presetName').value.trim().slice(0, 60) || t('presetDefaultName', { d: new Date().toISOString().slice(0, 16).replace('T', ' ') }); storePreset(name, captureSettings()); $('hint').textContent = t('presetSaved', { name }); };
  $('presetLoad').onclick = () => { const name = $('presetList').value, p = loadPresets().find(x => x.name === name); if (!p) { $('hint').textContent = t('presetNone'); return; } $('hint').textContent = applySettings(p.data) ? t('presetLoaded', { name }) : t('presetInvalid'); };
  $('presetDelete').onclick = () => { const name = $('presetList').value; if (!loadPresets().some(p => p.name === name)) { $('hint').textContent = t('presetNone'); return; } if (persistPresets(loadPresets().filter(p => p.name !== name))) { renderPresets(); $('hint').textContent = t('presetDeleted', { name }); } };
  $('presetExport').onclick = () => { const name = $('presetName').value.trim().slice(0, 60) || $('presetList').value || 'settings'; download('ncad-settings-' + name.replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.json', JSON.stringify({ ...captureSettings(), name }, null, 2), 'application/json'); $('hint').textContent = t('presetExported'); };
  $('presetImport').onclick = () => $('presetFile').click();
  $('presetFile').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const data = JSON.parse(await file.text()); if (!applySettings(data)) throw new Error('invalid'); const name = String(data.name || file.name || '').replace(/\.json$/i, '').slice(0, 60) || t('presetDefaultName', { d: '' }).trim(); storePreset(name, data); $('hint').textContent = t('presetImported', { name }); }
    catch { $('hint').textContent = t('presetInvalid'); }
    e.target.value = '';
  });
}
function initStitch() {
  $('offsetDist').value='2.5'; $('offsetSide').value='cursor'; /* 標準：2.5mm・カーソルの側（2026-10-12：向きは文字でなくカーソルの位置で決めたい） */ $('offsetJoin').value='miter'; $('mirrorHoles').value='reverse'; $('arcMethod').value='three'; /* 標準：3点（始点→通過点→終点のクリックだけ） */ $('arcRadius').value='';
  try { const saved = localStorage.getItem('leather-cad.snapDist'); $('snapDist').value = saved !== null && Number.isFinite(Number(saved)) && Number(saved) >= 0 ? saved : '10'; } catch { $('snapDist').value = '10'; }
  $('snapDist').addEventListener('change', () => { saveSnapDist(); draw(); });
  const values={placement:'fixed',cornerMode:'place',offsetStart:'0',offsetEnd:'0',segmentFrom:'0',segmentTo:'',holeAngle:'0',dotD:'2',defaultMark:'tool'};
  for(const [id,value]of Object.entries(values))$(id).value=value;
  for(const id of ['chain','followTangent','constrainHole'])$(id).checked=true;
  for(const id of ['reversePath','reverseSlant'])$(id).checked=false;
  $('stitchTool').addEventListener('change',()=>{manualNext=null;fillTool();});
  $('toolFitDiamond').onclick=()=>fitToolsToDiamondLines(); $('toolStrip').onclick=()=>printToolStrip(); $('toolReassign').onclick=()=>reassignTool($('stitchTool').value,$('toolReassignTo').value,false); $('toolReassignSel').onclick=()=>reassignTool($('stitchTool').value,$('toolReassignTo').value,true); $('addTool').onclick=()=>registerTool(false);$('updateTool').onclick=()=>registerTool(true);
  $('resetManual').onclick=()=>{manualNext=null;draw();};
  $('placement').addEventListener('change',syncPlacementFields);syncPlacementFields();
  for(const id of ['placement','reversePath','offsetStart','offsetEnd','segmentFrom','segmentTo','stitchCount'])$(id).addEventListener('change',()=>{manualNext=null;countStage=null;});
  $('delHoles').onclick=deleteSelectedHoles; $('checkHoles').onclick=checkHoles; $('flipHoleSlant').onclick=flipSlantOfSelection;
  $('clearHoles').onclick=()=>commit(()=>{const ids=new Set(affectedHoles(true).map(h=>h.id));doc.holes=doc.holes.filter(h=>!ids.has(h.id));doc.paths.filter(p=>p.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id)))).forEach(p=>p.segments=[]);selected.clear();manualNext=null;});
  $('clearPathHoles').onclick=()=>commit(()=>{const ids=new Set(affectedHoles().map(h=>h.id));doc.holes=doc.holes.filter(h=>!ids.has(h.id));selected.clear();manualNext=null;});
  $('selectedDots').onclick=()=>markHoles('dot');$('allDots').onclick=()=>markHoles('dot',true);
  $('restoreMarks').onclick=()=>commit(()=>{affectedHoles(true).forEach(h=>h.mark='tool');doc.paths.filter(p=>p.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id)))).forEach(p=>p.mark='tool');doc.mark='tool';$('defaultMark').value='tool';});
  $('applyMark').onclick=()=>markHoles($('holeMark').value);
  $('applyAngle').onclick=()=>{const a=Number($('holeAngle').value);if(Number.isFinite(a))commit(()=>affectedHoles().forEach(h=>h.angleDeg=a));};
  $('flipSlant').onclick=()=>commit(()=>affectedHoles().forEach(h=>{const route=resolvePath(doc,doc.paths.find(p=>p.id===h.pathId));const tangent=$('followTangent').checked?pointAtLength(route,h.s).angleDeg:0;h.angleDeg=2*tangent-h.angleDeg;}));
  $('defaultMark').addEventListener('change',()=>commit(()=>doc.mark=$('defaultMark').value));
  $('markDiv').addEventListener('input',()=>{if(mode==='mark'){cancel();$('hint').textContent=modeHint('mark');draw();}});
  $('markDist').addEventListener('input',()=>{if(mode==='mark'){cancel();$('hint').textContent=modeHint('mark');draw();}}); /* 距離を変えたら、途中の基準の点は捨てて、ヒントも切り替える */
  $('dotD').addEventListener('change',()=>{const d=Number($('dotD').value);if(Number.isFinite(d)&&d>0)commit(()=>doc.dotD=d);else $('dotD').value=doc.dotD;});
  $('help').onclick=()=>showHelp();$('closeHelp').onclick=()=>$('helpDialog').close();
  $('helpSearch').addEventListener('input',()=>showHelp(false));$('helpPage').addEventListener('change',()=>showHelp(false));
  document.querySelectorAll('[data-tool]').forEach(b=>{ b.addEventListener('contextmenu',e=>{e.preventDefault();showHelp(false,TOOL_HELP[b.dataset.tool]||'');}); let timer=null; b.addEventListener('pointerdown',()=>{timer=setTimeout(()=>{longPressed=true;showHelp(false,TOOL_HELP[b.dataset.tool]||'');},700);}); b.addEventListener('click',e=>{ if(longPressed){ longPressed=false; e.stopImmediatePropagation(); e.preventDefault(); } },true); for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,()=>clearTimeout(timer)); });
  document.querySelectorAll?.('.slantSwitch .s-fwd, .slantSwitch .s-rev').forEach(sp=>sp.addEventListener('click',e=>{e.preventDefault();slantPick(sp.classList.contains('s-rev'));}));
  $('setDefaultTool').onclick=()=>{ try { localStorage.setItem('leather-cad.defaultTool',$('stitchTool').value); $('hint').textContent=t('defaultToolSaved'); } catch { $('hint').textContent=t('storageUnavailable'); } };
  refreshTools();
  try { /* 既定の工具は 3.95mm の2本刃（2026-10-16）。一度だけ、保存済みの既定をこれに切り替える（そのあと「既定にする」で変えた分は尊重する） */
    if(localStorage.getItem('leather-cad.defaultTool.v2')!=='1'&&doc.tools.some(t=>t.id==='diamond-3.95-2')){localStorage.setItem('leather-cad.defaultTool','diamond-3.95-2');localStorage.setItem('leather-cad.defaultTool.v2','1');}
    const id=localStorage.getItem('leather-cad.defaultTool')||'diamond-3.95-2'; if(id&&doc.tools.some(t=>t.id===id)){$('stitchTool').value=id;fillTool();} } catch { const id='diamond-3.95-2'; if(doc.tools.some(t=>t.id===id)){$('stitchTool').value=id;fillTool();} }
}

// ---- レイヤー（カード）----
function renderLayers() {
  if (!doc.layers.some(l => l.id === activeLayer)) activeLayer = doc.layers[0].id;
  for (const id of ['layerList', 'info-layer']) {
    const select = $(id); select.textContent = '';
    for (const l of doc.layers) { const o = document.createElement('option'); o.value = l.id; o.textContent = layerName(l) + (l.locked ? ' 🔒' : '') + (l.visible ? '' : ' ・'); select.appendChild(o); }
  }
  const l = doc.layers.find(l => l.id === activeLayer);
  $('layerList').value = activeLayer; $('layerName').value = layerName(l); $('layerVisible').checked = l.visible; $('layerLocked').checked = l.locked;
  /* 各層の表示・ロックを一覧で切り替える（層を1つずつ選ばなくてよい） */
  const rows = $('layerRows'); rows.textContent = '';
  for (const lay of doc.layers) {
    const row = document.createElement('div'); row.className = 'row';
    const box = (key, text) => { const label = document.createElement('label'), input = document.createElement('input'), span = document.createElement('span'); input.type = 'checkbox'; input.checked = !!lay[key]; span.textContent = text;
      input.addEventListener('change', () => setLayerFlag(lay.id, key, input.checked)); label.appendChild(input); label.appendChild(span); return label; };
    const name = document.createElement('span'); name.textContent = layerName(lay); name.style.flex = '1'; row.appendChild(name); row.appendChild(box('visible', t('visible'))); row.appendChild(box('locked', t('locked'))); rows.appendChild(row);
  }
}
/** 層の表示／ロックを1つ変える（元に戻せる）。作図先が使えなくなったら、表示中でロックされていない層へ移す。 */
function setLayerFlag(id, key, value) {
  commit(() => { const l = doc.layers.find(x => x.id === id); if (l) l[key] = value; selected.clear(); }); fixActiveLayer(); renderLayers();
}
function fixActiveLayer() { const l = doc.layers.find(x => x.id === activeLayer); if (!l || !l.visible || l.locked) { const n = doc.layers.find(x => x.visible && !x.locked); if (n) activeLayer = n.id; } }
/** 作図先の層だけを表示し、他の層を隠す。 */
function soloLayer() { const keep = doc.layers.find(x => x.id === activeLayer); if (!keep) return; commit(() => { for (const l of doc.layers) l.visible = l === keep; selected.clear(); }); renderLayers(); $('hint').textContent = t('layerSoloDone', { name: layerName(keep) }); }
function showAllLayers() { commit(() => { for (const l of doc.layers) l.visible = true; }); renderLayers(); }
/** 見えていて編集できる図形のうち、点線（lineStyle が dashed）を、色に関わらずすべて選ぶ（事業主指示 2026-10-17：一括でガイド層へ移すため）。 */
function pickDashedAll() {
  const ids = doc.shapes.filter(s => visible(s) && editable(s) && !s.holeLink && s.lineStyle === 'dashed').map(s => s.id);
  if (!ids.length) { $('hint').textContent = t('layerPickNoneDashed'); return; }
  selected = new Set(ids); nodeSel = null; $('hint').textContent = t('layerPickedDashed', { n: ids.length }); draw();
}
/** 見えていて編集できる図形のうち、黄色の点線（オフセット線など）をすべて選ぶ。 */
function pickYellowDashed() {
  const ids = doc.shapes.filter(s => visible(s) && editable(s) && s.color === 'yellow' && s.lineStyle === 'dashed').map(s => s.id);
  if (!ids.length) { $('hint').textContent = t('layerPickNoneYellow'); return; }
  selected = new Set(ids); nodeSel = null; $('hint').textContent = t('layerPickedYellow', { n: ids.length }); draw();
}
/** 選んだ図形（複数でもよい）を、作図先の層へ移す。移し先が非表示・ロック中なら何もしない。 */
function moveSelectedToLayer() {
  const dest = doc.layers.find(x => x.id === activeLayer); if (!dest) return;
  if (!dest.visible || dest.locked) { $('hint').textContent = t('layerMoveBlocked', { name: layerName(dest) }); return; }
  const targets = doc.shapes.filter(s => selected.has(s.id) && editable(s) && s.layer !== dest.id);
  if (!targets.length) { $('hint').textContent = t('layerMoveNone'); return; }
  commit(() => { for (const s of targets) s.layer = dest.id; }); renderLayers(); $('hint').textContent = t('layerMoved', { n: targets.length, name: layerName(dest) });
}
function initLayers() {
  $('layerList').addEventListener('change', () => { activeLayer = $('layerList').value; renderLayers(); });
  $('layerName').addEventListener('change', () => { const name = $('layerName').value.trim(); if (name) commit(() => { doc.layers.find(l => l.id === activeLayer).name = name; }); renderLayers(); });
  $('layerVisible').addEventListener('change', () => { commit(() => { doc.layers.find(l => l.id === activeLayer).visible = $('layerVisible').checked; selected.clear(); }); renderLayers(); });
  $('layerSolo').onclick = soloLayer; $('layerAll').onclick = showAllLayers; $('layerMove').onclick = moveSelectedToLayer; $('layerPickYellow').onclick = pickYellowDashed; $('layerPickDashed').onclick = pickDashedAll;
  $('layerLocked').addEventListener('change', () => { commit(() => { doc.layers.find(l => l.id === activeLayer).locked = $('layerLocked').checked; selected.clear(); }); renderLayers(); });
  $('showModHelp').checked = modHelpOn; $('showModHelp').addEventListener('change', e => { modHelpOn = e.target.checked; try { localStorage.setItem('leather-cad.modHelp', modHelpOn ? 'on' : 'off'); } catch { /* 保存できなくても続ける */ } refreshModHelp(); });
  $('showSolid').checked = viewShow.solid; $('showDashed').checked = viewShow.dashed;
  $('showSolid').addEventListener('change', e => { viewShow.solid = e.target.checked; syncViewShow(true); });
  $('showDashed').addEventListener('change', e => { viewShow.dashed = e.target.checked; syncViewShow(true); });
  $('showColors').checked = viewShow.colors; $('showColors').addEventListener('change', e => { viewShow.colors = e.target.checked; draw(); });
  $('showHardware').checked = viewShow.hardware; $('showHardware').addEventListener('change', e => { viewShow.hardware = e.target.checked; selected = new Set([...selected].filter(id => { const x = doc.shapes.find(y => y.id === id); return !x || !hwHidden(x); })); cancel(); draw(); });   /* 金具の表示（画面と書き出しの両方。レイヤー・データは変えない） */
  restoreDiamondStyle(); $('diamondStyle').addEventListener('change', () => { try { localStorage.setItem(DIAMOND_KEY, diamondMode()); } catch { /* 保存できなくても続ける */ } draw(); refreshInfo(); });
  $('info-flipSlant').onclick = flipSlantOfSelection; $('info-slantFwd').onclick = () => unifySlantOfSelection('fwd'); $('info-slantRev').onclick = () => unifySlantOfSelection('rev');
  $('info-diamondHollow').onclick = () => setDiamondMode('line'); $('info-diamondFilled').onclick = () => setDiamondMode('fill');
  $('gatherLayer').onclick = gatherVisibleToActiveLayer;
  $('addLayer').onclick = () => { const id = freshId(doc.layers, 'layer'); commit(() => { doc.layers.push({ id, name: t('newLayer', { n: id.slice(5) }), visible: true, locked: false }); }); activeLayer = id; renderLayers(); };
  $('removeLayer').onclick = () => {
    if (doc.layers.length < 2) { $('hint').textContent = t('lastLayer'); return; }
    if (doc.shapes.some(s => s.layer === activeLayer)) { $('hint').textContent = t('layerNotEmpty'); return; }
    commit(() => { doc.layers = doc.layers.filter(l => l.id !== activeLayer); }); activeLayer = doc.layers[0].id; renderLayers();
  };
}

// ---- 情報パネル（選択図形の数値編集）----
const COLOR_FIELDS = ['color','lineStyle'];
const INFO_FIELDS = { line: ['x1','y1','x2','y2','length',...COLOR_FIELDS], circle: ['cx','cy','r',...COLOR_FIELDS], arc: ['cx','cy','r','startDeg','endDeg','length',...COLOR_FIELDS], bezier: ['x1','y1','x2','y2','length',...COLOR_FIELDS], polyline: ['nodes','closed','length','area',...COLOR_FIELDS], path: ['nodes','closed','length','area','nodeOps',...COLOR_FIELDS], text: ['text','sizeMm','angleDeg','x','y'], dimension: ['x1','y1','x2','y2','offset','length'], fold: ['x1','y1','x2','y2','angleDeg','inner'] };
const ALL_FIELDS = ['x','y','x1','y1','x2','y2','cx','cy','r','startDeg','endDeg','length','text','sizeMm','angleDeg','offset','closed','nodes','area','nodeOps','inner',...COLOR_FIELDS];
let infoBusy = false;
function infoShape() { if (selected.size !== 1) return null; const id = [...selected][0]; return doc.shapes.find(s => s.id === id) || null; }
/** 図形の全体の長さ(mm)＝線・円弧・曲線・折れ線・円（外周）の長さの合計。文字・寸法・折り線・画像は含めない。 */
function totalLengthOf(shapes) { return shapes.filter(stitchable).reduce((sum, s) => sum + arcLength(s), 0); }
/** 選んだ線（曲線・円弧を含む）の全体の長さと同じ長さの、水平な直線を 1 本、選んだ図形の右横（10mm 離す）に足して選ぶ。元の線は残す。元に戻すは 1 回。 */
function unrollSelection() {
  const list = doc.shapes.filter(s => selected.has(s.id) && editable(s) && stitchable(s)); if (!list.length) { $('hint').textContent = t('selectFirst'); return; }
  const len = totalLengthOf(list); if (!(len > 1e-6)) { $('hint').textContent = t('unrollNone'); return; }
  const b = bboxOfDoc({ shapes: list, holes: [] }), y = +((b.minY + b.maxY) / 2).toFixed(4), x1 = +(b.maxX + 10).toFixed(4);
  /* 目打ち（縫い穴）：選んだ線だけでできている経路の穴を、線に沿った位置と向き（線に対する傾き）のまま、新しい直線にも写す。つながった線は長さ順に、離れた線は続けて並べる */
  const placed = []; let offset = 0;
  for (const chain of chainShapes(list)) {
    const ids = new Set(chain.shapeIds), paths = doc.paths.filter(p => p.shapeIds.every(id => ids.has(id)));
    const clen = arcLength(chain), turn = (a, c) => Math.abs(((a - c + 540) % 360) - 180);
    for (const h of doc.holes.filter(h => paths.some(p => p.id === h.pathId))) {
      const q = projectOnPath(chain, h), before = pointAtLength(chain, Math.max(0, q.s - 1e-4)).angleDeg, after = pointAtLength(chain, Math.min(clen, q.s + 1e-4)).angleDeg;
      placed.push({ h, s: offset + q.s, angleDeg: ((h.angleDeg - q.angleDeg) % 360 + 360) % 360, corner: turn(after, before) > 1, path: paths.find(p => p.id === h.pathId) }); /* corner＝線の曲がり角にある穴 */
    }
    offset += clen;
  }
  /* 角の穴は角を二等分する向きで置かれている。まっすぐな線には角がないので、同じ道具の他の穴で一番多い向きにそろえる */
  for (const toolId of new Set(placed.map(p => p.h.toolId))) {
    const same = placed.filter(p => p.h.toolId === toolId), counts = new Map();
    for (const p of same.filter(p => !p.corner)) { const k = p.angleDeg.toFixed(3); counts.set(k, (counts.get(k) || 0) + 1); }
    const best = [...counts.entries()].sort((a, c) => c[1] - a[1])[0]; if (best) for (const p of same.filter(p => p.corner)) p.angleDeg = Number(best[0]);
  }
  cancel(); commit(() => {
    const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer: list[0].layer, type: 'line', x1, y1: y, x2: +(x1 + len).toFixed(4), y2: y }); selected = new Set([id]); nodeSel = null;
    if (!placed.length) return;
    placed.sort((a, c) => a.s - c.s); const pid = freshId(doc.paths, 'p'), segments = [], { id: _i, shapeIds: _s, segments: _g, reversed: _r, closed: _c, ...keep } = placed[0].path;
    for (const p of placed) { const last = segments.at(-1); if (last && last.toolId === p.h.toolId) last.to = p.s; else segments.push({ from: p.s, to: p.s, toolId: p.h.toolId, pitch: doc.tools.find(t => t.id === p.h.toolId)?.pitch ?? 0, mode: 'manual' }); }
    doc.paths.push({ ...keep, id: pid, shapeIds: [id], reversed: false, closed: false, segments });
    for (const p of placed) doc.holes.push({ ...p.h, id: freshId(doc.holes, 'h'), pathId: pid, x: +(x1 + p.s).toFixed(4), y, s: p.s, angleDeg: p.angleDeg });
  });
  $('hint').textContent = t(placed.length ? 'unrolledHoles' : 'unrolled', { n: list.length, len: len.toFixed(2), m: placed.length });
}
/** 2 個以上の図形を選んでいるとき、その図形の一覧（編集できるものだけ）。1 個以下なら空。 */
function infoShapes() { const list = doc.shapes.filter(s => selected.has(s.id) && editable(s)); return list.length >= 2 ? list : []; }
/** 色・線の種類を 1 図形に当てた結果。実線にしたらガイドの層から型紙の層へ、点線にしたらガイドの層へ移す。hint は出す文言のキー。 */
function restyled(s, field, v) {
  const next = { ...s }; let hint = null; if (v) next[field] = v; else delete next[field];
  if (field === 'lineStyle' && v !== 'dashed' && s.lineStyle === 'dashed' && s.layer === 'guide' && doc.layers.some(l => l.id === 'pattern')) { next.layer = 'pattern'; hint = 'solidToPattern'; } /* 実線は型紙 */
  else if (field === 'lineStyle' && v === 'dashed' && s.lineStyle !== 'dashed' && s.layer !== 'guide' && doc.layers.some(l => l.id === 'guide')) { next.layer = 'guide'; const g = doc.layers.find(l => l.id === 'guide'); hint = g.visible && !g.locked ? 'dashedToGuide' : 'dashedToGuideHidden'; } /* 実線を点線にしたら、ガイドの層の図形として扱う（色は問わない） */
  return { next, hint };
}
/** 全部同じ値ならその値、ばらばらなら存在しない値（欄が空白に見える）。 */
function commonValue(list, get) { const v = get(list[0]); return list.every(s => get(s) === v) ? v : '__mixed'; }
/** 選んだ線の上にある菱目（縫い穴）の数。その線を通る縫い線（パス）が無ければ null（欄を出さない）。複数の線で1本の縫い線をなすときは、選んだ線の上にある穴だけ数える。 */
function holeCountOn(list) {
  const ids = new Set(list.map(s => s.id)), paths = doc.paths.filter(p => p.shapeIds.some(id => ids.has(id))); if (!paths.length) return null;
  const mine = list.filter(s => paths.some(p => p.shapeIds.includes(s.id)));
  return doc.holes.filter(h => paths.some(p => p.id === h.pathId) && mine.some(s => paths.some(p => p.id === h.pathId && p.shapeIds.includes(s.id)) && distTo(s, { x: h.x, y: h.y }) < 0.02)).length;
}
/** 選んだ菱目（穴）の工具の規格：工具ごとに1行（個数・工具名・種類・ピッチ・刃数・穴の大きさ・刃の傾き）。（事業主の指摘 2026-10-18「選んだ菱目の工具の規格がわかるようにしてくれれば今回の件は解決できていた」） */
function holeSpecText(hs) {
  const by = new Map(); for (const h of hs) { const k = h.toolId || ''; if (!by.has(k)) by.set(k, []); by.get(k).push(h); }
  const num = v => Number.isFinite(+v) && v !== undefined && v !== null ? +(+v).toFixed(2) : '—';
  return [...by.entries()].map(([id, list]) => { const tool = doc.tools.find(x => x.id === id), a = holeAppearance(list[0], doc); return t('holeSpecLine', { n: list.length, tool: tool ? tool.name : (id || '—'), kind: tool ? t(tool.kind) : '', pitch: tool ? num(tool.pitch) : '—', teeth: tool ? num(tool.teeth) : '—', w: a ? num(a.width) : '—', h: a ? num(a.height) : '—', angle: tool ? num(tool.angleDeg) : '—' }); }).join('\n');
}
/** 選んだ菱の線（4つの頂点の小さな線）の大きさ：幅（長い対角線）×高さ（短い対角線）。大きさが違えば範囲で出す。 */
function diamondLineSpecText(sz) {
  const f = v => +v.toFixed(2), rng = arr => { const lo = f(Math.min(...arr)), hi = f(Math.max(...arr)); return lo === hi ? String(lo) : lo + '〜' + hi; };
  return t('diamondLineSpec', { n: sz.length, w: rng(sz.map(z => z.w)), h: rng(sz.map(z => z.h)), a: rng(sz.map(z => z.ang)) });
}
/** 情報カードの入力欄で、選んだ穴の工具（1種類のときだけ）の 穴の幅・高さ・ピッチ・刃数・刃の傾き を直して、工具に反映する。同じ工具で打った穴が全部変わる（穴の位置は変わらない）。
 *  （事業主の希望 2026-10-18「菱目は自分で大きさ等を設定したい」） */
/** 小さな菱形の線（図形）で、一斉置換の対象になるもの：編集できる層の、4頂点の小さな線。革色・金属・質感・部品・置いた金具のものは除く。 */
const isReplaceableDiamond = s => s.type === 'polyline' && !s.holeLink && !s.leather && !s.metal && !s.texture && !s.hw && editable(s) && !(doc.parts || []).some(p => p.shapeIds.includes(s.id)) && diamondLoopSizes([s]).length === 1;
/** 全体の菱目を一斉置換する（事業主の希望 2026-10-18「菱目を一つ選択すると規格が表示され、そこで修正した結果を全体の菱目を一斉置換できるように」）。
 *  図面の菱の線は全部 w×h に（中心・向きはそのまま）。穴：tool があれば（穴から始めたとき）、菱形の工具の穴を全部その工具に付け替える。無ければ（菱の線から始めたとき）、穴が使っている菱形の工具の穴の大きさを w×h に。1回で取り消せる。 */
function applyDiamondAll({ w, h, tool }) {
  const lines = doc.shapes.filter(isReplaceableDiamond), isDiamond = id => doc.tools.find(x => x.id === id)?.kind === 'diamond'; let holeN = 0;
  commit(() => {
    for (const sh of lines) { const pts = resizeDiamondLoop(sh, w, h); if (pts) sh.points = pts; }
    if (tool) { const i = doc.tools.findIndex(x => x.id === tool.id); if (i >= 0) doc.tools[i] = tool; for (const hl of doc.holes) if (isDiamond(hl.toolId) || hl.toolId === tool.id) { hl.toolId = tool.id; holeN++; } }
    else { const used = new Set(doc.holes.map(x => x.toolId)); for (const tl of doc.tools) if (tl.kind === 'diamond' && used.has(tl.id)) { tl.holeW = w; tl.holeH = h; } holeN = doc.holes.filter(x => isDiamond(x.toolId)).length; }
  });
  const keep = $('stitchTool').value; refreshTools(); $('stitchTool').value = keep; persistTools();
  $('hint').textContent = t('diamondAllApplied', { w, h, lines: lines.length, holes: holeN });
}
/** 情報カードの幅・高さの欄で、選んだ菱の線（scope='selected'）または図面の菱の線すべて（scope='all'）を、新しい大きさにする。向き・中心はそれぞれのまま。 */
function applyDiamondLineEdit(scope) {
  const wv = $('info-lineW').value, hv = $('info-lineH').value, w = Number(wv), h = Number(hv);
  if (wv === '' || hv === '' || !(w >= 0.05) || !(h >= 0.05)) { $('hint').textContent = t('invalidTool'); return; }
  if (scope === 'all') { applyDiamondAll({ w, h, tool: null }); return; }
  const targets = doc.shapes.filter(sh => selected.has(sh.id) && isReplaceableDiamond(sh)); if (!targets.length) { $('hint').textContent = t('selectFirst'); return; }
  commit(() => { for (const sh of targets) { const pts = resizeDiamondLoop(sh, w, h); if (pts) sh.points = pts; } });
  $('hint').textContent = t('diamondLinesApplied', { n: targets.length, w, h });
}
function applyHoleToolEdit(all = false) {
  const hs = doc.holes.filter(h => selected.has(h.id)), ids = new Set(hs.map(h => h.toolId)); if (ids.size !== 1) return;
  const cur = doc.tools.find(x => x.id === [...ids][0]); if (!cur) { $('hint').textContent = t('holeToolMissing'); return; }
  const num = id => { const v = $(id).value; return v === '' || v === null ? NaN : Number(v); };
  const tool = { ...cur, holeW: num('info-holeW'), holeH: num('info-holeH'), pitch: num('info-holePitch'), teeth: num('info-holeTeeth'), angleDeg: num('info-holeAngle') };
  const sample = newDoc(); sample.tools = [tool];
  if (![tool.holeW, tool.holeH, tool.pitch, tool.teeth, tool.angleDeg].every(Number.isFinite) || !validateDoc(sample)) { $('hint').textContent = t('invalidTool'); return; }
  if (all) { applyDiamondAll({ w: tool.holeW, h: tool.holeH, tool }); return; }   /* 全体の菱目に反映：穴は全部この工具に・菱の線も同じ大きさに */
  commit(() => { const i = doc.tools.findIndex(x => x.id === tool.id); if (i >= 0) doc.tools[i] = tool; });
  const keep = $('stitchTool').value; refreshTools(); $('stitchTool').value = keep; persistTools();   /* 工具設定で選んでいる工具は、そのまま */
  $('hint').textContent = t('holeToolApplied', { name: tool.name, w: tool.holeW, h: tool.holeH, p: tool.pitch, t: tool.teeth, a: tool.angleDeg, n: doc.holes.filter(h => h.toolId === tool.id).length });
}
/** 選んだ菱目（穴）の工具を、工具設定の欄に読み込む（大きさなどを自分で直せる）。 */
function loadHoleToolToEditor() {
  const h = doc.holes.find(x => selected.has(x.id)); if (!h) return; const tool = doc.tools.find(x => x.id === h.toolId);
  if (!tool) { $('hint').textContent = t('holeToolMissing'); return; }
  $('stitchTool').value = tool.id; fillTool(); const ed = $('toolEditorCard'); if (ed) { for (let p = ed; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; ed.scrollIntoView?.({ block: 'nearest' }); }
  $('hint').textContent = t('holeToolLoaded', { name: tool.name });
}
function refreshInfo() {
  const s = infoShape(), many = s ? [] : infoShapes(); infoBusy = true;
  const hs = !s && !many.length ? doc.holes.filter(h => selected.has(h.id)) : [], dl = s ? diamondLoopSizes([s]) : many.length ? diamondLoopSizes(many) : [], spec = hs.length ? holeSpecText(hs) : dl.length ? diamondLineSpecText(dl) : '', subj = s ? [s] : many, dOnly = !!subj.length && dl.length === subj.length;   /* dOnly：選んだのが菱の線だけ（穴と同じ並びで出す） */   /* 選んだ菱目の工具の規格・菱の線の大きさ */
  $('l-holeSpec').hidden = !spec; $('info-holeSpec').textContent = spec; $('info-holeToolLoad').hidden = !hs.length;
  { /* 選んだ穴が、菱形の1つの工具だけのとき：その工具の値を入力欄に入れて、直せるようにする */
    const toolIds = [...new Set(hs.map(h => h.toolId))], one = hs.length && toolIds.length === 1 ? doc.tools.find(x => x.id === toolIds[0]) : null, edit = !!one && one.kind === 'diamond'; $('l-holeEdit').hidden = !edit;
    { const sc = hs.length ? holeSlantCounts(hs.filter(h => ['diamond', 'slit'].includes(holeAppearance(h, doc)?.kind))) : null, any = !!sc && sc.fwd + sc.rev + sc.other > 0; $('l-holeSlant').hidden = !any; if (any) $('info-holeSlant').textContent = t('holeSlantLine', { f: sc.fwd, r: sc.rev, o: sc.other ? t('holeSlantOther', { n: sc.other }) : '' }); }   /* 菱目の穴を選んでいるとき：いまの傾き（順目・逆目の数）と、入れ替えボタン */
    $('l-diamondMode').hidden = !(hs.length || dOnly); $('info-diamondModeNow').textContent = t('diamondModeName_' + diamondMode());   /* 菱目を選んでいるとき：全体の菱目の見せ方（中抜き・中塗り）のボタン */
    $('l-lineEdit').hidden = !dOnly; if (dOnly) for (const [id, v] of [['info-lineW', dl[0].w], ['info-lineH', dl[0].h]]) { const el = $(id); if (!(typeof document.activeElement !== 'undefined' && document.activeElement === el)) el.value = String(+v.toFixed(2)); }   /* 菱の線だけ選んでいるとき：いまの大きさを入れる */
    if (edit) for (const [id, key] of [['info-holeW', 'holeW'], ['info-holeH', 'holeH'], ['info-holePitch', 'pitch'], ['info-holeTeeth', 'teeth'], ['info-holeAngle', 'angleDeg']]) { const el = $(id); if (!(typeof document.activeElement !== 'undefined' && document.activeElement === el)) el.value = String(+Number(one[key]).toFixed(2)); }   /* 打ちかけの欄は巻き戻さない */
  }
  const holes = s ? holeCountOn([s]) : many.length ? holeCountOn(many) : null; $('l-holeCount').hidden = holes === null; if (holes !== null) $('info-holeCount').textContent = String(holes);   /* 選んだ線上の菱目の数（読み取り専用） */
  $('infoCard').style.display = s || many.length || hs.length ? '' : 'none'; /* 何も選んでいないときは情報カードを出さない */
  $('l-totalLength').hidden = !many.length; if (many.length) $('info-totalLength').textContent = totalLengthOf(many).toFixed(2); /* 2 個以上：全体の長さ（読み取り専用） */
  if (many.length) { /* 2 個以上：層・色・線の種類だけ。変えると選んだ全部に効く */
    const colorable = many.filter(x => INFO_FIELDS[x.type]?.includes('color'));
    for (const f of ALL_FIELDS) $('l-' + f).hidden = !(colorable.length && COLOR_FIELDS.includes(f));
    $('l-type').hidden = $('l-layer').hidden = false;
    for (const id of ['l-part', 'l-partName', 'l-thickness', 'l-partOrder', 'l-addNodes']) $(id).hidden = true;
    $('info-type').textContent = dOnly ? t('diamondLinesSelected', { n: many.length }) : t('multiSelected', { n: many.length }); $('info-layer').value = commonValue(many, x => x.layer);
    if (colorable.length) { $('info-color').value = commonValue(colorable, x => x.color || ''); $('info-lineStyle').value = commonValue(colorable, x => x.lineStyle || ''); }
    infoBusy = false; return;
  }
  for (const f of ALL_FIELDS) $('l-' + f).hidden = !s || !INFO_FIELDS[s.type]?.includes(f);
  $('l-type').hidden = $('l-layer').hidden = !s; if (s) $('l-part').hidden = false;
  $('l-addNodes').hidden = !(s && ['line', 'polyline', 'path', 'bezier'].includes(s.type) && editable(s)); /* 節点を等間隔で足す */
  if (hs.length) { for (const id of ['l-slope', 'l-nodeOps', 'l-part', 'l-partName', 'l-thickness', 'l-partOrder']) { const el = $(id); if (el) el.hidden = true; } $('l-type').hidden = false; $('info-type').textContent = t('holesSelected', { n: hs.length }); }   /* 穴だけ選んでいるとき：種類の欄に「菱目 n 個」・ほかの欄は隠す */
  if (s) {
    $('info-type').textContent = t(s.type); $('info-layer').value = s.layer;
    const typing = el => typeof document.activeElement !== 'undefined' && document.activeElement === el; // 打ちかけの欄は巻き戻さない
    for (const f of ['x','y','x1','y1','x2','y2','cx','cy','r','startDeg','endDeg','sizeMm','angleDeg','offset']) if (f in s && !typing($('info-' + f))) $('info-' + f).value = Number(s[f]).toFixed(2);
    if ('text' in s && !typing($('info-text'))) $('info-text').value = s.text;
    if ('closed' in s) $('info-closed').checked = s.closed;
    if ('inner' in s) $('info-inner').checked = s.inner;
    if (INFO_FIELDS[s.type]?.includes('color')) { $('info-color').value = s.color || ''; $('info-lineStyle').value = s.lineStyle || ''; }
    $('info-length').value = (s.type === 'fold' ? distance({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) : arcLength(s)).toFixed(2);
    { /* 直線（2点だけの折れ線を含む）の角度：水平から左まわり（0〜180度・小数3桁）。重なった線のどれが真っ直ぐか見分けるため（事業主の質問 2026-10-17） */
      const ends = s.type === 'line' ? [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }] : s.type === 'polyline' && !s.closed && s.points?.length === 2 ? s.points : null, el = $('info-slope'), row = $('l-slope');
      if (row) row.hidden = !ends;
      if (ends && el) { const dx = ends[1].x - ends[0].x, dy = ends[1].y - ends[0].y; let a = Math.atan2(-dy, dx) * 180 / Math.PI; if (a < 0) a += 180; if (a >= 180 - 1e-9) a -= 180; el.textContent = t('infoSlope', { a: a.toFixed(3), kind: t(a < 0.0005 || a > 179.9995 ? 'slopeH' : Math.abs(a - 90) < 0.0005 ? 'slopeV' : 'slopeDiag') }); }
    }
    renderPartInfo(s);
    if (s.type === 'polyline' || s.type === 'path') { $('info-nodes').textContent = String((s.points || s.nodes).length); $('info-area').textContent = s.closed ? areaOf(s.type === 'path' ? flattenForArea(s) : s.points).toFixed(1) + ' mm²' : '—'; }
    $('l-nodeOps').hidden = !(s.type === 'path' && nodeSel?.id === s.id);
    if (dOnly) { for (const id of ['l-length', 'l-closed', 'l-nodes', 'l-area', 'l-addNodes', 'l-slope', 'l-nodeOps']) { const el = $(id); if (el) el.hidden = true; } $('info-type').textContent = t('diamondLinesSelected', { n: 1 }); }   /* 菱の線：穴と同じ並び（形に関係する欄は隠す・事業主の指摘 2026-10-18「同じ菱目なのに表示の仕方が違う」） */
  }
  infoBusy = false;
}
/** 選んだ線（直線・折れ線・ペン・ベジェ）に、節点を等間隔で n 個足す。全長を n+1 等分する位置に足す（すでに節点がある位置は足さない）。形は変わらず、ペン（節点を持つ線）になる。元に戻すは1回。 */
function addNodesEqually() {
  const s = infoShape(); if (!s || !editable(s) || !['line', 'polyline', 'path', 'bezier'].includes(s.type)) { $('hint').textContent = t('selectFirst'); return; }
  const n = Number($('info-addNodes').value); if (!Number.isInteger(n) || n < 1 || n > 100) { $('hint').textContent = t('addNodesRange'); return; }
  const base = toPath(s), len = arcLength(base), segs = pathSegments(base); let acc = 0; const have = [0]; for (const g of segs) { acc += arcLength(g); have.push(acc); }
  const spots = Array.from({ length: n }, (_, k) => len * (k + 1) / (n + 1)).filter(x => !have.some(h => Math.abs(h - x) < 1e-6));
  if (!spots.length) { $('hint').textContent = t('addNodesNone'); return; }
  let next = base; for (const x of spots) next = pathInsertNode(next, x);
  nodeSel = null; transformSelectedTo(next); $('hint').textContent = t('addedNodes', { n: spots.length });
}
function flattenForArea(s) { const pts = pathSegments(s).flatMap((seg, i) => { const ps = seg.type === 'line' ? [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }] : Array.from({ length: 17 }, (_, k) => { const t = k / 16, u = 1 - t; return { x: u**3*seg.x1 + 3*u*u*t*seg.c1x + 3*u*t*t*seg.c2x + t**3*seg.x2, y: u**3*seg.y1 + 3*u*u*t*seg.c1y + 3*u*t*t*seg.c2y + t**3*seg.y2 }; }); return i ? ps.slice(1) : ps; }); return pts; }
/** 2 個以上選んでいるときの層・色・線の種類。選んだ全部に当て、元に戻すは 1 回。 */
function applyInfoMulti(field, list) {
  if (!['layer', 'color', 'lineStyle'].includes(field)) return;
  const v = $('info-' + field).value; if (v === '__mixed') return;
  const targets = field === 'layer' ? list : list.filter(x => INFO_FIELDS[x.type]?.includes('color')), hints = [], nexts = new Map();
  for (const x of targets) { if (field === 'layer') nexts.set(x.id, { ...x, layer: v }); else { const r = restyled(x, field, v); nexts.set(x.id, r.next); if (r.hint) hints.push(r.hint); } }
  if (!nexts.size || !validateDoc({ ...doc, shapes: doc.shapes.map(x => nexts.get(x.id) || x) })) { $('hint').textContent = t('invalidNumber'); refreshInfo(); return; }
  cancel(); commit(() => { doc.shapes = doc.shapes.map(x => nexts.get(x.id) || x); });
  $('hint').textContent = t('multiApplied', { n: nexts.size }) + (hints.length ? ' ' + t(hints[0]) : '');
}
function applyInfo(field) {
  if (infoBusy) return; const many = infoShapes(); if (many.length) { applyInfoMulti(field, many); return; }
  const s = infoShape(); if (!s || !editable(s)) return;
  const num = f => Number($('info-' + f).value);
  let next = { ...s };
  if (field === 'layer') { next.layer = $('info-layer').value; }
  else if (field === 'text') { const text = $('info-text').value; if (!text) { $('hint').textContent = t('invalidNumber'); return; } next.text = text; }
  else if (field === 'closed') { if (s.type === 'polyline' && s.points.length < 3) return; next.closed = $('info-closed').checked; }
  else if (field === 'inner') { next.inner = $('info-inner').checked; }
  else if (field === 'color' || field === 'lineStyle') { const r = restyled(s, field, $('info-' + field).value); next = r.next; if (r.hint) $('hint').textContent = t(r.hint); }
  else if (field === 'length') {
    const len = num('length'); if (!(len > 0)) { $('hint').textContent = t('invalidNumber'); return; }
    if (s.type === 'line' || s.type === 'dimension') { const cur = distance({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }); if (cur < 1e-9) return; next.x2 = s.x1 + (s.x2 - s.x1) * len / cur; next.y2 = s.y1 + (s.y2 - s.y1) * len / cur; }
    else if (s.type === 'arc') next.endDeg = s.startDeg + len / s.r * 180 / Math.PI;
    else return;
  } else { const v = num(field); if (!Number.isFinite(v) || (field === 'r' && v <= 0) || (field === 'sizeMm' && v <= 0)) { $('hint').textContent = t('invalidNumber'); return; } next[field] = v; }
  if (s.type === 'bezier' && ['x1','y1','x2','y2'].includes(field)) { const dx = next[field] - s[field]; const c = field[0] === 'x' ? (field === 'x1' ? 'c1x' : 'c2x') : (field === 'y1' ? 'c1y' : 'c2y'); next[c] = s[c] + dx; }
  if (!validateDoc({ ...doc, shapes: doc.shapes.map(x => x.id === s.id ? next : x) })) { $('hint').textContent = t('invalidNumber'); refreshInfo(); return; }
  transformSelectedTo(next);
}
/** 選択中の 1 図形を next に置き換え、経路の穴を追従させる。 */
/** 縫い穴の付いた線の端を動かしても、菱目が線の上に残るか：直線（2点だけの折れ線を含む）を、同じ直線の上で延ばす・縮めるだけなら true。向きを変える動かし方（菱目が線から外れる）や、直線以外は false。 */
function lineEndKeepsHoles(shape, next) {
  const straight = x => x.type === 'line' || (x.type === 'polyline' && !x.closed && x.points.length === 2), pts = x => x.type === 'line' ? [{ x: x.x1, y: x.y1 }, { x: x.x2, y: x.y2 }] : x.points;
  if (!straight(shape) || !straight(next)) return false;
  const ids = new Set(doc.paths.filter(p => p.shapeIds.includes(shape.id)).map(p => p.id)), [a, b] = pts(next), L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 1e-9) return false;
  return doc.holes.filter(h => ids.has(h.pathId) && distTo(shape, h) <= 0.02).every(h => Math.abs((b.x - a.x) * (h.y - a.y) - (b.y - a.y) * (h.x - a.x)) / L <= 0.02);   /* 元の線の上にある菱目が、新しい線を延ばした直線の上にも載っている */
}
/** 菱目（縫い穴）が付いた線の端を動かす：菱目は今ある場所に残し、線の上の位置（s）と打った区間を、新しい線に合わせて取り直す。縮めて線の外へはみ出した菱目だけ削除する。延ばした部分には菱目は付かない（事業主決定 2026-10-17：点線を延長して結合したい）。 */
function moveShapeKeepingHoles(next) {
  cancel();
  commit(() => {
    const paths = doc.paths.filter(p => p.shapeIds.includes(next.id)), olds = new Map(paths.map(p => [p.id, resolvePath(doc, p)]));
    doc.shapes = doc.shapes.map(x => x.id === next.id ? next : x);
    for (const saved of paths) {
      const old = olds.get(saved.id), route = resolvePath(doc, saved);
      if (!route || !old) { doc.holes = doc.holes.filter(h => h.pathId !== saved.id); doc.paths = doc.paths.filter(p => p.id !== saved.id); continue; }
      const len = arcLength(route), oldLen = arcLength(old), keep = new Set();
      for (const h of doc.holes.filter(h => h.pathId === saved.id)) { const pr = projectOnPath(route, h); if (distance(pr, h) <= 0.02 && pr.s >= -1e-6 && pr.s <= len + 1e-6) { h.s = pr.s; keep.add(h.id); } }
      doc.holes = doc.holes.filter(h => h.pathId !== saved.id || keep.has(h.id));
      const mapped = v => projectOnPath(route, pointAtLength(old, Math.min(Math.max(v, 0), oldLen))).s;
      saved.segments = saved.segments.map(seg => { const a = mapped(seg.from), b = mapped(seg.to); return { ...seg, from: Math.min(a, b), to: Math.max(a, b) }; });
    }
  });
}
function transformSelectedTo(next) {
  cancel();
  commit(() => {
    doc.shapes = doc.shapes.map(x => x.id === next.id ? next : x);
    for (const saved of doc.paths.filter(p => p.shapeIds.includes(next.id))) {
      const route = resolvePath(doc, saved);
      if (!route) { doc.holes = doc.holes.filter(h => h.pathId !== saved.id); doc.paths = doc.paths.filter(p => p.id !== saved.id); continue; }
      const len = arcLength(route);
      for (const h of doc.holes.filter(h => h.pathId === saved.id)) { const q = pointAtLength(route, Math.min(h.s, len)); h.x = q.x; h.y = q.y; h.s = q.s; }
      saved.segments = saved.segments.map(seg => ({ ...seg, from: Math.min(seg.from, len), to: Math.min(seg.to, len) }));
    }
  });
}
// ---- 部品（厚み）・折り線・折り代・重ね補正 ----
function renderPartInfo(s) {
  const select = $('info-part'); select.textContent = '';
  const none = document.createElement('option'); none.value = ''; none.textContent = t('noPart'); select.appendChild(none);
  for (const p of doc.parts) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; select.appendChild(o); }
  const part = s ? partOf(s) : null; select.value = part ? part.id : '';
  $('l-thickness').hidden = $('l-partName').hidden = $('l-partOrder').hidden = !part;
  if (part) { $('info-thickness').value = part.thickness; $('info-partName').value = part.name; $('info-partOrder').value = part.order ?? 0; }
}
function assignPart() {
  const s = infoShape(); if (!s) return; const id = $('info-part').value;
  commit(() => { for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(x => x !== s.id); const p = doc.parts.find(p => p.id === id); if (p) p.shapeIds.push(s.id); });
}
function newPart() {
  const ids = [...selectedShapeIds()].filter(id => { const s = doc.shapes.find(s => s.id === id); return s && stitchable(s); });
  if (!ids.length) { $('hint').textContent = t('selectFirst'); return; }
  const thickness = Number($('partThickness').value); if (!(thickness >= 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const id = freshId(doc.parts, 'part');
  commit(() => { for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(x => !ids.includes(x)); doc.parts.push({ id, name: t('partName_default', { n: id.slice(4) }), thickness, shapeIds: ids, color: null, order: doc.parts.length }); });
  $('hint').textContent = t('partCreated', { n: ids.length, t: thickness });
}
function applyPartField(field) {
  const s = infoShape(); const part = s && partOf(s); if (!part) return;
  if (field === 'thickness') { const v = Number($('info-thickness').value); if (!(v >= 0)) { $('hint').textContent = t('invalidNumber'); return; } commit(() => { part.thickness = v; }); }
  else if (field === 'partName') { const v = $('info-partName').value.trim(); if (v) commit(() => { part.name = v; }); }
  else if (field === 'partOrder') { const v = Number($('info-partOrder').value); if (Number.isFinite(v)) commit(() => { part.order = v; }); }
}
/** 選択中の折り線をまたぐ部品の閉図形に、折り代 ΔL を足した新しい図形を作る（元は残す）。 */
/** 貼り合わせの曲げ検証（事業主指示 2026-10-17）：表と裏の部品・厚みを選び、貼り合わせたときの曲げ・寸法の過不足・菱目の数と位置を調べる。計算は laminate.js。 */
function fillLaminateParts() {
  for (const [id, k] of [['lamOuter', 0], ['lamInner', 1]]) {
    const sel = $(id), cur = sel.value; sel.textContent = '';
    for (const p of doc.parts) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); }
    sel.value = doc.parts.some(p => p.id === cur) ? cur : (doc.parts[k]?.id ?? '');
  }
}
/** 部品を作る・名前を変える・消す・タブを切り替えると、検証カードの選択欄を最新にする（「検証する」を押さなくても）。一覧が変わったときだけ作り直す（開いている選択欄を閉じないため）。 */
function refreshLaminateParts() {
  const live = p => p.shapeIds.filter(id => doc.shapes.some(s => s.id === id)).length, sig = doc.parts.map(p => p.id + ':' + p.name + ':' + live(p) + ':' + p.thickness).join('|'); if (sig === lamSig) return; lamSig = sig; fillLaminateParts(); renderLaminateParts();
  if (!lamTouched.o) laminateThickFromPart('o'); if (!lamTouched.i) laminateThickFromPart('i');
}
/** 検証カードの「部品の一覧」：作った部品が、名前（書き換えられる）・図形の数・厚みつきで、すぐ見える。「選ぶ」でその部品の図形を選択・「消す」で部品だけ消す（図形は残る）。 */
/** 三つ折りの展開（ply＝'outer'｜'inner'）の外形と円の id。点線・寸法・文字・菱目は入れない。 */
function foldUnfoldPartIds(ply) { return doc.shapes.filter(s => s.foldFlat === 'fdu' && s.ply === ply && (s.type === 'polyline' || s.type === 'circle')).map(s => s.id); }
/** 「三つ折りの展開の表・裏を、部品にする」：表と裏を、1回で「表」「裏」の部品にする（もう一度押すと置き換える）。厚みは設計の値。 */
function makeFoldUnfoldParts() {
  const box = $('lamResult'); box.textContent = ''; const o = foldUnfoldPartIds('outer'), i = foldUnfoldPartIds('inner');
  if (!o.length || !i.length) { const d = document.createElement('div'); d.className = 'lam-error'; d.textContent = t('lamAutoNone'); box.appendChild(d); $('hint').textContent = t('lamAutoNone'); return; }
  const fd = doc.foldDesign || {}, tO = Number(fd.tOuter ?? fd.t) > 0 ? Number(fd.tOuter ?? fd.t) : Number($('partThickness').value) || 1.5, tI = Number(fd.tInner ?? fd.t) > 0 ? Number(fd.tInner ?? fd.t) : tO; let ids = [];
  commit(() => {
    doc.parts = doc.parts.filter(p => !p.autoPly); const mk = (ply, name, thickness, shapeIds) => { const id = freshId(doc.parts, 'part'); for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(x => !shapeIds.includes(x)); doc.parts.push({ id, name, thickness, shapeIds, color: null, order: doc.parts.length, autoPly: ply }); return id; };
    ids = [mk('outer', t('lamPartOuterName'), tO, o), mk('inner', t('lamPartInnerName'), tI, i)];
  });
  fillLaminateParts(); $('lamOuter').value = ids[0]; $('lamInner').value = ids[1]; lamTouched.o = false; lamTouched.i = false; laminateThickFromPart('o'); laminateThickFromPart('i');
  const d = document.createElement('div'); d.textContent = t('lamAutoDone', { a: o.length, b: i.length, to: tO, ti: tI }); box.appendChild(d); $('hint').textContent = d.textContent;
}
/** 手で描いた図形を、表（'o'）・裏（'i'）の部品にする（事業主の指摘 2026-10-18「表の部品と裏の部品を登録できない」）。
 *  選んだ図形で、部品「表」「裏」を作り（同じ名前の部品があれば、図形を入れ替える）、表の部品・裏の部品の欄に入れる。厚みは、表・裏の革の厚みの欄の値。 */
function makeLamPart(which) {
  const ids = [...selectedShapeIds()].filter(id => { const sh = doc.shapes.find(q => q.id === id); return sh && stitchable(sh) && !['text', 'dimension', 'image', 'fold'].includes(sh.type); });
  if (!ids.length) { $('hint').textContent = t('selectFirst'); return; }
  const name = t(which === 'o' ? 'lamPartOuterName' : 'lamPartInnerName'), th = Number($(which === 'o' ? 'lamTOuter' : 'lamTInner').value), pt = Number($('partThickness').value), thickness = th > 0 ? th : pt > 0 ? pt : 1.5;
  let id = null;
  commit(() => {
    for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(x => !ids.includes(x));   /* 1つの図形は、1つの部品にだけ属する */
    let part = doc.parts.find(p => p.name === name && !p.autoPly);
    if (part) { part.shapeIds = ids; part.thickness = thickness; } else { part = { id: freshId(doc.parts, 'part'), name, thickness, shapeIds: ids, color: null, order: doc.parts.length }; doc.parts.push(part); }
    id = part.id;
  });
  fillLaminateParts(); $(which === 'o' ? 'lamOuter' : 'lamInner').value = id; renderLaminateNow();
  $('hint').textContent = t(which === 'o' ? 'lamMadeOuter' : 'lamMadeInner', { n: ids.length, t: thickness });
}
function renderLaminateParts() {
  const box = $('lamParts'); box.textContent = '';
  if (!doc.parts.length) { const d = document.createElement('div'); d.className = 'note'; d.textContent = t('lamPartsNone'); box.appendChild(d); return; }
  const cur = id => doc.parts.find(q => q.id === id), count = p => p.shapeIds.filter(sid => doc.shapes.some(s => s.id === sid));
  for (const p of doc.parts) {
    const id = p.id, row = document.createElement('div'); row.className = 'lam-part';
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 40; name.value = p.name; name.dataset.role = 'name';
    name.addEventListener('change', () => { const part = cur(id), v = name.value.trim(); if (part && v && v !== part.name) commit(() => { part.name = v; }); else if (part) name.value = part.name; });
    const info = document.createElement('span'); const bx = partBox(doc, p); info.textContent = t('lamPartRow', { n: count(p).length, t: p.thickness, w: bx ? (bx.maxX - bx.minX).toFixed(2) : '-', h: bx ? (bx.maxY - bx.minY).toFixed(2) : '-' });
    const pick = document.createElement('button'); pick.dataset.role = 'pick'; pick.textContent = t('lamPartPick');
    pick.onclick = () => { const part = cur(id); if (!part) return; const ids = count(part); selected = new Set(ids); draw(); $('hint').textContent = t('lamPartPicked', { name: part.name, n: ids.length }); };
    const del = document.createElement('button'); del.dataset.role = 'del'; del.textContent = t('lamPartDel');
    del.onclick = () => { const part = cur(id); if (!part) return; const nm = part.name; commit(() => { doc.parts = doc.parts.filter(q => q.id !== id); for (const s of doc.shapes) if (s.type === 'fold' && s.partId === id) s.partId = null; }); $('hint').textContent = t('lamPartDeleted', { name: nm }); };
    for (const el of [name, info, pick, del]) row.appendChild(el); box.appendChild(row);
  }
}
/** 「もう一方の全長（目標）」の欄のすぐ上に、いまの全長（表・裏）・差・曲げを、部品を選んだ時点で自動で出す（事業主の質問 2026-10-18「選択した時点で自動算出できないのか」）。目標を入れても、ここは「いまの長さ」のまま。 */
function renderLaminateNow() {
  const box = $('lamNow'); if (!box) return;
  const o = $('lamOuter').value, i = $('lamInner').value; if (doc.parts.length < 2) { box.textContent = t('lamNowNeedParts'); return; } if (o && o === i) { box.textContent = t('lamNowSame'); return; }
  /* 厚みは、手で直していれば欄の数字、直していなければ部品の厚み（欄は書き換えない：入力の途中の数字を消さないため） */
  const axis = $('lamAxis').value, r = laminateNow(doc, o, i, { tOuter: lamTouched.o ? Number($('lamTOuter').value) : undefined, tInner: lamTouched.i ? Number($('lamTInner').value) : undefined, axis: axis === 'x' || axis === 'y' ? axis : 'auto' }); if (!r) { box.textContent = t('lamNowNeedParts'); return; }
  const f2 = v => (+v).toFixed(2), b = r.bend, head = t('lamNowLine', { o: f2(r.outerLen), i: f2(r.innerLen), dl: f2(r.diff) });
  box.textContent = head + ' ' + (b.curl === 'none' ? t('lamNowNone') : b.ok ? t('lamNowBend', { r: f2(b.radius), a: b.thetaDeg.toFixed(1), side: t(b.curl === 'outer' ? 'lamSideOuter' : 'lamSideInner') }) : t('lamNowTooMuch'));
}
function laminateThickFromPart(which) {
  const part = doc.parts.find(p => p.id === $(which === 'o' ? 'lamOuter' : 'lamInner').value); lamTouched[which] = false; if (part) $(which === 'o' ? 'lamTOuter' : 'lamTInner').value = String(part.thickness);
}
/** 全長・幅の寸法を、まとめて足す（足りない寸法の案すべて）。 */
function addLaminateDims(list) {
  commit(() => { for (const sg of list) { const b = sg.box, v = sg.value, id = freshId(doc.shapes, 's'), layer = ensureLayer(doc, 'guide'); doc.shapes.push(sg.horizontal ? { id, type: 'dimension', layer, x1: b.minX, y1: b.minY, x2: b.minX + v, y2: b.minY, offset: -8 } : { id, type: 'dimension', layer, x1: b.minX, y1: b.minY, x2: b.minX, y2: b.minY + v, offset: 8 }); } });
  runLaminate(); $('hint').textContent = t('lamAddedAll', { n: list.length });
}
function addLaminateDim(sg) {
  const b = sg.box, v = sg.value; commit(() => { const id = freshId(doc.shapes, 's'), layer = ensureLayer(doc, 'guide'); doc.shapes.push(sg.horizontal ? { id, type: 'dimension', layer, x1: b.minX, y1: b.minY, x2: b.minX + v, y2: b.minY, offset: -8 } : { id, type: 'dimension', layer, x1: b.minX, y1: b.minY, x2: b.minX, y2: b.minY + v, offset: 8 }); });
  runLaminate(); $('hint').textContent = t('lamAdded', { v: v.toFixed(2), side: t(sg.side === '表' ? 'lamSideOuter' : 'lamSideInner') });
}
/** 曲げ区間の入力（例：28.1-81, 155-202）を [[28.1, 81], [155, 202]] にする。区切りは , ， 、 ; 空白、「から」は - ー〜~。読めなければ null（点線から自動）。 */
function parseLaminateZones(text) {
  const out = []; for (const part of String(text || '').split(/[,，、;；\s]+/).filter(Boolean)) { const m = part.match(/^(-?\d+(?:\.\d+)?)[-ー〜～~](-?\d+(?:\.\d+)?)$/); if (m) out.push([Number(m[1]), Number(m[2])]); }
  return out.length ? out : null;
}
/* ───────── 表の部品と裏の部品から、1枚の三つ折り断面図（事業主の選択 2026-10-19・案A）。曲げ部は、菱目の間隔が変わる範囲（なければ縦の点線）から自動で見つける（同日の事業主の希望） ───────── */
const lamSecDiff = v => { const r = Math.round(v * 100) / 100; return (r > 0 ? '+' : '') + r.toFixed(2); };   /* 差の表示：+1.00・0.00・-0.50 */
function makeLamSection() {
  const box = $('lamResult'); box.textContent = '';
  const line = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); }, fail = (key, p) => { const m = t(key, p); line(m, 'lam-error'); $('hint').textContent = m; };
  if (doc.parts.length < 2) { fail('lamNeedParts'); return; }
  fillLaminateParts(); const po = doc.parts.find(p => p.id === $('lamOuter').value), pi = doc.parts.find(p => p.id === $('lamInner').value); if (!po || !pi || po === pi) { fail('lamErr_pickTwo'); return; }
  if (!lamTouched.o) laminateThickFromPart('o'); if (!lamTouched.i) laminateThickFromPart('i');
  const tO = Number($('lamTOuter').value), tI = Number($('lamTInner').value), axisSel = $('lamAxis').value, now = laminateNow(doc, po.id, pi.id, { tOuter: tO, tInner: tI, axis: axisSel === 'x' || axisSel === 'y' ? axisSel : 'auto' });
  if (!(tO > 0 && tI > 0)) { fail('lamErr_thickness'); return; } if (!now) { fail('lamErr_emptyPart'); return; }
  const specs = {}, sideName = k => t(k === 'outer' ? 'lamSideOuter' : 'lamSideInner');
  for (const [side, part] of [['outer', po], ['inner', pi]]) { const r = lamFoldSpec(doc, part, { axis: now.axis }); if (!r.ok) { fail('lamSecErr_' + r.error, { side: sideName(side), n: r.count ?? 0 }); return; } specs[side] = r; }
  const base = $('lamBase').value === 'inner' ? 'inner' : 'outer', plan = foldStackPlan({ outer: specs.outer, inner: specs.inner, tO, tI, base, outerHoles: specs.outer.holes, innerHoles: specs.inner.holes });
  if (!plan.ok) { fail('lamSecErr_' + plan.error, { k: plan.index ?? 0 }); return; }
  const b = bboxOfDoc({ ...doc, shapes: doc.shapes.filter(s => visible(s) && !s.foldSec), holes: [] }) || { maxY: 0 }, x0 = partBox(doc, po)?.minX ?? 0, origin = { x: x0, y: b.maxY + 40 + 2 * plan.bends[0] / Math.PI + plan.T }, key = `lam:${po.id}:${pi.id}`;
  commit(() => {
    doc.foldSections ||= {};
    for (const [id, m] of Object.entries(doc.foldSections)) if (m.key === key) { doc.shapes = doc.shapes.filter(s => s.foldSec !== id); delete doc.foldSections[id]; }   /* 同じ組み合わせの前の断面は置き換える */
    let n = 1; while (doc.foldSections['fs' + n]) n++; const secId = 'fs' + n, gid = nextGroupId(doc.shapes);
    if (!doc.layers.some(l => l.id === 'section')) doc.layers.push({ id: 'section', name: t('foldSecLayer'), visible: true, locked: false });
    doc.foldSections[secId] = { key, flats: plan.flats, bends: plan.bends, flip: plan.flip, t: plan.T / 2, plies: FOLD_SEC_PLIES, T: plan.T, glueK: plan.glueK, x0, x1: x0 + specs.outer.length, lam: true };
    for (const sh of foldSectionShapes(plan.path, plan.T, origin, FOLD_SEC_PLIES, plan.T / 2 - tI)) doc.shapes.push({ ...sh, id: freshId(doc.shapes, 's'), layer: 'section', groupId: gid, foldSec: secId });   /* 貼り合わせ線は、裏の革の厚みぶん内側の面から */
    for (const [ss, side] of [[plan.outerS, 'outer'], [plan.innerS, 'inner']]) for (const hm of foldHoleMarks(plan.path, ss, plan.T, origin).filter(m => m.side === side)) doc.shapes.push({ ...hm, id: freshId(doc.shapes, 's'), layer: 'section', color: 'blue', foldSec: secId });   /* 表の菱目は外側の面・裏の菱目は内側の面 */
  });
  const f2 = v => (+v).toFixed(2), r = plan.report, baseName = sideName(r.base), otherName = sideName(r.base === 'outer' ? 'inner' : 'outer'), src = k => t('lamSecSrc_' + specs[k].source), warn = d => Math.abs(d) > 0.05 ? 'lam-warn' : '';
  const done = t('lamSecDone', { so: src('outer'), si: src('inner'), glue: f2(plan.glueLen), outer: f2(r.lenOuter), inner: f2(r.lenInner) }); line(done); $('hint').textContent = done;
  if (specs.outer.source === 'holes' || specs.inner.source === 'holes') line(t('lamSecHolesNote'), 'lam-warn');   /* 菱目から見つけた曲げ部は、折りの始まり・終わりが穴の位置どまり（±1ピッチ） */
  line(t('lamSecRadius', { a: f2(plan.radii[0].inner), b: f2(plan.radii[1].inner) }));
  r.flats.forEach((f, k) => line(t('lamSecFlat', { k: k + 1, o: f2(f.outer), i: f2(f.inner), d: lamSecDiff(f.diff) }), warn(f.diff)));
  r.bends.forEach((bd, k) => line(t('lamSecBend', { k: k + 1, o: f2(bd.outer), i: f2(bd.inner), base: baseName, other: otherName, w: f2(bd.want), d: lamSecDiff(bd.diff) }), warn(bd.diff)));
  line(t('lamSecTotal', { o: f2(r.lenOuter), i: f2(r.lenInner), base: baseName, other: otherName, w: f2(r.wantOther), d: lamSecDiff(r.diffTotal) }), warn(r.diffTotal));
  if (Math.abs(r.diffTotal) > 0.05) line(t('lamSecAdvice', { other: otherName, w: f2(r.wantOther), c: f2(r.base === 'outer' ? r.lenInner : r.lenOuter) }), 'lam-warn');
  draw();
}
/** 寸法が入っている層（レイヤー）を、表示にする（貼り合わせ検証の「寸法の層を表示する」ボタン。事業主の質問 2026-10-19「寸法非表示とは？どこにボタンがある？」）。元に戻すは1回。検証は出し直す。 */
function showDimensionLayers() {
  const ids = new Set(doc.shapes.filter(s => s.type === 'dimension' && !s.foldSec).map(s => s.layer));
  commit(() => { for (const l of doc.layers) if (ids.has(l.id)) l.visible = true; selected.clear(); }); renderLayers(); runLaminate(); renderLaminateNow();
}
function runLaminate() {
  const box = $('lamResult'); box.textContent = '';
  const line = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); return d; }, fail = key => { line(t(key), 'lam-error'); $('hint').textContent = t(key); };   /* エラーは、検証ボタンの下（カードの中）にも赤い文字で出す */
  if (doc.parts.length < 2) { fail('lamNeedParts'); return; }
  fillLaminateParts(); if ($('lamOuter').value === $('lamInner').value) { const other = doc.parts.find(p => p.id !== $('lamOuter').value); if (other) { $('lamInner').value = other.id; lamTouched.i = false; line(t('lamSwitched', { name: other.name }), 'lam-warn'); } }   /* 表と裏が同じ部品なら、裏を別の部品に切り替える */
  if (!lamTouched.o) laminateThickFromPart('o'); if (!lamTouched.i) laminateThickFromPart('i');
  const dimShapes = doc.shapes.filter(s => s.type === 'dimension' && !s.foldSec), dimsHidden = dimShapes.length > 0 && dimShapes.every(s => !layerVisible(s));   /* 寸法が、すべて非表示の層にあるとき：見えない寸法は、数えない・検査もしない */
  const axis = $('lamAxis').value, r = laminateCheck(doc, $('lamOuter').value, $('lamInner').value, { tOuter: Number($('lamTOuter').value), tInner: Number($('lamTInner').value), axis: axis === 'x' || axis === 'y' ? axis : 'auto', holeTol: Number($('lamTol').value) || 0.3, zones: parseLaminateZones($('lamZones').value), base: $('lamBase').value === 'inner' ? 'inner' : 'outer', targetLen: Number($('lamTarget').value) > 0 ? Number($('lamTarget').value) : undefined, checkDims: $('lamDimCheck').checked !== false && !dimsHidden, checkHoles: $('lamHoleCheck').checked !== false });
  if (!r.ok) { fail('lamErr_' + r.error); return; }
  const f2 = v => v.toFixed(2), b = r.bend, sideName = k => t(k === 'outer' ? 'lamSideOuter' : 'lamSideInner'), baseName = sideName(r.base), otherName = sideName(r.base === 'outer' ? 'inner' : 'outer');
  const issueText = is => { const side = is.side === '表' ? t('lamSideOuter') : is.side === '裏' ? t('lamSideInner') : '', from = is.params.from === '表' ? t('lamSideOuter') : t('lamSideInner'); return t('lamIssue_' + is.code + ((is.code === 'holesNone' || is.code === 'holesExtra') && is.params.loops > 0 ? 'Loops' : ''), { ...is.params, side, from, base: baseName, dir: is.params.dir ? t(is.params.dir === 'long' ? 'lamDirLong' : 'lamDirShort') : '' }); };
  const withAdd = (d, is) => { if (is.suggest && ['length', 'width', 'mate'].includes(is.suggest.role)) { const bt = document.createElement('button'); bt.textContent = t('lamAdd', { v: f2(is.suggest.value) }); bt.onclick = () => addLaminateDim(is.suggest); d.appendChild(bt); } };
  /* 1. 結論：基準と、直す件数 */
  const fixIssues = r.issues.filter(is => is.level === 'error' || is.code === 'holesNone'), notes = r.issues.filter(is => !fixIssues.includes(is));
  const dimNeeds = fixIssues.filter(is => is.code === 'needLength' || is.code === 'needWidth'), fixes = fixIssues.filter(is => !dimNeeds.includes(is)).sort((p, q) => (q.code === 'partsMismatch') - (p.code === 'partsMismatch'));   /* 部品の選び方の確認を最初に・足りない寸法は1件にまとめる */
  const nFix = fixes.length + (dimNeeds.length ? 1 : 0);
  line(nFix ? t('lamVerdictFix', { base: baseName, other: otherName, n: nFix }) : t('lamVerdictOk', { base: baseName, other: otherName }), nFix ? 'lam-error' : 'lam-ok');
  /* 2. 直すところ（番号つき・具体的な数字） */
  if (nFix) {
    line(t('lamFixTitle'), 'lam-h'); fixes.forEach((is, k) => withAdd(line((k + 1) + '. ' + issueText(is), is.level === 'error' ? 'lam-error' : 'lam-warn'), is));
    if (dimNeeds.length) { const list = dimNeeds.map(is => t(is.side === '表' ? 'lamSideOuter' : 'lamSideInner') + 'の' + t(is.code === 'needLength' ? 'lamRoleLength' : 'lamRoleWidth') + ' ' + is.params.v + ' mm').join('、'); const d = line((fixes.length + 1) + '. ' + t('lamFixDims', { n: dimNeeds.length, list }), 'lam-error'), bt = document.createElement('button'); bt.textContent = t('lamAddAllDims', { n: dimNeeds.length }); bt.onclick = () => addLaminateDims(dimNeeds.map(is => is.suggest)); d.appendChild(bt); }
  }
  /* 3. 参考：曲げの数字・曲げ区間・菱目の数・注意 */
  line(t('lamRefTitle'), 'lam-h');
  line(b.curl === 'none' ? t('lamBendNone') : b.ok ? t('lamBend', { r: f2(b.radius), a: b.thetaDeg.toFixed(1), side: t(b.curl === 'outer' ? 'lamSideOuter' : 'lamSideInner'), dl: f2(Math.abs(b.dL)), to: f2(r.outer.thickness), ti: f2(r.inner.thickness) }) : t('lamIssue_bendTooMuch', { dl: f2(Math.abs(b.dL)) }));
  if (r.mode === 'zones') { line(t(r.zoneSource === 'given' ? 'lamZonesGiven' : r.zoneSource === 'holes' ? 'lamZonesHoles' : 'lamZonesAuto', { n: r.zones.length })); r.zones.forEach((z, k) => line(t('lamZoneLine', { k: k + 1, a: f2(z.a), b: f2(z.b), deg: z.thetaDeg.toFixed(1), r: f2(z.radius), li: f2(z.lenInner) }))); } else if (b.curl !== 'none') line(t('lamZonesNone'));
  if (r.holes.count[0] + r.holes.count[1] > 0) line(t('lamHoles', { a: r.holes.count[0], b: r.holes.count[1], m: f2(r.holes.maxDev) }));
  if (r.holes.loops && r.holes.loops[0] + r.holes.loops[1] > 0) line(t('lamLoops', { a: r.holes.loops[0], b: r.holes.loops[1] }));
  if (dimsHidden && $('lamDimCheck').checked !== false) { const hiddenLayers = [...new Set(dimShapes.map(s => s.layer))].map(id => doc.layers.find(l => l.id === id)).filter(l => l && !l.visible), d = line(t('lamDimSkipped', { layers: hiddenLayers.map(layerName).join('・') }), 'lam-warn'), bt = document.createElement('button'); bt.textContent = t('lamShowDims'); bt.onclick = showDimensionLayers; d.appendChild(bt); }   /* 寸法が入っている層が非表示：その層の名前と、その場で表示にするボタン */
  const unpaired = notes.filter(is => is.code === 'unpaired'), only = from => unpaired.filter(is => is.params.from === from).map(is => is.params.v).join('・');   /* 片方にだけある寸法は、1行にまとめる */
  if (unpaired.length) line(t('lamNoteUnpaired', { text: [only('表') && t('lamUnpairedOuter', { list: only('表') }), only('裏') && t('lamUnpairedInner', { list: only('裏') })].filter(Boolean).join('／') }), 'lam-warn');
  for (const is of notes.filter(is => is.code !== 'unpaired')) withAdd(line(t(is.level === 'error' ? 'lamLevelError' : 'lamLevelWarn') + issueText(is), is.level === 'error' ? 'lam-error' : 'lam-warn'), is);
}
function addFoldAllowance() {
  const fold = doc.shapes.find(s => selected.has(s.id) && s.type === 'fold'); if (!fold) { $('hint').textContent = t('selectFold'); return; }
  const part = fold.partId ? doc.parts.find(p => p.id === fold.partId) : null;
  const mid = { x: (fold.x1 + fold.x2) / 2, y: (fold.y1 + fold.y2) / 2 };
  const targets = doc.shapes.filter(s => editable(s) && (s.type === 'polyline' || s.type === 'path') && s.closed && (part ? part.shapeIds.includes(s.id) : (b => b.minX <= mid.x && b.maxX >= mid.x && b.minY <= mid.y && b.maxY >= mid.y)(bboxOf(s))));
  if (!targets.length) { $('hint').textContent = t('noPartForFold'); return; }
  const thickness = part ? part.thickness : Number($('partThickness').value) || 1.5, k = Number($('foldK').value) || 0.5, delta = foldAllowance(thickness, fold.angleDeg, { k });
  cancel();
  commit(() => { const ids = []; for (const s of targets) { const pts = s.type === 'path' ? flattenForArea(s) : s.points; const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer: s.layer, type: 'polyline', closed: true, points: extendAcrossFold(pts, fold, delta) }); ids.push(id); } selected = new Set(ids); });
  $('hint').textContent = t('foldAdded', { d: delta.toFixed(2) });
}
/** 重ね順（part.order）が最大の部品を外側とし、内側の厚みの合計で外側の閉図形をオフセットした図形を作る。 */
function applyStack() {
  const parts = [...doc.parts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); if (parts.length < 2) { $('hint').textContent = t('needTwoParts'); return; }
  const outer = parts.at(-1), inner = parts.slice(0, -1).map(p => p.thickness), mode = $('stackMode').value;
  const d = mode === 'box' ? stackOffset(inner, { mode: 'box' }).perSide : stackOffset(inner, { mode: 'fold', angleDeg: Number($('stackAngle').value) || 180 }).perSide;
  const targets = doc.shapes.filter(s => outer.shapeIds.includes(s.id) && editable(s) && stitchable(s) && (s.closed || s.type === 'circle'));
  if (!targets.length) { $('hint').textContent = t('noClosedOuter'); return; }
  cancel();
  commit(() => { const ids = []; for (const s of targets) { const r = offsetShape(s, d); if (!r) continue; const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...r, id, layer: s.layer }); ids.push(id); } selected = new Set(ids); });
  $('hint').textContent = t('stackApplied', { d: d.toFixed(2), name: outer.name });
}
/** 反転コピーした図形群の中心に「裏返し裁断」の印を目印レイヤーに置く。 */
function flipMark(ids) {
  const shapes = doc.shapes.filter(s => ids.has(s.id) && stitchable(s)); if (!shapes.length) return;
  const b = bboxOfDoc({ shapes, holes: [] }), layer = doc.layers.find(l => l.id === 'guide') ? 'guide' : shapes[0].layer;
  doc.shapes.push({ id: freshId(doc.shapes, 's'), layer, type: 'text', x: (b.minX + b.maxX) / 2 - 6, y: (b.minY + b.maxY) / 2, text: t('flipMarkText'), sizeMm: 3, angleDeg: 0 });
}

// ---- 駒合わせ・パッチワーク ----
function stitchToolCurrent() { return doc.tools.find(t => t.id === $('stitchTool').value) || doc.tools[0]; }
function placeHoles(saved, route, points, tool) {
  for (const p of points) { const id = freshId(doc.holes, 'h'); doc.holes.push({ id, pathId: saved.id, s: p.s, x: p.x, y: p.y, angleDeg: ($('followTangent').checked ? p.angleDeg : 0) + slantOf(tool), toolId: tool.id, mark: 'tool' }); }
  saved.segments = [{ from: 0, to: arcLength(route), toolId: tool.id, pitch: tool.pitch, mode: 'variable' }];
}
function komaClick(p) {
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distTo(s, p) <= 7 / scale); if (!hit) return;
  const state = routeForHit(hit); if (!state?.route) return;
  if (stage?.kind !== 'koma') { const n = doc.holes.filter(h => h.pathId === state.saved.id).length; stage = { kind: 'koma', a: state }; selected = new Set([hit.id]); $('hint').textContent = n ? t('komaSecondFrom', { n }) : t('komaSecond'); draw(); return; }
  if (state.saved.shapeIds.join() === stage.a.saved.shapeIds.join()) return;
  const holesOf = side => doc.holes.filter(h => h.pathId === side.saved.id), ha = holesOf(stage.a), hb = holesOf(state);
  if (!!ha.length !== !!hb.length) { const [src, dst] = ha.length ? [stage.a, state] : [state, stage.a]; stage = null; komaCopy(src, dst, ha.length ? 'A' : 'B', ha.length ? 'B' : 'A'); return; } /* 片方だけ目打ちがある：それは残して、もう片方に同じ数を写す */
  const tool = stitchToolCurrent(); if (!tool) return;
  const a = stage.a, b = state, both = !!ha.length && !!hb.length, opts = { prefer: $('komaPrefer').value, marginStart: Number($('offsetStart').value) || 0, marginEnd: Number($('offsetEnd').value) || 0, tolerancePct: Number($('patchTol').value) || 15 };
  const result = matchRoutes(a.route, b.route, tool.pitch, opts); stage = null;
  if (!result.holesA.length) { $('hint').textContent = t('impossible'); draw(); return; }
  commit(() => {
    for (const side of [a, b]) { if (side.fresh) { side.saved.id = freshId(doc.paths, 'p'); doc.paths.push(side.saved); side.fresh = false; } doc.holes = doc.holes.filter(h => h.pathId !== side.saved.id); }
    placeHoles(a.saved, a.route, result.holesA, tool); placeHoles(b.saved, b.route, result.holesB, tool);
    selected = new Set([hit.id, ...a.saved.shapeIds]);
  });
  pairLines = result.pairs.map(pr => [result.holesA[pr.a], result.holesB[pr.b]]);
  $('hint').textContent = (result.warn ? t('komaWarn', { n: result.holesA.length, pct: Math.max(...result.segments.map(s => s.diffPct)).toFixed(1) }) : t('komaDone', { n: result.holesA.length, pa: result.segments[0].pitchA.toFixed(2), pb: result.segments[0].pitchB.toFixed(2) })) + (both ? ' ' + t('komaBoth') : '');
  draw();
}
/** 駒合わせで、片方（src）の目打ちはそのまま残して、もう片方（dst）に同じ数を写す。位置は長さの割合（曲がり角の数が同じなら角ごと）、向きは線に対する傾きのまま。 */
function komaCopy(src, dst, from, to) {
  const holes = doc.holes.filter(h => h.pathId === src.saved.id).sort((p, q) => p.s - q.s), map = mapHoleDistances(src.route, dst.route, holes.map(h => h.s)), made = [];
  commit(() => {
    if (dst.fresh) { dst.saved.id = freshId(doc.paths, 'p'); doc.paths.push(dst.saved); dst.fresh = false; }
    holes.forEach((h, i) => {
      const q = pointAtLength(dst.route, map.s[i]), srcTan = pointAtLength(src.route, h.s).angleDeg, tan = q.angleDeg + (map.reversed ? 180 : 0), nh = { ...h, id: freshId(doc.holes, 'h'), pathId: dst.saved.id, s: map.s[i], x: q.x, y: q.y, angleDeg: ((h.angleDeg - srcTan + tan) % 360 + 360) % 360 };
      doc.holes.push(nh); made.push(nh);
    });
    const tool = doc.tools.find(x => x.id === holes[0].toolId); dst.saved.segments = [{ from: 0, to: arcLength(dst.route), toolId: holes[0].toolId, pitch: tool?.pitch ?? 0, mode: 'variable' }];
    selected = new Set([...dst.saved.shapeIds]);
  });
  pairLines = holes.map((h, i) => [{ x: h.x, y: h.y }, { x: made[i].x, y: made[i].y }]);
  const gap = list => list.length > 1 ? (Math.max(...list.map(h => h.s)) - Math.min(...list.map(h => h.s))) / (list.length - 1) : 0; /* 穴の間隔の平均 */
  $('hint').textContent = t('komaCopied', { from, to, n: holes.length, pa: gap(holes).toFixed(2), pb: gap(made).toFixed(2) });
  draw();
}
function makeKomaLine() {
  const edge = doc.shapes.find(s => selected.has(s.id) && s.type === 'line'); if (!edge) { $('hint').textContent = t('selectLine'); return; }
  const thickness = Number($('komaThickness').value); if (!(thickness > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const line = komaStitchLine(edge, thickness, $('komaInward').checked ? 1 : -1); if (!line) return;
  addShape({ ...line, layer: edge.layer }); $('hint').textContent = t('komaLineMade', { d: (thickness / 2).toFixed(2) });
}
function renderSeams() { $('seamCount').textContent = String(doc.seams.length); }
function seamStyleValue() { const v = $('seamStyle').value; return ['butt', 'overlap', 'felled'].includes(v) ? v : 'butt'; }
function optimizePatch() {
  if (!doc.seams.length) { $('hint').textContent = t('noSeams'); return; }
  const tool = stitchToolCurrent(); if (!tool) return;
  const pitch = Number($('patchPitch').value) || tool.pitch, tolerancePct = Number($('patchTol').value) || 15, raw = Number($('patchClear').value), junctionClearMm = Number.isFinite(raw) && raw >= 0 ? raw : null;
  const result = optimizePatchHoles(doc, { pitch, tolerancePct, junctionClearMm });
  const pathIds = new Set([...result.holesByPath.keys()]);
  cancel();
  commit(() => {
    doc.holes = doc.holes.filter(h => !pathIds.has(h.pathId));
    for (const [pathId, points] of result.holesByPath) { const saved = doc.paths.find(p => p.id === pathId); const route = resolvePath(doc, saved); if (route) placeHoles(saved, route, points, { ...tool, pitch }); }
  });
  const point = ref => { const saved = doc.paths.find(p => p.id === ref.pathId); const route = saved && resolvePath(doc, saved); return route ? pointAtLength(route, ref.s) : null; };
  pairLines = result.pairs.map(pr => [point(pr.a), point(pr.b)]).filter(l => l[0] && l[1]);
  $('patchWarnings').textContent = result.warnings.length ? result.warnings.map(w => t('patchWarnLine', { seam: w.seamId, i: w.segment + 1, pa: w.pitchA.toFixed(2), pb: w.pitchB.toFixed(2), pct: w.diffPct.toFixed(1) })).join('\n') : t('patchOk');
  $('hint').textContent = t('patchDone', { n: [...result.holesByPath.values()].reduce((a, b) => a + b.length, 0), w: result.warnings.length }); draw();
}
function suggestSizes() {
  const list = suggestPatchSize({ targetW: Number($('patchTargetW').value) || 40, targetH: Number($('patchTargetH').value) || 40, pitch: Number($('patchPitch').value) || 4, seamAllowanceMm: Number($('patchAllowance').value) || 3, style: seamStyleValue(), thickness: Number($('partThickness').value) || 1.5 });
  $('patchSuggest').textContent = list.map((c, i) => t('patchCandidate', { i: i + 1, nw: c.nW, nh: c.nH, fw: c.finishedW.toFixed(1), fh: c.finishedH.toFixed(1), cw: c.cutW.toFixed(1), ch: c.cutH.toFixed(1), sq: (c.squareness * 100).toFixed(0) })).join('\n');
}
function makeGrid() {
  const grid = patchGrid({ cols: Number($('patchCols').value) || 2, rows: Number($('patchRows').value) || 2, pitch: Number($('patchPitch').value) || 4, seamAllowanceMm: Number($('patchAllowance').value) || 3, pieceW: Number($('patchTargetW').value) || 40, pieceH: Number($('patchTargetH').value) || 40, style: seamStyleValue(), thickness: Number($('partThickness').value) || 1.5, origin: { x: 0, y: 0 } });
  if (!grid) { $('hint').textContent = t('invalidNumber'); return; }
  const layer = doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id; if (!layer) { $('hint').textContent = t('noLayer'); return; }
  cancel();
  commit(() => {
    const shapeIds = [], pathIds = [], W = grid.size.cutW, H = grid.size.cutH, range = edge => [[0, W], [W, W + H], [W + H, 2 * W + H], [2 * W + H, 2 * W + 2 * H]][edge];
    for (const piece of grid.pieces) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, type: 'polyline', closed: true, points: piece.points }); shapeIds.push(id); const pid = freshId(doc.paths, 'p'); doc.paths.push({ id: pid, shapeIds: [id], reversed: false, closed: true, segments: [], mark: 'tool' }); pathIds.push(pid); }
    for (const s of grid.seams) { const [af, at] = range(s.a.edge), [bf, bt] = range(s.b.edge); doc.seams.push({ id: freshId(doc.seams, 'seam'), a: { pathId: pathIds[s.a.piece], from: af, to: at }, b: { pathId: pathIds[s.b.piece], from: bf, to: bt }, style: seamStyleValue(), reversed: true }); }
    selected = new Set(shapeIds);
  });
  renderSeams(); $('hint').textContent = t('gridMade', { n: grid.pieces.length, w: grid.size.cutW.toFixed(1), h: grid.size.cutH.toFixed(1) }); fit();
}
/** 縫い合わせ（doc.seams）に沿って共有辺の縫い穴を最適化して置く（「最適化」ボタンと同じ計算）。置いた穴の数を返す。commit の中で呼ぶ。 */
function autoPatchHoles(tool) {
  const pitch = Number($('patchPitch').value) || tool.pitch, tolerancePct = Number($('patchTol').value) || 15, raw = Number($('patchClear').value), junctionClearMm = Number.isFinite(raw) && raw >= 0 ? raw : null;
  const result = optimizePatchHoles(doc, { pitch, tolerancePct, junctionClearMm }), pathIds = new Set([...result.holesByPath.keys()]);
  doc.holes = doc.holes.filter(h => !pathIds.has(h.pathId));
  for (const [pathId, points] of result.holesByPath) { const saved = doc.paths.find(p => p.id === pathId), route = saved && resolvePath(doc, saved); if (route) placeHoles(saved, route, points, { ...tool, pitch }); }
  return [...result.holesByPath.values()].reduce((a, b) => a + b.length, 0);
}
/** パッチワークで自動に打つ穴の工具。「使用中の工具のまま」か、使用中の工具が選んだ種類（菱目／丸目）ならそれ。違えば同じ種類の登録工具、無ければ使用中の工具から作る。 */
function patchHoleTool() {
  const cur = stitchToolCurrent(), kind = $('patchHole').value;
  if ((kind !== 'diamond' && kind !== 'round') || cur.kind === kind) return cur;
  const same = doc.tools.filter(x => x.kind === kind), near = same.find(x => x.pitch === cur.pitch && x.teeth === cur.teeth) || same.find(x => x.pitch === cur.pitch) || same[0];
  return near || { ...cur, id: 'patch-' + kind, name: 'patch-' + kind, kind, holeW: kind === 'round' ? 1 : 2, holeH: kind === 'round' ? 1 : 0.8, angleDeg: kind === 'round' ? 0 : 45 };
}
let lastPatch = null; /* 直前の柄の塗りつぶし {p: クリックした点, before: そのときの取り消し用の記録}。数値を変えたら作りなおす */
/** 柄の設定を変えたとき、直前の柄の塗りつぶしを取り消して同じ場所に作りなおす（取り消しは1回分のまま）。作れない値のときは元のまま。 */
function regenPatch() {
  if (!lastPatch || undo.at(-1) !== lastPatch.before) return; /* 塗りつぶしの後に別の操作をしていれば何もしない */
  const snap = JSON.stringify(doc), savedUndo = undo.slice(), savedRedo = redo.slice(), p = lastPatch.p;
  history(undo, redo); const depth = undo.length; patchFillAt(p);
  if (undo.length === depth) { /* 作れなかった：画面の記録を元に戻す（案内の文言は残す） */
    const msg = $('hint').textContent; doc = JSON.parse(snap); undo = savedUndo; redo = savedRedo; selected.clear(); refreshTools(); persistTools(); renderLayers(); renderSeams(); rebuildSnaps(); draw(); $('hint').textContent = msg;
  }
}
/** 囲まれた図形（実線で閉じた経路・点線は除く）の内側をクリックして、選んだ柄（アーガイル・市松）のピースで埋める。 */
function patchFillAt(p) {
  const region = regionAt(doc.shapes.filter(s => visible(s) && stitchable(s)), p);
  if (!region) { $('hint').textContent = t('patchNoRegion'); return; }
  const layer = doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id; if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const fill = fillRegionPattern(region, $('patchPattern').value, { cell: Number($('patchCell').value) });
  if (!fill) { $('hint').textContent = t('invalidNumber'); return; }
  if (fill.tooMany) { $('hint').textContent = t('patchTooMany', { n: fill.tiles }); return; }
  if (!fill.pieces.length) { $('hint').textContent = t('impossible'); return; }
  const tool = $('patchStitch').checked ? patchHoleTool() : null, inset = Number($('patchInset').value), banEdge = $('patchEdgeBan').checked && tool?.kind === 'diamond';
  if (tool && !(inset > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  if (banEdge && inset < PATCH_EDGE_MIN_MM - 1e-9) { $('hint').textContent = t('patchEdgeBanned', { d: inset, m: PATCH_EDGE_MIN_MM }); return; } /* 菱目は縁から2.5mm以内に置かない（外すと解除） */
  let stitched = null; const depth0 = undo.length;
  commit(() => {
    const polys = fill.pieces.map(pc => pc.points.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) })));
    const texA = textureById($('patchTexA').value)?.id || null, texB = textureById($('patchTexB').value)?.id || null; /* 柄の2色に貼る革の質感（選んでいなければ貼らない） */
    const ids = polys.map((points, i) => { const id = freshId(doc.shapes, 's'), tex = fill.pieces[i].parity ? texB : texA; doc.shapes.push({ id, layer, type: 'polyline', closed: true, points, ...(tex ? { texture: tex } : {}) }); return id; });
    selected = new Set(ids);
    if (tool && !doc.tools.some(x => x.id === tool.id)) doc.tools.push({ ...tool }); /* 穴が指す工具が無いと困るので、新しく作った工具は登録する */
    if (tool) { /* クロスステッチ：穴は境界の上ではなく、各ピースの縁から inset mm 内側の縫い線（黄色の点線）の上に打ち、境界をはさんで向かい合う穴を対にする */
      const stitch = patchInsetStitch(polys, inset), stitchLayer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || layer, style = seamStyleValue();
      const pathOfPiece = stitch.insets.map(pts => {
        if (!pts) return null;
        const sid = freshId(doc.shapes, 's'); doc.shapes.push({ id: sid, layer: stitchLayer, type: 'polyline', closed: true, points: pts.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) })), color: 'yellow', lineStyle: 'dashed' });
        const pid = freshId(doc.paths, 'p'); doc.paths.push({ id: pid, shapeIds: [sid], reversed: false, closed: true, segments: [], mark: 'tool' }); return pid;
      });
      for (const s of stitch.seams) doc.seams.push({ id: freshId(doc.seams, 'seam'), a: { pathId: pathOfPiece[s.a.piece], from: s.a.from, to: s.a.to }, b: { pathId: pathOfPiece[s.b.piece], from: s.b.from, to: s.b.to }, style, reversed: s.reversed });
      let holes = stitch.seams.length ? autoPatchHoles(tool) : 0, banned = 0;
      if (banEdge) { /* 念のための検査：縁から2.5mm未満の菱目は取り除く（座標を4桁に丸める誤差 0.001mm は許す） */
        const drop = new Set(doc.holes.filter(h => { const i = pathOfPiece.indexOf(h.pathId); return i >= 0 && distTo({ type: 'polyline', closed: true, points: polys[i] }, h) < PATCH_EDGE_MIN_MM - 1e-3; }).map(h => h.id));
        if (drop.size) { doc.holes = doc.holes.filter(h => !drop.has(h.id)); banned = drop.size; holes -= banned; }
      }
      stitched = { seams: stitch.seams.length, holes, banned, inset };
    }
  });
  renderSeams(); if (undo.length > depth0) lastPatch = { p, before: undo.at(-1) };
  $('hint').textContent = stitched ? t('patchStitched', { n: fill.pieces.length, d: fill.dropped, s: stitched.seams, h: stitched.holes, i: stitched.inset }) : t('patchFilled', { n: fill.pieces.length, d: fill.dropped });
}
function initDesign() {
  $('info-part').addEventListener('change', assignPart);
  for (const f of ['thickness', 'partName', 'partOrder']) $('info-' + f).addEventListener('change', () => applyPartField(f));
  $('lamTarget').value = '';   /* 目標の全長は、最初は空（いまの長さを使う） */
  $('lamRun').onclick = () => { runLaminate(); renderLaminateNow(); }; $('lamSection').onclick = makeLamSection; $('lamAutoParts').onclick = () => { makeFoldUnfoldParts(); renderLaminateNow(); }; $('lamMakeOuter').onclick = () => makeLamPart('o'); $('lamMakeInner').onclick = () => makeLamPart('i'); $('lamOuter').addEventListener('change', () => { laminateThickFromPart('o'); renderLaminateNow(); }); $('lamInner').addEventListener('change', () => { laminateThickFromPart('i'); renderLaminateNow(); });
  $('lamTOuter').addEventListener('input', () => { lamTouched.o = true; renderLaminateNow(); }); $('lamTInner').addEventListener('input', () => { lamTouched.i = true; renderLaminateNow(); }); $('lamAxis').addEventListener('change', renderLaminateNow); $('lamSubCard').addEventListener('toggle', () => { if ($('lamSubCard').open) { fillLaminateParts(); renderLaminateNow(); } });
  $('newPart').onclick = newPart; $('addFold').onclick = addFoldAllowance; $('applyStack').onclick = applyStack;
  $('offsetRun').onclick = () => runOffset();
  for (const id of ['rb-ax', 'rb-ay', 'rb-bx', 'rb-by']) $(id).addEventListener('input', rulerFromBar);
  /* 図形のそばの入力欄：右のカードの距離・向きと値を共有する */
  $('of-dist').addEventListener('input', () => { $('offsetDist').value = $('of-dist').value; draw(); });
  $('of-side').addEventListener('change', () => { $('offsetSide').value = $('of-side').value; draw(); });
  $('offsetDist').addEventListener('input', () => { $('of-dist').value = $('offsetDist').value; draw(); });
  $('offsetSide').addEventListener('change', () => { $('of-side').value = $('offsetSide').value; draw(); });
  for (const id of ['of-dist', 'of-side']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runOffset(); } });
  $('of-run').onclick = () => runOffset();
  $('of-close').onclick = () => { offsetSelection = null; draw(); canvas.focus(); };
  $('df-run').onclick = runDetour; $('df-close').onclick = () => { detourState = null; draw(); canvas.focus(); }; for (const id of ['df-clear', 'df-radius']) $(id).addEventListener('input', () => draw());
  $('offsetDist').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runOffset(); } });
  for (const id of ['patchPattern', 'patchCell', 'patchStitch', 'patchHole', 'patchInset', 'patchEdgeBan', 'patchPitch', 'patchTol', 'patchClear', 'stitchTool', 'patchTexA', 'patchTexB']) { $(id).addEventListener('input', regenPatch); $(id).addEventListener('change', regenPatch); }
  $('showJunctions').addEventListener('change', () => { rebuildSnaps(); draw(); });
  for (const id of ['arcMethod', 'arcDir']) $(id).addEventListener('change', () => { if (mode === 'arc' && !stage) $('hint').textContent = modeHint('arc'); }); /* 描き方を変えたら案内文も変える */
  $('ctx-lib').onclick = () => { hideCtxMenu(); const raw = window.prompt(t('libNamePrompt'), ''), name = raw && raw.trim() ? raw.trim() : null; if (name) saveToLibrary(name); }; /* 右クリック → 部品ライブラリに登録 */
  $('bugLog').onclick = async e => { /* 不具合記録：操作の記録と図面を、共有フォルダ（OneDrive の中のフォルダ。いちど選ぶと次から自動）へ保存する。使えないブラウザ・選ばなかったときは、ダウンロードに保存（外部へは送らない） */
    const r = bugReport(), name = bugReportName(), text = JSON.stringify(r), repick = !!e?.shiftKey;
    if (canPickDir() && (repick || !(await getSavedDir()))) $('hint').textContent = t('bugLogPick');
    const res = await saveToSharedDir(name, text, { repick });
    if (res.status === 'saved') { $('hint').textContent = t('bugLogSavedDir', { n: r.log.length, dir: res.dir }) + (res.expected ? '' : ' ' + t('bugLogWrongDir', { name: BUGDIR_NAME })) + (res.why && !repick ? ' ' + t('bugLogWhy', { why: res.why }) : ''); return; } /* 約束のフォルダ名でなければ、共有されない場所かもしれないと知らせる */
    download(name, text, 'application/json', false); $('hint').textContent = t('bugLogSaved', { n: r.log.length }) + (res.status === 'cancelled' || res.status === 'error' ? ' ' + t('bugLogFallback') : '');
  };
  $('regSend').onclick = doRegister; $('regCheck').onclick = doRegCheck; $('regClose').onclick = () => $('regDialog').close(); registration.refresh();
  $('feedbackBtn').onclick = openFeedback; $('fbClose').onclick = () => $('feedbackDialog').close(); $('fbSend').onclick = submitFeedback; $('fbCtxOn').addEventListener('change', fbShowCtx);
  $('fbMsg').addEventListener('input', () => { $('fbCount').textContent = `${$('fbMsg').value.length} / 500`; }); /* 改善要望：入力中の文字数 */
  $('guideBtn').onclick = () => { if (typeof window.open === 'function') { const w = window.open('guide.html', 'ncad-guide'); w?.focus?.(); } }; /* 図解ガイド（日本語）を別タブで開く。何度押しても同じ1つのタブを使う（ブラウザのタブが増え続けないように・事業主指示 2026-10-13） */
  $('patchFill').onclick = () => { if (!lockGate('patchwork')) return; setMode('patchfill'); $('hint').textContent = t('hint.patchfill'); };
  $('makeKomaLine').onclick = makeKomaLine; $('optimizePatch').onclick = optimizePatch; $('suggestSizes').onclick = suggestSizes; $('makeGrid').onclick = makeGrid;
  $('clearSeams').onclick = () => { commit(() => { doc.seams = []; }); pairLines = []; renderSeams(); };
  $('clearPairs').onclick = () => { pairLines = []; draw(); };
  renderSeams();
}

function initInfo() {
  for (const f of ['x','y','x1','y1','x2','y2','cx','cy','r','startDeg','endDeg','length','text','sizeMm','angleDeg','offset','closed','inner','layer','color','lineStyle']) $('info-' + f).addEventListener('change', () => applyInfo(f));
  $('toggleSmooth').onclick = () => { const s = infoShape(); if (!s || s.type !== 'path' || !nodeSel || nodeSel.id !== s.id || !editable(s)) return; const nodes = s.nodes.map(n => ({ ...n })), n = nodes[nodeSel.index];
    if (n.smooth) { n.smooth = false; } else { const prev = nodes[(nodeSel.index - 1 + nodes.length) % nodes.length], nx = nodes[(nodeSel.index + 1) % nodes.length], d = { x: nx.x - prev.x, y: nx.y - prev.y }, l = Math.hypot(d.x, d.y) || 1, k = Math.min(distance(n, prev), distance(n, nx)) / 3; n.smooth = true; n.inX = n.x - d.x / l * k; n.inY = n.y - d.y / l * k; n.outX = n.x + d.x / l * k; n.outY = n.y + d.y / l * k; }
    transformSelectedTo({ ...s, nodes }); };
  $('removeNode').onclick = () => { const s = infoShape(); if (!s || s.type !== 'path' || !nodeSel || nodeSel.id !== s.id || !editable(s)) return; const next = pathRemoveNode(s, nodeSel.index); if (!next) { $('hint').textContent = t('impossible'); return; } nodeSel = null; transformSelectedTo(next); };
  $('unroll').onclick = unrollSelection;
  $('closeGaps').onclick = closeSelectedGaps; $('mergeLines').onclick = mergeSelectedLines;
  $('toPath').onclick = () => { const ids = selectedShapeIds(); cancel(); commit(() => { doc.shapes = doc.shapes.map(s => ids.has(s.id) && ['line','bezier','polyline'].includes(s.type) ? toPath(s) : s); }); };
}

// ---- 出力（SVG・DXF・印刷・校正）----
const PAGES = { a4: { w: 190, h: 277 }, a4l: { w: 277, h: 190 }, a3: { w: 277, h: 400 }, a3l: { w: 400, h: 277 } };
let calibration = { fx: 1, fy: 1 }, measuredCalibration = { fx: 1, fy: 1 };
/** 「縫い穴を点で印刷する」（出力カード・事業主の希望 2026-10-19）：印刷と PDF で、穴と菱の線を真ん中の●にする。入っていて直径が正の数ならその直径（mm）、それ以外は 0（今までどおりの形）。画面・保存データ・SVG・DXF・PNG は変えない。設定はブラウザに残す。 */
const PRINT_DOTS_KEY = 'leather-cad.printDots'; let printDotLast = 1;
const printDotMm = () => { if (!$('printDots')?.checked) return 0; const d = Number($('printDotD')?.value); return Number.isFinite(d) && d > 0 ? d : 0; };
function savePrintDots() { const d = Number($('printDotD').value); if (Number.isFinite(d) && d > 0) printDotLast = d; else $('printDotD').value = String(printDotLast); try { localStorage.setItem(PRINT_DOTS_KEY, JSON.stringify({ on: !!$('printDots').checked, d: printDotLast })); } catch { /* 保存できなくても続ける */ } }
function restorePrintDots() { let v = null; try { v = JSON.parse(localStorage.getItem(PRINT_DOTS_KEY) || 'null'); } catch { v = null; } $('printDots').checked = v?.on === true; const d = Number(v?.d); if (Number.isFinite(d) && d > 0) { printDotLast = d; $('printDotD').value = String(d); } }
function loadCalibration() { try { const c = JSON.parse(localStorage.getItem('leather-cad.calibration')); if (c && Number.isFinite(c.fx) && Number.isFinite(c.fy) && c.fx > 0 && c.fy > 0) calibration = { fx: c.fx, fy: c.fy }; } catch { /* 既定 1.0 のまま。 */ } showCalibration(); }
function showCalibration() { $('calibInfo').textContent = calibration.fx === 1 && calibration.fy === 1 ? t('calibNone') : t('calibCurrent', { fx: calibration.fx.toFixed(4), fy: calibration.fy.toFixed(4) }); }
function saveCalibration(next) { calibration = next; try { localStorage.setItem('leather-cad.calibration', JSON.stringify(next)); } catch { $('hint').textContent = t('storageUnavailable'); } showCalibration(); }
// ---- 利用登録（印刷・ファイル保存・書き出しの前に必要。サーバーの宛先が空のあいだは、今までどおり誰でも使える。事業主指示 2026-10-14） ----
let registration = createRegistration({ storage: (() => { try { return localStorage; } catch { return null; } })(), fetchFn: typeof globalThis.fetch === 'function' && typeof location !== 'undefined' && location.protocol === 'https:' ? globalThis.fetch.bind(globalThis) : null, version: document.getElementById('buildVer')?.textContent ?? '' });
const REG_EXT = { svg: 'svg', dxf: 'dxf', pdf: 'pdf', png: 'png', json: 'json', csv: 'csv' };
const regFeatureOf = name => REG_EXT[String(name).split('.').pop().toLowerCase()] || 'file';
/** 印刷・保存・書き出しの入口で呼ぶ。使ってよければ true（登録済みなら利用を記録する）。未登録なら登録の小窓を開いて false。 */
function regGuard(feature, kind = '') {
  if (!registration.enabled()) return true;
  if (registration.allowed()) { registration.track(feature, kind); registration.refresh(); return true; }
  openRegistration(); return false;
}
/** 有料版の機能のロック（パッチワーク・三つ折り・三面図）。インターネットの公開版（登録サーバーが使えるとき）だけロックがかかり、確認済みのオーナーのメールで利用登録した端末では外れる。
 *  手元で開いたファイル（file://）や開発中（http://localhost）は、ロックしない。 */
const LOCK_NAMES = { patchwork: 'lockPatchwork', fold: 'lockFold', threeview: 'lockThreeView' };
function featureLocked() { return registration.enabled() && !regIsOwner(registration.state()); }
/** ロックされた機能を使おうとしたとき：使ってよければ true。ロック中なら、🔒の案内を出して false。 */
function lockGate(feature) {
  if (!featureLocked()) return true;
  showRegNow(); $('lockTitle').textContent = '🔒 ' + t(LOCK_NAMES[feature] || 'lockFold'); $('hint').textContent = t('lockHint');
  if (!$('lockDialog').open) $('lockDialog').showModal(); return false;
}
/** 🔒の印と、ロック中のカードの操作の無効化を、いまの状態に合わせる。 */
function syncLockMarks() {
  const locked = featureLocked();
  document.querySelectorAll('[data-lock]').forEach(el => { el.classList.toggle('locked', locked); const body = el.querySelector?.(':scope > .body'); if (body) { if (locked) body.setAttribute('inert', ''); else body.removeAttribute('inert'); } });
}
/** 数値の欄は、すべて共通で、入ったとき（クリック・Tab）に中身を全選択にする。初期値が 0 の欄（向き(°) など）に 90 と打つと 090 になるのを防ぐ（事業主指示 2026-10-17）。マウスで入ったときは、最初のマウスアップだけ抑えて、選択が外れないようにする（2回目以降のクリックは通常どおり、途中にカーソルを置ける）。 */
let numberJustFocused = null;
document.addEventListener?.('focusin', e => { const el = e?.target; if (el?.tagName === 'INPUT' && el.type === 'number') { numberJustFocused = el; setTimeout(() => { try { el.select?.(); } catch { /* 選べない欄は、そのまま */ } }, 0); } else numberJustFocused = null; });
document.addEventListener?.('mouseup', e => { if (numberJustFocused && e?.target === numberJustFocused) { e.preventDefault?.(); numberJustFocused = null; } });
document.addEventListener?.('click', e => { const sm = e.target?.closest?.('details[data-lock].locked > summary'); if (sm) { e.preventDefault(); lockGate(sm.parentElement.dataset.lock); } }, true);
/** 「いまの登録」の1行：なし／確認待ち／確認済み、と、オーナーかどうか（オーナーなら、有料版の機能のロックが外れる）。 */
function regNowText() {
  const s = registration.state();
  if (s.status === 'ok') return t('regNowOk', { email: s.email }) + t(regIsOwner(s) ? 'regNowOwner' : 'regNowNotOwner');
  if (s.status === 'pending') return t('regNowPending', { email: s.email });
  return t('regNowNone');
}
function showRegNow() { for (const id of ['regNow', 'lockNow']) { const el = $(id); if (el) el.textContent = regNowText(); } }
function regMsg(key, vars = {}, cls = '') { const el = $('regStatus'); el.textContent = key ? t(key, vars) : ''; el.className = 'fb-status' + (cls ? ' ' + cls : ''); }
function openRegistration() {
  showRegNow();
  const s = registration.state(); if (s.email) $('regEmail').value = s.email; if (s.nick) $('regNick').value = s.nick;
  $('regConsent').checked = false; $('regCheck').hidden = s.status !== 'pending'; regMsg(s.status === 'pending' ? 'regSent' : '', { email: s.email });
  $('hint').textContent = t('regNeed'); $('regDialog').showModal();
}
async function doRegister() {
  const btn = $('regSend'); btn.disabled = true; regMsg('regSending');
  const r = await registration.register({ email: $('regEmail').value, nick: $('regNick').value, consent: $('regConsent').checked }); btn.disabled = false;
  if (r.ok) { $('regCheck').hidden = false; regMsg('regSent', { email: registration.state().email }, 'ok'); showRegNow(); return; }
  regMsg({ email: 'regErrEmail', consent: 'regErrConsent', limit: 'regErrLimit', network: 'regErrNet' }[r.error] || 'regErrServer', {}, 'ng');
}
async function doRegCheck() {
  const r = await registration.check();
  if (r.status === 'ok') { $('regCheck').hidden = true; regMsg('regOk', {}, 'ok'); syncLockMarks(); showRegNow(); return; }
  regMsg(r.status === 'pending' ? 'regPending' : r.status === 'error' ? 'regErrNet' : 'regErrNone', {}, r.status === 'pending' ? '' : 'ng');
}
function download(name, text, type, gate = true) {
  if (gate && !regGuard(regFeatureOf(name), 'dl')) { setTimeout(() => { $('hint').textContent = t('regNeed'); }, 0); return false; }   /* 呼び出し側の「書き出しました」の案内を、登録が必要の案内に直す。gate=false は、不具合記録（登録なしで出せる）か、呼び出し側が入口の確認をすませたとき */
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** 書き出す図形・穴が1つも無い（外接矩形が無い）とき、空のファイルを保存せず、理由（図面タブ名つき）を案内して true を返す。利用登録の小窓より前に呼ぶ（2026-10-18。空の DXF/SVG/PDF を別のソフトに渡して「図形がありません」と止まるため） */
function exportIsEmpty(shapes, holes) { if (bboxOfDoc({ ...doc, shapes, holes })) return false; $('hint').textContent = t('nothingToExport', { tab: tabs[activeTab]?.name ?? '' }); return true; }
/** SVG・PDF が書き出す対象（docToSvg / docToPdf と同じ選び方：表示中のレイヤー・穴をつなぐ補助の線（holeLink）以外・穴は「穴を入れる」の設定どおり） */
function exportTargets(includeHoles) { const layerShapes = outputDoc().shapes.filter(layerVisible), shapes = layerShapes.filter(s => !s.holeLink); return { shapes, holes: includeHoles ? holesOnShapes(doc, layerShapes) : [] }; }
function exportSvg() {
  const { shapes, holes } = exportTargets($('outHoles').checked); if (exportIsEmpty(shapes, holes)) return;
  if (!regGuard('svg', 'dl')) return;
  const preset = $('exportPreset').value;
  const svg = preset === 'beam' ? beamStudioSvg(outputDoc(), { kerfMm: Number($('kerf').value) || 0, includeHoles: $('outHoles').checked }) : docToSvg(outputDoc(), { includeHoles: $('outHoles').checked, fill: $('outFill').checked && viewShow.colors, textures: $('outFill').checked && viewShow.colors ? svgTextures() : null, textureMm: textureMm(), metalColor: metalHex, diamondFill: diamondMode() === 'fill' });
  download(preset === 'beam' ? 'leather-pattern-beam.svg' : 'leather-pattern.svg', svg, 'image/svg+xml', false); $('hint').textContent = t('exported', { name: preset === 'beam' ? 'SVG (Beam Studio)' : 'SVG' });
}
function exportPdf() {
  const { shapes, holes } = exportTargets($('outHoles').checked); if (exportIsEmpty(shapes, holes)) return;
  if (!regGuard('pdf', 'dl')) return;
  const paper = $('paper').value, bytes = docToPdf(outputDoc(), { paper: paper.startsWith('a3') ? 'a3' : 'a4', landscape: paper.endsWith('l'), includeHoles: $('outHoles').checked, calibration: $('outCalib').checked ? calibration : null, holeDot: printDotMm() });
  download('leather-pattern.pdf', bytes, 'application/pdf', false); $('hint').textContent = t('pdfExported', { n: bytes.pages, s: bytes.skippedText });
}
/** 図面を PNG に描いてダウンロード。dpi 指定・白背景／透明。画素数が 5,000 万を超えるときは dpi を落とす。 */
function exportPng() {
  const only = !!$('pngSelOnly')?.checked, selIds = new Set(selected), vis = only ? (sh => visible(sh) && selIds.has(sh.id)) : visible, hvis = only ? (h => holeVisible(h) && (selIds.has(h.id) || !!doc.paths.find(p => p.id === h.pathId)?.shapeIds.some(id => selIds.has(id)))) : holeVisible;   /* 「選んだ図形だけ出力」：選んだ図形と、その縫い穴だけ */
  const shapes = doc.shapes.filter(vis), holes = doc.holes.filter(hvis), b = bboxOfDoc({ ...doc, shapes, holes });   /* PNG は画面に見えているものを描く（実線・点線の表示切り替えも反映） */
  if (only && !shapes.length && !holes.length) { $('hint').textContent = t('pngSelNone'); return; }
  if (exportIsEmpty(shapes, holes)) return;
  if (!regGuard('png', 'draw')) return;
  let dpi = Number($('pngDpi').value) || 300; const margin = 2, wMm = b.maxX - b.minX + 2 * margin, hMm = b.maxY - b.minY + 2 * margin;
  const pixels = d => (wMm / 25.4 * d) * (hMm / 25.4 * d); let lowered = false;
  while (pixels(dpi) > 50e6 && dpi > 10) { dpi = Math.floor(dpi * 0.8); lowered = true; }
  const off = document.createElement('canvas'); if (typeof off.getContext !== 'function') { $('hint').textContent = t('pngUnavailable'); return; }
  const k = dpi / 25.4; off.width = Math.ceil(wMm * k); off.height = Math.ceil(hMm * k);
  const saved = { ctx, width, height, scale, origin }; ctx = off.getContext('2d'); exporting = true;
  width = off.width; height = off.height; scale = k; origin = { x: (margin - b.minX) * k, y: (margin - b.minY) * k };
  exportColor = $('pngColor').checked && viewShow.colors; exportFilter = only ? { vis, hvis, ids: selIds } : null;
  try { if (!$('pngTransparent').checked) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, off.width, off.height); } draw(); }
  finally { ({ ctx, width, height, scale, origin } = saved); exporting = false; exportColor = false; exportFilter = null; draw(); }
  const done = blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'leather-pattern.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); $('hint').textContent = t('pngExported', { dpi, w: off.width, h: off.height }) + (lowered ? t('pngLowered') : ''); };
  if (typeof off.toBlob === 'function') off.toBlob(done, 'image/png'); else $('hint').textContent = t('pngUnavailable');
}
/** 取り込んだ図形群を文書に足す（id・レイヤーを割り当て、validateDoc で壊れた要素を捨てて件数を報告）。 */
function importShapes(list, { layersFrom = [] } = {}) {
  let added = 0, dropped = 0;
  cancel();
  commit(() => {
    for (const name of layersFrom) if (!doc.layers.some(l => l.id === name)) doc.layers.push({ id: name, name, visible: true, locked: false });
    const ids = [];
    for (const raw of list) {
      const { layer, ...rest } = raw, layerId = doc.layers.some(l => l.id === layer) ? layer : (doc.layers.find(l => l.id === activeLayer)?.id || doc.layers[0].id);
      const shape = { ...rest, id: freshId(doc.shapes, 's'), layer: layerId };
      if (shape.type === 'polyline' && shape.points.length < (shape.closed ? 3 : 2)) { dropped++; continue; }
      doc.shapes.push(shape);
      if (!validateDoc(doc)) { doc.shapes.pop(); dropped++; continue; }
      ids.push(shape.id); added++;
    }
    selected = new Set(ids);
  });
  renderLayers(); fit();
  $('hint').textContent = t('imported', { n: added, d: dropped });
  return { added, dropped };
}
/** SVG/DXF から読んだ図形群を取り込む：Leathercraft CAD の線種レイヤーを仕分け、Stitch_Holes を縫い穴に戻し、折れ線近似の円弧を戻す。 */
function importVector(rawShapes, layersFrom, { recover = true } = {}) {
  const lc = importLeathercraft(rawShapes);
  const shapes = recover ? lc.shapes.flatMap(s => s.type === 'polyline' ? recoverArcs(s, 0.02) : [s]) : lc.shapes;
  const known = new Set(['pattern', 'hardware', 'guide', ...doc.layers.map(l => l.id)]);
  const res = importShapes(shapes, { layersFrom: layersFrom.filter(l => !/^(LineType_\d+|Stitch_Holes|0)$/i.test(l)).concat([...new Set(shapes.map(s => s.layer))].filter(l => !known.has(l))) });
  if (lc.holeCandidates.length) {
    let result = { attached: 0, orphan: 0 };
    commit(() => { result = attachHoles(doc, lc.holeCandidates, { freshId }); });
    refreshTools(); $('hint').textContent += ' ' + t('holesRestored', { n: result.attached, o: result.orphan }); res.holes = result.attached;
  }
  return res;
}
/** ファイルを開くとき：保存していない図があれば、消さずに新しいタブで開く。タブの名前は、開いたファイルの名前（拡張子なし）にする（事業主指示 2026-10-15：タブはファイル名のほうが分かりやすい／開くで保存前の図が消えない）。 */
function tabForOpenedFile(file) {
  const base = (file.name || '').replace(/\.(json|lcc)$/i, '').trim().slice(0, 60);
  if (doc.shapes.length || doc.calcMemos?.length) newTab(base || undefined); /* 図形のある図面は、保存済みでも・前回の続きから戻したものでも、消さずに新しいタブで開く（ファイル間のコピーにも使える）。空の図面だけ、同じタブに開く */
  return base;
}
function nameOpenedTab(base) { if (tabs[activeTab]) { if (base) tabs[activeTab].name = base; tabs[activeTab].dirty = false; renderTabs(); } }
async function openFile(file) {
  const name = (file.name || '').toLowerCase();
  if (/\.(png|jpe?g|webp)$/.test(name)) { try { await importImageFile(file); return { added: 1, dropped: 0 }; } catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); return null; } }
  const text = await file.text();
  try {
    if (name.endsWith('.svg')) { const r = svgToShapes(text); return importVector(r.shapes, r.layers, { recover: false }); }
    if (name.endsWith('.dxf')) { const r = dxfToShapesFull(text); const res = importVector(r.shapes, [], { recover: $('recoverArcs').checked }); if (r.units === null) $('hint').textContent += ' ' + t('dxfUnitsAssumed'); return res; }
    if (/\.(png|jpe?g|webp)$/.test(name)) { await importImageFile(file); return { added: 1, dropped: 0 }; }
    if (name.endsWith('.lcc')) { const r = lccToDoc(text, { name: file.name, tools: loadTools() }); if (!validateDoc(r.doc)) throw new Error(t('invalidDoc')); const base = tabForOpenedFile(file); cancel(); commit(() => { doc = r.doc; selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); pairLines = []; renderLayers(); renderSeams(); fit(); nameOpenedTab(base); $('hint').textContent = t('lccLoaded', { n: r.doc.shapes.length, h: r.stats.holesAttached, w: r.warnings.length }); return { added: r.doc.shapes.length, dropped: r.warnings.length }; }
    const raw = JSON.parse(text), hist = raw && raw.undoHistory; if (raw) delete raw.undoHistory; /* 保存ファイルに入っていた元に戻す履歴は、図面とは別に扱う */
    const next = withDefaultTool(migrateDoc(raw)); healDoc(next);   /* 部品が消えた図形を指したままのファイルも、開くと直る */
    if (!validateDoc(next)) throw new Error(t('invalidDoc'));
    const extraSheets = next.threeViewSheets; delete next.threeViewSheets; if (next.threeViewSheet && !next.threeViewSheet.id) delete next.threeViewSheet;
    const base = tabForOpenedFile(file); cancel(); commit(() => { doc = next; selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); pairLines = []; renderLayers(); renderSeams(); fit(); nameOpenedTab(base); $('hint').textContent = t('loaded') + t('hint.' + mode); noticeGaps();
    if (hist) { const st = await decodeStacks(hist); if (st) { undo = st.undo; redo = st.redo; snapshotTab(); updateUI(); } } /* 保存した履歴で、元に戻す・やり直しを置き換える（読めないときは、そのまま） */
    if (extraSheets && next.threeViewSheet?.role === 'front') restoreSheets(extraSheets, next.threeViewSheet.id);
    return { added: next.shapes.length, dropped: 0 };
  } catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); return null; }
}
function exportDxf() {
  const preset = $('exportPreset').value;
  const dxf = preset === 'leathercraft' ? leathercraftDxf(outputDoc(), { includeHoles: $('outHoles').checked, originAtCorner: true }) : docToDxfR12(outputDoc(), { includeHoles: $('outHoles').checked, dotAsPoint: $('dotAsPoint').checked });
  if (!dxfToShapes(dxf).length) { $('hint').textContent = t('nothingToExport', { tab: tabs[activeTab]?.name ?? '' }); return; }   /* 図形の無い DXF は保存しない（他のソフトで「取り込める図形がありません」と止まる・2026-10-18）。別の図面タブを書き出していたと分かるよう、タブ名を案内に入れる */
  if (!regGuard('dxf', 'dl')) return;
  download(preset === 'leathercraft' ? 'leather-pattern-lc.dxf' : 'leather-pattern.dxf', dxf, 'application/dxf', false); $('hint').textContent = t('exported', { name: preset === 'leathercraft' ? 'DXF (Leathercraft CAD)' : 'DXF' });
}
/** 現在の用紙設定（paper・重なり10mm）で割付を計算し、ページ境界とページ番号を薄い赤破線で重ねる。表示専用（draw() 内のみ・出力には含めない）。選択・編集の対象にはしない。 */
function drawPrintOverlay() {
  const shapes = doc.shapes.filter(visible), overlapMm = 10, pageMm = PAGES[$('paper').value] || PAGES.a4;
  const holes = $('outHoles').checked ? doc.holes.filter(holeVisible) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }); if (!b) return;
  const layout = printLayout(b, pageMm, overlapMm, null);
  ctx.save(); ctx.setLineDash([4 / scale, 3 / scale]); ctx.lineWidth = 1 / scale; ctx.strokeStyle = 'rgba(255,90,90,0.5)'; ctx.fillStyle = 'rgba(255,120,120,0.7)'; ctx.font = `${12 / scale}px system-ui, sans-serif`;
  layout.pages.forEach((p, i) => { ctx.strokeRect(p.x, p.y, p.w, p.h); ctx.fillText(`${i + 1}/${layout.pages.length}  ${p.col + 1}-${p.row + 1}`, p.x + 2, p.y + 12 / scale); });
  ctx.restore();
}
/** 用紙キー（a4/a4l/a3/a3l）から @page を書く。CSS のセレクタ内 @page は無効なので style 要素を差し替える。 */
function setPageStyle(paper) { const size = (/a3/.test(paper) ? 'A3' : 'A4') + ' ' + (/l$/.test(paper) ? 'landscape' : 'portrait'); let st = $('pageSize'); if (!st) { st = document.createElement('style'); st.id = 'pageSize'; document.head?.appendChild(st); } st.textContent = `@media print { @page { size: ${size}; margin: 10mm; } }`; return size; }
/** 印刷用の SVG ページ列を作って #printArea に入れ、印刷ダイアログを開く。 */
function printPages(target = outputDoc(), { dots = true } = {}) {   /* dots=false：工具のテスト片など、「縫い穴を点で印刷する」を無視して形のまま印刷する */
  if (!regGuard('print', 'pages')) return null;
  const holeDot = dots ? printDotMm() : 0;
  const pageMm = PAGES[$('paper').value] || PAGES.a4, overlapMm = 10;
  const layerShapes = target.shapes.filter(s => target.layers.find(l => l.id === s.layer)?.visible), shapes = layerShapes.filter(s => !s.holeLink), holes = $('outHoles').checked ? target.holes.filter(h => holeIsOwn(h, ownHolePathIds(target)) || target.paths.some(p => p.id === h.pathId && p.shapeIds.every(id => layerShapes.some(s => s.id === id)))) : [], b = bboxOfDoc({ ...target, shapes, holes });
  if (!b) { $('hint').textContent = t('nothingToPrint'); return null; }
  const calib = $('outCalib').checked ? calibration : null, layout = printLayout(b, pageMm, overlapMm, calib);
  const html = layout.pages.map((p, i) => `<div class="page">${pageSvg(target, p, { pageMm, overlapMm, calibration: calib, label: `${i + 1}/${layout.pages.length}  ${p.col + 1}-${p.row + 1}`, includeHoles: $('outHoles').checked, holeDot })}</div>`).join('');
  $('printArea').innerHTML = html; $('printArea').dataset.pages = String(layout.pages.length);
  document.documentElement.style.setProperty('--page-w', pageMm.w + 'mm'); document.documentElement.style.setProperty('--page-h', pageMm.h + 'mm');
  setPageStyle($('paper').value);
  $('hint').textContent = t('printHint', { n: layout.pages.length });
  measuredCalibration = { fx: calib?.fx ?? 1, fy: calib?.fy ?? 1 };
  if (typeof window.alert === 'function') window.alert(t('printHint', { n: layout.pages.length }));
  if (typeof window.print === 'function') window.print();
  return layout;
}
function placeScale() { const b = bboxOfDoc(doc), o = b ? { x: b.minX, y: b.maxY + 20 } : { x: 0, y: 0 }; const layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked) ? 'guide' : null; cancel(); commit(() => { const ids = []; for (const s of calibrationScale(o, layer || activeLayer)) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...s, id }); ids.push(id); } selected = new Set(ids); }); $('hint').textContent = t('scalePlaced'); }
/** 校正だけの一時文書を印刷する。作業中の型紙とUndoは変更しない。 */
function printCalibration() {
  const scaleDoc = newDoc();
  scaleDoc.shapes = calibrationScale().map((s,i) => ({...s,id:'calibration-'+i}));
  return printPages(scaleDoc);
}
function applyMeasured() {
  const fx = calibrationFactor(100, Number($('measX').value)), fy = calibrationFactor(100, Number($('measY').value));
  if (!fx || !fy) { $('hint').textContent = t('invalidNumber'); return; }
  saveCalibration({ fx: measuredCalibration.fx * fx, fy: measuredCalibration.fy * fy }); $('outCalib').checked = true; $('hint').textContent = t('calibSaved');
}
function initOutput() {
  $('exportSvg').onclick = exportSvg; $('exportDxf').onclick = exportDxf; $('exportPdf').onclick = exportPdf; $('exportPng').onclick = exportPng; $('print').onclick = () => printPages();
  canvas.addEventListener('dragover', e => { e.preventDefault(); });
  canvas.addEventListener('drop', e => { e.preventDefault(); const file = e.dataTransfer?.files?.[0]; if (file) openFile(file); });
  $('placeScale').onclick = placeScale; $('applyMeasured').onclick = applyMeasured; $('resetCalib').onclick = () => { measuredCalibration = {fx:1,fy:1}; saveCalibration({ fx: 1, fy: 1 }); $('measX').value = $('measY').value = '100'; };
  $('restartCalib').onclick = () => { saveCalibration({fx:1,fy:1}); $('outCalib').checked = true; printCalibration(); };
  $('verifyCalib').onclick = printCalibration;
  loadCalibration();
  restorePrintDots(); for (const id of ['printDots', 'printDotD']) $(id).addEventListener('change', savePrintDots);
}

// ---- 3D（折りたたみ・三面図）----
const canvas3d = $('canvas3d');
let view3d = false, cam = null, foldT = 0, playing = null, gl = null, glProg = null, ctx3 = null, lastStats = { faces: 0, collisions: 0 };
/** アクセス計測：ボタンの押下と切り替えを1か所で数える（回数と kind だけ。送る中身は analytics.js が絞る。公開版以外では何もしない）。 */
const COUNT_CLICKS = { exportSvg: ['ncad_export', 'svg'], exportDxf: ['ncad_export', 'dxf'], exportPdf: ['ncad_export', 'pdf'], exportPng: ['ncad_export', 'png'], print: ['ncad_print'], aiSend: ['ncad_ai'], view3d: ['ncad_view3d'] };
function initCounting() {
  track.pageview();
  document.addEventListener?.('click', e => { const id = e?.target?.closest?.('button')?.id; if (id === 'binderPlace') track.event('ncad_hw_place', { kind: $('binderSpecSel')?.value }); else if (COUNT_CLICKS[id]) track.event(COUNT_CLICKS[id][0], COUNT_CLICKS[id][1] ? { kind: COUNT_CLICKS[id][1] } : {}); });
  document.addEventListener?.('change', e => { const el = e?.target; if (!el) return; if (el.id === 'ghost3d') track.event('ncad_ghost', { kind: el.checked ? 'on' : 'off' }); else if ((el.id === 'threeView' || el.id === 'quadView') && el.checked) track.event('ncad_three_view', { kind: el.id === 'quadView' ? 'quad' : 'frame' }); });
}
/** 「革を透かして見る」がオンの間、三面図の立体の革の面（金具以外）を半透明にして描く。 */
const GHOST_ALPHA = 0.3;
const ghostFace = (f, solid) => !!solid && f.partId !== 'binder' && !!$('ghost3d')?.checked;
function folds() { return doc.shapes.filter(s => s.type === 'fold' && visible(s)); }
function initGl() {
  if (gl !== null || typeof canvas3d.getContext !== 'function') return;
  gl = canvas3d.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }) || false;
  if (!gl) { ctx3 = canvas3d.getContext('2d'); return; }
  const vs = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;attribute vec2 uv;uniform mat4 view;uniform mat4 proj;varying vec3 vc;varying vec3 vn;varying vec2 vuv;varying vec3 vpos;varying vec3 vwn;void main(){gl_Position=proj*view*vec4(p,1.0);vn=mat3(view)*n;vc=c;vuv=uv;vpos=p;vwn=n;}';
  /* uMode：0＝色だけ・1＝板の表裏（uv＝平らに置いたときの mm）・2＝立体の面（面の向きに応じて x/y・x/z・y/z の mm を使う）。uMm＝写真 1 枚の実寸。画像は 2 のべき乗でないので繰り返しは fract で */
  const fs = 'precision mediump float;varying vec3 vc;varying vec3 vn;varying vec2 vuv;varying vec3 vpos;varying vec3 vwn;uniform sampler2D uTex;uniform float uMode;uniform float uMm;uniform float uAlpha;void main(){vec3 L=normalize(vec3(0.3,0.5,0.8));float d=0.35+0.65*max(0.0,dot(normalize(vn),L));vec3 base=vc;if(uMode>0.5){vec2 tc=vuv;if(uMode>1.5){vec3 a=abs(vwn);tc=(a.z>=a.x&&a.z>=a.y)?vpos.xy:((a.y>=a.x)?vpos.xz:vpos.yz);}base=texture2D(uTex,fract(tc/uMm)).rgb;}gl_FragColor=vec4(base*d,uAlpha);}';
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  glProg = gl.createProgram(); gl.attachShader(glProg, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(glProg, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(glProg); gl.useProgram(glProg);
  gl.enable(gl.DEPTH_TEST); glProg.buf = gl.createBuffer();
}
const glTextures = new Map();
/** WebGL 用の質感：画像が読めていれば作って保存する（2 のべき乗でない画像なので繰り返しはシェーダー側）。まだ読めていなければ null（読めたら 3D も描き直す） */
function glTexture(id) {
  if (!gl) return null; if (glTextures.has(id)) return glTextures.get(id);
  const img = texImage(id); if (!img) return null;
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  glTextures.set(id, tx); return tx;
}
const partColor = (f, hit) => hit ? [0.9, 0.2, 0.2] : f.color ? hexToRgb(f.color) : f.kind === 'top' ? [0.80, 0.68, 0.46] : f.kind === 'bottom' ? [0.62, 0.52, 0.36] : [0.70, 0.58, 0.40];
function hexToRgb(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return [0.8, 0.68, 0.46]; const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function perspective(fov, aspect, near, far) { const f = 1 / Math.tan(fov / 2); return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]; }
function orthographic(hw, hh, near, far) { return [1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]; }
/** 3D を描く。gl があれば WebGL、無ければ 2D の画家アルゴリズム。戻り値は統計（テスト用）。 */
/** 3D に出すもの：三面図が入なら三面図から組み立てた立体（threeview.js）、切なら折りたたみの板。 */
let autoSolid = null; /* 「三面図から立体に」で作った立体（図面の中の正面・上・横を自動で見分けたもの）。null＝使っていない */
function scene3d() {
  if (autoSolid) return { faces: autoSolid.faces, hits: [], panels: [], solid: autoSolid };
  if (quadOn()) { const solid = quadSolidCache; return { faces: solid ? withSolidTexture(solid.faces, solidTextureOf('quad')) : [], hits: [], panels: [], solid: solid || { faces: [], slabs: 0, empty: true } }; }
  if (threeViewOn()) { const solid = threeViewSolid(doc.shapes.filter(s => visibleData(s) && s.type !== 'image'), threeViewLayout, { specOf: binderSpec }); return { faces: solid ? withSolidTexture(solid.faces, solidTextureOf('frame')) : [], hits: [], panels: [], solid: solid || { faces: [], slabs: 0, empty: true } }; }
  const panels = buildPanels(doc, { colorOf: partPanelColor, textureOf: (part, s) => s.texture || part.texture || null }), fl = folds();
  return { faces: applyFolds(panels, fl, foldT / 100), hits: collisions(panels, fl, foldT / 100), panels, solid: null };
}
/** 三面図の立体に貼る質感：正面の閉じた形（いちばん大きいもの）の質感（図形自身の指定→部品）。枠方式は正面の枠の中から、4分割は正面の紙から。無ければ null */
function solidTextureOf(kind) {
  let d = doc, list;
  if (kind === 'quad') { d = sheetDoc('front'); list = d ? d.shapes.filter(s => d.layers.find(l => l.id === s.layer)?.visible) : []; }
  else list = doc.shapes.filter(s => visibleData(s) && threeViewShapeArea(s, threeViewLayout) === 'front');
  const areaOf = s => { try { const b = bboxOf(s); return (b.maxX - b.minX) * (b.maxY - b.minY); } catch { return 0; } };
  const front = list.filter(s => s.type !== 'image' && (s.closed || s.type === 'circle')).sort((a, b) => areaOf(b) - areaOf(a))[0];
  return front ? textureOf(front, d) : null;
}
/** 立体の全部の面に同じ質感を付ける（uv は無いので、面の向きで貼る） */
const withSolidTexture = (faces, tex) => tex ? faces.map(f => f.partId === 'binder' ? f : ({ ...f, texture: tex })) : faces; /* 金具には革の質感を貼らない */
/** 三面図の立体を見るときの最初のカメラ：立体の真ん中を向き、少し斜め上・右手前から。 */
function threeViewCamera(faces) {
  const pts = faces.flatMap(f => f.points); if (!pts.length) return defaultCamera(doc);
  const lo = k => Math.min(...pts.map(p => p[k])), hi = k => Math.max(...pts.map(p => p[k]));
  const size = Math.max(hi('x') - lo('x'), hi('y') - lo('y'), hi('z') - lo('z'), 10);
  return { ...defaultCamera(doc), yaw: -35, pitch: -55, target: v3((lo('x') + hi('x')) / 2, (lo('y') + hi('y')) / 2, (lo('z') + hi('z')) / 2), distance: size * 3 };
}
function render3d() {
  const { faces, hits, panels, solid } = scene3d(), hitSet = new Set(hits.flatMap(h => [h.a, h.b]));
  lastStats = { faces: faces.length, collisions: hits.length, panels: panels.length, solid: !!solid, slabs: solid ? solid.slabs : 0 };
  if (!cam) cam = solid && faces.length ? threeViewCamera(faces) : defaultCamera(doc);
  $('collisionInfo').textContent = solid ? (solid.empty ? t('threeViewSolidNone') : t('threeViewSolidInfo', { w: +solid.width.toFixed(1), h: +solid.height.toFixed(1), d: +solid.depth.toFixed(1), n: solid.slabs })) : hits.length ? t('collisionCount', { n: hits.length }) : t('noCollision');
  if (!view3d) return lastStats;
  const quad = $('viewMode').value === 'quad', W = canvas3d.width || 1, H = canvas3d.height || 1;
  const views = quad ? [['free', cam, 0, 0], ['front', { ...cam, ...orthoViews().front, ortho: true }, 1, 0], ['top', { ...cam, ...orthoViews().top, ortho: true }, 0, 1], ['right', { ...cam, ...orthoViews().right, ortho: true }, 1, 1]] : [['free', cam, 0, 0]];
  if (gl) {
    gl.viewport(0, 0, W, H); gl.clearColor(0.06, 0.06, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const groups = new Map(); /* 質感ごとにまとめて描く（色だけの面は '' の組・板の表裏は uv・立体は面の向き） */
    for (const f of faces) {
      const ghost = ghostFace(f, solid), hit = hitSet.has(f.panelId), tex = !hit && f.texture && glTexture(f.texture) ? f.texture : '', key = (tex ? tex + (f.uv ? '|uv' : '|tri') : '') + (ghost ? '|ghost' : ''), col = partColor(f, hit), n = f.normal, idx = new Map(f.points.map((p, i) => [p, i]));
      let g = groups.get(key); if (!g) { g = { tex, ghost, data: [], mode: tex ? (f.uv ? 1 : 2) : 0, mm: tex ? textureMm(tex) : 1 }; groups.set(key, g); }
      for (const tri of triangulate(f.points)) for (const p of tri) { const u = f.uv ? f.uv[idx.get(p)] : null; g.data.push(p.x, -p.y, p.z, n.x, -n.y, n.z, col[0], col[1], col[2], u ? u.x : 0, u ? u.y : 0); }
    }
    const stride = 11 * 4, loc = name => gl.getAttribLocation(glProg, name), uni = name => gl.getUniformLocation(glProg, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, glProg.buf);
    for (const [name, size, off] of [['p', 3, 0], ['n', 3, 12], ['c', 3, 24], ['uv', 2, 36]]) { gl.enableVertexAttribArray(loc(name)); gl.vertexAttribPointer(loc(name), size, gl.FLOAT, false, stride, off); }
    for (const [, c, col, row] of views) {
      const vw = quad ? W / 2 : W, vh = quad ? H / 2 : H; gl.viewport(col * vw, (quad ? 1 - row : 0) * vh, vw, vh); gl.enable(gl.SCISSOR_TEST); gl.scissor(col * vw, (quad ? 1 - row : 0) * vh, vw, vh);
      const aspect = vw / vh, size = c.distance / (c.zoom || 2) * 0.5;
      const flipped = { ...c, target: { x: c.target.x, y: -c.target.y, z: c.target.z } };
      gl.uniformMatrix4fv(gl.getUniformLocation(glProg, 'view'), false, new Float32Array(viewMatrix(flipped)));
      gl.uniformMatrix4fv(gl.getUniformLocation(glProg, 'proj'), false, new Float32Array(c.ortho ? orthographic(size * aspect, size, -5000, 5000) : perspective(0.6, aspect, 1, 20000)));
      for (const ghostPass of [false, true]) { /* 不透明の面を先に、半透明の革は後から（奥行きは書き込まず）重ねる */
        gl.uniform1f(uni('uAlpha'), ghostPass ? GHOST_ALPHA : 1); if (ghostPass) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      for (const g of groups.values()) { if (g.ghost !== ghostPass) continue; gl.uniform1f(uni('uMode'), g.mode); gl.uniform1f(uni('uMm'), g.mm); if (g.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, glTexture(g.tex)); gl.uniform1i(uni('uTex'), 0); } gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.data), gl.DYNAMIC_DRAW); gl.drawArrays(gl.TRIANGLES, 0, g.data.length / 11); }
        if (ghostPass) { gl.depthMask(true); gl.disable(gl.BLEND); }
      }
    }
    gl.disable(gl.SCISSOR_TEST);
  } else if (ctx3) {
    ctx3.setTransform(1, 0, 0, 1, 0, 0); ctx3.fillStyle = '#101010'; ctx3.fillRect(0, 0, W, H);
    for (const [, c, col, row] of views) {
      const vw = quad ? W / 2 : W, vh = quad ? H / 2 : H;
      const proj = project(faces, { ...c, target: { x: c.target.x, y: -c.target.y, z: c.target.z } }, { width: vw, height: vh }).map(f => ({ ...f, points: f.points.map(p => ({ x: p.x + col * vw, y: p.y + row * vh })) }));
      for (const f of proj) { if (f.points.length < 3) continue; const col3 = partColor(f, hitSet.has(f.panelId)).map(v => Math.round(v * 255 * f.shade)); ctx3.beginPath(); f.points.forEach((p, i) => i ? ctx3.lineTo(p.x, p.y) : ctx3.moveTo(p.x, p.y)); ctx3.closePath(); ctx3.fillStyle = `rgb(${col3.join(',')})`; ctx3.globalAlpha = ghostFace(f, solid) ? GHOST_ALPHA : 1; ctx3.fill(); ctx3.globalAlpha = 1; ctx3.strokeStyle = '#222'; ctx3.lineWidth = 0.5; ctx3.stroke(); }
    }
  }
  return lastStats;
}
function setView3d(on) {
  if (!on) autoSolid = null; view3d = on; canvas3d.hidden = !on; $('view3d').classList.toggle('active', on); $('view3d').setAttribute('aria-pressed', String(on));
  if (on) { initGl(); const r = canvas3d.getBoundingClientRect(); canvas3d.width = Math.max(1, Math.round(r.width * (window.devicePixelRatio || 1))); canvas3d.height = Math.max(1, Math.round(r.height * (window.devicePixelRatio || 1))); if (threeViewOn() && (!cam || (!cam.yaw && !cam.pitch))) { const { faces } = scene3d(); if (faces.length) cam = threeViewCamera(faces); } if (!cam) cam = defaultCamera(doc); render3d(); $('hint').textContent = t(threeViewOn() ? 'hint3dThreeView' : 'hint3d'); }
  else { if (playing) { clearInterval(playing); playing = null; } draw(); $('hint').textContent = t('hint.' + mode); }
}
function togglePlay() {
  if (playing) { clearInterval(playing); playing = null; $('play').textContent = t('play'); return; }
  let dir = foldT >= 100 ? -1 : 1; $('play').textContent = t('pause');
  playing = setInterval(() => { foldT = Math.max(0, Math.min(100, foldT + dir * 4)); if (foldT === 0 || foldT === 100) dir = -dir; $('foldT').value = String(foldT); render3d(); }, 40);
}
function exportViews() { if (!regGuard('svg', 'views')) return; const { faces } = scene3d(); download('leather-views.svg', viewsToSvg(faces, { scale: 1 }), 'image/svg+xml', false); $('hint').textContent = t('exported', { name: t('views') }); }
/** 展開図：折り線で繋がる板を平面に戻し、縫い代付きの型紙を新しいタブに作る。 */
function makeUnfold() {
  const panels = buildPanels(doc, { colorOf: partPanelColor, textureOf: (part, s) => s.texture || part.texture || null }), fl = folds(); if (!panels.length) { $('hint').textContent = t('noPanels'); return; }
  const u = unfold(panels, fl, { allowanceMm: Number($('unfoldAllowance').value) || 0 });
  newTab(t('unfoldTab'));
  cancel(); commit(() => { let n = 1; for (const piece of u.pieces) { doc.shapes.push({ id: 's' + n++, layer: 'pattern', type: 'polyline', closed: true, points: piece.points }); } for (const f of u.folds) doc.shapes.push({ id: 's' + n++, layer: 'pattern', type: 'fold', x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, angleDeg: f.angleDeg, partId: null, inner: true }); doc.provenance = [{ source: 'unfold', at: new Date().toISOString() }]; });
  tabs[activeTab].doc = doc; renderLayers(); fit(); $('hint').textContent = t('unfoldDone', { n: u.pieces.length, e: u.allowanceEdges });
}
function printViews() { if (!regGuard('print', 'views')) return; setPageStyle('a4'); const { faces } = scene3d(); $('printArea').innerHTML = `<div class="page">${viewsToSvg(faces, { scale: 1 })}</div>`; $('printArea').dataset.pages = '1'; if (typeof window.print === 'function') window.print(); }
function init3d() {
  $('view3d').onclick = () => setView3d(!view3d);
  $('autoSolid').onclick = () => {
    if (!lockGate('threeview')) return;
    const solid = threeViewSolidAuto(doc.shapes.filter(s => visibleData(s) && s.type !== 'image'), { gap: 6 });
    if (!solid) { $('hint').textContent = t('autoSolidNone'); return; }
    autoSolid = solid; cam = threeViewCamera(solid.faces); if (!view3d) setView3d(true); else render3d();
    $('hint').textContent = t('autoSolidDone', { f: t('autoSolidYes'), t: t(solid.auto.top ? 'autoSolidYes' : 'autoSolidNo'), s: t(solid.auto.side ? 'autoSolidYes' : 'autoSolidNo'), w: +solid.width.toFixed(1), h: +solid.height.toFixed(1), d: +solid.depth.toFixed(1) });
  };
  $('foldT').addEventListener('input', () => { foldT = Number($('foldT').value) || 0; render3d(); });
  $('foldT').addEventListener('change', () => { foldT = Number($('foldT').value) || 0; render3d(); });
  $('play').onclick = togglePlay; $('viewMode').addEventListener('change', () => render3d()); $('ghost3d').addEventListener('change', () => { render3d(); draw(); }); $('exportViews').onclick = exportViews; $('printViews').onclick = printViews; $('unfoldBtn').onclick = makeUnfold;
  $('resetCam').onclick = () => { cam = threeViewOn() ? threeViewCamera(scene3d().faces) : defaultCamera(doc); render3d(); };
  let drag = null;
  canvas3d.addEventListener('pointerdown', e => { e.preventDefault(); drag = { x: e.clientX, y: e.clientY, button: e.button, cam: { ...cam, target: { ...cam.target } } }; canvas3d.setPointerCapture?.(e.pointerId); });
  canvas3d.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (drag.button === 2 || e.shiftKey) { const k = drag.cam.distance / 600; cam = { ...cam, target: { x: drag.cam.target.x - dx * k, y: drag.cam.target.y - dy * k, z: drag.cam.target.z } }; } else cam = { ...cam, yaw: drag.cam.yaw + dx * 0.5, pitch: Math.max(-89, Math.min(89, drag.cam.pitch - dy * 0.5)) }; render3d(); });
  canvas3d.addEventListener('pointerup', () => { drag = null; }); canvas3d.addEventListener('pointercancel', () => { drag = null; });
  canvas3d.addEventListener('wheel', e => { e.preventDefault(); const k = Math.exp(Math.max(-200, Math.min(200, e.deltaY)) * 0.0015); cam = { ...cam, distance: Math.max(10, cam.distance * k), zoom: cam.zoom / k }; render3d(); }, { passive: false });
  canvas3d.addEventListener('contextmenu', e => e.preventDefault());
}

// ---- 画面内チュートリアル（やってみせる）----
const TUTORIALS = [TUTORIALS_BASICS, TUTORIALS_STITCH, TUTORIALS_PEN, TUTORIALS_OUTPUT];
let tutPlayer = null;
const screenOf = (x, y) => ({ x: origin.x + x * scale, y: origin.y + y * scale });
function tutHost({ instant = false } = {}) {
  const fire = (name, p, extra = {}) => canvas.listeners?.[name] ? canvas.listeners[name]({ clientX: p.x, clientY: p.y, button: 0, pointerId: 1, preventDefault() {}, ...extra }) : canvas.dispatchEvent?.(new PointerEvent(name, { clientX: p.x + canvas.getBoundingClientRect().left, clientY: p.y + canvas.getBoundingClientRect().top, button: 0, pointerId: 1, bubbles: true, isPrimary: true }));
  return {
    t, sleep: ms => instant ? Promise.resolve() : new Promise(r => setTimeout(r, ms)),
    click: (sel, mm) => { if (mm) { const p = screenOf(mm[0], mm[1]); fire('pointerdown', p); fire('pointerup', p); return; } const el = document.querySelector?.(sel) || (sel.startsWith('#') ? $(sel.slice(1)) : null); if (el) { if (el.tagName === 'SUMMARY' && el.parentElement) el.parentElement.open = true; else if (typeof el.click === 'function') el.click(); } },
    setValue: (sel, v) => { const el = document.querySelector?.(sel) || (sel.startsWith('#') ? $(sel.slice(1)) : null); if (!el) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v); (el.listeners?.change || (() => el.dispatchEvent?.(new Event('change'))))(); },
    moveTo() {}, drag: (x1, y1, x2, y2) => { const a = screenOf(x1, y1), b = screenOf(x2, y2); fire('pointerdown', a); fire('pointermove', b); fire('pointerup', b); },
    key: k => { const ev = { key: k, target: {}, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }; (window.listeners?.keydown || (e => window.dispatchEvent?.(new KeyboardEvent('keydown', e))))(ev); },
    setMode: m => setMode(m), caption: text => { $('tutCaption').textContent = text; $('tutBar').hidden = false; },
    highlight: sel => { document.querySelectorAll?.('.tut-hl').forEach(el => el.classList.remove('tut-hl')); if (sel) { const el = document.querySelector?.(sel); el?.classList?.add('tut-hl'); } },
    cursor: (x, y) => { const c = $('tutCursor'); if (x === null || x === undefined) { c.hidden = true; return; } const p = screenOf(x, y); c.hidden = false; c.style.left = p.x + 'px'; c.style.top = p.y + 'px'; },
  };
}
globalThis.__playTutorial = (id) => playTutorial(id, { instant: false }); // 録画台本（record_tutorials.mjs）用
async function playTutorial(id, { instant = false } = {}) {
  const script = TUTORIALS.find(s => s.id === id); if (!script) return;
  if (tutPlayer?.running) tutPlayer.stop();
  $('helpDialog').close?.(); tutReturn = activeTab; newTab(t('tutorialTab')); if (!$('tutSelf').checked) canvas.style.pointerEvents = 'none'; // 専用タブで再生（作業中の図面は触らない）
  tutPlayer = createPlayer(script, tutHost({ instant })); tutPlayer.setSpeed(Number($('tutSpeed').value) || 1); tutPlayer.setSelfMode(!!$('tutSelf').checked);
  $('tutBar').hidden = false; $('tutTitle').textContent = t(script.title); await tutPlayer.play(); canvas.style.pointerEvents = '';
}
let tutReturn = -1;
function tutLeave() { canvas.style.pointerEvents = ''; if (tutReturn >= 0 && tabs.length > 1 && tabs[activeTab]?.name === t('tutorialTab')) { tabs.splice(activeTab, 1); activeTab = -1; switchTab(Math.min(tutReturn, tabs.length - 1)); } tutReturn = -1; }
function initTutorialSelect() { const sel = $('tutSel'), keep = sel.value; sel.textContent = ''; for (const s of TUTORIALS) { const o = document.createElement('option'); o.value = s.id; o.textContent = t(s.title); sel.appendChild(o); } if (keep) sel.value = keep; }
function initTutorials() {
  $('tutSelf').checked = false; initTutorialSelect();
  $('tutPlay').onclick = () => playTutorial($('tutSel').value || TUTORIALS[0].id);
  $('tutPause').onclick = () => { if (tutPlayer) $('tutPause').textContent = tutPlayer.pause() ? t('tutResume') : t('tutPause'); };
  $('tutStop').onclick = () => { tutPlayer?.stop(); $('tutBar').hidden = true; $('tutCursor').hidden = true; tutLeave(); };
  $('tutSpeed').addEventListener('change', () => tutPlayer?.setSpeed(Number($('tutSpeed').value) || 1));
  $('tutSelf').addEventListener('change', () => tutPlayer?.setSelfMode($('tutSelf').checked));
  $('helpPlay').onclick = () => { const page = $('helpPage').value; const script = TUTORIALS.find(s => s.page === page) || TUTORIALS[0]; playTutorial(script.id); };
}

// ---- 自分の設計（.lcc から変換した過去設計カタログ）----
function designItems() { return filterDesigns(DATA_DESIGNS.items || [], $('libSearch').value); }
function renderDesigns() {
  const sel = $('designSel'), keep = sel.value; sel.textContent = '';
  for (const it of designItems()) { const o = document.createElement('option'); o.value = it.id; o.textContent = `${it.folder ? it.folder.split('/').pop() + ' / ' : ''}${it.name}` + (it.holes ? ' ' + t('holesCount', { n: it.holes }) : ''); sel.appendChild(o); }
  if ([...(sel.options || [])].some(o => o.value === keep)) sel.value = keep;
  $('designCount').textContent = String(designItems().length);
}
function designCurrent() { return (DATA_DESIGNS.items || []).find(it => it.id === $('designSel').value) || designItems()[0] || null; }
async function openDesign(place = false) {
  const it = designCurrent(); if (!it) return;
  let json = null; try { json = await loadDesign(it); } catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); return; }
  if (!json) { $('hint').textContent = t('designsNeedServer'); return; }
  const next = migrateDoc(json); if (!validateDoc(next)) { $('hint').textContent = t('invalidDoc'); return; }
  if (place) { const payload = extractSelection(next, new Set(next.shapes.map(x => x.id))); const at = world({ x: width / 2, y: height / 2 }); commit(() => { mergePayload(doc, payload, { at, scale: Number($('pasteScale').value) || 1, freshId, source: 'design:' + it.id }); }); refreshTools(); renderLayers(); draw(); $('hint').textContent = t('designPlaced', { name: it.name }); return; }
  newTab(it.name); commit(() => { doc = next; selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); pairLines = []; renderLayers(); renderSeams(); fit(); $('hint').textContent = t('designLoaded', { name: it.name });
}
function initDesigns() {
  if (!(DATA_DESIGNS.items || []).length) { const sec = $('designSel').parentElement; if (sec) sec.hidden = true; $('styleNote').textContent = ''; return; } // 公開版はカタログ無し
  if (typeof location !== 'undefined' && location.protocol === 'file:') { $('designSel').hidden = true; $('designOpen').hidden = true; $('designPlace').hidden = true; $('designCount').textContent = t('designsNeedServer'); $('styleNote').textContent = styleSummary(DATA_STYLE, document.documentElement.lang === 'en' ? 'en' : 'ja'); return; }
  renderDesigns(); $('libSearch').addEventListener('input', renderDesigns);
  $('designOpen').onclick = () => openDesign(false); $('designPlace').onclick = () => openDesign(true);
  $('styleNote').textContent = styleSummary(DATA_STYLE, document.documentElement.lang === 'en' ? 'en' : 'ja');
}

// ---- 音声操作（Web Speech API・長押しで聞く・テキスト欄は同じ文法）----
let voicePending = null, voiceCandidates = [], voiceRec = null, voiceAskNumber = null, voiceLevelStop = null;
const voiceLang = () => ($('language').value || 'ja') === 'en' ? 'en' : 'ja';
function voiceSay(text) { $('voiceOut').textContent = text; if ($('voiceSpeak').checked && typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance === 'function') { const u = new SpeechSynthesisUtterance(text); u.lang = voiceLang() === 'en' ? 'en-US' : 'ja-JP'; speechSynthesis.speak(u); } }
function renderVoiceCandidates() {
  const box = $('voiceCandidates'); box.textContent = ''; box.hidden = !voiceCandidates.length;
  voiceCandidates.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = labelOf(c, voiceLang()); b.onclick = () => { voiceCandidates = []; renderVoiceCandidates(); execVoice(c); }; box.appendChild(b); });
}
function execVoice(r) {
  const lang = voiceLang();
  if (r.ask) { voiceCandidates = r.ask; renderVoiceCandidates(); voiceSay(t('voiceWhich')); return; }
  if (r.free !== undefined) { if (!r.free) return; $('aiInput').value = r.free; $('aiCard').open = true; voiceSay(($('aiUrl').value || '').trim() ? t('voiceToAi') : t('voiceAiUnset')); return; }
  if (r.confirm && !r.confirmed) { voicePending = r; voiceSay(t('voiceConfirm', { what: labelOf(r, lang) })); return; }
  voicePending = null; const a = r.args || {};
  const done = extra => voiceSay(t('voiceDid', { what: labelOf(r, lang) + (extra ? ' ' + extra : '') }));
  switch (r.cmd) {
    case 'noop': case 'cancel': voiceCandidates = []; renderVoiceCandidates(); if (r.cmd === 'cancel') { cancel(); voiceSay(t('voiceCancelled')); } return;
    case 'tool': {
      if (mode !== r.tool) setMode(r.tool);
      if (r.tool === 'line' && a.value !== undefined) runCommand(a.value + '<' + (a.angle ?? 0));
      else if (r.tool === 'circle' && a.radius !== undefined) { runCommand(lastPoint.x + ',' + lastPoint.y); runCommand(String(a.radius)); }
      else if (r.tool === 'stitch') { if (a.value !== undefined) { const tool = doc.tools.find(x => Math.abs(x.pitch - a.value) < 0.05); if (tool) { $('stitchTool').value = tool.id; $('stitchTool').listeners?.change?.(); } } if (a.placement) $('placement').value = a.placement; $('stitchCard').open = true; }
      else if (['offset', 'chamfer', 'fillet'].includes(r.tool) && a.value !== undefined) voiceAskNumber = r.tool === 'offset' && a.side === 'inside' ? -Math.abs(a.value) : a.value;
      done(a.value !== undefined ? String(a.value) : a.radius !== undefined ? String(a.radius) : ''); return;
    }
    case 'undo': $('undo').onclick(); break; case 'redo': $('redo').onclick(); break;
    case 'delete': removeSelected(); break; case 'copy': copySelected(); break;
    case 'mirrorX': $('mirrorX').onclick(); break; case 'mirrorY': $('mirrorY').onclick(); break;
    case 'selectAll': selected = new Set(doc.shapes.filter(s => { const l = doc.layers.find(x => x.id === s.layer || x.name === s.layer); return !l || (l.visible !== false && !l.locked); }).map(s => s.id)); draw(); break;
    case 'save': save(); break; case 'exportSvg': exportSvg(); break; case 'exportDxf': exportDxf(); break; case 'exportPdf': exportPdf(); break; case 'print': printPages(); break;
    case 'view3d': setView3d(true); break; case 'view2d': setView3d(false); break; case 'help': showHelp(); break;
    case 'zoomIn': zoom(1.25); break; case 'zoomOut': zoom(0.8); break; case 'fit': fit(); break;
    case 'zoom': { const target = Math.max(0.05, Math.min(40, (a.value || 100) / 100 * 4)); zoom(target / scale); break; }
    case 'grid': $('spacing').value = String(a.value); snap = null; draw(); break;
    default: voiceSay(t('voiceUnknown')); return;
  }
  done('');
}
function execVoiceText(text) { $('voiceHeard').textContent = text; execVoice(parseVoice(text, voiceLang(), { pending: voicePending })); }
function voiceStart() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('voiceOut').textContent = t('voiceUnsupported'); $('voiceText').focus?.(); return; }
  if (voiceRec) return; const rec = new SR(); voiceRec = rec; rec.lang = voiceLang() === 'en' ? 'en-US' : 'ja-JP'; rec.interimResults = true; rec.continuous = false;
  let finalText = ''; $('voiceBtn').classList.add('active'); $('voiceHeard').textContent = '…'; $('voiceOut').textContent = '';
  rec.onresult = e => { let s = ''; for (const r of e.results) { s += r[0].transcript; if (r.isFinal) finalText = s; } $('voiceHeard').textContent = s; };
  rec.onerror = e => { $('voiceOut').textContent = e.error === 'not-allowed' ? t('voiceNoPermission') : e.error === 'no-speech' ? t('voiceNoSound') : t('voiceError'); };
  rec.onend = () => { voiceRec = null; $('voiceBtn').classList.remove('active'); voiceLevelStop?.(); voiceLevelStop = null; const text = finalText || $('voiceHeard').textContent; if (text && text !== '…') execVoice(parseVoice(text, voiceLang(), { pending: voicePending })); else if (!$('voiceOut').textContent) $('voiceOut').textContent = t('voiceNoSound'); };
  try { rec.start(); } catch { voiceRec = null; }
  voiceLevelStart();
}
function voiceStop() { if (voiceRec) { try { voiceRec.stop(); } catch { /* 二重停止は無視 */ } } }
function voiceLevelStart() {
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const ac = new AudioContext(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 256; src.connect(an); const buf = new Uint8Array(an.frequencyBinCount); let quiet = 0;
    const timer = setInterval(() => { an.getByteTimeDomainData(buf); let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128)); const level = Math.min(100, Math.round(peak / 1.28)); $('voiceLevel').value = level; if (level < 3) { if (++quiet === 12) $('voiceOut').textContent = t('voiceMicQuiet'); } else quiet = 0; }, 250);
    voiceLevelStop = () => { clearInterval(timer); stream.getTracks().forEach(tr => tr.stop()); ac.close?.(); $('voiceLevel').value = 0; };
    if (!voiceRec) voiceLevelStop();
  }).catch(() => { $('voiceOut').textContent = t('voiceNoPermission'); });
}
function initVoice() {
  const btn = $('voiceBtn'); let toggled = false;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if ($('voiceMode').value === 'toggle') { toggled = !toggled; if (toggled) voiceStart(); else voiceStop(); } else voiceStart(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, () => { if ($('voiceMode').value !== 'toggle') voiceStop(); });
  btn.addEventListener('contextmenu', e => e.preventDefault());
  $('voiceText').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); execVoiceText($('voiceText').value); $('voiceText').value = ''; } });
  $('voiceGo').onclick = () => { execVoiceText($('voiceText').value); $('voiceText').value = ''; };
  $('voiceSpeak').checked = false; $('voiceMode').value = 'hold';
  try { $('voiceSpeak').checked = localStorage.getItem('leather-cad.voiceSpeak') === '1'; $('voiceMode').value = localStorage.getItem('leather-cad.voiceMode') || 'hold'; } catch { /* 保存できなくても続ける */ }
  $('voiceSpeak').addEventListener('change', () => { try { localStorage.setItem('leather-cad.voiceSpeak', $('voiceSpeak').checked ? '1' : '0'); } catch { /* 同上 */ } });
  $('voiceMode').addEventListener('change', () => { try { localStorage.setItem('leather-cad.voiceMode', $('voiceMode').value); } catch { /* 同上 */ } });
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) $('voiceOut').textContent = t('voiceUnsupported');
}

// ---- カラーシミュレーション（革色・糸色・パターン）----
let colorPins = [];
function loadPins() { try { colorPins = JSON.parse(localStorage.getItem('leather-cad.colorPins')) || []; } catch { colorPins = []; } if (!Array.isArray(colorPins)) colorPins = []; }
function persistPins() { try { localStorage.setItem('leather-cad.colorPins', JSON.stringify(colorPins)); } catch { /* 省略 */ } }
function threadList() { const q = ($('threadSearch').value || '').toLowerCase(); return DATA_STITCH_COLORS.stitchColors.filter(c => !q || (c.label + ' ' + (c.jp || '') + ' ' + (c.alias || '') + ' ' + c.name).toLowerCase().includes(q)); }
function renderColors() {
  const grid = $('leatherGrid'); grid.textContent = '';
  for (const c of DATA_LEATHER_COLORS.leatherColors) { const b = document.createElement('button'); b.className = 'swatch'; b.title = c.name; b.style.background = c.hex; b.dataset.hex = c.hex; b.onclick = () => applyLeather(c.hex); grid.appendChild(b); }
  const mg = $('metalGrid'); mg.textContent = ''; /* 金具の色（金属）：革色とは別の見本。金属らしい光沢の見た目 */
  for (const m of METAL_COLORS) { const b = document.createElement('button'); b.className = 'swatch metal'; b.title = t('metal.' + m.id); b.dataset.metal = m.id; b.style.background = `linear-gradient(135deg, ${m.light} 0%, ${m.hex} 45%, ${m.dark} 100%)`; b.onclick = () => applyMetal(m.id); mg.appendChild(b); }
  const sel = $('threadSel'), keep = sel.value; sel.textContent = '';
  const pinned = threadList().filter(c => colorPins.includes(c.id)), rest = threadList().filter(c => !colorPins.includes(c.id));
  for (const c of [...pinned, ...rest]) { const o = document.createElement('option'); o.value = c.id; o.textContent = (colorPins.includes(c.id) ? '★ ' : '') + c.label + ' ' + (c.jp || '') + (c.verified === false ? ' (?)' : ''); sel.appendChild(o); }
  if (threadList().some(c => c.id === keep)) sel.value = keep;
  const pal = $('patternSel'), keepP = pal.value; pal.textContent = '';
  for (const p of (doc.palettes || [])) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; pal.appendChild(o); }
  if ((doc.palettes || []).some(p => p.id === keepP)) pal.value = keepP;
  const th = DATA_STITCH_COLORS.stitchColors.find(c => c.id === sel.value); $('threadPreview').style.background = th ? th.hex : 'transparent';
  renderTextures();
}
/** 選んだ図形に革色を付ける。部品の図形なら部品の色（今までどおり）。部品に入っていない図形は「型紙」として図形自身に付ける：閉じた図形はそのまま、開いた線は端がつながった一周ごとにまとめて（leatherGroup）塗る。
 *  事業主指示 2026-10-18「革は部品ではなく型紙。型紙で塗れるようにしたい」（取り込んだ図面には部品が無く、革色が付かなかった）。 */
let paintBrush = null;   /* 塗りモードで持っている色：{ kind:'leather', hex } か { kind:'metal', id } */
const currentMetalStyle = () => $('metalStyle')?.value === 'radial' ? 'radial' : 'linear';   /* 光沢の形の選択欄（帯・放射） */
const paintName = b => b.kind === 'texture' ? (textureById(b.id)?.name || b.id) : b.kind === 'metal' ? t('metal.' + b.id) + (b.style === 'radial' ? '（' + t('metalStyleRadialShort') + '）' : '') : (() => { const c = DATA_LEATHER_COLORS.leatherColors.find(x => String(x.hex).toLowerCase() === b.hex.toLowerCase()); return c ? c.name + ' ' + b.hex : b.hex; })();
/** 塗りモード（事業主の希望 2026-10-18「金具の色が塗れない・スポイトでの塗り機能は」）：色の見本を、図形を選ばずに押すと、その色を持って塗りモードになる。図形をクリックすると塗れる。Alt＋クリックで図形の色を拾う（スポイト）。Esc で終わる。 */
function startPaint(brush) { paintBrush = brush; selected = new Set(); if (brush.kind === 'metal' && $('metalStyle')) $('metalStyle').value = brush.style === 'radial' ? 'radial' : 'linear'; setMode('paint'); $('hint').textContent = t('paintStart', { name: paintName(brush) }); draw(); }
/** 領域の塗り（doc.fills）：線で囲まれた場所を塗る。取り込んだ型紙の輪郭が T字・すき間で閉じて見えなくても塗れる（事業主の指摘 2026-10-18「つながっていないと警告が出て色が塗れない」）。計算は geometry.js の regionAt。 */
const regionShapes = () => doc.shapes.filter(s => visible(s) && !s.holeLink && s.layer !== 'guide' && s.lineStyle !== 'dashed' && !['text', 'dimension', 'image', 'fold'].includes(s.type));   /* 囲む線：見えている実線（ガイド層・点線は囲まない） */
const insideRing = (q, ps) => { let c = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) if ((ps[i].y > q.y) !== (ps[j].y > q.y) && q.x < (ps[j].x - ps[i].x) * (q.y - ps[i].y) / (ps[j].y - ps[i].y) + ps[i].x) c = !c; return c; };
const fillContains = (fl, q) => insideRing(q, fl.points) && !(fl.holes || []).some(h => insideRing(q, h));
/** 点を含む領域の塗り（小さいものが上） */
function fillAt(q) { return (doc.fills || []).filter(fl => fillContains(fl, q)).sort((x, y) => (x.area || 0) - (y.area || 0))[0] || null; }
/** 領域の塗りの中身：金属（と光沢の形）・質感（同じ領域に革色があれば残す）・革色。 */
function fillPayload(brush, ids) {
  if (brush.kind === 'metal') return { metal: brush.id, ...(brush.style === 'radial' ? { style: 'radial' } : {}) };
  if (brush.kind === 'texture') { const old = (doc.fills || []).find(o => o.ids.length === ids.length && o.ids.every(i => ids.includes(i))); return { ...(old?.leather ? { leather: old.leather } : {}), texture: brush.id }; }
  return { leather: brush.hex };
}
function addRegionFill(p, brush) {
  const r = enclosedAreaAt(regionShapes(), p); if (!r) { $('hint').textContent = t('paintNoRegion'); return false; }
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), nf = { id: freshId(doc.fills || [], 'f'), points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10, ...fillPayload(brush, r.ids) };
  commit(() => { doc.fills = (doc.fills || []).filter(o => !(o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id)))); doc.fills.push(nf); });   /* 同じ領域は置き換える */
  $('hint').textContent = t('regionPainted', { name: paintName(brush) }) + (r.bridged ? ' ' + t('regionBridged') : ''); return true;
}
/** 選んだ図形（ids）と、まわりの線で囲まれた場所を、全部「領域の塗り」にする（事業主の指摘 2026-10-18「選んだ線が一周つながっていないと言われる。つながっているのに」：袋の形の13本を選んで色を押した）。塗れた数を返す（0 なら何も塗らない）。 */
function addSelectionRegionFills(brush, ids) {
  const regs = enclosedAreasAround(regionShapes(), ids); if (!regs.length) return 0;
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), list = [...(doc.fills || [])], made = [];
  for (const r of regs) { const nf = { id: freshId(list, 'f'), points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10, ...fillPayload(brush, r.ids) }; list.push(nf); made.push(nf); }
  const same = (o, nf) => o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id));
  commit(() => { doc.fills = (doc.fills || []).filter(o => !made.some(nf => same(o, nf))); doc.fills.push(...made); });   /* 同じ場所は置き換える */
  $('hint').textContent = t('regionsPainted', { n: made.length, name: paintName(brush) }) + (regs.some(r => r.bridged) ? ' ' + t('regionBridged') : ''); return made.length;
}
/** 「光沢の形」を選び直したとき：金属の色が付いた図形を選んでいれば、色はそのままで形（帯・放射）だけを変える。何も選んでいなければ、これから塗る形（と塗りモードで持っている色の形）を決めるだけ。 */
function changeMetalStyle() {
  const style = currentMetalStyle(), name = t(style === 'radial' ? 'metalStyleRadialShort' : 'metalStyleLinearShort'), ids = new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh) && sh.metal).map(sh => sh.id));
  if (paintBrush?.kind === 'metal' && mode === 'paint') paintBrush = { ...paintBrush, style };
  if (!ids.size) { $('hint').textContent = t('metalStyleSet', { name }); return; }
  commit(() => { for (const sh of doc.shapes) if (ids.has(sh.id)) { if (style === 'radial') sh.metalStyle = 'radial'; else delete sh.metalStyle; } });
  $('hint').textContent = t('metalStyleChanged', { n: ids.size, name });
}
function clearFills() {
  const n = (doc.fills || []).length; if (!n) { $('hint').textContent = t('fillsNone'); return; }
  commit(() => { doc.fills = []; }); $('hint').textContent = t('fillsCleared', { n }); draw();
}
/** 領域の塗りのうち、囲む図形のどれかが見えているもの。面積の大きい順（小さい領域が上）。kind：'leather' か 'metal' */
const visibleFills = (d, vis, kind) => (d.fills || []).filter(fl => (kind === 'metal' ? fl.metal : (fl.leather || fl.texture)) && fl.ids.some(id => { const sh = d.shapes.find(x => x.id === id); return sh && vis(sh); }) && (!exportFilter || fl.ids.filter(id => exportFilter.ids.has(id)).length * 2 >= fl.ids.length))   /* 選んだ図形だけ出力：境目の図形の半分以上を選んだ領域だけ */.sort((x, y) => (y.area || 0) - (x.area || 0));
/** 革色の塗りの「項目」＝{ area：面積（重ねる順を決める）, draw：描く関数 }。線で囲まれた場所の塗り。 */
function regionLeatherItems(d, vis) {
  return visibleFills(d, vis, 'leather').map(fl => ({ area: leatherItemArea(fl.points), draw: () => { ctx.beginPath(); for (const ring of [fl.points, ...(fl.holes || [])]) { ring.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); } ctx.save(); ctx.globalAlpha = exporting ? 1 : fl.texture ? 0.92 : 0.55; ctx.fillStyle = fl.texture ? textureFill(fl.texture) : fl.leather; ctx.fill('evenodd'); ctx.restore(); } }));
}
/** 多角形の面積（絶対値）。革色の塗りを大きい順に重ねるために使う。点が無い・壊れているときは 0。 */
function leatherItemArea(ps) { if (!ps || ps.length < 3) return 0; const v = Math.abs(ps.reduce((m, q, i) => { const r = ps[(i + 1) % ps.length]; return m + (q.x * r.y - r.x * q.y); }, 0)) / 2; return Number.isFinite(v) ? v : 0; }
function paintClick(p, eyedrop) {
  const s = pickShapeAt(p);
  if (eyedrop) {   /* スポイト：図形の色（金属の色が先・無ければ部品の革色・型紙に付けた革色）、無ければ、領域の塗りの色を持つ */
    const part = s && doc.parts.find(q => q.shapeIds.includes(s.id)), hex = part?.color || s?.leather, fl = fillAt(p);
    if (s?.metal) paintBrush = { kind: 'metal', id: s.metal, style: s.metalStyle === 'radial' ? 'radial' : 'linear' }; else if (hex) paintBrush = { kind: 'leather', hex }; else if (fl && (fl.metal || fl.leather)) paintBrush = fl.metal ? { kind: 'metal', id: fl.metal, style: fl.style === 'radial' ? 'radial' : 'linear' } : { kind: 'leather', hex: fl.leather }; else { $('hint').textContent = t(s ? 'paintNoColor' : 'paintNoneColor'); return; }
    if (paintBrush.kind === 'metal' && $('metalStyle')) $('metalStyle').value = paintBrush.style; $('hint').textContent = t('paintPicked', { name: paintName(paintBrush) }); return;
  }
  if (!paintBrush) { $('hint').textContent = t('paintNoBrush'); return; }
  let painted = 0;
  if (s) {
    const g = groupIdOf(s), ids = new Set(g ? doc.shapes.filter(x => groupIdOf(x) === g).map(x => x.id) : [s.id]);   /* 金具などのグループは全体を塗る */
    if (!(s.closed || s.type === 'circle') && (paintBrush.kind === 'leather' || !g)) for (const id of contourFrom(doc.shapes.filter(x => editable(x) && visible(x) && !x.holeLink), s.id)) ids.add(id);   /* 型紙の輪郭は、端がつながった線を一周まとめて */
    selected = ids; try { painted = paintBrush.kind === 'metal' ? applyMetal(paintBrush.id, paintBrush.style) : applyLeather(paintBrush.hex, true); } finally { selected = new Set(); }
  }
  if (!painted) addRegionFill(p, paintBrush);   /* 線から離れた所・閉じた形にならない線：線で囲まれた場所を塗る（T字・すき間があっても） */
  draw();
}
function applyLeather(hex, quiet = false) {   /* quiet：塗りモードで、塗れなければ案内を出さず 0 を返す（そのあと領域を塗る）。返り値：塗ったまとまりの数 */
  const okIds = new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh)).map(sh => sh.id)), parts = doc.parts.filter(p => p.shapeIds.some(id => okIds.has(id)));
  if (!okIds.size && !doc.shapes.some(sh => selected.has(sh.id))) { startPaint({ kind: 'leather', hex }); return 0; }   /* 何も選んでいなければ、その色を持って塗りモードに（ロックしたレイヤーの図形を選んでいるときは、今までどおり塗れない案内） */
  const inPart = new Set(doc.parts.flatMap(p => p.shapeIds)), loose = doc.shapes.filter(sh => okIds.has(sh.id) && !inPart.has(sh.id) && !sh.holeLink && !['text', 'dimension', 'image', 'fold'].includes(sh.type));
  const closedOnes = loose.filter(sh => sh.closed || sh.type === 'circle'), open = loose.filter(sh => !(sh.closed || sh.type === 'circle'));
  const loops = [], rest = new Set(open.map(s => s.id)); let unclosed = 0;
  while (rest.size) { const pool = open.filter(s => rest.has(s.id)), startId = pool[0].id, poly = outlinePolygon(pool, startId); if (poly) { loops.push(poly.ids); for (const id of poly.ids) rest.delete(id); } else { for (const id of contourFrom(pool, startId)) { rest.delete(id); unclosed++; } if (rest.delete(startId)) unclosed++; } } /* 一周しない線は数えて案内するだけ */
  if (!parts.length && !closedOnes.length && !loops.length) { if (!quiet && open.length) { const n = addSelectionRegionFills({ kind: 'leather', hex }, new Set(open.map(sh => sh.id))); if (n) return n; }   /* 端と端で一周しなくても、まわりの線と合わせて囲まれた場所があれば塗る */
    if (!quiet) $('hint').textContent = t(unclosed ? 'leatherNotClosed' : 'leatherNeedShape'); return 0; }
  const used = new Set(doc.shapes.map(s => s.leatherGroup).filter(Boolean)); let seq = 0; const nextGroup = () => { do seq++; while (used.has('lg' + seq)); used.add('lg' + seq); return 'lg' + seq; };
  commit(() => { for (const p of parts) p.color = hex; for (const s of closedOnes) { s.leather = hex; delete s.leatherGroup; } for (const ids of loops) { const gid = nextGroup(); for (const s of doc.shapes) if (ids.includes(s.id)) { s.leather = hex; s.leatherGroup = gid; } } });
  $('hint').textContent = t('leatherApplied', { n: parts.length + closedOnes.length + loops.length, hex }) + (unclosed ? ' ' + t('leatherSkippedOpen', { n: unclosed }) : ''); return parts.length + closedOnes.length + loops.length;
}
/** 型紙に直接付けた革色のうち、端がつながった線の一周（leatherGroup）の塗り：一周をたどった多角形（閉じた図形は図形ごとの塗りで描く）。move は作図中の移動プレビュー用。 */
function leatherOutlineFills(d, vis, move = s => s) {
  const byGroup = new Map(); for (const s of d.shapes) { if (!(s.leather || s.texture) || !s.leatherGroup || !vis(s)) continue; if (!byGroup.has(s.leatherGroup)) byGroup.set(s.leatherGroup, []); byGroup.get(s.leatherGroup).push(move(s)); }
  const out = []; for (const list of byGroup.values()) { const poly = outlinePolygon(list, list[0].id); if (poly) out.push({ points: poly.points, color: list[0].leather, texture: list.find(q => q.texture)?.texture || null }); } return out;
}
/** 革色・革の質感の塗り（カラーシミュレーション）：部品の閉図形・型紙に付けた革色（閉じた図形）・質感（図形自身の指定が優先）を塗り、端がつながった線の一周の革色も塗る。画面・ほかの紙・PNG 書き出しで同じ見え方（書き出しは不透明）。 */
function drawLeatherFills(d, vis, move = s => s) {
  const items = regionLeatherItems(d, vis);   /* 線で囲まれた場所の塗り */
  for (const sh of d.shapes.filter(sh => vis(sh) && (sh.closed || sh.type === 'circle'))) {   /* 図形ごとの塗り */
    const tex = textureOf(sh, d), part = tex ? null : (d.parts || []).find(p => p.color && p.shapeIds.includes(sh.id)), color = part?.color || sh.leather; if (!tex && !color) continue;
    const poly = outlinePolygon([move(sh)], sh.id)?.points, bb = poly ? null : bboxOf(move(sh));
    items.push({ area: poly ? leatherItemArea(poly) : bb ? Math.max(0, (bb.maxX - bb.minX) * (bb.maxY - bb.minY)) || 0 : 0, draw: () => { path(move(sh)); ctx.save(); ctx.globalAlpha = exporting ? 1 : tex ? 0.92 : 0.55; ctx.fillStyle = tex ? textureFill(tex) : color; ctx.fill(); ctx.restore(); } });
  }
  for (const r of leatherOutlineFills(d, vis, move)) items.push({ area: leatherItemArea(r.points), draw: () => { ctx.beginPath(); r.points.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.save(); ctx.globalAlpha = exporting ? 1 : r.texture ? 0.92 : 0.55; ctx.fillStyle = r.texture ? textureFill(r.texture) : r.color; ctx.fill(); ctx.restore(); } });   /* 一周の線（型紙の輪郭）の塗り */
  items.sort((x, y) => y.area - x.area);   /* 大きい形が下・小さい形が上（本体の内側のポケットが、本体の下に隠れない・事業主の指摘 2026-10-18）。同じ面積は、並べた順のまま（安定ソート） */
  for (const it of items) it.draw();
}
/** 選んだ図形に金属の色（ゴールド・シルバー・ピンクゴールド・ブラックゴールド）を付ける。id が null なら解除。線の色と、3D の金具の面の色になる。革色・革の質感とは別（事業主指示 2026-10-13）。 */
/** 金属の色が付いた図形の、べた塗りの計画。置いた金具・手描き・取り込みのどれも、図形そのものの形から作る（登録した金具の形は見ない）。だから、金具を動かしても・形を直しても・拡大縮小しても、線と塗りは同じ（事業主の指摘 2026-10-18「リングの線と塗りがずれる」）。
 *  塗る形：閉じた図形（円も）と、端がつながった線の一周（metalGroup）。同じ金属の別の形にすっぽり入る形は、その形のくり抜きの穴（穴の中の形は、また塗る形）。リングアームの棒（occlude）は、線を描くときに本体の上へ別に塗る。
 *  戻り値：[{ metal, body: [点], holes: [[点]] }]（面積の大きい順＝小さい形が上）。d・vis・move は、ほかの紙・作図中の移動プレビュー用。 */
function metalFillPlan(d = doc, vis = visible, move = s => s) {
  const items = [], loops = new Map(), nonGeom = ['text', 'dimension', 'image', 'fold'];
  for (const s of d.shapes) {
    if (!s.metal || s.occlude || s.holeLink || nonGeom.includes(s.type) || !vis(s)) continue;
    if (s.closed || s.type === 'circle') { const poly = outlinePolygon([move(s)], s.id); if (poly) items.push({ metal: s.metal, points: poly.points, style: s.metalStyle === 'radial' ? 'radial' : 'linear' }); }
    else if (s.metalGroup) { if (!loops.has(s.metalGroup)) loops.set(s.metalGroup, []); loops.get(s.metalGroup).push(move(s)); }
  }
  for (const list of loops.values()) { const poly = outlinePolygon(list, list[0].id); if (poly) items.push({ metal: list[0].metal, points: poly.points, style: list[0].metalStyle === 'radial' ? 'radial' : 'linear' }); }
  const area = ps => Math.abs(ps.reduce((m, q, i) => { const r = ps[(i + 1) % ps.length]; return m + (q.x * r.y - r.x * q.y); }, 0)) / 2;
  const inside = (p, ps) => { let c = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) if ((ps[i].y > p.y) !== (ps[j].y > p.y) && p.x < (ps[j].x - ps[i].x) * (p.y - ps[i].y) / (ps[j].y - ps[i].y) + ps[i].x) c = !c; return c; };
  for (const it of items) it.area = area(it.points);
  items.sort((x, y) => y.area - x.area);
  for (const it of items) {   /* いちばん小さい入れ物（同じ金属で、全部の点が中にある）。入れ物が穴でなければ、自分は穴 */
    const parents = items.filter(o => o !== it && o.area > it.area && o.metal === it.metal && it.points.every(p => inside(p, o.points))).sort((x, y) => x.area - y.area);
    it.parent = parents[0] || null; it.hole = !!it.parent && !it.parent.hole;
  }
  return items.filter(it => !it.hole).map(it => ({ metal: it.metal, style: it.style, body: it.points, holes: items.filter(h => h.hole && h.parent === it).map(h => h.points) }));
}
/** 2色を割合 t（0〜1）で混ぜた色（#RRGGBB）。 */
function mixHex(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** 金属の質感：幅方向（細い側）に走る光沢の帯。暗→基本→明るい光→基本→やや暗→暗。磨いた金属が、丸みのある面に光を映したように見える。 */
function metalStops(m) { return [[0, m.dark], [0.12, mixHex(m.hex, m.dark, 0.35)], [0.3, m.hex], [0.42, m.light], [0.56, m.hex], [0.8, mixHex(m.hex, m.dark, 0.6)], [1, m.dark]]; }
/** 図形の線の色：情報パネルで選んだ色が先。無ければ、金属の色が付いた図形は金属の濃い側の色（塗りの上でも線が見える）。どちらも無ければ null。 */
const shapeLineColor = s => SHAPE_DRAW_COLOR[s.color] || (s.metal ? METAL_COLORS.find(m => m.id === s.metal)?.dark : null) || null;
/** 金属の質感の塗り（光沢の帯のグラデーション）。ps＝多角形の点列。細い側に帯が走る。 */
/** 金属の光沢の放射：明るい点（中心の少し左上）→基本色→暗い縁。丸いボタン・コインの金属らしい見え方。 */
function metalRadialStops(m) { return [[0, m.light], [0.3, mixHex(m.hex, m.light, 0.45)], [0.62, m.hex], [0.86, mixHex(m.hex, m.dark, 0.55)], [1, m.dark]]; }
/** 金属の質感の塗りつぶし色。style：'linear'（細い側に走る帯・今までどおり）か 'radial'（放射・事業主の希望 2026-10-18「ボタンの塗りで放射を選べるように」）。 */
function metalShade(m, ps, style = 'linear') {
  const xs = ps.map(q => q.x), ys = ps.map(q => q.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (style === 'radial') { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(1e-6, ...ps.map(q => Math.hypot(q.x - cx, q.y - cy))), rg = ctx.createRadialGradient?.(cx - R * 0.28, cy - R * 0.28, R * 0.04, cx, cy, R * 1.02); if (rg) for (const [o, c] of metalRadialStops(m)) rg.addColorStop(o, c); return rg || m.hex; }
  const g = (x1 - x0 >= y1 - y0) ? ctx.createLinearGradient?.(x0, y0, x0, y1) : ctx.createLinearGradient?.(x0, y0, x1, y0); if (g) for (const [o, c] of metalStops(m)) g.addColorStop(o, c); return g || m.hex;
}
/** 本体の上に重なる図形（リングアームの棒）の塗り：金属の色が付いていればその光沢、なければ背景色で塗って、下の線を隠す。 */
function drawOccluder(s, bg = '#080808') { const q = previewMoved(s); if (!q.points?.length) return; const m = s.metal && (viewShow.colors || exporting) ? METAL_COLORS.find(x => x.id === s.metal) : null; if (!m && !bg) return; ctx.save(); ctx.setLineDash([]); ctx.fillStyle = m ? metalShade(m, q.points, s.metalStyle) : bg; path(q); ctx.fill(); ctx.restore(); }   /* bg：金属の色が無いとき下の線を隠す色（書き出しは白・透明 PNG は隠さない） */
/** 金属の色が付いた金具の、べた塗り。金属の質感：細い側に光沢の帯・内側の縁のハイライト・影・穴の暗い縁。線の下に描く。本体の穴は抜く。 */
function drawMetalFills(vis = visible) {
  const trace = ps => { ps.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); };
  const paint = (m, ps, holes, style) => {
    ctx.save(); ctx.setLineDash([]); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1.5; ctx.shadowOffsetY = 2.5; ctx.fillStyle = metalShade(m, ps, style); ctx.beginPath(); trace(ps); for (const h of holes) trace(h); ctx.fill('evenodd'); ctx.restore();
    ctx.save(); ctx.beginPath(); trace(ps); for (const h of holes) trace(h); ctx.clip('evenodd'); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3 / scale; ctx.beginPath(); trace(ps); ctx.stroke(); ctx.restore(); /* 内側の縁のハイライト */
    for (const h of holes) { ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1.6 / scale; ctx.beginPath(); trace(h); ctx.stroke(); ctx.restore(); } /* 穴の暗い縁 */
  };
  for (const fl of visibleFills(doc, vis, 'metal')) { const m = METAL_COLORS.find(x => x.id === fl.metal); if (m) paint(m, fl.points, fl.holes || [], fl.style); }   /* 線で囲まれた場所の金属の塗り */
  for (const r of metalFillPlan(doc, vis, previewMoved)) { const m = METAL_COLORS.find(x => x.id === r.metal); if (m) paint(m, r.body, r.holes, r.style); }   /* 図形そのものの形で塗る（動かしている最中も、線と同じ位置） */
}
function applyMetal(id, style = currentMetalStyle()) {   /* style：光沢の形（帯・放射）。省略は、選択欄の値 */
  const ids = new Set(doc.shapes.filter(s => selected.has(s.id) && editable(s)).map(s => s.id)); if (!ids.size) { if (id && !doc.shapes.some(s => selected.has(s.id))) startPaint({ kind: 'metal', id, style }); else $('hint').textContent = t('metalNeedSelect'); return 0; }   /* 何も選んでいなければ、その色を持って塗りモードに（解除は、選んでから。ロックしたレイヤーの図形を選んでいるときは、今までどおりの案内） */
  let unclosed = 0, loopsMade = 0; const openLeft = [];   /* 一周つながっていない線の数（線の色だけ付く）・一周にできた数・一周にできなかった線の id */
  commit(() => {
    for (const s of doc.shapes) if (ids.has(s.id)) { if (id) { s.metal = id; if (style === 'radial') s.metalStyle = 'radial'; else delete s.metalStyle; } else { delete s.metal; delete s.metalGroup; delete s.metalStyle; } }
    if (!id) return;
    const hwGroups = new Set(doc.shapes.filter(s => s.hw && groupIdOf(s)).map(s => groupIdOf(s))), mine = doc.shapes.filter(s => ids.has(s.id) && !s.hw && !s.holeLink && !['text', 'dimension', 'image', 'fold'].includes(s.type) && !(groupIdOf(s) && hwGroups.has(groupIdOf(s))));   /* 置いた金具は、金具の登録した形で塗る */
    for (const s of mine) delete s.metalGroup;
    const flat = mine.filter(s => !(s.closed || s.type === 'circle')), rest = new Set(flat.map(s => s.id)), used = new Set(doc.shapes.map(s => s.metalGroup).filter(Boolean)); let seq = 0;
    while (rest.size) {   /* 開いた線は、端がつながった一周ごとに、まとまり（metalGroup）にして、一周を塗る */
      const pool = flat.filter(s => rest.has(s.id)), startId = pool[0].id, poly = outlinePolygon(pool, startId);
      if (poly) { do seq++; while (used.has('mg' + seq)); used.add('mg' + seq); for (const s of doc.shapes) if (poly.ids.includes(s.id)) s.metalGroup = 'mg' + seq; for (const i of poly.ids) rest.delete(i); loopsMade++; }
      else { for (const i of contourFrom(pool, startId)) if (rest.delete(i)) { unclosed++; openLeft.push(i); } if (rest.delete(startId)) { unclosed++; openLeft.push(startId); } }
    }
  });
  const fillable = doc.shapes.filter(sh => ids.has(sh.id) && (sh.closed || sh.type === 'circle')).length + loopsMade;   /* 塗れた形の数（0 なら、線の色だけ） */
  if (id && unclosed) { const brush = { kind: 'metal', id, style }, n = addSelectionRegionFills(brush, new Set(openLeft)); if (n) { if (fillable) $('hint').textContent = t('metalApplied', { n: fillable, name: t('metal.' + id) }) + ' ' + t('regionsPainted', { n, name: paintName(brush) }); return fillable + n; } }   /* 端と端で一周しなくても、まわりの線と合わせて囲まれた場所があれば塗る。閉じた円などと一緒に選んでも（事業主の指摘 2026-10-18「下の金具が塗りつぶせない」：ボタンの開いた円弧と内側の円） */
  $('hint').textContent = (id ? t('metalApplied', { n: ids.size, name: t('metal.' + id) }) : t('metalCleared', { n: ids.size })) + (unclosed ? ' ' + t('metalLineOnly', { n: unclosed }) : '');
  return fillable;
}
/* ---- 革の質感（テクスチャ）：継ぎ目なしの革写真を部品やピースに繰り返し貼る（カラーシミュレーション） ---- */
const TEXTURES = DATA_TEXTURES.textures, textureById = id => (id && TEXTURES.find(x => x.id === id)) || null, texImages = new Map();
/** 1枚の画像が実物で何 mm 四方か：文書の設定（数値）があれば全部それ、無ければ写真ごとの実寸（データの mm）、それも無ければ既定 */
function textureMm(id) { const v = Number(doc.textureMm); if (v > 0) return v; const x = id ? textureById(id) : null; return x && Number(x.mm) > 0 ? Number(x.mm) : DATA_TEXTURES.tileMm; }
/** 部品の板の色（3D）：質感が付いていれば写真の平均色、無ければ革色 */
const partPanelColor = p => (p.texture && textureById(p.texture)?.avg) || p.color || null;
/** 図形に貼る質感の id：図形自身の指定が優先、無ければ部品の指定 */
const textureOf = (s, d = doc) => s.texture || (d.parts || []).find(p => p.shapeIds.includes(s.id))?.texture || null;
/** 質感の画像。読み込み済みなら返し、初回は読み込みを始めて null（読み込めたら描き直す）。Image が無い環境（テスト）では null */
function texImage(id) {
  if (texImages.has(id)) { const img = texImages.get(id); return img && img.complete && img.naturalWidth ? img : null; }
  const x = textureById(id); if (!x || typeof Image === 'undefined') { texImages.set(id, null); return null; }
  const img = new Image(); img.onload = () => { draw(); if (view3d) render3d(); }; img.onerror = () => texImages.set(id, null); img.src = x.file; texImages.set(id, img); return null;
}
/** 画面の塗り：画像が読めていれば繰り返し模様（図面の mm に合わせて拡大縮小し、図面の原点に固定）、まだなら平均色 */
function textureFill(id) {
  const x = textureById(id), img = texImage(id), pat = img && typeof ctx.createPattern === 'function' ? ctx.createPattern(img, 'repeat') : null;
  if (pat && typeof DOMMatrix !== 'undefined' && typeof pat.setTransform === 'function') { const k = textureMm(id) / img.width; pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])); return pat; } /* ctx は mm に変換済み（draw()）なので、画像 1px＝k mm・図面の原点に固定 */
  return x ? x.avg : '#d9c7a0';
}
/** SVG 書き出し用：使っている質感の画像を埋め込む（読み込めていないものは平均色で塗られる） */
function svgTextures() {
  const used = new Set([...doc.parts.map(p => p.texture), ...doc.shapes.map(s => s.texture)].filter(Boolean)), out = {};
  for (const id of used) {
    const x = textureById(id); if (!x) continue; out[id] = { avg: x.avg, mm: textureMm(id) };
    const img = texImage(id); if (!img) continue;
    try { const c = document.createElement('canvas'); if (typeof c.getContext !== 'function') continue; c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); out[id].href = c.toDataURL('image/jpeg', 0.85); } catch { /* 画像を取り出せないときは平均色 */ }
  }
  return out;
}
function textureList() { const q = String($('textureSearch').value ?? '').toLowerCase(); return TEXTURES.filter(x => !q || (x.name + ' ' + (x.sub || '') + ' ' + (x.tags || []).join(' ') + ' ' + x.id).toLowerCase().includes(q)); }
/** 色カードの質感の一覧・見本と、柄カードの質感A／Bの一覧を作り直す */
function renderTextures() {
  const fillSel = (sel, list) => { const keep = sel.value; sel.textContent = ''; const none = document.createElement('option'); none.value = ''; none.textContent = t('textureNone'); sel.appendChild(none); for (const x of list) { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; sel.appendChild(o); } sel.value = list.some(x => x.id === keep) ? keep : ''; };
  fillSel($('textureSel'), textureList());
  for (const id of ['patchTexA', 'patchTexB']) fillSel($(id), TEXTURES);
  const cur = textureById($('textureSel').value), pv = $('texturePreview'); pv.style.background = cur ? `${cur.avg} url("${cur.file}") center / 48px` : 'transparent'; pv.title = cur ? cur.name + (cur.sub ? ' / ' + cur.sub : '') : '';
  $('textureMm').value = Number(doc.textureMm) > 0 ? String(doc.textureMm) : ''; /* 空欄＝写真ごとの実寸 */
}
/** 選んだ図形の部品に質感を付ける（id が空なら外して革色に戻す）。部品に入っていない閉じた図形には、図形自身に付ける */
function applyTexture(id) {
  const okIds = new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh)).map(sh => sh.id)), parts = doc.parts.filter(p => p.shapeIds.some(i => okIds.has(i)));
  const loose = doc.shapes.filter(sh => okIds.has(sh.id) && (sh.closed || sh.type === 'circle') && !doc.parts.some(p => p.shapeIds.includes(sh.id)));
  const inPart = new Set(doc.parts.flatMap(p => p.shapeIds)), open = doc.shapes.filter(sh => okIds.has(sh.id) && !sh.hw && !sh.holeLink && !inPart.has(sh.id) && !(sh.closed || sh.type === 'circle') && !['text', 'dimension', 'image', 'fold'].includes(sh.type));   /* 端と端が一周する線・囲まれた場所＝型紙（部品でなくてよい・事業主の指摘 2026-10-18「囲まれた矩形にホースバットが載せられない」） */
  if (!parts.length && !loose.length && !open.length) { $('hint').textContent = t('selectPartFirst'); return; }
  const x = id ? textureById(id) : null; if (id && !x) return;
  const loops = [], rest = new Set(open.map(sh => sh.id)), left = [];   /* 一周にできた線のまとまり・一周にできなかった線 */
  while (rest.size) { const pool = open.filter(sh => rest.has(sh.id)), startId = pool[0].id, poly = outlinePolygon(pool, startId); if (poly) { loops.push(poly.ids); for (const i of poly.ids) rest.delete(i); } else { for (const i of contourFrom(pool, startId)) if (rest.delete(i)) left.push(i); if (rest.delete(startId)) left.push(startId); } }
  const canDo = parts.length || loose.length || loops.length || (x ? left.length && enclosedAreasAround(regionShapes(), new Set(left)).length : open.some(sh => sh.texture) || (doc.fills || []).some(f => f.texture && f.ids.filter(i => okIds.has(i)).length * 2 >= f.ids.length));   /* 何も付けられない（囲めない線だけ）なら、今までの案内 */
  if (!canDo) { $('hint').textContent = t('selectPartFirst'); return; }
  const used = new Set(doc.shapes.map(sh => sh.leatherGroup).filter(Boolean)); let seq = 0; const nextGroup = () => { do seq++; while (used.has('lg' + seq)); used.add('lg' + seq); return 'lg' + seq; };
  commit(() => {
    for (const p of parts) p.texture = x ? x.id : null; for (const sh of loose) sh.texture = x ? x.id : null;
    for (const ids of loops) {
      const members = doc.shapes.filter(sh => ids.includes(sh.id)), gs = new Set(members.map(sh => sh.leatherGroup).filter(Boolean)), g0 = gs.size === 1 ? [...gs][0] : null;
      const gid = g0 && members.every(sh => sh.leatherGroup === g0) && doc.shapes.filter(sh => sh.leatherGroup === g0).length === members.length ? g0 : nextGroup();   /* 革色で作ったまとまりがあれば、同じものを使う */
      for (const sh of members) { if (x) { sh.leatherGroup = gid; sh.texture = x.id; } else { delete sh.texture; if (!sh.leather) delete sh.leatherGroup; } }
    }
    if (!x) {
      for (const i of left) { const sh = doc.shapes.find(q => q.id === i); if (sh) delete sh.texture; }
      doc.fills = (doc.fills || []).flatMap(f => { if (!f.texture || f.ids.filter(i => okIds.has(i)).length * 2 < f.ids.length) return [f]; if (f.leather) { const { texture, ...rest2 } = f; return [rest2]; } return []; });   /* 質感を外す：質感だけの領域は消え、革色もある領域は革色に戻る */
    }
  });
  const made = x && left.length ? addSelectionRegionFills({ kind: 'texture', id: x.id }, new Set(left)) : 0, n = parts.length + loose.length + loops.length + made;   /* 端と端で一周しなくても、まわりの線と合わせて囲まれた場所があれば付ける */
  $('hint').textContent = x ? t('textureApplied', { n, name: x.name }) : t('textureCleared', { n });
}
function applyThread() {
  const th = DATA_STITCH_COLORS.stitchColors.find(c => c.id === $('threadSel').value); if (!th) return;
  const okIds = new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh)).map(sh => sh.id)), paths = doc.paths.filter(p => p.shapeIds.some(id => okIds.has(id)) || doc.holes.some(h => h.pathId === p.id && selected.has(h.id))); if (!paths.length) { $('hint').textContent = t('selectPathFirst'); return; }
  commit(() => { for (const p of paths) { p.thread = th.id; p.threadHex = th.hex; } }); $('hint').textContent = t('threadApplied', { n: paths.length, name: th.label + ' ' + (th.jp || '') });
}
function savePattern() {
  const name = ($('patternName').value || '').trim(); if (!name) { $('hint').textContent = t('needName'); return; }
  commit(() => { doc.palettes = doc.palettes || []; doc.palettes.push({ id: freshId(doc.palettes, 'pal'), name, parts: Object.fromEntries(doc.parts.map(p => [p.id, p.color])), threads: Object.fromEntries(doc.paths.map(p => [p.id, p.thread ? { id: p.thread, hex: p.threadHex } : null])) }); });
  renderColors(); $('hint').textContent = t('patternSaved', { name });
}
function loadPattern() {
  const pal = (doc.palettes || []).find(p => p.id === $('patternSel').value); if (!pal) return;
  commit(() => { for (const p of doc.parts) if (pal.parts[p.id] !== undefined) p.color = pal.parts[p.id]; for (const p of doc.paths) { const th = pal.threads[p.id]; if (th) { p.thread = th.id; p.threadHex = th.hex; } else if (th === null) { delete p.thread; delete p.threadHex; } } });
  $('hint').textContent = t('patternLoaded', { name: pal.name });
}
function exportPng3d() {
  if (!regGuard('png', 'view3d')) return;
  if (!view3d || typeof canvas3d.toBlob !== 'function') { $('hint').textContent = t('need3d'); return; }
  render3d(); canvas3d.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'leather-3d.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); $('hint').textContent = t('exported', { name: 'PNG (3D)' }); }, 'image/png');
}
function initColors() {
  loadPins(); renderColors();
  $('threadSearch').addEventListener('input', renderColors); $('threadSel').addEventListener('change', renderColors);
  $('applyThread').onclick = applyThread; $('pinThread').onclick = () => { const id = $('threadSel').value; if (!id) return; colorPins = colorPins.includes(id) ? colorPins.filter(x => x !== id) : [...colorPins, id]; persistPins(); renderColors(); };
  $('metalClear').onclick = () => applyMetal(null);
  $('leatherHex').addEventListener('change', () => { const v = $('leatherHex').value; if (/^#[0-9a-fA-F]{6}$/.test(v)) applyLeather(v); });
  $('textureSearch').addEventListener('input', renderTextures); $('textureSel').addEventListener('change', renderTextures);
  $('applyTexture').onclick = () => applyTexture($('textureSel').value);
  $('textureMm').addEventListener('change', () => { /* 数値＝全部その大きさ・空欄＝写真ごとの実寸に戻す・数でなければ元の表示に戻す */
    const raw = String($('textureMm').value ?? '').trim(), v = Number(raw);
    if (raw !== '' && !(v > 0)) { $('textureMm').value = Number(doc.textureMm) > 0 ? String(doc.textureMm) : ''; return; }
    if (v > 0 ? doc.textureMm !== v : doc.textureMm !== undefined) commit(() => { if (v > 0) doc.textureMm = v; else delete doc.textureMm; });
  });
  $('savePattern').onclick = savePattern; $('loadPattern').onclick = loadPattern; $('exportPng3d').onclick = exportPng3d;
  $('exportSvgFill').onclick = () => { if (!regGuard('svg', 'color')) return; download('leather-pattern-color.svg', docToSvg(outputDoc(), { includeHoles: true, fill: true }), 'image/svg+xml', false); $('hint').textContent = t('exported', { name: 'SVG (color)' }); };
}

// ---- 下絵（スキャン画像）とトレース ----
const imageCache = new Map(); // imageId → HTMLImageElement または {width,height,data}
let tracePreviewShapes = [];
function imageElement(id) { const v = imageCache.get(id); return v && typeof v.width === 'number' && !v.data ? v : null; }
async function loadImageInto(id) {
  if (imageCache.has(id)) return imageCache.get(id);
  const dataUrl = await getImage(id); if (!dataUrl || typeof Image !== 'function') return null;
  return new Promise(resolve => { const img = new Image(); img.onload = () => { imageCache.set(id, img); resolve(img); draw(); }; img.onerror = () => resolve(null); img.src = dataUrl; });
}
/** 画像の ImageData 相当（トレース用）。キャッシュが生データならそのまま、画像要素なら Canvas で取り出す。 */
function imagePixels(id, maxPx = 1500) {
  const v = imageCache.get(id); if (!v) return null; if (v.data) return v;
  const c = document.createElement('canvas'); if (typeof c.getContext !== 'function') return null;
  const k = Math.min(1, maxPx / Math.max(v.width, v.height)); c.width = Math.max(1, Math.round(v.width * k)); c.height = Math.max(1, Math.round(v.height * k));
  const g = c.getContext('2d'); g.drawImage(v, 0, 0, c.width, c.height); return g.getImageData(0, 0, c.width, c.height);
}
function selectedImage() { return doc.shapes.find(s => s.type === 'image' && selected.has(s.id) && editable(s)) || null; }
async function importImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
  const small = await shrinkDataUrl(dataUrl, 3000), id = await putImage(small.dataUrl);
  const dpi = Number($('imgDpi').value) || 300, mmPerPx = scaleFromDpi(dpi), w = (small.width || 1000) * mmPerPx, h = (small.height || 1000) * mmPerPx;
  cancel(); commit(() => { if (!doc.layers.some(l => l.id === 'guide')) doc.layers.push({ id: 'guide', name: 'guide', visible: true, locked: false }); const sid = freshId(doc.shapes, 's'); doc.shapes.push({ id: sid, layer: 'guide', type: 'image', x: 0, y: 0, wMm: w, hMm: h, angleDeg: 0, opacity: Number($('imgOpacity').value) || 0.6, imageId: id }); selected = new Set([sid]); });
  await loadImageInto(id); renderLayers(); fit(); $('hint').textContent = t('imgImported', { w: w.toFixed(1), h: h.toFixed(1), dpi });
}
function imgScaleSecond(p) {
  const img = selectedImage(); if (!img || stage?.kind !== 'imgScale') return;
  const a = stage.a; stage = null; const mm = Number($('imgScaleMm').value); if (!(mm > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const dPx = distance(a, p); if (dPx < 1e-6) return; const k = mm / dPx;
  commit(() => { img.wMm *= k; img.hMm *= k; }); $('hint').textContent = t('imgScaled', { k: k.toFixed(4) }); draw();
}
function tracePreview() {
  const img = selectedImage(); if (!img) { $('hint').textContent = t('noImage'); return; }
  const px = imagePixels(img.imageId); if (!px) { $('hint').textContent = t('noImageData'); return; }
  const mmPerPx = img.wMm / px.width, raw = $('traceLevel').value, level = raw === '' ? null : Number(raw);
  const r = traceImage(px, { level, tolMm: Number($('traceTol').value) || 0.3, minAreaMm2: Number($('traceMinArea').value) || 4, mmPerPx, origin: { x: img.x, y: img.y }, invert: $('traceInvert').checked });
  tracePreviewShapes = r.polylines.map(s => ({ ...s, points: s.points.map(p => rotate(p, img.angleDeg, img)) }));
  $('hint').textContent = t('tracePreviewed', { n: tracePreviewShapes.length, level: r.level }); draw();
}
function traceApply() {
  if (!tracePreviewShapes.length) { $('hint').textContent = t('noTrace'); return; }
  const layer = doc.layers.find(l => l.id === 'pattern' && l.visible && !l.locked)?.id || activeLayer;
  cancel(); commit(() => { const ids = []; for (const s of tracePreviewShapes) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...s, id, layer }); ids.push(id); } selected = new Set(ids); });
  $('hint').textContent = t('traceApplied', { n: tracePreviewShapes.length }); tracePreviewShapes = []; draw();
}
function initImages() {
  $('imgImport').onclick = () => $('imgFile').click();
  $('imgFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await importImageFile(f).catch(err => { $('hint').textContent = t('loadFailed', { message: err.message }); }); });
  $('imgOpacity').addEventListener('change', () => { const img = selectedImage(); const v = Number($('imgOpacity').value); if (img && v >= 0 && v <= 1) commit(() => { img.opacity = v; }); });
  $('imgAngle').addEventListener('change', () => { const img = selectedImage(); const v = Number($('imgAngle').value); if (img && Number.isFinite(v)) commit(() => { img.angleDeg = v; }); });
  $('imgApplyDpi').onclick = () => { const img = selectedImage(); const dpi = Number($('imgDpi').value); const px = imageCache.get(img?.imageId); if (!img || !(dpi > 0) || !px) { $('hint').textContent = t('noImage'); return; } const k = scaleFromDpi(dpi); commit(() => { img.wMm = px.width * k; img.hMm = px.height * k; }); };
  $('imgScale2pt').onclick = () => { if (!selectedImage()) { $('hint').textContent = t('noImage'); return; } setMode('imgScale'); };
  $('imgLock').addEventListener('change', () => { const l = doc.layers.find(l => l.id === 'guide'); if (l) { commit(() => { l.locked = $('imgLock').checked; }); renderLayers(); } });
  $('imgRemove').onclick = () => { const img = selectedImage(); if (!img) return; const id = img.imageId; cancel(); commit(() => { doc.shapes = doc.shapes.filter(s => s.id !== img.id); selected.clear(); }); if (!doc.shapes.some(s => s.type === 'image' && s.imageId === id)) { imageCache.delete(id); deleteImage(id); } };
  $('tracePreview').onclick = tracePreview; $('traceApply').onclick = traceApply; $('traceClear').onclick = () => { tracePreviewShapes = []; draw(); };
}

// ---- レシピ → 自動設計 ----
function recipeFromForm() {
  const kind = $('recipeKind').value || 'passcase', r = defaultRecipe(kind), sp = Number(DATA_STYLE?.pitch?.[0]?.value); if (sp >= 3 && sp <= 5) r.pitch = Math.round(sp * 100) / 100;
  return { ...r, kind, cards: Number($('recipeCards').value) || r.cards, refill: $('recipeRefill').value || r.refill, ringD: Number($('recipeRingD').value) || r.ringD, spineOverride: Number($('recipeSpine').value) || 0, thickness: Number($('recipeThickness').value) || r.thickness, stitchStyle: $('recipeStyle').value === 'turned' ? 'turned' : 'edge', pitch: Number($('recipePitch').value) || r.pitch, paper: $('recipePaper').value === 'a3' ? 'a3' : 'a4', penHolder: !!$('recipePen').checked, binding: kind === 'notebook' ? 'ring' : 'sew' };
}
function generateRecipe() {
  const recipe = recipeFromForm(), built = buildDoc(recipe, { tools: loadTools(), nameOf: p => p.nameKey ? t(p.nameKey) : p.name });
  if (!built) { $('hint').textContent = t('recipeUnknown'); return; }
  newTab(t('recipeTab', { kind: t('kind.' + recipe.kind) }));
  cancel(); commit(() => { doc = built.doc; selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); tabs[activeTab].doc = doc; pairLines = []; renderLayers(); renderSeams(); fit();
  $('hint').textContent = t('recipeDone', { n: built.plan.parts.length, pages: built.layout.pages }) + (built.layout.overflow ? ' ' + t('recipeOverflow') : '');
  runCheck();
}
function runCheck() {
  const paper = doc.recipe?.paper || $('recipePaper').value || null, problems = check(doc, { paper });
  const list = $('checkList'); list.textContent = '';
  const head = document.createElement('option'); head.value = ''; head.textContent = problems.length ? t('checkCount', { n: problems.length }) : t('checkOk'); list.appendChild(head);
  for (const p of problems) { const o = document.createElement('option'); o.value = p.ids.join(','); o.textContent = t('check.' + p.type, { ids: p.ids.join(', ') }); list.appendChild(o); }
  list.value = '';
  $('hint').textContent = problems.length ? t('checkCount', { n: problems.length }) : t('checkOk');
  return problems;
}
function gotoCheck() {
  const ids = ($('checkList').value || '').split(',').filter(Boolean).map(id => id.replace(/^hw:/, '').replace(/#\d+$/, '')); if (!ids.length) return;
  selected = new Set(ids.filter(id => doc.shapes.some(s => s.id === id))); if (!selected.size) return;
  const b = bboxOfDoc({ shapes: doc.shapes.filter(s => selected.has(s.id)), holes: [] }); if (b) { scale = Math.max(0.5, Math.min(40, Math.min((width - 120) / Math.max(10, b.maxX - b.minX), (height - 120) / Math.max(10, b.maxY - b.minY)))); origin = { x: width / 2 - (b.minX + b.maxX) / 2 * scale, y: height / 2 - (b.minY + b.maxY) / 2 * scale }; }
  draw();
}
function initRecipe() {
  $('recipeGenerate').onclick = generateRecipe; $('recipeCheck').onclick = runCheck; $('checkList').addEventListener('change', gotoCheck);
  $('recipePrint').onclick = () => { $('outputCard').open = true; printPages(); };
  $('recipeKind').addEventListener('change', () => { const nb = $('recipeKind').value === 'notebook'; $('l-recipeRefill').hidden = !nb; $('l-recipeRingD').hidden = !nb; $('l-recipeSpine').hidden = !nb; $('l-recipePen').hidden = !nb; $('l-recipeCards').hidden = nb || $('recipeKind').value === 'coincase'; });
}

// ---- AI パネル（提案は「適用」を押すまで図面を変えない）----
let aiHistory = [], aiPending = null, aiBusy = false, aiHighlight = { ids: new Set(), until: 0 };
function aiSettings() { let s = { url: '', key: '', yenIn: 600, yenOut: 3000 }; try { s = { ...s, ...(JSON.parse(localStorage.getItem('leather-cad.ai')) || {}) }; } catch { /* 既定 */ } return s; }
function saveAiSettings() { const s = { url: $('aiUrl').value.trim(), key: $('aiKey').value, yenIn: Number($('aiYenIn').value) || 600, yenOut: Number($('aiYenOut').value) || 3000 };
  if (s.url && !/^https:\/\//.test(s.url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(s.url)) { $('aiStatus').textContent = t('aiHttpsOnly'); return; } /* 合言葉を平文で流さない */ try { localStorage.setItem('leather-cad.ai', JSON.stringify(s)); } catch { $('hint').textContent = t('storageUnavailable'); } $('aiStatus').textContent = s.url ? t('aiReady') : t('aiNeedSetup'); }
function loadAiHistory() { try { aiHistory = JSON.parse(localStorage.getItem('leather-cad.aiHistory')) || []; } catch { aiHistory = []; } if (!Array.isArray(aiHistory)) aiHistory = []; }
function persistAiHistory() { aiHistory = aiHistory.slice(-40); try { localStorage.setItem('leather-cad.aiHistory', JSON.stringify(aiHistory)); } catch { /* 省略 */ } }
function monthlyYen(add = 0) { const d = new Date(), key = 'leather-cad.aiYen.' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); let v = 0; try { v = Number(localStorage.getItem(key)) || 0; if (add) { v += add; localStorage.setItem(key, String(v)); } } catch { /* 省略 */ } return v; }
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Markdown の簡易整形（見出し・箇条書き・太字だけ）。先に HTML エスケープする。 */
function miniMarkdown(text) {
  return escapeHtml(text).split('\n').map(line => {
    const bold = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (/^#{1,3}\s/.test(bold)) return `<h4>${bold.replace(/^#{1,3}\s/, '')}</h4>`;
    if (/^\s*[-*]\s/.test(bold)) return `<li>${bold.replace(/^\s*[-*]\s/, '')}</li>`;
    return bold ? `<p>${bold}</p>` : '';
  }).join('');
}
function renderAi() {
  $('aiLog').innerHTML = aiHistory.map(m => `<div class="ai-${m.role}">${m.role === 'user' ? escapeHtml(m.content) : miniMarkdown(m.content)}${m.yen !== undefined ? `<small>¥${(m.yen).toFixed(1)}</small>` : ''}</div>`).join('');
  $('aiActions').hidden = !aiPending || !aiPending.ok.length; $('aiActionList').textContent = aiPending ? aiPending.ok.map(a => describeAction(a)).join('\n') + (aiPending.errors.length ? '\n' + t('aiRejected', { n: aiPending.errors.length }) : '') : '';
  $('aiMonthly').textContent = t('aiMonthly', { yen: monthlyYen().toFixed(0) });
}
function describeAction(a) {
  if (a.op === 'addShapes') return t('act.addShapes', { n: a.shapes.length, layer: a.layer });
  if (a.op === 'addHoles') return t('act.addHoles', { n: a.pathShapeIds.length, pitch: a.pitch });
  if (a.op === 'setThickness') return t('act.setThickness', { id: a.partId, t: a.thickness });
  if (a.op === 'highlight') return t('act.highlight', { n: a.shapeIds.length, note: a.note });
  return t('act.setRecipe');
}
function aiEstimate() { const s = aiSettings(), text = ($('aiInput').value || '') + ($('aiAttach').checked ? docToAiJson(doc, selected) + styleSummary(DATA_STYLE, 'ja') : ''); const tokens = roughTokens(text) + 1200; $('aiEstimate').textContent = t('aiEstimate', { yen: estimateYen(tokens, 800, { usdPerMtokIn: s.yenIn / 150, usdPerMtokOut: s.yenOut / 150 }).toFixed(1) }); }
async function aiSend(presetText = null) {
  const s = aiSettings(); if (!s.url) { $('aiStatus').textContent = t('aiNeedSetup'); return null; }
  const text = (presetText ?? $('aiInput').value).trim(); if (!text || aiBusy) return null;
  aiBusy = true; $('aiSend').disabled = true; $('aiStatus').textContent = t('aiSending');
  aiHistory.push({ role: 'user', content: text }); renderAi();
  try {
    const body = { messages: aiHistory.filter(m => m.role !== 'system').slice(-20).map(m => ({ role: m.role, content: m.content })), doc: $('aiAttach').checked ? docToAiJson(doc, selected) : null, style: $('aiAttach').checked ? styleSummary(DATA_STYLE, document.documentElement.lang === 'en' ? 'en' : 'ja') : null, lang: document.documentElement.lang === 'en' ? 'en' : 'ja', mode: 'chat' };
    if ($('aiAttachImage').checked) { const img = selectedImage(); const dataUrl = img ? await getImage(img.imageId) : null; if (dataUrl) { const small = await shrinkDataUrl(dataUrl, 1600); const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(small.dataUrl || ''); if (m && m[2].length <= 2_000_000) body.image = { media_type: m[1], data: m[2] }; else $('aiStatus').textContent = t('aiImageTooBig'); } }
    const res = await postChat(s.url, s.key, body);
    const checked = validateActions(res.actions || [], doc);
    aiHistory.push({ role: 'assistant', content: res.reply, yen: res.yen }); monthlyYen(res.yen || 0);
    aiPending = checked.ok.length || checked.errors.length ? checked : null;
    for (const a of checked.ok.filter(a => a.op === 'highlight')) { aiHighlight = { ids: new Set(a.shapeIds), until: Date.now() + 8000 }; }
    $('aiStatus').textContent = t('aiDone', { inTok: res.usage?.input_tokens ?? 0, outTok: res.usage?.output_tokens ?? 0, yen: (res.yen || 0).toFixed(1) });
    $('aiInput').value = ''; persistAiHistory(); renderAi(); draw(); return res;
  } catch (err) { aiHistory.push({ role: 'assistant', content: t('aiError', { message: err.message }) }); $('aiStatus').textContent = t('aiError', { message: err.message }); renderAi(); return null; }
  finally { aiBusy = false; $('aiSend').disabled = false; }
}
/** 承認された actions を図面に適用する（Undo 可）。 */
function applyAiActions() {
  if (!aiPending || !aiPending.ok.length) return; const actions = aiPending.ok; aiPending = null; cancel();
  commit(() => {
    const added = [];
    for (const a of actions) {
      if (a.op === 'addShapes') { for (const s of a.shapes) { const id = freshId(doc.shapes, 's'); const shape = { ...s, id, layer: a.layer }; if (shape.type === 'fold') { shape.partId = null; shape.inner = !!shape.inner; } doc.shapes.push(shape); if (!validateDoc(doc)) doc.shapes.pop(); else added.push(id); } }
      else if (a.op === 'addHoles') { const tool = doc.tools.find(t => t.id === a.toolId); const shapes = a.pathShapeIds.map(id => doc.shapes.find(s => s.id === id)).filter(s => s && stitchable(s)); const chain = chainShapes(shapes)[0]; if (!tool || !chain) continue; let saved = doc.paths.find(p => p.shapeIds.some(id => chain.shapeIds.includes(id))); if (!saved) { saved = { id: freshId(doc.paths, 'p'), shapeIds: chain.shapeIds, reversed: false, closed: chain.closed, segments: [], mark: 'tool' }; doc.paths.push(saved); } const route = resolvePath(doc, saved); if (!route) continue; doc.holes = doc.holes.filter(h => h.pathId !== saved.id); const pts = pointsAlongShape(route, a.pitch, { variable: a.variable }); placeHoles(saved, route, pts, { ...tool, pitch: a.pitch }); }
      else if (a.op === 'setThickness') { const part = doc.parts.find(p => p.id === a.partId); if (part) part.thickness = a.thickness; }
      else if (a.op === 'setRecipe') { doc.recipe = a.recipe; }
    }
    if (added.length) selected = new Set(added);
  });
  renderLayers(); renderAi(); $('hint').textContent = t('aiApplied');
}
function initAi() {
  const s = aiSettings(); $('aiUrl').value = s.url; $('aiKey').value = s.key; $('aiYenIn').value = String(s.yenIn); $('aiYenOut').value = String(s.yenOut); $('aiStatus').textContent = s.url ? t('aiReady') : t('aiNeedSetup');
  $('aiSaveSettings').onclick = saveAiSettings; $('aiSend').onclick = () => aiSend(); $('aiApply').onclick = applyAiActions; $('aiDiscard').onclick = () => { aiPending = null; renderAi(); };
  $('aiClear').onclick = () => { aiHistory = []; aiPending = null; persistAiHistory(); renderAi(); };
  $('aiInput').addEventListener('input', aiEstimate); $('aiAttach').addEventListener('change', aiEstimate);
  $('aiInput').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); aiSend(); } });
  for (const [id, key] of [['aiPresetCheck', 'preset.check'], ['aiPresetAllowance', 'preset.allowance'], ['aiPresetDraft', 'preset.draft'], ['aiPresetHow', 'preset.how'], ['aiPresetPhoto', 'preset.photo']]) $(id).onclick = () => { if (id === 'aiPresetPhoto') $('aiAttachImage').checked = true; aiSend(t(key, { mm: $('aiRefMm').value || '?' })); };
  loadAiHistory(); renderAi(); aiEstimate();
}

// ---- 部品ライブラリ・タブ・クリップボード ----
let userLibrary = [], tabs = [], activeTab = 0;
function loadLibrary() { try { const list = JSON.parse(localStorage.getItem('leather-cad.library')); if (Array.isArray(list)) userLibrary = list.filter(it => checkLibraryItem(it).length === 0); } catch { /* 保存不可は空のまま。 */ } }
function persistLibrary() { try { localStorage.setItem('leather-cad.library', JSON.stringify(userLibrary)); } catch { $('hint').textContent = t('storageUnavailable'); return; } snapshotLibrary(); }
/* 登録した部品の自動バックアップ：変更のたびに、ブラウザの中へ最新10件まで残す（直前と同じ内容なら足さない） */
const LIB_BACKUP_KEY = 'leather-cad.library.backups';
function loadLibBackups() { try { const l = JSON.parse(localStorage.getItem(LIB_BACKUP_KEY)); return Array.isArray(l) ? l.filter(b => b && Array.isArray(b.items)) : []; } catch { return []; } }
function saveLibBackups(list) { try { localStorage.setItem(LIB_BACKUP_KEY, JSON.stringify(list)); return true; } catch { return false; } }
function snapshotLibrary() { if (!userLibrary.length && !loadLibBackups().length) return; saveLibBackups(pushLibraryBackup(loadLibBackups(), userLibrary)); if (typeof renderLibBackups === 'function' && $('libBackupSel')) renderLibBackups(); }
function renderLibBackups() { const sel = $('libBackupSel'); sel.textContent = ''; for (const [i, b] of loadLibBackups().entries()) { const o = document.createElement('option'); o.value = String(i); o.textContent = libraryBackupLabel(b); sel.appendChild(o); } if (sel.options && sel.options.length) sel.value = '0'; }
let libRestoreArmed = 0;
function restoreLibBackup() { /* 2回押しで戻す（1回目は確認の案内）。戻す前に、いまの状態もバックアップに残す */
  const list = loadLibBackups(), b = list[Number($('libBackupSel').value)]; if (!b) { $('hint').textContent = t('libBackupNone'); return; }
  if (Date.now() - libRestoreArmed > 6000) { libRestoreArmed = Date.now(); $('hint').textContent = t('libRestoreConfirm', { label: libraryBackupLabel(b) }); return; }
  libRestoreArmed = 0; saveLibBackups(pushLibraryBackup(list, userLibrary)); userLibrary = b.items.filter(it => checkLibraryItem(it).length === 0); persistLibrary(); renderLibrary(); renderLibBackups(); $('hint').textContent = t('libRestored', { label: libraryBackupLabel(b), n: userLibrary.length });
}
function backupLibraryNow() { if (!userLibrary.length) { $('hint').textContent = t('libBackupEmpty'); return; } saveLibBackups(pushLibraryBackup(loadLibBackups(), userLibrary)); renderLibBackups(); $('hint').textContent = t('libBackedUp', { n: userLibrary.length }); }
function libraryItems() { return [...DATA_LIBRARY.items, ...userLibrary]; }
function libCurrent() { return libraryItems().find(i => i.id === $('libItem').value) || libraryItems()[0] || null; }
function renderLibrary() {
  const sel = $('libItem'), keep = sel.value, q = ($('libSearch').value || '').toLowerCase(); sel.textContent = '';
  for (const it of libraryItems().filter(it => !q || (it.name + ' ' + (it.name_en || '') + ' ' + (it.tags || []).join(' ')).toLowerCase().includes(q))) { const o = document.createElement('option'); o.value = it.id; o.textContent = (document.documentElement.lang === 'en' && it.name_en ? it.name_en : it.name) + (userLibrary.includes(it) ? ' *' : ''); sel.appendChild(o); }
  if (libraryItems().some(i => i.id === keep)) sel.value = keep;
  const it = libCurrent(), box = $('libVars'); box.textContent = ''; $('libDesc').textContent = it ? (it.desc || '') : '';
  if (it) for (const [k, v] of Object.entries(it.vars || {})) { const label = document.createElement('label'); const span = document.createElement('span'); span.textContent = k; const input = document.createElement('input'); input.type = 'number'; input.step = String(varStep(it, k)); if (it.varLimits?.[k]) { input.min = String(it.varLimits[k][0]); input.max = String(it.varLimits[k][1]); } /* 範囲のある変数は入力欄にも範囲を付ける */ input.value = String(v); input.dataset.var = k; label.appendChild(span); label.appendChild(input); box.appendChild(label); }
}
function libVars() { const out = {}; for (const el of ($('libVars').children || [])) { const input = el.querySelector ? el.querySelector('input') : null; if (input && input.dataset?.var) out[input.dataset.var] = Number(input.value); } return out; }
function placeLibrary(at) {
  const it = libCurrent(); if (!it) return;
  const bad = varOutOfRange(it, libVars()); if (bad.length) { $('hint').textContent = bad.map(b => t('varOutOfRange', { k: b.key, min: b.min, max: b.max })).join(' '); return; }
  let payload; try { payload = instantiateItem(it, libVars(), at, { scale: Number($('pasteScale').value) || 1 }); } catch (err) { $('hint').textContent = t('invalidNumber') + ' ' + err.message; return; }
  cancel(); let ids = [];
  commit(() => { ids = mergePayload(doc, { ...payload, layers: [] }, { freshId, source: 'library:' + it.id }); selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('libPlaced', { name: it.name, n: ids.length });
}
/** 登録した部品の id。同じ瞬間に2つ登録しても、既にある id と重ならないようにする。 */
function uniqueLibraryId() { let id = 'user-' + Date.now().toString(36); while (userLibrary.some(x => x.id === id)) id += 'x'; return id; }
function saveToLibrary(nameArg = null) {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  const name = (nameArg ?? ($('libName').value || '')).trim(); if (!name) { $('hint').textContent = t('needName'); return; }
  const payload = extractSelection(doc, ids), item = { id: uniqueLibraryId(), name, tags: ($('libTags').value || '').split(/[\s,]+/).filter(Boolean), desc: '', vars: {}, shapes: payload.shapes, holes: payload.holes, paths: payload.paths, parts: payload.parts, tools: payload.tools };
  userLibrary.push(item); persistLibrary(); renderLibrary(); $('libItem').value = item.id; renderLibrary(); $('hint').textContent = t('libSaved', { name });
}
function removeFromLibrary() { const it = libCurrent(); if (!it || !userLibrary.includes(it)) { $('hint').textContent = t('libBuiltin'); return; } userLibrary = userLibrary.filter(x => x !== it); persistLibrary(); renderLibrary(); }
function exportLibrary() { if (!userLibrary.length) { $('hint').textContent = t('libBackupEmpty'); return; } const d = new Date(), z = n => String(n).padStart(2, '0'); download(`nscad-parts-library-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.json`, libraryFileText(userLibrary), 'application/json'); $('hint').textContent = t('libSavedFile', { n: userLibrary.length }); }
async function importLibrary(file) { /* 同じ名前（id）の部品は更新、無いものは追加。読み込む前の状態もバックアップに残す */
  try { const r = parseLibraryFile(await file.text()); if (!r) throw new Error(t('libFileInvalid')); if (userLibrary.length) saveLibBackups(pushLibraryBackup(loadLibBackups(), userLibrary)); const m = mergeLibraryItems(userLibrary, r.items); userLibrary = m.items; persistLibrary(); renderLibrary(); renderLibBackups(); $('hint').textContent = t('libImported', { n: r.items.length, a: m.added, u: m.updated, s: r.skipped }); }
  catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); } }
/** 選択をクリップボード文字列にする（copy イベントで使う）。 */
/** 文字を入力する欄（テキスト入力・複数行・選択リスト・編集可能な要素）か。ここではブラウザ標準のコピー・貼り付けに任せる。 */
function isTextEntry(el) {
  if (!el) return false; if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'range', 'color', 'file', 'submit'].includes(el.type);
}
/** コピー／切り取り：図形を選んでいれば、フォーカスがボタンなどにあっても効く。文字入力欄・文字の範囲選択があるときはブラウザ標準に任せる。 */
function onClipCopy(e, cut) {
  if (isTextEntry(e.target) || isTextEntry(document.activeElement) || globalThis.getSelection?.()?.toString()) return;
  const text = clipboardText(); if (!text) return;
  e.clipboardData?.setData('text/plain', text); e.preventDefault();
  if (cut) removeSelected();
}
/** 全選択（Ctrl+A）：見えていて編集できる図形をすべて選ぶ。 */
function selectAllShapes() {
  setMode('select'); selected = new Set([...doc.shapes.filter(s => layerVisible(s) && editable(s)).map(s => s.id), ...doc.holes.filter(h => holeVisible(h) && holeEditable(h)).map(h => h.id)]); draw();   /* 見えていて編集できる菱目も選ぶ（事業主指摘 2026-10-17：全体を選んで動かすと菱目だけ取り残された） */
  $('hint').textContent = selected.size ? t('selectedAll', { n: selected.size }) : t('selectFirst');
}
function clipboardText() { const ids = selectedShapeIds(); if (!ids.size) return null; return encodeClipboard(extractSelection(doc, ids), tabs[activeTab]?.name || 'untitled'); }
function pasteText(text, at = null) {
  const data = decodeClipboard(text); if (!data) return false;
  /* 位置の指定が無いとき：貼り付ける図形全体の中心を、マウスの位置に置く。マウスの位置は磁石・スナップを効かせる（事業主指示 2026-10-17：中心に貼り付けられない・スナップが効いていない） */
  let target = at; if (!target) { const bb = bboxOfDoc({ shapes: data.payload.shapes || [], holes: [] }), k = Number($('pasteScale').value) || 1, p = snapped(cursor, false, anchor()); snap = null; target = { x: p.x - (bb ? (bb.minX + bb.maxX) / 2 : 0) * k, y: p.y - (bb ? (bb.minY + bb.maxY) / 2 : 0) * k }; }
  let ids = [];
  cancel(); commit(() => { ids = mergePayload(doc, data.payload, { at: target, scale: Number($('pasteScale').value) || 1, freshId, source: 'clip:' + data.source }); selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('pasted', { n: ids.length, from: data.source }); return true;
}
// タブ：文書ごとに undo/redo/選択を持つ
function snapshotTab() { if (tabs[activeTab]) Object.assign(tabs[activeTab], { doc, undo, redo, selected, activeLayer, scale, origin }); }
function renderTabs() {
  scheduleAutosave();
  const bar = $('tabBar'); bar.textContent = '';
  tabs.forEach((tab, i) => { const b = document.createElement('button'); b.textContent = tab.name + (tab.dirty ? ' •' : ''); b.classList.toggle('active', i === activeTab); b.onclick = () => switchTab(i); b.onauxclick = e => { if (e.button === 1) { e.preventDefault(); closeTabAt(i); } }; if (tab.fileHandle?.name) { const f = document.createElement('span'); f.className = 'tabFile'; f.textContent = tab.fileHandle.name; f.title = t('tabFileTip'); b.appendChild(f); } /* 上書き保存の行き先（保存先のファイル名）を小さく添える */ if (tabs.length > 1) { const x = document.createElement('span'); x.className = 'tabX'; x.textContent = '×'; x.title = t('tabClose'); x.onclick = e => { e.stopPropagation(); closeTabAt(i); }; b.appendChild(x); } bar.appendChild(b); });
  $('tabName').value = tabs[activeTab]?.name || '';
  const sel = $('tabTarget'); sel.textContent = ''; tabs.forEach((tab, i) => { if (i === activeTab) return; const o = document.createElement('option'); o.value = String(i); o.textContent = tab.name; sel.appendChild(o); });
}
function switchTab(i) {
  if (i === activeTab || !tabs[i]) return; openGapMarks = []; snapshotTab(); activeTab = i; const tab = tabs[i];
  doc = tab.doc; syncDimensions(new Map()); syncMarkLines(); undo = tab.undo; /* 寸法が覚えていない図形の点を覚える（復元・タブ切り替えの直後でも、次の編集から追従する） */ redo = tab.redo; selected = tab.selected || new Set(); activeLayer = tab.activeLayer || 'pattern'; if (tab.scale) { scale = tab.scale; origin = tab.origin; }
  cancel(); manualNext = null; nodeSel = null; pairLines = []; aiPending = null; aiHighlight = { ids: new Set(), until: 0 }; tracePreviewShapes = []; voicePending = null; voiceCandidates = []; renderVoiceCandidates(); renderAi(); refreshTools(); renderLayers(); renderSeams(); rebuildSnaps(); renderTabs(); draw();
}
function newTab(name = null) { snapshotTab(); const d = newDoc(); d.tools = loadTools(); tabs.push({ name: name || t('tabDefault', { n: tabs.length + 1 }), doc: d, undo: [], redo: [], selected: new Set(), activeLayer: 'pattern', dirty: false }); switchTab(tabs.length - 1); }
let closeArmed = 0, closeArmedTab = null;
function closeTab() { closeTabAt(activeTab); }
/** タブ i を閉じる（右上の×・中クリック・「図面タブを閉じる」ボタン共通）。未保存なら5秒以内にもう一度押すと閉じる。最後の1枚は閉じない。 */
function closeTabAt(i) { if (tabs.length < 2) { $('hint').textContent = t('lastTab'); return; } const tab = tabs[i]; if (!tab) return;
  if (tab.dirty && !(closeArmedTab === tab && Date.now() - closeArmed <= 5000)) { closeArmed = Date.now(); closeArmedTab = tab; $('hint').textContent = t('closeTabConfirm'); return; } // 埋め込みブラウザでは confirm が出ないので 2 段押し
  closeArmedTab = null; const cur = tabs[activeTab]; tabs.splice(i, 1);
  if (tab === cur) { const next = Math.min(i, tabs.length - 1); activeTab = -1; switchTab(next); } else { activeTab = tabs.indexOf(cur); renderTabs(); } }
/** 選択図形を別タブへコピー（move=true なら元を削除）。 */
function sendToTab(move) {
  const target = Number($('tabTarget').value); if (!tabs[target] || target === activeTab) { $('hint').textContent = t('needTab'); return; }
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  const payload = extractSelection(doc, ids), other = tabs[target].doc, before = JSON.stringify(other);
  const newIds = mergePayload(other, payload, { at: payload.origin, scale: 1, freshId, source: 'tab:' + tabs[activeTab].name });
  tabs[target].undo = tabs[target].undo || []; tabs[target].undo.push(before); tabs[target].dirty = true;
  if (move) removeSelected();
  renderTabs(); $('hint').textContent = t('sentToTab', { n: newIds.length, name: tabs[target].name });
}
function initLibrary() {
  loadLibrary(); renderLibrary(); renderLibBackups(); $('libBackupNow').onclick = backupLibraryNow; $('libBackupRestore').onclick = restoreLibBackup;
  $('libItem').addEventListener('change', renderLibrary); $('libSearch').addEventListener('input', renderLibrary);
  $('libPlace').onclick = () => setMode('library'); $('libSave').onclick = saveToLibrary; $('libRemove').onclick = removeFromLibrary; $('libExport').onclick = exportLibrary;
  $('libImport').onclick = () => $('libFile').click(); $('libFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await importLibrary(f); });
  $('tabNew').onclick = () => newTab(); $('tabClose').onclick = closeTab; $('tabName').addEventListener('change', () => { if (tabs[activeTab]) { tabs[activeTab].name = $('tabName').value.trim() || tabs[activeTab].name; renderTabs(); } });
  $('sendCopy').onclick = () => sendToTab(false); $('sendMove').onclick = () => sendToTab(true);
  $('pasteBtn').onclick = () => { const text = $('pasteBox').value; if (!pasteText(text)) $('hint').textContent = t('pasteInvalid'); };
  $('copyBtn').onclick = () => { const text = clipboardText(); if (!text) { $('hint').textContent = t('selectFirst'); return; } $('pasteBox').value = text; if (typeof document.execCommand === 'function') { try { $('pasteBox').select(); document.execCommand('copy'); } catch { /* 手動コピー */ } } $('hint').textContent = t('copied'); };
  document.addEventListener?.('copy', e => onClipCopy(e, false));
  document.addEventListener?.('cut', e => onClipCopy(e, true));
  document.addEventListener?.('paste', e => { if (isTextEntry(e.target) || isTextEntry(document.activeElement)) return; const text = e.clipboardData?.getData('text/plain'); if (text && pasteText(text)) e.preventDefault(); });
  tabs = [{ name: t('tabDefault', { n: 1 }), doc, undo, redo, selected, activeLayer, dirty: false }]; activeTab = 0; renderTabs();
}

// ---- 金具ライブラリ・バインダー金具 ----
const HW_CATEGORIES = ['fastener', 'link', 'closure', 'notebook'];   /* 「その他の金具」の分類。リングバインダーは専用のカード */
let hwPlaceKind = 'other';   /* 図面に置く金具：'binder'（リングバインダーのカード）か 'other'（その他の金具のカード） */
function hwItems() { return DATA_HARDWARE.items.filter(i => i.category === $('hwCategory').value); }
/** 選んだ規格（製品なら親の規格）の金具ライブラリ項目。製品は親の binder-<規格> を使う。 */
const binderItem = () => { const id = $('binderSpecSel').value, sp = binderSpec(id); return DATA_HARDWARE.items.find(i => i.id === 'binder-' + (sp?.parent || id)) || null; };
function hwCurrent() { return hwPlaceKind === 'binder' ? binderItem() : (DATA_HARDWARE.items.find(i => i.id === $('hwItem').value) || hwItems()[0] || null); }
const hwAngleValue = () => Number($(hwPlaceKind === 'binder' ? 'binderAngle' : 'hwAngle').value) || 0;
function binderSpec(id) { return BINDER_SPECS.find(s => s.id === id) || null; }
/** 規格の選択肢を入れる。製品（parent あり）は親の規格の下にまとめて出す（規格 → 製品の2段）。親の行は規格そのもの。 */
function fillBinderSpecOptions(sel) {
  const nameOf = s => document.documentElement.lang === 'en' ? s.names.en : s.names.ja, opt = (s, into) => { const o = document.createElement('option'); o.value = s.id; o.textContent = nameOf(s); into.appendChild(o); };
  for (const s of BINDER_SPECS.filter(s => !s.parent)) { const kids = BINDER_SPECS.filter(k => k.parent === s.id); if (!kids.length) { opt(s, sel); continue; } const g = document.createElement('optgroup'); g.label = nameOf(s); opt(s, g); for (const k of kids) opt(k, g); sel.appendChild(g); }
}
function renderHardware() {
  const cat = $('hwCategory'); if (!cat.textContent) { for (const c of HW_CATEGORIES) { const o = document.createElement('option'); o.value = c; o.textContent = t('hwcat.' + c); cat.appendChild(o); } }
  const items = hwItems(), sel = $('hwItem'), keep = sel.value; sel.textContent = '';
  for (const it of items) { const o = document.createElement('option'); o.value = it.id; o.textContent = document.documentElement.lang === 'en' ? it.name_en : it.name_ja; sel.appendChild(o); }
  sel.value = items.some(i => i.id === keep) ? keep : (items[0]?.id || '');
  const it = hwCurrent(), box = $('hwParams'); box.textContent = '';
  if (it) for (const [k, v] of Object.entries(it.params)) { if (typeof v !== 'number') continue; const label = document.createElement('label'); const span = document.createElement('span'); span.textContent = k; const input = document.createElement('input'); input.type = 'number'; input.step = '0.1'; input.value = String(v); input.dataset.param = k; label.appendChild(span); label.appendChild(input); box.appendChild(label); }
  $('hwConfidence').textContent = it ? (it.confidence === 'spec' ? t('hwSpec') : t('hwEstimated')) : '';
  const bs = $('binderSpecSel'); if (!bs.textContent) fillBinderSpecOptions(bs);
  renderBinder();
}
function fillRingOptions(rd, spec) {
  rd.textContent = '';
  for (const d of spec.rings.diameterOptionsMm) { const o = document.createElement('option'); o.value = String(d); const size = ringSizeOf(spec, d); o.textContent = t('ringSizeLabel', { inner: size.inner, outer: ringOuterLabel(size) }); rd.appendChild(o); }
}
/** 三つ折りの設計カードの規格・リング径の選択欄を、金具カードの欄（正本）と同じ中身・同じ選択にそろえる。 */
function syncFoldRingSelects() {
  const sp = $('fdRingSpec'), dia = $('fdRingDia'); if (!sp || !dia) return;
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0]; if (!spec) return;
  sp.textContent = ''; fillBinderSpecOptions(sp); sp.value = $('binderSpecSel').value; fillRingOptions(dia, spec); dia.value = $('ringD').value;
}
/** 規格・リング径が変わったとき（金具カードでも三つ折りの設計カードでも）。リングを描いているときは断面も作り直す。 */
function onBinderChange() { renderBinder(); resetSpineWire(); renderSpineSim(); renderTopSection(); if ($('fdRingOn')?.checked === true) liveFoldDesign(); }
function renderBinder() {
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0]; if (!spec) return;
  const rd = $('ringD'), keep = Number(rd.value); fillRingOptions(rd, spec);
  const ringD = spec.rings.diameterOptionsMm.includes(keep) ? keep : spec.rings.diameterOptionsMm[0]; rd.value = String(ringD);
  const leather = Number($('partThickness').value) || 1.5;
  $('binderInfo').textContent = t('binderInfo', { n: spec.holes.count, pitch: spec.holes.pitchMm.join(' / '), span: spec.holes.span1toLastMm, w: spec.refill.wMm, h: spec.refill.hMm, spine: spineWidth(ringD, binderBase(spec).thicknessMm, leather).toFixed(1) });
  syncFoldRingSelects();
}
function spineParams() { const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0], base = binderBase(spec), ringD = Number($('ringD').value) || 20; return { ringD: ringSizeOf(spec, ringD).inner, wireD: wireOf(spec, ringD) /* 線径はリングの諸元なので金具データの値だけを使う（画面では直さない・2026-10-12 事業主指摘） */, plateT: base.thicknessMm ?? 2, baseH: base.crownHeightMm ?? 2, bossDia: base.supporterDiameterMm ?? 0 /* ビス穴金具部の直径・高さは金具のデータの値だけを使う（リングサポータ厚とは無関係・2026-10-13 事業主指示） */, bossT: base.supporterThicknessMm ?? SUPPORTER_T_MM, holeDia: spec.mounts?.overrides?.[0]?.diameterMm ?? spec.mounts?.pattern?.diameterMm ?? 0, sectionPoints: (() => { try { return base.sectionPoints ? binderSection(base) : null; } catch { return null; } })() /* 台座の断面のデータがあれば、断面図で実測の形とサポータの帯を描く */, embedMm: spec.rings.options?.find(o => o.innerDiameterMm === ringD)?.embedDepthMm ?? 0, leatherT: Number($('spLeather').value) || 1.5, supporterT: SUPPORTER_T_MM /* リングサポータ厚は固定 2.4mm（つねに 2.3〜2.5mm・入力欄は廃止・2026-10-13 事業主指示） */, liningT: Number($('spLining').value) || 0, playMm: Number($('spPlay').value) || 0, foldR: Number($('spFoldR').value) || 0, spineShape: $('spShape').value === 'round' ? 'round' : 'square' }; }
/** 閉じた手帳の3面図の入力値（背幅の入力に、束の厚み・表紙の長さ・規格のリフィル寸法・台座・リング位置を足す）。 */
function topParams() {
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0], p = spineParams(), base = binderBase(spec), cw = Number($('spCoverW').value), hp = spec?.holes?.pitchMm || [], span = spec?.holes?.span1toLastMm || 0, H = (spec?.refill?.hMm ?? 210) + 6;
  let y = H / 2 - span / 2; const ringPos = hp.length ? [y, ...hp.map(d => (y += d))] : undefined;
  return { ...p, stackT: $('spStack').value === '' ? 6 : Number($('spStack').value), refillW: spec?.refill?.wMm ?? 110, refillH: spec?.refill?.hMm ?? 210, plateW: base.sectionWidthMm ?? 24, plateL: base.lengthMm ?? 170, ringPos, coverW: cw > 0 ? cw : undefined };
}
function renderTopSection() {
  const p = topParams(), res = closedBinderViews(p); if (!res) { $('spTopInfo').textContent = t('invalidNumber'); $('spTopSvg').innerHTML = ''; return null; }
  $('spTopInfo').textContent = t('spTopInfo', { t: res.thickness, c: res.coverW }) + (res.ringFits ? '' : ' ' + t('spTopTight', { s: p.stackT, r: $('ringD').value })) + (res.holeD > 0 ? ' ' + t('spTopHole', { d: res.holeD, e: res.holeEdge }) : ''); $('spTopSvg').innerHTML = closedBinderViewsSvg(res); return res;
}
function drawTopSection() {
  const res = renderTopSection(); if (!res) return;
  const xs = res.shapes.flatMap(s => s.type === 'circle' ? [s.cx - s.r, s.cx + s.r] : s.points ? s.points.map(q => q.x) : [s.x1, s.x2]), ys = res.shapes.flatMap(s => s.type === 'circle' ? [s.cy - s.r, s.cy + s.r] : s.points ? s.points.map(q => q.y) : [s.y1, s.y2]);
  const c = world({ x: width / 2, y: height / 2 }), dx = c.x - (Math.min(...xs) + Math.max(...xs)) / 2, dy = c.y - (Math.min(...ys) + Math.max(...ys)) / 2, layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id;
  if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const mv = q => ({ x: +(q.x + dx).toFixed(4), y: +(q.y + dy).toFixed(4) }), ids = [];
  commit(() => { for (const s of res.shapes) { const id = freshId(doc.shapes, 's'), { role, hidden, ...r } = s; ids.push(id);
    const o = r.type === 'circle' ? { ...r, cx: +(r.cx + dx).toFixed(4), cy: +(r.cy + dy).toFixed(4) } : r.type === 'line' || r.type === 'dimension' ? { ...r, x1: +(r.x1 + dx).toFixed(4), y1: +(r.y1 + dy).toFixed(4), x2: +(r.x2 + dx).toFixed(4), y2: +(r.y2 + dy).toFixed(4) } : { ...r, points: r.points.map(mv) };
    doc.shapes.push({ id, layer, ...o, ...(hidden ? { lineStyle: 'dashed' } : {}) }); } selected = new Set(ids); });
  $('hint').textContent = t('spTopDrawn');
}
// 表の行は文字列で作り、画面を使わずに表示内容を確かめられるようにする。
function ringOuterLabel(size) { return t('ringOuterLabel', { outer: +size.outer.toFixed(2) }) + (size.wireSource === 'assumed' ? t('ringAssumed') : ''); }
function spCompareRows(rows, ringD) { const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0]; return rows.map(r => `<tr data-ring-d="${r.ringD}"${r.ringD === ringD ? ' aria-current="true"' : ''}><td>${r.ringD.toFixed(2)}</td><td>${r.outerD.toFixed(2)}${ringSizeOf(spec, r.ringD).wireSource === 'assumed' ? t('ringAssumed') : ''}</td>${[r.spineW, r.thickness, r.openWidth].map(v => `<td>${v.toFixed(2)}</td>`).join('')}<td>${t('spCompareDelta', { spine: r.deltaSpine.toFixed(2), open: r.deltaOpen.toFixed(2) })}</td></tr>`).join(''); }
function spCompareTable(rows, ringD) { return `<thead><tr>${['spCompareRing', 'spCompareOuter', 'spCompareSpine', 'spCompareThickness', 'spCompareOpen', 'spCompareDifference'].map(key => `<th scope="col">${t(key)}</th>`).join('')}</tr></thead><tbody>${spCompareRows(rows, ringD)}</tbody>`; }
function renderSpCompare() { const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0], p = topParams(); $('spCompare').innerHTML = spCompareTable(binderRingCompare(spec, p), p.ringD); }
function renderSpineSim() { renderSpCompare(); const p = spineParams(), r = spineSim(p); if (!r) { $('spResult').textContent = t('invalidNumber'); return null; } $('spFoldR').disabled = r.shape === 'round'; if (r.shape === 'round') $('spFoldR').value = String(r.foldR); /* 丸背：曲げ内半径は内幅の半分で自動 */ $('spResult').textContent = t('spineResult', { ring: r.outerRingD, inner: r.innerW, fold: r.foldEach, spine: r.spineW, top: r.ringTop }); $('spSection').innerHTML = spineSectionSvg(r, { label: `${p.ringD}mm` }); return r; }
/** 背幅シミュレーションの線径の表示：金具データの値（計算で補った線径なら「（仮）」）。入力欄ではない。 */
function resetSpineWire() { const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0], ringD = Number($('ringD').value) || 20, size = ringSizeOf(spec, ringD), text = t('spWireVal', { w: Math.round(size.wire * 100) / 100, assumed: size.wireSource === 'measured' ? '' : t('spWireAssumed') }); const el = $('spWire'); el.value = text; el.textContent = text; }
function initSpineSim() { resetSpineWire(); $('spCalib').onclick = () => { const m = Number($('spMeasured').value); const play = spinePlayFromMeasured(m, spineParams()); if (play === null) { $('hint').textContent = t('invalidNumber'); return; } $('spPlay').value = String(play); renderSpineSim(); $('hint').textContent = t('spineCalibrated', { play }); }; $('spApply').onclick = () => { const r = renderSpineSim(); if (!r) return; $('recipeSpine').value = String(r.spineW); $('recipeKind').value = 'notebook'; $('recipeRingD').value = $('ringD').value; $('recipeThickness').value = $('spLeather').value; $('recipeCard').open = true; $('hint').textContent = t('spineApplied', { spine: r.spineW }); }; renderSpineSim(); for (const id of ['spStack', 'spCoverW', 'spWire', 'spLeather', 'spLining', 'spPlay', 'spFoldR', 'spShape']) $(id).addEventListener('change', () => { renderSpineSim(); renderTopSection(); }); $('spTopDraw').onclick = drawTopSection; renderTopSection(); }
function hwParams() { const out = {}; for (const input of ($('hwParams').children || [])) { const el = input.querySelector ? input.querySelector('input') : null; if (el && el.dataset?.param) out[el.dataset.param] = Number(el.value); } return out; }
/** 金具を点に配置：外形は目印レイヤー（hw メタ付き）、取り付け穴は「金具穴」レイヤー。バインダーはリング中心に十字の目印も置く。 */
/** 金具1個ぶんの図形（外形・取り付け穴・リング中心の印）の下書き（id なし）を作る。外形の先頭に hw（金具の情報）を持たせる。 */
function hardwareDrafts(it, overrides, spec, at, angleDeg) {
  spec = binderSpecWithSection(spec, overrides);
  const fp = placeFootprint(hardwareFootprint(it, overrides, spec), at, angleDeg), marks = 'hardware' /* 置いた金具は外形線も穴も「金具」の層（穴は hwHole 付き） */, out = [];
  fp.outline.forEach((s, i) => out.push({ ...s, layer: marks, ...(i === 0 ? { hw: { id: it.id, params: { ...it.params, ...overrides }, at, angleDeg, solid: fp.solid.kind === 'binder' ? { kind: 'box', w: fp.solid.w, h: fp.solid.h, z: fp.solid.z } : fp.solid } } : {}) }));
  for (const s of fp.holes) out.push({ ...s, layer: 'hardware', hwHole: true });
  return out;
}
/** 下書きを文書に加える（新しい id を付け、1つのグループにする）。加えた図形の id の配列を返す。 */
function addHardwareDrafts(drafts, groupId) {
  ensureLayer(doc, 'hardware');
  const ids = []; for (const d of drafts) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...d, id, groupId }); ids.push(id); }
  return ids;
}
/** 頂点の入力欄は行数や選択が変わったときだけ作り直し、入力中の値と移動先の欄を保つ。 */
let vertexLayoutKey = '', vertexValueKey = '';
function vertexShape() {
  const s = infoShape(); return s && ['polyline', 'path'].includes(s.type) && selectedShapeIds().size <= 1 ? s : null;
}
function refreshVertexCard() {
  const s = vertexShape(); $('vertexCard').hidden = !s;
  if (!s) { vertexLayoutKey = vertexValueKey = ''; return; }
  const points = s.type === 'polyline' ? s.points : s.nodes, count = Math.min(40, points.length), layout = JSON.stringify([s.id, s.type, count]);
  if (layout !== vertexLayoutKey) {
    $('vertexRows').innerHTML = points.slice(0, count).map((p, i) => `<div class="row"><span>${i + 1}</span>${['x', 'y'].map(axis => `<label><span>${axis.toUpperCase()}</span><input id="vertex-${i}-${axis}" type="number" step="any" aria-label="${i + 1} ${axis.toUpperCase()} (mm)"></label>`).join('')}</div>`).join('');
    for (let i = 0; i < count; i++) for (const axis of ['x', 'y']) $(`vertex-${i}-${axis}`).addEventListener('change', () => applyVertex(s.id, i, axis));
    vertexLayoutKey = layout; vertexValueKey = '';
  }
  const key = JSON.stringify([layout, points.slice(0, count), editable(s)]);
  if (key !== vertexValueKey) for (let i = 0; i < count; i++) for (const axis of ['x', 'y']) {
    const input = $(`vertex-${i}-${axis}`); input.value = String(points[i][axis]); input.disabled = !editable(s);
  }
  vertexValueKey = key; $('vertexNote').hidden = points.length <= 40; $('vertexNote').textContent = t('vertexMore');
}
function applyVertex(id, index, axis) {
  const s = vertexShape(); if (!s || s.id !== id) { refreshVertexCard(); return; }
  const points = s.type === 'polyline' ? s.points : s.nodes, input = $(`vertex-${index}-${axis}`), next = editVertex(s, index, axis, input.value);
  if (!editable(s) || !next || !validateDoc({ ...doc, shapes: doc.shapes.map(x => x.id === id ? next : x) })) { input.value = String(points[index][axis]); return; }
  if (Number(input.value) === points[index][axis]) { input.value = String(points[index][axis]); return; }
  transformSelectedTo(next);
}
/** 「選んだ図形を動かす」カード：何か選んでいるときだけ出す。右へ・下へ（mm・マイナスで左・上）を入れて動かす。 */
function refreshArrayCard() { $('arrayCard').hidden = !selectedShapeIds().size; }
function applyArray() {
  const raw = ['arrayNx', 'arrayNy', 'arrayDx', 'arrayDy'].map(id => $(id).value.trim()); let offsets;
  try { if (raw.some(v => !v)) throw new RangeError(); offsets = arrayOffsets(...raw.map(Number)); }
  catch { $('hint').textContent = t('arrayInvalid'); return; }
  if (!offsets.length || !selectedShapeIds().size) return;
  copySelectedOffsets(offsets); $('hint').textContent = t('arrayDone');
}
$('arrayApply').onclick = applyArray;
function refreshMoveCard() { $('moveCard').hidden = !selectedShapeIds().size; }
function applyMove() {
  const dx = Number($('moveDx').value), dy = Number($('moveDy').value);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) { $('hint').textContent = t('invalidNumber'); return; }
  if (!selectedShapeIds().size || (dx === 0 && dy === 0)) return;
  transformSelected(s => translate(s, dx, dy)); $('hint').textContent = t('moved', { x: dx, y: dy });
}
$('moveApply').onclick = applyMove;
/** 金具を本体の線に着ける（事業主の希望 2026-10-18「金具をしっかり本体にくっつけたいが、隙間ができる」）：金具を選んで「線に着ける」→ 本体の線をクリックすると、金具の線に近い辺が線にぴったり着くよう、金具全体を動かす。「向きも合わせる」なら、辺が線と平行になるよう回してから。計算は geometry.js の attachToLine。 */
function attachStart() {
  if (!selectedShapeIds().size) { $('hint').textContent = t('attachNeedSelect'); return; }
  setMode('attach'); $('hint').textContent = t('attachStart');
}
function attachClick(p) {
  const ids = selectedShapeIds(); if (!ids.size) { setMode('select'); $('hint').textContent = t('attachNeedSelect'); return; }
  let target = null; for (const s of doc.shapes) { if (ids.has(s.id) || s.holeLink || !visible(s) || ['text', 'dimension', 'image', 'fold'].includes(s.type)) continue; const d = distToShape(s, p); if (d <= 12 / scale && (!target || d < target.d)) target = { s, d }; }   /* 着ける線：金具以外で、クリックにいちばん近い線（ロックしたレイヤーの線でもよい） */
  const line = target && nearestSegmentOf(target.s, p); if (!line) { $('hint').textContent = t('attachNoLine'); return; }
  const pts = doc.shapes.filter(s => ids.has(s.id) && !s.holeLink && visible(s) && !['text', 'dimension', 'image', 'fold'].includes(s.type)).flatMap(s => flattenShape(s, 0.05));
  const r = attachToLine(pts, line, { rotate: $('attachRotate').checked }); if (!r) { $('hint').textContent = t('attachNoLine'); return; }
  if (Math.abs(r.gap) < 0.005 && !r.angleDeg) { setMode('select'); $('hint').textContent = t('attachAlready'); return; }
  const fmt = v => (+v).toFixed(2); transformSelected(s => translate(r.angleDeg ? rotate(s, r.angleDeg, r.pivot) : s, r.dx, r.dy));
  setMode('select'); $('hint').textContent = r.angleDeg ? t('attachDoneRot', { gap: fmt(Math.abs(r.gap)), angle: fmt(Math.abs(r.angleDeg)) }) : t('attachDone', { gap: fmt(Math.abs(r.gap)) });
}
$('attachStart').onclick = attachStart; $('fillsClear').onclick = clearFills; $('metalStyle').onchange = changeMetalStyle;
/** グループ・縫い経路でつながる選択図形を、整列で一緒に動かすまとまりにする。 */
function selectedAlignUnits() {
  const ids = selectedShapeIds(), shapes = doc.shapes.filter(s => ids.has(s.id)), parent = new Map(shapes.map(s => [s.id, s.id]));
  const root = id => { while (parent.get(id) !== id) id = parent.get(id); return id; };
  const join = list => { const members = list.filter(id => ids.has(id)); if (members.length) for (const id of members) parent.set(root(id), root(members[0])); };
  const groups = new Map(); for (const s of shapes) { const g = groupIdOf(s); if (g) { if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s.id); } }
  for (const members of groups.values()) join(members); for (const p of doc.paths) join(p.shapeIds);
  const units = new Map();
  for (const s of shapes) { const key = root(s.id); if (!units.has(key)) units.set(key, { ids: [], box: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity } }); const u = units.get(key), b = bboxOf(s); u.ids.push(s.id); for (const k of ['minX', 'minY']) u.box[k] = Math.min(u.box[k], b[k]); for (const k of ['maxX', 'maxY']) u.box[k] = Math.max(u.box[k], b[k]); }
  return [...units.values()];
}
function refreshAlignCard() { const n = selectedAlignUnits().length; $('alignCard').hidden = n < 2; $('distributeX').disabled = $('distributeY').disabled = n < 3; }
function applyAlign(kind) {
  const units = selectedAlignUnits(); if (units.length < 2) return;
  applyAlignOffsets(units, alignOffsets(units.map(u => u.box), kind), 'aligned');
}
function applyDistribute(axis) {
  const units = selectedAlignUnits(); if (units.length < 3) return;
  applyAlignOffsets(units, distributeOffsets(units.map(u => u.box), axis), 'distributed');
}
function applyAlignOffsets(units, offsets, message) {
  if (!offsets.some(o => o.dx || o.dy)) return;
  const byShape = new Map(); units.forEach((u, i) => u.ids.forEach(id => byShape.set(id, offsets[i])));
  const byPath = new Map(doc.paths.map(p => [p.id, byShape.get(p.shapeIds[0])]));
  transformSelected((s, path) => { const o = path ? byPath.get(path.id) : s.pathId ? byPath.get(s.pathId) : byShape.get(s.id); return o ? translate(s, o.dx, o.dy) : s; });
  $('hint').textContent = t(message);
}
$('distributeX').onclick = () => applyDistribute('x'); $('distributeY').onclick = () => applyDistribute('y');
for (const kind of ['left', 'centerX', 'right', 'top', 'centerY', 'bottom']) $('align' + kind[0].toUpperCase() + kind.slice(1)).onclick = () => applyAlign(kind);
/** 「選んだ図形を拡大縮小」カード：何か選んでいるときだけ出す。基準点を動かさずに、横・縦の倍率（%）で伸縮する。 */
function selectionBox() {
  const ids = selectedShapeIds(), list = doc.shapes.filter(s => ids.has(s.id)).map(bboxOf); if (!list.length) return null;
  return { minX: Math.min(...list.map(b => b.minX)), minY: Math.min(...list.map(b => b.minY)), maxX: Math.max(...list.map(b => b.maxX)), maxY: Math.max(...list.map(b => b.maxY)) };
}
let scaleCardKey = '', scaleBadInputs = new Set();
function refreshScaleCard(reset = false) {
  const b = selectionBox(); $('scaleCard').hidden = !b; if (!b) { scaleCardKey = ''; scaleBadInputs.clear(); return; }
  const w = b.maxX - b.minX, h = b.maxY - b.minY, key = JSON.stringify([[...selectedShapeIds()].sort(), w, h]);
  $('scaleSize').textContent = t('scaleNow', { w: w.toFixed(2), h: h.toFixed(2) });
  $('scaleW').disabled = w === 0; $('scaleH').disabled = h === 0;
  if (reset || key !== scaleCardKey) { $('scaleX').value = $('scaleY').value = '100'; $('scaleW').value = w.toFixed(2); $('scaleH').value = h.toFixed(2); scaleBadInputs.clear(); }
  scaleCardKey = key;
}
/** 入れた方向をもとに寸法と倍率をそろえる。大きさ0の方向の寸法入力は無視する。 */
function syncScaleInput(id) {
  const b = selectionBox(); if (!b) return;
  const horizontal = id === 'scaleX' || id === 'scaleW', isSize = id === 'scaleW' || id === 'scaleH', w = b.maxX - b.minX, h = b.maxY - b.minY, current = horizontal ? w : h;
  if (isSize && current === 0) return;
  const value = scaleInput($(id).value, current, isSize), other = value && scaleInput(value.percent, horizontal ? h : w);
  if (!value || ($('scaleKeep').checked && !other)) { scaleBadInputs.add(id); $('hint').textContent = t('scaleInvalid'); return; }
  const percentId = horizontal ? 'scaleX' : 'scaleY', sizeId = horizontal ? 'scaleW' : 'scaleH';
  $(percentId).value = String(value.percent); if (!isSize) $(sizeId).value = value.size.toFixed(2);
  scaleBadInputs.delete(percentId); scaleBadInputs.delete(sizeId);
  if ($('scaleKeep').checked) {
    const otherPercent = horizontal ? 'scaleY' : 'scaleX', otherSize = horizontal ? 'scaleH' : 'scaleW';
    $(otherPercent).value = String(value.percent); $(otherSize).value = other.size.toFixed(2); scaleBadInputs.delete(otherPercent); scaleBadInputs.delete(otherSize);
  }
}
function applyScale() {
  const b = selectionBox(), px = Number($('scaleX').value), py = Number($('scaleY').value);
  if (!b) return; if (scaleBadInputs.size || !(px > 0) || !(py > 0) || !Number.isFinite(px) || !Number.isFinite(py) || $('scaleX').value === '' || $('scaleY').value === '') { $('hint').textContent = t('scaleInvalid'); return; }
  const sx = px / 100, sy = py / 100; if (sx === 1 && sy === 1) return;
  const a = $('scaleAnchor').value, o = { x: /Right$/.test(a) ? b.maxX : /Left$/.test(a) ? b.minX : (b.minX + b.maxX) / 2, y: /^bottom/.test(a) ? b.maxY : /^top/.test(a) ? b.minY : (b.minY + b.maxY) / 2 };
  const ids = selectedShapeIds(), curved = Math.abs(sx - sy) > 1e-12 && doc.shapes.some(s => ids.has(s.id) && (s.type === 'circle' || s.type === 'arc'));
  const all = quadAllSelected();
  transformSelected(s => scaleGeometry(s, sx, sy, o));
  if (all) quadFollowScale(sx, sy, o);
  $('scaleX').value = $('scaleY').value = '100'; $('hint').textContent = t(curved ? 'scaleToPoly' : 'scaled', { x: px, y: py }); refreshScaleCard(true);
}
$('scaleApply').onclick = applyScale; $('dupMerge').onclick = mergeOverlaps;
for (const id of ['scaleX', 'scaleY', 'scaleW', 'scaleH']) $(id).addEventListener('input', () => syncScaleInput(id));
/** 金具の編集カード：金具（外形に hw を持つ図形のグループ）を全体まで選んでいるときだけ出す。規格・リング径・角度を変えて「作り直す」と、位置はそのままで金具を作り直す。 */
let hwEditKey = '', hwEditArmed = 0;
function selectedHardware() {
  const plate = doc.shapes.find(s => selected.has(s.id) && s.hw?.id); if (!plate) return null;
  const g = groupIdOf(plate), members = g ? doc.shapes.filter(s => groupIdOf(s) === g) : [plate];
  return members.every(m => selected.has(m.id)) ? { plate, members } : null;
}
const hwIsBinder = plate => String(plate.hw.id).startsWith('binder-') && !!plate.hw.params?.spec;
function refreshHwEdit() {
  const hw = selectedHardware(), section = selectedBinderSection(); $('hwEditCard').hidden = !hw && !section; $('hwEditMain').hidden = !hw; $('hwSectionRow').hidden = !(section || (hw && hwIsBinder(hw.plate))); if (!hw) { hwEditKey = ''; return; }
  const key = hw.members.map(m => m.id).join(',') + '|' + JSON.stringify(hw.plate.hw.params) + '|' + JSON.stringify(hw.plate.points?.[0]); if (key === hwEditKey) return; hwEditKey = key; hwEditArmed = 0;
  const isBinder = hwIsBinder(hw.plate); $('l-hwSpec').hidden = $('l-hwRing').hidden = $('hwViewsRow').hidden = !isBinder;
  if (isBinder) {
    const sel = $('hwEditSpec'); if (!sel.options?.length) fillBinderSpecOptions(sel);
    sel.value = hw.plate.hw.params.spec; $('hwEditRing').value = String(hw.plate.hw.params.ringD ?? binderSpec(hw.plate.hw.params.spec)?.rings.diameterOptionsMm[0] ?? ''); refreshHwEditOuter();
  }
  $('hwEditAngle').value = String(+hwPoseOfOutline(hw.plate).angleDeg.toFixed(2)); $('hwEditNote').textContent = t('hwEditNote');
}
function refreshHwEditOuter() { const spec = binderSpec($('hwEditSpec').value), inner = Number($('hwEditRing').value); $('hwEditOuter').textContent = spec && Number.isFinite(inner) && inner > 0 ? ringOuterLabel(ringSizeOf(spec, inner)) : ''; }
$('hwEditRing').oninput = refreshHwEditOuter;
$('hwEditSpec').onchange = refreshHwEditOuter;
function applyHwEdit() {
  const hw = selectedHardware(); if (!hw) return;
  const old = hw.plate.hw, isBinder = hwIsBinder(hw.plate), pose = hwPoseOfOutline(hw.plate);
  const specId = isBinder ? $('hwEditSpec').value : null, ringD = isBinder ? Number($('hwEditRing').value) : undefined, angle = Number($('hwEditAngle').value);
  if (!Number.isFinite(angle) || (isBinder && !(ringD > 0))) { $('hint').textContent = t('invalidNumber'); return; }
  const it = DATA_HARDWARE.items.find(i => i.id === (isBinder ? 'binder-' + (binderSpec(specId)?.parent || specId) : old.id)), oldItem = DATA_HARDWARE.items.find(i => i.id === old.id); if (!it || !oldItem) { $('hint').textContent = t('invalidNumber'); return; }
  const strip = ({ hw: _h, id: _i, layer: _l, groupId: _g, ...rest }) => rest; let same = true;   /* 手で直したかの判定：今の設定で作り直した形と比べる */
  try { same = sameShapes(hardwareDrafts(oldItem, isBinder ? { ...old.params, ringD: old.params.ringD } : old.params, isBinder ? binderSpec(old.params.spec) : null, pose.at, pose.angleDeg).map(strip), hw.members.map(strip)); } catch { same = false; }
  if (!same && Date.now() - hwEditArmed > 6000) { hwEditArmed = Date.now(); $('hint').textContent = t('hwEditWarn'); return; }  /* 埋め込みブラウザでは confirm が出ないので 2 段押し */
  hwEditArmed = 0;
  let drafts; try { drafts = hardwareDrafts(it, isBinder ? { ...old.params, spec: specId, ringD } : old.params, isBinder ? binderSpec(specId) : null, pose.at, angle); } catch (err) { $('hint').textContent = t('invalidNumber') + ' ' + err.message; return; }
  const gid = groupIdOf(hw.plate) || nextGroupId(doc.shapes), gone = new Set(hw.members.map(m => m.id));
  cancel(); commit(() => { doc.shapes = doc.shapes.filter(s => !gone.has(s.id)); selected = new Set(addHardwareDrafts(drafts, gid)); });
  hwEditKey = ''; refreshHwEdit(); renderLayers(); $('hint').textContent = t('hwEdited'); draw();
}
$('hwEditApply').onclick = applyHwEdit;
/** 「上と右の図を作る」：正面の紙に置いた金具から、上の紙・右の紙（枠方式なら上の枠・右の枠）に金具の図を置く。前に作った図（hwFor が同じ）は消してから置き直す。金具を動かしたあとは、もう一度押して置き直す。 */
function makeBinderViews() {
  const hw = selectedHardware(); if (!hw || !hwIsBinder(hw.plate)) { $('hint').textContent = t('hwViewsNeedBinder'); return; }
  const frame = threeViewOn(), quad = quadOn() && sheetRole() === 'front'; if (!frame && !quad) { $('hint').textContent = t('hwViewsNeedMode'); return; }
  const pose = hwPoseOfOutline(hw.plate), p = hw.plate.hw.params, spec = binderSpecWithSection(binderSpec(p.spec), p), ringD = Number(p.ringD) || spec.rings.diameterOptionsMm[0], gid = groupIdOf(hw.plate) || hw.plate.id;
  const sheets = quadSheets(), cleanShapes = d => d ? d.shapes.filter(s => visibleData(s) && s.type !== 'image' && !s.hwFor && !s.hwSection) : [];
  if (quad && !(sheets.top && sheets.side)) { $('hint').textContent = t('hwViewsNeedMode'); return; }
  const solid = quad ? threeViewSolidFromSheets(cleanShapes(sheetDoc('front')), cleanShapes(sheetDoc('top')), cleanShapes(sheetDoc('side'))) : threeViewSolid(cleanShapes(doc), threeViewLayout);
  const views = binderViewShapes(spec, ringD, pose.at, pose.angleDeg, (solid ? solid.depth : 30) / 2);
  if (!views) { $('hint').textContent = t('hwViewsAngle'); return; }
  const bottomOfTop = threeViewLayout.top.y + threeViewLayout.top.h, leftOfSide = threeViewLayout.side.x;
  const toTop = quad ? (x, d) => ({ x, y: -d }) : (x, d) => ({ x, y: bottomOfTop - d }), toSide = quad ? (d, y) => ({ x: d, y }) : (d, y) => ({ x: leftOfSide + d, y });
  const conv = (s, f) => { const { role, ...rest } = s; return s.type === 'circle' ? { ...rest, role, ...(({ x, y }) => ({ cx: x, cy: y }))(f(s.cx, s.cy)) } : { ...rest, role, points: s.points.map(q => f(q.x, q.y)) }; };
  const put = (td, lists) => {   /* 前に作った図（hwFor が同じ）を全部消してから、図ごとに1つのグループとして置く */
    const gone = new Set(td.shapes.filter(s => s.hwFor === gid).map(s => s.id)); td.shapes = td.shapes.filter(s => !gone.has(s.id));
    const layer = ensureLayer(td, 'hardware');
    for (const shapes of lists) { const group = nextGroupId(td.shapes); for (const s of shapes) td.shapes.push({ ...s, id: freshId(td.shapes, 's'), layer, hwFor: gid, groupId: group }); }
  };
  const topShapes = views.top.map(s => conv(s, toTop)), sideShapes = views.side.map(s => conv(s, toSide));
  if (frame) commit(() => put(doc, [topShapes, sideShapes]));
  else for (const [role, shapes] of [['top', topShapes], ['side', sideShapes]]) { const tb = sheets[role], before = JSON.stringify(tb.doc); put(tb.doc, [shapes]); pushTabUndo(tb, before); }
  renderTabs(); draw(); $('hint').textContent = t('hwViewsDone', { n: topShapes.length + sideShapes.length });
}
$('hwViewsApply').onclick = makeBinderViews;
/** 断面の図を選んだときは、同じ組の紙から元の金具を探す。 */
function selectedBinderSection() {
  const shape = doc.shapes.find(s => selected.has(s.id) && s.type === 'polyline' && s.hwSection); if (!shape) return null;
  const docs = [doc, ...Object.values(quadSheets()).map(tb => tb.doc)];
  for (const owner of docs) { const plate = owner.shapes.find(s => s.hw && hwIsBinder(s) && (groupIdOf(s) || s.id) === shape.hwSection); if (plate) return { plate, owner, shape }; }
  return null;
}
function binderSectionContext() {
  const section = selectedBinderSection(); if (section) return section;
  const hw = selectedHardware(); if (!hw || !hwIsBinder(hw.plate)) return null;
  const gid = groupIdOf(hw.plate) || hw.plate.id, target = quadOn() ? quadSheets().side?.doc : doc;
  return { plate: hw.plate, owner: doc, shape: target?.shapes.find(s => s.hwSection === gid && s.type === 'polyline') };
}
function changeSectionDoc(target, fn) {
  if (target === doc) commit(fn);
  else { const tb = tabs.find(tb => tb.doc === target); if (!tb) return; const before = JSON.stringify(target); fn(); pushTabUndo(tb, before); rebuildSnaps(); if (view3d) render3d(); scheduleAutosave(); renderTabs(); draw(); }
}
function makeBinderSection() {
  const c = binderSectionContext(); if (!c) return;
  const gid = groupIdOf(c.plate) || c.plate.id, pose = hwPoseOfOutline(c.plate), spec = binderSpecWithSection(binderSpec(c.plate.hw.params.spec), c.plate.hw.params), points = binderSection(binderBase(spec));
  const target = quadOn() ? quadSheets().side?.doc : doc; if (!target) return;
  // 横軸は台座の幅、縦軸は高さ。右の投影図の奥行き軸とは分けて置く。
  const at = { x: pose.at.y + (threeViewOn() ? threeViewLayout.side.x - threeViewLayout.front.y : 0), y: pose.at.y };
  changeSectionDoc(target, () => { target.shapes = target.shapes.filter(s => s.hwSection !== gid); target.shapes.push({ id: freshId(target.shapes, 's'), type: 'polyline', closed: true, layer: ensureLayer(target, 'hardware'), hwSection: gid, points: points.map(p => ({ x: at.x + p.x, y: at.y + p.y })) }); });
  $('hint').textContent = t('hwSectionMade');
}
function applyBinderSection() {
  const c = binderSectionContext(); if (!c?.shape) { $('hint').textContent = t('hwSectionMissing'); return; }
  let points; try { points = normalizeSectionPoints(c.shape.points); } catch { $('hint').textContent = t('hwSectionInvalid'); return; }
  changeSectionDoc(c.owner, () => { c.plate.hw.params.sectionPoints = points; });
  hwEditKey = ''; refreshHwEdit(); $('hint').textContent = t('hwSectionApplied');
}
async function copyBinderSection() {
  const c = binderSectionContext(); if (!c) return;
  const spec = binderSpecWithSection(binderSpec(c.plate.hw.params.spec), c.plate.hw.params), text = sectionPointsText(binderSection(binderBase(spec)));
  try { const clipboard = globalThis.navigator?.clipboard; if (!clipboard?.writeText) throw new Error(); await clipboard.writeText(text); $('hint').textContent = t('hwSectionCopied'); } catch { $('hint').textContent = text; }
}
$('hwSectionMake').onclick = makeBinderSection; $('hwSectionApply').onclick = applyBinderSection; $('hwSectionCopy').onclick = copyBinderSection;

function placeHardware(at) {
  const it = hwCurrent(); if (!it) return;
  /* 製品を選んでいれば製品の寸法で置き、置いた金具にも製品の ID を残す（項目は親の規格のもの） */
  const isBinder = it.footprint2d.kind === 'binder', sel = isBinder ? binderSpec($('binderSpecSel').value) : null, spec = isBinder ? (sel && (sel.parent || sel.id) === it.params.spec ? sel : binderSpec(it.params.spec)) : null;
  const overrides = isBinder ? { ringD: Number($('ringD').value) || undefined, ...(spec && spec.id !== it.params.spec ? { spec: spec.id } : {}) } : hwParams();
  let drafts; try { drafts = hardwareDrafts(it, overrides, spec, at, hwAngleValue()); } catch (err) { $('hint').textContent = t('invalidNumber') + ' ' + err.message; return; }
  cancel();
  commit(() => { selected = new Set(addHardwareDrafts(drafts, nextGroupId(doc.shapes))); }); /* 置いた金具は自動で1つのグループ（クリックで全体・ダブルクリックで中の1つ） */
  renderLayers(); const en = document.documentElement.lang === 'en'; $('hint').textContent = t('hwPlaced', { name: spec && spec.id !== it.params.spec ? (en ? spec.names.en : spec.names.ja) : (en ? it.name_en : it.name_ja) });   /* 製品を置いたら製品名で案内（事業主決定A・2026-10-12） */
}
/** 「寸法データ」：規格・製品の寸法を読める表にする（JSON は出さない）。確かさは 実測／規格表／推定／未入力 の言葉で。製品なら親の規格を示す。 */
function binderDataHtml(spec, ringD) {
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const en = document.documentElement.lang === 'en', nameOf = s => en ? s.names.en : s.names.ja, mm = v => v == null || Number.isNaN(Number(v)) ? t('bdNone') : String(Math.round(Number(v) * 100) / 100);
  const conf = c => t(c === 'measured' ? 'confMeasured' : c === 'spec' ? 'confSpec' : c === 'estimated' ? 'confEstimated' : 'confNone');
  const base = binderBase(spec), size = ringSizeOf(spec, ringD || spec.rings.diameterOptionsMm[0]), option = spec.rings.options?.find(o => Math.round(ringSizeOf(spec, o).inner * 10) / 10 === Math.round(size.inner * 10) / 10);
  const parent = spec.parent ? binderSpec(spec.parent) : null, rows = [];
  if (parent) rows.push([t('bdKind'), t('bdProductOf', { parent: nameOf(parent) })]);
  rows.push([t('bdRefill'), `${mm(spec.refill?.wMm)} × ${mm(spec.refill?.hMm)} mm`]);
  rows.push([t('bdHoles'), t('bdHolesVal', { n: spec.holes.count, pitch: spec.holes.pitchMm.map(mm).join(' / '), span: mm(spec.holes.span1toLastMm) })]);
  rows.push([t('bdRing'), t('bdRingVal', { i: mm(size.inner), o: mm(size.outer), w: mm(size.wire), assumed: size.wireSource === 'measured' ? '' : t('bdAssumed') })]);
  rows.push([t('bdRingOptions'), spec.rings.diameterOptionsMm.map(mm).join(' / ') + ' mm']);
  let b = t('bdBaseVal', { L: mm(base.lengthMm), W: mm(base.sectionWidthMm), T: mm(base.thicknessMm), R: mm(base.cornerRMm) });
  if (spec.base) b += '　' + t('bdBaseSection', { H: mm(base.crownHeightMm), cr: mm(base.crownRadiusMm), er: mm(base.edgeRadiusMm) });
  rows.push([t('bdBase'), b]);
  const rivets = spec.rivets || []; rows.push([t('bdMounts'), rivets.length ? t('bdMountsVal', { n: rivets.length, list: rivets.map(r => t('bdMountOne', { x: mm(r.xMm), y: mm(r.yMm), d: mm(r.dMm) })).join('、') }) : t('bdNone')]);
  const m = spec.mechanism || {}, parts = m.parts || []; rows.push([t('bdMech'), t('bdMechVal', { c: mm(m.heightClosedMm), o: mm(m.heightOpenMm), n: parts.length })]);
  rows.push([t('bdConf'), t('bdConfVal', { base: conf(base.confidence ?? spec.plate?.confidence), ring: conf(option?.confidence ?? (size.wireSource === 'measured' ? 'measured' : null)), mount: conf(spec.mounts?.confidence), mech: conf(m.confidence) })]);
  const src = [spec.sourceNote, ...(spec.sources || []).map(x => x.note)].filter(Boolean); rows.push([t('bdSource'), src.length ? src.join('　') : t('bdNone')]);
  return `<table class="bd-table">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table><p class="bd-note">${esc(t('bdNote'))}</p><button id="bdCopy" type="button">${esc(t('bdCopy'))}</button>`;
}
function showBinderData(spec) {
  const ringD = Number($('ringD').value) || spec.rings.diameterOptionsMm[0];
  showSvgDialog(binderDataHtml(spec, ringD), t('bdTitle', { name: document.documentElement.lang === 'en' ? spec.names.en : spec.names.ja }));
  const btn = $('svgBody').querySelector?.('#bdCopy');
  if (btn) btn.onclick = () => { const text = [...$('svgBody').querySelectorAll('tr')].map(r => r.children[0].textContent + '：' + r.children[1].textContent).join('\n'); const clipboard = globalThis.navigator?.clipboard; clipboard?.writeText?.(text)?.then?.(() => { btn.textContent = t('bdCopied'); }); }; /* copyBinderSection と同じ呼び方（Mac 検査の決まり） */
}
/** 「寸法を直す」：この PC のブラウザに保存し、すぐ金具データへ重ねる。公開データに入れるときは「CSV に書き出す」で渡す。 */
function loadBinderEdits() { try { const e = parseEdits(localStorage.getItem(BINDER_EDITS_KEY) || ''); if (e) binderEdits = e; } catch { /* 保存が使えない環境でも動かす */ } rebuildBinderSpecs(); }
function rebuildBinderSpecs() { BINDER_SPECS.splice(0, BINDER_SPECS.length, ...applyBinderEdits(BINDER_ORIGINALS, binderEdits)); }
function persistBinderEdits() { try { localStorage.setItem(BINDER_EDITS_KEY, serializeEdits(binderEdits)); return true; } catch { $('hint').textContent = t('storageUnavailable'); return false; } }
const BDE_CONF = ['measured', 'spec', 'estimated'];
const bdeConfOptions = () => ['', ...BDE_CONF].map(c => `<option value="${c}">${c ? t('conf' + c[0].toUpperCase() + c.slice(1)) : t('confNone')}</option>`).join('');
const bdeConfSelect = id => `<select id="${id}">${bdeConfOptions()}</select>`;
const bdeField = (id, label, step = '0.1') => `<label><span>${label}</span><input id="${id}" type="number" step="${step}"></label>`;
const bdeSet = (id, v) => { const el = $(id); el.value = v == null ? '' : String(v); };
let bdeRingCount = 0, bdeMountCount = 0, bdeSpecId = null;
const bdeRingRow = i => `<div class="row" id="bdeRing${i}Row">${bdeField('bdeRing' + i + 'Inner', t('bdeInner'))}${bdeField('bdeRing' + i + 'Outer', t('bdeOuter'))}${bdeField('bdeRing' + i + 'Wire', t('bdeWire'))}${bdeField('bdeRing' + i + 'Embed', t('bdeEmbed'))}<label><span>${t('bdeConf')}</span>${bdeConfSelect('bdeRing' + i + 'Conf')}</label><button type="button" id="bdeRing${i}Del">${t('bdeRemove')}</button></div>`;
const bdeMountRow = i => `<div class="row" id="bdeMount${i}Row">${bdeField('bdeMount' + i + 'X', 'x')}${bdeField('bdeMount' + i + 'Y', 'y')}${bdeField('bdeMount' + i + 'D', t('bdeDia'))}<button type="button" id="bdeMount${i}Del">${t('bdeRemove')}</button></div>`;
function bdeWireRing(i, o = {}) { bdeSet('bdeRing' + i + 'Inner', o.innerDiameterMm); bdeSet('bdeRing' + i + 'Outer', o.outerDiameterMm); bdeSet('bdeRing' + i + 'Wire', o.wireDiameterMm); bdeSet('bdeRing' + i + 'Embed', o.embedDepthMm); bdeSet('bdeRing' + i + 'Conf', o.confidence || ''); $('bdeRing' + i + 'Del').onclick = () => { bdeSet('bdeRing' + i + 'Inner', ''); bdeSet('bdeRing' + i + 'Outer', ''); $('bdeRing' + i + 'Row').hidden = true; }; }
function bdeWireMount(i, r = {}) { bdeSet('bdeMount' + i + 'X', r.xMm); bdeSet('bdeMount' + i + 'Y', r.yMm); bdeSet('bdeMount' + i + 'D', r.dMm); $('bdeMount' + i + 'Del').onclick = () => { bdeSet('bdeMount' + i + 'X', ''); bdeSet('bdeMount' + i + 'Y', ''); bdeSet('bdeMount' + i + 'D', ''); $('bdeMount' + i + 'Row').hidden = true; }; }
function openBinderEdit() {
  const spec = binderSpec($('binderSpecSel').value); if (!spec) return; bdeSpecId = spec.id;
  const base = binderBase(spec), opts = spec.rings.options?.length ? spec.rings.options : spec.rings.diameterOptionsMm.map(d => ({ innerDiameterMm: d })), rivets = spec.rivets || [], nameOf = x => document.documentElement.lang === 'en' ? x.names.en : x.names.ja;
  bdeRingCount = opts.length; bdeMountCount = rivets.length;
  $('bdEditTitle').textContent = t('bdeTitle', { name: nameOf(spec) }) + (spec.edited ? ' ' + t('bdeEdited') : '');
  $('bdeAsNewLabel').textContent = t('bdeNewProduct', { parent: nameOf(spec.parent ? binderSpec(spec.parent) || spec : spec) });
  $('bdePlateConf').innerHTML = bdeConfOptions(); $('bdeRingRows').innerHTML = opts.map((o, i) => bdeRingRow(i)).join(''); $('bdeMountRows').innerHTML = rivets.map((r, i) => bdeMountRow(i)).join('');
  $('bdeAsNew').checked = false; bdeSet('bdeNameJa', spec.names.ja); bdeSet('bdeNameEn', spec.names.en);
  bdeSet('bdePlateL', base.lengthMm); bdeSet('bdePlateW', base.sectionWidthMm); bdeSet('bdePlateT', base.thicknessMm); bdeSet('bdePlateR', base.cornerRMm ?? 0); bdeSet('bdePlateConf', base.confidence ?? spec.plate?.confidence ?? '');
  opts.forEach((o, i) => bdeWireRing(i, o)); rivets.forEach((r, i) => bdeWireMount(i, r));
  $('bdEditDialog').showModal();
}
function readBinderEditForm() {
  const spec = binderSpec(bdeSpecId), rings = [], rivets = [];
  for (let i = 0; i < bdeRingCount; i++) { if ($('bdeRing' + i + 'Row').hidden) continue; rings.push({ innerDiameterMm: $('bdeRing' + i + 'Inner').value, outerDiameterMm: $('bdeRing' + i + 'Outer').value, wireDiameterMm: $('bdeRing' + i + 'Wire').value, embedDepthMm: $('bdeRing' + i + 'Embed').value, confidence: $('bdeRing' + i + 'Conf').value }); }
  for (let i = 0; i < bdeMountCount; i++) { if ($('bdeMount' + i + 'Row').hidden) continue; rivets.push({ xMm: $('bdeMount' + i + 'X').value, yMm: $('bdeMount' + i + 'Y').value, dMm: $('bdeMount' + i + 'D').value }); }
  const asNew = !!$('bdeAsNew').checked;
  return { parent: asNew ? (spec.parent || spec.id) : undefined, names: { ja: $('bdeNameJa').value, en: $('bdeNameEn').value }, plate: { lengthMm: $('bdePlateL').value, widthMm: $('bdePlateW').value, thicknessMm: $('bdePlateT').value, cornerRMm: $('bdePlateR').value, confidence: $('bdePlateConf').value }, rings, rivets };
}
function refreshBinderSelects(id) {
  for (const sid of ['binderSpecSel', 'hwEditSpec']) { const sel = $(sid); sel.textContent = ''; fillBinderSpecOptions(sel); }
  $('binderSpecSel').value = id; renderBinder(); resetSpineWire(); renderSpineSim(); renderTopSection();
}
function saveBinderEdit() {
  let edit; try { edit = editFromForm(readBinderEditForm()); } catch (err) { $('hint').textContent = t('bde.' + err.message); return; }
  const spec = binderSpec(bdeSpecId); let id = bdeSpecId;
  if (edit.parent) id = newProductId(BINDER_SPECS, edit.parent); else if (spec.parent) edit.parent = spec.parent;   /* この PC で作った製品を上書きするときも親を残す */
  binderEdits.specs[id] = edit; if (!persistBinderEdits()) return;
  rebuildBinderSpecs(); refreshBinderSelects(id); $('bdEditDialog').close(); $('hint').textContent = t('bdeSaved');
}
function resetBinderEdit() {
  delete binderEdits.specs[bdeSpecId]; if (!persistBinderEdits()) return;
  rebuildBinderSpecs(); refreshBinderSelects(binderSpec(bdeSpecId) ? bdeSpecId : BINDER_SPECS[0].id); $('bdEditDialog').close(); $('hint').textContent = t('bdeResetDone');
}
function exportBinderEditsCsv() {
  const files = editsToCsv(BINDER_SPECS, binderEdits); if (!files) { $('hint').textContent = t('bdeCsvNone'); return; }
  for (const [name, text] of Object.entries(files)) download(name, text, 'text/csv'); $('hint').textContent = t('bdeCsvDone');
}
/** 定型句：名前付きの文（複数行）をこの PC のブラウザに保存し、クリックした位置に 1 行ずつ文字図形として置く。 */
let phrases = [];
function loadPhrases() { try { phrases = parsePhrases(localStorage.getItem(PHRASES_KEY) || ''); } catch { phrases = []; } renderPhraseList(); }
function persistPhrases() { try { localStorage.setItem(PHRASES_KEY, serializePhrases(phrases)); return true; } catch { $('hint').textContent = t('storageUnavailable'); return false; } }
function renderPhraseList(selectName) {
  const sel = $('phraseSel'), keep = selectName ?? sel.value; sel.textContent = '';
  for (const p of phrases) { const o = document.createElement('option'); o.value = p.name; o.textContent = p.name; sel.appendChild(o); }
  sel.value = phrases.some(p => p.name === keep) ? keep : (phrases[0]?.name || '');
  const cur = phrases.find(p => p.name === sel.value); if (cur) { $('phraseName').value = cur.name; $('phraseText').value = cur.text; }
}
function savePhrase() {
  let r; try { r = upsertPhrase(phrases, $('phraseName').value, $('phraseText').value); } catch { $('hint').textContent = t('phraseEmpty'); return; }
  phrases = r.items; if (!persistPhrases()) return; renderPhraseList(r.name); $('hint').textContent = t('phraseSaved', { name: r.name });
}
function deletePhrase() { const name = $('phraseSel').value; if (!name) return; phrases = removePhrase(phrases, name); if (!persistPhrases()) return; $('phraseName').value = ''; $('phraseText').value = ''; renderPhraseList(''); $('hint').textContent = t('phraseDeleted', { name }); }
function placePhrase(at) {
  const lines = phraseLines($('phraseText').value); if (!lines.some(Boolean)) { $('hint').textContent = t('phraseEmpty'); return; }
  const layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id;
  if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const shapes = phraseShapes(lines, at, Number($('phraseSize').value) || 4, layer);
  cancel(); commit(() => { const ids = []; for (const sh of shapes) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, ...sh }); ids.push(id); } selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('phrasePlaced', { n: shapes.length });
}
/** 書き出し：phrases.json（別の PC へ持っていく・控え）。読み込み：同じ名前は置き換え、新しい名前は足す。 */
function exportPhrases() { if (!phrases.length) { $('hint').textContent = t('phraseNone'); return; } download('phrases.json', serializePhrases(phrases), 'application/json'); $('hint').textContent = t('phraseExported', { n: phrases.length }); }
function importPhrasesText(text) {
  const incoming = parsePhrases(text); if (!incoming.length) { $('hint').textContent = t('phraseFileInvalid'); return false; }
  const r = mergePhrases(phrases, incoming); phrases = r.items; if (!persistPhrases()) return false; renderPhraseList(incoming[0].name); $('hint').textContent = t('phraseImported', { added: r.added, replaced: r.replaced }); return true;
}
/* ───────── 三つ折り断面図：平面図の点線から断面を作る／断面で動かした目印の位置を平面図へ戻す（目的：断面から革の長さを決める） ───────── */
const FOLD_SEC_PLIES = 2; /* 三つ折りは2枚を貼り合わせる前提（事業主指示 2026-10-14）。入れる厚みは1枚ぶん */
const foldSecThickness = () => { const v = Number($('foldSecT').value); return Number.isFinite(v) && v > 0 ? v : 1.5; };
/** 三つ折りの設計の、表（外側の革）・裏（内側の革）それぞれの厚み。空欄は「革1枚の厚み」。入れた値が数でないときは NaN（計画が数の不正として断る）。 */
const foldPlyThickness = id => { const raw = ($(id)?.value ?? '').trim(); return raw === '' ? foldSecThickness() : Number(raw); };
const foldThicknessVals = () => ({ tOuter: foldPlyThickness('fdTO'), tInner: foldPlyThickness('fdTI') });
const foldSecMid = s => ({ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 });
/** 選んだ図形（なければ見えている図形）から、三つ折り断面図の材料を作る。失敗は { error }。（図面は変えない） */
const FOLD_HOLE_ROW_TOL = 1; /* 断面の位置の線から、この距離（mm）以内の縫い穴を断面に落とす */
function foldSectionPlan(picked, ply, holeList = doc.holes) {
  const spec = foldSectionSpec(picked.filter(s => !s.foldSec && !s.holeLink && s.foldFlat !== 'fdu'));
  if (!spec.ok) return { error: spec.error, count: spec.count };
  const cut = foldCutPick(picked.filter(s => !s.foldSec && !s.holeLink && s.foldFlat !== 'fdu'), doc.foldCutY); if (cut.error) return cut.error === 'out' ? { error: 'out' } : { error: 'cutMany', count: cut.count };   /* 断面を取る位置：指定の高さ（doc.foldCutY）が優先・無ければ選んだ範囲の横線（1本まで） */
  const th = ply * FOLD_SEC_PLIES, path = foldSectionPath(spec), r1 = spec.bends[0] / Math.PI;   /* th＝貼り合わせた合計の厚み */
  const circles = picked.filter(s => s.type === 'circle' && !s.foldSec && !s.holeLink && s.foldFlat !== 'fdu' && s.cx >= spec.x0 - 1e-6 && s.cx <= spec.x1 + 1e-6 && (cut.y === undefined || Math.abs(s.cy - cut.y) <= s.r + 1e-6));   /* 横線があれば、その線にかかる〇だけ */
  const marks = []; for (const c of circles.sort((a, b) => a.cx - b.cx)) { const sPos = spec.flip ? spec.x1 - c.cx : c.cx - spec.x0, same = marks.find(m => Math.abs(m.s0 - sPos) < 0.01); if (same) same.srcIds.push(c.id); else marks.push({ s0: sPos, srcIds: [c.id] }); }
  const b = bboxOfDoc({ ...doc, shapes: doc.shapes.filter(s => visible(s) && !s.foldSec), holes: [] }) || { maxY: 0 };
  const inPanel = holeList.filter(h => h.foldFlat !== 'fdu' && holeVisible(h) && h.x >= spec.x0 - 1e-6 && h.x <= spec.x1 + 1e-6);   /* 縫い穴（菱目）：断面の位置の線の上のものを、外側・内側の面へ落とす */
  const holeSS = cut.y === undefined ? [] : inPanel.filter(h => Math.abs(h.y - cut.y) <= FOLD_HOLE_ROW_TOL).map(h => spec.flip ? spec.x1 - h.x : h.x - spec.x0);
  const holeInfo = holeSS.length ? foldHoleSpacing(path, holeSS, th) : null, holeNoCut = cut.y === undefined && inPanel.length > 0;
  return { spec, ply, th, path, marks, cutY: cut.y, cutSet: cut.source === 'set', holeSS, holeInfo, holeNoCut, origin: { x: spec.x0, y: b.maxY + 40 + 2 * r1 + th }, key: `${spec.x0.toFixed(3)}:${spec.x1.toFixed(3)}` };
}
/** commit の中で呼ぶ：同じ紙の前の断面を消して、plan の断面を図面に足す。 */
function placeFoldSection(plan) {
  const { spec, ply, th, path, marks, origin, key, cutY, holeSS } = plan;
  doc.foldSections ||= {};
  for (const [id, m] of Object.entries(doc.foldSections)) if (m.key === key) { doc.shapes = doc.shapes.filter(s => s.foldSec !== id); delete doc.foldSections[id]; }   /* 同じ紙の前の断面は置き換える */
  let n = 1; while (doc.foldSections['fs' + n]) n++; const secId = 'fs' + n, gid = nextGroupId(doc.shapes);
  if (!doc.layers.some(l => l.id === 'section')) doc.layers.push({ id: 'section', name: t('foldSecLayer'), visible: true, locked: false });
  doc.foldSections[secId] = { key, flats: spec.flats, bends: spec.bends, flip: spec.flip, t: ply, plies: FOLD_SEC_PLIES, x0: spec.x0, x1: spec.x1, ...(cutY === undefined ? {} : { cutY }) };
  for (const sh of foldSectionShapes(path, th, origin, FOLD_SEC_PLIES)) doc.shapes.push({ ...sh, id: freshId(doc.shapes, 's'), layer: 'section', groupId: gid, foldSec: secId });
  for (const hm of foldHoleMarks(path, holeSS || [], th, origin)) doc.shapes.push({ ...hm, id: freshId(doc.shapes, 's'), layer: 'section', color: 'blue', foldSec: secId });
  for (const m of marks) doc.shapes.push({ ...foldSectionMark(path, m.s0, th, origin), id: freshId(doc.shapes, 's'), layer: 'section', color: 'yellow', foldSec: secId, role: 'mark', srcIds: m.srcIds, s0: m.s0 });
}
/** 断面を作った（作り直した）あとの案内。長さは貼り合わせ線・外側の革・内側の革。 */
function foldSectionDoneText(plan) {
  const { spec, th, path, marks, cutY, cutSet, holeInfo, holeNoCut } = plan, flat = spec.flats.reduce((a, v) => a + v, 0), bend = spec.bends.reduce((a, v) => a + v, 0), f2 = v => v.toFixed(2), [outerLen, innerLen] = foldPlyLengths(path, th, FOLD_SEC_PLIES);
  return t('foldSecDone', { len: f2(path.length), flat: f2(flat), bend: f2(bend), n: marks.length, outer: f2(outerLen), inner: f2(innerLen) }) + (cutY === undefined ? '' : ' ' + t(cutSet ? 'foldSecCutSet' : 'foldSecCut', { y: f2(cutY) })) + (holeInfo ? ' ' + t('foldHoleHead', { n: holeInfo.holes.length }) + holeInfo.bends.map((b, k) => ' ' + (b.pairs ? t('foldHoleBend', { side: t(plan.spec.flip === (k === 0) ? 'foldSideR' : 'foldSideL'), flat: f2(b.flat), outer: f2(b.outer), inner: f2(b.inner), diff: f2(b.diff) }) : t('foldHoleNone', { side: t(plan.spec.flip === (k === 0) ? 'foldSideR' : 'foldSideL') }))).join('') : holeNoCut ? ' ' + t('foldHoleNoCut') : '');
}
/** 半径の欄に、平面図の今の半径（左から順）を入れる。 */
function fillFoldRadii(spec) { const r = foldBendRadii(spec); $('foldRadL').value = r[0].toFixed(2); $('foldRadR').value = r[1].toFixed(2); }
/* 断面を取る位置の指定（高さの欄・図面クリック）。値は図面（doc.foldCutY）に保存する。無いときは今までどおり選んだ範囲の横線（事業主指示 2026-10-17） */
let foldCutPicking = false;
function syncFoldCutField() { const el = $('foldCutY'); if (!el) return; const v = doc.foldCutY, str = Number.isFinite(v) ? String(Math.round(v * 100) / 100) : ''; if (el.value !== str) el.value = str; }
function setFoldCutY(v) { const next = Number.isFinite(v) ? v : undefined; if (doc.foldCutY === next) return; commit(() => { if (next === undefined) delete doc.foldCutY; else doc.foldCutY = next; }); }
function foldCutPickClick(p) { foldCutPicking = false; setFoldCutY(p.y); syncFoldCutField(); $('hint').textContent = t('foldCutSetDone', { y: p.y.toFixed(2) }); draw(); }
function drawFoldCutMark() {
  const y = doc.foldCutY; if (!Number.isFinite(y) || exporting) return; const box = foldPanelBox(doc.shapes.filter(s => visible(s) && !s.foldSec)); if (!box || y <= box.y0 || y >= box.y1) return;
  const k = 1 / scale; ctx.save(); ctx.lineWidth = 1.5 * k; ctx.strokeStyle = 'rgba(80,200,255,.9)'; ctx.setLineDash([6 * k, 4 * k]); ctx.beginPath(); ctx.moveTo(box.x0 - 8 * k, y); ctx.lineTo(box.x1 + 8 * k, y); ctx.stroke(); ctx.restore();   /* 指定した高さの目印（図形ではなく、描くだけ） */
}
function makeFoldSection() {
  const picked = selected.size ? doc.shapes.filter(s => selected.has(s.id)) : doc.shapes.filter(visible);
  const plan = foldSectionPlan(picked, foldSecThickness());
  if (plan.error) { $('hint').textContent = t('foldSecErr_' + plan.error, { n: plan.count ?? 0 }); return; }
  commit(() => placeFoldSection(plan)); fillFoldRadii(plan.spec);
  $('hint').textContent = foldSectionDoneText(plan); draw();
}
/** 丸折りの半径を変える：折りの弧の長さ（π×半径）が変わるぶん、平面図の点線と右側の図形（外形・〇・縫い穴）を横へ動かす。断面図があれば作り直す（元に戻すは1回）。欄が空の側は今のまま。 */
function applyFoldRadii() {
  const picked = (selected.size ? doc.shapes.filter(s => selected.has(s.id)) : doc.shapes.filter(visible)).filter(s => !s.foldSec && s.foldFlat !== 'fdu');
  const spec = foldSectionSpec(picked.filter(s => !s.holeLink));
  if (!spec.ok) { $('hint').textContent = t('foldSecErr_' + spec.error, { n: spec.count ?? 0 }); return; }
  const ply = foldSecThickness(), cur = foldBendRadii(spec), num = (id, was) => { const raw = ($(id).value ?? '').trim(), v = Number(raw); return raw === '' || Math.abs(v - was) <= 0.005 ? was : v; };   /* 空欄、または欄に出ている小数2桁の範囲なら、その側は変えない（四捨五入で勝手に動かさない） */
  const w = foldBendWarp(spec, [num('foldRadL', cur[0]), num('foldRadR', cur[1])], ply * FOLD_SEC_PLIES);
  if (!w.ok) { $('hint').textContent = t('foldRadErr_' + w.error, { min: (w.min ?? 0).toFixed(2) }); return; }
  if (!w.changed) { $('hint').textContent = t('foldRadNoChange'); return; }
  const ids = new Set(picked.map(s => s.id)), warped = new Map(picked.map(s => [s.id, warpX(s, w.map)])), oldKey = `${spec.x0.toFixed(3)}:${spec.x1.toFixed(3)}`;
  const holeOk = new Set(doc.paths.filter(p => p.shapeIds.every(id => ids.has(id))).map(p => p.id));
  const had = Object.entries(doc.foldSections || {}).filter(([, m]) => m.key === oldKey).map(([id]) => id);
  const plan = had.length ? foldSectionPlan(picked.map(s => warped.get(s.id)), ply, doc.holes.map(h => holeOk.has(h.pathId) ? warpX(h, w.map) : h)) : null;   /* 動かしたあとの図形から断面を作り直す */
  commit(() => {
    doc.shapes = doc.shapes.map(s => warped.get(s.id) || s); doc.holes = doc.holes.map(h => holeOk.has(h.pathId) ? warpX(h, w.map) : h);
    if (plan && !plan.error) { for (const id of had) { doc.shapes = doc.shapes.filter(s => s.foldSec !== id); delete doc.foldSections[id]; } placeFoldSection(plan); }
  });
  const r = foldBendRadii({ xs: w.xs }), f2 = v => v.toFixed(2);
  $('hint').textContent = t('foldRadDone', { l: f2(r[0]), r: f2(r[1]), total: f2(spec.x1 - spec.x0 + w.total), diff: (w.total >= 0 ? '+' : '') + f2(w.total) }) + (plan && !plan.error ? ' ' + foldSectionDoneText(plan) : ''); rebuildSnaps(); draw();
}
function applyFoldSection() {
  if (!doc.foldSections || !Object.keys(doc.foldSections).length) { $('hint').textContent = t('foldSecNone'); return; }
  const chosen = new Set(doc.shapes.filter(s => s.foldSec && selected.has(s.id)).map(s => s.foldSec)), ids = chosen.size ? [...chosen] : Object.keys(doc.foldSections);
  const edits = []; let far = 0, stuck = 0;
  for (const id of ids) {
    const meta = doc.foldSections[id], cap0 = doc.shapes.find(s => s.foldSec === id && s.role === 'cap0'); if (!meta || !cap0) continue;
    const origin = foldSecMid(cap0), path = foldSectionPath(meta);
    for (const m of doc.shapes.filter(s => s.foldSec === id && s.role === 'mark')) {
      const c = foldSecMid(m), q = projectOnFoldPath(path, c.x - origin.x, origin.y - c.y);
      const total = meta.t * (meta.plies || 1); if (q.dist > total / 2 + 6) { far++; continue; }
      if (Math.abs(q.s - m.s0) > 1e-6) edits.push({ id: m.id, meta, origin, path, s: q.s });
      else { const was = foldSecMid(foldSectionMark(path, m.s0, total, origin)); if (Math.hypot(c.x - was.x, c.y - was.y) > 0.05) stuck++; }   /* 動かしたのに、革に沿った位置が変わらない（革に直角に動かした） */
    }
  }
  if (!edits.length) { $('hint').textContent = far ? t('foldSecFar', { k: far }) : stuck ? t('foldSecStuck', { k: stuck }) : t('foldSecNoChange'); return; }
  let moved = 0;
  commit(() => { for (const e of edits) { const m = doc.shapes.find(s => s.id === e.id), ds = e.s - m.s0; for (const sid of m.srcIds || []) { const c = doc.shapes.find(s => s.id === sid && s.type === 'circle'); if (c) { c.cx += e.meta.flip ? -ds : ds; moved++; } } Object.assign(m, foldSectionMark(e.path, e.s, e.meta.t * (e.meta.plies || 1), e.origin), { s0: e.s }); } });
  $('hint').textContent = t('foldSecApplied', { n: moved }) + (far ? ' ' + t('foldSecFar', { k: far }) : ''); rebuildSnaps(); draw();
}
/** 左メニューの各ボタンの横に、キーを小さく並べる（ツール・選択中の操作）。 */
/** 左メニュー・ヘッダのキー表示を、ヘッダのチェックで一斉に出す・隠す。状態はこのブラウザに覚える（既定は表示）。 */
function initShowKeys() {
  let on = true; try { on = localStorage.getItem('leather-cad.showKeys') !== '0'; } catch { /* 保存制限でも既定の表示のまま */ }
  const apply = v => document.documentElement.classList?.toggle('no-keys', !v);
  $('showKeys').checked = on; apply(on);
  $('showKeys').onchange = () => { const v = $('showKeys').checked; apply(v); try { localStorage.setItem('leather-cad.showKeys', v ? '1' : '0'); } catch { /* 保存できなくても今回の表示は切り替わる */ } };
}
function initToolKeys() {
  const put = (b, key) => { if (!b || !key || b.querySelector?.('.key')) return; const k = document.createElement('kbd'); k.className = 'key'; k.textContent = key.replace('Shift+', '⇧'); b.appendChild(k); };
  for (const b of document.querySelectorAll('button[data-tool]') || []) put(b, TOOL_KEYS[b.dataset.tool]);
  for (const [id, key] of Object.entries(ACTION_KEYS)) put($(id), key);
  for (const [id, key] of Object.entries(TOGGLE_KEYS)) { const label = $(id)?.closest?.('label'); if (label && !label.querySelector?.('.key')) put(label, key); }   /* ヘッダのグリッド・スナップの文字の横にも */
}
/** 三つ折りの縦の基準線（点線6本）を、入れた幅から引く。前にある紙の高さいっぱいの縦の点線は置き換える（12本にならない）。 */
function makeFoldBaselines() {
  const picked = (selected.size ? doc.shapes.filter(s => selected.has(s.id)) : doc.shapes.filter(visible)).filter(s => !s.foldSec && !s.holeLink && s.foldFlat !== 'fdu');
  const num = id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value);
  const r = foldBaselines(picked, { flat1: num('foldBaseF1'), bend1: num('foldBaseB1'), flat2: num('foldBaseF2'), bend2: num('foldBaseB2') });
  if (!r.ok) { $('hint').textContent = t('foldBaseErr_' + r.error, { w: r.width == null ? '' : r.width.toFixed(2) }); return; }
  commit(() => {
    const drop = new Set(r.replaceIds), layer = ensureLayer(doc, 'guide'); doc.shapes = doc.shapes.filter(s => !drop.has(s.id));
    const ids = []; for (const ln of r.lines) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...ln, id, layer }); ids.push(id); }
    if (selected.size) selected = new Set([...selected].filter(id => !drop.has(id)).concat(ids));   /* 紙を選んで引いたときは、紙も残したまま点線を足す（続けて断面図を作れる）。何も選んでいなければ選ばない */
  });
  $('hint').textContent = t('foldBaseDone', { f3: r.flats[2].toFixed(2) }); rebuildSnaps(); draw();
}
/** 隙間を閉じる：選んだ線が関わる切れ目（2mm 以内）を、動かせる側の端を相手の端へ合わせて閉じる。ロックした層の図形は動かさない。元に戻すは1回。 */
/** 「1本に結合」：選んだ線のうち、端がつながって同じ直線の上に並び、層・線の種類・色・グループが同じものを、1本の直線にまとめる。菱目（縫い穴）は位置のまま1本の経路にまとめ直す。縫い合わせ設定がある線や、選んでいない線もいっしょの経路は、まとめない（事業主指示 2026-10-17）。 */
function mergeSelectedLines() {
  const ids = selectedShapeIds(), GEOM = new Set(['id', 'type', 'x1', 'y1', 'x2', 'y2', 'c1x', 'c1y', 'c2x', 'c2y', 'points', 'closed', 'nodes', 'markOf']);
  const okShape = s => editable(s) && visible(s) && !s.markOf && !s.holeLink && !s.foldSec && !s.foldFlat, cand = doc.shapes.filter(okShape), groups = new Map(); /* 選んだ線に、端がつながって同じ直線の上に並ぶ同じ種類の線は、選んでいなくても含める（1本だけ選んでも結合できる・事業主指摘 2026-10-17） */
  for (const s of cand) { const key = [s.layer, s.lineStyle || '', groupIdOf(s) || ''].join('|'); /* 色は区別しない（トリムなどで一部の色が抜けた短い線が混ざることがある）。まとめた線の色は、いちばん長い線のもの */ if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s); }
  const clusters = [...groups.values()].flatMap(list => collinearLineClusters(list)).filter(c => c.ids.some(id => ids.has(id)));   /* 選んだ線を1本以上含むまとまりだけ */
  const seamPaths = new Set(doc.seams.flatMap(m => [m.a.pathId, m.b.pathId]));
  const ok = clusters.filter(c => { const set = new Set(c.ids); return doc.paths.filter(p => p.shapeIds.some(id => set.has(id))).every(p => p.shapeIds.every(id => set.has(id)) && !seamPaths.has(p.id)); });
  if (!ok.length) { $('hint').textContent = t(clusters.length ? 'mergeLinesBlocked' : 'mergeLinesNone'); return; }
  cancel(); let made = 0, total = 0, newIds = [];
  commit(() => {
    for (const c of ok) {
      const set = new Set(c.ids), members = doc.shapes.filter(s => set.has(s.id)), first = members[0], longest = members.reduce((m, q) => arcLength(q) > arcLength(m) ? q : m, first), look = {}; for (const [k, v] of Object.entries(longest)) if (!GEOM.has(k)) look[k] = v;
      const affected = doc.paths.filter(p => p.shapeIds.some(id => set.has(id))), olds = new Map(affected.map(p => [p.id, resolvePath(doc, p)]));
      const nid = freshId(doc.shapes, 's'), line = { ...look, id: nid, type: 'line', x1: c.p1.x, y1: c.p1.y, x2: c.p2.x, y2: c.p2.y }, at = doc.shapes.findIndex(s => s.id === first.id);
      doc.shapes = doc.shapes.filter(s => !set.has(s.id)); doc.shapes.splice(Math.min(at, doc.shapes.length), 0, line);
      for (const part of doc.parts) if (part.shapeIds.some(id => set.has(id))) part.shapeIds = [...new Set(part.shapeIds.map(id => set.has(id) ? nid : id))];
      if (affected.length) {
        const np = { id: freshId(doc.paths, 'p'), shapeIds: [nid], reversed: false, closed: false, segments: [], mark: affected[0].mark || 'tool' }, route = resolvePath(doc, np), oldIds = new Set(affected.map(p => p.id));
        const tonew = (oldRoute, v) => projectOnPath(route, pointAtLength(oldRoute, Math.min(Math.max(v, 0), arcLength(oldRoute)))).s;
        for (const p of affected) { const oldRoute = olds.get(p.id); if (!oldRoute) continue; for (const sg of p.segments) { const a = tonew(oldRoute, sg.from), b = tonew(oldRoute, sg.to); np.segments.push({ ...sg, from: Math.min(a, b), to: Math.max(a, b) }); } }
        np.segments.sort((x, y) => x.from - y.from); doc.paths = doc.paths.filter(p => !oldIds.has(p.id)); doc.paths.push(np);
        for (const h of doc.holes) if (oldIds.has(h.pathId)) { h.pathId = np.id; h.s = projectOnPath(route, h).s; }
      }
      made++; total += c.ids.length; newIds.push(nid);
    }
    selected = new Set(newIds);
  });
  $('hint').textContent = t('mergeLinesDone', { k: total, n: made });
}
function closeSelectedGaps() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('closeGapsNoSel'); return; }
  const editableIds = new Set(doc.shapes.filter(s => editable(s)).map(s => s.id)), r = closeGaps(doc.shapes.filter(s => visible(s) && stitchable(s) && !s.holeLink), ids, 2, 0.01, editableIds);
  if (!r.closed && !r.skipped) { $('hint').textContent = t('closeGapsNone', { max: 2 }); return; }
  if (r.closed) commit(() => { const m = new Map(r.changes.map(c => [c.id, c.next])); doc.shapes = doc.shapes.map(s => m.get(s.id) || s); });
  $('hint').textContent = (r.closed ? t('closeGapsDone', { n: r.closed, max: r.maxGap.toFixed(2) }) : '') + (r.skipped ? (r.closed ? ' ' : '') + t('closeGapsSkipped', { k: r.skipped }) : ''); rebuildSnaps(); draw();
}
/** 三つ折りの設計：ボタン線を基準にした距離と内側の半径から、完成形の断面を先に作る。重なり・突き抜けは作ったうえで警告する。前の設計の断面は置き換える（元に戻すは1回）。 */
let designUndoLen = -1; /* 数値変更のライブ更新を、元に戻す1回にまとめるための印（断面を作った直後の undo の数） */
function designCommit(fn, live) {
  if (live && designUndoLen === undo.length && !redo.length) { ownPathsCache = null; fn(); rebuildSnaps(); scheduleAutosave(); draw(); return; }   /* 続けて数値を変えている間は、同じ元に戻す1回に重ねる */
  commit(fn); designUndoLen = undo.length;
}
/** 図形の一覧を、高さ ym の水平線を軸に上下反転する（y を折り返し・円弧は角度の向きを入れ替える）。 */
function flipSectionV(shapes, ym) {
  const f = y => 2 * ym - y;
  return shapes.map(sh => {
    const o = { ...sh }; if ('y1' in o) { o.y1 = f(o.y1); o.y2 = f(o.y2); } if ('cy' in o) o.cy = f(o.cy); if (o.points) o.points = o.points.map(q => ({ ...q, y: f(q.y) }));
    if (o.type === 'arc') { const a = o.startDeg, b = o.endDeg; o.startDeg = -b; o.endDeg = -a; }
    return o;
  });
}
/** 三つ折りの断面に置くリング・リフィルの入力。規格・リング径は金具の欄、束の厚み・取付位置はこのカードの欄。オフなら null、数値が不正なら { error }。 */
function foldRingInput() {
  if ($('fdRingOn')?.checked !== true) return null;
  const pos = Number($('fdRingPos').value), stackT = ($('fdStackT').value ?? '').trim() === '' ? 6 : Number($('fdStackT').value);
  if (!Number.isFinite(pos) || !Number.isFinite(stackT) || !(stackT > 0)) return { error: 'bad' };
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0], base = binderBase(spec), tp = { ...spineParams(), stackT, refillW: spec?.refill?.wMm ?? 110, plateW: base.sectionWidthMm ?? 24 };
  const parts = foldRingParts(tp); if (!parts) return { error: 'bad' };
  return { spec, ringD: tp.ringD, pos, stackT, parts, dir: $('fdRefillDir')?.value === 'v' ? 'v' : 'h' };
}
/** リング・台座・リフィルを、右の丸折りの頂点から革に沿って pos(mm) の位置の、革の内側の面に立てる（面に垂直に内側へ）。断面の図形と、取付穴の位置 s（革の端から中心線に沿った長さ）を返す。 */
function foldRingShapes(path, T, origin, ring) {
  const arc = path.pieces.find(pc => pc.kind === 'arc'), s = Math.max(0, Math.min(path.length, (arc.s0 + arc.s1) / 2 + ring.pos)), q = pointOnFoldPath(path, s), tx = Math.cos(q.heading), ty = Math.sin(q.heading), nx = -ty, ny = tx, fu = q.u + nx * T / 2, fv = q.v + ny * T / 2;
  const at = (h, w) => ({ x: origin.x + fu + nx * h + tx * w, y: origin.y - (fv + ny * h + ty * w) });   /* (面からの高さ h, 面に沿った横 w) → 図面の座標 */
  const shapes = ring.parts.shapes.map(sh => {
    if (sh.type === 'circle') { const c = at(sh.h, sh.w); return { type: 'circle', role: sh.role, cx: c.x, cy: c.y, r: sh.r }; }
    if (sh.type === 'arc') { const c = at(sh.h, sh.w), phi = Math.atan2(-ny, nx) * 180 / Math.PI; return { type: 'arc', role: sh.role, cx: c.x, cy: c.y, r: sh.r, startDeg: sh.a0 * 180 / Math.PI + phi, endDeg: sh.a1 * 180 / Math.PI + phi }; }   /* 局所の角度（h 軸が0）を図面の角度へ回すだけ（向きは変わらない） */
    if (sh.type === 'line') { const a = at(sh.h1, sh.w1), b = at(sh.h2, sh.w2); return { type: 'line', role: sh.role, lineStyle: 'dashed', x1: a.x, y1: a.y, x2: b.x, y2: b.y }; }
    return { type: 'polyline', role: sh.role, closed: true, points: sh.points.map(pt => at(pt.h, pt.w)) };
  });
  /* リフィルは、革の面の向きに関係なく、水平か垂直に置く（事業主指示 2026-10-15）。水平＝リングの中心から、面が左を向くなら左へ・右を向くなら右へ（面が水平のときは左へ）・厚みは縦。垂直＝面が上を向くなら上へ・下を向くなら下へ（面が垂直のときは上へ）・厚みは横 */
  const c = at(ring.parts.ringH, 0), vert = ring.dir === 'v', e = vert ? { x: 0, y: Math.abs(ny) > 1e-6 ? -Math.sign(ny) : -1 } : { x: Math.abs(nx) > 1e-6 ? Math.sign(nx) : -1, y: 0 }, rf = ring.parts.refill, hh = rf.thick / 2;
  const P = (t, k) => vert ? { x: c.x + k * hh, y: c.y + e.y * t } : { x: c.x + e.x * t, y: c.y + k * hh };   /* t＝リングの中心から向き e への距離・k＝厚みの向き（−1・＋1） */
  shapes.push({ type: 'polyline', role: 'refills', closed: true, points: [P(rf.t0, -1), P(rf.t1, -1), P(rf.t1, 1), P(rf.t0, 1)] });
  for (const t of rf.holeT) { const a = P(t, -1), b = P(t, 1); shapes.push({ type: 'line', role: 'refill-hole', lineStyle: 'dashed', x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
  return { shapes, s };
}
function makeFoldDesign(live = false) {
  const num = id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value);
  const vals = { t: foldSecThickness(), plies: FOLD_SEC_PLIES, ...foldThicknessVals(), dL: num('fdDL'), dR: num('fdDR'), cL: num('fdCL'), cR: num('fdCR'), rinL: num('fdRL'), rinR: num('fdRR') }, p = foldDesignPlan(vals);
  if (!p.ok) { if (!live || doc.foldDesign) $('hint').textContent = t('foldDesignErr_' + p.error); return; }
  const base = bboxOfDoc({ ...doc, shapes: doc.shapes.filter(s => visible(s) && !s.foldSec && !s.foldFlat), holes: [] }) || { minX: 0, maxY: 0 };   /* 断面・平面の投影そのものは数えない（作り直すたびに下へずれない） */
  const path = foldSectionPath({ flats: p.flats, bends: p.bends }), origin = { x: base.minX, y: base.maxY + 40 + 2 * p.rc[0] + p.T }, axisX = origin.x + p.cEff[0];
  const flipOn = $('fdFlip')?.checked !== false, ringIn = foldRingInput(), ring = ringIn && !ringIn.error ? { ...ringIn, ...foldRingShapes(path, p.T, origin, ringIn) } : null;
  designCommit(() => {
    doc.shapes = doc.shapes.filter(s => s.foldSec !== 'fd');
    if (!doc.layers.some(l => l.id === 'section')) doc.layers.push({ id: 'section', name: t('foldSecLayer'), visible: true, locked: false });
    const gid = nextGroupId(doc.shapes);
    const flip = shapes => flipOn ? flipSectionV(shapes, origin.y - p.rc[0]) : shapes;   /* 実際に机に置いた向きにするため、断面全体を上下反転（事業主指示 2026-10-15・切り替えできる）。右の丸折りの中心の高さを軸にするので、範囲は変わらない。左右は変わらない */
    for (const sh of flip(foldSectionShapes(path, p.T, origin, FOLD_SEC_PLIES, p.T / 2 - p.tI))) doc.shapes.push({ ...sh, id: freshId(doc.shapes, 's'), layer: 'section', groupId: gid, foldSec: 'fd' });   /* 貼り合わせ線は、裏の革の厚みぶん内側の面から（表裏の厚みが違うと中心ではない） */
    for (const sh of flip([{ type: 'line', x1: axisX, y1: origin.y + p.T / 2 + 2, x2: axisX, y2: origin.y - (2 * p.rc[0] + p.T / 2 + 2), lineStyle: 'dashed', color: 'blue', role: 'axis' }])) doc.shapes.push({ ...sh, id: freshId(doc.shapes, 's'), layer: 'section', foldSec: 'fd' });   /* ボタン線 */
    if (ring) for (const sh of flip(ring.shapes)) doc.shapes.push({ ...sh, id: freshId(doc.shapes, 's'), layer: 'section', groupId: gid, foldSec: 'fd' });
    doc.foldDesign = { ...vals, flats: p.flats, bends: p.bends, origin, flipV: flipOn, ...(ring ? { ring: { specId: ring.spec.id, ringD: ring.ringD, pos: ring.pos, stackT: ring.stackT, s: ring.s, dir: ring.dir } } : {}) };
  }, live);
  const f2 = v => v.toFixed(2);
  $('hint').textContent = t('foldDesignDone', { f1: f2(p.flats[0]), f2: f2(p.flats[1]), f3: f2(p.flats[2]), b1: f2(p.bends[0]), b2: f2(p.bends[1]), len: f2(p.length) }) + p.warnings.map(w => ' ' + t('foldDesignWarn_' + w, { half: f2(p.T / 2) })).join('')
    + (ring ? ' ' + t('foldRingDone', { ringD: f2(ring.ringD), pos: f2(ring.pos), s: f2(ring.s), stack: f2(ring.stackT), dir: t(ring.dir === 'v' ? 'foldRefillV' : 'foldRefillH') }) + (ring.parts.ringFits ? '' : ' ' + t('foldRingTight', { stack: f2(ring.stackT), ringD: f2(ring.ringD) })) : ringIn?.error ? ' ' + t('foldRingErr') : ''); draw();
}
/** 数値を変えたとき：その場で断面を作る・作り直す（元に戻すは1回）。まだ断面が無く数値が不正なときは、入力の途中なので案内を出さずに待つ。 */
function liveFoldDesign() { makeFoldDesign(true); }   /* 数値が正しければ、断面を作る前でも変えた時点で描く（元に戻すは1回） */
/** 平面図へ投影する。革の長さの帯（長方形）・折りの点線6本・ボタンの〇2つ（ボタン線が3枚を通る位置のうち、両端の2枚。真ん中の1枚には穴をあけない。直径は欄で指定）。前の投影は置き換える。
 *  withStitch＝true のときは、欄の縁からの距離・ピッチ・端の余白から、帯の上と下に菱目打ちライン（縫い線の点線）と菱目の穴を並べる（曲面の部分は平らに伸ばした直線の長さで測る）。false のときは、前に描いた列があれば同じ値で引き継ぐ。 */
function projectFoldDesign(withStitch) {
  const d = doc.foldDesign; if (!d) { $('hint').textContent = t('foldFixNone'); return; }
  const h = Number($('fdH').value); if (!(h > 0)) { $('hint').textContent = t('foldFixHeight'); return; }
  const btnD = Number($('fdBtnD').value); if (!(btnD > 0 && btnD < h)) { $('hint').textContent = t('foldFixBtnD'); return; }
  const p = foldDesignPlan(d); if (!p.ok) { $('hint').textContent = t('foldDesignErr_' + p.error); return; }
  let st = d.stitch || null;
  if (withStitch) {
    const edge = Number($('fdEdge').value), pitch = Number($('fdPitch').value), margin = Number($('fdMargin').value);
    const bad = !(edge > 0 && edge * 2 < h) ? 'edge' : !(pitch > 0) ? 'pitch' : !(margin >= 0 && margin * 2 < p.length) ? 'margin' : null;
    if (bad) { $('hint').textContent = t('foldStitchErr_' + bad); return; }
    st = { edge, pitch, margin };
  }
  const fx = d.origin.x, fy = d.origin.y + p.T / 2 + 2 + 40, [f1, f2] = p.flats, [b1, b2] = p.bends, xs = [f1, f1 + b1 / 2, f1 + b1, f1 + b1 + f2, f1 + b1 + f2 + b2 / 2, f1 + b1 + f2 + b2];
  const buttons = [p.cEff[0], f1 + b1 + p.a[0], f1 + b1 + f2 + b2 + p.a[1]];   /* ボタン線が1枚目・2枚目・3枚目を通る、革の端からの長さ。穴をあけるのは両端の1枚目と3枚目だけ（2枚目は真ん中なので穴なし） */
  const mounts = (d.ring && binderSpec(d.ring.specId)?.rivets) || [], tool = stitchToolCurrent(); let holeInfo = null;
  commit(() => {
    const mineShapes = new Set(doc.shapes.filter(s => s.foldFlat === 'fd').map(s => s.id)), minePaths = new Set(doc.paths.filter(q => q.foldFlat === 'fd').map(q => q.id));
    dropDimAnchorsTo(mineShapes); for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(id => !mineShapes.has(id)); doc.shapes = doc.shapes.filter(s => !mineShapes.has(s.id)); doc.paths = doc.paths.filter(q => !minePaths.has(q.id)); doc.holes = doc.holes.filter(q => q.foldFlat !== 'fd' && !minePaths.has(q.pathId));
    const layer = ensureLayer(doc, 'pattern'), guide = ensureLayer(doc, 'guide'), add = sh => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...sh, id, foldFlat: 'fd' }); return id; };
    add({ type: 'polyline', layer, closed: true, points: [{ x: fx, y: fy }, { x: fx + p.length, y: fy }, { x: fx + p.length, y: fy + h }, { x: fx, y: fy + h }] });
    for (const x of xs) add({ type: 'line', layer: guide, lineStyle: 'dashed', x1: fx + x, y1: fy, x2: fx + x, y2: fy + h });
    for (const x of [buttons[0], buttons[2]]) add({ type: 'circle', layer, cx: fx + x, cy: fy + h / 2, r: btnD / 2 });
    for (const rv of mounts) add({ type: 'circle', layer, cx: fx + d.ring.s + rv.yMm, cy: fy + h / 2 + rv.xMm, r: rv.dMm / 2 });   /* リング取付穴（台座の長さの向きが平面図の縦・横が革に沿った向き） */
    if (st) for (const y of [fy + st.edge, fy + h - st.edge]) {   /* 菱目打ちライン：縫い線の点線＋その上の菱目の穴（端の余白を空け、ピッチは均等に調整） */
      const lineId = add({ type: 'line', layer: guide, lineStyle: 'dashed', color: 'yellow', x1: fx + st.margin, y1: y, x2: fx + p.length - st.margin, y2: y });
      const route = doc.shapes.find(s => s.id === lineId), rlen = arcLength(route), nPts = Math.floor(rlen / st.pitch + 1e-9), lead = (rlen - nPts * st.pitch) / 2, pts = pointsAlongShape(route, st.pitch, { offsetStart: lead, offsetEnd: lead }), saved = { id: freshId(doc.paths, 'p'), shapeIds: [lineId], reversed: false, closed: false, segments: [], mark: 'tool', foldFlat: 'fd' };
      doc.paths.push(saved); placeHoles(saved, route, pts.map(q => ({ ...q })), tool); for (const q of doc.holes.filter(x => x.pathId === saved.id)) q.foldFlat = 'fd';
      saved.segments = [{ from: 0, to: rlen, toolId: tool.id, pitch: st.pitch, mode: 'fixed' }]; holeInfo = { n: pts.length, step: st.pitch, lead };
    }
    doc.foldDesign = { ...doc.foldDesign, ...(st ? { stitch: st } : {}) };
  });
  const f2s = v => v.toFixed(2);
  $('hint').textContent = t('foldFixDone', { len: f2s(p.length), d: f2s(btnD), s1: f2s(buttons[0]), s3: f2s(buttons[2]) }) + (mounts.length ? ' ' + t('foldFixMounts', { n: mounts.length, d: f2s(mounts[0].dMm), x: f2s(d.ring.s) }) : '') + (st && holeInfo ? ' ' + t('foldFixStitch', { edge: f2s(st.edge), pitch: f2s(st.pitch), lead: f2s(holeInfo.lead), n: holeInfo.n }) : ''); rebuildSnaps(); draw();
}
/** 表（折りの外側の革）・裏（内側の革）の展開図を、図面に並べる（FIX の平面図の下に、表→裏の順）。それぞれに、折りの点線・ボタン穴・菱目打ちライン（菱目の穴）を描き、平らな部分と曲げ部の菱目間の寸法（数字つき）を書き込む。
 *  菱目は同じ個数・同じ位置（革の長さに沿った割り当て）で、曲げ部の間隔だけが革ごとに違う。前の展開図は置き換える（元に戻すは1回）。 */
function unfoldFoldDesign() {
  const d = doc.foldDesign; if (!d) { $('hint').textContent = t('foldFixNone'); return; }
  const h = Number($('fdH').value); if (!(h > 0)) { $('hint').textContent = t('foldFixHeight'); return; }
  const btnD = Number($('fdBtnD').value); if (!(btnD > 0 && btnD < h)) { $('hint').textContent = t('foldFixBtnD'); return; }
  const p = foldDesignPlan(d); if (!p.ok) { $('hint').textContent = t('foldDesignErr_' + p.error); return; }
  const edge = Number($('fdEdge').value), pitch = Number($('fdPitch').value), margin = Number($('fdMargin').value);
  const bad = !(edge > 0 && edge * 2 < h) ? 'edge' : !(pitch > 0) ? 'pitch' : !(margin >= 0 && margin * 2 < p.length) ? 'margin' : null; if (bad) { $('hint').textContent = t('foldStitchErr_' + bad); return; }
  const [f1, f2] = p.flats, [b1, b2] = p.bends, buttons = [p.cEff[0], f1 + b1 + p.a[0], f1 + b1 + f2 + b2 + p.a[1]];
  const plies = foldUnfoldPlan(p, { pitch, margin, buttons }); if (!plies || plies.some(u => !u)) { $('hint').textContent = t('foldUnfoldFail'); return; }
  const tool = stitchToolCurrent(), fx = d.origin.x, f2s = v => v.toFixed(2); let fy0 = d.origin.y + p.T / 2 + 2 + 40 + h + 60;
  { /* 置き場所に別の図形（財布の部品など）が重なるときは、その下の空いた所へずらす。重ならないときは今までの位置（事業主指摘 2026-10-18） */
    const blockLen = Math.max(...plies.map(u => u.length)), near = doc.shapes.filter(sh => sh.foldFlat !== 'fdu' && !sh.holeLink).map(bboxOf).filter(bx => bx.maxX >= fx - 10 && bx.minX <= fx + blockLen + 10 && bx.maxY > fy0 - 10);
    if (near.length) fy0 = Math.max(fy0, Math.max(...near.map(bx => bx.maxY)) + 60);
  }
  commit(() => {
    const mineShapes = new Set(doc.shapes.filter(s => s.foldFlat === 'fdu').map(s => s.id)), minePaths = new Set(doc.paths.filter(q => q.foldFlat === 'fdu' || q.shapeIds.some(id => mineShapes.has(id))).map(q => q.id));   /* 消える展開の図形を通る経路も、いっしょに消す（残すと、新しい図形と id が重なって図面が壊れる） */
    dropDimAnchorsTo(mineShapes); for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(id => !mineShapes.has(id)); doc.shapes = doc.shapes.filter(s => !mineShapes.has(s.id)); doc.paths = doc.paths.filter(q => !minePaths.has(q.id)); doc.holes = doc.holes.filter(q => q.foldFlat !== 'fdu' && !minePaths.has(q.pathId));   /* 消える図形を、部品の中身から外す（同じ番号の新しい図形を、取り違えない） */
    const layer = ensureLayer(doc, 'pattern'), guide = ensureLayer(doc, 'guide');
    plies.forEach((u, i) => {
      const fy = fy0 + i * (h + 80), side = { right: t('foldSideR'), left: t('foldSideL') }, name = t(u.key === 'outer' ? 'unfoldOuter' : 'unfoldInner'), add = sh => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...sh, id, foldFlat: 'fdu', ply: u.key }); return id; };
      add({ type: 'text', layer: guide, x: fx, y: fy - 5, text: t('unfoldTitle', { name, len: f2s(u.length) }), sizeMm: 4, angleDeg: 0 });
      add({ type: 'polyline', layer, closed: true, points: [{ x: fx, y: fy }, { x: fx + u.length, y: fy }, { x: fx + u.length, y: fy + h }, { x: fx, y: fy + h }] });
      for (const x of u.xs) add({ type: 'line', layer: guide, lineStyle: 'dashed', x1: fx + x, y1: fy, x2: fx + x, y2: fy + h });
      for (const x of [u.buttons[0], u.buttons[2]]) add({ type: 'circle', layer, cx: fx + x, cy: fy + h / 2, r: btnD / 2 });
      for (const y of [fy + edge, fy + h - edge]) {   /* 菱目打ちライン：縫い線の点線＋その上の菱目の穴（この革の長さに沿った位置） */
        const lineId = add({ type: 'line', layer: guide, lineStyle: 'dashed', color: 'yellow', x1: fx + u.rowFrom, y1: y, x2: fx + u.rowTo, y2: y }), len = u.rowTo - u.rowFrom;
        const saved = { id: freshId(doc.paths, 'p'), shapeIds: [lineId], reversed: false, closed: false, segments: [{ from: 0, to: len, toolId: tool.id, pitch: u.flatStep, mode: 'manual' }], mark: 'tool', foldFlat: 'fdu', ply: u.key }; doc.paths.push(saved);
        for (const x of u.holes) doc.holes.push({ id: freshId(doc.holes, 'h'), pathId: saved.id, s: x - u.rowFrom, x: fx + x, y, angleDeg: slantOf(tool), toolId: tool.id, mark: 'tool', foldFlat: 'fdu' });
      }
      const yd = fy + h - edge, dim = (a, b) => add({ type: 'dimension', layer: guide, x1: fx + a, y1: yd, x2: fx + b, y2: yd, offset: -4 });   /* 菱目間の寸法（数字つき）：下の列の下に */
      dim(u.holes[0], u.holes[1]);
      u.bends.forEach((b, k) => {
        if (b.firstIndex >= 0) dim(u.holes[b.firstIndex], u.holes[b.firstIndex + 1]);
        add({ type: 'text', layer: guide, x: fx, y: fy + h + 12 + k * 5, text: t('unfoldBendNote', { side: side[b.side], pitch: f2s(b.pitch), flat: f2s(b.flat), n: b.count }), sizeMm: 3, angleDeg: 0 });
      });
    });
  });
  commit(() => { for (const p of doc.parts) if (p.autoPly) p.shapeIds = foldUnfoldPartIds(p.autoPly); });   /* 「表・裏を部品にする」で作った部品は、新しい展開の図形で作り直す */
  const [o, ii] = plies;
  $('hint').textContent = t('foldUnfoldDone', { lo: f2s(o.length), li: f2s(ii.length), flat: f2s(o.flatStep), po: o.bends.map(b => ({ right: t('foldSideR'), left: t('foldSideL') }[b.side] + ' ' + f2s(b.pitch))).join(' / '), pi: ii.bends.map(b => ({ right: t('foldSideR'), left: t('foldSideL') }[b.side] + ' ' + f2s(b.pitch))).join(' / ') }); rebuildSnaps(); draw();
}
function fixFoldDesign() { projectFoldDesign(false); }
/** 設計カードに、曲げ部の菱目ピッチ（外側の面・内側の面・差）を数字で出す。基準の平らな間隔は「菱目のピッチ」の欄（指定する前提）。数値・厚み・ピッチのどれを変えても、その場で更新する。 */
function refreshFoldPitch() {
  const el = $('fdPitchOut'); if (!el) return;
  const num = id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value), pitch = num('fdPitch'), f2 = v => v.toFixed(2);
  if (!(pitch > 0)) { el.textContent = t('foldPitchNeed'); return; }
  const r = foldBendPitch(foldDesignPlan({ t: foldSecThickness(), plies: FOLD_SEC_PLIES, ...foldThicknessVals(), dL: num('fdDL'), dR: num('fdDR'), cL: num('fdCL'), cR: num('fdCR'), rinL: num('fdRL'), rinR: num('fdRR') }), pitch, FOLD_SEC_PLIES);
  if (!r) { el.textContent = t('foldPitchBad'); return; }
  el.textContent = t('foldPitchHead', { p: f2(pitch) }) + r.map(b => '\n' + t('foldPitchBend', { side: t(b.side === 'right' ? 'foldSideR' : 'foldSideL'), outer: f2(b.outer), inner: f2(b.inner), diff: f2(b.diff), deg: b.angleDeg.toFixed(1), n: b.count.toFixed(1) })).join('');
}
/** 全幅（最左端〜最右端の距離）＝ボタン線→左の折りの外側＋ボタン線→右の折りの外側。2つの距離を変えると、合計を自動で出す。 */
function refreshFoldWidth() { const l = Number($('fdDL').value), r = Number($('fdDR').value); $('fdW').value = ($('fdDL').value ?? '').trim() !== '' && ($('fdDR').value ?? '').trim() !== '' && l > 0 && r > 0 ? String(+(l + r).toFixed(2)) : ''; }
/** 全幅の欄を書き換えたとき：左の距離は変えず、右の距離を合わせる（全幅が決まっていて、ボタンの位置は「ずらす」で動かす）。 */
function setFoldWidth() {
  const w = Number($('fdW').value), l = Number($('fdDL').value), blankL = ($('fdDL').value ?? '').trim() === '';
  if (blankL || !(l > 0)) { $('hint').textContent = t('foldWidthNeedL'); return; }
  if (!(w > l)) { $('hint').textContent = t('foldWidthSmall', { l: l.toFixed(2) }); return; }
  $('fdDR').value = String(+(w - l).toFixed(2)); refreshFoldPitch(); liveFoldDesign();
}
/** ボタンを左（dir=-1）・右（dir=+1）へ、ずらす量だけ動かす：左の距離は＋量・右の距離は−量（折りの外側・切り口とも）として、4つの距離の欄そのものを書き換える。欄の数字は常に実際の距離。全幅は変わらない。 */
function nudgeFoldButton(dir) {
  const step = Number($('fdShift').value); if (!(step > 0)) { $('hint').textContent = t('foldNudgeStep'); return; }
  const ids = ['fdDL', 'fdDR', 'fdCL', 'fdCR'], cur = ids.map(id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value));
  if (!cur.every(Number.isFinite)) { $('hint').textContent = t('foldDesignErr_badNumber'); return; }
  const s = dir * step, next = [cur[0] + s, cur[1] - s, cur[2] + s, cur[3] - s];
  if (!(next[0] > 0 && next[1] > 0 && next[2] >= 0 && next[3] >= 0)) { $('hint').textContent = t('foldDesignErr_shiftOut'); return; }
  ids.forEach((id, i) => { $(id).value = String(+next[i].toFixed(2)); });
  refreshFoldWidth(); refreshFoldPitch(); liveFoldDesign();
}
/** 三つ折りの設計のサンプル図：欄（または欄の上のマウス）に対応する寸法を金色に光らせる（事業主指示 2026-10-15）。図の data-k と欄の対応。 */
const FD_DIAGRAM = { fdDL: 'dl', fdDR: 'dr', fdW: 'w', fdCL: 'cl', fdCR: 'cr', fdRL: 'rl', fdRR: 'rr', fdTO: 'to', fdTI: 'ti', fdShift: 'shift', fdNudgeL: 'shift', fdNudgeR: 'shift', fdRingOn: 'ring', fdRingSpec: 'ring', fdRingDia: 'ring', fdRingPos: 'ring', fdStackT: 'stack', fdRefillDir: 'stack' };
/** 三つ折りの設計の欄を選んでいる間、いま描いている断面の上に、対応する寸法線（矢印と番号）を金色で重ねる（事業主指示 2026-10-15）。座標は design.js の foldDimensions。 */
let fdDimKey = null;
function fdDimItems(key) {
  if (!key || !doc.foldDesign) return null;
  const rf = doc.shapes.find(s => s.foldSec === 'fd' && s.role === 'refills')?.points; return foldDimensions(doc.foldDesign, key, { refill: rf ? [rf[1], rf[2]] : null });
}
/** 寸法線が画面の外に出るときだけ、表示位置を（拡大率は変えずに）ずらして画面に入れる。寸法線が画面より大きいときは何もしない。 */
function revealFdDims(items) {
  const xs = [], ys = []; for (const it of items) { if (it.type === 'line') { xs.push(it.a.x, it.b.x); ys.push(it.a.y, it.b.y); } else { xs.push(it.x); ys.push(it.y); } }
  if (!xs.length) return; const m = 28, x0 = Math.min(...xs) * scale + origin.x, x1 = Math.max(...xs) * scale + origin.x, y0 = Math.min(...ys) * scale + origin.y, y1 = Math.max(...ys) * scale + origin.y;
  if (x1 - x0 > width - 2 * m || y1 - y0 > height - 2 * m) return;
  const dx = x0 < m ? m - x0 : x1 > width - m ? width - m - x1 : 0, dy = y0 < m ? m - y0 : y1 > height - m ? height - m - y1 : 0; if (dx || dy) { origin.x += dx; origin.y += dy; }
}
function drawFoldDims() {
  const items = fdDimItems(fdDimKey); if (!items) return;
  const gold = '#f0b429', k = 1 / scale, head = (x, y, ang) => { const L = 9 * k, W = 4.5 * k, c = Math.cos(ang), n = Math.sin(ang); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - L * c + W * n, y - L * n - W * c); ctx.lineTo(x - L * c - W * n, y - L * n + W * c); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.strokeStyle = gold; ctx.fillStyle = gold; ctx.lineJoin = 'round';
  for (const it of items) {
    if (it.type === 'line') {
      ctx.setLineDash(it.dash ? [4 * k, 3 * k] : []); ctx.lineWidth = (it.dash ? 1.2 : 2.2) * k; ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke(); ctx.setLineDash([]);
      const ang = Math.atan2(it.b.y - it.a.y, it.b.x - it.a.x); if (it.arrows !== 'none') head(it.b.x, it.b.y, ang); if (it.arrows === 'both') head(it.a.x, it.a.y, ang + Math.PI);
    } else if (it.type === 'dot') { ctx.beginPath(); ctx.arc(it.x, it.y, 3.5 * k, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.font = `700 ${22 * k}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4 * k; ctx.strokeStyle = '#000'; ctx.strokeText(it.text, it.x, it.y); ctx.fillStyle = gold; ctx.fillText(it.text, it.x, it.y); ctx.strokeStyle = gold; }
  }
  ctx.restore();
}
/** 取っ手：実際の断面の上の金色の小さな四角。つかんで横へドラッグすると、欄の数値が変わり断面が作り直される（元に戻すは1回）。「三つ折りの設計」カードを開いていて、選択モードのときだけ出る。 */
const FD_HANDLE_FIELDS = [['fdDL', 'dL'], ['fdDR', 'dR'], ['fdCL', 'cL'], ['fdCR', 'cR'], ['fdRL', 'rinL'], ['fdRR', 'rinR']];
const foldHandleList = () => mode === 'select' && !exporting && doc.foldDesign && ($('foldDesignCard')?.open === true || doc.shapes.some(s => s.foldSec === 'fd' && selected.has(s.id))) ? (foldHandles(doc.foldDesign) ?? []) : []; /* 設計カードを開いているか、断面を選んでいるとき、断面の寸法の取っ手が出る */
function foldHandleAt(p) {
  const w = world(p), r = 10 / scale; let best = null, bd = Infinity;
  for (const h of foldHandleList()) { const dd = Math.hypot(h.x - w.x, h.y - w.y); if (dd <= r && dd < bd) { best = h; bd = dd; } }
  return best;
}
let fdHandleHot = null;
function drawFoldHandles() {
  const list = foldHandleList(); if (!list.length) return; const k = 1 / scale, a = (gesture?.kind === 'foldHandle' ? gesture.h.key : fdHandleHot);
  ctx.save(); ctx.lineWidth = 1.5 * k; ctx.setLineDash([]);
  for (const h of list) { const sz = (h.key === a ? 6 : 4.5) * k; ctx.fillStyle = h.key === a ? '#f0b429' : 'rgba(240,180,41,.55)'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.rect(h.x - sz, h.y - sz, 2 * sz, 2 * sz); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
/** 図面に保存されている三つ折りの設計の値を、設計カードの数値欄へ書き戻す。図面を開いた・前回の続きを開いた・タブを切り替えた・元に戻したときなど、欄が図面の設計とずれていると、
 *  取っ手のドラッグや欄の入力で断面を作り直すときに、ずれた欄の値（ほかの寸法・厚み・リング）を読んでしまい、寸法が変わらない・別の形になる（事業主指摘 2026-10-15）。 */
let foldSyncDoc = null;
function syncFoldFields() {
  const d = doc.foldDesign; if (!d) return; const set = (id, v) => { const el = $(id); if (el && v !== undefined && v !== null && String(el.value) !== String(v)) el.value = String(v); };
  for (const [id, k] of FD_HANDLE_FIELDS) set(id, d[k]);
  set('foldSecT', d.t); set('fdTO', d.tOuter); set('fdTI', d.tInner); if ($('fdFlip')) $('fdFlip').checked = d.flipV !== false;
  if ($('fdRingOn')) $('fdRingOn').checked = !!d.ring;
  if (d.ring) { set('fdRingPos', d.ring.pos); set('fdStackT', d.ring.stackT); set('fdRefillDir', d.ring.dir === 'v' ? 'v' : 'h'); if ([...($('binderSpecSel')?.options || [])].some?.(o => o.value === d.ring.specId)) { set('binderSpecSel', d.ring.specId); const sp = binderSpec(d.ring.specId); if (sp && $('ringD')) fillRingOptions($('ringD'), sp); } /* 規格を替えたら、リング径の選択肢もその規格の一覧に作り直す（前の規格の一覧が残ると、Micro5 なのに 25〜40 が出て 20 が選べなかった・事業主指摘 2026-10-17） */ set('ringD', d.ring.ringD); if ($('ringD') && !Array.from($('ringD').children || []).some(o => o.value === $('ringD').value)) { const sp = binderSpec($('binderSpecSel').value); if (sp) $('ringD').value = String(sp.rings.diameterOptionsMm[0]); } syncFoldRingSelects(); }
  refreshFoldWidth(); refreshFoldPitch();
}
function startFoldHandleDrag(h, w) {
  syncFoldFields(); const d = doc.foldDesign; designUndoLen = -1;   /* ドラッグ全体を、新しい「元に戻す」1回にする */
  gesture = { kind: 'foldHandle', h, start: w, vals: Object.fromEntries(FD_HANDLE_FIELDS.map(([, k]) => [k, d[k]])) }; setFdDimKey(h.dim);
  $('hint').textContent = t('foldHandleDrag'); draw();
}
function dragFoldHandle(w) {
  const g = gesture, v = g.vals; let dx = Math.round((w.x - g.start.x) * 10) / 10; const set = (id, val) => { $(id).value = String(Math.round(val * 100) / 100); };
  switch (g.h.key) {
    case 'btn': { dx = Math.max(-Math.min(v.dL - 0.1, v.cL), Math.min(dx, Math.min(v.dR - 0.1, v.cR))); set('fdDL', v.dL + dx); set('fdDR', v.dR - dx); set('fdCL', v.cL + dx); set('fdCR', v.cR - dx); break; }   /* ボタン線を右へ dx：左の距離は＋dx・右の距離は−dx（全幅は変わらない） */
    case 'dl': set('fdDL', Math.max(0.1, v.dL - dx)); break;
    case 'dr': set('fdDR', Math.max(0.1, v.dR + dx)); break;
    case 'cl': set('fdCL', Math.max(0, v.cL - dx)); break;
    case 'cr': set('fdCR', Math.max(0, v.cR + dx)); break;
    case 'rl': set('fdRL', Math.max(0.1, v.rinL - dx)); break;
    case 'rr': set('fdRR', Math.max(0.1, v.rinR + dx)); break;
  }
  refreshFoldWidth(); refreshFoldPitch(); liveFoldDesign();
}
/** ドラッグを離したとき：成り立たない寸法で断面が作り直せなかったときは、欄を直前の正しい値へ戻す。 */
function endFoldHandleDrag() {
  const d = doc.foldDesign; if (d) for (const [id, k] of FD_HANDLE_FIELDS) if (Number($(id).value) !== d[k]) $(id).value = String(d[k]);
  refreshFoldWidth(); refreshFoldPitch(); setFdDimKey(null);
}
/** 円の点（0°・45°…の8か所）：円を1つだけ選んでいるとき、その点をつかんでドラッグすると、中心はそのままで半径が変わる（離したとき確定・元に戻すは1回・磁石に吸い付く）。事業主指示 2026-10-15 */
let circleHot = null;
const selectedCircle = () => mode === 'select' && !exporting && selected.size === 1 ? doc.shapes.find(x => selected.has(x.id) && x.type === 'circle' && editable(x)) ?? null : null;
function circleHandleHit(w) {
  const sc = selectedCircle(); if (!sc) return null; let best = null, bd = 9 / scale;
  for (let k = 0; k < 8; k++) { const q = circlePoint(sc, k * 45), dd = distance(q, w); if (dd <= bd) { best = { shape: sc, k }; bd = dd; } }
  return best;
}
/** 回転の取っ手：選択ツールで図形を選ぶと、選んだ図形の外接の四角の上に出る丸。つかんで回すと、図形の中心まわりに回る（Shift で15°ずつ）。離したとき確定・元に戻すは1回。 */
function rotateTargets() { return mode === 'select' ? doc.shapes.filter(s => selected.has(s.id) && editable(s) && s.type !== 'image') : []; }
function rotateGeom() {
  const list = rotateTargets(); if (!list.length) return null; let b; try { b = bboxOfDoc({ shapes: list, holes: [] }); } catch { return null; } if (!b || !Number.isFinite(b.minX)) return null;
  const c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }; return { list, c, handle: { x: c.x, y: b.minY - 26 / scale }, top: { x: c.x, y: b.minY } };
}
const rotateHandleHit = w => { const g = rotateGeom(); return g && distance(g.handle, w) <= 9 / scale ? g : null; };
const angleOf = (c, p) => Math.atan2(p.y - c.y, p.x - c.x) * 180 / Math.PI;
function rotateAngleNow(g, p, shift) { let a = angleOf(g.c, p) - g.a0; a = ((a + 540) % 360) - 180; if (shift) a = Math.round(a / 15) * 15; return Math.round(a * 100) / 100; }
function drawRotateHandle() {
  const live = gesture?.kind === 'rotate' ? gesture : null, g = live ? { c: live.c, list: rotateTargets() } : rotateGeom(); if (!g || (live && !g.list.length)) return; const k = 1 / scale;
  ctx.save(); ctx.setLineDash([]);
  if (live) { ctx.save(); ctx.translate(g.c.x, g.c.y); ctx.rotate(live.angle * Math.PI / 180); ctx.translate(-g.c.x, -g.c.y); ctx.lineWidth = 1.5 * k; for (const s of g.list) strokeShape(s, '#f0b429', true); ctx.restore(); ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1 * k; ctx.setLineDash([3 * k, 3 * k]); ctx.beginPath(); ctx.moveTo(g.c.x, g.c.y); ctx.lineTo(live.cursor.x, live.cursor.y); ctx.stroke(); ctx.setLineDash([]); }
  else { const gg = rotateGeom(); ctx.strokeStyle = 'rgba(240,180,41,.6)'; ctx.lineWidth = 1 * k; ctx.beginPath(); ctx.moveTo(gg.top.x, gg.top.y); ctx.lineTo(gg.handle.x, gg.handle.y); ctx.stroke(); ctx.fillStyle = 'rgba(240,180,41,.85)'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(gg.handle.x, gg.handle.y, 5 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function drawCircleHandles() {
  const g = gesture?.kind === 'circleR' ? gesture : null, sc = g ? doc.shapes.find(x => x.id === g.id) : selectedCircle(); if (!sc) return; const k = 1 / scale, r = g ? g.r : sc.r;
  ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.5 * k;
  if (g) { ctx.strokeStyle = '#f0b429'; ctx.setLineDash([4 * k, 3 * k]); ctx.beginPath(); ctx.arc(g.cx, g.cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  for (let i = 0; i < 8; i++) { const q = circlePoint({ cx: sc.cx, cy: sc.cy, r }, i * 45), z = (i === circleHot || g ? 6 : 4.5) * k; ctx.fillStyle = g || i === circleHot ? '#f0b429' : 'rgba(240,180,41,.6)'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(q.x, q.y - z); ctx.lineTo(q.x + z, q.y); ctx.lineTo(q.x, q.y + z); ctx.lineTo(q.x - z, q.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
/** 矩形の取っ手：縦横に平らな四角（4つの角の閉じた折れ線）を1つだけ選んでいるとき、四隅に出る。隅をつかむ＝対角の隅を固定して広げ縮め（Shift で縦横比を保つ）。角だけを動かして形を変えたいときは Alt を押しながらつかむ。辺の真ん中は、これまでどおり「つかんで移動」に使う（磁石）。離したとき確定・元に戻すは1回（事業主指示 2026-10-15・円と同じ）。 */
function rectBoxOf(sh) {
  if (!sh || sh.type !== 'polyline' || !sh.closed || sh.points.length !== 4) return null; const pts = sh.points, xs = [...new Set(pts.map(q => +q.x.toFixed(6)))], ys = [...new Set(pts.map(q => +q.y.toFixed(6)))];
  if (xs.length !== 2 || ys.length !== 2) return null; for (const x of xs) for (const y of ys) if (!pts.some(q => Math.abs(q.x - x) < 1e-6 && Math.abs(q.y - y) < 1e-6)) return null;
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
const selectedRect = () => mode === 'select' && !exporting && selected.size === 1 ? (sh => sh && rectBoxOf(sh) ? sh : null)(doc.shapes.find(x => selected.has(x.id) && editable(x))) : null;
const rectHandlePoints = b => [[-1, -1, b.x0, b.y0], [1, -1, b.x1, b.y0], [1, 1, b.x1, b.y1], [-1, 1, b.x0, b.y1]].map(([ix, iy, x, y]) => ({ ix, iy, x, y }));
function rectHandleHit(w) {
  const sh = selectedRect(); if (!sh) return null; let best = null, bd = 9 / scale; for (const h of rectHandlePoints(rectBoxOf(sh))) { const dd = distance(h, w); if (dd <= bd) { best = h; bd = dd; } }
  return best ? { shape: sh, h: best } : null;
}
function rectResized(g, c, shift) {
  const b = g.box0, fx = g.h.ix === 1 ? b.x0 : g.h.ix === -1 ? b.x1 : null, fy = g.h.iy === 1 ? b.y0 : g.h.iy === -1 ? b.y1 : null;
  let x0 = b.x0, x1 = b.x1, y0 = b.y0, y1 = b.y1;
  if (g.h.ix) { x0 = fx; x1 = c.x; } if (g.h.iy) { y0 = fy; y1 = c.y; }
  if (g.h.ix && g.h.iy && shift) { const w0 = b.x1 - b.x0, h0 = b.y1 - b.y0, nw = Math.abs(x1 - x0), sy = Math.sign(y1 - y0) || 1; y1 = y0 + sy * nw * (h0 / (w0 || 1)); }
  const box = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) }; return box.x1 - box.x0 < 0.05 || box.y1 - box.y0 < 0.05 ? g.box : box;
}
let rectHot = null;
function drawRectHandles() {
  const g = gesture?.kind === 'rectR' ? gesture : null, sh = g ? doc.shapes.find(x => x.id === g.id) : selectedRect(); if (!sh) return; const k = 1 / scale, b = g ? g.box : rectBoxOf(sh);
  ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.5 * k;
  if (g) { ctx.strokeStyle = '#f0b429'; ctx.setLineDash([4 * k, 3 * k]); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.setLineDash([]); }
  rectHandlePoints(b).forEach((h, i) => { const z = (g || i === rectHot ? 6 : 4.5) * k; ctx.fillStyle = g || i === rectHot ? '#f0b429' : 'rgba(240,180,41,.6)'; ctx.strokeStyle = '#000'; ctx.fillRect(h.x - z, h.y - z, 2 * z, 2 * z); ctx.strokeRect(h.x - z, h.y - z, 2 * z, 2 * z); });
  ctx.restore();
}
function setFdDimKey(key) { if (fdDimKey === key) return; fdDimKey = key; const items = fdDimItems(key); if (items) revealFdDims(items); draw(); }
function highlightFoldDiagram(id) {
  const key = FD_DIAGRAM[id]; if (!key) return false; setFdDimKey(key);
  for (const g of $('fdDiagram')?.querySelectorAll?.('[data-k]') ?? []) g.classList.toggle('hl', g.dataset.k === key);
  return true;
}
/** サンプル図の拡大表示（右メニューの幅では番号が小さいため・事業主指摘 2026-10-15）：図をクリックで画面中央に大きく出し、①〜⑫の欄の名前を並べる。もう一度クリックか Esc で閉じる。 */
const FD_ORDER = ['fdDL', 'fdDR', 'fdW', 'fdCL', 'fdCR', 'fdRL', 'fdRR', 'fdTO', 'fdTI', 'fdShift', 'fdRingPos', 'fdStackT'];
const fdDiagramLegend = () => FD_ORDER.map(id => t(id));
function toggleFdDiagramBig(open) {
  const old = document.getElementById?.('fdDiagramBig'); if (old) old.remove(); if (!open || !$('fdDiagram')?.cloneNode) return;
  const box = document.createElement('div'); box.id = 'fdDiagramBig'; const clone = $('fdDiagram').cloneNode(true); clone.removeAttribute('id'); box.appendChild(clone);
  const ol = document.createElement('ol'); for (const text of fdDiagramLegend()) { const li = document.createElement('li'); li.textContent = text; ol.appendChild(li); } box.appendChild(ol);
  box.onclick = () => toggleFdDiagramBig(false); document.body.appendChild(box);
}
function initFoldSection() {
  const card = $('foldDesignCard'), fieldOf = e => e.target?.id || e.target?.closest?.('label')?.querySelector?.('input,select')?.id;
  $('fdDiagram').onclick = () => toggleFdDiagramBig(true); document.addEventListener?.('keydown', e => { if (e.key === 'Escape') toggleFdDiagramBig(false); });
  card.addEventListener('focusin', e => highlightFoldDiagram(e.target?.id)); card.addEventListener('focusout', e => { if (!card.contains?.(e.relatedTarget)) setFdDimKey(null); }); card.addEventListener('mouseleave', () => { if (!card.contains?.(document.activeElement)) setFdDimKey(null); }); card.addEventListener('mouseover', e => highlightFoldDiagram(fieldOf(e))); $('foldSecMake').onclick = makeFoldSection; $('foldCutY').addEventListener('change', () => { const raw = $('foldCutY').value.trim(), n = Number(raw); if (raw !== '' && !Number.isFinite(n)) return; setFoldCutY(raw === '' ? undefined : n); }); $('foldCutPick').onclick = () => { setMode('select'); foldCutPicking = true; $('hint').textContent = t('foldCutPickHint'); }; $('foldCutClear').onclick = () => { foldCutPicking = false; setFoldCutY(undefined); syncFoldCutField(); $('hint').textContent = t('foldCutCleared'); draw(); }; $('foldSecApply').onclick = applyFoldSection; $('foldRadApply').onclick = applyFoldRadii; $('fdMake').onclick = () => makeFoldDesign(false); $('fdFix').onclick = fixFoldDesign; $('fdStitch').onclick = () => projectFoldDesign(true); $('fdUnfold').onclick = unfoldFoldDesign; for (const id of ['fdRingPos', 'fdStackT']) $(id).oninput = liveFoldDesign; for (const id of ['fdTO', 'fdTI']) $(id).oninput = () => { refreshFoldPitch(); liveFoldDesign(); }; $('fdRingOn').onchange = liveFoldDesign; $('fdFlip').onchange = liveFoldDesign; $('fdRefillDir').onchange = liveFoldDesign; $('fdRingSpec').onchange = () => { $('binderSpecSel').value = $('fdRingSpec').value; onBinderChange(); }; $('fdRingDia').onchange = () => { $('ringD').value = $('fdRingDia').value; onBinderChange(); }; syncFoldRingSelects(); for (const id of ['fdDL', 'fdDR', 'fdCL', 'fdCR', 'fdRL', 'fdRR']) $(id).oninput = () => { if (id === 'fdDL' || id === 'fdDR') refreshFoldWidth(); refreshFoldPitch(); liveFoldDesign(); }; $('fdW').oninput = setFoldWidth; $('fdNudgeL').onclick = () => nudgeFoldButton(-1); $('fdNudgeR').onclick = () => nudgeFoldButton(1); refreshFoldWidth(); $('fdPitch').oninput = refreshFoldPitch; $('foldSecT').oninput = refreshFoldPitch; refreshFoldPitch(); $('foldBaseMake').onclick = makeFoldBaselines; }
// ---- 計算メモ（2026-10-16 事業主指示）：式を画面で計算し、「式＝結果＋コメント」を図面（doc.calcMemos）に残す。図面タブごと・図面（.json）と一緒に保存・元に戻せる ----
let calcAns, calcKey = null; /* calcAns＝直前の答え（式の ans）。calcKey＝一覧を描き直すかの目印 */
const calcMsg = r => r.error ? t({ empty: 'calcErrEmpty', syntax: 'calcErrSyntax', div: 'calcErrDiv' }[r.error]) : '＝ ' + fmtCalc(r.value);
function calcLive() { const txt = $('calcExpr').value; if (!txt.trim()) { $('calcResult').textContent = ''; return null; } const r = calcExpr(txt, { ans: calcAns }); $('calcResult').textContent = calcMsg(r); return r; }
function calcEnter() { const r = calcLive(); if (r && r.value !== undefined) calcAns = r.value; }
function calcSaveMemo() {
  const txt = $('calcExpr').value.trim(), r = calcExpr(txt, { ans: calcAns }); if (r.error) { $('calcResult').textContent = calcMsg(r); return; }
  const expr = /ans|答/i.test(txt) ? txt.replace(/ans|答/gi, '(' + fmtCalc(calcAns) + ')') : txt, note = $('calcNote').value.trim().slice(0, 100); /* ans は、そのときの数に置き換えて残す（メモだけで読める） */
  commit(() => { const list = (doc.calcMemos ||= []); list.push({ id: freshId(list, 'm'), expr, result: r.value, note }); });
  calcAns = r.value; $('calcExpr').value = ''; $('calcNote').value = ''; $('calcResult').textContent = ''; $('hint').textContent = t('calcSaved', { expr, result: fmtCalc(r.value) });
}
/** 計算メモの結果を、図面の文字（テキスト図形）にして、見えている図面の中央に置く。文字は「コメント ＝ 結果」（コメントが無ければ「式 ＝ 結果」）。 */
function placeCalcMemo(m) {
  const layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id;
  if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const text = (m.note || m.expr) + ' ＝ ' + fmtCalc(m.result), at = world({ x: width / 2, y: height / 2 });
  cancel(); commit(() => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, type: 'text', x: +at.x.toFixed(3), y: +at.y.toFixed(3), text, sizeMm: Number($('textSize').value) || 5, angleDeg: 0 }); selected = new Set([id]); });
  renderLayers(); $('hint').textContent = t('calcPlaced', { text });
}
function refreshCalcCard() {
  const list = doc.calcMemos || [], key = JSON.stringify(list) + t('calcUse') + t('calcPlace'); if (key === calcKey) return; calcKey = key;
  const ul = $('calcList'); ul.textContent = ''; $('calcEmptyMsg').hidden = list.length > 0;
  for (const m of list) {
    const li = document.createElement('li'), line = document.createElement('span'), use = document.createElement('button'), del = document.createElement('button');
    line.className = 'calcLine'; line.textContent = m.expr + ' ＝ ' + fmtCalc(m.result); li.appendChild(line);
    if (m.note) { const n = document.createElement('span'); n.className = 'calcNoteText'; n.textContent = m.note; li.appendChild(n); }
    const place = document.createElement('button'); place.className = 'calcPlace'; place.textContent = t('calcPlace'); place.onclick = () => placeCalcMemo(m);
    use.className = 'calcUse'; use.textContent = t('calcUse'); use.onclick = () => { $('calcExpr').value = fmtCalc(m.result); calcLive(); $('calcExpr').focus?.(); };
    del.className = 'calcDel'; del.textContent = t('calcDel'); del.onclick = () => commit(() => { doc.calcMemos = (doc.calcMemos || []).filter(x => x.id !== m.id); if (!doc.calcMemos.length) delete doc.calcMemos; });
    li.appendChild(place); li.appendChild(use); li.appendChild(del); ul.appendChild(li);
  }
}
function initCalc() {
  $('calcExpr').addEventListener('input', calcLive);
  $('calcExpr').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); calcEnter(); } });
  $('calcNote').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); calcSaveMemo(); } });
  $('calcSave').onclick = calcSaveMemo;
}
function initPhrases() {
  loadPhrases();
  $('phraseExport').onclick = exportPhrases; $('phraseImport').onclick = () => $('phraseFile').click();
  $('phraseFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { importPhrasesText(await f.text()); } catch { $('hint').textContent = t('phraseFileInvalid'); } });
  $('phraseSel').addEventListener('change', () => renderPhraseList($('phraseSel').value));
  $('phraseSave').onclick = savePhrase; $('phraseDelete').onclick = deletePhrase; $('phrasePlace').onclick = () => setMode('phrase');
}
/** 背幅シミュレーションの結果で、表紙の展開図（外形＝部品・折り線2本・背の中央に金具）を新しいタブに描く。ポケットは作らない（事業主決定A・2026-10-12）。 */
function drawCoverFromSpine() {
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0]; if (!spec) return;
  const r = renderSpineSim(); if (!r) return;
  const p = spineParams(), tm = Number($('spMarginTB').value), em = Number($('spMarginEdge').value), rw = spec.refill?.wMm, rh = spec.refill?.hMm;
  if (!(tm >= 0) || !(em >= 0) || !(rw > 0) || !(rh > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const c = coverLayout({ refillW: rw, refillH: rh, spineW: r.spineW, marginTB: tm, marginEdge: em }), nameOf = x => document.documentElement.lang === 'en' ? x.names.en : x.names.ja;
  const it = DATA_HARDWARE.items.find(i => i.id === 'binder-' + (spec.parent || spec.id));
  newTab(t('spineCoverTab', { name: nameOf(spec) }));
  cancel(); commit(() => {
    const d = newDoc(); d.tools = loadTools();
    d.shapes.push({ id: 's1', layer: 'pattern', type: 'polyline', closed: true, points: [{ x: 0, y: 0 }, { x: c.W, y: 0 }, { x: c.W, y: c.H }, { x: 0, y: c.H }] });
    for (const x of c.folds) d.shapes.push({ id: freshId(d.shapes, 's'), layer: 'pattern', type: 'fold', x1: x, y1: 0, x2: x, y2: c.H, angleDeg: 90, partId: 'cover', inner: true });
    d.parts.push({ id: 'cover', name: t('part.cover'), thickness: p.leatherT, shapeIds: ['s1'], color: null, order: 0, role: 'cover' });
    d.provenance = [{ source: 'spineCover', at: new Date().toISOString() }];
    doc = d; syncMarkLines(); selected.clear(); manualNext = null; nodeSel = null; refreshTools();
    if (it) { const overrides = { ringD: p.ringD, ...(spec.id !== it.params.spec ? { spec: spec.id } : {}) }; try { selected = new Set(addHardwareDrafts(hardwareDrafts(it, overrides, spec, c.center, 90), nextGroupId(doc.shapes))); } catch { /* 金具が置けなくても表紙は残す */ } }
  });
  tabs[activeTab].doc = doc; pairLines = []; renderLayers(); renderSeams(); fit();
  $('hint').textContent = t('spineCoverDone', { w: c.W, h: c.H, spine: c.spineW });
}
let binderViewTarget = null; /* 三つの図のダイアログを開いたときの規格・リング径（図面に置くボタンが使う） */
/** 金具の図（平面・側面・正面）の1つを、画面の中央に、金具の層・グループで置く。 */
function placeBinderView(which) {
  const tg = binderViewTarget; if (!tg) return; const raw = binderViewDrawing(tg.spec, tg.ringD, which);
  const xs = raw.flatMap(s => s.type === 'polyline' ? s.points.map(p => p.x) : [s.cx - s.r, s.cx + s.r]), ys = raw.flatMap(s => s.type === 'polyline' ? s.points.map(p => p.y) : [s.cy - s.r, s.cy + s.r]);
  const c = world({ x: width / 2, y: height / 2 }), dx = c.x - (Math.min(...xs) + Math.max(...xs)) / 2, dy = c.y - (Math.min(...ys) + Math.max(...ys)) / 2, view = t(which === 'plan' ? 'binderViewPlan' : which === 'side' ? 'binderViewSide' : 'binderViewFront').replace(/（.*$/, '');
  commit(() => {
    if (!doc.layers.some(l => l.id === 'hardware')) doc.layers.push({ id: 'hardware', name: 'hardware', visible: true, locked: false });
    const gid = nextGroupId(doc.shapes);
    for (const s of raw) doc.shapes.push({ ...(s.type === 'polyline' ? { type: 'polyline', closed: true, points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } : { type: 'circle', cx: s.cx + dx, cy: s.cy + dy, r: s.r }), id: freshId(doc.shapes, 's'), layer: 'hardware', groupId: gid });
  });
  $('hint').textContent = t('binderViewPlaced', { view, n: raw.length }); draw();
}
function showSvgDialog(svg, title) { $('svgBody').innerHTML = svg; $('svgTitle').textContent = title; $('svgDialog').showModal(); }
function initHardware() {
  renderHardware();
  $('hwCategory').addEventListener('change', renderHardware); $('hwItem').addEventListener('change', renderHardware);
  for (const id of ['binderSpecSel', 'ringD']) $(id).addEventListener('change', onBinderChange); $('partThickness').addEventListener('change', renderBinder);
  $('hwPlace').onclick = () => { hwPlaceKind = 'other'; setMode('hardware'); };
  $('binderPlace').onclick = () => { hwPlaceKind = 'binder'; setMode('hardware'); };
  $('binderPlan').onclick = () => { const spec = binderSpec($('binderSpecSel').value); if (spec) { const d = Number($('ringD').value), cap = (k, which) => `<div class="view-cap" style="margin:10px 0 4px;font-weight:bold">${t(k)} <button type="button" data-place-view="${which}">${t('binderViewPlace')}</button></div>`; binderViewTarget = { spec, ringD: d }; showSvgDialog(cap('binderViewPlan', 'plan') + binderPlanSvg(spec, d) + cap('binderViewSide', 'side') + binderSideSvg(spec, d) + cap('binderViewFront', 'front') + binderFrontSvg(spec, d), spec.names.ja); for (const b of $('svgBody').querySelectorAll?.('[data-place-view]') || []) b.onclick = () => { placeBinderView(b.dataset.placeView); $('svgDialog').close(); }; } };
  $('binderData').onclick = () => { const spec = binderSpec($('binderSpecSel').value); if (spec) showBinderData(spec); };
  $('closeSvg').onclick = () => $('svgDialog').close();
  $('sideToggle').onclick = () => { const open = document.body.classList.toggle('side-open'); $('sideToggle').textContent = t(open ? 'sideToggleClose' : 'sideToggleOpen'); $('sideToggle').setAttribute('aria-expanded', String(open)); resize(); };   /* スマホ：カード群の引き出しを開け閉め */
  $('spCoverDraw').onclick = drawCoverFromSpine;
  $('hdrMore').onclick = () => { const h = document.querySelector?.('header'); if (!h) return; const open = h.classList.toggle('hdr-open'); $('hdrMore').setAttribute('aria-expanded', String(open)); };   /* スマホ：ヘッダーの残りの設定を出し入れ */
  $('binderEditData').onclick = openBinderEdit; $('bdEditSave').onclick = saveBinderEdit; $('bdEditReset').onclick = resetBinderEdit; $('bdEditCsv').onclick = exportBinderEditsCsv; $('bdEditClose').onclick = () => $('bdEditDialog').close();
  $('bdeAddRing').onclick = () => { const i = bdeRingCount++; $('bdeRingRows').insertAdjacentHTML?.('beforeend', bdeRingRow(i)); bdeWireRing(i); };
  $('bdeAddMount').onclick = () => { const i = bdeMountCount++; $('bdeMountRows').insertAdjacentHTML?.('beforeend', bdeMountRow(i)); bdeWireMount(i); };
}

// ---- ペン（連続ベジェ）・テキスト・寸法・トリム・線対称 ----
function finishPath(closed = false) {
  if (stage?.kind !== 'path') return;
  const nodes = stage.nodes; stage = null;
  if (nodes.length < (closed ? 3 : 2)) { draw(); return; }
  addShape({ type: 'path', nodes, closed }); draw();
}
function penRelease(start, end, dragged) {
  if (!stage || stage.kind !== 'path') stage = { kind: 'path', nodes: [] };
  const node = dragged ? pathNode(start.x, start.y, { x: 2 * start.x - end.x, y: 2 * start.y - end.y }, end, true) : pathNode(start.x, start.y);
  if (stage.nodes.length && distance(stage.nodes.at(-1), node) < 1e-8) return;
  stage.nodes.push(node);
}
function pathPreview() { if (stage?.kind !== 'path' || !stage.nodes.length) return null; return { type: 'path', closed: false, nodes: [...stage.nodes, pathNode(cursor.x, cursor.y)] }; }
/** 節点編集中の path を返す（ドラッグのプレビューと確定で共用）。 */
function editedNodePath(s, g, p) {
  const nodes = s.nodes.map(n => ({ ...n })), n = nodes[g.index];
  if (g.part === 'anchor') { const dx = p.x - n.x, dy = p.y - n.y; n.x = p.x; n.y = p.y; n.inX += dx; n.inY += dy; n.outX += dx; n.outY += dy; }
  else {
    const mine = g.part === 'out' ? ['outX', 'outY'] : ['inX', 'inY'], other = g.part === 'out' ? ['inX', 'inY'] : ['outX', 'outY'];
    n[mine[0]] = p.x; n[mine[1]] = p.y;
    if (g.alt) n.smooth = false;
    else if (n.smooth) { const len = Math.hypot(n[other[0]] - n.x, n[other[1]] - n.y), d = Math.hypot(p.x - n.x, p.y - n.y) || 1; n[other[0]] = n.x - (p.x - n.x) / d * (len || d); n[other[1]] = n.y - (p.y - n.y) / d * (len || d); }
  }
  return { ...s, nodes };
}
function nodeHit(s, p) {
  const r = 6 / scale;
  for (let i = 0; i < s.nodes.length; i++) { const n = s.nodes[i];
    if (nodeSel && nodeSel.id === s.id && nodeSel.index === i) { if (distance({ x: n.outX, y: n.outY }, n) > r && distance({ x: n.outX, y: n.outY }, p) <= r) return { index: i, part: 'out' }; if (distance({ x: n.inX, y: n.inY }, n) > r && distance({ x: n.inX, y: n.inY }, p) <= r) return { index: i, part: 'in' }; }
  }
  for (let i = 0; i < s.nodes.length; i++) if (distance(s.nodes[i], p) <= r) return { index: i, part: 'anchor' };
  return null;
}
function askText() { const raw = window.prompt(t('textPrompt'), ''); return raw && raw.trim() ? raw.trim() : null; }
/** トリムの対象を決める。クリックから 7px 以内でいちばん近い線（同じ近さなら後から描いた線）。無ければ 14px まで広げる。線の「あいだの空き」をクリックして、同じ近さの別の線が2本以上あるときは、決められない（reason='ambiguous'）。近くに線が無ければ reason='miss'。（事業主の不具合記録 2026-10-13） */
function trimTarget(p) {
  const same = (x, y) => x.type === 'line' && y.type === 'line' && [[0, 1], [1, 0]].some(([i, j]) => [['x1', 'y1'], ['x2', 'y2']].every(([kx, ky], k) => Math.abs(x[kx] - y[k ? 'x' + (j + 1) : 'x' + (j + 1)]) < 1e-6 && false) || (Math.abs(x.x1 - y['x' + (i + 1)]) < 1e-6 && Math.abs(x.y1 - y['y' + (i + 1)]) < 1e-6 && Math.abs(x.x2 - y['x' + (j + 1)]) < 1e-6 && Math.abs(x.y2 - y['y' + (j + 1)]) < 1e-6));
  for (const px of [7, 14]) {
    let best = null, bd = Infinity; const all = [];
    for (const s of doc.shapes) { if (!editable(s) || !stitchable(s)) continue; const d = distTo(s, p); if (d > px / scale) continue; all.push({ s, d }); if (d <= bd + 1e-9) { best = s; bd = d; } }
    if (!best) continue;
    if (bd > 3 / scale && all.some(c => c.s !== best && c.d - bd <= 1.5 / scale && !same(c.s, best))) return { hit: null, reason: 'ambiguous' }; /* 線の上ではなく、線と線のあいだ：どちらか決められない */
    return { hit: best, reason: null };
  }
  return { hit: null, reason: 'miss' };
}
const nearestTrimTarget = p => trimTarget(p).hit;
/** 図形 hit を、parts（切り分けた図形の並び）で置き換える（commit の中で呼ぶ）。新しい図形の id の並びを返す。菱目は、残る線の上にあるものだけ新しい経路に引き継ぎ、縫い合わせ設定は解除する。 */
function applyShapeParts(hit, parts) {
  const removedPaths = new Set(doc.paths.filter(path => path.shapeIds.includes(hit.id)).map(path => path.id));
  const oldPaths = doc.paths.filter(path => path.shapeIds.includes(hit.id)), oldHoles = doc.holes.filter(h => removedPaths.has(h.pathId));
  doc.paths = doc.paths.filter(path => !path.shapeIds.includes(hit.id));
  doc.holes = doc.holes.filter(h => !removedPaths.has(h.pathId));
  doc.seams = doc.seams.filter(seam => !removedPaths.has(seam.a.pathId) && !removedPaths.has(seam.b.pathId));
  const idx = doc.shapes.findIndex(s => s.id === hit.id); doc.shapes.splice(idx, 1);
  const added = parts.map(part => { const id = freshId(doc.shapes, 's'), { markOf, ...plain } = part; doc.shapes.push({ ...plain, id, layer: hit.layer }); return id; }); /* 目印の直線を切ったときの残りは、普通の点線（目印との結びつきは外す） */
  /* 菱目は、消した区間の上にあるものだけ消し、残った線の上にあるものは、その線の新しい経路に引き継ぐ（位置・向きはそのまま・経路の上の位置 s は計算し直す） */
  for (const oldPath of oldPaths) {
  const keepIds = [...added, ...oldPath.shapeIds.filter(id => id !== hit.id && doc.shapes.some(s => s.id === id))], groups = new Map();
  for (const h of oldHoles.filter(x => x.pathId === oldPath.id)) {
    let best = null, bd = Infinity; for (const id of keepIds) { const s = doc.shapes.find(x => x.id === id), d = s ? distTo(s, { x: h.x, y: h.y }) : Infinity; if (d < bd) { bd = d; best = id; } }
    if (best && bd <= 0.3) { if (!groups.has(best)) groups.set(best, []); groups.get(best).push(h); }   /* 切り口から 0.3mm 以内の穴は残す側に */
  }
  for (const [sid, list] of groups) {
    const np = { ...oldPath, id: freshId(doc.paths, 'p'), shapeIds: [sid], reversed: false, segments: [] }; doc.paths.push(np);
    const route = resolvePath(doc, np); if (route) np.closed = route.closed; /* 切り分けた線は閉じていないことがある。元の経路の「閉じている」を引き継がない（検査に通らなくなる） */
    for (const h of list) doc.holes.push({ ...h, pathId: np.id, s: route ? projectOnPath(route, { x: h.x, y: h.y }).s : 0 });
  }
  }
  return added;
}
const seamsOn = hit => { const ids = new Set(doc.paths.filter(path => path.shapeIds.includes(hit.id)).map(path => path.id)); return doc.seams.some(seam => ids.has(seam.a.pathId) || ids.has(seam.b.pathId)); };
function trimClick(p, keep, byHoles = false) {
  const { hit, reason } = trimTarget(p); if (!hit) { $('hint').textContent = t(reason === 'ambiguous' ? 'trimAmbiguous' : 'trimMiss'); return; }
  let parts;
  if (byHoles) { /* Alt+クリック：その線に打たれた菱目の位置で区切り、クリックした「菱目と菱目の間」の線だけを切る（菱目は残す） */
    const mine = doc.holes.filter(h => holeVisible(h) && distTo(hit, { x: h.x, y: h.y }) < 0.3), cuts = []; /* その線の上（0.3mm 以内）にある菱目。.lcc の菱目のように、線とは別の経路についている穴も数える */
    for (const h of mine) cuts.push(projectOnPath(hit, { x: h.x, y: h.y }).s);
    if (!cuts.length) { $('hint').textContent = t('trimNoHoles'); return; }
    const sc = projectOnPath(hit, p).s, lo = Math.max(...cuts.filter(c => c <= sc), -Infinity), hi = Math.min(...cuts.filter(c => c > sc), Infinity), near2 = [lo, hi].filter(Number.isFinite); /* クリックをはさむ両どなりの菱目の位置だけで切る */
    const all = splitShapeAt(hit, near2); if (all.length < 2) { $('hint').textContent = t('noIntersection'); return; }
    const clicked = all.reduce((b, x) => distTo(x, p) < distTo(b, p) ? x : b); parts = keep ? [clicked] : all.filter(x => x !== clicked);
  } else parts = trimAt(hit, p, doc.shapes.filter(s => visible(s) && stitchable(s)), { keep });
  if (!parts) { $('hint').textContent = t('noIntersection'); return; }
  if (seamsOn(hit) && !window.confirm(t('holeTrimConfirm'))) return; /* 縫い合わせ設定だけは、切ると解除になる（菱目は残る部分に引き継ぐ） */
  cancel();
  commit(() => { selected = new Set(applyShapeParts(hit, parts)); });
}
/** Alt+クリック：クリックした図形を、ほかの図形との交点で区切り、クリックした区間（交点から交点まで）だけを選ぶ。Shift+Alt+クリックで、選んだものに足す。交点が無ければ、図形全体を選ぶ。 */
function selectSpanAt(p, additive, { byHoles = false, auto = false } = {}) {
  const { hit, reason } = trimTarget(p); if (!hit) { if (!auto) $('hint').textContent = t(reason === 'ambiguous' ? 'trimAmbiguous' : 'trimMiss'); return; }
  let parts;
  if (byHoles) { /* Alt+クリック：その線に打たれた菱目の位置で区切り、クリックした「菱目と菱目の間」だけを選ぶ（trimClick と同じ区切り方） */
    const cuts = doc.holes.filter(h => holeVisible(h) && distTo(hit, { x: h.x, y: h.y }) < 0.3).map(h => projectOnPath(hit, { x: h.x, y: h.y }).s);
    if (!cuts.length) { $('hint').textContent = t('trimNoHoles'); return; }
    const sc = projectOnPath(hit, p).s, lo = Math.max(...cuts.filter(c => c <= sc), -Infinity), hi = Math.min(...cuts.filter(c => c > sc), Infinity), all = splitShapeAt(hit, [lo, hi].filter(Number.isFinite));
    if (all.length > 1) { const clicked = all.reduce((b, x) => distTo(x, p) < distTo(b, p) ? x : b); parts = [clicked, ...all.filter(x => x !== clicked)]; }
  } else {
    const others = doc.shapes.filter(s => visible(s) && stitchable(s)), mine = trimAt(hit, p, others, { keep: true }), rest = trimAt(hit, p, others, { keep: false });
    if (mine && rest && rest.length) parts = [...mine, ...rest];
  }
  if (!parts) { selected = additive ? new Set([...selected, hit.id]) : new Set([hit.id]); if (!auto) $('hint').textContent = t('spanWhole'); draw(); return; }
  if (seamsOn(hit)) { if (auto) return; if (!window.confirm(t('holeTrimConfirm'))) return; } /* 縫い合わせ設定がある線は、ふつうのクリックでは切らない */
  cancel();
  let picked = null;
  commit(() => { const added = applyShapeParts(hit, parts), next = additive ? new Set([...selected].filter(id => id !== hit.id)) : new Set(); next.add(added[0]); selected = next; picked = doc.shapes.find(x => x.id === added[0]); });
  const len = picked ? arcLength(picked) : NaN; /* 選んだ区間の長さ（mm）を案内の先頭に出す */
  $('hint').textContent = (Number.isFinite(len) ? t('spanLen', { len: len.toFixed(2) }) + ' ' : '') + t(byHoles ? 'spanHolesSelected' : 'spanSelected');
}
let spanClickTimer = null; /* シングルクリックの予約。ダブルクリックや次の操作が来たら取り消す */
const cancelSpanClick = () => { if (spanClickTimer) { clearTimeout(spanClickTimer); spanClickTimer = null; } };
/** 反転コピーの菱目が順目（keep）のとき、反転後の穴の傾きを元の値に戻す。位置は変えない。 */
function keepHoleSlant(mirrored, original) { return $('mirrorHoles').value === 'keep' && 'pathId' in original ? { ...mirrored, angleDeg: original.angleDeg } : mirrored; }
/** 平行な2本の直線の、ちょうど真ん中を通る軸（点 a・b）。平行でなければ null。 */
function midAxisOf(l1, l2) {
  const v = { x: l1.x2 - l1.x1, y: l1.y2 - l1.y1 }, w = { x: l2.x2 - l2.x1, y: l2.y2 - l2.y1 }, lv = Math.hypot(v.x, v.y), lw = Math.hypot(w.x, w.y); if (lv < 1e-9 || lw < 1e-9) return null;
  const u = { x: v.x / lv, y: v.y / lv }; if (Math.abs(u.x * w.y / lw - u.y * w.x / lw) > 1e-3) return null; /* 平行（約0.06°以内） */
  const a0 = { x: l1.x1, y: l1.y1 }, t = (a0.x - l2.x1) * u.x + (a0.y - l2.y1) * u.y, b0 = { x: l2.x1 + t * u.x, y: l2.y1 + t * u.y }, m = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
  return { a: m, b: { x: m.x + u.x * 10, y: m.y + u.y * 10 } };
}
/** 同じ形で重なっている図形（線・円弧・円・2点の折れ線）を1つにまとめる。reps＝代表の図形の並び・groups＝代表 id → 重なった図形の id の並び・repOf＝図形 id → 代表 id。 */
function dedupeShapeGroups(list) {
  const r3 = v => (Math.round(v * 1000) / 1000).toFixed(3), key = s => {
    if (s.type === 'line' || (s.type === 'polyline' && !s.closed && s.points?.length === 2)) { const a = s.type === 'line' ? [s.x1, s.y1, s.x2, s.y2] : [s.points[0].x, s.points[0].y, s.points[1].x, s.points[1].y], p = [[a[0], a[1]], [a[2], a[3]]].map(q => r3(q[0]) + ',' + r3(q[1])).sort(); return 'L' + p.join(';'); }
    if (s.type === 'arc') return 'A' + [s.cx, s.cy, s.r, s.startDeg, s.endDeg].map(r3).join(','); if (s.type === 'circle') return 'C' + [s.cx, s.cy, s.r].map(r3).join(','); return null;
  }, seen = new Map(), reps = [], groups = new Map(), repOf = new Map();
  for (const s of list) { const k = key(s), first = k ? seen.get(k) : null; if (first) { groups.get(first.id).push(s.id); repOf.set(s.id, first.id); } else { if (k) seen.set(k, s); reps.push(s); groups.set(s.id, [s.id]); repOf.set(s.id, s.id); } }
  return { reps, groups, repOf };
}
/** 同じ形・同じ層・同じ線種・同じ色で重なっている図形の組を返す（[{ ids }]・2本以上の組だけ）。 */
function findOverlaps(list) {
  const byStyle = new Map(); for (const s of list) { const k = [s.layer, s.lineStyle || '', s.color || ''].join('|'); if (!byStyle.has(k)) byStyle.set(k, []); byStyle.get(k).push(s); }
  const out = []; for (const sub of byStyle.values()) { const g = dedupeShapeGroups(sub); for (const ids of g.groups.values()) if (ids.length > 1) out.push({ ids }); } return out;
}
function updateDupBar() { const bar = $('dupBar'); if (!bar) return; bar.hidden = !dupGroups.length || exporting; if (dupGroups.length) $('dupInfo').textContent = t('dupInfo', { n: dupGroups.length }); }
/** 重なった図形を、赤く太く描く（警告）。 */
function drawOverlaps() {
  if (!dupGroups.length) return; ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 0.6; ctx.lineWidth = 5 / scale;
  for (const g of dupGroups) { const s = doc.shapes.find(x => x.id === g.ids[0]); if (s) strokeShape(s, '#ff3b3b', false); }
  ctx.restore();
}
/** 重なった図形を1本にまとめる。菱目の経路・部品が重なった図形の1つを使っていたら、残す1本につけ替える。元に戻すは1回。 */
function mergeOverlaps() {
  const groups = dupGroups.filter(g => g.ids.every(id => { const s = doc.shapes.find(x => x.id === id); return s && editable(s); })); if (!groups.length) return;
  cancel(); let removed = 0;
  commit(() => {
    for (const g of groups) {
      const keep = g.ids.find(id => doc.paths.some(p => p.shapeIds.includes(id))) ?? g.ids[0], drop = new Set(g.ids.filter(id => id !== keep)); removed += drop.size;
      for (const p of doc.paths) if (p.shapeIds.some(id => drop.has(id))) p.shapeIds = [...new Set(p.shapeIds.map(id => drop.has(id) ? keep : id))];
      for (const part of doc.parts) if (part.shapeIds.some(id => drop.has(id))) part.shapeIds = [...new Set(part.shapeIds.map(id => drop.has(id) ? keep : id))];
      doc.shapes = doc.shapes.filter(s => !drop.has(s.id)); selected = new Set([...selected].filter(id => !drop.has(id)));
    }
  });
  $('hint').textContent = t('dupMerged', { k: removed, n: groups.length });
}
function mirrorCopy(a, b) {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  cancel();
  commit(() => {
    const map = new Map(), paths = [...doc.paths], holes = [...doc.holes];
    for (const s of doc.shapes.filter(s => ids.has(s.id))) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...reflectAcross(s, a, b), id }); map.set(s.id, id); }
    for (const p of paths.filter(p => p.shapeIds.every(id => map.has(id)))) {
      const id = freshId(doc.paths, 'p'); doc.paths.push({ ...JSON.parse(JSON.stringify(p)), id, shapeIds: p.shapeIds.map(x => map.get(x)) });
      const route = resolvePath(doc, doc.paths.at(-1));
      for (const h of holes.filter(h => h.pathId === p.id)) {
        const reflected = keepHoleSlant(reflectAcross(h, a, b), h);
        doc.holes.push({ ...reflected, s: route ? projectOnPath(route, reflected).s : h.s, id: freshId(doc.holes, 'h'), pathId: id });
      }
    }
    selected = new Set(map.values()); if (doc.shapes.some(s => ids.has(s.id) && partOf(s))) flipMark(selected);
  });
}
function runCommand(raw) {
  const text = raw.trim(); if (!text) { if (stage?.kind === 'polyline') finishPolyline(); else if (stage?.kind === 'path') finishPath(); return; }
  const base = stage?.cmdLast || stage?.points?.at(-1) || stage?.center || lastPoint, parsed = parseInput(text, base);
  if (!parsed) { $('hint').textContent = t('invalidInput'); return; }
  const point = 'x' in parsed ? parsed : null, value = 'value' in parsed ? parsed.value : null;
  if (mode === 'line') {
    if (!stage || stage.kind !== 'cmd') { if (!point) { $('hint').textContent = t('needPoint'); return; } stage = { kind: 'cmd', start: point, cmdLast: point }; $('hint').textContent = t('lineChainHint'); }
    else { if (!point) { $('hint').textContent = t('needPoint'); return; } if (distance(point, stage.start) < 1e-6) return; addShape({ type: 'line', x1: stage.start.x, y1: stage.start.y, x2: point.x, y2: point.y }); stage = { kind: 'cmd', start: point, cmdLast: point }; lastPoint = point; $('hint').textContent = t('lineChainHint'); }
  } else if (mode === 'polyline') {
    if (!point) { $('hint').textContent = t('needPoint'); return; }
    if (stage?.kind !== 'polyline') stage = { kind: 'polyline', points: [point], cmdLast: point }; else { stage.points.push(point); stage.cmdLast = point; }
    lastPoint = point;
  } else if (mode === 'rect') {
    if (!stage || stage.kind !== 'cmd') { if (!point) { $('hint').textContent = t('needPoint'); return; } stage = { kind: 'cmd', start: point, cmdLast: point }; $('hint').textContent = t('rectSecond'); }
    else { if (!point) { $('hint').textContent = t('needPoint'); return; } const rect = rectShape(stage.start, point); if (!rect) { $('hint').textContent = t('rectFlat'); return; } addShape(rect); lastPoint = point; stage = null; $('hint').textContent = t('hint.rect'); }
  } else if (mode === 'circle') {
    if (!stage || stage.kind !== 'cmd') { if (!point) { $('hint').textContent = t('needPoint'); return; } stage = { kind: 'cmd', center: point, cmdLast: point }; }
    else { if (!(value > 0)) { $('hint').textContent = t('needRadius'); return; } addShape({ type: 'circle', cx: stage.center.x, cy: stage.center.y, r: value }); lastPoint = stage.center; stage = null; }
  } else if (mode === 'arc') {
    if (stage?.kind === 'arc') stage = { kind: 'cmd', center: stage.center, cmdLast: stage.center, steps: [stage.r, stage.startDeg] };
    if (!stage || stage.kind !== 'cmd') { if (!point) { $('hint').textContent = t('needPoint'); return; } stage = { kind: 'cmd', center: point, cmdLast: point, steps: [] }; }
    else { if (value === null) { $('hint').textContent = t('needRadius'); return; } stage.steps.push(value);
      if (stage.steps.length === 3) { const [r, s0, s1] = stage.steps; if (r > 0) addShape({ type: 'arc', cx: stage.center.x, cy: stage.center.y, r, startDeg: s0, endDeg: s1 }); lastPoint = stage.center; stage = null; } }
  } else if (mode === 'dimension' || mode === 'text') {
    if (!point) { $('hint').textContent = t('needPoint'); return; }
    if (mode === 'text') { const content = askText(); if (content) addShape({ type: 'text', x: point.x, y: point.y, text: content, sizeMm: Number($('textSize').value) || 5, angleDeg: 0 }); }
    else if (stage?.kind !== 'dim') stage = { kind: 'dim', a: point, cmdLast: point }; else { addShape({ type: 'dimension', x1: stage.a.x, y1: stage.a.y, x2: point.x, y2: point.y, offset: Number($('dimOffset').value) || 8 }); stage = null; }
    lastPoint = point;
  } else { $('hint').textContent = t('cmdNotHere'); return; }
  $('cmd').value = ''; draw();
}

/** 定規（S）：始点・終点のクリックで、2点間の距離を表示するだけ（寸法の図形は作らない）。次のクリックは測りなおしの始点。 */
function rulerClick(pt) {
  if (stage?.kind !== 'ruler') { ruler = null; stage = { kind: 'ruler', a: pt }; $('hint').textContent = t('rulerSecond'); lastPoint = pt; draw(); return; }
  ruler = { a: stage.a, b: pt }; stage = null; $('hint').textContent = rulerText(ruler) + ' ' + t('rulerAgain'); lastPoint = pt; draw();
}
/** 寸法（D）：1点目・2点目のクリックで測り、3点目をクリックしたときに初めて、その位置（数値の位置）に寸法を作る。それまでは図面に記録しない（画面の見本だけ）。3点目を打たなければ何も作らない（Esc・ツール切替で消える）。 */
/** 寸法の3点目（a→b を測る）から、寸法の「offset」を決める。測る線から3点目までの、符号つきの距離（寸法の図形の向きに合わせる）。
 *  近く（画面の約10px以内）に、向きが平行な既存の寸法線があれば、その寸法線とぴったり同じ位置へ吸着する（事業主指示 2026-10-18：寸法線のラインをそろえる）。{ offset, snap: 相手の寸法線の両端 | null } */
function dimOffsetInfo(a, b, pt) {
  const len = distance(a, b) || 1, v = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }, n = { x: v.y, y: -v.x }, dot = (p, q) => p.x * q.x + p.y * q.y, off = dot({ x: pt.x - a.x, y: pt.y - a.y }, n), tol = 10 / (scale || 1);
  let best = null;
  for (const e of doc.shapes) {
    if (e.type !== 'dimension' || e.foldSec || !visible(e)) continue; const el = distance({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }); if (el < 1e-6) continue;
    const ev = { x: (e.x2 - e.x1) / el, y: (e.y2 - e.y1) / el }, en = { x: ev.y, y: -ev.x }; if (Math.abs(ev.x * v.y - ev.y * v.x) > 1e-3) continue;   /* 平行な寸法だけ */
    const c = dot({ x: e.x1, y: e.y1 }, n) + e.offset * dot(en, n), o = c - dot(a, n), gap = Math.abs(o - off);   /* c＝相手の寸法線の、n 方向の位置 */
    if (gap <= tol && (!best || gap < best.gap)) best = { gap, o, e };
  }
  if (best) { const g = dimension({ x: best.e.x1, y: best.e.y1 }, { x: best.e.x2, y: best.e.y2 }, best.e.offset); return { offset: Math.abs(best.o) < 0.5 ? (best.o < 0 ? -0.5 : 0.5) : best.o, snap: [g.a, g.b] }; }
  const r = Math.round(off * 10) / 10; return { offset: Math.abs(r) < 0.5 ? (r < 0 ? -0.5 : 0.5) : r, snap: null };
}
const dimOffsetFor = (a, b, pt) => dimOffsetInfo(a, b, pt).offset;
function dimToolClick(pt) {
  if (stage?.kind === 'dimPlace') {   /* 3点目：ここで初めて寸法を作る（数値の位置＝3点目） */
    const g = stage; stage = null; addShape({ type: 'dimension', x1: g.a.x, y1: g.a.y, x2: g.b.x, y2: g.b.y, offset: dimOffsetFor(g.a, g.b, pt) });
    const sh = doc.shapes.find(x => x.id === [...selected][0]); if (sh?.type === 'dimension') $('hint').textContent = t('dimPlaced', { off: Math.abs(sh.offset).toFixed(1) }); lastPoint = pt; draw(); return;
  }
  if (stage?.kind !== 'dim') { stage = { kind: 'dim', a: pt }; lastPoint = pt; draw(); return; }
  const a = stage.a; stage = distance(a, pt) > 1e-8 ? { kind: 'dimPlace', a, b: pt } : null; lastPoint = pt;   /* 2点目：まだ図面には何も作らない */
  $('hint').textContent = stage ? rulerText({ a, b: pt }) + ' ' + t('dimPlaceHint') : t('rulerSecond'); draw();
}
/** 定規の測定結果の文言（距離・横・縦・角度。角度は右向きを 0 として反時計回り）。 */
function rulerText({ a, b }) {
  const dx = b.x - a.x, dy = b.y - a.y, deg = ((Math.atan2(-dy, dx) * 180 / Math.PI) % 360 + 360) % 360;
  return t('rulerResult', { d: distance(a, b).toFixed(2), dx: Math.abs(dx).toFixed(2), dy: Math.abs(dy).toFixed(2), a: deg.toFixed(1) });
}
/** 定規ツール中だけ、画面の上に始点・終点の座標と距離の入力欄を出す。クリック・移動に合わせて値を写す（入力中の欄は書き換えない）。 */
function syncRulerBar() {
  const bar = $('rulerBar'); bar.hidden = mode !== 'ruler'; if (bar.hidden) return;
  const cur = stage?.kind === 'ruler' ? { a: stage.a, b: cursor } : ruler, active = typeof document !== 'undefined' ? document.activeElement?.id : '';
  const set = (id, v) => { if (active !== id) $(id).value = v === undefined ? '' : String(Math.round(v * 100) / 100); };
  set('rb-ax', cur?.a.x); set('rb-ay', cur?.a.y); set('rb-bx', cur?.b.x); set('rb-by', cur?.b.y);
  $('rb-out').textContent = cur ? distance(cur.a, cur.b).toFixed(2) + ' mm' : t('rbEmpty');
}
/** 入力欄の4つの数値から測定を作る（全部そろったときだけ）。 */
function rulerFromBar() {
  const v = ['rb-ax', 'rb-ay', 'rb-bx', 'rb-by'].map(id => $(id).value.trim() === '' ? NaN : Number($(id).value));
  if (!v.every(Number.isFinite)) return;
  stage = null; ruler = { a: { x: v[0], y: v[1] }, b: { x: v[2], y: v[3] } }; $('hint').textContent = rulerText(ruler); draw();
}
/** 定規の線・両端・距離の数字を描く（図面の図形ではない）。 */
function drawRuler({ a, b }) {
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = '#4fd0ff'; ctx.fillStyle = '#4fd0ff'; ctx.lineWidth = 1.5 / scale;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  for (const p of [a, b]) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5 / scale, 0, Math.PI * 2); ctx.fill(); }
  const label = distance(a, b).toFixed(2) + ' mm', px = 13 / scale, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  ctx.font = px + 'px sans-serif'; const w = ctx.measureText?.(label)?.width ?? label.length * px * 0.6;
  ctx.fillStyle = 'rgba(20,20,22,0.85)'; ctx.fillRect(mx - w / 2 - 4 / scale, my - px - 6 / scale, w + 8 / scale, px + 6 / scale);
  ctx.fillStyle = '#4fd0ff'; ctx.textAlign = 'center'; ctx.fillText(label, mx, my - 5 / scale); ctx.restore();
}
/** 磁石の候補：端点（線・折れ線の頂点・円弧の両端・ベジェ両端・パス節点）と、円・円弧の中心。 */
function magnetPointsOf(shapes) {
  const ends = [], centers = [], guide = [], runs = straightRuns(shapes), inRun = new Set(runs.flatMap(r => r.ids));   /* inRun：1本の辺が途中で分かれている線（中点は辺全体の1つだけ） */
  for (const s of shapes) {
    const segs = s.type === 'line' || s.type === 'bezier' ? [s] : s.type === 'polyline' ? s.points.slice(0, s.closed ? undefined : -1).map((q, i) => ({ type: 'line', x1: q.x, y1: q.y, x2: s.points[(i + 1) % s.points.length].x, y2: s.points[(i + 1) % s.points.length].y })) : s.type === 'path' ? pathSegments(s) : [];
    for (const g of segs) guide.push({ x: g.x1, y: g.y1 }, ...(inRun.has(s.id) ? [] : [g.type === 'line' ? { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 } : pointAtLength(g, arcLength(g) / 2)]), { x: g.x2, y: g.y2 }); /* 各区間の「中点（長さの真ん中）と両端」 */
    if (s.type === 'arc') guide.push(circlePoint(s, s.startDeg), circlePoint(s, s.startDeg + arcSweep(s) / 2), circlePoint(s, s.endDeg));
    if (s.type === 'line') ends.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    else if (s.type === 'polyline') ends.push(...s.points.map(p => ({ x: p.x, y: p.y })));
    else if (s.type === 'bezier') ends.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    else if (s.type === 'path') ends.push(...s.nodes.map(n => ({ x: n.x, y: n.y })));
    else if (s.type === 'arc') { ends.push(circlePoint(s, s.startDeg), circlePoint(s, s.endDeg)); centers.push({ x: s.cx, y: s.cy }); }
    else if (s.type === 'circle') { centers.push({ x: s.cx, y: s.cy }); for (let k = 0; k < 8; k++) guide.push(circlePoint(s, k * 45)); }
  }
  guide.push(...runs.map(r => ({ ...r.mid })));   /* 分かれた辺の中点は、辺全体の中点 */
  guide.push(...smallLoopCenters(shapes));   /* 小さな菱形・四角の中心（ガイドの点＝近づくと印が出る。常時の十字は出さない・事業主の指摘 2026-10-18「菱穴の中心から直線が引けない」） */
  return { ends, centers, guide };
}
/** 磁石が効く距離(mm)。作図オプションの「吸着距離(px)」を画面倍率で換算。0 以下・不正値は 0＝磁石なし。 */
function magnetRadiusMm() { const px = Number($('snapDist').value); return Number.isFinite(px) && px > 0 ? px / scale : 0; }
const MAGNET_DRAW_MODES = ['ruler', 'line', 'circle', 'arc', 'bezier', 'polyline', 'path', 'dimension', 'fold', 'mirror', 'mark', 'rect', 'text', 'koma', 'hardware', 'library', 'imgScale']; /* 点を置くツール全部で、円の中心・ガイドの点を出して吸着（線や図形を選ぶだけのツールは対象外） */
/** 作図ツール中だけ自動で仮表示する中心点。 */
/** ポインタの近く（画面で 40px 以内）にあるガイドの点。作図ツールのときだけ、磁石が有効（吸着距離が 1px 以上）のときだけ。 */
function guideMarkPoints() {
  if (!(magnetRadiusMm() > 0)) return [];
  const reach = 40 / scale, all = m => [...m.guide, ...m.centers];
  if (mode === 'select') { /* 選択モード：選んだ図形の点（掴む基点の候補）。基点を持って動かしている間は、合わせ先の点 */
    if (gesture?.kind === 'move') return (gesture.targets || []).filter(c => distance(cursor, c) <= reach);
    if (gesture) return []; if (!selected.size) return [];
    return all(magnetPointsOf(doc.shapes.filter(s => visible(s) && selected.has(s.id)))).filter(c => distance(cursor, c) <= reach);
  }
  if (!MAGNET_DRAW_MODES.includes(mode)) return [];
  return magnetGuide.filter(c => distance(cursor, c) <= reach);
}
function centerMarkPoints() { return MAGNET_DRAW_MODES.includes(mode) ? magnetCenters : []; }
/** 交点のうち、ポインタの近く（画面で 40px 以内）にあるもの。常時出すとちかちかするので、近づいたときだけ印を出す（事業主指示 2026-10-13）。 */
function nearJunctions(list) { const reach = 40 / scale; return list.filter(p => distance(cursor, p) <= reach); }
/** 交点の印：端点どうしで接している点＝赤い点、途中で交差している点＝白い縁の赤い点。ポインタが近いものだけ。点滅はしない。 */
function drawJunctions() {
  if (!$('showJunctions').checked) return; const joined = nearJunctions(junctions.joined), loose = nearJunctions(junctions.loose), gapNear = nearJunctions(gaps); if (!joined.length && !loose.length && !gapNear.length) return; const r = 3.5 / scale;
  ctx.save(); ctx.setLineDash([]); ctx.fillStyle = '#ff2a2a';
  for (const p of joined) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 / scale; for (const p of loose) { ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = '#ff9a1f'; ctx.fillStyle = '#ff9a1f'; ctx.lineWidth = 2 / scale; ctx.font = `${12 / scale}px sans-serif`;   /* 切れ目：橙の輪＋隙間の長さ（赤い点は触れている所だけなので、離れている所は別の印） */
  for (const p of gapNear) { ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.9, 0, Math.PI * 2); ctx.stroke(); ctx.fillText(`${p.d.toFixed(2)} mm`, p.x + r * 2.4, p.y - r * 2.4); }
  ctx.restore();
}
function drawCenterMarks() {
  const pts = centerMarkPoints(), near = guideMarkPoints(); if (!pts.length && !near.length) return;
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(138,180,248,0.95)'; ctx.lineWidth = 1.5 / scale; ctx.beginPath();
  for (const c of pts) { ctx.moveTo(c.x - 4 / scale, c.y); ctx.lineTo(c.x + 4 / scale, c.y); ctx.moveTo(c.x, c.y - 4 / scale); ctx.lineTo(c.x, c.y + 4 / scale); }
  for (const c of near) { const r = 5.5 / scale; ctx.moveTo(c.x - r, c.y); ctx.lineTo(c.x, c.y - r); ctx.lineTo(c.x + r, c.y); ctx.lineTo(c.x, c.y + r); ctx.closePath(); } /* ガイドの点＝小さなひし形（中心の十字と区別） */
  ctx.stroke(); ctx.restore();
}
/** 辺（line・円・円弧）の外接の四角 [x0, x1, y0, y1]（余白 1e-6）。交点を計算できない種類は null。rebuildSnaps が、範囲が重ならない辺どうしの交点計算を省くために使う（菱の線 560 個の図面で 7 秒かかっていた）。 */
const edgeBox = e => e.type === 'line' ? [Math.min(e.x1, e.x2) - 1e-6, Math.max(e.x1, e.x2) + 1e-6, Math.min(e.y1, e.y2) - 1e-6, Math.max(e.y1, e.y2) + 1e-6] : (e.type === 'circle' || e.type === 'arc') ? [e.cx - e.r - 1e-6, e.cx + e.r + 1e-6, e.cy - e.r - 1e-6, e.cy + e.r + 1e-6] : null;
function rebuildSnaps() {
  rebuildThreeViewMarks(); rebuildQuad();
  const shapes = doc.shapes.filter(s => visible(s) && stitchable(s));
  const runs = straightRuns(shapes), inRun = new Set(runs.flatMap(r => r.ids));   /* 1本の辺が途中で分かれている線：中点は、辺全体の中点だけ（1本ごとの中点は、上下対称のはずの辺とずれる・事業主の指摘 2026-10-18） */
  snapCache = shapes.flatMap(s => inRun.has(s.id) ? snapPoints(s).slice(0, 2) : snapPoints(s)); snapCache.push(...runs.map(r => ({ ...r.mid }))); snapCache.push(...smallLoopCenters(shapes));
  const magnet = magnetPointsOf(shapes); magnetEnds = magnet.ends; magnetCenters = magnet.centers;
  const holeCenters = doc.holes.filter(h => holeVisible(h)).map(h => ({ x: h.x, y: h.y })), seen = new Set(); /* 画面に見えている穴（目打ちの縫い穴・点の目印）の中心。定規で穴の間隔を測れるように */
  magnetGuide = [...magnet.guide, ...holeCenters].filter(c => { const k = c.x.toFixed(5) + ',' + c.y.toFixed(5); return seen.has(k) ? false : (seen.add(k), true); });
  junctions = $('showJunctions').checked ? classifyJunctions(shapes) : { joined: [], loose: [] };
  gaps = findGaps(shapes.filter(s => !s.holeLink));
  dupGroups = findOverlaps(shapes.filter(s => !s.holeLink)); updateDupBar();
  // 折れ線の各辺、円弧の円も候補にし、円弧の範囲外を除く。
  const edges = shapes.flatMap(s => s.type === 'polyline' ? s.points.slice(0, s.closed ? undefined : -1).map((p, i) => ({ type: 'line', x1: p.x, y1: p.y, x2: s.points[(i + 1) % s.points.length].x, y2: s.points[(i + 1) % s.points.length].y })) : [s]);
  const boxes = edges.map(edgeBox);
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const A = boxes[i], B = boxes[j]; if (!A || !B || A[1] < B[0] || B[1] < A[0] || A[3] < B[2] || B[3] < A[2]) continue;   /* 範囲が重ならない辺どうしは、交わらない */
    const a = edges[i], b = edges[j];
    snapCache.push(...intersections(a.type === 'arc' ? { ...a, type: 'circle' } : a, b.type === 'arc' ? { ...b, type: 'circle' } : b).filter(p => distTo(a, p) < 1e-7 && distTo(b, p) < 1e-7));
  }
}
/** 選んだ線の合計の長さ（mm）と、その線の上（0.3mm 以内）にある見えている菱目の数。線を選んでいなければ null。数えるのは選んだ線が60本までのとき（全選択のような大きな選択では重くなるため、出さない）。目打ちの「区間を選ぶ」と同じ基準（事業主指示 2026-10-17） */
function selectedLineHoleStats() {
  const lines = doc.shapes.filter(s => selected.has(s.id) && stitchable(s) && editable(s)), withLen = [];
  if (!lines.length || lines.length > 60) return null;
  let len = 0; for (const s of lines) { let l = NaN; try { l = arcLength(s); } catch { l = NaN; } if (Number.isFinite(l)) { len += l; withLen.push(s); } }
  if (!withLen.length) return null;
  const holes = doc.holes.filter(h => holeVisible(h) && withLen.some(s => distTo(s, { x: h.x, y: h.y }) < 0.3)).length;
  return { len, holes };
}
function updateUI() {
  refreshLaminateParts(); if ($('lamSubCard').open) renderLaminateNow();   /* 検証カードを開いているあいだは、図形を直すたびに、いまの全長も最新にする */
  $('undo').disabled = !undo.length; $('redo').disabled = !redo.length;
  $('delete').disabled = !selected.size;
  for (const id of ['copy', 'mirrorX', 'mirrorY', 'rotate']) $(id).disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s));
  { const mt = document.querySelector?.('button[data-tool="mirror"]'); if (mt) mt.disabled = mode !== 'mirror' && !doc.shapes.some(s => selected.has(s.id) && editable(s)); }   /* 線対称は選んだ図形に作用する操作（選択中の並び）。何も選んでいないと押せない（作図中の線対称モードは続けられる） */
  $('delHoles').disabled = !affectedHoles().length; $('checkHoles').disabled = !affectedHoles().length; $('flipHoleSlant').disabled = !selected.size; refreshGapCount();
  $('unroll').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && stitchable(s));
  $('mergeLines').disabled = !selectedShapeIds().size; $('closeGaps').disabled = !selectedShapeIds().size; $('group').disabled = selectedShapeIds().size < 2; $('ungroup').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && (groupIdOf(s) || s.type === 'polyline')); /* グループの解除、または矩形・折れ線の分解 */
  $('toPath').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && ['line','bezier','polyline'].includes(s.type));
  $('count').textContent = t('count', { shapes: doc.shapes.filter(s => !s.holeLink).length, selected: doc.shapes.filter(s => !s.holeLink && selected.has(s.id)).length + doc.holes.filter(h => selected.has(h.id)).length }) + (st => st ? t('countLine', { len: st.len.toFixed(2), holes: st.holes }) : '')(selectedLineHoleStats()); /* 見えない補助の線（holeLink）は数えない。選択数はこれまで通り（図形＋穴） */
  $('status').textContent = t('status', { x: cursor.x.toFixed(2), y: cursor.y.toFixed(2), zoom: (scale / 4 * 100).toFixed(0) });
  const th = threadEstimate(doc); $('threadInfo').textContent = th.paths ? t('threadInfo', { m: (th.mm / 1000).toFixed(2), n: th.paths }) : t('threadNone');
  refreshInfo(); refreshHwEdit(); refreshMoveCard(); refreshScaleCard(); refreshVertexCard(); refreshAlignCard(); refreshArrayCard(); refreshCalcCard();
}
/** 全く同じ位置（中心が 0.05mm 以内）・同じ菱目打ちの穴の重複を除く（先にあるほうを残す・事業主指示 2026-10-15）。除いた数を返す。近いだけの穴・別の目打ちの穴は残す。 */
function dedupeHoles() {
  const cell = 0.1, seen = new Map(), keep = []; let removed = 0;
  for (const h of doc.holes) {
    const cx = Math.round(h.x / cell), cy = Math.round(h.y / cell); let dup = false;
    for (let i = -1; i <= 1 && !dup; i++) for (let j = -1; j <= 1 && !dup; j++) for (const o of seen.get(`${h.toolId}|${cx + i}|${cy + j}`) || []) if (Math.hypot(o.x - h.x, o.y - h.y) < 0.05) { dup = true; break; }
    if (dup) { removed++; continue; }
    const key = `${h.toolId}|${cx}|${cy}`; if (!seen.has(key)) seen.set(key, []); seen.get(key).push(h); keep.push(h);
  }
  if (removed) doc.holes = keep; return removed;
}
/** 点の目印は、ガイド層の「点線の直線」と一体で持つ：目印を打つと直線が1本でき（hole.lineId ↔ 直線の markOf）、画面の記号・クリックはその直線に置き換わる。
 *  直線が実体：動かす・長さを変える・トリム・オフセットは普通の点線と同じで、そのあと穴の位置・向き・長さが直線に合う。直線を消すと目印も消え、トリムなどで直線がちぎれたら、残りは普通の点線になる（目印は外れる）。 */
function syncMarkLines() {
  const del = new Set(); let add = [];
  for (const h of doc.holes) {
    if (holeAppearance(h, doc)?.kind !== 'dot') continue;
    const mine = doc.shapes.filter(s => s.markOf === h.id);
    let ln = h.lineId ? doc.shapes.find(s => s.id === h.lineId && s.markOf === h.id && s.type === 'line') : null;
    if (!ln && !h.lineId && mine.length === 1 && mine[0].type === 'line') { ln = mine[0]; h.lineId = ln.id; } /* 「目印を補助線にする」で作った線を引き継ぐ */
    if (!ln && h.lineId) { for (const s of mine) delete s.markOf; del.add(h.id); continue; } /* 直線が消えた（削除）か、ちぎれた（トリム）：削除なら目印も消え、ちぎれたなら残りは普通の点線 */
    if (!ln) { const a = h.angleDeg * Math.PI / 180, ux = -Math.sin(a), uy = Math.cos(a), half = dotLen(h) / 2, id = freshId([...doc.shapes, ...add], 's'); ensureLayer(doc, 'guide'); add.push({ id, layer: 'guide', type: 'line', x1: +(h.x - ux * half).toFixed(6), y1: +(h.y - uy * half).toFixed(6), x2: +(h.x + ux * half).toFixed(6), y2: +(h.y + uy * half).toFixed(6), lineStyle: 'dashed', color: 'yellow', markOf: h.id }); h.lineId = id; continue; }
    const dx = ln.x2 - ln.x1, dy = ln.y2 - ln.y1, len = Math.hypot(dx, dy);
    if (len < 1e-6) { del.add(h.id); ln.markOf = undefined; delete ln.markOf; continue; }
    const mx = (ln.x1 + ln.x2) / 2, my = (ln.y1 + ln.y2) / 2, ang = (Math.atan2(dy, dx) * 180 / Math.PI - 90 + 720) % 360;
    if (Math.abs(h.x - mx) > 1e-6 || Math.abs(h.y - my) > 1e-6 || Math.abs(((h.angleDeg - ang + 540) % 360) - 180) > 1e-4 || Math.abs((h.len ?? 2) - len) > 1e-6) {
      h.x = mx; h.y = my; h.angleDeg = ang; h.len = len; const path = doc.paths.find(q => q.id === h.pathId), route = path && resolvePath(doc, path); if (route) h.s = projectOnPath(route, { x: mx, y: my }).s;
    }
  }
  for (const h of doc.holes) if (h.lineId) for (const s of doc.shapes) if (s.markOf === h.id && s.id !== h.lineId) delete s.markOf; /* 目印1つに、結びつく直線は1本だけ（コピーされた直線は普通の点線） */
  if (add.length) doc.shapes.push(...add);
  if (del.size) doc.holes = doc.holes.filter(h => !del.has(h.id));
  for (const s of doc.shapes) if (s.markOf && !doc.holes.some(h => h.id === s.markOf)) delete s.markOf; /* 目印の穴がなくなった線は、普通の点線にする */
}
/** 直線に置き換わった目印の記号は、画面に描かず・クリックの対象にもしない（直線のほうを使う）。 */
const markHidden = h => !!h.lineId && doc.shapes.some(s => s.id === h.lineId);
/** 寸法の追従（事業主指示 2026-10-17：寸法は、実際の図形が変化したら追従して数値を変える）。寸法の端が図形の点（snapPoints の k 番目：端点・中心など）と一致していれば、anchors＝[{id, k}｜null, …] に覚える。
 *  図形が変わると、覚えた点の新しい位置へ、寸法の端を動かす（数値は座標から出すので、自動で変わる）。寸法そのものを（図形と別に）動かしたら外す。図形といっしょに動かした（追従の位置と同じ）なら保つ。三つ折りの設計が作る寸法（foldSec）は対象外。 */
/** 寸法が覚える点の一覧：図形の吸着点（snapPoints）。円は、中心（0番）のほかに、縁の8点（45度ごと・1〜8番）も（画面の金色の点と同じ・2026-10-17 事業主指摘）。 */
const dimPointsOf = sh => sh.type === 'circle' ? [{ x: sh.cx, y: sh.cy }, ...Array.from({ length: 8 }, (_, n) => circlePoint(sh, n * 45))] : snapPoints(sh);
const DIM_NEAR = 1e-3, dimPointOf = a => { const sh = doc.shapes.find(x => x.id === a.id); return sh ? (dimPointsOf(sh)[a.k] ?? null) : null; };
function dimAnchorFor(pt) {
  for (const sh of doc.shapes) { if (['dimension', 'text', 'image'].includes(sh.type) || sh.holeLink) continue; const pts = dimPointsOf(sh); for (let k = 0; k < pts.length; k++) if (Math.hypot(pts[k].x - pt.x, pts[k].y - pt.y) < DIM_NEAR) return { id: sh.id, k }; }
  return null;
}
/** 寸法線は傾けない（2026-10-17 事業主指示）：水平・垂直の寸法（軸から5°以内・長さ1mm以上）は、端がずれても水平・垂直のまま、図形の大きさに追従するだけ。axis＝'h'｜'v'｜null。 */
const DIM_AXIS_DEG = 5;
function dimAxisOf(p, q) {
  const dx = Math.abs(q.x - p.x), dy = Math.abs(q.y - p.y); if (Math.hypot(dx, dy) < 1) return null;
  const tilt = Math.atan2(Math.min(dx, dy), Math.max(dx, dy)) * 180 / Math.PI; return tilt > DIM_AXIS_DEG ? null : dx >= dy ? 'h' : 'v';
}
/** 2点を軸にそろえる。そろえる座標（水平なら y・垂直なら x）は、図形に付いている端が片方だけならその端のもの、両方付いている（または両方ない）なら、元の位置からあまり動いていないほうの端のもの（元が無ければ1点目）。 */
function dimStraighten(pts, axis, old, anchored = []) {
  const k = axis === 'h' ? 'y' : 'x', moveOf = i => old ? Math.abs(pts[i][k] - old[i][k]) : i, one = anchored[0] && !anchored[1] ? 0 : anchored[1] && !anchored[0] ? 1 : null, v = pts[one ?? (moveOf(1) < moveOf(0) ? 1 : 0)][k];
  return pts.map(pt => ({ ...pt, [k]: v }));
}
/** 作り直しで消える図形（ids）に付いていた寸法の追従を外す。同じ id の新しい図形が同じ操作の中でできるので、残すと寸法が新しい図形へ付き直して飛ぶ（位置はそのまま）。 */
function dropDimAnchorsTo(ids) { for (const d of doc.shapes) if (d.type === 'dimension' && d.anchors) { d.anchors = d.anchors.map(a => a && ids.has(a.id) ? null : a); if (!d.anchors.some(Boolean)) delete d.anchors; } }
function syncDimensions(before) {
  for (const d of doc.shapes) {
    if (d.type !== 'dimension' || d.foldSec) continue; const old = before.get(d.id), cur = [{ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }];
    const moved = !old || Math.abs(old[0] - d.x1) > 1e-9 || Math.abs(old[1] - d.y1) > 1e-9 || Math.abs(old[2] - d.x2) > 1e-9 || Math.abs(old[3] - d.y2) > 1e-9;
    if (d.anchors) {
      const tgt = d.anchors.map(a => a ? dimPointOf(a) : null);
      if (moved) { if (!d.anchors.every((a, i) => !a || (tgt[i] && Math.hypot(tgt[i].x - cur[i].x, tgt[i].y - cur[i].y) < DIM_NEAR))) delete d.anchors; } /* 寸法そのものが動いた：図形といっしょでなければ、外す */
      else { d.anchors = d.anchors.map((a, i) => a && tgt[i] ? a : null); [[0, 'x1', 'y1'], [1, 'x2', 'y2']].forEach(([i, kx, ky]) => { if (d.anchors[i] && tgt[i] && Math.hypot(tgt[i].x - d[kx], tgt[i].y - d[ky]) > 1e-4) { d[kx] = tgt[i].x; d[ky] = tgt[i].y; } }); /* 0.0001mm 未満の差は追従させない（意味のない変更で、元に戻すの履歴を増やさない） */ if (!d.anchors.some(Boolean)) delete d.anchors; }
    }
    if (!d.anchors) { const an = cur.map(dimAnchorFor); if (an.some(Boolean)) d.anchors = an; }
    const oldPts = old ? [{ x: old[0], y: old[1] }, { x: old[2], y: old[3] }] : null, now = [{ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }], axis = (oldPts && dimAxisOf(oldPts[0], oldPts[1])) || dimAxisOf(now[0], now[1]);
    if (axis) { const [p, q] = dimStraighten(now, axis, oldPts, (d.anchors || []).map(Boolean)); if (p.x !== d.x1 || p.y !== d.y1 || q.x !== d.x2 || q.y !== d.y2) { d.x1 = p.x; d.y1 = p.y; d.x2 = q.x; d.y2 = q.y; } } /* 傾けない */
  }
}
/** 領域の塗り（doc.fills）が囲んでいる図形の形（種類・位置・大きさ・点）の見張り。色・線の種類・層などの見た目は含めない。 */
const FILL_GEOM_KEYS = ['type', 'cx', 'cy', 'r', 'startDeg', 'endDeg', 'x1', 'y1', 'x2', 'y2', 'c1x', 'c1y', 'c2x', 'c2y', 'points', 'nodes', 'closed', 'reversed'];
const fillGeomSig = sh => JSON.stringify(FILL_GEOM_KEYS.map(k => sh[k]));
function fillSnapshot() {
  const fills = doc.fills || []; if (!fills.length) return null; const ids = new Set(fills.flatMap(f => f.ids || []));
  return { geom: new Map(doc.shapes.filter(sh => ids.has(sh.id)).map(sh => [sh.id, fillGeomSig(sh)])), pts: new Map(fills.map(f => [f.id, JSON.stringify(f.points)])) };
}
/** 囲んでいる図形の形が変わった領域の塗りを、新しい形に取り直す（commit の中で呼ぶので、元に戻すは図形と同じ1回）。
 *  事業主の指摘 2026-10-18「あとから円のサイズを変更できない」：金色の環（円2つ＋塗り）の外の円の半径を変えても、塗りは前の大きさのままだった。
 *  対象外：消えた・増えた図形を含む塗り／形が変わっていない塗り／操作の側で塗りの点も動かした塗り（まとめて移動）。
 *  囲まれた場所が同じ図形の組み合わせで見つからないとき（環が崩れた）は、塗りを前のまま残す。戻り値＝取り直せなかった塗りの数。 */
function refollowFills(snap) {
  if (!snap || !(doc.fills || []).length) return 0;
  const byId = new Map(doc.shapes.map(sh => [sh.id, sh])); let stale = 0, shapes = null;
  doc.fills = doc.fills.map(fl => {
    const ids = fl.ids || []; if (!ids.length || !ids.every(id => byId.has(id) && snap.geom.has(id))) return fl;
    if (ids.every(id => fillGeomSig(byId.get(id)) === snap.geom.get(id))) return fl;
    if (JSON.stringify(fl.points) !== snap.pts.get(fl.id)) return fl;
    shapes ??= regionShapes(); const want = new Set(ids);
    const r = enclosedAreasAround(shapes, want).find(x => x.ids.length === want.size && x.ids.every(id => want.has(id)));
    if (!r) { stale++; return fl; }
    const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) });
    return { ...fl, points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), area: Math.round(r.area * 10) / 10 };
  });
  return stale;
}
function commit(fn) {
  ownPathsCache = null; openGapMarks = [];   /* 編集したら、開いた直後の歯抜けの印は消す */
  const before = JSON.stringify(doc), dimBefore = new Map(doc.shapes.filter(s => s.type === 'dimension').map(s => [s.id, [s.x1, s.y1, s.x2, s.y2]])), fillSnap = fillSnapshot();
  fn(); { const live = new Set(doc.shapes.map(s => s.id)); for (const p of doc.parts) if (p.shapeIds.some(id => !live.has(id))) p.shapeIds = p.shapeIds.filter(id => live.has(id)); }   /* 部品が、消えた図形を指したままにしない（図面が検査に通らなくなる） */
  const staleFills = refollowFills(fillSnap); if (staleFills) setTimeout(() => { $('hint').textContent = ($('hint').textContent ? $('hint').textContent + ' ' : '') + t('fillNotFollowed', { n: staleFills }); }, 0);   /* 囲んでいる図形の形が変わったら、領域の塗りも取り直す */
  const dupHoles = dedupeHoles(); syncMarkLines(); syncDimensions(dimBefore); if (dupHoles) setTimeout(() => { $('hint').textContent = ($('hint').textContent ? $('hint').textContent + ' ' : '') + t('holeDedupe', { n: dupHoles }); }, 0);
  if (before !== JSON.stringify(doc)) { undo.push(before); if (undo.length > 100) undo.shift(); redo = []; rebuildSnaps(); if (view3d) render3d(); if (tabs[activeTab] && !tabs[activeTab].dirty) { tabs[activeTab].dirty = true; renderTabs(); } }
  scheduleAutosave();
  draw();
}
function cancel() { countStage = null; ruler = null; gesture = null; stage = null; snap = null; offsetSelection = null; detourState = null; $('offsetFloat').hidden = true; }
/** 左のツールに合わせて右のカードを出し入れする：目打ち・目印＝目打ちカード、柄＝パッチワークのカード。ほかのツールでは両方閉じる。 */
function syncToolCards() {
  $('rectBar').hidden = mode !== 'rect'; /* 幅・高さの欄は矩形ツールのときだけ */
  $('circleBar').hidden = mode !== 'circle'; /* 半径・直径の欄は円ツールのときだけ */
  $('l-markDiv').hidden = mode !== 'mark'; $('l-markDist').hidden = mode !== 'mark'; /* 距離で打つ欄は目印ツールのときだけ（目打ちカードの先頭） */
  $('stitchCard').open = mode === 'stitch' || mode === 'mark'; $('patchCard').open = mode === 'patchfill'; $('drawCard').open = mode === 'arc'; /* 円弧は、描き方（3点／中心と半径）と半径が作図オプションにある */
  const shown = mode === 'patchfill' ? $('patchCard') : mode === 'stitch' || mode === 'mark' ? $('stitchCard') : mode === 'arc' ? $('drawCard') : null; /* 開いたカードが画面外なら見える位置まで寄せる */
  if (shown?.scrollIntoView) shown.scrollIntoView({ block: 'nearest' });
}
function setMode(next) {
  if (next === 'patchfill' && !lockGate('patchwork')) return;
  cancel(); manualNext = null; nodeSel = null; mode = next; logOp('tool', { mode }); syncToolCards(); refreshModHelp();
  document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === mode); b.setAttribute('aria-pressed', String(b.dataset.tool === mode)); });
  $('hint').textContent = modeHint(mode); canvas.style.cursor = mode === 'select' ? 'default' : 'crosshair'; resize();
}
function history(from, to) {
  if (!from.length) return; scheduleAutosave();
  to.push(JSON.stringify(doc)); doc = migrateDoc(JSON.parse(from.pop())); /* 保存した履歴は古い版の図面かもしれないので、版上げしてから戻す */ selected.clear(); cancel(); manualNext = null; nodeSel = null; pairLines = []; refreshTools(); persistTools(); renderLayers(); renderSeams(); rebuildSnaps(); draw();
}
/** 分解：選んだ矩形・折れ線（閉じた図形を含む）を、辺ごとの独立した直線にばらす。層・色・線種・部品の所属は引き継ぐ。目打ち（縫い穴）が付いた図形は穴が壊れるので分解しない。 */
function explodeSelection() {
  const targets = doc.shapes.filter(s => selected.has(s.id) && editable(s) && s.type === 'polyline' && s.points?.length >= 2); if (!targets.length) { $('hint').textContent = t('explodeNone'); return; }
  const pathsOf = s => doc.paths.filter(p => p.shapeIds.includes(s.id)), blocked = targets.filter(s => pathsOf(s).some(p => doc.holes.some(h => h.pathId === p.id))), ok = targets.filter(s => !blocked.includes(s));
  if (!ok.length) { $('hint').textContent = t('explodeHoles'); return; }
  let made = [];
  commit(() => {
    const dropPaths = new Set(ok.flatMap(s => pathsOf(s).map(p => p.id)));
    for (const s of ok) {
      const { id, points, closed, type, ...rest } = s, n = points.length, edges = closed ? n : n - 1, ids = [];
      for (let i = 0; i < edges; i++) { const a = points[i], b = points[(i + 1) % n]; if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) continue; const nid = freshId(doc.shapes, 's'); doc.shapes.push({ ...rest, id: nid, type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y }); ids.push(nid); }
      doc.shapes = doc.shapes.filter(q => q.id !== id); made.push(...ids);
      for (const part of doc.parts) if (part.shapeIds.includes(id)) part.shapeIds = [...part.shapeIds.filter(x => x !== id), ...ids];
    }
    doc.paths = doc.paths.filter(p => !dropPaths.has(p.id)); doc.seams = doc.seams.filter(m => !dropPaths.has(m.a.pathId) && !dropPaths.has(m.b.pathId));
    selected = new Set(made);
  });
  renderSeams(); $('hint').textContent = t(blocked.length ? 'explodedSome' : 'exploded', { n: ok.length, m: made.length, k: blocked.length });
}
/** 「線だけ削除（菱目は残す）」（Shift+Delete・専用ボタン）：選んだ線を、見えない補助の線（holeLink）にして、その線に付いた菱目（穴）と経路を残す。穴の無い線は普通に消す。
 *  （事業主の指摘 2026-10-18「直線を削除したら菱目も消える」→ 決定「Delete は今までどおり・線だけ削除は別のキーとボタン」）。選んでいる穴は消える。 */
function removeSelectedKeepHoles() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  let lines = 0, kept = 0;
  cancel(); commit(() => {
    const holed = new Set(doc.holes.map(h => h.pathId)), keepPaths = doc.paths.filter(p => holed.has(p.id) && p.shapeIds.some(id => ids.has(id))), keepIds = new Set(keepPaths.flatMap(p => p.shapeIds.filter(id => ids.has(id))));
    const dropPaths = new Set(doc.paths.filter(p => p.shapeIds.some(id => ids.has(id)) && !keepPaths.includes(p)).map(p => p.id));
    lines = ids.size; kept = doc.holes.filter(h => keepPaths.some(p => p.id === h.pathId) && !(selected.has(h.id) && holeEditable(h))).length;
    doc.shapes = doc.shapes.filter(sh => !ids.has(sh.id) || keepIds.has(sh.id)).map(sh => keepIds.has(sh.id) ? { ...sh, holeLink: true } : sh);   /* 穴のある線は、見えない補助の線として残る（経路を保つ） */
    doc.holes = doc.holes.filter(h => !dropPaths.has(h.pathId) && !(selected.has(h.id) && holeEditable(h)));
    doc.paths = doc.paths.filter(p => !dropPaths.has(p.id)); doc.seams = doc.seams.filter(m => !dropPaths.has(m.a.pathId) && !dropPaths.has(m.b.pathId));
    for (const part of doc.parts) part.shapeIds = part.shapeIds.filter(id => !ids.has(id));
    selected.clear(); manualNext = null;
  }); renderSeams();
  $('hint').textContent = t('holesKept', { n: lines, h: kept });
}
function removeSelected() {
  const ids = selectedShapeIds();
  cancel(); commit(() => { const own=ownHolePathIds(doc), paths=new Set(doc.paths.filter(p=>p.shapeIds.some(id=>ids.has(id))&&!own.has(p.id)).map(p=>p.id)), keepIds=new Set(doc.paths.filter(p=>own.has(p.id)).flatMap(p=>p.shapeIds.filter(id=>ids.has(id)))); /* .lcc から取り込んだ穴など、線とは独立した穴の経路：その線（ガイドなど）を消しても、穴は残す。線は見えない補助の線（holeLink）にして、経路を保つ */ doc.shapes=doc.shapes.filter(s=>!ids.has(s.id)||keepIds.has(s.id)).map(s=>keepIds.has(s.id)?{...s,holeLink:true}:s); doc.holes=doc.holes.filter(h=>!paths.has(h.pathId)&&!(selected.has(h.id)&&holeEditable(h))); doc.paths=doc.paths.filter(p=>!paths.has(p.id)); doc.seams=doc.seams.filter(m=>!paths.has(m.a.pathId)&&!paths.has(m.b.pathId)); for(const part of doc.parts)part.shapeIds=part.shapeIds.filter(id=>!ids.has(id)); selected.clear(); manualNext=null; }); renderSeams();
}
function addShape(shape) {
  const layer = doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked) || doc.layers.find(l => l.visible && !l.locked);
  if (!layer) { $('hint').textContent = t('noLayer'); cancel(); return; }
  if (layer.id !== activeLayer) $('hint').textContent = t('drawnOnLayer', { name: layer.name });
  let id = 's1', n = 1;
  const ids = new Set(doc.shapes.map(s => s.id)); while (ids.has(id)) id = `s${++n}`;
  const { layer: wanted, ...rest } = shape; let target = wanted && doc.layers.some(l => l.id === wanted && l.visible && !l.locked) ? wanted : layer.id; // 呼び元の layer はロック・非表示でなければ尊重
  if ((rest.type === 'text' || rest.type === 'dimension') && doc.layers.some(l => l.id === 'guide' && l.visible && !l.locked)) target = 'guide'; /* 基本方針：文字・寸法線はガイド、実線は型紙 */
  const dashed = target === 'guide' && ['line', 'circle', 'arc', 'bezier', 'polyline', 'path'].includes(rest.type) && !rest.lineStyle ? { lineStyle: 'dashed' } : {}; /* ガイドの層に描く線は、自動で点線 */
  commit(() => { doc.shapes.push({ id, layer: target, ...dashed, ...rest }); selected = new Set([id]); });
}
function freshId(items, prefix) {
  const used = new Set(items.map(s => s.id)); /* 空き番号の検索を Set で速くする（結果は同じ：未使用で最小の番号） */
  let n = 1; while (used.has(prefix + n)) n++;
  return prefix + n;
}
function transformSelected(fn) {
  const ids = selectedShapeIds();
  for (const p of doc.paths) { const shs = p.shapeIds.map(id => doc.shapes.find(s => s.id === id)); if (shs.length && shs.every(s => s && s.layer === 'guide' && !editable(s)) && doc.holes.some(h => h.pathId === p.id && selected.has(h.id) && holeEditable(h))) p.shapeIds.forEach(id => ids.add(id)); } /* 選んだ菱目がついた、非表示のガイド層の線は、菱目といっしょに動かす（取り残して、菱目が線から外れないように） */
  cancel();
  commit(() => {
    const before=new Map(doc.paths.filter(p=>p.shapeIds.every(id=>ids.has(id))).map(p=>[p.id,resolvePath(doc,p)]));
    doc.shapes = doc.shapes.map(s => ids.has(s.id) ? fn(s) : s);
    if (Array.isArray(doc.fills) && doc.fills.length) { const mv = q => { try { const r = fn({ x: q.x, y: q.y }); return Number.isFinite(r?.x) && Number.isFinite(r?.y) ? { x: r.x, y: r.y } : q; } catch { return q; } }; doc.fills = doc.fills.map(fl => fl.ids.length && fl.ids.every(id => ids.has(id)) ? { ...fl, points: fl.points.map(mv), holes: (fl.holes || []).map(h => h.map(mv)) } : fl); }   /* 囲む図形を全部動かしたら、領域の塗りもついていく */
    const paths=new Set(doc.paths.filter(p=>p.shapeIds.every(id=>ids.has(id))).map(p=>p.id));
    const alone=h=>!paths.has(h.pathId)&&selected.has(h.id)&&holeEditable(h); /* 線が選ばれていない（箱からはみ出した等）のに、菱目だけ選んでいるとき：その菱目も、選んだ図形といっしょに動かす（不具合記録 2026-10-17：線と菱目を選んで動かしたら線しか動かなかった） */
    doc.holes=doc.holes.map(h=>paths.has(h.pathId)||alone(h)?fn(h):h);
    for(const h of doc.holes.filter(h=>paths.has(h.pathId)||alone(h))){const route=resolvePath(doc,doc.paths.find(p=>p.id===h.pathId));if(route)h.s=projectOnPath(route,h).s;}
    for(const saved of doc.paths.filter(p=>paths.has(p.id))){
      const old=before.get(saved.id),route=resolvePath(doc,saved),len=arcLength(route);
      const mapped=s=>projectOnPath(route,fn(pointAtLength(old,s),saved)).s;
      saved.segments=saved.segments.flatMap(segment=>{
        if(!saved.closed){const a=mapped(segment.from),b=mapped(segment.to);return [{...segment,from:Math.min(a,b),to:Math.max(a,b)}];}
        const span=segment.to-segment.from;if(span>=len-1e-6)return [{...segment,from:0,to:len}];
        const original=pointAtLength(old,segment.from),transformed=fn(original,saved),start=mapped(segment.from),tangent=pointAtLength(route,start).angleDeg;
        const reversed=Math.cos((transformed.angleDeg-tangent)*Math.PI/180)<0;
        const from=((start-(reversed?span:0))%len+len)%len,to=from+span;
        return to<=len+1e-6?[{...segment,from,to:Math.min(to,len)}]:[{...segment,from,to:len},{...segment,from:0,to:to-len}];
      });
    }
    manualNext=null;
  });
}
function copySelected() { copySelectedOffsets([{ dx: 5, dy: 5 }]); }
function copySelectedOffsets(offsets) {
  const sourceIds=selectedShapeIds(); const sources=doc.shapes.filter(s=>sourceIds.has(s.id));
  if (!sources.length) return;
  cancel();
  commit(() => {
    const ids = new Set(), paths=[...doc.paths], holes=[...doc.holes];
    for (const { dx, dy } of offsets) {
      const map = new Map();
      const copyGroups = new Map(); /* 複製したグループは元とは別のグループにする */
      for (const s of sources) { const id=freshId(doc.shapes,'s'), g=groupIdOf(s); let c={...translate(s,dx,dy),id}; if(g){ if(!copyGroups.has(g)) copyGroups.set(g,nextGroupId([...doc.shapes,...[...copyGroups.values()].map(groupId=>({groupId}))])); c={...c,groupId:copyGroups.get(g)}; } doc.shapes.push(c);ids.add(id);map.set(s.id,id); }
      for(const p of paths.filter(p=>p.shapeIds.every(id=>map.has(id)))){
        const id=freshId(doc.paths,'p');doc.paths.push({...JSON.parse(JSON.stringify(p)),id,shapeIds:p.shapeIds.map(id=>map.get(id))});
        for(const h of holes.filter(h=>h.pathId===p.id))doc.holes.push({...translate(h,dx,dy),id:freshId(doc.holes,'h'),pathId:id});
      }
    }
    selected = ids;
  });
}
function transformAboutCenter(kind) {
  const shapes = doc.shapes.filter(s => selected.has(s.id) && editable(s));
  if (!shapes.length) return;
  const b = bboxOfDoc({ shapes, holes: [] }), center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const angle = kind === 'rotate' ? askNumber('rotation', 90) : 0;
  if (angle === null) return;
  transformSelected(s => kind === 'rotate' ? rotate(s, angle, center) : keepHoleSlant(kind === 'mirrorX' ? mirrorX(s, center.x) : mirrorY(s, center.y), s));
  if (kind !== 'rotate' && doc.shapes.some(s => selected.has(s.id) && partOf(s))) { const ids = new Set(selected); commit(() => flipMark(ids)); }
}
/** 数の入力ダイアログ。remember（丸め・面取りなど）を渡すと、前回入れた数を初期値にする（ブラウザに保存・事業主指示 2026-10-17）。キャンセル・不正な入力では前回の値を変えない。 */
function askNumber(key, initial, remember) {
  if (voiceAskNumber !== null) { const v = voiceAskNumber; voiceAskNumber = null; return v; }
  let start = initial; if (remember) { try { const saved = localStorage.getItem('leather-cad.ask.' + remember); if (saved !== null && Number.isFinite(Number(saved))) start = Number(saved); } catch { /* 保存を読めなくても、既定の値で続ける */ } }
  const raw = window.prompt(t(key), String(start));
  if (raw === null) return null;
  if (!raw.trim() || !Number.isFinite(Number(raw))) { $('hint').textContent = t('invalidNumber'); return null; }
  if (remember) { try { localStorage.setItem('leather-cad.ask.' + remember, String(Number(raw))); } catch { /* 保存できなくても続ける */ } }
  return Number(raw);
}
/** 折れ線の角を丸め(fillet)／面取り(chamfer)した直線と円弧の列を返す。only は角の頂点番号（null=全部）。不成立は null。 */
function roundPolylineCorners(poly, only, r, kind) {
  const V = poly.points, n = V.length, closed = !!poly.closed, make = kind === 'fillet' ? filletCorner : chamferCorner;
  const seg = k => ({ type: 'line', x1: V[k].x, y1: V[k].y, x2: V[(k + 1) % n].x, y2: V[(k + 1) % n].y });
  const corners = new Map();
  for (let i = 0; i < n; i++) {
    if ((!closed && (i === 0 || i === n - 1)) || (only && !only.includes(i))) continue;
    const prev = V[(i - 1 + n) % n], next = V[(i + 1) % n], cross = (V[i].x - prev.x) * (next.y - V[i].y) - (V[i].y - prev.y) * (next.x - V[i].x);
    if (!only && Math.abs(cross) < 1e-9 * Math.max(1, distance(prev, V[i]) * distance(V[i], next))) continue; /* 一直線上の頂点は角ではない */
    const inc = seg((i - 1 + n) % n), out = seg(i), shape = make(inc, out, r); if (!shape) return null;
    const ends = shape.type === 'arc' ? [circlePoint(shape, shape.startDeg), circlePoint(shape, shape.endDeg)] : [{ x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }];
    const a = distTo(inc, ends[0]) <= distTo(inc, ends[1]) ? ends[0] : ends[1]; corners.set(i, { shape, a, b: a === ends[0] ? ends[1] : ends[0] });
  }
  if (!corners.size) return null;
  const result = [];
  for (let k = 0; k < (closed ? n : n - 1); k++) {
    const k2 = (k + 1) % n, start = corners.get(k)?.b ?? V[k], end = corners.get(k2)?.a ?? V[k2];
    if ((end.x - start.x) * (V[k2].x - V[k].x) + (end.y - start.y) * (V[k2].y - V[k].y) < -1e-9) return null; /* 隣の角と重なる＝半径が大きすぎる */
    if (distance(start, end) > 1e-9) result.push({ type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    if (corners.has(k2)) result.push(corners.get(k2).shape);
  }
  return result;
}
/** 穴が「目印」か（縫い穴ではないか）。穴の見た目を決める規則と同じ。 */
const holeIsMark = h => { const p = doc.paths.find(q => q.id === h.pathId), tool = doc.tools.find(q => q.id === h.toolId); return !![h.mark, p?.mark, doc.mark, tool?.mark].find(m => m && m !== 'tool'); };
/** 丸め・面取りでできない理由：対象の線に、縫い穴（目印でない穴）がある。目印だけなら丸められる（目印は残る）。 */
const roundHoleBlock = pathIds => doc.holes.some(h => pathIds.has(h.pathId) && !holeIsMark(h));
/** 丸め・面取りのあと、目印だけが付いていた線を作り直す：図形の入れ替え（swap: 古い図形の id → 新しい図形の id の列）を線に反映し、目印を新しい線の上へ置き直す（つながらなければ、その線の目印は外す）。目印のない線は消す。commit の中で、図形を入れ替えたあとに呼ぶ。 */
function reattachMarks(pathIds, swap = new Map()) {
  doc.paths = doc.paths.filter(q => !pathIds.has(q.id) || doc.holes.some(h => h.pathId === q.id));
  for (const q of doc.paths.filter(x => pathIds.has(x.id))) {
    q.shapeIds = q.shapeIds.flatMap(id => swap.has(id) ? swap.get(id) : [id]); const route = resolvePath(doc, q);
    if (!route) { doc.holes = doc.holes.filter(h => h.pathId !== q.id); doc.paths = doc.paths.filter(x => x.id !== q.id); continue; }
    for (const h of doc.holes.filter(x => x.pathId === q.id)) { const sPos = projectOnPath(route, { x: h.x, y: h.y }).s, pt = pointAtLength(route, sPos); h.s = sPos; h.x = pt.x; h.y = pt.y; }
  }
}
/** 折れ線をクリック：頂点の近くならその角だけ、辺の途中なら全部の角を丸める／面取りする。 */
function roundPolylineAt(poly, p) {
  cancel();
  const affected = new Set(doc.paths.filter(q => q.shapeIds.includes(poly.id)).map(q => q.id));
  if (roundHoleBlock(affected)) { $('hint').textContent = t('holeChamfer'); return; }
  const near = poly.points.map((v, i) => [distance(v, p), i]).filter(([d]) => d <= 9 / scale).sort((x, y) => x[0] - y[0])[0];
  const r = askNumber(mode === 'fillet' ? 'radius' : 'chamferSize', 3, mode === 'fillet' ? 'fillet' : 'chamfer'); if (r === null) return;
  const shapes = roundPolylineCorners(poly, near ? [near[1]] : null, r, mode);
  if (!shapes) { $('hint').textContent = t('impossible'); return; }
  commit(() => {
    doc.shapes = doc.shapes.filter(s => s.id !== poly.id);
    const ids = shapes.map(s => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...s, id, layer: poly.layer }); return id; }); reattachMarks(affected, new Map([[poly.id, ids]]));
    for (const part of doc.parts) if (part.shapeIds.includes(poly.id)) part.shapeIds = [...part.shapeIds.filter(x => x !== poly.id), ...ids];
    selected = new Set(ids);
  });
  $('hint').textContent = t('hint.' + mode);
}
/** オフセットの選択：1回クリック＝他の図形との交点から交点までの区間、ダブルクリック＝つながった図形全体。 */
let offsetCursor = null; /* オフセットの向きを決めるカーソル位置（世界座標） */
/** 向き「カーソルの側」：ずらす2通り（+距離・−距離）のうち、結果がカーソルに近い方を選ぶ。{ d, r（結果の図形） } か null。 */
function offsetCursorChoice(sel, cur, dist) {
  if (!sel || !cur || !(dist > 0)) return null;
  const cand = [dist, -dist].map(d => ({ d, r: offsetSpanResult(sel, d, { join: $('offsetJoin').value }) })).filter(c => c.r);
  return cand.length ? cand.reduce((m, c) => distTo(c.r, cur) < distTo(m.r, cur) ? c : m) : null;
}
/** 左右上下の向きのとき、選んだ範囲が1本の線でなければ、クリックした位置に一番近い「1辺」を使う（直線なら直線そのもの、折れ線・矩形なら最も近い辺）。辺にできない図形は null。 */
function offsetEdgeOfHit(sel) {
  const h = sel.hit, p = sel.click; if (!h || !p) return null;
  if (h.type === 'line') return { points: [{ x: h.x1, y: h.y1 }, { x: h.x2, y: h.y2 }], closed: false, shapeIds: [h.id], whole: false, single: null, layer: sel.layer };
  const e = offsetEdgeSel(h, p); return e ? { ...e, layer: sel.layer } : null;
}
let offsetAlt = false; /* Alt+クリック：矩形・折れ線の、クリックした1辺だけを選ぶ */
/** 折れ線（矩形を含む）の、p に一番近い1辺だけを、オフセット用の選択範囲にする。折れ線以外・辺が1つだけなら null。 */
function offsetEdgeSel(hit, p) {
  if (hit.type !== 'polyline' || hit.points.length < 2) return null;
  const pts = hit.points, n = pts.length, edges = hit.closed ? n : n - 1; let best = null;
  for (let i = 0; i < edges; i++) { const a = pts[i], b = pts[(i + 1) % n], d = distTo({ type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, p); if (!best || d < best.d) best = { d, a, b }; }
  return best && best.d <= 7 / scale ? { points: [{ x: best.a.x, y: best.a.y }, { x: best.b.x, y: best.b.y }], closed: false, shapeIds: [hit.id], whole: false, single: null } : null;
}
function offsetClick(p, whole) {
  const shapes = doc.shapes.filter(s => visible(s) && stitchable(s)), hit = shapes.filter(s => editable(s)).reverse().find(s => distTo(s, p) <= 7 / scale);
  if (!hit) { offsetSelection = null; $('hint').textContent = t('offsetNone'); draw(); return; }
  const edge = offsetAlt && !whole ? offsetEdgeSel(hit, p) : null; if (edge) { offsetAlt = false; offsetSelection = { ...edge, layer: hit.layer }; $('of-dist').value = $('offsetDist').value; $('of-side').value = $('offsetSide').value; draw(); $('hint').textContent = t($('offsetSide').value === 'cursor' ? 'offsetPickCursor' : 'offsetPickedEdge'); return; }
  const sel = offsetSpan(shapes, hit, p, whole); if (!sel) { offsetSelection = null; $('hint').textContent = t('impossible'); draw(); return; }
  offsetSelection = { ...sel, layer: hit.layer, hit, click: p }; /* 向き「カーソルの側」：1回クリックでは、別々の線でつながっていても、クリックした1本の線だけをずらす（全体はダブルクリック。矩形・折れ線は従来どおり全体） */ if ($('offsetSide').value === 'cursor' && !whole && hit.type === 'line' && sel.points.length > 2) { const es = offsetEdgeOfHit(offsetSelection); if (es) offsetSelection = { ...es, hit, click: p }; } $('of-dist').value = $('offsetDist').value; $('of-side').value = $('offsetSide').value; draw();
  if (voiceAskNumber !== null) { const v = voiceAskNumber; voiceAskNumber = null; runOffset(v); return; } /* 音声で数値を先に聞いているときは、選んですぐ実行 */
  const info = t('offsetSpanInfo', { len: offsetSpanLength(sel).toFixed(2), n: sel.shapeIds?.length ?? 1, state: t(sel.closed ? 'offsetClosedShape' : 'offsetOpenLine') }); /* 選んだ範囲の全長・本数・閉じているか（外周が全部選ばれたかの確認用） */
  $('hint').textContent = info + ' ' + t($('offsetSide').value === 'cursor' ? 'offsetPickCursor' : sel.whole ? 'offsetPickedWhole' : 'offsetPickedSpan');
}
/** 向きが「内側」「外側」「両側」のときの、ずらした結果（実行しなくても見える黄色の点線のプレビュー用）。成立しない向きがあれば failed に数える。距離が不正なら何も返さない。 */
function offsetPreviewResults(sel) {
  const dist = Number($('offsetDist').value), v = $('offsetSide').value; if (!sel || !Number.isFinite(dist) || dist <= 0 || !['in', 'out', 'both'].includes(v)) return { results: [], failed: 0 };
  const sideOf = inner => { let d = inner ? -dist : dist; if (!sel.closed) { const k = bendInnerSign(sel.points); if (k) d = (inner ? k : -k) * dist; } return d; };
  const ds = v === 'both' ? [sideOf(true), sideOf(false)] : [sideOf(v === 'in')], all = ds.map(d => offsetSpanResult(sel, d, { join: $('offsetJoin').value }));
  return { results: all.filter(Boolean), failed: all.filter(r => !r).length };
}
/** 選んだ範囲の全長（mm）。閉じていれば、最後の点から最初の点までも足す。 */
function offsetSpanLength(sel) { let len = 0; const ps = sel.points; for (let i = 1; i < ps.length; i++) len += distance(ps[i - 1], ps[i]); if (sel.closed && ps.length > 2) len += distance(ps.at(-1), ps[0]); return len; }
/** 選んだ範囲のそばに、距離・内側/外側・実行の小さな入力欄を出す（選んだ範囲が無ければ隠す）。画面の端では見切れないように寄せる。 */
/* ── 回避：出っ張った図形を、すき間をあけて滑らかによける線を作り、追加で必要な革の長さを出す ── */
let detourState = null; /* { baseId, obstId }：基準の線・よけたい図形 */
const detourClosed = s => s.type === 'circle' || ((s.type === 'polyline' || s.type === 'path') && !!s.closed);
function detourCompute() {
  if (!detourState?.baseId || !detourState?.obstId) return null;
  const b = doc.shapes.find(s => s.id === detourState.baseId), o = doc.shapes.find(s => s.id === detourState.obstId); if (!b || !o) return null;
  const clearance = Number($('df-clear').value), radius = Number($('df-radius').value); if (!(clearance >= 0) || !(radius >= 0)) return { error: 'invalidNumber' };
  const bp = flattenShape(b, 0.01), op = flattenShape(o, 0.01); if (!bp || bp.length < 2 || !op || op.length < 3) return { error: 'impossible' };
  const res = detourPath(bp, op, { clearance, radius }); return res || { error: 'detourNoHit' };
}
function detourClick(p) {
  const hit = pickShapeAt(p); if (!hit) { $('hint').textContent = t('detourNone'); return; }
  if (!detourState || detourState.obstId) { detourState = { baseId: hit.id }; $('hint').textContent = t('detourPickObstacle'); draw(); return; } /* 1回目（または選び直し）：基準の線 */
  if (hit.id === detourState.baseId) { $('hint').textContent = t('detourPickObstacle'); return; }
  if (!detourClosed(hit)) { $('hint').textContent = t('detourNeedClosed'); return; }
  detourState.obstId = hit.id; const r = detourCompute(); $('hint').textContent = r?.error ? t(r.error) : t('detourOut', { len: r.length.toFixed(2), base: r.baseLength.toFixed(2), extra: r.extra.toFixed(2) }); draw();
}
function runDetour() {
  const r = detourCompute(); if (!r) { $('hint').textContent = t('detourPickObstacle'); return; } if (r.error) { $('hint').textContent = t(r.error); return; }
  const base = doc.shapes.find(s => s.id === detourState.baseId), dest = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || base?.layer; /* 点線はガイドの層へ */
  detourState = null; commit(() => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer: dest, type: 'polyline', closed: false, points: r.points.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) })), color: 'yellow', lineStyle: 'dashed' }); selected = new Set([id]); });
  $('hint').textContent = t('detourDone', { len: r.length.toFixed(2), base: r.baseLength.toFixed(2), extra: r.extra.toFixed(2) }); draw();
}
/** 回避の入力欄：よける図形を選んだら、その図形のそばに出し、結果（迂回路・まっすぐ・追加の長さ）を更新する。 */
function placeDetourFloat() {
  const box = $('detourFloat'); if (mode !== 'detour' || !detourState?.obstId) { box.hidden = true; return; }
  const o = doc.shapes.find(s => s.id === detourState.obstId); if (!o) { box.hidden = true; return; }
  const bb = bboxOf(o), w = box.offsetWidth || 330, h = box.offsetHeight || 40, po = paneOff(); let x = po.x + origin.x + bb.maxX * scale + 12, y = po.y + origin.y + bb.minY * scale - 4;
  if (x + w > width - 8) x = origin.x + bb.minX * scale - w - 12; x = Math.max(8, Math.min(width - w - 8, x)); y = Math.max(36, Math.min(height - h - 8, y));
  box.style.left = Math.round(x) + 'px'; box.style.top = Math.round(y) + 'px'; box.hidden = false;
  const r = detourCompute(); $('df-out').textContent = r?.error ? t(r.error) : r ? t('detourOut', { len: r.length.toFixed(2), base: r.baseLength.toFixed(2), extra: r.extra.toFixed(2) }) : '';
}
function placeOffsetFloat() {
  const box = $('offsetFloat'), sel = offsetSelection;
  if (!sel || mode !== 'offset') { box.hidden = true; return; }
  const xs = sel.points.map(q => q.x), ys = sel.points.map(q => q.y), w = box.offsetWidth || 230, h = box.offsetHeight || 40;
  const po = paneOff(); let x = po.x + origin.x + Math.max(...xs) * scale + 12, y = po.y + origin.y + Math.min(...ys) * scale - 4;
  if (x + w > width - 8) x = origin.x + Math.min(...xs) * scale - w - 12; /* 右に入らなければ図形の左に */
  x = Math.max(8, Math.min(width - w - 8, x)); y = Math.max(36, Math.min(height - h - 8, y));
  box.style.left = Math.round(x) + 'px'; box.style.top = Math.round(y) + 'px'; box.hidden = false;
}
/** 選んだ範囲を、距離と向き（内側／外側）でオフセットする。結果は黄色の点線。 */
function runOffset(override = null) {
  let sel = offsetSelection; if (!sel) { $('hint').textContent = t('offsetNone'); return; }
  let sides; /* 向きごとの { d: 符号つき距離, key: 説明文のキー }。「両側」なら内側と外側の2本 */
  if (override !== null) sides = [{ d: override, key: override < 0 ? 'offsetIn' : 'offsetOut' }];
  else {
    const dist = Number($('offsetDist').value); if (!Number.isFinite(dist) || dist <= 0) { $('hint').textContent = t('invalidNumber'); return; }
    const sideOf = inner => { let d = inner ? -dist : dist, key = inner ? 'offsetIn' : 'offsetOut'; if (!sel.closed) { const k = bendInnerSign(sel.points); if (k) d = (inner ? k : -k) * dist; } return { d, key }; }; /* 折れた開いた線の「内側」は、曲がりの内側（挟まれた2直線なら鋭角側） */
    const v = $('offsetSide').value;
    if (v === 'cursor') { const ch = offsetCursorChoice(sel, offsetCursor || cursor, dist); if (!ch) { $('hint').textContent = t('impossible'); return; } sides = [{ d: ch.d, key: 'offsetCursorSide' }]; }
    else if (['left', 'right', 'up', 'down'].includes(v)) { /* 画面の向き：まっすぐな1本の線だけ。内側・外側では、1本の線のどちらか分かりにくいため */
      if (sel.closed || sel.points.length !== 2) { const es = offsetEdgeOfHit(sel); if (!es) { $('hint').textContent = t('offsetDirNeedLine'); return; } sel = es; } /* 矩形などは、クリックした位置に一番近い1辺だけをずらす */
      const want = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } }[v], probe = offsetSpanResult(sel, dist, { join: $('offsetJoin').value });
      const q0 = probe?.points ? probe.points[0] : probe && 'x1' in probe ? { x: probe.x1, y: probe.y1 } : null; /* 直線の結果は x1,y1…、折れ線の結果は points */
      if (!q0) { $('hint').textContent = t('impossible'); return; }
      const base0 = sel.points.reduce((m, q) => distance(q, q0) < distance(m, q0) ? q : m); /* 結果の端に一番近い元の端（向きが逆でも、横にずれた分だけを見る） */
      const dot = ((q0.x - base0.x) * want.x + (q0.y - base0.y) * want.y) / dist;
      if (Math.abs(dot) < 0.5) { $('hint').textContent = t('offsetDirPerp'); return; }
      sides = [{ d: dot > 0 ? dist : -dist, key: 'offset' + v[0].toUpperCase() + v.slice(1) }];
    } else sides = v === 'both' ? [sideOf(true), sideOf(false)] : [sideOf(v === 'in')];
  }
  const results = sides.map(sd => offsetSpanResult(sel, sd.d, { join: $('offsetJoin').value })); if (results.some(r => !r)) { $('hint').textContent = t('impossible'); return; }
  /* 結果は点線なのでガイドの層へ（ガイドが非表示・ロック中なら、見えなくならないよう作図先、なければ元の図形の層） */
  const dest = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || sel.layer; /* 点線はガイド。ガイドが使えないときだけ作図先・元の層 */
  offsetSelection = null; commit(() => { selected = new Set(); for (const r of results) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...r, id, layer: dest, color: 'yellow', lineStyle: 'dashed' }); selected.add(id); } }); /* 両側でも元に戻すのは1回で済む */
  $('hint').textContent = sides.length > 1 ? t('offsetDoneBoth', { d: Math.abs(sides[0].d) }) : t('offsetDone', { d: Math.abs(sides[0].d), side: t(sides[0].key) }); draw();
}
/** すでに丸めた角（円弧）を、もっと丸く（または小さく）しなおす：円弧の両端につながる2本の線を、交わる角まで延ばして戻し、新しい半径で丸めなおす。つながる2本が直線（2点だけの折れ線を含む）でなければ、できない。 */
function reroundArc(arc) {
  const asLine = x => x.type === 'polyline' && !x.closed && x.points.length === 2 ? { ...x, type: 'line', x1: x.points[0].x, y1: x.points[0].y, x2: x.points[1].x, y2: x.points[1].y } : x;
  const back = (orig, ln) => orig.type === 'polyline' ? { ...orig, points: [{ x: ln.x1, y: ln.y1 }, { x: ln.x2, y: ln.y2 }] } : ln;
  const ends = [circlePoint(arc, arc.startDeg), circlePoint(arc, arc.endDeg)], near = e => { for (const o of doc.shapes) { if (o.id === arc.id || !editable(o)) continue; const l = asLine(o); if (l.type !== 'line') continue; if (distance(e, { x: l.x1, y: l.y1 }) < 1e-4) return { o, l, end: 1 }; if (distance(e, { x: l.x2, y: l.y2 }) < 1e-4) return { o, l, end: 2 }; } return null; };
  const A = near(ends[0]), B = near(ends[1]); if (!A || !B || A.o.id === B.o.id) return false; /* 丸めた角ではない円弧：曲線どうしの丸めの1本目として扱う */
  const far = n => n.end === 1 ? { x: n.l.x2, y: n.l.y2 } : { x: n.l.x1, y: n.l.y1 }, fa = far(A), fb = far(B), da = { x: ends[0].x - fa.x, y: ends[0].y - fa.y }, db = { x: ends[1].x - fb.x, y: ends[1].y - fb.y };
  const den = da.x * db.y - da.y * db.x; if (Math.abs(den) < 1e-9) { $('hint').textContent = t('impossible'); return true; }
  const tt = ((fb.x - fa.x) * db.y - (fb.y - fa.y) * db.x) / den, C = { x: fa.x + da.x * tt, y: fa.y + da.y * tt }; if (!(tt >= 1 - 1e-6)) { $('hint').textContent = t('impossible'); return true; }
  const affected = new Set(doc.paths.filter(q => q.shapeIds.some(id => [arc.id, A.o.id, B.o.id].includes(id))).map(q => q.id));
  if (roundHoleBlock(affected)) { $('hint').textContent = t('holeChamfer'); return true; }
  const r = askNumber('radius', Math.round(arc.r * 100) / 100); if (r === null) return true;
  const VA = { type: 'line', x1: fa.x, y1: fa.y, x2: C.x, y2: C.y }, VB = { type: 'line', x1: fb.x, y1: fb.y, x2: C.x, y2: C.y }, na = filletCorner(VA, VB, r); if (!na) { $('hint').textContent = t('impossible'); return true; }
  const ne = [circlePoint(na, na.startDeg), circlePoint(na, na.endDeg)], pa = ne.reduce((m, q) => distTo(VA, m) <= distTo(VA, q) ? m : q), pb = ne.find(q => q !== pa);
  const upd = (n, pt) => back(n.o, { ...n.l, ['x' + n.end]: pt.x, ['y' + n.end]: pt.y });
  commit(() => {
    const id = freshId(doc.shapes.filter(x => x.id !== arc.id), 's'); const a2 = upd(A, pa), b2 = upd(B, pb);
    doc.shapes = doc.shapes.filter(x => x.id !== arc.id).map(x => x.id === A.o.id ? a2 : x.id === B.o.id ? b2 : x); doc.shapes.push({ ...na, id, layer: arc.layer });
    for (const part of doc.parts) if (part.shapeIds.includes(arc.id)) part.shapeIds = part.shapeIds.map(x => x === arc.id ? id : x);
    reattachMarks(affected, new Map([[arc.id, [id]]])); selected = new Set([A.o.id, B.o.id, id]);
  });
  $('hint').textContent = t('hint.fillet'); return true;
}
const curveType = x => ['arc', 'bezier', 'path', 'circle'].includes(x?.type);
/** 曲線（円弧・円・ベジェ・ペン）と、曲線または線の交点を、半径を入れた円弧でなめらかにつなぐ。first・hit は、それぞれ残したい側でクリックした図形（pFirst・p はそのクリック位置）。 */
function curveFillet(first, pFirst, hit, p) {
  const affected = new Set(doc.paths.filter(q => q.shapeIds.some(id => id === first.id || id === hit.id)).map(q => q.id));
  if (roundHoleBlock(affected)) { $('hint').textContent = t('holeChamfer'); cancel(); return; }
  const r = askNumber('radius', 3, 'fillet'); if (r === null) { cancel(); return; }
  const res = filletCurves(first, pFirst, hit, p, r); if (!res) { $('hint').textContent = t('impossible'); cancel(); return; }
  cancel();
  commit(() => {
    const id = freshId(doc.shapes, 's');
    doc.shapes = doc.shapes.map(x => x.id === first.id ? { ...res.a, id: first.id, layer: first.layer } : x.id === hit.id ? { ...res.b, id: hit.id, layer: hit.layer } : x);
    doc.shapes.push({ ...res.arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id]);
    for (const q of doc.paths) if (q.shapeIds.includes(first.id) && q.shapeIds.includes(hit.id)) q.shapeIds.push(id);
    reattachMarks(affected);
  });
  $('hint').textContent = t('hint.fillet');
}
/** 丸め・面取りの角の2本（端を共有）の先に、同じ直線上でつながった線があれば { c1, c2, M1, M2, ids }（c＝続きの線の列・M＝角から先端までを1本にした直線・ids＝続きの線の id の集合）。無ければ null。 */
function chainAround(first, hitL) {
  const asLine = s => s.type === 'line' ? s : { ...s, type: 'line', x1: s.points[0].x, y1: s.points[0].y, x2: s.points[1].x, y2: s.points[1].y };
  const pool = doc.shapes.filter(s => s.id !== first.id && s.id !== hitL.id && editable(s) && stitchable(s) && visible(s) && (s.type === 'line' || (s.type === 'polyline' && !s.closed && s.points.length === 2))).map(asLine);
  const ends = l => [{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }]; let C = null; for (const a of ends(first)) for (const b of ends(hitL)) if (distance(a, b) < 1e-9) C = a;
  if (!C) return null;
  const c1 = collinearChain(pool, first, C), c2 = collinearChain(pool, hitL, C); if (!c1.length && !c2.length) return null;
  const farOf = (l, ch) => ch.length ? ch.at(-1).far : (distance({ x: l.x1, y: l.y1 }, C) <= distance({ x: l.x2, y: l.y2 }, C) ? { x: l.x2, y: l.y2 } : { x: l.x1, y: l.y1 }), F1 = farOf(first, c1), F2 = farOf(hitL, c2);
  return { c1, c2, M1: { type: 'line', x1: C.x, y1: C.y, x2: F1.x, y2: F1.y }, M2: { type: 'line', x1: C.x, y1: C.y, x2: F2.x, y2: F2.y }, ids: new Set([...c1, ...c2].map(c => c.id)) };
}
/** 続きの線まで含めた丸め・面取りを図面に反映する：丸めの内側に入った線は消し、接点をまたぐ線は角側の端を接点へ切り詰める。円弧の層は最初にクリックした線の層。 */
function applyRoundChain(first, hit, res, ch, affectedPaths) {
  const id = freshId(doc.shapes, 's'), edits = new Map([...res.side1, ...res.side2].map(e => [e.id, e])), removed = new Set([...edits.values()].filter(e => e.remove).map(e => e.id));
  const trimmed = s => { const e = edits.get(s.id), ln = s.type === 'line' ? s : { x1: s.points[0].x, y1: s.points[0].y, x2: s.points[1].x, y2: s.points[1].y }; const atNear = Math.hypot(ln.x1 - e.near.x, ln.y1 - e.near.y) < 1e-6 ? 1 : 2; const upd = { ['x' + atNear]: e.to.x, ['y' + atNear]: e.to.y }; return s.type === 'line' ? { ...s, ...upd } : { ...s, points: atNear === 1 ? [{ x: e.to.x, y: e.to.y }, s.points[1]] : [s.points[0], { x: e.to.x, y: e.to.y }] }; };
  cancel();
  commit(() => {
    doc.shapes = doc.shapes.filter(s => !removed.has(s.id)).map(s => edits.has(s.id) ? trimmed(s) : s);
    doc.shapes.push({ ...res.arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id].filter(x => !removed.has(x)));
    for (const q of doc.paths) { if (q.shapeIds.includes(first.id) && q.shapeIds.includes(hit.id)) q.shapeIds.push(id); q.shapeIds = q.shapeIds.filter(x => !removed.has(x)); }
    doc.paths = doc.paths.filter(q => q.shapeIds.length);
    reattachMarks(affectedPaths);
  });
  $('hint').textContent = t('hint.chamfer');
}
/** 2本の直線 first・second の角に、前に丸めた（面取りした）円弧・直線が残っているか：2本を延ばして交わる角から近いほうの端どうしが離れていて、その2つの端をつなぐ円弧か直線があれば、それ（古いつなぎ）を返す。初めての角（端が同じ点）や平行な2本、つなぐものが無いときは null。三角形の斜めの辺のような、ほかの図形は、近いほうの端をつないでいないので対象にならない。 */
function oldCornerConnector(first, second) {
  const d1 = { x: first.x2 - first.x1, y: first.y2 - first.y1 }, d2 = { x: second.x2 - second.x1, y: second.y2 - second.y1 }, den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) return null;
  const tt = ((second.x1 - first.x1) * d2.y - (second.y1 - first.y1) * d2.x) / den, C = { x: first.x1 + d1.x * tt, y: first.y1 + d1.y * tt };
  const nearEnd = l => [{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }].reduce((m, q) => distance(m, C) <= distance(q, C) ? m : q);
  const P = nearEnd(first), Q = nearEnd(second); if (distance(P, Q) < 1e-6) return null;
  const same = (u, v) => distance(u, v) < 1e-4;
  return doc.shapes.find(o => { if (o.id === first.id || o.id === second.id || !editable(o)) return false; let e = null; if (o.type === 'arc') e = [circlePoint(o, o.startDeg), circlePoint(o, o.endDeg)]; else if (o.type === 'line') e = [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }]; return !!e && ((same(e[0], P) && same(e[1], Q)) || (same(e[0], Q) && same(e[1], P))); }) || null;
}
function editAt(p) {
  if (mode === 'offset') { offsetClick(p, false); offsetAlt = false; return; }
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distTo(s, p) <= 7 / scale && (!['chamfer', 'fillet'].includes(mode) || s.type === 'line' || s.type === 'polyline' || (mode === 'fillet' && curveType(s))));
  if (!hit) return;
  if (hit.type === 'arc' && !stage && reroundArc(hit)) return; /* 丸めた角（円弧）をもう一度クリック：半径を入れなおして丸めなおす */
  if (mode === 'fillet') { /* 曲線と曲線（または線）の交点を丸める：残したい側を1本ずつクリック */
    const f0 = stage ? doc.shapes.find(x => x.id === stage.id && editable(x)) : null;
    if (!stage && curveType(hit)) { stage = { kind: 'chamfer', id: hit.id, click: p }; selected = new Set([hit.id]); draw(); $('hint').textContent = t('secondLine'); return; }
    if (f0 && stage.id !== hit.id && (curveType(f0) || curveType(hit)) && stage.click) { curveFillet(f0, stage.click, hit, p); return; }
  }
  const twoPt = x => x.type === 'polyline' && !x.closed && x.points.length === 2; /* 2点だけの折れ線は、1本の線として2本の線の丸め・面取りに使う */
  if (hit.type === 'polyline' && !twoPt(hit)) { roundPolylineAt(hit, p); return; }
  if (!stage) { stage = { kind: 'chamfer', id: hit.id, click: p }; selected = new Set([hit.id]); draw(); $('hint').textContent = t('secondLine'); return; }
  if (stage.id === hit.id) return;
  const first0 = doc.shapes.find(s => s.id === stage.id && editable(s)), lineOf = x => twoPt(x) ? { ...x, type: 'line', x1: x.points[0].x, y1: x.points[0].y, x2: x.points[1].x, y2: x.points[1].y } : x, first = first0 && lineOf(first0), backOf = (orig, ln) => twoPt(orig) ? { ...orig, points: [{ x: ln.x1, y: ln.y1 }, { x: ln.x2, y: ln.y2 }] } : ln;
  if (!first) { cancel(); return; }
  const affectedPaths=new Set(doc.paths.filter(p=>p.shapeIds.includes(first.id)||p.shapeIds.includes(hit.id)).map(p=>p.id));
  if (roundHoleBlock(affectedPaths)) { $('hint').textContent = t('holeChamfer'); return; }
  const r = askNumber(mode === 'fillet' ? 'radius' : 'chamferSize', 3, mode === 'fillet' ? 'fillet' : 'chamfer'); if (r === null) return;
  let arc = (mode === 'fillet' ? filletCorner : chamferCorner)(first, lineOf(hit), r), gen = null;
  if (!arc) { gen = stage.click ? roundLinesAt(first, stage.click, lineOf(hit), p, r, mode) : null; arc = gen?.arc; } /* 端がつながっていない・交わっていない・鈍角などの2本は、のばした交点を角にして、のばす／切り詰めて丸める */
  if (!arc) { const ch = chainAround(first, lineOf(hit)); if (ch) { if (roundHoleBlock(new Set(doc.paths.filter(q => [...ch.ids].some(id => q.shapeIds.includes(id))).map(q => q.id)))) { $('hint').textContent = t('holeChamfer'); return; } const res = roundChainAt(first, ch.c1, lineOf(hit), ch.c2, r, mode); if (res) { applyRoundChain(first, hit, res, ch, affectedPaths); return; } } } /* 角の線が短くて入らないときは、同じ直線上につながった続きの線（層が違ってもよい）まで1本の辺として丸める（不具合記録 2026-10-17） */
  if (!arc) { const ch = chainAround(first, lineOf(hit)), lim = stage.click ? (ch ? cornerLimit(ch.M1, stage.click, ch.M2, p, mode) : cornerLimit(first, stage.click, lineOf(hit), p, mode)) : null; $('hint').textContent = lim && r > lim.max + 1e-9 ? t('roundTooBig', { r: +r.toFixed(2), max: Math.floor(lim.max * 100 + 1e-6) / 100, short: +lim.short.toFixed(2) }) : t('impossible'); return; } /* 半径が大きすぎるときは、入る最大の半径を知らせる */
  const endpoints = arc.type === 'arc' ? [circlePoint(arc, arc.startDeg), circlePoint(arc, arc.endDeg)] : [{x:arc.x1,y:arc.y1},{x:arc.x2,y:arc.y2}];
  const trim = (line, other) => {
    const end = distance({ x: line.x1, y: line.y1 }, { x: other.x1, y: other.y1 }) < 1e-9 || distance({ x: line.x1, y: line.y1 }, { x: other.x2, y: other.y2 }) < 1e-9 ? 1 : 2;
    const p = endpoints.reduce((a, b) => distTo(line, a) <= distTo(line, b) ? a : b);
    return { ...line, ['x' + end]: p.x, ['y' + end]: p.y };
  };
  const hitL = lineOf(hit), a = backOf(first0, gen ? gen.a : trim(first, hitL)), b = backOf(hit, gen ? gen.b : trim(hitL, first)), id = freshId(doc.shapes, 's');
  const old = oldCornerConnector(first, hitL); /* 同じ角を、前に丸めた（面取りした）あとで、2本の線から丸め直す：前の円弧・面取り線は不要なので消す（事業主指示 2026-10-17） */
  cancel();
  commit(() => {
    doc.shapes = doc.shapes.map(s => s.id === first.id ? a : s.id === hit.id ? b : s);
    if (old) { doc.shapes = doc.shapes.filter(s => s.id !== old.id); for (const part of doc.parts) if (part.shapeIds.includes(old.id)) part.shapeIds = part.shapeIds.filter(x => x !== old.id); for (const q of doc.paths) if (q.shapeIds.includes(old.id)) q.shapeIds = q.shapeIds.filter(x => x !== old.id); }
    doc.shapes.push({ ...arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id]);
    for (const q of doc.paths) if (q.shapeIds.includes(first.id) && q.shapeIds.includes(hit.id)) q.shapeIds.push(id); /* 2本が同じ線なら、間にできた円弧も同じ線に入れる */
    reattachMarks(affectedPaths);
  });
  $('hint').textContent = t('hint.chamfer');
}
/** 動かす図形の「基点」：掴んだ所の近く（磁石の吸着距離内）にある、選んだ図形の端・中点・中心。見つかれば gesture.start をその点に置き換え、相手の候補（動かさない図形の端・中点・中心）を gesture.targets に持つ（事業主指示 2026-10-13：選んだ矩形の中心と、くっつけたい図形の中心を合わせたい）。 */
function beginMoveSnap(g) {
  const reach = magnetRadiusMm(); if (!(reach > 0)) return;
  const all = m => [...m.ends, ...m.centers, ...m.guide], mine = all(magnetPointsOf(doc.shapes.filter(s => visible(s) && g.ids.has(s.id))));
  let near = reach, base = null; for (const c of mine) { const d = distance(g.start, c); if (d < near) { near = d; base = c; } }
  g.mine = mine; g.targets = all(magnetPointsOf(doc.shapes.filter(s => visible(s) && !g.ids.has(s.id))));
  if (base) { g.start = { ...base }; g.hasBase = true; } /* 基点が無い（点から離れた所をつかんだ）ときも、動かす図形の端・中点・中心が、相手の点に合う（movePosition） */
}
function moveDelta() { return { x: cursor.x - gesture.start.x, y: cursor.y - gesture.start.y }; }
function movePosition(p, shift) {
  const start = gesture.start;
  if (gesture.hasBase && gesture.targets?.length && !shift) { const reach = magnetRadiusMm(); let near = reach, hit = null; for (const c of gesture.targets) { const d = distance(p, c); if (d < near) { near = d; hit = c; } } if (hit) { snap = hit; return { ...hit }; } } /* 基点を持って動かしているとき：相手の点の近くでは、基点がその点にぴたりと合う */
  const own = gesture.mine, tg = gesture.targets, reachMm = magnetRadiusMm();
  if (own?.length && tg?.length && reachMm > 0 && own.length * tg.length <= 4e5 && (!gesture.hasBase || shift)) { /* 動かす図形の点（端・中点・中心）のどれかが、相手の点に近づいたら、ぴたりと合わせる。Shift（水平・垂直）のときは、動かせる向きの位置だけを合わせる */
    const d0 = { x: p.x - start.x, y: p.y - start.y }; let axis = null; if (shift) { axis = Math.abs(d0.x) >= Math.abs(d0.y) ? 'x' : 'y'; if (axis === 'x') d0.y = 0; else d0.x = 0; }
    let best = null, bd = reachMm;
    for (const m of own) for (const c of tg) { const ex = c.x - (m.x + d0.x), ey = c.y - (m.y + d0.y), d = axis === 'x' ? (Math.abs(ey) < reachMm ? Math.abs(ex) : Infinity) : axis === 'y' ? (Math.abs(ex) < reachMm ? Math.abs(ey) : Infinity) : Math.hypot(ex, ey); if (d < bd) { bd = d; best = { c, ex, ey }; } }
    if (best) { snap = best.c; return { x: start.x + d0.x + (axis === 'y' ? 0 : best.ex), y: start.y + d0.y + (axis === 'x' ? 0 : best.ey) }; }
  }
  let result = { ...p };
  if ($('snap').checked) {
    const grid = Number($('spacing').value) || 1;
    result = { x: start.x + Math.round((p.x - start.x) / grid) * grid, y: start.y + Math.round((p.y - start.y) / grid) * grid };
    let best = 9 / scale;
    for (const target of snapCache) {
      const d = distance(p, target);
      if (d < best) { best = d; result = { ...target }; }
    }
  }
  if (shift) { if (Math.abs(p.x - start.x) >= Math.abs(p.y - start.y)) result.y = start.y; else result.x = start.x; }
  return result;
}
/** ドラッグ中の図形の見た目（動かす・線の端・節点・矩形の取っ手・回す）。寸法が追従する端の位置を、ドラッグ中の位置から求めるために使う。 */
function livePreviewOf(sh) {
  if (!gesture) return sh;
  if (gesture.kind === 'node' && gesture.id === sh.id) return gesture.preview || sh;
  if (gesture.kind === 'lineEnd' && gesture.id === sh.id) return handleMoved(sh, gesture.h, cursor);
  if (gesture.kind === 'move') return previewMoved(sh);
  if (gesture.kind === 'rectR' && gesture.id === sh.id && gesture.box) { const b = gesture.box; return { ...sh, points: rectShape({ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 }).points }; }
  if (gesture.kind === 'circleR' && gesture.id === sh.id) return { ...sh, r: gesture.r };
  if (gesture.kind === 'rotate' && gesture.angle && rotateTargets().some(x => x.id === sh.id)) return rotate(sh, gesture.angle, gesture.c);
  return sh;
}
/** 追従する寸法（anchors あり）の、ドラッグ中の見た目：覚えた点を、ドラッグ中の図形の位置から求める（寸法の数字も、その場で変わる）。図面のデータは、離したときだけ変わる。 */
function liveDimension(d) {
  const pts = d.anchors.map(a => { const sh = a && doc.shapes.find(x => x.id === a.id); return sh ? (dimPointsOf(livePreviewOf(sh))[a.k] ?? null) : null; }); if (!pts.some(Boolean)) return previewMoved(d);
  const now = [{ x: pts[0]?.x ?? d.x1, y: pts[0]?.y ?? d.y1 }, { x: pts[1]?.x ?? d.x2, y: pts[1]?.y ?? d.y2 }], base = [{ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }], axis = dimAxisOf(base[0], base[1]) || dimAxisOf(now[0], now[1]), [p, q] = axis ? dimStraighten(now, axis, base, (d.anchors || []).map(Boolean)) : now;
  return { ...d, x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}
function previewMoved(s, owner = s.id) {
  if (gesture?.kind !== 'move' || !gesture.ids.has(owner)) return s;
  const d = moveDelta(); return translate(s, d.x, d.y);
}
/** 点 p の近く（画面9px以内）にある、線と線の交点のうち、いちばん近いもの（なければ null）。近くを通る線（最大12本）だけで交点を求めるので、マウスを動かしても重くならない。 */
function intersectionSnapAt(p) {
  const reach = 9 / scale, near = doc.shapes.filter(s => visible(s) && stitchable(s) && !['text', 'dimension', 'image'].includes(s.type) && distTo(s, p) <= reach * 2).slice(0, 12); if (near.length < 2) return null;
  let best = null, bd = reach; for (const q of allIntersections(near)) { const d = distance(p, q); if (d <= bd) { bd = d; best = { x: q.x, y: q.y }; } } return best;
}
function snapped(p, shift, anchor) {
  snap = null;
  let result = { ...p };
  const reach = magnetRadiusMm();
  if (reach > 0) { let near = reach; for (const c of [...magnetEnds, ...magnetCenters, ...magnetGuide]) { const d = distance(p, c); if (d < near) { near = d; result = { ...c }; snap = c; } } }
  if ($('snap').checked && !snap) {
    let best = 9 / scale;
    for (const c of [...snapCache, ...(stage?.points || [])]) { const d = distance(p, c); if (d < best) { best = d; result = { ...c }; snap = c; } }
  }
  /* 4分割：ほかの紙から来る点線に、横か縦だけぴったり合わせる */
  if (!snap && quadOn()) {
    const tg = threeViewSheetTargets(quadRole(), quadMarksCache), hit = threeViewSnapToLines(p, tg.xs, tg.ys, 9 / scale);
    if (hit) { const grid = Number($('spacing').value) || 1, onGrid = v => $('snap').checked ? Math.round(v / grid) * grid : v; result = { x: hit.snappedX ? hit.point.x : onGrid(p.x), y: hit.snappedY ? hit.point.y : onGrid(p.y) }; snap = result; }
  }
  /* 三面図：他の枠から伸ばした点線に、横か縦だけぴったり合わせる。合わなかった向きは、スナップが入のときだけ目盛りに丸める */
  if (!snap && threeViewOn()) {
    const hit = threeViewSnap(p, threeViewMarksCache, 9 / scale, threeViewLayout);
    if (hit) { const grid = Number($('spacing').value) || 1, onGrid = v => $('snap').checked ? Math.round(v / grid) * grid : v; result = { x: hit.snappedX ? hit.point.x : onGrid(p.x), y: hit.snappedY ? hit.point.y : onGrid(p.y) }; snap = result; }
  }
  if (!snap && (mode === 'ruler' || mode === 'dimension')) { const ix = intersectionSnapAt(p); if (ix) { result = ix; snap = ix; } }   /* 定規・寸法：線と線の交点にも吸い付く（事業主指摘 2026-10-17：交点から交点までの距離が測れない） */
  if ($('snap').checked && !snap) { const grid = Number($('spacing').value) || 1; result = { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid }; snap = result; }
  if (shift && anchor && mode === 'rect') { const dx = p.x - anchor.x, dy = p.y - anchor.y, m = Math.max(Math.abs(dx), Math.abs(dy)); result = { x: anchor.x + (dx < 0 ? -m : m), y: anchor.y + (dy < 0 ? -m : m) }; snap = result; }
  else if (shift && anchor) { if (Math.abs(p.x - anchor.x) >= Math.abs(p.y - anchor.y)) result.y = anchor.y; else result.x = anchor.x; snap = result; }
  return result;
}
function anchor() {
  if (gesture?.kind === 'draw' || gesture?.kind === 'move' || gesture?.kind === 'pen') return gesture.start;
  if (gesture?.kind === 'lineEnd') return gesture.fixed; /* Shift で、動かさない側の端から水平・垂直に固定 */
  if (stage?.points) return stage.points.at(-1);
  if (stage?.kind === 'path') return stage.nodes.at(-1) || null;
  if (stage?.kind === 'ruler' || stage?.kind === 'dim' || stage?.kind === 'mirror' || stage?.kind === 'foldDraw') return stage.a;
  if (stage?.kind === 'arc') return stage.center;
  if (stage?.kind === 'cmd' && mode === 'rect') return stage.start;
  if (stage?.kind === 'cmd' && mode === 'line') return stage.start; /* クリックで続けて引く直線：直前の点を基準に、Shift で水平・垂直へ固定する */
  if (stage?.kind === 'bezier') return stage.c1 ? stage.end : stage.start;
  if (stage?.kind === 'bzpts') return stage.points.at(-1);
  return null;
}
/** 対角の2点から矩形（閉じた折れ線・4点）。幅か高さが 0 なら null。 */
/** 矩形の「幅・高さ」欄（mm）。どちらも 0 より大きい数のときだけ { w, h }。それ以外（空・0・不正）は null＝ドラッグで自由に描く。 */
function rectSizeNow() { const w = Number($('rectW').value), h = Number($('rectH').value); return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { w, h } : null; }
/** 半径か直径を指定して円を置く（事業主指示 2026-10-15）。半径と直径の欄は連動する。入っていれば、クリックした位置を中心に、その大きさの円を置く（続けて置ける）。空ならドラッグで自由に描く。 */
const circleSizeNow = () => { const r = Number($('circleR').value); return Number.isFinite(r) && r > 0 ? r : null; };
const circleNum = v => String(Math.round(v * 10000) / 10000);
function placeCircleBySize(p) {
  const r = circleSizeNow(); if (!r) return; cancel(); addShape({ type: 'circle', cx: +p.x.toFixed(4), cy: +p.y.toFixed(4), r }); lastPoint = p;
  $('hint').textContent = t('circlePlaced', { r: circleNum(r), d: circleNum(r * 2) });
}
/** 幅・高さを指定した矩形。基準点 p を「左上の角」か「中心」にして、右下へ幅×高さぶん広げる。 */
function rectBySizeAt(p) {
  const z = rectSizeNow(); if (!z) return null; const c = $('rectAnchor').value === 'center', r4 = v => +v.toFixed(4), x = c ? p.x - z.w / 2 : p.x, y = c ? p.y - z.h / 2 : p.y;
  return rectShape({ x: r4(x), y: r4(y) }, { x: r4(x + z.w), y: r4(y + z.h) });
}
/** 幅・高さが入っているときの矩形ツールのクリック：その位置に、指定した大きさの矩形を置く（続けて置ける）。 */
function placeRectBySize(p) {
  const rect = rectBySizeAt(p), z = rectSizeNow(); if (!rect) return;
  cancel(); addShape(rect); lastPoint = p; $('hint').textContent = t('rectPlaced', { w: z.w, h: z.h });
}
function rectShape(a, b) {
  if (Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6) return null;
  return { type: 'polyline', closed: true, points: [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }] };
}
function shapeFromDrag(a, b) {
  if (mode === 'rect') return rectShape(a, b) || { type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  if (mode === 'circle') return { type: 'circle', cx: a.x, cy: a.y, r: distance(a, b) };
  return { type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
/** 円弧の作図方式が「3点」か。 */
function arcThreePoint() { return $('arcMethod').value === 'three'; }
function arcHalf() { return $('arcMethod').value === 'half'; } /* 2点の半円：始点・終点の2回クリック（2点が直径）。膨らむ側は「円弧の向き」 */
/** ツールの案内文。円弧は、選んだ描き方（3点／中心と半径）に合わせる。 */
/** 左のツールを選んだとき、Shift・Alt を押しながらする操作を、作図面の左上に一覧で出す。キーを押している間は、その行が光る。 */
let modHelpOn = true; try { if (localStorage.getItem('leather-cad.modHelp') === 'off') modHelpOn = false; } catch { /* 保存できない環境でも続ける */ }
function refreshModHelp() {
  const el = $('modHelp'); if (!el) return; if (!modHelpOn) { el.hidden = true; return; } const key = 'modHelp.' + mode, txt = t(key);
  if (txt === key) { el.hidden = true; return; }
  el.hidden = false; el.innerHTML = txt.split('\n').map(line => { const m = /^(.*?)[：:] *(.*)$/.exec(line) || [line, line, ''], kind = /Shift/.test(m[1]) && /Alt/.test(m[1]) ? 'sa' : /Shift/.test(m[1]) ? 's' : /Alt/.test(m[1]) ? 'a' : 'n'; return `<div data-k="${kind}"><b>${m[1]}</b>：${m[2]}</div>`; }).join('');
}
function syncModHelpKeys(e) { const el = $('modHelp'); if (el) el.setAttribute('data-mods', (e.shiftKey ? 's' : '') + (e.altKey ? 'a' : '')); }
document.addEventListener?.('keydown', syncModHelpKeys); document.addEventListener?.('keyup', syncModHelpKeys);
function modeHint(m) { return m === 'mark' && markDivisions() ? t('hint.markDiv', { n: markDivisions() }) : m === 'mark' && markDistance() > 0 ? t('hint.markDist') : m === 'arc' ? (arcThreePoint() ? t('hint.arc3') : arcHalf() ? t('hint.arcHalf') : t($('arcDir').value === 'ccw' ? 'hint.arcCcw' : 'hint.arc')) : t('hint.' + m); }
/** 円弧の「先に決める半径」(mm)。空欄・0以下は 0（＝ドラッグで決める）。 */
function arcFixedRadius() { const r = Number($('arcRadius').value); return Number.isFinite(r) && r > 0 ? r : 0; }
/** 3点（始点・通過点・終点）を通る円弧。一直線上なら null。通過点が弧の途中に来る向きに start/end を決める。 */
function arcThroughPoints(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (!Number.isFinite(d) || Math.abs(d) < 1e-9) return null;
  const sa = a.x * a.x + a.y * a.y, sb = b.x * b.x + b.y * b.y, sc = c.x * c.x + c.y * c.y;
  const cx = (sa * (b.y - c.y) + sb * (c.y - a.y) + sc * (a.y - b.y)) / d, cy = (sa * (c.x - b.x) + sb * (a.x - c.x) + sc * (b.x - a.x)) / d, r = Math.hypot(a.x - cx, a.y - cy);
  if (!(r > 1e-9) || r > 1e6) return null;
  const degA = Math.atan2(a.y - cy, a.x - cx) * 180 / Math.PI, degC = Math.atan2(c.y - cy, c.x - cx) * 180 / Math.PI, counter = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
  return counter ? { type: 'arc', cx, cy, r, startDeg: degA, endDeg: degC } : { type: 'arc', cx, cy, r, startDeg: degC, endDeg: degA };
}
/** 3点方式のクリックを1点受け取る。3点そろったら円弧にする。 */
/** 2点 a・b を直径とする半円。時計回りは a から b へ、反時計回りは b から a へ（円弧は角度が増える向きに描く）。 */
function halfCircleShape(a, b) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r = distance(a, b) / 2; if (!(r > 1e-9)) return null;
  const degA = Math.atan2(a.y - my, a.x - mx) * 180 / Math.PI;
  return $('arcDir').value === 'ccw' ? { type: 'arc', cx: mx, cy: my, r, startDeg: degA + 180, endDeg: degA + 360 } : { type: 'arc', cx: mx, cy: my, r, startDeg: degA, endDeg: degA + 180 };
}
/** 半円方式のクリックを1点受け取る。2点そろったら半円にする。 */
function halfClick(p) {
  const a = stage.pts[0]; if (distance(a, p) < 1e-8) return;
  const s = halfCircleShape(a, p); if (!s) return;
  stage = null; addShape(s); lastPoint = p; $('hint').textContent = modeHint('arc');
}
function arc3Click(p) {
  const pts = stage.pts; if (pts.some(q => distance(q, p) < 1e-8)) return;
  if (pts.length < 2) { pts.push(p); return; }
  const s = arcThroughPoints(pts[0], pts[1], p); if (!s) { $('hint').textContent = t('arcCollinear'); return; }
  stage = null; addShape(s); lastPoint = p; $('hint').textContent = modeHint('arc');
}
function arcShape(p) {
  const angle = Math.atan2(p.y - stage.center.y, p.x - stage.center.x) * 180 / Math.PI;
  /* 反時計回りは、向きを入れ替えて（終点の角度から始点の角度まで）時計回りに描く＝同じ円弧 */
  return $('arcDir').value === 'ccw' ? { type: 'arc', cx: stage.center.x, cy: stage.center.y, r: stage.r, startDeg: angle, endDeg: stage.startDeg } : { type: 'arc', cx: stage.center.x, cy: stage.center.y, r: stage.r, startDeg: stage.startDeg, endDeg: angle };
}
function bezierShape(p) {
  const c1 = stage.c1 || p, c2 = stage.c1 ? p : stage.end;
  return { type: 'bezier', x1: stage.start.x, y1: stage.start.y, x2: stage.end.x, y2: stage.end.y, c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y };
}
/** ベジェ：シングルクリックで始点・中点（何個でも）を足す。通る点を結ぶ滑らかな曲線。ダブルクリックか Enter で確定。 */
function bezierClick(p) {
  if (stage?.kind !== 'bzpts') { stage = { kind: 'bzpts', points: [p] }; $('hint').textContent = t('bezierNext'); draw(); return; }
  if (distance(stage.points.at(-1), p) >= 6 / scale) stage.points.push(p); /* 直前の点から画面上で6px未満＝ダブルクリックの手ぶれ。点を増やさない */
  draw();
}
function finishBezier() {
  if (stage?.kind !== 'bzpts') return; const nodes = smoothPathNodes(stage.points); stage = null;
  if (!nodes) { $('hint').textContent = t('bezierNeedTwo'); draw(); return; }
  addShape({ type: 'path', nodes, closed: false }); $('hint').textContent = t('hint.bezier'); draw();
}
function finishPolyline(closed = false) {
  if (stage?.kind !== 'polyline' || stage.points.length < (closed ? 3 : 2)) return;
  const shape = { type: 'polyline', points: stage.points, closed }; stage = null; addShape(shape); draw();
}
function path(s) {
  ctx.beginPath();
  if (s.type === 'line' || s.type === 'bezier') {
    ctx.moveTo(s.x1, s.y1);
    if (s.type === 'line') ctx.lineTo(s.x2, s.y2); else ctx.bezierCurveTo(s.c1x, s.c1y, s.c2x, s.c2y, s.x2, s.y2);
  } else if (s.type === 'circle' || s.type === 'arc') {
    const start = s.type === 'arc' ? s.startDeg * Math.PI / 180 : 0;
    ctx.arc(s.cx, s.cy, s.r, start, start + (s.type === 'arc' ? arcSweep(s) * Math.PI / 180 : Math.PI * 2));
  } else if (s.type === 'polyline') {
    s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (s.closed) ctx.closePath();
  } else if (s.type === 'path') {
    const segs = pathSegments(s); if (!segs.length) { const n = s.nodes[0]; if (n) { ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, n.y); } return; }
    ctx.moveTo(segs[0].x1, segs[0].y1);
    for (const seg of segs) seg.type === 'line' ? ctx.lineTo(seg.x2, seg.y2) : ctx.bezierCurveTo(seg.c1x, seg.c1y, seg.c2x, seg.c2y, seg.x2, seg.y2);
    if (s.closed) ctx.closePath();
  }
}
const segmentBoundsCache = new WeakMap();
/** 図形の色（5色）の画面表示用（黒背景向け）カラーコード。 */
const SHAPE_DRAW_COLOR = { blue: '#4da6ff', green: '#4ecb6b', red: '#ff5a5a', white: '#ffffff', yellow: '#f0d050' };
/** 寸法の数字の置き場所（画面での中心 x,y・向き・文字の大きさ px・文字）。描くときとクリックの判定で同じ式を使う。数字は寸法線から離れて描かれるので、判定にも数字の枠を含める（事業主指摘 2026-10-16）。 */
function dimLabelPlace(s, d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset)) {
  const px = Math.max(2.5, 12 / scale), ox = d.a.x - s.x1, oy = d.a.y - s.y1, ol = Math.hypot(ox, oy), nx = ol > 1e-9 ? ox / ol : d.textPos.x - (d.a.x + d.b.x) / 2, ny = ol > 1e-9 ? oy / ol : d.textPos.y - (d.a.y + d.b.y) / 2, nl = Math.hypot(nx, ny) || 1, gap = px * 0.62 + 2 / scale;
  return { x: (d.a.x + d.b.x) / 2 + nx / nl * gap, y: (d.a.y + d.b.y) / 2 + ny / nl * gap, angleDeg: d.angleDeg, px, label: d.value.toFixed(2) };
}
/** 図形までの距離。寸法は、寸法線までと、数字の枠（少し広め）までの近いほう。 */
function distTo(s, p) {
  const g = distToShape(s, p); if (s?.type !== 'dimension') return g;
  const L = dimLabelPlace(s), a = L.angleDeg * Math.PI / 180, dx = p.x - L.x, dy = p.y - L.y, lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
  const hw = L.label.length * L.px * 0.6 / 2, hh = L.px / 2, ex = Math.max(Math.abs(lx) - hw, 0), ey = Math.max(Math.abs(ly) - hh, 0);
  return Math.min(g, Math.hypot(ex, ey));
}
function strokeShape(s, color = '#d8d8d8', dashed = false) {
  if (!s) return;
  ctx.setLineDash(dashed ? [4 / scale, 3 / scale] : []);
  if (s.type === 'path') {
    const margin = 3 / scale, a = world({ x: 0, y: 0 }), b = world({ x: width, y: height });
    ctx.beginPath();
    for (const seg of pathSegments(s)) {
      let box = segmentBoundsCache.get(seg); if (!box) { box = bboxOf(seg); segmentBoundsCache.set(seg, box); }
      if (box.maxX < a.x - margin || box.minX > b.x + margin || box.maxY < a.y - margin || box.minY > b.y + margin) continue;
      ctx.moveTo(seg.x1, seg.y1);
      if (seg.type === 'line') ctx.lineTo(seg.x2, seg.y2); else ctx.bezierCurveTo(seg.c1x, seg.c1y, seg.c2x, seg.c2y, seg.x2, seg.y2);
    }
    ctx.strokeStyle = color; ctx.stroke(); return;
  }
  if (s.type === 'text') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angleDeg * Math.PI / 180); ctx.font = `${s.sizeMm}px system-ui, sans-serif`; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.fillText(s.text, 0, 0); ctx.restore(); return; }
  if (s.type === 'image') {
    const img = imageElement(s.imageId); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angleDeg * Math.PI / 180); ctx.globalAlpha = s.opacity;
    if (img && typeof ctx.drawImage === 'function') ctx.drawImage(img, 0, 0, s.wMm, s.hMm); else { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, s.wMm, s.hMm); }
    ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.setLineDash([2 / scale, 2 / scale]); ctx.strokeRect(0, 0, s.wMm, s.hMm); ctx.restore(); if (!imageCache.has(s.imageId)) loadImageInto(s.imageId); return;
  }
  if (s.type === 'fold') { ctx.save(); ctx.setLineDash([3 / scale, 2 / scale]); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.strokeStyle = color === '#c9a96e' ? color : '#7fb3ff'; ctx.stroke(); ctx.restore(); return; }
  if (s.type === 'dimension') {
    const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset);
    ctx.beginPath(); ctx.moveTo(d.a.x, d.a.y); ctx.lineTo(d.b.x, d.b.y); for (const [p, q] of d.ext) { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); } ctx.strokeStyle = color; ctx.stroke();
    /* 数値は、測る点から見て寸法線の外側へ少し離して置き、縁取りをつける（線・延長線と重ならない・事業主指摘 2026-10-15）。置く場所は dimLabelPlace（クリックの判定と同じ） */
    const L = dimLabelPlace(s, d), px = L.px, label = L.label;
    ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.angleDeg * Math.PI / 180); ctx.font = `${px}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5 / scale; ctx.strokeStyle = '#080808'; ctx.strokeText(label, 0, 0); ctx.fillStyle = color; ctx.fillText(label, 0, 0); ctx.restore(); return;
  }
  path(s); ctx.strokeStyle = color; ctx.stroke();
}
/** 端のハンドル（直線の両端・折れ線／矩形の全部の角・円弧の両端）。{ x, y, end（直線・円弧：1か2）, index（折れ線の角の番号） } の配列。 */
function shapeHandles(s) {
  if (s.type === 'line') return [{ x: s.x1, y: s.y1, end: 1 }, { x: s.x2, y: s.y2, end: 2 }];
  if (s.type === 'polyline') return s.points.map((q, index) => ({ x: q.x, y: q.y, index }));
  if (s.type === 'arc') return [{ ...circlePoint(s, s.startDeg), end: 1 }, { ...circlePoint(s, s.endDeg), end: 2 }];
  return [];
}
/** ハンドル h だけを p へ動かした図形。直線＝その端、折れ線＝その角、円弧＝中心と半径はそのまま角度だけ。 */
function handleMoved(s, h, p) {
  if (s.type === 'line') return h.end === 1 ? { ...s, x1: p.x, y1: p.y } : { ...s, x2: p.x, y2: p.y };
  if (s.type === 'polyline') return { ...s, points: s.points.map((q, i) => i === h.index ? { x: p.x, y: p.y } : q) };
  if (s.type === 'arc') { const deg = Math.atan2(p.y - s.cy, p.x - s.cx) * 180 / Math.PI; return h.end === 1 ? { ...s, startDeg: deg } : { ...s, endDeg: deg }; }
  return s;
}
/** 端のハンドルを持つ図形（直線・折れ線・矩形・円弧）。 */
const hasHandles = s => ['line', 'polyline', 'arc'].includes(s.type);
/** 延長線スナップ：カーソルが、動かさない側の端から元の向きに伸ばした線（延長線）の近く（画面で12px以内）なら、吸着した点を延長線の上にそろえる。離れれば自由に動かせる（Shift 不要でまっすぐ延長できる）。 */
function extensionSnap(fixed, dir, w, sp) {
  if (!dir) return sp;
  const perp = Math.abs((w.x - fixed.x) * dir.y - (w.y - fixed.y) * dir.x); if (perp > 12 / scale) return sp;
  const t = (sp.x - fixed.x) * dir.x + (sp.y - fixed.y) * dir.y; return { x: fixed.x + dir.x * t, y: fixed.y + dir.y * t };
}
/** 端をドラッグ中のカーソル位置。Shift：直線＝動かさない側の端から元の向きの線の上（水平・垂直の線なら水平・垂直のまま）、折れ線の角＝元の位置から水平か垂直（近い方）だけ。円弧は角度だけが変わる。 */
function lineEndCursor(g, w, shift) {
  const sp = snapped(w, false, null); if (!shift) return g.dir ? extensionSnap(g.fixed, g.dir, w, sp) : sp;
  if (g.dir) { const t = (sp.x - g.fixed.x) * g.dir.x + (sp.y - g.fixed.y) * g.dir.y; return { x: g.fixed.x + g.dir.x * t, y: g.fixed.y + g.dir.y * t }; }
  if (g.orig) return Math.abs(sp.x - g.orig.x) >= Math.abs(sp.y - g.orig.y) ? { x: sp.x, y: g.orig.y } : { x: g.orig.x, y: sp.y };
  return sp;
}
/** 選択中の図形のハンドル（画面で 9px 以内で一番近いもの）。ロック層は対象外。 */
function lineEndHit(p) {
  const s = selected.size === 1 ? doc.shapes.find(x => selected.has(x.id) && hasHandles(x) && editable(x)) : null; if (!s) return null;
  const near = 9 / scale; let best = null, bd = near; for (const h of shapeHandles(s)) { const d = distance(p, h); if (d <= bd) { bd = d; best = h; } }
  return best ? { shape: s, handle: best } : null;
}
/** クリック位置にある図形を選ぶ。許容（画面7px）に入る図形のうち、一番近いものを優先する（ほぼ同じ近さ＝1.5px以内なら、上に描かれたものを優先）。近い線が、すぐ上に重なった別の線・曲線に取られないように。 */
function pickShapeAt(p) {
  const tol = 7 / scale, cands = []; for (const s of doc.shapes) { if (!editable(s) || s.holeLink) continue; const d = distTo(s, p); if (d <= tol) cands.push({ s, d }); } /* 見えない補助の線（holeLink）はクリックで選ばない */
  if (!cands.length) return undefined; const min = Math.min(...cands.map(c => c.d)), near = cands.filter(c => c.d <= min + 1.5 / scale);
  const lenOf = x => { const n = arcLength(x); return Number.isFinite(n) ? n : Infinity; }; /* ほぼ同じ近さ（つながった端など）なら、短い図形を優先：短い線は端が長い線に重なるので、上のものを選ぶと端をクリックしても選べない。同じ長さなら上に描かれたもの */
  let best = near[0], bl = lenOf(best.s); for (const c of near.slice(1)) { const l = lenOf(c.s); if (l <= bl + 1e-6) { best = c; bl = Math.min(l, bl); } } return best.s;
}
/** 穴・目印をクリックしたときの距離。点の目印は長さ2mmの短い線（元の線と直角）なので、中心ではなく、その線までの距離で測る（端のあたりをクリックしても選べる）。 */
function holeHitDistance(h, p) {
  if (holeAppearance(h, doc)?.kind !== 'dot') return distance(h, p);
  const a = h.angleDeg * Math.PI / 180, ux = -Math.sin(a), uy = Math.cos(a), half = dotLen(h) / 2, t = Math.max(-half, Math.min(half, (p.x - h.x) * ux + (p.y - h.y) * uy));
  return distance({ x: h.x + ux * t, y: h.y + uy * t }, p);
}
function drawNodes(s) {
  const r = 3.5 / scale; ctx.lineWidth = 1 / scale;
  s.nodes.forEach((n, i) => {
    const current = !!nodeSel && nodeSel.id === s.id && nodeSel.index === i;
    if (current) { ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(n.inX, n.inY); ctx.lineTo(n.x, n.y); ctx.lineTo(n.outX, n.outY); ctx.stroke(); for (const h of [[n.inX, n.inY], [n.outX, n.outY]]) { ctx.beginPath(); ctx.arc(h[0], h[1], r * 0.8, 0, Math.PI * 2); ctx.fillStyle = '#c9a96e'; ctx.fill(); } }
    ctx.fillStyle = current ? '#c9a96e' : '#111'; ctx.strokeStyle = '#c9a96e';
    if (n.smooth) { ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(n.x - r, n.y - r, 2 * r, 2 * r); ctx.strokeRect(n.x - r, n.y - r, 2 * r, 2 * r); }
  });
}
/** 色つき書き出しの、金具の黄色い線の色：白い紙の上でも黒い革の上でも見える金色。 */
const EXPORT_GOLD_WIRE = '#c8a232';
/** 色つき書き出しの線の色（色コード）と太さ（画素）。dark＝線の下が暗い（黒い革など）か。黒い革の上は明るい線（画面と同じ）・白い紙の上は黒い線にして、どこでも見える。
 *  金具の黄色い線は明暗どちらでも見える金色で少し太く。金属の色の図形・寸法・文字は今までどおり。色なし（color=false）は黒の細い線（切る線）。
 *  （事業主の指摘 2026-10-18「PNG に変換すると全然違う配色・金具も消えている」：黒い革の上の黒い縫い目・縁、紙の上の薄い黄色の金具の線が見えなかった） */
function exportLineLook(s, dark, color) {
  if (s.type === 'dimension' || s.type === 'text') return { color: '#335', px: 1 };
  if (!color) return { color: '#000', px: 1 };
  const own = shapeLineColor(s);
  if (s.color === 'yellow') return { color: EXPORT_GOLD_WIRE, px: 2.4 };   /* 金属の色が付いていても、黄色指定の線は金色（薄い黄色は白い紙で見えない） */
  if (s.metal) return { color: own || '#000', px: 1.6 };
  if (own && s.color !== 'white') return { color: own, px: 1.6 };
  return { color: dark ? (own || '#d8d8d8') : '#000', px: 1.6 };
}
/** 明暗を読む必要がある線か（色の指定が無い・白）。金属・黄色・青緑赤・寸法・文字・画像などは、読まない。 */
const exportNeedsProbe = s => !s.metal && s.color !== 'yellow' && (!shapeLineColor(s) || s.color === 'white') && !['dimension', 'text', 'image', 'fold', 'path'].includes(s.type);
/** 図形の下（始め・まん中・終わりの3か所）の画素が暗いか。3か所のうち2か所以上で、まわり3×3画素のどれかが暗ければ true。読めない環境では false。 */
function exportBehindDark(s) {
  if (typeof ctx.getImageData !== 'function') return false;
  let pts; try { pts = flattenShape(s, 0.5); } catch { return false; } if (!pts || !pts.length) return false;
  let votes = 0;
  for (const p of [pts[0], pts[pts.length >> 1], pts[pts.length - 1]]) {
    try {
      const px = Math.round(origin.x + p.x * scale) - 1, py = Math.round(origin.y + p.y * scale) - 1; if (px < 0 || py < 0 || px + 3 > width || py + 3 > height) continue;
      const d = ctx.getImageData(px, py, 3, 3)?.data; if (!d) continue;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 77) { votes++; break; }
    } catch { /* 読めない画素は数えない */ }
  }
  return votes >= 2;
}
function draw() {

  ownPathsCache = null; if (doc !== foldSyncDoc) { foldSyncDoc = doc; syncFoldFields(); syncFoldCutField(); } /* 図面が入れ替わったら、設計カードの欄を図面の設計に合わせる */
  const dpr = exporting ? 1 : (window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (!exporting) { ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, width, height); }
  if (quadOn() && !exporting) { drawQuad(dpr); return; }
  ctx.translate(origin.x, origin.y); ctx.scale(scale, scale); ctx.lineWidth = 1 / scale;
  const lo = world({ x: 0, y: 0 }), hi = world({ x: width, y: height });
  if (exporting) {
    ctx.lineWidth = Math.max(0.1, 1 / scale);
    const color = exportColor, ef = exportFilter, vis = ef ? ef.vis : visible, list = doc.shapes.filter(vis);
    if (color) { drawLeatherFills(doc, vis); drawMetalFills(vis); }   /* 色つき：革色・質感・金属の色を、線の下に塗る（画面と同じ色） */
    const looks = new Map(); for (const sh of list) looks.set(sh.id, exportLineLook(sh, color && exportNeedsProbe(sh) ? exportBehindDark(sh) : false, color));   /* 線を引く前に、下の色の明暗を全部読む（先に引いた線に左右されない） */
    const outStroke = sh => { const lk = looks.get(sh.id); ctx.lineWidth = Math.max(0.1, lk.px / scale); strokeShape(sh, lk.color); };
    if (diamondMode() === 'fill') for (const sh of list) { if (sh.type !== 'polyline' || !diamondLoopSizes([sh]).length) continue; ctx.save(); ctx.fillStyle = looks.get(sh.id).color; path(sh); ctx.fill(); ctx.restore(); }   /* 菱目の見せ方＝塗り：菱の線（図形）も塗る */
    for (const s of list) if (!(color && s.occlude)) outStroke(s);
    if (color) for (const s of list) if (s.occlude) { drawOccluder(s, $('pngTransparent').checked ? null : '#fff'); outStroke(s); }   /* リングアームの棒：本体の上に重ねる */
    ctx.lineWidth = Math.max(0.1, 1 / scale);   /* 縫い穴の印は、いつもの太さ */
    for (const h of doc.holes.filter(ef ? ef.hvis : holeVisible)) { const a = holeAppearance(h, doc); if (!a || (a.kind === 'dot' && markHidden(h))) continue; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angleDeg * Math.PI / 180); ctx.beginPath(); if (a.kind === 'circle' || a.kind === 'dot') ctx.arc(0, 0, a.width / 2, 0, Math.PI * 2); else if (a.kind === 'slit') { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(a.width / 2, 0); } else { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(0, -a.height / 2); ctx.lineTo(a.width / 2, 0); ctx.lineTo(0, a.height / 2); ctx.closePath(); } const hc = (color && doc.paths.find(p => p.id === h.pathId)?.threadHex) || '#c00'; if (a.kind === 'diamond' && diamondMode() === 'fill') { ctx.fillStyle = hc; ctx.fill(); } else { ctx.strokeStyle = hc; if (color) ctx.lineWidth = Math.max(0.1, 1.6 / scale); ctx.stroke(); } ctx.restore(); }   /* 色つき：糸の色 */
    return;
  }
  drawSheetBody(lo, hi);
}
/** 紙 1 枚ぶんの描画（目盛り・図形・穴・作図中の線・吸着の印など）。ctx はその紙の座標に変換済み。 */
function drawSheetBody(lo, hi) {
  if ($('grid').checked) {
    let step = Number($('spacing').value) || 1; while (step * scale < 12) step *= 5;
    ctx.beginPath();
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) { ctx.moveTo(x, lo.y); ctx.lineTo(x, hi.y); }
    for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) { ctx.moveTo(lo.x, y); ctx.lineTo(hi.x, y); }
    ctx.strokeStyle = '#242424'; ctx.stroke();
  }
  if ($('printOverlay').checked) drawPrintOverlay();
  if ($('threeView').checked) { drawThreeViewMini(); drawThreeViewFrames(); drawThreeViewStaticGuides(); }
  ctx.beginPath(); ctx.moveTo(lo.x, 0); ctx.lineTo(hi.x, 0); ctx.moveTo(0, lo.y); ctx.lineTo(0, hi.y); ctx.strokeStyle = '#454039'; ctx.stroke();
  ctx.lineWidth = 1.5 / scale;
  const hl = aiHighlight.until > Date.now() ? aiHighlight.ids : null;
  for (const s of doc.shapes.filter(s => visible(s) && s.type === 'image')) strokeShape(s, selected.has(s.id) ? '#c9a96e' : '#555');
  // 革色・革の質感：部品の閉図形を塗る（カラーシミュレーション）。質感は図形自身の指定が優先、無ければ部品の指定。質感の無い部品は革色を半透明で
  if (viewShow.colors) drawLeatherFills(doc, visible, previewMoved); /* 革色・革の質感・型紙の輪郭の革色（画面・ほかの紙・PNG 書き出しで同じ見え方） */
  if (viewShow.colors) drawMetalFills(); /* 金属の色が付いた金具のべた塗り（線の下） */
  const strokeList = doc.shapes.filter(s => visible(s) && s.type !== 'image'), strokeOne = s => strokeShape(s.type === 'dimension' && s.anchors && gesture && !(gesture.kind === 'move' && gesture.ids.has(s.id)) ? liveDimension(s) : gesture?.kind === 'node' && gesture.id === s.id ? gesture.preview || s : gesture?.kind === 'lineEnd' && gesture.id === s.id ? handleMoved(s, gesture.h, cursor) : previewMoved(s), hl && hl.has(s.id) ? '#ff4040' : selected.has(s.id) ? '#c9a96e' : s.type === 'dimension' || s.type === 'text' ? '#9fb8c8' : shapeLineColor(s) || '#d8d8d8', s.lineStyle === 'dashed'); /* リングアーム（occlude）は、ほかの線のあとで、背景（金属の色が付いていればその塗り）で塗ってから描く：本体の縁の線がリングアームの下に隠れる（事業主の忠実な再現図 2026-10-13） */
  if (diamondMode() === 'fill') for (const s of strokeList) { if (s.type !== 'polyline' || !diamondLoopSizes([s]).length) continue; ctx.save(); ctx.fillStyle = selected.has(s.id) ? '#c9a96e' : shapeLineColor(s) || '#d8d8d8'; path(previewMoved(s)); ctx.fill(); ctx.restore(); }   /* 菱目の見せ方＝塗り：菱の線（図形）も、穴と同じように塗る */
  for (const s of strokeList) if (!s.occlude) strokeOne(s);
  for (const s of strokeList) if (s.occlude) { drawOccluder(s); strokeOne(s); }
  ctx.setLineDash([]);
  if (mode === 'select' && selected.size === 1) { const s = doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)); if (s) drawNodes(gesture?.kind === 'node' && gesture.preview ? gesture.preview : s); }
  if (mode === 'select' && selected.size === 1) { const ln = doc.shapes.find(s => selected.has(s.id) && hasHandles(s) && editable(s)); if (ln) { const v = gesture?.kind === 'lineEnd' && gesture.id === ln.id ? handleMoved(ln, gesture.h, cursor) : ln, r = 4 / scale; ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.5 / scale; ctx.strokeStyle = '#c9a96e'; ctx.fillStyle = '#111'; for (const q of shapeHandles(v)) { ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.restore(); } } /* 直線・折れ線・矩形・円弧を1つ選ぶと、端・角にハンドル（ドラッグでその端・角だけ動く） */
  for (const originalHole of doc.holes) {
    if (!holeVisible(originalHole) || (holeAppearance(originalHole, doc)?.kind === 'dot' && markHidden(originalHole))) continue;
    const owner = doc.paths.find(p=>p.id===originalHole.pathId)?.shapeIds[0];
    let h = previewMoved(originalHole, owner);
    if (gesture?.kind === 'hole' && gesture.id === h.id) h = holePosition(h, cursor);
    const appearance = holeAppearance(h, doc); if (!appearance) continue;
    const {kind,width:w,height:heightMM} = appearance;
    ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.angleDeg*Math.PI/180); ctx.beginPath();
    if (kind === 'dot') { const half = dotLen(h) / 2; ctx.moveTo(0,-half); ctx.lineTo(0,half); } /* 目印は、元の線と直角に交わる細かい点線（ガイドと同じ黄色）。長さは標準2mm・選んで端をつかむと変えられる */
    else if (kind === 'circle') ctx.arc(0,0,w/2,0,Math.PI*2);
    else if (kind === 'slit') { ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); }
    else { ctx.moveTo(-w/2,0); ctx.lineTo(0,-heightMM/2); ctx.lineTo(w/2,0); ctx.lineTo(0,heightMM/2); ctx.closePath(); }
    ctx.fillStyle = ctx.strokeStyle = selected.has(h.id) ? '#c9a96e' : ((viewShow.colors && doc.paths.find(p => p.id === h.pathId)?.threadHex) || '#fff');
    if (kind === 'dot') { ctx.strokeStyle = selected.has(h.id) ? '#c9a96e' : SHAPE_DRAW_COLOR.yellow; ctx.lineWidth = 1.5/scale; ctx.setLineDash([0.2,0.25]); ctx.stroke(); ctx.setLineDash([]); }
    else if (kind === 'slit') { ctx.lineWidth = heightMM; ctx.stroke(); } else if (kind === 'diamond' && diamondMode() === 'line') { ctx.lineWidth = 1.5 / scale; ctx.stroke(); } else ctx.fill();   /* 菱目：線にすると輪郭だけ（レーザーで塗りがNGのとき） */
    if(selected.has(h.id)&&kind!=='dot'&&kind!=='diamond'){ctx.lineWidth=1/scale;ctx.strokeRect(-w/2-2/scale,-heightMM/2-2/scale,w+4/scale,heightMM+4/scale);}
    ctx.restore();
  }
  if (mode === 'stitch' && manualNext) {
    const savedPath=doc.paths.find(p=>p.id===manualNext.pathId), route=savedPath && resolvePath(doc,savedPath);
    if(route && manualNext.s <= arcLength(route)) { const p=pointAtLength(route,manualNext.s); ctx.strokeStyle='#c9a96e';ctx.lineWidth=1/scale;ctx.strokeRect(p.x-4/scale,p.y-4/scale,8/scale,8/scale); }
  }
  if (!exporting) drawOverlaps(); drawCenterMarks(); drawJunctions(); drawStitchHover(); drawCountStage(); drawChainStops(); drawGapMarks();
  placeOffsetFloat(); placeDetourFloat(); syncRulerBar();
  if (detourState && mode === 'detour') { /* 基準の線＝橙、よける図形＝青、迂回路のプレビュー＝黄色の点線 */
    ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 3 / scale; const bs = doc.shapes.find(s => s.id === detourState.baseId), os = doc.shapes.find(s => s.id === detourState.obstId); if (bs) strokeShape(bs, '#ff9f43'); if (os) strokeShape(os, '#4da6ff'); ctx.restore();
    const r = detourCompute(); if (r && !r.error) { ctx.save(); ctx.lineWidth = 1.5 / scale; strokeShape({ type: 'polyline', points: r.points, closed: false }, SHAPE_DRAW_COLOR.yellow, true); ctx.restore(); }
  }
  if (offsetSelection && mode === 'offset') { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 3 / scale; strokeShape({ type: 'polyline', points: offsetSelection.points, closed: offsetSelection.closed }, '#ff9f43'); ctx.restore(); }
  if (offsetSelection && mode === 'offset' && $('offsetSide').value === 'cursor') { const ch = offsetCursorChoice(offsetSelection, offsetCursor, Number($('offsetDist').value)); if (ch) { ctx.save(); ctx.lineWidth = 1.5 / scale; strokeShape(ch.r, SHAPE_DRAW_COLOR.yellow, true); ctx.restore(); } } /* 向き「カーソルの側」：ずらした結果を、カーソルのある側にプレビュー */
  if (offsetSelection && mode === 'offset') { const pv = offsetPreviewResults(offsetSelection); if (pv.results.length || pv.failed) { ctx.save(); ctx.lineWidth = 1.5 / scale; for (const r of pv.results) strokeShape(r, SHAPE_DRAW_COLOR.yellow, true); if (pv.failed) { ctx.setLineDash([6 / scale, 4 / scale]); ctx.lineWidth = 3 / scale; strokeShape({ type: 'polyline', points: offsetSelection.points, closed: offsetSelection.closed }, '#ff4d4d'); } ctx.restore(); } } /* 内側・外側・両側：実行する前に、結果を黄色の点線でプレビュー。成立しない向きがあれば、選んだ範囲を赤い点線にする */
  ctx.setLineDash([5 / scale, 4 / scale]);
  if (gesture?.kind === 'draw') strokeShape(shapeFromDrag(gesture.start, cursor), '#c9a96e');
  if (mode === 'circle' && !gesture && circleSizeNow()) strokeShape({ type: 'circle', cx: cursor.x, cy: cursor.y, r: circleSizeNow() }, '#c9a96e', true); /* 置く前の仮の円 */
  if (mode === 'rect' && !gesture && rectSizeNow()) { const ghost = rectBySizeAt(cursor); if (ghost) strokeShape(ghost, '#c9a96e', true); } /* 置く前の仮の矩形 */
  drawCircleReadout();
  if (stage?.kind === 'arc') strokeShape(arcShape(cursor), '#c9a96e');
  if (stage?.kind === 'half') { const pv = distance(stage.pts[0], cursor) > 1e-8 ? halfCircleShape(stage.pts[0], cursor) : null; if (pv) strokeShape(pv, '#c9a96e'); for (const q of stage.pts) strokeShape({ type: 'circle', cx: q.x, cy: q.y, r: 2 / scale }, '#c9a96e'); }
  if (stage?.kind === 'arc3') { const pv = stage.pts.length >= 2 ? arcThroughPoints(stage.pts[0], stage.pts[1], cursor) : null; strokeShape(pv || { type: 'line', x1: stage.pts[0].x, y1: stage.pts[0].y, x2: (stage.pts[1] || cursor).x, y2: (stage.pts[1] || cursor).y }, '#c9a96e'); for (const q of stage.pts) strokeShape({ type: 'circle', cx: q.x, cy: q.y, r: 2 / scale }, '#c9a96e'); }
  if (stage?.kind === 'arcR') { const ang = Math.atan2(cursor.y - stage.center.y, cursor.x - stage.center.x); strokeShape({ type: 'line', x1: stage.center.x, y1: stage.center.y, x2: stage.center.x + stage.r * Math.cos(ang), y2: stage.center.y + stage.r * Math.sin(ang) }, '#c9a96e'); }
  if (stage?.kind === 'bzpts') { const pv = smoothPathNodes([...stage.points, cursor]); if (pv) strokeShape({ type: 'path', closed: false, nodes: pv }, '#c9a96e'); ctx.save(); ctx.setLineDash([]); ctx.fillStyle = '#c9a96e'; for (const q of stage.points) ctx.fillRect(q.x - 2.5 / scale, q.y - 2.5 / scale, 5 / scale, 5 / scale); ctx.restore(); }
  if (stage?.kind === 'polyline') strokeShape({ type: 'polyline', points: [...stage.points, cursor], closed: false }, '#c9a96e');
  if (stage?.kind === 'path') { const pv = pathPreview(); if (pv) { strokeShape(pv, '#c9a96e'); drawNodes({ ...pv, nodes: stage.nodes }); } }
  if (gesture?.kind === 'pen') { strokeShape({ type: 'line', x1: 2 * gesture.start.x - cursor.x, y1: 2 * gesture.start.y - cursor.y, x2: cursor.x, y2: cursor.y }, '#888'); }
  if (mode === 'ruler') { if (stage?.kind === 'ruler') drawRuler({ a: stage.a, b: cursor }); else if (ruler) drawRuler(ruler); }
  if (stage?.kind === 'markBase' || stage?.kind === 'markDiv') { /* 基準の点＝金色の丸、打てる場所の候補（線に沿って両側に○mm）＝小さな丸 */
    ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = '#c9a96e'; ctx.lineWidth = 1.5 / scale;
    ctx.beginPath(); ctx.arc(stage.at.x, stage.at.y, 6 / scale, 0, Math.PI * 2); ctx.stroke();
    for (const c of stage.cand) if (c) { ctx.beginPath(); ctx.arc(c.x, c.y, 3 / scale, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  if (stage?.kind === 'dimPlace') { const di = dimOffsetInfo(stage.a, stage.b, cursor); strokeShape({ type: 'dimension', x1: stage.a.x, y1: stage.a.y, x2: stage.b.x, y2: stage.b.y, offset: di.offset }, '#f0b429'); if (di.snap) strokeShape({ type: 'line', x1: di.snap[0].x, y1: di.snap[0].y, x2: di.snap[1].x, y2: di.snap[1].y }, '#7ee787'); }   /* 近くの寸法線にそろうときは、そろえる相手を緑の線で示す */   /* 3点目で作られる寸法の見本 */
  if (stage?.kind === 'dim') strokeShape({ type: 'dimension', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y, offset: Number($('dimOffset').value) || 8 }, '#c9a96e');
  if (stage?.kind === 'mirror') strokeShape({ type: 'line', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'cmd' && stage.start && mode === 'rect') strokeShape(shapeFromDrag(stage.start, cursor), '#c9a96e');
  else if (stage?.kind === 'cmd' && stage.start) strokeShape({ type: 'line', x1: stage.start.x, y1: stage.start.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'cmd' && mode === 'circle' && stage.center && distance(stage.center, cursor) > 1e-8) strokeShape(shapeFromDrag(stage.center, cursor), '#c9a96e'); /* 中心クリック後は中心固定で半径が伸縮 */
  if (stage?.kind === 'foldDraw') strokeShape({ type: 'fold', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'imgScale') strokeShape({ type: 'line', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (tracePreviewShapes.length) { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.2 / scale; for (const s of tracePreviewShapes) strokeShape(s, '#ff4040'); ctx.restore(); }
  if ($('threeView').checked) drawThreeViewGuides();
  if (pairLines.length) { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 0.6 / scale; ctx.strokeStyle = '#ff9f4388'; ctx.beginPath(); for (const [a, b] of pairLines) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } ctx.stroke(); ctx.restore(); }
  if (doc.seams.length) { ctx.save(); ctx.setLineDash([2 / scale, 2 / scale]); ctx.lineWidth = 1 / scale; ctx.strokeStyle = '#ff9f43'; ctx.beginPath();
    for (const m of doc.seams) { const pts = [m.a, m.b].map(side => { const saved = doc.paths.find(p => p.id === side.pathId); const route = saved && resolvePath(doc, saved); return route ? pointAtLength(route, (side.from + side.to) / 2) : null; }); if (pts[0] && pts[1]) { ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); } }
    ctx.stroke(); ctx.restore(); }
  if (stage?.kind === 'bezier') {
    const s = bezierShape(cursor); strokeShape(s, '#c9a96e');
    strokeShape({ type: 'line', x1: s.x1, y1: s.y1, x2: s.c1x, y2: s.c1y }, '#888');
    strokeShape({ type: 'line', x1: s.x2, y1: s.y2, x2: s.c2x, y2: s.c2y }, '#888');
  }
  if (gesture?.kind === 'select') {
    ctx.strokeStyle = '#c9a96e'; ctx.fillStyle = '#c9a96e20'; const a = gesture.start;
    ctx.fillRect(a.x, a.y, cursor.x - a.x, cursor.y - a.y); ctx.strokeRect(a.x, a.y, cursor.x - a.x, cursor.y - a.y);
  }
  ctx.setLineDash([]);
  if (snap && mode !== 'select') { ctx.strokeStyle = '#c9a96e'; ctx.strokeRect(snap.x - 4 / scale, snap.y - 4 / scale, 8 / scale, 8 / scale); }
  drawFoldCutMark(); drawFoldDims(); drawFoldHandles(); drawCircleHandles(); drawRectHandles(); drawRotateHandle();
  updateUI();
}
function resize() {
  const r = canvas.getBoundingClientRect(); width = r.width; height = r.height;
  canvas.width = Math.round(width * (window.devicePixelRatio || 1)); canvas.height = Math.round(height * (window.devicePixelRatio || 1)); draw();
  if (view3d) { canvas3d.width = canvas.width; canvas3d.height = canvas.height; render3d(); }
}
function zoom(factor, at = { x: viewW() / 2 + paneOff().x, y: viewH() / 2 + paneOff().y }) {
  const p = world(at), o = paneOff(); scale = Math.max(0.1, Math.min(100, scale * factor)); origin = { x: at.x - o.x - p.x * scale, y: at.y - o.y - p.y * scale }; draw();
}
function fit() {
  const shapes = doc.shapes.filter(visible), b = bboxOfDoc({ ...doc, shapes, holes: doc.holes.filter(holeVisible) });
  if (!b) { scale = 4; origin = { x: 80, y: 80 }; }
  else { const vw = viewW(), vh = viewH(); scale = Math.max(0.1, Math.min(100, (vw - 80) / Math.max(1, b.maxX - b.minX), (vh - 80) / Math.max(1, b.maxY - b.minY))); origin = { x: vw / 2 - (b.minX + b.maxX) / 2 * scale, y: vh / 2 - (b.minY + b.maxY) / 2 * scale }; }
  draw();
}
/* ── 操作の記録（不具合調査用・事業主指示 2026-10-13）：スクショにはポインタが映らないので、クリックの位置・当たった図形・選択の結果を、最近300件だけメモリに持つ。外部へは送らず、「不具合記録」ボタンでファイルに保存するだけ。 ── */
function logOp(kind, detail = {}) { opLog.push({ t: new Date().toISOString().slice(11, 23), kind, ...detail }); if (opLog.length > 300) opLog.shift(); }
function pointerLog(kind, e) {
  try {
    const p = local(e), w = world(p), near = doc.shapes.map(s => ({ id: s.id, type: s.type, layer: s.layer, d: distTo(s, w), editable: !!editable(s) })).filter(c => c.d <= 14 / scale).sort((a, b) => a.d - b.d).slice(0, 6).map(c => ({ ...c, d: +c.d.toFixed(2) }));
    logOp(kind, { btn: e.button, mode, px: [Math.round(p.x), Math.round(p.y)], mm: [+w.x.toFixed(2), +w.y.toFixed(2)], scale: +scale.toFixed(3), pick: pickShapeAt(w)?.id ?? null, near, nSel: selected.size, selected: [...selected].slice(0, 12), gesture: gesture?.kind ?? null, hint: $('hint')?.textContent ?? '' });
  } catch (err) { logOp('logError', { msg: String(err) }); }
}
function keyLog(e) { const el = e.target, text = el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'button', 'radio'].includes(el.type))); logOp('key', { key: text ? '(入力欄)' : e.key, ctrl: !!(e.ctrlKey || e.metaKey), shift: !!e.shiftKey, alt: !!e.altKey, target: el?.id || el?.tagName || '', mode }); }
function bugReport() {
  const ver = $('buildVer')?.textContent ?? '';
  return { kind: 'ncad-bug-report', savedAt: new Date().toISOString(), app: ver, env: { ua: (typeof navigator !== 'undefined' && navigator.userAgent) || '', scale: +scale.toFixed(3), origin, mode, tab: activeTab }, layers: doc.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible, locked: l.locked })), shapeCount: doc.shapes.length, selected: [...selected].slice(0, 50), log: opLog.slice(), doc };
}
/* 改善要望：使い勝手の意見を作者に直接送る（受け口は神社巡りノートと共通・app=ncad で別シート）。送るのは種類・本文・連絡先・版・画面情報だけ。図面の中身は送らない */
let fbRid = '';
function fbInfo() { return { w: globalThis.innerWidth, h: globalThis.innerHeight, ua: globalThis.navigator?.userAgent || '', lang: $('language').value, mode, tabs: tabs.length, shapes: doc.shapes.length, threeView: !!$('threeView')?.checked, offline: globalThis.location?.protocol === 'file:' }; }
function fbKind() { return ['idea', 'bug', 'cheer'].find(k => $('fbKind-' + k).checked) || 'idea'; }
function fbShowCtx() { $('fbCtx').textContent = $('fbCtxOn').checked ? feedbackContext(fbInfo()) : ''; }
function openFeedback() {
  fbRid = fbRid || newRid(); $('fbStatus').textContent = ''; $('fbStatus').className = 'fb-status'; $('fbSend').disabled = false; $('fbHp').value = ''; $('fbCount').textContent = `${$('fbMsg').value.length} / 500`;
  fbShowCtx(); $('feedbackDialog').showModal(); setTimeout(() => $('fbMsg').focus(), 50);
}
async function submitFeedback() {
  const st = $('fbStatus'), btn = $('fbSend'); fbRid = fbRid || newRid();
  btn.disabled = true; st.className = 'fb-status'; st.textContent = t('fbSending');
  const r = await sendFeedback({ kind: fbKind(), msg: $('fbMsg').value, contact: $('fbContact').value, lang: $('language').value, ver: $('buildVer')?.textContent ?? '', rid: fbRid, ctx: $('fbCtxOn').checked ? feedbackContext(fbInfo()) : '', hp: $('fbHp').value });
  btn.disabled = false;
  if (r.ok) { st.textContent = t('fbOk'); st.className = 'fb-status ok'; $('fbMsg').value = ''; $('fbContact').value = ''; $('fbCount').textContent = '0 / 500'; fbRid = newRid(); return; }
  const key = { short: 'fbShort', long: 'fbLong', links: 'fbLinks', contact: 'fbContactLong', busy: 'fbBusy' }[r.error] || 'fbNet';
  st.textContent = t(key); st.className = 'fb-status ng';
}
function bugReportName() { const d = new Date(), z = n => String(n).padStart(2, '0'); return `ncad-bug-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.json`; }
document.addEventListener?.('pointerdown', e => { if (e.target === canvas) pointerLog('down', e); }, true);
document.addEventListener?.('pointerup', e => { if (e.target === canvas) setTimeout(() => pointerLog('up', e), 0); }, true); /* 離した直後の状態（選択の結果・ヒント）を残す */
document.addEventListener?.('keydown', keyLog, true);
/** ボタン・見本・欄のクリックの記録（押したものの名前・選択数・画面下のメッセージ）。入力欄・選択欄の中身は残さない。 */
function clickLogNow(e) { const b = e.target?.closest?.('button, select, input, summary, label'); if (!b) return; const form = b.tagName === 'INPUT' || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA'; logOp('click', { id: b.id || '', cls: String(b.className || '').slice(0, 40), data: { ...(b.dataset || {}) }, text: form ? '' : String(b.textContent || '').trim().slice(0, 20), nSel: selected.size, mode, hint: $('hint')?.textContent ?? '' }); }
document.addEventListener?.('click', e => setTimeout(() => clickLogNow(e), 0), true); /* 押した直後の状態（選択数・メッセージ）を残す */
canvas.addEventListener('pointerdown', e => {
  hideCtxMenu(); /* 右クリックのメニューは、ほかをクリックしたら閉じる */
  if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
  if (isMac && e.ctrlKey && e.button === 0) return;
  e.preventDefault(); canvas.focus(); const p = local(e); canvas.setPointerCapture(e.pointerId);
  if (quadOn()) { const role = quadRoleAt(p); if (role === 'solid') { if (e.button === 0) gesture = { kind: 'spin', screen: p, yaw: miniCam.yaw, pitch: miniCam.pitch }; return; } if (role !== quadRole()) switchSheet(role); } /* 4分割：押した区画の紙に切り替える。右上は立体を回す */
  if (e.button === 1 || e.button === 2 || space) { gesture = { kind: 'pan', screen: p, origin: { ...origin } }; return; } // 右ドラッグ／中ボタン／Space で画面をつかんで動かす
  if (threeViewOn()) { const b = threeViewMiniBox(), w = world(p); if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h) { gesture = { kind: 'spin', screen: p, yaw: miniCam.yaw, pitch: miniCam.pitch }; return; } } /* 右上の小さな立体画面の中：ドラッグで回す */
  cursor = mode === 'select' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (mode === 'paint') { paintClick(world(p), e.altKey); return; }   /* 塗りモード：クリックで塗る・Alt＋クリックで色を拾う */
  if (mode === 'attach') { attachClick(world(p)); return; }   /* 線に着ける：クリックした本体の線に、選んだ金具を着ける */
  if (foldCutPicking) { foldCutPickClick(snapped(world(p), e.shiftKey, anchor())); return; }   /* 断面の位置の指定：クリックした高さ（磁石あり）を指定にして、1回で終わる */
  if (mode === 'offset' && offsetSelection && $('offsetSide').value === 'cursor' && !pickShapeAt(world(p)) && distTo({ type: 'polyline', points: offsetSelection.points, closed: offsetSelection.closed }, world(p)) <= (Number($('offsetDist').value) || 0) * 4 + 40 / scale) { offsetCursor = world(p); runOffset(); return; } /* 向き「カーソルの側」：何もない所のクリックで、その側へ実行 */
  if (mode === 'offset' || mode === 'chamfer' || mode === 'fillet') { offsetAlt = !!e.altKey; if (mode === 'offset') offsetCursor = world(p); editAt(world(p)); return; }
  if (mode === 'stitch') { if (e.altKey) stampAt(world(p), true, 'tool', false); else rangeStitchClick(world(p)); return; } /* Alt＝1穴だけ／ふつうのクリック＝始点→終点の2回で範囲を決めて打つ */ /* Alt＝1つだけ・Shift＝交点から交点までの区間だけ */
  if (mode === 'mark') { if (markDivisions()) markByDivision(world(p)); else if (markDistance() > 0) markByDistance(world(p)); else stampAt(markSnapPoint(world(p)), true, 'dot'); return; }
  if (mode === 'detour') { detourClick(world(p)); return; }
  if (mode === 'patchfill') { patchFillAt(world(p)); return; }
  if (mode === 'trim') { trimClick(world(p), e.shiftKey, e.altKey); return; } /* Shift＝残す側・Alt＝菱目と菱目の間だけ */
  if (mode === 'koma') { komaClick(world(p)); return; }
  if (mode === 'hardware') { placeHardware(cursor); return; }
  if (mode === 'phrase') { placePhrase(cursor); return; }
  if (mode === 'library') { placeLibrary(cursor); return; }
  if (mode === 'imgScale') { if (stage?.kind !== 'imgScale') { stage = { kind: 'imgScale', a: world(p) }; $('hint').textContent = t('imgScaleSecond'); } else imgScaleSecond(world(p)); draw(); return; }
  if (mode === 'fold') { if (stage?.kind !== 'foldDraw') stage = { kind: 'foldDraw', a: cursor }; else { const a = stage.a; stage = null; if (distance(a, cursor) > 1e-8) { const mid = { x: (a.x + cursor.x) / 2, y: (a.y + cursor.y) / 2 }, host = doc.shapes.find(s => (s.type === 'polyline' || s.type === 'path') && s.closed && partOf(s) && (b => b.minX <= mid.x && b.maxX >= mid.x && b.minY <= mid.y && b.maxY >= mid.y)(bboxOf(s))); addShape({ type: 'fold', x1: a.x, y1: a.y, x2: cursor.x, y2: cursor.y, angleDeg: Number($('foldAngle').value) || 0, partId: host ? partOf(host).id : null, inner: $('foldInner').checked }); } } lastPoint = cursor; draw(); return; }
  if (mode === 'text') { const content = askText(); if (content) { addShape({ type: 'text', x: cursor.x, y: cursor.y, text: content, sizeMm: Number($('textSize').value) || 5, angleDeg: 0 }); lastPoint = cursor; } return; }
  if (mode === 'circle' && circleSizeNow()) { placeCircleBySize(cursor); return; } /* 半径・直径が入っている：クリックした位置を中心に、その大きさの円を置く */
  if (mode === 'rect' && rectSizeNow()) { placeRectBySize(cursor); return; } /* 幅・高さが入っている：クリックした位置に、その大きさの矩形を置く */
  if (mode === 'bezier') { bezierClick(cursor); return; }
  if (mode === 'ruler') { rulerClick(cursor); return; }   /* 定規＝2点間の距離をちょっと測るだけ（寸法は作らない・事業主指示 2026-10-15） */
  if (mode === 'dimension') { dimToolClick(cursor); return; }   /* 寸法＝2点で測り、3点目をクリックした位置に初めて寸法を作る */
  if (mode === 'mirror') {
    const axis = doc.shapes.filter(s => visible(s) && s.type === 'line' && !selected.has(s.id)).reverse().find(s => distTo(s, world(p)) <= 7 / scale);
    if (stage?.kind === 'mirrorMid') { /* 2本目の線：1本目との真ん中を軸にする */
      if (!axis || axis.id === stage.id) { $('hint').textContent = t('mirrorMid1'); return; }
      const first = doc.shapes.find(s => s.id === stage.id), ax = first ? midAxisOf(first, axis) : null; if (!ax) { $('hint').textContent = t('mirrorNotParallel'); return; }
      stage = null; mirrorCopy(ax.a, ax.b); return;
    }
    if (axis && e.shiftKey) { stage = { kind: 'mirrorMid', id: axis.id }; $('hint').textContent = t('mirrorMid1'); draw(); return; } /* Shift+クリック：2本の線の真ん中を軸にする（1本目） */
    if (axis) { mirrorCopy({ x: axis.x1, y: axis.y1 }, { x: axis.x2, y: axis.y2 }); return; }
    if (stage?.kind !== 'mirror') stage = { kind: 'mirror', a: cursor }; else { const a = stage.a; stage = null; if (distance(a, cursor) > 1e-8) mirrorCopy(a, cursor); }
    draw(); return;
  }
  if (mode === 'path') {
    if (stage?.kind === 'path' && stage.nodes.length >= 2 && distance(cursor, stage.nodes[0]) <= 9 / scale) { finishPath(true); return; }
    gesture = { kind: 'pen', start: cursor, screen: p }; draw(); return;
  }
  if (mode === 'select' && e.button === 0 && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) { const gm = gapMarkAt(cursor); if (gm) { fillOneGap(gm); return; } } /* 赤い輪（歯抜けの印）のクリックは、下の線の選択より優先 */
  if (mode === 'select' && e.button === 0) { const fh = foldHandleAt(p); if (fh) { startFoldHandleDrag(fh, world(p)); return; } }
  if (mode === 'select') {
    const pathShape = selected.size === 1 ? doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)) : null;
    /* ハンドル（直線の端・ペンの節点）は、選択中の図形が、ほかのどの図形より（1.5px以上）遠くないときだけ使う。正確にほかの線をクリックしたときは、その線を選ぶ */
    const selOne = selected.size === 1 ? doc.shapes.find(x => selected.has(x.id)) : null, nearest = selOne ? pickShapeAt(cursor) : null;
    const handleOk = !selOne || !nearest || nearest.id === selOne.id || distTo(selOne, cursor) <= distTo(nearest, cursor) + 1.5 / scale;
    const rg = rotateHandleHit(cursor); if (rg) { gesture = { kind: 'rotate', c: rg.c, a0: angleOf(rg.c, cursor), angle: 0, cursor }; $('hint').textContent = t('rotDrag', { a: 0 }); draw(); return; }
    const ch = handleOk ? circleHandleHit(cursor) : null;
    if (ch) { gesture = { kind: 'circleR', id: ch.shape.id, cx: ch.shape.cx, cy: ch.shape.cy, r: ch.shape.r }; $('hint').textContent = t('circleDrag', { r: circleNum(ch.shape.r), d: circleNum(ch.shape.r * 2) }); draw(); return; }
    const rh = handleOk && !e.altKey ? rectHandleHit(cursor) : null;   /* Alt を押しながら＝角だけを動かす（従来の頂点ドラッグ） */
    if (rh) {
      if (doc.paths.some(pt => pt.shapeIds.includes(rh.shape.id) && doc.holes.some(h => h.pathId === pt.id))) { $('hint').textContent = t('rectHoles'); draw(); return; }   /* 縫い穴が付いている矩形は、穴を壊さないよう動かさない（線の端と同じ） */
      const b = rectBoxOf(rh.shape); gesture = { kind: 'rectR', id: rh.shape.id, h: rh.h, box0: b, box: b }; $('hint').textContent = t('rectDrag', { w: circleNum(b.x1 - b.x0), h: circleNum(b.y1 - b.y0) }); draw(); return;
    }
    const le = handleOk ? lineEndHit(cursor) : null;
    if (le) { let fixed = null, dir = null, orig = null; const sh = le.shape, h = le.handle; if (sh.type === 'line' || (sh.type === 'polyline' && !sh.closed && sh.points.length === 2)) { /* 直線、または節点が2つだけの折れ線（実質は直線）：動かさない側の端から元の向きに延長できる */ fixed = sh.type === 'line' ? (h.end === 1 ? { x: sh.x2, y: sh.y2 } : { x: sh.x1, y: sh.y1 }) : sh.points[1 - h.index]; const ln = Math.hypot(h.x - fixed.x, h.y - fixed.y); dir = ln > 1e-9 ? { x: (h.x - fixed.x) / ln, y: (h.y - fixed.y) / ln } : null; } else if (sh.type === 'polyline') orig = { x: h.x, y: h.y }; const holed = doc.paths.some(pt => pt.shapeIds.includes(sh.id) && doc.holes.some(hh => hh.pathId === pt.id)); if (holed && !dir) { $('hint').textContent = t('lineEndHoles'); draw(); return; } /* 菱目付きは、直線を元の向きに延ばす・縮めるだけ（向きは自動で固定） */ gesture = { kind: 'lineEnd', id: sh.id, h, screen: p, fixed, dir, orig, holed }; $('hint').textContent = t(sh.type === 'line' || dir ? 'lineEndDrag' : sh.type === 'arc' ? 'arcEndDrag' : 'vertexDrag'); draw(); return; } /* 端・角のハンドルをつかむと、ほかは動かさずその端・角だけ動かす */
    const nh = pathShape && handleOk && nodeHit(pathShape, cursor);
    if (nh) {
      nodeSel = { id: pathShape.id, index: nh.index }; gesture = { kind: 'node', id: pathShape.id, index: nh.index, part: nh.part, alt: e.altKey, screen: p, preview: null };
      const ns = pathShape.nodes; if (nh.part === 'anchor' && !pathShape.closed && ns.length === 2 && ns.every(n => !n.smooth && n.inX === n.x && n.inY === n.y && n.outX === n.x && n.outY === n.y)) { /* 曲がりのない2節点のペン（実質は直線）：Shift で、動かさない側の端から元の向きに延長できる */
        const fx = ns[1 - nh.index].x, fy = ns[1 - nh.index].y, mx = ns[nh.index].x, my = ns[nh.index].y, ln = Math.hypot(mx - fx, my - fy);
        if (ln > 1e-9) { gesture.fixed = { x: fx, y: fy }; gesture.dir = { x: (mx - fx) / ln, y: (my - fy) / ln }; $('hint').textContent = t('lineEndDrag'); }
      }
      draw(); return;
    }
    /* 穴（菱目）は小さいので、判定は中心から 12px まで広げ、入った穴のうちいちばん近いものを選ぶ（事業主指摘 2026-10-16：任意の菱目を選んで削除できない）。穴から 7px より離れた所の線を正確に（4px 以内で）クリックしたときは、穴ではなく線を選ぶ */
    let hole = doc.holes.filter(h => holeEditable(h) && !markHidden(h)).map(h => ({ h, d: holeHitDistance(h, cursor) })).filter(c => c.d <= Math.max(12 / scale, holeAppearance(c.h, doc)?.kind === 'dot' ? 0 : (holeAppearance(c.h, doc)?.width || 0) / 2)).sort((p, q) => p.d - q.d)[0];
    if (hole) { const ln = pickShapeAt(cursor); if (ln && distTo(ln, cursor) < 4 / scale && hole.d > 7 / scale) hole = undefined; }
    hole = hole?.h;
    if(hole){ if(e.shiftKey){if(selected.has(hole.id))selected.delete(hole.id);else selected.add(hole.id);}else if(selected.has(hole.id)&&selectedShapeIds().size){ /* 線などの図形といっしょに選んだ菱目をつかんだら、その菱目だけを滑らせず、選んだ全体を動かす（不具合記録 2026-10-17：菱目の近くをつかむと、選んだ図形が移動できなかった） */ gesture={kind:'move',start:cursor,screen:p,ids:selectedShapeIds()}; beginMoveSnap(gesture);} else {if(!selected.has(hole.id))selected=new Set([hole.id]);gesture={kind:'hole',id:hole.id,start:cursor};} draw();return;}
    const hit = pickShapeAt(cursor);
    cancelSpanClick();
    if (e.altKey && hit) { selectSpanAt(cursor, e.shiftKey, { byHoles: true }); return; } /* Alt+クリック：菱目と菱目の間だけを選ぶ（Shift で追加） */
    if (hit && (!e.shiftKey || selected.has(hit.id))) {   /* Shift を押したまま、選択済みの図形をつかんでも動かせる（水平・垂直に固定）。動かさずに離したら、これまでどおり選択から外す */
      if (!selected.has(hit.id)) { selected = expandToGroups(doc.shapes, new Set([hit.id])); nodeSel = null; } /* グループの図形なら全体を選ぶ */
      gesture = { kind: 'move', start: cursor, screen: p, ids: selectedShapeIds(), ...(e.shiftKey ? { shiftToggle: hit.id } : {}) }; /* 単なるクリックでは節点を増やさない（右クリック・ダブルクリックのときだけ） */
      beginMoveSnap(gesture); /* 掴んだ所が選んだ図形の端・中点・中心の近くなら、その点を「基点」にして、離す所で相手の点に合わせる */
    } else { gesture = { kind: 'select', start: cursor, screen: p, additive: e.shiftKey }; if (!e.shiftKey) nodeSel = null; }
  }
  else if (stage) { gesture = { kind: 'stage' }; }
  else { gesture = { kind: 'draw', start: cursor }; }
  draw();
});
canvas.addEventListener('pointermove', e => {
  const p = local(e);
  if (gesture?.kind === 'foldHandle') { dragFoldHandle(world(p)); return; }
  if (gesture?.kind === 'rotate') { const c = world(p); cursor = c; gesture.cursor = c; gesture.angle = rotateAngleNow(gesture, c, e.shiftKey); $('hint').textContent = t('rotDrag', { a: gesture.angle }); draw(); return; }
  if (gesture?.kind === 'circleR') { const c = snapped(world(p), e.shiftKey, { x: gesture.cx, y: gesture.cy }); cursor = c; gesture.r = Math.max(0.05, Math.round(distance({ x: gesture.cx, y: gesture.cy }, c) * 1000) / 1000); $('hint').textContent = t('circleDrag', { r: circleNum(gesture.r), d: circleNum(gesture.r * 2) }); draw(); return; }
  if (gesture?.kind === 'rectR') { const c = snapped(world(p), false, null); cursor = c; gesture.box = rectResized(gesture, c, e.shiftKey); $('hint').textContent = t('rectDrag', { w: circleNum(gesture.box.x1 - gesture.box.x0), h: circleNum(gesture.box.y1 - gesture.box.y0) }); draw(); return; }
  if (!gesture && mode === 'select') { const rhot = (() => { const hh = rectHandleHit(world(p)); return hh ? rectHandlePoints(rectBoxOf(hh.shape)).findIndex(q => q.ix === hh.h.ix && q.iy === hh.h.iy) : null; })(); if (rhot !== rectHot) { rectHot = rhot; canvas.style.cursor = rhot !== null ? 'nwse-resize' : ''; draw(); } }
  if (!gesture && mode === 'select') { const hot = circleHandleHit(world(p))?.k ?? null; if (hot !== circleHot) { circleHot = hot; canvas.style.cursor = hot !== null ? 'nesw-resize' : ''; draw(); } }
  if (!gesture && mode === 'select') { const hot = foldHandleAt(p)?.key ?? null; if (hot !== fdHandleHot) { fdHandleHot = hot; canvas.style.cursor = hot ? 'ew-resize' : ''; draw(); } }
  if (quadOn()) quadHover = quadRoleAt(p);
  stitchHover = mode === 'stitch' && !gesture ? stitchHoverAt(world(p)) : null; /* 目打ち：吸い付く点に印（輪）を出す */
  if (gesture?.kind === 'spin') { miniCam = { yaw: gesture.yaw + (p.x - gesture.screen.x) * 0.5, pitch: Math.max(-89, Math.min(89, gesture.pitch - (p.y - gesture.screen.y) * 0.5)) }; draw(); return; }
  if (gesture?.kind === 'pan') { origin = { x: gesture.origin.x + p.x - gesture.screen.x, y: gesture.origin.y + p.y - gesture.screen.y }; cursor = world(p); }
  else cursor = gesture?.kind === 'move' ? movePosition(world(p), e.shiftKey) : mode === 'select' && gesture?.kind !== 'node' && gesture?.kind !== 'lineEnd' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (mode === 'offset') offsetCursor = world(p); /* 向き「カーソルの側」：カーソル位置を覚えて、ずらした結果をプレビュー */
  if (gesture?.kind === 'lineEnd' || (gesture?.kind === 'node' && gesture.dir)) cursor = lineEndCursor(gesture, world(p), e.shiftKey || !!gesture.holed);
  if (gesture?.kind === 'node') { const s = doc.shapes.find(s => s.id === gesture.id); gesture.alt = gesture.alt || e.altKey; if (s) gesture.preview = editedNodePath(s, gesture, cursor); }
  draw();
});
/** 右クリック：曲線（ペン・ベジェ）の経由点を、その場で足す／消す。点の上＝その点を削除、曲線の上＝そこに経由点を追加。描いている途中は何もしない。 */
/** 右クリックのメニュー（選んだ図形を部品ライブラリに登録する）を、クリックした位置のそばに出す。 */
/** 右メニュー（右の細長い列）の項目＝見えているカード。右クリックのメニューに並べて、長い列をスクロールせずに開けるようにする。 */
const ctxCardList = () => [...(document.querySelectorAll('#side details.card') || [])].filter(c => !c.hidden && c.querySelector('summary'));
function fillCtxCards() {
  const box = $('ctxCards'), cards = ctxCardList(); box.innerHTML = '';
  for (const c of cards) { const b = document.createElement('button'); b.textContent = c.querySelector('summary').textContent; b.onclick = () => { for (const o of ctxCardList()) o.open = o === c; hideCtxMenu(); c.scrollIntoView?.({ block: 'start' }); }; box.appendChild(b); }   /* 押した項目だけを開く（ほかは閉じる）→ 長い列でも目的の項目が先頭に来る */
  $('ctxCardsTitle').hidden = !cards.length; return cards.length;
}
function showCtxMenu(e) {
  const menu = $('ctxMenu'), p = local(e); fillCtxCards(); $('ctx-lib').hidden = selected.size < 1;
  menu.hidden = false; const w = menu.offsetWidth || 200, h = menu.offsetHeight || 40;   /* 出してから大きさを測る（項目が多いので） */
  menu.style.left = Math.round(Math.max(8, Math.min(width - w - 8, p.x))) + 'px'; menu.style.top = Math.round(Math.max(36, Math.min(height - h - 8, p.y))) + 'px';
}
function hideCtxMenu() { $('ctxMenu').hidden = true; }
let lastPanDragAt = -1e9; /* 右ドラッグ（画面の移動）を終えた時刻。離した直後に出るメニューのイベントを無視するため */
canvas.addEventListener('contextmenu', e => {
  e.preventDefault(); hideCtxMenu();
  if (Date.now() - lastPanDragAt < 400) return; /* 画面を動かしたあとは、メニューを出さない（動かさずに右クリックしたときだけ出す） */
  if (!['select', 'bezier', 'path'].includes(mode) || stage) return;
  if (mode === 'select' && selected.size > 1) { showCtxMenu(e); return; } /* 複数選択（全体選択など）：メニュー。ペンの経由点の編集は、選択が1つ以下のとき */
  const w = world(local(e)), r = 7 / scale, curves = doc.shapes.filter(s => visible(s) && editable(s) && (s.type === 'path' || s.type === 'bezier')).reverse();
  for (const s0 of curves) { /* まず、経由点の上かどうか */
    const s = s0.type === 'path' ? s0 : toPath(s0), i = s.nodes.findIndex(n => distance(n, w) <= r);
    if (i >= 0) { const next = pathRemoveNode(s, i); if (!next) { $('hint').textContent = t('nodeRemoveImpossible'); return; } selected = new Set([s0.id]); nodeSel = null; transformSelectedTo(next); $('hint').textContent = t('nodeRemoved'); return; }
  }
  for (const s0 of curves) { /* 次に、曲線の上かどうか */
    if (distTo(s0, w) > r) continue; const s = s0.type === 'path' ? s0 : toPath(s0), next = pathInsertNode(s, projectOnPath(s, w).s);
    selected = new Set([s0.id]); nodeSel = null; transformSelectedTo(next); $('hint').textContent = t('nodeAdded'); return;
  }
  if (mode === 'select' && (selected.size >= 1 || ctxCardList().length)) showCtxMenu(e); /* 経由点・曲線の上でなければ、選んだ図形のメニューと右メニューの項目 */
});
canvas.addEventListener('dblclick', e => {
  cancelSpanClick();
  const p = local(e), w = world(p);
  if (mode === 'path') { finishPath(false); return; }
  if (mode === 'bezier') { finishBezier(); return; } /* 終点でダブルクリック＝確定 */
  if (mode === 'offset') { offsetClick(w, true); return; } /* ダブルクリック＝つながった図形全体を選ぶ */
  if (mode === 'line' && stage?.kind === 'cmd') { stage = null; $('hint').textContent = t('hint.line'); draw(); return; } // 終点でダブルクリック＝連続線の確定
  if (mode === 'select') {
    const inGroup = doc.shapes.filter(x => visible(x) && editable(x)).reverse().find(x => groupIdOf(x) && selected.has(x.id) && distTo(x, w) <= 7 / scale);
    if (inGroup && selected.size > 1) { selected = new Set([inGroup.id]); nodeSel = null; draw(); return; } /* グループ全体を選んでいるときのダブルクリック＝中の1つだけを選ぶ */
    const s = selected.size === 1 ? doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)) : null;
    const hit = doc.shapes.filter(x => visible(x) && editable(x) && stitchable(x)).reverse().find(x => distTo(x, w) <= 7 / scale);
    const dashedOf = x => x.lineStyle === 'dashed' || x.layer === 'guide', pool = hit ? doc.shapes.filter(x => visible(x) && stitchable(x) && (!dashedOf(hit) || dashedOf(x))) : [];   /* 点線（ガイド）をダブルクリックしたときは、つながった点線だけ（実線の外形にはつながっていても広げない） */
    const dups = dedupeShapeGroups(pool), repOf = id => dups.repOf.get(id) ?? id;   /* 同じ形で重なった線は1本として数える（重なっていると、つながりがそこで止まるため）。選ぶときは、重なった線も全部 */
    const chainIds = hit ? contourFrom(dups.reps, repOf(hit.id)) : []; /* 分岐点では真っ直ぐ続く線を選んで先へ進み、枝には入らない。端が 0.2mm 以内で離れた所も越える */
    const chain = hit ? { shapeIds: chainIds.flatMap(id => dups.groups.get(id) ?? [id]) } : null;
    if (s && !nodeHit(s, w) && distTo(s, w) <= 7 / scale && (!chain || chain.shapeIds.length === 1)) { const next = pathInsertNode(s, projectOnPath(s, w).s); nodeSel = null; transformSelectedTo(next); } /* ペンの線だけなら節点を足す */
    else if (chain && chain.shapeIds.length > 1) { /* ダブルクリック＝つながった図形をすべて選ぶ（端点でつながる線・円弧・曲線。ロックした層の図形は除く） */
      const ids = chain.shapeIds.filter(id => { const x = doc.shapes.find(y => y.id === id); return x && editable(x); }); selected = new Set(ids); nodeSel = null; const stops = contourStops(dups.reps, chainIds); chainStops = stops.length ? { ids: new Set(ids), stops } : null; const mine = gaps.filter(g => ids.includes(g.a.id) || ids.includes(g.b.id)); $('hint').textContent = t('chainSelectedLen', { n: ids.length, len: totalLengthOf(ids.map(id => doc.shapes.find(y => y.id === id))).toFixed(2) }) + (mine.length ? ' ' + t('chainGapNote', { n: mine.length, max: Math.max(...mine.map(g => g.d)).toFixed(2) }) : '') + (chainStops ? ' ' + t('chainBranchNote', { n: chainStops.stops.length }) : ''); draw(); }
  }
});
canvas.addEventListener('pointerup', e => {
  if (!gesture) return;
  const g = gesture, p = local(e);
  cursor = g.kind === 'move' ? movePosition(world(p), e.shiftKey) : (mode === 'select' && g.kind !== 'lineEnd') || g.kind === 'pan' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (g.kind === 'lineEnd' || (g.kind === 'node' && g.dir)) cursor = lineEndCursor(g, world(p), e.shiftKey || !!g.holed);
  gesture = null; if (g.kind === 'pan' && distance(p, g.screen) >= 4) lastPanDragAt = Date.now();
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (g.kind === 'spin') { draw(); return; }
  if (g.kind === 'foldHandle') { endFoldHandleDrag(); draw(); return; }
  if (g.kind === 'rectR') { const sh = doc.shapes.find(x => x.id === g.id), b0 = g.box0, b = g.box; if (sh && (Math.abs(b.x0 - b0.x0) + Math.abs(b.x1 - b0.x1) + Math.abs(b.y0 - b0.y0) + Math.abs(b.y1 - b0.y1)) > 1e-9) { const r4 = v => +v.toFixed(4); commit(() => { sh.points = rectShape({ x: r4(b.x0), y: r4(b.y0) }, { x: r4(b.x1), y: r4(b.y1) }).points; }); $('hint').textContent = t('rectResized', { w: circleNum(b.x1 - b.x0), h: circleNum(b.y1 - b.y0) }); } snap = null; draw(); return; }
  if (g.kind === 'rotate') { const a = g.angle; cancel(); if (Math.abs(a) > 1e-6) { transformSelected(s => rotate(s, a, g.c)); $('hint').textContent = t('rotDone', { a }); } draw(); return; }
  if (g.kind === 'circleR') { const sh = doc.shapes.find(x => x.id === g.id); if (sh && Math.abs(g.r - sh.r) > 1e-9) { commit(() => { sh.r = g.r; }); $('hint').textContent = t('circleResized', { r: circleNum(g.r), d: circleNum(g.r * 2) }); } snap = null; draw(); return; }
  if (g.kind === 'hole') { const h=doc.holes.find(h=>h.id===g.id); if(h && holeEditable(h))commit(()=>Object.assign(h,holePosition(h,cursor)));
  } else if (g.kind === 'pen') {
    penRelease(g.start, cursor, distance(p, g.screen) >= 4); lastPoint = g.start;
  } else if (g.kind === 'lineEnd') {
    const s = doc.shapes.find(s => s.id === g.id);
    if (s && editable(s) && distance(p, g.screen) >= 2) { const next = handleMoved(s, g.h, cursor); if (s.type === 'line' && Math.hypot(next.x2 - next.x1, next.y2 - next.y1) < 1e-6) $('hint').textContent = t('lineEndZero'); else { const holed = doc.paths.some(pt => pt.shapeIds.includes(s.id) && doc.holes.some(h => h.pathId === pt.id)); if (holed && !lineEndKeepsHoles(s, next)) { $('hint').textContent = t('lineEndHoles'); draw(); return; } if (holed) moveShapeKeepingHoles(next); else transformSelectedTo(next); $('hint').textContent = s.type === 'line' ? t('lineEndDone', { len: Math.hypot(next.x2 - next.x1, next.y2 - next.y1).toFixed(2) }) : t(s.type === 'arc' ? 'arcEndDone' : 'vertexDone'); } }
  } else if (g.kind === 'node') {
    const s = doc.shapes.find(s => s.id === g.id);
    if (s && editable(s) && distance(p, g.screen) >= 2) transformSelectedTo(editedNodePath(s, g, cursor));
  } else if (g.kind === 'move') {
    if (distance(p, g.screen) >= 4) { const dx = cursor.x - g.start.x, dy = cursor.y - g.start.y, all = quadAllSelected(); transformSelected(s => translate(s, dx, dy)); if (all) quadFollowMove(dx, dy); }
    else if (g.shiftToggle) { for (const id of expandToGroups(doc.shapes, new Set([g.shiftToggle]))) selected.delete(id); }   /* Shift を押したまま選択済みの図形をクリックだけ：選択から外す */
    else if (mode === 'select' && !e.shiftKey && !e.altKey && selected.size === 1) { /* シングルクリック＝交点から交点までの区間。ダブルクリック（つながった図形全体）と区別するため、少し待ってから切り分ける */
      const only = doc.shapes.find(x => selected.has(x.id)), at = world(p);
      if (only && ['line', 'arc', 'polyline', 'path'].includes(only.type) && !groupIdOf(only)) { cancelSpanClick(); spanClickTimer = setTimeout(() => { spanClickTimer = null; if (!gesture && mode === 'select' && selected.size === 1 && selected.has(only.id) && doc.shapes.includes(only)) selectSpanAt(at, false, { auto: true }); }, 400); }
    }
  } else if (g.kind === 'select') {
    if (!g.additive) selected.clear();
    if (distance(p, g.screen) < 4) {
      const hit = pickShapeAt(cursor);
      if (hit) { const grp = expandToGroups(doc.shapes, new Set([hit.id])); if (g.additive && selected.has(hit.id)) for (const id of grp) selected.delete(id); else for (const id of grp) selected.add(id); }
    } else {
      const minX = Math.min(g.start.x, cursor.x), maxX = Math.max(g.start.x, cursor.x), minY = Math.min(g.start.y, cursor.y), maxY = Math.max(g.start.y, cursor.y);
      for (const s of doc.shapes.filter(editable)) { const b = bboxOf(s); if (b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY) selected.add(s.id); }
      selected = expandToGroups(doc.shapes, selected); /* 囲んだ図形がグループなら全体を選ぶ */
      for (const h of doc.holes) if (holeVisible(h) && holeEditable(h) && !markHidden(h) && h.x >= minX && h.x <= maxX && h.y >= minY && h.y <= maxY) selected.add(h.id); /* 囲んだ範囲の穴（菱目）も選ぶ（事業主指示 2026-10-16）。中心が範囲の中にあるもの */
    }
  } else if (g.kind === 'draw' && mode === 'arc' && arcHalf()) {
    stage = { kind: 'half', pts: [g.start] }; $('hint').textContent = t('arcHalfHint');
  } else if (g.kind === 'draw' && mode === 'arc' && arcThreePoint()) {
    stage = { kind: 'arc3', pts: [g.start] }; $('hint').textContent = t('arcThreeHint');
  } else if (g.kind === 'draw' && mode === 'arc' && arcFixedRadius() > 0) {
    const fixedR = arcFixedRadius();
    stage = distance(g.start, cursor) > 1e-8 ? { kind: 'arc', center: g.start, r: fixedR, startDeg: Math.atan2(cursor.y - g.start.y, cursor.x - g.start.x) * 180 / Math.PI } : { kind: 'arcR', center: g.start, r: fixedR };
    $('hint').textContent = t($('arcDir').value === 'ccw' ? 'arcRadiusHintCcw' : 'arcRadiusHint');
  } else if (g.kind === 'draw' && distance(g.start, cursor) > 1e-8) {
    if (mode === 'rect') { const rect = rectShape(g.start, cursor); if (rect) { addShape(rect); lastPoint = cursor; } else $('hint').textContent = t('rectFlat'); }
    else if (mode === 'line' || mode === 'circle') addShape(shapeFromDrag(g.start, cursor));
    else if (mode === 'arc') stage = { kind: 'arc', center: g.start, r: distance(g.start, cursor), startDeg: Math.atan2(cursor.y - g.start.y, cursor.x - g.start.x) * 180 / Math.PI };
    else if (mode === 'bezier') stage = { kind: 'bezier', start: g.start, end: cursor };
    else if (mode === 'polyline') stage = { kind: 'polyline', points: [g.start, cursor] };
  } else if (g.kind === 'draw' && ['line', 'circle', 'arc', 'polyline', 'rect'].includes(mode)) {
    runCommand(`${cursor.x},${cursor.y}`);
  } else if (g.kind === 'stage') {
    if (stage.kind === 'cmd') {
      if (mode === 'rect') runCommand(`${cursor.x},${cursor.y}`);
      else if (mode === 'line') { if (distance(stage.start, cursor) >= 6 / scale) runCommand(`${cursor.x},${cursor.y}`); /* 直前の点から画面上で6px未満＝ダブルクリックの手ぶれ。短い線を作らない */ }
      else if (mode === 'circle' || (mode === 'arc' && !stage.steps.length)) runCommand(String(distance(stage.center, cursor)));
      else if (mode === 'arc') runCommand(String(Math.atan2(cursor.y - stage.center.y, cursor.x - stage.center.x) * 180 / Math.PI));
    }
    if (!stage) { /* 直前の入力で図形が確定済み */ }
    else if (stage.kind === 'half') halfClick(cursor);
    else if (stage.kind === 'arc3') arc3Click(cursor);
    else if (stage.kind === 'arcR') { if (distance(stage.center, cursor) > 1e-8) stage = { kind: 'arc', center: stage.center, r: stage.r, startDeg: Math.atan2(cursor.y - stage.center.y, cursor.x - stage.center.x) * 180 / Math.PI }; }
    else if (stage.kind === 'arc') { const s = arcShape(cursor); if (arcSweep(s) > 1e-8) { stage = null; addShape(s); } }
    else if (stage.kind === 'bezier') { if (!stage.c1) stage.c1 = cursor; else { const s = bezierShape(cursor); stage = null; addShape(s); } }
    else if (stage.kind === 'polyline') {
      if (stage.points.length >= 3 && distance(cursor, stage.points[0]) < 9 / scale) finishPolyline(true);
      else if (distance(cursor, stage.points.at(-1)) > 1e-8) stage.points.push(cursor);
    }
  }
  draw();
});
canvas.addEventListener('pointercancel', () => { gesture = null; draw(); });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (quadOn()) { const role = quadRoleAt(local(e)); if (role === 'solid') return; if (role !== quadRole()) switchSheet(role); }
  // WheelEvent に入力機器の種類はないため、小さな pixel delta をトラックパッドと推定する。
  if (!e.ctrlKey && e.deltaMode === 0 && (e.deltaX || Math.abs(e.deltaY) < 50)) { origin.x -= e.deltaX || 0; origin.y -= e.deltaY; draw(); }
  else zoom(Math.exp(-Math.max(-200, Math.min(200, e.deltaY)) * 0.0015), local(e));
}, { passive: false });
canvas.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.tool)));
/** 数字の欄を選んだまま、その上でマウスのホイールを回すと、ブラウザの標準動作で数字が増減する（右のカードを動かそうとして、工具の穴の高さが 0.8 → 5 になった・事業主の指摘 2026-10-18「数字が勝手に増えていく」）。
 *  数字の欄の上でホイールを回したら、欄の選択を外す：数字は変わらず、画面のスクロールはそのまま通る。 */
document.addEventListener('wheel', e => { const el = e?.target; if (el && el.tagName === 'INPUT' && el.type === 'number' && document.activeElement === el) el.blur(); }, { passive: true, capture: true });
$('delete').onclick = removeSelected; $('deleteKeepHoles').onclick = removeSelectedKeepHoles; $('info-holeToolLoad').onclick = loadHoleToolToEditor; $('info-holeToolApply').onclick = () => applyHoleToolEdit(false); $('info-holeAll').onclick = () => applyHoleToolEdit(true); $('info-lineApply').onclick = () => applyDiamondLineEdit('selected'); $('info-lineAll').onclick = () => applyDiamondLineEdit('all');
$('copy').onclick = copySelected;
/** グループ化・解除：選んだ図形（すでにグループなら全体）を1つのグループにする／解除する。 */
function groupSelected() { const ids = selectedShapeIds(); const r = groupShapes(doc.shapes, ids, nextGroupId(doc.shapes)); if (!r.changed) { $('hint').textContent = t('groupNeedTwo'); return; } cancel(); commit(() => { doc.shapes = r.shapes; }); selected = expandToGroups(doc.shapes, selected); $('hint').textContent = t('grouped', { n: selected.size }); draw(); }
function ungroupSelected() { const r = ungroupShapes(doc.shapes, selectedShapeIds()); if (!r.changed) { explodeSelection(); return; } /* グループが無ければ、矩形・折れ線を辺にばらす（分解） */ cancel(); commit(() => { doc.shapes = r.shapes; }); $('hint').textContent = t('ungrouped'); draw(); }
$('addNodesRun').onclick = addNodesEqually; $('group').onclick = groupSelected; $('ungroup').onclick = ungroupSelected;
for (const id of ['mirrorX', 'mirrorY', 'rotate']) $(id).onclick = () => transformAboutCenter(id);
$('circleR').oninput = () => { const r = Number($('circleR').value); $('circleD').value = $('circleR').value.trim() === '' || !Number.isFinite(r) ? '' : circleNum(r * 2); draw(); };   /* 半径と直径は連動 */
$('circleD').oninput = () => { const d = Number($('circleD').value); $('circleR').value = $('circleD').value.trim() === '' || !Number.isFinite(d) ? '' : circleNum(d / 2); draw(); };
$('language').addEventListener('change', e => applyLanguage(e.target.value));
$('undo').onclick = () => history(undo, redo); $('redo').onclick = () => history(redo, undo);
$('new').onclick = () => {
  /* 保存していない図があるときは、消さずに新しい図面タブで始める（事業主指摘 2026-10-15：新規で保存前の図が消えた）。保存済み・空の図面だけ、従来どおりその場で空にする */
  if (tabs[activeTab]?.dirty && (doc.shapes.length || doc.calcMemos?.length)) { cancel(); newTab(); $('hint').textContent = t('newKeptOld'); return; }
  cancel(); commit(() => { doc = newDoc(); doc.tools = loadTools(); selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); activeLayer = 'pattern'; pairLines = []; renderLayers(); renderSeams(); fit(); };
$('zoomIn').onclick = () => zoom(1.25); $('zoomOut').onclick = () => zoom(0.8); $('fit').onclick = fit;
for (const id of ['grid', 'snap', 'spacing']) $(id).addEventListener('change', () => { if (!(Number($('spacing').value) >= 0.1)) $('spacing').value = '1'; snap = null; draw(); });
for (const id of ['printOverlay', 'paper', 'outHoles', 'threeView']) $(id).addEventListener('change', () => draw());
$('threeView').addEventListener('change', () => { if ($('threeView').checked && !lockGate('threeview')) { $('threeView').checked = false; return; } let moved = 0; if (threeViewOn() && quadOn()) { $('quadView').checked = false; moved = quadToFrames(); } $('threeViewNotice').hidden = !threeViewOn(); $('threeViewTools').hidden = !threeViewOn(); rebuildSnaps(); if (view3d) render3d(); if (moved) { draw(); $('hint').textContent = t('quadToFramesDone', { n: moved }); } });
$('quadView').addEventListener('change', () => { if ($('quadView').checked && !lockGate('threeview')) { $('quadView').checked = false; return; } let moved = 0; if (quadOn()) { const wasFrames = $('threeView').checked; if (wasFrames) { $('threeView').checked = false; $('threeViewNotice').hidden = true; $('threeViewTools').hidden = true; } ensureSheetSet(); if (wasFrames) moved = framesToQuad(); } if (!quadOn()) dropEmptySheetTabs(); rebuildSnaps(); if (view3d) render3d(); draw(); $('hint').textContent = quadOn() ? (moved ? t('framesToQuadDone', { n: moved }) + ' ' : '') + t('quadOnHint') : t('hint.' + mode); });
$('threeViewMake').onclick = makeThreeViewOutlines;
$('threeViewFrame').onclick = setThreeViewFrame; $('threeViewFrameReset').onclick = resetThreeViewFrame;
$('threeViewDepthIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); makeThreeViewOutlines(); } });
/** 保存：Chrome／Edge は、最初の保存でファイルの場所を選び（タブが覚える）、次からは同じファイルへ上書きする（事業主指摘 2026-10-16：毎回新規保存でファイルが増える）。
 *  asNew=true（名前を付けて保存）は毎回選び直す。選択窓の無いブラウザ（Firefox・Safari）は、従来どおりダウンロード（同名は (1)(2) が付く）。 */
async function save(asNew = false) {
  if (!regGuard('json', 'save')) return;
  /* 紙を分けた三面図は、正面の紙を本体にして上・右の紙を一緒に 1 つのファイルへ入れる（どの紙のタブから保存しても同じ） */
  const sheets = quadSheets(); let payload = doc, tab = tabs[activeTab];
  if (doc.threeViewSheet && sheets.front) { const docOf = tb => tb === tabs[activeTab] ? doc : tb.doc; tab = sheets.front; payload = { ...docOf(sheets.front), threeViewSheets: { top: sheets.top ? docOf(sheets.top) : null, side: sheets.side ? docOf(sheets.side) : null } }; }
  /* 保存の前に図面の検査を通す。直せる不整合は直し、直せなければ保存を止める（読み込めない図面を保存して、作業が失われるのを防ぐ・事業主指示 2026-10-16） */
  const docsToCheck = payload === doc ? [doc] : [payload, payload.threeViewSheets?.top, payload.threeViewSheets?.side].filter(Boolean);
  for (const d of docsToCheck) healDoc(d);
  if (!docsToCheck.every(d => validateDoc(d))) { $('hint').textContent = t('saveInvalid'); return; }
  const keep = Number($('saveHistory').value) || 0, withHistory = keep && payload === doc && (undo.length || redo.length); /* 元に戻す履歴も一緒に保存（事業主指示 2026-10-17・既定100回・三面図の紙分けは対象外） */
  const text = JSON.stringify(withHistory ? { ...payload, undoHistory: await encodeStacks({ undo, redo }, { keep }) } : payload, null, 2), fileName = (tab?.name ? tab.name.replace(/[\\/:*?"<>|]+/g, '_') : 'leather-pattern') + '.json';
  const clean = () => { for (const tb of (doc.threeViewSheet ? Object.values(sheets) : [tabs[activeTab]])) if (tb) tb.dirty = false; renderTabs(); };
  if (typeof globalThis.showSaveFilePicker !== 'function') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    clean(); $('hint').textContent = t('savedDownload', { name: fileName }); return;
  }
  const write = async handle => { const w = await handle.createWritable(); await w.write(text); await w.close(); };
  let handle = asNew ? null : tab?.fileHandle, overwrote = false;
  if (handle) { try { await write(handle); overwrote = true; } catch { handle = null; if (tab) tab.fileHandle = null; /* 消された・動かされた・許可が切れた：選び直す */ } }
  if (!handle) {
    try {
      handle = await globalThis.showSaveFilePicker({ suggestedName: fileName, types: [{ description: "N's CAD", accept: { 'application/json': ['.json'] } }] });
      await write(handle);
    } catch (err) { $('hint').textContent = err?.name === 'AbortError' ? t('saveCanceled') : t('saveFailed', { message: err?.message || String(err) }); return; }
  }
  if (tab) { tab.fileHandle = handle; const base = (handle.name || '').replace(/\.json$/i, '').trim().slice(0, 60); if (base) tab.name = base; }
  clean(); $('hint').textContent = t(overwrote ? 'savedOverwrite' : 'savedNew', { name: handle.name || fileName });
}
/** 「開く」：Chrome／Edge はファイル選択で開き、N's CAD 形式（.json）なら場所を覚える（Ctrl+S でそのファイルへ上書き）。それ以外の形式（.lcc・.svg・.dxf・画像）は覚えない（元のファイルを JSON で壊さない）。選択窓の無いブラウザは従来の入力欄。 */
async function openDialog() {
  if (typeof globalThis.showOpenFilePicker !== 'function') { $('file').click(); return; }
  let handle; try { [handle] = await globalThis.showOpenFilePicker({ types: [{ description: "N's CAD・図面・画像", accept: { 'application/json': ['.json'], 'text/plain': ['.lcc', '.dxf'], 'image/svg+xml': ['.svg'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] } }] }); } catch (err) { if (err?.name !== 'AbortError') $('hint').textContent = t('loadFailed', { message: err?.message || String(err) }); return; }
  if (!handle) return;
  const res = await openFile(await handle.getFile());
  if (res && /\.json$/i.test(handle.name || '') && tabs[activeTab]) tabs[activeTab].fileHandle = handle;
}
/** 読み込んだ正面の紙に上・右の紙が入っていれば、それぞれのタブを作って同じ組にする。 */
function restoreSheets(extra, id) {
  if (!extra || !id) return; const cur = activeTab, sc = scale;
  for (const role of ['top', 'side']) { const raw = extra[role]; if (!raw) continue; let d; try { d = migrateDoc(raw); } catch { continue; } if (!validateDoc(d)) continue; delete d.threeViewSheets; d.threeViewSheet = { id, role }; newTab(t(role === 'top' ? 'threeViewTop' : 'threeViewSide')); doc = d; refreshTools(); renderLayers(); renderSeams(); scale = sc; origin = role === 'top' ? { x: 80, y: Math.max(60, height / 2 * 0.8) } : { x: Math.max(40, width / 2 * 0.2), y: 80 }; snapshotTab(); tabs[activeTab].dirty = false; }
  switchTab(cur); renderTabs();
}
window.addEventListener('beforeunload', e => { if (tabs.some(tb => tb.dirty)) { e.preventDefault(); e.returnValue = ''; } });
/* 「保存」を押すと、保存と書き出し（SVG・PDF・DXF・PNG）のメニューが出る。普段は隠れている。Ctrl+S は N's CAD 形式でそのまま保存 */
$('save').onclick = () => { $('saveMenu').hidden = !$('saveMenu').hidden; };
try { const h = localStorage.getItem('leather-cad.saveHistory'); $('saveHistory').value = ['0', '30', '100'].includes(h) ? h : '100'; } catch { $('saveHistory').value = '100'; }
$('saveHistory').addEventListener('change', () => { try { localStorage.setItem('leather-cad.saveHistory', $('saveHistory').value); } catch { /* 覚えられなくても保存はできる */ } });
$('saveNative').onclick = () => { $('saveMenu').hidden = true; save(); };
$('saveAs').onclick = () => { $('saveMenu').hidden = true; save(true); };
for (const b of ($('saveMenu').querySelectorAll ? $('saveMenu').querySelectorAll('button[data-export]') : [])) b.addEventListener('click', () => { $(b.dataset.export).click(); $('saveMenu').hidden = true; }); /* 右の出力カードと同じ書き出しを呼ぶ */
/** 保存メニューの外をクリックしたら閉じる。「保存 ▾」ボタンの中の文字（span・kbd）のクリックは、ボタンの中なので閉じない（事業主指摘 2026-10-18：文字をクリックすると、開いた直後に閉じて、メニューが見えなかった）。 */
function closeSaveMenuOnOutsideClick(e) { const m = $('saveMenu'), sv = $('save'); if (!m.hidden && e.target instanceof Node && !m.contains(e.target) && !sv.contains(e.target)) m.hidden = true; }
document.addEventListener?.('click', closeSaveMenuOnOutsideClick); $('open').onclick = openDialog; $('shortcutsBtn').onclick = () => showHelp(true);
$('file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  await openFile(file);
});
window.addEventListener('keydown', e => {
  const input = e.target instanceof HTMLInputElement || ['SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
  if (isShortcut(e, 's') || isShortcut(e, 'o')) { e.preventDefault(); isShortcut(e, 's') ? save(e.shiftKey) : openDialog(); return; }
  if (input && e.key === 'Escape' && e.target !== $('cmd') && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable && !document.querySelector?.('dialog[open]')) { e.target.blur?.(); canvas.focus?.(); } /* 数値欄・選択欄にフォーカスがあっても、Esc で作図を取り消せる（欄からは抜ける） */
  else if (input) return;
  if (document.querySelector?.('dialog[open]')) return; // ダイアログ内の Esc/Space はダイアログのもの
  const kt = gesture ? null : keyTarget(e); /* 左メニューのキー（英語の頭文字・Shift つきは重なるもの）。ドラッグ中は使わない */
  if (kt) { e.preventDefault(); if (kt.tool) setMode(kt.tool); else if (kt.toggle) { const c = $(kt.toggle); c.checked = !c.checked; c.dispatchEvent?.(new Event('change', { bubbles: true })); draw(); } else { const b = $(kt.action); if (b && !b.disabled) b.click(); } return; }
  const nudge = arrowNudge(e); if (nudge && selectedShapeIds().size) { e.preventDefault(); transformSelected(s => translate(s, nudge.dx, nudge.dy)); return; } /* 矢印キー：選んだ図形を動かす */
  if (isUndo(e) || isRedo(e)) { e.preventDefault(); if (isRedo(e)) history(redo, undo); else history(undo, redo); }
  else if (isCopy(e)) { e.preventDefault(); copySelected(); }
  else if (isSelectAll(e)) { e.preventDefault(); selectAllShapes(); }
  else if (isShortcut(e, 'g')) { e.preventDefault(); if (e.shiftKey) ungroupSelected(); else groupSelected(); }
  else if (e.code === 'Space') { if (e.target === canvas || e.target === document.body) { e.preventDefault(); space = true; } }
  else if (e.key === 'Escape') { hideCtxMenu(); if (foldCutPicking) { foldCutPicking = false; $('hint').textContent = ''; draw(); return; } if (stage?.kind === 'path' && stage.nodes.length) { stage.nodes.pop(); if (!stage.nodes.length) stage = null; draw(); } else if (mode === 'select' && !stage && !gesture && selected.size) { selected.clear(); nodeSel = null; draw(); } /* 選択ツールで作図中でなければ、Esc で選択を解除 */ else setMode('select'); }
  else if (isDelete(e) && e.shiftKey && e.key === 'Delete' && !(nodeSel && mode === 'select')) { e.preventDefault(); removeSelectedKeepHoles(); }   /* Shift+Delete：線だけ削除（菱目は残す） */
  else if (isDelete(e)) { e.preventDefault(); if (nodeSel && mode === 'select') $('removeNode').click(); else removeSelected(); }
  else if (e.key === 'F1' || e.key === '?') { e.preventDefault(); showHelp(e.key === 'F1'); }
  else if (e.key === 'Enter' && mode === 'offset' && offsetSelection) { e.preventDefault(); runOffset(); }
  else if (e.key === 'Enter' && mode === 'detour' && detourState?.obstId) { e.preventDefault(); runDetour(); }
  else if (e.key === 'Enter' && mode === 'line' && stage?.kind === 'cmd') { e.preventDefault(); stage = null; $('hint').textContent = t('hint.line'); draw(); }
  else if (e.key === 'Enter' && stage?.kind === 'polyline') { e.preventDefault(); finishPolyline(); }
  else if (e.key === 'Enter' && stage?.kind === 'bzpts') { e.preventDefault(); finishBezier(); }
  else if (e.key === 'Enter' && stage?.kind === 'path') { e.preventDefault(); finishPath(false); }
});
$('cmd').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); runCommand($('cmd').value); }
  else if (e.key === 'Escape') { e.preventDefault(); $('cmd').value = ''; setMode('select'); canvas.focus(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
window.addEventListener('blur', () => { space = false; gesture = null; draw(); });
window.addEventListener('resize', resize);
/* キャンバスの表示サイズ（CSS）は、ウィンドウが同じでも変わる（下の案内文が折り返す・パネルが出入りする）。描画サイズ（ビットマップ）が古いままだと、描かれた線とクリックの位置がずれる（実際に約20px ずれた）ので、表示サイズが変わったら合わせ直す。 */
if (typeof ResizeObserver === 'function') new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - width) > 0.5 || Math.abs(r.height - height) > 0.5) resize(); }).observe(canvas);
doc.tools = loadTools(); initStitch(); initPresets(); initLayers(); initInfo(); initOutput(); initDesign(); init3d(); loadBinderEdits(); initHardware(); initPhrases(); initCalc(); initSpineSim(); initFoldSection(); initToolKeys(); initShowKeys(); initLibrary(); initAi(); initRecipe(); initImages(); initColors(); initTutorials(); initVoice(); initDesigns(); renderLayers(); rebuildSnaps(); resize(); fit(); setMode('select');
let initialLang = globalThis.navigator?.language?.startsWith('ja') ? 'ja' : 'en';
try { initialLang = localStorage.getItem('leather-cad.lang') || initialLang; } catch { /* 保存不可でもブラウザ言語で起動する。 */ }
applyLanguage(initialLang); syncLockMarks(); $('lockRegister').onclick = () => { $('lockDialog').close(); openRegistration(); }; $('lockClose').onclick = () => $('lockDialog').close(); registration.refresh?.()?.then?.(syncLockMarks);
initCounting();
offerRestore(); autosaveReady = true;
showTour();
}
