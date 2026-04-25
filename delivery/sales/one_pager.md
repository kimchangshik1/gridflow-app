# GridFlow One-Pager

기준
- 작성 기준: 2026-04-21 UTC
- 원칙: 현재 저장소 문서와 확보된 evidence만 사용
- 표기 규칙: `confirmed` / `limited` / `blocked`

재사용 source
- `README.md`
- `AUTH_MODE_EVIDENCE.md`
- `MANUAL_ORDER_EVIDENCE.md`
- `STRATEGY_EVIDENCE.md`
- `OPERATIONS_EVIDENCE.md`
- `DEPLOYMENT.md`
- `GRIDFLOW_RELEASE_EVIDENCE.txt`
- `sales/evidence_one_pager.md`

## 제품 개요

GridFlow는 고객 서버 또는 합의된 서버 환경에 설치해 전달하는 설치형 자동매매 및 운영 보조 시스템이다. 현재 문서 기준 기본 구성은 메인 웹 앱, 백그라운드 봇, 별도 monitor 화면, nginx, 로컬 PostgreSQL이다.

- `confirmed`: 설치형 제품 구조와 기본 납품 범위는 `README.md`, `DEPLOYMENT.md`에 정리돼 있다.
- `confirmed`: 메인 앱은 사용자 UI와 API를 제공하고, 봇은 전략 실행을 담당하며, monitor는 최근 주문/활동/오류 관측 보조 화면으로 설명된다.
- `limited`: monitor 전체 앱을 완전 read-only로 단정할 수는 없다. 현재 안전하게 설명 가능한 범위는 최근 orders/activity/error/filter 관측 기능이다.

## 지원 거래소 / 전략 / 모드

거래소
- `confirmed`: Upbit
- `confirmed`: Bithumb

전략 / 기능
- `confirmed`: 수동 주문
- `confirmed`: Grid
- `confirmed`: DCA
- `limited`: Rebalancing
  현재 확보 근거는 `dry-run confirmed + trigger/code trace` 중심이며 live confirmed 사례는 아직 없다.

모드
- `confirmed`: `GUEST`
- `confirmed`: `LIVE`
- `limited`: `DRY RUN`
  코드상 분기와 sandbox 경로는 확인되지만, buyer-facing 일반 로그인 배지 캡처는 아직 없다.

## 실전 운영 근거 요약

- `confirmed`: 메인 앱 인증은 cookie 기반 세션 모델이며 `/auth/me` 경로로 세션 복원이 설명된다.
- `confirmed`: `GUEST` 배지, 로그아웃 후 오버레이 복귀, 새로고침 후 세션 유지, 로그인 실패 UI, `LIVE` 배지 캡처가 있다.
- `limited`: `GUEST / DRY RUN / LIVE` 3모드 화면 세트는 아직 완결되지 않았다. `DRY RUN` 캡처가 비어 있다.
- `confirmed`: Upbit/Bithumb manual BUY/SELL 성공 근거가 각각 DB와 활동 로그, 상태 전이 로그로 정리돼 있다.
- `confirmed`: guest sandbox 기준 Upbit/Bithumb BUY/SELL buyer-facing UI 캡처와 runtime JSON, sanitized DB raw bridge가 있다.
- `limited`: manual order의 buyer-facing UI 캡처는 guest sandbox 기준이다. live 주문의 UI-DB 직접 매핑과 잔액 before/after는 아직 없다.
- `confirmed`: Grid는 최신 1사이클 근거 1건, DCA는 사용자 키 라우팅이 걸린 실행 근거 1건이 있다.
- `limited`: Grid/DCA/Rebalancing은 buyer-facing 전략 UI 캡처가 부족하다.
- `confirmed`: 백업 dump 존재, restore verify 성공, health alert 구조, emergency stop 발동 근거가 문서와 로그 기준으로 정리돼 있다.
- `limited`: health alert duplicate suppression direct raw proof와 최신 stop 이후 release pair는 아직 완전히 닫히지 않았다.

## 설치형 제품 근거 요약

- `confirmed`: 배포 모델은 고객 또는 합의된 서버 환경 설치형으로 정리돼 있다.
- `confirmed`: 기준 배치 경로는 `/home/ubuntu/upbit_bot`, Python 가상환경은 `/home/ubuntu/upbit_bot/venv`, 런타임 설정 경로는 `/etc/gridflow`다.
- `confirmed`: systemd 기준 서비스는 `gridflow-app.service`, `upbit-bot.service`, `orderlens-ops.service`다.
- `confirmed`: 운영 타이머는 `gridflow-pg-backup.timer`, `gridflow-health-alert.timer`다.
- `confirmed`: 설치 직후 smoke check 기준으로 app `200`, monitor 진입 `302`, 서비스/타이머 `enabled` / `active` 기대값이 문서화돼 있다.
- `limited`: blank DB의 admin bootstrap 정책, `tradingbot` 초기화 명령, nginx site 생성 명령은 buyer-facing 문서에서 아직 `OPEN` 상태다.

## buyer에게 보여줄 핵심 가치

1. 설치형 전달 구조
고객 서버 기준 배치 경로, systemd 서비스, nginx, PostgreSQL, smoke check 기준이 문서로 정리돼 있어 “설치형 제품”으로 설명 가능하다.

2. 실거래와 sandbox 경계가 분리된 운영 모델
guest와 dry-run 주문은 sandbox 경로로 분기되고, live는 일반 주문/전략 경로로 분리된다.

3. 거래소와 전략 범위가 문서로 고정돼 있음
Upbit/Bithumb, manual order, Grid, DCA, Rebalancing 범주가 buyer-facing 문서에서 일관되게 설명된다.

4. 운영 보조 체계가 함께 제공됨
최근 주문/활동 관측용 monitor, 자동 백업, 복구 검증, health alert 구조가 함께 정리돼 있다.

5. 과장하지 않는 증거 경계
확보된 항목은 `confirmed`, 보강이 필요한 항목은 `limited`, 현재 안전 경로가 없는 항목은 `blocked`로 구분해 buyer 실사 시 설명할 수 있다.

## 현재 blocked 항목

- `blocked`: `DRY RUN` 일반 로그인 배지 캡처
- `blocked`: live manual order의 buyer-facing UI-DB 직접 매핑 캡처
- `blocked`: Grid / DCA / Rebalancing buyer-facing UI 캡처
- `blocked`: monitor buyer-facing 화면 캡처
