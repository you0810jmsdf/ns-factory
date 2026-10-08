// AI サーバー（Cloudflare Worker）との通信。外部通信はここだけ（ユーザーが URL を設定したときに限る）。
/** POST {url}/ai/chat。戻り値 {reply, actions, usage, yen} または throw。transport は fetch 互換（テストで差し替え）。 */
export async function postChat(url, key, body, { transport = globalThis.fetch, timeoutMs = 120000 } = {}) {
  if (!url) throw new Error('no-url');
  if (typeof transport !== 'function') throw new Error('no-fetch');
  const controller = typeof AbortController === 'function' ? new AbortController() : null, timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await transport(url.replace(/\/$/, '') + '/ai/chat', { method: 'POST', headers: { 'content-type': 'application/json', 'x-ai-key': key || '' }, body: JSON.stringify(body), signal: controller?.signal });
    const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch { /* 本文が JSON でない */ }
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    if (!data || typeof data.reply !== 'string') throw new Error('bad-response');
    return data;
  } finally { if (timer) clearTimeout(timer); }
}
