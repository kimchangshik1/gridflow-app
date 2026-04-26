# Final Freeze Note

## Freeze Basis

- freeze timestamp (UTC): `2026-04-25T05:06:43Z`
- repo root: `/home/ubuntu/upbit_bot`
- branch at freeze time: `fix/symbol-map-fallback`
- base commit at freeze time: `d6f4ec5`
- outbound artifact: `release/gridflow_buyer_final_freeze_20260425.tar.gz`
- checksum file: `release/SHA256SUMS.txt`
- manifest: `release/GRIDFLOW_FINAL_FREEZE_MANIFEST.txt`
- handoff dry run note: `release/HANDOFF_DRY_RUN.md`

이번 freeze는 repo 전체가 아니라 current working tree의 `delivery/` outbound subset을 buyer-send 기준으로 고정한 것이다.

## Outbound Standard

이번 전달본의 기준은 아래와 같다.

- deliverable: clean delivery tarball only
- non-deliverable: full history repo
- request-only diligence artifact: clean/squash repo or separate diligence binder
- not bundled: runtime secret, backup, debug, temp, archive, internal_hold

`delivery/evidence/diligence_only/`는 frozen 상태로 유지되지만 outbound tarball에는 싣지 않았다.

이 freeze 이후 buyer에게 바로 보내는 기준은 tarball bytes + checksum + release manifest 조합이다. 내용을 바꾸려면 새 tarball, 새 checksum, 새 freeze note가 다시 필요하다.

## Known Limitations Locked At Freeze

- full history repo는 과거 DB credential literal exposure disclosure 때문에 계속 non-deliverable이다.
- monitor auth는 별도 boundary지만 memory session, restart invalidation, single-instance limitation이 남아 있다.
- state-changing protection은 hardening baseline은 있으나 formal CSRF token framework는 아니다.
- rebalancing은 `BUY_ONLY` 1-cycle verified baseline 밖의 범위를 buyer-facing verified scope로 확장하면 안 된다.
- buyer-facing evidence coverage는 기능별 두께가 다르다.
  - monitor full buyer-facing capture 부족
  - `DRY RUN` 일반 로그인 배지 캡처 부족
  - Grid / DCA / Rebalancing buyer-facing UI capture 부족

security gate 기준 최종 buyer-facing disposition은 `READY WITH KNOWN LIMITATIONS`이다.

## Tag Handling

- intended tag name: `gridflow-final-freeze-20260425`
- actual tag action: not created
- blocker:
  - current worktree is dirty
  - `HEAD d6f4ec5` does not contain the current delivery/docs/sales changes or the release artifacts
  - tagging `HEAD` now would misrepresent the exact outbound artifact bytes

정직한 tag가 되려면 freeze artifact를 대표하는 committed snapshot이 먼저 필요하다. 이번 턴에서는 dishonest tag를 만들지 않는다.

## Freeze Meaning

이번 산출물은 "더 건드리지 않는 전달본" 기준으로 잠근 first buyer outbound package다.

- buyer send 기준 payload는 tarball에만 있다.
- request-only diligence material은 tarball 밖에 frozen 상태로 남긴다.
- internal_hold는 buyer-facing success evidence처럼 섞지 않는다.
