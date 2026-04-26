import json
import math
import pyupbit
import re
import requests
import time
from datetime import datetime, timezone
from typing import Any, Optional
from app.core.config import UPBIT_ACCESS_KEY, UPBIT_SECRET_KEY, DRY_RUN


def now_utc():
    return datetime.now(timezone.utc)


class UpbitClient:
    def __init__(self, access_key: str = None, secret_key: str = None):
        ak = access_key or UPBIT_ACCESS_KEY
        sk = secret_key or UPBIT_SECRET_KEY
        self._upbit = pyupbit.Upbit(ak, sk)
        self._symbols: list[str] = []
        self.last_balance_error: Optional[str] = None
        self._rate_limit_backoff_until = 0.0
        self._last_remaining_req_warning_at = 0.0
        self._last_remaining_req_warning_value = ""
        self._last_backoff_log_at = 0.0

    def _warn_remaining_req_header(self, raw_header: Optional[str], reason: str) -> None:
        raw_value = (raw_header or "").strip() or "<missing>"
        now = time.monotonic()
        if raw_value == self._last_remaining_req_warning_value and now - self._last_remaining_req_warning_at < 60:
            return
        self._last_remaining_req_warning_value = raw_value
        self._last_remaining_req_warning_at = now
        preview = raw_value if len(raw_value) <= 160 else f"{raw_value[:157]}..."
        print(f"[WARN] Remaining-Req 헤더 파싱 건너뜀: {reason} raw={preview}")

    def _parse_remaining_req_header(self, raw_header: Optional[str]) -> Optional[dict[str, Any]]:
        if raw_header is None:
            self._warn_remaining_req_header(raw_header, "header missing")
            return None

        header = raw_header.strip()
        if not header:
            self._warn_remaining_req_header(raw_header, "header empty")
            return None

        tokens = {}
        for key, value in re.findall(r"([A-Za-z][A-Za-z_-]*)\s*=\s*([^;,\s]+)", header):
            tokens[key.lower()] = value

        if not tokens:
            self._warn_remaining_req_header(raw_header, "no key=value tokens")
            return None

        parsed: dict[str, Any] = {}
        group = tokens.get("group")
        if group:
            parsed["group"] = group

        for key in ("min", "sec"):
            raw_value = tokens.get(key)
            if raw_value is None:
                continue
            try:
                parsed[key] = int(raw_value)
            except (TypeError, ValueError):
                self._warn_remaining_req_header(raw_header, f"{key} is not int: {raw_value}")
                return None

        if not parsed:
            self._warn_remaining_req_header(raw_header, "no usable fields")
            return None

        return parsed

    def _log_backoff(self, context: str, seconds: float, reason: str) -> None:
        now = time.monotonic()
        if seconds <= 0 or now - self._last_backoff_log_at < 5:
            return
        self._last_backoff_log_at = now
        print(f"[WARN] Upbit rate-limit backoff 적용 {context}: {seconds:.2f}s ({reason})")

    def _extend_rate_limit_backoff(self, seconds: float, context: str, reason: str) -> None:
        sleep_for = max(0.0, min(seconds, 2.0))
        if sleep_for <= 0:
            return
        until = time.monotonic() + sleep_for
        if until > self._rate_limit_backoff_until:
            self._rate_limit_backoff_until = until
        self._log_backoff(context, sleep_for, reason)

    def _wait_for_rate_limit_backoff(self, context: str) -> None:
        remaining = self._rate_limit_backoff_until - time.monotonic()
        if remaining > 0:
            self._log_backoff(context, remaining, "pre-request wait")
            time.sleep(remaining)

    def _observe_remaining_req(self, raw_header: Optional[str], context: str) -> None:
        limit = self._parse_remaining_req_header(raw_header)
        if not limit:
            return
        sec = limit.get("sec")
        if isinstance(sec, int) and sec <= 0:
            self._extend_rate_limit_backoff(1.05, context, "Remaining-Req sec=0")

    def _is_rate_limit_response(self, status_code: int, result: Any, response_text: str) -> bool:
        if status_code == 429:
            return True

        message = response_text or ""
        if isinstance(result, dict):
            error = result.get("error")
            if isinstance(error, dict):
                message = f"{error.get('name', '')} {error.get('message', '')}".strip()
            elif result:
                message = str(result)

        lowered = message.lower()
        return (
            "too many api requests" in lowered
            or "rate limit" in lowered
            or "요청 수 제한" in message
            or "429" in lowered
        )

    def _request_private_json(
        self,
        method: str,
        url: str,
        data: Optional[dict[str, Any]] = None,
        *,
        context: str,
    ) -> tuple[Optional[requests.Response], Any, str]:
        self._wait_for_rate_limit_backoff(context)

        payload = data or None
        headers = self._upbit._request_headers(payload)
        headers["Accept"] = "application/json"

        if method == "GET":
            response = requests.get(url, headers=headers, params=payload, timeout=10)
        elif method == "POST":
            headers["Content-Type"] = "application/json"
            response = requests.post(url, headers=headers, data=json.dumps(payload or {}), timeout=10)
        else:
            raise ValueError(f"unsupported method: {method}")

        response_text = response.text[:200] if response.text else ""
        self._observe_remaining_req(response.headers.get("Remaining-Req"), context)

        try:
            result = response.json()
        except ValueError:
            result = None

        if self._is_rate_limit_response(response.status_code, result, response_text):
            self._extend_rate_limit_backoff(1.05, context, "HTTP 429 or rate-limit response")

        return response, result, response_text

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
        self.last_balance_error = None
        try:
            response, balances, response_text = self._request_private_json(
                "GET",
                "https://api.upbit.com/v1/accounts",
                context="잔고 조회",
            )
            if response is None:
                self.last_balance_error = "empty response"
                print("[ERROR] 잔고 조회 실패: empty response")
                return None
            if self._is_rate_limit_response(response.status_code, balances, response_text):
                self.last_balance_error = "API rate limit"
                print("[ERROR] 잔고 조회 실패: API rate limit")
                return None
            if response.status_code >= 400:
                self.last_balance_error = str(balances or response_text)
                print(f"[ERROR] 잔고 조회 실패: HTTP {response.status_code} {balances or response_text}")
                return None
            if not balances:
                return {}
            if isinstance(balances, dict) and balances.get("error"):
                self.last_balance_error = str(balances["error"])
                print(f"[ERROR] 잔고 조회 실패: {balances['error']}")
                return None
            if not isinstance(balances, list):
                self.last_balance_error = f"unexpected payload {balances}"
                print(f"[ERROR] 잔고 조회 실패: unexpected payload {balances}")
                return None
            return {b["currency"]: b for b in balances if isinstance(b, dict) and b.get("currency")}
        except Exception as e:
            self.last_balance_error = str(e)
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
            response, result, response_text = self._request_private_json(
                "POST",
                "https://api.upbit.com/v1/orders",
                data,
                context=f"매수 주문 {symbol}",
            )
            if response is None:
                print(f"[ERROR] 매수 주문 실패 {symbol}: empty response")
                return None
            if self._is_rate_limit_response(response.status_code, result, response_text):
                print(f"[ERROR] 매수 주문 실패 {symbol}: API rate limit")
                return None
            if result is None and response.status_code < 400:
                print(f"[ERROR] 매수 주문 응답 파싱 실패 {symbol}: HTTP {response.status_code} {response_text}")
                return None
            if response.status_code >= 400:
                print(f"[ERROR] 매수 주문 거절 {symbol}: HTTP {response.status_code} {result or response_text}")
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
            data = {
                "market": symbol,
                "side": "ask",
                "volume": str(qty),
                "price": str(price),
                "ord_type": "limit",
            }
            response, result, response_text = self._request_private_json(
                "POST",
                "https://api.upbit.com/v1/orders",
                data,
                context=f"매도 주문 {symbol}",
            )
            if response is None:
                print(f"[ERROR] 매도 주문 실패 {symbol}: empty response")
                return None
            if self._is_rate_limit_response(response.status_code, result, response_text):
                print(f"[ERROR] 매도 주문 실패 {symbol}: API rate limit")
                return None
            if result is None and response.status_code < 400:
                print(f"[ERROR] 매도 주문 응답 파싱 실패 {symbol}: HTTP {response.status_code} {response_text}")
                return None
            if response.status_code >= 400:
                print(f"[ERROR] 매도 주문 거절 {symbol}: HTTP {response.status_code} {result or response_text}")
                return None
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
