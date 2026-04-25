'use strict';

window.__homeRuntimeFetchPortfolioDetail = async function() {
  try {
    var results = await Promise.allSettled([
      authFetch('/api/balances'),
      authFetch('/api/positions'),
      authFetch('/bapi/balances'),
      authFetch('/bapi/positions'),
      authFetch('/rebalancing/strategies')
    ]);
    var upBalData   = results[0].status === 'fulfilled' && results[0].value ? await results[0].value.json() : null;
    var upPosData   = results[1].status === 'fulfilled' && results[1].value ? await results[1].value.json() : null;
    var btBalData   = results[2].status === 'fulfilled' && results[2].value ? await results[2].value.json() : null;
    var btPosData   = results[3].status === 'fulfilled' && results[3].value ? await results[3].value.json() : null;
    var rebalData   = results[4].status === 'fulfilled' && results[4].value ? await results[4].value.json() : null;

    renderPfExchange('upbit',   upBalData, upPosData);
    renderPfExchange('bithumb', btBalData, btPosData);
    renderPortfolioRebal(rebalData);
  } catch(e) {
    console.error('[PF] 로드 오류:', e);
  }
};

window.fetchPortfolioDetail = async function fetchPortfolioDetail() {
  return window.__homeRuntimeFetchPortfolioDetail.apply(this, arguments);
};

window.__homeRuntimeRenderPortfolioRebal = function(rebalData) {
  var el = document.getElementById('pf-rebal-summary');
  if (!rebalData || !rebalData.strategies || !rebalData.strategies.length) {
    el.innerHTML = '<div class="empty" style="padding:10px 0">리밸런싱 전략 없음 &middot; <a onclick="switchGrid();switchGridTab(\'rebal\')" style="color:var(--accent);cursor:pointer">만들기 &rarr;</a></div>';
    return;
  }
  var fs = 'clamp(12px,1.1vw,16px)';
  var fsS = 'clamp(10px,0.9vw,13px)';
  el.innerHTML = rebalData.strategies.filter(function(s) { return s.status !== 'STOPPED'; }).map(function(s) {
    var exColor = (s.exchange === 'bithumb') ? '#ea580c' : '#2563eb';
    var exName  = (s.exchange === 'bithumb') ? 'Bithumb' : 'Upbit';
    var statusColor = s.status === 'ACTIVE' ? '#4ade80' : '#f59e0b';
    var assetCount = s.assets ? s.assets.length : 0;
    return '<div style="display:flex;align-items:center;gap:0;padding:clamp(10px,1.2vh,16px) clamp(12px,1.2vw,18px);background:var(--bg3);border-radius:10px;margin-bottom:8px;overflow:hidden">' +
      '<div style="width:4px;height:100%;background:' + exColor + ';border-radius:2px;margin-right:14px;align-self:stretch;flex-shrink:0"></div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          '<span style="font-size:' + fsS + ';font-weight:700;color:' + exColor + '">' + exName + '</span>' +
          '<span style="font-size:' + fs + ';font-weight:800;color:var(--text)">' + s.name + '</span>' +
          '<span style="font-size:' + fsS + ';font-weight:700;color:' + statusColor + ';margin-left:auto">' + (s.status==='ACTIVE'?'● 실행 중':'● 정지') + '</span>' +
        '</div>' +
        '<div style="font-size:' + fsS + ';color:var(--text3)">' +
          assetCount + '종목 · ' + (s.rebal_count||0) + '회 실행' +
          (s.last_rebal_at ? ' · ' + new Date(s.last_rebal_at).toLocaleDateString('ko-KR') : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
};

window.renderPortfolioRebal = function renderPortfolioRebal(rebalData) {
  return window.__homeRuntimeRenderPortfolioRebal.apply(this, arguments);
};

window.__homeRuntimeRenderPfExchange = function(exchange, balData, posData) {
  var isUpbit = exchange === 'upbit';
  var prefix  = isUpbit ? 'pf-upbit' : 'pf-bithumb';
  var accentColor = isUpbit ? '#2563eb' : '#ea580c';

  function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원'; }
  function setPnl(id, val) {
    var el = document.getElementById(id); if (!el) return;
    el.style.color = val > 0 ? 'var(--rise)' : val < 0 ? 'var(--fall)' : 'var(--text3)';
    el.textContent = (val > 0 ? '+' : '') + fmt(val);
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  if (!balData || balData.no_key) {
    var totalEl = document.getElementById(prefix + '-total');
    if (totalEl) { totalEl.textContent = '미연결'; totalEl.style.color = 'var(--text3)'; }
    var stEl = document.getElementById(prefix + '-status');
    if (stEl) { stEl.textContent = '● 미연결'; stEl.style.color = 'var(--text3)'; }
    var canvas = document.getElementById(prefix + '-donut');
    if (canvas) {
      var size = canvas.offsetWidth || 100;
      canvas.width = size * 2; canvas.height = size * 2;
      var ctx = canvas.getContext('2d');
      var W = canvas.width, H = canvas.height;
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.42, 0, Math.PI*2);
      ctx.fillStyle = '#21262d'; ctx.fill();
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.26, 0, Math.PI*2);
      ctx.fillStyle = '#161b22'; ctx.fill();
      ctx.fillStyle = '#484f58'; ctx.font = 'bold ' + Math.round(W*0.11) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('미연결', W/2, H/2);
    }
    return;
  }

  var krw = balData.krw_available || 0;
  var positions = posData && posData.positions ? posData.positions : [];
  var coinEval = positions.reduce(function(s,p){ return s+(p.eval_amount||0); }, 0);
  var invest   = positions.reduce(function(s,p){ return s+(p.invest_amount||0); }, 0);
  var pnl      = coinEval - invest;
  var total    = krw + coinEval;

  var stEl = document.getElementById(prefix + '-status');
  if (stEl) { stEl.textContent = '● 연결됨'; stEl.style.color = '#4ade80'; }
  setText(prefix + '-total', fmt(total));
  setText(prefix + '-krw',   fmt(krw));
  setText(prefix + '-coin-eval', fmt(coinEval));
  setPnl(prefix + '-pnl', pnl);

  var canvas = document.getElementById(prefix + '-donut');
  if (canvas && total > 0) {
    var size = canvas.offsetWidth || 100;
    canvas.width = size * 2;
    canvas.height = size * 2;
    var ctx = canvas.getContext('2d');
    var items = [{ val: krw, color: '#F59E0B' }];
    var colors = ['#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399','#e879f9','#38bdf8'];
    positions.forEach(function(p, i) {
      items.push({ val: p.eval_amount||0, color: colors[i % colors.length] });
    });
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var startAngle = -Math.PI / 2;
    var cx = W/2, cy = H/2, r = W*0.42, innerR = W*0.26;
    items.forEach(function(item) {
      var slice = (item.val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      startAngle += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#161b22';
    ctx.fill();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold ' + Math.round(W*0.12) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(positions.length + '종목', cx, cy);
  }

  var weightsEl = document.getElementById(prefix + '-weights');
  if (weightsEl && total > 0) {
    var wItems = [{ name: 'KRW', val: krw, color: '#F59E0B', pnl: 0 }];
    var wColors = ['#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399'];
    positions.forEach(function(p, i) {
      wItems.push({ name: p.currency, val: p.eval_amount||0, color: wColors[i%wColors.length], pnl: p.pnl_pct||0 });
    });
    var fs = 'clamp(10px,0.9vw,13px)';
    weightsEl.innerHTML = wItems.map(function(item) {
      var pct = (item.val / total * 100);
      var pnlColor = item.pnl > 0 ? 'var(--rise)' : item.pnl < 0 ? 'var(--fall)' : 'var(--text3)';
      var pnlStr = item.name === 'KRW' ? '' : (item.pnl >= 0 ? '+' : '') + item.pnl.toFixed(1) + '%';
      return '<div style="display:grid;grid-template-columns:clamp(50px,5vw,80px) 1fr clamp(45px,4vw,65px) clamp(45px,4vw,60px);gap:6px;align-items:center;padding:3px 0">' +
        '<div style="font-size:' + fs + ';font-weight:700;color:var(--text)">' + item.name + '</div>' +
        '<div style="background:var(--bg4);border-radius:3px;height:6px;overflow:hidden"><div style="width:' + Math.min(pct,100).toFixed(1) + '%;height:100%;background:' + item.color + ';border-radius:3px"></div></div>' +
        '<div style="text-align:right;font-size:' + fs + ';font-weight:700;color:var(--text)">' + pct.toFixed(1) + '%</div>' +
        '<div style="text-align:right;font-size:' + fs + ';color:' + pnlColor + ';font-weight:700">' + pnlStr + '</div>' +
      '</div>';
    }).join('');
  }

  var posEl = document.getElementById(prefix + '-positions');
  if (posEl) {
    if (!positions.length) {
      posEl.innerHTML = '<div class="empty" style="font-size:11px;padding:8px 0">보유 포지션 없음</div>';
      return;
    }
    var fs2 = 'clamp(11px,1vw,15px)';
    var fsS2 = 'clamp(9px,0.85vw,12px)';
    var pd2 = 'clamp(9px,1.1vh,14px) clamp(8px,0.9vw,14px)';
    var rows = positions.map(function(p) {
      var pnlColor = (p.pnl_pct||0) >= 0 ? 'var(--rise)' : 'var(--fall)';
      var pnlSign  = (p.pnl_pct||0) >= 0 ? '+' : '';
      return '<tr class="pf-pos-r" onclick="window._portfolioTarget={exchange:\'' + exchange + '\',symbol:\'KRW-' + p.currency + '\'};switchExchange(\'' + exchange + '\')" style="border-bottom:1px solid var(--border2);cursor:pointer">' +
        '<td style="padding:' + pd2 + ';font-weight:700;font-size:' + fs2 + ';color:var(--text)">' + p.currency +
          '<div style="font-size:' + fsS2 + ';color:var(--text3);font-weight:400">' + (p.korean_name||'') + '</div></td>' +
        '<td style="padding:' + pd2 + ';text-align:right;color:var(--text2);font-size:' + fsS2 + '">' + (p.qty||'-') + '</td>' +
        '<td style="padding:' + pd2 + ';text-align:right;color:var(--text2);font-size:' + fs2 + '">' + Number(p.avg_buy_price||0).toLocaleString() + '</td>' +
        '<td style="padding:' + pd2 + ';text-align:right;font-weight:700;font-size:' + fs2 + ';color:var(--text)">' + fmt(p.eval_amount||0) + '</td>' +
        '<td style="padding:' + pd2 + ';text-align:right;font-weight:700;color:' + pnlColor + '">' +
          '<div style="font-size:' + fs2 + '">' + pnlSign + (p.pnl_pct||0).toFixed(2) + '%</div>' +
          '<div style="font-size:' + fsS2 + ';margin-top:1px">' + pnlSign + Number(p.pnl_amount||0).toLocaleString() + '원</div>' +
        '</td>' +
      '</tr>';
    }).join('');
    posEl.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--bg3)">' +
      '<th style="padding:' + pd2 + ';text-align:left;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">종목</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">수량</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">평균단가</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">평가금액</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">손익</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
    posEl.querySelectorAll('.pf-pos-r').forEach(function(r) {
      r.addEventListener('mouseover', function(){ this.style.background = 'var(--bg3)'; });
      r.addEventListener('mouseout',  function(){ this.style.background = ''; });
    });
  }
};

window.renderPfExchange = function renderPfExchange(exchange, balData, posData) {
  return window.__homeRuntimeRenderPfExchange.apply(this, arguments);
};

window.__homeRuntimeSwitchSimulation = function() {
  hideAllMainPanels();
  clearTopTabs();
  var tab = document.getElementById('tab-sim');
  if (tab) tab.classList.add('active');
  var panel = document.getElementById('simulation-panel');
  if (panel) panel.style.display = 'block';
};

window.switchSimulation = function switchSimulation() {
  return window.__homeRuntimeSwitchSimulation.apply(this, arguments);
};

window.__homeRuntimeSwitchPortfolio = function() {
  hideAllMainPanels();

  var panel = document.getElementById('portfolio-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();

  var tab = document.getElementById('tab-portfolio');
  if (tab) tab.classList.add('active');

  if (typeof fetchPortfolioDetail === 'function') fetchPortfolioDetail();
};

window.switchPortfolio = function switchPortfolio() {
  return window.__homeRuntimeSwitchPortfolio.apply(this, arguments);
};
