const DriveManager = (() => {
  let tokenClient = null;
  let accessToken = null;
  let gapiReady = false;

  const DISCOVERY = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';

  async function initialize() {
    await new Promise((res, rej) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({ apiKey: APP_CONFIG.GOOGLE_API_KEY, discoveryDocs: [DISCOVERY] });
          gapiReady = true;
          res();
        } catch (e) { rej(e); }
      });
    });
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: () => {}
    });
  }

  async function signIn() {
    return new Promise((res, rej) => {
      tokenClient.callback = resp => {
        if (resp.error) { rej(resp); return; }
        accessToken = resp.access_token;
        res(resp);
      };
      if (accessToken) {
        tokenClient.requestAccessToken({ prompt: '' });
      } else {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    });
  }

  function signOut() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken);
      accessToken = null;
    }
  }

  function isSignedIn() { return !!accessToken; }

  async function findFile() {
    if (APP_CONFIG.SHARED_VAULT_FILE_ID) return APP_CONFIG.SHARED_VAULT_FILE_ID;
    const r = await gapi.client.drive.files.list({
      q: `name='${APP_CONFIG.VAULT_FILE_NAME}' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id,modifiedTime)'
    });
    return r.result.files?.[0]?.id || null;
  }

  async function load() {
    const id = await findFile();
    if (!id) return null;
    const r = await gapi.client.drive.files.get({ fileId: id, alt: 'media' });
    return r.body;
  }

  async function save(encData) {
    const fileId = await findFile();
    const blob = new Blob([encData], { type: 'text/plain' });
    const meta = { name: APP_CONFIG.VAULT_FILE_NAME, mimeType: 'text/plain' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', blob);
    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const resp = await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error?.message || 'Drive upload failed');
    return json.id;
  }

  return { initialize, signIn, signOut, isSignedIn, load, save };
})();
