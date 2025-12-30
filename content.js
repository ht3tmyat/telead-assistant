(function() {
  'use strict';

  const MAX_URLS = 100;
  const MAX_PAGES = 100;
  const MAX_RETRIES = 10;
  const ITEMS_PER_PAGE = 10;
  const TOAST_DURATION = 4000;
  const API_BASE = 'https://ads.telegram.org';

  const STATUS_MAP = {
    active: 'active', running: 'active', live: 'active',
    pending: 'in_review',
    paused: 'on_hold',
    declined: 'declined', rejected: 'declined',
    stopped: 'stopped', disabled: 'stopped'
  };

  let isInitializing = false;
  let lastUrl = location.href;
  let retryCount = 0;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  const extractAdId = () => {
    const match = location.pathname.match(/\/account\/ad\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const isStatsPage = () => location.pathname.includes('/stats');
  const isAccountPage = () => /^\/account\/?$/.test(location.pathname);
  const isAdFormPage = () => location.pathname.includes('/account/ad/new') || /\/account\/ad\/\d+$/.test(location.pathname);

  const formatNumber = (num) => (num ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatCurrency = (amt) => `${(amt ?? 0).toFixed(2)} TON`;
  const formatPercent = (val) => `${(val ?? 0).toFixed(2)}%`;

  const getPageData = (data, page, perPage) => data.slice((page - 1) * perPage, page * perPage);

  const showToast = (message, type = 'info') => {
    const existing = $('#tg-ads-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'tg-ads-toast';
    toast.className = `tg-ads-toast tg-ads-toast-${type}`;
    toast.innerHTML = `<span class="tg-ads-toast-message">${message}</span><button class="tg-ads-toast-close">×</button>`;

    toast.querySelector('.tg-ads-toast-close').addEventListener('click', () => {
      toast.classList.add('tg-ads-toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, { passive: true });

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('tg-ads-toast-show'));

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('tg-ads-toast-hide');
        setTimeout(() => toast.remove(), 300);
      }
    }, TOAST_DURATION);
  };

  const isInputEditable = (container) => {
    if (!container) return false;
    const wrapper = container.closest('.pr-form-control-wrap');
    return !wrapper?.classList.contains('has-locked');
  };

  const createMultiUrlModal = (type) => {
    const isBot = type === 'bot';
    const title = isBot ? 'Multi Bot Inserter' : 'Multi Channel Inserter';
    const placeholder = isBot ? 'https://t.me/bot1\n@bot2\nbot3' : 'https://t.me/channel1\n@channel2\nchannel3';

    const modal = document.createElement('div');
    modal.id = 'tg-ads-multi-url-modal';
    modal.className = 'tg-ads-modal-overlay';
    modal.dataset.type = type;
    modal.innerHTML = `
      <div class="tg-ads-modal">
        <div class="tg-ads-modal-header">
          <h3 class="tg-ads-modal-title">${title}</h3>
          <button class="tg-ads-close-btn" data-action="close" title="Close">×</button>
        </div>
        <div class="tg-ads-modal-body">
          <p class="tg-ads-modal-desc">Paste multiple ${isBot ? 'bot' : 'channel'} URLs or usernames (one per line):</p>
          <textarea id="tg-ads-url-textarea" class="tg-ads-textarea" rows="10" placeholder="${placeholder}"></textarea>
          <div class="tg-ads-input-info">
            <span id="tg-ads-line-count">0 / ${MAX_URLS} URLs</span>
            <span id="tg-ads-input-error" class="tg-ads-input-error"></span>
          </div>
        </div>
        <div class="tg-ads-modal-footer">
          <button class="tg-ads-btn tg-ads-btn-secondary" data-action="close">Cancel</button>
          <button class="tg-ads-btn tg-ads-btn-primary" data-action="submit">Insert All</button>
        </div>
      </div>
    `;

    const textarea = $('#tg-ads-url-textarea', modal);
    const lineCount = $('#tg-ads-line-count', modal);
    const inputError = $('#tg-ads-input-error', modal);
    const submitBtn = $('[data-action="submit"]', modal);

    const updateCount = () => {
      const urls = textarea.value.split('\n').filter(u => u.trim());
      const count = urls.length;
      lineCount.textContent = `${count} / ${MAX_URLS} URLs`;
      const isOver = count > MAX_URLS;
      lineCount.classList.toggle('tg-ads-count-error', isOver);
      inputError.textContent = isOver ? `Exceeds maximum limit of ${MAX_URLS} URLs` : '';
      submitBtn.disabled = isOver;
      submitBtn.classList.toggle('tg-ads-btn-disabled-submit', isOver);
    };

    textarea.addEventListener('input', updateCount, { passive: true });

    modal.addEventListener('click', (e) => {
      const action = e.target.dataset.action || (e.target === modal ? 'close' : null);
      if (action === 'close') modal.remove();
      if (action === 'submit') {
        const urls = textarea.value.split('\n').map(u => u.trim()).filter(Boolean);
        if (urls.length <= MAX_URLS && urls.length > 0) {
          insertUrlsToField(urls, modal.dataset.type);
        }
        modal.remove();
      }
    }, { passive: true });

    return modal;
  };

  const insertUrlsToField = (urls, type) => {
    const dataName = type === 'bot' ? 'bots' : 'channels';
    const placeholder = type === 'bot' ? 't.me bot URL' : 't.me channel URL';
    const container = $(`.select[data-name="${dataName}"]`);
    const input = container?.querySelector(`.input[data-placeholder="${placeholder}"]`);
    if (!input) return;

    urls.forEach(url => {
      input.textContent = url;
      input.dataset.value = url;
      input.classList.remove('empty');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    });
  };

  const createIdListModal = (type, ids) => {
    const isBot = type === 'bot';
    const modal = document.createElement('div');
    modal.id = 'tg-ads-id-list-modal';
    modal.className = 'tg-ads-modal-overlay';
    modal.innerHTML = `
      <div class="tg-ads-modal">
        <div class="tg-ads-modal-header">
          <h3 class="tg-ads-modal-title">${isBot ? 'Bot' : 'Channel'} ID List (${ids.length})</h3>
          <button class="tg-ads-close-btn" data-action="close" title="Close">×</button>
        </div>
        <div class="tg-ads-modal-body">
          <p class="tg-ads-modal-desc">Selected ${isBot ? 'bot' : 'channel'} IDs:</p>
          <textarea id="tg-ads-id-textarea" class="tg-ads-textarea" rows="10" readonly>${ids.join('\n')}</textarea>
        </div>
        <div class="tg-ads-modal-footer">
          <button class="tg-ads-btn tg-ads-btn-secondary" data-action="close">Close</button>
          <button class="tg-ads-btn tg-ads-btn-primary" data-action="copy">Copy All</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action || (e.target === modal ? 'close' : null);
      if (action === 'close') modal.remove();
      if (action === 'copy') {
        await navigator.clipboard.writeText(ids.join('\n'));
        e.target.textContent = 'Copied!';
        e.target.classList.add('tg-ads-btn-success');
        setTimeout(() => {
          e.target.textContent = 'Copy All';
          e.target.classList.remove('tg-ads-btn-success');
        }, 2000);
      }
    });

    return modal;
  };

  const getSelectedIds = (type) => {
    const dataName = type === 'bot' ? 'bots' : 'channels';
    const items = $$(`.select[data-name="${dataName}"] .selected-item[data-val]`);
    return Array.from(items).map(item => item.dataset.val).filter(Boolean);
  };

  const createMultiUrlButton = (type, formControl, selectContainer) => {
    const isBot = type === 'bot';
    const btnId = `tg-ads-multi-${type}-btn`;
    if ($(`#${btnId}`)) return;

    const canEdit = isInputEditable(selectContainer);
    const btnContainer = document.createElement('div');
    btnContainer.className = 'tg-ads-btn-container';
    btnContainer.innerHTML = `
      <div id="${btnId}" class="tg-ads-multi-url-btn${canEdit ? '' : ' tg-ads-btn-disabled'}">
        ${canEdit ? '' : '<svg class="tg-ads-lock-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>'}Multi ${isBot ? 'Bot' : 'Channel'} Inserter
      </div>
      <div id="tg-ads-view-${type}-ids-btn" class="tg-ads-multi-url-btn tg-ads-view-ids-btn">View ID List</div>
    `;

    btnContainer.addEventListener('click', (e) => {
      const target = e.target.closest('[id]');
      if (!target) return;

      if (target.id === btnId) {
        if (!canEdit) return showToast('This field is not editable', 'warning');
        $('#tg-ads-multi-url-modal')?.remove();
        const modal = createMultiUrlModal(type);
        document.body.appendChild(modal);
        setTimeout(() => $('#tg-ads-url-textarea', modal)?.focus(), 100);
      }

      if (target.id === `tg-ads-view-${type}-ids-btn`) {
        const ids = getSelectedIds(type);
        if (!ids.length) return showToast(`No ${isBot ? 'bots' : 'channels'} selected yet.`, 'warning');
        $('#tg-ads-id-list-modal')?.remove();
        document.body.appendChild(createIdListModal(type, ids));
      }
    }, { passive: true });

    formControl.parentNode.insertBefore(btnContainer, formControl.nextSibling);
  };

  const initMultiUrlInserter = () => {
    ['channels', 'bots'].forEach(name => {
      const select = $(`.select[data-name="${name}"]`);
      const form = select?.closest('.pr-form-control-wrap');
      if (form) createMultiUrlButton(name === 'bots' ? 'bot' : 'channel', form, select);
    });
  };

  const extractChartDataFromJS = (jsCode) => {
    const chartData = { views: [], clicks: [], actions: [], spent: [], dates: [] };

    try {
      const chartMatch = jsCode.match(/chart_count_stats_wrap[\s\S]*?"columns"\s*:\s*(\[\[.*?\]\])/s);
      if (chartMatch) {
        const columns = JSON.parse(chartMatch[1].replace(/,\s*([\]}])/g, '$1'));
        if (Array.isArray(columns)) {
          const series = {};
          let xData = null;

          for (const col of columns) {
            if (!Array.isArray(col) || col.length < 2) continue;
            if (col[0] === 'x') xData = col.slice(1);
            else series[col[0]] = col.slice(1);
          }

          if (xData) {
            for (let i = 0; i < xData.length; i++) {
              chartData.dates.push(new Date(xData[i]).toISOString().split('T')[0]);
              chartData.views.push(series.y0?.[i] || 0);
              chartData.clicks.push(series.y1?.[i] || 0);
              chartData.actions.push(series.y2?.[i] || 0);
            }
          }
        }
      }

      const budgetMatch = jsCode.match(/chart_budget_stats_wrap[\s\S]*?"columns"\s*:\s*(\[\[.*?\]\])/s);
      if (budgetMatch) {
        const columns = JSON.parse(budgetMatch[1].replace(/,\s*([\]}])/g, '$1'));
        if (Array.isArray(columns)) {
          let bxData = null, byData = null;
          for (const col of columns) {
            if (!Array.isArray(col) || col.length < 2) continue;
            if (col[0] === 'x') bxData = col.slice(1);
            else if (col[0].startsWith('y')) byData = col.slice(1);
          }

          if (bxData && byData) {
            const spendMap = {};
            for (let i = 0; i < bxData.length; i++) {
              spendMap[new Date(bxData[i]).toISOString().split('T')[0]] = (byData[i] || 0) / 1e6;
            }
            chartData.spent = chartData.dates.map(d => spendMap[d] || 0);
          }
        }
      }
    } catch {}

    return chartData;
  };

  const fetchAdStats = async (adId) => {
    const response = await fetch(`${API_BASE}/account/ad/${adId}/stats?period=day`, {
      credentials: 'include',
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest'
      }
    });

    if (!response.ok) throw new Error(`Failed to fetch stats: ${response.statusText}`);

    const json = await response.json();
    const chart = extractChartDataFromJS(json.j || '');
    const title = (json.t || '').replace(' – Telegram Ads', '') || `Ad ${adId}`;

    const dailyStats = chart.dates.map((date, i) => {
      const views = chart.views[i] || 0;
      const clicks = chart.clicks[i] || 0;
      const actions = chart.actions[i] || 0;
      const spent = chart.spent[i] || 0;
      return {
        date, views, clicks, actions, spent,
        cpa: actions > 0 ? spent / actions : 0,
        cpc: clicks > 0 ? spent / clicks : 0,
        ctr: views > 0 ? (clicks / views) * 100 : 0,
        cvr: clicks > 0 ? (actions / clicks) * 100 : 0,
        cpm: views > 0 ? (spent / views) * 1000 : 0
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return { ad_id: adId, title, daily_stats: dailyStats };
  };

  const getPageNumbers = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  };

  const createStatsWidget = (data) => {
    const { daily_stats } = data;
    const totalPages = Math.ceil(daily_stats.length / ITEMS_PER_PAGE);

    const totals = daily_stats.reduce((acc, d) => {
      acc.views += d.views || 0;
      acc.clicks += d.clicks || 0;
      acc.actions += d.actions || 0;
      acc.spent += d.spent || 0;
      return acc;
    }, { views: 0, clicks: 0, actions: 0, spent: 0 });

    const metrics = {
      cpa: totals.actions > 0 ? totals.spent / totals.actions : 0,
      cpc: totals.clicks > 0 ? totals.spent / totals.clicks : 0,
      ctr: totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0,
      cvr: totals.clicks > 0 ? (totals.actions / totals.clicks) * 100 : 0,
      cpm: totals.views > 0 ? (totals.spent / totals.views) * 1000 : 0
    };

    const widget = document.createElement('div');
    widget.id = 'tg-ads-stats-widget';
    widget.className = 'tg-ads-stats-widget';

    const renderRows = (page) => getPageData(daily_stats, page, ITEMS_PER_PAGE).map(d => `
      <tr>
        <td class="tg-ads-date-cell">${new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td>${formatNumber(d.views)}</td><td>${formatNumber(d.clicks)}</td><td>${formatNumber(d.actions)}</td>
        <td>${formatCurrency(d.spent)}</td><td>${formatCurrency(d.cpa)}</td><td>${formatCurrency(d.cpc)}</td>
        <td>${formatPercent(d.ctr)}</td><td>${formatPercent(d.cvr)}</td>
      </tr>
    `).join('');

    widget.innerHTML = `
      <div class="tg-ads-stats-header">
        <h3 class="tg-ads-stats-title">Daily Stats Overview</h3>
        <button class="tg-ads-close-btn" data-action="close" title="Close">×</button>
      </div>
      <div class="tg-ads-stats-content">
        <div class="tg-ads-stats-summary">
          <div class="tg-ads-stat-card"><div class="tg-ads-stat-label">Total Views</div><div class="tg-ads-stat-value">${formatNumber(totals.views)}</div></div>
          <div class="tg-ads-stat-card"><div class="tg-ads-stat-label">Total Clicks</div><div class="tg-ads-stat-value">${formatNumber(totals.clicks)}</div></div>
          <div class="tg-ads-stat-card"><div class="tg-ads-stat-label">Total Actions</div><div class="tg-ads-stat-value">${formatNumber(totals.actions)}</div></div>
          <div class="tg-ads-stat-card"><div class="tg-ads-stat-label">Total Spent</div><div class="tg-ads-stat-value">${formatCurrency(totals.spent)}</div></div>
        </div>
        <div class="tg-ads-stats-metrics">
          <div class="tg-ads-metric-item"><span class="tg-ads-metric-label">Avg CPA:</span><span class="tg-ads-metric-value">${formatCurrency(metrics.cpa)}</span></div>
          <div class="tg-ads-metric-item"><span class="tg-ads-metric-label">Avg CPC:</span><span class="tg-ads-metric-value">${formatCurrency(metrics.cpc)}</span></div>
          <div class="tg-ads-metric-item"><span class="tg-ads-metric-label">CTR:</span><span class="tg-ads-metric-value">${formatPercent(metrics.ctr)}</span></div>
          <div class="tg-ads-metric-item"><span class="tg-ads-metric-label">CVR:</span><span class="tg-ads-metric-value">${formatPercent(metrics.cvr)}</span></div>
          <div class="tg-ads-metric-item"><span class="tg-ads-metric-label">CPM:</span><span class="tg-ads-metric-value">${formatCurrency(metrics.cpm)}</span></div>
        </div>
        <div class="tg-ads-stats-table-container">
          <div class="tg-ads-table-header">
            <h4 class="tg-ads-table-title">Daily Breakdown (${daily_stats.length} days)</h4>
            <div class="tg-ads-pagination-info">Showing 1-${Math.min(ITEMS_PER_PAGE, daily_stats.length)} of ${daily_stats.length}</div>
          </div>
          <div class="tg-ads-table-wrapper">
            <table class="tg-ads-stats-table">
              <thead><tr><th>Date</th><th>Views</th><th>Clicks</th><th>Actions</th><th>Spent</th><th>CPA</th><th>CPC</th><th>CTR</th><th>CVR</th></tr></thead>
              <tbody>${renderRows(1)}</tbody>
            </table>
          </div>
          ${totalPages > 1 ? `
            <div class="tg-ads-pagination">
              <button class="tg-ads-page-btn" data-action="prev" disabled>← Previous</button>
              <div class="tg-ads-page-numbers">${getPageNumbers(1, totalPages).map(p => p === '...' ? '<span class="tg-ads-page-ellipsis">...</span>' : `<button class="tg-ads-page-number${p === 1 ? ' active' : ''}" data-page="${p}">${p}</button>`).join('')}</div>
              <button class="tg-ads-page-btn" data-action="next">Next →</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    let currentPage = 1;
    widget.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close') return widget.remove();

      const pageBtn = e.target.closest('[data-page]');
      const actionBtn = e.target.closest('[data-action]');

      if (pageBtn || actionBtn?.dataset.action === 'prev' || actionBtn?.dataset.action === 'next') {
        if (pageBtn) currentPage = parseInt(pageBtn.dataset.page);
        else if (actionBtn.dataset.action === 'prev' && currentPage > 1) currentPage--;
        else if (actionBtn.dataset.action === 'next' && currentPage < totalPages) currentPage++;

        $('tbody', widget).innerHTML = renderRows(currentPage);
        const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        $('.tg-ads-pagination-info', widget).textContent = `Showing ${start}-${Math.min(start + ITEMS_PER_PAGE - 1, daily_stats.length)} of ${daily_stats.length}`;
        $('[data-action="prev"]', widget).disabled = currentPage === 1;
        $('[data-action="next"]', widget).disabled = currentPage === totalPages;

        const nums = $('.tg-ads-page-numbers', widget);
        if (nums) {
          nums.innerHTML = getPageNumbers(currentPage, totalPages).map(p => p === '...' ? '<span class="tg-ads-page-ellipsis">...</span>' : `<button class="tg-ads-page-number${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`).join('');
        }
      }
    }, { passive: true });

    return widget;
  };

  const extractHashFromPage = () => {
    if (window.ajHash) return window.ajHash;
    for (const script of $$('script[src*="hash="]')) {
      const m = script.src.match(/hash=([a-f0-9]{16,})/i);
      if (m) return m[1];
    }
    for (const script of $$('script:not([src])')) {
      const m = script.textContent.match(/hash=([a-f0-9]{16,})/i);
      if (m) return m[1];
    }
    const pm = document.documentElement.outerHTML.match(/"apiUrl"\s*:\s*"[^"]*hash=([^"&]*)"/);
    return pm?.[1] || 'be173eed7f56db15b9';
  };

  const fetchAllAds = async () => {
    let ownerId = document.cookie.split(';').reduce((a, c) => { const [k, v] = c.trim().split('='); a[k] = v; return a; }, {}).stel_adowner;

    if (!ownerId) {
      const html = document.documentElement.outerHTML;
      for (const p of [/"ownerId":\s*"([^"]+)"/, /stel_adowner["\s:=]+([a-zA-Z0-9_-]+)/]) {
        const m = html.match(p);
        if (m) { ownerId = m[1]; break; }
      }
    }

    ownerId = ownerId || window.ajOwnerId;
    if (!ownerId) throw new Error('No owner_id found. Please log in and refresh.');

    const apiUrl = `${API_BASE}/api?hash=${extractHashFromPage()}`;
    const allAds = [], seenIds = new Set();
    let offsetId = '', hasMore = true, page = 1;

    while (hasMore && page <= MAX_PAGES) {
      const body = new URLSearchParams({ owner_id: ownerId, method: 'getAdsList' });
      if (offsetId) body.append('offset_id', offsetId);

      const res = await fetch(apiUrl, {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
        body
      });

      if (!res.ok) throw new Error(`Failed to fetch ads: ${res.status}`);
      const result = await res.json();
      if (result.ok === false || result.error) throw new Error(result.error || 'API error');

      const ads = result.items || result.ads || result.data?.items || result.data?.ads || (Array.isArray(result) ? result : []);
      let newCount = 0;

      for (const ad of ads) {
        const id = ad.ad_id || ad.id;
        if (id && !seenIds.has(id)) { seenIds.add(id); allAds.push(ad); newCount++; }
      }

      const next = result.next_offset_id || result.offset_id || result.next_offset || '';
      if (next && next !== offsetId && newCount > 0) { offsetId = next; page++; }
      else hasMore = false;
    }

    return allAds;
  };

  const calculateDashboardMetrics = (ads) => {
    const statusCounts = { total: ads.length, active: 0, in_review: 0, on_hold: 0, declined: 0, stopped: 0 };
    const summary = { total_spent: 0, total_views: 0, total_clicks: 0, total_actions: 0 };

    for (const ad of ads) {
      const rawStatus = (ad.status_text || ad.status || ad.state_text || ad.state || '').toLowerCase();
      const mapped = STATUS_MAP[rawStatus] || (rawStatus.includes('review') ? 'in_review' : rawStatus.includes('hold') ? 'on_hold' : null);
      if (mapped && statusCounts[mapped] !== undefined) statusCounts[mapped]++;

      summary.total_spent += ad.spent ?? ad.budget_spent ?? 0;
      summary.total_views += ad.views ?? ad.impressions ?? 0;
      summary.total_clicks += ad.clicks ?? 0;
      summary.total_actions += ad.actions ?? ad.conversions ?? ad.joins ?? 0;
    }

    return { statusCounts, summary: Object.values(summary).some(v => v > 0) ? summary : null };
  };

  const createShimmer = (size = '') => `<span class="tg-ads-shimmer${size ? ` tg-ads-shimmer-${size}` : ''}"></span>`;

  const createDashboardWidget = (data, isLoading = false) => {
    const { statusCounts, summary } = data;
    const shimmer = createShimmer('large'), shimmerSm = createShimmer('small');

    const widget = document.createElement('div');
    widget.id = 'tg-ads-dashboard-widget';
    widget.className = 'tg-ads-dashboard-widget';
    widget.innerHTML = `
      <div class="tg-ads-dashboard-header">
        <div><h3 class="tg-ads-dashboard-title">Dashboard Overview</h3><p class="tg-ads-dashboard-subtitle">All data processed locally in your browser</p></div>
        <button class="tg-ads-close-btn" data-action="close" title="Close">×</button>
      </div>
      <div class="tg-ads-dashboard-content">
        <div class="tg-ads-dashboard-metrics">
          ${['Total Spent', 'Total Views', 'Total Clicks', 'Total Actions'].map((label, i) => `
            <div class="tg-ads-metric-card">
              <div class="tg-ads-metric-card-header"><span class="tg-ads-metric-label">${label}</span></div>
              <div class="tg-ads-metric-value">${isLoading ? shimmer : (i === 0 ? formatCurrency(summary?.total_spent || 0) : formatNumber(summary?.[['total_spent', 'total_views', 'total_clicks', 'total_actions'][i]] || 0))}</div>
            </div>
          `).join('')}
        </div>
        <div class="tg-ads-status-cards">
          ${[['total', 'TOTAL ADS'], ['active', 'ACTIVE'], ['in_review', 'IN REVIEW'], ['on_hold', 'ON HOLD'], ['declined', 'DECLINED'], ['stopped', 'STOPPED']].map(([k, l]) => `
            <div class="tg-ads-status-card">
              <div class="tg-ads-status-value tg-ads-status-${k}">${isLoading ? shimmerSm : statusCounts[k]}</div>
              <div class="tg-ads-status-label">${l}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    widget.addEventListener('click', (e) => { if (e.target.dataset.action === 'close') widget.remove(); }, { passive: true });
    return widget;
  };

  const updateDashboardWidget = (widget, { statusCounts, summary }) => {
    const values = [formatCurrency(summary?.total_spent || 0), formatNumber(summary?.total_views || 0), formatNumber(summary?.total_clicks || 0), formatNumber(summary?.total_actions || 0)];
    $$('.tg-ads-metric-card .tg-ads-metric-value', widget).forEach((el, i) => el.textContent = values[i]);

    const counts = [statusCounts.total, statusCounts.active, statusCounts.in_review, statusCounts.on_hold, statusCounts.declined, statusCounts.stopped];
    $$('.tg-ads-status-card .tg-ads-status-value', widget).forEach((el, i) => el.textContent = counts[i]);
  };

  const showLoading = () => {
    const el = document.createElement('div');
    el.id = 'tg-ads-loading';
    el.className = 'tg-ads-loading';
    el.innerHTML = '<div class="tg-ads-loading-spinner"></div><p>Loading daily stats...</p>';
    return el;
  };

  const showError = (msg) => {
    const el = document.createElement('div');
    el.id = 'tg-ads-error';
    el.className = 'tg-ads-error';
    el.innerHTML = `<div class="tg-ads-error-content"><strong>Error Loading Stats</strong><p>${msg}</p><button class="tg-ads-retry-btn" data-action="retry">Retry</button><button class="tg-ads-close-btn" data-action="close">×</button></div>`;
    el.addEventListener('click', (e) => { if (e.target.dataset.action === 'close') el.remove(); if (e.target.dataset.action === 'retry') { el.remove(); init(); } }, { passive: true });
    return el;
  };

  const findInsertionPoint = () => {
    for (const h2 of $$('h2')) {
      if (/statistics|статистика/i.test(h2.textContent)) {
        let el = h2.nextElementSibling;
        while (el && !['DIV', 'SECTION'].includes(el.tagName)) el = el.nextElementSibling;
        return el || h2.parentElement;
      }
    }
    const charts = $$('[id*="chart"], [class*="chart"]');
    return charts.length ? charts[charts.length - 1].parentElement : $('.pr-content') || $('main') || document.body;
  };

  const initDashboard = async () => {
    if (!isAccountPage()) return;
    $('#tg-ads-dashboard-widget')?.remove();
    const container = $('.table-responsive.table-wide-container') || $('.table-responsive') || $('main') || $('.pr-content') || document.body;
    const widget = createDashboardWidget({ statusCounts: { total: 0, active: 0, in_review: 0, on_hold: 0, declined: 0, stopped: 0 }, summary: null }, true);

    if (!isAccountPage()) return;
    if (container.firstChild) container.insertBefore(widget, container.firstChild);
    else container.appendChild(widget);

    Object.assign(widget.style, { marginTop: '0', marginBottom: '24px', marginLeft: 'auto', marginRight: 'auto', padding: '0', boxSizing: 'border-box' });

    requestAnimationFrame(() => {
      const table = $('table', container);
      if (table) {
        const w = table.getBoundingClientRect().width;
        if (w > 0) Object.assign(widget.style, { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` });
      }
    });

    try {
      const ads = await fetchAllAds();
      if (!isAccountPage()) { widget.remove(); return; }
      updateDashboardWidget(widget, calculateDashboardMetrics(ads));
    } catch {}
  };

  const init = async () => {
    if (!location.hostname.includes('ads.telegram.org')) return;
    if (isAccountPage()) return initDashboard();
    if (isAdFormPage()) return initMultiUrlInserter();

    const adId = extractAdId();
    if (!adId || !isStatsPage()) return;

    $('#tg-ads-stats-widget')?.remove();
    $('#tg-ads-error')?.remove();

    const insertPt = findInsertionPoint();
    const loading = showLoading();
    insertPt.insertBefore(loading, insertPt.firstChild);

    try {
      const stats = await fetchAdStats(adId);
      loading.remove();
      if (!isStatsPage() || extractAdId() !== adId) return;
      insertPt.insertBefore(createStatsWidget(stats), insertPt.firstChild);
    } catch (e) {
      loading.remove();
      if (!isStatsPage()) return;
      insertPt.insertBefore(showError(e.message || 'Failed to load stats'), insertPt.firstChild);
    }
  };

  const safeInit = async () => {
    if (isInitializing) return;
    isInitializing = true;
    try { await init(); retryCount = 0; } finally { isInitializing = false; }
  };

  const cleanupAllWidgets = () => {
    $('#tg-ads-stats-widget')?.remove();
    $('#tg-ads-dashboard-widget')?.remove();
    $('#tg-ads-error')?.remove();
    $('#tg-ads-loading')?.remove();
  };

  const tryInit = () => {
    if (isAccountPage()) {
      if ($('#tg-ads-dashboard-widget')) { retryCount = 0; return; }
      if ($('.table-responsive')) safeInit();
      else if (retryCount++ < MAX_RETRIES) setTimeout(tryInit, 150);
    } else if (extractAdId() && isStatsPage()) {
      if ($('#tg-ads-stats-widget')) { retryCount = 0; return; }
      if ($('h2') || $('.pr-content')) safeInit();
      else if (retryCount++ < MAX_RETRIES) setTimeout(tryInit, 150);
    } else if (isAdFormPage()) {
      if ($('#tg-ads-multi-channel-btn')) { retryCount = 0; return; }
      if ($('.select[data-name="channels"]') || $('.select[data-name="bots"]')) initMultiUrlInserter();
      else if (retryCount++ < MAX_RETRIES) setTimeout(tryInit, 100);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit);
  else tryInit();

  const onUrlChange = () => {
    cleanupAllWidgets();
    retryCount = 0;
    setTimeout(tryInit, 200);
  };

  new MutationObserver(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; onUrlChange(); }
    if (isAdFormPage()) initMultiUrlInserter();
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => { lastUrl = location.href; onUrlChange(); }, { passive: true });

  const wrapHistory = (method) => {
    const orig = history[method];
    history[method] = function() { orig.apply(this, arguments); lastUrl = location.href; onUrlChange(); };
  };
  wrapHistory('pushState');
  wrapHistory('replaceState');

})();
