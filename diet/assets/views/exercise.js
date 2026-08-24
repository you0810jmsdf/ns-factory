// 運動画面。記録内容の自由記述、履歴、マイルーティンを扱う。
import {
  STORES,
  addExercise,
  addMyRoutine,
  deleteExercise,
  deleteMyRoutine,
  getAll,
  updateExercise
} from './../db.js';
import {
  addDays,
  calculateExerciseAddedKcal,
  calculateExerciseStreak,
  calculateExerciseTotalKcal,
  pickDailyWeight,
  summarizeDailyExercises,
  summarizeRecent7DayExercises
} from './../calc.js';
import {
  recordRoutineEntries,
  showUndoToast,
  undoExercises
} from './../quick-entry.js';

const CATEGORIES = Object.freeze([
  { key: 'stretch', label: 'ストレッチ' },
  { key: 'yoga', label: 'ヨガ' },
  { key: 'walk', label: 'ウォーキング' },
  { key: 'run', label: 'ランニング' },
  { key: 'strength', label: '筋トレ' },
  { key: 'bike', label: '自転車' },
  { key: 'swim', label: '水泳' },
  { key: 'daily', label: '生活活動' },
  { key: 'other', label: 'その他' }
]);

const CATEGORY_LABELS = Object.freeze(Object.fromEntries(CATEGORIES.map((cat) => [cat.key, cat.label])));
const QUICK_MINUTES = Object.freeze([5, 10, 15, 20, 30, 45, 60]);
const TABS = Object.freeze([
  { key: 'today', label: '今日' },
  { key: 'history', label: '履歴' },
  { key: 'routines', label: 'マイルーティン' }
]);
const INTENSITY_LABELS = Object.freeze({
  easy: 'らくらく',
  normal: 'ふつう',
  hard: 'きつい'
});
const WEEK_GROUPS = Object.freeze([
  { key: 'stretch', label: 'ストレッチ', color: '#2563eb', cats: ['stretch'] },
  { key: 'yoga', label: 'ヨガ', color: '#16a34a', cats: ['yoga'] },
  { key: 'aerobic', label: '有酸素', color: '#0891b2', cats: ['walk', 'run', 'bike', 'swim'] },
  { key: 'strength', label: '筋トレ', color: '#dc2626', cats: ['strength'] },
  { key: 'daily', label: '生活活動', color: '#d97706', cats: ['daily'] },
  { key: 'other', label: 'その他', color: '#7c3aed', cats: ['other'] }
]);
const SVG_NS = 'http' + '://www.w3.org/2000/svg';

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== '') {
    node.textContent = text;
  }
  return node;
}

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function currentTimeString() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function numberText(value, digits = 1, fallback = '--') {
  return Number.isFinite(value) ? value.toFixed(digits) : fallback;
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function latestWeightValue(weights) {
  const record = [...weights]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .find((item) => Number.isFinite(pickDailyWeight(item).value));
  return record ? pickDailyWeight(record).value : null;
}

function createProgress(percent) {
  const progress = el('div', 'progress');
  const bar = el('div', 'progress-bar');
  bar.style.setProperty('--value', `${Math.max(0, Math.min(100, percent || 0))}%`);
  progress.append(bar);
  return progress;
}

function createTabs(selectedTab, onChange) {
  const tabs = el('div', 'segmented');
  TABS.forEach((tab) => {
    const button = el('button', `segment${tab.key === selectedTab ? ' is-active' : ''}`, tab.label);
    button.type = 'button';
    button.dataset.tab = tab.key;
    button.addEventListener('click', () => onChange(tab.key));
    tabs.append(button);
  });
  return tabs;
}

function createField(label, control, help = '') {
  const wrapper = el('label', 'field');
  wrapper.append(el('span', 'field-label', label));
  wrapper.append(control);
  if (help) {
    wrapper.append(el('span', 'muted', help));
  }
  return wrapper;
}

function createInput(name, type = 'text', options = {}) {
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  input.className = type === 'textarea' ? 'textarea' : 'input';
  input.name = name;
  if (type !== 'textarea') {
    input.type = type;
  }
  Object.entries(options).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      input.setAttribute(key, String(value));
    }
  });
  return input;
}

function createSelect(name, items, value = '') {
  const select = document.createElement('select');
  select.className = 'select';
  select.name = name;
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  });
  select.value = value;
  return select;
}

function weightForCalc(currentWeight, profile) {
  return Number.isFinite(currentWeight) ? currentWeight : profile?.targetWeight;
}

function addedKcalForRecord(record, currentWeight, profile) {
  if (Number.isFinite(record?.kcal)) {
    return record.kcal;
  }
  return calculateExerciseAddedKcal({
    mets: record?.mets,
    minutes: record?.minutes,
    weightKg: weightForCalc(currentWeight, profile)
  }) ?? 0;
}

function createKcalBadge(profile, kcal) {
  const label = profile?.countExerciseInBalance ? '収支に加算中' : '参考値';
  return el('span', profile?.countExerciseInBalance ? 'badge badge-warning' : 'badge', `${numberText(kcal)} kcal ${label}`);
}

function categorySummaryLine(summary) {
  return CATEGORIES
    .map((cat) => `${cat.label} ${summary.byCategory[cat.key]?.minutes || 0}分`)
    .join(' / ');
}

function createExerciseRow(record, ctx, onEdit, onDeleted, currentWeight) {
  const row = el('div', 'banner');
  const body = el('div', 'stack');
  body.append(el('strong', '', record.name || '内容未入力'));
  body.append(el('span', 'muted', `${record.date} ${record.time || '--:--'} / ${CATEGORY_LABELS[record.cat] || 'その他'} / ${Math.round(record.minutes || 0)}分`));
  body.append(el('span', 'muted', `METs ${numberText(record.mets)} / 上乗せ ${numberText(addedKcalForRecord(record, currentWeight, ctx.profile))} kcal`));
  if (record.intensity) {
    body.append(el('span', 'muted', `体感強度: ${INTENSITY_LABELS[record.intensity] || record.intensity}`));
  }
  if (record.cat === 'strength' && (Number.isFinite(record.sets) || Number.isFinite(record.reps) || Number.isFinite(record.weightKg))) {
    body.append(el('span', 'muted', `筋トレ: ${numberText(record.sets, 0)}セット / ${numberText(record.reps, 0)}回 / ${numberText(record.weightKg)}kg`));
  }
  if (record.memo) {
    body.append(el('span', 'muted', record.memo));
  }

  const actions = el('div', 'grid-2');
  const editButton = el('button', 'button', '編集');
  editButton.type = 'button';
  editButton.addEventListener('click', () => onEdit(record));
  const deleteButton = el('button', 'button button-danger', '削除');
  deleteButton.type = 'button';
  deleteButton.addEventListener('click', async () => {
    const ok = await ctx.confirmDialog(`${record.name || 'この運動'} を削除しますか？`);
    if (!ok) {
      return;
    }
    await deleteExercise(record.id);
    ctx.showToast('運動記録を削除しました', { tone: 'success' });
    await onDeleted();
  });
  actions.append(editButton, deleteButton);
  row.append(body, actions);
  return row;
}

function copyExercisePayload(record, date, currentWeight, profile) {
  const { id, ...copy } = record;
  const kcal = calculateExerciseAddedKcal({
    mets: copy.mets,
    minutes: copy.minutes,
    weightKg: weightForCalc(currentWeight, profile)
  });
  return {
    ...copy,
    date,
    kcal: kcal ?? copy.kcal ?? null
  };
}

async function copyYesterdayExercises(allExercises, today, currentWeight, ctx, onChanged) {
  const yesterday = addDays(today, -1);
  const records = allExercises.filter((record) => record.date === yesterday);
  if (!records.length) {
    ctx.showToast('昨日の運動記録がありません', { tone: 'warning' });
    return;
  }
  const ok = await ctx.confirmDialog(`${yesterday} の運動 ${records.length}件を今日へコピーしますか？`);
  if (!ok) {
    return;
  }
  await Promise.all(records.map((record) => addExercise(copyExercisePayload(record, today, currentWeight, ctx.profile))));
  ctx.showToast('昨日の運動をコピーしました', { tone: 'success' });
  await onChanged();
}

function createTodayTab(ctx, options) {
  const {
    allExercises,
    todayExercises,
    currentWeight,
    today,
    onAdd,
    onEdit,
    onChanged
  } = options;
  const stack = el('div', 'stack');
  const daily = summarizeDailyExercises(todayExercises, {
    date: today,
    weightKg: weightForCalc(currentWeight, ctx.profile)
  });
  const weekStart = addDays(today, -6);
  const weekly = summarizeRecent7DayExercises(
    allExercises.filter((record) => record.date >= weekStart && record.date <= today),
    { anchorDate: today, goalMinutes: ctx.profile?.exerciseGoalMinPerWeek || 150 }
  );

  const summary = el('section', 'card stack');
  summary.append(el('h2', 'card-title', '今日の運動'));
  summary.append(el('p', 'number-large', `${daily.totalMinutes} 分`));
  summary.append(createKcalBadge(ctx.profile, daily.totalAddedKcal));
  summary.append(el('p', 'muted', categorySummaryLine(daily)));
  const addButton = el('button', 'button button-primary', '＋運動を記録');
  addButton.type = 'button';
  addButton.addEventListener('click', onAdd);
  const copyButton = el('button', 'button', '昨日と同じ');
  copyButton.type = 'button';
  copyButton.addEventListener('click', () => copyYesterdayExercises(allExercises, today, currentWeight, ctx, onChanged));
  const actions = el('div', 'grid-2');
  actions.append(addButton, copyButton);
  summary.append(actions);
  summary.append(el('p', 'muted', `今週 ${weekly.totalMinutes}分 / ${weekly.goalMinutes}分`));
  summary.append(createProgress(weekly.achievementRate));
  summary.append(el('p', 'muted', `${calculateExerciseStreak(allExercises, today)}日連続で運動記録中`));
  stack.append(summary);

  const listCard = el('section', 'card stack');
  listCard.append(el('h2', 'card-title', '今日の内容'));
  if (!todayExercises.length) {
    listCard.append(el('p', 'muted', 'まだ記録がありません'));
  } else {
    todayExercises
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
      .forEach((record) => listCard.append(createExerciseRow(record, ctx, onEdit, onChanged, currentWeight)));
  }
  stack.append(listCard);
  return stack;
}

function weekWindows(today) {
  return [3, 2, 1, 0].map((offset) => {
    const end = addDays(today, -offset * 7);
    const start = addDays(end, -6);
    return { start, end, label: `${start.slice(5)}〜${end.slice(5)}` };
  });
}

function weeklyGroupMinutes(records, today) {
  return weekWindows(today).map((week) => {
    const values = Object.fromEntries(WEEK_GROUPS.map((group) => [group.key, 0]));
    records
      .filter((record) => record.date >= week.start && record.date <= week.end)
      .forEach((record) => {
        const group = WEEK_GROUPS.find((item) => item.cats.includes(record.cat)) || WEEK_GROUPS[WEEK_GROUPS.length - 1];
        values[group.key] += Number.isFinite(record.minutes) ? record.minutes : 0;
      });
    return { ...week, values, total: Object.values(values).reduce((sum, value) => sum + value, 0) };
  });
}

function renderStackedWeekChart(container, records, today) {
  container.replaceChildren();
  const data = weeklyGroupMinutes(records, today);
  const max = Math.max(1, ...data.map((week) => week.total));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 375 220');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', 'auto');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '直近4週のカテゴリ別運動時間');

  data.forEach((week, index) => {
    const barWidth = 44;
    const x = 56 + index * 76;
    const baseY = 166;
    let cursorY = baseY;
    WEEK_GROUPS.forEach((group) => {
      const value = week.values[group.key] || 0;
      const height = value / max * 120;
      if (height <= 0) {
        return;
      }
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(cursorY - height));
      rect.setAttribute('width', String(barWidth));
      rect.setAttribute('height', String(height));
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', group.color);
      svg.append(rect);
      cursorY -= height;
    });

    const total = document.createElementNS(SVG_NS, 'text');
    total.setAttribute('x', String(x + barWidth / 2));
    total.setAttribute('y', '32');
    total.setAttribute('text-anchor', 'middle');
    total.setAttribute('font-size', '11');
    total.setAttribute('fill', '#334155');
    total.textContent = `${Math.round(week.total)}分`;
    svg.append(total);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(x + barWidth / 2));
    label.setAttribute('y', '190');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.setAttribute('fill', '#334155');
    label.textContent = week.label;
    svg.append(label);
  });

  const axis = document.createElementNS(SVG_NS, 'line');
  axis.setAttribute('x1', '36');
  axis.setAttribute('x2', '344');
  axis.setAttribute('y1', '166');
  axis.setAttribute('y2', '166');
  axis.setAttribute('stroke', '#94a3b8');
  svg.append(axis);
  container.append(svg);

  const legend = el('div', 'grid-2');
  WEEK_GROUPS.forEach((group) => {
    const item = el('span', 'muted', group.label);
    item.style.borderLeft = `12px solid ${group.color}`;
    item.style.paddingLeft = '6px';
    legend.append(item);
  });
  container.append(legend);
}

function createHeatmap(records, today) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '直近90日'));
  const minutesByDate = new Map();
  records.forEach((record) => {
    minutesByDate.set(record.date, (minutesByDate.get(record.date) || 0) + (Number.isFinite(record.minutes) ? record.minutes : 0));
  });

  const grid = el('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(13, minmax(0, 1fr))';
  grid.style.gap = '4px';
  for (let i = 89; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const minutes = minutesByDate.get(date) || 0;
    const cell = el('div');
    cell.title = `${date} ${Math.round(minutes)}分`;
    cell.setAttribute('aria-label', cell.title);
    cell.style.aspectRatio = '1';
    cell.style.borderRadius = '4px';
    cell.style.border = '1px solid var(--color-border)';
    if (minutes >= 60) {
      cell.style.background = 'var(--color-success)';
    } else if (minutes >= 30) {
      cell.style.background = '#86efac';
    } else if (minutes > 0) {
      cell.style.background = '#dcfce7';
    } else {
      cell.style.background = 'var(--color-surface-raised)';
    }
    grid.append(cell);
  }
  card.append(grid);
  return card;
}

function createHistoryTab(ctx, options) {
  const {
    allExercises,
    currentWeight,
    today,
    onEdit,
    onChanged
  } = options;
  const stack = el('div', 'stack');
  const summary = el('section', 'card stack');
  summary.append(el('h2', 'card-title', '週別サマリー'));
  const chart = el('div');
  renderStackedWeekChart(chart, allExercises, today);
  summary.append(chart);
  stack.append(summary);
  stack.append(createHeatmap(allExercises, today));

  const history = el('section', 'card stack');
  history.append(el('h2', 'card-title', '履歴'));
  if (!allExercises.length) {
    history.append(el('p', 'muted', 'まだ記録がありません'));
  } else {
    [...allExercises]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.time || '').localeCompare(String(a.time || '')))
      .forEach((record) => history.append(createExerciseRow(record, ctx, onEdit, onChanged, currentWeight)));
  }
  stack.append(history);
  return stack;
}

function createExerciseResultButton(record, onPick) {
  const button = el('button', 'button');
  button.type = 'button';
  const body = el('span', 'stack');
  body.append(el('strong', '', record.name));
  body.append(el('span', 'muted', `${CATEGORY_LABELS[record.cat] || 'その他'} / METs ${numberText(record.mets)}`));
  button.append(body);
  button.addEventListener('click', () => onPick(record));
  return button;
}

function createExerciseModal(ctx, options) {
  const {
    today,
    exerciseApi,
    currentWeight,
    onChanged
  } = options;
  let selectedExercise = null;
  let editingRecord = null;

  const modal = el('div', 'modal');
  modal.id = 'exercise-edit-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const panel = el('div', 'modal-panel');
  const header = el('div', 'modal-header');
  const title = el('h2', 'modal-title', '運動を記録');
  const closeButton = el('button', 'icon-button', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.addEventListener('click', () => ctx.closeModal('exercise-edit-modal'));
  header.append(title, closeButton);

  const form = document.createElement('form');
  form.className = 'modal-body stack';

  const dateInput = createInput('date', 'date', { required: '' });
  const timeInput = createInput('time', 'time', { required: '' });
  const dateTime = el('div', 'grid-2');
  dateTime.append(createField('日付', dateInput), createField('時刻', timeInput));

  const categorySelect = createSelect('cat', CATEGORIES.map((cat) => ({ value: cat.key, label: cat.label })), 'stretch');
  const searchInput = createInput('search', 'search', { autocomplete: 'off', placeholder: 'ストレッチ、ヨガ など' });
  const results = el('div', 'stack');
  const nameInput = createInput('name', 'textarea', { required: '' });
  const minutesInput = createInput('minutes', 'number', { inputmode: 'decimal', step: '1', min: '1', required: '' });
  const metsInput = createInput('mets', 'number', { inputmode: 'decimal', step: '0.1', min: '1', max: '15', required: '' });
  const intensitySelect = createSelect('intensity', [
    { value: '', label: '未選択' },
    { value: 'easy', label: 'らくらく' },
    { value: 'normal', label: 'ふつう' },
    { value: 'hard', label: 'きつい' }
  ]);
  const memoInput = createInput('memo', 'textarea');

  const quick = el('div', 'grid-2');
  QUICK_MINUTES.forEach((minutes) => {
    const button = el('button', 'button', `${minutes}分`);
    button.type = 'button';
    button.addEventListener('click', () => {
      minutesInput.value = String(minutes);
      updatePreview();
    });
    quick.append(button);
  });

  const strengthFields = el('div', 'grid-2');
  const setsInput = createInput('sets', 'number', { inputmode: 'decimal', step: '1', min: '0' });
  const repsInput = createInput('reps', 'number', { inputmode: 'decimal', step: '1', min: '0' });
  const weightInput = createInput('weightKg', 'number', { inputmode: 'decimal', step: '0.1', min: '0' });
  strengthFields.append(createField('セット数', setsInput), createField('回数', repsInput), createField('重量 kg', weightInput));

  const preview = el('div', 'banner');
  const submitButton = el('button', 'button button-primary', '保存');
  submitButton.type = 'submit';

  function updateStrengthFields() {
    strengthFields.hidden = categorySelect.value !== 'strength';
  }

  function updatePreview() {
    const mets = ctx.normalizeNumberInput(metsInput.value, { min: 1, max: 15 });
    const minutes = ctx.normalizeNumberInput(minutesInput.value, { min: 0 });
    const weight = weightForCalc(currentWeight, ctx.profile);
    const added = calculateExerciseAddedKcal({ mets, minutes, weightKg: weight });
    const total = calculateExerciseTotalKcal({ mets, minutes, weightKg: weight });
    preview.replaceChildren();
    preview.append(el('strong', '', `METs ${numberText(mets)}`));
    if (Number.isFinite(added)) {
      preview.append(createKcalBadge(ctx.profile, added));
      preview.append(el('span', 'muted', `総消費 ${numberText(total)} kcal`));
    } else {
      preview.append(el('span', 'muted', '体重・METs・時間が揃うと消費kcalを計算します'));
    }
  }

  function pickExercise(exercise) {
    selectedExercise = exercise;
    categorySelect.value = exercise.cat;
    nameInput.value = exercise.name;
    metsInput.value = String(exercise.mets);
    updateStrengthFields();
    updatePreview();
  }

  function renderExerciseResults() {
    const query = searchInput.value;
    const category = categorySelect.value;
    const items = query
      ? exerciseApi.searchExercises(query, { category, limit: 8 })
      : exerciseApi.getExercisesByCategory(category).slice(0, 8);
    results.replaceChildren();
    if (!items.length) {
      results.append(el('p', 'muted', '候補がありません。実施内容とMETsを手入力してください'));
      return;
    }
    items.forEach((item) => results.append(createExerciseResultButton(item, pickExercise)));
  }

  categorySelect.addEventListener('change', () => {
    selectedExercise = null;
    if (categorySelect.value === 'other' && !metsInput.value) {
      metsInput.value = '3.0';
    }
    updateStrengthFields();
    renderExerciseResults();
    updatePreview();
  });
  searchInput.addEventListener('input', renderExerciseResults);
  [nameInput, minutesInput, metsInput, timeInput, intensitySelect, memoInput, setsInput, repsInput, weightInput].forEach((control) => {
    control.addEventListener('input', updatePreview);
  });

  form.append(
    dateTime,
    createField('カテゴリ', categorySelect),
    createField('種目DBから選択', searchInput),
    results,
    createField('実施内容', nameInput),
    createField('時間', minutesInput),
    quick,
    createField('METs', metsInput, 'わからなければ 3.0（歩行程度）を目安に。1.0〜15.0で入力してください'),
    preview,
    createField('体感強度', intensitySelect),
    createField('メモ', memoInput),
    strengthFields,
    submitButton
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const minutes = ctx.normalizeNumberInput(minutesInput.value, { min: 1 });
    const mets = ctx.normalizeNumberInput(metsInput.value, { min: 1, max: 15 });
    if (!name) {
      ctx.showToast('実施内容を入力してください', { tone: 'warning' });
      return;
    }
    if (!Number.isFinite(minutes) || !Number.isFinite(mets)) {
      ctx.showToast('時間とMETsを入力してください', { tone: 'warning' });
      return;
    }
    const kcal = calculateExerciseAddedKcal({
      mets,
      minutes,
      weightKg: weightForCalc(currentWeight, ctx.profile)
    });
    const record = {
      date: dateInput.value || today,
      time: timeInput.value || currentTimeString(),
      cat: categorySelect.value,
      name,
      exId: selectedExercise?.id || null,
      minutes,
      mets,
      kcal,
      sets: categorySelect.value === 'strength' ? ctx.normalizeNumberInput(setsInput.value, { min: 0 }) : null,
      reps: categorySelect.value === 'strength' ? ctx.normalizeNumberInput(repsInput.value, { min: 0 }) : null,
      weightKg: categorySelect.value === 'strength' ? ctx.normalizeNumberInput(weightInput.value, { min: 0 }) : null,
      intensity: intensitySelect.value || null,
      memo: memoInput.value.trim()
    };
    if (editingRecord?.id != null) {
      await updateExercise({ ...record, id: editingRecord.id });
      ctx.showToast('運動記録を更新しました', { tone: 'success' });
    } else {
      await addExercise(record);
      ctx.showToast('運動を記録しました', { tone: 'success' });
    }
    ctx.closeModal('exercise-edit-modal');
    await onChanged();
  });

  function open(record = null) {
    editingRecord = record;
    selectedExercise = record?.exId ? exerciseApi.findExerciseById(record.exId) : null;
    title.textContent = record ? '運動を編集' : '運動を記録';
    dateInput.value = record?.date || today;
    timeInput.value = record?.time || currentTimeString();
    categorySelect.value = record?.cat || selectedExercise?.cat || 'stretch';
    searchInput.value = '';
    nameInput.value = record?.name || selectedExercise?.name || '';
    minutesInput.value = Number.isFinite(record?.minutes) ? String(record.minutes) : '10';
    metsInput.value = Number.isFinite(record?.mets) ? String(record.mets) : (Number.isFinite(selectedExercise?.mets) ? String(selectedExercise.mets) : '3.0');
    intensitySelect.value = record?.intensity || '';
    memoInput.value = record?.memo || '';
    setsInput.value = Number.isFinite(record?.sets) ? String(record.sets) : '';
    repsInput.value = Number.isFinite(record?.reps) ? String(record.reps) : '';
    weightInput.value = Number.isFinite(record?.weightKg) ? String(record.weightKg) : '';
    updateStrengthFields();
    renderExerciseResults();
    updatePreview();
    ctx.openModal('exercise-edit-modal');
  }

  updateStrengthFields();
  renderExerciseResults();
  updatePreview();
  panel.append(header, form);
  modal.append(panel);
  return { modal, open };
}

async function recordRoutineToday(routine, today, currentWeight, ctx, exerciseApi, onChanged) {
  const result = await recordRoutineEntries(routine, {
    date: today,
    time: currentTimeString(),
    currentWeight,
    profile: ctx.profile,
    exerciseApi
  });
  if (!result.ids.length) {
    ctx.showToast('ルーティンに種目がありません', { tone: 'warning' });
    return;
  }
  await onChanged();
  showUndoToast(
    ctx,
    `${routine.name || 'ルーティン'}を記録しました`,
    () => undoExercises(result.ids),
    onChanged
  );
}

function createRoutineList(ctx, routines, today, currentWeight, exerciseApi, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '保存済みルーティン'));
  if (!routines.length) {
    card.append(el('p', 'muted', 'まだルーティンがありません'));
    return card;
  }
  routines
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'))
    .forEach((routine) => {
      const row = el('div', 'banner');
      const body = el('div', 'stack');
      const items = Array.isArray(routine.items) ? routine.items : [];
      body.append(el('strong', '', routine.name || '名称未設定'));
      body.append(el('span', 'muted', `${items.length}種目 / ${Math.round(routine.totalMinutes || 0)}分`));
      body.append(el('span', 'muted', items.map((item) => item.name).filter(Boolean).join('、') || '種目なし'));
      const actions = el('div', 'grid-2');
      const recordButton = el('button', 'button button-primary', '今日に記録');
      recordButton.type = 'button';
      recordButton.addEventListener('click', () => recordRoutineToday(routine, today, currentWeight, ctx, exerciseApi, onChanged));
      const deleteButton = el('button', 'button button-danger', '削除');
      deleteButton.type = 'button';
      deleteButton.addEventListener('click', async () => {
        const ok = await ctx.confirmDialog(`${routine.name || 'このルーティン'} を削除しますか？`);
        if (!ok) {
          return;
        }
        await deleteMyRoutine(routine.id);
        ctx.showToast('ルーティンを削除しました', { tone: 'success' });
        await onChanged();
      });
      actions.append(recordButton, deleteButton);
      row.append(body, actions);
      card.append(row);
    });
  return card;
}

function createRoutineBuilder(ctx, options) {
  const {
    todayExercises,
    exerciseApi,
    onChanged
  } = options;
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'ルーティンを作成'));

  const fromTodayForm = document.createElement('form');
  fromTodayForm.className = 'stack';
  const todayName = createInput('name', 'text', { placeholder: '朝の10分ストレッチ' });
  const fromTodayButton = el('button', 'button', '今日の記録から保存');
  fromTodayButton.type = 'submit';
  fromTodayButton.disabled = !todayExercises.length;
  fromTodayForm.append(createField('ルーティン名', todayName), fromTodayButton);
  fromTodayForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = todayName.value.trim();
    if (!name) {
      ctx.showToast('ルーティン名を入力してください', { tone: 'warning' });
      return;
    }
    if (!todayExercises.length) {
      ctx.showToast('今日の運動記録がありません', { tone: 'warning' });
      return;
    }
    const items = todayExercises.map((record) => ({
      exId: record.exId || null,
      name: record.name,
      minutes: record.minutes,
      mets: record.mets
    }));
    await addMyRoutine({
      name,
      cat: todayExercises[0]?.cat || 'other',
      items,
      totalMinutes: items.reduce((total, item) => total + (Number.isFinite(item.minutes) ? item.minutes : 0), 0)
    });
    ctx.showToast('ルーティンを保存しました', { tone: 'success' });
    await onChanged();
  });
  card.append(fromTodayForm);

  const draft = [];
  let picked = null;
  const builder = document.createElement('form');
  builder.className = 'stack';
  const routineName = createInput('routineName', 'text', { placeholder: '夜の有酸素セット' });
  const category = createSelect('cat', CATEGORIES.map((cat) => ({ value: cat.key, label: cat.label })), 'stretch');
  const search = createInput('search', 'search', { autocomplete: 'off', placeholder: '種目検索' });
  const resultList = el('div', 'stack');
  const itemName = createInput('itemName', 'text', { required: '' });
  const minutes = createInput('minutes', 'number', { inputmode: 'decimal', step: '1', min: '1' });
  const mets = createInput('mets', 'number', { inputmode: 'decimal', step: '0.1', min: '1', max: '15' });
  const draftList = el('div', 'stack');
  const addItem = el('button', 'button', '種目を追加');
  addItem.type = 'button';
  const saveRoutine = el('button', 'button button-primary', 'ルーティンを保存');
  saveRoutine.type = 'submit';

  const renderResults = () => {
    const items = search.value
      ? exerciseApi.searchExercises(search.value, { category: category.value, limit: 6 })
      : exerciseApi.getExercisesByCategory(category.value).slice(0, 6);
    resultList.replaceChildren();
    if (!items.length) {
      resultList.append(el('p', 'muted', '候補がありません'));
      return;
    }
    items.forEach((record) => resultList.append(createExerciseResultButton(record, (selected) => {
      picked = selected;
      category.value = selected.cat;
      itemName.value = selected.name;
      mets.value = String(selected.mets);
    })));
  };

  const renderDraft = () => {
    draftList.replaceChildren();
    if (!draft.length) {
      draftList.append(el('p', 'muted', '追加した種目がここに表示されます'));
      return;
    }
    draft.forEach((item, index) => {
      const row = el('div', 'banner');
      row.append(el('strong', '', item.name));
      row.append(el('span', 'muted', `${Math.round(item.minutes || 0)}分 / METs ${numberText(item.mets)}`));
      const remove = el('button', 'button button-danger', '外す');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        draft.splice(index, 1);
        renderDraft();
      });
      row.append(remove);
      draftList.append(row);
    });
  };

  category.addEventListener('change', () => {
    picked = null;
    renderResults();
  });
  search.addEventListener('input', renderResults);
  addItem.addEventListener('click', () => {
    const name = itemName.value.trim();
    const minuteValue = ctx.normalizeNumberInput(minutes.value, { min: 1 });
    const metsValue = ctx.normalizeNumberInput(mets.value, { min: 1, max: 15 });
    if (!name || !Number.isFinite(minuteValue) || !Number.isFinite(metsValue)) {
      ctx.showToast('種目名・時間・METsを入力してください', { tone: 'warning' });
      return;
    }
    draft.push({
      exId: picked?.id || null,
      name,
      minutes: minuteValue,
      mets: metsValue
    });
    itemName.value = '';
    minutes.value = '';
    mets.value = '';
    picked = null;
    renderDraft();
  });
  builder.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = routineName.value.trim();
    if (!name || !draft.length) {
      ctx.showToast('ルーティン名と種目を入力してください', { tone: 'warning' });
      return;
    }
    await addMyRoutine({
      name,
      cat: category.value,
      items: draft,
      totalMinutes: draft.reduce((total, item) => total + (Number.isFinite(item.minutes) ? item.minutes : 0), 0)
    });
    ctx.showToast('ルーティンを保存しました', { tone: 'success' });
    await onChanged();
  });

  builder.append(
    createField('ルーティン名', routineName),
    createField('基本カテゴリ', category),
    createField('種目DBから選択', search),
    resultList,
    createField('実施内容', itemName),
    createField('時間 分', minutes),
    createField('METs', mets, '手入力時は 1.0〜15.0。わからなければ 3.0 を目安にしてください'),
    addItem,
    draftList,
    saveRoutine
  );
  renderResults();
  renderDraft();
  card.append(builder);
  return card;
}

function createRoutinesTab(ctx, options) {
  const {
    routines,
    todayExercises,
    allExercises,
    currentWeight,
    today,
    exerciseApi,
    onChanged
  } = options;
  const stack = el('div', 'stack');
  const actions = el('section', 'card stack');
  actions.append(el('h2', 'card-title', 'まとめて記録'));
  const copyButton = el('button', 'button', '昨日と同じ');
  copyButton.type = 'button';
  copyButton.addEventListener('click', () => copyYesterdayExercises(allExercises, today, currentWeight, ctx, onChanged));
  actions.append(copyButton);
  stack.append(actions);
  stack.append(createRoutineList(ctx, routines, today, currentWeight, exerciseApi, onChanged));
  stack.append(createRoutineBuilder(ctx, { todayExercises, exerciseApi, onChanged }));
  return stack;
}

export async function render(ctx) {
  const exerciseApi = await import('./../exercises-db.js');
  const today = todayString();
  const [allExercises, routines, weights] = await Promise.all([
    getAll(STORES.exercises),
    getAll(STORES.myroutines),
    getAll(STORES.weights)
  ]);
  const currentWeight = latestWeightValue(weights);
  const todayExercises = allExercises.filter((record) => record.date === today);
  let selectedTab = 'today';

  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  const refresh = async () => {
    ctx.navigate('exercise');
  };
  const formModal = createExerciseModal(ctx, {
    today,
    exerciseApi,
    currentWeight,
    onChanged: refresh
  });

  const tabsHolder = el('div');
  const tabBody = el('div');
  const redraw = () => {
    tabsHolder.replaceChildren(createTabs(selectedTab, (tab) => {
      selectedTab = tab;
      redraw();
    }));
    if (selectedTab === 'history') {
      tabBody.replaceChildren(createHistoryTab(ctx, {
        allExercises,
        currentWeight,
        today,
        onEdit: formModal.open,
        onChanged: refresh
      }));
      return;
    }
    if (selectedTab === 'routines') {
      tabBody.replaceChildren(createRoutinesTab(ctx, {
        routines,
        todayExercises,
        allExercises,
        currentWeight,
        today,
        exerciseApi,
        onChanged: refresh
      }));
      return;
    }
    tabBody.replaceChildren(createTodayTab(ctx, {
      allExercises,
      todayExercises,
      currentWeight,
      today,
      onAdd: () => formModal.open(null),
      onEdit: formModal.open,
      onChanged: refresh
    }));
  };

  redraw();
  stack.append(tabsHolder, tabBody, formModal.modal);
  return fragment;
}
