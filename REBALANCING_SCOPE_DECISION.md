# Rebalancing Scope Decision

## 1. 목적

이 문서는 Rebalancing의 남은 HOLD를 제품 범위, limitation, 선택적 검증 후보, 구조 이슈로 분리해 불필요한 확장 개발과 과장된 buyer-facing 설명을 막기 위한 decision 문서다.

- source of truth는 현재 코드 경로, integration test, existing gate/closeout/limitation 문서다.
- 이번 결정은 코드 수정이나 테스트 추가를 지시하지 않는다.
- 핵심 원칙은 `verified baseline`과 `documented limitation`을 분리하는 것이다.

## 2. 현재 verified 범위

현재 verified baseline은 trigger-reading `run_once()` path의 `BUY_ONLY` 1 cycle이다.

- 검증 경로: `tests/integration/test_rebalancing_cycle.py`
- 엔진 경로: `app/strategy/rebalancing_engine.py`의 `run_once()` -> `_run_loaded_strategy(..., force=False)` -> `_execute_rebalance()`
- 아래 항목이 곧 `A. 지금 제품 설명에 포함 가능` 범위다.
- exchange balance 기준 `current_qty` sync
- threshold read / due 판단
- `BUY_ONLY` decision
- buy order submit
- `rebalancing_orders` row 생성
- `rebalancing_strategies.last_rebal_at`, `rebal_count`, `total_value_krw` update
- `rebalancing_assets.current_pct`, `current_value_krw`, `avg_price` snapshot update

아래 매트릭스는 남은 쟁점을 현재 release 기준으로 분류한 결과다.

| 대상 | 분류 | 결정 |
| --- | --- | --- |
| `SELL` | `B` | limitation/disclose-only로 고정 |
| `BOTH` | `B` | limitation/disclose-only로 고정 |
| `rebalance-now` force path | `C` | optional P1 validation candidate |
| fill-complete verification | `B` | limitation/disclose-only로 고정 |
| portfolio final reconciliation | `B` | limitation/disclose-only로 고정 |
| `positions` 연계 여부 | `D` | 구조 수정 없이는 의미 없는 항목 |
| `current_qty/current_pct/current_value_krw` 의미 | `D` | 구조 수정 없이는 의미 없는 항목 |
| trigger 총액 기준 vs execution 총액 기준 | `D` | 구조 수정 없이는 의미 없는 항목 |
| success path log 부재 | `D` | 구조 수정 없이는 의미 없는 항목 |

## 3. limitation으로 고정할 항목

아래 항목은 지금 제품 설명에 포함해 범위를 넓히기보다 limitation/disclose-only로 고정하는 것이 맞다.

### `SELL`

- 코드상 실행 경로는 있지만 현재 verified baseline이나 buyer-facing evidence는 없다.
- 지금 필요한 결정은 `검증 확대`가 아니라 `verified claim 비확대`다.

### `BOTH`

- `BUY_ONLY`와 동일 강도로 검증됐다고 설명하면 과장이다.
- 현재 release에서는 limitation으로 남기는 편이 더 정확하다.

### fill-complete verification

- 현재 baseline은 decision/submit까지다.
- `run_once()`에 `SUBMITTED -> FILLED` 상태 업데이트 루프는 있지만, 지금 제품 설명을 체결 완료 보장까지 올릴 필요는 없다.
- 구조적으로 얇은 success evidence를 감안하면 현 단계에서는 limitation으로 고정하는 편이 맞다.

### portfolio final reconciliation

- 현재 verified 범위는 최종 포트폴리오 정렬 완료가 아니라 cycle 진입, 판단, submit, 일부 snapshot update다.
- 최종 포트폴리오가 target에 정렬됐다고 말하면 현 구조와 문서 범위를 넘는다.

## 4. optional P1 validation candidate

### `rebalance-now` force path

- public route와 코드 경로는 이미 존재한다.
- `app/api/rebalancing_routes.py`의 `rebalance-now`는 `execute_strategy_now()`를 호출하고, 이는 `_run_loaded_strategy(..., force=True)`로 trigger를 우회한다.
- `STRATEGY_EVIDENCE.md`에는 이 force path의 운영 evidence가 있다.
- 다만 현재 verified baseline은 auto trigger-reading path이므로, `rebalance-now`를 제품 핵심 claim으로 끌어올릴 필요는 없다.
- 즉, 이 항목은 `지금 꼭 해야 하는 작업`이 아니라, buyer-facing 수동 실행 스토리를 더 강하게 유지하고 싶을 때만 검토할 optional P1 candidate다.

지금 당장 추가 검증할 가치가 있다면 이 항목 하나만 좁게 다루는 것이 맞다. 반대로 `SELL/BOTH/fill-complete/final reconciliation`부터 넓히는 것은 현재 release 목적과 맞지 않는다.

## 5. 구조 수정 없이는 의미 없는 항목

아래 항목은 증거를 조금 더 모으거나 테스트 한두 개를 추가해도 buyer-facing 의미가 크게 좋아지지 않는다. 구조나 semantics를 먼저 바꾸지 않으면 validation 자체가 제한적이다.

### `positions` 연계 여부

- 현재 Rebalancing은 `positions`를 canonical holdings ledger로 쓰지 않는다.
- 실제 실행은 exchange balances를 읽어 `current_qty`를 sync하는 방식이다.
- 따라서 `positions` 연계를 더 검증하는 것보다, 제품 설명에서 이 경계를 고정하는 편이 우선이다.

### `current_qty/current_pct/current_value_krw` 의미

- `current_qty`는 exchange-balance sync 결과로 읽어야 한다.
- `current_pct`와 `current_value_krw`는 submit 이후 target-state 재계산 값이 아니다.
- 이 필드를 최종 portfolio truth처럼 해석하지 못하게 막는 것이 더 중요하다.

### trigger 총액 기준 vs execution 총액 기준

- trigger 판단은 자산 가치 합 기준으로 이뤄지고, execution은 KRW balance를 포함한 총액 기준으로 진행된다.
- 이 불일치는 설계 차이이며, 검증을 늘린다고 사라지지 않는다.

### success path log 부재

- 현재 success evidence의 중심은 `rebalancing_orders`와 strategy/asset field update다.
- `activity_logs` / `audit_logs` / richer state log가 충분하지 않기 때문에, 감사 추적성 claim을 강화하려면 logging seam 자체를 먼저 바꿔야 한다.

지금 하지 말아야 할 것은 위 구조 항목을 `validation 카드`로 오해해 억지로 검증 범위를 넓히는 것이다.

## 6. buyer-facing wording guide

### 써도 되는 표현

- Rebalancing의 현재 verified baseline은 trigger-reading `run_once()` path의 `BUY_ONLY` 1 cycle입니다.
- 이 범위에서는 `current_qty` sync, threshold read, submit path, strategy/asset snapshot update가 확인됐습니다.
- `rebalance-now`는 trigger를 우회하는 separate force path로 문서화돼 있습니다.
- Rebalancing의 일부 broader path는 limitation으로 공개하고 있습니다.

### 쓰면 안 되는 표현

- Rebalancing 전체가 end-to-end verified 됐습니다.
- `SELL`과 `BOTH`도 현재 출고 범위에서 검증 완료입니다.
- fill-complete와 final portfolio reconciliation까지 보장합니다.
- `rebalance-now`가 auto trigger path와 같은 강도로 검증됐습니다.
- `positions`가 Rebalancing의 canonical holdings source입니다.
- `current_pct`와 `current_value_krw`는 제출 후 최종 목표 상태를 그대로 보여줍니다.
- trigger 기준 총액과 execution 기준 총액은 동일합니다.
- success path에는 충분한 activity/audit/state log가 남습니다.

## 7. support/scope implication

- 무상 결함 수정의 기본 판단 축은 현재 verified baseline인 `BUY_ONLY` 1 cycle trigger-reading path에 두는 것이 맞다.
- `SELL/BOTH/fill-complete/final reconciliation`은 숨겨진 결함 수정 backlog가 아니라, 현재는 limitation으로 공개된 범위다.
- `rebalance-now`는 optional validation 없이도 route existence와 separate force path라는 수준으로는 설명 가능하지만, stronger verified claim으로 승격하면 별도 검증이 필요하다.
- `positions` semantics, snapshot semantics, total-basis mismatch, success-path logging은 quick validation이나 문구 보정만으로 해결할 수 있는 성격이 아니다.

## 8. 최종 권고

- 현 상태로도 limitation을 명시한다는 전제 아래 Rebalancing은 출고 가능 범위에 남길 수 있다.
- 추가 검증 없이도 되는 범위는 trigger-reading `run_once()`의 `BUY_ONLY` 1 cycle과 그 안의 `current_qty` sync, threshold read, submit, strategy/asset snapshot update다.
- 추가 검증 전에 주장하면 안 되는 범위는 `SELL`, `BOTH`, fill-complete, final reconciliation, `positions` 기반 holdings truth, post-submit final-state meaning, rich auditability다.
- optional P1이 꼭 하나 필요하다면 `rebalance-now` force path만 좁게 검토하고, 그 외 항목은 지금 release에서는 limitation 또는 structural issue로 고정하는 것이 맞다.
