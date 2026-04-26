GridFlow Auth Storage Audit

상태
- 코드 기준 감사 문서
- 수정 없이 판정만 기록

1. 확인한 파일/함수

메인 auth
- `app/api/auth_routes.py`
  - `login()` [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:268)
  - `create_guest_session()` [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:304)
  - `logout_guest()` [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:320)
  - `logout()` [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:350)
  - `me()` [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:357)
- `app/auth/dependencies.py`
  - `get_current_user()` [app/auth/dependencies.py](/home/ubuntu/upbit_bot/app/auth/dependencies.py:6)
- `app/auth/auth.py`
  - `create_session()` [app/auth/auth.py](/home/ubuntu/upbit_bot/app/auth/auth.py:39)
  - `get_session()` [app/auth/auth.py](/home/ubuntu/upbit_bot/app/auth/auth.py:65)

프론트
- `static/js/auth.js`
  - `_token` 초기화 [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:8)
  - `checkAuth()` [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:47)
  - `doLogin()` [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:89)
  - `doLogout()` [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:182)
  - `authFetch()` [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:264)
  - `enterGuestMode()` [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:353)
- `static/js/common.js`
  - auth bridge / 상태 동기화 [static/js/common.js](/home/ubuntu/upbit_bot/static/js/common.js:133)
  - 공통 `authFetch()` [static/js/common.js](/home/ubuntu/upbit_bot/static/js/common.js:197)
  - `init()` 복원 경로 [static/js/common.js](/home/ubuntu/upbit_bot/static/js/common.js:4911)
- `static/js/home.js`
  - GUEST 배너 판정 [static/js/home.js](/home/ubuntu/upbit_bot/static/js/home.js:909)

monitor auth 분리 확인
- `app/monitor/routes.py`
  - `monitor_login()` [app/monitor/routes.py](/home/ubuntu/upbit_bot/app/monitor/routes.py:94)

2. 로그인 성공 시 저장/설정되는 항목

일반 로그인
- 확정: 서버는 로그인 성공 시 `token`을 response body에 포함해 반환한다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:294)
- 확정: 서버는 동시에 `session` 쿠키를 `httponly`로 set 한다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:287)
- 확정: 프론트는 `d.token`을 `window._token`에 저장한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:107)
- 확정: remember 체크 시 `localStorage['auth_token']`에 저장한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:108)
- 확정: remember 미체크 시 `sessionStorage['auth_token']`에 저장한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:114)
- 확정: 프론트는 로그인 응답 전체를 `window._currentUser`에 둔다. 이 객체에는 `is_admin`, `is_guest`, `is_dry_run`, `username`, `token`이 함께 들어온다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:122)

게스트 로그인
- 확정: 서버는 `/auth/guest/session`에서 `token`을 body로 반환한다. cookie set 은 하지 않는다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:304)
- 확정: 프론트는 게스트 토큰을 `window._token`에만 저장하고, `localStorage`/`sessionStorage`의 `auth_token`은 삭제한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:356)

3. 프론트 저장 위치

일반 로그인 저장 위치
- 확정: 메모리 변수 `window._token`
- 확정: 메모리 변수 `window._currentUser`
- 확정: `localStorage['auth_token']` 또는 `sessionStorage['auth_token']`
- 확정: 서버가 별도로 `httponly` cookie `session`도 발급한다.

부가 저장
- 확정: `saved_username`은 `localStorage`에 저장한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:119)
- 확정: 로그인 공지 확인 플래그도 `localStorage`에 저장한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:130)

판정
- 확정: 메인 auth 프론트 저장 구조는 `localStorage + sessionStorage + 메모리 변수 + 서버 cookie`의 혼합 방식이다.

4. 요청 시 인증 전달 방식

메인 auth 요청
- 확정: `checkAuth()`는 `/auth/me` 호출 시 `X-Auth-Token` 헤더를 붙인다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:59)
- 확정: `static/js/auth.js`의 `authFetch()`는 일반 사용자 요청에 `X-Auth-Token: window._token`을 붙인다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:310)
- 확정: `static/js/common.js`의 공통 `authFetch()`도 `X-Auth-Token: _token`을 붙인다. [static/js/common.js](/home/ubuntu/upbit_bot/static/js/common.js:252)
- 확정: `Authorization` 헤더는 확인하지 못했다.
- 확정: `fetch(..., { credentials: 'include' })` 강제 지정은 확인하지 못했다.

서버 인증 의존성
- 확정: 서버는 `x_auth_token` 헤더가 있으면 우선 사용하고, 없으면 `session` cookie를 사용한다. [app/auth/dependencies.py](/home/ubuntu/upbit_bot/app/auth/dependencies.py:6)
- 확정: `/auth/me`도 동일하게 `x_auth_token or session` 순서로 토큰을 읽는다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:357)

판정
- 확정: 메인 auth의 실제 요청 전달 방식은 `X-Auth-Token` 헤더 중심이며, 서버는 cookie fallback을 허용하는 혼합 방식이다.

5. 새로고침/로그아웃 흐름

새로고침 시 복원
- 확정: 페이지 로드 시 `window._token`은 `localStorage` 또는 `sessionStorage`에서 먼저 복원된다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:8)
- 확정: `init()`는 `_token`이 있고 `_currentUser`가 없으면 `checkAuth()`를 호출해 `/auth/me`로 사용자 상태를 다시 받아온다. [static/js/common.js](/home/ubuntu/upbit_bot/static/js/common.js:4911)
- 확정: 즉, 새로고침 복원 경로는 `JS 저장소 -> window._token -> /auth/me(X-Auth-Token)`이다.

로그아웃
- 확정: 프론트는 로그아웃 시 서버 응답을 기다리지 않고 먼저 `window._token`, `window._currentUser`, `window.isGuest`를 비우고 `localStorage`/`sessionStorage`의 `auth_token`을 삭제한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:182)
- 확정: 이후 `/auth/logout` 또는 `/auth/guest/logout`을 fire-and-forget으로 호출하며 `X-Auth-Token` 헤더를 붙인다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:208)
- 확정: `/auth/logout`은 cookie만 보고 세션을 삭제하고 cookie를 지운다. 헤더 토큰은 받지 않는다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:350)
- 확정: `/auth/guest/logout`은 `x_auth_token or session` 둘 다 허용한다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:320)

GUEST / DRY RUN / LIVE 연결
- 확정: UI 표시 기준은 `_currentUser.is_guest` / `_currentUser.is_dry_run`이다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:17)
- 확정: 홈 GUEST 배너도 `window.isGuest` 또는 `_currentUser.is_guest`로 판정한다. [static/js/home.js](/home/ubuntu/upbit_bot/static/js/home.js:909)
- 확정: 서버 의존성에서 guest는 인증 통과 후 강제로 `is_dry_run=True`로 취급된다. [app/auth/dependencies.py](/home/ubuntu/upbit_bot/app/auth/dependencies.py:15)

6. monitor auth 분리 메모

- 확정: monitor login은 body에 token을 반환하지 않고 `monitor_session` cookie만 set 한다. [app/monitor/routes.py](/home/ubuntu/upbit_bot/app/monitor/routes.py:94)
- 확정: monitor는 메인 auth와 별도 경로이며, 이 감사 범위에서 메인 `auth_token` 저장 구조와 직접 연결된 코드는 확인하지 못했다.
- 확정: monitor 쪽은 본 감사의 최종 FAIL 판정과 분리해 봐야 한다.

7. 최종 판정

- FAIL

8. 근거

- 확정: 서버가 `/auth/login` 성공 시 `token`을 body로 반환한다. [app/api/auth_routes.py](/home/ubuntu/upbit_bot/app/api/auth_routes.py:294)
- 확정: 프론트가 그 `token`을 `window._token`과 `localStorage` 또는 `sessionStorage`에 저장한다. [static/js/auth.js](/home/ubuntu/upbit_bot/static/js/auth.js:107)
- 확정: 이후 API 요청 대부분이 cookie가 아니라 `X-Auth-Token` 헤더로 인증한다. [static/js/common.js](/home/ubuntu/upbit_bot/static/js/common.js:257)
- 확정: 서버는 cookie도 set 하므로 구조상 `body token + JS 저장소 + cookie fallback` 혼합 방식이다.
- 판정 기준상 “token body 반환 + JS 저장소 저장”이 존재하므로 FAIL에 해당한다.

9. 하드닝 필요 지점

- 점검 포인트 1: 메인 auth의 실제 주 인증 수단이 cookie인지 `X-Auth-Token`인지 경계를 하나로 정리할 필요가 있다.
- 점검 포인트 2: `/auth/logout`과 프론트 로그아웃 경로가 같은 토큰 소스를 폐기하는지 대조가 필요하다.
- 점검 포인트 3: guest와 monitor를 포함한 전체 auth 저장 방식을 문서 기준으로 다시 일치시킬 필요가 있다.

10. 추가 확인 필요 항목

- 미확정: `static/index.html` 인라인 스크립트에 auth 저장 로직이 `static/js/auth.js`와 중복되는지 여부는 이번 감사 범위에서 확인하지 않았다.
- 미확정: monitor 프론트 스크립트가 별도 브라우저 저장소를 쓰는지 여부는 메인 auth 연결 범위를 넘어서 이번 턴에서 확인하지 않았다.
- 미확정: 브라우저가 same-origin cookie를 fetch에 자동 포함하는 동작은 가능하지만, 실제 운영에서 메인 auth가 cookie만으로 호출되는 경로는 이번 감사에서 주 경로로 확인되지 않았다.
