# Positions Design Note

## Scope

This note documents how positions are currently produced, what was repaired during Major Section 5, and which design limits still remain. It is documentation-only for this turn.

## Current State Summary

### Resolved or materially improved

- The front-end positions table path is no longer mainly blocked by the old card-only compatibility flow.
- The rebalancing engine now refreshes `rebalancing_assets.current_qty` from exchange balances before using it in the same cycle.
- Rebalancing no longer depends on the old shared client path for KRW balance lookup or order submission.

### Partially resolved

- The UI/table recognition path is better, but the hidden compatibility list still exists for older consumers.
- Rebalancing quantity basis is refreshed before execution, but the broader product still does not expose one canonical positions ledger.

### Unresolved

- The `positions` table is still not tenant-safe and still is not the live source of truth.
- Upbit, Bithumb, and sandbox still mean different things when they return a "position".
- Some rebalancing settings are stored and validated but do not yet have a fully confirmed runtime meaning.

## Read/write paths confirmed

### 1. `positions` table

- Defined as a symbol-only summary table with no `user_id` and no `exchange`. See [app/db/models.py](/home/ubuntu/upbit_bot/app/db/models.py:84).
- Created in the baseline migration with the same shape and `unique(symbol)`. See [alembic/versions/20260420_01_live_public_baseline.py](/home/ubuntu/upbit_bot/alembic/versions/20260420_01_live_public_baseline.py:268).
- In current code, user-facing positions are still not built from this table as a primary source.

Design conclusion:
- The table still looks like a legacy summary model, not the live source of truth for buyer-facing positions.

### 2. Upbit position API

Path:
- `/api/positions` in [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:161)

Read sources:
- Live exchange balances from `UpbitClient.get_balances()`
- Live ticker prices from Upbit public API
- Filled `PlannedOrder` BUY rows for per-order PnL decoration
- `grid_orders` rows in selected states for additional quantity/investment aggregation

Observed behavior:
- Base quantity comes from live exchange balances.
- The same response still mixes in order-level and grid-side assumptions.

Risk:
- A single position row is still not sourced from one ledger.

### 3. Bithumb position API

Path:
- `/bapi/positions` in [app/api/bithumb_routes.py](/home/ubuntu/upbit_bot/app/api/bithumb_routes.py:223)

Read sources:
- Live exchange balances from the Bithumb client
- Public ticker prices from Bithumb public API
- Optional `grid_orders` aggregation for rows not already represented by live balance

Observed behavior:
- For live balance rows, `avg_price` is still set equal to `current_price`, and `pnl_pct` / `pnl_amount` are returned as zero.
- If a matching live balance already exists, grid data is marked but does not fully merge quantity/invested amount the same way Upbit does.

Risk:
- Upbit and Bithumb still do not mean the same thing when they return a "position".

### 4. Sandbox position path

Path:
- Dry-run branch of `/api/positions` in [app/api/routes.py](/home/ubuntu/upbit_bot/app/api/routes.py:168)

Read sources:
- `sandbox_orders` fill history only
- Public market price lookup for valuation

Observed behavior:
- Net quantity is reconstructed as filled buy qty minus filled sell qty.
- There is still no dedicated user-scoped sandbox holdings table.

Risk:
- Sandbox positions are still replayed from order history, not synchronized from a dedicated holdings model.

### 5. Front-end table recognition path

Paths:
- Visible table body in [static/index.html](/home/ubuntu/upbit_bot/static/index.html:4300)
- Hidden compatibility list in [static/index.html](/home/ubuntu/upbit_bot/static/index.html:4338)

Observed behavior:
- The visible table path (`#pos-tbl-body`) is now the main rendering target.
- A hidden compatibility container (`#position-list`) is still populated for older front-end consumers.
- Held-quantity and selection-related logic was updated so current-table reads are preferred and compatibility reads are fallback.

Design conclusion:
- This specific UI blocker was improved.
- The compatibility bridge remains because the broader front-end still contains some legacy dependencies.

### 6. Rebalancing expectation path

Paths:
- Strategy creation and listing in [app/api/rebalancing_routes.py](/home/ubuntu/upbit_bot/app/api/rebalancing_routes.py:127)
- Runtime execution in [app/strategy/rebalancing_engine.py](/home/ubuntu/upbit_bot/app/strategy/rebalancing_engine.py:120)

Observed behavior:
- Strategy creation still inserts `rebalancing_assets(strategy_id, user_id, symbol, target_pct)` with quantity fields left to runtime maintenance.
- The engine now synchronizes `current_qty` from live exchange balances before threshold checks and rebalance sizing.
- The same cycle then uses the refreshed quantity snapshot immediately.
- KRW balance lookup and order submission now use the strategy's `exchange + user_id` client path.

Design conclusion:
- The earlier "current_qty is never maintained" statement is no longer accurate as a current-state claim.
- The remaining problem is broader: rebalancing quantity now syncs for engine use, but the product still does not have one shared positions ledger across all routes.

## Core design issues

### Issue 1. The DB position model is not tenant-safe

Classification:
- Data-model limitation

Why it can drift:
- `positions` is unique only by `symbol`.
- The model cannot separate one user from another, or Upbit from Bithumb, for the same symbol.

Operational meaning:
- It still cannot be promoted to a reliable shared holdings table without redesign.

### Issue 2. Position APIs are assembled from different ledgers

Classification:
- Source-of-truth mismatch

Why it can drift:
- Upbit, Bithumb, and sandbox position responses still do not share one common holding model.
- The same JSON shape can still mean different things depending on route and exchange.

Operational meaning:
- Invested amount, average price, and PnL can diverge by route even when the buyer sees the same label: "보유 포지션".

### Issue 3. Front-end compatibility still exists beside the current table path

Classification:
- Partial front-end migration / compatibility debt

Why it can drift:
- The visible table path is primary now, but some consumers still reference the hidden compatibility list.

Operational meaning:
- The screen is more usable than before, but the front-end still carries compatibility debt that can confuse future maintenance.

### Issue 4. Rebalancing runtime controls are only partially aligned with saved settings

Classification:
- Runtime parity gap

Why it can drift:
- Some stored settings now affect runtime behavior, but not all of them do.
- `daily_max_count` still lacks a grounded runtime meaning.
- `use_new_fund`, `error_stop_count`, and `rebal_method` still have unconfirmed or incomplete runtime enforcement.

Operational meaning:
- A strategy can show advanced options that are validated and stored, while only part of that configuration is enforced in the engine.

## User impact

Where buyers or operators will see it:
- Home dashboard totals and position widgets. See [static/js/home.js](/home/ubuntu/upbit_bot/static/js/home.js:7).
- Exchange summary totals and position UI. See [static/js/exchange.js](/home/ubuntu/upbit_bot/static/js/exchange.js:57).
- Rebalancing strategy asset snapshot and card summary. See [app/api/rebalancing_routes.py](/home/ubuntu/upbit_bot/app/api/rebalancing_routes.py:224) and [static/js/strategy.js](/home/ubuntu/upbit_bot/static/js/strategy.js:968).

Possible buyer-visible misreads:
- "투자금" and "평균단가" may still not mean the same thing between Upbit and Bithumb.
- PnL can still look artificially flat on Bithumb because current price is reused as average price for live balance rows.
- Rebalancing cards can now show more execution state than before, but that does not make positions itself a canonical holdings ledger.

Possible operational misbehavior:
- Support can still misclassify whether a discrepancy is exchange-side, grid-side, or sandbox replay-side because the response shape hides source mixing.
- Operators can still over-trust advanced rebalancing settings that are stored but not fully enforced.

## Current avoidance options

- Yes, partial operational avoidance is possible.
- Use "runtime snapshot" wording for positions-related numbers.
- Treat the Home active-position area as an intentionally filtered summary: it renders and counts only rows with `eval_amount > 0`, and it should not gain a separate "hide sub-zero/zero-value positions" toggle.
- Review zero-value or dust positions in the Portfolio or exchange-specific screens instead of expanding the Home dashboard surface.
- Verify exchange balances and strategy/order tables directly before using positions as accounting truth.
- Do not treat the legacy `positions` table as an audit source for user holdings.
- Do not describe all saved rebalancing controls as equally enforced unless the runtime path is confirmed.

## Decision notes

What is confirmed now:
- The legacy `positions` table is structurally insufficient for per-user and per-exchange truth.
- The buyer-facing positions screen is more coherent than before because current-table recognition and compatibility handling were repaired.
- Rebalancing now refreshes `current_qty` before using it.
- Rebalancing now uses per-user/per-exchange client routing for KRW balance lookup and order submission.

What remains unconfirmed or open:
- A single canonical positions ledger across exchanges, sandbox, and strategy views.
- A grounded runtime meaning for `daily_max_count`.
- Full runtime enforcement of `use_new_fund`, `error_stop_count`, and `rebal_method`.
