// 一覧に無かった品目名を集める。
//
// 目的: 内蔵の食品データ（foods.js・142件）に無い品目を把握し、次の追加に使う。
// 集めるのは「品目名」だけ。食べた量・カロリー・日時・体重は一切扱わない。
//
// ⛔ ここで扱う項目を増やさないこと。増やした瞬間、利用者への説明
//    「送るのは品目名だけです」が嘘になる。
// ⛔ 送信のON/OFFを設定画面から消さないこと。断る手段が無い収集にしないこと。

const STORAGE_KEY = 'diet_unknown_foods';
const SEND_FLAG_KEY = 'diet_unknown_send';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzzSz4bbOU_FTeWF7mC_0v8331vWfU36MlMyEwE3GdWOlZH9WSy-i8t6Gg1sXhqdqqA/exec';

// ⛔ この上限を外さないこと。端末内の保存が無制限に膨らむのを防ぐ。
//    GAS側も1回50件までしか受け付けない（MAX_NAMES_PER_REQUEST）。
const MAX_KEEP = 300;
const MAX_SEND_PER_REQUEST = 50;
const MAX_NAME_LENGTH = 40;

/**
 * 送信が有効かどうか。既定は有効。
 * ⛔ 既定値を変えるときは、設定画面のプライバシー説明も必ず同時に直すこと。
 * @returns {boolean} 有効なら true。
 */
export function isSendEnabled() {
  try {
    return localStorage.getItem(SEND_FLAG_KEY) !== '0';
  } catch (e) {
    // プライベートブラウズ等で読めない場合は送らない（安全側）
    return false;
  }
}

/**
 * 送信のON/OFFを切り替える。
 * @param {boolean} enabled 有効にするなら true。
 * @returns {boolean} 保存できたら true。
 */
export function setSendEnabled(enabled) {
  try {
    localStorage.setItem(SEND_FLAG_KEY, enabled ? '1' : '0');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 端末内に貯まっている品目を読む。
 * @returns {Array<{name:string,count:number,sent:boolean}>} 一覧。新しい順。
 */
export function listUnknownFoods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/**
 * 端末内の記録をすべて消す。
 * @returns {boolean} 消せたら true。
 */
export function clearUnknownFoods() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

function save(list) {
  try {
    // 件数が多いときは古いものから捨てる。
    const trimmed = list.slice(-MAX_KEEP);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 一覧に無かった品目名を記録する。同じ名前は件数を足すだけ。
 * 送信が有効なら、未送信分をまとめて送る（失敗しても端末内には残る）。
 *
 * ⛔ 記録に失敗しても呼び出し元の処理を止めないこと。
 *    利用者の目的は食事を記録することで、この収集はおまけ。
 * @param {string|Array<string>} names 品目名。
 * @returns {void}
 */
export function recordUnknownFood(names) {
  const inputs = (Array.isArray(names) ? names : [names])
    .map((n) => String(n || '').trim().substring(0, MAX_NAME_LENGTH))
    .filter(Boolean);
  if (!inputs.length) {
    return;
  }

  const list = listUnknownFoods();
  const index = new Map(list.map((item, i) => [item.name, i]));
  inputs.forEach((name) => {
    if (index.has(name)) {
      list[index.get(name)].count += 1;
    } else {
      list.push({ name, count: 1, sent: false });
      index.set(name, list.length - 1);
    }
  });
  save(list);

  if (isSendEnabled()) {
    // 送信は待たない。失敗しても未送信のまま残り、次の機会に再送される。
    sendPending().catch(() => undefined);
  }
}

/**
 * 未送信の品目名をまとめて送る。
 * @returns {Promise<{sent:number}>} 送れた件数。
 */
export async function sendPending() {
  if (!isSendEnabled()) {
    return { sent: 0 };
  }
  const list = listUnknownFoods();
  const pending = list.filter((item) => !item.sent).slice(0, MAX_SEND_PER_REQUEST);
  if (!pending.length) {
    return { sent: 0 };
  }

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'submitUnknownFoods', names: pending.map((i) => i.name) })
  });
  const text = await res.text();
  if (text.trim().startsWith('<')) {
    throw new Error('サーバーの準備ができていません');
  }
  const data = JSON.parse(text);
  if (data.error) {
    throw new Error(data.error);
  }

  const sentNames = new Set(pending.map((i) => i.name));
  const updated = listUnknownFoods().map((item) => (
    sentNames.has(item.name) ? { ...item, sent: true } : item
  ));
  save(updated);
  return { sent: pending.length };
}
