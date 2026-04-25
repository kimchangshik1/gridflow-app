import asyncio
import json
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import PlannedOrder
from app.db.order_manager import transition, get_reconcile_needed, get_active_orders
from app.exchange.upbit_client import UpbitClient
from sqlalchemy import select, text


def now_utc():
    return datetime.now(timezone.utc)


class Reconciler:
    """
    WebSocket과 REST 정합성 체크
    - UNKNOWN 주문 해소
    - ACTIVE 주문 실제 체결 여부 확인
    - 거래소 주문과 DB 주문 매핑 검증
    """
    def __init__(self, client: UpbitClient, interval_sec: int = 30, user_id: int = None):
        self.client = client
        self.interval_sec = interval_sec
        self.user_id = user_id
        self._running = False

    async def _check_unknown_orders(self):
        """UNKNOWN 상태 주문 해소"""
        with get_db() as db:
            if self.user_id is not None:
                from sqlalchemy import select as sel
                orders = db.execute(
                    sel(PlannedOrder).where(
                        PlannedOrder.status.in_(["UNKNOWN", "RECONCILE_NEEDED"]),
                        PlannedOrder.user_id == self.user_id,
                    )
                ).scalars().all()
            else:
                orders = get_reconcile_needed(db)
            if not orders:
                return

            for order in orders:
                if not order.exchange_order_id:
                    # 거래소 ID 없으면 제출 실패로 처리
                    transition(db, order, "CANCELLED",
                        reason="reconcile_no_exchange_id")
                    print(f"[RECONCILE] 거래소ID 없음 → CANCELLED: {order.id}")
                    continue

                # 거래소에서 실제 주문 상태 조회
                exchange_order = self.client.get_order(order.exchange_order_id)

                if exchange_order is None:
                    # 조회 실패 — 불확실 상태 유지
                    print(f"[RECONCILE] 조회 실패 — UNKNOWN 유지: {order.id}")
                    continue

                state = exchange_order.get("state", "")

                if state == "done":
                    filled_qty = float(exchange_order.get("executed_volume", 0))
                    if transition(db, order, "FILLED",
                        reason="reconcile_confirmed",
                        extra={"exchange_state": state, "filled_qty": filled_qty}):
                        db.execute(text("""
                            INSERT INTO activity_logs
                            (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                            VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'FILLED', '체결완료', :price, :amount_krw, NOW())
                        """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                    order.filled_qty = filled_qty
                    print(f"[RECONCILE] 체결 확인 → FILLED: {order.id}")

                elif state == "cancel":
                    if transition(db, order, "CANCELLED",
                        reason="reconcile_confirmed_cancel"):
                        db.execute(text("""
                            INSERT INTO activity_logs
                            (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                            VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'CANCELLED', '취소', :price, :amount_krw, NOW())
                        """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                    print(f"[RECONCILE] 취소 확인 → CANCELLED: {order.id}")

                elif state == "wait":
                    transition(db, order, "ACTIVE",
                        reason="reconcile_confirmed_active")
                    print(f"[RECONCILE] 활성 확인 → ACTIVE: {order.id}")

                elif state == "watch":
                    # 부분체결 상태
                    filled_qty = float(exchange_order.get("executed_volume", 0))
                    filled_krw = float(exchange_order.get("executed_funds", 0))
                    order.filled_qty = filled_qty
                    order.filled_amount_krw = filled_krw
                    if transition(db, order, "PARTIALLY_FILLED",
                        reason="reconcile_partial",
                        extra={"filled_qty": filled_qty, "filled_krw": filled_krw}):
                        db.execute(text("""
                            INSERT INTO activity_logs
                            (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                            VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'PARTIALLY_FILLED', '부분체결', :price, :amount_krw, NOW())
                        """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                    print(f"[RECONCILE] 부분체결 확인 → PARTIALLY_FILLED: {order.id}")

                else:
                    # 알 수 없는 상태 — RECONCILE_NEEDED 유지
                    print(f"[RECONCILE] 알 수 없는 상태={state} — 유지: {order.id}")

    async def _check_active_orders(self):
        """ACTIVE 주문 실제 체결 여부 REST로 확인"""
        with get_db() as db:
            # ACTIVE 상태 주문 중 exchange_order_id 있는 것만
            from sqlalchemy import select
            from app.db.models import PlannedOrder
            orders = db.execute(
                select(PlannedOrder).where(
                    PlannedOrder.status.in_(["SUBMITTED", "ACTIVE", "PARTIALLY_FILLED"]),
                    PlannedOrder.exchange_order_id.isnot(None),
                    PlannedOrder.exchange == "upbit",
                    *([PlannedOrder.user_id == self.user_id] if self.user_id is not None else []),
                )
            ).scalars().all()

            for order in orders:
                exchange_order = self.client.get_order(order.exchange_order_id)
                if exchange_order is None:
                    # 조회 실패 → RECONCILE_NEEDED로 격리
                    transition(db, order, "RECONCILE_NEEDED",
                        reason="rest_query_failed")
                    print(f"[RECONCILE] REST 조회 실패 → RECONCILE_NEEDED: {order.id}")
                    continue

                state = exchange_order.get("state", "")
                if state == "done":
                    filled_qty = float(exchange_order.get("executed_volume", 0))
                    order.filled_qty = filled_qty
                    if transition(db, order, "FILLED",
                        reason="rest_confirmed_filled",
                        extra={"filled_qty": filled_qty}):
                        db.execute(text("""
                            INSERT INTO activity_logs
                            (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                            VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'FILLED', '체결완료', :price, :amount_krw, NOW())
                        """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                    print(f"[RECONCILE] REST 체결 확인 → FILLED: {order.id}")

                elif state == "cancel":
                    if transition(db, order, "CANCELLED",
                        reason="rest_confirmed_cancel"):
                        db.execute(text("""
                            INSERT INTO activity_logs
                            (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, price, amount_krw, created_at)
                            VALUES (:user_id, 'manual_order', :symbol, 'upbit', :side, :side_ko, 'CANCELLED', '취소', :price, :amount_krw, NOW())
                        """), {"user_id": order.user_id, "symbol": order.symbol, "side": order.side, "side_ko": "매수" if order.side == "BUY" else "매도", "price": order.price, "amount_krw": order.amount_krw})
                    print(f"[RECONCILE] REST 취소 확인 → CANCELLED: {order.id}")

    async def run_once(self):
        """1회 정합성 체크"""
        print(f"[RECONCILE] 정합성 체크 시작: {now_utc().strftime('%H:%M:%S')}")
        await self._check_unknown_orders()
        await self._check_active_orders()
        print(f"[RECONCILE] 정합성 체크 완료")

    async def start(self):
        """주기적 정합성 체크 루프"""
        self._running = True
        print(f"[RECONCILE] 시작 — 주기={self.interval_sec}초")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[RECONCILE] 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[RECONCILE] 종료")
