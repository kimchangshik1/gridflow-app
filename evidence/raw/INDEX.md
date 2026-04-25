# evidence/raw/INDEX.md

기준
- 작성 기준: 2026-04-20 UTC
- 기준 문서:
  - `AUTH_MODE_EVIDENCE.md`
  - `MANUAL_ORDER_EVIDENCE.md`
  - `STRATEGY_EVIDENCE.md`
  - `OPERATIONS_EVIDENCE.md`
- 원칙:
  - 위 문서에 근거가 있는 raw asset만 기록
  - `status`는 `present / referenced / missing`만 사용
  - 실제 번들 파일이 현재 저장소에 확인되지 않으면 `referenced`

| category | asset name | source type | related section | status | note |
|---|---|---|---|---|---|
| auth | `app/api/auth_routes.py` login/logout/me/guest session code refs | doc | `AUTH_MODE_EVIDENCE > Confirmed 1~7` | referenced | cookie session, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/guest/session` 코드 근거 |
| auth | `app/auth/dependencies.py` cookie auth dependency ref | doc | `AUTH_MODE_EVIDENCE > Confirmed 3,5` | referenced | `session` cookie only auth 경로 |
| auth | `static/js/auth.js` mode badge code ref | doc | `AUTH_MODE_EVIDENCE > Confirmed 8` | referenced | `GUEST / DRY RUN / LIVE` 표시 분기 |
| auth | `auth_security_audit.md` | doc | `AUTH_MODE_EVIDENCE > Confirmed 3,8` | present | 새로고침 복원, `_currentUser` 복원 경로 문서 |
| auth | `ASSET_SNAPSHOT.md` API key storage note | doc | `AUTH_MODE_EVIDENCE > Confirmed 9` | present | `bot_configs`, `.upbit_bot_key` 언급 |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/guest_mode_badge.png` | screenshot | `AUTH_MODE_EVIDENCE > Confirmed 10` | present | 2026-04-20 06:58 UTC 공개 런타임 guest username + `GUEST` 배지 화면 |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/logout_overlay_return.png` | screenshot | `AUTH_MODE_EVIDENCE > Confirmed 11` | present | 2026-04-20 07:17 UTC guest 로그아웃 후 로그인 오버레이 복귀 화면 |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/refresh_session_result.png` | screenshot | `AUTH_MODE_EVIDENCE > Confirmed 12` | present | 2026-04-20 07:17 UTC guest 새로고침 후 `GUEST` 세션 유지 화면 |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_logout_refresh_result.json` | doc | `AUTH_MODE_EVIDENCE > Confirmed 12` | present | one-off interaction run result, `refresh_result=session persists` |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/login_error_invalid_credentials.png` | screenshot | `AUTH_MODE_EVIDENCE > Confirmed 13` | present | 2026-04-20 07:22 UTC dummy 자격증명 1회 로그인 실패 화면 |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_login_error_result.json` | doc | `AUTH_MODE_EVIDENCE > Confirmed 13` | present | one-off invalid login run result, `error_text=아이디 또는 비밀번호가 올바르지 않습니다` |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/live_mode_badge.png` | screenshot | `AUTH_MODE_EVIDENCE > Confirmed 14` | present | 2026-04-20 08:07 UTC 일반 로그인 성공 후 `LIVE` 배지 화면 |
| auth | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/live_badge_direct_register_result.json` | doc | `AUTH_MODE_EVIDENCE > Confirmed 14` | present | direct `/auth/register` -> `/auth/login` run result, `register_status=200`, `login_status=200`, `LIVE` |
| auth | login success UI capture set | screenshot | `AUTH_MODE_EVIDENCE > Missing 2` | referenced | `GUEST`, `LIVE`는 확보, `DRY RUN` 배지는 아직 없음 |
| auth | `sales/guest_sandbox_proof_bundle.md` | doc | `AUTH_MODE_EVIDENCE > Missing 6` | present | guest 주문 -> sandbox 처리 UI/JSON/코드/DB bridge 묶음 |
| auth | multi-user key routing sanitized extract | db | `AUTH_MODE_EVIDENCE > Missing 7` | missing | `bot_configs` + `users.is_dry_run` 차이 추출 |
| manual-order | `planned_orders` row `97` Upbit BUY | db | `MANUAL_ORDER_EVIDENCE > BUY confirmed` | referenced | `planned_order_id=97`, `exchange_order_id=d6a1578d-aa8b-4f23-bc87-7b4ade20faa1` |
| manual-order | `state_transition_logs` flow for `planned_order_id=97` | db | `MANUAL_ORDER_EVIDENCE > BUY confirmed` | referenced | `NEW -> PLANNED -> QUEUED -> SUBMITTED -> FILLED` |
| manual-order | `activity_logs` BUY rows for `KRW-ETH` / `planned_order_id=97` window | db | `MANUAL_ORDER_EVIDENCE > BUY confirmed` | referenced | `SUBMITTED`, `FILLED` at 2026-04-20 04:43 UTC |
| manual-order | `planned_orders` row `89` Upbit SELL | db | `MANUAL_ORDER_EVIDENCE > SELL confirmed` | referenced | `planned_order_id=89`, `exchange_order_id=f4286f56-3710-4b9a-8e8c-e38440aa7ee9` |
| manual-order | `state_transition_logs` flow for `planned_order_id=89` | db | `MANUAL_ORDER_EVIDENCE > SELL confirmed` | referenced | `NEW -> PLANNED -> QUEUED -> SUBMITTED -> FILLED` |
| manual-order | `activity_logs` SELL rows for `KRW-USDT` / `planned_order_id=89` window | db | `MANUAL_ORDER_EVIDENCE > SELL confirmed` | referenced | `SUBMITTED`, `FILLED` at 2026-04-18 09:23~09:34 UTC |
| manual-order | `planned_orders` row `95` Bithumb BUY | db | `MANUAL_ORDER_EVIDENCE > Bithumb BUY confirmed` | referenced | `exchange_order_id=C0866000000162275908` |
| manual-order | `state_transition_logs` flow for `planned_order_id=95` | db | `MANUAL_ORDER_EVIDENCE > Bithumb BUY confirmed` | referenced | includes `ACTIVE -> FILLED` |
| manual-order | `activity_logs` BUY rows for Bithumb `KRW-USDT` / id `95` window | db | `MANUAL_ORDER_EVIDENCE > Bithumb BUY confirmed` | referenced | `SUBMITTED`, `FILLED` |
| manual-order | `planned_orders` row `87` Bithumb SELL | db | `MANUAL_ORDER_EVIDENCE > Bithumb SELL confirmed` | referenced | `exchange_order_id=C0866000000162272989` |
| manual-order | `state_transition_logs` flow for `planned_order_id=87` | db | `MANUAL_ORDER_EVIDENCE > Bithumb SELL confirmed` | referenced | `NEW -> PLANNED -> QUEUED -> SUBMITTED -> FILLED` |
| manual-order | `activity_logs` SELL rows for Bithumb `KRW-USDT` / id `87` window | db | `MANUAL_ORDER_EVIDENCE > Bithumb SELL confirmed` | referenced | `SUBMITTED`, `FILLED` |
| manual-order | `app/api/bithumb_routes.py` SELL min rule code ref | doc | `MANUAL_ORDER_EVIDENCE > Bithumb SELL 최소 주문량 규칙` | referenced | `qty > 0`, calculated `amount_krw >= 5500` |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_buy_result.png` | screenshot | `MANUAL_ORDER_EVIDENCE > Guest Sandbox UI Capture` | present | 2026-04-20 07:36 UTC guest `GUEST` 배지 + Upbit BUY 화면 + XRP 포지션 반영 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sell_result.png` | screenshot | `MANUAL_ORDER_EVIDENCE > Guest Sandbox UI Capture` | present | 2026-04-20 07:36 UTC guest `GUEST` 배지 + Upbit SELL 화면 + XRP 잔여 포지션 반영 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_position_before_after.png` | screenshot | `MANUAL_ORDER_EVIDENCE > guest sandbox position 변화 단서` | present | guest sandbox 전후 포지션 상태 캡처 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json` | doc | `MANUAL_ORDER_EVIDENCE > Guest Sandbox UI Capture` | present | `id=20`, `id=21`, `sandbox=true`, `KRW-XRP`, `BUY/SELL`, runtime position delta |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/manual/guest_sandbox_db_extract.txt` | db | `MANUAL_ORDER_EVIDENCE > guest sandbox DB raw bridge` | present | `sandbox_orders` `20`~`23`, `activity_logs` `46520`~`46523`, `sandbox_balances` `9104`, `9136` |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/manual/guest_sandbox_position_db_bridge.txt` | db | `MANUAL_ORDER_EVIDENCE > guest sandbox DB raw bridge` | present | guest position qty bridge 판정. `sandbox` 자산 row 없음, `positions`는 `user_id` 없음 |
| manual-order | Upbit balance before/after proof | db | `MANUAL_ORDER_EVIDENCE > Missing 3` | referenced | guest sandbox runtime delta는 확보, live DB 기준 KRW/asset 변화 추출은 아직 없음 |
| manual-order | Upbit UI-DB id mapping capture | screenshot | `MANUAL_ORDER_EVIDENCE > Missing 4` | referenced | sandbox id는 확보, live `planned_order_id` 직접 매핑은 아직 없음 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_buy_result.png` | screenshot | `MANUAL_ORDER_EVIDENCE > Bithumb Guest Sandbox UI Capture` | present | 2026-04-20 07:42 UTC guest `GUEST` 배지 + Bithumb BUY 패널 + `KRW-XRP` 화면 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sell_result.png` | screenshot | `MANUAL_ORDER_EVIDENCE > Bithumb Guest Sandbox UI Capture` | present | 2026-04-20 07:42 UTC guest `GUEST` 배지 + Bithumb SELL 패널 + `KRW-XRP` 화면 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_position_before_after.png` | screenshot | `MANUAL_ORDER_EVIDENCE > Bithumb guest sandbox position / balance 화면 반영` | present | guest sandbox 전후 화면 캡처. 이번 샷에서는 포지션/주문 반영은 보이지 않음 |
| manual-order | `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json` | doc | `MANUAL_ORDER_EVIDENCE > Bithumb Guest Sandbox UI Capture` | present | `id=22`, `id=23`, `sandbox=true`, `KRW-XRP`, `BUY/SELL`, `amount_krw=6000/5500` |
| manual-order | Bithumb UI-DB id mapping capture | screenshot | `MANUAL_ORDER_EVIDENCE > Bithumb missing 3` | referenced | sandbox id는 확보, live `planned_order_id` / `exchange_order_id` 직접 매핑은 아직 없음 |
| strategy | `grid_strategies` row `19` | db | `STRATEGY_EVIDENCE > Grid 1사이클 최신 근거` | referenced | `KRW-XRP`, `PAUSED`, updated `2026-04-19 08:08:12 UTC` |
| strategy | `grid_orders` rows `234`, `235` | db | `STRATEGY_EVIDENCE > Grid 1사이클 최신 근거` | referenced | `234 WAITING`, `235 SELL_ORDERED`, buy/sell order ids |
| strategy | `activity_logs` row `46515` | db | `STRATEGY_EVIDENCE > Grid 1사이클 최신 근거` | referenced | `KRW-XRP`, `PAUSED`, `자동일시정지` |
| strategy | Grid UI capture set for `strategy_id=19` | screenshot | `STRATEGY_EVIDENCE > Grid missing` | missing | strategy card/detail, `SELL_ORDERED` 화면 |
| strategy | `dca_strategies` row `8` | db | `STRATEGY_EVIDENCE > DCA 최신 근거` | referenced | `KRW-XRP`, `ACTIVE`, updated `2026-04-20 04:24:02 UTC` |
| strategy | `dca_orders` row `22` | db | `STRATEGY_EVIDENCE > DCA 최신 근거` | referenced | `FILLED`, `exchange_order_id=14a856e2-ff02-4114-898d-2be32f898b27` |
| strategy | `users` row `10` dry/live context | db | `STRATEGY_EVIDENCE > DCA 최신 근거` | referenced | `is_dry_run=false`, `is_guest=false` |
| strategy | `bot_configs` keys for `user_id=10` | db | `STRATEGY_EVIDENCE > DCA 최신 근거` | referenced | `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY` present |
| strategy | `app/api/dca_routes.py`, `app/bot.py`, `app/strategy/dca_engine.py` refs | doc | `STRATEGY_EVIDENCE > DCA 최신 근거` | referenced | user-key lookup and `user_manager` routing |
| strategy | DCA UI capture set for `strategy_id=8` | screenshot | `STRATEGY_EVIDENCE > DCA missing` | missing | strategy list/detail and filled order |
| strategy | `rebalancing_strategies` row `4` | db | `STRATEGY_EVIDENCE > Rebalancing 최신 근거` | referenced | `BOTH`, `threshold_pct=5`, `last_rebal_at`, `rebal_count=1` |
| strategy | `rebalancing_assets` rows `7`, `8` | db | `STRATEGY_EVIDENCE > Rebalancing 최신 근거` | referenced | `KRW-BTC 50%`, `KRW-ETH 50%` |
| strategy | `rebalancing_orders` rows `1`, `2` | db | `STRATEGY_EVIDENCE > Rebalancing 최신 근거` | referenced | `REBAL-DRY-BUY-*`, `CANCELLED`, DRY RUN |
| strategy | `users` row `1` dry-run context | db | `STRATEGY_EVIDENCE > Rebalancing 최신 근거` | referenced | `is_dry_run=true` |
| strategy | `app/strategy/rebalancing_engine.py` trigger and DRY code ref | doc | `STRATEGY_EVIDENCE > Rebalancing 최신 근거` | referenced | `BOTH`, first-run trigger, `[REBAL][DRY]` path |
| strategy | Rebalancing UI capture set | screenshot | `STRATEGY_EVIDENCE > Rebalancing missing` | missing | strategy detail and DRY orders |
| ops | `bot.log.1` emergency stop lines | log | `OPERATIONS_EVIDENCE > stop confirmed` | present | `[EMERGENCY] 비상정지 발동: balance_query_failed`, `정지 상태` |
| ops | `/home/ubuntu/upbit_bot/evidence/raw/ops/emergency_stop_release_pair_trace.txt` | log | `OPERATIONS_EVIDENCE > missing` | present | latest `2026-04-18` stop vs reset trace, final verdict `pair_not_found` |
| ops | `audit_logs` row `238512` | db | `OPERATIONS_EVIDENCE > stop confirmed` | referenced | `emergency_stop_triggered`, `balance_query_failed` |
| ops | `audit_logs` row `5258` | db | `OPERATIONS_EVIDENCE > release confirmed` | referenced | `emergency_stop_reset`, `auto_recovered` |
| ops | `app/monitor/emergency_stop.py` | doc | `OPERATIONS_EVIDENCE > release confirmed` | referenced | `trigger()` / `reset()` logic |
| ops | emergency stop UI capture | screenshot | `OPERATIONS_EVIDENCE > missing` | missing | monitor or ops screen showing stopped state |
| ops | emergency release UI capture | screenshot | `OPERATIONS_EVIDENCE > needed capture` | missing | recovered/normal state |
| ops | `GRIDFLOW_RELEASE_EVIDENCE.txt` backup/restore/alert records | doc | `OPERATIONS_EVIDENCE > backup / restore / alert 요약` | present | 2026-04-18 ops evidence master doc |
| ops | `DEPLOYMENT_BASELINE.txt` timers/services/runtime topology | doc | `OPERATIONS_EVIDENCE > backup / restore confirmed` | present | 2026-04-20 baseline with timer/service refs |
| ops | `/home/ubuntu/upbit_bot/evidence/raw/ops/backup_dump_presence.txt` | log | `OPERATIONS_EVIDENCE > backup / restore confirmed` | present | 2026-04-20 recheck success, dump file + backup START/OK excerpt |
| ops | `/home/ubuntu/upbit_bot/evidence/raw/ops/restore_verify_excerpt.txt` | log | `OPERATIONS_EVIDENCE > backup / restore confirmed` | present | 2026-04-20 restore verify START/OK excerpt |
| ops | `/home/ubuntu/upbit_bot/evidence/raw/ops/health_alert_excerpt.txt` | log | `OPERATIONS_EVIDENCE > health alert confirmed` | present | alert dispatch line, current timer/state excerpt, suppression limited note |
| ops | `/home/ubuntu/upbit_bot/evidence/raw/ops/health_alert_suppression_check.txt` | log | `OPERATIONS_EVIDENCE > health alert confirmed` | present | duplicate suppression raw check. dispatch lines and timer success are present, suppression direct proof remains limited |
| ops | `/var/log/gridflow_backup.log` log lines | log | `OPERATIONS_EVIDENCE > backup / restore confirmed` | referenced | 2026-04-20 `START/OK` for `/var/backups/gridflow/upbit_bot_20260420_032935.dump` |
| ops | `/var/backups/gridflow/upbit_bot_20260420_032935.dump` | log | `OPERATIONS_EVIDENCE > backup / restore confirmed` | referenced | 2026-04-20 live recheck success |
| ops | `/var/log/gridflow_restore_verify.log` log lines | log | `OPERATIONS_EVIDENCE > backup / restore confirmed` | referenced | 2026-04-20 `restore_verify` OK to temp DB |
| ops | `/var/log/gridflow_alert.log.1` log lines | log | `OPERATIONS_EVIDENCE > health alert confirmed` | referenced | alert dispatch line at `2026-04-18 09:09:57 UTC` |
| ops | `/var/lib/gridflow/health_alert.last` state file | log | `OPERATIONS_EVIDENCE > health alert confirmed` | referenced | current timer run state, not direct suppression proof |
| ops | monitor app routes `GET /monitor/orders`, `GET /monitor/activity` | doc | `OPERATIONS_EVIDENCE > monitor confirmed` | referenced | read-only observation scope |
| ops | `app/monitor/repo.py` recent orders/activity query refs | doc | `OPERATIONS_EVIDENCE > monitor confirmed` | referenced | reads `planned_orders`, `activity_logs` |
| ops | `static/js/monitor.js` UI refs | doc | `OPERATIONS_EVIDENCE > monitor confirmed` | referenced | recent orders/activity/errors/filter UI |
| ops | monitor recent orders/activity/errors screenshots | screenshot | `OPERATIONS_EVIDENCE > 추가 missing` | missing | buyer-facing monitor screens |
| ops | monitor filter interaction capture | screenshot | `OPERATIONS_EVIDENCE > 추가 needed capture` | missing | filter before/after |
| ops | backup/restore/alert sanitized log extracts | log | `OPERATIONS_EVIDENCE > 추가 needed capture` | missing | snapshot bundle for `/var/log/gridflow_*` |
