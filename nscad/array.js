/** 元の位置を除き、左端・上端から次の左端・上端への移動量を返す。個数は元を含む。 */
export function arrayOffsets(nx, ny, dx, dy) {
  if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx < 1 || ny < 1 || nx * ny > 200 || !Number.isFinite(dx) || !Number.isFinite(dy)) throw new RangeError('個数は1以上の整数で合計200個まで、間隔は有限の数にしてください');
  const offsets = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (i || j) offsets.push({ dx: i ? i * dx : 0, dy: j ? j * dy : 0 });
  return offsets;
}
