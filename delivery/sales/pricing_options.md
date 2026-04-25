# GridFlow Pricing Options

기준
- 작성 기준: 2026-04-21 UTC
- 원칙: 숫자는 확정 근거가 없으면 쓰지 않음
- 상태 표기: `confirmed` / `limited` / `blocked`
- 기준선 문서: `sales/handoff_scope.md`

재사용 source
- `sales/handoff_scope.md`
- `SUPPORT_SCOPE.md`
- `DELIVERY_MANIFEST.md`
- `DELIVERY_POLICY.md`
- `DEPLOYMENT.md`
- `sales/one_pager.md`

## 개요

아래 옵션 차이는 제품 완성도 차이가 아니라 지원 범위, handoff 깊이, 문서화 범위, 결함 대응 범위의 차이다. 핵심 기능 범위를 “싸서 덜 완성된 것”처럼 나누지 않고, buyer가 실제로 필요한 지원 강도를 기준으로 구분한다.

가격 표기
- `PRICE_TIER_A`: 최고안
- `PRICE_TIER_B`: 실수요 대응안
- `PRICE_TIER_C`: 빠른 거래용 안
- `OPEN`: 현재 저장소 문서에는 확정 금액 근거가 없어 실제 숫자는 별도 합의가 필요하다.

## 옵션 비교

| 항목 | 최고안 | 실수요 대응안 | 빠른 거래용 안 |
| --- | --- | --- | --- |
| 옵션 라벨 | `PRICE_TIER_A` | `PRICE_TIER_B` | `PRICE_TIER_C` |
| 기본 설치 | 포함 | 포함 | 포함 |
| 초기 기동 확인 | 포함 | 포함 | 포함 |
| handoff 문서 세트 | 전체 buyer-facing 문서 세트 | 핵심 문서 세트 | 최소 설치/운영 문서 세트 |
| 인수인계 깊이 | 상세 | 표준 | 최소 |
| 무상 결함 수정 범위 | 기준선 + 초기 안정화 확인 중심 | 기준선 범위 | 기준선 최소 범위 |
| 운영 질의 응답 | 가장 넓음 | 표준 | 최소 |
| 환경 차이 대응 | 더 넓게 포함 가능 | 표준 범위 | 기본 경로 기준 |
| 유상 전환 시점 | 가장 늦음 | 표준 | 가장 빠름 |
| 적합 buyer | 내부 운영팀이 바로 받는 경우 | 일반적인 설치형 buyer | 빠른 계약/빠른 handoff가 필요한 경우 |

## 1) 최고안

추천 상황
- buyer가 설치형 제품은 원하지만, 초기 인수인계와 문서 설명을 넓게 받고 싶은 경우
- buyer 내부 운영팀이 처음 받는 구조라 질문 대응 범위를 넓게 두고 싶은 경우

포함
- `confirmed`: 기본 설치, 기동 확인, smoke check
- `confirmed`: buyer-facing 문서 세트 전체 전달
  one-pager, demo script, handoff scope, due diligence FAQ 포함
- `confirmed`: 설치 경로, 서비스 구조, 운영 점검 포인트의 상세 handoff
- `confirmed`: 결함 여부 판단을 위한 초기 질의응답 범위를 상대적으로 넓게 잡는 구조
- `limited`: clean repo / tarball 최종 형식은 별도 합의가 필요하다.

제외
- `confirmed`: 24/7 운영 대행
- `confirmed`: 수익 보장, 매매 판단 대행
- `confirmed`: 거래소 정책 변경 상시 대응
- `confirmed`: 신규 기능 추가, UI 취향 수정, 전략 로직 변경

지원 기간
- `OPEN`: 저장소 문서에는 warranty window와 maintenance term 숫자 근거가 없다.

인수인계 범위
- 제품 개요
- 설치 경로와 서비스 구조
- 기본 운영 체크
- evidence 경계
- buyer 책임과 유상 전환 기준

문서 포함 범위
- 가장 넓은 buyer-facing 문서 세트

결함 수정 범위
- `sales/handoff_scope.md`의 무상 결함 수정 범위를 기준으로 하되, 초기 안정화 질의응답을 더 넓게 소화하는 안으로 설명한다.

## 2) 실수요 대응안

추천 상황
- buyer가 가장 일반적인 설치형 인수 구조를 원하는 경우
- 설치와 handoff는 필요하지만 과도한 확장 지원까지는 필요하지 않은 경우

포함
- `confirmed`: 기본 설치, 기동 확인, smoke check
- `confirmed`: 설치/운영/지원 범위를 설명하는 핵심 문서 세트
- `confirmed`: 표준 handoff
- `confirmed`: 기준선 범위의 무상 결함 수정

제외
- `confirmed`: 최고안에서 기대할 수 있는 확장형 설명/응답 범위 일부
- `confirmed`: 상시 운영 대행
- `confirmed`: 전략 변경, 기능 추가, UI 재작업

지원 기간
- `OPEN`: 문서상 확정 기간 없음

인수인계 범위
- 표준 handoff 범위
- buyer가 직접 1차 운영을 시작할 수 있는 수준

문서 포함 범위
- 핵심 buyer-facing 문서 세트

결함 수정 범위
- 문서와 다르게 동작하는 명확한 버그, 설치 누락, 초기 설정 오류 등 기준선 범위

## 3) 빠른 거래용 안

추천 상황
- buyer가 빠르게 설치형 납품과 최소 handoff를 받고 싶은 경우
- 내부 운영팀이 이미 있고, 설치형 기준선만 명확하면 되는 경우

포함
- `confirmed`: 기본 설치
- `confirmed`: 서비스 기동 확인
- `confirmed`: 최소 운영 문서와 설치 기준 전달
- `confirmed`: 기준선 범위의 최소 무상 결함 수정

제외
- `confirmed`: 확장형 문서화
- `confirmed`: 넓은 운영 질의응답 범위
- `confirmed`: 환경 차이 대응을 기본 제공으로 보지 않음
- `confirmed`: 전략 변경, UI 수정, 추가 기능, 장애 분석 심화 대응

지원 기간
- `OPEN`: 문서상 확정 기간 없음

인수인계 범위
- 최소 handoff
- 설치 경로, 서비스명, 기본 점검 기준 중심

문서 포함 범위
- 최소 설치/운영 기준 문서

결함 수정 범위
- 납품 직후 기준선과 직접 충돌하는 명확한 설치/기동 결함 중심

## 왜 가격 차이가 나는가

- 최고안은 handoff 깊이, 문서 포함 범위, 초기 질의응답 범위가 가장 넓다.
- 실수요 대응안은 대부분의 buyer에게 맞는 표준 범위다.
- 빠른 거래용 안은 빠른 설치와 최소 handoff에 집중하므로 유상 전환 시점이 가장 빠르다.

## 공통 경계

세 안 모두 아래는 공통으로 포함되지 않는다.

- 24시간 운영 대행
- 수익 보장
- 매매 판단 대행
- 거래소 정책 변경 상시 대응
- buyer가 변경한 서버/코드/설정의 무상 복구

세 안 모두 아래 제한은 숨기지 않는다.

- `limited`: `DRY RUN` buyer-facing 배지 캡처 부재
- `limited`: live manual order UI-DB 직접 매핑 부재
- `limited`: 전략 및 monitor buyer-facing UI 캡처 부족
- `blocked`: Rebalancing live confirmed 사례, monitor buyer-facing 캡처

## OPEN

- OPEN: `PRICE_TIER_A`, `PRICE_TIER_B`, `PRICE_TIER_C`의 실제 금액
- OPEN: 각 안의 정확한 warranty window
- OPEN: 각 안의 response-time commitment
