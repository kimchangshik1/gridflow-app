# auth_capture_harness.md

기준
- 작성 기준: 2026-04-20 UTC
- 목적: 공개 런타임 `https://gridflow.co.kr/` 기준 auth P0 캡처를 재시도할 수 있는 1회성 harness 메모

파일
- script:
  - `/home/ubuntu/upbit_bot/evidence/raw/auth_mode_triptych_capture.js`
- output dir:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth`
- result json:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_mode_triptych_capture_result.json`

실행 명령
```bash
node /home/ubuntu/upbit_bot/evidence/raw/auth_mode_triptych_capture.js
```

시도 범위
- 로그인 오버레이 존재 확인
- guest 세션 생성
- `guest_mode_badge.png` 시도
- `logout` / `refresh`는 별도 상호작용 harness 범위였고, 2026-04-20에 one-off interaction run으로 별도 수행했다.

저장 대상 샷
- `login_overlay_initial.png`
- `guest_mode_badge.png`
- `logout_overlay_return.png`
- `refresh_session_result.png`
- `login_error_invalid_credentials.png`
- `live_mode_badge.png`

현재 실행 메모
- 2026-04-20 기준 harness를 official Playwright CLI screenshot 경로로 전환했다.
- 게스트 세션 token을 storage state로 주입해 `guest_mode_badge.png` 1장을 실제 확보했다.
- 실제 확보 파일:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/guest_mode_badge.png`
- 상호작용형 추가 확보 파일:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/logout_overlay_return.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/refresh_session_result.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/login_error_invalid_credentials.png`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/live_mode_badge.png`
- 상호작용형 결과 JSON:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_logout_refresh_result.json`
  - `refresh_result=session persists`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_login_error_result.json`
  - `error_text=아이디 또는 비밀번호가 올바르지 않습니다`
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/live_badge_direct_register_result.json`
  - `register_status=200`
  - `login_status=200`
  - `login_label_text=cod***40 LIVE`
- harness 결과 JSON:
  - `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth/auth_mode_triptych_capture_result.json`
  - 초기 `login_overlay_initial.png` 단계는 실패로 남아 있다.

현재 blocker
- `dry_live_mode_reproduction_unavailable`
- 설명:
  - guest 기준 `mode badge`, `logout`, `refresh`는 확보했다.
  - `LIVE`는 direct `/auth/register -> /auth/login` 경로로 확보했다.
  - 남은 auth capture gap은 `DRY RUN`을 재현할 안전한 테스트 세션이 없다는 점이다.

다음 턴 재실행 조건
- `npx playwright screenshot`가 동작하는 세션
- 쓰기 가능 경로 `/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth`
