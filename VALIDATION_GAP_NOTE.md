GridFlow Validation Gap Note

상태
- 코드 기준 감사 문서
- 수정 없이 gap 판정만 기록

1. 확인한 파일/엔드포인트 범위

앱/예외 처리
- [app/main.py](/home/ubuntu/upbit_bot/app/main.py)
- [app/monitor/product_app.py](/home/ubuntu/upbit_bot/app/monitor/product_app.py)

메인 auth / 상태 변경
- [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py)

주문/활동
- [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py)
  - `POST /api/orders`
  - `DELETE /api/orders/{order_id}`
  - `POST /api/activity/log`
  - `POST /api/activity/summary`

전략
- [app/api/grid_routes.py](/home/ubuntu/upbit_bot/app/api/grid_routes.py)
  - `POST /grid/strategies`
  - `POST /grid/strategies/{id}/pause|resume|stop`
  - `PUT /grid/strategies/{id}`
  - `DELETE /grid/strategies/{id}/delete`
- [app/api/dca_routes.py](/home/ubuntu/upbit_bot/app/api/dca_routes.py)
  - `POST /dca/strategies`
  - `POST /dca/strategies/{id}/pause|resume`
  - `DELETE /dca/strategies/{id}`
  - `DELETE /dca/strategies/{id}/delete`
- [app/api/rebalancing_routes.py](/home/ubuntu/upbit_bot/app/api/rebalancing_routes.py)
  - `POST /rebalancing/strategies`
  - `POST /rebalancing/strategies/{id}/pause|resume|rebalance-now`
  - `DELETE /rebalancing/strategies/{id}`
  - `DELETE /rebalancing/strategies/{id}/delete`

빗썸 주문
- [app/api/bithumb_routes.py](/home/ubuntu/upbit_bot/app/api/bithumb_routes.py)
  - `POST /bapi/orders`
  - `DELETE /bapi/orders/{order_id}`

monitor
- [app/monitor/routes.py](/home/ubuntu/upbit_bot/app/monitor/routes.py)
  - `POST /monitor/login|logout|change-password|setup`
  - `DELETE /monitor/setup`

2. 상태 변경 보호 현황

CSRF 토큰 검증
- 확정: 메인 앱의 `POST/PUT/DELETE` 경로에서 CSRF 토큰 검증 코드는 확인하지 못했다.
- 확정: `auth_routes.py`, `routes.py`, `grid_routes.py`, `dca_routes.py`, `rebalancing_routes.py`, `bithumb_routes.py`에 CSRF 토큰 검사 함수나 미들웨어 연결이 보이지 않는다.
- 확정: monitor 경로에도 CSRF 토큰 검증은 보이지 않는다.

대체 보호
- 확정: 메인 auth cookie는 `samesite="lax"`로 set 된다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:287)
- 확정: monitor cookie는 `samesite="strict"`로 set 된다. [app/monitor/routes.py](/home/ubuntu/upbit_bot/app/monitor/routes.py:119)
- 확정: 메인 앱에서 Origin/Referer 검사 코드는 확인하지 못했다.
- 확정: 메인 앱에서 상태 변경 요청에 custom header를 강제하는 코드는 확인하지 못했다.
- 확정: monitor도 Origin/Referer/custom header 기반 보호는 보이지 않는다.

인증/소유권 보호
- 확정: 메인 상태 변경 경로 대부분은 `Depends(get_current_user)`로 로그인 세션을 요구한다.
- 확정: 전략/주문 수정·삭제는 대체로 `WHERE ... user_id=%s` 조건으로 사용자 소유권을 함께 확인한다.
- 확정: 관리자 전용 경로는 `is_admin` 검사로 보호한다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:377)
- 추정: 인증/소유권 보호는 일부 설명 가능하지만, 상태 변경 자체의 request-origin 보호는 별도 층으로 존재하지 않는다.

적용 범위/미적용 범위
- 확정: 인증/소유권 보호는 메인 주문/전략 경로에 광범위하게 적용돼 있다.
- 확정: CSRF/Origin/Referer/custom-header 계층 보호는 메인 앱과 monitor 모두 광범위하게 미적용이다.

3. 입력 검증 현황

주문 입력
- 확정: Upbit 주문은 `side`, `price > 0`, `최소 주문금액`, DRY_RUN 잔고 부족을 검사한다. [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:353)
- 확정: Bithumb 주문은 `side`, `symbol` 형식, `price > 0`, `SELL qty > 0`, `최소 주문금액`, DRY_RUN 잔고 부족을 검사한다. [app/api/bithumb_routes.py](/home/ubuntu/upbit_bot/app/api/bithumb_routes.py:320)
- 미확정: 메인 Upbit 주문은 `symbol` 형식 검증이 Bithumb만큼 명시적으로 들어가 있지 않다.

전략 생성/수정 입력
- 확정: Grid 생성은 `base_price`, `grid_count`, `amount_per_grid`, `range_pct`, `smart_sell_mode`, 일부 split 파라미터를 검증한다. [app/api/grid_routes.py](/home/ubuntu/upbit_bot/app/api/grid_routes.py:36)
- 확정: Grid 수정은 `range_pct`, `base_price`만 다시 검증하고, 생성 시 검증했던 `grid_count`, `amount_per_grid`, `smart_sell_mode`, `split_ratio` 등의 전체 재검증은 부분적이다. [app/api/grid_routes.py](/home/ubuntu/upbit_bot/app/api/grid_routes.py:392)
- 확정: DCA 생성은 `amount_per_order`, `total_rounds`, 전략 타입별 간격 조건을 검사한다. [app/api/dca_routes.py](/home/ubuntu/upbit_bot/app/api/dca_routes.py:44)
- 확정: Rebalancing 생성은 합계 100%, 자산 수, trigger/rebal_method enum, 최소 주문금액, interval, 중복 심볼, 최소 비중을 검사한다. [app/api/rebalancing_routes.py](/home/ubuntu/upbit_bot/app/api/rebalancing_routes.py:39)

guest / dry run / live 분기
- 확정: `get_current_user()`는 guest를 강제로 `is_dry_run=True`로 취급한다. 직접 live 경로로 들어가는 걸 일부 줄이는 구조다.
- 확정: 주문 경로는 `is_dry_run`일 때 sandbox 분기를 타며, 실거래 경로와 분리된다. [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:353), [app/api/bithumb_routes.py](/home/ubuntu/upbit_bot/app/api/bithumb_routes.py:320)
- 확정: Grid/DCA/Rebalancing 생성은 non-dry-run에서 사용자 API 키 존재를 확인한다.
- 미확정: 일부 전략 상태 변경 경로가 `status='ACTIVE'` 조건 없이 업데이트되는 곳이 있어, 상태 전이 보호가 모듈마다 일관되지는 않다. 예: Rebalancing pause/resume/stop. [app/api/rebalancing_routes.py](/home/ubuntu/upbit_bot/app/api/rebalancing_routes.py:212)

공통 누락 패턴
- 확정: Pydantic 모델은 존재하지만 `Field` 범위 제한, validator, enum 타입 등 선언적 검증은 거의 없다.
- 확정: 여러 라우트가 수치 검증을 수동 `if`로 부분 적용한다.
- 확정: `POST /api/activity/log`는 `req: dict`로 받아 필드 스키마 검증 없이 DB insert를 시도한다. [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:539)
- 추정: 검증 패턴이 라우트별 수동 분산형이라 같은 종류의 입력이라도 일관성 누락이 생기기 쉽다.

4. 오류 응답 / 예외 노출 현황

메인 앱
- 확정: `app/main.py`에는 전역 `RequestValidationError`/`Exception` 핸들러가 없다.
- 확정: 여러 라우트가 `except Exception as e: raise HTTPException(500, str(e))` 패턴을 사용한다.
  - Grid 생성 [app/api/grid_routes.py](/home/ubuntu/upbit_bot/app/api/grid_routes.py:91)
  - DCA 생성 [app/api/dca_routes.py](/home/ubuntu/upbit_bot/app/api/dca_routes.py:100)
  - Rebalancing 생성 [app/api/rebalancing_routes.py](/home/ubuntu/upbit_bot/app/api/rebalancing_routes.py:119)
  - Bithumb ranked [app/api/bithumb_routes.py](/home/ubuntu/upbit_bot/app/api/bithumb_routes.py:191)
  - 주문 취소/활동 요약 등 일부 [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:502)
- 확정: 이 패턴은 traceback 자체는 아니어도 내부 예외 문자열을 외부 detail로 그대로 내보낼 수 있다.
- 확정: 일부 엔드포인트는 500 대신 빈 결과나 `{ok: False}`로 삼켜 일관성이 없다.
  - `POST /api/activity/log`는 예외 시 200 + `{ok: False}` 반환 [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:539)
  - `GET /api/activity`는 예외 시 `{"logs":[]}` 반환 [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:571)

monitor
- 확정: monitor 앱은 `RequestValidationError`를 422 `"요청 형식이 올바르지 않습니다"`로 통일한다. [app/monitor/product_app.py](/home/ubuntu/upbit_bot/app/monitor/product_app.py:36)
- 확정: monitor 앱은 처리되지 않은 예외를 로그로만 남기고 외부에는 500 `"서버 오류가 발생했습니다"`로 숨긴다. [app/monitor/product_app.py](/home/ubuntu/upbit_bot/app/monitor/product_app.py:42)
- 확정: monitor 쪽 오류 응답 통제는 메인 앱보다 일관적이다.

개발용 상세 에러 노출 가능성
- 확정: 메인 앱에서 `HTTPException(500, str(e))` 패턴이 반복돼 상세 예외 문자열이 외부에 노출될 가능성이 있다.
- 미확정: FastAPI 런타임 debug 모드 설정은 이번 범위에서 확인하지 않았다.

5. PASS/HOLD/FAIL 판정

- FAIL

6. 근거

- 확정: 메인 상태 변경 경로 전반에서 CSRF 토큰 검증이 보이지 않는다.
- 확정: Origin/Referer 검사나 custom header 강제도 보이지 않는다.
- 확정: 인증/소유권 보호는 있으나 상태 변경 보호 계층이 별도로 없다.
- 확정: 입력 검증은 일부 핵심 수치에만 수동 적용되고, `dict` 입력이나 수정 경로 재검증 누락이 있다.
- 확정: 메인 앱은 예외 응답을 숨기지 않고 `str(e)`를 detail로 내보내는 패턴이 여러 군데 있다.
- 확정: monitor는 예외 응답 통제가 있으나, 메인 앱 전체 판정을 뒤집을 정도로 범위가 넓지 않다.

7. 우선순위 높은 gap 3개

- 1. 메인 앱 상태 변경 경로의 CSRF/Origin/Referer/custom-header 보호 부재
- 2. 메인 앱의 `HTTPException(500, str(e))` 기반 내부 예외 문자열 노출
- 3. 입력 검증이 라우트별 수동 분산형이라 `dict` 입력, 수정 경로, 일부 수치/상태 전이 검증이 불일치

8. 추가 확인 필요 항목

- 미확정: `app/api/config_routes.py` 등 이번 범위 밖 상태 변경 라우트의 validation/error 패턴
- 미확정: FastAPI debug 설정 또는 ASGI 서버 레벨 상세 에러 페이지 노출 여부
- 미확정: 프론트에서 상태 변경 요청 전에 추가적인 입력 제한을 하는지 여부
- 미확정: `cancel_planned_order`, `create_planned_order` 내부에서 추가 검증을 더 하는지 여부
