(function() {
  'use strict';

  function extractAdId() {
    const match = window.location.pathname.match(/\/account\/ad\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  function isStatsPage() {
    return window.location.pathname.includes('/stats') ||
           window.location.href.includes('/stats');
  }

  function isAdFormPage() {
    return window.location.pathname.includes('/account/ad/new') ||
           window.location.pathname.match(/\/account\/ad\/\d+$/);
  }

  function isInputEditable(selectContainer) {
    if (!selectContainer) return false;
    const wrapper = selectContainer.closest('.pr-form-control-wrap');
    if (wrapper && wrapper.classList.contains('has-locked')) return false;
    return true;
  }

  function showToast(message, type = 'info') {
    const existingToast = document.getElementById('tg-ads-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'tg-ads-toast';
    toast.className = `tg-ads-toast tg-ads-toast-${type}`;

    toast.innerHTML = `
      <span class="tg-ads-toast-message">${message}</span>
      <button class="tg-ads-toast-close">×</button>
    `;

    toast.querySelector('.tg-ads-toast-close').addEventListener('click', () => {
      toast.classList.add('tg-ads-toast-hide');
      setTimeout(() => toast.remove(), 300);
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('tg-ads-toast-show');
    }, 10);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('tg-ads-toast-hide');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  function createMultiUrlModal(type) {
    const isBot = type === 'bot';
    const title = isBot ? 'Multi Bot Inserter' : 'Multi Channel Inserter';
    const desc = isBot
      ? 'Paste multiple bot URLs or usernames below (one per line):'
      : 'Paste multiple channel URLs or usernames below (one per line):';
    const placeholder = isBot
      ? 'https://t.me/bot1\n@bot2\nbot3'
      : 'https://t.me/channel1\n@channel2\nchannel3';

    const modal = document.createElement('div');
    modal.id = 'tg-ads-multi-url-modal';
    modal.className = 'tg-ads-modal-overlay';
    modal.setAttribute('data-type', type);
    modal.innerHTML = `
      <div class="tg-ads-modal">
        <div class="tg-ads-modal-header">
          <h3 class="tg-ads-modal-title">${title}</h3>
          <button class="tg-ads-close-btn" id="tg-ads-modal-close" title="Close">×</button>
        </div>
        <div class="tg-ads-modal-body">
          <p class="tg-ads-modal-desc">${desc}</p>
          <textarea id="tg-ads-url-textarea" class="tg-ads-textarea" rows="10" placeholder="${placeholder}"></textarea>
          <div class="tg-ads-input-info">
            <span id="tg-ads-line-count">0 / 100 URLs</span>
            <span id="tg-ads-input-error" class="tg-ads-input-error"></span>
          </div>
        </div>
        <div class="tg-ads-modal-footer">
          <button class="tg-ads-btn tg-ads-btn-secondary" id="tg-ads-modal-cancel">Cancel</button>
          <button class="tg-ads-btn tg-ads-btn-primary" id="tg-ads-modal-submit">Insert All</button>
        </div>
      </div>
    `;

    modal.querySelector('#tg-ads-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#tg-ads-modal-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    const textarea = modal.querySelector('#tg-ads-url-textarea');
    const lineCount = modal.querySelector('#tg-ads-line-count');
    const inputError = modal.querySelector('#tg-ads-input-error');
    const submitBtn = modal.querySelector('#tg-ads-modal-submit');

    function updateLineCount() {
      const urls = textarea.value.split('\n').map(url => url.trim()).filter(url => url.length > 0);
      const count = urls.length;
      lineCount.textContent = `${count} / 100 URLs`;

      if (count > 100) {
        lineCount.classList.add('tg-ads-count-error');
        inputError.textContent = 'Exceeds maximum limit of 100 URLs';
        submitBtn.disabled = true;
        submitBtn.classList.add('tg-ads-btn-disabled-submit');
      } else {
        lineCount.classList.remove('tg-ads-count-error');
        inputError.textContent = '';
        submitBtn.disabled = false;
        submitBtn.classList.remove('tg-ads-btn-disabled-submit');
      }
    }

    textarea.addEventListener('input', updateLineCount);

    modal.querySelector('#tg-ads-modal-submit').addEventListener('click', () => {
      const urls = textarea.value.split('\n').map(url => url.trim()).filter(url => url.length > 0);
      const modalType = modal.getAttribute('data-type');

      if (urls.length > 100) {
        return;
      }

      if (urls.length > 0) {
        insertUrlsToField(urls, modalType);
      }

      modal.remove();
    });

    return modal;
  }

  function insertUrlsToField(urls, type) {
    const isBot = type === 'bot';
    const dataName = isBot ? 'bots' : 'channels';
    const placeholder = isBot ? 't.me bot URL' : 't.me channel URL';

    const selectContainer = document.querySelector(`.select[data-name="${dataName}"]`);
    if (!selectContainer) return;

    const inputField = selectContainer.querySelector(`.input[data-placeholder="${placeholder}"]`);
    if (!inputField) return;

    urls.forEach(url => {
      inputField.textContent = url;
      inputField.setAttribute('data-value', url);
      inputField.classList.remove('empty');

      const inputEvent = new Event('input', { bubbles: true });
      inputField.dispatchEvent(inputEvent);

      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      inputField.dispatchEvent(keydownEvent);
    });
  }

  function createIdListModal(type, ids) {
    const isBot = type === 'bot';
    const title = isBot ? 'Bot ID List' : 'Channel ID List';
    const count = ids.length;

    const modal = document.createElement('div');
    modal.id = 'tg-ads-id-list-modal';
    modal.className = 'tg-ads-modal-overlay';
    modal.innerHTML = `
      <div class="tg-ads-modal">
        <div class="tg-ads-modal-header">
          <h3 class="tg-ads-modal-title">${title} (${count})</h3>
          <button class="tg-ads-close-btn" id="tg-ads-id-modal-close" title="Close">×</button>
        </div>
        <div class="tg-ads-modal-body">
          <p class="tg-ads-modal-desc">Selected ${isBot ? 'bot' : 'channel'} IDs:</p>
          <textarea id="tg-ads-id-textarea" class="tg-ads-textarea" rows="10" readonly>${ids.join('\n')}</textarea>
        </div>
        <div class="tg-ads-modal-footer">
          <button class="tg-ads-btn tg-ads-btn-secondary" id="tg-ads-id-modal-close-btn">Close</button>
          <button class="tg-ads-btn tg-ads-btn-primary" id="tg-ads-id-modal-copy">Copy All</button>
        </div>
      </div>
    `;

    modal.querySelector('#tg-ads-id-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#tg-ads-id-modal-close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#tg-ads-id-modal-copy').addEventListener('click', () => {
      const textarea = modal.querySelector('#tg-ads-id-textarea');
      textarea.select();
      navigator.clipboard.writeText(textarea.value).then(() => {
        const copyBtn = modal.querySelector('#tg-ads-id-modal-copy');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = 'Copied!';
        copyBtn.classList.add('tg-ads-btn-success');
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('tg-ads-btn-success');
        }, 2000);
      });
    });

    return modal;
  }

  function getSelectedIds(type) {
    const isBot = type === 'bot';
    const dataName = isBot ? 'bots' : 'channels';
    const selectContainer = document.querySelector(`.select[data-name="${dataName}"]`);
    if (!selectContainer) return [];

    const selectedItems = selectContainer.querySelectorAll('.selected-item[data-val]');
    const ids = [];
    selectedItems.forEach(item => {
      const id = item.getAttribute('data-val');
      if (id) ids.push(id);
    });
    return ids;
  }

  function createMultiUrlButton(type, formControl, selectContainer) {
    const isBot = type === 'bot';
    const btnId = isBot ? 'tg-ads-multi-bot-btn' : 'tg-ads-multi-channel-btn';
    const idBtnId = isBot ? 'tg-ads-view-bot-ids-btn' : 'tg-ads-view-channel-ids-btn';
    const label = isBot ? 'Multi Bot Inserter' : 'Multi Channel Inserter';

    if (document.getElementById(btnId)) return;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'tg-ads-btn-container';

    const btn = document.createElement('div');
    btn.id = btnId;
    const canEdit = isInputEditable(selectContainer);
    btn.className = canEdit ? 'tg-ads-multi-url-btn' : 'tg-ads-multi-url-btn tg-ads-btn-disabled';
    btn.innerHTML = canEdit ? label : `<svg class="tg-ads-lock-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>${label}`;
    if (!canEdit) {
      btn.setAttribute('data-tooltip', `This field is not editable`);
    }

    btn.addEventListener('click', () => {
      if (btn.classList.contains('tg-ads-btn-disabled')) {
        showToast('This field is not editable', 'warning');
        return;
      }

      const existingModal = document.getElementById('tg-ads-multi-url-modal');
      if (existingModal) existingModal.remove();

      const modal = createMultiUrlModal(type);
      document.body.appendChild(modal);

      setTimeout(() => {
        modal.querySelector('#tg-ads-url-textarea').focus();
      }, 100);
    });

    const idBtn = document.createElement('div');
    idBtn.id = idBtnId;
    idBtn.className = 'tg-ads-multi-url-btn tg-ads-view-ids-btn';
    idBtn.innerHTML = 'View ID List';

    idBtn.addEventListener('click', () => {
      const existingModal = document.getElementById('tg-ads-id-list-modal');
      if (existingModal) existingModal.remove();

      const ids = getSelectedIds(type);
      if (ids.length === 0) {
        showToast(`No ${isBot ? 'bots' : 'channels'} selected yet.`, 'warning');
        return;
      }

      const modal = createIdListModal(type, ids);
      document.body.appendChild(modal);
    });

    btnContainer.appendChild(btn);
    btnContainer.appendChild(idBtn);

    formControl.parentNode.insertBefore(btnContainer, formControl.nextSibling);
  }

  function initMultiUrlInserter() {
    const channelSelect = document.querySelector('.select[data-name="channels"]');
    if (channelSelect) {
      const formControl = channelSelect.closest('.pr-form-control-wrap');
      if (formControl) {
        createMultiUrlButton('channel', formControl, channelSelect);
      }
    }

    const botSelect = document.querySelector('.select[data-name="bots"]');
    if (botSelect) {
      const formControl = botSelect.closest('.pr-form-control-wrap');
      if (formControl) {
        createMultiUrlButton('bot', formControl, botSelect);
      }
    }
  }

  function extractChartDataFromJS(jsCode) {
    const chartData = {
      views: [],
      clicks: [],
      actions: [],
      spent: [],
      dates: [],
    };

    try {
      const chartPattern = /chart_count_stats_wrap[\s\S]*?"columns"\s*:\s*(\[\[.*?\]\])/s;
      const chartMatch = jsCode.match(chartPattern);

      if (chartMatch) {
        try {
          let columnsStr = chartMatch[1];
          columnsStr = columnsStr.replace(/,\s*([\]}])/g, '$1');
          const columns = JSON.parse(columnsStr);

          if (Array.isArray(columns)) {
            const namesMatch = jsCode.match(/"names"\s*:\s*\{([^}]+)\}/);
            const namesMap = {};

            if (namesMatch) {
              const namesStr = namesMatch[1];
              const nameMatches = namesStr.matchAll(/"(\w+)"\s*:\s*"([^"]+)"/g);
              for (const match of nameMatches) {
                namesMap[match[1]] = match[2].toLowerCase();
              }
            }

            let xData = null;
            const seriesData = {};

            for (const col of columns) {
              if (!Array.isArray(col) || col.length < 2) continue;

              const colId = col[0];
              const values = col.slice(1);

              if (colId === 'x') {
                xData = values;
              } else {
                seriesData[colId] = values;
              }
            }

            let viewsKey = null, clicksKey = null, actionsKey = null;

            for (const [key, label] of Object.entries(namesMap)) {
              if (key in seriesData) {
                if (label.includes('view')) viewsKey = key;
                else if (label.includes('click')) clicksKey = key;
                else if (label.includes('action') || label.includes('conversion') || label.includes('sub')) actionsKey = key;
              }
            }

            if (!viewsKey) viewsKey = 'y0';
            if (!clicksKey) clicksKey = 'y2';
            if (!actionsKey) actionsKey = 'y3';

            if (xData) {
              for (let i = 0; i < xData.length; i++) {
                const timestamp = xData[i];
                const date = new Date(timestamp);
                const dateStr = date.toISOString().split('T')[0];

                chartData.dates.push(dateStr);
                chartData.views.push(seriesData[viewsKey]?.[i] || 0);
                chartData.clicks.push(seriesData[clicksKey]?.[i] || 0);
                chartData.actions.push(seriesData[actionsKey]?.[i] || 0);
              }
            }
          }
        } catch (e) {}
      }

      const budgetPattern = /chart_budget_stats_wrap[\s\S]*?"columns"\s*:\s*(\[\[.*?\]\])/s;
      const budgetMatch = jsCode.match(budgetPattern);

      if (budgetMatch) {
        try {
          let columnsStr = budgetMatch[1];
          columnsStr = columnsStr.replace(/,\s*([\]}])/g, '$1');
          const columns = JSON.parse(columnsStr);

          if (Array.isArray(columns)) {
            let budgetXData = null;
            let budgetYData = null;

            for (const col of columns) {
              if (!Array.isArray(col) || col.length < 2) continue;

              const colId = col[0];
              const values = col.slice(1);

              if (colId === 'x') {
                budgetXData = values;
              } else if (colId === 'y0' || colId.startsWith('y')) {
                budgetYData = values;
              }
            }

            if (budgetXData && budgetYData) {
              const spendingMap = {};

              for (let i = 0; i < budgetXData.length; i++) {
                const timestamp = budgetXData[i];
                const date = new Date(timestamp);
                const dateStr = date.toISOString().split('T')[0];

                const spentMicro = budgetYData[i] || 0;
                const spentTon = spentMicro / 1000000.0;
                spendingMap[dateStr] = spentTon;
              }

              chartData.spent = chartData.dates.map(date => spendingMap[date] || 0);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    return chartData;
  }

  async function fetchAdStats(adId) {
    try {
      const url = `https://ads.telegram.org/account/ad/${adId}/stats?period=day`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'accept': 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'en-US,en;q=0.9',
          'priority': 'u=1, i',
          'referer': `https://ads.telegram.org/account/ad/${adId}/stats?period=5min`,
          'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'x-aj-referer': `https://ads.telegram.org/account/ad/${adId}/stats`,
          'x-requested-with': 'XMLHttpRequest',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const jsonData = await response.json();
      const jsCode = jsonData.j || '';
      const chartData = extractChartDataFromJS(jsCode);
      const adTitle = (jsonData.t || '').replace(' – Telegram Ads', '') || `Ad ${adId}`;
      const dailyStats = [];

      for (let i = 0; i < chartData.dates.length; i++) {
        const date = chartData.dates[i];
        const views = chartData.views[i] || 0;
        const clicks = chartData.clicks[i] || 0;
        const actions = chartData.actions[i] || 0;
        const spent = chartData.spent[i] || 0;

        const cpa = actions > 0 ? spent / actions : 0;
        const cpc = clicks > 0 ? spent / clicks : 0;
        const ctr = views > 0 ? (clicks / views) * 100 : 0;
        const cvr = clicks > 0 ? (actions / clicks) * 100 : 0;
        const cpm = views > 0 ? (spent / views) * 1000 : 0;

        dailyStats.push({
          date: date,
          views: views,
          clicks: clicks,
          actions: actions,
          spent: spent,
          cpa: cpa,
          cpc: cpc,
          ctr: ctr,
          cvr: cvr,
          cpm: cpm,
        });
      }

      dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        ad_id: adId,
        title: adTitle,
        daily_stats: dailyStats,
      };
    } catch (error) {
      throw error;
    }
  }

  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0.00 TON';
    return `${amount.toFixed(2)} TON`;
  }

  function formatPercent(value) {
    if (value === null || value === undefined) return '0.00%';
    return `${value.toFixed(2)}%`;
  }

  function getPageData(data, page, itemsPerPage) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  }

  function getPageNumbers(currentPage, totalPages) {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  }

  function createStatsWidget(data) {
    const widget = document.createElement('div');
    widget.id = 'tg-ads-stats-widget';
    widget.className = 'tg-ads-stats-widget';

    const { daily_stats } = data;
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(daily_stats.length / ITEMS_PER_PAGE);

    const totals = daily_stats.reduce((acc, day) => {
      acc.views += day.views || 0;
      acc.clicks += day.clicks || 0;
      acc.actions += day.actions || 0;
      acc.spent += day.spent || 0;
      return acc;
    }, { views: 0, clicks: 0, actions: 0, spent: 0 });

    const avgCpa = totals.actions > 0 ? totals.spent / totals.actions : 0;
    const avgCpc = totals.clicks > 0 ? totals.spent / totals.clicks : 0;
    const ctr = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0;
    const cvr = totals.clicks > 0 ? (totals.actions / totals.clicks) * 100 : 0;
    const cpm = totals.views > 0 ? (totals.spent / totals.views) * 1000 : 0;

    widget.innerHTML = `
      <div class="tg-ads-stats-header">
        <h3 class="tg-ads-stats-title">Daily Stats Overview</h3>
        <button class="tg-ads-close-btn" id="tg-ads-close-btn" title="Close">×</button>
      </div>
      <div class="tg-ads-stats-content">
        <div class="tg-ads-stats-summary">
          <div class="tg-ads-stat-card">
            <div class="tg-ads-stat-label">Total Views</div>
            <div class="tg-ads-stat-value">${formatNumber(totals.views)}</div>
          </div>
          <div class="tg-ads-stat-card">
            <div class="tg-ads-stat-label">Total Clicks</div>
            <div class="tg-ads-stat-value">${formatNumber(totals.clicks)}</div>
          </div>
          <div class="tg-ads-stat-card">
            <div class="tg-ads-stat-label">Total Actions</div>
            <div class="tg-ads-stat-value">${formatNumber(totals.actions)}</div>
          </div>
          <div class="tg-ads-stat-card">
            <div class="tg-ads-stat-label">Total Spent</div>
            <div class="tg-ads-stat-value">${formatCurrency(totals.spent)}</div>
          </div>
        </div>
        <div class="tg-ads-stats-metrics">
          <div class="tg-ads-metric-item">
            <span class="tg-ads-metric-label">Avg CPA:</span>
            <span class="tg-ads-metric-value">${formatCurrency(avgCpa)}</span>
          </div>
          <div class="tg-ads-metric-item">
            <span class="tg-ads-metric-label">Avg CPC:</span>
            <span class="tg-ads-metric-value">${formatCurrency(avgCpc)}</span>
          </div>
          <div class="tg-ads-metric-item">
            <span class="tg-ads-metric-label">CTR:</span>
            <span class="tg-ads-metric-value">${formatPercent(ctr)}</span>
          </div>
          <div class="tg-ads-metric-item">
            <span class="tg-ads-metric-label">CVR:</span>
            <span class="tg-ads-metric-value">${formatPercent(cvr)}</span>
          </div>
          <div class="tg-ads-metric-item">
            <span class="tg-ads-metric-label">CPM:</span>
            <span class="tg-ads-metric-value">${formatCurrency(cpm)}</span>
          </div>
        </div>
        <div class="tg-ads-stats-table-container">
          <div class="tg-ads-table-header">
            <h4 class="tg-ads-table-title">Daily Breakdown (${daily_stats.length} days)</h4>
            <div class="tg-ads-pagination-info" id="tg-ads-pagination-info">
              Showing 1-${Math.min(ITEMS_PER_PAGE, daily_stats.length)} of ${daily_stats.length}
            </div>
          </div>
          <div class="tg-ads-table-wrapper">
            <table class="tg-ads-stats-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Views</th>
                  <th>Clicks</th>
                  <th>Actions</th>
                  <th>Spent</th>
                  <th>CPA</th>
                  <th>CPC</th>
                  <th>CTR</th>
                  <th>CVR</th>
                </tr>
              </thead>
              <tbody id="tg-ads-table-body">
                ${getPageData(daily_stats, 1, ITEMS_PER_PAGE).map(day => `
                  <tr>
                    <td class="tg-ads-date-cell">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>${formatNumber(day.views)}</td>
                    <td>${formatNumber(day.clicks)}</td>
                    <td>${formatNumber(day.actions)}</td>
                    <td>${formatCurrency(day.spent)}</td>
                    <td>${formatCurrency(day.cpa || 0)}</td>
                    <td>${formatCurrency(day.cpc || 0)}</td>
                    <td>${formatPercent(day.ctr || 0)}</td>
                    <td>${formatPercent(day.cvr || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${totalPages > 1 ? `
            <div class="tg-ads-pagination" id="tg-ads-pagination">
              <button class="tg-ads-page-btn" id="tg-ads-prev-btn" disabled>
                ← Previous
              </button>
              <div class="tg-ads-page-numbers">
                ${getPageNumbers(1, totalPages).map(page => `
                  ${page === '...' ? '<span class="tg-ads-page-ellipsis">...</span>' : `
                    <button class="tg-ads-page-number ${page === 1 ? 'active' : ''}" data-page="${page}">
                      ${page}
                    </button>
                  `}
                `).join('')}
              </div>
              <button class="tg-ads-page-btn" id="tg-ads-next-btn" ${totalPages === 1 ? 'disabled' : ''}>
                Next →
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const closeBtn = widget.querySelector('#tg-ads-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        widget.remove();
      });
    }

    if (totalPages > 1) {
      setupPagination(widget, daily_stats, ITEMS_PER_PAGE, totalPages);
    }

    return widget;
  }

  function setupPagination(widget, dailyStats, itemsPerPage, totalPages) {
    let currentPage = 1;
    const tableBody = widget.querySelector('#tg-ads-table-body');
    const paginationInfo = widget.querySelector('#tg-ads-pagination-info');
    const prevBtn = widget.querySelector('#tg-ads-prev-btn');
    const nextBtn = widget.querySelector('#tg-ads-next-btn');
    const pageNumbers = widget.querySelectorAll('.tg-ads-page-number');

    function updateTable() {
      const pageData = getPageData(dailyStats, currentPage, itemsPerPage);
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(start + itemsPerPage - 1, dailyStats.length);

      tableBody.innerHTML = pageData.map(day => `
        <tr>
          <td class="tg-ads-date-cell">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          <td>${formatNumber(day.views)}</td>
          <td>${formatNumber(day.clicks)}</td>
          <td>${formatNumber(day.actions)}</td>
          <td>${formatCurrency(day.spent)}</td>
          <td>${formatCurrency(day.cpa || 0)}</td>
          <td>${formatCurrency(day.cpc || 0)}</td>
          <td>${formatPercent(day.ctr || 0)}</td>
          <td>${formatPercent(day.cvr || 0)}</td>
        </tr>
      `).join('');

      paginationInfo.textContent = `Showing ${start}-${end} of ${dailyStats.length}`;

      if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
      }

      const pageNumbersContainer = widget.querySelector('.tg-ads-page-numbers');
      if (pageNumbersContainer) {
        const pages = getPageNumbers(currentPage, totalPages);
        pageNumbersContainer.innerHTML = pages.map(page => {
          if (page === '...') {
            return '<span class="tg-ads-page-ellipsis">...</span>';
          }
          return `
            <button class="tg-ads-page-number ${page === currentPage ? 'active' : ''}" data-page="${page}">
              ${page}
            </button>
          `;
        }).join('');

        pageNumbersContainer.querySelectorAll('.tg-ads-page-number').forEach(btn => {
          btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            updateTable();
          });
        });
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          updateTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          updateTable();
        }
      });
    }

    pageNumbers.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page && page !== currentPage) {
          currentPage = page;
          updateTable();
        }
      });
    });
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'tg-ads-error';
    errorDiv.className = 'tg-ads-error';
    errorDiv.innerHTML = `
      <div class="tg-ads-error-content">
        <strong>Error Loading Stats</strong>
        <p>${message}</p>
        <button class="tg-ads-retry-btn" id="tg-ads-retry-btn">Retry</button>
        <button class="tg-ads-close-btn" id="tg-ads-error-close">×</button>
      </div>
    `;

    const retryBtn = errorDiv.querySelector('#tg-ads-retry-btn');
    const closeBtn = errorDiv.querySelector('#tg-ads-error-close');

    retryBtn.addEventListener('click', () => {
      errorDiv.remove();
      init();
    });

    closeBtn.addEventListener('click', () => {
      errorDiv.remove();
    });

    return errorDiv;
  }

  function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'tg-ads-loading';
    loadingDiv.className = 'tg-ads-loading';
    loadingDiv.innerHTML = `
      <div class="tg-ads-loading-spinner"></div>
      <p>Loading daily stats...</p>
    `;
    return loadingDiv;
  }

  function findStatisticsSection() {
    const h2Elements = document.querySelectorAll('h2');
    for (const h2 of h2Elements) {
      if (h2.textContent.includes('Statistics') || h2.textContent.includes('Статистика')) {
        let insertionPoint = h2.nextElementSibling;
        while (insertionPoint && insertionPoint.tagName !== 'DIV' && insertionPoint.tagName !== 'SECTION') {
          insertionPoint = insertionPoint.nextElementSibling;
        }
        return insertionPoint || h2.parentElement;
      }
    }

    const chartContainers = document.querySelectorAll('[id*="chart"], [class*="chart"]');
    if (chartContainers.length > 0) {
      return chartContainers[chartContainers.length - 1].parentElement;
    }

    return document.querySelector('.pr-content') ||
           document.querySelector('main') ||
           document.querySelector('.container') ||
           document.body;
  }

  function isAccountPage() {
    return window.location.pathname === '/account' ||
           window.location.pathname === '/account/';
  }

  function extractHashFromPage() {
    if (window.ajHash) {
      return window.ajHash;
    }

    const scripts = document.querySelectorAll('script[src*="hash="]');
    for (const script of scripts) {
      const match = script.src.match(/hash=([a-f0-9]{16,})/i);
      if (match) {
        return match[1];
      }
    }

    const inlineScripts = document.querySelectorAll('script:not([src])');
    for (const script of inlineScripts) {
      const match = script.textContent.match(/hash=([a-f0-9]{16,})/i);
      if (match) {
        return match[1];
      }
    }

    const pageText = document.documentElement.outerHTML;
    const apiUrlMatch = pageText.match(/"apiUrl"\s*:\s*"[^"]*hash=([^"&]*)"/);
    if (apiUrlMatch) {
      return apiUrlMatch[1];
    }

    return 'be173eed7f56db15b9';
  }

  async function fetchAllAds() {
    try {
      let ownerId = null;
      const hash = extractHashFromPage();

      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        ownerId = cookies.stel_adowner;
      } catch (e) {}

      if (!ownerId) {
        try {
          const pageHtml = document.documentElement.outerHTML;
          const patterns = [
            /"ownerId":\s*"([^"]+)"/,
            /ownerId["\s:=]+([a-zA-Z0-9_-]+)/,
            /stel_adowner["\s:=]+([a-zA-Z0-9_-]+)/,
          ];

          for (const pattern of patterns) {
            const match = pageHtml.match(pattern);
            if (match) {
              ownerId = match[1];
              break;
            }
          }
        } catch (e) {}
      }

      if (!ownerId && window.ajOwnerId) {
        ownerId = window.ajOwnerId;
      }

      if (!ownerId) {
        try {
          const accountResponse = await fetch('https://ads.telegram.org/account', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            }
          });

          if (accountResponse.ok) {
            const accountHtml = await accountResponse.text();
            const patterns = [
              /"ownerId":\s*"([^"]+)"/,
              /ownerId["\s:=]+([a-zA-Z0-9_-]+)/,
            ];

            for (const pattern of patterns) {
              const match = accountHtml.match(pattern);
              if (match) {
                ownerId = match[1];
                break;
              }
            }
          }
        } catch (e) {}
      }

      if (!ownerId) {
        const testResponse = await fetch(`https://ads.telegram.org/api?hash=${hash}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': 'https://ads.telegram.org',
            'referer': 'https://ads.telegram.org/account',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest',
          },
          body: 'method=getAdsList',
        });

        if (testResponse.ok) {
          const testResult = await testResponse.json();
          if (testResult.ownerId || testResult.owner_id) {
            ownerId = testResult.ownerId || testResult.owner_id;
          }
          if (testResult.items || testResult.ads || Array.isArray(testResult)) {
            return extractAdsFromResponse(testResult);
          }
        }
      }

      if (!ownerId) {
        throw new Error('No owner_id found. Please make sure you are logged in to Telegram Ads and refresh the page.');
      }

      const apiUrl = `https://ads.telegram.org/api?hash=${hash}`;
      const formData = new URLSearchParams();
      formData.append('owner_id', ownerId);
      formData.append('method', 'getAdsList');

      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'accept': 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': 'https://ads.telegram.org',
          'referer': 'https://ads.telegram.org/account',
          'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'x-requested-with': 'XMLHttpRequest',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              throw new Error(`API Error: ${errorJson.error}`);
            }
            if (errorJson.message) {
              throw new Error(`API Error: ${errorJson.message}`);
            }
          } catch (e) {
            if (e.message && e.message.includes('API Error')) {
              throw e;
            }
          }
        } catch (e) {
          if (e.message && e.message.includes('API Error')) {
            throw e;
          }
        }

        if (response.status === 400) {
          throw new Error('Bad request (400). The API request format may be incorrect. Please check console for details.');
        }

        throw new Error(`Failed to fetch ads: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.ok === false) {
        throw new Error(result.error || 'API returned an error');
      }

      if (result.error && result.ok !== true) {
        throw new Error(result.error);
      }

      return extractAdsFromResponse(result);
    } catch (error) {
      throw error;
    }
  }

  function extractAdsFromResponse(result) {
    let ads = [];
    if (result.items && Array.isArray(result.items)) {
      ads = result.items;
    } else if (result.ads && Array.isArray(result.ads)) {
      ads = result.ads;
    } else if (Array.isArray(result)) {
      ads = result;
    } else if (result.data && Array.isArray(result.data)) {
      ads = result.data;
    } else if (result.result && Array.isArray(result.result)) {
      ads = result.result;
    } else if (result.data && result.data.items && Array.isArray(result.data.items)) {
      ads = result.data.items;
    } else if (result.data && result.data.ads && Array.isArray(result.data.ads)) {
      ads = result.data.ads;
    }

    return ads;
  }

  async function calculateDashboardMetrics(ads) {
    const statusCounts = {
      total: ads.length,
      active: 0,
      in_review: 0,
      on_hold: 0,
      declined: 0,
      stopped: 0,
    };

    const activeAds = [];
    ads.forEach(ad => {
      const status = (ad.status || '').toLowerCase();
      if (status === 'active' || status === 'running' || status === 'live') {
        statusCounts.active++;
        activeAds.push(ad);
      } else if (status.includes('review') || status === 'pending') {
        statusCounts.in_review++;
      } else if (status.includes('hold') || status === 'paused') {
        statusCounts.on_hold++;
      } else if (status === 'declined') {
        statusCounts.declined++;
      } else if (status === 'stopped') {
        statusCounts.stopped++;
      }
    });

    let summary = {
      total_spent: 0,
      total_views: 0,
      total_clicks: 0,
      total_actions: 0,
    };

    if (activeAds.length > 0) {
      const adsToFetch = activeAds.slice(0, 50);
      const statsPromises = adsToFetch.map(async (ad) => {
        const adId = ad.ad_id || ad.id;
        if (!adId) return null;

        try {
          const url = `https://ads.telegram.org/account/ad/${adId}/stats?period=day`;
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'accept': 'application/json, text/javascript, */*; q=0.01',
              'accept-language': 'en-US,en;q=0.9',
              'priority': 'u=1, i',
              'referer': `https://ads.telegram.org/account/ad/${adId}/stats?period=5min`,
              'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
              'sec-ch-ua-mobile': '?0',
              'sec-ch-ua-platform': '"macOS"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-origin',
              'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
              'x-aj-referer': `https://ads.telegram.org/account/ad/${adId}/stats`,
              'x-requested-with': 'XMLHttpRequest',
            }
          });

          if (!response.ok) return null;

          const jsonData = await response.json();
          const jsCode = jsonData.j || '';
          const chartData = extractChartDataFromJS(jsCode);

          const totals = {
            views: 0,
            clicks: 0,
            actions: 0,
            spent: 0,
          };

          for (let i = 0; i < chartData.dates.length; i++) {
            totals.views += chartData.views[i] || 0;
            totals.clicks += chartData.clicks[i] || 0;
            totals.actions += chartData.actions[i] || 0;
            totals.spent += chartData.spent[i] || 0;
          }

          return totals;
        } catch (e) {}
        return null;
      });

      const statsResults = await Promise.all(statsPromises);
      statsResults.forEach(stats => {
        if (stats) {
          summary.total_views += stats.views;
          summary.total_clicks += stats.clicks;
          summary.total_actions += stats.actions;
          summary.total_spent += stats.spent;
        }
      });
    }

    return {
      statusCounts,
      summary: summary.total_spent > 0 || summary.total_views > 0 ? summary : null,
    };
  }

  function createShimmer(size = '') {
    const sizeClass = size ? ` tg-ads-shimmer-${size}` : '';
    return `<span class="tg-ads-shimmer${sizeClass}"></span>`;
  }

  function createDashboardWidget(data, isLoading = false) {
    const widget = document.createElement('div');
    widget.id = 'tg-ads-dashboard-widget';
    widget.className = 'tg-ads-dashboard-widget';

    const { statusCounts, summary } = data;
    const shimmer = createShimmer('large');
    const shimmerSmall = createShimmer('small');

    widget.innerHTML = `
      <div class="tg-ads-dashboard-header">
        <div>
          <h3 class="tg-ads-dashboard-title">Dashboard Overview</h3>
          <p class="tg-ads-dashboard-subtitle">All data processed locally in your browser</p>
        </div>
        <button class="tg-ads-close-btn" id="tg-ads-dashboard-close-btn" title="Close">×</button>
      </div>
      <div class="tg-ads-dashboard-content">
        <div class="tg-ads-dashboard-metrics">
          <div class="tg-ads-metric-card">
            <div class="tg-ads-metric-card-header">
              <span class="tg-ads-metric-label">Total Spent</span>
            </div>
            <div class="tg-ads-metric-value">${isLoading ? shimmer : (summary ? formatCurrency(summary.total_spent || 0) : '0.00 TON')}</div>
          </div>
          <div class="tg-ads-metric-card">
            <div class="tg-ads-metric-card-header">
              <span class="tg-ads-metric-label">Total Views</span>
            </div>
            <div class="tg-ads-metric-value">${isLoading ? shimmer : (summary ? formatNumber(summary.total_views || 0) : '0')}</div>
          </div>
          <div class="tg-ads-metric-card">
            <div class="tg-ads-metric-card-header">
              <span class="tg-ads-metric-label">Avg. CTR</span>
            </div>
            <div class="tg-ads-metric-value">${isLoading ? shimmer : (summary ? formatPercent((summary.total_clicks || 0) / (summary.total_views || 1) * 100) : '0.00%')}</div>
          </div>
          <div class="tg-ads-metric-card">
            <div class="tg-ads-metric-card-header">
              <span class="tg-ads-metric-label">Conversions</span>
            </div>
            <div class="tg-ads-metric-value">${isLoading ? shimmer : `${summary ? formatNumber(summary.total_actions || 0) : '0'} ${summary && summary.total_clicks > 0 ? formatPercent((summary.total_actions || 0) / summary.total_clicks * 100) : '0.00%'} CVR`}</div>
          </div>
        </div>
        <div class="tg-ads-status-cards">
          <div class="tg-ads-status-card">
            <div class="tg-ads-status-value tg-ads-status-total">${isLoading ? shimmerSmall : statusCounts.total}</div>
            <div class="tg-ads-status-label">TOTAL ADS</div>
          </div>
          <div class="tg-ads-status-card">
            <div class="tg-ads-status-value tg-ads-status-active">${isLoading ? shimmerSmall : statusCounts.active}</div>
            <div class="tg-ads-status-label">ACTIVE</div>
          </div>
          <div class="tg-ads-status-card">
            <div class="tg-ads-status-value tg-ads-status-review">${isLoading ? shimmerSmall : statusCounts.in_review}</div>
            <div class="tg-ads-status-label">IN REVIEW</div>
          </div>
          <div class="tg-ads-status-card">
            <div class="tg-ads-status-value tg-ads-status-hold">${isLoading ? shimmerSmall : statusCounts.on_hold}</div>
            <div class="tg-ads-status-label">ON HOLD</div>
          </div>
          <div class="tg-ads-status-card">
            <div class="tg-ads-status-value tg-ads-status-declined">${isLoading ? shimmerSmall : statusCounts.declined}</div>
            <div class="tg-ads-status-label">DECLINED</div>
          </div>
          <div class="tg-ads-status-card">
            <div class="tg-ads-status-value tg-ads-status-stopped">${isLoading ? shimmerSmall : statusCounts.stopped}</div>
            <div class="tg-ads-status-label">STOPPED</div>
          </div>
        </div>
      </div>
    `;

    const closeBtn = widget.querySelector('#tg-ads-dashboard-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        widget.remove();
      });
    }

    return widget;
  }

  function updateDashboardWidget(widget, data) {
    const { statusCounts, summary } = data;

    const totalSpent = widget.querySelector('.tg-ads-metric-card:nth-child(1) .tg-ads-metric-value');
    const totalViews = widget.querySelector('.tg-ads-metric-card:nth-child(2) .tg-ads-metric-value');
    const avgCtr = widget.querySelector('.tg-ads-metric-card:nth-child(3) .tg-ads-metric-value');
    const conversions = widget.querySelector('.tg-ads-metric-card:nth-child(4) .tg-ads-metric-value');

    if (totalSpent) totalSpent.textContent = summary ? formatCurrency(summary.total_spent || 0) : '0.00 TON';
    if (totalViews) totalViews.textContent = summary ? formatNumber(summary.total_views || 0) : '0';
    if (avgCtr) avgCtr.textContent = summary ? formatPercent((summary.total_clicks || 0) / (summary.total_views || 1) * 100) : '0.00%';
    if (conversions) {
      const cvrText = summary && summary.total_clicks > 0 ? formatPercent((summary.total_actions || 0) / summary.total_clicks * 100) : '0.00%';
      conversions.textContent = `${summary ? formatNumber(summary.total_actions || 0) : '0'} ${cvrText} CVR`;
    }

    const statusCards = widget.querySelectorAll('.tg-ads-status-card');
    if (statusCards[0]) statusCards[0].querySelector('.tg-ads-status-value').textContent = statusCounts.total;
    if (statusCards[1]) statusCards[1].querySelector('.tg-ads-status-value').textContent = statusCounts.active;
    if (statusCards[2]) statusCards[2].querySelector('.tg-ads-status-value').textContent = statusCounts.in_review;
    if (statusCards[3]) statusCards[3].querySelector('.tg-ads-status-value').textContent = statusCounts.on_hold;
    if (statusCards[4]) statusCards[4].querySelector('.tg-ads-status-value').textContent = statusCounts.declined;
    if (statusCards[5]) statusCards[5].querySelector('.tg-ads-status-value').textContent = statusCounts.stopped;
  }

  async function initDashboard() {
    const existingWidget = document.getElementById('tg-ads-dashboard-widget');
    if (existingWidget) {
      existingWidget.remove();
    }

    const tableContainer = document.querySelector('.table-responsive.table-wide-container');
    let insertionPoint = tableContainer ||
                        document.querySelector('.table-responsive') ||
                        document.querySelector('main') ||
                        document.querySelector('.pr-content') ||
                        document.body;

    const initialData = {
      statusCounts: { total: 0, active: 0, in_review: 0, on_hold: 0, declined: 0, stopped: 0 },
      summary: null,
    };

    const widget = createDashboardWidget(initialData, true);

    if (tableContainer) {
      if (tableContainer.firstChild) {
        tableContainer.insertBefore(widget, tableContainer.firstChild);
      } else {
        tableContainer.appendChild(widget);
      }

      widget.style.marginTop = '0';
      widget.style.marginBottom = '24px';
      widget.style.marginLeft = 'auto';
      widget.style.marginRight = 'auto';
      widget.style.padding = '0';
      widget.style.boxSizing = 'border-box';

      requestAnimationFrame(() => {
        const tableElement = tableContainer.querySelector('table');
        if (tableElement) {
          const tableWidth = tableElement.getBoundingClientRect().width;
          if (tableWidth > 0) {
            widget.style.width = `${tableWidth}px`;
            widget.style.minWidth = `${tableWidth}px`;
            widget.style.maxWidth = `${tableWidth}px`;
          }
        }
      });
    } else if (insertionPoint) {
      if (insertionPoint.firstChild) {
        insertionPoint.insertBefore(widget, insertionPoint.firstChild);
      } else {
        insertionPoint.appendChild(widget);
      }
    }

    try {
      const ads = await fetchAllAds();
      const metrics = await calculateDashboardMetrics(ads);

      updateDashboardWidget(widget, {
        statusCounts: metrics.statusCounts,
        summary: metrics.summary,
      });
    } catch (error) {
    }
  }

  async function init() {
    if (!window.location.hostname.includes('ads.telegram.org')) {
      return;
    }

    if (isAccountPage()) {
      await initDashboard();
      return;
    }

    if (isAdFormPage()) {
      initMultiUrlInserter();
      return;
    }

    const adId = extractAdId();
    if (!adId || !isStatsPage()) {
      return;
    }

    const existingWidget = document.getElementById('tg-ads-stats-widget');
    if (existingWidget) {
      existingWidget.remove();
    }

    const existingError = document.getElementById('tg-ads-error');
    if (existingError) {
      existingError.remove();
    }

    const insertionPoint = findStatisticsSection();

    const loading = showLoading();
    insertionPoint.insertBefore(loading, insertionPoint.firstChild);

    try {
      const statsData = await fetchAdStats(adId);
      loading.remove();
      const widget = createStatsWidget(statsData);
      insertionPoint.insertBefore(widget, insertionPoint.firstChild);

    } catch (error) {
      loading.remove();
      const errorDiv = showError(error.message || 'Failed to load stats. Make sure you are logged in to Telegram Ads.');
      insertionPoint.insertBefore(errorDiv, insertionPoint.firstChild);
    }
  }

  let isInitializing = false;
  let lastUrl = location.href;
  let retryCount = 0;
  const MAX_RETRIES = 10;

  async function safeInit() {
    if (isInitializing) {
      return;
    }

    isInitializing = true;
    try {
      await init();
      retryCount = 0;
    } catch (e) {
      retryCount = 0;
    } finally {
      isInitializing = false;
    }
  }

  function tryInitWithRetry() {
    const adId = extractAdId();
    const hasWidget = document.getElementById('tg-ads-stats-widget') ||
                      document.getElementById('tg-ads-dashboard-widget') ||
                      document.getElementById('tg-ads-multi-channel-btn') ||
                      document.getElementById('tg-ads-multi-bot-btn');

    if (hasWidget) {
      retryCount = 0;
      return;
    }

    if (isAccountPage() || (adId && isStatsPage())) {
      const hasContent = document.querySelector('.pr-content') ||
                        document.querySelector('main') ||
                        document.querySelector('.table-responsive') ||
                        document.querySelector('h2');

      if (hasContent) {
        safeInit();
      } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(tryInitWithRetry, 100);
      }
    } else if (isAdFormPage()) {
      const hasChannelInput = document.querySelector('.select[data-name="channels"]');
      const hasBotInput = document.querySelector('.select[data-name="bots"]');

      if (hasChannelInput || hasBotInput) {
        initMultiUrlInserter();
      } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(tryInitWithRetry, 20);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInitWithRetry);
  } else {
    tryInitWithRetry();
  }

  let urlCheckTimeout = null;
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      retryCount = 0;
      if (urlCheckTimeout) {
        clearTimeout(urlCheckTimeout);
      }
      urlCheckTimeout = setTimeout(tryInitWithRetry, 50);
    }

    if (isAdFormPage()) {
      initMultiUrlInserter();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    retryCount = 0;
    tryInitWithRetry();
  });

  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    retryCount = 0;
    setTimeout(tryInitWithRetry, 50);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    retryCount = 0;
    setTimeout(tryInitWithRetry, 50);
  };

})();
