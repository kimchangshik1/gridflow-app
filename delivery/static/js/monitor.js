// ─── Server-driven Tier Bootstrap ─────────────────────────────────────────────
// tier 값은 서버(/monitor/tier)가 source of truth.
// 프론트는 window.MONITOR_TIER 를 읽기만 한다.
// 응답 실패 / 허용 외 값 / 네트워크 오류 시 반드시 "lite" fallback.
(function () {
  var _ALLOWED_TIERS = ["lite", "pro", "signature"];
  window.MONITOR_TIER = "lite"; // 기본값: 응답 전 또는 실패 시 안전 fallback

  /**
   * tier에 따라 Pro/Signature 전용 섹션을 노출/숨김 처리.
   * HTML의 hidden 속성을 직접 토글하므로 여백 없이 완전히 제거됨.
   *
   * Pro+ 섹션 목록:
   *   - ops-error-slot : 최근 오류 1건 요약 (ops-bar 내부)
   *   - summary-section: 요약 카드 4개
   *   - exch-section   : 거래소 상태 요약
   *
   * Signature 전용 슬롯:
   *   - signature-slot : 추후 커스텀 패널 진입점
   */
  function applyTierVisibility(tier) {
    var isLite = (tier === "lite");

    // Pro 이상에서만 보이는 섹션
    ["ops-error-slot", "summary-section", "exch-section"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = isLite;
    });

    // Lite 전용 기본 상태 패널: lite에서만 노출
    var liteBar = document.getElementById("lite-status-bar");
    if (liteBar) liteBar.hidden = !isLite;

    // Signature 전용 슬롯: signature일 때만 노출
    var sigSlot = document.getElementById("signature-slot");
    if (sigSlot) sigSlot.hidden = (tier !== "signature");

    document.documentElement.setAttribute("data-monitor-tier", tier);
  }

  // refresh() 등 외부 함수에서 호출할 수 있도록 window에 노출
  window._monitorApplyTier = applyTierVisibility;

  // 초기 적용: lite 기준 (HTML의 hidden 속성과 동기화)
  applyTierVisibility("lite");

  fetch("/monitor/tier")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      var raw = data && typeof data.tier === "string"
        ? data.tier.trim().toLowerCase()
        : "";
      var tier = _ALLOWED_TIERS.indexOf(raw) !== -1 ? raw : "lite";
      window.MONITOR_TIER = tier;
      applyTierVisibility(tier);
      console.log("[GridFlow Monitor] tier:", tier);
    })
    .catch(function () {
      // window.MONITOR_TIER 는 이미 "lite", 섹션도 이미 hidden
      console.log("[GridFlow Monitor] tier fetch 실패 — fallback: lite");
    });
})();
// ──────────────────────────────────────────────────────────────────────────────

(function () {
  const ordersBody = document.getElementById("ordersBody");
  const activityBody = document.getElementById("activityBody");
  const ordersCount = document.getElementById("ordersCount");
  const activityCount = document.getElementById("activityCount");
  const ordersEmpty = document.getElementById("ordersEmpty");
  const activityEmpty = document.getElementById("activityEmpty");
  const errorsBody = document.getElementById("errorsBody");
  const errorsCount = document.getElementById("errorsCount");
  const errorsEmpty = document.getElementById("errorsEmpty");
  const lastUpdated = document.getElementById("lastUpdated");
  const freshnessBadge = document.getElementById("freshnessBadge");
  const health = document.getElementById("health");
  const exchangeFilter = document.getElementById("exchangeFilter");
  const statusFilter = document.getElementById("statusFilter");
  const opsDot = document.getElementById("ops-dot");
  const opsStatusLabel = document.getElementById("ops-status-label");
  const latestErrorText = document.getElementById("latest-error-text");
  const statOrdersTotal = document.getElementById("stat-orders-total");
  const statFilledTotal = document.getElementById("stat-filled-total");
  const statFilledCard = document.getElementById("stat-filled-card");
  const statBadTotal = document.getElementById("stat-bad-total");
  const statBadCard = document.getElementById("stat-bad-card");
  const statLastOk = document.getElementById("stat-last-ok");
  const statLastOkSub = document.getElementById("stat-last-ok-sub");
  const exchUpbitDot = document.getElementById("exch-upbit-dot");
  const exchUpbitLabel = document.getElementById("exch-upbit-label");
  const exchUpbitDetail = document.getElementById("exch-upbit-detail");
  const exchBithumbDot = document.getElementById("exch-bithumb-dot");
  const exchBithumbLabel = document.getElementById("exch-bithumb-label");
  const exchBithumbDetail = document.getElementById("exch-bithumb-detail");
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshMs = 4000;
  const staleMs = refreshMs * 3;
  const state = {
    refreshIntervalId: null,
    refreshInFlight: false,
    previousFirstOrderId: null,
    previousFirstActivityId: null,
    seenInitialData: false,
    healthRestoreTimer: null,
    exchangeFilter: "",
    statusFilter: "",
    lastOrders: [],
    lastActivity: [],
    failureCount: 0,
    lastSuccessfulRefreshAt: 0,
  };

  async function getJson(path) {
    const response = await fetch(path, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  function text(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return String(value);
  }

  function number(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return "-";
    }
    return n.toLocaleString("ko-KR", { maximumFractionDigits: 8 });
  }

  function statusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "FILLED") {
      return "status-filled";
    }
    if (["SUBMITTED", "ACTIVE", "SUCCESS"].includes(value)) {
      return "status-ok";
    }
    if (["PLANNED", "QUEUED", "PARTIALLY_FILLED", "UNKNOWN"].includes(value)) {
      return "status-warn";
    }
    if (value === "FAILED") {
      return "status-failed";
    }
    if (value === "CANCELLED") {
      return "status-cancelled";
    }
    if (value === "RECONCILE_NEEDED") {
      return "status-bad";
    }
    return "";
  }

  function isBadStatus(status) {
    return ["FAILED", "CANCELLED", "RECONCILE_NEEDED"].includes(
      String(status || "").toUpperCase()
    );
  }

  function statusGroup(status) {
    const className = statusClass(status);
    if (className === "status-ok" || className === "status-filled") {
      return "ok";
    }
    if (className === "status-warn") {
      return "warn";
    }
    if (["status-bad", "status-failed", "status-cancelled"].includes(className)) {
      return "bad";
    }
    return "";
  }

  function isFailedStatus(status) {
    return String(status || "").toUpperCase() === "FAILED";
  }

  function exchangeValue(exchange) {
    return String(exchange || "").trim().toLowerCase();
  }

  function displayExchange(exchange) {
    const value = exchangeValue(exchange);
    const labels = {
      upbit: "업비트",
      bithumb: "빗썸",
      system: "시스템",
    };
    return labels[value] || text(exchange);
  }

  function displaySide(side) {
    const value = String(side || "").trim().toUpperCase();
    const labels = {
      BUY: "매수",
      SELL: "매도",
      BID: "매수",
      ASK: "매도",
    };
    return labels[value] || text(side);
  }

  function displayStatus(status) {
    const value = String(status || "").trim().toUpperCase();
    const labels = {
      PLANNED: "대기",
      QUEUED: "처리 대기",
      SUBMITTED: "제출 완료",
      ACTIVE: "진행 중",
      PAUSED: "일시정지",
      STOPPED: "종료",
      PARTIALLY_FILLED: "부분 체결",
      FILLED: "체결 완료",
      CANCELLED: "취소됨",
      FAILED: "실패",
      UNKNOWN: "상태 불명",
      RECONCILE_NEEDED: "확인 필요",
      SUCCESS: "성공",
    };
    return labels[value] || text(status);
  }

  function displayEvent(eventType) {
    const value = String(eventType || "").trim().toLowerCase();
    const labels = {
      manual_order: "수동 주문",
      strategy: "전략",
      audit: "시스템 로그",
      summary: "요약",
    };
    return labels[value] || text(eventType);
  }

  function cell(value, className) {
    const td = document.createElement("td");
    td.textContent = text(value);
    if (className) {
      td.className = className;
    }
    return td;
  }

  function markNewRow(tr) {
    tr.className = "row-new";
    tr.style.background = "rgba(103, 212, 161, 0.14)";
  }

  function markBadRow(tr) {
    tr.style.background = "rgba(224, 111, 111, 0.045)";
  }

  function filterOrders(rows) {
    return rows.filter((row) => {
      const exchangeMatches =
        !state.exchangeFilter ||
        exchangeValue(row.exchange) === state.exchangeFilter;
      const statusMatches = !state.statusFilter || statusGroup(row.status) === state.statusFilter;
      return exchangeMatches && statusMatches;
    });
  }

  function filterActivity(rows) {
    return rows.filter((row) => {
      const exchangeMatches =
        !state.exchangeFilter ||
        exchangeValue(row.exchange) === state.exchangeFilter;
      const statusMatches = !state.statusFilter || statusGroup(row.status) === state.statusFilter;
      return exchangeMatches && statusMatches;
    });
  }

  function filterErrors(rows) {
    return rows
      .filter(
        (row) =>
          !state.exchangeFilter ||
          exchangeValue(row.exchange) === state.exchangeFilter
      )
      .filter((row) => !state.statusFilter || statusGroup(row.status) === state.statusFilter)
      .filter((row) => isBadStatus(row.status));
  }

  function renderOrders(rows, highlightFirst) {
    ordersBody.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      if (isFailedStatus(row.status)) {
        markBadRow(tr);
      }
      if (highlightFirst && index === 0) {
        markNewRow(tr);
      }
      tr.append(
        cell(row.id, "mono"),
        cell(displayExchange(row.exchange)),
        cell(row.symbol, "mono"),
        cell(displaySide(row.side)),
        cell(displayStatus(row.status), statusClass(row.status)),
        cell(number(row.price), "mono"),
        cell(number(row.amount_krw), "mono"),
        cell(number(row.qty), "mono"),
        cell(row.created_at, "mono")
      );
      ordersBody.appendChild(tr);
    });
    ordersCount.textContent = `${rows.length}건`;
    ordersEmpty.hidden = rows.length !== 0;
  }

  function renderActivity(rows, highlightFirst) {
    activityBody.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      if (isFailedStatus(row.status)) {
        markBadRow(tr);
      }
      if (highlightFirst && index === 0) {
        markNewRow(tr);
      }
      tr.append(
        cell(row.id, "mono"),
        cell(displayEvent(row.event_type)),
        cell(displayExchange(row.exchange)),
        cell(displayStatus(row.status), statusClass(row.status)),
        cell(row.symbol, "mono"),
        cell(row.message),
        cell(row.created_at, "mono")
      );
      activityBody.appendChild(tr);
    });
    activityCount.textContent = `${rows.length}건`;
    activityEmpty.hidden = rows.length !== 0;
  }

  function renderErrors(rows) {
    errorsBody.replaceChildren();
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      if (isFailedStatus(row.status)) {
        markBadRow(tr);
      }
      tr.append(
        cell(row.id, "mono"),
        cell(displayEvent(row.event_type)),
        cell(displayExchange(row.exchange)),
        cell(displayStatus(row.status), statusClass(row.status)),
        cell(row.symbol, "mono"),
        cell(row.message),
        cell(row.created_at, "mono")
      );
      errorsBody.appendChild(tr);
    });
    errorsCount.textContent = `${rows.length}건`;
    errorsEmpty.hidden = rows.length !== 0;
  }

  function firstId(rows) {
    return rows.length ? rows[0].id : null;
  }

  /* ─── 새 UI 헬퍼 ─────────────────────────────────────── */
  function setOpsStatus(level, label) {
    if (!opsDot || !opsStatusLabel) return;
    opsDot.className = "ops-dot " + level;
    opsStatusLabel.textContent = label;
    opsStatusLabel.className = level;
  }

  function extractTime(dt) {
    if (!dt) return "—";
    const m = String(dt).match(/(\d{2}:\d{2}:\d{2})/);
    return m ? m[1] : String(dt).slice(0, 19);
  }

  function extractDate(dt) {
    if (!dt) return "";
    const m = String(dt).match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }

  function updateLatestError(activity) {
    if (!latestErrorText) return;
    const badItem = activity.find(r => isBadStatus(r.status));
    if (!badItem) {
      latestErrorText.textContent = "최근 오류 없음";
      latestErrorText.className = "";
    } else {
      const exch = displayExchange(badItem.exchange);
      const sym  = badItem.symbol  ? " " + badItem.symbol : "";
      latestErrorText.textContent = "오류: " + exch + sym;
      latestErrorText.className = "has-error";
    }
  }

  function updateSummaryCards(orders, activity) {
    if (!statOrdersTotal) return;
    const total  = orders.length;
    const filled = orders.filter(o => String(o.status || "").toUpperCase() === "FILLED").length;
    const bad    = orders.filter(o => ["FAILED", "CANCELLED", "RECONCILE_NEEDED"].includes(String(o.status || "").toUpperCase())).length;
    const lastOk = activity.find(r => !isBadStatus(r.status) && r.created_at);

    statOrdersTotal.textContent = total;
    statFilledTotal.textContent = filled;
    statBadTotal.textContent    = bad;

    if (statFilledCard) statFilledCard.className = "sum-card" + (filled > 0 ? " is-ok" : "");
    if (statBadCard)    statBadCard.className    = "sum-card" + (bad    > 0 ? " is-bad" : "");

    if (statLastOk) {
      if (lastOk) {
        statLastOk.textContent = extractTime(lastOk.created_at);
        if (statLastOkSub) statLastOkSub.textContent = extractDate(lastOk.created_at) || "정상 이벤트 기준";
      } else {
        statLastOk.textContent = "—";
        if (statLastOkSub) statLastOkSub.textContent = "정상 이벤트 없음";
      }
    }
  }

  function updateExchangeStatus(activity) {
    const sets = {
      upbit:   { total: 0, bad: 0 },
      bithumb: { total: 0, bad: 0 },
    };
    activity.forEach(r => {
      const ex = exchangeValue(r.exchange);
      if (!sets[ex]) return;
      sets[ex].total += 1;
      if (isBadStatus(r.status)) sets[ex].bad += 1;
    });

    function applyExch(dot, label, detail, data) {
      if (!dot || !label) return;
      if (data.total === 0) {
        dot.className = "exch-dot";
        label.textContent = "데이터 없음";
        label.className = "exch-label";
        if (detail) detail.textContent = "";
      } else if (data.bad === 0) {
        dot.className = "exch-dot ok";
        label.textContent = "정상";
        label.className = "exch-label ok";
        if (detail) detail.textContent = "최근 오류 없음";
      } else {
        dot.className = "exch-dot bad";
        label.textContent = "주의";
        label.className = "exch-label bad";
        if (detail) detail.textContent = "최근 실패 " + data.bad + "건";
      }
    }

    applyExch(exchUpbitDot, exchUpbitLabel, exchUpbitDetail, sets.upbit);
    applyExch(exchBithumbDot, exchBithumbLabel, exchBithumbDetail, sets.bithumb);
  }

  /* ─── Lite 전용: 기본 상태 패널 업데이트 ──────────────── */
  function updateLiteStatusBar(orders, activity) {
    if (window.MONITOR_TIER !== "lite") return;
    var liteOpsValue  = document.getElementById("lite-ops-value");
    var liteErrValue  = document.getElementById("lite-err-value");
    var liteFillValue = document.getElementById("lite-fill-value");

    // 운영 상태: ops-status-label 텍스트·상태 재사용
    if (liteOpsValue && opsStatusLabel) {
      liteOpsValue.textContent = opsStatusLabel.textContent || "확인 중";
      var cls = "lite-bar-value";
      if (opsStatusLabel.classList.contains("ok"))   cls += " ok";
      if (opsStatusLabel.classList.contains("warn")) cls += " warn";
      if (opsStatusLabel.classList.contains("bad"))  cls += " bad";
      liteOpsValue.className = cls;
    }

    // 최근 오류: 있음/없음
    if (liteErrValue) {
      var hasErr = activity.some(function (r) { return isBadStatus(r.status); });
      liteErrValue.textContent = hasErr ? "있음" : "없음";
      liteErrValue.className   = "lite-bar-value " + (hasErr ? "bad" : "ok");
    }

    // 최근 체결: 확인됨/없음
    if (liteFillValue) {
      var hasFill = orders.some(function (o) {
        return String(o.status || "").toUpperCase() === "FILLED";
      });
      liteFillValue.textContent = hasFill ? "확인됨" : "없음";
      liteFillValue.className   = "lite-bar-value" + (hasFill ? " ok" : "");
    }
  }

  /* ─── Signature 전용: 운영 인사이트 패널 업데이트 ──────── */
  function updateInsightPanel(orders, activity) {
    // Signature tier가 아니면 계산 자체를 건너뜀
    if (window.MONITOR_TIER !== "signature") return;

    // ── 헬퍼 ────────────────────────────────────────────────
    function setVal(id, text, cls) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      // sig-err 클래스는 HTML에서 고정 — 덮어쓰지 않음
      const base = el.classList.contains("sig-err")
        ? "sig-item-value sig-err"
        : "sig-item-value";
      el.className = base + (cls ? " " + cls : "");
    }
    function setSub(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    // ── 1. 최근 실패율 (orders 기준) ────────────────────────
    const total = orders.length;
    const badOrders = orders.filter(o => isBadStatus(o.status)).length;
    if (total === 0) {
      setVal("sig-fail-rate", "—", "");
      setSub("sig-fail-rate-sub", "주문 없음");
    } else {
      const rate = Math.round(badOrders / total * 100);
      const cls  = rate === 0 ? "ok" : rate <= 20 ? "warn" : "bad";
      setVal("sig-fail-rate", rate + "%", cls);
      setSub("sig-fail-rate-sub", total + "건 중 " + badOrders + "건 실패");
    }

    // ── 2. 주의 거래소 (activity bad 집계) ──────────────────
    const exchBad = {};
    activity.filter(a => isBadStatus(a.status)).forEach(a => {
      const ex = exchangeValue(a.exchange) || "기타";
      exchBad[ex] = (exchBad[ex] || 0) + 1;
    });
    let worstEx = null, worstCnt = 0;
    Object.keys(exchBad).forEach(ex => {
      if (exchBad[ex] > worstCnt) { worstEx = ex; worstCnt = exchBad[ex]; }
    });
    if (!worstEx || worstCnt === 0) {
      setVal("sig-worst-exch", "이상 없음", "ok");
      setSub("sig-worst-exch-sub", "");
    } else {
      setVal("sig-worst-exch", displayExchange(worstEx), "bad");
      setSub("sig-worst-exch-sub", "최근 실패 " + worstCnt + "건");
    }

    // ── 3. 마지막 체결(FILLED) 후 경과 ─────────────────────
    const lastFilled = orders.find(o => String(o.status || "").toUpperCase() === "FILLED");
    if (!lastFilled || !lastFilled.created_at) {
      setVal("sig-last-fill", "체결 없음", "");
      setSub("sig-last-fill-sub", "조회 기간 내");
    } else {
      const ms = Date.now() - new Date(lastFilled.created_at).getTime();
      let elapsed;
      if (!Number.isFinite(ms) || ms < 0) {
        elapsed = "—";
      } else if (ms < 60000) {
        elapsed = Math.floor(ms / 1000) + "초 전";
      } else if (ms < 3600000) {
        elapsed = Math.floor(ms / 60000) + "분 전";
      } else {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        elapsed = h + "시간" + (m > 0 ? " " + m + "분" : "") + " 전";
      }
      setVal("sig-last-fill", elapsed, "");
      setSub("sig-last-fill-sub", lastFilled.symbol || "");
    }

    // ── 4. 주요 오류 유형 (bad activity message 집계) ───────
    const msgCount = {};
    activity.filter(a => isBadStatus(a.status) && a.message).forEach(a => {
      // 괄호 앞 핵심 문구만 취함 (detail 제거)
      const msg = String(a.message).split("(")[0].trim();
      if (msg) msgCount[msg] = (msgCount[msg] || 0) + 1;
    });
    let topMsg = null, topCnt = 0;
    Object.keys(msgCount).forEach(m => {
      if (msgCount[m] > topCnt) { topMsg = m; topCnt = msgCount[m]; }
    });
    if (!topMsg) {
      setVal("sig-top-err", "없음", "ok");
      setSub("sig-top-err-sub", "");
    } else {
      setVal("sig-top-err", topMsg, topCnt > 2 ? "bad" : "warn");
      setSub("sig-top-err-sub", topCnt + "건 반복");
    }
  }
  /* ─────────────────────────────────────────────────────── */

  function showNormalHealth() {
    health.textContent = "읽기 전용 운영 중";
    health.className = "health status-ok";
    setOpsStatus("ok", "정상 운영 중");
  }

  function showUpdateDetected() {
    health.textContent = "새 데이터 감지";
    health.className = "health status-ok";
    setOpsStatus("ok", "새 데이터 감지");
    if (state.healthRestoreTimer !== null) {
      window.clearTimeout(state.healthRestoreTimer);
    }
    state.healthRestoreTimer = window.setTimeout(() => {
      showNormalHealth();
      state.healthRestoreTimer = null;
    }, 1800);
  }

  function showDisconnected() {
    const suffix = state.failureCount >= 3 ? " (재시도 중)" : "";
    health.textContent = `연결 지연${suffix}`;
    health.className = "health status-bad";
    setOpsStatus("bad", "연결 지연" + suffix);
  }

  function updateFreshnessBadge(now) {
    if (!freshnessBadge) return;
    const isFresh =
      state.lastSuccessfulRefreshAt > 0 &&
      now - state.lastSuccessfulRefreshAt <= staleMs;
    freshnessBadge.textContent = isFresh ? "정상" : "STALE";
    freshnessBadge.className = "freshness-badge " + (isFresh ? "ok" : "stale");
  }

  function detectNewData(orders, activity) {
    const firstOrderId = firstId(orders);
    const firstActivityId = firstId(activity);
    const orderChanged = state.seenInitialData && firstOrderId !== state.previousFirstOrderId;
    const activityChanged = state.seenInitialData && firstActivityId !== state.previousFirstActivityId;

    state.previousFirstOrderId = firstOrderId;
    state.previousFirstActivityId = firstActivityId;
    state.seenInitialData = true;

    return {
      hasNewData: orderChanged || activityChanged,
      orderChanged,
      activityChanged,
    };
  }

  function resetDetectionBaseline(orders, activity) {
    state.previousFirstOrderId = firstId(orders);
    state.previousFirstActivityId = firstId(activity);
    state.seenInitialData = true;
  }

  async function refresh() {
    if (state.refreshInFlight) {
      return;
    }
    state.refreshInFlight = true;
    try {
      if (!state.seenInitialData || state.failureCount > 0) {
        health.textContent = "갱신 중";
        health.className = "health status-warn";
        setOpsStatus("warn", "갱신 중");
      }
      const [ordersData, activityData] = await Promise.all([
        getJson("/monitor/orders"),
        getJson("/monitor/activity"),
      ]);
      state.failureCount = 0;
      const orders = ordersData.orders || [];
      const activity = activityData.activity || [];
      state.lastOrders = orders;
      state.lastActivity = activity;
      const visibleOrders = filterOrders(orders);
      const visibleActivity = filterActivity(activity);
      const visibleErrors = filterErrors(activity);
      const detected = detectNewData(visibleOrders, visibleActivity);
      renderOrders(visibleOrders, detected.orderChanged);
      renderActivity(visibleActivity, detected.activityChanged);
      renderErrors(visibleErrors);
      updateLatestError(activity);
      updateSummaryCards(orders, activity);
      updateExchangeStatus(activity);
      updateInsightPanel(orders, activity);
      updateLiteStatusBar(orders, activity);
      // 렌더 사이클 마지막에 tier 가시성 재적용 — 어떤 render 함수도 이를 덮어쓰지 못하게 보장
      if (typeof window._monitorApplyTier === "function") {
        window._monitorApplyTier(window.MONITOR_TIER);
      }
      state.lastSuccessfulRefreshAt = Date.now();
      lastUpdated.textContent = `최근 갱신: ${new Date(state.lastSuccessfulRefreshAt).toLocaleString("ko-KR")}`;
      updateFreshnessBadge(state.lastSuccessfulRefreshAt);
      if (detected.hasNewData) {
        showUpdateDetected();
      } else if (state.healthRestoreTimer === null) {
        showNormalHealth();
      }
    } catch (error) {
      state.failureCount += 1;
      updateFreshnessBadge(Date.now());
      showDisconnected();
    } finally {
      state.refreshInFlight = false;
    }
  }

  function startAutoRefresh() {
    if (state.refreshIntervalId !== null) {
      return;
    }
    state.refreshIntervalId = window.setInterval(refresh, refreshMs);
  }

  function renderCurrentData() {
    const visibleOrders = filterOrders(state.lastOrders);
    const visibleActivity = filterActivity(state.lastActivity);
    const visibleErrors = filterErrors(state.lastActivity);
    resetDetectionBaseline(visibleOrders, visibleActivity);
    renderOrders(visibleOrders, false);
    renderActivity(visibleActivity, false);
    renderErrors(visibleErrors);
  }

  if (refreshBtn !== null) {
    refreshBtn.addEventListener("click", () => { refresh(); });
  }

  if (exchangeFilter !== null) {
    exchangeFilter.addEventListener("change", () => {
      state.exchangeFilter = exchangeFilter.value;
      renderCurrentData();
    });
  }

  if (statusFilter !== null) {
    statusFilter.addEventListener("change", () => {
      state.statusFilter = statusFilter.value;
      renderCurrentData();
    });
  }

  refresh();
  startAutoRefresh();
})();
