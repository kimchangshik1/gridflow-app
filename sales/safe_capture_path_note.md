# safe_capture_path_note

기준
- 작성 기준: 2026-04-20 UTC
- 범위: repo/docs/code 기준으로만 확인한 안전 캡처 경로 메모
- 목적: 실거래 리스크 없이 buyer-facing 주문/전략 UI 캡처를 만들 수 있는 기존 경로 존재 여부 판정

## 결론

- `safe path 있음`
- 단, 범위는 `manual order UI`까지다.
- `strategy create/execute UI`까지 공통으로 닫히는 안전 경로는 현재 확인되지 않았다.

## 정확한 경로 1개

- `guest session -> upbit/bithumb 탭 진입 -> POST /api/orders 또는 POST /bapi/orders -> sandbox_orders 반영`

## 근거 파일 / 함수

- guest 세션 생성
  - `app/api/auth_routes.py`
  - `POST /guest/session`
  - `create_guest_session()`
  - guest 생성 후 `session` cookie 발급
- guest는 강제로 dry run
  - `app/auth/auth.py`
  - `create_guest_user()`
  - guest 생성 시 `is_dry_run=True`, `is_guest=True`
  - `app/auth/dependencies.py`
  - guest 인증 시 다시 `is_dry_run=True`
- guest의 manual order 요청 허용
  - `static/js/auth.js`
  - `window.authFetch()`
  - guest 상태에서 `POST ... /orders`는 차단하지 않고 실제 요청 통과
- Upbit manual order의 sandbox 분기
  - `app/api/routes.py`
  - `POST /orders`
  - `if user.get("is_dry_run")` 분기에서 `sandbox_orders`, `sandbox_balances`, `activity_logs` 갱신
  - 반환값에 `sandbox: True`
- Bithumb manual order의 sandbox 분기
  - `app/api/bithumb_routes.py`
  - `POST /orders`
  - `if user.get("is_dry_run")` 분기에서 `sandbox_orders`, `sandbox_balances`, `activity_logs` 갱신
  - 반환값에 `sandbox: True`
- guest가 접근 가능한 UI 범위
  - `static/js/home.js`
  - `wrapGuestNavigation()`
  - guest는 `home`, `upbit`, `bithumb`, `grid` 탭은 허용

## 확정 한계

- guest는 전략 생성/실행 경로의 안전 캡처 계정으로 쓰기 어렵다.
  - `static/js/auth.js`
  - guest 상태에서 non-GET 요청은 기본 차단이며 `/orders`만 예외 통과
  - `/grid`, `/dca`, `/rebal`는 GET 시 빈 전략 목록 응답, non-GET 생성/수정은 안전 경로로 확인되지 않음
- self-signup만으로는 DRY RUN 계정이 되지 않는다.
  - `app/api/auth_routes.py`
  - `POST /register`는 일반 유저 생성만 수행
- DRY RUN 전환은 관리자 전용이다.
  - `app/api/auth_routes.py`
  - `POST /users/{user_id}/dryrun`
  - 관리자 세션 필요

## 판정

- `manual order UI`: 안전 경로 `있음`
- `strategy UI`: 공통 안전 경로 `없음`
- `Grid strategy card UI`: 기존 근거(`strategy_id=19`)를 안전하게 재현하는 경로 `없음`
- `DCA strategy UI`: 기존 근거(`strategy_id=8`)를 안전하게 재현하는 경로 `없음`
- `Rebalancing strategy UI`: 기존 근거(`strategy_id=4`, `6`)를 안전하게 재현하는 경로 `없음`
- `live manual before/after / UI-DB mapping`: 기존 근거(`planned_order_id=97`, `89`, `95`, `87`)를 안전하게 재현하는 경로 `없음`
- `DRY RUN / LIVE badge set`: 전체 세트를 안전하게 닫는 공통 경로 `없음`
- `monitor buyer-facing UI`: 현재 확보된 경로 기준 안전한 캡처 경로 `없음`

## monitor 캡처 경계

- 공개 런타임에서 `/monitor` 진입 자체는 가능하다.
  - 근거: `app/monitor/product_app.py`
  - `GET /monitor`는 monitor 홈 진입점이다.
- 하지만 미인증 상태에서는 바로 monitor 화면을 보여주지 않는다.
  - 근거: `app/monitor/product_app.py`
  - `_has_session()`가 실패하면 `/monitor/login`으로 redirect 한다.
- monitor는 main app auth cookie를 재사용하지 않는다.
  - 근거: `MONITOR_AUTH_BOUNDARY.md`
  - main app는 `session`, monitor는 `monitor_session` cookie를 사용한다.
  - 근거: `app/monitor/routes.py`
  - monitor 라우트는 `get_monitor_user()`로만 보호된다.
- guest 세션으로 monitor에 들어가는 경로는 현재 확인되지 않았다.
  - 근거: `static/js/auth.js`
  - guest 예외는 main app의 `/orders` 및 일부 main UI 경로에만 연결되어 있다.
  - 근거: `app/monitor/product_app.py`, `app/monitor/routes.py`
  - monitor는 별도 `monitor_session` cookie가 필요하다.
- monitor 화면 자체는 로그인 후 read-only 관측 용도로 설명 가능하다.
  - 근거: `app/monitor/routes.py`
  - `GET /monitor/orders`, `GET /monitor/activity`
  - 근거: `static/js/monitor.js`
  - recent orders/activity/errors/filter를 렌더링한다.
- 하지만 현재 repo/docs/evidence 범위에는 buyer-facing monitor 로그인에 쓸 안전한 테스트 비밀번호 또는 재현 가능한 seed/init 경로가 없다.
  - 근거: `app/monitor/routes.py`
  - 초기 setup 모드는 `127.0.0.1`, `::1`에서만 허용된다.
  - 근거: `static/monitor_login.html`
  - 공개 런타임에서는 `/monitor/login` 비밀번호 입력이 필요하다.

## Grid 전략 캡처 경계

- guest는 `grid` 탭 진입 자체는 가능하다.
  - 근거: `static/js/home.js`
  - `wrapGuestNavigation()`에서 guest에 `grid` 탭 접근을 허용한다.
- 하지만 guest로 Grid 전략 카드를 실제 데이터와 함께 띄우는 경로는 현재 확인되지 않는다.
  - 근거: `static/js/auth.js`
  - guest 상태에서 `authFetch('/grid/...')`는 실제 서버 조회 대신 `{"strategies":[]}`를 반환한다.
  - 따라서 guest 세션으로는 `strategy_id=19` 같은 기존 Grid 전략 카드/상세를 UI에서 재현할 수 없다.
- 기존 Grid 증거 `strategy_id=19`는 사용자 `user_id=10`의 DB 근거다.
  - 근거: `STRATEGY_EVIDENCE.md`
  - `grid_strategies.id=19`, `grid_orders.id=234`, `235`, `activity_logs.id=46515`
- 현재 repo/docs 기준으로는 위 기존 전략을 로그인 가능한 DRY RUN 계정 화면에서 안전하게 열어 보여주는 절차가 없다.
  - `POST /register`는 일반 유저 생성만 수행
  - `POST /users/{user_id}/dryrun`은 관리자 전용
  - 안전한 DRY RUN 테스트 계정 seed/init 경로는 현 문서 범위에서 확인되지 않았다

## DCA 전략 캡처 경계

- guest는 DCA 탭 조회를 시도할 수는 있다.
  - 근거: `static/js/home.js`
  - 홈 요약은 `authFetch('/dca/strategies')`를 호출한다.
- 하지만 guest로는 실제 DCA 전략 목록을 볼 수 없다.
  - 근거: `static/js/auth.js`
  - guest 상태에서 `/dca` 경로는 `{"strategies":[]}`를 반환한다.
- 기존 DCA 증거 `strategy_id=8`은 사용자 `user_id=10`의 DB 근거다.
  - 근거: `STRATEGY_EVIDENCE.md`
  - `dca_strategies.id=8`, `dca_orders.id=22`
- 일반 self-signup 경로만으로는 위 기존 전략을 안전하게 띄울 수 없다.
  - 근거: `app/api/auth_routes.py`
  - `POST /register`는 새 일반 유저만 생성한다.
  - 근거: `app/api/dca_routes.py`
  - `GET /dca/strategies`, `GET /dca/strategies/{strategy_id}/orders`는 현재 로그인 사용자의 `user_id` 기준으로만 조회한다.
- DRY RUN 경로도 현재 문서 범위에서는 안전하게 확보되지 않았다.
  - 근거: `app/api/auth_routes.py`
  - `POST /users/{user_id}/dryrun`은 관리자 전용이다.
  - 안전한 관리자 테스트 계정/세션 또는 seed/init 절차는 현재 문서 범위에서 확인되지 않았다.

## Rebalancing 전략 캡처 경계

- guest는 Rebalancing 탭 조회를 시도할 수는 있다.
  - 근거: `static/js/home.js`
  - 홈 요약은 `authFetch('/rebalancing/strategies')`를 호출한다.
- 하지만 guest로는 실제 Rebalancing 전략 목록을 볼 수 없다.
  - 근거: `static/js/auth.js`
  - guest 상태에서 `/rebal` 계열 경로는 `{"strategies":[]}`를 반환한다.
- 기존 Rebalancing 증거 `strategy_id=4`, `6`은 특정 사용자 DB 근거다.
  - 근거: `STRATEGY_EVIDENCE.md`
  - `strategy_id=4`는 `users.id=1`, `is_dry_run=true`
  - `strategy_id=6`은 최신 생성 전략이지만 주문/실행 흔적은 없다.
- 일반 self-signup 경로만으로는 위 기존 전략을 안전하게 띄울 수 없다.
  - 근거: `app/api/rebalancing_routes.py`
  - `GET /rebalancing/strategies`, `GET /rebalancing/strategies/{strategy_id}/orders`는 현재 로그인 사용자의 `user_id` 기준으로만 조회한다.
- DRY RUN 전략을 안전하게 재현하는 경로도 현재 문서 범위에서는 없다.
  - 근거: `app/api/auth_routes.py`, `static/js/admin_runtime.js`
  - `POST /users/{user_id}/dryrun`과 관리자 UI 토글은 관리자 세션이 필요하다.
  - 안전한 관리자 테스트 경로는 현재 문서 범위에서 확인되지 않았다.

## 일반 로그인 배지 캡처 경계

- `LIVE` 배지만 보면 self-signup 경로는 있다.
  - 근거: `app/api/auth_routes.py`
  - `POST /register`는 일반 유저를 생성한다.
  - `POST /login` 성공 응답은 `is_guest=False`, `is_dry_run=get_user_dry_run(user["id"])`를 반환한다.
  - 기본 생성 유저는 관리자 경로에서 별도 토글하지 않는 한 dry-run이 아니다.
  - 근거: `static/js/auth.js`
  - `_currentUser.is_guest`가 아니고 `_currentUser.is_dry_run`도 아니면 헤더에 `LIVE` 배지를 표시한다.
- 따라서 “API 키를 등록하지 않고, 주문도 실행하지 않고, self-signup 후 로그인 성공 화면만 캡처”는 LIVE 배지 한정 안전 경로로 해석 가능하다.
- 하지만 `DRY RUN` 일반 로그인 배지는 현재 같은 방식으로 만들 수 없다.
  - 근거: `app/api/auth_routes.py`
  - `POST /users/{user_id}/dryrun`은 관리자 전용이다.
  - `POST /register`만으로는 dry-run 사용자를 만들지 않는다.
  - 근거: `static/js/common.js`, `static/js/admin_runtime.js`
  - 관리자 UI에 user 생성/DRY RUN 토글이 있지만, 이를 사용할 관리자 로그인 경로 또는 안전한 테스트 관리자 계정은 현재 문서 범위에서 확인되지 않았다.

## live manual before/after / UI-DB 매핑 경계

- 현재 문서 범위에는 승인된 안전 테스트 계정/자본/로그인 세션 경로가 없다.
  - 근거: `MANUAL_ORDER_EVIDENCE.md`
  - live manual 근거는 DB/log 기준 `planned_order_id=97`, `89`, `95`, `87`로 정리돼 있지만, buyer-facing UI 재현 경로는 확보하지 못했다고 적혀 있다.
- 기존 live row를 UI에서 안전하게 다시 띄우는 경로도 현재 확인되지 않는다.
  - 근거: `MANUAL_ORDER_EVIDENCE.md`
  - live 주문 row를 직접 보여주는 캡처는 없고, guest sandbox UI만 확보됐다.
  - 근거: `evidence/raw/INDEX.md`
  - live manual 쪽은 DB row와 state/activity 로그만 referenced 상태다.
- read-only UI만으로 live order before/after와 UI-DB 직접 매핑을 닫는 경로도 현재 문서 범위에서는 확인되지 않는다.
  - 근거: `app/monitor/repo.py`, `static/js/monitor.js`
  - monitor는 `planned_orders` recent rows를 읽을 수 있지만, monitor buyer-facing 로그인 경로 자체가 현재 범위에서는 blocked다.
- 따라서 현재 repo/docs/evidence 기준 safe path 판정은 `없음`이다.
- blocker:
  - `live_manual_capture_path_unavailable`

## 실행 확인

- 2026-04-20 기준 위 경로를 실제 실행했다.
- Upbit guest sandbox BUY
  - result id: `20`
  - `symbol=KRW-XRP`
  - `price=2109`
  - `amount_krw=6000`
  - `sandbox=true`
- Upbit guest sandbox SELL
  - result id: `21`
  - `symbol=KRW-XRP`
  - `price=2108`
  - `amount_krw=5500`
  - `sandbox=true`
- Bithumb guest sandbox BUY
  - result id: `22`
  - `symbol=KRW-XRP`
  - `price=2104`
  - `amount_krw=6000`
  - `sandbox=true`
- Bithumb guest sandbox SELL
  - result id: `23`
  - `symbol=KRW-XRP`
  - `price=2105`
  - `amount_krw=5500`
  - `sandbox=true`
- 근거 파일:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_buy_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sell_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_buy_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sell_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`

## 다음에 바로 캡처 가능한 대상

- Upbit manual BUY/SELL UI
- Bithumb manual BUY/SELL UI
- sandbox 기준 잔액/포지션 before/after
- guest 주문 후 `sandbox: True` 응답 또는 화면 반영
