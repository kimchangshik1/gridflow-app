import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional
import websockets
from app.db.database import get_db
from app.db.models import PlannedOrder
from app.db.order_manager import transition, get_active_orders
from sqlalchemy import select


def now_utc():
    return datetime.now(timezone.utc)


UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1"


class UpbitWebSocketClient:
    def __init__(self, symbols: list[str]):
        self.symbols = symbols
        self._running = False
        self._ws = None

    def _build_subscribe_message(self) -> str:
        """구독 메시지 생성"""
        return json.dumps([
            {"ticket": str(uuid.uuid4())},
            {
                "type": "trade",
                "codes": self.symbols,
                "isOnlyRealtime": True,
            },
        ])

    async def _handle_trade(self, data: dict):
        """
        체결 메시지 처리
        거래소 체결 → DB 주문 상태 업데이트
        """
        symbol = data.get("code")
        trade_price = float(data.get("trade_price", 0))
        trade_volume = float(data.get("trade_volume", 0))
        ask_bid = data.get("ask_bid")  # ASK=매도 BID=매수

        if not symbol or not trade_price:
            return

        with get_db() as db:
            # 해당 심볼의 ACTIVE 주문 조회
            active_orders = get_active_orders(db, symbol)
            if not active_orders:
                return

            for order in active_orders:
                if order.exchange != "upbit":
                    continue

                # ACTIVE 또는 PARTIALLY_FILLED 상태만 체결 감지
                if order.status not in ("ACTIVE", "PARTIALLY_FILLED"):
                    continue

                # 매수 주문: 현재가가 주문가 이하면 체결 가능
                if order.side == "BUY" and ask_bid == "ASK":
                    if trade_price <= float(order.price):
                        result = transition(
                            db, order, "FILLED",
                            reason="ws_trade_matched",
                            extra={
                                "trade_price": trade_price,
                                "trade_volume": trade_volume,
                            }
                        )
                        if result:
                            print(f"[WS] 매수 체결: {symbol} 가격={trade_price} 주문ID={order.id}")

                # 매도 주문: 현재가가 주문가 이상이면 체결 가능
                elif order.side == "SELL" and ask_bid == "BID":
                    if trade_price >= float(order.price):
                        result = transition(
                            db, order, "FILLED",
                            reason="ws_trade_matched",
                            extra={
                                "trade_price": trade_price,
                                "trade_volume": trade_volume,
                            }
                        )
                        if result:
                            print(f"[WS] 매도 체결: {symbol} 가격={trade_price} 주문ID={order.id}")

    async def _connect(self):
        """WebSocket 연결 및 메시지 수신"""
        while self._running:
            try:
                print(f"[WS] 연결 시도: {len(self.symbols)}개 심볼")
                async with websockets.connect(
                    UPBIT_WS_URL,
                    ping_interval=30,
                    ping_timeout=10,
                ) as ws:
                    self._ws = ws
                    await ws.send(self._build_subscribe_message())
                    print(f"[WS] 연결 성공: {self.symbols[:3]}...")

                    while self._running:
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=60)
                            data = json.loads(raw)
                            if data.get("type") == "trade":
                                await self._handle_trade(data)
                        except asyncio.TimeoutError:
                            print("[WS] 수신 타임아웃 — 재연결")
                            break

            except Exception as e:
                print(f"[WS] 연결 오류: {e} — 5초 후 재연결")
                self._ws = None
                if self._running:
                    await asyncio.sleep(5)

    async def start(self):
        self._running = True
        await self._connect()

    async def stop(self):
        self._running = False
        if self._ws:
            await self._ws.close()
        print("[WS] 종료")
