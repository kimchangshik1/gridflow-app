# Buyer Delivery Status

기준
- 작성 기준: 2026-04-25 UTC
- 문서 성격: post-freeze communication doc update
- 이 문서는 기존 freeze artifact를 설명하기 위한 문구 세트이며, tarball이나 checksum을 다시 만들지 않는다.

## 현재 전달 상태

현재 first buyer outbound package는 이미 고정돼 있다.

- fixed delivery bundle: `gridflow_buyer_final_freeze_20260425.tar.gz`
- verification file: `SHA256SUMS.txt`
- manifest: `GRIDFLOW_FINAL_FREEZE_MANIFEST.txt`
- handoff review note: `HANDOFF_DRY_RUN.md`

buyer에게는 아래처럼 설명하는 것이 정확하다.

- 현재 buyer delivery bundle은 이미 고정돼 있으며, checksum과 manifest로 검증할 수 있습니다.
- handoff dry run note가 있어 제3자 관점에서 패키지 구조와 문서 흐름을 확인할 수 있습니다.
- 지금 즉시 제공 가능한 자료와 요청 시만 제공하는 자료는 별도로 정리돼 있습니다.

## 지금 바로 보낼 수 있는 기본 세트

initial outbound communication에서는 아래 세트를 기준으로 설명한다.

- clean delivery bundle
- `one_pager`
- auth/mode evidence
- manual order evidence
- guest sandbox proof
- operations evidence
- handoff documents

buyer-facing 한 줄 문구:

현재 바로 보낼 수 있는 기본 세트는 고정된 clean delivery bundle과 초기 검토에 필요한 one-pager, auth/mode evidence, manual evidence, guest sandbox proof, operations evidence, handoff documents입니다.

## 요청 시 별도 제공하는 세트

초기 송부에 자동 포함하지 않는 자료는 아래처럼 설명한다.

- release evidence
- strategy evidence
- raw index
- diligence binder

buyer-facing 한 줄 문구:

추가 실사가 필요하면 release evidence, strategy evidence, raw index, diligence binder는 요청 기반으로 별도 제공할 수 있습니다.

## 첫 송부에 포함하지 않는 항목

아래 항목은 first outbound package에 넣지 않는다.

- blocked capture류
- `internal_hold`
- full repo history
- runtime secrets
- debug/archive/temp artifacts

buyer-facing 한 줄 문구:

첫 송부 패키지에는 blocked capture류, internal_hold 자료, full repository history, runtime secrets, debug/archive/temp artifacts를 포함하지 않습니다.
