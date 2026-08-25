// 水分画面。当日の時刻付き記録、時間帯別グラフ、目標リングを扱う。
import {
  STORES,
  addWater,
  deleteWater,
  getAll,
  getWatersByDate
} from './../db.js';
import {
  calculateWaterGoalMl,
  pickDailyWeight
} from './../calc.js';
import {
  bucketWatersBy3Hours,
  renderBarChart,
  renderRingChart
} from './../chart.js';

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

function sumMl(records) {
  return records.reduce((total, record) => total + (Number.isFinite(record.ml) ? record.ml : 0), 0);
}

function latestWeightValue(weights) {
  const record = [...weights]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .find((item) => Number.isFinite(pickDailyWeight(item).value));
  return record ? pickDailyWeight(record).value : null;
}

function createAddCard(ctx, today, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '水分を記録'));

  const form = document.createElement('form');
  form.className = 'stack';
  form.innerHTML = `
    <label class="field">
      <span class="field-label">時刻</span>
      <input class="input" name="time" type="time" required>
    </label>
    <label class="field">
      <span class="field-label">任意量 mL</span>
      <input class="input" name="ml" type="number" inputmode="decimal" step="1" min="1">
    </label>
    <button class="button button-primary" type="submit">任意量を追加</button>
  `;
  form.elements.time.value = currentTimeString();

  const quick = el('div', 'grid-2');
  [200, 350, 500].forEach((ml) => {
    const button = el('button', 'button', `+${ml} mL`);
    button.type = 'button';
    button.addEventListener('click', async () => {
      await addWater({ date: today, time: form.elements.time.value || currentTimeString(), ml });
      ctx.showToast(`${ml}mLを記録しました`, { tone: 'success' });
      await onChanged();
    });
    quick.append(button);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ml = // ⛔ 上限を外さないこと。1回の飲水量に 99999 が入ると達成率の表示が壊れる。
    ctx.normalizeNumberInput(form.elements.ml.value, { min: 1, max: 5000 });
    if (!Number.isFinite(ml)) {
      ctx.showToast('水分量を入力してください', { tone: 'warning' });
      return;
    }
    await addWater({ date: today, time: form.elements.time.value || currentTimeString(), ml });
    ctx.showToast(`${Math.round(ml)}mLを記録しました`, { tone: 'success' });
    await onChanged();
  });

  card.append(quick, form);
  return card;
}

function createSummaryCard(waters, goalMl) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '今日の水分'));
  const total = sumMl(waters);
  const ringBox = el('div');
  renderRingChart(ringBox, {
    value: total,
    goal: goalMl || 0,
    unit: 'mL',
    label: `${Math.round(total)} / ${Math.round(goalMl || 0)}mL`
  });
  card.append(ringBox);
  card.append(el('p', 'number-large', `${Math.round(total)} / ${Math.round(goalMl || 0)} mL`));
  return card;
}

function createChartCard(waters) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '時間帯別'));
  const chartBox = el('div');
  renderBarChart(chartBox, {
    title: '3時間区切り',
    unit: 'mL',
    data: bucketWatersBy3Hours(waters)
  });
  card.append(chartBox);
  return card;
}

function createHistoryCard(waters, ctx, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '履歴'));
  const list = el('div', 'stack');

  if (!waters.length) {
    list.append(el('p', 'muted', 'まだ記録がありません'));
    card.append(list);
    return card;
  }

  [...waters]
    .sort((a, b) => String(b.time).localeCompare(String(a.time)))
    .forEach((record) => {
      const row = el('div', 'banner');
      const body = el('div', 'stack');
      body.append(el('strong', '', record.time || '--:--'));
      body.append(el('span', 'muted', `${Math.round(record.ml || 0)} mL`));

      const button = el('button', 'button button-danger', '削除');
      button.type = 'button';
      button.addEventListener('click', async () => {
        const ok = await ctx.confirmDialog(`${record.time || '--:--'} の水分記録を削除しますか？`);
        if (!ok) {
          return;
        }
        await deleteWater(record.id);
        ctx.showToast('水分記録を削除しました', { tone: 'success' });
        await onChanged();
      });

      row.append(body, button);
      list.append(row);
    });

  card.append(list);
  return card;
}

export async function render(ctx) {
  const today = todayString();
  const [waters, weights] = await Promise.all([
    getWatersByDate(today),
    getAll(STORES.weights)
  ]);
  const weightKg = latestWeightValue(weights);
  const goalMl = calculateWaterGoalMl(weightKg, ctx.profile?.waterGoalMl);

  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  const refresh = async () => {
    ctx.navigate('water');
  };

  stack.append(createSummaryCard(waters, goalMl));
  stack.append(createAddCard(ctx, today, refresh));
  stack.append(createChartCard(waters));
  stack.append(createHistoryCard(waters, ctx, refresh));
  return fragment;
}
