# GridFlow Operations

## 운영 개요

현재 buyer-facing 운영 문서는 아래 범위를 설명합니다.

- 일상 점검
- 서비스와 로그 확인
- backup / restore verify
- health alert
- monitor 활용
- verified backend control path와 documented operational safeguard boundary

## 일상 점검 항목

운영자가 매일 확인해야 할 최소 항목은 아래와 같습니다.

- main app와 monitor 접속 가능 여부
- 로그인 가능 여부
- `gridflow-app.service`, `upbit-bot.service`, `orderlens-ops.service` 상태
- 반복 오류나 거래소 인증 오류 여부
- 최근 backup 파일 존재 여부
- 최근 restore verify 성공 여부
- 디스크 용량과 PostgreSQL 상태
- 의도한 전략이 guest / dry / live 중 어떤 모드에서 동작 중인지

## 핵심 서비스와 로그

운영상 핵심 서비스:

- `gridflow-app.service`
- `upbit-bot.service`
- `orderlens-ops.service`
- `nginx.service`
- `postgresql@16-main.service`

주요 로그 위치:

- `journalctl` for app, bot, monitor, nginx, PostgreSQL
- `/home/ubuntu/upbit_bot/bot.log`
- `/home/ubuntu/upbit_bot/monitor.log`
- `/var/log/gridflow_backup.log`
- `/var/log/gridflow_restore_verify.log`
- `/var/log/gridflow_alert.log`

운영자는 장애 시점 전후의 service status와 로그를 먼저 확인해야 합니다. 특히 `invalid_access_key`, 거래소 rate limit, database 연결 오류, permission 오류는 1차 확인 대상입니다.

## Backup and Restore

현재 운영 baseline은 “백업 생성”과 “복구 검증”을 분리해서 봅니다.

### Backup

- backup timer가 정기적으로 PostgreSQL dump를 생성합니다.
- backup 파일 존재만으로 충분하다고 보지 않습니다.

### Restore Verify

- 별도 verify 절차가 운영 DB를 덮어쓰지 않는 방식으로 복구 가능성을 점검합니다.
- 운영자는 최근 backup 성공과 최근 restore verify 성공을 함께 확인해야 합니다.

buyer-facing 해석:

- backup이 있다고 해서 바로 복구 가능한 상태라고 단정하면 안 됩니다.
- restore verify evidence가 함께 있어야 운영상 의미가 있습니다.

## Health Alert

health alert는 서비스와 핵심 엔드포인트를 주기적으로 점검하는 운영 보조 장치입니다.

현재 운영 설명 범위:

- app, bot, monitor, nginx, PostgreSQL 상태 확인
- main app와 monitor HTTP 응답 확인
- webhook 기반 알림 전송

health alert는 전략 로직 자체를 대체하지 않습니다. 운영자가 서비스를 보조적으로 감시하도록 돕는 레이어입니다.

## Emergency Control

source of truth: `EMERGENCY_CONTROL_CONTRACT.md`

### verified backend control path

현재 backend control-plane 기준으로 문서화할 수 있는 제어는 아래입니다.

- Grid strategy pause
- Grid strategy resume
- DCA strategy pause
- DCA strategy resume

이 pause/resume 경로는 integration test로 검증됐습니다. paused 상태에서는 해당 engine one-shot 실행이 submit을 만들지 않고, resume 이후에는 다시 실행 가능한 상태로 돌아갑니다.

### documented operational safeguard

- 프론트의 emergency stop UI는 Grid/DCA 전략 목록을 읽은 뒤 각 전략의 pause route로 fan-out 하는 구조입니다.
- 프론트의 release 동작은 dedicated backend incident release API 호출이 아니라 현재 UI 상태와 strategy resume 절차에 의존합니다.
- 운영 evidence에는 bot runtime의 global emergency stop 흔적이 존재합니다.
- `app/monitor/emergency_stop.py`의 runtime safeguard와 `OPERATIONS_EVIDENCE.md`의 stop/reset evidence는 운영 절차 설명 층위에 둡니다.

- backend control path: Grid/DCA pause/resume verified by integration tests
- runtime safeguard evidence: documented by operations evidence

### not claimed

- dedicated backend emergency release endpoint
- global incident release as a backend feature
- full-system one-click recovery contract

따라서 buyer-facing 설명은 “Grid/DCA pause/resume verified path + separate runtime safeguard evidence”로 해야 정확합니다.

## Monitor as an Operations Aid

monitor는 운영 보조 화면입니다.

현재 buyer-facing으로 설명 가능한 범위:

- 최근 주문 조회
- 최근 활동 조회
- 최근 오류 조회
- 기본 필터 기반 탐색

주의할 점:

- monitor는 main app와 별도 로그인 경계를 가집니다.
- monitor 전체를 완전 read-only 앱이라고 단정하면 과장입니다.
- buyer-facing 화면 증거는 코드/DB/log 근거보다 약합니다.

## 장애 1차 대응

장애가 발생하면 아래 순서로 보는 것이 실용적입니다.

1. 서비스 상태 확인
2. journal과 파일 로그 확인
3. 거래소 API 키 상태 확인
4. 거래소 점검/오류 공지 확인
5. 최근 설정 변경 여부 확인
6. backup / restore verify 상태 확인

지원 요청 전에 정리하면 좋은 정보:

- 발생 시각
- 문제 심볼 또는 전략
- 현재 모드
- 로그 핵심 문구
- 최근 변경 사항

## 운영 문서의 경계

- GridFlow는 운영 보조 시스템과 절차를 제공합니다.
- 시장 판단, 투자금 결정, 24시간 상시 운영 대행은 기본 문서 범위 밖입니다.
- global incident 대응은 일부 runtime safeguard evidence가 있어도, 현재 buyer-facing backend contract와 동일한 수준으로 자동화됐다고 말하지 않습니다.
