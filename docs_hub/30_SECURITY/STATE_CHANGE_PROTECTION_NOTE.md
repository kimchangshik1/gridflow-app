# STATE_CHANGE_PROTECTION_NOTE

이 문서는 2026-04-24 기준 state-changing route coverage와 behavior verification 결과를 정리한다.
compile check만으로 닫지 않고, source-tree TestClient와 live curl을 둘 다 사용했다.

## 1. Main App Coverage

`app/main.py`의 state-change guard는 아래 prefix에 대해 `POST` / `PUT` / `PATCH` / `DELETE`를 보호한다.

- `/api`
- `/bapi`
- `/config`
- `/auth`
- `/grid`
- `/dca`
- `/backtest`
- `/rebalancing`

source tree inventory 기준 main app mutation route는 총 38개다.

### `/auth` family

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/guest/session`
- `POST /auth/guest/logout`
- `POST /auth/users`
- `DELETE /auth/users/{user_id}`
- `POST /auth/users/{user_id}/deactivate`
- `POST /auth/users/{user_id}/dryrun`
- `DELETE /auth/users/{user_id}/keys`

### `/api` family

- `POST /api/orders`
- `DELETE /api/orders/{order_id}`
- `POST /api/activity/log`
- `POST /api/activity/summary`

### `/bapi` family

- `POST /bapi/orders`
- `DELETE /bapi/orders/{order_id}`

### `/config` family

- `POST /config/keys`
- `DELETE /config/keys`
- `DELETE /config/keys/upbit`
- `DELETE /config/keys/bithumb`

### `/grid` family

- `POST /grid/strategies`
- `PUT /grid/strategies/{strategy_id}`
- `POST /grid/strategies/{strategy_id}/pause`
- `POST /grid/strategies/{strategy_id}/resume`
- `POST /grid/strategies/{strategy_id}/stop`
- `DELETE /grid/strategies/{strategy_id}/delete`

### `/dca` family

- `POST /dca/strategies`
- `POST /dca/strategies/{strategy_id}/pause`
- `POST /dca/strategies/{strategy_id}/resume`
- `DELETE /dca/strategies/{strategy_id}`
- `DELETE /dca/strategies/{strategy_id}/delete`

### `/backtest` family

- `POST /backtest/grid`

### `/rebalancing` family

- `POST /rebalancing/strategies`
- `POST /rebalancing/strategies/{strategy_id}/pause`
- `POST /rebalancing/strategies/{strategy_id}/resume`
- `POST /rebalancing/strategies/{strategy_id}/rebalance-now`
- `DELETE /rebalancing/strategies/{strategy_id}`
- `DELETE /rebalancing/strategies/{strategy_id}/delete`

coverage 판정

- `확정`: source tree inventory에서 발견한 main app mutation route 38개는 모두 guarded prefix 아래에 있다.
- `확정`: 이번 inventory 기준 main app uncovered mutation route는 찾지 못했다.

## 2. Monitor Coverage

`app/monitor/product_app.py`는 `/monitor` 아래 `POST` / `PUT` / `PATCH` / `DELETE`에 same-origin guard를 적용한다.

source tree inventory 기준 monitor mutation route는 총 5개다.

- `POST /monitor/login`
- `POST /monitor/logout`
- `POST /monitor/setup`
- `DELETE /monitor/setup`
- `POST /monitor/change-password`

coverage 판정

- `확정`: source tree inventory에서 발견한 monitor mutation route 5개는 모두 `/monitor` guard 범위 안에 있다.
- `확정`: 이번 inventory 기준 uncovered monitor mutation route는 찾지 못했다.

## 3. Protection Behavior Verification

검증 방식

- source-tree proof:
  - `DB_URL=postgresql://dummy PYTHONPATH=/home/ubuntu/upbit_bot /home/ubuntu/upbit_bot/venv/bin/python`
  - `fastapi.testclient.TestClient`로 `app.main:app`, `app.monitor.product_app:app` 직접 호출
- live proof:
  - `curl` to `127.0.0.1:8000` and `127.0.0.1:8010`
  - live service가 처음에는 stale behavior를 보였고, `sudo systemctl restart gridflow-app.service orderlens-ops.service` 후 source tree와 일치함을 재확인

### Main app live verification

대표 route 1: `POST /auth/logout`

- no header
  - request: `curl -X POST http://127.0.0.1:8000/auth/logout`
  - response: `403 {"detail":"상태 변경 요청 검증에 실패했습니다"}`
- header + mismatched origin
  - request: `curl -X POST ... -H 'X-GridFlow-State-Change: 1' -H 'Origin: http://evil.example'`
  - response: `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- header + same-origin origin
  - request: `curl -X POST ... -H 'X-GridFlow-State-Change: 1' -H 'Origin: http://127.0.0.1:8000'`
  - response: `200 {"success":true}`
- header + no origin/referer
  - request: `curl -X POST ... -H 'X-GridFlow-State-Change: 1'`
  - response: `200 {"success":true}`

대표 route 2: `POST /api/activity/log`

- no header
  - response: `403 {"detail":"상태 변경 요청 검증에 실패했습니다"}`
- header + mismatched origin
  - response: `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- header + same-origin origin + empty JSON
  - response: `401 {"detail":"로그인이 필요합니다"}`
  - 해석: state-change guard는 통과했고, 이후 route-level auth에서 막혔다.

main app behavior 판정

- `확정`: required header가 없으면 reject된다.
- `확정`: header가 있어도 mismatched `Origin`은 reject된다.
- `확정`: same-origin + valid header면 route handler까지 도달한다.
- `확정`: `Origin`/`Referer`가 둘 다 없으면 현재 정책상 valid header만으로 통과한다.

### Monitor live verification

대표 route: `POST /monitor/logout`

- no origin/referer
  - response: `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- mismatched origin
  - response: `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- same-origin origin
  - response: `200 {"ok":true}`

monitor behavior 판정

- `확정`: monitor는 custom header 요구 없이 same-origin 여부만으로 mutation을 거른다.
- `확정`: `Origin`/`Referer`가 없으면 reject된다.
- `확정`: same-origin이면 route handler까지 도달한다.

## 4. Current Limitation

- main app는 `custom header + browser-originated same-origin check` 조합이다.
- formal CSRF token framework는 아니다.
- `Origin`/`Referer`가 둘 다 없는 non-browser caller는 기존 header 계약에 계속 의존한다.

## 5. Current Verdict

- main app state-change protection: `HOLD`
- monitor state-change protection: `PASS for current intended scope`
- overall disposition:
  - browser-originated mutation guard는 설명 가능하게 검증됐다.
  - formal CSRF token architecture까지 닫힌 상태는 아니다.
