# Evidence Pack Closeout

## scope completed

- 대단원 4 기준 evidence 전달 구조를 `show_now / diligence_only / internal_hold`로 고정했다.
- buyer-facing auth 캡처 세트를 `GUEST`, `LIVE`, 로그아웃 오버레이 복귀, 새로고침 세션 유지, 로그인 실패까지 확보했다.
- manual order는 live DB/log 성공 근거와 guest sandbox buyer-facing UI/JSON/DB bridge를 분리 정리했다.
- ops는 backup dump 재확인, restore verify 재확인, emergency stop DB/log, health alert dispatch/timer 근거를 raw pack까지 정리했다.
- evidence 전달용 문서 체계를 `master index -> bucket index -> detail evidence` 구조로 정리했다.

## strongest evidence gained

- `AUTH_MODE_EVIDENCE.md`
  - `guest_mode_badge.png`
  - `logout_overlay_return.png`
  - `refresh_session_result.png`
  - `login_error_invalid_credentials.png`
  - `live_mode_badge.png`
- `MANUAL_ORDER_EVIDENCE.md`
  - live manual DB/log: `planned_order_id=97`, `89`, `95`, `87`
  - guest sandbox UI/runtime: Upbit/Bithumb BUY/SELL
  - guest sandbox DB bridge: `sandbox_orders 20~23`, `activity_logs 46520~46523`
- `OPERATIONS_EVIDENCE.md`
  - backup dump `2026-04-20` confirmed
  - restore verify `2026-04-20` confirmed
  - emergency stop `audit_logs.id=238512`
- `sales/evidence_one_pager.md`
  - buyer-facing 한 장 요약으로 auth/manual/strategy/ops strongest set 압축

## blocked items

- `DRY RUN badge capture set`
  - 관리자 dry-run 토글 경로 의존, 현재 safe path 없음
- `live manual before/after / UI-DB mapping`
  - 승인된 안전 테스트 계정/자본/세션 경로 미확인
- `Grid / DCA / Rebal existing strategy UI capture set`
  - guest는 빈 목록, 기존 evidence 전략은 특정 `user_id` 소유
- `monitor buyer-facing UI capture set`
  - 별도 `monitor_session` 로그인 필요, 안전한 테스트 로그인 경로 미확인
- `emergency stop/release UI capture set`
  - 기존 emergency 상태를 read-only로 보여줄 안전 경로 없음

## unavailable items

- `guest position qty DB bridge`
  - `sandbox_balances`는 KRW만 저장
  - `sandbox_orders`는 주문 row만 저장
  - `positions`는 `user_id`가 없음

## what can be shown now

- `sales/evidence_one_pager.md`
  - buyer에게 현재 strongest evidence와 제한사항을 한 장으로 설명 가능
- `AUTH_MODE_EVIDENCE.md`
  - auth/mode 화면 증거와 cookie session 구조 설명 가능
- `MANUAL_ORDER_EVIDENCE.md`
  - live manual DB/log 근거와 guest sandbox buyer-facing 증거를 분리 제시 가능
- `sales/guest_sandbox_proof_bundle.md`
  - guest 주문은 live가 아니라 sandbox라는 점을 buyer-facing으로 설명 가능
- `OPERATIONS_EVIDENCE.md`
  - backup/restore/emergency/health alert/monitor read-only 구조 설명 가능

## what remains HOLD

- `DRY RUN` badge와 `GUEST / DRY RUN / LIVE` 3종 완전 세트
- 기존 strategy UI 캡처
- monitor buyer-facing UI 캡처
- live manual buyer-facing before/after와 UI-DB mapping
- emergency stop/release UI 캡처
- Rebalancing live confirmed
- health alert duplicate suppression direct raw proof

## chapter 4 close verdict

- `complete_but_external_hold_remains`
- 이유:
  - 현재 scope 안에서 auth/manual/ops evidence는 크게 보강됐고 전달 구조 문서도 닫혔다.
  - 다만 external HOLD를 줄 핵심 UI path blocker와 일부 unavailable 항목이 남아 있다.
  - 따라서 현재 범위 기준 close는 가능하지만, buyer-facing 완결성은 아직 일부 hold 상태다.

## next unlock priorities

- 안전한 `DRY RUN` 로그인 경로 확보
- 승인된 live manual 테스트 계정/세션 또는 read-only live UI 경로 확보
- 기존 strategy / monitor용 read-only 캡처 경로 확보

## chapter 8 freeze lock

- 기준 시각: `2026-04-24 UTC`
- 재사용 anchor:
  - `MAJOR2_CLOSEOUT.txt`
  - `SECURITY_GATE_SUMMARY.md`
  - `sales/evidence_delivery_manifest.md`
  - `sales/evidence_unlock_backlog.md`
  - `sales/handoff_scope.md`
  - `GRIDFLOW_RELEASE_QUALITY_GATES.txt`

- 잠금 원칙:
  - 대단원 8에서는 `show_now / diligence_only / internal_hold / closeout / unlock backlog` 구조를 바꾸지 않는다.
  - 새 screenshot/log/DB 근거 또는 blocker 해소가 없으면 bucket 승격, 문서 재배치, 새 bucket 추가를 하지 않는다.
  - 대단원 2, 3, 7 문서는 설명 anchor로만 재사용하고, 대단원 4 evidence bucket 판정을 자동 승격시키지 않는다.

- 이번에 잠근 것:
  - `show_now`는 현재 strongest buyer-facing set만 유지한다.
  - `diligence_only`는 release/gap/strategy/raw binder drill-down용으로 유지한다.
  - `internal_hold`는 blocked/missing/unavailable와 과장 위험 항목을 계속 보관한다.
  - `closeout`는 `complete_but_external_hold_remains` 판정을 유지한다.
  - `unlock backlog`는 다음 evidence uplift 우선순위 목록으로만 유지한다.

- 아직 HOLD 또는 OPEN으로 남기는 것:
  - 이 문서의 `what remains HOLD` 항목 전부
  - `sales/evidence_unlock_backlog.md`의 blocked/missing/unavailable 항목 전부
  - buyer delivery 기본 형식 `clean repo vs tarball`
  - external version naming / final release tag wording

- freeze verdict:
  - `structure_locked_hold_retained`
  - 이유:
    - 대단원 2의 설치/복구 기준선, 대단원 3의 security 판정, 대단원 7의 handoff/support 문구는 재사용 가능하다.
    - 하지만 `GRIDFLOW_RELEASE_QUALITY_GATES.txt` 기준 전체 release gate는 아직 `HOLD`다.
    - 따라서 대단원 8에서는 새 체계를 만들지 않고 기존 evidence 구조만 동결하며, 남은 hold는 그대로 유지한다.
