'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../order_estimate/labor-curve-model.js');
const points = values => values.map(([area, hours]) => ({ area, hours, label: '' }));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('known proportional line remains exact inside and outside the control range', () => {
  const p = points([[1, 2], [3, 6], [8, 16]]);
  for (let x = 0; x <= 12; x += 0.125) close(model.evaluate(p, x), 2 * x);
  for (const s of model.segments(p)) { close(s.b, 2); close(s.c, 0); close(s.d, 0); }
});

test('two control points give a line and origin-to-first-point proportional extrapolation', () => {
  const p = points([[2, 3], [6, 5]]);
  close(model.evaluate(p, 1), 1.5);
  close(model.evaluate(p, 4), 4);
  close(model.evaluate(p, 10), 7);
  assert.equal(model.evaluate(p, -1), 0);
});

test('every control point is reproduced and segment coefficients match evaluation', () => {
  const p = points([[0.4, 0.8], [0.7, 1.8], [1.5, 2], [3, 6], [8, 6.1]]);
  for (const q of p) close(model.evaluate(p, q.area), q.hours);
  model.segments(p).forEach((s, i) => {
    const width = s.end - s.x;
    close(s.a, p[i].hours);
    close(s.a + s.b * width + s.c * width ** 2 + s.d * width ** 3, p[i + 1].hours);
    for (const fraction of [0.1, 0.5, 0.9]) {
      const t = width * fraction;
      close(model.evaluate(p, s.x + t), s.a + s.b * t + s.c * t ** 2 + s.d * t ** 3);
    }
  });
});

test('uneven intervals, plateaus and steep transitions never overshoot or decrease', () => {
  for (const values of [
    [[1, 0], [1.01, 8], [4, 8], [4.1, 9], [10, 10]],
    [[0.2, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 1], [2, 2], [3, 20], [4, 20.1]]
  ]) {
    const p = points(values);
    let previous = 0;
    for (let i = 0; i < p.length - 1; i++) {
      for (let j = 0; j <= 100; j++) {
        const x = p[i].area + (p[i + 1].area - p[i].area) * j / 100;
        const y = model.evaluate(p, x);
        assert.ok(y >= previous - 1e-10);
        assert.ok(y >= p[i].hours - 1e-10 && y <= p[i + 1].hours + 1e-10);
        previous = y;
      }
    }
    assert.ok(model.evaluate(p, p.at(-1).area + 100) >= previous);
  }
});

test('neighboring polynomial segments have continuous first derivatives', () => {
  const pieces = model.segments(points([[1, 1], [2, 4], [5, 5], [6, 8]]));
  for (let i = 0; i < pieces.length - 1; i++) {
    const s = pieces[i], t = s.end - s.x;
    close(s.b + 2 * s.c * t + 3 * s.d * t * t, pieces[i + 1].b);
  }
});

test('validation clones normalized data without changing caller-owned points', () => {
  const original = { version: 1, curves: { simplist: [{ area: 1, hours: 1 }, { area: 2, hours: 3, label: '<script>example</script>' }] } };
  const result = model.validate(original);
  assert.equal(result.curves.simplist[0].label, '');
  assert.equal(result.curves.simplist[1].label, '<script>example</script>');
  result.curves.simplist[0].hours = 9;
  assert.equal(original.curves.simplist[0].hours, 1);
});

test('invalid formats, non-finite values, duplicate areas and descending hours are rejected', () => {
  const wrap = p => ({ version: 1, curves: { simplist: p } });
  for (const data of [null, {}, { version: 2, curves: {} }, { version: 1, curves: [] }, { version: 1, curves: {} },
    wrap([]), wrap(points([[1, 1]])), wrap(points([[0, 1], [2, 2]])),
    wrap(points([[1, 2], [2, 1]])), wrap(points([[2, 1], [1, 2]])), wrap(points([[1, 1], [1, 2]])),
    wrap(points([[1, -1], [2, 2]])), wrap(points([[1, NaN], [2, 2]])), wrap(points([[1, 1], [Infinity, 2]])),
    wrap([{ area: '1', hours: 1 }, { area: 2, hours: 2 }]),
    wrap(Array.from({ length: 33 }, (_, i) => ({ area: i + 1, hours: i }))),
    JSON.parse('{"version":1,"curves":{"__proto__":[{"area":1,"hours":1},{"area":2,"hours":2}]}}')
  ]) assert.throws(() => model.validate(data));
  assert.throws(() => model.evaluate(points([[1, 1], [2, 2]]), NaN));
});

test('browser global exposes the same standalone API without CommonJS', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../order_estimate/labor-curve-model.js'), 'utf8'), context);
  assert.equal(typeof context.NSFLaborCurveModel.validate, 'function');
  close(context.NSFLaborCurveModel.evaluate(points([[1, 2], [2, 4]]), 1.5), 3);
});
