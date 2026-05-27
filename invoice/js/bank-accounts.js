// ============================================================
// bank-accounts.js — bank-accounts.html 用（振込先口座マスタ管理）
// ============================================================

(function () {
  'use strict';

  let allAccounts = [];
  let editMode = false;

  document.addEventListener('DOMContentLoaded', function () {
    loadAccounts();

    document.getElementById('btn-new').addEventListener('click', openFormNew);
    document.getElementById('btn-cancel').addEventListener('click', closeForm);
    document.getElementById('btn-submit').addEventListener('click', submitForm);
    document.getElementById('btn-refresh').addEventListener('click', loadAccounts);
    document.getElementById('search-input').addEventListener('input', renderTable);
  });

  function loadAccounts() {
    API.listBankAccounts()
      .then(function (res) {
        allAccounts = res.data || [];
        renderTable();
      })
      .catch(function (err) {
        showToast('読み込みエラー: ' + err.message, 'error');
        document.getElementById('bank-tbody').innerHTML =
          '<tr><td colspan="8"><div class="empty-state"><span class="icon">&#x26A0;</span>読込失敗：シート未作成かGAS未デプロイの可能性</div></td></tr>';
      });
  }

  function renderTable() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    let rows = allAccounts;
    if (keyword) {
      rows = rows.filter(a =>
        (a.label || '').toLowerCase().includes(keyword) ||
        (a.bankName || '').toLowerCase().includes(keyword) ||
        (a.branchName || '').toLowerCase().includes(keyword)
      );
    }

    const tbody = document.getElementById('bank-tbody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><span class="icon">&#x1F3E6;</span>口座が登録されていません</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (a) {
      const bankBranch = escHtml(a.bankName || '') + (a.branchName ? ' / ' + escHtml(a.branchName) : '');
      const defBadge = a.isDefault
        ? '<span style="background:var(--color-accent);color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;">既定</span>'
        : '';
      return `<tr>
        <td style="color:var(--color-text-mute);font-size:12px;">${escHtml(a.id)}</td>
        <td style="font-weight:600;">${escHtml(a.label || '')}</td>
        <td>${bankBranch}</td>
        <td>${escHtml(a.accountType || '')}</td>
        <td style="font-family:monospace;">${escHtml(a.accountNumber || '')}</td>
        <td>${escHtml(a.accountHolder || '')}</td>
        <td style="text-align:center;">${defBadge}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" onclick="editAccount('${escHtml(a.id)}')">編集</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAccount('${escHtml(a.id)}','${escHtml(a.label || a.bankName || a.id)}')">削除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function openFormNew() {
    editMode = false;
    document.getElementById('form-title').textContent = '口座登録';
    document.getElementById('btn-submit').textContent = '登録';
    clearForm();
    // 既定口座が1件も無い場合は初期値「はい」
    const hasDefault = allAccounts.some(a => a.isDefault);
    document.getElementById('f-isDefault').value = hasDefault ? 'false' : 'true';
    document.getElementById('form-panel').style.display = 'block';
    document.getElementById('f-label').focus();
  }

  window.editAccount = function (id) {
    const a = allAccounts.find(x => x.id === id);
    if (!a) return;
    editMode = true;
    document.getElementById('form-title').textContent = '口座編集';
    document.getElementById('btn-submit').textContent = '更新';
    document.getElementById('edit-id').value          = a.id;
    document.getElementById('f-label').value          = a.label || '';
    document.getElementById('f-bankName').value       = a.bankName || '';
    document.getElementById('f-branchName').value     = a.branchName || '';
    document.getElementById('f-accountType').value    = a.accountType || '普通';
    document.getElementById('f-accountNumber').value  = a.accountNumber || '';
    document.getElementById('f-accountHolder').value  = a.accountHolder || '';
    document.getElementById('f-isDefault').value      = a.isDefault ? 'true' : 'false';
    document.getElementById('f-note').value           = a.note || '';
    document.getElementById('form-panel').style.display = 'block';
    document.getElementById('f-label').focus();
  };

  window.deleteAccount = function (id, label) {
    if (!confirm('口座「' + label + '」を削除しますか？')) return;
    API.deleteBankAccount(id)
      .then(function () {
        showToast('削除しました', 'success');
        loadAccounts();
      })
      .catch(function (err) { showToast('削除エラー: ' + err.message, 'error'); });
  };

  function submitForm() {
    const label         = document.getElementById('f-label').value.trim();
    const bankName      = document.getElementById('f-bankName').value.trim();
    const accountNumber = document.getElementById('f-accountNumber').value.trim();
    const accountHolder = document.getElementById('f-accountHolder').value.trim();
    if (!label)         { showToast('ラベルは必須です', 'error'); return; }
    if (!bankName)      { showToast('銀行名は必須です', 'error'); return; }
    if (!accountNumber) { showToast('口座番号は必須です', 'error'); return; }
    if (!accountHolder) { showToast('口座名義は必須です', 'error'); return; }

    const bankAccount = {
      id:            document.getElementById('edit-id').value,
      label:         label,
      bankName:      bankName,
      branchName:    document.getElementById('f-branchName').value,
      accountType:   document.getElementById('f-accountType').value,
      accountNumber: accountNumber,
      accountHolder: accountHolder,
      isDefault:     document.getElementById('f-isDefault').value === 'true',
      note:          document.getElementById('f-note').value
    };

    const apiCall = editMode ? API.updateBankAccount(bankAccount) : API.createBankAccount(bankAccount);
    apiCall
      .then(function (res) {
        showToast(editMode ? '更新しました' : '登録しました: ' + (res.id || bankAccount.id), 'success');
        closeForm();
        loadAccounts();
      })
      .catch(function (err) { showToast('保存エラー: ' + err.message, 'error'); });
  }

  function closeForm() {
    document.getElementById('form-panel').style.display = 'none';
    clearForm();
  }

  function clearForm() {
    ['edit-id','f-label','f-bankName','f-branchName','f-accountNumber','f-accountHolder','f-note'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('f-accountType').value = '普通';
    document.getElementById('f-isDefault').value   = 'false';
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
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
