# GridFlow Architecture

## 개요

GridFlow는 하나의 공개 웹 앱이 아니라, 아래 구성요소가 함께 동작하는 설치형 시스템입니다.

- main app
- bot runtime
- monitor app
- PostgreSQL
- nginx
- systemd services and timers

```text
Browser
  -> nginx :80 / :443
     -> /          -> gridflow-app -> PostgreSQL
     -> /monitor   -> orderlens-ops -> PostgreSQL

upbit-bot
  -> PostgreSQL
  -> exchange APIs
```

## Main App

메인 앱은 사용자 UI와 주요 API를 제공합니다.

- entrypoint: `app/main.py`
- 주요 route family:
  - `/auth`
  - `/api`
  - `/bapi`
  - `/grid`
  - `/dca`
  - `/rebalancing`
  - `/config`
  - `/backtest`

메인 앱은 cookie/session 기반 인증을 사용하고, 상태 변경 요청에는 `X-GridFlow-State-Change: 1` 헤더를 요구합니다.

## Bot Runtime

bot runtime은 사용자별 전략 실행과 주문 후속 처리를 담당합니다.

- entrypoint: `app/bot.py`
- 역할:
  - 사용자별 거래소 키 로딩
  - Grid, DCA, Rebalancing one-shot 또는 loop 실행
  - manual order 후속 submit
  - 주문 상태 확인과 일부 정합성 갱신

main app가 모든 live 주문을 즉시 거래소로 보내는 구조는 아닙니다. 특히 manual order live 경로는 main app와 bot runtime이 분리된 책임을 가집니다.

## Manual Order Live Path

live manual order는 아래 구조로 동작합니다.

1. 브라우저가 main app의 `/api/orders` 또는 `/bapi/orders`로 요청합니다.
2. main app가 인증, 입력 검증, 사용자 키/모드 확인을 수행합니다.
3. main app는 먼저 `planned_orders` row와 관련 상태 기록을 생성합니다.
4. 이후 user bot/order gateway가 계획된 주문을 읽고 거래소 submit을 수행합니다.
5. submit 이후 `exchange_order_id`, `SUBMITTED` 상태, activity/state evidence가 남습니다.

따라서 buyer-facing 설명은 “manual live order request -> planned row 생성 -> gateway submit” 구조로 잡아야 정확합니다. “요청 즉시 실거래소 submit”이라고 설명하면 현재 구조와 맞지 않습니다.

## Strategy Execution Axes

### Grid

- 생성: `/grid/strategies`
- 저장: `grid_strategies`, 초기 `grid_orders`
- 실행: `GridEngine.run_once()` 또는 bot loop
- 현재 검증 기준:
  - live 경로 기준 1 cycle execution path verified
  - 최소 1개 `grid_orders` row 상태 전이와 exchange submit 흔적 확인

Grid success path는 현재 activity/audit log를 항상 남기는 구조로 검증되지는 않았습니다. 핵심 근거는 `grid_orders`, `grid_strategies` 상태 변화와 submit 흔적입니다.

### DCA

- 생성: `/dca/strategies`
- 저장: `dca_strategies`
- 실행: `DCAEngine.run_once()` 또는 bot loop
- 현재 검증 기준:
  - live 경로 기준 1 cycle execution path verified
  - 사용자 저장 키 라우팅과 `dca_orders` 생성, submit 흔적, 전략 집계 필드 갱신 확인

DCA success path도 현재 핵심 근거는 `dca_orders`, `dca_strategies` 상태 변화와 submit 흔적입니다.

### Rebalancing

- 생성: `/rebalancing/strategies`
- 실행 route: `/rebalancing/strategies/{id}/rebalance-now`
- trigger-reading engine path: `RebalancingEngine.run_once()`

여기서 중요한 차이가 있습니다.

- `rebalance-now`는 force path이며 trigger를 우회합니다.
- trigger를 실제로 읽는 경로는 engine의 `run_once()`입니다.

현재 자동 검증은 `BUY_ONLY` 전략에 대해 trigger-reading `run_once()` path 1 cycle만 다룹니다. 이 경로에서는 `current_qty` sync, trigger 판정, decision, `rebalancing_orders` 생성/submit, `rebalancing_strategies` 갱신이 확인됐습니다.

## Monitor App

monitor는 main app와 분리된 별도 FastAPI 앱입니다.

- entrypoint: `app/monitor/product_app.py`
- external path: `/monitor`
- 주 역할:
  - 최근 주문 관측
  - 최근 활동 관측
  - 최근 오류 관측
  - 운영용 필터 기반 조회

monitor는 main app의 보조 탭이 아니라 별도 auth boundary를 가진 운영 보조 앱입니다. main app 세션을 재사용하지 않으며, monitor 전용 세션과 설정을 사용합니다.

## Database

PostgreSQL은 main app, bot runtime, monitor가 함께 사용하는 핵심 저장소입니다.

주요 데이터 축은 아래와 같습니다.

- `users`, `user_sessions`
- `bot_configs`
- `planned_orders`, `state_transition_logs`, `activity_logs`, `audit_logs`
- `grid_*`
- `dca_*`
- `rebalancing_*`

주의할 점:

- `positions`는 canonical holdings ledger가 아닙니다.
- manual order와 전략군의 상태 근거는 각 전용 테이블과 로그를 함께 봐야 합니다.
- rebalancing은 `positions`가 아니라 exchange balances를 기준으로 `current_qty`를 sync합니다.

## nginx and Timers

nginx는 외부 HTTPS 진입점을 제공하고, systemd timer는 운영 자동화 작업을 담당합니다.

- `/` -> main app
- `/monitor` -> monitor app
- backup timer
- health alert timer

timer는 거래 전략 실행 자체를 대체하지 않습니다. 전략 실행의 핵심은 bot runtime과 각 strategy engine입니다.

## 현재 buyer-facing 설명에서 숨기지 말아야 할 점

- manual live order는 deferred submit 구조입니다.
- Grid, DCA, Rebalancing은 서로 다른 테이블과 엔진 경로를 가집니다.
- Rebalancing의 trigger-reading path와 `rebalance-now` force path는 다릅니다.
- monitor와 main app는 분리된 인증 경계입니다.
- `positions`는 snapshot이며, 모든 전략의 단일 source of truth가 아닙니다.
