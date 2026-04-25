# GridFlow Support Scope

## 기본 성격

GridFlow의 기본 제공 형태는 설치, 초기 기동 확인, 인수인계입니다. 기본 범위는 install-and-handoff이며, 상시 운영 대행 계약을 기본값으로 두지 않습니다.

## 기본 납품 범위

현재 buyer-facing 기준 기본 납품 범위는 아래와 같습니다.

- 고객 또는 합의된 서버 환경에 설치
- main app, bot runtime, monitor 기본 기동 확인
- nginx, PostgreSQL, systemd/timer 기본 구성 확인
- 운영 문서와 handoff 문서 전달
- backup / restore verify / health alert 같은 기본 운영 장치 반영

## 소스 전달 경계

buyer에게 전달하는 기본 소스 자산은 clean delivery tarball 기준입니다.

- full history repo는 기본 전달 범위가 아닙니다.
- clean delivery tarball에 포함된 코드, install 자산, buyer-facing 문서만 handoff 기준으로 봅니다.
- clean/squash repo가 필요하면 별도 diligence artifact로만 다룹니다.
- history scan 기준 과거 credential exposure가 있었으므로 history 자체를 buyer deliverable처럼 설명하지 않습니다.
- 이 history exposure 사실은 buyer-facing diligence에서 숨기지 않고 직접 고지합니다.

## 현재 검증 범위를 기준으로 본 지원 구분

### Verified by integration tests

아래 범위는 현재 자동 검증이 있으므로, 명확한 재현 조건이 있으면 무상 결함 수정 판단이 가장 쉽습니다.

- auth login, `/auth/me`, logout
- guest / dry / live 구분
- API key 저장 및 적용
- Upbit manual BUY / SELL
- Bithumb manual BUY / SELL
- Grid 1 cycle execution path
- DCA 1 cycle execution path
- Grid/DCA pause/resume backend control path
- Rebalancing `BUY_ONLY` 1 cycle on trigger-reading `run_once` path

### Documented by evidence

아래 범위는 운영 증거와 내부 evidence가 있으나, integration baseline과 같은 강도로 자동화된 범위는 아닙니다.

- 배포 후 smoke check와 기본 운영 절차
- backup 생성과 restore verify evidence
- monitor 운영 관측 경로
- 일부 runtime emergency stop evidence
- 일부 live manual/strategy 운영 증거

### Limited / out of current verified scope

아래 항목은 현재 기본 지원 설명에서 제한적으로 다루거나, 별도 유상 범위로 분리하는 것이 맞습니다.

- Rebalancing `SELL`
- Rebalancing `BOTH`
- Rebalancing fill-complete verification
- portfolio final reconciliation
- `rebalance-now` force path를 포함한 전체 rebalancing 운영 검증
- buyer-facing monitor UI 완전 증거 세트
- `DRY RUN` 일반 로그인 배지의 buyer-facing 캡처
- 거래소 정책 변경이나 외부 API 변경 대응

## 무상 결함 수정 범위

무상 결함 수정은 아래 조건을 충족하는 경우에 한합니다.

- 납품 문서와 다르게 동작하는 명확한 버그
- 기본 납품 범위에 포함된 설치 또는 설정의 누락
- 현재 verified baseline 안에서 재현 가능한 결함
- 인수 시 합의한 기능 범위 안의 재현 가능한 오류

무상 범위에 자동으로 포함되지 않는 예:

- 투자 손익 보정
- 시장 상황에 따른 전략 결과
- buyer 운영 판단의 결과
- buyer가 임의로 바꾼 코드, 설정, 서버 환경 문제
- limited 또는 evidence-only 범위를 verified baseline처럼 확장해 달라는 요청

## 유상 대응이 필요한 경우

- 신규 기능 추가
- 전략 로직 변경
- UI/문구/흐름 변경
- 거래소 API 변경 대응
- 운영 분석과 로그 포렌식
- 야간/주말/공휴일 대응
- 서버 이전, 재설치, 대규모 환경 변경
- verified baseline 밖의 기능을 제품 범위로 끌어올리는 작업

## Buyer 책임

- 서버와 계정 관리
- 도메인, DNS, SSL 관리
- 거래소 계정과 API 키 보안 관리
- 전략 설정과 투자금 판단
- 일상 운영 모니터링
- 거래소 정책 변경 및 점검 확인
- backup 보관 상태 확인

## 지원 요청 전에 준비하면 좋은 정보

- 발생 시각
- 영향받은 거래소와 심볼
- 현재 모드
- 관련 전략 또는 주문 ID
- 화면 또는 로그 핵심 문구
- 최근 설정 변경 사항

## buyer-facing으로 과장하지 않는 원칙

- integration-verified 범위와 evidence-only 범위를 섞지 않습니다.
- Rebalancing은 현재 BUY_ONLY 1 cycle verified 범위까지만 기본 지원 설명에 넣습니다.
- emergency release는 전용 backend endpoint가 있는 것처럼 지원 범위를 설명하지 않습니다.
