// ============================================================
// editor.js — editor.html 用（書類編集・作成）
// ============================================================

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const editId = params.get('id');   // 既存書類番号（編集時）
  const initType = params.get('type') || 'quote';

  let customers = [];
  let products  = [];
  let detailRows = [];   // { itemName, qty, unit, unitPrice, lineTotal, note }
  let currentDoc = null; // 編集中の書類ヘッダ

  // ---- 初期化 ----
  document.addEventListener('DOMContentLoaded', async function () {
    PDF.preloadImages();

    // 今日の日付セット
    document.getElementById('doc-issue-date').value = todayStr();

    // 種別セット
    document.getElementById('doc-type').value = initType;
    updateTitle();

    // 種別変更時にタイトル更新
    document.getElementById('doc-type').addEventListener('change', updateTitle);

    // 顧客・商品マスタ読み込み
    await Promise.all([loadCustomers(), loadProducts()]);

    // 既存書類の読み込み（編集モード）
    if (editId) {
      await loadDocument(editId);
    } else {
      // 新規: 採番して番号セット
      await assignNewNumber(document.getElementById('doc-type').value);
      addDetailRow(); // 最初の明細行
    }

    // ---- ボタンイベント ----
    document.getElementById('btn-save').addEventListener('click', saveDocument);
    document.getElementById('btn-preview').addEventListener('click', previewPdf);
    document.getElementById('btn-download').addEventListener('click', downloadPdf);
    document.getElementById('btn-drive').addEventListener('click', saveToDrive);
    document.getElementById('btn-add-row').addEventListener('click', addDetailRow);

    // 顧客名オートコンプリート → ID・敬称自動入力
    document.getElementById('customer-name').addEventListener('change', onCustomerNameChange);
  });

  // ---- タイトル更新 ----
  function updateTitle() {
    const type = document.getElementById('doc-type').value;
    const label = CONFIG.TYPE_LABEL[type] || '書類';
    document.getElementById('page-title-text').textContent = label + (editId ? ' 編集' : ' 作成');
  }

  // ---- 採番 ----
  async function assignNewNumber(type) {
    try {
      const res = await API.getNextNumber(type);
      document.getElementById('doc-number').value = res.number;
      document.getElementById('doc-number-badge').textContent = res.number;
    } catch (e) {
      // オフライン時はプレースホルダー
      const prefix = { quote:'Q', invoice:'I', receipt:'R' }[type] || 'X';
      const yr = new Date().getFullYear();
      document.getElementById('doc-number').value = prefix + '-' + yr + '-???';
      document.getElementById('doc-number-badge').textContent = '（採番エラー）';
      showToast('採番に失敗しました: ' + e.message, 'error');
    }
  }

  // ---- 顧客マスタ読み込み ----
  async function loadCustomers() {
    try {
      const res = await API.listCustomers();
      customers = res.data || [];
      const dl = document.getElementById('customer-list');
      dl.innerHTML = customers.map(c =>
        `<option value="${escHtml(c.name)}" data-id="${escHtml(c.id)}" data-honorific="${escHtml(c.honorific || '様')}">`
      ).join('');
    } catch (e) {
      console.warn('顧客マスタ読み込み失敗:', e.message);
    }
  }

  // ---- 商品マスタ読み込み ----
  async function loadProducts() {
    try {
      const res = await API.listProducts();
      products = res.data || [];
    } catch (e) {
      console.warn('商品マスタ読み込み失敗:', e.message);
    }
  }

  // ---- 顧客名変更時 ----
  function onCustomerNameChange() {
    const name = document.getElementById('customer-name').value;
    const matched = customers.find(c => c.name === name);
    if (matched) {
      document.getElementById('customer-id').value = matched.id;
      document.getElementById('customer-honorific').value = matched.honorific || '様';
    }
  }

  // ---- 既存書類読み込み（編集モード） ----
  async function loadDocument(number) {
    try {
      const res = await API.getDocument(number);
      currentDoc = res.data;
      const doc = res.data;

      document.getElementById('doc-type').value         = doc.type;
      document.getElementById('doc-number').value       = doc.number;
      document.getElementById('doc-number-badge').textContent = doc.number;
      document.getElementById('doc-issue-date').value   = doc.issueDate;
      document.getElementById('doc-status').value       = doc.status || '下書き';
      document.getElementById('doc-subject').value      = doc.subject || '';
      document.getElementById('customer-name').value    = doc.customerName || '';
      document.getElementById('customer-id').value      = doc.customerId || '';
      document.getElementById('doc-source-number').value = doc.sourceNumber || '';
      document.getElementById('doc-note').value         = doc.note || '';

      if (doc.driveUrl) {
        document.getElementById('drive-url-link').href = doc.driveUrl;
        document.getElementById('drive-url-link').style.display = 'inline';
        document.getElementById('drive-url-none').style.display = 'none';
      }

      updateTitle();

      // 明細
      detailRows = [];
      document.getElementById('detail-tbody').innerHTML = '';
      (res.details || []).forEach(d => addDetailRow(d));
      recalc();
    } catch (e) {
      showToast('書類読み込みエラー: ' + e.message, 'error');
    }
  }

  // ---- 明細行追加 ----
  function addDetailRow(data) {
    data = data || {};
    const idx = detailRows.length;
    detailRows.push({});
    const tbody = document.getElementById('detail-tbody');
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;

    // 品名（商品マスタdatalist付き）
    const prodListId = 'prod-list-' + idx;
    const prodDatalist = `<datalist id="${prodListId}">${products.map(p =>
      `<option value="${escHtml(p.name)}" data-price="${escHtml(p.standardPrice)}" data-unit="${escHtml(p.unit)}">`
    ).join('')}</datalist>`;

    tr.innerHTML = `
      <td>${prodDatalist}<input type="text" list="${prodListId}" value="${escHtml(data.itemName||'')}" placeholder="品名" data-field="itemName"></td>
      <td><input type="number" min="0" step="0.01" value="${data.qty||1}" data-field="qty" style="text-align:right;"></td>
      <td><input type="text" value="${escHtml(data.unit||'点')}" data-field="unit"></td>
      <td><input type="number" min="0" step="1" value="${data.unitPrice||0}" data-field="unitPrice" style="text-align:right;"></td>
      <td><input type="number" value="${data.lineTotal||0}" data-field="lineTotal" readonly style="background:#f9f9f9;text-align:right;"></td>
      <td><input type="text" value="${escHtml(data.note||'')}" data-field="note"></td>
      <td><button class="btn-remove" onclick="removeDetailRow(this)" title="削除">×</button></td>
    `;

    // 品名変更で単価・単位自動入力
    const nameInput = tr.querySelector('[data-field="itemName"]');
    nameInput.addEventListener('change', function () {
      const matched = products.find(p => p.name === this.value);
      if (matched) {
        tr.querySelector('[data-field="unitPrice"]').value = matched.standardPrice || 0;
        tr.querySelector('[data-field="unit"]').value = matched.unit || '点';
        calcRow(tr);
        recalc();
      }
    });

    // 数量・単価変更で行小計再計算
    ['qty', 'unitPrice'].forEach(f => {
      tr.querySelector('[data-field="' + f + '"]').addEventListener('input', function () {
        calcRow(tr);
        recalc();
      });
    });

    tbody.appendChild(tr);
    calcRow(tr);
    recalc();
  }

  function calcRow(tr) {
    const qty   = parseFloat(tr.querySelector('[data-field="qty"]').value) || 0;
    const price = parseFloat(tr.querySelector('[data-field="unitPrice"]').value) || 0;
    const total = Math.round(qty * price);
    tr.querySelector('[data-field="lineTotal"]').value = total;
    const idx = parseInt(tr.dataset.idx, 10);
    if (detailRows[idx] !== undefined) detailRows[idx].lineTotal = total;
  }

  window.removeDetailRow = function (btn) {
    const tr = btn.closest('tr');
    tr.remove();
    recalc();
  };

  // ---- 小計・税・合計再計算 ----
  function recalc() {
    const rows = document.querySelectorAll('#detail-tbody tr');
    let subtotal = 0;
    rows.forEach(function (tr) {
      subtotal += parseFloat(tr.querySelector('[data-field="lineTotal"]').value) || 0;
    });
    const tax   = Math.round(subtotal * CONFIG.TAX_RATE);
    const total = subtotal + tax;
    document.getElementById('disp-subtotal').textContent = '¥' + subtotal.toLocaleString();
    document.getElementById('disp-tax').textContent      = '¥' + tax.toLocaleString();
    document.getElementById('disp-total').textContent    = '¥' + total.toLocaleString();
    return { subtotal, tax, total };
  }

  // ---- フォームから書類オブジェクト生成 ----
  function buildDocObject() {
    const { subtotal, tax, total } = recalc();
    return {
      number:       document.getElementById('doc-number').value,
      type:         document.getElementById('doc-type').value,
      issueDate:    document.getElementById('doc-issue-date').value,
      customerId:   document.getElementById('customer-id').value,
      customerName: document.getElementById('customer-name').value,
      customerHonorific: document.getElementById('customer-honorific').value,
      subject:      document.getElementById('doc-subject').value,
      subtotal:     subtotal,
      tax:          tax,
      total:        total,
      status:       document.getElementById('doc-status').value,
      driveUrl:     document.getElementById('drive-url-link').href !== '#' ? document.getElementById('drive-url-link').href : '',
      sourceNumber: document.getElementById('doc-source-number').value,
      note:         document.getElementById('doc-note').value
    };
  }

  function buildDetails() {
    const rows = document.querySelectorAll('#detail-tbody tr');
    return Array.from(rows).map(function (tr) {
      return {
        itemName:  tr.querySelector('[data-field="itemName"]').value,
        qty:       parseFloat(tr.querySelector('[data-field="qty"]').value) || 0,
        unit:      tr.querySelector('[data-field="unit"]').value,
        unitPrice: parseFloat(tr.querySelector('[data-field="unitPrice"]').value) || 0,
        lineTotal: parseFloat(tr.querySelector('[data-field="lineTotal"]').value) || 0,
        note:      tr.querySelector('[data-field="note"]').value
      };
    }).filter(d => d.itemName.trim() !== '');
  }

  // ---- 保存 ----
  async function saveDocument() {
    const doc     = buildDocObject();
    const details = buildDetails();
    if (!doc.number || doc.number.includes('???')) {
      showToast('書類番号が未取得です。GAS WebApp URLを確認してください。', 'error');
      return;
    }
    if (!doc.customerName.trim()) {
      showToast('顧客名を入力してください。', 'error');
      return;
    }
    setBtnLoading('btn-save', true);
    try {
      if (editId) {
        await API.updateDocument(doc, details);
        showToast('保存しました', 'success');
      } else {
        await API.createDocument(doc, details);
        showToast('作成しました: ' + doc.number, 'success');
        // 編集モードに切り替え
        history.replaceState({}, '', 'editor.html?id=' + encodeURIComponent(doc.number) + '&type=' + doc.type);
      }
    } catch (e) {
      showToast('保存エラー: ' + e.message, 'error');
    } finally {
      setBtnLoading('btn-save', false);
    }
  }

  // ---- PDF プレビュー ----
  function previewPdf() {
    const doc     = buildDocObject();
    const details = buildDetails();
    try {
      PDF.preview(doc, details);
    } catch (e) {
      showToast('PDF生成エラー: ' + e.message, 'error');
    }
  }

  // ---- PDF ダウンロード ----
  function downloadPdf() {
    const doc     = buildDocObject();
    const details = buildDetails();
    try {
      PDF.download(doc, details);
      showToast('PDFをダウンロードしました', 'success');
    } catch (e) {
      showToast('PDF生成エラー: ' + e.message, 'error');
    }
  }

  // ---- Drive 保存 ----
  async function saveToDrive() {
    const doc     = buildDocObject();
    const details = buildDetails();
    if (!doc.number || doc.number.includes('???')) {
      showToast('先に保存してから Drive 保存してください。', 'error');
      return;
    }
    setBtnLoading('btn-drive', true);
    try {
      const base64   = PDF.generate(doc, details);
      const typeLabel = CONFIG.TYPE_LABEL[doc.type] || '書類';
      const filename  = doc.number + '_' + typeLabel + '.pdf';
      const res = await API.savePdf(doc.number, filename, base64);
      document.getElementById('drive-url-link').href = res.driveUrl;
      document.getElementById('drive-url-link').style.display = 'inline';
      document.getElementById('drive-url-none').style.display = 'none';
      showToast('Drive に保存しました', 'success');
    } catch (e) {
      showToast('Drive 保存エラー: ' + e.message, 'error');
    } finally {
      setBtnLoading('btn-drive', false);
    }
  }

  // ---- ヘルパー ----
  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  function setBtnLoading(id, flag) {
    document.getElementById(id).disabled = flag;
  }

  function showToast(msg, type) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
