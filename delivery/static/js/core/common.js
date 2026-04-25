// ── API 요청 공통 헤더 ─────────────────────────────

function statusKo(s){var m={'PLANNED':'대기중','QUEUED':'제출준비','SUBMITTED':'제출완료','ACTIVE':'미체결','PARTIALLY_FILLED':'부분체결','FILLED':'체결완료','CANCELLED':'취소됨','FAILED':'실패','UNKNOWN':'확인중'};return m[s]||s;}
function sideKo(s){return s==='BUY'?'매수':s==='SELL'?'매도':s;}
let API = '/api'
let _lang = localStorage.getItem('lang') || 'ko'
let _exchange = 'upbit'
let _symbols = []
let _koreanMap = {}
let _selectedSymbol = null
let _currentTab = 'limit'

function showToast(msg) {
  const el = document.getElementById('toast-popup')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._timer)
  el._timer = setTimeout(() => el.classList.remove('show'), 1800)
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
