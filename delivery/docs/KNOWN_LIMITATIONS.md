# Known Limitations

## 문서 목적

이 문서는 GridFlow의 현재 구조적 제약과 buyer가 알아야 할 운영상 주의점을 숨기지 않고 정리합니다. 아래 항목은 “동작하지 않는다”가 아니라 “설명과 지원 범위를 제한해야 한다”는 뜻에 가깝습니다.

## 1. Positions는 canonical holdings ledger가 아닙니다

- `positions`는 모니터링용 snapshot으로는 유용합니다.
- 그러나 user/exchange별 정산 원장처럼 설명하면 안 됩니다.
- route와 exchange에 따라 계산 근거가 다를 수 있습니다.

buyer-facing 해석:

- holdings truth가 필요하면 exchange balances, order tables, strategy tables를 함께 확인해야 합니다.

## 2. Rebalancing은 positions를 쓰지 않고 exchange balances로 `current_qty`를 sync합니다

- 현재 rebalancing 경로는 `positions`를 기준으로 실행되지 않습니다.
- `current_qty`는 exchange `get_balances()` 결과를 기준으로 맞춰집니다.

buyer-facing 해석:

- rebalancing 설명에서 `positions`와 `current_qty`를 같은 의미로 취급하면 안 됩니다.

## 3. Rebalancing의 trigger 기준과 execution 기준 총액이 일치하지 않습니다

- trigger 판정은 coin-side 비중 계산을 기준으로 읽힙니다.
- 실제 주문 크기 계산은 KRW를 포함한 총액 기준을 사용합니다.

buyer-facing 해석:

- “왜 trigger는 울렸는데 주문 금액은 다른 기준처럼 보이는가”라는 질문이 생길 수 있습니다.
- 현재 구조는 이 기준 차이를 가진 상태로 설명해야 합니다.

## 4. Rebalancing 제출 후 `current_pct`와 `current_value_krw`는 목표 상태 재계산이 아닙니다

- 성공 cycle 이후에도 asset row의 `current_pct`, `current_value_krw`는 최종 목표 포트폴리오 상태를 의미하지 않을 수 있습니다.
- 현재 구현은 실행 시점 snapshot 성격이 더 강합니다.

buyer-facing 해석:

- submit 직후 수치를 “리밸런싱 완료 후 최종 배분 결과”로 읽으면 안 됩니다.

## 5. Rebalancing success path에는 activity/audit/state log가 충분히 남지 않습니다

- 현재 success path는 `rebalancing_orders`와 strategy/asset field update가 핵심 증거입니다.
- manual order처럼 activity/audit/state log가 풍부하게 남는 구조가 아닙니다.

buyer-facing 해석:

- rebalancing 성공 판정은 response 하나보다 DB row와 strategy field update를 함께 봐야 합니다.
- 감사용 trail의 두께는 manual order보다 약합니다.

## 6. Emergency release는 전용 backend endpoint가 아닙니다

- 현재 buyer-facing backend control path는 Grid/DCA pause/resume 중심입니다.
- 프론트의 emergency stop은 전략별 pause fan-out 구조입니다.
- 전용 backend emergency release endpoint를 문서화할 수 없습니다.

buyer-facing 해석:

- emergency control은 “pause/resume 대응 구조”로 이해하는 것이 정확합니다.
- global release API가 있다고 가정하면 현재 제품 설명과 어긋납니다.

## 7. Monitor는 별도 auth boundary와 memory session 한계를 가집니다

- monitor는 main app와 다른 cookie를 사용합니다.
- monitor session store는 process-memory 기반입니다.
- 서비스 재시작 후 세션이 유지되지 않습니다.
- 다중 인스턴스나 load-balancing 일관성은 현재 범위가 아닙니다.

buyer-facing 해석:

- monitor는 단일 운영 보조 앱으로 보는 것이 안전합니다.

## 8. Security hardening과 response consistency는 개선됐지만 완전히 닫히지 않았습니다

- state-changing request에는 header 보호선이 있습니다.
- 그러나 formal CSRF framework로 설명할 수는 없습니다.
- validation과 response normalization은 route family 전체가 완전히 동일하다고 말할 수 없습니다.

buyer-facing 해석:

- 현재 posture는 “개선된 baseline + 공개된 limitation”으로 보는 것이 맞습니다.

## 9. Evidence coverage는 기능별로 두께가 다릅니다

- auth, API key, manual order, Grid/DCA one-cycle, pause/resume, Rebalancing BUY_ONLY one-cycle은 integration test가 있습니다.
- monitor UI, `DRY RUN` 일반 로그인 배지, Rebalancing `SELL` / `BOTH`, fill-complete verification은 제한적이거나 별도 증거 수준입니다.

buyer-facing 해석:

- code/DB/log evidence가 있다고 해서 buyer-facing capture coverage까지 동일하게 강한 것은 아닙니다.
