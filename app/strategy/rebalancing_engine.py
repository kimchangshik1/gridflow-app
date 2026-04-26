import asyncio
import psycopg2
import requests
from datetime import datetime, timezone, timedelta
from app.core.config import DB_URL, DRY_RUN

def get_conn():
    return psycopg2.connect(DB_URL)

def now_utc():
    return datetime.now(timezone.utc)


_REBAL_ADVISORY_LOCK_NS = 48201


class RebalancingEngine:
    """
    포트폴리오 리밸런싱 엔진
    - INTERVAL: N시간마다 리밸런싱 실행
    - THRESHOLD: 비중이 N% 이상 벗어날 때 실행
    """
    def __init__(self, upbit_client=None, bithumb_client=None, interval_sec=60, user_manager=None):
        self.upbit_client = upbit_client
        self.bithumb_client = bithumb_client
        self.interval_sec = interval_sec
        self._running = False
        self._user_manager = user_manager
        self._rebal_log_state = {}

    def _get_client(self, exchange, user_id):
        if self._user_manager is not None:
            user_bot = self._user_manager._user_bots.get(user_id)
            if not user_bot:
                return None
            if exchange == "upbit":
                return getattr(user_bot, "upbit_client", None)
            elif exchange == "bithumb":
                return getattr(user_bot, "bithumb_client", None)
            return None
        return self.upbit_client if exchange == "upbit" else self.bithumb_client

    def _get_prices(self, exchange, symbols):
        """여러 종목 현재가 일괄 조회"""
        prices = {}
        try:
            if exchange == "upbit":
                markets = ",".join(symbols)
                r = requests.get(
                    f"https://api.upbit.com/v1/ticker?markets={markets}",
                    timeout=5
                )
                for item in r.json():
                    prices[item["market"]] = float(item["trade_price"])
            elif exchange == "bithumb":
                r = requests.get(
                    "https://api.bithumb.com/public/ticker/ALL_KRW",
                    timeout=5
                )
                data = r.json().get("data", {})
                for sym in symbols:
                    coin = sym.replace("KRW-", "")
                    if coin in data:
                        prices[sym] = float(data[coin]["closing_price"])
        except Exception as e:
            print(f"[REBAL] 현재가 조회 실패: {e}")
        return prices

    def _fetch_strategy_assets(self, cur, strat_id):
        cur.execute("""
            SELECT id, strategy_id, user_id, symbol,
                   target_pct, current_qty
            FROM rebalancing_assets
            WHERE strategy_id=%s
            ORDER BY target_pct DESC
        """, (strat_id,))
        return cur.fetchall()

    @staticmethod
    def _safe_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _resolve_min_order_krw(cls, min_order_krw):
        value = cls._safe_float(min_order_krw)
        if value is None or value <= 0:
            return 5500.0
        return max(5500.0, value)

    @classmethod
    def _resolve_adjust_cap_krw(cls, total_value, max_adjust_pct, max_adjust_krw):
        caps = []
        pct_value = cls._safe_float(max_adjust_pct)
        if pct_value is not None and pct_value > 0 and total_value > 0:
            caps.append(total_value * pct_value / 100.0)
        krw_value = cls._safe_float(max_adjust_krw)
        if krw_value is not None and krw_value > 0:
            caps.append(krw_value)
        if not caps:
            return None
        return min(caps)

    @classmethod
    def _resolve_daily_max_krw(cls, daily_max_krw):
        value = cls._safe_float(daily_max_krw)
        if value is None or value <= 0:
            return None
        return value

    @staticmethod
    def _clamp_adjust_value(requested_value, adjust_cap_krw):
        requested_value = float(requested_value or 0)
        if adjust_cap_krw is None:
            return requested_value
        return min(requested_value, float(adjust_cap_krw))

    def _get_today_submitted_order_usage(self, cur, strat_id):
        day_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
        cur.execute("""
            SELECT COUNT(*), COALESCE(SUM(amount_krw), 0)
            FROM rebalancing_orders
            WHERE strategy_id=%s
              AND created_at >= %s
              AND status <> 'FAILED'
        """, (strat_id, day_start))
        row = cur.fetchone() or (0, 0)
        return {
            "count": int(row[0] or 0),
            "amount_krw": float(row[1] or 0),
        }

    @staticmethod
    def _extract_balance_qty(balance_row):
        if balance_row is None:
            return 0.0
        if isinstance(balance_row, dict):
            try:
                balance = float(balance_row.get("balance", 0) or 0)
            except (TypeError, ValueError):
                balance = 0.0
            try:
                locked = float(balance_row.get("locked", 0) or 0)
            except (TypeError, ValueError):
                locked = 0.0
            return round(balance + locked, 8)
        try:
            return round(float(balance_row or 0), 8)
        except (TypeError, ValueError):
            return 0.0

    def _sync_strategy_current_qty(self, conn, cur, strat_id, user_id, exchange, assets, is_dry_run):
        if not assets:
            return assets
        if is_dry_run or DRY_RUN:
            print(f"[REBAL] current_qty sync skip: strategy_id={strat_id} exchange={exchange} dry_run mode")
            return assets

        client = self._get_client(exchange, user_id)
        if not client:
            print(f"[REBAL] current_qty sync skip: strategy_id={strat_id} user_id={user_id} exchange={exchange} client not ready")
            return assets

        try:
            balances = client.get_balances()
        except Exception as e:
            print(f"[REBAL] current_qty sync skip: strategy_id={strat_id} exchange={exchange} balance fetch failed: {e}")
            return assets

        if balances is None:
            print(f"[REBAL] current_qty sync skip: strategy_id={strat_id} exchange={exchange} balance fetch returned None")
            return assets
        if not isinstance(balances, dict):
            print(f"[REBAL] current_qty sync skip: strategy_id={strat_id} exchange={exchange} unexpected balances type={type(balances).__name__}")
            return assets

        for asset in assets:
            asset_id = asset[0]
            symbol = str(asset[3] or "").upper()
            currency = symbol.replace("KRW-", "")
            qty = self._extract_balance_qty(balances.get(currency))
            cur.execute("""
                UPDATE rebalancing_assets
                SET current_qty=%s, updated_at=NOW()
                WHERE id=%s
            """, (qty, asset_id))

        conn.commit()
        return self._fetch_strategy_assets(cur, strat_id)

    def _get_krw_balance(self, exchange, user_id, is_dry_run):
        """KRW 잔고 조회"""
        if is_dry_run or DRY_RUN:
            try:
                conn = get_conn()
                cur = conn.cursor()
                cur.execute(
                    "SELECT krw_balance FROM sandbox_balances WHERE user_id=%s",
                    (user_id,)
                )
                row = cur.fetchone()
                cur.close(); conn.close()
                return float(row[0]) if row else 0
            except Exception:
                return 0
        client = self._get_client(exchange, user_id)
        if not client:
            print(f"[REBAL] KRW 잔고 조회 skip: user_id={user_id} exchange={exchange} client not ready")
            return 0
        try:
            return client.get_krw_balance()
        except Exception as e:
            print(f"[REBAL] KRW 잔고 조회 실패: user_id={user_id} exchange={exchange} error={e}")
        return 0

    @staticmethod
    def _normalize_failure_message(error):
        if error is None:
            return ""
        value = str(error).replace("\r", " ").replace("\n", " ").strip()
        if not value:
            return ""
        return " ".join(value.split())[:240]

    @classmethod
    def _classify_submit_failure(cls, error, default="exchange_submit_failed"):
        message = cls._normalize_failure_message(error)
        if not message:
            return default
        lowered = f"{type(error).__name__} {message}".lower()
        if (
            "remainingreqparsingerror" in lowered
            or "rate limit" in lowered
            or "too many requests" in lowered
            or "429" in lowered
            or "요청 수 제한" in lowered
            or "remaining-req" in lowered
        ):
            return "rate_limit"
        if (
            "minimum" in lowered
            or "min total" in lowered
            or "under_min" in lowered
            or "insufficient" in lowered
            or "invalid" in lowered
            or "validation" in lowered
            or "최소" in lowered
        ):
            return "validation"
        if (
            "reject" in lowered
            or "denied" in lowered
            or "forbidden" in lowered
            or "not allowed" in lowered
            or "거절" in lowered
            or "거부" in lowered
        ):
            return "exchange_reject"
        if (
            "timeout" in lowered
            or "connection" in lowered
            or "request" in lowered
            or "response" in lowered
            or "응답" in lowered
        ):
            return "client_error"
        return default

    @staticmethod
    def _activity_failure_label(failure_class):
        labels = {
            "rate_limit": "요청한도",
            "validation": "주문검증",
            "exchange_reject": "거래소거부",
            "client_error": "응답오류",
            "client_not_ready": "클라없음",
            "exchange_submit_failed": "제출실패",
        }
        return labels.get(str(failure_class or "").strip(), "주문실패")

    def _build_rebalance_failure_status_ko(self, side, failure_class, rebalancing_order_id):
        side_ko = "매수" if side == "BUY" else "매도"
        label = self._activity_failure_label(failure_class)
        return f"{side_ko}실패({label})#{rebalancing_order_id}"[:30]

    def _record_rebalance_order_failure(
        self,
        cur,
        strategy_id,
        user_id,
        exchange,
        symbol,
        side,
        price,
        amount_krw,
        qty,
        rebalancing_order_id,
        failure_class,
        failure_message,
    ):
        normalized_failure_class = str(failure_class or "exchange_submit_failed").strip() or "exchange_submit_failed"
        normalized_failure_message = self._normalize_failure_message(failure_message) or "empty exchange order id"
        side_ko = "매수" if side == "BUY" else "매도"
        print(
            "[REBAL][ORDER_FAIL] "
            f"rebalancing_order_id={rebalancing_order_id} "
            f"strategy_id={strategy_id} user_id={user_id} "
            f"exchange={exchange} symbol={symbol} side={side} "
            f"amount_krw={float(amount_krw or 0):.2f} qty={float(qty or 0):.8f} "
            f"failure_class={normalized_failure_class} "
            f"failure_message={normalized_failure_message}"
        )
        try:
            cur.execute("""
                INSERT INTO activity_logs
                (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko,
                 strategy_type, price, amount_krw, created_at)
                VALUES (%s, 'order_fail', %s, %s, %s, %s, 'FAILED', %s,
                        '리밸런싱', %s, %s, NOW())
            """, (
                user_id,
                symbol,
                exchange,
                side,
                side_ko,
                self._build_rebalance_failure_status_ko(side, normalized_failure_class, rebalancing_order_id),
                price,
                amount_krw,
            ))
        except Exception as log_error:
            print(
                "[REBAL][ORDER_FAIL] activity_log 기록 실패: "
                f"rebalancing_order_id={rebalancing_order_id} strategy_id={strategy_id} "
                f"error={self._normalize_failure_message(log_error) or log_error}"
            )

    def _submit_order(self, exchange, user_id, symbol, side, price, amount_krw, qty, is_dry_run):
        """매수/매도 주문 제출"""
        if DRY_RUN or is_dry_run:
            fake_id = f"REBAL-DRY-{side}-{symbol}-{int(now_utc().timestamp())}"
            print(f"[REBAL][DRY] {side}: {symbol} {price}원 금액={amount_krw}원")
            return {
                "order_id": fake_id,
                "failure_class": None,
                "failure_message": "",
            }
        client = self._get_client(exchange, user_id)
        if not client:
            print(f"[REBAL] 주문 skip: user_id={user_id} exchange={exchange} side={side} symbol={symbol} client not ready")
            return {
                "order_id": None,
                "failure_class": "client_not_ready",
                "failure_message": "client not ready",
            }
        try:
            if side == "BUY":
                order_id = client.submit_buy_order(symbol, price, amount_krw)
            else:
                order_id = client.submit_sell_order(symbol, price, qty)
            if order_id:
                return {
                    "order_id": order_id,
                    "failure_class": None,
                    "failure_message": "",
                }
            client_error = getattr(client, "last_order_error", None)
            failure_message = self._normalize_failure_message(client_error) or "empty exchange order id"
            return {
                "order_id": None,
                "failure_class": self._classify_submit_failure(client_error, default="exchange_submit_failed"),
                "failure_message": failure_message,
            }
        except Exception as e:
            print(f"[REBAL] 주문 오류 user_id={user_id} exchange={exchange} {side} {symbol}: {e}")
            return {
                "order_id": None,
                "failure_class": self._classify_submit_failure(e),
                "failure_message": self._normalize_failure_message(e) or "submit exception",
            }

    def _log_portfolio_value_too_low_once(self, strat_id, exchange, total_value, krw_balance, coin_value):
        state_key = ("portfolio_value_too_low", str(exchange or "").lower())
        if self._rebal_log_state.get(strat_id) == state_key:
            return
        self._rebal_log_state[strat_id] = state_key
        print(
            "[REBAL] 포트폴리오 가치 부족: "
            f"strategy_id={strat_id} exchange={exchange} "
            f"total={total_value:,.0f}원 krw={krw_balance:,.0f}원 coin={coin_value:,.0f}원"
        )

    def _clear_rebal_log_state(self, strat_id):
        self._rebal_log_state.pop(strat_id, None)

    def _try_lock_strategy(self, cur, strat_id):
        cur.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (_REBAL_ADVISORY_LOCK_NS, int(strat_id))
        )
        row = cur.fetchone()
        return bool(row and row[0])

    def _unlock_strategy(self, cur, strat_id):
        try:
            cur.execute(
                "SELECT pg_advisory_unlock(%s, %s)",
                (_REBAL_ADVISORY_LOCK_NS, int(strat_id))
            )
        except Exception as e:
            print(f"[REBAL] advisory unlock 실패: strategy_id={strat_id} error={e}")

    def _should_rebalance(self, strat, assets, prices):
        """리밸런싱 실행 여부 판단"""
        (strat_id, trigger_type, interval_hours, threshold_pct,
         last_rebal_at, next_rebal_at) = strat

        now = now_utc()

        if trigger_type == "INTERVAL":
            if not last_rebal_at:
                return True
            elapsed_hours = (now - last_rebal_at).total_seconds() / 3600
            return elapsed_hours >= float(interval_hours or 24)

        elif trigger_type == "THRESHOLD":
            # 총 포트폴리오 가치 계산
            total_value = sum(
                float(a[5]) * prices.get(a[3], 0)  # qty * price
                for a in assets
            )
            if total_value <= 0:
                return False
            # 비중 편차 체크
            for asset in assets:
                symbol = asset[3]
                target_pct = float(asset[4])
                qty = float(asset[5] or 0)
                current_value = qty * prices.get(symbol, 0)
                current_pct = current_value / total_value * 100
                deviation = abs(current_pct - target_pct)
                if deviation >= float(threshold_pct or 5.0):
                    return True
            return False

        elif trigger_type == "BOTH":
            # 인터벌 또는 임계값 둘 중 하나라도 충족
            interval_ok = False
            if not last_rebal_at:
                interval_ok = True
            else:
                elapsed_hours = (now - last_rebal_at).total_seconds() / 3600
                interval_ok = elapsed_hours >= float(interval_hours or 24)

            threshold_ok = False
            total_value = sum(
                float(a[5]) * prices.get(a[3], 0)
                for a in assets
            )
            if total_value > 0:
                for asset in assets:
                    symbol = asset[3]
                    target_pct = float(asset[4])
                    qty = float(asset[5] or 0)
                    current_value = qty * prices.get(symbol, 0)
                    current_pct = current_value / total_value * 100
                    deviation = abs(current_pct - target_pct)
                    if deviation >= float(threshold_pct or 5.0):
                        threshold_ok = True
                        break

            return interval_ok or threshold_ok

        return False

    def _execute_rebalance(self, conn, cur, strat_id, user_id, exchange,
                           assets, prices, is_dry_run,
                           min_order_krw=None, max_adjust_pct=None, max_adjust_krw=None,
                           daily_max_krw=None, rebal_method=None):
        """리밸런싱 실행"""
        # KRW 포함 총 포트폴리오 가치 계산
        krw_balance = self._get_krw_balance(exchange, user_id, is_dry_run)
        coin_value = sum(
            float(a[5]) * prices.get(a[3], 0)
            for a in assets
        )
        total_value = coin_value + krw_balance

        if total_value < 10000:
            self._log_portfolio_value_too_low_once(
                strat_id, exchange, total_value, krw_balance, coin_value
            )
            return {
                "success": False,
                "executed": False,
                "reason": "portfolio_value_too_low",
                "total_value": float(total_value),
                "krw_balance": float(krw_balance),
                "coin_value": float(coin_value),
            }

        self._clear_rebal_log_state(strat_id)

        effective_min_order_krw = self._resolve_min_order_krw(min_order_krw)
        adjust_cap_krw = self._resolve_adjust_cap_krw(
            total_value, max_adjust_pct, max_adjust_krw
        )
        effective_daily_max_krw = self._resolve_daily_max_krw(daily_max_krw)
        effective_rebal_method = str(rebal_method or "BOTH").upper()
        used_daily_order_krw = 0.0
        if effective_daily_max_krw is not None:
            daily_usage = self._get_today_submitted_order_usage(cur, strat_id)
            used_daily_order_krw = float(daily_usage["amount_krw"] or 0)
            if used_daily_order_krw >= effective_daily_max_krw:
                print(
                    "[REBAL] 실행 skip: "
                    f"strategy_id={strat_id} exchange={exchange} "
                    f"reason=daily_max_krw_reached used={used_daily_order_krw:,.0f}원 "
                    f"limit={effective_daily_max_krw:,.0f}원"
                )
                return {
                    "success": False,
                    "executed": False,
                    "reason": "daily_max_krw_reached",
                    "daily_used_krw": float(used_daily_order_krw),
                    "daily_max_krw": float(effective_daily_max_krw),
                    "daily_order_count": int(daily_usage["count"] or 0),
                }

        print(f"[REBAL] 리밸런싱 시작: 총 {total_value:,.0f}원")
        submitted_orders = 0
        failed_orders = 0

        # 각 종목별 목표/현재 가치 계산
        rebal_items = []
        for asset in assets:
            asset_id, strategy_id, uid, symbol, target_pct, qty = (
                asset[0], asset[1], asset[2], asset[3],
                float(asset[4]), float(asset[5] or 0)
            )
            price = prices.get(symbol, 0)
            if price <= 0:
                continue

            current_value = qty * price
            current_pct = current_value / total_value * 100
            target_value = total_value * float(target_pct) / 100
            diff_value = target_value - current_value  # 양수=매수필요, 음수=매도필요

            rebal_items.append({
                "asset_id": asset_id,
                "symbol": symbol,
                "price": price,
                "qty": qty,
                "current_value": current_value,
                "current_pct": current_pct,
                "target_pct": float(target_pct),
                "target_value": target_value,
                "diff_value": diff_value,
            })

        # 매도 먼저 (KRW 확보)
        if effective_rebal_method == "BUY_ONLY":
            print(
                f"[REBAL] 매도 skip: strategy_id={strat_id} "
                "reason=rebal_method_buy_only"
            )
        else:
            for item in sorted(rebal_items, key=lambda x: x["diff_value"]):
                if item["diff_value"] >= -effective_min_order_krw:  # 매도 불필요
                    continue
                if effective_daily_max_krw is not None:
                    remaining_daily_krw = max(0.0, effective_daily_max_krw - used_daily_order_krw)
                    if remaining_daily_krw < effective_min_order_krw:
                        print(
                            "[REBAL] 매도 skip: "
                            f"strategy_id={strat_id} symbol={item['symbol']} "
                            f"reason=daily_max_krw_remaining_too_low remaining={remaining_daily_krw:,.0f}원 "
                            f"limit={effective_daily_max_krw:,.0f}원"
                        )
                        break
                else:
                    remaining_daily_krw = None
                sell_value = self._clamp_adjust_value(
                    abs(item["diff_value"]), adjust_cap_krw
                )
                if remaining_daily_krw is not None:
                    sell_value = min(sell_value, remaining_daily_krw)
                sell_qty = round(sell_value / item["price"], 8)
                if sell_qty * item["price"] < effective_min_order_krw:
                    continue

                submit_result = self._submit_order(
                    exchange, user_id, item["symbol"], "SELL",
                    item["price"], sell_value, sell_qty, is_dry_run
                )
                order_id = submit_result["order_id"]
                status = "SUBMITTED" if order_id else "FAILED"
                after_value = item["current_value"] - sell_value
                after_pct = after_value / total_value * 100
                cur.execute("""
                    INSERT INTO rebalancing_orders
                    (strategy_id, user_id, symbol, side, price, amount_krw, qty,
                     before_pct, after_pct, target_pct, status, exchange_order_id)
                    VALUES (%s,%s,%s,'SELL',%s,%s,%s,%s,%s,%s,%s,%s)
                    RETURNING id
                """, (strat_id, user_id, item["symbol"],
                      item["price"], sell_value, sell_qty,
                      round(item["current_pct"], 2), round(after_pct, 2),
                      item["target_pct"], status, order_id))
                rebalancing_order_id = cur.fetchone()[0]
                if order_id:
                    submitted_orders += 1
                    if effective_daily_max_krw is not None:
                        used_daily_order_krw += sell_value
                    print(f"[REBAL] 매도: {item['symbol']} {sell_value:,.0f}원 "
                          f"({item['current_pct']:.1f}% → {after_pct:.1f}%)")
                else:
                    failed_orders += 1
                    self._record_rebalance_order_failure(
                        cur,
                        strategy_id=strat_id,
                        user_id=user_id,
                        exchange=exchange,
                        symbol=item["symbol"],
                        side="SELL",
                        price=item["price"],
                        amount_krw=sell_value,
                        qty=sell_qty,
                        rebalancing_order_id=rebalancing_order_id,
                        failure_class=submit_result["failure_class"],
                        failure_message=submit_result["failure_message"],
                    )

            conn.commit()

        # 매수 (KRW 사용)
        krw_balance = self._get_krw_balance(exchange, user_id, is_dry_run)
        for item in sorted(rebal_items, key=lambda x: x["diff_value"], reverse=True):
            if item["diff_value"] <= effective_min_order_krw:
                continue
            if effective_daily_max_krw is not None:
                remaining_daily_krw = max(0.0, effective_daily_max_krw - used_daily_order_krw)
                if remaining_daily_krw < effective_min_order_krw:
                    print(
                        "[REBAL] 매수 skip: "
                        f"strategy_id={strat_id} symbol={item['symbol']} "
                        f"reason=daily_max_krw_remaining_too_low remaining={remaining_daily_krw:,.0f}원 "
                        f"limit={effective_daily_max_krw:,.0f}원"
                    )
                    break
            else:
                remaining_daily_krw = None
            capped_buy_value = self._clamp_adjust_value(
                item["diff_value"], adjust_cap_krw
            )
            if remaining_daily_krw is not None:
                capped_buy_value = min(capped_buy_value, remaining_daily_krw)
            buy_value = min(capped_buy_value, krw_balance)
            if buy_value < effective_min_order_krw:
                continue

            buy_qty = round(buy_value / item["price"], 8)
            submit_result = self._submit_order(
                exchange, user_id, item["symbol"], "BUY",
                item["price"], buy_value, buy_qty, is_dry_run
            )
            order_id = submit_result["order_id"]
            status = "SUBMITTED" if order_id else "FAILED"
            after_value = item["current_value"] + buy_value
            after_pct = after_value / total_value * 100
            cur.execute("""
                INSERT INTO rebalancing_orders
                (strategy_id, user_id, symbol, side, price, amount_krw, qty,
                 before_pct, after_pct, target_pct, status, exchange_order_id)
                VALUES (%s,%s,%s,'BUY',%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
            """, (strat_id, user_id, item["symbol"],
                  item["price"], buy_value, buy_qty,
                  round(item["current_pct"], 2), round(after_pct, 2),
                  item["target_pct"], status, order_id))
            rebalancing_order_id = cur.fetchone()[0]
            if order_id:
                submitted_orders += 1
                krw_balance -= buy_value
                if effective_daily_max_krw is not None:
                    used_daily_order_krw += buy_value
                print(f"[REBAL] 매수: {item['symbol']} {buy_value:,.0f}원 "
                      f"({item['current_pct']:.1f}% → {after_pct:.1f}%)")
            else:
                failed_orders += 1
                self._record_rebalance_order_failure(
                    cur,
                    strategy_id=strat_id,
                    user_id=user_id,
                    exchange=exchange,
                    symbol=item["symbol"],
                    side="BUY",
                    price=item["price"],
                    amount_krw=buy_value,
                    qty=buy_qty,
                    rebalancing_order_id=rebalancing_order_id,
                    failure_class=submit_result["failure_class"],
                    failure_message=submit_result["failure_message"],
                )

        # 전략 상태 업데이트
        cur.execute("""
            UPDATE rebalancing_strategies SET
            last_rebal_at=NOW(), rebal_count=rebal_count+1,
            total_value_krw=%s, updated_at=NOW()
            WHERE id=%s
        """, (total_value, strat_id))

        # 자산 현재 비중 업데이트
        for item in rebal_items:
            cur.execute("""
                UPDATE rebalancing_assets SET
                current_pct=%s, current_value_krw=%s,
                avg_price=%s, updated_at=NOW()
                WHERE strategy_id=%s AND symbol=%s
            """, (round(item["current_pct"], 2),
                  round(item["current_value"], 2),
                  item["price"], strat_id, item["symbol"]))

        conn.commit()
        print(f"[REBAL] 리밸런싱 완료: strategy_id={strat_id}")
        return {
            "success": True,
            "executed": True,
            "reason": "completed",
            "total_value": float(total_value),
            "submitted_orders": submitted_orders,
            "failed_orders": failed_orders,
        }

    def _run_loaded_strategy(self, conn, cur, strat, force=False):
        (strat_id, user_id, exchange, status, trigger_type,
         interval_hours, threshold_pct,
         last_rebal_at, next_rebal_at, is_dry_run,
         min_order_krw, max_adjust_pct, max_adjust_krw, daily_max_krw,
         rebal_method) = strat

        if status != "ACTIVE":
            return {
                "success": False,
                "executed": False,
                "reason": "inactive_status",
                "status": status,
            }

        if not self._try_lock_strategy(cur, strat_id):
            print(f"[REBAL] 실행 skip: strategy_id={strat_id} already running")
            return {
                "success": False,
                "executed": False,
                "reason": "already_running",
            }

        try:
            if not (is_dry_run or DRY_RUN):
                client = self._get_client(exchange, user_id)
                if not client:
                    print(
                        f"[REBAL] 실행 skip: strategy_id={strat_id} "
                        f"user_id={user_id} exchange={exchange} client not ready"
                    )
                    return {
                        "success": False,
                        "executed": False,
                        "reason": "client_not_ready",
                    }

            assets = self._fetch_strategy_assets(cur, strat_id)
            if not assets:
                print(f"[REBAL] 실행 skip: strategy_id={strat_id} no assets")
                return {
                    "success": False,
                    "executed": False,
                    "reason": "no_assets",
                }

            assets = self._sync_strategy_current_qty(
                conn, cur, strat_id, user_id, exchange, assets, is_dry_run
            )

            symbols = [a[3] for a in assets]
            prices = self._get_prices(exchange, symbols)
            if not prices:
                print(f"[REBAL] 실행 skip: strategy_id={strat_id} exchange={exchange} price unavailable")
                return {
                    "success": False,
                    "executed": False,
                    "reason": "price_unavailable",
                }

            strat_for_check = (
                strat_id, trigger_type, interval_hours,
                threshold_pct, last_rebal_at, next_rebal_at
            )
            if not force and not self._should_rebalance(strat_for_check, assets, prices):
                return {
                    "success": True,
                    "executed": False,
                    "reason": "not_due",
                }

            effective_rebal_method = str(rebal_method or "BOTH").upper()
            if effective_rebal_method == "NEW_FUND":
                print(
                    "[REBAL] 실행 skip: "
                    f"strategy_id={strat_id} reason=rebal_method_new_fund_unsupported"
                )
                return {
                    "success": False,
                    "executed": False,
                    "reason": "new_fund_mode_unsupported",
                }

            return self._execute_rebalance(
                conn, cur, strat_id, user_id, exchange,
                assets, prices, is_dry_run,
                min_order_krw=min_order_krw,
                max_adjust_pct=max_adjust_pct,
                max_adjust_krw=max_adjust_krw,
                daily_max_krw=daily_max_krw,
                rebal_method=rebal_method,
            )
        finally:
            self._unlock_strategy(cur, strat_id)

    def execute_strategy_now(self, strat_id, user_id):
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT rs.id, rs.user_id, rs.exchange, rs.status, rs.trigger_type,
                       rs.interval_hours, rs.threshold_pct,
                       rs.last_rebal_at, rs.next_rebal_at, u.is_dry_run,
                       rs.min_order_krw, rs.max_adjust_pct, rs.max_adjust_krw,
                       rs.daily_max_krw, rs.rebal_method
                FROM rebalancing_strategies rs
                JOIN users u ON u.id = rs.user_id
                WHERE rs.id=%s AND rs.user_id=%s
            """, (strat_id, user_id))
            strat = cur.fetchone()
            if not strat:
                return {
                    "success": False,
                    "executed": False,
                    "reason": "not_found",
                }
            return self._run_loaded_strategy(conn, cur, strat, force=True)
        except Exception as e:
            conn.rollback()
            print(f"[REBAL] 즉시 실행 오류: strategy_id={strat_id} user_id={user_id} error={e}")
            return {
                "success": False,
                "executed": False,
                "reason": "exception",
                "detail": str(e),
            }
        finally:
            cur.close()
            conn.close()

    async def run_once(self):
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT ro.id, ro.user_id, rs.exchange, ro.exchange_order_id
                FROM rebalancing_orders ro
                JOIN rebalancing_strategies rs ON rs.id = ro.strategy_id
                WHERE ro.status='SUBMITTED' AND ro.exchange_order_id IS NOT NULL
            """)
            for order_id, user_id, exchange, exchange_order_id in cur.fetchall():
                client = self._get_client(exchange, user_id)
                if not client:
                    print(f"[REBAL] 상태조회 skip: order_id={order_id} user_id={user_id} exchange={exchange} user client not ready")
                    continue
                order = client.get_order(exchange_order_id)
                if order and order.get("state") == "done":
                    cur.execute(
                        "UPDATE rebalancing_orders SET status='FILLED' WHERE id=%s",
                        (order_id,)
                    )

            cur.execute("""
                SELECT rs.id, rs.user_id, rs.exchange, rs.status, rs.trigger_type,
                       rs.interval_hours, rs.threshold_pct,
                       rs.last_rebal_at, rs.next_rebal_at, u.is_dry_run,
                       rs.min_order_krw, rs.max_adjust_pct, rs.max_adjust_krw,
                       rs.daily_max_krw, rs.rebal_method
                FROM rebalancing_strategies rs
                JOIN users u ON u.id = rs.user_id
                WHERE rs.status = 'ACTIVE'
            """)
            strategies = cur.fetchall()

            for strat in strategies:
                self._run_loaded_strategy(conn, cur, strat, force=False)

        except Exception as e:
            conn.rollback()
            print(f"[REBAL] run_once 오류: {e}")
        finally:
            cur.close()
            conn.close()

    async def start(self):
        self._running = True
        print(f"[REBAL] 리밸런싱 엔진 시작 — 주기={self.interval_sec}초")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[REBAL] 루프 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[REBAL] 리밸런싱 엔진 종료")
