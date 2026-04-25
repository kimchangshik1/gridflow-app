# Evidence Internal-Hold Bundle Index

기준
- 작성 기준: 2026-04-20 UTC
- 기준 문서:
  - `sales/evidence_delivery_manifest.md`
  - `sales/evidence_gap_register.md`
  - `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - `sales/safe_capture_path_note.md`

## Final Hold Order

- order: `1`
  - item: `DRY RUN badge capture set`
  - why hold: `GUEST / DRY RUN / LIVE` 완전 세트의 마지막 조각이지만 현재 buyer-facing 증거로는 닫히지 않았다
  - current status: `blocked`
  - what would unlock it: 관리자 `dry-run` 토글을 안전하게 쓸 수 있는 테스트 경로 또는 재현 가능한 `DRY RUN` 로그인 세션 확보

- order: `2`
  - item: `live manual before/after / UI-DB mapping`
  - why hold: live manual은 DB/log 성공 근거는 있으나 buyer-facing 체감 증거는 아직 없다
  - current status: `blocked`
  - what would unlock it: 승인된 안전 테스트 계정/자본/세션 또는 기존 live row를 안전하게 조회할 read-only UI 경로 확보

- order: `3`
  - item: `Grid / DCA / Rebal existing strategy UI capture set`
  - why hold: 기존 전략 evidence는 DB/log로는 있으나 buyer-facing 기존 전략 카드/상세는 현재 안전하게 재현할 수 없다
  - current status: `blocked`
  - what would unlock it: 기존 전략 소유 계정의 안전한 read-only 캡처 경로 또는 별도 seeded demo 전략 계정 확보

- order: `4`
  - item: `monitor buyer-facing UI capture set`
  - why hold: monitor read-only 구조 설명은 가능하지만 화면 캡처용 안전 로그인 경로가 없다
  - current status: `blocked`
  - what would unlock it: 안전한 `monitor_session` 테스트 로그인 또는 sanitized demo monitor 경로 확보

- order: `5`
  - item: `emergency stop/release UI capture set`
  - why hold: DB/log 근거는 있으나 기존 emergency 상태를 read-only로 화면에 보여줄 경로가 없다
  - current status: `blocked`
  - what would unlock it: 기존 상태를 읽기 전용으로 보여주는 운영/monitor 경로 또는 별도 safe demo state 확보

- order: `6`
  - item: `Rebalancing live confirmed evidence`
  - why hold: Rebalancing은 아직 `dry-run confirmed + trigger/code trace` 수준이며 live confirmed가 아니다
  - current status: `missing`
  - what would unlock it: live Rebalancing 주문/상태 근거 1건 또는 buyer-facing DRY RUN 화면과 별도 live trace 확보

- order: `7`
  - item: `latest emergency stop-release pair evidence`
  - why hold: stop와 reset 각각의 근거는 있으나 최신 `2026-04-18` incident를 직접 잇는 pair trace는 없다
  - current status: `missing`
  - what would unlock it: 같은 incident를 연결하는 audit/log pair 또는 운영 trace 확보

- order: `8`
  - item: `health alert duplicate suppression direct raw proof`
  - why hold: 발송 line과 timer/journal 근거는 있으나 suppression decision 자체를 raw로 직접 보여주지 못한다
  - current status: `missing`
  - what would unlock it: duplicate suppression을 직접 보여주는 line 또는 state file snapshot 확보

- order: `9`
  - item: `guest sandbox full balance before/after series`
  - why hold: guest sandbox proof는 UI/JSON/DB bridge까지는 닫혔지만 balance 시계열 전체는 아직 없다
  - current status: `missing`
  - what would unlock it: BUY 직전 / BUY 직후 / SELL 직후를 잇는 `sandbox_balances` 시계열 또는 별도 balance trace 확보

- order: `10`
  - item: `guest position qty DB bridge`
  - why hold: guest sandbox UI/runtime에는 수량 단서가 있지만 현재 DB 스키마로는 user별 포지션 row에 직접 연결할 수 없다
  - current status: `unavailable`
  - what would unlock it: user-linked sandbox position schema 또는 guest별 position row를 남기는 별도 저장 구조
