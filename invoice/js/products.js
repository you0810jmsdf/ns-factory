// ============================================================
// products.js — products.html 用（商品マスタ管理）
// ============================================================

(function () {
  'use strict';

  let allProducts = [];
  let editMode = false;

  document.addEventListener('DOMContentLoaded', function () {
    loadProducts();

    document.getElementById('btn-new').addEventListener('click', openFormNew);
    document.getElementById('btn-cancel').addEventListener('click', closeForm);
    document.getElementById('btn-submit').addEventListener('click', submitForm);
    document.getElementById('btn-refresh').addEventListener('click', loadProducts);
    document.getElementById('search-input').addEventListener('input', renderTable);
  });

  function loadProducts() {
    API.listProducts()
      .then(function (res) {
        allProducts = res.data || [];
        renderTable();
      })
      .catch(function (err) {
        showToast('読み込みエラー: ' + err.message, 'error');
      });
  }

  function renderTable() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    let rows = allProducts;
    if (keyword) {
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        (p.category || '').toLowerCase().includes(keyword)
      );
    }

    const tbody = document.getElementById('prod-tbody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="icon">&#x1F6CD;</span>商品が登録されていません</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (p) {
      return `<tr>
        <td style="color:var(--color-text-mute);font-size:12px;">${escHtml(p.id)}</td>
        <td style="font-weight:600;">${escHtml(p.name)}</td>
        <td style="text-align:right;">¥${Number(p.standardPrice || 0).toLocaleString()}</td>
        <td>${escHtml(p.unit)}</td>
        <td>${escHtml(p.category)}</td>
        <td style="font-size:12px;color:var(--color-text-sub);">${escHtml(p.note)}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" onclick="editProduct('${escHtml(p.id)}')">編集</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${escHtml(p.id)}','${escHtml(p.name)}')">削除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function openFormNew() {
    editMode = false;
    document.getElementById('form-title').textContent = '商品登録';
    document.getElementById('btn-submit').textContent = '登録';
    clearForm();
    document.getElementById('form-panel').style.display = 'block';
    document.getElementById('f-name').focus();
  }

  window.editProduct = function (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    editMode = true;
    document.getElementById('form-title').textContent = '商品編集';
    document.getElementById('btn-submit').textContent = '更新';
    document.getElementById('edit-id').value    = p.id;
    document.getElementById('f-name').value     = p.name;
    document.getElementById('f-price').value    = p.standardPrice;
    document.getElementById('f-unit').value     = p.unit;
    document.getElementById('f-category').value = p.category;
    document.getElementById('f-note').value     = p.note;
    document.getElementById('form-panel').style.display = 'block';
    document.getElementById('f-name').focus();
  };

  window.deleteProduct = function (id, name) {
    if (!confirm('商品「' + name + '」を削除しますか？')) return;
    API.deleteProduct(id)
      .then(function () {
        showToast('削除しました', 'success');
        loadProducts();
      })
      .catch(function (err) { showToast('削除エラー: ' + err.message, 'error'); });
  };

  function submitForm() {
    const name = document.getElementById('f-name').value.trim();
    if (!name) { showToast('品名は必須です', 'error'); return; }

    const product = {
      id:            document.getElementById('edit-id').value,
      name:          name,
      standardPrice: document.getElementById('f-price').value || 0,
      unit:          document.getElementById('f-unit').value || '点',
      category:      document.getElementById('f-category').value,
      note:          document.getElementById('f-note').value
    };

    const apiCall = editMode ? API.updateProduct(product) : API.createProduct(product);
    apiCall
      .then(function (res) {
        showToast(editMode ? '更新しました' : '登録しました: ' + (res.id || product.id), 'success');
        closeForm();
        loadProducts();
      })
      .catch(function (err) { showToast('保存エラー: ' + err.message, 'error'); });
  }

  function closeForm() {
    document.getElementById('form-panel').style.display = 'none';
    clearForm();
  }

  function clearForm() {
    ['edit-id','f-name','f-price','f-unit','f-category','f-note'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
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
