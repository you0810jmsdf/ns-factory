/** 図形を囲む四角から、全体の端・中央に揃える移動量を返す。入力は変えない。 */
export function alignOffsets(boxes, kind) {
  if (!boxes.length) return [];
  const axis = ['left', 'centerX', 'right'].includes(kind) ? 'X' : 'Y', min = 'min' + axis, max = 'max' + axis;
  const edge = ['left', 'top'].includes(kind) ? 0 : ['right', 'bottom'].includes(kind) ? 1 : 0.5;
  const target = Math.min(...boxes.map(b => b[min])) * (1 - edge) + Math.max(...boxes.map(b => b[max])) * edge;
  return boxes.map(b => { const delta = target - (b[min] * (1 - edge) + b[max] * edge); return { dx: axis === 'X' ? delta : 0, dy: axis === 'Y' ? delta : 0 }; });
}

/** 両端を動かさず、位置順に隙間を等しくする。戻り値は入力と同じ順番。 */
export function distributeOffsets(boxes, axis) {
  const offsets = boxes.map(() => ({ dx: 0, dy: 0 })); if (boxes.length < 3) return offsets;
  const min = axis === 'x' ? 'minX' : 'minY', max = axis === 'x' ? 'maxX' : 'maxY', delta = axis === 'x' ? 'dx' : 'dy';
  const order = boxes.map((b, i) => i).sort((a, b) => boxes[a][min] - boxes[b][min]), first = boxes[order[0]], last = boxes[order[order.length - 1]];
  const middle = order.slice(1, -1), gap = (last[min] - first[max] - middle.reduce((sum, i) => sum + boxes[i][max] - boxes[i][min], 0)) / (boxes.length - 1);
  let pos = first[max] + gap;
  for (const i of middle) { offsets[i][delta] = pos - boxes[i][min]; pos += boxes[i][max] - boxes[i][min] + gap; }
  return offsets;
}
