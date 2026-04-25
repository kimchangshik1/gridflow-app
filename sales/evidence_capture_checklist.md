# sales/evidence_capture_checklist.md

기준
- 작성 기준: 2026-04-20 UTC
- 입력 문서:
  - `AUTH_MODE_EVIDENCE.md`
  - `MANUAL_ORDER_EVIDENCE.md`
  - `STRATEGY_EVIDENCE.md`
  - `OPERATIONS_EVIDENCE.md`
  - `sales/evidence_one_pager.md`
  - `evidence/raw/INDEX.md`
  - `GRIDFLOW_RELEASE_EVIDENCE.txt`
- 범위:
  - 현재 `missing`으로 남은 buyer-facing UI evidence만 정리
  - external HOLD 영향이 큰 순서 우선
  - buyer-facing 핵심 shot만 10개 이내 유지

| Priority | shot name | why needed | linked section | precondition | must-show elements | sanitize note | status |
|---|---|---|---|---|---|---|---|
| P0 | `auth_mode_triptych` | 메인 auth와 `GUEST / DRY RUN / LIVE` 모드 분기를 buyer가 한 번에 이해하도록 필요 | `AUTH_MODE_EVIDENCE > Confirmed 10, Missing 1,2,3,5`, `sales/evidence_one_pager.md > 1. 인증 / 모드` | guest 1세션, dry-run 1세션, live 1세션 로그인 가능 상태 | username, mode badge, 동일 헤더/상태 영역 | 사용자명 일부 마스킹 가능, 토큰/쿠키/민감값 비노출 | captured |
| P0 | `auth_logout_and_restore_pair` | 세션 유지와 해제를 화면 기준으로 닫아 auth 증거의 HOLD를 줄이기 위해 필요 | `AUTH_MODE_EVIDENCE > Confirmed 11,12`, `GRIDFLOW_RELEASE_EVIDENCE.txt > 7` | 로그인된 세션 1개 | 새로고침 후 유지 화면 1장, 로그아웃 후 로그인 화면 복귀 1장 | 사용자명 일부 마스킹 가능 | captured |
| P0 | `upbit_manual_order_buy_sell_set` | Upbit manual BUY/SELL이 실제 UI에서 제출·체결된다는 점을 buyer가 바로 이해하도록 필요 | `MANUAL_ORDER_EVIDENCE > Guest Sandbox UI Capture`, `sales/evidence_one_pager.md > 2. 수동 주문` | Upbit 주문 테스트 가능 상태, 증거 대상 주문 식별 가능 | BUY 입력/제출/체결, SELL 입력/제출/체결, 화면상 주문 식별자 또는 시간 | API 키/잔액 숫자 민감 시 일부 마스킹 | captured |
| P0 | `bithumb_manual_order_buy_sell_set` | Bithumb manual BUY/SELL 성공을 UI 기준으로 닫기 위해 필요 | `MANUAL_ORDER_EVIDENCE > Bithumb Guest Sandbox UI Capture`, `sales/evidence_one_pager.md > 2. 수동 주문` | Bithumb 주문 테스트 가능 상태, 증거 대상 주문 식별 가능 | BUY 입력/제출/체결, SELL 입력/제출/체결, 가능하면 최소 주문 규칙 표시 | API 키/잔액 숫자 민감 시 일부 마스킹 | captured |
| P0 | `grid_cycle_strategy_card` | Grid 1사이클 근거를 DB가 아니라 화면에서도 식별 가능하게 만들기 위해 필요 | `STRATEGY_EVIDENCE > Grid missing`, `sales/evidence_one_pager.md > 3. 전략 엔진` | `strategy_id=19` 또는 동일한 최신 Grid 사례 화면 접근 가능 | symbol `KRW-XRP`, strategy 식별 정보, `SELL_ORDERED` 또는 `WAITING` 상태 | 사용자명/잔액 민감값 최소 노출 | ready |
| P1 | `dca_strategy_and_fill` | DCA 실행과 사용자 키 라우팅 근거를 화면 측면에서 보강하기 위해 필요 | `STRATEGY_EVIDENCE > DCA missing`, `sales/evidence_one_pager.md > 3. 전략 엔진` | `strategy_id=8` 또는 동일 최신 DCA 사례 화면 접근 가능 | strategy symbol `KRW-XRP`, filled/submitted 주문 표시, 가능하면 사용자 설정 상태 | API 키 전체값 비노출, 마스킹 상태만 노출 | ready |
| P1 | `rebalancing_strategy_dry_run_screen` | Rebalancing이 live confirmed는 아니지만 DRY RUN 증거 수준이라는 점을 오해 없이 보여주기 위해 필요 | `STRATEGY_EVIDENCE > Rebalancing missing`, `sales/evidence_one_pager.md > 3. 전략 엔진` | `strategy_id=4` 또는 동등 DRY RUN 사례 화면 접근 가능 | asset mix, DRY RUN 주문 2건 또는 상태, trigger 관련 정보 | 민감값/계정 식별 최소 노출 | blocked |
| P1 | `emergency_stop_and_recovery_screen_pair` | 실제로 멈출 수 있고 해제 상태도 확인 가능하다는 점을 buyer 화면 기준으로 보강하기 위해 필요 | `OPERATIONS_EVIDENCE > missing`, `sales/evidence_one_pager.md > 4. 운영 / 안전` | emergency 상태와 정상 상태 각각 접근 가능 | stopped indicator 1장, recovered/normal indicator 1장 | 장애 세부 원인 중 민감한 내부값은 가림 | needs runtime event |
| P1 | `monitor_readonly_overview` | monitor가 recent orders/activity/errors를 읽기 중심으로 본다는 점을 buyer가 한 화면에서 이해하도록 필요 | `OPERATIONS_EVIDENCE > monitor confirmed`, `sales/evidence_one_pager.md > 4. 운영 / 안전` | monitor 로그인 가능 상태 | recent orders, activity, latest error, read-only 관측 UI | API key/secret/config 값 비노출 | ready |
| P2 | `monitor_filter_interaction` | monitor의 filter/read-only usability를 보강하되 external HOLD 영향은 상대적으로 낮음 | `OPERATIONS_EVIDENCE > 추가 needed capture`, `evidence/raw/INDEX.md > monitor filter interaction capture` | monitor 데이터 로드 상태 | 필터 전/후 상태 변화, 거래소/상태 필터 UI | 민감한 row 일부 마스킹 가능 | ready |

## 우선 메모

- P0는 auth, manual order, 핵심 strategy 화면 증거 부족으로 생기는 external HOLD를 줄이는 데 직접 연결된다.
- `auth_mode_triptych`는 2026-04-20 기준 partial capture 상태다.
  - `guest_mode_badge.png`, `logout_overlay_return.png`, `refresh_session_result.png`는 실제 확보됐다.
  - guest 기준 auth P0 핵심 샷은 닫혔다.
  - `login_error_invalid_credentials.png`도 실제 확보됐다.
  - `live_mode_badge.png`도 실제 확보됐다.
  - 현재 남은 blocker는 `DRY RUN` 재현용 테스트 세션 부재다.
- `upbit_manual_order_buy_sell_set`은 2026-04-20 기준 guest sandbox 경로로 확보됐다.
  - `upbit_guest_buy_result.png`, `upbit_guest_sell_result.png`, `upbit_guest_position_before_after.png`를 확보했다.
  - 이번 증거는 live 실거래가 아니라 guest sandbox UI 기준이다.
- `bithumb_manual_order_buy_sell_set`도 2026-04-20 기준 guest sandbox 경로로 확보됐다.
  - `bithumb_guest_buy_result.png`, `bithumb_guest_sell_result.png`, `bithumb_guest_position_before_after.png`를 확보했다.
  - 이번 증거는 live 실거래가 아니라 guest sandbox UI + runtime 응답 기준이다.
  - 다만 이번 샷에서는 주문/포지션 테이블 반영까지는 닫히지 않았다.
- `rebalancing_strategy_dry_run_screen`은 현재 문서 기준 live 사례가 아니라 DRY RUN 화면이 필요하다. live confirmed로 오해되면 안 된다.
- backup/restore/alert는 현재 UI보다 log/doc 근거가 더 강하다. 이번 checklist는 화면 캡처만 다루므로 별도 log snapshot bundle은 포함하지 않았다.
