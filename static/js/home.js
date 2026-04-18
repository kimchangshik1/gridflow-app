'use strict';

window.countActiveStrategiesSafe = function(data) {
  return (data && data.strategies ? data.strategies.filter(isStrategyActuallyActive).length : 0);
};

window.__homeRuntimeRefreshGlobalTopStats = async function() {
  try {
    var results = await Promise.allSettled([
      authFetch('/api/balances'),
      authFetch('/api/positions'),
      authFetch('/bapi/balances'),
      authFetch('/bapi/positions'),
      authFetch('/grid/strategies'),
      authFetch('/dca/strategies'),
      authFetch('/rebalancing/strategies')
    ]);

    var upBalData = results[0].value && results[0].value.ok ? await results[0].value.json() : null;
    var upPosData = results[1].value && results[1].value.ok ? await results[1].value.json() : null;
    var btBalData = results[2].value && results[2].value.ok ? await results[2].value.json() : null;
    var btPosData = results[3].value && results[3].value.ok ? await results[3].value.json() : null;
    var gridData  = results[4].value && results[4].value.ok ? await results[4].value.json() : null;
    var dcaData   = results[5].value && results[5].value.ok ? await results[5].value.json() : null;
    var rebalData = results[6].value && results[6].value.ok ? await results[6].value.json() : null;

    var upKrw = upBalData && upBalData.krw_available ? upBalData.krw_available : 0;
    var btKrw = btBalData && btBalData.krw_available ? btBalData.krw_available : 0;

    var upPositions = upPosData && upPosData.positions ? upPosData.positions : [];
    var btPositions = btPosData && btPosData.positions ? btPosData.positions : [];

    var upEval = upPositions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);
    var btEval = btPositions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);

    var totalKrw = Math.floor(upKrw + btKrw);
    var totalEval = Math.floor(upKrw + btKrw + upEval + btEval);
    var totalActive = countActiveStrategiesSafe(gridData) + countActiveStrategiesSafe(dcaData) + countActiveStrategiesSafe(rebalData);

    var krwEl = document.getElementById('krw-balance');
    if (krwEl) krwEl.textContent = totalKrw.toLocaleString('ko-KR') + (_lang === 'ko' ? '원' : ' KRW');

    var evalEl = document.getElementById('total-eval');
    if (evalEl) evalEl.textContent = totalEval.toLocaleString('ko-KR') + (_lang === 'ko' ? '원' : ' KRW');

    var activeEl = document.getElementById('active-count');
    if (activeEl) activeEl.textContent = totalActive;

    var activeLbl = document.getElementById('active-count-lbl');
    if (activeLbl) activeLbl.textContent = _lang === 'ko' ? '활성 전략' : 'Active Strategies';
  } catch (e) {
    console.error('[TOP] 글로벌 요약 갱신 실패:', e);
  }
};

window.refreshGlobalTopStats = async function refreshGlobalTopStats() {
  return window.__homeRuntimeRefreshGlobalTopStats.apply(this, arguments);
};

window.renderDashStatus = function(gridData, dcaData, rebalData) {
  /* ── S1: 단일 기준 — 전략 status 필드 기반으로 배너·봇상태 동시 판정 ── */
  var warnings = [];
  var errors   = [];
  var statusBar = document.getElementById('dash-status-bar');
  var statusText = document.getElementById('dash-status-text');

  var gridPaused  = gridData  && gridData.strategies  ? gridData.strategies.filter(function(s){ return s.status === 'PAUSED'; }).length : 0;
  var dcaPaused   = dcaData   && dcaData.strategies   ? dcaData.strategies.filter(function(s){ return s.status === 'PAUSED'; }).length : 0;
  var gridError   = gridData  && gridData.strategies  ? gridData.strategies.filter(function(s){ return s.status === 'ERROR'; }).length : 0;
  var dcaError    = dcaData   && dcaData.strategies   ? dcaData.strategies.filter(function(s){ return s.status === 'ERROR'; }).length : 0;
  var rebalError  = rebalData && rebalData.strategies ? rebalData.strategies.filter(function(s){ return s.status === 'ERROR'; }).length : 0;
  var totalError  = gridError + dcaError + rebalError;

  if (gridError  > 0) errors.push('그리드 오류 ' + gridError + '개');
  if (dcaError   > 0) errors.push('DCA 오류 '   + dcaError  + '개');
  if (rebalError > 0) errors.push('리밸런싱 오류 ' + rebalError + '개');
  if (gridPaused > 0) warnings.push('일시정지된 그리드 ' + gridPaused + '개');
  if (dcaPaused  > 0) warnings.push('일시정지된 DCA '   + dcaPaused  + '개');

  /* 배너 레벨: error > warning > normal */
  var bannerStatus, bannerLabel, bannerMsg;
  if (errors.length > 0) {
    bannerStatus = 'error';
    bannerLabel  = '오류 감지';
    bannerMsg    = errors.join(' · ') + ' — 전략 탭에서 확인하세요';
  } else if (warnings.length > 0) {
    bannerStatus = 'warning';
    bannerLabel  = '주의 필요';
    bannerMsg    = warnings.join(' · ') + ' — 전략 탭에서 확인하세요';
  } else {
    bannerStatus = 'normal';
    bannerLabel  = '정상 운영 중';
    bannerMsg    = '모든 전략이 정상적으로 작동하고 있습니다.';
  }

  var isOk = errors.length === 0 && warnings.length === 0;
  var dot = statusBar ? statusBar.querySelector('.home-status-dot') : null;
  var statusBarClass  = isOk ? 'home-status-bar ok'   : 'home-status-bar warn';
  var statusTextValue = errors.length > 0
    ? ('⚠ ' + errors.join(' · '))
    : warnings.length > 0
      ? ('⚠ ' + warnings.join(' · '))
      : '모든 전략 정상 작동 중';
  var dotClass = isOk ? 'home-status-dot on' : 'home-status-dot warn';
  if (statusBar && statusBar.className !== statusBarClass) statusBar.className = statusBarClass;
  if (statusText && statusText.textContent !== statusTextValue) statusText.textContent = statusTextValue;
  if (dot && dot.className !== dotClass) dot.className = dotClass;

  var overallEl = document.getElementById('dash-exchange-overall');
  var overallText  = isOk ? '정상 연결됨' : '주의 필요';
  var overallColor = isOk ? 'var(--color-normal)' : 'var(--color-warning)';
  if (overallEl) {
    if (overallEl.textContent !== overallText)  overallEl.textContent = overallText;
    if (overallEl.style.color !== overallColor) overallEl.style.color = overallColor;
  }

  var syncEl = document.getElementById('dash-last-sync');
  if (syncEl) {
    var now = new Date();
    syncEl.textContent = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
  }

  var updEl = document.getElementById('dash-update-time');
  if (updEl) {
    var n2 = new Date();
    updEl.textContent = '업데이트 ' + (n2.getHours() < 10 ? '0' : '') + n2.getHours() + ':' + (n2.getMinutes() < 10 ? '0' : '') + n2.getMinutes();
  }

  /* 글로벌 배너 */
  if (typeof updateGlobalBanner === 'function') {
    updateGlobalBanner(bannerStatus, bannerLabel, bannerMsg);
  }

  /* #bot-status 동기화: 동일 전략 데이터 기반 */
  var botEl = document.getElementById('bot-status');
  if (botEl) {
    var botText, botColor;
    if (totalError > 0) {
      botText  = '● 오류 감지';
      botColor = '#EF4444';
    } else {
      var totalActive = countActiveStrategiesSafe(gridData) + countActiveStrategiesSafe(dcaData) + countActiveStrategiesSafe(rebalData);
      if (totalActive > 0) {
        botText  = '● 실행 중';
        botColor = '#10B981';
      } else if (warnings.length > 0) {
        botText  = '● 일시정지 포함';
        botColor = '#F59E0B';
      } else {
        botText  = '● 대기 중';
        botColor = '#4B5563';
      }
    }
    if (botEl.textContent !== botText)  botEl.textContent = botText;
    if (botEl.style.color !== botColor) botEl.style.color = botColor;
  }
};

window.renderDashRecentLogs = function(logData) {
  var el = document.getElementById('dash-recent-logs');
  var html = '';
  if (!logData || !logData.logs || !logData.logs.length) {
    html = '<div class="home-log-entry"><span class="home-log-time">--:--</span><span class="home-log-text" style="color:var(--text3)">최근 활동 없음</span></div>';
    if (window.__dashRecentLogsLastHTML === html) return;
    window.__dashRecentLogsLastHTML = html;
    el.innerHTML = html;
    return;
  }
  html = logData.logs.slice(0,20).map(function(l) {
    var dt = new Date(l.at);
    var timeStr = String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0');
    var sym = l.symbol ? ((_koreanMap && _koreanMap[l.symbol]) || l.symbol.replace('KRW-','')) : '-';
    var exBadge = l.exchange === 'bithumb' ? '<span style="font-size:9px;color:#f59e0b;margin-left:3px">빗썸</span>' : '<span style="font-size:9px;color:#60a5fa;margin-left:3px">업비트</span>';
    if (l.event_type === 'strategy') {
      var evtColor = l.status === 'ACTIVE' ? '#4ade80' : l.status === 'PAUSED' ? '#f59e0b' : '#f87171';
      return '<div class="home-log-entry">' +
        '<span class="home-log-time">' + timeStr + '</span>' +
        '<span class="home-log-text" style="color:var(--text3)">' +
          '<span style="color:#f59e0b;font-weight:600">' + (l.strategy_type||'전략') + '</span>' +
          ' ' + sym + ' ' + exBadge.replace('margin-left:3px','') +
          ' <span style="color:' + evtColor + ';font-weight:600">' + (l.status_ko||'') + '</span>' +
        '</span>' +
      '</div>';
    }
    var isBuy = l.side === 'BUY';
    var sideClass = isBuy ? 'buy' : 'sell';
    var amtStr = Number(l.amount_krw||0).toLocaleString() + '원';
    return '<div class="home-log-entry">' +
      '<span class="home-log-time">' + timeStr + '</span>' +
      '<span class="home-log-text ' + sideClass + '">' + sym + ' ' + (l.side_ko||'') + '</span>' +
      exBadge +
      '<span style="font-size:10px;color:var(--text3);margin-left:4px">' + amtStr + '</span>' +
      '<span style="font-size:10px;margin-left:4px;color:' + (l.status==='FILLED'?'var(--rise)':l.status==='CANCELLED'?'var(--text3)':'var(--accent)') + '">' + (l.status_ko||'') + '</span>' +
    '</div>';
  }).join('');
  if (window.__dashRecentLogsLastHTML === html) return;
  window.__dashRecentLogsLastHTML = html;
  el.innerHTML = html;
};

window.renderDashFilledLogs = function(logData) {
  var el = document.getElementById('hap-pane-filled');
  if (!el) return;

  var logs = logData && logData.logs ? logData.logs.filter(function(l) {
    return l.event_type === 'manual_order' && l.status === 'FILLED';
  }) : [];

  var html = '';
  if (!logs.length) {
    html = '<div class="hap-empty">체결 내역 없음</div>';
    if (window.__dashFilledLogsLastHTML === html) return;
    window.__dashFilledLogsLastHTML = html;
    el.innerHTML = html;
    return;
  }

  html = logs.slice(0,20).map(function(l) {
    var dt = new Date(l.at);
    var timeStr = String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0');
    var sym = l.symbol ? ((_koreanMap && _koreanMap[l.symbol]) || l.symbol.replace('KRW-','')) : '-';
    var isBuy = l.side === 'BUY';
    var sideClass = isBuy ? 'buy' : 'sell';
    var exBadge = l.exchange === 'bithumb' ? '<span style="font-size:9px;color:#f59e0b;margin-left:3px">빗썸</span>' : '<span style="font-size:9px;color:#60a5fa;margin-left:3px">업비트</span>';
    var amtStr = Number(l.amount_krw || 0).toLocaleString('ko-KR') + '원';
    return '<div class="home-log-entry">' +
      '<span class="home-log-time">' + timeStr + '</span>' +
      '<span class="home-log-text ' + sideClass + '">' + sym + ' ' + (l.side_ko || '') + '</span>' +
      exBadge +
      '<span style="font-size:10px;color:var(--text3);margin-left:4px">' + amtStr + '</span>' +
      '<span style="font-size:10px;margin-left:4px;color:var(--rise)">' + (l.status_ko || '체결완료') + '</span>' +
    '</div>';
  }).join('');

  if (window.__dashFilledLogsLastHTML === html) return;
  window.__dashFilledLogsLastHTML = html;
  el.innerHTML = html;
};

window.renderDashErrorLogs = function(logData) {
  var el = document.getElementById('hap-pane-error');
  if (!el) return;

  var logs = logData && logData.logs ? logData.logs.filter(function(l) {
    return l.status === 'FAILED';
  }) : [];

  var html = '';
  if (!logs.length) {
    html = '<div class="hap-empty">오류 없음</div>';
    if (window.__dashErrorLogsLastHTML === html) return;
    window.__dashErrorLogsLastHTML = html;
    el.innerHTML = html;
    return;
  }

  html = logs.slice(0,20).map(function(l) {
    var dt = new Date(l.at);
    var timeStr = String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0');
    var sym = l.symbol ? ((_koreanMap && _koreanMap[l.symbol]) || l.symbol.replace('KRW-','')) : '-';
    var exBadge = l.exchange === 'bithumb' ? '<span style="font-size:9px;color:#f59e0b;margin-left:3px">빗썸</span>' : '<span style="font-size:9px;color:#60a5fa;margin-left:3px">업비트</span>';
    // S3: order_fail도 side_ko("매수"/"매도") 기반 label로 통일 — status_ko는 reason으로만 사용
    var sideLabel = l.side_ko || (l.side === 'BUY' ? '매수' : l.side === 'SELL' ? '매도' : '');
    var label = (l.event_type === 'manual_order' || l.event_type === 'order_fail')
      ? sym + ' ' + sideLabel + ' 주문실패'
      : sym + ' ' + (l.status_ko || '실패');
    var priceStr = l.price ? Number(l.price).toLocaleString('ko-KR') + '원' : '-';
    // S3: failure_reason이 있고 label과 중복이 아닐 때만 표시 (구버전 "주문실패" 문자열 제외)
    var rawReason = l.failure_reason || '';
    var failureReason = (rawReason && rawReason !== '주문실패')
      ? String(rawReason).replace(/[&<>"']/g, function(c) {
          return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        })
      : '';
    return '<div class="home-log-entry">' +
      '<span class="home-log-time">' + timeStr + '</span>' +
      '<span class="home-log-text" style="color:var(--color-error)">' + label + '</span>' +
      exBadge +
      '<span style="font-size:10px;color:var(--text3);margin-left:4px">@' + priceStr + '</span>' +
      '<span style="font-size:10px;color:var(--text3);margin-left:4px">' + Number(l.amount_krw || 0).toLocaleString('ko-KR') + '원</span>' +
      (failureReason ? '<span style="font-size:10px;color:var(--color-warning);margin-left:4px">' + failureReason + '</span>' : '') +
    '</div>';
  }).join('');

  if (window.__dashErrorLogsLastHTML === html) return;
  window.__dashErrorLogsLastHTML = html;
  el.innerHTML = html;
};

window.renderHomePosTable = function(posData) {
  var el = document.getElementById('dash-pos-list');
  if (!el) return;
  var positions = posData && posData.positions ? posData.positions : [];

  if (positions.length === 0) {
    el.innerHTML = '<div class="hpp-empty">' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:8px;font-weight:600">활성 포지션 없음.</div>' +
      '<button onclick="switchExchange(\'upbit\')" style="padding:6px 16px;background:var(--color-info);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">거래 화면으로 이동</button>' +
    '</div>';
    return;
  }

  var sorted = positions.slice().sort(function(a,b){ return Math.abs(b.pnl_amount||0) - Math.abs(a.pnl_amount||0); });

  function fmtPnl(n){ n=n||0; return (n>=0?'+':'')+Math.floor(n).toLocaleString('ko-KR')+'원'; }
  function fmtQty(n){ if(n==null||n===undefined) return '-'; var v=Number(n); return v.toFixed(4).replace(/\.?0+$/,''); }

  el.innerHTML = sorted.map(function(p) {
    var sym = p.currency || ((p.symbol||'').replace('KRW-',''));
    var kname = p.korean_name || sym;
    var exName = p.exchange==='bithumb'?'빗썸':'업비트';
    var pct = Number(p.pnl_pct || 0);
    var pnl = Number(p.pnl_amount || 0);
    var pctColor = pct>0?'color:var(--color-normal)':pct<0?'color:var(--color-error)':'color:var(--text3)';
    return '<div class="hpp-row hpp-cols">' +
      '<div class="hpp-cell" style="display:flex;flex-direction:column;gap:1px">' +
        '<span style="font-size:13px;font-weight:700;color:var(--text)">' + sym + '</span>' +
        '<span style="font-size:10px;color:var(--text3)">' + kname + '</span>' +
      '</div>' +
      '<div class="hpp-cell">' + exName + '</div>' +
      '<div class="hpp-cell" style="color:var(--text3)">-</div>' +
      '<div class="hpp-cell r" style="'+pctColor+'">' + (pct>=0?'+':'') + pct.toFixed(2) + '%</div>' +
      '<div class="hpp-cell r" style="'+pctColor+'">' + fmtPnl(pnl) + '</div>' +
      '<div class="hpp-cell r">' + fmtQty(p.qty) + '</div>' +
      '<div class="hpp-cell r">' +
        '<button onclick="switchExchange(\''+p.exchange+'\')" style="padding:2px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);color:var(--text3);background:rgba(255,255,255,0.05)">상세</button>' +
      '</div>' +
    '</div>';
  }).join('');
};

window.renderDashPositions = function(posData) {
  var el = document.getElementById('dash-positions');
  var positions = posData && posData.positions ? posData.positions : [];
  var html = '';
  if (!positions.length) {
    html = '<div class="empty" style="padding:10px 0;font-size:11px">보유 포지션 없음</div>';
    if (window.__dashPositionsLastHTML === html) return;
    window.__dashPositionsLastHTML = html;
    el.innerHTML = html;
    renderHomePosTable(posData);
    return;
  }
  positions.slice(0,6).forEach(function(p) {
    var pct = Number(p.pnl_pct || 0);
    var pnl = Number(p.pnl_amount || 0);
    var avgPrice = Number(p.avg_buy_price || 0);
    var pctColor = pct > 0 ? 'var(--rise)' : pct < 0 ? 'var(--fall)' : 'var(--text3)';
    var sign = pct >= 0 ? '+' : '';
    var pnlSign = pnl >= 0 ? '+' : '';
    var exKey  = p.exchange === 'bithumb' ? 'bithumb' : 'upbit';
    var exName = p.exchange === 'bithumb' ? '빗썸' : '업비트';
    html += '<div class="dash-pos-row" data-exchange="' + exKey + '" style="display:grid;grid-template-columns:52px 1fr 60px 72px;gap:4px;padding:clamp(9px,1.2vh,15px) 6px;border-bottom:1px solid var(--border2);align-items:center;cursor:pointer;border-radius:6px;transition:background 0.12s">' +
      '<div><div style="font-size:clamp(13px,1.2vw,18px);font-weight:700;color:var(--text)">' + p.currency + '</div>' +
        '<div style="font-size:clamp(9px,0.8vw,12px);color:var(--text3);margin-top:2px">' + exName + '</div></div>' +
      '<div><div style="font-size:clamp(11px,1vw,15px);font-weight:600;color:var(--text)">' + (avgPrice>0?Number(avgPrice).toLocaleString():'—') + '</div>' +
        '<div style="font-size:clamp(9px,0.8vw,12px);color:var(--text3);margin-top:2px">' + (p.korean_name||'') + '</div></div>' +
      '<div style="text-align:right;font-size:clamp(12px,1.1vw,16px);font-weight:700;color:' + pctColor + '">' + sign + pct.toFixed(2) + '%</div>' +
      '<div style="text-align:right;font-size:clamp(12px,1.1vw,16px);font-weight:700;color:' + pctColor + '">' + pnlSign + Number(pnl).toLocaleString() + '</div>' +
    '</div>';
  });
  if (positions.length > 6) html += '<div style="font-size:10px;color:var(--text3);padding-top:6px;text-align:center">외 ' + (positions.length-6) + '종목 더보기 →</div>';
  if (window.__dashPositionsLastHTML === html) return;
  window.__dashPositionsLastHTML = html;
  el.innerHTML = html;
  el.querySelectorAll('.dash-pos-row').forEach(function(row) {
    var exKey = row.dataset.exchange;
    row.addEventListener('mouseover', function(){ this.style.background = 'var(--bg3)'; });
    row.addEventListener('mouseout',  function(){ this.style.background = ''; });
    row.addEventListener('click', function(){ if(typeof switchExchange==='function') switchExchange(exKey); });
  });
  renderHomePosTable(posData);
};

window.renderDashTop = function(balData, posData, gridData, dcaData, rebalData) {
  var krw = balData ? (balData.krw_available || 0) : 0;
  var positions = posData && posData.positions ? posData.positions : [];
  var coinEval = positions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);
  var totalEval = balData && balData.total_eval_amount ? balData.total_eval_amount : (krw + coinEval);
  var totalPnl = positions.reduce(function(s,p){ return s + (p.pnl_amount || 0); }, 0);

  var gridActive = countActiveStrategiesSafe(gridData);
  var dcaActive = countActiveStrategiesSafe(dcaData);
  var rebalActive = countActiveStrategiesSafe(rebalData);
  var totalActive = gridActive + dcaActive + rebalActive;

  var krwEl = document.getElementById('dash-krw');
  if (krwEl) krwEl.textContent = Number(krw).toLocaleString() + '원';

  var evalEl = document.getElementById('dash-total-eval');
  if (evalEl) evalEl.textContent = Number(totalEval).toLocaleString() + '원';

  var pnlEl = document.getElementById('dash-total-pnl');
  if (pnlEl) {
    var ps = totalPnl >= 0 ? '+' : '';
    pnlEl.style.color = totalPnl >= 0 ? 'var(--rise)' : 'var(--fall)';
    pnlEl.textContent = ps + Number(totalPnl).toLocaleString() + '원';
  }

  var activeEl = document.getElementById('dash-active-strategies');
  if (activeEl) activeEl.textContent = totalActive + '개';

  var detailEl = document.getElementById('dash-strategy-detail');
  if (detailEl) detailEl.textContent = 'Grid ' + gridActive + ' · DCA ' + dcaActive + ' · Rebal ' + rebalActive;

  var posEl = document.getElementById('dash-position-count');
  if (posEl) posEl.textContent = positions.length + '종목';

  var posDetailEl = document.getElementById('dash-position-detail');
  if (posDetailEl) posDetailEl.textContent = '업비트+빗썸 합산';
};

window.renderDashExchange = function(upBalData, upPosData, btBalData, btPosData) {
  function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원'; }
  function setPnl(id, val) {
    var el = document.getElementById(id); if (!el) return;
    el.style.color = val > 0 ? '#EF4444' : val < 0 ? '#3B82F6' : '#6b7280';
    el.textContent = (val > 0 ? '+' : '') + fmt(val);
  }
  function setPct(id, pct) {
    var el = document.getElementById(id); if (!el) return;
    el.style.color = pct > 0 ? '#EF4444' : pct < 0 ? '#3B82F6' : '#6b7280';
    el.textContent = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원'; }
  function setPnl(id, val) {
    var el = document.getElementById(id); if (!el) return;
    var color = val > 0 ? '#EF4444' : val < 0 ? '#3B82F6' : '#6b7280';
    var text = (val > 0 ? '+' : '') + fmt(val);
    if (el.style.color !== color) el.style.color = color;
    if (el.textContent !== text) el.textContent = text;
  }
  function setPct(id, pct) {
    var el = document.getElementById(id); if (!el) return;
    var color = pct > 0 ? '#EF4444' : pct < 0 ? '#3B82F6' : '#6b7280';
    var text = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
    if (el.style.color !== color) el.style.color = color;
    if (el.textContent !== text) el.textContent = text;
  }
  function setText(id, val) { var el = document.getElementById(id); if (el && el.textContent !== val) el.textContent = val; }
  var upKrw = upBalData ? (upBalData.krw_available || 0) : 0;
  var upPos = upPosData && upPosData.positions ? upPosData.positions : [];
  var upEval = upPos.reduce(function(s,p){return s+(p.eval_amount||0);},0);
  var upInvest = upPos.reduce(function(s,p){return s+(p.invest_amount||0);},0);
  var upPnl = upEval - upInvest;
  var upPct = upInvest > 0 ? (upPnl/upInvest*100) : 0;
  setText('dash-upbit-value', fmt(upEval+upKrw));
  setText('dash-upbit-krw', fmt(upKrw));
  setText('dash-upbit-available', fmt(upKrw));
  setText('dash-upbit-invest', fmt(upInvest));
  setText('dash-upbit-eval', fmt(upEval));
  setPnl('dash-upbit-pnl', upPnl);
  setPct('dash-upbit-pnl-pct', upPct);
  setText('dash-upbit-holdings', upPos.length + '종목');
  var upSt = document.getElementById('dash-upbit-status');
  if (upSt) {
    var upStText = (upBalData&&!upBalData.no_key)?'● 연결됨':'● 미연결';
    var upStColor = (upBalData&&!upBalData.no_key)?'#22c55e':'#f59e0b';
    if (upSt.textContent !== upStText) upSt.textContent = upStText;
    if (upSt.style.color !== upStColor) upSt.style.color = upStColor;
  }
  var btKrw = btBalData ? (btBalData.krw_available || 0) : 0;
  var btPos = btPosData && btPosData.positions ? btPosData.positions : [];
  var btEval = btPos.reduce(function(s,p){return s+(p.eval_amount||0);},0);
  var btInvest = btPos.reduce(function(s,p){return s+(p.invest_amount||0);},0);
  var btPnl = btEval - btInvest;
  var btPct = btInvest > 0 ? (btPnl/btInvest*100) : 0;
  setText('dash-bithumb-value', fmt(btEval+btKrw));
  setText('dash-bithumb-krw', fmt(btKrw));
  setText('dash-bithumb-available', fmt(btKrw));
  setText('dash-bithumb-invest', fmt(btInvest));
  setText('dash-bithumb-eval', fmt(btEval));
  setPnl('dash-bithumb-pnl', btPnl);
  setPct('dash-bithumb-pnl-pct', btPct);
  setText('dash-bithumb-holdings', btPos.length + '종목');
  var btSt = document.getElementById('dash-bithumb-status');
  if (btSt) {
    var btStText = (btBalData&&!btBalData.no_key)?'● 연결됨':'● 미연결';
    var btStColor = (btBalData&&!btBalData.no_key)?'#22c55e':'#f59e0b';
    if (btSt.textContent !== btStText) btSt.textContent = btStText;
    if (btSt.style.color !== btStColor) btSt.style.color = btStColor;
  }
  var totalAsset = upEval + upKrw + btEval + btKrw;
  var totalInvest = upInvest + btInvest;
  var totalPnl = upPnl + btPnl;
  var totalPct = totalInvest > 0 ? (totalPnl / totalInvest * 100) : 0;
  setText('dash-total-asset', fmt(totalAsset));
  setText('dash-total-invest-display', fmt(totalInvest));
  setText('dash-total-available', fmt(upKrw + btKrw));
  setPnl('dash-total-pnl-display', totalPnl);
  setPct('dash-total-pct-display', totalPct);
  setText('row4-upbit-krw', fmt(upKrw));
  setText('row4-upbit-eval', fmt(upEval + upKrw));
  setText('row4-bithumb-krw', fmt(btKrw));
  setText('row4-bithumb-eval', fmt(btEval + btKrw));
  var r4uConn = document.getElementById('row4-upbit-conn');
  if (r4uConn) {
    var r4uText = (upBalData&&!upBalData.no_key)?'● 연결됨':'● 미연결';
    var r4uColor = (upBalData&&!upBalData.no_key)?'var(--color-normal)':'var(--color-warning)';
    if (r4uConn.textContent !== r4uText) r4uConn.textContent = r4uText;
    if (r4uConn.style.color !== r4uColor) r4uConn.style.color = r4uColor;
  }
  var r4bConn = document.getElementById('row4-bithumb-conn');
  if (r4bConn) {
    var r4bText = (btBalData&&!btBalData.no_key)?'● 연결됨':'● 미연결';
    var r4bColor = (btBalData&&!btBalData.no_key)?'var(--color-normal)':'var(--color-warning)';
    if (r4bConn.textContent !== r4bText) r4bConn.textContent = r4bText;
    if (r4bConn.style.color !== r4bColor) r4bConn.style.color = r4bColor;
  }
  var now4 = new Date(); var ts4 = (now4.getHours()<10?'0':'')+now4.getHours()+':'+(now4.getMinutes()<10?'0':'')+now4.getMinutes();
  setText('row4-upbit-sync', ts4); setText('row4-bithumb-sync', ts4);
};

window.__homeRuntimeRenderStrategyList = function(gridData, dcaData, rebalData) {
  var el = document.getElementById('dash-strategy-list');
  if (!el) return;

  var all = [];
  function collect(data, type) {
    if (data && data.strategies) data.strategies.forEach(function(s){ all.push(Object.assign({}, s, {_type: type})); });
  }
  collect(gridData, 'grid');
  collect(dcaData, 'dca');
  collect(rebalData, 'rebal');

  var ord = {ERROR:0, ACTIVE:1, PAUSED:2};
  all.sort(function(a,b){ return (ord[a.status] !== undefined ? ord[a.status] : 3) - (ord[b.status] !== undefined ? ord[b.status] : 3); });

  var running = all.filter(function(s){ return s.status === 'ACTIVE'; }).length;
  var paused  = all.filter(function(s){ return s.status === 'PAUSED'; }).length;
  var pending = all.filter(function(s){ return s.status === 'PLANNED' || s.status === 'PENDING'; }).length;
  var setT = function(id,v){ var e = document.getElementById(id); if (e) e.textContent = v; };
  setT('dash-str-running', running + '개');
  setT('dash-str-running-lbl', running + '개');
  setT('dash-str-paused', paused + '개');
  setT('dash-str-pending', pending + '개');
  var lastTs = all.reduce(function(m,s){ var t = s.updated_at || s.last_run_at || ''; return t > m ? t : m; }, '');
  if (lastTs) {
    var d = new Date(lastTs);
    setT('dash-str-last-change', (d.getMonth() + 1) + '/' + (d.getDate()) + ' ' + (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
  }

  if (all.length === 0) {
    el.innerHTML = '<div class="hsp-empty">' +
      '<div style="font-size:32px;margin-bottom:10px">⚡</div>' +
      '<div style="font-size:14px;color:var(--text2);margin-bottom:8px;font-weight:600">실행중인 전략이 없습니다.</div>' +
      '<button onclick="switchGrid();switchGridTab(\'grid\')" style="padding:8px 20px;background:var(--accent);color:#0A0B0D;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">전략 만들기</button>' +
    '</div>';
    return;
  }

  function typeLabel(t){ return t === 'grid' ? '그리드' : t === 'dca' ? '분할매수' : t === 'rebal' ? '리밸런싱' : t; }
  function fmtPnl(n){ n = n || 0; return (n >= 0 ? '+' : '') + Math.floor(n).toLocaleString('ko-KR') + '원'; }
  function fmtTime(s){ if (!s) return '-'; var d = new Date(s); return (d.getMonth() + 1) + '/' + (d.getDate()) + ' ' + (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }

  el.innerHTML = all.map(function(s) {
    var _sym = s.symbol ? String(s.symbol) : null;
    var sym = (_sym && _koreanMap && _koreanMap[_sym]) || (_sym ? _sym.replace('KRW-','') : (s.name ? String(s.name).split(' ')[0] : '-'));
    var exName = s.exchange === 'bithumb' ? '빗썸' : '업비트';
    var stCls = s.status === 'ACTIVE' ? 'running' : s.status === 'PAUSED' ? 'paused' : s.status === 'ERROR' ? 'error' : 'idle';
    var stTxt = s.status === 'ACTIVE' ? '실행중' : s.status === 'PAUSED' ? '일시정지' : s.status === 'ERROR' ? '오류' : s.status === 'PLANNED' ? '대기' : '미확인';
    var pnl = typeof s.total_profit === 'number' ? s.total_profit : typeof s.profit === 'number' ? s.profit : 0;
    var pnlStyle = pnl > 0 ? 'color:var(--color-normal)' : pnl < 0 ? 'color:var(--color-error)' : 'color:var(--text3)';
    var lastRun = fmtTime(s.last_run_at || s.last_rebal_at || s.updated_at);
    var name = s.name ? String(s.name) : (typeLabel(s._type) + ' #' + s.id);

    var mainBtn = '';
    if (s.status === 'ACTIVE' && (s._type === 'grid' || s._type === 'dca')) {
      var fn = s._type === 'grid' ? 'pauseGrid' : 'pauseDCA';
      mainBtn = '<button onclick="event.stopPropagation();' + fn + '(' + s.id + ')" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid var(--color-warning);color:var(--color-warning);background:rgba(245,158,11,0.1)">⏸ 정지</button>';
    } else if (s.status === 'PAUSED') {
      var fn2 = s._type === 'grid' ? 'resumeGrid' : s._type === 'dca' ? 'resumeDCA' : '';
      if (fn2) mainBtn = '<button onclick="event.stopPropagation();' + fn2 + '(' + s.id + ')" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid var(--color-normal);color:var(--color-normal);background:rgba(16,185,129,0.1)">▶ 재개</button>';
    } else if (s.status === 'ERROR') {
      mainBtn = '<button onclick="event.stopPropagation();switchGrid()" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid var(--color-error);color:var(--color-error);background:rgba(239,68,68,0.1)">⚠ 확인</button>';
    }
    var detailTabFn = s._type === 'dca' ? 'switchGrid();switchGridTab(\'dca\')' : s._type === 'rebal' ? 'switchGrid();switchGridTab(\'rebal\')' : 'switchGrid();switchGridTab(\'grid\')';
    var detailBtn = '<button onclick="event.stopPropagation();' + detailTabFn + '" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);color:var(--text3);background:rgba(255,255,255,0.05)">상세</button>';

    return '<div class="hsp-row">' +
      '<div class="hsp-cell name" title="' + name + '">' + name + '</div>' +
      '<div class="hsp-cell">' + exName + '</div>' +
      '<div class="hsp-cell">' + sym + '</div>' +
      '<div class="hsp-cell"><span class="status-badge ' + stCls + '">' + stTxt + '</span></div>' +
      '<div class="hsp-cell r" style="' + pnlStyle + '">' + fmtPnl(pnl) + '</div>' +
      '<div class="hsp-cell r">' + lastRun + '</div>' +
      '<div class="hsp-cell r" style="display:flex;gap:4px;justify-content:flex-end">' + mainBtn + detailBtn + '</div>' +
    '</div>';
  }).join('');
};

window.renderStrategyList = function renderStrategyList(gridData, dcaData, rebalData) {
  return window.__homeRuntimeRenderStrategyList.apply(this, arguments);
};

window.switchHapTab = function switchHapTab(tab) {
  document.querySelectorAll('.hap-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.hap-pane').forEach(function(p) { p.classList.remove('active'); });
  var activeTab = document.querySelector('.hap-tab[data-tab="' + tab + '"]');
  if (activeTab) activeTab.classList.add('active');
  var activePane = document.getElementById('hap-pane-' + tab);
  if (activePane) activePane.classList.add('active');
};

window.__homeRuntimeRenderDynamicCard = function(rebalData) {
  _lastRebalData = rebalData;
  var el = document.getElementById('home-dynamic-card-inner');
  if (!el) return;

  var rebalStrats = rebalData && rebalData.strategies
    ? rebalData.strategies.filter(function(s){ return s.status === 'ACTIVE'; })
    : [];

  if (rebalStrats.length > 0) {
    var rb = rebalStrats[0];
    var assets = rb.assets
      ? rb.assets.slice(0,4).map(function(a){ return a.symbol.replace('KRW-','') + '(' + a.target_pct + '%)'; }).join(' · ')
      : '-';
    var lastRebal = rb.last_rebal_at
      ? new Date(rb.last_rebal_at).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'})
      : '미실행';
    el.innerHTML =
      '<div class="hes-header"><div class="hes-title">🔄 리밸런싱 현황</div>' +
        '<span class="status-badge running">실행중</span>' +
      '</div>' +
      '<div class="hes-divider" style="margin:4px 0"></div>' +
      '<div class="hes-rows">' +
        '<div class="hes-row"><span class="hes-row-label">전략명</span><span class="hes-row-val">' + (rb.name || '-') + '</span></div>' +
        '<div class="hes-row"><span class="hes-row-label">종목 비중</span>' +
          '<span class="hes-row-val" style="font-size:11px;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + assets + '">' + assets + '</span>' +
        '</div>' +
        '<div class="hes-row"><span class="hes-row-label">마지막 실행</span><span class="hes-row-val">' + lastRebal + '</span></div>' +
        '<div class="hes-row"><span class="hes-row-label">실행중</span><span class="hes-row-val" style="color:var(--color-normal)">' + rebalStrats.length + '개</span></div>' +
      '</div>' +
      '<button class="hes-open-btn" onclick="switchGrid();switchGridTab(\'rebal\')">전략 상세 →</button>';
    return;
  }

  var activeStr = (document.getElementById('dash-str-running') || {}).textContent || '-';
  el.innerHTML =
    '<div class="hes-header"><div class="hes-title">🖥️ 시스템 상태</div>' +
      '<span class="status-badge running">정상</span>' +
    '</div>' +
    '<div class="hes-divider" style="margin:4px 0"></div>' +
    '<div class="hes-rows">' +
      '<div class="hes-row"><span class="hes-row-label">전체 상태</span><span class="hes-row-val" style="color:var(--color-normal)">정상 운영 중</span></div>' +
      '<div class="hes-row"><span class="hes-row-label">실행중 전략</span><span class="hes-row-val">' + activeStr + '</span></div>' +
      '<div class="hes-row"><span class="hes-row-label">오류</span><span class="hes-row-val" style="color:var(--color-inactive)">0건</span></div>' +
    '</div>' +
    '<div style="margin-top:auto;padding-top:8px;font-size:10px;color:var(--text3);text-align:center">' +
      '리밸런싱 또는 시뮬레이션 결과가 있으면 여기 표시됩니다' +
    '</div>';
};

window.renderDynamicCard = function renderDynamicCard(rebalData) {
  return window.__homeRuntimeRenderDynamicCard.apply(this, arguments);
};

window.__homeRuntimeRenderDashStrategies = function(gridData, dcaData, rebalData) {
  function fmtKrw(n) { return Number(Math.floor(n || 0)).toLocaleString('ko-KR') + '원'; }
  function row(label, val, cls) {
    return '<div class="home-strategy-row">' +
      '<span class="home-strategy-row-label">' + label + '</span>' +
      '<span class="home-strategy-row-val' + (cls ? ' ' + cls : '') + '">' + val + '</span>' +
    '</div>';
  }

  var gridStrats = gridData && gridData.strategies ? gridData.strategies : [];
  var gridActive = gridStrats.filter(function(s){ return s.status === 'ACTIVE'; });
  var gridPaused = gridStrats.filter(function(s){ return s.status === 'PAUSED'; });
  var gridAll = gridActive.concat(gridPaused);
  var gridProfit = gridStrats.reduce(function(s,st){ return s + (st.total_profit || 0); }, 0);
  var gridBadge = document.getElementById('dash-grid-count');
  var gridDetail = document.getElementById('dash-grid-detail');
  gridBadge.textContent = gridActive.length + '개 실행 중' + (gridPaused.length > 0 ? ' · ' + gridPaused.length + '개 일시정지' : '');
  gridBadge.className = 'home-strategy-badge' + (gridActive.length === 0 && gridPaused.length === 0 ? ' inactive' : '');
  if (gridAll.length > 0) {
    var gridRows = gridAll.map(function(s) {
      var isPaused = s.status === 'PAUSED';
      var dot = isPaused ? '<span style="color:#f59e0b">⏸</span>' : '<span style="color:#4ade80">▶</span>';
      var sym = (_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','');
      var exName = s.exchange === 'bithumb' ? '빗썸' : '업비트';
      var exColor = s.exchange === 'bithumb' ? '#f59e0b' : '#60a5fa';
      var pauseHtml = !isPaused ? '<button onclick="event.stopPropagation();pauseGrid(' + s.id + ')" style="background:rgba(245,158,11,0.1);border:1px solid #f59e0b;color:#f59e0b;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600">⏸ 정지</button>' : '';
      var resumeHtml = isPaused ? '<button onclick="event.stopPropagation();resumeGrid(' + s.id + ')" style="background:rgba(74,222,128,0.15);border:1px solid #4ade80;color:#4ade80;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600">▶ 재시작</button>' : '';
      var stopHtml = '<button onclick="event.stopPropagation();dashStopGrid(' + s.id + ')" style="background:rgba(248,113,113,0.1);border:1px solid #f87171;color:#f87171;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;margin-left:4px">삭제</button>';
      return '<div onclick="switchTab(\'grid\')" style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid var(--border2);cursor:pointer">' +
        '<div style="display:flex;align-items:center;gap:6px">' + dot +
          '<span style="font-size:12px;font-weight:700;color:var(--text)">' + sym + '</span>' +
          '<span style="font-size:11px;font-weight:700;color:' + exColor + ';opacity:0.85">' + exName + '</span>' +
        '</div>' +
        '<div>' + pauseHtml + resumeHtml + stopHtml + '</div>' +
      '</div>';
    });
    gridDetail.innerHTML = gridRows.join('') + '<div style="margin-top:6px">' + row('누적수익', (gridProfit >= 0 ? '+' : '') + fmtKrw(gridProfit), gridProfit >= 0 ? 'rise' : 'fall') + '</div>';
  } else {
    gridDetail.innerHTML = '<div class="home-strategy-empty" style="text-align:center;padding:16px 8px"><div style="font-size:20px;margin-bottom:6px">⚡</div><div style="font-size:12px;color:var(--text2);margin-bottom:4px">실행 중인 그리드 전략이 없습니다</div><div style="font-size:11px;color:var(--text3)">전략 탭에서 새 그리드를 만들어보세요</div></div>';
  }

  var dcaStrats = dcaData && dcaData.strategies ? dcaData.strategies : [];
  var dcaActive = dcaStrats.filter(function(s){ return s.status === 'ACTIVE'; });
  var dcaPaused = dcaStrats.filter(function(s){ return s.status === 'PAUSED'; });
  var dcaAll = dcaActive.concat(dcaPaused);
  var dcaBadge = document.getElementById('dash-dca-count');
  var dcaDetail = document.getElementById('dash-dca-detail');
  dcaBadge.textContent = dcaActive.length + '개 실행 중' + (dcaPaused.length > 0 ? ' · ' + dcaPaused.length + '개 일시정지' : '');
  dcaBadge.className = 'home-strategy-badge' + (dcaActive.length === 0 && dcaPaused.length === 0 ? ' inactive' : '');
  if (dcaAll.length > 0) {
    var dcaRows = dcaAll.map(function(s) {
      var isPaused = s.status === 'PAUSED';
      var dot = isPaused ? '<span style="color:#f59e0b">⏸</span>' : '<span style="color:#4ade80">▶</span>';
      var sym = (_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','');
      var exName = s.exchange === 'bithumb' ? '빗썸' : '업비트';
      var resumeHtml = isPaused ? '<button onclick="event.stopPropagation();resumeDCA(' + s.id + ')" style="background:rgba(74,222,128,0.15);border:1px solid #4ade80;color:#4ade80;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600">▶ 재개</button>' : '';
      var stopHtml = '<button onclick="event.stopPropagation();dashStopDCA(' + s.id + ')" style="background:rgba(248,113,113,0.1);border:1px solid #f87171;color:#f87171;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;margin-left:4px">삭제</button>';
      return '<div onclick="switchTab(\'strategy\')" style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid var(--border2);cursor:pointer">' +
        '<div style="display:flex;align-items:center;gap:6px">' + dot +
          '<span style="font-size:12px;font-weight:700;color:var(--text)">' + sym + '</span>' +
          '<span style="font-size:10px;color:var(--text3)">' + exName + '</span>' +
        '</div>' +
        '<div>' + resumeHtml + stopHtml + '</div>' +
      '</div>';
    });
    dcaDetail.innerHTML = dcaRows.join('');
  } else {
    dcaDetail.innerHTML = '<div class="home-strategy-empty" style="text-align:center;padding:16px 8px"><div style="font-size:20px;margin-bottom:6px">📋</div><div style="font-size:12px;color:var(--text2);margin-bottom:4px">실행 중인 분할매수 전략이 없습니다</div><div style="font-size:11px;color:var(--text3)">전략 탭에서 분할매수를 설정해보세요</div></div>';
  }

  var rebalStrats = rebalData && rebalData.strategies ? rebalData.strategies : [];
  var rebalActive = rebalStrats.filter(function(s){ return s.status === 'ACTIVE'; });
  var rebalBadge = document.getElementById('dash-rebal-count');
  var rebalDetail = document.getElementById('dash-rebal-detail');
  rebalBadge.textContent = rebalActive.length + '개 실행 중';
  rebalBadge.className = 'home-strategy-badge' + (rebalActive.length === 0 ? ' inactive' : '');
  if (rebalActive.length > 0) {
    var rb = rebalActive[0];
    var rbAssets = rb.assets ? rb.assets.slice(0,3).map(function(a){ return a.symbol.replace('KRW-','') + '(' + a.target_pct + '%)'; }).join(' ') : '-';
    var rbLast = rb.last_rebal_at ? new Date(rb.last_rebal_at).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'}) : '미실행';
    rebalDetail.innerHTML =
      row('전략명', rb.name || '-', 'accent') +
      row('종목비중', rbAssets) +
      row('마지막실행', rbLast);
  } else {
    rebalDetail.innerHTML = '<div class="home-strategy-empty" style="text-align:center;padding:16px 8px"><div style="font-size:20px;margin-bottom:6px">🔄</div><div style="font-size:12px;color:var(--text2);margin-bottom:4px">실행 중인 리밸런싱 전략이 없습니다</div><div style="font-size:11px;color:var(--text3)">전략 탭에서 리밸런싱을 설정해보세요</div></div>';
  }

  window.__homeRuntimeRenderStrategyList(gridData, dcaData, rebalData);
  window.__homeRuntimeRenderDynamicCard(rebalData);
};

window.renderDashStrategies = function renderDashStrategies(gridData, dcaData, rebalData) {
  return window.__homeRuntimeRenderDashStrategies.apply(this, arguments);
};

window.__homeRuntimeFetchDashboard = async function() {
  try {
    var results = await Promise.allSettled([
      authFetch('/api/balances'),
      authFetch('/api/positions'),
      authFetch('/bapi/balances'),
      authFetch('/bapi/positions'),
      authFetch('/grid/strategies'),
      authFetch('/dca/strategies'),
      authFetch('/rebalancing/strategies'),
      authFetch('/api/activity?limit=50')
    ]);

    var upBalData = results[0].value && results[0].value.ok ? await results[0].value.json() : null;
    var upPosData = results[1].value && results[1].value.ok ? await results[1].value.json() : null;
    var btBalData = results[2].value && results[2].value.ok ? await results[2].value.json() : null;
    var btPosData = results[3].value && results[3].value.ok ? await results[3].value.json() : null;
    var gridData  = results[4].value && results[4].value.ok ? await results[4].value.json() : null;
    var dcaData   = results[5].value && results[5].value.ok ? await results[5].value.json() : null;
    var rebalData = results[6].value && results[6].value.ok ? await results[6].value.json() : null;
    var logData   = results[7].value && results[7].value.ok ? await results[7].value.json() : null;

    var upKrw = (upBalData && upBalData.krw_available ? upBalData.krw_available : 0);
    var btKrw = (btBalData && btBalData.krw_available ? btBalData.krw_available : 0);

    var upPositions = upPosData && upPosData.positions ? upPosData.positions.map(function(p){
      p.exchange = 'upbit'; return p;
    }) : [];
    var btPositions = btPosData && btPosData.positions ? btPosData.positions.map(function(p){
      p.exchange = 'bithumb'; return p;
    }) : [];

    var upEval = upPositions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);
    var btEval = btPositions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);

    var combinedBalData = {
      krw_available: upKrw + btKrw,
      total_eval_amount: upKrw + btKrw + upEval + btEval
    };

    var combinedPosData = {
      positions: upPositions.concat(btPositions)
    };

    refreshGlobalTopStats();
    renderDashTop(combinedBalData, combinedPosData, gridData, dcaData, rebalData);
    renderDashExchange(upBalData, upPosData, btBalData, btPosData);
    renderDashStrategies(gridData, dcaData, rebalData);
    renderDashStatus(gridData, dcaData, rebalData);
    renderDashPositions(combinedPosData);
    renderDashRecentLogs(logData);
    renderDashFilledLogs(logData);
    renderDashErrorLogs(logData);
  } catch (e) {
    console.error('[DASH] 오류:', e);
  }
};

window.fetchDashboard = async function fetchDashboard() {
  if (window.__homeDashboardFetchInFlight) return;
  window.__homeDashboardFetchInFlight = true;

  try {
    var results = await Promise.allSettled([
      authFetch('/api/balances'),
      authFetch('/api/positions'),
      authFetch('/bapi/balances'),
      authFetch('/bapi/positions'),
      authFetch('/grid/strategies'),
      authFetch('/dca/strategies'),
      authFetch('/rebalancing/strategies'),
      authFetch('/api/activity?limit=50')
    ]);

    var upBalData = results[0].value && results[0].value.ok ? await results[0].value.json() : null;
    var upPosData = results[1].value && results[1].value.ok ? await results[1].value.json() : null;
    var btBalData = results[2].value && results[2].value.ok ? await results[2].value.json() : null;
    var btPosData = results[3].value && results[3].value.ok ? await results[3].value.json() : null;
    var gridData  = results[4].value && results[4].value.ok ? await results[4].value.json() : null;
    var dcaData   = results[5].value && results[5].value.ok ? await results[5].value.json() : null;
    var rebalData = results[6].value && results[6].value.ok ? await results[6].value.json() : null;
    var logData   = results[7].value && results[7].value.ok ? await results[7].value.json() : null;

    var snapshot = JSON.stringify({
      upBalData: upBalData,
      upPosData: upPosData,
      btBalData: btBalData,
      btPosData: btPosData,
      gridData: gridData,
      dcaData: dcaData,
      rebalData: rebalData,
      logData: logData
    });
    if (window.__homeDashboardLastSnapshot === snapshot) return;
    window.__homeDashboardLastSnapshot = snapshot;

    var upKrw = (upBalData && upBalData.krw_available ? upBalData.krw_available : 0);
    var btKrw = (btBalData && btBalData.krw_available ? btBalData.krw_available : 0);

    var upPositions = upPosData && upPosData.positions ? upPosData.positions.map(function(p){
      p.exchange = 'upbit'; return p;
    }) : [];
    var btPositions = btPosData && btPosData.positions ? btPosData.positions.map(function(p){
      p.exchange = 'bithumb'; return p;
    }) : [];

    var upEval = upPositions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);
    var btEval = btPositions.reduce(function(s,p){ return s + (p.eval_amount || 0); }, 0);

    var combinedBalData = {
      krw_available: upKrw + btKrw,
      total_eval_amount: upKrw + btKrw + upEval + btEval
    };

    var combinedPosData = {
      positions: upPositions.concat(btPositions)
    };

    refreshGlobalTopStats();
    renderDashTop(combinedBalData, combinedPosData, gridData, dcaData, rebalData);
    renderDashExchange(upBalData, upPosData, btBalData, btPosData);
    renderDashStrategies(gridData, dcaData, rebalData);
    renderDashStatus(gridData, dcaData, rebalData);
    renderDashPositions(combinedPosData);
    renderDashRecentLogs(logData);
    renderDashFilledLogs(logData);
    renderDashErrorLogs(logData);
  } catch (e) {
    console.error('[DASH] 오류:', e);
  } finally {
    window.__homeDashboardFetchInFlight = false;
  }
};

window.switchHome = function switchHome() {
  hideAllMainPanels();

  var panel = document.getElementById('home-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();
  var tabHome = document.getElementById('tab-home');
  if (tabHome) tabHome.classList.add('active');
  syncGuestHomeBanner();

  if (typeof fetchDashboard === 'function') {
    fetchDashboard();
    if (!window.__homeDashboardIntervalId) {
      window.__homeDashboardIntervalId = setInterval(function(){ if(typeof fetchDashboard==='function') fetchDashboard(); }, 2000);
    }
  }
};

function syncGuestHomeBanner() {
  var banner = document.getElementById('guest-home-banner');
  if (!banner) return;
  var panel = document.getElementById('home-panel');
  var user = window._currentUser || {};
  var isGuest = !!(window.isGuest || user.is_guest);
  var isHomeVisible = !!(panel && panel.style.display !== 'none');
  banner.style.display = isGuest && isHomeVisible ? 'block' : 'none';
}

window.gfGo = function(tab) {
  var panels = ['home-panel','grid-panel','portfolio-panel','settings-panel'];
  panels.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.settings-panel').forEach(function(el) {
    el.style.display = 'none';
  });
  var layout = document.getElementById('main-layout');
  if (layout) layout.style.display = 'none';

  if (tab === 'home') {
    if (typeof switchHome === 'function') switchHome();
  } else if (tab === 'upbit') {
    if (typeof switchExchange === 'function') switchExchange('upbit');
  } else if (tab === 'bithumb') {
    if (typeof switchExchange === 'function') switchExchange('bithumb');
  } else if (tab === 'grid') {
    if (typeof switchGrid === 'function') switchGrid();
  } else if (tab === 'portfolio') {
    if (typeof switchPortfolio === 'function') switchPortfolio();
  }

  document.querySelectorAll('.gn-btn').forEach(function(b) {
    b.classList.toggle('on', b.getAttribute('data-tab') === tab);
  });

  setTimeout(function() {
    ['home-panel','grid-panel','portfolio-panel','settings-panel'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.style.display !== 'none') el.style.paddingBottom = '80px';
    });
    var ml = document.getElementById('main-layout');
    if (ml && ml.style.display !== 'none') ml.style.paddingBottom = '80px';
  }, 50);
};

window.gfThemeSync = function() {
  var dark = !document.body.classList.contains('light');
  var i = document.getElementById('gf-ti');
  var l = document.getElementById('gf-tl');
  if (i) i.textContent = dark ? '☀️' : '🌙';
  if (l) l.textContent = dark ? '라이트 모드' : '다크 모드';
};

window.gfHamburger = function(e) {
  if (e) e.stopPropagation();
  var d = document.getElementById('gf-drawer');
  var o = document.getElementById('gf-overlay');
  if (!d) return;
  var s = document.getElementById('login-user-label');
  var u = document.getElementById('gf-uname');
  if (u && s && s.textContent.trim()) u.textContent = s.textContent.trim();
  window.gfThemeSync();
  d.classList.toggle('on');
  if (o) o.classList.toggle('on');
};

window.gfClose = function() {
  var d = document.getElementById('gf-drawer');
  var o = document.getElementById('gf-overlay');
  if (d) d.classList.remove('on');
  if (o) o.classList.remove('on');
};

// 게스트는 홈 화면만 읽기 전용으로 본다.
(function(){
  function isGuest() {
    return !!window.isGuest;
  }

  function guestNotice() {
    if (typeof window.guestBlock === 'function') {
      if (window.guestBlock('nav')) return;
    }
    if (typeof showToast === 'function') showToast('게스트 모드에서는 로그인이 필요합니다');
  }

  function markHomeNav() {
    document.querySelectorAll('.gn-btn').forEach(function(btn) {
      btn.classList.toggle('on', btn.getAttribute('data-tab') === 'home');
    });
  }

  function guestData() {
    var bal = { krw_available: 0, total_eval_amount: 0 };
    var pos = { positions: [] };
    var strategies = { strategies: [] };
    var logs = { logs: [] };
    return {
      bal: bal,
      pos: pos,
      strategies: strategies,
      logs: logs
    };
  }

  function renderGuestHome() {
    var d = guestData();
    try { renderDashTop(d.bal, d.pos, d.strategies, d.strategies, d.strategies); } catch(e) {}
    try { renderDashExchange(d.bal, d.pos, d.bal, d.pos); } catch(e) {}
    try { renderDashStrategies(d.strategies, d.strategies, d.strategies); } catch(e) {}
    try { renderDashStatus(d.strategies, d.strategies, d.strategies); } catch(e) {}
    try { renderDashPositions(d.pos); } catch(e) {}
    try { renderDashRecentLogs(d.logs); } catch(e) {}
    try { renderDashFilledLogs(d.logs); } catch(e) {}
    try { renderDashErrorLogs(d.logs); } catch(e) {}
  }

  function wrapGuestHome() {
    var originalFetchDashboard = window.fetchDashboard;
    if (typeof originalFetchDashboard === 'function' && !originalFetchDashboard.__guestWrapped) {
      window.fetchDashboard = async function() {
        if (isGuest()) {
          renderGuestHome();
          return;
        }
        return originalFetchDashboard.apply(this, arguments);
      };
      window.fetchDashboard.__guestWrapped = true;
    }

    var originalRefreshTop = window.refreshGlobalTopStats;
    if (typeof originalRefreshTop === 'function' && !originalRefreshTop.__guestWrapped) {
      window.refreshGlobalTopStats = async function() {
        if (isGuest()) return;
        return originalRefreshTop.apply(this, arguments);
      };
      window.refreshGlobalTopStats.__guestWrapped = true;
    }
  }

  function wrapGuestNavigation() {
    var originalGfGo = window.gfGo;
    if (typeof originalGfGo === 'function' && !originalGfGo.__guestWrapped) {
      window.gfGo = function(tab) {
        if (isGuest() && tab !== 'home' && tab !== 'upbit' && tab !== 'bithumb' && tab !== 'grid') {
          guestNotice();
          markHomeNav();
          if (typeof window.switchHome === 'function') window.switchHome();
          return;
        }
        return originalGfGo.apply(this, arguments);
      };
      window.gfGo.__guestWrapped = true;
    }

    ['switchPortfolio','switchSettings','switchSimulation'].forEach(function(name) {
      var original = window[name];
      if (typeof original !== 'function' || original.__guestWrapped) return;
      window[name] = function() {
        if (isGuest()) {
          guestNotice();
          if (typeof window.switchHome === 'function') window.switchHome();
          markHomeNav();
          return;
        }
        return original.apply(this, arguments);
      };
      window[name].__guestWrapped = true;
    });
  }

  function bootGuestGuards() {
    wrapGuestHome();
    wrapGuestNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGuestGuards);
  } else {
    bootGuestGuards();
  }
})();
