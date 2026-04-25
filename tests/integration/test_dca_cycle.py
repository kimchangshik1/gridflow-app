import asyncio
import os
from types import SimpleNamespace

import pytest

from tests.integration.helpers.auth import login
from tests.integration.helpers.orders import create_dca_strategy, save_api_keys


def _fetch_dca_strategy(db_query, strategy_id: int):
    row = db_query(
        """
        SELECT user_id, exchange, symbol, strategy_type, status, total_amount,
               amount_per_order, total_rounds, completed_rounds, avg_price,
               total_qty, total_invested, last_buy_price, last_buy_at
        FROM dca_strategies
        WHERE id = %s
        """,
        (strategy_id,),
        fetch="one",
    )
    return {
        "user_id": row[0],
        "exchange": row[1],
        "symbol": row[2],
        "strategy_type": row[3],
        "status": row[4],
        "total_amount": float(row[5]),
        "amount_per_order": float(row[6]),
        "total_rounds": row[7],
        "completed_rounds": row[8],
        "avg_price": float(row[9] or 0),
        "total_qty": float(row[10] or 0),
        "total_invested": float(row[11] or 0),
        "last_buy_price": float(row[12] or 0),
        "last_buy_at": row[13],
    }


def _fetch_dca_orders(db_query, strategy_id: int):
    rows = db_query(
        """
        SELECT round_num, price, amount_krw, qty, status, exchange_order_id
        FROM dca_orders
        WHERE strategy_id = %s
        ORDER BY round_num
        """,
        (strategy_id,),
    )
    return [
        {
            "round_num": row[0],
            "price": float(row[1]),
            "amount_krw": float(row[2]),
            "qty": float(row[3] or 0),
            "status": row[4],
            "exchange_order_id": row[5],
        }
        for row in rows
    ]


def test_dca_one_cycle_live_bithumb_submit_path(
    client,
    user_factory,
    db_query,
    mock_exchange,
    live_user_bot_factory,
    monkeypatch,
):
    from app.strategy.dca_engine import DCAEngine

    user = user_factory(username="dca_cycle_bithumb")
    key_payload = {
        "bithumb_access_key": "DCABITHUMBACCESS1",
        "bithumb_secret_key": "DCABITHUMBSECRET1",
    }

    assert login(client, user["username"], user["password"]).status_code == 200
    assert client.cookies.get("session")
    assert save_api_keys(client, **key_payload).status_code == 200

    create_response = create_dca_strategy(
        client,
        exchange="bithumb",
        symbol="KRW-BTC",
        strategy_type="DCA",
        total_amount=11000.0,
        amount_per_order=5500.0,
        total_rounds=2,
        interval_type="PRICE",
        price_drop_pct=1.0,
    )

    assert create_response.status_code == 200
    create_body = create_response.json()
    assert create_body["success"] is True
    strategy_id = create_body["strategy_id"]

    assert _fetch_dca_strategy(db_query, strategy_id) == {
        "user_id": user["id"],
        "exchange": "bithumb",
        "symbol": "KRW-BTC",
        "strategy_type": "DCA",
        "status": "ACTIVE",
        "total_amount": 11000.0,
        "amount_per_order": 5500.0,
        "total_rounds": 2,
        "completed_rounds": 0,
        "avg_price": 0.0,
        "total_qty": 0.0,
        "total_invested": 0.0,
        "last_buy_price": 0.0,
        "last_buy_at": None,
    }
    assert _fetch_dca_orders(db_query, strategy_id) == []
    assert db_query(
        """
        SELECT COUNT(*)
        FROM activity_logs
        WHERE user_id = %s
          AND strategy_type = 'DCA'
        """,
        (user["id"],),
        fetch="value",
    ) == 0
    assert db_query("SELECT COUNT(*) FROM audit_logs", fetch="value") == 0
    assert mock_exchange.submit_calls["bithumb"] == []

    active_user, bot = live_user_bot_factory(user["id"])
    assert active_user["bithumb_access"] == key_payload["bithumb_access_key"]
    assert active_user["bithumb_secret"] == key_payload["bithumb_secret_key"]
    assert mock_exchange.init_calls["bithumb"][-1] == {
        "access_key": key_payload["bithumb_access_key"],
        "secret_key": key_payload["bithumb_secret_key"],
    }
    assert mock_exchange.init_calls["bithumb"][-1]["access_key"] != os.environ["BITHUMB_ACCESS_KEY"]
    assert mock_exchange.init_calls["bithumb"][-1]["secret_key"] != os.environ["BITHUMB_SECRET_KEY"]

    engine = DCAEngine(user_manager=SimpleNamespace(_user_bots={user["id"]: bot}))
    monkeypatch.setattr(engine, "_get_current_price", lambda exchange, symbol: 10000.0)

    asyncio.run(engine.run_once())

    assert mock_exchange.balance_calls["bithumb"] == []
    assert mock_exchange.submit_calls["bithumb"] == [
        {
            "method": "submit_buy_order",
            "symbol": "KRW-BTC",
            "price": 10000.0,
            "amount_krw": 5500.0,
        }
    ]
    strategy_after_cycle = _fetch_dca_strategy(db_query, strategy_id)
    assert strategy_after_cycle["completed_rounds"] == 1
    assert strategy_after_cycle["avg_price"] == 10000.0
    assert strategy_after_cycle["total_invested"] == 5500.0
    assert strategy_after_cycle["total_qty"] == pytest.approx(0.55)
    assert strategy_after_cycle["last_buy_price"] == 10000.0
    assert strategy_after_cycle["last_buy_at"] is not None
    orders_after_cycle = _fetch_dca_orders(db_query, strategy_id)
    assert len(orders_after_cycle) == 1
    assert orders_after_cycle[0]["round_num"] == 1
    assert orders_after_cycle[0]["price"] == 10000.0
    assert orders_after_cycle[0]["amount_krw"] == 5500.0
    assert orders_after_cycle[0]["qty"] == pytest.approx(0.55)
    assert orders_after_cycle[0]["status"] == "SUBMITTED"
    assert orders_after_cycle[0]["exchange_order_id"] == "bithumb-buy-1"
    assert db_query(
        """
        SELECT COUNT(*)
        FROM activity_logs
        WHERE user_id = %s
          AND strategy_type = 'DCA'
        """,
        (user["id"],),
        fetch="value",
    ) == 0
    assert db_query("SELECT COUNT(*) FROM audit_logs", fetch="value") == 0
