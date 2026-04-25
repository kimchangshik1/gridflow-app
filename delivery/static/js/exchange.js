'use strict';

(function(){
  if (window.__tradeSummaryInstantCacheInstalled) return;
  window.__tradeSummaryInstantCacheInstalled = true;

  var tradeSummaryCache = window.__tradeSummaryCache || {
    upbit: null,
    bithumb: null
  };
  window.__tradeSummaryCache = tradeSummaryCache;

  var seq = 0;
  window.__tradeSummarySeq = 0;

  function currentExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  function exName(exchange) {
    return exchange === 'bithumb' ? '빗썸' : '업비트';
  }

  function fmtKRW(v) {
    var n = Math.floor(Number(v || 0));
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderSummary(exchange, data, isLoading) {
    var name = exName(exchange);
    setText('trade-summary-title', name + ' 계좌 요약');
    setText('trade-summary-sub', name + ' 기준 수동 매매용 가용 정보');

    if (data) {
      setText('trade-summary-total', fmtKRW(data.total));
      setText('trade-summary-krw', fmtKRW(data.krw));
      setText('trade-summary-invest', fmtKRW(data.invest));
      return;
    }

    if (isLoading) {
      setText('trade-summary-total', '불러오는 중...');
      setText('trade-summary-krw', '불러오는 중...');
      setText('trade-summary-invest', '불러오는 중...');
    }
  }

  async function fetchSummary(exchange, requestSeq) {
    var api = exchange === 'bithumb' ? '/bapi' : '/api';

    try {
      var balResp = await authFetch(api + '/balances');
      if (requestSeq !== window.__tradeSummarySeq) return;

      var posResp = await authFetch(api + '/positions');
      if (requestSeq !== window.__tradeSummarySeq) return;

      var bal = balResp && balResp.ok ? await balResp.json() : {};
      if (requestSeq !== window.__tradeSummarySeq) return;

      var pos = posResp && posResp.ok ? await posResp.json() : {};
      if (requestSeq !== window.__tradeSummarySeq) return;

      var positions = (pos && pos.positions) ? pos.positions : [];
      var krw = Math.floor((bal && bal.krw_available) || 0);
      var evalAmount = positions.reduce(function(sum, p){ return sum + Number(p.eval_amount || 0); }, 0);
      var investAmount = positions.reduce(function(sum, p){ return sum + Number(p.invest_amount || 0); }, 0);
      var total = Math.floor(krw + evalAmount);

      var summary = {
        total: total,
        krw: krw,
        invest: investAmount
      };

      tradeSummaryCache[exchange] = summary;

      if (requestSeq !== window.__tradeSummarySeq) return;
      renderSummary(exchange, summary, false);
    } catch (e) {
      console.error('[TRADE-SUMMARY-INSTANT-CACHE] fetch failed:', e);
    }
  }

  window.refreshTradeSummary = function() {
    var exchange = currentExchange();
    window._exchange = exchange;
    seq += 1;
    window.__tradeSummarySeq = seq;

    var cached = tradeSummaryCache[exchange];
    renderSummary(exchange, cached, !cached);

    fetchSummary(exchange, seq);
  };

  if (typeof window.switchExchange === 'function' && !window.__tradeSummaryWrappedSwitchExchange) {
    var originalSwitchExchange = window.switchExchange;
    window.switchExchange = function(exchange) {
      window._exchange = exchange;
      try {
        if (typeof _exchange !== 'undefined') _exchange = exchange;
      } catch (e) {}
      var result = originalSwitchExchange.apply(this, arguments);
      return result;
    };
    window.__tradeSummaryWrappedSwitchExchange = true;
  }

})();

(function(){
  if (window.__exchangeViewInstantCacheInstalled) return;
  window.__exchangeViewInstantCacheInstalled = true;

  var cache = window.__exchangeViewCache || {
    upbit: { symbols: null, searchValue: '', positionHTML: null },
    bithumb: { symbols: null, searchValue: '', positionHTML: null }
  };
  window.__exchangeViewCache = cache;

  function getExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  function getSearchEl() {
    return document.getElementById('symbol-search');
  }

  function getPositionEl() {
    return document.getElementById('position-list');
  }

  function saveSymbolsSnapshot(exchange) {
    try {
      var symbols = Array.isArray(window._symbols) ? window._symbols : (typeof _symbols !== 'undefined' && Array.isArray(_symbols) ? _symbols : []);
      if (!symbols || !symbols.length) return;
      cache[exchange].symbols = JSON.parse(JSON.stringify(symbols));
      var searchEl = getSearchEl();
      cache[exchange].searchValue = searchEl ? (searchEl.value || '') : '';
    } catch (e) {
      console.error('[EXCHANGE-VIEW-CACHE] save symbols failed:', e);
    }
  }

  function savePositionsSnapshot(exchange) {
    try {
      var posEl = getPositionEl();
      if (!posEl) return;
      cache[exchange].positionHTML = posEl.innerHTML;
    } catch (e) {
      console.error('[EXCHANGE-VIEW-CACHE] save positions failed:', e);
    }
  }

  function restoreSymbolsSnapshot(exchange) {
    try {
      var snap = cache[exchange];
      if (!snap || !snap.symbols || !snap.symbols.length) return;

      window._symbols = JSON.parse(JSON.stringify(snap.symbols));
      try { _symbols = window._symbols; } catch (e) {}

      window._koreanMap = {};
      try { _koreanMap = {}; } catch (e) {}

      window._symbols.forEach(function(s){
        if (!window._koreanMap) window._koreanMap = {};
        window._koreanMap[s.market] = s.korean_name;
        try { _koreanMap[s.market] = s.korean_name; } catch (e) {}
      });

      var searchEl = getSearchEl();
      if (searchEl) {
        searchEl.value = '';
        searchEl.oninput = function() {
          if (typeof handleExchangeSearchInput === 'function') handleExchangeSearchInput(this);
        };
      }

      if (typeof buildSymbolList === 'function') {
        buildSymbolList('');
      }
    } catch (e) {
      console.error('[EXCHANGE-VIEW-CACHE] restore symbols failed:', e);
    }
  }

  function restorePositionsSnapshot(exchange) {
    try {
      var snap = cache[exchange];
      var posEl = getPositionEl();
      if (!snap || !posEl || !snap.positionHTML) return;
      posEl.innerHTML = snap.positionHTML;
    } catch (e) {
      console.error('[EXCHANGE-VIEW-CACHE] restore positions failed:', e);
    }
  }

  function installFetchWrappers() {
    if (typeof window.fetchSymbols === 'function' && !window.__exchangeViewWrappedFetchSymbols) {
      var oldFetchSymbols = window.fetchSymbols;
      window.fetchSymbols = async function() {
        var out = await oldFetchSymbols.apply(this, arguments);
        saveSymbolsSnapshot(getExchange());
        return out;
      };
      window.__exchangeViewWrappedFetchSymbols = true;
    }

    if (typeof window.fetchPositions === 'function' && !window.__exchangeViewWrappedFetchPositions) {
      var oldFetchPositions = window.fetchPositions;
      window.fetchPositions = async function() {
        var out = await oldFetchPositions.apply(this, arguments);
        savePositionsSnapshot(getExchange());
        return out;
      };
      window.__exchangeViewWrappedFetchPositions = true;
    }
  }

  function installSwitchWrapper() {
    if (typeof window.switchExchange !== 'function' || window.__exchangeViewWrappedSwitchExchange) return;

    var oldSwitchExchange = window.switchExchange;
    window.switchExchange = function(exchange) {
      window._exchange = exchange;
      try { _exchange = exchange; } catch (e) {}

      var out = oldSwitchExchange.apply(this, arguments);

      try { restoreSymbolsSnapshot(exchange); } catch (e) {}
      try { restorePositionsSnapshot(exchange); } catch (e) {}

      return out;
    };

    window.__exchangeViewWrappedSwitchExchange = true;
  }

  installFetchWrappers();
  installSwitchWrapper();

  setTimeout(function(){
    try { saveSymbolsSnapshot(getExchange()); } catch (e) {}
    try { savePositionsSnapshot(getExchange()); } catch (e) {}
  }, 0);
})();

(function(){
  if (window.__dualExchangeWarmCacheInstalled) return;
  window.__dualExchangeWarmCacheInstalled = true;

  window.__tradeSummaryCache = window.__tradeSummaryCache || { upbit: null, bithumb: null };
  window.__exchangeViewCache = window.__exchangeViewCache || {
    upbit: { symbols: null, searchValue: '', positionHTML: null },
    bithumb: { symbols: null, searchValue: '', positionHTML: null }
  };

  var inflight = { upbit: false, bithumb: false };
  var lastUpdatedAt = { upbit: 0, bithumb: 0 };

  function currentExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  function exName(exchange) {
    return exchange === 'bithumb' ? '빗썸' : '업비트';
  }

  function fmtKRW(v) {
    var n = Math.floor(Number(v || 0));
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  function renderTradeSummaryNow(exchange, summary) {
    var titleEl = document.getElementById('trade-summary-title');
    var subEl = document.getElementById('trade-summary-sub');
    var totalEl = document.getElementById('trade-summary-total');
    var krwEl = document.getElementById('trade-summary-krw');
    var investEl = document.getElementById('trade-summary-invest');
    if (titleEl) titleEl.textContent = exName(exchange) + ' 계좌 요약';
    if (subEl) subEl.textContent = exName(exchange) + ' 기준 수동 매매용 가용 정보';
    if (summary) {
      if (totalEl) totalEl.textContent = fmtKRW(summary.total);
      if (krwEl) krwEl.textContent = fmtKRW(summary.krw);
      if (investEl) investEl.textContent = fmtKRW(summary.invest);
    }
  }

  function renderPositionHTML(positions) {
    if (!Array.isArray(positions) || positions.length === 0) return '';

    return positions.map(function(p) {
      var pnlPct = Number(p.pnl_pct || 0);
      var pnlAmount = Number(p.pnl_amount || 0);
      var pc = pnlPct > 0 ? 'pnl-plus' : pnlPct < 0 ? 'pnl-minus' : 'pnl-zero';
      var sign = pnlPct > 0 ? '+' : '';
      var ordersHtml = (p.orders && p.orders.length > 0)
        ? '<div class="pos-orders">' +
          '<div class="pos-orders-header">' + ((window._lang==="ko") ? "주문별 손익" : "Order P&L") + '</div>' +
          p.orders.map(function(o, i) {
            var op = Number(o.pnl_pct || 0);
            var oa = Number(o.pnl_amount || 0);
            var oc = op > 0 ? 'pnl-plus' : op < 0 ? 'pnl-minus' : 'pnl-zero';
            var os = op > 0 ? '+' : '';
            return '<div class="pos-order-row">' +
              '<span class="pos-order-num">#' + (i + 1) + '</span>' +
              '<span class="pos-order-price">' + Number(o.price || 0).toLocaleString() + ((window._lang==='ko') ? '원' : ' KRW') + '</span>' +
              '<span class="pos-order-amt">' + Number(o.amount_krw || 0).toLocaleString() + ((window._lang==="ko") ? "원" : " KRW") + '</span>' +
              '<span class="pos-order-pnl ' + oc + '">' + os + op + '%</span>' +
              '<span class="pos-order-pnl ' + oc + '">' + os + Number(oa).toLocaleString() + ((window._lang==="ko") ? "원" : " KRW") + '</span>' +
              '</div>';
          }).join('') + '</div>'
        : '';

      var symbolText = String(p.symbol || '').replace('KRW-', '');
      var kname = p.korean_name || symbolText;

      return '<div class="pos-card" onclick="selectSymbolByMarket(\'' + String(p.symbol || '').replace(/'/g, "\\'") + '\')">' +
        '<div class="pos-header">' +
          '<div>' +
            '<div class="pos-symbol">' + ((window._lang==='ko') ? kname : symbolText + '/KRW') + '</div>' +
            '<div class="pos-kr">' + ((window._lang==='ko') ? symbolText + '/KRW' : '') + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div class="pos-pnl-big ' + pc + '">' + sign + pnlPct + '%</div>' +
            '<div class="pos-pnl-sub">' + sign + Number(pnlAmount).toLocaleString() + '원</div>' +
          '</div>' +
        '</div>' +
        '<div class="pos-grid">' +
          '<div class="pos-item"><div class="pos-item-label">' + ((window._lang==='ko') ? '평균매수가' : 'Avg. Price') + '</div><div class="pos-item-val">' + Number(p.avg_price || 0).toLocaleString() + '</div></div>' +
          '<div class="pos-item"><div class="pos-item-label">' + ((window._lang==='ko') ? '현재가' : 'Current') + '</div><div class="pos-item-val">' + Number(p.current_price || 0).toLocaleString() + '</div></div>' +
          '<div class="pos-item"><div class="pos-item-label">' + ((window._lang==='ko') ? '수량' : 'Volume') + '</div><div class="pos-item-val">' + Number(p.qty || 0).toFixed(4) + '</div></div>' +
          '<div class="pos-item"><div class="pos-item-label">' + ((window._lang==='ko') ? '매수금액' : 'Invested') + '</div><div class="pos-item-val">' + Number(p.invest_amount || 0).toLocaleString() + '</div></div>' +
          '<div class="pos-item"><div class="pos-item-label">' + ((window._lang==='ko') ? '평가금액' : 'Value') + '</div><div class="pos-item-val">' + Number(p.eval_amount || 0).toLocaleString() + '</div></div>' +
          '<div class="pos-item"><div class="pos-item-label">' + ((window._lang==='ko') ? '평가손익' : 'P&L') + '</div><div class="pos-item-val ' + pc + '">' + sign + Number(pnlAmount).toLocaleString() + '</div></div>' +
        '</div>' +
        ordersHtml +
      '</div>';
    }).join('');
  }

  function applyWarmCacheIfVisible(exchange) {
    if (currentExchange() !== exchange) return;

    var summary = window.__tradeSummaryCache && window.__tradeSummaryCache[exchange];
    if (summary) {
      renderTradeSummaryNow(exchange, summary);
    }

    var viewCache = window.__exchangeViewCache && window.__exchangeViewCache[exchange];
  }

  async function warmExchange(exchange) {
    if (inflight[exchange]) return;
    inflight[exchange] = true;

    var api = exchange === 'bithumb' ? '/bapi' : '/api';

    try {
      var results = await Promise.allSettled([
        authFetch(api + '/balances'),
        authFetch(api + '/positions')
      ]);

      var balResp = results[0] && results[0].status === 'fulfilled' ? results[0].value : null;
      var posResp = results[1] && results[1].status === 'fulfilled' ? results[1].value : null;

      var bal = balResp && balResp.ok ? await balResp.json() : {};
      var pos = posResp && posResp.ok ? await posResp.json() : {};

      var positions = (pos && pos.positions) ? pos.positions : [];
      var krw = Math.floor((bal && bal.krw_available) || 0);
      var evalAmount = positions.reduce(function(sum, p){ return sum + Number(p.eval_amount || 0); }, 0);
      var investAmount = positions.reduce(function(sum, p){ return sum + Number(p.invest_amount || 0); }, 0);
      var total = Math.floor(krw + evalAmount);

      window.__tradeSummaryCache[exchange] = {
        total: total,
        krw: krw,
        invest: investAmount,
        updatedAt: Date.now()
      };

      window.__exchangeViewCache[exchange] = window.__exchangeViewCache[exchange] || { symbols: null, searchValue: '', positionHTML: null };
      window.__exchangeViewCache[exchange].positionHTML = renderPositionHTML(positions);
      window.__exchangeViewCache[exchange].updatedAt = Date.now();

      lastUpdatedAt[exchange] = Date.now();
      applyWarmCacheIfVisible(exchange);
    } catch (e) {
      console.error('[DUAL-EXCHANGE-WARM-CACHE] warm failed:', exchange, e);
    } finally {
      inflight[exchange] = false;
    }
  }

  function warmBoth() {
    warmExchange('upbit');
    warmExchange('bithumb');
  }

  setTimeout(warmBoth, 0);
  window.__dualExchangeWarmCacheIntervalId = setInterval(warmBoth, 4000);

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) warmBoth();
  });

  window.addEventListener('focus', function() {
    warmBoth();
  });
})();

(function(){
  if (window.__positionDomSnapshotFixInstalled) return;
  window.__positionDomSnapshotFixInstalled = true;

  window.__exchangeViewCache = window.__exchangeViewCache || {
    upbit: { symbols: null, searchValue: '', positionHTML: null },
    bithumb: { symbols: null, searchValue: '', positionHTML: null }
  };

  function getExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  function getPositionEl() {
    return document.getElementById('position-list');
  }

  function saveVisiblePositionSnapshot(exchange) {
    try {
      var el = getPositionEl();
      if (!el) return;
      var html = el.innerHTML;
      if (!html || !html.trim()) return;
      window.__exchangeViewCache[exchange] = window.__exchangeViewCache[exchange] || {};
      window.__exchangeViewCache[exchange].positionHTML = html;
      window.__exchangeViewCache[exchange].positionSnapshotAt = Date.now();
    } catch (e) {
      console.error('[POSITION-DOM-SNAPSHOT] save failed:', e);
    }
  }

  function restorePositionSnapshot(exchange) {
    try {
      var el = getPositionEl();
      var cache = window.__exchangeViewCache && window.__exchangeViewCache[exchange];
      if (!el || !cache || !cache.positionHTML) return;
      el.innerHTML = cache.positionHTML;
    } catch (e) {
      console.error('[POSITION-DOM-SNAPSHOT] restore failed:', e);
    }
  }

  function installSwitchWrapper() {
    if (typeof window.switchExchange !== 'function' || window.__positionDomSnapshotSwitchWrapped) return;
    var oldSwitchExchange = window.switchExchange;

    window.switchExchange = function(exchange) {
      try { saveVisiblePositionSnapshot(getExchange()); } catch (e) {}
      window._exchange = exchange;
      try { _exchange = exchange; } catch (e) {}
      var out = oldSwitchExchange.apply(this, arguments);
      try { restorePositionSnapshot(exchange); } catch (e) {}
      return out;
    };

    window.__positionDomSnapshotSwitchWrapped = true;
  }

  function installFetchPositionsObserver() {
    if (window.__positionDomSnapshotObserverInstalled) return;
    var el = getPositionEl();
    if (!el) return;

    var observer = new MutationObserver(function() {
      try { saveVisiblePositionSnapshot(getExchange()); } catch (e) {}
    });

    observer.observe(el, { childList: true, subtree: true, characterData: true });
    window.__positionDomSnapshotObserverInstalled = true;
  }

  function neutralizeCustomPositionWarmCache() {
    try {
      var intervalId = window.__dualExchangeWarmCacheIntervalId;
      if (intervalId) {
        clearInterval(intervalId);
        window.__dualExchangeWarmCacheIntervalId = null;
      }
    } catch (e) {}

    try {
      if (window.__exchangeViewCache) {
        ['upbit', 'bithumb'].forEach(function(ex){
          if (window.__exchangeViewCache[ex]) {
            delete window.__exchangeViewCache[ex].updatedAt;
          }
        });
      }
    } catch (e) {}
  }

  installSwitchWrapper();
  installFetchPositionsObserver();
  neutralizeCustomPositionWarmCache();

  setTimeout(function(){
    try { saveVisiblePositionSnapshot(getExchange()); } catch (e) {}
    try { installFetchPositionsObserver(); } catch (e) {}
  }, 0);
})();

(function(){
  if (window.__tradeSummaryFastLaneInstalled) return;
  window.__tradeSummaryFastLaneInstalled = true;

  window.__tradeSummaryCache = window.__tradeSummaryCache || { upbit: null, bithumb: null };

  var inflight = { upbit: false, bithumb: false };
  var seqMap = { upbit: 0, bithumb: 0 };

  function getExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  function exName(exchange) {
    return exchange === 'bithumb' ? '빗썸' : '업비트';
  }

  function fmtKRW(v) {
    var n = Math.floor(Number(v || 0));
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  function renderSummary(exchange, summary, loading) {
    var titleEl = document.getElementById('trade-summary-title');
    var subEl = document.getElementById('trade-summary-sub');
    var totalEl = document.getElementById('trade-summary-total');
    var krwEl = document.getElementById('trade-summary-krw');
    var investEl = document.getElementById('trade-summary-invest');

    if (titleEl) titleEl.textContent = exName(exchange) + ' 계좌 요약';
    if (subEl) subEl.textContent = exName(exchange) + ' 기준 수동 매매용 가용 정보';

    if (summary) {
      if (totalEl) totalEl.textContent = fmtKRW(summary.total);
      if (krwEl) krwEl.textContent = fmtKRW(summary.krw);
      if (investEl) investEl.textContent = fmtKRW(summary.invest);
      return;
    }

    if (loading) {
      if (totalEl) totalEl.textContent = '불러오는 중...';
      if (krwEl) krwEl.textContent = '불러오는 중...';
      if (investEl) investEl.textContent = '불러오는 중...';
    }
  }

  async function warmSummary(exchange, forceRenderIfVisible) {
    if (inflight[exchange]) return;
    inflight[exchange] = true;
    seqMap[exchange] += 1;
    var mySeq = seqMap[exchange];

    var api = exchange === 'bithumb' ? '/bapi' : '/api';

    try {
      var cached = window.__tradeSummaryCache[exchange];
      if (forceRenderIfVisible && getExchange() === exchange) {
        renderSummary(exchange, cached, !cached);
      }

      var results = await Promise.allSettled([
        authFetch(api + '/balances'),
        authFetch(api + '/positions')
      ]);

      var balResp = results[0] && results[0].status === 'fulfilled' ? results[0].value : null;
      var posResp = results[1] && results[1].status === 'fulfilled' ? results[1].value : null;

      var bal = balResp && balResp.ok ? await balResp.json() : {};
      var pos = posResp && posResp.ok ? await posResp.json() : {};

      if (mySeq !== seqMap[exchange]) return;

      var positions = (pos && pos.positions) ? pos.positions : [];
      var krw = Math.floor((bal && bal.krw_available) || 0);
      var evalAmount = positions.reduce(function(sum, p){ return sum + Number(p.eval_amount || 0); }, 0);
      var investAmount = positions.reduce(function(sum, p){ return sum + Number(p.invest_amount || 0); }, 0);
      var total = Math.floor(krw + evalAmount);

      window.__tradeSummaryCache[exchange] = {
        total: total,
        krw: krw,
        invest: investAmount,
        updatedAt: Date.now()
      };

      if (getExchange() === exchange) {
        renderSummary(exchange, window.__tradeSummaryCache[exchange], false);
      }
    } catch (e) {
      console.error('[TRADE-SUMMARY-FAST-LANE] warm failed:', exchange, e);
    } finally {
      inflight[exchange] = false;
    }
  }

  function warmVisibleFirst() {
    var ex = getExchange();
    warmSummary(ex, true);
    warmSummary(ex === 'upbit' ? 'bithumb' : 'upbit', false);
  }

  function installHooks() {
    if (typeof window.refreshTradeSummary === 'function' && !window.__tradeSummaryFastLaneRefreshWrapped) {
      var oldRefreshTradeSummary = window.refreshTradeSummary;
      window.refreshTradeSummary = function() {
        var ex = getExchange();
        var cached = window.__tradeSummaryCache[ex];
        renderSummary(ex, cached, !cached);
        warmSummary(ex, false);
        return typeof oldRefreshTradeSummary === 'function' ? oldRefreshTradeSummary.apply(this, arguments) : undefined;
      };
      window.__tradeSummaryFastLaneRefreshWrapped = true;
    }

    if (typeof window.switchExchange === 'function' && !window.__tradeSummaryFastLaneSwitchWrapped) {
      var oldSwitchExchange = window.switchExchange;
      window.switchExchange = function(exchange) {
        window._exchange = exchange;
        try { _exchange = exchange; } catch (e) {}
        var out = oldSwitchExchange.apply(this, arguments);
        var cached = window.__tradeSummaryCache[exchange];
        renderSummary(exchange, cached, !cached);
        warmSummary(exchange, false);
        return out;
      };
      window.__tradeSummaryFastLaneSwitchWrapped = true;
    }
  }

  installHooks();

  setTimeout(warmVisibleFirst, 0);
  setInterval(warmVisibleFirst, 1800);

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) warmVisibleFirst();
  });

  window.addEventListener('focus', function() {
    warmVisibleFirst();
  });
})();

(function(){
  if (window.__gnbTotalsFastHomeModelInstalled) return;
  window.__gnbTotalsFastHomeModelInstalled = true;

  window.__gnbTotalsCache = window.__gnbTotalsCache || {
    upbit: null,
    bithumb: null,
    combined: null
  };

  var inflight = false;
  var seq = 0;

  function fmtKRW(v) {
    var n = Math.floor(Number(v || 0));
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  function safePositionsValue(pos) {
    var positions = (pos && pos.positions) ? pos.positions : [];
    return positions.reduce(function(sum, p){
      return sum + Number(p.eval_amount || 0);
    }, 0);
  }

  function countActiveStrategies() {
    try {
      if (Array.isArray(window._strategies)) {
        return window._strategies.filter(function(s){
          return !!(s && (s.running || s.active || s.enabled));
        }).length;
      }
    } catch (e) {}
    return 0;
  }

  function setMetricText(matchers, value) {
    var boxes = Array.from(document.querySelectorAll('.gnb-stat, .top-stat, .summary-stat, .header-stat, .stat-card'));
    boxes.forEach(function(box){
      var txt = (box.textContent || '').replace(/\s+/g, ' ').trim();
      var matched = matchers.some(function(m){ return txt.indexOf(m) !== -1; });
      if (!matched) return;

      var valueEl =
        box.querySelector('.value') ||
        box.querySelector('.stat-value') ||
        box.querySelector('.metric-value') ||
        box.querySelector('strong') ||
        box.querySelector('b');

      if (valueEl) {
        valueEl.textContent = value;
        return;
      }

      var spans = box.querySelectorAll('span');
      if (spans.length >= 2) {
        spans[spans.length - 1].textContent = value;
      }
    });
  }

  function renderCombinedTotals() {
    var up = window.__gnbTotalsCache.upbit;
    var bt = window.__gnbTotalsCache.bithumb;
    if (!up || !bt) return;

    var combined = {
      krw: Number(up.krw || 0) + Number(bt.krw || 0),
      total: Number(up.total || 0) + Number(bt.total || 0),
      activeStrategies: countActiveStrategies(),
      updatedAt: Date.now()
    };
    window.__gnbTotalsCache.combined = combined;

    setMetricText(['KRW 잔고', '보유 KRW', 'KRW Balance'], fmtKRW(combined.krw));
    setMetricText(['총 평가금액', '총 자산', 'Total Value'], fmtKRW(combined.total));
    setMetricText(['활성 전략', 'Active Strategy', 'Active Strategies'], String(combined.activeStrategies));
  }

  async function fetchExchangeTotals(exchange, mySeq) {
    var api = exchange === 'bithumb' ? '/bapi' : '/api';

    var results = await Promise.allSettled([
      authFetch(api + '/balances'),
      authFetch(api + '/positions')
    ]);

    if (mySeq !== seq) return;

    var balResp = results[0] && results[0].status === 'fulfilled' ? results[0].value : null;
    var posResp = results[1] && results[1].status === 'fulfilled' ? results[1].value : null;

    var bal = balResp && balResp.ok ? await balResp.json() : {};
    if (mySeq !== seq) return;

    var pos = posResp && posResp.ok ? await posResp.json() : {};
    if (mySeq !== seq) return;

    var krw = Math.floor(Number((bal && bal.krw_available) || 0));
    var evalAmount = safePositionsValue(pos);
    var total = Math.floor(krw + evalAmount);

    window.__gnbTotalsCache[exchange] = {
      krw: krw,
      total: total,
      updatedAt: Date.now()
    };
  }

  async function warmGnbTotals() {
    if (inflight) return;
    inflight = true;
    seq += 1;
    var mySeq = seq;

    try {
      await Promise.all([
        fetchExchangeTotals('upbit', mySeq),
        fetchExchangeTotals('bithumb', mySeq)
      ]);
      if (mySeq !== seq) return;
      renderCombinedTotals();
    } catch (e) {
      console.error('[GNB-TOTALS-FAST] warm failed:', e);
    } finally {
      inflight = false;
    }
  }

  function renderCachedFirst() {
    var combined = window.__gnbTotalsCache && window.__gnbTotalsCache.combined;
    if (!combined) return;
    setMetricText(['KRW 잔고', '보유 KRW', 'KRW Balance'], fmtKRW(combined.krw));
    setMetricText(['총 평가금액', '총 자산', 'Total Value'], fmtKRW(combined.total));
    setMetricText(['활성 전략', 'Active Strategy', 'Active Strategies'], String(combined.activeStrategies || 0));
  }

  renderCachedFirst();
  setTimeout(function(){
    renderCachedFirst();
    warmGnbTotals();
  }, 0);

  window.__gnbTotalsFastIntervalId = setInterval(function(){
    renderCachedFirst();
    warmGnbTotals();
  }, 5000);

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      renderCachedFirst();
      warmGnbTotals();
    }
  });

  window.addEventListener('focus', function() {
    renderCachedFirst();
    warmGnbTotals();
  });
})();

(function(){
  if (window.__positionsFastLaneStableInstalled) return;
  window.__positionsFastLaneStableInstalled = true;

  function getExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  var inflight = false;
  var rerunRequested = false;
  var lastPromise = null;
  var lastExchange = null;

  async function runFetchPositionsStable() {
    if (typeof window.__originalFetchPositionsStable !== 'function') return;

    if (inflight) {
      rerunRequested = true;
      return lastPromise;
    }

    inflight = true;
    rerunRequested = false;
    lastExchange = getExchange();

    lastPromise = (async function(){
      try {
        return await window.__originalFetchPositionsStable.apply(window, arguments);
      } catch (e) {
        console.error('[POSITIONS-FAST-LANE] fetchPositions failed:', e);
      } finally {
        inflight = false;
        if (rerunRequested) {
          rerunRequested = false;
          setTimeout(function(){
            try { window.fetchPositions(); } catch (e) {}
          }, 0);
        }
      }
    })();

    return lastPromise;
  }

  if (typeof window.fetchPositions === 'function' && !window.__positionsFastLaneWrappedFetch) {
    window.__originalFetchPositionsStable = window.fetchPositions;
    window.fetchPositions = function() {
      return runFetchPositionsStable.apply(this, arguments);
    };
    window.__positionsFastLaneWrappedFetch = true;
  }

function refreshPositionsBurst(exchange) {
  var ex = exchange || getExchange();
  setTimeout(function(){
    if (getExchange() !== ex) return;
    try { window.fetchPositions(); } catch (e) {}
  }, 0);
}

  if (typeof window.switchExchange === 'function' && !window.__positionsFastLaneWrappedSwitch) {
    var oldSwitchExchange = window.switchExchange;
    window.switchExchange = function(exchange) {
      window._exchange = exchange;
      try { _exchange = exchange; } catch (e) {}
      var out = oldSwitchExchange.apply(this, arguments);
      refreshPositionsBurst(exchange);
      return out;
    };
    window.__positionsFastLaneWrappedSwitch = true;
  }

  function visibleWarm() {
    if (document.hidden) return;
    try { window.fetchPositions(); } catch (e) {}
  }

  window.__positionsFastLaneIntervalId = setInterval(visibleWarm, 5000);

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) refreshPositionsBurst(getExchange());
  });

  window.addEventListener('focus', function() {
    refreshPositionsBurst(getExchange());
  });
})();

(function(){
  if (window.__gnbUseHomeDashCacheInstalled) return;
  window.__gnbUseHomeDashCacheInstalled = true;

  window.__homeDashTopCache = window.__homeDashTopCache || null;

  function countActiveStrategiesSafeLocal(data) {
    function isStrategyActuallyActiveLocal(s) {
      if (!s) return false;
      var status = String(s.status || s.state || s.run_status || s.last_status || '').toLowerCase();
      return s.active === true ||
             s.is_running === true ||
             s.enabled === true ||
             ['running','active','started','start','on','enabled'].indexOf(status) !== -1;
    }
    return (data && data.strategies ? data.strategies.filter(isStrategyActuallyActiveLocal).length : 0);
  }

  function applyGnbFromHomeCache(cache) {
    if (!cache) return false;

    var krwEl = document.getElementById('krw-balance');
    var evalEl = document.getElementById('total-eval');
    var activeEl = document.getElementById('active-count');
    var activeLbl = document.getElementById('active-count-lbl');

    var krw = Math.floor(Number(cache.krw || 0));
    var totalEval = Math.floor(Number(cache.totalEval || 0));
    var totalActive = Number(cache.totalActive || 0);

    if (krwEl) krwEl.textContent = krw.toLocaleString('ko-KR') + ((window._lang === 'ko') ? '원' : ' KRW');
    if (evalEl) evalEl.textContent = totalEval.toLocaleString('ko-KR') + ((window._lang === 'ko') ? '원' : ' KRW');
    if (activeEl) activeEl.textContent = String(totalActive);
    if (activeLbl) activeLbl.textContent = (window._lang === 'ko') ? '활성 전략' : 'Active Strategies';

    return true;
  }

  if (typeof window.renderDashTop === 'function' && !window.__gnbUseHomeDashCacheWrappedDashTop) {
    var oldRenderDashTop = window.renderDashTop;
    window.renderDashTop = function(balData, posData, gridData, dcaData, rebalData) {
      var out = oldRenderDashTop.apply(this, arguments);

      try {
        var krw = balData ? Number(balData.krw_available || 0) : 0;
        var positions = (posData && posData.positions) ? posData.positions : [];
        var coinEval = positions.reduce(function(s, p){ return s + Number(p.eval_amount || 0); }, 0);
        var totalEval = balData && balData.total_eval_amount ? Number(balData.total_eval_amount || 0) : (krw + coinEval);

        var totalActive =
          countActiveStrategiesSafeLocal(gridData) +
          countActiveStrategiesSafeLocal(dcaData) +
          countActiveStrategiesSafeLocal(rebalData);

        window.__homeDashTopCache = {
          krw: krw,
          totalEval: totalEval,
          totalActive: totalActive,
          updatedAt: Date.now()
        };

        applyGnbFromHomeCache(window.__homeDashTopCache);
      } catch (e) {
        console.error('[GNB-HOME-CACHE] renderDashTop wrap failed:', e);
      }

      return out;
    };
    window.__gnbUseHomeDashCacheWrappedDashTop = true;
  }

  if (typeof window.refreshGlobalTopStats === 'function' && !window.__gnbUseHomeDashCacheWrappedGlobal) {
    var oldRefreshGlobalTopStats = window.refreshGlobalTopStats;
    window.refreshGlobalTopStats = async function() {
      try {
        var cache = window.__homeDashTopCache;
        if (cache && cache.updatedAt && (Date.now() - cache.updatedAt < 15000)) {
          applyGnbFromHomeCache(cache);
          return;
        }
      } catch (e) {
        console.error('[GNB-HOME-CACHE] cache apply failed:', e);
      }
      return oldRefreshGlobalTopStats.apply(this, arguments);
    };
    window.__gnbUseHomeDashCacheWrappedGlobal = true;
  }

  setTimeout(function(){
    try {
      if (window.__homeDashTopCache) applyGnbFromHomeCache(window.__homeDashTopCache);
    } catch (e) {}
  }, 0);
})();

(function(){
  if (window.__tradingviewWidgetFixV3Installed) return;
  window.__tradingviewWidgetFixV3Installed = true;

  function getExchange() {
    try {
      return (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    } catch (e) {
      return window._exchange || 'upbit';
    }
  }

  function getSelectedMarket() {
    try {
      var s = (typeof _selectedSymbol !== 'undefined') ? _selectedSymbol : window._selectedSymbol;
      if (s && typeof s === 'object' && s.market) return s.market;
      if (typeof s === 'string' && s) return s;
      return 'KRW-BTC';
    } catch (e) {
      return 'KRW-BTC';
    }
  }

  function toTvSymbol(exchange, market) {
    var raw = String(market || 'KRW-BTC');
    var coin = raw.replace('KRW-', '').replace('/KRW', '').replace('-', '').trim().toUpperCase();
    return (exchange === 'bithumb' ? 'BITHUMB:' : 'UPBIT:') + coin + 'KRW';
  }

  function getCenterPanel() {
    return (
      document.querySelector('.center-panel') ||
      document.querySelector('.main-center') ||
      document.querySelector('.center-column') ||
      document.querySelector('#center-panel') ||
      document.querySelector('#main-center')
    );
  }

  function ensureShell() {
    var centerPanel = getCenterPanel();
    if (!centerPanel) return null;

    var shell = document.getElementById('tv-chart-shell');
    if (shell) return shell;

    shell = document.createElement('div');
    shell.id = 'tv-chart-shell';
    shell.style.marginBottom = '0';
    shell.style.borderRadius = '0';
    shell.style.overflow = 'hidden';
    shell.style.border = 'none';
    shell.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
    shell.style.background = document.body.classList.contains('light') ? '#ffffff' : 'rgba(20,20,20,0.35)';
    shell.style.minHeight = '460px';
    shell.style.width = '100%';
    shell.style.flex = '0 0 auto';

    var header = document.createElement('div');
    header.id = 'tv-chart-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '10px 12px';
    header.style.fontSize = '13px';
    header.style.fontWeight = '600';
    header.style.borderBottom = '1px solid rgba(255,255,255,0.08)';

    var title = document.createElement('div');
    title.id = 'tv-chart-title';
    title.style.cssText = 'font-size:15px;font-weight:800;color:var(--text);letter-spacing:-0.3px';
    title.textContent = '-';

    // 전략 연결 배지 (좌측 타이틀 옆) — [2-1] 크고 또렷하게
    var stratConn = document.createElement('div');
    stratConn.id = 'tv-strategy-conn';
    stratConn.className = 'strategy-conn-badge manual';
    stratConn.innerHTML = '○ 수동 매매';

    // 서브텍스트 (최근 자동 실행 XX분 전)
    var stratSub = document.createElement('span');
    stratSub.id = 'tv-strategy-subtext';
    stratSub.className = 'tv-strategy-subtext';
    stratSub.textContent = '전략 미연결';

    var badge = document.createElement('div');
    badge.id = 'tv-chart-badge';
    badge.style.cssText = 'font-size:11px;opacity:0.5;font-family:monospace';

    var leftGroup = document.createElement('div');
    leftGroup.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    leftGroup.appendChild(title);
    leftGroup.appendChild(stratConn);
    leftGroup.appendChild(stratSub);

    header.appendChild(leftGroup);
    header.appendChild(badge);

    var body = document.createElement('div');
    body.id = 'tv-chart-container';
    body.style.height = '420px';
    body.style.minHeight = '370px';
    body.style.width = '100%';

    shell.appendChild(header);
    shell.appendChild(body);

    centerPanel.insertBefore(shell, centerPanel.firstChild);
    return shell;
  }

  function renderWidget(force) {
    var shell = ensureShell();
    if (!shell) return;

    var container = document.getElementById('tv-chart-container');
    var badge = document.getElementById('tv-chart-badge');
    if (!container || !badge) return;

    var exchange = getExchange();
    var market = getSelectedMarket();
    var tvSymbol = toTvSymbol(exchange, market);
    var theme = document.body.classList.contains('light') ? 'light' : 'dark';
    var renderKey = tvSymbol + '|' + theme;
    var now = Date.now();

    // [2-1] 차트 헤더 종목명 업데이트
    var titleEl = document.getElementById('tv-chart-title');
    var coinBase = market ? market.replace('KRW-','') : '-';
    var coinKr = (window._koreanMap && window._koreanMap[market]) || coinBase;
    if (titleEl) titleEl.textContent = coinBase + (coinKr && coinKr !== coinBase ? '  ' + coinKr : '');
    if (typeof window.updateStrategyConnBadge === 'function') { try { updateStrategyConnBadge(market); } catch(e){} }

    if (!force && window.__tvLastRenderKey === renderKey && now - (window.__tvLastRenderTs || 0) < 10000) {
      badge.textContent = tvSymbol;
      return;
    }

    window.__tvLastRenderKey = renderKey;
    window.__tvLastRenderTs = now;

    badge.textContent = tvSymbol;
    container.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    var widgetHost = document.createElement('div');
    widgetHost.className = 'tradingview-widget-container__widget';
    widgetHost.style.width = '100%';
    widgetHost.style.height = '100%';

    wrapper.appendChild(widgetHost);
    container.appendChild(wrapper);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "width": "100%",
      "height": "420",
      "symbol": tvSymbol,
      "interval": "60",
      "timezone": "Asia/Seoul",
      "theme": theme,
      "style": "1",
      "locale": "kr",
      "allow_symbol_change": false,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "isTransparent": true
    });

    wrapper.appendChild(script);
  }

    function rerenderSoon(force) {
      clearTimeout(window.__tvRerenderTimer);
      window.__tvRerenderTimer = setTimeout(function(){ renderWidget(!!force); }, 100);
    }
    window.rerenderSoon = rerenderSoon;

      setTimeout(function() {
        renderWidget(true);
      }, 250);

  if (typeof window.switchExchange === 'function' && !window.__tvFixV3WrappedSwitchExchange) {
    var oldSwitchExchange = window.switchExchange;
    window.switchExchange = function(exchange) {
      window._exchange = exchange;
      try { _exchange = exchange; } catch (e) {}
      var out = oldSwitchExchange.apply(this, arguments);
      rerenderSoon();
      return out;
    };
    window.__tvFixV3WrappedSwitchExchange = true;
  }

  if (typeof window.selectSymbol === 'function' && !window.__tvFixV3WrappedSelectSymbol) {
    var oldSelectSymbol = window.selectSymbol;
    window.selectSymbol = function(sym) {
      window._selectedSymbol = sym;
      try { _selectedSymbol = sym; } catch (e) {}
      var out = oldSelectSymbol.apply(this, arguments);
      rerenderSoon();
      return out;
    };
    window.__tvFixV3WrappedSelectSymbol = true;
  }

  if (typeof window.selectSymbolByMarket === 'function' && !window.__tvFixV3WrappedSelectSymbolByMarket) {
    var oldSelectSymbolByMarket = window.selectSymbolByMarket;
    window.selectSymbolByMarket = function(market) {
      var out = oldSelectSymbolByMarket.apply(this, arguments);
      rerenderSoon();
      return out;
    };
    window.__tvFixV3WrappedSelectSymbolByMarket = true;
  }

  rerenderSoon();
})();

(function(){
  if (window.__centerBottomTabsV1Installed) return;
  window.__centerBottomTabsV1Installed = true;

  function t(key) {
    try {
      if (window.I18N && window.I18N[window._lang] && window.I18N[window._lang][key]) {
        return window.I18N[window._lang][key];
      }
    } catch (e) {}
    if (key === 'positions') return '보유자산';
    if (key === 'orders') return '주문내역';
    return key;
  }

  function ensureTabs() {
    var center = document.querySelector('.center-panel');
    var pos = center && center.querySelector('.position-area');
    var ord = center && center.querySelector('.orders-area');
    if (!center || !pos || !ord) return null;

    center.classList.add('tabbed-bottom');

    var existing = document.getElementById('center-bottom-tabs');
    if (existing) return existing;

    var tabs = document.createElement('div');
    tabs.id = 'center-bottom-tabs';
    tabs.className = 'center-bottom-tabs';

    var btnPos = document.createElement('button');
    btnPos.type = 'button';
    btnPos.id = 'tab-btn-positions';
    btnPos.className = 'center-bottom-tab active';
    btnPos.textContent = t('positions');

    var btnOrd = document.createElement('button');
    btnOrd.type = 'button';
    btnOrd.id = 'tab-btn-orders';
    btnOrd.className = 'center-bottom-tab';
    btnOrd.textContent = t('orders');

    tabs.appendChild(btnPos);
    tabs.appendChild(btnOrd);

    pos.parentNode.insertBefore(tabs, pos);

    function activate(which) {
      if (which === 'orders') {
        pos.classList.add('is-hidden');
        ord.classList.remove('is-hidden');
        btnPos.classList.remove('active');
        btnOrd.classList.add('active');
      } else {
        ord.classList.add('is-hidden');
        pos.classList.remove('is-hidden');
        btnOrd.classList.remove('active');
        btnPos.classList.add('active');
      }
    }

    btnPos.addEventListener('click', function(){ activate('positions'); });
    btnOrd.addEventListener('click', function(){ activate('orders'); });

    activate('positions');
    window.__activateCenterBottomTab = activate;
    return tabs;
  }

  function refreshTabLabels() {
    var btnPos = document.getElementById('tab-btn-positions');
    var btnOrd = document.getElementById('tab-btn-orders');
    if (btnPos) btnPos.textContent = t('positions');
    if (btnOrd) btnOrd.textContent = t('orders');
  }

  function growTradingViewOnceReady() {
    var shell = document.getElementById('tv-chart-shell');
    var container = document.getElementById('tv-chart-container');
    if (!shell || !container) return;
    container.style.height = (window.innerHeight && window.innerHeight < 920) ? '370px' : '420px';
  }

  ensureTabs();
  refreshTabLabels();
  growTradingViewOnceReady();

  if (typeof window.setLanguage === 'function' && !window.__centerBottomTabsWrappedSetLanguage) {
    var oldSetLanguage = window.setLanguage;
    window.setLanguage = function(lang) {
      var out = oldSetLanguage.apply(this, arguments);
      setTimeout(refreshTabLabels, 0);
      return out;
    };
    window.__centerBottomTabsWrappedSetLanguage = true;
  }

  window.addEventListener('resize', function(){
    growTradingViewOnceReady();
  });

  setTimeout(function(){
    ensureTabs();
    refreshTabLabels();
    growTradingViewOnceReady();
  }, 0);

  setTimeout(function(){
    ensureTabs();
    growTradingViewOnceReady();
  }, 500);
})();

// order side tabs v1
window._orderSide = window._orderSide || 'BUY';

function syncMarketAmountUiBySide(side){
  try{
    side = (side === 'SELL') ? 'SELL' : 'BUY';
    var label = document.getElementById('market-amount-label');
    var input = document.getElementById('market-amount');
    var limitInput = document.getElementById('amount');
    var warn = document.querySelector('.market-warn');
    var minAmount = side === 'SELL' ? 5000 : 5500;

    if (label) {
      label.textContent = '금액 (KRW) — 시장가 즉시 체결';
    }
    if (input) {
      input.placeholder = '최소 ' + minAmount.toLocaleString('ko-KR') + '원';
    }
    if (limitInput) {
      limitInput.placeholder = side === 'SELL' ? '최소 5,000원' : '최소 5,500원';
    }
    if (warn) {
      warn.textContent = '⚠️ 현재 호가로 즉시 체결됩니다 · ' + (side === 'SELL' ? '매도 최소 5,000원' : '매수 최소 5,500원');
    }
  }catch(e){}
}

function setOrderSide(side){
  window._orderSide = (side === 'SELL') ? 'SELL' : 'BUY';
  var area = document.querySelector('.order-area');
  var buyTab = document.getElementById('side-tab-buy');
  var sellTab = document.getElementById('side-tab-sell');
  if(area){
    area.classList.remove('order-side-buy','order-side-sell');
    area.classList.add(window._orderSide === 'SELL' ? 'order-side-sell' : 'order-side-buy');
  }
  if(buyTab) buyTab.classList.toggle('active', window._orderSide === 'BUY');
  if(sellTab) sellTab.classList.toggle('active', window._orderSide === 'SELL');
  try{ syncMarketAmountUiBySide(window._orderSide); }catch(e){}
  try{ updatePreTradeSummary(); }catch(e){}
}

(function(){
  if(window.__orderSideTabsV1Installed) return;
  window.__orderSideTabsV1Installed = true;

  var originalSubmitOrder = window.submitOrder;
  if(typeof originalSubmitOrder === 'function' && !window.__orderSideSubmitWrapped){
    window.submitOrder = function(side){
      var effectiveSide = side;
      if(side === 'BUY' || side === 'SELL'){
        effectiveSide = side;
      } else {
        effectiveSide = window._orderSide || 'BUY';
      }
      return originalSubmitOrder.call(this, effectiveSide);
    };
    window.__orderSideSubmitWrapped = true;
  }

  setTimeout(function(){
    try{ setOrderSide(window._orderSide || 'BUY'); }catch(e){}
  }, 0);
})();

function resetOrderForm(){
  try{
    var ids = ['price','amount','market-amount','seed-ratio-custom','ratio-custom','custom-ratio'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.value = '';
    });

    var btns = document.querySelectorAll(
      '.pct-btn, .percent-btn, .seed-ratio-btn, .ratio-btn, .quick-amount-btn, .amount-quick-btn, [data-ratio], [data-quick-amount]'
    );
    btns.forEach(function(btn){
      btn.classList.remove('active','selected','is-active','on');
      btn.setAttribute('aria-pressed', 'false');
    });

    var sliderWraps = document.querySelectorAll(
      '.ratio-slider-wrap, .seed-ratio-slider-wrap, .custom-ratio-wrap, .custom-ratio-slider'
    );
    sliderWraps.forEach(function(el){
      el.style.display = 'none';
      el.classList.remove('open','active','is-open');
    });

    var sliderEls = document.querySelectorAll(
      '#seed-ratio-slider, #ratio-slider, input[type="range"].ratio-slider, input[type="range"].seed-ratio-slider'
    );
    sliderEls.forEach(function(el){
      try{
        el.value = el.min ? el.min : 0;
      }catch(e){}
    });

    var currentPriceEl = document.getElementById('sel-price');
    var priceEl = document.getElementById('price');
    if(priceEl && currentPriceEl){
      var txt = (currentPriceEl.textContent || '').replace(/[^0-9.]/g, '');
      if(txt) priceEl.value = txt;
    }

    var evtNames = ['input','change'];
    ['price','amount','market-amount'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      evtNames.forEach(function(name){
        try{ el.dispatchEvent(new Event(name, { bubbles:true })); }catch(e){}
      });
    });

    if(typeof updateOrderPreview === 'function'){
      try{ updateOrderPreview(); }catch(e){}
    }
    if(typeof updatePreview === 'function'){
      try{ updatePreview(); }catch(e){}
    }
    if(typeof refreshOrderSummary === 'function'){
      try{ refreshOrderSummary(); }catch(e){}
    }
  }catch(e){
    console.error('[ORDER-RESET] failed:', e);
  }
}

function updateOrderAvailableHint(){
  try{
    var hint = document.getElementById('order-available-hint');
    if(!hint) return;

    var side = window._orderSide || 'BUY';
    var krw = null;

    try{
      if(window.__tradeSummaryCache){
        var ex = ((typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit');
        var cached = window.__tradeSummaryCache[ex];
        if(cached && cached.krw != null) krw = Number(cached.krw);
      }
    }catch(e){}

    if(krw == null){
      try{
        if(window._balances && window._balances.krw_available != null){
          krw = Number(window._balances.krw_available);
        }
      }catch(e){}
    }

    if(side === 'SELL'){
      var held = (typeof getSelectedSymbolHeldQty === 'function') ? getSelectedSymbolHeldQty() : 0;
      var heldStr = (typeof formatHeldQty === 'function') ? formatHeldQty(held) : held.toLocaleString(undefined, {maximumFractionDigits: 8});
      hint.textContent = '주문 가능 수량: ' + heldStr + '개';
      return;
    }

    if(krw == null || Number.isNaN(krw)){
      hint.textContent = '주문 가능 금액: -';
      return;
    }

    hint.textContent = '주문 가능 금액: ' + Math.floor(krw).toLocaleString('ko-KR') + '원';
  }catch(e){
    console.error('[ORDER-AVAILABLE-HINT] failed:', e);
  }
}

(function(){
  if(window.__orderAvailableHintInstalled) return;
  window.__orderAvailableHintInstalled = true;

  if(typeof window.setOrderSide === 'function' && !window.__orderAvailableHintWrappedSide){
    var oldSetOrderSide = window.setOrderSide;
    window.setOrderSide = function(side){
      var out = oldSetOrderSide.apply(this, arguments);
      setTimeout(updateOrderAvailableHint, 0);
      return out;
    };
    window.__orderAvailableHintWrappedSide = true;
  }

  if(typeof window.fetchBalances === 'function' && !window.__orderAvailableHintWrappedBalances){
    var oldFetchBalances = window.fetchBalances;
    window.fetchBalances = async function(){
      var out = await oldFetchBalances.apply(this, arguments);
      setTimeout(updateOrderAvailableHint, 0);
      return out;
    };
    window.__orderAvailableHintWrappedBalances = true;
  }

  setTimeout(updateOrderAvailableHint, 0);
})();

window.__lastOrderInputSource = window.__lastOrderInputSource || 'amount';
window.__orderDualSyncLock = false;

function parseOrderNumber(v){
  var n = Number(String(v == null ? '' : v).replace(/,/g,'').trim());
  return Number.isFinite(n) ? n : 0;
}

function formatQtyValue(v){
  var s = Number(v || 0).toFixed(8);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

function getLiveOrderPrice(){
  try{
    var priceEl = document.getElementById('price');
    var v = parseOrderNumber(priceEl && priceEl.value ? priceEl.value : '');
    if(v > 0) return v;
  }catch(e){}
  try{
    var selPrice = document.getElementById('sel-price');
    var t = Number(String(selPrice ? selPrice.textContent || '' : '').replace(/[^0-9.]/g,''));
    if(Number.isFinite(t) && t > 0) return t;
  }catch(e){}
  return 0;
}

function syncOrderDualFields(source){
  if(window.__orderDualSyncLock) return;
  window.__orderDualSyncLock = true;
  try{
    var amountEl = document.getElementById('amount');
    var qtyEl = document.getElementById('qty-input');
    if(!amountEl || !qtyEl) return;

    var price = getLiveOrderPrice();
    if(!price || !Number.isFinite(price) || price <= 0){
      window.__orderDualSyncLock = false;
      return;
    }

    if(source === 'qty'){
      var qty = parseOrderNumber(qtyEl.value);
      if(qty > 0){
        amountEl.value = String(Math.floor(price * qty));
      } else {
        amountEl.value = '';
      }
      try{
        amountEl.dispatchEvent(new Event('input', { bubbles:true }));
        amountEl.dispatchEvent(new Event('change', { bubbles:true }));
      }catch(e){}
    } else {
      var amount = parseOrderNumber(amountEl.value);
      if(amount > 0){
        qtyEl.value = formatQtyValue(amount / price);
      } else {
        qtyEl.value = '';
      }
    }
  } catch(e){
    console.error('[ORDER-DUAL-V2] sync failed:', e);
  } finally{
    window.__orderDualSyncLock = false;
  }
}

(function(){
  if(window.__orderDualV2Installed) return;
  window.__orderDualV2Installed = true;

  var amountEl = document.getElementById('amount');
  var qtyEl = document.getElementById('qty-input');
  var priceEl = document.getElementById('price');

  if(amountEl && !window.__orderDualV2AmountBound){
    amountEl.addEventListener('input', function(){
      window.__lastOrderInputSource = 'amount';
      syncOrderDualFields('amount');
    });
    amountEl.addEventListener('change', function(){
      window.__lastOrderInputSource = 'amount';
      syncOrderDualFields('amount');
    });
    window.__orderDualV2AmountBound = true;
  }

  if(qtyEl && !window.__orderDualV2QtyBound){
    qtyEl.addEventListener('input', function(){
      window.__lastOrderInputSource = 'qty';
      syncOrderDualFields('qty');
    });
    qtyEl.addEventListener('change', function(){
      window.__lastOrderInputSource = 'qty';
      syncOrderDualFields('qty');
    });
    window.__orderDualV2QtyBound = true;
  }

  if(priceEl && !window.__orderDualV2PriceBound){
    priceEl.addEventListener('input', function(){
      syncOrderDualFields(window.__lastOrderInputSource || 'amount');
    });
    priceEl.addEventListener('change', function(){
      syncOrderDualFields(window.__lastOrderInputSource || 'amount');
    });
    window.__orderDualV2PriceBound = true;
  }

  if(typeof window.resetOrderForm === 'function' && !window.__orderDualV2ResetWrapped){
    var oldResetOrderFormDualV2 = window.resetOrderForm;
    window.resetOrderForm = function(){
      var out = oldResetOrderFormDualV2.apply(this, arguments);
      try{
        var qty = document.getElementById('qty-input');
        if(qty) qty.value = '';
        window.__lastOrderInputSource = 'amount';
        syncOrderDualFields('amount');
      }catch(e){}
      return out;
    };
    window.__orderDualV2ResetWrapped = true;
  }

  if(typeof window.submitOrder === 'function' && !window.__orderDualV2SubmitWrapped){
    var oldSubmitOrderDualV2 = window.submitOrder;
    window.submitOrder = function(side){
      try{
        syncOrderDualFields(window.__lastOrderInputSource || 'amount');
      }catch(e){}
      return oldSubmitOrderDualV2.apply(this, arguments);
    };
    window.__orderDualV2SubmitWrapped = true;
  }

  if(typeof window.selectSymbol === 'function' && !window.__orderDualV2SelectWrapped){
    var oldSelectSymbolDualV2 = window.selectSymbol;
    window.selectSymbol = function(sym){
      var out = oldSelectSymbolDualV2.apply(this, arguments);
      setTimeout(function(){ syncOrderDualFields(window.__lastOrderInputSource || 'amount'); }, 0);
      return out;
    };
    window.__orderDualV2SelectWrapped = true;
  }

  if(typeof window.selectSymbolByMarket === 'function' && !window.__orderDualV2SelectByMarketWrapped){
    var oldSelectSymbolByMarketDualV2 = window.selectSymbolByMarket;
    window.selectSymbolByMarket = function(market){
      var out = oldSelectSymbolByMarketDualV2.apply(this, arguments);
      setTimeout(function(){ syncOrderDualFields(window.__lastOrderInputSource || 'amount'); }, 0);
      return out;
    };
    window.__orderDualV2SelectByMarketWrapped = true;
  }

  setTimeout(function(){
    try{
      syncOrderDualFields('amount');
    }catch(e){}
  }, 0);
})();


window.__syncMarketSideBtn = function() {
  var buyTab = document.getElementById('side-tab-buy');
  var sellTab = document.getElementById('side-tab-sell');
  var buyBtn = document.getElementById('market-buy-btn');
  var sellBtn = document.getElementById('market-sell-btn');
  if (!buyTab || !sellTab || !buyBtn || !sellBtn) return;

  var isSell = sellTab.classList.contains('active');
  buyBtn.style.display = isSell ? 'none' : '';
  sellBtn.style.display = isSell ? '' : 'none';
};

document.addEventListener('DOMContentLoaded', function() {
  window.__syncMarketSideBtn();
  setTimeout(window.__syncMarketSideBtn, 0);
  setTimeout(window.__syncMarketSideBtn, 100);
  setInterval(window.__syncMarketSideBtn, 500);
});

document.addEventListener('DOMContentLoaded', function() {
  syncMarketDynamicSubmitButton();
  setTimeout(syncMarketDynamicSubmitButton, 0);
  setTimeout(syncMarketDynamicSubmitButton, 100);
  setInterval(syncMarketDynamicSubmitButton, 300);
});

document.addEventListener('DOMContentLoaded', function() {
  var card = document.getElementById('trade-summary-card');
  if (card) {
    card.style.padding = '12px 12px 10px';
  }

  var head = card ? card.querySelector('.trade-summary-head') : null;
  if (head) {
    head.style.marginBottom = '8px';
    head.style.alignItems = 'flex-start';
  }

  var title = document.getElementById('trade-summary-title');
  if (title) {
    title.style.fontSize = '15px';
    title.style.lineHeight = '1.15';
  }

  var sub = document.getElementById('trade-summary-sub');
  if (sub) {
    sub.style.fontSize = '10px';
    sub.style.lineHeight = '1.2';
    sub.style.marginTop = '2px';
  }

  var grid = card ? card.querySelector('.trade-summary-grid') : null;
  if (grid) {
    grid.style.gap = '8px';
  }

  if (card) {
    card.querySelectorAll('.trade-summary-item').forEach(function(el) {
      el.style.padding = '8px 10px';
      el.style.minHeight = '54px';
    });

    card.querySelectorAll('.trade-summary-label').forEach(function(el) {
      el.style.fontSize = '10px';
      el.style.lineHeight = '1.15';
      el.style.marginBottom = '4px';
    });

    card.querySelectorAll('.trade-summary-value').forEach(function(el) {
      el.style.fontSize = '14px';
      el.style.lineHeight = '1.1';
    });
  }

  var refresh = document.getElementById('trade-summary-refresh');
  if (refresh) {
    refresh.style.height = '30px';
    refresh.style.minHeight = '30px';
    refresh.style.padding = '0 10px';
    refresh.style.fontSize = '11px';
  }
});

(function dedupeOrderCurrentPriceButtons(){
  try {
    var topBtn = document.getElementById('order-current-price-btn');
    if (topBtn) {
      try { topBtn.remove(); } catch (e) {}
    }
  } catch (e) {}
})();


function filterExchangeSymbols(rawQuery){
  const input = document.getElementById('symbol-search')
  if (!input) return
  input.value = String(rawQuery || '')
  if (typeof handleExchangeSearchInput === 'function') {
    handleExchangeSearchInput(input)
  }
}

/* GPT_PATCH_STEP9_SIDE_SEARCH_LIMIT */
(function(){
  const sideState = {
    BUY: { price: '', amount: '', marketAmount: '' },
    SELL: { price: '', amount: '', marketAmount: '' }
  };

  function currentSide(){
    if (window._orderSide) return window._orderSide;
    const sellBtn = document.getElementById('side-tab-sell');
    return (sellBtn && sellBtn.classList.contains('active')) ? 'SELL' : 'BUY';
  }

  function saveSideValues(){
    const side = currentSide();
    const priceEl = document.getElementById('price');
    const amountEl = document.getElementById('amount');
    const marketEl = document.getElementById('market-amount');
    sideState[side] = {
      price: priceEl ? priceEl.value : '',
      amount: amountEl ? amountEl.value : '',
      marketAmount: marketEl ? marketEl.value : ''
    };
  }

  function restoreSideValues(side){
    const saved = sideState[side] || {};
    const priceEl = document.getElementById('price');
    const amountEl = document.getElementById('amount');
    const marketEl = document.getElementById('market-amount');
    if (priceEl) priceEl.value = saved.price || '';
    if (amountEl) amountEl.value = saved.amount || '';
    if (marketEl) marketEl.value = saved.marketAmount || '';
    if (typeof updateQtyPreview === 'function') {
      try { updateQtyPreview(); } catch(e) {}
    }
  }

  function forceOrderTypeTabs(){
    const wrap = document.querySelector('.order-type-tabs');
    const limit = document.getElementById('tab-limit');
    const market = document.getElementById('tab-market');
    if (wrap) {
      wrap.style.display = 'flex';
      wrap.style.visibility = 'visible';
      wrap.style.opacity = '1';
    }
    [limit, market].forEach(function(el){
      if (!el) return;
      el.style.display = 'block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.flex = '1 1 0';
    });
  }

  function filterSymbols(raw){
    const q = String(raw || '').trim().toLowerCase();
    const items = Array.from(document.querySelectorAll('.symbol-item'));
    items.forEach(function(el){
      const txt = (el.innerText || el.textContent || '').toLowerCase();
      el.style.display = (!q || txt.includes(q)) ? '' : 'none';
    });
  }

  function bindSymbolSearch(){
    const input = document.getElementById('symbol-search');
    if (!input) return;
    if (input.dataset.gptBound === '1') return;
    input.dataset.gptBound = '1';
    input.oninput = function(){
      if (typeof handleExchangeSearchInput === 'function') handleExchangeSearchInput(this);
    };
  }

  function patchSetOrderSide(){
    if (typeof window.setOrderSide !== 'function') return;
    if (window.setOrderSide.__gptWrapped) return;
    const orig = window.setOrderSide;
    window.setOrderSide = function(side){
      saveSideValues();
      const out = orig.apply(this, arguments);
      try { window._orderSide = side; } catch(e) {}
      setTimeout(function(){
        forceOrderTypeTabs();
        restoreSideValues(side);
      }, 0);
      return out;
    };
    window.setOrderSide.__gptWrapped = true;
  }

  function boot(){
    forceOrderTypeTabs();
    bindSymbolSearch();
    patchSetOrderSide();
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  setTimeout(boot, 300);
})();

/* GPT_PATCH_STEP10_SEARCH_LIMIT_SYNC */
(function(){
  function getActiveOrderSideSafe(){
    if (window._orderSide) return window._orderSide;
    const sellBtn = document.getElementById('side-tab-sell');
    return (sellBtn && sellBtn.classList.contains('active')) ? 'SELL' : 'BUY';
  }

  function formatHeldQty(v){
    const n = Number(v || 0);
    if (!isFinite(n) || n <= 0) return '0';
    return n.toLocaleString(undefined, {maximumFractionDigits: 8});
  }

  function refreshOrderAvailableHintBySelection(){
    const hint = document.getElementById('order-available-hint');
    if (!hint) return;
    const side = (((typeof getActiveOrderSideSafe === 'function' && getActiveOrderSideSafe()) ||
      (typeof getCurrentOrderSideFromTabs === 'function' && getCurrentOrderSideFromTabs()) ||
      window._orderSide || 'BUY') + '').toUpperCase();

    if (typeof updateMinAmountUi === 'function') {
      try { updateMinAmountUi(side); } catch(e) {}
    }
    if (typeof updateOrderCurrentPriceButton === 'function') {
      try { updateOrderCurrentPriceButton(); } catch(e) {}
    }

    if (side === 'SELL') {
      const held = (typeof getSelectedSymbolHeldQty === 'function') ? getSelectedSymbolHeldQty() : 0;
      hint.textContent = '주문 가능 수량: ' + formatHeldQty(held) + '개';
      return;
    }
    const krwEl = document.getElementById('krw-balance');
    const krwText = (krwEl && krwEl.dataset && krwEl.dataset.selectedKrw) ? krwEl.dataset.selectedKrw : (krwEl ? krwEl.textContent : '');
    const krw = parseFloat(String(krwText || '').replace(/[^0-9.]/g, '')) || 0;
    hint.textContent = '주문 가능 금액: ' + Math.floor(krw).toLocaleString() + '원';
  }

  function forceLimitTabsVisible(){
    const wrap = document.querySelector('.order-type-tabs');
    const limit = document.getElementById('tab-limit');
    const market = document.getElementById('tab-market');
    const limitArea = document.getElementById('limit-area');
    const marketArea = document.getElementById('market-area');

    if (wrap) {
      wrap.style.display = 'flex';
      wrap.style.visibility = 'visible';
      wrap.style.opacity = '1';
    }
    [limit, market].forEach(function(el){
      if (!el) return;
      el.style.display = 'block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.flex = '1 1 0';
      el.style.pointerEvents = 'auto';
    });

    if (limit && !limit.classList.contains('active') && market && !market.classList.contains('active')) {
      limit.classList.add('active');
      if (limitArea) limitArea.style.display = 'block';
      if (marketArea) marketArea.style.display = 'none';
    }
  }

  function filterExchangeSymbols(raw){
    const input = document.getElementById('symbol-search');
    if (!input) return;
    input.value = String(raw || '');
    if (typeof handleExchangeSearchInput === 'function') {
      handleExchangeSearchInput(input);
    }
  }

  function bindExchangeSearch(){
    const input = document.getElementById('symbol-search');
    if (!input) return;
    if (input.dataset.step10Bound === '1') return;
    input.dataset.step10Bound = '1';
    input.oninput = function(){
      if (typeof handleExchangeSearchInput === 'function') handleExchangeSearchInput(this);
    };
  }

  function wrapSelectSymbol(){
    if (typeof window.selectSymbol !== 'function') return;
    if (window.selectSymbol.__step10Wrapped) return;
    const orig = window.selectSymbol;
    window.selectSymbol = function(sym){
      const out = orig.apply(this, arguments);
      setTimeout(function(){
        forceLimitTabsVisible();
        refreshOrderAvailableHintBySelection();
      }, 0);
      return out;
    };
    window.selectSymbol.__step10Wrapped = true;
  }

  function wrapSetOrderSide(){
    if (typeof window.setOrderSide !== 'function') return;
    if (window.setOrderSide.__step10Wrapped) return;
    const orig = window.setOrderSide;
    window.setOrderSide = function(side){
      const out = orig.apply(this, arguments);
      setTimeout(function(){
        forceLimitTabsVisible();
        refreshOrderAvailableHintBySelection();
      }, 0);
      return out;
    };
    window.setOrderSide.__step10Wrapped = true;
  }

  function wrapSetTab(){
    if (typeof window.setTab !== 'function') return;
    if (window.setTab.__step10Wrapped) return;
    const orig = window.setTab;
    window.setTab = function(tab){
      const out = orig.apply(this, arguments);
      setTimeout(function(){
        forceLimitTabsVisible();
        refreshOrderAvailableHintBySelection();
      }, 0);
      return out;
    };
    window.setTab.__step10Wrapped = true;
  }

  function boot(){
    forceLimitTabsVisible();
    bindExchangeSearch();
    wrapSelectSymbol();
    wrapSetOrderSide();
    wrapSetTab();
    refreshOrderAvailableHintBySelection();
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  setTimeout(boot, 100);
  setTimeout(boot, 500);
})();

/* GPT_PATCH_STEP11_SEARCH_HELD_LIMITSUBMIT */
(function(){
  function getActiveOrderSideSafe(){
    if (window._orderSide) return window._orderSide;
    const sellBtn = document.getElementById('side-tab-sell');
    return (sellBtn && sellBtn.classList.contains('active')) ? 'SELL' : 'BUY';
  }

  function fmtQty(n){
    n = Number(n || 0);
    if (!isFinite(n) || n <= 0) return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }

  function fmtKrw(n){
    n = Math.floor(Number(n || 0));
    if (!isFinite(n) || n <= 0) return '0원';
    return n.toLocaleString('ko-KR') + '원';
  }

  function bindExchangeSearch(){
    const input = document.getElementById('symbol-search');
    if (!input || input.dataset.step11Bound === '1') return;
    input.dataset.step11Bound = '1';
    input.oninput = function(){
      if (typeof handleExchangeSearchInput === 'function') handleExchangeSearchInput(this);
    };
  }

  window.getSelectedSymbolHeldQty = function(){
  try {
    const market = String((window._selectedSymbol && window._selectedSymbol.market) || '').trim().toUpperCase();
    const codeFromMarket = market ? market.replace('KRW-', '') : '';
    const name = String(document.getElementById('sel-name')?.textContent || '').trim().toUpperCase();
    const code = String(document.getElementById('sel-code')?.textContent || '').trim().split('/')[0].trim().toUpperCase();
    const candidates = [market, codeFromMarket, code, name].filter(Boolean);

    const cards = Array.from(document.querySelectorAll('#position-list .pos-card'));
    for (const card of cards) {
      const onclickAttr = String(card.getAttribute('onclick') || '').toUpperCase();
      const headerText = String(card.querySelector('.pos-symbol')?.textContent || card.textContent || '').trim().toUpperCase();
      const matched = candidates.some(c => onclickAttr.includes(c) || headerText.includes(c));
      if (!matched) continue;

      const items = Array.from(card.querySelectorAll('.pos-item'));
      for (const item of items) {
        const label = String(item.querySelector('.pos-item-label')?.textContent || '').trim().toUpperCase();
        if (!(label.includes('수량') || label.includes('VOLUME') || label.includes('QTY') || label.includes('보유'))) continue;

        const valText = String(item.querySelector('.pos-item-val')?.textContent || '').replace(/,/g, '').trim();
        const qty = parseFloat(valText);
        if (Number.isFinite(qty) && qty > 0) return qty;
      }
    }
  } catch (e) {}
  return 0;
};

  function updateMinAmountUi(side){
    var normalized = String(side || (((typeof getCurrentOrderSideFromTabs === 'function' && getCurrentOrderSideFromTabs()) || window._orderSide || 'BUY'))).toUpperCase();
    var minAmount = normalized === 'SELL' ? 5000 : 5500;

    var amountEl = document.getElementById('amount');
    var marketAmountEl = document.getElementById('market-amount');
    if (amountEl) amountEl.placeholder = '최소 ' + minAmount.toLocaleString('ko-KR') + '원';
    if (marketAmountEl) marketAmountEl.placeholder = '최소 ' + minAmount.toLocaleString('ko-KR') + '원';

    var warnEls = document.querySelectorAll('.market-warn');
    warnEls.forEach(function(el){
      el.textContent = '⚠️ 현재 호가로 즉시 체결됩니다';
    });
  }

  function refreshOrderAvailableHintBySelection(){
    const hint = document.getElementById('order-available-hint');
    if (!hint) return;
    const side = getActiveOrderSideSafe();
    if (side === 'SELL') {
      hint.textContent = '주문 가능 수량: ' + fmtQty(window.getSelectedSymbolHeldQty()) + '개';
      return;
    }
    const krwEl = document.getElementById('krw-balance');
    const krwText = (krwEl && krwEl.dataset && krwEl.dataset.selectedKrw) ? krwEl.dataset.selectedKrw : (krwEl ? krwEl.textContent : '');
    const krw = parseFloat(String(krwText || '').replace(/[^0-9.]/g, '')) || 0;
    hint.textContent = '주문 가능 금액: ' + fmtKrw(krw);
  }

  function ensureLimitSubmitRow(){
    const limitArea = document.getElementById('limit-area');
    if (!limitArea) return;
    let row = document.getElementById('limit-order-btn-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'order-btn-row';
      row.id = 'limit-order-btn-row';
      row.innerHTML = ''
        + '<button type="button" class="btn-buy" id="limit-buy-btn" onclick="submitOrder(\'BUY\')">매수</button>'
        + '<button type="button" class="btn-sell" id="limit-sell-btn" onclick="submitOrder(\'SELL\')">매도</button>';
      limitArea.appendChild(row);
    }
    // sync outer submit row: hide it when limit tab active (limit-order-btn-row handles it)
    var mainRow = document.getElementById('market-order-btn-row');
    if (mainRow) {
      var isMarket = (typeof _currentTab !== 'undefined' && _currentTab === 'market');
      mainRow.style.display = isMarket ? '' : 'none';
    }
  }

  function forceLimitTabsVisible(){
    const wrap = document.querySelector('.order-type-tabs');
    const limit = document.getElementById('tab-limit');
    const market = document.getElementById('tab-market');
    if (wrap) {
      wrap.style.display = 'flex';
      wrap.style.visibility = 'visible';
      wrap.style.opacity = '1';
    }
    [limit, market].forEach(function(el){
      if (!el) return;
      el.style.display = 'block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.flex = '1 1 0';
      el.style.pointerEvents = 'auto';
    });
  }

  function wrapSelectSymbol(){
    if (typeof window.selectSymbol !== 'function' || window.selectSymbol.__step11Wrapped) return;
    const orig = window.selectSymbol;
    window.selectSymbol = function(sym){
      const out = orig.apply(this, arguments);
      setTimeout(refreshOrderAvailableHintBySelection, 0);
      return out;
    };
    window.selectSymbol.__step11Wrapped = true;
  }

  function wrapSetOrderSide(){
    if (typeof window.setOrderSide !== 'function' || window.setOrderSide.__step11Wrapped) return;
    const orig = window.setOrderSide;
    window.setOrderSide = function(side){
      const out = orig.apply(this, arguments);
      setTimeout(function(){
        forceLimitTabsVisible();
        ensureLimitSubmitRow();
        refreshOrderAvailableHintBySelection();
      }, 0);
      return out;
    };
    window.setOrderSide.__step11Wrapped = true;
  }

  function wrapSetTab(){
    if (typeof window.setTab !== 'function' || window.setTab.__step11Wrapped) return;
    const orig = window.setTab;
    window.setTab = function(tab){
      const out = orig.apply(this, arguments);
      setTimeout(function(){
        forceLimitTabsVisible();
        ensureLimitSubmitRow();
      }, 0);
      return out;
    };
    window.setTab.__step11Wrapped = true;
  }

  function boot(){
    bindExchangeSearch();
    forceLimitTabsVisible();
    ensureLimitSubmitRow();
    wrapSelectSymbol();
    wrapSetOrderSide();
    wrapSetTab();
    refreshOrderAvailableHintBySelection();
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  setTimeout(boot, 100);
  setTimeout(boot, 600);
})();

/* GRIDFLOW_SEARCH_TV_ORDER_CONNECTOR_V1 */
(function(){
  if (window.__gridflowSearchTvOrderConnectorV1) return;
  window.__gridflowSearchTvOrderConnectorV1 = true;

  function getSearchInput(){ return document.getElementById('symbol-search'); }
  function getSymbolList(){ return document.getElementById('symbol-list'); }
  function getFirstVisibleRow(){
    var rows = Array.from(document.querySelectorAll('#symbol-list .symbol-item'));
    for (var i = 0; i < rows.length; i++) {
      var st = window.getComputedStyle(rows[i]);
      if (st.display !== 'none' && st.visibility !== 'hidden') return rows[i];
    }
    return null;
  }
  function rerenderTradingView(){
    try {
      if (typeof window.renderWidget === 'function') {
        if (typeof window.rerenderSoon === 'function') { window.rerenderSoon(); } else { window.renderWidget(); }
        return;
      }
    } catch(e) {}
    try {
      if (typeof window.rerenderSoon === 'function') {
        window.rerenderSoon();
        return;
      }
    } catch(e) {}
    try {
      var ev = new CustomEvent('gridflow:selected-symbol-changed', {
        detail: {
          exchange: window._exchange || 'upbit',
          symbol: window._selectedSymbol || null
        }
      });
      window.dispatchEvent(ev);
    } catch(e) {}
  }
  function syncOrderPanel(){
    try {
      var sym = window._selectedSymbol;
      if (!sym) return;
      var priceEl = document.getElementById('price');
      var selPriceEl = document.getElementById('sel-price');
      var hintEl = document.getElementById('order-available-hint');
      if (priceEl && (!priceEl.value || Number(priceEl.value) <= 0)) {
        priceEl.value = String(Number(sym.trade_price || 0));
      }
      if (selPriceEl) {
        selPriceEl.textContent = Number(sym.trade_price || 0).toLocaleString('ko-KR') + '원';
      }
      if (typeof window.updateQtyPreview === 'function') {
        try { window.updateQtyPreview(); } catch(e) {}
      }
      if (typeof window.syncOrderDualFields === 'function') {
        try { window.syncOrderDualFields(window.__lastOrderInputSource || 'amount'); } catch(e) {}
      }
      if (typeof window.refreshOrderSummary === 'function') {
        try { window.refreshOrderSummary(); } catch(e) {}
      }
      if (typeof window.updateOrderPreview === 'function') {
        try { window.updateOrderPreview(); } catch(e) {}
      }
      if (hintEl && typeof window.getSelectedSymbolHeldQty === 'function') {
        var isSell = String(window._orderSide || 'BUY').toUpperCase() === 'SELL';
        if (isSell) {
          var held = Number(window.getSelectedSymbolHeldQty() || 0);
          hintEl.textContent = '주문 가능 수량: ' + held.toLocaleString(undefined, {maximumFractionDigits: 8}) + '개';
        }
      }
    } catch(e) {
      console.error('[GRIDFLOW-CONNECTOR] order sync failed:', e);
    }
  }
  function syncSelectionChain(){
    syncOrderPanel();
    rerenderTradingView();
  }
  function handleSearchInput(inputEl){
    var input = inputEl || getSearchInput();
    if (!input) return;
    var q = String(input.value || '');
    if (typeof window.buildSymbolList === 'function') {
      window.buildSymbolList(q);
    }
    var firstRow = getFirstVisibleRow();
    if (firstRow) firstRow.click();
  }
  function bindSearchInput(){
    var input = getSearchInput();
    if (!input) return;
    input.oninput = function(){ handleSearchInput(this); };
    input.onchange = function(){ handleSearchInput(this); };
    input.onkeydown = function(e){
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchInput(this);
      }
    };
  }
  function wrapSelectSymbol(){
    if (typeof window.selectSymbol !== 'function' || window.selectSymbol.__gridflowConnectorWrapped) return;
    var orig = window.selectSymbol;
    window.selectSymbol = function(sym){
      var out = orig.apply(this, arguments);
      try { window._selectedSymbol = sym; } catch(e) {}
      setTimeout(syncSelectionChain, 0);
      setTimeout(syncSelectionChain, 200);
      return out;
    };
    window.selectSymbol.__gridflowConnectorWrapped = true;
  }
  function wrapSelectSymbolByMarket(){
    if (typeof window.selectSymbolByMarket !== 'function' || window.selectSymbolByMarket.__gridflowConnectorWrapped) return;
    var orig = window.selectSymbolByMarket;
    window.selectSymbolByMarket = function(market){
      var out = orig.apply(this, arguments);
      setTimeout(syncSelectionChain, 0);
      return out;
    };
    window.selectSymbolByMarket.__gridflowConnectorWrapped = true;
  }
  function wrapSwitchExchange(){
    if (typeof window.switchExchange !== 'function' || window.switchExchange.__gridflowConnectorWrapped) return;
    var orig = window.switchExchange;
    window.switchExchange = function(exchange){
      var isPortfolioNav = !!window._portfolioTarget;
      var out = orig.apply(this, arguments);
      setTimeout(function(){
        if (isPortfolioNav) { return; }
        bindSearchInput();
        var input = getSearchInput();
        if (input && input.value) {
          handleSearchInput(input);
        } else {
          var firstRow = getFirstVisibleRow();
          if (firstRow) firstRow.click();
          else syncSelectionChain();
        }
      }, 250);
      return out;
    };
    window.switchExchange.__gridflowConnectorWrapped = true;
  }
  function boot(){
    bindSearchInput();
    wrapSelectSymbol();
    wrapSelectSymbolByMarket();
    wrapSwitchExchange();
    setTimeout(syncSelectionChain, 0);
  }
  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  setTimeout(boot, 300);
})();

/* GPT_PATCH_STEP12_HARD_SEARCH_TV_ORDER_CONNECTOR */
(function(){
  function firstVisibleSymbolItem(){
    var items = Array.from(document.querySelectorAll('#symbol-list .symbol-item'));
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (!el) continue;
      if (el.style.display === 'none') continue;
      if (el.hidden) continue;
      return el;
    }
    return null;
  }

  function syncOrderPanel(){
    try {
      if (typeof updateQtyPreview === 'function') updateQtyPreview();
    } catch (e) {}
    try {
      var hintFn = window.refreshOrderAvailableHintBySelection;
      if (typeof hintFn === 'function') hintFn();
    } catch (e) {}
  }

  function syncTradingView(){
    try {
      if (typeof window.rerenderSoon === 'function') {
        window.rerenderSoon();
        return;
      }
    } catch (e) {}
    try {
      if (typeof window.renderWidget === 'function') {
        if (typeof window.rerenderSoon === 'function') { window.rerenderSoon(); } else { window.renderWidget(); }
        return;
      }
    } catch (e) {}
  }

  function clickFirstResult(){
    var row = firstVisibleSymbolItem();
    if (!row) return;
    try { row.click(); } catch (e) {}
    setTimeout(function(){ syncOrderPanel(); syncTradingView(); }, 0);
  }

  function unifiedSearch(inputEl){
    var input = inputEl || document.getElementById('symbol-search');
    if (!input) return;
    var q = String(input.value || '');
    if (typeof buildSymbolList === 'function') {
      buildSymbolList(q);
      clickFirstResult();
      return;
    }
    if (typeof handleExchangeSearchInput === 'function') {
      handleExchangeSearchInput(input);
      setTimeout(function(){ syncOrderPanel(); syncTradingView(); }, 0);
    }
  }

  function bindSearchHard(){
    var input = document.getElementById('symbol-search');
    if (!input) return;
    if (input.__step12HardBound) return;
    input.__step12HardBound = true;

    input.removeAttribute('oninput');
    input.oninput = null;
    input.onchange = null;
    input.onkeyup = null;

    ['input', 'change', 'keyup'].forEach(function(evtName){
      input.addEventListener(evtName, function(ev){
        ev.stopImmediatePropagation();
        unifiedSearch(input);
      }, true);
    });
  }

  function wrapSelectSymbolHard(){
    if (typeof window.selectSymbol !== 'function') return;
    if (window.selectSymbol.__step12HardWrapped) return;
    var orig = window.selectSymbol;
    window.selectSymbol = function(sym){
      var out = orig.apply(this, arguments);
      setTimeout(function(){ syncOrderPanel(); syncTradingView(); }, 0);
      return out;
    };
    window.selectSymbol.__step12HardWrapped = true;
  }

  function wrapSelectSymbolByMarketHard(){
    if (typeof window.selectSymbolByMarket !== 'function') return;
    if (window.selectSymbolByMarket.__step12HardWrapped) return;
    var orig = window.selectSymbolByMarket;
    window.selectSymbolByMarket = function(){
      var out = orig.apply(this, arguments);
      setTimeout(function(){ syncOrderPanel(); syncTradingView(); }, 0);
      return out;
    };
    window.selectSymbolByMarket.__step12HardWrapped = true;
  }

  function wrapSwitchExchangeHard(){
    if (typeof window.switchExchange !== 'function') return;
    if (window.switchExchange.__step12HardWrapped) return;
    var orig = window.switchExchange;
    window.switchExchange = function(){
      var out = orig.apply(this, arguments);
      setTimeout(function(){ bindSearchHard(); }, 0);
      setTimeout(function(){
        // skip premature render: if symbols cleared by exchange switch, wait for fetchSymbols
        var syms = window._symbols || (typeof _symbols !== 'undefined' ? _symbols : []);
        if (syms.length > 0) unifiedSearch(document.getElementById('symbol-search'));
      }, 80);
      return out;
    };
    window.switchExchange.__step12HardWrapped = true;
  }

  function boot(){
    bindSearchHard();
    wrapSelectSymbolHard();
    wrapSelectSymbolByMarketHard();
    wrapSwitchExchangeHard();
    setTimeout(function(){ bindSearchHard(); }, 200);
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  setTimeout(boot, 100);
  setTimeout(boot, 500);
})();

(function(){
  if (window.__orderPanelCurrentPriceButtonV1Installed) return;
  window.__orderPanelCurrentPriceButtonV1Installed = true;

  function getSelectedTradePrice(){
    try{
      if (window._selectedSymbol && window._selectedSymbol.trade_price != null){
        return Number(window._selectedSymbol.trade_price);
      }
    }catch(e){}
    try{
      var selPrice = document.getElementById('sel-price');
      var raw = String(selPrice ? selPrice.textContent || '' : '').replace(/[^0-9.]/g, '');
      var n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }catch(e){}
    return NaN;
  }

  function updateOrderCurrentPriceButton(){
    var price = getSelectedTradePrice();
    var rounded = (Number.isFinite(price) && price > 0) ? Math.round(price) : 0;
    var rate = (_selectedSymbol && Number.isFinite(Number(_selectedSymbol.change_rate))) ? Number(_selectedSymbol.change_rate) : null;
    var changeClass = rate === null ? '' : (rate > 0 ? 'rise' : rate < 0 ? 'fall' : 'even');
    var changeText = rate === null ? '현재가 클릭 반영' : (((rate > 0 ? '+' : '') + (rate * 100).toFixed(2) + '%'));

    var marketCard = document.getElementById('market-current-price-card');
    var marketPrice = document.getElementById('market-sel-price');
    var marketChange = document.getElementById('market-sel-change');

    if (marketPrice) {
      marketPrice.textContent = rounded > 0 ? (rounded.toLocaleString('ko-KR') + '원') : '-';
    }
    if (marketChange) {
      marketChange.textContent = changeText;
      marketChange.className = 'price-change' + (changeClass ? (' ' + changeClass) : '');
    }
    if (marketCard) {
      marketCard.setAttribute('onclick', 'return fillPriceWithCurrentPrice()');
      marketCard.style.cursor = 'pointer';
      marketCard.style.pointerEvents = 'auto';
    }

    var oldMarketBtn = document.getElementById('market-current-price-btn');
    if (oldMarketBtn) {
      try { oldMarketBtn.remove(); } catch(e) {}
    }

    var topBtn = document.getElementById('order-current-price-btn');
    if (topBtn) {
      try { topBtn.remove(); } catch(e) {}
    }
  }

  window.fillPriceWithCurrentPrice = function(){
    try{
      var price = getSelectedTradePrice();
      var input = document.getElementById('price');
      if (!input || !Number.isFinite(price) || price <= 0) return;
      input.value = String(Math.round(price));
      try{ input.dispatchEvent(new Event('input', { bubbles:true })); }catch(e){}
      try{ input.dispatchEvent(new Event('change', { bubbles:true })); }catch(e){}
      if (typeof updateQtyPreview === 'function'){
        try{ updateQtyPreview(); }catch(e){}
      }
      updateOrderCurrentPriceButton();
      if (typeof refreshOrderAvailableHintBySelection === 'function'){
        try{ refreshOrderAvailableHintBySelection(); }catch(e){}
      }
    }catch(e){
      console.error('[ORDER_PANEL_CURRENT_PRICE_BUTTON_V1] fill failed:', e);
    }
  };

  function boot(){
    updateOrderCurrentPriceButton();
    try{ syncMarketAmountUiBySide((typeof getActiveOrderSide === 'function' && getActiveOrderSide()) || (typeof getCurrentOrderSideFromTabs === 'function' && getCurrentOrderSideFromTabs()) || window._orderSide || 'BUY'); }catch(e){}
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  window.addEventListener('load', boot, { once:true });
  setInterval(updateOrderCurrentPriceButton, 1500);

  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('.symbol-item, .order-side-tab, #tab-limit, #tab-market, .exchange-tab, #upbit-tab, #bithumb-tab') : null;
    if (t){
      setTimeout(updateOrderCurrentPriceButton, 0);
      setTimeout(updateOrderCurrentPriceButton, 150);
    }
  }, true);
})();

/* GPT_PATCH_STEP12_ORDER_SYNC_FINAL */
(function(){
  function getSide(){
    try{
      if (typeof window.getActiveOrderSide === 'function') {
        var s = String(window.getActiveOrderSide() || '').toUpperCase();
        if (s === 'BUY' || s === 'SELL') return s;
      }
    }catch(e){}
    try{
      if (typeof window.getCurrentOrderSideFromTabs === 'function') {
        var s2 = String(window.getCurrentOrderSideFromTabs() || '').toUpperCase();
        if (s2 === 'BUY' || s2 === 'SELL') return s2;
      }
    }catch(e){}
    return String(window._orderSide || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  }

  function clearOrderDraftInputs(){
    try{
      ['price','amount','market-amount'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      var preview = document.getElementById('qty-preview');
      if (preview) preview.textContent = '';
    }catch(e){}
  }

  function updateMinAmountUiStrict(){
    try{
      var side = getSide();
      var amountEl = document.getElementById('amount');
      var marketAmountEl = document.getElementById('market-amount');
      var warnEls = document.querySelectorAll('.market-warn');
      var minAmount = side === 'SELL' ? 5000 : 5500;

      if (amountEl) amountEl.placeholder = '최소 ' + minAmount.toLocaleString('ko-KR') + '원';
      if (marketAmountEl) marketAmountEl.placeholder = '최소 ' + minAmount.toLocaleString('ko-KR') + '원';

      warnEls.forEach(function(el){
        el.textContent = side === 'SELL' ? '⚠️ 현재 호가로 즉시 체결됩니다 · 매도 최소 5,000원' : '⚠️ 현재 호가로 즉시 체결됩니다 · 매수 최소 5,500원';
      });
    }catch(e){}
  }

  function formatHeldQty(v){
    var n = Number(v || 0);
    if (!isFinite(n) || n <= 0) return '0';
    return n.toLocaleString(undefined, {maximumFractionDigits: 8});
  }

  function formatKrw(v){
    var n = Math.floor(Number(v || 0));
    if (!isFinite(n) || n <= 0) return '-';
    return n.toLocaleString('ko-KR') + '원';
  }

  window.refreshOrderAvailableHintBySelection = function(){
    try{
      var hint = document.getElementById('order-available-hint');
      if (!hint) return;
      var side = getSide();

      if (side === 'SELL') {
        var held = (typeof window.getSelectedSymbolHeldQty === 'function') ? Number(window.getSelectedSymbolHeldQty() || 0) : 0;
        hint.textContent = '주문 가능 수량: ' + formatHeldQty(held) + '개';
        return;
      }

      var krwEl = document.getElementById('krw-balance');
      var raw = (krwEl && krwEl.dataset && krwEl.dataset.selectedKrw) ? krwEl.dataset.selectedKrw : (krwEl ? krwEl.textContent : '');
      var krw = parseFloat(String(raw || '').replace(/[^0-9.]/g, '')) || 0;
      hint.textContent = '주문 가능 금액: ' + formatKrw(krw);
    }catch(e){}
  };

  function getSelectedTradePriceSafe(){
    try{
      if (window._selectedSymbol && Number(window._selectedSymbol.trade_price) > 0) return Number(window._selectedSymbol.trade_price);
    }catch(e){}
    try{
      var raw = String(document.getElementById('sel-price')?.textContent || '').replace(/[^0-9.]/g, '');
      var n = Number(raw);
      if (isFinite(n) && n > 0) return n;
    }catch(e){}
    return NaN;
  }

  function ensureMarketCurrentPriceButton(){
    try{
      var row = document.querySelector('.market-current-price-row');
      if (!row) return;
      var btn = document.getElementById('market-current-price-btn');
      if (!btn) {
        row.innerHTML = '';
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'market-current-price-btn';
        btn.className = 'order-current-price-btn';
        row.appendChild(btn);
      }
      btn.type = 'button';
      btn.textContent = (function(){
        var p = getSelectedTradePriceSafe();
        return (isFinite(p) && p > 0) ? ('현재가: ' + Math.round(p).toLocaleString('ko-KR') + '원') : '현재가: -';
      })();
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'pointer';
      btn.style.position = 'relative';
      btn.style.zIndex = '50';
      btn.onclick = function(ev){
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        window.fillPriceWithCurrentPrice();
        return false;
      };
      var topBtn = document.getElementById('order-current-price-btn');
      if (topBtn) topBtn.remove();
    }catch(e){}
  }

  window.fillPriceWithCurrentPrice = function(){
    try{
      var input = document.getElementById('price');
      var price = getSelectedTradePriceSafe();
      if (!input || !isFinite(price) || price <= 0) return false;
      input.value = String(Math.round(price));
      try{ input.dispatchEvent(new Event('input', { bubbles:true })); }catch(e){}
      try{ input.dispatchEvent(new Event('change', { bubbles:true })); }catch(e){}
      try{ if (typeof window.updateQtyPreview === 'function') window.updateQtyPreview(); }catch(e){}
      ensureMarketCurrentPriceButton();
      return false;
    }catch(e){
      return false;
    }
  };

  function afterSelectionSync(){
    updateMinAmountUiStrict();
    ensureMarketCurrentPriceButton();
    window.refreshOrderAvailableHintBySelection();
  }

  function wrapOnce(fnName, flagName, afterFn, beforeFn){
    if (typeof window[fnName] !== 'function') return;
    if (window[flagName]) return;
    var orig = window[fnName];
    window[fnName] = function(){
      try{ if (beforeFn) beforeFn.apply(this, arguments); }catch(e){}
      var out = orig.apply(this, arguments);
      try{ afterFn.apply(this, arguments); }catch(e){}
      return out;
    };
    window[flagName] = true;
  }

  wrapOnce('selectSymbol', '__step12SelectWrapped', function(){
    setTimeout(afterSelectionSync, 0);
  });

  wrapOnce('setOrderSide', '__step12SideWrapped', function(){
    setTimeout(function(){
      clearOrderDraftInputs();
      afterSelectionSync();
    }, 0);
  });

  wrapOnce('setTab', '__step12TabWrapped', function(){
    setTimeout(function(){
      clearOrderDraftInputs();
      afterSelectionSync();
    }, 0);
  });

  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('#market-current-price-btn') : null;
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      window.fillPriceWithCurrentPrice();
      return false;
    }

    var picked = e.target && e.target.closest ? e.target.closest('.symbol-item, #position-list .pos-card') : null;
    if (picked) {
      setTimeout(function(){
        window.fillPriceWithCurrentPrice();
        afterSelectionSync();
      }, 0);
    }

    var toggled = e.target && e.target.closest ? e.target.closest('.order-side-tab, #tab-limit, #tab-market') : null;
    if (toggled) {
      setTimeout(function(){
        clearOrderDraftInputs();
        afterSelectionSync();
      }, 0);
    }
  }, true);

  function boot(){
    updateMinAmountUiStrict();
    ensureMarketCurrentPriceButton();
    window.refreshOrderAvailableHintBySelection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
  window.addEventListener('load', boot, { once:true });
  setTimeout(boot, 150);
  setTimeout(boot, 700);
})();

if (typeof window.setOrderSide === 'function' && !window.__orderSideSubmitSyncWrapped) {
  var __oldSetOrderSideSubmitSync = window.setOrderSide;
  window.setOrderSide = function(side) {
    var result = __oldSetOrderSideSubmitSync.apply(this, arguments);
    syncOrderSubmitButtonsWithSideTabs();
    return result;
  };
  window.__orderSideSubmitSyncWrapped = true;
}

document.addEventListener('DOMContentLoaded', () => {
  syncMarketButtonsVisibility();
  bindMarketSubmitButtonSyncOnce();
  bindForceSyncOrderSideButtonsOnce();
});

