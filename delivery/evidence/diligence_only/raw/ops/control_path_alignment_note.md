# Control Path Alignment Note

Audience: buyer-facing / external-safe  
Captured at: 2026-04-24 UTC

## Verified backend control path

- Grid strategy `pause` / `resume`
- DCA strategy `pause` / `resume`
- integration test `tests/integration/test_emergency_stop_release.py` verifies:
  - `pause` without the state-change path fails
  - paused state blocks one-shot submit
  - `resume` returns the strategy to a submit-capable state

## Documented operational safeguard

- `app/monitor/emergency_stop.py` contains a separate runtime safeguard that can trigger or reset a global stop condition on DB/balance failures.
- `OPERATIONS_EVIDENCE.md` contains runtime evidence for `emergency_stop_triggered` and an earlier `emergency_stop_reset`.
- this runtime safeguard evidence is not the same thing as the buyer-facing backend control contract.

## Not claimed

- dedicated backend emergency release endpoint
- single global incident release API
- a unified backend control surface that fully represents the runtime safeguard path

## Safe buyer-facing wording

- verified backend control path: Grid/DCA pause-resume
- documented operational safeguard: runtime emergency stop evidence exists separately
- not claimed: dedicated backend emergency release API
