# sales/evidence_one_pager.md

기준
- 작성 기준: 2026-04-20 UTC
- 사용 근거:
  - `AUTH_MODE_EVIDENCE.md`
  - `MANUAL_ORDER_EVIDENCE.md`
  - `STRATEGY_EVIDENCE.md`
  - `OPERATIONS_EVIDENCE.md`
  - `evidence/raw/INDEX.md`
- 원칙:
  - confirmed / limited / missing 경계 유지
  - 화면 캡처가 없는 항목은 화면 증거 부족으로 명시

## 1. 인증 / 모드

- confirmed:
  - 메인 앱 인증은 cookie 기반 세션으로 정리돼 있다.
  - 세션 복원은 `/auth/me` + same-origin cookie 경로다.
  - `GUEST / DRY RUN / LIVE` 모드 분기와 guest의 dry-run 강제는 코드 기준으로 설명 가능하다.
  - guest 기준 `mode badge`, `로그아웃 후 로그인 오버레이 복귀`, `새로고침 후 세션 유지`, `로그인 실패 UI` 캡처를 확보했다.
  - 일반 로그인 후 `LIVE` 배지 캡처 1장을 확보했다.
  - guest manual order가 sandbox 경로로만 동작한다는 buyer-facing proof bundle을 추가 확보했다.
- strongest evidence:
  - `AUTH_MODE_EVIDENCE.md`
  - raw refs: `guest_mode_badge.png`, `logout_overlay_return.png`, `refresh_session_result.png`, `login_error_invalid_credentials.png`, `live_mode_badge.png`
  - `sales/guest_sandbox_proof_bundle.md`
- limited:
  - 사용자별 키 적용은 코드와 일부 DB 구조 기준으로 설명 가능하다.
  - `GUEST`와 `LIVE`는 화면 증거가 있지만 `DRY RUN` 배지는 현재 repo/docs/evidence 범위에서 safe capture path가 blocked 상태다.
    - 관리자 dry-run 토글 경로 의존
- missing:
  - `GUEST / DRY RUN / LIVE` 3종 완전 세트는 아직 없다.
  - `DRY RUN` 일반 로그인 배지 캡처는 아직 없다.

## 2. 수동 주문

- confirmed:
  - Upbit manual BUY/SELL 성공 사례가 각 1건씩 있다.
  - Bithumb manual BUY/SELL 성공 사례가 각 1건씩 있다.
  - 각 사례는 `planned_orders` + `state_transition_logs` + `activity_logs` 3종으로 제출부터 체결까지 추적된다.
  - guest sandbox 경로 기준 Upbit/Bithumb BUY/SELL UI 캡처 세트와 runtime JSON proof를 확보했다.
  - guest 경로는 buyer-facing sandbox 증거로 설명 가능하다.
  - guest sandbox BUY/SELL은 `sandbox_orders` row `20`~`23`과 `activity_logs` row `46520`~`46523`로 DB raw bridge까지 확인됐다.
- strongest evidence:
  - live manual DB/log: `planned_order_id=97`, `89`, `95`, `87`
  - Upbit guest sandbox: `upbit_guest_buy_result.png`, `upbit_guest_sell_result.png`, `id=20`, `id=21`
  - Bithumb guest sandbox: `bithumb_guest_buy_result.png`, `bithumb_guest_sell_result.png`, `id=22`, `id=23`
  - guest sandbox bundle: `sales/guest_sandbox_proof_bundle.md`
  - guest sandbox DB bridge: `evidence/raw/manual/guest_sandbox_db_extract.txt`
- limited:
  - 위 UI 캡처와 runtime JSON은 live 실거래가 아니라 guest sandbox 기준이다.
  - guest sandbox proof는 이제 UI/JSON/문서뿐 아니라 DB row bridge까지 있다. 다만 `sandbox_balances` full before/after 시계열은 아직 없다.
  - UI/runtime에는 포지션 수량 단서가 있지만, 현재 DB 스키마만으로는 guest별 row에 직접 고정되지 않는다.
  - live manual order의 buyer-facing before/after 및 UI-DB mapping 캡처는 현재 repo/docs/evidence 범위에서 safe capture path가 blocked 상태다.
    - 승인된 안전 테스트 계정/자본/세션 경로 미확인
    - 기존 live row를 UI에서 안전하게 다시 띄울 monitor path도 blocked
  - Bithumb SELL 최소 주문 규칙은 코드와 성공 row 기준으로는 설명 가능하다.
  - Bithumb guest sandbox는 runtime 응답은 닫혔지만 이번 샷에서 주문/포지션 테이블 반영은 보이지 않았다.
- missing:
  - live 주문 기준 잔액 before/after와 UI-DB 식별자 직접 매핑 증거는 아직 없다.
  - guest sandbox balance before/after full 시계열은 아직 없다.
  - `guest 포지션 수량 DB bridge`는 현재 스키마 제약으로 `unavailable`이다.
    - `sandbox_balances`는 KRW만 저장
    - `sandbox_orders`는 주문 row만 저장
    - `positions`는 `user_id`가 없음

## 3. 전략 엔진

- confirmed:
  - Grid는 최신 1사이클 근거 1건이 있다.
    - `strategy_id=19`, `KRW-XRP`
    - `grid_orders.id=235`는 `SELL_ORDERED`, `grid_orders.id=234`는 `WAITING`
    - `activity_logs.id=46515`에 `PAUSED` 기록이 있다.
  - DCA는 사용자 키 라우팅이 걸린 최신 실행 근거 1건이 있다.
    - `strategy_id=8`, `dca_orders.id=22`, `exchange_order_id=14a856e2-ff02-4114-898d-2be32f898b27`
  - Rebalancing은 실전보다 DRY RUN + trigger/code trace 수준 근거가 있다.
    - `strategy_id=4`, `rebalancing_orders.id=1,2`, `REBAL-DRY-*`
- strongest evidence:
  - Grid: `strategy_id=19`, `grid_orders.id=235`, `activity_logs.id=46515`
  - DCA: `strategy_id=8`, `dca_orders.id=22`, `users.id=10`, `bot_configs` user-key refs
- limited:
  - Rebalancing은 `dry-run confirmed + trigger/code trace` 수준이다.
- missing:
  - Grid/DCA/Rebalancing 모두 buyer-facing 화면 캡처가 부족하다.
  - 현재 repo/docs/evidence 범위에서는 기존 전략 UI를 안전하게 재현할 capture path가 blocked 상태다.
    - Grid: guest는 빈 목록, 기존 `strategy_id=19`는 특정 user 전략
    - DCA: guest는 빈 목록, 기존 `strategy_id=8`는 특정 user 전략
    - Rebalancing: guest는 빈 목록, 기존 `strategy_id=4`, `6`은 특정 user 전략
  - Rebalancing live confirmed 사례는 아직 없다.

## 4. 운영 / 안전

- confirmed:
  - 전역 emergency stop 발동 근거 1건이 있다.
    - `audit_logs.id=238512`
    - `bot.log.1`에 `비상정지 발동: balance_query_failed`
  - emergency reset 근거는 더 이전 시점 1건이 있다.
    - `audit_logs.id=5258`, `auto_recovered`
  - backup dump 실파일은 `2026-04-20` 기준 재확인됐다.
    - `/var/backups/gridflow/upbit_bot_20260420_032935.dump`
    - `backup_dump_presence.txt`
  - restore verify 성공은 `2026-04-20` 기준 재확인됐다.
    - `/var/log/gridflow_restore_verify.log`
    - `restore_verify_excerpt.txt`
  - monitor는 최근 orders/activity/error/filter 관측 경로 기준 read-only로 설명 가능하다.
- strongest evidence:
  - `backup_dump_presence.txt`
  - `restore_verify_excerpt.txt`
  - `audit_logs.id=238512`
- limited:
  - 최신 stop과 같은 incident에 직접 이어지는 release 증거는 없다.
  - health alert는 발송 로그와 timer 실행 상태는 확인됐지만 duplicate suppression은 이번 raw pack에서 직접 닫히지 않았다.
- missing:
  - 운영 화면 캡처와 monitor 화면 캡처가 부족하다.
  - emergency stop/release UI 캡처는 현재 repo/docs/evidence 범위에서 safe capture path가 blocked 상태다.
    - DB/log 근거는 있음
    - 기존 상태를 read-only로 보여줄 경로는 확인되지 않음
    - 상태 변경 버튼 경로는 buyer-facing read-only 증거 경로로 쓰지 않음
  - monitor buyer-facing 화면은 현재 repo/docs/evidence 범위에서 safe capture path가 blocked 상태다.
    - main auth/guest 재사용 불가
    - 별도 `monitor_session` 로그인 필요

## 현재 buyer-facing 해석

- confirmed:
  - 인증 구조, 수동 주문 성공, Grid/DCA 실행, 운영 백업/복구/알림 구조는 설명 가능하다.
- limited:
  - 전략 엔진 중 Rebalancing은 live보다 DRY RUN 중심 근거다.
  - 일부 항목은 코드/DB/log 중심이라 화면 체감 증거가 부족하다.
  - health alert duplicate suppression은 이번 raw pack 기준 문서 수준 근거에 머문다.
- missing:
  - 주요 사용자 플로우와 운영 화면의 buyer-facing 캡처 세트가 아직 부족하다.
  - 이 중 일부는 현재 repo/docs/evidence 범위에서 safe capture path가 blocked 상태다.

## raw binder 포인터

- 인증/모드: `AUTH_MODE_EVIDENCE.md`, raw `guest_mode_badge.png`, `logout_overlay_return.png`, `refresh_session_result.png`, `login_error_invalid_credentials.png`
- 수동 주문: `MANUAL_ORDER_EVIDENCE.md`, raw `upbit_guest_*`, `bithumb_guest_*`
- 전략 엔진: `STRATEGY_EVIDENCE.md`, raw `strategy_id=19`, `dca_orders.id=22`, `rebalancing_orders.id=1,2`
- 운영/안전: `OPERATIONS_EVIDENCE.md`, raw `backup_dump_presence.txt`, `restore_verify_excerpt.txt`, `health_alert_excerpt.txt`, `audit_logs.id=238512`
