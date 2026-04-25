# Evidence Visibility Lock

상태
- 대단원 4 구조 재사용
- 대단원 8에서 새 taxonomy 추가 없이 visibility만 잠금
- security HOLD가 남아 있으므로 evidence visibility lock은 final freeze 선언이 아니다

1. show_now

실제 staging 위치
- `delivery/evidence/show_now/evidence_show_now_bundle_index.md`
- `delivery/evidence/show_now/evidence_one_pager.md`
- `delivery/evidence/show_now/AUTH_MODE_EVIDENCE.md`
- `delivery/evidence/show_now/MANUAL_ORDER_EVIDENCE.md`
- `delivery/evidence/show_now/guest_sandbox_proof_bundle.md`
- `delivery/evidence/show_now/OPERATIONS_EVIDENCE.md`

설명 규칙
- one-pager로 먼저 열고, auth -> manual -> guest sandbox -> ops 순서만 유지한다.
- guest sandbox는 live proof로 승격하지 않는다.
- live manual은 DB/log 근거, guest manual은 sandbox proof로 분리해 말한다.

2. diligence_only

실제 staging 위치
- `delivery/evidence/diligence_only/GRIDFLOW_RELEASE_EVIDENCE.txt`
- `delivery/evidence/diligence_only/STRATEGY_EVIDENCE.md`
- `delivery/evidence/diligence_only/evidence_gap_register.md`
- `delivery/evidence/diligence_only/evidence_delivery_manifest.md`
- `delivery/evidence/diligence_only/raw/INDEX.md`
- `delivery/evidence/diligence_only/raw/`

보조 문서
- `delivery/sales/evidence_package_master_index.md`
- `delivery/sales/evidence_diligence_bundle_index.md`

설명 규칙
- diligence_only는 요청 시에만 보낸다.
- raw index, release evidence, gap register는 blocker와 limitation을 감추지 않는 방식으로만 사용한다.

3. internal_hold

현재 미포함 항목
- `DRY RUN badge capture set`
- `live manual before/after / UI-DB mapping`
- `Grid / DCA / Rebal existing strategy UI capture set`
- `monitor buyer-facing UI capture set`
- `emergency stop/release UI capture set`
- `Rebalancing live confirmed evidence`
- `latest emergency stop-release pair evidence`
- `health alert duplicate suppression direct raw proof`
- `guest sandbox full balance before/after series`
- `guest position qty DB bridge`

설명 규칙
- internal_hold는 `delivery/`에 actual capture나 binder를 넣지 않는다.
- `sales/evidence_internal_hold_bundle_index.md`는 내부 추적용이므로 이번 delivery tree에 포함하지 않는다.

4. internal-only retained outside delivery

- `sales/evidence_pack_closeout.md`
- `sales/evidence_unlock_backlog.md`
- `sales/evidence_internal_hold_bundle_index.md`

의미
- `closeout`와 `unlock backlog`는 이번 delivery tree 밖에서만 유지한다.
- buyer-facing tree는 `show_now`와 `diligence_only`만 실제 staging하고, `internal_hold`는 문서로만 잠근다.
