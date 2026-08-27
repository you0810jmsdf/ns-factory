// 食事画面。当日の4スロット、食品検索、手入力、よく食べたものを扱う。
import {
  STORES,
  addMeal,
  addMyFood,
  deleteMeal,
  getAll,
  updateMeal
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
import {
  MEAL_SLOT_LABELS,
  addFrequentMeal,
  detectMealSlot,
  frequentMeals,
  showUndoToast,
  undoMeal
} from './../quick-entry.js';
import { recordUnknownFood } from './../unknown-foods.js';

const SLOTS = Object.freeze([
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'dinner', label: '夕' },
  { key: 'snack', label: '間食' }
]);

const SLOT_LABELS = Object.freeze(Object.fromEntries(SLOTS.map((slot) => [slot.key, slot.label])));
let activeMealDate = null;

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

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function normalizeMealDate(value) {
  const today = todayString();
  if (!isDateString(value)) {
    return today;
  }
  return String(value) > today ? today : String(value);
}

function getActiveMealDate() {
  activeMealDate = normalizeMealDate(activeMealDate || todayString());
  return activeMealDate;
}

function createDateSelector(selectedDate, onChange) {
  const today = todayString();
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '記録日'));

  const field = document.createElement('label');
  field.className = 'field';
  const label = el('span', 'field-label', '日付');
  const input = document.createElement('input');
  input.className = 'input';
  input.type = 'date';
  input.value = selectedDate;
  input.max = today;
  input.addEventListener('change', () => {
    onChange(normalizeMealDate(input.value));
  });
  field.append(label, input);

  const buttons = el('div', 'chip-row');
  const prev = el('button', 'button', '前日');
  prev.type = 'button';
  prev.addEventListener('click', () => onChange(addDays(selectedDate, -1)));

  const todayButton = el('button', selectedDate === today ? 'button is-active' : 'button', '今日');
  todayButton.type = 'button';
  todayButton.addEventListener('click', () => onChange(today));

  const next = el('button', 'button', '翌日');
  next.type = 'button';
  next.disabled = selectedDate >= today;
  next.addEventListener('click', () => onChange(normalizeMealDate(addDays(selectedDate, 1))));
  buttons.append(prev, todayButton, next);

  card.append(field, buttons);
  return card;
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

/**
 * 1人前の目安を持つ食品かどうか。
 * @param {object} food 食品。
 * @returns {boolean} serving があれば true。
 */
function hasServing(food) {
  return Boolean(food && food.serving && Number.isFinite(food.serving.g) && food.serving.g > 0);
}

/**
 * 既定量（g）を返す。1人前の目安があればその量、無ければ per。
 * ⛔ 利用者は「g」で量を判断できない（2026-08-24 要望）。
 *    serving がある食品は必ず1人前を既定にすること。
 * @param {object} food 食品。
 * @returns {number} 既定量。
 */
function defaultServingAmount(food) {
  if (hasServing(food)) {
    return food.serving.g;
  }
  return Number.isFinite(food?.per) ? food.per : 100;
}

/**
 * 量を人間の言葉で表す。「茶碗1杯（150g）」のように返す。
 * serving が無い食品は「150g」のようにg表記のまま返す。
 * @param {object} food 食品。
 * @param {number} amount 量（g または ml）。
 * @returns {string} 表示文字列。
 */
function servingText(food, amount) {
  const unit = food?.unit || 'g';
  if (!hasServing(food)) {
    return `${numberText(amount)}${unit}`;
  }
  const ratio = amount / food.serving.g;
  const label = food.serving.label || '1人前';
  // ちょうど1人前なら倍率を書かない。0.5/1.5/2 は「×」で表す。
  const ratioText = Math.abs(ratio - 1) < 0.01
    ? label
    : `${label} ×${Number(ratio.toFixed(2))}`;
  return `${ratioText}（${Math.round(amount)}${unit}）`;
}

/**
 * 人前ボタン（×0.5 / ×1 / ×1.5 / ×2）を作る。
 * @param {object} food 食品。
 * @param {number} current 現在量。
 * @param {(amount:number)=>void} onPick 量が選ばれたときの処理。
 * @returns {HTMLElement|null} serving が無ければ null。
 */
function createServingButtons(food, current, onPick) {
  if (!hasServing(food)) {
    return null;
  }
  const wrap = el('div', 'chip-row');
  [0.5, 1, 1.5, 2].forEach((ratio) => {
    const amount = Math.round(food.serving.g * ratio);
    const button = el('button', 'button', ratio === 1 ? food.serving.label : `×${ratio}`);
    button.type = 'button';
    if (Math.abs(current - amount) < 0.5) {
      button.classList.add('is-active');
    }
    button.addEventListener('click', () => onPick(amount));
    wrap.append(button);
  });
  return wrap;
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

/**
 * テキストを食品語に分割する。区切りは空白（半角・全角）・読点・カンマ。
 * 「と」は語の一部（トマト等）を壊すため、この段階では分割しない。
 * @param {string} text 入力文。
 * @returns {string[]} 語の配列。
 */
function splitFoodText(text) {
  return String(text || '')
    .split(/[\s　、,，]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

/**
 * 1語を食品DB・マイメニューに照合する。ヒットしなければ「と」で再分割して再試行する。
 * 「ごはんと納豆」→ まず全体で探し、無ければ「ごはん」「納豆」に割って探す。
 * 「トマト」は全体でヒットするので壊れない。
 * @param {string} word 入力語。
 * @param {Array} foods 食品DB。
 * @param {Array} myfoods マイメニュー。
 * @returns {Array<{word:string, food:object|null}>} 解決結果（1語が複数に割れることがある）。
 */
function resolveFoodWord(word, foods, myfoods) {
  const found = matchFoodEntry(word, foods, myfoods);
  if (found) {
    return [{ word, food: found }];
  }
  if (word.includes('と')) {
    const parts = word.split('と').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const resolved = parts.map((part) => ({ word: part, food: matchFoodEntry(part, foods, myfoods) }));
      // 1つでもヒットしたら分割を採用する（全滅なら元の語のまま残す）
      if (resolved.some((r) => r.food)) {
        return resolved;
      }
    }
  }
  return [{ word, food: null }];
}

/**
 * 名称・かなの部分一致で1件選ぶ。複数ヒット時は名前が短いものを優先する。
 * @param {string} word 入力語。
 * @param {Array} foods 食品DB。
 * @param {Array} myfoods マイメニュー。
 * @returns {object|null} ヒットした食品。
 */
function matchFoodEntry(word, foods, myfoods) {
  const query = normalizeSearchText(word);
  if (!query) {
    return null;
  }
  const pool = [
    ...(myfoods || []).map(normalizeMyFood),
    ...(foods || [])
  ];
  const hits = pool.filter((food) =>
    normalizeSearchText(food.name).includes(query) ||
    normalizeSearchText(food.kana || '').includes(query));
  if (!hits.length) {
    return null;
  }
  // 完全一致 > 前方一致 > 部分一致 の順で選ぶ。
  // 「ごはん」で「玄米ごはん」（部分一致・短名）より「ごはん（白米）」（前方一致）を優先するため。
  const rank = (food) => {
    const n = normalizeSearchText(food.name);
    const k = normalizeSearchText(food.kana || '');
    if (n === query || k === query) return 0;
    if (n.startsWith(query) || k.startsWith(query)) return 1;
    return 2;
  };
  hits.sort((a, b) => rank(a) - rank(b) || a.name.length - b.name.length);
  return hits[0];
}

/**
 * 過去記録から同じ食品の前回量を探す。無ければ食品の既定量（per）。
 * @param {object} food 食品。
 * @param {Array} allMeals 全食事記録。
 * @returns {number} 既定量。
 */
function defaultAmountFor(food, allMeals) {
  // ⛔ 1人前の目安がある食品は必ず目安を既定にすること。
  //    過去記録（100g等の機械的な値）を優先すると「1パック ×2.22」のような
  //    不自然な表示になり、量が分かるという利点が失われる（2026-08-24 実測）。
  if (hasServing(food)) {
    const serving = food.serving.g;
    const past = (allMeals || []).filter((m) => m.name === food.name && Number.isFinite(m.amount));
    if (past.length) {
      // 過去に「1人前のちょうど0.5/1/1.5/2倍」で記録していればそれを尊重する
      const last = past[past.length - 1].amount;
      const ratio = last / serving;
      if ([0.5, 1, 1.5, 2].some((r) => Math.abs(ratio - r) < 0.01)) {
        return last;
      }
    }
    return serving;
  }
  const past = (allMeals || []).filter((m) => m.name === food.name && Number.isFinite(m.amount));
  if (past.length) {
    return past[past.length - 1].amount;
  }
  return defaultServingAmount(food);
}

/**
 * 「テキストでまとめて記録」カード。
 * 「ごはん 納豆 カフェオレ」と打つと端末内でDB照合し、1ボタンでまとめて追加する。
 * DBに無い語はテキストのまま kcal=null で記録する（0にしない。集計を歪めるため）。
 * 外部への送信は一切行わない。
 * @returns {HTMLElement} カード要素。
 */
function createTextEntryCard(ctx, foodApi, myfoods, allMeals, mealDate, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'テキストでまとめて記録'));

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.placeholder = '例: ごはん 納豆 カフェオレ';
  input.setAttribute('aria-label', '食べたものをまとめて入力');

  const chipArea = el('div', 'stack');
  const slotNote = el('span', 'muted', '');
  const submit = el('button', 'button button-primary', 'まとめて記録');
  submit.type = 'button';
  submit.hidden = true;

  let resolvedItems = [];
  // どの食事に入れるかを先に選ぶ。初期値は時刻からの自動判定。
  // ⛔ 自動判定のみにしないこと。夜にまとめて1日分を入力する使い方だと、
  //    全部「夕」に入ってしまう（2026-08-24 利用者指摘）。
  let textSlot = detectMealSlot();

  const slotTabsHolder = el('div');
  const redrawSlotTabs = () => {
    slotTabsHolder.replaceChildren(createSlotTabs(textSlot, (slot) => {
      textSlot = slot;
      redrawSlotTabs();
      renderSlotNote();
    }));
  };
  const renderSlotNote = () => {
    slotNote.textContent = resolvedItems.length
      ? `${mealDate} ${MEAL_SLOT_LABELS[textSlot]}の食事として記録します`
      : '';
  };

  const renderChips = () => {
    chipArea.replaceChildren();
    if (!resolvedItems.length) {
      submit.hidden = true;
      slotNote.textContent = '';
      return;
    }
    resolvedItems.forEach((item) => {
      const chip = el('div', 'banner');
      const line = el('div', 'stack');
      if (item.food) {
        const kcalPerAmount = Math.round((item.food.kcal || 0) * item.amount / (item.food.per || 100));
        line.append(el('strong', '', `✔ ${item.food.name}`));
        // 量は「茶碗1杯（150g）」のように人間の言葉で見せる（gだけでは判断できないため）
        line.append(el('span', 'muted', `${servingText(item.food, item.amount)} / 約${kcalPerAmount}kcal`));
        const servingButtons = createServingButtons(item.food, item.amount, (amount) => {
          item.amount = amount;
          renderChips();
        });
        if (servingButtons) {
          line.append(servingButtons);
        } else {
          // 1人前の目安が無い food（調味料など）は従来どおりgで入力する
          const amountWrap = el('span', 'muted');
          const amountInput = document.createElement('input');
          amountInput.type = 'number';
          amountInput.className = 'input input-small';
          amountInput.setAttribute('inputmode', 'decimal');
          amountInput.value = String(item.amount);
          amountInput.addEventListener('change', () => {
            const v = ctx.normalizeNumberInput(amountInput.value, { min: 0.1, max: 50 });
            if (Number.isFinite(v)) {
              item.amount = v;
              renderChips();
            }
          });
          amountWrap.append(amountInput, document.createTextNode(unitLabel(item.food)));
          line.append(amountWrap);
        }
      } else {
        line.append(el('strong', '', `? ${item.word}`));
        line.append(el('span', 'muted', 'そのまま記録します（カロリー未計算・あとで設定できます）'));
      }
      chip.append(line);
      chipArea.append(chip);
    });
    renderSlotNote();
    submit.hidden = false;
  };

  input.addEventListener('input', () => {
    const words = splitFoodText(input.value);
    resolvedItems = words
      .flatMap((word) => resolveFoodWord(word, foodApi.BUILTIN_FOODS, myfoods))
      .map((r) => r.food
        ? { word: r.word, food: r.food, amount: defaultAmountFor(r.food, allMeals) }
        : { word: r.word, food: null });
    renderChips();
  });

  submit.addEventListener('click', async () => {
    if (!resolvedItems.length) {
      return;
    }
    // ⛔ ここで detectMealSlot() を呼ばないこと。利用者がタブで選んだ食事を無視してしまう。
    const slot = textSlot;

    // 一覧に無かった品目名を控える（一覧を増やすため）。
    // ⛔ 入力中（input イベント）で呼ばないこと。打ちかけの文字まで集めてしまう。
    //    実際に記録した語だけを対象にする。
    recordUnknownFood(resolvedItems.filter((it) => !it.food).map((it) => it.word));
    const addedIds = [];
    for (const item of resolvedItems) {
      const record = item.food
        ? createMealRecordFromFood(item.food, item.amount, mealDate, slot)
        : { date: mealDate, slot, name: item.word, amount: null, unit: '', kcal: null, p: null, f: null, c: null, foodId: null };
      const id = await addMeal(record);
      addedIds.push(id);
    }
    const count = resolvedItems.length;
    input.value = '';
    resolvedItems = [];
    renderChips();
    showUndoToast(ctx, `${mealDate} ${MEAL_SLOT_LABELS[slot]}に${count}件追加しました`, async () => {
      for (const id of addedIds) {
        await deleteMeal(id);
      }
    }, onChanged);
    await onChanged();
  });

  // 「どの食事か」を先に選んでから打つ流れにする（利用者の指摘）
  redrawSlotTabs();
  card.append(el('span', 'muted', 'どの食事に入れますか？'), slotTabsHolder, input, chipArea, slotNote, submit);

  // 写真解析ページへの導線。
  // ⛔ 一般公開版では出さないこと。写真解析はAPI従量課金で、利用者数に比例して費用が増える。
  //    表示条件: ?photo=on を一度開いた端末、または既に合言葉を持っている端末（＝家族）だけ。
  if (isPhotoFeatureEnabled()) {
    const photoLink = document.createElement('a');
    photoLink.href = `./photo.html?date=${encodeURIComponent(mealDate)}`;
    photoLink.className = 'muted';
    photoLink.textContent = '📷 写真から入力する（写真1枚を解析サーバーへ送ります）';
    card.append(photoLink);
  }
  return card;
}

/**
 * 写真解析機能を使える端末かどうか。
 * `?photo=on` で有効化し、以後この端末では表示し続ける。
 * 合言葉を既に持っている端末（家族が使用済み）も有効とみなす。
 * @returns {boolean} 有効なら true。
 */
function isPhotoFeatureEnabled() {
  try {
    if (new URLSearchParams(location.search).get('photo') === 'on') {
      localStorage.setItem('diet_photo_enabled', '1');
      return true;
    }
    const flag = localStorage.getItem('diet_photo_enabled');
    if (flag === '1') return true;
    // ⛔ '0' を無視しないこと。設定画面でOFFにした意思を、合言葉の有無で上書きしてしまう。
    if (flag === '0') return false;
    return Boolean(localStorage.getItem('diet_photo_token'));
  } catch (e) {
    // プライベートブラウズ等で localStorage が使えない場合は非表示（安全側）
    return false;
  }
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

function createTotalCard(dayMeals, pfcTarget) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'この日の合計'));
  const summary = summarizeMeals(dayMeals);
  card.append(el('p', 'number-large', `${Math.round(summary.kcal)} kcal`));
  // カロリー未設定（テキスト記録）の件数。集計に入っていないことを隠さない。
  const uncounted = (dayMeals || []).filter((m) => !Number.isFinite(m.kcal)).length;
  if (uncounted > 0) {
    card.append(el('p', 'muted', `＋未計算${uncounted}件（カロリー未設定の記録は合計に含まれていません）`));
  }
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

function createSlotSummary(dayMeals) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'スロット小計'));
  SLOTS.forEach((slot) => {
    const row = el('div', 'banner');
    const summary = summarizeMeals(dayMeals.filter((record) => record.slot === slot.key));
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
  if (!Number.isFinite(record.kcal)) {
    // テキスト記録などカロリー未設定の行。0kcalと表示せず、後から設定できる導線を出す。
    body.append(el('span', 'badge badge-warning', 'カロリー未計算'));
    const setButton = el('button', 'button', 'カロリーを設定');
    setButton.type = 'button';
    setButton.addEventListener('click', () => {
      setButton.hidden = true;
      const wrap = el('span', 'muted');
      const kcalInput = document.createElement('input');
      kcalInput.type = 'number';
      kcalInput.className = 'input input-small';
      kcalInput.setAttribute('inputmode', 'decimal');
      kcalInput.placeholder = 'kcal';
      kcalInput.style.width = '6em';
      const saveButton = el('button', 'button button-primary', '保存');
      saveButton.type = 'button';
      saveButton.addEventListener('click', async () => {
        const v = ctx.normalizeNumberInput(kcalInput.value, { min: 0, max: 10000 });
        if (!Number.isFinite(v)) {
          ctx.showToast('kcalを入力してください', { tone: 'warning' });
          return;
        }
        await updateMeal({ ...record, kcal: v });
        ctx.showToast('カロリーを設定しました', { tone: 'success' });
        await onDeleted();
      });
      wrap.append(kcalInput, saveButton);
      body.append(wrap);
      kcalInput.focus();
    });
    body.append(setButton);
  } else {
    body.append(el('span', 'muted', `${numberText(record.amount)}${record.unit || ''} / ${Math.round(record.kcal || 0)} kcal`));
    body.append(el('span', 'muted', `P ${numberText(record.p)}g / F ${numberText(record.f)}g / C ${numberText(record.c)}g`));
  }

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

function createSelectedSlotCard(ctx, dayMeals, selectedSlot, onAdd, onDeleted) {
  const card = el('section', 'card stack');
  const title = el('h2', 'card-title', `${SLOT_LABELS[selectedSlot]}の食事`);
  const addButton = el('button', 'button button-primary', '＋追加');
  addButton.type = 'button';
  addButton.addEventListener('click', onAdd);
  card.append(title, addButton);

  const selectedMeals = dayMeals.filter((record) => record.slot === selectedSlot);
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

async function addFrequentMealWithUndo(record, ctx, mealDate, onChanged) {
  const slot = detectMealSlot();
  const id = await addFrequentMeal(record, {
    date: mealDate,
    slot
  });
  await onChanged();
  showUndoToast(
    ctx,
    `${mealDate} ${MEAL_SLOT_LABELS[slot]}に${record.name}を追加しました`,
    () => undoMeal(id),
    onChanged
  );
}

function createFrequentItems(allMeals, ctx, mealDate, onChanged) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'よく食べたもの'));
  const autoSlot = detectMealSlot();
  card.append(el('p', 'muted', `タップすると${mealDate} ${MEAL_SLOT_LABELS[autoSlot]}の食事として追加します`));
  const items = frequentMeals(allMeals, 10);

  if (!items.length) {
    card.append(el('p', 'muted', '記録が増えると、ここからワンタップで再追加できます'));
    return card;
  }

  const grid = el('div', 'grid-2');
  items.forEach((item) => {
    const record = item.latest;
    const button = el('button', 'button', record.name);
    button.type = 'button';
    button.addEventListener('click', () => addFrequentMealWithUndo(record, ctx, mealDate, onChanged));
    grid.append(button);
  });
  card.append(grid);
  return card;
}

function createYesterdayButton(allMeals, today, ctx, onChanged) {
  const button = el('button', 'button', '前日と同じ');
  button.type = 'button';
  button.addEventListener('click', async () => {
    const yesterday = addDays(today, -1);
    const records = allMeals.filter((record) => record.date === yesterday);
    if (!records.length) {
      ctx.showToast('前日の食事記録がありません', { tone: 'warning' });
      return;
    }
    const ok = await ctx.confirmDialog(`${yesterday} の食事 ${records.length}件を ${today} へコピーしますか？`);
    if (!ok) {
      return;
    }
    await Promise.all(records.map((record) => {
      const { id, ...copy } = record;
      return addMeal({ ...copy, date: today });
    }));
    ctx.showToast('前日の食事をコピーしました', { tone: 'success' });
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
  // 既定量は1人前（目安があるとき）。gが分からなくても選べるよう人前ボタンも出す。
  const defaultAmount = defaultServingAmount(food);
  amountInput.value = defaultAmount;
  amountInput.nextElementSibling.textContent = food.unit || 'g';
  const servingButtons = createServingButtons(food, defaultAmount, (amount) => {
    amountInput.value = amount;
    setServingHint(selectionBox, food, amount);
  });
  if (servingButtons) {
    selectionBox.append(servingButtons);
    setServingHint(selectionBox, food, defaultAmount);
    amountInput.addEventListener('input', () => {
      const v = Number(amountInput.value);
      if (Number.isFinite(v)) {
        setServingHint(selectionBox, food, v);
      }
    });
  }
}

/**
 * 選択中の量を「茶碗1杯（150g）」形式で表示する行を更新する。
 * @param {HTMLElement} box 表示先。
 * @param {object} food 食品。
 * @param {number} amount 量。
 * @returns {void}
 */
function setServingHint(box, food, amount) {
  let hint = box.querySelector('.serving-hint');
  if (!hint) {
    hint = el('span', 'muted serving-hint');
    box.append(hint);
  }
  const kcal = Math.round((food.kcal || 0) * amount / (food.per || 100));
  hint.textContent = `${servingText(food, amount)} → 約${kcal}kcal`;
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
        <input class="input" name="amount" type="number" inputmode="decimal" step="0.1" min="0.1" placeholder="空欄なら1人前">
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
        <input class="input" name="amount" type="number" inputmode="decimal" step="0.1" min="0.1" placeholder="空欄なら1人前">
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
    // ⛔ 量が空欄でも弾かないこと。g入力は利用者にとって苦痛（2026-08-24 指摘）。
    //    空欄なら「大人1人前」の目安で記録する。
    let amount = ctx.normalizeNumberInput(amountForm.elements.amount.value, { min: 0.1, max: 50 });
    if (!Number.isFinite(amount)) {
      amount = defaultServingAmount(pickedFood);
    }
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
    const amount = ctx.normalizeNumberInput(manualForm.elements.amount.value, { min: 0.1, max: 50 });
    const unit = manualForm.elements.unit.value.trim() || 'g';
    const record = {
      date: today,
      slot: getSelectedSlot(),
      name,
      amount,
      unit,
      kcal: ctx.normalizeNumberInput(manualForm.elements.kcal.value, { min: 0, max: 10000 }),
      p: ctx.normalizeNumberInput(manualForm.elements.p.value, { min: 0, max: 1000 }),
      f: ctx.normalizeNumberInput(manualForm.elements.f.value, { min: 0, max: 1000 }),
      c: ctx.normalizeNumberInput(manualForm.elements.c.value, { min: 0, max: 1000 }),
      foodId: null
    };
    // 量は空欄可（g入力は苦痛という指摘への対応）。名前とkcalだけ必須にする。
    if (!name || !Number.isFinite(record.kcal)) {
      ctx.showToast('食品名とkcalを入力してください', { tone: 'warning' });
      return;
    }
    await addMeal(record);
    if (manualForm.elements.saveMyFood.checked) {
      await addMyFood({
        name,
        unit,
        // 量が空欄のときは「1人前ぶんのkcal」としてマイメニューに保存する。
        // per に null が入ると次回の計算が壊れるため必ず数値にする。
        per: Number.isFinite(amount) ? amount : 1,
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
  const selectedDate = getActiveMealDate();
  const [allMeals, myfoods, weights, exercises] = await Promise.all([
    getAll(STORES.meals),
    getAll(STORES.myfoods),
    getAll(STORES.weights),
    getAll(STORES.exercises)
  ]);

  let selectedSlot = detectMealSlot();
  const dayMeals = allMeals.filter((record) => record.date === selectedDate);
  const pfcTarget = calculateMealTargets(ctx.profile, weights, exercises, selectedDate);

  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  const refresh = async () => {
    ctx.navigate('meal');
  };
  const changeDate = (date) => {
    activeMealDate = normalizeMealDate(date);
    refresh();
  };
  const getSelectedSlot = () => selectedSlot;

  stack.append(createDateSelector(selectedDate, changeDate));
  // テキスト入力を最上部へ（「開いてすぐ打てる」ことを優先）
  stack.append(createTextEntryCard(ctx, foodApi, myfoods, allMeals, selectedDate, refresh));
  stack.append(createTotalCard(dayMeals, pfcTarget));
  stack.append(createSlotSummary(dayMeals));

  const actionCard = el('section', 'card stack');
  actionCard.append(el('h2', 'card-title', '追加ショートカット'));
  actionCard.append(createYesterdayButton(allMeals, selectedDate, ctx, refresh));
  stack.append(actionCard);

  const tabsHolder = el('div');
  const slotHolder = el('div');
  const redrawSlot = () => {
    tabsHolder.replaceChildren(createSlotTabs(selectedSlot, (slot) => {
      selectedSlot = slot;
      redrawSlot();
    }));
    slotHolder.replaceChildren(createSelectedSlotCard(ctx, dayMeals, selectedSlot, () => {
      ctx.openModal('meal-add-modal');
    }, refresh));
  };
  redrawSlot();

  stack.append(tabsHolder, slotHolder);
  stack.append(createFrequentItems(allMeals, ctx, selectedDate, refresh));
  stack.append(createMealModal(ctx, {
    today: selectedDate,
    getSelectedSlot,
    foodApi,
    myfoods,
    onChanged: refresh
  }));

  return fragment;
}
