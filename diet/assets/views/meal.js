// 食事画面。当日の4スロット、食品検索、手入力、よく食べたものを扱う。
import {
  STORES,
  addMeal,
  addMyFood,
  deleteMeal,
  getAll
} from './../db.js';
import {
  addDays,
  applyExerciseToTargetCalories,
  calculateBMR,
  calculatePFCTarget,
  calculateTargetCalories,
  calculateTDEE,
  pickDailyWeight,
  summarizeDailyExercises
} from './../calc.js';

const SLOTS = Object.freeze([
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'dinner', label: '夕' },
  { key: 'snack', label: '間食' }
]);

const SLOT_LABELS = Object.freeze(Object.fromEntries(SLOTS.map((slot) => [slot.key, slot.label])));

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

function sum(records, key) {
  return (records || []).reduce((total, record) => total + (Number.isFinite(record?.[key]) ? record[key] : 0), 0);
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

function createBarRow(label, actual, target, unit = '') {
  const row = el('div', 'bar-row');
  row.append(el('span', 'muted', label));
  row.append(createProgress(target > 0 ? actual / target * 100 : 0));
  row.append(el('strong', '', `${Math.round(actual || 0)} / ${Math.round(target || 0)}${unit}`));
  return row;
}

function summarizeMeals(records) {
  return {
    kcal: round(sum(records, 'kcal'), 0),
    p: round(sum(records, 'p'), 1),
    f: round(sum(records, 'f'), 1),
    c: round(sum(records, 'c'), 1)
  };
}

function nutritionLine(summary) {
  return `${Math.round(summary.kcal || 0)} kcal / P ${numberText(summary.p)}g / F ${numberText(summary.f)}g / C ${numberText(summary.c)}g`;
}

function createMealRecordFromFood(food, amount, date, slot) {
  const per = Number.isFinite(food.per) && food.per > 0 ? food.per : 1;
  const factor = Number.isFinite(amount) ? amount / per : 0;
  return {
    date,
    slot,
    name: food.name,
    amount,
    unit: food.unit || 'g',
    kcal: round((food.kcal || 0) * factor, 0),
    p: round((food.p || 0) * factor, 1),
    f: round((food.f || 0) * factor, 1),
    c: round((food.c || 0) * factor, 1),
    foodId: food.source === 'myfood' ? `my:${food.id}` : food.id
  };
}

function unitLabel(food) {
  const per = Number.isFinite(food?.per) ? food.per : 100;
  const unit = food?.unit || 'g';
  if (per === 1 && !['g', 'ml'].includes(unit)) {
    return `1${unit}あたり`;
  }
  return `${Math.round(per)}${unit}あたり`;
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLocaleLowerCase('ja-JP');
}

function normalizeMyFood(record) {
  return {
    ...record,
    source: 'myfood',
    id: record.id,
    kana: record.kana || ''
  };
}

function searchMyFoods(myfoods, query, limit = 8) {
  const text = normalizeSearchText(query);
  return (myfoods || [])
    .map(normalizeMyFood)
    .filter((food) => {
      if (!text) {
        return true;
      }
      return normalizeSearchText(food.name).includes(text) || normalizeSearchText(food.kana).includes(text);
    })
    .slice(0, limit);
}

function createSlotTabs(selectedSlot, onChange) {
  const tabs = el('div', 'segmented');
  SLOTS.forEach((slot) => {
    const button = el('button', `segment${slot.key === selectedSlot ? ' is-active' : ''}`, slot.label);
    button.type = 'button';
    button.dataset.slot = slot.key;
    button.addEventListener('click', () => onChange(slot.key));
    tabs.append(button);
  });
  return tabs;
}

function createTotalCard(todayMeals, pfcTarget) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '当日合計'));
  const summary = summarizeMeals(todayMeals);
  card.append(el('p', 'number-large', `${Math.round(summary.kcal)} kcal`));
  card.append(el('p', 'muted', `P ${numberText(summary.p)}g / F ${numberText(summary.f)}g / C ${numberText(summary.c)}g`));

  const bars = el('div', 'bar-list');
  bars.append(createBarRow('P', summary.p, pfcTarget.p || 0, 'g'));
  bars.append(createBarRow('F', summary.f, pfcTarget.f || 0, 'g'));
  bars.append(createBarRow('C', summary.c, pfcTarget.c || 0, 'g'));
  card.append(bars);

  if (pfcTarget.note) {
    card.append(el('p', 'muted', pfcTarget.note));
  }
  return card;
}

function createSlotSummary(todayMeals) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'スロット小計'));
  SLOTS.forEach((slot) => {
    const row = el('div', 'banner');
    const summary = summarizeMeals(todayMeals.filter((record) => record.slot === slot.key));
    row.append(el('strong', '', slot.label));
    row.append(el('span', 'muted', nutritionLine(summary)));
    card.append(row);
  });
  return card;
}

function createMealRow(record, ctx, onDeleted) {
  const row = el('div', 'banner');
  const body = el('div', 'stack');
  body.append(el('strong', '', record.name || '名称未設定'));
  body.append(el('span', 'muted', `${numberText(record.amount)}${record.unit || ''} / ${Math.round(record.kcal || 0)} kcal`));
  body.append(el('span', 'muted', `P ${numberText(record.p)}g / F ${numberText(record.f)}g / C ${numberText(record.c)}g`));

  const button = el('button', 'button button-danger', '削除');
  button.type = 'button';
  button.addEventListener('click', async () => {
    const ok = await ctx.confirmDialog(`${record.name || 'この食事'} を削除しますか？`);
    if (!ok) {
      return;
    }
    await deleteMeal(record.id);
    ctx.showToast('食事を削除しました', { tone: 'success' });
    await onDeleted();
  });

  row.append(body, button);
  return row;
}

function createSelectedSlotCard(ctx, todayMeals, selectedSlot, onAdd, onDeleted) {
  const card = el('section', 'card stack');
  const title = el('h2', 'card-title', `${SLOT_LABELS[selectedSlot]}の食事`);
  const addButton = el('button', 'button button-primary', '＋追加');
  addButton.type = 'button';
  addButton.addEventListener('click', onAdd);
  card.append(title, addButton);

  const selectedMeals = todayMeals.filter((record) => record.slot === selectedSlot);
  const summary = summarizeMeals(selectedMeals);
  card.append(el('p', 'muted', nutritionLine(summary)));

  const list = el('div', 'stack');
  if (!selectedMeals.length) {
    list.append(el('p', 'muted', 'まだ記録がありません'));
  } else {
    selectedMeals
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
      .forEach((record) => list.append(createMealRow(record, ctx, onDeleted)));
  }
  card.append(list);
  return card;
}

function createFrequentItems(allMeals, today, getSelectedSlot, ctx, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'よく食べたもの'));

  const grouped = new Map();
  allMeals.forEach((record) => {
    const key = record.foodId || record.name;
    if (!key || !record.name) {
      return;
    }
    const current = grouped.get(key) || { count: 0, latest: record };
    current.count += 1;
    if (String(record.date).localeCompare(String(current.latest.date)) >= 0) {
      current.latest = record;
    }
    grouped.set(key, current);
  });

  const items = [...grouped.values()]
    .sort((a, b) => b.count - a.count || String(b.latest.date).localeCompare(String(a.latest.date)))
    .slice(0, 10);

  if (!items.length) {
    card.append(el('p', 'muted', '記録が増えると、ここからワンタップで再追加できます'));
    return card;
  }

  const grid = el('div', 'grid-2');
  items.forEach((item) => {
    const record = item.latest;
    const button = el('button', 'button', record.name);
    button.type = 'button';
    button.addEventListener('click', async () => {
      const { id, ...copy } = record;
      await addMeal({
        ...copy,
        date: today,
        slot: getSelectedSlot()
      });
      ctx.showToast(`${record.name} を追加しました`, { tone: 'success' });
      await onChanged();
    });
    grid.append(button);
  });
  card.append(grid);
  return card;
}

function createYesterdayButton(allMeals, today, ctx, onChanged) {
  const button = el('button', 'button', '昨日と同じ');
  button.type = 'button';
  button.addEventListener('click', async () => {
    const yesterday = addDays(today, -1);
    const records = allMeals.filter((record) => record.date === yesterday);
    if (!records.length) {
      ctx.showToast('昨日の食事記録がありません', { tone: 'warning' });
      return;
    }
    const ok = await ctx.confirmDialog(`${yesterday} の食事 ${records.length}件を今日へコピーしますか？`);
    if (!ok) {
      return;
    }
    await Promise.all(records.map((record) => {
      const { id, ...copy } = record;
      return addMeal({ ...copy, date: today });
    }));
    ctx.showToast('昨日の食事をコピーしました', { tone: 'success' });
    await onChanged();
  });
  return button;
}

function setPickedFood(selectionBox, amountInput, food) {
  selectionBox.replaceChildren();
  if (!food) {
    selectionBox.append(el('p', 'muted', '食品を選択してください'));
    return;
  }
  selectionBox.append(el('strong', '', food.name));
  selectionBox.append(el('span', 'muted', `${Math.round(food.kcal || 0)} kcal / ${unitLabel(food)}`));
  amountInput.value = Number.isFinite(food.per) ? food.per : 100;
  amountInput.nextElementSibling.textContent = food.unit || 'g';
}

function createFoodResultButton(food, onPick) {
  const button = el('button', 'button');
  button.type = 'button';
  const body = el('span', 'stack');
  body.append(el('strong', '', food.name));
  body.append(el('span', 'muted', `${Math.round(food.kcal || 0)} kcal / ${unitLabel(food)}`));
  button.append(body);
  button.addEventListener('click', () => onPick(food));
  return button;
}

function createMealModal(ctx, options) {
  const {
    today,
    getSelectedSlot,
    foodApi,
    myfoods,
    onChanged
  } = options;
  let pickedFood = null;

  const modal = el('div', 'modal');
  modal.id = 'meal-add-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const panel = el('div', 'modal-panel');
  const header = el('div', 'modal-header');
  header.append(el('h2', 'modal-title', '食事を追加'));
  const closeButton = el('button', 'icon-button', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.addEventListener('click', () => ctx.closeModal('meal-add-modal'));
  header.append(closeButton);

  const body = el('div', 'modal-body stack');
  const searchField = document.createElement('label');
  searchField.className = 'field';
  searchField.innerHTML = `
    <span class="field-label">食品検索</span>
    <input class="input" name="search" type="search" autocomplete="off" placeholder="ごはん、たまご など">
  `;

  const resultList = el('div', 'stack');
  const selectionBox = el('div', 'banner');

  const amountForm = document.createElement('form');
  amountForm.className = 'stack';
  amountForm.innerHTML = `
    <label class="field">
      <span class="field-label">数量</span>
      <span class="grid-2">
        <input class="input" name="amount" type="number" inputmode="decimal" step="0.1" min="0.1" required>
        <span class="badge">g</span>
      </span>
    </label>
    <button class="button button-primary" type="submit">追加する</button>
  `;

  const manual = el('section', 'banner stack');
  manual.hidden = true;
  manual.append(el('strong', '', '手入力で追加'));
  const manualForm = document.createElement('form');
  manualForm.className = 'stack';
  manualForm.innerHTML = `
    <label class="field">
      <span class="field-label">食品名</span>
      <input class="input" name="name" required>
    </label>
    <div class="grid-2">
      <label class="field">
        <span class="field-label">量</span>
        <input class="input" name="amount" type="number" inputmode="decimal" step="0.1" min="0.1" required>
      </label>
      <label class="field">
        <span class="field-label">単位</span>
        <input class="input" name="unit" value="g" required>
      </label>
    </div>
    <div class="grid-2">
      <label class="field">
        <span class="field-label">kcal</span>
        <input class="input" name="kcal" type="number" inputmode="decimal" step="1" min="0" required>
      </label>
      <label class="field">
        <span class="field-label">P g</span>
        <input class="input" name="p" type="number" inputmode="decimal" step="0.1" min="0" required>
      </label>
    </div>
    <div class="grid-2">
      <label class="field">
        <span class="field-label">F g</span>
        <input class="input" name="f" type="number" inputmode="decimal" step="0.1" min="0" required>
      </label>
      <label class="field">
        <span class="field-label">C g</span>
        <input class="input" name="c" type="number" inputmode="decimal" step="0.1" min="0" required>
      </label>
    </div>
    <label class="field">
      <span>
        <input name="saveMyFood" type="checkbox">
        マイメニューに保存
      </span>
    </label>
    <button class="button button-primary" type="submit">手入力で追加</button>
  `;
  manual.append(manualForm);

  const renderResults = () => {
    const query = searchField.querySelector('input').value;
    const builtin = foodApi.searchFoods(query, { limit: 10 }).map((food) => ({ ...food, source: 'builtin' }));
    const custom = searchMyFoods(myfoods, query, 10);
    const results = [...custom, ...builtin].slice(0, 12);
    resultList.replaceChildren();
    if (!results.length) {
      resultList.append(el('p', 'muted', '候補がありません'));
      manual.hidden = false;
      return;
    }
    manual.hidden = true;
    results.forEach((food) => resultList.append(createFoodResultButton(food, (selected) => {
      pickedFood = selected;
      setPickedFood(selectionBox, amountForm.elements.amount, selected);
    })));
  };

  searchField.querySelector('input').addEventListener('input', renderResults);
  amountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pickedFood) {
      ctx.showToast('食品を選択してください', { tone: 'warning' });
      return;
    }
    const amount = ctx.normalizeNumberInput(amountForm.elements.amount.value, { min: 0.1 });
    if (!Number.isFinite(amount)) {
      ctx.showToast('数量を入力してください', { tone: 'warning' });
      return;
    }
    await addMeal(createMealRecordFromFood(pickedFood, amount, today, getSelectedSlot()));
    ctx.closeModal('meal-add-modal');
    ctx.showToast('食事を追加しました', { tone: 'success' });
    await onChanged();
  });

  manualForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = manualForm.elements.name.value.trim();
    const amount = ctx.normalizeNumberInput(manualForm.elements.amount.value, { min: 0.1 });
    const unit = manualForm.elements.unit.value.trim() || 'g';
    const record = {
      date: today,
      slot: getSelectedSlot(),
      name,
      amount,
      unit,
      kcal: ctx.normalizeNumberInput(manualForm.elements.kcal.value, { min: 0 }),
      p: ctx.normalizeNumberInput(manualForm.elements.p.value, { min: 0 }),
      f: ctx.normalizeNumberInput(manualForm.elements.f.value, { min: 0 }),
      c: ctx.normalizeNumberInput(manualForm.elements.c.value, { min: 0 }),
      foodId: null
    };
    if (!name || !Number.isFinite(amount) || !Number.isFinite(record.kcal)) {
      ctx.showToast('食品名・量・kcalを入力してください', { tone: 'warning' });
      return;
    }
    await addMeal(record);
    if (manualForm.elements.saveMyFood.checked) {
      await addMyFood({
        name,
        unit,
        per: amount,
        kcal: record.kcal,
        p: record.p || 0,
        f: record.f || 0,
        c: record.c || 0
      });
    }
    ctx.closeModal('meal-add-modal');
    ctx.showToast('食事を追加しました', { tone: 'success' });
    await onChanged();
  });

  setPickedFood(selectionBox, amountForm.elements.amount, null);
  renderResults();
  body.append(searchField, resultList, selectionBox, amountForm, manual);
  panel.append(header, body);
  modal.append(panel);
  return modal;
}

function calculateMealTargets(profile, weights, exercises, today) {
  const currentWeight = latestWeightValue(weights) || profile?.targetWeight || null;
  const bmrResult = calculateBMR({
    sex: profile?.sex,
    birth: profile?.birth,
    heightCm: profile?.heightCm,
    weightKg: currentWeight,
    formula: profile?.bmrFormula
  });
  const tdee = calculateTDEE(bmrResult.bmr, profile?.activityLevel);
  const target = calculateTargetCalories({
    currentWeightKg: currentWeight,
    targetWeightKg: profile?.targetWeight,
    targetDate: profile?.targetDate,
    tdee,
    bmr: bmrResult.bmr,
    today
  });
  const exerciseSummary = summarizeDailyExercises(exercises, { date: today, weightKg: currentWeight });
  const targetWithExercise = applyExerciseToTargetCalories(target, profile, exerciseSummary.totalAddedKcal);
  return calculatePFCTarget({
    targetKcal: targetWithExercise.targetKcal || 0,
    weightKg: currentWeight || 0
  });
}

export async function render(ctx) {
  const foodApi = await import('./../foods.js');
  const today = todayString();
  const [allMeals, myfoods, weights, exercises] = await Promise.all([
    getAll(STORES.meals),
    getAll(STORES.myfoods),
    getAll(STORES.weights),
    getAll(STORES.exercises)
  ]);

  let selectedSlot = 'breakfast';
  const todayMeals = allMeals.filter((record) => record.date === today);
  const pfcTarget = calculateMealTargets(ctx.profile, weights, exercises, today);

  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  const refresh = async () => {
    ctx.navigate('meal');
  };
  const getSelectedSlot = () => selectedSlot;

  stack.append(createTotalCard(todayMeals, pfcTarget));
  stack.append(createSlotSummary(todayMeals));

  const actionCard = el('section', 'card stack');
  actionCard.append(el('h2', 'card-title', '追加ショートカット'));
  actionCard.append(createYesterdayButton(allMeals, today, ctx, refresh));
  stack.append(actionCard);

  const tabsHolder = el('div');
  const slotHolder = el('div');
  const redrawSlot = () => {
    tabsHolder.replaceChildren(createSlotTabs(selectedSlot, (slot) => {
      selectedSlot = slot;
      redrawSlot();
    }));
    slotHolder.replaceChildren(createSelectedSlotCard(ctx, todayMeals, selectedSlot, () => {
      ctx.openModal('meal-add-modal');
    }, refresh));
  };
  redrawSlot();

  stack.append(tabsHolder, slotHolder);
  stack.append(createFrequentItems(allMeals, today, getSelectedSlot, ctx, refresh));
  stack.append(createMealModal(ctx, {
    today,
    getSelectedSlot,
    foodApi,
    myfoods,
    onChanged: refresh
  }));

  return fragment;
}
