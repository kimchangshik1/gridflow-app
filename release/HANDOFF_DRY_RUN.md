# Handoff Dry Run

기준
- dry run timestamp: `2026-04-25T05:06:43Z`
- dry run target: `release/gridflow_buyer_final_freeze_20260425.tar.gz`
- check method: tarball extract and third-party open-path review

## 1. First impression after opening the tarball

압축을 풀면 최상위에 `gridflow_buyer_final_freeze_20260425/` 하나만 보인다. buyer가 바로 이해할 수 있는 8개 payload 영역과 2개 top-level runtime file이 보인다.

- `app/`
- `static/`
- `ops/`
- `alembic/`
- `docs/`
- `install/`
- `sales/`
- `evidence/show_now/`
- `alembic.ini`
- `requirements-web.txt`

이 구조는 `delivery/`라는 staging prefix를 벗긴 buyer-facing root라서, 압축을 연 직후 디렉터리 의미가 바로 읽힌다.

## 2. Reader flow check

문서 흐름은 아래 순서로 자연스럽게 이어진다.

1. `docs/README.md`
2. `docs/DEPLOYMENT.md`
3. `docs/SECURITY.md`
4. `docs/SUPPORT_SCOPE.md`
5. `sales/handoff_scope.md`

보조 문서는 다음 역할로 연결된다.

- `docs/DELIVERY_POLICY.md`: clean-delivery-only, non-deliverable history policy 확인
- `docs/DELIVERY_MANIFEST.md`: 포함/제외와 evidence visibility lock 확인
- `sales/one_pager.md`: initial buyer narrative 시작점
- `sales/demo_script.md`: live demo 순서
- `sales/due_diligence_faq.md`: request-only 질의 대응

문서 간 충돌은 이번 dry run에서 확인되지 않았다.

## 3. What is immediately visible

buyer가 tarball만 열어도 바로 볼 수 있는 것은 아래다.

- 실행 코드와 프론트 payload
- install template와 bootstrap runbook
- 운영 스크립트와 backup/restore verify 경로
- buyer-facing security/support/delivery policy 문서
- one-pager, demo script, pricing, handoff scope
- `show_now` evidence 6개 문서

즉시 설명 가능한 범위와 요청 기반 상세 검토 자료의 경계가 tarball 구조상 분리돼 있다.

## 4. What is request-only

`diligence_only` 자료는 tarball 안에 없다. 대신 아래 문서들이 request-only라는 사실을 설명해 준다.

- `docs/DELIVERY_MANIFEST.md`
- `docs/EVIDENCE_VISIBILITY_LOCK.md`
- `sales/evidence_diligence_bundle_index.md`
- `sales/due_diligence_faq.md`

따라서 third-party reviewer는 initial pack과 request-only pack의 차이를 문서만으로 이해할 수 있다.

## 5. Why internal_hold is absent

`internal_hold`는 buyer-facing proof처럼 보이면 안 되는 항목이다. 빠진 이유는 누락이 아니라 visibility policy다.

- 아직 buyer-facing으로 보내지 않기로 잠근 capture/evidence
- 내부 추적용 closeout/unlock backlog 성격 문서
- outbound package에 넣는 순간 존재/완성도를 과장하게 되는 항목

이번 tarball은 `show_now`만 실제 payload로 포함하고, `internal_hold`는 문서상 잠금 상태만 남긴다.

## 6. Dry run conclusion

이 tarball은 제3자가 바로 열어도 구조를 이해할 수 있다. install/docs/sales/evidence 흐름이 끊기지 않고, `request-only`와 `not bundled` 경계도 설명 가능하다.

남는 주의점은 하나다. `sales/evidence_diligence_bundle_index.md`는 tarball 밖의 frozen request-only 자료를 가리키므로, handoff 시 "요청 시 별도 제공"이라는 설명을 함께 해야 한다.
