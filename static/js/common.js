'use strict';

(function(){
'use strict';
function _pwCriteria(v){
  return {
    len: v.length >= 8,
    upper: /[A-Z]/.test(v),
    lower: /[a-z]/.test(v),
    digit: /[0-9]/.test(v),
    special: /[^A-Za-z0-9]/.test(v)
  };
}
window.gfTogglePw = function(inputId, btnId){
  var i = document.getElementById(inputId);
  var b = document.getElementById(btnId);
  if(!i) return;
  i.type = i.type === 'password' ? 'text' : 'password';
  if(b) b.textContent = i.type === 'password' ? '👁' : '🙈';
};
window.gfShowSignup = function(){
  var lp = document.getElementById('login-form-panel');
  var sp = document.getElementById('signup-form-panel');
  if(lp) lp.style.display = 'none';
  if(sp) sp.style.display = '';
  var e = document.getElementById('login-err');
  if(e) e.textContent = '';
};
window.gfShowLogin = function(){
  var sp = document.getElementById('signup-form-panel');
  var lp = document.getElementById('login-form-panel');
  if(sp) sp.style.display = 'none';
  if(lp) lp.style.display = '';
  var e = document.getElementById('signup-err');
  if(e){ e.textContent = ''; }
};
function _updateSignupBtn(){
  var btn = document.getElementById('signup-btn');
  if(!btn) return;
  var uname = (document.getElementById('signup-username').value || '').trim();
  var pw = document.getElementById('signup-password').value || '';
  var conf = document.getElementById('signup-pw-confirm').value || '';
  var c = _pwCriteria(pw);
  var unameOk = uname.length >= 4 && uname.length <= 20 && /^[a-zA-Z0-9]+$/.test(uname);
  var pwOk = c.len && c.upper && c.lower && c.digit && c.special;
  var confOk = pw.length > 0 && pw === conf;
  var ok = unameOk && pwOk && confOk;
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '0.5';
  btn.style.cursor = ok ? 'pointer' : 'not-allowed';
}
window.gfSignupUname = function(){
  var val = (document.getElementById('signup-username').value || '').trim();
  var hint = document.getElementById('signup-username-hint');
  if(!hint) return;
  if(!val){ hint.textContent = ''; hint.style.color = ''; }
  else if(val.length < 4 || val.length > 20){ hint.textContent = '4~20자여야 합니다'; hint.style.color = '#EF4444'; }
  else if(!/^[a-zA-Z0-9]+$/.test(val)){ hint.textContent = '영문과 숫자만 사용 가능합니다 (한글·특수문자 불가)'; hint.style.color = '#EF4444'; }
  else{ hint.textContent = '사용 가능한 형식입니다'; hint.style.color = '#10B981'; }
  _updateSignupBtn();
};
window.gfSignupPw = function(){
  var pw = document.getElementById('signup-password').value || '';
  var c = _pwCriteria(pw);
  var keys = ['len','upper','lower','digit','special'];
  var ids = ['pwc-len','pwc-upper','pwc-lower','pwc-digit','pwc-special'];
  var labels = {len:'최소 8자 이상',upper:'영문 대문자 1개 이상',lower:'영문 소문자 1개 이상',digit:'숫자 1개 이상',special:'특수문자 1개 이상 (!@#$%^&* 등)'};
  var count = 0;
  for(var i=0;i<keys.length;i++){
    var el = document.getElementById(ids[i]);
    if(!el) continue;
    var ok = c[keys[i]];
    if(ok) count++;
    el.className = 'pw-check' + (ok ? ' ok' : '');
    el.textContent = (ok ? '✓ ' : '✗ ') + labels[keys[i]];
  }
  var sEl = document.getElementById('pw-strength-lbl');
  if(sEl){
    if(!pw){ sEl.textContent = ''; }
    else if(count <= 2){ sEl.textContent = '약함'; sEl.style.color = '#EF4444'; }
    else if(count <= 4){ sEl.textContent = '보통'; sEl.style.color = '#F59E0B'; }
    else{ sEl.textContent = '강함'; sEl.style.color = '#10B981'; }
  }
  var conf = document.getElementById('signup-pw-confirm').value || '';
  if(conf) window.gfSignupConfirm();
  _updateSignupBtn();
};
window.gfSignupConfirm = function(){
  var pw = document.getElementById('signup-password').value || '';
  var conf = document.getElementById('signup-pw-confirm').value || '';
  var hint = document.getElementById('signup-confirm-hint');
  if(!hint) return;
  if(!conf){ hint.textContent = ''; hint.style.color = ''; }
  else if(pw === conf){ hint.textContent = '비밀번호가 일치합니다'; hint.style.color = '#10B981'; }
  else{ hint.textContent = '비밀번호가 일치하지 않습니다'; hint.style.color = '#EF4444'; }
  _updateSignupBtn();
};
window.gfDoSignup = async function(){
  var btn = document.getElementById('signup-btn');
  var errEl = document.getElementById('signup-err');
  if(btn && btn.disabled) return;
  var uname = (document.getElementById('signup-username').value || '').trim();
  var pw = document.getElementById('signup-password').value || '';
  if(errEl){ errEl.textContent = ''; }
  if(btn){ btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = '처리 중...'; btn.style.cursor = 'not-allowed'; }
  try{
    var r = await fetch('/auth/register',{
      method:'POST',
      headers:buildStateChangeHeaders({'Content-Type':'application/json'}, 'POST'),
      body:JSON.stringify({username:uname, password:pw})
    });
    var d = await r.json();
    if(r.ok && d.success){
      if(errEl){ errEl.style.color = '#10B981'; errEl.textContent = '회원가입 완료! 로그인 화면으로 이동합니다.'; }
      setTimeout(function(){
        var li = document.getElementById('login-username');
        if(li) li.value = uname;
        window.gfShowLogin();
        if(errEl){ errEl.textContent = ''; }
      }, 1800);
    } else {
      if(errEl){ errEl.style.color = '#f87171'; errEl.textContent = d.detail || '가입 실패'; }
      if(btn){ btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.textContent = '가입하기'; }
    }
  } catch(e){
    if(errEl){ errEl.style.color = '#f87171'; errEl.textContent = '서버 연결 오류'; }
    if(btn){ btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.textContent = '가입하기'; }
  }
};
})();

// ── 인증 브리지 (auth.js 단일 사용) ─────────────────
let _currentUser = window._currentUser || null
const STATE_CHANGE_HEADER_NAME = 'X-GridFlow-State-Change'
const STATE_CHANGE_HEADER_VALUE = '1'

function isStateChangeMethod(method) {
  var normalized = (method || 'GET').toUpperCase()
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE'
}

function buildStateChangeHeaders(existingHeaders, method) {
  var headers = Object.assign({}, existingHeaders || {})
  if (isStateChangeMethod(method)) {
    headers[STATE_CHANGE_HEADER_NAME] = STATE_CHANGE_HEADER_VALUE
  }
  return headers
}

function syncAuthStateFromWindow() {
  _currentUser = window._currentUser || null
}

function applyAdminTabVisibility() {
  syncAuthStateFromWindow()
  var adminTab = document.getElementById('tab-admin')
  if (!adminTab) return
  if (_currentUser && _currentUser.is_admin) {
    adminTab.style.display = ''
  } else {
    adminTab.style.display = 'none'
  }
}

if (typeof window.checkAuth === 'function' && !window.__authBridgeWrappedCheckAuth) {
  const _baseCheckAuth = window.checkAuth
  window.checkAuth = async function() {
    const ok = await _baseCheckAuth()
    applyAdminTabVisibility()
    return ok
  }
  window.__authBridgeWrappedCheckAuth = true
}

if (typeof window.doLogin === 'function' && !window.__authBridgeWrappedDoLogin) {
  const _baseDoLogin = window.doLogin
  window.doLogin = async function() {
    await _baseDoLogin()
    applyAdminTabVisibility()
  }
  window.__authBridgeWrappedDoLogin = true
}

if (typeof window.doLogout === 'function' && !window.__authBridgeWrappedDoLogout) {
  const _baseDoLogout = window.doLogout
  window.doLogout = async function() {
    await _baseDoLogout()
    syncAuthStateFromWindow()
    applyAdminTabVisibility()
  }
  window.__authBridgeWrappedDoLogout = true
}

applyAdminTabVisibility()

// ── API 요청 공통 헤더 ─────────────────────────────

function dashStopGrid(id) {
  if (!confirm('그리드 전략을 삭제하시겠습니까?')) return
  if (typeof stopGrid === 'function') stopGrid(id)
}
function dashStopDCA(id) {
  if (!confirm('분할매수 전략을 삭제하시겠습니까?')) return
  if (typeof stopDCA === 'function') stopDCA(id)
}
function statusKo(s){var m={'PLANNED':'대기중','QUEUED':'제출준비','SUBMITTED':'제출완료','ACTIVE':'미체결','PARTIALLY_FILLED':'부분체결','FILLED':'체결완료','CANCELLED':'취소됨','FAILED':'실패','UNKNOWN':'확인중'};return m[s]||s;}
function sideKo(s){return s==='BUY'?'매수':s==='SELL'?'매도':s;}
async function authFetch(url, options = {}) {
  var method = (options && options.method) ? options.method : 'GET'
  var requestOptions = Object.assign({}, options, {
    headers: buildStateChangeHeaders(options.headers, method),
    credentials: 'same-origin'
  })
  if (window.isGuest) {
    var _gu = url.toString();
    /* 심볼/시세/티커 — 공개 API라 실제 호출 허용 */
    if (_gu.indexOf('/symbols') > -1
      || _gu.indexOf('/ticker') > -1
      || _gu.indexOf('/markets') > -1
      || _gu.indexOf('/candle') > -1
      || _gu.indexOf('/orderbook') > -1
      || _gu.indexOf('/upbit') > -1
      || _gu.indexOf('/bithumb') > -1
      || _gu.indexOf('/api/symbols') > -1
      || _gu.indexOf('/bapi/symbols') > -1) {
      return fetch(url, requestOptions);
    }
    /* 잔고 — 가상 1000만원 */
    if (_gu.indexOf('/balances') > -1 || _gu.indexOf('/balance') > -1) {
      return new Response(JSON.stringify({
        krw: window.__guestState ? window.__guestState.krw : 10000000,
        krwBalance: window.__guestState ? window.__guestState.krw : 10000000,
        total: window.__guestState ? window.__guestState.krw : 10000000,
        available: window.__guestState ? window.__guestState.krw : 10000000
      }), {status:200, headers:{'Content-Type':'application/json'}});
    }
    if ((_gu.indexOf('/api/orders') > -1 || _gu.indexOf('/bapi/orders') > -1) && (options.method || 'GET').toUpperCase() === 'POST') {
      return new Response(JSON.stringify({ok:true, dry_run:true, guest:true, status:'accepted'}), {status:200, headers:{'Content-Type':'application/json'}});
    }
    /* 주문/포지션 — GET은 조회, 게스트 주문 POST는 위에서 프론트 DRY RUN 처리 */
    if (_gu.indexOf('/orders') > -1 || _gu.indexOf('/positions') > -1) {
      return fetch(url, requestOptions);
    }
    if (_gu.indexOf('/grid') > -1 || (_gu.indexOf('/bapi/orders') > -1)) {
      var _gm = (options && options.method) ? options.method.toUpperCase() : 'GET';
      if (_gm === 'POST') {
        return fetch(url, requestOptions);
      }
      return new Response(JSON.stringify([]), {status:200, headers:{'Content-Type':'application/json'}});
    }
    if (_gu.indexOf('/dca') > -1 || _gu.indexOf('/rebal') > -1) {
      var _dm = (options && options.method) ? options.method.toUpperCase() : 'GET';
      if (_dm === 'POST') {
        var _fakeId = 'GUEST-' + Date.now();
        return new Response(JSON.stringify({strategy_id:_fakeId,id:_fakeId,status:'ACTIVE'}), {status:200, headers:{'Content-Type':'application/json'}});
      }
      if (_dm === 'DELETE' || _dm === 'PATCH' || _dm === 'PUT') {
        return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }
      return new Response(JSON.stringify([]), {status:200, headers:{'Content-Type':'application/json'}});
    }
    /* 나머지 — 빈 객체 */
    return new Response(JSON.stringify({}), {status:200, headers:{'Content-Type':'application/json'}});
  }
  syncAuthStateFromWindow()
  const r = await fetch(url, requestOptions)
  if (r.status === 401) {
    if (typeof window.checkAuth === 'function') {
      try { await window.checkAuth() } catch (e) {}
    } else if (typeof window.showLogin === 'function') {
      window.showLogin()
    }
    return null
  }
  return r
}

let API = '/api'
let _lang = localStorage.getItem('lang') || 'ko'
let _exchange = 'upbit'
let _symbols = []
let _koreanMap = {}
let _selectedSymbol = null
let _currentTab = 'limit'

function openGuide() {
  document.getElementById('guide-modal').classList.add('open')
  applyGuideLang()
}

function closeGuide() {
  document.getElementById('guide-modal').classList.remove('open')
}

function closeGuideOutside(e) {
  if(e.target.id === 'guide-modal') closeGuide()
}

function applyGuideLang() {
  const ko = _lang === 'ko'
  const set = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt }
  set('guide-title', ko ? '📋 사용 방법' : '📋 How to Use')
  set('guide-s1-title', ko ? 'API 키 발급' : 'Get API Keys')
  set('guide-s2-title', ko ? '허용 IP 등록 (필수)' : 'Register Allowed IP (Required)')
  set('guide-s3-title', ko ? 'API 키 입력' : 'Enter API Keys')
  set('guide-s4-title', ko ? '주문 방법' : 'How to Order')
  set('guide-s5-title', ko ? '주문 상태 안내' : 'Order Status Guide')

  document.getElementById('guide-s1-body').innerHTML = ko ?
    '<b>Upbit</b>: upbit.com → 로그인 → Open API 관리 → API 생성<br>&nbsp;&nbsp;✅ 자산조회 &nbsp;✅ 주문조회 &nbsp;✅ 주문하기 &nbsp;❌ 출금 (체크 금지)<br><br><b>Bithumb</b>: bithumb.com → 로그인 → API 관리 → API 생성<br>&nbsp;&nbsp;✅ 조회 &nbsp;✅ 주문 &nbsp;❌ 출금 (체크 금지)' :
    '<b>Upbit</b>: upbit.com → Login → Open API → Create API<br>&nbsp;&nbsp;✅ Asset inquiry &nbsp;✅ Order inquiry &nbsp;✅ Place order &nbsp;❌ Withdrawal (DO NOT check)<br><br><b>Bithumb</b>: bithumb.com → Login → API Management → Create API<br>&nbsp;&nbsp;✅ Inquiry &nbsp;✅ Order &nbsp;❌ Withdrawal (DO NOT check)'

  document.getElementById('guide-s2-body').innerHTML = ko ?
    'API 발급 시 아래 서버 IP를 허용 IP로 반드시 등록하세요.<br>등록하지 않으면 API 인증이 차단됩니다.<div class="guide-ip" onclick="copyIP(\'54.250.241.38\')" style="cursor:pointer;" title="클릭하여 복사">54.250.241.38 📋</div><div style="font-size:11px;color:#888;text-align:center;margin-top:4px">👆 클릭하면 IP가 클립보드에 복사됩니다</div>' :
    'When creating your API key, add the server IP below as an allowed IP.<br>Without this, API authentication will be blocked.<div class="guide-ip" onclick="copyIP(\'54.250.241.38\')" style="cursor:pointer;" title="Click to copy">54.250.241.38 📋</div><div style="font-size:11px;color:#888;text-align:center;margin-top:4px">👆 Click to copy IP to clipboard</div>'

  document.getElementById('guide-s3-body').innerHTML = ko ?
    '설정 탭에서 발급받은 API 키를 입력하고<br><b>저장 및 봇 재시작</b> 버튼을 클릭하세요.<br>저장 후 봇이 자동으로 재시작됩니다.' :
    'Enter your API keys in the Settings tab and click<br><b>Save & Restart Bot</b>.<br>The bot will restart automatically after saving.'

  document.getElementById('guide-s4-body').innerHTML = ko ?
    '① 좌측 코인 목록에서 거래할 코인 선택<br>② 지정가 / 시장가 선택<br>③ 가격 및 금액 입력<br>④ 매수 / 매도 버튼 클릭<br>⑤ 주문 목록에서 체결 상태 확인' :
    '① Select a coin from the left panel<br>② Choose Limit or Market order<br>③ Enter price and amount (Buy min. 5,500 KRW / Sell min. 5,000 KRW)<br>④ Click Buy or Sell<br>⑤ Check order status in the Orders section'

  document.getElementById('guide-s5-body').innerHTML = ko ?
    '<b style="color:#888">PLANNED</b> — 예약 등록됨 (거래소 미제출)<br><b style="color:#60a5fa">SUBMITTED</b> — 거래소 제출 완료<br><b style="color:#34d399">ACTIVE</b> — 거래소 활성 주문<br><b style="color:#4ade80">FILLED</b> — 체결 완료 ✅<br><b style="color:#888">CANCELLED</b> — 취소됨' :
    '<b style="color:#888">PLANNED</b> — Registered (not yet submitted)<br><b style="color:#60a5fa">SUBMITTED</b> — Submitted to exchange<br><b style="color:#34d399">ACTIVE</b> — Active on exchange<br><b style="color:#4ade80">FILLED</b> — Executed ✅<br><b style="color:#888">CANCELLED</b> — Cancelled'
}

function showToast(msg) {
  const el = document.getElementById('toast-popup')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._timer)
  el._timer = setTimeout(() => el.classList.remove('show'), 1800)
}
function copyIP(ip) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ip).then(() => showToast('📋 IP 복사됨!'))
    } else {
      const el = document.createElement('textarea')
      el.value = ip
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      showToast('📋 IP 복사됨!')
    }
  } catch(e) {
    showToast('❌ 복사 실패 - 직접 선택하세요')
  }
}
function showMsg(text, ok=true) {
  const el = document.getElementById('msg')
  el.innerHTML = '<div class="msg ' + (ok?'msg-ok':'msg-err') + '">' + text + '</div>'
  setTimeout(() => el.innerHTML = '', 4000)
}

const i18n = {
  ko: {
    settingsTitle: '⚙️ 설정',
    displaySettings: '🖥️ 화면 설정',
    themeLabel: '다크 / 라이트 모드',
    langLabel: '언어 설정',
    guideBtn: '📋 사용 방법',
    upbitKey: '🔑 Upbit API 키',
    bithumbKey: '🔑 Bithumb API 키',
    accessKey: 'Access Key',
    secretKey: 'Secret Key',
    connectKey: 'Connect Key',
    curAccess: 'Access Key:',
    curSecret: 'Secret Key:',
    curConnect: 'Connect Key:',
    newAccess40: '새 Access Key (40자)',
    newSecret41: '새 Secret Key (40자)',
    newConnect46: '새 Connect Key (46자)',
    newSecret84: '새 Secret Key (84자)',
    phAccess: '새 Access Key 입력',
    phSecret: '새 Secret Key 입력',
    phConnect: '새 Connect Key 입력',
    search: '🔍 코인명 검색 (예: 비트, BTC)',
    selectCoin: '코인을 선택하세요',
    limit: '지정가', market: '시장가',
    price: '가격 (KRW)', amount: '금액 (KRW)',
    pctLabel: '현재가 대비 %',
    amtLabel: '금액 빠른입력',
    seedLabel: '시드 비율',
    buy: '매수', sell: '매도',
    positions: '보유 포지션', orders: '주문 목록',
    krwBalance: 'KRW 잔고', activeOrders: '활성 주문', totalEval: '총 평가금액',
    avgPrice: '평균매수가', current: '현재가', qty: '수량',
    buyAmt: '매수금액', evalAmt: '평가금액', pnl: '평가손익',
    orderPnl: '주문별 손익', botStatus: '봇 상태',
    save: '저장 및 봇 재시작', minAmt: '주문 금액을 입력하세요',
    marketWarning: '<span class="market-warn">⚠️ 현재 호가로 즉시 체결됩니다</span>',
    noCoin: '보유 코인 없음', cancel: '취소',
    settings: '⚙️ 설정',
    feeUpbit: '💡 수수료: 지정가 0.05% / 시장가 0.05% (고정)',
    feeBithumb: '💡 수수료: 지정가 0.04%(쿠폰적용) / 0.25%(미적용)',
    logout: '로그아웃',
  },
  en: {
    settingsTitle: '⚙️ Settings',
    displaySettings: '🖥️ Display Settings',
    themeLabel: 'Dark / Light Mode',
    langLabel: 'Language',
    guideBtn: '📋 How to Use',
    upbitKey: '🔑 Upbit API Keys',
    bithumbKey: '🔑 Bithumb API Keys',
    accessKey: 'Access Key',
    secretKey: 'Secret Key',
    connectKey: 'Connect Key',
    curAccess: 'Access Key:',
    curSecret: 'Secret Key:',
    curConnect: 'Connect Key:',
    newAccess40: 'New Access Key (40 chars)',
    newSecret41: 'New Secret Key (40 chars)',
    newConnect46: 'New Connect Key (46 chars)',
    newSecret84: 'New Secret Key (84 chars)',
    phAccess: 'Enter new Access Key',
    phSecret: 'Enter new Secret Key',
    phConnect: 'Enter new Connect Key',
    search: '🔍 Search coin (e.g. BTC, XRP)',
    selectCoin: 'Select a coin',
    limit: 'Limit', market: 'Market',
    price: 'Price (KRW)', amount: 'Amount (KRW)',
    pctLabel: '% from current price',
    amtLabel: 'Quick Amount',
    seedLabel: 'Seed Ratio',
    buy: 'Buy', sell: 'Sell',
    positions: '보유자산', orders: '주문내역',
    krwBalance: 'KRW Balance', activeOrders: 'Active Orders', totalEval: 'Total Value',
    avgPrice: 'Avg. Price', current: 'Current', qty: 'Volume',
    buyAmt: 'Invested', evalAmt: 'Value', pnl: 'P&L',
    orderPnl: 'Order P&L', botStatus: 'Bot Status',
    save: 'Save & Restart Bot', minAmt: 'Buy min. 5,500 KRW / Sell min. 5,000 KRW',
    marketWarning: '⚠️ Will execute at current market price',
    noCoin: 'No positions', cancel: 'Cancel',
    settings: '⚙️ Settings',
    feeUpbit: '💡 Fee: Limit 0.05% / Market 0.05% (fixed)',
    feeBithumb: '💡 Fee: Limit 0.04%(w/ coupon) / 0.25%(no coupon)',
    logout: 'Log Out',
  }
}

function applyLang() {
  const t = i18n[_lang]
  const $ = id => document.getElementById(id)
  const set = (id, txt) => { const el = $(id); if(el) el.textContent = txt }
  const setph = (id, txt) => { const el = $(id); if(el) el.placeholder = txt }
  const setTh = (id, txt) => { const el = $(id); if(el) el.textContent = txt }

  // 사이트 타이틀
  const siteTitle = $('site-title')
  if(siteTitle) siteTitle.textContent = _lang==='ko' ? '그리드플로우' : 'GridFlow'

  // 거래소 탭
  const tabUpbit = $('tab-upbit')
  const tabBithumb = $('tab-bithumb')
  if(tabUpbit) tabUpbit.textContent = _lang==='ko' ? '업비트' : 'Upbit'
  if(tabBithumb) tabBithumb.textContent = _lang==='ko' ? '빗썸' : 'Bithumb'

  // 검색창
  setph('symbol-search', t.search)

  // 탭
  set('tab-limit', t.limit)
  set('tab-market', t.market)
  set('tab-settings', t.settings)

  // 입력 라벨
  const priceLabel = document.getElementById('price-label')
  const amountLabel = document.getElementById('amount-label')
  const marketAmtLabel = document.getElementById('market-amount-label')
  if(priceLabel) priceLabel.textContent = t.price
  if(amountLabel) amountLabel.textContent = t.amount
  if(marketAmtLabel) marketAmtLabel.textContent = (_lang==='ko' ? '금액 (KRW) — 시장가 즉시 체결' : 'Amount (KRW) — Market order')
  const pctLabelTxt = document.getElementById('pct-label-txt')
  if(pctLabelTxt) pctLabelTxt.textContent = t.pctLabel
  setph('price', _lang==='ko'?'주문 가격':'Order price')
  setph('amount', _lang==='ko'?'최소 5,500원':'Min. 5,500 KRW')
  setph('market-amount', _lang==='ko'?'최소 5,500원':'Min. 5,500 KRW')

  // % 라벨 + 현재가 버튼
  const pctLabel = document.querySelector('.pct-label')
  if(pctLabel) pctLabel.textContent = t.pctLabel
  const amtLabel = document.getElementById('amt-label')
  if(amtLabel) amtLabel.textContent = t.amtLabel
  const seedLabel = document.getElementById('seed-label')
  if(seedLabel) seedLabel.textContent = t.seedLabel

  // 금액 빠른입력 버튼 텍스트
  const amtBtns = document.querySelectorAll('.amt-btn')
  const amtLabels = _lang==='ko'
    ? ['+1천','+5천','+1만','+5만','+10만','+50만','+100만','+1천','+5천','+1만','+5만','+10만','+50만','+100만']
    : ['+1K','+5K','+10K','+50K','+100K','+500K','+1M','+1K','+5K','+10K','+50K','+100K','+500K','+1M']
  amtBtns.forEach((btn, i) => { if(amtLabels[i]) btn.textContent = amtLabels[i] })

  // 매수/매도 버튼
  document.querySelectorAll('.btn-buy').forEach(b => b.textContent = t.buy)
  document.querySelectorAll('.btn-sell').forEach(b => b.textContent = t.sell)
  const pctCur = $('pct-current')
  if(pctCur) pctCur.textContent = _lang==='ko'?'현재가':'Current'

  // 매수/매도 버튼
  const btnBuy = document.querySelector('.btn-buy')
  const btnSell = document.querySelector('.btn-sell')
  if(btnBuy) btnBuy.textContent = t.buy
  if(btnSell) btnSell.textContent = t.sell

  // 시장가 경고
  const mwarn = document.querySelector('.market-warn')
  if(mwarn) mwarn.textContent = t.marketWarning

  // 섹션 타이틀
  const posTitle = document.querySelector('.position-area .section-title')
  const ordTitle = document.querySelector('.orders-area .section-title')
  if(posTitle) posTitle.textContent = t.positions
  if(ordTitle) ordTitle.textContent = t.orders

  // 탑바 라벨
  set('krw-balance-lbl', t.krwBalance)
  set('active-count-lbl', t.activeOrders)
  set('total-eval-lbl', t.totalEval)

  // 심볼 패널 헤더
  setTh('sh-name', _lang==='ko'?'심볼 / 한글명':'Symbol')
  setTh('sh-price', _lang==='ko'?'현재가':'Price')
  setTh('sh-change', _lang==='ko'?'전일대비':'24h Change')

  // 테이블 헤더
  setTh('th-symbol', _lang==='ko'?'심볼':'Symbol')
  setTh('th-side', _lang==='ko'?'구분':'Side')
  setTh('th-price', _lang==='ko'?'가격':'Price')
  setTh('th-amount', _lang==='ko'?'금액':'Amount')
  setTh('th-status', _lang==='ko'?'상태':'Status')
  setTh('th-time', _lang==='ko'?'시각':'Time')
  setTh('th-cancel', _lang==='ko'?'취소':'Cancel')

  // 필터 전체
  const optAll = $('opt-all')
  if(optAll) optAll.textContent = _lang==='ko'?'전체':'All'
  const langBtn = document.getElementById('lang-btn')
  if(langBtn) langBtn.textContent = _lang==='ko' ? '한국어' : 'EN'
  document.querySelectorAll('.logout-btn').forEach(b => b.textContent = t.logout)

  // 코인 선택 안내
  if(!_selectedSymbol) set('sel-name', t.selectCoin)
  // 수수료 안내
  const feeEl = document.getElementById('fee-info')
  if(feeEl) feeEl.textContent = _exchange === 'upbit' ? t.feeUpbit : t.feeBithumb

  // 설정
  const saveBtnEl = document.querySelector('.save-btn')
  if(saveBtnEl) saveBtnEl.textContent = t.save
  const botStatusLbl = document.querySelector('.settings-status span:first-child')
  if(botStatusLbl) botStatusLbl.textContent = t.botStatus

  // 설정 패널 텍스트
  const setTxt = (sel, txt) => { const el = document.querySelector(sel); if(el) el.textContent = txt }
  setTxt('.settings-panel h2', t.settingsTitle)
  // 화면설정 카드 / 사용방법 버튼
  set('display-settings-title', t.displaySettings)
  set('theme-label', t.themeLabel)
  set('lang-label', t.langLabel)
  const guideBtnEl = document.querySelector('button[onclick="openGuide()"]')
  if(guideBtnEl) guideBtnEl.textContent = t.guideBtn
  // cards[0]=화면설정(id로 처리), cards[1]=Upbit, cards[2]=Bithumb
  const cards = document.querySelectorAll('.settings-card-title')
  if(cards[1]) cards[1].textContent = t.upbitKey
  if(cards[2]) cards[2].textContent = t.bithumbKey

  // 현재 키 라벨
  const curDivs = document.querySelectorAll('.settings-cur div')
  if(curDivs[0]) curDivs[0].childNodes[0].textContent = t.curAccess + ' '
  if(curDivs[1]) curDivs[1].childNodes[0].textContent = t.curSecret + ' '
  if(curDivs[2]) curDivs[2].childNodes[0].textContent = t.curConnect + ' '
  if(curDivs[3]) curDivs[3].childNodes[0].textContent = t.curSecret + ' '

  // 입력 라벨
  const settingsLabels = document.querySelectorAll('.settings-input-label')
  if(settingsLabels[0]) settingsLabels[0].textContent = t.newAccess40
  if(settingsLabels[1]) settingsLabels[1].textContent = t.newSecret41
  if(settingsLabels[2]) settingsLabels[2].textContent = t.newConnect46
  if(settingsLabels[3]) settingsLabels[3].textContent = t.newSecret84

  // 입력 placeholder
  const setPhEl = (id, txt) => { const el = document.getElementById(id); if(el) el.placeholder = txt }
  setPhEl('upbit-access', t.phAccess)
  setPhEl('upbit-secret', t.phSecret)
  setPhEl('bithumb-access', t.phConnect)
  setPhEl('bithumb-secret', t.phSecret)

  // 탭 이름
  set('tab-settings', t.settings)

  // 심볼 리스트 재빌드
  buildSymbolList(document.getElementById('symbol-search').value)
}

function toggleLang() {
  _lang = _lang === 'ko' ? 'en' : 'ko'
  localStorage.setItem('lang', _lang)
  document.body.classList.toggle('lang-ko', _lang==='ko')
  const langBtn = document.getElementById('lang-btn')
  if(langBtn) langBtn.textContent = _lang === 'ko' ? '한국어' : 'EN'
  applyLang()
  fetchPositions()
  fetchOrders()
  // 설정창 열려있으면 즉시 갱신
  const settingsVisible = document.getElementById('settings-panel').style.display !== 'none'
  if (settingsVisible) {
    fetchCurrentKeys()
    fetchStatus()
  }
}

function toggleTheme() {
  const body = document.body
  const btn = document.getElementById('theme-btn')
  if (body.classList.contains('light')) {
    body.classList.remove('light')
    btn.textContent = '🌙'
    localStorage.setItem('theme', 'dark')
  } else {
    body.classList.add('light')
    btn.textContent = '☀️'
    localStorage.setItem('theme', 'light')
  }
}

function openCreateGrid() {
  document.getElementById('grid-create-form').style.display = 'block'
  var rp = document.getElementById('grid-right-panel')
  if (rp) { rp.style.display = 'flex' }
  // 현재 선택된 코인 자동입력
  if (_selectedSymbol) {
    document.getElementById('grid-symbol').value = _selectedSymbol.market
    document.getElementById('grid-symbol-search').value = (_selectedSymbol.korean_name||'') + ' (' + _selectedSymbol.market.replace('KRW-','') + ')'
    document.getElementById('grid-base-price').value = _selectedSymbol.trade_price
  }
  updateGridPreview()
  updateGridSummaryPanel()
}

function closeCreateGrid() {
  document.getElementById('grid-create-form').style.display = 'none'
  var rp = document.getElementById('grid-right-panel')
  if (rp) { rp.style.display = 'none' }
}

function updateGridSummaryPanel() {
  var exchange = (document.getElementById('grid-exchange') || {}).value || ''
  var symbol = (document.getElementById('grid-symbol') || {}).value || ''
  var symbolSearch = (document.getElementById('grid-symbol-search') || {}).value || ''
  var basePrice = parseFloat((document.getElementById('grid-base-price') || {}).value) || 0
  var gridCount = parseInt((document.getElementById('grid-count') || {}).value) || 0
  var amount = parseFloat((document.getElementById('grid-amount') || {}).value) || 0
  var minOrder = exchange === 'bithumb' ? 5500 : 5500

  function setChk(id, ok) {
    var el = document.getElementById(id)
    if (!el) return
    el.textContent = ok ? '✓' : '○'
    el.style.color = ok ? '#10B981' : '#4B5563'
  }
  setChk('chk-exchange', !!exchange)
  setChk('chk-coin', !!symbol)
  setChk('chk-minorder', amount >= minOrder)
  setChk('chk-grid', gridCount > 0)

  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val }
  setText('sum-exchange', exchange === 'upbit' ? 'Upbit' : exchange === 'bithumb' ? 'Bithumb' : '-')
  setText('sum-coin', symbolSearch || '-')
  setText('sum-base-price', basePrice ? Number(basePrice).toLocaleString() + ' KRW' : '-')
  setText('sum-grid-count', gridCount ? gridCount + '개' : '-')
  setText('sum-min-order', amount ? Number(amount).toLocaleString() + ' KRW' : '-')

  var canStart = exchange && symbol && basePrice > 0 && gridCount > 0 && amount >= minOrder
  var statusEl = document.getElementById('sum-status')
  if (statusEl) {
    statusEl.textContent = canStart ? '시작 가능' : '시작 불가'
    statusEl.style.color = canStart ? '#10B981' : '#EF4444'
  }
  var msgEl = document.getElementById('grid-cannot-start-msg')
  if (msgEl) {
    if (canStart) {
      msgEl.style.display = 'none'
      msgEl.textContent = ''
    } else {
      var reason = ''
      if (!exchange) reason = '거래소를 선택하세요.'
      else if (!symbol) reason = '코인을 선택하세요.'
      else if (basePrice <= 0) reason = '기준가를 입력하세요.'
      else if (gridCount <= 0) reason = '그리드 수를 입력하세요.'
      else if (amount < minOrder) reason = '최소 주문 금액 미충족 (최소 ' + minOrder.toLocaleString() + ' KRW).'
      msgEl.textContent = reason
      msgEl.style.display = reason ? 'block' : 'none'
    }
  }
}

function searchGridSymbol(query) {
  if ((!_symbols || _symbols.length === 0) && typeof fetchSymbols === 'function') {
    fetchSymbols().then(function(){ searchGridSymbol(query); });
    return;
  }
  const dropdown = document.getElementById('grid-symbol-dropdown')
  if (!query || query.length < 1) { dropdown.style.display = 'none'; return }
  const q = query.toLowerCase()
  const filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q)
  }).slice(0, 20)
  if (!filtered.length) { dropdown.style.display = 'none'; return }
  dropdown.innerHTML = filtered.map(function(s) {
    var mkt = s.market.replace('KRW-','')
    var price = Number(s.trade_price).toLocaleString()
    var kname = s.korean_name || mkt
    return '<div class="grid-sym-item" data-market="' + s.market + '" data-kname="' + kname + '" data-price="' + s.trade_price + '" ' +
      'onclick="selectGridSymbolById(this)" ' +
      'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center">' +
      '<div><span style="font-weight:700;font-size:13px">' + kname + '</span>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + mkt + '</span></div>' +
      '<span style="font-size:13px;font-weight:600;color:var(--accent)">' + price + '원</span>' +
      '</div>'
  }).join('')
  dropdown.style.display = 'block'
}

function selectGridSymbolById(el) {
  var market = el.getAttribute('data-market')
  var kname = el.getAttribute('data-kname')
  var price = el.getAttribute('data-price')
  document.getElementById('grid-symbol').value = market
  document.getElementById('grid-symbol-search').value = kname + ' (' + market.replace('KRW-','') + ')'
  document.getElementById('grid-symbol-dropdown').style.display = 'none'
  document.getElementById('grid-base-price').value = price
  updateGridPreview()
}

// 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
  if (!e.target.closest('#grid-symbol-search') && !e.target.closest('#grid-symbol-dropdown')) {
    const dd = document.getElementById('grid-symbol-dropdown')
    if (dd) dd.style.display = 'none'
  }
  if (!e.target.closest('#rebal-add-symbol') && !e.target.closest('#rebal-symbol-dropdown')) {
    const dd2 = document.getElementById('rebal-symbol-dropdown')
    if (dd2) dd2.style.display = 'none'
  }
})

function updateGridPreview() {
  const basePrice = parseFloat(document.getElementById('grid-base-price').value)
  const rangePct = parseFloat(document.getElementById('grid-range-pct').value)
  const gridCount = parseInt(document.getElementById('grid-count').value)
  const amount = parseFloat(document.getElementById('grid-amount').value)
  const profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1
  const el = document.getElementById('grid-preview')
  if (!basePrice || !rangePct || !gridCount || !amount) { el.innerHTML = ''; return }
  const lower = basePrice * (1 - rangePct/100)
  const upper = basePrice * (1 + rangePct/100)
  const step = (upper - lower) / gridCount
  const totalInvest = amount * gridCount
  el.innerHTML =
    '범위: ' + lower.toLocaleString() + ' ~ ' + upper.toLocaleString() + '원<br>' +
    '간격: ' + step.toFixed(2) + '원<br>' +
    '총 투자금액: ' + totalInvest.toLocaleString() + '원<br>' +
    '예상 회차 수익: ' + (profitGap * (amount/basePrice)).toFixed(4) + '원'
}

// 입력값 변경 시 미리보기 업데이트
['grid-base-price','grid-range-pct','grid-count','grid-amount','grid-profit-gap'].forEach(id => {
  const el = document.getElementById(id)
  if (el) el.addEventListener('input', updateGridPreview)
})

async function submitCreateGrid() {
  // 실제 계정 경고
  if (_currentUser && !_currentUser.is_dry_run) {
    if (!confirm('⚠️ 실제 계좌로 그리드 전략을 시작합니다.\n실제 돈이 사용됩니다. 계속하시겠습니까?')) return
  }
  const exchange = document.getElementById('grid-exchange').value
  const symbol = document.getElementById('grid-symbol').value.trim().toUpperCase()
  const basePrice = parseFloat(document.getElementById('grid-base-price').value)
  const rangePct = parseFloat(document.getElementById('grid-range-pct').value)
  const gridCount = parseInt(document.getElementById('grid-count').value)
  const amount = parseFloat(document.getElementById('grid-amount').value)
  const profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1
  const msgEl = document.getElementById('grid-create-msg')

  if (!symbol || !basePrice || !rangePct || !gridCount || !amount) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '모든 항목을 입력하세요'; return
  }
  if (amount * gridCount < 5500) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '총 투자금액이 너무 적습니다'; return
  }

  const maxInvestment = parseFloat(document.getElementById('grid-max-investment').value) || null
  const stopLoss = parseFloat(document.getElementById('grid-stop-loss').value) || null
  const dailyLoss = parseFloat(document.getElementById('grid-daily-loss').value) || null
  const profitTarget = parseFloat(document.getElementById('grid-profit-target').value) || null
  const r = await authFetch('/grid/strategies', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({exchange, symbol, base_price: basePrice, range_pct: rangePct,
      grid_count: gridCount, amount_per_grid: amount, profit_gap: profitGap,
      max_investment: maxInvestment, stop_loss_price: stopLoss,
      daily_loss_limit: dailyLoss, profit_target_pct: profitTarget})
  })
  if (!r) return
  const d = await r.json()
  if (r.ok) {
    msgEl.style.color = '#4ade80'
    msgEl.textContent = '✅ 전략 시작! ID: ' + d.strategy_id
    setTimeout(() => { closeCreateGrid(); fetchGridStrategies() }, 1500)
  } else {
    msgEl.style.color = '#f87171'
    msgEl.textContent = d.detail || '생성 실패'
  }
}

async function deleteGrid(id) {
  if (!confirm('전략과 모든 주문 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return
  const r = await authFetch('/grid/strategies/'+id+'/delete', {method:'DELETE'})
  if (!r) return
  const d = await r.json()
  if (r.ok) { showToast('🗑 전략 삭제 완료'); fetchGridStrategies() }
  else showToast('❌ ' + (d.detail || '삭제 실패'))
}

function editGrid(id) {
  // 해당 전략 데이터 가져와서 폼에 채우기
  authFetch('/grid/strategies').then(r => r.json()).then(d => {
    const s = d.strategies.find(x => x.id === id)
    if (!s) return
    document.getElementById('grid-create-form').style.display = 'block'
    document.getElementById('grid-exchange').value = s.exchange
    document.getElementById('grid-symbol').value = s.symbol
    document.getElementById('grid-symbol-search').value = s.symbol
    document.getElementById('grid-base-price').value = s.base_price
    document.getElementById('grid-range-pct').value = s.range_pct
    document.getElementById('grid-count').value = s.grid_count
    document.getElementById('grid-amount').value = s.amount_per_grid
    document.getElementById('grid-profit-gap').value = s.profit_gap
    // 저장 버튼을 수정 모드로
    const btn = document.querySelector('#grid-create-form button[onclick="submitCreateGrid()"]')
    if (btn) {
      btn.textContent = '✅ 전략 수정 저장'
      btn.onclick = function() { submitEditGrid(id) }
    }
    updateGridPreview()
    document.getElementById('grid-create-form').scrollIntoView({behavior:'smooth'})
  })
}

async function submitEditGrid(id) {
  const exchange = document.getElementById('grid-exchange').value
  const symbol = document.getElementById('grid-symbol').value.trim().toUpperCase()
  const basePrice = parseFloat(document.getElementById('grid-base-price').value)
  const rangePct = parseFloat(document.getElementById('grid-range-pct').value)
  const gridCount = parseInt(document.getElementById('grid-count').value)
  const amount = parseFloat(document.getElementById('grid-amount').value)
  const profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1
  const msgEl = document.getElementById('grid-create-msg')
  if (!symbol || !basePrice || !rangePct || !gridCount || !amount) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '모든 항목을 입력하세요'; return
  }
  const r = await authFetch('/grid/strategies/'+id, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({exchange, symbol, base_price: basePrice, range_pct: rangePct,
      grid_count: gridCount, amount_per_grid: amount, profit_gap: profitGap})
  })
  if (!r) return
  const d = await r.json()
  if (r.ok) {
    msgEl.style.color = '#4ade80'
    msgEl.textContent = '✅ 수정 완료!'
    setTimeout(() => { closeCreateGrid(); fetchGridStrategies() }, 1500)
  } else {
    msgEl.style.color = '#f87171'
    msgEl.textContent = d.detail || '수정 실패'
  }
}

// ── DCA JS ────────────────────────────────────────
function openCreateDCA() {
  document.getElementById('dca-create-form').style.display = 'block'
  var rp = document.getElementById('dca-right-panel')
  if (rp) rp.style.display = 'flex'
  if (_selectedSymbol) {
    document.getElementById('dca-symbol').value = _selectedSymbol.market
    document.getElementById('dca-symbol-search').value = (_selectedSymbol.korean_name||'') + ' (' + _selectedSymbol.market.replace('KRW-','') + ')'
  }
  updateDCAPreview()
}

function closeCreateDCA() {
  document.getElementById('dca-create-form').style.display = 'none'
  var rp = document.getElementById('dca-right-panel')
  if (rp) rp.style.display = 'none'
}

function updateDCASummaryPanel() {
  var type = (document.getElementById('dca-type') || {}).value || ''
  var exchange = (document.getElementById('dca-exchange') || {}).value || ''
  var symbol = (document.getElementById('dca-symbol') || {}).value || ''
  var symbolSearch = (document.getElementById('dca-symbol-search') || {}).value || ''
  var perOrder = parseFloat((document.getElementById('dca-amount-per-order') || {}).value) || 0
  var rounds = parseInt((document.getElementById('dca-total-rounds') || {}).value) || 0
  var total = parseFloat((document.getElementById('dca-total-amount') || {}).value) || 0
  var minOrder = exchange === 'bithumb' ? 5500 : 5500

  var typeLabel = type === 'DCA' ? '분할매수 (하락)' : type === 'DCA_TIME' ? '분할매수 (시간)' : type === 'ACCUMULATE' ? '적립식' : '-'
  var exchangeLabel = exchange === 'upbit' ? 'Upbit' : exchange === 'bithumb' ? 'Bithumb' : '-'
  var estimatedTotal = perOrder > 0 && rounds > 0 ? perOrder * rounds : 0

  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val }
  setText('dca-sum-type', typeLabel)
  setText('dca-sum-exchange', exchangeLabel)
  setText('dca-sum-coin', symbolSearch || '-')
  setText('dca-sum-per-order', perOrder ? Number(perOrder).toLocaleString() + ' KRW' : '-')
  setText('dca-sum-rounds', rounds ? rounds + '회' : '-')
  setText('dca-sum-total', estimatedTotal ? Number(estimatedTotal).toLocaleString() + ' KRW' : '-')

  var canStart = exchange && symbol && perOrder >= minOrder && rounds > 0 && (total >= estimatedTotal || total === 0)
  var reason = ''
  if (!symbol) reason = '코인을 선택하세요'
  else if (perOrder < minOrder && perOrder > 0) reason = '최소 주문 금액 미달 (' + minOrder.toLocaleString() + ' KRW)'
  else if (rounds <= 0) reason = '실행 횟수가 0입니다'
  else if (total > 0 && total < estimatedTotal) reason = '총 투자금이 부족합니다 (필요: ' + Number(estimatedTotal).toLocaleString() + ' KRW)'

  var statusEl = document.getElementById('dca-sum-status')
  if (statusEl) {
    statusEl.textContent = reason ? '시작 불가' : (canStart ? '시작 가능' : '미입력')
    statusEl.style.color = reason ? '#EF4444' : (canStart ? '#10B981' : '#4B5563')
  }

  // 검증 바 업데이트
  var prevEl = document.getElementById('dca-preview')
  if (prevEl) {
    if (reason) {
      prevEl.style.color = '#EF4444'
      prevEl.textContent = reason
    } else if (canStart) {
      prevEl.style.color = '#10B981'
      prevEl.textContent = '준비 완료 — 전략을 시작할 수 있습니다.'
    } else {
      prevEl.style.color = 'rgba(255,255,255,0.46)'
      prevEl.textContent = '모든 필드를 입력하면 검증 결과가 표시됩니다.'
    }
  }
}

function updateDCAForm() {
  var type = document.getElementById('dca-type').value
  document.getElementById('dca-price-drop-wrap').style.display = type === 'DCA' ? 'block' : 'none'
  document.getElementById('dca-time-wrap').style.display = type === 'DCA_TIME' ? 'block' : 'none'
  document.getElementById('dca-schedule-wrap').style.display = type === 'ACCUMULATE' ? 'block' : 'none'
  document.getElementById('dca-rounds-wrap').style.display = type === 'ACCUMULATE' ? 'none' : 'block'
  updateDCAPreview()
}

function updateDCAPreview() {
  var total = parseFloat(document.getElementById('dca-total-amount').value)
  var perOrder = parseFloat(document.getElementById('dca-amount-per-order').value)
  var rounds = parseInt(document.getElementById('dca-total-rounds').value) || 1
  var el = document.getElementById('dca-preview')
  if (!total || !perOrder) { el.innerHTML = ''; return }
  var calcRounds = Math.floor(total / perOrder)
  el.innerHTML =
    '총 투자: ' + Number(total).toLocaleString() + '원<br>' +
    '회차별: ' + Number(perOrder).toLocaleString() + '원<br>' +
    '예상 횟수: ' + calcRounds + '회'
}

function searchDCASymbol(query) {
  var dropdown = document.getElementById('dca-symbol-dropdown')
  if (!query) { dropdown.style.display = 'none'; return }
  var q = query.toLowerCase()
  var filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q)
  }).slice(0, 15)
  if (!filtered.length) { dropdown.style.display = 'none'; return }
  dropdown.innerHTML = filtered.map(function(s) {
    return '<div class="grid-sym-item" data-market="' + s.market + '" data-kname="' + (s.korean_name||s.market) + '" ' +
      'onclick="selectDCASymbol(this)" ' +
      'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between">' +
      '<div><span style="font-weight:700">' + (s.korean_name||s.market) + '</span>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + s.market.replace('KRW-','') + '</span></div>' +
      '<span style="color:var(--accent)">' + Number(s.trade_price).toLocaleString() + '원</span>' +
      '</div>'
  }).join('')
  dropdown.style.display = 'block'
}

function selectDCASymbol(el) {
  document.getElementById('dca-symbol').value = el.getAttribute('data-market')
  document.getElementById('dca-symbol-search').value = el.getAttribute('data-kname') + ' (' + el.getAttribute('data-market').replace('KRW-','') + ')'
  document.getElementById('dca-symbol-dropdown').style.display = 'none'
}

async function submitCreateDCA() {
  var typeVal = document.getElementById('dca-type').value
  var exchange = document.getElementById('dca-exchange').value
  var symbol = document.getElementById('dca-symbol').value.trim().toUpperCase()
  var totalAmount = parseFloat(document.getElementById('dca-total-amount').value)
  var amountPerOrder = parseFloat(document.getElementById('dca-amount-per-order').value)
  var totalRounds = parseInt(document.getElementById('dca-total-rounds').value) || 10
  var priceDrop = parseFloat(document.getElementById('dca-price-drop').value) || null
  var timeInterval = parseInt(document.getElementById('dca-time-interval').value) || null
  var schedule = document.getElementById('dca-schedule').value
  var stopLoss = parseFloat(document.getElementById('dca-stop-loss').value) || null
  var maxAvg = parseFloat(document.getElementById('dca-max-avg').value) || null
  var msgEl = document.getElementById('dca-create-msg')

  if (!symbol) { msgEl.style.color='#f87171'; msgEl.textContent='코인을 선택하세요'; return }
  if (!totalAmount || !amountPerOrder) { msgEl.style.color='#f87171'; msgEl.textContent='금액을 입력하세요'; return }

  var strategyType = typeVal === 'ACCUMULATE' ? 'ACCUMULATE' : 'DCA'
  var intervalType = typeVal === 'DCA_TIME' ? 'TIME' : 'PRICE'

  var body = {
    exchange, symbol, strategy_type: strategyType,
    total_amount: totalAmount, amount_per_order: amountPerOrder,
    total_rounds: totalRounds, interval_type: intervalType,
    price_drop_pct: priceDrop !== null ? priceDrop : undefined,
    time_interval_hours: timeInterval !== null ? timeInterval : undefined,
    accumulate_schedule: strategyType === 'ACCUMULATE' ? schedule : undefined,
    stop_loss_price: stopLoss !== null ? stopLoss : undefined,
    max_avg_price: maxAvg !== null ? maxAvg : undefined
  }

  if (!_currentUser.is_dry_run) {
    if (!confirm('⚠️ 실제 계좌로 전략을 시작합니다. 계속할까요?')) return
  }

  var r = await authFetch('/dca/strategies', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  if (!r) return
  var d = await r.json()
  if (r.ok) {
    msgEl.style.color = '#4ade80'
    msgEl.textContent = '✅ 전략 시작! ID: ' + d.strategy_id
    setTimeout(() => { closeCreateDCA(); fetchDCAStrategies() }, 1500)
  } else {
    msgEl.style.color = '#f87171'
    msgEl.textContent = d.detail || '생성 실패'
  }
}

async function fetchDCAStrategies() {
  window.__gfLastDCAFetchAt = Date.now()
  var r = await authFetch('/dca/strategies')
  if (!r) return
  var d = await r.json()
  if (Array.isArray(d.strategies)) {
    d.strategies = applyDCAStateOverridesToStrategies(d.strategies)
  }
  var el = document.getElementById('dca-strategy-list')
  if (!el) return
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="width:900px;height:152px;border-radius:16px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.06);padding:20px;margin-top:16px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,0.20)">' +
      '<div style="font-size:18px;opacity:0.28;margin-bottom:2px">◈</div>' +
      '<div style="font-size:15px;font-weight:700;color:#FFFFFF">실행 중인 분할매수 전략이 없습니다</div>' +
      '<div style="font-size:11px;line-height:16px;color:rgba(255,255,255,0.40);margin-top:6px;text-align:center">설정한 조건마다 자동으로 분할 매수합니다. 지금 첫 전략을 만들어보세요.</div>' +
      '<button onclick="openCreateDCA()" style="height:30px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:12px">+ 새 전략 만들기</button>' +
    '</div>'
    return
  }
  el.innerHTML = d.strategies.map(function(s) {
    var statusColor = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : s.status === 'COMPLETED' ? '#3B82F6' : '#4B5563'
    var statusText = {'ACTIVE':'● 실행 중','PAUSED':'● 일시정지','STOPPED':'● 종료','COMPLETED':'● 완료'}[s.status] || s.status
    var statusBg = s.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : s.status === 'PAUSED' ? 'rgba(245,158,11,0.12)' : s.status === 'COMPLETED' ? 'rgba(59,130,246,0.12)' : 'rgba(75,85,99,0.15)'
    var borderAccent = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : s.status === 'COMPLETED' ? '#3B82F6' : 'rgba(255,255,255,0.08)'
    var typeText = s.strategy_type === 'ACCUMULATE' ? '적립식' : '분할매수'
    var intervalText = s.strategy_type === 'ACCUMULATE'
      ? ({'DAILY':'매일','WEEKLY':'매주','MONTHLY':'매월'}[s.accumulate_schedule]||'-')
      : (s.price_drop_pct ? s.price_drop_pct+'% 하락 시' : s.time_interval_hours+'시간마다')
    var progress = s.total_rounds > 0 ? Math.round(s.completed_rounds / s.total_rounds * 100) : 0
    var _ft = function(ts){ if(!ts) return ''; var _d=new Date(ts); return (_d.getMonth()+1)+'/'+_d.getDate()+' '+(_d.getHours()<10?'0':'')+_d.getHours()+':'+(_d.getMinutes()<10?'0':'')+_d.getMinutes() }
    var lastRunStr = _ft(s.last_run_at || s.updated_at)
    var coinName = (_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')
    // 행당 최대 2개 버튼
    var primaryBtn = ''
    if (s.__uiBusy) primaryBtn = '<button disabled style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.45);cursor:default">' + (s.__uiBusyText || '처리 중.') + '</button>'
    else if (s.status === 'ACTIVE') primaryBtn = '<button onclick="pauseDCA('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">일시정지</button>'
    else if (s.status === 'PAUSED') primaryBtn = '<button onclick="resumeDCA('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">재개</button>'
    else if (s.status === 'STOPPED' || s.status === 'COMPLETED') primaryBtn = '<button onclick="deleteDCA('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">삭제</button>'
    var detailBtn = '<button onclick="viewDCAOrders('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.52);cursor:pointer">주문내역 ▾</button>'
    return '<div style="min-height:108px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);border-left:3px solid ' + borderAccent + ';padding:12px 14px;margin-bottom:10px;box-sizing:border-box">' +
      '<div style="display:grid;grid-template-columns:1.5fr 0.7fr 0.7fr 0.7fr auto;align-items:center;gap:10px;min-height:84px">' +
        '<div>' +
          '<div style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;color:' + statusColor + ';background:' + statusBg + ';border-radius:4px;padding:2px 7px;margin-bottom:4px">' + statusText + '</div>' +
          '<div style="font-size:12px;font-weight:700;color:#FFFFFF">' + coinName + ' <span style="font-size:9px;color:rgba(255,255,255,0.38)">' + typeText + ' · ' + s.exchange.toUpperCase() + '</span></div>' +
          '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:4px;margin-top:4px;overflow:hidden;width:100%"><div style="height:100%;width:'+progress+'%;background:#F59E0B;border-radius:4px"></div></div>' +
          (lastRunStr ? '<div style="font-size:9px;color:rgba(255,255,255,0.26);margin-top:3px">마지막 실행 ' + lastRunStr + '</div>' : '') +
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
          '<div style="font-size:9px;color:rgba(255,255,255,0.30)">총 투자액</div>' +
          '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + Number(s.total_invested).toLocaleString() + '원</div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;flex-direction:column">' + primaryBtn + detailBtn + '</div>' +
      '</div>' +
      '<div id="dca-orders-'+s.id+'" style="display:none;margin-top:12px"></div>' +
    '</div>'
  }).join('')
}

async function pauseDCA(id) {
  if (window.__dcaActionLocks[String(id)]) return
  window.__dcaActionLocks[String(id)] = true
  setDCAStateOverride(id, { status:'PAUSED', __uiBusy:true, __uiBusyText:'정지 처리 중...' })
  try { fetchDCAStrategies(); } catch (e) {}
  showToast('⏸ 정지 요청 전송');
  addOptimisticRecentActivity({ strategyType:'DCA', symbolText:'전략#'+id, statusKo:'일시정지 요청', color:'#f59e0b' });
  try {
    var r = await authFetch('/dca/strategies/'+id+'/pause', {method:'POST'})
    if (r && r.ok) {
      setDCAStateOverride(id, { status:'PAUSED', __uiBusy:false, __uiBusyText:'' })
      try { fetchDCAStrategies(); } catch (e) {}
      showToast('⏸ 전략 일시정지');
      fireAndForgetPostStateRefresh('dca');
    } else {
      clearDCAStateOverride(id)
      try { fetchDCAStrategies(); } catch (e) {}
      showToast('❌ 전략 일시정지 실패');
    }
  } catch (e) {
    clearDCAStateOverride(id)
    try { fetchDCAStrategies(); } catch (e) {}
    showToast('❌ 전략 일시정지 실패');
  } finally {
    delete window.__dcaActionLocks[String(id)]
  }
}
async function resumeDCA(id) {
  if (!confirm('전략을 재개하시겠습니까? 재개까지는 몇 분이 소요 될 수 있습니다.')) return;
  if (window.__dcaActionLocks[String(id)]) return
  window.__dcaActionLocks[String(id)] = true
  if (isEmergencyStopActive()) {
    setEmergencyStopActive(false);
    writeActivitySummary('EMERGENCY_RELEASED', '긴급정지 해제', '시스템');
  }
  setDCAStateOverride(id, { status:'ACTIVE', __uiBusy:true, __uiBusyText:'재개 처리 중...' })
  try { fetchDCAStrategies(); } catch (e) {}
  showToast('▶ 재개 요청 전송');
  addOptimisticRecentActivity({ strategyType:'DCA', symbolText:'전략#'+id, statusKo:'재개 요청', color:'#4ade80' });
  try {
    var r = await authFetch('/dca/strategies/'+id+'/resume', {method:'POST'})
    if (r && r.ok) {
      setDCAStateOverride(id, { status:'ACTIVE', __uiBusy:false, __uiBusyText:'' })
      try { fetchDCAStrategies(); } catch (e) {}
      showToast('▶ 전략 재개');
      fireAndForgetPostStateRefresh('dca');
    } else {
      clearDCAStateOverride(id)
      try { fetchDCAStrategies(); } catch (e) {}
      showToast('❌ 전략 재개 실패');
    }
  } catch (e) {
    clearDCAStateOverride(id)
    try { fetchDCAStrategies(); } catch (e) {}
    showToast('❌ 전략 재개 실패');
  } finally {
    delete window.__dcaActionLocks[String(id)]
  }
}
async function stopDCA(id) {
  if (!confirm('전략을 종료할까요?')) return
  var r = await authFetch('/dca/strategies/'+id, {method:'DELETE'})
  if (r && r.ok) {
    showToast('⏹ 전략 종료');
    addOptimisticRecentActivity({ strategyType:'DCA', symbolText:'전략#'+id, statusKo:'종료', color:'#f87171' });
    try { fetchDCAStrategies(); } catch (e) {}
    fireAndForgetPostStateRefresh('dca');
  }
}
async function deleteDCA(id) {
  if (!confirm('전략을 완전히 삭제할까요?')) return
  var r = await authFetch('/dca/strategies/'+id+'/delete', {method:'DELETE'})
  if (r && r.ok) { showToast('🗑 삭제 완료'); fetchDCAStrategies() }
}

async function viewDCAOrders(id) {
  var el = document.getElementById('dca-orders-'+id)
  if (el.style.display !== 'none') { el.style.display = 'none'; return }
  var r = await authFetch('/dca/strategies/'+id+'/orders')
  if (!r) return
  var d = await r.json()
  if (!d.orders.length) { el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:12px">주문 기록 없음</div>'; el.style.display='block'; return }
  el.innerHTML = '<div style="border-top:1px solid var(--border2);padding-top:10px;overflow-x:auto">' +
    '<table style="width:100%;min-width:400px;font-size:11px">' +
    '<thead><tr><th>회차</th><th>매수가</th><th>금액</th><th>수량</th><th>시각</th></tr></thead>' +
    '<tbody>' + d.orders.map(function(o) {
      return '<tr>' +
        '<td style="text-align:center;font-weight:700">#'+o.round_num+'</td>' +
        '<td>' + Number(o.price).toLocaleString() + '원</td>' +
        '<td>' + Number(o.amount_krw).toLocaleString() + '원</td>' +
        '<td>' + parseFloat(o.qty).toFixed(6) + '</td>' +
        '<td style="color:var(--text3)">' + (o.created_at||'').substring(0,16) + '</td>' +
        '</tr>'
    }).join('') + '</tbody></table></div>'
  el.style.display = 'block'
}

// ── 백테스트 JS ───────────────────────────────────
function searchBTSymbol(query) {
  var dropdown = document.getElementById('bt-symbol-dropdown')
  if (!query) { dropdown.style.display = 'none'; return }
  var q = query.toLowerCase()
  var filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q)
  }).slice(0, 15)
  if (!filtered.length) { dropdown.style.display = 'none'; return }
  dropdown.innerHTML = filtered.map(function(s) {
    return '<div data-market="' + s.market + '" data-price="' + s.trade_price + '" ' +
      'onclick="selectBTSymbol(this)" ' +
      'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between">' +
      '<div><span style="font-weight:700">' + (s.korean_name||s.market) + '</span>' +
      '<span style="font-size:11px;color:var(--text3);margin-left:8px">' + s.market.replace('KRW-','') + '</span></div>' +
      '<span style="color:var(--accent)">' + Number(s.trade_price).toLocaleString() + '원</span>' +
      '</div>'
  }).join('')
  dropdown.style.display = 'block'
}

function selectBTSymbol(el) {
  var market = el.getAttribute('data-market')
  var price = parseFloat(el.getAttribute('data-price'))
  document.getElementById('bt-symbol').value = market
  document.getElementById('bt-symbol-search').value = market.replace('KRW-','')
  document.getElementById('bt-base-price').value = price
  document.getElementById('bt-symbol-dropdown').style.display = 'none'
  // 권장 간격 자동 계산 (수수료 × 3 = 안전마진)
  var fee = parseFloat(document.getElementById('bt-fee').value) / 100 || 0.0005
  var minGap = Math.ceil(price * fee * 2 * 1.5)
  document.getElementById('bt-profit-gap').value = minGap
  document.getElementById('bt-gap-hint').textContent = '권장 최소 간격: ' + minGap + '원 (수수료 손익분기 기준)'
}

async function runBacktest() {
  var symbol = document.getElementById('bt-symbol').value.trim().toUpperCase()
  var period = parseInt(document.getElementById('bt-period').value)
  var basePrice = parseFloat(document.getElementById('bt-base-price').value)
  var rangePct = parseFloat(document.getElementById('bt-range-pct').value)
  var gridCount = parseInt(document.getElementById('bt-grid-count').value)
  var amount = parseFloat(document.getElementById('bt-amount').value)
  var profitGap = parseFloat(document.getElementById('bt-profit-gap').value) || 1
  var fee = parseFloat(document.getElementById('bt-fee').value) / 100 || 0.0005

  if (!symbol) { showToast('❌ 코인을 선택하세요'); return }
  if (!basePrice || !rangePct || !amount) { showToast('❌ 모든 항목을 입력하세요'); return }

  // 최소 권장 매도 간격 경고 (수수료 × 2 이상이어야 수익)
  var minGap = basePrice * fee * 2
  if (profitGap < minGap) {
    var msg = '⚠️ 매도 간격('+profitGap+'원)이 수수료 손익분기('+minGap.toFixed(2)+'원)보다 작습니다.\n권장 간격: ' + Math.ceil(minGap * 1.5) + '원 이상\n계속 진행할까요?'
    if (!confirm(msg)) return
  }

  document.getElementById('bt-loading').style.display = 'block'
  document.getElementById('bt-result').style.display = 'none'

  var r = await authFetch('/backtest/grid', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      symbol, period_days: period, base_price: basePrice,
      range_pct: rangePct, grid_count: gridCount,
      amount_per_grid: amount, profit_gap: profitGap, fee_rate: fee
    })
  })
  document.getElementById('bt-loading').style.display = 'none'
  if (!r) return
  var d = await r.json()
  if (!r.ok) { showToast('❌ ' + (d.detail||'백테스트 실패')); return }
  var _btEg = document.getElementById('bt-empty-guide'); if(_btEg) _btEg.style.display='none';
  showBTResult(d)
  fetchBTHistory()
}

function showBTResult(d) {
  var el = document.getElementById('bt-result')
  var content = document.getElementById('bt-result-content')
  var profitColor = d.total_profit >= 0 ? '#4ade80' : '#f87171'
  var profitSign = d.total_profit >= 0 ? '+' : ''
  var vsHold = d.profit_pct - d.buy_hold_pct
  var vsColor = vsHold >= 0 ? '#4ade80' : '#f87171'

  content.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">' +
    '<div class="pos-item"><div class="pos-item-label">총 수익</div><div class="pos-item-val" style="color:'+profitColor+';font-size:16px;font-weight:800">'+profitSign+Number(d.total_profit).toLocaleString()+'원</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">수익률</div><div class="pos-item-val" style="color:'+profitColor+'">'+profitSign+d.profit_pct+'%</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">Buy&Hold 대비</div><div class="pos-item-val" style="color:'+vsColor+'">'+(vsHold>=0?'+':'')+vsHold.toFixed(2)+'%</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">총 거래</div><div class="pos-item-val">'+d.total_trades+'회</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">승률</div><div class="pos-item-val">'+d.win_rate+'%</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">MDD</div><div class="pos-item-val" style="color:#f87171">-'+d.mdd+'%</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">총 투자금</div><div class="pos-item-val">'+Number(d.total_investment).toLocaleString()+'원</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">Buy&Hold</div><div class="pos-item-val">'+(d.buy_hold_pct>=0?'+':'')+d.buy_hold_pct+'%</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">데이터</div><div class="pos-item-val">'+d.candle_count+'일</div></div>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text3);padding:8px;background:var(--bg3);border-radius:6px">' +
    '시작가: '+Number(d.first_price).toLocaleString()+'원 → 종가: '+Number(d.last_price).toLocaleString()+'원 · ' +
    '범위: '+d.range_pct+'% · 그리드: '+d.grid_count+'개 · 간격: '+d.profit_gap+'원' +
    '</div>'

  el.style.display = 'block'
}

async function fetchBTHistory() {
  var r = await authFetch('/backtest/history')
  if (!r) return
  var d = await r.json()
  var el = document.getElementById('bt-history-list')
  if (!d.history || !d.history.length) {
    el.innerHTML = '<div style="padding:20px 16px;text-align:center"><div style="font-size:24px;margin-bottom:8px">🔬</div><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px">백테스트 기록이 없습니다</div><div style="font-size:11px;color:var(--text3)">실행하면 결과가 여기에 저장됩니다</div></div>'
    return
  }
  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;min-width:600px;font-size:11px">' +
    '<thead><tr><th>코인</th><th>기간</th><th>수익</th><th>수익률</th><th>Buy&Hold</th><th>거래수</th><th>MDD</th><th>날짜</th></tr></thead>' +
    '<tbody>' + d.history.map(function(h) {
      var pc = h.profit_pct >= 0 ? '#4ade80' : '#f87171'
      var sign = h.profit_pct >= 0 ? '+' : ''
      return '<tr>' +
        '<td style="font-weight:700">' + h.symbol.replace('KRW-','') + '</td>' +
        '<td>' + h.period_days + '일</td>' +
        '<td style="color:'+pc+';font-weight:700">' + sign + Number(h.total_profit).toLocaleString() + '원</td>' +
        '<td style="color:'+pc+'">' + sign + h.profit_pct + '%</td>' +
        '<td style="color:' + (h.buy_hold_pct>=0?'#4ade80':'#f87171') + '">' + (h.buy_hold_pct>=0?'+':'') + h.buy_hold_pct + '%</td>' +
        '<td>' + h.total_trades + '회</td>' +
        '<td style="color:#f87171">-' + h.mdd + '%</td>' +
        '<td style="color:var(--text3)">' + h.created_at.substring(0,10) + '</td>' +
        '</tr>'
    }).join('') + '</tbody></table></div>'
}

  window.__gridStateOverrides = window.__gridStateOverrides || {};
  window.__gridActionLocks = window.__gridActionLocks || {};
  window.__dcaStateOverrides = window.__dcaStateOverrides || {};
  window.__dcaActionLocks = window.__dcaActionLocks || {};
  window.__gfRefreshTimers = window.__gfRefreshTimers || {};

  function cloneJsonSafe(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function setGridStateOverride(id, patch) {
    if (!id) return;
    window.__gridStateOverrides[String(id)] = Object.assign({}, window.__gridStateOverrides[String(id)] || {}, patch || {});
  }

  function clearGridStateOverride(id) {
    if (!id) return;
    try { delete window.__gridStateOverrides[String(id)]; } catch (e) {}
  }

  function applyGridStateOverridesToStrategies(list) {
    if (!Array.isArray(list)) return Array.isArray(list) ? list : [];
    return list.map(function(s) {
      var ov = window.__gridStateOverrides[String(s.id)];
      return ov ? Object.assign({}, s, ov) : s;
    });
  }

  function setDCAStateOverride(id, patch) {
    if (!id) return;
    window.__dcaStateOverrides[String(id)] = Object.assign({}, window.__dcaStateOverrides[String(id)] || {}, patch || {});
  }

  function clearDCAStateOverride(id) {
    if (!id) return;
    try { delete window.__dcaStateOverrides[String(id)]; } catch (e) {}
  }

  function applyDCAStateOverridesToStrategies(list) {
    if (!Array.isArray(list)) return Array.isArray(list) ? list : [];
    return list.map(function(s) {
      var ov = window.__dcaStateOverrides[String(s.id)];
      return ov ? Object.assign({}, s, ov) : s;
    });
  }

  function scheduleStrategyRefresh(strategyKind, delayMs) {
    var kind = strategyKind || 'all';
    try { clearTimeout(window.__gfRefreshTimers[kind]); } catch (e) {}
    window.__gfRefreshTimers[kind] = setTimeout(async function() {
      try { await refreshAfterStrategyStateChange(kind); } catch (e) {}
    }, typeof delayMs === 'number' ? delayMs : 700);
  }

  function getPatchedDashboardCache() {
    if (!window.__dashCache) return null;
    var cache = cloneJsonSafe(window.__dashCache);
    if (cache && cache.gridData && Array.isArray(cache.gridData.strategies)) {
      cache.gridData.strategies = applyGridStateOverridesToStrategies(cache.gridData.strategies);
    }
    return cache;
  }

  function rerenderDashboardFromCache() {
    try {
      var cache = getPatchedDashboardCache();
      if (!cache) return;
      renderDashTop(cache.combinedBalData, cache.combinedPosData, cache.gridData, cache.dcaData, cache.rebalData);
      renderDashStrategies(cache.gridData, cache.dcaData, cache.rebalData);
      renderDashStatus(cache.gridData, cache.dcaData, cache.rebalData);
    } catch (e) {}
  }

  async function refreshAfterStrategyStateChange(strategyKind) {
    try { if (typeof fetchDashboard === 'function') await fetchDashboard(); } catch (e) {}
    try { if (typeof refreshGlobalTopStats === 'function') await refreshGlobalTopStats(); } catch (e) {}
    try { if (typeof fetchBalances === 'function') await fetchBalances(); } catch (e) {}
    try { if (typeof fetchPositions === 'function') await fetchPositions(); } catch (e) {}
    try { if (typeof fetchOrders === 'function') await fetchOrders(); } catch (e) {}
    try {
      if (strategyKind === 'grid' && typeof fetchGridStrategies === 'function') await fetchGridStrategies();
      else if (strategyKind === 'dca' && typeof fetchDCAStrategies === 'function') await fetchDCAStrategies();
      else {
        if (typeof fetchGridStrategies === 'function') await fetchGridStrategies();
        if (typeof fetchDCAStrategies === 'function') await fetchDCAStrategies();
      }
    } catch (e) {}
    try { if (typeof refreshTradeSummary === 'function') await refreshTradeSummary(); } catch (e) {}
    try { cleanupOptimisticRecentActivity(1200); } catch (e) {}
  }

  async function schedulePostStateResync(strategyKind, delayMs) {
    scheduleStrategyRefresh(strategyKind || 'all', typeof delayMs === 'number' ? delayMs : 900)
  }

  async function pauseGrid(id) {
    if (!confirm('전략을 일시중지할까요?')) return
    if (window.__gridActionLocks[String(id)]) return
    window.__gridActionLocks[String(id)] = true
    setGridStateOverride(id, { status:'PAUSED', __uiBusy:true, __uiBusyText:'정지 처리 중...' })
    rerenderDashboardFromCache()
    showToast('⏸ 정지 요청 전송')
    addOptimisticRecentActivity({ strategyType:'Grid', symbolText:'전략#'+id, statusKo:'일시정지 요청', color:'#f59e0b' })
    try {
      const r = await authFetch('/grid/strategies/'+id+'/pause', {method:'POST'})
      if (r && r.ok) {
        setGridStateOverride(id, { status:'PAUSED', __uiBusy:false, __uiBusyText:'' })
        rerenderDashboardFromCache()
        showToast('⏸ 전략 일시중지')
        fireAndForgetPostStateRefresh('grid')
      } else {
        clearGridStateOverride(id)
        rerenderDashboardFromCache()
        showToast('❌ 전략 일시중지 실패')
      }
    } catch (e) {
      clearGridStateOverride(id)
      rerenderDashboardFromCache()
      showToast('❌ 전략 일시중지 실패')
    } finally {
      delete window.__gridActionLocks[String(id)]
    }
  }

  async function resumeGrid(id) {
    if (!confirm('전략을 재개하시겠습니까? 재개까지는 몇 분이 소요 될 수 있습니다.')) return;
    if (window.__gridActionLocks[String(id)]) return
    window.__gridActionLocks[String(id)] = true
    if (isEmergencyStopActive()) {
      setEmergencyStopActive(false);
      writeActivitySummary('EMERGENCY_RELEASED', '긴급정지 해제', '시스템');
    }
    setGridStateOverride(id, { status:'ACTIVE', __uiBusy:true, __uiBusyText:'재개 처리 중...' })
    rerenderDashboardFromCache()
    showToast('▶ 재개 요청 전송')
    addOptimisticRecentActivity({ strategyType:'Grid', symbolText:'전략#'+id, statusKo:'재개 요청', color:'#4ade80' })
    try {
      const r = await authFetch('/grid/strategies/'+id+'/resume', {method:'POST'})
      if (r && r.ok) {
        setGridStateOverride(id, { status:'ACTIVE', __uiBusy:false, __uiBusyText:'' })
        rerenderDashboardFromCache()
        showToast('▶ 전략 재개')
        fireAndForgetPostStateRefresh('grid')
      } else {
        clearGridStateOverride(id)
        rerenderDashboardFromCache()
        showToast('❌ 전략 재개 실패')
      }
    } catch (e) {
      clearGridStateOverride(id)
      rerenderDashboardFromCache()
      showToast('❌ 전략 재개 실패')
    } finally {
      delete window.__gridActionLocks[String(id)]
    }
  }

async function stopGrid(id) {
  if (!confirm('전략을 종료할까요? 진행 중인 주문은 유지됩니다.')) return
  const r = await authFetch('/grid/strategies/'+id+'/stop', {method:'POST'})
  if (r && r.ok) {
    showToast('⏹ 전략 종료')
    addOptimisticRecentActivity({ strategyType:'Grid', symbolText:'전략#'+id, statusKo:'종료', color:'#f87171' })
    try { await refreshAfterStrategyStateChange('all') } catch (e) {}
    fireAndForgetPostStateRefresh('grid')
  }
}

async function viewGridOrders(id) {
  const el = document.getElementById('grid-orders-'+id)
  if (el.style.display !== 'none') { el.style.display = 'none'; return }
  const r = await authFetch('/grid/strategies/'+id+'/orders')
  if (!r) return
  const d = await r.json()

  const statusInfo = {
    'WAITING':      { color:'#666', text:'⏳ 대기중', bg:'rgba(100,100,100,0.1)' },
    'BUY_ORDERED':  { color:'#60a5fa', text:'📋 매수주문', bg:'rgba(96,165,250,0.1)' },
    'BUY_FILLED':   { color:'#f59e0b', text:'✅ 매수완료', bg:'rgba(245,158,11,0.1)' },
    'SELL_ORDERED': { color:'#a78bfa', text:'📋 매도주문', bg:'rgba(167,139,250,0.1)' },
    'SELL_FILLED':  { color:'#4ade80', text:'💰 매도완료', bg:'rgba(74,222,128,0.1)' },
    'CANCELLED':    { color:'#555', text:'❌ 취소', bg:'rgba(100,100,100,0.05)' },
  }

  // 요약 통계
  var total = d.orders.length
  var waiting = d.orders.filter(o => o.status === 'WAITING').length
  var buyOrdered = d.orders.filter(o => o.status === 'BUY_ORDERED').length
  var buyFilled = d.orders.filter(o => o.status === 'BUY_FILLED').length
  var sellOrdered = d.orders.filter(o => o.status === 'SELL_ORDERED').length
  var sellFilled = d.orders.filter(o => o.status === 'SELL_FILLED').length
  var totalProfit = d.orders.reduce(function(acc, o) { return acc + o.profit }, 0)

  var summaryHtml =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
    '<div class="pos-item"><div class="pos-item-label">⏳ 대기</div><div class="pos-item-val">' + waiting + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">📋 매수주문</div><div class="pos-item-val" style="color:#60a5fa">' + buyOrdered + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">✅ 매수완료</div><div class="pos-item-val" style="color:#f59e0b">' + buyFilled + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">📋 매도주문</div><div class="pos-item-val" style="color:#a78bfa">' + sellOrdered + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">💰 매도완료</div><div class="pos-item-val" style="color:#4ade80">' + sellFilled + '개</div></div>' +
    '<div class="pos-item"><div class="pos-item-label">💵 누적수익</div><div class="pos-item-val ' + (totalProfit>=0?'pnl-plus':'pnl-minus') + '">' + (totalProfit>=0?'+':'') + Number(totalProfit).toLocaleString() + '원</div></div>' +
    '</div>'

  // 레벨별 카드
  var ordersHtml = d.orders.map(function(o) {
    var si = statusInfo[o.status] || statusInfo['WAITING']
    var profitHtml = o.profit > 0
      ? '<span class="pnl-plus" style="font-size:12px;font-weight:700">+' + Number(o.profit).toLocaleString() + '원</span>'
      : ''
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
    '</div>'
  }).join('')

  el.innerHTML =
    '<div style="border-top:1px solid var(--border2);padding-top:12px;margin-top:4px">' +
    summaryHtml +
    '<div style="max-height:320px;overflow-y:auto;padding-right:4px">' +
    ordersHtml +
    '</div></div>'
  el.style.display = 'block'
}

function syncOrderSubmitButtonsWithSideTabs() {
  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');
  if (!buyTab || !sellTab) return;

  const isBuy = buyTab.classList.contains('active');
  const isSell = sellTab.classList.contains('active');

  document.querySelectorAll('.order-btn-row').forEach((row) => {
    const buyBtn = row.querySelector('.btn-buy');
    const sellBtn = row.querySelector('.btn-sell');

    if (buyBtn) buyBtn.style.display = isBuy ? '' : 'none';
    if (sellBtn) sellBtn.style.display = isSell ? '' : 'none';
  });
}

function forceSyncOrderSideButtons() {
  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');
  if (!buyTab || !sellTab) return;

  const isBuy = buyTab.classList.contains('active');
  const isSell = sellTab.classList.contains('active');

  document.querySelectorAll('.order-btn-row').forEach((row) => {
    const buyBtn = row.querySelector('.btn-buy');
    const sellBtn = row.querySelector('.btn-sell');

    if (buyBtn) buyBtn.style.display = isBuy ? '' : 'none';
    if (sellBtn) sellBtn.style.display = isSell ? '' : 'none';
  });
}

function bindForceSyncOrderSideButtonsOnce() {
  if (window.__forceSideButtonsBound) return;

  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');

  if (buyTab) {
    buyTab.addEventListener('click', () => {
      setTimeout(forceSyncOrderSideButtons, 0);
    });
  }

  if (sellTab) {
    sellTab.addEventListener('click', () => {
      setTimeout(forceSyncOrderSideButtons, 0);
    });
  }

  const observer = new MutationObserver(() => {
    forceSyncOrderSideButtons();
  });

  if (buyTab) observer.observe(buyTab, { attributes: true, attributeFilter: ['class'] });
  if (sellTab) observer.observe(sellTab, { attributes: true, attributeFilter: ['class'] });

  window.__forceSideButtonsBound = true;
  forceSyncOrderSideButtons();
}

function getCurrentOrderSideFromTabs() {
  const buyTab = document.getElementById('side-tab-buy');
  return (buyTab && buyTab.classList.contains('active')) ? 'BUY' : 'SELL';
}

function submitCurrentSideOrder() {
  return submitOrder(getCurrentOrderSideFromTabs());
}

function syncMarketSubmitButton() {
  const btn = document.getElementById('market-submit-btn');
  if (!btn) return;
  const side = getCurrentOrderSideFromTabs();
  btn.textContent = side === 'BUY' ? '매수' : '매도';
  btn.className = side === 'BUY' ? 'btn-buy' : 'btn-sell';
}

function bindMarketSubmitButtonSyncOnce() {
  if (window.__marketSubmitButtonSyncBound) return;

  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');

  if (buyTab) buyTab.addEventListener('click', () => setTimeout(syncMarketSubmitButton, 0));
  if (sellTab) sellTab.addEventListener('click', () => setTimeout(syncMarketSubmitButton, 0));

  syncMarketSubmitButton();
  window.__marketSubmitButtonSyncBound = true;
}

function getCurrentOrderSideFromTabs() {
  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');

  if (sellTab && sellTab.classList.contains('active')) return 'SELL';
  if (buyTab && buyTab.classList.contains('active')) return 'BUY';
  return 'BUY';
}

function submitCurrentSideOrder() {
  return submitOrder(getCurrentOrderSideFromTabs());
}

function syncMarketSubmitButtonNow() {
  const btn = document.getElementById('market-submit-btn');
  if (!btn) return;

  const side = getCurrentOrderSideFromTabs();
  btn.textContent = side === 'SELL' ? '매도' : '매수';
  btn.className = side === 'SELL' ? 'btn-sell' : 'btn-buy';
  btn.setAttribute('data-side', side);
}

function bindMarketSubmitButtonSyncOnce() {
  if (window.__marketSubmitButtonSyncBoundV2) return;

  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');

  if (buyTab) {
    buyTab.addEventListener('click', function() {
      setTimeout(syncMarketSubmitButtonNow, 0);
    });
  }

  if (sellTab) {
    sellTab.addEventListener('click', function() {
      setTimeout(syncMarketSubmitButtonNow, 0);
    });
  }

  const obs = new MutationObserver(function() {
    syncMarketSubmitButtonNow();
  });

  if (buyTab) obs.observe(buyTab, { attributes: true, attributeFilter: ['class'] });
  if (sellTab) obs.observe(sellTab, { attributes: true, attributeFilter: ['class'] });

  syncMarketSubmitButtonNow();
  setTimeout(syncMarketSubmitButtonNow, 0);
  setTimeout(syncMarketSubmitButtonNow, 100);

  window.__marketSubmitButtonSyncBoundV2 = true;
}

function syncMarketButtonsVisibility() {
  const buyTab = document.getElementById('side-tab-buy');
  const sellTab = document.getElementById('side-tab-sell');
  const buyBtn = document.getElementById('market-buy-btn');
  const sellBtn = document.getElementById('market-sell-btn');

  if (!buyTab || !sellTab || !buyBtn || !sellBtn) return;

  const isSell = sellTab.classList.contains('active');
  buyBtn.style.display = isSell ? 'none' : '';
  sellBtn.style.display = isSell ? '' : 'none';
}

function getActiveOrderSide() {
  const sellTab = document.getElementById('side-tab-sell');
  const buyTab = document.getElementById('side-tab-buy');
  if (sellTab && sellTab.classList.contains('active')) return 'SELL';
  if (buyTab && buyTab.classList.contains('active')) return 'BUY';
  return 'BUY';
}

function submitMarketOrderByActiveSide() {
  return submitOrder(getActiveOrderSide());
}

function syncMarketDynamicSubmitButton() {
  const btn = document.getElementById('market-dynamic-submit-btn');
  if (!btn) return;
  const side = getActiveOrderSide();
  btn.textContent = side === 'SELL' ? '매도' : '매수';
  btn.className = side === 'SELL' ? 'btn-sell' : 'btn-buy';
  btn.setAttribute('data-side', side);
}

function setTab(tab) {
  _currentTab = tab
  document.getElementById('tab-limit').className = 'order-tab' + (tab==='limit' ? ' active' : '')
  document.getElementById('tab-market').className = 'order-tab' + (tab==='market' ? ' active' : '')
  document.getElementById('limit-area').style.display = tab==='limit' ? 'block' : 'none'
  document.getElementById('market-area').style.display = tab==='market' ? 'block' : 'none'
  // hide outer market-order-btn-row when limit tab is active (limit-order-btn-row handles it)
  var mainRow = document.getElementById('market-order-btn-row')
  if (mainRow) mainRow.style.display = tab === 'limit' ? 'none' : ''
  try { updatePreTradeSummary() } catch(e) {}
}

function setPct(pct) {
  if (!_selectedSymbol) { showMsg('코인을 먼저 선택하세요', false); return }
  const newPrice = Math.round(_selectedSymbol.trade_price * (1 + pct/100))
  document.getElementById('price').value = newPrice
  updateQtyPreview()
  try { if (typeof refreshOrderAvailableHintBySelection === 'function') refreshOrderAvailableHintBySelection() } catch(e) {}
  try { if (typeof updateOrderCurrentPriceButton === 'function') updateOrderCurrentPriceButton() } catch(e) {}
}

function addMarketAmt(val) {
  const el = document.getElementById('market-amount')
  const cur = parseFloat(el.value) || 0
  el.value = cur + val
}

function setSeedPctMarket(pct) {
  const side = (((typeof getActiveOrderSide === 'function' && getActiveOrderSide()) ||
    (typeof getCurrentOrderSideFromTabs === 'function' && getCurrentOrderSideFromTabs()) ||
    window._orderSide || 'BUY') + '').toUpperCase()

  const minAmount = side === 'SELL' ? 5000 : 5500

  if (side === 'SELL') {
    const amtEl = document.getElementById('market-amount')
    const held = getSelectedSymbolHeldQty()
    const price = _selectedSymbol && _selectedSymbol.trade_price ? parseFloat(_selectedSymbol.trade_price) : 0

    if (!held || held <= 0) {
      showMsg(_lang==='ko' ? '보유 수량이 없습니다' : 'No holding quantity', false)
      return
    }
    if (!price || price <= 0) {
      showMsg(_lang==='ko' ? '현재가를 불러올 수 없습니다' : 'Cannot load current price', false)
      return
    }

    const qty = held * pct / 100
    const amt = Math.floor(qty * price)

    if (!amt || amt < minAmount) {
      showMsg(_lang==='ko' ? ('최소 ' + minAmount.toLocaleString('ko-KR') + '원 이상 입력하세요') : 'Amount too small', false)
      return
    }

    amtEl.value = String(amt)
    return
  }

  const krwEl = document.getElementById('krw-balance')
  const krwText = (krwEl && krwEl.dataset && krwEl.dataset.selectedKrw) ? krwEl.dataset.selectedKrw : krwEl.textContent
  const krw = parseFloat(String(krwText).replace(/[^0-9.]/g, ''))

  if (!krw || krw <= 0) {
    showMsg(_lang==='ko' ? '잔고를 불러올 수 없습니다' : 'Cannot load balance', false)
    return
  }

  const amt = Math.floor(krw * pct / 100)
  if (amt < minAmount) {
    showMsg(_lang==='ko' ? ('최소 ' + minAmount.toLocaleString('ko-KR') + '원 이상 입력하세요') : 'Amount too small', false)
    return
  }

  document.getElementById('market-amount').value = String(amt)
  try { updatePreTradeSummary() } catch(e) {}
}

function addAmt(val) {
  const el = document.getElementById('amount')
  const cur = parseFloat(el.value) || 0
  el.value = cur + val
  updateQtyPreview()
}

function setSeedPct(pct) {
  const side = window._orderSide || 'BUY'
  if (side === 'SELL') {
    const price = parseFloat(document.getElementById('price').value)
    const held = getSelectedSymbolHeldQty()
    if (!held || held <= 0) { showMsg(_lang==='ko'?'보유 수량이 없습니다':'No holding quantity', false); return }
    const sellQty = held * pct / 100
    if (price > 0) {
      document.getElementById('amount').value = Math.floor(sellQty * price)
    } else {
      document.getElementById('amount').value = ''
    }
    updateQtyPreview()
    return
  }

  // 현재 선택 거래소 KRW 잔고 기준으로 계산
  const krwEl = document.getElementById('krw-balance')
  const krwText = (krwEl && krwEl.dataset && krwEl.dataset.selectedKrw) ? krwEl.dataset.selectedKrw : krwEl.textContent
  const krw = parseFloat(String(krwText).replace(/[^0-9.]/g, ''))
  if (!krw || krw <= 0) { showMsg(_lang==='ko'?'잔고를 불러올 수 없습니다':'Cannot load balance', false); return }
  const amt = Math.floor(krw * pct / 100)
  if (amt < 5000) { showMsg(_lang==='ko'?'금액이 너무 적습니다 (최소 5,000원)':'Amount too small (min 5,000 KRW)', false); return }
  document.getElementById('amount').value = amt
  updateQtyPreview()
  try { updatePreTradeSummary() } catch(e) {}
}

function getSelectedSymbolHeldQty() {
  try {
    const market = String((_selectedSymbol && _selectedSymbol.market) || '').trim().toUpperCase()
    const codeFromMarket = market ? market.replace('KRW-', '') : ''
    const name = String(document.getElementById('sel-name')?.textContent || '').trim().toUpperCase()
    const code = String(document.getElementById('sel-code')?.textContent || '').trim().split('/')[0].trim().toUpperCase()
    const candidates = [market, codeFromMarket, code, name].filter(Boolean)

    const cards = Array.from(document.querySelectorAll('#position-list .pos-card'))
    for (const card of cards) {
      const onclickAttr = String(card.getAttribute('onclick') || '').toUpperCase()
      const headerText = String(card.querySelector('.pos-symbol')?.textContent || card.textContent || '').trim().toUpperCase()
      const matched = candidates.some(c => onclickAttr.includes(c) || headerText.includes(c))
      if (!matched) continue

      const items = Array.from(card.querySelectorAll('.pos-item'))
      for (const item of items) {
        const label = String(item.querySelector('.pos-item-label')?.textContent || '').trim().toUpperCase()
        if (!(label.includes('수량') || label.includes('VOLUME') || label.includes('QTY') || label.includes('보유'))) continue

        const valText = String(item.querySelector('.pos-item-val')?.textContent || '').replace(/,/g, '').trim()
        const qty = parseFloat(valText)
        if (Number.isFinite(qty) && qty > 0) return qty
      }
    }
  } catch(e) {}
  return 0
}

function updateQtyPreview() {
  const price = parseFloat(document.getElementById('price').value)
  const amount = parseFloat(document.getElementById('amount').value)
  const el = document.getElementById('qty-preview')

  const side =
    (typeof getActiveOrderSide === 'function' && getActiveOrderSide()) ||
    (typeof getCurrentOrderSideFromTabs === 'function' && getCurrentOrderSideFromTabs()) ||
    window._orderSide ||
    'BUY'

  if (price > 0 && amount > 0) {
    const qty = (amount / price).toFixed(4)
    el.textContent = side === 'SELL' ? ('≈ ' + qty + '개 매도') : ('≈ ' + qty + '개 구매')
  } else {
    el.textContent = ''
  }
}

function selectSymbol(sym) {
  if (!sym || !sym.market) return
  _selectedSymbol = sym
  window._selectedSymbol = sym
  document.querySelectorAll('.symbol-item').forEach(el => el.classList.remove('selected'))
  const el = document.getElementById('item-' + sym.market.replace('-','_'))
  if (el) el.classList.add('selected')

  const nameEl = document.getElementById('sel-name')
  const codeEl = document.getElementById('sel-code')
  const priceEl = document.getElementById('sel-price')
  const changeEl = document.getElementById('sel-change')

  if (nameEl) nameEl.textContent = sym.korean_name || sym.market.replace('KRW-','')
  if (codeEl) codeEl.textContent = sym.market.replace('KRW-','') + ' / KRW'

  const cc = sym.change_rate > 0 ? 'rise' : sym.change_rate < 0 ? 'fall' : 'even'
  const sign = sym.change_rate > 0 ? '+' : ''
  if (priceEl) priceEl.textContent = Number(sym.trade_price || 0).toLocaleString() + '원'
  if (changeEl) changeEl.innerHTML = '<span class="' + cc + '">' + sign + (Number(sym.change_rate || 0) * 100).toFixed(2) + '%</span>'

  if (typeof updateOrderCurrentPriceButton === 'function') {
    try { updateOrderCurrentPriceButton() } catch (e) {}
  }
  if (typeof refreshOrderAvailableHintBySelection === 'function') {
    try { refreshOrderAvailableHintBySelection() } catch (e) {}
  }

  updateQtyPreview()
  try { updateStrategyConnBadge(sym.market) } catch(e) {}
  try { updatePreTradeSummary() } catch(e) {}
  try { updateExRuleBar() } catch(e) {}

  try {
    if (typeof window.__tvRerenderTimer !== 'undefined' || typeof renderWidget === 'function') {
      clearTimeout(window.__tvRerenderTimer)
      window.__tvRerenderTimer = setTimeout(function() {
        if (typeof renderWidget === 'function') renderWidget()
      }, 80)
    }
  } catch (e) {}
}

function selectSymbolAndApplyPrice(sym) {
  if (!sym || !sym.market) return;
  selectSymbol(sym);
  try { fillPriceWithCurrentPrice(); } catch(e) {}
  try {
    if (typeof refreshOrderAvailableHintBySelection === 'function') {
      refreshOrderAvailableHintBySelection();
    }
  } catch(e) {}
}

function selectSymbolByMarket(market) {
  const sym = _symbols.find(s => s.market === market)
  if (sym) selectSymbol(sym)
}

function isStrategyActuallyActive(s) {
  if (!s) return false
  const status = String(s.status || s.state || s.run_status || s.last_status || '').toLowerCase()
  return s.active === true ||
         s.is_running === true ||
         s.enabled === true ||
         ['running','active','started','start','on','enabled'].includes(status)
}

function countActiveStrategiesSafe(data) {
  return (data && data.strategies ? data.strategies.filter(isStrategyActuallyActive).length : 0)
}

async function refreshGlobalTopStats() {
  try {
    var results = await Promise.allSettled([
      authFetch('/api/balances'),
      authFetch('/api/positions'),
      authFetch('/bapi/balances'),
      authFetch('/bapi/positions'),
      authFetch('/grid/strategies'),
      authFetch('/dca/strategies'),
      authFetch('/rebalancing/strategies')
    ])

    var upBalData = results[0].value && results[0].value.ok ? await results[0].value.json() : null
    var upPosData = results[1].value && results[1].value.ok ? await results[1].value.json() : null
    var btBalData = results[2].value && results[2].value.ok ? await results[2].value.json() : null
    var btPosData = results[3].value && results[3].value.ok ? await results[3].value.json() : null
    var gridData  = results[4].value && results[4].value.ok ? await results[4].value.json() : null
    var dcaData   = results[5].value && results[5].value.ok ? await results[5].value.json() : null
    var rebalData = results[6].value && results[6].value.ok ? await results[6].value.json() : null

    var upKrw = upBalData && upBalData.krw_available ? upBalData.krw_available : 0
    var btKrw = btBalData && btBalData.krw_available ? btBalData.krw_available : 0

    var upPositions = upPosData && upPosData.positions ? upPosData.positions : []
    var btPositions = btPosData && btPosData.positions ? btPosData.positions : []

    var upEval = upPositions.reduce(function(s,p){ return s + (p.eval_amount || 0) }, 0)
    var btEval = btPositions.reduce(function(s,p){ return s + (p.eval_amount || 0) }, 0)

    var totalKrw = Math.floor(upKrw + btKrw)
    var totalEval = Math.floor(upKrw + btKrw + upEval + btEval)
    var totalActive = countActiveStrategiesSafe(gridData) + countActiveStrategiesSafe(dcaData) + countActiveStrategiesSafe(rebalData)

    var krwEl = document.getElementById('krw-balance')
    if (krwEl) krwEl.textContent = totalKrw.toLocaleString('ko-KR') + (_lang==='ko' ? '원' : ' KRW')

    var evalEl = document.getElementById('total-eval')
    if (evalEl) evalEl.textContent = totalEval.toLocaleString('ko-KR') + (_lang==='ko' ? '원' : ' KRW')

    var activeEl = document.getElementById('active-count')
    if (activeEl) activeEl.textContent = totalActive

    var activeLbl = document.getElementById('active-count-lbl')
    if (activeLbl) activeLbl.textContent = _lang==='ko' ? '활성 전략' : 'Active Strategies'
  } catch (e) {
    console.error('[TOP] 글로벌 요약 갱신 실패:', e)
  }
}

function updateExchangeSummaryUI(exchange, krw, totalEval) {
  var titleEl = document.getElementById('exchange-summary-title')
  var badgeEl = document.getElementById('exchange-summary-badge')
  var krwEl = document.getElementById('exchange-summary-krw')
  var totalEl = document.getElementById('exchange-summary-total')

  var isBithumb = exchange === 'bithumb'
  if (titleEl) titleEl.textContent = isBithumb ? '빗썸 요약' : '업비트 요약'
  if (badgeEl) badgeEl.textContent = isBithumb ? 'BITHUMB' : 'UPBIT'
  if (krwEl) krwEl.textContent = Number(krw || 0).toLocaleString('ko-KR') + (_lang==='ko' ? '원' : ' KRW')
  if (totalEl) totalEl.textContent = Number(totalEval || 0).toLocaleString('ko-KR') + (_lang==='ko' ? '원' : ' KRW')
}

function handleExchangeSearchInput(inputEl) {
  const el = inputEl || document.getElementById('symbol-search')
  if (!el) return
  const q = String(el.value || '')
  const filtered = buildSymbolList(q)
  if (filtered.length > 0) {
    selectSymbol(filtered[0])
  } else {
    _selectedSymbol = null
    window._selectedSymbol = null
    document.querySelectorAll('.symbol-item').forEach(row => row.classList.remove('selected'))
  }
}

function buildSymbolList(filter='') {
  const list = document.getElementById('symbol-list')
  if (!list) return []
  const q = String(filter || '').trim().toLowerCase()
  const filtered = _symbols.filter(s =>
    String(s.market || '').toLowerCase().includes(q) ||
    String(s.korean_name || '').toLowerCase().includes(q)
  )

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty" style="padding:18px 12px">검색 결과 없음</div>'
    return filtered
  }

  const selectedMarket = (_selectedSymbol && _selectedSymbol.market) ? _selectedSymbol.market : ''
  list.innerHTML = filtered.map(s => {
    const cc = s.change_rate > 0 ? 'rise' : s.change_rate < 0 ? 'fall' : 'even'
    const sign = s.change_rate > 0 ? '+' : ''
    const id = 'item-' + s.market.replace('-','_')
    const selectedClass = selectedMarket === s.market ? ' selected' : ''
    return '<div class="symbol-item' + selectedClass + '" id="' + id + '" onclick=\'selectSymbolAndApplyPrice(' + JSON.stringify(s) + ')\'>' +
      '<div>' +
      '<div class="sym-name">' + (_lang==='ko' ? (s.korean_name||s.market.replace('KRW-','')) : s.market.replace('KRW-','') + '/KRW') + '</div>' +
      '<div class="sym-kr">' + (_lang==='ko' ? s.market.replace('KRW-','') + '/KRW' : '') + '</div>' +
      '</div>' +
      '<div class="sym-price ' + cc + '">' + Number(s.trade_price || 0).toLocaleString() + '</div>' +
      '<div class="sym-change ' + cc + '">' + sign + (Number(s.change_rate || 0) * 100).toFixed(2) + '%</div>' +
      '</div>'
  }).join('')
  return filtered
}

async function fetchSymbols() {
  try {
  const r = await authFetch(API + '/symbols/ranked')
  if (!r || !r.ok) { console.warn('[fetchSymbols] 오류 무시:', r && r.status); return; }
  const d = await r.json()
  _symbols = Array.isArray(d.symbols) ? d.symbols : []
  _koreanMap = {}
  _symbols.forEach(s => { _koreanMap[s.market] = s.korean_name })

  const search = document.getElementById('symbol-search')
  const q = search ? String(search.value || '') : ''
  if (search) {
    search.oninput = function() { handleExchangeSearchInput(this) }
  }

  const filtered = buildSymbolList(q)
  if (filtered.length > 0) {
    const current = (_selectedSymbol && _selectedSymbol.market)
      ? filtered.find(s => s.market === _selectedSymbol.market)
      : null
    selectSymbol(current || filtered[0])
  }
  } catch(e) { console.warn('[fetchSymbols] 오류 무시:', e.message) }
}

async function fetchBalances() {
  const r = await authFetch(API + '/balances')
  const d = await r.json()
  const krw = Math.floor(d.krw_available||0)

  var topKrwEl = document.getElementById('krw-balance')
  if (topKrwEl) topKrwEl.dataset.selectedKrw = String(krw)

  const posR = await authFetch(API + '/positions')
  const posD = await posR.json()
  let coinEval = 0
  if(posD.positions) posD.positions.forEach(p => { coinEval += (p.eval_amount || 0) })
  const total = krw + Math.floor(coinEval)

  var topEvalEl = document.getElementById('total-eval')
  if (topEvalEl) topEvalEl.dataset.selectedEval = String(total)

  updateExchangeSummaryUI(_exchange, krw, total)
  try { updatePreTradeSummary() } catch(e) {}
}

async function fetchPositions() {
  const r = await authFetch(API + '/positions')
  if (!r) return;
  const d = await r.json()
  const tbody = document.getElementById('pos-tbl-body')
  const legacyEl = document.getElementById('position-list') // 호환용
  let totalEval = 0, totalPnl = 0

  function _setPosSummary(count, eval_, pnl) {
    var cv = document.getElementById('pos-count-val')
    var ev = document.getElementById('pos-eval-val')
    var pv = document.getElementById('pos-pnl-val')
    if (cv) cv.textContent = count + '종목'
    if (ev) ev.textContent = Math.floor(eval_).toLocaleString('ko-KR') + '원'
    if (pv) {
      var sign = pnl >= 0 ? '+' : ''
      pv.textContent = sign + Math.floor(pnl).toLocaleString('ko-KR') + '원'
      pv.style.color = pnl > 0 ? 'var(--color-normal)' : pnl < 0 ? 'var(--color-error)' : 'var(--text3)'
    }
  }

  if (!d.positions || !d.positions.length) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="pos-tbl-empty">' +
      '<div class="emsg">현재 보유 포지션이 없습니다.</div>' +
      '<button onclick="switchGrid()" style="margin-right:8px;padding:6px 14px;background:rgba(16,185,129,0.12);color:#10B981;border:1px solid rgba(16,185,129,0.3);border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">전략 화면으로 이동</button>' +
      '<button onclick="switchExchange(_exchange||\'upbit\')" style="padding:6px 14px;background:var(--bg4);color:var(--text2);border:1px solid var(--border);border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">거래 계속하기</button>' +
      '</div></td></tr>'
    _setPosSummary(0, 0, 0)
    var topEvalEl = document.getElementById('total-eval')
    if (topEvalEl) topEvalEl.dataset.selectedEval = '0'
    var topKrwEl = document.getElementById('krw-balance')
    var krw = topKrwEl && topKrwEl.dataset && topKrwEl.dataset.selectedKrw ? parseFloat(topKrwEl.dataset.selectedKrw || '0') : 0
    updateExchangeSummaryUI(_exchange, krw, krw)
    document.getElementById('krw-balance') && fetchBalances()
    return
  }

  // 전략 매핑 (window._strategies에서 심볼별 활성 전략 찾기)
  function _findStrategy(sym) {
    if (!Array.isArray(window._strategies)) return null
    return window._strategies.find(function(s) {
      return (s.symbol === sym || s.base_currency === sym.replace('KRW-','')) &&
             (s.status === 'ACTIVE' || s.status === 'PAUSED')
    }) || null
  }

  if (tbody) tbody.innerHTML = d.positions.map(function(p) {
    totalEval += p.eval_amount
    totalPnl += (p.pnl_amount || 0)
    var pc = p.pnl_pct > 0 ? 'pnl-plus' : p.pnl_pct < 0 ? 'pnl-minus' : 'pnl-zero'
    var sign = p.pnl_pct > 0 ? '+' : ''
    var coin = (_koreanMap && _koreanMap[p.symbol]) || p.symbol.replace('KRW-','')
    var strat = _findStrategy(p.symbol)
    var stratCell = strat
      ? '<span class="strat-link" title="' + (strat.name||'전략') + '">' + (strat.name || (strat._type||'전략') + ' #' + strat.id) + '</span>'
      : '<span class="no-strat">수동 매매</span>'
    return '<tr onclick="selectSymbolByMarket(\'' + p.symbol + '\')">' +
      '<td><div style="font-weight:700;font-size:12px">' + coin + '</div><div style="font-size:10px;color:var(--text3)">' + p.symbol.replace('KRW-','') + '</div></td>' +
      '<td class="r">' + (p.qty||0).toFixed(4) + '</td>' +
      '<td class="r">' + Number(p.avg_price||0).toLocaleString() + '</td>' +
      '<td class="r">' + Number(p.current_price||0).toLocaleString() + '</td>' +
      '<td class="r ' + pc + '">' + sign + (p.pnl_pct||0) + '%<div style="font-size:10px">' + sign + Number(p.pnl_amount||0).toLocaleString() + '원</div></td>' +
      '<td>' + stratCell + '</td>' +
      '</tr>'
  }).join('')

  _setPosSummary(d.positions.length, totalEval, totalPnl)
  var topEvalEl = document.getElementById('total-eval')
  if (topEvalEl) topEvalEl.dataset.selectedCoinEval = String(Math.floor(totalEval))
}

async function fetchOrders() {
  const status = document.getElementById('filter-status').value
  const exchange = API === '/api' ? 'upbit' : 'bithumb'
  const url = API+'/orders?exchange='+exchange+(status?'&status='+status:'')
  const r = await authFetch(url)
  if (!r) return
  const d = await r.json()
  document.getElementById('orders-table').innerHTML = d.orders.map(o => {
    const raw = new Date(o.created_at)
    const dt = (raw.getMonth()+1) + '/' + raw.getDate() + ' ' +
      String(raw.getHours()).padStart(2,'0') + ':' + String(raw.getMinutes()).padStart(2,'0')
    const cancelBtn = ['PLANNED','QUEUED'].includes(o.status)
      ? '<button class="btn-cancel" onclick="cancelOrder('+o.id+',\'' + (o.exchange||'upbit') + '\')">' + (_lang==="ko"?"취소":"Cancel") + '</button>'
      : (o.note === 'sandbox' && o.status !== 'CANCELLED')
        ? '<button class="btn-cancel" onclick="cancelOrder('+o.id+')" style="color:#f87171;border-color:#f87171">'+(_lang==="ko"?"취소":"Cancel")+'</button>'
        : ''
    const kname = _koreanMap[o.symbol] || ''
    return '<tr>' +
      '<td style="font-weight:700;color:var(--accent)">' + o.id + '</td>' +
      '<td>' +
      '<div style="font-weight:700;font-size:12px">' + (_lang==='ko' ? (kname||o.symbol.replace('KRW-','')) : o.symbol.replace('KRW-','') + '/KRW') + '</div>' +
      '<div style="font-size:11px;color:var(--text2)">' + (_lang==='ko' ? o.symbol.replace('KRW-','') + '/KRW' : '') + '</div>' +
      '</td>' +
      '<td class="side-' + o.side + '">' + sideKo(o.side) + '</td>' +
      '<td style="font-weight:600">' + Number(o.price).toLocaleString() + '</td>' +
      '<td>' + Number(o.amount_krw).toLocaleString() + (_lang==="ko"?"원":" KRW") + '</td>' +
      '<td class="status-' + o.status + '">' + statusKo(o.status) + '</td>' +
      '<td style="color:var(--text3);font-size:11px">' + dt + '</td>' +
      '<td>' + cancelBtn + '</td>' +
      '</tr>'
  }).join('')
}

async function submitOrder(side) {
  // [A] 중복 주문 방지: 이전 요청이 처리 중이면 즉시 차단
  if (window._orderSubmitting) return;

  if (!_selectedSymbol) { showMsg('코인을 선택하세요', false); return }
  side = String(side || (((typeof getCurrentOrderSideFromTabs === 'function' && getCurrentOrderSideFromTabs()) || window._orderSide || 'BUY'))).toUpperCase()
  const symbol = _selectedSymbol.market
  let price, amount_krw
  const minAmount = side === 'SELL' ? 5000 : 5500
  if (_currentTab === 'market') {
    amount_krw = parseFloat(document.getElementById('market-amount').value)
    if (!amount_krw || amount_krw < minAmount) { showMsg('최소 ' + minAmount.toLocaleString('ko-KR') + '원 이상 입력하세요', false); return }
    price = _selectedSymbol.trade_price
  } else {
    price = parseFloat(document.getElementById('price').value)
    amount_krw = parseFloat(document.getElementById('amount').value)
    if (!price || price <= 0) { showMsg('가격을 입력하세요', false); return }
    if (!amount_krw || amount_krw < minAmount) { showMsg('최소 ' + minAmount.toLocaleString('ko-KR') + '원 이상 입력하세요', false); return }
  }

  // [B] 실제 주문 전 확인 다이얼로그
  var sideLabel = side === 'BUY' ? '매수' : '매도';
  var exchName = (typeof API !== 'undefined' && API === '/bapi') ? '빗썸' : '업비트';
  var confirmMsg = '[실제 주문 확인]\n\n'
    + '거래소: ' + exchName + '\n'
    + '종목: ' + symbol.replace('KRW-', '') + '\n'
    + '구분: ' + sideLabel + '\n'
    + '금액: ' + Number(amount_krw).toLocaleString('ko-KR') + ' KRW\n\n'
    + '실제 주문이 즉시 실행됩니다. 계속하시겠습니까?';
  if (!confirm(confirmMsg)) return;

  // [C] 버튼 즉시 비활성화 + 처리 중 표시
  window._orderSubmitting = true;
  var _submitBtns = [];
  var _submitBtnTexts = [];
  ['market-buy-btn','market-sell-btn','limit-buy-btn','limit-sell-btn'].forEach(function(id) {
    var b = document.getElementById(id);
    if (b) { _submitBtns.push(b); _submitBtnTexts.push(b.textContent); b.disabled = true; b.style.opacity = '0.55'; }
  });
  var activeBtnId = side === 'BUY' ? 'limit-buy-btn' : 'limit-sell-btn';
  if (!document.getElementById(activeBtnId)) activeBtnId = side === 'BUY' ? 'market-buy-btn' : 'market-sell-btn';
  var activeBtn = document.getElementById(activeBtnId);
  if (activeBtn) activeBtn.textContent = '처리 중...';

  try {
    const r = await authFetch(API+'/orders', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({symbol, side, price, amount_krw, qty: (API==='/bapi' && side==='SELL' && price) ? amount_krw/price : undefined, note: _currentTab==='market'?'시장가':''})
    })
    if (!r) { showMsg('인증이 필요합니다', false); return; }
    const d = await r.json()
    if (r.ok) {
      showMsg(sideLabel + ' 등록 완료 | ' + symbol.replace('KRW-','') + ' | ' + Number(price).toLocaleString() + '원 | ' + Number(amount_krw).toLocaleString() + '원')
      fetchOrders(); fetchBalances(); fetchPositions()
    } else {
      showMsg(d.detail || '주문 실패', false)
    }
  } catch(e) {
    showMsg('주문 처리 중 오류가 발생했습니다', false);
  } finally {
    // [A][C] 플래그 해제 및 버튼 복원 — 성공/실패/예외 모든 경로에서 실행
    window._orderSubmitting = false;
    _submitBtns.forEach(function(b, i) {
      b.disabled = false;
      b.style.opacity = '';
      b.textContent = _submitBtnTexts[i];
    });
  }
}

async function cancelOrder(id, exchange) {
  if (!confirm('주문 #' + id + '를 취소할까요?')) return
  const api = exchange === 'bithumb' ? '/bapi' : '/api'
  const r = await authFetch(api+'/orders/'+id, {method:'DELETE'})
  const d = await r.json()
  if (r.ok) { showMsg('주문 #' + id + ' 취소 완료'); fetchOrders() }
  else showMsg(d.detail || '취소 실패', false)
}

async function fetchCurrentKeys() {
  const r = await authFetch('/config/keys')
  const d = await r.json()
  const noKey = _lang === 'ko' ? '미설정' : 'Not set'
  document.getElementById('cur-upbit-access').textContent = d.upbit_access_key || noKey
  document.getElementById('cur-upbit-secret').textContent = d.upbit_secret_key || noKey
  document.getElementById('cur-bithumb-access').textContent = d.bithumb_access_key || noKey
  document.getElementById('cur-bithumb-secret').textContent = d.bithumb_secret_key || noKey
  // 우측 연결 요약 카드 업데이트
  var upEl = document.getElementById('set-upbit-status')
  if (upEl) { var hasUp = !!d.upbit_access_key; upEl.textContent = hasUp ? '● 연결됨' : '● 미연결'; upEl.style.color = hasUp ? '#10B981' : '#4B5563' }
  var btEl = document.getElementById('set-bithumb-status')
  if (btEl) { var hasBt = !!d.bithumb_access_key; btEl.textContent = hasBt ? '● 연결됨' : '● 미연결'; btEl.style.color = hasBt ? '#10B981' : '#4B5563' }
  var syncEl = document.getElementById('set-last-sync')
  if (syncEl) { var _sn = new Date(); syncEl.textContent = _sn.getHours() + ':' + String(_sn.getMinutes()).padStart(2,'0') }
}

async function fetchStatus() {
  const r = await authFetch('/config/status')
  const d = await r.json()
  const el = document.getElementById('bot-status')
  applyLang()
  el.textContent = d.bot_status === 'active' ? (_lang==='ko'?'● 실행 중':'● Running') : (_lang==='ko'?'● 중지됨':'● Stopped')
  el.style.color = d.bot_status === 'active' ? '#4ade80' : '#f87171'
}

function onKeyInput() {
  const ua = document.getElementById('upbit-access').value
  const us = document.getElementById('upbit-secret').value
  const ba = document.getElementById('bithumb-access').value
  const bs = document.getElementById('bithumb-secret').value
  const show = (id, val, expected) => {
    const el = document.getElementById(id)
    if (!val) { el.textContent = ''; return true }
    const ok = val.length === expected
    el.textContent = val.length + ' / ' + expected + '자  ' + (ok ? '✅' : '❌ 길이가 맞지 않습니다')
    el.style.color = ok ? '#4ade80' : '#f87171'
    return ok
  }
  const uaOk = ua ? show('upbit-access-len', ua, 40) : false
  const usOk = us ? show('upbit-secret-len', us, 40) : false
  const baOk = ba ? show('bithumb-access-len', ba, 46) : false
  const bsOk = bs ? show('bithumb-secret-len', bs, 84) : false
  // 업비트 쌍 또는 빗썸 쌍이 완전히 입력됐을 때만 활성화
  const upbitPairOk = ua && us && uaOk && usOk
  const bithumbPairOk = ba && bs && baOk && bsOk
  // 한쪽만 입력 중이면 버튼 막기
  const upbitHalf = (ua && !us) || (!ua && us)
  const bithumbHalf = (ba && !bs) || (!ba && bs)
  const btn = document.getElementById('save-btn')
  if ((upbitPairOk || bithumbPairOk) && !upbitHalf && !bithumbHalf) {
    btn.disabled = false
    btn.classList.add('ready')
  } else {
    btn.disabled = true
    btn.classList.remove('ready')
  }
}

async function saveKeys() {
  if (window.guestBlock && window.guestBlock('api')) return;
  const ua = document.getElementById('upbit-access').value.trim()
  const us = document.getElementById('upbit-secret').value.trim()
  const ba = document.getElementById('bithumb-access').value.trim()
  const bs = document.getElementById('bithumb-secret').value.trim()
  const saveMsgEl = document.getElementById('settings-msg')
  // 쌍 검증 - 업비트는 둘 다 또는 둘 다 없어야 함
  if ((ua && !us) || (!ua && us)) {
    saveMsgEl.style.color = '#f87171'
    saveMsgEl.textContent = 'Upbit Access Key와 Secret Key를 모두 입력하세요'
    return
  }
  if ((ba && !bs) || (!ba && bs)) {
    saveMsgEl.style.color = '#f87171'
    saveMsgEl.textContent = 'Bithumb Connect Key와 Secret Key를 모두 입력하세요'
    return
  }
  const body = {
    upbit_access_key: ua,
    upbit_secret_key: us,
    bithumb_access_key: ba,
    bithumb_secret_key: bs,
  }
  const r = await authFetch('/config/keys', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  })
  const d = await r.json()
  const msg = document.getElementById('settings-msg')
  if (r.ok) {
    msg.style.color = '#4ade80'
    msg.textContent = _lang === 'ko' ? '✅ 저장 완료! 봇이 재시작됩니다.' : '✅ Saved! Bot is restarting.'
    // 입력창 초기화
    document.getElementById('upbit-access').value = ''
    document.getElementById('upbit-secret').value = ''
    document.getElementById('bithumb-access').value = ''
    document.getElementById('bithumb-secret').value = ''
    document.getElementById('upbit-access-len').textContent = ''
    document.getElementById('upbit-secret-len').textContent = ''
    document.getElementById('bithumb-access-len').textContent = ''
    document.getElementById('bithumb-secret-len').textContent = ''
    const btn = document.getElementById('save-btn')
    btn.disabled = true
    btn.classList.remove('ready')
    setTimeout(() => { switchExchange('upbit'); msg.textContent = '' }, 2000)
  } else {
    msg.style.color = '#f87171'
    msg.textContent = '저장 실패'
  }
}

// ── 스마트 매도 UI ──────────────────────────────────
var _smartSellMode = 'BASIC'
var SSM_DESC = {
  BASIC:    '기본 매도: 매수 체결 즉시 profit_gap 가격에 전량 매도합니다.',
  SPLIT:    '분할익절: 수익 목표를 N단계로 나눠 단계적으로 매도합니다.',
  TRAILING: '트레일링 스탑: 고점을 추적하다가 N% 하락 시 자동 매도합니다.',
  BOTH:     '복합: 앞 단계는 분할익절, 마지막 잔량은 트레일링 스탑으로 처리합니다.'
}
function setSmartSellMode(mode) {
  _smartSellMode = mode
  ;['BASIC','SPLIT','TRAILING','BOTH'].forEach(function(m) {
    var btn = document.getElementById('ssm-' + m)
    if (!btn) return
    if (m === mode) {
      btn.style.border = '1px solid var(--accent)'
      btn.style.background = 'rgba(245,200,66,0.15)'
      btn.style.color = 'var(--accent)'
    } else {
      btn.style.border = '1px solid var(--border)'
      btn.style.background = 'transparent'
      btn.style.color = 'var(--text3)'
    }
  })
  var desc = document.getElementById('ssm-desc')
  if (desc) desc.textContent = SSM_DESC[mode] || ''
  var splitOpts = document.getElementById('ssm-split-opts')
  var trailOpts = document.getElementById('ssm-trailing-opts')
  if (splitOpts) splitOpts.style.display = (mode === 'SPLIT' || mode === 'BOTH') ? 'block' : 'none'
  if (trailOpts) trailOpts.style.display = (mode === 'TRAILING' || mode === 'BOTH') ? 'block' : 'none'
}
function updateSplitRatioUI() {
  var count = parseInt(document.getElementById('grid-split-count').value) || 3
  var container = document.getElementById('split-ratio-inputs')
  if (!container) return
  var defaults = {2:[60,40], 3:[40,35,25], 4:[35,30,25,10], 5:[30,25,20,15,10]}
  var def = defaults[count] || Array(count).fill(Math.floor(100/count))
  container.style.gridTemplateColumns = 'repeat(' + Math.min(count, 4) + ',1fr)'
  container.innerHTML = def.slice(0, count).map(function(v, i) {
    return '<div><label class="settings-input-label" style="text-align:center">' + (i+1) + '차</label>' +
      '<input type="number" class="settings-input split-ratio-input" value="' + v + '" min="1" max="99" style="text-align:center" oninput="syncSplitRatio()"></div>'
  }).join('')
  syncSplitRatio()
}
function syncSplitRatio() {
  var inputs = document.querySelectorAll('.split-ratio-input')
  var vals = Array.from(inputs).map(function(el) { return parseFloat(el.value) || 0 })
  var total = vals.reduce(function(a,b) { return a+b }, 0)
  var hidden = document.getElementById('grid-split-ratio')
  if (hidden) hidden.value = vals.join(',')
  var preview = document.getElementById('split-ratio-preview')
  if (preview) {
    var color = Math.abs(total - 100) < 0.5 ? '#4ade80' : '#f87171'
    preview.innerHTML = '합계: <span style="color:' + color + ';font-weight:700">' + total.toFixed(0) + '%</span><br>' +
      (Math.abs(total-100) < 0.5 ? '정상' : '100%로 조정하세요')
  }
}

function submitCreateGridOld() {
  if (_currentUser && !_currentUser.is_dry_run) {
    if (!confirm('실제 계좌로 그리드 전략을 시작합니다. 실제 돈이 사용됩니다. 계속하시겠습니까?')) return
  }
  var exchange = document.getElementById('grid-exchange').value
  var symbol = document.getElementById('grid-symbol').value.trim().toUpperCase()
  var basePrice = parseFloat(document.getElementById('grid-base-price').value)
  var rangePct = parseFloat(document.getElementById('grid-range-pct').value)
  var gridCount = parseInt(document.getElementById('grid-count').value)
  var amount = parseFloat(document.getElementById('grid-amount').value)
  var profitGap = parseFloat(document.getElementById('grid-profit-gap').value) || 1
  var msgEl = document.getElementById('grid-create-msg')
  if (!symbol || !basePrice || !rangePct || !gridCount || !amount) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '모든 항목을 입력하세요'; return
  }
  if (amount * gridCount < 5500) {
    msgEl.style.color = '#f87171'; msgEl.textContent = '총 투자금액이 너무 적습니다'; return
  }
  var maxInvestment = parseFloat(document.getElementById('grid-max-investment') ? document.getElementById('grid-max-investment').value : '') || null
  var stopLoss = parseFloat(document.getElementById('grid-stop-loss') ? document.getElementById('grid-stop-loss').value : '') || null
  var dailyLoss = parseFloat(document.getElementById('grid-daily-loss') ? document.getElementById('grid-daily-loss').value : '') || null
  var profitTarget = parseFloat(document.getElementById('grid-profit-target') ? document.getElementById('grid-profit-target').value : '') || null
  var smartSellMode = _smartSellMode || 'BASIC'
  var splitCount = parseInt(document.getElementById('grid-split-count') ? document.getElementById('grid-split-count').value : '3') || 3
  var splitRatio = document.getElementById('grid-split-ratio') ? (document.getElementById('grid-split-ratio').value || '40,35,25') : '40,35,25'
  var splitGapPct = parseFloat(document.getElementById('grid-split-gap-pct') ? document.getElementById('grid-split-gap-pct').value : '1.0') || 1.0
  var trailingPct = parseFloat(document.getElementById('grid-trailing-pct') ? document.getElementById('grid-trailing-pct').value : '2.0') || 2.0
  var trailingTrigger = parseFloat(document.getElementById('grid-trailing-trigger') ? document.getElementById('grid-trailing-trigger').value : '1.0') || 1.0
  if (smartSellMode === 'SPLIT' || smartSellMode === 'BOTH') {
    var ratios = splitRatio.split(',').map(function(x) { return parseFloat(x.trim()) || 0 })
    var total = ratios.reduce(function(a,b) { return a+b }, 0)
    if (Math.abs(total - 100) > 1) {
      msgEl.style.color = '#f87171'; msgEl.textContent = '분할익절 비율의 합이 100%가 아닙니다 (현재: ' + total.toFixed(0) + '%)'; return
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
    if (!r) return
    r.json().then(function(d) {
      if (r.ok) {
        msgEl.style.color = '#4ade80'
        msgEl.textContent = '전략 시작! ID: ' + d.strategy_id
        setTimeout(function() { closeCreateGrid(); fetchGridStrategies() }, 1500)
      } else {
        msgEl.style.color = '#f87171'
        msgEl.textContent = d.detail || '생성 실패'
      }
    })
  })
}
function fetchGridStrategies() {
  window.__gfLastGridFetchAt = Date.now();
  authFetch('/grid/strategies').then(function(r) {
    if (!r) return
    r.json().then(function(d) {
      if (Array.isArray(d.strategies)) {
        d.strategies = applyGridStateOverridesToStrategies(d.strategies)
      }
      // 전략 목록 전역 저장 (거래화면 전략배지 + 포지션 연결 전략에서 참조)
      window._strategies = Array.isArray(d.strategies) ? d.strategies : []
      var el = document.getElementById('grid-strategy-list')
      if (!d.strategies || !d.strategies.length) {
        el.innerHTML = '<div style="height:120px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
          '<div style="font-size:13px;font-weight:700;color:#FFFFFF">실행 중인 그리드 전략이 없습니다</div>' +
          '<div style="font-size:10px;color:rgba(255,255,255,0.36)">새 전략을 만들어 자동매매를 시작하세요</div>' +
          '<button onclick="openCreateGrid()" style="height:28px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:2px">+ 새 전략 만들기</button>' +
        '</div>'
        return
      }
      el.innerHTML = d.strategies.map(function(s) {
        var statusColor = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : '#4B5563'
        var statusText = s.__uiBusyText ? ('● ' + s.__uiBusyText.replace('...', '')) : (s.status === 'ACTIVE' ? '● 실행 중' : s.status === 'PAUSED' ? '● 일시정지' : '● 종료')
        var statusBg = s.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : s.status === 'PAUSED' ? 'rgba(245,158,11,0.12)' : 'rgba(75,85,99,0.15)'
        var borderAccent = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : 'rgba(255,255,255,0.08)'
        var profitColor = s.total_profit >= 0 ? 'pnl-plus' : 'pnl-minus'
        var profitSign = s.total_profit >= 0 ? '+' : ''
        var smartBadge = ''
        if (s.smart_sell_mode === 'SPLIT') smartBadge = '<span style="font-size:9px;background:rgba(96,165,250,0.12);color:#60a5fa;border:1px solid rgba(96,165,250,0.4);border-radius:4px;padding:1px 5px;margin-left:6px">분할익절</span>'
        else if (s.smart_sell_mode === 'TRAILING') smartBadge = '<span style="font-size:9px;background:rgba(167,139,250,0.12);color:#a78bfa;border:1px solid rgba(167,139,250,0.4);border-radius:4px;padding:1px 5px;margin-left:6px">트레일링</span>'
        else if (s.smart_sell_mode === 'BOTH') smartBadge = '<span style="font-size:9px;background:rgba(245,200,66,0.12);color:#F59E0B;border:1px solid rgba(245,200,66,0.4);border-radius:4px;padding:1px 5px;margin-left:6px">복합</span>'
        var totalCapital = Number(s.amount_per_grid * s.grid_count)
        var _ft = function(ts){ if(!ts) return ''; var _d=new Date(ts); return (_d.getMonth()+1)+'/'+_d.getDate()+' '+(_d.getHours()<10?'0':'')+_d.getHours()+':'+(_d.getMinutes()<10?'0':'')+_d.getMinutes() }
        var lastRunStr = _ft(s.last_run_at || s.updated_at)
        // primary action: pause/resume/delete (1 btn), detail btn (1 btn) — max 2
        var primaryBtn = ''
        if (s.__uiBusy) primaryBtn = '<button disabled style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.45);cursor:default">' + (s.__uiBusyText || '처리 중...') + '</button>'
        else if (s.status === 'ACTIVE') primaryBtn = '<button onclick="pauseGrid('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">일시정지</button><button onclick="stopGrid('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">종료</button><button onclick="deleteGrid('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>'
        else if (s.status === 'PAUSED') primaryBtn = '<button onclick="resumeGrid('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">재개</button>'
        else if (s.status === 'STOPPED') primaryBtn = '<button onclick="deleteGrid('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">삭제</button>'
        var detailBtn = '<button onclick="viewGridOrders('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:600;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.52);cursor:pointer">주문내역 ▾</button>'
        var coinName = (_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')
        return '<div style="min-height:108px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);border-left:3px solid ' + borderAccent + ';padding:10px 14px;margin-bottom:10px;box-sizing:border-box">' +
          '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;align-items:center;gap:10px;min-height:88px">' +
            '<div>' +
              '<div style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;color:' + statusColor + ';background:' + statusBg + ';border-radius:4px;padding:2px 7px;margin-bottom:4px">' + statusText + '</div>' +
              '<div style="font-size:13px;font-weight:700;color:#FFFFFF">' + coinName + smartBadge + '</div>' +
              '<div style="font-size:10px;color:rgba(255,255,255,0.38);margin-top:2px">' + s.exchange.toUpperCase() + ' · 그리드 ' + s.grid_count + '개 · ±' + s.range_pct + '%</div>' +
              (lastRunStr ? '<div style="font-size:9px;color:rgba(255,255,255,0.26);margin-top:3px">마지막 실행 ' + lastRunStr + '</div>' : '') +
            '</div>' +
            '<div>' +
              '<div style="font-size:9px;color:rgba(255,255,255,0.38)">기준가</div>' +
              '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + Number(s.base_price).toLocaleString() + '원</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:9px;color:rgba(255,255,255,0.38)">투자한도</div>' +
              '<div style="font-size:11px;font-weight:600;color:#D1D5DB">' + totalCapital.toLocaleString() + '원</div>' +
              '<div style="font-size:9px;color:rgba(255,255,255,0.26);margin-top:2px">' + Number(s.amount_per_grid).toLocaleString() + '×' + s.grid_count + '</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:9px;color:rgba(255,255,255,0.38)">누적수익</div>' +
              '<div class="' + profitColor + '" style="font-size:12px;font-weight:700">' + profitSign + Number(s.total_profit).toLocaleString() + '원</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">' + primaryBtn + detailBtn + '</div>' +
          '</div>' +
          '<div id="grid-orders-' + s.id + '" style="display:none;margin-top:10px"></div>' +
        '</div>'
      }).join('')
    })
  })
}
// ── 전략 로그 UI ──────────────────────────────────
function switchGridTab(tab) {
  // 가시 탭 3개: grid / dca / rebal (backtest/logs는 별도 화면으로 이동됨)
  var visibleTabs = ['grid', 'dca', 'rebal']
  visibleTabs.forEach(function(t) {
    var panel = document.getElementById('subpanel-' + t)
    var btn = document.getElementById('subtab-' + t)
    if (panel) panel.style.display = t === tab ? 'block' : 'none'
    if (btn) {
      if (t === tab) {
        btn.style.background = 'rgba(245,158,11,0.12)'
        btn.style.color = '#F59E0B'
        btn.style.borderBottom = '2px solid #F59E0B'
      } else {
        btn.style.background = 'transparent'
        btn.style.color = 'rgba(255,255,255,0.34)'
        btn.style.borderBottom = 'none'
      }
    }
  })
  // backtest/logs 패널은 항상 숨김
  ;['backtest','logs'].forEach(function(t) {
    var panel = document.getElementById('subpanel-' + t)
    if (panel) panel.style.display = 'none'
  })
  if (tab === 'grid') fetchGridStrategies()
  if (tab === 'dca') fetchDCAStrategies()
  if (tab === 'rebal') fetchRebalStrategies()
}
async function fetchRebalStrategies() {
  var r = await authFetch('/rebalancing/strategies')
  if (!r) return
  var d = await r.json()
  var el = document.getElementById('rebal-strategy-list')
  if (!el) return
  if (!d.strategies || !d.strategies.length) {
    el.innerHTML = '<div style="width:940px;height:148px;border-radius:16px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.06);padding:20px;margin-top:16px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,0.20)">' +
      '<div style="font-size:18px;opacity:0.28;margin-bottom:2px">◈</div>' +
      '<div style="font-size:15px;font-weight:700;color:#FFFFFF">실행 중인 리밸런싱 전략이 없습니다</div>' +
      '<div style="font-size:11px;line-height:16px;color:rgba(255,255,255,0.40);margin-top:6px;text-align:center">프리셋을 선택하거나 새 전략을 만들어 포트폴리오 비중을 자동으로 관리하세요.</div>' +
      '<button onclick="openCreateRebal()" style="height:30px;padding:0 14px;border-radius:8px;background:#F59E0B;color:#111827;border:none;font-size:11px;font-weight:700;cursor:pointer;margin-top:12px">+ 새 전략 만들기</button>' +
    '</div>'
    return
  }
  el.innerHTML = d.strategies.map(function(s) {
    var statusColor = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : '#4B5563'
    var statusText = s.status === 'ACTIVE' ? '● 실행 중' : s.status === 'PAUSED' ? '● 일시정지' : '● 종료'
    var statusBg = s.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : s.status === 'PAUSED' ? 'rgba(245,158,11,0.12)' : 'rgba(75,85,99,0.15)'
    var borderAccent = s.status === 'ACTIVE' ? '#10B981' : s.status === 'PAUSED' ? '#F59E0B' : 'rgba(255,255,255,0.08)'
    var triggerText = s.trigger_type === 'INTERVAL' ? s.interval_hours + 'h마다'
      : s.trigger_type === 'THRESHOLD' ? s.threshold_pct + '%p 이탈'
      : s.interval_hours + 'h / ' + s.threshold_pct + '%p'
    var methodText = s.rebal_method === 'BUY_ONLY' ? '매수만' : s.rebal_method === 'NEW_FUND' ? '신규자금 우선' : '매수+매도'
    var assetCount = s.assets ? s.assets.length : 0
    var totalWeight = s.assets ? s.assets.reduce(function(sum, a) { return sum + (a.target_pct || 0) }, 0) : 0
    var _ft = function(ts){ if(!ts) return ''; var _d=new Date(ts); return (_d.getMonth()+1)+'/'+_d.getDate()+' '+(_d.getHours()<10?'0':'')+_d.getHours()+':'+(_d.getMinutes()<10?'0':'')+_d.getMinutes() }
    var lastRunStr = _ft(s.last_rebal_at || s.last_run_at || s.updated_at)
    // 행당 최대 버튼: primary + stop(PAUSED만) + rebalNow(ACTIVE만) — 합산 최대 2개
    var primaryBtn = ''
    if (s.status === 'ACTIVE') primaryBtn = '<button onclick="pauseRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">일시정지</button><button onclick="deleteRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>'
    else if (s.status === 'PAUSED') primaryBtn = '<button onclick="resumeRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#F59E0B;cursor:pointer">재개</button><button onclick="stopRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">종료</button><button onclick="deleteRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer;margin-left:4px">삭제</button>'
    else if (s.status === 'STOPPED') primaryBtn = '<button onclick="deleteRebal('+s.id+')" style="height:24px;padding:0 8px;border-radius:7px;font-size:10px;font-weight:700;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.10);color:#EF4444;cursor:pointer">삭제</button>'
    return '<div style="min-height:108px;border-radius:14px;background:rgba(20,22,25,0.64);border:1px solid rgba(255,255,255,0.05);border-left:3px solid ' + borderAccent + ';padding:12px 14px;margin-bottom:10px;box-sizing:border-box">' +
      '<div style="display:grid;grid-template-columns:1.6fr 0.8fr 0.8fr 0.8fr auto;align-items:center;gap:10px;min-height:84px">' +
        '<div>' +
          '<div style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;color:' + statusColor + ';background:' + statusBg + ';border-radius:4px;padding:2px 7px;margin-bottom:4px">' + statusText + '</div>' +
          '<div style="font-size:12px;font-weight:700;color:#FFFFFF">' + s.name + ' <span style="font-size:9px;color:rgba(255,255,255,0.38)">' + s.exchange.toUpperCase() + ' · ' + methodText + '</span></div>' +
          (lastRunStr ? '<div style="font-size:9px;color:rgba(255,255,255,0.26);margin-top:3px">마지막 리밸런싱 ' + lastRunStr + '</div>' : '') +
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
        '<div style="display:flex;gap:4px;flex-direction:column">' + primaryBtn + '</div>' +
      '</div>' +
    '</div>'
  }).join('')
}
async function fetchStrategyLogs() {
  var filterType = document.getElementById('log-filter-type')
  var type = filterType ? filterType.value : 'ALL'
  var summaryEl = document.getElementById('log-summary')
  var listEl = document.getElementById('log-list')
  if (listEl) listEl.innerHTML = '<div class="empty" style="padding:40px 0">불러오는 중...</div>'
  var r = await authFetch('/grid/logs?strategy_type=' + type + '&limit=200')
  if (!r) return
  var d = await r.json()
  if (summaryEl && d.summary) {
    var s = d.summary
    var profitColor = s.total_profit >= 0 ? 'var(--rise)' : 'var(--fall)'
    var profitSign = s.total_profit >= 0 ? '+' : ''
    summaryEl.innerHTML =
      '<div class="pos-item"><div class="pos-item-label">총 체결</div><div class="pos-item-val" style="font-size:15px;font-weight:800">' + s.total + '건</div></div>' +
      '<div class="pos-item"><div class="pos-item-label">누적 수익</div><div class="pos-item-val" style="font-size:15px;font-weight:800;color:' + profitColor + '">' + profitSign + Number(s.total_profit).toLocaleString() + '원</div></div>' +
      '<div class="pos-item"><div class="pos-item-label">승/패</div><div class="pos-item-val" style="font-size:13px;font-weight:700"><span style="color:var(--rise)">' + s.win_count + '승</span> / <span style="color:var(--fall)">' + s.loss_count + '패</span></div></div>' +
      '<div class="pos-item"><div class="pos-item-label">승률</div><div class="pos-item-val" style="font-size:15px;font-weight:800;color:var(--accent)">' + s.win_rate + '%</div></div>'
  }
  if (!d.logs || !d.logs.length) {
    listEl.innerHTML = '<div style="padding:32px 16px;text-align:center"><div style="font-size:28px;margin-bottom:10px">📋</div><div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:6px">아직 체결 로그가 없습니다</div><div style="font-size:11px;color:var(--text3);line-height:1.8">전략이 실행되면 체결 내역이 여기에 표시됩니다</div></div>'
    return
  }
  var header = '<div style="display:grid;grid-template-columns:80px 110px 60px 70px 100px 100px 100px 1fr;gap:0;padding:9px 14px;background:var(--bg3);border-bottom:2px solid var(--border);font-size:11px;color:var(--text3);font-weight:600;position:sticky;top:0">' +
    '<div>시간</div><div>종목</div><div>거래소</div><div>구분</div><div style="text-align:right">가격</div><div style="text-align:right">금액</div><div style="text-align:right">수익</div><div style="padding-left:12px">상세</div></div>'
  var rows = d.logs.map(function(l) {
    var sideColor = l.side === 'BUY' ? 'var(--buy)' : 'var(--sell)'
    var sideText = l.side === 'BUY' ? '매수' : '매도'
    var profitHtml = ''
    if (l.profit !== null && l.profit !== undefined) {
      var pc = l.profit >= 0 ? 'var(--rise)' : 'var(--fall)'
      var ps = l.profit >= 0 ? '+' : ''
      profitHtml = '<span style="color:' + pc + ';font-weight:700">' + ps + Number(l.profit).toLocaleString() + '원</span>'
    } else {
      profitHtml = '<span style="color:var(--text3)">-</span>'
    }
    var typeBadge = l.strategy_type === 'GRID'
      ? '<span style="font-size:9px;background:rgba(245,200,66,0.15);color:var(--accent);border:1px solid rgba(245,200,66,0.3);border-radius:3px;padding:1px 4px;margin-right:4px">G</span>'
      : '<span style="font-size:9px;background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3);border-radius:3px;padding:1px 4px;margin-right:4px">D</span>'
    var dt = new Date(l.at)
    var timeStr = (dt.getMonth()+1) + '/' + dt.getDate() + ' ' +
      String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0')
    return '<div style="display:grid;grid-template-columns:80px 110px 60px 70px 100px 100px 100px 1fr;gap:0;padding:10px 14px;border-bottom:1px solid var(--border2);font-size:12px;align-items:center">' +
      '<div style="color:var(--text3);font-size:11px">' + timeStr + '</div>' +
      '<div style="font-weight:700;color:var(--text)">' + typeBadge + l.symbol.replace('KRW-','') + '</div>' +
      '<div style="color:var(--text3);font-size:11px">' + (l.exchange||'').toUpperCase() + '</div>' +
      '<div style="color:' + sideColor + ';font-weight:700">' + sideText + '</div>' +
      '<div style="text-align:right;color:var(--text2)">' + Number(l.price).toLocaleString() + '</div>' +
      '<div style="text-align:right;color:var(--text2)">' + Number(l.amount_krw).toLocaleString() + '원</div>' +
      '<div style="text-align:right">' + profitHtml + '</div>' +
      '<div style="padding-left:12px;color:var(--text3);font-size:11px">' + (l.detail||'') + '</div>' +
    '</div>'
  }).join('')
  listEl.innerHTML = header + rows
}

// ── 리밸런싱 UI ──────────────────────────────────
var _rebalAssets = []
var _rebalMethod = 'BOTH'
var _rebalThreshold = 5

function updateRebalTriggerUI() {
  var trigger = document.getElementById('rebal-trigger').value
  var intervalWrap = document.getElementById('rebal-interval-wrap')
  var thresholdSection = document.getElementById('rebal-threshold-section')
  if (intervalWrap) intervalWrap.style.display = (trigger === 'THRESHOLD') ? 'none' : 'block'
  if (thresholdSection) thresholdSection.style.display = (trigger === 'INTERVAL') ? 'none' : 'block'
  updateRebalSummary()
}

function setRebalThreshold(val) {
  _rebalThreshold = val
  document.getElementById('rebal-threshold').value = val
  document.querySelectorAll('.rebal-threshold-btn').forEach(function(btn) {
    btn.style.border = '1px solid var(--border)'
    btn.style.background = 'transparent'
    btn.style.color = 'var(--text3)'
    btn.style.fontWeight = '600'
  })
  var btns = document.querySelectorAll('.rebal-threshold-btn')
  var idx = val === 3 ? 0 : val === 5 ? 1 : 2
  if (btns[idx]) {
    btns[idx].style.border = '1px solid var(--accent)'
    btns[idx].style.background = 'rgba(245,200,66,0.15)'
    btns[idx].style.color = 'var(--accent)'
    btns[idx].style.fontWeight = '700'
  }
}

var REBAL_METHOD_DESC = {
  BOTH: '부족한 자산은 매수하고, 초과 자산은 매도해 목표 비중에 맞춥니다.',
  BUY_ONLY: '기존 보유 자산은 최대한 유지하고 부족한 자산만 매수합니다.',
  NEW_FUND: '새로 들어온 자금을 우선 사용해 부족한 자산부터 보정합니다.'
}
function setRebalMethod(method) {
  _rebalMethod = method
  document.getElementById('rebal-method').value = method
  ;['BOTH','BUY_ONLY','NEW_FUND'].forEach(function(m) {
    var btn = document.getElementById('rm-' + m)
    if (!btn) return
    if (m === method) {
      btn.style.border = '1px solid var(--accent)'
      btn.style.background = 'rgba(245,200,66,0.15)'
      btn.style.color = 'var(--accent)'
      btn.style.fontWeight = '700'
    } else {
      btn.style.border = '1px solid var(--border)'
      btn.style.background = 'transparent'
      btn.style.color = 'var(--text3)'
      btn.style.fontWeight = '600'
    }
  })
  var desc = document.getElementById('rebal-method-desc')
  if (desc) desc.textContent = REBAL_METHOD_DESC[method] || ''
  updateRebalSummary()
}

function openCreateRebal() {
  _rebalAssets = []
  _rebalMethod = 'BOTH'
  _rebalThreshold = 5
  document.getElementById('rebal-create-form').style.display = 'block'
  var rp = document.getElementById('rebal-right-panel')
  if (rp) rp.style.display = 'flex'
  renderRebalAssets()
  updateRebalTriggerUI()
  setRebalMethod('BOTH')
  setRebalThreshold(5)
  document.getElementById('rebal-create-form').scrollIntoView({behavior:'smooth'})
  updateRebalSummary()
}

function closeCreateRebal() {
  document.getElementById('rebal-create-form').style.display = 'none'
  var rp = document.getElementById('rebal-right-panel')
  if (rp) rp.style.display = 'none'
  _rebalAssets = []
}

// 주기 선택 드롭다운
document.addEventListener('DOMContentLoaded', function() {
  var sel = document.getElementById('rebal-interval-select')
  if (sel) sel.addEventListener('change', function() {
    var inp = document.getElementById('rebal-interval')
    if (this.value === 'custom') {
      inp.style.display = 'block'
      inp.focus()
    } else {
      inp.style.display = 'none'
      inp.value = this.value
    }
  })
})

function searchRebalSymbol(query) {
  var dropdown = document.getElementById('rebal-symbol-dropdown')
  if (!query || query.length < 1) { dropdown.style.display = 'none'; return }
  var q = query.toLowerCase()
  var filtered = _symbols.filter(function(s) {
    return s.market.toLowerCase().includes(q) ||
      (s.korean_name && s.korean_name.includes(query)) ||
      s.market.replace('KRW-','').toLowerCase().includes(q)
  }).slice(0, 15)
  if (!filtered.length) { dropdown.style.display = 'none'; return }
  dropdown.innerHTML = filtered.map(function(s) {
    var mkt = s.market.replace('KRW-','')
    var kname = s.korean_name || mkt
    var price = Number(s.trade_price).toLocaleString()
    var div = document.createElement('div')
    div.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center'
    div.innerHTML = '<div><span style="font-weight:700;font-size:13px">' + kname + '</span><span style="font-size:11px;color:var(--text3);margin-left:8px">' + mkt + '</span></div><span style="font-size:12px;color:var(--accent)">' + price + '원</span>'
    div.onclick = function() { selectRebalSymbol(s.market, kname) }
    return div.outerHTML
  }).join('')
  dropdown.style.display = 'block'
}

function selectRebalSymbol(market, kname) {
  document.getElementById('rebal-add-symbol').value = kname + ' (' + market.replace('KRW-','') + ')'
  document.getElementById('rebal-add-symbol').dataset.market = market
  document.getElementById('rebal-symbol-dropdown').style.display = 'none'
  // 비중 입력 칸으로 포커스 이동
  var pctEl = document.getElementById('rebal-add-pct')
  if (pctEl) { pctEl.focus(); pctEl.select() }
}

function addRebalAsset() {
  var msgEl = document.getElementById('rebal-create-msg')
  var symbolInput = document.getElementById('rebal-add-symbol')
  var market = symbolInput.dataset.market || symbolInput.value.trim().toUpperCase()
  var pct = parseFloat(document.getElementById('rebal-add-pct').value)

  if (!market) { showToast('종목을 검색해서 선택하세요'); return }
  if (!pct || pct < 10) { showToast('비중은 최소 10% 이상이어야 합니다'); return }
  if (pct > 80) { showToast('단일 종목 비중은 최대 80%까지 가능합니다'); return }
  if (!market.startsWith('KRW-')) market = 'KRW-' + market
  if (_rebalAssets.find(function(a) { return a.symbol === market })) {
    showToast('이미 추가된 종목입니다'); return
  }
  if (_rebalAssets.length >= 5) { showToast('종목은 최대 5개까지 가능합니다'); return }

  _rebalAssets.push({symbol: market, target_pct: pct})
  symbolInput.value = ''
  symbolInput.dataset.market = ''
  document.getElementById('rebal-add-pct').value = ''
  renderRebalAssets()
}

function removeRebalAsset(symbol) {
  _rebalAssets = _rebalAssets.filter(function(a) { return a.symbol !== symbol })
  renderRebalAssets()
}

function renderRebalAssets() {
  var container = document.getElementById('rebal-assets-list')
  var summary = document.getElementById('rebal-pct-summary')
  var countEl = document.getElementById('rebal-asset-count')
  if (!container) return

  var total = _rebalAssets.reduce(function(s,a) { return s + a.target_pct }, 0)
  if (countEl) countEl.textContent = _rebalAssets.length + '/5'

  if (!_rebalAssets.length) {
    container.innerHTML = '<div style="font-size:10px;color:rgba(255,255,255,0.28);padding:8px 0">종목을 추가하세요 (2~5개, 각 최소 10%)</div>'
    if (summary) summary.innerHTML = ''
    updateRebalSummary()
    return
  }

  container.innerHTML = ''
  _rebalAssets.forEach(function(a) {
    var warn = a.target_pct < 10
    var row = document.createElement('div')
    row.style.cssText = 'display:grid;grid-template-columns:1fr 60px 24px;gap:8px;align-items:center;height:32px;padding:0 10px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);margin-top:6px;box-sizing:border-box'
    row.innerHTML =
      '<span style="font-size:11px;font-weight:600;color:#FFFFFF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + a.symbol.replace('KRW-','') + '</span>' +
      '<span style="font-size:10px;font-weight:600;color:' + (warn ? '#EF4444' : '#D1D5DB') + ';text-align:right">' + a.target_pct + '%' + (warn ? ' !' : '') + '</span>' +
      '<button style="width:20px;height:20px;border-radius:6px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.18);color:#EF4444;cursor:pointer;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1">×</button>'
    var btn = row.querySelector('button')
    ;(function(sym) { btn.onclick = function() { removeRebalAsset(sym) } })(a.symbol)
    container.appendChild(row)
  })

  var weightOk = Math.abs(total - 100) < 0.5
  var color = weightOk ? '#10B981' : '#EF4444'
  var msg = weightOk ? '비중 합계 정상' : '합계가 100%가 되어야 합니다'
  if (summary) {
    summary.style.color = color
    summary.textContent = '합계: ' + total.toFixed(1) + '% — ' + msg
  }
  var hintEl = document.getElementById('rebal-weight-hint')
  if (hintEl) {
    if (_rebalAssets.length > 0 && _rebalAssets.length < 2) {
      hintEl.style.display = 'block'
      hintEl.style.color = '#EF4444'
      hintEl.style.fontSize = '10px'
      hintEl.textContent = '최소 2개 종목이 필요합니다. (현재 ' + _rebalAssets.length + '개)'
    } else {
      hintEl.style.display = 'none'
      hintEl.textContent = ''
    }
  }
  updateRebalSummary()
}

var REBAL_PRESETS = {
  1: {
    name: '보수형 메이저 2종',
    trigger_type: 'BOTH',
    interval_hours: 168,
    threshold_pct: 5,
    assets: [
      {symbol: 'KRW-BTC', target_pct: 50},
      {symbol: 'KRW-ETH', target_pct: 50}
    ]
  },
  2: {
    name: '메이저 4종 비중형',
    trigger_type: 'BOTH',
    interval_hours: 720,
    threshold_pct: 5,
    assets: [
      {symbol: 'KRW-BTC', target_pct: 40},
      {symbol: 'KRW-ETH', target_pct: 25},
      {symbol: 'KRW-XRP', target_pct: 20},
      {symbol: 'KRW-SOL', target_pct: 15}
    ]
  },
  3: {
    name: '균등분산 5종',
    trigger_type: 'BOTH',
    interval_hours: 720,
    threshold_pct: 10,
    assets: [
      {symbol: 'KRW-BTC', target_pct: 20},
      {symbol: 'KRW-ETH', target_pct: 20},
      {symbol: 'KRW-XRP', target_pct: 20},
      {symbol: 'KRW-SOL', target_pct: 20},
      {symbol: 'KRW-ADA', target_pct: 20}
    ]
  }
}

function applyRebalPreset(num) {
  var preset = REBAL_PRESETS[num]
  if (!preset) return

  // 서브탭이 rebal이 아니면 먼저 전환
  switchGridTab('rebal')

  // 폼 열기
  document.getElementById('rebal-create-form').style.display = 'block'

  // 값 적용
  document.getElementById('rebal-name').value = preset.name
  document.getElementById('rebal-trigger').value = preset.trigger_type
  document.getElementById('rebal-threshold').value = preset.threshold_pct

  // 주기 select 동기화
  var selEl = document.getElementById('rebal-interval-select')
  var inpEl = document.getElementById('rebal-interval')
  if (selEl && inpEl) {
    var found = false
    for (var i = 0; i < selEl.options.length; i++) {
      if (String(selEl.options[i].value) === String(preset.interval_hours)) {
        selEl.selectedIndex = i
        found = true
        break
      }
    }
    if (!found) {
      selEl.value = 'custom'
      inpEl.style.display = 'block'
    } else {
      inpEl.style.display = 'none'
    }
    inpEl.value = preset.interval_hours
  }

  // 트리거 UI 업데이트
  updateRebalTriggerUI()

  // 방식 설정
  setRebalMethod(preset.trigger_type === 'BOTH' ? 'BOTH' : 'BOTH')
  setRebalThreshold(preset.threshold_pct)

  // 자산 목록 적용
  _rebalAssets = preset.assets.map(function(a) {
    return {symbol: a.symbol, target_pct: a.target_pct}
  })
  renderRebalAssets()

  // 우측 패널 표시 + 폼으로 스크롤
  var rp = document.getElementById('rebal-right-panel')
  if (rp) rp.style.display = 'flex'
  setTimeout(function() {
    document.getElementById('rebal-create-form').scrollIntoView({behavior:'smooth'})
  }, 100)

  showToast('✅ 프리셋 적용: ' + preset.name)
}

// ── 리밸런싱 유효성 검사 + 라이브 요약 ──────────────────
function validateRebalForm() {
  var errors = []
  var total = _rebalAssets.reduce(function(s,a) { return s + a.target_pct }, 0)
  var trigger = document.getElementById('rebal-trigger') ? document.getElementById('rebal-trigger').value : 'INTERVAL'
  var intervalEl = document.getElementById('rebal-interval-select')
  var interval = parseFloat(intervalEl ? (intervalEl.value === 'custom' ? document.getElementById('rebal-interval').value : intervalEl.value) : 24) || 24
  var minOrder = parseFloat(document.getElementById('rebal-min-order') ? document.getElementById('rebal-min-order').value : 10000) || 0
  var maxAdjustPct = parseFloat(document.getElementById('rebal-max-adjust-pct') ? document.getElementById('rebal-max-adjust-pct').value : 25) || 0
  var assetMax = parseFloat(document.getElementById('rebal-asset-max') ? document.getElementById('rebal-asset-max').value : 80) || 0
  var assetMin = parseFloat(document.getElementById('rebal-asset-min') ? document.getElementById('rebal-asset-min').value : 5) || 0
  var dailyCount = parseInt(document.getElementById('rebal-daily-count') ? document.getElementById('rebal-daily-count').value : 10) || 0

  if (_rebalAssets.length < 2) errors.push('종목은 최소 2개 이상 필요합니다.')
  if (_rebalAssets.length > 5) errors.push('종목은 최대 5개까지만 설정할 수 있습니다.')
  if (Math.abs(total - 100) > 1) errors.push('비중 합계는 정확히 100%여야 합니다. (현재: ' + total.toFixed(1) + '%)')
  _rebalAssets.forEach(function(a) {
    if (a.target_pct < 10) errors.push(a.symbol.replace('KRW-','') + ' 비중이 너무 낮습니다. (최소 10%)')
  })
  if (interval < 6) errors.push('실행 주기는 최소 6시간 이상이어야 합니다.')
  if (minOrder < 5500) errors.push('최소 주문 금액이 너무 낮습니다. (최소 5,500원)')
  if (maxAdjustPct < 1 || maxAdjustPct > 100) errors.push('1회 최대 조정 비율이 허용 범위를 벗어났습니다. (1~100%)')
  if (assetMax <= assetMin) errors.push('자산 최대 비중 상한은 최소 비중 하한보다 커야 합니다.')
  if (dailyCount < 1) errors.push('하루 최대 조정 횟수는 1회 이상이어야 합니다.')

  return errors
}

function updateRebalSummary() {
  var summaryEl = document.getElementById('rebal-summary-content')
  var errorsEl = document.getElementById('rebal-validation-errors')
  var submitBtn = document.getElementById('rebal-submit-btn')
  if (!summaryEl) return

  var errors = validateRebalForm()
  var total = _rebalAssets.reduce(function(s,a) { return s + a.target_pct }, 0)
  var trigger = document.getElementById('rebal-trigger') ? document.getElementById('rebal-trigger').value : 'INTERVAL'
  var intervalEl = document.getElementById('rebal-interval-select')
  var interval = intervalEl ? (intervalEl.value === 'custom' ? document.getElementById('rebal-interval').value : intervalEl.value) : 24
  var triggerText = trigger === 'INTERVAL' ? '주기형' : trigger === 'THRESHOLD' ? '비중 이탈형' : '혼합형'
  var methodText = _rebalMethod === 'BOTH' ? '매수+매도 균형' : _rebalMethod === 'BUY_ONLY' ? '매수만' : '신규자금 우선'
  var cycleText = interval + '시간마다'
  var nameVal = (document.getElementById('rebal-name') || {}).value || '-'
  var exchangeVal = (document.getElementById('rebal-exchange') || {}).value || ''
  var minOrderVal = (document.getElementById('rebal-min-order') || {}).value || '10000'
  var weightOk = Math.abs(total - 100) < 0.5
  var statusColor = errors.length === 0 ? '#10B981' : '#EF4444'
  var statusText = errors.length === 0 ? '시작 가능' : '시작 불가 — ' + (errors[0] || '입력 오류')

  // 인라인 요약 박스 업데이트
  summaryEl.innerHTML =
    '<div style="display:flex;justify-content:space-between;line-height:18px"><span style="color:rgba(255,255,255,0.38);font-size:10px">선택 종목</span><span style="font-size:11px;font-weight:600">' + _rebalAssets.length + '개</span></div>' +
    '<div style="display:flex;justify-content:space-between;line-height:18px"><span style="color:rgba(255,255,255,0.38);font-size:10px">비중 합계</span><span style="font-size:11px;font-weight:600;color:' + (weightOk?'#10B981':'#EF4444') + '">' + total.toFixed(1) + '%</span></div>' +
    '<div style="display:flex;justify-content:space-between;line-height:18px"><span style="color:rgba(255,255,255,0.38);font-size:10px">트리거 / 주기</span><span style="font-size:11px;font-weight:600">' + triggerText + ' / ' + cycleText + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;line-height:18px"><span style="color:rgba(255,255,255,0.38);font-size:10px">방식</span><span style="font-size:11px;font-weight:600">' + methodText + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;line-height:18px;border-top:1px solid rgba(255,255,255,0.04);margin-top:4px;padding-top:4px"><span style="color:rgba(255,255,255,0.38);font-size:10px">상태</span><span style="font-size:11px;font-weight:600;color:' + statusColor + '">' + statusText + '</span></div>'

  if (errors.length > 0) {
    errorsEl.style.display = 'block'
    errorsEl.innerHTML = errors.map(function(e) { return '• ' + e }).join('<br>')
  } else {
    errorsEl.style.display = 'none'
    errorsEl.innerHTML = ''
  }

  if (submitBtn) {
    if (errors.length === 0) {
      submitBtn.disabled = false
      submitBtn.style.background = '#F59E0B'
      submitBtn.style.color = '#111827'
      submitBtn.style.cursor = 'pointer'
      submitBtn.style.opacity = '1'
    } else {
      submitBtn.disabled = true
      submitBtn.style.background = 'rgba(255,255,255,0.05)'
      submitBtn.style.color = 'rgba(255,255,255,0.34)'
      submitBtn.style.cursor = 'not-allowed'
      submitBtn.style.opacity = '0.55'
    }
  }

  // 우측 패널 체크리스트 업데이트
  function setChk(id, ok) { var el = document.getElementById(id); if (!el) return; el.textContent = ok ? '✓' : '○'; el.style.color = ok ? '#10B981' : '#4B5563' }
  setChk('rebal-chk-count', _rebalAssets.length >= 2)
  setChk('rebal-chk-weight', weightOk)
  setChk('rebal-chk-minorder', parseFloat(minOrderVal) >= 5500)
  setChk('rebal-chk-fee', true)
  setChk('rebal-chk-cycle', parseFloat(interval) >= 6)
  setChk('rebal-chk-risk', true)

  // 우측 패널 실시간 요약 업데이트
  function setRp(id, val) { var el = document.getElementById(id); if (el) el.textContent = val }
  setRp('rebal-rp-name', nameVal || '-')
  setRp('rebal-rp-exchange', exchangeVal === 'upbit' ? 'Upbit' : exchangeVal === 'bithumb' ? 'Bithumb' : '-')
  setRp('rebal-rp-cycle', cycleText)
  setRp('rebal-rp-count', _rebalAssets.length ? _rebalAssets.length + '개' : '-')
  setRp('rebal-rp-weight', total > 0 ? total.toFixed(1) + '%' : '-')
  setRp('rebal-rp-method', methodText)
  setRp('rebal-rp-minorder', minOrderVal ? Number(minOrderVal).toLocaleString() + ' KRW' : '-')
  var rpStatus = document.getElementById('rebal-rp-status')
  if (rpStatus) {
    rpStatus.textContent = errors.length === 0 ? '시작 가능' : '시작 불가'
    rpStatus.style.color = errors.length === 0 ? '#10B981' : '#EF4444'
  }
}

// ── 홈 대시보드 데이터 로드 ──────────────────────────
async function fetchDashboard() {
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
    ])

    var upBalData = results[0].value && results[0].value.ok ? await results[0].value.json() : null
    var upPosData = results[1].value && results[1].value.ok ? await results[1].value.json() : null
    var btBalData = results[2].value && results[2].value.ok ? await results[2].value.json() : null
    var btPosData = results[3].value && results[3].value.ok ? await results[3].value.json() : null
    var gridData  = results[4].value && results[4].value.ok ? await results[4].value.json() : null
    var dcaData   = results[5].value && results[5].value.ok ? await results[5].value.json() : null
    var rebalData = results[6].value && results[6].value.ok ? await results[6].value.json() : null
    var logData   = results[7].value && results[7].value.ok ? await results[7].value.json() : null

    if (gridData && Array.isArray(gridData.strategies)) {
      gridData.strategies = applyGridStateOverridesToStrategies(gridData.strategies)
    }

    var upKrw = (upBalData && upBalData.krw_available ? upBalData.krw_available : 0)
    var btKrw = (btBalData && btBalData.krw_available ? btBalData.krw_available : 0)

    var upPositions = upPosData && upPosData.positions ? upPosData.positions.map(function(p){
      p.exchange = 'upbit'; return p
    }) : []
    var btPositions = btPosData && btPosData.positions ? btPosData.positions.map(function(p){
      p.exchange = 'bithumb'; return p
    }) : []

    var upEval = upPositions.reduce(function(s,p){ return s + (p.eval_amount || 0) }, 0)
    var btEval = btPositions.reduce(function(s,p){ return s + (p.eval_amount || 0) }, 0)

    var combinedBalData = {
      krw_available: upKrw + btKrw,
      total_eval_amount: upKrw + btKrw + upEval + btEval
    }

    var combinedPosData = {
      positions: upPositions.concat(btPositions)
    }

    window.__dashCache = {
      upBalData: cloneJsonSafe(upBalData),
      upPosData: cloneJsonSafe(upPosData),
      btBalData: cloneJsonSafe(btBalData),
      btPosData: cloneJsonSafe(btPosData),
      gridData: cloneJsonSafe(gridData),
      dcaData: cloneJsonSafe(dcaData),
      rebalData: cloneJsonSafe(rebalData),
      logData: cloneJsonSafe(logData),
      combinedBalData: cloneJsonSafe(combinedBalData),
      combinedPosData: cloneJsonSafe(combinedPosData)
    }

    renderDashTop(combinedBalData, combinedPosData, gridData, dcaData, rebalData)
    renderDashExchange(upBalData, upPosData, btBalData, btPosData)
    renderDashStrategies(gridData, dcaData, rebalData)
    renderDashStatus(gridData, dcaData, rebalData)
    renderDashPositions(combinedPosData)
    renderDashRecentLogs(logData)
  } catch(e) {
    console.error('[DASH] 오류:', e)
  }
}

function renderDashTop(balData, posData, gridData, dcaData, rebalData) {
  var krw = balData ? (balData.krw_available || 0) : 0
  var positions = posData && posData.positions ? posData.positions : []
  var coinEval = positions.reduce(function(s,p){ return s + (p.eval_amount || 0) }, 0)
  var totalEval = balData && balData.total_eval_amount ? balData.total_eval_amount : (krw + coinEval)
  var totalPnl = positions.reduce(function(s,p){ return s + (p.pnl_amount || 0) }, 0)

  var gridActive = countActiveStrategiesSafe(gridData)
  var dcaActive = countActiveStrategiesSafe(dcaData)
  var rebalActive = countActiveStrategiesSafe(rebalData)
  var totalActive = gridActive + dcaActive + rebalActive

  var krwEl = document.getElementById('dash-krw')
  if (krwEl) krwEl.textContent = Number(krw).toLocaleString() + '원'

  var evalEl = document.getElementById('dash-total-eval')
  if (evalEl) evalEl.textContent = Number(totalEval).toLocaleString() + '원'

  var pnlEl = document.getElementById('dash-total-pnl')
  if (pnlEl) {
    var ps = totalPnl >= 0 ? '+' : ''
    pnlEl.style.color = totalPnl >= 0 ? 'var(--rise)' : 'var(--fall)'
    pnlEl.textContent = ps + Number(totalPnl).toLocaleString() + '원'
  }

  var activeEl = document.getElementById('dash-active-strategies')
  if (activeEl) activeEl.textContent = totalActive + '개'

  var detailEl = document.getElementById('dash-strategy-detail')
  if (detailEl) detailEl.textContent = 'Grid ' + gridActive + ' · DCA ' + dcaActive + ' · Rebal ' + rebalActive

  var posEl = document.getElementById('dash-position-count')
  if (posEl) posEl.textContent = positions.length + '종목'

  var posDetailEl = document.getElementById('dash-position-detail')
  if (posDetailEl) posDetailEl.textContent = '업비트+빗썸 합산'
}

function renderDashExchange(upBalData, upPosData, btBalData, btPosData) {
  function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원' }
  function setPnl(id, val) {
    var el = document.getElementById(id); if (!el) return
    el.style.color = val > 0 ? '#EF4444' : val < 0 ? '#3B82F6' : '#6b7280'
    el.textContent = (val > 0 ? '+' : '') + fmt(val)
  }
  function setPct(id, pct) {
    var el = document.getElementById(id); if (!el) return
    el.style.color = pct > 0 ? '#EF4444' : pct < 0 ? '#3B82F6' : '#6b7280'
    el.textContent = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%'
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val }
  function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원' }
  function setPnl(id, val) {
    var el = document.getElementById(id); if (!el) return
    el.style.color = val > 0 ? '#EF4444' : val < 0 ? '#3B82F6' : '#6b7280'
    el.textContent = (val > 0 ? '+' : '') + fmt(val)
  }
  function setPct(id, pct) {
    var el = document.getElementById(id); if (!el) return
    el.style.color = pct > 0 ? '#EF4444' : pct < 0 ? '#3B82F6' : '#6b7280'
    el.textContent = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%'
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val }
  var upKrw = upBalData ? (upBalData.krw_available || 0) : 0
  var upPos = upPosData && upPosData.positions ? upPosData.positions : []
  var upEval = upPos.reduce(function(s,p){return s+(p.eval_amount||0)},0)
  var upInvest = upPos.reduce(function(s,p){return s+(p.invest_amount||0)},0)
  var upPnl = upEval - upInvest
  var upPct = upInvest > 0 ? (upPnl/upInvest*100) : 0
  setText('dash-upbit-value', fmt(upEval+upKrw))
  setText('dash-upbit-krw', fmt(upKrw))
  setText('dash-upbit-available', fmt(upKrw))
  setText('dash-upbit-invest', fmt(upInvest))
  setText('dash-upbit-eval', fmt(upEval))
  setPnl('dash-upbit-pnl', upPnl)
  setPct('dash-upbit-pnl-pct', upPct)
  setText('dash-upbit-holdings', upPos.length + '종목')
  var upSt = document.getElementById('dash-upbit-status')
  if (upSt) { upSt.textContent = (upBalData&&!upBalData.no_key)?'● 연결됨':'● 미연결'; upSt.style.color = (upBalData&&!upBalData.no_key)?'#22c55e':'#f59e0b' }
  var btKrw = btBalData ? (btBalData.krw_available || 0) : 0
  var btPos = btPosData && btPosData.positions ? btPosData.positions : []
  var btEval = btPos.reduce(function(s,p){return s+(p.eval_amount||0)},0)
  var btInvest = btPos.reduce(function(s,p){return s+(p.invest_amount||0)},0)
  var btPnl = btEval - btInvest
  var btPct = btInvest > 0 ? (btPnl/btInvest*100) : 0
  setText('dash-bithumb-value', fmt(btEval+btKrw))
  setText('dash-bithumb-krw', fmt(btKrw))
  setText('dash-bithumb-available', fmt(btKrw))
  setText('dash-bithumb-invest', fmt(btInvest))
  setText('dash-bithumb-eval', fmt(btEval))
  setPnl('dash-bithumb-pnl', btPnl)
  setPct('dash-bithumb-pnl-pct', btPct)
  setText('dash-bithumb-holdings', btPos.length + '종목')
  var btSt = document.getElementById('dash-bithumb-status')
  if (btSt) { btSt.textContent = (btBalData&&!btBalData.no_key)?'● 연결됨':'● 미연결'; btSt.style.color = (btBalData&&!btBalData.no_key)?'#22c55e':'#f59e0b' }
  var totalAsset = upEval + upKrw + btEval + btKrw
  var totalInvest = upInvest + btInvest
  var totalPnl = upPnl + btPnl
  var totalPct = totalInvest > 0 ? (totalPnl / totalInvest * 100) : 0
  setText('dash-total-asset', fmt(totalAsset))
  setText('dash-total-invest-display', fmt(totalInvest))
  setText('dash-total-available', fmt(upKrw + btKrw))
  setPnl('dash-total-pnl-display', totalPnl)
  setPct('dash-total-pct-display', totalPct)
  // ROW 4 업비트/빗썸 요약 카드
  setText('row4-upbit-krw', fmt(upKrw))
  setText('row4-upbit-eval', fmt(upEval + upKrw))
  setText('row4-bithumb-krw', fmt(btKrw))
  setText('row4-bithumb-eval', fmt(btEval + btKrw))
  var r4uConn = document.getElementById('row4-upbit-conn')
  if (r4uConn) { r4uConn.textContent = (upBalData&&!upBalData.no_key)?'● 연결됨':'● 미연결'; r4uConn.style.color = (upBalData&&!upBalData.no_key)?'var(--color-normal)':'var(--color-warning)' }
  var r4bConn = document.getElementById('row4-bithumb-conn')
  if (r4bConn) { r4bConn.textContent = (btBalData&&!btBalData.no_key)?'● 연결됨':'● 미연결'; r4bConn.style.color = (btBalData&&!btBalData.no_key)?'var(--color-normal)':'var(--color-warning)' }
  var now4 = new Date(); var ts4 = (now4.getHours()<10?'0':'')+now4.getHours()+':'+(now4.getMinutes()<10?'0':'')+now4.getMinutes()
  setText('row4-upbit-sync', ts4); setText('row4-bithumb-sync', ts4)
}

function renderDashStrategies(gridData, dcaData, rebalData) {
  function fmtKrw(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원' }
  function row(label, val, cls) {
    return '<div class="home-strategy-row">' +
      '<span class="home-strategy-row-label">' + label + '</span>' +
      '<span class="home-strategy-row-val' + (cls ? ' ' + cls : '') + '">' + val + '</span>' +
    '</div>'
  }

  // ── 그리드 ──
  var gridStrats = gridData && gridData.strategies ? applyGridStateOverridesToStrategies(gridData.strategies) : []
  var gridActive = gridStrats.filter(function(s){return s.status==='ACTIVE'})
  var gridPaused = gridStrats.filter(function(s){return s.status==='PAUSED'})
  var gridAll = gridActive.concat(gridPaused)
  var gridProfit = gridStrats.reduce(function(s,st){return s+(st.total_profit||0)},0)
  var gridBadge = document.getElementById('dash-grid-count')
  var gridDetail = document.getElementById('dash-grid-detail')
  gridBadge.textContent = gridActive.length + '개 실행 중' + (gridPaused.length > 0 ? ' · ' + gridPaused.length + '개 일시정지' : '')
  gridBadge.className = 'home-strategy-badge' + (gridActive.length === 0 && gridPaused.length === 0 ? ' inactive' : '')
  if (gridAll.length > 0) {
    var gridRows = gridAll.map(function(s) {
      var isPaused = s.status === 'PAUSED'
      var isBusy = !!s.__uiBusy
      var dot = isBusy ? '<span style="color:#fbbf24">◌</span>' : (isPaused ? '<span style="color:#f59e0b">⏸</span>' : '<span style="color:#4ade80">▶</span>')
      var sym = (_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')
      var exName = s.exchange === 'bithumb' ? '빗썸' : '업비트'
      var exColor = s.exchange === 'bithumb' ? '#f59e0b' : '#60a5fa'
      var pauseHtml = (!isPaused && !isBusy) ? '<button onclick="event.stopPropagation();pauseGrid(' + s.id + ')" style="background:rgba(245,158,11,0.1);border:1px solid #f59e0b;color:#f59e0b;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600">⏸ 정지</button>' : ''
      var resumeHtml = (isPaused && !isBusy) ? '<button onclick="event.stopPropagation();resumeGrid(' + s.id + ')" style="background:rgba(74,222,128,0.15);border:1px solid #4ade80;color:#4ade80;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600">▶ 재시작</button>' : ''
      var stopHtml = isBusy ? '<span style="font-size:10px;color:#fbbf24;font-weight:700">처리 중...</span>' : '<button onclick="event.stopPropagation();dashStopGrid(' + s.id + ')" style="background:rgba(248,113,113,0.1);border:1px solid #f87171;color:#f87171;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;margin-left:4px">삭제</button>'
      return '<div onclick="switchTab(\'grid\')" style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid var(--border2);cursor:pointer">' +
        '<div style="display:flex;align-items:center;gap:6px">' + dot +
          '<span style="font-size:12px;font-weight:700;color:var(--text)">' + sym + '</span>' +
          '<span style="font-size:11px;font-weight:700;color:' + exColor + ';opacity:0.85">' + exName + '</span>' +
        '</div>' +
        '<div>' + pauseHtml + resumeHtml + stopHtml + '</div>' +
      '</div>'
    })
    gridDetail.innerHTML = gridRows.join('') + '<div style="margin-top:6px">' + row('누적수익', (gridProfit>=0?'+':'') + fmtKrw(gridProfit), gridProfit>=0?'rise':'fall') + '</div>'
  } else {
    gridDetail.innerHTML = '<div class="home-strategy-empty" style="text-align:center;padding:16px 8px">' + '<div style="font-size:20px;margin-bottom:6px">⚡</div>' + '<div style="font-size:12px;color:var(--text2);margin-bottom:4px">실행 중인 그리드 전략이 없습니다</div>' + '<div style="font-size:11px;color:var(--text3)">전략 탭에서 새 그리드를 만들어보세요</div>' + '</div>'
  }

  // ── 분할매수 ──
  var dcaStrats = dcaData && dcaData.strategies ? dcaData.strategies : []
  var dcaActive = dcaStrats.filter(function(s){return s.status==='ACTIVE'})
  var dcaPaused = dcaStrats.filter(function(s){return s.status==='PAUSED'})
  var dcaAll = dcaActive.concat(dcaPaused)
  var dcaBadge = document.getElementById('dash-dca-count')
  var dcaDetail = document.getElementById('dash-dca-detail')
  dcaBadge.textContent = dcaActive.length + '개 실행 중' + (dcaPaused.length > 0 ? ' · ' + dcaPaused.length + '개 일시정지' : '')
  dcaBadge.className = 'home-strategy-badge' + (dcaActive.length === 0 && dcaPaused.length === 0 ? ' inactive' : '')
  if (dcaAll.length > 0) {
    var dcaRows = dcaAll.map(function(s) {
      var isPaused = s.status === 'PAUSED'
      var dot = isPaused ? '<span style="color:#f59e0b">⏸</span>' : '<span style="color:#4ade80">▶</span>'
      var sym = (_koreanMap && _koreanMap[s.symbol]) || s.symbol.replace('KRW-','')
      var exName = s.exchange === 'bithumb' ? '빗썸' : '업비트'
      var resumeHtml = isPaused ? '<button onclick="event.stopPropagation();resumeDCA(' + s.id + ')" style="background:rgba(74,222,128,0.15);border:1px solid #4ade80;color:#4ade80;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600">▶ 재개</button>' : ''
      var stopHtml = '<button onclick="event.stopPropagation();dashStopDCA(' + s.id + ')" style="background:rgba(248,113,113,0.1);border:1px solid #f87171;color:#f87171;padding:2px 7px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;margin-left:4px">삭제</button>'
      return '<div onclick="switchTab(\'strategy\')" style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid var(--border2);cursor:pointer">' +
        '<div style="display:flex;align-items:center;gap:6px">' + dot +
          '<span style="font-size:12px;font-weight:700;color:var(--text)">' + sym + '</span>' +
          '<span style="font-size:10px;color:var(--text3)">' + exName + '</span>' +
        '</div>' +
        '<div>' + resumeHtml + stopHtml + '</div>' +
      '</div>'
    })
    dcaDetail.innerHTML = dcaRows.join('')
  } else {
    dcaDetail.innerHTML = '<div class="home-strategy-empty" style="text-align:center;padding:16px 8px">' +
      '<div style="font-size:20px;margin-bottom:6px">📋</div>' +
      '<div style="font-size:12px;color:var(--text2);margin-bottom:4px">실행 중인 분할매수 전략이 없습니다</div>' +
      '<div style="font-size:11px;color:var(--text3)">전략 탭에서 분할매수를 설정해보세요</div>' +
      '</div>'
  }

  // ── 리밸런싱 ──
  var rebalStrats = rebalData && rebalData.strategies ? rebalData.strategies : []
  var rebalActive = rebalStrats.filter(function(s){return s.status==='ACTIVE'})
  var rebalBadge = document.getElementById('dash-rebal-count')
  var rebalDetail = document.getElementById('dash-rebal-detail')
  rebalBadge.textContent = rebalActive.length + '개 실행 중'
  rebalBadge.className = 'home-strategy-badge' + (rebalActive.length === 0 ? ' inactive' : '')
  if (rebalActive.length > 0) {
    var rb = rebalActive[0]
    var rbAssets = rb.assets ? rb.assets.slice(0,3).map(function(a){return a.symbol.replace('KRW-','')+'('+a.target_pct+'%)'}).join(' ') : '-'
    var rbLast = rb.last_rebal_at ? new Date(rb.last_rebal_at).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'}) : '미실행'
    rebalDetail.innerHTML =
      row('전략명', rb.name || '-', 'accent') +
      row('종목비중', rbAssets) +
      row('마지막실행', rbLast)
  } else {
    rebalDetail.innerHTML = '<div class="home-strategy-empty" style="text-align:center;padding:16px 8px">' + '<div style="font-size:20px;margin-bottom:6px">🔄</div>' + '<div style="font-size:12px;color:var(--text2);margin-bottom:4px">실행 중인 리밸런싱 전략이 없습니다</div>' + '<div style="font-size:11px;color:var(--text3)">전략 탭에서 리밸런싱을 설정해보세요</div>' + '</div>'
  }

  // ROW 2 통합 전략 리스트 업데이트
  renderStrategyList(gridData, dcaData, rebalData)
  // ROW 4 동적 카드 업데이트
  renderDynamicCard(rebalData)
}

function renderDashStatus(gridData, dcaData, rebalData) {
  var warnings = []
  var statusBar = document.getElementById('dash-status-bar')
  var statusText = document.getElementById('dash-status-text')

  var gridPaused = gridData && gridData.strategies ? gridData.strategies.filter(function(s){return s.status==='PAUSED'}).length : 0
  var dcaPaused  = dcaData  && dcaData.strategies  ? dcaData.strategies.filter(function(s){return s.status==='PAUSED'}).length  : 0
  if (gridPaused > 0) warnings.push('일시정지된 그리드 ' + gridPaused + '개')
  if (dcaPaused  > 0) warnings.push('일시정지된 DCA '   + dcaPaused  + '개')

  var dot = statusBar ? statusBar.querySelector('.home-status-dot') : null
  if (warnings.length > 0) {
    if (statusBar) statusBar.className = 'home-status-bar warn'
    if (statusText) statusText.textContent = '⚠ ' + warnings.join(' · ')
    if (dot) dot.className = 'home-status-dot warn'
  } else {
    if (statusBar) statusBar.className = 'home-status-bar ok'
    if (statusText) statusText.textContent = '모든 전략 정상 작동 중'
    if (dot) dot.className = 'home-status-dot on'
  }

  // ROW 1 카드 3: 거래소 전체 상태
  var overallEl = document.getElementById('dash-exchange-overall')
  if (overallEl) {
    if (warnings.length > 0) { overallEl.textContent = '주의 필요'; overallEl.style.color = 'var(--color-warning)' }
    else { overallEl.textContent = '정상 연결됨'; overallEl.style.color = 'var(--color-normal)' }
  }
  // 마지막 동기화 시각
  var syncEl = document.getElementById('dash-last-sync')
  if (syncEl) { var now=new Date(); syncEl.textContent = (now.getHours()<10?'0':'')+now.getHours()+':'+(now.getMinutes()<10?'0':'')+now.getMinutes() }
  // 업데이트 시각 (자산 카드)
  var updEl = document.getElementById('dash-update-time')
  if (updEl) { var n2=new Date(); updEl.textContent = '업데이트 '+(n2.getHours()<10?'0':'')+n2.getHours()+':'+(n2.getMinutes()<10?'0':'')+n2.getMinutes() }
}

function renderDashPositions(posData) {
  var el = document.getElementById('dash-positions')
  var positions = posData && posData.positions ? posData.positions : []
  if (!positions.length) {
    el.innerHTML = '<div class="empty" style="padding:10px 0;font-size:11px">보유 포지션 없음</div>'
    return
  }
  var html = ''
  positions.slice(0,6).forEach(function(p) {
    var pct = Number(p.pnl_pct || 0)
    var pnl = Number(p.pnl_amount || 0)
    var avgPrice = Number(p.avg_buy_price || 0)
    var pctColor = pct > 0 ? 'var(--rise)' : pct < 0 ? 'var(--fall)' : 'var(--text3)'
    var sign = pct >= 0 ? '+' : ''
    var pnlSign = pnl >= 0 ? '+' : ''
    var exKey  = p.exchange === 'bithumb' ? 'bithumb' : 'upbit'
    var exName = p.exchange === 'bithumb' ? '빗썸' : '업비트'
    html += '<div class="dash-pos-row" data-exchange="' + exKey + '" style="display:grid;grid-template-columns:52px 1fr 60px 72px;gap:4px;padding:clamp(9px,1.2vh,15px) 6px;border-bottom:1px solid var(--border2);align-items:center;cursor:pointer;border-radius:6px;transition:background 0.12s">' +
      '<div><div style="font-size:clamp(13px,1.2vw,18px);font-weight:700;color:var(--text)">' + p.currency + '</div>' +
        '<div style="font-size:clamp(9px,0.8vw,12px);color:var(--text3);margin-top:2px">' + exName + '</div></div>' +
      '<div><div style="font-size:clamp(11px,1vw,15px);font-weight:600;color:var(--text)">' + (avgPrice>0?Number(avgPrice).toLocaleString():'—') + '</div>' +
        '<div style="font-size:clamp(9px,0.8vw,12px);color:var(--text3);margin-top:2px">' + (p.korean_name||'') + '</div></div>' +
      '<div style="text-align:right;font-size:clamp(12px,1.1vw,16px);font-weight:700;color:' + pctColor + '">' + sign + pct.toFixed(2) + '%</div>' +
      '<div style="text-align:right;font-size:clamp(12px,1.1vw,16px);font-weight:700;color:' + pctColor + '">' + pnlSign + Number(pnl).toLocaleString() + '</div>' +
    '</div>'
  })
  if (positions.length > 6) html += '<div style="font-size:10px;color:var(--text3);padding-top:6px;text-align:center">외 ' + (positions.length-6) + '종목 더보기 →</div>'
  el.innerHTML = html
  el.querySelectorAll('.dash-pos-row').forEach(function(row) {
    var exKey = row.dataset.exchange
    row.addEventListener('mouseover', function(){ this.style.background = 'var(--bg3)' })
    row.addEventListener('mouseout',  function(){ this.style.background = '' })
    row.addEventListener('click', function(){ if(typeof switchExchange==='function') switchExchange(exKey) })
  })
  // ROW 3 포지션 테이블 업데이트
  renderHomePosTable(posData)
}

/* ── ROW 2 통합 전략 리스트 렌더러 ── */
function renderStrategyList(gridData, dcaData, rebalData) {
  var el = document.getElementById('dash-strategy-list')
  if (!el) return

  var all = []
  function collect(data, type) {
    if (data && data.strategies) data.strategies.forEach(function(s){ all.push(Object.assign({}, s, {_type: type})) })
  }
  collect(gridData, 'grid')
  collect(dcaData, 'dca')
  collect(rebalData, 'rebal')

  // 정렬: 오류 > 실행중 > 일시정지 > 대기
  var ord = {ERROR:0, ACTIVE:1, PAUSED:2}
  all.sort(function(a,b){ return (ord[a.status]!==undefined?ord[a.status]:3) - (ord[b.status]!==undefined?ord[b.status]:3) })

  // ROW 1 카드 2 업데이트
  var running = all.filter(function(s){return s.status==='ACTIVE'}).length
  var paused  = all.filter(function(s){return s.status==='PAUSED'}).length
  var pending = all.filter(function(s){return s.status==='PLANNED'||s.status==='PENDING'}).length
  var setT = function(id,v){ var e=document.getElementById(id); if(e) e.textContent=v }
  setT('dash-str-running', running + '개')
  setT('dash-str-running-lbl', running + '개')
  setT('dash-str-paused', paused + '개')
  setT('dash-str-pending', pending + '개')
  // 마지막 변경 시각
  var lastTs = all.reduce(function(m,s){ var t=s.updated_at||s.last_run_at||''; return t>m?t:m }, '')
  if (lastTs) { var d=new Date(lastTs); setT('dash-str-last-change', (d.getMonth()+1)+'/'+(d.getDate())+' '+(d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes()) }

  // 빈 상태
  if (all.length === 0) {
    el.innerHTML = '<div class="hsp-empty">' +
      '<div style="font-size:32px;margin-bottom:10px">⚡</div>' +
      '<div style="font-size:14px;color:var(--text2);margin-bottom:8px;font-weight:600">실행중인 전략이 없습니다.</div>' +
      '<button onclick="switchGrid();switchGridTab(\'grid\')" style="padding:8px 20px;background:var(--accent);color:#0A0B0D;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">전략 만들기</button>' +
    '</div>'
    return
  }

  function typeLabel(t){ return t==='grid'?'그리드':t==='dca'?'분할매수':t==='rebal'?'리밸런싱':t }
  function fmtPnl(n){ n=n||0; return (n>=0?'+':'')+Math.floor(n).toLocaleString('ko-KR')+'원' }
  function fmtTime(s){ if(!s) return '-'; var d=new Date(s); return (d.getMonth()+1)+'/'+(d.getDate())+' '+(d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes() }

  el.innerHTML = all.map(function(s) {
    var sym = (_koreanMap&&_koreanMap[s.symbol])||((s.symbol||'-').replace('KRW-',''))
    var exName = s.exchange==='bithumb'?'빗썸':'업비트'
    var stCls = s.status==='ACTIVE'?'running':s.status==='PAUSED'?'paused':s.status==='ERROR'?'error':'idle'
    var stTxt = s.status==='ACTIVE'?'실행중':s.status==='PAUSED'?'일시정지':s.status==='ERROR'?'오류':s.status==='PLANNED'?'대기':'미확인'
    var pnl = s.total_profit||s.profit||0
    var pnlStyle = pnl>0?'color:var(--color-normal)':pnl<0?'color:var(--color-error)':'color:var(--text3)'
    var lastRun = fmtTime(s.last_run_at||s.last_rebal_at||s.updated_at)
    var name = s.name||(typeLabel(s._type)+' #'+s.id)

    // 주요 액션 (1개)
    var mainBtn = ''
    if (s.status==='ACTIVE' && (s._type==='grid'||s._type==='dca')) {
      var fn = s._type==='grid'?'pauseGrid':'pauseDCA'
      mainBtn = '<button onclick="event.stopPropagation();'+fn+'('+s.id+')" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid var(--color-warning);color:var(--color-warning);background:rgba(245,158,11,0.1)">⏸ 정지</button>'
    } else if (s.status==='PAUSED') {
      var fn2 = s._type==='grid'?'resumeGrid':s._type==='dca'?'resumeDCA':''
      if (fn2) mainBtn = '<button onclick="event.stopPropagation();'+fn2+'('+s.id+')" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid var(--color-normal);color:var(--color-normal);background:rgba(16,185,129,0.1)">▶ 재개</button>'
    } else if (s.status==='ERROR') {
      mainBtn = '<button onclick="event.stopPropagation();switchGrid()" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid var(--color-error);color:var(--color-error);background:rgba(239,68,68,0.1)">⚠ 확인</button>'
    }
    // 상세 액션 (1개)
    var detailBtn = '<button onclick="event.stopPropagation();switchGrid()" style="padding:3px 8px;font-size:10px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);color:var(--text3);background:rgba(255,255,255,0.05)">상세</button>'

    return '<div class="hsp-row">' +
      '<div class="hsp-cell name" title="'+name+'">'+name+'</div>' +
      '<div class="hsp-cell">'+exName+'</div>' +
      '<div class="hsp-cell">'+sym+'</div>' +
      '<div class="hsp-cell"><span class="status-badge '+stCls+'">'+stTxt+'</span></div>' +
      '<div class="hsp-cell r" style="'+pnlStyle+'">'+fmtPnl(pnl)+'</div>' +
      '<div class="hsp-cell r">'+lastRun+'</div>' +
      '<div class="hsp-cell r" style="display:flex;gap:4px;justify-content:flex-end">'+mainBtn+detailBtn+'</div>' +
    '</div>'
  }).join('')
}

/* ── 활동 패널 탭 전환 ── */
function switchHapTab(tab) {
  document.querySelectorAll('.hap-tab').forEach(function(t){ t.classList.remove('active') })
  document.querySelectorAll('.hap-pane').forEach(function(p){ p.classList.remove('active') })
  var activeTab = document.querySelector('.hap-tab[data-tab="'+tab+'"]')
  if (activeTab) activeTab.classList.add('active')
  var activePane = document.getElementById('hap-pane-'+tab)
  if (activePane) activePane.classList.add('active')
}

/* ── ROW 3: 포지션 테이블 렌더러 ── */
function renderHomePosTable(posData) {
  var el = document.getElementById('dash-pos-list')
  if (!el) return
  var positions = posData && posData.positions ? posData.positions : []

  if (positions.length === 0) {
    el.innerHTML = '<div class="hpp-empty">' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:8px;font-weight:600">활성 포지션 없음.</div>' +
      '<button onclick="switchExchange(\'upbit\')" style="padding:6px 16px;background:var(--color-info);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">거래 화면으로 이동</button>' +
    '</div>'
    return
  }

  // 정렬: 손익 영향 큰 순
  var sorted = positions.slice().sort(function(a,b){ return Math.abs(b.pnl_amount||0) - Math.abs(a.pnl_amount||0) })

  function fmtPnl(n){ n=n||0; return (n>=0?'+':'')+Math.floor(n).toLocaleString('ko-KR')+'원' }
  function fmtQty(n){ if(n==null||n===undefined) return '-'; var v=Number(n); return v.toFixed(4).replace(/\.?0+$/,'') }

  el.innerHTML = sorted.map(function(p) {
    var sym = p.currency || ((p.symbol||'').replace('KRW-',''))
    var kname = p.korean_name || sym
    var exName = p.exchange==='bithumb'?'빗썸':'업비트'
    var pct = Number(p.pnl_pct || 0)
    var pnl = Number(p.pnl_amount || 0)
    var pctColor = pct>0?'color:var(--color-normal)':pct<0?'color:var(--color-error)':'color:var(--text3)'
    return '<div class="hpp-row hpp-cols">' +
      '<div class="hpp-cell" style="display:flex;flex-direction:column;gap:1px">' +
        '<span style="font-size:11px;font-weight:700;color:#FFFFFF">' + sym + '</span>' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.34)">' + kname + '</span>' +
      '</div>' +
      '<div class="hpp-cell">' + exName + '</div>' +
      '<div class="hpp-cell" style="color:var(--text3)">-</div>' +
      '<div class="hpp-cell r" style="'+pctColor+'">' + (pct>=0?'+':'') + pct.toFixed(2) + '%</div>' +
      '<div class="hpp-cell r" style="'+pctColor+'">' + fmtPnl(pnl) + '</div>' +
      '<div class="hpp-cell r">' + fmtQty(p.qty) + '</div>' +
      '<div class="hpp-cell r">' +
        '<button onclick="switchExchange(\''+p.exchange+'\')" style="height:22px;padding:0 8px;font-size:9px;font-weight:700;border-radius:6px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);color:var(--text3);background:rgba(255,255,255,0.05)">상세</button>' +
      '</div>' +
    '</div>'
  }).join('')
}

/* ── ROW 4 동적 카드 렌더러 ── */
var _lastRebalData = null

function renderDynamicCard(rebalData) {
  _lastRebalData = rebalData
  var el = document.getElementById('home-dynamic-card-inner')
  if (!el) return

  var rebalStrats = rebalData && rebalData.strategies
    ? rebalData.strategies.filter(function(s){ return s.status==='ACTIVE' })
    : []

  // 우선순위 1: 리밸런싱 현황
  if (rebalStrats.length > 0) {
    var rb = rebalStrats[0]
    var assets = rb.assets
      ? rb.assets.slice(0,4).map(function(a){ return a.symbol.replace('KRW-','')+'('+a.target_pct+'%)' }).join(' · ')
      : '-'
    var lastRebal = rb.last_rebal_at
      ? new Date(rb.last_rebal_at).toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'})
      : '미실행'
    el.innerHTML =
      '<div class="hes-header"><div class="hes-title">🔄 리밸런싱 현황</div>' +
        '<span class="status-badge running">실행중</span>' +
      '</div>' +
      '<div class="hes-divider" style="margin:4px 0"></div>' +
      '<div class="hes-rows">' +
        '<div class="hes-row"><span class="hes-row-label">전략명</span><span class="hes-row-val">' + (rb.name||'-') + '</span></div>' +
        '<div class="hes-row"><span class="hes-row-label">종목 비중</span>' +
          '<span class="hes-row-val" style="font-size:11px;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+assets+'">' + assets + '</span>' +
        '</div>' +
        '<div class="hes-row"><span class="hes-row-label">마지막 실행</span><span class="hes-row-val">' + lastRebal + '</span></div>' +
        '<div class="hes-row"><span class="hes-row-label">실행중</span><span class="hes-row-val" style="color:var(--color-normal)">' + rebalStrats.length + '개</span></div>' +
      '</div>' +
      '<button class="hes-open-btn" onclick="switchGrid();switchGridTab(\'rebal\')">전략 상세 →</button>'
    return
  }

  // 우선순위 3 (fallback): 시스템 상태 요약
  var activeStr = (document.getElementById('dash-str-running') || {}).textContent || '-'
  el.innerHTML =
    '<div class="hes-header"><div class="hes-title">🖥️ 시스템 상태</div>' +
      '<span class="status-badge running">정상</span>' +
    '</div>' +
    '<div class="hes-divider" style="margin:4px 0"></div>' +
    '<div class="hes-rows">' +
      '<div class="hes-row"><span class="hes-row-label">전체 상태</span><span class="hes-row-val" style="color:var(--color-normal)">정상 운영 중</span></div>' +
      '<div class="hes-row"><span class="hes-row-label">실행 중 전략</span><span class="hes-row-val">' + activeStr + '</span></div>' +
      '<div class="hes-row"><span class="hes-row-label">오류</span><span class="hes-row-val" style="color:var(--color-inactive)">0건</span></div>' +
    '</div>' +
    '<div style="margin-top:auto;padding-top:8px;font-size:10px;color:var(--text3);text-align:center">' +
      '리밸런싱 또는 시뮬레이션 결과가 있으면 여기 표시됩니다' +
    '</div>'
}

function renderDashRecentLogs(logData) {
  var el = document.getElementById('dash-recent-logs')
  var optimisticHtml = ''
  try {
    var existingOptimistic = el ? Array.from(el.querySelectorAll('.optimistic-log')).map(function(node){ return node.outerHTML }).join('') : ''
    optimisticHtml = existingOptimistic
  } catch (e) {}
  if (!logData || !logData.logs || !logData.logs.length) {
    el.innerHTML = optimisticHtml || '<div class="home-log-entry"><span class="home-log-time">--:--</span><span class="home-log-text" style="color:var(--text3)">최근 활동 없음</span></div>'
    cleanupOptimisticRecentActivity(12000)
    return
  }
  el.innerHTML = optimisticHtml + logData.logs.slice(0,20).map(function(l) {
    var dt = new Date(l.at)
    var timeStr = String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0')
    var sym = l.symbol ? ((_koreanMap && _koreanMap[l.symbol]) || l.symbol.replace('KRW-','')) : '-'
    var exBadge = l.exchange === 'bithumb' ? '<span style="font-size:9px;color:#f59e0b;margin-left:3px">빗썸</span>' : '<span style="font-size:9px;color:#60a5fa;margin-left:3px">업비트</span>'
    if (l.event_type === 'strategy') {
      var evtColor = l.status === 'ACTIVE' ? '#4ade80' : l.status === 'PAUSED' ? '#f59e0b' : '#f87171'
      return '<div class="home-log-entry">' +
        '<span class="home-log-time">' + timeStr + '</span>' +
        '<span class="home-log-text" style="color:var(--text3)">' +
          '<span style="color:#f59e0b;font-weight:600">' + (l.strategy_type||'전략') + '</span>' +
          ' ' + sym + ' ' + exBadge.replace('margin-left:3px','') +
          ' <span style="color:' + evtColor + ';font-weight:600">' + (l.status_ko||'') + '</span>' +
        '</span>' +
      '</div>'
    }
    var isBuy = l.side === 'BUY'
    var sideClass = isBuy ? 'buy' : 'sell'
    var amtStr = Number(l.amount_krw||0).toLocaleString() + '원'
    return '<div class="home-log-entry">' +
      '<span class="home-log-time">' + timeStr + '</span>' +
      '<span class="home-log-text ' + sideClass + '">' + sym + ' ' + (l.side_ko||'') + '</span>' +
      exBadge +
      '<span style="font-size:10px;color:var(--text3);margin-left:4px">' + amtStr + '</span>' +
      '<span style="font-size:10px;margin-left:4px;color:' + (l.status==='FILLED'?'var(--rise)':l.status==='CANCELLED'?'var(--text3)':'var(--accent)') + '">' + (l.status_ko||'') + '</span>' +
    '</div>'
  }).join('')
  cleanupOptimisticRecentActivity(12000)
}

// ── 포트폴리오 상세 ──────────────────────────────
var _pfUpData = null
var _pfBtData = null

async function fetchPortfolioDetail() {
  try {
    var results = await Promise.allSettled([
      authFetch('/api/balances'),
      authFetch('/api/positions'),
      authFetch('/bapi/balances'),
      authFetch('/bapi/positions'),
      authFetch('/rebalancing/strategies')
    ])
    var upBalData   = results[0].status === 'fulfilled' && results[0].value ? await results[0].value.json() : null
    var upPosData   = results[1].status === 'fulfilled' && results[1].value ? await results[1].value.json() : null
    var btBalData   = results[2].status === 'fulfilled' && results[2].value ? await results[2].value.json() : null
    var btPosData   = results[3].status === 'fulfilled' && results[3].value ? await results[3].value.json() : null
    var rebalData   = results[4].status === 'fulfilled' && results[4].value ? await results[4].value.json() : null

    renderPfExchange('upbit',   upBalData, upPosData)
    renderPfExchange('bithumb', btBalData, btPosData)
    renderPortfolioRebal(rebalData)
    renderPfRow1(_pfUpData, _pfBtData)
    renderPfHoldingsTable(_pfUpData, _pfBtData)
    renderPfConcentration(_pfUpData, _pfBtData)
  } catch(e) {
    console.error('[PF] 로드 오류:', e)
  }
}

function renderPfExchange(exchange, balData, posData) {
  var isUpbit = exchange === 'upbit'
  var prefix  = isUpbit ? 'pf-upbit' : 'pf-bithumb'
  var accentColor = isUpbit ? '#2563eb' : '#ea580c'

  function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원' }
  function setPnl(id, val) {
    var el = document.getElementById(id); if (!el) return
    el.style.color = val > 0 ? 'var(--rise)' : val < 0 ? 'var(--fall)' : 'var(--text3)'
    el.textContent = (val > 0 ? '+' : '') + fmt(val)
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val }

  // 미연결 처리
  if (!balData || balData.no_key) {
    if (isUpbit) _pfUpData = { noKey: true, total:0, krw:0, coinEval:0, pnl:0, invest:0, positions:[] }
    else _pfBtData = { noKey: true, total:0, krw:0, coinEval:0, pnl:0, invest:0, positions:[] }
    var countEl2 = document.getElementById(prefix + '-count'); if (countEl2) countEl2.textContent = '-종목'
    var syncEl2 = document.getElementById(prefix + '-sync'); if (syncEl2) syncEl2.textContent = '-'
    var stratEl2 = document.getElementById(prefix + '-strategies'); if (stratEl2) stratEl2.textContent = '-'
    var totalEl = document.getElementById(prefix + '-total')
    if (totalEl) { totalEl.textContent = '미연결'; totalEl.style.color = 'var(--text3)' }
    var stEl = document.getElementById(prefix + '-status')
    if (stEl) { stEl.textContent = '● 미연결'; stEl.style.color = '#4B5563'; stEl.style.background = 'rgba(75,85,99,0.12)'; stEl.style.borderColor = 'rgba(75,85,99,0.2)' }
    // 도넛 - 미연결 회색 원
    var canvas = document.getElementById(prefix + '-donut')
    if (canvas) {
      var size = canvas.offsetWidth || 100
      canvas.width = size * 2; canvas.height = size * 2
      var ctx = canvas.getContext('2d')
      var W = canvas.width, H = canvas.height
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.42, 0, Math.PI*2)
      ctx.fillStyle = '#21262d'; ctx.fill()
      ctx.beginPath(); ctx.arc(W/2, H/2, W*0.26, 0, Math.PI*2)
      ctx.fillStyle = '#161b22'; ctx.fill()
      ctx.fillStyle = '#484f58'; ctx.font = 'bold ' + Math.round(W*0.11) + 'px sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('미연결', W/2, H/2)
    }
    return
  }

  var krw = balData.krw_available || 0
  var positions = posData && posData.positions ? posData.positions : []
  var coinEval = positions.reduce(function(s,p){ return s+(p.eval_amount||0) }, 0)
  var invest   = positions.reduce(function(s,p){ return s+(p.invest_amount||0) }, 0)
  var pnl      = coinEval - invest
  var total    = krw + coinEval

  // 헤더
  var stEl = document.getElementById(prefix + '-status')
  if (stEl) { stEl.textContent = '● 연결됨'; stEl.style.color = '#10B981'; stEl.style.background = 'rgba(16,185,129,0.1)'; stEl.style.borderColor = 'rgba(16,185,129,0.2)' }
  setText(prefix + '-total', fmt(total))
  setText(prefix + '-krw',   fmt(krw))
  setText(prefix + '-coin-eval', fmt(coinEval))
  setPnl(prefix + '-pnl', pnl)
  // 신규 row2 IDs
  var countEl = document.getElementById(prefix + '-count')
  if (countEl) countEl.textContent = positions.length + '종목'
  var syncEl = document.getElementById(prefix + '-sync')
  if (syncEl) { var _n = new Date(); syncEl.textContent = _n.getHours() + ':' + String(_n.getMinutes()).padStart(2,'0') }
  var stratEl = document.getElementById(prefix + '-strategies')
  if (stratEl) { var _activeStrats = (window._strategies||[]).filter(function(s){ return s.exchange===exchange&&s.status==='ACTIVE' }); stratEl.textContent = _activeStrats.length + '개' }
  // 데이터 저장
  if (isUpbit) _pfUpData = { noKey:false, total:total, krw:krw, coinEval:coinEval, pnl:pnl, invest:invest, positions:positions }
  else _pfBtData = { noKey:false, total:total, krw:krw, coinEval:coinEval, pnl:pnl, invest:invest, positions:positions }

  // 도넛 그래프 - 실제 렌더 크기 기준
  var canvas = document.getElementById(prefix + '-donut')
  if (canvas && total > 0) {
    var size = canvas.offsetWidth || 100
    canvas.width = size * 2
    canvas.height = size * 2
    var ctx = canvas.getContext('2d')
    var items = [{ val: krw, color: '#F59E0B' }]
    var colors = ['#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399','#e879f9','#38bdf8']
    positions.forEach(function(p, i) {
      items.push({ val: p.eval_amount||0, color: colors[i % colors.length] })
    })
    var W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    var startAngle = -Math.PI / 2
    var cx = W/2, cy = H/2, r = W*0.42, innerR = W*0.26
    items.forEach(function(item) {
      var slice = (item.val / total) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()
      startAngle += slice
    })
    ctx.beginPath()
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fillStyle = '#161b22'
    ctx.fill()
    ctx.fillStyle = '#e6edf3'
    ctx.font = 'bold ' + Math.round(W*0.12) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(positions.length + '종목', cx, cy)
  }

  // 코인별 비중
  var weightsEl = document.getElementById(prefix + '-weights')
  if (weightsEl && total > 0) {
    var wItems = [{ name: 'KRW', val: krw, color: '#F59E0B', pnl: 0 }]
    var wColors = ['#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#34d399']
    positions.forEach(function(p, i) {
      wItems.push({ name: p.currency, val: p.eval_amount||0, color: wColors[i%wColors.length], pnl: p.pnl_pct||0 })
    })
    var fs = 'clamp(10px,0.9vw,13px)'
    weightsEl.innerHTML = wItems.map(function(item) {
      var pct = (item.val / total * 100)
      var pnlColor = item.pnl > 0 ? 'var(--rise)' : item.pnl < 0 ? 'var(--fall)' : 'var(--text3)'
      var pnlStr = item.name === 'KRW' ? '' : (item.pnl >= 0 ? '+' : '') + item.pnl.toFixed(1) + '%'
      return '<div style="display:grid;grid-template-columns:clamp(50px,5vw,80px) 1fr clamp(45px,4vw,65px) clamp(45px,4vw,60px);gap:6px;align-items:center;padding:3px 0">' +
        '<div style="font-size:' + fs + ';font-weight:700;color:var(--text)">' + item.name + '</div>' +
        '<div style="background:var(--bg4);border-radius:3px;height:6px;overflow:hidden"><div style="width:' + Math.min(pct,100).toFixed(1) + '%;height:100%;background:' + item.color + ';border-radius:3px"></div></div>' +
        '<div style="text-align:right;font-size:' + fs + ';font-weight:700;color:var(--text)">' + pct.toFixed(1) + '%</div>' +
        '<div style="text-align:right;font-size:' + fs + ';color:' + pnlColor + ';font-weight:700">' + pnlStr + '</div>' +
      '</div>'
    }).join('')
  }

  // 보유 포지션 테이블
  var posEl = document.getElementById(prefix + '-positions')
  if (posEl) {
    if (!positions.length) {
      posEl.innerHTML = '<div class="empty" style="font-size:11px;padding:8px 0">보유 포지션 없음</div>'
      return
    }
    var fs2 = 'clamp(11px,1vw,15px)'
    var fsS2 = 'clamp(9px,0.85vw,12px)'
    var pd2 = 'clamp(9px,1.1vh,14px) clamp(8px,0.9vw,14px)'
    var rows = positions.map(function(p) {
      var pnlColor = (p.pnl_pct||0) >= 0 ? 'var(--rise)' : 'var(--fall)'
      var pnlSign  = (p.pnl_pct||0) >= 0 ? '+' : ''
      return '<tr class="pf-pos-r" onclick="window._pendingPortfolioSymbol=\'KRW-' + p.currency + '\';switchExchange(\'' + exchange + '\')" style="border-bottom:1px solid var(--border2);cursor:pointer">' +
        '<td style="padding:' + pd2 + ';font-weight:700;font-size:' + fs2 + ';color:var(--text)">' + p.currency +
          '<div style="font-size:' + fsS2 + ';color:var(--text3);font-weight:400">' + (p.korean_name||'') + '</div></td>' +
        '<td style="padding:' + pd2 + ';text-align:right;color:var(--text2);font-size:' + fsS2 + '">' + (p.qty||'-') + '</td>' +
        '<td style="padding:' + pd2 + ';text-align:right;color:var(--text2);font-size:' + fs2 + '">' + Number(p.avg_buy_price||0).toLocaleString() + '</td>' +
        '<td style="padding:' + pd2 + ';text-align:right;font-weight:700;font-size:' + fs2 + ';color:var(--text)">' + fmt(p.eval_amount||0) + '</td>' +
        '<td style="padding:' + pd2 + ';text-align:right;font-weight:700;color:' + pnlColor + '">' +
          '<div style="font-size:' + fs2 + '">' + pnlSign + (p.pnl_pct||0).toFixed(2) + '%</div>' +
          '<div style="font-size:' + fsS2 + ';margin-top:1px">' + pnlSign + Number(p.pnl_amount||0).toLocaleString() + '원</div>' +
        '</td>' +
      '</tr>'
    }).join('')
    posEl.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--bg3)">' +
      '<th style="padding:' + pd2 + ';text-align:left;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">종목</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">수량</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">평균단가</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">평가금액</th>' +
      '<th style="padding:' + pd2 + ';text-align:right;color:var(--text3);font-size:' + fsS2 + ';font-weight:600">손익</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>'
    posEl.querySelectorAll('.pf-pos-r').forEach(function(r) {
      r.addEventListener('mouseover', function(){ this.style.background = 'var(--bg3)' })
      r.addEventListener('mouseout',  function(){ this.style.background = '' })
    })
  }
}

function renderPortfolioSummary(b, p) {}
function renderPortfolioCoinWeights(b, p) {}

function renderPortfolioRebal(rebalData) {
  var el = document.getElementById('pf-rebal-summary')
  if (!el) return
  if (!rebalData || !rebalData.strategies || !rebalData.strategies.length) {
    el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.38)">리밸런싱 전략 없음 &middot; <a onclick="switchGrid();switchGridTab(\'rebal\')" style="color:#F59E0B;cursor:pointer">만들기 →</a></div>'
    return
  }
  var active = rebalData.strategies.filter(function(s) { return s.status !== 'STOPPED' })
  if (!active.length) {
    el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.38)">활성 리밸런싱 전략 없음</div>'
    return
  }
  el.innerHTML = active.slice(0,3).map(function(s) {
    var statusColor = s.status === 'ACTIVE' ? '#10B981' : '#F59E0B'
    var exBadge = s.exchange === 'bithumb' ? 'BT' : 'UP'
    return '<div style="display:flex;justify-content:space-between;align-items:center;height:24px">' +
      '<span style="font-size:11px;font-weight:600;color:#D1D5DB;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%">' + s.name + ' <span style="font-size:9px;color:rgba(255,255,255,0.38)">' + exBadge + '</span></span>' +
      '<span style="font-size:10px;font-weight:600;color:' + statusColor + ';white-space:nowrap">● ' + (s.status==='ACTIVE'?'실행 중':'일시정지') + '</span>' +
    '</div>'
  }).join('')
}

function renderPfRow1(upData, btData) {
  var fmt = function(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') + '원' }
  var upTotal = upData ? (upData.total||0) : 0
  var btTotal = btData ? (btData.total||0) : 0
  var upKrw   = upData ? (upData.krw||0)   : 0
  var btKrw   = btData ? (btData.krw||0)   : 0
  var upPnl   = upData ? (upData.pnl||0)   : 0
  var btPnl   = btData ? (btData.pnl||0)   : 0
  var upInvest = upData ? (upData.invest||0) : 0
  var btInvest = btData ? (btData.invest||0) : 0
  var totalEval = upTotal + btTotal
  var totalKrw  = upKrw + btKrw
  var totalPnl  = upPnl + btPnl
  var totalInvest = upInvest + btInvest
  var pnlPct = totalInvest > 0 ? (totalPnl / totalInvest * 100) : 0

  var r1Total = document.getElementById('pf-r1-total')
  if (r1Total) r1Total.textContent = totalEval > 0 ? fmt(totalEval) : '-'
  var r1Krw = document.getElementById('pf-r1-krw')
  if (r1Krw) r1Krw.textContent = 'KRW ' + fmt(totalKrw)

  var r1Pnl = document.getElementById('pf-r1-pnl-amount')
  if (r1Pnl) {
    r1Pnl.textContent = totalInvest > 0 ? (totalPnl >= 0 ? '+' : '') + fmt(totalPnl) : '-'
    r1Pnl.style.color = totalPnl > 0 ? '#10B981' : totalPnl < 0 ? '#EF4444' : 'rgba(255,255,255,0.38)'
  }
  var r1PnlPct = document.getElementById('pf-r1-pnl-pct')
  if (r1PnlPct) {
    r1PnlPct.textContent = totalInvest > 0 ? '수익률 ' + (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%' : '수익률 -'
    r1PnlPct.style.color = pnlPct > 0 ? '#10B981' : pnlPct < 0 ? '#EF4444' : 'rgba(255,255,255,0.38)'
  }

  var r1Exch = document.getElementById('pf-r1-exchanges')
  if (r1Exch) {
    var upLine = (upData && !upData.noKey) ? '<div style="font-size:11px;font-weight:700;color:#10B981">● Upbit 연결됨</div>' : '<div style="font-size:11px;color:rgba(255,255,255,0.38)">○ Upbit 미연결</div>'
    var btLine = (btData && !btData.noKey) ? '<div style="font-size:11px;font-weight:700;color:#10B981">● Bithumb 연결됨</div>' : '<div style="font-size:11px;color:rgba(255,255,255,0.38)">○ Bithumb 미연결</div>'
    r1Exch.innerHTML = upLine + btLine
  }

  var r1Strat = document.getElementById('pf-r1-strategy-count')
  if (r1Strat) {
    var activeCount = (window._strategies||[]).filter(function(s){ return s.status==='ACTIVE' }).length
    r1Strat.textContent = activeCount > 0 ? activeCount + '개' : '-'
  }
}

function renderPfHoldingsTable(upData, btData) {
  var el = document.getElementById('pf-holdings-table')
  var countEl = document.getElementById('pf-holdings-count')
  if (!el) return
  var all = []
  if (upData && upData.positions) upData.positions.forEach(function(p){ all.push(Object.assign({},p,{_ex:'Upbit'})) })
  if (btData && btData.positions) btData.positions.forEach(function(p){ all.push(Object.assign({},p,{_ex:'Bithumb'})) })
  if (countEl) countEl.textContent = all.length + '개 자산'
  if (!all.length) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:180px"><div style="text-align:center"><div style="font-size:13px;font-weight:700;color:#FFFFFF;margin-bottom:4px">보유 자산 없음</div><div style="font-size:11px;color:rgba(255,255,255,0.38)">거래 화면에서 매수 후 확인하세요</div></div></div>'
    return
  }
  var strats = window._strategies || []
  var rows = all.map(function(p) {
    var pnlPct = p.pnl_pct || 0
    var pnlAmt = p.pnl_amount || 0
    var pnlColor = pnlPct > 0 ? '#10B981' : pnlPct < 0 ? '#EF4444' : 'rgba(255,255,255,0.38)'
    var pnlSign = pnlPct >= 0 ? '+' : ''
    var linked = strats.find(function(s){ return s.symbol===('KRW-'+p.currency)&&s.exchange===p._ex.toLowerCase()&&s.status==='ACTIVE' })
    var stratCell = linked ? '<span style="font-size:8px;background:rgba(245,158,11,0.12);color:#F59E0B;border:1px solid rgba(245,158,11,0.24);border-radius:3px;padding:0 4px">' + linked.name.substring(0,8) + '</span>' : '<span style="font-size:9px;color:rgba(255,255,255,0.24)">-</span>'
    return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">' +
      '<td style="padding:0 12px;height:34px;vertical-align:middle"><div style="font-size:11px;font-weight:700;color:#FFFFFF">' + p.currency + '</div><div style="font-size:9px;color:rgba(255,255,255,0.38)">' + (p.korean_name||'') + '</div></td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;font-size:10px;color:rgba(255,255,255,0.52)">' + p._ex + '</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:right;font-size:11px;color:#D1D5DB">' + (p.qty||'-') + '</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:right;font-size:11px;color:#D1D5DB">' + Number(p.avg_buy_price||0).toLocaleString() + '</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:right;font-size:11px;font-weight:700;color:#F59E0B">' + Number(p.eval_amount||0).toLocaleString() + '원</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:right;font-size:11px;font-weight:700;color:' + pnlColor + '">' + pnlSign + pnlPct.toFixed(2) + '%</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:right;font-size:10px;color:' + pnlColor + '">' + pnlSign + Number(pnlAmt).toLocaleString() + '원</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:center">' + stratCell + '</td>' +
      '<td style="padding:0 10px;height:34px;vertical-align:middle;text-align:center"><button onclick="window._pendingPortfolioSymbol=\'KRW-'+p.currency+'\';switchExchange(\''+p._ex.toLowerCase()+'\')" style="font-size:9px;height:20px;padding:0 6px;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.42);cursor:pointer">상세</button></td>' +
    '</tr>'
  }).join('')
  el.innerHTML = '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr style="background:rgba(255,255,255,0.02);position:sticky;top:0;z-index:1">' +
    '<th style="padding:0 12px;height:30px;text-align:left;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600;white-space:nowrap">자산</th>' +
    '<th style="padding:0 10px;height:30px;text-align:left;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">거래소</th>' +
    '<th style="padding:0 10px;height:30px;text-align:right;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">수량</th>' +
    '<th style="padding:0 10px;height:30px;text-align:right;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">평균가</th>' +
    '<th style="padding:0 10px;height:30px;text-align:right;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">현재평가</th>' +
    '<th style="padding:0 10px;height:30px;text-align:right;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">수익률</th>' +
    '<th style="padding:0 10px;height:30px;text-align:right;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">미실현손익</th>' +
    '<th style="padding:0 10px;height:30px;text-align:center;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">연결전략</th>' +
    '<th style="padding:0 10px;height:30px;text-align:center;font-size:10px;color:rgba(255,255,255,0.38);font-weight:600">상세</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>'
}

function renderPfConcentration(upData, btData) {
  var el = document.getElementById('pf-concentration')
  if (!el) return
  var all = []
  var totalEval = 0
  if (upData && upData.positions) { upData.positions.forEach(function(p){ all.push(p); totalEval += p.eval_amount||0 }); totalEval += upData.krw||0 }
  if (btData && btData.positions) { btData.positions.forEach(function(p){ all.push(p); totalEval += p.eval_amount||0 }); totalEval += btData.krw||0 }
  if (!all.length || totalEval === 0) {
    el.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.38)">보유 자산 없음</div>'
    return
  }
  var sorted = all.slice().sort(function(a,b){ return (b.eval_amount||0)-(a.eval_amount||0) })
  var top = sorted[0]
  var topPct = (top.eval_amount||0) / totalEval * 100
  var hhi = all.reduce(function(s,p){ var w=(p.eval_amount||0)/totalEval; return s+w*w }, 0)
  var label = topPct > 70 ? '집중' : topPct > 40 ? '편중' : '분산'
  var labelColor = topPct > 70 ? '#EF4444' : topPct > 40 ? '#F59E0B' : '#10B981'
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<span style="font-size:11px;color:rgba(255,255,255,0.52)">집중도 상태</span>' +
      '<span style="font-size:12px;font-weight:700;color:' + labelColor + '">● ' + label + '</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
      '<span style="font-size:10px;color:rgba(255,255,255,0.38)">최대 비중 종목</span>' +
      '<span style="font-size:11px;font-weight:600;color:#D1D5DB">' + top.currency + ' ' + topPct.toFixed(1) + '%</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span style="font-size:10px;color:rgba(255,255,255,0.38)">종목 수 / HHI</span>' +
      '<span style="font-size:10px;color:rgba(255,255,255,0.52)">' + all.length + '종목 / ' + (hhi*100).toFixed(0) + '</span>' +
    '</div>'
}

// ── 홈 대시보드 데이터 로드 ──────────────────────────

function hideAllMainPanels() {
  var layout = document.getElementById('main-layout');
  if (layout) layout.style.display = 'none';

  var ids = [
    'home-panel',
    'grid-panel',
    'portfolio-panel',
    'settings-panel',
    'strategy-panel',
    'rebalancing-panel',
    'admin-panel',
    'simulation-panel'
  ];

  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.querySelectorAll('.settings-panel').forEach(function(p) {
    p.style.display = 'none';
  });
}

function clearTopTabs() {
  document.querySelectorAll('.top-tab').forEach(function(t) {
    t.classList.remove('active');
  });
}

function switchHome() {
  hideAllMainPanels();

  var panel = document.getElementById('home-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();
  var tabHome = document.getElementById('tab-home');
  if (tabHome) tabHome.classList.add('active');

  if (typeof fetchDashboard === 'function') {
    fetchDashboard();
    setInterval(function(){ if(typeof fetchDashboard==='function') fetchDashboard(); }, 2000);
  }
}

function switchSimulation() {
  hideAllMainPanels();
  clearTopTabs();
  var tab = document.getElementById('tab-sim');
  if (tab) tab.classList.add('active');
  var panel = document.getElementById('simulation-panel');
  if (panel) panel.style.display = 'block';
  updateSimSummary();
}

var _simScenarios = []

function updateSimSummary() {
  var typeMap = { grid: '그리드', dca: '분할매수', rebal: '리밸런싱' }
  var feeMap = { standard: '표준', pessimistic: '보수적', zero: '없음' }
  var type = (document.getElementById('sim-strategy-type')||{}).value || 'grid'
  var exchange = (document.getElementById('sim-exchange')||{}).value || 'upbit'
  var symbol = (document.getElementById('sim-symbol')||{}).value || 'KRW-BTC'
  var period = (document.getElementById('sim-period')||{}).value || '30'
  var capital = parseFloat((document.getElementById('sim-capital')||{}).value) || 0
  var feeMode = (document.getElementById('sim-fee-mode')||{}).value || 'standard'
  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v }
  set('sim-s-type', typeMap[type] || type)
  set('sim-s-exchange', exchange === 'upbit' ? 'Upbit' : 'Bithumb')
  set('sim-s-symbol', symbol.replace('KRW-',''))
  set('sim-s-period', period + '일')
  set('sim-s-capital', capital > 0 ? Number(capital).toLocaleString() + '원' : '-')
  set('sim-s-fee', feeMap[feeMode] || feeMode)
}

function runSimulation() {
  var type = (document.getElementById('sim-strategy-type')||{}).value || 'grid'
  var exchange = (document.getElementById('sim-exchange')||{}).value || 'upbit'
  var symbol = (document.getElementById('sim-symbol')||{}).value || 'KRW-BTC'
  var period = parseInt((document.getElementById('sim-period')||{}).value) || 30
  var capital = parseFloat((document.getElementById('sim-capital')||{}).value) || 0
  var feeMode = (document.getElementById('sim-fee-mode')||{}).value || 'standard'
  if (capital <= 0) { if (typeof showToast === 'function') showToast('시작 자금을 입력하세요'); return }

  var baseFee = exchange === 'bithumb' ? 0.0004 : 0.0005
  var feeMult = feeMode === 'pessimistic' ? 1.5 : feeMode === 'zero' ? 0 : 1
  var feeRate = baseFee * feeMult

  var tradesPerDay = type === 'grid' ? 4 : type === 'dca' ? 1 : 0.3
  var totalTrades = Math.max(1, Math.round(tradesPerDay * period))
  var grossRtnPerTrade = type === 'grid' ? 0.004 : type === 'dca' ? 0.006 : 0.003
  var winRate = type === 'grid' ? 0.58 : type === 'dca' ? 0.55 : 0.60
  var netRtn = (grossRtnPerTrade * winRate - grossRtnPerTrade * (1 - winRate) * 0.6) * totalTrades - totalTrades * 2 * feeRate
  var maxDD = type === 'grid' ? -0.08 : type === 'dca' ? -0.12 : -0.06
  var pf = (winRate * grossRtnPerTrade) / Math.max(0.0001, (1 - winRate) * grossRtnPerTrade * 0.6)
  var finalCap = capital * (1 + netRtn)
  var profit = finalCap - capital
  var pnlColor = profit > 0 ? '#10B981' : profit < 0 ? '#EF4444' : 'rgba(255,255,255,0.38)'

  var el = document.getElementById('sim-results')
  if (el) {
    el.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px">' +
        _simRow('총 수익률', (profit >= 0 ? '+' : '') + (netRtn * 100).toFixed(2) + '%', pnlColor) +
        _simRow('최대 낙폭 (추정)', (maxDD * 100).toFixed(1) + '%', '#EF4444') +
        _simRow('거래 수', totalTrades + '회', '#D1D5DB') +
        _simRow('승률 (추정)', (winRate * 100).toFixed(0) + '%', '#D1D5DB') +
        _simRow('수익 팩터', pf.toFixed(2), pf >= 1.2 ? '#10B981' : '#F59E0B') +
        _simRow('최종 평가', Number(Math.floor(finalCap)).toLocaleString() + '원', pnlColor) +
      '</div>' +
      '<div style="margin-top:6px;font-size:9px;color:rgba(255,255,255,0.28);text-align:center">추정치 — 실제 결과와 다를 수 있습니다</div>'
  }

  var typeLabels = { grid: '그리드', dca: '분할매수', rebal: '리밸런싱' }
  _simScenarios.push({
    label: (typeLabels[type]||type) + ' · ' + symbol.replace('KRW-','') + ' · ' + period + '일',
    rtn: (netRtn * 100).toFixed(2),
    dd: (maxDD * 100).toFixed(1),
    trades: totalTrades,
    wr: (winRate * 100).toFixed(0)
  })
  renderSimScenarios()
}

function _simRow(label, val, color) {
  return '<div style="padding:3px 0">' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.38);margin-bottom:1px">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:700;color:' + (color||'#D1D5DB') + '">' + val + '</div>' +
  '</div>'
}

function resetSimulation() {
  var el = document.getElementById('sim-results')
  if (el) el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:156px;gap:5px"><div style="font-size:12px;font-weight:600;color:#FFFFFF">아직 실행된 결과가 없습니다</div><div style="font-size:10px;color:rgba(255,255,255,0.38)">왼쪽에서 조건을 설정하고 실행하세요</div></div>'
}

function clearSimScenarios() {
  _simScenarios = []
  renderSimScenarios()
}

function renderSimScenarios() {
  var el = document.getElementById('sim-scenarios')
  if (!el) return
  if (!_simScenarios.length) {
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:120px;gap:5px"><div style="font-size:11px;font-weight:600;color:#FFFFFF">비교할 시나리오가 없습니다</div><div style="font-size:10px;color:rgba(255,255,255,0.38)">시뮬레이션 실행 시 자동으로 추가됩니다</div></div>'
    return
  }
  el.innerHTML = '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr style="background:rgba(255,255,255,0.02)">' +
    '<th style="padding:4px 8px;font-size:9px;color:rgba(255,255,255,0.38);text-align:left;font-weight:600">시나리오</th>' +
    '<th style="padding:4px 8px;font-size:9px;color:rgba(255,255,255,0.38);text-align:right;font-weight:600">수익률</th>' +
    '<th style="padding:4px 8px;font-size:9px;color:rgba(255,255,255,0.38);text-align:right;font-weight:600">낙폭</th>' +
    '<th style="padding:4px 8px;font-size:9px;color:rgba(255,255,255,0.38);text-align:right;font-weight:600">거래수</th>' +
    '<th style="padding:4px 8px;font-size:9px;color:rgba(255,255,255,0.38);text-align:right;font-weight:600">승률</th>' +
    '</tr></thead><tbody>' +
    _simScenarios.map(function(s) {
      var rc = parseFloat(s.rtn) > 0 ? '#10B981' : parseFloat(s.rtn) < 0 ? '#EF4444' : 'rgba(255,255,255,0.38)'
      return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">' +
        '<td style="padding:5px 8px;font-size:10px;color:#D1D5DB;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + s.label + '</td>' +
        '<td style="padding:5px 8px;font-size:10px;font-weight:700;color:' + rc + ';text-align:right">' + (parseFloat(s.rtn) >= 0 ? '+' : '') + s.rtn + '%</td>' +
        '<td style="padding:5px 8px;font-size:10px;color:#EF4444;text-align:right">' + s.dd + '%</td>' +
        '<td style="padding:5px 8px;font-size:10px;color:#D1D5DB;text-align:right">' + s.trades + '</td>' +
        '<td style="padding:5px 8px;font-size:10px;color:#D1D5DB;text-align:right">' + s.wr + '%</td>' +
      '</tr>'
    }).join('') +
    '</tbody></table>'
}

/* ── 긴급정지 ── */

var EMERGENCY_STOP_STORAGE_KEY = 'gridflow_emergency_stop_active';

function isEmergencyStopActive() {
  try { return localStorage.getItem(EMERGENCY_STOP_STORAGE_KEY) === '1'; } catch(e) { return false; }
}

function syncEmergencyStopBanner() {
  try {
    var active = isEmergencyStopActive();
    updateGlobalBanner(
      active ? 'error' : 'normal',
      active ? '긴급 정지 작동중' : '정상 운영 중',
      active ? '모든 전략 긴급 정지 상태입니다.' : '전략 및 계정 상태를 동기화해 표시 중입니다.'
    );
  } catch (e) {}
}

function setEmergencyStopActive(v) {
  try {
    if (v) localStorage.setItem(EMERGENCY_STOP_STORAGE_KEY, '1');
    else localStorage.removeItem(EMERGENCY_STOP_STORAGE_KEY);
  } catch(e) {}
  updateEmergencyStopButton();
  syncEmergencyStopBanner();
}

async function writeActivitySummary(status, statusKo, strategyType) {
  try {
    await authFetch('/api/activity/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status,
        status_ko: statusKo,
        strategy_type: strategyType || '시스템',
        symbol: 'SYSTEM',
        exchange: 'SYSTEM'
      })
    });
  } catch (e) {
    console.error('writeActivitySummary error:', e);
  }
}

function getStrategyTypeLabelForOptimistic(type) {
  var t = String(type || '').toLowerCase();
  if (t === 'grid') return 'Grid';
  if (t === 'dca') return 'DCA';
  if (t === 'rebal') return 'Rebal';
  return type || '전략';
}

function addOptimisticRecentActivity(item) {
  try {
    var el = document.getElementById('dash-recent-logs');
    if (!el) return;
    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    var entry = document.createElement('div');
    entry.className = 'home-log-entry optimistic-log';
    entry.setAttribute('data-created-at', String(Date.now()));
    var color = item.color || 'var(--accent)';
    entry.innerHTML =
      '<span class="home-log-time">' + timeStr + '</span>' +
      '<span class="home-log-text" style="color:var(--text3)">' +
        '<span style="color:#f59e0b;font-weight:600">' + (item.strategyType || '시스템') + '</span> ' +
        (item.symbolText || 'SYSTEM') +
        ' <span style="color:' + color + ';font-weight:600">' + (item.statusKo || '') + '</span>' +
        '<span style="font-size:10px;color:var(--text3);margin-left:4px">(반영대기)</span>' +
      '</span>';
    var empty = el.querySelector('.home-log-entry');
    if (empty && /최근 활동 없음/.test(empty.textContent || '')) {
      el.innerHTML = '';
    }
    if (el.firstChild) el.insertBefore(entry, el.firstChild);
    else el.appendChild(entry);
    var logs = el.querySelectorAll('.home-log-entry');
    for (var i = 20; i < logs.length; i++) {
      if (logs[i] && logs[i].parentNode) logs[i].parentNode.removeChild(logs[i]);
    }
  } catch (e) {
    console.error('addOptimisticRecentActivity error:', e);
  }
}

function cleanupOptimisticRecentActivity(maxAgeMs) {
  try {
    var el = document.getElementById('dash-recent-logs');
    if (!el) return;
    var now = Date.now();
    var rows = el.querySelectorAll('.optimistic-log');
    rows.forEach(function(row) {
      var createdAt = Number(row.getAttribute('data-created-at') || '0');
      if (!createdAt || (now - createdAt) >= (maxAgeMs || 12000)) {
        row.remove();
      }
    });
    if (!el.children.length) {
      el.innerHTML = '<div class="home-log-entry"><span class="home-log-time">--:--</span><span class="home-log-text" style="color:var(--text3)">최근 활동 없음</span></div>';
    }
  } catch (e) {}
}

function fireAndForgetPostStateRefresh(strategyKind) {
  try {
    clearTimeout(window.__gfLightRefreshTimer);
  } catch (e) {}
  window.__gfLightRefreshTimer = setTimeout(function() {
    try { scheduleStrategyRefresh(strategyKind || 'all', 650); } catch (e) {}
  }, 120);
}

function updateEmergencyStopButton() {
  var btn = document.querySelector('.emergency-stop-btn');
  if (!btn) return;
  var active = isEmergencyStopActive();
  btn.classList.toggle('active', active);
  btn.textContent = active ? '긴급정지 해제' : '긴급정지';
  btn.onclick = active ? releaseEmergencyStop : triggerEmergencyStop;
}

async function releaseEmergencyStop() {
  if (!confirm('긴급 정지 활성화를 해제하시겠습니까?')) return;
  setEmergencyStopActive(false);
  addOptimisticRecentActivity({ strategyType:'시스템', symbolText:'SYSTEM', statusKo:'긴급정지 해제', color:'#60a5fa' });
  writeActivitySummary('EMERGENCY_RELEASED', '긴급정지 해제', '시스템');
  if (typeof setGlobalStatus === 'function') {
    setGlobalStatus('info', '긴급정지', '긴급정지 해제 처리 중...');
  } else if (typeof showToast === 'function') {
    showToast('긴급정지 해제 처리 중...');
  }
  fireAndForgetPostStateRefresh('all');
}

async function triggerEmergencyStop() {
  try {
    if (!confirm('긴급정지를 활성화하시겠습니까? 실행 중인 전략은 일시 정지됩니다.')) return;

    setEmergencyStopActive(true);
    addOptimisticRecentActivity({ strategyType:'시스템', symbolText:'SYSTEM', statusKo:'모든 전략 긴급 정지', color:'#ef4444' });
    if (typeof setGlobalStatus === 'function') {
      setGlobalStatus('error', '긴급정지', '모든 전략 긴급 정지 처리 중...');
    }

    var gRes = await authFetch('/grid/strategies');
    var dRes = await authFetch('/dca/strategies');

    var gridList = [];
    var dcaList = [];

    if (gRes && gRes.ok) {
      var gj = await gRes.json();
      gridList = Array.isArray(gj.strategies) ? gj.strategies : [];
    }
    if (dRes && dRes.ok) {
      var dj = await dRes.json();
      dcaList = Array.isArray(dj.strategies) ? dj.strategies : [];
    }

    var activeGrid = gridList.filter(function(s) { return String(s.status || '').toUpperCase() === 'ACTIVE'; });
    var activeDca  = dcaList.filter(function(s) { return String(s.status || '').toUpperCase() === 'ACTIVE'; });

    var totalTargets = activeGrid.length + activeDca.length;
    if (totalTargets === 0) {
      if (typeof setGlobalStatus === 'function') {
        setGlobalStatus('info', '긴급정지', '실행 중 전략 없음 · 이미 정지 상태이거나 조회 실패');
      } else if (typeof showToast === 'function') {
        showToast('실행 중 전략 없음 · 이미 정지 상태이거나 조회 실패');
      } else {
        alert('실행 중 전략 없음 · 이미 정지 상태이거나 조회 실패');
      }
      return;
    }

    var successCount = 0;
    var failCount = 0;
    var failedItems = [];

    for (var i = 0; i < activeGrid.length; i++) {
      var s = activeGrid[i];
      try {
        var r = await authFetch('/grid/strategies/' + s.id + '/pause', { method: 'POST' });
        if (r && r.ok) successCount++;
        else { failCount++; failedItems.push('GRID#' + s.id); }
      } catch (e) {
        failCount++; failedItems.push('GRID#' + s.id);
      }
    }

    for (var j = 0; j < activeDca.length; j++) {
      var ds = activeDca[j];
      try {
        var dr = await authFetch('/dca/strategies/' + ds.id + '/pause', { method: 'POST' });
        if (dr && dr.ok) successCount++;
        else { failCount++; failedItems.push('DCA#' + ds.id); }
      } catch (e) {
        failCount++; failedItems.push('DCA#' + ds.id);
      }
    }

    if (successCount > 0) {
      writeActivitySummary('EMERGENCY_STOP', '긴급정지 활성화', '시스템');
    }

    try { await refreshAfterStrategyStateChange('all'); } catch (e) {}
    fireAndForgetPostStateRefresh('all');

    if (failCount === 0) {
      if (typeof setGlobalStatus === 'function') {
        setGlobalStatus('error', '긴급정지', '모든 전략 긴급 정지 완료 · ' + successCount + '개 전략 정지됨');
      } else if (typeof showToast === 'function') {
        showToast('긴급정지 완료 · ' + successCount + '개 전략 정지됨');
      } else {
        alert('긴급정지 완료 · ' + successCount + '개 전략 정지됨');
      }
    } else {
      var msg = '긴급정지 부분 완료 · ' + successCount + '개 성공 / ' + failCount + '개 실패';
      if (failedItems.length) msg += ' · 실패: ' + failedItems.join(', ');
      if (typeof setGlobalStatus === 'function') {
        setGlobalStatus('error', '긴급정지', msg);
      } else if (typeof showToast === 'function') {
        showToast(msg);
      } else {
        alert(msg);
      }
    }
  } catch (e) {
    console.error('triggerEmergencyStop error:', e);
    if (typeof setGlobalStatus === 'function') {
      setGlobalStatus('error', '긴급정지', '긴급정지 실패 · 서버 응답 확인 필요');
    } else if (typeof showToast === 'function') {
      showToast('긴급정지 실패 · 서버 응답 확인 필요');
    } else {
      alert('긴급정지 실패 · 서버 응답 확인 필요');
    }
  }
}

/* ── 글로벌 배너 업데이트 ── */
// linkCallback: JS 함수 (in-page 이동 등), linkHref: 외부 URL. 둘 다 없으면 링크 숨김.
function updateGlobalBanner(status, label, msg, linkText, linkHref, linkCallback) {
  var banner = document.getElementById('global-status-banner');
  var lbl = document.getElementById('gsb-label');
  var msgEl = document.getElementById('gsb-msg');
  var link = document.getElementById('gsb-link');
  if (!banner) return;
  banner.className = 'global-status-banner status-' + (status || 'normal');
  if (lbl) lbl.textContent = label || '정상 운영 중';
  if (msgEl) msgEl.textContent = msg || '';
  if (link) {
    if (!linkText && !linkHref && !linkCallback) {
      link.style.display = 'none';
    } else {
      link.style.display = '';
      link.textContent = linkText || '상세 보기';
      if (linkCallback) {
        link.href = '#';
        link.onclick = function(e) { e.preventDefault(); linkCallback(); };
      } else {
        link.href = linkHref || '#';
        link.onclick = null;
      }
    }
  }
}

function setGlobalStatus(status, label, msg, linkText, linkHref, linkCallback) {
  updateGlobalBanner(status, label, msg, linkText, linkHref, linkCallback);
}

try {
  window.setGlobalStatus = setGlobalStatus;
} catch (e) {}

try {
  syncEmergencyStopBanner();
} catch (e) {}

function switchExchange(exchange) {
  _exchange = exchange;
  window._exchange = exchange;
  API = exchange === 'upbit' ? '/api' : '/bapi';

  hideAllMainPanels();

  var layout = document.getElementById('main-layout');
  if (layout) layout.style.display = 'grid';

  clearTopTabs();

  // exchange에 따라 올바른 탭 active
  var tabId = exchange === 'bithumb' ? 'tab-bithumb' : 'tab-upbit';
  var tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');

  _symbols = [];
  _selectedSymbol = null;

  var feeEl2 = document.getElementById('fee-info');
  if (feeEl2 && typeof i18n !== 'undefined' && typeof _lang !== 'undefined' && i18n[_lang]) {
    var t = i18n[_lang];
    feeEl2.textContent = exchange === 'upbit' ? t.feeUpbit : t.feeBithumb;
  }

  var selName = document.getElementById('sel-name');
  if (selName) selName.textContent = '코인을 선택하세요';

  var selPrice = document.getElementById('sel-price');
  if (selPrice) selPrice.textContent = '-';

  var selChange = document.getElementById('sel-change');
  if (selChange) selChange.innerHTML = '';

  var selCode = document.getElementById('sel-code');
  if (selCode) selCode.textContent = '';

  var qtyPreview = document.getElementById('qty-preview');
  if (qtyPreview) qtyPreview.textContent = '';

  try { updateExRuleBar(); } catch(e) {}

  updateExchangeSummaryUI(exchange, 0, 0)

  Promise.all([
    typeof fetchSymbols === 'function' ? fetchSymbols() : Promise.resolve(),
    typeof fetchBalances === 'function' ? fetchBalances() : Promise.resolve(),
    typeof fetchOrders === 'function' ? fetchOrders() : Promise.resolve(),
    typeof fetchPositions === 'function' ? fetchPositions() : Promise.resolve()
  ]).then(function() {
    if (typeof refreshGlobalTopStats === 'function') refreshGlobalTopStats();
    if (window._pendingPortfolioSymbol) {
      var _sym = window._pendingPortfolioSymbol;
      window._pendingPortfolioSymbol = null;
      if (typeof selectSymbolByMarket === 'function') selectSymbolByMarket(_sym);
    }
  }).catch(function(e) {
    console.warn('[switchExchange] 무시:', e.message);
  });
}

function switchGrid() {
  hideAllMainPanels();

  var panel = document.getElementById('grid-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();

  var tab = document.getElementById('tab-grid');
  if (tab) tab.classList.add('active');

  if (typeof fetchGridStrategies === 'function') fetchGridStrategies();
  if (typeof fetchDCAStrategies === 'function') fetchDCAStrategies();
}

function switchLogs() {
  hideAllMainPanels();
  var panel = document.getElementById('grid-panel');
  if (panel) panel.style.display = 'block';
  clearTopTabs();
  var tab = document.getElementById('tab-grid');
  if (tab) tab.classList.add('active');
  // 서브패널: grid/dca/rebal/backtest 숨기고 logs만 표시
  ['grid','dca','rebal','backtest'].forEach(function(t) {
    var p = document.getElementById('subpanel-' + t);
    if (p) p.style.display = 'none';
  });
  // 서브탭 활성 상태 초기화
  ['subtab-grid','subtab-dca','subtab-rebal'].forEach(function(id) {
    var b = document.getElementById(id);
    if (b) { b.style.background='transparent'; b.style.color='rgba(255,255,255,0.34)'; b.style.borderBottom='none'; }
  });
  var logsPanel = document.getElementById('subpanel-logs');
  if (logsPanel) logsPanel.style.display = 'block';
  if (typeof fetchStrategyLogs === 'function') fetchStrategyLogs();
}

function switchStrategy() {
  if (document.getElementById('strategy-panel')) {
    hideAllMainPanels();

    var panel = document.getElementById('strategy-panel');
    if (panel) panel.style.display = 'block';

    clearTopTabs();

    var tab = document.getElementById('tab-strategy');
    if (tab) tab.classList.add('active');
    return;
  }

  switchGrid();
}

function switchPortfolio() {
  hideAllMainPanels();

  var panel = document.getElementById('portfolio-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();

  var tab = document.getElementById('tab-portfolio');
  if (tab) tab.classList.add('active');

  if (typeof fetchPortfolioDetail === 'function') fetchPortfolioDetail();
}

function switchSettings() {
  hideAllMainPanels();

  var panel = document.getElementById('settings-panel');
  if (panel) panel.style.display = 'block';

  clearTopTabs();

  var tab = document.getElementById('tab-settings');
  if (tab) tab.classList.add('active');

  if (typeof fetchStatus === 'function') fetchStatus();
  if (typeof fetchCurrentKeys === 'function') fetchCurrentKeys();

  // 우측 카드: 계정 정보 + 활성 전략 수
  var cu = window._currentUser || (typeof _currentUser !== 'undefined' ? _currentUser : null)
  var userEl = document.getElementById('set-current-user')
  if (userEl) userEl.textContent = cu ? (cu.username || '-') : '-'
  var roleEl = document.getElementById('set-user-role')
  if (roleEl && cu) { roleEl.textContent = cu.is_admin ? '관리자' : '일반'; roleEl.style.color = cu.is_admin ? '#F59E0B' : '#9CA3AF' }
  var stratEl = document.getElementById('set-active-strategies')
  if (stratEl) { var _sc = (window._strategies||[]).filter(function(s){ return s.status==='ACTIVE' }).length; stratEl.textContent = _sc + '개' }
}

function switchAdmin() {
  if (!_currentUser || !_currentUser.is_admin) return;
  hideAllMainPanels();
  var panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'block';
  clearTopTabs();
  var tab = document.getElementById('tab-admin');
  if (tab) tab.classList.add('active');
  fetchUsers();
}

// ── 관리자: 사용자 목록 ─────────────────────────────────────────────────────
var _adminUserData = [];

async function fetchUsers() {
  var tbody = document.getElementById('admin-user-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="padding:32px;text-align:center;color:#4B5563">로드 중...</td></tr>';
  var r = await authFetch('/auth/users');
  if (!r) return;
  var d = await r.json();
  if (!d || !d.users) return;
  _adminUserData = d.users;
  var statTotal = document.getElementById('admin-stat-total');
  var statActive = document.getElementById('admin-stat-active');
  var statDry = document.getElementById('admin-stat-dry');
  if (statTotal) statTotal.textContent = d.users.length;
  if (statActive) statActive.textContent = d.users.filter(function(u){return u.is_active}).length;
  if (statDry) statDry.textContent = d.users.filter(function(u){return u.is_dry_run}).length;
  adminFilterUsers();
}

function adminFilterUsers() {
  if (!_adminUserData.length) return;
  var search = ((document.getElementById('admin-user-search') || {}).value || '').toLowerCase();
  var filter = ((document.getElementById('admin-user-filter') || {}).value) || 'all';
  var users = _adminUserData.filter(function(u) {
    if (search && !u.username.toLowerCase().includes(search)) return false;
    if (filter === 'active' && !u.is_active) return false;
    if (filter === 'inactive' && u.is_active) return false;
    if (filter === 'dry' && !u.is_dry_run) return false;
    return true;
  });
  var tbody = document.getElementById('admin-user-table-body');
  if (!tbody) return;
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="padding:32px;text-align:center;color:#4B5563">검색 결과가 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(function(u) {
    var statusClass = u.is_active ? 'user-active' : 'user-inactive';
    var statusText = u.is_active ? '활성' : '비활성';
    var roleColor = u.is_admin ? '#F59E0B' : '#9CA3AF';
    var roleText = u.is_admin ? '관리자' : '일반';
    var dryText = u.is_dry_run ? '샌드박스' : '실매매';
    var createdAt = u.created_at ? String(u.created_at).split('T')[0] : '-';
    var lastLogin = u.last_login_at ? String(u.last_login_at).split('T')[0] : '-';
    var actions = '';
    if (u.is_active) actions += '<button class="btn-warn" onclick="adminDeactivate(' + u.id + ')">비활성화</button> ';
    if (!u.is_admin) actions += '<button class="btn-danger" onclick="adminDeleteUser(' + u.id + ')">삭제</button>';
    return '<tr>' +
      '<td>' + u.id + '</td>' +
      '<td style="font-weight:600">' + u.username + '</td>' +
      '<td><span class="' + statusClass + '">' + statusText + '</span></td>' +
      '<td>' + createdAt + '</td>' +
      '<td>' + lastLogin + '</td>' +
      '<td style="color:#4B5563">-</td>' +
      '<td>' + dryText + '</td>' +
      '<td style="color:' + roleColor + ';font-weight:600">' + roleText + '</td>' +
      '<td>' + actions + '</td>' +
    '</tr>';
  }).join('');
}

async function addUser() {
  var unameEl = document.getElementById('admin-new-username');
  var pwEl = document.getElementById('admin-new-password');
  var msgEl = document.getElementById('admin-panel-msg');
  var uname = (unameEl ? unameEl.value : '').trim();
  var pw = pwEl ? pwEl.value : '';
  if (!uname || !pw) { if (msgEl) { msgEl.style.color='#f87171'; msgEl.textContent='아이디와 비밀번호를 입력하세요'; } return; }
  var r = await authFetch('/auth/users', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username: uname, password: pw, is_admin: false})
  });
  if (!r) return;
  var d = await r.json();
  if (r.ok) {
    if (msgEl) { msgEl.style.color='#4ade80'; msgEl.textContent='✅ 유저 생성 완료: ' + uname; }
    if (unameEl) unameEl.value = '';
    if (pwEl) pwEl.value = '';
    fetchUsers();
  } else {
    if (msgEl) { msgEl.style.color='#f87171'; msgEl.textContent = d.detail || '생성 실패'; }
  }
}

async function adminDeleteUser(userId) {
  if (!confirm('이 계정을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
  var r = await authFetch('/auth/users/' + userId, {method: 'DELETE'});
  if (r && r.ok) { if (typeof showToast === 'function') showToast('삭제 완료'); fetchUsers(); }
  else { if (typeof showToast === 'function') showToast('삭제 실패'); }
}

async function adminDeactivate(userId) {
  if (!confirm('이 계정을 비활성화하시겠습니까?')) return;
  var r = await authFetch('/auth/users/' + userId + '/deactivate', {method: 'POST'});
  if (r && r.ok) { if (typeof showToast === 'function') showToast('비활성화 완료'); fetchUsers(); }
  else { if (typeof showToast === 'function') showToast('비활성화 실패'); }
}

// ── 리밸런싱 전략 생성 제출 ────────────────────────────────────────────────
async function submitCreateRebal() {
  var msgEl = document.getElementById('rebal-create-msg');
  var submitBtn = document.getElementById('rebal-submit-btn');
  var errors = (typeof validateRebalForm === 'function') ? validateRebalForm() : [];
  if (errors.length > 0) {
    if (msgEl) { msgEl.style.color='#f87171'; msgEl.textContent = errors[0]; }
    return;
  }
  var nameVal = ((document.getElementById('rebal-name') || {}).value) || '내 포트폴리오';
  var exchangeVal = ((document.getElementById('rebal-exchange') || {}).value) || 'upbit';
  var trigger = ((document.getElementById('rebal-trigger') || {}).value) || 'INTERVAL';
  var intervalEl = document.getElementById('rebal-interval-select');
  var interval = parseFloat(intervalEl ? (intervalEl.value === 'custom' ? (document.getElementById('rebal-interval') || {}).value : intervalEl.value) : 24) || 24;
  var minOrder = parseFloat(((document.getElementById('rebal-min-order') || {}).value)) || 10000;
  var maxAdjustPct = parseFloat(((document.getElementById('rebal-max-adjust-pct') || {}).value)) || 25;
  var assetMax = parseFloat(((document.getElementById('rebal-asset-max') || {}).value)) || 80;
  var assetMin = parseFloat(((document.getElementById('rebal-asset-min') || {}).value)) || 5;
  var dailyCount = parseInt(((document.getElementById('rebal-daily-count') || {}).value)) || 10;
  var body = {
    exchange: exchangeVal,
    name: nameVal,
    trigger_type: trigger,
    interval_hours: interval,
    threshold_pct: _rebalThreshold,
    assets: _rebalAssets.map(function(a) { return {symbol: a.symbol, target_pct: a.target_pct}; }),
    rebal_method: _rebalMethod,
    min_order_krw: minOrder,
    max_adjust_pct: maxAdjustPct,
    asset_max_pct: assetMax,
    asset_min_pct: assetMin,
    daily_max_count: dailyCount
  };
  if (_currentUser && !_currentUser.is_dry_run) {
    if (!confirm('⚠️ 실제 계좌로 리밸런싱 전략을 시작합니다. 계속할까요?')) return;
  }
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '처리 중...'; submitBtn.style.cursor='not-allowed'; }
  if (msgEl) msgEl.textContent = '';
  var r = await authFetch('/rebalancing/strategies', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if (!r) {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '전략 시작'; if (typeof updateRebalSummary === 'function') updateRebalSummary(); }
    return;
  }
  var d = await r.json();
  if (r.ok) {
    if (msgEl) { msgEl.style.color='#4ade80'; msgEl.textContent='✅ 리밸런싱 전략 시작! ID: ' + d.strategy_id; }
    setTimeout(function() { if (typeof closeCreateRebal==='function') closeCreateRebal(); if (typeof fetchRebalStrategies==='function') fetchRebalStrategies(); }, 1500);
  } else {
    if (msgEl) { msgEl.style.color='#f87171'; msgEl.textContent = d.detail || '생성 실패'; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '전략 시작'; if (typeof updateRebalSummary === 'function') updateRebalSummary(); }
  }
}

async function init() {
  if (!window._currentUser && typeof _currentUser !== 'undefined' && _currentUser) {
    window._currentUser = _currentUser;
  }
  if (!window._currentUser && typeof checkAuth === 'function') {
    try {
      await checkAuth();
    } catch (e) {}
  }
  if (!window._currentUser && (typeof _currentUser === 'undefined' || !_currentUser)) return;

  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
    var themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.textContent = '☀️';
  }

  if (typeof _lang !== 'undefined') {
    document.body.classList.toggle('lang-ko', _lang === 'ko');
  }
  if (typeof applyLang === 'function') {
    applyLang();
  }

  switchHome();

  Promise.all([
    typeof fetchBalances === 'function' ? fetchBalances() : Promise.resolve(),
    typeof fetchSymbols === 'function' ? fetchSymbols() : Promise.resolve(),
    typeof fetchOrders === 'function' ? fetchOrders() : Promise.resolve(),
    typeof fetchPositions === 'function' ? fetchPositions() : Promise.resolve()
  ]).catch(function (e) {
    console.error('init data load failed:', e);
  });
}

window.switchHome = switchHome
window.switchExchange = switchExchange
window.switchGrid = switchGrid
window.switchStrategy = switchStrategy
window.switchPortfolio = switchPortfolio
window.switchSettings = switchSettings
window.init = init

/* ── 거래화면: 전략 연결 배지 ── */
function updateStrategyConnBadge(market) {
  var el = document.getElementById('tv-strategy-conn')
  var subEl = document.getElementById('tv-strategy-subtext')
  if (!el) return
  var strats = Array.isArray(window._strategies) ? window._strategies : []
  var active = strats.find(function(s) {
    return (s.symbol === market || ('KRW-' + (s.base_currency||'')) === market) &&
           (s.status === 'ACTIVE' || s.status === 'PAUSED')
  })
  if (active) {
    var isPaused = active.status === 'PAUSED'
    var stratName = active.name || ((active._type||'전략') + ' #' + active.id)
    el.innerHTML = (isPaused ? '⏸ ' : '● ') + stratName + (isPaused ? ' 일시정지' : ' 실행 중')
    el.className = 'strategy-conn-badge ' + (isPaused ? 'paused' : 'connected')
    // 마지막 실행 서브텍스트
    if (subEl && active.last_executed_at) {
      var mins = Math.floor((Date.now() - new Date(active.last_executed_at).getTime()) / 60000)
      subEl.textContent = '최근 자동 실행 ' + mins + '분 전'
      subEl.style.display = ''
    } else if (subEl) { subEl.style.display = 'none' }
  } else {
    el.innerHTML = '○ 수동 매매'
    el.className = 'strategy-conn-badge manual'
    if (subEl) { subEl.textContent = '전략 미연결'; subEl.style.display = ''; }
  }
}
window.updateStrategyConnBadge = updateStrategyConnBadge

/* ── 거래화면: 거래소 룰바 업데이트 ── */
function updateExRuleBar() {
  var ex = (typeof _exchange !== 'undefined' && _exchange) ? _exchange : 'upbit'
  var feeEl = document.getElementById('ex-fee-lbl')
  var minEl = document.getElementById('ex-min-order-lbl')
  var dotEl = document.getElementById('ex-api-dot')
  var stsEl = document.getElementById('ex-api-status-lbl')
  if (feeEl) feeEl.textContent = ex === 'bithumb' ? '0.04%' : '0.05%'
  if (minEl) minEl.textContent = ex === 'bithumb' ? '5,500 KRW' : '5,500 KRW'
  if (dotEl) { dotEl.className = 'ex-api-dot ok'; }
  if (stsEl) stsEl.textContent = 'API 정상'
  // [2-5] 거래소 운영 정보 바 업데이트
  var responseBadge = document.getElementById('ex-response-badge')
  var orderPerm = document.getElementById('ex-order-perm')
  var syncTime = document.getElementById('ex-sync-time')
  if (responseBadge) { responseBadge.textContent = '응답 정상'; responseBadge.className = 'ex-info-badge ok'; }
  if (orderPerm) { orderPerm.textContent = '가능'; }
  if (syncTime) {
    var now = new Date()
    syncTime.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0')
  }
}
window.updateExRuleBar = updateExRuleBar

/* ── 거래화면: 주문 전 요약 박스 ── */
function updatePreTradeSummary() {
  var box = document.getElementById('pretrade-box')
  var ptAmt = document.getElementById('pt-order-amt')
  var ptFee = document.getElementById('pt-fee')
  var ptBal = document.getElementById('pt-after-bal')
  var ptMin = document.getElementById('pt-min-ok')
  var ptWarn = document.getElementById('pt-warn-msg')
  if (!box || !ptAmt) return

  var ex = (typeof _exchange !== 'undefined' && _exchange) ? _exchange : 'upbit'
  var feeRate = ex === 'bithumb' ? 0.0004 : 0.0005
  var minOrder = ex === 'bithumb' ? 5500 : 5500
  var side = (typeof window._orderSide !== 'undefined' ? window._orderSide : null) ||
             (document.getElementById('side-tab-sell') && document.getElementById('side-tab-sell').classList.contains('active') ? 'SELL' : 'BUY')

  // 금액 결정 (지정가 / 시장가)
  var isMarket = (typeof _currentTab !== 'undefined' && _currentTab === 'market')
  var rawAmt = 0
  if (isMarket) {
    rawAmt = parseFloat((document.getElementById('market-amount') || {}).value) || 0
  } else {
    rawAmt = parseFloat((document.getElementById('amount') || {}).value) || 0
  }

  // KRW 잔고
  var krwEl = document.getElementById('krw-balance')
  var krw = (krwEl && krwEl.dataset && krwEl.dataset.selectedKrw) ? parseFloat(krwEl.dataset.selectedKrw) : 0

  var fee = rawAmt > 0 ? Math.ceil(rawAmt * feeRate) : 0
  var afterBal = side === 'BUY' ? (krw - rawAmt - fee) : (krw + rawAmt - fee)
  var isOk = rawAmt >= minOrder

  function fmtW(n) { return Math.floor(n).toLocaleString('ko-KR') + '원' }

  if (rawAmt > 0) {
    ptAmt.textContent = fmtW(rawAmt)
    ptFee.textContent = '≈ ' + fmtW(fee) + ' (' + (feeRate * 100).toFixed(2) + '%)'
    ptBal.textContent = fmtW(Math.max(0, afterBal))
    ptBal.className = 'pt-val' + (afterBal < 0 ? ' err' : '')
  } else {
    ptAmt.textContent = '-'; ptFee.textContent = '-'; ptBal.textContent = '-'
    ptBal.className = 'pt-val'
  }

  // [2-4] 최소 주문 충족 여부 + 버튼 비활성화
  var submitBtns = [
    document.getElementById('market-buy-btn'),
    document.getElementById('market-sell-btn'),
    document.getElementById('limit-buy-btn'),
    document.getElementById('limit-sell-btn')
  ]
  function setSubmitBtnState(disabled) {
    submitBtns.forEach(function(btn) {
      if (!btn) return
      btn.disabled = disabled
      btn.style.opacity = disabled ? '0.45' : ''
      btn.style.cursor = disabled ? 'not-allowed' : ''
    })
  }
  if (rawAmt > 0 && !isOk) {
    ptMin.textContent = '미충족 (최소 ' + minOrder.toLocaleString('ko-KR') + '원)'
    ptMin.className = 'pt-val err'
    box.classList.add('warn')
    if (ptWarn) { ptWarn.textContent = '⚠ 최소 주문금액 미달 — ' + minOrder.toLocaleString('ko-KR') + '원 이상 입력하세요'; ptWarn.style.display = '' }
    setSubmitBtnState(true)
  } else if (rawAmt > 0) {
    ptMin.textContent = '충족'
    ptMin.className = 'pt-val ok'
    box.classList.remove('warn')
    if (ptWarn) ptWarn.style.display = 'none'
    setSubmitBtnState(false)
  } else {
    ptMin.textContent = '-'; ptMin.className = 'pt-val'
    box.classList.remove('warn')
    if (ptWarn) ptWarn.style.display = 'none'
    setSubmitBtnState(false)
  }
}
window.updatePreTradeSummary = updatePreTradeSummary

window.addEventListener('DOMContentLoaded', async function () {
  if (typeof window.checkAuth === 'function') {
    const authed = await window.checkAuth();
    if (authed) {
      await window.init();
    }
  } else {
    await init();
  }
});

setInterval(function () {
  if (!(window._currentUser || (typeof _currentUser !== 'undefined' && _currentUser))) return;
  if (typeof fetchBalances === 'function') fetchBalances();
  if (typeof fetchOrders === 'function') fetchOrders();
  if (typeof fetchPositions === 'function') fetchPositions();
}, 10000);

setInterval(function () {
  if (!(window._currentUser || (typeof _currentUser !== 'undefined' && _currentUser))) return;
  var layout = document.getElementById('main-layout');
  if (layout && layout.style.display !== 'none') {
    if (typeof fetchSymbols === 'function') fetchSymbols();
  }
}, 30000);

/* === TRADE SUMMARY ONLY START === */
async function refreshTradeSummary() {
  try {
    var currentExchange = (typeof _exchange !== 'undefined' && _exchange) || window._exchange || 'upbit';
    var api = currentExchange === 'bithumb' ? '/bapi' : '/api';
    var balResp = await authFetch(api + '/balances');
    var posResp = await authFetch(api + '/positions');

    var bal = balResp && balResp.ok ? await balResp.json() : {};
    var pos = posResp && posResp.ok ? await posResp.json() : {};

    var krw = Math.floor((bal && bal.krw_available) || 0);
    var positions = (pos && pos.positions) ? pos.positions : [];
    var evalAmount = positions.reduce(function(sum, p){ return sum + (p.eval_amount || 0); }, 0);
    var investAmount = positions.reduce(function(sum, p){ return sum + (p.invest_amount || 0); }, 0);
    var total = Math.floor(krw + evalAmount);

    var exName = currentExchange === 'bithumb' ? '빗썸' : '업비트';

    var titleEl = document.getElementById('trade-summary-title');
    var subEl = document.getElementById('trade-summary-sub');
    var totalEl = document.getElementById('trade-summary-total');
    var krwEl = document.getElementById('trade-summary-krw');
    var investEl = document.getElementById('trade-summary-invest');

    if (titleEl) titleEl.textContent = exName + ' 계좌 요약';
    if (subEl) subEl.textContent = exName + ' 기준 수동 매매용 가용 정보';
    if (totalEl) totalEl.textContent = Number(total).toLocaleString('ko-KR') + (_lang === 'ko' ? '원' : ' KRW');
    if (krwEl) krwEl.textContent = Number(krw).toLocaleString('ko-KR') + (_lang === 'ko' ? '원' : ' KRW');
    if (investEl) investEl.textContent = Number(Math.floor(investAmount)).toLocaleString('ko-KR') + (_lang === 'ko' ? '원' : ' KRW');
  } catch (e) {
    console.error('[TRADE-SUMMARY] refresh failed:', e);
  }
}

(function(){
  if (window.__tradeSummaryOnlyLoaded) return;
  window.__tradeSummaryOnlyLoaded = true;

  var oldSwitchExchange = window.switchExchange;
  if (typeof oldSwitchExchange === 'function') {
    window.switchExchange = function(exchange) {
      var out = oldSwitchExchange.apply(this, arguments);
      return out;
    };
  }

  var oldFetchBalances = window.fetchBalances;
  if (typeof oldFetchBalances === 'function') {
    window.fetchBalances = async function() {
      return await oldFetchBalances.apply(this, arguments);
    };
  }

  var oldFetchPositions = window.fetchPositions;
  if (typeof oldFetchPositions === 'function') {
    window.fetchPositions = async function() {
      return await oldFetchPositions.apply(this, arguments);
    };
  }

})();
/* === TRADE SUMMARY ONLY END === */


/* GridFlow v24 */
(function(){
function gfMark(tab){
  document.querySelectorAll('.gn-btn').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-tab')===tab);
  });
}
window.gfGo = function(tab){
  /* 모든 패널 숨기기 */
  var panels = ['home-panel','grid-panel','portfolio-panel','settings-panel'];
  panels.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
  document.querySelectorAll('.settings-panel').forEach(function(el){
    el.style.display = 'none';
  });
  var layout = document.getElementById('main-layout');
  if(layout) layout.style.display = 'none';

  /* 해당 탭 실행 */
  if(tab==='home'){
    if(typeof switchHome==='function') switchHome();
    /* switchHome이 home-panel을 켜줌 */
  } else if(tab==='upbit'){
    if(typeof switchExchange==='function') switchExchange('upbit');
  } else if(tab==='bithumb'){
    if(typeof switchExchange==='function') switchExchange('bithumb');
  } else if(tab==='grid'){
    if(typeof switchGrid==='function') switchGrid();
  } else if(tab==='portfolio'){
    if(typeof switchPortfolio==='function') switchPortfolio();
  }
  gfMark(tab);

  /* 네비바에 안 가려지게 패딩 */
  setTimeout(function(){
    ['home-panel','grid-panel','portfolio-panel','settings-panel'].forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.style.display !== 'none') el.style.paddingBottom = '80px';
    });
    var ml = document.getElementById('main-layout');
    if(ml && ml.style.display !== 'none') ml.style.paddingBottom = '80px';
  }, 50);
};

window.gfThemeSync = function(){
  var dark = !document.body.classList.contains('light');
  var i = document.getElementById('gf-ti'), l = document.getElementById('gf-tl');
  if(i) i.textContent = dark ? '☀️' : '🌙';
  if(l) l.textContent = dark ? '라이트 모드' : '다크 모드';
};
window.gfHamburger = function(e){
  if(e) e.stopPropagation();
  var d = document.getElementById('gf-drawer');
  var o = document.getElementById('gf-overlay');
  if(!d) return;
  /* 유저명 갱신 */
  var s = document.getElementById('login-user-label');
  var u = document.getElementById('gf-uname');
  if(u && s && s.textContent.trim()) u.textContent = s.textContent.trim();
  window.gfThemeSync();
  d.classList.toggle('on');
  if(o) o.classList.toggle('on');
};
window.gfClose = function(){
  var d = document.getElementById('gf-drawer');
  var o = document.getElementById('gf-overlay');
  if(d) d.classList.remove('on');
  if(o) o.classList.remove('on');
};

/* 초기화: 홈 active */
function init(){
  gfMark('home');
  window.gfThemeSync();
  setTimeout(function(){
    var s = document.getElementById('login-user-label');
    var u = document.getElementById('gf-uname');
    if(u && s && s.textContent.trim()) u.textContent = s.textContent.trim();
  }, 1500);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }
})();

/* ── 리밸런싱 버튼 핸들러 ── */
async function pauseRebal(id) {
  var r = await authFetch('/rebalancing/strategies/'+id+'/pause', {method:'POST'})
  if (r && r.ok) { showToast('⏸ 리밸런싱 일시정지'); if(typeof fetchRebalStrategies==='function') fetchRebalStrategies() }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'일시정지 실패')) }
}
async function resumeRebal(id) {
  var r = await authFetch('/rebalancing/strategies/'+id+'/resume', {method:'POST'})
  if (r && r.ok) { showToast('▶ 리밸런싱 재개'); if(typeof fetchRebalStrategies==='function') fetchRebalStrategies() }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'재개 실패')) }
}
async function stopRebal(id) {
  if (!confirm('리밸런싱 전략을 종료할까요?')) return
  var r = await authFetch('/rebalancing/strategies/'+id, {method:'DELETE'})
  if (r && r.ok) { showToast('⏹ 전략 종료'); if(typeof fetchRebalStrategies==='function') fetchRebalStrategies() }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'종료 실패')) }
}
async function deleteRebal(id) {
  if (!confirm('리밸런싱 전략을 완전히 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return
  var stopR = await authFetch('/rebalancing/strategies/'+id, {method:'DELETE'})
  if (stopR && !stopR.ok) {
    var sd = await stopR.json().catch(function(){return{}})
    var msg = sd.detail || ''
    if (msg !== '전략을 찾을 수 없습니다' && msg !== 'Strategy not found') {
      showToast('❌ 종료 실패: ' + (msg || '알 수 없는 오류'))
      return
    }
  }
  var r = await authFetch('/rebalancing/strategies/'+id+'/delete', {method:'DELETE'})
  if (r && r.ok) { showToast('🗑 전략 삭제 완료'); if(typeof fetchRebalStrategies==='function') fetchRebalStrategies() }
  else if (r) { var d=await r.json().catch(function(){return{}}); showToast('❌ '+(d.detail||'삭제 실패')) }
}
async function rebalNow(id) {
  if (!confirm('지금 즉시 리밸런싱을 실행할까요?')) return
  var r = await authFetch('/rebalancing/strategies/'+id+'/rebalance-now', {method:'POST'})
  if (r && r.ok) { showToast('🔄 즉시 리밸런싱 실행됨'); if(typeof fetchRebalStrategies==='function') fetchRebalStrategies() }
  else if (r) { var d=await r.json(); showToast('❌ '+(d.detail||'즉시실행 실패')) }
}
