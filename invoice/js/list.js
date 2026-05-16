// ============================================================
// list.js — index.html 用（書類台帳一覧）
// ============================================================

(function () {
  'use strict';

  let allDocs = [];
  let currentType = 'all';

  // ---- 初期化 ----
  document.addEventListener('DOMContentLoaded', function () {
    loadDocs();

    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        renderTable();
      });
    });

    // 新規作成ボタン
    document.getElementById('btn-new-quote').addEventListener('click', function () {
      location.href = 'editor.html?type=quote';
    });
    document.getElementById('btn-new-invoice').addEventListener('click', function () {
      location.href = 'editor.html?type=invoice';
    });
    document.getElementById('btn-new-receipt').addEventListener('click', function () {
      location.href = 'editor.html?type=receipt';
    });

    // 更新
    document.getElementById('btn-refresh').addEventListener('click', loadDocs);

    // 検索
    document.getElementById('search-input').addEventListener('input', renderTable);
  });

  // ---- データ読み込み ----
  function loadDocs() {
    setLoading(true);
    API.listDocuments()
      .then(function (res) {
        allDocs = res.data || [];
        renderTable();
      })
      .catch(function (err) {
        showToast('読み込みエラー: ' + err.message, 'error');
        renderEmpty('読み込みに失敗しました。GAS WebApp URLを確認してください。');
      })
      .finally(function () { setLoading(false); });
  }

  // ---- テーブル描画 ----
  function renderTable() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    let rows = allDocs;

    if (currentType !== 'all') {
      rows = rows.filter(r => r.type === currentType);
    }
    if (keyword) {
      rows = rows.filter(r =>
        r.number.toLowerCase().includes(keyword) ||
        r.customerName.toLowerCase().includes(keyword) ||
        r.subject.toLowerCase().includes(keyword)
      );
    }

    // 新しい順
    rows = rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    document.getElementById('doc-count-badge').textContent = rows.length + ' 件';
    const tbody = document.getElementById('doc-tbody');

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><span class="icon">&#x1F4C4;</span>書類がありません</div></td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (doc) {
      const typeLabel = CONFIG.TYPE_LABEL[doc.type] || doc.type;
      const statusClass = { '下書き': 'status-draft', '発行済': 'status-issued', '入金済': 'status-paid' }[doc.status] || 'status-draft';
      const driveBtn = doc.driveUrl
        ? `<a href="${escHtml(doc.driveUrl)}" target="_blank" class="btn btn-ghost btn-sm">Drive</a>`
        : '<span style="color:var(--color-text-mute);font-size:11px;">未保存</span>';

      // 昇格ボタン
      let promoteBtn = '';
      if (doc.type === 'quote') {
        promoteBtn = `<button class="btn btn-ghost btn-sm" onclick="promoteDoc('${escHtml(doc.number)}','invoice')">→請求書</button>`;
      } else if (doc.type === 'invoice') {
        promoteBtn = `<button class="btn btn-ghost btn-sm" onclick="promoteDoc('${escHtml(doc.number)}','receipt')">→領収書</button>`;
      }

      return `<tr>
        <td><a href="editor.html?id=${encodeURIComponent(doc.number)}&type=${doc.type}" style="color:var(--color-accent-dark);font-weight:600;">${escHtml(doc.number)}</a></td>
        <td>${escHtml(typeLabel)}</td>
        <td>${escHtml(doc.issueDate)}</td>
        <td>${escHtml(doc.customerName)}</td>
        <td>${escHtml(doc.subject)}</td>
        <td style="text-align:right;font-weight:600;">¥${Number(doc.total || 0).toLocaleString()}</td>
        <td><span class="status-badge ${statusClass}">${escHtml(doc.status)}</span></td>
        <td>${driveBtn}</td>
        <td style="white-space:nowrap;">
          <a href="editor.html?id=${encodeURIComponent(doc.number)}&type=${doc.type}" class="btn btn-ghost btn-sm">編集</a>
          ${promoteBtn}
          <button class="btn btn-danger btn-sm" onclick="deleteDoc('${escHtml(doc.number)}')">削除</button>
        </td>
      </tr>`;
    }).join('');
  }

  function renderEmpty(msg) {
    document.getElementById('doc-tbody').innerHTML =
      `<tr><td colspan="9"><div class="empty-state"><span class="icon">&#x26A0;</span>${msg}</div></td></tr>`;
  }

  // ---- 削除 ----
  window.deleteDoc = function (number) {
    if (!confirm('書類「' + number + '」を削除しますか？\n（明細も同時に削除されます）')) return;
    API.deleteDocument(number)
      .then(function () {
        showToast(number + ' を削除しました', 'success');
        loadDocs();
      })
      .catch(function (err) { showToast('削除エラー: ' + err.message, 'error'); });
  };

  // ---- 昇格 ----
  window.promoteDoc = function (sourceNumber, newType) {
    const label = CONFIG.TYPE_LABEL[newType];
    if (!confirm('「' + sourceNumber + '」から ' + label + ' を作成しますか？')) return;
    API.promoteDocument(sourceNumber, newType)
      .then(function (res) {
        showToast(label + '「' + res.number + '」を作成しました', 'success');
        loadDocs();
      })
      .catch(function (err) { showToast('昇格エラー: ' + err.message, 'error'); });
  };

  // ---- UI ヘルパー ----
  function setLoading(flag) {
    document.getElementById('refresh-spinner').style.display = flag ? 'inline-block' : 'none';
  }

  function showToast(msg, type) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
