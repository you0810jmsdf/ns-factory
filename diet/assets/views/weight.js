// 体重画面。入力、期間別グラフ、履歴編集・削除を扱う。
import {
  STORES,
  deleteWeight,
  getAll,
  saveWeight
} from './../db.js';
import {
  addDays,
  calculateMovingAverage7
} from './../calc.js';
import { renderLineChart } from './../chart.js';
import {
  WEIGHT_PERIOD_LABELS,
  detectWeightPeriod,
  latestWeightValue as getLatestWeightValue,
  stepWeight
} from './../quick-entry.js';

// 体重として現実的にありうる範囲。範囲外はJS側でこの値に丸め、通知で理由を伝える。
// ⛔ input要素に min / max 属性を付けないこと。ブラウザの標準検証が submit ごと
//    止めてしまい、iPhoneではメッセージも出ず「保存ボタンが効かない」状態になる
//    （2026-08-26 実測。トーストも履歴も出ず、JS例外も無いため原因が分かりにくい）。
// 体重として現実的にありうる範囲。
// ⛔ WEIGHT_MAX を外したり極端に大きくしないこと。誤入力1件でグラフが読めなくなる。
const WEIGHT_MIN = 10;
const WEIGHT_MAX = 300;

const PERIODS = Object.freeze({
  '14d': { label: '2週', days: 14 },
  '30d': { label: '1か月', days: 30 },
  '90d': { label: '3か月', days: 90 },
  all: { label: '全期間', days: null }
});

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

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function formatWeight(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}kg` : '--.-kg';
}

function sortWeights(weights, direction = 'asc') {
  return [...weights].sort((a, b) => {
    const result = String(a.date).localeCompare(String(b.date));
    return direction === 'asc' ? result : -result;
  });
}

function dateList(startDate, endDate) {
  const list = [];
  let cursor = startDate;
  let guard = 0;
  while (cursor && cursor <= endDate && guard < 5000) {
    list.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return list;
}

function rangeForPeriod(weights, periodKey, today) {
  const period = PERIODS[periodKey] || PERIODS['14d'];
  const dates = weights.map((record) => record.date).filter(Boolean).sort();
  if (period.days === null && dates.length) {
    return {
      start: dates[0],
      end: dates[dates.length - 1] > today ? dates[dates.length - 1] : today
    };
  }
  return {
    start: addDays(today, -(period.days || 14) + 1),
    end: today
  };
}

function buildChartSeries(weights, periodKey, today) {
  const sorted = sortWeights(weights);
  const averages = new Map(calculateMovingAverage7(sorted).map((record) => [record.date, record.average]));
  const byDate = new Map(sorted.map((record) => [record.date, record]));
  const range = rangeForPeriod(weights, periodKey, today);
  const days = dateList(range.start, range.end);

  return {
    days,
    series: [
      {
        name: '朝',
        color: '#2563eb',
        points: days.map((date) => ({ date, value: finiteOrNull(byDate.get(date)?.morning) }))
      },
      {
        name: '夜',
        color: '#0891b2',
        dash: '5 4',
        points: days.map((date) => ({ date, value: finiteOrNull(byDate.get(date)?.night) }))
      },
      {
        name: '7日平均',
        color: '#16a34a',
        width: 4,
        points: days.map((date) => ({ date, value: finiteOrNull(averages.get(date)) }))
      }
    ]
  };
}

function setInputValue(form, name, value) {
  form.elements[name].value = value ?? '';
}

function setWeightInputValue(form, name, value) {
  form.elements[name].value = Number.isFinite(value) ? value.toFixed(1) : '';
}

function updatePresetNotice(form, period) {
  const notice = form.querySelector('[data-weight-preset-notice]');
  if (!notice) {
    return;
  }
  notice.textContent = `現在時刻では${WEIGHT_PERIOD_LABELS[period]}の体重を入力します`;
}

function fillForm(form, record, fallbackDate, weights = []) {
  const period = detectWeightPeriod();
  setInputValue(form, 'date', record?.date || fallbackDate);
  if (record) {
    setInputValue(form, 'morning', record.morning);
    setInputValue(form, 'night', record.night);
    if (!Number.isFinite(record[period])) {
      setWeightInputValue(form, period, getLatestWeightValue(weights, period));
    }
  } else {
    setWeightInputValue(form, 'morning', period === 'morning' ? getLatestWeightValue(weights, 'morning') : null);
    setWeightInputValue(form, 'night', period === 'night' ? getLatestWeightValue(weights, 'night') : null);
  }
  setInputValue(form, 'bodyFat', record?.bodyFat);
  setInputValue(form, 'waist', record?.waist);
  setInputValue(form, 'memo', record?.memo || '');
  updatePresetNotice(form, period);
}

function bindWeightSteppers(form) {
  form.querySelectorAll('[data-step-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = form.elements[button.dataset.stepTarget];
      if (!input) {
        return;
      }
      const delta = Number(button.dataset.stepDelta || 0);
      const value = stepWeight(input.value, delta);
      input.value = value.toFixed(1);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

function createForm(ctx, today, weights, onSaved) {
  const card = el('section', 'card stack');
  const title = el('h2', 'card-title', '体重を記録');
  const form = document.createElement('form');
  form.className = 'stack';
  form.innerHTML = `
    <div class="banner banner-success" data-weight-preset-notice></div>
    <label class="field">
      <span class="field-label">日付</span>
      <input class="input" name="date" type="date" required>
    </label>
    <div class="grid-2 grid-2-stepper">
      <label class="field">
        <span class="field-label">朝 kg</span>
        <span class="stepper">
          <button class="stepper-button" type="button" data-step-target="morning" data-step-delta="-0.1" aria-label="朝の体重を0.1kg減らす">−</button>
          <input class="input stepper-input" name="morning" type="number" inputmode="decimal" step="0.1">
          <button class="stepper-button" type="button" data-step-target="morning" data-step-delta="0.1" aria-label="朝の体重を0.1kg増やす">+</button>
        </span>
      </label>
      <label class="field">
        <span class="field-label">夜 kg</span>
        <span class="stepper">
          <button class="stepper-button" type="button" data-step-target="night" data-step-delta="-0.1" aria-label="夜の体重を0.1kg減らす">−</button>
          <input class="input stepper-input" name="night" type="number" inputmode="decimal" step="0.1">
          <button class="stepper-button" type="button" data-step-target="night" data-step-delta="0.1" aria-label="夜の体重を0.1kg増やす">+</button>
        </span>
      </label>
    </div>
    <div class="grid-2">
      <label class="field">
        <span class="field-label">体脂肪率 %</span>
        <input class="input" name="bodyFat" type="number" inputmode="decimal" step="0.1">
      </label>
      <label class="field">
        <span class="field-label">ウエスト cm</span>
        <input class="input" name="waist" type="number" inputmode="decimal" step="0.1">
      </label>
    </div>
    <label class="field">
      <span class="field-label">メモ</span>
      <textarea class="textarea" name="memo"></textarea>
    </label>
    <button class="button button-primary" type="submit">保存</button>
  `;
  bindWeightSteppers(form);
  fillForm(form, weights.find((record) => record.date === today) || null, today, weights);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // ⛔ 上限を外さないこと。体重に 9999 のような誤入力が1件混じると、
    //    グラフの縦軸が自動でその値まで伸び、以後の変化が読めなくなる
    //    （2026-08-26 発見。縦軸は Math.min/max の自動計算）。
    const record = {
      date: form.elements.date.value || today,
      morning: ctx.normalizeNumberInput(form.elements.morning.value, { min: WEIGHT_MIN, max: WEIGHT_MAX }),
      night: ctx.normalizeNumberInput(form.elements.night.value, { min: WEIGHT_MIN, max: WEIGHT_MAX }),
      bodyFat: ctx.normalizeNumberInput(form.elements.bodyFat.value, { min: 0, max: 99.9 }),
      waist: ctx.normalizeNumberInput(form.elements.waist.value, { min: 10, max: 300 }),
      memo: form.elements.memo.value.trim()
    };

    // ⛔ 範囲外を黙って書き換えないこと。押し間違いに気づけないまま記録が残る。
    const adjusted = [
      ['朝', form.elements.morning.value, record.morning],
      ['夜', form.elements.night.value, record.night]
    ].filter(([, typed, saved]) => {
      const n = Number(String(typed).trim());
      return String(typed).trim() !== '' && Number.isFinite(n) && Number.isFinite(saved) && n !== saved;
    });

    await saveWeight(record);
    if (adjusted.length) {
      const [name, typed, saved] = adjusted[0];
      ctx.showToast(`${name}は${WEIGHT_MIN}〜${WEIGHT_MAX}kgで記録します（${typed}→${saved}kg）`, { tone: 'warning' });
    } else {
      ctx.showToast('体重を保存しました', { tone: 'success' });
    }
    await onSaved();
  });
  card.append(title, form);
  return { card, form };
}

function createPeriodTabs(currentPeriod, onChange) {
  const tabs = el('div', 'segmented');
  Object.entries(PERIODS).forEach(([key, period]) => {
    const button = el('button', `segment${key === currentPeriod ? ' is-active' : ''}`, period.label);
    button.type = 'button';
    button.dataset.period = key;
    button.addEventListener('click', () => onChange(key));
    tabs.append(button);
  });
  return tabs;
}

function drawChart(chartBox, weights, period, today, profile) {
  const data = buildChartSeries(weights, period, today);
  renderLineChart(chartBox, {
    title: '体重推移',
    unit: 'kg',
    series: data.series,
    targetValue: Number.isFinite(profile?.targetWeight) ? profile.targetWeight : undefined,
    targetLabel: '目標',
    minYPadding: 1
  });
}

function createHistory(weights, form, ctx, onDeleted) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '履歴'));

  const list = el('div', 'stack');
  if (!weights.length) {
    list.append(el('p', 'muted', 'まだ記録がありません'));
    card.append(list);
    return card;
  }

  sortWeights(weights, 'desc').forEach((record) => {
    const row = el('div', 'banner');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.dataset.date = record.date;

    const body = el('div', 'stack');
    body.append(el('strong', '', record.date));
    body.append(el('span', 'muted', `朝 ${formatWeight(record.morning)} / 夜 ${formatWeight(record.night)}`));
    if (record.memo) {
      body.append(el('span', 'muted', record.memo));
    }

    const deleteButton = el('button', 'button button-danger', '削除');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const ok = await ctx.confirmDialog(`${record.date} の体重記録を削除しますか？`);
      if (!ok) {
        return;
      }
      await deleteWeight(record.date);
      ctx.showToast('体重記録を削除しました', { tone: 'success' });
      await onDeleted();
    });

    row.addEventListener('click', () => {
      fillForm(form, record, todayString(), weights);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fillForm(form, record, todayString(), weights);
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    row.append(body, deleteButton);
    list.append(row);
  });

  card.append(list);
  return card;
}

export async function render(ctx) {
  const today = todayString();
  let weights = await getAll(STORES.weights);
  let selectedPeriod = '30d';

  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  const refresh = async () => {
    weights = await getAll(STORES.weights);
    ctx.navigate('weight');
  };

  const formPart = createForm(ctx, today, weights, refresh);
  stack.append(formPart.card);

  const chartCard = el('section', 'card stack');
  chartCard.append(el('h2', 'card-title', 'グラフ'));
  const chartControls = createPeriodTabs(selectedPeriod, (period) => {
    selectedPeriod = period;
    chartControls.querySelectorAll('.segment').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.period === selectedPeriod);
    });
    drawChart(chartBox, weights, selectedPeriod, today, ctx.profile);
  });
  const chartBox = el('div');
  chartCard.append(chartControls, chartBox);
  stack.append(chartCard);
  drawChart(chartBox, weights, selectedPeriod, today, ctx.profile);

  stack.append(createHistory(weights, formPart.form, ctx, refresh));
  return fragment;
}
