# GridFlow Security

## 보안 설명 원칙

이 문서는 2026-04-25 UTC 기준 코드, route inventory, live local request 검증, repo/history scan에서 확인된 사실만 적는다.
완전한 보안 인증서나 formal CSRF solved 선언이 아니다.

## Delivery and Secret Boundary

운영 secret은 runtime 파일 경로에 두는 것이 기본 계약이다.

- `/etc/gridflow/gridflow.env`
- `/etc/gridflow/monitor_config.json`
- `/etc/gridflow/monitor_auth.json`

buyer-facing 전달 원칙

- 실제 secret 값은 buyer 문서에 넣지 않는다.
- buyer set에는 template, schema, install 절차만 포함한다.
- clean delivery tarball only가 deliverable이다.
- full history repo는 non-deliverable이다.
- clean/squash repo가 필요하면 별도 diligence artifact로만 다룬다.
- history scan 기준 과거 DB credential literal exposure가 있었다는 사실을 숨기지 않는다.

## Main App Auth and Session

메인 앱은 cookie/session 기반 인증을 사용한다.

- 로그인과 guest session은 `session` cookie를 발급한다.
- 세션 저장소는 DB-backed `user_sessions`다.
- cookie 옵션은 `HttpOnly`, `SameSite=Lax`다.
- 현재 프론트 auth는 `auth_token` 저장이 아니라 same-origin cookie 요청 기준으로 동작한다.

## Monitor Auth Boundary

monitor는 main app와 동일 세션 구조가 아니다.

- main app cookie: `session`
- monitor cookie: `monitor_session`
- main app session store: DB-backed `user_sessions`
- monitor session store: process-memory `_sessions` dict
- monitor password는 `/etc/gridflow/monitor_auth.json`의 bcrypt hash로 저장된다.
- monitor config는 `/etc/gridflow/monitor_config.json`에 저장된다.

최종 해석

- token leakage 이슈로 고정하면 현재 코드 기준과 맞지 않는다.
- 남는 문제는 구조 limitation이다.
  - in-memory session
  - restart 시 session invalidation
  - single-instance 전제
  - `_LOCAL_USER` 단일 운영자 모델
- 아키텍처 변경 없이 PASS로 설명하면 과장이다.

## State-Changing Request Protection

### Main app coverage audit

`app/main.py` middleware는 `POST`, `PUT`, `PATCH`, `DELETE` 요청 중 아래 prefix에 걸리는 경로를 공통 보호한다.

- `/api`
- `/bapi`
- `/config`
- `/auth`
- `/grid`
- `/dca`
- `/backtest`
- `/rebalancing`

현재 route inventory 기준 main app mutation route는 총 38개이며, 전부 위 prefix 안에 있다.

- `/api`: 4
- `/bapi`: 2
- `/config`: 4
- `/auth`: 10
- `/grid`: 6
- `/dca`: 5
- `/backtest`: 1
- `/rebalancing`: 6

현재 코드 기준 main app에는 보호 prefix 밖의 별도 mutation route가 없다.
다만 이후 새 mutation route가 다른 prefix나 root path에 추가되면 이 middleware는 자동 적용되지 않는다.

### Monitor coverage audit

`app/monitor/product_app.py` middleware는 `/monitor` 아래 `POST`, `PUT`, `PATCH`, `DELETE`를 same-origin guard로 보호한다.

현재 monitor mutation route는 총 5개이며 전부 `/monitor` 아래에 있다.

- `POST /monitor/login`
- `POST /monitor/logout`
- `POST /monitor/change-password`
- `POST /monitor/setup`
- `DELETE /monitor/setup`

현재 코드 기준 monitor에는 `/monitor` 밖의 별도 mutation route가 없다.

### Verified behavior

2026-04-25 UTC live local request 결과는 아래와 같다.

main app

- `POST /auth/logout` without header -> `403 {"detail":"상태 변경 요청 검증에 실패했습니다"}`
- `POST /auth/logout` with header + mismatched `Origin` -> `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- `POST /auth/logout` with header + same-origin `Origin` -> `200 {"success":true}`
- `POST /auth/logout` with header + same-origin `Origin` + mismatched `Referer` -> `200 {"success":true}`
- `POST /auth/logout` with header only and no `Origin`/`Referer` -> `200 {"success":true}`
- `POST /grid/strategies/1/pause` without header -> `403 {"detail":"상태 변경 요청 검증에 실패했습니다"}`
- `POST /grid/strategies/1/pause` with header + same-origin `Origin` -> `401 {"detail":"로그인이 필요합니다"}`
- `POST /grid/strategies/1/pause` with header only and no `Origin`/`Referer` -> `401 {"detail":"로그인이 필요합니다"}`

monitor

- `POST /monitor/logout` without `Origin`/`Referer` -> `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- `POST /monitor/logout` with mismatched `Origin` -> `403 {"detail":"요청 출처 검증에 실패했습니다"}`
- `POST /monitor/logout` with same-origin `Origin` -> `200 {"ok":true}`
- `POST /monitor/logout` with same-origin `Origin` + mismatched `Referer` -> `200 {"ok":true}`

정확한 해석

- main app는 `X-GridFlow-State-Change: 1` header가 필수다.
- main app는 `Origin` 또는 `Referer`가 있을 때만 host 검증을 추가로 수행한다.
- main app는 `Origin`/`Referer`가 모두 없는 호출을 막지 않는다. 이 경우 기존 custom-header 계약과 `SameSite=Lax` cookie 조건에 계속 의존한다.
- monitor는 `/monitor` mutation에서 same-origin `Origin`/`Referer` 컨텍스트 자체를 요구한다.
- 두 구현 모두 `Origin`과 `Referer`를 모두 강제 일치시키는 방식이 아니라, 둘 중 하나만 host와 맞아도 통과한다.
- 따라서 현재 보호선은 설명 가능하지만 formal CSRF token framework와 동일하다고 말하면 과장이다.

## Rotation Matrix Closeout

이번 closeout은 buyer-facing final freeze에 필요한 4개 항목만 잠근다.
실제 secret 값은 적지 않는다.

- PostgreSQL credential: `rotation required`
  - git history에 literal exposure가 있었지만, 2026-04-25 UTC runtime rotation 후 current runtime password는 그 historically exposed literal과 더 이상 일치하지 않는다.
  - `gridflow-app`, `upbit-bot`, `orderlens-ops` 재기동, invalid login DB path, key table read, backup, restore verify까지 통과했다.
- exchange key: `no concrete exposure confirmed`
  - repo current tree/history에서는 key-name reference만 확인됐다.
- monitor secret/hash: `no concrete exposure confirmed`
  - runtime file에는 값이 있으나 repo current tree/history에서는 구조 참조만 확인됐다.
- webhook URL: `no concrete exposure confirmed`
  - current runtime env에는 값이 있으나 repo current tree/history에서는 env-name reference만 확인됐다.

## Buyer-Facing Security Statement

현재 buyer-facing으로 정확하게 설명할 수 있는 문장은 아래 수준이다.

- deliverable은 clean delivery tarball only다.
- full history repo는 non-deliverable이다.
- clean/squash repo는 요청 시 별도 diligence artifact다.
- main app는 cookie/session 기반 auth와 공통 state-change 보호선을 가진다.
- monitor는 별도 로그인 경계와 same-origin mutation guard를 가진다.
- monitor auth의 남는 문제는 token leakage가 아니라 in-memory session 구조 limitation이다.
- PostgreSQL credential은 current runtime 기준 `rotated confirmed`다.
- full history repo는 history exposure 때문에 계속 non-deliverable이다.
