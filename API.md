# GridFlow API

## 문서 범위

이 문서는 GridFlow의 전체 endpoint reference를 대신하지 않습니다. buyer가 시스템 구조와 운영 경계를 이해하는 데 필요한 주요 API surface만 요약합니다.

## Auth and Session

주요 메인 앱 auth API:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/guest/session`
- `POST /auth/guest/logout`

현재 자동 검증 범위:

- login
- `/auth/me`
- logout
- guest / dry / live 구분

실무 해석:

- 메인 앱은 cookie/session 기반입니다.
- guest는 dry-run 계열 세션으로 동작합니다.

## Balances and Manual Orders

### Upbit surface

- `GET /api/symbols`
- `GET /api/balances`
- `GET /api/positions`
- `POST /api/orders`
- `GET /api/orders`
- `DELETE /api/orders/{order_id}`
- `GET /api/activity`
- `POST /api/activity/log`

### Bithumb surface

- `GET /bapi/symbols/ranked`
- `GET /bapi/balances`
- `GET /bapi/positions`
- `POST /bapi/orders`
- `GET /bapi/orders`
- `DELETE /bapi/orders/{order_id}`

### Manual order 동작 의미

manual order는 mode에 따라 경로가 다릅니다.

- guest / dry run: sandbox 또는 dry-run 경로
- live: planned order 기반 후속 submit 경로

특히 live manual order는 요청 즉시 실거래소 submit이 아닙니다.

1. API request가 들어옵니다.
2. 서버가 `planned_orders`와 관련 상태 기록을 생성합니다.
3. 이후 user bot/order gateway가 이를 읽고 거래소 submit을 수행합니다.
4. submit 이후 `SUBMITTED`, `exchange_order_id`, 관련 log/state evidence가 남습니다.

현재 integration test는 Upbit/Bithumb manual BUY/SELL 각각에 대해 아래 수준을 검증합니다.

- 로그인 세션
- 상태 변경 헤더
- 사용자별 API 키 라우팅
- mock exchange submit 호출
- DB row 생성
- 관련 status/log evidence

## Strategy APIs

### Grid

주요 route:

- `POST /grid/strategies`
- `GET /grid/strategies`
- `GET /grid/strategies/{strategy_id}/orders`
- `POST /grid/strategies/{strategy_id}/pause`
- `POST /grid/strategies/{strategy_id}/resume`
- `POST /grid/strategies/{strategy_id}/stop`

현재 검증 범위:

- strategy create
- 1 cycle execution path
- pause/resume backend control path

Grid는 현재 “1 cycle execution path verified” 수준으로 설명하는 것이 정확합니다.

### DCA

주요 route:

- `POST /dca/strategies`
- `GET /dca/strategies`
- `GET /dca/strategies/{strategy_id}/orders`
- `POST /dca/strategies/{strategy_id}/pause`
- `POST /dca/strategies/{strategy_id}/resume`

현재 검증 범위:

- strategy create
- 사용자 저장 키 라우팅
- 1 cycle execution path
- pause/resume backend control path

DCA도 현재 “1 cycle execution path verified” 수준으로 설명하는 것이 맞습니다.

### Rebalancing

주요 route:

- `POST /rebalancing/strategies`
- `GET /rebalancing/strategies`
- `GET /rebalancing/strategies/{strategy_id}/orders`
- `POST /rebalancing/strategies/{strategy_id}/pause`
- `POST /rebalancing/strategies/{strategy_id}/resume`
- `POST /rebalancing/strategies/{strategy_id}/rebalance-now`

중요한 차이:

- `rebalance-now`는 force path입니다.
- `rebalance-now`는 trigger를 우회합니다.
- trigger를 실제로 읽는 경로는 engine의 `run_once()`입니다.

현재 자동 검증은 public route의 `rebalance-now`가 아니라 trigger-reading `run_once()` path 기준입니다. 검증 범위는 `BUY_ONLY` 전략 1 cycle이며, `current_qty` sync, trigger 판정, decision, order submit, strategy field update가 확인됐습니다.

따라서 buyer-facing 표현은 아래가 정확합니다.

- verified by integration tests: `BUY_ONLY` 1 cycle on trigger-reading `run_once` path
- documented by evidence: 일부 `rebalance-now` 운영 증거
- limited: `SELL`, `BOTH`, fill-complete, portfolio final reconciliation

## Control Plane

현재 strategy state-change route surface에는 아래 경로가 존재합니다.

- Grid pause / resume
- DCA pause / resume
- Rebalancing pause / resume

다만 emergency control contract는 `EMERGENCY_CONTROL_CONTRACT.md` 기준으로 아래처럼 고정합니다.

- verified by integration tests: Grid/DCA pause/resume backend control path
- documented operational safeguard: runtime emergency stop evidence exists separately
- not claimed: dedicated backend emergency release endpoint
- not claimed: global incident release backend feature

즉, route existence와 emergency backend contract를 같은 뜻으로 설명하지 않습니다. Rebalancing pause/resume route 존재도 현재 emergency control verified scope를 자동으로 넓히지 않습니다.

## Monitor APIs

monitor는 main app와 분리된 surface입니다.

주요 route:

- `GET /monitor/auth-status`
- `POST /monitor/login`
- `POST /monitor/logout`
- `POST /monitor/change-password`
- `GET /monitor/orders`
- `GET /monitor/activity`

buyer-facing 해석:

- monitor는 운영 보조용 조회 surface입니다.
- main app와 auth boundary를 공유하지 않습니다.
- 전체 앱을 완전 read-only라고 단정하지는 않습니다.

## 공통 계약 메모

- main app 상태 변경 요청은 `X-GridFlow-State-Change: 1` 헤더를 요구합니다.
- `positions`는 monitoring snapshot으로는 유용하지만 canonical holdings ledger로 설명하면 안 됩니다.
- live order와 strategy 성공 판정은 응답만이 아니라 DB row, submit 흔적, 관련 상태 필드를 함께 봐야 합니다.
