"""live public schema baseline

Revision ID: 20260420_01
Revises:
Create Date: 2026-04-20 05:35:00 UTC
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260420_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=True),
        sa.Column("exchange", sa.String(length=20), nullable=True),
        sa.Column("side", sa.String(length=10), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=True),
        sa.Column("status_ko", sa.String(length=30), nullable=True),
        sa.Column("side_ko", sa.String(length=10), nullable=True),
        sa.Column("strategy_type", sa.String(length=20), nullable=True),
        sa.Column("price", sa.Numeric(), nullable=True),
        sa.Column("amount_krw", sa.Numeric(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id", name="activity_logs_pkey"),
    )
    op.create_index(
        "idx_activity_logs_user_id",
        "activity_logs",
        ["user_id", sa.text("created_at DESC")],
        unique=False,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_dry_run", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        sa.Column("is_guest", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("login_fail_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("login_locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("login_fail_window_start", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="users_pkey"),
        sa.UniqueConstraint("username", name="users_username_key"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event", sa.String(length=50), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="audit_logs_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="audit_logs_pkey"),
    )

    op.create_table(
        "backtest_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("strategy_type", sa.String(length=20), server_default=sa.text("'GRID'"), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("exchange", sa.String(length=10), server_default=sa.text("'upbit'"), nullable=False),
        sa.Column("period_days", sa.Integer(), nullable=False),
        sa.Column("base_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("range_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("grid_count", sa.Integer(), nullable=True),
        sa.Column("amount_per_grid", sa.Numeric(20, 2), nullable=True),
        sa.Column("profit_gap", sa.Numeric(20, 2), nullable=True),
        sa.Column("total_trades", sa.Integer(), server_default=sa.text("0"), nullable=True),
        sa.Column("win_trades", sa.Integer(), server_default=sa.text("0"), nullable=True),
        sa.Column("total_profit", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("total_investment", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("profit_pct", sa.Numeric(10, 4), server_default=sa.text("0"), nullable=True),
        sa.Column("mdd", sa.Numeric(10, 4), server_default=sa.text("0"), nullable=True),
        sa.Column("buy_hold_pct", sa.Numeric(10, 4), server_default=sa.text("0"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="backtest_results_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="backtest_results_pkey"),
    )

    op.create_table(
        "bot_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="bot_configs_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="bot_configs_pkey"),
    )
    op.create_index("ix_bot_configs_user_id", "bot_configs", ["user_id"], unique=False)
    op.create_index("ix_bot_configs_user_key", "bot_configs", ["user_id", "key"], unique=True)

    op.create_table(
        "dca_strategies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("exchange", sa.String(length=10), server_default=sa.text("'upbit'"), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("strategy_type", sa.String(length=20), server_default=sa.text("'DCA'"), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'ACTIVE'"), nullable=False),
        sa.Column("total_amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("amount_per_order", sa.Numeric(20, 2), nullable=False),
        sa.Column("total_rounds", sa.Integer(), server_default=sa.text("10"), nullable=False),
        sa.Column("completed_rounds", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("interval_type", sa.String(length=10), server_default=sa.text("'PRICE'"), nullable=False),
        sa.Column("price_drop_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("time_interval_hours", sa.Integer(), nullable=True),
        sa.Column("accumulate_schedule", sa.String(length=10), nullable=True),
        sa.Column("stop_loss_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("max_avg_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("first_buy_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("avg_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("total_qty", sa.Numeric(20, 8), server_default=sa.text("0"), nullable=True),
        sa.Column("total_invested", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("last_buy_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("last_buy_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_buy_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="dca_strategies_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="dca_strategies_pkey"),
    )
    op.create_index("ix_dca_strategies_user", "dca_strategies", ["user_id"], unique=False)

    op.create_table(
        "dca_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("exchange", sa.String(length=10), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("round_num", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(20, 2), nullable=False),
        sa.Column("amount_krw", sa.Numeric(20, 2), nullable=False),
        sa.Column("qty", sa.Numeric(20, 8), server_default=sa.text("0"), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'ORDERED'"), nullable=False),
        sa.Column("exchange_order_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["strategy_id"], ["dca_strategies.id"], name="dca_orders_strategy_id_fkey"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="dca_orders_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="dca_orders_pkey"),
    )
    op.create_index("ix_dca_orders_strategy", "dca_orders", ["strategy_id"], unique=False)

    op.create_table(
        "grid_strategies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("exchange", sa.String(length=10), server_default=sa.text("'upbit'"), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'ACTIVE'"), nullable=False),
        sa.Column("base_price", sa.Numeric(20, 2), nullable=False),
        sa.Column("range_pct", sa.Numeric(10, 4), nullable=False),
        sa.Column("grid_count", sa.Integer(), server_default=sa.text("10"), nullable=False),
        sa.Column("amount_per_grid", sa.Numeric(20, 2), nullable=False),
        sa.Column("profit_gap", sa.Numeric(20, 2), server_default=sa.text("1"), nullable=False),
        sa.Column("total_investment", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("total_profit", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("max_investment", sa.Numeric(20, 2), nullable=True),
        sa.Column("stop_loss_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("daily_loss_limit", sa.Numeric(20, 2), nullable=True),
        sa.Column("profit_target_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("current_investment", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("daily_loss", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("daily_reset_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("smart_sell_mode", sa.String(length=20), server_default=sa.text("'BASIC'"), nullable=True),
        sa.Column("split_count", sa.Integer(), server_default=sa.text("3"), nullable=True),
        sa.Column("split_ratio", sa.Text(), server_default=sa.text("'40,35,25'"), nullable=True),
        sa.Column("split_gap_pct", sa.Numeric(6, 2), server_default=sa.text("1.0"), nullable=True),
        sa.Column("trailing_pct", sa.Numeric(6, 2), server_default=sa.text("2.0"), nullable=True),
        sa.Column("trailing_trigger_pct", sa.Numeric(6, 2), server_default=sa.text("1.0"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="grid_strategies_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="grid_strategies_pkey"),
    )
    op.create_index("ix_grid_strategies_user", "grid_strategies", ["user_id"], unique=False)

    op.create_table(
        "grid_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("exchange", sa.String(length=10), server_default=sa.text("'upbit'"), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=4), nullable=False),
        sa.Column("grid_level", sa.Integer(), nullable=False),
        sa.Column("buy_price", sa.Numeric(20, 2), nullable=False),
        sa.Column("sell_price", sa.Numeric(20, 2), nullable=False),
        sa.Column("amount_krw", sa.Numeric(20, 2), nullable=False),
        sa.Column("qty", sa.Numeric(20, 8), server_default=sa.text("0"), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'WAITING'"), nullable=False),
        sa.Column("buy_order_id", sa.String(length=64), nullable=True),
        sa.Column("sell_order_id", sa.String(length=64), nullable=True),
        sa.Column("profit", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("smart_sell_step", sa.Integer(), server_default=sa.text("0"), nullable=True),
        sa.Column("smart_sell_qty_remaining", sa.Numeric(20, 8), nullable=True),
        sa.Column("trailing_high_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("trailing_active", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        sa.Column("trailing_sell_order_id", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["strategy_id"], ["grid_strategies.id"], name="grid_orders_strategy_id_fkey"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="grid_orders_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="grid_orders_pkey"),
    )
    op.create_index("ix_grid_orders_status", "grid_orders", ["status"], unique=False)
    op.create_index("ix_grid_orders_strategy", "grid_orders", ["strategy_id"], unique=False)

    op.create_table(
        "ip_login_failures",
        sa.Column("ip", sa.String(length=45), nullable=False),
        sa.Column("fail_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("fail_window_start", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("ip", name="ip_login_failures_pkey"),
    )

    op.create_table(
        "planned_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=4), nullable=False),
        sa.Column("price", sa.Numeric(20, 2), nullable=False),
        sa.Column("amount_krw", sa.Numeric(20, 2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("exchange_order_id", sa.String(length=64), nullable=True),
        sa.Column("filled_amount_krw", sa.Numeric(20, 2), nullable=True),
        sa.Column("filled_qty", sa.Numeric(20, 8), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("filled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("exchange", sa.String(length=20), server_default=sa.text("'upbit'"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="planned_orders_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="planned_orders_pkey"),
        sa.UniqueConstraint("idempotency_key", name="planned_orders_idempotency_key_key"),
    )
    op.create_index("ix_planned_orders_exchange_order_id", "planned_orders", ["exchange_order_id"], unique=False)
    op.create_index("ix_planned_orders_symbol_status", "planned_orders", ["symbol", "status"], unique=False)
    op.create_index("ix_planned_orders_user_id", "planned_orders", ["user_id"], unique=False)

    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("avg_price", sa.Numeric(20, 2), nullable=True),
        sa.Column("total_qty", sa.Numeric(20, 8), nullable=True),
        sa.Column("total_invested_krw", sa.Numeric(20, 2), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="positions_pkey"),
        sa.UniqueConstraint("symbol", name="positions_symbol_key"),
    )

    op.create_table(
        "rebalancing_strategies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exchange", sa.String(length=20), server_default=sa.text("'upbit'"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'ACTIVE'"), nullable=False),
        sa.Column("trigger_type", sa.String(length=20), server_default=sa.text("'INTERVAL'"), nullable=False),
        sa.Column("interval_hours", sa.Numeric(6, 1), server_default=sa.text("24"), nullable=True),
        sa.Column("threshold_pct", sa.Numeric(6, 2), server_default=sa.text("5.0"), nullable=True),
        sa.Column("total_value_krw", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("last_rebal_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_rebal_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rebal_count", sa.Integer(), server_default=sa.text("0"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("rebal_method", sa.String(length=20), server_default=sa.text("'BOTH'"), nullable=True),
        sa.Column("min_order_krw", sa.Numeric(20, 2), server_default=sa.text("10000"), nullable=True),
        sa.Column("max_adjust_pct", sa.Numeric(6, 2), server_default=sa.text("25"), nullable=True),
        sa.Column("max_adjust_krw", sa.Numeric(20, 2), nullable=True),
        sa.Column("use_new_fund", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        sa.Column("daily_max_count", sa.Integer(), server_default=sa.text("10"), nullable=True),
        sa.Column("daily_max_krw", sa.Numeric(20, 2), nullable=True),
        sa.Column("asset_max_pct", sa.Numeric(6, 2), server_default=sa.text("80"), nullable=True),
        sa.Column("asset_min_pct", sa.Numeric(6, 2), server_default=sa.text("5"), nullable=True),
        sa.Column("error_stop_count", sa.Integer(), server_default=sa.text("3"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="rebalancing_strategies_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="rebalancing_strategies_pkey"),
    )

    op.create_table(
        "rebalancing_assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("target_pct", sa.Numeric(6, 2), nullable=False),
        sa.Column("current_pct", sa.Numeric(6, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("current_qty", sa.Numeric(20, 8), server_default=sa.text("0"), nullable=True),
        sa.Column("current_value_krw", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("avg_price", sa.Numeric(20, 2), server_default=sa.text("0"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["strategy_id"], ["rebalancing_strategies.id"], name="rebalancing_assets_strategy_id_fkey"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="rebalancing_assets_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="rebalancing_assets_pkey"),
    )

    op.create_table(
        "rebalancing_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=4), nullable=False),
        sa.Column("price", sa.Numeric(20, 2), nullable=True),
        sa.Column("amount_krw", sa.Numeric(20, 2), nullable=True),
        sa.Column("qty", sa.Numeric(20, 8), nullable=True),
        sa.Column("before_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("after_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("target_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'FILLED'"), nullable=True),
        sa.Column("exchange_order_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["strategy_id"], ["rebalancing_strategies.id"], name="rebalancing_orders_strategy_id_fkey"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="rebalancing_orders_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="rebalancing_orders_pkey"),
    )

    op.create_table(
        "sandbox_balances",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("krw_balance", sa.Numeric(20, 2), server_default=sa.text("10000000"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="sandbox_balances_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="sandbox_balances_pkey"),
        sa.UniqueConstraint("user_id", name="sandbox_balances_user_id_key"),
    )

    op.create_table(
        "sandbox_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=4), nullable=False),
        sa.Column("price", sa.Numeric(20, 2), nullable=False),
        sa.Column("amount_krw", sa.Numeric(20, 2), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'PLANNED'"), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="sandbox_orders_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="sandbox_orders_pkey"),
    )

    op.create_table(
        "state_transition_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("planned_order_id", sa.Integer(), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=False),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("reason", sa.String(length=100), nullable=True),
        sa.Column("extra", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="state_transition_logs_user_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="state_transition_logs_pkey"),
    )

    op.create_table(
        "user_sessions",
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("username", sa.String(length=50), nullable=True),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), server_default=sa.text("(now() + '7 days'::interval)"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="user_sessions_user_id_fkey"),
        sa.PrimaryKeyConstraint("token", name="user_sessions_pkey"),
    )


def downgrade() -> None:
    op.drop_table("user_sessions")
    op.drop_table("state_transition_logs")
    op.drop_table("sandbox_orders")
    op.drop_table("sandbox_balances")
    op.drop_table("rebalancing_orders")
    op.drop_table("rebalancing_assets")
    op.drop_table("rebalancing_strategies")
    op.drop_table("positions")
    op.drop_index("ix_planned_orders_user_id", table_name="planned_orders")
    op.drop_index("ix_planned_orders_symbol_status", table_name="planned_orders")
    op.drop_index("ix_planned_orders_exchange_order_id", table_name="planned_orders")
    op.drop_table("planned_orders")
    op.drop_table("ip_login_failures")
    op.drop_index("ix_grid_orders_strategy", table_name="grid_orders")
    op.drop_index("ix_grid_orders_status", table_name="grid_orders")
    op.drop_table("grid_orders")
    op.drop_index("ix_grid_strategies_user", table_name="grid_strategies")
    op.drop_table("grid_strategies")
    op.drop_index("ix_dca_orders_strategy", table_name="dca_orders")
    op.drop_table("dca_orders")
    op.drop_index("ix_dca_strategies_user", table_name="dca_strategies")
    op.drop_table("dca_strategies")
    op.drop_index("ix_bot_configs_user_key", table_name="bot_configs")
    op.drop_index("ix_bot_configs_user_id", table_name="bot_configs")
    op.drop_table("bot_configs")
    op.drop_table("backtest_results")
    op.drop_table("audit_logs")
    op.drop_table("users")
    op.drop_index("idx_activity_logs_user_id", table_name="activity_logs")
    op.drop_table("activity_logs")
