import asyncio
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import PlannedOrder
from app.db.order_manager import transition, get_planned_orders
from app.exchange.upbit_client import UpbitClient
from app.core.config import MAX_ACTIVE_ORDERS_PER_SYMBOL, DRY_RUN
from app.auth.auth import get_user_dry_run
from sqlalchemy import select, update, text
from app.db.order_manager import ACTIVE_STATUSES


def now_utc():
    return datetime.now(timezone.utc)


class OrderGateway:
    def __init__(self, client: UpbitClient, interval_sec: int = 5, user_id: int = None):
        self.client = client
        self.interval_sec = interval_sec
        self.user_id = user_id
        self._running = False

    def _get_active_count(self, db, symbol: str) -> int:
        q = select(PlannedOrder).where(
            PlannedOrder.symbol == symbol,
            PlannedOrder.status.in_(ACTIVE_STATUSES),
            PlannedOrder.exchange == "upbit",
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
        if self.user_id is not None:
            from sqlalchemy import select as sel
            planned = db.execute(
                sel(PlannedOrder).where(
                    PlannedOrder.symbol == symbol,
                    PlannedOrder.status == "PLANNED",
                    PlannedOrder.user_id == self.user_id,
                    PlannedOrder.exchange == "upbit",
                )
            ).scalars().all()
        else:
            planned = get_planned_orders(db, symbol)
        if not planned:
            return
        planned_buy  = sorted([o for o in planned if o.side == "BUY"],  key=lambda x: float(x.price))
        planned_sell = sorted([o for o in planned if o.side == "SELL"], key=lambda x: float(x.price), reverse=True)
        candidates = planned_buy[:slots] + planned_sell[:slots]
        for order in candidates:
            if slots <= 0:
                break
            if not transition(db, order, "QUEUED", "gateway_queued"):
                continue
            db.flush()
            user_dry_run = get_user_dry_run(self.user_id) if self.user_id else False
            if DRY_RUN or user_dry_run:
                exchange_id = f"DRYRUN-{order.id}-{order.side}"
                print(f"[GATEWAY][DRYRUN] 가상 주문: {order.id} {order.symbol} {order.side} (user_dry_run={user_dry_run})")
            elif order.side == "BUY":
                exchange_id = self.client.submit_buy_order(
                    order.symbol, float(order.price), float(order.amount_krw)
                )
            else:
                qty = float(order.amount_krw) / float(order.price)
                exchange_id = self.client.submit_sell_order(
                    order.symbol, float(order.price), qty
                )
            if exchange_id is None:
                transition(db, order, "FAILED", "exchange_submit_failed")
                db.execute(text("""
                    INSERT INTO activity_logs
                    (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                    VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'FAILED', '실패', :price, :amount_krw, NOW())
                """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                print(f"[GATEWAY] 제출 실패 -> FAILED: {order.id} {order.symbol}")
                continue
            order.exchange_order_id = exchange_id
            if not transition(db, order, "SUBMITTED", "exchange_submitted",
                              extra={"exchange_id": exchange_id}):
                order.status = "UNKNOWN"
                print(f"[GATEWAY] 전이 실패 -> UNKNOWN: {order.id}")
                continue
            db.execute(text("""
                INSERT INTO activity_logs
                (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'SUBMITTED', '제출완료', :price, :amount_krw, NOW())
            """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
            print(f"[GATEWAY] 제출 성공: {order.id} {order.symbol} {order.side} {order.price} -> {exchange_id}")
            slots -= 1

    async def run_once(self):
        with get_db() as db:
            q = select(PlannedOrder.symbol).where(
                PlannedOrder.status == "PLANNED",
                PlannedOrder.exchange == "upbit",
            )
            if self.user_id is not None:
                q = q.where(PlannedOrder.user_id == self.user_id)
            symbols = db.execute(q.distinct()).scalars().all()
            for symbol in symbols:
                try:
                    self._process_symbol(db, symbol)
                except Exception as e:
                    print(f"[GATEWAY] 오류 {symbol}: {e}")

    async def start(self):
        self._running = True
        print(f"[GATEWAY] 시작 -- 주기={self.interval_sec}초")
        with get_db() as db:
            result = db.execute(
                update(PlannedOrder)
                .where(
                    PlannedOrder.status == "QUEUED",
                    PlannedOrder.exchange == "upbit",
                )
                .values(status="PLANNED")
            )
            if result.rowcount > 0:
                print(f"[GATEWAY] 재시작 복구: QUEUED {result.rowcount}개 -> PLANNED")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[GATEWAY] 루프 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[GATEWAY] 종료")
