/** 頂点の座標だけを変更する。ペンのつまみは同じ分だけ動かし、不正な入力は null を返す。 */
export function editVertex(shape, index, axis, value) {
  const field = shape.type === 'polyline' ? 'points' : shape.type === 'path' ? 'nodes' : null, v = Number(value);
  if (!field || !Number.isInteger(index) || !['x', 'y'].includes(axis) || String(value).trim() === '' || !Number.isFinite(v)) return null;
  const points = shape[field], p = points?.[index]; if (!p) return null;
  const next = { ...p, [axis]: v };
  if (field === 'nodes') {
    const d = v - p[axis], suffix = axis.toUpperCase();
    next['in' + suffix] = p['in' + suffix] + d; next['out' + suffix] = p['out' + suffix] + d;
    if (![next['in' + suffix], next['out' + suffix]].every(Number.isFinite)) return null;
  }
  return { ...shape, [field]: points.map((p, i) => i === index ? next : p) };
}
