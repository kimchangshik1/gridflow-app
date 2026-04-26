# STRATEGY_EVIDENCE.md

## Grid 요약

- [CONFIRMED] 최신 Grid 종료 근거는 `strategy_id=19`, `user_id=10`, `symbol=KRW-XRP`, `exchange=upbit`다.
- [CONFIRMED] `upbit-bot.service`는 `2026-04-19 08:08:12 UTC`에 `그리드 하한 이탈 (현재가 2108 < 하한 2109)`로 `자동 일시정지`를 직접 기록했다.
- [CONFIRMED] 같은 시각 `grid_strategies.id=19`는 `PAUSED`이고, `activity_logs.id=46515`에도 `자동일시정지`가 남아 있다.
- [INFERRED] 본 건은 미확인 버그보다 하한가 보호 조건에 따른 정상 자동정지로 보는 것이 타당하다.
- missing: buyer-facing UI 캡처는 현재 확보하지 못했다.

## Grid lower-bound auto-stop 근거

- 전략 식별자: `strategy_id=19`
- symbol: `KRW-XRP`
- 전략 설정 snapshot [CONFIRMED]:
  - `grid_strategies.id=19`: `status=PAUSED`, `base_price=2130.00`, `range_pct=1.0000`, `grid_count=2`, `amount_per_grid=5500.00`
  - 생성 `2026-04-19 08:01:22 UTC`
  - 최근 상태 갱신 `2026-04-19 08:08:12 UTC`
- 주문 진행 흔적 [CONFIRMED]:
  - `grid_orders.id=235`: `grid_level=2`, `buy_price=2130.00`, `sell_price=2131.00`, `amount_krw=5500.00`, `status=SELL_ORDERED`
  - 같은 row에 `buy_order_id=54d2b2ce-7017-4388-9ced-9ce96adad769`, `sell_order_id=5f8bbc58-0834-4ca3-af3c-2d519c72e85c`
  - `grid_orders.id=234`는 `grid_level=1`, `status=WAITING`
  - `upbit-bot.service` `2026-04-19 08:01:25 UTC`
    - `[ORDER] 매수 제출: KRW-XRP 2130.0 5500.0원 → 54d2...`
    - `[GRID] 매수 체결: KRW-XRP level=2131.00`
    - `[ORDER] 매도 제출: KRW-XRP 2132.0 2.58215962 → 5f8b...`
    - `[GRID] 매도 주문 제출: KRW-XRP 2132.0원`
- 자동정지 직접 원인 [CONFIRMED]:
  - `upbit-bot.service` `2026-04-19 08:08:12 UTC`
    - `[GRID] 위험관리 자동 일시정지: KRW-XRP - 그리드 하한 이탈 (현재가 2108 < 하한 2109)`
  - `activity_logs.id=46515`
    - `10|strategy|KRW-XRP|upbit|PAUSED|자동일시정지|그리드|2026-04-19 08:08:12 UTC`
  - `app/strategy/grid_engine.py`
    - `current_price < grid_lower`일 때 `status='PAUSED'`, `status_ko='자동일시정지'`를 남기도록 구현돼 있다.
  - `app/api/grid_routes.py`
    - 하한 이탈이 지속되면 `resume_block_reason='그리드 하한 이탈 중 (...)'`으로 재개를 차단한다.
- 해석 [INFERRED]:
  - 설정값 기준 하한은 `2130 * (1 - 0.01) = 2108.7`이고, 로그의 `하한 2109`는 사람이 읽기 위한 반올림/표시값으로 해석할 수 있다.
  - 따라서 `2026-04-19 08:08:12 UTC`의 상태 변화는 "원인 미상의 자동정지"가 아니라 "설정된 하한 이탈에 따른 보호 일시정지"로 보는 편이 근거와 일치한다.
- 증거에서 제외한 항목 [CONFIRMED]:
  - 같은 심볼/타입으로 잡히는 `activity_logs.id=46513`, `46514`는 `strategy_id=19` 생성 시각보다 앞서므로, 본 전략의 직접 근거로 사용하지 않았다.
- 남은 부족 증거:
  - buyer-facing UI 캡처
  - `KRW-XRP` Grid 카드/상세에서 자동정지 상태가 보이는 화면
  - 당시 시세 스냅샷을 별도 원장으로 보여주는 외부 캡처

---

## DCA 요약

- confirmed: 최신 DCA 사례 1건은 `strategy_id=8`, `user_id=10`, `symbol=KRW-XRP`, `exchange=upbit`다.
- confirmed: `dca_orders.id=22`에 `exchange_order_id=14a856e2-ff02-4114-898d-2be32f898b27`, 상태 `FILLED`가 남아 있어 주문 제출과 체결 반영이 확인된다.
- confirmed: 표준 봇 실행 경로(`app/bot.py`)에서는 `DCAEngine(..., user_manager=user_manager)`로 연결되고, 엔진은 `user_id` 기준 `UserBotManager._user_bots[user_id]`에서 클라이언트를 가져온다.
- missing: buyer-facing UI 캡처와 최신 파일 로그 매칭 라인은 현재 확보하지 못했다.

## DCA 최신 근거

- 전략 식별자: `strategy_id=8`
- symbol: `KRW-XRP`
- 전략 시각:
  - 생성 `2026-04-20 04:23:39 UTC`
  - 최근 상태 갱신 `2026-04-20 04:24:02 UTC`
- 제출 근거 confirmed:
  - `dca_orders.id=22`
  - `user_id=10`
  - `round_num=1`
  - `price=2088.00`
  - `amount_krw=5500.00`
  - `qty=2.63409962`
  - `exchange_order_id=14a856e2-ff02-4114-898d-2be32f898b27`
- 체결 또는 상태 확인 근거 confirmed:
  - `dca_orders.id=22` 상태 `FILLED`
  - `dca_strategies.id=8` 상태 `ACTIVE`
  - `completed_rounds=1`에 해당하는 1차 주문 흔적으로 해석 가능
- 사용자 키 사용 근거 confirmed:
  - `users.id=10`은 `username=kingminyong`, `is_dry_run=false`, `is_guest=false`
  - `bot_configs`에 `user_id=10` 기준 `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`가 모두 `present`
  - `app/api/dca_routes.py`는 DCA 생성 시 `BotConfig.user_id == user["user_id"]` 조건으로 사용자 키를 조회한다.
  - `app/bot.py`는 표준 실행 경로에서 `DCAEngine(shared_client, interval_sec=60, user_manager=user_manager)`로 연결한다.
  - `app/strategy/dca_engine.py`의 `_get_client(exchange, user_id)`는 `self._user_manager._user_bots.get(user_id)`에서 사용자별 클라이언트를 선택하고, 이 경로에서는 공용 `shared_client`로 폴백하지 않는다.

## DCA 사용자 키 사용 / env fallback 배제 판정

- 사용자 키 사용: confirmed
  - 사용자 10의 Upbit 키 레코드 존재와 `user_id` 기준 조회 코드, `user_manager` 기준 클라이언트 선택 코드가 함께 확인된다.
- env fallback 배제: confirmed
  - 표준 봇 실행 경로에서는 `user_manager`가 주입되고, `_get_client()`는 `user_manager`가 있을 때 `user_id`별 클라이언트만 사용한다.
  - 단, `DCAEngine` 클래스 자체에는 `user_manager`가 없을 때 공용 클라이언트를 쓰는 보조 경로가 남아 있다. 현재 운영 주경로 기준 판정이다.

## DCA UI / DB / log 판정

- UI: missing
  - 현재 확보한 자료 안에서는 `strategy_id=8` 또는 `KRW-XRP` DCA 화면 캡처를 확인하지 못했다.
- DB: confirmed
  - `dca_strategies`: `8|10|upbit|KRW-XRP|ACTIVE|DCA|11000.00|5500.00|PRICE|1.0000|2026-04-20 04:23:39+00|2026-04-20 04:24:02+00`
  - `dca_orders`: `22|8|10|upbit|KRW-XRP|1|2088.00|5500.00|2.63409962|FILLED|14a856e2-ff02-4114-898d-2be32f898b27|2026-04-20 04:24:02+00`
- log: missing
  - 최신 `strategy_id=8` 주문과 직접 매칭되는 `activity_logs` 또는 `bot.log` 라인은 현재 확인하지 못했다.

## DCA inferred

- inferred: `dca_strategies.id=8`의 `total_amount=11000.00`, `amount_per_order=5500.00`, `dca_orders.round_num=1` 조합상 2회 분할 중 1차 주문이 실행된 상태로 해석할 수 있다.

## DCA missing

- missing: buyer-facing UI 캡처
- missing: 최신 DCA 주문 제출/체결 화면 캡처
- missing: `strategy_id=8`과 `dca_orders.id=22`를 직접 연결해 보여주는 UI 또는 로그 증거
- missing: 최신 실행을 보여주는 `activity_logs` 또는 파일 로그 라인

## DCA needed capture / 추가로 필요한 캡처·추출

- DCA 전략 목록 또는 상세 화면에서 `KRW-XRP` / `strategy_id=8`이 보이는 캡처
- `dca_orders.id=22` 제출 및 체결 상태가 보이는 UI 캡처
- `dca_strategies.id=8`, `dca_orders.id=22` 기준 sanitized DB 추출 스냅샷
- 사용자 10의 Upbit 키 등록 상태를 민감값 없이 보여주는 설정 화면 캡처

---

## Rebalancing 요약

- evidence level: `run-now live/semi-live evidence confirmed`
- [CONFIRMED] `2026-04-21 08:12:36 UTC`에 `POST /rebalancing/strategies/7/rebalance-now`가 `200 OK`로 처리됐다.
- [CONFIRMED] 같은 초 `gridflow-app.service`에 `리밸런싱 시작 -> KRW-ETH 매수 제출 -> 리밸런싱 완료: strategy_id=7` 로그가 연속으로 남아 있다.
- [CONFIRMED] `users.id=10 (kingminyong)`은 `is_dry_run=false`, `is_guest=false`이고, `bot_configs`에 `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`가 모두 `present`다.
- [CONFIRMED] `rebalancing_orders`는 `08:12:36 UTC` 이전 `strategy_id=7` row가 `0건`이었고, 이후 `127건`으로 늘었다. 첫 row는 `08:12:36.777861 UTC`의 `KRW-ETH BUY`, `status=FILLED`, `exchange_order_id=a81edf04-...`다.
- [INFERRED] buyer/internal review 기준으로는 `run-now`가 실전 또는 준실전에서 실제 주문 경로를 탔다는 근거로 사용 가능하다.
- missing: 외부 거래소 체결 화면 캡처는 아직 없다.

## Rebalancing run-now 실전/준실전 근거

- 전략 식별자: `strategy_id=7`
- 사용자/키 근거 [CONFIRMED]:
  - `users.id=10`: `username=kingminyong`, `is_dry_run=false`, `is_guest=false`
  - `bot_configs`: `10|UPBIT_ACCESS_KEY|present`, `10|UPBIT_SECRET_KEY|present`
  - `app/api/rebalancing_routes.py`는 non-dry-run 경로에서 `BotConfig.user_id == user["user_id"]` 기준 사용자 키를 읽어 엔진을 구성한다.
- 호출 및 로그 체인 [CONFIRMED]:
  - `gridflow-app.service` `2026-04-21 08:12:36 UTC`
    - `[REBAL] 리밸런싱 시작: 총 67,828원`
    - `[ORDER] 매수 제출: KRW-ETH 3427000.0 16957.03104785원 → a81edf04-983c-46f3-94ce-fbdaa0573dd1`
    - `[REBAL] 매수: KRW-ETH 16,957원 (14.7% → 39.7%)`
    - `[REBAL] 리밸런싱 완료: strategy_id=7`
    - `INFO: POST /rebalancing/strategies/7/rebalance-now HTTP/1.0 200 OK`
- DB 변화 [CONFIRMED]:
  - `rebalancing_orders`는 `2026-04-21 08:12:36 UTC` 이전 `strategy_id=7` row가 `0건`이었다.
  - 첫 row는 `rebalancing_orders.id=5`다.
    - `symbol=KRW-ETH`, `side=BUY`, `amount_krw=16957.03`
    - `status=FILLED`
    - `exchange_order_id=a81edf04-983c-46f3-94ce-fbdaa0573dd1`
    - `created_at=2026-04-21 08:12:36.777861 UTC`
  - 문서 갱신 시점 snapshot:
    - `rebalancing_strategies.id=7`: `status=ACTIVE`, `last_rebal_at=2026-04-21 10:19:49.76958 UTC`, `rebal_count=127`, `total_value_krw=43935.00`
    - 위 집계값은 전략이 `ACTIVE`인 동안 계속 변할 수 있으므로, run-now 직접 근거는 `08:12:36 UTC` 호출과 첫 주문 row를 우선 증거로 본다.
- 코드 연결 [CONFIRMED]:
  - `app/api/rebalancing_routes.py`
    - `POST /rebalancing/strategies/{strategy_id}/rebalance-now`는 `engine.execute_strategy_now(strategy_id, user_id)`를 호출한다.
  - `app/strategy/rebalancing_engine.py`
    - `execute_strategy_now()`는 `_run_loaded_strategy(..., force=True)`로 즉시실행 경로를 타며
    - `_execute_rebalance()`는 `rebalancing_orders` insert, `last_rebal_at`/`rebal_count`/`total_value_krw` update, `rebalancing_assets` 갱신을 수행한다.
- UI 반영 흔적:
  - [CONFIRMED] 같은 날 런타임 QA에서 Rebalancing 상세 패널에 `실행 요약`, `최근 실행`, `실행 횟수`, `평가 금액`, `고급 설정`, `주문 내역` 섹션이 노출되는 것은 확인했다.
  - missing: buyer-facing 스크린샷 파일은 아직 보관하지 못했다.
- 해석 [INFERRED]:
  - non-dry-run 사용자, 사용자 키 존재, DRY 접두사 없는 실제 주문 ID, `FILLED` row, 같은 초 `run-now 200 OK` 로그가 함께 존재하므로, 본 사례는 buyer/internal review에서 "즉시실행 로그/기록이 남아 있고 실전 근거로 간주 가능"한 사례로 정리할 수 있다.
- 보조 참고 [CONFIRMED]:
  - 이전 `strategy_id=4` 사례는 여전히 DRY RUN 기준선으로 유효하지만, 이번 문서에서 닫는 핵심 근거는 `strategy_id=7`의 `run-now` 실전/준실전 사례다.
- 남은 부족 증거:
  - 외부 거래소 체결 화면 캡처
  - buyer-facing Rebalancing 상세 캡처 보관본
  - `activity_logs` 기반 Rebalancing 전용 기록
