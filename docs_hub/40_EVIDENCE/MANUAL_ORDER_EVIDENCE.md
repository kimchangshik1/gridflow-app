# MANUAL_ORDER_EVIDENCE

기준
- 작성 기준: 2026-04-20 UTC
- 범위: Upbit manual BUY 1건, Upbit manual SELL 1건
- 원칙: 기존 문서/DB/로그/코드 근거만 사용. 없는 캡처는 만들지 않고 `needed capture`로 남김

## 요약

- `confirmed`: Upbit manual `BUY`와 `SELL` 각각 최신 성공 근거 1건을 DB/활동 로그/상태 전이 로그로 확인했다.
- `confirmed`: 두 건 모두 `주문 제출 -> SUBMITTED -> FILLED` 흐름이 보인다.
- `confirmed`: 2026-04-20 기준 guest sandbox 경로로 Upbit manual `BUY`/`SELL` UI 캡처 1세트와 runtime 응답 근거를 추가 확보했다.
- `confirmed`: guest sandbox Upbit/Bithumb BUY/SELL에 대응하는 `sandbox_orders` / `activity_logs` sanitized DB raw bridge를 추가 확보했다.
- `limited`: 이번 UI 캡처는 `guest sandbox` 경로이며, 기존 live DB row `planned_order_id=97`, `89`와 직접 같은 주문을 찍은 것은 아니다.
- `missing`: live 주문 기준의 buyer-facing UI-DB 직접 매핑과 잔액 before/after 추출은 아직 없다.

## Guest Sandbox UI Capture

### Upbit guest sandbox BUY UI 1건

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:36 UTC
- symbol: `KRW-XRP`
- 식별 단서:
  - runtime result id: `20`
  - `sandbox: true`
  - `status: FILLED`
  - `price: 2109`
  - `amount_krw: 6000`
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_buy_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
- 핵심 설명:
  - guest 계정 화면에 `GUEST` 배지가 보이는 상태에서 Upbit 탭 BUY 화면을 캡처했다.
  - result JSON은 `POST /api/orders` 응답이 `sandbox: true`, `FILLED`, `id: 20`으로 돌아왔음을 기록한다.
  - same runtime state에서 포지션 행은 `XRP 2.8450`, 평균가 `2,109`, 현재가 `2,108`, `수동 매매`로 표시된다.

### Upbit guest sandbox SELL UI 1건

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:36 UTC
- symbol: `KRW-XRP`
- 식별 단서:
  - runtime result id: `21`
  - `sandbox: true`
  - `status: FILLED`
  - `price: 2108`
  - `amount_krw: 5500`
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sell_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
- 핵심 설명:
  - guest 계정 화면에 `GUEST` 배지가 보이는 상태에서 Upbit 탭 SELL 화면을 캡처했다.
  - result JSON은 `POST /api/orders` 응답이 `sandbox: true`, `FILLED`, `id: 21`로 돌아왔음을 기록한다.
  - same runtime state에서 포지션 행은 `XRP 0.2358`로 줄어든 상태가 보인다.

### guest sandbox position 변화 단서

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:36 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_position_before_after.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
- 핵심 설명:
  - result JSON 기준 포지션은 `없음 -> XRP 2.8450 -> XRP 0.2358`로 변했다.
  - KRW 값은 `10,000,000 -> 9,994,000 -> 9,994,000`으로 기록돼 BUY 차감은 보이지만 SELL 후 KRW 복귀까지는 확인되지 않는다.
  - 따라서 이번 턴은 `position before/after confirmed`, `balance before/after limited`로 본다.

### guest sandbox DB raw bridge

- 상태: `confirmed`
- source: `DB`
- 시각: 2026-04-20 07:36 UTC / 07:42 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/manual/guest_sandbox_db_extract.txt`
- 핵심 설명:
  - Upbit guest sandbox `id=20`, `21`와 Bithumb guest sandbox `id=22`, `23`에 대응하는 `sandbox_orders` row를 확인했다.
  - 같은 시각대 `activity_logs` row `46520`~`46523`도 확인돼 UI/JSON과 DB 사이 raw bridge가 생겼다.
  - 다만 `sandbox_balances`는 최종 KRW row 단서만 있고 full before/after 시계열은 아직 부족하다.
  - guest 포지션 수량 DB bridge는 `/home/ubuntu/upbit_bot/evidence/raw/manual/guest_sandbox_position_db_bridge.txt` 기준 `unavailable`로 고정했다.

## BUY confirmed

### 최신 Upbit BUY 성공 1건

- 상태: `confirmed`
- source: `DB`
- 시각: 2026-04-20 04:43:04 UTC ~ 2026-04-20 04:43:39 UTC
- symbol: `KRW-ETH`
- order id / 식별자:
  - planned order id: `97`
  - exchange order id: `d6a1578d-aa8b-4f23-bc87-7b4ade20faa1`
- 핵심 설명:
  - Upbit manual BUY 1건이 최신 DB 기준 `FILLED`로 기록돼 있다.

DB 근거
- source: `DB`
- 시각: 조회 결과 기준 최신 row
- 내용:
  - `planned_orders`
  - `97 | 10 | KRW-ETH | BUY | FILLED | upbit | 3387000.00 | 10000.00 | d6a1578d-aa8b-4f23-bc87-7b4ade20faa1 | 2026-04-20 04:43:04.039659+00 | 2026-04-20 04:43:39.18929+00 | 시장가`
  - 체결 필드 확인:
  - `97 | KRW-ETH | BUY | FILLED | d6a1578d-aa8b-4f23-bc87-7b4ade20faa1 | 0.00290000 | 0.00 | 2026-04-20 04:43:04.039659+00 | 2026-04-20 04:43:39.18929+00`

상태 흐름 근거
- source: `DB`
- 시각: 2026-04-20 04:43 UTC
- 내용:
  - `state_transition_logs`
  - `NEW -> PLANNED` at `2026-04-20 04:43:04.048662+00`
  - `PLANNED -> QUEUED` at `2026-04-20 04:43:08.43366+00`
  - `QUEUED -> SUBMITTED` at `2026-04-20 04:43:08.752263+00`
  - `SUBMITTED -> FILLED` at `2026-04-20 04:43:39.192265+00`

활동 반영 근거
- source: `DB`
- 시각: 2026-04-20 04:43 UTC
- 내용:
  - `activity_logs`
  - `manual_order | KRW-ETH | upbit | BUY | SUBMITTED | 제출완료 | 3387000.00 | 10000.00 | 2026-04-20 04:43:08.429988+00`
  - `manual_order | KRW-ETH | upbit | BUY | FILLED | 체결완료 | 3387000.00 | 10000.00 | 2026-04-20 04:43:39.010923+00`

잔액 반영 여부
- 상태: `missing`
- source: `DB/UI`
- 시각: 없음
- 핵심 설명:
  - 이번 수집 범위에는 주문 전후 Upbit KRW/ETH 잔액 비교 추출이나 UI 캡처가 없다.

## SELL confirmed

### 최신 Upbit SELL 성공 1건

- 상태: `confirmed`
- source: `DB`
- 시각: 2026-04-18 09:23:11 UTC ~ 2026-04-18 09:34:18 UTC
- symbol: `KRW-USDT`
- order id / 식별자:
  - planned order id: `89`
  - exchange order id: `f4286f56-3710-4b9a-8e8c-e38440aa7ee9`
- 핵심 설명:
  - Upbit manual SELL 최신 성공 row는 `KRW-USDT`이며 DB 기준 `FILLED`로 기록돼 있다.

DB 근거
- source: `DB`
- 시각: 조회 결과 기준 최신 SELL row
- 내용:
  - `planned_orders`
  - `89 | 10 | KRW-USDT | SELL | FILLED | upbit | 1479.00 | 7111.00 | f4286f56-3710-4b9a-8e8c-e38440aa7ee9 | 2026-04-18 09:23:11.956885+00 | 2026-04-18 09:34:18.770081+00 |`
  - 체결 필드 확인:
  - `89 | KRW-USDT | SELL | FILLED | f4286f56-3710-4b9a-8e8c-e38440aa7ee9 | 4.80797836 | 0.00 | 2026-04-18 09:23:11.956885+00 | 2026-04-18 09:34:18.770081+00`

상태 흐름 근거
- source: `DB`
- 시각: 2026-04-18 09:23 UTC ~ 09:34 UTC
- 내용:
  - `state_transition_logs`
  - `NEW -> PLANNED` at `2026-04-18 09:23:11.967145+00`
  - `PLANNED -> QUEUED` at `2026-04-18 09:23:17.821473+00`
  - `QUEUED -> SUBMITTED` at `2026-04-18 09:23:18.115+00`
  - `SUBMITTED -> FILLED` at `2026-04-18 09:34:18.772846+00`

활동 반영 근거
- source: `DB`
- 시각: 2026-04-18 09:23 UTC ~ 09:34 UTC
- 내용:
  - `activity_logs`
  - `manual_order | KRW-USDT | upbit | SELL | SUBMITTED | 제출완료 | 1479.00 | 7111.00 | 2026-04-18 09:23:17.808633+00`
  - `manual_order | KRW-USDT | upbit | SELL | FILLED | 체결완료 | 1479.00 | 7111.00 | 2026-04-18 09:34:18.591544+00`

잔액 반영 여부
- 상태: `missing`
- source: `DB/UI`
- 시각: 없음
- 핵심 설명:
  - 이번 수집 범위에는 주문 전후 Upbit KRW/USDT 잔액 비교 추출이나 UI 캡처가 없다.

## Inferred

### 주문 제출 후 상태 반영은 활동 로그와 상태 전이 로그가 함께 움직이는 구조로 보인다

- 상태: `inferred`
- source: `DB`, `code`
- 시각: 2026-04-20 UTC
- 근거:
  - 선택한 BUY/SELL 2건 모두 `activity_logs`에 `SUBMITTED`, `FILLED`가 있고 `state_transition_logs`도 같은 방향으로 진행됐다.
  - `app/strategy/order_gateway.py`는 Upbit manual order에 대해 `SUBMITTED` 활동 로그를 남기고 상태 전이를 수행하는 코드가 있다.
- 핵심 설명:
  - buyer는 “주문 제출과 상태 반영이 서로 분리된 임의 텍스트가 아니라 DB 상태 흐름과 함께 기록된다”는 점까지는 이해할 수 있다.

## Missing

### 1. Upbit BUY buyer-facing UI 캡처

- 상태: `confirmed`
- source: `UI`
- 시각: 2026-04-20 07:36 UTC
- 핵심 설명:
  - guest sandbox 경로 기준 BUY 화면 캡처 `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_buy_result.png`를 확보했다.
  - 다만 live 주문 row `planned_order_id=97`을 직접 보여주는 캡처는 아니다.

### 2. Upbit SELL buyer-facing UI 캡처

- 상태: `confirmed`
- source: `UI`
- 시각: 2026-04-20 07:36 UTC
- 핵심 설명:
  - guest sandbox 경로 기준 SELL 화면 캡처 `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/upbit_guest_sell_result.png`를 확보했다.
  - 다만 live 주문 row `planned_order_id=89`를 직접 보여주는 캡처는 아니다.

### 3. 잔액 반영 before/after 추출

- 상태: `limited`
- source: `DB`, `UI`, `log`
- 시각: 2026-04-20 07:36 UTC
- 핵심 설명:
  - guest sandbox runtime result 기준 `KRW 10,000,000 -> 9,994,000`과 포지션 `없음 -> XRP 2.8450 -> XRP 0.2358`는 확인됐다.
  - 다만 SELL 후 KRW 증가까지는 이번 UI/API 결과에서 닫히지 않아 `confirmed`로 올리지 않는다.

### 4. 동일 주문 id 기준 UI-DB 매핑 캡처

- 상태: `limited`
- source: `UI`
- 시각: 2026-04-20 07:36 UTC
- 핵심 설명:
  - guest sandbox runtime result JSON은 `id=20`, `id=21`, `sandbox: true`, `KRW-XRP`, `price`, `amount_krw`를 남긴다.
  - 하지만 이는 sandbox order id이며 live DB `planned_order_id` / `exchange_order_id` 직접 매핑은 아니다.

## needed capture / 추가로 필요한 캡처·추출

- Upbit BUY 1건의 주문 입력 화면, 제출 직후, 체결 완료 화면 캡처
- Upbit SELL 1건의 주문 입력 화면, 제출 직후, 체결 완료 화면 캡처
- BUY 직전/직후 잔액 또는 포지션 변화 캡처 1세트
- SELL 직전/직후 잔액 또는 포지션 변화 캡처 1세트
- 선택한 BUY `planned_order_id=97`와 SELL `planned_order_id=89`에 대응하는 sanitized DB 추출 스냅샷

## 비고

- 현재 자료만으로도 buyer에게 “Upbit BUY/SELL 둘 다 성공한 최신 근거가 DB와 활동 로그에 있다”는 설명은 가능하다.
- 다만 잔액 반영과 UI 체감까지 buyer-facing으로 닫으려면 `needed capture` 항목이 추가로 필요하다.

---

## Bithumb 요약

- `confirmed`: Bithumb manual `BUY`와 `SELL` 각각 최신 성공 근거 1건을 DB/활동 로그/상태 전이 로그로 확인했다.
- `confirmed`: 두 건 모두 `주문 제출 -> SUBMITTED -> FILLED` 흐름이 보인다.
- `confirmed`: 최신 BUY는 `ACTIVE`를 거쳐 `FILLED`로 닫혔다.
- `confirmed`: SELL 성공 경로는 코드 기준 `qty > 0`과 계산된 `amount_krw >= 5,500원` 규칙을 통과한 케이스다.
- `confirmed`: 2026-04-20 기준 guest sandbox 경로로 Bithumb manual `BUY`/`SELL` UI 캡처 1세트와 runtime 응답 근거를 추가 확보했다.
- `limited`: 이번 UI 캡처는 `guest sandbox` 경로이며, 기존 live DB row `planned_order_id=95`, `87`과 직접 같은 주문을 찍은 것은 아니다.
- `limited`: Bithumb guest sandbox 화면에서는 `sandbox: true` 응답은 확보됐지만, 이번 샷에서는 주문/포지션 테이블 반영이 바로 보이지 않는다.

## Bithumb Guest Sandbox UI Capture

### Bithumb guest sandbox BUY UI 1건

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:42 UTC
- symbol: `KRW-XRP`
- 식별 단서:
  - runtime result id: `22`
  - `sandbox: true`
  - `status: FILLED`
  - `price: 2104`
  - `amount_krw: 6000`
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_buy_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`
- 핵심 설명:
  - guest 계정 화면에 `GUEST` 배지가 보이는 상태에서 Bithumb 탭 BUY 화면을 캡처했다.
  - result JSON은 `POST /bapi/orders` 응답이 `sandbox: true`, `FILLED`, `id: 22`로 돌아왔음을 기록한다.
  - 화면에는 `KRW-XRP`, 선택가 `2,104원`, BUY 패널이 보이지만 이번 샷에서는 주문/포지션 테이블 반영까지는 잡히지 않았다.

### Bithumb guest sandbox SELL UI 1건

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:42 UTC
- symbol: `KRW-XRP`
- 식별 단서:
  - runtime result id: `23`
  - `sandbox: true`
  - `status: FILLED`
  - `price: 2105`
  - `amount_krw: 5500`
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sell_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`
- 핵심 설명:
  - guest 계정 화면에 `GUEST` 배지가 보이는 상태에서 Bithumb 탭 SELL 화면을 캡처했다.
  - result JSON은 `POST /bapi/orders` 응답이 `sandbox: true`, `FILLED`, `id: 23`으로 돌아왔음을 기록한다.
  - SELL 성공 응답의 `amount_krw`가 `5500`으로 찍혀 있어 최소 주문금액 기준선과 맞닿은 성공 사례로 볼 수 있다.

### Bithumb guest sandbox position / balance 화면 반영

- 상태: `limited`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:42 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_position_before_after.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`
- 핵심 설명:
  - result JSON 기준 BUY/SELL 두 요청 모두 `200 OK`, `sandbox: true`, `FILLED`로 끝났다.
  - 하지만 이번 화면 캡처에서는 포지션 영역이 계속 `현재 보유 포지션이 없습니다`로 보였고 주문 행도 잡히지 않았다.
  - 따라서 이번 턴은 `UI 접근 + sandbox 주문 응답 confirmed`, `position/balance before/after missing`으로 정리한다.

## Bithumb BUY confirmed

### 최신 Bithumb BUY 성공 1건

- 상태: `confirmed`
- source: `DB`
- 시각: 2026-04-18 09:54:53 UTC ~ 2026-04-18 11:04:08 UTC
- symbol: `KRW-USDT`
- order id / 식별자:
  - planned order id: `95`
  - exchange order id: `C0866000000162275908`
- 핵심 설명:
  - Bithumb manual BUY 최신 성공 row는 `KRW-USDT`이며 DB 기준 `FILLED`로 기록돼 있다.

DB 근거
- source: `DB`
- 시각: 조회 결과 기준 최신 BUY row
- 내용:
  - `planned_orders`
  - `95 | 10 | KRW-USDT | BUY | FILLED | bithumb | 1478.00 | 5500.00 | C0866000000162275908 | 2026-04-18 09:54:53.779608+00 | 2026-04-18 11:04:08.112513+00 | bithumb`
  - 체결 필드 확인:
  - `95 | KRW-USDT | BUY | 1478.00 | 5500.00 | 3.72124493 | FILLED | C0866000000162275908 | bithumb | 2026-04-18 09:54:53.779608+00 | 2026-04-18 11:04:08.112513+00`

상태 흐름 근거
- source: `DB`
- 시각: 2026-04-18 09:54 UTC ~ 11:04 UTC
- 내용:
  - `state_transition_logs`
  - `NEW -> PLANNED` at `2026-04-18 09:54:53.785023+00`
  - `PLANNED -> QUEUED` at `2026-04-18 09:54:56.236085+00`
  - `QUEUED -> SUBMITTED` at `2026-04-18 09:54:56.465209+00`
  - `SUBMITTED -> ACTIVE` at `2026-04-18 09:55:22.107531+00`
  - `ACTIVE -> FILLED` at `2026-04-18 11:04:08.333003+00`

활동 반영 근거
- source: `DB`
- 시각: 2026-04-18 09:54 UTC ~ 11:04 UTC
- 내용:
  - `activity_logs`
  - `10 | KRW-USDT | BUY | SUBMITTED | 제출완료 | 1478.00 | 5500.00 | 2026-04-18 09:54:56.232334+00`
  - `10 | KRW-USDT | BUY | FILLED | 체결완료 | 1478.00 | 5500.00 | 2026-04-18 11:04:07.881595+00`

## Bithumb SELL confirmed

### 최신 Bithumb SELL 성공 1건

- 상태: `confirmed`
- source: `DB`
- 시각: 2026-04-18 09:20:24 UTC ~ 2026-04-18 09:20:43 UTC
- symbol: `KRW-USDT`
- order id / 식별자:
  - planned order id: `87`
  - exchange order id: `C0866000000162272989`
- 핵심 설명:
  - Bithumb manual SELL 최신 성공 row는 `KRW-USDT`이며 DB 기준 `FILLED`로 기록돼 있다.

DB 근거
- source: `DB`
- 시각: 조회 결과 기준 최신 SELL row
- 내용:
  - `planned_orders`
  - `87 | 10 | KRW-USDT | SELL | FILLED | bithumb | 1480.00 | 15812.00 | C0866000000162272989 | 2026-04-18 09:20:24.494099+00 | 2026-04-18 09:20:43.997892+00 | bithumb:시장가`
  - 체결 필드 확인:
  - `87 | KRW-USDT | SELL | 1480.00 | 15812.00 | 10.68378378 | FILLED | C0866000000162272989 | bithumb:시장가 | 2026-04-18 09:20:24.494099+00 | 2026-04-18 09:20:43.997892+00`

상태 흐름 근거
- source: `DB`
- 시각: 2026-04-18 09:20 UTC
- 내용:
  - `state_transition_logs`
  - `NEW -> PLANNED` at `2026-04-18 09:20:24.49663+00`
  - `PLANNED -> QUEUED` at `2026-04-18 09:20:28.075024+00`
  - `QUEUED -> SUBMITTED` at `2026-04-18 09:20:28.291726+00`
  - `SUBMITTED -> FILLED` at `2026-04-18 09:20:44.000075+00`

활동 반영 근거
- source: `DB`
- 시각: 2026-04-18 09:20 UTC
- 내용:
  - `activity_logs`
  - `10 | KRW-USDT | SELL | SUBMITTED | 제출완료 | 1480.00 | 15812.00 | 2026-04-18 09:20:28.071386+00`
  - `10 | KRW-USDT | SELL | FILLED | 체결완료 | 1480.00 | 15812.00 | 2026-04-18 09:20:43.819189+00`

## Bithumb SELL 최소 주문량 규칙

- 상태: `confirmed`
- source: `code`, `DB`
- 시각: 코드 기준 2026-04-20 05:49 UTC / 성공 row 기준 2026-04-18 09:20 UTC
- 근거:
  - `app/api/bithumb_routes.py`는 SELL 요청에서 `qty > 0`을 검사한다.
  - 같은 코드에서 SELL의 `amount_krw = price * qty`로 계산한 뒤, `amount_krw < 5500`이면 거부한다.
  - 선택한 성공 SELL row `planned_order_id=87`은 `filled_qty=10.68378378`, `amount_krw=15812.00`으로 기록돼 있어 성공 경로 기준을 충족한다.
- 핵심 설명:
  - buyer 기준으로는 “Bithumb SELL은 양수 수량 + 최소 주문금액 기준을 통과한 성공 사례가 있다”까지는 바로 설명 가능하다.

## Bithumb missing

### 1. Bithumb BUY buyer-facing UI 캡처

- 상태: `confirmed`
- source: `UI`
- 시각: 2026-04-20 07:42 UTC
- 핵심 설명:
  - guest sandbox 경로 기준 BUY 화면 캡처 `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_buy_result.png`를 확보했다.
  - 다만 live 주문 row `planned_order_id=95`를 직접 보여주는 캡처는 아니다.

### 2. Bithumb SELL buyer-facing UI 캡처

- 상태: `confirmed`
- source: `UI`
- 시각: 2026-04-20 07:42 UTC
- 핵심 설명:
  - guest sandbox 경로 기준 SELL 화면 캡처 `/home/ubuntu/upbit_bot/evidence/raw/screenshots/manual/bithumb_guest_sell_result.png`를 확보했다.
  - 다만 live 주문 row `planned_order_id=87`를 직접 보여주는 캡처는 아니다.

### 3. Bithumb BUY/SELL 화면과 DB 식별자 직접 매핑 캡처

- 상태: `limited`
- source: `UI`
- 시각: 2026-04-20 07:42 UTC
- 핵심 설명:
  - guest sandbox runtime result JSON은 `id=22`, `id=23`, `sandbox: true`, `KRW-XRP`, `price`, `amount_krw`를 남긴다.
  - 하지만 이는 sandbox order id이며 live `planned_order_id` / `exchange_order_id` 직접 매핑은 아니다.

## Bithumb needed capture / 추가로 필요한 캡처·추출

- Bithumb BUY 1건의 주문 입력 화면, 제출 직후, 체결 완료 화면 캡처
- Bithumb SELL 1건의 주문 입력 화면, 제출 직후, 체결 완료 화면 캡처
- 선택한 BUY `planned_order_id=95`와 SELL `planned_order_id=87`에 대응하는 sanitized DB 추출 스냅샷
- SELL 최소 주문량/최소 주문금액 규칙이 UI에서 어떻게 보이는지 보여주는 캡처 1종
