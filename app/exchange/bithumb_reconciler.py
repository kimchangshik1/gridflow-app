import asyncio
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import PlannedOrder
from app.db.order_manager import transition
from app.exchange.bithumb_client import BithumbClient
from sqlalchemy import select, text


def now_utc():
    return datetime.now(timezone.utc)


class BithumbReconciler:
    def __init__(self, client: BithumbClient, interval_sec: int = 30, user_id: int = None):
        self.client = client
        self.interval_sec = interval_sec
        self.user_id = user_id
        self._running = False

    async def run_once(self):
        print(f"[BITHUMB][RECONCILE] 체크 시작: {now_utc().strftime('%H:%M:%S')}")
        with get_db() as db:
            orders = db.execute(
                select(PlannedOrder).where(
                    PlannedOrder.status.in_(["SUBMITTED", "ACTIVE", "PARTIALLY_FILLED"]),
                    PlannedOrder.exchange_order_id.isnot(None),
                    PlannedOrder.exchange == "bithumb",
                    *([PlannedOrder.user_id == self.user_id] if self.user_id is not None else []),
                )
            ).scalars().all()

            for order in orders:
                try:
                    result = self.client.get_order(order.exchange_order_id, order.symbol)
                    if result is None:
                        if transition(db, order, "CANCELLED", reason="bithumb_order_not_found"):
                            db.execute(text("""
                                INSERT INTO activity_logs
                                (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                                VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'CANCELLED', '취소', :price, :amount_krw, NOW())
                            """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                        print(f"[BITHUMB][RECONCILE] 주문 없음 → CANCELLED: {order.id}")
                        continue
                    state = result.get("state", "")
                    if state == "done":
                        filled_qty = float(result.get("executed_volume", 0))
                        order.filled_qty = filled_qty
                        if transition(db, order, "FILLED", reason="bithumb_reconcile_filled"):
                            db.execute(text("""
                                INSERT INTO activity_logs
                                (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                                VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'FILLED', '체결완료', :price, :amount_krw, NOW())
                            """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                        print(f"[BITHUMB][RECONCILE] 체결 → FILLED: {order.id}")
                    elif state == "cancel":
                        if transition(db, order, "CANCELLED", reason="bithumb_reconcile_cancel"):
                            db.execute(text("""
                                INSERT INTO activity_logs
                                (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                                VALUES (:user_id, 'manual_order', :symbol, 'bithumb', :side, :side_ko, 'CANCELLED', '취소', :price, :amount_krw, NOW())
                            """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                        print(f"[BITHUMB][RECONCILE] 취소 → CANCELLED: {order.id}")
                    elif state == "wait":
                        if order.status == "SUBMITTED":
                            transition(db, order, "ACTIVE", reason="bithumb_reconcile_active")
                            print(f"[BITHUMB][RECONCILE] 미체결 → ACTIVE: {order.id}")
                except Exception as e:
                    print(f"[BITHUMB][RECONCILE] 오류 {order.id}: {e}")
        print(f"[BITHUMB][RECONCILE] 체크 완료")

    async def start(self):
        self._running = True
        print(f"[BITHUMB][RECONCILE] 시작 — 주기={self.interval_sec}초")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[BITHUMB][RECONCILE] 루프 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[BITHUMB][RECONCILE] 종료")
