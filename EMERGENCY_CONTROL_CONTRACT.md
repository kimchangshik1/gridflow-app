# Emergency Control Contract

## 1. 목적

이 문서는 GridFlow의 emergency control 관련 buyer-facing contract boundary를 고정한다. 목적은 세 가지다.

- 무엇이 현재 `verified backend control path`인지 고정한다.
- 무엇이 `documented operational safeguard`인지 분리한다.
- 무엇이 현재 `not claimed`인지 명시해 판매, 실사, 운영 문서에서 과장을 막는다.

이 문서는 emergency control 관련 buyer-facing source-of-truth다.

## 2. 현재 emergency control 관련 실제 코드 경로 요약

- backend strategy control routes
  - `POST /grid/strategies/{strategy_id}/pause`
  - `POST /grid/strategies/{strategy_id}/resume`
  - `POST /dca/strategies/{strategy_id}/pause`
  - `POST /dca/strategies/{strategy_id}/resume`
  - 구현 파일: `app/api/grid_routes.py`, `app/api/dca_routes.py`
- frontend emergency UI path
  - `static/js/common.js`의 `triggerEmergencyStop()`은 `/grid/strategies`, `/dca/strategies`를 조회한 뒤 active Grid/DCA 전략 각각의 `pause` route를 순차 호출한다.
  - 같은 파일의 `releaseEmergencyStop()`은 local UI 상태와 refresh를 다루며, dedicated backend incident release endpoint를 호출하지 않는다.
- integration-verified path
  - `tests/integration/test_emergency_stop_release.py`는 state-change header 요구, Grid/DCA `pause` 후 submit 차단, `resume` 후 submit 재개를 검증한다.
- separate runtime safeguard
  - `app/monitor/emergency_stop.py`는 DB/balance failure 기준으로 runtime stop flag를 trigger/reset하고 `emergency_stop_triggered`, `emergency_stop_reset` audit를 남긴다.
- other strategy routes
  - `app/api/rebalancing_routes.py`에도 strategy `pause` / `resume` route는 존재한다.
  - 다만 이 문서는 현재 emergency control contract를 Grid/DCA verified path 기준으로만 고정한다.

## 3. verified backend control path

현재 buyer-facing backend contract로 올릴 수 있는 emergency control 관련 verified path는 아래뿐이다.

- Grid strategy `pause`
- Grid strategy `resume`
- DCA strategy `pause`
- DCA strategy `resume`

integration test로 검증된 범위:

- authenticated session + state-change header가 있어야 상태 변경 요청이 통과한다.
- strategy status가 `ACTIVE -> PAUSED -> ACTIVE`로 전이된다.
- paused 상태에서는 해당 engine `run_once()`가 submit을 만들지 않는다.
- resume 이후에는 다시 submit-capable 상태로 돌아간다.

buyer-facing 해석:

- 현재 verified backend control path는 `Grid/DCA pause-resume`다.
- 이것이 현재 emergency control contract의 가장 좁고 정확한 표현이다.

## 4. documented operational safeguard

현재 documented operational safeguard는 backend feature contract와 분리해서 설명해야 한다.

- `app/monitor/emergency_stop.py`에는 DB/balance failure 기준의 runtime stop/reset safeguard가 존재한다.
- `OPERATIONS_EVIDENCE.md`에는 `emergency_stop_triggered`와 더 이전 시점의 `emergency_stop_reset` evidence가 문서화돼 있다.
- `evidence/raw/ops/control_path_alignment_note.md`는 verified backend control path와 runtime safeguard narrative를 분리해서 설명하도록 정리돼 있다.
- frontend의 emergency button은 operator assist 성격의 UI 경로다. 현재 구현은 active Grid/DCA 전략을 읽어 기존 `pause` route로 fan-out 하는 절차에 가깝다.

buyer-facing 해석:

- runtime stop/recovery narrative는 `documented operational safeguard`다.
- operator procedure, runbook guidance, runtime evidence는 backend feature contract와 같은 층위로 말하지 않는다.

## 5. not claimed

현재 buyer-facing으로 주장하지 않는 항목은 아래다.

- dedicated backend emergency release endpoint
- global incident release story as backend feature
- full-system one-click recovery contract
- runtime safeguard path를 완전히 대표하는 unified backend control surface

위 항목은 evidence가 일부 있어도 feature contract처럼 말하지 않는다.

## 6. buyer-facing wording guide

써도 되는 표현:

- `Verified backend control path is Grid/DCA pause-resume.`
- `Runtime emergency stop evidence exists separately as an operational safeguard.`
- `The current emergency button works by pausing active Grid/DCA strategies through existing routes.`
- `Dedicated backend emergency release API is not claimed.`

쓰면 안 되는 표현:

- `GridFlow has a dedicated backend emergency release endpoint.`
- `Global incident release is a verified backend feature.`
- `Runtime stop/reset evidence is the same thing as the buyer-facing backend control contract.`
- `GridFlow provides a full-system one-click recovery contract.`

## 7. support/scope implication

- 무상 결함 수정 판단은 current verified baseline 안에서 재현 가능한 backend path에 가장 직접 연결된다.
- emergency control 축에서 그 기준에 가장 직접 들어오는 것은 Grid/DCA `pause-resume` verified path다.
- runtime safeguard narrative, operator action 안내, incident 대응 절차 설명은 운영 절차 안내와 handoff 문서 범주다.
- dedicated incident release feature를 새 제품 contract로 올리거나, full-system recovery를 backend feature로 확장하는 일은 현재 기본 범위 밖이다.

## 8. remaining limitation

현재 emergency control boundary는 `boundary disclosed but still limited` 상태다.

- buyer-facing backend contract는 Grid/DCA `pause-resume`까지로 좁다.
- runtime safeguard evidence는 존재하지만, 그것이 곧 dedicated backend incident API를 뜻하지는 않는다.
- frontend emergency release 동작은 dedicated backend release contract가 아니라 UI 상태와 strategy resume 절차에 의존한다.
- full-system one-click recovery story는 현재 contract에 포함되지 않는다.
