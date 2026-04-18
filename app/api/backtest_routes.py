from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.strategy.backtest_engine import run_grid_backtest
from app.core.config import DB_URL
import psycopg2

router = APIRouter()

class BacktestRequest(BaseModel):
    symbol: str
    period_days: int = 365
    base_price: float
    range_pct: float
    grid_count: int = 10
    amount_per_grid: float
    profit_gap: float = 1.0
    fee_rate: float = 0.0005

@router.post("/grid")
def backtest_grid(req: BacktestRequest, user=Depends(get_current_user)):
    if req.grid_count < 2 or req.grid_count > 100:
        raise HTTPException(400, "그리드 수는 2~100 사이")
    if req.amount_per_grid < 5500:
        raise HTTPException(400, "회차별 금액 최소 5,500원")
    if req.period_days < 7 or req.period_days > 365:
        raise HTTPException(400, "기간은 7~365일 사이")
    result = run_grid_backtest(
        symbol=req.symbol, period_days=req.period_days,
        base_price=req.base_price, range_pct=req.range_pct,
        grid_count=req.grid_count, amount_per_grid=req.amount_per_grid,
        profit_gap=req.profit_gap, fee_rate=req.fee_rate,
    )
    if "error" in result:
        raise HTTPException(500, result["error"])
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO backtest_results
            (user_id, strategy_type, symbol, period_days, base_price, range_pct,
             grid_count, amount_per_grid, profit_gap, total_trades, win_trades,
             total_profit, total_investment, profit_pct, mdd, buy_hold_pct)
            VALUES (%s,'GRID',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (user["user_id"], req.symbol, req.period_days, req.base_price,
              req.range_pct, req.grid_count, req.amount_per_grid, req.profit_gap,
              result["total_trades"], result["win_trades"], result["total_profit"],
              result["total_investment"], result["profit_pct"],
              result["mdd"], result["buy_hold_pct"]))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[BACKTEST] DB 저장 오류: {e}")
    return result

@router.get("/history")
def backtest_history(user=Depends(get_current_user)):
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, symbol, period_days, base_price, range_pct, grid_count,
               amount_per_grid, total_trades, total_profit, profit_pct,
               mdd, buy_hold_pct, created_at
        FROM backtest_results WHERE user_id=%s
        ORDER BY created_at DESC LIMIT 20
    """, (user["user_id"],))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"history": [
        {"id":r[0],"symbol":r[1],"period_days":r[2],"base_price":float(r[3]),
         "range_pct":float(r[4]),"grid_count":r[5],"amount_per_grid":float(r[6]),
         "total_trades":r[7],"total_profit":float(r[8]),"profit_pct":float(r[9]),
         "mdd":float(r[10]),"buy_hold_pct":float(r[11]),"created_at":str(r[12])}
        for r in rows
    ]}
