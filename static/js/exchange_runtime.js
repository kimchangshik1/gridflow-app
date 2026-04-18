'use strict';

window.updateExchangeSummaryUI = function(exchange, krw, totalEval) {
  var titleEl = document.getElementById('exchange-summary-title');
  var badgeEl = document.getElementById('exchange-summary-badge');
  var krwEl = document.getElementById('exchange-summary-krw');
  var totalEl = document.getElementById('exchange-summary-total');

  var isBithumb = exchange === 'bithumb';
  if (titleEl) titleEl.textContent = isBithumb ? '빗썸 요약' : '업비트 요약';
  if (badgeEl) badgeEl.textContent = isBithumb ? 'BITHUMB' : 'UPBIT';
  if (krwEl) krwEl.textContent = Number(krw || 0).toLocaleString('ko-KR') + (_lang==='ko' ? '원' : ' KRW');
  if (totalEl) totalEl.textContent = Number(totalEval || 0).toLocaleString('ko-KR') + (_lang==='ko' ? '원' : ' KRW');
};

window.updateExRuleBar = function() {
  var ex = (typeof _exchange !== 'undefined' && _exchange) ? _exchange : 'upbit';
  var feeEl = document.getElementById('ex-fee-lbl');
  var minEl = document.getElementById('ex-min-order-lbl');
  var dotEl = document.getElementById('ex-api-dot');
  var stsEl = document.getElementById('ex-api-status-lbl');
  if (feeEl) feeEl.textContent = ex === 'bithumb' ? '0.04%' : '0.05%';
  if (minEl) minEl.textContent = ex === 'bithumb' ? '1,000 KRW' : '5,500 KRW';
  if (dotEl) { dotEl.className = 'ex-api-dot ok'; }
  if (stsEl) stsEl.textContent = 'API 정상';
  var responseBadge = document.getElementById('ex-response-badge');
  var orderPerm = document.getElementById('ex-order-perm');
  var syncTime = document.getElementById('ex-sync-time');
  if (responseBadge) { responseBadge.textContent = '응답 정상'; responseBadge.className = 'ex-info-badge ok'; }
  if (orderPerm) { orderPerm.textContent = '가능'; }
  if (syncTime) {
    var now = new Date();
    syncTime.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
  }
};
