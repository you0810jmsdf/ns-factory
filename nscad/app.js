import { distance, distToShape, snapPoints, intersections, bboxOf, bboxOfDoc, newDoc, validateDoc, migrateDoc, arcSweep, circlePoint, chamferCorner, filletCorner, offsetShape, offsetPath, translate, rotate, mirrorX, mirrorY, arcLength, pointAtLength, chainShapes, resolvePath, pointsAlongShape, cornerHoles, toothPositions, projectOnPath, holeAppearance, defaultTools, dimension, areaOf, parseInput, pathSegments, pathNode, toPath, pathInsertNode, pathRemoveNode, reflectAcross, trimAt } from './geometry.js';
import { docToSvg, docToDxfR12, docToPdf, pagesFor, printLayout, pageSvg, calibrationFactor, calibrationScale } from './formats.js';
import { svgToShapes, dxfToShapesFull } from './importers.js';
import { beamStudioSvg, leathercraftDxf, importLeathercraft, recoverArcs, attachHoles } from './interop.js';
import { buildPanels, applyFolds, project, collisions, viewMatrix, orthoViews, viewsToSvg, defaultCamera, v3, unfold, triangulate } from './sim3d.js';
import { closedBinderViews, closedBinderViewsSvg, spineSim, spinePlayFromMeasured, spineSectionSvg, hardwareFootprint, placeFootprint, spineWidth, binderPlanSvg, binderSideSvg, binderFrontSvg } from './hardware.js';
import { DATA_HARDWARE } from './data/hardware.js';
import { DATA_LIBRARY } from './data/library.js';
import { varStep, instantiateItem, extractSelection, encodeClipboard, decodeClipboard, mergePayload, checkLibraryItem } from './library.js';
import { docToAiJson, validateActions, estimateYen, roughTokens } from './ai_schema.js';
import { buildDoc, check, threadEstimate, defaultRecipe } from './autodesign.js';
import { traceImage, scaleFromTwoPoints, scaleFromDpi } from './trace.js';
import { DATA_LEATHER_COLORS } from './data/leather-colors.js';
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
import { postChat } from './ai_client.js';
import { BINDER_SPECS } from './data/binder.js';
import { foldAllowance, stackOffset, matchRoutes, optimizePatchHoles, suggestPatchSize, patchGrid, extendAcrossFold, komaStitchLine, regionAt, fillRegionPattern, PATCH_PATTERNS, patchInsetStitch, PATCH_EDGE_MIN_MM, offsetSpan, offsetSpanResult } from './design.js';
import { t, setLang } from './i18n.js';
import { isShortcut, isUndo, isRedo, isCopy, isDelete, isSelectAll } from './shortcuts.js';
import { HELP_JA } from './help/ja.js';
import { HELP_EN } from './help/en.js';

if (globalThis.__LC_BOOTED) { /* file 互換ブロックが起動済み */ } else {
globalThis.__LC_BOOTED = true;

const $ = id => document.getElementById(id);
let longPressed = false; // ツールボタンを長押ししてヘルプを開いた直後のクリックは無視する
const canvas = $('canvas'); let ctx = canvas.getContext('2d'), exporting = false;
let doc = newDoc(), selected = new Set(), undo = [], redo = [];
let ruler = null; /* 定規の測定結果 {a, b}。図形ではなく表示だけ */
let mode = 'select', gesture = null, stage = null, space = false, cursor = { x: 0, y: 0 }, snap = null;
let width = 1, height = 1, scale = 4, origin = { x: 80, y: 400 }, snapCache = [];
let offsetSelection = null; /* オフセットで選んだ範囲 {points, closed, whole, layer}。距離を決めて Enter で実行 */
let magnetEnds = [], magnetCenters = []; /* 端点・円/円弧の中心：スナップのチェックと無関係に吸い付く候補 */
let manualNext = null, activeLayer = 'pattern', nodeSel = null, lastPoint = { x: 0, y: 0 }, pairLines = [];
const isMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '');
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
  $('hint').textContent = t('hint.' + mode); refreshTools(); renderLayers(); showCalibration(); if (typeof renderLibrary === 'function' && $('libItem')) { renderLibrary(); renderDesigns(); initTutorialSelect(); $('styleNote').textContent = styleSummary(DATA_STYLE, current === 'en' ? 'en' : 'ja'); } draw();
}
const world = p => ({ x: (p.x - origin.x) / scale, y: (p.y - origin.y) / scale });
const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const visible = s => doc.layers.find(l => l.id === s.layer)?.visible;
const editable = s => { const l = doc.layers.find(l => l.id === s.layer); return l?.visible && !l.locked; };
// 文字・寸法・折り線・下絵は縫い経路・オフセット・面取りの対象にしない。
const stitchable = s => !['text', 'dimension', 'fold', 'image'].includes(s.type);
const partOf = s => doc.parts.find(p => p.shapeIds.includes(s.id)) || null;
const layerName = l => l.name === l.id && ['pattern', 'marks', 'guide', 'hwholes'].includes(l.id) ? t('layer.' + l.id) : l.name;

function selectedShapeIds() {
  const ids=new Set(doc.shapes.filter(s=>selected.has(s.id)&&editable(s)).map(s=>s.id));
  for(const p of doc.paths) if(p.shapeIds.some(id=>ids.has(id)) && p.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id))))p.shapeIds.forEach(id=>ids.add(id));
  for(const p of doc.paths) if(p.shapeIds.some(id=>!editable(doc.shapes.find(s=>s.id===id))))p.shapeIds.forEach(id=>ids.delete(id));
  return ids;
}
function holeVisible(h) { const p=doc.paths.find(p=>p.id===h.pathId);return p && p.shapeIds.every(id=>{const s=doc.shapes.find(s=>s.id===id);return s&&visible(s);}); }
function holeEditable(h) { const p=doc.paths.find(p=>p.id===h.pathId);return p && p.shapeIds.every(id=>{const s=doc.shapes.find(s=>s.id===id);return s&&editable(s);}); }
function loadTools() {
  try { const list=JSON.parse(localStorage.getItem('leather-cad.tools')); if(Array.isArray(list)&&list.length){const d=newDoc();d.tools=list;if(validateDoc(d))return list;} } catch { /* 保存制限・旧設定は既定値で継続。 */ }
  return defaultTools();
}
function persistTools() { try { localStorage.setItem('leather-cad.tools',JSON.stringify(doc.tools)); } catch { $('hint').textContent=t('storageUnavailable'); } }
function refreshTools() {
  $('defaultMark').value=doc.mark; $('dotD').value=doc.dotD;
  const current=$('stitchTool').value; $('stitchTool').textContent='';
  for(const tool of doc.tools){const option=document.createElement('option');option.value=tool.id;option.textContent=tool.name===tool.id?t('toolSummary',{kind:t(tool.kind),pitch:tool.pitch,teeth:tool.teeth}):tool.name;$('stitchTool').appendChild(option);}
  $('stitchTool').value=doc.tools.some(t=>t.id===current)?current:doc.tools[0]?.id||'';
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
  const tmp = newDoc(); tmp.tools = [tool]; const len = tool.pitch * 9;
  tmp.shapes.push({ id: 's1', layer: 'pattern', type: 'line', x1: 10, y1: 15, x2: 10 + len, y2: 15 }, { id: 's2', layer: 'marks', type: 'line', x1: 10, y1: 25, x2: 60, y2: 25 }, { id: 's3', layer: 'marks', type: 'line', x1: 10, y1: 23, x2: 10, y2: 27 }, { id: 's4', layer: 'marks', type: 'line', x1: 60, y1: 23, x2: 60, y2: 27 }, { id: 's5', layer: 'marks', type: 'text', x: 10, y: 33, text: `${tool.name}  ${tool.pitch}mm  ${tool.holeW}x${tool.holeH}mm  ${tool.angleDeg}deg   |---- 50mm ----|`, sizeMm: 3, angleDeg: 0 });
  tmp.paths.push({ id: 'p1', shapeIds: ['s1'], reversed: false, closed: false, segments: [{ from: 0, to: len, toolId: tool.id, pitch: tool.pitch, mode: 'fixed' }], mark: 'tool' });
  for (let i = 0; i <= 9; i++) tmp.holes.push({ id: 'h' + i, pathId: 'p1', s: i * tool.pitch, x: 10 + i * tool.pitch, y: 15, angleDeg: tool.angleDeg, toolId: tool.id, mark: 'tool' });
  return printPages(tmp);
}
function fillTool() {
  const tool=doc.tools.find(t=>t.id===$('stitchTool').value);if(!tool)return;
  for(const key of ['name','kind','pitch','teeth','holeW','holeH','holeD','angleDeg'])$('tool-'+key).value=tool[key];
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
function stampAt(p,single=false,markKind='tool') {
  const hit=doc.shapes.filter(s=>editable(s)&&stitchable(s)).reverse().find(s=>distToShape(s,p)<=8/scale),tool=doc.tools.find(t=>t.id===$('stitchTool').value);
  if(!hit||!tool)return;
  try {
    const state=routeForHit(hit);if(!state?.route)return;
    const {saved,fresh}=state;
    if(!saved.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id))))return;
    const isMark=markKind!=='tool',reverse=isMark?!!saved.reversed:$('reversePath').checked, route={...state.route,reversed:reverse},len=arcLength(route),opts=stitchOptions(),manual=$('placement').value==='manual'||single;
    const from=isMark?0:Math.max(opts.from,opts.offsetStart),to=isMark?len:Math.min(opts.to,len-opts.offsetEnd); /* 目印は始端の空き・区間設定に縛られず、線上のどこにでも打てる */
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
    $('hint').textContent=t(manualNext?'nextStamp':'placed',{count:points.length,s:next?.toFixed(2)});draw();
  }catch(err){$('hint').textContent=err.message;}
}
function holePosition(h,p) {
  if(!$('constrainHole').checked)return {...h,x:p.x,y:p.y};
  const saved=doc.paths.find(path=>path.id===h.pathId),route=saved&&resolvePath(doc,saved);if(!route)return h;
  const old=pointAtLength(route,h.s),next=projectOnPath(route,p);
  return {...h,x:next.x,y:next.y,s:next.s,angleDeg:h.angleDeg+($('followTangent').checked?next.angleDeg-old.angleDeg:0)};
}
function affectedHoles(all=false) {
  const paths=new Set(doc.paths.filter(p=>p.shapeIds.some(id=>selected.has(id))).map(p=>p.id));
  return doc.holes.filter(h=>holeEditable(h)&&(all||selected.has(h.id)||paths.has(h.pathId)));
}
function markHoles(mark,all=false) { commit(()=>affectedHoles(all).forEach(h=>h.mark=mark)); }
// ツール id → ヘルプのページ id（文脈ヘルプ：ツールボタンを右クリック／長押しで開く）
const TOOL_HELP = { patchfill: 'design', ruler: 'text-dimension', rect: 'drawing', mark: 'stitching', select: 'drawing', line: 'drawing', circle: 'drawing', arc: 'drawing', bezier: 'drawing', polyline: 'drawing', path: 'pen', text: 'text-dimension', dimension: 'text-dimension', fillet: 'drawing', chamfer: 'drawing', offset: 'drawing', trim: 'trim-mirror', mirror: 'trim-mirror', stitch: 'stitching', fold: 'design', koma: 'design', hardware: 'hardware', library: 'library', imgScale: 'underlay' };
function helpData() { return document.documentElement.lang === 'en' ? HELP_EN : HELP_JA; }
function renderHelpSelect() {
  const sel = $('helpPage'), q = ($('helpSearch').value || '').toLowerCase(), keep = sel.value; sel.textContent = '';
  const all = document.createElement('option'); all.value = ''; all.textContent = t('helpAll'); sel.appendChild(all);
  for (const p of helpData().pages.filter(p => !q || (p.title + ' ' + p.body).toLowerCase().includes(q))) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.title; sel.appendChild(o); }
  sel.value = keep && helpData().pages.some(p => p.id === keep) ? keep : '';
}
function showHelp(shortcuts = false, pageId = null) {
  const data = helpData();
  if (shortcuts) { $('helpBody').textContent = t('shortcutsText', { mod: isMac ? '⌘' : 'Ctrl+' }); $('helpDialog').showModal(); return; }
  if (pageId !== null) $('helpPage').value = pageId;
  renderHelpSelect();
  const q = ($('helpSearch').value || '').toLowerCase(); if (!$('helpPage').value && !q && data.pages.length) $('helpPage').value = data.pages[0].id; const id = $('helpPage').value;
  const pages = data.pages.filter(p => (!id || p.id === id) && (!q || (p.title + ' ' + p.body).toLowerCase().includes(q)));
  $('helpBody').textContent = pages.length ? pages.map(p => p.title + '\n' + p.body).join('\n\n') : t('helpNoMatch');
  $('helpDialog').showModal();
}
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
  'textSize', 'dimOffset', 'offsetJoin', 'mirrorHoles', 'arcMethod', 'arcRadius', 'snapDist', 'offsetDist', 'offsetSide',
  'patchPitch', 'patchTol', 'patchClear', 'patchTargetW', 'patchTargetH', 'patchAllowance', 'patchCols', 'patchRows', 'seamStyle', 'patchPattern', 'patchCell', 'patchStitch', 'patchHole', 'patchInset', 'patchEdgeBan',
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
  $('offsetDist').value='3'; $('offsetSide').value='out'; $('offsetJoin').value='miter'; $('mirrorHoles').value='reverse'; $('arcMethod').value='radius'; $('arcRadius').value='';
  try { const saved = localStorage.getItem('leather-cad.snapDist'); $('snapDist').value = saved !== null && Number.isFinite(Number(saved)) && Number(saved) >= 0 ? saved : '10'; } catch { $('snapDist').value = '10'; }
  $('snapDist').addEventListener('change', () => { saveSnapDist(); draw(); });
  const values={placement:'fixed',cornerMode:'place',offsetStart:'0',offsetEnd:'0',segmentFrom:'0',segmentTo:'',holeAngle:'0',dotD:'2',defaultMark:'tool'};
  for(const [id,value]of Object.entries(values))$(id).value=value;
  for(const id of ['chain','followTangent','constrainHole'])$(id).checked=true;
  for(const id of ['reversePath','reverseSlant'])$(id).checked=false;
  $('stitchTool').addEventListener('change',()=>{manualNext=null;fillTool();});
  $('toolStrip').onclick=()=>printToolStrip(); $('toolReassign').onclick=()=>reassignTool($('stitchTool').value,$('toolReassignTo').value,false); $('toolReassignSel').onclick=()=>reassignTool($('stitchTool').value,$('toolReassignTo').value,true); $('addTool').onclick=()=>registerTool(false);$('updateTool').onclick=()=>registerTool(true);
  $('resetManual').onclick=()=>{manualNext=null;draw();};
  for(const id of ['placement','reversePath','offsetStart','offsetEnd','segmentFrom','segmentTo'])$(id).addEventListener('change',()=>{manualNext=null;});
  $('clearHoles').onclick=()=>commit(()=>{const ids=new Set(affectedHoles(true).map(h=>h.id));doc.holes=doc.holes.filter(h=>!ids.has(h.id));doc.paths.filter(p=>p.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id)))).forEach(p=>p.segments=[]);selected.clear();manualNext=null;});
  $('clearPathHoles').onclick=()=>commit(()=>{const ids=new Set(affectedHoles().map(h=>h.id));doc.holes=doc.holes.filter(h=>!ids.has(h.id));selected.clear();manualNext=null;});
  $('selectedDots').onclick=()=>markHoles('dot');$('allDots').onclick=()=>markHoles('dot',true);
  $('restoreMarks').onclick=()=>commit(()=>{affectedHoles(true).forEach(h=>h.mark='tool');doc.paths.filter(p=>p.shapeIds.every(id=>editable(doc.shapes.find(s=>s.id===id)))).forEach(p=>p.mark='tool');doc.mark='tool';$('defaultMark').value='tool';});
  $('applyMark').onclick=()=>markHoles($('holeMark').value);
  $('applyAngle').onclick=()=>{const a=Number($('holeAngle').value);if(Number.isFinite(a))commit(()=>affectedHoles().forEach(h=>h.angleDeg=a));};
  $('flipSlant').onclick=()=>commit(()=>affectedHoles().forEach(h=>{const route=resolvePath(doc,doc.paths.find(p=>p.id===h.pathId));const tangent=$('followTangent').checked?pointAtLength(route,h.s).angleDeg:0;h.angleDeg=2*tangent-h.angleDeg;}));
  $('defaultMark').addEventListener('change',()=>commit(()=>doc.mark=$('defaultMark').value));
  $('dotD').addEventListener('change',()=>{const d=Number($('dotD').value);if(Number.isFinite(d)&&d>0)commit(()=>doc.dotD=d);else $('dotD').value=doc.dotD;});
  $('help').onclick=()=>showHelp();$('closeHelp').onclick=()=>$('helpDialog').close();
  $('helpSearch').addEventListener('input',()=>showHelp(false));$('helpPage').addEventListener('change',()=>showHelp(false));
  document.querySelectorAll('[data-tool]').forEach(b=>{ b.addEventListener('contextmenu',e=>{e.preventDefault();showHelp(false,TOOL_HELP[b.dataset.tool]||'');}); let timer=null; b.addEventListener('pointerdown',()=>{timer=setTimeout(()=>{longPressed=true;showHelp(false,TOOL_HELP[b.dataset.tool]||'');},700);}); b.addEventListener('click',e=>{ if(longPressed){ longPressed=false; e.stopImmediatePropagation(); e.preventDefault(); } },true); for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,()=>clearTimeout(timer)); });
  $('setDefaultTool').onclick=()=>{ try { localStorage.setItem('leather-cad.defaultTool',$('stitchTool').value); $('hint').textContent=t('defaultToolSaved'); } catch { $('hint').textContent=t('storageUnavailable'); } };
  refreshTools();
  try { const id=localStorage.getItem('leather-cad.defaultTool'); if(id&&doc.tools.some(t=>t.id===id)){$('stitchTool').value=id;fillTool();} } catch { /* 保存不可は既定のまま。 */ }
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
  $('layerSolo').onclick = soloLayer; $('layerAll').onclick = showAllLayers; $('layerMove').onclick = moveSelectedToLayer; $('layerPickYellow').onclick = pickYellowDashed;
  $('layerLocked').addEventListener('change', () => { commit(() => { doc.layers.find(l => l.id === activeLayer).locked = $('layerLocked').checked; selected.clear(); }); renderLayers(); });
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
function refreshInfo() {
  const s = infoShape(); infoBusy = true;
  $('infoCard').style.display = s ? '' : 'none'; /* 何も選んでいないときは情報カードを出さない */
  for (const f of ALL_FIELDS) $('l-' + f).hidden = !s || !INFO_FIELDS[s.type]?.includes(f);
  $('l-type').hidden = $('l-layer').hidden = !s;
  if (s) {
    $('info-type').textContent = t(s.type); $('info-layer').value = s.layer;
    const typing = el => typeof document.activeElement !== 'undefined' && document.activeElement === el; // 打ちかけの欄は巻き戻さない
    for (const f of ['x','y','x1','y1','x2','y2','cx','cy','r','startDeg','endDeg','sizeMm','angleDeg','offset']) if (f in s && !typing($('info-' + f))) $('info-' + f).value = Number(s[f]).toFixed(2);
    if ('text' in s && !typing($('info-text'))) $('info-text').value = s.text;
    if ('closed' in s) $('info-closed').checked = s.closed;
    if ('inner' in s) $('info-inner').checked = s.inner;
    if (INFO_FIELDS[s.type]?.includes('color')) { $('info-color').value = s.color || ''; $('info-lineStyle').value = s.lineStyle || ''; }
    $('info-length').value = (s.type === 'fold' ? distance({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) : arcLength(s)).toFixed(2);
    renderPartInfo(s);
    if (s.type === 'polyline' || s.type === 'path') { $('info-nodes').textContent = String((s.points || s.nodes).length); $('info-area').textContent = s.closed ? areaOf(s.type === 'path' ? flattenForArea(s) : s.points).toFixed(1) + ' mm²' : '—'; }
    $('l-nodeOps').hidden = !(s.type === 'path' && nodeSel?.id === s.id);
  }
  infoBusy = false;
}
function flattenForArea(s) { const pts = pathSegments(s).flatMap((seg, i) => { const ps = seg.type === 'line' ? [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }] : Array.from({ length: 17 }, (_, k) => { const t = k / 16, u = 1 - t; return { x: u**3*seg.x1 + 3*u*u*t*seg.c1x + 3*u*t*t*seg.c2x + t**3*seg.x2, y: u**3*seg.y1 + 3*u*u*t*seg.c1y + 3*u*t*t*seg.c2y + t**3*seg.y2 }; }); return i ? ps.slice(1) : ps; }); return pts; }
function applyInfo(field) {
  if (infoBusy) return; const s = infoShape(); if (!s || !editable(s)) return;
  const num = f => Number($('info-' + f).value);
  const next = { ...s };
  if (field === 'layer') { next.layer = $('info-layer').value; }
  else if (field === 'text') { const text = $('info-text').value; if (!text) { $('hint').textContent = t('invalidNumber'); return; } next.text = text; }
  else if (field === 'closed') { if (s.type === 'polyline' && s.points.length < 3) return; next.closed = $('info-closed').checked; }
  else if (field === 'inner') { next.inner = $('info-inner').checked; }
  else if (field === 'color' || field === 'lineStyle') { const v = $('info-' + field).value; if (v) next[field] = v; else delete next[field];
    if (field === 'lineStyle' && v !== 'dashed' && s.lineStyle === 'dashed' && s.layer === 'guide' && doc.layers.some(l => l.id === 'pattern')) { next.layer = 'pattern'; $('hint').textContent = t('solidToPattern'); } /* 実線は型紙 */
    else if (field === 'lineStyle' && v === 'dashed' && s.lineStyle !== 'dashed' && s.layer !== 'guide' && doc.layers.some(l => l.id === 'guide')) { next.layer = 'guide'; const g = doc.layers.find(l => l.id === 'guide'); $('hint').textContent = t(g.visible && !g.locked ? 'dashedToGuide' : 'dashedToGuideHidden'); } } /* 実線を点線にしたら、ガイドの層の図形として扱う（色は問わない） */
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
  const b = bboxOfDoc({ shapes, holes: [] }), layer = doc.layers.find(l => l.id === 'marks') ? 'marks' : shapes[0].layer;
  doc.shapes.push({ id: freshId(doc.shapes, 's'), layer, type: 'text', x: (b.minX + b.maxX) / 2 - 6, y: (b.minY + b.maxY) / 2, text: t('flipMarkText'), sizeMm: 3, angleDeg: 0 });
}

// ---- 駒合わせ・パッチワーク ----
function stitchToolCurrent() { return doc.tools.find(t => t.id === $('stitchTool').value) || doc.tools[0]; }
function placeHoles(saved, route, points, tool) {
  for (const p of points) { const id = freshId(doc.holes, 'h'); doc.holes.push({ id, pathId: saved.id, s: p.s, x: p.x, y: p.y, angleDeg: ($('followTangent').checked ? p.angleDeg : 0) + slantOf(tool), toolId: tool.id, mark: 'tool' }); }
  saved.segments = [{ from: 0, to: arcLength(route), toolId: tool.id, pitch: tool.pitch, mode: 'variable' }];
}
function komaClick(p) {
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distToShape(s, p) <= 7 / scale); if (!hit) return;
  const state = routeForHit(hit); if (!state?.route) return;
  if (stage?.kind !== 'koma') { stage = { kind: 'koma', a: state }; selected = new Set([hit.id]); $('hint').textContent = t('komaSecond'); draw(); return; }
  if (state.saved.shapeIds.join() === stage.a.saved.shapeIds.join()) return;
  const tool = stitchToolCurrent(); if (!tool) return;
  const a = stage.a, b = state, opts = { prefer: $('komaPrefer').value, marginStart: Number($('offsetStart').value) || 0, marginEnd: Number($('offsetEnd').value) || 0, tolerancePct: Number($('patchTol').value) || 15 };
  const result = matchRoutes(a.route, b.route, tool.pitch, opts); stage = null;
  if (!result.holesA.length) { $('hint').textContent = t('impossible'); draw(); return; }
  commit(() => {
    for (const side of [a, b]) { if (side.fresh) { side.saved.id = freshId(doc.paths, 'p'); doc.paths.push(side.saved); side.fresh = false; } doc.holes = doc.holes.filter(h => h.pathId !== side.saved.id); }
    placeHoles(a.saved, a.route, result.holesA, tool); placeHoles(b.saved, b.route, result.holesB, tool);
    selected = new Set([hit.id, ...a.saved.shapeIds]);
  });
  pairLines = result.pairs.map(pr => [result.holesA[pr.a], result.holesB[pr.b]]);
  $('hint').textContent = result.warn ? t('komaWarn', { n: result.holesA.length, pct: Math.max(...result.segments.map(s => s.diffPct)).toFixed(1) }) : t('komaDone', { n: result.holesA.length, pa: result.segments[0].pitchA.toFixed(2), pb: result.segments[0].pitchB.toFixed(2) });
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
    const ids = polys.map(points => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer, type: 'polyline', closed: true, points }); return id; });
    selected = new Set(ids);
    if (tool && !doc.tools.some(x => x.id === tool.id)) doc.tools.push({ ...tool }); /* 穴が指す工具が無いと困るので、新しく作った工具は登録する */
    if (tool) { /* クロスステッチ：穴は境界の上ではなく、各ピースの縁から inset mm 内側の縫い線（黄色の点線）の上に打ち、境界をはさんで向かい合う穴を対にする */
      const stitch = patchInsetStitch(polys, inset), stitchLayer = doc.layers.find(l => l.id === 'marks' && l.visible && !l.locked)?.id || layer, style = seamStyleValue();
      const pathOfPiece = stitch.insets.map(pts => {
        if (!pts) return null;
        const sid = freshId(doc.shapes, 's'); doc.shapes.push({ id: sid, layer: stitchLayer, type: 'polyline', closed: true, points: pts.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) })), color: 'yellow', lineStyle: 'dashed' });
        const pid = freshId(doc.paths, 'p'); doc.paths.push({ id: pid, shapeIds: [sid], reversed: false, closed: true, segments: [], mark: 'tool' }); return pid;
      });
      for (const s of stitch.seams) doc.seams.push({ id: freshId(doc.seams, 'seam'), a: { pathId: pathOfPiece[s.a.piece], from: s.a.from, to: s.a.to }, b: { pathId: pathOfPiece[s.b.piece], from: s.b.from, to: s.b.to }, style, reversed: s.reversed });
      let holes = stitch.seams.length ? autoPatchHoles(tool) : 0, banned = 0;
      if (banEdge) { /* 念のための検査：縁から2.5mm未満の菱目は取り除く（座標を4桁に丸める誤差 0.001mm は許す） */
        const drop = new Set(doc.holes.filter(h => { const i = pathOfPiece.indexOf(h.pathId); return i >= 0 && distToShape({ type: 'polyline', closed: true, points: polys[i] }, h) < PATCH_EDGE_MIN_MM - 1e-3; }).map(h => h.id));
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
  $('newPart').onclick = newPart; $('addFold').onclick = addFoldAllowance; $('applyStack').onclick = applyStack;
  $('offsetRun').onclick = () => runOffset();
  for (const id of ['rb-ax', 'rb-ay', 'rb-bx', 'rb-by']) $(id).addEventListener('input', rulerFromBar);
  /* 図形のそばの入力欄：右のカードの距離・向きと値を共有する */
  $('of-dist').addEventListener('input', () => { $('offsetDist').value = $('of-dist').value; });
  $('of-side').addEventListener('change', () => { $('offsetSide').value = $('of-side').value; });
  $('offsetDist').addEventListener('input', () => { $('of-dist').value = $('offsetDist').value; });
  $('offsetSide').addEventListener('change', () => { $('of-side').value = $('offsetSide').value; });
  for (const id of ['of-dist', 'of-side']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runOffset(); } });
  $('of-run').onclick = () => runOffset();
  $('of-close').onclick = () => { offsetSelection = null; draw(); canvas.focus(); };
  $('offsetDist').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runOffset(); } });
  for (const id of ['patchPattern', 'patchCell', 'patchStitch', 'patchHole', 'patchInset', 'patchEdgeBan', 'patchPitch', 'patchTol', 'patchClear', 'stitchTool']) { $(id).addEventListener('input', regenPatch); $(id).addEventListener('change', regenPatch); }
  $('guideBtn').onclick = () => { if (typeof window.open === 'function') window.open('guide.html', '_blank'); }; /* 図解ガイド（日本語）を別タブで開く */
  $('patchFill').onclick = () => { setMode('patchfill'); $('hint').textContent = t('hint.patchfill'); };
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
  $('toPath').onclick = () => { const ids = selectedShapeIds(); cancel(); commit(() => { doc.shapes = doc.shapes.map(s => ids.has(s.id) && ['line','bezier','polyline'].includes(s.type) ? toPath(s) : s); }); };
}

// ---- 出力（SVG・DXF・印刷・校正）----
const PAGES = { a4: { w: 190, h: 277 }, a4l: { w: 277, h: 190 }, a3: { w: 277, h: 400 }, a3l: { w: 400, h: 277 } };
let calibration = { fx: 1, fy: 1 }, measuredCalibration = { fx: 1, fy: 1 };
function loadCalibration() { try { const c = JSON.parse(localStorage.getItem('leather-cad.calibration')); if (c && Number.isFinite(c.fx) && Number.isFinite(c.fy) && c.fx > 0 && c.fy > 0) calibration = { fx: c.fx, fy: c.fy }; } catch { /* 既定 1.0 のまま。 */ } showCalibration(); }
function showCalibration() { $('calibInfo').textContent = calibration.fx === 1 && calibration.fy === 1 ? t('calibNone') : t('calibCurrent', { fx: calibration.fx.toFixed(4), fy: calibration.fy.toFixed(4) }); }
function saveCalibration(next) { calibration = next; try { localStorage.setItem('leather-cad.calibration', JSON.stringify(next)); } catch { $('hint').textContent = t('storageUnavailable'); } showCalibration(); }
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportSvg() {
  const preset = $('exportPreset').value;
  const svg = preset === 'beam' ? beamStudioSvg(doc, { kerfMm: Number($('kerf').value) || 0, includeHoles: $('outHoles').checked }) : docToSvg(doc, { includeHoles: $('outHoles').checked, fill: $('outFill').checked });
  download(preset === 'beam' ? 'leather-pattern-beam.svg' : 'leather-pattern.svg', svg, 'image/svg+xml'); $('hint').textContent = t('exported', { name: preset === 'beam' ? 'SVG (Beam Studio)' : 'SVG' });
}
function exportPdf() {
  const paper = $('paper').value, bytes = docToPdf(doc, { paper: paper.startsWith('a3') ? 'a3' : 'a4', landscape: paper.endsWith('l'), includeHoles: $('outHoles').checked, calibration: $('outCalib').checked ? calibration : null });
  download('leather-pattern.pdf', bytes, 'application/pdf'); $('hint').textContent = t('pdfExported', { n: bytes.pages, s: bytes.skippedText });
}
/** 図面を PNG に描いてダウンロード。dpi 指定・白背景／透明。画素数が 5,000 万を超えるときは dpi を落とす。 */
function exportPng() {
  const shapes = doc.shapes.filter(visible), holes = doc.holes.filter(holeVisible), b = bboxOfDoc({ ...doc, shapes, holes });
  if (!b) { $('hint').textContent = t('nothingToPrint'); return; }
  let dpi = Number($('pngDpi').value) || 300; const margin = 2, wMm = b.maxX - b.minX + 2 * margin, hMm = b.maxY - b.minY + 2 * margin;
  const pixels = d => (wMm / 25.4 * d) * (hMm / 25.4 * d); let lowered = false;
  while (pixels(dpi) > 50e6 && dpi > 10) { dpi = Math.floor(dpi * 0.8); lowered = true; }
  const off = document.createElement('canvas'); if (typeof off.getContext !== 'function') { $('hint').textContent = t('pngUnavailable'); return; }
  const k = dpi / 25.4; off.width = Math.ceil(wMm * k); off.height = Math.ceil(hMm * k);
  const saved = { ctx, width, height, scale, origin }; ctx = off.getContext('2d'); exporting = true;
  width = off.width; height = off.height; scale = k; origin = { x: (margin - b.minX) * k, y: (margin - b.minY) * k };
  try { if (!$('pngTransparent').checked) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, off.width, off.height); } draw(); }
  finally { ({ ctx, width, height, scale, origin } = saved); exporting = false; draw(); }
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
  const known = new Set(['pattern', 'marks', 'guide', ...doc.layers.map(l => l.id)]);
  const res = importShapes(shapes, { layersFrom: layersFrom.filter(l => !/^(LineType_\d+|Stitch_Holes|0)$/i.test(l)).concat([...new Set(shapes.map(s => s.layer))].filter(l => !known.has(l))) });
  if (lc.holeCandidates.length) {
    let result = { attached: 0, orphan: 0 };
    commit(() => { result = attachHoles(doc, lc.holeCandidates, { freshId }); });
    refreshTools(); $('hint').textContent += ' ' + t('holesRestored', { n: result.attached, o: result.orphan }); res.holes = result.attached;
  }
  return res;
}
async function openFile(file) {
  const name = (file.name || '').toLowerCase();
  if (/\.(png|jpe?g|webp)$/.test(name)) { try { await importImageFile(file); return { added: 1, dropped: 0 }; } catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); return null; } }
  const text = await file.text();
  try {
    if (name.endsWith('.svg')) { const r = svgToShapes(text); return importVector(r.shapes, r.layers, { recover: false }); }
    if (name.endsWith('.dxf')) { const r = dxfToShapesFull(text); const res = importVector(r.shapes, [], { recover: $('recoverArcs').checked }); if (r.units === null) $('hint').textContent += ' ' + t('dxfUnitsAssumed'); return res; }
    if (/\.(png|jpe?g|webp)$/.test(name)) { await importImageFile(file); return { added: 1, dropped: 0 }; }
    if (name.endsWith('.lcc')) { const r = lccToDoc(text, { name: file.name, tools: loadTools() }); if (!validateDoc(r.doc)) throw new Error(t('invalidDoc')); cancel(); commit(() => { doc = r.doc; selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); pairLines = []; renderLayers(); renderSeams(); fit(); $('hint').textContent = t('lccLoaded', { n: r.doc.shapes.length, h: r.stats.holesAttached, w: r.warnings.length }); return { added: r.doc.shapes.length, dropped: r.warnings.length }; }
    const next = migrateDoc(JSON.parse(text));
    if (!validateDoc(next)) throw new Error(t('invalidDoc'));
    cancel(); commit(() => { doc = next; selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); pairLines = []; renderLayers(); renderSeams(); fit(); $('hint').textContent = t('loaded') + t('hint.' + mode);
    return { added: next.shapes.length, dropped: 0 };
  } catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); return null; }
}
function exportDxf() {
  const preset = $('exportPreset').value;
  const dxf = preset === 'leathercraft' ? leathercraftDxf(doc, { includeHoles: $('outHoles').checked, originAtCorner: true }) : docToDxfR12(doc, { includeHoles: $('outHoles').checked, dotAsPoint: $('dotAsPoint').checked });
  download(preset === 'leathercraft' ? 'leather-pattern-lc.dxf' : 'leather-pattern.dxf', dxf, 'application/dxf'); $('hint').textContent = t('exported', { name: preset === 'leathercraft' ? 'DXF (Leathercraft CAD)' : 'DXF' });
}
/** 現在の用紙設定（paper・重なり10mm）で割付を計算し、ページ境界とページ番号を薄い赤破線で重ねる。表示専用（draw() 内のみ・出力には含めない）。選択・編集の対象にはしない。 */
function drawPrintOverlay() {
  const shapes = doc.shapes.filter(visible), overlapMm = 10, pageMm = PAGES[$('paper').value] || PAGES.a4;
  const holes = $('outHoles').checked ? doc.holes.filter(h => doc.paths.some(p => p.id === h.pathId && p.shapeIds.every(id => shapes.some(s => s.id === id)))) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }); if (!b) return;
  const layout = printLayout(b, pageMm, overlapMm, null);
  ctx.save(); ctx.setLineDash([4 / scale, 3 / scale]); ctx.lineWidth = 1 / scale; ctx.strokeStyle = 'rgba(255,90,90,0.5)'; ctx.fillStyle = 'rgba(255,120,120,0.7)'; ctx.font = `${12 / scale}px system-ui, sans-serif`;
  layout.pages.forEach((p, i) => { ctx.strokeRect(p.x, p.y, p.w, p.h); ctx.fillText(`${i + 1}/${layout.pages.length}  ${p.col + 1}-${p.row + 1}`, p.x + 2, p.y + 12 / scale); });
  ctx.restore();
}
/** 用紙キー（a4/a4l/a3/a3l）から @page を書く。CSS のセレクタ内 @page は無効なので style 要素を差し替える。 */
function setPageStyle(paper) { const size = (/a3/.test(paper) ? 'A3' : 'A4') + ' ' + (/l$/.test(paper) ? 'landscape' : 'portrait'); let st = $('pageSize'); if (!st) { st = document.createElement('style'); st.id = 'pageSize'; document.head?.appendChild(st); } st.textContent = `@media print { @page { size: ${size}; margin: 10mm; } }`; return size; }
/** 印刷用の SVG ページ列を作って #printArea に入れ、印刷ダイアログを開く。 */
function printPages(target = doc) {
  const pageMm = PAGES[$('paper').value] || PAGES.a4, overlapMm = 10;
  const shapes = target.shapes.filter(s => target.layers.find(l => l.id === s.layer)?.visible), holes = $('outHoles').checked ? target.holes.filter(h => target.paths.some(p => p.id === h.pathId && p.shapeIds.every(id => shapes.some(s => s.id === id)))) : [], b = bboxOfDoc({ ...target, shapes, holes });
  if (!b) { $('hint').textContent = t('nothingToPrint'); return null; }
  const calib = $('outCalib').checked ? calibration : null, layout = printLayout(b, pageMm, overlapMm, calib);
  const html = layout.pages.map((p, i) => `<div class="page">${pageSvg(target, p, { pageMm, overlapMm, calibration: calib, label: `${i + 1}/${layout.pages.length}  ${p.col + 1}-${p.row + 1}`, includeHoles: $('outHoles').checked })}</div>`).join('');
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
}

// ---- 3D（折りたたみ・三面図）----
const canvas3d = $('canvas3d');
let view3d = false, cam = null, foldT = 0, playing = null, gl = null, glProg = null, ctx3 = null, lastStats = { faces: 0, collisions: 0 };
function folds() { return doc.shapes.filter(s => s.type === 'fold' && visible(s)); }
function initGl() {
  if (gl !== null || typeof canvas3d.getContext !== 'function') return;
  gl = canvas3d.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }) || false;
  if (!gl) { ctx3 = canvas3d.getContext('2d'); return; }
  const vs = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 view;uniform mat4 proj;varying vec3 vc;varying vec3 vn;void main(){gl_Position=proj*view*vec4(p,1.0);vn=mat3(view)*n;vc=c;}';
  const fs = 'precision mediump float;varying vec3 vc;varying vec3 vn;void main(){vec3 L=normalize(vec3(0.3,0.5,0.8));float d=0.35+0.65*max(0.0,dot(normalize(vn),L));gl_FragColor=vec4(vc*d,1.0);}';
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  glProg = gl.createProgram(); gl.attachShader(glProg, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(glProg, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(glProg); gl.useProgram(glProg);
  gl.enable(gl.DEPTH_TEST); glProg.buf = gl.createBuffer();
}
const partColor = (f, hit) => hit ? [0.9, 0.2, 0.2] : f.color ? hexToRgb(f.color) : f.kind === 'top' ? [0.80, 0.68, 0.46] : f.kind === 'bottom' ? [0.62, 0.52, 0.36] : [0.70, 0.58, 0.40];
function hexToRgb(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return [0.8, 0.68, 0.46]; const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function perspective(fov, aspect, near, far) { const f = 1 / Math.tan(fov / 2); return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]; }
function orthographic(hw, hh, near, far) { return [1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]; }
/** 3D を描く。gl があれば WebGL、無ければ 2D の画家アルゴリズム。戻り値は統計（テスト用）。 */
function render3d() {
  const panels = buildPanels(doc), fl = folds(), faces = applyFolds(panels, fl, foldT / 100), hits = collisions(panels, fl, foldT / 100), hitSet = new Set(hits.flatMap(h => [h.a, h.b]));
  lastStats = { faces: faces.length, collisions: hits.length, panels: panels.length };
  if (!cam) cam = defaultCamera(doc);
  $('collisionInfo').textContent = hits.length ? t('collisionCount', { n: hits.length }) : t('noCollision');
  if (!view3d) return lastStats;
  const quad = $('viewMode').value === 'quad', W = canvas3d.width || 1, H = canvas3d.height || 1;
  const views = quad ? [['free', cam, 0, 0], ['front', { ...cam, ...orthoViews().front, ortho: true }, 1, 0], ['top', { ...cam, ...orthoViews().top, ortho: true }, 0, 1], ['right', { ...cam, ...orthoViews().right, ortho: true }, 1, 1]] : [['free', cam, 0, 0]];
  if (gl) {
    gl.viewport(0, 0, W, H); gl.clearColor(0.06, 0.06, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const data = [];
    for (const f of faces) { const col = partColor(f, hitSet.has(f.panelId)); const n = f.normal; for (const tri of triangulate(f.points)) for (const p of tri) data.push(p.x, -p.y, p.z, n.x, -n.y, n.z, col[0], col[1], col[2]); }
    gl.bindBuffer(gl.ARRAY_BUFFER, glProg.buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    const stride = 9 * 4, loc = name => gl.getAttribLocation(glProg, name);
    for (const [name, off] of [['p', 0], ['n', 12], ['c', 24]]) { gl.enableVertexAttribArray(loc(name)); gl.vertexAttribPointer(loc(name), 3, gl.FLOAT, false, stride, off); }
    for (const [, c, col, row] of views) {
      const vw = quad ? W / 2 : W, vh = quad ? H / 2 : H; gl.viewport(col * vw, (quad ? 1 - row : 0) * vh, vw, vh); gl.enable(gl.SCISSOR_TEST); gl.scissor(col * vw, (quad ? 1 - row : 0) * vh, vw, vh);
      const aspect = vw / vh, size = c.distance / (c.zoom || 2) * 0.5;
      const flipped = { ...c, target: { x: c.target.x, y: -c.target.y, z: c.target.z } };
      gl.uniformMatrix4fv(gl.getUniformLocation(glProg, 'view'), false, new Float32Array(viewMatrix(flipped)));
      gl.uniformMatrix4fv(gl.getUniformLocation(glProg, 'proj'), false, new Float32Array(c.ortho ? orthographic(size * aspect, size, -5000, 5000) : perspective(0.6, aspect, 1, 20000)));
      gl.drawArrays(gl.TRIANGLES, 0, data.length / 9);
    }
    gl.disable(gl.SCISSOR_TEST);
  } else if (ctx3) {
    ctx3.setTransform(1, 0, 0, 1, 0, 0); ctx3.fillStyle = '#101010'; ctx3.fillRect(0, 0, W, H);
    for (const [, c, col, row] of views) {
      const vw = quad ? W / 2 : W, vh = quad ? H / 2 : H;
      const proj = project(faces, { ...c, target: { x: c.target.x, y: -c.target.y, z: c.target.z } }, { width: vw, height: vh }).map(f => ({ ...f, points: f.points.map(p => ({ x: p.x + col * vw, y: p.y + row * vh })) }));
      for (const f of proj) { if (f.points.length < 3) continue; const col3 = partColor(f, hitSet.has(f.panelId)).map(v => Math.round(v * 255 * f.shade)); ctx3.beginPath(); f.points.forEach((p, i) => i ? ctx3.lineTo(p.x, p.y) : ctx3.moveTo(p.x, p.y)); ctx3.closePath(); ctx3.fillStyle = `rgb(${col3.join(',')})`; ctx3.fill(); ctx3.strokeStyle = '#222'; ctx3.lineWidth = 0.5; ctx3.stroke(); }
    }
  }
  return lastStats;
}
function setView3d(on) {
  view3d = on; canvas3d.hidden = !on; $('view3d').classList.toggle('active', on); $('view3d').setAttribute('aria-pressed', String(on));
  if (on) { initGl(); const r = canvas3d.getBoundingClientRect(); canvas3d.width = Math.max(1, Math.round(r.width * (window.devicePixelRatio || 1))); canvas3d.height = Math.max(1, Math.round(r.height * (window.devicePixelRatio || 1))); if (!cam) cam = defaultCamera(doc); render3d(); $('hint').textContent = t('hint3d'); }
  else { if (playing) { clearInterval(playing); playing = null; } draw(); $('hint').textContent = t('hint.' + mode); }
}
function togglePlay() {
  if (playing) { clearInterval(playing); playing = null; $('play').textContent = t('play'); return; }
  let dir = foldT >= 100 ? -1 : 1; $('play').textContent = t('pause');
  playing = setInterval(() => { foldT = Math.max(0, Math.min(100, foldT + dir * 4)); if (foldT === 0 || foldT === 100) dir = -dir; $('foldT').value = String(foldT); render3d(); }, 40);
}
function exportViews() { const panels = buildPanels(doc), faces = applyFolds(panels, folds(), foldT / 100); download('leather-views.svg', viewsToSvg(faces, { scale: 1 }), 'image/svg+xml'); $('hint').textContent = t('exported', { name: t('views') }); }
/** 展開図：折り線で繋がる板を平面に戻し、縫い代付きの型紙を新しいタブに作る。 */
function makeUnfold() {
  const panels = buildPanels(doc), fl = folds(); if (!panels.length) { $('hint').textContent = t('noPanels'); return; }
  const u = unfold(panels, fl, { allowanceMm: Number($('unfoldAllowance').value) || 0 });
  newTab(t('unfoldTab'));
  cancel(); commit(() => { let n = 1; for (const piece of u.pieces) { doc.shapes.push({ id: 's' + n++, layer: 'pattern', type: 'polyline', closed: true, points: piece.points }); } for (const f of u.folds) doc.shapes.push({ id: 's' + n++, layer: 'pattern', type: 'fold', x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, angleDeg: f.angleDeg, partId: null, inner: true }); doc.provenance = [{ source: 'unfold', at: new Date().toISOString() }]; });
  tabs[activeTab].doc = doc; renderLayers(); fit(); $('hint').textContent = t('unfoldDone', { n: u.pieces.length, e: u.allowanceEdges });
}
function printViews() { setPageStyle('a4'); const faces = applyFolds(buildPanels(doc), folds(), foldT / 100); $('printArea').innerHTML = `<div class="page">${viewsToSvg(faces, { scale: 1 })}</div>`; $('printArea').dataset.pages = '1'; if (typeof window.print === 'function') window.print(); }
function init3d() {
  $('view3d').onclick = () => setView3d(!view3d);
  $('foldT').addEventListener('input', () => { foldT = Number($('foldT').value) || 0; render3d(); });
  $('foldT').addEventListener('change', () => { foldT = Number($('foldT').value) || 0; render3d(); });
  $('play').onclick = togglePlay; $('viewMode').addEventListener('change', () => render3d()); $('exportViews').onclick = exportViews; $('printViews').onclick = printViews; $('unfoldBtn').onclick = makeUnfold;
  $('resetCam').onclick = () => { cam = defaultCamera(doc); render3d(); };
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
  const sel = $('threadSel'), keep = sel.value; sel.textContent = '';
  const pinned = threadList().filter(c => colorPins.includes(c.id)), rest = threadList().filter(c => !colorPins.includes(c.id));
  for (const c of [...pinned, ...rest]) { const o = document.createElement('option'); o.value = c.id; o.textContent = (colorPins.includes(c.id) ? '★ ' : '') + c.label + ' ' + (c.jp || '') + (c.verified === false ? ' (?)' : ''); sel.appendChild(o); }
  if (threadList().some(c => c.id === keep)) sel.value = keep;
  const pal = $('patternSel'), keepP = pal.value; pal.textContent = '';
  for (const p of (doc.palettes || [])) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; pal.appendChild(o); }
  if ((doc.palettes || []).some(p => p.id === keepP)) pal.value = keepP;
  const th = DATA_STITCH_COLORS.stitchColors.find(c => c.id === sel.value); $('threadPreview').style.background = th ? th.hex : 'transparent';
}
function applyLeather(hex) {
  const okIds = new Set(doc.shapes.filter(sh => selected.has(sh.id) && editable(sh)).map(sh => sh.id)), parts = doc.parts.filter(p => p.shapeIds.some(id => okIds.has(id))); if (!parts.length) { $('hint').textContent = t('selectPartFirst'); return; }
  commit(() => { for (const p of parts) p.color = hex; }); $('hint').textContent = t('leatherApplied', { n: parts.length, hex });
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
  if (!view3d || typeof canvas3d.toBlob !== 'function') { $('hint').textContent = t('need3d'); return; }
  render3d(); canvas3d.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'leather-3d.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); $('hint').textContent = t('exported', { name: 'PNG (3D)' }); }, 'image/png');
}
function initColors() {
  loadPins(); renderColors();
  $('threadSearch').addEventListener('input', renderColors); $('threadSel').addEventListener('change', renderColors);
  $('applyThread').onclick = applyThread; $('pinThread').onclick = () => { const id = $('threadSel').value; if (!id) return; colorPins = colorPins.includes(id) ? colorPins.filter(x => x !== id) : [...colorPins, id]; persistPins(); renderColors(); };
  $('leatherHex').addEventListener('change', () => { const v = $('leatherHex').value; if (/^#[0-9a-fA-F]{6}$/.test(v)) applyLeather(v); });
  $('savePattern').onclick = savePattern; $('loadPattern').onclick = loadPattern; $('exportPng3d').onclick = exportPng3d;
  $('exportSvgFill').onclick = () => { download('leather-pattern-color.svg', docToSvg(doc, { includeHoles: true, fill: true }), 'image/svg+xml'); $('hint').textContent = t('exported', { name: 'SVG (color)' }); };
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
function persistLibrary() { try { localStorage.setItem('leather-cad.library', JSON.stringify(userLibrary)); } catch { $('hint').textContent = t('storageUnavailable'); } }
function libraryItems() { return [...DATA_LIBRARY.items, ...userLibrary]; }
function libCurrent() { return libraryItems().find(i => i.id === $('libItem').value) || libraryItems()[0] || null; }
function renderLibrary() {
  const sel = $('libItem'), keep = sel.value, q = ($('libSearch').value || '').toLowerCase(); sel.textContent = '';
  for (const it of libraryItems().filter(it => !q || (it.name + ' ' + (it.name_en || '') + ' ' + (it.tags || []).join(' ')).toLowerCase().includes(q))) { const o = document.createElement('option'); o.value = it.id; o.textContent = (document.documentElement.lang === 'en' && it.name_en ? it.name_en : it.name) + (userLibrary.includes(it) ? ' *' : ''); sel.appendChild(o); }
  if (libraryItems().some(i => i.id === keep)) sel.value = keep;
  const it = libCurrent(), box = $('libVars'); box.textContent = ''; $('libDesc').textContent = it ? (it.desc || '') : '';
  if (it) for (const [k, v] of Object.entries(it.vars || {})) { const label = document.createElement('label'); const span = document.createElement('span'); span.textContent = k; const input = document.createElement('input'); input.type = 'number'; input.step = String(varStep(it, k)); input.value = String(v); input.dataset.var = k; label.appendChild(span); label.appendChild(input); box.appendChild(label); }
}
function libVars() { const out = {}; for (const el of ($('libVars').children || [])) { const input = el.querySelector ? el.querySelector('input') : null; if (input && input.dataset?.var) out[input.dataset.var] = Number(input.value); } return out; }
function placeLibrary(at) {
  const it = libCurrent(); if (!it) return;
  let payload; try { payload = instantiateItem(it, libVars(), at, { scale: Number($('pasteScale').value) || 1 }); } catch (err) { $('hint').textContent = t('invalidNumber') + ' ' + err.message; return; }
  cancel(); let ids = [];
  commit(() => { ids = mergePayload(doc, { ...payload, layers: [] }, { freshId, source: 'library:' + it.id }); selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('libPlaced', { name: it.name, n: ids.length });
}
function saveToLibrary() {
  const ids = selectedShapeIds(); if (!ids.size) { $('hint').textContent = t('selectFirst'); return; }
  const name = ($('libName').value || '').trim(); if (!name) { $('hint').textContent = t('needName'); return; }
  const payload = extractSelection(doc, ids), item = { id: 'user-' + Date.now().toString(36), name, tags: ($('libTags').value || '').split(/[\s,]+/).filter(Boolean), desc: '', vars: {}, shapes: payload.shapes, holes: payload.holes, paths: payload.paths, parts: payload.parts, tools: payload.tools };
  userLibrary.push(item); persistLibrary(); renderLibrary(); $('libItem').value = item.id; renderLibrary(); $('hint').textContent = t('libSaved', { name });
}
function removeFromLibrary() { const it = libCurrent(); if (!it || !userLibrary.includes(it)) { $('hint').textContent = t('libBuiltin'); return; } userLibrary = userLibrary.filter(x => x !== it); persistLibrary(); renderLibrary(); }
function exportLibrary() { download('leather-library.nscad-lib.json', JSON.stringify({ version: 1, items: userLibrary }, null, 2), 'application/json'); }
async function importLibrary(file) { try { const data = JSON.parse(await file.text()); const items = (data.items || []).filter(it => checkLibraryItem(it).length === 0); userLibrary.push(...items); persistLibrary(); renderLibrary(); $('hint').textContent = t('libImported', { n: items.length }); } catch (err) { $('hint').textContent = t('loadFailed', { message: err.message }); } }
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
  setMode('select'); selected = new Set(doc.shapes.filter(s => visible(s) && editable(s)).map(s => s.id)); draw();
  $('hint').textContent = selected.size ? t('selectedAll', { n: selected.size }) : t('selectFirst');
}
function clipboardText() { const ids = selectedShapeIds(); if (!ids.size) return null; return encodeClipboard(extractSelection(doc, ids), tabs[activeTab]?.name || 'untitled'); }
function pasteText(text, at = null) {
  const data = decodeClipboard(text); if (!data) return false;
  const target = at || cursor; let ids = [];
  cancel(); commit(() => { ids = mergePayload(doc, data.payload, { at: target, scale: Number($('pasteScale').value) || 1, freshId, source: 'clip:' + data.source }); selected = new Set(ids); });
  renderLayers(); $('hint').textContent = t('pasted', { n: ids.length, from: data.source }); return true;
}
// タブ：文書ごとに undo/redo/選択を持つ
function snapshotTab() { if (tabs[activeTab]) Object.assign(tabs[activeTab], { doc, undo, redo, selected, activeLayer, scale, origin }); }
function renderTabs() {
  const bar = $('tabBar'); bar.textContent = '';
  tabs.forEach((tab, i) => { const b = document.createElement('button'); b.textContent = tab.name + (tab.dirty ? ' •' : ''); b.classList.toggle('active', i === activeTab); b.onclick = () => switchTab(i); bar.appendChild(b); });
  $('tabName').value = tabs[activeTab]?.name || '';
  const sel = $('tabTarget'); sel.textContent = ''; tabs.forEach((tab, i) => { if (i === activeTab) return; const o = document.createElement('option'); o.value = String(i); o.textContent = tab.name; sel.appendChild(o); });
}
function switchTab(i) {
  if (i === activeTab || !tabs[i]) return; snapshotTab(); activeTab = i; const tab = tabs[i];
  doc = tab.doc; undo = tab.undo; redo = tab.redo; selected = tab.selected || new Set(); activeLayer = tab.activeLayer || 'pattern'; if (tab.scale) { scale = tab.scale; origin = tab.origin; }
  cancel(); manualNext = null; nodeSel = null; pairLines = []; aiPending = null; aiHighlight = { ids: new Set(), until: 0 }; tracePreviewShapes = []; voicePending = null; voiceCandidates = []; renderVoiceCandidates(); renderAi(); refreshTools(); renderLayers(); renderSeams(); rebuildSnaps(); renderTabs(); draw();
}
function newTab(name = null) { snapshotTab(); const d = newDoc(); d.tools = loadTools(); tabs.push({ name: name || t('tabDefault', { n: tabs.length + 1 }), doc: d, undo: [], redo: [], selected: new Set(), activeLayer: 'pattern', dirty: false }); switchTab(tabs.length - 1); }
let closeArmed = 0;
function closeTab() { if (tabs.length < 2) { $('hint').textContent = t('lastTab'); return; }
  if (tabs[activeTab]?.dirty && Date.now() - closeArmed > 5000) { closeArmed = Date.now(); $('hint').textContent = t('closeTabConfirm'); return; } // 埋め込みブラウザでは confirm が出ないので 2 段押し
  closeArmed = 0; tabs.splice(activeTab, 1); const next = Math.min(activeTab, tabs.length - 1); activeTab = -1; switchTab(next); }
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
  loadLibrary(); renderLibrary();
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
const HW_CATEGORIES = ['binder', 'fastener', 'link', 'closure', 'notebook'];
function hwItems() { return DATA_HARDWARE.items.filter(i => i.category === $('hwCategory').value); }
function hwCurrent() { return DATA_HARDWARE.items.find(i => i.id === $('hwItem').value) || hwItems()[0] || null; }
function binderSpec(id) { return BINDER_SPECS.find(s => s.id === id) || null; }
function renderHardware() {
  const cat = $('hwCategory'); if (!cat.textContent) { for (const c of HW_CATEGORIES) { const o = document.createElement('option'); o.value = c; o.textContent = t('hwcat.' + c); cat.appendChild(o); } }
  const items = hwItems(), sel = $('hwItem'), keep = sel.value; sel.textContent = '';
  for (const it of items) { const o = document.createElement('option'); o.value = it.id; o.textContent = document.documentElement.lang === 'en' ? it.name_en : it.name_ja; sel.appendChild(o); }
  sel.value = items.some(i => i.id === keep) ? keep : (items[0]?.id || '');
  const it = hwCurrent(), box = $('hwParams'); box.textContent = '';
  if (it) for (const [k, v] of Object.entries(it.params)) { if (typeof v !== 'number') continue; const label = document.createElement('label'); const span = document.createElement('span'); span.textContent = k; const input = document.createElement('input'); input.type = 'number'; input.step = '0.1'; input.value = String(v); input.dataset.param = k; label.appendChild(span); label.appendChild(input); box.appendChild(label); }
  $('hwConfidence').textContent = it ? (it.confidence === 'spec' ? t('hwSpec') : t('hwEstimated')) : '';
  const bs = $('binderSpecSel'); if (!bs.textContent) for (const s of BINDER_SPECS) { const o = document.createElement('option'); o.value = s.id; o.textContent = document.documentElement.lang === 'en' ? s.names.en : s.names.ja; bs.appendChild(o); }
  renderBinder();
}
function renderBinder() {
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0]; if (!spec) return;
  const rd = $('ringD'), keep = Number(rd.value); rd.textContent = '';
  for (const d of spec.rings.diameterOptionsMm) { const o = document.createElement('option'); o.value = String(d); o.textContent = d + ' mm'; rd.appendChild(o); }
  const ringD = spec.rings.diameterOptionsMm.includes(keep) ? keep : spec.rings.diameterOptionsMm[0]; rd.value = String(ringD);
  const leather = Number($('partThickness').value) || 1.5;
  $('binderInfo').textContent = t('binderInfo', { n: spec.holes.count, pitch: spec.holes.pitchMm.join(' / '), span: spec.holes.span1toLastMm, w: spec.refill.wMm, h: spec.refill.hMm, spine: spineWidth(ringD, spec.plate.thicknessMm, leather).toFixed(1) });
}
function spineParams() { const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0]; return { ringD: Number($('ringD').value) || 20, wireD: Number($('spWire').value) || 2, plateT: spec?.plate?.thicknessMm ?? 2, leatherT: Number($('spLeather').value) || 1.5, supporterT: Number($('spSupporter').value) || 0, playMm: Number($('spPlay').value) || 0, foldR: Number($('spFoldR').value) || 0 }; }
/** 閉じた手帳の3面図の入力値（背幅の入力に、束の厚み・表紙の長さ・規格のリフィル寸法・台座・リング位置を足す）。 */
function topParams() {
  const spec = binderSpec($('binderSpecSel').value) || BINDER_SPECS[0], p = spineParams(), cw = Number($('spCoverW').value), hp = spec?.holes?.pitchMm || [], span = spec?.holes?.span1toLastMm || 0, H = (spec?.refill?.hMm ?? 210) + 6;
  let y = H / 2 - span / 2; const ringPos = hp.length ? [y, ...hp.map(d => (y += d))] : undefined;
  return { ...p, stackT: $('spStack').value === '' ? 6 : Number($('spStack').value), refillW: spec?.refill?.wMm ?? 110, refillH: spec?.refill?.hMm ?? 210, plateW: spec?.plate?.widthMm ?? 24, plateL: spec?.plate?.lengthMm ?? 170, ringPos, coverW: cw > 0 ? cw : undefined };
}
function renderTopSection() {
  const p = topParams(), res = closedBinderViews(p); if (!res) { $('spTopInfo').textContent = t('invalidNumber'); $('spTopSvg').innerHTML = ''; return null; }
  $('spTopInfo').textContent = t('spTopInfo', { t: res.thickness, c: res.coverW }) + (res.ringFits ? '' : ' ' + t('spTopTight', { s: p.stackT, r: $('ringD').value })); $('spTopSvg').innerHTML = closedBinderViewsSvg(res); return res;
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
function renderSpineSim() { const p = spineParams(), r = spineSim(p); if (!r) { $('spResult').textContent = t('invalidNumber'); return null; } $('spResult').textContent = t('spineResult', { ring: r.outerRingD, inner: r.innerW, fold: r.foldEach, spine: r.spineW, top: r.ringTop }); $('spSection').innerHTML = spineSectionSvg(r, { label: `${p.ringD}mm` }); return r; }
function initSpineSim() { for (const id of ['spWire', 'spLeather', 'spSupporter', 'spPlay', 'spFoldR', 'ringD', 'binderSpecSel']) $(id).addEventListener('change', renderSpineSim); $('spCalib').onclick = () => { const m = Number($('spMeasured').value); const play = spinePlayFromMeasured(m, spineParams()); if (play === null) { $('hint').textContent = t('invalidNumber'); return; } $('spPlay').value = String(play); renderSpineSim(); $('hint').textContent = t('spineCalibrated', { play }); }; $('spApply').onclick = () => { const r = renderSpineSim(); if (!r) return; $('recipeSpine').value = String(r.spineW); $('recipeKind').value = 'notebook'; $('recipeRingD').value = $('ringD').value; $('recipeThickness').value = $('spLeather').value; $('recipeCard').open = true; $('hint').textContent = t('spineApplied', { spine: r.spineW }); }; renderSpineSim(); for (const id of ['spStack', 'spCoverW', 'spWire', 'spLeather', 'spSupporter', 'spPlay', 'spFoldR', 'ringD', 'binderSpecSel']) $(id).addEventListener('change', renderTopSection); $('spTopDraw').onclick = drawTopSection; renderTopSection(); }
function hwParams() { const out = {}; for (const input of ($('hwParams').children || [])) { const el = input.querySelector ? input.querySelector('input') : null; if (el && el.dataset?.param) out[el.dataset.param] = Number(el.value); } return out; }
/** 金具を点に配置：外形は目印レイヤー（hw メタ付き）、取り付け穴は「金具穴」レイヤー。バインダーはリング中心に十字の目印も置く。 */
function placeHardware(at) {
  const it = hwCurrent(); if (!it) return;
  const isBinder = it.footprint2d.kind === 'binder', spec = isBinder ? binderSpec(it.params.spec) : null, overrides = isBinder ? { ringD: Number($('ringD').value) || undefined } : hwParams();
  let fp; try { fp = placeFootprint(hardwareFootprint(it, overrides, spec), at, Number($('hwAngle').value) || 0); } catch (err) { $('hint').textContent = t('invalidNumber') + ' ' + err.message; return; }
  cancel();
  commit(() => {
    if (!doc.layers.some(l => l.id === 'hwholes')) doc.layers.push({ id: 'hwholes', name: 'hwholes', visible: true, locked: false });
    const marks = doc.layers.find(l => l.id === 'marks') ? 'marks' : activeLayer, ids = [];
    fp.outline.forEach((s, i) => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...s, id, layer: marks, ...(i === 0 ? { hw: { id: it.id, params: { ...it.params, ...overrides }, at, angleDeg: Number($('hwAngle').value) || 0, solid: fp.solid.kind === 'binder' ? { kind: 'box', w: fp.solid.w, h: fp.solid.h, z: fp.solid.z } : fp.solid } } : {}) }); ids.push(id); });
    for (const s of fp.holes) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...s, id, layer: 'hwholes' }); ids.push(id); }
    if (fp.ringCenters) for (const c of fp.ringCenters) for (const [dx, dy] of [[1, 0], [0, 1]]) { const id = freshId(doc.shapes, 's'); doc.shapes.push({ id, layer: marks, type: 'line', x1: c.x - 2 * dx, y1: c.y - 2 * dy, x2: c.x + 2 * dx, y2: c.y + 2 * dy }); ids.push(id); }
    selected = new Set(ids);
  });
  renderLayers(); $('hint').textContent = t('hwPlaced', { name: document.documentElement.lang === 'en' ? it.name_en : it.name_ja });
}
function showSvgDialog(svg, title) { $('svgBody').innerHTML = svg; $('svgTitle').textContent = title; $('svgDialog').showModal(); }
function initHardware() {
  renderHardware();
  $('hwCategory').addEventListener('change', renderHardware); $('hwItem').addEventListener('change', renderHardware);
  $('binderSpecSel').addEventListener('change', renderBinder); $('ringD').addEventListener('change', renderBinder); $('partThickness').addEventListener('change', renderBinder);
  $('hwPlace').onclick = () => setMode('hardware');
  $('binderPlace').onclick = () => { $('hwCategory').value = 'binder'; renderHardware(); $('hwItem').value = 'binder-' + $('binderSpecSel').value; setMode('hardware'); };
  $('binderPlan').onclick = () => { const spec = binderSpec($('binderSpecSel').value); if (spec) showSvgDialog(binderPlanSvg(spec, Number($('ringD').value)) + binderSideSvg(spec, Number($('ringD').value)) + binderFrontSvg(spec, Number($('ringD').value)), spec.names.ja); };
  $('binderData').onclick = () => { const spec = binderSpec($('binderSpecSel').value); if (spec) { $('helpBody').textContent = JSON.stringify(spec, null, 2); $('helpDialog').showModal(); } };
  $('closeSvg').onclick = () => $('svgDialog').close();
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
function trimClick(p, keep) {
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distToShape(s, p) <= 7 / scale); if (!hit) return;
  const parts = trimAt(hit, p, doc.shapes.filter(s => visible(s) && stitchable(s)), { keep });
  if (!parts) { $('hint').textContent = t('noIntersection'); return; }
  const removedPaths = new Set(doc.paths.filter(path => path.shapeIds.includes(hit.id)).map(path => path.id));
  if (doc.holes.some(h => removedPaths.has(h.pathId)) && !window.confirm(t('holeTrimConfirm'))) return;
  cancel();
  commit(() => {
    doc.paths = doc.paths.filter(path => !path.shapeIds.includes(hit.id));
    doc.holes = doc.holes.filter(h => !removedPaths.has(h.pathId));
    doc.seams = doc.seams.filter(seam => !removedPaths.has(seam.a.pathId) && !removedPaths.has(seam.b.pathId));
    const idx = doc.shapes.findIndex(s => s.id === hit.id); doc.shapes.splice(idx, 1);
    const added = parts.map(part => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...part, id, layer: hit.layer }); return id; });
    selected = new Set(added);
  });
}
/** 反転コピーの菱目が順目（keep）のとき、反転後の穴の傾きを元の値に戻す。位置は変えない。 */
function keepHoleSlant(mirrored, original) { return $('mirrorHoles').value === 'keep' && 'pathId' in original ? { ...mirrored, angleDeg: original.angleDeg } : mirrored; }
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
  const ends = [], centers = [];
  for (const s of shapes) {
    if (s.type === 'line') ends.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    else if (s.type === 'polyline') ends.push(...s.points.map(p => ({ x: p.x, y: p.y })));
    else if (s.type === 'bezier') ends.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    else if (s.type === 'path') ends.push(...s.nodes.map(n => ({ x: n.x, y: n.y })));
    else if (s.type === 'arc') { ends.push(circlePoint(s, s.startDeg), circlePoint(s, s.endDeg)); centers.push({ x: s.cx, y: s.cy }); }
    else if (s.type === 'circle') centers.push({ x: s.cx, y: s.cy });
  }
  return { ends, centers };
}
/** 磁石が効く距離(mm)。作図オプションの「吸着距離(px)」を画面倍率で換算。0 以下・不正値は 0＝磁石なし。 */
function magnetRadiusMm() { const px = Number($('snapDist').value); return Number.isFinite(px) && px > 0 ? px / scale : 0; }
const MAGNET_DRAW_MODES = ['ruler', 'line', 'circle', 'arc', 'bezier', 'polyline', 'path', 'dimension', 'fold', 'mirror'];
/** 作図ツール中だけ自動で仮表示する中心点。 */
function centerMarkPoints() { return MAGNET_DRAW_MODES.includes(mode) ? magnetCenters : []; }
function drawCenterMarks() {
  const pts = centerMarkPoints(); if (!pts.length) return;
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(138,180,248,0.75)'; ctx.lineWidth = 1 / scale; ctx.beginPath();
  for (const c of pts) { ctx.moveTo(c.x - 4 / scale, c.y); ctx.lineTo(c.x + 4 / scale, c.y); ctx.moveTo(c.x, c.y - 4 / scale); ctx.lineTo(c.x, c.y + 4 / scale); }
  ctx.stroke(); ctx.restore();
}
function rebuildSnaps() {
  const shapes = doc.shapes.filter(s => visible(s) && stitchable(s));
  snapCache = shapes.flatMap(snapPoints);
  const magnet = magnetPointsOf(shapes); magnetEnds = magnet.ends; magnetCenters = magnet.centers;
  // 折れ線の各辺、円弧の円も候補にし、円弧の範囲外を除く。
  const edges = shapes.flatMap(s => s.type === 'polyline' ? s.points.slice(0, s.closed ? undefined : -1).map((p, i) => ({ type: 'line', x1: p.x, y1: p.y, x2: s.points[(i + 1) % s.points.length].x, y2: s.points[(i + 1) % s.points.length].y })) : [s]);
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    snapCache.push(...intersections(a.type === 'arc' ? { ...a, type: 'circle' } : a, b.type === 'arc' ? { ...b, type: 'circle' } : b).filter(p => distToShape(a, p) < 1e-7 && distToShape(b, p) < 1e-7));
  }
}
function updateUI() {
  $('undo').disabled = !undo.length; $('redo').disabled = !redo.length;
  $('delete').disabled = !selected.size;
  for (const id of ['copy', 'mirrorX', 'mirrorY', 'rotate']) $(id).disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s));
  $('toPath').disabled = !doc.shapes.some(s => selected.has(s.id) && editable(s) && ['line','bezier','polyline'].includes(s.type));
  $('count').textContent = t('count', { shapes: doc.shapes.length, selected: selected.size });
  $('status').textContent = t('status', { x: cursor.x.toFixed(2), y: cursor.y.toFixed(2), zoom: (scale / 4 * 100).toFixed(0) });
  const th = threadEstimate(doc); $('threadInfo').textContent = th.paths ? t('threadInfo', { m: (th.mm / 1000).toFixed(2), n: th.paths }) : t('threadNone');
  refreshInfo();
}
function commit(fn) {
  const before = JSON.stringify(doc);
  fn();
  if (before !== JSON.stringify(doc)) { undo.push(before); if (undo.length > 100) undo.shift(); redo = []; rebuildSnaps(); if (view3d) render3d(); if (tabs[activeTab] && !tabs[activeTab].dirty) { tabs[activeTab].dirty = true; renderTabs(); } }
  draw();
}
function cancel() { ruler = null; gesture = null; stage = null; snap = null; offsetSelection = null; $('offsetFloat').hidden = true; }
/** 左のツールに合わせて右のカードを出し入れする：目打ち・目印＝目打ちカード、柄＝パッチワークのカード。ほかのツールでは両方閉じる。 */
function syncToolCards() {
  $('stitchCard').open = mode === 'stitch' || mode === 'mark'; $('patchCard').open = mode === 'patchfill';
  const shown = mode === 'patchfill' ? $('patchCard') : mode === 'stitch' || mode === 'mark' ? $('stitchCard') : null; /* 開いたカードが画面外なら見える位置まで寄せる */
  if (shown?.scrollIntoView) shown.scrollIntoView({ block: 'nearest' });
}
function setMode(next) {
  cancel(); manualNext = null; nodeSel = null; mode = next; syncToolCards();
  document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === mode); b.setAttribute('aria-pressed', String(b.dataset.tool === mode)); });
  $('hint').textContent = t('hint.' + mode); canvas.style.cursor = mode === 'select' ? 'default' : 'crosshair'; resize();
}
function history(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(doc)); doc = JSON.parse(from.pop()); selected.clear(); cancel(); manualNext = null; nodeSel = null; pairLines = []; refreshTools(); persistTools(); renderLayers(); renderSeams(); rebuildSnaps(); draw();
}
function removeSelected() {
  const ids = selectedShapeIds();
  cancel(); commit(() => { const paths=new Set(doc.paths.filter(p=>p.shapeIds.some(id=>ids.has(id))).map(p=>p.id)); doc.shapes=doc.shapes.filter(s=>!ids.has(s.id)); doc.holes=doc.holes.filter(h=>!paths.has(h.pathId)&&!(selected.has(h.id)&&holeEditable(h))); doc.paths=doc.paths.filter(p=>!paths.has(p.id)); doc.seams=doc.seams.filter(m=>!paths.has(m.a.pathId)&&!paths.has(m.b.pathId)); for(const part of doc.parts)part.shapeIds=part.shapeIds.filter(id=>!ids.has(id)); selected.clear(); manualNext=null; }); renderSeams();
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
  cancel();
  commit(() => {
    const before=new Map(doc.paths.filter(p=>p.shapeIds.every(id=>ids.has(id))).map(p=>[p.id,resolvePath(doc,p)]));
    doc.shapes = doc.shapes.map(s => ids.has(s.id) ? fn(s) : s);
    const paths=new Set(doc.paths.filter(p=>p.shapeIds.every(id=>ids.has(id))).map(p=>p.id));
    doc.holes=doc.holes.map(h=>paths.has(h.pathId)?fn(h):h);
    for(const h of doc.holes.filter(h=>paths.has(h.pathId))){const route=resolvePath(doc,doc.paths.find(p=>p.id===h.pathId));if(route)h.s=projectOnPath(route,h).s;}
    for(const saved of doc.paths.filter(p=>paths.has(p.id))){
      const old=before.get(saved.id),route=resolvePath(doc,saved),len=arcLength(route);
      const mapped=s=>projectOnPath(route,fn(pointAtLength(old,s))).s;
      saved.segments=saved.segments.flatMap(segment=>{
        if(!saved.closed){const a=mapped(segment.from),b=mapped(segment.to);return [{...segment,from:Math.min(a,b),to:Math.max(a,b)}];}
        const span=segment.to-segment.from;if(span>=len-1e-6)return [{...segment,from:0,to:len}];
        const original=pointAtLength(old,segment.from),transformed=fn(original),start=mapped(segment.from),tangent=pointAtLength(route,start).angleDeg;
        const reversed=Math.cos((transformed.angleDeg-tangent)*Math.PI/180)<0;
        const from=((start-(reversed?span:0))%len+len)%len,to=from+span;
        return to<=len+1e-6?[{...segment,from,to:Math.min(to,len)}]:[{...segment,from,to:len},{...segment,from:0,to:to-len}];
      });
    }
    manualNext=null;
  });
}
function copySelected() {
  const sourceIds=selectedShapeIds(); const sources=doc.shapes.filter(s=>sourceIds.has(s.id));
  if (!sources.length) return;
  cancel();
  commit(() => {
    const ids = new Set(), map=new Map(), paths=[...doc.paths], holes=[...doc.holes];
    for (const s of sources) { const id=freshId(doc.shapes,'s'); doc.shapes.push({...translate(s,5,5),id});ids.add(id);map.set(s.id,id); }
    for(const p of paths.filter(p=>p.shapeIds.every(id=>map.has(id)))){
      const id=freshId(doc.paths,'p');doc.paths.push({...JSON.parse(JSON.stringify(p)),id,shapeIds:p.shapeIds.map(id=>map.get(id))});
      for(const h of holes.filter(h=>h.pathId===p.id))doc.holes.push({...translate(h,5,5),id:freshId(doc.holes,'h'),pathId:id});
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
function askNumber(key, initial) {
  if (voiceAskNumber !== null) { const v = voiceAskNumber; voiceAskNumber = null; return v; }
  const raw = window.prompt(t(key), String(initial));
  if (raw === null) return null;
  if (!raw.trim() || !Number.isFinite(Number(raw))) { $('hint').textContent = t('invalidNumber'); return null; }
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
    const a = distToShape(inc, ends[0]) <= distToShape(inc, ends[1]) ? ends[0] : ends[1]; corners.set(i, { shape, a, b: a === ends[0] ? ends[1] : ends[0] });
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
/** 折れ線をクリック：頂点の近くならその角だけ、辺の途中なら全部の角を丸める／面取りする。 */
function roundPolylineAt(poly, p) {
  cancel();
  const affected = new Set(doc.paths.filter(q => q.shapeIds.includes(poly.id)).map(q => q.id));
  if (doc.holes.some(h => affected.has(h.pathId))) { $('hint').textContent = t('holeChamfer'); return; }
  const near = poly.points.map((v, i) => [distance(v, p), i]).filter(([d]) => d <= 9 / scale).sort((x, y) => x[0] - y[0])[0];
  const r = askNumber(mode === 'fillet' ? 'radius' : 'chamferSize', 3); if (r === null) return;
  const shapes = roundPolylineCorners(poly, near ? [near[1]] : null, r, mode);
  if (!shapes) { $('hint').textContent = t('impossible'); return; }
  commit(() => {
    doc.paths = doc.paths.filter(q => !affected.has(q.id)); doc.shapes = doc.shapes.filter(s => s.id !== poly.id);
    const ids = shapes.map(s => { const id = freshId(doc.shapes, 's'); doc.shapes.push({ ...s, id, layer: poly.layer }); return id; });
    for (const part of doc.parts) if (part.shapeIds.includes(poly.id)) part.shapeIds = [...part.shapeIds.filter(x => x !== poly.id), ...ids];
    selected = new Set(ids);
  });
  $('hint').textContent = t('hint.' + mode);
}
/** オフセットの選択：1回クリック＝他の図形との交点から交点までの区間、ダブルクリック＝つながった図形全体。 */
function offsetClick(p, whole) {
  const shapes = doc.shapes.filter(s => visible(s) && stitchable(s)), hit = shapes.filter(s => editable(s)).reverse().find(s => distToShape(s, p) <= 7 / scale);
  if (!hit) { offsetSelection = null; $('hint').textContent = t('offsetNone'); draw(); return; }
  const sel = offsetSpan(shapes, hit, p, whole); if (!sel) { offsetSelection = null; $('hint').textContent = t('impossible'); draw(); return; }
  offsetSelection = { ...sel, layer: hit.layer }; $('of-dist').value = $('offsetDist').value; $('of-side').value = $('offsetSide').value; draw();
  if (voiceAskNumber !== null) { const v = voiceAskNumber; voiceAskNumber = null; runOffset(v); return; } /* 音声で数値を先に聞いているときは、選んですぐ実行 */
  $('hint').textContent = t(sel.whole ? 'offsetPickedWhole' : 'offsetPickedSpan');
}
/** 選んだ範囲のそばに、距離・内側/外側・実行の小さな入力欄を出す（選んだ範囲が無ければ隠す）。画面の端では見切れないように寄せる。 */
function placeOffsetFloat() {
  const box = $('offsetFloat'), sel = offsetSelection;
  if (!sel || mode !== 'offset') { box.hidden = true; return; }
  const xs = sel.points.map(q => q.x), ys = sel.points.map(q => q.y), w = box.offsetWidth || 230, h = box.offsetHeight || 40;
  let x = origin.x + Math.max(...xs) * scale + 12, y = origin.y + Math.min(...ys) * scale - 4;
  if (x + w > width - 8) x = origin.x + Math.min(...xs) * scale - w - 12; /* 右に入らなければ図形の左に */
  x = Math.max(8, Math.min(width - w - 8, x)); y = Math.max(36, Math.min(height - h - 8, y));
  box.style.left = Math.round(x) + 'px'; box.style.top = Math.round(y) + 'px'; box.hidden = false;
}
/** 選んだ範囲を、距離と向き（内側／外側）でオフセットする。結果は黄色の点線。 */
function runOffset(override = null) {
  const sel = offsetSelection; if (!sel) { $('hint').textContent = t('offsetNone'); return; }
  let d; if (override !== null) d = override; else { const dist = Number($('offsetDist').value); if (!Number.isFinite(dist) || dist <= 0) { $('hint').textContent = t('invalidNumber'); return; } d = $('offsetSide').value === 'in' ? -dist : dist; }
  const result = offsetSpanResult(sel, d, { join: $('offsetJoin').value }); if (!result) { $('hint').textContent = t('impossible'); return; }
  /* 結果は点線なのでガイドの層へ（ガイドが非表示・ロック中なら、見えなくならないよう作図先、なければ元の図形の層） */
  const dest = doc.layers.find(l => l.id === 'guide' && l.visible && !l.locked)?.id || doc.layers.find(l => l.id === activeLayer && l.visible && !l.locked)?.id || sel.layer; /* 点線はガイド。ガイドが使えないときだけ作図先・元の層 */
  offsetSelection = null; addShape({ ...result, id: freshId(doc.shapes, 's'), layer: dest, color: 'yellow', lineStyle: 'dashed' });
  $('hint').textContent = t('offsetDone', { d: Math.abs(d), side: t(d < 0 ? 'offsetIn' : 'offsetOut') }); draw();
}
function editAt(p) {
  if (mode === 'offset') { offsetClick(p, false); return; }
  const hit = doc.shapes.filter(s => editable(s) && stitchable(s)).reverse().find(s => distToShape(s, p) <= 7 / scale && (!['chamfer', 'fillet'].includes(mode) || s.type === 'line' || s.type === 'polyline'));
  if (!hit) return;
  if (hit.type === 'polyline') { roundPolylineAt(hit, p); return; }
  if (!stage) { stage = { kind: 'chamfer', id: hit.id }; selected = new Set([hit.id]); draw(); $('hint').textContent = t('secondLine'); return; }
  if (stage.id === hit.id) return;
  const first = doc.shapes.find(s => s.id === stage.id && editable(s));
  if (!first) { cancel(); return; }
  const affectedPaths=new Set(doc.paths.filter(p=>p.shapeIds.includes(first.id)||p.shapeIds.includes(hit.id)).map(p=>p.id));
  if (doc.holes.some(h=>affectedPaths.has(h.pathId))) { $('hint').textContent = t('holeChamfer'); return; }
  const r = askNumber(mode === 'fillet' ? 'radius' : 'chamferSize', 3); if (r === null) return;
  const arc = (mode === 'fillet' ? filletCorner : chamferCorner)(first, hit, r);
  if (!arc) { $('hint').textContent = t('impossible'); return; }
  const endpoints = arc.type === 'arc' ? [circlePoint(arc, arc.startDeg), circlePoint(arc, arc.endDeg)] : [{x:arc.x1,y:arc.y1},{x:arc.x2,y:arc.y2}];
  const trim = (line, other) => {
    const end = distance({ x: line.x1, y: line.y1 }, { x: other.x1, y: other.y1 }) < 1e-9 || distance({ x: line.x1, y: line.y1 }, { x: other.x2, y: other.y2 }) < 1e-9 ? 1 : 2;
    const p = endpoints.reduce((a, b) => distToShape(line, a) <= distToShape(line, b) ? a : b);
    return { ...line, ['x' + end]: p.x, ['y' + end]: p.y };
  };
  const a = trim(first, hit), b = trim(hit, first), id = freshId(doc.shapes, 's');
  cancel();
  commit(() => {
    doc.paths=doc.paths.filter(p=>!affectedPaths.has(p.id));
    doc.shapes = doc.shapes.map(s => s.id === first.id ? a : s.id === hit.id ? b : s);
    doc.shapes.push({ ...arc, id, layer: first.layer }); selected = new Set([first.id, hit.id, id]);
  });
  $('hint').textContent = t('hint.chamfer');
}
function moveDelta() { return { x: cursor.x - gesture.start.x, y: cursor.y - gesture.start.y }; }
function movePosition(p, shift) {
  const start = gesture.start;
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
function previewMoved(s, owner = s.id) {
  if (gesture?.kind !== 'move' || !gesture.ids.has(owner)) return s;
  const d = moveDelta(); return translate(s, d.x, d.y);
}
function snapped(p, shift, anchor) {
  snap = null;
  let result = { ...p };
  const reach = magnetRadiusMm();
  if (reach > 0) { let near = reach; for (const c of [...magnetEnds, ...magnetCenters]) { const d = distance(p, c); if (d < near) { near = d; result = { ...c }; snap = c; } } }
  if ($('snap').checked && !snap) {
    let best = 9 / scale;
    for (const c of [...snapCache, ...(stage?.points || [])]) { const d = distance(p, c); if (d < best) { best = d; result = { ...c }; snap = c; } }
    if (!snap) { const grid = Number($('spacing').value) || 1; result = { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid }; snap = result; }
  }
  if (shift && anchor && mode === 'rect') { const dx = p.x - anchor.x, dy = p.y - anchor.y, m = Math.max(Math.abs(dx), Math.abs(dy)); result = { x: anchor.x + (dx < 0 ? -m : m), y: anchor.y + (dy < 0 ? -m : m) }; snap = result; }
  else if (shift && anchor) { if (Math.abs(p.x - anchor.x) >= Math.abs(p.y - anchor.y)) result.y = anchor.y; else result.x = anchor.x; snap = result; }
  return result;
}
function anchor() {
  if (gesture?.kind === 'draw' || gesture?.kind === 'move' || gesture?.kind === 'pen') return gesture.start;
  if (stage?.points) return stage.points.at(-1);
  if (stage?.kind === 'path') return stage.nodes.at(-1) || null;
  if (stage?.kind === 'ruler' || stage?.kind === 'dim' || stage?.kind === 'mirror' || stage?.kind === 'foldDraw') return stage.a;
  if (stage?.kind === 'arc') return stage.center;
  if (stage?.kind === 'cmd' && mode === 'rect') return stage.start;
  if (stage?.kind === 'bezier') return stage.c1 ? stage.end : stage.start;
  return null;
}
/** 対角の2点から矩形（閉じた折れ線・4点）。幅か高さが 0 なら null。 */
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
function arc3Click(p) {
  const pts = stage.pts; if (pts.some(q => distance(q, p) < 1e-8)) return;
  if (pts.length < 2) { pts.push(p); return; }
  const s = arcThroughPoints(pts[0], pts[1], p); if (!s) { $('hint').textContent = t('arcCollinear'); return; }
  stage = null; addShape(s); lastPoint = p; $('hint').textContent = t('hint.arc');
}
function arcShape(p) {
  const angle = Math.atan2(p.y - stage.center.y, p.x - stage.center.x) * 180 / Math.PI;
  return { type: 'arc', cx: stage.center.x, cy: stage.center.y, r: stage.r, startDeg: stage.startDeg, endDeg: angle };
}
function bezierShape(p) {
  const c1 = stage.c1 || p, c2 = stage.c1 ? p : stage.end;
  return { type: 'bezier', x1: stage.start.x, y1: stage.start.y, x2: stage.end.x, y2: stage.end.y, c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y };
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
    ctx.save(); ctx.translate(d.textPos.x, d.textPos.y); ctx.rotate(d.angleDeg * Math.PI / 180); ctx.font = `${Math.max(2.5, 12 / scale)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(d.value.toFixed(2), 0, 0); ctx.restore(); return;
  }
  path(s); ctx.strokeStyle = color; ctx.stroke();
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
function draw() {
  const dpr = exporting ? 1 : (window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (!exporting) { ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, width, height); }
  ctx.translate(origin.x, origin.y); ctx.scale(scale, scale); ctx.lineWidth = 1 / scale;
  const lo = world({ x: 0, y: 0 }), hi = world({ x: width, y: height });
  if (exporting) {
    ctx.lineWidth = Math.max(0.1, 1 / scale); for (const s of doc.shapes.filter(visible)) strokeShape(s, s.type === 'dimension' || s.type === 'text' ? '#335' : '#000');
    for (const h of doc.holes.filter(holeVisible)) { const a = holeAppearance(h, doc); if (!a) continue; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angleDeg * Math.PI / 180); ctx.beginPath(); if (a.kind === 'circle' || a.kind === 'dot') ctx.arc(0, 0, a.width / 2, 0, Math.PI * 2); else if (a.kind === 'slit') { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(a.width / 2, 0); } else { ctx.moveTo(-a.width / 2, 0); ctx.lineTo(0, -a.height / 2); ctx.lineTo(a.width / 2, 0); ctx.lineTo(0, a.height / 2); ctx.closePath(); } ctx.strokeStyle = '#c00'; ctx.stroke(); ctx.restore(); }
    return;
  }
  if ($('grid').checked) {
    let step = Number($('spacing').value) || 1; while (step * scale < 12) step *= 5;
    ctx.beginPath();
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) { ctx.moveTo(x, lo.y); ctx.lineTo(x, hi.y); }
    for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) { ctx.moveTo(lo.x, y); ctx.lineTo(hi.x, y); }
    ctx.strokeStyle = '#242424'; ctx.stroke();
  }
  if ($('printOverlay').checked) drawPrintOverlay();
  ctx.beginPath(); ctx.moveTo(lo.x, 0); ctx.lineTo(hi.x, 0); ctx.moveTo(0, lo.y); ctx.lineTo(0, hi.y); ctx.strokeStyle = '#454039'; ctx.stroke();
  ctx.lineWidth = 1.5 / scale;
  const hl = aiHighlight.until > Date.now() ? aiHighlight.ids : null;
  for (const s of doc.shapes.filter(s => visible(s) && s.type === 'image')) strokeShape(s, selected.has(s.id) ? '#c9a96e' : '#555');
  // 革色：部品の閉図形を半透明で塗る（カラーシミュレーション）
  for (const part of doc.parts.filter(p => p.color)) for (const s of doc.shapes.filter(s => part.shapeIds.includes(s.id) && visible(s) && (s.closed || s.type === 'circle'))) { path(previewMoved(s)); ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = part.color; ctx.fill(); ctx.restore(); }
  for (const s of doc.shapes.filter(s => visible(s) && s.type !== 'image')) strokeShape(gesture?.kind === 'node' && gesture.id === s.id ? gesture.preview || s : previewMoved(s), hl && hl.has(s.id) ? '#ff4040' : selected.has(s.id) ? '#c9a96e' : s.type === 'dimension' || s.type === 'text' ? '#9fb8c8' : SHAPE_DRAW_COLOR[s.color] || '#d8d8d8', s.lineStyle === 'dashed');
  ctx.setLineDash([]);
  if (mode === 'select' && selected.size === 1) { const s = doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)); if (s) drawNodes(gesture?.kind === 'node' && gesture.preview ? gesture.preview : s); }
  for (const originalHole of doc.holes) {
    if (!holeVisible(originalHole)) continue;
    const owner = doc.paths.find(p=>p.id===originalHole.pathId)?.shapeIds[0];
    let h = previewMoved(originalHole, owner);
    if (gesture?.kind === 'hole' && gesture.id === h.id) h = holePosition(h, cursor);
    const appearance = holeAppearance(h, doc); if (!appearance) continue;
    const {kind,width:w,height:heightMM} = appearance;
    ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.angleDeg*Math.PI/180); ctx.beginPath();
    if (kind === 'circle' || kind === 'dot') ctx.arc(0,0,w/2,0,Math.PI*2);
    else if (kind === 'slit') { ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); }
    else { ctx.moveTo(-w/2,0); ctx.lineTo(0,-heightMM/2); ctx.lineTo(w/2,0); ctx.lineTo(0,heightMM/2); ctx.closePath(); }
    ctx.fillStyle = ctx.strokeStyle = selected.has(h.id) ? '#c9a96e' : (doc.paths.find(p => p.id === h.pathId)?.threadHex || '#fff');
    if (kind === 'slit') { ctx.lineWidth = heightMM; ctx.stroke(); } else ctx.fill();
    if(selected.has(h.id)){ctx.lineWidth=1/scale;ctx.strokeRect(-w/2-2/scale,-heightMM/2-2/scale,w+4/scale,heightMM+4/scale);}
    ctx.restore();
  }
  if (mode === 'stitch' && manualNext) {
    const savedPath=doc.paths.find(p=>p.id===manualNext.pathId), route=savedPath && resolvePath(doc,savedPath);
    if(route && manualNext.s <= arcLength(route)) { const p=pointAtLength(route,manualNext.s); ctx.strokeStyle='#c9a96e';ctx.lineWidth=1/scale;ctx.strokeRect(p.x-4/scale,p.y-4/scale,8/scale,8/scale); }
  }
  drawCenterMarks();
  placeOffsetFloat(); syncRulerBar();
  if (offsetSelection && mode === 'offset') { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 3 / scale; strokeShape({ type: 'polyline', points: offsetSelection.points, closed: offsetSelection.closed }, '#ff9f43'); ctx.restore(); }
  ctx.setLineDash([5 / scale, 4 / scale]);
  if (gesture?.kind === 'draw') strokeShape(shapeFromDrag(gesture.start, cursor), '#c9a96e');
  if (stage?.kind === 'arc') strokeShape(arcShape(cursor), '#c9a96e');
  if (stage?.kind === 'arc3') { const pv = stage.pts.length >= 2 ? arcThroughPoints(stage.pts[0], stage.pts[1], cursor) : null; strokeShape(pv || { type: 'line', x1: stage.pts[0].x, y1: stage.pts[0].y, x2: (stage.pts[1] || cursor).x, y2: (stage.pts[1] || cursor).y }, '#c9a96e'); for (const q of stage.pts) strokeShape({ type: 'circle', cx: q.x, cy: q.y, r: 2 / scale }, '#c9a96e'); }
  if (stage?.kind === 'arcR') { const ang = Math.atan2(cursor.y - stage.center.y, cursor.x - stage.center.x); strokeShape({ type: 'line', x1: stage.center.x, y1: stage.center.y, x2: stage.center.x + stage.r * Math.cos(ang), y2: stage.center.y + stage.r * Math.sin(ang) }, '#c9a96e'); }
  if (stage?.kind === 'polyline') strokeShape({ type: 'polyline', points: [...stage.points, cursor], closed: false }, '#c9a96e');
  if (stage?.kind === 'path') { const pv = pathPreview(); if (pv) { strokeShape(pv, '#c9a96e'); drawNodes({ ...pv, nodes: stage.nodes }); } }
  if (gesture?.kind === 'pen') { strokeShape({ type: 'line', x1: 2 * gesture.start.x - cursor.x, y1: 2 * gesture.start.y - cursor.y, x2: cursor.x, y2: cursor.y }, '#888'); }
  if (mode === 'ruler') { if (stage?.kind === 'ruler') drawRuler({ a: stage.a, b: cursor }); else if (ruler) drawRuler(ruler); }
  if (stage?.kind === 'dim') strokeShape({ type: 'dimension', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y, offset: Number($('dimOffset').value) || 8 }, '#c9a96e');
  if (stage?.kind === 'mirror') strokeShape({ type: 'line', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'cmd' && stage.start && mode === 'rect') strokeShape(shapeFromDrag(stage.start, cursor), '#c9a96e');
  else if (stage?.kind === 'cmd' && stage.start) strokeShape({ type: 'line', x1: stage.start.x, y1: stage.start.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'cmd' && mode === 'circle' && stage.center && distance(stage.center, cursor) > 1e-8) strokeShape(shapeFromDrag(stage.center, cursor), '#c9a96e'); /* 中心クリック後は中心固定で半径が伸縮 */
  if (stage?.kind === 'foldDraw') strokeShape({ type: 'fold', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (stage?.kind === 'imgScale') strokeShape({ type: 'line', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y }, '#c9a96e');
  if (tracePreviewShapes.length) { ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.2 / scale; for (const s of tracePreviewShapes) strokeShape(s, '#ff4040'); ctx.restore(); }
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
  updateUI();
}
function resize() {
  const r = canvas.getBoundingClientRect(); width = r.width; height = r.height;
  canvas.width = Math.round(width * (window.devicePixelRatio || 1)); canvas.height = Math.round(height * (window.devicePixelRatio || 1)); draw();
  if (view3d) { canvas3d.width = canvas.width; canvas3d.height = canvas.height; render3d(); }
}
function zoom(factor, at = { x: width / 2, y: height / 2 }) {
  const p = world(at); scale = Math.max(0.1, Math.min(100, scale * factor)); origin = { x: at.x - p.x * scale, y: at.y - p.y * scale }; draw();
}
function fit() {
  const shapes = doc.shapes.filter(visible), b = bboxOfDoc({ ...doc, shapes, holes: doc.holes.filter(holeVisible) });
  if (!b) { scale = 4; origin = { x: 80, y: 80 }; }
  else { scale = Math.max(0.1, Math.min(100, (width - 80) / Math.max(1, b.maxX - b.minX), (height - 80) / Math.max(1, b.maxY - b.minY))); origin = { x: width / 2 - (b.minX + b.maxX) / 2 * scale, y: height / 2 - (b.minY + b.maxY) / 2 * scale }; }
  draw();
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
  if (isMac && e.ctrlKey && e.button === 0) return;
  e.preventDefault(); canvas.focus(); const p = local(e); canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || space) { gesture = { kind: 'pan', screen: p, origin: { ...origin } }; return; } // 右ドラッグ／中ボタン／Space で画面をつかんで動かす
  cursor = mode === 'select' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (mode === 'offset' || mode === 'chamfer' || mode === 'fillet') { editAt(world(p)); return; }
  if (mode === 'stitch') { stampAt(world(p), e.altKey); return; }
  if (mode === 'mark') { stampAt(world(p), true, 'dot'); return; }
  if (mode === 'patchfill') { patchFillAt(world(p)); return; }
  if (mode === 'trim') { trimClick(world(p), e.shiftKey); return; }
  if (mode === 'koma') { komaClick(world(p)); return; }
  if (mode === 'hardware') { placeHardware(cursor); return; }
  if (mode === 'library') { placeLibrary(cursor); return; }
  if (mode === 'imgScale') { if (stage?.kind !== 'imgScale') { stage = { kind: 'imgScale', a: world(p) }; $('hint').textContent = t('imgScaleSecond'); } else imgScaleSecond(world(p)); draw(); return; }
  if (mode === 'fold') { if (stage?.kind !== 'foldDraw') stage = { kind: 'foldDraw', a: cursor }; else { const a = stage.a; stage = null; if (distance(a, cursor) > 1e-8) { const mid = { x: (a.x + cursor.x) / 2, y: (a.y + cursor.y) / 2 }, host = doc.shapes.find(s => (s.type === 'polyline' || s.type === 'path') && s.closed && partOf(s) && (b => b.minX <= mid.x && b.maxX >= mid.x && b.minY <= mid.y && b.maxY >= mid.y)(bboxOf(s))); addShape({ type: 'fold', x1: a.x, y1: a.y, x2: cursor.x, y2: cursor.y, angleDeg: Number($('foldAngle').value) || 0, partId: host ? partOf(host).id : null, inner: $('foldInner').checked }); } } lastPoint = cursor; draw(); return; }
  if (mode === 'text') { const content = askText(); if (content) { addShape({ type: 'text', x: cursor.x, y: cursor.y, text: content, sizeMm: Number($('textSize').value) || 5, angleDeg: 0 }); lastPoint = cursor; } return; }
  if (mode === 'ruler') {
    if (stage?.kind !== 'ruler') { ruler = null; stage = { kind: 'ruler', a: cursor }; $('hint').textContent = t('rulerSecond'); }
    else { ruler = { a: stage.a, b: cursor }; stage = null; $('hint').textContent = rulerText(ruler); }
    draw(); return;
  }
  if (mode === 'dimension') { if (stage?.kind !== 'dim') stage = { kind: 'dim', a: cursor }; else { addShape({ type: 'dimension', x1: stage.a.x, y1: stage.a.y, x2: cursor.x, y2: cursor.y, offset: Number($('dimOffset').value) || 8 }); stage = null; } lastPoint = cursor; draw(); return; }
  if (mode === 'mirror') {
    const axis = doc.shapes.filter(s => visible(s) && s.type === 'line' && !selected.has(s.id)).reverse().find(s => distToShape(s, world(p)) <= 7 / scale);
    if (axis) { mirrorCopy({ x: axis.x1, y: axis.y1 }, { x: axis.x2, y: axis.y2 }); return; }
    if (stage?.kind !== 'mirror') stage = { kind: 'mirror', a: cursor }; else { const a = stage.a; stage = null; if (distance(a, cursor) > 1e-8) mirrorCopy(a, cursor); }
    draw(); return;
  }
  if (mode === 'path') {
    if (stage?.kind === 'path' && stage.nodes.length >= 2 && distance(cursor, stage.nodes[0]) <= 9 / scale) { finishPath(true); return; }
    gesture = { kind: 'pen', start: cursor, screen: p }; draw(); return;
  }
  if (mode === 'select') {
    const pathShape = selected.size === 1 ? doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)) : null;
    const nh = pathShape && nodeHit(pathShape, cursor);
    if (nh) { nodeSel = { id: pathShape.id, index: nh.index }; gesture = { kind: 'node', id: pathShape.id, index: nh.index, part: nh.part, alt: e.altKey, screen: p, preview: null }; draw(); return; }
    const hole = [...doc.holes].reverse().find(h=>holeEditable(h)&&distance(h,cursor)<=Math.max(6/scale,(holeAppearance(h,doc)?.width||0)/2));
    if(hole){ if(e.shiftKey){if(selected.has(hole.id))selected.delete(hole.id);else selected.add(hole.id);}else {if(!selected.has(hole.id))selected=new Set([hole.id]);gesture={kind:'hole',id:hole.id,start:cursor};} draw();return;}
    const hit = doc.shapes.filter(editable).reverse().find(s => distToShape(s, cursor) <= 7 / scale);
    if (hit && !e.shiftKey) {
      if (!selected.has(hit.id)) { selected = new Set([hit.id]); nodeSel = null; }
      gesture = { kind: 'move', start: cursor, screen: p, ids: selectedShapeIds(), insertId: pathShape?.id === hit.id ? hit.id : null };
    } else { gesture = { kind: 'select', start: cursor, screen: p, additive: e.shiftKey }; if (!e.shiftKey) nodeSel = null; }
  }
  else if (stage) { gesture = { kind: 'stage' }; }
  else { gesture = { kind: 'draw', start: cursor }; }
  draw();
});
canvas.addEventListener('pointermove', e => {
  const p = local(e);
  if (gesture?.kind === 'pan') { origin = { x: gesture.origin.x + p.x - gesture.screen.x, y: gesture.origin.y + p.y - gesture.screen.y }; cursor = world(p); }
  else cursor = gesture?.kind === 'move' ? movePosition(world(p), e.shiftKey) : mode === 'select' && gesture?.kind !== 'node' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  if (gesture?.kind === 'node') { const s = doc.shapes.find(s => s.id === gesture.id); gesture.alt = gesture.alt || e.altKey; if (s) gesture.preview = editedNodePath(s, gesture, cursor); }
  draw();
});
canvas.addEventListener('dblclick', e => {
  const p = local(e), w = world(p);
  if (mode === 'path') { finishPath(false); return; }
  if (mode === 'offset') { offsetClick(w, true); return; } /* ダブルクリック＝つながった図形全体を選ぶ */
  if (mode === 'line' && stage?.kind === 'cmd') { stage = null; $('hint').textContent = t('hint.line'); draw(); return; } // 終点でダブルクリック＝連続線の確定
  if (mode === 'select') {
    const s = selected.size === 1 ? doc.shapes.find(s => selected.has(s.id) && s.type === 'path' && editable(s)) : null;
    const hit = doc.shapes.filter(x => visible(x) && editable(x) && stitchable(x)).reverse().find(x => distToShape(x, w) <= 7 / scale);
    const chain = hit ? chainShapes(doc.shapes.filter(x => visible(x) && stitchable(x))).find(c => c.shapeIds.includes(hit.id)) : null;
    if (s && !nodeHit(s, w) && distToShape(s, w) <= 7 / scale && (!chain || chain.shapeIds.length === 1)) { const next = pathInsertNode(s, projectOnPath(s, w).s); nodeSel = null; transformSelectedTo(next); } /* ペンの線だけなら節点を足す */
    else if (chain && chain.shapeIds.length > 1) { /* ダブルクリック＝つながった図形をすべて選ぶ（端点でつながる線・円弧・曲線。ロックした層の図形は除く） */
      const ids = chain.shapeIds.filter(id => { const x = doc.shapes.find(y => y.id === id); return x && editable(x); }); selected = new Set(ids); nodeSel = null; $('hint').textContent = t('chainSelected', { n: ids.length }); draw(); }
  }
});
canvas.addEventListener('pointerup', e => {
  if (!gesture) return;
  const g = gesture, p = local(e);
  cursor = g.kind === 'move' ? movePosition(world(p), e.shiftKey) : mode === 'select' || g.kind === 'pan' ? world(p) : snapped(world(p), e.shiftKey, anchor());
  gesture = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (g.kind === 'hole') { const h=doc.holes.find(h=>h.id===g.id); if(h && holeEditable(h))commit(()=>Object.assign(h,holePosition(h,cursor)));
  } else if (g.kind === 'pen') {
    penRelease(g.start, cursor, distance(p, g.screen) >= 4); lastPoint = g.start;
  } else if (g.kind === 'node') {
    const s = doc.shapes.find(s => s.id === g.id);
    if (s && editable(s) && distance(p, g.screen) >= 2) transformSelectedTo(editedNodePath(s, g, cursor));
  } else if (g.kind === 'move') {
    if (distance(p, g.screen) >= 4) transformSelected(s => translate(s, cursor.x - g.start.x, cursor.y - g.start.y));
    else if (g.insertId) {
      const s = doc.shapes.find(s => s.id === g.insertId);
      if (s && editable(s)) { const next = pathInsertNode(s, projectOnPath(s, cursor).s); nodeSel = null; transformSelectedTo(next); }
    }
  } else if (g.kind === 'select') {
    if (!g.additive) selected.clear();
    if (distance(p, g.screen) < 4) {
      const hit = doc.shapes.filter(editable).reverse().find(s => distToShape(s, cursor) <= 7 / scale);
      if (hit) { if (g.additive && selected.has(hit.id)) selected.delete(hit.id); else selected.add(hit.id); }
    } else {
      const minX = Math.min(g.start.x, cursor.x), maxX = Math.max(g.start.x, cursor.x), minY = Math.min(g.start.y, cursor.y), maxY = Math.max(g.start.y, cursor.y);
      for (const s of doc.shapes.filter(editable)) { const b = bboxOf(s); if (b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY) selected.add(s.id); }
    }
  } else if (g.kind === 'draw' && mode === 'arc' && arcThreePoint()) {
    stage = { kind: 'arc3', pts: [g.start] }; $('hint').textContent = t('arcThreeHint');
  } else if (g.kind === 'draw' && mode === 'arc' && arcFixedRadius() > 0) {
    const fixedR = arcFixedRadius();
    stage = distance(g.start, cursor) > 1e-8 ? { kind: 'arc', center: g.start, r: fixedR, startDeg: Math.atan2(cursor.y - g.start.y, cursor.x - g.start.x) * 180 / Math.PI } : { kind: 'arcR', center: g.start, r: fixedR };
    $('hint').textContent = t('arcRadiusHint');
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
  // WheelEvent に入力機器の種類はないため、小さな pixel delta をトラックパッドと推定する。
  if (!e.ctrlKey && e.deltaMode === 0 && (e.deltaX || Math.abs(e.deltaY) < 50)) { origin.x -= e.deltaX || 0; origin.y -= e.deltaY; draw(); }
  else zoom(Math.exp(-Math.max(-200, Math.min(200, e.deltaY)) * 0.0015), local(e));
}, { passive: false });
canvas.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.tool)));
$('delete').onclick = removeSelected;
$('copy').onclick = copySelected;
for (const id of ['mirrorX', 'mirrorY', 'rotate']) $(id).onclick = () => transformAboutCenter(id);
$('language').addEventListener('change', e => applyLanguage(e.target.value));
$('undo').onclick = () => history(undo, redo); $('redo').onclick = () => history(redo, undo);
$('new').onclick = () => { cancel(); commit(() => { doc = newDoc(); doc.tools = loadTools(); selected.clear(); manualNext = null; nodeSel = null; refreshTools(); }); activeLayer = 'pattern'; pairLines = []; renderLayers(); renderSeams(); fit(); };
$('zoomIn').onclick = () => zoom(1.25); $('zoomOut').onclick = () => zoom(0.8); $('fit').onclick = fit;
for (const id of ['grid', 'snap', 'spacing']) $(id).addEventListener('change', () => { if (!(Number($('spacing').value) >= 0.1)) $('spacing').value = '1'; snap = null; draw(); });
for (const id of ['printOverlay', 'paper', 'outHoles']) $(id).addEventListener('change', () => draw());
function save() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = (tabs[activeTab]?.name ? tabs[activeTab].name.replace(/[\\/:*?"<>|]+/g, '_') : 'leather-pattern') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (tabs[activeTab]) { tabs[activeTab].dirty = false; renderTabs(); }
}
window.addEventListener('beforeunload', e => { if (tabs.some(tb => tb.dirty)) { e.preventDefault(); e.returnValue = ''; } });
$('save').onclick = save; $('open').onclick = () => $('file').click();
$('file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  await openFile(file);
});
window.addEventListener('keydown', e => {
  const input = e.target instanceof HTMLInputElement || ['SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
  if (isShortcut(e, 's') || isShortcut(e, 'o')) { e.preventDefault(); isShortcut(e, 's') ? save() : $('file').click(); return; }
  if (input) return;
  if (document.querySelector?.('dialog[open]')) return; // ダイアログ内の Esc/Space はダイアログのもの
  if (isUndo(e) || isRedo(e)) { e.preventDefault(); if (isRedo(e)) history(redo, undo); else history(undo, redo); }
  else if (isCopy(e)) { e.preventDefault(); copySelected(); }
  else if (isSelectAll(e)) { e.preventDefault(); selectAllShapes(); }
  else if (e.code === 'Space') { if (e.target === canvas || e.target === document.body) { e.preventDefault(); space = true; } }
  else if (e.key === 'Escape') { if (stage?.kind === 'path' && stage.nodes.length) { stage.nodes.pop(); if (!stage.nodes.length) stage = null; draw(); } else setMode('select'); }
  else if (isDelete(e)) { e.preventDefault(); if (nodeSel && mode === 'select') $('removeNode').click(); else removeSelected(); }
  else if (e.key === 'F1' || e.key === '?') { e.preventDefault(); showHelp(e.key === 'F1'); }
  else if (e.key === 'Enter' && mode === 'offset' && offsetSelection) { e.preventDefault(); runOffset(); }
  else if (e.key === 'Enter' && mode === 'line' && stage?.kind === 'cmd') { e.preventDefault(); stage = null; $('hint').textContent = t('hint.line'); draw(); }
  else if (e.key === 'Enter' && stage?.kind === 'polyline') { e.preventDefault(); finishPolyline(); }
  else if (e.key === 'Enter' && stage?.kind === 'path') { e.preventDefault(); finishPath(false); }
});
$('cmd').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); runCommand($('cmd').value); }
  else if (e.key === 'Escape') { e.preventDefault(); $('cmd').value = ''; setMode('select'); canvas.focus(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
window.addEventListener('blur', () => { space = false; gesture = null; draw(); });
window.addEventListener('resize', resize);
doc.tools = loadTools(); initStitch(); initPresets(); initLayers(); initInfo(); initOutput(); initDesign(); init3d(); initHardware(); initSpineSim(); initLibrary(); initAi(); initRecipe(); initImages(); initColors(); initTutorials(); initVoice(); initDesigns(); renderLayers(); rebuildSnaps(); resize(); fit(); setMode('select');
let initialLang = globalThis.navigator?.language?.startsWith('ja') ? 'ja' : 'en';
try { initialLang = localStorage.getItem('leather-cad.lang') || initialLang; } catch { /* 保存不可でもブラウザ言語で起動する。 */ }
applyLanguage(initialLang);
showTour();
}
