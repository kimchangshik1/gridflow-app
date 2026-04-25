import asyncio
import psycopg2
from datetime import datetime, timezone, timedelta
from app.core.config import DB_URL, DRY_RUN

def get_conn():
    return psycopg2.connect(DB_URL)

def now_utc():
    return datetime.now(timezone.utc)


class DCAEngine:
    """
    DCA (분할매수) + 적립식 매수 엔진
    - PRICE 타입: 가격이 N% 하락할 때마다 매수
    - TIME 타입: N시간마다 매수
    - ACCUMULATE 타입: 매일/매주/매월 정해진 시간에 매수
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

    def _get_current_price(self, exchange, symbol):
        try:
            import requests
            if exchange == "upbit":
                r = requests.get(f"https://api.upbit.com/v1/ticker?markets={symbol}", timeout=5)
                return float(r.json()[0]["trade_price"])
            elif exchange == "bithumb":
                coin = symbol.replace("KRW-", "")
                r = requests.get(f"https://api.bithumb.com/public/ticker/{coin}_KRW", timeout=5)
                return float(r.json()["data"]["closing_price"])
        except Exception as e:
            print(f"[DCA] 현재가 조회 실패 {symbol}: {e}")
            return None

    def _submit_order(self, exchange, symbol, price, amount_krw, is_dry_run, client):
        """매수 주문 제출"""
        if DRY_RUN or is_dry_run:
            return f"DCA-DRY-{now_utc().timestamp()}"
        try:
            if exchange == "upbit" and client:
                return client.submit_buy_order(symbol, price, amount_krw)
            elif exchange == "bithumb" and client:
                return client.submit_buy_order(symbol, price, amount_krw)
        except Exception as e:
            print(f"[DCA] 주문 제출 오류: {e}")
        return None

    def _execute_buy(self, conn, cur, strat, current_price, is_dry_run):
        """매수 실행"""
        (strat_id, user_id, exchange, symbol, strategy_type,
         total_amount, amount_per_order, total_rounds, completed_rounds,
         avg_price, total_qty, total_invested, last_buy_price,
         *_extra) = strat

        amount_per_order = float(amount_per_order)
        completed_rounds = int(completed_rounds)
        total_rounds = int(total_rounds)

        # 완료 체크
        if completed_rounds >= total_rounds:
            cur.execute(
                "UPDATE dca_strategies SET status='COMPLETED', updated_at=NOW() WHERE id=%s",
                (strat_id,)
            )
            print(f"[DCA] 전략 완료: {symbol} ({completed_rounds}/{total_rounds})")
            return

        # 잔여 투자금 체크
        remaining = float(total_amount) - float(total_invested or 0)
        if remaining < amount_per_order:
            amount_per_order = remaining
        if amount_per_order < 5500:
            cur.execute(
                "UPDATE dca_strategies SET status='COMPLETED', updated_at=NOW() WHERE id=%s",
                (strat_id,)
            )
            print(f"[DCA] 잔여금 부족 → 완료: {symbol}")
            return

        # 주문 제출
        client = self._get_client(exchange, user_id)
        if not client:
            print(f"[DCA] 주문 skip: {symbol} user_id={user_id} exchange={exchange} user client not ready")
            return
        order_id = self._submit_order(exchange, symbol, current_price, amount_per_order, is_dry_run, client)
        status = "SUBMITTED" if order_id else "FAILED"
        if not order_id:
            print(f"[DCA] 주문 실패: {symbol}")

        qty = amount_per_order / current_price
        new_total_qty = float(total_qty or 0) + qty
        new_total_invested = float(total_invested or 0) + amount_per_order
        new_avg = new_total_invested / new_total_qty if new_total_qty > 0 else 0
        new_rounds = completed_rounds + 1

        # 주문 이력 저장
        cur.execute("""
            INSERT INTO dca_orders
            (strategy_id, user_id, exchange, symbol, round_num, price, amount_krw, qty, status, exchange_order_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (strat_id, user_id, exchange, symbol, new_rounds,
              current_price, amount_per_order, qty, status, order_id))

        if not order_id:
            return

        # 전략 업데이트
        is_complete = new_rounds >= total_rounds
        cur.execute("""
            UPDATE dca_strategies SET
            completed_rounds=%s, avg_price=%s, total_qty=%s,
            total_invested=%s, last_buy_price=%s, last_buy_at=NOW(),
            first_buy_price=COALESCE(first_buy_price, %s),
            status=CASE WHEN %s THEN 'COMPLETED' ELSE status END,
            updated_at=NOW()
            WHERE id=%s
        """, (new_rounds, new_avg, new_total_qty, new_total_invested,
              current_price, current_price, is_complete, strat_id))

        print(f"[DCA] 매수 실행: {symbol} {current_price}원 x {qty:.4f} ({new_rounds}/{total_rounds}회)")

    def _should_buy_price(self, strat, current_price):
        """PRICE 타입: 가격이 N% 하락했는지 체크"""
        last_buy_price = strat[12]
        price_drop_pct = strat[14] if len(strat) > 14 else None
        if not price_drop_pct:
            return False
        if not last_buy_price:
            return True  # 첫 매수
        drop = (float(last_buy_price) - current_price) / float(last_buy_price) * 100
        return drop >= float(price_drop_pct)

    def _should_buy_time(self, strat, current_price):
        """TIME 타입: 시간 간격 체크"""
        last_buy_at = strat[13] if len(strat) > 13 else None
        time_interval = strat[15] if len(strat) > 15 else None
        if not time_interval:
            return False
        if not last_buy_at:
            return True  # 첫 매수
        elapsed = (now_utc() - last_buy_at).total_seconds() / 3600
        return elapsed >= float(time_interval)

    def _should_buy_accumulate(self, strat):
        """ACCUMULATE 타입: 스케줄 체크"""
        schedule = strat[16] if len(strat) > 16 else None
        last_buy_at = strat[13] if len(strat) > 13 else None
        if not schedule:
            return False
        if not last_buy_at:
            return True
        now = now_utc()
        if schedule == "DAILY":
            return (now - last_buy_at).total_seconds() >= 86400
        elif schedule == "WEEKLY":
            return (now - last_buy_at).total_seconds() >= 604800
        elif schedule == "MONTHLY":
            return (now - last_buy_at).days >= 30
        return False

    async def run_once(self):
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT id, user_id, exchange, exchange_order_id
                FROM dca_orders
                WHERE status='SUBMITTED' AND exchange_order_id IS NOT NULL
            """)
            for order_id, user_id, exchange, exchange_order_id in cur.fetchall():
                client = self._get_client(exchange, user_id)
                if not client:
                    print(f"[DCA] 상태조회 skip: order_id={order_id} user_id={user_id} exchange={exchange} user client not ready")
                    continue
                order = client.get_order(exchange_order_id)
                if order and order.get("state") == "done":
                    cur.execute(
                        "UPDATE dca_orders SET status='FILLED' WHERE id=%s",
                        (order_id,)
                    )

            cur.execute("""
                SELECT ds.id, ds.user_id, ds.exchange, ds.symbol, ds.strategy_type,
                       ds.total_amount, ds.amount_per_order, ds.total_rounds,
                       ds.completed_rounds, ds.avg_price, ds.total_qty,
                       ds.total_invested, ds.last_buy_price, ds.last_buy_at,
                       ds.price_drop_pct, ds.time_interval_hours,
                       ds.accumulate_schedule, ds.stop_loss_price,
                       ds.max_avg_price, ds.interval_type, u.is_dry_run
                FROM dca_strategies ds
                JOIN users u ON u.id = ds.user_id
                WHERE ds.status = 'ACTIVE'
            """)
            strategies = cur.fetchall()

            for strat in strategies:
                (strat_id, user_id, exchange, symbol, strategy_type,
                 total_amount, amount_per_order, total_rounds, completed_rounds,
                 avg_price, total_qty, total_invested, last_buy_price, last_buy_at,
                 price_drop_pct, time_interval_hours, accumulate_schedule,
                 stop_loss_price, max_avg_price, interval_type, is_dry_run) = strat

                current_price = self._get_current_price(exchange, symbol)
                if not current_price:
                    continue

                # 손절가 체크
                if stop_loss_price and current_price <= float(stop_loss_price):
                    cur.execute(
                        "UPDATE dca_strategies SET status='PAUSED', updated_at=NOW() WHERE id=%s",
                        (strat_id,)
                    )
                    print(f"[DCA] 손절가 도달 → 정지: {symbol}")
                    continue

                # 평균단가 한도 체크
                if max_avg_price and avg_price and float(avg_price) >= float(max_avg_price):
                    print(f"[DCA] 평균단가 한도 도달 → 매수 건너뜀: {symbol}")
                    continue

                # 매수 조건 체크
                should_buy = False
                if strategy_type == "DCA":
                    if interval_type == "TIME":
                        should_buy = self._should_buy_time(strat, current_price)
                    else:
                        should_buy = self._should_buy_price(strat, current_price)
                elif strategy_type == "ACCUMULATE":
                    should_buy = self._should_buy_accumulate(strat)

                if should_buy:
                    self._execute_buy(conn, cur, strat, current_price, is_dry_run)

            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"[DCA] run_once 오류: {e}")
        finally:
            cur.close()
            conn.close()

    async def start(self):
        self._running = True
        print(f"[DCA] 엔진 시작 — 주기={self.interval_sec}초")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[DCA] 루프 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[DCA] 엔진 종료")
