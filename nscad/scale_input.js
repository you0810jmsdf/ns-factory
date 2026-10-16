import { evalExpr } from './hardware.js';
/** いまの大きさをもとに、寸法と倍率を丸めずに求める。使えない入力は null。 */
export function scaleInput(value, current, isSize = false) {
  const n = Number(value); if (!(n > 0) || !Number.isFinite(n) || !Number.isFinite(current) || current < 0 || (isSize && current === 0)) return null;
  const percent = isSize ? n / current * 100 : n, size = isSize ? n : current * (n / 100);
  return Number.isFinite(percent) && percent > 0 && Number.isFinite(size) ? { percent, size } : null;
}
/** 計算メモの式を計算する。四則・かっこ・小数、全角の数字と記号、× ÷、直前の答え（ans）が使える。戻り値は { value } か { error: 'empty' | 'syntax' | 'div' }（eval は使わない）。 */
export function calcExpr(text, { ans } = {}) {
  const s = String(text ?? '').replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[×✕]/g, '*').replace(/÷/g, '/').replace(/[−ー]/g, '-').replace(/[,，\s　]/g, '').replace(/ans|答/gi, 'ans');
  if (!s) return { error: 'empty' };
  let v; try { v = evalExpr(s, { ans }); } catch { return { error: 'syntax' }; }
  if (!Number.isFinite(v)) return { error: 'div' };
  return { value: +v.toFixed(9) };
}
/** 計算結果の表示：小数は 6 桁まで、余分な 0 は付けない。 */
export function fmtCalc(n) { return String(+Number(n).toFixed(6)); }
