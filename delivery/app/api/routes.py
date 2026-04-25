import json
import uuid
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.api.validation import normalize_market_symbol
from app.db.database import get_db
from app.db.models import PlannedOrder, StateTransitionLog, Position
from app.db.order_manager import (
    create_planned_order, cancel_planned_order,
    get_planned_orders, get_active_orders, transition
)
from app.exchange.upbit_client import UpbitClient
from app.auth.dependencies import get_current_user
from app.core.config import DB_URL
from sqlalchemy import select

router = APIRouter()
client = UpbitClient()

_ACTIVITY_LOG_ALLOWED_FIELDS = frozenset({
    "event_type",
    "status",
    "status_ko",
    "symbol",
    "exchange",
    "side",
    "side_ko",
    "strategy_type",
    "price",
    "amount_krw",
})
_ACTIVITY_LOG_EVENT_TYPES = frozenset({"manual_order", "strategy", "order_fail"})
_ACTIVITY_LOG_STATUSES = frozenset({
    "PLANNED",
    "QUEUED",
    "SUBMITTED",
    "ACTIVE",
    "PAUSED",
    "STOPPED",
    "PARTIALLY_FILLED",
    "FILLED",
    "CANCELLED",
    "FAILED",
    "UNKNOWN",
    "RECONCILE_NEEDED",
    "SUCCESS",
    "COMPLETED",
})
_ACTIVITY_LOG_EXCHANGES = frozenset({"upbit", "bithumb"})
_ACTIVITY_LOG_SIDES = frozenset({"BUY", "SELL", "BID", "ASK"})
_ACTIVITY_LOG_SIDE_KO = frozenset({"매수", "매도"})
_ACTIVITY_LOG_STRATEGY_TYPES = frozenset({
    "수동",
    "MANUAL",
    "그리드",
    "GRID",
    "DCA",
    "ACCUMULATE",
    "리밸런싱",
    "REBAL",
    "REBALANCING",
    "시스템",
    "SYSTEM",
})


class OrderRequest(BaseModel):
    symbol: str
    side: str
    price: float
    amount_krw: float
    note: Optional[str] = ""


class ActivitySummaryRequest(BaseModel):
    status: str
    status_ko: str
    strategy_type: Optional[str] = "시스템"
    symbol: Optional[str] = "SYSTEM"
    exchange: Optional[str] = "SYSTEM"


def _validate_upbit_order_request(req: OrderRequest):
    if not req.symbol or not req.symbol.strip():
        raise HTTPException(400, "symbol이 비어 있습니다")
    if not req.symbol.startswith("KRW-") or len(req.symbol) < 5:
        raise HTTPException(400, f"symbol 형식 오류: '{req.symbol}' (예: KRW-BTC)")
    if req.side.upper() not in ("BUY", "SELL"):
        raise HTTPException(400, "side는 BUY 또는 SELL")
    if req.price <= 0:
        raise HTTPException(400, "가격은 0보다 커야 함")


def _validate_activity_log_payload(req: dict):
    if not isinstance(req, dict):
        raise HTTPException(400, "요청 형식이 올바르지 않습니다")
    unexpected_fields = sorted(set(req.keys()) - _ACTIVITY_LOG_ALLOWED_FIELDS)
    if unexpected_fields:
        raise HTTPException(400, f"허용되지 않은 필드: {', '.join(unexpected_fields)}")

    normalized = {}
    required_fields = ("event_type", "status", "status_ko")
    for field in required_fields:
        value = req.get(field)
        if not isinstance(value, str) or not value.strip():
            raise HTTPException(400, f"{field}는 비어 있을 수 없습니다")

    event_type = str(req["event_type"]).strip().lower()
    if event_type not in _ACTIVITY_LOG_EVENT_TYPES:
        raise HTTPException(400, "event_type 허용값이 아닙니다")
    normalized["event_type"] = event_type

    status = str(req["status"]).strip().upper()
    if status not in _ACTIVITY_LOG_STATUSES:
        raise HTTPException(400, "status 허용값이 아닙니다")
    normalized["status"] = status

    status_ko = str(req["status_ko"]).strip()
    if len(status_ko) > 120:
        raise HTTPException(400, "status_ko 길이가 너무 깁니다")
    normalized["status_ko"] = status_ko

    symbol_value = req.get("symbol")
    exchange_value = req.get("exchange")
    if not isinstance(symbol_value, str) or not symbol_value.strip():
        raise HTTPException(400, "symbol이 비어 있습니다")
    if not isinstance(exchange_value, str) or not exchange_value.strip():
        raise HTTPException(400, "exchange가 비어 있습니다")
    normalized["symbol"] = normalize_market_symbol(symbol_value)
    exchange = exchange_value.strip().lower()
    if exchange not in _ACTIVITY_LOG_EXCHANGES:
        raise HTTPException(400, "exchange 허용값이 아닙니다")
    normalized["exchange"] = exchange

    side = req.get("side")
    normalized["side"] = None
    if side is not None:
        if not isinstance(side, str):
            raise HTTPException(400, "side 형식이 올바르지 않습니다")
        normalized_side = side.strip().upper()
        if normalized_side not in _ACTIVITY_LOG_SIDES:
            raise HTTPException(400, "side 허용값이 아닙니다")
        normalized["side"] = normalized_side

    side_ko = req.get("side_ko")
    normalized["side_ko"] = None
    if side_ko is not None:
        if not isinstance(side_ko, str):
            raise HTTPException(400, "side_ko 형식이 올바르지 않습니다")
        normalized_side_ko = side_ko.strip()
        if normalized_side_ko not in _ACTIVITY_LOG_SIDE_KO:
            raise HTTPException(400, "side_ko 허용값이 아닙니다")
        normalized["side_ko"] = normalized_side_ko

    strategy_type = req.get("strategy_type")
    normalized["strategy_type"] = None
    if strategy_type is not None:
        if not isinstance(strategy_type, str):
            raise HTTPException(400, "strategy_type 형식이 올바르지 않습니다")
        normalized_strategy_type = strategy_type.strip()
        if normalized_strategy_type not in _ACTIVITY_LOG_STRATEGY_TYPES:
            raise HTTPException(400, "strategy_type 허용값이 아닙니다")
        normalized["strategy_type"] = normalized_strategy_type

    if event_type in {"manual_order", "order_fail"}:
        if normalized["side"] is None or normalized["side_ko"] is None:
            raise HTTPException(400, "manual_order/order_fail에는 side와 side_ko가 필요합니다")

    for field in ("price", "amount_krw"):
        value = req.get(field)
        normalized[field] = None
        if value is not None:
            try:
                numeric_value = float(value)
            except (TypeError, ValueError):
                raise HTTPException(400, f"{field} 형식이 올바르지 않습니다")
            if numeric_value <= 0:
                raise HTTPException(400, f"{field}는 0보다 커야 합니다")
            normalized[field] = numeric_value
    return normalized


@router.get("/symbols")
def get_symbols(user=Depends(get_current_user)):
    symbols = client.get_symbols()
    return {"symbols": symbols, "count": len(symbols)}


@router.get("/symbols/ranked")
def get_ranked_symbols(user=Depends(get_current_user)):
    from app.core.cache import get_upbit_ticker_cache
    symbols = client.get_symbols()
    try:
        kr = requests.get("https://api.upbit.com/v1/market/all?isDetails=false", timeout=5)
        korean_map = {m["market"]: m.get("korean_name", m["market"]) for m in kr.json()}
    except Exception:
        korean_map = {}
    cache = get_upbit_ticker_cache()
    if cache:
        result = list(cache.values())
    else:
        result = []
        for i in range(0, len(symbols), 100):
            chunk = symbols[i:i+100]
            markets = ",".join(chunk)
            try:
                r = requests.get(f"https://api.upbit.com/v1/ticker?markets={markets}", timeout=5)
                result.extend(r.json())
            except Exception as e:
                print(f"[ERROR] 거래대금 조회 실패: {e}")
    result = [x for x in result if isinstance(x, dict)]
    result.sort(key=lambda x: x.get("acc_trade_price_24h", 0), reverse=True)
    return {"symbols": [
        {
            "market": r["market"],
            "korean_name": korean_map.get(r["market"], r["market"].replace("KRW-","")),
            "trade_price": r.get("trade_price", 0),
            "acc_trade_price_24h": r.get("acc_trade_price_24h", 0),
            "change_rate": r.get("signed_change_rate", 0),
        }
        for r in result
    ]}


@router.get("/balances")
def get_balances(user=Depends(get_current_user)):
    from app.core.crypto import decrypt
    from app.db.models import BotConfig
    from sqlalchemy import select as sel
    import psycopg2
    user_id = user["user_id"]

    # DRY_RUN 계정 → 샌드박스 잔고 반환
    if user.get("is_dry_run"):
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO sandbox_balances (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING",
                (user_id,)
            )
            conn.commit()
            cur.execute("SELECT krw_balance FROM sandbox_balances WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            krw = float(row[0]) if row else 10000000
        except Exception:
            krw = 10000000
        return {"balances": {"KRW": {"currency": "KRW", "balance": str(krw), "locked": "0", "avg_buy_price": "0", "avg_buy_price_modified": True, "unit_currency": "KRW"}}, "krw_available": krw, "sandbox": True}

    with get_db() as db:
        def get_key(key_name):
            row = db.execute(
                sel(BotConfig).where(
                    BotConfig.key == key_name,
                    BotConfig.user_id == user_id
                )
            ).scalar_one_or_none()
            return decrypt(row.value) if row else None
        access = get_key("UPBIT_ACCESS_KEY")
        secret = get_key("UPBIT_SECRET_KEY")
    if not access or not secret:
        return {"balances": {}, "krw_available": 0, "no_key": True}
    from app.exchange.upbit_client import UpbitClient as UC
    uc = UC(access_key=access, secret_key=secret)
    balances = uc.get_balances()
    krw = uc.get_krw_balance()
    return {"balances": balances, "krw_available": krw}


@router.get("/positions")
def get_positions(user=Depends(get_current_user)):
    from app.core.crypto import decrypt
    from app.db.models import BotConfig
    from sqlalchemy import select as sel
    user_id = user["user_id"]

    if user.get("is_dry_run"):
        import psycopg2, requests as req2
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            sql = (
                "SELECT symbol, "
                "SUM(CASE WHEN side='BUY' AND status='FILLED' THEN amount_krw ELSE 0 END), "
                "SUM(CASE WHEN side='BUY' AND status='FILLED' THEN amount_krw/price ELSE 0 END), "
                "SUM(CASE WHEN side='SELL' AND status='FILLED' THEN amount_krw/price ELSE 0 END) "
                "FROM sandbox_orders WHERE user_id = %s AND status = 'FILLED' GROUP BY symbol"
            )
            cur.execute(sql, (user_id,))
            rows = cur.fetchall()
            cur.close()
            conn.close()
            symbols = [r[0] for r in rows]
            ticker_map = {}
            if symbols:
                ticker_rows = []
                try:
                    r2 = req2.get("https://api.upbit.com/v1/ticker?markets=" + ",".join(symbols), timeout=5)
                    ticker_rows = r2.json()
                except (requests.RequestException, ValueError, TypeError):
                    ticker_rows = []
                for t in ticker_rows:
                    if isinstance(t, dict):
                        ticker_map[t["market"]] = float(t.get("trade_price", 0))
            korean_map = {}
            try:
                kr = req2.get("https://api.upbit.com/v1/market/all?isDetails=false", timeout=5)
                korean_map = {m["market"]: m.get("korean_name", "") for m in kr.json()}
            except (requests.RequestException, ValueError, TypeError):
                korean_map = {}
            positions = []
            for row in rows:
                symbol, buy_amt, qty, sold_qty = row
                net_qty = float(qty) - float(sold_qty)
                if net_qty <= 0.0001:
                    continue
                avg_price = float(buy_amt) / float(qty) if float(qty) > 0 else 0
                current_price = ticker_map.get(symbol, 0)
                pnl_pct = (current_price - avg_price) / avg_price * 100 if avg_price > 0 else 0
                eval_amount = net_qty * current_price
                invest_amount = net_qty * avg_price
                positions.append({
                    "symbol": symbol,
                    "currency": symbol.replace("KRW-", ""),
                    "korean_name": korean_map.get(symbol, symbol.replace("KRW-", "")),
                    "qty": round(net_qty, 4),
                    "avg_price": round(avg_price, 2),
                    "current_price": current_price,
                    "pnl_pct": round(pnl_pct, 2),
                    "eval_amount": round(eval_amount, 0),
                    "invest_amount": round(invest_amount, 0),
                    "pnl_amount": round(eval_amount - invest_amount, 0),
                    "orders": [],
                    "sandbox": True
                })
            positions.sort(key=lambda x: x["eval_amount"], reverse=True)
            return {"positions": positions}
        except Exception as e:
            print(f"[SANDBOX] 포지션 오류: {e}")
            return {"positions": []}

    with get_db() as db:
        def get_key(key_name):
            row = db.execute(
                sel(BotConfig).where(
                    BotConfig.key == key_name,
                    BotConfig.user_id == user_id
                )
            ).scalar_one_or_none()
            return decrypt(row.value) if row else None
        access = get_key("UPBIT_ACCESS_KEY")
        secret = get_key("UPBIT_SECRET_KEY")
    if not access or not secret:
        return {"positions": [], "no_key": True}
    from app.exchange.upbit_client import UpbitClient as UC
    uc = UC(access_key=access, secret_key=secret)
    balances = uc.get_balances()
    if not balances:
        return {"positions": []}
    symbols = [f"KRW-{b}" for b in balances.keys() if b != "KRW"]
    if not symbols:
        return {"positions": []}
    ticker_map = {}
    for i in range(0, len(symbols), 100):
        chunk = symbols[i:i+100]
        markets = ",".join(chunk)
        ticker_rows = []
        try:
            r = requests.get(f"https://api.upbit.com/v1/ticker?markets={markets}", timeout=5)
            ticker_rows = r.json()
        except (requests.RequestException, ValueError, TypeError):
            ticker_rows = []
        for t in ticker_rows:
            if isinstance(t, dict):
                ticker_map[t["market"]] = t
    positions = []
    for currency, b in balances.items():
        if currency == "KRW":
            continue
        qty = float(b.get("balance", 0)) + float(b.get("locked", 0))
        if qty <= 0:
            continue
        avg_price = float(b.get("avg_buy_price", 0))
        symbol = f"KRW-{currency}"
        ticker = ticker_map.get(symbol, {})
        current_price = float(ticker.get("trade_price", 0))
        pnl_pct = (current_price - avg_price) / avg_price * 100 if avg_price > 0 and current_price > 0 else 0
        eval_amount = qty * current_price
        invest_amount = qty * avg_price
        try:
            kr = requests.get("https://api.upbit.com/v1/market/all?isDetails=false", timeout=5)
            korean_map = {m["market"]: m.get("korean_name", "") for m in kr.json()}
        except Exception:
            korean_map = {}
        positions.append({
            "symbol": symbol,
            "currency": currency,
            "korean_name": korean_map.get(symbol, currency),
            "qty": qty,
            "avg_price": avg_price,
            "current_price": current_price,
            "pnl_pct": round(pnl_pct, 2),
            "eval_amount": round(eval_amount, 0),
            "invest_amount": round(invest_amount, 0),
            "pnl_amount": round(eval_amount - invest_amount, 0),
        })
    with get_db() as db:
        for pos in positions:
            orders = db.execute(
                sel(PlannedOrder).where(
                    PlannedOrder.symbol == pos["symbol"],
                    PlannedOrder.status == "FILLED",
                    PlannedOrder.side == "BUY",
                    PlannedOrder.user_id == user_id,
                )
            ).scalars().all()
            current = pos["current_price"]
            pos["orders"] = [
                {
                    "id": o.id,
                    "price": float(o.price),
                    "amount_krw": float(o.amount_krw),
                    "pnl_pct": round((current - float(o.price)) / float(o.price) * 100, 2) if float(o.price) > 0 else 0,
                    "pnl_amount": round((current - float(o.price)) / float(o.price) * float(o.amount_krw), 0) if float(o.price) > 0 else 0,
                    "filled_at": str(o.filled_at) if o.filled_at else str(o.updated_at),
                }
                for o in orders
            ]
    # 그리드 전략 BUY_FILLED 포지션 합산
    try:
        import psycopg2 as pg2
        conn2 = pg2.connect(DB_URL)
        cur2 = conn2.cursor()
        cur2.execute("""
            SELECT go.symbol,
                SUM(go.amount_krw) as buy_amt,
                SUM(go.qty) as qty
            FROM grid_orders go
            JOIN grid_strategies gs ON gs.id = go.strategy_id
            WHERE go.user_id = %s
              AND go.status IN ('BUY_FILLED', 'SELL_ORDERED')
              AND gs.exchange = 'upbit'
            GROUP BY go.symbol
        """, (user_id,))
        grid_rows = cur2.fetchall()
        cur2.close()
        conn2.close()

        for grow in grid_rows:
            gsymbol, gbuy_amt, gqty = grow
            gqty = float(gqty)
            gbuy_amt = float(gbuy_amt)
            if gqty <= 0.0001:
                continue
            gavg = gbuy_amt / gqty
            gcurrent = ticker_map.get(gsymbol, 0)
            geval = gqty * gcurrent
            ginvest = gqty * gavg
            gpnl_pct = (gcurrent - gavg) / gavg * 100 if gavg > 0 else 0

            # 기존 포지션에 있으면 합산, 없으면 추가
            existing = next((p for p in positions if p["symbol"] == gsymbol), None)
            if existing:
                total_qty = existing["qty"] + gqty
                total_invest = existing["invest_amount"] + ginvest
                new_avg = total_invest / total_qty if total_qty > 0 else 0
                new_eval = total_qty * gcurrent
                existing["qty"] = round(total_qty, 4)
                existing["avg_price"] = round(new_avg, 2)
                existing["invest_amount"] = round(total_invest, 0)
                existing["eval_amount"] = round(new_eval, 0)
                existing["pnl_amount"] = round(new_eval - total_invest, 0)
                existing["pnl_pct"] = round((gcurrent - new_avg) / new_avg * 100 if new_avg > 0 else 0, 2)
            else:
                positions.append({
                    "symbol": gsymbol,
                    "currency": gsymbol.replace("KRW-", ""),
                    "korean_name": korean_map.get(gsymbol, gsymbol.replace("KRW-", "")),
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
        print(f"[GRID] 포지션 합산 오류: {e}")

    positions.sort(key=lambda x: x["eval_amount"], reverse=True)
    return {"positions": positions}


@router.post("/orders")
def create_order(req: OrderRequest, user=Depends(get_current_user)):
    _validate_upbit_order_request(req)
    side = req.side.upper()
    is_market = (req.note or "") == "시장가"
    min_amount = 5000 if (is_market and side == "SELL") else 5500

    if req.amount_krw < min_amount:
        raise HTTPException(400, f"최소 주문금액 {min_amount:,}원")

    # DRY_RUN → sandbox_orders에 저장
    if user.get("is_dry_run"):
        import psycopg2
        user_id = user["user_id"]
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            cur.execute("SELECT krw_balance FROM sandbox_balances WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            krw = float(row[0]) if row else 0
            if side == "BUY" and krw < req.amount_krw:
                raise HTTPException(400, f"잔고 부족 (보유: {krw:,.0f}원)")
            cur.execute(
                "INSERT INTO sandbox_orders (user_id, symbol, side, price, amount_krw, status, note) VALUES (%s, %s, %s, %s, %s, 'FILLED', %s) RETURNING id, created_at",
                (user_id, req.symbol, side, req.price, req.amount_krw, req.note or "sandbox")
            )
            order_row = cur.fetchone()
            if side == "BUY":
                cur.execute("UPDATE sandbox_balances SET krw_balance = krw_balance - %s WHERE user_id = %s", (req.amount_krw, user_id))
            cur.execute(
                """INSERT INTO activity_logs
                   (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, strategy_type, price, amount_krw, created_at)
                   VALUES (%s, 'manual_order', %s, 'upbit', %s, %s, 'FILLED', '체결완료', '수동', %s, %s, NOW())""",
                (user_id, req.symbol, side, "매수" if side == "BUY" else "매도", req.price, req.amount_krw)
            )
            conn.commit()
            cur.close()
            conn.close()
            return {"id": order_row[0], "symbol": req.symbol, "side": side,
                    "price": req.price, "amount_krw": req.amount_krw, "status": "FILLED",
                    "note": "sandbox", "created_at": str(order_row[1]), "sandbox": True}
        except HTTPException:
            raise
        except Exception as e:
            print(f"[SANDBOX][ORDER] 주문 오류: {e}")
            raise HTTPException(500, "요청 처리 중 오류가 발생했습니다")

    with get_db() as db:
        order = create_planned_order(
            db=db,
            symbol=req.symbol,
            side=side,
            price=req.price,
            amount_krw=req.amount_krw,
            idempotency_key=str(uuid.uuid4()),
            note=req.note,
            user_id=user["user_id"],
            exchange="upbit",
        )
        if not order:
            raise HTTPException(400, "주문 생성 실패 (한도 초과 또는 중복)")
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
def list_orders(user=Depends(get_current_user), symbol: Optional[str] = None, status: Optional[str] = None, exchange: Optional[str] = None):
    if user.get("is_dry_run"):
        import psycopg2
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            q = "SELECT id, symbol, side, price, amount_krw, status, note, created_at, updated_at FROM sandbox_orders WHERE user_id = %s"
            params = [user["user_id"]]
            if symbol:
                q += " AND symbol = %s"; params.append(symbol)
            if status:
                q += " AND status = %s"; params.append(status)
            q += " ORDER BY created_at DESC LIMIT 200"
            cur.execute(q, params)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return {"orders": [{"id": r[0], "symbol": r[1], "side": r[2], "price": float(r[3]),
                "amount_krw": float(r[4]), "status": r[5], "exchange_order_id": None,
                "filled_qty": 0, "filled_amount_krw": 0, "note": r[6],
                "created_at": str(r[7]), "updated_at": str(r[8])} for r in rows]}
        except Exception:
            return {"orders": []}
    with get_db() as db:
        q = select(PlannedOrder).where(PlannedOrder.user_id == user["user_id"])
        if symbol:
            q = q.where(PlannedOrder.symbol == symbol)
        if status:
            q = q.where(PlannedOrder.status == status)
        if exchange:
            q = q.where(PlannedOrder.exchange == exchange)
        q = q.order_by(PlannedOrder.created_at.desc()).limit(200)
        orders = db.execute(q).scalars().all()
        return {"orders": [
            {
                "id": o.id,
                "symbol": o.symbol,
                "side": o.side,
                "price": float(o.price),
                "amount_krw": float(o.amount_krw),
                "status": o.status,
                "exchange_order_id": o.exchange_order_id,
                "filled_qty": float(o.filled_qty or 0),
                "filled_amount_krw": float(o.filled_amount_krw or 0),
                "note": o.note,
                "created_at": str(o.created_at),
                "updated_at": str(o.updated_at),
            }
            for o in orders
        ]}


@router.delete("/orders/{order_id}")
def cancel_order(order_id: int, user=Depends(get_current_user)):
    # DRY_RUN → sandbox_orders 취소
    if user.get("is_dry_run"):
        import psycopg2
        try:
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            cur.execute(
                "UPDATE sandbox_orders SET status='CANCELLED', updated_at=NOW() WHERE id=%s AND user_id=%s AND status NOT IN ('CANCELLED')",
                (order_id, user["user_id"])
            )
            updated = cur.rowcount > 0
            conn.commit()
            cur.close()
            conn.close()
            if not updated:
                raise HTTPException(400, "취소 실패")
            return {"success": True, "order_id": order_id}
        except HTTPException:
            raise
        except Exception as e:
            print(f"[SANDBOX][ORDER] 취소 오류: {e}")
            raise HTTPException(500, "요청 처리 중 오류가 발생했습니다")
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
            raise HTTPException(400, "취소 실패 (이미 제출됐거나 존재하지 않는 주문)")
        return {"success": True, "order_id": order_id}


@router.get("/orders/{order_id}/history")
def order_history(order_id: int, user=Depends(get_current_user)):
    with get_db() as db:
        logs = db.execute(
            select(StateTransitionLog)
            .where(StateTransitionLog.planned_order_id == order_id)
            .order_by(StateTransitionLog.created_at)
        ).scalars().all()
        return {"history": [
            {
                "from": l.from_status,
                "to": l.to_status,
                "reason": l.reason,
                "extra": l.extra,
                "at": str(l.created_at),
            }
            for l in logs
        ]}


@router.post("/activity/log")
def post_activity_log(req: dict, user=Depends(get_current_user)):
    """활동 로그 저장"""
    import psycopg2 as pg2
    payload = _validate_activity_log_payload(req)
    try:
        conn = pg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO activity_logs (user_id, event_type, symbol, exchange, side, status, status_ko, side_ko, strategy_type, price, amount_krw)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user["user_id"],
            payload["event_type"],
            payload["symbol"],
            payload["exchange"],
            payload["side"],
            payload["status"],
            payload["status_ko"],
            payload["side_ko"],
            payload["strategy_type"],
            payload["price"],
            payload["amount_krw"],
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {"ok": True}
    except Exception as e:
        print(f"[ACTIVITY LOG] 저장 실패: {e}")
        raise HTTPException(500, "요청 처리 중 오류가 발생했습니다")

@router.get("/activity")
def get_activity(user=Depends(get_current_user), limit: int = 50):
    """실시간 활동 로그 — activity_logs 테이블에서 읽기"""
    import psycopg2 as pg2
    import json
    try:
        conn = pg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT event_type, symbol, exchange, side, side_ko, status, status_ko, strategy_type, price, amount_krw, created_at
            FROM activity_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (user["user_id"], limit))
        rows = cur.fetchall()
        cur.execute("""
            SELECT event, symbol, detail, created_at
            FROM audit_logs
            WHERE event = 'order_limit_exceeded'
            ORDER BY created_at DESC
            LIMIT %s
        """, (limit,))
        audit_rows = cur.fetchall()
        cur.close()
        conn.close()
        logs = []
        for r in rows:
            log = {
                "at": str(r[10]),
                "event_type": r[0],
                "symbol": r[1],
                "exchange": r[2],
                "side": r[3],
                "side_ko": r[4],
                "status": r[5],
                "status_ko": r[6],
                "strategy_type": r[7],
                "price": float(r[8]) if r[8] else None,
                "amount_krw": float(r[9]) if r[9] else None,
            }
            if r[5] == "FAILED":
                log["failure_reason"] = r[6] or None
            logs.append(log)
        for r in audit_rows:
            status_ko = "주문 한도 초과"
            detail = {}
            try:
                detail = json.loads(r[2]) if r[2] else {}
                if detail.get("current") is not None and detail.get("max") is not None:
                    status_ko += f" ({detail.get('current')}/{detail.get('max')})"
            except (TypeError, ValueError, json.JSONDecodeError):
                detail = {}
            logs.append({
                "at": str(r[3]),
                "event_type": "audit",
                "symbol": r[1],
                "exchange": "",
                "side": "",
                "side_ko": "주문",
                "status": "FAILED",
                "status_ko": status_ko,
                "strategy_type": "ALL",
                "price": None,
                "amount_krw": None,
                "failure_reason": status_ko,
            })
        logs.sort(key=lambda l: l["at"], reverse=True)
        return {"logs": logs[:limit]}
    except Exception as e:
        print(f"[ACTIVITY] 조회 오류: {e}")
        return {"logs": []}


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


@router.post("/activity/summary")
def add_activity_summary(req: ActivitySummaryRequest, user=Depends(get_current_user)):
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'summary', %s, %s, %s, %s, %s)",
            (user["user_id"], req.symbol or 'SYSTEM', req.exchange or 'SYSTEM', req.status, req.status_ko, req.strategy_type or '시스템')
        )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        print(f"[ACTIVITY][SUMMARY] 저장 오류: {e}")
        raise HTTPException(500, "요청 처리 중 오류가 발생했습니다")
    finally:
        cur.close()
        conn.close()
