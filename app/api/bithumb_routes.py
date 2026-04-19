import uuid
import time
import requests
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.db.models import PlannedOrder, BotConfig
from app.db.order_manager import create_planned_order, cancel_planned_order
from app.exchange.bithumb_client import BithumbClient
from app.auth.dependencies import get_current_user
from app.core.crypto import decrypt
from app.core.config import DB_URL
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
client = BithumbClient()
_bithumb_market_name_cache = {}
_bithumb_market_name_cache_fetched_at = 0.0
_BITHUMB_MARKET_NAME_CACHE_TTL_SEC = 300


class OrderRequest(BaseModel):
    symbol: str
    side: str
    price: float
    amount_krw: float
    qty: Optional[float] = None
    note: Optional[str] = ""


def get_user_bithumb_client(user_id: int):
    access = None
    secret = None
    try:
        with get_db() as db:
            def get_key(key_name):
                row = db.execute(
                    select(BotConfig).where(
                        BotConfig.key == key_name,
                        BotConfig.user_id == user_id
                    )
                ).scalar_one_or_none()
                return decrypt(row.value) if row else None

            access = get_key("BITHUMB_ACCESS_KEY")
            secret = get_key("BITHUMB_SECRET_KEY")

        if access and secret:
            return BithumbClient(access_key=access, secret_key=secret)
    except (SQLAlchemyError, TypeError, ValueError):
        access = None
        secret = None

    return None


def get_bithumb_market_name_map() -> dict:
    global _bithumb_market_name_cache
    global _bithumb_market_name_cache_fetched_at

    now = time.time()
    if _bithumb_market_name_cache and (now - _bithumb_market_name_cache_fetched_at) < _BITHUMB_MARKET_NAME_CACHE_TTL_SEC:
        return _bithumb_market_name_cache

    try:
        kr = requests.get("https://api.upbit.com/v1/market/all?isDetails=false", timeout=5)
        korean_rows = kr.json()
        _bithumb_market_name_cache = {
            m["market"].replace("KRW-", ""): m.get("korean_name", "")
            for m in korean_rows
        }
        _bithumb_market_name_cache_fetched_at = now
    except (requests.RequestException, ValueError, TypeError):
        if not _bithumb_market_name_cache:
            _bithumb_market_name_cache = {}

    return _bithumb_market_name_cache


def get_bithumb_market_name_map_with_state() -> tuple[dict, str]:
    global _bithumb_market_name_cache
    global _bithumb_market_name_cache_fetched_at

    now = time.time()
    if _bithumb_market_name_cache and (now - _bithumb_market_name_cache_fetched_at) < _BITHUMB_MARKET_NAME_CACHE_TTL_SEC:
        return _bithumb_market_name_cache, "warm"

    try:
        kr = requests.get("https://api.upbit.com/v1/market/all?isDetails=false", timeout=5)
        korean_rows = kr.json()
        _bithumb_market_name_cache = {
            m["market"].replace("KRW-", ""): m.get("korean_name", "")
            for m in korean_rows
        }
        _bithumb_market_name_cache_fetched_at = now
        return _bithumb_market_name_cache, "cold"
    except (requests.RequestException, ValueError, TypeError):
        if not _bithumb_market_name_cache:
            _bithumb_market_name_cache = {}
        return _bithumb_market_name_cache, "stale"


@router.get("/symbols/ranked")
def get_ranked_symbols(request: Request, response: Response, user=Depends(get_current_user)):
    from app.core.cache import get_bithumb_ticker_cache, set_bithumb_ticker_cache

    server_start_ms = time.time() * 1000
    started_at = time.perf_counter()
    cache = get_bithumb_ticker_cache()
    request_id = str(request.query_params.get("rid") or request.headers.get("X-Request-Id") or uuid.uuid4())
    client_start_ms = str(request.headers.get("X-Client-Start-Ms") or "")

    try:
        if cache:
            data = cache
            ticker_cache_state = "warm"
        else:
            r = requests.get("https://api.bithumb.com/public/ticker/ALL_KRW", timeout=5)
            data = r.json().get("data", {})
            set_bithumb_ticker_cache(data)
            ticker_cache_state = "cold"

        korean_map, market_name_cache_state = get_bithumb_market_name_map_with_state()

        result = []
        for k, v in data.items():
            if k == "date":
                continue
            row_payload = None
            try:
                row_payload = {
                    "market": f"KRW-{k}",
                    "korean_name": korean_map.get(k, k),
                    "trade_price": float(v.get("closing_price", 0)),
                    "acc_trade_price_24h": float(v.get("acc_trade_value_24H", 0)),
                    "change_rate": float(v.get("fluctate_rate_24H", 0)) / 100,
                }
            except (AttributeError, TypeError, ValueError):
                row_payload = None
            if row_payload is not None:
                result.append({
                    "market": row_payload["market"],
                    "korean_name": row_payload["korean_name"],
                    "trade_price": row_payload["trade_price"],
                    "acc_trade_price_24h": row_payload["acc_trade_price_24h"],
                    "change_rate": row_payload["change_rate"],
                })

        result.sort(key=lambda x: x["acc_trade_price_24h"], reverse=True)
        server_end_ms = time.time() * 1000
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Server-Start-Ms"] = f"{server_start_ms:.2f}"
        response.headers["X-Server-End-Ms"] = f"{server_end_ms:.2f}"
        response.headers["X-Server-Elapsed-Ms"] = f"{elapsed_ms:.2f}"
        if client_start_ms:
            response.headers["X-Client-Start-Ms-Echo"] = client_start_ms
        response.headers["X-Bithumb-Ticker-Cache"] = ticker_cache_state
        response.headers["X-Bithumb-Market-Name-Cache"] = market_name_cache_state
        return {"symbols": result}

    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/balances")
def get_balances(user=Depends(get_current_user)):
    bc = get_user_bithumb_client(user["user_id"])
    if not bc:
        return {"krw_available": 0, "no_key": True}

    krw = bc.get_krw_balance()
    return {"krw_available": krw}


@router.get("/positions")
def get_positions(user=Depends(get_current_user)):
    bc = get_user_bithumb_client(user["user_id"])
    if not bc:
        return {"positions": [], "no_key": True}

    try:
        r = requests.get("https://api.bithumb.com/public/ticker/ALL_KRW", timeout=5)
        price_data = r.json().get("data", {})
    except Exception:
        price_data = {}

    balances = bc.get_balances()
    positions = []

    for currency, b in balances.items():
        if currency == "KRW":
            continue

        qty = float(b.get("balance", 0))
        if qty <= 0:
            continue

        ticker_data = price_data.get(currency, {})
        current_price = float(ticker_data.get("closing_price", 0))
        eval_amount = qty * current_price

        positions.append({
            "symbol": f"KRW-{currency}",
            "currency": currency,
            "korean_name": currency,
            "qty": qty,
            "avg_price": current_price,
            "current_price": current_price,
            "pnl_pct": 0,
            "eval_amount": round(eval_amount, 0),
            "invest_amount": round(eval_amount, 0),
            "pnl_amount": 0,
            "orders": [],
        })

    try:
        import psycopg2 as pg2

        conn2 = pg2.connect(DB_URL)
        cur2 = conn2.cursor()
        cur2.execute(
            '''
            SELECT go.symbol,
                   SUM(go.amount_krw) as buy_amt,
                   SUM(go.qty) as qty
            FROM grid_orders go
            JOIN grid_strategies gs ON gs.id = go.strategy_id
            WHERE go.user_id = %s
              AND go.status IN ('BUY_FILLED', 'SELL_ORDERED')
              AND gs.exchange = 'bithumb'
            GROUP BY go.symbol
            ''',
            (user["user_id"],)
        )
        grid_rows = cur2.fetchall()
        cur2.close()
        conn2.close()

        for grow in grid_rows:
            gsymbol, gbuy_amt, gqty = grow
            gqty = float(gqty or 0)
            gbuy_amt = float(gbuy_amt or 0)

            if gqty <= 0.0001:
                continue

            gavg = gbuy_amt / gqty
            coin = gsymbol.replace("KRW-", "")
            gcurrent = float(price_data.get(coin, {}).get("closing_price", 0))
            geval = gqty * gcurrent
            ginvest = gqty * gavg
            gpnl_pct = (gcurrent - gavg) / gavg * 100 if gavg > 0 else 0

            existing = next((p for p in positions if p["symbol"] == gsymbol), None)
            if existing:
                # 빗썸 실잔고가 이미 있으면 그 포지션을 기준으로 보고,
                # DB grid 집계는 중복 합산하지 않는다.
                existing["grid"] = True
                if not existing.get("avg_price") or existing["avg_price"] <= 0:
                    existing["avg_price"] = round(gavg, 2)
                    existing["invest_amount"] = round(ginvest, 0)
                    existing["pnl_amount"] = round(existing["eval_amount"] - existing["invest_amount"], 0)
                    existing["pnl_pct"] = round(
                        (existing["current_price"] - existing["avg_price"]) / existing["avg_price"] * 100
                        if existing["avg_price"] > 0 else 0,
                        2
                    )
            else:
                positions.append({
                    "symbol": gsymbol,
                    "currency": coin,
                    "korean_name": coin,
                    "qty": round(gqty, 4),
                    "avg_price": round(gavg, 2),
                    "current_price": gcurrent,
                    "pnl_pct": round(gpnl_pct, 2),
                    "eval_amount": round(geval, 0),
                    "invest_amount": round(ginvest, 0),
                    "pnl_amount": round(geval - ginvest, 0),
                    "orders": [],
                    "grid": True
                })
    except Exception as e:
        print(f"[GRID][BITHUMB] 포지션 합산 오류: {e}")

    positions.sort(key=lambda x: x["eval_amount"], reverse=True)
    return {"positions": positions}


@router.post("/orders")
def create_order(req: OrderRequest, user=Depends(get_current_user)):
    if req.side.upper() not in ("BUY", "SELL"):
        raise HTTPException(400, "side는 BUY 또는 SELL")
    if not req.symbol or not req.symbol.strip():
        raise HTTPException(400, "symbol이 비어 있습니다")
    if not req.symbol.startswith("KRW-") or len(req.symbol) < 5:
        raise HTTPException(400, f"symbol 형식 오류: '{req.symbol}' (예: KRW-BTC)")
    if req.price <= 0:
        raise HTTPException(400, "가격은 0보다 커야 함")
    if req.side.upper() == "SELL" and req.qty is not None and req.qty <= 0:
        raise HTTPException(400, "수량(qty)은 0보다 커야 합니다")
    if req.amount_krw < 5500:
        raise HTTPException(400, "최소 주문금액 5,500원")

    note = f"bithumb:{req.note}" if req.note else "bithumb"
    amount_krw = req.price * req.qty if req.side.upper() == "SELL" and req.qty else req.amount_krw
    if req.side.upper() == "SELL":
        print(f"[BITHUMB][MANUAL_SELL] symbol={req.symbol} price={req.price} qty={req.qty} amount_krw={amount_krw}")

    # DRY_RUN / guest → sandbox_orders에 저장 (실거래 경로 차단)
    if user.get("is_dry_run"):
        import psycopg2
        _side = req.side.upper()
        user_id = user["user_id"]
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            cur.execute("SELECT krw_balance FROM sandbox_balances WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            krw = float(row[0]) if row else 0
            if _side == "BUY" and krw < amount_krw:
                raise HTTPException(400, f"잔고 부족 (보유: {krw:,.0f}원)")
            cur.execute(
                "INSERT INTO sandbox_orders (user_id, symbol, side, price, amount_krw, status, note) VALUES (%s, %s, %s, %s, %s, 'FILLED', %s) RETURNING id, created_at",
                (user_id, req.symbol, _side, req.price, amount_krw, note)
            )
            order_row = cur.fetchone()
            if _side == "BUY":
                cur.execute("UPDATE sandbox_balances SET krw_balance = krw_balance - %s WHERE user_id = %s", (amount_krw, user_id))
            cur.execute(
                """INSERT INTO activity_logs
                   (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, strategy_type, price, amount_krw, created_at)
                   VALUES (%s, 'manual_order', %s, 'bithumb', %s, %s, 'FILLED', '체결완료', '수동', %s, %s, NOW())""",
                (user_id, req.symbol, _side, "매수" if _side == "BUY" else "매도", req.price, amount_krw)
            )
            conn.commit()
            cur.close()
            conn.close()
            return {"id": order_row[0], "symbol": req.symbol, "side": _side,
                    "price": req.price, "amount_krw": amount_krw, "status": "FILLED",
                    "note": note, "created_at": str(order_row[1]), "sandbox": True}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"샌드박스 주문 오류: {e}")

    with get_db() as db:
        order = create_planned_order(
            db=db,
            symbol=req.symbol,
            side=req.side.upper(),
            price=req.price,
            amount_krw=amount_krw,
            idempotency_key=str(uuid.uuid4()),
            note=note,
            user_id=user["user_id"],
            exchange="bithumb",
        )
        if not order:
            raise HTTPException(400, "주문 생성 실패")

        return {
            "id": order.id,
            "symbol": order.symbol,
            "side": order.side,
            "price": float(order.price),
            "amount_krw": float(order.amount_krw),
            "status": order.status,
            "note": order.note,
            "created_at": str(order.created_at),
        }


@router.get("/orders")
def list_orders(user=Depends(get_current_user), symbol: Optional[str] = None, status: Optional[str] = None):
    with get_db() as db:
        q = select(PlannedOrder).where(
            PlannedOrder.note.like("%bithumb%"),
            PlannedOrder.user_id == user["user_id"]
        )
        if symbol:
            q = q.where(PlannedOrder.symbol == symbol)
        if status:
            q = q.where(PlannedOrder.status == status)

        q = q.order_by(PlannedOrder.created_at.desc()).limit(200)
        orders = db.execute(q).scalars().all()

        return {
            "orders": [
                {
                    "id": o.id,
                    "symbol": o.symbol,
                    "side": o.side,
                    "price": float(o.price),
                    "amount_krw": float(o.amount_krw),
                    "status": o.status,
                    "exchange_order_id": o.exchange_order_id,
                    "filled_qty": float(o.filled_qty or 0),
                    "note": o.note,
                    "created_at": str(o.created_at),
                    "updated_at": str(o.updated_at),
                }
                for o in orders
            ]
        }


@router.delete("/orders/{order_id}")
def cancel_order(order_id: int, user=Depends(get_current_user)):
    with get_db() as db:
        order = db.execute(
            select(PlannedOrder).where(
                PlannedOrder.id == order_id,
                PlannedOrder.user_id == user["user_id"]
            )
        ).scalar_one_or_none()

        if not order:
            raise HTTPException(404, "주문을 찾을 수 없습니다")

        result = cancel_planned_order(db, order_id, reason="user_cancelled")
        if not result:
            raise HTTPException(400, "취소 실패")

        return {"success": True, "order_id": order_id}


@router.get("/price/{symbol}")
def get_price(symbol: str, user=Depends(get_current_user)):
    price = client.get_current_price(symbol)
    if price is None:
        raise HTTPException(404, f"현재가 조회 실패: {symbol}")
    return {"symbol": symbol, "price": price}


@router.get("/health")
def health():
    from app.db.database import check_db_connection

    db_ok = check_db_connection()
    if not db_ok:
        raise HTTPException(503, "DB 연결 실패")

    return {"status": "ok", "db": db_ok}
