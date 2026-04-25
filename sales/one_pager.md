# GridFlow One-Pager

기준
- 작성 기준: 2026-04-25 UTC
- 원칙: initial buyer-facing pack의 strongest set만 사용
- 표기 규칙: `confirmed` / `limited` / `blocked`

재사용 source
- `README.md`
- `DELIVERY_POLICY.md`
- `SUPPORT_SCOPE.md`
- `AUTH_MODE_EVIDENCE.md`
- `MANUAL_ORDER_EVIDENCE.md`
- `sales/guest_sandbox_proof_bundle.md`
- `OPERATIONS_EVIDENCE.md`
- `DEPLOYMENT.md`
- `sales/evidence_show_now_bundle_index.md`

## 제품 개요

GridFlow는 고객 서버 또는 합의된 서버 환경에 설치해 전달하는 설치형 자동매매 및 운영 보조 시스템이다. 현재 buyer-facing 기준 기본 구성은 메인 웹 앱, 백그라운드 봇, 별도 monitor 화면, nginx, 로컬 PostgreSQL이다.

- `confirmed`: 설치형 제품 구조와 기본 납품 범위는 `README.md`, `DEPLOYMENT.md`, `SUPPORT_SCOPE.md`에 정리돼 있다.
- `confirmed`: buyer 기본 전달 형식은 clean delivery tarball only다.
- `confirmed`: full history repo는 non-deliverable이다.
- `limited`: monitor 전체 앱을 완전 read-only로 단정할 수는 없다. 현재 show-now 기준으로 안전하게 설명 가능한 범위는 recent orders/activity/error/filter 관측 기능이다.

## 지원 거래소 / 기능 / 모드

거래소
- `confirmed`: Upbit
- `confirmed`: Bithumb

기능
- `confirmed`: 수동 주문
- `confirmed`: guest sandbox proof
- `confirmed`: backup / restore verify / health alert / monitor read-oriented operations view
- `limited`: Grid / DCA / Rebalancing detailed evidence는 initial show-now set이 아니라 diligence-only로 분리한다.

모드
- `confirmed`: `GUEST`
- `confirmed`: `LIVE`
- `limited`: `DRY RUN`
  코드상 분기와 sandbox 경로는 설명 가능하지만 buyer-facing 일반 로그인 배지 캡처는 아직 없다.

## initial show-now에서 바로 설명 가능한 근거

- `confirmed`: 메인 앱 인증은 cookie 기반 세션 모델이며 `/auth/me` 경로로 세션 복원이 설명된다.
- `confirmed`: `GUEST` 배지, 로그아웃 후 오버레이 복귀, 새로고침 후 세션 유지, 로그인 실패 UI, `LIVE` 배지 캡처가 있다.
- `confirmed`: Upbit/Bithumb manual BUY/SELL 성공 근거가 DB와 활동 로그, 상태 전이 로그로 정리돼 있다.
- `confirmed`: guest sandbox 기준 Upbit/Bithumb BUY/SELL buyer-facing UI 캡처, runtime JSON, sanitized DB bridge가 있다.
- `limited`: manual order의 buyer-facing UI 캡처는 guest sandbox 기준이다. live 주문의 UI-DB 직접 매핑과 before/after는 아직 없다.
- `confirmed`: backup dump 존재, restore verify 성공, health alert 구조, emergency stop documented safeguard가 문서와 로그 기준으로 정리돼 있다.
- `limited`: health alert duplicate suppression direct raw proof와 latest stop 이후 release pair는 initial show-now 근거가 아니다.

## buyer에게 먼저 보여줄 4가지

1. 설치형 전달 구조
고객 서버 기준 배치 경로, systemd 서비스, nginx, PostgreSQL, smoke check 기준이 문서로 정리돼 있어 설치형 제품으로 설명 가능하다.

2. 실거래와 sandbox 경계 분리
guest는 sandbox proof bundle로, live manual 성공은 DB/log 근거로 분리해 설명한다. 두 경로를 섞어 과장하지 않는다.

3. 운영 보조 체계 포함
최근 주문/활동 관측용 monitor, 자동 백업, 복구 검증, health alert 구조가 함께 정리돼 있다.

4. 과장하지 않는 증거 경계
확보된 항목은 `confirmed`, 보강이 필요한 항목은 `limited`, 현재 안전 경로가 없는 항목은 `blocked`로 구분해 buyer 실사에 바로 쓸 수 있다.

## 현재 blocked 항목

- `blocked`: `DRY RUN` 일반 로그인 배지 캡처
- `blocked`: live manual order의 buyer-facing UI-DB 직접 매핑 캡처
- `blocked`: Grid / DCA / Rebalancing buyer-facing UI 캡처
- `blocked`: monitor buyer-facing 화면 캡처

## show_now 원칙

- initial buyer-facing pack은 `AUTH_MODE_EVIDENCE.md`, `MANUAL_ORDER_EVIDENCE.md`, `sales/guest_sandbox_proof_bundle.md`, `OPERATIONS_EVIDENCE.md` 축으로 설명한다.
- strategy drill-down, raw binder, release evidence는 initial one-pager 근거로 섞지 않고 요청 시 diligence-only로 분리한다.
