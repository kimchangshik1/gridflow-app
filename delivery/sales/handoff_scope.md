# GridFlow Handoff Scope

기준
- 작성 기준: 2026-04-21 UTC
- 원칙: 현재 저장소 문서와 확보된 evidence만 사용
- 상태 표기: `confirmed` / `limited` / `blocked`

재사용 source
- `SUPPORT_SCOPE.md`
- `README.md`
- `DEPLOYMENT.md`
- `DELIVERY_MANIFEST.md`
- `DELIVERY_POLICY.md`
- `sales/one_pager.md`
- `sales/evidence_one_pager.md`
- `GRIDFLOW_RELEASE_EVIDENCE.txt`

## 개요

GridFlow의 기본 거래 기준선은 설치형 제품의 전달, 초기 기동 확인, 운영 문서 handoff까지다. 상시 운영 대행이나 투자 판단 대행은 기본 범위가 아니다.

## 1) 전달 포함 항목

기본 전달 범위에는 아래 항목이 포함된다.

- `confirmed`: 고객 또는 합의된 서버 환경 기준 설치
- `confirmed`: main app, bot, monitor의 기본 기동 확인
- `confirmed`: nginx, HTTPS, systemd, PostgreSQL 기준의 기본 배치와 smoke check 기준 전달
- `confirmed`: backup, restore verify, health alert, log rotation 같은 기본 운영 장치의 설치 기준 전달
- `confirmed`: 운영 런북, 설치 체크리스트, monitor 가이드, buyer-facing 설명 문서 전달
- `confirmed`: 실행에 필요한 최소 파일군 `app/`, `static/`, `ops/`, `requirements-web.txt`와 buyer-facing 문서 세트
- `confirmed`: 실제 secret 원문 대신 필요한 설정 키 이름, 경로, 주입 절차 설명

현재 자료 기준 전달 경계는 아래와 같다.

- `confirmed`: clean delivery set은 “실행에 필요한 최소 파일 + buyer-facing 문서 + sanitized 설정 예시” 방향으로 정리돼 있다.
- `confirmed`: buyer 전달 기본 형식은 clean delivery tarball only다.
- `confirmed`: full history repo는 전달 범위에 포함되지 않는다.
- `confirmed`: history scan 기준 과거 DB credential literal exposure가 있었고, 이 사실은 buyer-facing diligence에서 숨기지 않는다.
- `confirmed`: clean/squash repo는 요청 시 별도 diligence artifact로만 다루며 기본 handoff deliverable이 아니다.
- `blocked`: 실제 운영 secret, `.env`, `.upbit_bot_key`, `/etc/gridflow/*` 원본, backup dump, 내부 debug artifact는 전달 범위에 포함되지 않는다.

## 2) 무료 결함 수정 범위

무상 결함 수정은 납품 범위 안에서 재현 가능하고, buyer가 인수받은 기준선과 직접 충돌하는 문제에 한한다.

- `confirmed`: 전달 문서와 다르게 동작하는 명확한 버그
- `confirmed`: 납품 범위에 포함된 설치 항목 누락
- `confirmed`: 초기 설정 오류로 main app, bot, monitor가 기본 기동하지 않는 문제
- `confirmed`: 합의된 기능 범위 안에서 재현되는 결함

무상 범위로 보지 않는 항목은 아래와 같다.

- `confirmed`: 거래소 정책 변경, API 변경, 주문 거절, 응답 지연
- `confirmed`: 시장 변동과 투자 손익
- `confirmed`: buyer가 직접 변경한 코드, 설정, 서버 환경에서 생긴 문제
- `confirmed`: 외부 인프라 문제
  도메인, DNS, SSL, 방화벽, 클라우드 계정, 네트워크, 서버 자원 부족 포함
- `confirmed`: UI 취향 수정
  색상, 문구 톤, 레이아웃 선호, 탭 순서 같은 변경

## 3) 유상 대응 범위

아래 항목은 기본 handoff 이후 별도 유상 범주로 보는 것이 현재 문서와 가장 잘 맞는다.

- `confirmed`: 신규 기능 추가
- `confirmed`: 기존 기능의 동작 방식 변경
- `confirmed`: 전략 추가 또는 전략 로직 변경
- `confirmed`: UI 구조 변경, 화면 추가, 문구 재작업
- `confirmed`: 서버 운영 지원, 로그 분석, 장애 원인 분석
- `confirmed`: 거래소 API 변경 대응
- `confirmed`: 야간, 주말, 공휴일 대응
- `confirmed`: buyer가 변경한 코드/설정/서버의 복구 지원
- `confirmed`: 환경 차이로 인해 추가 설치 작업이 필요한 경우
  표준 문서 기준에서 벗어난 OS, 네트워크, 보안 정책, 인프라 제약 포함

운영 책임은 아래처럼 분리한다.

- `confirmed`: 설치 지원과 초기 기동 확인은 기본 handoff 범위다.
- `confirmed`: 납품 이후 일상 운영 모니터링, 매매 실행 판단, 중지/재개 판단, 거래소 공지 추적은 buyer 책임이다.

## 4) 제외 범위

기본 거래에서 제외되는 범위는 아래와 같다.

- `confirmed`: 24시간 상시 운영 대행
- `confirmed`: 수익 보장 또는 성과 보장
- `confirmed`: 매매 판단 대행
- `confirmed`: 거래소 정책 변경에 대한 상시 대응
- `confirmed`: 고객 계정 보안 운영과 API 키 lifecycle 관리 대행
- `confirmed`: 외부 인프라의 지속 운영 책임
- `confirmed`: 내부 full repo history, 내부 evidence 원본, debug 메모, patch, 백업 원본, raw 운영 로그 전체 전달
- `confirmed`: clean/squash repo는 필요 시 별도 diligence artifact로만 다루며 기본 handoff deliverable이 아니다.

현재 buyer-facing 설명에서 숨기지 말아야 할 제한도 함께 둔다.

- `limited`: `DRY RUN` 일반 로그인 배지 캡처는 아직 없다.
- `limited`: manual order buyer-facing UI 증거는 guest sandbox 중심이며 live UI-DB 직접 매핑은 아직 없다.
- `limited`: Grid, DCA, Rebalancing의 buyer-facing 전략 UI 캡처는 아직 부족하다.
- `limited`: health alert duplicate suppression은 구조와 일부 검증 기록은 있으나 direct raw proof는 이번 자료에서 제한적이다.
- `blocked`: monitor buyer-facing 캡처, emergency stop/release UI 캡처, Rebalancing live confirmed 사례는 현재 자료 기준으로 비어 있다.

## buyer 책임 경계

buyer가 직접 관리해야 하는 항목은 아래와 같다.

- 서버 계정과 비용
- 도메인, DNS, SSL 소유와 갱신
- 거래소 계정 보안과 API 키 발급/폐기
- 운영 모니터링과 백업 보관 확인
- 전략 파라미터 검토
- 투자금 규모와 실행 여부 결정
- 거래소 점검/정책 변경 확인

## OPEN

- OPEN: warranty window와 maintenance term은 아직 고정되지 않았다.
- OPEN: SLA와 response-time commitment는 아직 고정되지 않았다.
