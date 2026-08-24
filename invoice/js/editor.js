// ============================================================
// editor.js — editor.html 用（書類編集・作成）
// ============================================================

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  let editId = params.get('id');     // 既存書類番号（編集時。新規保存が通ったらその番号を入れる）
  const initType = params.get('type') || 'quote';
  const fromCM   = params.get('fromCM') === '1'; // customer_manager からの引込フラグ

  let customers = [];
  let products  = [];
  let bankAccounts = []; // 振込先口座マスタ
  let detailRows = [];   // { itemName, qty, unit, unitPrice, lineTotal, note }
  let currentDoc = null; // 編集中の書類ヘッダ
  const SS_CM_KEY = 'nsf_cm_invoice_payload'; // customer_manager 連携 sessionStorage キー
  const LS_SHOW_ADDR_KEY = 'nsf_invoice_show_customer_address'; // 宛先住所を印刷するかの既定値

  // ---- 初期化 ----
  document.addEventListener('DOMContentLoaded', async function () {
    // 今日の日付セット
    document.getElementById('doc-issue-date').value = todayStr();

    // 種別セット
    document.getElementById('doc-type').value = initType;
    updateTitle();

    // 種別変更時にタイトル更新
    document.getElementById('doc-type').addEventListener('change', updateTitle);

    // 顧客・商品・振込先口座マスタ読み込み
    await Promise.all([loadCustomers(), loadProducts(), loadBankAccounts()]);

    // 既存書類の読み込み（編集モード）
    if (editId) {
      await loadDocument(editId);
    } else {
      // 新規: ここでは採番しない（保存時にGAS側が採番する）
      showPendingNumber();
      // customer_manager からの引込があれば反映
      const applied = applyCmPayloadIfAny();
      if (!applied) addDetailRow(); // 最初の明細行
    }

    // ---- ボタンイベント ----
    document.getElementById('btn-save').addEventListener('click', saveDocument);
    document.getElementById('btn-preview').addEventListener('click', previewPdf);
    document.getElementById('btn-download').addEventListener('click', downloadPdf);
    document.getElementById('btn-drive').addEventListener('click', saveToDrive);
    document.getElementById('btn-add-row').addEventListener('click', addDetailRow);

    // 顧客名オートコンプリート → ID・敬称自動入力
    document.getElementById('customer-name').addEventListener('change', onCustomerNameChange);

    // 振込先口座セレクト → 備考自動転記
    document.getElementById('bank-account-select').addEventListener('change', onBankAccountChange);

    // 消費税トグル変更で再計算
    document.getElementById('doc-tax-included').addEventListener('change', recalc);

    // 宛先住所を印刷するか（ブラウザに既定値を記憶。法令上は宛名のみで足りるので既定OFF）
    const showAddrEl = document.getElementById('show-customer-address');
    showAddrEl.checked = (localStorage.getItem(LS_SHOW_ADDR_KEY) === '1');
    showAddrEl.addEventListener('change', function () {
      localStorage.setItem(LS_SHOW_ADDR_KEY, this.checked ? '1' : '0');
    });

    // 関連受付番号 入力時にリンク更新
    document.getElementById('doc-related-order').addEventListener('input', updateOrderProgressLink);
  });

  // ---- タイトル更新 ----
  function updateTitle() {
    const type = document.getElementById('doc-type').value;
    const label = CONFIG.TYPE_LABEL[type] || '書類';
    document.getElementById('page-title-text').textContent = label + (editId ? ' 編集' : ' 作成');
  }

  // ---- 書類番号の表示 ----
  // 採番は保存時にGAS側（createDocument）で行う。画面を開いただけでは番号を消費しない。
  function showPendingNumber() {
    document.getElementById('doc-number').value = '';
    document.getElementById('doc-number-badge').textContent = '保存時に採番';
  }

  function applyAssignedNumber(number) {
    document.getElementById('doc-number').value = number;
    document.getElementById('doc-number-badge').textContent = number;
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
      // 住所・連絡先を自動入力
      const zip     = matched.zip     || '';
      const address = matched.address || '';
      const phone   = matched.phone   || '';
      const email   = matched.email   || '';
      document.getElementById('customer-zip').value     = zip;
      document.getElementById('customer-address').value = address;
      document.getElementById('customer-phone').value   = phone;
      document.getElementById('customer-email').value   = email;
      // 値があるフィールド行のみ表示
      document.getElementById('customer-detail-fields').style.display  = (zip || address) ? '' : 'none';
      document.getElementById('customer-contact-fields').style.display = (phone || email) ? '' : 'none';
    } else {
      // 既存マスタに無い → ID 空欄（保存時に新規作成される）
      document.getElementById('customer-id').value      = '';
      document.getElementById('customer-zip').value     = '';
      document.getElementById('customer-address').value = '';
      document.getElementById('customer-phone').value   = '';
      document.getElementById('customer-email').value   = '';
      document.getElementById('customer-detail-fields').style.display  = 'none';
      document.getElementById('customer-contact-fields').style.display = 'none';
    }
  }

  // ---- 振込先口座マスタ読み込み ----
  async function loadBankAccounts() {
    try {
      const res = await API.listBankAccounts();
      bankAccounts = res.data || [];
      renderBankAccountSelect();
    } catch (e) {
      console.warn('振込先口座マスタ読み込み失敗:', e.message);
    }
  }

  function renderBankAccountSelect() {
    const sel = document.getElementById('bank-account-select');
    if (!sel) return;
    const opts = ['<option value="">（振込先を備考に記載しない）</option>'];
    bankAccounts.forEach(function (a) {
      const icon = (a.kind === 'btc') ? '₿ ' : '🏦 ';
      const label = icon + (a.label || a.bankName || a.id) + (a.isDefault ? '（既定）' : '');
      opts.push(`<option value="${escHtml(a.id)}">${escHtml(label)}</option>`);
    });
    sel.innerHTML = opts.join('');
    // 新規かつ既存書類未読込の場合は既定口座を選択
    if (!editId) {
      const def = bankAccounts.find(a => a.isDefault);
      if (def) {
        sel.value = def.id;
        applyBankAccountToNote(def, /*overwrite=*/true);
      }
    }
  }

  // ---- 口座セレクト変更 ----
  function onBankAccountChange() {
    const sel = document.getElementById('bank-account-select');
    const acc = bankAccounts.find(a => a.id === sel.value);
    const autoWrite = document.getElementById('bank-auto-write').checked;
    if (!autoWrite) return;
    if (!acc) {
      removeBankBlockFromNote();
      return;
    }
    applyBankAccountToNote(acc, /*overwrite=*/false);
  }

  // ---- 備考textareaに振込先ブロックを差し込む ----
  // 区切りマーカー（=== 振込先 === ... ===========）で囲み、再選択時は上書き
  const BANK_MARK_START = '=== 振込先 ===';
  const BANK_MARK_END   = '================';

  function buildBankBlock(acc) {
    const kind = acc.kind || 'bank';
    if (kind === 'btc') return buildBtcBlock(acc);
    return buildBankBlockBankKind(acc);
  }

  function buildBankBlockBankKind(acc) {
    const lines = [BANK_MARK_START];
    lines.push('【お振込先】');
    if (acc.bankName)      lines.push(acc.bankName + (acc.branchName ? ('　' + acc.branchName) : ''));
    if (acc.accountType || acc.accountNumber) {
      lines.push((acc.accountType || '') + (acc.accountNumber ? ('　' + acc.accountNumber) : ''));
    }
    if (acc.accountHolder) lines.push('名義: ' + acc.accountHolder);
    if (acc.note)          lines.push(acc.note);
    lines.push(BANK_MARK_END);
    return lines.join('\n');
  }

  function buildBtcBlock(acc) {
    const lines = [BANK_MARK_START];
    const network = acc.accountType || 'Onchain';
    lines.push(`【BTC支払い（${network}）】`);
    if (acc.bankName && acc.bankName !== 'Bitcoin') lines.push(acc.bankName);
    if (acc.accountNumber) {
      lines.push('アドレス: ' + acc.accountNumber);
      // QRコード生成URL（QR Server API・無料・https）
      const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(acc.accountNumber);
      lines.push('QR: ' + qrUrl);
    }
    if (acc.accountHolder) lines.push('受取人: ' + acc.accountHolder);
    if (network === 'Onchain') {
      lines.push('※ ネットワーク手数料はお客様ご負担となります');
    } else if (network === 'Lightning') {
      lines.push('※ Lightning Network 経由（即時決済・少額向け）');
    }
    if (acc.note) lines.push(acc.note);
    lines.push(BANK_MARK_END);
    return lines.join('\n');
  }

  function applyBankAccountToNote(acc, overwrite) {
    const ta = document.getElementById('doc-note');
    const current = ta.value || '';
    const block = buildBankBlock(acc);
    const stripped = removeBankBlockText(current);
    // 既存テキストの末尾に追加（改行を確保）
    const sep = stripped.trim() ? (stripped.replace(/\s+$/, '') + '\n\n') : '';
    ta.value = sep + block;
  }

  function removeBankBlockFromNote() {
    const ta = document.getElementById('doc-note');
    ta.value = removeBankBlockText(ta.value || '').replace(/\s+$/, '');
  }

  function removeBankBlockText(text) {
    const startIdx = text.indexOf(BANK_MARK_START);
    if (startIdx < 0) return text;
    const endMarkIdx = text.indexOf(BANK_MARK_END, startIdx);
    if (endMarkIdx < 0) return text.slice(0, startIdx).replace(/\s+$/, '');
    return (text.slice(0, startIdx) + text.slice(endMarkIdx + BANK_MARK_END.length)).replace(/\n{3,}/g, '\n\n');
  }

  // ---- customer_manager からの引込ペイロード適用 ----
  // sessionStorage[SS_CM_KEY] = {
  //   customer: { name, honorific, zip, address, phone, email, note },
  //   subject: '...',
  //   details: [ { itemName, qty, unit, unitPrice, note } ],
  //   docType: 'invoice'
  // }
  function applyCmPayloadIfAny() {
    console.log('[CM連携] applyCmPayloadIfAny 開始 / fromCM =', fromCM);
    if (!fromCM) {
      console.log('[CM連携] fromCM フラグなし → スキップ');
      return false;
    }
    let payload;
    // 優先1: URLパラメータ payload （クロスオリジン対応）
    const urlPayload = params.get('payload');
    console.log('[CM連携] URL payload:', urlPayload ? `${urlPayload.length}文字` : 'なし');
    if (urlPayload) {
      // URLSearchParams は自動 decode するので JSON.parse 直接実行
      try {
        payload = JSON.parse(urlPayload);
        console.log('[CM連携] URLパラメータから直接パース成功');
      } catch (e1) {
        // 念のため decodeURIComponent で再試行
        try {
          payload = JSON.parse(decodeURIComponent(urlPayload));
          console.log('[CM連携] decodeURIComponent経由でパース成功');
        } catch (e2) {
          console.error('[CM連携] URLペイロードのパース失敗:', e1.message, '/', e2.message);
          console.error('[CM連携] 生payload先頭200文字:', String(urlPayload).slice(0, 200));
        }
      }
    }
    // 優先2: sessionStorage （同一オリジン時のフォールバック）
    if (!payload) {
      try {
        const raw = sessionStorage.getItem(SS_CM_KEY);
        if (raw) {
          payload = JSON.parse(raw);
          console.log('[CM連携] sessionStorageからパース成功');
        }
      } catch (e) {
        console.warn('[CM連携] sessionStorageペイロード読込失敗:', e.message);
      }
    }
    if (!payload) {
      console.warn('[CM連携] payload 取得失敗（URL/sessionStorage 両方とも空）');
      showToast('CM連携データの取得に失敗しました（DevToolsコンソールを確認）', 'error');
      return false;
    }
    console.log('[CM連携] payload 適用:', payload);
    // F5 / ブックマーク復元時もデータが残るよう、URL/sessionStorage は意図的に除去しない
    // （リロード時に再適用されるが、書類番号は再採番されるので実害なし）

    // 顧客情報
    if (payload.customer && payload.customer.name) {
      document.getElementById('customer-name').value = payload.customer.name;
      document.getElementById('customer-honorific').value = payload.customer.honorific || '様';
      const matched = customers.find(c => c.name === payload.customer.name);
      if (matched) {
        document.getElementById('customer-id').value = matched.id;
      } else {
        document.getElementById('customer-id').value = ''; // 保存時に新規作成
      }
      // 住所・連絡先（顧客管理側の値を優先し、無ければ顧客マスタから補完）
      const cmZip     = payload.customer.zip     || (matched && matched.zip)     || '';
      const cmAddress = payload.customer.address || (matched && matched.address) || '';
      const cmPhone   = payload.customer.phone   || (matched && matched.phone)   || '';
      const cmEmail   = payload.customer.email   || (matched && matched.email)   || '';
      document.getElementById('customer-zip').value     = cmZip;
      document.getElementById('customer-address').value = cmAddress;
      document.getElementById('customer-phone').value   = cmPhone;
      document.getElementById('customer-email').value   = cmEmail;
      document.getElementById('customer-detail-fields').style.display  = (cmZip || cmAddress) ? '' : 'none';
      document.getElementById('customer-contact-fields').style.display = (cmPhone || cmEmail) ? '' : 'none';
    }

    // 件名
    if (payload.subject) {
      document.getElementById('doc-subject').value = payload.subject;
    }

    // 種別
    if (payload.docType) {
      document.getElementById('doc-type').value = payload.docType;
      updateTitle();
    }

    // 消費税フラグ（CM側から明示指定された場合のみ反映・デフォルトはOFF）
    if (typeof payload.taxIncluded === 'boolean') {
      document.getElementById('doc-tax-included').checked = payload.taxIncluded;
    }

    // 明細行
    if (Array.isArray(payload.details) && payload.details.length > 0) {
      payload.details.forEach(d => addDetailRow(d));
    } else {
      addDetailRow();
    }
    recalc();

    // 引込元の顧客情報を保持（保存時に顧客マスタへ同期するため）
    window._cmCustomerSnapshot = payload.customer || null;

    showToast(`顧客管理から引込: ${payload.customer && payload.customer.name || ''}（明細${(payload.details||[]).length}件）`, 'success');
    return true;
  }

  // ---- 顧客マスタ同期: 既存になければ新規作成 ----
  async function syncCustomerIfMissing() {
    const name = document.getElementById('customer-name').value.trim();
    const idField = document.getElementById('customer-id');
    if (!name) return;
    if (idField.value) return; // 既にIDがあれば同期不要
    const matched = customers.find(c => c.name === name);
    if (matched) {
      idField.value = matched.id;
      return;
    }
    // CM引込時のスナップショットから情報補完
    const snap = window._cmCustomerSnapshot || {};
    const newCustomer = {
      name:      name,
      honorific: document.getElementById('customer-honorific').value || '様',
      zip:       snap.zip || '',
      address:   snap.address || '',
      phone:     snap.phone || '',
      email:     snap.email || '',
      contact:   '',
      note:      snap.note || ''
    };
    try {
      const res = await API.createCustomer(newCustomer);
      idField.value = res.id;
      // ローカル一覧にも追加
      customers.push(Object.assign({ id: res.id }, newCustomer));
      showToast(`顧客マスタに新規登録: ${res.id} ${name}`, 'success');
    } catch (e) {
      console.warn('顧客マスタ自動登録失敗:', e.message);
      showToast('顧客マスタ自動登録に失敗（書類は保存されます）: ' + e.message, 'error');
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
      onCustomerNameChange(); // 住所・連絡先を顧客マスタから復元
      document.getElementById('doc-source-number').value = doc.sourceNumber || '';
      document.getElementById('doc-related-order').value = doc.relatedOrderNumber || '';
      updateOrderProgressLink();
      document.getElementById('doc-note').value         = doc.note || '';

      if (doc.driveUrl) {
        document.getElementById('drive-url-link').href = doc.driveUrl;
        document.getElementById('drive-url-link').style.display = 'inline';
        document.getElementById('drive-url-none').style.display = 'none';
      }

      // 消費税トグル: 保存済みの doc.tax > 0 なら自動ON
      document.getElementById('doc-tax-included').checked = (parseFloat(doc.tax) || 0) > 0;

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
    const taxIncluded = document.getElementById('doc-tax-included').checked;
    const tax   = taxIncluded ? Math.round(subtotal * CONFIG.TAX_RATE) : 0;
    const total = subtotal + tax;
    document.getElementById('disp-subtotal').textContent = '¥' + subtotal.toLocaleString();
    document.getElementById('disp-tax').textContent      = '¥' + tax.toLocaleString();
    document.getElementById('disp-total').textContent    = '¥' + total.toLocaleString();
    document.getElementById('tax-row').style.display     = taxIncluded ? '' : 'none';
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
      relatedOrderNumber: document.getElementById('doc-related-order').value.trim(),
      note:         document.getElementById('doc-note').value
    };
  }

  // ---- オーダー進捗ページへのリンク更新 ----
  function updateOrderProgressLink() {
    const v = (document.getElementById('doc-related-order').value || '').trim();
    const link = document.getElementById('link-to-order-progress');
    if (!link) return;
    if (v) {
      link.href = '../orderprogress.html?focus=' + encodeURIComponent(v);
      link.style.display = '';
    } else {
      link.href = '#';
      link.style.display = 'none';
    }
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
    if (!document.getElementById('customer-name').value.trim()) {
      showToast('顧客名を入力してください。', 'error');
      return;
    }
    setBtnLoading('btn-save', true);
    try {
      // 顧客マスタに無ければ新規作成（IDを採番）
      await syncCustomerIfMissing();

      const doc     = buildDocObject();
      const details = buildDetails();
      if (editId) {
        if (!doc.number) {
          showToast('書類番号が取得できていません。画面を再読み込みしてください。', 'error');
          return;
        }
        await API.updateDocument(doc, details);
        showToast('保存しました', 'success');
      } else {
        // number は空のまま送る。GAS が台帳へ書く直前に採番して返す。
        const res = await API.createDocument(doc, details);
        const assigned = res.number || doc.number;
        applyAssignedNumber(assigned);
        showToast('作成しました: ' + assigned, 'success');
        // 以後は更新モード。editId を立てないと2回目の保存で別番号の書類が増える。
        editId = assigned;
        history.replaceState({}, '', 'editor.html?id=' + encodeURIComponent(assigned) + '&type=' + doc.type);
      }
    } catch (e) {
      showToast('保存エラー: ' + e.message, 'error');
    } finally {
      setBtnLoading('btn-save', false);
    }
  }

  // ---- 印刷エリアにHTMLを流し込む（共通） ----
  function fillPrintArea() {
    const doc     = buildDocObject();
    const details = buildDetails();
    const typeLabel = CONFIG.TYPE_LABEL[doc.type] || '書類';

    document.getElementById('pa-title').textContent       = typeLabel;
    document.getElementById('pa-number').textContent      = doc.number || '（保存後に採番）';
    document.getElementById('pa-issue-date').textContent  = doc.issueDate || '';
    document.getElementById('pa-customer-name').textContent      = doc.customerName || '';
    document.getElementById('pa-customer-honorific').textContent = doc.customerHonorific || '様';

    // 宛先住所（チェックONかつ値があるときだけ印刷。法令上の必須項目は宛名のみ）
    const showAddr    = document.getElementById('show-customer-address').checked;
    const custZip     = (document.getElementById('customer-zip').value     || '').trim();
    const custAddress = (document.getElementById('customer-address').value || '').trim();
    const addrBlock   = document.getElementById('pa-customer-address-block');
    if (showAddr && (custZip || custAddress)) {
      document.getElementById('pa-customer-zip').textContent     = custZip ? '〒' + custZip : '';
      document.getElementById('pa-customer-address').textContent = custAddress;
      addrBlock.style.display = '';
    } else {
      addrBlock.style.display = 'none';
    }
    document.getElementById('pa-subject').textContent     = doc.subject || '';

    // 上部の合計表示ラベル（請求書/見積書/領収書で言い回し変更）
    const totalLabel = {
      invoice: 'ご請求金額',
      quote:   'お見積金額',
      receipt: 'ご入金金額'
    }[doc.type] || 'ご請求金額';
    document.getElementById('pa-total-label').textContent = totalLabel;
    document.getElementById('pa-total').textContent  = Number(doc.total).toLocaleString();
    document.getElementById('pa-total2').textContent = Number(doc.total).toLocaleString();
    document.getElementById('pa-subtotal').textContent = Number(doc.subtotal).toLocaleString();
    document.getElementById('pa-tax').textContent      = Number(doc.tax).toLocaleString();

    // 消費税行（OFF時は非表示）
    const taxIncluded = document.getElementById('doc-tax-included').checked;
    document.getElementById('pa-tax-row').style.display = taxIncluded ? '' : 'none';

    // 発行者情報
    document.getElementById('pa-issuer-owner').textContent   = CONFIG.COMPANY.owner   || '';
    document.getElementById('pa-issuer-address').textContent = CONFIG.COMPANY.address || '';
    document.getElementById('pa-issuer-phone').textContent   = CONFIG.COMPANY.phone ? 'TEL: ' + CONFIG.COMPANY.phone : '';
    document.getElementById('pa-issuer-email').textContent   = CONFIG.COMPANY.email   ? 'Mail: ' + CONFIG.COMPANY.email : '';
    document.getElementById('pa-issuer-invoice').textContent = CONFIG.COMPANY.invoice || '';

    // 明細テーブル
    const tbody = document.getElementById('pa-tbody');
    tbody.innerHTML = details.map(function(d) {
      return `<tr>
        <td>${escHtml(d.itemName)}</td>
        <td>${escHtml(d.qty)}${d.unit ? ' ' + escHtml(d.unit) : ''}</td>
        <td>¥${Number(d.unitPrice).toLocaleString()}</td>
        <td>¥${Number(d.lineTotal).toLocaleString()}</td>
        <td>${escHtml(d.note || '')}</td>
      </tr>`;
    }).join('');

    // 備考
    const noteBlock = document.getElementById('pa-note-block');
    const notePre   = document.getElementById('pa-note');
    if (doc.note && doc.note.trim()) {
      notePre.textContent = doc.note;
      noteBlock.style.display = '';
    } else {
      noteBlock.style.display = 'none';
    }

    // フッタ種別
    document.getElementById('pa-footer-type').textContent = typeLabel;
  }

  // ---- プレビュー / PDF保存（どちらも window.print() で起動） ----
  function previewPdf() {
    if (!document.getElementById('customer-name').value.trim()) {
      if (!confirm('顧客名が未入力です。このまま印刷プレビューを開きますか？')) return;
    }
    if (!document.getElementById('doc-number').value.trim()) {
      if (!confirm('まだ保存していないため、書類番号が「（保存後に採番）」と印刷されます。\n\n先に「保存」を押すことをおすすめします。このまま開きますか？')) return;
    }
    try {
      fillPrintArea();
      // 印刷ダイアログを起動（ユーザーがPDFとして保存することを想定）
      window.print();
    } catch (e) {
      showToast('印刷プレビュー生成エラー: ' + e.message, 'error');
    }
  }

  // PDF保存ボタンも実体は同じ（印刷ダイアログから「PDFとして保存」を選ぶ）
  function downloadPdf() {
    previewPdf();
    showToast('印刷ダイアログで「PDFとして保存」を選択してください', 'success');
  }

  // ---- Drive 保存（当面は印刷PDF→手動アップロード案内） ----
  async function saveToDrive() {
    alert(
      'Drive 自動保存は現在準備中です。\n\n' +
      '【代替手順】\n' +
      '1. 「PDF保存」ボタンを押す\n' +
      '2. 印刷ダイアログで「PDFとして保存」を選択\n' +
      '3. 書類台帳から該当書類を開き、生成されたPDFを Drive に手動アップロード\n\n' +
      '※ 日本語フォント対応のため、印刷ダイアログ経由に変更しました'
    );
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
