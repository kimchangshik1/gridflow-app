from tests.integration.helpers.auth import STATE_CHANGE_HEADERS


def save_api_keys(client, **overrides):
    payload = {
        "upbit_access_key": "",
        "upbit_secret_key": "",
        "bithumb_access_key": "",
        "bithumb_secret_key": "",
    }
    payload.update(overrides)
    return client.post("/config/keys", json=payload, headers=STATE_CHANGE_HEADERS)


def create_upbit_order(client, **overrides):
    payload = {
        "symbol": "KRW-BTC",
        "side": "BUY",
        "price": 100000.0,
        "amount_krw": 5500.0,
        "note": "",
    }
    payload.update(overrides)
    return client.post("/api/orders", json=payload, headers=STATE_CHANGE_HEADERS)


def list_upbit_orders(client, **params):
    return client.get("/api/orders", params=params or None)


def cancel_upbit_order(client, order_id: int):
    return client.delete(f"/api/orders/{order_id}", headers=STATE_CHANGE_HEADERS)


def create_bithumb_order(client, **overrides):
    payload = {
        "symbol": "KRW-BTC",
        "side": "BUY",
        "price": 100000.0,
        "amount_krw": 5500.0,
        "qty": None,
        "note": "",
    }
    payload.update(overrides)
    return client.post("/bapi/orders", json=payload, headers=STATE_CHANGE_HEADERS)


def list_bithumb_orders(client, **params):
    return client.get("/bapi/orders", params=params or None)


def cancel_bithumb_order(client, order_id: int):
    return client.delete(f"/bapi/orders/{order_id}", headers=STATE_CHANGE_HEADERS)


def create_grid_strategy(client, **overrides):
    payload = {
        "exchange": "upbit",
        "symbol": "KRW-BTC",
        "base_price": 10000.0,
        "range_pct": 10.0,
        "grid_count": 4,
        "amount_per_grid": 5500.0,
        "profit_gap": 100.0,
    }
    payload.update(overrides)
    return client.post("/grid/strategies", json=payload, headers=STATE_CHANGE_HEADERS)


def list_grid_strategies(client):
    return client.get("/grid/strategies")


def pause_grid_strategy(client, strategy_id: int):
    return client.post(f"/grid/strategies/{strategy_id}/pause", headers=STATE_CHANGE_HEADERS)


def resume_grid_strategy(client, strategy_id: int):
    return client.post(f"/grid/strategies/{strategy_id}/resume", headers=STATE_CHANGE_HEADERS)


def create_dca_strategy(client, **overrides):
    payload = {
        "exchange": "upbit",
        "symbol": "KRW-BTC",
        "strategy_type": "DCA",
        "total_amount": 11000.0,
        "amount_per_order": 5500.0,
        "total_rounds": 2,
        "interval_type": "PRICE",
        "price_drop_pct": 1.0,
    }
    payload.update(overrides)
    return client.post("/dca/strategies", json=payload, headers=STATE_CHANGE_HEADERS)


def list_dca_strategies(client):
    return client.get("/dca/strategies")


def pause_dca_strategy(client, strategy_id: int):
    return client.post(f"/dca/strategies/{strategy_id}/pause", headers=STATE_CHANGE_HEADERS)


def resume_dca_strategy(client, strategy_id: int):
    return client.post(f"/dca/strategies/{strategy_id}/resume", headers=STATE_CHANGE_HEADERS)


def create_rebalancing_strategy(client, **overrides):
    payload = {
        "exchange": "upbit",
        "name": "Balanced Portfolio",
        "trigger_type": "THRESHOLD",
        "interval_hours": 24.0,
        "threshold_pct": 20.0,
        "assets": [
            {"symbol": "KRW-BTC", "target_pct": 50.0},
            {"symbol": "KRW-ETH", "target_pct": 50.0},
        ],
        "rebal_method": "BUY_ONLY",
        "min_order_krw": 10000.0,
        "max_adjust_pct": 25.0,
    }
    payload.update(overrides)
    return client.post("/rebalancing/strategies", json=payload, headers=STATE_CHANGE_HEADERS)


def list_rebalancing_strategies(client):
    return client.get("/rebalancing/strategies")


def rebalance_now_strategy(client, strategy_id: int):
    return client.post(
        f"/rebalancing/strategies/{strategy_id}/rebalance-now",
        headers=STATE_CHANGE_HEADERS,
    )
