# Evidence Package Master Index

## purpose

- 먼저 열 문서: `sales/evidence_delivery_manifest.md`
- 왜 이 bucket인가: 대단원 4 evidence를 `show_now / diligence_only / internal_hold`로 나누는 기준 문서다
- 무엇을 증명하는가: 지금 바로 보여줄 것, 추가 실사 때만 보여줄 것, 아직 보내지 말아야 할 것을 한 번에 구분한다
- 주의점: 이 문서는 evidence 본문이 아니라 전달 구조 안내 문서다

## show_now entry

- 먼저 열 문서: `sales/evidence_show_now_bundle_index.md`
- 왜 이 bucket인가: buyer 미팅 직후 바로 보낼 최소 세트를 실제 전달 순서대로 정리한 인덱스다
- 무엇을 증명하는가: auth, manual, guest sandbox, ops에서 지금 설명 가능한 strongest set이 무엇인지 보여준다
- 주의점: guest sandbox는 live와 혼동하면 안 되고, live manual은 DB/log 중심 근거라는 점을 같이 말해야 한다

## diligence_only entry

- 먼저 열 문서: `sales/evidence_diligence_bundle_index.md`
- 왜 이 bucket인가: buyer가 추가 실사를 요청했을 때 raw binder와 내부 release/gap 문서를 어떤 순서로 볼지 정리한 인덱스다
- 무엇을 증명하는가: release 판정, gap register, strategy 근거, raw index까지 drill-down 가능한 구조가 있다는 점을 보여준다
- 주의점: blocked / missing / unavailable는 현재 한계 공개용이며, 즉시 재현 가능한 항목이 아니다

## internal_hold entry

- 먼저 열 문서: `sales/evidence_internal_hold_bundle_index.md`
- 왜 이 bucket인가: 지금 buyer에게 보내지 말아야 할 항목과 unlock 조건을 내부 기준으로 정리한 문서다
- 무엇을 증명하는가: 아직 blocked, missing, unavailable인 핵심 evidence가 무엇인지와 왜 hold인지 보여준다
- 주의점: 이 문서는 외부 전달용이 아니라 내부 우선순위와 리스크 관리용이다

## current external HOLD summary

- 먼저 열 문서: `sales/evidence_gap_register.md`
- 왜 이 bucket인가: 현재 external HOLD를 만드는 blocker를 영역별로 가장 짧게 고정한 문서다
- 무엇을 증명하는가:
  - `DRY RUN` badge blocked
  - strategy UI blocked
  - monitor UI blocked
  - live manual buyer-facing blocked
  - emergency UI blocked
- 주의점: 절대 불가능이 아니라 현재 repo/docs/evidence 범위에서 safe path unavailable 또는 blocked 상태로 읽어야 한다

## next unlock priorities

- 먼저 열 문서: `sales/evidence_internal_hold_bundle_index.md`
- 왜 이 bucket인가: 다음 evidence uplift를 어디서 시작할지 내부 우선순위를 고정한다
- 무엇을 증명하는가:
  - 안전한 `DRY RUN` 로그인 경로 확보
  - 승인된 live manual 테스트 계정/세션 또는 read-only live UI 경로 확보
  - 기존 strategy / monitor용 read-only 캡처 경로 확보
- 주의점: 위 3개는 현재 hold를 푸는 우선순위이며, 확보 전에는 buyer-facing 증거로 승격하면 안 된다
