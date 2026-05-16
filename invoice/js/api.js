// ============================================================
// api.js — GAS WebApp 呼び出しラッパー
// ============================================================

const API = {
  /**
   * GAS POST 呼び出し（共通）
   * @param {object} body - action を含むオブジェクト
   * @returns {Promise<object>}
   */
  async post(body) {
    const url = CONFIG.GAS_WEBAPP_URL;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // GAS CORS対策でtext/plain
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'GAS エラー');
    return json;
  },

  // === 書類 ===
  listDocuments(type)           { return this.post({ action: 'listDocuments', type }); },
  getDocument(number)           { return this.post({ action: 'getDocument', number }); },
  createDocument(doc, details)  { return this.post({ action: 'createDocument', doc, details }); },
  updateDocument(doc, details)  { return this.post({ action: 'updateDocument', doc, details }); },
  deleteDocument(number)        { return this.post({ action: 'deleteDocument', number }); },

  // === 顧客マスタ ===
  listCustomers()               { return this.post({ action: 'listCustomers' }); },
  createCustomer(customer)      { return this.post({ action: 'createCustomer', customer }); },
  updateCustomer(customer)      { return this.post({ action: 'updateCustomer', customer }); },
  deleteCustomer(id)            { return this.post({ action: 'deleteCustomer', id }); },

  // === 商品マスタ ===
  listProducts()                { return this.post({ action: 'listProducts' }); },
  createProduct(product)        { return this.post({ action: 'createProduct', product }); },
  updateProduct(product)        { return this.post({ action: 'updateProduct', product }); },
  deleteProduct(id)             { return this.post({ action: 'deleteProduct', id }); },

  // === 採番 ===
  getNextNumber(type)           { return this.post({ action: 'getNextNumber', type }); },

  // === PDF Drive保存 ===
  savePdf(number, filename, base64) {
    return this.post({ action: 'savePdf', number, filename, base64 });
  },

  // === 昇格 ===
  promoteDocument(sourceNumber, newType) {
    return this.post({ action: 'promoteDocument', sourceNumber, newType });
  }
};
