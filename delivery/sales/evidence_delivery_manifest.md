# Evidence Delivery Manifest

기준
- 작성 기준: 2026-04-20 UTC
- 기준 문서:
  - `sales/evidence_one_pager.md`
  - `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - `evidence/raw/INDEX.md`
  - `sales/guest_sandbox_proof_bundle.md`
  - `sales/evidence_gap_register.md`
- 원칙:
  - buyer에게 바로 보여줄 수 있는 핵심만 `show_now`
  - raw binder 성격, DB/log 중심 상세, 내부 release 판정은 `diligence_only`
  - blocked / missing / unavailable 또는 과장 위험 항목은 `internal_hold`

## show_now

- file: `sales/evidence_one_pager.md`
  - purpose: auth/manual/strategy/ops 전체 상태를 buyer가 한 장으로 빠르게 이해하게 함
  - why this bucket: confirmed와 limited 경계가 이미 압축돼 있고 직접 대화용 요약으로 적합
  - risk note: blocked/missing 항목이 남아 있으므로 full evidence pack처럼 제시하면 과장 위험이 있음

- file: `sales/guest_sandbox_proof_bundle.md`
  - purpose: guest 경로가 live가 아니라 sandbox 주문 경로라는 점을 buyer-facing으로 설명
  - why this bucket: auth/manual buyer-facing 캡처와 runtime/DB bridge가 함께 묶여 있어 즉시 제시 가능
  - risk note: live manual evidence와 혼동되지 않게 반드시 `sandbox proof`로만 설명해야 함

- file: `AUTH_MODE_EVIDENCE.md`
  - purpose: 로그인, 로그아웃, 세션 유지, 로그인 실패, `GUEST`/`LIVE` 배지 근거 제시
  - why this bucket: auth는 화면 캡처와 코드 근거가 충분히 닫힌 편이라 buyer-facing 설명에 바로 사용 가능
  - risk note: `DRY RUN` 배지는 아직 blocked라 3종 완전 세트처럼 제시하면 안 됨

- file: `MANUAL_ORDER_EVIDENCE.md`
  - purpose: Upbit/Bithumb manual BUY/SELL의 live DB/log 근거와 guest sandbox buyer-facing 근거를 분리 제시
  - why this bucket: 현재 manual evidence의 strongest set이 한 문서에 정리돼 있음
  - risk note: live buyer-facing before/after와 UI-DB mapping은 아직 없으므로 live UI proof처럼 제시하면 안 됨

- file: `OPERATIONS_EVIDENCE.md`
  - purpose: backup/restore/emergency/health alert/monitor read-only 구조를 buyer에게 설명
  - why this bucket: backup dump와 restore verify는 최신 confirmed 상태이고 ops 핵심을 한 문서에서 설명 가능
  - risk note: health alert suppression은 `limited`, emergency/monitor UI는 blocked 상태임

## diligence_only

- file: `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - purpose: 내부 release gate/evidence 기준으로 전체 confirmed/limited/missing을 추적
  - why this bucket: buyer one-pager보다 상세하고 내부 release 문체가 강함
  - risk note: buyer 초기 미팅에서 바로 보내면 내부 hold와 blocker가 과도하게 노출될 수 있음

- file: `evidence/raw/INDEX.md`
  - purpose: raw evidence binder 인덱스로 실제 screenshot/log/db/doc 자산 위치를 추적
  - why this bucket: diligence 단계에서 raw artifact drill-down용으로 적합
  - risk note: raw asset 이름, row id, 내부 파일 경로가 직접 노출됨

- file: `STRATEGY_EVIDENCE.md`
  - purpose: Grid/DCA/Rebalancing 근거 수준을 DB/log 중심으로 상세 설명
  - why this bucket: buyer에게는 useful하지만 현재는 화면 캡처 부족과 Rebalancing live 부재가 커서 diligence 설명용이 더 적합
  - risk note: strategy UI blocked 상태를 함께 설명하지 않으면 과장으로 보일 수 있음

- file: `sales/evidence_gap_register.md`
  - purpose: confirmed/limited/missing/blocked/unavailable을 영역별로 고정
  - why this bucket: diligence에서 남은 gap을 투명하게 설명할 때 유용
  - risk note: buyer 초기 단계에서 바로 제시하면 blocker register로 받아들여질 수 있음

## internal_hold

- file: `live manual buyer-facing before/after / UI-DB mapping`
  - purpose: live manual 체감 증거 보강
  - why this bucket: 현재 safe capture path unavailable, 승인된 안전 테스트 계정/자본/세션 경로 미확인
  - risk note: 없는 증거를 암시하거나 guest sandbox와 혼동하면 신뢰 손상 위험이 큼

- file: `DRY RUN badge capture set`
  - purpose: `GUEST / DRY RUN / LIVE` 3종 완전 세트 마감
  - why this bucket: 관리자 dry-run 토글 경로 의존으로 현재 blocked
  - risk note: 현재 buyer에게 약속하면 즉시 재현 가능한 것처럼 오해될 수 있음

- file: `Grid / DCA / Rebalancing existing strategy UI capture set`
  - purpose: 기존 전략 카드/상세 buyer-facing 화면 확보
  - why this bucket: guest는 빈 목록, 기존 evidence 전략은 특정 `user_id` 소유라 현재 safe capture path unavailable
  - risk note: DB/log 근거만 있는 상태에서 UI까지 있는 것처럼 보이면 과장 위험이 큼

- file: `monitor buyer-facing UI capture set`
  - purpose: recent orders/activity/error/filter read-only 화면 제시
  - why this bucket: 별도 `monitor_session` 로그인 필요, 현재 안전한 monitor 테스트 로그인 경로 미확인으로 blocked
  - risk note: monitor 접근 경계와 인증 구조를 잘못 전달할 위험이 있음

- file: `emergency stop/release UI capture set`
  - purpose: 전역 stop/release 상태를 화면으로 제시
  - why this bucket: DB/log 근거는 있으나 기존 상태를 read-only로 보여줄 safe path unavailable
  - risk note: 상태 변경 버튼 경로를 증거 수집용으로 쓰면 buyer-facing read-only evidence 원칙을 깨게 됨
