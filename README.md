# GridFlow

## 제품 개요

GridFlow는 고객 또는 합의된 서버 환경에 설치해 인수하는 설치형 자동매매 및 운영 보조 시스템입니다. 현재 buyer-facing 기준으로 설명 가능한 구성은 메인 웹 앱, 백그라운드 bot runtime, 분리된 monitor 화면, PostgreSQL 저장소, nginx/systemd 기반 운영 환경입니다.

GridFlow는 managed trading desk가 아니라 install-and-handoff 제품입니다. 기본 납품 범위는 설치, 기본 실행 환경 구성, 핵심 서비스 기동 확인, 운영 문서 전달까지입니다. 일상 모니터링 대행, 수익 보장, 상시 운영 대행은 기본 범위에 포함되지 않습니다.

## 현재 지원 범위

### 거래소

- Upbit
- Bithumb

### 전략

- Manual order
- Grid
- DCA
- Rebalancing

### 모드

- Guest
- Dry run
- Live

## 현재 검증 기준

### Verified by integration tests

- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- guest / dry / live 구분
- 사용자 API 키 저장 및 적용
- Upbit manual BUY / SELL
- Bithumb manual BUY / SELL
- Grid 1 cycle execution path
- DCA 1 cycle execution path
- Grid/DCA pause/resume 기반 backend control path
- Rebalancing `BUY_ONLY` 1 cycle on trigger-reading `run_once` path

### Documented by evidence

- 배포 후 smoke check와 monitor 기본 기동
- backup 생성과 restore verify 운영 절차
- 일부 live 운영 사례와 sales/demo용 증거 세트

### Limited / hold

- `DRY RUN` 일반 로그인 배지의 buyer-facing 화면 증거
- Rebalancing `SELL` / `BOTH`
- Rebalancing fill-complete 검증과 최종 포트폴리오 정렬 검증
- 완전한 buyer-facing monitor 화면 증거

## 표준 검증 명령

개발 환경 또는 배포 후 검증 환경에서 현재 integration baseline을 확인하는 표준 명령은 아래와 같습니다.

```bash
GRIDFLOW_TEST_DB_URL="$(sudo -n sed -n 's/^DB_URL=//p' /etc/gridflow/gridflow.env)" ./venv/bin/python -m pytest -q tests/integration
```

이 명령은 현재 자동 검증 범위를 확인하는 용도입니다. 모든 기능의 완전한 운영 보증을 뜻하지는 않습니다.

## 문서 안내

| Document | Purpose |
| --- | --- |
| `README.md` | 제품 개요, 현재 지원 범위, 검증 기준 요약 |
| `ARCHITECTURE.md` | main app, bot runtime, monitor, DB, nginx, timer 구조 |
| `DEPLOYMENT.md` | 설치 전제, 환경 계약, 서비스 등록, smoke check |
| `OPERATIONS.md` | 일상 점검, 백업/복구, health alert, control-plane 운영 |
| `SECURITY.md` | auth/session 구조, 상태 변경 보호선, secret 및 경계 |
| `API.md` | 주요 auth, 주문, 전략, monitor API 개요 |
| `CHANGELOG.md` | 최근 buyer-facing 기준 변화와 검증 범위 업데이트 |
| `KNOWN_LIMITATIONS.md` | 숨기지 말아야 할 현재 구조적 제약 |
| `SUPPORT_SCOPE.md` | 기본 납품 범위, 무상 수정 범위, 유상 대응 경계 |

## Buyer가 먼저 이해해야 할 점

- live manual order는 요청 즉시 실거래소에 바로 제출되지 않습니다.
- live manual order는 먼저 `planned_orders`와 관련 상태 기록을 만들고, 이후 user bot/gateway가 거래소 제출을 수행합니다.
- Grid와 DCA는 현재 “1 cycle execution path verified” 수준으로 설명하는 것이 정확합니다.
- Rebalancing은 현재 “`BUY_ONLY` 1 cycle on trigger-reading `run_once` path verified” 수준으로 설명해야 합니다.
- emergency control은 전용 backend global release endpoint가 아니라, 현재 backend 기준 Grid/DCA pause/resume control path와 UI fan-out 구조로 설명해야 합니다.
