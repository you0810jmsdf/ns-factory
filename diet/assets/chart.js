// SVG グラフ描画エンジン。外部ライブラリは使わず、375px 幅を基準にレスポンシブ描画する。

const BASE_WIDTH = 375;
const LINE_HEIGHT = 240;
const BAR_HEIGHT = 220;
const RING_SIZE = 180;

const DEFAULT_COLORS = Object.freeze([
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#7c3aed',
  '#ea580c',
  '#0891b2'
]);

const DEFAULT_TEXT_COLOR = '#334155';
const DEFAULT_GRID_COLOR = '#e2e8f0';
const DEFAULT_AXIS_COLOR = '#94a3b8';

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatNumber(value, digits = 1) {
  if (!isFiniteNumber(value)) {
    return '';
  }
  const rounded = Math.round(value * (10 ** digits)) / (10 ** digits);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function defaultFormatter(value, unit = '') {
  return `${formatNumber(value, 1)}${unit}`;
}

function normalizePoint(point, index) {
  if (isFiniteNumber(point) || point == null) {
    return {
      x: index,
      label: String(index + 1),
      value: isFiniteNumber(point) ? point : null,
      raw: point
    };
  }

  const x = point.x ?? point.date ?? point.label ?? index;
  const label = point.label ?? point.date ?? String(x);
  const rawValue = point.value ?? point.y;
  return {
    x,
    label,
    value: isFiniteNumber(rawValue) ? rawValue : null,
    raw: point
  };
}

function normalizeSeries(options) {
  const sourceSeries = options.series || [
    {
      name: options.name || '',
      color: options.color,
      points: options.points || options.data || []
    }
  ];

  return sourceSeries.map((series, seriesIndex) => {
    const points = (series.points || series.data || []).map(normalizePoint);
    return {
      name: series.name || '',
      color: series.color || DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length],
      width: isFiniteNumber(series.width) ? series.width : 2.5,
      dash: series.dash || '',
      points,
      pointByX: new Map(points.map((point) => [point.x, point]))
    };
  });
}

function collectXValues(seriesList) {
  const seen = new Set();
  const values = [];
  for (const series of seriesList) {
    for (const point of series.points) {
      if (!seen.has(point.x)) {
        seen.add(point.x);
        values.push(point.x);
      }
    }
  }
  return values;
}

function collectYValues(seriesList, targetLines) {
  const values = [];
  for (const series of seriesList) {
    for (const point of series.points) {
      if (isFiniteNumber(point.value)) {
        values.push(point.value);
      }
    }
  }
  for (const line of targetLines) {
    if (isFiniteNumber(line.value)) {
      values.push(line.value);
    }
  }
  return values;
}

function normalizeTargetLines(options) {
  const lines = Array.isArray(options.targetLines) ? [...options.targetLines] : [];
  if (isFiniteNumber(options.targetValue)) {
    lines.push({
      value: options.targetValue,
      label: options.targetLabel || '目標',
      color: options.targetColor || '#64748b'
    });
  }
  return lines.map((line) => ({
    value: line.value,
    label: line.label || '',
    color: line.color || '#64748b',
    dash: line.dash || '5 4'
  }));
}

function calculateYRange(values, options = {}) {
  if (!values.length) {
    return { min: 0, max: 1 };
  }
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (isFiniteNumber(options.yMin)) {
    min = options.yMin;
  }
  if (isFiniteNumber(options.yMax)) {
    max = options.yMax;
  }
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, options.minYPadding ?? 1);
    return { min: min - pad, max: max + pad };
  }
  const padding = isFiniteNumber(options.yPadding)
    ? options.yPadding
    : Math.max((max - min) * 0.1, options.minYPadding ?? 1);
  return { min: min - padding, max: max + padding };
}

function makeTicks(min, max, count = 4) {
  if (!isFiniteNumber(min) || !isFiniteNumber(max) || count <= 1) {
    return [];
  }
  const ticks = [];
  const step = (max - min) / (count - 1);
  for (let i = 0; i < count; i += 1) {
    ticks.push(min + step * i);
  }
  return ticks;
}

function lineSegments(points, xAt, yAt) {
  const segments = [];
  let current = [];

  points.forEach((point, index) => {
    if (isFiniteNumber(point.value)) {
      current.push([xAt(index), yAt(point.value)]);
    } else if (current.length) {
      segments.push(current);
      current = [];
    }
  });

  if (current.length) {
    segments.push(current);
  }

  return segments;
}

function pathFromSegment(segment) {
  return segment
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${formatNumber(x, 2)} ${formatNumber(y, 2)}`)
    .join(' ');
}

function resolveContainer(container) {
  if (typeof container === 'string') {
    return document.querySelector(container);
  }
  return container;
}

function ensureBrowser() {
  if (typeof document === 'undefined') {
    throw new Error('この描画関数はブラウザ環境でのみ利用できます');
  }
}

function setTooltip(svg, target) {
  const tooltip = svg.querySelector('[data-chart-tooltip]');
  const text = tooltip?.querySelector('text');
  const rect = tooltip?.querySelector('rect');
  if (!tooltip || !text || !rect) {
    return;
  }

  const label = target.getAttribute('data-tooltip') || '';
  const x = Number(target.getAttribute('data-point-x'));
  const y = Number(target.getAttribute('data-point-y'));
  const width = Math.max(84, label.length * 7 + 18);
  const boxX = clamp(x - width / 2, 4, BASE_WIDTH - width - 4);
  const boxY = clamp(y - 42, 4, LINE_HEIGHT - 34);

  rect.setAttribute('x', String(boxX));
  rect.setAttribute('y', String(boxY));
  rect.setAttribute('width', String(width));
  text.setAttribute('x', String(boxX + width / 2));
  text.setAttribute('y', String(boxY + 21));
  text.textContent = label;
  tooltip.setAttribute('visibility', 'visible');
}

function attachLineTooltip(svg) {
  svg.addEventListener('pointerdown', (event) => {
    const target = event.target.closest?.('[data-tooltip]');
    if (target) {
      setTooltip(svg, target);
    }
  });

  svg.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = event.target.closest?.('[data-tooltip]');
    if (target) {
      event.preventDefault();
      setTooltip(svg, target);
    }
  });
}

/**
 * 複数系列対応の折れ線グラフSVG文字列を生成する。
 * 欠測値は線を切り、水平の目標線も描画できる。
 * @param {{series?:Array<object>, data?:Array<object|number|null>, width?:number, height?:number, unit?:string, title?:string, targetValue?:number, targetLabel?:string, targetLines?:Array<object>, yMin?:number, yMax?:number, valueFormatter?:(value:number)=>string}} options 描画設定。
 * @returns {string} SVG文字列。
 */
export function createLineChartSvg(options = {}) {
  const width = options.width || BASE_WIDTH;
  const height = options.height || LINE_HEIGHT;
  const margin = { top: 20, right: 14, bottom: 34, left: 42 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const unit = options.unit || '';
  const formatter = options.valueFormatter || ((value) => defaultFormatter(value, unit));
  const seriesList = normalizeSeries(options);
  const targetLines = normalizeTargetLines(options);
  const xValues = collectXValues(seriesList);
  const yValues = collectYValues(seriesList, targetLines);
  const yRange = calculateYRange(yValues, options);
  const ticks = makeTicks(yRange.min, yRange.max, options.yTickCount || 4);
  const xAt = (index) => margin.left + (xValues.length <= 1 ? chartWidth / 2 : chartWidth * index / (xValues.length - 1));
  const yAt = (value) => margin.top + (yRange.max - value) / (yRange.max - yRange.min) * chartHeight;

  const grid = ticks.map((tick) => {
    const y = yAt(tick);
    return [
      `<line x1="${margin.left}" y1="${formatNumber(y, 2)}" x2="${width - margin.right}" y2="${formatNumber(y, 2)}" stroke="${DEFAULT_GRID_COLOR}" stroke-width="1" />`,
      `<text x="${margin.left - 8}" y="${formatNumber(y + 4, 2)}" text-anchor="end" font-size="10" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(formatNumber(tick, 1))}</text>`
    ].join('');
  }).join('');

  const targetMarkup = targetLines
    .filter((line) => isFiniteNumber(line.value))
    .map((line) => {
      const y = yAt(line.value);
      return [
        `<line x1="${margin.left}" y1="${formatNumber(y, 2)}" x2="${width - margin.right}" y2="${formatNumber(y, 2)}" stroke="${escapeAttr(line.color)}" stroke-width="1.5" stroke-dasharray="${escapeAttr(line.dash)}" />`,
        line.label ? `<text x="${width - margin.right}" y="${formatNumber(y - 6, 2)}" text-anchor="end" font-size="10" fill="${escapeAttr(line.color)}">${escapeHtml(line.label)}</text>` : ''
      ].join('');
    }).join('');

  const seriesMarkup = seriesList.map((series) => {
    const aligned = xValues.map((x) => series.pointByX.get(x) || { x, label: String(x), value: null });
    const paths = lineSegments(aligned, xAt, yAt)
      .map((segment) => `<path d="${pathFromSegment(segment)}" fill="none" stroke="${escapeAttr(series.color)}" stroke-width="${series.width}" stroke-linecap="round" stroke-linejoin="round" ${series.dash ? `stroke-dasharray="${escapeAttr(series.dash)}"` : ''} />`)
      .join('');

    const markers = aligned
      .map((point, index) => {
        if (!isFiniteNumber(point.value)) {
          return '';
        }
        const x = xAt(index);
        const y = yAt(point.value);
        const tooltip = `${series.name ? `${series.name} ` : ''}${point.label}: ${formatter(point.value)}`;
        return [
          `<circle cx="${formatNumber(x, 2)}" cy="${formatNumber(y, 2)}" r="3.2" fill="${escapeAttr(series.color)}" stroke="#ffffff" stroke-width="1.5" />`,
          `<circle cx="${formatNumber(x, 2)}" cy="${formatNumber(y, 2)}" r="14" fill="transparent" stroke="transparent" tabindex="0" role="button" data-tooltip="${escapeAttr(tooltip)}" data-point-x="${formatNumber(x, 2)}" data-point-y="${formatNumber(y, 2)}" />`
        ].join('');
      })
      .join('');

    return `${paths}${markers}`;
  }).join('');

  const xLabels = xValues.map((x, index) => {
    const shouldShow = xValues.length <= 6 || index === 0 || index === xValues.length - 1 || index % Math.ceil(xValues.length / 4) === 0;
    if (!shouldShow) {
      return '';
    }
    const label = String(x).slice(5) || String(x);
    return `<text x="${formatNumber(xAt(index), 2)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(label)}</text>`;
  }).join('');

  const title = options.title
    ? `<text x="${margin.left}" y="14" font-size="12" font-weight="700" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(options.title)}</text>`
    : '';

  return [
    `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeAttr(options.title || '折れ線グラフ')}" style="display:block;height:auto;max-width:100%;overflow:visible;touch-action:manipulation;">`,
    title,
    grid,
    `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="${DEFAULT_AXIS_COLOR}" stroke-width="1" />`,
    `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="${DEFAULT_AXIS_COLOR}" stroke-width="1" />`,
    targetMarkup,
    seriesMarkup,
    xLabels,
    '<g data-chart-tooltip visibility="hidden">',
    '<rect x="0" y="0" width="120" height="30" rx="6" fill="#0f172a" opacity="0.92" />',
    '<text x="0" y="0" text-anchor="middle" font-size="11" fill="#ffffff"></text>',
    '</g>',
    '</svg>'
  ].join('');
}

/**
 * 折れ線グラフをDOMに描画し、タップ用ツールチップを有効化する。
 * @param {Element|string} container 描画先要素またはセレクタ。
 * @param {object} options 描画設定。
 * @returns {SVGElement} 描画したSVG要素。
 */
export function renderLineChart(container, options = {}) {
  ensureBrowser();
  const element = resolveContainer(container);
  if (!element) {
    throw new Error('描画先要素が見つかりません');
  }
  element.innerHTML = createLineChartSvg(options);
  const svg = element.querySelector('svg');
  attachLineTooltip(svg);
  return svg;
}

/**
 * 棒グラフSVG文字列を生成する。水分の時間帯別表示を想定する。
 * @param {{data:Array<{label:string, value:number}>, width?:number, height?:number, unit?:string, title?:string, max?:number, barColor?:string}} options 描画設定。
 * @returns {string} SVG文字列。
 */
export function createBarChartSvg(options = {}) {
  const width = options.width || BASE_WIDTH;
  const height = options.height || BAR_HEIGHT;
  const margin = { top: 22, right: 14, bottom: 34, left: 42 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const data = Array.isArray(options.data) ? options.data : [];
  const values = data.map((item) => item.value).filter(isFiniteNumber);
  const maxValue = Math.max(options.max || 0, ...values, 1);
  const ticks = makeTicks(0, maxValue, options.yTickCount || 4);
  const barArea = data.length ? chartWidth / data.length : chartWidth;
  const barWidth = Math.max(12, barArea * 0.58);
  const color = options.barColor || '#0891b2';
  const unit = options.unit || 'ml';
  const yAt = (value) => margin.top + (maxValue - value) / maxValue * chartHeight;

  const grid = ticks.map((tick) => {
    const y = yAt(tick);
    return [
      `<line x1="${margin.left}" y1="${formatNumber(y, 2)}" x2="${width - margin.right}" y2="${formatNumber(y, 2)}" stroke="${DEFAULT_GRID_COLOR}" stroke-width="1" />`,
      `<text x="${margin.left - 8}" y="${formatNumber(y + 4, 2)}" text-anchor="end" font-size="10" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(formatNumber(tick, 0))}</text>`
    ].join('');
  }).join('');

  const bars = data.map((item, index) => {
    const value = isFiniteNumber(item.value) ? item.value : 0;
    const x = margin.left + barArea * index + (barArea - barWidth) / 2;
    const y = yAt(value);
    const h = Math.max(0, height - margin.bottom - y);
    const label = String(item.label ?? '');
    return [
      `<rect x="${formatNumber(x, 2)}" y="${formatNumber(y, 2)}" width="${formatNumber(barWidth, 2)}" height="${formatNumber(h, 2)}" rx="4" fill="${escapeAttr(color)}" />`,
      value > 0 ? `<text x="${formatNumber(x + barWidth / 2, 2)}" y="${formatNumber(Math.max(y - 6, margin.top + 10), 2)}" text-anchor="middle" font-size="10" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(formatNumber(value, 0))}</text>` : '',
      `<text x="${formatNumber(x + barWidth / 2, 2)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(label)}</text>`
    ].join('');
  }).join('');

  const title = options.title
    ? `<text x="${margin.left}" y="14" font-size="12" font-weight="700" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(options.title)}</text>`
    : '';

  return [
    `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeAttr(options.title || '棒グラフ')}" style="display:block;height:auto;max-width:100%;overflow:visible;">`,
    title,
    grid,
    `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="${DEFAULT_AXIS_COLOR}" stroke-width="1" />`,
    `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="${DEFAULT_AXIS_COLOR}" stroke-width="1" />`,
    bars,
    `<text x="${width - margin.right}" y="14" text-anchor="end" font-size="10" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(unit)}</text>`,
    '</svg>'
  ].join('');
}

/**
 * 棒グラフをDOMに描画する。
 * @param {Element|string} container 描画先要素またはセレクタ。
 * @param {object} options 描画設定。
 * @returns {SVGElement} 描画したSVG要素。
 */
export function renderBarChart(container, options = {}) {
  ensureBrowser();
  const element = resolveContainer(container);
  if (!element) {
    throw new Error('描画先要素が見つかりません');
  }
  element.innerHTML = createBarChartSvg(options);
  return element.querySelector('svg');
}

function ringStrokeOffset(progress, radius) {
  const circumference = 2 * Math.PI * radius;
  return {
    circumference,
    offset: circumference * (1 - progress)
  };
}

/**
 * リング型の進捗円SVG文字列を生成する。
 * @param {{value:number, goal:number, size?:number, label?:string, unit?:string, color?:string, trackColor?:string}} options 描画設定。
 * @returns {string} SVG文字列。
 */
export function createRingChartSvg(options = {}) {
  const size = options.size || RING_SIZE;
  const center = size / 2;
  const radius = center - 14;
  const value = isFiniteNumber(options.value) ? options.value : 0;
  const goal = isFiniteNumber(options.goal) && options.goal > 0 ? options.goal : 0;
  const progress = goal > 0 ? clamp(value / goal, 0, 1) : 0;
  const percent = goal > 0 ? Math.round(value / goal * 100) : 0;
  const stroke = ringStrokeOffset(progress, radius);
  const color = options.color || '#2563eb';
  const trackColor = options.trackColor || '#e2e8f0';
  const unit = options.unit || '';
  const label = options.label || `${formatNumber(value, 0)} / ${formatNumber(goal, 0)}${unit}`;

  return [
    `<svg viewBox="0 0 ${size} ${size}" width="100%" role="img" aria-label="${escapeAttr(options.title || '進捗円')}" style="display:block;height:auto;max-width:100%;overflow:visible;">`,
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${escapeAttr(trackColor)}" stroke-width="14" />`,
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${escapeAttr(color)}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${formatNumber(stroke.circumference, 2)}" stroke-dashoffset="${formatNumber(stroke.offset, 2)}" transform="rotate(-90 ${center} ${center})" />`,
    `<text x="${center}" y="${center - 4}" text-anchor="middle" font-size="28" font-weight="700" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(percent)}%</text>`,
    `<text x="${center}" y="${center + 22}" text-anchor="middle" font-size="12" fill="${DEFAULT_TEXT_COLOR}">${escapeHtml(label)}</text>`,
    '</svg>'
  ].join('');
}

/**
 * リング型の進捗円をDOMに描画する。
 * @param {Element|string} container 描画先要素またはセレクタ。
 * @param {object} options 描画設定。
 * @returns {SVGElement} 描画したSVG要素。
 */
export function renderRingChart(container, options = {}) {
  ensureBrowser();
  const element = resolveContainer(container);
  if (!element) {
    throw new Error('描画先要素が見つかりません');
  }
  element.innerHTML = createRingChartSvg(options);
  return element.querySelector('svg');
}

/**
 * 水分記録を3時間区切りの棒グラフデータへ集計する。
 * @param {Array<{time:string, ml:number}>} waters 水分記録。
 * @returns {Array<{label:string, value:number}>} 3時間帯別の水分量。
 */
export function bucketWatersBy3Hours(waters) {
  const buckets = Array.from({ length: 8 }, (_, index) => ({
    label: `${index * 3}-${index * 3 + 3}`,
    value: 0
  }));

  for (const item of waters || []) {
    const match = String(item.time || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match || !isFiniteNumber(item.ml)) {
      continue;
    }
    const hour = clamp(Number(match[1]), 0, 23);
    const index = Math.floor(hour / 3);
    buckets[index].value += item.ml;
  }

  return buckets;
}

export const lineChart = createLineChartSvg;
export const barChart = createBarChartSvg;
export const ringChart = createRingChartSvg;
export const drawLineChart = renderLineChart;
export const drawBarChart = renderBarChart;
export const drawRingChart = renderRingChart;
