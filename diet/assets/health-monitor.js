// ダイエット管理PWAの健全性モニタリング。
//
// 目的: 利用中のJSエラー・通信失敗・写真解析の失敗を開発者へ知らせる。
// ⛔ 体重、食事内容、写真、合言葉、バックアップJSONは送らないこと。
//    ここで送るのは「どの画面でどんな種類のエラーが起きたか」と端末環境だけ。

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzzSz4bbOU_FTeWF7mC_0v8331vWfU36MlMyEwE3GdWOlZH9WSy-i8t6Gg1sXhqdqqA/exec';
const INSTALL_ID_KEY = 'diet_monitor_install_id';
const DISABLED_KEY = 'diet_monitor_disabled';
const APP_VERSION = 'diet-v20';
const REPORT_THROTTLE_MS = 5 * 60 * 1000;
const MAX_CONTEXT_KEYS = 20;

const sentAtBySignature = new Map();
let installed = false;
let baseContext = { app: 'diet', page: 'main' };

function hasDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function cleanText(value, max = 240) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s)]+/g, (raw) => {
      try {
        const url = new URL(raw);
        return url.origin + url.pathname;
      } catch (e) {
        return '[url]';
      }
    })
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, max);
}

function randomPart() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint32Array(2);
    cryptoObj.getRandomValues(buf);
    return Array.from(buf).map((n) => n.toString(36)).join('');
  }
  return Math.random().toString(36).slice(2, 12);
}

function installId() {
  try {
    let id = localStorage.getItem(INSTALL_ID_KEY);
    if (!id) {
      id = `d-${Date.now().toString(36)}-${randomPart()}`;
      localStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id.substring(0, 80);
  } catch (e) {
    return '';
  }
}

function routeText() {
  if (!hasDOM()) return '';
  const path = location.pathname || '';
  const hash = (location.hash || '').split('?')[0];
  return cleanText(path + hash, 160);
}

function screenText() {
  if (!hasDOM() || !window.screen) return '';
  return `${window.innerWidth || 0}x${window.innerHeight || 0} / ${screen.width || 0}x${screen.height || 0}`;
}

function errorInfo(error) {
  if (error instanceof Error) {
    return {
      name: cleanText(error.name || 'Error', 80),
      message: cleanText(error.message || String(error), 300),
      stack: cleanText(String(error.stack || '').split('\n').slice(0, 4).join('\n'), 700)
    };
  }
  return {
    name: typeof error,
    message: cleanText(error, 300),
    stack: ''
  };
}

function safeContext(context) {
  const output = {};
  if (!context || typeof context !== 'object') {
    return output;
  }
  Object.keys(context).slice(0, MAX_CONTEXT_KEYS).forEach((key) => {
    if (/token|password|secret|image|photo|base64|backup|body|content|record|weight|meal|food/i.test(key)) {
      return;
    }
    const value = context[key];
    if (value === null || value === undefined) {
      output[cleanText(key, 40)] = value;
    } else if (['string', 'number', 'boolean'].includes(typeof value)) {
      output[cleanText(key, 40)] = cleanText(value, 160);
    }
  });
  return output;
}

function issueSignature(issue) {
  return [
    issue.type,
    issue.page,
    issue.route,
    issue.error && issue.error.name,
    issue.error && issue.error.message
  ].join('|').substring(0, 500);
}

function shouldThrottle(issue) {
  const key = issueSignature(issue);
  const now = Date.now();
  const last = sentAtBySignature.get(key) || 0;
  if (now - last < REPORT_THROTTLE_MS) {
    return true;
  }
  sentAtBySignature.set(key, now);
  return false;
}

function sendIssue(issue) {
  const payload = JSON.stringify({ action: 'clientIssue', issue });
  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: payload,
    keepalive: payload.length < 60000
  }).catch(() => undefined);
}

export function isHealthMonitorEnabled() {
  try {
    return localStorage.getItem(DISABLED_KEY) !== '1';
  } catch (e) {
    return true;
  }
}

export function setHealthMonitorEnabled(enabled) {
  try {
    localStorage.setItem(DISABLED_KEY, enabled ? '0' : '1');
    return true;
  } catch (e) {
    return false;
  }
}

export function reportHealthIssue(type, error, context = {}, options = {}) {
  if (!isHealthMonitorEnabled()) {
    return;
  }
  const info = errorInfo(error);
  const issue = {
    app: 'diet',
    version: APP_VERSION,
    severity: cleanText(options.severity || 'error', 20),
    type: cleanText(type || 'unknown', 80),
    page: cleanText(options.page || baseContext.page || 'main', 40),
    route: routeText(),
    occurredAt: new Date().toISOString(),
    installId: installId(),
    online: typeof navigator !== 'undefined' ? navigator.onLine !== false : null,
    userAgent: typeof navigator !== 'undefined' ? cleanText(navigator.userAgent, 220) : '',
    screen: screenText(),
    error: info,
    context: safeContext({ ...baseContext, ...context })
  };
  if (shouldThrottle(issue)) {
    return;
  }
  sendIssue(issue);
}

export function installHealthMonitor(context = {}) {
  baseContext = {
    ...baseContext,
    ...safeContext(context),
    page: cleanText(context.page || baseContext.page || 'main', 40)
  };
  if (!hasDOM() || installed) {
    return;
  }
  installed = true;
  window.addEventListener('error', (event) => {
    reportHealthIssue('js_error', event.error || event.message || 'unknown error', {
      source: event.filename ? cleanText(event.filename, 160) : '',
      line: Number.isFinite(event.lineno) ? event.lineno : '',
      column: Number.isFinite(event.colno) ? event.colno : ''
    }, { severity: 'error' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportHealthIssue('unhandled_rejection', event.reason || 'unknown rejection', {}, { severity: 'error' });
  });
}
