// 設定画面。プロフィール、計算プレビュー、バックアップを扱う。
import {
  STORES,
  clearStore,
  exportAll,
  getAll,
  importAll,
  saveProfile
} from './../db.js';
import {
  calculateBMR,
  calculatePFCTarget,
  calculateTargetCalories,
  calculateTDEE,
  calculateWaterGoalMl,
  pickDailyWeight
} from './../calc.js';
import {
  clearUnknownFoods,
  isSendEnabled,
  listUnknownFoods,
  sendPending,
  setSendEnabled
} from './../unknown-foods.js';

const ACTIVITY_LEVELS = Object.freeze([
  { value: '1.5', label: '低い（1.50）' },
  { value: '1.75', label: 'ふつう（1.75）' },
  { value: '2', label: '高い（2.00）' }
]);

// ⛔ この文面を実態より安全に書かないこと。送信する項目を増やしたら必ずここも直す。
//    「一切送信しません」と書けなくなった経緯: 内蔵の食品一覧に無い品目名を集めて
//    一覧を増やすため、品目名だけを送るようにした（2026-08-26）。
const PRIVACY_TEXT = '体重・食事・水分・運動の記録は、すべてお使いの端末の中だけに保存されます。これらがインターネットへ送られることはありません。アプリを削除するとデータも消えるため、定期的にバックアップを保存してください。';
const PRIVACY_EXCEPTIONS = [
  '一覧に無かった品目名（例:「切り干し大根」）だけを送ります。一覧を増やして、次から自動でカロリーが出るようにするためです。食べた量・カロリー・日時・体重は送りません。下のスイッチでいつでも止められます。',
  '「写真から入力する」を使うときだけ、選んだ写真1枚を解析のため送ります（解析後は保存されません）。使わなければ送信は起きません。'
];
const EXERCISE_BALANCE_NOTICE = '身体活動レベルに「ふつう」「高い」を選んでいる場合、その中に既に運動分が含まれています。ここをONにすると運動分を二重に数えて、食べてよい量を多く見積もる恐れがあります。ONにするなら身体活動レベルを「低い（1.50）」にしてください。';

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

function compactDate() {
  return todayString().replaceAll('-', '');
}

function numberText(value, digits = 0, fallback = '--') {
  return Number.isFinite(value) ? value.toFixed(digits) : fallback;
}

function latestWeightValue(weights) {
  const record = [...weights]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .find((item) => Number.isFinite(pickDailyWeight(item).value));
  return record ? pickDailyWeight(record).value : null;
}

function createInput(name, type = 'text', options = {}) {
  const input = document.createElement('input');
  input.className = 'input';
  input.name = name;
  input.type = type;
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

function createField(label, control, help = '') {
  const wrapper = el('label', 'field');
  wrapper.append(el('span', 'field-label', label));
  wrapper.append(control);
  if (help) {
    wrapper.append(el('span', 'muted', help));
  }
  return wrapper;
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
  row.append(el('strong', '', `${numberText(actual, 0)} / ${numberText(target, 0)}${unit}`));
  return row;
}

function activityValue(value) {
  const number = Number(value);
  if (number === 2) {
    return 2.0;
  }
  if (number === 1.75) {
    return 1.75;
  }
  return 1.5;
}

function readProfileForm(form, ctx, existing = {}) {
  return {
    ...existing,
    id: 'me',
    heightCm: ctx.normalizeNumberInput(form.elements.heightCm.value, { min: 50, max: 250 }),
    sex: form.elements.sex.value,
    birth: form.elements.birth.value,
    activityLevel: activityValue(form.elements.activityLevel.value),
    targetWeight: ctx.normalizeNumberInput(form.elements.targetWeight.value, { min: 10, max: 300 }),
    targetDate: form.elements.targetDate?.value || null,
    bmrFormula: form.elements.bmrFormula?.value === 'mifflin' ? 'mifflin' : 'ganpule',
    waterGoalMl: ctx.normalizeNumberInput(form.elements.waterGoalMl?.value, { min: 200, max: 10000 }),
    exerciseGoalMinPerWeek: ctx.normalizeNumberInput(form.elements.exerciseGoalMinPerWeek?.value, {
      min: 10,
      max: 2000,
      fallback: 150
    }),
    countExerciseInBalance: Boolean(form.elements.countExerciseInBalance?.checked)
  };
}

function validateRequiredProfile(profile) {
  return Number.isFinite(profile.heightCm) &&
    ['male', 'female'].includes(profile.sex) &&
    Boolean(profile.birth) &&
    Number.isFinite(profile.targetWeight);
}

function createPrivacyCard() {
  const card = el('section', 'banner');
  card.append(el('strong', '', 'プライバシー'));
  card.append(el('span', '', PRIVACY_TEXT));
  // ⛔ 例外の明示を消さないこと。送信があるのに「一切送りません」とだけ書くのは虚偽になる。
  card.append(el('strong', '', 'インターネットへ送るもの'));
  PRIVACY_EXCEPTIONS.forEach((text, i) => {
    card.append(el('span', 'muted', `${i + 1}. ${text}`));
  });
  return card;
}

/**
 * ホーム画面に追加済み（standalone）で開かれているかを判定する。
 * iOS Safari は navigator.standalone、その他は display-mode: standalone で分かる。
 * @returns {boolean} アイコンから起動していれば true。
 */
function isStandalone() {
  if (typeof navigator !== 'undefined' && navigator.standalone === true) {
    return true;
  }
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * 端末に合わせたホーム画面追加の手順を返す。
 * @returns {{label: string, steps: string[]}} 見出しと手順。
 */
function homeScreenGuide() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS) {
    return {
      label: 'iPhone / iPad の場合',
      steps: [
        '画面下の共有ボタン（四角に上向き矢印）を押す',
        'メニューを下にスクロールして「ホーム画面に追加」を選ぶ',
        '右上の「追加」を押す',
        'ホーム画面にできたアイコンから開き直す'
      ]
    };
  }
  if (isAndroid) {
    return {
      label: 'Android の場合',
      steps: [
        '画面右上の「⋮」を押す',
        '「ホーム画面に追加」または「アプリをインストール」を選ぶ',
        '「追加」または「インストール」を押す',
        'ホーム画面にできたアイコンから開き直す'
      ]
    };
  }
  return {
    label: 'パソコンの場合',
    steps: [
      'アドレスバー右側のインストールアイコンを押す',
      '「インストール」を選ぶ'
    ]
  };
}

/**
 * ホーム画面追加をすすめる案内を作る。既にアイコン起動なら null を返す。
 * ⛔ iPhone では Safari で開いた場合とホーム画面アイコンから開いた場合で
 *    保存領域が別扱いになることがある。先にアイコンを作ってから設定しないと
 *    「毎回セットアップし直し」になるため、この案内を消さないこと（2026-08-24 苦情）。
 * @param {object} ctx viewコンテキスト。
 * @returns {HTMLElement|null} 案内要素。
 */
function createHomeScreenNotice(ctx) {
  if (isStandalone()) {
    return null;
  }
  const guide = homeScreenGuide();
  const box = el('div', 'banner banner-warning stack');
  box.append(el('strong', '', 'さきにホーム画面へ追加してください'));
  box.append(el('span', '', 'いまブラウザで開いています。このまま設定すると、あとでホーム画面のアイコンから開いたときに、もう一度設定が必要になることがあります。先にアイコンを作って、そこから開き直してください。'));
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = guide.label + '｜追加のしかたを見る';
  details.append(summary);
  const list = document.createElement('ol');
  list.className = 'stack';
  guide.steps.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    list.append(li);
  });
  details.append(list);
  box.append(details);
  box.append(el('span', 'muted', 'このまま続けても使えます。その場合はブラウザから開く使い方に統一してください。'));
  return box;
}

/**
 * バックアップから復元する導線を作る。
 * ⛔ 初回セットアップ画面から復元できないと、データが消えた利用者が
 *    自力で戻す手段を失う。この導線を消さないこと。
 * @param {object} ctx viewコンテキスト。
 * @returns {HTMLElement} 復元セクション。
 */
function createSetupRestore(ctx) {
  const box = el('section', 'card stack');
  box.append(el('strong', '', '以前に使ったことがある方へ'));
  box.append(el('span', 'muted', '前に保存したバックアップファイルがあれば、記録をそのまま元に戻せます。'));
  const file = createInput('restoreFile', 'file', { accept: 'application/json,.json' });
  const button = el('button', 'button', 'バックアップから復元する');
  button.type = 'button';
  const status = el('span', 'muted', '');
  button.addEventListener('click', async () => {
    const picked = file.files && file.files[0];
    if (!picked) {
      ctx.showToast('バックアップファイルを選んでください', { tone: 'warning' });
      return;
    }
    const agreed = await ctx.confirmDialog('バックアップを読み込みます。よろしいですか？');
    if (!agreed) {
      return;
    }
    try {
      status.textContent = '読み込んでいます…';
      const text = await picked.text();
      await importAll(text, 'merge', { skipConfirm: true });
      await ctx.refreshProfile();
      status.textContent = '';
      ctx.showToast('バックアップを読み込みました', { tone: 'success' });
      ctx.navigate('home');
    } catch (error) {
      status.textContent = '';
      ctx.showToast('このファイルは読み込めませんでした', { tone: 'danger' });
    }
  });
  box.append(createField('バックアップJSON', file), button, status);
  return box;
}

function createSetupMode(ctx) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '初回セットアップ'));
  const notice = createHomeScreenNotice(ctx);
  if (notice) {
    card.append(notice);
  }
  card.append(el('p', 'muted', '身長、性別、生年月日、目標体重だけを登録します。'));

  const form = document.createElement('form');
  form.className = 'stack';
  const height = createInput('heightCm', 'number', { inputmode: 'decimal', step: '0.1', min: '1', required: '' });
  const sex = createSelect('sex', [
    { value: '', label: '選択してください' },
    { value: 'male', label: '男性' },
    { value: 'female', label: '女性' }
  ]);
  const birth = createInput('birth', 'date', { required: '' });
  const targetWeight = createInput('targetWeight', 'number', { inputmode: 'decimal', step: '0.1', min: '1', required: '' });
  const submit = el('button', 'button button-primary', '保存して始める');
  submit.type = 'submit';

  form.append(
    createField('1. 身長 cm', height),
    createField('2. 性別', sex),
    createField('3. 生年月日', birth),
    createField('4. 目標体重 kg', targetWeight),
    submit
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const profile = {
      id: 'me',
      heightCm: ctx.normalizeNumberInput(height.value, { min: 50, max: 250 }),
      sex: sex.value,
      birth: birth.value,
      targetWeight: ctx.normalizeNumberInput(targetWeight.value, { min: 10, max: 300 }),
      targetDate: null,
      activityLevel: 1.5,
      bmrFormula: 'ganpule',
      waterGoalMl: null,
      countExerciseInBalance: false,
      exerciseGoalMinPerWeek: 150
    };
    if (!validateRequiredProfile(profile)) {
      ctx.showToast('必須項目を入力してください', { tone: 'warning' });
      return;
    }
    await saveProfile(profile);
    await ctx.refreshProfile();
    ctx.closeModal('setup-modal');
    ctx.showToast('初回セットアップを保存しました', { tone: 'success' });
    ctx.navigate('home');
  });

  card.append(form);

  // データが消えた利用者がその場で戻せるようにする（復旧導線）
  const wrapper = el('div', 'stack');
  wrapper.append(card, createSetupRestore(ctx));
  return wrapper;
}

function fillProfileForm(form, profile) {
  form.elements.heightCm.value = Number.isFinite(profile?.heightCm) ? String(profile.heightCm) : '';
  form.elements.sex.value = profile?.sex || 'male';
  form.elements.birth.value = profile?.birth || '';
  form.elements.activityLevel.value = String(profile?.activityLevel || 1.5);
  form.elements.targetWeight.value = Number.isFinite(profile?.targetWeight) ? String(profile.targetWeight) : '';
  form.elements.targetDate.value = profile?.targetDate || '';
  form.elements.bmrFormula.value = profile?.bmrFormula || 'ganpule';
  form.elements.waterGoalMl.value = Number.isFinite(profile?.waterGoalMl) ? String(profile.waterGoalMl) : '';
  form.elements.exerciseGoalMinPerWeek.value = Number.isFinite(profile?.exerciseGoalMinPerWeek) ? String(profile.exerciseGoalMinPerWeek) : '150';
  form.elements.countExerciseInBalance.checked = profile?.countExerciseInBalance === true;
}

function createProfileForm(ctx, profile, weights, onSaved) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '基本設定'));
  const form = document.createElement('form');
  form.className = 'stack';

  const height = createInput('heightCm', 'number', { inputmode: 'decimal', step: '0.1', min: '1', required: '' });
  const sex = createSelect('sex', [
    { value: 'male', label: '男性' },
    { value: 'female', label: '女性' }
  ]);
  const birth = createInput('birth', 'date', { required: '' });
  const activityLevel = createSelect('activityLevel', ACTIVITY_LEVELS);
  const targetWeight = createInput('targetWeight', 'number', { inputmode: 'decimal', step: '0.1', min: '1', required: '' });
  const targetDate = createInput('targetDate', 'date');
  const bmrFormula = createSelect('bmrFormula', [
    { value: 'ganpule', label: 'Ganpule式' },
    { value: 'mifflin', label: 'Mifflin-St Jeor式' }
  ]);
  const waterGoalMl = createInput('waterGoalMl', 'number', { inputmode: 'decimal', step: '1', min: '1' });
  const exerciseGoalMinPerWeek = createInput('exerciseGoalMinPerWeek', 'number', { inputmode: 'decimal', step: '1', min: '1' });
  const countExerciseInBalance = createInput('countExerciseInBalance', 'checkbox');
  countExerciseInBalance.className = '';

  const exerciseToggle = el('label', 'field');
  exerciseToggle.append(el('span', 'field-label', '運動設定'));
  const checkboxLine = el('span');
  checkboxLine.append(countExerciseInBalance, document.createTextNode(' 運動の消費カロリーを収支に加算する'));
  exerciseToggle.append(checkboxLine);

  const notice = el('div', 'banner banner-warning');
  notice.append(el('strong', '', '運動消費カロリーの扱い'));
  notice.append(el('span', '', EXERCISE_BALANCE_NOTICE));

  const palWarning = el('div', 'banner banner-warning', '身体活動レベルが低い（1.50）以外の場合、運動分を二重に数える恐れがあります');
  const preview = el('section', 'banner stack');
  const saveButton = el('button', 'button button-primary', '設定を保存');
  saveButton.type = 'submit';

  form.append(
    createField('身長 cm', height),
    createField('性別', sex),
    createField('生年月日', birth),
    createField('身体活動レベル', activityLevel),
    createField('目標体重 kg', targetWeight),
    createField('目標日', targetDate),
    createField('BMR算出式', bmrFormula),
    createField('水分目安 mL（空欄で自動）', waterGoalMl),
    createField('週あたり運動目標 分', exerciseGoalMinPerWeek),
    exerciseToggle,
    notice,
    palWarning,
    preview,
    saveButton
  );

  const updatePreview = () => {
    const draft = readProfileForm(form, ctx, profile || {});
    const currentWeight = latestWeightValue(weights) || draft.targetWeight;
    const bmrResult = calculateBMR({
      sex: draft.sex,
      birth: draft.birth,
      heightCm: draft.heightCm,
      weightKg: currentWeight,
      formula: draft.bmrFormula
    });
    const tdee = calculateTDEE(bmrResult.bmr, draft.activityLevel);
    const target = calculateTargetCalories({
      currentWeightKg: currentWeight,
      targetWeightKg: draft.targetWeight,
      targetDate: draft.targetDate,
      tdee,
      bmr: bmrResult.bmr,
      today: todayString()
    });
    const pfc = calculatePFCTarget({
      targetKcal: target.targetKcal || 0,
      weightKg: currentWeight || 0
    });
    const waterGoal = calculateWaterGoalMl(currentWeight, draft.waterGoalMl);

    palWarning.hidden = !(draft.countExerciseInBalance && draft.activityLevel !== 1.5);
    preview.replaceChildren();
    preview.append(el('strong', '', '計算結果のプレビュー'));
    preview.append(el('span', 'muted', `BMR Ganpule ${numberText(bmrResult.ganpule)} kcal / Mifflin ${numberText(bmrResult.mifflin)} kcal`));
    preview.append(el('span', 'muted', `採用BMR ${numberText(bmrResult.bmr)} kcal / TDEE ${numberText(tdee)} kcal`));
    preview.append(el('span', 'muted', `目標摂取 ${numberText(target.targetKcal)} kcal / 水分目安 ${numberText(waterGoal)} mL`));
    const bars = el('div', 'bar-list');
    bars.append(createBarRow('P', pfc.p || 0, pfc.p || 0, 'g'));
    bars.append(createBarRow('F', pfc.f || 0, pfc.f || 0, 'g'));
    bars.append(createBarRow('C', pfc.c || 0, pfc.c || 0, 'g'));
    preview.append(bars);
    preview.append(el('span', 'muted', `PFC比率 P ${numberText(pfc.balance.pPercent, 1)}% / F ${numberText(pfc.balance.fPercent, 1)}% / C ${numberText(pfc.balance.cPercent, 1)}%`));
    if (pfc.note) {
      preview.append(el('span', 'muted', pfc.note));
    }
    if (target.usedDefaultPace) {
      preview.append(el('span', 'muted', '目標日未設定のため週0.5%減のペースで計算しています'));
    }
    target.warnings.forEach((warning) => {
      preview.append(el('span', warning.level === 'danger' ? 'badge badge-danger' : 'badge badge-warning', warning.message));
    });
  };

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const draft = readProfileForm(form, ctx, profile || {});
    if (!validateRequiredProfile(draft)) {
      ctx.showToast('必須項目を入力してください', { tone: 'warning' });
      return;
    }
    await saveProfile(draft);
    await ctx.refreshProfile();
    ctx.showToast('設定を保存しました', { tone: 'success' });
    await onSaved();
  });

  fillProfileForm(form, profile);
  updatePreview();
  card.append(form);
  return card;
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `diet-backup-${compactDate()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('ファイルを読めませんでした'));
    reader.readAsText(file);
  });
}

/**
 * 写真から入力する機能のON/OFFカード。
 * ⛔ 既定をONにしないこと。写真解析はAPIの従量課金で、利用者数に比例して費用が増える。
 * ⛔ 保存キー 'diet_photo_enabled' を変えないこと。meal.js の isPhotoFeatureEnabled() が同じキーを見ている。
 * ⛔ このカードを画面の下へ移動しないこと。設定画面は基本設定フォームが長く、
 *    下に置くとスクロールされず「そんな項目はない」と言われる（2026-08-25 実害）。
 * @param {object} ctx 画面共通コンテキスト。
 * @returns {HTMLElement} カード要素。
 */
function createPhotoFeatureCard(ctx) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '写真から入力する'));
  card.append(el('p', 'muted', '食事の写真をAIに見てもらい、料理の候補とカロリーを出す機能です。ONにすると、食事の画面のいちばん下に入口が出ます。'));

  const toggle = createInput('photoFeature', 'checkbox');
  toggle.className = '';
  toggle.checked = readPhotoFlag_();

  const line = el('label', 'field');
  line.append(el('span', 'field-label', '機能の使用'));
  const checkboxLine = el('span');
  checkboxLine.append(toggle, document.createTextNode(' 写真から入力する機能を使う'));
  line.append(checkboxLine);

  const notice = el('div', 'banner banner-warning');
  notice.append(el('strong', '', 'この機能だけは写真を外部へ送ります'));
  notice.append(el('span', '', '解析のあいだだけ、選んだ写真1枚を解析サーバーへ送ります。体重・食事・水分などの記録は、ONにしても送信されません。利用には合言葉が必要です。'));

  card.append(line, notice);

  toggle.addEventListener('change', () => {
    try {
      localStorage.setItem('diet_photo_enabled', toggle.checked ? '1' : '0');
      ctx.showToast(
        toggle.checked ? 'ONにしました。食事の画面のいちばん下に入口が出ます' : 'OFFにしました',
        { tone: 'success' }
      );
    } catch (e) {
      toggle.checked = !toggle.checked;
      ctx.showToast('この端末では設定を保存できませんでした', { tone: 'warning' });
    }
  });
  return card;
}

/**
 * 写真機能が有効かを読む。meal.js の isPhotoFeatureEnabled() と判定を揃えること。
 * @returns {boolean} 有効なら true。
 */
function readPhotoFlag_() {
  try {
    const flag = localStorage.getItem('diet_photo_enabled');
    if (flag === '1') return true;
    if (flag === '0') return false;
    return Boolean(localStorage.getItem('diet_photo_token'));
  } catch (e) {
    return false;
  }
}

/**
 * 一覧に無かった品目の一覧と、送信のON/OFFを扱うカード。
 * ⛔ 送信をOFFにする手段をここから消さないこと。断れない収集にしないこと。
 * @param {object} ctx 画面共通コンテキスト。
 * @returns {HTMLElement} カード要素。
 */
function createUnknownFoodsCard(ctx) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', '一覧に無かった品目'));
  card.append(el('p', 'muted', 'カロリーを引けなかった品目名です。これをもとに一覧を増やします。'));

  const listBox = el('div', 'stack');
  const status = el('span', 'muted');

  const redraw = () => {
    listBox.replaceChildren();
    const items = listUnknownFoods();
    if (!items.length) {
      listBox.append(el('span', 'muted', 'まだありません。'));
      status.textContent = '';
      return;
    }
    const sorted = items.slice().sort((a, b) => b.count - a.count);
    sorted.slice(0, 30).forEach((item) => {
      listBox.append(el('span', '', `${item.name}（${item.count}回）${item.sent ? '' : ' ※未送信'}`));
    });
    if (sorted.length > 30) {
      listBox.append(el('span', 'muted', `ほか${sorted.length - 30}件`));
    }
    const unsent = items.filter((i) => !i.sent).length;
    status.textContent = `全${items.length}件` + (unsent ? ` / 未送信${unsent}件` : ' / すべて送信済み');
  };

  const toggle = createInput('unknownSend', 'checkbox');
  toggle.className = '';
  toggle.checked = isSendEnabled();
  const line = el('label', 'field');
  line.append(el('span', 'field-label', '一覧を増やす協力'));
  const checkLine = el('span');
  checkLine.append(toggle, document.createTextNode(' 品目名だけを送る（食べた量・カロリー・日時は送りません）'));
  line.append(checkLine);
  toggle.addEventListener('change', () => {
    if (!setSendEnabled(toggle.checked)) {
      toggle.checked = !toggle.checked;
      ctx.showToast('この端末では設定を保存できませんでした', { tone: 'warning' });
      return;
    }
    ctx.showToast(toggle.checked ? '送るようにしました' : '送らないようにしました', { tone: 'success' });
  });

  const copyButton = el('button', 'button', '一覧をコピー');
  copyButton.type = 'button';
  copyButton.addEventListener('click', async () => {
    const text = listUnknownFoods().slice().sort((a, b) => b.count - a.count)
      .map((i) => `${i.name}\t${i.count}`).join('\n');
    if (!text) {
      ctx.showToast('コピーするものがありません', { tone: 'warning' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      ctx.showToast('コピーしました', { tone: 'success' });
    } catch (e) {
      ctx.showToast('コピーできませんでした', { tone: 'warning' });
    }
  });

  const sendButton = el('button', 'button', 'いま送る');
  sendButton.type = 'button';
  sendButton.addEventListener('click', async () => {
    if (!isSendEnabled()) {
      ctx.showToast('送信がOFFになっています', { tone: 'warning' });
      return;
    }
    sendButton.disabled = true;
    try {
      const r = await sendPending();
      ctx.showToast(r.sent ? `${r.sent}件を送りました` : '未送信のものはありません', { tone: 'success' });
      redraw();
    } catch (e) {
      // ⛔ 失敗しても端末内の記録は消さないこと。次の機会に送り直せる。
      ctx.showToast('送れませんでした。あとでもう一度お試しください', { tone: 'warning' });
    } finally {
      sendButton.disabled = false;
    }
  });

  const clearButton = el('button', 'button', 'この端末の記録を消す');
  clearButton.type = 'button';
  clearButton.addEventListener('click', async () => {
    const ok = await ctx.confirmDialog('一覧に無かった品目の記録を消します。よろしいですか？');
    if (!ok) return;
    clearUnknownFoods();
    redraw();
    ctx.showToast('消しました', { tone: 'success' });
  });

  card.append(line, listBox, status, copyButton, sendButton, clearButton);
  redraw();
  return card;
}

function createDataManagementCard(ctx) {
  const card = el('section', 'card stack');
  card.append(el('h2', 'card-title', 'データ管理'));

  const exportButton = el('button', 'button', 'JSONエクスポート');
  exportButton.type = 'button';
  exportButton.addEventListener('click', async () => {
    const data = await exportAll();
    downloadJson(data);
    ctx.showToast('バックアップを書き出しました', { tone: 'success' });
  });

  const importForm = document.createElement('form');
  importForm.className = 'stack';
  const mode = createSelect('mode', [
    { value: 'merge', label: 'マージ' },
    { value: 'replace', label: '置換' }
  ], 'merge');
  const file = createInput('file', 'file', { accept: 'application/json,.json' });
  const importButton = el('button', 'button', 'JSONインポート');
  importButton.type = 'submit';
  importForm.append(createField('インポート方式', mode), createField('バックアップJSON', file), importButton);
  importForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedFile = file.files?.[0];
    if (!selectedFile) {
      ctx.showToast('JSONファイルを選択してください', { tone: 'warning' });
      return;
    }
    const selectedMode = mode.value === 'replace' ? 'replace' : 'merge';
    const message = selectedMode === 'replace'
      ? 'バックアップを置換インポートします。現在の全データは削除されます。実行しますか？'
      : 'バックアップをマージインポートします。同じ日付の既存データは保持します。実行しますか？';
    const ok = await ctx.confirmDialog(message);
    if (!ok) {
      return;
    }
    const text = await readFileAsText(selectedFile);
    await importAll(text, selectedMode, { skipConfirm: true });
    await ctx.refreshProfile();
    ctx.showToast('バックアップを読み込みました', { tone: 'success' });
    ctx.navigate('home');
  });

  const deleteButton = el('button', 'button button-danger', '全データ削除');
  deleteButton.type = 'button';
  deleteButton.addEventListener('click', async () => {
    const ok = await ctx.confirmDialog('全データを削除します。この操作は元に戻せません。続けますか？');
    if (!ok) {
      return;
    }
    const phrase = typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt('最終確認です。「削除」と入力してください')
      : '';
    if (phrase !== '削除') {
      ctx.showToast('削除を中止しました', { tone: 'warning' });
      return;
    }
    await Promise.all(Object.values(STORES).map((storeName) => clearStore(storeName)));
    await ctx.refreshProfile();
    ctx.showToast('全データを削除しました', { tone: 'success' });
    ctx.navigate('home');
  });

  card.append(exportButton, importForm, deleteButton);
  return card;
}

export async function render(ctx) {
  if (!ctx.profile) {
    const setup = createSetupMode(ctx);
    const setupContent = document.getElementById('setup-content');
    if (setupContent) {
      setupContent.replaceChildren(createSetupMode(ctx));
    }
    return setup;
  }

  const weights = await getAll(STORES.weights);
  const fragment = document.createDocumentFragment();
  const stack = el('div', 'stack');
  fragment.append(stack);

  const refresh = async () => {
    ctx.navigate('settings');
  };

  stack.append(createPhotoFeatureCard(ctx));
  stack.append(createProfileForm(ctx, ctx.profile, weights, refresh));
  stack.append(createUnknownFoodsCard(ctx));
  stack.append(createDataManagementCard(ctx));
  stack.append(createPrivacyCard());
  return fragment;
}
