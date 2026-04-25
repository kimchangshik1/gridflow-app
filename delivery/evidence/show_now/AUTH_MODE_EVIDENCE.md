# AUTH_MODE_EVIDENCE

기준
- 작성 기준: 2026-04-24 UTC
- 작성 목적: buyer-facing 인증/모드 관련 최신 근거 묶음
- 원칙: 기존 문서/코드/검증 기록만 사용. 없는 캡처는 만들지 않고 `needed capture`로 남김

## 범위

- 로그인
- 로그아웃
- 세션 유지/해제
- 에러 시나리오 1개
- `GUEST / DRY RUN / LIVE`
- guest 차단
- dry run 주문 경로 분리
- live 경로 구분
- Upbit/Bithumb API 키 저장/적용
- 사용자별 적용 확인

## Confirmed

### 1. 로그인은 cookie 기반 세션 생성으로 동작

- 상태: `confirmed`
- source: `code`
- 시각: 2026-04-20 05:41 UTC
- 근거:
  - `app/api/auth_routes.py`의 `/auth/login`은 성공 시 `session` cookie를 `httponly`로 set 한다.
  - response body는 `success`, `user_id`, `username`, `is_admin`, `is_guest`, `is_dry_run`만 반환한다.
- 핵심 설명:
  - 메인 앱 로그인 성공 후 브라우저 저장 토큰이 아니라 cookie 세션이 주 경로다.

### 2. 로그아웃은 cookie 기준 세션 종료로 동작

- 상태: `confirmed`
- source: `code`
- 시각: 2026-04-20 05:41 UTC
- 근거:
  - `app/api/auth_routes.py`의 `/auth/logout`은 `session` cookie 기준으로 세션을 삭제하고 cookie를 지운다.
  - `/auth/guest/logout`도 `session` cookie 기준으로 guest 세션과 guest user를 정리한다.
- 핵심 설명:
  - 로그아웃/게스트 종료는 현재 cookie 기반 세션 해제 구조와 일치한다.

### 3. 세션 유지/복원은 `/auth/me` + same-origin cookie 경로다

- 상태: `confirmed`
- source: `code`, `doc`
- 시각: 2026-04-20 05:35 UTC (`auth_security_audit.md`)
- 근거:
  - `app/api/auth_routes.py`의 `/auth/me`는 `session` cookie가 없으면 `401`, 있으면 `get_session(session)` 결과를 반환한다.
  - `app/auth/dependencies.py`도 `session` cookie만 읽어 인증한다.
  - `auth_security_audit.md`는 새로고침 복원이 `checkAuth() -> /auth/me -> _currentUser 복원`으로 정리됐다고 기록한다.
- 핵심 설명:
  - 세션 유지 확인 경로는 브라우저 저장 토큰이 아니라 cookie + `/auth/me`다.

### 4. 로그인 실패 에러 시나리오 1개는 401로 정리돼 있다

- 상태: `confirmed`
- source: `code`
- 시각: 2026-04-20 05:41 UTC
- 근거:
  - `app/api/auth_routes.py`의 `/auth/login`은 `verify_login()` 실패 시 `401 "아이디 또는 비밀번호가 올바르지 않습니다"`를 반환한다.
  - 같은 경로에서 username/IP 실패 카운터를 기록한다.
- 핵심 설명:
  - 기본 로그인 실패 시나리오는 서버가 명시적으로 401로 처리한다.

### 5. GUEST는 별도 guest session 생성 후 강제로 dry run 취급된다

- 상태: `confirmed`
- source: `code`
- 시각: 2026-04-20 05:41 UTC / 05:34 UTC
- 근거:
  - `app/api/auth_routes.py`의 `/auth/guest/session`은 guest user를 만들고 `session` cookie를 set 하며 `is_guest: True`를 반환한다.
  - `app/auth/auth.py`의 `create_guest_user()`는 guest 생성 시 `is_dry_run=True`, `is_guest=True`, `expires_at`를 같이 기록한다.
  - `app/auth/dependencies.py`는 인증된 guest를 다시 `is_dry_run=True`로 강제한다.
- 핵심 설명:
  - guest는 코드 기준으로 실거래가 아닌 dry-run 계열 세션으로 취급된다.

### 6. dry run 주문 경로는 sandbox로 분리돼 있다

- 상태: `confirmed`
- source: `code`
- 시각: 2026-04-20 05:49 UTC
- 근거:
  - `app/api/routes.py`의 Upbit `/api/orders`는 `user.get("is_dry_run")`이면 `sandbox_orders`와 `sandbox_balances`를 사용한다.
  - `app/api/bithumb_routes.py`의 Bithumb `/bapi/orders`도 `is_dry_run`이면 `sandbox_orders`/`sandbox_balances` 경로를 사용한다.
- 핵심 설명:
  - dry run/guest 주문은 실거래 제출 경로와 분리된 sandbox 경로로 간다.

### 7. live 경로는 dry run이 아닐 때만 일반 주문/전략 엔진으로 간다

- 상태: `confirmed`
- source: `code`
- 시각: 2026-04-20 05:49 UTC
- 근거:
  - Upbit/Bithumb 주문 경로는 `is_dry_run`이 아닐 때 `create_planned_order(...)`를 호출한다.
  - Grid/DCA/Rebalancing 생성은 `not user.get("is_dry_run")`일 때 API 키 존재를 확인한다.
- 핵심 설명:
  - live 경로는 sandbox 분기 밖의 일반 주문/전략 처리 경로로 구분된다.

### 8. UI 모드 표시는 `GUEST / DRY RUN / LIVE` 3가지로 분기된다

- 상태: `confirmed`
- source: `code`, `doc`
- 시각: 2026-04-20 05:45 UTC / 2026-04-20 05:35 UTC
- 근거:
  - `static/js/auth.js`는 `_currentUser.is_guest`면 `GUEST`, 아니고 `_currentUser.is_dry_run`이면 `DRY RUN`, 그 외는 `LIVE` 배지를 표시한다.
  - `auth_security_audit.md`도 게스트 상태 표시가 `_currentUser.is_guest`와 `window.isGuest`를 유지한다고 기록한다.
- 핵심 설명:
  - 프론트 모드 표시는 서버 user state를 기준으로 분기된다.

### 9. Upbit/Bithumb API 키는 암호화 저장 후 user_id 기준으로 적용된다

- 상태: `confirmed`
- source: `code`, `doc`
- 시각: 2026-04-20 05:49 UTC / 2026-04-20 00:00 UTC
- 근거:
  - `ASSET_SNAPSHOT.md`는 API 키가 `bot_configs`에 저장되고 `.upbit_bot_key`로 암호화/복호화된다고 기록한다.
  - `app/api/routes.py`, `app/api/bithumb_routes.py`, `app/api/dca_routes.py`, `app/api/rebalancing_routes.py`, `app/api/grid_routes.py`는 모두 `BotConfig.user_id == user["user_id"]` 조건으로 해당 사용자 키를 조회한다.
  - 거래소별 키 선택은 `UPBIT_ACCESS_KEY/SECRET_KEY` 또는 `BITHUMB_ACCESS_KEY/SECRET_KEY`로 분기한다.
- 핵심 설명:
  - 키 저장과 적용 경로는 거래소별·사용자별로 분리된 코드 경로를 가진다.

### 10. guest 모드 배지 UI 캡처 1장은 확보됐다

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 06:58 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/guest_mode_badge.png`
  - 캡처 화면에는 guest username과 `GUEST` 배지가 같은 헤더 영역에 함께 표시된다.
- 핵심 설명:
  - buyer-facing UI 기준으로 guest 진입 후 모드 배지가 실제로 보이는 화면 1장은 확보됐다.

### 11. guest 로그아웃 후 로그인 오버레이 복귀 캡처 1장은 확보됐다

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:17 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/logout_overlay_return.png`
  - 캡처 화면에는 `GridFlow` 로그인 박스와 `로그인`, `게스트로 보기` 버튼이 다시 표시된다.
- 핵심 설명:
  - guest 세션 기준 로그아웃 후 로그인 오버레이 복귀 화면 1장은 확보됐다.

### 12. guest 새로고침 후 세션 유지 캡처 1장은 확보됐다

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:17 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/refresh_session_result.png`
  - 캡처 화면에는 guest username과 `GUEST` 배지가 유지된 상태가 보인다.
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_logout_refresh_result.json`은 `refresh_result: "session persists"`를 기록한다.
- 핵심 설명:
  - guest 세션 기준 새로고침 후 세션이 유지되는 화면 증거 1장은 확보됐다.

### 13. 로그인 실패 UI 캡처 1장은 확보됐다

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 07:22 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/login_error_invalid_credentials.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_login_error_result.json`
  - 화면과 결과 JSON 모두 `아이디 또는 비밀번호가 올바르지 않습니다` 문구를 기록한다.
- 핵심 설명:
  - 공개 런타임에서 dummy 자격증명 1회로 로그인 실패 UI와 에러 문구를 화면 기준으로 확보했다.

### 14. 일반 로그인 후 LIVE 배지 UI 캡처 1장은 확보됐다

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-20 08:07 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/live_mode_badge.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/live_badge_direct_register_result.json`
  - 결과 JSON은 `register_status: 200`, `login_status: 200`, `login_label_text: "cod***40 LIVE"`를 기록한다.
- 핵심 설명:
  - 공개 회원가입 UI 클릭 없이 `/auth/register -> /auth/login` 직접 호출 후 세션을 주입해 일반 계정의 `LIVE` 배지를 화면 기준으로 확보했다.

### 15. 일반 로그인 후 DRY RUN 배지 UI 캡처 1장은 확보됐다

- 상태: `confirmed`
- source: `UI`, `runtime`
- 시각: 2026-04-24 08:32 UTC
- 근거:
  - `/home/ubuntu/upbit_bot/evidence/raw/auth/dry_run_mode_badge.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/auth/dry_run_mode_context.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/auth/dry_run_mode_auth_me.json`
- 핵심 설명:
  - 로컬 런타임 `http://127.0.0.1:8000/`에서 synthetic 일반 로그인 사용자 1개를 `DRY RUN` 상태로 전환한 뒤, 헤더의 `DRY RUN` 배지를 buyer-facing safe capture로 확보했다.
  - 같은 세션의 보조 raw는 `is_guest: false`, `is_dry_run: true`를 기록해 guest가 아니라 일반 로그인 dry-run 상태임을 보여준다.
  - raw에는 `session_cookie`, `user_id`, `password`, `api_keys`, `balances`를 남기지 않았다.

## Inferred

### 1. 세션 유지 상태는 브라우저 새로고침 후에도 cookie 유효 기간 안에서 복원될 가능성이 높다

- 상태: `inferred`
- source: `code`, `doc`
- 시각: 2026-04-20 05:35 UTC / 05:41 UTC
- 근거:
  - `/auth/login`은 7일 `session` cookie를 set 한다.
  - `auth_security_audit.md`는 새로고침 시 `/auth/me`로 `_currentUser`를 복원한다고 기록한다.
- 핵심 설명:
  - 실제 브라우저 캡처는 없지만, 코드상 세션 유지 흐름은 설명 가능하다.

### 2. guest 차단은 실거래 경로 차단 의미로는 설명 가능하다

- 상태: `inferred`
- source: `code`
- 시각: 2026-04-20 05:34 UTC / 05:49 UTC
- 근거:
  - guest는 `is_dry_run=True`로 강제된다.
  - 주문 경로는 `is_dry_run`이면 sandbox 경로로 분기된다.
- 핵심 설명:
  - “guest 차단”은 별도 거부 응답보다는 실거래 경로에 진입하지 못하게 만드는 구조로 해석된다.

### 3. 사용자별 키 적용은 런타임에서도 분리될 가능성이 높다

- 상태: `inferred`
- source: `code`
- 시각: 2026-04-20 05:49 UTC
- 근거:
  - 키 조회 코드가 모두 `user["user_id"]`를 조건으로 사용한다.
  - 전략/주문 생성 시 각 사용자 컨텍스트에서 해당 키를 찾는다.
- 핵심 설명:
  - 코드상 분리는 명확하지만, buyer 제출용 실제 다중 사용자 실행 증거는 별도 확보가 필요하다.

## Limited

### 1. 2026-04-20 auth_mode_triptych 캡처 시도 결과

- 상태: `limited`
- source: `runtime`, `doc`
- 시각: 2026-04-20 07:00 UTC
- 근거:
  - 공개 런타임 `https://gridflow.co.kr/`에서 guest 세션 생성 후 `guest_mode_badge.png` 1장은 확보했다.
  - `POST /auth/guest/session` 런타임 응답은 `200 OK`와 guest payload를 반환했다.
  - `logout_overlay_return.png`, `refresh_session_result.png`도 2026-04-20 07:17 UTC 기준 추가 확보했다.
  - `login_error_invalid_credentials.png`도 2026-04-20 07:22 UTC 기준 추가 확보했다.
  - `live_mode_badge.png`도 2026-04-20 08:07 UTC 기준 추가 확보했다.
  - `2026-04-24` 기준 `dry_run_mode_badge.png`, `dry_run_mode_auth_me.json`도 추가 확보했다.
- 핵심 설명:
  - guest 기준 `모드 배지`, `로그아웃 후 오버레이 복귀`, `새로고침 후 세션 유지`와 로그인 실패 UI는 화면 증거로 닫혔다.
  - `LIVE` 배지도 화면 증거로 닫혔다.
  - `GUEST / DRY RUN / LIVE` 3모드의 기본 배지 캡처 축은 now closed다.
  - 다만 provenance는 다르다. `GUEST`/`LIVE`는 공개 런타임 캡처, `DRY RUN`은 synthetic 일반 로그인 safe capture 기준이다.

## Missing

### 1. guest 차단의 buyer-facing 실행 증거

- 상태: `missing`
- source: `UI`, `log`
- 시각: 없음
- 핵심 설명:
  - guest가 실거래로 가지 않고 sandbox 처리됨을 한 번에 보여주는 화면/로그 묶음이 없다.

### 2. 사용자별 API 키 적용의 실제 증거

- 상태: `missing`
- source: `DB`, `UI`, `log`
- 시각: 없음
- 핵심 설명:
  - 서로 다른 두 사용자에 대해 다른 거래소 키 또는 다른 dry-run/live 상태가 실제로 적용되는 DB 추출/화면/로그 묶음이 없다.

## needed capture / 추가로 필요한 캡처·추출

- 로그아웃 직후 로그인 오버레이 복귀 캡처 1종
- 새로고침 후 동일 사용자 상태 유지 캡처 1종
- 잘못된 비밀번호 입력 시 에러 메시지 캡처 1종
- guest 상태에서 주문 시 sandbox 처리 결과가 보이는 화면 또는 로그 1종
- dry run Upbit 주문 1건, dry run Bithumb 주문 1건의 `sandbox_orders` 또는 activity log 추출
- live 사용자 기준 키 등록 상태 화면 캡처 1종
- 사용자 2명 이상 기준 `bot_configs`/`users.is_dry_run` 차이를 보여주는 sanitized DB 추출 1종

## 비고

- 본 문서의 `confirmed`는 코드/문서/검증 기록으로 직접 설명 가능한 항목만 포함한다.
- buyer 제출용 증거 패키지로 쓰려면 `missing` 항목 중 최소 UI 캡처와 sanitized DB/log 추출이 추가로 필요하다.
