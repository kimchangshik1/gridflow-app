# Evidence Diligence Bundle Index

기준
- 작성 기준: 2026-04-20 UTC
- 기준 문서:
  - `sales/evidence_delivery_manifest.md`
  - `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - `evidence/raw/INDEX.md`
  - `STRATEGY_EVIDENCE.md`
  - `sales/evidence_gap_register.md`

## Send Order

- order: `1`
  - file: `GRIDFLOW_RELEASE_EVIDENCE.txt`
  - why send on diligence: 전체 release gate 기준, confirmed / limited / missing / blocked 상태를 가장 넓게 보여준다
  - what it proves: auth, manual, strategy, ops 전반의 최신 내부 판정과 raw evidence 반영 상태
  - caution note: buyer-facing 요약이 아니라 내부 release 문체다. blocked/missing/unavailable 항목을 숨기지 않고 읽어야 한다

- order: `2`
  - file: `sales/evidence_gap_register.md`
  - why send on diligence: 영역별 gap과 blocker를 한 장으로 빠르게 설명할 수 있다
  - what it proves: `auth/mode`, `manual order`, `strategy`, `ops/safety`, `monitor`의 current status, strongest evidence, blocker, upgrade 조건
  - caution note: 현재 한계 공개용 문서다. `blocked`와 `unavailable`은 즉시 재현 가능 항목이 아니다

- order: `3`
  - file: `STRATEGY_EVIDENCE.md`
  - why send on diligence: 전략 엔진 근거 수준을 가장 구체적으로 보여준다
  - what it proves: Grid `strategy_id=19`, DCA `strategy_id=8`, Rebalancing `strategy_id=4`의 DB/log/code trace 수준 근거
  - caution note: Rebalancing은 `live confirmed`가 아니라 `dry-run confirmed + trigger/code trace`다. strategy UI 부족은 blocker와 함께 설명해야 한다

- order: `4`
  - file: `evidence/raw/INDEX.md`
  - why send on diligence: 실사자가 raw artifact까지 내려가 확인할 수 있는 인덱스다
  - what it proves: screenshot / db / log / doc 자산의 존재 여부와 관련 row id, 파일명, 상태
  - caution note: 내부 파일 경로, row id, raw asset 이름이 직접 보인다. buyer 초기 미팅용이 아니라 실사 drill-down용이다

- order: `5`
  - file: `sales/evidence_delivery_manifest.md`
  - why send on diligence: 왜 어떤 자료는 지금 보여주고 어떤 자료는 hold인지 bucket 기준을 설명한다
  - what it proves: `show_now`, `diligence_only`, `internal_hold` 분리 원칙과 전달 경계
  - caution note: strategy/monitor/emergency UI 부족, live manual buyer-facing 부족 같은 blocker 설명을 포함하므로 요약 문서보다 더 보수적으로 읽어야 한다

## Buyer가 실사에서 물을 가능성 높은 질문 5개

- 질문: `지금 실제로 buyer-facing으로 닫힌 증거와 아직 안 닫힌 증거를 한눈에 어디서 보나?`
  - 연결 문서: `sales/evidence_gap_register.md`

- 질문: `전략 엔진은 실제로 어디까지 동작 근거가 있고, 왜 UI 캡처는 없나?`
  - 연결 문서: `STRATEGY_EVIDENCE.md`

- 질문: `Rebalancing은 live로 검증된 것인가, 아니면 dry-run 수준인가?`
  - 연결 문서: `STRATEGY_EVIDENCE.md`

- 질문: `raw 로그, DB row, 캡처 파일까지 직접 따라가려면 어디를 보면 되나?`
  - 연결 문서: `evidence/raw/INDEX.md`

- 질문: `왜 monitor, emergency UI, live manual before/after 같은 항목은 아직 전달 세트에 없나?`
  - 연결 문서: `sales/evidence_delivery_manifest.md`
