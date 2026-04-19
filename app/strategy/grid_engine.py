import asyncio
import psycopg2
from decimal import Decimal
from datetime import datetime, timezone
from app.core.config import DB_URL, DRY_RUN

def get_conn():
    return psycopg2.connect(DB_URL)

def now_utc():
    return datetime.now(timezone.utc)


class GridEngine:
    def __init__(self, upbit_client=None, bithumb_client=None, interval_sec=5, user_manager=None):
        self.upbit_client = upbit_client
        self.bithumb_client = bithumb_client
        self.interval_sec = interval_sec
        self._running = False
        # S2: 매수 실패 재시도 cooldown {order_id: fail_timestamp}
        # 같은 주문 60초 이내 재시도 차단 → activity_log 폭주 방지
        self._buy_fail_cooldown: dict = {}
        # S2-2: 유저별 실제 API 키 클라이언트 조회용 — UserBotManager 참조
        self._user_manager = user_manager

    def _get_client(self, exchange, user_id):
        # S2-2: 유저별 클라이언트 우선 조회 (실제 API 키 보유)
        if self._user_manager is not None:
            user_bot = self._user_manager._user_bots.get(user_id)
            if user_bot:
                if exchange == "upbit":
                    uc = getattr(user_bot, "upbit_client", None)
                    if uc:
                        return uc
                elif exchange == "bithumb":
                    bc = getattr(user_bot, "bithumb_client", None)
                    if bc:
                        return bc
        # 폴백: 공용 shared_client (심볼/가격 조회 전용, 주문 불가)
        if exchange == "upbit" and self.upbit_client:
            return self.upbit_client
        if exchange == "bithumb" and self.bithumb_client:
            return self.bithumb_client
        return None

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
            print(f"[GRID] 현재가 조회 실패 {symbol}: {e}")
            return None

    def create_strategy(self, user_id, exchange, symbol, base_price,
                        range_pct, grid_count, amount_per_grid, profit_gap,
                        max_investment=None, stop_loss_price=None,
                        daily_loss_limit=None, profit_target_pct=None,
                        smart_sell_mode="BASIC",
                        split_count=3, split_ratio="40,35,25", split_gap_pct=1.0,
                        trailing_pct=2.0, trailing_trigger_pct=1.0):
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO grid_strategies
                (user_id, exchange, symbol, base_price, range_pct, grid_count,
                 amount_per_grid, profit_gap, status,
                 max_investment, stop_loss_price, daily_loss_limit, profit_target_pct,
                 smart_sell_mode, split_count, split_ratio, split_gap_pct,
                 trailing_pct, trailing_trigger_pct)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE',
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (user_id, exchange, symbol, base_price, range_pct,
                  grid_count, amount_per_grid, profit_gap,
                  max_investment, stop_loss_price, daily_loss_limit, profit_target_pct,
                  smart_sell_mode, split_count, split_ratio, split_gap_pct,
                  trailing_pct, trailing_trigger_pct))
            strategy_id = cur.fetchone()[0]

            lower = float(base_price) * (1 - float(range_pct) / 100)
            upper = float(base_price) * (1 + float(range_pct) / 100)
            step = (upper - lower) / grid_count

            for i in range(grid_count):
                buy_price = round(lower + step * i, 2)
                sell_price = round(buy_price + float(profit_gap), 2)
                qty = round(float(amount_per_grid) / buy_price, 8)
                cur.execute("""
                    INSERT INTO grid_orders
                    (strategy_id, user_id, exchange, symbol, side, grid_level,
                     buy_price, sell_price, amount_krw, qty, status)
                    VALUES (%s, %s, %s, %s, 'BUY', %s, %s, %s, %s, %s, 'WAITING')
                """, (strategy_id, user_id, exchange, symbol, i+1,
                      buy_price, sell_price, amount_per_grid, qty))

            conn.commit()
            print(f"[GRID] 전략 생성: id={strategy_id} {symbol} {grid_count}개 그리드 mode={smart_sell_mode}")
            return strategy_id
        except Exception as e:
            conn.rollback()
            print(f"[GRID] 전략 생성 오류: {e}")
            raise
        finally:
            cur.close()
            conn.close()

    def _check_and_submit_buy(self, conn, cur, order, client, is_dry_run=False):
        current_price = self._get_current_price(order[4], order[5])
        if current_price is None:
            return
        buy_price = float(order[6])
        if current_price <= buy_price:
            order_id = order[0]

            # S2: 60초 cooldown — 동일 주문 연속 실패 시 재시도 및 activity_log 폭주 차단
            _fail_ts = self._buy_fail_cooldown.get(order_id)
            if _fail_ts and (now_utc() - _fail_ts).total_seconds() < 60:
                return

            strategy_id = order[1]
            cur.execute(
                "SELECT max_investment, current_investment, amount_per_grid FROM grid_strategies WHERE id=%s",
                (strategy_id,)
            )
            row = cur.fetchone()
            if row:
                max_inv, cur_inv, _ = row
                amount_krw = float(order[8])
                if max_inv and float(cur_inv or 0) + amount_krw > float(max_inv):
                    print(f"[GRID] 총투입 한도 초과 → 매수 건너뜀: {order[5]}")
                    return
            exchange = order[4]
            symbol = order[5]
            amount_krw = float(order[8])
            qty = float(order[9])
            raw_buy_fail_reason = None

            if DRY_RUN or is_dry_run:
                exchange_order_id = f"GRID-DRY-{order_id}"
                print(f"[GRID][DRY] 매수 주문: {symbol} {buy_price} x {qty}")
            else:
                if exchange == "upbit" and client:
                    exchange_order_id = client.submit_buy_order(symbol, buy_price, amount_krw)
                    raw_buy_fail_reason = getattr(client, "_last_buy_order_error", None)
                elif exchange == "bithumb" and client:
                    exchange_order_id = client.submit_buy_order(symbol, buy_price, amount_krw)
                    raw_buy_fail_reason = getattr(client, "_last_buy_order_error", None)
                else:
                    exchange_order_id = None
                    raw_buy_fail_reason = f"주문 클라이언트 없음: exchange={exchange}" if not client else f"지원하지 않는 거래소: {exchange}"

            if exchange_order_id:
                # 성공 시 cooldown 해제
                self._buy_fail_cooldown.pop(order_id, None)
                cur.execute("""
                    UPDATE grid_orders SET status='BUY_ORDERED',
                    buy_order_id=%s, updated_at=NOW()
                    WHERE id=%s
                """, (exchange_order_id, order_id))
                cur.execute("""
                    UPDATE grid_strategies SET
                    current_investment = COALESCE(current_investment,0) + %s,
                    updated_at=NOW() WHERE id=%s
                """, (float(order[8]), strategy_id))
                print(f"[GRID] 매수 주문 제출: {symbol} {buy_price}원 (level={order[7]})")
            else:
                # 첫 실패만 activity_log INSERT, 이후 60초 cooldown
                _is_first_fail = order_id not in self._buy_fail_cooldown
                self._buy_fail_cooldown[order_id] = now_utc()
                # S3: 실패 reason 판별 (raw reason은 로그에만 남기고 DB에는 짧은 라벨 저장)
                _buy_fail_reason = str(raw_buy_fail_reason).strip()[:100] if raw_buy_fail_reason else ""
                if not _buy_fail_reason:
                    _buy_fail_reason = '최소금액미달' if amount_krw < 5500 else 'API거부'
                print(f"[GRID][{exchange.upper()}] 매수 주문 실패({_buy_fail_reason}): symbol={symbol} price={buy_price} amount_krw={amount_krw} (cooldown 60s)")
                if _is_first_fail:
                    try:
                        _activity_status_ko = '주문실패'
                        cur.execute(
                            "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, strategy_type, price, amount_krw) VALUES (%s, 'order_fail', %s, %s, 'BUY', '매수', 'FAILED', %s, '그리드', %s, %s)",
                            (order[2], symbol, exchange, _activity_status_ko, buy_price, amount_krw)
                        )
                    except Exception as _log_err:
                        print(f"[GRID] activity_log 기록 실패: {_log_err}")

    def _check_buy_filled(self, conn, cur, order, client, is_dry_run=False, strategy=None):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]
        buy_order_id = order[10]

        filled = False
        if DRY_RUN or is_dry_run:
            current_price = self._get_current_price(exchange, symbol)
            if current_price and current_price <= float(order[6]):
                filled = True
        else:
            if client and buy_order_id:
                ex_order = client.get_order(buy_order_id)
                if ex_order and ex_order.get("state") == "done":
                    filled = True

        if filled:
            cur.execute("""
                UPDATE grid_orders SET status='BUY_FILLED', updated_at=NOW()
                WHERE id=%s
            """, (order_id,))
            print(f"[GRID] 매수 체결: {symbol} level={order[7]}")
            self._handle_smart_sell(conn, cur, order, client, is_dry_run, strategy)

    def _handle_smart_sell(self, conn, cur, order, client, is_dry_run=False, strategy=None):
        if strategy is None:
            self._submit_sell_order(conn, cur, order, client, is_dry_run)
            return
        mode = strategy.get("smart_sell_mode", "BASIC")
        if mode == "SPLIT":
            self._init_split_sell(conn, cur, order, client, is_dry_run, strategy)
        elif mode == "TRAILING":
            self._init_trailing(conn, cur, order, client, is_dry_run, strategy)
        elif mode == "BOTH":
            self._init_split_sell(conn, cur, order, client, is_dry_run, strategy, with_trailing=True)
        else:
            self._submit_sell_order(conn, cur, order, client, is_dry_run)

    def _submit_sell_order(self, conn, cur, order, client, is_dry_run=False):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]
        sell_price = round(float(order[7] if len(order) > 7 else order[6]) + 1, 2)
        qty = float(order[9])

        if DRY_RUN or is_dry_run:
            exchange_order_id = f"GRID-SELL-DRY-{order_id}"
            print(f"[GRID][DRY] 매도 주문: {symbol} {sell_price} x {qty}")
        else:
            if exchange == "upbit" and client:
                exchange_order_id = client.submit_sell_order(symbol, sell_price, qty)
            elif exchange == "bithumb" and client:
                exchange_order_id = client.submit_sell_order(symbol, sell_price, qty)
            else:
                return

        if exchange_order_id:
            cur.execute("""
                UPDATE grid_orders SET status='SELL_ORDERED',
                sell_price=%s, sell_order_id=%s, updated_at=NOW()
                WHERE id=%s
            """, (sell_price, exchange_order_id, order_id))
            print(f"[GRID] 매도 주문 제출: {symbol} {sell_price}원")
        else:
            # S3: 매도 실패 reason — qty가 아주 소량이면 최소금액 미달 가능, 그 외 API거부
            _sell_fail_reason = '최소수량미달' if float(qty) < 0.0001 else 'API거부'
            print(f"[GRID][{exchange.upper()}] 매도 주문 실패({_sell_fail_reason}): symbol={symbol} price={sell_price} qty={qty}")
            try:
                cur.execute(
                    "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, side, side_ko, status, status_ko, strategy_type, price, amount_krw) VALUES (%s, 'order_fail', %s, %s, 'SELL', '매도', 'FAILED', %s, '그리드', %s, %s)",
                    (order[2], symbol, exchange, _sell_fail_reason, sell_price, qty)
                )
            except Exception as _log_err:
                print(f"[GRID] activity_log 기록 실패: {_log_err}")

    def _init_split_sell(self, conn, cur, order, client, is_dry_run=False, strategy=None, with_trailing=False):
        order_id = order[0]
        buy_price = float(order[6])
        total_qty = float(order[9])

        split_count = int(strategy.get("split_count", 3))
        split_ratio_str = strategy.get("split_ratio", "40,35,25")
        split_gap_pct = float(strategy.get("split_gap_pct", 1.0))

        try:
            ratios = [float(x.strip()) for x in split_ratio_str.split(",")]
        except Exception:
            ratios = [100.0 / split_count] * split_count

        total_ratio = sum(ratios)
        ratios = [r / total_ratio * 100 for r in ratios]
        steps = min(split_count, len(ratios))

        step = 1
        sell_qty = round(total_qty * ratios[0] / 100, 8)
        remaining_qty = round(total_qty - sell_qty, 8)
        sell_price = round(buy_price * (1 + split_gap_pct / 100), 2)

        cur.execute("""
            UPDATE grid_orders SET
              smart_sell_step=%s,
              smart_sell_qty_remaining=%s,
              status='SELL_ORDERED',
              sell_price=%s,
              sell_order_id=NULL,
              updated_at=NOW()
            WHERE id=%s
        """, (step, remaining_qty, sell_price, order_id))

        exchange_order_id = self._place_sell_order(
            order, client, is_dry_run, sell_price, sell_qty, label=f"분할익절 1/{steps}"
        )
        if exchange_order_id:
            cur.execute("UPDATE grid_orders SET sell_order_id=%s WHERE id=%s", (exchange_order_id, order_id))
        print(f"[GRID][SPLIT] 1/{steps}차 매도 주문: {order[5]} {sell_price}원 x {sell_qty}")

    def _check_split_sell_filled(self, conn, cur, order, client, is_dry_run=False, strategy=None):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]
        sell_order_id = order[11] if len(order) > 11 else None
        buy_price = float(order[6])
        current_step = int(order[13]) if order[13] else 0
        remaining_qty = float(order[14]) if order[14] else 0

        split_count = int(strategy.get("split_count", 3))
        split_ratio_str = strategy.get("split_ratio", "40,35,25")
        split_gap_pct = float(strategy.get("split_gap_pct", 1.0))
        strategy_id = order[1]
        with_trailing = strategy.get("smart_sell_mode") == "BOTH"

        try:
            ratios = [float(x.strip()) for x in split_ratio_str.split(",")]
        except Exception:
            ratios = [100.0 / split_count] * split_count
        total_ratio = sum(ratios)
        ratios = [r / total_ratio * 100 for r in ratios]
        steps = min(split_count, len(ratios))

        filled = self._is_sell_filled(exchange, symbol, sell_order_id, client, is_dry_run, order)
        if not filled:
            return

        total_qty = float(order[9])
        filled_qty = round(total_qty * ratios[current_step - 1] / 100, 8)
        sell_price = round(buy_price * (1 + split_gap_pct * current_step / 100), 2)
        partial_profit = round((sell_price - buy_price) * filled_qty, 2)

        print(f"[GRID][SPLIT] {current_step}/{steps}차 체결: {symbol} 수익≈{partial_profit}원")

        cur.execute("""
            UPDATE grid_strategies SET
            total_profit = total_profit + %s, updated_at=NOW()
            WHERE id=%s
        """, (partial_profit, strategy_id))

        next_step = current_step + 1

        if next_step > steps or remaining_qty <= 0:
            cur.execute("""
                UPDATE grid_strategies SET
                current_investment = GREATEST(0, COALESCE(current_investment,0) - %s),
                daily_loss = CASE WHEN %s < 0 THEN COALESCE(daily_loss,0) + ABS(%s) ELSE daily_loss END,
                updated_at=NOW() WHERE id=%s
            """, (float(order[8]), partial_profit, partial_profit, strategy_id))
            cur.execute("""
                UPDATE grid_orders SET
                status='WAITING', buy_order_id=NULL, sell_order_id=NULL,
                smart_sell_step=0, smart_sell_qty_remaining=NULL,
                profit=%s, updated_at=NOW()
                WHERE id=%s
            """, (partial_profit, order_id))
            print(f"[GRID][SPLIT] 전체 익절 완료: {symbol} → 재매수 대기")
            return

        if with_trailing and next_step == steps:
            current_price = self._get_current_price(exchange, symbol)
            cur.execute("""
                UPDATE grid_orders SET
                smart_sell_step=%s,
                trailing_active=TRUE,
                trailing_high_price=%s,
                sell_order_id=NULL,
                updated_at=NOW()
                WHERE id=%s
            """, (next_step, current_price or buy_price, order_id))
            print(f"[GRID][BOTH] 마지막 잔량 트레일링 전환: {symbol} 잔량={remaining_qty}")
            return

        next_sell_qty = round(total_qty * ratios[next_step - 1] / 100, 8)
        next_remaining = round(remaining_qty - next_sell_qty, 8)
        next_sell_price = round(buy_price * (1 + split_gap_pct * next_step / 100), 2)

        cur.execute("""
            UPDATE grid_orders SET
            smart_sell_step=%s, smart_sell_qty_remaining=%s,
            sell_order_id=NULL, updated_at=NOW()
            WHERE id=%s
        """, (next_step, max(0, next_remaining), order_id))

        exchange_order_id = self._place_sell_order(
            order, client, is_dry_run, next_sell_price, next_sell_qty,
            label=f"분할익절 {next_step}/{steps}"
        )
        if exchange_order_id:
            cur.execute("UPDATE grid_orders SET sell_order_id=%s WHERE id=%s", (exchange_order_id, order_id))
        print(f"[GRID][SPLIT] {next_step}/{steps}차 매도 주문: {symbol} {next_sell_price}원 x {next_sell_qty}")

    def _init_trailing(self, conn, cur, order, client, is_dry_run=False, strategy=None):
        order_id = order[0]
        buy_price = float(order[6])
        current_price = self._get_current_price(order[4], order[5]) or buy_price

        cur.execute("""
            UPDATE grid_orders SET
            status='SELL_ORDERED',
            trailing_active=FALSE,
            trailing_high_price=%s,
            sell_order_id=NULL,
            updated_at=NOW()
            WHERE id=%s
        """, (current_price, order_id))
        print(f"[GRID][TRAIL] 트레일링 스탑 대기 시작: {order[5]} 매수가={buy_price} 현재가={current_price}")

    def _check_trailing(self, conn, cur, order, client, is_dry_run=False, strategy=None):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]
        buy_price = float(order[6])
        qty = float(order[9])
        strategy_id = order[1]
        trailing_pct = float(strategy.get("trailing_pct", 2.0))
        trigger_pct = float(strategy.get("trailing_trigger_pct", 1.0))
        trailing_active = order[15] if len(order) > 15 else False
        trailing_high = float(order[16]) if (len(order) > 16 and order[16]) else buy_price

        current_price = self._get_current_price(exchange, symbol)
        if current_price is None:
            return

        if not trailing_active:
            trigger_price = buy_price * (1 + trigger_pct / 100)
            if current_price >= trigger_price:
                cur.execute("""
                    UPDATE grid_orders SET trailing_active=TRUE, trailing_high_price=%s, updated_at=NOW()
                    WHERE id=%s
                """, (current_price, order_id))
                trailing_active = True
                trailing_high = current_price
                print(f"[GRID][TRAIL] 트레일링 활성화: {symbol} 현재가={current_price}")
            else:
                return

        if current_price > trailing_high:
            trailing_high = current_price
            cur.execute("""
                UPDATE grid_orders SET trailing_high_price=%s, updated_at=NOW()
                WHERE id=%s
            """, (trailing_high, order_id))

        stop_price = trailing_high * (1 - trailing_pct / 100)
        if current_price <= stop_price:
            print(f"[GRID][TRAIL] 트레일링 스탑 발동: {symbol} 고점={trailing_high} 현재={current_price}")
            self._execute_trailing_sell(conn, cur, order, client, is_dry_run, strategy, current_price)

    def _execute_trailing_sell(self, conn, cur, order, client, is_dry_run=False, strategy=None, current_price=None):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]
        buy_price = float(order[6])
        qty = float(order[9])
        strategy_id = order[1]
        sell_price = current_price or (buy_price * 1.01)

        remaining = order[14] if (len(order) > 14 and order[14]) else None
        sell_qty = float(remaining) if remaining else qty

        if DRY_RUN or is_dry_run:
            exchange_order_id = f"GRID-TRAIL-DRY-{order_id}"
        else:
            if exchange == "upbit" and client:
                exchange_order_id = client.submit_sell_order(symbol, sell_price, sell_qty)
            elif exchange == "bithumb" and client:
                exchange_order_id = client.submit_sell_order(symbol, sell_price, sell_qty)
            else:
                return

        profit = round((sell_price - buy_price) * sell_qty, 2)

        cur.execute("""
            UPDATE grid_orders SET
            status='WAITING', trailing_active=FALSE, trailing_high_price=NULL,
            trailing_sell_order_id=%s, smart_sell_step=0, smart_sell_qty_remaining=NULL,
            sell_price=%s,
            buy_order_id=NULL, sell_order_id=NULL,
            profit=%s, updated_at=NOW()
            WHERE id=%s
        """, (exchange_order_id, sell_price, profit, order_id))

        cur.execute("""
            UPDATE grid_strategies SET
            total_profit = total_profit + %s,
            current_investment = GREATEST(0, COALESCE(current_investment,0) - %s),
            daily_loss = CASE WHEN %s < 0 THEN COALESCE(daily_loss,0) + ABS(%s) ELSE daily_loss END,
            updated_at=NOW() WHERE id=%s
        """, (profit, float(order[8]), profit, profit, strategy_id))
        print(f"[GRID][TRAIL] 트레일링 매도 완료: {symbol} 수익={profit}원 → 재매수 대기")

    def _check_sell_filled(self, conn, cur, order, client, is_dry_run=False):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]
        sell_order_id = order[11] if len(order) > 11 else None
        buy_price = float(order[6])
        sell_price = float(order[7] if len(order) > 7 else order[6])
        qty = float(order[9])
        strategy_id = order[1]

        filled = self._is_sell_filled(exchange, symbol, sell_order_id, client, is_dry_run, order)
        if filled:
            profit = round((sell_price - buy_price) * qty, 2)
            cur.execute("""
                UPDATE grid_orders SET status='SELL_FILLED',
                profit=%s, updated_at=NOW() WHERE id=%s
            """, (profit, order_id))
            cur.execute("""
                UPDATE grid_strategies SET
                total_profit = total_profit + %s,
                current_investment = GREATEST(0, COALESCE(current_investment,0) - %s),
                daily_loss = CASE WHEN %s < 0 THEN COALESCE(daily_loss,0) + ABS(%s) ELSE daily_loss END,
                updated_at=NOW() WHERE id=%s
            """, (profit, float(order[8]), profit, profit, strategy_id))
            print(f"[GRID] 매도 체결: {symbol} 수익={profit}원")
            cur.execute("""
                UPDATE grid_orders SET status='WAITING',
                buy_order_id=NULL, sell_order_id=NULL, updated_at=NOW()
                WHERE id=%s
            """, (order_id,))

    def _is_sell_filled(self, exchange, symbol, sell_order_id, client, is_dry_run, order):
        if DRY_RUN or is_dry_run:
            sell_price = float(order[7] if len(order) > 7 else order[6])
            current_price = self._get_current_price(exchange, symbol)
            return current_price is not None and current_price >= sell_price
        else:
            if client and sell_order_id:
                ex_order = client.get_order(sell_order_id)
                return ex_order and ex_order.get("state") == "done"
        return False

    def _place_sell_order(self, order, client, is_dry_run, sell_price, qty, label=""):
        order_id = order[0]
        exchange = order[4]
        symbol = order[5]

        if DRY_RUN or is_dry_run:
            eid = f"GRID-SELL-DRY-{order_id}-{label}"
            print(f"[GRID][DRY] {label} 매도: {symbol} {sell_price}원 x {qty}")
            return eid
        else:
            if exchange == "upbit" and client:
                return client.submit_sell_order(symbol, sell_price, qty)
            elif exchange == "bithumb" and client:
                return client.submit_sell_order(symbol, sell_price, qty)
        return None

    async def run_once(self):
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT gs.id, gs.user_id, gs.exchange, gs.symbol, u.is_dry_run,
                       gs.max_investment, gs.stop_loss_price, gs.daily_loss_limit,
                       gs.profit_target_pct, gs.current_investment, gs.daily_loss,
                       gs.daily_reset_at, gs.total_profit, gs.base_price, gs.range_pct,
                       gs.smart_sell_mode, gs.split_count, gs.split_ratio, gs.split_gap_pct,
                       gs.trailing_pct, gs.trailing_trigger_pct
                FROM grid_strategies gs
                JOIN users u ON u.id = gs.user_id
                WHERE gs.status = 'ACTIVE'
            """)
            strategies = cur.fetchall()

            for strat in strategies:
                (strat_id, user_id, exchange, symbol, is_dry_run,
                 max_investment, stop_loss_price, daily_loss_limit,
                 profit_target_pct, current_investment, daily_loss,
                 daily_reset_at, total_profit, base_price, range_pct,
                 smart_sell_mode, split_count, split_ratio, split_gap_pct,
                 trailing_pct, trailing_trigger_pct) = strat

                strategy_info = {
                    "smart_sell_mode": smart_sell_mode or "BASIC",
                    "split_count": split_count or 3,
                    "split_ratio": split_ratio or "40,35,25",
                    "split_gap_pct": float(split_gap_pct or 1.0),
                    "trailing_pct": float(trailing_pct or 2.0),
                    "trailing_trigger_pct": float(trailing_trigger_pct or 1.0),
                }

                from datetime import date
                if daily_reset_at and daily_reset_at.date() < date.today():
                    cur.execute(
                        "UPDATE grid_strategies SET daily_loss=0, daily_reset_at=NOW() WHERE id=%s",
                        (strat_id,)
                    )
                    daily_loss = 0

                current_price = self._get_current_price(exchange, symbol)
                stop_reason = None

                if stop_loss_price and current_price and current_price <= float(stop_loss_price):
                    stop_reason = f"손절가 도달 ({current_price} <= {stop_loss_price})"

                if not stop_reason and current_price is not None and base_price and range_pct:
                    grid_lower = float(base_price) * (1 - float(range_pct) / 100)
                    grid_upper = float(base_price) * (1 + float(range_pct) / 100)
                    if current_price < grid_lower:
                        stop_reason = f"그리드 하한 이탈 (현재가 {current_price:.0f} < 하한 {grid_lower:.0f})"
                    elif current_price > grid_upper:
                        stop_reason = f"그리드 상한 이탈 (현재가 {current_price:.0f} > 상한 {grid_upper:.0f})"

                if daily_loss_limit and float(daily_loss or 0) >= float(daily_loss_limit):
                    stop_reason = f"일일 손실 한도 초과 ({daily_loss}원)"

                if profit_target_pct and total_profit is not None:
                    total_invest = float(current_investment or 0)
                    if total_invest > 0:
                        actual_pct = float(total_profit) / total_invest * 100
                        if actual_pct >= float(profit_target_pct):
                            cur.execute(
                                "UPDATE grid_strategies SET status='STOPPED', updated_at=NOW() WHERE id=%s",
                                (strat_id,)
                            )
                            try:
                                cur.execute(
                                    "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, '그리드')",
                                    (user_id, symbol, exchange, 'STOPPED', '종료')
                                )
                            except Exception as e:
                                print(f"[ACTIVITY] {e}")
                            print(f"[GRID] 수익률 목표 달성 → STOPPED: {symbol} {actual_pct:.2f}%")
                            continue

                if stop_reason:
                    cur.execute(
                        "UPDATE grid_strategies SET status='PAUSED', updated_at=NOW() WHERE id=%s",
                        (strat_id,)
                    )
                    try:
                        cur.execute(
                            "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, '그리드')",
                            (user_id, symbol, exchange, 'PAUSED', '자동일시정지')
                        )
                    except Exception as e:
                        print(f"[ACTIVITY] {e}")
                    print(f"[GRID] 위험관리 자동 일시정지: {symbol} - {stop_reason}")
                    continue

                client = self._get_client(exchange, user_id)

                cur.execute("""
                    SELECT id, strategy_id, user_id, side, exchange, symbol,
                           buy_price, sell_price, amount_krw, qty, buy_order_id, sell_order_id,
                           grid_level, smart_sell_step, smart_sell_qty_remaining,
                           trailing_active, trailing_high_price
                    FROM grid_orders
                    WHERE strategy_id=%s AND status='WAITING'
                """, (strat_id,))
                for order in cur.fetchall():
                    self._check_and_submit_buy(conn, cur, order, client, is_dry_run)

                cur.execute("""
                    SELECT id, strategy_id, user_id, side, exchange, symbol,
                           buy_price, sell_price, amount_krw, qty, buy_order_id, sell_order_id,
                           grid_level, smart_sell_step, smart_sell_qty_remaining,
                           trailing_active, trailing_high_price
                    FROM grid_orders
                    WHERE strategy_id=%s AND status='BUY_ORDERED'
                """, (strat_id,))
                for order in cur.fetchall():
                    self._check_buy_filled(conn, cur, order, client, is_dry_run, strategy_info)

                cur.execute("""
                    SELECT id, strategy_id, user_id, side, exchange, symbol,
                           buy_price, sell_price, amount_krw, qty, buy_order_id, sell_order_id,
                           grid_level, smart_sell_step, smart_sell_qty_remaining,
                           trailing_active, trailing_high_price
                    FROM grid_orders
                    WHERE strategy_id=%s AND status='SELL_ORDERED'
                """, (strat_id,))
                for order in cur.fetchall():
                    mode = strategy_info["smart_sell_mode"]
                    step = order[13] if order[13] else 0

                    if mode == "TRAILING":
                        self._check_trailing(conn, cur, order, client, is_dry_run, strategy_info)
                    elif mode == "BOTH" and order[15]:
                        self._check_trailing(conn, cur, order, client, is_dry_run, strategy_info)
                    elif mode in ("SPLIT", "BOTH") and step > 0:
                        self._check_split_sell_filled(conn, cur, order, client, is_dry_run, strategy_info)
                    else:
                        self._check_sell_filled(conn, cur, order, client, is_dry_run)

            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"[GRID] run_once 오류: {e}")
        finally:
            cur.close()
            conn.close()

    async def start(self):
        self._running = True
        print(f"[GRID] 그리드 엔진 시작 — 주기={self.interval_sec}초")
        while self._running:
            try:
                await self.run_once()
            except Exception as e:
                print(f"[GRID] 루프 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        print("[GRID] 그리드 엔진 종료")
