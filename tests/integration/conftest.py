import os
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import bcrypt
import psycopg2
import pytest
from fastapi.testclient import TestClient
from psycopg2 import sql

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TEST_PASSWORD = "StrongPass1!"


def _read_db_url_from_env_file(path: Path) -> str | None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "DB_URL":
            return value.strip()
    return None


def _resolve_base_db_url() -> str:
    for env_name in ("GRIDFLOW_TEST_DB_URL", "DB_URL"):
        value = os.getenv(env_name)
        if value:
            return value

    fallback_db_url = _read_db_url_from_env_file(PROJECT_ROOT / ".env")
    if fallback_db_url:
        return fallback_db_url

    raise RuntimeError(
        "Integration tests require GRIDFLOW_TEST_DB_URL or DB_URL. "
        "Example: "
        "GRIDFLOW_TEST_DB_URL=\"$(sudo -n sed -n 's/^DB_URL=//p' /etc/gridflow/gridflow.env)\" "
        "./venv/bin/python -m pytest -q tests/integration"
    )


def _connect(base_db_url: str):
    return psycopg2.connect(base_db_url)


def _clear_app_modules() -> None:
    for module_name in list(sys.modules):
        if module_name == "app" or module_name.startswith("app."):
            sys.modules.pop(module_name, None)


def _run_alembic_upgrade(base_db_url: str, schema_name: str) -> None:
    env = os.environ.copy()
    env["DB_URL"] = base_db_url
    env["PGOPTIONS"] = f"-c search_path={schema_name}"
    env["DRY_RUN"] = env.get("DRY_RUN") or "false"

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return

    raise RuntimeError(
        "Alembic upgrade failed for integration schema.\n"
        f"stdout:\n{result.stdout}\n"
        f"stderr:\n{result.stderr}"
    )


def _truncate_all_tables(base_db_url: str) -> None:
    with _connect(base_db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_type = 'BASE TABLE'
                  AND table_name <> 'alembic_version'
                ORDER BY table_name
                """
            )
            table_names = [row[0] for row in cur.fetchall()]
            if not table_names:
                conn.commit()
                return

            truncate_sql = sql.SQL("TRUNCATE TABLE {} RESTART IDENTITY CASCADE").format(
                sql.SQL(", ").join(sql.Identifier(table_name) for table_name in table_names)
            )
            cur.execute(truncate_sql)
        conn.commit()


@pytest.fixture(scope="session")
def integration_db_env():
    base_db_url = _resolve_base_db_url()
    schema_name = f"integration_{uuid.uuid4().hex[:12]}"
    saved_env = {
        key: os.environ.get(key)
        for key in (
            "DB_URL",
            "PGOPTIONS",
            "DRY_RUN",
            "UPBIT_ACCESS_KEY",
            "UPBIT_SECRET_KEY",
            "BITHUMB_ACCESS_KEY",
            "BITHUMB_SECRET_KEY",
        )
    }

    conn = _connect(base_db_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # tradingbot has CREATE on the current DB but not CREATEDB,
            # so an isolated schema is the smallest faithful temp DB seam.
            cur.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema_name)))
    finally:
        conn.close()

    try:
        os.environ["DB_URL"] = base_db_url
        os.environ["PGOPTIONS"] = f"-c search_path={schema_name}"
        os.environ["DRY_RUN"] = saved_env["DRY_RUN"] or "false"
        os.environ["UPBIT_ACCESS_KEY"] = saved_env["UPBIT_ACCESS_KEY"] or "fixture-upbit-access"
        os.environ["UPBIT_SECRET_KEY"] = saved_env["UPBIT_SECRET_KEY"] or "fixture-upbit-secret"
        os.environ["BITHUMB_ACCESS_KEY"] = saved_env["BITHUMB_ACCESS_KEY"] or "fixture-bithumb-access"
        os.environ["BITHUMB_SECRET_KEY"] = saved_env["BITHUMB_SECRET_KEY"] or "fixture-bithumb-secret"

        _run_alembic_upgrade(base_db_url, schema_name)
        _clear_app_modules()
        yield {"base_db_url": base_db_url, "schema_name": schema_name}
    finally:
        _clear_app_modules()
        drop_conn = _connect(base_db_url)
        drop_conn.autocommit = True
        try:
            with drop_conn.cursor() as cur:
                cur.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema_name)))
        finally:
            drop_conn.close()

        for key, value in saved_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


@pytest.fixture(autouse=True)
def reset_db(integration_db_env):
    _truncate_all_tables(integration_db_env["base_db_url"])

    auth_routes = sys.modules.get("app.api.auth_routes")
    if auth_routes is not None and hasattr(auth_routes, "_register_attempts"):
        auth_routes._register_attempts.clear()


@pytest.fixture(scope="session")
def app_modules(integration_db_env):
    _clear_app_modules()

    import app.main as main
    import app.api.bithumb_routes as bithumb_routes
    import app.api.routes as api_routes
    import app.bot_manager as bot_manager
    import app.exchange.bithumb_client as exchange_bithumb_client
    import app.exchange.upbit_client as exchange_upbit_client

    return SimpleNamespace(
        app=main.app,
        api_routes=api_routes,
        bithumb_routes=bithumb_routes,
        bot_manager=bot_manager,
        exchange_upbit_client=exchange_upbit_client,
        exchange_bithumb_client=exchange_bithumb_client,
    )


@pytest.fixture
def client(app_modules):
    with TestClient(app_modules.app) as test_client:
        yield test_client


@pytest.fixture
def db_query():
    def _query(query: str, params=(), *, fetch: str = "all"):
        with _connect(os.environ["DB_URL"]) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if fetch == "all":
                    return cur.fetchall()
                if fetch == "one":
                    return cur.fetchone()
                if fetch == "value":
                    row = cur.fetchone()
                    return row[0] if row else None
                raise ValueError(f"Unsupported fetch mode: {fetch}")

    return _query


@pytest.fixture
def user_factory():
    def _create_user(
        *,
        username: str | None = None,
        password: str = DEFAULT_TEST_PASSWORD,
        is_admin: bool = False,
        is_dry_run: bool = False,
        is_guest: bool = False,
        expires_at=None,
    ):
        username = username or f"user_{uuid.uuid4().hex[:10]}"
        expires_at = expires_at or (
            datetime.now(timezone.utc) + timedelta(hours=1) if is_guest else None
        )
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        with _connect(os.environ["DB_URL"]) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (
                        username,
                        password_hash,
                        is_admin,
                        is_active,
                        is_dry_run,
                        is_guest,
                        expires_at
                    )
                    VALUES (%s, %s, %s, TRUE, %s, %s, %s)
                    RETURNING id, username, is_admin, is_dry_run, is_guest, expires_at
                    """,
                    (
                        username,
                        password_hash,
                        is_admin,
                        is_dry_run,
                        is_guest,
                        expires_at,
                    ),
                )
                row = cur.fetchone()
            conn.commit()

        return {
            "id": row[0],
            "username": row[1],
            "is_admin": row[2],
            "is_dry_run": row[3],
            "is_guest": row[4],
            "expires_at": row[5],
            "password": password,
        }

    return _create_user


class MockExchangeRegistry:
    def __init__(self):
        self.init_calls = {"upbit": [], "bithumb": []}
        self.balance_calls = {"upbit": [], "bithumb": []}
        self.submit_calls = {"upbit": [], "bithumb": []}
        self.cancel_calls = {"upbit": [], "bithumb": []}
        self.balance_payloads = {
            "upbit": {
                "KRW": {
                    "currency": "KRW",
                    "balance": "123456.0",
                    "locked": "0",
                    "avg_buy_price": "0",
                    "avg_buy_price_modified": True,
                    "unit_currency": "KRW",
                }
            },
            "bithumb": {
                "KRW": {
                    "currency": "KRW",
                    "balance": "654321.0",
                }
            },
        }
        self.krw_balances = {"upbit": 123456.0, "bithumb": 654321.0}
        self.symbols = {"upbit": ["KRW-BTC"], "bithumb": ["KRW-BTC"]}

    def build(self, exchange: str, access_key: str | None = None, secret_key: str | None = None):
        registry = self
        order_counter = {"value": 0}

        def next_order_id(prefix: str) -> str:
            order_counter["value"] += 1
            return f"{exchange}-{prefix}-{order_counter['value']}"

        class _MockBithumbBackend:
            def buy_limit_order(self, symbol, price, qty):
                registry.submit_calls["bithumb"].append(
                    {
                        "method": "buy_limit_order",
                        "symbol": symbol,
                        "price": price,
                        "qty": qty,
                    }
                )
                return {"order_id": next_order_id("buy")}

            def sell_limit_order(self, symbol, price, qty):
                registry.submit_calls["bithumb"].append(
                    {
                        "method": "sell_limit_order",
                        "symbol": symbol,
                        "price": price,
                        "qty": qty,
                    }
                )
                return {"order_id": next_order_id("sell-limit")}

            def sell_market_order(self, symbol, qty):
                registry.submit_calls["bithumb"].append(
                    {
                        "method": "sell_market_order",
                        "symbol": symbol,
                        "qty": qty,
                    }
                )
                return {"order_id": next_order_id("sell-market")}

        class _MockExchangeClient:
            def __init__(self):
                registry.init_calls[exchange].append(
                    {"access_key": access_key, "secret_key": secret_key}
                )
                self.last_order_error = None
                if exchange == "bithumb":
                    self._bithumb = _MockBithumbBackend()

            def get_balances(self):
                registry.balance_calls[exchange].append({"method": "get_balances"})
                return registry.balance_payloads[exchange]

            def get_krw_balance(self):
                registry.balance_calls[exchange].append({"method": "get_krw_balance"})
                return registry.krw_balances[exchange]

            def get_symbols(self):
                return registry.symbols[exchange]

            def submit_buy_order(self, symbol, price, amount_krw):
                registry.submit_calls[exchange].append(
                    {
                        "method": "submit_buy_order",
                        "symbol": symbol,
                        "price": price,
                        "amount_krw": amount_krw,
                    }
                )
                return next_order_id("buy")

            def submit_sell_order(self, symbol, price, qty):
                registry.submit_calls[exchange].append(
                    {
                        "method": "submit_sell_order",
                        "symbol": symbol,
                        "price": price,
                        "qty": qty,
                    }
                )
                return next_order_id("sell")

            def submit_market_sell_order(self, symbol, qty):
                registry.submit_calls[exchange].append(
                    {
                        "method": "submit_market_sell_order",
                        "symbol": symbol,
                        "qty": qty,
                    }
                )
                return next_order_id("sell-market")

            def cancel_order(self, *args, **kwargs):
                registry.cancel_calls[exchange].append({"args": args, "kwargs": kwargs})
                return True

            def get_order(self, *args, **kwargs):
                return {"uuid": f"{exchange}-order-1", "state": "done"}

            def get_open_orders(self, *args, **kwargs):
                return []

            def get_recent_orders(self, *args, **kwargs):
                return []

        return _MockExchangeClient()


@pytest.fixture
def mock_exchange(app_modules, monkeypatch):
    registry = MockExchangeRegistry()

    def build_upbit(access_key: str | None = None, secret_key: str | None = None):
        return registry.build("upbit", access_key, secret_key)

    def build_bithumb(access_key: str | None = None, secret_key: str | None = None):
        return registry.build("bithumb", access_key, secret_key)

    monkeypatch.setattr(app_modules.exchange_upbit_client, "UpbitClient", build_upbit)
    monkeypatch.setattr(app_modules.exchange_bithumb_client, "BithumbClient", build_bithumb)
    monkeypatch.setattr(app_modules.bithumb_routes, "BithumbClient", build_bithumb)
    monkeypatch.setattr(app_modules.bot_manager, "UpbitClient", build_upbit)
    monkeypatch.setattr(app_modules.bot_manager, "BithumbClient", build_bithumb)
    monkeypatch.setattr(app_modules.api_routes, "client", build_upbit())
    monkeypatch.setattr(app_modules.bithumb_routes, "client", build_bithumb())

    registry.init_calls["upbit"].clear()
    registry.init_calls["bithumb"].clear()
    registry.balance_calls["upbit"].clear()
    registry.balance_calls["bithumb"].clear()
    registry.submit_calls["upbit"].clear()
    registry.submit_calls["bithumb"].clear()
    return registry


@pytest.fixture
def load_active_user_with_keys(app_modules):
    def _load(user_id: int):
        users = app_modules.bot_manager.get_active_users_with_keys()
        matches = [user for user in users if user["id"] == user_id]
        if len(matches) != 1:
            raise AssertionError(f"Expected one active user for id={user_id}, got: {users}")
        return matches[0]

    return _load


@pytest.fixture
def live_user_bot_factory(app_modules, load_active_user_with_keys):
    def _build(user_id: int):
        user = load_active_user_with_keys(user_id)
        bot = app_modules.bot_manager.UserBot(
            user_id=user["id"],
            username=user["username"],
            upbit_access=user["upbit_access"],
            upbit_secret=user["upbit_secret"],
            bithumb_access=user["bithumb_access"],
            bithumb_secret=user["bithumb_secret"],
        )
        return user, bot

    return _build
