import pyupbit
import time
from datetime import datetime, timezone
from typing import Optional
from app.core.config import UPBIT_ACCESS_KEY, UPBIT_SECRET_KEY, DRY_RUN


def now_utc():
    return datetime.now(timezone.utc)


class UpbitClient:
    def __init__(self, access_key: str = None, secret_key: str = None):
        ak = access_key or UPBIT_ACCESS_KEY
        sk = secret_key or UPBIT_SECRET_KEY
        self._upbit = pyupbit.Upbit(ak, sk)
        self._symbols: list[str] = []

    def load_symbols(self) -> list[str]:
        try:
            tickers = pyupbit.get_tickers(fiat="KRW")
            self._symbols = tickers if tickers else []
            return self._symbols
        except Exception as e:
            print(f"[ERROR] 심볼 로딩 실패: {e}")
            return []

    def get_symbols(self) -> list[str]:
        if not self._symbols:
            return self.load_symbols()
        return self._symbols

    def get_balances(self) -> dict:
        try:
            balances = self._upbit.get_balances()
            if not balances:
                return {}
            if isinstance(balances, dict) and balances.get("error"):
                print(f"[ERROR] 잔고 조회 실패: {balances['error']}")
                return {}
            return {b["currency"]: b for b in balances}
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate" in err_str.lower() or "제한" in err_str:
                print(f"[ERROR] 잔고 조회 실패: API rate limit")
            else:
                print(f"[ERROR] 잔고 조회 실패: {e}")
            return None  # None = 에러, {} = 잔고없음 구분

    def get_krw_balance(self) -> float:
        balances = self.get_balances()
        if not balances or "KRW" not in balances:
            return 0.0
        return float(balances["KRW"]["balance"])

    def get_current_price(self, symbol: str) -> Optional[float]:
        try:
            price = pyupbit.get_current_price(symbol)
            return float(price) if price else None
        except Exception as e:
            print(f"[ERROR] 현재가 조회 실패 {symbol}: {e}")
            return None

    def submit_buy_order(self, symbol: str, price: float, amount_krw: float) -> Optional[str]:
        if DRY_RUN:
            fake_id = f"DRYRUN_BUY_{symbol}_{int(time.time())}"
            print(f"[DRY_RUN] 매수: {symbol} 가격={price} 금액={amount_krw}원")
            return fake_id
        try:
            import json
            import math
            import requests
            qty = math.floor(amount_krw / price * 10000) / 10000  # 내림 처리
            actual_total = qty * price
            if actual_total < 5500:
                # 한 단위 올려서 재시도
                qty = math.ceil(amount_krw / price * 10000) / 10000
                actual_total = qty * price
            if actual_total < 5500:
                print(f"[ERROR] 최소 주문금액 미달: {actual_total}원 (최소 5500원)")
                return None
            data = {
                "market": symbol,
                "side": "bid",
                "volume": str(qty),
                "price": str(price),
                "ord_type": "limit",
            }
            headers = self._upbit._request_headers(data)
            headers["Accept"] = "application/json"
            headers["Content-Type"] = "application/json"
            resp = requests.post(
                "https://api.upbit.com/v1/orders",
                headers=headers,
                data=json.dumps(data),
                timeout=10,
            )
            try:
                result = resp.json()
            except Exception:
                print(f"[ERROR] 매수 주문 응답 파싱 실패 {symbol}: HTTP {resp.status_code} {resp.text[:200]}")
                return None
            if resp.status_code >= 400:
                print(f"[ERROR] 매수 주문 거절 {symbol}: HTTP {resp.status_code} {result}")
                return None
            if not result:
                return None
            order_id = result.get("uuid")
            if not order_id:
                print(f"[ERROR] 주문 ID 없음: {result}")
                return None
            print(f"[ORDER] 매수 제출: {symbol} {price} {amount_krw}원 → {order_id}")
            return order_id
        except Exception as e:
            print(f"[ERROR] 매수 주문 실패 {symbol}: {e}")
            return None

    def submit_sell_order(self, symbol: str, price: float, qty: float) -> Optional[str]:
        if DRY_RUN:
            fake_id = f"DRYRUN_SELL_{symbol}_{int(time.time())}"
            print(f"[DRY_RUN] 매도: {symbol} 가격={price} 수량={qty}")
            return fake_id
        try:
            result = self._upbit.sell_limit_order(symbol, price, qty)
            if not result:
                return None
            order_id = result.get("uuid")
            if not order_id:
                print(f"[ERROR] 주문 ID 없음: {result}")
                return None
            print(f"[ORDER] 매도 제출: {symbol} {price} {qty} → {order_id}")
            return order_id
        except Exception as e:
            print(f"[ERROR] 매도 주문 실패 {symbol}: {e}")
            return None

    def cancel_order(self, order_id: str) -> bool:
        if DRY_RUN:
            print(f"[DRY_RUN] 주문 취소: {order_id}")
            return True
        try:
            result = self._upbit.cancel_order(order_id)
            return bool(result)
        except Exception as e:
            print(f"[ERROR] 주문 취소 실패 {order_id}: {e}")
            return False

    def get_order(self, order_id: str) -> Optional[dict]:
        try:
            import requests
            data = {"uuid": order_id}
            headers = self._upbit._request_headers(data)
            headers["Accept"] = "application/json"
            resp = requests.get(
                "https://api.upbit.com/v1/order",
                headers=headers,
                params=data,
                timeout=10,
            )
            try:
                result = resp.json()
            except Exception:
                print(f"[ERROR] 주문 조회 응답 파싱 실패 {order_id}: HTTP {resp.status_code} {resp.text[:200]}")
                return None
            if resp.status_code >= 400:
                print(f"[ERROR] 주문 조회 거절 {order_id}: HTTP {resp.status_code} {result}")
                return None
            return result if result else None
        except Exception as e:
            print(f"[ERROR] 주문 조회 실패 {order_id}: {e}")
            return None

    def get_open_orders(self, symbol: str) -> list[dict]:
        try:
            result = self._upbit.get_order(symbol, state="wait")
            return result if result else []
        except Exception as e:
            print(f"[ERROR] 미체결 주문 조회 실패 {symbol}: {e}")
            return []

    def get_recent_orders(self, state: str = "done", limit: int = 50) -> list[dict]:
        """전체 주문내역 조회 (심볼 무관). state: done / wait / cancel"""
        try:
            from pyupbit.request_api import _send_get_request
            url = "https://api.upbit.com/v1/orders/closed" if state in ("done", "cancel") else "https://api.upbit.com/v1/orders/open"
            data = {"limit": limit, "order_by": "desc"}
            if state in ("done", "cancel"):
                data["state"] = state
            headers = self._upbit._request_headers(data)
            result = _send_get_request(url, headers=headers, data=data)
            if isinstance(result, list):
                return result
            if isinstance(result, tuple):
                return result[0] if result[0] else []
            return []
        except Exception as e:
            print(f"[ERROR] 주문내역 조회 실패: {e}")
            return []
