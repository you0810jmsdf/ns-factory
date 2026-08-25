// 写真から食事を記録するページ（photo.html）専用スクリプト。
//
// ⛔ このファイル以外から GAS_URL へ通信するコードを書かないこと。
//    本体アプリは CSP connect-src 'none' の外部送信ゼロを維持しており、
//    外部通信はこのページだけに隔離している（2026-08-24 事業主承認済みのオプション機能）。
//
// 流れ: 合言葉 → 写真選択 → 端末内で長辺1280pxに縮小 → GASへ送信（写真1枚のみ）
//       → Claude Visionの推定結果を編集可能なリストで表示 → 確認して IndexedDB へ記録。
// 写真はGAS側でも保存しない（解析して返すだけ）。

import { addMeal, deleteMeal, getAll, STORES } from './db.js';
import { MEAL_SLOT_LABELS, detectMealSlot, todayString, currentTimeString } from './quick-entry.js';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzzSz4bbOU_FTeWF7mC_0v8331vWfU36MlMyEwE3GdWOlZH9WSy-i8t6Gg1sXhqdqqA/exec';
const TOKEN_KEY = 'diet_photo_token';
// ⛔ ここを大きくしないこと。実写真は情報量が多く、大きいほど解析が長引いて
//    GAS側がタイムアウトする（2026-08-25 実害）。1024pxで認識精度は足りている。
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.85;

const $ = (id) => document.getElementById(id);

let selectedFile = null;
let resultItems = [];

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}

function refreshCards() {
  const hasToken = Boolean(getToken());
  $('token-card').hidden = hasToken;
  $('photo-card').hidden = !hasToken;
}

// ── 画像の縮小（端末内・送信量を抑える） ─────────────────
async function shrinkImage(file) {
  // ⛔ imageOrientation: 'from-image' を外さないこと。
  //    既定（'none'）だとEXIFの回転情報が無視され、スマホで縦に撮った写真が
  //    横倒しのままAIへ送られる。人が見れば分かる料理でも認識精度が大きく落ちる
  //    （2026-08-25 実写真で発覚。「精度が悪すぎる」の主因と判断）。
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    // 古いブラウザはこのオプションを解釈できないことがある。その場合は従来動作にする。
    bitmap = await createImageBitmap(file);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return { media_type: 'image/jpeg', data: dataUrl.split(',')[1] };
}

// ── GAS呼び出し ───────────────────────────────────────
// Content-Type は text/plain にする（application/json だと preflight が発生して
// GAS WebApp では CORS エラーになる。2026-08 既知の教訓）。
/**
 * 過去の記録から「よく食べているもの」の料理名を取り出す。
 * 候補の当たりを上げるためにAIへ渡す。
 * ⛔ 料理名以外（体重・日付・量）は渡さないこと。判定に不要な情報を外へ出さない。
 * @returns {Promise<string[]>} 頻度順の料理名（最大20件）。
 */
async function frequentMealNames() {
  try {
    const meals = await getAll(STORES.meals);
    const count = new Map();
    (meals || []).forEach((m) => {
      const name = (m && m.name || '').trim();
      if (name) {
        count.set(name, (count.get(name) || 0) + 1);
      }
    });
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);
  } catch (e) {
    return [];
  }
}

// ⛔ この打ち切りを外さないこと。外すと応答が返らないとき画面が
//    「解析しています…」のまま永久に止まり、利用者は何もできなくなる（2026-08-25 実害）。
const ANALYZE_TIMEOUT_MS = 50000;

async function callAnalyze(image, frequent) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ANALYZE_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'analyze', token: getToken(), image, frequent }),
      signal: ctrl.signal
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('50秒かかっても返事がありませんでした。写真を明るく撮り直すか、時間をおいてお試しください。');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (text.trim().startsWith('<')) {
    throw new Error('サーバーの準備ができていません（管理者のGAS承認待ちの可能性）');
  }
  return JSON.parse(text);
}

// ── 候補選択の描画 ─────────────────────────────────────
// ⛔ AIの推定を1つに断定して見せないこと。写真からの料理特定は誤りやすく、
//    断定すると利用者が直す手間の方が大きい（2026-08-24「全然だめ」との評価を受けた設計変更）。
//    候補を並べて「選ぶ」形にする。

/**
 * 候補一覧を描画する。候補をタップすると中身（品目）の編集画面へ進む。
 * @param {object} data GASからの応答（candidates / detected / warnings）。
 * @returns {void}
 */
function renderResults(data) {
  const list = $('result-list');
  list.replaceChildren();
  const candidates = data.candidates || [];

  if (!candidates.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = '料理を見つけられませんでした。'
      + ((data.warnings || []).join(' ') || '別の角度で撮り直すか、テキストで入力してください。');
    list.append(empty);
    $('record-btn').hidden = true;
    $('slot-note').textContent = '';
    $('result-card').hidden = false;
    return;
  }

  const lead = document.createElement('p');
  lead.className = 'muted';
  lead.textContent = '近いものを選んでください（選んだあと中身を直せます）';
  list.append(lead);

  if ((data.detected || []).length) {
    const det = document.createElement('p');
    det.className = 'muted';
    det.textContent = '写真から見えたもの: ' + data.detected.join(' / ');
    list.append(det);
  }

  candidates.forEach((cand) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'button';
    btn.style.textAlign = 'left';
    btn.style.width = '100%';
    const body = document.createElement('span');
    body.className = 'stack';
    const title = document.createElement('strong');
    title.textContent = cand.label;
    const meta = document.createElement('span');
    meta.className = 'muted';
    meta.textContent = `約${cand.total_kcal}kcal`
      + (Number.isFinite(cand.confidence) ? ` / 確からしさ${Math.round(cand.confidence * 100)}%` : '');
    const detail = document.createElement('span');
    detail.className = 'muted';
    detail.textContent = cand.items.map((i) => i.name).join('、');
    body.append(title, meta, detail);
    btn.append(body);
    btn.addEventListener('click', () => renderPickedCandidate(cand, data));
    list.append(btn);
  });

  (data.warnings || []).forEach((w) => {
    const warn = document.createElement('p');
    warn.className = 'muted';
    warn.textContent = '⚠ ' + w;
    list.append(warn);
  });

  $('record-btn').hidden = true;
  $('slot-note').textContent = '';
  $('record-status').textContent = '';
  $('result-card').hidden = false;
}

/**
 * 選んだ候補の中身を編集できる形で描画する。
 * @param {object} cand 選ばれた候補。
 * @param {object} data 元の応答（候補選び直し用）。
 * @returns {void}
 */
function renderPickedCandidate(cand, data) {
  const list = $('result-list');
  list.replaceChildren();
  resultItems = cand.items.map((it) => ({ ...it, checked: true }));

  const head = document.createElement('p');
  head.className = 'muted';
  head.textContent = `「${cand.label}」で記録します。違うものは外し、数字は直せます。`;
  list.append(head);

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'button';
  back.textContent = '← 別の候補を選ぶ';
  back.addEventListener('click', () => renderResults(data));
  list.append(back);

  resultItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'banner stack';

    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.addEventListener('change', () => { item.checked = check.checked; });
    const nameInput = document.createElement('input');
    nameInput.className = 'input';
    nameInput.value = item.name;
    nameInput.addEventListener('change', () => { item.name = nameInput.value.trim() || item.name; });
    label.append(check, nameInput);

    const meta = document.createElement('span');
    meta.className = 'muted';
    const kcalInput = document.createElement('input');
    kcalInput.type = 'number';
    kcalInput.className = 'input input-small';
    kcalInput.setAttribute('inputmode', 'numeric');
    kcalInput.value = Number.isFinite(item.kcal) ? String(item.kcal) : '';
    kcalInput.addEventListener('change', () => {
      const v = Number(kcalInput.value);
      item.kcal = Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
    });
    meta.append(kcalInput, document.createTextNode(`kcal / ${item.amount_desc || '量は目安'}`));

    row.append(label, meta);
    list.append(row);
  });

  const slot = detectMealSlot();
  $('slot-note').textContent = `${MEAL_SLOT_LABELS[slot]}の食事として記録します`;
  $('record-btn').hidden = false;
  $('record-status').textContent = '';
}

// ── イベント ───────────────────────────────────────────
$('token-save').addEventListener('click', () => {
  const v = $('token-input').value.trim();
  if (!v) return;
  try { localStorage.setItem(TOKEN_KEY, v); } catch (e) { /* プライベートブラウズ等 */ }
  refreshCards();
});

// アルバム選択と撮影を別のinputに分ける。
// ⛔ 1つのinputに capture を付けるとiOSでカメラ直行になり、アルバムから選べない。
let previewUrl = null;

function handlePicked(file) {
  if (!file) return;
  selectedFile = file;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
  previewUrl = URL.createObjectURL(file);
  const preview = $('preview');
  preview.src = previewUrl;
  preview.hidden = false;
  $('analyze-btn').hidden = false;
  $('result-card').hidden = true;
  $('status-line').textContent = '';
}

$('pick-library').addEventListener('click', () => $('file-library').click());
$('pick-camera').addEventListener('click', () => $('file-camera').click());

$('file-library').addEventListener('change', (e) => handlePicked(e.target.files && e.target.files[0]));
$('file-camera').addEventListener('change', (e) => handlePicked(e.target.files && e.target.files[0]));

$('analyze-btn').addEventListener('click', async () => {
  if (!selectedFile) return;
  const btn = $('analyze-btn');
  btn.disabled = true;
  // ⛔ 経過秒数の表示を消さないこと。止まっているのか待てば済むのかを
  //    利用者が判断できず、また「途中で止まる」と言われる（2026-08-25 実害）。
  const startedAt = Date.now();
  const tick = setInterval(() => {
    const sec = Math.round((Date.now() - startedAt) / 1000);
    $('status-line').textContent = '解析しています… ' + sec + '秒（ふつう15〜30秒／50秒で打ち切ります）';
  }, 1000);
  $('status-line').textContent = '解析しています… 0秒（ふつう15〜30秒／50秒で打ち切ります）';
  try {
    const image = await shrinkImage(selectedFile);
    const frequent = await frequentMealNames();
    const res = await callAnalyze(image, frequent);
    clearInterval(tick);
    if (res.error) {
      if (res.error === 'unauthorized') {
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* noop */ }
        refreshCards();
        clearInterval(tick);
        $('status-line').textContent = '合言葉が違います。もう一度入力してください。';
        return;
      }
      clearInterval(tick);
      $('status-line').textContent = '解析できませんでした: ' + res.error;
      return;
    }
    const took = Math.round((Date.now() - startedAt) / 1000);
    const server = res.elapsedMs ? Math.round(res.elapsedMs / 1000) : null;
    $('status-line').textContent = server !== null
      ? took + '秒で解析しました（うちAI ' + server + '秒）'
      : took + '秒で解析しました';
    renderResults(res.data || {});
  } catch (err) {
    $('status-line').textContent = 'エラー: ' + (err && err.message ? err.message : '通信に失敗しました');
  } finally {
    clearInterval(tick);
    btn.disabled = false;
  }
});

$('record-btn').addEventListener('click', async () => {
  const picked = resultItems.filter((it) => it.checked && it.name);
  if (!picked.length) {
    $('record-status').textContent = '記録する品目にチェックを入れてください';
    return;
  }
  const today = todayString();
  const slot = detectMealSlot();
  const ids = [];
  for (const it of picked) {
    const id = await addMeal({
      date: today,
      slot,
      name: it.name,
      amount: null,
      unit: it.amount_desc || '',
      kcal: Number.isFinite(it.kcal) ? it.kcal : null,
      p: Number.isFinite(it.p) ? it.p : null,
      f: Number.isFinite(it.f) ? it.f : null,
      c: Number.isFinite(it.c) ? it.c : null,
      foodId: null
    });
    ids.push(id);
  }
  $('record-btn').hidden = true;
  const status = $('record-status');
  status.textContent = `${picked.length}件を${MEAL_SLOT_LABELS[slot]}に記録しました。`;
  // 直後の取り消し（このページ内で完結させる）
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'button';
  undo.textContent = '取消';
  undo.addEventListener('click', async () => {
    for (const id of ids) {
      await deleteMeal(id);
    }
    undo.remove();
    status.textContent = '取り消しました。';
    $('record-btn').hidden = false;
  });
  status.append(document.createTextNode(' '), undo);
});

refreshCards();
