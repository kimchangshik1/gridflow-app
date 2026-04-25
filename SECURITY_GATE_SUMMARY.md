# SECURITY_GATE_SUMMARY

이번 문서는 2026-04-25 UTC 기준 buyer-facing security disposition만 압축한다.
새 사실을 추가하지 않고, current tree scan, history scan, runtime spot-check, route coverage audit, live local request verification 결과만 잠근다.

## 1. Secret Hygiene / Delivery Policy

- `KNOWN LIMITATION ACCEPTED`
- 잠금 결론:
  - buyer deliverable은 clean delivery tarball only다.
  - full history repo는 non-deliverable이다.
  - clean/squash repo는 필요 시 별도 diligence artifact로만 다룬다.
  - history scan 기준 과거 DB credential literal exposure가 있었다는 사실을 숨기지 않는다.
- closeout matrix:
  - PostgreSQL credential: `rotated confirmed`
  - exchange key: `no concrete exposure confirmed`
  - monitor secret/hash: `no concrete exposure confirmed`
  - webhook URL: `no concrete exposure confirmed`
- runtime spot-check:
  - current runtime DB password는 historically exposed literal과 더 이상 일치하지 않는다.
  - current runtime monitor config/auth는 non-empty 값과 password hash를 가진다.
  - current runtime env에는 `GRIDFLOW_ALERT_WEBHOOK_URL`이 설정돼 있다.
  - pre-rotation backup file과 rollback file location을 확보한 뒤 rotation을 수행했다.
  - post-rotation에 `gridflow-app`, `upbit-bot`, `orderlens-ops`가 모두 active로 복귀했다.
  - post-rotation backup dump 생성과 restore verify가 둘 다 성공했다.

## 2. Auth / Session

- `PASS`
- 이유:
  - 메인 앱 auth는 `session` cookie + DB-backed `user_sessions` 기준으로 설명 가능하다.
  - 현재 프론트 auth는 same-origin cookie 요청 기준으로 동작하고, browser storage token 중심 구조는 현행 주 경로가 아니다.
  - guest / dry / live 분기와 `/auth/me` 세션 복원 경로도 현재 코드와 맞는다.

## 3. Monitor Auth Boundary

- `KNOWN LIMITATION ACCEPTED`
- 이유:
  - 현재 이슈는 token leakage가 아니라 구조 limitation으로 고정된다.
  - monitor는 `monitor_session` cookie와 same-origin mutation guard 기준으로 설명 가능하다.
  - 남는 문제는 아래와 같다.
    - 메모리 세션
    - 재시작 시 세션 무효화
    - 단일 인스턴스 전제
    - `_LOCAL_USER` 단일 운영자 모델
  - 아키텍처 변경 없이 PASS로 포장하지 않는다.

## 4. State-Changing Protection

- `KNOWN LIMITATION ACCEPTED`
- coverage audit:
  - main app current mutation route 38개 전부가 보호 prefix 안에 있다.
  - monitor current mutation route 5개 전부가 `/monitor` guard 안에 있다.
  - 현재 코드 기준 uncovered mutation route는 확인되지 않았다.
- behavior proof:
  - `POST /auth/logout` without header -> `403`
  - `POST /auth/logout` with header + mismatched `Origin` -> `403`
  - `POST /auth/logout` with header + same-origin `Origin` -> `200`
  - `POST /auth/logout` with header + same-origin `Origin` + mismatched `Referer` -> `200`
  - `POST /auth/logout` with header only and no `Origin`/`Referer` -> `200`
  - `POST /grid/strategies/1/pause` with header + same-origin `Origin` -> `401` auth gate로 진행
  - `POST /monitor/logout` without `Origin`/`Referer` -> `403`
  - `POST /monitor/logout` with same-origin `Origin` -> `200`
  - `POST /monitor/logout` with same-origin `Origin` + mismatched `Referer` -> `200`
- 정확한 해석:
  - main app는 custom header가 필수이고, `Origin`/`Referer`가 있을 때만 host 검증을 추가한다.
  - monitor는 same-origin `Origin`/`Referer` 컨텍스트 자체를 요구한다.
  - 두 구현 모두 `Origin`과 `Referer`가 모두 있을 때 둘 중 하나만 host와 맞아도 통과한다.
  - formal CSRF token framework는 아니다.

## 5. Final Buyer-Facing Security Disposition

- `READY WITH KNOWN LIMITATIONS`
- 최종 이유:
  - delivery policy와 mutation coverage는 freeze-ready wording으로 잠겼다.
  - monitor auth는 token leakage HOLD가 아니라 known limitation accepted로 재판정됐다.
  - 과거 history literal exposure가 확인된 DB credential은 현재 runtime에서 실제 회전됐고, runtime reuse도 닫혔다.
  - 남는 제약은 full history repo non-deliverable, monitor in-memory session limitation, formal CSRF token framework 부재 같은 known limitation이다.
