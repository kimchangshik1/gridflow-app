import asyncio

from tests.integration.helpers.auth import login
from tests.integration.helpers.orders import create_upbit_order, save_api_keys


def _fetch_order_row(db_query, order_id: int):
    row = db_query(
        """
        SELECT user_id, exchange, symbol, side, price, amount_krw, status, exchange_order_id, note
        FROM planned_orders
        WHERE id = %s
        """,
        (order_id,),
        fetch="one",
    )
    return {
        "user_id": row[0],
        "exchange": row[1],
        "symbol": row[2],
        "side": row[3],
        "price": float(row[4]),
        "amount_krw": float(row[5]),
        "status": row[6],
        "exchange_order_id": row[7],
        "note": row[8],
    }


def _fetch_transitions(db_query, order_id: int):
    return db_query(
        """
        SELECT from_status, to_status, reason
        FROM state_transition_logs
        WHERE planned_order_id = %s
        ORDER BY id
        """,
        (order_id,),
    )


def _fetch_activity_logs(db_query, user_id: int):
    rows = db_query(
        """
        SELECT exchange, symbol, side, status, status_ko, price, amount_krw
        FROM activity_logs
        WHERE user_id = %s
          AND event_type = 'manual_order'
        ORDER BY id
        """,
        (user_id,),
    )
    return [
        (row[0], row[1], row[2], row[3], row[4], float(row[5]), float(row[6]))
        for row in rows
    ]


def test_upbit_manual_buy_live_request_and_gateway_submit(
    client,
    user_factory,
    db_query,
    mock_exchange,
    live_user_bot_factory,
):
    user = user_factory(username="upbit_manual_buy")
    key_payload = {
        "upbit_access_key": "UPBITBUYACCESS01",
        "upbit_secret_key": "UPBITBUYSECRET01",
    }

    assert login(client, user["username"], user["password"]).status_code == 200
    assert client.cookies.get("session")
    assert save_api_keys(client, **key_payload).status_code == 200

    create_response = create_upbit_order(
        client,
        side="BUY",
        price=10000.0,
        amount_krw=10000.0,
        note="manual-upbit-buy",
    )

    assert create_response.status_code == 200
    create_body = create_response.json()
    order_id = create_body["id"]
    assert create_body["symbol"] == "KRW-BTC"
    assert create_body["side"] == "BUY"
    assert create_body["price"] == 10000.0
    assert create_body["amount_krw"] == 10000.0
    assert create_body["status"] == "PLANNED"
    assert create_body["note"] == "manual-upbit-buy"
    assert mock_exchange.submit_calls["upbit"] == []

    order_before_submit = _fetch_order_row(db_query, order_id)
    assert order_before_submit == {
        "user_id": user["id"],
        "exchange": "upbit",
        "symbol": "KRW-BTC",
        "side": "BUY",
        "price": 10000.0,
        "amount_krw": 10000.0,
        "status": "PLANNED",
        "exchange_order_id": None,
        "note": "manual-upbit-buy",
    }
    assert _fetch_transitions(db_query, order_id) == [
        ("NEW", "PLANNED", "created"),
    ]
    assert _fetch_activity_logs(db_query, user["id"]) == []
    assert db_query(
        "SELECT COUNT(*) FROM audit_logs WHERE event = 'order_created' AND symbol = %s",
        ("KRW-BTC",),
        fetch="value",
    ) == 1

    active_user, bot = live_user_bot_factory(user["id"])
    assert active_user["upbit_access"] == key_payload["upbit_access_key"]
    assert active_user["upbit_secret"] == key_payload["upbit_secret_key"]
    assert active_user["bithumb_access"] is None
    assert bot.gateway is not None
    assert mock_exchange.init_calls["upbit"][-1] == {
        "access_key": key_payload["upbit_access_key"],
        "secret_key": key_payload["upbit_secret_key"],
    }

    asyncio.run(bot.gateway.run_once())

    assert mock_exchange.balance_calls["upbit"] == []
    assert mock_exchange.submit_calls["upbit"] == [
        {
            "method": "submit_buy_order",
            "symbol": "KRW-BTC",
            "price": 10000.0,
            "amount_krw": 10000.0,
        }
    ]

    order_after_submit = _fetch_order_row(db_query, order_id)
    assert order_after_submit["status"] == "SUBMITTED"
    assert order_after_submit["exchange_order_id"] == "upbit-buy-1"
    assert _fetch_transitions(db_query, order_id) == [
        ("NEW", "PLANNED", "created"),
        ("PLANNED", "QUEUED", "gateway_queued"),
        ("QUEUED", "SUBMITTED", "exchange_submitted"),
    ]
    assert _fetch_activity_logs(db_query, user["id"]) == [
        ("upbit", "KRW-BTC", "BUY", "SUBMITTED", "제출완료", 10000.0, 10000.0),
    ]


def test_upbit_manual_sell_live_request_and_gateway_submit(
    client,
    user_factory,
    db_query,
    mock_exchange,
    live_user_bot_factory,
):
    user = user_factory(username="upbit_manual_sell")
    key_payload = {
        "upbit_access_key": "UPBITSELLACCESS1",
        "upbit_secret_key": "UPBITSELLSECRET1",
    }

    assert login(client, user["username"], user["password"]).status_code == 200
    assert save_api_keys(client, **key_payload).status_code == 200

    create_response = create_upbit_order(
        client,
        side="SELL",
        price=10000.0,
        amount_krw=12500.0,
        note="manual-upbit-sell",
    )

    assert create_response.status_code == 200
    create_body = create_response.json()
    order_id = create_body["id"]
    assert create_body["side"] == "SELL"
    assert create_body["price"] == 10000.0
    assert create_body["amount_krw"] == 12500.0
    assert create_body["status"] == "PLANNED"
    assert create_body["note"] == "manual-upbit-sell"
    assert mock_exchange.submit_calls["upbit"] == []

    order_before_submit = _fetch_order_row(db_query, order_id)
    assert order_before_submit == {
        "user_id": user["id"],
        "exchange": "upbit",
        "symbol": "KRW-BTC",
        "side": "SELL",
        "price": 10000.0,
        "amount_krw": 12500.0,
        "status": "PLANNED",
        "exchange_order_id": None,
        "note": "manual-upbit-sell",
    }
    assert _fetch_transitions(db_query, order_id) == [
        ("NEW", "PLANNED", "created"),
    ]
    assert _fetch_activity_logs(db_query, user["id"]) == []

    active_user, bot = live_user_bot_factory(user["id"])
    assert active_user["upbit_access"] == key_payload["upbit_access_key"]
    assert active_user["upbit_secret"] == key_payload["upbit_secret_key"]
    assert mock_exchange.init_calls["upbit"][-1] == {
        "access_key": key_payload["upbit_access_key"],
        "secret_key": key_payload["upbit_secret_key"],
    }

    asyncio.run(bot.gateway.run_once())

    assert mock_exchange.balance_calls["upbit"] == []
    assert mock_exchange.submit_calls["upbit"] == [
        {
            "method": "submit_sell_order",
            "symbol": "KRW-BTC",
            "price": 10000.0,
            "qty": 1.25,
        }
    ]

    order_after_submit = _fetch_order_row(db_query, order_id)
    assert order_after_submit["status"] == "SUBMITTED"
    assert order_after_submit["exchange_order_id"] == "upbit-sell-1"
    assert _fetch_transitions(db_query, order_id) == [
        ("NEW", "PLANNED", "created"),
        ("PLANNED", "QUEUED", "gateway_queued"),
        ("QUEUED", "SUBMITTED", "exchange_submitted"),
    ]
    assert _fetch_activity_logs(db_query, user["id"]) == [
        ("upbit", "KRW-BTC", "SELL", "SUBMITTED", "제출완료", 10000.0, 12500.0),
    ]
