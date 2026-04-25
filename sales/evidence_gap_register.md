# Evidence Gap Register

기준
- 작성 기준: 2026-04-20 UTC
- 범위: 대단원 4 buyer-facing evidence 현재 상태
- 원칙: 현재 문서/캡처/raw artifact 기준만 반영. 없는 경로는 `blocked` 또는 `unavailable`로 고정

## auth/mode

- current status: `confirmed + limited + missing + blocked`
- strongest evidence:
  - `guest_mode_badge.png`
  - `logout_overlay_return.png`
  - `refresh_session_result.png`
  - `login_error_invalid_credentials.png`
  - `live_mode_badge.png`
  - `AUTH_MODE_EVIDENCE.md`
- blocker/reason:
  - `DRY RUN` 일반 로그인 배지는 현재 `blocked`
  - 이유: 관리자 `dry-run` 토글 경로 의존, 현재 repo/docs/evidence 범위에서 안전한 관리자 테스트 로그인 경로 미확인
- what would upgrade it:
  - 안전한 관리자 테스트 경로 또는 재현 가능한 `DRY RUN` 로그인 세션 1개 확보

## manual order

- current status: `confirmed + limited + missing + blocked + unavailable`
- strongest evidence:
  - live DB/log: `planned_order_id=97`, `89`, `95`, `87`
  - guest sandbox UI/runtime: `upbit_guest_*`, `bithumb_guest_*`
  - guest sandbox DB bridge: `sandbox_orders 20~23`, `activity_logs 46520~46523`
  - `sales/guest_sandbox_proof_bundle.md`
- blocker/reason:
  - live manual buyer-facing `before/after`, UI-DB 직접 매핑은 현재 `blocked`
  - 이유: 승인된 안전 테스트 계정/자본/세션 경로 미확인, 기존 live row를 UI에서 안전하게 다시 띄울 monitor 경로도 `blocked`
  - guest 포지션 수량 DB bridge는 `unavailable`
  - 이유: `sandbox_balances`는 KRW만 저장, `sandbox_orders`는 주문 row만 저장, `positions`는 `user_id`가 없음
- what would upgrade it:
  - 승인된 live 테스트 계정/세션 또는 안전한 read-only live UI 조회 경로 확보
  - guest 쪽은 `sandbox_balances` full before/after 시계열 또는 별도 user-linked position schema 필요

## strategy

- current status: `confirmed + limited + missing + blocked`
- strongest evidence:
  - Grid: `strategy_id=19`, `grid_orders.id=234/235`, `activity_logs.id=46515`
  - DCA: `strategy_id=8`, `dca_orders.id=22`
  - Rebalancing: `strategy_id=4`, `rebalancing_orders.id=1,2`
  - `STRATEGY_EVIDENCE.md`
- blocker/reason:
  - Grid/DCA/Rebalancing existing strategy UI 캡처는 현재 `blocked`
  - 이유: guest는 `/grid`, `/dca`, `/rebalancing`에서 빈 목록 경로로 정리되고, 기존 증거 전략은 특정 `user_id` 소유라 현재 repo/docs/evidence 범위에서 안전한 재현 경로 없음
  - Rebalancing live evidence는 `missing`
- what would upgrade it:
  - 기존 전략 소유 계정의 안전한 read-only 캡처 경로 확보
  - 또는 별도 DRY RUN/데모 전략 seeded account와 buyer-facing 로그인 경로 확보
  - Rebalancing live 1건 또는 buyer-facing DRY RUN 화면 확보

## ops/safety

- current status: `confirmed + limited + missing + blocked`
- strongest evidence:
  - backup dump: `backup_dump_presence.txt`
  - restore verify: `restore_verify_excerpt.txt`
  - emergency stop: `audit_logs.id=238512`, `bot.log.1`
  - health alert: `health_alert_excerpt.txt`
  - `OPERATIONS_EVIDENCE.md`
- blocker/reason:
  - emergency stop/release UI 캡처는 현재 `blocked`
  - 이유: DB/log 근거는 있으나 기존 상태를 read-only로 보여주는 안전 경로 없음, 상태 변경 버튼 경로는 buyer-facing read-only 증거 경로로 사용하지 않음
  - health alert duplicate suppression은 `limited`
  - 이유: dispatch line과 timer/journal OK는 있으나 direct raw suppression line/state file은 없음
  - latest stop과 같은 incident에 직접 이어지는 release pair는 `missing`
- what would upgrade it:
  - read-only emergency 상태 화면 경로 확보
  - suppression decision을 직접 보여주는 raw line/state file 확보
  - latest stop-release pair를 잇는 audit/log trace 확보

## monitor

- current status: `confirmed + missing + blocked`
- strongest evidence:
  - `app/monitor/repo.py` recent orders/activity read path
  - `static/js/monitor.js` recent orders/activity/errors/filter read UI
  - `MONITOR_AUTH_BOUNDARY.md`
  - `OPERATIONS_EVIDENCE.md`
- blocker/reason:
  - buyer-facing monitor 화면 캡처는 현재 `blocked`
  - 이유: main auth/guest 재사용 불가, 별도 `monitor_session` 로그인 필요, 현재 repo/docs/evidence 범위에서 안전한 monitor 테스트 로그인 경로 미확인
- what would upgrade it:
  - 안전한 monitor 테스트 비밀번호/세션 또는 sanitized read-only demo monitor 경로 확보
