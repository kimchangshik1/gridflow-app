import asyncio
import psycopg2
import requests
from datetime import datetime, timezone, timedelta
from app.core.config import DB_URL, DRY_RUN

def get_conn():
    return psycopg2.connect(DB_URL)

def now_utc():
    return datetime.now(timezone.utc)


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
        try:
            if exchange == "upbit" and self.upbit_client:
                return self.upbit_client.get_krw_balance()
            elif exchange == "bithumb" and self.bithumb_client:
                return self.bithumb_client.get_krw_balance()
        except Exception as e:
            print(f"[REBAL] KRW 잔고 조회 실패: {e}")
        return 0

    def _submit_order(self, exchange, symbol, side, price, amount_krw, qty, is_dry_run):
        """매수/매도 주문 제출"""
        if DRY_RUN or is_dry_run:
            fake_id = f"REBAL-DRY-{side}-{symbol}-{int(now_utc().timestamp())}"
            print(f"[REBAL][DRY] {side}: {symbol} {price}원 금액={amount_krw}원")
            return fake_id
        try:
            client = self.upbit_client if exchange == "upbit" else self.bithumb_client
            if not client:
                return None
            if side == "BUY":
                return client.submit_buy_order(symbol, price, amount_krw)
            else:
                return client.submit_sell_order(symbol, price, qty)
        except Exception as e:
            print(f"[REBAL] 주문 오류 {side} {symbol}: {e}")
            return None

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
                           assets, prices, is_dry_run):
        """리밸런싱 실행"""
        # KRW 포함 총 포트폴리오 가치 계산
        krw_balance = self._get_krw_balance(exchange, user_id, is_dry_run)
        coin_value = sum(
            float(a[5]) * prices.get(a[3], 0)
            for a in assets
        )
        total_value = coin_value + krw_balance

        if total_value < 10000:
            print(f"[REBAL] 포트폴리오 가치 부족: {total_value}원")
            return

        print(f"[REBAL] 리밸런싱 시작: 총 {total_value:,.0f}원")

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
        for item in sorted(rebal_items, key=lambda x: x["diff_value"]):
            if item["diff_value"] >= -5500:  # 매도 불필요
                continue
            sell_value = abs(item["diff_value"])
            sell_qty = round(sell_value / item["price"], 8)
            if sell_qty * item["price"] < 5500:
                continue

            order_id = self._submit_order(
                exchange, item["symbol"], "SELL",
                item["price"], sell_value, sell_qty, is_dry_run
            )
            status = "SUBMITTED" if order_id else "FAILED"
            after_value = item["current_value"] - sell_value
            after_pct = after_value / total_value * 100
            cur.execute("""
                INSERT INTO rebalancing_orders
                (strategy_id, user_id, symbol, side, price, amount_krw, qty,
                 before_pct, after_pct, target_pct, status, exchange_order_id)
                VALUES (%s,%s,%s,'SELL',%s,%s,%s,%s,%s,%s,%s,%s)
            """, (strat_id, user_id, item["symbol"],
                  item["price"], sell_value, sell_qty,
                  round(item["current_pct"], 2), round(after_pct, 2),
                  item["target_pct"], status, order_id))
            if order_id:
                print(f"[REBAL] 매도: {item['symbol']} {sell_value:,.0f}원 "
                      f"({item['current_pct']:.1f}% → {after_pct:.1f}%)")

        conn.commit()

        # 매수 (KRW 사용)
        krw_balance = self._get_krw_balance(exchange, user_id, is_dry_run)
        for item in sorted(rebal_items, key=lambda x: x["diff_value"], reverse=True):
            if item["diff_value"] <= 5500:
                continue
            buy_value = min(item["diff_value"], krw_balance)
            if buy_value < 5500:
                continue

            order_id = self._submit_order(
                exchange, item["symbol"], "BUY",
                item["price"], buy_value, 0, is_dry_run
            )
            status = "SUBMITTED" if order_id else "FAILED"
            after_value = item["current_value"] + buy_value
            after_pct = after_value / total_value * 100
            cur.execute("""
                INSERT INTO rebalancing_orders
                (strategy_id, user_id, symbol, side, price, amount_krw, qty,
                 before_pct, after_pct, target_pct, status, exchange_order_id)
                VALUES (%s,%s,%s,'BUY',%s,%s,%s,%s,%s,%s,%s,%s)
            """, (strat_id, user_id, item["symbol"],
                  item["price"], buy_value, round(buy_value/item["price"], 8),
                  round(item["current_pct"], 2), round(after_pct, 2),
                  item["target_pct"], status, order_id))
            if order_id:
                krw_balance -= buy_value
                print(f"[REBAL] 매수: {item['symbol']} {buy_value:,.0f}원 "
                      f"({item['current_pct']:.1f}% → {after_pct:.1f}%)")

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
                SELECT rs.id, rs.user_id, rs.exchange, rs.trigger_type,
                       rs.interval_hours, rs.threshold_pct,
                       rs.last_rebal_at, rs.next_rebal_at, u.is_dry_run
                FROM rebalancing_strategies rs
                JOIN users u ON u.id = rs.user_id
                WHERE rs.status = 'ACTIVE'
            """)
            strategies = cur.fetchall()

            for strat in strategies:
                (strat_id, user_id, exchange, trigger_type,
                 interval_hours, threshold_pct,
                 last_rebal_at, next_rebal_at, is_dry_run) = strat

                # 자산 목록 조회
                cur.execute("""
                    SELECT id, strategy_id, user_id, symbol,
                           target_pct, current_qty
                    FROM rebalancing_assets
                    WHERE strategy_id=%s
                    ORDER BY target_pct DESC
                """, (strat_id,))
                assets = cur.fetchall()

                if not assets:
                    continue

                # 현재가 조회
                symbols = [a[3] for a in assets]
                prices = self._get_prices(exchange, symbols)
                if not prices:
                    continue

                # 리밸런싱 필요 여부 판단
                strat_for_check = (
                    strat_id, trigger_type, interval_hours,
                    threshold_pct, last_rebal_at, next_rebal_at
                )
                if self._should_rebalance(strat_for_check, assets, prices):
                    self._execute_rebalance(
                        conn, cur, strat_id, user_id, exchange,
                        assets, prices, is_dry_run
                    )

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
