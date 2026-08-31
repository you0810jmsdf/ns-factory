// SPAの骨格。重い画面資産は各画面が必要になった時点で読む。
import {
  getProfile,
  openDB,
  subscribeChanges,
  subscribeVersionChanges
} from './db.js';
import {
  installHealthMonitor,
  reportHealthIssue
} from './health-monitor.js';

const ROUTES = Object.freeze(['home', 'weight', 'meal', 'exercise', 'water', 'settings']);
const TAB_ROUTES = Object.freeze(['home', 'weight', 'meal', 'exercise', 'water']);
const VIEW_MODULES = Object.freeze({
  home: './views/home.js',
  weight: './views/weight.js',
  meal: './views/meal.js',
  exercise: './views/exercise.js',
  water: './views/water.js',
  settings: './views/settings.js'
});
const ROUTE_TITLES = Object.freeze({
  home: 'ホーム',
  weight: '体重',
  meal: '食事',
  exercise: '運動',
  water: '水分',
  settings: '設定'
});
const DB_BLOCKED_MESSAGE = '他のタブでこのアプリが開かれています。他のタブを閉じてから再読み込みしてください';

const state = {
  started: false,
  profile: null,
  route: 'home',
  dbReady: false,
  reloadRequired: false,
  reloadMessage: '',
  serviceWorkerRegistered: false,
  // 描画の世代番号。renderRoute は await を挟むため、
  // 古い描画が新しい描画を上書きしないようこの値で判定する。
  renderToken: 0
};

let unsubscribeChanges = null;
let unsubscribeVersionChanges = null;
let pendingExternalRefresh = null;

function hasDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getViewRoot() {
  return document.getElementById('view');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeRoute(value) {
  return ROUTES.includes(value) ? value : 'home';
}

function currentRouteFromHash() {
  if (!hasDOM()) {
    return 'home';
  }
  const route = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  return normalizeRoute(route || 'home');
}

function setTitle(route) {
  const title = ROUTE_TITLES[route] || 'ダイエット管理';
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = title;
  }
  document.title = route === 'home' ? 'ダイエット管理' : `${title} - ダイエット管理`;
}

function updateSettingsButton(route) {
  const button = document.getElementById('settings-button');
  if (!button) {
    return;
  }
  button.hidden = route !== 'home';
}

function updateTabs(route) {
  document.querySelectorAll('[data-route]').forEach((item) => {
    const isActive = item.getAttribute('data-route') === route;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function renderPreparing(route) {
  const root = getViewRoot();
  if (!root) {
    return;
  }
  root.innerHTML = `
    <section class="empty-state">
      <div class="stack">
        <h2 class="card-title">${escapeHtml(ROUTE_TITLES[route] || '画面')}</h2>
        <p class="muted">準備中</p>
      </div>
    </section>
  `;
}

function renderSetupShell() {
  const root = getViewRoot();
  if (!root) {
    return;
  }
  root.innerHTML = `
    <section class="card stack">
      <h2 class="card-title">初回セットアップ</h2>
      <p class="muted">準備中</p>
    </section>
  `;
}

function renderStartupError(error) {
  const root = getViewRoot();
  if (!root) {
    return;
  }
  const message = isDBBlockedError(error)
    ? DB_BLOCKED_MESSAGE
    : (error?.message || '保存領域を確認してください');
  root.innerHTML = `
    <section class="banner banner-danger">
      <strong>起動できませんでした</strong>
      <span>${escapeHtml(message)}</span>
    </section>
  `;
}

function renderReloadRequired(message) {
  const root = getViewRoot();
  if (!root) {
    return;
  }
  root.innerHTML = `
    <section class="banner banner-warning">
      <strong>再読み込みが必要です</strong>
      <span>${escapeHtml(message || '別のタブでこのアプリが更新されました。再読み込みしてください')}</span>
      <button id="reload-button" class="button button-primary" type="button">再読み込み</button>
    </section>
  `;
  document.getElementById('reload-button')?.addEventListener('click', () => {
    window.location.reload();
  });
}

function isDBBlockedError(error) {
  return error?.blocked === true || error?.code === 'DB_OPEN_BLOCKED';
}

function viewContext(route) {
  return {
    root: getViewRoot(),
    route,
    profile: state.profile,
    navigate,
    refreshProfile,
    showToast,
    confirmDialog,
    openModal,
    closeModal,
    normalizeNumberInput
  };
}

async function renderRoute(route = currentRouteFromHash()) {
  if (!hasDOM()) {
    return;
  }

  state.route = normalizeRoute(route);
  setTitle(state.route);
  updateSettingsButton(state.route);
  updateTabs(state.route);

  if (state.reloadRequired) {
    renderReloadRequired(state.reloadMessage);
    return;
  }

  // プロフィール未設定のときは設定画面へ誘導する。
  // views/settings.js が初回セットアップ用の入力UIを持っているため、
  // ここで止めずに通常のview読み込みへ進ませること。
  // ⛔ ここで renderSetupShell() を呼んで return すると、
  //    プロフィールを入力する手段が無くなりアプリが使えなくなる（2026-08-24 実害）。
  if (!state.profile && state.dbReady && state.route !== 'settings') {
    navigate('settings', { replace: true });
    return;
  }

  // この描画の世代を記録する。await の後で世代が進んでいたら、
  // 別のルートへ移った後なので描画結果を捨てる。
  // ⛔ このガードを外すと、起動直後（DBオープン前）のhome描画が
  //    後から完了して settings の初回セットアップ画面を上書きする（2026-08-24 実害）。
  const renderToken = ++state.renderToken;

  renderPreparing(state.route);

  try {
    const module = await import(VIEW_MODULES[state.route]);
    if (renderToken !== state.renderToken) {
      return;
    }
    const render = module.render || module.default;
    if (typeof render !== 'function') {
      return;
    }

    const result = await render(viewContext(state.route));
    if (renderToken !== state.renderToken) {
      return;
    }
    const root = getViewRoot();
    if (!root || result == null) {
      return;
    }
    if (typeof result === 'string') {
      root.innerHTML = result;
    } else if (typeof Node !== 'undefined' && result instanceof Node) {
      root.replaceChildren(result);
    }
  } catch (error) {
    reportHealthIssue('route_render_failed', error, {
      route: state.route,
      dbReady: state.dbReady,
      reloadRequired: state.reloadRequired
    });
    renderPreparing(state.route);
  }
}

/**
 * 指定画面へ移動する。
 * @param {string} route 画面名。
 * @param {{replace?:boolean}} [options] 履歴置換の有無。
 * @returns {void}
 */
export function navigate(route, options = {}) {
  if (!hasDOM()) {
    return;
  }
  const normalized = normalizeRoute(route);
  const hash = `#/${normalized}`;
  if (options.replace) {
    window.history.replaceState(null, '', hash);
    renderRoute(normalized);
    return;
  }
  if (window.location.hash === hash) {
    renderRoute(normalized);
    return;
  }
  window.location.hash = hash;
}

/**
 * プロフィールを読み直す。
 * @returns {Promise<object|null>} 最新プロフィール。
 */
export async function refreshProfile() {
  state.profile = await getProfile() || null;
  return state.profile;
}

/**
 * トーストを表示する。
 * @param {string} message 表示文。
 * @param {{tone?:'info'|'success'|'warning'|'danger', timeout?:number, action?:{label:string, onClick:Function}}} [options] 表示設定。
 * @returns {HTMLElement|null} 作成した要素。
 */
export function showToast(message, options = {}) {
  if (!hasDOM()) {
    return null;
  }
  const root = document.getElementById('toast-root');
  if (!root) {
    return null;
  }
  const tone = options.tone || 'info';
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);

  let timer = null;
  if (options.action && typeof options.action.onClick === 'function') {
    const actionButton = document.createElement('button');
    actionButton.className = 'toast-action';
    actionButton.type = 'button';
    actionButton.textContent = options.action.label || '実行';
    actionButton.addEventListener('click', async () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      toast.remove();
      await options.action.onClick();
    });
    toast.append(actionButton);
  }
  root.append(toast);

  const timeout = Number.isFinite(options.timeout) ? options.timeout : 2600;
  timer = window.setTimeout(() => {
    toast.remove();
  }, timeout);

  return toast;
}

/**
 * 確認ダイアログを表示する。
 * @param {string} message 確認文。
 * @returns {Promise<boolean>} 承認されたら true。
 */
export function confirmDialog(message) {
  if (!hasDOM() || typeof window.confirm !== 'function') {
    return Promise.resolve(false);
  }
  return Promise.resolve(window.confirm(message));
}

/**
 * モーダルを開く。
 * @param {string} id モーダル要素ID。
 * @returns {HTMLElement|null} 対象要素。
 */
export function openModal(id) {
  if (!hasDOM()) {
    return null;
  }
  const modal = document.getElementById(id);
  if (!modal) {
    return null;
  }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  return modal;
}

/**
 * モーダルを閉じる。
 * @param {string} id モーダル要素ID。
 * @returns {void}
 */
export function closeModal(id) {
  if (!hasDOM()) {
    return;
  }
  const modal = document.getElementById(id);
  if (modal) {
    modal.hidden = true;
  }
  document.body.style.overflow = '';
}

/**
 * 数値入力文字列を number または null に正規化する。
 * @param {unknown} value 入力値。
 * @param {{min?:number, max?:number, fallback?:number|null}} [options] 範囲と既定値。
 * @returns {number|null} 正規化後の値。
 */
export function normalizeNumberInput(value, options = {}) {
  const fallback = options.fallback ?? null;
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value)
    .trim()
    .replace(/[０-９．，]/g, (char) => {
      if (char === '．' || char === '，') {
        return '.';
      }
      return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
    })
    .replace(',', '.');
  if (!text) {
    return fallback;
  }

  const number = Number(text);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  if (Number.isFinite(options.min) && number < options.min) {
    return options.min;
  }
  if (Number.isFinite(options.max) && number > options.max) {
    return options.max;
  }
  return number;
}

function bindShellEvents() {
  const settingsButton = document.getElementById('settings-button');
  settingsButton?.addEventListener('click', () => navigate('settings'));

  document.querySelectorAll('.tab-item[data-route]').forEach((tab) => {
    tab.addEventListener('click', (event) => {
      const route = tab.getAttribute('data-route');
      if (!route) {
        return;
      }
      event.preventDefault();
      navigate(route);
    });
  });

  window.addEventListener('hashchange', () => {
    renderRoute(currentRouteFromHash());
  });
}

function registerServiceWorker() {
  if (!hasDOM() || state.serviceWorkerRegistered || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  state.serviceWorkerRegistered = true;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function refreshCurrentRouteFromExternalChange() {
  if (!hasDOM() || !state.dbReady || state.reloadRequired) {
    return;
  }
  if (pendingExternalRefresh) {
    return;
  }
  pendingExternalRefresh = Promise.resolve()
    .then(async () => {
      state.profile = await getProfile() || null;
      await renderRoute(currentRouteFromHash());
    })
    .catch(() => {
      showToast('他のタブの変更を反映できませんでした', { tone: 'warning' });
    })
    .finally(() => {
      pendingExternalRefresh = null;
    });
}

function bindDatabaseEvents() {
  if (!unsubscribeChanges) {
    unsubscribeChanges = subscribeChanges((message) => {
      if (message?.type === 'changed') {
        refreshCurrentRouteFromExternalChange();
      }
    });
  }

  if (!unsubscribeVersionChanges) {
    unsubscribeVersionChanges = subscribeVersionChanges((message) => {
      state.reloadRequired = true;
      state.dbReady = false;
      state.reloadMessage = message?.message || '別のタブでこのアプリが更新されました。再読み込みしてください';
      renderReloadRequired(state.reloadMessage);
      showToast(state.reloadMessage, { tone: 'warning', timeout: 6000 });
    });
  }
}

/**
 * アプリを起動する。
 * @returns {Promise<void>}
 */
export async function startApp() {
  if (!hasDOM() || state.started) {
    return;
  }
  state.started = true;
  installHealthMonitor({ page: 'main' });
  bindShellEvents();
  bindDatabaseEvents();
  registerServiceWorker();
  navigate(currentRouteFromHash(), { replace: true });

  try {
    await openDB();
    state.dbReady = true;
    state.profile = await getProfile() || null;
    if (!state.profile) {
      renderRoute('home');
      return;
    }
    closeModal('setup-modal');
    renderRoute(currentRouteFromHash());
  } catch (error) {
    state.dbReady = false;
    reportHealthIssue(isDBBlockedError(error) ? 'db_open_blocked' : 'startup_failed', error, {
      dbReady: state.dbReady,
      serviceWorkerRegistered: state.serviceWorkerRegistered
    }, {
      severity: isDBBlockedError(error) ? 'warning' : 'error'
    });
    renderStartupError(error);
    showToast(isDBBlockedError(error) ? DB_BLOCKED_MESSAGE : '保存領域を開けませんでした', {
      tone: 'danger',
      timeout: isDBBlockedError(error) ? 6000 : 2600
    });
  }
}

if (hasDOM()) {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
