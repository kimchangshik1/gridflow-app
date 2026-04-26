# MONITOR_AUTH_BOUNDARY

이번 문서는 monitor auth/session 구조와 main app auth 경계를 코드 기준으로 정리한 마감 메모다.
이번 턴은 monitor 프론트의 토큰 잔존 경로를 제거한 뒤, 현재 구조와 남는 한계를 문서화한다.

## 확인한 파일/함수

- `app/monitor/auth.py`
  - `create_monitor_session()`
  - `is_valid_session()`
  - `delete_monitor_session()`
  - `invalidate_all_sessions()`
  - `get_monitor_user()`
- `app/monitor/routes.py`
  - `monitor_login()`
  - `monitor_logout()`
  - `change_password()`
  - `get_auth_status()`
- `app/monitor/product_app.py`
  - `_has_session()`
  - `monitor_home()`
  - `setup_page()`
- `static/js/monitor.js`
  - `getJson()`

## monitor auth/session 구조 요약

- `확정`: monitor는 main app와 별도 세션 구조를 사용한다.
- `확정`: 로그인 성공 시 `monitor_session` cookie를 발급한다. `httponly`, `samesite="strict"`, `max_age=28800(8시간)` 설정이다.
- `확정`: monitor 세션 저장소는 `app/monitor/auth.py`의 `_sessions` 메모리 dict다. 토큰별 만료시각을 프로세스 메모리에만 보관한다.
- `확정`: monitor 비밀번호는 `/etc/gridflow/monitor_auth.json`에 bcrypt hash 형태로 저장된다.
- `확정`: monitor 설정값은 `/etc/gridflow/monitor_config.json`에 저장된다.
- `확정`: 인증된 monitor 사용자는 `_LOCAL_USER` 단일 객체로 취급된다. 사용자별 세분화나 DB 세션 연결은 확인되지 않았다.

## main app auth와의 관계

- `확정`: main app auth와 동일 구조가 아니다.
- `확정`: main app는 `app/auth/auth.py`의 DB 기반 `user_sessions`를 쓰고, monitor는 `app/monitor/auth.py`의 메모리 `_sessions`를 쓴다.
- `확정`: cookie 이름도 다르다. main app는 `session`, monitor는 `monitor_session`이다.
- `확정`: monitor는 main app 세션을 재사용하지 않는다.
- `확정`: monitor 라우트는 `get_monitor_user()`로만 보호되고, main app의 `get_current_user()`와 직접 연결되지 않는다.
- `확정`: main auth가 이전 턴 기준 `PASS`여도 monitor auth 상태는 별도로 봐야 한다.

## 브라우저 저장 방식 판정

- `확정`: monitor 서버 인증은 `monitor_session` cookie 기반이다.
- `확정`: `static/js/monitor.js`의 `auth_token` / `token` localStorage 조회와 `X-Auth-Token` 헤더 부착 경로를 이번 턴에서 제거했다.
- `확정`: 현재 monitor 프론트 요청은 `credentials: "include"`로 `monitor_session` cookie만 전제로 동작한다.
- `확정`: 이번 확인 범위에서 monitor 서버가 `X-Auth-Token`을 읽는 코드는 발견되지 않았다.
- `판정`: 현재 브라우저 저장 방식은 `cookie 기반`이다.

## 상태 변경 보호선

- `확정`: `app/monitor/product_app.py`는 `/monitor` 아래 `POST` / `PUT` / `PATCH` / `DELETE` 요청에 same-origin `Origin` / `Referer` host 검증을 적용한다.
- `확정`: monitor 로그인, setup 저장/삭제, logout, password change는 위 same-origin guard 범위에 포함된다.
- `판정`: monitor mutation 보호선은 설명 가능하다.
- `제한`: formal CSRF token 체계는 아니다.

## 재시작 / 다중 인스턴스 영향

- `확정`: monitor 프로세스 재시작 시 `_sessions` 메모리 dict가 초기화된다. 기존 `monitor_session` cookie는 남아 있어도 서버에서 유효 세션으로 인정되지 않는다.
- `확정`: 로그인 실패 추적 `_login_failures`도 메모리 dict라 재시작 시 초기화된다.
- `확정`: 비밀번호 hash와 monitor config는 파일 기반이라 재시작 후에도 유지된다.
- `확정`: 세션 저장이 프로세스 로컬 메모리이므로 단일 인스턴스 전제에 가깝다.
- `확정`: 다중 인스턴스 또는 로드밸런싱 환경에서는 세션 공유가 없어 취약하다.

## 최종 판정

- `KNOWN LIMITATION ACCEPTED`
- 이유:
  - token leakage 이슈는 현재 확인 범위에서 닫혔다.
  - same-origin mutation guard도 현재 코드와 live request 검증 기준으로 설명 가능하다.
  - 남은 문제는 구조적 limitation이다.
    - 메모리 세션
    - 재시작 시 세션 무효화
    - 단일 인스턴스 전제
    - `_LOCAL_USER` 단일 운영자 모델
  - 아키텍처 변경 없이 PASS로 포장하면 과장이다.

## 알려진 제한사항 초안

- monitor는 main app와 세션을 공유하지 않는 별도 로그인 영역이다.
- monitor 세션은 프로세스 메모리에만 존재하므로 서비스 재시작 시 모두 무효화된다.
- 다중 인스턴스/로드밸런싱 환경에서는 세션 일관성이 보장되지 않는다.
- `_LOCAL_USER` 단일 사용자 모델이라 다중 운영자 구분이나 권한 분리는 확인되지 않았다.

## 이번 턴 정리

- `확정`: 제거한 프론트 잔존 경로
  - `localStorage.getItem("auth_token")`
  - `localStorage.getItem("token")`
  - `X-Auth-Token` 헤더 부착
- `확정`: 현재 실제 인증 방식
  - monitor 로그인 시 `monitor_session` cookie 발급
  - monitor 프론트는 same-origin 요청에서 cookie만 사용
  - monitor 서버는 `get_monitor_user()` / `_has_session()`으로 cookie 세션만 검증

## 추가 확인 필요 항목

- `추가 확인 필요`: 실제 monitor 로그인 페이지 스크립트가 `monitor.js` 외 별도 auth 저장 로직을 갖는지
- `추가 확인 필요`: 운영 배포가 단일 프로세스/단일 인스턴스로 고정되어 있는지
- `추가 확인 필요`: reverse proxy 또는 별도 앱 계층에서 monitor 경로에 추가 인증을 두는지
