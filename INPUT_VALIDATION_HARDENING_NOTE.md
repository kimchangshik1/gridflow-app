# INPUT_VALIDATION_HARDENING_NOTE

이번 문서는 주문/전략 입력 검증 보강 1차 메모다.
이번 턴은 입력 검증 편차 축소만 다루며, CSRF/Origin/Referer 보호나 monitor 경계는 범위 밖이다.

## 수정 파일 목록

- `app/api/routes.py`
- `app/api/grid_routes.py`
- `app/api/dca_routes.py`
- `app/api/rebalancing_routes.py`
- `app/api/bithumb_routes.py`

## 보강한 검증 항목

- Upbit 수동 주문
  - `symbol` 비어 있음 / 형식 오류 검증 추가
  - 기존 `side`, `price`, `amount_krw` 검증과 함께 서버 측 기본 형식 검증 정리
- Bithumb 수동 주문
  - `symbol`, `side`, `price`, `qty` 기본 검증 정리
  - 매도 시 `qty` 또는 `amount_krw` 필요 조건을 명시
  - 최소 주문금액은 계산된 `amount_krw` 기준으로 확인
- Grid 전략
  - create/update 공통 검증 함수로 정리
  - `exchange`, `symbol`, `base_price`, `range_pct`, `grid_count`, `amount_per_grid`, `profit_gap` 검증 정렬
  - `split_ratio` 파싱 실패, 항목 수 불일치, 합계 100 불일치, 음수/0 비율 차단
  - `split_gap_pct`, `trailing_pct`, `trailing_trigger_pct`, optional 금액/가격 필드 양수 검증 추가
- DCA 전략
  - `exchange`, `symbol`, `strategy_type`, `interval_type` enum 검증 추가
  - `total_amount > 0`, `amount_per_order >= 5500`, `amount_per_order <= total_amount` 검증 추가
  - `price_drop_pct`, `time_interval_hours`, `stop_loss_price`, `max_avg_price` 양수 검증 추가
  - 적립식 스케줄 값 검증 추가
- Rebalancing 전략
  - `exchange`, `name`, `threshold_pct`, `max_adjust_pct`, `max_adjust_krw`, `daily_max_count`, `daily_max_krw`, `asset_min_pct`, `asset_max_pct`, `error_stop_count` 검증 추가
  - 자산별 `symbol`, `target_pct` 범위, 중복 심볼, `asset_max_pct` 초과 여부 검증 추가
- Raw dict 활동 로그
  - `event_type`, `status`, `status_ko` 필수 검증 추가
  - 문자열/숫자 필드 형식 확인 추가
  - `price`, `amount_krw`가 있으면 양수만 허용

## create/update 정렬 여부

- Grid 전략은 create/update가 같은 검증 함수를 사용하도록 정리했다
- DCA/Rebalancing은 이번 범위에서 별도 update 엔드포인트가 없어 create 쪽만 보강했다
- 주문 경로는 Upbit/Bithumb 각각 기본 수치/형식 검증 기준을 조금 더 명시적으로 맞췄다

## 아직 남은 검증 공백

- `activity/log`는 여전히 raw `dict` 경로이며, 스키마 기반 모델로 완전히 치환되지는 않았다
- Rebalancing은 생성 후 수정 API가 없어서 create/update 완전 정렬 대상이 아니었다
- 일부 문자열 필드는 허용값 집합을 더 좁히지 않았고, 최소 형식 검증 수준에 머문다
- 내부 서비스 함수 레벨 검증과의 중복/편차는 이번 턴에서 재설계하지 않았다

## 이번 턴 후 판정

- `HOLD`
- 이유: 주요 gap은 줄였지만, raw `dict` 경로와 일부 느슨한 문자열 검증, 전체 스키마 일관성 문제는 남아 있다
