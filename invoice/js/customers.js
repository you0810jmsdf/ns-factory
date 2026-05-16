// ============================================================
// customers.js — customers.html 用（顧客マスタ管理）
// ============================================================

(function () {
  'use strict';

  let allCustomers = [];
  let editMode = false;

  document.addEventListener('DOMContentLoaded', function () {
    loadCustomers();

    document.getElementById('btn-new').addEventListener('click', openFormNew);
    document.getElementById('btn-cancel').addEventListener('click', closeForm);
    document.getElementById('btn-submit').addEventListener('click', submitForm);
    document.getElementById('btn-refresh').addEventListener('click', loadCustomers);
    document.getElementById('search-input').addEventListener('input', renderTable);
  });

  function loadCustomers() {
    API.listCustomers()
      .then(function (res) {
        allCustomers = res.data || [];
        renderTable();
      })
      .catch(function (err) {
        showToast('読み込みエラー: ' + err.message, 'error');
      });
  }

  function renderTable() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    let rows = allCustomers;
    if (keyword) {
      rows = rows.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        (c.email || '').toLowerCase().includes(keyword)
      );
    }

    const tbody = document.getElementById('cust-tbody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="icon">&#x1F465;</span>顧客が登録されていません</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (c) {
      return `<tr>
        <td style="color:var(--color-text-mute);font-size:12px;">${escHtml(c.id)}</td>
        <td style="font-weight:600;">${escHtml(c.name)}</td>
        <td>${escHtml(c.honorific)}</td>
        <td>${escHtml(c.phone)}</td>
        <td>${escHtml(c.email)}</td>
        <td>${escHtml(c.contact)}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" onclick="editCustomer('${escHtml(c.id)}')">編集</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${escHtml(c.id)}','${escHtml(c.name)}')">削除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function openFormNew() {
    editMode = false;
    document.getElementById('form-title').textContent = '顧客登録';
    document.getElementById('btn-submit').textContent = '登録';
    clearForm();
    document.getElementById('form-panel').style.display = 'block';
    document.getElementById('f-name').focus();
  }

  window.editCustomer = function (id) {
    const c = allCustomers.find(x => x.id === id);
    if (!c) return;
    editMode = true;
    document.getElementById('form-title').textContent = '顧客編集';
    document.getElementById('btn-submit').textContent = '更新';
    document.getElementById('edit-id').value   = c.id;
    document.getElementById('f-name').value    = c.name;
    document.getElementById('f-honorific').value = c.honorific || '様';
    document.getElementById('f-zip').value     = c.zip;
    document.getElementById('f-address').value = c.address;
    document.getElementById('f-phone').value   = c.phone;
    document.getElementById('f-email').value   = c.email;
    document.getElementById('f-contact').value = c.contact;
    document.getElementById('f-note').value    = c.note;
    document.getElementById('form-panel').style.display = 'block';
    document.getElementById('f-name').focus();
  };

  window.deleteCustomer = function (id, name) {
    if (!confirm('顧客「' + name + '」を削除しますか？')) return;
    API.deleteCustomer(id)
      .then(function () {
        showToast('削除しました', 'success');
        loadCustomers();
      })
      .catch(function (err) { showToast('削除エラー: ' + err.message, 'error'); });
  };

  function submitForm() {
    const name = document.getElementById('f-name').value.trim();
    if (!name) { showToast('顧客名は必須です', 'error'); return; }

    const customer = {
      id:        document.getElementById('edit-id').value,
      name:      name,
      honorific: document.getElementById('f-honorific').value,
      zip:       document.getElementById('f-zip').value,
      address:   document.getElementById('f-address').value,
      phone:     document.getElementById('f-phone').value,
      email:     document.getElementById('f-email').value,
      contact:   document.getElementById('f-contact').value,
      note:      document.getElementById('f-note').value
    };

    const apiCall = editMode ? API.updateCustomer(customer) : API.createCustomer(customer);
    apiCall
      .then(function (res) {
        showToast(editMode ? '更新しました' : '登録しました: ' + (res.id || customer.id), 'success');
        closeForm();
        loadCustomers();
      })
      .catch(function (err) { showToast('保存エラー: ' + err.message, 'error'); });
  }

  function closeForm() {
    document.getElementById('form-panel').style.display = 'none';
    clearForm();
  }

  function clearForm() {
    ['edit-id','f-name','f-zip','f-address','f-phone','f-email','f-contact','f-note'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('f-honorific').value = '様';
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
