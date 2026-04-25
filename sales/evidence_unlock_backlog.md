# Evidence Unlock Backlog

기준
- 작성 기준: 2026-04-20 UTC
- 기준 문서:
  - `sales/evidence_pack_closeout.md`
  - `sales/evidence_gap_register.md`
  - `sales/safe_capture_path_note.md`
  - `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - `sales/evidence_internal_hold_bundle_index.md`

## P0

- item: `DRY RUN badge capture set`
  - current status: `blocked`
  - why blocked: 관리자 `dry-run` 토글 경로 의존, 현재 safe login/capture path 없음
  - unlock prerequisite: 안전한 관리자 테스트 로그인 또는 재현 가능한 `DRY RUN` 세션 확보
  - minimum evidence to upgrade: `DRY RUN` 헤더 배지 캡처 1장과 로그인 성공 세션 단서 1개
  - target docs to update after unlock: `AUTH_MODE_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P0`

- item: `live manual before/after / UI-DB mapping`
  - current status: `blocked`
  - why blocked: 승인된 안전 테스트 계정/자본/세션 경로 미확인, 기존 live row를 안전하게 보여줄 UI 경로도 없음
  - unlock prerequisite: 승인된 live 테스트 계정/세션 또는 read-only live UI 조회 경로 확보
  - minimum evidence to upgrade: BUY/SELL 직전·직후 화면 1세트와 `planned_order_id` 또는 `exchange_order_id`를 잇는 UI 단서 1개
  - target docs to update after unlock: `MANUAL_ORDER_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P0`

- item: `monitor buyer-facing UI capture`
  - current status: `blocked`
  - why blocked: 별도 `monitor_session` 로그인 필요, 현재 안전한 monitor 테스트 로그인 경로 미확인
  - unlock prerequisite: 안전한 `monitor_session` 테스트 로그인 또는 sanitized demo monitor 경로 확보
  - minimum evidence to upgrade: recent orders/activity/errors/filter 화면 캡처 1세트
  - target docs to update after unlock: `OPERATIONS_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P0`

- item: `Grid existing strategy UI capture`
  - current status: `blocked`
  - why blocked: guest는 빈 목록, 기존 `strategy_id=19`는 특정 `user_id` 소유
  - unlock prerequisite: 기존 전략 소유 계정의 안전한 read-only 캡처 경로 또는 demo strategy 계정 확보
  - minimum evidence to upgrade: `strategy_id=19` 또는 `KRW-XRP`가 보이는 전략 카드/상세 화면과 `SELL_ORDERED` 상태 화면
  - target docs to update after unlock: `STRATEGY_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P0`

- item: `DCA existing strategy UI capture`
  - current status: `blocked`
  - why blocked: guest는 빈 목록, 기존 `strategy_id=8`는 특정 `user_id` 소유
  - unlock prerequisite: 기존 전략 소유 계정의 안전한 read-only 캡처 경로 또는 demo DCA 계정 확보
  - minimum evidence to upgrade: `strategy_id=8` 또는 `KRW-XRP`가 보이는 전략 화면과 `dca_orders.id=22` 체결 상태 화면
  - target docs to update after unlock: `STRATEGY_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P0`

- item: `Rebalancing existing strategy UI capture`
  - current status: `blocked`
  - why blocked: guest는 빈 목록, 기존 `strategy_id=4`, `6`은 특정 `user_id` 소유
  - unlock prerequisite: 기존 전략 소유 계정의 안전한 read-only 캡처 경로 또는 demo Rebalancing 계정 확보
  - minimum evidence to upgrade: `strategy_id=4` 또는 `strategy_id=6` 화면과 DRY RUN 주문/상태가 보이는 캡처 1세트
  - target docs to update after unlock: `STRATEGY_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P0`

## P1

- item: `emergency stop/release UI capture`
  - current status: `blocked`
  - why blocked: 기존 emergency 상태를 read-only로 보여줄 안전 경로 없음, 상태 변경 버튼 경로는 증거 수집용으로 부적절
  - unlock prerequisite: read-only emergency 상태 화면 경로 또는 safe demo state 확보
  - minimum evidence to upgrade: stop 상태 화면 1장, release 후 정상 상태 화면 1장
  - target docs to update after unlock: `OPERATIONS_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P1`

- item: `Rebalancing live confirmed evidence`
  - current status: `missing`
  - why blocked: 현재는 `dry-run confirmed + trigger/code trace`만 있고 live 주문/상태 근거 없음
  - unlock prerequisite: live Rebalancing 실행 사례 1건 또는 live trace를 남길 수 있는 안전 운영 근거 확보
  - minimum evidence to upgrade: live `rebalancing_orders` row 1건과 대응 상태/로그 근거
  - target docs to update after unlock: `STRATEGY_EVIDENCE.md`, `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P1`

- item: `latest emergency stop-release pair evidence`
  - current status: `missing`
  - why blocked: 최신 `2026-04-18` stop와 직접 연결되는 reset pair를 audit/log에서 확인하지 못함
  - unlock prerequisite: 같은 incident를 잇는 audit/log trace 또는 운영 설명 근거 확보
  - minimum evidence to upgrade: stop 후보와 release 후보를 같은 incident로 연결하는 line/row 1세트
  - target docs to update after unlock: `OPERATIONS_EVIDENCE.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P1`

- item: `health alert duplicate suppression direct raw proof`
  - current status: `limited`
  - why blocked: dispatch line과 timer/journal OK는 있으나 suppression decision 자체를 raw로 직접 보여주지 못함
  - unlock prerequisite: suppression을 기록하는 line 또는 state file snapshot 확보
  - minimum evidence to upgrade: 동일 FAIL 반복 시 2차 전송 억제를 직접 보여주는 raw line/state file 1세트
  - target docs to update after unlock: `OPERATIONS_EVIDENCE.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P1`

- item: `guest sandbox full balance before/after series`
  - current status: `missing`
  - why blocked: guest sandbox proof는 UI/JSON/DB bridge까지는 닫혔지만 BUY 직전·직후·SELL 직후 balance 시계열이 없음
  - unlock prerequisite: `sandbox_balances` 시계열 또는 동등한 balance trace를 추출할 수 있는 경로 확보
  - minimum evidence to upgrade: guest BUY/SELL 전후 KRW 변화 row 3지점 또는 동등한 sanitized trace
  - target docs to update after unlock: `MANUAL_ORDER_EVIDENCE.md`, `sales/guest_sandbox_proof_bundle.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - priority: `P1`

## P2

- item: `guest position qty DB bridge`
  - current status: `unavailable`
  - why blocked: 현재 스키마에는 guest별 포지션 수량을 직접 잇는 저장 구조가 없음
  - unlock prerequisite: 구조 변경 필요
  - minimum evidence to upgrade: user-linked sandbox position row 또는 동등한 guest별 포지션 저장 구조
  - target docs to update after unlock: `MANUAL_ORDER_EVIDENCE.md`, `sales/guest_sandbox_proof_bundle.md`, `sales/evidence_gap_register.md`
  - priority: `P2`
