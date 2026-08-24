// クイック入力の共通処理。DB通信ではなく IndexedDB ラッパの呼び出しだけに閉じる。
import {
  addExercise,
  addMeal,
  deleteExercise,
  deleteMeal
} from './db.js';
import {
  calculateExerciseAddedKcal,
  pickDailyWeight
} from './calc.js';

export const WEIGHT_PERIOD_LABELS = Object.freeze({
  morning: '朝',
  night: '夜'
});

export const MEAL_SLOT_LABELS = Object.freeze({
  breakfast: '朝',
  lunch: '昼',
  dinner: '夕',
  snack: '間食'
});

export function todayString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function currentTimeString(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function detectWeightPeriod(date = new Date()) {
  const minutes = minutesSinceMidnight(date);
  return minutes >= 4 * 60 && minutes <= 16 * 60 + 59 ? 'morning' : 'night';
}

export function detectMealSlot(date = new Date()) {
  const minutes = minutesSinceMidnight(date);
  if (minutes >= 4 * 60 && minutes <= 10 * 60 + 59) {
    return 'breakfast';
  }
  if (minutes >= 11 * 60 && minutes <= 15 * 60 + 59) {
    return 'lunch';
  }
  if (minutes >= 16 * 60 && minutes <= 21 * 60 + 59) {
    return 'dinner';
  }
  return 'snack';
}

export function latestWeightValue(weights, period = null) {
  const sorted = [...(weights || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (period && WEIGHT_PERIOD_LABELS[period]) {
    const samePeriod = sorted.find((record) => Number.isFinite(record?.[period]));
    if (samePeriod) {
      return samePeriod[period];
    }
  }
  const anyRecord = sorted.find((record) => Number.isFinite(pickDailyWeight(record).value));
  return anyRecord ? pickDailyWeight(anyRecord).value : null;
}

export function stepWeight(value, delta) {
  const current = Number(value);
  const base = Number.isFinite(current) ? current : 0;
  return Math.max(0, Math.round((base + delta) * 10) / 10);
}

function isNewerMeal(record, latest) {
  const dateCompare = String(record.date || '').localeCompare(String(latest.date || ''));
  if (dateCompare !== 0) {
    return dateCompare > 0;
  }
  return Number(record.id || 0) > Number(latest.id || 0);
}

export function frequentMeals(allMeals, limit = 10) {
  const grouped = new Map();
  (allMeals || []).forEach((record) => {
    const key = record.foodId || record.name;
    if (!key || !record.name) {
      return;
    }
    const current = grouped.get(key) || { count: 0, latest: record };
    current.count += 1;
    if (isNewerMeal(record, current.latest)) {
      current.latest = record;
    }
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .sort((a, b) => b.count - a.count || String(b.latest.date || '').localeCompare(String(a.latest.date || '')) || Number(b.latest.id || 0) - Number(a.latest.id || 0))
    .slice(0, limit);
}

export async function addFrequentMeal(record, options = {}) {
  const { id, ...copy } = record || {};
  return addMeal({
    ...copy,
    date: options.date || todayString(),
    slot: options.slot || detectMealSlot()
  });
}

export function undoMeal(id) {
  return id == null ? Promise.resolve() : deleteMeal(id);
}

export function weightForExercise(currentWeight, profile) {
  return Number.isFinite(currentWeight) ? currentWeight : profile?.targetWeight;
}

function routineItemCat(item, routine, exerciseApi) {
  const source = item?.exId && exerciseApi?.findExerciseById
    ? exerciseApi.findExerciseById(item.exId)
    : null;
  return source?.cat || routine?.cat || 'other';
}

export function routineExerciseRecords(routine, options = {}) {
  const items = Array.isArray(routine?.items) ? routine.items : [];
  const time = options.time || currentTimeString();
  const date = options.date || todayString();
  const weightKg = weightForExercise(options.currentWeight, options.profile);
  return items.map((item) => {
    const mets = Number.isFinite(item.mets) ? item.mets : 3;
    const minutes = Number.isFinite(item.minutes) ? item.minutes : 0;
    return {
      date,
      time,
      cat: routineItemCat(item, routine, options.exerciseApi),
      name: item.name || 'ルーティン',
      exId: item.exId || null,
      minutes,
      mets,
      kcal: calculateExerciseAddedKcal({ mets, minutes, weightKg }),
      sets: null,
      reps: null,
      weightKg: null,
      intensity: null,
      memo: routine?.name || ''
    };
  });
}

export async function recordRoutineEntries(routine, options = {}) {
  const records = routineExerciseRecords(routine, options);
  if (!records.length) {
    return { ids: [], records };
  }
  const ids = await Promise.all(records.map((record) => addExercise(record)));
  return { ids, records };
}

export async function undoExercises(ids) {
  const uniqueIds = [...new Set((ids || []).filter((id) => id != null))];
  await Promise.all(uniqueIds.map((id) => deleteExercise(id)));
}

export function showUndoToast(ctx, message, undoAction, onUndone = null) {
  let used = false;
  ctx.showToast(message, {
    tone: 'success',
    timeout: 5000,
    action: {
      label: '取消',
      onClick: async () => {
        if (used) {
          return;
        }
        used = true;
        try {
          await undoAction();
          if (typeof onUndone === 'function') {
            await onUndone();
          }
          ctx.showToast('取消しました', { tone: 'success' });
        } catch (error) {
          ctx.showToast('取消できませんでした', { tone: 'danger' });
        }
      }
    }
  });
}
