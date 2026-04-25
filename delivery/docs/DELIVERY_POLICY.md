GridFlow Delivery Policy

상태
- release source-of-truth closeout 기준
- canonical repo-tracked set과 bundle-only proof set의 기본 경계 확정
- buyer deliverable 기본 형식은 clean delivery tarball로 잠금

목적
- buyer에게 저장소나 파일 세트를 어떤 방식으로 전달할지 경계를 정한다.
- 기준은 설치형 제품 인수 패키지 완성이고, 내부 개발 이력 공개가 아니다.

1. 전달 방식 판정

full history repo
- 장점: 원본 이력 보존, 내부 추적 용이, 개발 측 재현이 쉽다.
- 단점: buyer에게 불필요한 브랜치/커밋/실험 흔적까지 노출된다.
- 리스크: 과거 시크릿 흔적, debug 산출물, 중간 판단 메모가 history에 남아 있을 수 있다.
- 최종 판정: non-deliverable

squash / clean repo
- 장점: 전달 저장소가 단순해지고 buyer가 보기 쉽다.
- 단점: 어떤 파일을 남기고 뺄지 별도 정리 비용이 든다.
- 리스크: 위생 정리가 부족하면 불필요 파일이 섞이거나, 반대로 설치 필수 파일이 누락될 수 있다.
- 최종 판정: 기본 deliverable이 아니라 diligence artifact 후보

buyer branch
- 장점: 내부 repo를 유지하면서 buyer 전용 브랜치로 전달 범위를 분리할 수 있다.
- 단점: 브랜치만 분리해도 repo history 자체는 여전히 연결될 수 있다.
- 리스크: branch 전략만으로는 과거 흔적 차단이 충분하지 않을 수 있다.
- 최종 판정: 채택하지 않음

delivery tarball
- 장점: buyer가 받는 파일 집합을 가장 명확하게 제한할 수 있다.
- 단점: 업데이트/패치 전달 시 버전 관리 체계가 약해질 수 있다.
- 리스크: tarball 생성 기준이 흔들리면 매번 내용이 달라지고 검증 누락이 생길 수 있다.
- 최종 판정: deliverable

2. 현재 추천안

현재 기준선
- canonical repo-tracked set 유지 + bundle-only proof set 분리
- buyer 기본 전달물은 clean delivery tarball only

추천 이유
- 내부 저장소는 개발/운영/감사 추적용으로 그대로 유지하는 편이 안전하다.
- buyer에게는 설치와 1차 운영 확인에 필요한 최소 파일군만 분리 전달하는 편이 위생상 낫다.
- history, backup, debug artifact, 내부 판정 자료를 기본 제외할 수 있다.
- 실제 history scan 기준 DB credential literal exposure가 있었으므로 full history repo는 buyer 전달 대상으로 부적절하다.

canonical repo-tracked set
- 실행 코드, 설치 재현 자산, canonical buyer-facing 문서는 repo에 tracked 상태로 유지한다.
- 최소 기준에는 `app/`, `static/`, `alembic/`, `alembic.ini`, `ops/`, `README.md`, `API.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `SECURITY.md`, `CHANGELOG.md`, `KNOWN_LIMITATIONS.md`, `SUPPORT_SCOPE.md`, `DOC_MAPPING.md`, `DOC_CONSISTENCY_CHECK.md`, `MAJOR6_CLOSEOUT.md`가 포함된다.
- `app/api/validation.py`는 route import chain의 직접 의존 파일이라 누락 허용 대상이 아니다.

bundle-only proof set
- `DB_BOOTSTRAP.txt`, `RESTORE_PROOF.txt`, `*_PROOF*`, `*_EVIDENCE*`, `evidence/`, `sales/`는 dated proof 또는 diligence bundle 성격으로 분리 관리한다.
- 이 묶음은 repo tracked 유지도 가능하지만, release source-of-truth의 핵심 구성으로 강제하지는 않는다.

권장 전달 형태
- 기본 deliverable: 검증 완료된 clean delivery tarball
- diligence artifact: 요청 시 별도 clean/squash repo 또는 curated evidence binder
- 금지: full history repo 직접 전달

3. 내부 전용 자료 vs buyer-facing 자료 경계

buyer-facing 자료
- 설치 범위 문서
- 설치 체크리스트
- 인수인계 런북
- 운영 런북
- monitor 사용 가이드
- buyer 실사 기준으로 정리된 manifest / snapshot / scope 문서

내부 전용 자료
- release quality gate
- 내부 evidence 원본
- deployment baseline 원본
- debug 메모, patch, 임시 export
- 협업 지시 문서와 Git history

경계 원칙
- buyer가 설치와 1차 운영을 수행하는 데 직접 필요하면 buyer-facing 후보다.
- 내부 판정, 과거 시행착오, 운영 흔적, 민감 경로 노출 가능성이 크면 내부 전용으로 둔다.

4. history / backup / debug artifact를 buyer set에 그대로 주지 않는 이유

history
- 과거 실험, 폐기된 방향, 내부 커뮤니케이션 흔적이 섞일 수 있다.
- buyer 실사에는 현재 납품 기준선이 더 중요하다.

backup
- 운영 데이터 또는 환경 정보가 섞일 수 있다.
- 실제 백업 원본은 전달물보다 운영 보안 자산에 가깝다.

debug artifact
- 임시 로그, 패치, 추적 스크립트는 설치 재현에 직접 필요하지 않다.
- buyer에게 혼선을 주고 불필요한 질문만 늘릴 수 있다.

전달 저장소 위생
- 과거 시크릿, 실험 흔적, 중간 산출물이 저장소와 history에 남아 있을 가능성을 전제로 관리해야 한다.
- 따라서 buyer set은 별도 위생 검토를 거친 clean delivery set으로 관리하는 편이 안전하다.

5. 남은 운영 메모

- 내부 evidence 중 어떤 수준까지 buyer-facing 증거 패키지로 재가공할지
- sanitized env sample, systemd/nginx 예시 문서를 별도 파일로 만들지
- clean delivery set 생성 절차를 수동으로 할지 자동화할지

6. buyer-facing disclosure lock

- full history repo 제외 사유를 단순 포장 선택으로 설명하지 않는다.
- history scan 기준 과거 DB credential literal exposure가 있었다는 사실을 buyer diligence에서 숨기지 않는다.
- full history repo는 그 사실과 내부 흔적 노출 가능성 때문에 non-deliverable이라고 직접 설명한다.
- clean/squash repo가 필요하면 별도 hygiene review를 거친 diligence artifact로만 다룬다.

7. 현재 정책 결론
- release source-of-truth 기준으로 canonical repo-tracked set을 유지하고, dated proof는 bundle-only로 분리한다.
- buyer deliverable은 clean delivery tarball only다.
- full history repo는 non-deliverable이다.
- clean/squash repo가 필요하면 buyer 기본 전달물이 아니라 diligence artifact로만 다룬다.
