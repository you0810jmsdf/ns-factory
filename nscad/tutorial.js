// 画面内チュートリアル：台本（tutorials/*.json）の検証・乾式実行・再生エンジン（擬似カーソル・ハイライト・字幕）。
// 台本の 1 手順：{say:'i18nキー', click:'#id'|null, mouse:[x,y]（mm）, drag:[x1,y1,x2,y2], key:'Enter', wait:ms, mode:'line', value:{'#id':'値'}}
export const STEP_KEYS = ['say', 'click', 'mouse', 'drag', 'key', 'wait', 'mode', 'value', 'press'];
/** 台本を検証して問題の配列を返す（空＝OK）。existsSelector(sel)・hasKey(key) は環境依存の検査関数。 */
export function validateScript(script, { existsSelector = () => true, hasKey = () => true } = {}) {
  const out = [];
  if (!script || typeof script !== 'object') return ['not-object'];
  for (const k of ['id', 'title', 'steps']) if (!(k in script)) out.push('missing:' + k);
  if (!Array.isArray(script.steps) || !script.steps.length) { out.push('steps-empty'); return out; }
  script.steps.forEach((s, i) => {
    if (!s || typeof s !== 'object') { out.push(`#${i}: not-object`); return; }
    for (const k of Object.keys(s)) if (!STEP_KEYS.includes(k)) out.push(`#${i}: unknown key ${k}`);
    if (s.say !== undefined && !hasKey(s.say)) out.push(`#${i}: missing caption ${s.say}`);
    if (s.click && !existsSelector(s.click)) out.push(`#${i}: missing selector ${s.click}`);
    if (s.value) for (const sel of Object.keys(s.value)) if (!existsSelector(sel)) out.push(`#${i}: missing selector ${sel}`);
    if (s.mouse && (!Array.isArray(s.mouse) || s.mouse.length !== 2 || !s.mouse.every(Number.isFinite))) out.push(`#${i}: mouse`);
    if (s.drag && (!Array.isArray(s.drag) || s.drag.length !== 4 || !s.drag.every(Number.isFinite))) out.push(`#${i}: drag`);
    if (s.wait !== undefined && !(s.wait >= 0)) out.push(`#${i}: wait`);
  });
  return out;
}
/** 乾式実行：手順数と所要時間（ms）を返す。移動は 600ms、クリック 300ms、字幕は文字数×60ms（最低 1.2 秒）、wait はそのまま。 */
export function dryRun(script, { captionLength = s => (s || '').length, speed = 1 } = {}) {
  let ms = 0, count = 0;
  for (const s of script.steps || []) { count++; if (s.mouse || s.drag) ms += 600; if (s.click || s.press) ms += 300; if (s.key) ms += 200; if (s.value) ms += 300; if (s.say !== undefined) ms += Math.max(1200, captionLength(s.say) * 60); if (s.wait) ms += s.wait; }
  return { steps: count, ms: Math.round(ms / speed) };
}
/** 再生エンジン。host = {click(sel), setValue(sel,v), moveTo(x,y), drag(x1,y1,x2,y2), key(k), setMode(m), caption(text), highlight(sel|null), cursor(x,y|null), t(key), sleep(ms)}。 */
export function createPlayer(script, host) {
  let index = 0, running = false, paused = false, speed = 1, selfMode = false, stopped = false;
  const sleep = ms => host.sleep(ms / speed);
  async function runStep(s) {
    if (s.say !== undefined) host.caption(host.t(s.say));
    if (s.mode) host.setMode(s.mode);
    if (s.click) { host.highlight(s.click); if (!selfMode) { await sleep(400); host.click(s.click); } }
    if (s.value) for (const [sel, v] of Object.entries(s.value)) { host.highlight(sel); if (!selfMode) host.setValue(sel, v); }
    if (s.mouse) { host.cursor(s.mouse[0], s.mouse[1]); await sleep(600); if (s.press && !selfMode) host.click(null, s.mouse); }
    if (s.drag) { host.cursor(s.drag[0], s.drag[1]); await sleep(300); if (!selfMode) host.drag(...s.drag); host.cursor(s.drag[2], s.drag[3]); await sleep(300); }
    if (s.key && !selfMode) host.key(s.key);
    await sleep(s.wait ?? (s.say !== undefined ? Math.max(1200, host.t(s.say).length * 60) : 300));
  }
  return {
    async play() { if (running) return; running = true; stopped = false; for (; index < script.steps.length && !stopped; index++) { while (paused && !stopped) await host.sleep(100); if (stopped) break; await runStep(script.steps[index]); } running = false; host.highlight(null); host.cursor(null); if (!stopped) { host.caption(host.t('tutorialDone')); index = 0; } },
    pause() { paused = !paused; return paused; }, stop() { stopped = true; paused = false; },
    setSpeed(v) { speed = Math.max(0.25, Math.min(4, v)); }, setSelfMode(v) { selfMode = !!v; },
    get index() { return index; }, get running() { return running; }, get selfMode() { return selfMode; },
  };
}
