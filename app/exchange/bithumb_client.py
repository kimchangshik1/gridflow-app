import python_bithumb as bithumb
from typing import Optional
from app.core.config import BITHUMB_ACCESS_KEY, BITHUMB_SECRET_KEY, DRY_RUN
import time


class BithumbClient:
    def __init__(self, access_key: str = None, secret_key: str = None):
        from app.core.config import BITHUMB_ACCESS_KEY, BITHUMB_SECRET_KEY
        ak = access_key or BITHUMB_ACCESS_KEY
        sk = secret_key or BITHUMB_SECRET_KEY
        self._bithumb = bithumb.Bithumb(ak, sk)
        orig_buy_limit_order = self._bithumb.buy_limit_order
        orig_sell_limit_order = self._bithumb.sell_limit_order

        def _normalize_symbol(symbol: str):
            return symbol

        self._bithumb.buy_limit_order = (
            lambda symbol, price, qty, _orig=orig_buy_limit_order:
            _orig(_normalize_symbol(symbol), price, qty)
        )
        self._bithumb.sell_limit_order = (
            lambda symbol, price, qty, _orig=orig_sell_limit_order:
            _orig(_normalize_symbol(symbol), price, qty)
        )
        self._symbols: list[str] = []
        self.last_order_error: Optional[str] = None

    def load_symbols(self) -> list[str]:
        try:
            import requests
            r = requests.get("https://api.bithumb.com/public/ticker/ALL_KRW", timeout=5)
            data = r.json().get("data", {})
            self._symbols = [f"KRW-{k}" for k in data.keys() if k != "date"]
            return self._symbols
        except Exception as e:
            print(f"[BITHUMB][ERROR] 심볼 로딩 실패: {e}")
            return []

    def get_symbols(self) -> list[str]:
        if not self._symbols:
            return self.load_symbols()
        return self._symbols

    @staticmethod
    def _is_rate_limit_error(e: Exception) -> bool:
        msg = str(e).lower()
        return "429" in msg or "요청 수 제한" in msg or "rate limit" in msg or "too many" in msg

    def get_krw_balance(self) -> float:
        for attempt in range(2):
            try:
                balance = self._bithumb.get_balance("KRW")
                return float(balance) if balance else 0.0
            except Exception as e:
                if self._is_rate_limit_error(e) and attempt == 0:
                    print(f"[BITHUMB][WARN] KRW 잔고 조회 Rate Limit — 30초 대기 후 재시도")
                    time.sleep(30)
                    continue
                print(f"[BITHUMB][ERROR] KRW 잔고 조회 실패: {e}")
                return 0.0
        return 0.0

    def get_balances(self) -> dict:
        try:
            result = {}
            balances = self._bithumb.get_balances()

            if not balances:
                return {}

            if isinstance(balances, dict):
                prefixed_totals = {}
                for currency, info in balances.items():
                    key = str(currency).lower()
                    if "_" in key and not isinstance(info, dict):
                        prefix, coin = key.split("_", 1)
                        if prefix in {"available", "locked", "in_use", "total"} and coin:
                            try:
                                amount = float(info or 0)
                            except Exception:
                                continue
                            coin_key = coin.upper()
                            prefixed_totals[coin_key] = prefixed_totals.get(coin_key, 0.0) + amount
                            continue
                    try:
                        if isinstance(info, dict):
                            available = float(info.get("available", 0) or 0)
                            locked = float(info.get("locked", 0) or 0)
                            bal = available + locked
                        else:
                            bal = float(info or 0)
                    except Exception:
                        continue

                    if bal > 0:
                        currency_key = str(currency).upper()
                        result[currency_key] = {
                            "currency": currency_key,
                            "balance": str(bal),
                        }
                for currency_key, bal in prefixed_totals.items():
                    if bal > 0:
                        result[currency_key] = {
                            "currency": currency_key,
                            "balance": str(bal),
                        }
                return result

            if isinstance(balances, list):
                for row in balances:
                    if not isinstance(row, dict):
                        continue

                    currency = (
                        row.get("currency")
                        or row.get("symbol")
                        or row.get("ticker")
                        or row.get("asset")
                        or row.get("coin")
                    )

                    if not currency:
                        continue

                    try:
                        available = float(
                            row.get("available")
                            or row.get("balance")
                            or row.get("available_balance")
                            or 0
                        )
                        locked = float(
                            row.get("locked")
                            or row.get("in_use")
                            or 0
                        )
                        bal = available + locked
                    except Exception:
                        continue

                    if bal > 0:
                        currency_key = str(currency).upper()
                        result[currency_key] = {
                            "currency": currency_key,
                            "balance": str(bal),
                        }

                if not result:
                    print("[BITHUMB][WARN] balances list 응답은 왔지만 인식 가능한 잔고가 없었습니다.")
                return result

            print(f"[BITHUMB][WARN] 예상과 다른 balances 타입: {type(balances).__name__}")
            return {}
        except Exception as e:
            if self._is_rate_limit_error(e):
                print(f"[BITHUMB][WARN] 잔고 조회 Rate Limit — 30초 대기 후 재시도")
                time.sleep(30)
                try:
                    return self.get_balances()
                except Exception as e2:
                    print(f"[BITHUMB][ERROR] 잔고 조회 재시도 실패: {e2}")
                    return {}
            print(f"[BITHUMB][ERROR] 잔고 조회 실패: {e}")
            return {}

    def get_current_price(self, symbol: str) -> Optional[float]:
        try:
            import requests
            ticker = symbol.replace("KRW-", "")
            r = requests.get(f"https://api.bithumb.com/public/ticker/{ticker}_KRW", timeout=5)
            data = r.json()
            if data.get("status") == "0000":
                return float(data["data"]["closing_price"])
            return None
        except Exception as e:
            print(f"[BITHUMB][ERROR] 현재가 조회 실패 {symbol}: {e}")
            return None

    def submit_buy_order(self, symbol: str, price: float, amount_krw: float) -> Optional[str]:
        self.last_order_error = None
        if DRY_RUN:
            fake_id = f"DRYRUN_BUY_{symbol}_{int(time.time())}"
            print(f"[BITHUMB][DRY_RUN] 매수: {symbol} 가격={price} 금액={amount_krw}원")
            return fake_id
        try:
            ticker = symbol  # KRW-ETH 형식 그대로
            qty = round(amount_krw / price, 4)
            result = self._bithumb.buy_limit_order(ticker, price, qty)
            if not result:
                self.last_order_error = "빗썸 응답 없음"
                return None
            order_id = str(result.get("uuid") or result.get("order_id") or "")
            if not order_id:
                self.last_order_error = f"주문 ID 없음: {result}"
                print(f"[BITHUMB][ERROR] 주문 ID 없음: {result}")
                return None
            print(f"[BITHUMB][ORDER] 매수 제출: {symbol} {price} {amount_krw}원 -> {order_id}")
            return order_id
        except Exception as e:
            self.last_order_error = str(e)
            print(f"[BITHUMB][ERROR] 매수 주문 실패 {symbol}: {e}")
            return None

    def submit_sell_order(self, symbol: str, price: float, qty: float) -> Optional[str]:
        self.last_order_error = None
        if DRY_RUN:
            fake_id = f"DRYRUN_SELL_{symbol}_{int(time.time())}"
            print(f"[BITHUMB][DRY_RUN] 매도: {symbol} 가격={price} 수량={qty}")
            return fake_id
        try:
            ticker = symbol  # KRW-ETH 형식 그대로
            result = self._bithumb.sell_limit_order(ticker, price, qty)
            if not result:
                self.last_order_error = "빗썸 응답 없음"
                return None
            order_id = str(result.get("uuid") or result.get("order_id") or "")
            if not order_id:
                self.last_order_error = f"주문 ID 없음: {result}"
                print(f"[BITHUMB][ERROR] 주문 ID 없음: {result}")
                return None
            print(f"[BITHUMB][ORDER] 매도 제출: {symbol} {price} {qty} -> {order_id}")
            return order_id
        except Exception as e:
            self.last_order_error = str(e)
            print(f"[BITHUMB][ERROR] 매도 주문 실패 {symbol}: {e}")
            return None

    def submit_market_sell_order(self, symbol: str, qty: float) -> Optional[str]:
        self.last_order_error = None
        if DRY_RUN:
            fake_id = f"DRYRUN_MARKET_SELL_{symbol}_{int(time.time())}"
            print(f"[BITHUMB][DRY_RUN] 시장가 매도: {symbol} 수량={qty}")
            return fake_id
        try:
            result = self._bithumb.sell_market_order(symbol, qty)
            if not result:
                self.last_order_error = "빗썸 응답 없음"
                return None
            order_id = str(result.get("uuid") or result.get("order_id") or "")
            if not order_id:
                self.last_order_error = f"주문 ID 없음: {result}"
                print(f"[BITHUMB][ERROR] 주문 ID 없음: {result}")
                return None
            print(f"[BITHUMB][ORDER] 시장가 매도 제출: {symbol} {qty} -> {order_id}")
            return order_id
        except Exception as e:
            self.last_order_error = str(e)
            print(f"[BITHUMB][ERROR] 시장가 매도 주문 실패 {symbol}: {e}")
            return None

    def cancel_order(self, order_id: str, symbol: str, side: str) -> bool:
        if DRY_RUN:
            print(f"[BITHUMB][DRY_RUN] 주문 취소: {order_id}")
            return True
        try:
            ticker = symbol.replace("KRW-", "")
            result = self._bithumb.cancel_order(side, order_id, ticker)
            return bool(result)
        except Exception as e:
            print(f"[BITHUMB][ERROR] 주문 취소 실패 {order_id}: {e}")
            return False

    def get_order(self, order_id: str, symbol: str = None) -> Optional[dict]:
        try:
            result = self._bithumb.get_order(order_id)
            return result if result else None
        except Exception as e:
            print(f"[BITHUMB][ERROR] 주문 조회 실패 {order_id}: {e}")
            return None
