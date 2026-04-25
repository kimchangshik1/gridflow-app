from tests.integration.helpers.auth import STATE_CHANGE_HEADERS, login, logout


def test_api_key_save_and_masked_readback(client, user_factory, db_query):
    user = user_factory(username="apikeyuser01")
    payload = {
        "upbit_access_key": "UPBITACC12345678",
        "upbit_secret_key": "UPBITSEC12345678",
        "bithumb_access_key": "BITHACC12345678",
        "bithumb_secret_key": "BITHSEC12345678",
    }

    assert login(client, user["username"], user["password"]).status_code == 200

    save_response = client.post("/config/keys", json=payload, headers=STATE_CHANGE_HEADERS)

    assert save_response.status_code == 200
    assert save_response.json() == {"success": True, "message": "API 키 저장 완료."}

    keys_response = client.get("/config/keys")

    assert keys_response.status_code == 200
    assert keys_response.json() == {
        "upbit_access_key": f"{payload['upbit_access_key'][:8]}****",
        "upbit_secret_key": "****",
        "bithumb_access_key": f"{payload['bithumb_access_key'][:8]}****",
        "bithumb_secret_key": "****",
    }

    stored_rows = db_query(
        "SELECT key, value FROM bot_configs WHERE user_id = %s ORDER BY key",
        (user["id"],),
    )
    stored_map = {key: value for key, value in stored_rows}

    assert set(stored_map) == {
        "UPBIT_ACCESS_KEY",
        "UPBIT_SECRET_KEY",
        "BITHUMB_ACCESS_KEY",
        "BITHUMB_SECRET_KEY",
    }
    assert stored_map["UPBIT_ACCESS_KEY"] != payload["upbit_access_key"]
    assert stored_map["UPBIT_SECRET_KEY"] != payload["upbit_secret_key"]
    assert stored_map["BITHUMB_ACCESS_KEY"] != payload["bithumb_access_key"]
    assert stored_map["BITHUMB_SECRET_KEY"] != payload["bithumb_secret_key"]


def test_saved_api_keys_apply_per_user_and_exchange(client, user_factory, mock_exchange):
    first_user = user_factory(username="livekeys01")
    second_user = user_factory(username="livekeys02")

    first_payload = {
        "upbit_access_key": "FIRSTUPBITKEY01",
        "upbit_secret_key": "FIRSTUPBITSEC01",
        "bithumb_access_key": "FIRSTBITHKEY01",
        "bithumb_secret_key": "FIRSTBITHSEC01",
    }
    second_payload = {
        "upbit_access_key": "SECONDUPBITKEY2",
        "upbit_secret_key": "SECONDUPBITSEC2",
        "bithumb_access_key": "SECONDBITHKEY2",
        "bithumb_secret_key": "SECONDBITHSEC2",
    }

    assert login(client, first_user["username"], first_user["password"]).status_code == 200
    assert client.post("/config/keys", json=first_payload, headers=STATE_CHANGE_HEADERS).status_code == 200

    upbit_balance_response = client.get("/api/balances")
    bithumb_balance_response = client.get("/bapi/balances")

    assert upbit_balance_response.status_code == 200
    assert bithumb_balance_response.status_code == 200
    assert mock_exchange.init_calls["upbit"][-1] == {
        "access_key": first_payload["upbit_access_key"],
        "secret_key": first_payload["upbit_secret_key"],
    }
    assert mock_exchange.init_calls["bithumb"][-1] == {
        "access_key": first_payload["bithumb_access_key"],
        "secret_key": first_payload["bithumb_secret_key"],
    }
    assert upbit_balance_response.json()["krw_available"] == mock_exchange.krw_balances["upbit"]
    assert bithumb_balance_response.json()["krw_available"] == mock_exchange.krw_balances["bithumb"]

    assert logout(client).status_code == 200
    assert login(client, second_user["username"], second_user["password"]).status_code == 200
    assert client.get("/config/keys").json() == {
        "upbit_access_key": "",
        "upbit_secret_key": "",
        "bithumb_access_key": "",
        "bithumb_secret_key": "",
    }

    assert client.post("/config/keys", json=second_payload, headers=STATE_CHANGE_HEADERS).status_code == 200
    assert client.get("/api/balances").status_code == 200
    assert client.get("/bapi/balances").status_code == 200

    assert mock_exchange.init_calls["upbit"][-1] == {
        "access_key": second_payload["upbit_access_key"],
        "secret_key": second_payload["upbit_secret_key"],
    }
    assert mock_exchange.init_calls["bithumb"][-1] == {
        "access_key": second_payload["bithumb_access_key"],
        "secret_key": second_payload["bithumb_secret_key"],
    }
