# Buyer Scope Boundary

기준
- 작성 기준: 2026-04-25 UTC
- 문서 성격: post-freeze communication doc update
- 목적: send-now / request-only / not-included / verified scope / known limitations wording 고정

## Send Now

아래 문장은 buyer-facing으로 바로 사용할 수 있다.

- 지금 바로 제공하는 deliverable은 고정된 clean delivery bundle입니다.
- initial review에는 one-pager, auth/mode evidence, manual order evidence, guest sandbox proof, operations evidence, handoff documents를 함께 사용합니다.
- 이 기본 세트는 현재 바로 검토 가능한 범위를 보여주기 위한 것이며, request-only diligence 자료와는 분리돼 있습니다.

## Request Only

아래 문장은 request-only 자료 설명용으로 사용한다.

- 추가 실사가 필요하면 release evidence, strategy evidence, raw index, diligence binder를 요청 기반으로 제공할 수 있습니다.
- request-only 자료는 initial outbound package의 기본 포함물이 아닙니다.
- request-only 자료는 deeper diligence용이며, initial show-now 세트와 같은 강도로 혼합해서 설명하지 않습니다.

## Not Included In First Outbound Package

아래 문장은 제외 범위 설명용으로 사용한다.

- first outbound package에는 blocked capture류와 internal_hold 자료를 넣지 않습니다.
- full repository history는 deliverable에 포함되지 않습니다.
- runtime secrets, backup 원본, debug/archive/temp artifacts는 포함하지 않습니다.

## Verified Scope Wording

아래 문장은 과장 없이 현재 verified scope를 설명할 때 사용한다.

- deliverable은 clean delivery bundle only입니다.
- full history repo는 deliverable이 아닙니다.
- 현재 state-change protection은 hardened baseline으로 설명할 수 있지만, completed formal CSRF framework라고 표현하지 않습니다.
- monitor와 buyer-facing UI capture를 fully verified라고 표현하지 않습니다.
- Rebalancing은 current `BUY_ONLY` 1-cycle verified baseline을 넘어서 buyer-facing verified scope로 확장하지 않습니다.

## Known Limitations Wording

아래 문장은 known limitation 설명용으로 사용한다.

- source history delivery는 제한돼 있으며, full history repository는 non-deliverable입니다.
- monitor는 별도 auth boundary를 가지며, memory session, restart invalidation, single-instance assumption limitation이 있습니다.
- state-change protection은 hardened baseline이지 formal CSRF framework complete 상태는 아닙니다.
- buyer-facing UI capture coverage에는 빈 구간이 있습니다.
- Rebalancing verified scope는 `BUY_ONLY` 1-cycle baseline 경계를 넘지 않습니다.

buyer-facing 정리 문구:

현재 패키지는 설명 가능한 범위와 제한사항을 함께 고정한 상태이며, verified scope를 넘어서는 표현은 사용하지 않습니다.
