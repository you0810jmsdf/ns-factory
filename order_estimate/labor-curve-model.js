(function (root, factory) {
  'use strict';
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.NSFLaborCurveModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function checkPoints(points) {
    if (!Array.isArray(points) || points.length < 2 || points.length > 32) {
      throw new Error('曲線には 2〜32 個の点が必要です。');
    }
    return points.map((point, i) => {
      if (!point || typeof point.area !== 'number' || !Number.isFinite(point.area) || point.area <= 0 ||
          typeof point.hours !== 'number' || !Number.isFinite(point.hours) || point.hours < 0) {
        throw new Error('面積は正の有限数、工数は 0 以上の有限数で入力してください。');
      }
      if (i && (point.area <= points[i - 1].area || point.hours < points[i - 1].hours)) {
        throw new Error('点は面積の昇順で重複なく並べ、工数は前の点以上にしてください。');
      }
      if (point.label != null && typeof point.label !== 'string') throw new Error('点の名前は文字列で入力してください。');
      return { area: point.area, hours: point.hours, label: point.label || '' };
    });
  }

  function validate(data) {
    if (!data || data.version !== 1 || !data.curves || typeof data.curves !== 'object' || Array.isArray(data.curves)) {
      throw new Error('工数曲線データの形式またはバージョンが不正です。');
    }
    const entries = Object.entries(data.curves);
    if (!entries.length) throw new Error('構造別の曲線が必要です。');
    const curves = {};
    for (const [id, points] of entries) {
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) {
        throw new Error('構造 ID が不正です。');
      }
      curves[id] = checkPoints(points);
      build(curves[id]);
    }
    return { version: 1, curves };
  }

  // PCHIP: weighted harmonic interior slopes and limited endpoint slopes.
  // A flat interval has zero slopes at both ends, preventing overshoot.
  function build(points) {
    const n = points.length;
    const widths = [], slopes = [], tangents = Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) {
      widths.push(points[i + 1].area - points[i].area);
      slopes.push((points[i + 1].hours - points[i].hours) / widths[i]);
    }
    if (n === 2) tangents[0] = tangents[1] = slopes[0];
    else {
      for (let i = 1; i < n - 1; i++) {
        if (slopes[i - 1] > 0 && slopes[i] > 0) {
          const w1 = 2 * widths[i] + widths[i - 1];
          const w2 = widths[i] + 2 * widths[i - 1];
          tangents[i] = (w1 + w2) / (w1 / slopes[i - 1] + w2 / slopes[i]);
        }
      }
      const endpoint = (h0, h1, s0, s1) => Math.max(0, Math.min(3 * s0, ((2 * h0 + h1) * s0 - h0 * s1) / (h0 + h1)));
      tangents[0] = endpoint(widths[0], widths[1], slopes[0], slopes[1]);
      tangents[n - 1] = endpoint(widths[n - 2], widths[n - 3], slopes[n - 2], slopes[n - 3]);
    }
    const pieces = widths.map((h, i) => ({
      x: points[i].area,
      end: points[i + 1].area,
      a: points[i].hours,
      b: tangents[i],
      c: (3 * slopes[i] - 2 * tangents[i] - tangents[i + 1]) / h,
      d: (tangents[i] + tangents[i + 1] - 2 * slopes[i]) / h / h
    }));
    if (pieces.some(piece => Object.values(piece).some(value => !Number.isFinite(value))) ||
        tangents.some(value => !Number.isFinite(value))) throw new Error('点の間隔または数値の範囲が計算可能な範囲を超えています。');
    return { pieces, lastSlope: tangents[n - 1] };
  }

  function segments(points) {
    return build(checkPoints(points)).pieces;
  }

  function evaluate(points, area) {
    if (typeof area !== 'number' || !Number.isFinite(area)) throw new Error('面積は有限数で入力してください。');
    const checked = checkPoints(points);
    if (area <= 0) return 0;
    const first = checked[0], last = checked[checked.length - 1];
    if (area <= first.area) return first.hours * (area / first.area);
    const { pieces, lastSlope } = build(checked);
    let value;
    if (area >= last.area) value = last.hours + lastSlope * (area - last.area);
    else {
      const i = pieces.findIndex(piece => area <= piece.end);
      const piece = pieces[i], t = area - piece.x;
      value = ((piece.d * t + piece.c) * t + piece.b) * t + piece.a;
      // Suppress floating-point drift at endpoints without changing the curve.
      value = Math.max(checked[i].hours, Math.min(checked[i + 1].hours, value));
    }
    if (!Number.isFinite(value)) throw new Error('計算結果が有限数の範囲を超えています。');
    return Math.max(0, value);
  }

  return { validate, segments, evaluate };
});
