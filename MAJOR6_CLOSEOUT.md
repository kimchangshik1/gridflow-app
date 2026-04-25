# MAJOR6_CLOSEOUT

## 목적

대단원 6의 목적은 내부 문서와 evidence를 buyer-facing 외부 문서 세트로 재정리하고, 문서 간 충돌을 최소화해 freeze 가능한 문서 패키지 상태로 만드는 것이다. 이번 closeout은 새 evidence 생성이나 기능 수정이 아니라, 외부 문서 9종과 문서 관리 보조 문서를 기준선으로 닫는 단계다.

## 이번 단원 완료 산출물 목록

- buyer-facing 외부 문서 9종
  - [README.md](/home/ubuntu/upbit_bot/README.md:1)
  - [ARCHITECTURE.md](/home/ubuntu/upbit_bot/ARCHITECTURE.md:1)
  - [DEPLOYMENT.md](/home/ubuntu/upbit_bot/DEPLOYMENT.md:1)
  - [OPERATIONS.md](/home/ubuntu/upbit_bot/OPERATIONS.md:1)
  - [SECURITY.md](/home/ubuntu/upbit_bot/SECURITY.md:1)
  - [API.md](/home/ubuntu/upbit_bot/API.md:1)
  - [CHANGELOG.md](/home/ubuntu/upbit_bot/CHANGELOG.md:1)
  - [KNOWN_LIMITATIONS.md](/home/ubuntu/upbit_bot/KNOWN_LIMITATIONS.md:1)
  - [SUPPORT_SCOPE.md](/home/ubuntu/upbit_bot/SUPPORT_SCOPE.md:1)
- 문서 재배치 대응표
  - [DOC_MAPPING.md](/home/ubuntu/upbit_bot/DOC_MAPPING.md:1)
- 외부 문서 교차 점검표
  - [DOC_CONSISTENCY_CHECK.md](/home/ubuntu/upbit_bot/DOC_CONSISTENCY_CHECK.md:1)
- 이번 closeout 문서
  - [MAJOR6_CLOSEOUT.md](/home/ubuntu/upbit_bot/MAJOR6_CLOSEOUT.md:1)
- release source-of-truth 분리 문서
  - [DELIVERY_MANIFEST.md](/home/ubuntu/upbit_bot/DELIVERY_MANIFEST.md:1)
  - [DELIVERY_POLICY.md](/home/ubuntu/upbit_bot/DELIVERY_POLICY.md:1)

## release source-of-truth closeout note

이번 closeout 기준 저장소 자산은 아래처럼 나눈다.

- canonical repo-tracked set: 실행 코드, 설치 재현 자산, canonical buyer-facing 문서 세트
- bundle-only proof set: dated proof, evidence, diligence bundle 보조 문서
- excluded internal artifacts: 내부 협업 파일, 생성물, 로그, dump, render 출력물

추가 고정 사항:
- [app/api/validation.py](/home/ubuntu/upbit_bot/app/api/validation.py:1)는 canonical tracked 대상이다.
- 이유: Grid, DCA, Rebalancing, activity log route가 이 helper를 직접 import하므로 누락 시 앱 import chain이 깨진다.

## buyer-facing 외부 문서 9종 역할 요약

| Document | Role |
| --- | --- |
| [README.md](/home/ubuntu/upbit_bot/README.md:1) | 제품 개요와 외부 문서 세트의 진입점 |
| [ARCHITECTURE.md](/home/ubuntu/upbit_bot/ARCHITECTURE.md:1) | 서비스 토폴로지와 main app/bot/monitor/nginx/PostgreSQL 관계 설명 |
| [DEPLOYMENT.md](/home/ubuntu/upbit_bot/DEPLOYMENT.md:1) | 설치 절차, 설정 위치, 서비스 등록, smoke check 기준 설명 |
| [OPERATIONS.md](/home/ubuntu/upbit_bot/OPERATIONS.md:1) | 일상 점검, 장애 1차 대응, backup/restore, alert, emergency stop 설명 |
| [SECURITY.md](/home/ubuntu/upbit_bot/SECURITY.md:1) | auth/session, secret handling, current hardening 상태, monitor boundary 설명 |
| [API.md](/home/ubuntu/upbit_bot/API.md:1) | buyer가 알아야 할 최소 운영/API surface 정리 |
| [CHANGELOG.md](/home/ubuntu/upbit_bot/CHANGELOG.md:1) | 이번 릴리스 라운드에서 문서와 제품 설명 기준으로 무엇이 가능해졌는지 정리 |
| [KNOWN_LIMITATIONS.md](/home/ubuntu/upbit_bot/KNOWN_LIMITATIONS.md:1) | 구조적 한계, security HOLD, evidence unevenness 공개 |
| [SUPPORT_SCOPE.md](/home/ubuntu/upbit_bot/SUPPORT_SCOPE.md:1) | 기본 납품 범위, buyer 책임, 무상/유상 지원 경계 설명 |

## 문서 일관성 점검 결과 요약

[DOC_CONSISTENCY_CHECK.md](/home/ubuntu/upbit_bot/DOC_CONSISTENCY_CHECK.md:1) 기준 현재 외부 문서 세트는 아래 항목에서 정렬됐다.

- 서비스명 표기 일치
- 포트 표기 일치
- 핵심 경로 표기 정렬
- main app / bot / monitor 역할 설명 일치
- `GUEST / DRY RUN / LIVE` 설명 일치
- 지원 거래소 및 핵심 전략 범위 일치
- 설치형 납품 vs 운영 대행 범위 문구 일치
- limitation 공개와 support scope 사이의 직접 모순 제거

현재 점검표의 핵심 결과:
- `PASS`: 서비스명, 포트, 역할, 모드, 지원 범위, 설치/운영/지원 범위 문구, limitation/support non-contradiction
- `PASS WITH NOTE`: 경로 표기
- note의 핵심은 `/etc/gridflow/gridflow.env`를 buyer-facing 기본 경로로 통일하고, override/fallback은 내부 컨텍스트로만 남긴 점이다.

## 이번 단원에서 의도적으로 닫지 않은 항목

이번 단원은 문서 패키지 정리와 consistency closeout이 목적이므로, 아래 항목은 의도적으로 다음 단원으로 넘긴다.

- buyer-facing capture 부족 문제
- sales/support wording의 최종 상업 문구 확정
- final freeze gate 성격의 위생 점검과 delivery packaging 방식 확정
- 문서에 이미 공개된 `HOLD` / `KNOWN LIMITATION` 자체의 기술적 해소

## carry-over routing 표

| Bucket | Routed items |
| --- | --- |
| 대단원 4 | `DRY RUN` buyer-facing capture, strategy UI / monitor UI capture coverage 부족, Rebalancing live confirmed evidence 부족 |
| 대단원 7 | SLA, warranty window, paid support 상세 조건, buyer-facing sales/support wording 확정 |
| 대단원 8 | final secret hygiene scan / history hygiene 판정, buyer delivery 기본 형식(clean repo vs tarball), version naming / final freeze |
| 지속 HOLD / KNOWN LIMITATION | formal CSRF strategy, validation consistency / app-wide response normalization, monitor session persistence / scale-out, positions source-of-truth 부재 |

## 최종 판정

`PASS WITH CARRYOVER`

## 판정 이유

- 외부 문서 9종이 모두 존재한다.
- [DOC_MAPPING.md](/home/ubuntu/upbit_bot/DOC_MAPPING.md:1)와 [DOC_CONSISTENCY_CHECK.md](/home/ubuntu/upbit_bot/DOC_CONSISTENCY_CHECK.md:1)도 존재한다.
- README가 외부 문서 세트 index 역할을 하도록 최소 보정됐다.
- 남은 항목의 성격은 대부분 evidence 확장, sales/support 조건 확정, final freeze gate, 그리고 기존에 숨기지 않기로 한 `HOLD` / `KNOWN LIMITATION` 유지 관리다.
- 따라서 대단원 6의 핵심 deliverable인 buyer-facing 문서 패키지 자체는 freeze-ready 상태로 볼 수 있고, 이 단원의 판정을 `HOLD`로 둘 이유는 부족하다.
- 다만 남은 carry-over가 분명하므로 `PASS`가 아니라 `PASS WITH CARRYOVER`가 현재 문서 기준 가장 정확하다.
