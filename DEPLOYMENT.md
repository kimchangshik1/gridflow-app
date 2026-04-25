# GridFlow Deployment

## 배포 모델

GridFlow는 고객 또는 합의된 서버 환경에 설치하는 형태를 전제로 합니다. 현재 buyer-facing 기준 기본 배치 모델은 아래와 같습니다.

- source root: `/home/ubuntu/upbit_bot`
- Python virtualenv: `/home/ubuntu/upbit_bot/venv`
- runtime env/config: `/etc/gridflow`
- local PostgreSQL
- nginx reverse proxy
- systemd services and timers

## 환경 계약

현재 외부 문서 기준 기본 runtime contract는 `/etc/gridflow/gridflow.env`입니다.

핵심 전제:

- `DB_URL`이 유효해야 합니다.
- app, bot, monitor가 같은 PostgreSQL에 접근할 수 있어야 합니다.
- monitor는 별도 JSON 설정 파일을 사용합니다.
- nginx가 외부 트래픽을 main app와 monitor로 분기해야 합니다.

주요 경로:

- main env: `/etc/gridflow/gridflow.env`
- monitor config: `/etc/gridflow/monitor_config.json`
- monitor auth: `/etc/gridflow/monitor_auth.json`
- nginx site: `/etc/nginx/sites-available/gridflow`
- systemd unit/timer: `/etc/systemd/system`

## 데이터베이스와 스키마

GridFlow는 PostgreSQL을 필수로 사용합니다. 현재 제품 문서 기준 운영 DB는 `upbit_bot` 계열 스키마를 전제로 하며, app와 bot runtime 모두 DB에 직접 의존합니다.

배포 시 확인할 점:

- PostgreSQL이 local 또는 합의된 연결 지점에서 응답하는지
- 앱 계정이 읽기/쓰기 가능한지
- 배포 대상 스키마가 현재 코드 기준과 맞는지

## 서비스 구성

현재 기본 서비스 구성은 아래와 같습니다.

- `gridflow-app.service`
- `upbit-bot.service`
- `orderlens-ops.service`
- `gridflow-pg-backup.timer`
- `gridflow-health-alert.timer`

nginx는 아래 역할을 가집니다.

- `80 -> 443` redirect
- `/` -> main app
- `/monitor` -> monitor app

## 기본 설치 순서

1. source tree를 `/home/ubuntu/upbit_bot`에 배치합니다.
2. virtualenv와 Python 패키지를 준비합니다.
3. `/etc/gridflow` 아래 runtime 파일을 배치합니다.
4. PostgreSQL 연결과 대상 스키마를 확인합니다.
5. systemd unit/timer와 nginx site를 설치합니다.
6. 서비스와 타이머를 활성화합니다.
7. smoke check와 integration baseline check를 수행합니다.

## Smoke Check

설치 직후 buyer 또는 운영자가 먼저 확인해야 할 항목은 아래와 같습니다.

### 서비스와 타이머 상태

```bash
systemctl is-enabled gridflow-app.service upbit-bot.service orderlens-ops.service
systemctl is-active gridflow-app.service upbit-bot.service orderlens-ops.service
systemctl is-enabled gridflow-pg-backup.timer gridflow-health-alert.timer
systemctl is-active gridflow-pg-backup.timer gridflow-health-alert.timer
```

### 로컬 엔드포인트 확인

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8010/monitor
```

기대 결과:

- app, bot, monitor service가 `active`
- backup/health timer가 `active`
- main app root가 응답
- monitor 진입 경로가 로그인 또는 redirect 동작

### 외부 진입 확인

- HTTPS 접속 가능 여부
- 인증서 경고 여부
- `80 -> 443` redirect 여부
- `/monitor` 진입 가능 여부

## 표준 자동 검증 명령

현재 설치 후 또는 개발 검증 단계에서 사용할 표준 integration test 명령은 아래와 같습니다.

```bash
GRIDFLOW_TEST_DB_URL="$(sudo -n sed -n 's/^DB_URL=//p' /etc/gridflow/gridflow.env)" ./venv/bin/python -m pytest -q tests/integration
```

이 명령은 현재 자동 검증 범위를 빠르게 확인하는 기준선입니다. 배포 자체, SSL, 거래소 계정 상태, buyer 운영 판단까지 모두 대신하지는 않습니다.

## 설치 후 buyer가 확인해야 할 것

- 로그인과 세션이 정상 동작하는지
- 의도한 모드가 guest / dry / live 중 어떤 상태인지
- 저장한 API 키가 해당 사용자와 거래소에 적용되는지
- main app, bot, monitor가 함께 기동하는지
- backup과 restore verify 체계가 준비돼 있는지
- 운영자가 pause/resume과 기본 모니터링 경로를 이해했는지

## 배포 문서의 경계

- 이 문서는 실제 secret 값을 포함하지 않습니다.
- buyer-facing 문서이므로 내부 실행 카드와 동일한 상세 스크립트 집합을 그대로 노출하지 않습니다.
- 배포 후 전략 운영 책임과 시장 리스크 판단은 별도 지원 범위로 분리됩니다.
