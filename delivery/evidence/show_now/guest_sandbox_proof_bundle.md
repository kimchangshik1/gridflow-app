# guest_sandbox_proof_bundle

기준
- 작성 기준: 2026-04-20 UTC
- 사용 근거: 기존 캡처, 기존 runtime JSON, 기존 경로 메모만 사용
- 목적: buyer에게 `guest는 실거래가 아니라 sandbox 주문 경로로만 동작한다`는 점을 짧게 증명하는 묶음

## 요약

- `confirmed`: guest 세션 진입, `GUEST` 배지, Upbit/Bithumb guest manual BUY/SELL runtime 결과를 확보했다.
- `confirmed`: Upbit/Bithumb guest manual 주문 응답에는 `sandbox: true`가 포함된다.
- `confirmed`: safe path 메모와 코드 근거상 guest manual order는 sandbox 분기로 연결된다.
- `confirmed`: guest sandbox BUY/SELL에 대응하는 `sandbox_orders` / `activity_logs` sanitized DB raw bridge를 확보했다.
- `limited`: `sandbox_balances`는 최종 row 기준 단서만 있고, 전후 시계열 전체는 이번 묶음에 없다.

## Confirmed

### 1. guest session 진입 근거

- 상태: `confirmed`
- raw artifact:
  - `evidence/raw/screenshots/auth/guest_mode_badge.png`
  - `evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
  - `evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`
- 핵심 단서:
  - Upbit JSON: `username=guest_a4803730deb841e7`, `is_guest=true`
  - Bithumb JSON: `username=guest_f60772c8a6c117aa`, `is_guest=true`
  - auth 캡처: 헤더에 guest username과 `GUEST` 배지 표시

### 2. GUEST 배지 근거

- 상태: `confirmed`
- raw artifact:
  - `evidence/raw/screenshots/auth/guest_mode_badge.png`
  - `evidence/raw/screenshots/manual/upbit_guest_buy_result.png`
  - `evidence/raw/screenshots/manual/bithumb_guest_buy_result.png`
- 핵심 단서:
  - guest username 옆 `GUEST` 배지가 화면에 보인다.
  - Upbit/Bithumb guest runtime JSON에도 `guestLabel`이 `... GUEST`로 기록돼 있다.

### 3. Upbit sandbox BUY/SELL 근거

- 상태: `confirmed`
- raw artifact:
  - `evidence/raw/screenshots/manual/upbit_guest_buy_result.png`
  - `evidence/raw/screenshots/manual/upbit_guest_sell_result.png`
  - `evidence/raw/screenshots/manual/upbit_guest_position_before_after.png`
  - `evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
- 핵심 단서:
  - BUY: `id=20`, `symbol=KRW-XRP`, `side=BUY`, `amount_krw=6000`, `status=FILLED`, `note=sandbox`, `sandbox=true`
  - SELL: `id=21`, `symbol=KRW-XRP`, `side=SELL`, `amount_krw=5500`, `status=FILLED`, `note=sandbox`, `sandbox=true`
  - UI와 JSON 모두 guest header와 같은 세션 안에서 기록됐다.

### 4. Bithumb sandbox BUY/SELL 근거

- 상태: `confirmed`
- raw artifact:
  - `evidence/raw/screenshots/manual/bithumb_guest_buy_result.png`
  - `evidence/raw/screenshots/manual/bithumb_guest_sell_result.png`
  - `evidence/raw/screenshots/manual/bithumb_guest_position_before_after.png`
  - `evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`
- 핵심 단서:
  - BUY: `id=22`, `symbol=KRW-XRP`, `side=BUY`, `amount_krw=6000`, `status=FILLED`, `note=bithumb:시장가`, `sandbox=true`
  - SELL: `id=23`, `symbol=KRW-XRP`, `side=SELL`, `amount_krw=5500`, `status=FILLED`, `note=bithumb:시장가`, `sandbox=true`
  - UI와 JSON 모두 guest header와 같은 세션 안에서 기록됐다.

### 5. 이 경로가 실거래가 아니라는 코드/문서 근거

- 상태: `confirmed`
- raw artifact:
  - `sales/safe_capture_path_note.md`
- 연결 근거:
  - `app/api/auth_routes.py`
    - `POST /guest/session`
    - `create_guest_session()`
  - `app/auth/auth.py`
    - `create_guest_user()`
    - guest 생성 시 `is_dry_run=True`, `is_guest=True`
  - `app/auth/dependencies.py`
    - guest 인증 시 다시 `is_dry_run=True`
  - `app/api/routes.py`
    - `POST /orders`
    - dry-run 분기에서 `sandbox_orders`, `sandbox_balances`, `activity_logs` 갱신, 응답에 `sandbox: True`
  - `app/api/bithumb_routes.py`
    - `POST /orders`
    - dry-run 분기에서 `sandbox_orders`, `sandbox_balances`, `activity_logs` 갱신, 응답에 `sandbox: True`
- 핵심 설명:
  - 현재 확보된 safe path 메모는 guest manual order가 live exchange 제출이 아니라 sandbox 분기로 흐른다고 정리한다.

### 6. guest sandbox DB raw bridge

- 상태: `confirmed`
- raw artifact:
  - `evidence/raw/manual/guest_sandbox_db_extract.txt`
  - `evidence/raw/manual/guest_sandbox_position_db_bridge.txt`
- 핵심 단서:
  - `sandbox_orders`
    - Upbit `20`, `21`
    - Bithumb `22`, `23`
  - `activity_logs`
    - Upbit `46520`, `46521`
    - Bithumb `46522`, `46523`
- 핵심 설명:
  - 위 row id와 `symbol`, `side`, `price`, `amount_krw`, `created_at`가 runtime JSON과 맞물린다.
  - 따라서 guest sandbox UI/JSON과 DB 사이의 raw bridge가 생겼다.
  - 다만 guest 포지션 수량 자체를 user별 DB row로 직접 잇는 bridge는 `unavailable`로 판정했다.

## Limited

### 1. guest sandbox position / balance 반영

- 상태: `limited`
- raw artifact:
  - `evidence/raw/screenshots/manual/upbit_guest_position_before_after.png`
  - `evidence/raw/screenshots/manual/upbit_guest_sandbox_result.json`
  - `evidence/raw/screenshots/manual/bithumb_guest_position_before_after.png`
  - `evidence/raw/screenshots/manual/bithumb_guest_sandbox_result.json`
- 핵심 설명:
  - Upbit는 포지션 변화와 일부 KRW 변화 단서가 보인다.
  - Bithumb는 BUY/SELL 응답은 확인되지만 포지션/잔액 테이블 반영은 이번 화면에서 닫히지 않는다.

### 2. buyer-facing 범위

- 상태: `limited`
- raw artifact:
  - 위 캡처/JSON 전체
  - `sales/safe_capture_path_note.md`
- 핵심 설명:
  - buyer에게는 “guest 경로는 sandbox 주문으로만 동작한다”는 설명이 가능하다.
  - 다만 `sandbox_balances`는 최종 KRW row 단서만 있고, full before/after 시계열은 아직 없다.

## Missing

### 1. guest sandbox balance / position 시계열

- 상태: `missing`
- 핵심 설명:
  - BUY 직전 / BUY 직후 / SELL 직후를 DB row 시계열로 직접 보여주는 balance bridge는 아직 없다.
  - position 수량 변화를 직접 보여주는 별도 DB raw table bridge는 이번 범위에서 `unavailable`이다.

### 2. guest sandbox를 buyer 한 장에서 바로 보여주는 요약 문서 연결

- 상태: `missing`
- 핵심 설명:
  - 이번 문서가 첫 묶음이다.
  - 다음 sync에서 `sales/evidence_one_pager.md`, `GRIDFLOW_RELEASE_EVIDENCE.txt`에 반영해야 buyer-facing 최종 요약과 연결된다.
