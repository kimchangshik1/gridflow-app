'use strict';

window.fetchStatus = async function fetchStatus() {
  const r = await authFetch('/config/status');
  const d = await r.json();
  const el = document.getElementById('bot-status');
  applyLang();
  el.textContent = d.bot_status === 'active' ? (_lang === 'ko' ? '● 실행 중' : '● Running') : (_lang === 'ko' ? '● 중지됨' : '● Stopped');
  el.style.color = d.bot_status === 'active' ? '#4ade80' : '#f87171';
};

window.fetchCurrentKeys = async function fetchCurrentKeys() {
  const r = await authFetch('/config/keys');
  const d = await r.json();
  const noKey = _lang === 'ko' ? '미설정' : 'Not set';
  document.getElementById('cur-upbit-access').textContent = d.upbit_access_key || noKey;
  document.getElementById('cur-upbit-secret').textContent = d.upbit_secret_key || noKey;
  document.getElementById('cur-bithumb-access').textContent = d.bithumb_access_key || noKey;
  document.getElementById('cur-bithumb-secret').textContent = d.bithumb_secret_key || noKey;
};

window.switchSettings = function switchSettings() {
  hideAllMainPanels();

  var panel = document.getElementById('settings-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();

  var tab = document.getElementById('tab-settings');
  if (tab) tab.classList.add('active');

  if (typeof fetchStatus === 'function') fetchStatus();
  if (typeof fetchCurrentKeys === 'function') fetchCurrentKeys();
};

window.deleteMyKeys = async function deleteMyKeys(exchange) {
  const label = exchange === 'upbit' ? 'Upbit' : 'Bithumb';
  if (!confirm(`${label} API 키를 삭제할까요?\n삭제 후 해당 거래소 봇이 중단됩니다.`)) return;
  const url = exchange === 'upbit' ? '/config/keys/upbit' : '/config/keys/bithumb';
  const r = await authFetch(url, { method: 'DELETE' });
  if (!r) return;
  const d = await r.json();
  if (r.ok) {
    showToast(`✅ ${label} API 키 삭제 완료`);
    fetchCurrentKeys();
  } else {
    showToast(`❌ 삭제 실패: ${d.detail || ''}`);
  }
};

window.closeGuide = function closeGuide() {
  document.getElementById('guide-modal').classList.remove('open');
};

window.closeGuideOutside = function closeGuideOutside(e) {
  if (e.target.id === 'guide-modal') closeGuide();
};

window.openGuide = function openGuide() {
  document.getElementById('guide-modal').classList.add('open');
  applyGuideLang();
};

window.applyGuideLang = function applyGuideLang() {
  const ko = _lang === 'ko';
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('guide-title', ko ? '📋 사용 방법' : '📋 How to Use');
  set('guide-s1-title', ko ? 'API 키 발급' : 'Get API Keys');
  set('guide-s2-title', ko ? '허용 IP 등록 (필수)' : 'Register Allowed IP (Required)');
  set('guide-s3-title', ko ? 'API 키 입력' : 'Enter API Keys');
  set('guide-s4-title', ko ? '주문 방법' : 'How to Order');
  set('guide-s5-title', ko ? '주문 상태 안내' : 'Order Status Guide');

  document.getElementById('guide-s1-body').innerHTML = ko ?
    '<b>Upbit</b>: upbit.com → 로그인 → Open API 관리 → API 생성<br>&nbsp;&nbsp;✅ 자산조회 &nbsp;✅ 주문조회 &nbsp;✅ 주문하기 &nbsp;❌ 출금 (체크 금지)<br><br><b>Bithumb</b>: bithumb.com → 로그인 → API 관리 → API 생성<br>&nbsp;&nbsp;✅ 조회 &nbsp;✅ 주문 &nbsp;❌ 출금 (체크 금지)' :
    '<b>Upbit</b>: upbit.com → Login → Open API → Create API<br>&nbsp;&nbsp;✅ Asset inquiry &nbsp;✅ Order inquiry &nbsp;✅ Place order &nbsp;❌ Withdrawal (DO NOT check)<br><br><b>Bithumb</b>: bithumb.com → Login → API Management → Create API<br>&nbsp;&nbsp;✅ Inquiry &nbsp;✅ Order &nbsp;❌ Withdrawal (DO NOT check)';

  document.getElementById('guide-s2-body').innerHTML = ko ?
    'API 발급 시 아래 서버 IP를 허용 IP로 반드시 등록하세요.<br>등록하지 않으면 API 인증이 차단됩니다.<div class="guide-ip" onclick="copyIP(\'54.250.241.38\')" style="cursor:pointer;" title="클릭하여 복사">54.250.241.38 📋</div><div style="font-size:11px;color:#888;text-align:center;margin-top:4px">👆 클릭하면 IP가 클립보드에 복사됩니다</div>' :
    'When creating your API key, add the server IP below as an allowed IP.<br>Without this, API authentication will be blocked.<div class="guide-ip" onclick="copyIP(\'54.250.241.38\')" style="cursor:pointer;" title="Click to copy">54.250.241.38 📋</div><div style="font-size:11px;color:#888;text-align:center;margin-top:4px">👆 Click to copy IP to clipboard</div>';

  document.getElementById('guide-s3-body').innerHTML = ko ?
    '설정 탭에서 발급받은 API 키를 입력하고<br><b>저장 및 봇 재시작</b> 버튼을 클릭하세요.<br>저장 후 봇이 자동으로 재시작됩니다.' :
    'Enter your API keys in the Settings tab and click<br><b>Save & Restart Bot</b>.<br>The bot will restart automatically after saving.';

  document.getElementById('guide-s4-body').innerHTML = ko ?
    '① 좌측 코인 목록에서 거래할 코인 선택<br>② 지정가 / 시장가 선택<br>③ 가격 및 금액 입력<br>④ 매수 / 매도 버튼 클릭<br>⑤ 주문 목록에서 체결 상태 확인' :
    '① Select a coin from the left panel<br>② Choose Limit or Market order<br>③ Enter price and amount (Buy min. 5,500 KRW / Sell min. 5,000 KRW)<br>④ Click Buy or Sell<br>⑤ Check order status in the Orders section';

  document.getElementById('guide-s5-body').innerHTML = ko ?
    '<b style="color:#888">PLANNED</b> — 예약 등록됨 (거래소 미제출)<br><b style="color:#60a5fa">SUBMITTED</b> — 거래소 제출 완료<br><b style="color:#34d399">ACTIVE</b> — 거래소 활성 주문<br><b style="color:#4ade80">FILLED</b> — 체결 완료 ✅<br><b style="color:#888">CANCELLED</b> — 취소됨' :
    '<b style="color:#888">PLANNED</b> — Registered (not yet submitted)<br><b style="color:#60a5fa">SUBMITTED</b> — Submitted to exchange<br><b style="color:#34d399">ACTIVE</b> — Active on exchange<br><b style="color:#4ade80">FILLED</b> — Executed ✅<br><b style="color:#888">CANCELLED</b> — Cancelled';
};

window.copyIP = function copyIP(ip) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ip).then(() => showToast('📋 IP 복사됨!'));
    } else {
      const el = document.createElement('textarea');
      el.value = ip;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('📋 IP 복사됨!');
    }
  } catch (e) {
    showToast('❌ 복사 실패 - 직접 선택하세요');
  }
};
