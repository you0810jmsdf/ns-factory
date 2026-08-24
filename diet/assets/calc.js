// 計算層。すべて副作用のない純関数として実装する。

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FAT_KCAL_PER_KG = 7200;
const DEFAULT_WEEKLY_LOSS_RATE = 0.005;
const SAFE_WEEKLY_LOSS_RATE_MAX = 0.007;
const PLATEAU_CHANGE_THRESHOLD_PERCENT = -0.2;
const MIN_CARB_G_FOR_EXTREME_LOW = 50;
const DEFAULT_EXERCISE_GOAL_MIN_PER_WEEK = 150;

export const BMI_CATEGORIES = Object.freeze([
  { min: 0, max: 18.5, label: '低体重' },
  { min: 18.5, max: 25, label: '普通体重' },
  { min: 25, max: 30, label: '肥満(1度)' },
  { min: 30, max: 35, label: '肥満(2度)' },
  { min: 35, max: 40, label: '肥満(3度)' },
  { min: 40, max: Infinity, label: '肥満(4度)' }
]);

export const PFC_BALANCE_RANGES = Object.freeze({
  p: { min: 13, max: 20 },
  f: { min: 20, max: 30 },
  c: { min: 50, max: 65 }
});

/**
 * 有限の数値か判定する。
 * @param {unknown} value 判定対象。
 * @returns {boolean} 有限の数値なら true。
 */
export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 数値を指定桁で丸める。
 * @param {number|null} value 丸める値。
 * @param {number} [digits=1] 小数桁数。
 * @returns {number|null} 丸め後の値。数値でなければ null。
 */
export function round(value, digits = 1) {
  if (!isFiniteNumber(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * YYYY-MM-DD 文字列をローカル日付としてパースする。
 * @param {string|Date} value 日付文字列または Date。
 * @returns {Date|null} パースできない場合は null。
 */
export function parseLocalDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * 日付を YYYY-MM-DD へ変換する。
 * @param {Date} date 日付。
 * @returns {string} YYYY-MM-DD。
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 日付に日数を加算する。
 * @param {string|Date} date 基準日。
 * @param {number} days 加算日数。負数も可。
 * @returns {string|null} YYYY-MM-DD。日付が不正なら null。
 */
export function addDays(date, days) {
  const base = parseLocalDate(date);
  if (!base || !isFiniteNumber(days)) {
    return null;
  }
  base.setDate(base.getDate() + days);
  return formatDate(base);
}

/**
 * 2日付間の日数差を返す。
 * @param {string|Date} startDate 開始日。
 * @param {string|Date} endDate 終了日。
 * @returns {number|null} endDate - startDate の日数。
 */
export function daysBetween(startDate, endDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) {
    return null;
  }
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * 生年月日から指定日時点の満年齢を計算する。
 * @param {string} birth YYYY-MM-DD の生年月日。
 * @param {string|Date} [today=new Date()] 基準日。
 * @returns {number|null} 年齢。日付が不正なら null。
 */
export function calculateAge(birth, today = new Date()) {
  const birthDate = parseLocalDate(birth);
  const baseDate = parseLocalDate(today);
  if (!birthDate || !baseDate) {
    return null;
  }

  let age = baseDate.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    baseDate.getMonth() < birthDate.getMonth() ||
    (baseDate.getMonth() === birthDate.getMonth() && baseDate.getDate() < birthDate.getDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age;
}

/**
 * BMI を計算する。
 * @param {number} weightKg 体重 kg。
 * @param {number} heightCm 身長 cm。
 * @returns {number|null} BMI。計算できない場合は null。
 */
export function calculateBMI(weightKg, heightCm) {
  if (!isFiniteNumber(weightKg) || !isFiniteNumber(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

/**
 * BMI から日本肥満学会区分を返す。
 * @param {number} bmi BMI。
 * @returns {{label:string, min:number, max:number}|null} 判定区分。
 */
export function getBMICategory(bmi) {
  if (!isFiniteNumber(bmi)) {
    return null;
  }
  return BMI_CATEGORIES.find((category) => bmi >= category.min && bmi < category.max) || null;
}

/**
 * BMI と判定区分をまとめて返す。
 * @param {number} weightKg 体重 kg。
 * @param {number} heightCm 身長 cm。
 * @returns {{bmi:number|null, category:{label:string, min:number, max:number}|null}}
 */
export function calculateBMIResult(weightKg, heightCm) {
  const bmi = calculateBMI(weightKg, heightCm);
  return { bmi, category: getBMICategory(bmi) };
}

/**
 * Ganpule 式（国立健康・栄養研究所式）で BMR を計算する。
 * @param {{sex:'male'|'female', weightKg:number, heightCm:number, age:number}} params 入力値。
 * @returns {number|null} 基礎代謝 kcal/日。
 */
export function calculateGanpuleBMR(params) {
  const { sex, weightKg, heightCm, age } = params || {};
  if (!['male', 'female'].includes(sex) || !isFiniteNumber(weightKg) || !isFiniteNumber(heightCm) || !isFiniteNumber(age)) {
    return null;
  }
  const k = sex === 'male' ? 0.4235 : 0.9708;
  return round((0.0481 * weightKg + 0.0234 * heightCm - 0.0138 * age - k) * 1000 / 4.186, 0);
}

/**
 * Mifflin-St Jeor 式で BMR を計算する。
 * @param {{sex:'male'|'female', weightKg:number, heightCm:number, age:number}} params 入力値。
 * @returns {number|null} 基礎代謝 kcal/日。
 */
export function calculateMifflinBMR(params) {
  const { sex, weightKg, heightCm, age } = params || {};
  if (!['male', 'female'].includes(sex) || !isFiniteNumber(weightKg) || !isFiniteNumber(heightCm) || !isFiniteNumber(age)) {
    return null;
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return round(sex === 'male' ? base + 5 : base - 161, 0);
}

/**
 * 生年月日を含むパラメータから指定式の BMR を計算する。
 * @param {{sex:'male'|'female', birth:string, weightKg:number, heightCm:number, formula?:'ganpule'|'mifflin'}} params 入力値。
 * @param {string|Date} [today=new Date()] 年齢算出の基準日。
 * @returns {{formula:'ganpule'|'mifflin', age:number|null, bmr:number|null, ganpule:number|null, mifflin:number|null}} BMR 結果。
 */
export function calculateBMR(params, today = new Date()) {
  const age = calculateAge(params?.birth, today);
  const baseParams = {
    sex: params?.sex,
    weightKg: params?.weightKg,
    heightCm: params?.heightCm,
    age
  };
  const ganpule = age == null ? null : calculateGanpuleBMR(baseParams);
  const mifflin = age == null ? null : calculateMifflinBMR(baseParams);
  const formula = params?.formula === 'mifflin' ? 'mifflin' : 'ganpule';
  return {
    formula,
    age,
    bmr: formula === 'mifflin' ? mifflin : ganpule,
    ganpule,
    mifflin
  };
}

/**
 * TDEE を計算する。
 * @param {number} bmr 基礎代謝 kcal/日。
 * @param {1.5|1.75|2|number} activityLevel 身体活動レベル。
 * @returns {number|null} 推定消費 kcal/日。
 */
export function calculateTDEE(bmr, activityLevel) {
  if (!isFiniteNumber(bmr) || !isFiniteNumber(activityLevel) || bmr <= 0 || activityLevel <= 0) {
    return null;
  }
  return round(bmr * activityLevel, 0);
}

/**
 * 安全域ガードを評価する。
 * @param {{targetKcal:number, bmr:number, weeklyLossPercent:number}} params 評価対象。
 * @returns {{isTooFast:boolean, isBelowBMR:boolean, warnings:Array<{level:'warning'|'danger', code:string, message:string}>}} 警告情報。
 */
export function evaluateSafetyGuard(params) {
  const targetKcal = params?.targetKcal;
  const bmr = params?.bmr;
  const weeklyLossPercent = params?.weeklyLossPercent;
  const warnings = [];

  const isTooFast = isFiniteNumber(weeklyLossPercent) && weeklyLossPercent > SAFE_WEEKLY_LOSS_RATE_MAX * 100;
  const isBelowBMR = isFiniteNumber(targetKcal) && isFiniteNumber(bmr) && targetKcal < bmr;

  if (isTooFast) {
    warnings.push({
      level: 'warning',
      code: 'weekly_loss_over_0_7_percent',
      message: '健康的な減量ペースは週0.3〜0.7%です'
    });
  }

  if (isBelowBMR) {
    warnings.push({
      level: 'danger',
      code: 'target_kcal_below_bmr',
      message: '基礎代謝を下回る設定です。筋肉量と基礎代謝が落ちる恐れがあります'
    });
  }

  return { isTooFast, isBelowBMR, warnings };
}

/**
 * 目標摂取 kcal を計算する。
 * @param {{currentWeightKg:number, targetWeightKg:number, targetDate?:string|null, tdee:number, bmr:number, today?:string|Date}} params 入力値。
 * @returns {{targetKcal:number|null, dailyDeficit:number|null, days:number|null, weeklyLossKg:number|null, weeklyLossPercent:number|null, usedDefaultPace:boolean, warnings:Array<object>, isTooFast:boolean, isBelowBMR:boolean}} 計算結果。
 */
export function calculateTargetCalories(params) {
  const currentWeightKg = params?.currentWeightKg;
  const targetWeightKg = params?.targetWeightKg;
  const tdee = params?.tdee;
  const bmr = params?.bmr;
  const today = params?.today || new Date();

  if (!isFiniteNumber(currentWeightKg) || !isFiniteNumber(targetWeightKg) || !isFiniteNumber(tdee) || !isFiniteNumber(bmr) || currentWeightKg <= 0) {
    return {
      targetKcal: null,
      dailyDeficit: null,
      days: null,
      weeklyLossKg: null,
      weeklyLossPercent: null,
      usedDefaultPace: false,
      warnings: [],
      isTooFast: false,
      isBelowBMR: false
    };
  }

  const requiredLossKg = currentWeightKg - targetWeightKg;
  const targetDays = params?.targetDate ? daysBetween(today, params.targetDate) : null;
  const useDefaultPace = !isFiniteNumber(targetDays) || targetDays <= 0;
  const dailyDeficit = useDefaultPace
    ? (requiredLossKg > 0 ? currentWeightKg * DEFAULT_WEEKLY_LOSS_RATE * FAT_KCAL_PER_KG / 7 : 0)
    : requiredLossKg * FAT_KCAL_PER_KG / targetDays;

  const targetKcal = tdee - dailyDeficit;
  const weeklyLossKg = dailyDeficit * 7 / FAT_KCAL_PER_KG;
  const weeklyLossPercent = weeklyLossKg / currentWeightKg * 100;
  const safety = evaluateSafetyGuard({ targetKcal, bmr, weeklyLossPercent });

  return {
    targetKcal: round(targetKcal, 0),
    dailyDeficit: round(dailyDeficit, 0),
    days: useDefaultPace ? null : targetDays,
    weeklyLossKg: round(weeklyLossKg, 2),
    weeklyLossPercent: round(weeklyLossPercent, 2),
    usedDefaultPace: useDefaultPace,
    ...safety
  };
}

function normalizePfcInput(input, weightKg) {
  if (typeof input === 'object' && input !== null) {
    return {
      targetKcal: input.targetKcal ?? input.kcal,
      weightKg: input.weightKg
    };
  }
  return { targetKcal: input, weightKg };
}

function percentOfEnergy(grams, kcalPerGram, targetKcal) {
  if (!isFiniteNumber(grams) || !isFiniteNumber(targetKcal) || targetKcal <= 0) {
    return null;
  }
  return grams * kcalPerGram / targetKcal * 100;
}

function inRange(value, range) {
  return isFiniteNumber(value) && value >= range.min && value <= range.max;
}

/**
 * PFC 目標を計算する。
 * @param {{targetKcal:number, weightKg:number}|number} input 入力値。数値の場合は targetKcal。
 * @param {number} [weightKg] input が数値の場合の体重 kg。
 * @returns {{kcal:number|null, p:number|null, f:number|null, c:number|null, relaxedProtein:boolean, note:string|null, balance:{pPercent:number|null, fPercent:number|null, cPercent:number|null, pInRange:boolean, fInRange:boolean, cInRange:boolean, allInRange:boolean}}} PFC 目標。
 */
export function calculatePFCTarget(input, weightKg) {
  const args = normalizePfcInput(input, weightKg);
  const targetKcal = args.targetKcal;
  const bodyWeight = args.weightKg;

  if (!isFiniteNumber(targetKcal) || !isFiniteNumber(bodyWeight) || targetKcal <= 0 || bodyWeight <= 0) {
    return {
      kcal: null,
      p: null,
      f: null,
      c: null,
      relaxedProtein: false,
      note: null,
      balance: {
        pPercent: null,
        fPercent: null,
        cPercent: null,
        pInRange: false,
        fInRange: false,
        cInRange: false,
        allInRange: false
      }
    };
  }

  let proteinG = bodyWeight * 2.0;
  const fatG = targetKcal * 0.25 / 9;
  let carbG = (targetKcal - proteinG * 4 - fatG * 9) / 4;
  let relaxedProtein = false;
  let note = null;

  if (carbG < 0 || carbG < MIN_CARB_G_FOR_EXTREME_LOW) {
    proteinG = bodyWeight * 1.6;
    carbG = (targetKcal - proteinG * 4 - fatG * 9) / 4;
    relaxedProtein = true;
    note = '目標kcalが低いため、たんぱく質目標を1.6g/kgへ緩和しました';
  }

  if (carbG < 0) {
    carbG = 0;
    note = '目標kcalが極端に低いため、炭水化物を0g未満にしないよう補正しました';
  }

  const roundedP = round(proteinG, 1);
  const roundedF = round(fatG, 1);
  const roundedC = round(carbG, 1);
  const pPercent = round(percentOfEnergy(roundedP, 4, targetKcal), 1);
  const fPercent = round(percentOfEnergy(roundedF, 9, targetKcal), 1);
  const cPercent = round(percentOfEnergy(roundedC, 4, targetKcal), 1);
  const pInRange = inRange(pPercent, PFC_BALANCE_RANGES.p);
  const fInRange = inRange(fPercent, PFC_BALANCE_RANGES.f);
  const cInRange = inRange(cPercent, PFC_BALANCE_RANGES.c);

  return {
    kcal: round(targetKcal, 0),
    p: roundedP,
    f: roundedF,
    c: roundedC,
    relaxedProtein,
    note,
    balance: {
      pPercent,
      fPercent,
      cPercent,
      pInRange,
      fInRange,
      cInRange,
      allInRange: pInRange && fInRange && cInRange
    }
  };
}

/**
 * 体重記録から朝優先、朝欠測なら夜で代表値を取得する。
 * @param {{morning?:number|null, night?:number|null}} record 体重記録。
 * @returns {{value:number|null, source:'morning'|'night'|null, substituted:boolean}} 代表値。
 */
export function pickDailyWeight(record) {
  if (isFiniteNumber(record?.morning)) {
    return { value: record.morning, source: 'morning', substituted: false };
  }
  if (isFiniteNumber(record?.night)) {
    return { value: record.night, source: 'night', substituted: true };
  }
  return { value: null, source: null, substituted: false };
}

/**
 * 日付昇順に体重記録を並べる。
 * @param {Array<{date:string}>} records 体重記録。
 * @returns {Array<object>} 日付昇順の配列。
 */
export function sortByDate(records) {
  return [...(records || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * 7日移動平均を算出する。朝体重を優先し、朝欠測時は夜体重で代替する。
 * @param {Array<{date:string, morning?:number|null, night?:number|null}>} records 体重記録。
 * @returns {Array<{date:string, value:number|null, average:number|null, source:'morning'|'night'|null, substituted:boolean}>} 移動平均付き記録。
 */
export function calculateMovingAverage7(records) {
  const sorted = sortByDate(records);
  return sorted.map((record, index) => {
    const picked = pickDailyWeight(record);
    if (!isFiniteNumber(picked.value)) {
      return {
        date: record.date,
        value: null,
        average: null,
        source: null,
        substituted: false
      };
    }

    const values = [];
    for (let i = index; i >= 0 && values.length < 7; i -= 1) {
      const value = pickDailyWeight(sorted[i]).value;
      if (isFiniteNumber(value)) {
        values.push(value);
      }
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      date: record.date,
      value: round(picked.value, 1),
      average: round(average, 1),
      source: picked.source,
      substituted: picked.substituted
    };
  });
}

function latestRecordDate(records) {
  const sortedDates = (records || [])
    .map((record) => record.date)
    .filter((date) => parseLocalDate(date))
    .sort();
  return sortedDates.length ? sortedDates[sortedDates.length - 1] : null;
}

function valueMapByDate(records) {
  const map = new Map();
  for (const record of records || []) {
    const picked = pickDailyWeight(record);
    if (parseLocalDate(record.date) && isFiniteNumber(picked.value)) {
      map.set(record.date, picked.value);
    }
  }
  return map;
}

function averageForWindow(map, anchorDate, startOffset, endOffset) {
  const values = [];
  for (let offset = startOffset; offset <= endOffset; offset += 1) {
    const date = addDays(anchorDate, -offset);
    const value = map.get(date);
    if (isFiniteNumber(value)) {
      values.push(value);
    }
  }
  if (!values.length) {
    return { average: null, count: 0 };
  }
  return {
    average: round(values.reduce((sum, value) => sum + value, 0) / values.length, 2),
    count: values.length
  };
}

function changePercent(current, previous) {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || previous === 0) {
    return null;
  }
  return round((current - previous) / previous * 100, 2);
}

/**
 * 直近7日、8〜14日前、15〜21日前の週平均を比較する。
 * @param {Array<{date:string, morning?:number|null, night?:number|null}>} records 体重記録。
 * @param {string|Date} [anchorDate] 基準日。省略時は最新記録日。
 * @returns {{anchorDate:string|null, recent:{average:number|null,count:number}, previous:{average:number|null,count:number}, secondPrevious:{average:number|null,count:number}, recentVsPreviousPercent:number|null, previousVsSecondPreviousPercent:number|null}} 週平均比較。
 */
export function compareWeeklyAverages(records, anchorDate = null) {
  const parsedAnchor = anchorDate ? parseLocalDate(anchorDate) : null;
  const anchor = anchorDate ? (parsedAnchor ? formatDate(parsedAnchor) : null) : latestRecordDate(records);
  if (!anchor) {
    return {
      anchorDate: null,
      recent: { average: null, count: 0 },
      previous: { average: null, count: 0 },
      secondPrevious: { average: null, count: 0 },
      recentVsPreviousPercent: null,
      previousVsSecondPreviousPercent: null
    };
  }

  const map = valueMapByDate(records);
  const recent = averageForWindow(map, anchor, 0, 6);
  const previous = averageForWindow(map, anchor, 7, 13);
  const secondPrevious = averageForWindow(map, anchor, 14, 20);

  return {
    anchorDate: anchor,
    recent,
    previous,
    secondPrevious,
    recentVsPreviousPercent: changePercent(recent.average, previous.average),
    previousVsSecondPreviousPercent: changePercent(previous.average, secondPrevious.average)
  };
}

/**
 * 停滞期の可能性を判定する。
 * @param {Array<{date:string, morning?:number|null, night?:number|null}>} records 体重記録。
 * @param {string|Date} [anchorDate] 基準日。省略時は最新記録日。
 * @returns {{status:'insufficient'|'normal'|'plateau', label:string, isPlateau:boolean, daysUntilReady:number, message:string, advice:string|null, comparison:object}} 判定結果。
 */
export function detectPlateau(records, anchorDate = null) {
  const usableCount = (records || []).filter((record) => isFiniteNumber(pickDailyWeight(record).value)).length;
  const comparison = compareWeeklyAverages(records, anchorDate);

  if (usableCount < 14) {
    const daysUntilReady = 14 - usableCount;
    return {
      status: 'insufficient',
      label: '判定不能',
      isPlateau: false,
      daysUntilReady,
      message: `あと${daysUntilReady}日分の記録で停滞期判定ができます`,
      advice: null,
      comparison
    };
  }

  if (
    comparison.recent.count === 0 ||
    comparison.previous.count === 0 ||
    comparison.secondPrevious.count === 0
  ) {
    const daysUntilReady = Math.max(0, 21 - usableCount);
    return {
      status: 'insufficient',
      label: '判定不能',
      isPlateau: false,
      daysUntilReady,
      message: daysUntilReady > 0
        ? `あと${daysUntilReady}日分の記録で直近3週の停滞期判定ができます`
        : '直近3週の比較に必要な記録が不足しています',
      advice: null,
      comparison
    };
  }

  const recentSlow = comparison.recentVsPreviousPercent >= PLATEAU_CHANGE_THRESHOLD_PERCENT;
  const previousSlow = comparison.previousVsSecondPreviousPercent >= PLATEAU_CHANGE_THRESHOLD_PERCENT;
  const isPlateau = recentSlow && previousSlow;

  return {
    status: isPlateau ? 'plateau' : 'normal',
    label: isPlateau ? '停滞期の可能性' : '通常',
    isPlateau,
    daysUntilReady: 0,
    message: isPlateau ? '停滞期の可能性があります' : '停滞期判定には該当しません',
    advice: isPlateau
      ? '水分変動の可能性があります。まず2週間は記録を継続し、PFCと水分量、ウエスト周囲径も併せて確認してください'
      : null,
    comparison
  };
}

/**
 * 除脂肪体重を計算する。
 * @param {number} weightKg 体重 kg。
 * @param {number|null} bodyFatPercent 体脂肪率 %。
 * @returns {number|null} 除脂肪体重 kg。体脂肪率未入力なら null。
 */
export function calculateLeanBodyMass(weightKg, bodyFatPercent) {
  if (!isFiniteNumber(weightKg) || !isFiniteNumber(bodyFatPercent) || weightKg <= 0 || bodyFatPercent < 0 || bodyFatPercent >= 100) {
    return null;
  }
  return round(weightKg * (1 - bodyFatPercent / 100), 1);
}

/**
 * 水分摂取目安を計算する。
 * @param {number} weightKg 体重 kg。
 * @param {number|null} [manualGoalMl=null] 手動上書き mL。
 * @returns {number|null} 水分目安 mL/日。
 */
export function calculateWaterGoalMl(weightKg, manualGoalMl = null) {
  if (isFiniteNumber(manualGoalMl) && manualGoalMl > 0) {
    return round(manualGoalMl, 0);
  }
  if (!isFiniteNumber(weightKg) || weightKg <= 0) {
    return null;
  }
  return round(weightKg * 32, 0);
}

function normalizeExerciseKcalInput(input, weightKg, minutes) {
  if (typeof input === 'object' && input !== null) {
    return {
      mets: input.mets,
      weightKg: input.weightKg,
      minutes: input.minutes
    };
  }
  return { mets: input, weightKg, minutes };
}

/**
 * METs法で運動の上乗せ消費kcalを計算する。
 * TDEEには安静時代謝と日常活動量が既に含まれるため、総消費の METs 分をそのまま足すと運動時間中の安静時代謝1 MET分を二重計上する。
 * 収支に使う運動分は「安静にしていた場合との差分」なので、仕様どおり (METs - 1) を使う。
 * @param {{mets:number, weightKg:number, minutes:number}|number} input 入力値。数値の場合は METs。
 * @param {number} [weightKg] input が数値の場合の体重 kg。
 * @param {number} [minutes] input が数値の場合の実施時間 分。
 * @returns {number|null} 上乗せ消費kcal。計算できない場合は null。
 */
export function calculateExerciseAddedKcal(input, weightKg, minutes) {
  const args = normalizeExerciseKcalInput(input, weightKg, minutes);
  if (!isFiniteNumber(args.mets) || !isFiniteNumber(args.weightKg) || !isFiniteNumber(args.minutes) || args.mets < 1 || args.weightKg <= 0 || args.minutes < 0) {
    return null;
  }
  return round((args.mets - 1) * args.weightKg * (args.minutes / 60) * 1.05, 1);
}

/**
 * METs法で運動中の総消費kcalを計算する。参考併記用で、収支計算には通常使わない。
 * @param {{mets:number, weightKg:number, minutes:number}|number} input 入力値。数値の場合は METs。
 * @param {number} [weightKg] input が数値の場合の体重 kg。
 * @param {number} [minutes] input が数値の場合の実施時間 分。
 * @returns {number|null} 総消費kcal。計算できない場合は null。
 */
export function calculateExerciseTotalKcal(input, weightKg, minutes) {
  const args = normalizeExerciseKcalInput(input, weightKg, minutes);
  if (!isFiniteNumber(args.mets) || !isFiniteNumber(args.weightKg) || !isFiniteNumber(args.minutes) || args.mets <= 0 || args.weightKg <= 0 || args.minutes < 0) {
    return null;
  }
  return round(args.mets * args.weightKg * (args.minutes / 60) * 1.05, 1);
}

function exerciseMinutes(record) {
  return isFiniteNumber(record?.minutes) && record.minutes > 0 ? record.minutes : 0;
}

function exerciseAddedKcalForRecord(record, weightKg) {
  if (isFiniteNumber(record?.kcal)) {
    return record.kcal;
  }
  if (isFiniteNumber(weightKg)) {
    return calculateExerciseAddedKcal({
      mets: record?.mets,
      weightKg,
      minutes: record?.minutes
    }) ?? 0;
  }
  return 0;
}

function filterExercisesByDate(records, date) {
  if (!date) {
    return records || [];
  }
  return (records || []).filter((record) => record.date === date);
}

function initCategorySummary() {
  return {
    stretch: { minutes: 0, addedKcal: 0, count: 0 },
    yoga: { minutes: 0, addedKcal: 0, count: 0 },
    walk: { minutes: 0, addedKcal: 0, count: 0 },
    run: { minutes: 0, addedKcal: 0, count: 0 },
    strength: { minutes: 0, addedKcal: 0, count: 0 },
    bike: { minutes: 0, addedKcal: 0, count: 0 },
    swim: { minutes: 0, addedKcal: 0, count: 0 },
    daily: { minutes: 0, addedKcal: 0, count: 0 },
    other: { minutes: 0, addedKcal: 0, count: 0 }
  };
}

function roundCategorySummary(summary) {
  return Object.fromEntries(Object.entries(summary).map(([category, value]) => [
    category,
    {
      minutes: round(value.minutes, 0),
      addedKcal: round(value.addedKcal, 1),
      count: value.count
    }
  ]));
}

/**
 * 当日の運動集計を返す。
 * @param {Array<{date:string, cat:string, minutes:number, mets?:number, kcal?:number}>} records 運動記録。
 * @param {{date?:string, weightKg?:number}} [options] 集計条件。date 未指定なら渡された配列全体を集計する。
 * @returns {{date:string|null, totalMinutes:number, totalAddedKcal:number, byCategory:Record<string,{minutes:number, addedKcal:number, count:number}>, count:number}} 合計分数・上乗せkcal・カテゴリ別内訳。
 */
export function summarizeDailyExercises(records, options = {}) {
  const selected = filterExercisesByDate(records, options.date);
  const byCategory = initCategorySummary();
  let totalMinutes = 0;
  let totalAddedKcal = 0;

  for (const record of selected) {
    const minutes = exerciseMinutes(record);
    const addedKcal = exerciseAddedKcalForRecord(record, options.weightKg);
    const category = byCategory[record?.cat] ? record.cat : 'other';
    totalMinutes += minutes;
    totalAddedKcal += addedKcal;
    byCategory[category].minutes += minutes;
    byCategory[category].addedKcal += addedKcal;
    byCategory[category].count += 1;
  }

  return {
    date: options.date || null,
    totalMinutes: round(totalMinutes, 0),
    totalAddedKcal: round(totalAddedKcal, 1),
    byCategory: roundCategorySummary(byCategory),
    count: selected.length
  };
}

function exerciseRecordsInDateRange(records, startDate, endDate) {
  return (records || []).filter((record) => {
    const date = parseLocalDate(record.date);
    return date && record.date >= startDate && record.date <= endDate;
  });
}

/**
 * 直近7日の運動分数と週目標への達成率を返す。
 * @param {Array<{date:string, cat:string, minutes:number, kcal?:number}>} records 運動記録。
 * @param {{anchorDate?:string|Date, goalMinutes?:number}} [options] 基準日と週目標分数。
 * @returns {{startDate:string|null, endDate:string|null, totalMinutes:number, goalMinutes:number, achievementRate:number, byCategory:Record<string,{minutes:number, addedKcal:number, count:number}>}} 週間集計。
 */
export function summarizeRecent7DayExercises(records, options = {}) {
  const parsedAnchor = parseLocalDate(options.anchorDate || latestRecordDate(records) || new Date());
  if (!parsedAnchor) {
    return {
      startDate: null,
      endDate: null,
      totalMinutes: 0,
      goalMinutes: options.goalMinutes || DEFAULT_EXERCISE_GOAL_MIN_PER_WEEK,
      achievementRate: 0,
      byCategory: roundCategorySummary(initCategorySummary())
    };
  }

  const endDate = formatDate(parsedAnchor);
  const startDate = addDays(endDate, -6);
  const goalMinutes = isFiniteNumber(options.goalMinutes) && options.goalMinutes > 0
    ? options.goalMinutes
    : DEFAULT_EXERCISE_GOAL_MIN_PER_WEEK;
  const recordsInRange = exerciseRecordsInDateRange(records, startDate, endDate);
  const summary = summarizeDailyExercises(recordsInRange);

  return {
    startDate,
    endDate,
    totalMinutes: summary.totalMinutes,
    goalMinutes: round(goalMinutes, 0),
    achievementRate: round(summary.totalMinutes / goalMinutes * 100, 1),
    byCategory: summary.byCategory
  };
}

function latestExerciseDate(records) {
  const dates = (records || [])
    .map((record) => record.date)
    .filter((date) => parseLocalDate(date))
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/**
 * 運動を記録した日の連続日数を計算する。
 * @param {Array<{date:string}>} records 運動記録。
 * @param {string|Date} [anchorDate] 基準日。省略時は最新の運動記録日。
 * @returns {number} 基準日から遡った連続記録日数。
 */
export function calculateExerciseStreak(records, anchorDate = null) {
  const anchorSource = anchorDate || latestExerciseDate(records);
  const anchor = parseLocalDate(anchorSource);
  if (!anchor) {
    return 0;
  }

  const recordDates = new Set((records || [])
    .filter((record) => parseLocalDate(record.date))
    .map((record) => record.date));

  let streak = 0;
  let cursor = formatDate(anchor);
  while (recordDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * 目標摂取kcalに運動の上乗せ消費を反映する。
 * profile.countExerciseInBalance が true の場合のみ加算し、既定 false では既存の目標摂取kcalを変えない。
 * @param {{targetKcal:number, warnings?:Array<object>}|number} targetResult calculateTargetCalories の戻り値または目標kcal。
 * @param {{countExerciseInBalance?:boolean, activityLevel?:number}} [profile={}] プロフィール。
 * @param {number} [exerciseAddedKcal=0] 当日の上乗せ消費kcal。
 * @returns {object} 運動反映後の目標kcalと警告。
 */
export function applyExerciseToTargetCalories(targetResult, profile = {}, exerciseAddedKcal = 0) {
  const isObject = typeof targetResult === 'object' && targetResult !== null;
  const baseTargetKcal = isObject ? targetResult.targetKcal : targetResult;
  const includeExercise = profile?.countExerciseInBalance === true;
  const includedExerciseKcal = includeExercise && isFiniteNumber(exerciseAddedKcal) ? exerciseAddedKcal : 0;
  const warnings = isObject && Array.isArray(targetResult.warnings) ? [...targetResult.warnings] : [];

  if (includeExercise && isFiniteNumber(profile?.activityLevel) && profile.activityLevel !== 1.5) {
    warnings.push({
      level: 'warning',
      code: 'exercise_balance_with_pal_over_1_5',
      message: '身体活動レベルが低い（1.50）以外の場合、運動分を二重に数える恐れがあります'
    });
  }

  const targetKcal = isFiniteNumber(baseTargetKcal)
    ? round(baseTargetKcal + includedExerciseKcal, 0)
    : null;

  return {
    ...(isObject ? targetResult : {}),
    baseTargetKcal: isFiniteNumber(baseTargetKcal) ? round(baseTargetKcal, 0) : null,
    targetKcal,
    exerciseAddedKcal: round(includedExerciseKcal, 1),
    countExerciseInBalance: includeExercise,
    warnings
  };
}

/**
 * 当日の収支を計算する。運動分は profile.countExerciseInBalance が true の場合だけ TDEE 側へ加算する。
 * @param {{intakeKcal:number, tdee:number, exerciseAddedKcal?:number, profile?:{countExerciseInBalance?:boolean}}} params 入力値。
 * @returns {{balanceKcal:number|null, expenditureKcal:number|null, includedExerciseKcal:number, countExerciseInBalance:boolean}} 摂取 - 消費 の収支。
 */
export function calculateCalorieBalanceWithExercise(params) {
  const intakeKcal = params?.intakeKcal;
  const tdeeValue = params?.tdee;
  const includeExercise = params?.profile?.countExerciseInBalance === true;
  const includedExerciseKcal = includeExercise && isFiniteNumber(params?.exerciseAddedKcal) ? params.exerciseAddedKcal : 0;

  if (!isFiniteNumber(intakeKcal) || !isFiniteNumber(tdeeValue)) {
    return {
      balanceKcal: null,
      expenditureKcal: null,
      includedExerciseKcal: round(includedExerciseKcal, 1),
      countExerciseInBalance: includeExercise
    };
  }

  const expenditureKcal = tdeeValue + includedExerciseKcal;
  return {
    balanceKcal: round(intakeKcal - expenditureKcal, 0),
    expenditureKcal: round(expenditureKcal, 0),
    includedExerciseKcal: round(includedExerciseKcal, 1),
    countExerciseInBalance: includeExercise
  };
}

// UI 側で短い名前を使いたい場合の別名。
export const bmi = calculateBMI;
export const bmiCategory = getBMICategory;
export const ganpuleBmr = calculateGanpuleBMR;
export const mifflinBmr = calculateMifflinBMR;
export const tdee = calculateTDEE;
export const targetCalories = calculateTargetCalories;
export const safetyGuard = evaluateSafetyGuard;
export const pfcTargets = calculatePFCTarget;
export const movingAverage7 = calculateMovingAverage7;
export const weeklyAverageComparison = compareWeeklyAverages;
export const plateau = detectPlateau;
export const leanBodyMass = calculateLeanBodyMass;
export const waterGoalMl = calculateWaterGoalMl;
export const exerciseAddedKcal = calculateExerciseAddedKcal;
export const exerciseTotalKcal = calculateExerciseTotalKcal;
export const dailyExerciseSummary = summarizeDailyExercises;
export const weeklyExerciseSummary = summarizeRecent7DayExercises;
export const exerciseStreak = calculateExerciseStreak;
export const targetCaloriesWithExercise = applyExerciseToTargetCalories;
export const calorieBalanceWithExercise = calculateCalorieBalanceWithExercise;
