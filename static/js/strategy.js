'use strict';

var switchGrid = window.switchGrid = function switchGrid() {
  hideAllMainPanels();

  var panel = document.getElementById('grid-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();

  var tab = document.getElementById('tab-grid');
  if (tab) tab.classList.add('active');

  if (typeof fetchGridStrategies === 'function') fetchGridStrategies();
  if (typeof fetchDCAStrategies === 'function') fetchDCAStrategies();
};

window.updateGridSummaryPanel = function() {
  var exchange = (document.getElementById('grid-exchange') || {}).value || '';
  var symbol = (document.getElementById('grid-symbol') || {}).value || '';
  var symbolSearch = (document.getElementById('grid-symbol-search') || {}).value || '';
  var basePrice = parseFloat((document.getElementById('grid-base-price') || {}).value) || 0;
  var gridCount = parseInt((document.getElementById('grid-count') || {}).value) || 0;
  var amount = parseFloat((document.getElementById('grid-amount') || {}).value) || 0;
  var minOrder = exchange === 'bithumb' ? 1000 : 5500;

  function setChk(id, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = ok ? '✓' : '○';
    el.style.color = ok ? '#10B981' : '#4B5563';
  }
  setChk('chk-exchange', !!exchange);
  setChk('chk-coin', !!symbol);
  setChk('chk-minorder', amount >= minOrder);
  setChk('chk-grid', gridCount > 0);

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  setText('sum-exchange', exchange === 'upbit' ? 'Upbit' : exchange === 'bithumb' ? 'Bithumb' : '-');
  setText('sum-coin', symbolSearch || '-');
  setText('sum-base-price', basePrice ? Number(basePrice).toLocaleString() + ' KRW' : '-');
  setText('sum-grid-count', gridCount ? gridCount + '개' : '-');
  setText('sum-min-order', amount ? Number(amount).toLocaleString() + ' KRW' : '-');

  var canStart = exchange && symbol && basePrice > 0 && gridCount > 0 && amount >= minOrder;
  var statusEl = document.getElementById('sum-status');
  if (statusEl) {
    statusEl.textContent = canStart ? '시작 가능' : '시작 불가';
    statusEl.style.color = canStart ? '#10B981' : '#EF4444';
  }
};

window.updateDCASummaryPanel = function() {
  var type = (document.getElementById('dca-type') || {}).value || '';
  var exchange = (document.getElementById('dca-exchange') || {}).value || '';
  var symbol = (document.getElementById('dca-symbol') || {}).value || '';
  var symbolSearch = (document.getElementById('dca-symbol-search') || {}).value || '';
  var perOrder = parseFloat((document.getElementById('dca-amount-per-order') || {}).value) || 0;
  var rounds = parseInt((document.getElementById('dca-total-rounds') || {}).value) || 0;
  var total = parseFloat((document.getElementById('dca-total-amount') || {}).value) || 0;
  var minOrder = exchange === 'bithumb' ? 1000 : 5500;

  var typeLabel = type === 'DCA' ? '분할매수 (하락)' : type === 'DCA_TIME' ? '분할매수 (시간)' : type === 'ACCUMULATE' ? '적립식' : '-';
  var exchangeLabel = exchange === 'upbit' ? 'Upbit' : exchange === 'bithumb' ? 'Bithumb' : '-';
  var estimatedTotal = perOrder > 0 && rounds > 0 ? perOrder * rounds : 0;

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  setText('dca-sum-type', typeLabel);
  setText('dca-sum-exchange', exchangeLabel);
  setText('dca-sum-coin', symbolSearch || '-');
  setText('dca-sum-per-order', perOrder ? Number(perOrder).toLocaleString() + ' KRW' : '-');
  setText('dca-sum-rounds', rounds ? rounds + '회' : '-');
  setText('dca-sum-total', estimatedTotal ? Number(estimatedTotal).toLocaleString() + ' KRW' : '-');

  var canStart = exchange && symbol && perOrder >= minOrder && rounds > 0 && (total >= estimatedTotal || total === 0);
  var reason = '';
  if (!symbol) reason = '코인을 선택하세요';
  else if (perOrder < minOrder && perOrder > 0) reason = '최소 주문 금액 미달 (' + minOrder.toLocaleString() + ' KRW)';
  else if (rounds <= 0) reason = '실행 횟수가 0입니다';
  else if (total > 0 && total < estimatedTotal) reason = '총 투자금이 부족합니다 (필요: ' + Number(estimatedTotal).toLocaleString() + ' KRW)';

  var statusEl = document.getElementById('dca-sum-status');
  if (statusEl) {
    statusEl.textContent = reason ? '시작 불가' : (canStart ? '시작 가능' : '미입력');
    statusEl.style.color = reason ? '#EF4444' : (canStart ? '#10B981' : '#4B5563');
  }

  var prevEl = document.getElementById('dca-preview');
  if (prevEl) {
    if (reason) {
      prevEl.style.color = '#EF4444';
      prevEl.textContent = reason;
    } else if (canStart) {
      prevEl.style.color = '#10B981';
      prevEl.textContent = '준비 완료 — 전략을 시작할 수 있습니다.';
    } else {
      prevEl.style.color = 'rgba(255,255,255,0.46)';
      prevEl.textContent = '모든 필드를 입력하면 검증 결과가 표시됩니다.';
    }
  }
};

window.updateDCAForm = function() {
  var type = document.getElementById('dca-type').value;
  document.getElementById('dca-price-drop-wrap').style.display = type === 'DCA' ? 'block' : 'none';
  document.getElementById('dca-time-wrap').style.display = type === 'DCA_TIME' ? 'block' : 'none';
  document.getElementById('dca-schedule-wrap').style.display = type === 'ACCUMULATE' ? 'block' : 'none';
  document.getElementById('dca-rounds-wrap').style.display = type === 'ACCUMULATE' ? 'none' : 'block';
  updateDCAPreview();
};

window.updateDCAPreview = function() {
  var total = parseFloat(document.getElementById('dca-total-amount').value);
  var perOrder = parseFloat(document.getElementById('dca-amount-per-order').value);
  var rounds = parseInt(document.getElementById('dca-total-rounds').value) || 1;
  var el = document.getElementById('dca-preview');
  if (!total || !perOrder) {
    el.innerHTML = '';
    return;
  }
  var calcRounds = Math.floor(total / perOrder);
  el.innerHTML =
    '총 투자: ' + Number(total).toLocaleString() + '원<br>' +
    '회차별: ' + Number(perOrder).toLocaleString() + '원<br>' +
    '예상 횟수: ' + calcRounds + '회';
};

window.updateGridPreview = function() {
  const basePrice = parseFloat(document.getElementById('grid-base-price').value);
  const rangePct = parseFloat(document.getElementById('grid-range-pct').value);
  const gridCount = parseInt(document.getElementById('grid-count').value);
  const amount = parseFloat(document.getElementById('grid-amount').value);
  const profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1;
  const el = document.getElementById('grid-preview');
  if (!basePrice || !rangePct || !gridCount || !amount) {
    el.innerHTML = '';
    return;
  }
  const lower = basePrice * (1 - rangePct / 100);
  const upper = basePrice * (1 + rangePct / 100);
  const step = (upper - lower) / gridCount;
  const totalInvest = amount * gridCount;
  el.innerHTML =
    '범위: ' + lower.toLocaleString() + ' ~ ' + upper.toLocaleString() + '원<br>' +
    '간격: ' + step.toFixed(2) + '원<br>' +
    '총 투자금액: ' + totalInvest.toLocaleString() + '원<br>' +
    '예상 회차 수익: ' + (profitGap * (amount / basePrice)).toFixed(4) + '원';
};

window.closeCreateGrid = function() {
  document.getElementById('grid-create-form').style.display = 'none';
  var rp = document.getElementById('grid-right-panel');
  if (rp) { rp.style.display = 'none'; }
};

window.openCreateGrid = function() {
  window._editingGridId = null;
  document.getElementById('grid-create-form').style.display = 'block';
  var titleEl = document.getElementById('grid-form-title');
  if (titleEl) titleEl.textContent = '새 그리드 전략 설정';
  var rp = document.getElementById('grid-right-panel');
  if (rp) { rp.style.display = 'flex'; }
  document.getElementById('grid-symbol').value = '';
  document.getElementById('grid-symbol-search').value = '';
  document.getElementById('grid-base-price').value = '';
  var dd = document.getElementById('grid-symbol-dropdown');
  if (dd) dd.style.display = 'none';
  updateGridPreview();
  updateGridSummaryPanel();
};

window.selectGridSymbolById = function(el) {
  var market = el.getAttribute('data-market');
  var kname = el.getAttribute('data-kname');
  var price = el.getAttribute('data-price');
  document.getElementById('grid-symbol').value = market;
  document.getElementById('grid-symbol-search').value = kname + ' (' + market.replace('KRW-','') + ')';
  document.getElementById('grid-symbol-dropdown').style.display = 'none';
  document.getElementById('grid-base-price').value = price;
  updateGridPreview();
};

window.searchGridSymbol = function(query) {
  const dropdown = document.getElementById('grid-symbol-dropdown');
  if (!query || query.length < 1) { dropdown.style.display = 'none'; return; }
  const q = query.toLowerCase();
  const filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q);
  }).slice(0, 20);
  if (!filtered.length) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = filtered.map(function(s) {
    var mkt = s.market.replace('KRW-','');
    var price = Number(s.trade_price).toLocaleString();
    var kname = s.korean_name || mkt;
    return '<div class="grid-sym-item" data-market="' + s.market + '" data-kname="' + kname + '" data-price="' + s.trade_price + '" ' +
      'onclick="selectGridSymbolById(this)" ' +
      'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center">' +
      '<div><span style="font-weight:700;font-size:13px">' + kname + '</span>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + mkt + '</span></div>' +
      '<span style="font-size:13px;font-weight:600;color:var(--accent)">' + price + '원</span>' +
      '</div>';
  }).join('');
  dropdown.style.display = 'block';
};

window.submitCreateGrid = function() {
  if (_currentUser && !_currentUser.is_dry_run) {
    if (!confirm('실제 계좌로 그리드 전략을 시작합니다. 실제 돈이 사용됩니다. 계속하시겠습니까?')) return;
  }
  var exchange = document.getElementById('grid-exchange').value;
  var symbol = document.getElementById('grid-symbol').value.trim().toUpperCase();
  var basePrice = parseFloat(document.getElementById('grid-base-price').value);
  var rangePct = parseFloat(document.getElementById('grid-range-pct').value);
  var gridCount = parseInt(document.getElementById('grid-count').value);
  var amount = parseFloat(document.getElementById('grid-amount').value);
  var profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1;
  var msgEl = document.getElementById('grid-create-msg');
  if (!symbol || !basePrice || !rangePct || !gridCount || !amount) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '모든 항목을 입력하세요'; return;
  }
  if (amount * gridCount < 5500) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '총 투자금액이 너무 적습니다'; return;
  }
  var maxInvestment = parseFloat(document.getElementById('grid-max-investment') ? document.getElementById('grid-max-investment').value : '') || null;
  var stopLoss = parseFloat(document.getElementById('grid-stop-loss') ? document.getElementById('grid-stop-loss').value : '') || null;
  var dailyLoss = parseFloat(document.getElementById('grid-daily-loss') ? document.getElementById('grid-daily-loss').value : '') || null;
  var profitTarget = parseFloat(document.getElementById('grid-profit-target') ? document.getElementById('grid-profit-target').value : '') || null;
  var smartSellMode = _smartSellMode || 'BASIC';
  var splitCount = parseInt(document.getElementById('grid-split-count') ? document.getElementById('grid-split-count').value : '3') || 3;
  var splitRatio = document.getElementById('grid-split-ratio') ? (document.getElementById('grid-split-ratio').value || '40,35,25') : '40,35,25';
  var splitGapPct = parseFloat(document.getElementById('grid-split-gap-pct') ? document.getElementById('grid-split-gap-pct').value : '1.0') || 1.0;
  var trailingPct = parseFloat(document.getElementById('grid-trailing-pct') ? document.getElementById('grid-trailing-pct').value : '2.0') || 2.0;
  var trailingTrigger = parseFloat(document.getElementById('grid-trailing-trigger') ? document.getElementById('grid-trailing-trigger').value : '1.0') || 1.0;
  if (smartSellMode === 'SPLIT' || smartSellMode === 'BOTH') {
    var ratios = splitRatio.split(',').map(function(x) { return parseFloat(x.trim()) || 0; });
    var total = ratios.reduce(function(a, b) { return a + b; }, 0);
    if (Math.abs(total - 100) > 1) {
      msgEl.style.color = '#f87171'; msgEl.textContent = '분할익절 비율의 합이 100%가 아닙니다 (현재: ' + total.toFixed(0) + '%)'; return;
    }
  }
  authFetch('/grid/strategies', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      exchange: exchange, symbol: symbol, base_price: basePrice, range_pct: rangePct,
      grid_count: gridCount, amount_per_grid: amount, profit_gap: profitGap,
      max_investment: maxInvestment, stop_loss_price: stopLoss,
      daily_loss_limit: dailyLoss, profit_target_pct: profitTarget,
      smart_sell_mode: smartSellMode, split_count: splitCount, split_ratio: splitRatio,
      split_gap_pct: splitGapPct, trailing_pct: trailingPct, trailing_trigger_pct: trailingTrigger
    })
  }).then(function(r) {
    if (!r) return;
    r.json().then(function(d) {
      if (r.ok) {
        msgEl.style.color = '#4ade80';
        msgEl.textContent = '전략 시작! ID: ' + d.strategy_id;
        setTimeout(function() { closeCreateGrid(); fetchGridStrategies(); }, 1500);
      } else {
        msgEl.style.color = '#f87171';
        var _re = d.detail; msgEl.textContent = Array.isArray(_re) ? _re.map(function(e){return e.msg||e.message||JSON.stringify(e);}).join(' / ') : (typeof _re==='string'?_re:'생성 실패');
      }
    });
  });
};

window.fetchGridStrategies = function() {
  authFetch('/grid/strategies').then(function(r) {
    if (!r) return;
    r.json().then(function(d) {
      window._strategies = Array.isArray(d.strategies) ? d.strategies : [];
      var el = document.getElementById('grid-strategy-list');
      if (!d.strategies || !d.strategies.length) {
        el.innerHTML = '<div style="padding:32px 16px;text-align:center"><div style="font-size:28px;margin-bottom:10px">⚡</div><div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:6px">실행 중인 전략이 없습니다</div><div style="font-size:11px;color:var(--text3);margin-bottom:14px">새 전략을 만들어 자동매매를 시작하세요</div><button onclick="openCreateGrid()" style="background:var(--accent);color:#1a1200;border:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">+ 새 전략 만들기</button></div>';
        return;
      }
      el.innerHTML = d.strategies.map(function(s) {
        var statusColor = s.status === 'ACTIVE' ? '#4ade80' : s.status === 'PAUSED' ? '#f59e0b' : '#888';
        var statusText = s.status === 'ACTIVE' ? '● 실행 중' : s.status === 'PAUSED' ? '● 일시정지' : '● 종료';
        var profitColor = s.total_profit >= 0 ? 'pnl-plus' : 'pnl-minus';
        var profitSign = s.total_profit >= 0 ? '+' : '';
        var smartBadge = '';
        if (s.smart_sell_mode === 'SPLIT') smartBadge = '<span style="font-size:10px;background:rgba(96,165,250,0.12);color:#60a5fa;border:1px solid rgba(96,165,250,0.4);border-radius:4px;padding:1px 6px;margin-left:6px">분할익절</span>';
        else if (s.smart_sell_mode === 'TRAILING') smartBadge = '<span style="font-size:10px;background:rgba(167,139,250,0.12);color:#a78bfa;border:1px solid rgba(167,139,250,0.4);border-radius:4px;padding:1px 6px;margin-left:6px">트레일링</span>';
        else if (s.smart_sell_mode === 'BOTH') smartBadge = '<span style="font-size:10px;background:rgba(245,200,66,0.12);color:var(--accent);border:1px solid rgba(245,200,66,0.4);border-radius:4px;padding:1px 6px;margin-left:6px">복합</span>';
        var pauseBtn = s.status === 'ACTIVE' ? '<button class="btn-warn" onclick="pauseGrid(' + s.id + ')">⏸ 정지</button>' : '';
        var resumeBtn = s.status === 'PAUSED' ? '<button class="btn-warn" onclick="resumeGrid(' + s.id + ')">▶ 재개</button>' : '';
        var stopBtn = s.status !== 'STOPPED' ? '<button class="btn-danger" onclick="stopGrid(' + s.id + ')">⏹ 종료</button>' : '';
        var deleteBtn = s.status === 'STOPPED' ? '<button class="btn-danger" onclick="deleteGrid(' + s.id + ')">🗑 삭제</button>' : '';
        var editBtn = s.status === 'PAUSED' ? '<button style="background:rgba(96,165,250,0.15);border:1px solid #60a5fa;color:#60a5fa;padding:3px 8px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600" onclick="editGrid(' + s.id + ')">✏️ 수정</button>' : '';
        var ordersBtn = '<button style="background:var(--bg4);border:1px solid var(--border);color:var(--text2);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:11px" onclick="viewGridOrders(' + s.id + ')">📋 자세히</button>';
        var bottomActionBtns = pauseBtn + stopBtn + ordersBtn;
        var smartDetail = '';
        if (s.smart_sell_mode === 'SPLIT' || s.smart_sell_mode === 'BOTH')
          smartDetail += '<div class="pos-item"><div class="pos-item-label">분할단계</div><div class="pos-item-val">' + s.split_count + '단계 / ' + s.split_gap_pct + '%간격</div></div>';
        if (s.smart_sell_mode === 'TRAILING' || s.smart_sell_mode === 'BOTH')
          smartDetail += '<div class="pos-item"><div class="pos-item-label">트레일링</div><div class="pos-item-val">+' + s.trailing_trigger_pct + '% 발동 / -' + s.trailing_pct + '% 매도</div></div>';
        return '<div class="settings-card" style="margin-bottom:12px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
            '<div><span style="font-size:15px;font-weight:700;color:var(--text)">' + ((_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')) + '</span>' +
            '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + s.exchange.toUpperCase() + '</span>' +
            '<span style="font-size:11px;font-weight:700;color:' + statusColor + ';margin-left:8px">' + statusText + '</span>' +
            smartBadge + '</div>' +
            '<div style="display:flex;gap:4px;flex-wrap:wrap">' + resumeBtn + deleteBtn + editBtn + '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:' + (smartDetail ? '8px' : '10px') + '">' +
            '<div class="pos-item"><div class="pos-item-label">기준가</div><div class="pos-item-val">' + Number(s.base_price).toLocaleString() + '원</div></div>' +
            '<div class="pos-item"><div class="pos-item-label">범위</div><div class="pos-item-val">+-' + s.range_pct + '%</div></div>' +
            '<div class="pos-item"><div class="pos-item-label">그리드</div><div class="pos-item-val">' + s.grid_count + '개</div></div>' +
            '<div class="pos-item"><div class="pos-item-label">회차금액</div><div class="pos-item-val">' + Number(s.amount_per_grid).toLocaleString() + '원</div></div>' +
          '</div>' +
          (smartDetail ? '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">' + smartDetail + '</div>' : '') +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:12px;color:var(--text3)">총 투자: ' + Number(s.amount_per_grid * s.grid_count).toLocaleString() + '원</span>' +
            '<span class="' + profitColor + '" style="font-size:14px;font-weight:700">누적수익 ' + profitSign + Number(s.total_profit).toLocaleString() + '원</span>' +
          '</div>' +
          '<div class="grid-card-bottom-actions" style="display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;margin-top:10px">' + bottomActionBtns + '</div>' +
          '<div id="grid-orders-' + s.id + '" style="display:none;margin-top:12px"></div>' +
        '</div>';
      }).join('');
    });
  });
};

window.openCreateDCA = function() {
  document.getElementById('dca-create-form').style.display = 'block';
  var rp = document.getElementById('dca-right-panel');
  if (rp) rp.style.display = 'flex';
  document.getElementById('dca-symbol').value = '';
  document.getElementById('dca-symbol-search').value = '';
  var dd = document.getElementById('dca-symbol-dropdown');
  if (dd) dd.style.display = 'none';
  updateDCAPreview();
};

window.closeCreateDCA = function() {
  document.getElementById('dca-create-form').style.display = 'none';
  var rp = document.getElementById('dca-right-panel');
  if (rp) rp.style.display = 'none';
};

window.buildCreateDCABody = function() {
  var typeVal = document.getElementById('dca-type').value;
  var exchange = document.getElementById('dca-exchange').value;
  var symbol = document.getElementById('dca-symbol').value.trim().toUpperCase();
  var totalAmount = parseFloat(document.getElementById('dca-total-amount').value);
  var amountPerOrder = parseFloat(document.getElementById('dca-amount-per-order').value);
  var _tr = parseInt(document.getElementById('dca-total-rounds').value, 10);
  var totalRounds = (Number.isFinite(_tr) && _tr >= 1) ? _tr : 10;
  var _pd = parseFloat(document.getElementById('dca-price-drop').value);
  var priceDrop = (Number.isFinite(_pd) && _pd > 0) ? _pd : null;
  var _ti = parseInt(document.getElementById('dca-time-interval').value, 10);
  var timeInterval = (Number.isFinite(_ti) && _ti > 0) ? _ti : null;
  var schedule = document.getElementById('dca-schedule').value;
  var _sl = parseFloat(document.getElementById('dca-stop-loss').value);
  var stopLoss = (Number.isFinite(_sl) && _sl > 0) ? _sl : null;
  var _ma = parseFloat(document.getElementById('dca-max-avg').value);
  var maxAvg = (Number.isFinite(_ma) && _ma > 0) ? _ma : null;
  var strategyType = typeVal === 'ACCUMULATE' ? 'ACCUMULATE' : 'DCA';
  var intervalType = typeVal === 'DCA_TIME' ? 'TIME' : 'PRICE';

  return {
    symbol: symbol,
    totalAmount: totalAmount,
    amountPerOrder: amountPerOrder,
    body: {
      exchange: exchange,
      symbol: symbol,
      strategy_type: strategyType,
      total_amount: totalAmount,
      amount_per_order: amountPerOrder,
      total_rounds: totalRounds,
      interval_type: intervalType,
      price_drop_pct: priceDrop,
      time_interval_hours: timeInterval,
      accumulate_schedule: strategyType === 'ACCUMULATE' ? schedule : null,
      stop_loss_price: stopLoss,
      max_avg_price: maxAvg
    }
  };
};

window.renderSubmitCreateDCAMessage = function(msgEl, state, payload) {
  if (!msgEl) return;

  if (state === 'missing-symbol') {
    msgEl.style.color = '#f87171';
    msgEl.textContent = '코인을 선택하세요';
    return;
  }

  if (state === 'invalid-amount') {
    msgEl.style.color = '#f87171';
    msgEl.textContent = '올바른 금액을 입력하세요';
    return;
  }

  if (state === 'success') {
    msgEl.style.color = '#4ade80';
    msgEl.textContent = '✅ 전략 시작! ID: ' + payload.strategy_id;
    return;
  }

  if (state === 'error') {
    var _err = payload.detail;
    msgEl.style.color = '#f87171';
    msgEl.textContent = Array.isArray(_err)
      ? _err.map(function(e){ return e.msg || e.message || JSON.stringify(e); }).join(' / ')
      : (typeof _err === 'string' ? _err : '생성 실패');
  }
};

window.confirmSubmitCreateDCA = function() {
  if (!_currentUser.is_dry_run) {
    return confirm('⚠️ 실제 계좌로 전략을 시작합니다. 계속할까요?');
  }
  return true;
};

window.submitCreateDCA = async function() {
  var dcaBuild = buildCreateDCABody();
  var symbol = dcaBuild.symbol;
  var totalAmount = dcaBuild.totalAmount;
  var amountPerOrder = dcaBuild.amountPerOrder;
  var body = dcaBuild.body;
  var msgEl = document.getElementById('dca-create-msg');

  if (!symbol) { renderSubmitCreateDCAMessage(msgEl, 'missing-symbol'); return; }
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(amountPerOrder) || amountPerOrder <= 0) {
    renderSubmitCreateDCAMessage(msgEl, 'invalid-amount'); return;
  }

  if (!confirmSubmitCreateDCA()) return;

  var r = await authFetch('/dca/strategies', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if (!r) return;
  var d = await r.json();
  if (r.ok) {
    renderSubmitCreateDCAMessage(msgEl, 'success', d);
    setTimeout(() => { closeCreateDCA(); fetchDCAStrategies(); }, 1500);
  } else {
    renderSubmitCreateDCAMessage(msgEl, 'error', d);
  }
};

window.selectDCASymbol = function(el) {
  document.getElementById('dca-symbol').value = el.getAttribute('data-market');
  document.getElementById('dca-symbol-search').value = el.getAttribute('data-kname') + ' (' + el.getAttribute('data-market').replace('KRW-','') + ')';
  document.getElementById('dca-symbol-dropdown').style.display = 'none';
};

window.searchDCASymbol = function(query) {
  var dropdown = document.getElementById('dca-symbol-dropdown');
  if (!query) { dropdown.style.display = 'none'; return; }
  var q = query.toLowerCase();
  var filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q);
  }).slice(0, 15);
  if (!filtered.length) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = filtered.map(function(s) {
    return '<div class="grid-sym-item" data-market="' + s.market + '" data-kname="' + (s.korean_name||s.market) + '" ' +
      'onclick="selectDCASymbol(this)" ' +
      'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between">' +
      '<div><span style="font-weight:700">' + (s.korean_name||s.market) + '</span>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + s.market.replace('KRW-','') + '</span></div>' +
      '<span style="color:var(--accent)">' + Number(s.trade_price).toLocaleString() + '원</span>' +
      '</div>';
  }).join('');
  dropdown.style.display = 'block';
};

window.dashStopDCA = function(id) {
  if (!confirm('분할매수 전략을 삭제하시겠습니까?')) return;
  if (typeof stopDCA === 'function') stopDCA(id);
};

window.pauseDCA = async function(id) {
  var r = await authFetch('/dca/strategies/' + id + '/pause', {method:'POST'});
  if (r && r.ok) { showToast('⏸ 전략 일시정지'); fetchDCAStrategies(); }
};

window.resumeDCA = async function(id) {
  var r = await authFetch('/dca/strategies/' + id + '/resume', {method:'POST'});
  if (r && r.ok) { showToast('▶ 전략 재개'); fetchDCAStrategies(); }
};

window.stopDCA = async function(id) {
  if (!confirm('전략을 종료할까요?')) return;
  var r = await authFetch('/dca/strategies/' + id, {method:'DELETE'});
  if (r && r.ok) { showToast('⏹ 전략 종료'); fetchDCAStrategies(); }
};

window.deleteDCA = async function(id) {
  if (!confirm('전략을 완전히 삭제할까요?')) return;
  var r = await authFetch('/dca/strategies/' + id + '/delete', {method:'DELETE'});
  if (r && r.ok) { showToast('🗑 삭제 완료'); fetchDCAStrategies(); }
};

window.viewDCAOrders = async function(id) {
  var el = document.getElementById('dca-orders-' + id);
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  var r = await authFetch('/dca/strategies/' + id + '/orders');
  if (!r) return;
  var d = await r.json();
  if (!d.orders.length) { el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">주문 기록 없음</div>'; el.style.display = 'block'; return; }
  el.innerHTML = '<div style="border-top:1px solid var(--border2);padding-top:10px;overflow-x:auto">' +
    '<table style="width:100%;min-width:400px;font-size:11px">' +
    '<thead><tr><th>회차</th><th>매수가</th><th>금액</th><th>수량</th><th>시각</th></tr></thead>' +
    '<tbody>' + d.orders.map(function(o) {
      return '<tr>' +
        '<td style="text-align:center;font-weight:700">#' + o.round_num + '</td>' +
        '<td>' + Number(o.price).toLocaleString() + '원</td>' +
        '<td>' + Number(o.amount_krw).toLocaleString() + '원</td>' +
        '<td>' + parseFloat(o.qty).toFixed(6) + '</td>' +
        '<td style="color:var(--text3)">' + (o.created_at || '').substring(0, 16) + '</td>' +
        '</tr>';
    }).join('') + '</tbody></table></div>';
  el.style.display = 'block';
};

window.fetchDCAStrategies = async function() {
  var r = await authFetch('/dca/strategies');
  if (!r) return;
  var d = await r.json();
  var el = document.getElementById('dca-strategy-list');
  if (!el) return;
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="height:132px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
      '<div style="font-size:13px;font-weight:700;color:#FFFFFF">실행 중인 분할매수 전략이 없습니다</div>' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.36)">새 전략을 저장하고 바로 시작해보세요</div>' +
      '<button onclick="openCreateDCA()" style="height:28px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:2px">+ 새 전략 만들기</button>' +
    '</div>';
    return;
  }
  el.innerHTML = d.strategies.map(function(s) {
    var statusColor = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : s.status === 'COMPLETED' ? '#3B82F6' : '#4B5563';
    var statusText = {'ACTIVE':'● 실행 중','PAUSED':'● 일시정지','STOPPED':'● 종료','COMPLETED':'● 완료'}[s.status] || s.status;
    var typeText = s.strategy_type === 'ACCUMULATE' ? '적립식' : '분할매수';
    var intervalText = s.strategy_type === 'ACCUMULATE'
      ? ({'DAILY':'매일','WEEKLY':'매주','MONTHLY':'매월'}[s.accumulate_schedule] || '-')
      : (Number(s.price_drop_pct) > 0 ? Number(s.price_drop_pct).toFixed(1) + '% 하락 시' : (s.time_interval_hours != null ? Number(s.time_interval_hours) + '시간마다' : '-'));
    var progress = s.total_rounds > 0 ? Math.round(s.completed_rounds / s.total_rounds * 100) : 0;
    var primaryBtn = '';
    if (s.status === 'ACTIVE') primaryBtn = '<button onclick="pauseDCA(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">일시정지</button><button onclick="deleteDCA(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>';
    else if (s.status === 'PAUSED') primaryBtn = '<button onclick="resumeDCA(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">재개</button><button onclick="deleteDCA(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>';
    else if (s.status === 'STOPPED' || s.status === 'COMPLETED') primaryBtn = '<button onclick="deleteDCA(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">삭제</button>';
    var stopBtnHtml = s.status === 'PAUSED' ? '<button onclick="stopDCA(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">종료</button>' : '';
    var detailBtn = '<button onclick="viewDCAOrders(' + s.id + ')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.52);cursor:pointer">자세히</button>';
    return '<div style="height:92px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);padding:12px 14px;margin-bottom:10px;box-sizing:border-box">' +
      '<div style="display:grid;grid-template-columns:1.5fr 0.7fr 0.7fr 0.7fr auto;align-items:center;gap:10px;height:100%">' +
        '<div>' +
          '<div style="font-size:12px;font-weight:700;color:#FFFFFF">' + ((_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')) + ' <span style="font-size:9px;color:rgba(255,255,255,0.38)">' + typeText + ' · ' + s.exchange.toUpperCase() + '</span></div>' +
          '<div style="font-size:10px;font-weight:700;color:' + statusColor + ';margin-top:2px">' + statusText + '</div>' +
          '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:4px;margin-top:4px;overflow:hidden;width:100%"><div style="height:100%;width:' + progress + '%;background:#F59E0B;border-radius:4px"></div></div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">진행</div>' +
          '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + s.completed_rounds + '/' + s.total_rounds + '회</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">간격</div>' +
          '<div style="font-size:10px;font-weight:600;color:#D1D5DB">' + intervalText + '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">총 투자</div>' +
          '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + Number(s.total_invested).toLocaleString() + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;flex-direction:column">' + primaryBtn + stopBtnHtml + detailBtn + '</div>' +
      '</div>' +
      '<div id="dca-orders-' + s.id + '" style="display:none;margin-top:12px"></div>' +
    '</div>';
  }).join('');
};

window.pauseGrid = async function(id) {
  const r = await authFetch('/grid/strategies/'+id+'/pause', {method:'POST'});
  if (r && r.ok) { showToast('⏸ 전략 일시정지'); fetchGridStrategies(); }
};

window.resumeGrid = async function(id) {
  const r = await authFetch('/grid/strategies/'+id+'/resume', {method:'POST'});
  if (r && r.ok) { showToast('▶ 전략 재개'); fetchGridStrategies(); }
};

window.dashStopGrid = function(id) {
  if (!confirm('그리드 전략을 삭제하시겠습니까?')) return;
  if (typeof stopGrid === 'function') stopGrid(id);
};

window.stopGrid = async function(id) {
  if (!confirm('전략을 종료할까요? 진행 중인 주문은 유지됩니다.')) return;
  const r = await authFetch('/grid/strategies/'+id+'/stop', {method:'POST'});
  if (r && r.ok) {
    showToast('⏹ 전략 종료');
    closeCreateGrid();
    window._editingGridId = null;
    fetchGridStrategies();
  }
};

window.viewGridOrders = async function(id) {
  const el = document.getElementById('grid-orders-'+id);
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  const r = await authFetch('/grid/strategies/'+id+'/orders');
  if (!r) return;
  const d = await r.json();

  const statusInfo = {
    'WAITING':      { color:'#666', text:'⏳ 대기중', bg:'rgba(100,100,100,0.1)' },
    'BUY_ORDERED':  { color:'#60a5fa', text:'📋 매수주문', bg:'rgba(96,165,250,0.1)' },
    'BUY_FILLED':   { color:'#f59e0b', text:'✅ 매수완료', bg:'rgba(245,158,11,0.1)' },
    'SELL_ORDERED': { color:'#a78bfa', text:'📋 매도주문', bg:'rgba(167,139,250,0.1)' },
    'SELL_FILLED':  { color:'#4ade80', text:'💰 매도완료', bg:'rgba(74,222,128,0.1)' },
    'CANCELLED':    { color:'#555', text:'❌ 취소', bg:'rgba(100,100,100,0.05)' },
  };

  var total = d.orders.length;
  var waiting = d.orders.filter(o => o.status === 'WAITING').length;
  var buyOrdered = d.orders.filter(o => o.status === 'BUY_ORDERED').length;
  var buyFilled = d.orders.filter(o => o.status === 'BUY_FILLED').length;
  var sellOrdered = d.orders.filter(o => o.status === 'SELL_ORDERED').length;
  var sellFilled = d.orders.filter(o => o.status === 'SELL_FILLED').length;
  var totalProfit = d.orders.reduce(function(acc, o) { return acc + o.profit; }, 0);

  var summaryHtml =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
    '<div class="pos-item"><div class="pos-item-label">⏳ 대기</div><div class="pos-item-val">' + waiting + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">📋 매수주문</div><div class="pos-item-val" style="color:#60a5fa">' + buyOrdered + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">✅ 매수완료</div><div class="pos-item-val" style="color:#f59e0b">' + buyFilled + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">📋 매도주문</div><div class="pos-item-val" style="color:#a78bfa">' + sellOrdered + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">💰 매도완료</div><div class="pos-item-val" style="color:#4ade80">' + sellFilled + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">💵 누적수익</div><div class="pos-item-val ' + (totalProfit>=0?'pnl-plus':'pnl-minus') + '">' + (totalProfit>=0?'+':'') + Number(totalProfit).toLocaleString() + '원</div></div>' +
    '</div>';

  var ordersHtml = d.orders.map(function(o) {
    var si = statusInfo[o.status] || statusInfo['WAITING'];
    var profitHtml = o.profit > 0
      ? '<span class="pnl-plus" style="font-size:12px;font-weight:700">+' + Number(o.profit).toLocaleString() + '원</span>'
      : '';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:6px;background:' + si.bg + ';border-radius:8px;border:1px solid var(--border2)">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:11px;color:var(--text3);min-width:20px;text-align:center;font-weight:700">#' + o.grid_level + '</div>' +
        '<div>' +
          '<div style="font-size:12px;font-weight:700;color:var(--text)">' +
            '<span style="color:#60a5fa">매수</span> ' + Number(o.buy_price).toLocaleString() + '원 → ' +
            '<span style="color:#f87171">매도</span> ' + Number(o.sell_price).toLocaleString() + '원' +
          '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">' +
            Number(o.amount_krw).toLocaleString() + '원' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:12px;font-weight:700;color:' + si.color + '">' + si.text + '</div>' +
        profitHtml +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div style="border-top:1px solid var(--border2);padding-top:12px;margin-top:4px">' +
    summaryHtml +
    '<div style="max-height:320px;overflow-y:auto;padding-right:4px">' +
    ordersHtml +
    '</div></div>';
  el.style.display = 'block';
};

window.deleteGrid = async function(id) {
  if (!confirm('전략과 모든 주문 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return;
  const r = await authFetch('/grid/strategies/'+id+'/delete', {method:'DELETE'});
  if (!r) return;
  const d = await r.json();
  if (r.ok) { showToast('🗑 전략 삭제 완료'); fetchGridStrategies(); }
  else showToast('❌ ' + (d.detail || '삭제 실패'));
};

window.editGrid = function(id) {
  var form = document.getElementById('grid-create-form');
  if (window._editingGridId === id && form.style.display !== 'none') {
    closeCreateGrid();
    return;
  }
  window._editingGridId = id;
  authFetch('/grid/strategies').then(r => r.json()).then(d => {
    const s = d.strategies.find(x => x.id === id);
    if (!s) return;
    form.style.display = 'block';
    var titleEl = document.getElementById('grid-form-title');
    if (titleEl) titleEl.textContent = '그리드 전략 수정';
    document.getElementById('grid-exchange').value = s.exchange;
    document.getElementById('grid-symbol').value = s.symbol;
    document.getElementById('grid-symbol-search').value = s.symbol;
    document.getElementById('grid-base-price').value = s.base_price;
    document.getElementById('grid-range-pct').value = s.range_pct;
    document.getElementById('grid-count').value = s.grid_count;
    document.getElementById('grid-amount').value = s.amount_per_grid;
    document.getElementById('grid-profit-gap').value = s.profit_gap;
    const btn = document.querySelector('#grid-create-form button[onclick="submitCreateGrid()"]');
    if (btn) {
      btn.textContent = '✅ 전략 수정 저장';
      btn.onclick = function() { submitEditGrid(id); };
    }
    updateGridPreview();
    form.scrollIntoView({behavior:'smooth'});
  });
};

window.submitEditGrid = async function(id) {
  const exchange = document.getElementById('grid-exchange').value;
  const symbol = document.getElementById('grid-symbol').value.trim().toUpperCase();
  const basePrice = parseFloat(document.getElementById('grid-base-price').value);
  const rangePct = parseFloat(document.getElementById('grid-range-pct').value);
  const gridCount = parseInt(document.getElementById('grid-count').value);
  const amount = parseFloat(document.getElementById('grid-amount').value);
  const profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1;
  const msgEl = document.getElementById('grid-create-msg');
  if (!symbol || !basePrice || !rangePct || !gridCount || !amount) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '모든 항목을 입력하세요'; return;
  }
  const r = await authFetch('/grid/strategies/'+id, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({exchange, symbol, base_price: basePrice, range_pct: rangePct,
      grid_count: gridCount, amount_per_grid: amount, profit_gap: profitGap})
  });
  if (!r) return;
  const d = await r.json();
  if (r.ok) {
    msgEl.style.color = '#4ade80';
    msgEl.textContent = '✅ 수정 완료!';
    setTimeout(() => { closeCreateGrid(); fetchGridStrategies(); }, 1500);
  } else {
    msgEl.style.color = '#f87171';
    var _me = d.detail; msgEl.textContent = Array.isArray(_me) ? _me.map(function(e){return e.msg||e.message||JSON.stringify(e);}).join(' / ') : (typeof _me==='string'?_me:'수정 실패');
  }
};

window.closeCreateRebal = function() {
  document.getElementById('rebal-create-form').style.display = 'none';
  var rp = document.getElementById('rebal-right-panel');
  if (rp) rp.style.display = 'none';
  _rebalAssets = [];
};

window.openCreateRebal = function() {
  _rebalAssets = [];
  _rebalMethod = 'BOTH';
  _rebalThreshold = 5;
  document.getElementById('rebal-create-form').style.display = 'block';
  var rp = document.getElementById('rebal-right-panel');
  if (rp) rp.style.display = 'flex';
  renderRebalAssets();
  updateRebalTriggerUI();
  setRebalMethod('BOTH');
  setRebalThreshold(5);
  document.getElementById('rebal-create-form').scrollIntoView({behavior:'smooth'});
  updateRebalSummary();
};

window.searchRebalSymbol = function(query) {
  var dropdown = document.getElementById('rebal-symbol-dropdown');
  if (!query || query.length < 1) { dropdown.style.display = 'none'; return; }
  var q = query.toLowerCase();
  var filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q);
  }).slice(0, 15);
  if (!filtered.length) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = filtered.map(function(s) {
    var mkt = s.market.replace('KRW-','');
    var kname = s.korean_name || mkt;
    var price = Number(s.trade_price).toLocaleString();
    var div = document.createElement('div');
    div.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center';
    div.innerHTML = '<div><span style="font-weight:700;font-size:13px">' + kname + '</span><span style="font-size:11px;color:var(--text3);margin-left:8px">' + mkt + '</span></div><span style="font-size:12px;color:var(--accent)">' + price + '원</span>';
    div.onclick = function() { selectRebalSymbol(s.market, kname); };
    return div.outerHTML;
  }).join('');
  dropdown.style.display = 'block';
};

window.selectRebalSymbol = function(market, kname) {
  document.getElementById('rebal-add-symbol').value = kname + ' (' + market.replace('KRW-','') + ')';
  document.getElementById('rebal-add-symbol').dataset.market = market;
  document.getElementById('rebal-symbol-dropdown').style.display = 'none';
  var pctEl = document.getElementById('rebal-add-pct');
  if (pctEl) { pctEl.focus(); pctEl.select(); }
};

window.fetchRebalStrategies = async function() {
  var r = await authFetch('/rebalancing/strategies');
  if (!r) return;
  var d = await r.json();
  var el = document.getElementById('rebal-strategy-list');
  if (!el) return;
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="height:126px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
      '<div style="font-size:13px;font-weight:700;color:#FFFFFF">실행 중인 리밸런싱 전략이 없습니다</div>' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.36)">프리셋을 선택하거나 새 전략을 만들어 시작하세요</div>' +
      '<button onclick="openCreateRebal()" style="height:28px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:2px">+ 새 전략 만들기</button>' +
    '</div>';
    return;
  }
  el.innerHTML = d.strategies.map(function(s) {
    var statusColor = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : '#4B5563';
    var statusText = s.status === 'ACTIVE' ? '● 실행 중' : s.status === 'PAUSED' ? '● 일시정지' : '● 종료';
    var triggerText = s.trigger_type === 'INTERVAL' ? s.interval_hours + 'h마다'
      : s.trigger_type === 'THRESHOLD' ? s.threshold_pct + '%p 이탈'
      : s.interval_hours + 'h / ' + s.threshold_pct + '%p';
    var methodText = s.rebal_method === 'BUY_ONLY' ? '매수만' : s.rebal_method === 'NEW_FUND' ? '신규자금 우선' : '매수+매도';
    var assetCount = s.assets ? s.assets.length : 0;
    var totalWeight = s.assets ? s.assets.reduce(function(sum, a) { return sum + (a.target_pct || 0); }, 0) : 0;
    var primaryBtn = '';
    if (s.status === 'ACTIVE') primaryBtn = '<button onclick="pauseRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">일시정지</button><button onclick="deleteRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>';
    else if (s.status === 'PAUSED') primaryBtn = '<button onclick="resumeRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">재개</button><button onclick="deleteRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>';
    else if (s.status === 'STOPPED') primaryBtn = '<button onclick="deleteRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">삭제</button>';
    var stopBtnHtml = s.status === 'PAUSED' ? '<button onclick="stopRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">종료</button>' : '';
    var rebalNowBtn = s.status === 'ACTIVE' ? '<button onclick="rebalNow('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(59,130,246,0.3);background:rgba(59,130,246,0.10);color:#3B82F6;cursor:pointer">즉시실행</button>' : '';
    return '<div style="height:96px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);padding:12px 14px;margin-bottom:10px;box-sizing:border-box">' +
      '<div style="display:grid;grid-template-columns:1.6fr 0.8fr 0.8fr 0.8fr auto;align-items:center;gap:10px;height:100%">' +
        '<div>' +
          '<div style="font-size:12px;font-weight:700;color:#FFFFFF">' + s.name + ' <span style="font-size:9px;color:rgba(255,255,255,0.38)">' + s.exchange.toUpperCase() + ' · ' + methodText + '</span></div>' +
          '<div style="font-size:10px;font-weight:700;color:' + statusColor + ';margin-top:2px">' + statusText + '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">종목 수</div>' +
          '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + assetCount + '개</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">총 비중</div>' +
          '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + totalWeight.toFixed(0) + '%</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">주기/조건</div>' +
          '<div style="font-size:10px;font-weight:600;color:#D1D5DB">' + triggerText + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;flex-direction:column">' + primaryBtn + stopBtnHtml + rebalNowBtn + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
};

window.submitCreateRebal = async function() {
  var errors = validateRebalForm();
  if (errors.length > 0) { showToast('❌ ' + errors[0]); return; }

  var msgEl = document.getElementById('rebal-create-msg');
  var submitBtn = document.getElementById('rebal-submit-btn');

  var exchange = (document.getElementById('rebal-exchange') || {}).value || 'upbit';
  var name = (document.getElementById('rebal-name') || {}).value || '내 포트폴리오';
  var trigger = (document.getElementById('rebal-trigger') || {}).value || 'INTERVAL';
  var intervalEl = document.getElementById('rebal-interval-select');
  var interval = parseFloat(intervalEl ? (intervalEl.value === 'custom' ? (document.getElementById('rebal-interval') || {}).value : intervalEl.value) : 24) || 24;
  var threshold = parseFloat((document.getElementById('rebal-threshold') || {}).value) || 5;
  var minOrder = parseFloat((document.getElementById('rebal-min-order') || {}).value) || 10000;
  var maxAdjustPct = parseFloat((document.getElementById('rebal-max-adjust-pct') || {}).value) || 25;
  var assetMax = parseFloat((document.getElementById('rebal-asset-max') || {}).value) || 80;
  var assetMin = parseFloat((document.getElementById('rebal-asset-min') || {}).value) || 5;
  var dailyCount = parseInt((document.getElementById('rebal-daily-count') || {}).value) || 10;

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '저장 중...'; }

  var r = await authFetch('/rebalancing/strategies', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      exchange: exchange,
      name: name,
      trigger_type: trigger,
      interval_hours: interval,
      threshold_pct: threshold,
      assets: _rebalAssets,
      rebal_method: _rebalMethod || 'BOTH',
      min_order_krw: minOrder,
      max_adjust_pct: maxAdjustPct,
      asset_max_pct: assetMax,
      asset_min_pct: assetMin,
      daily_max_count: dailyCount
    })
  });

  if (!r) {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '전략 시작'; updateRebalSummary(); }
    return;
  }
  var d = await r.json();
  if (r.ok) {
    if (msgEl) { msgEl.style.color = '#4ade80'; msgEl.textContent = '✅ 전략이 시작되었습니다!'; }
    showToast('✅ 리밸런싱 전략 시작');
    setTimeout(function() { closeCreateRebal(); if (typeof fetchRebalStrategies === 'function') fetchRebalStrategies(); }, 1500);
  } else {
    if (msgEl) { msgEl.style.color = '#f87171'; msgEl.textContent = '❌ ' + (d.detail || '생성 실패'); }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '전략 시작'; updateRebalSummary(); }
  }
};

window.searchBTSymbol = function(query) {
  var dropdown = document.getElementById('bt-symbol-dropdown');
  if (!query) { dropdown.style.display = 'none'; return; }
  var q = query.toLowerCase();
  var filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q);
  }).slice(0, 15);
  if (!filtered.length) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = filtered.map(function(s) {
    return '<div data-market="' + s.market + '" data-price="' + s.trade_price + '" ' +
      'onclick="selectBTSymbol(this)" ' +
      'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between">' +
      '<div><span style="font-weight:700">' + (s.korean_name||s.market) + '</span>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + s.market.replace('KRW-','') + '</span></div>' +
      '<span style="color:var(--accent)">' + Number(s.trade_price).toLocaleString() + '원</span>' +
      '</div>';
  }).join('');
  dropdown.style.display = 'block';
};

window.selectBTSymbol = function(el) {
  var market = el.getAttribute('data-market');
  var price = parseFloat(el.getAttribute('data-price'));
  document.getElementById('bt-symbol').value = market;
  document.getElementById('bt-symbol-search').value = market.replace('KRW-','');
  document.getElementById('bt-base-price').value = price;
  document.getElementById('bt-symbol-dropdown').style.display = 'none';
  var fee = parseFloat(document.getElementById('bt-fee').value) / 100 || 0.0005;
  var minGap = Math.ceil(price * fee * 2 * 1.5);
  document.getElementById('bt-profit-gap').value = minGap;
  document.getElementById('bt-gap-hint').textContent = '권장 최소 간격: ' + minGap + '원 (수수료 손익분기 기준)';
};

window.fetchBTHistory = async function() {
  var r = await authFetch('/backtest/history');
  if (!r) return;
  var d = await r.json();
  var el = document.getElementById('bt-history-list');
  if (!d.history || !d.history.length) {
    el.innerHTML = '<div style="padding:20px 16px;text-align:center"><div style="font-size:24px;margin-bottom:8px">🔬</div><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px">백테스트 기록이 없습니다</div><div style="font-size:11px;color:var(--text3)">실행하면 결과가 여기에 저장됩니다</div></div>';
    return;
  }
  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;min-width:600px;font-size:11px">' +
    '<thead><tr><th>코인</th><th>기간</th><th>수익</th><th>수익률</th><th>Buy&Hold</th><th>거래수</th><th>MDD</th><th>날짜</th></tr></thead>' +
    '<tbody>' + d.history.map(function(h) {
      var pc = h.profit_pct >= 0 ? '#4ade80' : '#f87171';
      var sign = h.profit_pct >= 0 ? '+' : '';
      return '<tr>' +
        '<td style="font-weight:700">' + h.symbol.replace('KRW-','') + '</td>' +
        '<td>' + h.period_days + '일</td>' +
        '<td style="color:'+pc+';font-weight:700">' + sign + Number(h.total_profit).toLocaleString() + '원</td>' +
        '<td style="color:'+pc+'">' + sign + h.profit_pct + '%</td>' +
        '<td style="color:' + (h.buy_hold_pct>=0?'#4ade80':'#f87171') + '">' + (h.buy_hold_pct>=0?'+':'') + h.buy_hold_pct + '%</td>' +
        '<td>' + h.total_trades + '회</td>' +
        '<td style="color:#f87171">-' + h.mdd + '%</td>' +
        '<td style="color:var(--text3)">' + h.created_at.substring(0,10) + '</td>' +
        '</tr>';
    }).join('') + '</tbody></table></div>';
};

window.runBacktest = async function() {
  var symbol = document.getElementById('bt-symbol').value.trim().toUpperCase();
  var period = parseInt(document.getElementById('bt-period').value);
  var basePrice = parseFloat(document.getElementById('bt-base-price').value);
  var rangePct = parseFloat(document.getElementById('bt-range-pct').value);
  var gridCount = parseInt(document.getElementById('bt-grid-count').value);
  var amount = parseFloat(document.getElementById('bt-amount').value);
  var profitGap = parseFloat(document.getElementById('bt-profit-gap').value) || 1;
  var fee = parseFloat(document.getElementById('bt-fee').value) / 100 || 0.0005;

  if (!symbol) { showToast('❌ 코인을 선택하세요'); return; }
  if (!basePrice || !rangePct || !amount) { showToast('❌ 모든 항목을 입력하세요'); return; }

  var minGap = basePrice * fee * 2;
  if (profitGap < minGap) {
    var msg = '⚠️ 매도 간격('+profitGap+'원)이 수수료 손익분기('+minGap.toFixed(2)+'원)보다 작습니다.\n권장 간격: ' + Math.ceil(minGap * 1.5) + '원 이상\n계속 진행할까요?';
    if (!confirm(msg)) return;
  }

  document.getElementById('bt-loading').style.display = 'block';
  document.getElementById('bt-result').style.display = 'none';

  var r = await authFetch('/backtest/grid', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      symbol, period_days: period, base_price: basePrice,
      range_pct: rangePct, grid_count: gridCount,
      amount_per_grid: amount, profit_gap: profitGap, fee_rate: fee
    })
  });
  document.getElementById('bt-loading').style.display = 'none';
  if (!r) return;
  var d = await r.json();
  if (!r.ok) { showToast('❌ ' + (d.detail||'백테스트 실패')); return; }
  var _btEg = document.getElementById('bt-empty-guide'); if(_btEg) _btEg.style.display='none';
  showBTResult(d);
  fetchBTHistory();
};

window.pauseRebal = async function(id) {
  var r = await authFetch('/rebalancing/strategies/'+id+'/pause', {method:'POST'});
  if (r && r.ok) { showToast('⏸ 리밸런싱 일시정지'); fetchRebalStrategies(); }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'일시정지 실패')); }
};

window.resumeRebal = async function(id) {
  var r = await authFetch('/rebalancing/strategies/'+id+'/resume', {method:'POST'});
  if (r && r.ok) { showToast('▶ 리밸런싱 재개'); fetchRebalStrategies(); }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'재개 실패')); }
};

window.stopRebal = async function(id) {
  if (!confirm('리밸런싱 전략을 종료할까요?')) return;
  var r = await authFetch('/rebalancing/strategies/'+id, {method:'DELETE'});
  if (r && r.ok) { showToast('⏹ 전략 종료'); fetchRebalStrategies(); }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'종료 실패')); }
};

window.deleteRebal = async function(id) {
  if (!confirm('리밸런싱 전략을 완전히 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return;
  var stopR = await authFetch('/rebalancing/strategies/'+id, {method:'DELETE'});
  if (stopR && !stopR.ok) {
    var sd = await stopR.json().catch(function(){return{};});
    var msg = sd.detail || '';
    if (msg !== '전략을 찾을 수 없습니다' && msg !== 'Strategy not found') {
      showToast('❌ 종료 실패: ' + (msg || '알 수 없는 오류'));
      return;
    }
  }
  var r = await authFetch('/rebalancing/strategies/'+id+'/delete', {method:'DELETE'});
  if (r && r.ok) { showToast('🗑 전략 삭제 완료'); fetchRebalStrategies(); }
  else if (r) { var d=await r.json().catch(function(){return{};}); showToast('❌ '+(d.detail||'삭제 실패')); }
};

window.rebalNow = async function(id) {
  if (!confirm('지금 즉시 리밸런싱을 실행할까요?')) return;
  var r = await authFetch('/rebalancing/strategies/'+id+'/rebalance-now', {method:'POST'});
  if (r && r.ok) { showToast('🔄 즉시 리밸런싱 실행됨'); fetchRebalStrategies(); }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'즉시실행 실패')); }
};
