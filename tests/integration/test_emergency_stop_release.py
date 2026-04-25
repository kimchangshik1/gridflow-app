import asyncio
from types import SimpleNamespace

from tests.integration.helpers.auth import login
from tests.integration.helpers.orders import (
    create_dca_strategy,
    create_grid_strategy,
    pause_dca_strategy,
    pause_grid_strategy,
    resume_dca_strategy,
    resume_grid_strategy,
    save_api_keys,
)


def _fetch_status(db_query, table_name: str, strategy_id: int):
    return db_query(
        f"SELECT status FROM {table_name} WHERE id = %s",
        (strategy_id,),
        fetch="value",
    )


def _fetch_strategy_activity_logs(db_query, user_id: int):
    return db_query(
        """
        SELECT strategy_type, symbol, exchange, status, status_ko
        FROM activity_logs
        WHERE user_id = %s
          AND event_type = 'strategy'
        ORDER BY id
        """,
        (user_id,),
    )


def test_emergency_backend_pause_resume_blocks_and_reenables_cycles(
    client,
    user_factory,
    db_query,
    mock_exchange,
    live_user_bot_factory,
    monkeypatch,
):
    import app.api.grid_routes as grid_routes
    from app.strategy.dca_engine import DCAEngine
    from app.strategy.grid_engine import GridEngine

    user = user_factory(username="emergency_control_plane")
    key_payload = {
        "upbit_access_key": "EMERGUPBITACCESS1",
        "upbit_secret_key": "EMERGUPBITSECRET1",
        "bithumb_access_key": "EMERGBITHUMBACC1",
        "bithumb_secret_key": "EMERGBITHUMBSECR1",
    }

    assert login(client, user["username"], user["password"]).status_code == 200
    assert client.cookies.get("session")
    assert save_api_keys(client, **key_payload).status_code == 200

    grid_response = create_grid_strategy(
        client,
        exchange="upbit",
        symbol="KRW-BTC",
        base_price=10000.0,
        range_pct=10.0,
        grid_count=4,
        amount_per_grid=5500.0,
        profit_gap=100.0,
    )
    dca_response = create_dca_strategy(
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

    assert grid_response.status_code == 200
    assert dca_response.status_code == 200
    grid_id = grid_response.json()["strategy_id"]
    dca_id = dca_response.json()["strategy_id"]

    assert client.post(f"/grid/strategies/{grid_id}/pause").status_code == 403
    assert client.post(f"/dca/strategies/{dca_id}/pause").status_code == 403

    assert pause_grid_strategy(client, grid_id).status_code == 200
    assert pause_dca_strategy(client, dca_id).status_code == 200
    assert _fetch_status(db_query, "grid_strategies", grid_id) == "PAUSED"
    assert _fetch_status(db_query, "dca_strategies", dca_id) == "PAUSED"
    assert _fetch_strategy_activity_logs(db_query, user["id"]) == [
        ("그리드", "KRW-BTC", "upbit", "PAUSED", "일시정지"),
        ("DCA", "KRW-BTC", "bithumb", "PAUSED", "일시정지"),
    ]

    active_user, bot = live_user_bot_factory(user["id"])
    assert active_user["upbit_access"] == key_payload["upbit_access_key"]
    assert active_user["bithumb_access"] == key_payload["bithumb_access_key"]
    bot.upbit_client.get_order = lambda *args, **kwargs: {"state": "wait"}

    manager = SimpleNamespace(_user_bots={user["id"]: bot})
    grid_engine = GridEngine(user_manager=manager)
    dca_engine = DCAEngine(user_manager=manager)
    monkeypatch.setattr(grid_engine, "_get_current_price", lambda exchange, symbol: 10300.0)
    monkeypatch.setattr(dca_engine, "_get_current_price", lambda exchange, symbol: 10000.0)

    asyncio.run(grid_engine.run_once())
    asyncio.run(dca_engine.run_once())

    assert mock_exchange.submit_calls["upbit"] == []
    assert mock_exchange.submit_calls["bithumb"] == []
    assert db_query(
        "SELECT COUNT(*) FROM grid_orders WHERE strategy_id = %s AND status = 'BUY_ORDERED'",
        (grid_id,),
        fetch="value",
    ) == 0
    assert db_query(
        "SELECT COUNT(*) FROM dca_orders WHERE strategy_id = %s",
        (dca_id,),
        fetch="value",
    ) == 0

    monkeypatch.setattr(grid_routes.engine, "_get_current_price", lambda exchange, symbol: 10300.0)
    assert resume_grid_strategy(client, grid_id).status_code == 200
    assert resume_dca_strategy(client, dca_id).status_code == 200
    assert _fetch_status(db_query, "grid_strategies", grid_id) == "ACTIVE"
    assert _fetch_status(db_query, "dca_strategies", dca_id) == "ACTIVE"
    assert _fetch_strategy_activity_logs(db_query, user["id"]) == [
        ("그리드", "KRW-BTC", "upbit", "PAUSED", "일시정지"),
        ("DCA", "KRW-BTC", "bithumb", "PAUSED", "일시정지"),
        ("그리드", "KRW-BTC", "upbit", "ACTIVE", "실행중"),
        ("DCA", "KRW-BTC", "bithumb", "ACTIVE", "실행중"),
    ]

    asyncio.run(grid_engine.run_once())
    asyncio.run(dca_engine.run_once())

    assert mock_exchange.submit_calls["upbit"] == [
        {
            "method": "submit_buy_order",
            "symbol": "KRW-BTC",
            "price": 10500.0,
            "amount_krw": 5500.0,
        }
    ]
    assert mock_exchange.submit_calls["bithumb"] == [
        {
            "method": "submit_buy_order",
            "symbol": "KRW-BTC",
            "price": 10000.0,
            "amount_krw": 5500.0,
        }
    ]
    assert db_query(
        "SELECT COUNT(*) FROM grid_orders WHERE strategy_id = %s AND status = 'BUY_ORDERED'",
        (grid_id,),
        fetch="value",
    ) == 1
    assert db_query(
        "SELECT COUNT(*) FROM dca_orders WHERE strategy_id = %s AND status = 'SUBMITTED'",
        (dca_id,),
        fetch="value",
    ) == 1
