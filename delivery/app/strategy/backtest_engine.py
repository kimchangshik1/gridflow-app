import requests
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict


def fetch_candles(symbol: str, days: int = 365) -> List[Dict]:
    """Upbit 일봉 데이터 수집"""
    candles = []
    url = "https://api.upbit.com/v1/candles/days"
    to = None

    while len(candles) < days:
        params = {"market": symbol, "count": min(200, days - len(candles))}
        if to:
            params["to"] = to
        try:
            r = requests.get(url, params=params, timeout=10)
            data = r.json()
            if not data or not isinstance(data, list):
                break
            candles.extend(data)
            if len(data) < 200:
                break
            to = data[-1]["candle_date_time_utc"]
            time.sleep(0.1)
        except Exception as e:
            print(f"[BACKTEST] 캔들 조회 오류: {e}")
            break

    # 날짜 오름차순 정렬
    candles.sort(key=lambda x: x["candle_date_time_utc"])
    return candles[-days:]


def run_grid_backtest(
    symbol: str,
    period_days: int,
    base_price: float,
    range_pct: float,
    grid_count: int,
    amount_per_grid: float,
    profit_gap: float,
    fee_rate: float = 0.0005  # 수수료 0.05%
) -> Dict:
    """그리드 전략 백테스트"""

    candles = fetch_candles(symbol, period_days)
    if not candles:
        return {"error": "캔들 데이터를 가져올 수 없습니다"}

    # 그리드 레벨 설정
    lower = base_price * (1 - range_pct / 100)
    upper = base_price * (1 + range_pct / 100)
    step = (upper - lower) / grid_count

    grid_levels = []
    for i in range(grid_count):
        buy_price = round(lower + step * i, 2)
        sell_price = round(buy_price + profit_gap, 2)
        grid_levels.append({
            "buy_price": buy_price,
            "sell_price": sell_price,
            "amount_krw": amount_per_grid,
            "qty": amount_per_grid / buy_price,
            "status": "WAITING",  # WAITING / HOLDING
        })

    # 백테스트 실행
    total_profit = 0
    total_trades = 0
    win_trades = 0
    total_invested = 0
    peak_profit = 0
    max_drawdown = 0
    daily_profits = []

    first_price = float(candles[0]["trade_price"])
    last_price = float(candles[-1]["trade_price"])
    buy_hold_pct = (last_price - first_price) / first_price * 100

    for candle in candles:
        high = float(candle["high_price"])
        low = float(candle["low_price"])
        day_profit = 0

        for grid in grid_levels:
            # 매수 조건: 현재가가 매수가 이하
            if grid["status"] == "WAITING" and low <= grid["buy_price"]:
                fee = grid["amount_krw"] * fee_rate
                total_invested += grid["amount_krw"] + fee
                grid["status"] = "HOLDING"

            # 매도 조건: 현재가가 매도가 이상
            elif grid["status"] == "HOLDING" and high >= grid["sell_price"]:
                sell_amount = grid["qty"] * grid["sell_price"]
                buy_amount = grid["amount_krw"]
                buy_fee = buy_amount * fee_rate
                sell_fee = sell_amount * fee_rate
                profit = sell_amount - buy_amount - buy_fee - sell_fee
                total_profit += profit
                day_profit += profit
                total_trades += 1
                if profit > 0:
                    win_trades += 1
                total_invested -= grid["amount_krw"]
                grid["status"] = "WAITING"

        daily_profits.append(day_profit)

        # MDD 계산
        cumulative = sum(daily_profits)
        if cumulative > peak_profit:
            peak_profit = cumulative
        drawdown = (peak_profit - cumulative) / (peak_profit + total_invested + 1) * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    profit_pct = total_profit / (amount_per_grid * grid_count) * 100 if amount_per_grid * grid_count > 0 else 0

    return {
        "symbol": symbol,
        "period_days": period_days,
        "base_price": base_price,
        "range_pct": range_pct,
        "grid_count": grid_count,
        "amount_per_grid": amount_per_grid,
        "profit_gap": profit_gap,
        "total_trades": total_trades,
        "win_trades": win_trades,
        "win_rate": round(win_trades / total_trades * 100, 2) if total_trades > 0 else 0,
        "total_profit": round(total_profit, 0),
        "total_investment": round(amount_per_grid * grid_count, 0),
        "profit_pct": round(profit_pct, 2),
        "mdd": round(max_drawdown, 2),
        "buy_hold_pct": round(buy_hold_pct, 2),
        "candle_count": len(candles),
        "first_price": first_price,
        "last_price": last_price,
        "daily_profits": daily_profits[-90:],  # 최근 90일만 차트용
    }
