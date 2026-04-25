GridFlow Auth Security Audit

상태
- 대단원 3-2 1차 수정 결과 기록
- 이번 턴 범위는 메인 auth 저장 구조만 포함

1. 이번 수정 파일 목록

- `app/api/auth_routes.py`
- `app/auth/dependencies.py`
- `static/js/auth.js`
- `static/js/common.js`
- `static/index.html`

2. 제거한 저장 경로

브라우저 저장소
- 제거: `localStorage['auth_token']`
- 제거: `sessionStorage['auth_token']`

JS 토큰 상태
- 제거: `window._token` 기반 메인 auth 저장/복원
- 제거: `_token` 전역 브리지와 인라인 `_token` 초기화

헤더 전달
- 제거: 메인 auth 요청의 `X-Auth-Token` 부착
- 제거: 서버 메인 auth 경로의 `x_auth_token or session` 혼합 판정

3. 현재 인증 전달 방식

일반 로그인
- 서버는 `/auth/login` 성공 시 `session` cookie를 `httponly`로 set 한다.
- body에는 `success`, `user_id`, `username`, `is_admin`, `is_guest`, `is_dry_run`만 반환한다.
- 프론트는 `_currentUser`만 메모리 상태로 유지한다.

새로고침 복원
- 프론트는 JS 저장소에서 토큰을 복원하지 않는다.
- `checkAuth()`가 `/auth/me`를 same-origin cookie 기반으로 호출해 `_currentUser`를 복원한다.
- `init()`도 `_currentUser`가 없으면 `checkAuth()`를 호출하는 구조로 정리됐다.

공통 요청
- `authFetch()`는 same-origin cookie 기반 fetch를 사용한다.
- 메인 요청 경로에서 `X-Auth-Token`은 붙이지 않는다.

로그아웃
- 프론트는 `_currentUser`와 guest UI 상태만 비운다.
- 서버 `/auth/logout` 또는 `/auth/guest/logout`이 cookie 기준 세션을 종료한다.

게스트
- `/auth/guest/session`도 `session` cookie를 set 하도록 바꿨다.
- 게스트 상태 표시는 `_currentUser.is_guest`와 `window.isGuest`를 유지한다.

4. 남은 리스크 / 추가 확인 필요 항목

- `static/js/monitor.js`에는 여전히 `localStorage("auth_token")` 및 `X-Auth-Token` 참조가 남아 있다.
  - 이번 턴 범위 밖 monitor auth 경계라 수정하지 않았다.
- `CSRF / Origin / Referer / cookie secure / cookie domain` 같은 하드닝 항목은 이번 턴 범위 밖이다.
- `static/index.html`의 대형 인라인 스크립트와 분리 JS 사이에 auth 중복 로직이 추가로 없는지는 이번 수정 범위에서 직접 건드린 구간 외에는 재정리하지 않았다.
- 실제 브라우저 회귀는 이번 턴에서 실행하지 않았고, 정적 검토와 문법 검증만 수행했다.

5. 이번 턴 판정

- PASS

판정 근거
- 메인 auth 기준 `auth_token`의 `localStorage`/`sessionStorage` 저장이 제거됐다.
- 메인 auth 기준 `window._token` 저장/복원 흐름이 제거됐다.
- 메인 auth 기준 인증 확인과 API 요청이 cookie 우선 구조로 동작하도록 정리됐다.
- 기존 FAIL 원인이던 “body token 반환 + JS 저장소 저장 + X-Auth-Token 헤더 중심 흐름”은 메인 auth 범위에서 제거됐다.

6. 검증 메모

- `node --check static/js/auth.js` 통과
- `node --check static/js/common.js` 통과
- `python3 -m py_compile app/api/auth_routes.py app/auth/dependencies.py` 통과
