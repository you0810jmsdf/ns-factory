// ============================================================
// customers.js — customers.html 用（顧客マスタ閲覧・検索）
// 新規登録・編集・削除は customer_manager.html（ローカル）で行う運用に統一。
// 保存時に customer_manager.html から自動でGAS同期される。
// 例外（2026-09-03）: 会社情報（customerType / honorific / contactPerson / billingZip / billingAddress）
//   はシート側に概念が無いため、このページの「会社情報」モーダルから GAS へ部分更新する。
//   GAS updateCustomer は送られなかった項目を既存値で保持するので、上記5項目＋id だけ送る。
// ============================================================

(function () {
  'use strict';

  let allCustomers = [];
  let targetCustomerId = ''; // URLパラメータ ?id= で特定顧客にフォーカス
  let currentSort = localStorage.getItem('cust_sort') || 'newest';

  document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(location.search);
    targetCustomerId = (params.get('id') || '').trim();
    if (targetCustomerId) renderCustomerFocusBanner();

    const sortSel = document.getElementById('sort-select');
    if (sortSel) {
      sortSel.value = currentSort;
      sortSel.addEventListener('change', function () {
        currentSort = this.value;
        localStorage.setItem('cust_sort', currentSort);
        renderTable();
      });
    }

    loadCustomers();

    document.getElementById('btn-refresh').addEventListener('click', loadCustomers);
    document.getElementById('search-input').addEventListener('input', renderTable);

    // 会社情報モーダル
    document.getElementById('cust-tbody').addEventListener('click', function (ev) {
      const btn = ev.target.closest('[data-edit-company]');
      if (btn) openCompanyModal(btn.getAttribute('data-edit-company'));
    });
    document.getElementById('cm-cancel').addEventListener('click', closeCompanyModal);
    document.getElementById('company-modal').addEventListener('click', function (ev) {
      if (ev.target === this) closeCompanyModal();
    });
    document.getElementById('cm-save').addEventListener('click', saveCompanyModal);
    document.getElementById('cm-type').addEventListener('change', function () {
      // 区分を法人にしたら敬称の既定を御中に、個人なら様に（手で変えた後は触らない）
      const h = document.getElementById('cm-honorific');
      if (this.value === '法人' && h.value === '様') h.value = '御中';
      if (this.value === '個人' && h.value === '御中') h.value = '様';
    });
  });

  function applySortToRows(rows) {
    const sorted = rows.slice();
    if (currentSort === 'newest') {
      sorted.reverse();
    } else if (currentSort === 'oldest') {
      // そのまま（GASから返る順=登録順）
    } else if (currentSort === 'name_asc') {
      sorted.sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'ja'); });
    } else if (currentSort === 'name_desc') {
      sorted.sort(function (a, b) { return (b.name || '').localeCompare(a.name || '', 'ja'); });
    }
    return sorted;
  }

  function renderCustomerFocusBanner() {
    let banner = document.getElementById('customer-focus-banner');
    if (!targetCustomerId) {
      if (banner) banner.remove();
      return;
    }
    if (!banner) {
      const titleEl = document.querySelector('.page-title');
      if (!titleEl) return;
      banner = document.createElement('div');
      banner.id = 'customer-focus-banner';
      banner.style.cssText = 'background:#fbf3e6;border:1px solid var(--color-accent,#a07d3e);border-radius:8px;padding:10px 14px;margin:12px 0;display:flex;align-items:center;gap:12px;font-size:13px;';
      titleEl.insertAdjacentElement('afterend', banner);
    }
    banner.innerHTML = '🔗 顧客 <b>' + escHtml(targetCustomerId) + '</b> を表示中　<a href="customers.html" style="color:var(--color-accent-dark,#7a5d2a);text-decoration:underline;">すべて表示</a>';
  }

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
    if (targetCustomerId) {
      rows = rows.filter(c => c.id === targetCustomerId);
    }
    if (keyword) {
      rows = rows.filter(c =>
        (c.name || '').toLowerCase().includes(keyword) ||
        (c.id || '').toLowerCase().includes(keyword) ||
        (c.email || '').toLowerCase().includes(keyword) ||
        (c.contactPerson || '').toLowerCase().includes(keyword) ||
        (c.billingAddress || '').toLowerCase().includes(keyword) ||
        (c.platforms_json || '').toLowerCase().includes(keyword)
      );
    }

    rows = applySortToRows(rows);

    const tbody = document.getElementById('cust-tbody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><span class="icon">&#x1F465;</span>顧客が登録されていません</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (c) {
      const zip = (c.zip || '').trim();
      const addr = (c.address || '').trim();
      const addrFull = zip && addr ? '〒' + zip + ' ' + addr : (addr || zip);
      const bzip = (c.billingZip || '').trim();
      const baddr = (c.billingAddress || '').trim();
      const billingFull = bzip && baddr ? '〒' + bzip + ' ' + baddr : (baddr || bzip);
      const isCorp = (c.customerType || '') === '法人';
      const typeBadge = isCorp
        ? '<span class="badge-type corp">法人</span>'
        : (c.customerType ? '<span class="badge-type">' + escHtml(c.customerType) + '</span>' : '<span class="badge-type" style="opacity:.5;">個人</span>');
      const snsCell = formatPlatformsSummary(c.platforms_json, c.contact);
      return `<tr>
        <td style="color:var(--color-text-mute);font-size:12px;">${escHtml(c.id)}</td>
        <td>${typeBadge}</td>
        <td style="font-weight:600;">${escHtml(c.name)}</td>
        <td>${escHtml(c.honorific)}</td>
        <td>${escHtml(c.contactPerson)}</td>
        <td>${escHtml(c.phone)}</td>
        <td>${escHtml(c.email)}</td>
        <td class="col-address" title="${escHtml(addrFull)}">${escHtml(addrFull)}</td>
        <td class="col-address" title="${escHtml(billingFull)}">${escHtml(billingFull)}</td>
        <td class="col-sns" title="${escHtml(snsCell.title)}">${snsCell.html}</td>
        <td><button class="btn btn-secondary btn-sm" data-edit-company="${escHtml(c.id)}" style="white-space:nowrap;">会社情報</button></td>
      </tr>`;
    }).join('');
  }

  // platforms_json の先頭 1〜2 件を「Site: id」形式で簡易表示。空なら旧 contact をフォールバック。
  function formatPlatformsSummary(platformsJson, contactFallback) {
    const rows = parsePlatforms(platformsJson);
    if (rows.length === 0) {
      const c = (contactFallback || '').trim();
      return { html: escHtml(c), title: c };
    }
    const top = rows.slice(0, 2).map(r => (r.site || '?') + ': ' + (r.account || ''));
    const rest = rows.length > 2 ? ' …+' + (rows.length - 2) : '';
    const summary = top.join(' / ') + rest;
    const titleFull = rows.map(r => (r.site || '?') + ': ' + (r.account || '') + (r.url ? ' (' + r.url + ')' : '') + (r.note ? ' / ' + r.note : '')).join('\n');
    return { html: escHtml(summary), title: titleFull };
  }

  function parsePlatforms(jsonStr) {
    if (!jsonStr) return [];
    try {
      const v = JSON.parse(jsonStr);
      if (!Array.isArray(v)) return [];
      return v.filter(r => r && typeof r === 'object').map(r => ({
        site:    String(r.site || ''),
        account: String(r.account || ''),
        url:     String(r.url || ''),
        note:    String(r.note || '')
      }));
    } catch (e) {
      return [];
    }
  }

  // ---- 会社情報モーダル ----
  let modalTargetId = '';

  function openCompanyModal(id) {
    const c = allCustomers.find(x => x.id === id);
    if (!c) return;
    modalTargetId = id;
    document.getElementById('cm-target').textContent = c.id + '　' + (c.name || '');
    document.getElementById('cm-type').value            = (c.customerType === '法人') ? '法人' : '個人';
    document.getElementById('cm-honorific').value       = (c.honorific === '御中' || c.honorific === '') ? c.honorific : '様';
    document.getElementById('cm-contact-person').value  = c.contactPerson || '';
    document.getElementById('cm-billing-zip').value     = c.billingZip || '';
    document.getElementById('cm-billing-address').value = c.billingAddress || '';
    document.getElementById('company-modal').classList.add('open');
  }

  function closeCompanyModal() {
    document.getElementById('company-modal').classList.remove('open');
    modalTargetId = '';
  }

  function saveCompanyModal() {
    const id = modalTargetId;
    const c = allCustomers.find(x => x.id === id);
    if (!c) return;
    // 部分更新：ここに無い項目（name/zip/address 等）は GAS 側が既存値を保持する
    const patch = {
      id: id,
      customerType:   document.getElementById('cm-type').value,
      honorific:      document.getElementById('cm-honorific').value,
      contactPerson:  document.getElementById('cm-contact-person').value.trim(),
      billingZip:     document.getElementById('cm-billing-zip').value.trim(),
      billingAddress: document.getElementById('cm-billing-address').value.trim()
    };
    const btn = document.getElementById('cm-save');
    btn.disabled = true;
    API.updateCustomer(patch)
      .then(function () {
        Object.assign(c, patch);
        closeCompanyModal();
        renderTable();
        showToast('会社情報を保存しました: ' + id, 'success');
      })
      .catch(function (err) {
        showToast('保存エラー: ' + err.message, 'error');
      })
      .finally(function () { btn.disabled = false; });
  }

  // ---- ユーティリティ ----

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
