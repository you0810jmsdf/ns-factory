import { binderSpecWithSection, normalizeSectionPoints, sectionPointsText } from './binder_section_edit.js';
import { arrayOffsets } from './array.js';
import { alignOffsets, distributeOffsets } from './align.js';
import { autoDimensionPlan, autoDimCounts, adIsDiamond, adRoundingNear, adRadiusDimension } from './autodim.js';
import { dotLen, filletCurves, roundLinesAt, cornerLimit, collinearChain, roundChainAt, allIntersections, splitShapeAt, contourFrom, contourStops, outlinePolygon, attachToLine, attachToLines, nearestSegmentOf, enclosedAreaAt, enclosedAreasAround, TEXT_FONTS, textFontStack } from './geometry.js';
import { stitchSegments, faceAngler, dedupeStrokes, resizeDiamondLoop, diamondLoopSizes, smallLoopCenters, loopCenters, straightRuns, collinearLineClusters, warpX, scaleGeometry, smoothPathNodes, distance, distToShape, healDoc, dropDetachedFills, fillDetached, snapPoints, intersections, bboxOf, bboxOfDoc, newDoc, validateDoc, migrateDoc, arcSweep, circlePoint, chamferCorner, filletCorner, offsetShape, offsetPath, translate, rotate, mirrorX, mirrorY, arcLength, pointAtLength, chainShapes, resolvePath, pointsAlongShape, cornerHoles, toothPositions, projectOnPath, holeAppearance, defaultTools, dimension, areaOf, parseInput, pathSegments, pathNode, toPath, pathInsertNode, pathRemoveNode, reflectAcross, trimAt, flattenShape, ownHolePathIds, holeIsOwn } from './geometry.js';
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
import { varStep, varOutOfRange, instantiateItem, extractSelection, transformPayload, encodeClipboard, decodeClipboard, mergePayload, checkLibraryItem, libraryFileText, parseLibraryFile, mergeLibraryItems, pushLibraryBackup, libraryBackupLabel } from './library.js';
import { docToAiJson, validateActions, estimateYen, roughTokens } from './ai_schema.js';
import { buildDoc, check, threadEstimate, defaultRecipe } from './autodesign.js';
import { traceImage, scaleFromTwoPoints, scaleFromDpi } from './trace.js';
import { DATA_LEATHER_COLORS } from './data/leather-colors.js';
import { DATA_TEXTURES } from './data/textures.js';
import { createPlayer } from './tutorial.js';
import { parseVoice, labelOf, voiceIsDraw } from './voice.js';
import { lccToDoc, styleSummary } from './lcc.js';
import { loadDesign, filterDesigns, rankLocalDesigns, localDesignRequest, designTerms, learnLocalFiles, localReferenceDoc, localDesignStore } from './designs.js';
import { DATA_DESIGNS } from './data/designs.js';
import { DATA_STYLE } from './data/style.js';
import { DATA_RELEASE_NOTES } from './data/release-notes.js';
import { DATA_RELEASE_HISTORY } from './data/release-history.js';
import { TUTORIALS_BASICS } from './tutorials/basics.js';
import { TUTORIALS_STITCH } from './tutorials/stitch.js';
import { TUTORIALS_PEN } from './tutorials/pen.js';
import { TUTORIALS_OUTPUT } from './tutorials/output.js';
import { DATA_STITCH_COLORS } from './data/stitch-colors.js';
import { putImage, getImage, deleteImage, shrinkDataUrl } from './imgstore.js';
import { encodeStacks, decodeStacks, saveUndoRecord, loadUndoRecord, clearUndoRecord, saveFilesRecord, loadFilesRecord } from './undostore.js';
import { laminateCheck, laminateNow, partBox, lamFoldSpec, lamRimRelayout, lamRimBendZones, lamButtonPlan, lamBendGrowPlan, lamBendGrowApply, lamPartCircles, lamBendGuides, lamApexPlan } from './laminate.js';
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
import { createPresence } from './presence.js';
import { createRegistration, regIsOwner, REG_GATE_ON } from './registration.js';
import { parseBuild, latestBuild, isNewerBuild, releasesSince } from './update_check.js';
import { newRid, feedbackContext, sendFeedback } from './feedback.js';
import { AUTOSAVE_KEY, packAutosave, unpackAutosave } from './autosave.js';
import { createTabLock, TAB_LOCK_KEY } from './tablock.js';
import { expandToGroups, groupShapes, ungroupShapes, nextGroupId, groupIdOf } from './grouping.js';
import { foldAllowance, stackOffset, matchRoutes, mapHoleDistances, outlineMap, withSeam, insetDistance, routeBreaks, optimizePatchHoles, suggestPatchSize, extendAcrossFold, regionAt, closedRegions, outerRegions, outlineOf, shapesOnRings, dropCovered, insidePolygon, diamondGridFill, rimLine, rimHolePositions, rimHolePositionsByRuns, loopSampler, patchInsetStitch, seamHoleOffsets, shiftHolesClear, ringCounterpart, PATCH_EDGE_MIN_MM, offsetSpan, offsetSpanResult, classifyJunctions, bendInnerSign, detourPath, foldSectionSpec, foldStackPlan, foldRingCheck, foldPathVMax, foldSectionSvg, foldCircleMarks, foldEndLabels, foldDesignPlan, foldUnfoldPlan, foldBendPitch, foldHoleSpacing, foldHoleMarks, findGaps, closeGaps, foldCutLine, foldCutPick, foldPanelBox, foldPlyLengths, foldBendRadii, foldBendWarp, foldBaselines, foldSectionPath, pointOnFoldPath, foldDimensions, foldSectionDims, foldHandles, projectOnFoldPath, foldSectionShapes, foldSectionMark } from './design.js';
import { t, setLang } from './i18n.js';
import { isShortcut, isUndo, isRedo, isCopy, isDelete, isSelectAll, arrowNudge, TOOL_KEYS, ACTION_KEYS, TOGGLE_KEYS, FIXED_KEYS, keyTarget, shortcutLines } from './shortcuts.js';
import { HELP_JA } from './help/ja.js';
import { HELP_EN } from './help/en.js';

if (globalThis.__LC_BOOTED) { /* file 互換ブロックが起動済み */ } else {
globalThis.__LC_BOOTED = true;

const $ = id => document.getElementById(id);
let longPressed = false; // ツールボタンを長押ししてヘルプを開いた直後のクリックは無視する
const canvas = $('canvas'); let ctx = canvas.getContext('2d'), exporting = false, exportColor = false, exportFilter = null, exportStitch = false;   /* exportStitch：PNG の「縫い目を入れて出力」のとき true（書き出しの間だけ） */   /* exportFilter：「選んだ図形だけ出力」のとき { vis, hvis, ids }（描く図形・穴の条件と、選んだ id） */   /* exportColor：書き出し（PNG）のとき、革色・金属の色・糸の色も描く */
let doc = newDoc(), selected = new Set(), undo = [], redo = [];
const lamTouched = { o: false, i: false };   /* 貼り合わせの曲げ検証：厚みの欄を、事業主が書き換えたか（書き換えていなければ、部品の厚みを使う） */
let lamSig = null;   /* 検証カードの選択欄に出した部品の一覧（変わったときだけ作り直す） */
let lastAutosaveAt = ''; /* 最後の自動保存の時刻（復元のあとの保管し直しに使う） */
let tabLock = null, restoreSkipped = false; try { tabLock = createTabLock({ storage: localStorage }); } catch { /* 保存を読めない環境では、タブの取り合いを見ない（いつも主＝今までどおり保存する） */ }   /* 別のブラウザのタブでも開いているとき、保存してよいのは主のタブだけ（tablock.js・事業主 2026-10-23） */
const tabIsPrimary = () => !tabLock || tabLock.isPrimary();
const AUTOSAVE_SUB_KEY = 'leather-cad.autosave.sub';   /* 副のタブ（別のブラウザタブが主）の自動保存の置き場。主の置き場（AUTOSAVE_KEY）を上書き・削除しないための別のキー（2026-10-28 事業主「更新したら作業中の作図が消えた」：副のタブで描いた分が自動保存に乗っていなかった） */
let autosaveState = 'ok';   /* 直近の自動保存の結果：'ok'／'tooLarge'（大きすぎ）／'error'（保存できない）。'ok' 以外で未保存の変更があれば、閉じる・更新の前に確認を出す */
let undoSaveTimer = 0, undoAttaching = false, autosaveTimer = 0, autosaveWarned = false, autosaveReady = false, pendingRestore = null; /* 自動保存：保存待ちのタイマー・容量超えの案内を出したか・起動が済んだか（前の保存を見る前に空で消さない）・復元を決めるまでの前回の保存 */
let ruler = null; /* 定規の測定結果 {a, b}。図形ではなく表示だけ */
let mode = 'select', gesture = null, stage = null, space = false, cursor = { x: 0, y: 0 }, snap = null, pasteGhost = null;   /* pasteGhost：貼り付け待ち（Ctrl+V のあと、クリックで置く）。cancel() から参照するので、先頭で宣言する */
let width = 1, height = 1, scale = 4, origin = { x: 80, y: 400 }, snapCache = [];
let offsetLast = null; /* 最後にクリックして選んだ位置（選ぶ範囲を切り替えたとき、同じ場所で選び直す） */
let offsetSelection = null; /* オフセットで選んだ範囲 {points, closed, whole, layer}。距離を決めて Enter で実行 */
const opLog = []; /* 操作の記録（不具合調査用・最近300件） */
let dupGroups = []; /* 同じ形・同じ層・同じ線種で重なった図形の組（[{ ids }]）。赤く太く表示し、警告と「1本にまとめる」を出す */
let gaps = []; /* 切れ目：2mm 以内で触れていない端点の組（橙の輪・ダブルクリックの案内・隙間を閉じる） */
let junctions = { joined: [], loose: [] }; /* 交点の表示：ポインタが近いときだけ。結合＝赤い点／未結合＝白い縁の赤い点 */
let magnetGuide = []; /* ガイドの点：直線・折れ線の各辺・ベジェ/曲線の各区間・円弧の「中点と両端」、円の上下左右と斜め45度の8点、縫い穴・点の目印の中心（ポインタが近づくと印が出て、端点・中心と同じ磁石で吸い付く） */
let magnetMids = [], snapAlign = null; /* 「中心」の点（辺の中点など）と、直前の吸着で、中心の点の縦・横にそろえたときの情報 */
let magnetEnds = [], magnetCenters = []; /* 端点・円/円弧の中心：スナップのチェックと無関係に吸い付く候補 */
let chainStops = null; /* ダブルクリックで輪郭を選んだとき、分岐で止まった端の位置（選択が変わったら出さない） */
let countStage = null; /* 個数指定の目打ち：始点の交点をクリックしたあと終点を待つ状態 */
let stitchPreview = null; /* 目打ち：始点をクリックしたあと、マウスの位置を終点にしたときに打つ穴の位置（打つ前の薄い表示）。{ points, tool, wrap } */
let stitchRouteIds = null; /* 目打ち：いまの経路（つながった線）の図形の id。打つ前に、薄く光らせる */
let attachState = null; /* 線に着ける：1本目に着けたあと、2本目を待つ状態 { key（選んだ図形の id）, line（1本目の線）, undoLen（1本目のあとの履歴の数）, moved（1本目で動いたか） } */
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
/** 実寸（等倍）表示（事業主 2026-10-25「画面の表示を等倍（実寸）に変えることは可能か？」→ 案A：実寸ボタン＋測って合わせ）。scale＝1mm あたりの画素（CSS 画素）。画面の約束は 1mm＝96/25.4＝約3.78 画素。モニターの実際の大きさとずれるので、画面に出した100mmの線を定規で測った長さ screenMm100 で直す（この画面に覚える）。 */
const SCREEN_MM_KEY = 'leather-cad.screenMm';
let screenMm100 = (() => { try { const v = Number(localStorage.getItem(SCREEN_MM_KEY)); return v >= 50 && v <= 200 ? v : 100; } catch { return 100; } })();
const actualScale = () => (100 * 96 / 25.4) / screenMm100;
function setActualSize() {
  const cx = (viewW() / 2 - origin.x) / scale, cy = (viewH() / 2 - origin.y) / scale;   /* いま見ている真ん中は動かさない */
  scale = actualScale(); origin = { x: viewW() / 2 - cx * scale, y: viewH() / 2 - cy * scale };
  $('hint').textContent = t('actualSizeDone', { s: screenMm100 === 100 ? t('actualNominal') : t('actualCalibrated', { m: +screenMm100.toFixed(1) }) }); draw();
}
function openActualCalib() { $('actualCalibMm').value = String(+screenMm100.toFixed(1)); $('actualCalibBar').hidden = false; }
function applyActualCalib() {
  const v = Number($('actualCalibMm').value); if (!(v >= 50 && v <= 200)) { $('hint').textContent = t('actualCalibBad'); return; }
  screenMm100 = v; try { localStorage.setItem(SCREEN_MM_KEY, String(v)); } catch { /* 保存できなくても、この画面では効く */ } $('actualCalibBar').hidden = true; setActualSize();
}
function resetActualCalib() { screenMm100 = 100; try { localStorage.removeItem(SCREEN_MM_KEY); } catch { /* 省略 */ } $('actualCalibMm').value = '100'; setActualSize(); }
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
const viewShow = { solid: true, dashed: true, colors: true, hardware: true, secDims: true, stitch: false };   /* hardware：金具（「金具」の層の図形・金属の色を付けた図形）を見せるか。画面と書き出し・印刷の両方に効く（保存はしない） */   /* colors：色（革色・質感・金属の色・糸の色）の塗りを見せるか（事業主の希望 2026-10-18「レーザーカットで不要な要素は非表示に」。画面と色つきの書き出し（PNG・SVG）に効く。保存はしない＝開き直すと色が出る） */
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
/** 出力（印刷・SVG・PDF・DXF）の対象：図形を選んでいれば、選んだ図形（とその縫い穴）だけ。選んでいなければ図面の全部（事業主の決定 2026-10-19「選んでいれば自動」。チェック方式は廃止）。 */
const outputSelIds = () => selectedShapeIds();
const outputDoc = () => { let shapes = viewShow.hardware ? doc.shapes : doc.shapes.filter(s => !isHardwareShape(s)); const ids = outputSelIds(); if (ids.size) shapes = shapes.filter(s => ids.has(s.id)); const picked = ids.size ? new Set(doc.holes.filter(h => selected.has(h.id)).map(h => h.id)) : null; return shapes === doc.shapes ? doc : { ...doc, shapes, ...(ids.size ? { outSelOnly: true } : {}), ...(picked && picked.size ? { outHoleIds: picked } : {}) }; };   /* outSelOnly＝図形を選んでの出力：.lcc の独立した穴も、選んだ穴と選んだ図形に付いた穴だけ（2026-10-26 事業主「選択範囲だけSVG化できなくなっている」：独立した穴が、選んでいない場所の分まで全部出ていた） */   /* 縫い穴は、残った図形に付いているもの＋選んだ菱目（outHoleIds）が docToSvg/docToPdf 側（holesOnShapes）で選ばれる（囲み選択で菱目も選ばれるが、乗っている補助の線が囲みに入らないことがある） */
/** 出力のあとの案内に足す一言：「選んだ図形 N 個だけ」か「図面の全部」か（何が出たか分かるように・事業主の決定 2026-10-19）。 */
/** 書き出し用（SVG・PDF・DXF）：重なった線を1本にした図面（出力カードのチェックが入っているとき）。図面のデータは変えない。縫い穴の経路が付いた図形は、そのまま（穴が付いたまま出る）。除いた長さは lastDedupe（書き出し後の案内に使う）。
 *  事業主 2026-10-26「重複した線が多数みつかり、レーザー加工で何度も往復する羽目に。…起動のたびに重複する線を削除する機能」 */
let lastDedupe = null;
function vectorOutDoc() {
  const d = outputDoc(); lastDedupe = null; if (!$('outDedupe')?.checked) return d;
  const keep = new Set(doc.paths.flatMap(p => p.shapeIds)), r = dedupeStrokes(d.shapes, { keepIds: keep });
  if (!r.touched) return d; lastDedupe = { mm: r.removed, n: r.touched }; return { ...d, shapes: r.shapes };
}
const dedupeNote = () => lastDedupe && lastDedupe.mm >= 0.05 ? ' ' + t('outDedupeNote', { mm: lastDedupe.mm.toFixed(1), n: lastDedupe.n }) : '';
const outScopeNote = () => { const n = outputSelIds().size; return ' ' + (n ? t('outScopeSel', { n }) : t('outScopeAll')); };
const VIEW_FREE_TYPES = ['text', 'dimension', 'fold', 'image'];
const viewShows = s => VIEW_FREE_TYPES.includes(s.type) || viewShow[s.lineStyle === 'dashed' || s.layer === 'guide' ? 'dashed' : 'solid'];
try { const v = JSON.parse(localStorage.getItem('leather-cad.view') || '{}'); if (v.solid === false) viewShow.solid = false; if (v.dashed === false) viewShow.dashed = false; if (v.secDims === false) viewShow.secDims = false; } catch { /* 保存できない環境でも操作を続ける */ }
const visible = s => layerVisible(s) && !s.holeLink && !hwHidden(s) && (exporting || viewShows(s));
/** 三面図・金具の自動生成など、図形の数値を使う計算では、実線・点線の表示切り替えを見ない（画面だけの切り替えのため）。 */
const visibleData = s => layerVisible(s) && !s.holeLink;
const editable = s => layerEditable(s); /* holeLink も「選べる」側（全選択・範囲選択に入れて、コピー・移動・複製に穴ごと付けるため）。クリックでは選ばれない（visible で除く） */
// 文字・寸法・折り線・下絵は縫い経路・オフセット・面取りの対象にしない。
const stitchable = s => !['text', 'dimension', 'fold', 'image'].includes(s.type) && !s.holeLink; /* 見えない補助の線（holeLink）は、目打ち・オフセット・クリックの当たり判定の相手にしない */
const partOf = s => doc.parts.find(p => p.shapeIds.includes(s.id)) || null;
/** 選んだ図形の層の名前（画面の右下に出す）。事業主 2026-10-25「レイヤーの名前を変えれないと、どこのレイヤーに属しているかわからない」「リフィルの順番を変えられない」（リフィルの図形は、事業主が上げ下げしていた層ではなく、別の層に入っていた）。1つの層なら名前・複数なら層の数と名前。 */
function selectedLayerText() {
  const picked = doc.shapes.filter(s => !s.holeLink && selected.has(s.id)); if (!picked.length) return '';
  const names = [...new Set(picked.map(s => s.layer))].map(id => { const l = doc.layers.find(x => x.id === id); return l ? layerName(l) : id; });
  return ' · ' + (names.length === 1 ? t('countLayer', { name: names[0] }) : t('countLayers', { n: names.length, names: names.slice(0, 3).join('・') }));
}
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
  if (stitchToolCurrent()?.id !== patchPitchToolId) syncPatchPitch();   /* 工具が替わったときだけ（欄に打った値を、工具が同じままのときは消さない） */
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
  /* 十字・T字に線が交わる所でも、まっすぐ続く線は通り抜けて1本の経路にする（through：事業主指摘 2026-10-21「真ん中の中心線ではなく左を迂回するガイドライン上に菱目を打ちたい」：左まわりの点線が、左端の十字の目印線で3つに切れ、中心線と右側の2つしか選べなかった） */
  const candidates=$('chain').checked?doc.shapes.filter(s=>editable(s)&&stitchable(s)):[hit], through={through:true}, chain=chainShapes(candidates,0.01,through).find(p=>p.shapeIds.includes(hit.id));
  if(!chain)return null;
  // 既に別の縫い経路に属する図形へは経路をまたがせない：打ち済みの図形を除いて、つながる分だけを経路にする。
  const owned=new Set(doc.paths.flatMap(p=>p.shapeIds));
  const route=chain.shapeIds.some(id=>owned.has(id))?(chainShapes(candidates,0.01,{through:true,exclude:owned}).find(p=>p.shapeIds.includes(hit.id))||chainShapes([hit])[0]):chain;
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
    for (const o of others) for (const q of stitchSpecialPoints(o)) { if (distance(q, w) > STITCH_FOOT_MAX_MM + 14 / scale) continue; const pr = projectOnPath(route, q); if (distance(pr, q) <= STITCH_FOOT_MAX_MM) cands.push(pr.s); } /* 近くの別の図形（外形など）の端・中心から、この経路へ垂直に降ろした点にも吸い付く（事業主指摘 2026-10-21：外形の中心に合わせたいのに、内側の点線は中心へ吸い付かない） */
    if (!state.fresh) for (const sg of saved.segments) cands.push(sg.from, sg.to); /* 前に打った区間の始まり・終わり（つなぎ目）も吸着の点：隣のピッチの位置より、ちょうどそこをクリックしたときは、そこが優先される */
    if (!state.fresh) { const cur = doc.tools.find(x => x.id === $('stitchTool').value); for (const h of doc.holes) if (h.pathId === saved.id) { cands.push(h.s); /* 隣のピッチの位置（穴の位置 ± ピッチ）にも吸い付く：前の続きを、同じ固定幅でぴったり続けられる（事業主指摘 2026-10-17：均等化した場所だけで、隣のピッチからだとずれる） */ for (const pt of new Set([cur?.pitch, doc.tools.find(x => x.id === h.toolId)?.pitch].filter(v => Number.isFinite(v) && v > 0))) for (const q of [h.s - pt, h.s + pt]) if (q > 1e-6 && q < len - 1e-6) cands.push(q); } }
    let best = null, bd = Infinity; for (const c of cands) { const d = distance(pointAtLength(route, c), w); if (d < bd) { bd = d; best = c; } }
    const s = best !== null && bd <= 14 / scale ? best : projectOnPath(route, w).s;
    /* 別の経路の既存の穴にも吸着する（画面14px以内・その線から 1.5mm 以内）。吸着先より穴のほうがクリックに近いとき、その穴を「0番目の穴」とする：線の端より外にある穴なら、anchorS＝線の外の位置（始点側 −距離／終点側 長さ＋距離）。打ち始めは、この穴からピッチを続けて数える（つなぎ目を越えても間隔が変わらない・事業主指摘 2026-10-16） */
    let anchorS, ah = null, adist = Infinity;
    for (const h of doc.holes) { if (h.pathId === saved.id) continue; const dh = Math.hypot(h.x - w.x, h.y - w.y); if (dh > 14 / scale || dh >= adist) continue; if (best !== null && bd <= 14 / scale && dh >= bd - 1e-9) continue; const pr = projectOnPath(route, h); if (distance(pr, h) > 1.5) continue; ah = { h, pr }; adist = dh; }
    let sUse = s; if (ah) { const { h, pr } = ah; if (pr.s <= 1e-6) { anchorS = -distance(pointAtLength(route, 0), h); sUse = 0; } else if (pr.s >= len - 1e-6) { anchorS = len + distance(pointAtLength(route, len), h); sUse = len; } else { anchorS = pr.s; sUse = pr.s; } }
    out.push({ key, state, s: sUse, anchorS, p: pointAtLength(route, sUse), dist: Math.min(...mine.map(sh => distTo(sh, w))) });   /* dist：クリックから、その経路のいちばん近い線までの距離（終点で、打つ経路を選ぶのに使う） */
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
    if (fresh && !doc.paths.includes(saved)) { if (doc.paths.some(q => q.id === saved.id)) saved.id = freshId(doc.paths, 'p'); doc.paths.push(saved); } /* 新しい経路の id は、計画を立てたときに決めたもの。つなぎ目を越えて2本とも新しい経路のとき、同じ id になるので、重なるときは付け直す（不具合記録 2026-10-17：後半の菱目が抜けた）。同じ経路の2区間（閉じた経路の始まりをまたぐとき）は、同じ saved を共有するので、2回目は足さない */
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
/** 始点の候補 c1・終点の候補 c2 が別の経路で、端どうしが STITCH_JOINT_GAP_MM 以内で接している組み合わせ（つなぎ目）をすべて、打つ長さ（始点→つなぎ目＋すき間＋つなぎ目→終点）の短い順に返す。{ c1, c2, joint: { j1, j2, d }, total }。閉じた経路は対象外。
 *  （事業主指摘 2026-10-21 不具合記録 1510：左側の真ん中から右上の角へ打つとき、上まわり（約142mm）と下まわり（約300mm）の2つのつなぎ目があり、先に見つかった下まわりが選ばれて、打ち済みの右側に重ねて打たれ、上側に打てなかった。） */
function stitchJointOptions(list1, near) {
  const out = [];
  for (const c2 of near) for (const c1 of list1) {
    if (c1.key === c2.key || c1.state.saved.closed || c2.state.saved.closed) continue;
    const r1 = c1.state.route, r2 = c2.state.route, L1 = arcLength(r1), L2 = arcLength(r2);
    for (const j1 of [0, L1]) for (const j2 of [0, L2]) { const d = distance(pointAtLength(r1, j1), pointAtLength(r2, j2)); if (d <= STITCH_JOINT_GAP_MM) out.push({ c1, c2, joint: { j1, j2, d }, total: Math.abs(c1.s - j1) + d + Math.abs(c2.s - j2) }); }
  }
  return out.sort((p, q) => p.total - q.total);
}
/** つなぎ目を越えて打つ組み合わせを、短い順の先頭に決める。2つ以上あるときは、Tab キーで切り替える（stitchTab）。候補の数・いま何番目かは stitchRouteChoices。無ければ null。 */
function pickStitchJoint(near) {
  const opts = stitchJointOptions(countStage.list, near); if (!opts.length) { stitchRouteChoices = { n: 1, i: 0 }; return null; }
  const i = ((stitchTab % opts.length) + opts.length) % opts.length; stitchRouteChoices = { n: opts.length, i }; return opts[i];
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
/** つなぎ目を越えて打つ計画（固定ピッチ）：区間1（始点→接点）と区間2（接点→終点）の2つの計画を作る。図面は変えない。失敗は { error }。same＝同じ経路の始まり（s=0 と周の長さ）をまたぐ場合（閉じた経路）：ぴったり続くときは、区間1が打った始まりの穴を、区間2が消さない。 */
function stitchJointPlans(c1, c2, joint, kind, n, tool, same = false) {
  const { j1, j2 } = joint, plans = []; let r = 0;
  if (Math.abs(c1.s - j1) > 1e-6) { const p1 = stitchRangePlan({ first: c1, c: { ...c1, s: j1 } }, kind, n, tool, { noEndOffset: true, jointS: j1 }); if (p1.error) return { error: p1.error }; plans.push(p1); r = (p1.info.leftover ?? 0) + (joint.d ?? 0); }
  if (Math.abs(c2.s - j2) > 1e-6) {
    const L2 = arcLength(c2.state.route), keep = plans.length > 0, exact = keep && r < 0.005, anchorS = !keep ? undefined : exact ? j2 : j2 === 0 ? -r : L2 + r;
    const p2 = stitchRangePlan({ first: { key: c2.key, s: j2, anchorS }, c: c2 }, kind, n, tool, { noStartOffset: true, forceAnchor: exact, jointS: same && exact ? undefined : j2 }); if (p2.error) return { error: p2.error }; plans.push(p2);
  }
  return { plans };
}
function stitchJointPunch(c1, c2, joint, kind, n, tool) {
  const { j1, j2 } = joint, res = stitchJointPlans(c1, c2, joint, kind, n, tool); if (res.error) { $('hint').textContent = res.error; return; }
  const { plans } = res;
  if (!plans.length) { $('hint').textContent = t('countSame'); return; }
  countStage = null; commit(() => { selected = new Set(plans.flatMap(p => p.apply())); });
  const last = plans.at(-1).info, total = plans.reduce((sum, p) => sum + p.info.points.length, 0), left = last.leftover ?? 0;
  $('hint').textContent = t('rangeJointPlaced', { n: total, pitch: last.pitch.toFixed(2), a: Math.abs(c1.s - j1).toFixed(2), b: Math.abs(c2.s - j2).toFixed(2) }) + ' ' + (left < 0.005 ? t('rangeLeftNone') : t('rangeLeft', { r: left.toFixed(2) })); draw();
}
/** つなぎ目を越えて、個数指定で打つ：始点（経路A）→接している端→終点（経路B）に、両端を含めて n 個を等間隔に打つ。間隔は、始点から終点までの長さ（つなぎ目のすき間も含む）を n−1 等分。穴の位置は、始点から k×間隔 の所（経路A の接点までに入る分は経路A・残りは経路B）。 */
/** つなぎ目を越えて、個数指定で打つ計画：図面は変えない。失敗は { error }。same＝同じ経路の始まりをまたぐ場合（区間2は、始まりの穴を消さない）。 */
function stitchJointCountPlans(c1, c2, joint, n, tool, same = false) {
  const { j1, j2 } = joint, gap = joint.d ?? 0, a = Math.abs(c1.s - j1), b = Math.abs(c2.s - j2), T = a + gap + b;
  if (!(n >= 2) || !(T > 1e-9)) return { error: t('invalidRange') };
  const P = T / (n - 1), dir1 = j1 >= c1.s ? 1 : -1, dir2 = c2.s >= j2 ? 1 : -1, plans = [];
  const n1 = a < 1e-6 ? 0 : b < 1e-6 && gap < 1e-9 ? n : Math.min(n - 1, Math.floor(a / P + 1e-9) + 1), n2 = n - n1;   /* 経路A に入る個数（始点が接点なら 0・終点が接点なら全部） */
  if (n1 > 0) { const p1 = stitchRangePlan({ first: c1, c: { ...c1, s: c1.s + dir1 * (n1 - 1) * P } }, 'count', n1, tool, { jointS: j1 }); if (p1.error) return { error: p1.error }; plans.push(p1); }
  if (n2 > 0) { const off = Math.max(0, n1 * P - a - gap), p2 = stitchRangePlan({ first: { key: c2.key, s: j2 + dir2 * off }, c: c2 }, 'count', n2, tool, { jointS: same ? undefined : j2 }); if (p2.error) return { error: p2.error }; plans.push(p2); }
  return { plans, P, a, b };
}
function stitchJointCount(c1, c2, joint, n, tool) {
  const res = stitchJointCountPlans(c1, c2, joint, n, tool); if (res.error) { $('hint').textContent = res.error; return; }
  const { plans, P, a, b } = res;
  countStage = null; commit(() => { selected = new Set(plans.flatMap(p => p.apply())); });
  $('hint').textContent = t('rangeJointPlaced', { n, pitch: P.toFixed(2), a: a.toFixed(2), b: b.toFixed(2) }); draw();
}
/** 閉じた経路（ぐるっと一周する線）の上の2点（始点 first・終点 c）の間には、2つの区間がある：経路の始まり（s=0）をまたがない区間（direct）と、またぐ区間（wrap）。
 *  打つのは、まだ穴が無い（少ない）ほう。同じなら短いほう。flip（終点を Shift＋クリック）で逆側（事業主指摘 2026-10-21：右半分を打ったあと、同じ経路しか選ばれず左半分が打てない）。wrap なら true。 */
function stitchClosedWrap(first, c, flip) {
  const { saved, route } = c.state, len = arcLength(route), lo = Math.min(first.s, c.s), hi = Math.max(first.s, c.s), eps = 1e-6;
  const mine = doc.holes.filter(h => h.pathId === saved.id).map(h => len - h.s < eps ? 0 : h.s);
  const inDirect = mine.filter(s => s > lo + eps && s < hi - eps).length, inWrap = mine.filter(s => s < lo - eps || s > hi + eps).length;
  const wrap = inWrap < inDirect || (inWrap === inDirect && len - (hi - lo) < (hi - lo) - 1e-9);
  return flip ? !wrap : wrap;
}
/** 始点・終点（同じ経路の上）から、打つ計画の一覧を作る（図面は変えない）。閉じた経路で、経路の始まりをまたぐ側を打つときは、2つの区間の計画（ピッチは始まりを越えても続く）。失敗は { error }。 */
function stitchPlansForPair(pair, kind, n, tool, flip = false) {
  const { saved, route } = pair.c.state;
  if (!saved.closed || !stitchClosedWrap(pair.first, pair.c, flip)) { const p = stitchRangePlan(pair, kind, n, tool); return p.error ? { error: p.error } : { plans: [p], wrap: false, closed: !!saved.closed }; }
  const len = arcLength(route), fwd = pair.first.s > pair.c.s, joint = { j1: fwd ? len : 0, j2: fwd ? 0 : len, d: 0 }, c1 = { ...pair.first, state: pair.c.state }, total = len - (Math.max(pair.first.s, pair.c.s) - Math.min(pair.first.s, pair.c.s));
  if (kind === 'fixed') { const r = stitchJointPlans(c1, pair.c, joint, kind, n, tool, true); return r.error ? r : { plans: r.plans, wrap: true, closed: true }; }
  const count = kind === 'count' ? n : Math.max(2, Math.round(total / tool.pitch) + 1), r = stitchJointCountPlans(c1, pair.c, joint, count, tool, true);   /* 間隔をそろえる方式も、またぐ側では、両端を含めて等間隔（個数＝長さ÷ピッチ＋1） */
  return r.error ? r : { plans: r.plans, wrap: true, closed: true, count, pitch: r.P };
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
/** 目打ちの終点（2回目のクリック・下見）：始点と同じ経路の候補の中から、打つ経路の組を決める（事業主要望 2026-10-21「任意の点線に沿って打ちたいけど、最短距離のルートしか選べない」：始点・終点の両方を含む経路が複数あると、最後に描いた線が必ず選ばれていた）。
 *  クリックの位置に近い線の経路を優先（0.5px 刻み）。つなぎ目ぴったりなど、同じ近さの候補が複数あるときは、Tab キーで切り替える（stitchTab）。候補の数・いま何番目かは stitchRouteChoices。 */
let stitchTab = 0, stitchRouteChoices = { n: 1, i: 0 }, stitchLastW = null;
function pickStitchPair(near) {
  const all = near.map(c => ({ c, first: countStage.list.find(f => f.key === c.key) })).filter(x => x.first && Math.abs(x.first.s - x.c.s) > 1e-6);
  if (!all.length) { stitchRouteChoices = { n: 1, i: 0 }; return null; }
  /* 前の続き：始点が、その経路にすでに打った穴・区間の端になっているもの（事業主指摘 2026-10-21「菱目を打った終点の続きから打つとき、思うガイドライン上に打てない」：つなぎ目で同じ近さの経路が複数あると、後から引いた線が選ばれ、前に打った経路の続きに打てなかった）。同じ近さのなかでは、先にする。 */
  const cont = x => { const st = x.first.state; return st.fresh === false && (doc.holes.some(h => h.pathId === st.saved.id && distance(h, x.first.p) < 0.5) || st.saved.segments.some(sg => Math.abs(sg.to - x.first.s) < 0.05 || Math.abs(sg.from - x.first.s) < 0.05)); };
  const tier = x => Math.round(x.c.dist * scale * 2), top = Math.min(...all.map(tier)), tied = all.filter(x => tier(x) === top).sort((p, q) => cont(q) - cont(p)), i = ((stitchTab % tied.length) + tied.length) % tied.length;
  stitchRouteChoices = { n: tied.length, i }; return tied[i];
}
function rangeStitchClick(w, flip = false) {
  const tool = doc.tools.find(x => x.id === $('stitchTool').value), kind = placementKind(), n = stitchCountN(), near = stitchPointCandidates(w);
  if (!tool || !near.length) { $('hint').textContent = t('countNoLine'); return; }
  if (kind === 'count' && !n) { $('hint').textContent = t('countNeedN'); return; }
  const pair = countStage ? pickStitchPair(near) : null;
  if (!pair) { /* 始点（交点では重なった線の全部を候補にして、2回目のクリックで同じ線に当たったものを使う） */
    if (countStage) { const same = near.find(c => countStage.list.some(f => f.key === c.key && Math.abs(f.s - c.s) < 1e-6)); if (same) { stitchSingleAt(same, tool); return; } } /* 始点と同じ場所（交点など）をもう一度クリック：そこに菱目を1つだけ打つ（事業主指示 2026-10-17） */
    if (countStage) { /* 始点とは別の線をクリックした：端が接している線どうしなら、つなぎ目を越えて打つ（固定ピッチだけ）。接していなければ、ここを新しい始点にして、そのことを案内する */
      const jo = pickStitchJoint(near);   /* 短いつなぎ目が先・2つ以上あるときは Tab で切り替え済みのもの */
      if (jo) { const { c1, c2, joint } = jo; stitchTab = 0; stitchRouteChoices = { n: 1, i: 0 }; if (kind === 'count') { stitchJointCount(c1, c2, joint, n, tool); return; } if (kind !== 'fixed') { $('hint').textContent = t('rangeJointFixedOnly'); return; } stitchJointPunch(c1, c2, joint, kind, n, tool); return; }
      const gap = stitchNearestGap(countStage.list, near); countStage = { list: near }; stitchTab = 0; $('hint').textContent = t('rangeStartMoved') + (gap > STITCH_JOINT_GAP_MM && gap <= 10 ? ' ' + t('rangeGapNote', { gap: gap.toFixed(2) }) : ''); draw(); return;
    }
    countStage = { list: near }; stitchTab = 0; $('hint').textContent = t(kind === 'count' ? 'countStart' : 'rangeStart', { n }); draw(); return;
  }
  countStage = null; stitchPreview = null; stitchTab = 0; stitchRouteChoices = { n: 1, i: 0 };
  const res = stitchPlansForPair(pair, kind, n, tool, flip); if (res.error) { $('hint').textContent = res.error; return; }
  const { plans } = res, last = plans.at(-1).info, { leftover } = last, anchoredHole = last.anchoredHole && !res.wrap /* 始まりをまたぐときの2区間目は、ピッチを続けるための数え方で、既存の穴への吸着ではない */, nPts = plans.reduce((sum, p) => sum + p.info.points.length, 0), span = plans.reduce((sum, p) => sum + p.info.hi - p.info.lo, 0), pitch = res.pitch ?? last.pitch;
  commit(() => { selected = new Set(plans.flatMap(p => p.apply())); });
  $('hint').textContent = (res.wrap ? t('rangeWrapPlaced', { n: nPts, pitch: pitch.toFixed(2), len: span.toFixed(2) }) : kind === 'count' ? t('countPlaced', { n, pitch: pitch.toFixed(2), len: span.toFixed(2) }) : t('rangePlaced', { n: nPts, pitch: pitch.toFixed(2), len: span.toFixed(2) })) + (leftover === null || leftover === undefined ? '' : ' ' + (leftover < 0.005 ? t(anchoredHole ? 'rangeAnchorLeftNone' : 'rangeLeftNone') : t(anchoredHole ? 'rangeAnchorLeft' : 'rangeLeft', { r: leftover.toFixed(2) }))) + (res.closed ? ' ' + t('rangeClosedNote') : ''); draw();
}
function drawChainStops() { /* 分岐で止まった端に青い印（選択がそのままのときだけ） */
  if (!chainStops || chainStops.ids.size !== selected.size || ![...selected].every(id => chainStops.ids.has(id))) return;
  ctx.save(); ctx.strokeStyle = '#6fa8ff'; ctx.fillStyle = '#6fa8ff'; ctx.lineWidth = 2 / scale;
  for (const p of chainStops.stops) { ctx.beginPath(); ctx.arc(p.x, p.y, 7 / scale, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 / scale, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
/** 目打ち：マウスの近く（画面14px以内）にある、吸い付く点（端・線の中心・線と線の交点・すでにある穴）のうち、いちばん近いもの。なければ null。マウスを動かすたびに計算するので、近くの線（最大12本）だけで求める。 */
let stitchHover = null;
/** 目打ちの吸着：近くの別の図形（外形など）の端・中心から、経路へ垂直に降ろした点にも吸い付く、その降ろす距離の上限（mm）。
 *  事業主指摘 2026-10-21：外形の中心に合わせたいのに、内側に引いた点線は、自分の端・中点・交点にしか吸い付かず、外形の中心へ吸い付かなかった。 */
const STITCH_FOOT_MAX_MM = 12;
/** 図形の端と中心（中点）。 */
function stitchSpecialPoints(s) { const len = arcLength(s); return [pointAtLength(s, 0), pointAtLength(s, len), pointAtLength(s, len / 2)]; }
function stitchHoverAt(w) {
  const reach = 14 / scale, foot = STITCH_FOOT_MAX_MM + reach, cand = [];
  for (const s of doc.shapes) { if (!(visible(s) && editable(s) && stitchable(s)) || ['text', 'dimension', 'image'].includes(s.type)) continue; const d = distTo(s, w); if (d <= foot) cand.push({ s, d }); }
  const near = cand.filter(c => c.d <= reach * 1.5).slice(0, 12).map(c => c.s), pts = [];
  for (const s of near) pts.push(...stitchSpecialPoints(s));
  for (const { s: o } of cand) for (const q of stitchSpecialPoints(o)) { if (distance(q, w) > foot) continue; for (const s of near) { if (s === o) continue; const pr = projectOnPath(s, q); if (distance(pr, q) <= STITCH_FOOT_MAX_MM) pts.push({ x: pr.x, y: pr.y }); } }   /* 外形の中心などを、近くの線へ垂直に降ろした点 */
  if (near.length >= 2) pts.push(...allIntersections(near));
  for (const h of doc.holes) if (holeVisible(h) && Math.hypot(h.x - w.x, h.y - w.y) <= reach) pts.push({ x: h.x, y: h.y });
  let best = null, bd = reach; for (const q of pts) { const d = distance(w, q); if (d <= bd) { bd = d; best = { x: q.x, y: q.y }; } } return best;
}
function drawStitchHover() { if (mode !== 'stitch' || !stitchHover || exporting) return; ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(80,200,255,.95)'; ctx.lineWidth = 2 / scale; ctx.beginPath(); ctx.arc(stitchHover.x, stitchHover.y, 5 / scale, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
/** 目打ち：打つ前の薄い表示（事業主指示 2026-10-21「菱目打ちルートを薄く、確定する前に表示してほしい」）。
 *  始点を決めたあと＝マウスの位置を終点にしたら打たれる穴の位置（クリックで確定するときと同じ計画・図面は変えない）。決める前・決めたあと＝マウスの近くの線がつながった経路（どこまでが同じ経路か）。 */
function stitchPreviewAt(w, flip) {
  stitchRouteChoices = { n: 1, i: 0 };
  const tool = doc.tools.find(x => x.id === $('stitchTool').value), kind = placementKind(), n = stitchCountN();
  if (!countStage || !tool || (kind === 'count' && !n)) return null;
  const near = stitchPointCandidates(w), pair = pickStitchPair(near);
  if (pair) { const res = stitchPlansForPair(pair, kind, n, tool, flip); return res.error ? null : { points: res.plans.flatMap(p => p.info.points), tool, wrap: !!res.wrap, routeIds: pair.c.state.saved.shapeIds }; }
  const jo = pickStitchJoint(near); if (!jo) return null;   /* 別の線へ：端が接していれば、つなぎ目を越える分も（クリックと同じ・短い順・Tab で切り替え） */
  const { c1, c2, joint } = jo, res = kind === 'count' ? stitchJointCountPlans(c1, c2, joint, n, tool) : kind === 'fixed' ? stitchJointPlans(c1, c2, joint, kind, n, tool) : null;
  return res && !res.error ? { points: res.plans.flatMap(p => p.info.points), tool, wrap: false, routeIds: [...c1.state.saved.shapeIds, ...c2.state.saved.shapeIds] } : null;
}
let stitchPreviewKey = '', stitchRouteKey = '', stitchRouteCache = null;
function syncStitchPreview(w, flip) {
  const ver = [undo.length, redo.length, doc.shapes.length, doc.holes.length].join(',');
  const key = [ver, countStage ? countStage.list.map(c => c.key + ':' + c.s.toFixed(3)).join(';') : '', Math.round(w.x * scale / 2), Math.round(w.y * scale / 2), flip ? 1 : 0, stitchTab, $('stitchTool').value, $('placement').value, $('stitchCount').value, $('chain').checked].join('|');
  if (key === stitchPreviewKey) return; stitchPreviewKey = key;   /* 同じ場所・同じ状態では、計算し直さない（マウスを動かすたびに交点を数えないため） */
  stitchPreview = stitchPreviewAt(w, flip);
  let ids = null;
  if (countStage) { ids = stitchPreview?.routeIds || countStage.list[0].state.saved.shapeIds; if (stitchRouteChoices.n > 1) $('hint').textContent = t('stitchRoutePick', { n: stitchRouteChoices.n, i: stitchRouteChoices.i + 1 }); }   /* 打てる経路が複数あるとき：下見は、選ばれた経路で。Tab で切り替え */
  else {
    const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distTo(s, w) <= 8 / scale);
    if (hit) { const rk = [hit.id, ver, $('chain').checked].join('|'); if (rk !== stitchRouteKey) { stitchRouteKey = rk; stitchRouteCache = routeForHit(hit)?.saved.shapeIds ?? null; } ids = stitchRouteCache; }
  }
  stitchRouteIds = ids ? [...ids] : null;
}
function clearStitchPreview() { stitchPreview = null; stitchRouteIds = null; stitchPreviewKey = ''; stitchRouteChoices = { n: 1, i: 0 }; }
/** 縫い目を見る（ステッチシミュレーション・事業主 2026-10-27「菱目をつかったステッチシミュレーション（色も含める）機能をつけたい」）：菱目と菱目のあいだに、糸の縫い目を描く。
 *  糸の色は、経路ごとの「糸の色」（決めていなければ、既定の糸色）。色の表示を切ると、既定の糸色になる。太さは「表示」メニューの欄（mm）。表示だけで、保存・書き出し・印刷には入らない。 */
const STITCH_THICK_KEY = 'leather-cad.stitchThick', STITCH_THICK_ROUND_KEY = 'leather-cad.stitchThickRound', STITCH_DEFAULT_HEX = '#efe6d2';
const stitchFace = () => $('stitchFace')?.value === 'back' ? 'back' : 'front';   /* 縫い目の面：表（穴の傾きどおりの斜め）／裏（逆向きの斜め）。覚えない（見るたびに表から） */
const stitchThickMm = (kind = 'diamond') => {   /* 縫い目の線の太さ（mm）。丸目・スリット（kind='round'）は専用の欄で、「菱目と同じ」（数にならない値）なら、菱目の太さ */
  const v = parseFloat($('stitchThick')?.value), mm = Number.isFinite(v) && v > 0 ? v : 0.6; if (kind !== 'round') return mm;
  const r = parseFloat($('stitchThickRound')?.value); return Number.isFinite(r) && r > 0 ? r : mm;
};
function restoreStitchThick() { for (const [key, id] of [[STITCH_THICK_KEY, 'stitchThick'], [STITCH_THICK_ROUND_KEY, 'stitchThickRound']]) { try { const v = localStorage.getItem(key), sel = $(id); if (v && sel?.options && [...sel.options].some(o => o.value === v)) sel.value = v; } catch { /* 読めなければ、既定のまま */ } } }
function drawStitches(visible = holeVisible, forExport = false) {   /* forExport：PNG の書き出し（穴の描画のあと・「縫い目を入れて出力」が入っているときだけ） */
  if (forExport ? !exportStitch : (!viewShow.stitch || exporting)) return;
  const segs = stitchSegments(doc, { visible, face: stitchFace() }); if (!segs.length) return;
  const thick = kind => Math.max(stitchThickMm(kind), 1.4 / scale), tint = forExport ? exportColor : viewShow.colors, plain = forExport && !exportColor;   /* 縮小しても、線が消えない太さ（1.4px）は残す。丸目・スリットは専用の太さ。色なしの書き出しは、線画のまま濃い灰色の1本線 */
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([]);
  for (const pass of plain ? [1] : [0, 1]) for (const s of segs) {   /* 先に影（暗い太線）を引き、その上に糸の色の線を引く */
    const w = thick(s.kind); ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y);
    if (pass === 0) { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = w + 0.3; } else { ctx.strokeStyle = plain ? '#333' : (tint && s.hex) || STITCH_DEFAULT_HEX; ctx.lineWidth = w; }
    ctx.stroke();
  }
  ctx.restore();
}
function drawStitchPreview() {
  if (mode !== 'stitch' || exporting) return;
  if (stitchRouteIds?.length) { ctx.save(); ctx.lineWidth = 8 / scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.18; for (const id of stitchRouteIds) strokeShape(doc.shapes.find(x => x.id === id), '#c9a96e'); ctx.restore(); }   /* 経路：太く薄く */
  if (!stitchPreview?.points.length) return;
  ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([]);
  for (const p of stitchPreview.points) {   /* 打たれる穴：本物の穴と同じ形を、薄く */
    const a = holeAppearance({ toolId: stitchPreview.tool.id, mark: 'tool' }, doc); if (!a) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((($('followTangent').checked ? p.angleDeg : 0) + slantOf(stitchPreview.tool)) * Math.PI / 180); ctx.beginPath(); ctx.fillStyle = ctx.strokeStyle = '#ffe3a3';
    if (a.kind === 'circle' || a.kind === 'dot') { ctx.arc(0, 0, a.width / 2, 0, Math.PI * 2); ctx.fill(); }
    else if (a.kind === 'slit') { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(a.width / 2, 0); ctx.lineWidth = a.height; ctx.stroke(); }
    else { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(0, -a.height / 2); ctx.lineTo(a.width / 2, 0); ctx.lineTo(0, a.height / 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}
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
/** 分割線（事業主 2026-10-24「二等分線 A（分割線にして、分割数と分割の目印の寸法を決められるように）」）：交わる2本以上の線の、クリックした近くの交点から、クリックした側の角を n 等分する線を引く（2＝二等分線）。
 *  角を作る線（交点を通る線の両方向の腕）のうち、クリックの向きをはさむ2本の腕のあいだを等分する。長さは、欄が空なら、はさむ2本の腕の長さのうち短い方（腕が交点で終わっていれば、もう一方）・それも無ければ 30mm。
 *  目印の位置（交点から mm）を入れていれば、できた各線の上のその位置に、点の目印（目印ツールと同じもの）も打つ。線も目印も、元に戻すは1回。 */
function divisionCount() { const n = Math.floor(Number($('divN')?.value)); return Number.isFinite(n) && n >= 2 ? Math.min(n, 36) : 2; }
const divisionNumber = id => { const raw = String($(id)?.value ?? '').trim(), v = Number(raw); return raw !== '' && Number.isFinite(v) && v > 0 ? v : 0; };
function divideAt(p) {
  const reach = 60 / scale, cand = doc.shapes.filter(s => visible(s) && stitchable(s) && !s.holeLink && !s.markOf && !['text', 'dimension', 'image'].includes(s.type) && distTo(s, p) <= reach * 3).slice(0, 40);
  const nearLine = px => cand.filter(s => s.type !== 'circle' && distTo(s, p) <= px / scale).sort((u, v) => distTo(u, p) - distTo(v, p))[0];
  const onLine = nearLine(7); if (onLine && divideSegmentAt(onLine, p)) return;   /* 線の上（7px 以内）をクリック：その線を等分する点から垂線（事業主 2026-10-28「分割線は線を二等分線したいのに角の二等分線しか機能がない」）。角の等分は、線から離れた角の中でクリック */
  const xs = cand.length >= 2 ? allIntersections(cand).filter(q => distance(p, q) <= reach) : [];
  if (!xs.length) { const nl = nearLine(10); if (nl && divideSegmentAt(nl, p)) return; $('hint').textContent = t('divideNoCross'); return; }   /* 交点が近くに無ければ、少し離れていても（10px）線を等分する */
  const X = xs.reduce((b, q) => distance(p, q) < distance(p, b) ? q : b), norm = a => ((a % 360) + 360) % 360, rays = [];
  const here = [...new Set(xs.filter(q => distance(q, X) < 0.02).flatMap(q => q.ids))];   /* 同じ点に集まる線は全部（端どうしがつながった線は、組ごとの交点として別々に出てくる） */
  for (const id of here) {   /* 交点を通る各線の、両方向の腕（端が交点なら、片方向だけ）と、その腕の長さ */
    const s = cand.find(c => c.id === id), len = s ? arcLength(s) : 0; if (!s) continue; const pr = projectOnPath(s, X), closed = !!s.closed;
    if (closed || pr.s > 1e-6) rays.push({ a: norm(pr.angleDeg + 180), len: closed ? Infinity : pr.s }); if (closed || len - pr.s > 1e-6) rays.push({ a: norm(pr.angleDeg), len: closed ? Infinity : len - pr.s });
  }
  const sorted = rays.filter((r, i) => !rays.some((q, j) => j < i && Math.abs(norm(q.a - r.a + 180) - 180) < 0.5)).sort((u, v) => u.a - v.a);   /* 同じ向きの腕は1本に */
  if (sorted.length < 2) { $('hint').textContent = t('divideNoCross'); return; }
  const ap = norm(Math.atan2(p.y - X.y, p.x - X.x) * 180 / Math.PI); let k0 = sorted.length - 1; for (let i = 0; i < sorted.length; i++) if (sorted[i].a <= ap) k0 = i;
  const r1 = sorted[k0], r2 = sorted[(k0 + 1) % sorted.length], theta = norm(r2.a - r1.a) || 360, n = divisionCount(), user = divisionNumber('divLen'), mark = divisionNumber('divMark');
  const arm = [r1.len, r2.len].filter(v => Number.isFinite(v) && v > 1), len = user > 0 ? user : arm.length ? Math.min(...arm) : 30, layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || activeLayer;
  const made = [], tool = doc.tools.find(x => x.id === $('stitchTool').value) || doc.tools[0], markOut = mark > len + 1e-9, putMarks = mark > 0 && !markOut && !!tool; let marks = 0;
  const dirs = []; for (let k = 1; k < n; k++) { const deg = norm(r1.a + theta * k / n); if (!sorted.some(r => Math.abs(norm(r.a - deg + 180) - 180) < 0.5)) dirs.push(k); }   /* すでにその向きに線がある所には、重ねて引かない */
  if (!dirs.length) { $('hint').textContent = t('divideExists'); return; }
  cancel();
  commit(() => {   /* 線と目印は同じ1回の保存（元に戻すは1回）。目印は、線ごとに別の経路へ打つ（交点でつながった線が、1本の経路にまとめられて、位置がずれるのを避ける） */
    for (const k of dirs) {
      const a = (r1.a + theta * k / n) * Math.PI / 180, id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, type: 'line', lineStyle: 'dashed', color: 'blue', x1: X.x, y1: X.y, x2: +(X.x + len * Math.cos(a)).toFixed(4), y2: +(X.y + len * Math.sin(a)).toFixed(4) }); made.push({ id, a });
      if (putMarks) { const pid = freshId(doc.paths, 'p'); doc.paths.push({ id: pid, shapeIds: [id], reversed: false, closed: false, segments: [{ from: mark, to: mark, toolId: tool.id, pitch: tool.pitch, mode: 'manual' }], mark: 'tool' }); doc.holes.push({ id: freshId(doc.holes, 'h'), pathId: pid, toolId: tool.id, x: +(X.x + mark * Math.cos(a)).toFixed(4), y: +(X.y + mark * Math.sin(a)).toFixed(4), s: mark, angleDeg: a * 180 / Math.PI, mark: 'dot' }); marks++; }
    }
    selected = new Set(made.map(m => m.id));
  });
  const f = v => +v.toFixed(2);
  $('hint').textContent = t('divideDone', { x: f(X.x), y: f(X.y), a: f(theta), n, k: made.length, each: f(theta / n), len: f(len) }) + (marks ? ' ' + t('divideMarkNote', { m: marks, d: f(mark) }) : markOut ? ' ' + t('divideMarkOut', { len: f(len) }) : ''); rebuildSnaps(); draw();
}
/** 線の等分：1本の線（直線・折れ線のクリックした辺・円弧・曲線）を n 等分する点（2＝中点）から、クリックした側へ垂直な線を引く。長さは欄の値、空なら線の半分（最大 30mm）。目印は分割点から垂線に沿って欄の距離。すでにその向きに線がある所には引かない。描けないときは false。 */
function divideSegmentAt(s, p) {
  let seg = s;
  if (s.type === 'polyline') {   /* 折れ線・四角：クリックした辺だけ */
    const pts = s.points, m = pts.length, cnt = s.closed ? m : m - 1; let best = null;
    for (let i = 0; i < cnt; i++) { const e = { type: 'line', x1: pts[i].x, y1: pts[i].y, x2: pts[(i + 1) % m].x, y2: pts[(i + 1) % m].y }; const d = distTo(e, p); if (!best || d < best.d) best = { d, e }; }
    if (!best) return false; seg = best.e;
  }
  const L = arcLength(seg); if (!(L > 1e-6)) return false;
  const n = divisionCount(), user = divisionNumber('divLen'), mark = divisionNumber('divMark'), norm = a => ((a % 360) + 360) % 360;
  const len = user > 0 ? user : Math.min(30, L / 2), layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || activeLayer;
  const tool = doc.tools.find(x => x.id === $('stitchTool').value) || doc.tools[0], markOut = mark > len + 1e-9, putMarks = mark > 0 && !markOut && !!tool; let marks = 0;
  const lineDir = o => norm(Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI), sameDir = (u, v) => Math.abs(norm(u - v + 180) - 180) < 0.5;
  const plan = [];
  for (let k = 1; k < n; k++) {
    const q = pointAtLength(seg, L * k / n), tr = q.angleDeg * Math.PI / 180, cross = Math.cos(tr) * (p.y - q.y) - Math.sin(tr) * (p.x - q.x), a = norm(q.angleDeg + (cross >= 0 ? 90 : -90));   /* クリックした側へ */
    const dir = { x: Math.cos(a * Math.PI / 180), y: Math.sin(a * Math.PI / 180) };
    const exists = doc.shapes.some(o => o.type === 'line' && visible(o) && distTo(o, q) < 0.05 && (sameDir(lineDir(o), a) || sameDir(lineDir(o) + 180, a)) && [[o.x1, o.y1], [o.x2, o.y2]].some(([x, y]) => (x - q.x) * dir.x + (y - q.y) * dir.y > 0.05));   /* 分割点を通って、その向きに伸びる線がすでにある */
    if (!exists) plan.push({ q, a });
  }
  if (!plan.length) { $('hint').textContent = t('divideExists'); return true; }
  const made = []; cancel();
  commit(() => {   /* 線と目印は同じ1回の保存（元に戻すは1回） */
    for (const { q, a } of plan) {
      const rad = a * Math.PI / 180, id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, type: 'line', lineStyle: 'dashed', color: 'blue', x1: +q.x.toFixed(4), y1: +q.y.toFixed(4), x2: +(q.x + len * Math.cos(rad)).toFixed(4), y2: +(q.y + len * Math.sin(rad)).toFixed(4) }); made.push(id);
      if (putMarks) { const pid = freshId(doc.paths, 'p'); doc.paths.push({ id: pid, shapeIds: [id], reversed: false, closed: false, segments: [{ from: mark, to: mark, toolId: tool.id, pitch: tool.pitch, mode: 'manual' }], mark: 'tool' }); doc.holes.push({ id: freshId(doc.holes, 'h'), pathId: pid, toolId: tool.id, x: +(q.x + mark * Math.cos(rad)).toFixed(4), y: +(q.y + mark * Math.sin(rad)).toFixed(4), s: mark, angleDeg: a, mark: 'dot' }); marks++; }
    }
    selected = new Set(made);
  });
  const f = v => +v.toFixed(2);
  $('hint').textContent = t('divideLineDone', { L: f(L), n, k: made.length, each: f(L / n), len: f(len) }) + (marks ? ' ' + t('divideMarkNote', { m: marks, d: f(mark) }) : markOut ? ' ' + t('divideMarkOut', { len: f(len) }) : ''); rebuildSnaps(); draw();
  return true;
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
/** 点 p が、図形 s の近く（tol 未満）にあるか。外接枠の外の点は、距離を測らずに「遠い」とする（選んだ図形が多いとき、全部の穴と全部の図形の組を測ると、画面が数秒止まる）。 */
function nearShapeFn(shapes, tol, dist) {
  const boxes = shapes.map(s => { try { const b = bboxOf(s); return b && [b.minX, b.maxX, b.minY, b.maxY].every(Number.isFinite) ? b : null; } catch { return null; } });
  return p => shapes.some((s, i) => { const b = boxes[i]; return (!b || (p.x >= b.minX - tol && p.x <= b.maxX + tol && p.y >= b.minY - tol && p.y <= b.maxY + tol)) && dist(s, p) < tol; });
}
function findHoleGaps(wholeDoc = false) {
  /* 対象：選んだ図形の経路と、選んだ菱目の経路。さらに、選んだ線の上（0.5mm以内）に穴が乗っている経路（穴の付いた線に、別の線が重なっているとき、上の線を選んでも点検できる）。後者は、選んだ線の上にある歯抜けだけを補う（事業主指摘 2026-10-16 「反応なし」） */
  const ids = new Set(), onlyNear = new Set(), sel = doc.shapes.filter(s => selected.has(s.id) && s.type !== 'text' && s.type !== 'dimension' && s.type !== 'image');
  for (const p of doc.paths) if (wholeDoc || p.shapeIds.some(id => selected.has(id)) || doc.holes.some(h => h.pathId === p.id && selected.has(h.id))) ids.add(p.id);
  const nearSel = nearShapeFn(sel, 0.5, distToShape);
  for (const p of doc.paths) if (!wholeDoc && !ids.has(p.id) && sel.length && doc.holes.some(h => h.pathId === p.id && nearSel(h))) { ids.add(p.id); onlyNear.add(p.id); }
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
      const mid = pointAtLength(route, a.s + g / 2); if (onlyNear.has(pid) && !nearSel(mid)) continue; /* 重なった線を選んだときは、その線の上の歯抜けだけ */
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
/** 辺どうしが吸い付いている間（gesture.edgeSnap）、合っている縦線・横線を、画面いっぱいに細い水色で引く（ドラッグ中だけ）。 */
function drawEdgeSnap() {
  const e = gesture?.kind === 'move' ? gesture.edgeSnap : null; if (exporting || !e) return;
  const a = world({ x: 0, y: 0 }), b = world({ x: canvas.width / (window.devicePixelRatio || 1), y: canvas.height / (window.devicePixelRatio || 1) });
  ctx.save(); ctx.setLineDash([6 / scale, 4 / scale]); ctx.strokeStyle = '#4fd0ff'; ctx.lineWidth = 1 / scale;
  if (e.x !== undefined) { ctx.beginPath(); ctx.moveTo(e.x, a.y); ctx.lineTo(e.x, b.y); ctx.stroke(); }
  if (e.y !== undefined) { ctx.beginPath(); ctx.moveTo(a.x, e.y); ctx.lineTo(b.x, e.y); ctx.stroke(); }
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
  const ids = slantPickedIds();   /* 選んだ穴・選んだ線の経路の穴・選んだ線の上 0.5mm 以内の穴（順目⇔逆目と同じ数え方）。穴は見えない補助の線の経路に付くことがあり、その上に重なった見える点線を選ぶだけでも消せるように（事業主 2026-10-26「点線上の菱目を消せない」・不具合記録 1845） */ if (!ids.size) { $('hint').textContent = t('noHolesToDelete'); return; }
  commit(() => { doc.holes = doc.holes.filter(h => !ids.has(h.id)); for (const id of ids) selected.delete(id); manualNext = null; });
  $('hint').textContent = t('holesDeleted', { n: ids.size });
}
function affectedHoles(all=false) {
  const paths=new Set(doc.paths.filter(p=>p.shapeIds.some(id=>selected.has(id))).map(p=>p.id));
  return doc.holes.filter(h=>(all||selected.has(h.id)||paths.has(h.pathId))&&holeEditable(h));   /* 選択の判定を先に（全穴に holeEditable を実行しない） */
}
function markHoles(mark,all=false) { commit(()=>affectedHoles(all).forEach(h=>h.mark=mark)); }
// ツール id → ヘルプのページ id（文脈ヘルプ：ツールボタンを右クリック／長押しで開く）
const TOOL_HELP = { patchfill: 'design', ruler: 'text-dimension', rect: 'drawing', divide: 'drawing', mark: 'stitching', select: 'drawing', line: 'drawing', circle: 'drawing', arc: 'drawing', bezier: 'drawing', polyline: 'drawing', path: 'pen', text: 'text-dimension', dimension: 'text-dimension', fillet: 'drawing', chamfer: 'drawing', offset: 'drawing', detour: 'drawing', trim: 'trim-mirror', mirror: 'trim-mirror', stitch: 'stitching', fold: 'design', koma: 'design', hardware: 'hardware', library: 'library', imgScale: 'underlay' };
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
  const primary = tabIsPrimary(), key = primary ? AUTOSAVE_KEY : AUTOSAVE_SUB_KEY;   /* 副のタブは別の置き場へ（主の自動保存・元に戻す履歴は上書き・削除しない）。以前は副では保存しなかったので、再読み込みで描いた分が消えた */
  snapshotTab(); const r = packAutosave(tabs.map(tb => ({ name: tb.name, doc: tb.doc, ...(tb.scale && tb.origin ? { view: { scale: tb.scale, cx: (viewW() / 2 - tb.origin.x) / tb.scale, cy: (viewH() / 2 - tb.origin.y) / tb.scale } } : {}) })), activeTab); /* 見ていた位置（画面の中心の図面座標）と倍率も、タブごとに保存する */
  try {
    if (r.status === 'ok') { localStorage.setItem(key, r.text); autosaveWarned = false; autosaveState = 'ok'; if (primary) { lastAutosaveAt = r.savedAt; scheduleUndoSave(r.savedAt); } }
    else if (r.status === 'empty') { localStorage.removeItem(key); autosaveState = 'ok'; if (primary) clearUndoRecord().catch(() => {}); }
    else { autosaveState = 'tooLarge'; if (!autosaveWarned) { autosaveWarned = true; $('hint').textContent = t('autosaveTooLarge'); } }
  } catch { autosaveState = 'error'; if (!autosaveWarned) { autosaveWarned = true; $('hint').textContent = t('storageUnavailable'); } }
}
/** 自動保存に乗っていない未保存の変更があるか（大きすぎ・保存できないとき）。閉じる・更新・再読み込みの前の確認に使う。 */
const unsavedNotAutosaved = () => autosaveState !== 'ok' && tabs.some(tb => tb.dirty);
/** 元に戻す履歴の保管（事業主指示 2026-10-17：再起動しても Undo が残る）：自動保存の2秒後に、全タブの履歴を圧縮して IndexedDB へ。自動保存と同じ時刻（savedAt）を付け、復元のときは時刻が合うものだけ使う（図面とずれた履歴で戻して、作業を失わないため）。 */
function scheduleUndoSave(savedAt) {
  if (undoAttaching || typeof setTimeout !== 'function') return; if (typeof clearTimeout === 'function') clearTimeout(undoSaveTimer);
  const stacks = tabs.map(tb => ({ undo: tb.undo.slice(), redo: tb.redo.slice() })); /* その時点の履歴を控える（2秒のあいだに増えても、この時刻の図面に合う分だけ） */
  const handles = tabs.map(tb => tb.fileHandle || null); /* 保存したファイルの行き先も、同じ時刻の分を控える */
  undoSaveTimer = setTimeout(async () => { try { await saveUndoRecord({ savedAt, tabs: await Promise.all(stacks.map(st => st.undo.length || st.redo.length ? encodeStacks(st) : null)) }); } catch { /* 保管できない環境では何もしない */ } try { await saveFilesRecord({ savedAt, handles }); } catch { /* 行き先を保管できなくても、履歴・図面はそのまま */ } }, 2000);
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
/** 「前回の続き」で復元したタブに、保存したファイルの行き先を付け直す（Ctrl+S が、窓を出さずにそのファイルへ上書きになる）。自動保存と同じ時刻の保管だけ使う（ずれた保管で、別のファイルを上書きしないため）。タブ名は変えない。 */
async function attachSavedFiles(info, base) {
  try {
    const rec = await loadFilesRecord(); if (!rec || !Array.isArray(rec.handles)) return;
    const ok = h => h && typeof h.createWritable === 'function' && h.kind !== 'directory', nameOf = h => String(h.name || '').replace(/\.json$/i, '').trim().slice(0, 60), strict = rec.savedAt === info.savedAt;
    for (let i = 0; i < info.tabs.length; i++) {
      const tb = tabs[base + i]; if (!tb || tb.fileHandle) continue;
      if (strict) { if (ok(rec.handles[i])) tb.fileHandle = rec.handles[i]; continue; }   /* 保管の時刻が合うとき：タブの順で */
      const same = rec.handles.filter(h => ok(h) && nameOf(h) === tb.name); if (same.length === 1) tb.fileHandle = same[0];   /* 合わないとき（保管の直前に閉じた等）：タブ名（保存したファイル名）が同じで、1つに決まるときだけ */
    }
  } catch { /* 行き先が読めなくても、図面の復元はそのまま（保存のときに選び直す） */ }
}
/** 起動時：前回の保存があれば「前回の続き」バーを出す（勝手には戻さない）。壊れた保存は消す。主のタブは、主の保存と副のタブの保存のうち新しいほう（戻したら、もう一方も出す）。副のタブは、副の保存だけ（主の保存は、生きている主のタブのもの）。出したら true。 */
function offerRestore(keys = tabIsPrimary() ? [AUTOSAVE_KEY, AUTOSAVE_SUB_KEY] : [AUTOSAVE_SUB_KEY]) {
  const found = [];
  for (const key of keys) {
    let text = null; try { text = localStorage.getItem(key); } catch { /* 保存を読めない環境では何もしない */ }
    if (!text) continue;
    const info = unpackAutosave(text, d => { const m = migrateDoc(d); healDoc(m); dropDetachedFills(m); return validateDoc(m); });   /* 部品が消えた図形を指したままの壊れた保存も、直せるなら捨てない */
    if (!info) { try { localStorage.removeItem(key); } catch { /* 無視 */ } continue; }
    found.push({ ...info, key });
  }
  if (!found.length) return false;
  found.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));   /* 新しいほうから */
  const info = found[0], d = new Date(info.savedAt), p2 = n => String(n).padStart(2, '0'), when = `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  pendingRestore = info; $('restoreInfo').textContent = t('restoreInfo', { when, n: info.shapes, tabs: info.tabs.length }) + (info.key === AUTOSAVE_SUB_KEY ? ' ' + t('restoreFromSub') : ''); $('restoreBar').hidden = false; return true;
}
function restoreAutosave() {
  const info = pendingRestore; if (!info) return; pendingRestore = null; $('restoreBar').hidden = true; snapshotTab();
  if (info.key === AUTOSAVE_SUB_KEY) { try { localStorage.removeItem(AUTOSAVE_SUB_KEY); } catch { /* 無視 */ } }   /* 副の保存は、戻したら片付ける（主の保存は、次の自動保存が上書きする） */
  const empty = tabs.every(tb => !tb.doc.shapes.length), base = empty ? 0 : tabs.length; if (empty) tabs.length = 0;   /* 空の図面なら置き換え・描き始めていれば新しいタブで足す */
  for (const tb of info.tabs) tabs.push({ name: tb.name, doc: (() => { const m = withDefaultTool(migrateDoc(tb.doc)); healDoc(m); dropDetachedFills(m); return m; })(), undo: [], redo: [], selected: new Set(), activeLayer: 'pattern', dirty: true, ...(tb.view ? { scale: tb.view.scale, origin: { x: viewW() / 2 - tb.view.cx * tb.view.scale, y: viewH() / 2 - tb.view.cy * tb.view.scale } } : {}) });   /* 保存に見ていた位置があれば、そのタブの表示（倍率・位置）に戻す */
  if (!featureLocked() && info.tabs.some(tb => tb.doc.threeViewSheet)) { $('quadView').checked = true; if ($('threeView')) $('threeView').checked = false; }
  activeTab = -1; switchTab(base + info.active); if (!info.tabs[info.active].view) fit(); /* 見ていた位置が保存に無い古いデータだけ、全体表示 */ $('hint').textContent = t('restored'); noticeGaps(); undoAttaching = true; const attached = Promise.all([attachSavedUndo(info, base), attachSavedFiles(info, base)]); flushAutosave(); attached.then(() => { if (lastAutosaveAt) scheduleUndoSave(lastAutosaveAt); }); /* 復元しただけで閉じても、次の起動で履歴・行き先が合うよう、新しい時刻で保管し直す */
  offerRestore((tabIsPrimary() ? [AUTOSAVE_KEY, AUTOSAVE_SUB_KEY] : [AUTOSAVE_SUB_KEY]).filter(k => k !== info.key));   /* 主の保存と副の保存の両方があったときは、もう一方も続けて出す */
}
function discardAutosave() { const key = pendingRestore?.key || AUTOSAVE_KEY; pendingRestore = null; $('restoreBar').hidden = true; if (key === AUTOSAVE_KEY && !tabIsPrimary()) return; try { localStorage.removeItem(key); } catch { /* 無視 */ } if (key === AUTOSAVE_KEY) clearUndoRecord().catch(() => {}); flushAutosave(); offerRestore((tabIsPrimary() ? [AUTOSAVE_KEY, AUTOSAVE_SUB_KEY] : [AUTOSAVE_SUB_KEY]).filter(k => k !== key)); }
/** 別のブラウザのタブでも開いているとき（このタブが副）の警告。副のタブは、自動保存・履歴の保管・「捨てる」をしない。 */
function syncMultiTabBar() { const bar = $('multiTabBar'); if (bar) bar.hidden = tabIsPrimary(); }
/** 主／副が替わったとき：副→主なら、見送っていた「前回の続き」を出す（なければ、いまの図面を保存する）。 */
function onTabRole(was) {
  const now = tabIsPrimary(); syncMultiTabBar();
  if (now && !was) { if (restoreSkipped) { restoreSkipped = false; offerRestore(); } else scheduleAutosave(); }
}
function tabWatchTick() { if (!tabLock) return; const was = tabLock.isPrimary(); tabLock.check(); onTabRole(was); }
function startTabWatch() {
  if (!tabLock) return;
  $('multiTabTakeOver').onclick = () => { const was = tabLock.isPrimary(); tabLock.takeOver(); onTabRole(was); };
  if (typeof setInterval === 'function') setInterval(tabWatchTick, 2000);
  window.addEventListener('storage', e => { if (e?.key === TAB_LOCK_KEY) tabWatchTick(); });   /* 別のタブが主を替えたら、すぐ気づく */
  document.addEventListener?.('visibilitychange', () => { if (!document.hidden) tabWatchTick(); });
  window.addEventListener('pagehide', () => tabLock.release());   /* 閉じるとき：主なら譲る */
  window.addEventListener('pageshow', () => tabWatchTick());   /* 戻る・進むで復元されたとき（閉じるときに印を消しているので、主に戻る） */
}
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
  'patchPitch', 'patchTol', 'patchClear', 'patchTargetW', 'patchTargetH', 'patchAllowance', 'patchCols', 'patchRows', 'gridAngle', 'patchShiftX', 'patchShiftY', 'patchRim', 'patchRimOffset', 'patchRimPitch', 'patchRimRadius', 'seamStyle', 'patchStitch', 'patchHole', 'patchEdgeBan', 'patchPreferNear', 'patchKeepSize', 'patchMinPiece', 'patchTexA', 'patchTexB',
  'komaMargin', 'grid', 'spacing', 'snap'];
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
  $('stitchTool').addEventListener('change',()=>{manualNext=null;fillTool();syncPatchPitch();});
  $('toolFitDiamond').onclick=()=>fitToolsToDiamondLines(); $('toolStrip').onclick=()=>printToolStrip(); $('toolReassign').onclick=()=>reassignTool($('stitchTool').value,$('toolReassignTo').value,false); $('toolReassignSel').onclick=()=>reassignTool($('stitchTool').value,$('toolReassignTo').value,true); $('addTool').onclick=()=>registerTool(false);$('updateTool').onclick=()=>registerTool(true);
  $('resetManual').onclick=()=>{manualNext=null;draw();};
  $('placement').addEventListener('change',syncPlacementFields);syncPlacementFields();
  for(const id of ['placement','reversePath','offsetStart','offsetEnd','segmentFrom','segmentTo','stitchCount'])$(id).addEventListener('change',()=>{manualNext=null;countStage=null;});
  $('delHoles').onclick=deleteSelectedHoles; $('checkHoles').onclick=checkHoles; $('flipHoleSlant').onclick=flipSlantOfSelection; $('slantFlipNow').onclick=flipSlantOfSelection; $('drawDashed').onclick=toggleDrawDashed;
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
let layerDragId = null;
/** ドラッグ＆ドロップで層を並べ替える（事業主 2026-10-25「直感的にドラッグ＆ドロップで順番を入れ替えたい」）：src の層を、dst の行の「上（手前）」か「下（奥）」へ移す。表示は手前の層が上なので、上＝並びの後ろ。元に戻すは1回。 */
function reorderLayerTo(srcId, dstId, above) {
  if (!srcId || !dstId || srcId === dstId) return false;
  const arr = doc.layers.slice(), si = arr.findIndex(l => l.id === srcId); if (si < 0) return false; const [src] = arr.splice(si, 1), di = arr.findIndex(l => l.id === dstId); if (di < 0) return false;
  arr.splice(above ? di + 1 : di, 0, src); if (arr.map(l => l.id).join() === doc.layers.map(l => l.id).join()) return false;
  commit(() => { doc.layers = arr; }); renderLayers(); $('hint').textContent = t('layerDragMoved', { name: layerName(src) }); draw(); return true;
}
/** 層の行の上にマウスを置く（またはタップで作図先にした）間、その層の図形を、画面で橙色に光らせる（事業主 2026-10-25「レイヤを選択したときにどの図形が対象なのかさっぱりわからない」）。 */
let layerHover = null, layerHoverTimer = null;
function setLayerHover(id, ms = 0) { clearTimeout(layerHoverTimer); layerHoverTimer = null; if (layerHover === id) { if (ms && id) layerHoverTimer = setTimeout(() => setLayerHover(null), ms); return; } layerHover = id; draw(); if (ms && id) layerHoverTimer = setTimeout(() => setLayerHover(null), ms); }
function drawLayerHover() {
  if (!layerHover || exporting) return; const list = doc.shapes.filter(s => s.layer === layerHover && visible(s) && !['text', 'dimension', 'image'].includes(s.type)); if (!list.length) return;
  ctx.save(); ctx.setLineDash([]); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 6 / scale; for (const s of list) strokeShape(previewMoved(s), 'rgba(255,170,40,.55)', false);
  ctx.lineWidth = 2 / scale; for (const s of list) strokeShape(previewMoved(s), '#ffb52e', false); ctx.restore();
}
/** 選んだ図形が入っている層の行に目印（事業主 2026-10-25「選択した図形がどのレイヤーなのか一目でわかるように目印つけて」）：行を水色の枠にして、「選択 n」の札を出す。選び直すたびに（画面を描くたびに）出し入れする。 */
let layerRowRefs = [];
function markSelectedLayers() {
  if (!layerRowRefs.length) return; const count = new Map();
  if (selected.size) for (const s of doc.shapes) if (!s.holeLink && selected.has(s.id)) count.set(s.layer, (count.get(s.layer) || 0) + 1);
  for (const { id, row, tag, mv } of layerRowRefs) { if (mv && mv.disabled !== !selected.size) mv.disabled = !selected.size; const n = count.get(id) || 0, cls = 'row' + (id === activeLayer ? ' active' : '') + (n ? ' has-sel' : ''), text = n ? t('layerSelCount', { n }) : ''; if (row.className !== cls) row.className = cls; if (tag.textContent !== text) tag.textContent = text; }
}
function renderLayers() {
  if (!doc.layers.some(l => l.id === activeLayer)) activeLayer = doc.layers[0].id;
  for (const id of ['layerList', 'info-layer', 'prop-layer']) {
    const select = $(id); if (!select) continue; select.textContent = '';
    for (const l of doc.layers) { const o = document.createElement('option'); o.value = l.id; o.textContent = (id === 'prop-layer' && l.id === activeLayer ? '● ' : '') + layerName(l) + (l.locked ? ' 🔒' : '') + (l.visible ? '' : ' ・'); select.appendChild(o); }   /* 左の情報パネルの一覧は、いま描いている層（作業層）に ● を付ける（事業主 2026-10-26） */
    if (id === 'prop-layer') { const m = document.createElement('option'); m.value = '__mixed'; m.textContent = t('propMixed'); m.hidden = true; m.disabled = true; select.appendChild(m); }   /* 2つ以上選んで層がばらばらのときだけ、これを選んで見せる（選べはしない） */
  }
  const l = doc.layers.find(l => l.id === activeLayer);
  $('layerList').value = activeLayer; $('layerName').value = layerName(l); $('layerVisible').checked = l.visible; $('layerLocked').checked = l.locked;
  /* 各層の表示・ロックを一覧で切り替える（層を1つずつ選ばなくてよい） */
  { const sel = $('layerMergeSrc'); if (sel) { sel.textContent = ''; for (const lay of [...doc.layers].reverse()) { if (lay.id === activeLayer || lay.id === 'section') continue; const o = document.createElement('option'); o.value = lay.id; o.textContent = t('layerMergeOpt', { name: layerName(lay), n: doc.shapes.filter(s => s.layer === lay.id).length }); sel.appendChild(o); } } }   /* 統合する層の選択肢（作図先と断面図の層は除く） */
  const rows = $('layerRows'); rows.textContent = ''; layerRowRefs = [];
  for (const lay of [...doc.layers].reverse()) {   /* 手前の層（並びの後ろ）が上 */
    const row = document.createElement('div'); row.className = 'row' + (lay.id === activeLayer ? ' active' : '');   /* 作図先の層の行は、色を付ける */
    const grip = document.createElement('span'); grip.className = 'layer-grip'; grip.textContent = '≡'; grip.title = t('layerGripTip'); grip.draggable = true;   /* つかんで、上下へ。並べ替え */
    grip.addEventListener('dragstart', e => { row.classList?.add?.('dragging'); layerDragId = lay.id; try { e.dataTransfer?.setData?.('text/plain', lay.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer?.setDragImage?.(row, 10, 10); } catch { /* 古いブラウザ */ } });
    grip.addEventListener('dragend', () => { layerDragId = null; for (const r of layerRowRefs) { if (r.row.classList) r.row.classList.remove('dragging', 'drop-above', 'drop-below'); } });
    const dropSide = e => { const b = row.getBoundingClientRect?.(); return b && Number.isFinite(e.clientY) ? e.clientY < b.top + b.height / 2 : true; };   /* 行の上半分なら、その行の上（手前） */
    row.addEventListener('dragover', e => { if (!layerDragId || layerDragId === lay.id) return; e.preventDefault?.(); try { e.dataTransfer.dropEffect = 'move'; } catch { /* 古いブラウザ */ } const up = dropSide(e); row.classList?.toggle?.('drop-above', up); row.classList?.toggle?.('drop-below', !up); });
    row.addEventListener('dragleave', () => { row.classList?.remove?.('drop-above', 'drop-below'); });
    row.addEventListener('drop', e => { e.preventDefault?.(); row.classList?.remove?.('drop-above', 'drop-below'); const src = layerDragId || e.dataTransfer?.getData?.('text/plain'); layerDragId = null; reorderLayerTo(src, lay.id, dropSide(e)); });
    row.addEventListener('mouseenter', () => setLayerHover(lay.id)); row.addEventListener('mouseleave', () => setLayerHover(null));   /* どの図形が対象か：その層の図形を光らせる */
    const selTag = document.createElement('span'); selTag.className = 'layer-sel'; const mvBtn = document.createElement('button'); mvBtn.type = 'button'; mvBtn.className = 'layer-move'; mvBtn.textContent = t('layerMoveHere'); mvBtn.title = t('layerMoveHereTip'); mvBtn.addEventListener('click', () => moveSelectedToLayer(lay.id)); layerRowRefs.push({ id: lay.id, row, tag: selTag, mv: mvBtn });   /* 「移す」：選んでいる図形を、この層へ（作図先は変えない・事業主 2026-10-25「選択した図形を別のレイヤーにボタンを押して移動したい」） */   /* 選んだ図形が入っている層の目印（markSelectedLayers が出し入れする） */
    const box = (key, text) => { const label = document.createElement('label'), input = document.createElement('input'), span = document.createElement('span'); input.type = 'checkbox'; input.checked = !!lay[key]; span.textContent = text;
      input.addEventListener('change', () => setLayerFlag(lay.id, key, input.checked)); label.appendChild(input); label.appendChild(span); return label; };
    const act = document.createElement('button'); act.type = 'button'; act.className = 'layer-active'; act.textContent = lay.id === activeLayer ? '●' : '○'; act.title = t('layerActiveTip'); act.setAttribute('aria-pressed', String(lay.id === activeLayer)); act.addEventListener('click', () => { activeLayer = lay.id; renderLayers(); $('hint').textContent = t('layerActiveSet', { name: layerName(lay) }); setLayerHover(lay.id, 1500); });   /* 行の頭の丸：この層を作図先にする */
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 40; name.value = layerName(lay); name.className = 'layer-name'; name.title = t('layerNameEditTip'); name.addEventListener('change', () => renameLayer(lay.id, name.value)); name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur?.(); }); row.appendChild(grip); row.appendChild(act); row.appendChild(name); row.appendChild(selTag);   /* 名前は、その場で書き換えられる欄 */ row.appendChild(box('visible', t('visible'))); row.appendChild(box('locked', t('locked')));
    const arrow = (text, tip, dir) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.title = t(tip); b.className = 'layer-arrow'; b.addEventListener('click', () => moveLayer(lay.id, dir)); return b; };
    const arrows = document.createElement('span'); arrows.className = 'layer-arrows'; arrows.appendChild(arrow('▲', 'layerUpTip', 1)); arrows.appendChild(arrow('▼', 'layerDownTip', -1)); row.appendChild(arrows); row.appendChild(mvBtn); rows.appendChild(row);   /* ▲▼は、その行の右端に1組だけ（どの層の矢印かが一目で分かる） */
  }
  markSelectedLayers();
}
/** 層の名前を直す（事業主 2026-10-25「レイヤーの名前を変えれないと、どこのレイヤーに属しているかわからない」「型紙の大属性のあとに自由に名前をつけたい」）：一覧の名前の欄から、どの層でも直接書き換える。「型紙 表紙」のように、元の名前のあとに自由に足せる。
 *  空にしたら今の名前のまま。同じ名前も付けられる（右クリックの一覧に✓が付くので見分けられる）。元に戻すは1回。 */
function renameLayer(id, raw) {
  const l = doc.layers.find(x => x.id === id), name = String(raw ?? '').trim().slice(0, 40); if (!l) return;
  if (!name || name === layerName(l)) { renderLayers(); return; }
  commit(() => { const x = doc.layers.find(q => q.id === id); if (x) x.name = name; }); renderLayers(); $('hint').textContent = t('layerRenamed', { name }); draw();
}
/** 層の統合（事業主 2026-10-25「レイヤーの統合はできますか？」）：選んだ層の図形と塗りを、作図先の層へ移し、選んだ層は無くす。元に戻すは1回。
 *  ロック中の層・断面図の層は、統合しない（断面は、作りなおすたびに専用の層に置かれる）。 */
function mergeLayers(srcId, destId = activeLayer) {
  const src = doc.layers.find(l => l.id === srcId), dest = doc.layers.find(l => l.id === destId);
  if (!src || !dest || src.id === dest.id) { $('hint').textContent = t('layerMergeNone'); return false; }
  if (src.id === 'section' || src.locked || dest.locked) { $('hint').textContent = t('layerMergeBlocked'); return false; }
  const n = doc.shapes.filter(s => s.layer === src.id).length;
  commit(() => { for (const s of doc.shapes) if (s.layer === src.id) s.layer = dest.id; for (const f of doc.fills || []) if (f.layer === src.id) f.layer = dest.id; doc.layers = doc.layers.filter(l => l.id !== src.id); });
  activeLayer = dest.id; renderLayers(); $('hint').textContent = t('layerMerged', { n, src: layerName(src), dest: layerName(dest) }); draw(); return true;
}
/** 層の並びを1つ入れ替える（事業主 2026-10-24「複数の図形を重ねた時に任意に図形の重ねる順を変えたい」「レイヤーを設定して、層の順で並び変えるのが一番楽？」）。dir=+1 手前へ（並びの後ろへ）・-1 奥へ。重なりの順は、層の並び（後ろの層ほど手前）で決まる。元に戻せる。 */
function moveLayer(id, dir) {
  const i = doc.layers.findIndex(l => l.id === id), j = i + (dir > 0 ? 1 : -1); if (i < 0 || j < 0 || j >= doc.layers.length) return false;
  commit(() => { const a = doc.layers[i]; doc.layers[i] = doc.layers[j]; doc.layers[j] = a; }); renderLayers(); $('hint').textContent = t('layerOrderMoved', { name: layerName(doc.layers[j]), dir: t(dir > 0 ? 'layerMovedFront' : 'layerMovedBack') }); draw(); return true;
}
/** 層の並びの順位（後ろの層ほど大きい＝手前）。層が見つからない図形は 0（いちばん奥）。 */
const layerRankMap = d => new Map((d.layers || []).map((l, i) => [l.id, i + 1]));
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
/** 「型紙」→「型紙 2」→「型紙 3」…（事業主 2026-10-24「型紙・ガイド・部品のレイヤで、それぞれ連番を振って、同じ型紙でも重ねる順を入れ替えたい」）。
 *  同じ名前＋連番の層のうち、いちばん大きい番号の次を返す（番号の無い名前は1番として数える）。 */
function nextLayerName(name) {
  const base = String(name).replace(/\s*\d+$/, '').trim() || String(name); let top = 1;
  for (const l of doc.layers) { const nm = layerName(l), rest = nm.startsWith(base + ' ') ? nm.slice(base.length + 1) : ''; if (/^\d+$/.test(rest)) top = Math.max(top, Number(rest)); }
  return base + ' ' + (top + 1);
}
/** 連番の新しい層を、元の層のすぐ手前（重なりでは1つ上）に足す。元の層が無ければ、いちばん手前。commit の中で呼ぶ。 */
function insertNumberedLayer(srcId, name) {
  const id = freshId(doc.layers, 'layer'), at = doc.layers.findIndex(l => l.id === srcId); doc.layers.splice(at >= 0 ? at + 1 : doc.layers.length, 0, { id, name, visible: true, locked: false }); return id;
}
/** 選んだ図形を、元の層の連番の新しい層を作って移す（右クリックメニューから）。作図先はそのまま。元に戻すは1回。 */
function moveSelectedToNewLayer(srcId, name) {
  const targets = doc.shapes.filter(s => selected.has(s.id) && editable(s)); if (!targets.length) { $('hint').textContent = t('layerMoveNone'); return; }
  commit(() => { const id = insertNumberedLayer(srcId, name); for (const s of targets) s.layer = id; moveFillsWithShapes(new Set(targets.map(s => s.id)), id); }); renderLayers(); $('hint').textContent = t('layerMoved', { n: targets.length, name });
}
/** 右クリックメニューの「選んだ図形を、この層へ移す」：層の名前を（手前の層が上に）並べ、押すとその層へ移す。末尾に、連番の新しい層を作って移す項目（事業主 2026-10-24「図形を選択して右クリック→レイヤー→名前が付いたレイヤを選ぶと、そのレイヤの属性になる」）。 */
function fillCtxLayers() {
  const box = $('ctxLayers'), targets = doc.shapes.filter(s => selected.has(s.id) && editable(s));
  box.innerHTML = ''; $('ctxLayersTitle').hidden = box.hidden = !targets.length; if (!targets.length) return;
  const here = new Set(targets.map(s => s.layer));
  for (const l of [...doc.layers].reverse()) { const b = document.createElement('button'), blocked = l.locked; b.textContent = (here.size === 1 && here.has(l.id) ? '✓ ' : '') + layerName(l); b.title = t(blocked ? 'ctxLayerBlockedTip' : !l.visible ? 'ctxLayerHiddenTip' : 'ctxLayerTip'); b.disabled = blocked;   /* 非表示の層にも移せる（事業主 2026-10-25「選んだ寸法線をガイドレイヤーに移したくてもアクティブ表示にならない」：ガイドの層を隠していると、ボタンが押せなかった）。止めるのはロック中の層だけ */ b.onclick = () => { countUse('ctx_layer'); hideCtxMenu(); moveSelectedToLayer(l.id); }; box.appendChild(b); }
  const src = doc.layers.find(l => l.id === targets[0].layer), name = nextLayerName(src ? layerName(src) : t('layer.pattern')), nb = document.createElement('button');
  nb.className = 'ctx-wide'; nb.textContent = t('ctxLayerNew', { name }); nb.title = t('ctxLayerNewTip'); nb.onclick = () => { countUse('ctx_layer_new'); hideCtxMenu(); moveSelectedToNewLayer(src?.id, name); }; box.appendChild(nb);
}
/** 選んだ図形（複数でもよい）を、指定の層（既定は作図先）へ移す。移し先が非表示・ロック中なら何もしない。 */
function moveSelectedToLayer(destId = activeLayer) {
  const dest = doc.layers.find(x => x.id === destId); if (!dest) return;
  if (dest.locked) { $('hint').textContent = t('layerMoveBlocked', { name: layerName(dest) }); return; }
  const targets = doc.shapes.filter(s => selected.has(s.id) && editable(s) && s.layer !== dest.id);
  if (!targets.length) { $('hint').textContent = t('layerMoveNone'); return; }
  commit(() => { for (const s of targets) s.layer = dest.id; moveFillsWithShapes(new Set(targets.map(s => s.id)), dest.id); if (!dest.visible) selected = new Set([...selected].filter(id => !targets.some(s => s.id === id))); }); renderLayers(); $('hint').textContent = t(dest.visible ? 'layerMoved' : 'layerMovedHidden', { n: targets.length, name: layerName(dest) });   /* 非表示の層へ移したら、移した図形は見えなくなる：選びからも外し、案内を出す */
}
function initLayers() {
  $('layerList').addEventListener('change', () => { activeLayer = $('layerList').value; renderLayers(); });
  $('layerName').addEventListener('change', () => { const name = $('layerName').value.trim(); if (name) commit(() => { doc.layers.find(l => l.id === activeLayer).name = name; }); renderLayers(); });
  $('layerVisible').addEventListener('change', () => { commit(() => { doc.layers.find(l => l.id === activeLayer).visible = $('layerVisible').checked; selected.clear(); }); renderLayers(); });
  $('layerSolo').onclick = soloLayer; $('layerAll').onclick = showAllLayers; $('layerMove').onclick = () => moveSelectedToLayer(); $('layerPickYellow').onclick = pickYellowDashed; $('layerPickDashed').onclick = pickDashedAll;
  $('layerLocked').addEventListener('change', () => { commit(() => { doc.layers.find(l => l.id === activeLayer).locked = $('layerLocked').checked; selected.clear(); }); renderLayers(); });
  $('showModHelp').checked = modHelpOn; $('showModHelp').addEventListener('change', e => { modHelpOn = e.target.checked; try { localStorage.setItem('leather-cad.modHelp', modHelpOn ? 'on' : 'off'); } catch { /* 保存できなくても続ける */ } refreshModHelp(); });
  $('showSolid').checked = viewShow.solid; $('showDashed').checked = viewShow.dashed;
  $('showSolid').addEventListener('change', e => { viewShow.solid = e.target.checked; syncViewShow(true); });
  $('showDashed').addEventListener('change', e => { viewShow.dashed = e.target.checked; syncViewShow(true); });
  $('showColors').checked = viewShow.colors; $('showColors').addEventListener('change', e => { viewShow.colors = e.target.checked; draw(); });
  $('showSecDims').checked = viewShow.secDims; $('showSecDims').addEventListener('change', e => { viewShow.secDims = e.target.checked; syncViewShow(true); });   /* 断面の寸法をいつも出す */
  $('showStitch').checked = viewShow.stitch; $('showStitch').addEventListener('change', e => { viewShow.stitch = e.target.checked; draw(); });   /* 縫い目を見る */
  restoreStitchThick(); for (const [key, id] of [[STITCH_THICK_KEY, 'stitchThick'], [STITCH_THICK_ROUND_KEY, 'stitchThickRound']]) $(id).addEventListener('change', () => { try { localStorage.setItem(key, $(id).value); } catch { /* 保存できなくても続ける */ } draw(); });   /* 糸の太さ（菱目）と、丸目・スリットの太さ */
  $('stitchFace').addEventListener('change', () => draw());   /* 縫い目の面（表・裏） */
  $('backBadge')?.addEventListener('click', () => { $('stitchFace').value = 'front'; draw(); });   /* 「裏面表示中」の印を押すと、表に戻す */
  $('showHardware').checked = viewShow.hardware; $('showHardware').addEventListener('change', e => { viewShow.hardware = e.target.checked; selected = new Set([...selected].filter(id => { const x = doc.shapes.find(y => y.id === id); return !x || !hwHidden(x); })); cancel(); draw(); });   /* 金具の表示（画面と書き出しの両方。レイヤー・データは変えない） */
  initSideTabs(); restoreAskWhere(); restoreBeamFix(); $('outBeamFix')?.addEventListener('change', () => { try { localStorage.setItem(BEAM_FIX_KEY, $('outBeamFix').checked ? '1' : '0'); } catch { /* 保存できなくても続ける */ } }); $('outAskWhere')?.addEventListener('change', () => { try { localStorage.setItem(ASK_WHERE_KEY, $('outAskWhere').checked ? '1' : '0'); } catch { /* 保存できなくても続ける */ } });
  restoreDiamondStyle(); $('diamondStyle').addEventListener('change', () => { try { localStorage.setItem(DIAMOND_KEY, diamondMode()); } catch { /* 保存できなくても続ける */ } draw(); refreshInfo(); });
  $('info-flipSlant').onclick = flipSlantOfSelection; $('info-slantFwd').onclick = () => unifySlantOfSelection('fwd'); $('info-slantRev').onclick = () => unifySlantOfSelection('rev');
  $('info-diamondHollow').onclick = () => setDiamondMode('line'); $('info-diamondFilled').onclick = () => setDiamondMode('fill');
  $('gatherLayer').onclick = gatherVisibleToActiveLayer;
  $('addLayer').onclick = () => { const src = doc.layers.find(l => l.id === activeLayer); let id; commit(() => { id = insertNumberedLayer(activeLayer, nextLayerName(src ? layerName(src) : t('layer.pattern'))); }); activeLayer = id; renderLayers(); };   /* 作図先の層の連番の層を、そのすぐ手前に（事業主 2026-10-24） */
  $('layerMerge').onclick = () => mergeLayers($('layerMergeSrc').value);
  $('layerNewMove').onclick = () => { const targets = doc.shapes.filter(s => selected.has(s.id) && editable(s)); if (!targets.length) { $('hint').textContent = t('layerNewMoveNeed'); return; } const src = doc.layers.find(l => l.id === targets[0].layer); countUse('layer_new_move'); moveSelectedToNewLayer(src?.id, nextLayerName(src ? layerName(src) : t('layer.pattern'))); };   /* 選んだ図形を、新しい層に登録（事業主 2026-10-25「選んだ図形を新たなレイヤーとして登録するには？」）：右クリックの「作って移す」と同じ処理を、レイヤーの窓から1回で */
  let layerRemoveArmed = null;   /* 図形のある層を消す2段押し：{ id, at } */
  $('removeLayer').onclick = () => {
    if (doc.layers.length < 2) { $('hint').textContent = t('lastLayer'); return; }
    const lay = doc.layers.find(l => l.id === activeLayer), ids = new Set(doc.shapes.filter(s => s.layer === activeLayer).map(s => s.id));
    if (!ids.size) { commit(() => { doc.layers = doc.layers.filter(l => l.id !== activeLayer); }); activeLayer = doc.layers[0].id; renderLayers(); return; }
    /* 図形のある層：2回押して消す（事業主 2026-10-25「型紙５が消せない」：図形があると「消せません」と出るだけで、消す道が無かった）。図形・その図形で囲んだ塗りもいっしょに消え、元に戻すは1回。残したいときは「この層を、作図先へ統合」 */
    if (lay?.locked) { $('hint').textContent = t('layerRemoveLocked'); return; }
    const btn = $('removeLayer'), reset = () => { layerRemoveArmed = null; btn.textContent = t('removeLayer'); };
    if (!layerRemoveArmed || layerRemoveArmed.id !== activeLayer || Date.now() - layerRemoveArmed.at > 5000) {
      const at = Date.now(); layerRemoveArmed = { id: activeLayer, at }; btn.textContent = t('layerRemoveAgain', { n: ids.size }); $('hint').textContent = t('layerRemoveConfirm', { name: layerName(lay), n: ids.size });
      setTimeout(() => { if (layerRemoveArmed && layerRemoveArmed.at === at) reset(); }, 5000); return;
    }
    reset(); const name = layerName(lay), gone = activeLayer;
    removeSelected(ids, () => { doc.layers = doc.layers.filter(l => l.id !== gone); for (const f of doc.fills || []) if (f.layer === gone) delete f.layer; });   /* 図形と、層の記録を、同じ1回の操作で消す。層だけ残った塗りは、囲む図形の層で決める */
    activeLayer = doc.layers[0].id; renderLayers(); $('hint').textContent = t('layerRemoved', { name, n: ids.size }); draw();
  };
}

// ---- 情報パネル（選択図形の数値編集）----
const COLOR_FIELDS = ['color','lineStyle'];
const isHex6 = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), TEXT_COLOR_DEFAULT = '#9fb8c8';   /* 文字の色（textColor＝#RRGGBB）。決めていない文字の、画面の標準の色 */
const INFO_FIELDS = { line: ['x1','y1','x2','y2','length',...COLOR_FIELDS], circle: ['cx','cy','r',...COLOR_FIELDS], arc: ['cx','cy','r','startDeg','endDeg','length',...COLOR_FIELDS], bezier: ['x1','y1','x2','y2','length',...COLOR_FIELDS], polyline: ['nodes','closed','length','area',...COLOR_FIELDS], path: ['nodes','closed','length','area','nodeOps',...COLOR_FIELDS], text: ['text','sizeMm','font','textColor','angleDeg','x','y'], dimension: ['x1','y1','x2','y2','offset','length'], fold: ['x1','y1','x2','y2','angleDeg','inner'] };
const ALL_FIELDS = ['x','y','x1','y1','x2','y2','cx','cy','r','startDeg','endDeg','length','text','sizeMm','font','textColor','angleDeg','offset','closed','nodes','area','nodeOps','inner',...COLOR_FIELDS];
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
  $('stitchTool').value = tool.id; fillTool(); const ed = $('toolEditorCard'); if (ed) { for (let p = ed; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; revealCard(ed); ed.scrollIntoView?.({ block: 'nearest' }); }
  $('hint').textContent = t('holeToolLoaded', { name: tool.name });
}
/* ---- 菱目・丸目をまとめて変える（選んだ範囲の穴の形と大きさ）----
   事業主指示 2026-10-26「菱目のサイズを後から変えたい。丸目にも変換できるようにしたい」「選択した全範囲の菱目や丸目を対象とする」（選択肢 C）。
   位置・ピッチ・刃数は変えない（形と大きさだけ）。同じ工具で打った穴でも、選んだ範囲だけを変えられる（新しい工具を作って付け替える）。 */
/** 選んだ範囲の菱目・丸目の穴 { diamond, round }。範囲＝選んだ穴・選んだ線の経路の穴・選んだ線の上の穴（順目・逆目の入れ替えと同じ slantPickedIds）。見た目で分ける（点の目印・切れ目は数えない）。 */
function shapeRangeHoles(scope = holeShapeScope()) {
  const out = { diamond: [], round: [] };
  let picked = scope === 'picked' ? new Set(doc.holes.filter(h => selected.has(h.id) && holeEditable(h)).map(h => h.id)) : slantPickedIds();   /* 'picked'＝直接選んだ穴だけ（選んだ線に付いた穴は入れない） */
  if (scope === 'tool' && picked.size) { const tools = new Set(doc.holes.filter(h => picked.has(h.id)).map(h => h.toolId)); picked = new Set(doc.holes.filter(h => tools.has(h.toolId) && holeEditable(h)).map(h => h.id)); }   /* 'tool'＝選んだ範囲の穴と同じ工具の穴ぜんぶ（図面全体）。何も選んでいなければ空（図面全体を巻き込まない） */
  if (!picked.size) return out;
  for (const h of doc.holes) { if (!picked.has(h.id)) continue; const k = holeAppearance(h, doc)?.kind; if (k === 'diamond') out.diamond.push(h); else if (k === 'circle') out.round.push(h); }
  return out;
}
/** 窓の「変える範囲」：'range'＝選んだ範囲の穴（既定）／'picked'＝選んだ穴だけ／'tool'＝選んだ穴と同じ種類（工具）の穴ぜんぶ。事業主指示 2026-10-26「Aも作って。選んだ穴だけを変える小窓」 */
const holeShapeScope = () => { const v = $('holeShapeScope')?.value; return v === 'picked' || v === 'tool' ? v : 'range'; };
/** 形と大きさに合う工具：同じ規格（種類・ピッチ・刃数・傾き・大きさ）の工具があればそれ、無ければ新しい工具（pending に入れる・図面へ入れるのは呼び出し側）。ピッチ・刃数は元の工具のまま。 */
function holeShapeTool(src, shape, { w, h, d }, pending) {
  const round = shape === 'round', kind = round ? 'round' : 'diamond', angleDeg = round ? 0 : (src.kind === 'diamond' ? src.angleDeg : 45), holeW = round ? d : w, holeH = round ? d : h, holeD = round ? d : src.holeD;
  const same = [...doc.tools, ...pending].find(x => x.kind === kind && x.pitch === src.pitch && x.teeth === src.teeth && x.angleDeg === angleDeg && x.holeW === holeW && x.holeH === holeH && (!round || x.holeD === holeD));
  if (same) return same;
  const f = v => +(+v).toFixed(2), tool = { id: freshId([...doc.tools, ...pending], 'tool'), name: `${t(kind)} ${f(src.pitch)}mm ${round ? 'φ' + f(d) : f(w) + '×' + f(h)}`, kind, pitch: src.pitch, teeth: src.teeth, holeW, holeH, holeD, angleDeg, mark: 'tool' };
  pending.push(tool); return tool;
}
/** 選んだ範囲の菱目・丸目を、shape（'diamond'＝幅 w×高さ h／'round'＝直径 d）にする。onlyDiamond／onlyRound＝変える相手（両方 true でぜんぶ）。戻り値は変えた数。元に戻すは1回。
 *  丸目→菱目のとき、丸には向きが無いので線の向きに対して順目にする（もとが菱目だった丸目は、残してある向きのまま戻る）。 */
function applyHoleShape({ shape, w, h, d, onlyDiamond = true, onlyRound = true, scope }) {
  const range = shapeRangeHoles(scope), list = [...(onlyDiamond ? range.diamond : []), ...(onlyRound ? range.round : [])];
  if (!list.length) { $('hint').textContent = t('holeShapeNone'); return 0; }
  const pending = [], made = new Map(), routes = new Map(), plan = [], m180 = a => ((a % 180) + 180) % 180;
  const routeOf = pathId => { if (!routes.has(pathId)) { const p = doc.paths.find(q => q.id === pathId); routes.set(pathId, p ? resolvePath(doc, p) : null); } return routes.get(pathId); };
  for (const hl of list) {
    const src = doc.tools.find(x => x.id === hl.toolId); if (!src) continue;
    if (!made.has(src.id)) made.set(src.id, holeShapeTool(src, shape, { w, h, d }, pending));
    const tool = made.get(src.id); let angle = hl.angleDeg;
    if (shape === 'diamond' && holeAppearance(hl, doc)?.kind === 'circle') { const route = routeOf(hl.pathId); if (route) { const tan = pointAtLength(route, hl.s).angleDeg, rel = m180(hl.angleDeg - tan); if (rel < 1 || rel > 179) angle = (((tan + slantOf(tool)) % 360) + 360) % 360; } }
    const mark = hl.mark === 'diamond' || hl.mark === 'circle' ? 'tool' : hl.mark;   /* 目印で形を固定していた穴は、工具の形に従わせる（そうしないと変わらない） */
    if (tool.id !== hl.toolId || angle !== hl.angleDeg || mark !== hl.mark) plan.push({ id: hl.id, tool, angle, mark });
  }
  if (!plan.length) { $('hint').textContent = t('holeShapeSame'); return 0; }
  commit(() => {
    for (const tl of pending) if (!doc.tools.some(x => x.id === tl.id)) doc.tools.push(tl);
    const byId = new Map(doc.holes.map(x => [x.id, x])), touched = new Set();
    for (const p of plan) { const hl = byId.get(p.id); if (!hl) continue; hl.toolId = p.tool.id; hl.angleDeg = p.angle; if (hl.mark !== p.mark) hl.mark = p.mark; touched.add(hl.pathId); }
    for (const path of doc.paths) if (touched.has(path.id)) { const ids = new Set(doc.holes.filter(x => x.pathId === path.id).map(x => x.toolId)); if (ids.size === 1) for (const seg of path.segments || []) seg.toolId = [...ids][0]; }   /* 経路の穴が全部同じ工具になったら、経路の記録も合わせる */
  });
  const keep = $('stitchTool').value; refreshTools(); $('stitchTool').value = keep;   /* 工具設定で選んでいる工具は、そのまま（新しい工具は図面にだけ入れ、ブラウザの工具一覧には保存しない） */
  const f = v => +(+v).toFixed(2); $('hint').textContent = t('holeShapeDone', { n: plan.length, to: shape === 'round' ? t('holeShapeToRound', { d: f(d) }) : t('holeShapeToDiamond', { w: f(w), h: f(h) }) });
  return plan.length;
}
/** 選んだ範囲の菱目・丸目の穴を消す（線は残す）。onlyDiamond／onlyRound＝消す相手。戻り値は消した数。元に戻すは1回。事業主指示 2026-10-26「選択範囲の目打ちをすべて消す機能もつけて」。点の目印・切れ目は消さない（範囲に入らない）。 */
function eraseRangeHoles({ onlyDiamond = true, onlyRound = true, scope } = {}) {
  const range = shapeRangeHoles(scope), ids = new Set([...(onlyDiamond ? range.diamond : []), ...(onlyRound ? range.round : [])].map(h => h.id));
  if (!ids.size) { $('hint').textContent = t('holeShapeNone'); return 0; }
  commit(() => { doc.holes = doc.holes.filter(h => !ids.has(h.id)); for (const id of ids) selected.delete(id); manualNext = null; });
  $('hint').textContent = t('holeShapeErased', { n: ids.size }); return ids.size;
}
/** 窓の「選んだ範囲：菱目 n 個（大きさ）・丸目 m 個（大きさ）」。大きさは種類が違えば3つまで。 */
function holeShapeNowText(range) {
  const f = v => +(+v).toFixed(2), sizes = (list, fn) => { const u = [...new Set(list.map(hl => { const a = holeAppearance(hl, doc); return a ? fn(a) : ''; }).filter(Boolean))]; return u.length ? '（' + u.slice(0, 3).join('・') + (u.length > 3 ? '…' : '') + '）' : ''; };
  return t('holeShapeNow', { a: range.diamond.length, as: sizes(range.diamond, a => f(a.width) + '×' + f(a.height)), b: range.round.length, bs: sizes(range.round, a => 'φ' + f(a.width)) });
}
let holeShapeKey = '';
/** 窓の中身を、選んだ範囲に合わせる。窓が出ていないときは何もしない（描くたびに呼ぶので軽く：選択・穴・工具の数が変わったときだけ数え直す）。force＝数え直し／fill＝欄の初期値を、選んだ範囲の穴の大きさにする（窓を開いたとき）。 */
function refreshHoleShapeCard(force = false, fill = false) {
  const c = $('holeShapeCard'); if (!c || c.hidden || c.dataset.win !== '1') return;
  if (fill) $('holeShapeScope').value = !selectedShapeIds().size && doc.holes.some(h => selected.has(h.id)) ? 'picked' : 'range';   /* 穴だけを選んで開いたときは「選んだ穴だけ」から（線も選んでいれば「選んだ範囲」） */
  const key = [...selected].join(',') + '|' + doc.holes.length + '|' + doc.tools.length + '|' + doc.shapes.length + '|' + holeShapeScope();
  if (!force && key === holeShapeKey) return; holeShapeKey = key;
  const range = shapeRangeHoles(), n = range.diamond.length + range.round.length;
  $('holeShapeNow').textContent = n ? holeShapeNowText(range) : t('holeShapeNone'); $('holeShapeApply').disabled = !n; $('holeShapeErase').disabled = !n;
  if (!fill) return;
  const ad = range.diamond[0] && holeAppearance(range.diamond[0], doc), ar = range.round[0] && holeAppearance(range.round[0], doc), f = v => String(+(+v).toFixed(2));
  $('holeShapeKind').value = !range.diamond.length && range.round.length ? 'round' : 'diamond';
  $('holeShapeW').value = ad ? f(ad.width) : '2'; $('holeShapeH').value = ad ? f(ad.height) : '0.8'; $('holeShapeD').value = ar ? f(ar.width) : '1';
  $('holeShapeOnlyDiamond').checked = true; $('holeShapeOnlyRound').checked = true; syncHoleShapeRows();
}
function syncHoleShapeRows() { const round = $('holeShapeKind').value === 'round'; $('holeShapeDiamondRow').hidden = round; $('holeShapeRoundRow').hidden = !round; }
/** 「菱目・丸目をまとめて変える」の窓を開く（右クリックメニューから）。選んだままで図面を触れる窓。 */
function openHoleShapeWin() { $('holeShapeCard').hidden = false; setCardWin('holeShapeCard', true); refreshHoleShapeCard(true, true); $('hint').textContent = t('holeShapeOpened'); }
function runHoleShapeErase() {
  const onlyDiamond = $('holeShapeOnlyDiamond').checked, onlyRound = $('holeShapeOnlyRound').checked; if (!onlyDiamond && !onlyRound) { $('hint').textContent = t('holeShapeNoKind'); return; }
  eraseRangeHoles({ onlyDiamond, onlyRound }); refreshHoleShapeCard(true);
}
function runHoleShapeApply() {
  const num = id => { const v = $(id).value; return v === '' || v === null ? NaN : Number(v); }, ok = v => v >= 0.1 && v <= 50, shape = $('holeShapeKind').value === 'round' ? 'round' : 'diamond', w = num('holeShapeW'), h = num('holeShapeH'), d = num('holeShapeD');
  if (shape === 'round' ? !ok(d) : !(ok(w) && ok(h))) { $('hint').textContent = t('holeShapeInvalid'); return; }
  const onlyDiamond = $('holeShapeOnlyDiamond').checked, onlyRound = $('holeShapeOnlyRound').checked; if (!onlyDiamond && !onlyRound) { $('hint').textContent = t('holeShapeNoKind'); return; }
  applyHoleShape({ shape, w, h, d, onlyDiamond, onlyRound }); refreshHoleShapeCard(true);
}
function refreshInfo() { try { refreshInfoCore(); } finally { syncPropPanel(); } }   /* 右列のカードを直したあと、左の3つの欄へ写す */
function refreshInfoCore() {
  const s = infoShape(), many = s ? [] : infoShapes(); infoBusy = true; propMixed.color = propMixed.lineStyle = propMixed.layer = false;
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
    $('info-type').textContent = dOnly ? t('diamondLinesSelected', { n: many.length }) : t('multiSelected', { n: many.length }); { const lv = commonValue(many, x => x.layer); $('info-layer').value = lv; propMixed.layer = lv === '__mixed'; }
    if (colorable.length) { const cv = commonValue(colorable, x => x.color || ''), sv = commonValue(colorable, x => x.lineStyle || ''); $('info-color').value = cv; $('info-lineStyle').value = sv; propMixed.color = cv === '__mixed'; propMixed.lineStyle = sv === '__mixed'; }
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
    if (s.type === 'text') { $('info-font').value = s.font && Object.hasOwn(TEXT_FONTS, s.font) ? s.font : 'gothic'; $('info-textColor').value = isHex6(s.textColor) ? s.textColor : TEXT_COLOR_DEFAULT; }   /* 文字のフォント（書いていなければゴシック＝標準） */
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
  else if (field === 'textColor') { const v = $('info-textColor').value; if (s.type !== 'text' || !isHex6(v)) return; next.textColor = v; }   /* 文字の色（事業主 2026-10-26「フォントの色が選べない」） */
  else if (field === 'font') { const v = $('info-font').value; if (s.type !== 'text' || !Object.hasOwn(TEXT_FONTS, v)) return; if (v === 'gothic') delete next.font; else next.font = v; }   /* 文字のフォント（ゴシック＝標準は書かない・2026-10-26 事業主「フォントを変えられない」：右クリックの窓は見つけにくかったため、情報カードにも置く） */
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
let lamSecViewLast = '';
/** 貼り合わせ検証カードの中に、いま選んでいる表・裏の断面図を画像（SVG）で出す（事業主の指示 2026-10-19「断面図の画像を、画面の中に出す」）。断面が無い（作っていない・元に戻した・別の組み合わせ）ときは枠ごと隠す。同じ画像なら描き直さない。 */
function renderLamSecView() {
  const wrap = $('lamSecWrap'), box = $('lamSecView'); if (!wrap || !box) return;
  const po = doc.parts.find(p => p.id === $('lamOuter').value), pi = doc.parts.find(p => p.id === $('lamInner').value), key = po && pi && po !== pi ? `lam:${po.id}:${pi.id}` : null;
  const id = key ? Object.entries(doc.foldSections || {}).find(([, m]) => m.key === key)?.[0] : null, svg = id ? foldSectionSvg(doc.shapes.filter(s => s.foldSec === id)) : '';
  if (svg !== lamSecViewLast) { lamSecViewLast = svg; box.innerHTML = svg; } wrap.hidden = !svg;
}
function renderLaminateNow() {
  renderLamSecView();
  const box = $('lamNow'); if (!box) return;
  const o = $('lamOuter').value, i = $('lamInner').value; if (doc.parts.length < 2) { box.textContent = t('lamNowNeedParts'); return; } if (o && o === i) { box.textContent = t('lamNowSame'); return; }
  /* 厚みは、手で直していれば欄の数字、直していなければ部品の厚み（欄は書き換えない：入力の途中の数字を消さないため） */
  const axis = $('lamAxis').value, r = laminateNow(doc, o, i, { tOuter: lamTouched.o ? Number($('lamTOuter').value) : undefined, tInner: lamTouched.i ? Number($('lamTInner').value) : undefined, axis: axis === 'x' || axis === 'y' ? axis : 'auto' }); if (!r) { box.textContent = t('lamNowNeedParts'); return; }
  const f2 = v => (+v).toFixed(2), b = r.bend, head = t('lamNowLine', { o: f2(r.outerLen), i: f2(r.innerLen), dl: f2(r.diff) });
  box.textContent = head + ' ' + (b.curl === 'none' ? t('lamNowNone') : b.ok ? t('lamNowBend', { r: f2(b.radius), a: b.thetaDeg.toFixed(1), side: t(b.curl === 'outer' ? 'lamSideOuter' : 'lamSideInner') }) : t('lamNowTooMuch'));
}
/** 厚み欄（表の革の厚み・裏の革の厚み）に入れた値を、選んでいる部品の厚みにも保存する（事業主の指示 2026-10-19「画面を開き直しても2.3のまま」）。欄を確定したとき（change）。
 *  部品が選ばれていないときは何もしない。0 以下・数でない・空は保存せず案内する（部品の厚みは変えない）。いまの値と同じなら何もしない。保存は1回の操作（元に戻せる）。部品の厚みは図面に残るので、開き直しても欄に出る（refreshLaminateParts）。 */
function saveLamThickness(which) {
  const el = $(which === 'o' ? 'lamTOuter' : 'lamTInner'), part = doc.parts.find(p => p.id === $(which === 'o' ? 'lamOuter' : 'lamInner').value); if (!part) return;
  const raw = String(el.value ?? '').trim(), v = Number(raw); if (raw === '' || !(v > 0)) { $('hint').textContent = t('lamThickBad'); return; }
  lamTouched[which] = false;   /* 保存したあとは、部品の値に従う（欄＝部品の値） */
  if (part.thickness === v) return;
  commit(() => { part.thickness = v; }); $('hint').textContent = t('lamThickSaved', { name: part.name, v: String(+v.toFixed(3)) }); renderLaminateNow();
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
  const ringRaw = String($('lamRingD').value ?? '').trim(), ringD = ringRaw === '' ? 0 : Number(ringRaw); if (ringRaw !== '' && !(ringD > 0)) { fail('lamRingErr_bad'); return; }   /* リング外径（空なら見ない） */
  const specs = {}, sideName = k => t(k === 'outer' ? 'lamSideOuter' : 'lamSideInner'), rimZ = lamRimBendZones(doc, po.id, pi.id, { axis: now.axis });   /* 外周の菱の線の曲げ部（点線が無いとき・穴より先に使う） */
  for (const [side, part] of [['outer', po], ['inner', pi]]) { const r = lamFoldSpec(doc, part, { axis: now.axis, rim: rimZ.ok ? rimZ[side] : null }); if (!r.ok) { fail('lamSecErr_' + r.error, { side: sideName(side), n: r.count ?? 0 }); return; } specs[side] = r; }
  const base = $('lamBase').value === 'inner' ? 'inner' : 'outer', plan = foldStackPlan({ outer: specs.outer, inner: specs.inner, tO, tI, base, angleMode: 'data', outerHoles: specs.outer.holes, innerHoles: specs.inner.holes, outerCircles: lamPartCircles(doc, po, specs.outer), innerCircles: lamPartCircles(doc, pi, specs.inner) });
  if (!plan.ok) { fail('lamSecErr_' + plan.error, { k: plan.index ?? 0 }); return; }
  const ring = ringD > 0 ? foldRingCheck(plan, { ringD, tO, tI, pitch: lamPitchValue() }) : null;   /* 折りの内側の隙間が、リング外径以上か */
  const b = bboxOfDoc({ ...doc, shapes: doc.shapes.filter(s => visible(s) && !s.foldSec), holes: [] }) || { maxY: 0 }, x0 = partBox(doc, po)?.minX ?? 0, origin = { x: x0, y: b.maxY + 40 + foldPathVMax(plan.path) + plan.T }, key = `lam:${po.id}:${pi.id}`;
  commit(() => {
    doc.foldSections ||= {};
    for (const [id, m] of Object.entries(doc.foldSections)) if (m.key === key) { doc.shapes = doc.shapes.filter(s => s.foldSec !== id); delete doc.foldSections[id]; }   /* 同じ組み合わせの前の断面は置き換える */
    let n = 1; while (doc.foldSections['fs' + n]) n++; const secId = 'fs' + n, gid = nextGroupId(doc.shapes);
    if (!doc.layers.some(l => l.id === 'section')) doc.layers.push({ id: 'section', name: t('foldSecLayer'), visible: true, locked: false });
    doc.foldSections[secId] = { key, flats: plan.flats, bends: plan.bends, flip: plan.flip, angles: plan.pathAngles, t: plan.T / 2, plies: FOLD_SEC_PLIES, T: plan.T, glueK: plan.glueK, x0, x1: x0 + specs.outer.length, lam: true };
    for (const sh of foldSectionShapes(plan.path, plan.T, origin, FOLD_SEC_PLIES, plan.T / 2 - tI)) doc.shapes.push({ ...sh, id: freshId(doc.shapes, 's'), layer: 'section', groupId: gid, foldSec: secId });   /* 貼り合わせ線は、裏の革の厚みぶん内側の面から */
    for (const [ss, side] of [[plan.outerS, 'outer'], [plan.innerS, 'inner']]) for (const hm of foldHoleMarks(plan.path, ss, plan.T, origin).filter(m => m.side === side)) doc.shapes.push({ ...hm, id: freshId(doc.shapes, 's'), layer: 'section', color: 'blue', foldSec: secId });   /* 表の菱目は外側の面・裏の菱目は内側の面 */
    for (const [list, side] of [[plan.outerC, 'outer'], [plan.innerC, 'inner']]) for (const m of foldCircleMarks(plan.path, list, plan.T, origin, plan.glueK, side)) doc.shapes.push({ ...m, id: freshId(doc.shapes, 's'), layer: 'section', color: side === 'outer' ? 'yellow' : 'blue', foldSec: secId });   /* 円の穴：表の円は外側の層・裏の円は内側の層に、穴の幅（直径）ぶんの四角（事業主の指示 2026-10-19「〇穴を断面図に追加してほしい」） */
    for (const lb of foldEndLabels(plan.path, origin, { startText: t(plan.flip ? 'lamSecEndRight' : 'lamSecEndLeft'), endText: t(plan.flip ? 'lamSecEndLeft' : 'lamSecEndRight'), sizeMm: 3.5 })) doc.shapes.push({ ...lb, id: freshId(doc.shapes, 's'), layer: 'section', color: 'white', foldSec: secId });   /* 断面の両端：表・裏の図面（展開図）の左端・右端（flip のときは始点が右端）（事業主の指示 2026-10-19「展開図の左右がどちらかわかりにくい」） */
    if (ring) plan.path.pieces.filter(q => q.kind === 'arc').forEach((pc, ai) => doc.shapes.push({ type: 'circle', cx: origin.x + pc.c.u, cy: origin.y - pc.c.v, r: ring.ringD / 2, id: freshId(doc.shapes, 's'), layer: 'section', color: ring.gaps[plan.flip ? 1 - ai : ai].ok ? 'green' : 'red', foldSec: secId, role: 'ring' }));   /* リングの円：2か所の折りの中心に置く目安（足りなければ赤） */
  });
  const f2 = v => (+v).toFixed(2), r = plan.report, baseName = sideName(r.base), otherName = sideName(r.base === 'outer' ? 'inner' : 'outer'), src = k => t('lamSecSrc_' + specs[k].source), warn = d => Math.abs(d) > 0.05 ? 'lam-warn' : '';
  const done = t('lamSecDone', { so: src('outer'), si: src('inner'), glue: f2(plan.glueLen), outer: f2(r.lenOuter), inner: f2(r.lenInner) }); line(done); $('hint').textContent = done;
  line(t(tO === tI ? 'lamSecThick' : 'lamSecThickDiff', { o: f2(tO), i: f2(tI) }), tO === tI ? undefined : 'lam-warn');   /* 断面に使った革の厚み（表と裏で違うと、2枚の厚みも違って見える・事業主の指摘 2026-10-19「内側と外側の革で厚みが違ってみえます」） */
  if ([specs.outer.source, specs.inner.source].some(x => x === 'holes' || x === 'rim')) line(t('lamSecHolesNote'), 'lam-warn');   /* 菱目から見つけた曲げ部は、折りの始まり・終わりが穴の位置どまり（±1ピッチ） */
  line(t('lamSecRadius', { a: f2(plan.radii[0].inner), b: f2(plan.radii[1].inner) }));
  line(t('lamSecAngle', { a: (plan.angles[0] * 180 / Math.PI).toFixed(1), b: (plan.angles[1] * 180 / Math.PI).toFixed(1) }));   /* 折りの角度＝（表の曲げ−裏の曲げ）÷厚みの平均 */
  r.flats.forEach((f, k) => line(t('lamSecFlat', { k: k + 1, o: f2(f.outer), i: f2(f.inner), d: lamSecDiff(f.diff) }), warn(f.diff)));
  r.bends.forEach((bd, k) => line(t('lamSecBendA', { k: k + 1, o: f2(bd.outer), i: f2(bd.inner), d: f2(bd.outer - bd.inner), a: (plan.angles[k] * 180 / Math.PI).toFixed(1), r: f2(plan.radii[k].glue) })));
  line(t('lamSecTotal2', { o: f2(r.lenOuter), i: f2(r.lenInner), d: f2(r.lenOuter - r.lenInner) }));
  if (plan.outerC.length + plan.innerC.length) line(t('lamSecMarks', { n: plan.outerC.length + plan.innerC.length, o: plan.outerC.length, i: plan.innerC.length }));   /* 断面に入れた円の穴の数 */
  if (ring) {   /* リング外径：折りの内側の隙間が足りるか・足りない折りは、折りごとの角度での必要な曲げの長さ */
    const g1 = x => x.toFixed(1), d = String(+ring.ringD.toFixed(2)), ga = ring.gaps[0], gb = ring.gaps[1], sideLabel = k => t(k === 0 ? 'lamRingLeft' : 'lamRingRight');
    line(ring.ok ? t('lamRingOk', { d, a: g1(ga.gap), b: g1(gb.gap) }) : t('lamRingShort', { d, a: g1(ga.gap), b: g1(gb.gap), sa: g1(ga.short), sb: g1(gb.short) }), ring.ok ? 'lam-ok' : 'lam-warn');
    ring.gaps.forEach((g, k) => { if (g.ok) return; const nd = ring.needs[k], bp = ring.byPitch?.[k];
      line(t('lamRingNeed', { k: g.k, ang: (nd.angle * 180 / Math.PI).toFixed(1), d, bi: f2(nd.inner), bo: f2(nd.outer) }), 'lam-warn');
      if (bp) line(t('lamRingPitch', { k: g.k, p: String(+bp.pitch.toFixed(3)), n: bp.n, bi: f2(bp.inner), bo: f2(bp.outer), g: g1(bp.gap), dIn: f2(ring.extra.inner[k]), dOut: f2(ring.extra.outer[k]) }), 'lam-warn'); });
    if (!ring.ok) $('hint').textContent += ' ' + t('lamRingHint', { d, list: ring.gaps.filter(g => !g.ok).map(g => sideLabel(g.k - 1) + ' ' + g1(g.gap) + ' mm').join('・') });
    line(t('lamRingNote'));
  }
  draw(); renderLamSecView();   /* カードの中の断面の画像も描く */
}
/** 寸法が入っている層（レイヤー）を、表示にする（貼り合わせ検証の「寸法の層を表示する」ボタン。事業主の質問 2026-10-19「寸法非表示とは？どこにボタンがある？」）。元に戻すは1回。検証は出し直す。 */
function showDimensionLayers() {
  const ids = new Set(doc.shapes.filter(s => s.type === 'dimension' && !s.foldSec).map(s => s.layer));
  commit(() => { for (const l of doc.layers) if (ids.has(l.id)) l.visible = true; selected.clear(); }); renderLayers(); runLaminate(); renderLaminateNow();
}
/* ───────── 外周の菱目（菱の線）を、指定ピッチに並べ直す（事業主の選択 2026-10-19・案A）。平らなピッチ＝指定のピッチ（空なら、いま選んでいる目打ち工具のピッチ）・曲げの範囲＝ピッチの倍数。穴を足して、列の右端を元の位置に近づける ───────── */
const lamPitchValue = () => { const raw = String($('lamPitch').value ?? '').trim(); if (raw !== '') return Number(raw); const tool = doc.tools.find(x => x.id === $('stitchTool').value); return tool ? tool.pitch : NaN; };
function relayRim() {
  const box = $('lamResult'); box.textContent = '';
  const line = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); }, fail = (key, p) => { const m = t(key, p); line(m, 'lam-error'); $('hint').textContent = m; };
  if (doc.parts.length < 2) { fail('lamNeedParts'); return; }
  fillLaminateParts(); const po = doc.parts.find(p => p.id === $('lamOuter').value), pi = doc.parts.find(p => p.id === $('lamInner').value); if (!po || !pi || po === pi) { fail('lamErr_pickTwo'); return; }
  const axisSel = $('lamAxis').value, bo = partBox(doc, po), axis = axisSel === 'x' || axisSel === 'y' ? axisSel : (bo && bo.maxY - bo.minY > bo.maxX - bo.minX ? 'y' : 'x');   /* 曲がる向き：自動のときは、長いほう */
  const plan = lamRimRelayout(doc, po.id, pi.id, { pitch: lamPitchValue(), axis }); if (!plan.ok) { fail('lamRelayErr_' + plan.error); return; }
  const ids = new Set([...plan.moves.outer, ...plan.moves.inner].map(m => m.id)), locked = doc.shapes.filter(s => ids.has(s.id) && !editable(s)).length; if (locked) { fail('lamRelayErr_locked', { n: locked }); return; }
  const vec = d => plan.axis === 'x' ? { x: d, y: 0 } : { x: 0, y: d };
  const apex = lamApexPlan(doc, po.id, pi.id, plan, { axis: plan.axis }), apexAll = apex.ok ? [...apex.outer.moves, ...apex.inner.moves] : [], apexOf = m => doc.shapes.find(q => q.id === m.id), apexMoves = apexAll.filter(m => apexOf(m) && editable(apexOf(m))), apexLocked = apexAll.filter(m => apexOf(m) && !editable(apexOf(m))).length;   /* 頂点の円：曲げが動くので、新しいまん中へ（ロックされた円は動かさない）（事業主の決定 2026-10-19） */
  commit(() => {
    const byId = new Map(doc.shapes.map(s => [s.id, s])), moved = new Map(), added = [];
    for (const m of [...plan.moves.outer, ...plan.moves.inner]) { const s = byId.get(m.id), v = vec(m.d); if (s && m.d !== 0) moved.set(m.id, translate(s, v.x, v.y)); }
    for (const m of apexMoves) { const s = byId.get(m.id), v = vec(m.d); if (s) moved.set(m.id, translate(s, v.x, v.y)); }
    for (const [part, adds] of [[po, plan.adds.outer], [pi, plan.adds.inner]]) for (const a of adds) { const src = byId.get(a.from), v = vec(a.d); if (!src) continue; const { id: _old, ...rest } = translate(src, v.x, v.y), id = freshId([...doc.shapes, ...added], 's'); added.push({ ...rest, id }); part.shapeIds.push(id); }   /* 足す菱目は、列の最後の菱目の複製（元の位置から動かした量で置く）。部品にも入れる */
    doc.shapes = [...doc.shapes.map(s => moved.get(s.id) || s), ...added];
  });
  const f2 = v => (+v).toFixed(2), z = plan.zones, done = t('lamRelayDone', { p: String(+plan.pitch.toFixed(3)), rows: plan.rows, z: z.length, m: plan.extra }); line(done); $('hint').textContent = done;
  for (const q of z) line(t('lamRelayZone', { k: q.k, n: q.n, oOld: f2(q.outerOld), oNew: f2(q.outerNew), oGap: f2(q.outerGap), iOld: f2(q.innerOld), iNew: f2(q.innerNew), iGap: f2(q.innerGap) }));
  line(plan.stretchSkipped ? t('lamRelayNoStretch') : plan.stretch > 1e-9 ? t('lamRelayFlat', { g: (+plan.flatGap).toFixed(3), p: String(+plan.pitch.toFixed(3)), d: (plan.stretch / plan.pitch * 100).toFixed(1) }) : t('lamRelayFlatExact', { p: String(+plan.pitch.toFixed(3)) })); line(t('lamRelaySpan', { oOld: f2(plan.span.outer[0]), oNew: f2(plan.span.outer[1]), iOld: f2(plan.span.inner[0]), iNew: f2(plan.span.inner[1]), ro: f2(plan.remainder.outer), ri: f2(plan.remainder.inner) })); line(t('lamRelayNote'));
  if (apexMoves.length) line(t('lamRelayApex', { n: apexMoves.length })); if (apexLocked) line(t('lamRelayApexLocked', { n: apexLocked }), 'lam-warn');
  rebuildSnaps(); draw();
}
/* ───────── 整える（事業主の指示 2026-10-19「並べ直し→曲げを伸ばす→断面図→展開を1回にまとめる整えるボタンを作る」）：①菱目を並べ直す ②リングが入らない曲げを伸ばす ③ボタンの穴を表と裏でそろえる（展開） ④表と裏から断面図を作る。
   展開を断面図の前にするのは、展開で足した円も断面に入れるため。既存の4つの操作をそのまま順に呼ぶ。元に戻すは1回（途中の記録は1つにまとめる）・途中で失敗したら全部もとにもどす・リング外径が空なら②を飛ばす（円が無い・曲げが縦の点線から決まる、のときも②③を飛ばして続ける） ───────── */
function tidyLaminate() {
  const box = $('lamResult'), grab = () => [...(box.children || [])].map(c => ({ text: c.textContent || '', cls: c.className || '' })), ringRaw = String($('lamRingD').value ?? '').trim();
  const defs = [
    { key: 'lamTidyStep1', run: relayRim },
    { key: 'lamTidyStep2', run: growBends, skipText: ringRaw === '' ? t('lamTidySkipNoRing') : null, okErrors: [t('lamGrowErr_notRim')] },
    { key: 'lamTidyStep3', run: () => { unfoldButtons(); if (grab().some(r => r.cls.includes('lam-error') && r.text === t('lamUnfoldErr_noButtons'))) placeBendGuidesOnly(); }, okErrors: [t('lamUnfoldErr_noButtons')] },   /* 円が無くて展開を飛ばしても、曲げの範囲の点線は入れる */
    { key: 'lamTidyStep4', run: makeLamSection }];
  const savedUndo = undo, savedRedo = redo, steps = []; let failed = null; undo = [];   /* 途中の元に戻す記録は、いったん別の置き場へ（最後に1つにまとめる） */
  try {
    for (const d of defs) {
      if (d.skipText) { steps.push({ key: d.key, status: 'skip', rows: [{ text: d.skipText, cls: 'lam-warn' }] }); continue; }
      const before = JSON.stringify(doc); d.run(); const rows = grab(), errs = rows.filter(r => r.cls.includes('lam-error'));
      if (errs.length && !errs.every(r => (d.okErrors || []).includes(r.text))) { failed = { key: d.key, rows }; break; }
      steps.push({ key: d.key, status: errs.length ? 'skip' : JSON.stringify(doc) !== before ? 'ok' : 'same', rows });
    }
  } finally {
    const scratch = undo; undo = savedUndo;
    if (failed) { if (scratch.length) { const tmp = [scratch[0]]; history(tmp, []); } redo = savedRedo; }   /* 失敗：最初の記録（＝整える前の図面）へ戻して、記録は増やさない */
    else if (scratch.length) { undo.push(scratch[0]); if (undo.length > 100) undo.shift(); }   /* 成功：整える前の図面だけを1つ残す */
  }
  box.textContent = ''; const line = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); }, show = st => { line(t(st.key), 'lam-step'); st.rows.forEach(r => line(r.text, r.cls)); };
  if (failed) { const m = t('lamTidyFail', { n: t(failed.key) }); line(m, 'lam-error'); show(failed); $('hint').textContent = m; return; }
  const word = k => t(k === 'ok' ? 'lamTidyOk' : k === 'same' ? 'lamTidySame' : 'lamTidySkip'), done = t('lamTidyDone', { a: word(steps[0].status), b: word(steps[1].status), c: word(steps[2].status), d: word(steps[3].status) });
  line(done); steps.forEach(show); $('hint').textContent = done; draw();
}
/* ───────── 曲げを伸ばす（事業主の選択 2026-10-19・A 伸ばすだけ）：リングが入らない曲げだけ、必要な長さ（菱目の間隔の倍数）まで表・裏とも伸ばす。入る曲げ・折りの角度は変えない ───────── */
function growBends() {
  const box = $('lamResult'); box.textContent = '';
  const line = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); }, fail = (key, p) => { const m = t(key, p); line(m, 'lam-error'); $('hint').textContent = m; }, sideName = k => t(k === 'outer' ? 'lamSideOuter' : 'lamSideInner'), f2 = v => (+v).toFixed(2);
  if (doc.parts.length < 2) { fail('lamNeedParts'); return; }
  fillLaminateParts(); const po = doc.parts.find(p => p.id === $('lamOuter').value), pi = doc.parts.find(p => p.id === $('lamInner').value); if (!po || !pi || po === pi) { fail('lamErr_pickTwo'); return; }
  if (!lamTouched.o) laminateThickFromPart('o'); if (!lamTouched.i) laminateThickFromPart('i');
  const tO = Number($('lamTOuter').value), tI = Number($('lamTInner').value), axisSel = $('lamAxis').value, now = laminateNow(doc, po.id, pi.id, { tOuter: tO, tInner: tI, axis: axisSel === 'x' || axisSel === 'y' ? axisSel : 'auto' });
  if (!(tO > 0 && tI > 0)) { fail('lamErr_thickness'); return; } if (!now) { fail('lamErr_emptyPart'); return; }
  const ringRaw = String($('lamRingD').value ?? '').trim(), ringD = ringRaw === '' ? 0 : Number(ringRaw); if (!(ringD > 0)) { fail(ringRaw === '' ? 'lamGrowErr_noRing' : 'lamRingErr_bad'); return; }
  const pitch = lamPitchValue(); if (!(pitch >= 0.5)) { fail('lamRelayErr_badPitch'); return; }
  const specs = {}, rimZ = lamRimBendZones(doc, po.id, pi.id, { axis: now.axis });
  for (const [side, part] of [['outer', po], ['inner', pi]]) { const r = lamFoldSpec(doc, part, { axis: now.axis, rim: rimZ.ok ? rimZ[side] : null }); if (!r.ok) { fail('lamSecErr_' + r.error, { side: sideName(side), n: r.count ?? 0 }); return; } specs[side] = r; }
  if (specs.outer.source !== 'rim' || specs.inner.source !== 'rim') { fail('lamGrowErr_notRim'); return; }   /* 曲げの範囲が外周の菱目から決まっているときだけ（菱目を並べ直すため） */
  const base = $('lamBase').value === 'inner' ? 'inner' : 'outer', plan = foldStackPlan({ outer: specs.outer, inner: specs.inner, tO, tI, base, angleMode: 'data', outerHoles: specs.outer.holes, innerHoles: specs.inner.holes });
  if (!plan.ok) { fail('lamSecErr_' + plan.error, { k: plan.index ?? 0 }); return; }
  const ring = foldRingCheck(plan, { ringD, tO, tI, pitch }), bad = ring.gaps.filter(g => !g.ok);
  if (!bad.length) { const m = t('lamGrowNone', { d: String(+ringD.toFixed(2)) }); line(m); $('hint').textContent = m; return; }
  const gp = lamBendGrowPlan(doc, po.id, pi.id, { pitch, axis: now.axis, grow: bad.map(g => ({ k: g.k, n: ring.byPitch[g.k - 1].n })) }); if (!gp.ok) { fail(gp.error === 'badGrow' ? 'lamGrowErr_badGrow' : 'lamRelayErr_' + gp.error); return; }
  const res = lamBendGrowApply(doc, po.id, pi.id, gp), locked = [...res.replace.keys()].filter(id => { const s = doc.shapes.find(q => q.id === id); return s && !editable(s); }).length; if (locked) { fail('lamGrowErr_locked', { n: locked }); return; }
  commit(() => {
    const added = []; for (const [part, list] of [[po, res.adds.outer], [pi, res.adds.inner]]) for (const sh of list) { const id = freshId([...doc.shapes, ...added], 's'); added.push({ ...sh, id }); part.shapeIds.push(id); }   /* 足す菱目は、曲げの始めの菱目の複製。部品にも入れる */
    doc.shapes = [...doc.shapes.map(s => res.replace.get(s.id) || s), ...added];
  });
  const m = gp.outer.rim.adds.length + gp.inner.rim.adds.length, done = t('lamGrowDone', { z: gp.zones.length, m, o: f2(gp.outer.shift), i: f2(gp.inner.shift) }); line(done); $('hint').textContent = done;
  for (const z of gp.zones) line(t('lamGrowZone', { k: z.k, oOld: f2(z.outerOld), oNew: f2(z.outerNew), iOld: f2(z.innerOld), iNew: f2(z.innerNew), nOld: z.nOld, n: z.n, gOld: f2(ring.gaps[z.k - 1].gap), gNew: f2(ring.byPitch[z.k - 1].gap), aOld: (plan.angles[z.k - 1] * 180 / Math.PI).toFixed(1), aNew: ((z.outerNew - z.innerNew) / ((tO + tI) / 2) * 180 / Math.PI).toFixed(1) }));
  line(t('lamGrowNote')); rebuildSnaps(); draw();
}
/* ───────── 三つ折りの手順（事業主の指示 2026-10-19「右メニューがかなりわかりにくく」→ 分類タブ＋三つ折りは手順画面）：どの手順まで済んでいるかを、図面の状態から出す。
   ①断面＝foldSec 'fd' の図形（三つ折りの設計の断面）②平面＝foldFlat 'fd' の図形（FIX の投影）④貼り合わせ検証の断面＝foldSections の lam ⑤展開＝曲げの範囲の点線（lamBendGuide）か 表・裏の展開図（foldFlat 'fdu'）。③設計を直すは目印が無いので、④か⑤に進んだら済。 ───────── */
function foldFlowStates(d = doc) {
  const sh = d.shapes || [], has = f => sh.some(f), s1 = has(s => s.foldSec === 'fd'), s2 = has(s => s.foldFlat === 'fd'), s4 = Object.values(d.foldSections || {}).some(m => m && m.lam), s5 = has(s => s.lamBendGuide || s.foldFlat === 'fdu'), s3 = s4 || s5;
  return [s1, s2, s3, s4, s5];
}
/* ───────── ⓪ リングとリフィル（事業主 2026-10-23「２つ折りの断面図描画時にリフィルとリングが勝手に決まっている。どちらも断面図を決める前に情報として設定したい」「全てが手帳というわけではない。２つ折りか３つ折りを決定し…直前でリングとリフィルを決めて、断面図ボタンの流れがよい」）
   断面を作る前に、手帳（kind 'book'）か手帳ではない（'plain'）かを自分で決める。手帳なら、リフィルの規格 spec・リング内径 dia・束の厚み stack も（どれも最初は空で、勝手に決まらない）。
   図面に doc.foldBook として残す（図面ファイルと一緒に保存）。断面がすでにあって doc.foldBook が無いときは、断面の中身（doc.foldDesign.ring の有無）から読む。値は、金具カード・設計カードの今ある欄（binderSpecSel・ringD・fdStackT・fdRingOn）に写して使う。 ───────── */
const FOLD_BOOK_NONE = { kind: '', spec: '', dia: '', stack: '' };
function foldBookState() {
  const b = doc.foldBook, d = doc.foldDesign, str = v => typeof v === 'string' ? v.slice(0, 40) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  if (b && typeof b === 'object') return { kind: b.kind === 'book' || b.kind === 'plain' ? b.kind : '', spec: str(b.spec), dia: str(b.dia), stack: str(b.stack) };
  if (d) return d.ring ? { kind: 'book', spec: str(d.ring.specId), dia: str(d.ring.ringD), stack: str(d.ring.stackT) } : { kind: 'plain', spec: '', dia: '', stack: '' };
  return FOLD_BOOK_NONE;
}
const foldBookComplete = s => s.kind === 'plain' || (s.kind === 'book' && s.spec !== '' && s.dia !== '' && Number(s.stack) > 0);
/** 手帳か・規格・リング内径・束の厚みのどれかを変える。手帳でなくなるときは、規格などを空に戻す。そろったら、今ある欄に写す（断面があれば作り直す）。 */
function setFoldBook(patch) {
  const next = { ...foldBookState(), ...patch }; if (next.kind !== 'book') { next.spec = ''; next.dia = ''; next.stack = ''; }
  doc.foldBook = next; if (tabs[activeTab]) tabs[activeTab].dirty = true;
  if (foldBookComplete(next)) applyFoldBook(true);
  if ('spec' in patch && next.kind === 'book' && next.spec) applyPlanHeight();   /* リフィルの規格を選んだ・替えたとき：平面図の高さの初めの数字を決める */
  renderFoldFlow();   /* ⓪が決まったら①が「いまここ」になる・欄の表示も更新 */
}
/* ───────── 平面図の高さの初めの数字（事業主 2026-10-24「⓪で選んだリフィルの高さに余りを足して初期値にして。余りはどこで設定すればよい？」）：手帳（革）の高さ＝リフィルの高さ＋上下の余り×2。余り（片側）は⓪の欄で決める（初めは5mm・ブラウザに覚える）。
   決めるのは、規格を選んだとき・余りを変えたときだけ（①を押したときは、自分で直した高さを上書きしない） ───────── */
const FLAT_MARGIN_KEY = 'leather-cad.flatMargin';
let planHeightTouched = false;   /* 平面図の高さの欄を、自分で入力したか。まだなら、⓪が決まっている間は欄を「リフィル＋余り×2」にそろえる（開いた図面でも40のまま残らない・事業主 2026-10-24「リフィルを指定している場合は、リフィルの高さが自動で入力されてほしい」） */
function refillPlanHeight() { const s = foldBookState(), sp = s.kind === 'book' && s.spec ? binderSpec(s.spec) : null, h = sp?.refill?.hMm, m = Number($('flowMargin')?.value); return h > 0 && Number.isFinite(m) && m >= 0 && String($('flowMargin').value).trim() !== '' ? { h, m, v: Math.round((h + 2 * m) * 100) / 100 } : null; }
function applyPlanHeight() { const r = refillPlanHeight(); if (!r) return; planHeightTouched = false; $('fdH').value = String(r.v); if ($('flowH')) $('flowH').value = String(r.v); onFlatNumber('fdH'); renderFoldBook(); }
const FLAT_CORNER_KEY = 'leather-cad.flatCorner', FLAT_LAYOUT_KEY = 'leather-cad.flatLayout';
/** 平面図の角の丸め・菱目の並べ方：前回の値をブラウザに覚え、変えたら平面図を作りなおす。 */
const FLAT_PAPER_KEY = 'leather-cad.refillPaper', FLAT_DIMS_KEY = 'leather-cad.autoDims', FLAT_METAL_KEY = 'leather-cad.flatHwMetal', FLAT_LINK_KEY = 'leather-cad.foldLinkMove';
function initFlowPlanOptions() {
  let c = null, l = null, pp = null, ad = null; try { c = localStorage.getItem(FLAT_CORNER_KEY); l = localStorage.getItem(FLAT_LAYOUT_KEY); pp = localStorage.getItem(FLAT_PAPER_KEY); ad = localStorage.getItem(FLAT_DIMS_KEY); } catch { /* 読めなければ、初めの値 */ }
  if (ad === '0' || ad === '1') $('flowAutoDims').checked = ad === '1'; $('flowAutoDims').addEventListener('change', () => { try { localStorage.setItem(FLAT_DIMS_KEY, $('flowAutoDims').checked ? '1' : '0'); } catch { /* 保存できなくても続ける */ } foldFollowSoon(); });   /* 初めはオン（HTML の checked）。選びは覚える */
  $('flowRefillPaper').checked = pp === '1'; $('flowRefillPaper').addEventListener('change', () => { try { localStorage.setItem(FLAT_PAPER_KEY, $('flowRefillPaper').checked ? '1' : '0'); } catch { /* 保存できなくても続ける */ } foldFollowSoon(); });
  { let lk = null; try { lk = localStorage.getItem(FLAT_LINK_KEY); } catch { /* 読めなければ、いっしょに動く */ } if (lk === '0') $('flowLinkMove').checked = false; $('flowLinkMove').addEventListener('change', () => { try { localStorage.setItem(FLAT_LINK_KEY, $('flowLinkMove').checked ? '1' : '0'); } catch { /* 保存できなくても続ける */ } }); }   /* 断面を動かすとき、平面図もいっしょに動かすか（事業主 2026-10-25「断面図だけ動かせないのか？」）：初めはオン（2026-10-24 の指示どおり） */
  let hm = null; try { hm = localStorage.getItem(FLAT_METAL_KEY); } catch { /* 読めなければ、金属の色なし */ } if (['gold', 'silver', 'pinkgold', 'blackgold'].includes(hm)) $('flowHwMetal').value = hm;
  $('flowHwMetal').addEventListener('change', () => { try { localStorage.setItem(FLAT_METAL_KEY, $('flowHwMetal').value); } catch { /* 保存できなくても続ける */ } foldFollowSoon(); });   /* 平面図の金具の色（事業主 2026-10-25「リフィルの色をここで入れられるのなら、金具の色もここでいれられるようにしたい」） */
  if (c !== null && c !== '' && Number.isFinite(Number(c)) && Number(c) >= 0) $('flowCorner').value = c; if (l === 'rows' || l === 'loop' || l === 'none') $('flowStitchLayout').value = l;
  $('flowCorner').addEventListener('input', () => { const raw = String($('flowCorner').value).trim(); if (raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0) { try { localStorage.setItem(FLAT_CORNER_KEY, raw); } catch { /* 保存できなくても続ける */ } foldFollowSoon(); } });
  $('flowStitchLayout').addEventListener('change', () => { try { localStorage.setItem(FLAT_LAYOUT_KEY, $('flowStitchLayout').value); } catch { /* 保存できなくても続ける */ } foldFollowSoon(); });
}
function initFlowMargin() { let v = null; try { v = localStorage.getItem(FLAT_MARGIN_KEY); } catch { /* 読めなければ、5mm */ } $('flowMargin').value = v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? v : '5'; $('flowMargin').addEventListener('input', () => { const raw = String($('flowMargin').value).trim(); if (raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0) { try { localStorage.setItem(FLAT_MARGIN_KEY, raw); } catch { /* 保存できなくても続ける */ } applyPlanHeight(); } else renderFoldBook(); }); }
/** ⓪で決めた値を、リング・リフィルの今ある欄に写す。remake が真で断面がすでにあれば、断面を作り直す（断面が無いときは、まだ描かない＝①のボタンで作る）。そろっていなければ何もしない。 */
function applyFoldBook(remake) {
  const s = foldBookState(); if (!foldBookComplete(s)) return false;
  $('fdRingOn').checked = s.kind === 'book';
  if (s.kind === 'book') {
    $('binderSpecSel').value = s.spec; const sp = binderSpec(s.spec); if (sp) fillRingOptions($('ringD'), sp); $('ringD').value = s.dia; $('fdStackT').value = s.stack; syncFoldRingSelects();
    if (remake && doc.foldDesign) onBinderChange(); else { renderBinder(); resetSpineWire(); renderSpineSim(); renderTopSection(); }
  } else if (remake && doc.foldDesign) liveFoldDesign();
  return true;
}
/** ⓪の段の表示：選んだ種類・規格・リング内径・束の厚み。規格の一覧と、規格に合うリング内径の一覧は、表示するときだけ作り直す（入力中に欄を壊さない）。 */
function renderFoldBook(done = foldBookComplete(foldBookState())) {
  const kind = $('flowBook'); if (!kind) return;
  const s = foldBookState(), li = $('foldFlowBook'), tag = $('foldFlowBookState'), lang = document.documentElement.lang || 'ja';
  if (kind.value !== s.kind) kind.value = s.kind; $('flowBookRows').hidden = s.kind !== 'book';
  if (s.kind === 'book') {
    const spec = $('flowRingSpec'), dia = $('flowRingDia'), stack = $('flowStackT'), sp = s.spec ? binderSpec(s.spec) : null;
    if (spec.dataset.key !== lang) { spec.textContent = ''; fillBinderSpecOptions(spec, true); spec.dataset.key = lang; }
    const dkey = lang + '|' + (sp ? sp.id : ''); if (dia.dataset.key !== dkey) { fillRingOptions(dia, sp, true); dia.dataset.key = dkey; } dia.disabled = !sp;
    if (spec.value !== s.spec) spec.value = s.spec; if (dia.value !== s.dia) dia.value = s.dia; if (document.activeElement !== stack && stack.value !== s.stack) stack.value = s.stack;
  }
  { const note = $('flowHeightNote'), r = refillPlanHeight(); if (note) { const txt = r ? t('foldFlowHeightNote', { h: +r.h.toFixed(2), m: +r.m.toFixed(2), v: +r.v.toFixed(2) }) : ''; if (note.textContent !== txt) note.textContent = txt; if (r && !planHeightTouched) { const v = String(r.v), fh = $('flowH'); if ($('fdH').value !== v) $('fdH').value = v; if (fh && document.activeElement !== fh && fh.value !== v) fh.value = v; } } }   /* 平面図の高さの計算を、常に見せる */
  const v = done ? 'done' : 'now', text = t(done ? 'foldFlowDone' : 'foldFlowNow'); if (li && li.dataset.state !== v) li.dataset.state = v; if (tag && tag.textContent !== text) tag.textContent = text;
}
function renderFoldFlow() {
  const bi = foldIsBifold(), st = foldFlowStates(doc), bookDone = foldBookComplete(foldBookState()), shown = bi ? [0, 1, 4] : [0, 1, 2, 3, 4], now = bookDone ? (shown.find(i => !st[i]) ?? -1) : -1, marks = '①②③④⑤';   /* 2つ折りは、貼り合わせ検証（③④）を使わず ①断面→②平面→③展開。⓪を決めるまでは、「いまここ」は⓪ */
  const sel = $('flowFoldMode'), want = bi ? 'bifold' : 'trifold'; if (sel && sel.value !== want) sel.value = want;
  const setText = (id, text) => { const el = $(id); if (el && el.textContent !== text) el.textContent = text; };
  for (let i = 0; i < 5; i++) {
    const li = $('foldFlowStep' + (i + 1)), tag = $('foldFlowState' + (i + 1)); if (!li || !tag) continue;
    const v = st[i] ? 'done' : i === now ? 'now' : 'todo', text = v === 'done' ? t('foldFlowDone') : v === 'now' ? t('foldFlowNow') : ''; if (li.dataset.state !== v) li.dataset.state = v; if (tag.textContent !== text) tag.textContent = text;
    const k = shown.indexOf(i); if (k >= 0) setText('foldFlowNo' + (i + 1), marks[k]);
    if (bi && [0, 1, 4].includes(i)) { setText('foldFlowName' + (i + 1), t('foldFlowBiStep' + (i + 1))); setText('foldFlowText' + (i + 1), t('foldFlowBiText' + (i + 1))); }
    else { setText('foldFlowName' + (i + 1), t('foldFlowStep' + (i + 1))); setText('foldFlowText' + (i + 1), t('foldFlowText' + (i + 1))); }
  }
  setText('flowOpenDesign', t(bi ? 'foldFlowBiOpenDesign' : 'foldFlowOpenDesign')); setText('flowMake', t(bi ? 'foldFlowBiMake' : 'fdMake'));   /* 2つ折りにはボタン線が無いので、「（ボタン線から）」を付けない */
  renderFoldBook(bookDone);
  { const fh = $('flowH'), src = $('fdH'); if (fh && src && document.activeElement !== fh && fh.value !== src.value) fh.value = src.value; }   /* ②の高さの欄＝設計カードの欄 */
  applyFlowFold();
}
/* ───────── 折りの小窓：必要なカードだけ開く（事業主 2026-10-24「①～③までを折りたたんで必要なカードだけ表示すればよくないか？」）。「いまここ」のカードを開き、ほかは見出し1行に畳む。
   見出しを押すと、そのカードだけ開け閉めできる（手順が進むまで有効）。欄に入力しているカードは、自動では閉じない ───────── */
const FLOW_CARDS = ['foldFlowBook', 'foldFlowStep1', 'foldFlowStep2', 'foldFlowStep3', 'foldFlowStep4', 'foldFlowStep5'], flowOpenOverride = new Map(); let flowOpenNowId = '';
function applyFlowFold() {
  const cards = FLOW_CARDS.filter(id => $(id)), nowId = cards.find(id => $(id).dataset.state === 'now') ?? '';
  if (nowId !== flowOpenNowId) { flowOpenNowId = nowId; flowOpenOverride.clear(); }   /* 手順が進んだら、手で開け閉めした分は戻し、いまここのカードが開く */
  const ae = document.activeElement, typing = ae && ['INPUT', 'SELECT', 'TEXTAREA'].includes(ae.tagName);
  for (const id of cards) {
    const li = $(id), typed = !!(typing && li.contains?.(ae)), open = flowOpenOverride.has(id) ? flowOpenOverride.get(id) : id === nowId || typed, v = open ? '1' : '0';
    if (li.dataset.open !== v) li.dataset.open = v; li.querySelector?.('.flow-head')?.setAttribute?.('aria-expanded', open ? 'true' : 'false');
  }
}
function toggleFlowCard(id) { const li = $(id); if (!li) return; flowOpenOverride.set(id, li.dataset.open !== '1'); applyFlowFold(); }
function initFlowFold() {
  for (const id of FLOW_CARDS) { const head = $(id)?.querySelector?.('.flow-head'); if (!head) continue; head.tabIndex = 0; head.setAttribute('role', 'button'); head.addEventListener('click', () => toggleFlowCard(id)); head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFlowCard(id); } }); }
}
/* ───────── 曲げの範囲の確認（事業主「リング外径で来ます線なので合っているかわからない」→ 選択 A「表と文字」）：曲げごとに、表・裏の曲げの長さ（点線の間）と、リング外径（欄に入っていれば）に必要な裏の曲げ・リングの隙間・入る／入らない。返り値：{ rows:[{ k, o, i, need, gap, ok }], ringD } ───────── */
function bendGuideInfo(po, pi, axis, specs) {
  if (!lamTouched.o) laminateThickFromPart('o'); if (!lamTouched.i) laminateThickFromPart('i');
  const tO = Number($('lamTOuter').value), tI = Number($('lamTInner').value), ringRaw = String($('lamRingD').value ?? '').trim(), ringD = ringRaw === '' ? 0 : Number(ringRaw), rows = specs.outer.bends.map((o, k) => ({ k: k + 1, o, i: specs.inner.bends[k], need: null, gap: null, ok: null })); let ring = null;
  if (tO > 0 && tI > 0 && ringD > 0) { const plan = foldStackPlan({ outer: specs.outer, inner: specs.inner, tO, tI, base: $('lamBase').value === 'inner' ? 'inner' : 'outer', angleMode: 'data' }); if (plan.ok) { ring = foldRingCheck(plan, { ringD, tO, tI, pitch: lamPitchValue() }); if (ring) ring.gaps.forEach((g, k) => { rows[k].need = ring.needs[k].inner; rows[k].gap = g.gap; rows[k].ok = g.ok; }); } }
  return { rows, ringD: ring ? ringD : 0 };
}
/** 曲げの範囲の確認の行（結果欄用）：[{ text, cls }]。リング外径が使えるときは先頭に見出し。 */
function bendGuideLines(info) {
  const f2 = v => (+v).toFixed(2), out = []; if (info.ringD > 0) out.push({ text: t('lamBendReportHead', { d: String(+info.ringD.toFixed(2)) }), cls: '' });
  for (const r of info.rows) out.push(r.need == null ? { text: t('lamBendReportPlain', { k: r.k, o: f2(r.o), i: f2(r.i) }), cls: '' } : { text: t('lamBendReportRing', { k: r.k, o: f2(r.o), i: f2(r.i), need: f2(r.need), gap: r.gap.toFixed(1), fit: t(r.ok ? 'lamBendFitOk' : 'lamBendFitNg') }), cls: r.ok ? 'lam-ok' : 'lam-warn' });
  return out;
}
/* ───────── 曲げの範囲の点線（事業主の希望 2026-10-19「展開したときに曲げの範囲を６本の点線で表示して」）：表・裏の部品それぞれに、曲げ2か所×（始め・まん中・終わり）＝6本をガイド層へ。前回の線は置き換える。commit の中で呼ぶ。返り値：{ o, i }（入れた本数） ───────── */
function placeBendGuides(po, pi, axis, specs, info = null) {
  const f2 = v => (+v).toFixed(2), g = lamBendGuides(doc, po.id, pi.id, { axis, specs, label: (side, k, len, need) => { const l1 = t('lamBendLabel', { k, len: f2(len) }); return need != null ? [l1, t('lamBendLabelNeed', { need: f2(need) })] : [l1]; }, needInner: info && info.ringD > 0 ? info.rows.map(r => r.need) : null }); if (!g.ok) return { o: 0, i: 0 };
  const prefix = `${po.id}:${pi.id}:`; doc.shapes = doc.shapes.filter(s => !((typeof s.lamBendGuide === 'string' && s.lamBendGuide.startsWith(prefix)) || (typeof s.lamBendLabel === 'string' && s.lamBendLabel.startsWith(prefix))));   /* 前回の線・文字を置き換える */
  const layer = ensureLayer(doc, 'guide'), added = []; for (const l of [...g.outer, ...g.inner, ...g.labels.outer, ...g.labels.inner]) added.push({ ...l, layer, id: freshId([...doc.shapes, ...added], 's') }); doc.shapes.push(...added); return { o: g.outer.length, i: g.inner.length };
}
/** 展開が飛ばされた（円が無い）ときも、曲げの範囲の点線だけは入れる（整える用）。結果欄には足して書く（空にしない）。曲げの範囲が見つからなければ何もしない。 */
function placeBendGuidesOnly() {
  const box = $('lamResult'); fillLaminateParts(); const po = doc.parts.find(p => p.id === $('lamOuter').value), pi = doc.parts.find(p => p.id === $('lamInner').value); if (!po || !pi || po === pi) return;
  const axisSel = $('lamAxis').value, bx = partBox(doc, po), axis = axisSel === 'x' || axisSel === 'y' ? axisSel : (bx && bx.maxY - bx.minY > bx.maxX - bx.minX ? 'y' : 'x'), rimZ = lamRimBendZones(doc, po.id, pi.id, { axis }), specs = {};
  for (const [side, part] of [['outer', po], ['inner', pi]]) { const r = lamFoldSpec(doc, part, { axis, rim: rimZ.ok ? rimZ[side] : null }); if (!r.ok) return; specs[side] = r; }
  const gInfo = bendGuideInfo(po, pi, axis, specs), add = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); };
  let gc = null; commit(() => { gc = placeBendGuides(po, pi, axis, specs, gInfo); }); if (gc?.o) { add(t('lamGuideDone', { o: gc.o, i: gc.i })); bendGuideLines(gInfo).forEach(r => add(r.text, r.cls)); }
}
/* ───────── 展開：ボタンの穴を、表と裏でそろえる（事業主の選択 2026-10-19・案A＋「折りが約100〜120°になってもボタン位置が合えば大丈夫」）。基準の部品の円を、もう一方の部品の「貼り合わせたとき重なる位置」に足す・動かす ───────── */
function unfoldButtons() {
  const box = $('lamResult'); box.textContent = '';
  const line = (text, cls) => { const d = document.createElement('div'); d.textContent = text; if (cls) d.className = cls; box.appendChild(d); }, fail = (key, p) => { const m = t(key, p); line(m, 'lam-error'); $('hint').textContent = m; }, sideName = k => t(k === 'outer' ? 'lamSideOuter' : 'lamSideInner');
  if (doc.parts.length < 2) { fail('lamNeedParts'); return; }
  fillLaminateParts(); const po = doc.parts.find(p => p.id === $('lamOuter').value), pi = doc.parts.find(p => p.id === $('lamInner').value); if (!po || !pi || po === pi) { fail('lamErr_pickTwo'); return; }
  const axisSel = $('lamAxis').value, bx = partBox(doc, po), axis = axisSel === 'x' || axisSel === 'y' ? axisSel : (bx && bx.maxY - bx.minY > bx.maxX - bx.minX ? 'y' : 'x');
  const rimZ = lamRimBendZones(doc, po.id, pi.id, { axis }), specs = {};   /* 曲げの区間（平ら・丸折り）：縦の点線 → 外周の菱の線 → 穴 の順 */
  for (const [side, part] of [['outer', po], ['inner', pi]]) { const r = lamFoldSpec(doc, part, { axis, rim: rimZ.ok ? rimZ[side] : null }); if (!r.ok) { fail('lamSecErr_' + r.error, { side: sideName(side), n: r.count ?? 0 }); return; } specs[side] = r; }
  const baseOuter = $('lamBase').value !== 'inner', [bp, op] = baseOuter ? [po, pi] : [pi, po], plan = lamButtonPlan(doc, bp.id, op.id, { axis, specs: { base: baseOuter ? specs.outer : specs.inner, other: baseOuter ? specs.inner : specs.outer } });
  if (!plan.ok) { fail('lamUnfoldErr_' + plan.error); return; }
  const srcOf = id => doc.shapes.find(q => q.id === id), blocked = [...plan.adds.map(a => srcOf(a.from)), ...plan.moves.map(m => srcOf(m.id))].filter(q => q && !editable(q)).length; if (blocked) { fail('lamUnfoldErr_locked', { n: blocked }); return; }
  const gInfo = bendGuideInfo(po, pi, axis, specs); let gc = null; commit(() => {   /* 円の変更が無くても、曲げの範囲の点線は入れ直す（変わらなければ記録は増えない） */
    for (const m of plan.moves) { const q = doc.shapes.find(x => x.id === m.id); if (q) { q.cx = m.x; q.cy = m.y; } }
    const added = []; for (const a of plan.adds) { const src = srcOf(a.from), id = freshId([...doc.shapes, ...added], 's'); added.push({ ...src, id, cx: a.x, cy: a.y }); op.shapeIds.push(id); }   /* 足す円は、基準の円の複製（半径・層・色はそのまま）。部品にも入れる */
    doc.shapes.push(...added);
    gc = placeBendGuides(po, pi, axis, specs, gInfo);
  });
  const done = t('lamUnfoldDone', { s: plan.same.length, m: plan.moves.length, a: plan.adds.length }); line(done); $('hint').textContent = done;
  line(t('lamUnfoldNote', { base: sideName(baseOuter ? 'outer' : 'inner'), other: sideName(baseOuter ? 'inner' : 'outer') })); if (gc?.o) { line(t('lamGuideDone', { o: gc.o, i: gc.i })); bendGuideLines(gInfo).forEach(r => line(r.text, r.cls || undefined)); } rebuildSnaps(); draw();
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
  if (r.mode === 'zones') { line(t(r.zoneSource === 'given' ? 'lamZonesGiven' : r.zoneSource === 'rim' ? 'lamZonesRim' : r.zoneSource === 'holes' ? 'lamZonesHoles' : 'lamZonesAuto', { n: r.zones.length })); r.zones.forEach((z, k) => line(t('lamZoneLine', { k: k + 1, a: f2(z.a), b: f2(z.b), deg: z.thetaDeg.toFixed(1), r: f2(z.radius), li: f2(z.lenInner) }))); } else if (b.curl !== 'none') line(t('lamZonesNone'));
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
/** パッチワークの「基準ピッチ」欄を、選んでいる穴の工具のピッチに合わせる（事業主 2026-10-23「1辺3.95mm（選択した菱目工具）」：欄が 4 のまま、工具の 3.95 と食い違い、丸目が 4mm 間隔で打たれていた）。工具を替えたときだけ合わせ、欄に打った値は、工具が同じ間は残す。 */
let patchPitchToolId = null;
function syncPatchPitch() { const tool = stitchToolCurrent(); if (!tool || !(tool.pitch > 0)) return; patchPitchToolId = tool.id; $('patchPitch').value = String(tool.pitch); }
function placeHoles(saved, route, points, tool, depth = null) {   /* depth 'half'＝駒合わせの B（コバ側）の穴。半分の深さ（貫通させない） */
  for (const p of points) { const id = freshId(doc.holes, 'h'); doc.holes.push({ id, pathId: saved.id, s: p.s, x: p.x, y: p.y, angleDeg: ($('followTangent').checked ? p.angleDeg : 0) + slantOf(tool), toolId: tool.id, mark: 'tool', ...(depth ? { depth } : {}) }); }
  saved.segments = [{ from: 0, to: arcLength(route), toolId: tool.id, pitch: tool.pitch, mode: 'variable' }];
}
let komaSeam = null, komaSeamPicking = false, komaSeamAt = null, lastKoma = null;   /* 継ぎ目（帯の始点）の指定：{ key（曲線側の縫い線の図形 id）, s（その縫い線の上の弧長）, x, y }／指定中か／画面の印／直前の曲面の駒合わせ（作り直し用）*/
function komaClick(p) {
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distTo(s, p) <= 7 / scale); if (!hit) return;
  const state = routeForHit(hit); if (!state?.route) return;
  if (komaSeamPicking) { komaSeamPickAt(state, p); return; }
  if (stage?.kind !== 'koma') { const n = doc.holes.filter(h => h.pathId === state.saved.id).length; stage = { kind: 'koma', a: state }; selected = new Set([hit.id]); $('hint').textContent = n ? t('komaSecondFrom', { n }) : t('komaSecond'); draw(); return; }
  if (state.saved.shapeIds.join() === stage.a.saved.shapeIds.join()) return;
  komaFinish(stage.a, state, hit);
}
/** 駒合わせの2回目のクリック以降（A の状態・B の状態・B のクリックした図形）。継ぎ目を指定したあとの作り直しからも呼ぶ。 */
function komaFinish(aState, state, hit) {
  const holesOf = side => doc.holes.filter(h => h.pathId === side.saved.id), ha = holesOf(aState), hb = holesOf(state);
  { const infoA = komaOutlineOf(aState), infoB = komaOutlineOf(state); if (!!infoA?.curved !== !!infoB?.curved) { const done = komaByOutline(aState, state, ha, hb, infoA?.curved ? infoA : infoB, !!infoA?.curved); if (done) { stage = null; return; } } }   /* 曲面（円柱の上面・小判型など）と帯：帯の穴を輪郭に沿って写す（長さの割合で均さない） */
  if (!!ha.length !== !!hb.length) { const [src, dst] = ha.length ? [aState, state] : [state, aState]; stage = null; komaCopy(src, dst, ha.length ? 'A' : 'B', ha.length ? 'B' : 'A'); return; } /* 片方だけ目打ちがある：それは残して、もう片方に同じ数を写す */
  const tool = stitchToolCurrent(); if (!tool) return;
  const a = aState, b = state, both = !!ha.length && !!hb.length, opts = { prefer: $('komaPrefer').value, marginStart: Number($('offsetStart').value) || 0, marginEnd: Number($('offsetEnd').value) || 0, tolerancePct: Number($('patchTol').value) || 15 };
  const result = matchRoutes(a.route, b.route, tool.pitch, opts); stage = null;
  if (!result.holesA.length) { $('hint').textContent = t('impossible'); draw(); return; }
  commit(() => {
    for (const side of [a, b]) { if (side.fresh) { side.saved.id = freshId(doc.paths, 'p'); doc.paths.push(side.saved); side.fresh = false; } doc.holes = doc.holes.filter(h => h.pathId !== side.saved.id); }
    placeHoles(a.saved, a.route, result.holesA, tool); placeHoles(b.saved, b.route, result.holesB, tool, 'half');   /* B（2回目にクリックした線＝コバ側）の穴は半分の深さ。A（面側）は貫通 */
    selected = new Set([hit.id, ...a.saved.shapeIds]);
  });
  pairLines = result.pairs.map(pr => [result.holesA[pr.a], result.holesB[pr.b]]);
  $('hint').textContent = (result.warn ? t('komaWarn', { n: result.holesA.length, pct: Math.max(...result.segments.map(s => s.diffPct)).toFixed(1) }) : t('komaDone', { n: result.holesA.length, pa: result.segments[0].pitchA.toFixed(2), pb: result.segments[0].pitchB.toFixed(2) })) + (both ? ' ' + t('komaBoth') : '') + ' ' + t('komaHalfNote');
  draw();
}
/** 継ぎ目（帯の始点）の位置を、曲線側の縫い線の上のクリックで指定する。直前の駒合わせ（曲面）の曲線側ならすぐ作り直し、そうでなければ次の駒合わせに使う。 */
function komaSeamPickAt(state, p) {
  const info = komaOutlineOf(state); if (!info?.curved) { $('hint').textContent = t('komaSeamNeedCurve'); draw(); return; }   /* まっすぐな線では指定できない（指定中のまま・もう一度クリックできる） */
  const q = projectOnPath(state.route, p), at = pointAtLength(state.route, q.s), key = state.saved.shapeIds.join();
  komaSeam = { key, s: q.s, x: at.x, y: at.y }; komaSeamPicking = false; syncKomaBar();
  if (komaRedo(key)) { $('hint').textContent = t('komaSeamRedone') + ' ' + $('hint').textContent; return; }
  $('hint').textContent = t('komaSeamSet'); selected = new Set(state.saved.shapeIds); draw();
}
/** 直前の駒合わせ（曲面）の曲線側が key で、A・B の両方に穴が残っていれば、同じ A・B でもう一度駒合わせ（継ぎ目の指定・解除の反映）。作り直したら true。 */
function komaRedo(key) {
  const last = lastKoma; if (!last || last.key !== key || !pairLines.length || komaSeamAt?.pl !== pairLines) return false;
  const sa = doc.shapes.find(sh => sh.id === last.aId), sb = doc.shapes.find(sh => sh.id === last.bId), pa = sa && doc.paths.find(pp => pp.shapeIds.includes(sa.id)), pb = sb && doc.paths.find(pp => pp.shapeIds.includes(sb.id));
  if (!pa || !pb || !doc.holes.some(h => h.pathId === pa.id) || !doc.holes.some(h => h.pathId === pb.id)) return false;
  const a = routeForHit(sa), b = routeForHit(sb); if (!a?.route || !b?.route) return false; komaFinish(a, b, sb); return true;
}
function komaSeamClearAll() { const key = komaSeam?.key; komaSeam = null; komaSeamPicking = false; syncKomaBar(); if (key && komaRedo(key)) { $('hint').textContent = t('komaSeamCleared') + ' ' + $('hint').textContent; return; } $('hint').textContent = t('komaSeamCleared'); draw(); }
/** 駒合わせ（曲面）：縫い線が、実線で囲まれた革の輪郭から一定の距離だけ内側の線なら { outline（輪郭の点列）, margin（距離）, curved（曲線がある・または閉じている） } を返す。まっすぐな線や、囲みの中に無い線は null。 */
function komaOutlineOf(side) {
  const route = side.route, len = arcLength(route); if (!(len > 1e-6) || !route.items?.length) return null;
  const own = new Set(side.saved.shapeIds), regions = closedRegions(doc.shapes.filter(sh => visible(sh) && stitchable(sh) && !sh.holeLink && !own.has(sh.id)), 0.01);   /* 実線で囲まれた革（縫い線そのものは除く） */
  const samples = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => pointAtLength(route, len * f));
  const region = regions.filter(r => samples.every(q => insidePolygon(q, r.points))).sort((x, y) => x.area - y.area)[0]; if (!region) return null;
  const d = insetDistance(route, region.points); if (!d || d.margin < 0.3 || d.spread > Math.max(0.6, d.margin * 0.3)) return null;   /* 一定の距離で内側に寄せた線でなければ使わない */
  return { outline: region.points, margin: d.margin, curved: !!route.closed || route.items.some(it => it.shape.type !== 'line') || routeBreaks(route).length > 0 };   /* 曲線側＝閉じている・曲線を含む・角で折れている（名刺入れの側面の U 字）。1本のまっすぐな線は帯の側 */
}
/** 駒合わせ（曲面）：曲線側（円柱の上面・小判型・側面の U 字など＝輪郭の内側の縫い線）と、まっすぐな側（帯）。帯の穴は等間隔のまま、曲線側は帯の各穴を輪郭に沿って写す（直線部は同じ間隔・曲線部は狭く）。
 *  どちらにも目打ちが無ければ、「優先」の側（両方を均す＝まっすぐな側）を工具のピッチで等間隔にしてから写す。片方にだけあれば、それを残して写す。両方にあれば作り直す。
 *  curvedIsA＝1回目にクリックした線（A）が曲線側か。B（2回目）の穴は半分の深さ。帯の長さが輪郭の対応部分と 3% より違えば案内する。できなければ false（従来の方式に任せる）。 */
function komaByOutline(a, b, ha, hb, info, curvedIsA) {
  const curved = curvedIsA ? a : b, flat = curvedIsA ? b : a, map0 = outlineMap(curved.route, info.outline); if (!map0) return false;
  const lenFlat = arcLength(flat.route), lenCurved = arcLength(curved.route), tool = stitchToolCurrent(); if (!tool || !(lenFlat > 1e-6)) return false;
  const seamOn = !!komaSeam && komaSeam.key === curved.saved.shapeIds.join(), map = seamOn ? withSeam(map0, komaSeam.s, lenFlat, !!curved.route.closed) : map0;   /* 継ぎ目を指定してあれば、帯の始点をそこに当てる（指定が無ければ、縫い線の始点） */
  const hc = curvedIsA ? ha : hb, hf = curvedIsA ? hb : ha, both = !!hc.length && !!hf.length, srcKey = $('komaPrefer').value;
  let srcSide, srcS, srcAngles = null;   /* 写す元（距離の一覧）と写し先 */
  if (!!hc.length !== !!hf.length) { const list = (hc.length ? hc : hf).slice().sort((x, y) => x.s - y.s); srcSide = hc.length ? 'curved' : 'flat'; srcS = list.map(h => h.s); srcAngles = list; }
  else {
    srcSide = srcKey === 'A' ? (curvedIsA ? 'curved' : 'flat') : srcKey === 'B' ? (curvedIsA ? 'flat' : 'curved') : 'flat';   /* 両方を均す＝まっすぐな側をピッチどおりに */
    const route = srcSide === 'flat' ? flat.route : curved.route, len = srcSide === 'flat' ? lenFlat : lenCurved, ms = Number($('offsetStart').value) || 0, me = Number($('offsetEnd').value) || 0;
    if (route.closed || (srcSide === 'flat' && curved.route.closed)) { const n = Math.max(1, Math.round(len / tool.pitch)); srcS = Array.from({ length: n }, (_, k) => len * k / n); }   /* 閉じた経路、または閉じた曲線に巻く帯：始点と終点は同じ穴なので、終点の穴は置かない（余白も無し） */
    else { const usable = len - ms - me; if (!(usable > 1e-6)) { $('hint').textContent = t('impossible'); draw(); return true; } const n = Math.max(1, Math.round(usable / tool.pitch)); srcS = Array.from({ length: n + 1 }, (_, k) => ms + usable * k / n); }
  }
  const dstS = srcS.map(v => srcSide === 'flat' ? map.toInset(v, lenFlat) : map.toOther(v, lenFlat));
  const srcRoute = srcSide === 'flat' ? flat.route : curved.route, dstRoute = srcSide === 'flat' ? curved.route : flat.route, srcSaved = srcSide === 'flat' ? flat.saved : curved.saved, dstSaved = srcSide === 'flat' ? curved.saved : flat.saved;
  const dstIsB = srcSide === 'flat' ? !curvedIsA : curvedIsA;   /* 写し先が B（2回目にクリックした線）か：写し先が曲線側なら A が曲線でないとき、写し先がまっすぐな側なら A が曲線のとき */
  const madeSrc = [], madeDst = [];
  commit(() => {
    for (const side of [a, b]) { if (side.fresh) { side.saved.id = freshId(doc.paths, 'p'); doc.paths.push(side.saved); side.fresh = false; } }
    if (!srcAngles) doc.holes = doc.holes.filter(h => h.pathId !== srcSaved.id);   /* 作り直し（両方に穴があった・どちらにも無い）：元の側も置き直す */
    doc.holes = doc.holes.filter(h => h.pathId !== dstSaved.id);
    srcS.forEach((v, i) => {
      const q = pointAtLength(dstRoute, dstS[i]), base = srcAngles ? srcAngles[i] : null, srcTan = pointAtLength(srcRoute, v).angleDeg;
      const ang = base ? ((base.angleDeg - srcTan + q.angleDeg) % 360 + 360) % 360 : ($('followTangent').checked ? q.angleDeg : 0) + slantOf(tool);
      const nh = { id: freshId(doc.holes, 'h'), pathId: dstSaved.id, s: dstS[i], x: q.x, y: q.y, angleDeg: ang, toolId: base ? base.toolId : tool.id, mark: 'tool', ...(dstIsB ? { depth: 'half' } : {}) }; doc.holes.push(nh); madeDst.push(nh);
      if (!srcAngles) { const qs = pointAtLength(srcRoute, v), sh = { id: freshId(doc.holes, 'h'), pathId: srcSaved.id, s: v, x: qs.x, y: qs.y, angleDeg: ($('followTangent').checked ? qs.angleDeg : 0) + slantOf(tool), toolId: tool.id, mark: 'tool', ...(!dstIsB ? { depth: 'half' } : {}) }; doc.holes.push(sh); madeSrc.push(sh); }
      else { const h = srcAngles[i]; if (!dstIsB) h.depth = 'half'; else delete h.depth; madeSrc.push(h); }
    });
    for (const [saved, route] of [[srcSaved, srcRoute], [dstSaved, dstRoute]]) saved.segments = [{ from: 0, to: arcLength(route), toolId: tool.id, pitch: tool.pitch, mode: 'variable' }];
    selected = new Set([...a.saved.shapeIds, ...b.saved.shapeIds]);
  });
  pairLines = madeSrc.map((h, i) => [{ x: h.x, y: h.y }, { x: madeDst[i].x, y: madeDst[i].y }]);
  { const q = pointAtLength(curved.route, map.toInset(0, lenFlat)); komaSeamAt = { x: q.x, y: q.y, pl: pairLines }; lastKoma = { aId: a.saved.shapeIds[0], bId: b.saved.shapeIds[0], key: curved.saved.shapeIds.join() }; }   /* 帯の始点が当たる位置の印と、作り直し用の覚え */
  const gapsOf = list => { const ss = list.map(h => h.s).sort((x, y) => x - y); const g = ss.slice(1).map((v, i) => v - ss[i]); return g.length ? { min: Math.min(...g), max: Math.max(...g) } : { min: 0, max: 0 }; };
  const gf = gapsOf(srcSide === 'flat' ? madeSrc : madeDst), gc = gapsOf(srcSide === 'flat' ? madeDst : madeSrc), n = madeDst.length, pct = Math.abs(lenFlat - map.lenPart) / Math.max(1e-6, map.lenPart) * 100;
  $('hint').textContent = t('komaOutlineDone', { n, flat: curvedIsA ? 'B' : 'A', curved: curvedIsA ? 'A' : 'B', pf: gf.max.toFixed(2), cmin: gc.min.toFixed(2), cmax: gc.max.toFixed(2) }) + (both ? ' ' + t('komaBoth') : '') + (pct > 3 ? ' ' + t('komaLenWarn', { flat: curvedIsA ? 'B' : 'A', lf: lenFlat.toFixed(1), lo: map.lenPart.toFixed(1), pct: pct.toFixed(1) }) : '') + ' ' + t(seamOn ? 'komaSeamNoteSet' : 'komaSeamNote') + ' ' + t('komaHalfNote');
  draw(); return true;
}
/** 駒合わせで、片方（src）の目打ちはそのまま残して、もう片方（dst）に同じ数を写す。位置は長さの割合（曲がり角の数が同じなら角ごと）、向きは線に対する傾きのまま。 */
function komaCopy(src, dst, from, to) {
  const holes = doc.holes.filter(h => h.pathId === src.saved.id).sort((p, q) => p.s - q.s), map = mapHoleDistances(src.route, dst.route, holes.map(h => h.s)), made = [];
  commit(() => {
    if (dst.fresh) { dst.saved.id = freshId(doc.paths, 'p'); doc.paths.push(dst.saved); dst.fresh = false; }
    holes.forEach((h, i) => {
      const q = pointAtLength(dst.route, map.s[i]), srcTan = pointAtLength(src.route, h.s).angleDeg, tan = q.angleDeg + (map.reversed ? 180 : 0), nh = { ...h, id: freshId(doc.holes, 'h'), pathId: dst.saved.id, s: map.s[i], x: q.x, y: q.y, angleDeg: ((h.angleDeg - srcTan + tan) % 360 + 360) % 360 };
      if (to === 'B') nh.depth = 'half'; else delete nh.depth;   /* B（2回目にクリックした線＝コバ側）の穴は半分の深さ */
      doc.holes.push(nh); made.push(nh);
    });
    for (const h of holes) { if (from === 'B') h.depth = 'half'; else delete h.depth; }   /* 残した側も、役（A＝貫通・B＝半分）に合わせる */
    const tool = doc.tools.find(x => x.id === holes[0].toolId); dst.saved.segments = [{ from: 0, to: arcLength(dst.route), toolId: holes[0].toolId, pitch: tool?.pitch ?? 0, mode: 'variable' }];
    selected = new Set([...dst.saved.shapeIds]);
  });
  pairLines = holes.map((h, i) => [{ x: h.x, y: h.y }, { x: made[i].x, y: made[i].y }]);
  const gap = list => list.length > 1 ? (Math.max(...list.map(h => h.s)) - Math.min(...list.map(h => h.s))) / (list.length - 1) : 0; /* 穴の間隔の平均 */
  $('hint').textContent = t('komaCopied', { from, to, n: holes.length, pa: gap(holes).toFixed(2), pb: gap(made).toFixed(2) }) + ' ' + t('komaHalfNote');
  draw();
}
/** 駒合わせの縫い線：選んだ辺（直線・つながった線・閉じた図形）から「縁からの距離」だけ革の内側へ、点線（ガイド層・黄）の縫い線を作る。
 *  本体（面側・貫通）も側面（コバ側・半分の深さ）も、面の上・突き合わせる辺から同じ距離（事業主決定 2026-10-28：名刺入れの実図面は両方 2.5mm。以前の「B の厚み/2・B は辺そのもの」は誤り）。
 *  内側＝±距離の2候補のうち、中点が実線で囲まれた革の中に入る側。両方とも中・外で決められないときは、閉じた図形は内側、開いた線は曲がりの内側（まっすぐなら進行方向の右）にして案内する。 */
function makeKomaLines() {
  const margin = Number($('komaMargin').value); if (!(margin > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const ids = selectedShapeIds(), pool = doc.shapes.filter(s => ids.has(s.id) && visible(s) && editable(s) && stitchable(s) && !s.holeLink && !s.markOf && !['text', 'dimension', 'image'].includes(s.type));
  if (!pool.length) { $('hint').textContent = t('komaSelNeed'); return; }
  const regions = closedRegions(doc.shapes.filter(s => visible(s) && stitchable(s) && !s.holeLink), 0.01);   /* 実線で囲まれた革（点線は囲みに使わない） */
  const midOf = r => { if (!r) return null; if (r.type === 'line') return { x: (r.x1 + r.x2) / 2, y: (r.y1 + r.y2) / 2 }; if (r.points?.length > 1) { const i = Math.floor(r.points.length / 2); return { x: (r.points[i - 1].x + r.points[i].x) / 2, y: (r.points[i - 1].y + r.points[i].y) / 2 }; } try { return pointAtLength(r, arcLength(r) / 2); } catch { return null; } };
  const inside = p => !!p && regions.some(rg => insidePolygon(p, rg.points));
  const used = new Set(), results = []; let unsure = 0, failed = 0;
  for (const src of pool) {
    if (used.has(src.id)) continue; const sel = offsetSpan(pool, src, null, true); if (!sel) { failed++; continue; } for (const id of sel.shapeIds) used.add(id);
    const bend = sel.closed ? 0 : bendInnerSign(sel.points), guess = sel.closed ? -margin : (bend ? -bend : -1) * margin;   /* 既定：閉じた図形は内側・曲がった線は曲がりの内側 */
    const cand = [-margin, margin].map(v => ({ v, r: offsetSpanResult(sel, v, { join: 'miter' }) })).filter(c => c.r); if (!cand.length) { failed++; continue; }
    const ins = cand.filter(c => inside(midOf(c.r))); let pick;
    if (ins.length === 1) pick = ins[0]; else { pick = cand.find(c => c.v === guess) || cand[0]; if (!sel.closed) unsure++; }
    results.push({ r: pick.r, src });
  }
  if (!results.length) { $('hint').textContent = t('impossible'); return; }
  const dest = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || results[0].src.layer;
  cancel(); commit(() => { selected = new Set(); for (const { r } of results) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...r, id, layer: dest, color: 'yellow', lineStyle: 'dashed' }); selected.add(id); } });
  $('hint').textContent = t('komaLinesMade', { n: results.length, d: margin }) + (unsure ? ' ' + t('komaSideUnsure') : '') + (failed ? ' ' + t('offsetSelFailed', { k: failed }) : ''); draw();
}
/** 駒合わせの小窓（縁からの距離・優先・縫い線を作る）は、駒合わせのツールの間だけ出す。 */
function syncKomaBar() { const bar = $('komaBar'); if (bar) bar.hidden = mode !== 'koma'; if (mode !== 'koma') komaSeamPicking = false; const pick = $('komaSeamPick'), clr = $('komaSeamClear'); if (pick) { pick.textContent = t(komaSeamPicking ? 'komaSeamPicking' : komaSeam ? 'komaSeamPickAgain' : 'komaSeamPick'); pick.classList?.toggle?.('active', !!komaSeamPicking); } if (clr) clr.hidden = !komaSeam; }
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
    const toolIdOf = new Map(); for (const h of doc.holes) if (!toolIdOf.has(h.pathId)) toolIdOf.set(h.pathId, h.toolId);   /* いまの穴の種類を覚える（縫い合わせの丸ギリを、使用中の菱目に変えない） */
    doc.holes = doc.holes.filter(h => !pathIds.has(h.pathId));
    for (const [pathId, points] of result.holesByPath) { const saved = doc.paths.find(p => p.id === pathId); const route = resolvePath(doc, saved), own = doc.tools.find(x => x.id === toolIdOf.get(pathId)); if (route) placeHoles(saved, route, points, { ...(own || tool), pitch }); }
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
/** 外周の穴（rim の印のある経路の穴。印が無い古い図面は、選んでいる穴）のうち、パッチの境目（見えている実線）にかかっているもの。かかる＝穴の中心から実線までが、穴の大きい方の寸法の半分＋0.3mm 未満。 */
function rimBoundaryProblems() {
  const rimIds = new Set(doc.paths.filter(q => q.rim).map(q => q.id)), rimHoles = rimIds.size ? doc.holes.filter(h => rimIds.has(h.pathId)) : doc.holes.filter(h => selected.has(h.id));
  const bad = [], cache = new Map();
  for (const h of rimHoles) {
    const tl = doc.tools.find(x => x.id === h.toolId); if (!tl) continue; const r = patchHoleClearR(tl), key = r.toFixed(3);
    if (!cache.has(key)) cache.set(key, patchObstacles(r));
    if (cache.get(key).some(o => h.x >= o.minX && h.x <= o.maxX && h.y >= o.minY && h.y <= o.maxY && distToShape(o.s, h) < r)) bad.push(h);
  }
  return { total: rimHoles.length, bad };
}
/** 「外周の穴の点検」：外周の穴が、パッチの境目にかかっていないか調べる。かかっている穴は選んで、個数を案内する。 */
function rimBoundaryCheck() {
  const r = rimBoundaryProblems();
  if (!r.total) { $('hint').textContent = t('rimCheckNone'); return; }
  selected = new Set(r.bad.map(h => h.id)); $('hint').textContent = r.bad.length ? t('rimCheckBad', { n: r.bad.length, total: r.total }) : t('rimCheckOk', { total: r.total }); draw();
}
/** 選んだ図形の囲み（つながった閉じた線・点線も可）の中を、列×行のマスで埋める。囲みが無い・2つ以上あるときは、理由を出して何もしない。縫い合わせ・縫い穴・外周の穴は、柄の塗りつぶしと同じ設定（カードのチェック）に従う。 */
const GAP_FOCUS_SCALE = 8;   /* 隙間へ画面を移すときの最小の拡大率（px/mm） */
let gapAlert = null;   /* 格子の枠の隙間を知らせる橙の丸印：{ ids（調べた図形）, pts: [{x, y, d}] }。図形が変わる（rebuildSnaps）か、その図形の選択を外すと消える */
function gridInSelection(cols, rows) {
  const prevAlert = gapAlert; gapAlert = null;
  const ids = selectedShapeIds(), mine = doc.shapes.filter(s => ids.has(s.id) && visible(s) && stitchable(s));
  if (!regenBusy && lastPatch && undo.at(-1) === lastPatch.before && ((lastPatch.frameIds.length === ids.size && lastPatch.frameIds.every(id => ids.has(id))) || (ids.size && [...ids].every(id => lastPatch.allIds?.includes(id))))) { gapAlert = prevAlert; regenPatch(true); return; }   /* 同じ枠にもう一度押したときは、二重の格子にせず、いまの数で作りなおす */
  { const owners = (doc.grids || []).filter(g => g.pieceIds.some(id => doc.shapes.some(s => s.id === id)) && g.ids.some(id => ids.has(id)));   /* 格子のピース・縫い線だけを選んでいる：その格子を、いまの数で作りなおす（選んだピースを「枠」にして、中に新しい格子を作らない） */
    if (ids.size && owners.length && [...ids].every(id => owners.some(g => g.ids.includes(id)))) { gapAlert = prevAlert; rebuildGrids(owners, true); return; } }
  const regions = outerRegions(closedRegions(mine, 0.01, { dashed: true }));
  if (!regions.length) {
    /* 枠が閉じていないとき、線の端が離れている所（2mm 以内）があれば、橙の丸印と隙間の長さで知らせ、「隙間を閉じる」で枠そのものを直してもらう（事業主指示 2026-10-21「隙間があるならそもそもそこを修正したい」「丸印で警告するのではなかったか」・不具合記録 1902：端が最大 0.16mm 離れた所が2か所で、枠を選んでいるのに格子が作れなかった）。許容してつなぐことはしない */
    const mineGaps = gaps.filter(g => ids.has(g.a.id) || ids.has(g.b.id));
    if (mineGaps.length) {
      /* 隙間は 0.1mm ほどで線の上では見えず、画面の外にあることもある（記録 1902：2か所のうち1か所は画面の上の外）。→ 隙間の所へ画面を移して拡大し、もう一度押すと、次の隙間へ（事業主「隙間が見つけられない」） */
      const same = prevAlert && prevAlert.ids.size === ids.size && [...ids].every(id => prevAlert.ids.has(id)), i = same ? (prevAlert.i + 1) % mineGaps.length : 0, at = mineGaps[i];
      gapAlert = { ids: new Set(ids), pts: mineGaps.map(g => ({ x: g.x, y: g.y, d: g.d })), i }; scale = Math.max(scale, GAP_FOCUS_SCALE); origin = { x: viewW() / 2 - at.x * scale, y: viewH() / 2 - at.y * scale }; $('hint').textContent = t('gridOpen', { n: mineGaps.length, k: i + 1, d: Math.max(...mineGaps.map(g => g.d)).toFixed(2) }); draw(); return;
    }
    $('hint').textContent = t('gridNoArea'); return;
  }
  if (regions.length > 1) { $('hint').textContent = t('gridManyAreas', { n: regions.length }); return; }
  const rec = (doc.grids || []).find(g => g.frameIds.length > 0 && g.frameIds.every(id => ids.has(id)) && g.pieceIds.some(id => doc.shapes.some(s => s.id === id)));   /* 記録のある格子と同じ枠なら、二重の格子にせず、その格子を作りなおす（手で変えたあとも、押したときは作りなおす） */
  let replace = rec || null, frameIds = rec ? new Set(rec.frameIds) : ids, legacyN = 0;   /* 置き換える格子の枠は、記録の枠だけ（いっしょに選んだ古いピースを枠に入れない） */
  if (!rec) { const lg = legacyGridInRegion(regions[0], new Set(regions[0].shapeIds)); if (lg) { replace = { id: freshId(doc.grids || [], 'g'), frameIds: [...regions[0].shapeIds], ids: lg.ids, pieceIds: lg.pieceIds, pathIds: lg.pathIds, restore: [] }; frameIds = new Set(regions[0].shapeIds); legacyN = lg.pieceIds.length; } }   /* 記録の無い古い格子が枠の中にあれば、重ならないよう、消して作る */
  const n0 = gridApplyDone; makeGridInRegion(regions[0], frameIds, replace, cols, rows);
  if (legacyN && gridApplyDone > n0) $('hint').textContent += ' ' + t('gridLegacyReplaced', { n: legacyN });
}
/** 枠 region の中に格子を作る（replace があれば、その格子の記録のものを消して作りなおす）。gridInSelection と、格子ごとの作りなおし（rebuildGrids）で共通。 */
function makeGridInRegion(region, ids, replace, cols, rows) {
  const layer = doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id; if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const plan = gridPlan(region, cols, rows); if (plan.msg) { $('hint').textContent = plan.msg; return; }
  const { fill, pitch } = plan;
  patchFillApply(region, fill, layer, { exactPitch: pitch, frameIds: [...ids], replace, note: t('gridSpec', { w: +fill.spec.w.toFixed(2), h: +fill.spec.h.toFixed(2), a: +fill.spec.theta.toFixed(1), auto: fill.spec.auto ? t('gridAngleAuto') : t('gridAngleSet') }) + (fill.spec.adjusted ? ' ' + t('gridAdjusted', { p: pitch }) : '') + ($('patchStitch').checked && Math.abs(fill.spec.theta - 45) > 1.5 ? ' ' + t('gridNot45') : '') + ($('patchStitch').checked && fill.spec.bad > 0 ? ' ' + t('gridBadPieces', { n: fill.spec.bad }) : '') + gridStepsNote(fill.spec) });   /* frameIds：数値を変えたとき、同じ枠で作りなおすため（regenPatch） */
}
/** ひし形の大きさの段階の案内：縫い穴の間隔にそろえるため、大きさは段階になる。選べる段階と、いまの段階（★）、縫い線を引けない細いピースの数を出す。段階が1つしかなければ出さない。 */
function gridStepsNote(spec) {
  const st = spec?.steps; if (!st || st.length < 2) return '';
  const f = v => +v.toFixed(1);
  return ' ' + t('gridSteps', { list: st.map(s => f(s.w) + '×' + f(s.h) + (s.bad ? t('gridStepBad', { n: s.bad }) : '') + (s.chosen ? '★' : '')).join(' / ') });
}
/** 枠のふちで切れた端切れを省く基準（マス1つの面積に対する割合）。欄が空・範囲外（0〜50％のほか）のときは、初めの5％（事業主 2026-10-24「柄の22mm↔21.5mmでピース数が飛ぶ」→ 案A：自分で調整できる欄） */
function patchMinRatio() { const raw = String($('patchMinPiece')?.value ?? '').trim(), v = Number(raw); return raw !== '' && Number.isFinite(v) && v >= 0 && v <= 50 ? v / 100 : 0.05; }
/** 枠 region の中に作るひし形の計画（「格子を作る」と、確定前の下見で共通）。作れないときは { msg: 理由 }、作れるときは { fill, pitch }。図面は変えない。 */
function gridPlan(region, cols0, rows0) {
  const pitch = Number($('patchPitch').value); if (!(pitch > 0)) return { msg: t('invalidNumber') };
  const gp = gridParamsFor(region, cols0, rows0), cols = gp.cols, rows = gp.rows;
  if (gp.bad) return { msg: t('invalidNumber') };
  if (gridTargetMode && (!(cols >= 1) || !(rows >= 1))) return { msg: t('gridTargetTooBig', { w: +gp.tw.toFixed(1), h: +gp.th.toFixed(1), bw: +gp.bw.toFixed(1), bh: +gp.bh.toFixed(1) }) };   /* 目標の大きさが、枠より大きい */
  const angleRaw = gp.angle !== undefined ? String(gp.angle) : String($('gridAngle').value ?? '').trim(), fill = diamondGridFill(region, cols, rows, { angle: angleRaw === '' ? null : Number(angleRaw), shift: patchShiftNow(), pitch: $('patchStitch').checked && !$('patchKeepSize')?.checked ? pitch : null, preferNear: !!$('patchPreferNear')?.checked, minAreaRatio: patchMinRatio() });   /* 縫い穴を付けるときだけ、ひし形の大きさを穴の間隔に合わせる */   /* 斜めの2方向のひし形：幅＝枠の幅÷列・高さ＝枠の高さ÷行（角度が空のとき）／幅×tan（角度を入れたとき）。枠の中心基準で左右対称 */
  if (!fill) return { msg: t('invalidNumber') };
  if (fill.badAngle) return { msg: t('gridBadAngle', { a: +fill.theta.toFixed(1), min: 20, max: 80 }) };
  if (fill.tooMany) return { msg: t('patchTooMany', { n: fill.tiles }) };
  if (fill.tooSmall) return { msg: t('gridTooSmall', { p: pitch }) };   /* ひし形が小さすぎて、縫い穴を置けない */
  if (!fill.pieces.length) return { msg: t('impossible') };
  return { fill, pitch };
}
function makeGrid() {
  const cols = Number($('patchCols').value) || 2, rows = Number($('patchRows').value) || 2;
  if (!gridTargetMode && (!(cols >= 1) || !(rows >= 1))) { $('hint').textContent = t('gridNeedColsRows', { c: cols, r: rows }); return; }   /* マイナスの数で 0 ピースを「作りました」と出さない（事業主指摘 2026-10-21 不具合記録 1532） */
  /* 格子は、選んだ囲み（つながった閉じた線）の中だけに作る。囲みを選んでいないときは、どこにも作らない（事業主指示 2026-10-21「格子は囲んだ枠以外に絶対に作らないで」：以前は、枠と関係ない所に別々のピースを作っていた） */
  gridInSelection(cols, rows);
}
/** 縫い合わせ（doc.seams）に沿って共有辺の縫い穴を最適化して置く（「最適化」ボタンと同じ計算）。置いた穴の数を返す。commit の中で呼ぶ。 */
/** 格子（ひし形）の縫い穴を、縫い合わせごとに、向かい合う2本の縫い線（縁から pitch/2 内側）の上へ、同じ位置にそろえて、pitch おきに置く（45度なら、4つの穴が1辺 pitch の正方形の角になる＝クロスステッチが正方形）。
 *  2本の縫い線が重なる範囲を、交点の側から pitch ちょうどで並べ（隣り合う4つが一辺 pitch の正方形）、外周側に 1.5mm 以上余ったら、外周の側の端に1個足す（seamHoleOffsets）。外周の側は、枠（frame）に近い端。
 *  すでにある菱目（外周の穴など）と重なる位置には置かない＝菱目を優先する（事業主 2026-10-23「菱目と丸目が重なる位置は、菱目を優先する」）。置いた穴の数を返す。commit の中で呼ぶ。 */
function latticeSeamHoles(stitch, pathOfPiece, tool, pitch, frame = null) {
  const info = new Map(), want = new Map();
  const toolOf = new Map(doc.tools.map(x => [x.id, x])), roundR = Math.max(tool.holeW, tool.holeH) / 2;
  const diamonds = doc.holes.map(h => { const x = toolOf.get(h.toolId); return x && x.kind !== 'round' ? { x: h.x, y: h.y, reach: roundR + Math.max(x.holeW, x.holeH) / 2 + 0.4 } : null; }).filter(Boolean);   /* 菱目など、丸目ではない穴 */
  const onDiamond = q => diamonds.some(o => Math.abs(o.x - q.x) < o.reach && Math.abs(o.y - q.y) < o.reach && Math.hypot(o.x - q.x, o.y - q.y) < o.reach);
  const routeOf = pid => { if (!info.has(pid)) { const saved = doc.paths.find(p => p.id === pid), r = saved && resolvePath(doc, saved); info.set(pid, r ? { saved, route: r, len: arcLength(r) } : null); } return info.get(pid); };
  const put = (pid, q) => { const it = routeOf(pid); if (!it) return; if (onDiamond(q)) return; let pr = projectOnPath(it.route, q); if (!pr || distance(pr, q) > 0.05) return; if (pr.s >= it.len - 1e-6) pr = { ...pr, s: 0 }; const m = want.get(pid) || want.set(pid, new Map()).get(pid), key = Math.round(pr.s * 100); if (m.has(key)) return; for (const o of m.values()) if (distance(o, pr) < 0.7 * pitch) return; m.set(key, pr); };   /* 枠で切れたピースの尖った角では、近すぎる穴は置かない */
  for (const sm of stitch.seams) {
    const pa = pathOfPiece[sm.a.piece], pb = pathOfPiece[sm.b.piece], ia = pa && routeOf(pa), ib = pb && routeOf(pb); if (!ia || !ib) continue;
    const A0 = pointAtLength(ia.route, sm.a.from), A1 = pointAtLength(ia.route, sm.a.to), B0 = pointAtLength(ib.route, sm.b.from), B1 = pointAtLength(ib.route, sm.b.to), La = distance(A0, A1); if (!(La > 1e-6)) continue;
    const e = { x: (A1.x - A0.x) / La, y: (A1.y - A0.y) / La }, along = q => (q.x - A0.x) * e.x + (q.y - A0.y) * e.y, tb0 = along(B0), tb1 = along(B1);
    const t0 = Math.max(0, Math.min(tb0, tb1)), t1 = Math.min(La, Math.max(tb0, tb1)), len = t1 - t0; if (len < -1e-6) continue;
    const off = { x: B0.x - A0.x - e.x * tb0, y: B0.y - A0.y - e.y * tb0 };   /* A の縫い線から B の縫い線へ（垂直に） */
    const at = t => ({ x: A0.x + e.x * t, y: A0.y + e.y * t }), d0 = frame ? frame.nearest(at(t0)).dist : Infinity, d1 = frame ? frame.nearest(at(t1)).dist : Infinity, outer = Math.min(d0, d1) < 2 * pitch ? (d1 < d0 ? 'end' : 'start') : null;   /* 枠に近い端＝外周の側 */
    const ts = seamHoleOffsets(t0, t1, pitch, outer);
    for (const t of ts) { const qa = { x: A0.x + e.x * t, y: A0.y + e.y * t }; put(pa, qa); put(pb, { x: qa.x + off.x, y: qa.y + off.y }); }
  }
  let n = 0; for (const [pid, m] of want) { const it = routeOf(pid), pts = [...m.values()].sort((p, q) => p.s - q.s); if (it && pts.length) { placeHoles(it.saved, it.route, pts, tool); n += pts.length; } }
  return n;
}
/** パッチワークで自動に打つ穴の工具。「使用中の工具のまま」か、使用中の工具が選んだ種類（菱目／丸目）ならそれ。違えば同じ種類の登録工具、無ければ使用中の工具から作る。 */
function patchHoleTool(forceKind = null) {   /* forceKind：種類を決めて工具を得る（格子の縫い穴は 'round'） */
  const cur = stitchToolCurrent(), kind = forceKind || $('patchHole').value;
  if ((kind !== 'diamond' && kind !== 'round') || cur.kind === kind) return cur;
  const same = doc.tools.filter(x => x.kind === kind), near = same.find(x => x.pitch === cur.pitch && x.teeth === cur.teeth) || same.find(x => x.pitch === cur.pitch) || same[0];
  return near || { ...cur, id: 'patch-' + kind, name: 'patch-' + kind, kind, holeW: kind === 'round' ? 1 : 2, holeH: kind === 'round' ? 1 : 0.8, angleDeg: kind === 'round' ? 0 : 45 };
}
/** 柄のずらし量 {x,y}（mm・＋は右・下）。欄が空・数でないときは 0（＝上下左右対称）。 */
const patchShiftNow = () => ({ x: Number($('patchShiftX').value) || 0, y: Number($('patchShiftY').value) || 0 });
/** 柄の位置のボタン（←→↑↓）：欄の値を「1回の量」（既定 0.5mm）だけ動かし、描いた柄があればその場で輪郭で切ったまま作りなおす。dx・dy は -1／0／1。 */
function nudgePatch(dx, dy) {
  const step = Math.abs(Number($('patchShiftStep').value)) || 0.5, cur = patchShiftNow(), fmt = v => String(+v.toFixed(4)); /* 小数の足し算の誤差（0.1+0.2）を残さない */
  $('patchShiftX').value = fmt(cur.x + dx * step); $('patchShiftY').value = fmt(cur.y + dy * step); regenPatch();
}
function resetPatchShift() { $('patchShiftX').value = '0'; $('patchShiftY').value = '0'; regenPatch(); }
/** 「上下左右対称に整える」：柄の位置（左右・上下）を 0 に戻して、選んでいる格子（直前に作った格子）を作りなおす。列・行・幅・高さなどの寸法はそのまま。寸法を変えて位置もずらしたあとに、はじめの対称な並びへ戻す（事業主 2026-10-26）。 */
function symmetrizePatch() {
  if (!gridsTouchedBySelection().length && !lastPatch) { $('hint').textContent = t('patchSymmetryNone'); return; }
  $('patchShiftX').value = '0'; $('patchShiftY').value = '0'; regenPatch(true); $('hint').textContent = t('patchSymmetryDone') + ' ' + $('hint').textContent;
}
/** 外周の穴の「ふち」から、縁・パッチの境目の実線まで、あけておく間（mm）。これより近いと、穴と縁（境目）のあいだの革がちぎれる（事業主 2026-10-25「両方です。菱目と端部までの距離が短いとちぎれてしまうから」：外周の菱目はパッチの境界線から 1.5mm 離す）。 */
const PATCH_HOLE_WEB_MM = 1.5;
/** すでにある外周の穴を、境目から離す・点検するときの距離（mm）＝穴の中心から：穴の大きい方の寸法の半分＋0.3mm（穴が線にかかるかどうか）。ずらせる量（ピッチの40%）に限りがあるので、これは今までどおり。 */
const patchHoleClearR = tool => Math.max(tool.holeW, tool.holeH) / 2 + 0.3;
/** 新しく打つ外周の菱目が、縁・境目の実線から離れていなければならない距離（mm）＝穴の中心から：穴の大きい方の寸法の半分＋ PATCH_HOLE_WEB_MM（1.5mm）。 */
const patchHoleWebR = tool => Math.max(tool.holeW, tool.holeH) / 2 + PATCH_HOLE_WEB_MM;
/** 外周の穴がよける相手：見えている実線の図形（柄のピース・図形の外形・円など）。点線（縫い線・案内）は除く。r は箱の余白（早く除くため）。 */
function patchObstacles(r) {
  return doc.shapes.filter(s => visibleData(s) && stitchable(s) && s.lineStyle !== 'dashed' && ['line', 'arc', 'bezier', 'polyline', 'circle', 'path'].includes(s.type)).map(s => { const b = bboxOf(s); return { s, minX: b.minX - r, maxX: b.maxX + r, minY: b.minY - r, maxY: b.maxY + r }; });
}
/** 外周の穴（枠の縁から 0.5〜(外周の距離＋2.5)mm の帯にある、丸目でない穴の閉じた並び）のうち、パッチの境目（実線）に重なるものを、線に沿って最大 ピッチの40% までずらす。
 *  同じ並びの別の外周（裏面など・平行移動／左右反転／上下反転／180°回転で写せて向きも合うもの）の穴も、同じだけ動かす（事業主 2026-10-23「菱目をずらしたときに裏面の菱目の位置も追従させる必要がある」）。commit の中で呼ぶ。戻り値 { moved, stuck, mirrored, maxD }。 */
function shiftRingHolesOffBoundaries(outlinePts, rimOffset) {
  const toolOf = new Map(doc.tools.map(x => [x.id, x])), outline = loopSampler(outlinePts), skip = new Set(doc.paths.filter(p => p.grid || p.rim).map(p => p.id)), norm = a => ((a % 360) + 360) % 360;
  const isDia = h => { const x = toolOf.get(h.toolId); return !!x && x.kind !== 'round'; };
  const byPath = new Map();
  for (const h of doc.holes) { if (!isDia(h) || skip.has(h.pathId) || !insideRing(h, outlinePts)) continue; const d = outline.nearest(h).dist; if (d < 0.5 || d > rimOffset + 2.5) continue; (byPath.get(h.pathId) || byPath.set(h.pathId, []).get(h.pathId)).push(h); }
  const res = { moved: 0, stuck: 0, mirrored: 0, ambiguous: 0, maxD: 0, restore: [] }, follow = $('followTangent').checked, amb = new Set(), saved0 = new Map(), keep = h => { if (!saved0.has(h.id)) saved0.set(h.id, { id: h.id, x: h.x, y: h.y, s: h.s, angleDeg: h.angleDeg }); };   /* saved0：動かす前の位置・向き（格子を作りなおすとき、先に元へ戻す） */   /* amb：同じ並びだが、反転コピー（順目）か平行コピーか区別できず、動かさなかった外周 */
  for (const [pid, band] of byPath) {
    const saved = doc.paths.find(p => p.id === pid); if (!saved || !saved.closed) continue; const route = resolvePath(doc, saved); if (!route) continue;
    const tl = toolOf.get(band[0].toolId), len = arcLength(route), clearR = patchHoleClearR(tl), others = patchObstacles(clearR);
    const isFree = q => !others.some(o => q.x >= o.minX && q.x <= o.maxX && q.y >= o.minY && q.y <= o.maxY && distToShape(o.s, q) < clearR - 1e-9);
    const sorted = band.slice().sort((a, b) => a.s - b.s), r = shiftHolesClear(len, sorted.map(h => ({ id: h.id, s: h.s })), s => pointAtLength(route, s), isFree, { maxShift: 0.4 * tl.pitch, minGap: 0.6 * tl.pitch });
    res.stuck += r.stuck.length; if (!r.moved.length) continue;
    const before = sorted.map(h => ({ x: h.x, y: h.y, angleDeg: h.angleDeg })), sibs = [];   /* 動かす前の位置と向きで、同じ並びの外周を探す */
    for (const q of doc.paths) {
      if (q.id === pid || !q.closed || skip.has(q.id) || byPath.has(q.id)) continue;
      const qh = doc.holes.filter(h => h.pathId === q.id && isDia(h)).sort((a, b) => a.s - b.s); if (qh.length !== sorted.length) continue;
      const cp = ringCounterpart(before, qh.map(h => ({ x: h.x, y: h.y, angleDeg: h.angleDeg }))); if (cp?.ambiguous) { amb.add(q.id); continue; } const routeQ = cp && resolvePath(doc, q); if (cp && routeQ) sibs.push({ cp, qh, routeQ });
    }
    for (const m of r.moved) {
      const i = sorted.findIndex(h => h.id === m.id), h = sorted[i], p0 = pointAtLength(route, h.s), p1 = pointAtLength(route, m.s1); res.moved++; { const dd = Math.abs(m.s1 - m.s0); res.maxD = Math.max(res.maxD, Math.min(dd, len - dd)); }
      keep(h); h.x = p1.x; h.y = p1.y; h.s = m.s1; if (follow) h.angleDeg = norm(h.angleDeg + p1.angleDeg - p0.angleDeg);
      for (const { cp, qh, routeQ } of sibs) {
        const j = qh[cp.map[i]], target = cp.apply({ x: p1.x, y: p1.y }), pr = projectOnPath(routeQ, target); if (!j || !pr || distance(pr, target) > 0.3) continue;
        const t0 = pointAtLength(routeQ, j.s).angleDeg, t1 = pointAtLength(routeQ, pr.s).angleDeg; keep(j); j.x = pr.x; j.y = pr.y; j.s = pr.s; if (follow) j.angleDeg = norm(j.angleDeg + t1 - t0); res.mirrored++;
      }
    }
  }
  res.ambiguous = amb.size; res.restore = [...saved0.values()]; return res;
}
/** 穴を、大きさ cell の升目ごとに分けておく（近くの穴だけを調べるため）。 */
function holeGrid(holes, cell) {
  const grid = new Map(); for (const h of holes) { const k = Math.floor(h.x / cell) + ',' + Math.floor(h.y / cell), a = grid.get(k); if (a) a.push(h); else grid.set(k, [h]); }
  return { grid, cell };
}
/** 点 q に外周の穴を置いてよいか：実線から r 以上、ほかの穴から gap（＝升目の大きさ）以上はなれている。 */
function rimSpotFree(q, others, r, near) {
  for (const o of others) if (q.x >= o.minX && q.x <= o.maxX && q.y >= o.minY && q.y <= o.maxY && distToShape(o.s, q) < r) return false;
  const cx = Math.floor(q.x / near.cell), cy = Math.floor(q.y / near.cell), g2 = near.cell * near.cell;
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) for (const h of near.grid.get(i + ',' + j) || []) if ((h.x - q.x) ** 2 + (h.y - q.y) ** 2 < g2) return false;
  return true;
}
let commitSeq = 0;   /* commit が図面を変えた回数（格子の連動の記録を付けるかの判定に使う） */
let lastPatch = null; /* 直前の格子 {frameIds: 元の枠の図形の id, before: そのときの取り消し用の記録}。数値を変えたら作りなおす */
let regenTimer = null, regenYield = null, regenDelayMs = 250, regenBusy = false;   /* 数値の欄を押しっぱなし・打ちかけにしている間は作りなおさず、最後の変化の 250ms 後に1回だけ作りなおす（事業主「数値がとまらない」：1段ごとに作りなおすと画面が止まり、矢印を離しても数が進み続けた）。数値の欄（type=number）だけ。選択・チェックはすぐ。0 以下なら、すぐ（テスト用） */
const REGEN_PREVIEW_FACTOR = 4;   /* 列・行・角度は、変えた瞬間に下見（gridPreviewUpdate）が出るので、確定までの待ちを通常の4倍（約1秒）にする。連続して押している間は下見だけが動く。regenDelayMs が 0（テスト）ならすぐ */
function regenSoon(fn, el, ms = regenDelayMs) {
  clearTimeout(regenTimer); regenTimer = null; clearTimeout(regenYield); regenYield = null; if (el.type !== 'number' || !(regenDelayMs > 0)) { fn(); return; }
  const run = () => {
    regenTimer = null; if (gesture || stage) { regenTimer = setTimeout(run, ms); return; }   /* ドラッグ・作図の途中は、操作を壊さないよう、終わるまで待つ */
    if (lastPatch && undo.at(-1) === lastPatch.before && lastPatch.sig !== regenSig()) { $('hint').textContent = t('gridRebuilding'); regenYield = setTimeout(() => { regenYield = null; fn(); }, 30); return; }   /* 作りなおしの計算の間は画面が止まる。先に「作りなおし中」を1回描かせてから始める */
    fn();
  };
  regenTimer = setTimeout(run, ms);
}
/** 格子の設定の値の組（これが前回の作りなおしと同じなら、作りなおさない：欄を離れたときの change で、同じ値のまま、もう一度作りなおすのを防ぐ）。 */
function regenSig() { return JSON.stringify(['patchTargetW', 'patchTargetH', 'patchCols', 'patchRows', 'gridAngle', 'patchPitch', 'patchTol', 'patchClear', 'patchShiftX', 'patchShiftY', 'patchRimOffset', 'patchRimPitch', 'patchRimRadius', 'patchHole', 'patchTexA', 'patchTexB', 'stitchTool', 'patchMinPiece'].map(id => $(id)?.value).concat(['patchStitch', 'patchEdgeBan', 'patchRim', 'patchPreferNear', 'patchKeepSize'].map(id => !!$(id)?.checked)).concat(gridTargetMode)); }
/** 列・行・ひし形の角度を変えたとき：直前が格子なら作りなおす。作りなおす図が無いとき（読み込み直した後・別の操作のあと）は、下見（gridPreviewUpdate）が、何も起きない理由と押す操作を案内する（事業主「列と行の数字を変えてもなにも図形に変化が出ない」）。 */
function gridFieldChanged() {
  if (gridsTouchedBySelection().length || (lastPatch && undo.at(-1) === lastPatch.before)) regenPatch();
}
/** 格子の設定を変えたとき、直前の格子を取り消して同じ枠に作りなおす（取り消しは1回分のまま）。作れない値のときは元のまま。force＝同じ設定でも作りなおす（ピースの上をクリックしたとき）。 */
function regenPatch(force = false) {
  const gs = gridsTouchedBySelection(), lastOnly = !!lastPatch && undo.at(-1) === lastPatch.before && gs.length === 1 && gs[0].id === lastPatch.gridId;
  if (gs.length && !lastOnly) { rebuildGrids(gs, force); return; }   /* 直前に作った1つだけ（または何も選んでいない）なら、今までどおり。ほかの格子のパッチの線・枠を選んでいれば、その格子だけを作りなおす */
  if (!lastPatch || undo.at(-1) !== lastPatch.before) return; /* 塗りつぶしの後に別の操作をしていれば何もしない */
  if (gesture || stage) return;   /* ドラッグ・作図の途中は、操作を壊さない（取り消しが cancel() を呼ぶため） */
  if (!force && lastPatch.sig === regenSig()) return;   /* 設定が前回と同じなら、作りなおさない */
  const snap = JSON.stringify(doc), savedUndo = undo.slice(), savedRedo = redo.slice(), frameIds = lastPatch.frameIds, prevSel = new Set(selected);
  history(undo, redo, true); const depth = undo.length; selected = new Set(frameIds); let ok = false;
  regenBusy = true; try { makeGrid(); ok = undo.length > depth; } catch (e) { ok = false; console.error(e); } finally { regenBusy = false; }   /* 格子は、元の枠を選びなおして作りなおす（事業主「数値を変更したら図もそれに追従する仕様だったのに壊れています」） */
  if (!ok) { /* 作れなかった（例外も）：画面の記録を元に戻す（案内の文言・選択は残す） */
    const msg = $('hint').textContent; doc = JSON.parse(snap); undo = savedUndo; redo = savedRedo; selected = prevSel; refreshTools(); persistTools(); renderLayers(); renderSeams(); rebuildSnaps(); draw(); $('hint').textContent = msg;
  }
}
/* ---- 格子ごとの記録（doc.grids・事業主 2026-10-23「右だけ全体のバランスを変えたい」「任意の一つのパッチのラインを選択すれば、隣接するすべてのパッチの変更を追従させることができるか」「外周線を選んでその内側すべてを対象とする方がよいか」）----
 *  「格子を作る」ごとに、枠・できた図形・経路・動かした外周の穴の元の位置・設定を図面に残す。パッチの線を1本選ぶか、枠の線を全部選ぶと、その格子が対象になり、設定が欄に出る。
 *  列・行・角度・位置・ピッチ・外周などの欄を変えると、その格子だけが、記録のものを消して作りなおされる（直前に作った1つだけは、今までどおり取り消して作りなおす）。複数の格子を選べば、一斉に変わる（取り消しは1回）。
 *  「内側すべて」ではなく、その枠から作った図形だけを消す（枠の中の文字・目印・金具の穴などを巻き込まない）。 */
const GRID_SETTING_IDS = ['patchTargetW', 'patchTargetH', 'patchCols', 'patchRows', 'gridAngle', 'patchPitch', 'patchTol', 'patchClear', 'patchShiftX', 'patchShiftY', 'patchRimOffset', 'patchRimPitch', 'patchRimRadius', 'patchHole', 'patchTexA', 'patchTexB', 'stitchTool', 'patchMinPiece'], GRID_CHECK_IDS = ['patchStitch', 'patchEdgeBan', 'patchRim', 'patchPreferNear', 'patchKeepSize'];
let gridApplyDone = 0, gridSelKey = '', gridSelSeq = -1, gridArmSeq = -1, gridSelSig = '';   /* gridArmSeq：格子を選びなおしたときの commitSeq。そのあと図面を変える操作が入ったら、選びなおすまで、欄の変更で作りなおさない（選択が残っているだけで、あとの作業を消さない） */
/** いまの格子の設定（欄の値）。記録に入れる。 */
function gridSettingsNow() { const fields = {}, checks = {}; for (const id of GRID_SETTING_IDS) fields[id] = String($(id)?.value ?? ''); for (const id of GRID_CHECK_IDS) checks[id] = !!$(id)?.checked; checks.targetMode = gridTargetMode; return { fields, checks, sig: regenSig() }; }
/** 記録の設定を欄に出す（イベントは起こさない）。 */
function loadGridSettings(s) { if (!s) return; for (const id of GRID_SETTING_IDS) { const el = $(id); if (el && id in (s.fields || {}) && !(el.tagName === 'SELECT' && ![...el.options].some(o => o.value === s.fields[id]))) el.value = s.fields[id]; } for (const id of GRID_CHECK_IDS) { const el = $(id); if (el && id in (s.checks || {})) el.checked = !!s.checks[id]; } gridTargetMode = !!s.checks?.targetMode; }
/** 格子 g が作ったもの（図形・穴・縫い合わせ・経路・記録）を消し、動かした外周の穴を元の位置へ戻す。commit の中で呼ぶ。 */
function removeGridItems(g) {
  for (const r of g.restore || []) { const h = doc.holes.find(x => x.id === r.id); if (h) { h.x = r.x; h.y = r.y; h.s = r.s; h.angleDeg = r.angleDeg; } }
  const drop = new Set(g.ids), pathDrop = new Set(g.pathIds);
  doc.shapes = doc.shapes.filter(s => !drop.has(s.id)); doc.holes = doc.holes.filter(h => !pathDrop.has(h.pathId));
  doc.seams = (doc.seams || []).filter(s => !pathDrop.has(s.a?.pathId) && !pathDrop.has(s.b?.pathId)); doc.paths = doc.paths.filter(p => !pathDrop.has(p.id));
  doc.grids = (doc.grids || []).filter(x => x.id !== g.id);
}
/** 格子の図形の指紋（できた図形の中身を文字にして混ぜた数）。選んだときと同じなら、そのあとの操作は、この格子の図形に触れていない。commitSeq ごとに1回だけ計算する。 */
const gridFps = new Map(); let gridFpSeq = -1, gridFpNow = new Map();
/** 格子（id の一覧）を、いまの図形のまま「作りなおしてよい」状態にする：選びなおしたことにして、指紋も覚えなおす。自分で作った・作りなおした直後に呼ぶ。 */
function rearmGrids(idList) { gridArmSeq = commitSeq; for (const id of idList) { const g = (doc.grids || []).find(x => x.id === id); if (g) gridFps.set(g.id, gridFpOf(g)); } }
function gridFpOf(g) {
  if (gridFpSeq !== commitSeq) { gridFpNow = new Map(); gridFpSeq = commitSeq; }
  if (gridFpNow.has(g.id)) return gridFpNow.get(g.id);
  const set = new Set(g.ids); let h = 0, n = 0;
  for (const s of doc.shapes) { if (!set.has(s.id)) continue; n++; const str = JSON.stringify(s); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; }
  const fp = n + ':' + h; gridFpNow.set(g.id, fp); return fp;
}
/* ---- 作りなおしの記録が無い古い格子（記録の機能を入れる前の図面・事業主 2026-10-23「パッチの大きさがかわりません」「全体を選んで格子を作ると重なる」）----
 *  枠の中に、ピース（閉じた折れ線）が敷きつめられていれば（3枚以上・面積の7割以上）、それを古い格子とみなす。ピースと、その縫い線・外周の経路（paths の grid・rim）・穴・縫い合わせが、その格子の持ち物。
 *  ①枠を選んで「格子を作る」→古い格子を消して作る（重ならない・元に戻せる）。②古いピースを選んで数字を変える→その場で記録にして、その格子だけ作りなおす。 */
let legacyTried = '';
function legacyGridInRegion(region, frameIds) {
  const recorded = new Set((doc.grids || []).flatMap(g => g.ids)), recordedPaths = new Set((doc.grids || []).flatMap(g => g.pathIds)), loop = loopSampler(region.points), ins = p => insidePolygon(p, region.points) || loop.nearest(p).dist < 0.05;
  const pathShapes = new Set(doc.paths.flatMap(p => p.shapeIds || []));   /* 縫い線の経路が通る図形（格子の縫い線・外周の線・ふつうの部品の縫い線）は、ピースに数えない */
  const pieces = doc.shapes.filter(s => s.type === 'polyline' && s.closed && !s.holeLink && s.points?.length >= 3 && s.points.length <= 80 && !frameIds.has(s.id) && !recorded.has(s.id) && !pathShapes.has(s.id) && visible(s) && s.points.every(ins));
  if (pieces.length < 3) return null;
  const area = pieces.reduce((sum, s) => sum + Math.abs(s.points.reduce((t, q, i) => t + q.x * s.points[(i + 1) % s.points.length].y - s.points[(i + 1) % s.points.length].x * q.y, 0)) / 2, 0); if (area < region.area * 0.7) return null;
  const byId = new Map(doc.shapes.map(s => [s.id, s])), paths = doc.paths.filter(p => (p.grid || p.rim) && !recordedPaths.has(p.id) && p.shapeIds?.length && p.shapeIds.every(id => { const s = byId.get(id); return s?.points && s.points.every(ins); }));
  const pieceIds = pieces.map(s => s.id);
  return { pieceIds, pathIds: paths.map(p => p.id), ids: [...pieceIds, ...new Set(paths.flatMap(p => p.shapeIds))] };
}
/** 記録の無い古い格子のものを選んでいるとき（ピース・縫い線・穴・枠の線など、どれでも）：選んだものが入っている枠に、ピースが敷きつめられていれば、その場で格子の記録にする（事業主 2026-10-23「右のパッチワークが反応しない」：穴や線を選んでいると、古い格子と気づけなかった）。見つからなければ何もしない（同じ選択・同じ図面では、探しなおさない）。 */
function adoptLegacyGrid() {
  if (!selected.size) return;
  const recorded = new Set((doc.grids || []).flatMap(g => g.ids)), recordedPaths = new Set((doc.grids || []).flatMap(g => g.pathIds)); for (const id of selected) if (recorded.has(id)) return;
  const key = commitSeq + ':' + selected.size + ':' + [...selected][0]; if (key === legacyTried) return; legacyTried = key;
  const pts = [], shapeById = new Map(doc.shapes.map(s => [s.id, s])), holeById = new Map(doc.holes.map(h => [h.id, h]));   /* 選んだものの位置：図形は外接の中心・穴は穴の位置 */
  for (const id of selected) { const s = shapeById.get(id); if (s) { try { const b = bboxOf(s); pts.push({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }); } catch { /* 位置が取れない図形は数えない */ } continue; } const h = holeById.get(id); if (h) { if (recordedPaths.has(h.pathId)) return; pts.push({ x: h.x, y: h.y }); } }
  if (!pts.length) return;
  const frameCand = doc.shapes.filter(s => visible(s) && stitchable(s) && !(s.type === 'polyline' && s.closed && s.points.length <= 80)); if (!frameCand.length) return;
  const c = { x: pts.reduce((m, q) => m + q.x, 0) / pts.length, y: pts.reduce((m, q) => m + q.y, 0) / pts.length };
  for (const region of outerRegions(closedRegions(frameCand, 0.05)).filter(r => insidePolygon(c, r.points)).sort((x, y) => x.area - y.area)) {
    const lg = legacyGridInRegion(region, new Set(region.shapeIds)); if (!lg || !pts.every(q => insidePolygon(q, region.points) || loopSampler(region.points).nearest(q).dist < 0.05)) continue;
    const rec = { id: freshId(doc.grids || [], 'g'), frameIds: [...region.shapeIds], ids: lg.ids, pieceIds: lg.pieceIds, pathIds: lg.pathIds, restore: [], settings: { fields: {}, checks: { targetMode: gridTargetMode } } };
    doc.grids = [...(doc.grids || []), rec]; gridArmSeq = commitSeq; gridFps.set(rec.id, gridFpOf(rec)); return;
  }
}
/** いま選んでいる図形が触れている格子の記録：できた図形（パッチの線・ピース）を1つでも選んでいるか、枠の図形を全部選んでいる格子。
 *  armedOnly＝欄の変更で作りなおしてよい格子だけ：選びなおしたあと、図面を変える操作が入っていないか、入っていても、この格子の図形が選んだときのまま変わっていないもの（事業主 2026-10-23「パッチワークの図が数値変更に連動しません」：ピースを選んだあとに別の操作が入ると、選択が新しい枠として扱われて「枠より大きいので作れません」と出ていた）。 */
function gridsTouchedBySelection(armedOnly = true) {
  if (!selected.size) return []; if (armedOnly) adoptLegacyGrid();   /* 欄を変えるとき、記録の無い古い格子のピースを選んでいれば、その場で記録にする */
  const gs = doc.grids; if (!gs?.length) return [];
  const live = new Set(doc.shapes.map(s => s.id)), armed = commitSeq === gridArmSeq, holePaths = new Set(doc.holes.filter(h => selected.has(h.id)).map(h => h.pathId));   /* 穴（菱目・丸目）だけを選んでいても、その穴が属す格子が対象 */
  return gs.filter(g => g.pieceIds.some(id => live.has(id)) && (g.ids.some(id => selected.has(id)) || g.pathIds.some(pid => holePaths.has(pid)) || (g.frameIds.length > 0 && g.frameIds.every(id => selected.has(id)))) && (!armedOnly || armed || gridFps.get(g.id) === gridFpOf(g)));
}
/** 選んでいるのは記録のある格子の図形だが、選んだあとに、その格子の図形が手で変えられている（自動の作りなおしで手直しが消えるので、作りなおさない）。 */
function gridsStaleBySelection() { const ok = new Set(gridsTouchedBySelection(true).map(g => g.id)); return gridsTouchedBySelection(false).filter(g => !ok.has(g.id)); }
/** 選んだ格子（1つ）の設定を欄に出す。選びなおしたときだけ（欄を打っている最中は触らない）。 */
function syncGridSettingsToSelection() {
  if (!doc.grids?.length) { gridSelKey = ''; return; }
  let hs = selected.size; for (const id of selected) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; hs = (hs + h) | 0; }   /* 選んでいる図形の指紋（順番に関係ない）：選びなおしたかを見分ける */
  const sig = selected.size + ':' + hs, reselected = sig !== gridSelSig; gridSelSig = sig; if (reselected) { gridArmSeq = commitSeq; for (const g of gridsTouchedBySelection(false)) gridFps.set(g.id, gridFpOf(g)); }   /* 選びなおした時点の図形の指紋も覚える（あとで別の操作が入っても、この格子の図形が変わっていなければ、欄の変更で作りなおす） */
  const gs = gridsTouchedBySelection(false), key = gs.map(g => g.id).join(','); if (key === gridSelKey) return;
  const first = gridSelKey === '' && gs.length === 0; gridSelKey = key; if (first || regenBusy) return;
  if (gs.length === 1) { loadGridSettings(gs[0].settings); if (mode === 'select' && commitSeq === gridSelSeq) $('hint').textContent = t('gridPicked', { n: gs[0].pieceIds.length }); }
  else if (gs.length > 1 && mode === 'select' && commitSeq === gridSelSeq) $('hint').textContent = t('gridPickedMany', { k: gs.length });
  gridSelSeq = commitSeq;
}
/** 選んだ格子を、いまの欄の設定で作りなおす（複数でも一斉に・取り消しは1回）。作れなかったときは、図面を元のまま。 */
function rebuildGrids(gs, force = false) {
  if (gesture || stage || !gs.length) return;
  const sig = regenSig(); if (!force && gs.every(g => g.settings?.sig === sig)) return;   /* 設定が前回と同じなら、作りなおさない */
  const cols = Number($('patchCols').value) || 2, rows = Number($('patchRows').value) || 2; if (!gridTargetMode && (!(cols >= 1) || !(rows >= 1))) { $('hint').textContent = t('gridNeedColsRows', { c: cols, r: rows }); return; }
  const snap = JSON.stringify(doc), savedUndo = undo.slice(), savedRedo = redo.slice(), prevSel = new Set(selected), depth0 = undo.length, newIds = new Set(); let ok = true, made = 0;
  regenBusy = true;
  try {
    for (const g0 of gs) {
      const g = (doc.grids || []).find(x => x.id === g0.id); if (!g) continue;
      const mine = doc.shapes.filter(s => g.frameIds.includes(s.id) && visible(s) && stitchable(s)), regions = outerRegions(closedRegions(mine, 0.01, { dashed: true }));
      if (regions.length !== 1) { ok = false; $('hint').textContent = t('gridRebuildNoFrame'); break; }
      const n0 = gridApplyDone; makeGridInRegion(regions[0], g.frameIds, g, cols, rows); if (gridApplyDone === n0) { ok = false; break; }
      for (const i of (doc.grids.find(x => x.id === g.id)?.ids || [])) newIds.add(i); made++;
    }
  } catch (e) { ok = false; console.error(e); } finally { regenBusy = false; }
  if (!ok) { const msg = $('hint').textContent; doc = JSON.parse(snap); undo = savedUndo; redo = savedRedo; selected = prevSel; refreshTools(); persistTools(); renderLayers(); renderSeams(); rebuildSnaps(); draw(); $('hint').textContent = msg; return; }
  undo.splice(depth0 + 1);   /* 何枚作りなおしても、取り消しは1回 */
  lastPatch = null; selected = newIds; gridSelKey = ''; rearmGrids(gs.map(g => g.id));   /* 作りなおした格子は、すぐ、続けて追従できる状態にする（事業主 2026-10-23「途中で止まる」：同じ数のピースが続けてできると、選択が変わらず、手で変えたと誤判定していた） */
  if (made > 1) $('hint').textContent = t('gridRebuiltMany', { k: made }) + ' ' + $('hint').textContent; draw();
}
/* ---- 目標 幅・高さ＝ひし形1枚の大きさ（事業主 2026-10-23「目標の幅と高さを変えても図面が追従しない」→「A：ひし形を1枚の大きさ」）----
 *  欄に入れると、枠（選んだ枠・作った格子の枠・選んだ格子の枠）の大きさから、列＝枠の幅÷目標幅・角度＝atan(目標高さ÷目標幅) を決めて、格子を作りなおす（列・行・角度を変えたときと同じ追従）。
 *  複数の格子を選んでいれば、枠ごとに列を決める（同じ大きさのひし形が、それぞれの枠に並ぶ）。縫い穴を付けているときは、ひし形の1辺が穴の間隔に合うよう少し調整される。
 *  列・行・角度の欄を打ちなおしたら、その数が優先（目標の大きさでの計算はやめる）。 */
let gridTargetMode = false;
/** 枠 region に、目標の大きさ（gridTargetMode のとき）を当てたときの列・行・角度。それ以外は、欄の列・行（角度は欄のまま）。 */
function gridParamsFor(region, cols, rows) {
  if (!gridTargetMode) return { cols, rows, angle: undefined };
  const tw = Number($('patchTargetW').value), th = Number($('patchTargetH').value); if (!(tw > 0) || !(th > 0)) return { cols, rows, angle: undefined, bad: true };
  const xs = region.points.map(q => q.x), ys = region.points.map(q => q.y), bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  return { cols: bw / tw, rows: bh / th, angle: Math.atan(th / tw) * 180 / Math.PI, tw, th, bw, bh };
}
/** 下見・作りなおしの対象の枠（の閉じた領域）：選んだ格子（複数でも）の枠／作りなおせる直前の格子の枠／いま選んでいる枠。 */
function gridTargetRegions() {
  const gs = gridsTouchedBySelection(), lastOnly = !!lastPatch && undo.at(-1) === lastPatch.before && gs.length === 1 && gs[0].id === lastPatch.gridId, out = [];
  const regionOf = frameIds => { const set = new Set(frameIds), mine = doc.shapes.filter(s => set.has(s.id) && visible(s) && stitchable(s)), rs = mine.length ? outerRegions(closedRegions(mine, 0.01, { dashed: true })) : []; return rs.length === 1 ? rs[0] : null; };
  if (gs.length && !lastOnly) { for (const g of gs) { const r = regionOf(g.frameIds); if (r) out.push(r); } return { regions: out, grids: gs }; }
  const follow = !!lastPatch && undo.at(-1) === lastPatch.before; if (!follow && gridsStaleBySelection().length) return { regions: [], grids: [], stale: true };   /* 格子の図形が手で変えられている：選んだピースを「枠」と読み違えない */
  const r = regionOf(follow ? lastPatch.frameIds : [...selectedShapeIds()]); return { regions: r ? [r] : [], grids: [] };
}
/** 目標 幅・高さを変えたとき：対象の枠から列・行・角度の欄を決めて（先頭の枠）、下見を出し、作りなおす。 */
let gridTargetTimer = null;
function gridTargetSoon(el) {
  gridTargetMode = true; clearTimeout(gridTargetTimer); gridTargetTimer = null;
  const run = () => {
    gridTargetTimer = null; if (gesture || stage) return;
    const { regions, stale } = gridTargetRegions(); if (!regions.length) { $('hint').textContent = t(stale ? 'gridStaleEdited' : 'gridTargetNoFrame'); return; }
    const p = gridParamsFor(regions[0], 0, 0); if (p.bad) { $('hint').textContent = t('invalidNumber'); return; }
    $('patchCols').value = String(+p.cols.toFixed(3)); $('patchRows').value = String(+p.rows.toFixed(3)); $('gridAngle').value = String(+p.angle.toFixed(2));   /* 欄に、いまの計算結果を出す（先頭の枠） */
    $('gridResult').textContent = t('gridResult', { c: +p.cols.toFixed(2), r: +p.rows.toFixed(2), a: +p.angle.toFixed(1) });   /* 列・行・角度は「くわしい設定」にしまったので、寸法から決まった値を、ここに出す（事業主 2026-10-25「そもそも縦と横のパッチ寸法あれば不必要では？」→ 案B） */
    gridPreviewUpdate(); regenSoon(gridFieldChanged, el, regenDelayMs * REGEN_PREVIEW_FACTOR);
  };
  if (el.type !== 'number' || !(regenDelayMs > 0)) { run(); return; }
  gridTargetTimer = setTimeout(run, 250);
}
/** 囲まれた図形（実線で閉じた経路・点線は除く）の内側をクリックしたとき：その枠に「格子を作る」と同じ処理をする（列・行・角度のひし形）。柄（アーガイル・市松）の塗りつぶしは廃止（事業主 2026-10-21 案 A「ひし形は『格子を作る』に一本化」）。 */
function gridAtPoint(p) {
  const region = regionAt(doc.shapes.filter(s => visible(s) && stitchable(s)), p);
  if (!region) { if (!gridRescueAt(p)) $('hint').textContent = t('patchNoRegion'); return; }   /* 枠が閉じていないだけなら、隙間を示して「閉じて作る」へ導く */
  if (lastPatch && undo.at(-1) === lastPatch.before && region.shapeIds.every(id => lastPatch.pieceIds?.includes(id))) { regenPatch(true); return; }   /* 直前の格子のピースの上をクリックしたとき：ピースの中に入れ子の格子は作らず、同じ枠を、いまの数で作りなおす（事業主「途中で連動しなくなる」） */
  selected = new Set(region.shapeIds); makeGrid();
}
let gridPreview = null;   /* 確定前の下見：{ pieces: [[{x,y}…]…]（ひし形の輪郭）, text, follow（作りなおす格子があるか）, ids（枠の図形）}。図面が変わる（rebuildSnaps）か Esc で消える。画面に薄い輪郭で描く */
/** 列・行・角度を打っている最中の下見（事業主 2026-10-21 案 A ①）：作りなおす（または作る）枠を、いまの数で割った輪郭と「ひし形 幅×高さ・枚数」をすぐ出す。計算だけで、図面は変えない（約 5ms）。枠は、作りなおせる直前の格子の枠か、いま選んでいる閉じた枠。確定は Enter・約1秒の停止・「格子を作る」。 */
/** 列・行・角度の欄が変わったとき、下見（gridPreviewUpdate）を、最後の変化の 250ms 後に1回だけ出す。下見は枠の計算と全体の再描画で、実図面（475図形・穴918個）では 1回 200〜300ms かかり、矢印キー・▲▼の押しっぱなし（毎秒 20〜30 回）に追いつかず、離したあとも数値が増え続け・減り続けた（事業主 2026-10-23「数値がずっと増え続けたり、減り続けたりする」「矢印も同じ」）。数値の欄（type=number）だけ。テスト（regenDelayMs が 0 以下・数値の欄でない）では、すぐ。 */
let gridPreviewTimer = null;
function gridPreviewSoon(el) {
  clearTimeout(gridPreviewTimer); gridPreviewTimer = null;
  if (el.type !== 'number' || !(regenDelayMs > 0)) { gridPreviewUpdate(); return; }
  gridPreviewTimer = setTimeout(() => { gridPreviewTimer = null; if (gesture || stage) return; gridPreviewUpdate(); }, 250);
}
function gridPreviewUpdate() {
  gridPreview = null;
  { const gs = gridsTouchedBySelection(), lastOnly = !!lastPatch && undo.at(-1) === lastPatch.before && gs.length === 1 && gs[0].id === lastPatch.gridId;
    if (gs.length && !lastOnly) {   /* 選んだ格子（複数でも）：それぞれの枠を、いまの数で割った輪郭を出す */
      const { regions } = gridTargetRegions(); if (!regions.length) { $('hint').textContent = t('gridRebuildNoFrame'); draw(); return; }
      const cols = Number($('patchCols').value) || 2, rows = Number($('patchRows').value) || 2; if (!gridTargetMode && (!(cols >= 1) || !(rows >= 1))) { $('hint').textContent = t('gridNeedColsRows', { c: cols, r: rows }); draw(); return; }
      const pieces = []; let first = null; for (const rg of regions) { const plan = gridPlan(rg, cols, rows); if (plan.msg) { $('hint').textContent = plan.msg; draw(); return; } first = first || plan; pieces.push(...plan.fill.pieces.map(pc => pc.points)); }
      const sp = first.fill.spec; gridPreview = { pieces, follow: false, ids: new Set(gs.flatMap(g => g.ids)), text: t('gridPreview', { w: +sp.w.toFixed(2), h: +sp.h.toFixed(2), a: +sp.theta.toFixed(1), n: pieces.length }) + gridStepsNote(sp) + (gs.length > 1 ? ' ' + t('gridPickedMany', { k: gs.length }) : '') };
      $('hint').textContent = gridPreview.text; draw(); return;
    } }
  const follow = !!lastPatch && undo.at(-1) === lastPatch.before, ids = follow ? new Set(lastPatch.frameIds) : selectedShapeIds();
  if (!follow && gridsStaleBySelection().length) { $('hint').textContent = t('gridStaleEdited'); draw(); return; }
  if (follow && lastPatch.sig === regenSig()) { $('hint').textContent = t('gridPreviewSame'); draw(); return; }   /* いま作ってある格子と同じ数（欄を離れたときの change など） */
  const mine = doc.shapes.filter(s => ids.has(s.id) && visible(s) && stitchable(s)), regions = mine.length ? outerRegions(closedRegions(mine, 0.01, { dashed: true })) : [];
  if (regions.length !== 1) { $('hint').textContent = t('gridFieldsNoFigure'); draw(); return; }   /* 枠が1つに決まらない（選んでいない・ピースだけ選んでいる）ときは、下見は出さず、押す操作を案内する */
  const cols = Number($('patchCols').value) || 2, rows = Number($('patchRows').value) || 2;   /* makeGrid と同じ読み方 */
  if (!gridTargetMode && (!(cols >= 1) || !(rows >= 1))) { $('hint').textContent = t('gridNeedColsRows', { c: cols, r: rows }); draw(); return; }
  const plan = gridPlan(regions[0], cols, rows); if (plan.msg) { $('hint').textContent = plan.msg; draw(); return; }
  const sp = plan.fill.spec;
  gridPreview = { pieces: plan.fill.pieces.map(pc => pc.points), follow, ids, text: t(follow ? 'gridPreview' : 'gridPreviewNew', { w: +sp.w.toFixed(2), h: +sp.h.toFixed(2), a: +sp.theta.toFixed(1), n: plan.fill.pieces.length }) + gridStepsNote(sp) };
  $('hint').textContent = gridPreview.text; draw();
}
/** 下見の薄い輪郭（水色の点線）。作りなおす格子があるか、枠を選んでいる間だけ。 */
function drawGridPreview() {
  if (!gridPreview || exporting) return;
  if (gridPreview.follow ? !(lastPatch && undo.at(-1) === lastPatch.before) : ![...gridPreview.ids].some(id => selected.has(id))) return;
  const px = 1 / scale; ctx.save(); ctx.strokeStyle = 'rgba(94,200,255,0.95)'; ctx.lineWidth = 1.5 * px; ctx.setLineDash([5 * px, 3 * px]); ctx.beginPath();
  for (const ps of gridPreview.pieces) { ps.forEach((q, i) => { if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.closePath(); }
  ctx.stroke(); ctx.restore();
}
/** Enter：待たずに、いまの数で確定する（作りなおせる格子があれば作りなおし・無ければ、選んでいる枠に作る）。予約済みの作りなおしは取り消す。 */
function gridConfirmNow() {
  clearTimeout(regenTimer); regenTimer = null; clearTimeout(regenYield); regenYield = null;
  if (lastPatch && undo.at(-1) === lastPatch.before) { regenPatch(); return; }
  makeGrid();
}
/** Esc：下見をやめ、予約していた作りなおしも取り消す（図面は、数字を変える前のまま。欄の数字はそのまま残る）。Esc は欄を離れさせる（change が作りなおしを予約し直す）ので、そのあとで呼ぶ。 */
function gridPreviewCancel() {
  clearTimeout(gridPreviewTimer); gridPreviewTimer = null;   /* 出す予約も取り消す */
  const text = gridPreview?.text; gridPreview = null; clearTimeout(regenTimer); regenTimer = null; clearTimeout(regenYield); regenYield = null;
  if (text !== undefined) { if ($('hint').textContent === text) $('hint').textContent = ''; draw(); }
}
/** 失敗クリックの救済（事業主 2026-10-21 案 A ②）：クリックした所を囲む閉じた図形が無いとき、2mm 以内の隙間を（計算の上で）閉じたら囲めるなら、その枠を選び、隙間に橙の丸印を出して「閉じて作る」へ導く（図面は変えない）。救済できたら true。 */
function gridRescueAt(p) {
  if (!gaps.length) return false;
  const editableIds = new Set(doc.shapes.filter(s => editable(s)).map(s => s.id)), all = doc.shapes.filter(s => visible(s) && stitchable(s));
  const r = closeGaps(all.filter(s => !s.holeLink), new Set(gaps.flatMap(g => [g.a.id, g.b.id])), 2, 0.01, editableIds); if (!r.closed) return false;
  const m = new Map(r.changes.map(c => [c.id, c.next])), region = regionAt(all.map(s => m.get(s.id) || s), p); if (!region) return false;
  const ids = new Set(region.shapeIds), mine = gaps.filter(g => ids.has(g.a.id) || ids.has(g.b.id)); if (!mine.length) return false;
  selected = new Set(ids); gridPreview = null;
  gapAlert = { ids: new Set(ids), pts: mine.map(g => ({ x: g.x, y: g.y, d: g.d })), i: 0 };
  $('hint').textContent = t('gridRescue', { n: mine.length, d: Math.max(...mine.map(g => g.d)).toFixed(2) }); draw(); return true;
}
/** 「閉じて作る」：選んだ枠の隙間を閉じてから、いまの列・行・角度で格子を作る（取り消しは2回：格子→隙間）。閉じられなかったとき（2mm より大きい・ロック）は、格子を作らない。 */
function closeGapsAndMakeGrid() {
  if (!gapAlert) return;
  selected = new Set(gapAlert.ids);
  if (!closeSelectedGaps()) return;
  const msg = $('hint').textContent, seq = commitSeq; makeGrid();
  if (commitSeq > seq) $('hint').textContent = msg + ' ' + $('hint').textContent;
}
/** 柄・格子のピース（fill）を、囲み（region）の中に描く。縫い合わせ（縫い線・縫い穴）・外周の穴は、カードの設定に従う。p は柄の塗りつぶしでクリックした点（数値を変えたときの作りなおし用）。格子は null。 */
let rimDiamondShiftFrac = 0.4, rimRoundMargin = 0.4;   /* 外周の菱目を、丸目や線をよけてずらせる量（間隔に対する割合） */
/** 作りなおす格子 g の塗り（領域の塗りのうち、格子のピースと枠の図形だけで囲まれたもの）。内側の点と中身を覚える。
 *  事業主 2026-10-26「格子の寸法変えたら色がぐちゃぐちゃに」：作りなおすと古いピースの図形は消えるのに、塗りは古い場所のまま取り残され、新しいピースの上に重なって、色がばらばらに見えた。→ 塗りは、場所についてくる。 */
function gridFillsToCarry(g) {
  const pieces = new Set(g.ids || []), mine = new Set([...pieces, ...(g.frameIds || [])]);
  return (doc.fills || []).filter(fl => (fl.ids || []).length && fl.points?.length && fl.ids.some(id => pieces.has(id)) && fl.ids.every(id => mine.has(id))).map(fl => {
    const xs = fl.points.map(q => q.x), ys = fl.points.map(q => q.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), inside = [];
    for (let i = 1; i <= 9; i++) for (let j = 1; j <= 9; j++) { const q = { x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * j / 10 }; if (fillContains(fl, q)) inside.push(q); }   /* 抜き（穴）の中の点は使わない */
    const mean = inside.length ? { x: inside.reduce((m, q) => m + q.x, 0) / inside.length, y: inside.reduce((m, q) => m + q.y, 0) / inside.length } : null;
    return { fl, pts: [...(mean && fillContains(fl, mean) ? [mean] : []), ...inside.filter((_, k) => k % Math.max(1, Math.floor(inside.length / 4)) === 0).slice(0, 4)] };
  });
}
/** 作りなおした格子（新しい図形 newIds）で、覚えておいた塗りの内側の点を囲む場所を取り直し、同じ色・質感の塗りにする。古い塗りは消す（取り残さない）。場所が見つからない塗りは、数えて知らせる。commit の中で呼ぶ。 */
function carryGridFills(plans, newIds) {
  if (!plans.length) return { moved: 0, lost: 0 };
  const shapes = regionShapes(), rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), made = new Map(), deadline = Date.now() + fillProbeBudgetMs; let lost = 0;
  for (const { fl, pts } of plans) {
    if (Date.now() > deadline) { lost++; continue; }
    let r = null; for (const p of pts) { r = enclosedAreaAt(shapes, p) || enclosedAreaAt(shapes, p, { gaps: [0.1, 0.3] }); if (r && r.ids.some(id => newIds.has(id))) break; r = null; }
    if (!r) { lost++; continue; }
    const { id: _i, points: _p, holes: _h, ids: _d, area: _a, ...payload } = fl; made.set([...r.ids].sort().join(','), { ...payload, points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10 });   /* 同じ場所に重なれば、あとに塗ったほう */
  }
  const gone = new Set(plans.map(p => p.fl.id)), list = (doc.fills || []).filter(f => !gone.has(f.id)), same = (o, nf) => o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id));
  const add = [...made.values()]; for (const nf of add) nf.id = freshId(list.concat(add.filter(x => x.id)), 'f');
  doc.fills = list.filter(o => !add.some(nf => same(o, nf))).concat(add);
  return { moved: add.length, lost };
}
function patchFillApply(region, fill, layer, opts = {}) {
  const exact = opts.exactPitch > 0 ? opts.exactPitch : null;   /* 穴の間隔 exact（縫い線は縁から exact/2 内側・境をまたいだ向かいの穴も exact） */
  const tool = $('patchStitch').checked ? patchHoleTool() : null, inset = exact / 2, banEdge = $('patchEdgeBan').checked && tool?.kind === 'diamond';
  const seamTool = tool ? patchHoleTool('round') : null;   /* 縫い合わせの穴は、いつも丸ギリ（事業主指示 2026-10-21「丸ギリをデフォルトにすること。外周以外は菱目になることはありません」）。外周の穴だけ、穴の種類の設定のまま */
  if (tool && !(inset > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const rimOn = !!tool && $('patchRim').checked, rimOffset = Number($('patchRimOffset').value), rimPitch = Number($('patchRimPitch').value), rimRadius = Number($('patchRimRadius').value);
  if (rimOn && !(rimOffset > 0 && rimPitch > 0 && rimRadius >= 0)) { $('hint').textContent = t('invalidNumber'); return; }
  if (rimOn && banEdge && rimOffset < PATCH_EDGE_MIN_MM - 1e-9) { $('hint').textContent = t('patchEdgeBanned', { d: rimOffset, m: PATCH_EDGE_MIN_MM }); return; } /* 外周の菱目も縁から2.5mm以内に置かない */
  if (rimOn && rimOffset < patchHoleWebR(tool) - 1e-9) { $('hint').textContent = t('patchRimTooClose', { m: +patchHoleWebR(tool).toFixed(2), w: PATCH_HOLE_WEB_MM }); return; } /* 穴のふちと縁のあいだが 1.5mm 未満になる近さ */
  const rim = rimOn ? rimLine(region.points, rimOffset, rimRadius) : null; if (rimOn && !rim) { $('hint').textContent = t('patchRimFail'); return; }
  let stitched = null, rimInfo = null, ringShift = null, pieceIds = [], allIds = [], gridPathIds = [], gridRecId = null, carried = null; const depth0 = undo.length, seq0 = commitSeq, carryPlans = opts.replace ? gridFillsToCarry(opts.replace) : [];   /* 作りなおす格子の塗り（古いピースが消える前に、内側の点を覚える） */
  commit(() => {
    if (opts.replace) removeGridItems(opts.replace);   /* 作りなおし：前の格子の図形・穴・縫い合わせを消し、動かした外周の穴を元の位置へ戻してから、作る（同じ1回の取り消しにまとまる） */
    const polys = fill.pieces.map(pc => pc.points.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) })));
    const texA = textureById($('patchTexA').value)?.id || null, texB = textureById($('patchTexB').value)?.id || null; /* 柄の2色に貼る革の質感（選んでいなければ貼らない） */
    const extraIds = [];   /* 縫い線・外周線の図形（見えない補助の線）：選択に入れて、削除・移動・コピーで穴が取り残されないようにする */
    const ids = pieceIds = polys.map((points, i) => { const id = freshId(doc.shapes, 's'), tex = fill.pieces[i].parity ? texB : texA; doc.shapes.push({ id, layer, type: 'polyline', closed: true, points, ...(tex ? { texture: tex } : {}) }); return id; });
    selected = new Set(ids);
    for (const tl of [tool, seamTool]) if (tl && !doc.tools.some(x => x.id === tl.id)) doc.tools.push({ ...tl }); /* 穴が指す工具が無いと困るので、新しく作った工具は登録する */
    if (tool) { /* クロスステッチ：穴は境界の上ではなく、各ピースの縁から inset mm 内側の縫い線（黄色の点線）の上に打ち、境界をはさんで向かい合う穴を対にする */
      const stitch = patchInsetStitch(polys, inset), stitchLayer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || layer, style = seamStyleValue();
      const pathOfPiece = stitch.insets.map(pts => {
        if (!pts) return null;
        const sid = freshId(doc.shapes, 's'); doc.shapes.push({ id: sid, layer: stitchLayer, type: 'polyline', closed: true, points: pts.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) })), color: 'yellow', lineStyle: 'dashed', holeLink: true }); extraIds.push(sid);   /* 見えない補助の線（事業主「菱目ラインをつなぐ点線の意味がわからない。不要です」） */
        const pid = freshId(doc.paths, 'p'); doc.paths.push({ id: pid, shapeIds: [sid], reversed: false, closed: true, segments: [], mark: 'tool', grid: true }); gridPathIds.push(pid); return pid;   /* grid：格子が作った縫い線の経路（消すときは、穴も一緒に消す） */
      });
      for (const s of stitch.seams) doc.seams.push({ id: freshId(doc.seams, 'seam'), a: { pathId: pathOfPiece[s.a.piece], from: s.a.from, to: s.a.to }, b: { pathId: pathOfPiece[s.b.piece], from: s.b.from, to: s.b.to }, style, reversed: s.reversed });
      if (rimOn && !$('patchKeepSize')?.checked) ringShift = shiftRingHolesOffBoundaries(region.points, rimOffset);   /* 「調整しない」を入れたときは、すでにある外周の菱目（ベースに均等に打ったもの）を動かさない（事業主 2026-10-26「まだ菱目が自動調整されてしまう」：16個が動いていた） */   /* すでにある外周の菱目が、パッチの境目に重なっていたら、線に沿ってずらす（裏面も同じだけ）。先に動かして、そのあとの新しい外周・縫い合わせの丸目が避ける */
      const holes = !stitch.seams.length ? 0 : latticeSeamHoles(stitch, pathOfPiece, seamTool, exact, loopSampler(region.points)), banned = 0;   /* region.points＝枠の輪郭（外周に近い端の見分けに使う）。縫い合わせの丸目を先に打つ：丸目は1個も省かず、外周の菱目のほうが、丸目をよけて縁に沿ってずれる（事業主 2026-10-25「丸目が途中で抜けている」→「丸目を残して菱目をずらす」。以前は菱目が先で、近い丸目を省いていた） */
      if (rim) { /* 外周：縁から rimOffset mm 内側へ寄せた角丸の線（黄色の点線）の上に、線・丸目・ほかの穴と重ならないよう菱目を打つ（重なる所は、菱目が縁に沿ってずれる・ずらしても離れない菱目は省く） */
        const sid = freshId(doc.shapes, 's'); doc.shapes.push({ id: sid, layer: stitchLayer, type: 'polyline', closed: true, points: rim.points, color: 'yellow', lineStyle: 'dashed', holeLink: true }); extraIds.push(sid);
        const pid = freshId(doc.paths, 'p'), saved = { id: pid, shapeIds: [sid], reversed: false, closed: true, segments: [], mark: 'tool', rim: true }; doc.paths.push(saved); gridPathIds.push(pid);   /* rim：外周の穴の経路（点検で使う） */
        const toolKind = new Map(doc.tools.map(x => [x.id, x.kind])), roundHoles = tool.kind === 'round' ? [] : doc.holes.filter(h => toolKind.get(h.toolId) === 'round'), otherHoles = tool.kind === 'round' ? doc.holes : doc.holes.filter(h => toolKind.get(h.toolId) !== 'round');   /* 丸目（縫い合わせ）は、菱目から reach 以内に入れない。菱目の外周を作るときだけ分ける */
        const route = resolvePath(doc, saved), clearR = patchHoleWebR(tool), others = patchObstacles(clearR), near = holeGrid(otherHoles, rimPitch * 0.5), loop = loopSampler(rim.points);   /* 新しい外周の菱目：穴のふちから縁・境目まで 1.5mm */
        const reach = Math.max(seamTool.holeW, seamTool.holeH) / 2 + Math.max(tool.holeW, tool.holeH) / 2 + rimRoundMargin, roundNear = holeGrid(roundHoles, Math.max(reach, 0.5)), r2 = reach * reach;   /* 丸目の半径＋菱目の半径＋0.4mm（約1.45mm） */
        const clearOfRound = q => { const cx = Math.floor(q.x / roundNear.cell), cy = Math.floor(q.y / roundNear.cell); for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) for (const h of roundNear.grid.get(i + ',' + j) || []) if ((h.x - q.x) ** 2 + (h.y - q.y) ** 2 < r2) return false; return true; };
        const anchors = otherHoles.map(h => loop.nearest(h)).filter(m => m.dist < 0.6).map(m => m.s); /* 外周の線の上にすでにある穴（前の操作の菱目）＝そのまま使い、間を埋める。丸目は数えない */
        const freeAt = s => { const q = loop.at(s); return rimSpotFree(q, others, clearR, near) && clearOfRound(q); };
        const byRuns = !anchors.length && roundHoles.length ? rimHolePositionsByRuns(loop.total, rimPitch, freeAt) : null;   /* 丸目がある外周：置ける範囲ごとに等分する（丸目にはさまれた狭い空きにも1つ入り、空きの両側が空きすぎない） */
        const spots = route ? (byRuns || rimHolePositions(loop.total, rimPitch, freeAt, { anchors, maxShift: rimDiamondShiftFrac })).map(s => { const want = loop.at(s), q = pointAtLength(route, s); return distance(q, want) < 1e-3 ? q : projectOnPath(route, want); }) : []; /* 位置は軽い道具で探し、経路上の弧長・向きへ直す（経路の向き・始点が違うときだけ投影で求める） */
        if (route && spots.length) placeHoles(saved, route, spots, { ...tool, pitch: rimPitch });
        rimInfo = { n: spots.length, d: rimOffset, r: rim.radius };
      }
      stitched = { seams: stitch.seams.length, holes, banned, inset };
    }
    allIds = [...ids, ...extraIds]; selected = new Set(allIds);
    if (opts.frameIds) { gridRecId = opts.replace?.id || freshId(doc.grids || [], 'g'); doc.grids = (doc.grids || []).filter(g => g.id !== gridRecId); doc.grids.push({ id: gridRecId, frameIds: [...opts.frameIds], ids: allIds.slice(), pieceIds: ids.slice(), pathIds: gridPathIds.slice(), restore: ringShift?.restore || [], settings: gridSettingsNow() }); }   /* 格子の記録：どの枠から、何を作り、どんな設定か（パッチの線や枠を選んだとき、その格子だけを作りなおせる） */
    if (carryPlans.length) carried = carryGridFills(carryPlans, new Set(allIds));   /* 古い塗りは、新しいピースの上へ（同じ1回の取り消しにまとまる） */
  });
  renderSeams(); if (gridRecId && commitSeq !== seq0) rearmGrids([gridRecId]);   /* 作った直後の格子も、続けて数字に追従できる状態に */
  if (opts.frameIds && commitSeq !== seq0) lastPatch = { frameIds: opts.frameIds, before: undo.at(-1), pieceIds, allIds, sig: regenSig(), gridId: gridRecId };   /* 図面が変わったか（commitSeq）で見る：履歴が満杯（100件）のときは長さが増えない（不具合のレビュー：満杯だと数値に連動しなかった） */
  const ringShiftNote = ringShift ? (ringShift.moved ? ' ' + t('ringShiftDone', { n: ringShift.moved, d: +ringShift.maxD.toFixed(2) }) + (ringShift.mirrored ? ' ' + t('ringShiftMirror', { m: ringShift.mirrored }) : '') + (ringShift.ambiguous ? ' ' + t('ringShiftAmbig', { n: ringShift.ambiguous }) : '') : '') + (ringShift.stuck ? ' ' + t('ringShiftStuck', { n: ringShift.stuck }) : '') : '';
  const rimNote = rimInfo ? ' ' + (rimInfo.n ? t('patchRimMade', { n: rimInfo.n, d: rimInfo.d, r: +rimInfo.r.toFixed(1) }) : t('patchRimNone')) + (rimInfo.r < rimRadius - 1e-9 ? ' ' + t('patchRimRadiusCut', { R: rimRadius, r: +rimInfo.r.toFixed(1) }) : '') : '';
  const chk = rimInfo ? rimBoundaryProblems() : null, rimCheckNote = chk && chk.total ? ' ' + (chk.bad.length ? t('rimCheckBadShort', { n: chk.bad.length }) : t('rimCheckOkShort')) : '';   /* 外周の穴が、パッチの境目にかかっていないか */
  $('hint').textContent = (stitched ? t('patchStitched', { n: fill.pieces.length, d: fill.dropped, s: stitched.seams, h: stitched.holes, i: stitched.inset }) : t('patchFilled', { n: fill.pieces.length, d: fill.dropped })) + (opts.note ? ' ' + opts.note : '') + ringShiftNote + rimNote + rimCheckNote + (carried ? ' ' + t('gridFillsCarried', { k: carried.moved }) + (carried.lost ? ' ' + t('gridFillsLost', { n: carried.lost }) : '') : '');
  gridApplyDone++;   /* ここまで来た＝作れた（作りなおしが、成功か失敗かを見分ける） */
}
function initDesign() {
  $('info-part').addEventListener('change', assignPart);
  for (const f of ['thickness', 'partName', 'partOrder']) $('info-' + f).addEventListener('change', () => applyPartField(f));
  $('lamTarget').value = '';   /* 目標の全長は、最初は空（いまの長さを使う） */
  $('lamRun').onclick = () => { runLaminate(); renderLaminateNow(); }; $('lamSection').onclick = makeLamSection; $('lamRelay').onclick = relayRim; $('lamUnfold').onclick = unfoldButtons; $('lamGrow').onclick = growBends; $('lamTidy').onclick = tidyLaminate;
  $('flowFoldMode').onchange = () => { if (!lockGate('fold')) { renderFoldFlow(); return; } $('fdMode').value = $('flowFoldMode').value; $('fdMode').onchange(); if (foldIsBifold()) $('foldFlowMore').open = true; renderFoldFlow(); };   /* 小窓の「折り方」＝折り設計カードの「折り方」（同じ処理） */
  $('flowBook').onchange = () => setFoldBook({ kind: $('flowBook').value }); $('flowRingSpec').onchange = () => setFoldBook({ spec: $('flowRingSpec').value, dia: '' }); $('flowRingDia').onchange = () => setFoldBook({ dia: $('flowRingDia').value }); $('flowStackT').oninput = () => setFoldBook({ stack: $('flowStackT').value });   /* ⓪：リングとリフィルを、断面を作る前に決める */
  $('fhbVal').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyFoldHandleBar(); } else if (e.key === 'Escape') { e.stopPropagation?.(); closeFoldHandleBar(); } }); $('fhbSame').onclick = () => applyFoldHandleBar(true); $('fhbClose').onclick = closeFoldHandleBar;   /* 断面の取っ手の数字の小窓 */
  $('flowMake').onclick = () => { const s = foldBookState(); if (!foldBookComplete(s)) { $('hint').textContent = t(s.kind === 'book' ? 'foldFlowBookIncomplete' : 'foldFlowBookFirst'); $('flowBook').focus?.(); return; } applyFoldBook(false); $('fdMake').click(); };   /* ⓪が決まるまで①は進めない（案内を出す）。決まっていれば、⓪の値を欄に写してから、今までの「断面を作る」を押す */
  for (const [from, to] of [['flowFix', 'fdFix'], ['flowStitch', 'fdStitch'], ['flowRelay', 'lamRelay'], ['flowGrow', 'lamGrow'], ['flowSection', 'lamSection'], ['flowUnfoldPlan', 'fdUnfold'], ['flowUnfold', 'lamUnfold'], ['flowTidy', 'lamTidy']]) $(from).onclick = () => $(to).click();   /* 「三つ折りの手順」のボタンは、今あるボタンと同じ処理（押したことにする）。id・処理は変えない */
  const openFlowCard = id => { const c = $(id); if (!c) return; c.open = true; revealCard(c); c.scrollIntoView?.({ block: 'nearest' }); }; $('flowOpenDesign').onclick = () => openFlowCard('foldDesignCard'); $('flowOpenLam').onclick = () => { $('lamSubCard').open = true; openFlowCard('designCard'); };   /* 「くわしい設定」：数字を入れるカードを開く */ $('lamAutoParts').onclick = () => { makeFoldUnfoldParts(); renderLaminateNow(); }; $('lamMakeOuter').onclick = () => makeLamPart('o'); $('lamMakeInner').onclick = () => makeLamPart('i'); $('lamOuter').addEventListener('change', () => { laminateThickFromPart('o'); renderLaminateNow(); }); $('lamInner').addEventListener('change', () => { laminateThickFromPart('i'); renderLaminateNow(); });
  $('lamTOuter').addEventListener('input', () => { lamTouched.o = true; renderLaminateNow(); }); $('lamTOuter').addEventListener('change', () => saveLamThickness('o')); $('lamTInner').addEventListener('change', () => saveLamThickness('i')); $('lamTInner').addEventListener('input', () => { lamTouched.i = true; renderLaminateNow(); }); $('lamAxis').addEventListener('change', renderLaminateNow); $('lamSubCard').addEventListener('toggle', () => { if ($('lamSubCard').open) { fillLaminateParts(); renderLaminateNow(); } });
  $('newPart').onclick = newPart; $('addFold').onclick = addFoldAllowance; $('applyStack').onclick = applyStack;
  $('offsetRun').onclick = () => runOffset();
  for (const id of ['rb-ax', 'rb-ay', 'rb-bx', 'rb-by']) $(id).addEventListener('input', rulerFromBar);
  /* 図形のそばの入力欄：右のカードの距離・向きと値を共有する */
  $('of-dist').addEventListener('input', () => { $('offsetDist').value = $('of-dist').value; draw(); });
  $('of-side').addEventListener('change', () => { $('offsetSide').value = $('of-side').value; draw(); });
  const reapplyOffsetScope = () => { if (offsetSelection && offsetLast && mode === 'offset') offsetClick(offsetLast, false); else draw(); }; /* 選ぶ範囲（交点間・1辺・全体）を替えたら、同じ場所を選び直す */
  $('of-scope').addEventListener('change', () => { $('offsetScope').value = $('of-scope').value; reapplyOffsetScope(); });
  $('offsetScope').addEventListener('change', () => { $('of-scope').value = $('offsetScope').value; reapplyOffsetScope(); });
  $('offsetDist').addEventListener('input', () => { $('of-dist').value = $('offsetDist').value; draw(); });
  $('offsetSide').addEventListener('change', () => { $('of-side').value = $('offsetSide').value; draw(); });
  for (const id of ['of-dist', 'of-side']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runOffset(); } });
  $('of-run').onclick = () => runOffset();
  $('of-close').onclick = () => { offsetSelection = null; draw(); canvas.focus(); };
  $('df-run').onclick = runDetour; $('df-close').onclick = () => { detourState = null; draw(); canvas.focus(); }; for (const id of ['df-clear', 'df-radius']) $(id).addEventListener('input', () => draw());
  $('offsetDist').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runOffset(); } });
  $('patchShiftL').onclick = () => nudgePatch(-1, 0); $('patchShiftR').onclick = () => nudgePatch(1, 0); $('patchShiftU').onclick = () => nudgePatch(0, -1); $('patchShiftD').onclick = () => nudgePatch(0, 1); $('patchShiftReset').onclick = resetPatchShift; $('patchSymmetry').onclick = symmetrizePatch;
  for (const id of ['patchRim', 'patchRimOffset', 'patchRimPitch', 'patchRimRadius', 'patchShiftX', 'patchShiftY', 'patchStitch', 'patchHole', 'patchEdgeBan', 'patchPreferNear', 'patchKeepSize', 'patchMinPiece', 'patchPitch', 'patchTol', 'patchClear', 'stitchTool', 'patchTexA', 'patchTexB']) { const el = $(id), go = () => regenSoon(regenPatch, el); el.addEventListener('input', go); el.addEventListener('change', go); }
  for (const id of ['patchCols', 'patchRows', 'gridAngle']) { const el = $(id), go = () => { gridTargetMode = false; $('gridResult').textContent = ''; if (id === 'patchRows' && String($('gridAngle').value ?? '').trim() !== '') { $('gridAngle').value = ''; }   /* 行を打ったら、角度の欄を空にする：角度（初期値45）が数字のままだと、ひし形の高さは幅×角度で決まり、行は目安にしかならず、列×行の数が合わなくなる（事業主 2026-10-25「列と行は3＊3なのに、数が合わない」）。45°にしたいときは、角度に打つ */
    gridPreviewSoon(el); regenSoon(gridFieldChanged, el, regenDelayMs * REGEN_PREVIEW_FACTOR); }; el.addEventListener('input', go); el.addEventListener('change', go); el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); gridConfirmNow(); } }); }   /* 列・行・角度は「格子を作る」用 */
  for (const id of ['patchTargetW', 'patchTargetH']) { const el = $(id), go = () => gridTargetSoon(el); el.addEventListener('input', go); el.addEventListener('change', go); }   /* 目標 幅・高さ＝ひし形1枚の大きさ：入れると、列・行・角度を決めて格子を作りなおす */
  $('showJunctions').addEventListener('change', () => { rebuildSnaps(); draw(); });
  for (const id of ['arcMethod', 'arcDir']) $(id).addEventListener('change', () => { if (mode === 'arc' && !stage) $('hint').textContent = modeHint('arc'); }); /* 描き方を変えたら案内文も変える */
  $('ctx-lib').onclick = () => { hideCtxMenu(); const raw = window.prompt(t('libNamePrompt'), ''), name = raw && raw.trim() ? raw.trim() : null; if (name) saveToLibrary(name); }; /* 右クリック → 部品ライブラリに登録 */
  $('ctx-outline').onclick = () => { countUse('ctx_outline'); hideCtxMenu(); selectOutline(); }; $('selOutline').onclick = () => selectOutline(); $('ctx-dedupe').onclick = () => { countUse('ctx_dedupe'); hideCtxMenu(); mergeSelectionOverlaps(); }; $('selDedupe').onclick = () => mergeSelectionOverlaps();   /* 外周の線だけ選ぶ（右クリック・左メニュー） */
  $('ctx-unpaint').onclick = () => { countUse('ctx_unpaint'); hideCtxMenu(); unpaintSelection(); }; $('unpaintSel').onclick = () => unpaintSelection();   /* 選んだ範囲の色塗りを全部消す（右クリック・塗りの色カード） */
  $('ctx-textfont').onclick = () => { countUse('ctx_textfont'); hideCtxMenu(); openTextFontWin(); }; $('tfApply').onclick = runTextFontApply;   /* 右クリック → 文字のフォントと大きさ（選んだ文字を、まとめて・事業主指示 2026-10-26） */
  $('ctx-holeshape').onclick = () => { countUse('ctx_holeshape'); hideCtxMenu(); openHoleShapeWin(); };   /* 右クリック → 菱目・丸目をまとめて変える（選んだ範囲の穴の形と大きさ・事業主指示 2026-10-26） */
  $('holeShapeKind').addEventListener('change', syncHoleShapeRows); $('holeShapeApply').onclick = runHoleShapeApply; $('holeShapeErase').onclick = runHoleShapeErase; $('holeShapeScope').addEventListener('change', () => refreshHoleShapeCard(true));
  $('ctx-mark').onclick = () => { countUse('ctx_mark'); hideCtxMenu(); setMode('mark'); }; $('ctx-divide').onclick = () => { countUse('ctx_divide'); hideCtxMenu(); setMode('divide'); };   /* 右クリック → 目印・分割線（左のツール列から移した・機能の整理・事業主指示 2026-10-26。キー Shift+M・W は今までどおり） */
  $('ctx-stitch').onclick = () => { countUse('ctx_stitch'); hideCtxMenu(); setMode('stitch'); };   /* 右クリック → 目打ち（左のツール列から移した・機能の整理・事業主指示 2026-10-26。キー Shift+S は今までどおり。駒合わせ・柄と同じ） */
  $('ctx-koma').onclick = () => { hideCtxMenu(); setMode('koma'); };   /* 右クリック → 駒合わせ（左のツール列から移した・難しくてあまり使われないため・事業主指示 2026-10-20。キー K は今までどおり） */
  $('ctx-patch').onclick = () => { hideCtxMenu(); setMode('patchfill'); };   /* 右クリック → 柄（パッチワーク）（左のツール列から移した・工房専用の機能のため・事業主指示 2026-10-20。キー Shift+P・有料版のロック🔒は今までどおり＝setMode の中の lockGate） */
  $('ctx-offset').onclick = () => { countUse('ctx_offset'); hideCtxMenu(); openOffsetSelBar(false); }; $('ctx-offset-solid').onclick = () => { countUse('ctx_offset_solid'); hideCtxMenu(); openOffsetSelBar(true); };   /* 右クリックで選んだら、すぐ実行せず、距離を入れる小窓を出す（事業主 2026-10-26「右クリック直後のオフセットコマンド選択後に数値を入れる」）。実線は、元の図形と同じ層・同じ色 */
  $('ctx-chamfer').onclick = e => { e?.stopPropagation?.(); const sub = $('ctxChamferSub'); sub.hidden = !sub.hidden; };   /* 右クリック → 面取り（丸・角）：押すと、丸め・面取りの2つが、その下に開く（左の「編集」から移した・事業主指示 2026-10-26「面取り（丸、角）として統合」。キー F・Shift+C は今までどおり） */
  $('ctx-fillet').onclick = () => { countUse('ctx_fillet'); hideCtxMenu(); setMode('fillet'); }; $('ctx-chamferc').onclick = () => { countUse('ctx_chamfer'); hideCtxMenu(); setMode('chamfer'); };
  $('ctx-offsettool').onclick = () => { countUse('ctx_offsettool'); hideCtxMenu(); setMode('offset'); }; $('ctx-trim').onclick = () => { countUse('ctx_trim'); hideCtxMenu(); setMode('trim'); }; $('ctx-mirror').onclick = () => { countUse('ctx_mirror'); hideCtxMenu(); setMode('mirror'); };   /* オフセット・トリム・線対称：左の「編集」「選択中」から移した（キー O・Shift+T・M は今までどおり）。線対称は、図形を選んでいるときだけ出る（左のボタンが押せない条件と同じ） */
  $('ctx-center').onclick = () => { hideCtxMenu(); centerOnStart('xy'); };
  $('ctx-lattice').onclick = () => { hideCtxMenu(); removeLatticeLines(); };
  $('ctx-round').onclick = () => { hideCtxMenu(); removeLatticeLines('round'); };   /* 事業主 2026-10-25「丸目も消したい。格子と丸目の両方を消すこともある」 */
  $('ctx-diamond').onclick = () => { hideCtxMenu(); removeLatticeLines('diamond'); };   /* 事業主 2026-10-26「菱目だけ消したい」 */
  $('ctx-lattice-round').onclick = () => { hideCtxMenu(); removeLatticeLines('both'); };
  $('ctx-move').onclick = () => { hideCtxMenu(); setCardWin('moveCard', true); $('moveDx').focus?.(); $('moveDx').select?.(); };   /* 移動のカードは、右列でなく窓で開く（事業主指示 2026-10-21） */   /* 右クリック → 移動…（選んだ図形・菱目を、距離を入れて動かす。移動カードを開いて距離の欄に入る・事業主の質問 2026-10-20「菱目の移動のボタンがみつからない」） */
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
  $('flowGuide').onclick = () => { if (typeof window.open === 'function') { const w = window.open('guide.html#fold', 'ncad-guide'); w?.focus?.(); } }; /* 「三つ折りの手順」の小窓の末尾：図解ガイドの「11 三つ折りの手順」を直接開く（初めて開いた人向け・事業主指示 2026-10-20）。同じ名前のタブを使い回す */
  $('foldFlowClose').onclick = () => setFlowWin(false);   /* 手順の小窓の✕（開くのは右クリックメニューの三つ折りの分類の末尾のⓘ・fillCtxCards） */
  $('patchFill').onclick = () => { if (!lockGate('patchwork')) return; setMode('patchfill'); $('hint').textContent = t('hint.patchfill'); };
  /* 窓の×と、見出しのドラッグ（柄・目打ち・拡大縮小・移動の窓で共通）。×＝柄・目打ちは、そのツールをやめる（選択ツールへ）／拡大縮小・移動は、窓を右列のカードへ戻す（見出し summary の開閉は起こさない）。
     窓は、見出しをつかんで動かせる（画面の外へは出さない）。窓でないとき（右列のカード）は動かさず、今までどおり見出しで開閉する */
  for (const [card, { head: headId, close: closeId, tool, back, hide }] of Object.entries({ patchCard: { head: 'patchWinHead', close: 'patchWinClose', tool: true }, stitchCard: { head: 'stitchWinHead', close: 'stitchWinClose', tool: true }, scaleCard: { head: 'scaleWinHead', close: 'scaleWinClose', tool: false }, moveCard: { head: 'moveWinHead', close: 'moveWinClose', tool: false }, layerCard: { head: 'layerWinHead', close: 'layerWinClose', tool: false, back: false }, holeShapeCard: { head: 'holeShapeWinHead', close: 'holeShapeWinClose', tool: false, back: false, hide: true }, textFontCard: { head: 'textFontWinHead', close: 'textFontWinClose', tool: false, back: false, hide: true } })) {
    $(closeId).addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (tool) setMode('select'); else setCardWin(card, false, back !== false); if (hide) $(card).hidden = true; });   /* hide＝右列のカードに戻さず、閉じたら隠す（「菱目・丸目をまとめて変える」は、開くのは右クリックだけ） */
    const head = $(headId); let drag = null; const isWin = () => $(card).dataset.win === '1';
    head.addEventListener('click', e => { if (isWin()) e.preventDefault(); });   /* 窓のときは、見出しを押しても（ドラッグの後も）たたまない */
    head.addEventListener('pointerdown', e => { if (!isWin() || e.target?.closest?.('button')) return; const r = $(card).getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width }; head.setPointerCapture?.(e.pointerId); });
    head.addEventListener('pointermove', e => { if (drag) placeCardWin(card, e.clientX - drag.dx, e.clientY - drag.dy, drag.w); });
    const endDrag = () => { drag = null; }; head.addEventListener('pointerup', endDrag); head.addEventListener('pointercancel', endDrag);
  }
  $('komaMakeLine').onclick = makeKomaLines; $('komaSeamPick').onclick = () => { komaSeamPicking = !komaSeamPicking; syncKomaBar(); $('hint').textContent = komaSeamPicking ? t('komaSeamPickHint') : t('hint.koma'); draw(); }; $('komaSeamClear').onclick = komaSeamClearAll; $('komaClose').onclick = () => setMode('select'); $('optimizePatch').onclick = optimizePatch; $('suggestSizes').onclick = suggestSizes; $('makeGrid').onclick = makeGrid; $('gapCloseMake').onclick = closeGapsAndMakeGrid; $('checkRimBoundary').onclick = rimBoundaryCheck;
  $('clearSeams').onclick = () => { commit(() => { doc.seams = []; }); pairLines = []; renderSeams(); };
  $('clearPairs').onclick = () => { pairLines = []; draw(); };
  renderSeams();
}

function initInfo() {
  for (const f of ['x','y','x1','y1','x2','y2','cx','cy','r','startDeg','endDeg','length','text','sizeMm','angleDeg','offset','closed','inner','layer','color','lineStyle','font','textColor']) $('info-' + f).addEventListener('change', () => applyInfo(f));
  $('info-textColorReset').onclick = () => { const s = infoShape(); if (!s || s.type !== 'text' || !editable(s) || !('textColor' in s)) return; const next = { ...s }; delete next.textColor; transformSelectedTo(next); };   /* 標準の色に戻す（色の指定を消す） */
  $('toggleSmooth').onclick = () => { const s = infoShape(); if (!s || s.type !== 'path' || !nodeSel || nodeSel.id !== s.id || !editable(s)) return; const nodes = s.nodes.map(n => ({ ...n })), n = nodes[nodeSel.index];
    if (n.smooth) { n.smooth = false; } else { const prev = nodes[(nodeSel.index - 1 + nodes.length) % nodes.length], nx = nodes[(nodeSel.index + 1) % nodes.length], d = { x: nx.x - prev.x, y: nx.y - prev.y }, l = Math.hypot(d.x, d.y) || 1, k = Math.min(distance(n, prev), distance(n, nx)) / 3; n.smooth = true; n.inX = n.x - d.x / l * k; n.inY = n.y - d.y / l * k; n.outX = n.x + d.x / l * k; n.outY = n.y + d.y / l * k; }
    transformSelectedTo({ ...s, nodes }); };
  $('removeNode').onclick = () => { const s = infoShape(); if (!s || s.type !== 'path' || !nodeSel || nodeSel.id !== s.id || !editable(s)) return; const next = pathRemoveNode(s, nodeSel.index); if (!next) { $('hint').textContent = t('impossible'); return; } nodeSel = null; transformSelectedTo(next); };
  $('unroll').onclick = unrollSelection;
  $('closeGaps').onclick = closeSelectedGaps; $('mergeLines').onclick = mergeSelectedLines; $('splitLines').onclick = splitSelectedAtIntersections; $('offsetSel').onclick = offsetSelectedShapes;
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
let regGateOn = REG_GATE_ON; /* false の間は、未登録でも保存・書き出し・印刷を通す（一時解除。registration.js の REG_GATE_ON） */
function regGuard(feature, kind = '') {
  if (!registration.enabled()) return true;
  if (registration.allowed()) { registration.track(feature, kind); registration.refresh(); return true; }
  if (!regGateOn) return true;
  openRegistration(); return false;
}
/** 有料版の機能のロック（パッチワーク・三つ折り・三面図）。インターネットの公開版（登録サーバーが使えるとき）だけロックがかかり、確認済みのオーナーのメールで利用登録した端末では外れる。
 *  手元で開いたファイル（file://）や開発中（http://localhost）は、ロックしない。 */
const LOCK_NAMES = { patchwork: 'lockPatchwork', fold: 'lockFold', threeview: 'lockThreeView', voiceDesign: 'lockVoiceDesign' };
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
  const designOption = $('voiceTarget')?.querySelector?.('option[value="design"]');
  if (designOption) designOption.disabled = locked;
  if (locked && $('voiceTarget')?.value === 'design') $('voiceTarget').value = 'auto';
  if ($('localDesignCreate')) $('localDesignCreate').disabled = locked || !localDesignPending || localDesignPending.invalid;
}
/** 数値の欄は、すべて共通で、入ったとき（クリック・Tab）に中身を全選択にする。初期値が 0 の欄（向き(°) など）に 90 と打つと 090 になるのを防ぐ（事業主指示 2026-10-17）。マウスで入ったときは、最初のマウスアップのあとで全選択し直して、選択が外れないようにする（2回目以降のクリックは通常どおり、途中にカーソルを置ける）。 */
let numberJustFocused = null;
/** 数値の欄にカーソルがある（フォーカス中）ときにホイールを回すと、数値が勝手に増減して止まらなくなる（事業主「数値がとまらない」）→ ホイールを回したら、欄からフォーカスを外し、カード・ページのスクロールにする。 */
function blurNumberOnWheel(e) { const el = e?.target; if (el?.tagName === 'INPUT' && el.type === 'number' && document.activeElement === el) el.blur(); }
document.addEventListener?.('wheel', blurNumberOnWheel, { passive: true });
document.addEventListener?.('focusin', e => { const el = e?.target; if (el?.tagName === 'INPUT' && el.type === 'number') { numberJustFocused = el; setTimeout(() => { try { el.select?.(); } catch { /* 選べない欄は、そのまま */ } }, 0); } else numberJustFocused = null; });
/** マウスで入った最初のマウスアップ：以前は preventDefault で止めて全選択を保っていたが、▲▼（スピンボタン）の「押し終わり」まで止めてしまい、フォーカスの無い欄の▲を1回クリックしただけで、数値が毎秒20ずつ増え続け、別の所をクリックするまで止まらなかった（事業主 2026-10-23「数値が止まらない」・実ブラウザ（公開版）で再現し、この処理を外すと1回で止まることを確認）。止めずに、マウスアップのあとで全選択し直す（全選択が外れない見た目は同じ）。 */
document.addEventListener?.('mouseup', e => { const el = numberJustFocused; if (el && e?.target === el) { numberJustFocused = null; setTimeout(() => { try { el.select?.(); } catch { /* 選べない欄は、そのまま */ } }, 0); } });
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
/** 書き出したファイルの保存（事業主の希望 2026-10-19「保存場所を指定して保存したい」）：「書き出すとき保存先を選ぶ」（#outAskWhere・既定は入）が入で、ブラウザが保存先の選択（showSaveFilePicker）に対応していれば、保存の窓を開いて、選んだ場所に書く（前回の場所を覚える）。
 *  切・非対応・書き込みの失敗のときは、今までどおりダウンロード（失敗のときは案内を足す）。窓を閉じた（やめた）ときは何も保存しない。data は、文字列・バイト列・Blob、または Blob になる Promise（PNG：窓を先に開いて、画像ができるのを待つ＝窓が開けなくなるのを防ぐ）。onDone(保存したファイル名 or null) は保存できたあとの案内の組み立て。 */
const ASK_WHERE_KEY = 'leather-cad.askWhere', BEAM_FIX_KEY = 'leather-cad.outBeamFix';
function restoreBeamFix() { let v = null; try { v = localStorage.getItem(BEAM_FIX_KEY); } catch { /* 保存できない環境でも続ける */ } if ($('outBeamFix')) $('outBeamFix').checked = v !== '0'; }   /* 「Beam Studio 補正」は初めから入（SVG はレーザー加工用＝Beam Studio で開くのが普通）。切にした選択（'0'）だけ覚える。事業主 2026-10-28「まだオフセットの菱目ラインが Beam Studio でずれる」＝切のまま書き出していた（細い層は 2% 縮む） */
function restoreAskWhere() { try { const v = localStorage.getItem(ASK_WHERE_KEY); if ((v === '0' || v === '1') && $('outAskWhere')) $('outAskWhere').checked = v === '1'; } catch { /* 保存できない環境でも続ける */ } }
function exportFile(name, data, mime, onDone) {
  const askWhere = !!$('outAskWhere')?.checked && typeof globalThis.showSaveFilePicker === 'function';
  const plain = async () => { try { const v = await data; if (!v) return; download(name, v, mime, false); onDone(null); } catch { /* 画像ができなかった：従来どおり、何もしない */ } };   /* 画像（Promise）が空・失敗でも、拒否された Promise を放置しない（放置すると、ブラウザ・テストで未処理のエラーになる） */
  if (!askWhere) { if (data && typeof data.then === 'function') { plain(); return; } download(name, data, mime, false); onDone(null); return; }
  const ext = (name.match(/\.[A-Za-z0-9]+$/) || [''])[0].toLowerCase();
  let picking; try { picking = globalThis.showSaveFilePicker({ suggestedName: name, id: 'ncad-export', types: [{ description: (ext.slice(1) || 'file').toUpperCase(), accept: { [mime]: [ext || '.bin'] } }] }); } catch (err) { picking = Promise.reject(err); }   /* 利用者の操作の直後に、同期で窓を開く */
  (async () => {
    try {
      const handle = await picking, v = await data; if (!v) { $('hint').textContent = t('pngUnavailable'); return; } const w = await handle.createWritable(); await w.write(v instanceof Blob ? v : new Blob([v], { type: mime })); await w.close(); onDone(handle.name || name);
    } catch (err) {
      if (err?.name === 'AbortError') { $('hint').textContent = t('exportCanceled'); return; }
      try { const v = await data; if (!v) { $('hint').textContent = t('pngUnavailable'); return; } download(name, v, mime, false); onDone(null); $('hint').textContent += ' ' + t('exportFallback'); } catch { $('hint').textContent = t('saveFailed', { message: err?.message || String(err) }); }
    }
  })();
}
const savedTo = n => n ? ' ' + t('exportSavedTo', { name: n }) : '';
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
  const svg = preset === 'beam' ? beamStudioSvg(vectorOutDoc(), { kerfMm: Number($('kerf').value) || 0, includeHoles: $('outHoles').checked, beamFix: !!$('outBeamFix')?.checked }) : docToSvg(vectorOutDoc(), { includeHoles: $('outHoles').checked, lineColors: $('outMono')?.checked ? 'mono' : $('outWhiteBlack')?.checked ? 'color-white-black' : 'color', fill: $('outFill').checked && viewShow.colors, textures: $('outFill').checked && viewShow.colors ? svgTextures() : null, textureMm: textureMm(), metalColor: metalHex, diamondFill: diamondMode() === 'fill', beamFix: !!$('outBeamFix')?.checked });
  const beamN = (svg.match(/data-beamfix=/g) || []).length;   /* Beam Studio 補正をかけた層の数（標準の SVG も、方式「Beam Studio」も） */
  exportFile(preset === 'beam' ? 'leather-pattern-beam.svg' : 'leather-pattern.svg', svg, 'image/svg+xml', saved => { $('hint').textContent = t('exported', { name: preset === 'beam' ? 'SVG (Beam Studio)' : 'SVG' }) + outScopeNote() + dedupeNote() + (beamN ? ' ' + t('outBeamFixNote', { n: beamN }) : '') + savedTo(saved); });
}
function exportPdf() {
  const { shapes, holes } = exportTargets($('outHoles').checked); if (exportIsEmpty(shapes, holes)) return;
  if (!regGuard('pdf', 'dl')) return;
  const paper = $('paper').value, bytes = docToPdf(vectorOutDoc(), { paper: paper.startsWith('a3') ? 'a3' : 'a4', landscape: paper.endsWith('l'), includeHoles: $('outHoles').checked, calibration: $('outCalib').checked ? calibration : null, holeDot: printDotMm() });
  exportFile('leather-pattern.pdf', bytes, 'application/pdf', saved => { $('hint').textContent = t('pdfExported', { n: bytes.pages, s: bytes.skippedText }) + outScopeNote() + dedupeNote() + savedTo(saved); });
}
/** 図面を PNG に描いてダウンロード。dpi 指定・白背景／透明。画素数が 5,000 万を超えるときは dpi を落とす。 */
/** PNG 書き出しの余白（mm）。寸法の範囲（bbox）には、寸法線と補助線しか入らず、数字（文字）は含まれない：端にある寸法の数字が、2mm の余白からはみ出して、切れたり、ぎりぎりで読みにくかった。
 *  寸法線・文字があるときは 10mm（数字が 3.5mm でも、まわりに十分あく）。無いときは今までどおり 2mm。 */
const pngMarginMm = shapes => shapes.some(s => s.type === 'dimension' || s.type === 'text') ? 10 : 2;
function exportPng() {
  const selIds = new Set(selected), only = doc.shapes.some(sh => selIds.has(sh.id) && visible(sh)), vis = only ?(sh => visible(sh) && selIds.has(sh.id)) : visible, hvis = only ? (h => holeVisible(h) && (selIds.has(h.id) || !!doc.paths.find(p => p.id === h.pathId)?.shapeIds.some(id => selIds.has(id)))) : holeVisible;   /* 図形を選んでいれば自動で、選んだ図形と、その縫い穴だけ（SVG・印刷・PDF・DXF と同じ「選んでいれば自動」。2026-10-26 事業主「本日も同じ不具合が発生しました。選択した図形のみＰＮＧに出力できない」：PNG だけ、出力カードの「選んだ図形だけ出力」（初期は切）の方式のままだった） */
  const shapes = doc.shapes.filter(vis), holes = doc.holes.filter(hvis), b = bboxOfDoc({ ...doc, shapes, holes });   /* PNG は画面に見えているものを描く（実線・点線の表示切り替えも反映） */
  const scopeNote = ' ' + (only ? t('outScopeSel', { n: shapes.length }) : t('outScopeAll'));   /* 出力のあとの案内に、何が出たかを必ず出す（ほかの書き出しと同じ） */
  if (exportIsEmpty(shapes, holes)) return;
  if (!regGuard('png', 'draw')) return;
  const margin = pngMarginMm(shapes); exportExtentMm = Math.max(b.maxX - b.minX, b.maxY - b.minY);   /* 寸法線の文字が端に来ても切れない余白（事業主 2026-10-25「PNG出力する際にぎりぎりのところの図形の寸法線が見にくい。もう少し余白を取ってほしい」） */
  let dpi = Number($('pngDpi').value) || 300; const wMm = b.maxX - b.minX + 2 * margin, hMm = b.maxY - b.minY + 2 * margin;
  const pixels = d => (wMm / 25.4 * d) * (hMm / 25.4 * d); let lowered = false;
  while (pixels(dpi) > 50e6 && dpi > 10) { dpi = Math.floor(dpi * 0.8); lowered = true; }
  const off = document.createElement('canvas'); if (typeof off.getContext !== 'function') { $('hint').textContent = t('pngUnavailable'); return; }
  const k = dpi / 25.4; off.width = Math.ceil(wMm * k); off.height = Math.ceil(hMm * k);
  const saved = { ctx, width, height, scale, origin }; ctx = off.getContext('2d'); exporting = true;
  width = off.width; height = off.height; scale = k; origin = { x: (margin - b.minX) * k, y: (margin - b.minY) * k };
  exportColor = $('pngColor').checked && viewShow.colors; exportStitch = !!$('pngStitch')?.checked; exportFilter = only ? { vis, hvis, ids: selIds } : null;
  try { if (!$('pngTransparent').checked) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, off.width, off.height); } draw(); }
  finally { ({ ctx, width, height, scale, origin } = saved); exporting = false; exportColor = false; exportStitch = false; exportFilter = null; exportExtentMm = 0; draw(); }
  if (typeof off.toBlob !== 'function') { $('hint').textContent = t('pngUnavailable'); return; }
  exportFile('leather-pattern.png', new Promise(res => off.toBlob(b => res(b || null), 'image/png')), 'image/png', saved => { $('hint').textContent = t('pngExported', { dpi, w: off.width, h: off.height }) + (lowered ? t('pngLowered') : '') + savedTo(saved) + scopeNote; });
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
    const next = withDefaultTool(migrateDoc(raw)); healDoc(next); dropDetachedFills(next);   /* 部品が消えた図形を指したままのファイルも、開くと直る */
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
  const dxf = preset === 'leathercraft' ? leathercraftDxf(vectorOutDoc(), { includeHoles: $('outHoles').checked, originAtCorner: true }) : docToDxfR12(vectorOutDoc(), { includeHoles: $('outHoles').checked, dotAsPoint: $('dotAsPoint').checked });
  if (!dxfToShapes(dxf).length) { $('hint').textContent = t('nothingToExport', { tab: tabs[activeTab]?.name ?? '' }); return; }   /* 図形の無い DXF は保存しない（他のソフトで「取り込める図形がありません」と止まる・2026-10-18）。別の図面タブを書き出していたと分かるよう、タブ名を案内に入れる */
  if (!regGuard('dxf', 'dl')) return;
  exportFile(preset === 'leathercraft' ? 'leather-pattern-lc.dxf' : 'leather-pattern.dxf', dxf, 'application/dxf', saved => { $('hint').textContent = t('exported', { name: preset === 'leathercraft' ? 'DXF (Leathercraft CAD)' : 'DXF' }) + outScopeNote() + dedupeNote() + savedTo(saved); });
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
function printPages(target, { dots = true } = {}) {
  const own = target === undefined; if (own) target = outputDoc();   /* target を省略＝いまの図面（「選んだ図形だけを出力」に従う）。工具のテスト片・校正スケールは target を渡すので対象外 */   /* dots=false：工具のテスト片など、「縫い穴を点で印刷する」を無視して形のまま印刷する */
  if (!regGuard('print', 'pages')) return null;
  const holeDot = dots ? printDotMm() : 0;
  const pageMm = PAGES[$('paper').value] || PAGES.a4, overlapMm = 10;
  const layerShapes = target.shapes.filter(s => target.layers.find(l => l.id === s.layer)?.visible), shapes = layerShapes.filter(s => !s.holeLink), holes = $('outHoles').checked ? target.holes.filter(h => (!target.outSelOnly && holeIsOwn(h, ownHolePathIds(target))) || target.paths.some(p => p.id === h.pathId && p.shapeIds.every(id => layerShapes.some(s => s.id === id))) || target.outHoleIds?.has(h.id)) : [], b = bboxOfDoc({ ...target, shapes, holes });   /* 図形を選んでの印刷は、独立した穴も選んだ範囲だけ（書き出しと同じ・outSelOnly／outHoleIds） */
  if (!b) { $('hint').textContent = t('nothingToPrint'); return null; }
  const calib = $('outCalib').checked ? calibration : null, layout = printLayout(b, pageMm, overlapMm, calib);
  const html = layout.pages.map((p, i) => `<div class="page">${pageSvg(target, p, { pageMm, overlapMm, calibration: calib, label: `${i + 1}/${layout.pages.length}  ${p.col + 1}-${p.row + 1}`, includeHoles: $('outHoles').checked, holeDot })}</div>`).join('');
  $('printArea').innerHTML = html; $('printArea').dataset.pages = String(layout.pages.length);
  document.documentElement.style.setProperty('--page-w', pageMm.w + 'mm'); document.documentElement.style.setProperty('--page-h', pageMm.h + 'mm');
  setPageStyle($('paper').value);
  $('hint').textContent = t('printHint', { n: layout.pages.length }) + (own ? outScopeNote() : '');
  measuredCalibration = { fx: calib?.fx ?? 1, fy: calib?.fy ?? 1 };
  if (typeof window.alert === 'function') window.alert(t('printHint', { n: layout.pages.length }) + (own ? outScopeNote() : ''));
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
/** どの機能がよく使われているかを数える（事業主 2026-10-24「どの機能がよく使われているか、統計を撮りたい」・案A＝今の Google アナリティクスに足す）。
 *  送るのは、機能の名前（ボタン・チェック・カード・ツール・右クリックの項目の id＝画面に最初から付いている短い英数字）と回数だけ。図形・文字・寸法・ファイル名・入力した数値は送らない（kind は英数字24字までに analytics.js が絞る）。
 *  公開版以外・作家の端末（nsf_ga_optout）では何もしない。イベントは ncad_use 1種類にまとめ、機能の名前は kind に入れる（GA4 で kind をカスタムディメンションにすると、機能ごとの回数が見える）。 */
let lastCtxUseAt = 0;
const countUse = (kind, fromClick = false) => {
  const k = String(kind || '').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 24); if (!k) return;
  const now = Date.now();
  if (/^ctx[-_]/.test(k)) { if (fromClick && now - lastCtxUseAt < 150) return; if (!fromClick) lastCtxUseAt = now; }   /* 右クリックの項目は、押した1回が「項目の処理が数える ctx_名前」と「全ボタン共通の数え（項目の id＝ctx-名前）」の2つで数えられていた（GA4 の記録でも二重に出ていた）→ 共通の数えは、直前（150ms 以内）に項目の処理が数えていれば数えない（2026-10-28 利用モニタで気づいた） */
  track.event('ncad_use', { kind: k });
};
function initCounting() {
  track.pageview();
  document.addEventListener?.('click', e => { const b = e?.target?.closest?.('button'), id = b?.id; if (id === 'binderPlace') track.event('ncad_hw_place', { kind: $('binderSpecSel')?.value }); else if (COUNT_CLICKS[id]) track.event(COUNT_CLICKS[id][0], COUNT_CLICKS[id][1] ? { kind: COUNT_CLICKS[id][1] } : {});
    if (b) { const use = b.dataset?.tool ? 'tool_' + b.dataset.tool : id; if (use) countUse(use, true); } else { const card = e?.target?.closest?.('summary')?.parentElement?.id; if (card) countUse('card_' + card); } });   /* 全ボタン（ツールは tool_名）・カードを開いた回数 */
  document.addEventListener?.('change', e => { const el = e?.target; if (!el) return; if (el.type === 'checkbox' && el.id) countUse(el.id); if (el.id === 'ghost3d') track.event('ncad_ghost', { kind: el.checked ? 'on' : 'off' }); else if ((el.id === 'threeView' || el.id === 'quadView') && el.checked) track.event('ncad_three_view', { kind: el.id === 'quadView' ? 'quad' : 'frame' }); });
}
/** いま開いている人数を、右下の隅に小さく出す（事業主 2026-10-27「アクセス中の人の人数を目立たないところに表示して」）。数えるのは Cloudflare Worker（presence-worker）。
 *  公開版以外では presence.js が何もしないので、要素は隠れたまま。通信が遅い・止まっても CAD は待たず、数字が消えるだけ。 */
function initPresence() {
  const box = $('presence'); if (!box) return;
  const pres = createPresence({ onCount: n => { if (n == null) { box.hidden = true; return; } $('presenceN').textContent = String(n); box.hidden = false; } });
  if (pres.start()) track.setSink((name, kind) => pres.use(name, kind));   /* 機能の利用モニタ（2026-10-28）：GA4 に送るのと同じ（機能名・kind）を、人数と同じ中継へも渡す。作家の端末（nsf_ga_optout）は、GA4 と同じく送らない */
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
function exportViews() { if (!regGuard('svg', 'views')) return; const { faces } = scene3d(); exportFile('leather-views.svg', viewsToSvg(faces, { scale: 1 }), 'image/svg+xml', saved => { $('hint').textContent = t('exported', { name: t('views') }) + savedTo(saved); }); }
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

// Local designer: private retrieval and dimension-driven drafting, without an external AI call.
let privateDesignCorpus = null, localDesignPending = null;
function localDesignerStatus() {
  const count = privateDesignCorpus?.items?.length ?? DATA_DESIGNS.items?.length ?? 0;
  $('localDesignStatus').textContent = t('localDesignCount', { n: count }) + ' ' + styleSummary(privateDesignCorpus?.style || DATA_STYLE, voiceLang());
}
function localDesignSuggest(text, opts = {}) {
  if (!lockGate('voiceDesign')) return;
  const r = localDesignRequest(text), items = privateDesignCorpus?.items || DATA_DESIGNS.items || [];
  if (opts.fromVoice && r.terms.includes('wallet') && !r.bifold && !r.kind && !r.terms.includes('trifold')) r.bifold = true;   /* 声で「財布」とだけ言ったときは、いま作れる2つ折りの財布にする（折り方を言えばそちらを優先） */
  localDesignPending = r; $('localDesignPrompt').value = text;
  $('localDesignResults').textContent = ''; $('localDesignCreate').disabled = r.invalid || (!r.bifold && !r.kind);
  const matches = rankLocalDesigns(items, text);
  const matchedPitch = Number(matches[0]?.item?.pitch); if (matchedPitch >= 3 && matchedPitch <= 5) r.referencePitch = +matchedPitch.toFixed(2);
  for (const { item } of matches) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = item.name;
    b.onclick = async () => { if (!lockGate('voiceDesign')) return; b.disabled = true; try {
      const next = item.raw ? localReferenceDoc(item) : await loadDesign(item);
      if (!next) throw new Error(t('designsNeedServer')); if (!validateDoc(next)) throw new Error(t('invalidDoc'));
      newTab(item.name); commit(() => { doc = migrateDoc(next); selected.clear(); refreshTools(); }); tabs[activeTab].doc = doc; renderLayers(); renderSeams(); fit();
      $('localDesignStatus').textContent = t('localDesignReferenceOpened', { name:item.name });
    } catch(e) { $('localDesignStatus').textContent = e.message; } finally { b.disabled = false; } };
    $('localDesignResults').appendChild(b);
  }
  $('localDesignStatus').textContent = r.invalid ? t('localDesignInvalid') : t('localDesignProposal', { n:matches.length }) + (r.bifold ? ' ' + t('localDesignBifoldDefaults', { w:r.width ?? 100, h:r.height ?? 90, r:r.radius ?? 6, t:r.thickness ?? 1.5, p:r.pitch ?? r.referencePitch ?? +(Number((privateDesignCorpus?.style || DATA_STYLE).pitch?.[0]?.value) || 4).toFixed(2) }) : '');
  $('voiceCard').open = true; revealCard($('voiceCard'));
  if (opts.fromVoice) {   /* 声で頼んだとき：作れる依頼（2つ折り・手帳・カードケース・パスケース・コインケース）は、押さなくてもそのまま新しいタブに作る（元の図面は残る） */
    if (r.invalid) { voiceSay(t('localDesignInvalid')); return; }
    if (!(r.bifold || r.kind)) { voiceSay(t('voiceDesignNoRecipe')); return; }
    if (localDesignCreate()) { voiceSay(t(r.bifold ? 'voiceDesignMade' : 'voiceDesignMadeKind', { what: r.bifold ? t('fdModeBi') : t('kind.' + r.kind) })); if (r.bifold) setFlowWin(true); }
    else voiceSay($('localDesignStatus').textContent);
  }
}
function localDesignCreate() {
  if (!lockGate('voiceDesign')) return false;
  const r=localDesignPending; if (!r || r.invalid) return false;
  const pitch=r.pitch ?? r.referencePitch ?? +(Number((privateDesignCorpus?.style || DATA_STYLE).pitch?.[0]?.value) || 4).toFixed(2);
  if (r.bifold) {
    const vals={mode:'bifold',width:r.width ?? 100,rinR:r.radius ?? 6,t:r.thickness ?? 1.5};
    if (!foldDesignPlan(vals).ok || !(pitch > 0)) { $('localDesignStatus').textContent=t('localDesignInvalid'); return; }
    newTab(t('fdModeBi'));
    for (const [id,v] of Object.entries({fdMode:'bifold',fdBiW:vals.width,fdRR:vals.rinR,foldSecT:vals.t,fdTO:vals.t,fdTI:vals.t,fdH:r.height ?? 90,fdPitch:pitch,fdEdge:3,fdMargin:5})) $(id).value=String(v);
    $('fdRingOn').checked=r.terms.includes('notebook'); $('fdRingPos').value='0'; $('fdStackT').value='6';
    if (r.refill) { $('fdRingSpec').value=r.refill; $('fdRingSpec').onchange(); }
    if (r.ringD) { $('fdRingDia').value=String(r.ringD); $('fdRingDia').onchange(); }
    syncFoldModeUI(); makeFoldDesign(false); projectFoldDesign(false); unfoldFoldDesign(); fit();
  } else if (r.kind) {
    // Arbitrary width/height cannot safely scale stitching or hardware on a fixed recipe.
    if (r.width || r.height || r.radius) { $('localDesignStatus').textContent=t('localDesignRecipeDims'); return false; }
    const recipe={...defaultRecipe(r.kind),pitch,...(r.refill?{refill:r.refill}:{}),...(r.ringD?{ringD:r.ringD}:{}),...(r.thickness?{thickness:r.thickness}:{})};
    const built=buildDoc(recipe,{tools:loadTools()}); if (!built || !validateDoc(built.doc)) { $('localDesignStatus').textContent=t('localDesignInvalid');return; }
    newTab(t('recipeTab',{kind:t('kind.'+r.kind)})); commit(()=>{doc=built.doc; selected.clear();refreshTools();}); tabs[activeTab].doc=doc;renderLayers();renderSeams();fit();
  } else return false;
  $('localDesignStatus').textContent=t('localDesignCreated',{p:pitch}); return true;
}
function initLocalDesigner() {
  $('localDesignSuggest').onclick=()=>localDesignSuggest($('localDesignPrompt').value);
  $('localDesignCreate').onclick=localDesignCreate;
  $('localDesignLearn').onchange=async()=>{
    if (!lockGate('voiceDesign')) { $('localDesignLearn').value=''; return; }
    const files=Array.from($('localDesignLearn').files || []); if(!files.length)return;
    $('localDesignStatus').textContent=t('localDesignLearning'); $('localDesignLearn').disabled=true;
    try { const learned=await learnLocalFiles(files); if (!lockGate('voiceDesign')) return; if(!learned.items.length) throw new Error(t('localDesignNoFiles'));
      privateDesignCorpus=learned; try { await localDesignStore(learned); localDesignerStatus(); } catch(e) { localDesignerStatus(); $('localDesignStatus').textContent+=' '+t('localDesignMemoryOnly'); }
      if(learned.failed.length) $('localDesignStatus').textContent+=' '+t('localDesignFailed',{n:learned.failed.length});
    } catch(e) { $('localDesignStatus').textContent=e.message; } finally { $('localDesignLearn').disabled=false; $('localDesignLearn').value=''; }
  };
  $('localDesignForget').onclick=async()=>{ if (!lockGate('voiceDesign')) return; try { await localDesignStore(null);privateDesignCorpus=null;localDesignPending=null;$('localDesignResults').textContent='';localDesignerStatus(); }catch(e){$('localDesignStatus').textContent=e.message;} };
  localDesignerStatus(); if (!featureLocked()) localDesignStore().then(v=>{if(!featureLocked() && v?.version===1 && Array.isArray(v.items)){privateDesignCorpus=v;localDesignerStatus();}}).catch(()=>{});
}

// ---- 音声操作（Web Speech API・長押しで聞く・テキスト欄は同じ文法）----
let voicePending = null, voiceCandidates = [], voiceRec = null, voiceAskNumber = null, voiceLevelStop = null, voiceKeepListening = false;
const VOICE_ERR = { 'not-allowed': 'voiceNoPermission', 'service-not-allowed': 'voiceNoPermission', 'no-speech': 'voiceNoSound', 'audio-capture': 'voiceNoMic', network: 'voiceNetwork', 'language-not-supported': 'voiceLangNo' };
const voiceLang = () => ($('language').value || 'ja') === 'en' ? 'en' : 'ja';
function voiceSay(text) { $('voiceOut').textContent = text; if ($('voiceSpeak').checked && typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance === 'function') { const u = new SpeechSynthesisUtterance(text); u.lang = voiceLang() === 'en' ? 'en-US' : 'ja-JP'; speechSynthesis.speak(u); } }
function renderVoiceCandidates() {
  const box = $('voiceCandidates'); box.textContent = ''; box.hidden = !voiceCandidates.length;
  voiceCandidates.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = labelOf(c, voiceLang()); b.onclick = () => { voiceCandidates = []; renderVoiceCandidates(); execVoice(c); }; box.appendChild(b); });
}
/** 声で描く（voice.js の parseDraw の ops）：いまの点（lastPoint・最初は原点）から、順に描く。右・左・上・下は画面で見える向き（図面は下が＋なので、上は −y）。
 *  長方形はいまの点から右下へ・円は中心がいまの点・線は1本ずつの直線（「閉じる」で、最初の点へ戻る線を足す）。描いたあと、画面の外に出ていたら全体を表示する。 */
function voiceDraw(ops) {
  const r4 = v => +v.toFixed(4), box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }, grow = (x, y) => { box.minX = Math.min(box.minX, x); box.minY = Math.min(box.minY, y); box.maxX = Math.max(box.maxX, x); box.maxY = Math.max(box.maxY, y); };
  let p = { x: lastPoint.x, y: lastPoint.y }, chain = null, p0 = null, lines = 0; const parts = [], begin = () => { if (!p0) { p0 = { ...p }; grow(p.x, p.y); } };
  const line = q => { addShape({ type: 'line', x1: p.x, y1: p.y, x2: q.x, y2: q.y }); lines++; grow(q.x, q.y); p = q; };
  for (const o of ops) {
    if (o.op === 'origin') { p = { x: 0, y: 0 }; chain = null; continue; }
    if (o.op === 'rect') { begin(); const q = { x: r4(p.x + o.w), y: r4(p.y + o.h) }, rect = rectShape(p, q); if (!rect) continue; addShape(rect); grow(q.x, q.y); parts.push(t('voiceDrewRect', { w: o.w, h: o.h })); p = q; chain = null; continue; }
    if (o.op === 'circle') { begin(); addShape({ type: 'circle', cx: r4(p.x), cy: r4(p.y), r: o.r }); grow(p.x - o.r, p.y - o.r); grow(p.x + o.r, p.y + o.r); parts.push(t('voiceDrewCircle', { d: r4(o.r * 2), r: o.r })); chain = null; continue; }
    if (o.op === 'move' || o.op === 'polar') {
      begin(); if (!chain) chain = { ...p };
      const v = o.op === 'polar' ? [Math.cos(o.deg * Math.PI / 180), -Math.sin(o.deg * Math.PI / 180)] : { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[o.dir];   /* 角度は、右が0°・上が90°（画面で見える反時計回り） */
      line({ x: r4(p.x + v[0] * o.len), y: r4(p.y + v[1] * o.len) }); continue;
    }
    if (o.op === 'close') { if (chain && Math.hypot(p.x - chain.x, p.y - chain.y) > 1e-6) line({ ...chain }); chain = null; }
  }
  if (!p0) { voiceSay(t('voiceNothingDrawn')); return; }
  if (lines) parts.push(t('voiceDrewLines', { n: lines }));
  lastPoint = p; const lo = world({ x: 0, y: 0 }), hi = world({ x: width, y: height });
  if (box.minX < lo.x || box.minY < lo.y || box.maxX > hi.x || box.maxY > hi.y) fit();   /* 画面の外に描いたときは、全体を表示する */
  draw(); voiceSay(t('voiceDrew', { what: parts.join('・'), from: ops.some(o => o.op === 'origin') ? t('voiceFromOrigin') : t('voiceFromHere', { x: r4(p0.x), y: r4(p0.y) }) }));
}
function execVoice(r) {
  const lang = voiceLang();
  if (r.ask) { voiceCandidates = r.ask; renderVoiceCandidates(); voiceSay(t('voiceWhich')); return; }
  if (r.free !== undefined) { if (!r.free) return; $('aiInput').value = r.free; if (($('aiUrl').value || '').trim()) { $('aiCard').open = true; revealCard($('aiCard')); voiceSay(t('voiceToAi')); } else voiceSay(t('voiceAiUnset')); return; }   /* AI が未設定なら、AI のカードへ飛ばさず、言い方の例を出す */
  if (r.cmd === 'draw') { voiceCandidates = []; renderVoiceCandidates(); if (r.need) voiceSay(t('voiceNeed_' + r.need)); else voiceDraw(r.ops); return; }
  if (r.confirm && !r.confirmed) { voicePending = r; voiceSay(t('voiceConfirm', { what: labelOf(r, lang) })); return; }
  voicePending = null; const a = r.args || {};
  const done = extra => voiceSay(t('voiceDid', { what: labelOf(r, lang) + (extra ? ' ' + extra : '') }));
  switch (r.cmd) {
    case 'noop': case 'cancel': voiceCandidates = []; renderVoiceCandidates(); if (r.cmd === 'cancel') { cancel(); voiceSay(t('voiceCancelled')); } return;
    case 'tool': {
      if (mode !== r.tool) setMode(r.tool);
      if (r.tool === 'line' && a.value !== undefined) { voiceDraw([{ op: 'polar', len: a.value, deg: a.angle ?? 0 }]); return; }   /* 長さを言えば、いまの点からその場で1本引く（これまでは始点を置くだけで線が出なかった） */
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
/** 型紙のデザインを頼む言い方か：財布・手帳・カードケース・2つ折り などの名前があり、「作って」「設計」などの頼む言葉もあるとき（描く言い方・ツール名だけの言い方は、CAD の操作として扱う）。 */
function voiceLooksLikeDesign(text) {
  const q = String(text).normalize('NFKC'), terms = designTerms(q);
  return terms.some(k => ['wallet', 'notebook', 'cardcase', 'passcase', 'coincase', 'bifold', 'trifold', 'm5', 'mini6', 'bible', 'a5', 'a6'].includes(k)) && /作って|作る|作成|つくって|つくる|設計|デザイン|下書き|お願い|ください|make|create|design|draft/i.test(q);
}
function execVoiceText(text) { $('voiceHeard').textContent = text; const target = $('voiceTarget').value; if (target === 'design' || (target !== 'command' && voiceLooksLikeDesign(text) && !voiceIsDraw(text, voiceLang()))) { localDesignSuggest(text, { fromVoice: true }); return; } execVoice(parseVoice(text, voiceLang(), { pending: voicePending })); }
function voiceStart() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('voiceOut').textContent = t('voiceUnsupported'); $('voiceText').focus?.(); return; }
  if (voiceRec) return; const rec = new SR(); voiceRec = rec; rec.lang = voiceLang() === 'en' ? 'en-US' : 'ja-JP'; rec.interimResults = true; rec.continuous = false;
  let finalText = '', failed = false; $('voiceBtn').classList.add('active'); $('voiceHeard').textContent = '…'; $('voiceOut').textContent = t('voiceListening');
  rec.onresult = e => { let s = ''; for (const r of e.results) { s += r[0].transcript; if (r.isFinal) finalText = s; } $('voiceHeard').textContent = s; };
  rec.onerror = e => { if (e.error === 'aborted') return; failed = true; const key = VOICE_ERR[e.error]; $('voiceOut').textContent = key ? t(key) : t('voiceError') + ' (' + e.error + ')'; };   /* 失敗の理由を、種類ごとに出す */
  rec.onend = () => { voiceRec = null; voiceKeepListening = false; $('voiceBtn').classList.remove('active'); voiceLevelStop?.(); voiceLevelStop = null; const text = finalText || $('voiceHeard').textContent; if (text && text !== '…') execVoiceText(text); else if (!failed) $('voiceOut').textContent = t('voiceNoSound'); };
  try { rec.start(); } catch { voiceRec = null; $('voiceBtn').classList.remove('active'); $('voiceOut').textContent = t('voiceError'); return; }   /* 開始できなかったときも、理由なしに黙らない */
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
  const btn = $('voiceBtn');
  let pressAt = 0;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if ($('voiceMode').value === 'toggle') { if (voiceRec) voiceStop(); else voiceStart(); return; } if (voiceRec && voiceKeepListening) { voiceKeepListening = false; voiceStop(); return; } pressAt = Date.now(); voiceStart(); });   /* 聞き続けている間にもう一度押すと止める。トグルは、自動で終わったあとも1回の押しで始まる */
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, () => { if ($('voiceMode').value === 'toggle' || voiceKeepListening) return; if (ev === 'pointerup' && voiceRec && Date.now() - pressAt < 450) { voiceKeepListening = true; $('voiceOut').textContent = t('voiceListening'); return; } voiceStop(); });   /* 短く押した（クリック）ときは、離しても止めず、話し終えるまで聞き続ける（これまでは、クリックすると直後に止まって「聞き取れませんでした」になった） */
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
  { const b = document.createElement('button'); b.className = 'swatch clear'; b.title = t('clearTip'); b.setAttribute('aria-label', t('clearName')); b.onclick = () => applyClear(); grid.appendChild(b); }   /* 透明：塗った色を、その場所だけ抜く */
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
const paintName = b => b.kind === 'clear' ? t('clearName') : b.kind === 'eraseFill' ? t('eraseFillName') : b.kind === 'erase' ? t('metalEraseName') : b.kind === 'texture' ? (textureById(b.id)?.name || b.id) : b.kind === 'metal' ? t('metal.' + b.id) + (b.style === 'radial' ? '（' + t('metalStyleRadialShort') + '）' : '') : (() => { const c = DATA_LEATHER_COLORS.leatherColors.find(x => String(x.hex).toLowerCase() === b.hex.toLowerCase()); return c ? c.name + ' ' + b.hex : b.hex; })();
/** 塗りモード（事業主の希望 2026-10-18「金具の色が塗れない・スポイトでの塗り機能は」）：色の見本を、図形を選ばずに押すと、その色を持って塗りモードになる。図形をクリックすると塗れる。Alt＋クリックで図形の色を拾う（スポイト）。Esc で終わる。 */
let lastLeatherBrush = null, lastMetalBrush = null;   /* 直前に選んだ革色・質感・金属の色（「断面に色をつける」が使う） */
function rememberBrush(brush) { if (brush?.kind === 'leather' || brush?.kind === 'texture') lastLeatherBrush = brush; else if (brush?.kind === 'metal') lastMetalBrush = brush; }
function startPaint(brush) { rememberBrush(brush); paintBrush = brush; selected = new Set(); if (brush.kind === 'metal' && $('metalStyle')) $('metalStyle').value = brush.style === 'radial' ? 'radial' : 'linear'; setMode('paint'); $('hint').textContent = brush.kind === 'eraseFill' ? t('eraseFillStart') : brush.kind === 'erase' ? t('metalEraseStart') : t('paintStart', { name: paintName(brush) }); draw(); }
/** 領域の塗り（doc.fills）：線で囲まれた場所を塗る。取り込んだ型紙の輪郭が T字・すき間で閉じて見えなくても塗れる（事業主の指摘 2026-10-18「つながっていないと警告が出て色が塗れない」）。計算は geometry.js の regionAt。 */
const regionShapes = () => doc.shapes.filter(s => visible(s) && !s.holeLink && s.layer !== 'guide' && s.lineStyle !== 'dashed' && !['text', 'dimension', 'image', 'fold'].includes(s.type));   /* 囲む線：見えている実線（ガイド層・点線は囲まない） */
const insideRing = (q, ps) => { let c = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) if ((ps[i].y > q.y) !== (ps[j].y > q.y) && q.x < (ps[j].x - ps[i].x) * (q.y - ps[i].y) / (ps[j].y - ps[i].y) + ps[i].x) c = !c; return c; };
const fillContains = (fl, q) => insideRing(q, fl.points) && !(fl.holes || []).some(h => insideRing(q, h));
/** 点を含む領域の塗り（小さいものが上） */
function fillAt(q) { return (doc.fills || []).filter(fl => fillContains(fl, q)).sort((x, y) => (x.area || 0) - (y.area || 0))[0] || null; }
/** 金属の色を消すモード（事業主の指摘 2026-10-19「塗った金属の色を削除できない」）：「金属の色を解除」を図形を選ばずに押すと入る。クリックした線なら、その線と同じまとまり（一周＝metalGroup・金具のグループ）の金属の色を消す。
 *  線から離れた所なら、そこを塗っている「線で囲まれた場所の塗り」のうち金属のもの（いちばん小さいもの）を消す。革色・質感の塗りは触らない。消した数を返す。 */
const metalFillAt = q => (doc.fills || []).filter(fl => fl.metal && fillContains(fl, q)).sort((x, y) => (x.area || 0) - (y.area || 0))[0] || null;
function eraseMetalAt(p, s) {
  if (s && s.metal) {
    const g = groupIdOf(s), ids = new Set(doc.shapes.filter(x => x.metal && editable(x) && (x.id === s.id || (s.metalGroup && x.metalGroup === s.metalGroup) || (g && groupIdOf(x) === g))).map(x => x.id));
    commit(() => { for (const x of doc.shapes) if (ids.has(x.id)) { delete x.metal; delete x.metalGroup; delete x.metalStyle; } });
    $('hint').textContent = t('metalCleared', { n: ids.size }); return ids.size;
  }
  const fl = metalFillAt(p);
  if (fl) { commit(() => { doc.fills = (doc.fills || []).filter(x => x !== fl); }); $('hint').textContent = t('metalEraseFill'); return 1; }
  $('hint').textContent = t(s ? 'metalEraseNoneShape' : 'metalEraseNone'); return 0;
}
/** 断面に色をつける（事業主 2026-10-24「断面図に色を塗るのがかなりむつかしい。もっと簡単に」「リフィルを白に塗りつぶせない」）：断面（foldSec 'fd'）の囲まれた場所を、役割で1回に塗り分ける。
 *  革（edge・glue・cap などの革の線を含む場所）＝直前に選んだ革色・質感（無ければ薄茶）／リフィルの紙（リフィルの線を含み、金属・台座を含まない場所）＝白／金具（リングの輪＝外の円と内の円の両方を含む場所）＝直前に選んだ金属の色（無ければ銀）。
 *  台座・サポータと金具の図形そのものにも、金属の色を付ける。リフィルが台座・リングと一緒に囲む空きの場所は、塗らない。同じ場所の前の塗りは置き換える（元に戻すは1回）。 */
function paintSectionAuto() {
  const sec = doc.shapes.filter(s => s.foldSec === 'fd' && visible(s)); if (!sec.length) { $('hint').textContent = t('sectionPaintNone'); return 0; }
  const ids = new Set(sec.map(s => s.id)), regs = enclosedAreasAround(regionShapes(), ids), role = id => doc.shapes.find(x => x.id === id)?.role || '', rolesOf = r => r.ids.map(role);
  const leatherBrush = lastLeatherBrush || { kind: 'leather', hex: '#C4A882' }, metalBrush = { kind: 'metal', id: lastMetalBrush?.id || 'silver', ...(lastMetalBrush?.style === 'radial' ? { style: 'radial' } : {}) };
  const kindOf = r => { const rs = rolesOf(r); if (rs.some(x => !NONLEATHER_ROLES.has(x) && x !== '')) return 'leather'; if (rs.includes('ring-outer') && rs.includes('ring-inner')) return 'metal'; if (rs.includes('refills') && !rs.includes('plate') && !rs.includes('boss')) return 'paper'; return 'air'; };
  const plan = regs.map(r => ({ r, kind: kindOf(r) })), count = k => plan.filter(x => x.kind === k).length;
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), list = [...(doc.fills || [])], made = [];
  for (const { r, kind } of plan) { if (kind === 'air') continue; const brush = kind === 'leather' ? leatherBrush : kind === 'paper' ? { kind: 'leather', hex: '#FFFFFF' } : metalBrush; const nf = { id: freshId(list, 'f'), points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10, ...fillPayload(brush, r.ids) }; list.push(nf); made.push(nf); }
  const same = (o, nf) => o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id)), metalShapes = sec.filter(s => (s.role === 'plate' || s.role === 'boss') && (s.closed || s.type === 'circle')), loneRefills = sec.filter(s => s.role === 'refills' && s.closed && !made.some(nf => nf.ids.includes(s.id)));   /* 他の線と交わらず、場所として拾われないリフィルの四角は、図形そのものを白にする */
  commit(() => { doc.fills = (doc.fills || []).filter(o => !made.some(nf => same(o, nf))); doc.fills.push(...made); for (const s of doc.shapes) { if (metalShapes.some(m => m.id === s.id)) { s.metal = metalBrush.id; if (metalBrush.style === 'radial') s.metalStyle = 'radial'; else delete s.metalStyle; } if (loneRefills.some(m => m.id === s.id)) { s.leather = '#FFFFFF'; delete s.leatherGroup; } } });
  $('hint').textContent = t('sectionPainted', { a: count('leather'), b: count('paper'), c: count('metal') + metalShapes.length, d: count('air'), leather: paintName(leatherBrush), metal: paintName(metalBrush) }); draw(); return made.length;
}
/** 領域の塗りの中身：金属（と光沢の形）・質感（同じ領域に革色があれば残す）・革色。 */
function fillPayload(brush, ids) {
  if (brush.kind === 'clear') return { clear: true };
  if (brush.kind === 'metal') return { metal: brush.id, ...(brush.style === 'radial' ? { style: 'radial' } : {}) };
  if (brush.kind === 'texture') { const old = (doc.fills || []).find(o => o.ids.length === ids.length && o.ids.every(i => ids.includes(i))); return { ...(old?.leather ? { leather: old.leather } : {}), texture: brush.id }; }
  return { leather: brush.hex };
}
/** 金属の部分（リング・台座・サポータ・置いた金具）：革色・質感は塗らない（事業主 2026-10-24「表紙に色を塗ったのにリングの色が変わった」：選んだ図形に質感を付けると、リングの輪の中まで塗られた）。選んで塗るときは、リフィル（紙）・リフィルの穴も革ではないので塗らない。クリックして塗るときは、リフィルの紙は塗れる。 */
const METAL_ROLES = new Set(['ring-outer', 'ring-inner', 'plate', 'boss']), NONLEATHER_ROLES = new Set([...METAL_ROLES, 'refills', 'refill-hole']);
const isMetalShape = s => !s || METAL_ROLES.has(s.role) || !!s.hw || !!s.hwHole || s.layer === 'hardware', isNonLeatherShape = s => !s || NONLEATHER_ROLES.has(s.role) || !!s.hw || !!s.hwHole || s.layer === 'hardware';
const regionHasLeatherRole = (r, picked) => r.ids.some(id => { if (picked?.has(id)) return false; const s = doc.shapes.find(x => x.id === id); return !!s?.role && !METAL_ROLES.has(s.role); });   /* 断面の革・リフィル・リフィルの穴の線（役割が金属以外）を、選んでいないのに含む場所（選んだ線は、塗ってよい） */
const regionTouchesMetalRole = r => r.ids.some(id => METAL_ROLES.has(doc.shapes.find(x => x.id === id)?.role));   /* リング・台座の線を含む場所：革色・質感は、金属の部分のまわりの小さな場所（台座の中など）には塗らない */
const regionIsMetalOnly = (r, nonLeather = false) => r.ids.length > 0 && r.ids.every(id => (nonLeather ? isNonLeatherShape : isMetalShape)(doc.shapes.find(x => x.id === id)));
/** クリックした場所を囲む場所。標準（線のすき間を 0.8mm・2.5mm まで閉じて数える）で見つからないときだけ、細かい判定（0.1mm・0.3mm）でもう一度探す。
 *  事業主 2026-10-26「白の色が塗れない」（クリックしても「塗れる場所がありません」）：不具合記録の座標は、幅 0.8mm ほどの細い場所で、標準の判定では線に埋もれて「場所が無い」になっていた。標準で見つかる場所は、今までどおり。 */
function enclosedAreaForClick(p) { const shapes = regionShapes(); return enclosedAreaAt(shapes, p) || enclosedAreaAt(shapes, p, { gaps: [0.1, 0.3] }); }
function addRegionFill(p, brush) {
  const r = enclosedAreaForClick(p); if (!r) { $('hint').textContent = t('paintNoRegion'); return false; }
  if (brush.kind !== 'metal' && regionIsMetalOnly(r)) { $('hint').textContent = t('paintMetalRegion'); return false; }
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), nf = { id: freshId(doc.fills || [], 'f'), points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10, ...fillLayerNow(), ...fillPayload(brush, r.ids) };
  commit(() => { doc.fills = (doc.fills || []).filter(o => !(o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id)) && fillContains(o, p))); doc.fills.push(nf); });   /* 同じ領域（クリックした場所を含む同じ囲み）は置き換える。同じ図形で囲まれた別の場所（リングの輪の上下など）の塗りは残す */
  $('hint').textContent = t('regionPainted', { name: paintName(brush) }) + (r.bridged ? ' ' + t('regionBridged') : ''); return true;
}
/** 選んだ図形（ids）と、まわりの線で囲まれた場所を、全部「領域の塗り」にする（事業主の指摘 2026-10-18「選んだ線が一周つながっていないと言われる。つながっているのに」：袋の形の13本を選んで色を押した）。塗れた数を返す（0 なら何も塗らない）。 */
function addSelectionRegionFills(brush, ids) {
  let regs = enclosedAreasAround(regionShapes(), ids); if (!regs.length) return 0;
  let skippedMetal = 0; if (brush.kind !== 'metal') { const keep = regs.filter(r => !regionIsMetalOnly(r, true) && !regionTouchesMetalRole(r)); skippedMetal = regs.length - keep.length; regs = keep; if (!regs.length) { $('hint').textContent = t('paintMetalRegion'); return 0; } }
  let skippedLeather = 0; if (brush.kind === 'metal') { const keep = regs.filter(r => !regionHasLeatherRole(r, ids)); skippedLeather = regs.length - keep.length; regs = keep; if (!regs.length) return 0; }   /* 金属の色は、革・リフィルの線を含む場所には塗らない（事業主 2026-10-25「リングだけ色を塗りたいのに全体がリングの色になる」：リングの線をクリックしたら、まわりの8か所が全部金色になった） */
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), list = [...(doc.fills || [])], made = [];
  for (const r of regs) { const nf = { id: freshId(list, 'f'), points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10, ...fillLayerNow(), ...fillPayload(brush, r.ids) }; list.push(nf); made.push(nf); }
  const same = (o, nf) => o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id));
  commit(() => { doc.fills = (doc.fills || []).filter(o => !made.some(nf => same(o, nf))); doc.fills.push(...made); });   /* 同じ場所は置き換える */
  $('hint').textContent = t('regionsPainted', { n: made.length, name: paintName(brush) }) + (regs.some(r => r.bridged) ? ' ' + t('regionBridged') : '') + (skippedMetal ? ' ' + t('regionsMetalSkipped', { k: skippedMetal }) : '') + (skippedLeather ? ' ' + t('regionsLeatherSkipped', { k: skippedLeather }) : ''); return made.length;
}
/** 「光沢の形」を選び直したとき：金属の色が付いた図形を選んでいれば、色はそのままで形（帯・放射）だけを変える。何も選んでいなければ、これから塗る形（と塗りモードで持っている色の形）を決めるだけ。 */
function changeMetalStyle() {
  const style = currentMetalStyle(), name = t(style === 'radial' ? 'metalStyleRadialShort' : 'metalStyleLinearShort'), ids = new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh) && sh.metal).map(sh => sh.id));
  if (paintBrush?.kind === 'metal' && mode === 'paint') paintBrush = { ...paintBrush, style };
  if (!ids.size) { $('hint').textContent = t('metalStyleSet', { name }); return; }
  commit(() => { for (const sh of doc.shapes) if (ids.has(sh.id)) { if (style === 'radial') sh.metalStyle = 'radial'; else delete sh.metalStyle; } });
  $('hint').textContent = t('metalStyleChanged', { n: ids.size, name });
}
/** 塗りを全部消す。事業主 2026-10-25「特定のエリアだけ色を消したいのに全部消えた」（不具合記録 08:41：「全部消す」を押して12か所が一度に消えた）→ 1回目は確認だけ、5秒以内にもう一度押すと消す（元に戻すは1回）。1か所だけ消すなら「塗りを1か所ずつ消す」。 */
/** 選んだ範囲の色塗りを全部消す（事業主 2026-10-26「選択した範囲の色塗りを全部削除したい」：既存の「線で囲まれた場所の塗りを、全部消す」は図面全体が対象）。
 *  消すもの：①選んだ図形に囲まれた領域の塗り（革・質感・金属・透明の抜き。「動かすと塗りがついてくる」と同じ判定＝fillFollows）②選んだ図形に付いた革色・質感（グループの印も）・金属の色 ③選んだ部品の色。選んでいない図形の塗りは残る。元に戻すは1回。戻り値 { fills, shapes }。 */
const PAINT_KEYS = ['leather', 'texture', 'leatherGroup', 'metal', 'metalStyle'];
function unpaintSelection() {
  const none = { fills: 0, shapes: 0 }, ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('unpaintNone'); return none; }
  const byId = new Map(doc.shapes.map(s => [s.id, s])), fillIds = new Set((doc.fills || []).filter(fl => fillFollows(fl, ids, byId)).map(fl => fl.id));
  const shapeIds = new Set(doc.shapes.filter(s => ids.has(s.id) && editable(s) && PAINT_KEYS.some(k => k in s)).map(s => s.id)), parts = (doc.parts || []).filter(p => p.color && p.shapeIds.length && p.shapeIds.every(id => ids.has(id)));
  if (!fillIds.size && !shapeIds.size && !parts.length) { $('hint').textContent = t('unpaintNone'); return none; }
  commit(() => { doc.fills = (doc.fills || []).filter(f => !fillIds.has(f.id)); for (const s of doc.shapes) if (shapeIds.has(s.id)) for (const k of PAINT_KEYS) delete s[k]; for (const p of doc.parts || []) if (parts.some(q => q.id === p.id)) delete p.color; });
  $('hint').textContent = t('unpaintDone', { f: fillIds.size, s: shapeIds.size }); return { fills: fillIds.size, shapes: shapeIds.size };
}
/** 右クリックに「選んだ範囲の色塗りを全部消す」を出すか：何か選んでいて、図面に領域の塗りがあるか、選んだ図形に色が付いているとき（軽く調べる） */
const selectionHasPaint = () => selected.size > 0 && ((doc.fills || []).length > 0 || doc.shapes.some(s => selected.has(s.id) && PAINT_KEYS.some(k => k in s)));
let fillsClearArmedAt = 0;
/** 図形から離れて残った塗り（宙に浮いた塗り）を、1回で消す（事業主 2026-10-25「どうやっても消せない」：消した図形・動かした図形の色だけが、元の場所に残り、選べないので消せなかった。図面を開き直すと消える仕組みはあるが、開いたまま消せるように）。元に戻すは1回。 */
function clearDetachedFills() {
  const byId = new Map(doc.shapes.map(s => [s.id, s])), n = (doc.fills || []).filter(f => fillDetached(f, byId)).length;
  if (!n) { $('hint').textContent = t('fillsDetachedNone'); return 0; }
  commit(() => { dropDetachedFills(doc); }); $('hint').textContent = t('fillsDetachedDone', { n }); draw(); return n;
}
function clearFills() {
  const n = (doc.fills || []).length; if (!n) { $('hint').textContent = t('fillsNone'); return; }
  const btn = $('fillsClear'), reset = () => { fillsClearArmedAt = 0; btn.textContent = t('fillsClear'); };
  if (!fillsClearArmedAt || Date.now() - fillsClearArmedAt > 5000) { const at = fillsClearArmedAt = Date.now(); btn.textContent = t('fillsClearAgain', { n }); $('hint').textContent = t('fillsClearConfirm', { n }); setTimeout(() => { if (fillsClearArmedAt === at) reset(); }, 5000); return; }
  reset(); commit(() => { doc.fills = []; }); $('hint').textContent = t('fillsCleared', { n }); draw();
}
/** 領域の塗りのうち、囲む図形のどれかが見えているもの。面積の大きい順（小さい領域が上）。kind：'leather' か 'metal' */
const visibleFills = (d, vis, kind) => { const byId = new Map(d.shapes.map(s => [s.id, s])); return (pendingFillFollow && d === doc ? [] : (d.fills || [])).filter(fl => { const l = fillEffectiveLayer(fl, byId); return !l || d.layers?.find(x => x.id === l)?.visible !== false; }).filter(fl => (kind === 'metal' ? fl.metal : (fl.leather || fl.texture)) && fl.ids.some(id => { const sh = d.shapes.find(x => x.id === id); return sh && vis(sh); }) && (!exportFilter || fl.ids.filter(id => exportFilter.ids.has(id)).length * 2 >= fl.ids.length))   /* 選んだ図形だけ出力：境目の図形の半分以上を選んだ領域だけ */.sort((x, y) => (y.area || 0) - (x.area || 0)); };
/** 革色の塗りの「項目」＝{ area：面積（重ねる順を決める）, draw：描く関数 }。線で囲まれた場所の塗り。 */
/** 革色・質感の塗りの不透明度：質感は 1（不透明・2026-10-26 事業主 A「同じフラゴラなのに、下にラズベリーの塗りがあると色が違って見える」：0.92 だと、下の塗りが 8% 透けて、同じ革が場所で違う色になった）・色は 0.55（線や下の図が透ける）。白（リフィルの紙）も不透明にする（事業主 2026-10-25「リフィルも白にできない」：半透明のままだと、暗い背景の上で灰色に見えた）。 */
const leatherAlpha = (tex, hex) => tex ? 1 : /^#?f{3}(f{3})?$/i.test(String(hex || '')) ? 1 : 0.55;
/** 領域の塗りの層（事業主 2026-10-25「リフィルのレイヤーを最前面にしたのに、リングサポータの下に来ている」）：塗ったときの作図先の層を覚え、重なりと表示は、その層で決める。
 *  層の無い古い塗りは、今までどおり、囲んでいる図形のうちいちばん手前の層（それだと、リフィルの線がサポータの塗りを区切ると、サポータの塗りまで「手前の層」になり、同じ順位の中で小さい方が上に出た）。 */
/** 層を覚えていない古い塗りの層：境目の線がいちばん多く乗っている図形の層（事業主 2026-10-25「まだリフィルの順番を変えられない」：前回の直しは、これから塗る塗りだけに効き、すでに塗った塗りは、囲む図形のいちばん手前の層のままだった）。
 *  境目（外形と穴）の各辺の真ん中が、どの図形の上にあるかを長さで数える。図形の層が変わったら、数え直す。どれにも乗らなければ null。 */
const fillOwnerCache = new WeakMap();
function fillOwnerLayer(fl, byId) {
  const shapes = (fl.ids || []).map(id => byId.get(id)).filter(Boolean), sig = shapes.map(s => s.layer).join(','), hit = fillOwnerCache.get(fl); if (hit && hit.sig === sig) return hit.layer;
  const tally = new Map();
  for (const ring of [fl.points, ...(fl.holes || [])]) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b.x - a.x, b.y - a.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let best = null, bd = 0.5; for (const s of shapes) { const dd = distTo(s, mid); if (dd < bd) { bd = dd; best = s; } }
    if (best) tally.set(best.layer, (tally.get(best.layer) || 0) + len);
  }
  let layer = null, top = 0; for (const [l, n] of tally) if (n > top) { top = n; layer = l; }
  fillOwnerCache.set(fl, { sig, layer }); return layer;
}
/** 領域の塗りが属する層（事業主 2026-10-25「金具よりリングサポータが全面にくるはずなのに金具が一番全面にきている」）：境目の線がいちばん多く乗っている図形の層。
 *  塗ったときの作図先（fl.layer）は、金具を型紙の層が作図先のまま塗ると、金具の塗りまで型紙の層になって、同じ層の中では小さい金具が上に出た。作図先は、境目の図形が見つからないときだけ使う。 */
const fillEffectiveLayer = (fl, byId) => fillOwnerLayer(fl, byId) || fl.layer || null;
const fillLayerRank = (fl, rank, byId) => { const l = fillEffectiveLayer(fl, byId); return l && rank.has(l) ? rank.get(l) : Math.max(0, ...(fl.ids || []).map(id => rank.get(byId.get(id)?.layer) || 0)); };
const fillLayerNow = () => doc.layers.some(l => l.id === activeLayer) ? { layer: activeLayer } : {};
/** 図形を別の層へ移したとき、その図形で（半分以上）囲まれている領域の塗りも、同じ層へ移す。 */
function moveFillsWithShapes(movedIds, destId) { let n = 0; for (const f of doc.fills || []) { const k = (f.ids || []).filter(id => movedIds.has(id)).length; if (k > 0 && k * 2 >= f.ids.length && f.layer !== destId) { f.layer = destId; n++; } } return n; }
function regionLeatherItems(d, vis) {
  const rank = layerRankMap(d), byId = new Map(d.shapes.map(s => [s.id, s]));
  return visibleFills(d, vis, 'leather').map(fl => ({ li: fillLayerRank(fl, rank, byId), area: leatherItemArea(fl.points), alpha: leatherAlpha(fl.texture, fl.leather), tex: !!fl.texture, hit: q => fillContains(fl, q), draw: () => { ctx.beginPath(); for (const ring of [fl.points, ...(fl.holes || [])]) { ring.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); } ctx.save(); ctx.fillStyle = fl.texture ? textureFill(fl.texture) : fl.leather; ctx.fill('evenodd'); ctx.restore(); } }));
}
/** 多角形の面積（絶対値）。革色の塗りを大きい順に重ねるために使う。点が無い・壊れているときは 0。 */
function leatherItemArea(ps) { if (!ps || ps.length < 3) return 0; const v = Math.abs(ps.reduce((m, q, i) => { const r = ps[(i + 1) % ps.length]; return m + (q.x * r.y - r.x * q.y); }, 0)) / 2; return Number.isFinite(v) ? v : 0; }
/** 塗りを1か所消す（事業主 2026-10-24「消せない図形がある」：線で囲まれた場所の塗りは、図形ではないので選べず、「全部消す」しか無かった）。クリックした所にある塗りのうち、いちばん上（面積がいちばん小さいもの）だけを消す。
 *  領域の塗り（doc.fills）と、図形そのものの塗り（革色・質感・金属の色が付いた閉じた図形）の両方が対象。線は消さない。消した種類を返す（'fill'・'shape'・null）。 */
function eraseFillAt(p) {
  const cands = [];
  for (const fl of doc.fills || []) if (fillContains(fl, p)) cands.push({ kind: 'fill', area: fl.area || leatherItemArea(fl.points), fl });
  for (const s of doc.shapes) { if (!(s.leather || s.texture || s.metal) || !(s.closed || s.type === 'circle') || !visible(s) || !editable(s)) continue; const poly = outlinePolygon([s], s.id)?.points; if (poly && insideRing(p, poly)) cands.push({ kind: 'shape', area: leatherItemArea(poly), s }); }
  if (!cands.length) { $('hint').textContent = t('eraseFillNone'); return null; }
  const top = cands.sort((a, b) => a.area - b.area)[0];
  commit(() => { if (top.kind === 'fill') doc.fills = doc.fills.filter(f => f !== doc.fills.find(x => x.id === top.fl.id)); else for (const x of doc.shapes) if (x.id === top.s.id || (top.s.leatherGroup && x.leatherGroup === top.s.leatherGroup)) { delete x.leather; delete x.texture; delete x.leatherGroup; delete x.metal; delete x.metalGroup; delete x.metalStyle; } });
  $('hint').textContent = t('eraseFillDone', { what: t(top.kind === 'fill' ? 'eraseKindFill' : 'eraseKindShape') }); return top.kind;
}
/** 断面の図形の分類（1回のクリックで塗る範囲）：リング／台座／リフィル／革。事業主 2026-10-25「リングだけ色を塗りたいのに全体がリングの色になる」（不具合記録 08:41：断面の18本が1つのグループで、リングの線を1回クリックしたら、革もリフィルも全部金色になった）。役割の無い図形（置いた金具など）は null＝今までどおりグループ全体。 */
const sectionPartOf = s => { const r = s?.role; if (!r) return null; return r === 'ring-outer' || r === 'ring-inner' ? 'ring' : r === 'plate' || r === 'boss' ? 'base' : r === 'refills' || r === 'refill-hole' ? 'refill' : 'leather'; };
/** 断面の図形をグループ全体のまま選んで（断面の図形は、クリックで18本ぜんぶが選ばれる）色を押したとき、色の種類に合う分類だけに絞る：金属の色＝リング・台座／革色・質感＝革の線。
 *  事業主 2026-10-25「まだリングを塗ると全体に塗られてしまう」「表紙のみ革の質感を付けたらリフィルまで色が変わった」。断面ではない図形（foldSec の無いもの）・役割の無い図形は、今までどおり選んだとおりに塗る。 */
function scopeSectionIds(ids, kind) {
  const allowed = kind === 'metal' ? ['ring', 'base'] : ['leather'], byId = new Map(doc.shapes.map(s => [s.id, s])), keep = new Set();
  for (const id of ids) { const s = byId.get(id); if (s?.foldSec && s.role && !allowed.includes(sectionPartOf(s))) continue; keep.add(id); }
  return keep;
}
function paintClick(p, eyedrop) {
  const s = pickShapeAt(p);
  if (eyedrop) {   /* スポイト：図形の色（金属の色が先・無ければ部品の革色・型紙に付けた革色）、無ければ、領域の塗りの色を持つ */
    const part = s && doc.parts.find(q => q.shapeIds.includes(s.id)), hex = part?.color || s?.leather, fl = fillAt(p);
    if (s?.metal) paintBrush = { kind: 'metal', id: s.metal, style: s.metalStyle === 'radial' ? 'radial' : 'linear' }; else if (hex) paintBrush = { kind: 'leather', hex }; else if (fl && (fl.metal || fl.leather)) paintBrush = fl.metal ? { kind: 'metal', id: fl.metal, style: fl.style === 'radial' ? 'radial' : 'linear' } : { kind: 'leather', hex: fl.leather }; else { $('hint').textContent = t(s ? 'paintNoColor' : 'paintNoneColor'); return; }
    if (paintBrush.kind === 'metal' && $('metalStyle')) $('metalStyle').value = paintBrush.style; $('hint').textContent = t('paintPicked', { name: paintName(paintBrush) }); return;
  }
  if (!paintBrush) { $('hint').textContent = t('paintNoBrush'); return; }
  if (paintBrush.kind === 'erase') { eraseMetalAt(p, s); draw(); return; }   /* 金属の色を消すモード */
  if (paintBrush.kind === 'eraseFill') { eraseFillAt(p); draw(); return; }   /* 塗りを1か所ずつ消すモード */
  if (paintBrush.kind === 'clear') { addClearAt(p); draw(); return; }   /* 透明：線をクリックしても、その場所を抜く（線に色は付けない） */
  let painted = 0;
  if (s) {
    const g = groupIdOf(s), part = sectionPartOf(s), ids = new Set(g ? doc.shapes.filter(x => groupIdOf(x) === g && (!part || sectionPartOf(x) === part)).map(x => x.id) : [s.id]);   /* 金具などのグループは全体を塗る。ただし断面の図形は、同じ分類（リング・台座・リフィル・革）だけ */
    if (!(s.closed || s.type === 'circle') && (paintBrush.kind === 'leather' || !g)) for (const id of contourFrom(doc.shapes.filter(x => editable(x) && visible(x) && !x.holeLink), s.id)) ids.add(id);   /* 型紙の輪郭は、端がつながった線を一周まとめて */
    selected = ids; try { painted = paintBrush.kind === 'metal' ? applyMetal(paintBrush.id, paintBrush.style) : paintBrush.kind === 'texture' ? applyTexture(paintBrush.id, true) : applyLeather(paintBrush.hex, true); } finally { selected = new Set(); }
  }
  if (!painted) addRegionFill(p, paintBrush);   /* 線から離れた所・閉じた形にならない線：線で囲まれた場所を塗る（T字・すき間があっても） */
  draw();
}
function applyLeather(hex, quiet = false) {   /* quiet：塗りモードで、塗れなければ案内を出さず 0 を返す（そのあと領域を塗る）。返り値：塗ったまとまりの数 */
  if (!quiet) rememberBrush({ kind: 'leather', hex });
  const okIds = scopeSectionIds(new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh)).map(sh => sh.id)), 'leather'), parts = doc.parts.filter(p => p.shapeIds.some(id => okIds.has(id)));
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
  const out = []; for (const list of byGroup.values()) { const poly = outlinePolygon(list, list[0].id); if (poly) out.push({ layer: list[0].layer, points: poly.points, color: list[0].leather, texture: list.find(q => q.texture)?.texture || null }); } return out;
}
/** 透明の塗り（clear）：その場所の、いちばん上の革色・質感の塗りを1枚だけ抜く（事業主 2026-10-25「色塗りで透明を選択して範囲を指定して塗ることができればよいのでは？」「今もまだリフィルの穴は白のまま」：リフィルを白で塗ると、穴の四角まで白くなり、下の革が見えなかった）。
 *  抜く塗りは、描くときに決める（透明の領域の中の1点が入っている項目のうち、いちばん手前）。層を入れ替えても、その場所のいちばん上が抜ける。金属の色は抜かない。 */
const clearSampleCache = new WeakMap();
function clearSamplePoint(c) {
  if (clearSampleCache.has(c)) return clearSampleCache.get(c);
  const xs = c.points.map(q => q.x), ys = c.points.map(q => q.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), mid = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  let best = null, bd = Infinity; for (let i = 1; i <= 9; i++) for (let j = 1; j <= 9; j++) { const q = { x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * j / 10 }; if (!fillContains(c, q)) continue; const dd = Math.hypot(q.x - mid.x, q.y - mid.y); if (dd < bd) { bd = dd; best = q; } }
  clearSampleCache.set(c, best); return best;
}
const visibleClears = (d, vis) => { const byId = new Map(d.shapes.map(s => [s.id, s])); return (pendingFillFollow && d === doc ? [] : (d.fills || [])).filter(fl => { if (!fl.clear) return false; const l = fillEffectiveLayer(fl, byId); return (!l || d.layers?.find(x => x.id === l)?.visible !== false) && fl.ids.some(id => { const sh = byId.get(id); return sh && vis(sh); }); }); };
function attachClearCuts(items, d, vis) {
  for (const c of visibleClears(d, vis)) { const q = clearSamplePoint(c); if (!q) continue; for (let i = items.length - 1; i >= 0; i--) if (items[i].hit?.(q)) { (items[i].cuts ||= []).push(c); break; } }
}
/** 1つの塗りの項目を描く。透明の領域で抜かれる項目は、その領域の外だけを描く（evenodd の切り抜き）。 */
function paintItem(it) {
  if (!it.cuts?.length) { it.draw(); return; }
  ctx.save();
  for (const c of it.cuts) {   /* 切り抜きは、1つずつ順に重ねる（クリップは重なる＝どれの中も描かない）。1つの路にまとめて evenodd にすると、切り抜きどうしが重なった所が、打ち消し合って白に戻った（事業主 2026-10-25「リングの色がリフィルの下になったときに消えてきます」：リフィルの穴と、リングのスロットの透明が重なる所） */
    ctx.beginPath(); ctx.rect(-1e7, -1e7, 2e7, 2e7);
    for (const ring of [c.points, ...(c.holes || [])]) { ring.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); }
    ctx.clip('evenodd');
  }
  it.draw(); ctx.restore();
}
/** 透明にする場所（事業主 2026-10-25「今もまだリフィルの穴は白のまま」：実際の図面で、リフィルの穴は、ガイド層の閉じた図形だった。ガイド層の線は「囲む線」に数えないので、囲まれた場所としては拾えない）：
 *  ① 閉じた図形（折れ線・円）は、その図形そのものの内側（層に関係なく） ② 開いた線は、選んだ線だけで囲まれた場所。クリックでは、その2つのうち、いちばん小さい場所。 */
const clearShapeRegion = s => { const poly = outlinePolygon([s], s.id)?.points; return poly && poly.length >= 3 ? { points: poly, holes: [], ids: [s.id], area: leatherItemArea(poly) } : null; };
const clearableShape = s => (s.closed || s.type === 'circle') && !['text', 'dimension', 'image', 'fold'].includes(s.type) && visible(s) && editable(s);
function clearRegionAt(p) {
  const cands = []; const r = enclosedAreaForClick(p); if (r) cands.push(r);
  for (const s of doc.shapes) { if (!clearableShape(s)) continue; const reg = clearShapeRegion(s); if (reg && insideRing(p, reg.points)) cands.push(reg); }
  return cands.sort((a, b) => a.area - b.area)[0] || null;
}
function commitClearRegions(regs) {
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), list = [...(doc.fills || [])], made = [];
  for (const r of regs) { const nf = { id: freshId(list, 'f'), points: r.points.map(rd), holes: (r.holes || []).map(h => h.map(rd)), ids: r.ids, area: Math.round(r.area * 10) / 10, ...fillLayerNow(), clear: true }; list.push(nf); made.push(nf); }
  const same = (o, nf) => o.ids.length === nf.ids.length && o.ids.every(id => nf.ids.includes(id));
  commit(() => { doc.fills = (doc.fills || []).filter(o => !made.some(nf => same(o, nf))); doc.fills.push(...made); repairFillRings(); });   /* 透明を塗るとき、取り残された革の塗りの穴の輪も、いまのスロットに合わせ直す（事業主 2026-10-26「透明に塗れない」） */
  return made.length;
}
/** 「透明」を押したとき：選んだ図形（穴の四角など）の内側を透明にする。何も選んでいなければ、透明を持って塗りモードに（クリックした場所を透明にする）。返り値：透明にした場所の数。 */
function applyClear() {
  const picked = doc.shapes.filter(sh => selected.has(sh.id) && editable(sh) && !['text', 'dimension', 'image', 'fold'].includes(sh.type));
  if (!picked.length && !doc.shapes.some(sh => selected.has(sh.id))) { startPaint({ kind: 'clear' }); return 0; }
  const regs = picked.filter(clearableShape).map(clearShapeRegion).filter(Boolean), openIds = new Set(picked.filter(s => !(s.closed || s.type === 'circle')).map(s => s.id));
  if (openIds.size) regs.push(...enclosedAreasAround(regionShapes(), openIds).filter(r => r.ids.every(id => openIds.has(id))));
  if (!regs.length) { $('hint').textContent = t('clearNone'); return 0; }
  const n = commitClearRegions(regs); $('hint').textContent = t('clearApplied', { n }); return n;
}
/** 塗りモード（透明）でクリックした場所を、透明にする。 */
function addClearAt(p) {
  const r = clearRegionAt(p); if (!r) { $('hint').textContent = t('paintNoRegion'); return false; }
  commitClearRegions([r]); $('hint').textContent = t('clearApplied', { n: 1 }); return true;
}
/** 革色・革の質感の塗り（カラーシミュレーション）：部品の閉図形・型紙に付けた革色（閉じた図形）・質感（図形自身の指定が優先）を塗り、端がつながった線の一周の革色も塗る。画面・ほかの紙・PNG 書き出しで同じ見え方（書き出しは不透明）。 */
function leatherItems(d, vis, move = s => s, extra = []) {   /* extra＝いっしょに並べて描く、ほかの塗りの項目（金属の色。direct が真のものは、紙を使わず直接描く）。層の並びの順に並べて返す */
  const rank = layerRankMap(d), items = regionLeatherItems(d, vis);   /* 線で囲まれた場所の塗り */
  for (const sh of d.shapes.filter(sh => vis(sh) && (sh.closed || sh.type === 'circle'))) {   /* 図形ごとの塗り */
    const tex = textureOf(sh, d), part = tex ? null : (d.parts || []).find(p => p.color && p.shapeIds.includes(sh.id)), color = part?.color || sh.leather; if (!tex && !color) continue;
    const poly = outlinePolygon([move(sh)], sh.id)?.points, bb = poly ? null : bboxOf(move(sh));
    items.push({ li: rank.get(sh.layer) || 0, area: poly ? leatherItemArea(poly) : bb ? Math.max(0, (bb.maxX - bb.minX) * (bb.maxY - bb.minY)) || 0 : 0, alpha: leatherAlpha(tex, color), hit: q => !!poly && insideRing(q, poly), draw: () => { path(move(sh)); ctx.save(); ctx.fillStyle = tex ? textureFill(tex) : color; ctx.fill(); ctx.restore(); } });
  }
  for (const r of leatherOutlineFills(d, vis, move)) items.push({ li: rank.get(r.layer) || 0, area: leatherItemArea(r.points), alpha: leatherAlpha(r.texture, r.color), hit: q => insideRing(q, r.points), draw: () => { ctx.beginPath(); r.points.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.save(); ctx.fillStyle = r.texture ? textureFill(r.texture) : r.color; ctx.fill(); ctx.restore(); } });   /* 一周の線（型紙の輪郭）の塗り */
  items.push(...extra); items.sort((x, y) => (x.li || 0) - (y.li || 0) || y.area - x.area); attachClearCuts(items, d, vis);   /* 層の並びが先（手前の層ほど上）。同じ層の中は：大きい形が下・小さい形が上（本体の内側のポケットが、本体の下に隠れない・事業主の指摘 2026-10-18）。同じ面積は、並べた順のまま（安定ソート） */
  return items;
}
function drawLeatherFills(d, vis, move = s => s, extra = []) { paintLeatherItems(leatherItems(d, vis, move, extra)); }
/** 並んだ塗りの項目を、順に描く。 */
function paintLeatherItems(items) {
  /* 画面では半透明（革色 0.55）・質感と白は不透明で塗る。これまでは1つずつ半透明で重ねていたので、同じ色の塗りが重なった所だけ濃く（明るく）見え、「一色で塗られていない」ようになった（2026-10-20 事業主の指摘・ウォレットの図面の左の肌色は 3〜4 層）。
   → 同じ濃さが続く塗りは、まず作業用の紙に不透明で重ね（上の形の色が勝つ）、その紙を1回だけ半透明で貼る。書き出し（exporting）は今まで通り不透明で直接塗る。作業用の紙が使えないとき（テストの擬似画面など）は、今まで通り1つずつ。 */
  if (exporting) { for (const it of items) { ctx.save(); ctx.globalAlpha = 1; paintItem(it); ctx.restore(); } return; }
  const layer = leatherLayer();
  if (!layer) { for (const it of items) { ctx.save(); ctx.globalAlpha = it.direct ? 1 : it.alpha; paintItem(it); ctx.restore(); } return; }
  let run = [];
  const flush = () => {
    if (!run.length) return; const main = ctx, m = main.getTransform?.();
    layer.lc.save(); layer.lc.setTransform(1, 0, 0, 1, 0, 0); layer.lc.clearRect(0, 0, layer.c.width, layer.c.height); layer.lc.restore(); if (m) layer.lc.setTransform(m);
    ctx = layer.lc; try { for (const it of run) paintItem(it); } finally { ctx = main; }
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = run[0].alpha; main.drawImage(layer.c, 0, 0); main.restore(); run = [];
  };
  for (const it of items) { if (it.direct) { flush(); ctx.save(); ctx.globalAlpha = 1; it.draw(); ctx.restore(); continue; } if (run.length && it.alpha !== run[0].alpha) flush(); run.push(it); }
  flush();
}
/** 革色の塗りを重ねるための作業用の紙（画面と同じ大きさ・使い回す）。使えなければ null。 */
let leatherLayerCache = null;
let exportExtentMm = 0;   /* PNG 書き出し中の、図面のいちばん長い辺（mm）。寸法の数字の大きさを、図面に合わせるのに使う */
function leatherLayer() {
  try {
    if (typeof canvas.cloneNode !== 'function') return null;   /* 使えない環境（テストの擬似画面など）は、今まで通り1つずつ塗る。紙は画面の canvas の複製で作る（PNG 書き出し用の紙は document.createElement で作るので、取り違えない。OffscreenCanvas は Mac の検査で禁止） */
    const w = canvas.width, h = canvas.height; if (!(w > 0 && h > 0)) return null;
    let c = leatherLayerCache; if (!c) { c = canvas.cloneNode(false); if (!c || typeof c.getContext !== 'function') return null; c.removeAttribute?.('id'); leatherLayerCache = c; }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const lc = c.getContext('2d'); return lc ? { c, lc } : null;
  } catch { return null; }
}
/** 選んだ図形に金属の色（ゴールド・シルバー・ピンクゴールド・ブラックゴールド）を付ける。id が null なら解除。線の色と、3D の金具の面の色になる。革色・革の質感とは別（事業主指示 2026-10-13）。 */
/** 金属の色が付いた図形の、べた塗りの計画。置いた金具・手描き・取り込みのどれも、図形そのものの形から作る（登録した金具の形は見ない）。だから、金具を動かしても・形を直しても・拡大縮小しても、線と塗りは同じ（事業主の指摘 2026-10-18「リングの線と塗りがずれる」）。
 *  塗る形：閉じた図形（円も）と、端がつながった線の一周（metalGroup）。同じ金属の別の形にすっぽり入る形は、その形のくり抜きの穴（穴の中の形は、また塗る形）。リングアームの棒（occlude）は、線を描くときに本体の上へ別に塗る。
 *  戻り値：[{ metal, body: [点], holes: [[点]] }]（面積の大きい順＝小さい形が上）。d・vis・move は、ほかの紙・作図中の移動プレビュー用。 */
function metalFillPlan(d = doc, vis = visible, move = s => s) {
  const items = [], loops = new Map(), nonGeom = ['text', 'dimension', 'image', 'fold'];
  for (const s of d.shapes) {
    if (!s.metal || s.occlude || s.holeLink || nonGeom.includes(s.type) || !vis(s)) continue;
    if (s.closed || s.type === 'circle') { const poly = outlinePolygon([move(s)], s.id); if (poly) items.push({ layer: s.layer, metal: s.metal, points: poly.points, style: s.metalStyle === 'radial' ? 'radial' : 'linear' }); }
    else if (s.metalGroup) { if (!loops.has(s.metalGroup)) loops.set(s.metalGroup, []); loops.get(s.metalGroup).push(move(s)); }
  }
  for (const list of loops.values()) { const poly = outlinePolygon(list, list[0].id); if (poly) items.push({ layer: list[0].layer, metal: list[0].metal, points: poly.points, style: list[0].metalStyle === 'radial' ? 'radial' : 'linear' }); }
  const area = ps => Math.abs(ps.reduce((m, q, i) => { const r = ps[(i + 1) % ps.length]; return m + (q.x * r.y - r.x * q.y); }, 0)) / 2;
  const inside = (p, ps) => { let c = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) if ((ps[i].y > p.y) !== (ps[j].y > p.y) && p.x < (ps[j].x - ps[i].x) * (p.y - ps[i].y) / (ps[j].y - ps[i].y) + ps[i].x) c = !c; return c; };
  for (const it of items) it.area = area(it.points);
  items.sort((x, y) => y.area - x.area);
  for (const it of items) {   /* いちばん小さい入れ物（同じ金属で、全部の点が中にある）。入れ物が穴でなければ、自分は穴 */
    const parents = items.filter(o => o !== it && o.area > it.area && o.metal === it.metal && it.points.every(p => inside(p, o.points))).sort((x, y) => x.area - y.area);
    it.parent = parents[0] || null; it.hole = !!it.parent && !it.parent.hole;
  }
  return items.filter(it => !it.hole).map(it => ({ layer: it.layer, metal: it.metal, style: it.style, body: it.points, holes: items.filter(h => h.hole && h.parent === it).map(h => h.points) }));
}
/** 2色を割合 t（0〜1）で混ぜた色（#RRGGBB）。 */
function mixHex(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** 金属の質感：幅方向（細い側）に走る光沢の帯。暗→基本→明るい光→基本→やや暗→暗。磨いた金属が、丸みのある面に光を映したように見える。 */
function metalStops(m) { return [[0, m.dark], [0.12, mixHex(m.hex, m.dark, 0.35)], [0.3, m.hex], [0.42, m.light], [0.56, m.hex], [0.8, mixHex(m.hex, m.dark, 0.6)], [1, m.dark]]; }
/** 図形の線の色：情報パネルで選んだ色が先。無ければ、金属の色が付いた図形は金属の濃い側の色（塗りの上でも線が見える）。どちらも無ければ null。 */
const shapeLineColor = s => SHAPE_DRAW_COLOR[s.color] || (s.metal ? METAL_COLORS.find(m => m.id === s.metal)?.dark : null) || null;
/** 金属の塗り（線で囲まれた場所）に使われている図形の、線の色：その金属の濃い側（事業主 2026-10-25「レバーの輪郭だけ色が違う」：図形そのものに金属の色を付けた台座は線が金属の濃い色になるが、場所をクリックして塗ったレバーは、図形そのものに色が付かず、線が灰色のままだった）。 */
function metalEdgeColors(d = doc) {
  const out = new Map();
  for (const fl of d.fills || []) { if (!fl.metal) continue; const m = METAL_COLORS.find(x => x.id === fl.metal); if (m) for (const id of fl.ids || []) if (!out.has(id)) out.set(id, m.dark); }
  return out;
}

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
function drawMetalFills(vis = visible) { for (const it of metalDrawItems(vis)) it.draw(); }   /* 金属の塗りだけを、いまの層の順で描く（革色の塗りといっしょに並べるときは metalDrawItems を使う） */
function metalDrawItems(vis = visible) {
  const trace = ps => { ps.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); };
  const paint = (m, ps, holes, style) => {
    ctx.save(); ctx.setLineDash([]); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1.5; ctx.shadowOffsetY = 2.5; ctx.fillStyle = metalShade(m, ps, style); ctx.beginPath(); trace(ps); for (const h of holes) trace(h); ctx.fill('evenodd'); ctx.restore();
    ctx.save(); ctx.beginPath(); trace(ps); for (const h of holes) trace(h); ctx.clip('evenodd'); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3 / scale; ctx.beginPath(); trace(ps); ctx.stroke(); ctx.restore(); /* 内側の縁のハイライト */
    for (const h of holes) { ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1.6 / scale; ctx.beginPath(); trace(h); ctx.stroke(); ctx.restore(); } /* 穴の暗い縁 */
  };
  const rank = layerRankMap(doc), byId = new Map(doc.shapes.map(s => [s.id, s])), items = [];
  for (const fl of visibleFills(doc, vis, 'metal')) { const m = METAL_COLORS.find(x => x.id === fl.metal); if (m) items.push({ li: fillLayerRank(fl, rank, byId), area: leatherItemArea(fl.points), direct: true, alpha: 1, draw: () => paint(m, fl.points, fl.holes || [], fl.style) }); }   /* 線で囲まれた場所の金属の塗り */
  for (const r of metalFillPlan(doc, vis, previewMoved)) { const m = METAL_COLORS.find(x => x.id === r.metal); if (m) items.push({ li: rank.get(r.layer) || 0, area: leatherItemArea(r.body), direct: true, alpha: 1, draw: () => paint(m, r.body, r.holes, r.style) }); }   /* 図形そのものの形で塗る（動かしている最中も、線と同じ位置） */
  return items;
}
function applyMetal(id, style = currentMetalStyle()) {   /* style：光沢の形（帯・放射）。省略は、選択欄の値 */
  if (id) rememberBrush({ kind: 'metal', id, style });
  const rawIds = new Set(doc.shapes.filter(s => selected.has(s.id) && editable(s)).map(s => s.id)), ids = id ? scopeSectionIds(rawIds, 'metal') : rawIds; if (!ids.size) { if (!doc.shapes.some(s => selected.has(s.id))) startPaint(id ? { kind: 'metal', id, style } : { kind: 'erase' }); else $('hint').textContent = t(rawIds.size ? 'sectionPaintScope' : 'metalNeedSelect'); return 0; }   /* 解除も、選ばずに押すと「金属の色を消す」モード（事業主の指摘 2026-10-19） */   /* 何も選んでいなければ、その色を持って塗りモードに（解除は、選んでから。ロックしたレイヤーの図形を選んでいるときは、今までどおりの案内） */
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
function applyTexture(id, quiet = false) {   /* quiet：塗りモードのクリックから呼ぶとき。付けられなければ案内を出さず 0 を返す（そのあと囲まれた場所を塗る）。返り値：付けた数 */
  if (id && !quiet) rememberBrush({ kind: 'texture', id });
  if (id && !quiet && !doc.shapes.some(sh => selected.has(sh.id))) { startPaint({ kind: 'texture', id }); return 0; }   /* 何も選んでいなければ、その質感を持って塗りモードに（色の見本と同じ・事業主 2026-10-23「革の質感を図形に貼れない」「パッチワークの各ピースに塗る予定」：ピースの内側クリックでは選べず、0件で押していた） */
  const okIds = scopeSectionIds(new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh)).map(sh => sh.id)), 'leather'), parts = doc.parts.filter(p => p.shapeIds.some(i => okIds.has(i)));
  const loose = doc.shapes.filter(sh => okIds.has(sh.id) && (sh.closed || sh.type === 'circle') && !doc.parts.some(p => p.shapeIds.includes(sh.id)));
  const inPart = new Set(doc.parts.flatMap(p => p.shapeIds)), open = doc.shapes.filter(sh => okIds.has(sh.id) && !sh.hw && !sh.holeLink && !inPart.has(sh.id) && !(sh.closed || sh.type === 'circle') && !['text', 'dimension', 'image', 'fold'].includes(sh.type));   /* 端と端が一周する線・囲まれた場所＝型紙（部品でなくてよい・事業主の指摘 2026-10-18「囲まれた矩形にホースバットが載せられない」） */
  if (!parts.length && !loose.length && !open.length) { if (!quiet) $('hint').textContent = t('selectPartFirst'); return 0; }
  const x = id ? textureById(id) : null; if (id && !x) return;
  const loops = [], rest = new Set(open.map(sh => sh.id)), left = [];   /* 一周にできた線のまとまり・一周にできなかった線 */
  while (rest.size) { const pool = open.filter(sh => rest.has(sh.id)), startId = pool[0].id, poly = outlinePolygon(pool, startId); if (poly) { loops.push(poly.ids); for (const i of poly.ids) rest.delete(i); } else { for (const i of contourFrom(pool, startId)) if (rest.delete(i)) left.push(i); if (rest.delete(startId)) left.push(startId); } }
  const canDo = parts.length || loose.length || loops.length || (x ? left.length && enclosedAreasAround(regionShapes(), new Set(left)).length : open.some(sh => sh.texture) || (doc.fills || []).some(f => f.texture && f.ids.filter(i => okIds.has(i)).length * 2 >= f.ids.length));   /* 何も付けられない（囲めない線だけ）なら、今までの案内 */
  if (!canDo) { if (!quiet) $('hint').textContent = t('selectPartFirst'); return 0; }
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
  return n;
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
  render3d(); exportFile('leather-3d.png', new Promise(res => canvas3d.toBlob(b => res(b || null), 'image/png')), 'image/png', saved => { $('hint').textContent = t('exported', { name: 'PNG (3D)' }) + savedTo(saved); });
}
function initColors() {
  loadPins(); renderColors();
  $('threadSearch').addEventListener('input', renderColors); $('threadSel').addEventListener('change', renderColors);
  $('applyThread').onclick = applyThread; $('pinThread').onclick = () => { const id = $('threadSel').value; if (!id) return; colorPins = colorPins.includes(id) ? colorPins.filter(x => x !== id) : [...colorPins, id]; persistPins(); renderColors(); };
  $('metalClear').onclick = () => applyMetal(null); $('eraseFill').onclick = () => startPaint({ kind: 'eraseFill' });
  $('paintSection').onclick = paintSectionAuto; $('flowPaint').onclick = paintSectionAuto;
  $('leatherHex').addEventListener('change', () => { const raw = String($('leatherHex').value).trim().replace(/^#/, ''), v = /^[0-9a-fA-F]{3}$/.test(raw) ? '#' + raw.split('').map(c => c + c).join('') : /^[0-9a-fA-F]{6}$/.test(raw) ? '#' + raw : null; if (v) { $('leatherHex').value = v.toUpperCase(); applyLeather(v.toUpperCase()); } });   /* FFFFFF・#fff・#FFFFFF のどれでも（事業主 2026-10-24「白に塗りつぶせない」） */
  $('textureSearch').addEventListener('input', renderTextures); $('textureSel').addEventListener('change', renderTextures);
  $('applyTexture').onclick = () => applyTexture($('textureSel').value);
  $('textureSel').addEventListener('change', () => { if (mode === 'paint' && paintBrush?.kind === 'texture' && $('textureSel').value) { paintBrush = { kind: 'texture', id: $('textureSel').value }; $('hint').textContent = t('paintStart', { name: paintName(paintBrush) }); } });   /* 塗りモードの途中で質感を選び直したら、その質感で塗る */
  $('textureMm').addEventListener('change', () => { /* 数値＝全部その大きさ・空欄＝写真ごとの実寸に戻す・数でなければ元の表示に戻す */
    const raw = String($('textureMm').value ?? '').trim(), v = Number(raw);
    if (raw !== '' && !(v > 0)) { $('textureMm').value = Number(doc.textureMm) > 0 ? String(doc.textureMm) : ''; return; }
    if (v > 0 ? doc.textureMm !== v : doc.textureMm !== undefined) commit(() => { if (v > 0) doc.textureMm = v; else delete doc.textureMm; });
  });
  $('savePattern').onclick = savePattern; $('loadPattern').onclick = loadPattern; $('exportPng3d').onclick = exportPng3d;
  $('exportSvgFill').onclick = () => { if (!regGuard('svg', 'color')) return; exportFile('leather-pattern-color.svg', docToSvg(outputDoc(), { includeHoles: true, fill: true }), 'image/svg+xml', saved => { $('hint').textContent = t('exported', { name: 'SVG (color)' }) + savedTo(saved); }); };
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
  $('recipePrint').onclick = () => { $('outputCard').open = true; revealCard($('outputCard')); printPages(); };
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
/** 部品の削除（事業主 2026-10-25「部品にミスがあったので削除したい」：削除のボタンは、折りたたんだ「選択を登録・書き出し」の中にしか無かった）。選んでいる部品の下に、いつも見える「選んでいる部品を削除」を足した。
 *  押し間違いで消さないよう、1回目は確認だけ・5秒以内にもう一度押すと消す。消す前に、バックアップに残す（「バックアップから戻す」で戻せる）。同梱の部品は消せない。 */
let libRemoveArm = null;
function removeFromLibrary() {
  const it = libCurrent(); if (!it || !userLibrary.includes(it)) { $('hint').textContent = t('libBuiltin'); return; }
  const btns = [['libRemove', 'libRemove'], ['libRemoveSel', 'libRemoveSel']].map(([id, key]) => [$(id), key]).filter(([b]) => b), reset = () => { libRemoveArm = null; for (const [b, key] of btns) b.textContent = t(key); };
  if (!libRemoveArm || libRemoveArm.id !== it.id || Date.now() - libRemoveArm.at > 5000) { const at = Date.now(); libRemoveArm = { id: it.id, at }; for (const [b] of btns) b.textContent = t('libRemoveAgain'); $('hint').textContent = t('libRemoveConfirm', { name: it.name }); setTimeout(() => { if (libRemoveArm?.at === at) reset(); }, 5000); return; }
  saveLibBackups(pushLibraryBackup(loadLibBackups(), userLibrary));   /* 消す前の一覧を、バックアップに残す */
  userLibrary = userLibrary.filter(x => x !== it); persistLibrary(); renderLibrary(); renderLibBackups(); reset(); $('hint').textContent = t('libRemoved', { name: it.name });
}
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
/** 選んでいる穴（箱で囲む・全選択で選ばれる）の番号。コピーで、縫い線が隠したガイドの層にある穴も運ぶため。 */
function selectedHoleIdSet() { return new Set(doc.holes.filter(h => selected.has(h.id) && holeEditable(h)).map(h => h.id)); }
function clipboardText() { const ids = selectedShapeIds(); if (!ids.size) return null; return encodeClipboard(extractSelection(doc, ids, { holeIds: selectedHoleIdSet() }), tabs[activeTab]?.name || 'untitled'); }
/** 貼り付ける図形全体の中心を、マウスの位置に置くときの、置き場所。マウスの位置は磁石・スナップを効かせる（事業主指示 2026-10-17：中心に貼り付けられない・スナップが効いていない） */
function pasteTarget(data) { const bb = bboxOfDoc({ shapes: data.payload.shapes || [], holes: [] }), k = Number($('pasteScale').value) || 1, p = snapped(cursor, false, anchor()); snap = null; return { x: p.x - (bb ? (bb.minX + bb.maxX) / 2 : 0) * k, y: p.y - (bb ? (bb.minY + bb.maxY) / 2 : 0) * k }; }
/** 貼り付け待ち（事業主 2026-10-25「コピーした図形が他の図形と重なったところで貼り付けられてしまう。カーソル位置で移動後に貼り付けられるように」）：Ctrl+V では、すぐに置かず、貼る図形が半透明でカーソルについて動く。クリックした所に貼る（Esc でやめる）。 */
function beginPaste(text) {
  const data = decodeClipboard(text); if (!data) return false;
  cancel(); pasteGhost = { text, data }; $('hint').textContent = t('pasteHold', { n: (data.payload.shapes || []).length }); draw(); return true;
}
function placePasteGhost() { const g = pasteGhost; pasteGhost = null; if (g) pasteText(g.text, pasteTarget(g.data)); }
function drawPasteGhost() {
  if (!pasteGhost) return; const k = Number($('pasteScale').value) || 1, moved = transformPayload({ shapes: (pasteGhost.data.payload.shapes || []).filter(s => s.type !== 'image' && s.type !== 'dimension') }, pasteTarget(pasteGhost.data), k);
  ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 0.75; ctx.lineWidth = 1.4 / scale; for (const s of moved.shapes) { try { strokeShape(s, '#5ad0ff'); } catch { /* 描けない図形は、見えなくてよい */ } } ctx.restore();
}
function pasteText(text, at = null) {
  const data = decodeClipboard(text); if (!data) return false;
  let target = at; if (!target) target = pasteTarget(data);
  let ids = [];
  cancel(); commit(() => { ids = mergePayload(doc, data.payload, { at: target, scale: Number($('pasteScale').value) || 1, freshId, source: 'clip:' + data.source }); selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('pasted', { n: ids.length, from: data.source }); return true;
}
// タブ：文書ごとに undo/redo/選択を持つ
function snapshotTab() { if (tabs[activeTab]) Object.assign(tabs[activeTab], { doc, undo, redo, selected, activeLayer, scale, origin }); }
function renderTabs() {
  scheduleAutosave();
  const bar = $('tabBar'); bar.textContent = '';
  tabs.forEach((tab, i) => { const b = document.createElement('button'); b.textContent = tab.name + (tab.dirty ? ' •' : ''); b.classList.toggle('active', i === activeTab); b.onclick = () => switchTab(i); b.title = t('tabDblTip'); b.onauxclick = e => { if (e.button === 1) { e.preventDefault(); closeTabAt(i); } }; if (tab.fileHandle?.name) { const f = document.createElement('span'); f.className = 'tabFile'; f.textContent = tab.fileHandle.name; f.title = t('tabFileTip'); b.appendChild(f); } /* 上書き保存の行き先（保存先のファイル名）を小さく添える */ if (tabs.length > 1) { const x = document.createElement('span'); x.className = 'tabX'; x.textContent = '×'; x.title = t('tabClose'); x.onclick = e => { e.stopPropagation(); closeTabAt(i); }; b.appendChild(x); } bar.appendChild(b); });
  bar.ondblclick = e => { const t0 = e?.target, b = t0?.closest ? t0.closest('button') : t0; if (!b || t0?.className === 'tabX' || t0?.closest?.('.tabX')) return; const i = [...bar.children].indexOf(b); return i >= 0 ? openTabFolder(tabs[i]) : undefined; };   /* ダブルクリックは、タブの並び全体で受ける（1回目のクリックでタブを描き直すため、ボタンごとに付けると取りこぼす） */
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
  const payload = extractSelection(doc, ids, { holeIds: selectedHoleIdSet() }), other = tabs[target].doc, before = JSON.stringify(other);
  const newIds = mergePayload(other, payload, { at: payload.origin, scale: 1, freshId, source: 'tab:' + tabs[activeTab].name });
  tabs[target].undo = tabs[target].undo || []; tabs[target].undo.push(before); tabs[target].dirty = true;
  if (move) removeSelected();
  renderTabs(); $('hint').textContent = t('sentToTab', { n: newIds.length, name: tabs[target].name });
}
function initLibrary() {
  loadLibrary(); renderLibrary(); renderLibBackups(); $('libBackupNow').onclick = backupLibraryNow; $('libBackupRestore').onclick = restoreLibBackup;
  $('libItem').addEventListener('change', renderLibrary); $('libSearch').addEventListener('input', renderLibrary);
  $('libPlace').onclick = () => setMode('library'); $('libSave').onclick = saveToLibrary; $('libRemove').onclick = removeFromLibrary; $('libRemoveSel').onclick = removeFromLibrary; $('libExport').onclick = exportLibrary;
  $('libImport').onclick = () => $('libFile').click(); $('libFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await importLibrary(f); });
  $('tabNew').onclick = () => newTab(); $('tabClose').onclick = closeTab; $('tabName').addEventListener('change', () => { if (tabs[activeTab]) { tabs[activeTab].name = $('tabName').value.trim() || tabs[activeTab].name; renderTabs(); } });
  $('sendCopy').onclick = () => sendToTab(false); $('sendMove').onclick = () => sendToTab(true);
  $('pasteBtn').onclick = () => { const text = $('pasteBox').value; if (!pasteText(text)) $('hint').textContent = t('pasteInvalid'); };
  $('copyBtn').onclick = () => { const text = clipboardText(); if (!text) { $('hint').textContent = t('selectFirst'); return; } $('pasteBox').value = text; if (typeof document.execCommand === 'function') { try { $('pasteBox').select(); document.execCommand('copy'); } catch { /* 手動コピー */ } } $('hint').textContent = t('copied'); };
  document.addEventListener?.('copy', e => onClipCopy(e, false));
  document.addEventListener?.('cut', e => onClipCopy(e, true));
  document.addEventListener?.('paste', e => { if (isTextEntry(e.target) || isTextEntry(document.activeElement)) return; const text = e.clipboardData?.getData('text/plain'); if (text && beginPaste(text)) e.preventDefault(); });
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
function fillBinderSpecOptions(sel, placeholder = false) {
  if (placeholder) { const o = document.createElement('option'); o.value = ''; o.textContent = t('foldFlowBookPick'); sel.appendChild(o); }   /* 小窓の⓪：何も選んでいない状態を作る（勝手に決まらないように） */
  const en = document.documentElement.lang === 'en', nameOf = s => en ? s.names.en : s.names.ja, aliasOf = s => (s.names.aliases || []).filter(a => typeof a === 'string' && a), labelOf = s => aliasOf(s).length ? (en ? `${nameOf(s)} (${aliasOf(s).join(', ')})` : `${nameOf(s)}（${aliasOf(s).join('・')}）`) : nameOf(s);   /* 別名（ロルバーン M・Filofax Pocket など）を名前のあとに添える：一覧で探せるように */
  const opt = (s, into) => { const o = document.createElement('option'); o.value = s.id; o.textContent = labelOf(s); into.appendChild(o); };
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
function fillRingOptions(rd, spec, placeholder = false) {
  rd.textContent = '';
  if (placeholder) { const o = document.createElement('option'); o.value = ''; o.textContent = t('foldFlowBookPick'); rd.appendChild(o); }
  for (const d of spec?.rings?.diameterOptionsMm ?? []) { const o = document.createElement('option'); o.value = String(d); const size = ringSizeOf(spec, d); o.textContent = t('ringSizeLabel', { inner: size.inner, outer: ringOuterLabel(size) }); rd.appendChild(o); }
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
/** 移動できる選択があるか：図形、または、図形を選ばず菱目（穴）だけを選んでいる（事業主の質問 2026-10-20「菱目の移動のボタンがみつからない」：以前は図形だけを数えていて、菱目だけを選ぶと移動カードが隠れ・押しても動かなかった）。 */
const hasMoveTarget = () => selectedShapeIds().size > 0 || doc.holes.some(h => selected.has(h.id) && holeEditable(h));
function refreshMoveCard() { const none = !hasMoveTarget(); $('moveCard').hidden = none; if (none && $('moveCard').dataset.win === '1') setCardWin('moveCard', false, true); }   /* 動かす図形が無くなったら、窓も閉じる */
function applyMove() {
  const dx = Number($('moveDx').value), dy = Number($('moveDy').value);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) { $('hint').textContent = t('invalidNumber'); return; }
  if (!hasMoveTarget() || (dx === 0 && dy === 0)) return;
  transformSelected(s => translate(s, dx, dy)); $('hint').textContent = t('moved', { x: dx, y: dy });
}
$('moveApply').onclick = applyMove;
/** 複製して動かす（事業主 2026-10-24「移動の機能に複製して移動する機能が欲しい」）：選んだ図形の複製を dx・dy だけずらして置き、複製を選ぶ（続けて押すと、同じ量ずつ並べて複製）。元は動かない・元に戻すは1回。 */
function applyMoveCopy() {
  const dx = Number($('moveDx').value), dy = Number($('moveDy').value);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) { $('hint').textContent = t('invalidNumber'); return; }
  if (!selectedShapeIds().size) { $('hint').textContent = t('moveCopyNeed'); return; }
  if (dx === 0 && dy === 0) { $('hint').textContent = t('invalidNumber'); return; }   /* 0 だと、元と重なった複製ができるだけ */
  copySelectedOffsets([{ dx, dy }]); $('hint').textContent = t('movedCopy', { x: dx, y: dy });
}
$('moveCopy').onclick = applyMoveCopy;
$('adRun').onclick = runAutoDims; $('adClear').onclick = clearAutoDims;
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
  const fmt = v => (+v).toFixed(2), key = [...ids].sort().join(',');
  if (attachState?.key === key) {   /* 2本目（事業主指示 2026-10-21「上辺、右辺とぴったり重なりあうように線どうしがくっつく」）：1本目に着いたまま、2本目の線にも着く（動くのは1本目の線に沿う方向だけ）。平行で着けられないときは、1本目だけのまま案内する */
    const r2 = attachToLines(pts, attachState.line, line); if (!r2) { $('hint').textContent = t('attachNoLine'); return; }
    if (!r2.both) { $('hint').textContent = t('attachParallel'); return; }
    if (Math.hypot(r2.dx, r2.dy) < 0.005) { setMode('select'); $('hint').textContent = t('attachBothAlready'); return; }
    const { undoLen, moved } = attachState; transformSelected(s => translate(s, r2.dx, r2.dy));
    if (moved && undo.length === undoLen + 1) undo.splice(undoLen, 1);   /* 元に戻すは1回で、2本ぶん戻る（1本目の動きの履歴に、2本目の動きを含める） */
    setMode('select'); $('hint').textContent = t('attachBoth', { gap: fmt(Math.hypot(r2.dx, r2.dy)) }); return;
  }
  const r = attachToLine(pts, line, { rotate: $('attachRotate').checked }); if (!r) { $('hint').textContent = t('attachNoLine'); return; }
  const already = Math.abs(r.gap) < 0.005 && !r.angleDeg;
  if (!already) transformSelected(s => translate(r.angleDeg ? rotate(s, r.angleDeg, r.pivot) : s, r.dx, r.dy), { rotates: !!r.angleDeg });
  attachState = { key, line, undoLen: undo.length, moved: !already };   /* 着けたあとも着ける状態のまま：続けて2本目の線をクリックできる（Esc・別のツールで終わり） */
  $('hint').textContent = (already ? t('attachAlready') : r.angleDeg ? t('attachDoneRot', { gap: fmt(Math.abs(r.gap)), angle: fmt(Math.abs(r.angleDeg)) }) : t('attachDone', { gap: fmt(Math.abs(r.gap)) })) + ' ' + t('attachNext');
}
/* ───────── 対称チェック（事業主 2026-10-25「選択した画像が上下左右対称になっているかチェックする機能が欲しい」）：選んでいる図形を、外接の四角の中心の縦線（左右）・横線（上下）で折り返した図形が、もとの図形と重なるかを調べる。
   折り返した図形の線の上の点（0.5mm おきぐらい）が、もとの図形から離れている距離のいちばん大きいところ（ずれ）を出す。もとの点が、折り返した図形から離れている距離も。
   ずれ 0.05mm 以下＝○対称・0.3mm 以下＝△ほぼ対称・それより大きい＝×。ずれた場所に赤い印・対称の軸に水色の点線を、選び直すまで出す（画面だけ・図面は変えない）。 ───────── */
const SYM_OK = 0.05, SYM_NEAR = 0.3, SYM_SKIP = ['text', 'dimension', 'image', 'fold'];
function symSamples(s, step) {
  const pts = flattenShape(s, 0.02), out = []; if (pts.length === 1) return [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / step)); for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }
  out.push(pts.at(-1)); return out;
}
/** 図形 list を、軸（'x'＝縦線 x=c で左右・'y'＝横線 y=c で上下）で折り返して比べる。{ axis, c, maxDev, bad:[{x,y,d}]（ずれの大きい所・3mm 以上はなして最大6つ）, samples }。図形が無ければ null。 */
function symmetryCheck(list, axis) {
  const shapes = list.filter(s => !SYM_SKIP.includes(s.type) && !s.holeLink); if (!shapes.length) return null;
  const b = bboxOfDoc({ shapes, holes: [] }); if (!b) return null; const c = axis === 'x' ? (b.minX + b.maxX) / 2 : (b.minY + b.maxY) / 2, mir = shapes.map(s => axis === 'x' ? mirrorX(s, c) : mirrorY(s, c));
  const total = shapes.reduce((m, s) => { try { return m + arcLength(s); } catch { return m; } }, 0), step = Math.max(0.5, total / 2000), pairs = [[mir, shapes, 1], [shapes, mir, 0]], found = [];
  const boxes = new Map([...shapes, ...mir].map(s => [s, bboxOf(s)])), lower = (bx, p) => Math.hypot(Math.max(bx.minX - p.x, 0, p.x - bx.maxX), Math.max(bx.minY - p.y, 0, p.y - bx.maxY));   /* 図形の外接の四角までの距離＝距離の下限（これが今の最小以上なら、その図形は測らない） */
  for (const [from, to, mirrored] of pairs) for (const s of from) for (const p of symSamples(s, step)) {
    let d = Infinity; for (const o of to) { if (lower(boxes.get(o), p) >= d) continue; const q = distToShape(o, p); if (q < d) d = q; if (d < 1e-6) break; }
    if (d > SYM_OK) found.push({ x: mirrored ? (axis === 'x' ? 2 * c - p.x : p.x) : p.x, y: mirrored ? (axis === 'y' ? 2 * c - p.y : p.y) : p.y, d });   /* 印は、もとの図形の側に出す */
  }
  found.sort((u, v) => v.d - u.d); const bad = []; for (const f of found) if (bad.length < 6 && bad.every(q => Math.hypot(q.x - f.x, q.y - f.y) > 3)) bad.push(f);
  return { axis, c, maxDev: found.length ? found[0].d : 0, bad, box: b };
}
let symView = null;   /* 画面に出す対称チェックの結果：{ key（選んだ図形の組）, results:[左右, 上下] } */
const symKey = () => [...selectedShapeIds()].sort().join(',');
function symText(r) { const d = (+r.maxDev).toFixed(2); return r.maxDev <= SYM_OK ? t('symOk', { d }) : r.maxDev <= SYM_NEAR ? t('symNear', { d }) : t('symNg', { d }); }
function runSymmetryCheck() {
  const ids = selectedShapeIds(), list = doc.shapes.filter(s => ids.has(s.id) && !SYM_SKIP.includes(s.type) && !s.holeLink && visible(s));
  if (!list.length) { symView = null; $('hint').textContent = t('symNeedSelect'); draw(); return null; }
  const lr = symmetryCheck(list, 'x'), ud = symmetryCheck(list, 'y'); symView = { key: symKey(), results: [lr, ud] };
  $('hint').textContent = t('symResult', { n: list.length, lr: symText(lr), ud: symText(ud) }); draw(); return { lr, ud };
}
function drawSymView() {
  if (!symView || exporting || symView.key !== symKey()) return; const k = 1 / scale; ctx.save(); ctx.setLineDash([6 * k, 4 * k]); ctx.lineWidth = 1.2 * k; ctx.strokeStyle = '#4fd0ff';
  for (const r of symView.results) { if (!r) continue; const b = r.box, m = 6; ctx.beginPath(); if (r.axis === 'x') { ctx.moveTo(r.c, b.minY - m); ctx.lineTo(r.c, b.maxY + m); } else { ctx.moveTo(b.minX - m, r.c); ctx.lineTo(b.maxX + m, r.c); } ctx.stroke(); }
  ctx.setLineDash([]); ctx.lineWidth = 2 * k; ctx.strokeStyle = '#ff4040'; for (const r of symView.results) for (const q of r?.bad || []) { ctx.beginPath(); ctx.arc(q.x, q.y, 7 * k, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
/** 基準の図形の中央へ（事業主 2026-10-25「選択した図形群がサポーター図形の中央に配置できない」）：選んでいる図形（群）を、1つのまとまりとして、クリックした基準の図形の中央へ動かす。
 *  基準の図形は、クリックした線につながった外形（端がつながった線・弧・折れ線）をまるごと1つの形として、その外接の四角の中心。選んでいない図形から選ぶ。axes：'xy'（縦横）・'x'（横だけ）・'y'（縦だけ）。元に戻すは1回。 */
let centerOnAxes = 'xy';
function centerOnStart(axes) {
  if (!selectedShapeIds().size) { $('hint').textContent = t('centerOnNeedSelect'); return; }
  centerOnAxes = axes; setMode('centerOn'); $('hint').textContent = t('centerOnStart');
}
function centerOnClick(p) {
  const ids = selectedShapeIds(); if (!ids.size) { setMode('select'); $('hint').textContent = t('centerOnNeedSelect'); return; }
  const skip = s => ids.has(s.id) || s.holeLink || !visible(s) || ['text', 'dimension', 'image', 'fold'].includes(s.type);
  let target = null; for (const s of doc.shapes) { if (skip(s)) continue; const d = distToShape(s, p); if (d <= 12 / scale && (!target || d < target.d)) target = { s, d }; }
  const boxOf = list => { let b = null; for (const s of list) { const q = bboxOf(s); b = b ? { minX: Math.min(b.minX, q.minX), minY: Math.min(b.minY, q.minY), maxX: Math.max(b.maxX, q.maxX), maxY: Math.max(b.maxY, q.maxY) } : { ...q }; } return b; };
  let tb = null;
  if (target) { const pool = doc.shapes.filter(s => !skip(s) && s.type !== 'circle'), chain = target.s.closed || target.s.type === 'circle' ? [target.s.id] : contourFrom(pool, target.s.id, { gapTol: 0.5 }), members = new Set(chain.length ? chain : [target.s.id]); tb = boxOf(doc.shapes.filter(s => members.has(s.id))); }
  else {   /* 線の近くでなければ、クリックした所を囲んでいる場所（選んでいない見えている実線で囲まれた、いちばん内側）の中央へ（事業主 2026-10-25「真ん中に配置できない」：基準の線のすぐそばをクリックしないと動かなかった） */
    const reg = enclosedAreaAt(regionShapes().filter(s => !ids.has(s.id)), p); if (reg?.points?.length) { const xs = reg.points.map(q => q.x), ys = reg.points.map(q => q.y), pb = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }, rs = doc.shapes.filter(s => (reg.ids || []).includes(s.id)), ib = rs.length ? boxOf(rs) : null; tb = ib && ['minX', 'maxX', 'minY', 'maxY'].every(k => Math.abs(ib[k] - pb[k]) < 1) ? ib : pb; }   /* 囲んでいる図形の外接の四角が、囲まれた場所とほぼ同じなら、図形そのものの値（点線の目盛りでなく、ぴったり） */
  }
  if (!tb) { $('hint').textContent = t('centerOnNoTarget'); return; }
  /* 動かす図形の中心は、実線の図形（本体）だけで測る：点線・ガイドの層・寸法・文字（十字の目印・折り目の線・寸法など）を含めると、それが外形からはみ出している分だけ中心がずれる（事業主 2026-10-25「クロスの点線を作図しても２つの図形の中心を合わせられない」「4mm動かしただけなのにだいぶずれる」：本体の横に置いた十字の点線が、選んだ図形の外接の四角を広げて、約2.5mm左へずれた）。動かすのは、選んだ図形ぜんぶ。本体が1つも無ければ（点線だけを選んだとき）、選んだぜんぶで測る */
  const movers = doc.shapes.filter(s => ids.has(s.id) && !s.holeLink && s.type !== 'image'), isHelper = s => s.lineStyle === 'dashed' || s.layer === 'guide' || ['text', 'dimension', 'fold'].includes(s.type), body = movers.filter(s => !isHelper(s)), sb = boxOf(body.length ? body : movers); if (!sb) return;
  const dx = centerOnAxes.includes('x') ? (tb.minX + tb.maxX) / 2 - (sb.minX + sb.maxX) / 2 : 0, dy = centerOnAxes.includes('y') ? (tb.minY + tb.maxY) / 2 - (sb.minY + sb.maxY) / 2 : 0;
  setMode('select'); if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005) { $('hint').textContent = t('centerOnAlready'); return; }
  transformSelected(s => translate(s, dx, dy)); $('hint').textContent = t('centerOnDone', { dx: dx.toFixed(2), dy: dy.toFixed(2) });
}
$('symCheck').onclick = runSymmetryCheck; $('centerOnXY').onclick = () => centerOnStart('xy');   /* 右クリックの「中心を合わせる」は、移動の窓の「基準の中央へ（縦横）」と同じ（事業主 2026-10-25「二つの図形の中心どうしを合わせるだけなのに」→「右クリックの図形の移動に加えたらよくないですか？左メニューがどんどんふくれてきているので使いにくい」） */ $('centerOnX').onclick = () => centerOnStart('x'); $('centerOnY').onclick = () => centerOnStart('y');
$('attachStart').onclick = attachStart; $('attachLeft').onclick = attachStart;   /* 左メニューの「線に着ける」も同じ（Shift+A） */ $('fillsClear').onclick = clearFills; $('fillsDetachedClear').onclick = clearDetachedFills; $('metalStyle').onchange = changeMetalStyle;
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
  const b = selectionBox(); $('scaleCard').hidden = !b; if (!b) { scaleCardKey = ''; scaleBadInputs.clear(); if ($('scaleCard').dataset.win === '1') setCardWin('scaleCard', false, true); return; }   /* 選んだ図形が無くなったら、窓も閉じる（また選んでも勝手には出ない） */
  const w = b.maxX - b.minX, h = b.maxY - b.minY, key = JSON.stringify([[...selectedShapeIds()].sort(), w, h]);
  $('scaleSize').textContent = t('scaleNow', { w: w.toFixed(2), h: h.toFixed(2) });
  $('scaleW').disabled = w === 0; $('scaleH').disabled = h === 0;
  if (reset || key !== scaleCardKey) { $('scaleX').value = $('scaleY').value = '100'; $('scaleAngle').value = '0'; $('scaleW').value = w.toFixed(2); $('scaleH').value = h.toFixed(2); scaleBadInputs.clear(); }
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
  const b = selectionBox(), px = Number($('scaleX').value), py = Number($('scaleY').value), angleText = String($('scaleAngle')?.value ?? '').trim(), angle = angleText === '' ? 0 : Number(angleText);   /* 角度（°）：空欄は 0（事業主の希望 2026-10-20「拡大縮小回転」＝拡大縮小のあと、同じ基準点のまわりに回す） */
  if (!b) return; if (scaleBadInputs.size || !(px > 0) || !(py > 0) || !Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(angle) || $('scaleX').value === '' || $('scaleY').value === '') { $('hint').textContent = t('scaleInvalid'); return; }
  const sx = px / 100, sy = py / 100; if (sx === 1 && sy === 1 && angle === 0) return;
  const a = $('scaleAnchor').value, o = { x: /Right$/.test(a) ? b.maxX : /Left$/.test(a) ? b.minX : (b.minX + b.maxX) / 2, y: /^bottom/.test(a) ? b.maxY : /^top/.test(a) ? b.minY : (b.minY + b.maxY) / 2 };
  const ids = selectedShapeIds(), curved = Math.abs(sx - sy) > 1e-12 && doc.shapes.some(s => ids.has(s.id) && (s.type === 'circle' || s.type === 'arc'));
  const all = quadAllSelected();
  const scales = sx !== 1 || sy !== 1;
  transformSelected(s => { const m = scales ? scaleGeometry(s, sx, sy, o) : s; return angle ? rotate(m, angle, o) : m; }, { rotates: angle !== 0 });   /* 拡大縮小してから、同じ基準点のまわりに回す（1回で元に戻せる） */
  if (all && scales) quadFollowScale(sx, sy, o);
  $('scaleX').value = $('scaleY').value = '100'; $('scaleAngle').value = '0';
  $('hint').textContent = !angle ? t(curved ? 'scaleToPoly' : 'scaled', { x: px, y: py }) : scales ? t('scaledRotated', { x: px, y: py, a: angle }) : t('rotDone', { a: angle }); refreshScaleCard(true);
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
  const cur = phrases.find(p => p.name === sel.value); if (cur) { $('phraseName').value = cur.name; $('phraseText').value = cur.text; $('phraseFont').value = cur.font || 'gothic'; if (cur.size) $('phraseSize').value = String(cur.size); }   /* 句が覚えている書体・大きさ（覚えていなければ、欄はそのまま） */
}
function savePhrase() {
  let r; try { r = upsertPhrase(phrases, $('phraseName').value, $('phraseText').value, { font: $('phraseFont').value, size: Number($('phraseSize').value) }); } catch { $('hint').textContent = t('phraseEmpty'); return; }
  phrases = r.items; if (!persistPhrases()) return; renderPhraseList(r.name); $('hint').textContent = t('phraseSaved', { name: r.name });
}
function deletePhrase() { const name = $('phraseSel').value; if (!name) return; phrases = removePhrase(phrases, name); if (!persistPhrases()) return; $('phraseName').value = ''; $('phraseText').value = ''; renderPhraseList(''); $('hint').textContent = t('phraseDeleted', { name }); }
function placePhrase(at) {
  const lines = phraseLines($('phraseText').value); if (!lines.some(Boolean)) { $('hint').textContent = t('phraseEmpty'); return; }
  const layer = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || doc.layers.find(l => l.visible && !l.locked)?.id;
  if (!layer) { $('hint').textContent = t('noLayer'); return; }
  const shapes = phraseShapes(lines, at, Number($('phraseSize').value) || 4, layer, undefined, $('phraseFont').value);   /* 書体は「書体」欄（ゴシック＝標準は書かない） */
  cancel(); commit(() => { const ids = []; for (const sh of shapes) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, ...sh }); ids.push(id); } selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('phrasePlaced', { n: shapes.length });
}
/* ---- 文字のフォントと大きさをまとめて変える（選んだ文字。定型句で置いた文字も同じ文字図形）----
   事業主指示 2026-10-26「定型句、文字ともにフォントとフォントサイズを後から変更したい」（フォントは数種類から選ぶ）。「そのまま」（書体＝空・大きさ＝空）の項目は変えない。 */
const pickedTexts = () => { const ids = selectedShapeIds(); return doc.shapes.filter(s => s.type === 'text' && ids.has(s.id) && editable(s)); };
const fontLabel = key => t('font' + key[0].toUpperCase() + key.slice(1));
/** 文字の書体を書く（ゴシック＝標準は書かない＝今までの図面と同じ）。size は mm。戻り値は変えた数。元に戻すは1回。 */
function applyTextFont({ font, size, color }) {
  const list = pickedTexts(); if (!list.length) { $('hint').textContent = t('textFontNone'); return 0; }
  const f = font && Object.hasOwn(TEXT_FONTS, font) ? font : null, z = typeof size === 'number' && Number.isFinite(size) ? size : null, c = isHex6(color) ? color.toLowerCase() : null;   /* color＝文字の色（#RRGGBB）。null は変えない */
  const plan = list.filter(s => (f && (s.font || 'gothic') !== f) || (z !== null && s.sizeMm !== z) || (c && (isHex6(s.textColor) ? s.textColor.toLowerCase() : '') !== c));
  if (!plan.length) { $('hint').textContent = t('textFontSame'); return 0; }
  commit(() => { for (const p of plan) { const sh = doc.shapes.find(x => x.id === p.id); if (!sh) continue; if (f) { if (f === 'gothic') delete sh.font; else sh.font = f; } if (z !== null) sh.sizeMm = z; if (c) sh.textColor = c; } });
  $('hint').textContent = t('textFontDone', { n: plan.length }); return plan.length;
}
/** 窓の「選んだ文字：n 個（書体・大きさ）」。 */
function textFontNowText(list) {
  const fonts = new Set(list.map(s => s.font || 'gothic')), sizes = new Set(list.map(s => +s.sizeMm.toFixed(2)));
  return t('textFontNow', { n: list.length, font: fonts.size === 1 ? fontLabel([...fonts][0]) : t('fontMixed'), size: sizes.size === 1 ? [...sizes][0] + ' mm' : t('fontMixed') });
}
let textFontKey = '';
/** 窓の中身を、選んだ文字に合わせる（窓が出ていないときは何もしない・描くたびに呼ぶので、選択・書体・大きさが変わったときだけ数え直す）。fill＝欄の初期値を入れる（窓を開いたとき）：書体・大きさがそろっていればその値、ばらばらなら空（＝そのまま）。 */
function refreshTextFontCard(force = false, fill = false) {
  const c = $('textFontCard'); if (!c || c.hidden || c.dataset.win !== '1') return;
  const list = pickedTexts(), key = list.map(s => s.id + ':' + (s.font || '') + ':' + s.sizeMm).join(',');
  if (!force && key === textFontKey) return; textFontKey = key;
  $('tfNow').textContent = list.length ? textFontNowText(list) : t('textFontNone'); $('tfApply').disabled = !list.length;
  if (!fill) return;
  const fonts = new Set(list.map(s => s.font || 'gothic')), sizes = new Set(list.map(s => +s.sizeMm.toFixed(2)));
  $('tfFont').value = fonts.size === 1 ? [...fonts][0] : ''; $('tfSize').value = sizes.size === 1 ? String([...sizes][0]) : '';
  const cols = new Set(list.map(s => isHex6(s.textColor) ? s.textColor.toLowerCase() : '')); $('tfColor').value = cols.size === 1 && [...cols][0] ? [...cols][0] : TEXT_COLOR_DEFAULT; $('tfColorOn').checked = false;
}
function openTextFontWin() { $('textFontCard').hidden = false; setCardWin('textFontCard', true); refreshTextFontCard(true, true); $('hint').textContent = t('textFontOpened'); }
function runTextFontApply() {
  const font = $('tfFont').value, sv = $('tfSize').value, size = sv === '' || sv === null ? null : Number(sv);
  if (size !== null && !(size >= 0.5 && size <= 200)) { $('hint').textContent = t('textFontInvalid'); return; }
  const color = $('tfColorOn').checked ? $('tfColor').value : null;   /* 「色も変える」を入れたときだけ、色を変える */
  if (!font && size === null && !color) { $('hint').textContent = t('textFontNothing'); return; }
  applyTextFont({ font, size, color }); refreshTextFontCard(true);
}
/** 文字ツールで新しく置く文字の書体（文字ツールの「書体」欄）。ゴシック（標準）は書かない。 */
const newTextFont = () => { const v = $('textFont')?.value; return v && v !== 'gothic' && Object.hasOwn(TEXT_FONTS, v) ? { font: v } : {}; };
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
/** 断面図を消す：断面図の図形が選ばれていれば、その断面図だけ。何も選ばれていなければ、図面にある断面図すべて（図形と、寸法・取っ手の元の情報をいっしょに）。元に戻すのは1回。 */
function clearFoldSections() {
  const metas = Object.keys(doc.foldSections || {}), chosen = new Set(doc.shapes.filter(s => s.foldSec && selected.has(s.id)).map(s => s.foldSec));
  chosen.delete('fd'); /* 'fd' は「三つ折りの設計」の断面。そちらのカードで扱うので、ここでは消さない */
  const ids = new Set(chosen.size ? [...chosen] : [...metas, ...doc.shapes.filter(s => s.foldSec).map(s => s.foldSec)].filter(id => id !== 'fd'));
  const n = doc.shapes.filter(s => ids.has(s.foldSec)).length;
  if (!n && !metas.length) { $('hint').textContent = t('foldSecClearNone'); return; }
  cancel(); commit(() => { doc.shapes = doc.shapes.filter(s => !ids.has(s.foldSec)); for (const id of ids) if (doc.foldSections) delete doc.foldSections[id]; for (const p of doc.parts || []) p.shapeIds = p.shapeIds.filter(id => doc.shapes.some(s => s.id === id)); selected = new Set([...selected].filter(id => doc.shapes.some(s => s.id === id))); });
  $('hint').textContent = t('foldSecCleared', { n: ids.size });
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
  const fixedLabel = k => k.replace('Ctrl+Shift+', isMac ? '⌘⇧' : '^⇧').replace('Ctrl+', isMac ? '⌘' : '^').replace('Shift+', '⇧').replace('Delete', 'Del');   /* 今までどおり動いているキー（コピー・グループ・削除…）も、メニューの横に表示する（事業主指示 2026-10-21） */
  for (const [id, key] of Object.entries(FIXED_KEYS)) put($(id), fixedLabel(key));
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
  const okShape = s => editable(s) && visible(s) && !s.markOf && !s.holeLink && !s.foldSec, cand = doc.shapes.filter(okShape), groups = new Map(); /* 選んだ線に、端がつながって同じ直線の上に並ぶ同じ種類の線は、選んでいなくても含める（1本だけ選んでも結合できる・事業主指摘 2026-10-17） */
  for (const s of cand) { const key = [s.layer, s.lineStyle || '', groupIdOf(s) || '', s.foldFlat || ''].join('|'); /* 折り展開の線（foldFlat）も、同じ種類どうしなら結合できる（事業主 2026-10-26「複数の直線が１本に結合されない」） */ /* 色は区別しない（トリムなどで一部の色が抜けた短い線が混ざることがある）。まとめた線の色は、いちばん長い線のもの */ if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s); }
  const clusters = [...groups.values()].flatMap(list => collinearLineClusters(list)).filter(c => c.ids.some(id => ids.has(id)));   /* 選んだ線を1本以上含むまとまりだけ */
  const seamPaths = new Set(doc.seams.flatMap(m => [m.a.pathId, m.b.pathId]));
  const ok = clusters.filter(c => { const set = new Set(c.ids); return doc.paths.filter(p => p.shapeIds.some(id => set.has(id))).every(p => p.shapeIds.every(id => set.has(id)) && !seamPaths.has(p.id)); });
  if (!ok.length) { $('hint').textContent = t(clusters.length ? 'mergeLinesBlocked' : 'mergeLinesNone'); return; }
  cancel(); let made = 0, total = 0, newIds = [];
  commit(() => {
    for (const c of ok) {
      const set = new Set(c.ids), members = doc.shapes.filter(s => set.has(s.id)), first = members[0], longest = members.reduce((m, q) => arcLength(q) > arcLength(m) ? q : m, first), look = {}; for (const [k, v] of Object.entries(longest)) if (!GEOM.has(k)) look[k] = v;
      const affected = doc.paths.filter(p => p.shapeIds.some(id => set.has(id))), olds = new Map(affected.map(p => [p.id, resolvePath(doc, p)]));
      const nid = freshId(doc.shapes, 's'), line = { ...look, id: nid, type: 'line', x1: c.p1.x, y1: c.p1.y, x2: c.p2.x, y2: c.p2.y, joined: true }, at = doc.shapes.findIndex(s => s.id === first.id);
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
/** 選んだ直線・曲線を、ほかの図形との交点で、別々の線に分ける（「1本に結合」の逆・事業主 2026-10-24「逆に１本の直線や曲線を交点で分断する操作もできるようにしたい」）。
 *  交点は、選んだ図形どうしも含めて、図面の見えている線との交点。縫い合わせの設定がある線は、確認ができない（埋め込みブラウザでは window.confirm が出ない）ので分けず、件数だけ案内する。元に戻すは1回。 */
function splitSelectedAtIntersections() {
  const ids = selectedShapeIds(), others = doc.shapes.filter(s => visible(s) && stitchable(s) && !s.markOf && !s.holeLink && !s.foldSec), cand = others.filter(s => ids.has(s.id) && editable(s)), plans = []; let seamSkipped = 0;
  for (const s of cand) {
    if (seamsOn(s)) { seamSkipped++; continue; }
    const cuts = allIntersections([s, ...others.filter(o => o.id !== s.id)]).filter(q => q.ids.includes(s.id)).map(q => projectOnPath(s, q).s), parts = splitShapeAt(s, cuts);
    if (parts.length >= 2) plans.push({ s, parts: parts.map(({ joined, ...rest }) => rest) });   /* 分けたあとの線は「1本に結合」の印を外す */
  }
  if (!plans.length) { $('hint').textContent = t(seamSkipped ? 'splitLinesSeam' : 'splitLinesNone'); return; }
  cancel(); const newIds = [];
  commit(() => { for (const { s, parts } of plans) newIds.push(...applyShapeParts(s, parts)); selected = new Set(newIds); });
  $('hint').textContent = t('splitLinesDone', { k: plans.length, n: newIds.length }) + (seamSkipped ? ' ' + t('splitLinesSeam') : ''); rebuildSnaps(); draw();
}
function closeSelectedGaps() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('closeGapsNoSel'); return 0; }
  const editableIds = new Set(doc.shapes.filter(s => editable(s)).map(s => s.id)), r = closeGaps(doc.shapes.filter(s => visible(s) && stitchable(s) && !s.holeLink), ids, 2, 0.01, editableIds);
  if (!r.closed && !r.skipped) { $('hint').textContent = t('closeGapsNone', { max: 2 }); return 0; }
  if (r.closed) commit(() => { const m = new Map(r.changes.map(c => [c.id, c.next])); doc.shapes = doc.shapes.map(s => m.get(s.id) || s); });
  $('hint').textContent = (r.closed ? t('closeGapsDone', { n: r.closed, max: r.maxGap.toFixed(2) }) : '') + (r.skipped ? (r.closed ? ' ' : '') + t('closeGapsSkipped', { k: r.skipped }) : ''); rebuildSnaps(); draw(); return r.closed;
}
/** 三つ折りの設計：ボタン線を基準にした距離と内側の半径から、完成形の断面を先に作る。重なり・突き抜けは作ったうえで警告する。前の設計の断面は置き換える（元に戻すは1回）。 */
let designUndoLen = -1; /* 数値変更のライブ更新を、元に戻す1回にまとめるための印（断面を作った直後の undo の数） */
function designCommit(fn, live) {
  if (live && designUndoLen === undo.length && !redo.length) { ownPathsCache = null; const fillSnap = fillSnapshot(); fn(); followFillsAfter(fillSnap); rebuildSnaps(); scheduleAutosave(); draw(); return; }   /* 重ねる間も、塗りは取り直す（事業主 2026-10-25「断面図全幅を修正してもリングとリフィルが追従しない」：この道は commit を通らず、塗りが取り残された） */   /* 続けて数値を変えている間は、同じ元に戻す1回に重ねる */
  commit(fn); designUndoLen = undo.length;
}
/** 図形の一覧を、縦の線 x=xm を軸に左右反転する（x を折り返し・円弧は角度を 180° から引く）。背を左にする断面に使う（事業主 2026-10-24「断面を左右反転させてたい。実際に使う向きと逆」）。 */
function flipSectionH(shapes, xm) {
  const f = x => 2 * xm - x;
  return shapes.map(sh => {
    const o = { ...sh }; if ('x1' in o) { o.x1 = f(o.x1); o.x2 = f(o.x2); } if ('cx' in o) o.cx = f(o.cx); if (o.points) o.points = o.points.map(q => ({ ...q, x: f(q.x) }));
    if (o.type === 'arc') { const a = o.startDeg, b = o.endDeg; o.startDeg = 180 - b; o.endDeg = 180 - a; }
    return o;
  });
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
/** 2つ折りで、リングを革の端から飛び出させない範囲（中心線に沿った位置 s）：リングの外半径ぶん、端から内側へ（事業主 2026-10-23「そもそもリング飛び出しすぎ」）。 */
const foldRingLimits = (path, rOut) => ({ lo: Math.min(rOut, path.length / 2), hi: Math.max(path.length - rOut, path.length / 2) });
function foldRingShapes(path, T, origin, ring) {
  const arc = path.pieces.find(pc => pc.kind === 'arc'), arcMid = (arc.s0 + arc.s1) / 2, rOut = Math.max(0, ...ring.parts.shapes.filter(sh => sh.role === 'ring-outer' && Number.isFinite(sh.r)).map(sh => sh.r)), want = arcMid + ring.pos;
  const lim = foldRingLimits(path, rOut), bi = foldIsBifold(), s = bi ? Math.max(lim.lo, Math.min(lim.hi, want)) : Math.max(0, Math.min(path.length, want)), clamped = bi && Math.abs(s - want) > 1e-9, q = pointOnFoldPath(path, s), tx = Math.cos(q.heading), ty = Math.sin(q.heading), nx = -ty, ny = tx, fu = q.u + nx * T / 2, fv = q.v + ny * T / 2;
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
  return { shapes, s, rOut, clamped, ...(clamped ? { pos: s - arcMid } : {}) };   /* clamped＝端から飛び出さないよう位置をとどめた（そのときの pos は、とどめたあとの値） */
}
function foldIsBifold() { return $('fdMode')?.value === 'bifold'; }
/** 断面の背（折り目）の向き：設計カードの欄と、折りの小窓の欄を同じにして、選んだ向きをブラウザに覚える（次の断面もその向きで作る）。 */
function setFoldSide(v, save = true) { const side = v === 'left' ? 'left' : 'right'; if ($('fdSide')) $('fdSide').value = side; if ($('flowSide')) $('flowSide').value = side; if (save) { try { localStorage.setItem('leather-cad.foldSide', side); } catch { /* 保存できなくても続ける */ } } }
/** 断面・平面・展開の案内の文言：2つ折りには「ボタン線」が無いので、幅・内半径・厚みの言い方（Bi）にする。 */
const foldErrKey = (err, mode) => 'foldDesignErr_' + err + (mode === 'bifold' && (err === 'badNumber' || err === 'flatShort') ? 'Bi' : '');
function syncFoldModeUI() {
  const bi = foldIsBifold();
  const setHidden = (el, v) => { if (typeof el.toggleAttribute === 'function') el.toggleAttribute('hidden', !!v); else el.hidden = !!v; };   /* SVG の図は hidden の属性で隠す（el.hidden = は効かず、2つ折りでも3つ折りの図が残って、①〜⑥の番号だけ出ていた・事業主 2026-10-25「①～⑥の数値が変更できない」） */
  for (const el of document.querySelectorAll('[data-trifold-only]')) setHidden(el, bi);
  for (const el of document.querySelectorAll('[data-bifold-only]')) setHidden(el, !bi);
  for (const el of document.querySelectorAll('[data-i18n-bi]')) { const key = bi ? el.dataset.i18nBi : el.dataset.i18nTri; if (key) { el.setAttribute('data-i18n', key); el.textContent = t(key); } }   /* 2つ折りの欄の見出しは、①〜⑥の番号 */
  renderFoldFlow();   /* 折りシミュレーションの小窓も、折り方に合わせる */
}
let foldPend = null;   /* 断面を作り直す1回だけ、欄に無い値（widthB・shiftX）を上書きする */
function makeFoldDesign(live = false) {
  const num = id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value);
  const prevD = doc.foldDesign, pend = foldPend || {}, biNow = foldIsBifold() && (!prevD || prevD.mode === 'bifold' || 'widthB' in pend), widthB = !biNow ? undefined : 'widthB' in pend ? pend.widthB : prevD?.widthB, shiftX = !biNow ? 0 : 'shiftX' in pend ? pend.shiftX : prevD?.shiftX ?? 0;   /* 裏表紙の幅 widthB・断面の横ずらし shiftX は欄に無い値：取っ手のドラッグ・数字の小窓から foldPend で渡し、無ければ今の断面の値を引き継ぐ */
  const vals = { ...(foldIsBifold() ? { mode: 'bifold', width: num('fdBiW'), ...(Number.isFinite(widthB) ? { widthB } : {}) } : {}), t: foldSecThickness(), plies: FOLD_SEC_PLIES, ...foldThicknessVals(), dL: num('fdDL'), dR: num('fdDR'), cL: num('fdCL'), cR: num('fdCR'), rinL: num('fdRL'), rinR: num('fdRR') }, p = foldDesignPlan(vals);
  if (!p.ok) { if (!live || doc.foldDesign) $('hint').textContent = t(foldErrKey(p.error, vals.mode)); return; }
  let base = bboxOfDoc({ ...doc, shapes: doc.shapes.filter(s => visible(s) && !s.foldSec && !s.foldFlat), holes: [] }) || { minX: 0, maxY: 0 };   /* 断面・平面の投影そのものは数えない（作り直すたびに下へずれない） */
  /* 作りなおすときは、前の断面の置き場所を引き継ぐ（事業主 2026-10-25「入れるとこうなる」：全幅を直しただけで、断面と平面図が、約165mm 左・71mm 下へ飛んだ。置き場所を、そのときのほかの図形の左端・下端から計算し直していたので、断面を作ったあとに、ほかの図形を動かしていると、飛んだ）。
     前の原点から、横ずらし・動かした分・断面の高さを引き戻して、置き場所の基準を求める（断面が今も図面にあるときだけ。消して作り直すときは、今までどおり、ほかの図形の下へ） */
  if (prevD?.origin && doc.shapes.some(s => s.foldSec === 'fd')) { const pp = foldDesignPlan(prevD); if (pp.ok) base = { minX: prevD.origin.x - (prevD.shiftX ?? 0) - (prevD.moveOff?.x ?? 0), maxY: prevD.origin.y - 40 - 2 * pp.rc[0] - pp.T - (prevD.moveOff?.y ?? 0) }; }
  const moveOff = prevD?.moveOff, path = foldSectionPath({ flats: p.flats, bends: p.bends }), origin = { x: base.minX + shiftX + (moveOff?.x ?? 0), y: base.maxY + 40 + 2 * p.rc[0] + p.T + (moveOff?.y ?? 0) }, axisX = origin.x + p.cEff[0];   /* moveOff＝断面を手で動かした分（作り直しても、動かした位置のまま） */
  const flipOn = $('fdFlip')?.checked !== false, sideLeft = vals.mode === 'bifold' && $('fdSide')?.value === 'left', flipDx = !sideLeft ? undefined : prevD?.flipH && Number.isFinite(prevD.flipDx) ? prevD.flipDx : (Math.min(0, p.flats[0] - p.flats[1]) + vals.width) / 2;   /* 背を左にする：軸は、そうした時点の断面の真ん中（origin からの距離で持つ＝あとで幅を変えても、断面が飛ばない） */
  const ringIn = foldRingInput(), ring = ringIn && !ringIn.error ? { ...ringIn, ...foldRingShapes(path, p.T, origin, ringIn) } : null;
  const prevStitch = doc.foldDesign?.stitch;   /* 平面図の縫い穴の設定は、断面を作り直しても引き継ぐ */
  designCommit(() => {
    const idFor = makeIdReuser(doc.shapes.filter(s => s.foldSec === 'fd'));   /* 前の断面の図形の番号を使い回す */
    doc.shapes = doc.shapes.filter(s => s.foldSec !== 'fd');
    if (!doc.layers.some(l => l.id === 'section')) doc.layers.push({ id: 'section', name: t('foldSecLayer'), visible: true, locked: false });
    const gid = nextGroupId(doc.shapes);
    const flip = shapes => { const v = flipOn ? flipSectionV(shapes, origin.y - p.rc[0]) : shapes; return sideLeft ? flipSectionH(v, origin.x + flipDx) : v; };   /* 実際に机に置いた向きにするため、断面全体を上下反転（事業主指示 2026-10-15・切り替えできる）。右の丸折りの中心の高さを軸にするので、範囲は変わらない。左右は変わらない */
    for (const sh of flip(foldSectionShapes(path, p.T, origin, FOLD_SEC_PLIES, p.T / 2 - p.tI))) doc.shapes.push({ ...sh, id: idFor(sh, 'section'), layer: 'section', groupId: gid, foldSec: 'fd' });   /* 貼り合わせ線は、裏の革の厚みぶん内側の面から（表裏の厚みが違うと中心ではない） */
    for (const sh of flip(vals.mode === 'bifold' ? [] : [{ type: 'line', x1: axisX, y1: origin.y + p.T / 2 + 2, x2: axisX, y2: origin.y - (2 * p.rc[0] + p.T / 2 + 2), lineStyle: 'dashed', color: 'blue', role: 'axis' }])) doc.shapes.push({ ...sh, id: idFor(sh, 'section'), layer: 'section', foldSec: 'fd' });   /* ボタン線 */
    if (ring) for (const sh of flip(ring.shapes)) doc.shapes.push({ ...sh, id: idFor(sh, 'section'), layer: 'section', groupId: gid, foldSec: 'fd' });
    doc.foldDesign = { ...vals, flats: p.flats, bends: p.bends, origin, flipV: flipOn, ...(sideLeft ? { flipH: true, flipDx } : {}), ...(shiftX ? { shiftX } : {}), ...(moveOff ? { moveOff } : {}), ...(prevD?.flatOff ? { flatOff: prevD.flatOff } : {}), ...(prevStitch ? { stitch: prevStitch } : {}), ...(ring ? { ring: { specId: ring.spec.id, ringD: ring.ringD, pos: ring.pos, stackT: ring.stackT, s: ring.s, dir: ring.dir, h: ring.parts.ringH, rOut: ring.rOut } } : {}) };
  }, live);
  const f2 = v => v.toFixed(2); if (ring?.clamped) $('fdRingPos').value = String(+ring.pos.toFixed(2));   /* 端から飛び出すところへは置かない：欄も、とどめた値に */
  $('hint').textContent = t(vals.mode === 'bifold' ? 'bifoldDesignDone' : 'foldDesignDone', { f1: f2(p.flats[0]), f2: f2(p.flats[1]), f3: f2(p.flats[2] ?? 0), b1: f2(p.bends[0]), b2: f2(p.bends[1] ?? 0), len: f2(p.length) }) + p.warnings.map(w => ' ' + t('foldDesignWarn_' + w, { half: f2(p.T / 2) })).join('')
    + (ring ? ' ' + t('foldRingDone', { ringD: f2(ring.ringD), pos: f2(ring.pos), s: f2(ring.s), stack: f2(ring.stackT), dir: t(ring.dir === 'v' ? 'foldRefillV' : 'foldRefillH') }) + (ring.parts.ringFits ? '' : ' ' + t('foldRingTight', { stack: f2(ring.stackT), ringD: f2(ring.ringD) })) + (ring.clamped ? ' ' + t('foldRingClamped', { pos: f2(ring.pos), r: f2(ring.rOut) }) : '') : ringIn?.error ? ' ' + t('foldRingErr') : ''); draw();
  syncBackWidthField(); foldFollowSoon();   /* できている平面図・展開図も、新しい数字で作りなおす */
}
/** 数値を変えたとき：その場で断面を作る・作り直す（元に戻すは1回）。まだ断面が無く数値が不正なときは、入力の途中なので案内を出さずに待つ。 */
function liveFoldDesign() { deferFillFollow++; try { makeFoldDesign(true); } finally { deferFillFollow--; } }   /* 塗りの取り直しは、止まってから1回（commit） */
/** 断面の「リフィルの端〜表紙の端」の寸法を、正確に入れる（事業主 2026-10-25「ここの寸法を正確に出したい」「リフィルの端から表紙の端までの距離」：手で測ると端の点に吸い付かず、数字が少しずれた）。
 *  断面のリフィルの先の端（背から遠い側）と、表紙の端（取っ手 endA）の x から、リフィルの真ん中の高さに水平の寸法を1本。押し直すと置き換わる。リフィルを水平に置いた2つ折りのみ。 */
function addRefillCoverDim() {
  const d = doc.foldDesign, rf = doc.shapes.find(s => s.foldSec === 'fd' && s.role === 'refills' && s.points), hs = d ? foldHandles(d) : null, hx = key => hs?.find(q => q.key === key)?.x, xw = hx('w'), xA = hx('endA');
  if (!d || d.mode !== 'bifold' || d.ring?.dir === 'v' || !rf || ![xw, xA].every(Number.isFinite)) { $('hint').textContent = t('refillCoverDimNone'); return; }
  const xs = rf.points.map(q => q.x), ys = rf.points.map(q => q.y), a = Math.min(...xs), b = Math.max(...xs), tip = Math.abs(b - xw) > Math.abs(a - xw) ? b : a, y = (Math.min(...ys) + Math.max(...ys)) / 2, len = Math.abs(xA - tip);
  commit(() => { doc.shapes = doc.shapes.filter(s => !s.refillCover); const id = freshId(doc.shapes, 's'), layer = ensureLayer(doc, 'guide'); doc.shapes.push({ id, type: 'dimension', layer, x1: tip, y1: y, x2: xA, y2: y, offset: -8, refillCover: true }); });
  $('hint').textContent = t('refillCoverDimDone', { len: len.toFixed(2) }); draw();
}
/** ②裏表紙の幅の欄：表紙と違うときだけ数字を出す（同じなら空欄＝表紙と同じ）。入力中の欄は触らない。 */
function syncBackWidthField() {
  const el = $('fdBiWB'), d = doc.foldDesign; if (!el || !d || (typeof document !== 'undefined' && document.activeElement === el)) return;
  el.value = d.widthB > 0 && Math.abs(d.widthB - d.width) > 1e-9 ? String(d.widthB) : '';
}
/** ②裏表紙の幅の欄に入れたとき：その幅で断面を作り直す。空欄なら表紙と同じ（事業主 2026-10-25「表と裏の表紙の長さを合わせられない」「①～⑥の数値が変更できない」）。入力の途中（数字でない・0以下）は待つ。 */
function onBackWidthInput() {
  const raw = ($('fdBiWB').value ?? '').trim(), v = Number(raw); if (raw !== '' && !(v > 0)) return;
  const d = doc.foldDesign; if (!d || d.mode !== 'bifold') return;
  foldPend = { widthB: raw === '' ? undefined : v, shiftX: d.shiftX ?? 0 }; liveFoldDesign(); foldPend = null;
}
/** 裏表紙を表紙と同じ長さにする（事業主 2026-10-25「表と裏の表紙の長さを合わせられない」：裏表紙の幅は、取っ手のドラッグ・小窓で別に決めた値が残り、「閉じたときの幅」の欄では変わらなかった）。 */
function sameCoverLength() {
  const d = doc.foldDesign; if (!d || d.mode !== 'bifold') { $('hint').textContent = t('fdSameCoverNone'); return; }
  if (!(d.widthB > 0) || Math.abs(d.widthB - d.width) < 1e-9) { $('hint').textContent = t('fdSameCoverAlready'); return; }
  syncFoldFields(); foldPend = { widthB: undefined, shiftX: d.shiftX ?? 0 }; liveFoldDesign(); foldPend = null; $('hint').textContent = t('fdSameCoverDone') + ' ' + $('hint').textContent;
}
/** 平面図・展開図の数字（高さ fdH・縁 fdEdge・余白 fdMargin・ピッチ fdPitch・ボタン穴の径 fdBtnD）を変えたとき：できている平面図・展開図を、数字が止まってから作りなおす（事業主 2026-10-24「平面図の高さを自由に変えて図面を追従させたい」）。空欄の途中は待つ。 */
function onFlatNumber(id) { if (id === 'fdPitch') refreshFoldPitch(); if (String($(id).value ?? '').trim() === '') return; foldFollowSoon(); }   /* 数値が正しければ、断面を作る前でも変えた時点で描く（元に戻すは1回） */
/** 数字を変えて断面を作り直したあと、すでに平面図（②）・展開図（③）ができていれば、数字が止まってから1回だけ、同じ手順で作りなおす（事業主 2026-10-23「数字を変えたら平面図も自動で作り直す」）。
 *  断面と合わせて「元に戻す」は1回。平面図・展開図に手で足したもの（直した菱目など）は、②③を押し直したときと同じく、作りなおしで消える。 */
let foldFollowTimer = null;
function foldFollowSoon() {
  clearTimeout(foldFollowTimer); foldFollowTimer = null;
  if (!doc.foldDesign || !doc.shapes.some(s => s.foldFlat === 'fd' || s.foldFlat === 'fdu')) return;
  foldFollowTimer = setTimeout(() => { foldFollowTimer = null; if (!gesture && !stage) foldFollowNow(); }, 240);   /* 数字を打っている間は待つ（展開図は穴が多く、1回が重い）。最後の変化の 0.24 秒後に1回 */
}
function foldFollowNow() {
  const hasFlat = doc.shapes.some(s => s.foldFlat === 'fd'), hasUnfold = doc.shapes.some(s => s.foldFlat === 'fdu'); if (!doc.foldDesign || !(hasFlat || hasUnfold)) return;
  const keep = designUndoLen === undo.length ? undo.length : -1, before = undo.length, note = $('hint').textContent;
  if (hasFlat) projectFoldDesign(false); if (hasUnfold) unfoldFoldDesign();
  if (undo.length === before) return;   /* 作れなかった（高さが空など）：案内はそのまま */
  if (keep >= 0) { undo.splice(keep); designUndoLen = keep; } else { if (undo.length > before + 1) undo.splice(before + 1); designUndoLen = undo.length; }   /* 断面と合わせて、取り消しは1回。数字だけ（平面図の高さなど）を続けて変えるときも、最初の1回の前へ戻れるよう、あとの作りなおしを重ねる（平面図と展開図の2回ぶんの記録も、最初の1つにまとめる） */
  $('hint').textContent = note + ' ' + t('foldFollowDone');
}
/** 平面図の角の丸め半径（mm）。欄が空・負の数・文字は 0（丸めない）。短い辺の半分を超えないようにする（事業主 2026-10-24「平面図の角の丸めを実施し」）。 */
function planCorner(h, len) { const raw = String($('flowCorner')?.value ?? '').trim(), v = Number(raw), r = raw !== '' && Number.isFinite(v) && v > 0 ? v : 0; return Math.max(0, Math.min(r, h / 2 - 0.01, len / 2 - 0.01)); }
const stitchLayoutNow = () => { const v = $('flowStitchLayout')?.value; return v === 'rows' || v === 'none' ? v : 'loop'; };   /* 平面図の菱目の並べ方：loop＝ぐるっと一周（縦のラインにも）・rows＝上下の2本・none＝菱目を打たない（事業主 2026-10-25「菱目打ちを入れないパターンも追加する」） */
const flatHwMetalNow = () => { const v = $('flowHwMetal')?.value; return ['gold', 'silver', 'pinkgold', 'blackgold'].includes(v) ? v : null; };
/** 角を半径 r で丸めた長方形（左上から時計回り・各角 12 分割の折れ線）。r が 0 以下なら、ふつうの4点。 */
function roundedRectPoints(x0, y0, w, h, r) {
  const x1 = x0 + w, y1 = y0 + h, q = v => +v.toFixed(4); if (!(r > 0)) return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  const pts = [], N = 12; for (const [cx, cy, a0] of [[x0 + r, y0 + r, 180], [x1 - r, y0 + r, 270], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90]]) for (let k = 0; k <= N; k++) { const a = (a0 + 90 * k / N) * Math.PI / 180; pts.push({ x: q(cx + r * Math.cos(a)), y: q(cy + r * Math.sin(a)) }); }
  return pts;
}
/** 平面図に置く金具（台座・リング・レバー・取付穴）の規格。製品（ロルバーン M など）が使う金具：ロルバーン M は、事業主が実測した「Mini6 通常リング」（レバー2つ・取付穴 ±38mm・径5）。それ以外の製品は、親の規格・親が無ければ自分（事業主 2026-10-24「バインダ金具のレバーが消えている」：親の汎用 Mini6 だと、レバーが1つ・もう一方はボタンの円になっていた）。 */
const PLAN_HARDWARE = { 'rollbahn-m': 'mini6-standard' };
function planHardwareSpec(specId) { const sp = binderSpec(specId); return (PLAN_HARDWARE[specId] && binderSpec(PLAN_HARDWARE[specId])) || (sp?.parent && binderSpec(sp.parent)) || sp; }
/** 平面図に重ねる「リフィルと本体の差」（事業主 2026-10-24「平面図にリフィルと本体の差を寸法で表示させたい」「畳んだ状態と開いた状態では左右の差はかなり違うはず」）。
 *  上下＝（革の高さ−リフィルの高さ）÷2。開いた状態＝革を平らに置いたとき：リングの位置 s（取付穴の中心）を軸に、ページが左右に広がる（軸から リフィル幅−穴の縁 ずつ）ので、革の両端との差が左右の余り。
 *  畳んだ状態＝断面のリフィルの範囲と、革の端（表紙・裏表紙）・背の外側との水平の距離（背の丸みで革の長さが使われるぶん、開いた状態より小さくなる）。断面が無い・リフィルを垂直に置いたときは null。2つ折りのみ。 */
function refillGaps(d, p, h) {
  const sp = d.mode === 'bifold' && d.ring ? binderSpec(d.ring.specId) : null, W = sp?.refill?.wMm, Hr = sp?.refill?.hMm; if (!(W > 0 && Hr > 0) || !Number.isFinite(d.ring.s)) return null;
  const item = libraryItems().find(i => i.id === 'notebook-' + sp.id) || libraryItems().find(i => i.id === 'refill-' + sp.id) || null, pv = item?.vars || {}, num = (v, fb) => Number.isFinite(Number(v)) && v !== '' && v !== null && v !== undefined ? Number(v) : fb;   /* 部品ライブラリのリフィル（ロルバーンM・Mini6 など）。あれば、その部品そのものを置く（事業主 2026-10-24「リフィルの青印字と実際に部品を置いたときの差が大きい。そのままリングバインダと同様にリフィル部品を置くだけでよい」） */
  const Wp = item ? num(pv.W, W) : W, Hp = item ? num(pv.H, Hr) : Hr, Yp = item ? num(pv.Y, 0) : 0, E = item ? num(pv.E, 6) : 6, arcMid = p.flats[0] + p.bends[0] / 2, dir = d.ring.s < p.flats[0] - 1e-6 ? -1 : 1, holeT = ringHoleOffset(d.ring),   /* リフィルの向き：表紙側の平らな部分にリングがあるときだけ左（−）。背の丸み（弧）の上・裏表紙側は右（＋）。事業主 2026-10-25「平面図作るとリフィルが逆側に描画されてしまう」（リング位置 0 → −0.45 で、頂点をまたいだだけで左右が入れ替わっていた） */
     hole = d.ring.s + dir * holeT, x0 = dir > 0 ? hole - E : hole - (Wp - E), x1 = x0 + Wp, top = h / 2 - (Hp / 2 + Yp);   /* 部品の穴の並びの中心（H/2＋Y）を、平面図の高さの真ん中（リングの並びの中心）に合わせる */
   /* E＝穴の中心からリフィルの縁まで（foldRingParts の既定）。リフィルは1枚：穴の中心をリングの中心（リング軸 s）に合わせ、リングが背の頂点より先（裏表紙側）なら＋向き・手前なら−向きへ広げる */
  const holeYs = []; { const hs = sp.holes || {}; let v = -(hs.span1toLastMm ?? 0) / 2; holeYs.push(v); for (const pt of hs.pitchMm || []) { v += pt; holeYs.push(v); } }   /* リフィルの穴の並び（規格の穴の数・間隔・中心から）。ロルバーンのように、リフィルの穴の数が金具のリングの数と違う製品でも、並びの中心を合わせるだけ（事業主 2026-10-24「ロルバーンの穴はリングの穴と数は合いません。位置だけ中心に合わせてください」） */
  const hwSpec = planHardwareSpec(sp.id);   /* 金具（台座・リング・レバー・取付穴）は、製品が使う金具の規格（ロルバーン M は、実測の Mini6 通常リング）のもの */
  let closed = null;
  if (d.ring.dir !== 'v') {
    const rf = doc.shapes.find(s => s.foldSec === 'fd' && s.role === 'refills')?.points, hs = foldHandles(d), hx = key => hs?.find(q => q.key === key)?.x, xw = hx('w'), xA = hx('endA'), xB = hx('endB');
    if (rf && [xw, xA, xB].every(Number.isFinite)) { const xs = rf.map(q => q.x), a = Math.min(...xs), b = Math.max(...xs), far = Math.abs(b - xw) > Math.abs(a - xw), tip = far ? b : a, heel = far ? a : b, out = Math.sign(xA - xw) || 1; closed = { cover: (xA - tip) * out, back: (xB - tip) * out, spine: (heel - xw) * out }; }
  }
  return { W: Wp, Hr: Hp, E, dir, item, axis: d.ring.s, hole, holeT, spec: hwSpec, ringD: d.ring.ringD, holeYs, vert: top, bottom: h - Hp - top, open: { x0, x1, left: x0, right: p.length - x1, side: dir > 0 ? 'right' : 'left', gap: dir > 0 ? p.length - x1 : x0 }, closed };
}
/** 平面図のリフィルの穴の線は、リングの軸ではなく、リングの針金が束を通る位置（リングの右端側）に合わせる（事業主 2026-10-24「リフィルの穴の中心にリングの右端が通るのでもっと右になるはず」「さっき位置関係を作図したはず」）。
 *  断面（hardware.js の foldRingParts）の holeT と同じ式：針金は、束の面では √(内半径²−(束の厚み/2)²)・中心の高さでは外半径にあり、その真ん中。外半径が分からない古い図面は 0（今までどおり軸に合わせる）。 */
function ringHoleOffset(ring) {
  const innerR = Number(ring?.ringD) / 2, outerR = Number(ring?.rOut), stackT = Number(ring?.stackT);
  if (!(innerR > 0) || !(outerR >= innerR) || !(stackT > 0)) return 0;
  return (Math.sqrt(Math.max(0, innerR * innerR - (stackT / 2) * (stackT / 2))) + outerR) / 2;
}
/** 平面図へ投影する。革の長さの帯（長方形）・折りの点線6本・ボタンの〇2つ（ボタン線が3枚を通る位置のうち、両端の2枚。真ん中の1枚には穴をあけない。直径は欄で指定）。前の投影は置き換える。
 *  withStitch＝true のときは、欄の縁からの距離・ピッチ・端の余白から、帯の上と下に菱目打ちライン（縫い線の点線）と菱目の穴を並べる（曲面の部分は平らに伸ばした直線の長さで測る）。false のときは、前に描いた列があれば同じ値で引き継ぐ。 */
/** 平面図のリフィルを白い紙として塗る（事業主 2026-10-25「リフィルの穴は透明にしたい。下の革を表示させたい」）：リフィルの外形（線と弧）を一周たどった形から、穴（閉じた図形）をくり抜いた領域の塗り（白）にする。穴の中は塗られないので、下の革が見える。
 *  平面図を作りなおすたびに置き換わる（foldFlat 'fd'）。外形が一周につながらないときは、何も塗らない。 */
function addRefillPaperFill(refillIds, layer) {
  const added = refillIds.map(id => doc.shapes.find(s => s.id === id)).filter(Boolean), outline = added.filter(s => !(s.closed || s.type === 'circle')), holeShapes = added.filter(s => s.closed || s.type === 'circle');
  const poly = outline.length ? outlinePolygon(outline, outline[0].id) : null; if (!poly) return null;
  const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }), holes = holeShapes.map(h => outlinePolygon([h], h.id)?.points).filter(Boolean).map(h => h.map(rd));
  const fl = { id: freshId(doc.fills || [], 'f'), points: poly.points.map(rd), holes, ids: refillIds.slice(), area: Math.round(leatherItemArea(poly.points) * 10) / 10, leather: '#FFFFFF', layer, foldFlat: 'fd' };
  doc.fills = [...(doc.fills || []), fl]; return fl;
}
/** 作りなおす図形に、前の図形と同じ番号を使わせる（事業主 2026-10-25「色塗る範囲も追従させてね」「色だけが宙に浮かないように処置するのが普通では」：作りなおすたびに番号を振り直すと、塗りが、無くなった図形を指したまま取り残された）。
 *  「種類・層・役割・色・線の種類・閉じているか」ごとの作った順で、前の図形と対応させる。途中に新しい種類の図形が増えても、番号は崩れない。対応する前の図形が無ければ、まだ使われていない前の番号を避けて、新しい番号。 */
function makeIdReuser(oldShapes) {
  const keyOf = (sh, layer) => [sh.type, layer ?? sh.layer, sh.role || '', sh.color || '', sh.lineStyle || '', sh.closed ? 'c' : ''].join('|'), count = new Map();
  const nextKey = (sh, layer) => { const k = keyOf(sh, layer), n = count.get(k) || 0; count.set(k, n + 1); return k + '#' + n; };
  const old = new Map(oldShapes.map(sh => [nextKey(sh), sh.id])); count.clear(); const pending = new Set(old.values());
  return (sh, layer) => { const id = old.get(nextKey(sh, layer)); if (id !== undefined) { pending.delete(id); return id; } return freshId([...doc.shapes, ...[...pending].map(i => ({ id: i }))], 's'); };
}
function projectFoldDesign(withStitch) {
  const d = doc.foldDesign; if (!d) { $('hint').textContent = t(foldIsBifold() ? 'foldFixNoneBi' : 'foldFixNone'); return; }
  const h = Number($('fdH').value); if (!(h > 0)) { $('hint').textContent = t('foldFixHeight'); return; }
  const btnD = Number($('fdBtnD').value); if (d.mode !== 'bifold' && !(btnD > 0 && btnD < h)) { $('hint').textContent = t('foldFixBtnD'); return; }
  const p = foldDesignPlan(d); if (!p.ok) { $('hint').textContent = t(foldErrKey(p.error, d.mode)); return; }
  const noStitch = stitchLayoutNow() === 'none'; if (withStitch && noStitch) { $('hint').textContent = t('foldStitchNone'); return; }   /* 「菱目打ちラインを描く」を押したが、並べ方が「菱目を打たない」 */
  let st = noStitch ? null : d.stitch || null;   /* 「菱目を打たない」：菱目の列は作らず、前の設定も使わない */
  if (withStitch && !noStitch) {
    const edge = Number($('fdEdge').value), pitch = Number($('fdPitch').value), margin = Number($('fdMargin').value);
    const bad = !(edge > 0 && edge * 2 < h) ? 'edge' : !(pitch > 0) ? 'pitch' : stitchLayoutNow() === 'rows' && !(margin >= 0 && margin * 2 < p.length) ? 'margin' : null;
    if (bad) { $('hint').textContent = t('foldStitchErr_' + bad); return; }
    st = { edge, pitch, margin };
  }
  const corner = planCorner(h, p.length), layout = stitchLayoutNow();
  if (st && layout === 'loop' && !rimLine([{ x: 0, y: 0 }, { x: p.length, y: 0 }, { x: p.length, y: h }, { x: 0, y: h }], st.edge, Math.max(corner - st.edge, 0))) { $('hint').textContent = t('foldStitchLoopFail'); return; }
  const fx = d.origin.x + (d.flatOff?.x ?? 0), fy = d.origin.y + p.T / 2 + 2 + 40 + (d.flatOff?.y ?? 0), [f1, f2] = p.flats, [b1, b2] = p.bends, xs = d.mode === 'bifold' ? [f1, f1 + b1 / 2, f1 + b1] : [f1, f1 + b1 / 2, f1 + b1, f1 + b1 + f2, f1 + b1 + f2 + b2 / 2, f1 + b1 + f2 + b2];
  const buttons = d.mode === 'bifold' ? [] : [p.cEff[0], f1 + b1 + p.a[0], f1 + b1 + f2 + b2 + p.a[1]];   /* ボタン線が1枚目・2枚目・3枚目を通る、革の端からの長さ。穴をあけるのは両端の1枚目と3枚目だけ（2枚目は真ん中なので穴なし） */
  const mounts = (d.ring && planHardwareSpec(d.ring.specId)?.rivets) || [], tool = stitchToolCurrent(); let holeInfo = null;   /* 取付穴は、金具の規格のもの（平面図に置く金具の取付穴と同じ位置） */
  commit(() => {
    const oldFlat = doc.shapes.filter(s => s.foldFlat === 'fd'), mineShapes = new Set(oldFlat.map(s => s.id)), minePaths = new Set(doc.paths.filter(q => q.foldFlat === 'fd').map(q => q.id)), idFor = makeIdReuser(oldFlat);   /* 前の平面図の図形（同じ番号を使い回す） */
    doc.fills = (doc.fills || []).filter(f => f.foldFlat !== 'fd'); dropDimAnchorsTo(mineShapes); for (const p of doc.parts) p.shapeIds = p.shapeIds.filter(id => !mineShapes.has(id)); doc.shapes = doc.shapes.filter(s => !mineShapes.has(s.id)); doc.paths = doc.paths.filter(q => !minePaths.has(q.id)); doc.holes = doc.holes.filter(q => q.foldFlat !== 'fd' && !minePaths.has(q.pathId));
    const layer = ensureLayer(doc, 'pattern'), guide = ensureLayer(doc, 'guide'), add = sh => { const id = idFor(sh); doc.shapes.push({ ...sh, id, foldFlat: 'fd' }); return id; };   /* 同じ番号を使えば、平面図に塗った色は、図形の変わった形に追従する（commit が取り直す） */
    add({ type: 'polyline', layer, closed: true, points: roundedRectPoints(fx, fy, p.length, h, corner) });
    for (const x of xs) add({ type: 'line', layer: guide, lineStyle: 'dashed', x1: fx + x, y1: fy, x2: fx + x, y2: fy + h });
    for (const x of (d.mode === 'bifold' ? [] : [buttons[0], buttons[2]])) add({ type: 'circle', layer, cx: fx + x, cy: fy + h / 2, r: btnD / 2 });
    for (const rv of mounts) add({ type: 'circle', layer, cx: fx + d.ring.s + rv.yMm, cy: fy + h / 2 + rv.xMm, r: rv.dMm / 2 });   /* リング取付穴（台座の長さの向きが平面図の縦・横が革に沿った向き） */
    if (st && layout === 'rows') for (const y of [fy + st.edge, fy + h - st.edge]) {   /* 菱目打ちライン：縫い線の点線＋その上の菱目の穴（端の余白を空け、ピッチは均等に調整） */
      const lineId = add({ type: 'line', layer: guide, lineStyle: 'dashed', color: 'yellow', x1: fx + st.margin, y1: y, x2: fx + p.length - st.margin, y2: y });
      const route = doc.shapes.find(s => s.id === lineId), rlen = arcLength(route), nPts = Math.floor(rlen / st.pitch + 1e-9), lead = (rlen - nPts * st.pitch) / 2, pts = pointsAlongShape(route, st.pitch, { offsetStart: lead, offsetEnd: lead }), saved = { id: freshId(doc.paths, 'p'), shapeIds: [lineId], reversed: false, closed: false, segments: [], mark: 'tool', foldFlat: 'fd' };
      doc.paths.push(saved); placeHoles(saved, route, pts.map(q => ({ ...q })), tool); for (const q of doc.holes.filter(x => x.pathId === saved.id)) q.foldFlat = 'fd';
      saved.segments = [{ from: 0, to: rlen, toolId: tool.id, pitch: st.pitch, mode: 'fixed' }]; holeInfo = { n: pts.length, step: st.pitch, lead };
    }
    if (st && layout === 'loop') {   /* 一周：縁から edge 内側の角丸の縫い線（点線）の上に、縦のライン（左右の端）も含めて、全周へ等間隔に菱目の穴（角の丸みは、外形の丸め−edge） */
      const rim = rimLine([{ x: fx, y: fy }, { x: fx + p.length, y: fy }, { x: fx + p.length, y: fy + h }, { x: fx, y: fy + h }], st.edge, Math.max(corner - st.edge, 0));
      if (rim) {
        const lineId = add({ type: 'polyline', layer: guide, closed: true, points: rim.points, lineStyle: 'dashed', color: 'yellow' }), saved = { id: freshId(doc.paths, 'p'), shapeIds: [lineId], reversed: false, closed: true, segments: [], mark: 'tool', foldFlat: 'fd' }; doc.paths.push(saved);
        const route = resolvePath(doc, saved), loop = loopSampler(rim.points), spots = rimHolePositions(loop.total, st.pitch, () => true).map(s => pointAtLength(route, s));
        placeHoles(saved, route, spots, tool); for (const q of doc.holes.filter(x => x.pathId === saved.id)) q.foldFlat = 'fd'; holeInfo = { n: spots.length, step: loop.total / Math.max(spots.length, 1), lead: 0 };
      }
    }
    const gap = refillGaps(d, p, h);   /* リフィルと本体の差：点線の枠（開いた状態の位置）・上下と左右の寸法・畳んだ状態の数字（平面図の下の文字） */
    if (gap) {
      const y0 = fy + gap.vert, y1 = y0 + gap.Hr, gx0 = fx + gap.open.x0, gx1 = fx + gap.open.x1, seg = (a, b, c, e) => add({ type: 'line', layer: guide, lineStyle: 'dashed', color: 'blue', x1: a, y1: b, x2: c, y2: e }), dim = (a, b, c, e) => add({ type: 'dimension', layer: guide, x1: a, y1: b, x2: c, y2: e, offset: 0, fresh: true });
      if (gap.item) {   /* リフィルの部品（部品ライブラリのもの）を、そのまま置く：穴の列（E）をリング軸に合わせ、向きが逆なら左右反転。層はガイド・色は青（切り抜きではない参考） */
        const payload = instantiateItem(gap.item, {}, { x: fx + gap.axis + gap.holeT - gap.E, y: y0 }), placed = gap.dir > 0 ? payload.shapes : flipSectionH(payload.shapes, fx + gap.axis);
        const refillIds = placed.map(sh => add({ ...sh, layer: guide, color: 'blue' })); if ($('flowRefillPaper')?.checked) addRefillPaperFill(refillIds, guide);   /* 白い紙（穴は透明） */
      } else {   /* 部品が無い規格は、外形の枠と穴の〇だけ */
        seg(gx0, y0, gx1, y0); seg(gx1, y0, gx1, y1); seg(gx1, y1, gx0, y1); seg(gx0, y1, gx0, y0);
        for (const hy of gap.holeYs) add({ type: 'circle', layer: guide, cx: fx + gap.hole, cy: fy + h / 2 + hy, r: 2.5, color: 'blue' });
      }
      try {   /* リングバインダ金具の平面図（台座・リング・開閉部品）：台座の長さを縦に、リング軸 s の上に置く。取付穴の〇は上で切り抜きの穴として描いてあるので、ここでは描かない（事業主 2026-10-24「平面図にリングバインダ金具とリフィルも配置してください」） */
        const hwLayer = (() => { if (!doc.layers.some(l => l.id === 'hardware')) doc.layers.push({ id: 'hardware', name: 'hardware', visible: true, locked: false }); return 'hardware'; })(), rivs = gap.spec.rivets || [], isRivet = c => rivs.some(rv => Math.abs(c.cx - rv.xMm) < 1e-6 && Math.abs(c.cy - rv.yMm) < 1e-6);
        const map = q => ({ x: +(fx + gap.axis + q.y).toFixed(4), y: +(fy + h / 2 + q.x).toFixed(4) });   /* 金具の絵（x＝台座の長さ・y＝幅）→ 平面図（縦＝長さ・横＝幅） */
        const hwMetal = flatHwMetalNow(), mt = hwMetal ? { metal: hwMetal } : {};   /* 金具の色（選んでいれば、金具の図形に金属の色を付ける） */
        for (const s of binderViewDrawing(gap.spec, gap.ringD, 'plan')) { if (s.type === 'polyline') add({ type: 'polyline', layer: hwLayer, closed: true, points: s.points.map(map), ...mt }); else if (!isRivet(s)) { const c = map({ x: s.cx, y: s.cy }); add({ type: 'circle', layer: hwLayer, cx: c.x, cy: c.y, r: s.r, ...mt }); } }
      } catch { /* 金具の絵が作れない規格は、リフィルだけ */ }
      const xd = fx + Math.min(Math.max(gap.open.x0, 0) + 12, p.length - 2), ym = fy + h / 2 + (gap.holeYs.length > 1 ? (gap.holeYs[gap.holeYs.length >> 1] - gap.holeYs[(gap.holeYs.length >> 1) - 1]) / 2 : 0);   /* 横の寸法線は、真ん中の2つのリングの間の高さに */
      if (gap.vert > 0.005) { dim(xd, fy, xd, y0); dim(xd, y1, xd, fy + h); }
      if (gap.open.gap > 0.005) { if (gap.dir > 0) dim(gx1, ym, fx + p.length, ym); else dim(fx, ym, gx0, ym); }   /* 左右は、リフィルを開いた側の端〜革の端だけ（事業主 2026-10-24「開いた側の端部と革の端部の距離がわかればよいので右側のみに寸法を入れるだけでよい」） */
      const n = v => +v.toFixed(2), tx = (i, text) => add({ type: 'text', layer: guide, x: fx, y: fy + h + 8 + i * 5, text, sizeMm: 3, angleDeg: 0 });
      tx(0, Math.abs(gap.vert - gap.bottom) < 0.005 ? t('foldGapNote1', { w: n(gap.W), h: n(gap.Hr), tb: n(gap.vert) }) : t('foldGapNote1b', { w: n(gap.W), h: n(gap.Hr), a: n(gap.vert), b: n(gap.bottom) })); tx(1, t('foldGapNote2', { side: t(gap.dir > 0 ? 'foldGapSideRight' : 'foldGapSideLeft'), v: n(gap.open.gap) })); if (gap.closed) tx(2, t('foldGapNote3', { ca: n(gap.closed.cover), cb: n(gap.closed.back), cs: n(gap.closed.spine) }));
    }
    if ($('flowAutoDims')?.checked) {   /* 寸法を自動で入れる（事業主 2026-10-25「平面図に自分で寸法入れましたが自動で入れられない？」）：全長（上）・高さ（左）・リング取付穴の位置（下・革の左の端から）。平面図を作りなおすたびに置き換わる */
      const autoDim = (x1, y1, x2, y2, offset) => add({ type: 'dimension', layer: guide, x1, y1, x2, y2, offset, fresh: true });
      autoDim(fx, fy, fx + p.length, fy, 12); autoDim(fx, fy, fx, fy + h, -12);
      if (d.ring && Number.isFinite(d.ring.s)) autoDim(fx, fy + h, fx + d.ring.s, fy + h, -12);
    }
    { const { stitch: _drop, ...rest } = doc.foldDesign; doc.foldDesign = { ...(noStitch ? rest : doc.foldDesign), ...(st ? { stitch: st } : {}) }; }
  });
  const f2s = v => v.toFixed(2);
  $('hint').textContent = t(d.mode === 'bifold' ? 'bifoldFixDone' : 'foldFixDone', { len: f2s(p.length), d: f2s(btnD), s1: f2s(buttons[0] ?? 0), s3: f2s(buttons[2] ?? 0) }) + (mounts.length ? ' ' + t('foldFixMounts', { n: mounts.length, d: f2s(mounts[0].dMm), x: f2s(d.ring.s) }) : '') + (st && holeInfo ? ' ' + (layout === 'loop' ? t('foldFixStitchLoop', { edge: f2s(st.edge), pitch: f2s(holeInfo.step), n: holeInfo.n, r: f2s(corner) }) : t('foldFixStitch', { edge: f2s(st.edge), pitch: f2s(st.pitch), lead: f2s(holeInfo.lead), n: holeInfo.n })) : ''); rebuildSnaps(); draw();
}
/** 表（折りの外側の革）・裏（内側の革）の展開図を、図面に並べる（FIX の平面図の下に、表→裏の順）。それぞれに、折りの点線・ボタン穴・菱目打ちライン（菱目の穴）を描き、平らな部分と曲げ部の菱目間の寸法（数字つき）を書き込む。
 *  菱目は同じ個数・同じ位置（革の長さに沿った割り当て）で、曲げ部の間隔だけが革ごとに違う。前の展開図は置き換える（元に戻すは1回）。 */
function unfoldFoldDesign() {
  const d = doc.foldDesign; if (!d) { $('hint').textContent = t(foldIsBifold() ? 'foldFixNoneBi' : 'foldFixNone'); return; }
  const h = Number($('fdH').value); if (!(h > 0)) { $('hint').textContent = t('foldFixHeight'); return; }
  const btnD = Number($('fdBtnD').value); if (d.mode !== 'bifold' && !(btnD > 0 && btnD < h)) { $('hint').textContent = t('foldFixBtnD'); return; }
  const p = foldDesignPlan(d); if (!p.ok) { $('hint').textContent = t(foldErrKey(p.error, d.mode)); return; }
  const edge = Number($('fdEdge').value), pitch = Number($('fdPitch').value), margin = Number($('fdMargin').value);
  const bad = !(edge > 0 && edge * 2 < h) ? 'edge' : !(pitch > 0) ? 'pitch' : !(margin >= 0 && margin * 2 < p.length) ? 'margin' : null; if (bad) { $('hint').textContent = t('foldStitchErr_' + bad); return; }
  const [f1, f2] = p.flats, [b1, b2] = p.bends, buttons = d.mode === 'bifold' ? [] : [p.cEff[0], f1 + b1 + p.a[0], f1 + b1 + f2 + b2 + p.a[1]];
  const plies = foldUnfoldPlan(p, { pitch, margin, buttons }); if (!plies || plies.some(u => !u)) { $('hint').textContent = t('foldUnfoldFail'); return; }
  const tool = stitchToolCurrent(), fx = d.origin.x + (d.flatOff?.x ?? 0), f2s = v => v.toFixed(2); let fy0 = d.origin.y + p.T / 2 + 2 + 40 + h + 60 + (d.flatOff?.y ?? 0);
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
      for (const x of (d.mode === 'bifold' ? [] : [u.buttons[0], u.buttons[2]])) add({ type: 'circle', layer, cx: fx + x, cy: fy + h / 2, r: btnD / 2 });
      if (d.mode === 'bifold' && d.ring) {
        const f = p.flats[0], b = p.bends[0], nb = Math.PI * (p.rc[0] + u.delta);
        const map = x => x <= f ? x : x <= f + b ? f + (x - f) * nb / b : x + nb - b;
        for (const rv of planHardwareSpec(d.ring.specId)?.rivets || []) add({ type: 'circle', layer, cx: fx + map(d.ring.s + rv.yMm), cy: fy + h / 2 + rv.xMm, r: rv.dMm / 2 });
      }
      for (const y of [fy + edge, fy + h - edge]) {   /* 菱目打ちライン：縫い線の点線＋その上の菱目の穴（この革の長さに沿った位置） */
        const lineId = add({ type: 'line', layer: guide, lineStyle: 'dashed', color: 'yellow', x1: fx + u.rowFrom, y1: y, x2: fx + u.rowTo, y2: y }), len = u.rowTo - u.rowFrom;
        const saved = { id: freshId(doc.paths, 'p'), shapeIds: [lineId], reversed: false, closed: false, segments: [{ from: 0, to: len, toolId: tool.id, pitch: u.flatStep, mode: 'manual' }], mark: 'tool', foldFlat: 'fdu', ply: u.key }; doc.paths.push(saved);
        for (const x of u.holes) doc.holes.push({ id: freshId(doc.holes, 'h'), pathId: saved.id, s: x - u.rowFrom, x: fx + x, y, angleDeg: slantOf(tool), toolId: tool.id, mark: 'tool', foldFlat: 'fdu' });
      }
      const yd = fy + h - edge, dim = (a, b) => add({ type: 'dimension', layer: guide, x1: fx + a, y1: yd, x2: fx + b, y2: yd, offset: -4, fresh: true });   /* 菱目間の寸法（数字つき）：下の列の下に */
      dim(u.holes[0], u.holes[1]);
      u.bends.forEach((b, k) => {
        if (b.firstIndex >= 0) dim(u.holes[b.firstIndex], u.holes[b.firstIndex + 1]);
        add({ type: 'text', layer: guide, x: fx, y: fy + h + 12 + k * 5, text: t('unfoldBendNote', { side: side[b.side], pitch: f2s(b.pitch), flat: f2s(b.flat), n: b.count }), sizeMm: 3, angleDeg: 0 });
      });
    });
  });
  commit(() => { for (const p of doc.parts) if (p.autoPly) p.shapeIds = foldUnfoldPartIds(p.autoPly); });   /* 「表・裏を部品にする」で作った部品は、新しい展開の図形で作り直す */
  const [o, ii] = plies;
  $('hint').textContent = t('foldUnfoldDone', { lo: f2s(o.length), li: f2s(ii.length), flat: f2s(o.flatStep), po: o.bends.map(b => ({ right: t(d.mode === 'bifold' ? 'foldSideSpine' : 'foldSideR'), left: t('foldSideL') }[b.side] + ' ' + f2s(b.pitch))).join(' / '), pi: ii.bends.map(b => ({ right: t(d.mode === 'bifold' ? 'foldSideSpine' : 'foldSideR'), left: t('foldSideL') }[b.side] + ' ' + f2s(b.pitch))).join(' / ') }); rebuildSnaps(); draw();
}
function fixFoldDesign() { projectFoldDesign(false); }
/** 設計カードに、曲げ部の菱目ピッチ（外側の面・内側の面・差）を数字で出す。基準の平らな間隔は「菱目のピッチ」の欄（指定する前提）。数値・厚み・ピッチのどれを変えても、その場で更新する。 */
/** 三つ折りの設計の「全高」（事業主指示 2026-10-21「高さ（フラップ曲げ部）を25mmに合わせるのがかなりむつかしい」→ 全高を直接入れる欄）。
 *  全高＝2×大きいほうの折りの中心線の半径＋厚み＝2×大きいほうの内側の半径＋厚みの2倍（断面図の「全高」の寸法と同じ・design.js foldSectionDims）。欄はいつも実際の全高を表し、入れて Enter／Tab で、大きいほうの折りの内側の半径（⑥⑦の欄）を書き換えて合わせる。 */
function foldHeightNow() {
  const num = id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value), rl = foldIsBifold() ? num('fdRR') : num('fdRL'), rr = num('fdRR'), v = foldThicknessVals(), T = v.tOuter + v.tInner;
  if (![rl, rr, T].every(Number.isFinite) || !(rl > 0) || !(rr > 0) || !(T > 0)) return null;
  return { T, rl, rr, h: 2 * Math.max(rl, rr) + 2 * T };
}
function refreshFoldHeight(force = false) {
  const el = $('fdTotalH'); if (!el || (!force && typeof document.activeElement !== 'undefined' && document.activeElement === el)) return;   /* 入れている途中は書き換えない */
  const n = foldHeightNow(); el.value = n ? String(+n.h.toFixed(2)) : '';
}
function setFoldHeight() {
  const el = $('fdTotalH'), raw = (el.value ?? '').trim(), h = Number(raw), n = foldHeightNow(), back = () => refreshFoldHeight(true);   /* 断ったら、欄を実際の全高に戻す */
  if (!n) { $('hint').textContent = t('foldHeightNeedR'); back(); return; }
  const r = (h - 2 * n.T) / 2; if (raw === '' || !Number.isFinite(h) || !(r > 0)) { $('hint').textContent = t('foldHeightSmall', { min: +(2 * n.T).toFixed(2) }); back(); return; }
  const bigId = n.rr >= n.rl ? 'fdRR' : 'fdRL', other = bigId === 'fdRR' ? n.rl : n.rr;
  if (!foldIsBifold() && other > r + 1e-9) { $('hint').textContent = t('foldHeightOther', { o: +other.toFixed(2), r: +r.toFixed(2) }); back(); return; }
  $(bigId).value = String(+r.toFixed(3)); refreshFoldPitch();
  const before = $('hint').textContent; liveFoldDesign(); const summary = $('hint').textContent !== before ? ' ' + $('hint').textContent : '';
  $('hint').textContent = t('foldHeightSet', { h: +h.toFixed(2), side: t(bigId === 'fdRR' ? 'foldSideR' : 'foldSideL'), r: +r.toFixed(3) }) + summary; refreshFoldHeight(true);
}
$('fdTotalH').addEventListener('change', setFoldHeight);
function refreshFoldPitch() {
  refreshFoldHeight();   /* 半径・厚みが変わるたびに、全高の欄も実際の値にする */
  const el = $('fdPitchOut'); if (!el) return;
  const num = id => ($(id).value ?? '').trim() === '' ? NaN : Number($(id).value), pitch = num('fdPitch'), f2 = v => v.toFixed(2);
  if (!(pitch > 0)) { el.textContent = t('foldPitchNeed'); return; }
  const r = foldBendPitch(foldDesignPlan({ ...(foldIsBifold() ? { mode: 'bifold', width: num('fdBiW') } : {}), t: foldSecThickness(), plies: FOLD_SEC_PLIES, ...foldThicknessVals(), dL: num('fdDL'), dR: num('fdDR'), cL: num('fdCL'), cR: num('fdCR'), rinL: num('fdRL'), rinR: num('fdRR') }), pitch, FOLD_SEC_PLIES);
  if (!r) { el.textContent = t('foldPitchBad'); return; }
  el.textContent = t('foldPitchHead', { p: f2(pitch) }) + r.map(b => '\n' + t('foldPitchBend', { side: t(foldIsBifold() ? 'foldSideSpine' : b.side === 'right' ? 'foldSideR' : 'foldSideL'), outer: f2(b.outer), inner: f2(b.inner), diff: f2(b.diff), deg: b.angleDeg.toFixed(1), n: b.count.toFixed(1) })).join('');
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
const FD_DIAGRAM = { fdBiW: 'w', fdDL: 'dl', fdDR: 'dr', fdW: 'w', fdCL: 'cl', fdCR: 'cr', fdRL: 'rl', fdRR: 'rr', fdTO: 'to', fdTI: 'ti', fdShift: 'shift', fdNudgeL: 'shift', fdNudgeR: 'shift', fdRingOn: 'ring', fdRingSpec: 'ring', fdRingDia: 'ring', fdRingPos: 'ring', fdStackT: 'stack', fdRefillDir: 'stack' };
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
function drawFoldDims() { const items = fdDimItems(fdDimKey); if (items) drawFdItems(items); }   /* 触っている寸法（欄・取っ手）を金色で強調する */
/** 寸法の図形（foldDimensions／foldSectionDims の形）を重ねて描く。color・lineW（実線の太さpx）・font（文字の大きさpx）。文字の寄せは it.align（既定は中央）。 */
function drawFdItems(items, { color = '#f0b429', lineW = 2.2, font = 22, keepIn = false } = {}) {   /* keepIn＝文字が画面の端で切れないように、画面の中へ寄せる（幅が画面より広いときは寄せない） */
  const gold = color, k = 1 / scale, head = (x, y, ang) => { const L = 9 * k, W = 4.5 * k, c = Math.cos(ang), n = Math.sin(ang); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - L * c + W * n, y - L * n - W * c); ctx.lineTo(x - L * c - W * n, y - L * n + W * c); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.strokeStyle = gold; ctx.fillStyle = gold; ctx.lineJoin = 'round';
  for (const it of items) {
    if (it.type === 'line') {
      ctx.setLineDash(it.dash ? [4 * k, 3 * k] : []); ctx.lineWidth = (it.dash ? 1.2 : lineW) * k; ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke(); ctx.setLineDash([]);
      const ang = Math.atan2(it.b.y - it.a.y, it.b.x - it.a.x); if (it.arrows !== 'none') head(it.b.x, it.b.y, ang); if (it.arrows === 'both') head(it.a.x, it.a.y, ang + Math.PI);
    } else if (it.type === 'dot') { ctx.beginPath(); ctx.arc(it.x, it.y, 3.5 * k, 0, Math.PI * 2); ctx.fill(); }
    else {
      ctx.font = `700 ${font * k}px sans-serif`; ctx.textAlign = it.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4 * k; ctx.strokeStyle = '#000'; let tx = it.x, ty = it.y;
      if (keepIn) {
        const w = ctx.measureText?.(it.text)?.width ?? 0, m = 6 * k, h = (font / 2 + 3) * k, x0 = -origin.x / scale + m, x1 = (width - origin.x) / scale - m, y0 = -origin.y / scale + h, y1 = (height - origin.y) / scale - h;
        const left = it.align === 'right' ? tx - w : it.align === 'left' ? tx : tx - w / 2; if (w <= x1 - x0) tx += Math.min(Math.max(left, x0), x1 - w) - left; if (y1 > y0) ty = Math.min(Math.max(ty, y0), y1);
      }
      ctx.strokeText(it.text, tx, ty); ctx.fillStyle = gold; ctx.fillText(it.text, tx, ty); ctx.strokeStyle = gold;
    }
  }
  ctx.restore();
}
/** 取っ手：実際の断面の上の金色の小さな四角。つかんで横へドラッグすると、欄の数値が変わり断面が作り直される（元に戻すは1回）。「三つ折りの設計」カードを開いていて、選択モードのときだけ出る。 */
const FD_HANDLE_FIELDS = [['fdDL', 'dL'], ['fdDR', 'dR'], ['fdCL', 'cL'], ['fdCR', 'cR'], ['fdRL', 'rinL'], ['fdRR', 'rinR']];
const foldHandleList = () => mode === 'select' && !exporting && doc.foldDesign && doc.shapes.some(s => s.foldSec === 'fd') && ($('foldDesignCard')?.open === true || $('foldFlowDialog')?.open === true || doc.shapes.some(s => s.foldSec === 'fd' && selected.has(s.id))) ? (foldHandles(doc.foldDesign) ?? []) : []; /* 設計カードか折りの流れの小窓を開いているか、断面を選んでいるとき、断面の寸法の取っ手が出る（事業主 2026-10-23「断面の変形はどうやって再開すればよいですか？」→ 小窓を開いている間は出したまま） */
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
/** 断面を直しているとき（取っ手が出ている間）の、全幅・全高・厚みの寸法（数字つき・水色）。設計から毎回計算するので、取っ手のドラッグ・欄の入力に追従する。画面だけ（印刷・書き出しは foldHandleList が空になるので入らない）。事業主指示 2026-10-20 */
const foldDimLabels = () => { const bi = doc.foldDesign?.mode === 'bifold', k = n => t(bi ? n + 'N' : n); return { w: k('fdSecW'), wb: k('fdSecWB'), h: k('fdSecH'), t: t('fdSecT'), to: k('fdSecTO'), ti: k('fdSecTI') }; };   /* 2つ折りの寸法線の見出しは、①〜⑥の番号（設計カードの欄と同じ） */
const foldSectionDimList = () => foldHandleList().length || secDimsShown() ? (foldSectionDims(doc.foldDesign, { px: 1 / scale, labels: foldDimLabels() }) ?? []) : [];
function drawFoldSectionDims() { for (const g of foldSectionDimList()) drawFdItems(g.items, { color: '#4fb3ff', lineW: 1.6, font: 15, keepIn: true }); }
/* ───────── 断面の寸法を、いつも画面に出す＋寸法をクリックして数字を入れる（事業主 2026-10-25「断面図の寸法を入力したい」「見てもサイズがわからない」・案C）：
   表示メニューの「断面の寸法」（初めからオン）がオンの間は、設計カードや手順の小窓を閉じていても、全幅・全高・厚みの寸法（foldSectionDims）を出し続ける。2つ折りでは、線や文字をクリックすると、その寸法の数字を入れる小窓（FHB）が開く。
   ①表紙の幅＝endA・②裏表紙の幅＝endB・④全高＝h（背の内側の半径が変わる）・⑤表の厚み＝to・⑥裏の厚み＝ti。画面だけ（書き出し・印刷には入らない）。 ───────── */
const secDimsShown = () => !exporting && viewShow.secDims && !!doc.foldDesign && doc.shapes.some(s => s.foldSec === 'fd' && visible(s));
const FD_DIM_EDIT = { w: 'endA', wB: 'endB', h: 'h' };
function foldDimTargets() {
  const d = doc.foldDesign; if (mode !== 'select' || d?.mode !== 'bifold' || !secDimsShown()) return [];
  const groups = foldSectionDims(d, { px: 1 / scale, labels: foldDimLabels() }) ?? [], out = [], font = 15 / scale;
  const box = it => { ctx.save(); ctx.font = `700 ${font}px sans-serif`; const w = ctx.measureText?.(it.text)?.width ?? it.text.length * font * 0.62; ctx.restore(); const x0 = it.align === 'right' ? it.x - w : it.align === 'left' ? it.x : it.x - w / 2; return { x0, x1: x0 + w, y0: it.y - font * 0.7, y1: it.y + font * 0.7 }; };
  const parts = items => ({ lines: items.filter(i => i.type === 'line' && !i.dash), boxes: items.filter(i => i.type === 'text').map(box) });
  for (const g of groups) {
    if (g.key === 't') { const to = { key: 'to', ...parts((foldDimensions(d, 'to') ?? []).filter(i => i.type === 'line')) }, ti = { key: 'ti', ...parts((foldDimensions(d, 'ti') ?? []).filter(i => i.type === 'line')) }; to.boxes.push(...parts(g.items).boxes); out.push(to, ti); }   /* 厚みの文字は「⑤表」へ。線は、押した方 */
    else if (FD_DIM_EDIT[g.key]) out.push({ key: FD_DIM_EDIT[g.key], ...parts(g.items) });
  }
  return out;
}
/** 画面の点 p にある、数字を直せる断面の寸法（線の近く・文字の中）。無ければ null。 */
function foldDimKeyAt(p) {
  const w = world(p), r = 7 / scale; let best = null, bd = Infinity;
  for (const tg of foldDimTargets()) {
    for (const l of tg.lines) { const dd = distToShape({ type: 'line', x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y }, w); if (dd <= r && dd < bd) { best = tg.key; bd = dd; } }
    for (const b of tg.boxes) if (w.x >= b.x0 - r && w.x <= b.x1 + r && w.y >= b.y0 - r && w.y <= b.y1 + r && 0 < bd) { best = tg.key; bd = 0; }
  }
  return best;
}
let fdDimHot = null;
/** 図面に保存されている三つ折りの設計の値を、設計カードの数値欄へ書き戻す。図面を開いた・前回の続きを開いた・タブを切り替えた・元に戻したときなど、欄が図面の設計とずれていると、
 *  取っ手のドラッグや欄の入力で断面を作り直すときに、ずれた欄の値（ほかの寸法・厚み・リング）を読んでしまい、寸法が変わらない・別の形になる（事業主指摘 2026-10-15）。 */
let foldSyncDoc = null;
function syncFoldFields() {
  const d = doc.foldDesign; if (!d) return; const set = (id, v) => { const el = $(id); if (el && v !== undefined && v !== null && String(el.value) !== String(v)) el.value = String(v); };
  set('fdMode', d.mode === 'bifold' ? 'bifold' : 'trifold'); set('fdBiW', d.width); syncBackWidthField(); syncFoldModeUI();
  for (const [id, k] of FD_HANDLE_FIELDS) set(id, d[k]);
  set('foldSecT', d.t); set('fdTO', d.tOuter); set('fdTI', d.tInner); if ($('fdFlip')) $('fdFlip').checked = d.flipV !== false;
  if ($('fdRingOn')) $('fdRingOn').checked = !!d.ring;
  if (d.mode === 'bifold') setFoldSide(d.flipH ? 'left' : 'right');
  if (d.ring) { set('fdRingPos', d.ring.pos); set('fdStackT', d.ring.stackT); set('fdRefillDir', d.ring.dir === 'v' ? 'v' : 'h'); if ([...($('binderSpecSel')?.options || [])].some?.(o => o.value === d.ring.specId)) { set('binderSpecSel', d.ring.specId); const sp = binderSpec(d.ring.specId); if (sp && $('ringD')) fillRingOptions($('ringD'), sp); } /* 規格を替えたら、リング径の選択肢もその規格の一覧に作り直す（前の規格の一覧が残ると、Micro5 なのに 25〜40 が出て 20 が選べなかった・事業主指摘 2026-10-17） */ set('ringD', d.ring.ringD); if ($('ringD') && !Array.from($('ringD').children || []).some(o => o.value === $('ringD').value)) { const sp = binderSpec($('binderSpecSel').value); if (sp) $('ringD').value = String(sp.rings.diameterOptionsMm[0]); } syncFoldRingSelects(); }
  refreshFoldWidth(); refreshFoldPitch();
}
function startFoldHandleDrag(h, w, p = null) {
  syncFoldFields(); const d = doc.foldDesign; designUndoLen = -1;   /* ドラッグ全体を、新しい「元に戻す」1回にする */
  gesture = { kind: 'foldHandle', h, start: w, d0: { ...d }, vals: { ...Object.fromEntries(FD_HANDLE_FIELDS.map(([, k]) => [k, d[k]])), width: d.width, widthB: d.widthB, shiftX: d.shiftX ?? 0 } }; setFdDimKey(h.dim);
  if (p) gesture.start = world(p);   /* 寸法線が画面の外に出るときは、つかんだ瞬間に表示位置がずれる：動かした量は、ずれたあとの位置から測る（ずれる前の位置から測ると、つかんだだけで寸法が動く） */
  $('hint').textContent = t('foldHandleDrag'); draw();
}
/** 図面の点 (x, y) → 2つ折りの断面の座標 (u, v)（origin と上下反転から逆算）。計画が成り立たないとき null。 */
function foldLocal(d, x, y) { const p = foldDesignPlan(d); return p.ok && d.origin ? { p, u: (d.flipH ? 2 * (d.origin.x + (d.flipDx ?? 0)) - x : x) - d.origin.x, v: d.flipV !== false ? y - d.origin.y + 2 * p.rc[0] : d.origin.y - y } : null; }
function dragFoldHandle(w) {
  const g = gesture, v = g.vals; if (!g.moved) { if (Math.hypot(w.x - g.start.x, w.y - g.start.y) * scale > 3) g.moved = true; else return; }   /* 3ピクセル以上動かしてからドラッグ（それまでは何も変えない）。動かさずに離したら、数字の小窓を開く */ let dx = Math.round((w.x - g.start.x) * 10) / 10; if (g.d0?.flipH) dx = -dx; const set = (id, val) => { $(id).value = String(Math.round(val * 100) / 100); };
  switch (g.h.key) {
    case 'w': set('fdBiW', Math.max(1, v.width + dx)); if (Number.isFinite(v.widthB)) foldPend = { widthB: Math.max(1, v.widthB + dx), shiftX: v.shiftX }; break;   /* 全幅：両方の端を同じだけ（裏表紙の幅を別に決めてあれば、それも同じだけ） */
    case 'endA': { const nw = Math.max(1, v.width - dx); set('fdBiW', nw); foldPend = { widthB: v.widthB ?? v.width, shiftX: v.shiftX + (v.width - nw) }; break; }   /* 表紙の端：背（頂点）は動かさず、端だけが動く。裏表紙の幅は今のまま */
    case 'endB': foldPend = { widthB: Math.max(1, (v.widthB ?? v.width) - dx), shiftX: v.shiftX }; break;   /* 裏表紙の端 */
    case 'ring': {   /* リング：つかんだ所に近い革の位置へ（端から飛び出さない範囲）。上の革・下の革の真ん中をつかむと、どちらの側か決まらないので、今の側（頂点なら表紙側）に付けたまま動かす */
      const L = foldLocal(g.d0, w.x, w.y); if (!L) break;
      const path = foldSectionPath({ flats: L.p.flats, bends: L.p.bends }), arc = path.pieces.find(pc => pc.kind === 'arc'), mid = (arc.s0 + arc.s1) / 2, rc = L.p.rc[0], lim = foldRingLimits(path, g.d0.ring?.rOut ?? 0);
      const sideB = L.v > rc + 1e-9 ? true : L.v < rc - 1e-9 ? false : (g.d0.ring?.pos ?? 0) > 1e-9, pieces = path.pieces.filter(pc => sideB ? pc.s1 > mid : pc.s0 < mid);
      let sNew = projectOnFoldPath({ pieces }, L.u, L.v).s; sNew = sideB ? Math.max(sNew, mid) : Math.min(sNew, mid); sNew = Math.max(lim.lo, Math.min(lim.hi, sNew)); set('fdRingPos', sNew - mid); break;
    }
    case 'btn': { dx = Math.max(-Math.min(v.dL - 0.1, v.cL), Math.min(dx, Math.min(v.dR - 0.1, v.cR))); set('fdDL', v.dL + dx); set('fdDR', v.dR - dx); set('fdCL', v.cL + dx); set('fdCR', v.cR - dx); break; }   /* ボタン線を右へ dx：左の距離は＋dx・右の距離は−dx（全幅は変わらない） */
    case 'dl': set('fdDL', Math.max(0.1, v.dL - dx)); break;
    case 'dr': set('fdDR', Math.max(0.1, v.dR + dx)); break;
    case 'cl': set('fdCL', Math.max(0, v.cL - dx)); break;
    case 'cr': set('fdCR', Math.max(0, v.cR + dx)); break;
    case 'rl': set('fdRL', Math.max(0.1, v.rinL - dx)); break;
    case 'rr': set('fdRR', Math.max(0.1, v.rinR + dx)); break;
  }
  refreshFoldWidth(); refreshFoldPitch(); liveFoldDesign(); foldPend = null;
}
/** ドラッグを離したとき：成り立たない寸法で断面が作り直せなかったときは、欄を直前の正しい値へ戻す。 */
function endFoldHandleDrag(g) {
  const d = doc.foldDesign; if (d?.mode === 'bifold') $('fdBiW').value = String(d.width); if (d) for (const [id, k] of FD_HANDLE_FIELDS) if (Number($(id).value) !== d[k]) $(id).value = String(d[k]);
  refreshFoldWidth(); refreshFoldPitch(); setFdDimKey(null); settleFillFollow();   /* ドラッグを離したら、すぐ塗りを取り直す */
  if (g && !g.moved) openFoldHandleBar(g.h);   /* 動かさずに離した＝クリック：その寸法の数字を入れる小窓を開く */
}
/* ───────── 断面の取っ手をクリック：その寸法の数字を入れる小窓（事業主 2026-10-23「寸法指定の窓がどこにあるか見つからない」）。Enter で確定・Esc で閉じる ───────── */
const FHB = { w: ['fhbW', d => d.width], endA: ['fhbEndA', d => d.width], endB: ['fhbEndB', d => d.widthB ?? d.width], rr: ['fhbRR', d => d.rinR], ring: ['fhbRing', d => d.ring?.pos ?? 0], h: ['fhbH', d => { const p = foldDesignPlan(d); return p.ok ? 2 * (d.rinR + p.T) : 0; }], to: ['fhbTO', d => d.tOuter], ti: ['fhbTI', d => d.tInner] };
let fhbKey = null;
function openFoldHandleBar(h) {
  const d = doc.foldDesign, spec = FHB[h?.key]; if (!d || !spec || d.mode !== 'bifold' || !$('foldHandleBar')) return; fhbKey = h.key;
  $('fhbLabel').textContent = t(spec[0]); $('fhbVal').value = String(+Number(spec[1](d)).toFixed(2)); $('fhbSame').hidden = h.key !== 'endB'; $('foldHandleBar').hidden = false; $('fhbVal').focus?.(); $('fhbVal').select?.();
  $('hint').textContent = t('fhbOpened');
}
function closeFoldHandleBar() { fhbKey = null; if ($('foldHandleBar')) $('foldHandleBar').hidden = true; }
/** 小窓の数字を断面に反映する。same が真なら、裏表紙の幅を表紙と同じに戻す。 */
function applyFoldHandleBar(same = false) {
  const d = doc.foldDesign, key = fhbKey, raw = ($('fhbVal').value ?? '').trim(), val = Number(raw); if (!d || !key) return;
  if (!same && (raw === '' || !Number.isFinite(val) || (key !== 'ring' && !(val > 0)))) { $('hint').textContent = t('fhbBad'); return; }
  syncFoldFields(); const sx = d.shiftX ?? 0;
  if (key === 'w') { $('fdBiW').value = String(val); foldPend = { widthB: undefined, shiftX: sx }; }   /* 全幅：表紙・裏表紙とも同じ長さに */
  else if (key === 'endA') { $('fdBiW').value = String(val); foldPend = { widthB: d.widthB ?? d.width, shiftX: sx + (d.width - val) }; }   /* 表紙の端：背は動かさない・裏表紙は今のまま */
  else if (key === 'endB') foldPend = { widthB: same ? undefined : val, shiftX: sx };
  else if (key === 'rr') $('fdRR').value = String(val);
  else if (key === 'h') { const p = foldDesignPlan(d), rin = val / 2 - (p.ok ? p.T : 0); if (!(rin >= 0.1)) { $('hint').textContent = t('fhbBad'); return; } $('fdRR').value = String(+rin.toFixed(2)); }   /* ④全高：背の内側の半径で決まる（全高＝2×（半径＋厚み）） */
  else if (key === 'to') $('fdTO').value = String(val);
  else if (key === 'ti') $('fdTI').value = String(val);
  else if (key === 'ring') $('fdRingPos').value = String(val);
  refreshFoldWidth(); refreshFoldPitch(); liveFoldDesign(); foldPend = null; closeFoldHandleBar();
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
/** 文字の取っ手（事業主要望 2026-10-21「入力後のテキストを図で直接拡大縮小したい」）：文字を1つだけ選んでいる間（選択・文字ツール）、文字の枠（点線）と右上の角に取っ手が出る。
 *  角をつかんで引くと、左下の基準点（文字の置き場所）を固定したまま、角が対角線の方向に付いてくる大きさ（0.1mm 単位・最小 0.5mm）になる。離すと確定（元に戻すは1回）。回転した文字は、角も一緒に回る。 */
function textWidthMm(s) {
  let w = NaN; try { ctx.save(); ctx.font = `${s.sizeMm}px ${textFontStack(s.font)}`; w = ctx.measureText?.(s.text)?.width; ctx.restore(); } catch { /* 測れない環境では概算 */ }
  return Number.isFinite(w) && w > 0 ? w : Math.max(0.6, 0.6 * [...s.text].length) * s.sizeMm;   /* 描くときと同じ書体で実測する（日本語は1文字が大きさと同じ幅） */
}
const selectedText = () => (mode === 'select' || mode === 'text') && !exporting && selected.size === 1 ? (sh => sh && sh.type === 'text' ? sh : null)(doc.shapes.find(x => selected.has(x.id) && editable(x))) : null;
/** 文字の枠の4つの角（左下の基準点から見て 左上・右上・右下・左下）を、回転も含めた図面の座標で。大きさ size は、枠をその大きさに縮尺したときのもの（幅は大きさに比例）。 */
function textFrame(s, size = s.sizeMm) {
  const w = textWidthMm(s) * size / s.sizeMm, at = (dx, dy) => rotate({ x: s.x + dx, y: s.y + dy }, s.angleDeg, s);
  return { tl: at(0, -size), tr: at(w, -size), br: at(w, size * 0.25), bl: at(0, size * 0.25) };
}
function textHandleHit(w) {
  const sh = selectedText(); if (!sh) return null; const corner = textFrame(sh).tr;
  return distance(corner, w) <= 9 / scale ? { shape: sh, corner } : null;
}
/** つかんだ角の位置から、新しい大きさ：基準点からカーソルへの向きを、はじめの対角線（基準点→角）に射影した割合を、元の大きさにかける。 */
function textSizeFrom(g, sh, c) {
  const v = { x: c.x - sh.x, y: c.y - sh.y }, d = g.d0, k = (v.x * d.x + v.y * d.y) / (d.x * d.x + d.y * d.y);
  return Math.max(0.5, Math.round(g.size0 * k * 10) / 10);
}
let textHot = false;
function drawTextHandle() {
  const g = gesture?.kind === 'textR' ? gesture : null, sh = g ? doc.shapes.find(x => x.id === g.id) : selectedText(); if (!sh) return; const k = 1 / scale, f = textFrame(sh, g ? g.size : sh.sizeMm);
  ctx.save(); ctx.setLineDash([4 * k, 3 * k]); ctx.lineWidth = 1 * k; ctx.strokeStyle = g ? '#f0b429' : 'rgba(240,180,41,.55)';
  ctx.beginPath(); ctx.moveTo(f.tl.x, f.tl.y); ctx.lineTo(f.tr.x, f.tr.y); ctx.lineTo(f.br.x, f.br.y); ctx.lineTo(f.bl.x, f.bl.y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
  const z = (g || textHot ? 6 : 4.5) * k; ctx.fillStyle = g || textHot ? '#f0b429' : 'rgba(240,180,41,.6)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5 * k; ctx.fillRect(f.tr.x - z, f.tr.y - z, 2 * z, 2 * z); ctx.strokeRect(f.tr.x - z, f.tr.y - z, 2 * z, 2 * z);
  ctx.restore();
}
/** 縫い穴が付いている矩形か（穴を壊さないよう、大きさを変えない）。 */
const rectHasHoles = sh => doc.paths.some(pt => pt.shapeIds.includes(sh.id) && doc.holes.some(h => h.pathId === pt.id));
/** 矩形の大きさの小窓（事業主指示 2026-10-21「矩形を選択したら寸法を指定できる窓」）：縦横に平らな矩形を1つだけ選んでいる間、画面上部に「幅・高さ（mm）」を出す。
 *  数字を入れて Enter（または欄を出る）と、「動かさない点」（左上の角／中心）を固定したまま、その大きさになる（元に戻すは1回）。縫い穴が付いた矩形は取っ手と同じく断る。
 *  欄の数字は常に実際の寸法：取っ手で変えても追従し、入れかけの数字は描き直しでは消えない。Esc で入れた数字を取り消す。入れた数字は、窓を出した矩形（rectEditId）にしか使わない。 */
let rectEditKey = '', rectEditId = null;
function refreshRectEdit() {
  const sh = selectedRect(); $('rectEditBar').hidden = !sh; if (!sh) { rectEditKey = ''; rectEditId = null; return; }
  const b = rectBoxOf(sh), w = b.x1 - b.x0, h = b.y1 - b.y0, key = JSON.stringify([sh.id, w, h]); if (key === rectEditKey) return;
  rectEditKey = key; rectEditId = sh.id; $('rectEditW').value = circleNum(w); $('rectEditH').value = circleNum(h);
}
function applyRectEdit() {
  const sh = selectedRect(); if (!sh || sh.id !== rectEditId) return;
  const b = rectBoxOf(sh), w = Number($('rectEditW').value), h = Number($('rectEditH').value), back = () => { rectEditKey = ''; refreshRectEdit(); };   /* 断ったら、欄を実際の寸法に戻す */
  if (!(Number.isFinite(w) && Number.isFinite(h) && w >= 0.05 && h >= 0.05)) { $('hint').textContent = t('rectEditInvalid'); back(); return; }
  if (Math.abs(w - (b.x1 - b.x0)) < 1e-9 && Math.abs(h - (b.y1 - b.y0)) < 1e-9) return;
  if (rectHasHoles(sh)) { $('hint').textContent = t('rectHoles'); back(); return; }
  const r4 = v => +v.toFixed(4), center = $('rectEditAnchor').value === 'center', x0 = center ? (b.x0 + b.x1) / 2 - w / 2 : b.x0, y0 = center ? (b.y0 + b.y1) / 2 - h / 2 : b.y0;
  commit(() => { sh.points = rectShape({ x: r4(x0), y: r4(y0) }, { x: r4(x0 + w), y: r4(y0 + h) }).points; });
  $('hint').textContent = t('rectResized', { w: circleNum(w), h: circleNum(h) });
}
for (const id of ['rectEditW', 'rectEditH']) {
  $(id).addEventListener('change', applyRectEdit);
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyRectEdit(); } else if (e.key === 'Escape') { rectEditKey = ''; refreshRectEdit(); } });   /* Esc＝入れかけを取り消す（このあと欄を出ても、変更は起きない） */
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
  card.addEventListener('focusin', e => highlightFoldDiagram(e.target?.id)); card.addEventListener('focusout', e => { if (!card.contains?.(e.relatedTarget)) setFdDimKey(null); }); card.addEventListener('mouseleave', () => { if (!card.contains?.(document.activeElement)) setFdDimKey(null); }); card.addEventListener('mouseover', e => highlightFoldDiagram(fieldOf(e))); $('foldSecMake').onclick = makeFoldSection; $('foldCutY').addEventListener('change', () => { const raw = $('foldCutY').value.trim(), n = Number(raw); if (raw !== '' && !Number.isFinite(n)) return; setFoldCutY(raw === '' ? undefined : n); }); $('foldCutPick').onclick = () => { setMode('select'); foldCutPicking = true; $('hint').textContent = t('foldCutPickHint'); }; $('foldCutClear').onclick = () => { foldCutPicking = false; setFoldCutY(undefined); syncFoldCutField(); $('hint').textContent = t('foldCutCleared'); draw(); }; $('foldSecApply').onclick = applyFoldSection; $('foldSecClear').onclick = clearFoldSections; $('foldRadApply').onclick = applyFoldRadii; $('fdMode').onchange = () => { syncFoldModeUI(); refreshFoldPitch(); if (foldBookComplete(foldBookState())) makeFoldDesign(false); };   /* 折り方を替えても、⓪（手帳か・リング・リフィル）が決まるまでは断面を自動で作らない（勝手に決まらないように・事業主 2026-10-23）。断面がすでにあるときは今までどおり作り直す */ $('fdBiW').oninput = () => { refreshFoldPitch(); liveFoldDesign(); }; $('fdSameCover').onclick = sameCoverLength; $('fdBiWB').oninput = onBackWidthInput; $('refillCoverDim').onclick = addRefillCoverDim; syncFoldModeUI(); $('fdMake').onclick = () => makeFoldDesign(false); $('fdFix').onclick = fixFoldDesign; $('fdStitch').onclick = () => projectFoldDesign(true); $('fdUnfold').onclick = unfoldFoldDesign; for (const id of ['fdRingPos', 'fdStackT']) $(id).oninput = liveFoldDesign; for (const id of ['fdTO', 'fdTI']) $(id).oninput = () => { refreshFoldPitch(); liveFoldDesign(); }; $('fdRingOn').onchange = liveFoldDesign; $('fdFlip').onchange = liveFoldDesign; for (const id of ['fdH', 'fdEdge', 'fdMargin', 'fdPitch', 'fdBtnD']) $(id).addEventListener('input', () => { if (id === 'fdH') planHeightTouched = true; onFlatNumber(id); }); $('flowH').addEventListener('input', () => { planHeightTouched = true; $('fdH').value = $('flowH').value; onFlatNumber('fdH'); });   /* 折りの小窓の②の「平面図の高さ」は、設計カードの欄と同じ数字 */ try { const sv = localStorage.getItem('leather-cad.foldSide'); if (sv === 'left' || sv === 'right') setFoldSide(sv, false); } catch { /* 読めなくても、右のまま */ } $('fdSide').onchange = () => { setFoldSide($('fdSide').value); if (doc.foldDesign) liveFoldDesign(); }; $('flowSide').onchange = () => { setFoldSide($('flowSide').value); if (doc.foldDesign) liveFoldDesign(); };   /* 断面がすでにあるときだけ作り直す（向きを選んだだけで、⓪を決める前に断面ができないように） */ $('fdRefillDir').onchange = liveFoldDesign; $('fdRingSpec').onchange = () => { $('binderSpecSel').value = $('fdRingSpec').value; onBinderChange(); }; $('fdRingDia').onchange = () => { $('ringD').value = $('fdRingDia').value; onBinderChange(); }; syncFoldRingSelects(); for (const id of ['fdDL', 'fdDR', 'fdCL', 'fdCR', 'fdRL', 'fdRR']) $(id).oninput = () => { if (id === 'fdDL' || id === 'fdDR') refreshFoldWidth(); refreshFoldPitch(); liveFoldDesign(); }; $('fdW').oninput = setFoldWidth; $('fdNudgeL').onclick = () => nudgeFoldButton(-1); $('fdNudgeR').onclick = () => nudgeFoldButton(1); refreshFoldWidth(); $('fdPitch').oninput = refreshFoldPitch; $('foldSecT').oninput = refreshFoldPitch; refreshFoldPitch(); $('foldBaseMake').onclick = makeFoldBaselines; }
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
  cancel(); commit(() => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, type: 'text', x: +at.x.toFixed(3), y: +at.y.toFixed(3), text, sizeMm: Number($('textSize').value) || 5, angleDeg: 0, ...newTextFont() }); selected = new Set([id]); });
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
  $('sideToggle').onclick = () => { if (document.body.classList.contains('side-open')) closeSidePanel(); else openSidePanel(null); };   /* スマホ：引き出しを開け閉め（開くと、右クリックメニューと同じ一覧が出る） */
  $('spCoverDraw').onclick = drawCoverFromSpine;
  /* 上のメニューを一時的に隠す（小さい画面で作図の場所を広げる）。記憶はしない。 */
  const setHeaderHidden = on => { document.body?.classList?.toggle('hdr-hidden', on); $('hdrShow').hidden = !on; $('hint').textContent = t(on ? 'hdrHidden' : 'hdrShown'); resize(); };
  $('hdrHide').onclick = () => setHeaderHidden(true); $('hdrShow').onclick = () => setHeaderHidden(false);
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
  if (parts.isolated) $('hint').textContent = t('trimIsolated');   /* 交点が1つも無い線を、線ごと消したとき：なぜ全部消えたかを案内する */
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
/** 同じ直線の上で重なった線の判定の許容（事業主要望 2026-10-21「重複した線は、ボタンで一括して統合したい」）：直線からのずれ 0.05mm・角度 0.1°。まとめるとき、端の違いが 0.15mm 以内なら、残す線の端は動かさない。 */
const DUP_LINE_TOL = 0.05, DUP_ANGLE_DEG = 0.1, DUP_END_TOL = 0.15;
/** 直線（line）と、2点の開いた折れ線の、両端と向き。それ以外・長さ 0 は null。th＝向きの角度（0〜180°・向きの反対は同じ）。 */
function straightInfo(s) {
  const e = s.type === 'line' ? [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }] : s.type === 'polyline' && !s.closed && s.points?.length === 2 ? [{ x: s.points[0].x, y: s.points[0].y }, { x: s.points[1].x, y: s.points[1].y }] : null; if (!e) return null;
  const dx = e[1].x - e[0].x, dy = e[1].y - e[0].y, len = Math.hypot(dx, dy); if (!(len > 1e-6)) return null;
  return { s, a: e[0], b: e[1], len, u: { x: dx / len, y: dy / len }, th: (((Math.atan2(dy, dx) * 180 / Math.PI) % 180) + 180) % 180 };
}
/** 2本の直線が、同じ直線の上にあって、長さの途中が重なっているか（端がちょうど接するだけは、重なりでない）。 */
function collinearOverlap(A, B) {
  const off = q => Math.abs((q.x - A.a.x) * A.u.y - (q.y - A.a.y) * A.u.x); if (off(B.a) > DUP_LINE_TOL || off(B.b) > DUP_LINE_TOL) return false;
  const t1 = (B.a.x - A.a.x) * A.u.x + (B.a.y - A.a.y) * A.u.y, t2 = (B.b.x - A.a.x) * A.u.x + (B.b.y - A.a.y) * A.u.y;
  return Math.min(A.len, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2)) > 0.01;
}
/** 同じ層・同じ線種・同じ色で重なっている図形の組を返す（[{ ids }]・2本以上の組だけ）。座標がまったく同じ図形（線・円弧・円・2点の折れ線）に加え、同じ直線の上で長さの途中が重なった線（直線・2点の折れ線）も、同じ組にする（A と B、B と C が重なれば A・B・C で1組）。 */
function findOverlaps(list) {
  const byStyle = new Map(); for (const s of list) { const k = [s.layer, s.lineStyle || '', s.color || ''].join('|'); if (!byStyle.has(k)) byStyle.set(k, []); byStyle.get(k).push(s); }
  const out = [];
  for (const sub of byStyle.values()) {
    const g = dedupeShapeGroups(sub), parent = new Map(sub.map(s => [s.id, s.id])), find = id => { while (parent.get(id) !== id) { parent.set(id, parent.get(parent.get(id))); id = parent.get(id); } return id; }, join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
    for (const ids of g.groups.values()) for (const id of ids.slice(1)) join(ids[0], id);
    const segs = sub.map(straightInfo).filter(Boolean).sort((p, q) => p.th - q.th), n = segs.length, tryJoin = (A, B) => { if (find(A.s.id) !== find(B.s.id) && collinearOverlap(A, B)) join(A.s.id, B.s.id); };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n && segs[j].th - segs[i].th <= DUP_ANGLE_DEG; j++) tryJoin(segs[i], segs[j]);
      if (segs[i].th <= DUP_ANGLE_DEG) for (let j = n - 1; j > i && 180 - segs[j].th + segs[i].th <= DUP_ANGLE_DEG; j--) tryJoin(segs[i], segs[j]);   /* 0° と 180° のまたぎ（ほぼ水平の線） */
    }
    const comps = new Map(); for (const s of sub) { const r = find(s.id); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(s.id); }
    for (const ids of comps.values()) if (ids.length > 1) out.push({ ids });
  }
  return out;
}
function updateDupBar() { const bar = $('dupBar'); if (!bar) return; bar.hidden = !dupGroups.length || exporting; if (dupGroups.length) $('dupInfo').textContent = t('dupInfo', { n: dupGroups.length }); }
/** 重なった図形を、赤く太く描く（警告）。 */
function drawOverlaps() {
  if (!dupGroups.length) return; ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 0.6; ctx.lineWidth = 5 / scale;
  for (const g of dupGroups) for (const id of g.ids) { const s = doc.shapes.find(x => x.id === id); if (s) strokeShape(s, '#ff3b3b', false); }
  ctx.restore();
}
/** 重なった図形を1本にまとめる（事業主要望 2026-10-21）。座標がまったく同じ図形は、今までどおり1つ残す。同じ直線の上で重なった線は、重なった全体の範囲の1本にする（残す線の端が 0.15mm 以内の違いなら動かさない）。
 *  残す1本：菱目の経路が付いた線＞ほかの図形とつながっている端が多い線＞長い線。経路が付いた線を延ばす必要があるとき・経路が付いた線が（同じ形でなく）2本以上あるときは、経路がずれるので、その組はそのままにして知らせる。元に戻すは1回。 */
function mergeOverlaps() {
  const groups = dupGroups.filter(g => g.ids.every(id => { const s = doc.shapes.find(x => x.id === id); return s && editable(s); })); if (!groups.length) return;
  const hasPath = s => doc.paths.some(p => p.shapeIds.includes(s.id)), sameShape = (p, q) => dedupeShapeGroups([p, q]).reps.length === 1, plan = []; let skipped = 0;
  for (const g of groups) {
    const members = g.ids.map(id => doc.shapes.find(x => x.id === id)).filter(Boolean); if (members.length < 2) continue;
    const pathMembers = members.filter(hasPath); if (pathMembers.some(m => !sameShape(m, pathMembers[0]))) { skipped++; continue; }
    if (members.every(m => sameShape(m, members[0]))) { const keep = pathMembers[0] ?? members[0]; plan.push({ keep, drop: new Set(members.filter(m => m !== keep).map(m => m.id)), ext0: 0, ext1: 0 }); continue; }   /* 同じ形：今までどおり */
    const infos = new Map(members.map(m => [m.id, straightInfo(m)])); if ([...infos.values()].some(v => !v)) { skipped++; continue; }
    const others = magnetPointsOf(doc.shapes.filter(x => visible(x) && !g.ids.includes(x.id))).ends, linked = m => { const I = infos.get(m.id); return [I.a, I.b].filter(q => others.some(o => Math.hypot(o.x - q.x, o.y - q.y) <= 1e-3)).length; };
    const keep = pathMembers[0] ?? [...members].sort((p, q) => linked(q) - linked(p) || infos.get(q.id).len - infos.get(p.id).len)[0], K = infos.get(keep.id);
    const ts = members.flatMap(m => { const I = infos.get(m.id); return [I.a, I.b].map(q => (q.x - K.a.x) * K.u.x + (q.y - K.a.y) * K.u.y); });
    let ext0 = Math.max(0, -Math.min(0, ...ts)), ext1 = Math.max(0, Math.max(K.len, ...ts) - K.len); if (ext0 <= DUP_END_TOL) ext0 = 0; if (ext1 <= DUP_END_TOL) ext1 = 0;
    if (pathMembers.length && (ext0 > 0 || ext1 > 0)) { skipped++; continue; }
    plan.push({ keep, drop: new Set(members.filter(m => m !== keep).map(m => m.id)), ext0, ext1, K });
  }
  if (!plan.length) { $('hint').textContent = t('dupMergeNone', { s: skipped }); return; }
  cancel(); let removed = 0;
  commit(() => {
    for (const { keep, drop, ext0, ext1, K } of plan) {
      removed += drop.size;
      if (ext0 > 0 || ext1 > 0) { const a = { x: K.a.x - K.u.x * ext0, y: K.a.y - K.u.y * ext0 }, b = { x: K.b.x + K.u.x * ext1, y: K.b.y + K.u.y * ext1 }; if (keep.type === 'line') Object.assign(keep, { x1: a.x, y1: a.y, x2: b.x, y2: b.y }); else keep.points = [a, b]; }
      for (const p of doc.paths) if (p.shapeIds.some(id => drop.has(id))) p.shapeIds = [...new Set(p.shapeIds.map(id => drop.has(id) ? keep.id : id))];
      for (const part of doc.parts) if (part.shapeIds.some(id => drop.has(id))) part.shapeIds = [...new Set(part.shapeIds.map(id => drop.has(id) ? keep.id : id))];
      doc.shapes = doc.shapes.filter(s => !drop.has(s.id)); selected = new Set([...selected].filter(id => !drop.has(id)));
    }
  });
  $('hint').textContent = t(skipped ? 'dupMergedSkip' : 'dupMerged', { k: removed, n: plan.length, s: skipped });
}
/** 線対称コピー。選んだ図形（と、その線の穴）に加えて、図形ごと写されない穴（穴だけ選んだ・線の一部しか選んでいない）も、軸の反対側にコピーする。
 *  事業主 2026-10-26「丸目の線対称コピーができない」：穴だけを選ぶと「先に図形を選択してください」で止まっていた。穴は線の上にしか置けないので、反射した位置を通る見えない補助の線（holeLink・ガイド層）を作り、その上に置く（工具・種類・傾きは元のまま）。 */
function mirrorCopy(a, b) {
  const ids = selectedShapeIds(), lone = doc.holes.filter(h => selected.has(h.id) && holeEditable(h) && !doc.paths.find(p => p.id === h.pathId)?.shapeIds.every(id => ids.has(id)));   /* lone＝選んだ穴のうち、乗っている線が（全部は）選ばれていないもの */
  if (!ids.size && !lone.length) { $('hint').textContent = t('selectFirst'); return; }
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
    const madeHoles = [], byPath = new Map(); for (const h of lone) { if (!byPath.has(h.pathId)) byPath.set(h.pathId, []); byPath.get(h.pathId).push(h); }
    for (const [pid, list] of byPath) {
      list.sort((u, v) => u.s - v.s); const orig = doc.paths.find(p => p.id === pid), origRoute = orig && resolvePath(doc, orig), refl = list.map(h => keepHoleSlant(reflectAcross(h, a, b), h));
      let pts = refl.map(h => ({ x: h.x, y: h.y })).filter((q, i, arr) => !i || distance(q, arr[i - 1]) > 1e-6);
      if (pts.length < 2) { const tan = (origRoute ? pointAtLength(origRoute, list[0].s).angleDeg : 0) * Math.PI / 180, q = reflectAcross({ ...list[0], x: list[0].x + Math.cos(tan) * 0.5, y: list[0].y + Math.sin(tan) * 0.5 }, a, b); pts = [{ x: refl[0].x, y: refl[0].y }, { x: q.x, y: q.y }]; }   /* 穴が1個だけのとき：元の線の向き（鏡に映した向き）に、0.5mm の補助の線 */
      const sid = freshId(doc.shapes, 's'); doc.shapes.push({ id: sid, layer: ensureLayer(doc, 'guide'), type: 'polyline', holeLink: true, closed: false, points: pts });
      const npid = freshId(doc.paths, 'p'), np = { id: npid, shapeIds: [sid], reversed: false, closed: false, segments: [], mark: orig?.mark || 'tool', ...(orig?.thread ? { thread: orig.thread, threadHex: orig.threadHex } : {}) }; doc.paths.push(np);
      const route = resolvePath(doc, np);
      for (const h of refl) { const id = freshId(doc.holes, 'h'); doc.holes.push({ ...h, id, pathId: npid, s: route ? projectOnPath(route, h).s : 0 }); madeHoles.push(id); }
    }
    selected = new Set([...map.values(), ...madeHoles]); if (doc.shapes.some(s => ids.has(s.id) && partOf(s))) flipMark(selected);
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
    if (mode === 'text') { const content = askText(); if (content) addShape({ type: 'text', x: point.x, y: point.y, text: content, sizeMm: Number($('textSize').value) || 5, angleDeg: 0, ...newTextFont() }); }
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
function dimOffsetInfo(a, b, pt, exclude = null) {
  const len = distance(a, b) || 1, v = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }, n = { x: v.y, y: -v.x }, dot = (p, q) => p.x * q.x + p.y * q.y, off = dot({ x: pt.x - a.x, y: pt.y - a.y }, n), tol = 10 / (scale || 1);
  let best = null;
  for (const e of doc.shapes) {
    if (e.type !== 'dimension' || e.foldSec || !visible(e) || (exclude && exclude.has(e.id))) continue; const el = distance({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }); if (el < 1e-6) continue;
    const ev = { x: (e.x2 - e.x1) / el, y: (e.y2 - e.y1) / el }, en = { x: ev.y, y: -ev.x }; if (Math.abs(ev.x * v.y - ev.y * v.x) > 1e-3) continue;   /* 平行な寸法だけ */
    const c = dot({ x: e.x1, y: e.y1 }, n) + e.offset * dot(en, n), o = c - dot(a, n), gap = Math.abs(o - off);   /* c＝相手の寸法線の、n 方向の位置 */
    if (gap <= tol && (!best || gap < best.gap)) best = { gap, o, e };
  }
  if (best) { const g = dimension({ x: best.e.x1, y: best.e.y1 }, { x: best.e.x2, y: best.e.y2 }, best.e.offset); return { offset: Math.abs(best.o) < 0.5 ? (best.o < 0 ? -0.5 : 0.5) : best.o, snap: [g.a, g.b] }; }
  const r = Math.round(off * 10) / 10; return { offset: Math.abs(r) < 0.5 ? (r < 0 ? -0.5 : 0.5) : r, snap: null };
}
const dimOffsetFor = (a, b, pt) => dimOffsetInfo(a, b, pt).offset;
/** 寸法線だけをドラッグで動かす（事業主の希望 2026-10-19「あとから微調整が簡単に」）：ドラッグの、寸法線に直角な向きの量だけ「ずらし」を変える。測る点は動かさない（図形に追従する覚えも残る）。近くの平行な寸法線にはそろえる（作るときと同じ吸着・動かしている寸法どうしは除く）。 */
function dimOffPreview(g, cur) {
  const out = new Map(), dx = cur.x - g.start.x, dy = cur.y - g.start.y;
  for (const id of g.ids) { const d = doc.shapes.find(s => s.id === id); if (!d || d.type !== 'dimension') continue; const a = { x: d.x1, y: d.y1 }, b = { x: d.x2, y: d.y2 }, len = distance(a, b) || 1, n = { x: (b.y - a.y) / len, y: -(b.x - a.x) / len }, off = g.base.get(id) + dx * n.x + dy * n.y; out.set(id, dimOffsetInfo(a, b, { x: a.x + n.x * off, y: a.y + n.y * off }, g.ids).offset); }
  return out;
}
const dimOnlySelection = () => { const ids = selectedShapeIds(); return ids.size > 0 && [...ids].every(id => doc.shapes.find(s => s.id === id)?.type === 'dimension'); };
/** 寸法線を自動で入れる（事業主の希望 2026-10-19「図面に全自動で寸法線を入れ、あとから微調整が簡単にできるようにしてほしい」）。対象＝見えている図形のうち、ガイドの層・金具・見えない補助の線・文字・寸法・折り線・下絵を除いたもの。図形を選んでいれば、その図形だけ。計算は autodim.js。 */
function autoDimCandidates() { const ids = selectedShapeIds(), all = doc.shapes.filter(s => visible(s) && (adIsDiamond(s) || (s.layer !== 'guide' && s.layer !== 'marks' && s.lineStyle !== 'dashed')) && !isHardwareShape(s) && !['text', 'dimension', 'fold', 'image'].includes(s.type)); return $('adSelOnly')?.checked ? all.filter(s => ids.has(s.id)) : all; }   /* 「選んだ図形だけに入れる」を入れたときだけ、選択で絞る（不具合記録 2026-10-19 08:45：前回の続きを開いたときの選択 198 個が残っていて、外形の角の曲線が外れ「全体 0 本」になった） */   /* 菱目（菱の線）は、目印・ガイドの層や点線でも対象に入れる（寸法は付けず、菱目の間隔の比較にだけ使う） */   /* 選んでいるのが寸法だけ（入れた直後など）なら、図面の全部を対象にする */
function runAutoDims() {
  const gap = Number($('adGap').value); if (!(gap > 0)) { $('hint').textContent = t('invalidNumber'); return; }
  const tool = doc.tools.find(x => x.id === $('stitchTool')?.value) || doc.tools[0], toolPitch = tool && tool.pitch > 0 ? tool.pitch : null;   /* 菱の線の間隔は、目打ちカードで選んでいる工具のピッチと比べる */
  const cand = autoDimCandidates(), plan = autoDimensionPlan(doc, cand, { size: $('adSize').checked, edges: $('adEdges').checked, circles: $('adCircles').checked, holes: $('adHoles').checked, radii: $('adRadius').checked, radiusSide: $('adRadiusSide')?.value === 'out' ? 'out' : 'in', gap, toolPitch, pitchLabel: (p, n) => t('adPitchLabel', { p: p.toFixed(2), n }) });
  const noPiece = $('adSize').checked && !autoDimCounts(plan).size && plan.info?.biggest ? ' ' + t('adNoPiece', { n: plan.info.clusters, w: plan.info.biggest.w, h: plan.info.biggest.h, why: t('adWhy_' + (plan.info.biggest.why || 'exists')) }) : '';   /* 全体の幅・高さが1本も入らなかったとき：いちばん大きいかたまりの大きさと理由（不具合の切り分け用） */
  if (!plan.length) { $('hint').textContent = t(cand.length ? 'adNothingNew' : $('adSelOnly')?.checked ? 'adSelNone' : 'adNoShapes') + noPiece; $('adInfo').textContent = noPiece.trim(); return; }
  const layer = doc.layers.some(l => l.id === 'guide' && l.visible && !l.locked) ? 'guide' : activeLayer, ids = [];   /* 寸法線はガイドの層（見えていて動かせるとき）。addShape と同じ決め方 */
  cancel(); commit(() => { for (const d of plan) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, ...d }); ids.push(id); } });
  selected = new Set(ids); refreshInfo(); draw();
  $('hint').textContent = t('adDone', { n: plan.length }) + noPiece; $('adInfo').textContent = t('adDoneDetail', autoDimCounts(plan)) + noPiece;
}
function clearAutoDims() {
  const gone = doc.shapes.filter(s => s.type === 'dimension' && s.autoDim); if (!gone.length) { $('hint').textContent = t('adNoneToClear'); return; }
  cancel(); commit(() => { doc.shapes = doc.shapes.filter(s => !(s.type === 'dimension' && s.autoDim)); }); for (const s of gone) selected.delete(s.id); refreshInfo(); draw();
  $('hint').textContent = t('adCleared', { n: gone.length }); $('adInfo').textContent = '';
}
/** 寸法ツール（D）で丸めた角（円弧・ベジェ・折れ線の丸み）をクリックして R の寸法を作る（事業主の希望 2026-10-20「Rの寸法をお願いします」→「クリックで寸法線を呼び出し、次のクリックの位置で内外を決めたい」）。
 *  1回目のクリック＝角を選ぶだけ（stage＝radius・まだ作らない）／2回目のクリックの位置＝円の内側なら中心から曲線へ、円の外側なら曲線の外へ引き出す（方向も2回目の点の向き・adRadiusDimension）。手で作った寸法なので自動寸法の印は付けない。
 *  スナップが入で、1回目がその角の曲線の端（直線とのつなぎ目）に吸い付く位置のときだけ、今までどおり距離の始点。ほかの図形の点（菱目・中心など）が近くにあっても角を選ぶ（縫い目の菱目が外周に沿って並ぶ図面で、角の近くは吸い付く点だらけになるため・実画面で確認）。 */
let radiusCorner = null, radiusHover = null, radiusHoverAt = 0;   /* radiusCorner：1回目の前に、マウスが近い角（強調する）／radiusHover：角を選んだあとの、できる R のプレビュー（{ dim, outside, label }） */
function dimRadiusPick(raw) {
  const f = adRoundingNear(doc.shapes.filter(s => visible(s) && !['text', 'dimension', 'fold', 'image'].includes(s.type) && !isHardwareShape(s)), raw, 8 / scale); if (!f) return null;
  return $('snap').checked && f.ends.some(e => distance(raw, e) < 9 / scale) ? null : f;
}
const dimRadiusLen = () => Math.abs(Number($('dimOffset')?.value)) || 8;
/** マウスを動かしたとき：寸法ツールで、(1) まだ1点も打っていなければ、選ばれる角を強調する（40ms ごとに1回）。(2) 角を選んだあとは、マウスの位置でできる R（内側＝水色／外側＝だいだい色）を先に見せる。変わったら案内も変える。 */
function updateRadiusHover(raw) {
  if (mode !== 'dimension' || gesture) { radiusCorner = null; radiusHover = null; return; }
  if (stage?.kind === 'radius') {
    radiusCorner = null; const h = adRadiusDimension(stage.f, raw, dimRadiusLen()); if (JSON.stringify(h.dim) === JSON.stringify(radiusHover?.dim)) return;
    radiusHover = h; $('hint').textContent = t(h.outside ? 'dimRadiusHoverOut' : 'dimRadiusHoverIn', { r: h.label }); return;
  }
  radiusHover = null; if (stage) { radiusCorner = null; return; }
  const now = Date.now(); if (now - radiusHoverAt < 40) return; radiusHoverAt = now;
  const f = dimRadiusPick(raw), key = c => c ? [c.cx, c.cy, c.r].map(v => v.toFixed(2)).join(',') : '';
  if (key(f) === key(radiusCorner)) return;
  radiusCorner = f ? { cx: f.cx, cy: f.cy, r: f.r, pts: f.pts, label: f.label } : null; $('hint').textContent = f ? t('dimRadiusHoverPick', { r: f.label }) : t('hint.dimension');
}
function dimToolClick(pt, raw = pt) {
  if (stage?.kind === 'radius') {   /* 2回目：円の内側なら中心から曲線へ・外側なら外へ引き出す R の寸法を作る */
    const plan = adRadiusDimension(stage.f, raw, dimRadiusLen()); stage = null; radiusHover = null; radiusCorner = null; addShape(plan.dim);
    $('hint').textContent = t('dimRadiusMade', { r: plan.label }); lastPoint = raw; draw(); return;
  }
  if (stage?.kind === 'dimPlace') {   /* 3点目：ここで初めて寸法を作る（数値の位置＝3点目） */
    const g = stage; stage = null; addShape({ type: 'dimension', x1: g.a.x, y1: g.a.y, x2: g.b.x, y2: g.b.y, offset: dimOffsetFor(g.a, g.b, pt) });
    const sh = doc.shapes.find(x => x.id === [...selected][0]); if (sh?.type === 'dimension') $('hint').textContent = t('dimPlaced', { off: Math.abs(sh.offset).toFixed(1) }); lastPoint = pt; draw(); return;
  }
  if (stage?.kind !== 'dim') { const f = dimRadiusPick(raw); if (f) { stage = { kind: 'radius', f }; radiusCorner = null; radiusHover = null; $('hint').textContent = t('dimRadiusPicked', { r: f.label }); lastPoint = raw; draw(); return; } stage = { kind: 'dim', a: pt }; lastPoint = pt; draw(); return; }   /* 1回目：丸めた角ならその角を選ぶ（次のクリックの位置で内外を決める）。そうでなければ、2点で測る始点 */
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
  const ends = [], centers = [], guide = [], mids = [], runs = straightRuns(shapes), inRun = new Set(runs.flatMap(r => r.ids));   /* inRun：1本の辺が途中で分かれている線（中点は辺全体の1つだけ） */
  for (const s of shapes) {
    const segs = s.type === 'line' || s.type === 'bezier' ? [s] : s.type === 'polyline' ? s.points.slice(0, s.closed ? undefined : -1).map((q, i) => ({ type: 'line', x1: q.x, y1: q.y, x2: s.points[(i + 1) % s.points.length].x, y2: s.points[(i + 1) % s.points.length].y })) : s.type === 'path' ? pathSegments(s) : [];
    for (const g of segs) { const m = inRun.has(s.id) ? null : g.type === 'line' ? { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 } : pointAtLength(g, arcLength(g) / 2); guide.push({ x: g.x1, y: g.y1 }, ...(m ? [m] : []), { x: g.x2, y: g.y2 }); if (m) mids.push(m); } /* 各区間の「中点（長さの真ん中）と両端」 */
    if (s.type === 'arc') { guide.push(circlePoint(s, s.startDeg), circlePoint(s, s.startDeg + arcSweep(s) / 2), circlePoint(s, s.endDeg)); mids.push(circlePoint(s, s.startDeg + arcSweep(s) / 2)); }
    if (s.type === 'line') ends.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    else if (s.type === 'polyline') ends.push(...s.points.map(p => ({ x: p.x, y: p.y })));
    else if (s.type === 'bezier') ends.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    else if (s.type === 'path') ends.push(...s.nodes.map(n => ({ x: n.x, y: n.y })));
    else if (s.type === 'arc') { ends.push(circlePoint(s, s.startDeg), circlePoint(s, s.endDeg)); centers.push({ x: s.cx, y: s.cy }); }
    else if (s.type === 'circle') { centers.push({ x: s.cx, y: s.cy }); for (let k = 0; k < 8; k++) guide.push({ ...circlePoint(s, k * 45), weak: true }); }   /* weak：円周の45°ごとの点は「弱い点」。吸着距離の中に他の点（線の端・円の中心・中点など）があれば、そちらを先に取る（事業主 2026-10-28「円の中心に直線の始点がスナップしない」：小さな円では、中心から半径の半分を外れると円周の点に取られていた） */
  }
  guide.push(...runs.map(r => ({ ...r.mid }))); mids.push(...runs.map(r => ({ ...r.mid })));   /* 分かれた辺の中点は、辺全体の中点 */
  { const sl = smallLoopCenters(shapes); guide.push(...sl); mids.push(...sl); }   /* 小さな菱形・四角の中心（ガイドの点＝近づくと印が出る。常時の十字は出さない・事業主の指摘 2026-10-18「菱穴の中心から直線が引けない」） */
  return { ends, centers, guide, mids };   /* mids：辺の中点・円弧の中点・分かれた辺全体の中点・小さな輪の中心（「中心」の点。縦横のそろえに使う） */
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
/** 格子の枠の隙間の警告：橙の丸印と隙間の長さ。枠の図形を選んでいる間だけ（ポインタを近づけなくても出す）。 */
function drawGapAlert() {
  const live = !!gapAlert && [...gapAlert.ids].some(id => selected.has(id)), bar = $('gapBar');
  if (bar) { bar.hidden = !live || exporting; if (live) { const info = t('gapBarInfo', { n: gapAlert.pts.length, d: Math.max(...gapAlert.pts.map(q => q.d)).toFixed(2) }); if ($('gapInfo').textContent !== info) $('gapInfo').textContent = info; } }   /* 「閉じて作る」のバー：丸印と同じ間だけ */
  if (!live) return;
  const px = 1 / scale; ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = '#ff9a1f'; ctx.fillStyle = '#ff9a1f'; ctx.lineWidth = 3 * px; ctx.font = `bold ${14 * px}px sans-serif`;   /* 画面で見つけやすいよう、半径 14px と 22px の二重の輪 */
  for (const p of gapAlert.pts) { for (const rr of [14, 22]) { ctx.beginPath(); ctx.arc(p.x, p.y, rr * px, 0, Math.PI * 2); ctx.stroke(); } ctx.fillText(`${p.d.toFixed(2)} mm`, p.x + 26 * px, p.y - 26 * px); }
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
  const magnet = magnetPointsOf(shapes), loops = loopCenters(shapes.filter(s => s.layer !== 'guide' && !s.holeLink && !s.markOf && !s.foldSec && !s.foldFlat)); snapCache.push(...loops);   /* 閉じた図形（角丸の長方形など）の中央：吸着の候補と、近づくと出る印・縦横のそろえの点（ガイドの線は除く・事業主 2026-10-23「図形の中央を始点にしたい」） */
  magnetEnds = magnet.ends; magnetCenters = magnet.centers; magnetMids = [...magnet.mids, ...loops];
  const holeCenters = doc.holes.filter(h => holeVisible(h)).map(h => ({ x: h.x, y: h.y })), seen = new Set(); /* 画面に見えている穴（目打ちの縫い穴・点の目印）の中心。定規で穴の間隔を測れるように */
  magnetGuide = [...magnet.guide, ...loops, ...holeCenters].filter(c => { const k = c.x.toFixed(5) + ',' + c.y.toFixed(5); return seen.has(k) ? false : (seen.add(k), true); });
  junctions = $('showJunctions').checked ? classifyJunctions(shapes) : { joined: [], loose: [] };
  gaps = findGaps(shapes.filter(s => !s.holeLink)); gapAlert = null; gridPreview = null;
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
/** 選んでいる図形（見えない補助の線 holeLink は除く）と選んだ菱目を囲む枠 { minX, minY, maxX, maxY }。何も選んでいなければ null（画面下に「幅 × 高さ」を出す・事業主の希望 2026-10-20）。 */
function selectedSizeBox() {
  let b = null; const grow = (x0, y0, x1, y1) => { if (![x0, y0, x1, y1].every(Number.isFinite)) return; b = b ? { minX: Math.min(b.minX, x0), minY: Math.min(b.minY, y0), maxX: Math.max(b.maxX, x1), maxY: Math.max(b.maxY, y1) } : { minX: x0, minY: y0, maxX: x1, maxY: y1 }; };
  for (const s of doc.shapes) if (selected.has(s.id) && !s.holeLink) { try { const e = bboxOf(s); if (e) grow(e.minX, e.minY, e.maxX, e.maxY); } catch { /* 数えられない図形は飛ばす */ } }
  for (const h of doc.holes) if (selected.has(h.id)) grow(h.x, h.y, h.x, h.y);
  return b;
}
function selectedLineHoleStats() {
  const lines = doc.shapes.filter(s => selected.has(s.id) && stitchable(s) && editable(s)), withLen = [];
  if (!lines.length || lines.length > 60) return null;
  let len = 0; for (const s of lines) { let l = NaN; try { l = arcLength(s); } catch { l = NaN; } if (Number.isFinite(l)) { len += l; withLen.push(s); } }
  if (!withLen.length) return null;
  const nearLine = nearShapeFn(withLen, 0.3, distTo), holes = doc.holes.filter(h => holeVisible(h) && nearLine(h)).length;
  return { len, holes };
}
/** 左の「情報」パネル：選んだ図形の「線の色」「線種」「レイヤー」だけ（事業主 2026-10-26「欲しいのは線の色とレイヤーと線種の編集のみ」・状態／図面／案内／数値の欄は不要）。
 *  右列の「情報」カード（座標・長さ・文字・穴など）の同じ3つの欄と、値・表示を写し合うだけで、変える処理は applyInfo のまま（1つ選んだとき・複数選んだとき・元に戻す1回、どれも同じ）。
 *  選んだものが無いときは、パネルごと隠す。スマホ幅は、左の列が出ないので、右列（下の引き出し）のカードで直す。 */
const PROP_FIELDS = ['color', 'lineStyle', 'layer'];
const propMixed = { color: false, lineStyle: false, layer: false };   /* 2つ以上選んだ図形で、値がばらばらの欄（左の欄に「(複数)」と出す） */
function syncPropPanel() {
  const panel = $('infoPanel'); if (!panel) return;
  let any = false;
  for (const f of PROP_FIELDS) {
    const src = $('info-' + f), row = $('pl-' + f), mine = $('prop-' + f), orig = $('l-' + f); if (!src || !row || !mine || !orig) continue;
    const show = !orig.hidden && $('infoCard').style.display !== 'none'; row.hidden = !show;
    if (show) { any = true; const v = propMixed[f] ? '__mixed' : src.value; if (mine.value !== v) mine.value = v; }
  }
  panel.hidden = !any; if (panel.hidden) closeColorPick(); syncColorPick();
}
/** 左の欄で選んだ値を、右列の同じ欄へ写して、図形に反映する（欄の change も、色の一覧の選択も、ここを通る）。選び終えたら、図面へフォーカスを戻す（選択リストにフォーカスが残ると、Ctrl+C・Delete が効かない）。 */
function applyPropField(f) { const src = $('info-' + f); src.value = $('prop-' + f).value; applyInfo(f); canvas.focus?.(); }
function initPropPanel() {
  for (const f of PROP_FIELDS) $('prop-' + f)?.addEventListener('change', () => applyPropField(f));
  initColorPick(); syncPropPanel();
}
/** 「線の色」の欄：文字だけでなく、色の四角つきの一覧にする（事業主 2026-10-27「線の色を文字だけではなく直観でわかりやすく色も載せて」）。
 *  本体は、いままでの選択欄（prop-color）のまま（値・変える処理・テストは同じ）で、見えないようにして、その上に「色の四角＋名前」のボタンと一覧を重ねる。
 *  四角の色は、図面で線を描く色（SHAPE_DRAW_COLOR）と同じ。「既定」（層の色）は斜線、複数の色が混ざっているときは多色の四角。 */
const colorPick = { btn: null, list: null, open: false };
/** 一覧に出す項目（選択欄の選択肢と、いまの値から）。「（複数）」は選べる項目には出さない。 */
function colorPickItems(options, value) { return options.filter(o => o.value !== '__mixed').map(o => ({ value: o.value, label: o.label, swatch: o.value === '' ? 'default' : (SHAPE_DRAW_COLOR[o.value] || 'default'), selected: o.value === value })); }
function colorSwatch(swatch) { const s = document.createElement('span'); s.className = 'sw' + (swatch === 'default' ? ' sw-default' : swatch === 'mixed' ? ' sw-mixed' : ''); if (swatch.startsWith('#')) s.style.background = swatch; return s; }
function closeColorPick() { if (!colorPick.list) return; colorPick.list.hidden = true; colorPick.open = false; colorPick.btn.setAttribute('aria-expanded', 'false'); }
function syncColorPick() {
  const sel = $('prop-color'), { btn, list } = colorPick; if (!sel?.options || !btn || !list) return;
  const opts = [...sel.options].map(o => ({ value: o.value, label: o.textContent })), cur = opts.find(o => o.value === sel.value) || opts[0];
  btn.textContent = ''; btn.appendChild(colorSwatch(sel.value === '__mixed' ? 'mixed' : sel.value === '' ? 'default' : (SHAPE_DRAW_COLOR[sel.value] || 'default')));
  const label = document.createElement('span'); label.textContent = cur?.label || ''; btn.appendChild(label);
  list.textContent = '';
  for (const it of colorPickItems(opts, sel.value)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cpick-opt'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(it.selected)); b.dataset.value = it.value;
    const lab = document.createElement('span'); lab.textContent = it.label; b.appendChild(colorSwatch(it.swatch)); b.appendChild(lab);
    b.onclick = () => { closeColorPick(); sel.value = it.value; applyPropField('color'); }; list.appendChild(b);
  }
}
function openColorPick() {
  const { btn, list } = colorPick; if (!list) return; syncColorPick(); list.hidden = false; colorPick.open = true; btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(), h = list.offsetHeight || 190, below = (globalThis.innerHeight || 800) - r.bottom, up = below < h + 8 && r.top > below;   /* 下に収まらなければ上へ開く（左の列は画面の下にあるため、ふつうは上） */
  list.style.left = Math.round(r.left) + 'px'; list.style.width = Math.round(r.width) + 'px'; list.style.top = (up ? Math.max(4, Math.round(r.top - h - 4)) : Math.round(r.bottom + 4)) + 'px';
  list.querySelector('[aria-selected="true"]')?.focus?.();
}
function initColorPick() {
  const sel = $('prop-color'), row = $('pl-color'); if (!sel?.options || !row?.appendChild || typeof document.createElement !== 'function') return;
  const btn = document.createElement('button'), list = document.createElement('div');
  btn.type = 'button'; btn.id = 'colorPickBtn'; btn.className = 'cpick-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  list.id = 'colorPickList'; list.className = 'cpick-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
  row.appendChild(btn); row.appendChild(list); row.classList?.add('cpick-on'); colorPick.btn = btn; colorPick.list = list;
  btn.onclick = e => { e?.preventDefault?.(); if (colorPick.open) closeColorPick(); else openColorPick(); };
  btn.addEventListener?.('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); openColorPick(); } });
  list.addEventListener?.('keydown', e => {
    const items = [...list.querySelectorAll('.cpick-opt')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeColorPick(); btn.focus?.(); } else if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus?.(); } else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)]?.focus?.(); }
  });
  document.addEventListener?.('pointerdown', e => { if (colorPick.open && !row.contains?.(e.target)) closeColorPick(); });   /* 一覧の外を押したら閉じる */
}
function updateUI() {
  scheduleSideMenu(); renderFoldFlow(); refreshLaminateParts(); if ($('lamSubCard').open) renderLaminateNow();   /* 検証カードを開いているあいだは、図形を直すたびに、いまの全長も最新にする */
  $('undo').disabled = !undo.length; $('redo').disabled = !redo.length;
  $('delete').disabled = !selected.size; $('symCheck').disabled = !selected.size;
  for (const id of ['copy', 'mirrorX', 'mirrorY', 'rotate', 'scaleOpen', 'attachLeft']) $(id).disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s));
  { const mt = document.querySelector?.('button[data-tool="mirror"]'); if (mt) mt.disabled = mode !== 'mirror' && !doc.shapes.some(s => selected.has(s.id) && editable(s)); }   /* 線対称は選んだ図形に作用する操作（選択中の並び）。何も選んでいないと押せない（作図中の線対称モードは続けられる） */
  $('delHoles').disabled = !(affectedHoles().length || (selected.size && doc.holes.length));   /* 線の上の穴は、押したときに数える（描くたびに全穴×選択を測らない） */ $('checkHoles').disabled = !affectedHoles().length; $('flipHoleSlant').disabled = !selected.size; $('slantFlipNow').disabled = !selected.size; refreshGapCount();
  $('unroll').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && stitchable(s));
  $('mergeLines').disabled = !selectedShapeIds().size; $('selOutline').disabled = !selectedShapeIds().size; $('selDedupe').disabled = !selectedShapeIds().size; $('splitLines').disabled = !selectedShapeIds().size; $('offsetSel').disabled = !selectedShapeIds().size; $('closeGaps').disabled = !selectedShapeIds().size; $('group').disabled = selectedShapeIds().size < 2; $('ungroup').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && (groupIdOf(s) || s.type === 'polyline')); /* グループの解除、または矩形・折れ線の分解 */
  $('toPath').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && ['line','bezier','polyline'].includes(s.type));
  syncGridSettingsToSelection();   /* 格子のパッチの線・枠を選んだら、その格子の設定を欄に出す */
  $('count').textContent = t('count', { shapes: doc.shapes.filter(s => !s.holeLink).length, selected: doc.shapes.filter(s => !s.holeLink && selected.has(s.id)).length + doc.holes.filter(h => selected.has(h.id)).length }) + (b => b && (b.maxX - b.minX > 1e-9 || b.maxY - b.minY > 1e-9) ? t('countSize', { w: (b.maxX - b.minX).toFixed(2), h: (b.maxY - b.minY).toFixed(2) }) : '')(selectedSizeBox()) + (st => st ? t('countLine', { len: st.len.toFixed(2), holes: st.holes }) : '')(selectedLineHoleStats()) + selectedLayerText(); /* 見えない補助の線（holeLink）は数えない。選択数はこれまで通り（図形＋穴） */
  markSelectedLayers();   /* 選んだ図形が入っている層の行に目印 */
  $('status').textContent = t('status', { x: cursor.x.toFixed(2), y: cursor.y.toFixed(2), zoom: (scale / 4 * 100).toFixed(0) }) + (Math.abs(scale - actualScale()) < 0.005 ? t('actualMark') : '');
  const th = threadEstimate(doc); $('threadInfo').textContent = th.paths ? t('threadInfo', { m: (th.mm / 1000).toFixed(2), n: th.paths }) : t('threadNone');
  refreshInfo(); refreshHoleShapeCard(); refreshTextFontCard(); refreshHwEdit(); refreshMoveCard(); refreshScaleCard(); refreshVertexCard(); refreshAlignCard(); refreshArrayCard(); refreshCalcCard(); refreshRectEdit(); refreshRotateBar(); refreshOffsetSelBar();
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
/** 回転の確定中（transformSelected(fn, { rotates: true })）だけ true。回すと水平・垂直の寸法も向きが変わるので、「傾けない」（水平・垂直へ戻す）を使わず、図形といっしょに回して追従させる（事業主の指摘 2026-10-20「寸法線入りの図を回転させたら寸法表記がおかしい」：以前は回した寸法の端が水平・垂直へ引き戻されて、長さが縮んでいた）。 */
let dimRotating = false;
function syncDimensions(before) {
  for (const d of doc.shapes) {
    if (d.type !== 'dimension' || d.foldSec) continue; const old = d.fresh ? undefined : before.get(d.id), cur = [{ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }]; delete d.fresh;   /* fresh＝平面図・展開図が作りなおしで作ったばかりの寸法：同じ番号だった前の寸法の位置・向きと比べない（番号が使い回されて、縦の寸法が横に「まっすぐにされ」つぶれた） */
    const moved = !old || Math.abs(old[0] - d.x1) > 1e-9 || Math.abs(old[1] - d.y1) > 1e-9 || Math.abs(old[2] - d.x2) > 1e-9 || Math.abs(old[3] - d.y2) > 1e-9;
    if (d.anchors) {
      const tgt = d.anchors.map(a => a ? dimPointOf(a) : null);
      if (moved) { if (!d.anchors.every((a, i) => !a || (tgt[i] && Math.hypot(tgt[i].x - cur[i].x, tgt[i].y - cur[i].y) < DIM_NEAR))) delete d.anchors; } /* 寸法そのものが動いた：図形といっしょでなければ、外す */
      else { d.anchors = d.anchors.map((a, i) => a && tgt[i] ? a : null); [[0, 'x1', 'y1'], [1, 'x2', 'y2']].forEach(([i, kx, ky]) => { if (d.anchors[i] && tgt[i] && Math.hypot(tgt[i].x - d[kx], tgt[i].y - d[ky]) > 1e-4) { d[kx] = tgt[i].x; d[ky] = tgt[i].y; } }); /* 0.0001mm 未満の差は追従させない（意味のない変更で、元に戻すの履歴を増やさない） */ if (!d.anchors.some(Boolean)) delete d.anchors; }
    }
    if (!d.anchors) { const an = cur.map(dimAnchorFor); if (an.some(Boolean)) d.anchors = an; }
    const oldPts = old ? [{ x: old[0], y: old[1] }, { x: old[2], y: old[3] }] : null, now = [{ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }], axis = (oldPts && dimAxisOf(oldPts[0], oldPts[1])) || dimAxisOf(now[0], now[1]);
    if (axis && !dimRotating) { const [p, q] = dimStraighten(now, axis, oldPts, (d.anchors || []).map(Boolean)); if (p.x !== d.x1 || p.y !== d.y1 || q.x !== d.x2 || q.y !== d.y2) { d.x1 = p.x; d.y1 = p.y; d.x2 = q.x; d.y2 = q.y; } } /* 傾けない */
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
/** 塗り fl の中の点（穴の外）を、塗りの外形を格子に区切って探し、いま、そこを囲んでいる場所を返す。面積が元の 0.3〜3.5 倍の場所だけ（別の大きな場所に飛ばない）。見つからなければ null。 */
/** 塗りを取り直すのに使える時間の上限（ms・1回の編集あたり）。事業主 2026-10-25「断面を生成したらフリーズした」（図面の塗り25か所のうち7か所が探索に回り、囲まれた場所を204回探して約33秒かかった）→ 探す点は中心から9つまで・小さな塗りは近くの範囲だけ・全体で上限を超えたら残りは取り直さず「取り直せなかった」と案内する。 */
let fillProbeBudgetMs = 2500;   /* 数字を止めたあとの1回（断面と平面図の塗りをまとめて取り直す）に足りる時間 */
const FILL_PROBE_MAX = 9;   /* 探す点の数（塗りの中の点を、外接の四角の10等分の格子から、まんべんなく9つ） */
function fillRegionByProbe(fl, deadline = Infinity) {
  const xs = fl.points.map(q => q.x), ys = fl.points.map(q => q.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), shapes = regionShapes();
  const opts = Math.max(x1 - x0, y1 - y0) < 60 ? { windows: [120] } : undefined;   /* 小さな塗りは、近くの範囲だけ探せばよい（遠くまで探すと1回が数百msかかる） */
  const inside = []; for (let i = 1; i <= 9; i++) for (let j = 1; j <= 9; j++) { const q = { x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * j / 10 }; if (fillContains(fl, q)) inside.push(q); }   /* 抜き（穴）の中の点は使わない */
  const step = Math.max(1, Math.floor(inside.length / FILL_PROBE_MAX));
  for (const q of inside.filter((_, k) => k % step === 0).slice(0, FILL_PROBE_MAX)) { if (Date.now() > deadline) return null; const r = enclosedAreaAt(shapes, q, opts); if (r && r.area >= (fl.area || 0) * 0.3 && r.area <= (fl.area || r.area) * 3.5) return r; }
  return null;
}
/** 同じ図形の組み合わせで囲まれた場所が複数あるとき（例：リングの輪が台座で上下2つに分かれる）、塗りの元の位置にいちばん近い場所を選ぶ。同じ取り直しの中で、すでに別の塗りが取った場所は後回し（2つの塗りが同じ場所に重ならないように）。
 *  事業主 2026-10-25「金具と色がずれています」（不具合記録 08:41の図面：リングの位置を変えると、下の輪の塗りが、上の輪と同じ場所へ移って重なった）。 */
const bboxCenterOf = pts => { const xs = pts.map(q => q.x), ys = pts.map(q => q.y); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; };
const regionKeyOf = r => r.area.toFixed(1) + ':' + r.points[0].x.toFixed(1) + ',' + r.points[0].y.toFixed(1);
function pickNearestRegion(cands, fl, used) {
  if (!cands.length) return null; if (cands.length === 1) { used.add(regionKeyOf(cands[0])); return cands[0]; }
  const c0 = bboxCenterOf(fl.points), dist = r => { const c = bboxCenterOf(r.points); return Math.hypot(c.x - c0.x, c.y - c0.y); };
  const sorted = [...cands].sort((a, b) => dist(a) - dist(b)), r = sorted.find(x => !used.has(regionKeyOf(x))) || sorted[0]; used.add(regionKeyOf(r)); return r;
}
/** 前の形（fillGeomSig）と今の形が、位置だけが同じ量ずれたものなら、そのずれ { dx, dy }。半径・角度・点の数・閉じているかが変わっていれば null（形が変わった）。 */
function geomShift(oldSig, newSig) {
  let a, b; try { a = JSON.parse(oldSig); b = JSON.parse(newSig); } catch { return null; }
  let dx = null, dy = null, ok = true;
  const put = (axis, u, v) => {
    if (!Number.isFinite(u) || !Number.isFinite(v)) { ok = ok && u === v; return; }
    const d = v - u; if (axis === 'x') { if (dx === null) dx = d; else if (Math.abs(dx - d) > 1e-4) ok = false; } else if (dy === null) dy = d; else if (Math.abs(dy - d) > 1e-4) ok = false;
  };
  FILL_GEOM_KEYS.forEach((k, i) => {
    const u = a[i], v = b[i]; if (!ok) return;
    if (k === 'points') { if (!Array.isArray(u) || !Array.isArray(v)) { ok = JSON.stringify(u) === JSON.stringify(v); return; } if (u.length !== v.length) { ok = false; return; } u.forEach((p, j) => { put('x', p.x, v[j].x); put('y', p.y, v[j].y); }); }
    else if (k === 'nodes') ok = JSON.stringify(u) === JSON.stringify(v);   /* ベジェの節は、形が変わったものとして探し直す */
    else if (/^(cx|x1|x2|c1x|c2x)$/.test(k)) put('x', u, v);
    else if (/^(cy|y1|y2|c1y|c2y)$/.test(k)) put('y', u, v);
    else ok = JSON.stringify(u) === JSON.stringify(v);
  });
  return ok && dx !== null && dy !== null ? { dx, dy } : null;
}
/** 塗りの外形の長さのうち、囲んでいる図形（shapes）の上に乗っている割合（0〜1）。 */
function fillOnShapes(fl, shapes) {
  let on = 0, tot = 0;
  for (const ring of [fl.points, ...(fl.holes || [])]) for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length], len = Math.hypot(q.x - p.x, q.y - p.y), mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; tot += len; if (shapes.some(sh => distTo(sh, mid) < 0.6)) on += len; }
  return tot > 0 ? on / tot : 0;
}
/** 領域の塗りの穴（抜き）の輪で、いまの図形の上に乗っていない（取り残された）ものを、いまのスロットなどの輪郭に合わせ直す。戻り値＝直した輪の数。外形（points）・図形の一覧（ids）は変えない。
 *  事業主 2026-10-26「透明にした穴がずれている」「透明に塗れない」：革の質感の塗りの穴の輪は、元の図形（スロットの輪郭）を覚えていない（fl.ids は外形の図形だけ）ので、スロットを動かすと輪だけ取り残された（実図面：+10mm・+2mm）。
 *  調べる輪は、塗りごとに、輪のまわり（0.8mm）にある図形だけ。輪の辺の長さの半分以上が図形の上に乗っていなければ「取り残された」。直し先は、その塗りの外形の図形から取り直した場所の穴のうち、大きさが近く（±15%）、まだ使われていないもの。 */
function repairFillRings() {
  const fills = doc.fills || []; if (!fills.some(f => !f.clear && (f.holes || []).length)) return 0;
  let shapes = null, bbs = null, fixed = 0; const bbOf = pts => { const xs = pts.map(q => q.x), ys = pts.map(q => q.y); return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }; };
  const near = ring => { const b = bbOf(ring), e = 0.8; return shapes.filter(sh => { const q = bbs.get(sh.id); return q && q.maxX >= b.minX - e && q.minX <= b.maxX + e && q.maxY >= b.minY - e && q.minY <= b.maxY + e; }); };
  const out = fills.map(fl => {
    if (fl.clear || !(fl.holes || []).length) return fl;
    if (!shapes) { shapes = regionShapes(); bbs = new Map(shapes.map(sh => { try { return [sh.id, bboxOf(sh)]; } catch { return [sh.id, null]; } })); }
    const stale = fl.holes.map(h => fillOnShapes({ points: h, holes: [] }, near(h)) < 0.5); if (!stale.some(Boolean)) return fl;
    const live = (fl.ids || []).filter(id => doc.shapes.some(sh => sh.id === id)); if (!live.length) return fl;
    const cands = enclosedAreasAround(shapes, new Set(live)).filter(r => live.filter(id => r.ids.includes(id)).length >= Math.max(1, live.length - 2)), r = pickNearestRegion(cands, fl, new Set());
    if (!r || !(r.holes || []).length) return fl;
    const sameRing = (u, v) => { const a = bbOf(u), b = bbOf(v); return [a.minX - b.minX, a.maxX - b.maxX, a.minY - b.minY, a.maxY - b.maxY].every(d => Math.abs(d) < 0.3); };
    const free = r.holes.filter(h => !fl.holes.some((k, i) => !stale[i] && sameRing(h, k))), rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) });
    let changed = 0; const holes = fl.holes.map((h, i) => {
      if (!stale[i]) return h; const a = bbOf(h), w = a.maxX - a.minX, ht = a.maxY - a.minY, cx = (a.minX + a.maxX) / 2, cy = (a.minY + a.maxY) / 2;
      let best = -1, bd = Infinity; free.forEach((c, j) => { if (!c) return; const b = bbOf(c), cw = b.maxX - b.minX, ch = b.maxY - b.minY; if (Math.abs(cw - w) > 0.15 * Math.max(w, 1e-6) || Math.abs(ch - ht) > 0.15 * Math.max(ht, 1e-6)) return; const d = Math.hypot((b.minX + b.maxX) / 2 - cx, (b.minY + b.maxY) / 2 - cy); if (d < bd) { bd = d; best = j; } });
      if (best < 0) return h; const to = free[best]; free[best] = null; changed++; return to.map(rd);
    });
    if (!changed) return fl; fixed += changed; return { ...fl, holes };
  });
  if (fixed) doc.fills = out; return fixed;
}
const ringRepairedDocs = new WeakSet();   /* 取り残された穴の輪を直した（調べた）図面。図面ごとに、最初の描画で1回だけ調べる（開いたとき・前回の続き・タブの切り替え） */
function ensureFillRingsRepaired() { if (exporting || ringRepairedDocs.has(doc)) return; ringRepairedDocs.add(doc); try { repairFillRings(); } catch { /* 直せなくても、描くのは続ける */ } }
function refollowFills(snap) {
  if (!snap || !(doc.fills || []).length) return 0;
  const byId = new Map(doc.shapes.map(sh => [sh.id, sh])), deadline = Date.now() + fillProbeBudgetMs, used = new Set(); let stale = 0, shapes = null;
  doc.fills = doc.fills.map(fl => {
    const ids = fl.ids || []; if (!ids.length || !ids.every(id => byId.has(id) && snap.geom.has(id))) return fl;
    if (ids.every(id => fillGeomSig(byId.get(id)) === snap.geom.get(id))) return fl;
    if (JSON.stringify(fl.points) !== snap.pts.get(fl.id)) return fl;
    { const sh = ids.map(id => geomShift(snap.geom.get(id), fillGeomSig(byId.get(id))));   /* 囲んでいる図形が、ぜんぶ同じ量だけ動いただけなら、探さずに、塗りも同じだけ動かす（断面のリングなど・速く、ぴったり）。動かした外形が図形の上に乗っていなければ（ほかの図形に区切られていたなど）、探し直す */
      if (sh.every(Boolean) && sh.every(x => Math.abs(x.dx - sh[0].dx) < 1e-4 && Math.abs(x.dy - sh[0].dy) < 1e-4)) {
        const { dx, dy } = sh[0], mv = q => ({ x: +(q.x + dx).toFixed(2), y: +(q.y + dy).toFixed(2) }), moved = { ...fl, points: fl.points.map(mv), holes: (fl.holes || []).map(h => h.map(mv)) };
        if (fillOnShapes(moved, ids.map(id => byId.get(id))) >= 0.9) return moved;
      } }
    if (Date.now() > deadline) { stale++; return fl; }   /* 時間の上限：残りの塗りは取り直さない（案内は commit が出す） */
    shapes ??= regionShapes(); const want = new Set(ids);
    let r = pickNearestRegion(enclosedAreasAround(shapes, want).filter(x => x.ids.length === want.size && x.ids.every(id => want.has(id))), fl, used);
    if (!r) r = fillRegionByProbe(fl, deadline);   /* 同じ図形の組み合わせでは見つからないとき：塗りの中の点（今も同じ場所の内側）を目印に、いまそこを囲んでいる場所を取り直す（取り残される図形が動いて、囲みが変わっても、色は場所についてくる） */
    if (!r) { stale++; return fl; }
    if (!r.ids.every(id => want.has(id)) || r.ids.length !== want.size) { const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) }); return { ...fl, ids: r.ids, points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), area: Math.round(r.area * 10) / 10 }; }
    const rd = q => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2) });
    return { ...fl, points: r.points.map(rd), holes: r.holes.map(h => h.map(rd)), area: Math.round(r.area * 10) / 10 };
  });
  return stale;
}
/** 断面図の情報（doc.foldSections）のうち、図形が1つも残っていないものを消す。断面図の図形を選んで削除すると、情報だけが残って、寸法（全幅・全高・厚み）と取っ手が画面に残り続けた（不具合記録 2026-10-22：三つ折り断面図を消せない）。 */
function pruneFoldSections() {
  const meta = doc.foldSections; if (!meta) return;
  for (const id of Object.keys(meta)) if (!doc.shapes.some(s => s.foldSec === id)) delete meta[id];
}
/** 数字を変えている最中（取っ手のドラッグ・欄の入力）は、塗りの取り直しを後回しにし、止まってから1回だけ行う（事業主 2026-10-25「寸法を変更しようと図形を動かしたら新しい断面図ができてフリーズした」「寸法調整したら図形がぐちゃぐちゃになる」：1回ごとに塗りを探し直して数秒かかっていた）。
 *  後回しの間は、領域の塗りだけを一時的に隠す（古い位置に取り残された色が見えないように・visibleFills）。比べる元は、最初の変更の前の状態。元に戻す・別の図面への切り替えで図面が替わったときは、捨てる。 */
let deferFillFollow = 0, pendingFillFollow = null, fillSettleTimer = null;
function settleFillFollow() {
  clearTimeout(fillSettleTimer); fillSettleTimer = null; const p = pendingFillFollow; pendingFillFollow = null;
  if (p && p.doc === doc) { const stale = refollowFills(p.snap); scheduleAutosave(); if (stale) $('hint').textContent = ($('hint').textContent ? $('hint').textContent + ' ' : '') + t('fillNotFollowed', { n: stale }); }
  draw();
}
/** 図面を変えたあとの、領域の塗りの追従（commit と、続けて数字を変える間の designCommit の両方から）。
 *  数字を変えている最中（deferFillFollow）は後回しにし、止まって0.35秒後に1回だけ取り直す（比べる元は最初の変更の前）。
 *  後回し中の塗りがあるときに、後回しでない変更が入っても（数字を変えた0.24秒後の平面図の作りなおしなど）、その元と比べて取り直す。
 *  事業主 2026-10-25「断面図全幅を修正してもリングとリフィルが追従しない」：以前は、そのあとの変更が入ると「取り直さない」ことにしていたので、断面の塗りだけが取り残された。 */
function followFillsAfter(fillSnap) {
  if (deferFillFollow > 0) { if (!pendingFillFollow || pendingFillFollow.doc !== doc) pendingFillFollow = { doc, snap: fillSnap }; clearTimeout(fillSettleTimer); fillSettleTimer = setTimeout(settleFillFollow, 350); return 0; }   /* 止まって0.35秒後に1回だけ塗りを取り直す */
  const pend = pendingFillFollow && pendingFillFollow.doc === doc ? pendingFillFollow : null, stale = refollowFills(pend ? pend.snap : fillSnap);
  if (pend) { clearTimeout(fillSettleTimer); fillSettleTimer = null; pendingFillFollow = null; }
  return stale;
}
function commit(fn) {
  ownPathsCache = null; openGapMarks = [];   /* 編集したら、開いた直後の歯抜けの印は消す */
  const before = JSON.stringify(doc), dimBefore = new Map(doc.shapes.filter(s => s.type === 'dimension').map(s => [s.id, [s.x1, s.y1, s.x2, s.y2]])), fillSnap = fillSnapshot();
  fn(); pruneFoldSections(); { const live = new Set(doc.shapes.map(s => s.id)); for (const p of doc.parts) if (p.shapeIds.some(id => !live.has(id))) p.shapeIds = p.shapeIds.filter(id => live.has(id)); }   /* 部品が、消えた図形を指したままにしない（図面が検査に通らなくなる） */
  const staleFills = followFillsAfter(fillSnap); if (staleFills) setTimeout(() => { $('hint').textContent = ($('hint').textContent ? $('hint').textContent + ' ' : '') + t('fillNotFollowed', { n: staleFills }); }, 0);   /* 囲んでいる図形の形が変わったら、領域の塗りも取り直す */
  const dupHoles = dedupeHoles(); syncMarkLines(); syncDimensions(dimBefore); if (dupHoles) setTimeout(() => { $('hint').textContent = ($('hint').textContent ? $('hint').textContent + ' ' : '') + t('holeDedupe', { n: dupHoles }); }, 0);
  if (before !== JSON.stringify(doc)) { commitSeq++; undo.push(before); if (undo.length > 100) undo.shift(); redo = []; rebuildSnaps(); if (view3d) render3d(); if (tabs[activeTab] && !tabs[activeTab].dirty) { tabs[activeTab].dirty = true; renderTabs(); } }
  scheduleAutosave();
  draw();
}
function cancel() { komaSeamPicking = false; pasteGhost = null; stitchTab = 0; hideRoundHoleBar(); snapAlign = null; countStage = null; attachState = null; clearStitchPreview(); closeRotateBar(); closeOffsetSelBar(); ruler = null; gesture = null; stage = null; snap = null; offsetSelection = null; detourState = null; gridPreview = null; $('offsetFloat').hidden = true; }
/** 柄（パッチワーク）のカードを「窓」にする／戻す（事業主指示 2026-10-21「パッチワークを選択したらスクリーン右メニューではなくて窓を出してほしい」・右メニュー＝右列）。DOM は動かさない（欄の ID・処理はそのまま）で、CSS（#patchCard[data-win="1"]）で画面の上に浮かせる。状態は dataset.win。窓を閉じても位置は覚えておく。 */
function setPatchWin(on) { setCardWin('patchCard', on); }
/** レイヤーの窓を開く（見出しをつかんで動かせる・×で閉じる）。図面は触れたまま。 */
function openLayerWin() { renderLayers(); setCardWin('layerCard', true); $('hint').textContent = t('layerCtxOpened'); }
/** 右列のカードを「窓」にする／戻す（柄の窓と同じ仕組みを、目打ち・目印（目打ちカード）・拡大縮小・移動にも広げた：事業主指示 2026-10-21「数字が右列のカードにある道具も窓にして」）。
 *  on＝窓にする／しない。openAfter＝窓をやめたとき、右列のカードを開いたままにするか（柄・目打ちは閉じる／拡大縮小・移動は、いつも開いている）。拡大縮小と移動の窓は、同時には出さない（片方を出すと、もう片方は右列へ戻る）。 */
function setCardWin(id, on, openAfter = false) {
  const c = $(id); if (on) { c.dataset.win = '1'; const other = id === 'scaleCard' ? 'moveCard' : id === 'moveCard' ? 'scaleCard' : null; if (other && $(other).dataset.win === '1') setCardWin(other, false, true); } else delete c.dataset.win;
  c.open = on || openAfter; if (on) keepCardWinInView(id);
}
/** 窓を (left, top) に置く：画面の中へ収め、下端がはみ出さないよう高さを詰める（中身はスクロール）。右基準をやめて左上基準にする。 */
function placeCardWin(id, left, top, width) {
  const st = $(id).style, vw = typeof innerWidth === 'number' ? innerWidth : 1e9, vh = typeof innerHeight === 'number' ? innerHeight : 1e9;
  const y = Math.round(Math.min(Math.max(0, top), Math.max(0, vh - 120)));
  st.left = Math.round(Math.min(Math.max(0, left), Math.max(0, vw - width))) + 'px'; st.top = y + 'px'; st.right = 'auto'; st.maxHeight = Math.max(120, vh - y - 8) + 'px';
}
/** 覚えている窓の位置が、画面を小さくしたあとで外へはみ出していたら、中へ戻す（一度も動かしていなければ、CSS の初期位置のまま）。 */
function keepCardWinInView(id) {
  const c = $(id); if (!c.style.left) return;
  placeCardWin(id, parseFloat(c.style.left) || 0, parseFloat(c.style.top) || 0, c.getBoundingClientRect().width);
}
function placePatchWin(left, top, width) { placeCardWin('patchCard', left, top, width); }
function keepPatchWinInView() { keepCardWinInView('patchCard'); }
/** 左のツールに合わせて右のカードを出し入れする：目打ち・目印＝目打ちカード。ほかのツールでは閉じる。柄は右列でなく窓（setPatchWin）。 */
function syncToolCards() {
  if ($('foldHandleBar') && !$('foldHandleBar').hidden && !foldHandleList().length && !secDimsShown()) closeFoldHandleBar();   /* 取っ手が出ていないときは、数字の小窓も閉じる */
  $('rectBar').hidden = mode !== 'rect'; /* 幅・高さの欄は矩形ツールのときだけ */
  $('circleBar').hidden = mode !== 'circle'; /* 半径・直径の欄は円ツールのときだけ */
  $('filletBar').hidden = mode !== 'fillet'; $('chamferBar').hidden = mode !== 'chamfer'; $('divideBar').hidden = mode !== 'divide'; /* 丸めの半径・面取りの寸法の欄は、そのツールのときだけ（事業主指示 2026-10-21） */
  $('l-markDiv').hidden = mode !== 'mark'; $('l-markDist').hidden = mode !== 'mark'; /* 距離で打つ欄は目印ツールのときだけ（目打ちカードの先頭） */
  $('arcBar').hidden = mode !== 'arc'; $('textBar').hidden = mode !== 'text'; $('dimBar').hidden = mode !== 'dimension'; /* 円弧（描き方・向き・半径）・文字の大きさ・寸法のずらしの欄も、そのツールのときだけ上の窓に（事業主指示 2026-10-21） */
  setCardWin('stitchCard', mode === 'stitch' || mode === 'mark'); setPatchWin(mode === 'patchfill'); document.body?.classList?.toggle('patch-focus', mode === 'patchfill');   /* 柄の窓が出ている間は、画面右の列を畳む（事業主指示 2026-10-21「パッチワークの窓が出ているときに画面右のメニューは不要。載せたいなら右クリックメニューに」） */   /* 目打ち・目印（目打ちカード）・柄は、右列でなく窓 */
  if ($('autoDimCard')) $('autoDimCard').open = mode === 'dimension';   /* 寸法ツール→「寸法線を自動で入れる」カード（事業主の希望 2026-10-19「寸法メニューを押すと、右の関連する寸法自動入力カードを出してほしい」） */
  const shown = mode === 'dimension' ? $('autoDimCard') : null; /* 開いたカードが画面外なら見える位置まで寄せる（窓にした柄・目打ち・目印・円弧・文字は寄せない・右列のタブも切り替えない） */
  if (shown) revealCard(shown);   /* ツールに対応するカードの分類のタブへ切り替える（隠れたままだと見えない） */
  if (shown?.scrollIntoView) shown.scrollIntoView({ block: 'nearest' });
}
function setMode(next) {
  if (next === 'patchfill' && !lockGate('patchwork')) return;
  cancel(); manualNext = null; nodeSel = null; mode = next; logOp('tool', { mode }); syncToolCards(); refreshModHelp();
  document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === mode); b.setAttribute('aria-pressed', String(b.dataset.tool === mode)); });
  $('hint').textContent = modeHint(mode); syncKomaBar(); canvas.style.cursor = mode === 'select' ? 'default' : 'crosshair'; resize();
}
function history(from, to, quiet = false) {
  if (!from.length) return; scheduleAutosave();
  to.push(JSON.stringify(doc)); doc = quiet ? JSON.parse(from.pop()) : migrateDoc(JSON.parse(from.pop())); /* 保存した履歴は古い版の図面かもしれないので、版上げしてから戻す */ selected.clear(); cancel(); manualNext = null; nodeSel = null; pairLines = []; refreshTools(); persistTools(); renderLayers(); renderSeams(); if (!quiet) { rebuildSnaps(); draw(); }   /* quiet：作りなおしの途中の取り消し（すぐあとの commit が、当たり判定の作りなおしと再描画をする） */
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
/** 図形を消すとき、その図形で囲まれていた領域の塗りも消す（事業主 2026-10-25「おかしな図形が残っていて消せない」「断面を作るボタンで2つ断面が出てきた」：塗りは図形の番号だけで囲みを覚えているので、図形を消しても塗りが残り、同じ番号の図形が作り直されると、古い塗りが元の位置に幽霊のように現れた）。
 *  keep＝消さずに残る図形（見えない補助の線にして残す線）。消した塗りの数を返す。元に戻すは、消した図形と同じ1回。 */
function dropFillsOf(ids, keep = new Set()) {
  const fills = doc.fills; if (!fills?.length) return 0;   /* 塗りが無い図面には、fills を足さない */
  const kept = fills.filter(f => !(f.ids || []).some(id => ids.has(id) && !keep.has(id))); if (kept.length === fills.length) return 0;
  doc.fills = kept; return fills.length - kept.length;
}
/** 「格子の線だけ消す」の相手（事業主 2026-10-25「裏面はひっくり返して格子のみ削除したい」）：選んだ格子（記録のある格子）のピース。記録が無いとき（コピーした裏面・古い図面）は、選んだ中の、いちばん外側の閉じた実線（外形）の内側にある、閉じた実線（格子のピース）。点線・ガイドの層・見えない補助の線は数えない。 */
function latticePieceIds() {
  const live = new Set(doc.shapes.map(s => s.id)), out = new Set(); if (!selected.size) return out;
  for (const g of gridsTouchedBySelection(false)) for (const id of g.pieceIds) if (live.has(id)) out.add(id);
  if (out.size) return out;
  const sel = selectedShapeIds(), cand = doc.shapes.filter(s => sel.has(s.id) && s.type === 'polyline' && s.closed && !s.holeLink && s.lineStyle !== 'dashed' && s.layer !== 'guide' && s.points?.length >= 3 && visible(s)); if (cand.length < 2) return out;
  const frame = cand.reduce((a, b) => leatherItemArea(b.points) > leatherItemArea(a.points) ? b : a), loop = loopSampler(frame.points), ins = q => insidePolygon(q, frame.points) || loop.nearest(q).dist < 0.05;   /* 縁にのっているピースの頂点も「内側」に数える */
  for (const s of cand) if (s.id !== frame.id && s.points.every(ins)) out.add(s.id);
  return out.size ? out : latticeBySharedEdges(cand);   /* 外形が1本の閉じた線でないとき（線・円弧に分かれた外形。コピーした裏面など）は、辺を共有してつながるピースを格子とみなす */
}
/** 外形の線が1本の閉じた線でない図（直線・円弧に分かれた外形）で、記録の無い格子（コピーした裏面など）のピースを見つける（事業主 2026-10-25「格子線だけ消せない」）。格子のピースは、となりのピースと辺を共有する（端点が 0.01mm 以内で同じ）。辺でつながる3枚以上のかたまりだけを、格子とみなす（別々の部品2枚を選んだだけでは出さない）。 */
function latticeBySharedEdges(cand) {
  const key = p => Math.round(p.x * 100) + ',' + Math.round(p.y * 100), edges = new Map(), adj = new Map(cand.map(s => [s.id, new Set()]));
  for (const s of cand) for (let i = 0; i < s.points.length; i++) { const a = key(s.points[i]), b = key(s.points[(i + 1) % s.points.length]); if (a === b) continue; const k = a < b ? a + '|' + b : b + '|' + a; if (!edges.has(k)) edges.set(k, new Set()); edges.get(k).add(s.id); }
  for (const set of edges.values()) if (set.size > 1) for (const x of set) for (const y of set) if (x !== y) adj.get(x).add(y);
  const out = new Set(), seen = new Set();
  for (const s of cand) { if (seen.has(s.id)) continue; const group = [], stack = [s.id]; seen.add(s.id); while (stack.length) { const id = stack.pop(); group.push(id); for (const n of adj.get(id)) if (!seen.has(n)) { seen.add(n); stack.push(n); } } if (group.length >= 3) for (const id of group) out.add(id); }
  return out;
}
/** 「丸目だけ消す」の相手（事業主 2026-10-25「丸目も消したい」）：選んだ格子（記録のある格子）の丸目＋選んだ閉じた実線の内側（ふちを含む）の丸目＋直接選んだ丸目。菱目は対象にしない。格子の線を先に消したあとでも、外形を選べば見つかる。 */
function latticeRoundHoleIds(want = 'round') {   /* want＝'round'（丸目）／'diamond'（菱目・事業主 2026-10-26「菱目だけ消したい」） */
  const out = new Set(); if (!selected.size) return out;
  const kind = new Map(doc.tools.map(x => [x.id, x.kind])), recPaths = new Set(gridsTouchedBySelection(false).flatMap(g => g.pathIds)), sel = selectedShapeIds();
  const loops = doc.shapes.filter(s => sel.has(s.id) && s.type === 'polyline' && s.closed && !s.holeLink && s.lineStyle !== 'dashed' && s.layer !== 'guide' && s.points?.length >= 3 && visible(s)).map(s => ({ pts: s.points, loop: loopSampler(s.points) }));
  for (const h of doc.holes) if (kind.get(h.toolId) === want && holeEditable(h) && (selected.has(h.id) || recPaths.has(h.pathId) || loops.some(l => insidePolygon(h, l.pts) || l.loop.nearest(h).dist < 0.05))) out.add(h.id);
  return out;
}
/** 格子の線（ピース）・丸目を消す。what＝'lines'（格子の線だけ）／'round'（丸目だけ）／'both'（両方）。外形・点線・菱目・縫い合わせは残す。裏面は、左右反転（今の機能）のあとにこれを使う。対象は消す前にまとめて決め、元に戻すは1回。 */
function removeLatticeLines(what = 'lines') {
  const only = what === 'round' || what === 'diamond', ids = only ? new Set() : latticePieceIds(), hids = what === 'lines' ? new Set() : latticeRoundHoleIds(what === 'diamond' ? 'diamond' : 'round'); if (!ids.size && !hids.size) { $('hint').textContent = t('latticeNone'); return; }
  const holes = doc.holes.length; cancel();
  commit(() => {
    if (hids.size) { doc.holes = doc.holes.filter(h => !hids.has(h.id)); selected = new Set([...selected].filter(id => !hids.has(id))); manualNext = null; }
    if (ids.size) {
    doc.shapes = doc.shapes.filter(s => !ids.has(s.id)); for (const part of doc.parts) part.shapeIds = part.shapeIds.filter(id => !ids.has(id)); dropFillsOf(ids);
    for (const g of doc.grids || []) { g.pieceIds = g.pieceIds.filter(id => !ids.has(id)); g.ids = g.ids.filter(id => !ids.has(id)); } doc.grids = (doc.grids || []).filter(g => g.pieceIds.length);   /* 消した格子の記録は捨てる（作りなおしで、残った穴まで消さないように） */
    selected = new Set([...selected].filter(id => !ids.has(id)));
    }
  });
  $('hint').textContent = what === 'diamond' ? t('latticeDiamondRemoved', { n: hids.size, h: doc.holes.length }) : what === 'round' ? t('latticeRoundRemoved', { n: hids.size, h: doc.holes.length }) : what === 'both' ? t('latticeBothRemoved', { n: ids.size, r: hids.size, h: doc.holes.length }) : t('latticeRemoved', { n: ids.size, h: holes }); draw();
}
function removeSelectedKeepHoles() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  let lines = 0, kept = 0, dropped = 0;
  cancel(); commit(() => {
    const holed = new Set(doc.holes.map(h => h.pathId)), keepPaths = doc.paths.filter(p => holed.has(p.id) && p.shapeIds.some(id => ids.has(id))), keepIds = new Set(keepPaths.flatMap(p => p.shapeIds.filter(id => ids.has(id))));
    const dropPaths = new Set(doc.paths.filter(p => p.shapeIds.some(id => ids.has(id)) && !keepPaths.includes(p)).map(p => p.id));
    lines = ids.size; kept = doc.holes.filter(h => keepPaths.some(p => p.id === h.pathId) && !(selected.has(h.id) && holeEditable(h))).length;
    doc.shapes = doc.shapes.filter(sh => !ids.has(sh.id) || keepIds.has(sh.id)).map(sh => keepIds.has(sh.id) ? { ...sh, holeLink: true } : sh);   /* 穴のある線は、見えない補助の線として残る（経路を保つ） */
    doc.holes = doc.holes.filter(h => !dropPaths.has(h.pathId) && !(selected.has(h.id) && holeEditable(h)));
    doc.paths = doc.paths.filter(p => !dropPaths.has(p.id)); doc.seams = doc.seams.filter(m => !dropPaths.has(m.a.pathId) && !dropPaths.has(m.b.pathId));
    for (const part of doc.parts) part.shapeIds = part.shapeIds.filter(id => !ids.has(id));
    dropped = dropFillsOf(ids, keepIds);
    selected.clear(); manualNext = null;
  }); renderSeams();
  $('hint').textContent = t('holesKept', { n: lines, h: kept }) + (dropped ? ' ' + t('fillsDroppedWithShapes', { n: dropped }) : '');
}
function removeSelected(onlyIds = null, alsoFn = null) {
  const ids = onlyIds || selectedShapeIds(); let dropped = 0;   /* onlyIds：選択（グループを含む）でなく、この図形だけを消す */
  cancel(); commit(() => { const own=ownHolePathIds(doc); for(const p of doc.paths) if(p.grid||p.rim) own.delete(p.id);   /* 格子が作った縫い線・外周の線は、消せば穴も消える */
    const paths=new Set(doc.paths.filter(p=>p.shapeIds.some(id=>ids.has(id))&&!own.has(p.id)).map(p=>p.id)), keepIds=new Set(doc.paths.filter(p=>own.has(p.id)).flatMap(p=>p.shapeIds.filter(id=>ids.has(id)))); /* .lcc から取り込んだ穴など、線とは独立した穴の経路：その線（ガイドなど）を消しても、穴は残す。線は見えない補助の線（holeLink）にして、経路を保つ */ doc.shapes=doc.shapes.filter(s=>!ids.has(s.id)||keepIds.has(s.id)).map(s=>keepIds.has(s.id)?{...s,holeLink:true}:s); doc.holes=doc.holes.filter(h=>!paths.has(h.pathId)&&!(selected.has(h.id)&&holeEditable(h))); doc.paths=doc.paths.filter(p=>!paths.has(p.id)); doc.seams=doc.seams.filter(m=>!paths.has(m.a.pathId)&&!paths.has(m.b.pathId)); for(const part of doc.parts)part.shapeIds=part.shapeIds.filter(id=>!ids.has(id)); dropped=dropFillsOf(ids,keepIds); selected.clear(); manualNext=null; alsoFn?.(); }); renderSeams();
  if (dropped) $('hint').textContent = t('fillsDroppedWithShapes', { n: dropped });
}
/** 「点線で描く」（事業主 2026-10-25「直接点線が引きたい」→ 案A）：オンの間、作図の道具（直線・矩形・円・円弧・ベジェ・ペン）で描く図形は、点線になる。描いたあとに線種を変える手間をなくす。画面だけの状態で、図面には保存しない（もう一度押すか、ページを開き直すと実線）。 */
let drawDashed = false;
const DASH_DRAW_MODES = ['line', 'rect', 'circle', 'arc', 'bezier', 'path', 'polyline'];
function toggleDrawDashed() { drawDashed = !drawDashed; const b = $('drawDashed'); b.classList?.toggle?.('active', drawDashed); b.setAttribute?.('aria-pressed', String(drawDashed)); $('hint').textContent = t(drawDashed ? 'drawDashedOn' : 'drawDashedOff'); }
function addShape(shape) {
  const layer = doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked) || doc.layers.find(l => l.visible && !l.locked);
  if (!layer) { $('hint').textContent = t('noLayer'); cancel(); return; }
  if (layer.id !== activeLayer) $('hint').textContent = t('drawnOnLayer', { name: layer.name });
  let id = 's1', n = 1;
  const ids = new Set(doc.shapes.map(s => s.id)); while (ids.has(id)) id = `s${++n}`;
  const { layer: wanted, ...rest } = shape; let target = wanted && doc.layers.some(l => l.id === wanted && l.visible && !l.locked) ? wanted : layer.id; // 呼び元の layer はロック・非表示でなければ尊重
  if ((rest.type === 'text' || rest.type === 'dimension') && doc.layers.some(l => l.id === 'guide' && l.visible && !l.locked)) target = 'guide'; /* 基本方針：文字・寸法線はガイド、実線は型紙 */
  const dashed = (target === 'guide' || (drawDashed && DASH_DRAW_MODES.includes(mode))) && ['line', 'circle', 'arc', 'bezier', 'polyline', 'path'].includes(rest.type) && !rest.lineStyle ? { lineStyle: 'dashed' } : {}; /* ガイドの層に描く線は、自動で点線。「点線で描く」がオンの間は、作図の道具で描く線も点線 */
  commit(() => { doc.shapes.push({ id, layer: target, ...dashed, ...rest }); selected = new Set([id]); });
}
function freshId(items, prefix) {
  const used = new Set(items.map(s => s.id)); /* 空き番号の検索を Set で速くする（結果は同じ：未使用で最小の番号） */
  let n = 1; while (used.has(prefix + n)) n++;
  return prefix + n;
}
/** 領域の塗り（doc.fills）の輪郭に、実際に接している（生きている）図形の id。塗りが覚えている一覧（fl.ids）には、あとで消えた図形・輪郭から離れた図形が残ることがある（事業主の図面：消えた 3〜4 個＋離れた 1 個）ので、数えない。輪郭の点が 0.5mm 以内に 2 つ以上ある図形を「接している」とする。 */
function fillBoundaryIds(fl, shapeById) {
  const pts = [fl.points || [], ...(fl.holes || [])].flat(), out = []; if (!pts.length) return out;
  for (const id of fl.ids || []) {
    const s = shapeById.get(id); if (!s) continue; let line = null; try { line = flattenShape(s, 0.05); } catch { line = null; } if (!Array.isArray(line) || line.length < 2) continue;
    let n = 0;
    for (const p of pts) { let d = Infinity; for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, u = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0; d = Math.min(d, Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy))); } if (d <= 0.5 && ++n >= 2) break; }
    if (n >= 2) out.push(id);
  }
  return out;
}
/** 動かす図形（ids）に、領域の塗りがついていくか：一覧が全部動くか、輪郭に接している図形が全部動くとき。
 *  さらに、動かす図形の外形（動かす図形の囲み）の中にぴったりおさまる小さな場所は、いっしょに動く（事業主 2026-10-24「リフィルを動かしたら、色がバラバラに分離してついてこない」：穴の中のうち、動かさないリング棒と重なった所だけを囲む塗りが、取り残された）。
 *  輪の外の円は動かさず内の円だけ動かす環のように、塗りの外形が動かす図形の外形からはみ出すものは、今までどおり（取り直す）。 */
const fillFollows = (fl, ids, shapeById) => {
  if ((fl.ids || []).length && fl.ids.every(id => ids.has(id))) return true; const b = fillBoundaryIds(fl, shapeById); if (b.length > 0 && b.every(id => ids.has(id))) return true;
  const mv = (fl.ids || []).map(id => shapeById.get(id)).filter(s => s && ids.has(s.id)); if (!mv.length || !(fl.points || []).length) return false;
  /* 外形になるのは、動かす図形のうち、それだけで一周閉じているもの（閉じた図形・円・端がつながって一周する線）。2本だけ動かすなど、一周していなければ、今までどおり（ついていかない） */
  const closedOnes = mv.filter(s => s.closed || s.type === 'circle'), loops = chainShapes(mv.filter(s => !(s.closed || s.type === 'circle')), 0.01).filter(c => c.closed).flatMap(c => c.shapeIds.map(id => shapeById.get(id))), outer = [...closedOnes, ...loops]; if (!outer.length) return false;
  const bs = outer.map(bboxOf), minX = Math.min(...bs.map(q => q.minX)), minY = Math.min(...bs.map(q => q.minY)), maxX = Math.max(...bs.map(q => q.maxX)), maxY = Math.max(...bs.map(q => q.maxY)), e = 0.05;
  return fl.points.every(q => q.x >= minX - e && q.x <= maxX + e && q.y >= minY - e && q.y <= maxY + e);
};
function transformSelected(fn, { rotates = false } = {}) {   /* rotates＝回転のとき true：寸法を「傾けない」で引き戻さず、図形といっしょに回す */
  const ids = selectedShapeIds();
  for (const p of doc.paths) { const shs = p.shapeIds.map(id => doc.shapes.find(s => s.id === id)); if (shs.length && shs.every(s => s && s.layer === 'guide' && !editable(s)) && doc.holes.some(h => h.pathId === p.id && selected.has(h.id) && holeEditable(h))) p.shapeIds.forEach(id => ids.add(id)); } /* 選んだ菱目がついた、非表示のガイド層の線は、菱目といっしょに動かす（取り残して、菱目が線から外れないように） */
  cancel(); dimRotating = rotates;
  try { commit(() => {
    const before=new Map(doc.paths.filter(p=>p.shapeIds.every(id=>ids.has(id))).map(p=>[p.id,resolvePath(doc,p)]));
    const followFills = new Set((doc.fills || []).filter(fl => fillFollows(fl, ids, new Map(doc.shapes.map(s => [s.id, s])))).map(fl => fl.id));   /* 動かす前の図形で決める（動かしたあとでは輪郭の位置が変わる） */
    const holeFollow = new Map();   /* 塗りの穴（抜き）の輪が、動かす図形の上に乗っているとき（スロットだけ動かすなど）：その輪だけ、いっしょに動かす。動かす前の図形で決める */
    { const moving = doc.shapes.filter(s => ids.has(s.id) && !['text', 'dimension', 'image', 'fold'].includes(s.type)); if (moving.length) for (const fl of doc.fills || []) { if (followFills.has(fl.id) || fl.clear || !(fl.holes || []).length) continue; const flags = fl.holes.map(h => fillOnShapes({ points: h, holes: [] }, moving) >= 0.9); if (flags.some(Boolean)) holeFollow.set(fl.id, flags); } }
    doc.shapes = doc.shapes.map(s => ids.has(s.id) ? fn(s) : s);
    if (Array.isArray(doc.fills) && doc.fills.length) { const mv = q => { try { const r = fn({ x: q.x, y: q.y }); return Number.isFinite(r?.x) && Number.isFinite(r?.y) ? { x: r.x, y: r.y } : q; } catch { return q; } }; doc.fills = doc.fills.map(fl => followFills.has(fl.id) ? { ...fl, points: fl.points.map(mv), holes: (fl.holes || []).map(h => h.map(mv)) } : holeFollow.has(fl.id) ? { ...fl, holes: fl.holes.map((h, i) => holeFollow.get(fl.id)[i] ? h.map(mv) : h) } : fl); }   /* 囲む図形（輪郭に接している生きている図形）を全部動かしたら、領域の塗りもついていく */
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
    followSectionMove(ids, fn, paths, alone);
    manualNext=null;
  }); } finally { dimRotating = false; }
}
/** 断面の図形（foldSec 'fd'）を平行に動かしたとき、設計の原点と、平面図・展開図（foldFlat 'fd'・'fdu'）の図形・菱目も、同じだけ動かす（事業主 2026-10-24「断面図の図形を動かしたら、平面図も連動させたい」）。
 *  回転・拡大縮小・反転では何もしない。平面図・展開図を選んでいっしょに動かしたときは、二重に動かさない（paths・alone＝すでに動いた菱目の判定）。動かした分 moveOff は、断面を作り直しても引き継ぐ。 */
function followSectionMove(ids, fn, paths, alone) {
  const d = doc.foldDesign; if (!d || !doc.shapes.some(s => s.foldSec === 'fd' && ids.has(s.id))) return;
  let r0, r1, r2; try { r0 = fn({ x: 0, y: 0 }); r1 = fn({ x: 100, y: 0 }); r2 = fn({ x: 0, y: 100 }); } catch { return; }
  if (![r0, r1, r2].every(r => Number.isFinite(r?.x) && Number.isFinite(r?.y))) return;
  const dx = r0.x, dy = r0.y; if (Math.abs(r1.x - dx - 100) > 1e-6 || Math.abs(r1.y - dy) > 1e-6 || Math.abs(r2.x - dx) > 1e-6 || Math.abs(r2.y - dy - 100) > 1e-6 || (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)) return;   /* 平行移動だけ */
  const flatOf = s => s.foldFlat === 'fd' || s.foldFlat === 'fdu', linked = $('flowLinkMove')?.checked !== false;
  const o = d.origin, fo = d.flatOff ?? { x: 0, y: 0 };
  if (!linked) {   /* 断面だけ動かす：平面図・展開図はその場に残す。平面図の位置は設計の原点からの差（flatOff）で持ち、作りなおしても、動かさなかった位置になる */
    doc.foldDesign = { ...d, origin: { x: o.x + dx, y: o.y + dy }, moveOff: { x: (d.moveOff?.x ?? 0) + dx, y: (d.moveOff?.y ?? 0) + dy }, flatOff: { x: fo.x - dx, y: fo.y - dy } }; return;
  }
  const movedFlat = new Set(doc.shapes.filter(s => flatOf(s) && !ids.has(s.id)).map(s => s.id));
  doc.shapes = doc.shapes.map(s => flatOf(s) && !ids.has(s.id) ? translate(s, dx, dy) : s);
  doc.holes = doc.holes.map(h => (h.foldFlat === 'fd' || h.foldFlat === 'fdu') && !(paths.has(h.pathId) || alone(h)) ? { ...h, x: h.x + dx, y: h.y + dy } : h);
  /* 平面図・展開図の塗りも、いっしょに動かす（半分以上が、動かした平面図の線で囲まれた塗り）：置き去りにすると、外形だけ動いて、色が元の場所に残った（事業主 2026-10-25「断面図だけ動かせないのか？」の図） */
  if (movedFlat.size && Array.isArray(doc.fills)) { const mv = q => ({ x: +(q.x + dx).toFixed(4), y: +(q.y + dy).toFixed(4) }); doc.fills = doc.fills.map(f => (f.ids || []).length && f.ids.filter(id => movedFlat.has(id)).length * 2 >= f.ids.length ? { ...f, points: f.points.map(mv), holes: (f.holes || []).map(h => h.map(mv)) } : f); }
  doc.foldDesign = { ...d, origin: { x: o.x + dx, y: o.y + dy }, moveOff: { x: (d.moveOff?.x ?? 0) + dx, y: (d.moveOff?.y ?? 0) + dy } };
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
/** 回転の小窓（事業主指示 2026-10-21）：回転ボタン（キー Q）で出る。角度を入れて Enter か「回す」で、選んだ図形全体の中心まわりに回す。声で角度を先に言ったときは、窓を出さずにすぐ回す。 */
function openRotateBar() { $('rotateBar').hidden = false; $('rotateA').focus?.(); $('rotateA').select?.(); }
function closeRotateBar() { $('rotateBar').hidden = true; }
/** 右クリックの「選んだ図形をオフセット」（点線・実線）：押すと、距離（mm）を入れる小窓が出る。Enter か「オフセット」で、入れた距離で実行（向きは作図オプション）。入れた距離は、作図オプションの「オフセット距離」にも残る。Esc・×・選んだ図形が無くなったら閉じる。キー（Shift+O）と左のボタンは、これまでどおりすぐ実行。 */
let offsetSelSolid = false, offsetSelSideMem = null;   /* 小窓で選んだ向きは、次に開いたときも残る（作図オプションの向きは変えない＝カーソルの側のツールの設定を壊さない） */
const offsetSelSideKey = () => { const v = $('offsetSide').value; return ['in', 'out', 'both'].includes(v) ? v : 'out'; };   /* 「カーソルの側」は選んだ図形には使えないので、外側 */
function openOffsetSelBar(solid) {
  offsetSelSolid = solid; $('offsetSelBarMode').textContent = t(solid ? 'offsetSelBarSolid' : 'offsetSelBarDashed'); $('offsetSelSide').value = offsetSelSideMem || offsetSelSideKey();
  $('offsetSelDist').value = $('offsetDist').value; $('offsetSelBar').hidden = false; $('offsetSelDist').focus?.(); $('offsetSelDist').select?.();
}
function closeOffsetSelBar() { $('offsetSelBar').hidden = true; }
function applyOffsetSelBar() {
  const raw = String($('offsetSelDist').value).trim(), d = Number(raw);
  if (raw === '' || !Number.isFinite(d) || d <= 0) { $('hint').textContent = t('invalidNumber'); return; }
  const side = $('offsetSelSide').value; offsetSelSideMem = side; $('offsetDist').value = String(d); closeOffsetSelBar(); offsetSelectedShapes({ solid: offsetSelSolid, side }); canvas.focus?.();
}
$('offsetSelRun').onclick = applyOffsetSelBar; $('offsetSelClose').onclick = closeOffsetSelBar;
$('offsetSelDist').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyOffsetSelBar(); } else if (e.key === 'Escape') { e.stopPropagation?.(); closeOffsetSelBar(); canvas.focus?.(); } });
function refreshOffsetSelBar() { if (!$('offsetSelBar').hidden && !selectedShapeIds().size) closeOffsetSelBar(); }   /* 選んだ図形が無くなったら、窓も閉じる */
function applyRotate() {
  const angle = Number($('rotateA').value);
  if (String($('rotateA').value).trim() === '' || !Number.isFinite(angle)) { $('hint').textContent = t('invalidNumber'); return; }
  closeRotateBar(); transformAboutCenter('rotate', angle); $('hint').textContent = t('rotDone', { a: angle });
}
$('rotateRun').onclick = applyRotate; $('rotateClose').onclick = closeRotateBar;
$('rotateA').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyRotate(); } else if (e.key === 'Escape') closeRotateBar(); });
function refreshRotateBar() { if (!$('rotateBar').hidden && !doc.shapes.some(s => selected.has(s.id) && editable(s))) closeRotateBar(); }   /* 選んだ図形が無くなったら、窓も閉じる */
function transformAboutCenter(kind, angleDeg) {
  const shapes = doc.shapes.filter(s => selected.has(s.id) && editable(s));
  if (!shapes.length) { $('hint').textContent = t(doc.shapes.some(s => selected.has(s.id)) ? 'transformLocked' : 'selectFirst'); return; }   /* 何も起きない理由を出す（事業主 2026-10-24「図形の左右反転できない」：選んだ図形が、鍵のかかった層・非表示の層にあるときも、黙って何もしなかった） */
  if (kind === 'rotate' && angleDeg === undefined && voiceAskNumber === null) { openRotateBar(); return; }
  const b = bboxOfDoc({ shapes, holes: [] }), center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const angle = kind === 'rotate' ? (angleDeg ?? askNumber('rotation', 90)) : 0;
  if (angle === null) return;
  transformSelected(s => kind === 'rotate' ? rotate(s, angle, center) : keepHoleSlant(kind === 'mirrorX' ? mirrorX(s, center.x) : mirrorY(s, center.y), s), { rotates: kind === 'rotate' });
  if (kind !== 'rotate' && doc.shapes.some(s => selected.has(s.id) && partOf(s))) { const ids = new Set(selected); commit(() => flipMark(ids)); }
}
/** 丸め・面取りの数字は、画面上部の小窓（filletR・chamferD）に置く（事業主指示 2026-10-21「メニューを押して数値指定できるものは窓を出して」）。以前は、角をクリックするたびにダイアログで聞いていた。
 *  小窓の数字が「前回の値」：変えるまで残り、ブラウザにも保存して、開き直しても引き継ぐ（丸めと面取りは別々・事業主指示 2026-10-17）。声の操作で先に数字を言ったときは、そちらを1回だけ使う。 */
const ROUND_FIELDS = { radius: ['filletR', 'fillet'], chamferSize: ['chamferD', 'chamfer'] };
for (const [id, name] of Object.values(ROUND_FIELDS)) {
  let saved = null; try { const raw = localStorage.getItem('leather-cad.ask.' + name); if (raw !== null && Number.isFinite(Number(raw)) && Number(raw) > 0) saved = raw; } catch { /* 保存を読めなくても、既定の 3 で続ける */ }
  $(id).value = saved ?? '3';
  $(id).addEventListener('change', () => { const v = Number($(id).value); if (String($(id).value).trim() !== '' && Number.isFinite(v) && v > 0) { try { localStorage.setItem('leather-cad.ask.' + name, String(v)); } catch { /* 保存できなくても続ける */ } } });
}
/** 数の入力。丸め・面取り（ROUND_FIELDS）は小窓の数字を読む（空・0 以下・不正なら案内して null）。それ以外は、ダイアログで聞く。remember を渡すと、前回入れた数を初期値にする。 */
function askNumber(key, initial, remember) {
  if (voiceAskNumber !== null) { const v = voiceAskNumber; voiceAskNumber = null; return v; }
  const round = ROUND_FIELDS[key];
  if (round) { const el = $(round[0]), v = Number(el.value); if (String(el.value).trim() === '' || !Number.isFinite(v) || !(v > 0)) { $('hint').textContent = t('roundNeedValue'); el.focus?.(); return null; } return v; }
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
/** 丸め・面取りの前に、菱目（縫い穴）の付いた経路の、今の形を覚える（事業主要望 2026-10-21「点線の角を丸められない」：菱目が1つ付いているだけで断っていた）。断らない：菱目は今の位置のまま残し、角を切り取った部分の菱目だけ消す（reattachMarks）。経路の区間（from・to）は、この形をもとに、新しい長さへ直す。 */
/** 丸め・面取りで、作り直す・足す図形が引き継ぐ、元の図形の見た目（線種・色・グループ）。事業主指摘 2026-10-21「菱目を打った瞬間に実線に変わった」：丸めで作り直した線・円弧が、点線・色を引き継がず、実線になっていた。 */
const roundStyle = s => ({ ...(s?.color ? { color: s.color } : {}), ...(s?.lineStyle ? { lineStyle: s.lineStyle } : {}), ...(s?.groupId ? { groupId: s.groupId } : {}) });
let roundOldRoutes = new Map(), roundHoleChoice = null, roundHolePending = null;
/** 縫い穴（菱目）の付いた線を丸め・面取りするときは、実行の前に小さな窓で聞く（事業主決定 2026-10-21 C案）：そのまま残す／打ち直す／消す／やめる。again＝選んだあとに、同じ操作をもう一度やり直す関数。窓を出したら true（呼び出し元は、そこで止める）。 */
/** 丸め・面取りで、2本の線の色や線種が違うときの一言：できる円弧・線は、先にクリックした線の色・線種になる。同じなら ''。 */
function roundStyleNote(first, hit) {
  const col = s => s?.color || '', dash = s => s?.lineStyle === 'dashed';
  if (!first || !hit || (col(first) === col(hit) && dash(first) === dash(hit))) return '';
  const c = col(first), cname = c ? t('color' + c[0].toUpperCase() + c.slice(1)) : t('colorNone');
  return t('roundStyleNote', { color: cname, line: t(dash(first) ? 'roundStyleDashed' : 'roundStyleSolid') }) + ' ';
}
function roundPrepare(pathIds, again) {
  roundOldRoutes = new Map(); for (const id of pathIds) { const q = doc.paths.find(x => x.id === id), r = q && resolvePath(doc, q); if (r) roundOldRoutes.set(id, r); }
  const holed = [...pathIds].some(id => doc.holes.some(h => h.pathId === id && !holeIsMark(h)));
  if (!holed || roundHoleChoice || !again) return false;
  roundHolePending = again; $('roundHoleBar').hidden = false; $('hint').textContent = t('roundHoleAsk'); return true;
}
function hideRoundHoleBar() { roundHolePending = null; if ($('roundHoleBar')) $('roundHoleBar').hidden = true; }
function pickRoundHole(choice) {
  const again = roundHolePending; hideRoundHoleBar(); if (!again) return;
  roundHoleChoice = choice; try { again(); } finally { roundHoleChoice = null; }
}
for (const [id, c] of [['roundHoleKeep', 'keep'], ['roundHoleRestitch', 'restitch'], ['roundHoleRemove', 'remove']]) $(id).onclick = () => pickRoundHole(c);
$('roundHoleCancel').onclick = () => { hideRoundHoleBar(); cancel(); $('hint').textContent = t('roundHoleCanceled'); };
/** 丸め・面取りのあと、目印だけが付いていた線を作り直す：図形の入れ替え（swap: 古い図形の id → 新しい図形の id の列）を線に反映し、目印を新しい線の上へ置き直す（つながらなければ、その線の目印は外す）。目印のない線は消す。commit の中で、図形を入れ替えたあとに呼ぶ。 */
function reattachMarks(pathIds, swap = new Map()) {
  const olds = roundOldRoutes, choice = roundHoleChoice || 'keep'; roundOldRoutes = new Map();
  doc.paths = doc.paths.filter(q => !pathIds.has(q.id) || doc.holes.some(h => h.pathId === q.id));
  for (const q of doc.paths.filter(x => pathIds.has(x.id))) {
    q.shapeIds = q.shapeIds.flatMap(id => swap.has(id) ? swap.get(id) : [id]); const route = resolvePath(doc, q);
    if (!route) { doc.holes = doc.holes.filter(h => h.pathId !== q.id); doc.paths = doc.paths.filter(x => x.id !== q.id); continue; }
    const len = arcLength(route), keep = new Set(), old = olds.get(q.id), oldLen = old ? arcLength(old) : 0, mapped = v => old ? projectOnPath(route, pointAtLength(old, Math.min(Math.max(v, 0), oldLen))).s : v;
    const autoSegs = choice === 'restitch' && old ? q.segments.filter(sg => sg.mode !== 'manual' && doc.tools.some(tl => tl.id === sg.toolId)) : [];   /* 打ち直す区間：固定ピッチ・等分（手で打った穴の区間はそのまま） */
    for (const h of doc.holes.filter(x => x.pathId === q.id)) {
      const pr = projectOnPath(route, { x: h.x, y: h.y });
      if (holeIsMark(h)) { const pt = pointAtLength(route, pr.s); h.s = pr.s; h.x = pt.x; h.y = pt.y; keep.add(h.id); continue; }   /* 目印：新しい線の上へ置き直す */
      if (choice === 'remove') continue;   /* 縫い穴は消す */
      if (autoSegs.length) { const os = projectOnPath(old, { x: h.x, y: h.y }).s; if (autoSegs.some(sg => os >= sg.from - 0.05 && os <= sg.to + 0.05)) continue; }   /* 打ち直す区間の穴は、いったん消して、あとで打ち直す */
      if (distance(pr, h) <= 0.02 && pr.s >= -1e-6 && pr.s <= len + 1e-6) { h.s = pr.s; keep.add(h.id); }   /* 今の位置のまま（まだ線の上にあるものだけ。角を切り取った部分のものは消える） */
    }
    const segsNew = q.segments.map(seg => { const a = Math.min(len, Math.max(0, mapped(seg.from))), b = Math.min(len, Math.max(0, mapped(seg.to))); return { ...seg, from: Math.min(a, b), to: Math.max(a, b) }; });   /* 区間を、新しい経路の長さへ */
    doc.holes = doc.holes.filter(h => h.pathId !== q.id || keep.has(h.id)); q.segments = segsNew;
    if (autoSegs.length) for (const sg of q.segments.filter(x => x.mode !== 'manual')) {   /* 打ち直し：同じ工具・同じピッチ・同じ区間（等分は両端に穴が来るように） */
      const tool = doc.tools.find(tl => tl.id === sg.toolId); if (!tool || !(sg.to > sg.from) || !(sg.pitch > 0)) continue;
      const pts = pointsAlongShape(route, sg.pitch, { offsetStart: sg.from, offsetEnd: Math.max(0, len - sg.to), variable: sg.mode !== 'fixed' });
      for (const p of pts) { const id = freshId(doc.holes, 'h'); doc.holes.push({ id, pathId: q.id, s: p.s, x: p.x, y: p.y, angleDeg: ($('followTangent').checked ? p.angleDeg : 0) + slantOf(tool), toolId: tool.id, mark: 'tool' }); }
    }
    if (!doc.holes.some(h => h.pathId === q.id)) doc.paths = doc.paths.filter(x => x.id !== q.id);   /* 穴が全部なくなった経路は消す */
  }
}
/** 折れ線をクリック：頂点の近くならその角だけ、辺の途中なら全部の角を丸める／面取りする。 */
function roundPolylineAt(poly, p) {
  cancel();
  const affected = new Set(doc.paths.filter(q => q.shapeIds.includes(poly.id)).map(q => q.id));
  if (roundPrepare(affected, () => roundPolylineAt(poly, p))) return;
  const near = poly.points.map((v, i) => [distance(v, p), i]).filter(([d]) => d <= 9 / scale).sort((x, y) => x[0] - y[0])[0];
  const r = askNumber(mode === 'fillet' ? 'radius' : 'chamferSize', 3, mode === 'fillet' ? 'fillet' : 'chamfer'); if (r === null) return;
  const shapes = roundPolylineCorners(poly, near ? [near[1]] : null, r, mode);
  if (!shapes) { $('hint').textContent = t('impossible'); return; }
  commit(() => {
    doc.shapes = doc.shapes.filter(s => s.id !== poly.id);
    const ids = shapes.map(s => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...roundStyle(poly), ...s, id, layer: poly.layer }); return id; }); reattachMarks(affected, new Map([[poly.id, ids]]));
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
/** オフセットの「外周」：クリックした所を通る輪郭（閉じた折れ線・円・閉じた曲線、または線・円弧・曲線で一周つながった輪郭）のうち、いちばん大きいもの。その輪郭の線を1本返す（オフセットが、そこからつながった全体へ広げる）。見つからなければ null。
 *  事業主 2026-10-26「外周のオフセットしたいのに、パッチのオフセットしかできない」「オフセットで外周を選べない」：外周の縁の上に、マスの折れ線や折り線が重なっていて、クリックすると、上にある図形（マス・折り線の一部）が選ばれていた。いちばん大きい輪郭を選べば、外周になる。 */
function outlineHitAt(shapes, p) {
  const tol = 7 / scale, cands = [];
  for (const s of shapes) if ((s.type === 'circle' || ((s.type === 'polyline' || s.type === 'path') && s.closed)) && distTo(s, p) <= tol) cands.push({ s, area: s.type === 'circle' ? Math.PI * s.r * s.r : areaOf(flattenShape(s, 0.05)) });
  const open = shapes.filter(s => !s.closed && s.layer !== 'guide' && ['line', 'arc', 'bezier', 'polyline', 'path'].includes(s.type)), byId = new Map(open.map(s => [s.id, s]));
  for (const r of closedRegions(dropCovered(open, 0.1), 0.01, { dashed: true })) {
    const near = r.shapeIds.map(id => byId.get(id)).filter(Boolean).map(s => ({ s, d: distTo(s, p) })).filter(c => c.d <= tol).sort((x, y) => x.d - y.d)[0];
    if (near) cands.push({ s: near.s, area: r.area });
  }
  cands.sort((x, y) => y.area - x.area); return cands[0]?.s || null;
}
function offsetClick(p, whole) {
  const shapes = doc.shapes.filter(s => visible(s) && stitchable(s)); let scopeSel = offsetAlt ? 'edge' : $('offsetScope').value; if (whole && scopeSel !== 'outline') scopeSel = 'whole';
  const hit = scopeSel === 'outline' ? outlineHitAt(shapes.filter(s => editable(s)), p) : shapes.filter(s => editable(s)).reverse().find(s => distTo(s, p) <= 7 / scale);
  if (!hit) { offsetSelection = null; $('hint').textContent = t(scopeSel === 'outline' ? 'offsetOutlineNone' : 'offsetNone'); draw(); return; }
  offsetLast = p; const scope = scopeSel === 'outline' ? 'whole' : scopeSel, edge = scope === 'edge' ? (offsetEdgeSel(hit, p) || (hit.type !== 'polyline' ? offsetSpan([hit], hit, p, true) : null)) : null; /* 線・円弧・曲線は、その1本が1辺（つながった別の図形は含めない） */ /* 選ぶ範囲：交点から交点まで／1辺だけ（Alt＋クリックでも）／つながった全体（ダブルクリックでも） */ if (edge) { offsetAlt = false; offsetSelection = { ...edge, layer: hit.layer }; $('of-dist').value = $('offsetDist').value; $('of-side').value = $('offsetSide').value; draw(); $('hint').textContent = t($('offsetSide').value === 'cursor' ? 'offsetPickCursor' : 'offsetPickedEdge'); return; }
  const sel = offsetSpan(shapes, hit, p, scope === 'whole'); if (!sel) { offsetSelection = null; $('hint').textContent = t('impossible'); draw(); return; }
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
/** 選んだ図形を、つながった組ごとにまとめてオフセット（事業主 2026-10-24「オフセットが短い直線のみ動く。複数選択した図形をまとめたあとに右クリックでオフセットするか、ショートカットでまとめて処理できるようにしたい」）。
 *  選んだ図形の中だけで、端がつながったものを1組にして（選んでいない図形は通らない）、組ごとに、作図オプションの「オフセット距離」「向き」（内側・外側・両側。それ以外の向きは外側）でずらす。
 *  結果は、黄色の点線でガイドの層へ（今のオフセットと同じ）。元に戻すは1回。 */
/** 選んだ図形をオフセット：{ solid: true } のとき、結果は、元の図形と同じ層・同じ色の実線（型紙の線としてそのまま使える）。そうでなければ、これまでどおり、黄色の点線をガイド層に作る（事業主 2026-10-26「実線でのオフセット機能もつけて」・右クリックに別の項目）。 */
function offsetSelectedShapes(opts = {}) {
  const solid = opts.solid === true;   /* ボタンの onclick から呼ばれるとイベントが来るので、solid は true のときだけ */
  const ids = selectedShapeIds(), pool = doc.shapes.filter(s => ids.has(s.id) && visible(s) && editable(s) && stitchable(s) && !s.holeLink && !s.markOf && !['text', 'dimension', 'image'].includes(s.type));
  if (!pool.length) { $('hint').textContent = t('offsetSelNeed'); return; }
  const dist = Number($('offsetDist').value); if (!Number.isFinite(dist) || dist <= 0) { $('hint').textContent = t('invalidNumber'); return; }
  const v = ['in', 'out', 'both'].includes(opts.side) ? opts.side : offsetSelSideKey(), used = new Set(), groups = [];   /* 向き：距離の小窓で選んだもの（opts.side）、なければ作図オプションの向き（「カーソルの側」は外側） */
  for (const s of pool) { if (used.has(s.id)) continue; const sel = offsetSpan(pool, s, null, true); if (!sel) continue; for (const id of sel.shapeIds) used.add(id); groups.push({ sel, layer: s.layer, src: s }); }
  const sideOf = (sel, inner) => { let d = inner ? -dist : dist; if (!sel.closed) { const k = bendInnerSign(sel.points); if (k) d = (inner ? k : -k) * dist; } return d; };   /* 開いた線の「内側」は、曲がりの内側（今のオフセットと同じ）。まっすぐなら、進行方向の左が外側 */
  const results = []; let failed = 0;
  for (const g of groups) { const ds = v === 'both' ? [sideOf(g.sel, true), sideOf(g.sel, false)] : [sideOf(g.sel, v === 'in')], rs = ds.map(d => offsetSpanResult(g.sel, d, { join: $('offsetJoin').value })); if (rs.some(r => !r)) { failed++; continue; } results.push(...rs.map(r => ({ r, g }))); }
  if (!results.length) { $('hint').textContent = t('impossible'); return; }
  const dest = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || groups[0].layer;
  cancel(); offsetSelection = null; commit(() => { selected = new Set(); for (const { r, g } of results) { const id = freshId(doc.shapes, 's'); if (solid) { const o = { ...r, id, layer: g.layer }; delete o.lineStyle; if (g.src.color) o.color = g.src.color; else delete o.color; doc.shapes.push(o); } else doc.shapes.push({ ...r, id, layer: dest, color: 'yellow', lineStyle: 'dashed' }); selected.add(id); } });
  $('hint').textContent = t(solid ? 'offsetSelDoneSolid' : 'offsetSelDone', { n: groups.length - failed, d: dist, side: v === 'both' ? t('offsetSelBothName') : t(v === 'in' ? 'offsetIn' : 'offsetOut') }) + (failed ? ' ' + t('offsetSelFailed', { k: failed }) : ''); draw();
}
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
  if (roundPrepare(affected, () => reroundArc(arc))) return true;
  const r = askNumber('radius', Math.round(arc.r * 100) / 100); if (r === null) return true;
  const VA = { type: 'line', x1: fa.x, y1: fa.y, x2: C.x, y2: C.y }, VB = { type: 'line', x1: fb.x, y1: fb.y, x2: C.x, y2: C.y }, na = filletCorner(VA, VB, r); if (!na) { $('hint').textContent = t('impossible'); return true; }
  const ne = [circlePoint(na, na.startDeg), circlePoint(na, na.endDeg)], pa = ne.reduce((m, q) => distTo(VA, m) <= distTo(VA, q) ? m : q), pb = ne.find(q => q !== pa);
  const upd = (n, pt) => back(n.o, { ...n.l, ['x' + n.end]: pt.x, ['y' + n.end]: pt.y });
  commit(() => {
    const id = freshId(doc.shapes.filter(x => x.id !== arc.id), 's'); const a2 = upd(A, pa), b2 = upd(B, pb);
    doc.shapes = doc.shapes.filter(x => x.id !== arc.id).map(x => x.id === A.o.id ? a2 : x.id === B.o.id ? b2 : x); doc.shapes.push({ ...roundStyle(arc), ...na, id, layer: arc.layer });
    for (const part of doc.parts) if (part.shapeIds.includes(arc.id)) part.shapeIds = part.shapeIds.map(x => x === arc.id ? id : x);
    reattachMarks(affected, new Map([[arc.id, [id]]])); selected = new Set([A.o.id, B.o.id, id]);
  });
  $('hint').textContent = t('hint.fillet'); return true;
}
const curveType = x => ['arc', 'bezier', 'path', 'circle'].includes(x?.type);
/** 曲線（円弧・円・ベジェ・ペン）と、曲線または線の交点を、半径を入れた円弧でなめらかにつなぐ。first・hit は、それぞれ残したい側でクリックした図形（pFirst・p はそのクリック位置）。 */
function curveFillet(first, pFirst, hit, p) {
  const affected = new Set(doc.paths.filter(q => q.shapeIds.some(id => id === first.id || id === hit.id)).map(q => q.id));
  if (roundPrepare(affected, () => curveFillet(first, pFirst, hit, p))) return;
  const r = askNumber('radius', 3, 'fillet'); if (r === null) { cancel(); return; }
  const res = filletCurves(first, pFirst, hit, p, r); if (!res) { $('hint').textContent = t('impossible'); cancel(); return; }
  cancel();
  commit(() => {
    const id = freshId(doc.shapes, 's');
    doc.shapes = doc.shapes.map(x => x.id === first.id ? { ...roundStyle(first), ...res.a, id: first.id, layer: first.layer } : x.id === hit.id ? { ...roundStyle(hit), ...res.b, id: hit.id, layer: hit.layer } : x);
    doc.shapes.push({ ...roundStyle(first), ...res.arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id]);
    for (const q of doc.paths) if (q.shapeIds.includes(first.id) && q.shapeIds.includes(hit.id)) q.shapeIds.push(id);
    reattachMarks(affected);
  });
  $('hint').textContent = roundStyleNote(first, hit) + t('hint.fillet');
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
    doc.shapes.push({ ...roundStyle(first), ...res.arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id].filter(x => !removed.has(x)));
    for (const q of doc.paths) { if (q.shapeIds.includes(first.id) && q.shapeIds.includes(hit.id)) q.shapeIds.push(id); q.shapeIds = q.shapeIds.filter(x => !removed.has(x)); }
    doc.paths = doc.paths.filter(q => q.shapeIds.length);
    reattachMarks(affectedPaths);
  });
  $('hint').textContent = roundStyleNote(first, hit) + t(mode === 'fillet' ? 'hint.fillet' : 'hint.chamfer');
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
  if (roundPrepare(affectedPaths, () => editAt(p))) return;
  const r = askNumber(mode === 'fillet' ? 'radius' : 'chamferSize', 3, mode === 'fillet' ? 'fillet' : 'chamfer'); if (r === null) return;
  let arc = (mode === 'fillet' ? filletCorner : chamferCorner)(first, lineOf(hit), r), gen = null;
  if (!arc) { gen = stage.click ? roundLinesAt(first, stage.click, lineOf(hit), p, r, mode) : null; arc = gen?.arc; } /* 端がつながっていない・交わっていない・鈍角などの2本は、のばした交点を角にして、のばす／切り詰めて丸める */
  if (!arc) { const ch = chainAround(first, lineOf(hit)); if (ch) { if (roundPrepare(new Set(doc.paths.filter(q => [...ch.ids].some(id => q.shapeIds.includes(id))).map(q => q.id)), () => editAt(p))) return; const res = roundChainAt(first, ch.c1, lineOf(hit), ch.c2, r, mode); if (res) { applyRoundChain(first, hit, res, ch, affectedPaths); return; } } } /* 角の線が短くて入らないときは、同じ直線上につながった続きの線（層が違ってもよい）まで1本の辺として丸める（不具合記録 2026-10-17） */
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
    doc.shapes.push({ ...roundStyle(first), ...arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id]);
    for (const q of doc.paths) if (q.shapeIds.includes(first.id) && q.shapeIds.includes(hit.id)) q.shapeIds.push(id); /* 2本が同じ線なら、間にできた円弧も同じ線に入れる */
    reattachMarks(affectedPaths);
  });
  $('hint').textContent = roundStyleNote(first, hit) + t(mode === 'fillet' ? 'hint.fillet' : 'hint.chamfer');
}
/** 動かす図形の「基点」：掴んだ所の近く（磁石の吸着距離内）にある、選んだ図形の端・中点・中心。見つかれば gesture.start をその点に置き換え、相手の候補（動かさない図形の端・中点・中心）を gesture.targets に持つ（事業主指示 2026-10-13：選んだ矩形の中心と、くっつけたい図形の中心を合わせたい）。 */
function beginMoveSnap(g) {
  const reach = magnetRadiusMm(); if (!(reach > 0)) return;
  const all = m => [...m.ends, ...m.centers, ...m.guide], mine = all(magnetPointsOf(doc.shapes.filter(s => visible(s) && g.ids.has(s.id))));
  let near = reach, base = null; for (const c of mine) { const d = distance(g.start, c); if (d < near) { near = d; base = c; } }
  g.mine = mine; g.targets = all(magnetPointsOf(doc.shapes.filter(s => visible(s) && !g.ids.has(s.id))));
  g.edges = moveEdgesOf(g.ids);
  if (base) { g.start = { ...base }; g.hasBase = true; } /* 基点が無い（点から離れた所をつかんだ）ときも、動かす図形の端・中点・中心が、相手の点に合う（movePosition） */
}
/** 動かす図形（グループ・複数選択を含む）の外形の上下左右（own）と、動かさない図形の辺の位置（xs＝左右・ys＝上下）。辺どうしの吸着に使う（事業主指示 2026-10-21：グループ化した図形の上辺・右辺が、基準の線にぴったり重なってほしい）。文字・寸法・画像は、辺の位置の対象にしない。 */
function moveEdgesOf(ids) {
  const edge = s => visible(s) && s.type !== 'text' && s.type !== 'dimension' && s.type !== 'image' && s.type !== 'fold' && !s.holeLink;
  const mine = doc.shapes.filter(s => edge(s) && ids.has(s.id)), others = doc.shapes.filter(s => edge(s) && !ids.has(s.id)); if (!mine.length || !others.length) return null;
  const box = list => list.map(bboxOf).reduce((b, c) => b ? { minX: Math.min(b.minX, c.minX), minY: Math.min(b.minY, c.minY), maxX: Math.max(b.maxX, c.maxX), maxY: Math.max(b.maxY, c.maxY) } : { ...c }, null);
  const xs = [], ys = []; for (const s of others) { const b = bboxOf(s); xs.push(b.minX, b.maxX); ys.push(b.minY, b.maxY); }
  return { own: box(mine), xs, ys };
}
/** ドラッグ中の位置 d（動かした量）に対し、動かす図形の左右の辺・上下の辺が、ほかの辺の位置に近ければ、縦と横を別々に合わせる。合った辺は gesture.edgeSnap（{x,y}）に覚えて、目安線を描く。lockX／lockY：その向きは動かさない（Shift）。 */
function snapEdges(d, lockX, lockY) {
  const e = gesture.edges, reach = magnetRadiusMm(); gesture.edgeSnap = null; if (!e || !(reach > 0)) return d;
  const pick = (cands, targets) => { let best = null, bd = reach; for (const c of cands) for (const t of targets) { const dd = Math.abs(t - c.v); if (dd < bd) { bd = dd; best = { fix: t - c.v, at: t }; } } return best; };
  const bx = lockX ? null : pick([{ v: e.own.minX + d.x }, { v: e.own.maxX + d.x }], e.xs), by = lockY ? null : pick([{ v: e.own.minY + d.y }, { v: e.own.maxY + d.y }], e.ys);
  if (bx || by) gesture.edgeSnap = { x: bx ? bx.at : undefined, y: by ? by.at : undefined };
  return { x: d.x + (bx ? bx.fix : 0), y: d.y + (by ? by.fix : 0) };
}
function moveDelta() { return { x: cursor.x - gesture.start.x, y: cursor.y - gesture.start.y }; }
/** free：Alt を押している間は「吸着なし」（事業主決定 2026-10-21 A案）：端・中点・中心の点どうしの磁石と、辺どうしの吸着を切る。グリッドのスナップ（「スナップ」のチェック）と Shift の固定は、そのまま。 */
function movePosition(p, shift, free = false) {
  const start = gesture.start; gesture.edgeSnap = null;
  if (!free && gesture.hasBase && gesture.targets?.length && !shift) { const reach = magnetRadiusMm(); let near = reach, hit = null; for (const c of gesture.targets) { const d = distance(p, c); if (d < near) { near = d; hit = c; } } if (hit) { snap = hit; return { ...hit }; } } /* 基点を持って動かしているとき：相手の点の近くでは、基点がその点にぴたりと合う */
  const own = gesture.mine, tg = gesture.targets, reachMm = magnetRadiusMm();
  if (!free && own?.length && tg?.length && reachMm > 0 && own.length * tg.length <= 4e5 && (!gesture.hasBase || shift)) { /* 動かす図形の点（端・中点・中心）のどれかが、相手の点に近づいたら、ぴたりと合わせる。Shift（水平・垂直）のときは、動かせる向きの位置だけを合わせる */
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
  let lockX = false, lockY = false;
  if (shift) { if (Math.abs(p.x - start.x) >= Math.abs(p.y - start.y)) { result.y = start.y; lockY = true; } else { result.x = start.x; lockX = true; } }
  if (gesture.edges && !free) { const d = snapEdges({ x: result.x - start.x, y: result.y - start.y }, lockX, lockY); result = { x: start.x + d.x, y: start.y + d.y }; }   /* 辺どうしの吸着（点どうしの磁石が先。グリッドの吸着が入っていても、辺が吸着距離内ならそちらへ合わせる＝既定でグリッド入りのため） */
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
  if (gesture?.kind === 'textR' && gesture.id === s.id) return { ...s, sizeMm: gesture.size };   /* 文字の取っ手を引いている間の大きさ */
  if (gesture?.kind !== 'move' || !gesture.ids.has(owner)) return s;
  const d = moveDelta(); return translate(s, d.x, d.y);
}
/** 点 p の近く（画面9px以内）にある、線と線の交点のうち、いちばん近いもの（なければ null）。近くを通る線（最大12本）だけで交点を求めるので、マウスを動かしても重くならない。 */
function intersectionSnapAt(p) {
  const reach = 9 / scale, near = doc.shapes.filter(s => visible(s) && stitchable(s) && !['text', 'dimension', 'image'].includes(s.type) && distTo(s, p) <= reach * 2).slice(0, 12); if (near.length < 2) return null;
  let best = null, bd = reach; for (const q of allIntersections(near)) { const d = distance(p, q); if (d <= bd) { bd = d; best = { x: q.x, y: q.y }; } } return best;
}
/** 線の上の点に吸い付く（寸法・定規の1・2点目）（事業主 2026-10-25「線までの寸法が引けない。途中で飛んでしまい、線に合わせられない」：スナップが入だと、点が1mm の目盛りに丸められて、線の上に乗らず、横にも縦にもずれた距離になった）。
 *  p の近く（画面9px以内）にある線のうち、いちばん近い線の上の点。始点 a があるときは、a から線へ下ろした垂線の足（線の上にあるとき）が p から画面14px以内なら、そちらを優先する（始点から線までのいちばん短い距離）。端点・交点・穴の吸着が先。 */
function lineSnapAt(p, a) {
  const reach = 9 / scale; let best = null, bd = reach;
  for (const s of doc.shapes) {
    if (!visible(s) || !stitchable(s) || ['text', 'dimension', 'image'].includes(s.type) || distTo(s, p) > reach) continue;
    const pts = flattenShape(s, 0.05);
    for (let i = 0; i + 1 < pts.length; i++) {
      const q = pts[i], r = pts[i + 1], dx = r.x - q.x, dy = r.y - q.y, len2 = dx * dx + dy * dy; if (len2 < 1e-12) continue;
      const u = Math.max(0, Math.min(1, ((p.x - q.x) * dx + (p.y - q.y) * dy) / len2)), foot = { x: q.x + dx * u, y: q.y + dy * u }, d = distance(p, foot);
      if (d < bd) { bd = d; best = { foot, q, r, len2, dx, dy }; }
    }
  }
  if (!best) return null;
  if (a) { const { q, dx, dy, len2 } = best, u = ((a.x - q.x) * dx + (a.y - q.y) * dy) / len2; if (u >= 0 && u <= 1) { const perp = { x: q.x + dx * u, y: q.y + dy * u }; if (distance(p, perp) <= 14 / scale) return perp; } }
  return best.foot;
}
/** 作図中のカーソル p が、「中心」の点（辺の中点・円弧の中点・円や円弧の中心・小さな輪の中心）の近く（画面で 40px 以内＝ひし形の印が出る範囲）にあるとき、その点の縦の線・横の線に 10px（吸着距離）以内なら、そろえる（事業主指摘 2026-10-21「どうみても中心点からずれる」：印から離れた所では、1mm 刻みのグリッドに丸められて、中心から 0.4mm ずれていた）。縦（x）と横（y）は別々。端点にはそろえない。 */
function alignToCenters(p) {
  const reach = magnetRadiusMm(); if (!(reach > 0)) return null; const see = 40 / scale; let bx = null, by = null;
  const self = gesture?.kind === 'lineEnd' ? doc.shapes.find(x => x.id === gesture.id) : null, ownMid = self?.type === 'line' ? { x: (self.x1 + self.x2) / 2, y: (self.y1 + self.y2) / 2 } : null;   /* 端を引いている線の、自分の（元の）中点にはそろえない */
  for (const c of [...magnetMids, ...magnetCenters]) {
    if (ownMid && Math.abs(c.x - ownMid.x) < 1e-6 && Math.abs(c.y - ownMid.y) < 1e-6) continue;
    if (distance(p, c) > see) continue; const dx = Math.abs(p.x - c.x), dy = Math.abs(p.y - c.y);
    if (dx <= reach && (!bx || dx < bx.d)) bx = { d: dx, c }; if (dy <= reach && (!by || dy < by.d)) by = { d: dy, c };
  }
  return bx || by ? { ...(bx ? { x: bx.c.x, fromX: bx.c } : {}), ...(by ? { y: by.c.y, fromY: by.c } : {}) } : null;
}
function snapped(p, shift, anchor) {
  snap = null; snapAlign = null;
  let result = { ...p };
  const reach = magnetRadiusMm();
  if (reach > 0) {   /* 磁石は2段：まず、円周の45°点以外（線の端・円と円弧の中心・中点・輪の中心・穴の中心）で近い点。無ければ円周の45°点（弱い点）。円の中心が、自分の円周の点に負けないため（小さな円で中心に合わせられなかった・2026-10-28） */
    const pick = list => { let near = reach, hit = null; for (const c of list) { const d = distance(p, c); if (d < near) { near = d; hit = c; } } return hit; };
    const hit = pick([...magnetEnds, ...magnetCenters, ...magnetGuide.filter(c => !c.weak)]) || pick(magnetGuide.filter(c => c.weak));
    if (hit) { result = { x: hit.x, y: hit.y }; snap = hit; }
  }
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
  if (!snap && (mode === 'ruler' || mode === 'dimension' || gesture?.kind === 'lineEnd')) { const ix = intersectionSnapAt(p); if (ix) { result = ix; snap = ix; } }   /* 定規・寸法：線と線の交点にも吸い付く（事業主指摘 2026-10-17：交点から交点までの距離が測れない） */
  if (!snap && (mode === 'ruler' || mode === 'dimension') && stage?.kind !== 'dimPlace' && stage?.kind !== 'radius') { const ln = lineSnapAt(p, anchor); if (ln) { result = ln; snap = ln; } }   /* 定規・寸法：線の上にも吸い付く（始点があれば、始点から線への垂線の足）。目盛りに丸める前 */
  const al = !snap && (MAGNET_DRAW_MODES.includes(mode) || gesture?.kind === 'lineEnd') ? alignToCenters(p) : null;   /* 中心の点にそろえた向きは、グリッドに丸めない */
  if (!snap && (al || $('snap').checked)) { const grid = Number($('spacing').value) || 1, gridOn = $('snap').checked; result = { x: al?.x ?? (gridOn ? Math.round(p.x / grid) * grid : p.x), y: al?.y ?? (gridOn ? Math.round(p.y / grid) * grid : p.y) }; snap = result; snapAlign = al; }
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
  const px = Math.max(2.5, 12 / scale, exporting ? exportExtentMm / 70 : 0), ox = d.a.x - s.x1, oy = d.a.y - s.y1, ol = Math.hypot(ox, oy), nx = ol > 1e-9 ? ox / ol : d.textPos.x - (d.a.x + d.b.x) / 2, ny = ol > 1e-9 ? oy / ol : d.textPos.y - (d.a.y + d.b.y) / 2, nl = Math.hypot(nx, ny) || 1, gap = px * 0.62 + 2 / scale;
  return { x: (d.a.x + d.b.x) / 2 + nx / nl * gap, y: (d.a.y + d.b.y) / 2 + ny / nl * gap, angleDeg: d.angleDeg, px, label: typeof s.label === 'string' && s.label ? s.label : d.value.toFixed(2) };   /* label があれば数字の代わりにその文字（菱目の間隔「菱目 ○○mm ×n」） */
}
/** 図形までの距離。寸法は、寸法線までと、数字の枠（少し広め）までの近いほう。 */
function distTo(s, p) {
  const g = distToShape(s, p); if (s?.type !== 'dimension') return g;
  const L = dimLabelPlace(s), a = L.angleDeg * Math.PI / 180, dx = p.x - L.x, dy = p.y - L.y, lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
  const hw = L.label.length * L.px * 0.6 / 2, hh = L.px / 2, ex = Math.max(Math.abs(lx) - hw, 0), ey = Math.max(Math.abs(ly) - hh, 0);
  return Math.min(g, Math.hypot(ex, ey));
}
const SELECT_HALO = 'rgba(90,170,255,.45)';   /* 選んだ線のふちの色（水色・半透明） */
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
  if (s.type === 'text') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angleDeg * Math.PI / 180); ctx.font = `${s.sizeMm}px ${textFontStack(s.font)}`; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.fillText(s.text, 0, 0); ctx.restore(); return; }
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
/** 交点から先へ飛び出していた線の端を、交点まで引き戻して長さ 0 になるとき（事業主要望 2026-10-21「飛び出た端点を交点まで戻したい」）：動かさない側の端（g.fixed）がほかの図形に接していれば、その線は「はみ出した部分」なので、消してよい。縫い穴が付いた線・何にも接していない孤立した線は、消さずに断る。 */
function lineEndRetracted(s, g) {
  if (s.type !== 'line' || !g.fixed || doc.paths.some(pt => pt.shapeIds.includes(s.id) && doc.holes.some(h => h.pathId === pt.id))) return false;
  return doc.shapes.some(x => x.id !== s.id && visible(x) && !['text', 'dimension', 'image'].includes(x.type) && distTo(x, g.fixed) <= 1e-3);
}
/** 端をドラッグ中のカーソル位置。Shift：直線＝動かさない側の端から元の向きの線の上（水平・垂直の線なら水平・垂直のまま）、折れ線の角＝元の位置から水平か垂直（近い方）だけ。円弧は角度だけが変わる。 */
/** 中心にそろったとき（事業主決定 2026-10-21 B案「端の取っ手も中心へそろえる」）：延長線が、そろえた縦線（x）・横線（y）と交わる点で、カーソルの近く（12px 以内）なら、その点（線はまっすぐなまま）。交わらない・遠いとき（斜めの線を中心の縦線へ引き寄せるなど）は null＝そろえた位置そのまま。 */
function alignOnExtension(g, w, al) {
  if ((al.x === undefined) === (al.y === undefined)) return null;   /* 縦横の両方がそろったとき（点そのもの）は、そのまま */
  const k = al.x !== undefined ? 'x' : 'y'; if (!(Math.abs(g.dir[k]) > 1e-6)) return null;
  const t = (al[k] - g.fixed[k]) / g.dir[k], q = { x: g.fixed.x + g.dir.x * t, y: g.fixed.y + g.dir.y * t };
  return distance(q, w) <= 12 / scale ? q : null;
}
function lineEndCursor(g, w, shift) {
  const sp = snapped(w, false, null);
  if (!shift && g.dir && snapAlign) return alignOnExtension(g, w, snapAlign) || sp;   /* 中心にそろったときは、元の向きより中心を優先 */
  if (!shift) return g.dir ? extensionSnap(g.fixed, g.dir, w, sp) : sp;
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
  if (s.type === 'dimension' || s.type === 'text') return { color: s.type === 'text' && color && isHex6(s.textColor) ? s.textColor : '#335', px: 1 };   /* 色つきの書き出しでは、色を決めた文字はその色 */
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
/** 裏面表示中の印（2026-10-28 事業主「裏面表示のとき、画面の端に「裏面表示中」の印を出す（見間違い防止）」）：「縫い目を見る」が入っていて、縫い目の面が「裏」のとき、画面の右上の隅に出す。押すと表に戻す。3D の表示中は出さない。 */
function syncBackBadge() {
  const b = $('backBadge'); if (!b) return;
  const on = !!viewShow.stitch && stitchFace() === 'back' && !!$('canvas3d')?.hidden; if (b.hidden === on) b.hidden = !on;
}
function draw() {
  if (!exporting) syncBackBadge();
  ensureFillRingsRepaired();   /* 開いた図面の、取り残された塗りの穴の輪を、いまの図形に合わせ直す（最初の1回だけ） */

  ownPathsCache = null; if (doc !== foldSyncDoc) { foldSyncDoc = doc; pruneFoldSections(); syncFoldFields(); syncFoldCutField(); } /* 読み込んだ図面に、図形の無い断面図の情報が残っていたら、ここで消す（寸法・取っ手が残らないように） */ /* 図面が入れ替わったら、設計カードの欄を図面の設計に合わせる */
  const dpr = exporting ? 1 : (window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (!exporting) { ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, width, height); }
  if (quadOn() && !exporting) { drawQuad(dpr); return; }
  ctx.translate(origin.x, origin.y); ctx.scale(scale, scale); ctx.lineWidth = 1 / scale;
  const lo = world({ x: 0, y: 0 }), hi = world({ x: width, y: height });
  if (exporting) {
    ctx.lineWidth = Math.max(0.1, 1 / scale);
    const color = exportColor, ef = exportFilter, vis = ef ? ef.vis : visible, rankOut = layerRankMap(doc), list = doc.shapes.filter(vis).sort((p, q) => (rankOut.get(p.layer) || 0) - (rankOut.get(q.layer) || 0));   /* 線は、層の並びの順（手前の層が後）*/
    const exItems = color ? leatherItems(doc, vis, s => s, metalDrawItems(vis)) : []; paintLeatherItems(exItems);   /* 色つき：革色・質感・金属の色を、線の下に塗る（画面と同じ色） */
    const looks = new Map(); for (const sh of list) looks.set(sh.id, exportLineLook(sh, color && exportNeedsProbe(sh) ? exportBehindDark(sh) : false, color));   /* 線を引く前に、下の色の明暗を全部読む（先に引いた線に左右されない） */
    const outStroke = sh => { const lk = looks.get(sh.id); ctx.lineWidth = Math.max(0.1, lk.px / scale); strokeShape(sh, lk.color); };
    const exRank = sh => rankOut.get(sh.layer) || 0, exRanks = [...new Set([...list.map(exRank), ...exItems.map(it => it.li || 0)])].sort((a, b) => a - b);   /* 層ごとに：手前の層の塗りを奥の層の線の上にもう一度 → その層の線（画面と同じ重なり） */
    for (const r of exRanks) {
      if (r !== exRanks[0]) for (const it of exItems) if ((it.li || 0) === r) { ctx.save(); ctx.globalAlpha = 1; paintItem(it); ctx.restore(); }
      const layerList = list.filter(sh => exRank(sh) === r);
      if (diamondMode() === 'fill') for (const sh of layerList) { if (sh.type !== 'polyline' || !diamondLoopSizes([sh]).length) continue; ctx.save(); ctx.fillStyle = looks.get(sh.id).color; path(sh); ctx.fill(); ctx.restore(); }   /* 菱目の見せ方＝塗り：菱の線（図形）も塗る */
      for (const s of layerList) if (!(color && s.occlude)) outStroke(s);
      if (color) for (const s of layerList) if (s.occlude) { drawOccluder(s, $('pngTransparent').checked ? null : '#fff'); outStroke(s); }   /* リングアームの棒：本体の上に重ねる */
    }
    ctx.lineWidth = Math.max(0.1, 1 / scale);   /* 縫い穴の印は、いつもの太さ */
    const exAngle = faceAngler(doc, exportStitch ? stitchFace() : 'front');   /* 縫い目を入れて、面が「裏」のときは、穴も裏向き（表の鏡像）に描く */
    for (const h of doc.holes.filter(ef ? ef.hvis : holeVisible)) { const a = holeAppearance(h, doc); if (!a || (a.kind === 'dot' && markHidden(h))) continue; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(exAngle(h) * Math.PI / 180); ctx.beginPath(); if (a.kind === 'circle' || a.kind === 'dot') ctx.arc(0, 0, a.width / 2, 0, Math.PI * 2); else if (a.kind === 'slit') { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(a.width / 2, 0); } else { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(0, -a.height / 2); ctx.lineTo(a.width / 2, 0); ctx.lineTo(0, a.height / 2); ctx.closePath(); } const hc = (color && doc.paths.find(p => p.id === h.pathId)?.threadHex) || '#c00'; const halfDepth = h.depth === 'half'; if (a.kind === 'diamond' && diamondMode() === 'fill' && !halfDepth) { ctx.fillStyle = hc; ctx.fill(); } else { ctx.strokeStyle = hc; if (color) ctx.lineWidth = Math.max(0.1, 1.6 / scale); ctx.stroke(); } if (halfDepth && a.kind !== 'dot') { ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, 0, Math.max(0.15, Math.min(a.width, a.height) * 0.15), 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }   /* 半分の深さの穴は中抜き＋真ん中の点 */   /* 色つき：糸の色 */
    drawStitches(ef ? ef.hvis : holeVisible, true);   /* 「縫い目を入れて出力」：穴の上に、糸の縫い目を重ねる（選んだ図形だけの出力なら、その穴だけ） */
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
  const fillItems = viewShow.colors ? leatherItems(doc, visible, previewMoved, metalDrawItems()) : []; paintLeatherItems(fillItems); /* 革色・革の質感・型紙の輪郭の革色と、金属の色が付いた金具のべた塗り（線の下）を、層の並びの順に重ねる（画面・ほかの紙・PNG 書き出しで同じ見え方） */
  const rankDraw = layerRankMap(doc), metalEdge = metalEdgeColors(doc), strokeList = doc.shapes.filter(s => visible(s) && s.type !== 'image').sort((p, q) => (rankDraw.get(p.layer) || 0) - (rankDraw.get(q.layer) || 0)), strokeOne = s => strokeShape(gesture?.kind === 'dimOff' && gesture.preview?.has(s.id) ? { ...s, offset: gesture.preview.get(s.id) } : s.type === 'dimension' && s.anchors && gesture && !(gesture.kind === 'move' && gesture.ids.has(s.id)) ? liveDimension(s) : gesture?.kind === 'node' && gesture.id === s.id ? gesture.preview || s : gesture?.kind === 'lineEnd' && gesture.id === s.id ? handleMoved(s, gesture.h, cursor) : previewMoved(s), hl && hl.has(s.id) ? '#ff4040' : selected.has(s.id) ? '#c9a96e' : s.type === 'text' && isHex6(s.textColor) ? s.textColor : s.type === 'dimension' || s.type === 'text' ? TEXT_COLOR_DEFAULT : shapeLineColor(s) || metalEdge.get(s.id) || '#d8d8d8', s.lineStyle === 'dashed'); /* リングアーム（occlude）は、ほかの線のあとで、背景（金属の色が付いていればその塗り）で塗ってから描く：本体の縁の線がリングアームの下に隠れる（事業主の忠実な再現図 2026-10-13） */
  /* 重なりは、層ごとに「その層の塗り → その層の線」の順（事業主 2026-10-25「レイヤーの表示が崩れている」：塗りは層の順に重なるのに、線はいつも全部の塗りの上に出て、手前の層の白い塗りがリングの塗りを隠しても、リングの輪郭だけが白の上に残った）。
     塗りは先に全部まとめて描いた（半透明の色が、層をまたいでも1色に見えるため）あと、手前の層の不透明に近い塗り（白・質感・金属）を、奥の層の線の上にもう一度重ねる */
  const rankOfStroke = s => rankDraw.get(s.layer) || 0, opaqueItems = fillItems.filter(it => it.direct || it.alpha >= 0.9);
  const stackRanks = [...new Set([...strokeList.map(rankOfStroke), ...opaqueItems.map(it => it.li || 0)])].sort((a, b) => a - b);
  for (const r of stackRanks) {
    if (r !== stackRanks[0]) for (const it of opaqueItems) if ((it.li || 0) === r) { ctx.save(); ctx.globalAlpha = it.direct ? 1 : it.alpha; paintItem(it); ctx.restore(); }
    const layerStrokes = strokeList.filter(s => rankOfStroke(s) === r);
    if (diamondMode() === 'fill') for (const s of layerStrokes) { if (s.type !== 'polyline' || !diamondLoopSizes([s]).length) continue; ctx.save(); ctx.fillStyle = selected.has(s.id) ? '#c9a96e' : shapeLineColor(s) || '#d8d8d8'; path(previewMoved(s)); ctx.fill(); ctx.restore(); }   /* 菱目の見せ方＝塗り：菱の線（図形）も、穴と同じように塗る */
    if (selected.size && !exporting) { ctx.save(); ctx.lineWidth = 6 / scale; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; for (const s of layerStrokes) if (selected.has(s.id) && s.type !== 'text' && s.type !== 'dimension') strokeShape(previewMoved(s), SELECT_HALO, false); ctx.restore(); }   /* 選んだ線の下に、太い水色のふちを敷く：選んだ色（金）が黄色い点線のガイドなどと見分けにくくても、Shift で何本選んだかが見える（事業主 2026-10-23「２本選択できているか見た目でわからない」） */
    for (const s of layerStrokes) if (!s.occlude) strokeOne(s);
    for (const s of layerStrokes) if (s.occlude) { drawOccluder(s); strokeOne(s); }
  }
  ctx.setLineDash([]);
  if (mode === 'select' && selected.size === 1) { const s = doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)); if (s) drawNodes(gesture?.kind === 'node' && gesture.preview ? gesture.preview : s); }
  if (mode === 'select' && selected.size === 1) { const ln = doc.shapes.find(s => selected.has(s.id) && hasHandles(s) && editable(s)); if (ln) { const v = gesture?.kind === 'lineEnd' && gesture.id === ln.id ? handleMoved(ln, gesture.h, cursor) : ln, r = 4 / scale; ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.5 / scale; ctx.strokeStyle = '#c9a96e'; ctx.fillStyle = '#111'; for (const q of shapeHandles(v)) { ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.restore(); } } /* 直線・折れ線・矩形・円弧を1つ選ぶと、端・角にハンドル（ドラッグでその端・角だけ動く） */
  const holeAngle = faceAngler(doc, viewShow.stitch ? stitchFace() : 'front');   /* 「縫い目を見る」が入っていて、面が「裏」のときは、穴も裏向き（表の鏡像）に描く */
  for (const originalHole of doc.holes) {
    if (!holeVisible(originalHole) || (holeAppearance(originalHole, doc)?.kind === 'dot' && markHidden(originalHole))) continue;
    const owner = doc.paths.find(p=>p.id===originalHole.pathId)?.shapeIds[0];
    let h = previewMoved(originalHole, owner);
    if (gesture?.kind === 'hole' && gesture.id === h.id) h = holePosition(h, cursor);
    const appearance = holeAppearance(h, doc); if (!appearance) continue;
    const {kind,width:w,height:heightMM} = appearance;
    const halfDepth = h.depth === 'half';   /* 駒合わせの B（コバ側）の穴＝半分の深さ（貫通させない）：中抜きに真ん中の点 */
    ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(holeAngle(h)*Math.PI/180); ctx.beginPath();
    if (kind === 'dot') { const half = dotLen(h) / 2; ctx.moveTo(0,-half); ctx.lineTo(0,half); } /* 目印は、元の線と直角に交わる細かい点線（ガイドと同じ黄色）。長さは標準2mm・選んで端をつかむと変えられる */
    else if (kind === 'circle') ctx.arc(0,0,w/2,0,Math.PI*2);
    else if (kind === 'slit') { ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); }
    else { ctx.moveTo(-w/2,0); ctx.lineTo(0,-heightMM/2); ctx.lineTo(w/2,0); ctx.lineTo(0,heightMM/2); ctx.closePath(); }
    ctx.fillStyle = ctx.strokeStyle = selected.has(h.id) ? '#c9a96e' : ((viewShow.colors && doc.paths.find(p => p.id === h.pathId)?.threadHex) || '#fff');
    if (kind === 'dot') { ctx.strokeStyle = selected.has(h.id) ? '#c9a96e' : SHAPE_DRAW_COLOR.yellow; ctx.lineWidth = 1.5/scale; ctx.setLineDash([0.2,0.25]); ctx.stroke(); ctx.setLineDash([]); }
    else if (kind === 'slit') { ctx.lineWidth = halfDepth ? Math.max(0.1, heightMM / 2) : heightMM; ctx.stroke(); } else if (halfDepth || (kind === 'diamond' && diamondMode() === 'line')) { ctx.lineWidth = 1.5 / scale; ctx.stroke(); } else ctx.fill();
    if (halfDepth && kind !== 'dot') { ctx.beginPath(); ctx.arc(0, 0, Math.max(0.15, Math.min(w, heightMM) * 0.15), 0, Math.PI * 2); ctx.fill(); }   /* 菱目：線にすると輪郭だけ（レーザーで塗りがNGのとき） */
    if(selected.has(h.id)&&kind!=='dot'&&kind!=='diamond'){ctx.lineWidth=1/scale;ctx.strokeRect(-w/2-2/scale,-heightMM/2-2/scale,w+4/scale,heightMM+4/scale);}
    ctx.restore();
  }
  drawStitches();   /* 縫い目を見る（表示だけ）：穴の上に、糸の縫い目を重ねる */
  if (mode === 'stitch' && manualNext) {
    const savedPath=doc.paths.find(p=>p.id===manualNext.pathId), route=savedPath && resolvePath(doc,savedPath);
    if(route && manualNext.s <= arcLength(route)) { const p=pointAtLength(route,manualNext.s); ctx.strokeStyle='#c9a96e';ctx.lineWidth=1/scale;ctx.strokeRect(p.x-4/scale,p.y-4/scale,8/scale,8/scale); }
  }
  if (!exporting) drawOverlaps(); drawCenterMarks(); drawJunctions(); drawGapAlert(); drawGridPreview(); drawStitchPreview(); drawStitchHover(); drawCountStage(); drawChainStops(); drawGapMarks(); drawEdgeSnap();
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
  else if (mode === 'dimension' && stage?.kind === 'radius') { strokeShape({ type: 'polyline', points: stage.f.pts, closed: false }, '#4fd0ff'); if (radiusHover) strokeShape(radiusHover.dim, radiusHover.outside ? '#ff9f43' : '#4fd0ff'); }   /* 角を選んだあと：選んだ角の曲線と、できる R（内側＝水色・外側＝だいだい色） */
  else if (mode === 'dimension' && !stage && radiusCorner) strokeShape({ type: 'polyline', points: radiusCorner.pts, closed: false }, '#4fd0ff');   /* 1回目の前：選ばれる角の曲線を強調 */
  if (stage?.kind === 'mirror') strokeShape({ type: 'line', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'cmd' && stage.start && mode === 'rect') strokeShape(shapeFromDrag(stage.start, cursor), '#c9a96e');
  else if (stage?.kind === 'cmd' && stage.start) strokeShape({ type: 'line', x1: stage.start.x, y1: stage.start.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'cmd' && mode === 'circle' && stage.center && distance(stage.center, cursor) > 1e-8) strokeShape(shapeFromDrag(stage.center, cursor), '#c9a96e'); /* 中心クリック後は中心固定で半径が伸縮 */
  if (stage?.kind === 'foldDraw') strokeShape({ type: 'fold', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'imgScale') strokeShape({ type: 'line', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (tracePreviewShapes.length) { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.2 / scale; for (const s of tracePreviewShapes) strokeShape(s, '#ff4040'); ctx.restore(); }
  drawPasteGhost();
  if ($('threeView').checked) drawThreeViewGuides();
  { const seamPt = pairLines.length && komaSeamAt?.pl === pairLines ? komaSeamAt : (mode === 'koma' && komaSeam ? komaSeam : null); if (seamPt) { ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = ctx.fillStyle = '#4fd0ff'; ctx.lineWidth = 1.6 / scale; ctx.beginPath(); ctx.arc(seamPt.x, seamPt.y, 6 / scale, 0, Math.PI * 2); ctx.stroke(); ctx.font = `${12 / scale}px sans-serif`; ctx.fillText(t('komaSeamMark'), seamPt.x + 9 / scale, seamPt.y - 9 / scale); ctx.restore(); } }   /* 継ぎ目（帯の始点が当たる位置）の印 */
  if (pairLines.length) { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 0.6 / scale; ctx.strokeStyle = '#ff9f4388'; ctx.beginPath(); for (const [a, b] of pairLines) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } ctx.stroke(); ctx.restore(); }
  /* 縫い合わせ（隣り合う辺の組）の橙の点線（向かい合う穴の列を結ぶ印）は描かない（事業主 2026-10-21「菱目ラインをつなぐ点線の意味がわからない。不要です」）。縫い合わせのデータ（doc.seams）は、最適化などのためにそのまま持つ */
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
  if (snapAlign && (mode !== 'select' || gesture?.kind === 'lineEnd') && !exporting) {   /* 中心の点にそろえているとき：その点から、そろえた位置まで、細い水色の点線 */
    ctx.save(); ctx.setLineDash([5 / scale, 4 / scale]); ctx.strokeStyle = '#4fd0ff'; ctx.lineWidth = 1 / scale; ctx.beginPath();
    if (snapAlign.x !== undefined) { ctx.moveTo(snapAlign.fromX.x, snapAlign.fromX.y); ctx.lineTo(snapAlign.x, cursor.y); }
    if (snapAlign.y !== undefined) { ctx.moveTo(snapAlign.fromY.x, snapAlign.fromY.y); ctx.lineTo(cursor.x, snapAlign.y); }
    ctx.stroke(); ctx.restore();
  }
  if (snap && mode !== 'select') { ctx.strokeStyle = '#c9a96e'; ctx.strokeRect(snap.x - 4 / scale, snap.y - 4 / scale, 8 / scale, 8 / scale); }
  drawFoldCutMark(); drawFoldSectionDims(); drawFoldDims(); drawFoldHandles(); drawCircleHandles(); drawRectHandles(); drawTextHandle(); drawRotateHandle(); drawSymView(); drawLayerHover();
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
  else { const vw = viewW(), vh = viewH(), sideM = foldSectionDimList().length ? 340 : 0; /* 断面の寸法（全高・厚みの文字）が出ているときは、左右に文字の分（170pxずつ）の余白をあける */ scale = Math.max(0.1, Math.min(100, (vw - 80 - sideM) / Math.max(1, b.maxX - b.minX), (vh - 80) / Math.max(1, b.maxY - b.minY))); origin = { x: vw / 2 - (b.minX + b.maxX) / 2 * scale, y: vh / 2 - (b.minY + b.maxY) / 2 * scale }; }
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
/** 「重なった線を1本にまとめる」（選んだ範囲・事業主 2026-10-26「起動しなくても選択範囲で重複する線、曲線を全部統合する機能がほしい」）：選んだ図形の、重なった線・曲線（直線・折れ線・円弧・円）を、図面の上で1本にまとめる。
 *  塗り（領域の塗りが囲む図形）・縫い穴の経路・部品・格子の記録に使われている図形と、ロック・非表示の図形は、そのまま（重なる相手の線は、これを避けて残る）。グループ・層・線種・折り展開の線かどうかが違う線は、まとめない。元に戻すは1回。書き出しでは、これらも自動で1本にして出す（vectorOutDoc）。 */
function mergeSelectionOverlaps() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  const sel = doc.shapes.filter(s => ids.has(s.id) && visible(s) && stitchable(s)), keep = new Set([...doc.paths.flatMap(p => p.shapeIds), ...(doc.parts || []).flatMap(p => p.shapeIds || []), ...(doc.fills || []).flatMap(f => f.ids || []), ...(doc.grids || []).flatMap(g => [...(g.ids || []), ...(g.frameIds || []), ...(g.pieceIds || [])]), ...sel.filter(s => !editable(s)).map(s => s.id)]);
  const r = dedupeStrokes(sel, { keepIds: keep, splitBy: s => (groupIdOf(s) || '') + '|' + (s.foldFlat || '') });
  if (!r.touched) { $('hint').textContent = t('dedupeNone'); return; }
  const now = new Set(r.shapes.map(s => s.id)), gone = new Set(sel.filter(s => !now.has(s.id)).map(s => s.id)), made = r.shapes.filter(s => !ids.has(s.id)), kept = sel.filter(s => keep.has(s.id)).length;
  cancel();
  commit(() => { const at = doc.shapes.findIndex(s => gone.has(s.id)); doc.shapes = doc.shapes.filter(s => !gone.has(s.id)); doc.shapes.splice(Math.min(at, doc.shapes.length), 0, ...made); selected = new Set([...selected].filter(id => !gone.has(id)).concat(made.map(s => s.id))); });
  $('hint').textContent = t('dedupeDone', { mm: r.removed.toFixed(1), n: gone.size, m: made.length, keep: kept ? t('dedupeKept', { k: kept }) : '' }).trim(); draw();
}
/** 「外周の線だけ選ぶ」：選んだ図形のうち、いちばん外の輪郭をつくる線だけを選び直す（図面は変えない・事業主 2026-10-26「外周だけ青色にしたい」）。
 *  格子（パッチ）を選んでいれば、その格子の枠（作ったときの外周の線）と、枠の縁の上に重なった線。ほかは、一周つながった輪郭（outlineShapeIds）。見つからないときは、選択を変えずに案内する。 */
function selectOutline() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  const live = doc.shapes.filter(s => ids.has(s.id) && visible(s) && stitchable(s)), grids = (doc.grids || []).filter(g => (g.ids || []).some(id => ids.has(id)) || (g.frameIds || []).some(id => ids.has(id)));
  let out = [], enclosing = false;
  if (grids.length) {
    const frameSet = new Set(grids.flatMap(g => g.frameIds || [])), frame = doc.shapes.filter(s => frameSet.has(s.id) && visible(s) && stitchable(s)), set = new Set(frame.map(s => s.id));
    const rings = outerRegions(closedRegions(frame, 0.01, { dashed: true })).map(r => r.points); if (rings.length) for (const id of shapesOnRings(rings, live.filter(s => !set.has(s.id) && ['line', 'arc', 'bezier', 'polyline', 'path'].includes(s.type)))) set.add(id);
    out = [...set];
  } else { const r = outlineOf(live, { within: doc.shapes.filter(s => visible(s) && stitchable(s)) }); out = r.ids; enclosing = r.enclosing; }
  out = out.filter(id => doc.shapes.some(s => s.id === id && editable(s)));
  if (!out.length) { $('hint').textContent = t('outlineNone'); return; }
  selected = new Set(out); nodeSel = null; countUse('select_outline');
  $('hint').textContent = t(enclosing ? 'outlineSelectedAround' : 'outlineSelected', { n: out.length, len: totalLengthOf(out.map(id => doc.shapes.find(s => s.id === id))).toFixed(1) }); draw();
}
/** 一部だけ動かすと壊れるグループ（アプリが作った金具・折り目の断面図）の図形か。Ctrl+クリックでも、全体のまま。 */
const groupIsWhole = s => { const g = groupIdOf(s); return !!g && doc.shapes.some(x => groupIdOf(x) === g && (isHardwareShape(x) || x.hwSection || x.hwFor || x.foldSec || x.layer === 'section')); };
canvas.addEventListener('pointerdown', e => {
  longPressStart(e); hideCtxMenu(); hideRoundHoleBar(); /* 窓が出ているときに、図をクリックしたら、聞いている途中の操作はやめる */ /* 右クリックのメニューは、ほかをクリックしたら閉じる */
  if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
  if (isMac && e.ctrlKey && e.button === 0) return;
  e.preventDefault(); canvas.focus(); globalThis.getSelection?.()?.removeAllRanges?.(); const p = local(e); canvas.setPointerCapture(e.pointerId);   /* ページ内の文字の選択が残ったままだと、Ctrl+C を「文字のコピー」とみなして図形をコピーしない（onClipCopy）。図を押したら、文字の選択は解除する（事業主 2026-10-26「選択した図形のコピーペーストができない」・左の欄の文字が選ばれたままだった） */
  if (quadOn()) { const role = quadRoleAt(p); if (role === 'solid') { if (e.button === 0) gesture = { kind: 'spin', screen: p, yaw: miniCam.yaw, pitch: miniCam.pitch }; return; } if (role !== quadRole()) switchSheet(role); } /* 4分割：押した区画の紙に切り替える。右上は立体を回す */
  if (e.button === 1 || e.button === 2 || space) { gesture = { kind: 'pan', screen: p, origin: { ...origin } }; return; } // 右ドラッグ／中ボタン／Space で画面をつかんで動かす
  if (threeViewOn()) { const b = threeViewMiniBox(), w = world(p); if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h) { gesture = { kind: 'spin', screen: p, yaw: miniCam.yaw, pitch: miniCam.pitch }; return; } } /* 右上の小さな立体画面の中：ドラッグで回す */
  cursor = mode === 'select' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (pasteGhost && e.button === 0) { placePasteGhost(); return; }   /* 貼り付け待ち：クリックした所に貼る */
  if ((mode === 'select' || mode === 'text') && e.button === 0) { const th = textHandleHit(world(p)); if (th) { const sh = th.shape; gesture = { kind: 'textR', id: sh.id, size0: sh.sizeMm, size: sh.sizeMm, d0: { x: th.corner.x - sh.x, y: th.corner.y - sh.y } }; $('hint').textContent = t('textDrag', { size: circleNum(sh.sizeMm) }); draw(); return; } }   /* 文字の取っ手：文字ツールでも、新しい文字を置かずに大きさを変える */
  if (mode === 'paint') { paintClick(world(p), e.altKey); return; }   /* 塗りモード：クリックで塗る・Alt＋クリックで色を拾う */
  if (mode === 'centerOn') { centerOnClick(world(p)); return; }   /* 基準の図形の中央へ：クリックした外形の中央に、選んだ図形を動かす */
  if (mode === 'attach') { attachClick(world(p)); return; }   /* 線に着ける：クリックした本体の線に、選んだ金具を着ける */
  if (foldCutPicking) { foldCutPickClick(snapped(world(p), e.shiftKey, anchor())); return; }   /* 断面の位置の指定：クリックした高さ（磁石あり）を指定にして、1回で終わる */
  if (mode === 'offset' && offsetSelection && $('offsetSide').value === 'cursor' && !pickShapeAt(world(p)) && distTo({ type: 'polyline', points: offsetSelection.points, closed: offsetSelection.closed }, world(p)) <= (Number($('offsetDist').value) || 0) * 4 + 40 / scale) { offsetCursor = world(p); runOffset(); return; } /* 向き「カーソルの側」：何もない所のクリックで、その側へ実行 */
  if (mode === 'offset' || mode === 'chamfer' || mode === 'fillet') { offsetAlt = !!e.altKey; if (mode === 'offset') offsetCursor = world(p); editAt(world(p)); return; }
  if (mode === 'stitch') { if (e.altKey) stampAt(world(p), true, 'tool', false); else rangeStitchClick(world(p), e.shiftKey); return; } /* Alt＝1穴だけ／ふつうのクリック＝始点→終点の2回で範囲を決めて打つ */ /* Alt＝1つだけ・Shift＝交点から交点までの区間だけ */
  if (mode === 'divide') { divideAt(world(p)); return; }
  if (mode === 'mark') { if (markDivisions()) markByDivision(world(p)); else if (markDistance() > 0) markByDistance(world(p)); else stampAt(markSnapPoint(world(p)), true, 'dot'); return; }
  if (mode === 'detour') { detourClick(world(p)); return; }
  if (mode === 'patchfill') { gridAtPoint(world(p)); return; }
  if (mode === 'trim') { trimClick(world(p), e.shiftKey, e.altKey); return; } /* Shift＝残す側・Alt＝菱目と菱目の間だけ */
  if (mode === 'koma') { komaClick(world(p)); return; }
  if (mode === 'hardware') { placeHardware(cursor); return; }
  if (mode === 'phrase') { placePhrase(cursor); return; }
  if (mode === 'library') { placeLibrary(cursor); return; }
  if (mode === 'imgScale') { if (stage?.kind !== 'imgScale') { stage = { kind: 'imgScale', a: world(p) }; $('hint').textContent = t('imgScaleSecond'); } else imgScaleSecond(world(p)); draw(); return; }
  if (mode === 'fold') { if (stage?.kind !== 'foldDraw') stage = { kind: 'foldDraw', a: cursor }; else { const a = stage.a; stage = null; if (distance(a, cursor) > 1e-8) { const mid = { x: (a.x + cursor.x) / 2, y: (a.y + cursor.y) / 2 }, host = doc.shapes.find(s => (s.type === 'polyline' || s.type === 'path') && s.closed && partOf(s) && (b => b.minX <= mid.x && b.maxX >= mid.x && b.minY <= mid.y && b.maxY >= mid.y)(bboxOf(s))); addShape({ type: 'fold', x1: a.x, y1: a.y, x2: cursor.x, y2: cursor.y, angleDeg: Number($('foldAngle').value) || 0, partId: host ? partOf(host).id : null, inner: $('foldInner').checked }); } } lastPoint = cursor; draw(); return; }
  if (mode === 'text') { const content = askText(); if (content) { addShape({ type: 'text', x: cursor.x, y: cursor.y, text: content, sizeMm: Number($('textSize').value) || 5, angleDeg: 0, ...newTextFont() }); lastPoint = cursor; } return; }
  if (mode === 'circle' && circleSizeNow()) { placeCircleBySize(cursor); return; } /* 半径・直径が入っている：クリックした位置を中心に、その大きさの円を置く */
  if (mode === 'rect' && rectSizeNow()) { placeRectBySize(cursor); return; } /* 幅・高さが入っている：クリックした位置に、その大きさの矩形を置く */
  if (mode === 'bezier') { bezierClick(cursor); return; }
  if (mode === 'ruler') { rulerClick(cursor); return; }   /* 定規＝2点間の距離をちょっと測るだけ（寸法は作らない・事業主指示 2026-10-15） */
  if (mode === 'dimension') { dimToolClick(cursor, world(p)); return; }   /* 寸法＝2点で測り、3点目をクリックした位置に初めて寸法を作る（1回目が丸めた角の上なら、その角の R の寸法） */
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
  if (mode === 'select' && e.button === 0) { const fh = foldHandleAt(p); if (fh) { startFoldHandleDrag(fh, world(p), p); return; } }
  if (mode === 'select' && e.button === 0 && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey && !pickShapeAt(cursor)) { const dk = foldDimKeyAt(p); if (dk) { openFoldHandleBar({ key: dk }); return; } }   /* 断面の寸法をクリック：その数字を入れる小窓（線・文字の下に図形があるときは、図形の選択が先） */
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
      if (rectHasHoles(rh.shape)) { $('hint').textContent = t('rectHoles'); draw(); return; }   /* 縫い穴が付いている矩形は、穴を壊さないよう動かさない（線の端と同じ） */
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
      const oneOfGroup = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !groupIsWhole(hit);   /* Ctrl+クリック（Mac は ⌘）：グループの中の、押した図形1個だけ（事業主 2026-10-26「円だけ消したい。パッチの境界がすべて反応してしまう」） */
      if (oneOfGroup) { const inGroup = !!groupIdOf(hit) && doc.shapes.some(x => x.id !== hit.id && groupIdOf(x) === groupIdOf(hit)); selected = new Set([hit.id]); nodeSel = null; if (inGroup) $('hint').textContent = t('groupOnePicked'); }
      else if (!selected.has(hit.id)) { selected = expandToGroups(doc.shapes, new Set([hit.id])); nodeSel = null; if (selected.size > 1 && !e.shiftKey) $('hint').textContent = t('groupPickedHint', { n: selected.size }); } /* グループの図形なら全体を選ぶ（1個だけ選ぶ方法も案内） */
      if (hit.type === 'dimension' && !e.shiftKey && dimOnlySelection()) { const ids = selectedShapeIds(); gesture = { kind: 'dimOff', start: cursor, screen: p, ids, base: new Map([...ids].map(id => [id, doc.shapes.find(s => s.id === id).offset])), preview: null }; draw(); return; }   /* 寸法線だけをつかんだ：線だけ動かす（測る点は動かない）。Shift を押しながらなら、今までどおり寸法ごと動く */
      gesture = { kind: 'move', start: cursor, screen: p, ids: selectedShapeIds(), ...(e.shiftKey ? { shiftToggle: hit.id } : {}) }; /* 単なるクリックでは節点を増やさない（右クリック・ダブルクリックのときだけ） */
      beginMoveSnap(gesture); /* 掴んだ所が選んだ図形の端・中点・中心の近くなら、その点を「基点」にして、離す所で相手の点に合わせる */
    } else { gesture = { kind: 'select', start: cursor, screen: p, additive: e.shiftKey }; if (!e.shiftKey) nodeSel = null; }
  }
  else if (stage) { gesture = { kind: 'stage' }; }
  else { gesture = { kind: 'draw', start: cursor }; }
  draw();
});
canvas.addEventListener('pointermove', e => {
  longPressMove(e);
  const p = local(e);
  if (gesture?.kind === 'foldHandle') { dragFoldHandle(world(p)); return; }
  if (gesture?.kind === 'rotate') { const c = world(p); cursor = c; gesture.cursor = c; gesture.angle = rotateAngleNow(gesture, c, e.shiftKey); $('hint').textContent = t('rotDrag', { a: gesture.angle }); draw(); return; }
  if (gesture?.kind === 'circleR') { const c = snapped(world(p), e.shiftKey, { x: gesture.cx, y: gesture.cy }); cursor = c; gesture.r = Math.max(0.05, Math.round(distance({ x: gesture.cx, y: gesture.cy }, c) * 1000) / 1000); $('hint').textContent = t('circleDrag', { r: circleNum(gesture.r), d: circleNum(gesture.r * 2) }); draw(); return; }
  if (gesture?.kind === 'textR') { const c = world(p), sh = doc.shapes.find(x => x.id === gesture.id); cursor = c; if (sh) { gesture.size = textSizeFrom(gesture, sh, c); $('hint').textContent = t('textDrag', { size: circleNum(gesture.size) }); } draw(); return; }
  if (gesture?.kind === 'rectR') { const c = snapped(world(p), false, null); cursor = c; gesture.box = rectResized(gesture, c, e.shiftKey); $('hint').textContent = t('rectDrag', { w: circleNum(gesture.box.x1 - gesture.box.x0), h: circleNum(gesture.box.y1 - gesture.box.y0) }); draw(); return; }
  if (!gesture && (mode === 'select' || mode === 'text')) { const hot = !!textHandleHit(world(p)); if (hot !== textHot) { textHot = hot; canvas.style.cursor = hot ? 'nesw-resize' : ''; draw(); } }
  if (!gesture && mode === 'select') { const rhot = (() => { const hh = rectHandleHit(world(p)); return hh ? rectHandlePoints(rectBoxOf(hh.shape)).findIndex(q => q.ix === hh.h.ix && q.iy === hh.h.iy) : null; })(); if (rhot !== rectHot) { rectHot = rhot; canvas.style.cursor = rhot !== null ? 'nwse-resize' : ''; draw(); } }
  if (!gesture && mode === 'select') { const hot = circleHandleHit(world(p))?.k ?? null; if (hot !== circleHot) { circleHot = hot; canvas.style.cursor = hot !== null ? 'nesw-resize' : ''; draw(); } }
  if (!gesture && mode === 'select') { const hot = foldHandleAt(p)?.key ?? null, dimHot = hot ? null : foldDimKeyAt(p); if (hot !== fdHandleHot || dimHot !== fdDimHot) { fdHandleHot = hot; fdDimHot = dimHot; canvas.style.cursor = hot ? 'ew-resize' : dimHot ? 'pointer' : ''; draw(); } }
  if (quadOn()) quadHover = quadRoleAt(p);
  stitchHover = mode === 'stitch' && !gesture ? stitchHoverAt(world(p)) : null; /* 目打ち：吸い付く点に印（輪）を出す */
  if (mode === 'stitch' && !gesture) { stitchLastW = world(p); syncStitchPreview(stitchLastW, e.shiftKey); } else if (stitchPreview || stitchRouteIds) clearStitchPreview();   /* 目打ち：打つ前の薄い表示（打つ穴・経路） */
  if (gesture?.kind === 'spin') { miniCam = { yaw: gesture.yaw + (p.x - gesture.screen.x) * 0.5, pitch: Math.max(-89, Math.min(89, gesture.pitch - (p.y - gesture.screen.y) * 0.5)) }; draw(); return; }
  if (gesture?.kind === 'pan') { origin = { x: gesture.origin.x + p.x - gesture.screen.x, y: gesture.origin.y + p.y - gesture.screen.y }; cursor = world(p); }
  else cursor = gesture?.kind === 'move' ? (gesture.moved ||= distance(p, gesture.screen) >= 4) ? movePosition(gesture.lastWorld = world(p), e.shiftKey, e.altKey) : { ...gesture.start } :   /* つかんで 4px 動くまでは、動かさない（クリック・ダブルクリックのぶれで、吸着の分だけ一瞬ずれていた）。4px は、離したときに動かすか決める値と同じ */ mode === 'select' && gesture?.kind !== 'node' && gesture?.kind !== 'lineEnd' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (mode === 'offset') offsetCursor = world(p); /* 向き「カーソルの側」：カーソル位置を覚えて、ずらした結果をプレビュー */
  updateRadiusHover(world(p));
  if (gesture?.kind === 'lineEnd' || (gesture?.kind === 'node' && gesture.dir)) cursor = lineEndCursor(gesture, world(p), e.shiftKey || !!gesture.holed);
  if (gesture?.kind === 'node') { const s = doc.shapes.find(s => s.id === gesture.id); gesture.alt = gesture.alt || e.altKey; if (s) gesture.preview = editedNodePath(s, gesture, cursor); }
  if (gesture?.kind === 'dimOff') gesture.preview = dimOffPreview(gesture, cursor);
  draw();
});
/** 右クリック：曲線（ペン・ベジェ）の経由点を、その場で足す／消す。点の上＝その点を削除、曲線の上＝そこに経由点を追加。描いている途中は何もしない。 */
/** 右クリックのメニュー（選んだ図形を部品ライブラリに登録する）を、クリックした位置のそばに出す。 */
/** 右メニュー（右の細長い列）の項目＝見えているカード。右クリックのメニューに並べて、長い列をスクロールせずに開けるようにする。 */
/* ───────── 右メニューの分類タブ（事業主の決定 2026-10-19「右メニューがわかりにくい。情報量が多いので」→ 分類タブ＋三つ折りは手順画面）。28 枚のカードを6つの分類（data-side）に分け、選んだ分類のカードだけを出す。ツールを選ぶ・右クリックで開くと、そのカードの分類へ自動で切り替える。 ───────── */
const SIDE_TABS = ['shape', 'stitch', 'color', 'fold', 'parts', 'out'], SIDE_TAB_KEY = 'leather-cad.sideTab';
let sideTab = 'shape';
/** 右メニューのカードの並び（分類ごと・使う順）：三つ折りは「設計→断面図→設計（厚み）→3D」・出力は先頭。HTML の並びは変えず、起動時に DOM を並べ替える（カードの中身・イベントはそのまま）。 */
const SIDE_ORDER = ['infoCard', 'hwEditCard', 'moveCard', 'scaleCard', 'vertexCard', 'arrayCard', 'alignCard', 'layerCard', 'textFontCard', 'drawCard', 'autoDimCard', 'stitchCard', 'holeShapeCard', 'presetCard', 'patchCard', 'colorCard', 'foldDesignCard', 'foldSecCard', 'designCard', 'card3d', 'libCard', 'binderCard', 'hwCard', 'outputCard', 'imgCard', 'recipeCard', 'voiceCard', 'aiCard', 'calcCard', 'phraseCard'];
function orderSideCards() { const side = $('side'); if (!side?.appendChild) return; for (const id of SIDE_ORDER) { const el = $(id); if (el && el.parentElement === side) side.appendChild(el); } }
const sideGroupOf = c => c?.dataset?.side || null;
function showSideTab(name, { save = true } = {}) {
  if (!SIDE_TABS.includes(name)) name = 'shape'; sideTab = name;
  for (const c of document.querySelectorAll('#side details.card') || []) c.classList?.toggle('tab-off', sideGroupOf(c) !== name);
  for (const b of document.querySelectorAll('#sideTabs [data-side-tab]') || []) b.setAttribute?.('aria-selected', String(b.dataset?.sideTab === name));
  if (save) try { localStorage.setItem(SIDE_TAB_KEY, name); } catch { /* 保存できなくても続ける */ }
}
/** カード（または、その中の部品）を見せる：そのカードの分類のタブへ切り替え、閉じている右の列を、そのカード1枚だけで開く。分類の無い（古い・別の）カードは何もしない。 */
function revealCard(el) { let c = el; while (c && !(c.tagName === 'DETAILS' && sideGroupOf(c))) c = c.parentElement; const g = sideGroupOf(c); if (g && g !== sideTab) showSideTab(g); if (c && g) openSidePanel(c); }
/** 右の列（パネル）は普段は閉じる（body.side-closed）。card があれば、そのカード1枚だけ（body.side-single・カードに data-only）、無ければ分類タブつきの全部を出す。窓（data-win）として出ているカードは、右の列を開かない。 */
function sidePanelOpen() { return !document.body?.classList?.contains('side-closed'); }
function clearSideOnly() { for (const c of document.querySelectorAll('#side details.card') || []) { if (c.dataset) delete c.dataset.only; } }
function openSidePanel(card = null) {
  const b = document.body; if (!b?.classList || card?.dataset?.win === '1') return;
  b.classList.remove('side-closed'); b.classList.add('side-open'); clearSideOnly();   /* side-open はスマホの引き出し用（パソコン幅では何も起きない） */
  if (card) { card.dataset.only = '1'; card.open = true; b.classList.add('side-single'); b.classList.remove('side-list'); $('sideHeadTitle').textContent = card.querySelector?.('summary')?.textContent || ''; } else { b.classList.remove('side-single'); b.classList.add('side-list'); $('sideHeadTitle').textContent = t('sideListTitle'); renderSideMenu(); }   /* カードを指さなければ、右クリックメニューと同じ一覧を出す */
  syncSideToggle(); $('sidePanelBtn')?.setAttribute?.('aria-pressed', 'true'); const sp = readWinPos(SIDE_POS_KEY); if (sp) floatSide(sp); else resize();   /* 動かしたことがあれば、覚えている位置に浮かせて出す */
}
function closeSidePanel() {
  const b = document.body; if (!b?.classList) return;
  b.classList.add('side-closed'); b.classList.remove('side-single'); b.classList.remove('side-list'); b.classList.remove('side-open'); clearSideOnly(); syncSideToggle(); $('sidePanelBtn')?.setAttribute?.('aria-pressed', 'false'); resize();
}
function syncSideToggle() { const tg = $('sideToggle'); if (!tg?.setAttribute) return; const open = !!document.body?.classList?.contains('side-open'); tg.textContent = t(open ? 'sideToggleClose' : 'sideToggleOpen'); tg.setAttribute('aria-expanded', String(open)); }   /* スマホの引き出しのボタンの文字と状態を、いまの開け閉めに合わせる */
/** パネルの一覧：右クリックメニューと同じ「カテゴリ → 項目」（事業主 2026-10-27「パネルはスマホのように右クリックが押せない場合の対応なので、右クリックメニューと同じ内容とすべきでは？」）。
 *  右クリックメニューの項目（ctxFly-カテゴリの中の、いま押せるもの）の写しを作り、押すと元のボタンを押す＝右クリックで選んだときと同じ動き。項目を足せば、パネルにも自動で出る。
 *  カードの項目は、いまの「1枚だけ表示」（revealCard）で開き、「← 一覧」で戻る。開いているカテゴリは覚えておく。 */
const sideMenuOpen = new Set(); let sideMenuTimer = null;
const sideListShown = () => { const cl = document.body?.classList; return typeof cl?.contains === 'function' && cl.contains('side-list') && !cl.contains('side-closed'); };   /* body の classList を持たない環境（試験の擬似画面）でも止まらない */
/** 最近使った項目（2026-10-28 事業主「パネルの一覧の先頭に、最近使った項目を出す」）：右クリックメニューの項目を、押した順（パネルの一覧から押しても、右クリックで押しても）に覚え、一覧の先頭に「最近使った」として最大5つ出す。
 *  覚えるのは項目のキーだけ（項目の id・選択中の操作の名前・カードの名前）で、ブラウザに残す。いま押せない項目は出さない（覚えたまま、押せるようになれば戻る）。 */
const SIDE_RECENT_KEY = 'leather-cad.sideRecent', SIDE_RECENT_SAVE = 10, SIDE_RECENT_SHOW = 5;
let sideRecentKeys = null, sideRecentClosed = false;
const sideItemKey = b => b?.id || (b?.dataset?.ctxFor ? 'sel:' + b.dataset.ctxFor : (String(b?.parentNode?.id || '').startsWith('ctxCards-') ? 'card:' + String(b.textContent || '').trim() : ''));   /* キーを作れない項目（レイヤーの一覧など）は、覚えない */
function loadSideRecent() { if (!sideRecentKeys) { sideRecentKeys = []; try { const v = JSON.parse(localStorage.getItem(SIDE_RECENT_KEY) || '[]'); if (Array.isArray(v)) sideRecentKeys = v.filter(k => typeof k === 'string' && k && k.length <= 80).slice(0, SIDE_RECENT_SAVE); } catch { /* 読めなければ、空から */ } } return sideRecentKeys; }
function noteSideRecent(key) { if (!key) return; const list = loadSideRecent(), i = list.indexOf(key); if (i >= 0) list.splice(i, 1); list.unshift(key); if (list.length > SIDE_RECENT_SAVE) list.length = SIDE_RECENT_SAVE; try { localStorage.setItem(SIDE_RECENT_KEY, JSON.stringify(list)); } catch { /* 保存できなくても、この画面の間は覚える */ } }
function initSideRecent() { $('ctxMenu')?.addEventListener?.('click', e => { const b = e.target?.closest?.('button'); if (b && b.closest?.('[id^="ctxFly-"]')) noteSideRecent(sideItemKey(b)); }); }   /* 右クリックで押した項目も覚える（一覧の写しを押したときは、元の項目のクリックがここへ届く） */
/** 右クリックメニューの入れ物（flyout）の中の、いま出る項目を、順に fn(要素, 'button' | 'title') へ渡す。パネルの一覧（renderSideMenu）と、右クリックの「最近使った」（fillCtxRecent）が、同じ見方（いま出る・押せる）を使うための共通の歩き方。
 *  いま出ない項目（hidden）・押せない項目（disabled）は渡さない（面取りの「丸・角」だけは、右クリックでは押して開くので、パネルでは最初から並べる）。面取りの見出しボタン（ctx-chamfer）は、押す項目でなく見出しとして渡す。 */
function walkCtxItems(el, fn) {
  for (const c of el?.children ? [...el.children] : []) {
    if (c.hidden && c.id !== 'ctxChamferSub') continue;
    if (c.tagName === 'BUTTON') { if (c.disabled) continue; fn(c, c.id === 'ctx-chamfer' ? 'title' : 'button'); }
    else if (c.classList?.contains('ctx-title')) fn(c, 'title'); else walkCtxItems(c, fn);
  }
}
/** 右クリックメニューの先頭の「最近使った」（2026-10-28 事業主「「最近使った」を、右クリックメニューの先頭にも出す」→ 先頭に項目を直接並べる）：パネルと同じ記録（noteSideRecent）から、いま押せるものを最大5つ。押すと、メニューを閉じて元の項目を押す。 */
function fillCtxRecent() {
  const box = $('ctxRecent'); if (!box?.appendChild || typeof document.createElement !== 'function') return;
  box.textContent = ''; const pool = new Map();
  for (const [cat] of CTX_CATS) walkCtxItems($('ctxFly-' + cat), (c, kind) => { if (kind !== 'button') return; const key = sideItemKey(c); if (key) pool.set(key, c); });
  const blk = recentBlock(pool, (c, key) => { noteSideRecent(key); hideCtxMenu(); c.click(); }, fillCtxRecent); box.hidden = !blk; if (!blk) return;
  const h = document.createElement('div'), title = document.createElement('span'); h.className = 'ctx-title recent-head'; title.textContent = t('sideRecentTitle'); h.appendChild(title); h.appendChild(blk.clear); box.appendChild(h);   /* 見出しの右に「消す」 */
  for (const row of blk.rows) box.appendChild(row);
}
/** 「最近使った」の固定・消す（2026-10-28 事業主「「最近使った」を消す・固定するボタン（よく使う項目を先頭に固定）」→ 各項目に★・見出しに「消す」・パネルと右クリックの両方）。
 *  ★で固定した項目は、いつも先頭（固定した順）。そのあとに、固定していない最近使った項目（新しい順）。合わせて最大5つ（固定は最大5つ）。「消す」は、固定していない履歴を消す（固定は残る）。
 *  固定も履歴も、キーだけをブラウザに残す。いま押せない項目は出さない（固定したままなら、押せるようになれば戻る）。 */
const SIDE_PIN_KEY = 'leather-cad.sidePinned', SIDE_PIN_MAX = 5;
let sidePinnedKeys = null;
function loadSidePinned() { if (!sidePinnedKeys) { sidePinnedKeys = []; try { const v = JSON.parse(localStorage.getItem(SIDE_PIN_KEY) || '[]'); if (Array.isArray(v)) sidePinnedKeys = v.filter(k => typeof k === 'string' && k && k.length <= 80).slice(0, SIDE_PIN_MAX); } catch { /* 読めなければ、空から */ } } return sidePinnedKeys; }
function toggleSidePin(key) {   /* 固定する／はずす。固定が最大5つのときは、案内を出して何もしない（false を返す） */
  if (!key) return false; const list = loadSidePinned(), i = list.indexOf(key);
  if (i >= 0) list.splice(i, 1); else { if (list.length >= SIDE_PIN_MAX) { $('hint').textContent = t('recentPinFull'); return false; } list.push(key); }
  try { localStorage.setItem(SIDE_PIN_KEY, JSON.stringify(list)); } catch { /* 保存できなくても、この画面の間は覚える */ } return true;
}
function clearSideRecent() { sideRecentKeys = []; try { localStorage.setItem(SIDE_RECENT_KEY, '[]'); } catch { /* 保存できなくても、この画面の間は消えている */ } }   /* 固定（sidePinnedKeys）は触らない */
const sideRecentList = pool => { const pinned = loadSidePinned().filter(k => pool.has(k)), rest = loadSideRecent().filter(k => pool.has(k) && !pinned.includes(k)); return [...pinned.map(key => ({ key, pinned: true })), ...rest.map(key => ({ key, pinned: false }))].slice(0, SIDE_RECENT_SHOW); };
/** 「最近使った」の行（項目の写し＋★）と、見出し用の「消す」ボタンを作る。出す項目が無ければ null。press(元の項目, キー)：項目を押したときの動き。refresh：★・消すのあとに、作り直す関数。 */
function recentBlock(pool, press, refresh) {
  const list = sideRecentList(pool); if (!list.length) return null;
  const rows = list.map(({ key, pinned }) => {
    const c = pool.get(key), row = document.createElement('div'), x = c.cloneNode(true), pin = document.createElement('button');
    x.removeAttribute?.('id'); x.hidden = false; x.onclick = () => press(c, key);
    row.className = 'recent-row'; pin.type = 'button'; pin.className = 'recent-pin' + (pinned ? ' on' : ''); pin.textContent = pinned ? '★' : '☆'; pin.title = t(pinned ? 'recentUnpinTip' : 'recentPinTip'); pin.setAttribute?.('aria-pressed', String(pinned));
    pin.onclick = e => { e?.stopPropagation?.(); toggleSidePin(key); refresh(); };
    row.appendChild(x); row.appendChild(pin); return row;
  });
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'recent-clear'; clear.textContent = t('recentClear'); clear.title = t('recentClearTip'); clear.hidden = list.every(x => x.pinned);   /* 固定だけのときは、消すものが無い */
  clear.onclick = e => { e?.preventDefault?.(); e?.stopPropagation?.(); clearSideRecent(); refresh(); };   /* 見出し（summary）の中のボタンでも、開け閉めさせない */
  return { rows, clear };
}
function renderSideMenu() {
  const box = $('sideMenu'); if (!box?.appendChild || typeof document.createElement !== 'function') return;
  prepareCtxMenu(); box.textContent = '';
  const mine = src => { const x = src.cloneNode(true); x.removeAttribute?.('id'); x.hidden = false; return x; };
  const pool = new Map(), cats = [], item = (c, key) => { const x = mine(c); x.onclick = () => { noteSideRecent(key); c.click(); scheduleSideMenu(); }; return x; };   /* pool：キー → いま押せる元の項目（「最近使った」の写しの元） */
  const collect = (el, out) => walkCtxItems(el, (c, kind) => {
    if (kind === 'title') { if (c.id === 'ctx-chamfer') { const h = document.createElement('div'); h.className = 'ctx-title'; h.textContent = c.textContent; out.push(h); } else out.push(mine(c)); }
    else { const key = sideItemKey(c); if (key) pool.set(key, c); out.push(item(c, key)); }
  });
  for (const [cat] of CTX_CATS) {
    const head = $('ctxCatBtn-' + cat), fly = $('ctxFly-' + cat); if (!head || !fly) continue;
    const items = []; collect(fly, items); if (!items.some(x => x.tagName === 'BUTTON')) continue;   /* 押せる項目が1つも無いカテゴリは出さない（右クリックと同じ） */
    const d = document.createElement('details'), s = document.createElement('summary'), list = document.createElement('div');
    d.className = 'side-menu-cat'; d.dataset.cat = cat; d.open = sideMenuOpen.has(cat); s.textContent = head.textContent; list.className = 'side-menu-items'; for (const x of items) list.appendChild(x); d.appendChild(s); d.appendChild(list);
    d.addEventListener?.('toggle', () => { if (d.open) sideMenuOpen.add(cat); else sideMenuOpen.delete(cat); }); cats.push(d);
  }
  const blk = recentBlock(pool, (c, key) => { noteSideRecent(key); c.click(); scheduleSideMenu(); }, renderSideMenu);   /* 先頭に「最近使った」（固定した項目→最近使った項目・いま押せるものだけ・最大5つ・初めは開いている） */
  if (blk) {
    const d = document.createElement('details'), s = document.createElement('summary'), title = document.createElement('span'), list = document.createElement('div');
    d.className = 'side-menu-cat side-menu-recent'; d.open = !sideRecentClosed; title.textContent = t('sideRecentTitle'); s.className = 'recent-head'; s.appendChild(title); s.appendChild(blk.clear); list.className = 'side-menu-items'; for (const row of blk.rows) list.appendChild(row); d.appendChild(s); d.appendChild(list);
    d.addEventListener?.('toggle', () => { sideRecentClosed = !d.open; }); box.appendChild(d);
  }
  for (const d of cats) box.appendChild(d);
  if (!box.children?.length) { const p = document.createElement('div'); p.className = 'note'; p.textContent = t('sideMenuEmpty'); box.appendChild(p); }
}
/** 一覧を出している間だけ、選択や図面が変わったあとに、少し待って1回だけ作り直す（押せる項目が変わるため）。 */
function scheduleSideMenu() { if (!sideListShown() || sideMenuTimer || typeof setTimeout !== 'function') return; sideMenuTimer = setTimeout(() => { sideMenuTimer = null; if (sideListShown()) renderSideMenu(); }, 120); }
/* ───────── 右の列・折りの小窓を、自分の好きな位置へ動かせる（事業主 2026-10-24「自分で右クリックメニューのカード位置を動かせるようにしたい」「メニューが邪魔で押せない」）：見出しをつかんで動かす（画面の外へは出さない）。
   位置はブラウザに覚え、開き直したときも同じ所に出す。ダブルクリックで元の位置へ。右の列は、動かすと「浮く」（作業の場所を広く使える形・ほかの窓と同じ） ───────── */
const SIDE_POS_KEY = 'leather-cad.sidePos', FLOW_POS_KEY = 'leather-cad.flowPos';
function readWinPos(key) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && Number.isFinite(v.left) && Number.isFinite(v.top) ? v : null; } catch { return null; } }
function saveWinPos(key, pos) { try { if (pos) localStorage.setItem(key, JSON.stringify(pos)); else localStorage.removeItem(key); } catch { /* 保存できなくても、動かすことはできる */ } }
/** 窓の左上が、画面の中に収まる位置にする（幅 w の窓・上は80px 以上、画面に残す）。 */
function clampWinPos(left, top, w) { const vw = typeof innerWidth === 'number' ? innerWidth : 1e9, vh = typeof innerHeight === 'number' ? innerHeight : 1e9; return { left: Math.round(Math.min(Math.max(0, left), Math.max(0, vw - Math.min(w, vw)))), top: Math.round(Math.min(Math.max(0, top), Math.max(0, vh - 80))) }; }
function placeSide(left, top) { const p = clampWinPos(left, top, 288), st = $('side').style; st.left = p.left + 'px'; st.top = p.top + 'px'; st.right = 'auto'; return p; }
function floatSide(pos = null) { if (pos) placeSide(pos.left, pos.top); document.body?.classList?.add('side-float'); resize(); }
function unfloatSide() { const st = $('side').style; document.body?.classList?.remove('side-float'); st.left = st.top = st.right = ''; saveWinPos(SIDE_POS_KEY, null); resize(); }
function placeFlowWin(left, top) { const p = clampWinPos(left, top, 320), st = $('foldFlowDialog').style; st.left = p.left + 'px'; st.top = p.top + 'px'; st.right = 'auto'; st.maxHeight = Math.max(160, (typeof innerHeight === 'number' ? innerHeight : 800) - p.top - 8) + 'px'; return p; }
function unplaceFlowWin() { const st = $('foldFlowDialog').style; st.left = st.top = st.right = st.maxHeight = ''; saveWinPos(FLOW_POS_KEY, null); }
/** 見出し head をつかんで box を動かす共通の処理。4ピクセル動かしてから動き出す（クリック・ボタンは邪魔しない）。 */
function makeDraggable(head, { box, start, move, done, reset }) {
  let d = null;
  head.addEventListener('pointerdown', e => { if (e.target?.closest?.('button, select, input')) return; const r = box().getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, left: r.left, top: r.top, moved: false, pos: null }; head.setPointerCapture?.(e.pointerId); });
  head.addEventListener('pointermove', e => { if (!d) return; if (!d.moved) { if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return; d.moved = true; start?.(d); } d.pos = move(e.clientX - d.dx, e.clientY - d.dy); });
  const end = () => { if (d?.moved && d.pos) done(d.pos); d = null; }; head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  head.addEventListener('dblclick', e => { if (e.target?.closest?.('button, select, input')) return; reset(); });
}
/** 折りの小窓の細かい説明（グレーの注）を、出す・隠す。初期は隠す（窓が大きすぎる・事業主 2026-10-24）。選んだ状態はブラウザに覚える。 */
const FLOW_NOTES_KEY = 'leather-cad.flowNotes';
function setFlowNotes(show, save = true) { const d = $('foldFlowDialog'); if (d?.dataset) d.dataset.notes = show ? 'show' : 'hide'; $('foldFlowNotes')?.setAttribute?.('aria-pressed', String(!!show)); if (save) { try { localStorage.setItem(FLOW_NOTES_KEY, show ? '1' : '0'); } catch { /* 保存できなくても切り替えはできる */ } } }
function initFlowNotes() { let v = null; try { v = localStorage.getItem(FLOW_NOTES_KEY); } catch { /* 読めなければ、隠したまま */ } setFlowNotes(v === '1', false); $('foldFlowNotes').onclick = () => setFlowNotes($('foldFlowDialog').dataset.notes !== 'show'); }
function initWinDrag() {
  makeDraggable($('sideHead'), { box: () => $('side'), start: d => { if (!document.body?.classList?.contains('side-float')) floatSide({ left: d.left, top: d.top }); }, move: placeSide, done: p => saveWinPos(SIDE_POS_KEY, p), reset: unfloatSide });
  makeDraggable($('foldFlowHead'), { box: () => $('foldFlowDialog'), move: placeFlowWin, done: p => saveWinPos(FLOW_POS_KEY, p), reset: unplaceFlowWin });
}
function initSideTabs() {
  orderSideCards(); let v = null; try { v = localStorage.getItem(SIDE_TAB_KEY); } catch { /* 読めなくても続ける */ }
  showSideTab(SIDE_TABS.includes(v) ? v : 'shape', { save: false });
  for (const b of document.querySelectorAll('#sideTabs [data-side-tab]') || []) b.onclick = () => showSideTab(b.dataset.sideTab);
  initWinDrag(); initFlowNotes(); initFlowMargin(); initFlowPlanOptions(); initFlowFold(); $('sideClose').onclick = closeSidePanel; $('sideAll').onclick = () => openSidePanel(null); $('sidePanelBtn').onclick = () => { if (sidePanelOpen()) closeSidePanel(); else openSidePanel(null); };
}
const ctxCardList = () => [...(document.querySelectorAll('#side details.card') || [])].filter(c => !c.hidden && c.querySelector('summary')).map((c, i) => ({ c, i, k: SIDE_TABS.indexOf(sideGroupOf(c)) })).sort((x, y) => (x.k < 0 ? 99 : x.k) - (y.k < 0 ? 99 : y.k) || x.i - y.i).map(x => x.c);
/** 右クリック →「シミュレーション」→「2つ折り」「3つ折り」：折りシミュレーションの小窓を、その折り方で開く（折り方が変わるときは、小窓の「折り方」を切り替えたときと同じ＝有料版のロックも同じ）。 */
function openFoldSim(mode) {
  if ($('fdMode').value !== mode) { if (!lockGate('fold')) return; $('fdMode').value = mode; $('fdMode').onchange?.(); }
  setFlowWin(true); renderFoldFlow();
}
function setFlowWin(on) { $('foldFlowDialog').open = on; if (on && foldIsBifold()) $('foldFlowMore').open = true; if (on) { const fp = readWinPos(FLOW_POS_KEY); if (fp) placeFlowWin(fp.left, fp.top); } }   /* 三つ折りの手順（①〜⑤とボタン）の小窓の開け閉め。モーダルにしないので、開いたまま図面を触れる */
function fillCtxCards() {
  const box = $('ctxCards'), cards = ctxCardList().filter(c => c !== $('patchCard')).filter(c => c !== $('holeShapeCard')).filter(c => c !== $('textFontCard')).filter(c => c !== $('moveCard') && c !== $('scaleCard'));   /* 移動・拡大縮小の窓は、「選んだ図形」の「移動…」「拡大縮小」から開く（同じ窓が、作図オプション側にも並んで重なっていた・事業主 2026-10-28「他のメニューも同様」） */   /* 「菱目・丸目をまとめて変える」は、専用の項目（ctx-holeshape）から開く窓。窓を開いている間、一覧に同じ項目が重ねて出ないようにする */ box.innerHTML = '';   /* パッチワークは、上の「パッチワーク」のまとまりの「柄（パッチワーク）」で開く（同じ窓が2つの項目から開く重複をなくす・事業主 2026-10-25） */
  let lastGroup = null;   /* 分類ごとの見出し（分類の無いカードは見出しなし） */
  let foldSim = false;   /* 三つ折りの分類は、カードを並べず「三つ折りシミュレーション」の1項目にする（事業主指示 2026-10-21「三つ折り機能は、統括して「三つ折りシミュレーション」として〇iの内容を表示させるだけでよい」・右メニュー＝右クリックメニュー）。押すと、これまでⓘで開いていた手順の小窓（①〜⑤とボタン）を開く */
  for (const c of cards) { const g = sideGroupOf(c); if (g && g !== lastGroup) { const h = document.createElement('div'); h.className = 'ctx-group'; h.textContent = t('sideTabTip_' + g).split('（')[0].split(' (')[0];   /* 見出しは、説明の前の部分だけ（「図形・寸法」など） */ box.appendChild(h); lastGroup = g; }
    if (g === 'fold') { if (!foldSim) { foldSim = true; for (const [mode, key] of [['bifold', 'ctxSimBifold'], ['trifold', 'ctxSimTrifold']]) { const s = document.createElement('button'); if (s.dataset) s.dataset.cat = 'sim'; s.textContent = t(key); s.title = t('foldFlowInfoTip'); s.onclick = () => { countUse('ctx_foldsim_' + mode); hideCtxMenu(); openFoldSim(mode); }; box.appendChild(s); } } continue; }   /* 折りの分類は、カードを並べず「2つ折り」「3つ折り」の2項目（どちらも折りシミュレーションの小窓を、その折り方で開く） */
    const b = document.createElement('button'); if (b.dataset) b.dataset.cat = ctxCatOfCard(c); b.textContent = c === $('colorCard') ? t('ctxSimColor') : c === $('libCard') ? t('ctxLibOpen') : c.querySelector('summary').textContent;   /* 「部品ライブラリに登録…」（選んだ図形を登録する操作）と、並んで区別できるように「…を開く」 */ if (c === $('layerCard')) b.title = t('layerCtxTip'); b.onclick = () => { countUse('ctx_' + (c.id || 'card')); if (c === $('layerCard')) { hideCtxMenu(); openLayerWin(); return; }   /* レイヤーは右列でなく窓（事業主 2026-10-25「レイヤーのインターフェースが見にくい。窓にしたらどう？」） */ if (c === $('patchCard')) { hideCtxMenu(); setMode('patchfill'); return; }   /* 柄は右列でなく窓（2026-10-21）：柄のツールにして窓を出す（有料版のロックは setMode の中） */ for (const o of ctxCardList()) if (o.dataset?.win !== '1') o.open = o === c;   /* 窓になっている柄のカードは閉じない */ revealCard(c); hideCtxMenu(); c.scrollIntoView?.({ block: 'start' }); if (c === $('layerCard')) $('hint').textContent = t('layerCtxOpened'); }; box.appendChild(b); }   /* 押した項目だけを開く（ほかは閉じる）→ 長い列でも目的の項目が先頭に来る */
  $('ctxCardsTitle').hidden = true; return cards.length;   /* 旧い見出しは使わない（カードは、カテゴリごとの入れ物へ配る＝distributeCtxCards） */
}
/** 右クリックメニューの階層化（事業主 2026-10-26「右クリックメニューはこれから膨れ上がるので、…単語ベースのカテゴリとし」「カテゴリをクリックするとどんどん詳細なメニューが出るイメージ」「いっそのこと全部右クリックでもいい」）。
 *  メニューは、カテゴリの一覧（HTML の ctxTree）。カテゴリを押すと、その中の項目が横に開く（スマホ幅は下に開く）。項目のボタン・id・処理・キーは、いままでどおり（起動時に、入れ物の中へ移すだけ）。
 *  カード（右列の窓）の項目は、fillCtxCards が ctxCards に作ってから、分類ごとに、カテゴリの入れ物（ctxCards-カテゴリ）へ配る。項目が1つも見えないカテゴリは出さない。 */
const CTX_CATS = [['sel', ['ctxSel', 'ctx-move', 'ctx-center', 'ctx-dedupe', 'ctx-unpaint', 'ctx-textfont', 'ctx-holeshape']], ['stitch', ['ctx-stitch', 'ctx-mark', 'ctx-koma', 'ctx-lattice', 'ctx-round', 'ctx-diamond', 'ctx-lattice-round']], ['patch', ['ctx-patch', 'ctx-outline']], ['sim', []], ['parts', ['ctx-lib']], ['draw', ['ctx-chamfer', 'ctxChamferSub', 'ctx-offsettool', 'ctx-offset', 'ctx-offset-solid', 'ctx-mirror', 'ctx-trim', 'ctx-divide', 'ctxLayersTitle', 'ctxLayers']], ['out', []]];   /* 編集の道具（面取り・オフセット・線対称・トリム）は作図オプションへ、外周の線だけ選ぶはパッチワークへ（事業主 2026-10-26） */
const CTX_CARD_CAT = { infoCard: 'sel', hwEditCard: 'parts' }, CTX_SIDE_CAT = { shape: 'draw', stitch: 'stitch', color: 'sim', fold: 'sim', parts: 'parts', out: 'out' };   /* 「色」「2つ折り」「3つ折り」は、1つのカテゴリ「シミュレーション」（事業主 2026-10-26「シミュレーションの中に「色」「２つ折り」「３つ折り」を入れる」） */
const ctxCatOfCard = c => CTX_CARD_CAT[c?.id] || CTX_SIDE_CAT[sideGroupOf(c)] || 'draw';
function initCtxTree() {
  for (const [cat, ids] of CTX_CATS) {
    const fly = $('ctxFly-' + cat), btn = $('ctxCatBtn-' + cat); if (!fly || !btn) continue;
    for (const id of ids) { const el = $(id); if (el) fly.appendChild(el); }
    const cards = $('ctxCards-' + cat); if (cards) fly.appendChild(cards);   /* カードの入れ物は、いつも最後 */
    btn.onclick = e => { e?.stopPropagation?.(); toggleCtxCat(cat); };
  }
  for (const id of ['ctxPatchTitle', 'ctxCardsTitle', 'ctxCards']) { const el = $(id); if (el) el.hidden = true; }   /* 旧い（平らな）見出し・入れ物は使わない */
}
function closeCtxCats() { for (const [cat] of CTX_CATS) { const fly = $('ctxFly-' + cat), box = $('ctxCat-' + cat); if (fly) { fly.hidden = true; if (fly.style) fly.style.top = ''; } box?.classList?.remove('open'); box?.classList?.remove('flip'); } }
function toggleCtxCat(cat) {
  const fly = $('ctxFly-' + cat), box = $('ctxCat-' + cat), wasOpen = fly.hidden === false; closeCtxCats(); if (wasOpen) return;
  fly.hidden = false; box?.classList?.add('open');
  const r = fly.getBoundingClientRect?.(), W = globalThis.window?.innerWidth || 0, H = globalThis.window?.innerHeight || 0;   /* 画面の右・下からはみ出すときは、左へ開く・上へずらす */
  if (r && W && r.right > W - 8) { box?.classList?.add('flip'); }
  const r2 = fly.getBoundingClientRect?.(); if (r2 && H && r2.bottom > H - 8 && fly.style) fly.style.top = Math.min(0, -(r2.bottom - (H - 8)) - 4) + 'px';
}
function distributeCtxCards() {
  const src = $('ctxCards'), items = src?.children ? [...src.children] : [];
  for (const [cat] of CTX_CATS) { const box = $('ctxCards-' + cat); if (box) box.textContent = ''; }
  for (const x of items) { const cat = x?.dataset?.cat, box = cat && $('ctxCards-' + cat); if (box) box.appendChild(x); }
}
const ctxLiveCount = el => { let n = 0; for (const x of el?.children ? [...el.children] : []) { if (x.hidden) continue; if (x.tagName === 'BUTTON' || typeof x.onclick === 'function') n++; else n += ctxLiveCount(x); } return n; };
function updateCtxTree() { closeCtxCats(); for (const [cat] of CTX_CATS) { const box = $('ctxCat-' + cat), fly = $('ctxFly-' + cat); if (box && fly) box.hidden = !ctxLiveCount(fly); } }
/** 左メニュー「選択中」の操作を、右クリックメニューの先頭にカテゴリ別に並べる（事業主 2026-10-26「左の選択中のメニューは右クリックにカテゴリにわけて登録して。ごちゃごちゃして見にくい」）。
 *  実行は左の同じボタンの処理（クリックを渡す）なので、キー操作・無効の条件は変わらない。出すのは、いま押せるものだけ。左の並びは class inCtx で隠す（ボタンは残す）。 */
const CTX_SEL_GROUPS = [['ctxSelEdit', ['copy', 'delete', 'deleteKeepHoles', 'toPath', 'unroll']], ['ctxSelTransform', ['mirrorX', 'mirrorY', 'rotate', 'scaleOpen', 'attachLeft', 'symCheck']], ['ctxSelLines', ['closeGaps', 'mergeLines', 'splitLines']], ['ctxSelHoles', ['delHoles', 'checkHoles', 'flipHoleSlant']], ['ctxSelGroup', ['group', 'ungroup']]];
function initCtxSel() { for (const id of CTX_SEL_GROUPS.flatMap(g => g[1])) $(id)?.classList?.add('inCtx'); document.querySelector?.('[data-i18n="selection"]')?.classList?.add('inCtx'); }
function fillCtxSel() {
  const box = $('ctxSel'); box.textContent = ''; if (!selected.size) return;   /* 何も選んでいなければ、選択中の項目は出さない（右メニューの項目だけで開いたとき） */
  for (const [title, ids] of CTX_SEL_GROUPS) {
    const live = ids.map(id => ({ id, b: $(id) })).filter(x => x.b && !x.b.disabled && !x.b.hidden); if (!live.length) continue;
    const h = document.createElement('div'); h.className = 'ctx-title'; h.textContent = t(title); box.appendChild(h);
    for (const { id, b } of live) {
      const x = document.createElement('button'), lab = t(id === 'attachLeft' ? 'attachMenu' : id), key = b.querySelector?.('kbd.key')?.textContent;
      x.dataset.ctxFor = id; x.title = b.title || ''; x.textContent = lab; if (key) { const k = document.createElement('kbd'); k.className = 'key'; k.textContent = key; x.appendChild(k); }
      x.onclick = () => { hideCtxMenu(); b.click(); }; box.appendChild(x);
    }
  }
}
/** 右クリックメニューの中身を、いまの選択に合わせて作り直す（出すかどうかは別）。右クリックの表示（showCtxMenu）と、パネルの一覧（renderSideMenu）が、同じ項目を使うための共通の準備。 */
function prepareCtxMenu() {
  fillCtxSel(); fillCtxLayers(); fillCtxCards(); $('ctx-lib').hidden = selected.size < 1; $('ctx-move').hidden = !hasMoveTarget(); $('ctx-center').hidden = !selectedShapeIds().size; { const lp = latticePieceIds().size, rh = latticeRoundHoleIds().size, dh = latticeRoundHoleIds('diamond').size; $('ctx-lattice').hidden = !lp; $('ctx-round').hidden = !rh; $('ctx-diamond').hidden = !dh; $('ctx-lattice-round').hidden = !(lp && rh); } $('ctx-offset').hidden = $('ctx-offset-solid').hidden = !selectedShapeIds().size; $('ctx-mirror').hidden = !doc.shapes.some(s => selected.has(s.id) && editable(s)); $('ctxChamferSub').hidden = true; $('ctx-unpaint').hidden = !selectionHasPaint(); $('ctx-outline').hidden = !selectedShapeIds().size; $('ctx-dedupe').hidden = !selectedShapeIds().size; $('ctx-textfont').hidden = !pickedTexts().length; $('ctx-holeshape').hidden = !(selected.size && doc.holes.length);   /* 穴のある図面で、何か選んでいるとき（範囲に穴があるかは、窓の中で数える＝右クリックを重くしない） */
  distributeCtxCards(); updateCtxTree();
}
function showCtxMenu(e) {
  const menu = $('ctxMenu'), p = local(e); prepareCtxMenu(); fillCtxRecent(); menu.hidden = false; const w = menu.offsetWidth || 200, h = menu.offsetHeight || 40;   /* 出してから大きさを測る（項目が多いので） */
  menu.style.left = Math.round(Math.max(8, Math.min(width - w - 8, p.x))) + 'px'; menu.style.top = Math.round(Math.max(36, Math.min(height - h - 8, p.y))) + 'px';
}
function hideCtxMenu() { $('ctxMenu').hidden = true; closeCtxCats(); }
let lastPanDragAt = -1e9; /* 右ドラッグ（画面の移動）を終えた時刻。離した直後に出るメニューのイベントを無視するため */
/** 右クリックと同じメニューを開く入口（スマホ・タブレットには右クリックが無い・事業主 2026-10-26「右クリックはスマホだとどうなる？」）。①ヘッダーの「機能」ボタン ②選択モードでの、指・ペンの長押し（0.6秒・10px 以上動かさない）。マウスの長押しは何もしない。 */
$('ctxOpenBtn').addEventListener('click', e => { const r = (e.currentTarget || $('ctxOpenBtn')).getBoundingClientRect(); e.stopPropagation?.(); countUse('ctx_open_btn'); showCtxMenu({ clientX: r.left, clientY: r.bottom + 4, preventDefault() {} }); });
let longPressTimer = null, longPressAt = null;
const longPressCancel = () => { clearTimeout(longPressTimer); longPressTimer = null; longPressAt = null; };
function longPressStart(e) {
  longPressCancel(); if ((e.pointerType !== 'touch' && e.pointerType !== 'pen') || e.button !== 0) return;
  longPressAt = { x: e.clientX, y: e.clientY };
  longPressTimer = setTimeout(() => { const at = longPressAt; longPressCancel(); if (!at || mode !== 'select' || stage || (gesture && !['select', 'move'].includes(gesture.kind))) return; gesture = null; countUse('ctx_long_press'); showCtxMenu({ clientX: at.x, clientY: at.y, preventDefault() {} }); }, 600);
}
const longPressMove = e => { if (longPressAt && Math.hypot(e.clientX - longPressAt.x, e.clientY - longPressAt.y) > 10) longPressCancel(); };
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
/** 記録のある格子の線をダブルクリックしたとき（事業主 2026-10-23「外周の線がダブルクリックで選択できない」：枠の線の上にピースの縁が重なり、枠でなくピースの縁が選ばれていた）：
 *  外周線（枠）の近く（7px）なら、その格子の枠の図形を全部選ぶ。パッチの内側の線なら、その格子のピース全部を選ぶ。どちらでも、列・行・角度などの欄を変えると、その格子が作りなおされる。選べたら { ids, frame } を返す。 */
function gridDoubleClickPick(w) {
  const tol = 7 / scale; let best = null;
  for (const g of doc.grids || []) {
    const pcs = doc.shapes.filter(s => g.pieceIds.includes(s.id) && visible(s) && editable(s)); if (!pcs.length) continue;
    const d = Math.min(...pcs.map(s => distTo(s, w))); if (d <= tol && (!best || d < best.d)) best = { g, d };
  }
  if (!best) return null;
  const frame = doc.shapes.filter(s => best.g.frameIds.includes(s.id) && visible(s) && editable(s)), nearFrame = frame.length && frame.some(s => distTo(s, w) <= tol);
  return nearFrame ? { ids: frame.map(s => s.id), frame: true, n: best.g.pieceIds.length } : { ids: best.g.ids.filter(id => doc.shapes.some(s => s.id === id && editable(s))), frame: false, n: best.g.pieceIds.length };
}
canvas.addEventListener('dblclick', e => {
  cancelSpanClick();
  const p = local(e), w = world(p);
  if (mode === 'path') { finishPath(false); return; }
  if (mode === 'bezier') { finishBezier(); return; } /* 終点でダブルクリック＝確定 */
  if (mode === 'offset') { offsetClick(w, true); return; } /* ダブルクリック＝つながった図形全体を選ぶ */
  if (mode === 'line' && stage?.kind === 'cmd') { stage = null; $('hint').textContent = t('hint.line'); draw(); return; } // 終点でダブルクリック＝連続線の確定
  if (mode === 'select') {
    const inGroup = doc.shapes.filter(x => visible(x) && editable(x)).reverse().find(x => groupIdOf(x) && selected.has(x.id) && distTo(x, w) <= 7 / scale);
    const groupMode = !!inGroup && selected.size > 1;   /* グループ全体を選んでいるときのダブルクリック */
    if (!groupMode) { const gp = gridDoubleClickPick(w); if (gp?.ids.length) { selected = new Set(gp.ids); nodeSel = null; $('hint').textContent = t(gp.frame ? 'gridFrameSelected' : 'gridWholeSelected', { n: gp.n }); draw(); return; } }   /* 格子の外周線なら枠、パッチの内側の線ならその格子のピース全部（選びなおした直後は、欄を変えると、その格子が作りなおされる） */
    const s = selected.size === 1 ? doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)) : null;
    const hit = groupMode ? inGroup : doc.shapes.filter(x => visible(x) && editable(x) && stitchable(x)).reverse().find(x => distTo(x, w) <= 7 / scale);
    const dashedOf = x => x.lineStyle === 'dashed' || x.layer === 'guide', pool = hit ? doc.shapes.filter(x => visible(x) && stitchable(x) && (!dashedOf(hit) || dashedOf(x))) : [];   /* 点線（ガイド）をダブルクリックしたときは、つながった点線だけ（実線の外形にはつながっていても広げない） */
    const dups = dedupeShapeGroups(pool), repOf = id => dups.repOf.get(id) ?? id;   /* 同じ形で重なった線は1本として数える（重なっていると、つながりがそこで止まるため）。選ぶときは、重なった線も全部 */
    const chainIds = hit ? contourFrom(dups.reps, repOf(hit.id)) : []; /* 分岐点では真っ直ぐ続く線を選んで先へ進み、枝には入らない。端が 0.2mm 以内で離れた所も越える */
    const chain = hit ? { shapeIds: chainIds.flatMap(id => dups.groups.get(id) ?? [id]) } : null;
    if (groupMode) { /* その線がほかの線とつながっていれば、つながった輪郭全体を選ぶ（事業主指示 2026-10-21 不具合記録 1551「囲みの線をダブルクリックしたのに選べない」「菱目の線をダブルクリックして菱目を消したが半分消えない」：グループの線は中の1つだけになり、輪郭の片側しか選べなかった）。すでにその輪郭を選んでいるとき・つながった線が無いときは、今までどおり中の1つだけ */
      const ids = (chain?.shapeIds || []).filter(id => { const x = doc.shapes.find(y => y.id === id); return x && editable(x); });
      if (!(ids.length > 1 && !(ids.length === selected.size && ids.every(id => selected.has(id))))) { selected = new Set([inGroup.id]); nodeSel = null; draw(); return; }
    }
    if (s && !nodeHit(s, w) && distTo(s, w) <= 7 / scale && (!chain || chain.shapeIds.length === 1)) { const next = pathInsertNode(s, projectOnPath(s, w).s); nodeSel = null; transformSelectedTo(next); } /* ペンの線だけなら節点を足す */
    else if (chain && chain.shapeIds.length > 1) { /* ダブルクリック＝つながった図形をすべて選ぶ（端点でつながる線・円弧・曲線。ロックした層の図形は除く） */
      const ids = chain.shapeIds.filter(id => { const x = doc.shapes.find(y => y.id === id); return x && editable(x); }); selected = new Set(ids); nodeSel = null; const stops = contourStops(dups.reps, chainIds); chainStops = stops.length ? { ids: new Set(ids), stops } : null; const mine = gaps.filter(g => ids.includes(g.a.id) || ids.includes(g.b.id)); gapAlert = mine.length ? { ids: new Set(ids), pts: mine.map(g => ({ x: g.x, y: g.y, d: g.d })), i: -1 } : null;   /* つながっていない所の丸印（事業主「ダブルクリックしたときにつながっていないところが〇で表示されるのではなかったか」：丸印は、ポインタが近いときだけだった）。選んでいる間は、全部の隙間に出し続ける */
  $('hint').textContent = t('chainSelectedLen', { n: ids.length, len: totalLengthOf(ids.map(id => doc.shapes.find(y => y.id === id))).toFixed(2) }) + (mine.length ? ' ' + t('chainGapNote', { n: mine.length, max: Math.max(...mine.map(g => g.d)).toFixed(2) }) : '') + (chainStops ? ' ' + t('chainBranchNote', { n: chainStops.stops.length }) : ''); draw(); }
  }
});
canvas.addEventListener('pointerup', e => {
  longPressCancel();
  if (!gesture) return;
  const g = gesture, p = local(e);
  cursor = g.kind === 'move' ? movePosition(world(p), e.shiftKey, e.altKey) : (mode === 'select' && g.kind !== 'lineEnd') || g.kind === 'pan' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (g.kind === 'lineEnd' || (g.kind === 'node' && g.dir)) cursor = lineEndCursor(g, world(p), e.shiftKey || !!g.holed);
  gesture = null; if (g.kind === 'pan' && distance(p, g.screen) >= 4) lastPanDragAt = Date.now();
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (g.kind === 'spin') { draw(); return; }
  if (g.kind === 'foldHandle') { endFoldHandleDrag(g); draw(); return; }
  if (g.kind === 'rectR') { const sh = doc.shapes.find(x => x.id === g.id), b0 = g.box0, b = g.box; if (sh && (Math.abs(b.x0 - b0.x0) + Math.abs(b.x1 - b0.x1) + Math.abs(b.y0 - b0.y0) + Math.abs(b.y1 - b0.y1)) > 1e-9) { const r4 = v => +v.toFixed(4); commit(() => { sh.points = rectShape({ x: r4(b.x0), y: r4(b.y0) }, { x: r4(b.x1), y: r4(b.y1) }).points; }); $('hint').textContent = t('rectResized', { w: circleNum(b.x1 - b.x0), h: circleNum(b.y1 - b.y0) }); } snap = null; draw(); return; }
  if (g.kind === 'rotate') { const a = g.angle; cancel(); if (Math.abs(a) > 1e-6) { transformSelected(s => rotate(s, a, g.c), { rotates: true }); $('hint').textContent = t('rotDone', { a }); } draw(); return; }
  if (g.kind === 'textR') { const sh = doc.shapes.find(x => x.id === g.id); if (sh && Math.abs(g.size - sh.sizeMm) > 1e-9) { commit(() => { sh.sizeMm = g.size; }); $('hint').textContent = t('textResized', { size: circleNum(g.size) }); } draw(); return; }
  if (g.kind === 'circleR') { const sh = doc.shapes.find(x => x.id === g.id); if (sh && Math.abs(g.r - sh.r) > 1e-9) { commit(() => { sh.r = g.r; }); $('hint').textContent = t('circleResized', { r: circleNum(g.r), d: circleNum(g.r * 2) }); } snap = null; draw(); return; }
  if (g.kind === 'hole') { const h=doc.holes.find(h=>h.id===g.id); if(h && holeEditable(h))commit(()=>Object.assign(h,holePosition(h,cursor)));
  } else if (g.kind === 'pen') {
    penRelease(g.start, cursor, distance(p, g.screen) >= 4); lastPoint = g.start;
  } else if (g.kind === 'lineEnd') {
    const s = doc.shapes.find(s => s.id === g.id);
    if (s && editable(s) && distance(p, g.screen) >= 2) { const next = handleMoved(s, g.h, cursor); if (s.type === 'line' && Math.hypot(next.x2 - next.x1, next.y2 - next.y1) < 1e-6) { if (lineEndRetracted(s, g)) { removeSelected(new Set([s.id])); $('hint').textContent = t('lineEndRetracted'); } else $('hint').textContent = t('lineEndZero'); } else { const holed = doc.paths.some(pt => pt.shapeIds.includes(s.id) && doc.holes.some(h => h.pathId === pt.id)); if (holed && !lineEndKeepsHoles(s, next)) { $('hint').textContent = t('lineEndHoles'); draw(); return; } if (holed) moveShapeKeepingHoles(next); else transformSelectedTo(next); $('hint').textContent = s.type === 'line' ? t('lineEndDone', { len: Math.hypot(next.x2 - next.x1, next.y2 - next.y1).toFixed(2) }) : t(s.type === 'arc' ? 'arcEndDone' : 'vertexDone'); } }
  } else if (g.kind === 'node') {
    const s = doc.shapes.find(s => s.id === g.id);
    if (s && editable(s) && distance(p, g.screen) >= 2) transformSelectedTo(editedNodePath(s, g, cursor));
  } else if (g.kind === 'move') {
    if (distance(p, g.screen) >= 4) { const dx = cursor.x - g.start.x, dy = cursor.y - g.start.y, all = quadAllSelected(); transformSelected(s => translate(s, dx, dy)); if (all) quadFollowMove(dx, dy); }
    else if (g.shiftToggle) { for (const id of expandToGroups(doc.shapes, new Set([g.shiftToggle]))) selected.delete(id); }   /* Shift を押したまま選択済みの図形をクリックだけ：選択から外す */
    else if (mode === 'select' && !e.shiftKey && !e.altKey && selected.size === 1) { /* シングルクリック＝交点から交点までの区間。ダブルクリック（つながった図形全体）と区別するため、少し待ってから切り分ける */
      const only = doc.shapes.find(x => selected.has(x.id)), at = world(p);
      if (only && ['line', 'arc', 'polyline', 'path'].includes(only.type) && !groupIdOf(only) && !only.joined) { cancelSpanClick();   /* 「1本に結合」した線は、クリックで交点ごとに切らない（事業主 2026-10-24「１本に結合されるのはその瞬間だけで移動させるときにばらばらになる」） */ spanClickTimer = setTimeout(() => { spanClickTimer = null; if (!gesture && mode === 'select' && selected.size === 1 && selected.has(only.id) && doc.shapes.includes(only)) selectSpanAt(at, false, { auto: true }); }, 400); }
    }
  } else if (g.kind === 'dimOff') {
    if (distance(p, g.screen) >= 4) { const pv = dimOffPreview(g, cursor); if (pv.size) { commit(() => { for (const s of doc.shapes) if (s.type === 'dimension' && pv.has(s.id)) s.offset = pv.get(s.id); }); $('hint').textContent = pv.size === 1 ? t('dimOffDragged', { off: Math.abs([...pv.values()][0]).toFixed(1) }) : t('dimOffDraggedMany', { n: pv.size }); } }   /* 寸法線だけを動かした（測る点はそのまま・追従の覚えも残る・事業主の希望 2026-10-19） */
  } else if (g.kind === 'select') {
    if (!g.additive) selected.clear();
    if (distance(p, g.screen) < 4) {
      const hit = pickShapeAt(cursor);
      if (hit) { const grp = expandToGroups(doc.shapes, new Set([hit.id])); if (g.additive && selected.has(hit.id)) for (const id of grp) selected.delete(id); else for (const id of grp) selected.add(id); }
    } else {
      const minX = Math.min(g.start.x, cursor.x), maxX = Math.max(g.start.x, cursor.x), minY = Math.min(g.start.y, cursor.y), maxY = Math.max(g.start.y, cursor.y);
      for (const s of doc.shapes.filter(editable)) { const b = bboxOf(s); if (b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY) selected.add(s.id); }
      /* 囲みの中の図形だけを選ぶ。グループ全体になるのは、アプリが作った一式（金具・折り目の断面図）だけ：一部だけ動かすと壊れるため。自分で「グループ化」した型紙・点線のグループは、囲みの中の図形だけ（事業主指示 2026-10-21：右の図形だけ囲んだのに、同じグループの左の点線の輪・菱目まで動いた・消えた。不具合記録 1528・1530）。クリックは今までどおりグループ全体 */
      const wholeGroups = new Set(doc.shapes.filter(s => groupIdOf(s) && (isHardwareShape(s) || s.hwSection || s.hwFor || s.foldSec || s.layer === 'section')).map(groupIdOf));
      if (wholeGroups.size) { const hit = new Set(doc.shapes.filter(s => selected.has(s.id) && wholeGroups.has(groupIdOf(s))).map(groupIdOf)); for (const s of doc.shapes) if (hit.has(groupIdOf(s))) selected.add(s.id); }
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
      else if (mode === 'line') { if (distance(stage.start, cursor) >= 6 / scale) { runCommand(`${cursor.x},${cursor.y}`); stage = null; lastPoint = cursor; $('hint').textContent = t('hint.line'); } /* 終点のクリックで1本できて終わり（ペンのような連続線にしない・事業主要望 2026-10-21）。始点から画面上で6px未満＝ダブルクリックの手ぶれ。短い線を作らない */ }
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
canvas.addEventListener('pointercancel', () => { longPressCancel(); gesture = null; draw(); });
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
/** 左の「選択中」の「拡大縮小」：右の拡大縮小カードを開き（分類のタブも切り替え）、横（%）の欄へ移る（事業主の指摘 2026-10-20「拡大縮小がどこにあるかわからない」）。何も選んでいなければ案内だけ。 */
function openScaleCard() {
  refreshScaleCard(); const c = $('scaleCard'); if (!selectedShapeIds().size || c.hidden) { $('hint').textContent = t('scaleOpenNone'); return; }
  setCardWin('scaleCard', true); const x = $('scaleX'); x.focus?.(); x.select?.(); $('hint').textContent = t('scaleOpened');   /* 拡大縮小のカードは、右列でなく窓で開く（事業主指示 2026-10-21） */
}
$('scaleOpen').onclick = openScaleCard;
$('circleR').oninput = () => { const r = Number($('circleR').value); $('circleD').value = $('circleR').value.trim() === '' || !Number.isFinite(r) ? '' : circleNum(r * 2); draw(); };   /* 半径と直径は連動 */
$('circleD').oninput = () => { const d = Number($('circleD').value); $('circleR').value = $('circleD').value.trim() === '' || !Number.isFinite(d) ? '' : circleNum(d / 2); draw(); };
$('language').addEventListener('change', e => applyLanguage(e.target.value));
$('undo').onclick = () => history(undo, redo); $('redo').onclick = () => history(redo, undo);
$('new').onclick = () => {
  /* 保存していない図があるときは、消さずに新しい図面タブで始める（事業主指摘 2026-10-15：新規で保存前の図が消えた）。保存済み・空の図面だけ、従来どおりその場で空にする */
  if (tabs[activeTab]?.dirty && (doc.shapes.length || doc.calcMemos?.length)) { cancel(); newTab(); $('hint').textContent = t('newKeptOld'); return; }
  cancel(); commit(() => { doc = newDoc(); doc.tools = loadTools(); selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); activeLayer = 'pattern'; pairLines = []; renderLayers(); renderSeams(); fit(); };
$('zoomIn').onclick = () => zoom(1.25); $('zoomOut').onclick = () => zoom(0.8); $('fit').onclick = fit; $('zoomActual').onclick = setActualSize; $('zoomActualCalib').onclick = openActualCalib; $('actualCalibApply').onclick = applyActualCalib; $('actualCalibReset').onclick = resetActualCalib; $('actualCalibClose').onclick = () => { $('actualCalibBar').hidden = true; };
for (const id of ['grid', 'snap', 'spacing']) $(id).addEventListener('change', () => { if (!(Number($('spacing').value) >= 0.1)) $('spacing').value = '1'; snap = null; draw(); });
for (const id of ['printOverlay', 'paper', 'outHoles', 'threeView']) $(id).addEventListener('change', () => draw());
$('threeView').addEventListener('change', () => { if ($('threeView').checked && !lockGate('threeview')) { $('threeView').checked = false; return; } let moved = 0; if (threeViewOn() && quadOn()) { $('quadView').checked = false; moved = quadToFrames(); } $('threeViewNotice').hidden = !threeViewOn(); $('threeViewTools').hidden = !threeViewOn(); rebuildSnaps(); if (view3d) render3d(); if (moved) { draw(); $('hint').textContent = t('quadToFramesDone', { n: moved }); } });
$('quadView').addEventListener('change', () => { if ($('quadView').checked && !lockGate('threeview')) { $('quadView').checked = false; return; } let moved = 0; if (quadOn()) { const wasFrames = $('threeView').checked; if (wasFrames) { $('threeView').checked = false; $('threeViewNotice').hidden = true; $('threeViewTools').hidden = true; } ensureSheetSet(); if (wasFrames) moved = framesToQuad(); } if (!quadOn()) dropEmptySheetTabs(); rebuildSnaps(); if (view3d) render3d(); draw(); $('hint').textContent = quadOn() ? (moved ? t('framesToQuadDone', { n: moved }) + ' ' : '') + t('quadOnHint') : t('hint.' + mode); });
$('threeViewMake').onclick = makeThreeViewOutlines;
$('threeViewFrame').onclick = setThreeViewFrame; $('threeViewFrameReset').onclick = resetThreeViewFrame;
$('threeViewDepthIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); makeThreeViewOutlines(); } });
/** 覚えていたファイルへ書く許可があるか。再起動のあとは許可が「確認」に戻るので、保存の操作の中で聞く。許可の仕組みが無い（古い）ハンドルは、そのまま書いてみる。 */
async function canWriteHandle(h) { try { if (typeof h.queryPermission !== 'function') return true; let p = await h.queryPermission({ mode: 'readwrite' }); if (p !== 'granted' && typeof h.requestPermission === 'function') p = await h.requestPermission({ mode: 'readwrite' }); return p === 'granted'; } catch { return false; } }
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
  let why = '';   /* 前に保存したファイルへ上書きできなかった理由（選び直しの保存のあとに知らせる） */
  if (!asNew && tab?.fileHandle && typeof globalThis.showSaveFilePicker === 'function' && !(await canWriteHandle(tab.fileHandle))) { tab.fileHandle = null; why = t('saveWhyPermission'); }   /* 覚えていたファイルへの書き込みの許可を、Ctrl+S の押下の中で確かめる（再起動の直後は「確認」に戻っている）。断られたら選び直す */
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
  if (handle) { try { await write(handle); overwrote = true; } catch (err) { handle = null; if (tab) tab.fileHandle = null; why = t('saveWhyWrite', { message: err?.name ? err.name + (err.message ? '：' + err.message : '') : String(err?.message || err) }); /* 消された・動かされた・許可が切れた：選び直す */ } }
  if (!handle) {
    try {
      handle = await globalThis.showSaveFilePicker({ suggestedName: fileName, types: [{ description: "N's CAD", accept: { 'application/json': ['.json'] } }] });
      await write(handle);
    } catch (err) { $('hint').textContent = err?.name === 'AbortError' ? t('saveCanceled') : t('saveFailed', { message: err?.message || String(err) }); return; }
  }
  if (tab) { tab.fileHandle = handle; const base = (handle.name || '').replace(/\.json$/i, '').trim().slice(0, 60); if (base) tab.name = base; scheduleAutosave(); /* 行き先を保管に入れる */ saveFilesRecord({ savedAt: lastAutosaveAt, handles: tabs.map(tb => tb.fileHandle || null) }).catch(() => {}); /* 自動保存の保管を待たず、いまのうちにも覚える（すぐ閉じても残るように） */ }
  clean(); $('hint').textContent = t(overwrote ? 'savedOverwrite' : 'savedNew', { name: handle.name || fileName }) + (!overwrote && why ? ' ' + why : '');
}
/** 選んだ図形だけの図面を作る（事業主の希望 2026-10-19「選択した図形だけを保存したい」）：選んだ図形＋その図形で完結する経路と縫い穴＋部品（選んだ図形の分だけ）＋縫い合わせ（両側の経路が残るもの）＋領域の塗り（囲む図形が全部選ばれているもの）＋層・工具・単位などの設定。座標は動かさない。
 *  何も選んでいなければ null。検査（validateDoc）に通らなければ null。 */
function selectedDoc() {
  const ids = selectedShapeIds(); if (!ids.size) return null;
  const sel = extractSelection(doc, ids, { originAtBbox: false }), pathIds = new Set(sel.paths.map(p => p.id)), copy = v => JSON.parse(JSON.stringify(v));
  const out = { ...newDoc(), unit: doc.unit, mark: doc.mark, dotD: doc.dotD, ...(doc.textureMm !== undefined && doc.textureMm !== null ? { textureMm: doc.textureMm } : {}), layers: copy(doc.layers), tools: copy(doc.tools), shapes: sel.shapes, holes: sel.holes, paths: sel.paths, parts: sel.parts.filter(p => p.shapeIds.length), seams: copy((doc.seams || []).filter(m => pathIds.has(m?.a?.pathId) && pathIds.has(m?.b?.pathId))), fills: copy((doc.fills || []).filter(f => Array.isArray(f.ids) && f.ids.length && f.ids.every(id => ids.has(id)))) };
  for (const s of out.shapes) if (s.type === 'dimension' && Array.isArray(s.anchors)) { s.anchors = s.anchors.map(a => a && ids.has(a.id) ? a : null); if (!s.anchors.some(Boolean)) delete s.anchors; }   /* 選んでいない図形への追従の覚えは外す */
  healDoc(out); return validateDoc(out) ? out : null;
}
/** 「保存 ▾」→「選んだ図形だけを別名で保存」：常に名前を付けて保存（Ctrl+S の上書き先・いまの図面・保存済みの印は変えない）。 */
async function saveSelectedAs() {
  if (!selectedShapeIds().size) { $('hint').textContent = t('saveSelectedNone'); return; }
  const d = selectedDoc(); if (!d) { $('hint').textContent = t('saveInvalid'); return; }
  if (!regGuard('json', 'save')) return;
  const text = JSON.stringify(d, null, 2), fileName = (tabs[activeTab]?.name ? tabs[activeTab].name.replace(/[\\/:*?"<>|]+/g, '_') : 'leather-pattern') + t('saveSelectedSuffix') + '.json';
  if (typeof globalThis.showSaveFilePicker !== 'function') { download(fileName, text, 'application/json', false); $('hint').textContent = t('savedSelected', { n: d.shapes.length, name: fileName }); return; }
  try {
    const handle = await globalThis.showSaveFilePicker({ suggestedName: fileName, types: [{ description: "N's CAD", accept: { 'application/json': ['.json'] } }] });
    const w = await handle.createWritable(); await w.write(text); await w.close();
    $('hint').textContent = t('savedSelected', { n: d.shapes.length, name: handle.name || fileName });
  } catch (err) { $('hint').textContent = err?.name === 'AbortError' ? t('saveCanceled') : t('saveFailed', { message: err?.message || String(err) }); }
}
/** 「開く」：Chrome／Edge はファイル選択で開き、N's CAD 形式（.json）なら場所を覚える（Ctrl+S でそのファイルへ上書き）。それ以外の形式（.lcc・.svg・.dxf・画像）は覚えない（元のファイルを JSON で壊さない）。選択窓の無いブラウザは従来の入力欄。 */
/** タブをダブルクリック：その図面の保存先のフォルダで「開く」の窓を開く（事業主の要望 2026-10-20）。ブラウザは保存先のパスを教えず、エクスプローラーも開けないので、ファイルを選ぶ窓を、保存先のファイルのフォルダ（startIn）から開く形にした。 */
async function openTabFolder(tab) {
  if (typeof globalThis.showOpenFilePicker !== 'function') { $('hint').textContent = t('tabFolderUnsupported'); return; }
  if (!tab?.fileHandle) { $('hint').textContent = t('tabFolderNoFile'); return; }
  await openDialog(tab.fileHandle);
}
async function openDialog(startIn = null) {   /* startIn：窓を開く場所（ファイルのハンドル）。ボタン・Ctrl+O では渡さない */
  if (typeof globalThis.showOpenFilePicker !== 'function') { $('file').click(); return; }
  let handle; try { [handle] = await globalThis.showOpenFilePicker({ ...(startIn ? { startIn } : {}), types: [{ description: "N's CAD・図面・画像", accept: { 'application/json': ['.json'], 'text/plain': ['.lcc', '.dxf'], 'image/svg+xml': ['.svg'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] } }] }); } catch (err) { if (err?.name !== 'AbortError') $('hint').textContent = t('loadFailed', { message: err?.message || String(err) }); return; }
  if (!handle) return;
  const res = await openFile(await handle.getFile());
  if (res && /\.json$/i.test(handle.name || '') && tabs[activeTab]) { tabs[activeTab].fileHandle = handle; scheduleAutosave(); }
}
/** 読み込んだ正面の紙に上・右の紙が入っていれば、それぞれのタブを作って同じ組にする。 */
function restoreSheets(extra, id) {
  if (!extra || !id) return; const cur = activeTab, sc = scale;
  for (const role of ['top', 'side']) { const raw = extra[role]; if (!raw) continue; let d; try { d = migrateDoc(raw); } catch { continue; } if (!validateDoc(d)) continue; delete d.threeViewSheets; d.threeViewSheet = { id, role }; newTab(t(role === 'top' ? 'threeViewTop' : 'threeViewSide')); doc = d; refreshTools(); renderLayers(); renderSeams(); scale = sc; origin = role === 'top' ? { x: 80, y: Math.max(60, height / 2 * 0.8) } : { x: Math.max(40, width / 2 * 0.2), y: 80 }; snapshotTab(); tabs[activeTab].dirty = false; }
  switchTab(cur); renderTabs();
}
window.addEventListener('beforeunload', e => { if (tabs.some(tb => tb.dirty)) { e.preventDefault(); e.returnValue = ''; } });
/* 「保存」を押すと、保存と書き出し（SVG・PDF・DXF・PNG）のメニューが出る。普段は隠れている。Ctrl+S は N's CAD 形式でそのまま保存 */
/** 上の段の「表示」「その他」メニュー（チェック欄・ズーム・ヘルプ類をまとめた開け閉め）。開いている間は、中のチェックを続けて変えられ、外をクリックか Esc で閉じる。中のボタン（ヘルプなど）を押したら閉じる。 */
const HDR_MENUS = [['viewBtn', 'viewMenu'], ['otherBtn', 'otherMenu']];
/** 上の段のメニューの板を、画面からはみ出さないように置く（事業主 2026-10-24「不具合記録のメニューほか見えない」：上の段が2行に折り返して「その他」が左端に来ると、右そろえの板が、画面の左へ切れていた）。開いた直後に測り、左がはみ出すなら左そろえに、右がはみ出すなら左へ寄せる。 */
function placeHdrMenu(el) {
  if (!el?.getBoundingClientRect) return; el.style.left = ''; el.style.right = '';   /* いったん、CSS の置き方（左そろえ／右そろえ）に戻して測る */
  const vw = typeof innerWidth === 'number' ? innerWidth : 1000; let r = el.getBoundingClientRect(); if (!(r.width > 0)) return;
  if (r.left < 8) { el.style.left = '0px'; el.style.right = 'auto'; r = el.getBoundingClientRect(); }
  if (r.right > vw - 8) { const over = r.right - (vw - 8), cur = parseFloat(el.style.left || '0') || 0; el.style.left = (cur - over) + 'px'; el.style.right = 'auto'; }
}
function closeHdrMenus(except = null) { for (const [b, m] of HDR_MENUS) { if (m === except) continue; const el = $(m); if (el && !el.hidden) { el.hidden = true; $(b).setAttribute?.('aria-expanded', 'false'); } } }
function initHdrMenus() {
  for (const [b, m] of HDR_MENUS) {
    $(b).onclick = () => { const el = $(m), open = el.hidden; closeHdrMenus(m); $('saveMenu').hidden = true; el.hidden = !open; $(b).setAttribute?.('aria-expanded', String(open)); if (open) placeHdrMenu(el); };
    for (const x of ($(m).querySelectorAll ? $(m).querySelectorAll('button') : [])) x.addEventListener('click', () => { if (m === 'otherMenu' || x.id === 'autoSolid') closeHdrMenus(); });
  }
  document.addEventListener?.('click', e => { if (!(e.target instanceof Node)) return; for (const [b, m] of HDR_MENUS) { const el = $(m); if (el && !el.hidden && !el.contains(e.target) && !$(b).contains(e.target)) { el.hidden = true; $(b).setAttribute?.('aria-expanded', 'false'); } } });
  document.addEventListener?.('keydown', e => { if (e.key === 'Escape') closeHdrMenus(); });
}
$('save').onclick = () => { closeHdrMenus(); $('saveMenu').hidden = !$('saveMenu').hidden; if (!$('saveMenu').hidden) placeHdrMenu($('saveMenu')); };
initHdrMenus();
try { const h = localStorage.getItem('leather-cad.saveHistory'); $('saveHistory').value = ['0', '30', '100'].includes(h) ? h : '100'; } catch { $('saveHistory').value = '100'; }
$('saveHistory').addEventListener('change', () => { try { localStorage.setItem('leather-cad.saveHistory', $('saveHistory').value); } catch { /* 覚えられなくても保存はできる */ } });
$('saveNative').onclick = () => { $('saveMenu').hidden = true; save(); };
$('saveAs').onclick = () => { $('saveMenu').hidden = true; save(true); };
$('saveSelected').onclick = () => { $('saveMenu').hidden = true; saveSelectedAs(); };
for (const b of ($('saveMenu').querySelectorAll ? $('saveMenu').querySelectorAll('button[data-export]') : [])) b.addEventListener('click', () => { $(b.dataset.export).click(); $('saveMenu').hidden = true; }); /* 右の出力カードと同じ書き出しを呼ぶ */
/** 保存メニューの外をクリックしたら閉じる。「保存 ▾」ボタンの中の文字（span・kbd）のクリックは、ボタンの中なので閉じない（事業主指摘 2026-10-18：文字をクリックすると、開いた直後に閉じて、メニューが見えなかった）。 */
function closeSaveMenuOnOutsideClick(e) { const m = $('saveMenu'), sv = $('save'); if (!m.hidden && e.target instanceof Node && !m.contains(e.target) && !sv.contains(e.target)) m.hidden = true; }
document.addEventListener?.('click', closeSaveMenuOnOutsideClick); $('open').onclick = () => openDialog(); $('shortcutsBtn').onclick = () => showHelp(true);
$('file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  await openFile(file);
});
/** 動かしている途中に Alt を押した・離したとき、マウスを動かさなくても、すぐ吸着なし／ありに切り替える（そのとき Alt だけでメニューが開かないように、キーの既定の動作は止める）。 */
function refreshMoveFree(e) {
  if (e.key !== 'Alt' || gesture?.kind !== 'move' || !gesture.moved || !gesture.lastWorld) return; e.preventDefault?.();
  cursor = movePosition(gesture.lastWorld, e.shiftKey, e.altKey); draw();
}
/** 閉じるまで図面を触れない（モーダルな）ダイアログが開いているか。折りの手順の小窓（flow-win）は、開いたまま図面を触る窓なので数えない：
 *  数えると、小窓を開いている間は、Delete・元に戻す（Ctrl+Z）・反転（H）など、キー操作が全部効かなくなる（事業主 2026-10-24「削除ができない」「Undo押しても戻せない」「反転できない」・不具合記録で、キーは届いているのに何も起きていなかった）。 */
function modalDialogOpen() {
  const first = document.querySelector?.('dialog[open]'); if (!first) return false;
  const all = document.querySelectorAll?.('dialog[open]'), list = all && all.length ? [...all] : [first];
  return list.some(d => !d.classList?.contains?.('flow-win'));
}
window.addEventListener('keydown', e => {
  refreshMoveFree(e);
  const input = e.target instanceof HTMLInputElement || ['SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
  if (isShortcut(e, 's') || isShortcut(e, 'o')) { e.preventDefault(); isShortcut(e, 's') ? save(e.shiftKey) : openDialog(); return; }
  if (input && e.key === 'Escape' && e.target !== $('cmd') && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable && !modalDialogOpen()) { e.target.blur?.(); canvas.focus?.(); } /* 数値欄・選択欄にフォーカスがあっても、Esc で作図を取り消せる（欄からは抜ける） */
  else if (input) return;
  if (modalDialogOpen()) return; // ダイアログ内の Esc/Space はダイアログのもの（折りの小窓は除く）
  if (e.key === 'Tab' && mode === 'stitch' && countStage && stitchRouteChoices.n > 1 && stitchLastW) { e.preventDefault(); stitchTab++; syncStitchPreview(stitchLastW, e.shiftKey); draw(); return; }   /* 目打ち：打てる経路が複数あるとき、Tab で切り替える */
  const kt = gesture ? null : keyTarget(e); /* 左メニューのキー（英語の頭文字・Shift つきは重なるもの）。ドラッグ中は使わない */
  if (kt) { e.preventDefault(); if (kt.tool) { countUse('tool_' + kt.tool); setMode(kt.tool); } else if (kt.toggle) { const c = $(kt.toggle); c.checked = !c.checked; c.dispatchEvent?.(new Event('change', { bubbles: true })); draw(); } else { const b = $(kt.action); if (b && !b.disabled) b.click(); } return; }
  const nudge = arrowNudge(e); if (nudge && selectedShapeIds().size) { e.preventDefault(); transformSelected(s => translate(s, nudge.dx, nudge.dy)); return; } /* 矢印キー：選んだ図形を動かす */
  if (isUndo(e) || isRedo(e)) { e.preventDefault(); if (isRedo(e)) history(redo, undo); else history(undo, redo); }
  else if (isCopy(e)) { e.preventDefault(); copySelected(); }
  else if (isSelectAll(e)) { e.preventDefault(); selectAllShapes(); }
  else if (isShortcut(e, 'g')) { e.preventDefault(); if (e.shiftKey) ungroupSelected(); else groupSelected(); }
  else if (e.code === 'Space') { if (e.target === canvas || e.target === document.body) { e.preventDefault(); space = true; } }
  else if (e.key === 'Escape') { hideCtxMenu(); gridPreviewCancel(); if (pasteGhost) { pasteGhost = null; $('hint').textContent = ''; draw(); return; } if (foldCutPicking) { foldCutPicking = false; $('hint').textContent = ''; draw(); return; } if (stage?.kind === 'path' && stage.nodes.length) { stage.nodes.pop(); if (!stage.nodes.length) stage = null; draw(); } else if (stage?.kind === 'radius') { stage = null; radiusHover = null; $('hint').textContent = t('hint.dimension'); draw(); } /* R の角を選んだあと：Esc で選びなおし（寸法ツールのまま） */ else if (mode === 'select' && !stage && !gesture && selected.size) { selected.clear(); nodeSel = null; draw(); } /* 選択ツールで作図中でなければ、Esc で選択を解除 */ else setMode('select'); }
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
window.addEventListener('keyup', e => { refreshMoveFree(e); if (e.code === 'Space') space = false; });
window.addEventListener('blur', () => { space = false; gesture = null; draw(); });
window.addEventListener('resize', resize);
/* キャンバスの表示サイズ（CSS）は、ウィンドウが同じでも変わる（下の案内文が折り返す・パネルが出入りする）。描画サイズ（ビットマップ）が古いままだと、描かれた線とクリックの位置がずれる（実際に約20px ずれた）ので、表示サイズが変わったら合わせ直す。 */
if (typeof ResizeObserver === 'function') new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - width) > 0.5 || Math.abs(r.height - height) > 0.5) resize(); }).observe(canvas);
doc.tools = loadTools(); initStitch(); initPresets(); initLayers(); initInfo(); initOutput(); initDesign(); init3d(); loadBinderEdits(); initHardware(); initPhrases(); initCalc(); initSpineSim(); initFoldSection(); initToolKeys(); initCtxSel(); initCtxTree(); initSideRecent(); initPropPanel(); initShowKeys(); initLibrary(); initAi(); initRecipe(); initImages(); initColors(); initTutorials(); initVoice(); initDesigns(); initLocalDesigner(); renderLayers(); rebuildSnaps(); resize(); fit(); setMode('select');
let initialLang = globalThis.navigator?.language?.startsWith('ja') ? 'ja' : 'en';
try { initialLang = localStorage.getItem('leather-cad.lang') || initialLang; } catch { /* 保存不可でもブラウザ言語で起動する。 */ }
/* 新しい版のお知らせ：公開された最新の版（version.json）が、開いている画面の版より新しいとき、画面の上に「新しい版があります」を出す。公開版（https）だけ。 */
/** 更新履歴の表示（事業主 2026-10-25「新しい版が出ましたという警告に、何を更新したのかを追記して」「過去の更新履歴を見られるようにボタンを」）：日付の行と、変わったことの行を、文字だけで並べる（入れ子にしない）。
 *  お知らせ（新しい版で変わったこと）と、「更新履歴」の小窓で同じ形を使う。mine＝いま開いている版（その行に印を付ける）。 */
function fillReleaseList(box, releases, mine) {
  box.textContent = '';
  for (const r of releases) {
    const h = document.createElement('div'); h.className = 'rel-date'; h.textContent = r.date === 'next' ? t('releaseNext') : r.date + (mine && r.date === mine.jst ? ' ' + t('releaseHere') : ''); box.appendChild(h);
    for (const it of r.items || []) { const d = document.createElement('div'); d.className = 'rel-item'; d.textContent = it; box.appendChild(d); }
  }
}
/** 更新履歴の検索（事業主 2026-10-25「更新履歴で検索窓を付けて」）：スペースで区切った言葉が、すべて入っている行だけを出す。全角・半角、大文字・小文字は区別しない。
 *  検索していないときは、公開した更新（新しい順）と、「それ以前の更新の記録」（ボタンで開閉）。検索中は、両方からさがして、出る。 */
const releaseNorm = s => String(s ?? '').normalize('NFKC').toLowerCase();
const releaseTerms = q => releaseNorm(q).split(/\s+/).filter(Boolean);
const releaseFilter = (list, terms) => list.map(r => ({ date: r.date, items: (r.items || []).filter(x => { const n = releaseNorm(x); return terms.every(w => n.includes(w)); }) })).filter(r => r.items.length);
let releaseOldOpen = false;
function renderReleaseDialog() {
  const mine = parseBuild($('buildVer')?.textContent), cur = DATA_RELEASE_NOTES?.releases ?? [], old = DATA_RELEASE_HISTORY?.days ?? [], terms = releaseTerms($('releaseSearch').value);
  const showOld = (list, open) => { $('releaseOldTitle').hidden = $('releaseOld').hidden = !open; if (open) fillReleaseList($('releaseOld'), list, null); };
  if (!terms.length) { fillReleaseList($('releaseList'), cur, mine); $('releaseCount').textContent = ''; $('releaseMore').hidden = false; $('releaseMore').textContent = t(releaseOldOpen ? 'releaseLess' : 'releaseMore', { n: old.length }); showOld(old, releaseOldOpen); return; }
  const a = releaseFilter(cur, terms), b = releaseFilter(old, terms), n = [...a, ...b].reduce((k, r) => k + r.items.length, 0);
  fillReleaseList($('releaseList'), a, mine); $('releaseMore').hidden = true; showOld(b, b.length > 0); $('releaseCount').textContent = n ? t('releaseFound', { n }) : t('releaseNone');
}
function openReleaseNotes() {
  const mine = parseBuild($('buildVer')?.textContent); $('releaseSearch').value = ''; releaseOldOpen = false;
  $('releaseNow').textContent = mine ? t('releaseNow', { ver: mine.jst }) : t('releaseDev'); renderReleaseDialog();
  const dlg = $('releaseDialog'); if (!dlg.open) dlg.showModal?.(); $('releaseSearch').focus?.();
}
let updateDismissed = '', lastVersionCheck = 0;
async function checkNewVersion() {
  const mine = parseBuild($('buildVer')?.textContent); if (!mine || typeof globalThis.fetch !== 'function' || globalThis.location?.protocol !== 'https:') return false;
  lastVersionCheck = Date.now();
  const v = await latestBuild(globalThis.fetch.bind(globalThis)); if (!isNewerBuild(mine, v) || updateDismissed === v.id) return false;
  $('updateInfo').textContent = t('updateInfo', { ver: v.jst }); const news = releasesSince(mine, v.releases); fillReleaseList($('updateNotes'), news, null); $('updateNotes').hidden = !news.length;   /* 新しい版で変わったこと */
  $('updateBar').hidden = false; $('updateBar').dataset.id = v.id; return true;
}
$('releaseBtn').onclick = openReleaseNotes; $('releaseClose').onclick = () => $('releaseDialog').close?.(); $('updateHistory').onclick = openReleaseNotes; $('releaseSearch').addEventListener('input', renderReleaseDialog); $('releaseMore').onclick = () => { releaseOldOpen = !releaseOldOpen; renderReleaseDialog(); };
$('updateNow').onclick = () => { try { flushAutosave(); } catch { /* 自動保存できなくても更新はできる */ } location.reload(); };
$('updateLater').onclick = () => { updateDismissed = $('updateBar').dataset.id || ''; $('updateBar').hidden = true; };
if (typeof setTimeout === 'function') setTimeout(checkNewVersion, 10000);
if (typeof setInterval === 'function') setInterval(checkNewVersion, 300000);
document.addEventListener?.('visibilitychange', () => { if (!document.hidden && Date.now() - lastVersionCheck > 60000) checkNewVersion(); });
applyLanguage(initialLang); syncLockMarks(); $('lockRegister').onclick = () => { $('lockDialog').close(); openRegistration(); }; $('lockClose').onclick = () => $('lockDialog').close(); registration.refresh?.()?.then?.(syncLockMarks);
initCounting(); initPresence();
tabLock?.check(); syncMultiTabBar(); if (tabIsPrimary()) offerRestore(); else { restoreSkipped = true; offerRestore([AUTOSAVE_SUB_KEY]); }   /* 別のタブが主なら、前回の続きは出さない（主のタブの保存を、副が消さない）。「このタブで続ける」か、主のタブが閉じたら出す */
autosaveReady = true; startTabWatch();
window.addEventListener?.('beforeunload', e => { if (unsavedNotAutosaved()) { e.preventDefault(); e.returnValue = ''; } });   /* 自動保存に乗っていない未保存の変更（大きすぎ・保存できない）があるときだけ、閉じる・更新・再読み込みの前にブラウザの確認を出す。自動保存が効いていれば出さない */
showTour();
}
