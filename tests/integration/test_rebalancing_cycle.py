import asyncio
from types import SimpleNamespace

from tests.integration.helpers.auth import login
from tests.integration.helpers.orders import create_rebalancing_strategy, save_api_keys


def _fetch_rebalancing_strategy(db_query, strategy_id: int):
    row = db_query(
        """
        SELECT user_id, exchange, name, status, trigger_type, interval_hours,
               threshold_pct, rebal_method, min_order_krw, max_adjust_pct,
               total_value_krw, rebal_count, last_rebal_at
        FROM rebalancing_strategies
        WHERE id = %s
        """,
        (strategy_id,),
        fetch="one",
    )
    return {
        "user_id": row[0],
        "exchange": row[1],
        "name": row[2],
        "status": row[3],
        "trigger_type": row[4],
        "interval_hours": float(row[5] or 0),
        "threshold_pct": float(row[6] or 0),
        "rebal_method": row[7],
        "min_order_krw": float(row[8] or 0),
        "max_adjust_pct": float(row[9] or 0),
        "total_value_krw": float(row[10] or 0),
        "rebal_count": row[11] or 0,
        "last_rebal_at": row[12],
    }


def _fetch_rebalancing_assets(db_query, strategy_id: int):
    rows = db_query(
        """
        SELECT symbol, target_pct, current_pct, current_qty, current_value_krw, avg_price
        FROM rebalancing_assets
        WHERE strategy_id = %s
        ORDER BY symbol
        """,
        (strategy_id,),
    )
    return [
        {
            "symbol": row[0],
            "target_pct": float(row[1] or 0),
            "current_pct": float(row[2] or 0),
            "current_qty": float(row[3] or 0),
            "current_value_krw": float(row[4] or 0),
            "avg_price": float(row[5] or 0),
        }
        for row in rows
    ]


def _fetch_rebalancing_orders(db_query, strategy_id: int):
    rows = db_query(
        """
        SELECT symbol, side, price, amount_krw, qty, before_pct, after_pct,
               target_pct, status, exchange_order_id
        FROM rebalancing_orders
        WHERE strategy_id = %s
        ORDER BY id
        """,
        (strategy_id,),
    )
    return [
        {
            "symbol": row[0],
            "side": row[1],
            "price": float(row[2] or 0),
            "amount_krw": float(row[3] or 0),
            "qty": float(row[4] or 0),
            "before_pct": float(row[5] or 0),
            "after_pct": float(row[6] or 0),
            "target_pct": float(row[7] or 0),
            "status": row[8],
            "exchange_order_id": row[9],
        }
        for row in rows
    ]


def test_rebalancing_threshold_cycle_submits_buy_order(
    client,
    user_factory,
    db_query,
    mock_exchange,
    live_user_bot_factory,
    monkeypatch,
):
    from app.strategy.rebalancing_engine import RebalancingEngine

    user = user_factory(username="rebalancing_cycle_upbit")
    key_payload = {
        "upbit_access_key": "REBALUPBITACCESS1",
        "upbit_secret_key": "REBALUPBITSECRET1",
    }

    assert login(client, user["username"], user["password"]).status_code == 200
    assert client.cookies.get("session")
    assert save_api_keys(client, **key_payload).status_code == 200

    create_response = create_rebalancing_strategy(
        client,
        exchange="upbit",
        name="Threshold Cycle",
        trigger_type="THRESHOLD",
        threshold_pct=20.0,
        rebal_method="BUY_ONLY",
        min_order_krw=10000.0,
        max_adjust_pct=25.0,
        assets=[
            {"symbol": "KRW-BTC", "target_pct": 50.0},
            {"symbol": "KRW-ETH", "target_pct": 50.0},
        ],
    )

    assert create_response.status_code == 200
    create_body = create_response.json()
    assert create_body["success"] is True
    strategy_id = create_body["strategy_id"]

    assert _fetch_rebalancing_strategy(db_query, strategy_id) == {
        "user_id": user["id"],
        "exchange": "upbit",
        "name": "Threshold Cycle",
        "status": "ACTIVE",
        "trigger_type": "THRESHOLD",
        "interval_hours": 24.0,
        "threshold_pct": 20.0,
        "rebal_method": "BUY_ONLY",
        "min_order_krw": 10000.0,
        "max_adjust_pct": 25.0,
        "total_value_krw": 0.0,
        "rebal_count": 0,
        "last_rebal_at": None,
    }
    assert _fetch_rebalancing_assets(db_query, strategy_id) == [
        {
            "symbol": "KRW-BTC",
            "target_pct": 50.0,
            "current_pct": 0.0,
            "current_qty": 0.0,
            "current_value_krw": 0.0,
            "avg_price": 0.0,
        },
        {
            "symbol": "KRW-ETH",
            "target_pct": 50.0,
            "current_pct": 0.0,
            "current_qty": 0.0,
            "current_value_krw": 0.0,
            "avg_price": 0.0,
        },
    ]
    assert _fetch_rebalancing_orders(db_query, strategy_id) == []
    assert db_query("SELECT COUNT(*) FROM activity_logs", fetch="value") == 0
    assert db_query("SELECT COUNT(*) FROM audit_logs", fetch="value") == 0

    mock_exchange.balance_payloads["upbit"] = {
        "KRW": {
            "currency": "KRW",
            "balance": "80000.0",
            "locked": "0",
            "avg_buy_price": "0",
            "avg_buy_price_modified": True,
            "unit_currency": "KRW",
        },
        "BTC": {
            "currency": "BTC",
            "balance": "0.1",
            "locked": "0",
        },
        "ETH": {
            "currency": "ETH",
            "balance": "0.9",
            "locked": "0",
        },
    }
    mock_exchange.krw_balances["upbit"] = 80000.0

    active_user, bot = live_user_bot_factory(user["id"])
    assert active_user["upbit_access"] == key_payload["upbit_access_key"]
    assert active_user["upbit_secret"] == key_payload["upbit_secret_key"]
    assert active_user["bithumb_access"] is None
    assert mock_exchange.init_calls["upbit"][-1] == {
        "access_key": key_payload["upbit_access_key"],
        "secret_key": key_payload["upbit_secret_key"],
    }

    engine = RebalancingEngine(user_manager=SimpleNamespace(_user_bots={user["id"]: bot}))
    monkeypatch.setattr(
        engine,
        "_get_prices",
        lambda exchange, symbols: {
            "KRW-BTC": 100000.0,
            "KRW-ETH": 100000.0,
        },
    )

    asyncio.run(engine.run_once())

    assert mock_exchange.balance_calls["upbit"] == [
        {"method": "get_balances"},
        {"method": "get_krw_balance"},
        {"method": "get_krw_balance"},
    ]
    assert mock_exchange.submit_calls["upbit"] == [
        {
            "method": "submit_buy_order",
            "symbol": "KRW-BTC",
            "price": 100000.0,
            "amount_krw": 45000.0,
        }
    ]

    strategy_after_cycle = _fetch_rebalancing_strategy(db_query, strategy_id)
    assert strategy_after_cycle["status"] == "ACTIVE"
    assert strategy_after_cycle["rebal_count"] == 1
    assert strategy_after_cycle["total_value_krw"] == 180000.0
    assert strategy_after_cycle["last_rebal_at"] is not None

    assert _fetch_rebalancing_assets(db_query, strategy_id) == [
        {
            "symbol": "KRW-BTC",
            "target_pct": 50.0,
            "current_pct": 5.56,
            "current_qty": 0.1,
            "current_value_krw": 10000.0,
            "avg_price": 100000.0,
        },
        {
            "symbol": "KRW-ETH",
            "target_pct": 50.0,
            "current_pct": 50.0,
            "current_qty": 0.9,
            "current_value_krw": 90000.0,
            "avg_price": 100000.0,
        },
    ]
    assert _fetch_rebalancing_orders(db_query, strategy_id) == [
        {
            "symbol": "KRW-BTC",
            "side": "BUY",
            "price": 100000.0,
            "amount_krw": 45000.0,
            "qty": 0.45,
            "before_pct": 5.56,
            "after_pct": 30.56,
            "target_pct": 50.0,
            "status": "SUBMITTED",
            "exchange_order_id": "upbit-buy-1",
        }
    ]
    assert db_query("SELECT COUNT(*) FROM activity_logs", fetch="value") == 0
    assert db_query("SELECT COUNT(*) FROM audit_logs", fetch="value") == 0
