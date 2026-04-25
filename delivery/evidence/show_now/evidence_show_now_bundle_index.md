# Evidence Show-Now Bundle Index

기준
- 작성 기준: 2026-04-20 UTC
- 기준 문서:
  - `sales/evidence_delivery_manifest.md`
  - `sales/evidence_one_pager.md`
  - `AUTH_MODE_EVIDENCE.md`
  - `MANUAL_ORDER_EVIDENCE.md`
  - `sales/guest_sandbox_proof_bundle.md`
  - `OPERATIONS_EVIDENCE.md`

## Send Order

- order: `1`
  - file: `sales/evidence_one_pager.md`
  - why send now: 전체 상태를 buyer가 한 장으로 먼저 이해하게 만드는 시작 문서다
  - what it proves: auth/manual/strategy/ops의 confirmed, limited, missing 경계를 압축해서 보여준다
  - caution note: full evidence pack이 아니라 요약 문서다. blocked/missing 항목이 남아 있다는 점을 함께 말해야 한다

- order: `2`
  - file: `AUTH_MODE_EVIDENCE.md`
  - why send now: 로그인, 로그아웃, 세션 유지, 로그인 실패, `GUEST`/`LIVE` 배지까지 화면 근거가 가장 잘 닫힌 축이다
  - what it proves: 메인 auth가 cookie 기반이고, buyer-facing auth UI 근거가 실제 캡처로 존재한다
  - caution note: `DRY RUN` 배지는 아직 없다. `GUEST / DRY RUN / LIVE` 완전 세트처럼 말하면 안 된다

- order: `3`
  - file: `MANUAL_ORDER_EVIDENCE.md`
  - why send now: Upbit/Bithumb manual BUY/SELL의 live DB/log 근거와 buyer-facing guest sandbox 근거를 한 문서에서 분리 설명할 수 있다
  - what it proves: live manual 성공 근거는 DB/log로, guest manual 체감 화면은 sandbox UI로 각각 존재한다
  - caution note: live manual은 DB/log 중심 근거다. guest sandbox UI를 live manual UI처럼 섞어 설명하면 안 된다

- order: `4`
  - file: `sales/guest_sandbox_proof_bundle.md`
  - why send now: guest 주문이 실거래가 아니라 sandbox 경로라는 점을 buyer-facing으로 바로 납득시키기 좋다
  - what it proves: `GUEST` 배지, Upbit/Bithumb BUY/SELL runtime JSON, `sandbox: true`, `sandbox_orders` / `activity_logs` bridge가 함께 있다
  - caution note: 이 문서는 sandbox proof다. live exchange 체결 증거로 전달하면 안 된다

- order: `5`
  - file: `OPERATIONS_EVIDENCE.md`
  - why send now: backup/restore/emergency/health alert/monitor read-only 구조를 buyer에게 설명할 수 있다
  - what it proves: backup dump와 restore verify는 최신 confirmed이고, emergency stop과 health alert는 DB/log/raw 기준으로 설명 가능하다
  - caution note: ops는 일부 buyer-facing UI가 아니라 log/raw 기준이다. health alert suppression은 아직 `limited`다

## Buyer에게 먼저 말할 5줄 요약

- 인증은 cookie 세션 기준으로 정리돼 있고 `GUEST`와 `LIVE`는 실제 화면 캡처가 있다.
- 수동 주문은 Upbit/Bithumb 모두 live DB/log 성공 근거가 있다.
- guest 주문은 별도 proof bundle 기준으로 live가 아니라 sandbox 경로라는 점까지 화면과 DB bridge로 설명 가능하다.
- 전략 엔진은 Grid와 DCA는 DB/log 근거가 있고 Rebalancing은 아직 DRY RUN + code trace 수준이다.
- 운영 쪽은 backup dump, restore verify, emergency stop, health alert 구조까지는 설명 가능하지만 일부 UI 증거는 아직 없다.

## 보내지 말아야 할 internal_hold 1줄 요약

- `DRY RUN` 배지, live manual before/after·UI-DB mapping, 기존 전략 UI, monitor UI, emergency UI처럼 현재 `blocked` 또는 `unavailable`인 항목은 buyer 초기 전달 세트에서 제외한다.
