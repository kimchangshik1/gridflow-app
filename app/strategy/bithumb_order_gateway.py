import asyncio
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN, ROUND_UP
from app.db.database import get_db
from app.db.models import PlannedOrder
from app.db.order_manager import transition, get_planned_orders
from app.exchange.bithumb_client import BithumbClient
from app.core.config import MAX_ACTIVE_ORDERS_PER_SYMBOL, DRY_RUN
from sqlalchemy import select, update, text
from app.db.order_manager import ACTIVE_STATUSES


def now_utc():
    return datetime.now(timezone.utc)


def _activity_status_ko(message: str) -> str:
    return str(message)[:30]


def _decimal_str(value: Decimal, places: int = 8) -> str:
    quant = Decimal("1").scaleb(-places)
    rendered = format(value.quantize(quant), "f")
    rendered = rendered.rstrip("0").rstrip(".")
    return rendered or "0"


def _build_bithumb_buy_volume(amount_krw: float, price: float) -> tuple[Decimal, str]:
    amount_dec = Decimal(str(amount_krw))
    price_dec = Decimal(str(price))
    unit = Decimal("0.00000001")
    raw_qty = amount_dec / price_dec

    qty = raw_qty.quantize(unit, rounding=ROUND_DOWN)
    actual_total = qty * price_dec
    if actual_total < amount_dec:
        qty = raw_qty.quantize(unit, rounding=ROUND_UP)

    return qty, _decimal_str(qty, places=8)


class BithumbOrderGateway:
    def __init__(self, client: BithumbClient, interval_sec: int = 5, user_id: int = None):
        self.client = client
        self.interval_sec = interval_sec
        self.user_id = user_id
        self._running = False

    def _get_active_count(self, db, symbol: str) -> int:
        q = select(PlannedOrder).where(
            PlannedOrder.symbol == symbol,
            PlannedOrder.status.in_(ACTIVE_STATUSES),
            PlannedOrder.note.like("%bithumb%"),
        )
        if self.user_id is not None:
            q = q.where(PlannedOrder.user_id == self.user_id)
        orders = db.execute(q).scalars().all()
        return len(orders)

    def _process_symbol(self, db, symbol: str):
        active_count = self._get_active_count(db, symbol)
        slots = MAX_ACTIVE_ORDERS_PER_SYMBOL - active_count
        if slots <= 0:
            return

        planned = db.execute(
            select(PlannedOrder).where(
                PlannedOrder.symbol == symbol,
                PlannedOrder.status == "PLANNED",
                PlannedOrder.note.like("%bithumb%"),
            )
        ).scalars().all()

        if not planned:
            return

        planned_buy  = sorted([o for o in planned if o.side == "BUY"],  key=lambda x: float(x.price))
        planned_sell = sorted([o for o in planned if o.side == "SELL"], key=lambda x: float(x.price), reverse=True)
        candidates = planned_buy[:slots] + planned_sell[:slots]

        for order in candidates:
            if slots <= 0:
                break
            if not transition(db, order, "QUEUED", "bithumb_gateway_queued"):
                continue
            db.flush()
            print(f"[BITHUMB][QUEUE] order_id={order.id}")

            if DRY_RUN:
                exchange_id = f"DRYRUN-BITHUMB-{order.id}-{order.side}"
                print(f"[BITHUMB][GATEWAY][DRYRUN] 가상 주문: {order.id} {order.symbol} {order.side}")
            elif order.side == "BUY":
                qty_dec, qty_text = _build_bithumb_buy_volume(float(order.amount_krw), float(order.price))
                actual_total = qty_dec * Decimal(str(order.price))
                if actual_total < Decimal("5500"):
                    transition(db, order, "FAILED", "under_min_total")
                    db.execute(text("""
                        INSERT INTO activity_logs
                        (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                        VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'FAILED', :status_ko, :price, :amount_krw, NOW())
                    """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "status_ko": _activity_status_ko("최소 주문금액 미달"), "price": order.price, "amount_krw": order.amount_krw})
                    print(f"[BITHUMB][GATEWAY] 최소금액 미달 -> FAILED: {order.id}")
                    continue
                try:
                    result = self.client._bithumb.buy_limit_order(order.symbol, float(order.price), qty_text)
                    if not result:
                        self.client.last_order_error = "빗썸 응답 없음"
                        exchange_id = None
                    else:
                        exchange_id = str(result.get("uuid") or result.get("order_id") or "")
                        if not exchange_id:
                            self.client.last_order_error = f"주문 ID 없음: {result}"
                            print(f"[BITHUMB][ERROR] 주문 ID 없음: {result}")
                            exchange_id = None
                        else:
                            print(
                                f"[BITHUMB][ORDER] 매수 제출: {order.symbol} "
                                f"price={float(order.price)} amount_krw={float(order.amount_krw)} volume={qty_text} -> {exchange_id}"
                            )
                except Exception as buy_exc:
                    self.client.last_order_error = str(buy_exc)
                    print(f"[BITHUMB][ERROR] 매수 주문 실패 {order.symbol}: {buy_exc}")
                    exchange_id = None
            else:
                qty = float(order.amount_krw) / float(order.price)
                try:
                    if "시장가" in (order.note or ""):
                        exchange_id = self.client.submit_market_sell_order(order.symbol, qty)
                    else:
                        exchange_id = self.client.submit_sell_order(
                            order.symbol, float(order.price), qty
                        )
                except Exception as sell_exc:
                    transition(db, order, "FAILED", "bithumb_sell_exception")
                    db.execute(text("""
                        INSERT INTO activity_logs
                        (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                        VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'FAILED', :status_ko, :price, :amount_krw, NOW())
                    """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매도", "status_ko": _activity_status_ko(f"매도 예외: {sell_exc}"), "price": order.price, "amount_krw": order.amount_krw})
                    print(f"[BITHUMB][GATEWAY] 매도 예외 -> FAILED: {order.id} / {sell_exc}")
                    continue

            if exchange_id is None:
                transition(db, order, "FAILED", "bithumb_submit_failed")
                status_ko = _activity_status_ko("빗썸 주문 제출 실패")
                db.execute(text("""
                    INSERT INTO activity_logs
                    (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                    VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'FAILED', :status_ko, :price, :amount_krw, NOW())
                """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "status_ko": status_ko, "price": order.price, "amount_krw": order.amount_krw})
                print(f"[BITHUMB][GATEWAY] 제출 실패 -> FAILED: {order.id}")
                continue

            order.exchange_order_id = exchange_id
            if not transition(db, order, "SUBMITTED", "bithumb_submitted",
                              extra={"exchange_id": exchange_id}):
                order.status = "UNKNOWN"
                print(f"[BITHUMB][GATEWAY] 전이 실패 -> UNKNOWN: {order.id}")
                continue
            print(f"[BITHUMB][SUBMIT] order_id={order.id}")
            db.execute(text("""
                INSERT INTO activity_logs
                (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'SUBMITTED', '제출완료', :price, :amount_krw, NOW())
            """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})

            print(f"[BITHUMB][GATEWAY] 제출 성공: {order.id} {order.symbol} {order.side} -> {exchange_id}")
            slots -= 1

    async def run_once(self):
        with get_db() as db:
            q = select(PlannedOrder.symbol).where(
                PlannedOrder.status == "PLANNED",
                PlannedOrder.note.like("%bithumb%"),
            )
            if self.user_id is not None:
                q = q.where(PlannedOrder.user_id == self.user_id)
            symbols = db.execute(q.distinct()).scalars().all()
            for symbol in symbols:
                try:
                    self._process_symbol(db, symbol)
                except Exception as e:
                    print(f"[BITHUMB][GATEWAY] 오류 {symbol}: {e}")

    async def start(self):
        self._running = True
        print(f"[BITHUMB][GATEWAY] 시작 -- 주기={self.interval_sec}초")
        with get_db() as db:
            result = db.execute(
                update(PlannedOrder)
                .where(
                    PlannedOrder.status == "QUEUED",
                    PlannedOrder.note.like("%bithumb%"),
                )
                .values(status="PLANNED")
            )
            if result.rowcount > 0:
                print(f"[BITHUMB][GATEWAY] 재시작 복구: {result.rowcount}개 -> PLANNED")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[BITHUMB][GATEWAY] 루프 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[BITHUMB][GATEWAY] 종료")
