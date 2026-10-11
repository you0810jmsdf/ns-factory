/** いまの大きさをもとに、寸法と倍率を丸めずに求める。使えない入力は null。 */
export function scaleInput(value, current, isSize = false) {
  const n = Number(value); if (!(n > 0) || !Number.isFinite(n) || !Number.isFinite(current) || current < 0 || (isSize && current === 0)) return null;
  const percent = isSize ? n / current * 100 : n, size = isSize ? n : current * (n / 100);
  return Number.isFinite(percent) && percent > 0 && Number.isFinite(size) ? { percent, size } : null;
}
