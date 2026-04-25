import asyncio
from types import SimpleNamespace

from tests.integration.helpers.auth import login
from tests.integration.helpers.orders import create_grid_strategy, save_api_keys


def _fetch_grid_strategy(db_query, strategy_id: int):
    row = db_query(
        """
        SELECT user_id, exchange, symbol, status, base_price, range_pct, grid_count,
               amount_per_grid, current_investment
        FROM grid_strategies
        WHERE id = %s
        """,
        (strategy_id,),
        fetch="one",
    )
    return {
        "user_id": row[0],
        "exchange": row[1],
        "symbol": row[2],
        "status": row[3],
        "base_price": float(row[4]),
        "range_pct": float(row[5]),
        "grid_count": row[6],
        "amount_per_grid": float(row[7]),
        "current_investment": float(row[8] or 0),
    }


def _fetch_grid_orders(db_query, strategy_id: int):
    rows = db_query(
        """
        SELECT grid_level, buy_price, sell_price, amount_krw, qty, status, buy_order_id
        FROM grid_orders
        WHERE strategy_id = %s
        ORDER BY grid_level
        """,
        (strategy_id,),
    )
    return [
        {
            "grid_level": row[0],
            "buy_price": float(row[1]),
            "sell_price": float(row[2]),
            "amount_krw": float(row[3]),
            "qty": float(row[4]),
            "status": row[5],
            "buy_order_id": row[6],
        }
        for row in rows
    ]


def test_grid_one_cycle_live_upbit_submit_path(
    client,
    user_factory,
    db_query,
    mock_exchange,
    live_user_bot_factory,
    monkeypatch,
):
    from app.strategy.grid_engine import GridEngine

    user = user_factory(username="grid_cycle_upbit")
    key_payload = {
        "upbit_access_key": "GRIDCYCLEUPBITACC",
        "upbit_secret_key": "GRIDCYCLEUPBITSEC",
    }

    assert login(client, user["username"], user["password"]).status_code == 200
    assert client.cookies.get("session")
    assert save_api_keys(client, **key_payload).status_code == 200

    create_response = create_grid_strategy(
        client,
        exchange="upbit",
        symbol="KRW-BTC",
        base_price=10000.0,
        range_pct=10.0,
        grid_count=4,
        amount_per_grid=5500.0,
        profit_gap=100.0,
    )

    assert create_response.status_code == 200
    create_body = create_response.json()
    assert create_body["success"] is True
    strategy_id = create_body["strategy_id"]

    assert _fetch_grid_strategy(db_query, strategy_id) == {
        "user_id": user["id"],
        "exchange": "upbit",
        "symbol": "KRW-BTC",
        "status": "ACTIVE",
        "base_price": 10000.0,
        "range_pct": 10.0,
        "grid_count": 4,
        "amount_per_grid": 5500.0,
        "current_investment": 0.0,
    }
    assert _fetch_grid_orders(db_query, strategy_id) == [
        {
            "grid_level": 1,
            "buy_price": 9000.0,
            "sell_price": 9100.0,
            "amount_krw": 5500.0,
            "qty": 0.61111111,
            "status": "WAITING",
            "buy_order_id": None,
        },
        {
            "grid_level": 2,
            "buy_price": 9500.0,
            "sell_price": 9600.0,
            "amount_krw": 5500.0,
            "qty": 0.57894737,
            "status": "WAITING",
            "buy_order_id": None,
        },
        {
            "grid_level": 3,
            "buy_price": 10000.0,
            "sell_price": 10100.0,
            "amount_krw": 5500.0,
            "qty": 0.55,
            "status": "WAITING",
            "buy_order_id": None,
        },
        {
            "grid_level": 4,
            "buy_price": 10500.0,
            "sell_price": 10600.0,
            "amount_krw": 5500.0,
            "qty": 0.52380952,
            "status": "WAITING",
            "buy_order_id": None,
        },
    ]
    assert db_query(
        """
        SELECT COUNT(*)
        FROM activity_logs
        WHERE user_id = %s
          AND strategy_type = '그리드'
        """,
        (user["id"],),
        fetch="value",
    ) == 0
    assert db_query("SELECT COUNT(*) FROM audit_logs", fetch="value") == 0
    assert mock_exchange.submit_calls["upbit"] == []

    active_user, bot = live_user_bot_factory(user["id"])
    assert active_user["upbit_access"] == key_payload["upbit_access_key"]
    assert active_user["upbit_secret"] == key_payload["upbit_secret_key"]
    assert mock_exchange.init_calls["upbit"][-1] == {
        "access_key": key_payload["upbit_access_key"],
        "secret_key": key_payload["upbit_secret_key"],
    }
    bot.upbit_client.get_order = lambda *args, **kwargs: {"state": "wait"}

    engine = GridEngine(user_manager=SimpleNamespace(_user_bots={user["id"]: bot}))
    monkeypatch.setattr(engine, "_get_current_price", lambda exchange, symbol: 10300.0)

    asyncio.run(engine.run_once())

    assert mock_exchange.balance_calls["upbit"] == []
    assert mock_exchange.submit_calls["upbit"] == [
        {
            "method": "submit_buy_order",
            "symbol": "KRW-BTC",
            "price": 10500.0,
            "amount_krw": 5500.0,
        }
    ]
    assert _fetch_grid_strategy(db_query, strategy_id)["current_investment"] == 5500.0
    assert _fetch_grid_orders(db_query, strategy_id) == [
        {
            "grid_level": 1,
            "buy_price": 9000.0,
            "sell_price": 9100.0,
            "amount_krw": 5500.0,
            "qty": 0.61111111,
            "status": "WAITING",
            "buy_order_id": None,
        },
        {
            "grid_level": 2,
            "buy_price": 9500.0,
            "sell_price": 9600.0,
            "amount_krw": 5500.0,
            "qty": 0.57894737,
            "status": "WAITING",
            "buy_order_id": None,
        },
        {
            "grid_level": 3,
            "buy_price": 10000.0,
            "sell_price": 10100.0,
            "amount_krw": 5500.0,
            "qty": 0.55,
            "status": "WAITING",
            "buy_order_id": None,
        },
        {
            "grid_level": 4,
            "buy_price": 10500.0,
            "sell_price": 10600.0,
            "amount_krw": 5500.0,
            "qty": 0.52380952,
            "status": "BUY_ORDERED",
            "buy_order_id": "upbit-buy-1",
        },
    ]
    assert db_query(
        """
        SELECT COUNT(*)
        FROM activity_logs
        WHERE user_id = %s
          AND strategy_type = '그리드'
        """,
        (user["id"],),
        fetch="value",
    ) == 0
    assert db_query("SELECT COUNT(*) FROM audit_logs", fetch="value") == 0
