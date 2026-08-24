// ホーム画面。起動速度を守るため食品DB・運動種目DBは読まない。
import {
  STORES,
  addWater,
  getAll,
  getWeight,
  saveWeight
} from './../db.js';
import {
  addDays,
  applyExerciseToTargetCalories,
  calculateBMIResult,
  calculateBMR,
  calculateCalorieBalanceWithExercise,
  calculatePFCTarget,
  calculateTargetCalories,
  calculateTDEE,
  calculateWaterGoalMl,
  compareWeeklyAverages,
  detectPlateau,
  pickDailyWeight,
  summarizeDailyExercises,
  summarizeRecent7DayExercises
} from './../calc.js';
import {
  MEAL_SLOT_LABELS,
  WEIGHT_PERIOD_LABELS,
  addFrequentMeal,
  detectMealSlot,
  detectWeightPeriod,
  frequentMeals,
  latestWeightValue as getLatestWeightValue,
  recordRoutineEntries,
  showUndoToast,
  stepWeight,
  undoExercises,
  undoMeal
} from './../quick-entry.js';

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentTimeString() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function numberText(value, digits = 1, fallback = '未記録') {
  return Number.isFinite(value) ? value.toFixed(digits) : fallback;
}

function sum(records, key) {
  return (records || []).reduce((total, record) => total + (Number.isFinite(record?.[key]) ? record[key] : 0), 0);
}

function latestWeightRecord(weights) {
  return [...weights]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .find((record) => Number.isFinite(pickDailyWeight(record).value)) || null;
}

function earliestWeightValue(weights) {
  const record = [...weights]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .find((item) => Number.isFinite(pickDailyWeight(item).value));
  return record ? pickDailyWeight(record).value : null;
}

function progressPercent(startWeight, currentWeight, targetWeight) {
  if (!Number.isFinite(startWeight) || !Number.isFinite(currentWeight) || !Number.isFinite(targetWeight) || startWeight === targetWeight) {
    return 0;
  }
  const percent = (startWeight - currentWeight) / (startWeight - targetWeight) * 100;
  return Math.max(0, Math.min(100, percent));
}

function createProgress(percent) {
  const progress = el('div', 'progress');
  const bar = el('div', 'progress-bar');
  bar.style.setProperty('--value', `${Math.max(0, Math.min(100, percent))}%`);
  progress.append(bar);
  return progress;
}

function createBarRow(label, actual, target, unit = '') {
  const row = el('div', 'bar-row');
  row.append(el('span', 'muted', label));
  row.append(createProgress(target > 0 ? actual / target * 100 : 0));
  row.append(el('strong', '', `${Math.round(actual)} / ${Math.round(target || 0)}${unit}`));
  return row;
}

function createSetupPrompt(ctx) {
  const wrapper = el('section', 'card stack');
  wrapper.append(el('h2', 'card-title', '初回セットアップ'));
  wrapper.append(el('p', 'muted', 'プロフィールを登録すると、目標体重・摂取目標・水分目安を計算できます。'));
  const button = el('button', 'button button-primary', '設定を開く');
  button.type = 'button';
  button.addEventListener('click', () => ctx.navigate('settings'));
  wrapper.append(button);
  return wrapper;
}

function countRecordStreak(dates, anchorDate) {
  const set = new Set(dates.filter(Boolean));
  let cursor = anchorDate;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function createWeightGoalCard({ currentWeight, targetWeight, startWeight }) {
  const card = el('section', 'card stack');
  const remaining = Number.isFinite(currentWeight) && Number.isFinite(targetWeight)
    ? Math.max(0, currentWeight - targetWeight)
    : null;
  card.append(el('p', 'muted', '目標まであと'));
  card.append(el('p', 'hero-number', Number.isFinite(remaining) ? `${remaining.toFixed(1)} kg` : '--.- kg'));
  card.append(el('p', 'muted', `現在 ${numberText(currentWeight)}kg → 目標 ${numberText(targetWeight)}kg`));
  card.append(createProgress(progressPercent(startWeight, currentWeight, targetWeight)));
  return card;
}

function setWeightInputValue(input, value) {
  input.value = Number.isFinite(value) ? value.toFixed(1) : '';
}

function adjustWeightInput(input, delta) {
  setWeightInputValue(input, stepWeight(input.value, delta));
}

function createQuickWeightModal(ctx, weights, onSaved) {
  let selectedPeriod = detectWeightPeriod();

  const modal = el('div', 'modal');
  modal.id = 'quick-weight-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const panel = el('div', 'modal-panel');
  const header = el('div', 'modal-header');
  header.append(el('h2', 'modal-title', '体重を入力'));
  const closeButton = el('button', 'icon-button', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.addEventListener('click', () => ctx.closeModal('quick-weight-modal'));
  header.append(closeButton);

  const form = document.createElement('form');
  form.className = 'modal-body stack';

  const tabs = el('div', 'segmented');
  const notice = el('div', 'banner banner-success');
  const field = el('label', 'field');
  field.append(el('span', 'field-label', 'kg'));
  const stepper = el('div', 'stepper');
  const minus = el('button', 'stepper-button', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', '0.1kg減らす');
  const input = document.createElement('input');
  input.className = 'input stepper-input';
  input.name = 'weight';
  input.type = 'number';
  input.inputMode = 'decimal';
  input.step = '0.1';
  input.min = '0';
  input.required = true;
  const plus = el('button', 'stepper-button', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', '0.1kg増やす');
  stepper.append(minus, input, plus);
  field.append(stepper);

  const saveButton = el('button', 'button button-primary', '保存');
  saveButton.type = 'submit';

  const updatePeriod = () => {
    tabs.querySelectorAll('.segment').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.period === selectedPeriod);
    });
    notice.replaceChildren(el('strong', '', `${WEIGHT_PERIOD_LABELS[selectedPeriod]}の体重として記録します`));
    setWeightInputValue(input, getLatestWeightValue(weights, selectedPeriod));
  };

  Object.entries(WEIGHT_PERIOD_LABELS).forEach(([period, label]) => {
    const button = el('button', `segment${period === selectedPeriod ? ' is-active' : ''}`, label);
    button.type = 'button';
    button.dataset.period = period;
    button.addEventListener('click', () => {
      selectedPeriod = period;
      updatePeriod();
    });
    tabs.append(button);
  });

  minus.addEventListener('click', () => adjustWeightInput(input, -0.1));
  plus.addEventListener('click', () => adjustWeightInput(input, 0.1));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = ctx.normalizeNumberInput(input.value, { min: 0 });
    if (!Number.isFinite(value)) {
      ctx.showToast('体重を入力してください', { tone: 'warning' });
      return;
    }
    const date = todayString();
    const existing = await getWeight(date) || {
      date,
      morning: null,
      night: null,
      bodyFat: null,
      waist: null,
      memo: ''
    };
    await saveWeight({
      ...existing,
      date,
      [selectedPeriod]: value
    });
    ctx.closeModal('quick-weight-modal');
    await onSaved();
    ctx.showToast(`${WEIGHT_PERIOD_LABELS[selectedPeriod]}の体重を保存しました`, { tone: 'success' });
  });

  form.append(tabs, notice, field, saveButton);
  panel.append(header, form);
  modal.append(panel);
  updatePeriod();

  return {
    modal,
    open() {
      selectedPeriod = detectWeightPeriod();
      updatePeriod();
      ctx.openModal('quick-weight-modal');
      window.setTimeout(() => input.focus(), 0);
    }
  };
}

function createTodayWeightCard(ctx, todayWeight, weights, onSaved) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '今日の体重'));
  const grid = el('div', 'grid-2');
  grid.append(el('div', 'number-large', `${numberText(todayWeight?.morning)} kg`));
  grid.append(el('div', 'number-large', `${numberText(todayWeight?.night)} kg`));
  card.append(grid);
  const sub = el('div', 'grid-2');
  sub.append(el('span', 'muted', '朝'));
  sub.append(el('span', 'muted', '夜'));
  card.append(sub);
  const quickModal = createQuickWeightModal(ctx, weights, onSaved);
  const button = el('button', 'button', '体重を入力');
  button.type = 'button';
  button.addEventListener('click', () => quickModal.open());
  card.append(button, quickModal.modal);
  return card;
}

function createMovingAverageCard(weights) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '7日移動平均'));
  const comparison = compareWeeklyAverages(weights);
  const value = comparison.recent.average;
  const diff = comparison.recentVsPreviousPercent;
  card.append(el('div', 'number-large', Number.isFinite(value) ? `${value.toFixed(1)} kg` : '--.- kg'));
  const trend = Number.isFinite(diff)
    ? `${diff <= 0 ? '▼' : '▲'} ${Math.abs(diff).toFixed(2)}%`
    : '前週比は記録不足';
  card.append(el('p', 'muted', trend));
  return card;
}

function createBmiCard(currentWeight, profile) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'BMI'));
  const result = calculateBMIResult(currentWeight, profile?.heightCm);
  card.append(el('div', 'number-large', Number.isFinite(result.bmi) ? result.bmi.toFixed(1) : '--.-'));
  card.append(el('span', 'badge badge-progress', result.category?.label || '判定待ち'));
  return card;
}

async function addFrequentMealWithUndo(record, ctx, onChanged) {
  const slot = detectMealSlot();
  const date = todayString();
  const id = await addFrequentMeal(record, { date, slot });
  await onChanged();
  showUndoToast(
    ctx,
    `${record.name}を${MEAL_SLOT_LABELS[slot]}に追加しました`,
    () => undoMeal(id),
    onChanged
  );
}

function createFrequentMealChips(ctx, allMeals, onChanged, limit = 4) {
  const items = frequentMeals(allMeals, limit);
  const slot = detectMealSlot();
  const stack = el('div', 'stack');
  stack.append(el('p', 'muted', `タップすると${MEAL_SLOT_LABELS[slot]}の食事として追加します`));
  if (!items.length) {
    stack.append(el('p', 'muted', '記録が増えると、ここに候補が出ます'));
    return stack;
  }
  const chips = el('div', 'quick-chip-list');
  items.forEach((item) => {
    const record = item.latest;
    const button = el('button', 'button quick-chip', record.name);
    button.type = 'button';
    button.addEventListener('click', () => addFrequentMealWithUndo(record, ctx, onChanged));
    chips.append(button);
  });
  stack.append(chips);
  return stack;
}

function createMealCard(ctx, allMeals, todayMeals, targetKcal, currentWeight, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '今日の摂取'));
  const kcal = sum(todayMeals, 'kcal');
  const p = sum(todayMeals, 'p');
  const f = sum(todayMeals, 'f');
  const c = sum(todayMeals, 'c');
  card.append(createBarRow('kcal', kcal, targetKcal || 0, 'kcal'));
  // カロリー未設定（テキスト記録）の件数。あるときだけ表示する。
  const uncountedMeals = (todayMeals || []).filter((m) => !Number.isFinite(m?.kcal)).length;
  if (uncountedMeals > 0) {
    card.append(el('span', 'muted', `未計算${uncountedMeals}件（合計に含まれていません）`));
  }
  const pfc = calculatePFCTarget({ targetKcal: targetKcal || 0, weightKg: currentWeight || 0 });
  const bars = el('div', 'bar-list');
  bars.append(createBarRow('P', p, pfc.p || 0, 'g'));
  bars.append(createBarRow('F', f, pfc.f || 0, 'g'));
  bars.append(createBarRow('C', c, pfc.c || 0, 'g'));
  card.append(bars);
  card.append(el('h3', 'section-label', 'よく食べたもの'));
  card.append(createFrequentMealChips(ctx, allMeals, onChanged, 4));
  return card;
}

function createWaterCard(ctx, todayWaters, waterGoalMl) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '水分'));
  const total = sum(todayWaters, 'ml');
  const ring = el('div', 'ring');
  ring.style.setProperty('--ring-value', `${waterGoalMl > 0 ? Math.min(100, total / waterGoalMl * 100) : 0}%`);
  card.append(ring);
  card.append(el('p', 'number-large', `${Math.round(total)} / ${Math.round(waterGoalMl || 0)} mL`));
  const quick = el('div', 'grid-2');
  [200, 350, 500].forEach((ml) => {
    const button = el('button', 'button', `+${ml} mL`);
    button.type = 'button';
    button.addEventListener('click', async () => {
      await addWater({ date: todayString(), time: currentTimeString(), ml });
      ctx.showToast(`${ml}mLを記録しました`, { tone: 'success' });
      ctx.navigate('home');
    });
    quick.append(button);
  });
  card.append(quick);
  return card;
}

async function recordRoutineWithUndo(routine, ctx, currentWeight, onChanged) {
  const result = await recordRoutineEntries(routine, {
    date: todayString(),
    currentWeight,
    profile: ctx.profile
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

function createRoutineQuickButtons(ctx, routines, currentWeight, onChanged) {
  const sorted = [...(routines || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'));
  if (!sorted.length) {
    return null;
  }
  const stack = el('div', 'stack');
  stack.append(el('p', 'muted', 'タップすると今日に記録します'));
  const grid = el('div', 'grid-2');
  sorted.slice(0, 2).forEach((routine) => {
    const button = el('button', 'button button-primary', routine.name || 'ルーティン');
    button.type = 'button';
    button.addEventListener('click', () => recordRoutineWithUndo(routine, ctx, currentWeight, onChanged));
    grid.append(button);
  });
  stack.append(grid);
  return stack;
}

function createExerciseCard(ctx, todayExercises, weeklyExercises, currentWeight, profile, today, routines, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '運動'));
  const daily = summarizeDailyExercises(todayExercises, { date: today, weightKg: currentWeight });
  const weekly = summarizeRecent7DayExercises(weeklyExercises, {
    anchorDate: today,
    goalMinutes: profile?.exerciseGoalMinPerWeek || 150
  });
  const names = todayExercises.map((record) => record.name).filter(Boolean);
  const nameText = names.length > 2 ? `${names.slice(0, 2).join('、')}、他${names.length - 2}件` : names.join('、');
  card.append(el('p', 'number-large', `${daily.totalMinutes} 分`));
  card.append(el('p', 'muted', nameText || '未記録'));
  card.append(el('span', profile?.countExerciseInBalance ? 'badge badge-warning' : 'badge', `${daily.totalAddedKcal.toFixed(1)} kcal 参考値`));
  const routineButtons = createRoutineQuickButtons(ctx, routines, currentWeight, onChanged);
  if (routineButtons) {
    card.append(routineButtons);
  } else if (!todayExercises.length) {
    const button = el('button', 'button', '運動を記録');
    button.type = 'button';
    button.addEventListener('click', () => ctx.navigate('exercise'));
    card.append(button);
  }
  card.append(el('p', 'muted', `今週 ${weekly.totalMinutes}分 / ${weekly.goalMinutes}分`));
  card.append(createProgress(weekly.achievementRate));
  return card;
}

function createPlateauCard(weights) {
  const result = detectPlateau(weights);
  if (!result.isPlateau) {
    return null;
  }
  const card = el('section', 'banner banner-warning');
  card.append(el('strong', '', result.label));
  card.append(el('span', '', result.advice || result.message));
  return card;
}

function createBalanceCard({ bmrResult, tdee, intakeKcal, exerciseAddedKcal, profile }) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '収支'));
  const balance = calculateCalorieBalanceWithExercise({
    intakeKcal,
    tdee,
    exerciseAddedKcal,
    profile
  });
  card.append(el('p', 'muted', `基礎代謝 ${Math.round(bmrResult.bmr || 0)} kcal / 推定消費 ${Math.round(tdee || 0)} kcal / 摂取 ${Math.round(intakeKcal || 0)} kcal`));
  const label = profile?.countExerciseInBalance
    ? `摂取 − (TDEE + 運動${Math.round(balance.includedExerciseKcal)}kcal)`
    : '摂取 − TDEE';
  card.append(el('div', 'number-large', Number.isFinite(balance.balanceKcal) ? `${label} = ${balance.balanceKcal > 0 ? '▲' : '▼'}${Math.abs(balance.balanceKcal)} kcal` : '計算待ち'));
  return card;
}

export async function render(ctx) {
  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  if (!ctx.profile) {
    stack.append(createSetupPrompt(ctx));
    return fragment;
  }

  const today = todayString();
  const weekStart = addDays(today, -6);
  const [weights, meals, waters, exercises, routines] = await Promise.all([
    getAll(STORES.weights),
    getAll(STORES.meals),
    getAll(STORES.waters),
    getAll(STORES.exercises),
    getAll(STORES.myroutines)
  ]);
  const todayMeals = meals.filter((record) => record.date === today);
  const todayWaters = waters.filter((record) => record.date === today);
  const todayExercises = exercises.filter((record) => record.date === today);
  const weeklyExercises = exercises.filter((record) => record.date >= weekStart && record.date <= today);

  const latestRecord = latestWeightRecord(weights);
  const currentWeight = latestRecord ? pickDailyWeight(latestRecord).value : null;
  const todayWeight = weights.find((record) => record.date === today) || null;
  const startWeight = earliestWeightValue(weights);
  const targetWeight = Number.isFinite(ctx.profile.targetWeight) ? ctx.profile.targetWeight : null;
  const waterGoalMl = calculateWaterGoalMl(currentWeight, ctx.profile.waterGoalMl);
  const exerciseSummary = summarizeDailyExercises(todayExercises, { date: today, weightKg: currentWeight });

  const bmrResult = calculateBMR({
    sex: ctx.profile.sex,
    birth: ctx.profile.birth,
    heightCm: ctx.profile.heightCm,
    weightKg: currentWeight,
    formula: ctx.profile.bmrFormula
  });
  const tdee = calculateTDEE(bmrResult.bmr, ctx.profile.activityLevel);
  const targetBase = calculateTargetCalories({
    currentWeightKg: currentWeight,
    targetWeightKg: targetWeight,
    targetDate: ctx.profile.targetDate,
    tdee,
    bmr: bmrResult.bmr,
    today
  });
  const targetWithExercise = applyExerciseToTargetCalories(targetBase, ctx.profile, exerciseSummary.totalAddedKcal);
  const targetKcal = targetWithExercise.targetKcal;
  const intakeKcal = sum(todayMeals, 'kcal');
  const refreshHome = async () => {
    ctx.navigate('home');
  };

  stack.append(createWeightGoalCard({ currentWeight, targetWeight, startWeight }));
  stack.append(createTodayWeightCard(ctx, todayWeight, weights, refreshHome));
  stack.append(createMovingAverageCard(weights));
  stack.append(createBmiCard(currentWeight, ctx.profile));
  stack.append(createMealCard(ctx, meals, todayMeals, targetKcal, currentWeight, refreshHome));
  stack.append(createWaterCard(ctx, todayWaters, waterGoalMl));
  stack.append(createExerciseCard(ctx, todayExercises, weeklyExercises, currentWeight, ctx.profile, today, routines, refreshHome));

  const plateauCard = createPlateauCard(weights);
  if (plateauCard) {
    stack.append(plateauCard);
  }

  const streakDates = [
    ...weights.map((record) => record.date),
    ...meals.map((record) => record.date),
    ...waters.map((record) => record.date),
    ...exercises.map((record) => record.date)
  ];
  const streakCard = el('section', 'card');
  streakCard.append(el('h2', 'card-title', '記録連続日数'));
  streakCard.append(el('p', 'number-large', `${countRecordStreak(streakDates, today)} 日連続で記録中`));
  stack.append(streakCard);

  stack.append(createBalanceCard({
    bmrResult,
    tdee,
    intakeKcal,
    exerciseAddedKcal: exerciseSummary.totalAddedKcal,
    profile: ctx.profile
  }));

  return fragment;
}
