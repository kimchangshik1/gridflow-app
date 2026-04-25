# GridFlow Changelog

## 이번 문서 라운드의 의미

이번 라운드는 buyer-facing 문서 세트를 현재 코드와 자동 검증 기준에 맞춰 정식화한 라운드입니다. 목표는 “무엇이 실제로 검증됐는지”와 “무엇이 아직 limited인지”를 분리해서 설명하는 것입니다.

## 이번에 추가되거나 명확해진 것

### 1. Integration harness가 buyer-facing 기준선으로 반영됐습니다

현재 문서에는 아래 자동 검증 범위가 반영됩니다.

- auth login, `/auth/me`, logout
- guest / dry / live 구분
- API key 저장 및 적용
- Upbit manual BUY / SELL
- Bithumb manual BUY / SELL
- Grid 1 cycle execution path
- DCA 1 cycle execution path
- pause/resume 기반 backend control path
- Rebalancing `BUY_ONLY` 1 cycle on trigger-reading `run_once` path

이 항목들은 “verified by integration tests”로 표현합니다. “완전 자동화”나 “전체 제품 검증 완료”로 표현하지 않습니다.

### 2. Manual order 구조 설명이 정리됐습니다

manual live order는 “요청 즉시 실거래 submit”이 아니라 아래 구조로 정리됐습니다.

- request 수신
- `planned_orders` 생성
- 후속 gateway submit
- `SUBMITTED`와 관련 상태/활동 evidence 반영

이 구조는 Upbit/Bithumb manual BUY/SELL integration test와 문서에 함께 반영됐습니다.

### 3. 전략 문서가 Grid / DCA / Rebalancing 기준으로 분리됐습니다

- Grid: 1 cycle execution path verified
- DCA: 1 cycle execution path verified
- Rebalancing: `BUY_ONLY` 1 cycle on trigger-reading `run_once` path verified

특히 Rebalancing은 `rebalance-now` force path와 trigger-reading `run_once` path를 구분해서 적도록 정리했습니다.

### 4. Control-plane 설명이 보수적으로 정리됐습니다

- pause/resume 기반 backend control path는 verified by integration tests
- runtime emergency stop 흔적은 documented by evidence
- 전용 backend emergency release endpoint는 현재 문서에서 주장하지 않음

### 5. Known limitation이 buyer-facing으로 명시됐습니다

이번 문서 세트는 아래 한계를 숨기지 않습니다.

- Rebalancing은 `positions`가 아니라 exchange balances를 기준으로 `current_qty`를 sync
- Rebalancing trigger 기준과 execution 기준 총액이 일치하지 않음
- Rebalancing success path에 activity/audit/state log가 없음
- emergency release는 전용 backend endpoint가 아님
- monitor는 별도 auth boundary와 memory session 한계를 가짐

## 아직 limited로 남는 것

- `DRY RUN` 일반 로그인 배지의 buyer-facing 화면 증거
- Rebalancing `SELL` / `BOTH`
- Rebalancing fill-complete 검증
- portfolio final reconciliation 검증
- buyer-facing monitor UI evidence의 두께

## 문서 사용 원칙

현재 buyer-facing 문서에서는 아래 표현을 구분해서 사용합니다.

- verified by integration tests
- documented by evidence
- limited / hold

이 구분을 넘어서 범위를 과장하지 않는 것이 이번 라운드의 핵심입니다.
