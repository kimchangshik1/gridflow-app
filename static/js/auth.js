// GridFlow auth.js — login/session isolated module
(function() {
  'use strict';

  var USERNAME_KEY = 'saved_username';
  var REMEMBER_MARKER_KEY = 'gridflow_auth_remember_marker';
  var SESSION_MARKER_KEY = 'gridflow_auth_session_marker';
  var STATE_CHANGE_HEADER_NAME = 'X-GridFlow-State-Change';
  var STATE_CHANGE_HEADER_VALUE = '1';
  window.__authClientStateVersion = Number(window.__authClientStateVersion || 0);
  window.__authCurrentIdentityKey = window.__authCurrentIdentityKey || '';
  window.__authLogoutRequest = window.__authLogoutRequest || null;

  function readStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeStorage(storage, key) {
    try {
      storage.removeItem(key);
    } catch (e) {}
  }

  function parseMarker(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function buildMarker(username, mode) {
    return JSON.stringify({
      username: username || '',
      mode: mode,
      created_at: new Date().toISOString()
    });
  }

  function buildIdentityKey(user) {
    if (!user) return '';
    var userId = user.user_id != null ? user.user_id : user.id != null ? user.id : '';
    return [
      String(userId),
      String(user.username || ''),
      user.is_admin ? 'admin' : 'user',
      user.is_guest ? 'guest' : 'member',
      user.is_dry_run ? 'dry' : 'live'
    ].join('|');
  }

  function bumpClientStateVersion() {
    window.__authClientStateVersion = Number(window.__authClientStateVersion || 0) + 1;
    return window.__authClientStateVersion;
  }

  function getClientAuthContext() {
    return {
      version: Number(window.__authClientStateVersion || 0),
      identityKey: String(window.__authCurrentIdentityKey || '')
    };
  }

  function isStaleClientAuthContext(context) {
    if (!context) return true;
    var current = getClientAuthContext();
    return current.version !== Number(context.version || 0) || current.identityKey !== String(context.identityKey || '');
  }

  window.__authGetClientContext = getClientAuthContext;
  window.__authIsStaleClientContext = isStaleClientAuthContext;

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function hideElement(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function clearStrategyUiState() {
    window._strategies = [];
    window._dcaStrategyCache = {};
    window._rebalStrategyCache = {};

    if (typeof window.__strategyDeepLinkCancelRetry === 'function') {
      window.__strategyDeepLinkCancelRetry();
    }
    if (typeof window.__strategyDeepLinkClearHighlight === 'function' && window.__strategyDeepLinkState && window.__strategyDeepLinkState.activeCard) {
      window.__strategyDeepLinkClearHighlight(window.__strategyDeepLinkState.activeCard);
    }
    if (window.__strategyDeepLinkState) {
      if (window.__strategyDeepLinkState.highlightTimer) {
        clearTimeout(window.__strategyDeepLinkState.highlightTimer);
        window.__strategyDeepLinkState.highlightTimer = 0;
      }
      window.__strategyDeepLinkState.pending = null;
      window.__strategyDeepLinkState.pendingRetryFrame = 0;
      window.__strategyDeepLinkState.activeCard = null;
    }

    setHtml('grid-strategy-list', '');
    setHtml('dca-strategy-list', '');
    setHtml('rebal-strategy-list', '');
  }

  function clearSettingsUiState() {
    setText('bot-status', '-');
    setText('cur-upbit-access', '-');
    setText('cur-upbit-secret', '-');
    setText('cur-bithumb-access', '-');
    setText('cur-bithumb-secret', '-');
    setText('set-current-user', '-');
    setText('set-user-role', '-');
    setText('set-active-strategies', '-');
  }

  function clearAdminUiState() {
    window._adminUserData = [];
    setHtml('admin-user-table-body', '');
    setText('admin-panel-msg', '');
    setText('admin-stat-total', '-');
    setText('admin-stat-active', '-');
    setText('admin-stat-api', '-');
    setText('admin-stat-recent', '-');
    setText('admin-stat-dry', '-');
  }

  function resetClientUserState(reason) {
    bumpClientStateVersion();
    window.__authCurrentIdentityKey = '';
    window._currentUser = null;
    window.isGuest = false;
    window.__guestState = null;
    if (typeof _currentUser !== 'undefined') {
      _currentUser = null;
    }

    if (typeof window._clearGuestExpireTimer === 'function') {
      window._clearGuestExpireTimer();
    }

    clearStrategyUiState();
    clearSettingsUiState();
    clearAdminUiState();

    hideElement('guest-banner');
    setText('login-user-label', '');
    setText('gf-uname', '-');
    setText('login-err', '');

    if (typeof window.gfClose === 'function') {
      window.gfClose();
    }
    if (typeof window.__homeResetDashboardState === 'function') {
      window.__homeResetDashboardState(reason || 'identity-reset');
    }
    if (typeof window.syncGuestHomeBanner === 'function') {
      window.syncGuestHomeBanner();
    }
    if (typeof applyAdminTabVisibility === 'function') {
      applyAdminTabVisibility();
    }
    if (typeof applyInlineAuthUi === 'function') {
      applyInlineAuthUi();
    }
  }

  window.__resetClientUserState = resetClientUserState;

  async function awaitLogoutRequestIfNeeded() {
    if (!window.__authLogoutRequest) return;
    try {
      await window.__authLogoutRequest;
    } catch (e) {}
  }

  function clearLoginPersistenceMarkers() {
    removeStorage(window.localStorage, REMEMBER_MARKER_KEY);
    removeStorage(window.sessionStorage, SESSION_MARKER_KEY);
  }

  function persistLoginPersistence(username, rememberMe) {
    var markerValue = buildMarker(username, 'remember');
    if (rememberMe) {
      writeStorage(window.localStorage, REMEMBER_MARKER_KEY, markerValue);
      removeStorage(window.sessionStorage, SESSION_MARKER_KEY);
      return;
    }
    clearLoginPersistenceMarkers();
  }

  function markerMatchesUser(marker, user) {
    if (!marker) return false;
    if (!user || !user.username) return true;
    if (!marker.username) return false;
    return marker.username === user.username;
  }

  function isBootstrapLoginAllowed(user) {
    if (!user || user.is_guest) return true;
    var rememberMarker = parseMarker(readStorage(window.localStorage, REMEMBER_MARKER_KEY));
    if (markerMatchesUser(rememberMarker, user)) return true;
    return false;
  }

  async function rejectUnexpectedRestoredSession(user) {
    if (isBootstrapLoginAllowed(user)) return false;
    clearLoginPersistenceMarkers();
    syncGuestClientState(null);
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildStateChangeHeaders({}, 'POST')
      });
    } catch (e) {
      console.warn('[AUTH] restored session logout 오류:', e);
    }
    window.showLogin();
    if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
    return true;
  }

  function isStateChangeMethod(method) {
    var normalized = (method || 'GET').toUpperCase();
    return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
  }

  function buildStateChangeHeaders(existingHeaders, method) {
    var headers = Object.assign({}, existingHeaders || {});
    if (isStateChangeMethod(method)) {
      headers[STATE_CHANGE_HEADER_NAME] = STATE_CHANGE_HEADER_VALUE;
    }
    return headers;
  }
  window.buildStateChangeHeaders = buildStateChangeHeaders;

  function syncGuestClientState(user) {
    var nextIdentityKey = buildIdentityKey(user);
    var prevIdentityKey = window.__authCurrentIdentityKey || '';
    if (prevIdentityKey !== nextIdentityKey) {
      resetClientUserState('identity-change');
    }
    window.__authCurrentIdentityKey = nextIdentityKey;
    window._currentUser = user || null;
    window.isGuest = !!(user && user.is_guest);
    if (window.isGuest) {
      if (typeof window._scheduleGuestExpiry === 'function') {
        window._scheduleGuestExpiry(user.expires_at);
      }
    } else {
      if (typeof window._clearGuestExpireTimer === 'function') {
        window._clearGuestExpireTimer();
      }
      if (window.__guestState) window.__guestState = null;
    }
    if (typeof window.syncGuestHomeBanner === 'function') {
      window.syncGuestHomeBanner();
    }
  }

  window._currentUser = null;
  window.isGuest = window.isGuest || false;

  window.syncInlineAuthState = function syncInlineAuthState() {
    _currentUser = window._currentUser || null;
    window.isGuest = !!(_currentUser && _currentUser.is_guest);
  };

  window.applyInlineAuthUi = function applyInlineAuthUi() {
    syncInlineAuthState();
    var adminTab = document.getElementById('tab-admin');
    if (adminTab) adminTab.style.display = _currentUser && _currentUser.is_admin ? '' : 'none';
    var lbl = document.getElementById('login-user-label');
    var gfUname = document.getElementById('gf-uname');
    if (lbl && !_currentUser) lbl.textContent = '';
    if (gfUname && !_currentUser) gfUname.textContent = '-';
    if (lbl && _currentUser) {
      var adminMark = _currentUser.is_admin ? ' 👑' : '';
      var modeBadge = '';
      if (_currentUser.is_guest) {
        modeBadge = ' <span style="font-size:10px;font-weight:700;color:#F59E0B;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:4px;padding:1px 6px;vertical-align:middle">GUEST</span>';
      } else if (_currentUser.is_dry_run) {
        modeBadge = ' <span style="font-size:10px;font-weight:700;color:#60a5fa;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.4);border-radius:4px;padding:1px 6px;vertical-align:middle">DRY RUN</span>';
      } else {
        modeBadge = ' <span style="font-size:10px;font-weight:700;color:#10B981;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:4px;padding:1px 6px;vertical-align:middle">LIVE</span>';
      }
      lbl.innerHTML = _currentUser.username + adminMark + modeBadge;
      if (gfUname) gfUname.textContent = lbl.textContent.trim() || (_currentUser.username || '-');
    }
  };

  window.showLogin = function() {
    if (window.isGuest) return;
    var el = document.getElementById('login-overlay');
    if (el) el.style.display = 'flex';
  };

  window.hideLogin = function() {
    var el = document.getElementById('login-overlay');
    if (el) el.style.display = 'none';
  };

  window.checkAuth = async function() {
    try {
      await awaitLogoutRequestIfNeeded();
      var r = await fetch('/auth/me', {
        credentials: 'same-origin'
      });
      if (r.status === 401) {
        clearLoginPersistenceMarkers();
        syncGuestClientState(null);
        window.showLogin();
        if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
        return false;
      }
      if (!r.ok) {
        window.showLogin();
        if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
        return false;
      }
      var user = await r.json();
      if (await rejectUnexpectedRestoredSession(user)) {
        return false;
      }
      syncGuestClientState(user);
      window.hideLogin();
      if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
      return true;
    } catch(e) {
      console.error('[AUTH] checkAuth 오류:', e);
      window.showLogin();
      if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
      return false;
    }
  };

  window.doLogin = async function() {
    var u = document.getElementById('login-username');
    var p = document.getElementById('login-password');
    var rememberInput = document.getElementById('login-remember');
    var errEl = document.getElementById('login-err');
    if (!u || !p) return;
    var username = u.value.trim();
    var password = p.value;
    var rememberMe = !!(rememberInput && rememberInput.checked);
    if (!username || !password) {
      if (errEl) errEl.textContent = '아이디와 비밀번호를 입력하세요';
      return;
    }
    try {
      await awaitLogoutRequestIfNeeded();
      var r = await fetch('/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildStateChangeHeaders({ 'Content-Type': 'application/json' }, 'POST'),
        body: JSON.stringify({
          username: username,
          password: password,
          remember_me: rememberMe
        })
      });
      var d = await r.json();
      if (r.ok && d.success) {
        try {
          if (u && u.value.trim()) localStorage.setItem(USERNAME_KEY, u.value.trim());
        } catch(e) {}
        persistLoginPersistence(d.username || username, rememberMe);
        syncGuestClientState(d);
        var _guestBanner = document.getElementById('guest-banner');
        if (_guestBanner) _guestBanner.style.display = 'none';
        window.hideLogin();
        if (typeof applyAdminTabVisibility === "function") applyAdminTabVisibility();
        if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
        // 첫 로그인 고지 팝업 체크 (게스트 제외)
        var _noticeSeen = false;
        try { _noticeSeen = !!localStorage.getItem('gf_notice_v1_' + (d.username || '')); } catch(e) {}
        if (!_noticeSeen && d.username && !d.is_guest) {
          var _nm = document.getElementById('gf-notice-modal');
          if (_nm) { _nm.classList.add('open'); }
          else { if (typeof init === 'function') init(); }
        } else {
          if (typeof init === 'function') init();
        }
      } else {
        if (errEl) errEl.textContent = d.detail || '로그인 실패';
      }
    } catch(e) {
      if (errEl) errEl.textContent = '서버 연결 오류';
      console.error('[AUTH] doLogin 오류:', e);
    }
  };

  // ── 고지 팝업 확인 처리 ──────────────────────────────
  window.gfNoticeConfirm = function() {
    var uname = window._currentUser && window._currentUser.username;
    if (uname) {
      try { localStorage.setItem('gf_notice_v1_' + uname, '1'); } catch(e) {}
    }
    var nm = document.getElementById('gf-notice-modal');
    if (nm) nm.classList.remove('open');
    if (typeof init === 'function') init();
    // 홈 진입 후 안내 힌트 (1회, 5초)
    setTimeout(function() {
      var el = document.getElementById('toast-popup');
      if (!el) return;
      el.textContent = '💡 상단 바 [안내] 버튼에서 사용 방법과 주의사항을 언제든 확인할 수 있습니다.';
      el.classList.add('show');
      clearTimeout(el._timer);
      el._timer = setTimeout(function() { el.classList.remove('show'); }, 5000);
    }, 800);
  };

  // ── 고지 팝업 → 사용 방법 이동 ──────────────────────
  window.gfNoticeGuide = function() {
    var uname = window._currentUser && window._currentUser.username;
    if (uname) {
      try { localStorage.setItem('gf_notice_v1_' + uname, '1'); } catch(e) {}
    }
    var nm = document.getElementById('gf-notice-modal');
    if (nm) nm.classList.remove('open');
    if (typeof init === 'function') init();
    setTimeout(function() {
      if (typeof openGuide === 'function') openGuide();
    }, 300);
  };

  window.doLogout = async function() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    var isGuestLogout = !!(window.isGuest || (window._currentUser && window._currentUser.is_guest));

    // 1. 프론트 상태 즉시 초기화
    clearLoginPersistenceMarkers();
    resetClientUserState('logout');

    // 2. UI 즉시 전환
    var overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
    if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();

    // 3. 서버 로그아웃을 await 해서 뒤늦은 delete-cookie가 다음 로그인 세션을 덮어쓰지 않게 한다.
    try {
      var logoutRequest = fetch(isGuestLogout ? '/auth/guest/logout' : '/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildStateChangeHeaders({}, 'POST')
      }).catch(function(){});
      window.__authLogoutRequest = logoutRequest;
      await logoutRequest;
    } catch(e) {}
    finally {
      window.__authLogoutRequest = null;
    }
  };

  // ── 게스트 만료 타이머 ──────────────────────────────────────────
  window._guestExpireTimerId = null;

  window._clearGuestExpireTimer = function() {
    if (window._guestExpireTimerId) {
      clearTimeout(window._guestExpireTimerId);
      window._guestExpireTimerId = null;
    }
  };

  window._scheduleGuestExpiry = function(expiresAt) {
    window._clearGuestExpireTimer();
    if (!expiresAt) return;
    var ms = new Date(expiresAt).getTime() - Date.now();
    if (ms < 0) ms = 0;
    window._guestExpireTimerId = setTimeout(function() {
      window._guestExpireTimerId = null;
      // 상태 즉시 초기화
      resetClientUserState('guest-expired');
      // UI 즉시 전환
      var overlay = document.getElementById('login-overlay');
      if (overlay) overlay.style.display = 'flex';
      if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
      // 만료 안내 토스트
      try {
        var msg = document.createElement('div');
        msg.textContent = '게스트 세션이 만료되었습니다.';
        msg.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1c1400;border:1px solid #F59E0B;color:#F59E0B;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;z-index:99999;white-space:nowrap;pointer-events:none;';
        document.body.appendChild(msg);
        setTimeout(function(){ if (msg.parentNode) msg.remove(); }, 3500);
      } catch(e) {}
      // 서버 만료 처리 fire-and-forget
      try {
        fetch('/auth/guest/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: buildStateChangeHeaders({}, 'POST')
        }).catch(function(){});
      } catch(e) {}
    }, ms);
  };

  window.authFetch = async function(url, options) {
    options = options || {};
    var method = options.method ? String(options.method).toUpperCase() : 'GET';
    var requestOptions = Object.assign({}, options, {
      credentials: 'same-origin',
      headers: buildStateChangeHeaders(options.headers, method)
    });
    if (window.isGuest) {
      var guestUrl = String(url);
      var guestMethod = method;
      if (guestMethod !== 'GET') {
        // POST /orders는 백엔드에서 DRY RUN sandbox 처리 — 실제 요청 통과
        if (guestUrl.indexOf('/orders') > -1) {
          return fetch(url, requestOptions);
        }
        return new Response(JSON.stringify({ detail: '게스트 모드에서는 로그인이 필요합니다' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
      /* 심볼/시세/티커/차트 — 인증 토큰과 함께 실제 호출 허용 */
      if (guestUrl.indexOf('/symbols') > -1
        || guestUrl.indexOf('/ticker') > -1
        || guestUrl.indexOf('/markets') > -1
        || guestUrl.indexOf('/candle') > -1
        || guestUrl.indexOf('/orderbook') > -1) {
        return fetch(url, requestOptions);
      }
      if (guestUrl.indexOf('/balances') > -1 || guestUrl.indexOf('/balance') > -1) {
        var guestKrw = window.__guestState ? window.__guestState.krw : 10000000;
        return new Response(JSON.stringify({
          krw: guestKrw,
          krw_available: guestKrw,
          krwBalance: guestKrw,
          total: guestKrw,
          total_eval_amount: guestKrw,
          available: guestKrw
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (guestUrl.indexOf('/orders') > -1 || guestUrl.indexOf('/positions') > -1) {
        return fetch(guestUrl, requestOptions);
      }
      if (guestUrl.indexOf('/activity') > -1 || guestUrl.indexOf('/logs') > -1) {
        return new Response(JSON.stringify({ logs: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (guestUrl.indexOf('/grid') > -1 || guestUrl.indexOf('/dca') > -1 || guestUrl.indexOf('/rebal') > -1) {
        return new Response(JSON.stringify({ strategies: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    var r = await fetch(url, requestOptions);
    if (r.status === 401) {
      if (typeof window.checkAuth === 'function') {
        try { await window.checkAuth(); } catch (e) {}
      } else {
        window.showLogin();
      }
      return null;
    }
    return r;
  };

  // DOM 준비 후 이벤트 바인딩
  document.addEventListener('DOMContentLoaded', function() {
    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', window.doLogin);
    var guestBtn = document.getElementById('guest-btn');
    if (guestBtn) guestBtn.addEventListener('click', window.enterGuestMode);

    var usernameInput = document.getElementById('login-username');
    var passwordInput = document.getElementById('login-password');
    try {
      var savedUsername = localStorage.getItem(USERNAME_KEY) || '';
      if (usernameInput && savedUsername) usernameInput.value = savedUsername;
    } catch(e) {}

    if (usernameInput) usernameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') window.doLogin();
    });
    if (passwordInput) passwordInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') window.doLogin();
    });

    console.log('[AUTH] auth.js 로드 완료');
  });
})();

// ── 게스트 모드 ────────────────────────────────────────────────
window.enterGuestMode = async function() {
  var errEl = document.getElementById('login-err');
  try {
    var r = await fetch('/auth/guest/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: buildStateChangeHeaders({}, 'POST')
    });
    var d = await r.json();
    if (!r.ok || !d.success) {
      if (errEl) errEl.textContent = d.detail || '게스트 세션 생성 실패';
      return;
    }
    window._currentUser = {
      user_id: d.user_id,
      username: d.username,
      is_admin: false,
      is_guest: true,
      expires_at: d.expires_at
    };
    window.isGuest = true;
    window._scheduleGuestExpiry(d.expires_at);
    window.__guestState = {
      krw: 10000000,
      positions: [],
      orders: [],
      strategies: [],
      logs: []
    };
    var overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
    var banner = document.getElementById('guest-banner');
    if (banner) banner.style.display = 'flex';
    var uname = document.getElementById('login-user-label');
    if (uname) uname.textContent = '👀 체험중';
    var gfUname = document.getElementById('gf-uname');
    if (gfUname) gfUname.textContent = '👀 체험 모드';
    if (typeof gfGo === 'function') gfGo('home');
    if (typeof switchHome === 'function') switchHome();
  } catch (e) {
    if (errEl) errEl.textContent = '게스트 세션 생성 실패';
    console.error('[AUTH] guest session 오류:', e);
  }
};

window.showLoginFromGuest = function() {
  if (typeof window.__resetClientUserState === 'function') {
    window.__resetClientUserState('show-login-from-guest');
  } else {
    window.isGuest = false;
  }
  var overlay = document.getElementById('login-overlay');
  if (overlay) overlay.style.display = 'flex';
  if (typeof applyInlineAuthUi === 'function') applyInlineAuthUi();
};

window.guestBlock = function(action) {
  if (!window.isGuest) return false;
  var msg = document.createElement('div');
  msg.textContent = action === 'api'
    ? '게스트 모드에서는 API키 저장은 로그인 후 가능합니다.'
    : '게스트 모드에서는 홈만 볼 수 있습니다. 로그인이 필요합니다.';
  msg.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1200;border:1px solid var(--accent);color:var(--accent);padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;z-index:99999;white-space:nowrap;';
  document.body.appendChild(msg);
  setTimeout(function(){ msg.remove(); }, 2500);
  return true;
};
