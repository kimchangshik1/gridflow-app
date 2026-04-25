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

function _gridFormatPrice(price) {
  if (!isFinite(price) || price <= 0) return '-';
  return Number(price).toLocaleString() + ((window._lang === 'ko') ? '원' : ' KRW');
}

function _gridResolveSelectedPrice(symbol) {
  if (!symbol) return 0;
  var list = [];
  if (Array.isArray(window._symbols)) list = window._symbols;
  else if (typeof _symbols !== 'undefined' && Array.isArray(_symbols)) list = _symbols;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item && item.market === symbol) {
      var price = parseFloat(item.trade_price);
      return isFinite(price) && price > 0 ? price : 0;
    }
  }
  return 0;
}

window._dcaStrategyCache = window._dcaStrategyCache || {};
window._rebalStrategyCache = window._rebalStrategyCache || {};
window.__strategyDeepLinkState = window.__strategyDeepLinkState || {
  requestSeq: 0,
  pending: null,
  pendingRetryFrame: 0,
  renderSeq: {
    grid: 0,
    dca: 0,
    rebal: 0
  },
  highlightTimer: 0,
  activeCard: null
};
if (!window.__strategyDeepLinkState.renderSeq || typeof window.__strategyDeepLinkState.renderSeq !== 'object') {
  window.__strategyDeepLinkState.renderSeq = { grid: 0, dca: 0, rebal: 0 };
}
if (typeof window.__strategyDeepLinkState.requestSeq !== 'number') window.__strategyDeepLinkState.requestSeq = 0;
if (typeof window.__strategyDeepLinkState.pendingRetryFrame !== 'number') window.__strategyDeepLinkState.pendingRetryFrame = 0;
if (!('pending' in window.__strategyDeepLinkState)) window.__strategyDeepLinkState.pending = null;

window.__strategyDeepLinkNormalizeType = function(type) {
  var raw = String(type || '').toLowerCase();
  if (raw === 'dca' || raw === 'rebal' || raw === 'grid') return raw;
  return 'grid';
};

window.__strategyDeepLinkGetCard = function(type, id) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var key = id == null ? '' : String(id);
  if (!key) return null;
  var cards = document.querySelectorAll('[data-strategy-card="1"][data-strategy-type="' + normalizedType + '"]');
  for (var i = 0; i < cards.length; i += 1) {
    if (String(cards[i].getAttribute('data-strategy-id') || '') === key) return cards[i];
  }
  var detailEl = document.getElementById(normalizedType + '-orders-' + key);
  return detailEl && detailEl.parentElement ? detailEl.parentElement : null;
};

window.__strategyDeepLinkCancelRetry = function() {
  var state = window.__strategyDeepLinkState;
  if (!state.pendingRetryFrame) return;
  cancelAnimationFrame(state.pendingRetryFrame);
  state.pendingRetryFrame = 0;
};

window.__strategyDeepLinkSetPending = function(type, id, source) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var key = id == null ? '' : String(id);
  var state = window.__strategyDeepLinkState;
  window.__strategyDeepLinkCancelRetry();
  if (!key) {
    state.pending = null;
    return null;
  }
  state.requestSeq += 1;
  state.pending = {
    seq: state.requestSeq,
    type: normalizedType,
    id: key,
    source: source || ''
  };
  return state.pending;
};

window.__strategyDeepLinkClearPending = function(type, id) {
  var state = window.__strategyDeepLinkState;
  var pending = state.pending;
  if (!pending) {
    window.__strategyDeepLinkCancelRetry();
    return;
  }
  if (type && pending.type !== window.__strategyDeepLinkNormalizeType(type)) return;
  if (id != null && String(pending.id) !== String(id)) return;
  state.pending = null;
  window.__strategyDeepLinkCancelRetry();
};

window.__strategyDeepLinkBeginRender = function(type) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var state = window.__strategyDeepLinkState;
  state.renderSeq[normalizedType] = (state.renderSeq[normalizedType] || 0) + 1;
  return state.renderSeq[normalizedType];
};

window.__strategyDeepLinkIsLatestRender = function(type, seq) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var state = window.__strategyDeepLinkState;
  return (state.renderSeq[normalizedType] || 0) === seq;
};

window.__strategyDeepLinkClearHighlight = function(card) {
  var target = card || window.__strategyDeepLinkState.activeCard;
  if (!target || !target.__gfStrategyDeepLinkPrev) return;
  var prev = target.__gfStrategyDeepLinkPrev;
  target.style.outline = prev.outline;
  target.style.outlineOffset = prev.outlineOffset;
  target.style.borderColor = prev.borderColor;
  target.style.boxShadow = prev.boxShadow;
  target.style.transition = prev.transition;
  delete target.__gfStrategyDeepLinkPrev;
  if (window.__strategyDeepLinkState.activeCard === target) {
    window.__strategyDeepLinkState.activeCard = null;
  }
};

window.__strategyDeepLinkFocusCard = function(card) {
  if (!card) return;
  var state = window.__strategyDeepLinkState;
  if (state.highlightTimer) {
    clearTimeout(state.highlightTimer);
    state.highlightTimer = 0;
  }
  if (state.activeCard && state.activeCard !== card) {
    window.__strategyDeepLinkClearHighlight(state.activeCard);
  }

  if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
  if (typeof card.scrollIntoView === 'function') {
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }
  try {
    card.focus({ preventScroll: true });
  } catch (e) {
    try { card.focus(); } catch (ignored) {}
  }

  if (!card.__gfStrategyDeepLinkPrev) {
    card.__gfStrategyDeepLinkPrev = {
      outline: card.style.outline,
      outlineOffset: card.style.outlineOffset,
      borderColor: card.style.borderColor,
      boxShadow: card.style.boxShadow,
      transition: card.style.transition
    };
  }
  card.style.transition = 'outline-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease';
  card.style.outline = '2px solid rgba(245,158,11,0.92)';
  card.style.outlineOffset = '2px';
  card.style.borderColor = 'rgba(245,158,11,0.7)';
  card.style.boxShadow = '0 0 0 1px rgba(245,158,11,0.24), 0 0 0 6px rgba(245,158,11,0.12)';
  state.activeCard = card;
  state.highlightTimer = setTimeout(function() {
    window.__strategyDeepLinkClearHighlight(card);
    state.highlightTimer = 0;
  }, 1600);
};

window.__strategyDeepLinkConsumePending = function(type, renderSeq, allowRetry) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var state = window.__strategyDeepLinkState;
  var pending = state.pending;
  if (!pending || pending.type !== normalizedType || !pending.id) return false;
  if (renderSeq && !window.__strategyDeepLinkIsLatestRender(normalizedType, renderSeq)) return false;

  var card = window.__strategyDeepLinkGetCard(normalizedType, pending.id);
  if (card && (!('isConnected' in card) || card.isConnected)) {
    window.__strategyDeepLinkFocusCard(card);
    window.__strategyDeepLinkClearPending(normalizedType, pending.id);
    return true;
  }

  if (allowRetry) {
    window.__strategyDeepLinkClearPending(normalizedType, pending.id);
    return false;
  }

  window.__strategyDeepLinkCancelRetry();
  state.pendingRetryFrame = requestAnimationFrame(function() {
    state.pendingRetryFrame = 0;
    window.__strategyDeepLinkConsumePending(normalizedType, renderSeq, true);
  });
  return false;
};

window.__strategyDeepLinkFinalizeRender = function(type, renderSeq) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var state = window.__strategyDeepLinkState;
  var pending = state.pending;
  if (!pending || pending.type !== normalizedType || !pending.id) return false;
  if (!window.__strategyDeepLinkIsLatestRender(normalizedType, renderSeq)) return false;
  window.__strategyDeepLinkCancelRetry();
  state.pendingRetryFrame = requestAnimationFrame(function() {
    state.pendingRetryFrame = 0;
    window.__strategyDeepLinkConsumePending(normalizedType, renderSeq, false);
  });
  return true;
};

window.openStrategyDeepLink = function(type, id, source) {
  var normalizedType = window.__strategyDeepLinkNormalizeType(type);
  var key = id == null ? '' : String(id);
  if (!key) {
    window.__strategyDeepLinkClearPending();
    return Promise.resolve(false);
  }

  window.__strategyDeepLinkSetPending(normalizedType, key, source);

  if (typeof switchGrid === 'function') switchGrid();
  if (typeof switchGridTab === 'function') switchGridTab(normalizedType);
  return Promise.resolve(true);
};

window._formatStrategyTimestamp = function(raw) {
  if (!raw) return '-';
  var dt = new Date(raw);
  if (isNaN(dt.getTime())) return String(raw).substring(0, 16);
  return dt.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

window.updateGridCurrentPriceCard = function() {
  var panel = document.getElementById('grid-right-panel');
  if (!panel) return;

  var card = document.getElementById('grid-current-price-card');
  if (!card) {
    panel.insertAdjacentHTML('afterbegin',
      '<div id="grid-current-price-card" style="border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);padding:14px">' +
        '<div style="font-size:13px;font-weight:700;color:#FFFFFF;margin-bottom:10px">선택한 코인 현재가</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px">' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.38);margin-bottom:2px">선택 코인</div>' +
            '<div id="grid-current-price-symbol" style="font-size:12px;font-weight:700;color:#D1D5DB;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">-</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.38);margin-bottom:2px">현재가</div>' +
            '<div id="grid-current-price-value" style="font-size:18px;font-weight:800;color:#F59E0B">-</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    card = document.getElementById('grid-current-price-card');
    var nextCard = card ? card.nextElementSibling : null;
    if (nextCard && nextCard.style) nextCard.style.marginBottom = '0';
  }

  var symbol = (document.getElementById('grid-symbol') || {}).value || '';
  var symbolSearch = (document.getElementById('grid-symbol-search') || {}).value || '';
  var displaySymbol = symbolSearch || symbol || '-';
  var price = symbol ? _gridResolveSelectedPrice(symbol) : 0;
  var symbolEl = document.getElementById('grid-current-price-symbol');
  var priceEl = document.getElementById('grid-current-price-value');
  if (symbolEl) symbolEl.textContent = symbol ? displaySymbol : '-';
  if (priceEl) priceEl.textContent = _gridFormatPrice(price);
  if (card) card.style.opacity = symbol ? '1' : '0.78';
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

  updateGridCurrentPriceCard();
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
  updateGridSummaryPanel();
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

window.fetchGridStrategies = async function() {
  var renderSeq = window.__strategyDeepLinkBeginRender('grid');
  var r = await authFetch('/grid/strategies');
  if (!r) return;
  var d = await r.json();
  if (!window.__strategyDeepLinkIsLatestRender('grid', renderSeq)) return;

  window._strategies = Array.isArray(d.strategies) ? d.strategies : [];
  var el = document.getElementById('grid-strategy-list');
  if (!el) return;

  function fmtKrw(v) {
    return Number(v || 0).toLocaleString('ko-KR') + '원';
  }
  function metricItem(label, value) {
    return '<div class="pos-item grid-card-metric">' +
      '<div class="pos-item-label">' + label + '</div>' +
      '<div class="pos-item-val" title="' + value + '">' + value + '</div>' +
    '</div>';
  }
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="padding:32px 16px;text-align:center"><div style="font-size:28px;margin-bottom:10px">⚡</div><div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:6px">실행 중인 전략이 없습니다</div><div style="font-size:11px;color:var(--text3);margin-bottom:14px">새 전략을 만들어 자동매매를 시작하세요</div><button onclick="openCreateGrid()" style="background:var(--accent);color:#1a1200;border:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">+ 새 전략 만들기</button></div>';
    window.__strategyDeepLinkFinalizeRender('grid', renderSeq);
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
    var pauseBtn = s.status === 'ACTIVE' ? '<button class="btn-warn grid-card-btn" onclick="pauseGrid(' + s.id + ')">⏸ 정지</button>' : '';
    var resumeBtn = s.status === 'PAUSED' ? '<button class="btn-warn grid-card-btn" onclick="resumeGrid(' + s.id + ')">▶ 재개</button>' : '';
    var stopBtn = s.status !== 'STOPPED' ? '<button class="btn-danger grid-card-btn" onclick="stopGrid(' + s.id + ')">⏹ 종료</button>' : '';
    var deleteBtn = s.status === 'STOPPED' ? '<button class="btn-danger grid-card-btn" onclick="deleteGrid(' + s.id + ')">🗑 삭제</button>' : '';
    var editBtn = s.status === 'PAUSED' ? '<button class="grid-card-btn grid-card-btn-edit" onclick="editGrid(' + s.id + ')">✏️ 수정</button>' : '';
    var ordersBtn = '<button class="grid-card-btn grid-card-btn-neutral" onclick="viewGridOrders(' + s.id + ')">📋 자세히</button>';
    var bottomActionBtns = pauseBtn + stopBtn + ordersBtn;
    var smartDetail = '';
    if (s.smart_sell_mode === 'SPLIT' || s.smart_sell_mode === 'BOTH')
      smartDetail += '<div class="pos-item grid-card-metric"><div class="pos-item-label">분할단계</div><div class="pos-item-val">' + s.split_count + '단계 / ' + s.split_gap_pct + '%</div></div>';
    if (s.smart_sell_mode === 'TRAILING' || s.smart_sell_mode === 'BOTH')
      smartDetail += '<div class="pos-item grid-card-metric"><div class="pos-item-label">트레일링</div><div class="pos-item-val">+' + s.trailing_trigger_pct + '% / -' + s.trailing_pct + '%</div></div>';
    return '<div class="settings-card grid-strategy-card" data-strategy-card="1" data-strategy-type="grid" data-strategy-id="' + s.id + '" style="margin-bottom:12px">' +
      '<div class="grid-card-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px">' +
        '<div class="grid-card-heading">' +
        '<span class="grid-card-symbol">' + ((_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')) + '</span>' +
        '<span class="grid-card-exchange">' + s.exchange.toUpperCase() + '</span>' +
        '<span class="grid-card-status" style="color:' + statusColor + '">' + statusText + '</span>' +
        smartBadge + '</div>' +
        '<div class="grid-card-top-actions" style="display:flex;gap:4px;flex-wrap:wrap">' + resumeBtn + deleteBtn + editBtn + '</div>' +
      '</div>' +
      '<div class="grid-card-metrics" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:' + (smartDetail ? '8px' : '8px') + '">' +
        metricItem('기준가', fmtKrw(s.base_price)) +
        metricItem('범위', '±' + s.range_pct + '%') +
        metricItem('그리드', s.grid_count + '개') +
        metricItem('회차금', fmtKrw(s.amount_per_grid)) +
      '</div>' +
      (smartDetail ? '<div class="grid-card-smart" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:8px">' + smartDetail + '</div>' : '') +
      '<div class="grid-card-summary" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid var(--border2)">' +
        '<div class="grid-card-summary-meta">' +
          '<span class="grid-card-total" title="총 투자 ' + fmtKrw(s.amount_per_grid * s.grid_count) + '">총투자 ' + fmtKrw(s.amount_per_grid * s.grid_count) + '</span>' +
          '<span class="grid-card-profit ' + profitColor + '" title="누적수익 ' + profitSign + fmtKrw(s.total_profit) + '">누적수익 ' + profitSign + fmtKrw(s.total_profit) + '</span>' +
        '</div>' +
        '<div class="grid-card-bottom-actions grid-card-summary-actions" style="display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap">' + bottomActionBtns + '</div>' +
      '</div>' +
      '<div id="grid-orders-' + s.id + '" style="display:none;margin-top:12px"></div>' +
    '</div>';
  }).join('');
  window.__strategyDeepLinkFinalizeRender('grid', renderSeq);
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
  if (!confirm('전략을 종료할까요?\n종료 후에도 자세히에서 진행 기록을 계속 볼 수 있습니다.')) return;
  var r = await authFetch('/dca/strategies/' + id, {method:'DELETE'});
  if (r && r.ok) { showToast('⏹ 전략 종료'); fetchDCAStrategies(); }
};

window.deleteDCA = async function(id) {
  if (!confirm('전략을 완전히 삭제할까요?')) return;
  var r = await authFetch('/dca/strategies/' + id + '/delete', {method:'DELETE'});
  if (r && r.ok) { showToast('🗑 삭제 완료'); fetchDCAStrategies(); }
};

window._renderDCAHistoryFallback = function(strategy) {
  if (!strategy) return '';
  var hasSummary = Number(strategy.completed_rounds || 0) > 0 ||
    Number(strategy.total_invested || 0) > 0 ||
    !!strategy.last_buy_at;
  if (!hasSummary) return '';
  return '<div style="border-top:1px solid var(--border2);padding-top:10px">' +
    '<div style="font-size:11px;font-weight:700;color:#FFFFFF;margin-bottom:8px">진행 요약</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
      '<div style="min-width:92px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05)">' +
        '<div style="font-size:9px;color:rgba(255,255,255,0.34)">진행 회차</div>' +
        '<div style="margin-top:3px;font-size:11px;font-weight:700;color:#FFFFFF">' + Number(strategy.completed_rounds || 0) + '/' + Number(strategy.total_rounds || 0) + '회</div>' +
      '</div>' +
      '<div style="min-width:92px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05)">' +
        '<div style="font-size:9px;color:rgba(255,255,255,0.34)">누적 투자</div>' +
        '<div style="margin-top:3px;font-size:11px;font-weight:700;color:#FFFFFF">' + Number(strategy.total_invested || 0).toLocaleString() + '원</div>' +
      '</div>' +
      '<div style="min-width:120px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05)">' +
        '<div style="font-size:9px;color:rgba(255,255,255,0.34)">마지막 매수</div>' +
        '<div style="margin-top:3px;font-size:11px;font-weight:700;color:#FFFFFF">' + (strategy.last_buy_at ? window._formatStrategyTimestamp(strategy.last_buy_at) : '기록 없음') + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-size:10px;line-height:15px;color:rgba(255,255,255,0.42)">주문별 상세 행은 남아 있지 않지만 카드와 같은 기준의 종료 전 진행 요약은 계속 확인할 수 있습니다.</div>' +
  '</div>';
};

window.viewDCAOrders = async function(id) {
  var el = document.getElementById('dca-orders-' + id);
  if (!el) return;
  var card = el.parentElement;
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    if (card) {
      card.style.height = '92px';
      card.style.minHeight = '';
    }
    return;
  }
  if (card) {
    card.style.height = 'auto';
    card.style.minHeight = '92px';
  }
  el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">주문 기록 불러오는 중...</div>';
  el.style.display = 'block';
  var r = await authFetch('/dca/strategies/' + id + '/orders');
  if (!r) {
    el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">주문 기록을 불러오지 못했습니다</div>';
    return;
  }
  var d = await r.json().catch(function() { return {}; });
  if (!r.ok) {
    el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">주문 기록을 불러오지 못했습니다</div>';
    return;
  }
  if (!d.orders || !d.orders.length) {
    var strategy = window._dcaStrategyCache[String(id)];
    var fallbackHtml = window._renderDCAHistoryFallback(strategy);
    el.innerHTML = fallbackHtml || '<div style="padding:10px;color:var(--text3);font-size:12px">주문 기록 없음</div>';
    el.style.display = 'block';
    return;
  }
  el.innerHTML = '<div style="border-top:1px solid var(--border2);padding-top:10px;overflow-x:auto">' +
    '<table style="width:100%;min-width:400px;font-size:11px">' +
    '<thead><tr><th>회차</th><th>매수가</th><th>금액</th><th>수량</th><th>상태</th><th>시각</th></tr></thead>' +
    '<tbody>' + d.orders.map(function(o) {
      var orderStatus = o.status === 'FILLED' ? '체결' : o.status === 'SUBMITTED' ? '접수' : o.status === 'FAILED' ? '실패' : (o.status || '-');
      return '<tr>' +
        '<td style="text-align:center;font-weight:700">#' + o.round_num + '</td>' +
        '<td>' + Number(o.price).toLocaleString() + '원</td>' +
        '<td>' + Number(o.amount_krw).toLocaleString() + '원</td>' +
        '<td>' + parseFloat(o.qty).toFixed(6) + '</td>' +
        '<td>' + orderStatus + '</td>' +
        '<td style="color:var(--text3)">' + (o.created_at || '').substring(0, 16) + '</td>' +
        '</tr>';
    }).join('') + '</tbody></table></div>';
  el.style.display = 'block';
};

window.fetchDCAStrategies = async function() {
  var renderSeq = window.__strategyDeepLinkBeginRender('dca');
  var r = await authFetch('/dca/strategies');
  if (!r) return;
  var d = await r.json();
  if (!window.__strategyDeepLinkIsLatestRender('dca', renderSeq)) return;
  var el = document.getElementById('dca-strategy-list');
  if (!el) return;
  window._dcaStrategyCache = {};
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="height:132px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
      '<div style="font-size:13px;font-weight:700;color:#FFFFFF">실행 중인 분할매수 전략이 없습니다</div>' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.36)">새 전략을 저장하고 바로 시작해보세요</div>' +
      '<button onclick="openCreateDCA()" style="height:28px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:2px">+ 새 전략 만들기</button>' +
    '</div>';
    window.__strategyDeepLinkFinalizeRender('dca', renderSeq);
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
    window._dcaStrategyCache[String(s.id)] = s;
    var amberBtnStyle = 'height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer';
    var redBtnStyle = 'height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer';
    var grayBtnStyle = 'height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.52);cursor:pointer';
    var actionHtml = '';
    if (s.status === 'ACTIVE') actionHtml += '<button onclick="pauseDCA(' + s.id + ')" style="' + amberBtnStyle + '">일시정지</button>';
    if (s.status === 'PAUSED') {
      actionHtml += '<button onclick="resumeDCA(' + s.id + ')" style="' + amberBtnStyle + '">재개</button>';
      actionHtml += '<button onclick="stopDCA(' + s.id + ')" style="' + redBtnStyle + '">종료</button>';
    }
    actionHtml += '<button onclick="viewDCAOrders(' + s.id + ')" style="' + grayBtnStyle + '">자세히</button>';
    return '<div data-strategy-card="1" data-strategy-type="dca" data-strategy-id="' + s.id + '" style="height:92px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);padding:12px 14px;margin-bottom:10px;box-sizing:border-box">' +
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
        '<div style="display:flex;gap:4px;flex-direction:column">' + actionHtml + '</div>' +
      '</div>' +
      '<div id="dca-orders-' + s.id + '" style="display:none;margin-top:12px"></div>' +
    '</div>';
  }).join('');
  window.__strategyDeepLinkFinalizeRender('dca', renderSeq);
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
  var buyFilled = d.orders.filter(o => ['BUY_FILLED', 'SELL_ORDERED', 'SELL_FILLED'].indexOf(o.status) !== -1).length;
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
    var progressText = o.status === 'SELL_ORDERED'
      ? '🔄 매수체결 후 매도주문 진행 중'
      : si.text;
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
        '<div style="font-size:12px;font-weight:700;color:' + si.color + '">' + progressText + '</div>' +
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
    updateGridSummaryPanel();
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
  dropdown.innerHTML = '';
  var fragment = document.createDocumentFragment();
  filtered.forEach(function(s) {
    var mkt = s.market.replace('KRW-','');
    var kname = s.korean_name || mkt;
    var price = Number(s.trade_price).toLocaleString();
    var div = document.createElement('div');
    div.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center';
    div.innerHTML = '<div><span style="font-weight:700;font-size:13px">' + kname + '</span><span style="font-size:11px;color:var(--text3);margin-left:8px">' + mkt + '</span></div><span style="font-size:12px;color:var(--accent)">' + price + '원</span>';
    div.tabIndex = 0;
    div.onclick = function() { selectRebalSymbol(s.market, kname); };
    div.onkeydown = function(ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectRebalSymbol(s.market, kname);
      }
    };
    fragment.appendChild(div);
  });
  dropdown.appendChild(fragment);
  dropdown.style.display = 'block';
};

window.selectRebalSymbol = function(market, kname) {
  document.getElementById('rebal-add-symbol').value = kname + ' (' + market.replace('KRW-','') + ')';
  document.getElementById('rebal-add-symbol').dataset.market = market;
  document.getElementById('rebal-symbol-dropdown').style.display = 'none';
  var pctEl = document.getElementById('rebal-add-pct');
  if (pctEl) { pctEl.focus(); pctEl.select(); }
};

window._rebalActionInflight = window._rebalActionInflight || {};

window._formatRebalActionDetail = function(detail, fallback) {
  if (Array.isArray(detail)) {
    return detail.map(function(item) {
      if (typeof item === 'string') return item;
      return item && (item.msg || item.message || item.detail) ? (item.msg || item.message || item.detail) : JSON.stringify(item);
    }).filter(Boolean).join(' / ') || fallback;
  }
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (detail && typeof detail === 'object') {
    return detail.message || detail.detail || fallback;
  }
  return fallback;
};

window._setRebalActionInflight = function(id, action, enabled) {
  var key = String(id);
  if (enabled) window._rebalActionInflight[key] = action;
  else delete window._rebalActionInflight[key];

  var card = document.querySelector('[data-rebal-card-id="' + key + '"]');
  if (!card) return;
  var buttons = Array.prototype.slice.call(card.querySelectorAll('.rebal-action-btn'));
  buttons.forEach(function(btn) {
    var isActive = enabled && btn.getAttribute('data-rebal-action') === action;
    if (enabled) {
      if (!btn.dataset.baseLabel) btn.dataset.baseLabel = btn.textContent;
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = isActive ? '1' : '0.45';
      if (isActive) btn.textContent = '처리 중...';
    } else {
      btn.disabled = false;
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      if (btn.dataset.baseLabel) btn.textContent = btn.dataset.baseLabel;
    }
  });
};

window._renderRebalActionButton = function(id, action, label, styleText, handlerName) {
  var inflightAction = window._rebalActionInflight[String(id)];
  var disabled = !!inflightAction;
  var visibleLabel = inflightAction === action ? '처리 중...' : label;
  var opacity = disabled ? (inflightAction === action ? '1' : '0.45') : '1';
  var pointerEvents = disabled ? 'none' : 'auto';
  return '<button type="button" class="rebal-action-btn" data-rebal-action="' + action + '" onclick="' + handlerName + '(' + id + ')" ' +
    'style="' + styleText + ';opacity:' + opacity + ';pointer-events:' + pointerEvents + '" ' + (disabled ? 'disabled' : '') + '>' + visibleLabel + '</button>';
};

window._formatRebalLastRun = function(raw) {
  if (!raw) return '최근 실행 없음';
  var dt = new Date(raw);
  if (isNaN(dt.getTime())) return '최근 실행 없음';
  return '최근 실행 ' + dt.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

window._formatRebalTotalValue = function(raw) {
  var value = Number(raw || 0);
  if (!isFinite(value) || value <= 0) return '평가금액 미집계';
  return '평가 ' + Math.floor(value).toLocaleString('ko-KR') + '원';
};

window._formatRebalMoneyValue = function(raw, fallback) {
  var value = Number(raw || 0);
  if (!isFinite(value) || value <= 0) return fallback || '미설정';
  return Math.floor(value).toLocaleString('ko-KR') + '원';
};

window._formatRebalMethodText = function(method) {
  return method === 'BUY_ONLY' ? '매수만' : method === 'NEW_FUND' ? '신규자금 우선' : '매수+매도';
};

window._renderRebalDetailMetric = function(label, value, hint) {
  return '<div style="min-width:0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">' +
    '<div style="font-size:9px;line-height:13px;color:rgba(255,255,255,0.34)">' + label + '</div>' +
    '<div style="margin-top:4px;font-size:12px;line-height:16px;font-weight:700;color:#FFFFFF;word-break:break-word" title="' + value + '">' + value + '</div>' +
    (hint ? '<div style="margin-top:4px;font-size:9px;line-height:13px;color:rgba(255,255,255,0.34)">' + hint + '</div>' : '') +
  '</div>';
};

window._renderRebalDetailRow = function(label, value, sub) {
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05)">' +
    '<div style="flex:0 0 96px;font-size:10px;line-height:15px;color:rgba(255,255,255,0.34)">' + label + '</div>' +
    '<div style="min-width:0;flex:1;text-align:right">' +
      '<div style="font-size:11px;line-height:16px;font-weight:700;color:#FFFFFF;word-break:break-word">' + value + '</div>' +
      (sub ? '<div style="margin-top:2px;font-size:9px;line-height:13px;color:rgba(255,255,255,0.38)">' + sub + '</div>' : '') +
    '</div>' +
  '</div>';
};

window._renderRebalAdvancedSettings = function(strategy) {
  if (!strategy) return '';
  var triggerText = strategy.trigger_type === 'INTERVAL' ? strategy.interval_hours + '시간마다'
    : strategy.trigger_type === 'THRESHOLD' ? strategy.threshold_pct + '%p 이탈 시'
    : strategy.interval_hours + '시간 / ' + strategy.threshold_pct + '%p';
  var methodText = window._formatRebalMethodText(strategy.rebal_method);
  var maxAdjustParts = [];
  if (Number(strategy.max_adjust_pct || 0) > 0) maxAdjustParts.push(Number(strategy.max_adjust_pct || 0) + '%');
  if (Number(strategy.max_adjust_krw || 0) > 0) maxAdjustParts.push(window._formatRebalMoneyValue(strategy.max_adjust_krw));
  var runtimeNotes = [];
  if (strategy.rebal_method === 'NEW_FUND') runtimeNotes.push('현재 런타임 미지원');
  if (strategy.use_new_fund) runtimeNotes.push('신규 자금 자동 반영 미적용');
  var rows = [
    window._renderRebalDetailRow('실행 조건', triggerText, strategy.trigger_type === 'INTERVAL' ? 'ACTIVE 상태에서 주기 실행' : strategy.trigger_type === 'THRESHOLD' ? '목표 비중 이탈 기준' : '주기/이탈 조건 동시 사용'),
    window._renderRebalDetailRow('주문 방식', methodText, runtimeNotes.length ? runtimeNotes.join(' · ') : ''),
    window._renderRebalDetailRow('최소 주문', window._formatRebalMoneyValue(strategy.min_order_krw), '이 금액 미만 조정 주문은 건너뜁니다'),
    window._renderRebalDetailRow('최대 조정', maxAdjustParts.length ? maxAdjustParts.join(' / ') : '미설정', '한 번에 이동 가능한 비율/금액 제한'),
    window._renderRebalDetailRow('비중 한도', '최대 ' + Number(strategy.asset_max_pct || 0) + '% / 최소 ' + Number(strategy.asset_min_pct || 0) + '%'),
    window._renderRebalDetailRow('일일 제한', Number(strategy.daily_max_count || 0) + '회 / ' + window._formatRebalMoneyValue(strategy.daily_max_krw, '금액 제한 없음')),
    window._renderRebalDetailRow('오류 정지', Number(strategy.error_stop_count || 0) + '회 연속 오류 시 정지')
  ];
  return '<div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px">' +
      '<div style="font-size:11px;font-weight:700;color:#FFFFFF">고급 설정</div>' +
      '<div style="font-size:9px;color:rgba(255,255,255,0.34)">현재 저장된 전략 기준</div>' +
    '</div>' +
    rows.join('') +
  '</div>';
};

window._renderRebalDetailSummary = function(strategy) {
  if (!strategy) return '<div style="padding:10px;color:var(--text3);font-size:12px">최근 실행 내역이 없습니다</div>';
  var triggerText = strategy.trigger_type === 'INTERVAL' ? strategy.interval_hours + 'h마다'
    : strategy.trigger_type === 'THRESHOLD' ? strategy.threshold_pct + '%p 이탈'
    : strategy.interval_hours + 'h / ' + strategy.threshold_pct + '%p';
  return '<div style="border-top:1px solid var(--border2);padding-top:12px">' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
      '<div style="font-size:11px;font-weight:700;color:#FFFFFF">실행 요약</div>' +
      '<div style="font-size:9px;line-height:13px;color:rgba(255,255,255,0.38)">최근 실행과 설정을 먼저 보고, 아래에서 주문 내역을 확인하세요</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">' +
      window._renderRebalDetailMetric('최근 실행', window._formatRebalLastRun(strategy.last_rebal_at).replace('최근 실행 ', '')) +
      window._renderRebalDetailMetric('실행 횟수', Number(strategy.rebal_count || 0) + '회') +
      window._renderRebalDetailMetric('평가 금액', window._formatRebalMoneyValue(strategy.total_value_krw, '미집계')) +
      window._renderRebalDetailMetric('자동 실행', triggerText, 'ACTIVE 상태에서 자동 동작') +
    '</div>' +
    window._renderRebalAdvancedSettings(strategy) +
  '</div>';
};

window.viewRebalOrders = async function(id) {
  var el = document.getElementById('rebal-orders-' + id);
  if (!el) return;
  var card = el.parentElement;
  if (el.style.display !== 'none') {
    el.style.display = 'none';
    if (card) card.style.minHeight = '96px';
    return;
  }
  if (card) card.style.minHeight = '96px';
  el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">최근 실행 내역 불러오는 중...</div>';
  el.style.display = 'block';
  var r = await authFetch('/rebalancing/strategies/' + id + '/orders');
  if (!r) {
    el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">최근 실행 내역을 불러오지 못했습니다</div>';
    return;
  }
  var d = await r.json().catch(function() { return {}; });
  if (!r.ok) {
    el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">최근 실행 내역을 불러오지 못했습니다</div>';
    return;
  }
  var detailTop = window._renderRebalDetailSummary(window._rebalStrategyCache[String(id)]);
  if (!d.orders || !d.orders.length) {
    el.innerHTML = detailTop +
      '<div style="margin-top:12px;padding:12px;border-top:1px solid var(--border2);border-radius:0 0 12px 12px">' +
        '<div style="font-size:11px;font-weight:700;color:#FFFFFF">주문 내역</div>' +
        '<div style="margin-top:6px;font-size:10px;line-height:15px;color:rgba(255,255,255,0.42)">아직 기록된 주문이 없습니다. 다음 실행이 발생하면 이 영역에 주문 내역이 표시됩니다.</div>' +
      '</div>';
    return;
  }
  el.innerHTML = detailTop +
    '<div style="margin-top:12px;border-top:1px solid var(--border2);padding-top:12px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px">' +
        '<div style="font-size:11px;font-weight:700;color:#FFFFFF">주문 내역</div>' +
        '<div style="font-size:9px;line-height:13px;color:rgba(255,255,255,0.38)">최근 실행에서 발생한 주문을 시간순으로 확인합니다</div>' +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table style="width:100%;min-width:540px;font-size:11px">' +
          '<thead><tr><th>종목</th><th>방향</th><th>주문금액</th><th>비중 변화</th><th>상태</th><th>시각</th></tr></thead>' +
          '<tbody>' + d.orders.map(function(o) {
            var sideText = o.side === 'BUY' ? '매수' : o.side === 'SELL' ? '매도' : (o.side || '-');
            var weightText = Number(o.before_pct || 0).toFixed(1) + '% → ' + Number(o.after_pct || 0).toFixed(1) + '%';
            return '<tr>' +
              '<td>' + (o.symbol || '').replace('KRW-', '') + '</td>' +
              '<td>' + sideText + '</td>' +
              '<td>' + Number(o.amount_krw || 0).toLocaleString() + '원</td>' +
              '<td>' + weightText + ' <span style="color:var(--text3)">(목표 ' + Number(o.target_pct || 0).toFixed(1) + '%)</span></td>' +
              '<td>' + (o.status || '-') + '</td>' +
              '<td style="color:var(--text3)">' + window._formatStrategyTimestamp(o.created_at) + '</td>' +
            '</tr>';
          }).join('') + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
};

window.fetchRebalStrategies = async function() {
  var renderSeq = window.__strategyDeepLinkBeginRender('rebal');
  var r = await authFetch('/rebalancing/strategies');
  if (!r) return;
  var d = await r.json();
  if (!window.__strategyDeepLinkIsLatestRender('rebal', renderSeq)) return;
  var el = document.getElementById('rebal-strategy-list');
  if (!el) return;
  window._rebalStrategyCache = {};
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="height:126px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
      '<div style="font-size:13px;font-weight:700;color:#FFFFFF">실행 중인 리밸런싱 전략이 없습니다</div>' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.36)">프리셋을 선택하거나 새 전략을 만들어 시작하세요</div>' +
      '<button onclick="openCreateRebal()" style="height:28px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:2px">+ 새 전략 만들기</button>' +
    '</div>';
    window.__strategyDeepLinkFinalizeRender('rebal', renderSeq);
    return;
  }
  el.innerHTML = d.strategies.map(function(s) {
    var statusColor = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : '#4B5563';
    var statusText = s.status === 'ACTIVE' ? '● 실행 중' : s.status === 'PAUSED' ? '● 일시정지' : '● 종료';
    var triggerText = s.trigger_type === 'INTERVAL' ? s.interval_hours + 'h마다'
      : s.trigger_type === 'THRESHOLD' ? s.threshold_pct + '%p 이탈'
      : s.interval_hours + 'h / ' + s.threshold_pct + '%p';
    var methodText = window._formatRebalMethodText(s.rebal_method);
    var runtimeCaveats = [];
    if (s.rebal_method === 'NEW_FUND') runtimeCaveats.push('NEW_FUND 미지원');
    if (s.use_new_fund) runtimeCaveats.push('신규 자금 자동 반영 미적용');
    var assetCount = s.assets ? s.assets.length : 0;
    var totalWeight = s.assets ? s.assets.reduce(function(sum, a) { return sum + (a.target_pct || 0); }, 0) : 0;
    var lastRunText = window._formatRebalLastRun(s.last_rebal_at);
    var rebalCountText = '실행 ' + Number(s.rebal_count || 0) + '회';
    var totalValueText = window._formatRebalTotalValue(s.total_value_krw);
    var runtimeCaveatHtml = runtimeCaveats.length
      ? '<div style="margin-top:5px;font-size:9px;line-height:13px;color:#FCA5A5">주의: ' + runtimeCaveats.join(' · ') + '</div>'
      : '';
    var amberBtnStyle = 'height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer';
    var redBtnStyle = 'height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer';
    var blueBtnStyle = 'height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(59,130,246,0.3);background:rgba(59,130,246,0.10);color:#3B82F6;cursor:pointer';
    window._rebalStrategyCache[String(s.id)] = s;
    var detailBtnStyle = 'height:26px;padding:0 10px;border-radius:8px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.28);background:rgba(245,158,11,0.10);color:#F59E0B;cursor:pointer;white-space:nowrap;flex-shrink:0';
    var actionHtml = '';
    if (s.status === 'ACTIVE') actionHtml += window._renderRebalActionButton(s.id, 'pause', '일시정지', amberBtnStyle, 'pauseRebal');
    if (s.status === 'PAUSED') actionHtml += window._renderRebalActionButton(s.id, 'resume', '재개', amberBtnStyle, 'resumeRebal');
    var stopBtnHtml = s.status === 'PAUSED' ? window._renderRebalActionButton(s.id, 'stop', '종료', redBtnStyle, 'stopRebal') : '';
    var rebalNowBtn = s.status === 'ACTIVE' && s.rebal_method !== 'NEW_FUND' ? window._renderRebalActionButton(s.id, 'rebalNow', '즉시실행', blueBtnStyle, 'rebalNow') : '';
    var headerDetailBtn = '<button type="button" onclick="viewRebalOrders(' + s.id + ')" style="' + detailBtnStyle + '">자세히</button>';
    return '<div class="rebal-strategy-card" data-strategy-card="1" data-strategy-type="rebal" data-strategy-id="' + s.id + '" data-rebal-card-id="' + s.id + '" style="min-height:96px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);padding:12px 14px;margin-bottom:10px;box-sizing:border-box">' +
      '<div class="rebal-strategy-card-grid" style="display:grid;grid-template-columns:1.6fr 0.8fr 0.8fr 0.8fr auto;align-items:center;gap:10px;height:100%">' +
        '<div>' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
            '<div style="min-width:0;flex:1">' +
              '<div style="font-size:12px;font-weight:700;color:#FFFFFF;line-height:16px;word-break:break-word">' + s.name + ' <span style="font-size:9px;color:rgba(255,255,255,0.38)">' + s.exchange.toUpperCase() + ' · ' + methodText + '</span></div>' +
              '<div style="font-size:10px;font-weight:700;color:' + statusColor + ';margin-top:2px">' + statusText + '</div>' +
            '</div>' +
            headerDetailBtn +
          '</div>' +
          runtimeCaveatHtml +
          '<div style="display:flex;flex-direction:column;gap:2px;margin-top:7px;font-size:9px;line-height:13px;color:rgba(255,255,255,0.42)">' +
            '<div>' + lastRunText + '</div>' +
            '<div>' + rebalCountText + ' · ' + totalValueText + '</div>' +
            '<div>자세히에서 최근 실행, 설정, 주문 내역을 함께 확인합니다</div>' +
          '</div>' +
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
        '<div class="rebal-strategy-actions" style="display:flex;gap:4px;flex-direction:column">' + actionHtml + stopBtnHtml + rebalNowBtn + '</div>' +
      '</div>' +
      '<div id="rebal-orders-' + s.id + '" style="display:none;margin-top:12px"></div>' +
    '</div>';
  }).join('');
  window.__strategyDeepLinkFinalizeRender('rebal', renderSeq);
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
  var maxAdjustKrwRaw = (document.getElementById('rebal-max-adjust-krw') || {}).value;
  var maxAdjustKrw = maxAdjustKrwRaw === '' ? null : parseFloat(maxAdjustKrwRaw);
  var useNewFundInput = document.getElementById('rebal-use-new-fund');
  var useNewFund = !!(useNewFundInput && !useNewFundInput.disabled && useNewFundInput.checked);
  var assetMax = parseFloat((document.getElementById('rebal-asset-max') || {}).value) || 80;
  var assetMin = parseFloat((document.getElementById('rebal-asset-min') || {}).value) || 5;
  var dailyCountInput = document.getElementById('rebal-daily-count');
  var dailyCount = dailyCountInput && !dailyCountInput.disabled ? (parseInt(dailyCountInput.value) || 10) : 10;
  var dailyKrwRaw = (document.getElementById('rebal-daily-krw') || {}).value;
  var dailyKrw = dailyKrwRaw === '' ? null : parseFloat(dailyKrwRaw);
  var errorStopInput = document.getElementById('rebal-error-stop');
  var errorStopCount = errorStopInput && !errorStopInput.disabled ? (parseInt(errorStopInput.value) || 3) : 3;
  var rebalMethod = _rebalMethod === 'NEW_FUND' ? 'BOTH' : (_rebalMethod || 'BOTH');

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
      rebal_method: rebalMethod,
      min_order_krw: minOrder,
      max_adjust_pct: maxAdjustPct,
      max_adjust_krw: maxAdjustKrw,
      use_new_fund: useNewFund,
      daily_max_krw: dailyKrw,
      asset_max_pct: assetMax,
      asset_min_pct: assetMin,
      daily_max_count: dailyCount,
      error_stop_count: errorStopCount
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
  var key = String(id);
  if (window._rebalActionInflight[key]) return;
  window._setRebalActionInflight(id, 'pause', true);
  try {
    var r = await authFetch('/rebalancing/strategies/'+id+'/pause', {method:'POST'});
    if (!r) return;
    var d = await r.json().catch(function(){ return {}; });
    if (r.ok) {
      showToast('⏸ 리밸런싱 일시정지');
      await fetchRebalStrategies();
    } else {
      showToast('❌ ' + window._formatRebalActionDetail(d.detail, '일시정지 실패'));
    }
  } finally {
    window._setRebalActionInflight(id, 'pause', false);
  }
};

window.resumeRebalAction = async function(id) {
  var key = String(id);
  if (window._rebalActionInflight[key]) return;
  window._setRebalActionInflight(id, 'resume', true);
  try {
    var r = await authFetch('/rebalancing/strategies/'+id+'/resume', {method:'POST'});
    if (!r) return;
    var d = await r.json().catch(function(){ return {}; });
    if (r.ok) {
      showToast('▶ 리밸런싱 재개');
      await fetchRebalStrategies();
    } else {
      showToast('❌ ' + window._formatRebalActionDetail(d.detail, '재개 실패'));
    }
  } finally {
    window._setRebalActionInflight(id, 'resume', false);
  }
};
window.resumeRebal = window.resumeRebalAction;

window.stopRebalAction = async function(id) {
  if (window._rebalActionInflight[String(id)]) return;
  if (!confirm('리밸런싱 전략을 종료할까요?\n종료 후에도 자세히에서 최근 실행 내역을 볼 수 있습니다.')) return;
  window._setRebalActionInflight(id, 'stop', true);
  try {
    var r = await authFetch('/rebalancing/strategies/'+id, {method:'DELETE'});
    if (!r) return;
    var d = await r.json().catch(function(){ return {}; });
    if (r.ok) {
      showToast('⏹ 전략 종료');
      await fetchRebalStrategies();
    } else {
      showToast('❌ ' + window._formatRebalActionDetail(d.detail, '종료 실패'));
    }
  } finally {
    window._setRebalActionInflight(id, 'stop', false);
  }
};
window.stopRebal = window.stopRebalAction;

window.deleteRebalAction = async function(id) {
  var key = String(id);
  if (window._rebalActionInflight[key]) return;
  if (!confirm('리밸런싱 전략을 완전히 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return;
  window._setRebalActionInflight(id, 'delete', true);
  var stopSucceeded = false;
  try {
    var stopR = await authFetch('/rebalancing/strategies/'+id, {method:'DELETE'});
    if (!stopR) return;
    if (!stopR.ok) {
      var sd = await stopR.json().catch(function(){return{};});
      var stopMsg = window._formatRebalActionDetail(sd.detail, '전략 종료 실패');
      if (stopMsg !== '전략을 찾을 수 없습니다' && stopMsg !== 'Strategy not found') {
        showToast('❌ 종료 실패: ' + stopMsg);
        return;
      }
    } else {
      stopSucceeded = true;
    }
    var r = await authFetch('/rebalancing/strategies/'+id+'/delete', {method:'DELETE'});
    if (!r) {
      if (stopSucceeded) await fetchRebalStrategies();
      return;
    }
    var d = await r.json().catch(function(){return{};});
    if (r.ok) {
      showToast('🗑 전략 삭제 완료');
      await fetchRebalStrategies();
    } else {
      showToast('❌ ' + window._formatRebalActionDetail(d.detail, '삭제 실패'));
      if (stopSucceeded) await fetchRebalStrategies();
    }
  } finally {
    window._setRebalActionInflight(id, 'delete', false);
  }
};
window.deleteRebal = window.deleteRebalAction;

window.rebalNowAction = async function(id) {
  var key = String(id);
  if (window._rebalActionInflight[key]) return;
  if (!confirm('지금 즉시 리밸런싱을 실행할까요?\n설정한 주기/조건을 기다리지 않고 이번 한 번만 바로 실행합니다.')) return;
  window._setRebalActionInflight(id, 'rebalNow', true);
  try {
    var r = await authFetch('/rebalancing/strategies/'+id+'/rebalance-now', {method:'POST'});
    if (!r) return;
    var d = await r.json().catch(function(){ return {}; });
    if (r.ok) {
      showToast('🔄 ' + window._formatRebalActionDetail(d.message, '즉시 리밸런싱 실행 완료'));
      await fetchRebalStrategies();
      setTimeout(function() {
        if (!window._rebalActionInflight[key]) fetchRebalStrategies();
      }, 1200);
    } else {
      showToast('❌ ' + window._formatRebalActionDetail(d.detail, '즉시실행 실패'));
    }
  } finally {
    window._setRebalActionInflight(id, 'rebalNow', false);
  }
};
window.rebalNow = window.rebalNowAction;
