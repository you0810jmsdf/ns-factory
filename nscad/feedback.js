// 改善要望（ご意見）の送信。受け口は神社巡りノートと共通の Google Apps Script（app=ncad を付けると、別のシートに記録される）。
// 送るのは「種類・本文・連絡先（任意）・版・画面情報（任意）」だけ。図面の中身・図形・ファイル名は送らない。
export const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbxVjMD91cS1dDRlHo1jnuKLNChPZnJ1cT7-xhqsgBf28q5v7kMCGkWZ77fHBy-SUEyF9g/exec';
export const FB_KINDS = ['idea', 'bug', 'cheer'];
export const FB_MIN = 3, FB_MAX = 500, FB_CONTACT_MAX = 120, FB_CTX_MAX = 300;

/** 二重送信を防ぐための番号（16進32桁）。受け口が同じ番号を2回目から無視する */
export function newRid(c = globalThis.crypto) {
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes); else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** 送る前の検査。問題なければ null、あれば理由（'kind' | 'short' | 'long' | 'contact' | 'links'） */
export function checkFeedback({ kind, msg, contact }) {
  const m = String(msg ?? '').replace(/\r\n?/g, '\n').trim();
  if (!FB_KINDS.includes(kind)) return 'kind';
  if (m.length < FB_MIN) return 'short';
  if (m.length > FB_MAX) return 'long';
  if (String(contact ?? '').trim().length > FB_CONTACT_MAX) return 'contact';
  if ((m.match(/https?:\/\//gi) || []).length > 2) return 'links';
  return null;
}

/** 一緒に送る画面情報（任意）。画面の大きさ・端末の種類・使っている画面の状態の「数」だけ。図面の中身は含めない */
export function feedbackContext(info = {}) {
  const ua = String(info.ua || '');
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'other';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'other';
  const parts = [
    `screen ${info.w ?? '?'}x${info.h ?? '?'}`, `${os} ${browser}`, `lang ${info.lang === 'en' ? 'en' : 'ja'}`,
    `mode ${/^[A-Za-z0-9_.-]{1,24}$/.test(String(info.mode)) ? info.mode : '?'}`, `tabs ${Number(info.tabs) || 0}`, `shapes ${Number(info.shapes) || 0}`,
    `3view ${info.threeView ? 'on' : 'off'}`, info.offline ? 'file' : 'web',
  ];
  return parts.join(' / ').slice(0, FB_CTX_MAX);
}

/** 受け口に送る問い合わせ文字列（GET）。長い本文でも途中で切れないよう、本文の上限は 500 字 */
export function feedbackQuery({ kind, msg, contact, lang, ver, rid, ctx, hp }) {
  const q = new URLSearchParams({
    action: 'send', app: 'ncad', kind, msg: String(msg).replace(/\r\n?/g, '\n').trim(), contact: String(contact ?? '').trim(),
    lang: lang === 'en' ? 'en' : 'ja', ver: String(ver ?? '').slice(0, 40), rid, ctx: String(ctx ?? '').slice(0, FB_CTX_MAX),
  });
  if (hp) q.set('hp', String(hp));
  return q.toString();
}

/** 送信。戻り値は { ok:true } か { ok:false, error }（error は 'short' 'long' 'links' 'busy' 'net' など）。通信の失敗で例外は投げない */
export async function sendFeedback(fields, { fetchImpl = globalThis.fetch, url = FEEDBACK_URL, timeoutMs = 15000 } = {}) {
  const bad = checkFeedback(fields);
  if (bad) return { ok: false, error: bad };
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const r = await fetchImpl(url + '?' + feedbackQuery(fields), { method: 'GET', ...(ctl ? { signal: ctl.signal } : {}) });
    const j = await r.json();
    return j && j.ok ? { ok: true } : { ok: false, error: String(j?.error || 'net') };
  } catch { return { ok: false, error: 'net' }; }
  finally { if (timer) clearTimeout(timer); }
}
