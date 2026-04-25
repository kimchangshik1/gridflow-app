# GridFlow Demo Script

기준
- 작성 기준: 2026-04-21 UTC
- 원칙: 현재 저장소 문서와 evidence만 사용
- 목표 길이: 3~5분
- 표기 규칙: `confirmed` / `limited` / `blocked`

재사용 source
- `sales/evidence_one_pager.md`
- `AUTH_MODE_EVIDENCE.md`
- `MANUAL_ORDER_EVIDENCE.md`
- `STRATEGY_EVIDENCE.md`
- `OPERATIONS_EVIDENCE.md`
- `DEPLOYMENT.md`
- `README.md`

## 데모 전 준비 체크

- `sales/one_pager.md`를 열어 제품 개요, 지원 범위, 핵심 가치가 한 화면에 보이게 준비한다.
- `AUTH_MODE_EVIDENCE.md`에서 `GUEST` / `LIVE` 증거와 `DRY RUN limited` 문구가 보이게 준비한다.
- `MANUAL_ORDER_EVIDENCE.md`에서 guest sandbox BUY/SELL 캡처와 runtime JSON 식별 단서가 보이게 준비한다.
- `STRATEGY_EVIDENCE.md`에서 Grid, DCA, Rebalancing 판정 줄이 바로 보이게 준비한다.
- `OPERATIONS_EVIDENCE.md`와 `DEPLOYMENT.md`를 열어 백업/복구/monitor/read-only 범위와 설치형 배포 모델이 바로 보이게 준비한다.
- 가능하면 네트워크나 실거래 의존 화면 대신 문서와 확보 캡처 중심으로 진행한다.

## 3~5분 데모 흐름

### 1. 제품 개요와 납품 모델

- 클릭: `sales/one_pager.md`
- 설명: GridFlow가 고객 서버 또는 합의된 서버 환경에 설치해 전달되는 설치형 자동매매 및 운영 보조 시스템임을 먼저 설명한다.
- 보여줄 화면: 제품 개요, 지원 거래소/전략/모드, 핵심 가치 섹션
- 무엇을 증명하는지: 제품이 SaaS 운영대행이 아니라 설치형 납품물이라는 점을 먼저 고정한다.

### 2. 인증과 모드 경계

- 클릭: `AUTH_MODE_EVIDENCE.md`
- 설명: cookie 기반 세션, guest는 dry-run 강제, live는 별도 경로라는 구조를 짧게 설명한다.
- 보여줄 화면 순서:
  1. `GUEST` 배지 캡처
  2. 로그아웃 후 오버레이 복귀 캡처
  3. 새로고침 후 세션 유지 캡처
  4. 로그인 실패 UI 캡처
  5. `LIVE` 배지 캡처
- 보조 멘트: `DRY RUN`은 코드와 sandbox 분기는 확인됐지만 buyer-facing 일반 로그인 배지 캡처는 아직 `limited`라고 명시한다.
- 무엇을 증명하는지: 인증과 모드가 문서가 아니라 실제 런타임 근거와 함께 설명 가능하다는 점을 보여준다.

### 3. 수동 주문 흐름

- 클릭: `MANUAL_ORDER_EVIDENCE.md`
- 설명: buyer-facing 데모에서는 실패 확률이 낮은 guest sandbox 흐름을 우선 보여주고, live 성공 근거는 DB/log 문서로 보강한다고 설명한다.
- 보여줄 화면 순서:
  1. Upbit guest sandbox BUY 캡처
  2. Upbit guest sandbox SELL 캡처
  3. Bithumb guest sandbox BUY/SELL 요약 구간
  4. runtime JSON의 `sandbox: true`, `FILLED`, `id` 단서
  5. live success row 설명 구간
- 보조 멘트: live 주문의 buyer-facing UI-DB 직접 매핑은 아직 `blocked`이며, 현재는 guest sandbox UI와 live DB/log를 분리해 설명하는 것이 정확하다고 말한다.
- 무엇을 증명하는지: 두 거래소 모두에서 주문 경로와 상태 반영 구조를 설명할 수 있다는 점을 보여준다.

### 4. 전략 범위와 현재 증거 수준

- 클릭: `STRATEGY_EVIDENCE.md`
- 설명: Grid와 DCA는 실행 근거가 있고, Rebalancing은 현재 dry-run confirmed 수준임을 과장 없이 설명한다.
- 보여줄 화면 순서:
  1. Grid 요약
  2. DCA 요약
  3. Rebalancing 요약
- 보조 멘트: 전략 UI 캡처는 아직 부족하므로 이 단계는 “현재 무엇이 confirmed이고 무엇이 limited인지”를 보여주는 용도로 쓴다.
- 무엇을 증명하는지: 전략 범위를 숨기지 않고, 증거 강도까지 구분해 설명하는 제품이라는 점을 보여준다.

### 5. 설치형 운영 체계

- 클릭: `DEPLOYMENT.md`, 이어서 `OPERATIONS_EVIDENCE.md`
- 설명: 서비스 구성, 설치 경로, smoke check, 백업/복구/알림/monitor 구조를 짧게 연결해서 보여준다.
- 보여줄 화면 순서:
  1. 배포 모델과 경로
  2. systemd 서비스와 타이머
  3. smoke check 기대값
  4. backup / restore confirmed
  5. monitor recent orders/activity/error/filter read-only 범위
- 보조 멘트: health alert duplicate suppression과 monitor buyer-facing 캡처는 현재 `limited` 또는 `blocked`로 유지한다고 명시한다.
- 무엇을 증명하는지: 단순 주문 화면이 아니라 설치와 운영 보조 체계까지 포함된 제품이라는 점을 보여준다.

## 진행 원칙

- 실거래 재현보다 이미 확보된 guest sandbox 캡처와 문서 증거를 우선 보여준다.
- `confirmed`와 `limited`를 같은 화면에서 함께 보여 과장 없이 설명한다.
- `blocked` 항목은 감추지 말고 현재 안전한 재현 경로가 없다고 짧게 말한다.
