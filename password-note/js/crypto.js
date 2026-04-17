const CryptoManager = (() => {
  const ITERATIONS = 600000;
  const SALT_LEN = 16;
  const IV_LEN = 12;

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
    const combined = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
    combined.set(salt);
    combined.set(iv, SALT_LEN);
    combined.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
    return btoa(String.fromCharCode(...combined));
  }

  async function decrypt(b64, password) {
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt = combined.slice(0, SALT_LEN);
    const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const ciphertext = combined.slice(SALT_LEN + IV_LEN);
    const key = await deriveKey(password, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  return { encrypt, decrypt };
})();
