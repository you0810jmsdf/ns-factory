const GistManager = (() => {
  const API = 'https://api.github.com/gists';

  function getToken() {
    return APP_CONFIG.GITHUB_TOKEN || localStorage.getItem('gist_token') || '';
  }

  function getGistId() {
    return APP_CONFIG.GIST_ID || localStorage.getItem('gist_id') || '';
  }

  function setToken(t) { localStorage.setItem('gist_token', t); }
  function setGistId(id) { localStorage.setItem('gist_id', id); }
  function isConfigured() { return !!getToken(); }

  async function load() {
    const token = getToken();
    const gistId = getGistId();
    if (!token || !gistId) return null;
    const resp = await fetch(`${API}/${gistId}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!resp.ok) throw new Error(`Gist読込失敗: ${resp.status}`);
    const data = await resp.json();
    const file = data.files[APP_CONFIG.GIST_FILENAME];
    return file ? file.content : null;
  }

  async function save(encData) {
    const token = getToken();
    if (!token) throw new Error('GitHub接続キーが未設定です');
    const gistId = getGistId();
    const body = {
      description: "N's notebook password vault (encrypted)",
      public: false,
      files: { [APP_CONFIG.GIST_FILENAME]: { content: encData } }
    };
    const resp = await fetch(gistId ? `${API}/${gistId}` : API, {
      method: gistId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`Gist保存失敗: ${resp.status}`);
    const data = await resp.json();
    if (!gistId) setGistId(data.id);
    return data.id;
  }

  return { getToken, getGistId, setToken, setGistId, isConfigured, load, save };
})();
