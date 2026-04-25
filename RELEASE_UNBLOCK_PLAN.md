# RELEASE UNBLOCK PLAN

## 1. 목적

이 문서는 현재 남아 있는 HOLD를 아래 네 가지로 다시 분류해, 무엇이 진짜 external release blocker인지와 무엇이 문서화 가능한 limitation인지 구분하기 위한 계획 문서다.

- `A`: external release hard blocker
- `B`: external release soft hold but acceptable if disclosed
- `C`: buyer demo / evidence reinforcement item
- `D`: post-sale or later backlog

핵심 목적은 두 가지다.

1. blocker를 부풀리지 않고, 실제 출고를 막는 항목만 따로 분리한다.
2. 가장 적은 작업으로 HOLD를 줄일 수 있는 다음 작업 3개를 고정한다.

## 2. 현재 전체 gate 상태 요약

현재 gate 상태는 아래와 같다.

- `runtime`: `PASS`
- `ops`: `HOLD`
- `security`: `HOLD`
- `tests`: `PASS`
- `docs`: `PASS`
- `evidence`: `HOLD`
- 전체 release gate: `HOLD`

현재 HOLD의 성격은 “즉시 출고 불가를 뜻하는 hard blocker”보다는 아래 두 가지에 더 가깝다.

- external 설명 시 반드시 제한을 공개해야 하는 soft hold
- buyer demo / evidence 두께 부족

즉, 현재 상태는 “무조건 외부 공유 금지”라기보다 “범위를 좁혀서만 외부 공유 가능”에 가깝다.

## 3. 최근 evidence 재분류

### closed by recent evidence

- `DRY RUN` 일반 로그인 배지 evidence
  - `AUTH_MODE_EVIDENCE.md`와 `evidence/raw/auth/dry_run_mode_badge.png`, `dry_run_mode_context.png`, `dry_run_mode_auth_me.json` 기준으로 닫혔다.
  - 일반 로그인, `is_guest=false`, `is_dry_run=true` safe capture가 확보됐다.
  - 단 provenance는 공개 런타임이 아니라 local synthetic safe capture라는 note를 계속 남긴다.
- health alert duplicate suppression buyer-facing direct proof
  - `evidence/raw/ops/health_alert_duplicate_suppression.txt`와 `health_alert_duplicate_context.txt` 기준으로 닫혔다.
  - repeated unit run 사이에서 같은 alert line이 반복되지 않고, problem set 변경 시에만 다음 alert line이 생기는 direct raw가 확보됐다.
  - recipient-side delivery proof는 별도 optional evidence일 뿐, 이 항목을 다시 HOLD로 돌릴 이유는 아니다.
- monitor buyer-facing UI evidence
  - `monitor_login_entry.png`, `monitor_postlogin_overview.png`, `monitor_orders_activity_filter.png`, `monitor_authenticated_login_flow.txt`, `monitor_auth_status.json`, `monitor_authenticated_home_runtime.png`, `monitor_authenticated_orders_activity_runtime.png`가 현재 raw pack에 함께 존재한다.
  - login entry, post-login UI, orders/activity/filter safe capture, authenticated login-flow raw가 모두 있으므로 “monitor buyer-facing UI evidence 약함”은 recent evidence로 닫힌다.
- monitor authenticated runtime proof
  - `monitor_authenticated_login_flow.txt` 기준으로 controlled local runtime에서 `POST /monitor/login -> Set-Cookie -> GET /monitor -> GET /monitor/orders -> GET /monitor/activity` authenticated 200 흐름이 확인됐다.
  - 더 정확한 현재 표현은 `authenticated runtime proof exists in controlled local runtime`이다.
  - 남는 note는 evidence absence가 아니라 deployed provenance / session durability / multi-instance / tier claim의 범위다.

### softened but still HOLD

- monitor deployed provenance / session durability / multi-instance / tier claim boundary
  - authenticated runtime proof exists in controlled local runtime.
  - 다만 deployed live operator provenance not yet captured, restart 후 session durability not proven, multi-instance coherence not proven, tier proof not yet captured 상태는 그대로 남아 있다.
  - 즉 남은 HOLD의 본질은 controlled local proof를 가진 상태에서 무엇을 external claim으로 올리지 않을 것인가다.
  - monitor를 production-grade durable auth architecture처럼 쓰지 않는 wording discipline이 계속 필요하다.
- runtime emergency stop narrative vs backend contract gap
  - `evidence/raw/ops/control_path_alignment_note.md`로 verified backend control path와 runtime safeguard boundary를 buyer-facing 문구에서 분리 공개할 수 있게 됐다.
  - dedicated backend emergency release endpoint 부재와 runtime safeguard != buyer-facing backend contract라는 경계는 계속 남는다.
  - 현재 표현은 “혼선 큼”이 아니라 `boundary disclosed but still limited`가 정확하다.

### unchanged HOLD

- Rebalancing `SELL`
- Rebalancing `BOTH`
- Rebalancing fill-complete
- portfolio final reconciliation
- Rebalancing positions/current_qty/current_pct/current_value semantics
- monitor memory session / multi-instance coherence limitation

## 4. active HOLD 항목 분류표

| HOLD 항목 | 분류 | 왜 blocker인지 / 왜 아닌지 | 미공개 시 buyer 리스크 | 해결/보강 난이도 | 의존성 |
| --- | --- | --- | --- | --- | --- |
| backend emergency release 전용 endpoint 부재 | `B` | 현재 제품은 pause/resume 대응 구조로 설명 가능하므로 hard blocker는 아니다. 다만 없는 endpoint를 있는 것처럼 말하면 즉시 문제다. | 사고 대응 방식에 대한 오해, 구매 후 통제 기대 불일치 | `Medium` | control-plane 설명 일관성 |
| current control path = Grid/DCA pause-resume 대응 구조 | `B` | 이것은 결함보다 현재 계약 경계다. 정확히 공개하면 출고 가능하다. | “전역 stop/release 제품”으로 오인 | `Low` | README/API/OPERATIONS 일관성 유지 |
| Rebalancing `SELL` 미검증 | `B` | 현재 README/SUPPORT_SCOPE에서 limited로 둘 수 있으므로 hard blocker는 아니다. | buyer가 Rebalancing 전체 축이 같은 강도로 검증됐다고 오해 | `Medium` | rebalancing 범위 문구 유지 |
| Rebalancing `BOTH` 미검증 | `B` | 위와 동일. 현재 범위 밖으로 명시하면 출고 가능하다. | live 운용 시 unsupported path 기대 | `Medium` | rebalancing 범위 문구 유지 |
| Rebalancing fill-complete 미검증 | `B` | 1 cycle decision/submit까지만 검증했다고 이미 좁혀 설명 가능하다. | 체결 완료와 후속 상태 반영까지 보장된다고 오해 | `Medium` | rebalancing 범위 문구 유지 |
| portfolio final reconciliation 미검증 | `B` | 현재 제품 설명을 decision/submit 수준으로 제한하면 hard blocker는 아니다. | 리밸런싱 후 최종 포트폴리오 정렬이 검증된 것으로 오해 | `Medium` | rebalancing 범위 문구 유지 |
| Rebalancing positions 미사용 / balance sync 기준 | `D` | 구조 문제다. 현재는 limitation으로 공개 가능하지만, 없애려면 설계 변경이 필요하다. | holdings 해석 오류, 운영자 오판 | `High` | rebalancing model 재정의 |
| trigger 총액 기준 vs execution 총액 기준 불일치 | `D` | 코드/데이터 모델 정합성 이슈다. 당장 문서화는 가능하지만 수정은 구조 작업이다. | trigger와 주문 금액 차이에 대한 신뢰 저하 | `High` | strategy logic 변경, 검증 재작성 |
| `current_pct/current_value_krw` 목표 상태 재계산 아님 | `D` | snapshot semantics 문제다. evidence 보강으로 해결되지 않는다. | 리밸런싱 완료 상태를 잘못 해석 | `High` | post-submit recalculation 설계 |
| Rebalancing success path log 부재 | `D` | audit trail 자체가 얇다. 해결하려면 프로덕션 로깅 seam 추가가 필요하다. | 운영 감사와 추적성 기대 불일치 | `Medium` | app/engine logging 변경 |
| monitor deployed live operator provenance / tier proof 미확보 | `C` | controlled local runtime 기준 authenticated runtime proof exists. 남은 것은 deployed live operator provenance와 tier proof 두께이며, hard blocker는 아니다. | buyer가 현재 proof를 “운영 계정으로 배포 인스턴스에 직접 로그인한 증거”나 tier-validated proof로 오해 | `Low` | safe deployed capture 또는 provenance note |
| monitor memory session / multi-instance coherence limitation | `D` | 현 single-instance install-and-handoff 모델에서는 공개 limitation으로 관리 가능하다. controlled local runtime proof와 별개로, 구조적으로 풀려면 세션 저장소 재설계가 필요하다. | scale-out 오해, 운영 구조 오판 | `High` | monitor auth/session redesign |
| runtime emergency stop narrative vs backend contract gap | `B` | alignment note로 boundary disclosed 상태까지는 정리됐다. 남은 이슈의 본질은 evidence 부족보다 contract 경계를 넘겨 말하지 않는 일이다. | “runtime safeguard”와 “backend control API”를 혼동 | `Low` | external wording discipline |

## 5. hard blocker 목록

현재 판단상 `A. external release hard blocker`는 없다.

다만 아래 조건이 생기면 즉시 hard blocker로 승격된다.

- 외부 문서나 데모에서 전용 backend emergency release endpoint가 있다고 주장하는 경우
- Rebalancing을 `SELL/BOTH/fill-complete/final reconciliation`까지 검증된 기능처럼 판매하는 경우
- monitor를 multi-instance friendly하거나 persistent session 구조처럼 설명하는 경우

즉, 현재 gate `HOLD`는 “hard blocker가 있어서 못 나간다”보다 “범위를 넘겨서 말하면 안 된다”에 가깝다.

## 6. disclose-only limitation 목록

아래 항목은 현재 상태로도 external release에서 설명 가능하다. 전제는 반드시 limitation/support scope에 남겨야 한다는 점이다.

- backend emergency release 전용 endpoint 부재
- current control path = Grid/DCA pause-resume 대응 구조
- runtime emergency stop safeguard는 buyer-facing backend contract와 다르다는 점
- authenticated runtime proof exists in controlled local runtime
- deployed live operator provenance not yet captured
- monitor session durability across restart is not claimed
- multi-instance monitor coherence is not claimed
- monitor tier proof is not claimed
- Rebalancing `SELL` 미검증
- Rebalancing `BOTH` 미검증
- Rebalancing fill-complete 미검증
- portfolio final reconciliation 미검증

이 항목들은 “수정 없이는 출고 불가”가 아니라 “잘못 팔면 출고 불가”다.

## 7. evidence reinforcement 필요 목록

아래 항목은 buyer demo, due diligence, handoff 신뢰도를 높이기 위한 증거 보강 영역이다.

- optional: monitor deployed live operator provenance capture
- optional: health alert recipient-side delivery proof
- optional: latest stop/reset pair를 더 직접 보여주는 sanitized 운영 extract

이 항목들은 코드 수정 없이도 일부 HOLD를 더 줄일 수는 있다. 다만 monitor 기본 UI/runtime existence proof는 이미 닫혔고, 여기 남은 것은 deployed provenance와 tier 두께다.

## 8. 구조 수정 없이는 어려운 목록

아래 항목은 evidence 보강만으로는 닫기 어렵고, 제품 구조나 데이터 모델 변경이 필요하다.

- Rebalancing positions 미사용 / balance sync 기준
- trigger 총액 기준 vs execution 총액 기준 불일치
- `current_pct/current_value_krw` 목표 상태 재계산 아님
- Rebalancing success path log 부재
- monitor memory session / multi-instance coherence limitation

이 항목들은 “지금 release unblock을 위해 바로 고칠 것”보다 “후속 제품 카드로 분리할 것”이 맞다.

## 9. 최소 unblock next 3 tasks

### 1. emergency control external wording freeze

- 목적:
  pause/resume verified backend control path와 runtime safeguard evidence를 더 이상 섞어 말하지 않도록 external-safe wording을 고정한다.
- 산출물:
  FAQ / sales / gate / unblock 문서에서 동일하게 재사용할 짧은 contract 문구 1세트
- 이유:
  이 축은 추가 raw보다 contract discipline이 더 중요하다.

### 2. Rebalancing evidence scope decision card

- 목적:
  남은 외부 soft hold 중 가장 두꺼운 축을 evidence 보강 대상으로 둘지, disclose-only limitation으로 계속 둘지 제품 차원에서 빨리 결정한다.
- 산출물:
  `SELL/BOTH/fill-complete/final reconciliation`의 제품 주장 범위 결정 1건
- 이유:
  monitor 다음으로 큰 남은 HOLD가 여기 있기 때문이다.

### 3. optional monitor deployed provenance capture

- 목적:
  monitor evidence를 더 두껍게 만들 필요가 있을 때만, controlled local runtime proof 위에 deployed provenance 1건을 추가한다.
- 산출물:
  safe deployed post-login provenance note 또는 sanitized runtime capture 1건
- 이유:
  현재는 unblock 필수라기보다, buyer 실사 요구가 있을 때만 의미가 있다.

## 10. 지금 하지 말아야 할 작업

- 전용 backend emergency release endpoint 구현
- raw SQL / session / auth 경로의 broad refactor
- Rebalancing `SELL/BOTH/fill-complete/final reconciliation` 전체 자동화 확장
- monitor auth/session을 multi-instance 기준으로 재설계
- Rebalancing 데이터 모델을 한 카드에서 전면 수정
- `DRY RUN` 일반 로그인 배지 evidence와 health alert duplicate suppression direct proof를 다시 처음부터 수집
- monitor 기본 UI/authenticated runtime existence proof를 다시 처음부터 수집

위 항목들은 현재 unblock 효율이 낮다. 지금 단계에서는 evidence와 contract clarity를 먼저 정리하는 편이 훨씬 싸다.

## 11. still not claimed

- dedicated backend emergency release endpoint
- single global incident release API
- deployed live operator authenticated monitor provenance
- restart-persistent monitor session durability
- durable monitor session architecture
- multi-instance monitor coherence
- monitor tier proof
- Rebalancing `SELL/BOTH/fill-complete/final reconciliation` verified claim

## 12. 다음 추가 evidence가 진짜 필요한지

- `DRY RUN` 일반 로그인 배지 evidence는 현재 기준으로 더 모을 필요가 없다.
- health alert duplicate suppression도 direct proof 기준으로는 더 모을 필요가 없다. recipient-side delivery proof는 optional이다.
- monitor 기본 UI/authenticated runtime 존재 proof도 현재 기준으로 더 모을 필요가 없다.
- monitor 쪽 추가 evidence가 정말 필요하다면, 그것은 deployed live operator provenance를 더 두껍게 하고 싶을 때의 optional 작업이다.
- runtime emergency stop narrative는 추가 raw보다 contract를 넘겨 말하지 않는 discipline이 더 중요하다.

## 13. 최종 권고

최종 판정:

`제한적 외부 공유 가능`

### 지금 상태로도 외부 설명 가능한 항목

- install-and-handoff 제품 구조
- auth / mode / API key baseline
- Upbit/Bithumb manual BUY/SELL baseline
- Grid / DCA `1 cycle execution path`
- Grid/DCA pause-resume backend control path
- Rebalancing `BUY_ONLY` 1 cycle on trigger-reading `run_once()` path
- buyer-facing 문서 9종과 support scope baseline

### 추가 evidence 없이는 약한 항목

- monitor deployed live operator provenance / session durability claim
- runtime emergency stop narrative vs backend contract story
- Rebalancing broader-path evidence

### 구조 수정 없이는 풀기 어려운 항목

- dedicated backend emergency release API를 새 제품 계약으로 올리는 일
- Rebalancing의 positions/current_qty semantics
- Rebalancing trigger/execution total mismatch
- post-submit target-state recomputation
- Rebalancing success path logging
- monitor multi-instance session coherence

실무 해석:

현재 전체 gate가 아직 `HOLD`인 이유는 monitor authenticated runtime proof나 기본 UI evidence가 없어서가 아니다. 그 축은 controlled local runtime 기준으로 닫혔다. 남은 HOLD는 deployed live operator provenance와 restart/session durability, multi-instance coherence, tier proof를 아직 주장하지 않는다는 경계, Rebalancing broader-path evidence 미검증, 그리고 emergency control contract를 pause/resume 범위 밖으로 넓혀 말하면 안 된다는 점 때문이다.
