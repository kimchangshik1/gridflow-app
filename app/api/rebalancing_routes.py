from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.auth.dependencies import get_current_user
import psycopg2

router = APIRouter()

DB_CONFIG = {
    "host": "127.0.0.1",
    "dbname": "upbit_bot",
    "user": "tradingbot",
    "password": "upbit1234"
}

def get_conn():
    return psycopg2.connect(**DB_CONFIG)


class AssetItem(BaseModel):
    symbol: str
    target_pct: float

class RebalStrategyRequest(BaseModel):
    exchange: str = "upbit"
    name: str = "내 포트폴리오"
    trigger_type: str = "INTERVAL"
    interval_hours: float = 24.0
    threshold_pct: float = 5.0
    assets: List[AssetItem]
    # 리밸런싱 방식
    rebal_method: str = "BOTH"          # BUY_ONLY / BOTH / NEW_FUND
    min_order_krw: float = 10000        # 최소 주문 금액
    max_adjust_pct: float = 25.0        # 최대 1회 조정 비율 (%)
    max_adjust_krw: Optional[float] = None  # 최대 1회 조정 절대값
    use_new_fund: bool = False          # 신규 자금 자동 반영
    # 리스크 제한
    daily_max_count: int = 10           # 하루 최대 조정 횟수
    daily_max_krw: Optional[float] = None   # 하루 최대 주문 금액
    asset_max_pct: float = 80.0         # 특정 자산 최대 비중 상한
    asset_min_pct: float = 5.0          # 특정 자산 최소 비중 하한
    error_stop_count: int = 3           # API 오류 N회 시 정지


@router.post("/strategies")
def create_strategy(req: RebalStrategyRequest, user=Depends(get_current_user)):
    # 비중 합계 검증
    total_pct = sum(a.target_pct for a in req.assets)
    if abs(total_pct - 100) > 1:
        raise HTTPException(400, f"비중 합계가 100%가 아닙니다 (현재: {total_pct:.1f}%)")
    if len(req.assets) < 2:
        raise HTTPException(400, "최소 2개 이상의 종목이 필요합니다")
    if len(req.assets) > 5:
        raise HTTPException(400, "종목은 최대 5개까지 가능합니다")
    if req.trigger_type not in ("INTERVAL", "THRESHOLD", "BOTH"):
        raise HTTPException(400, "trigger_type: INTERVAL / THRESHOLD / BOTH")
    if req.rebal_method not in ("BUY_ONLY", "BOTH", "NEW_FUND"):
        raise HTTPException(400, "rebal_method: BUY_ONLY / BOTH / NEW_FUND")
    if req.min_order_krw < 5500:
        raise HTTPException(400, "최소 주문 금액은 5,500원 이상이어야 합니다")
    if req.interval_hours < 6:
        raise HTTPException(400, "실행 주기는 최소 6시간 이상이어야 합니다")
    for asset in req.assets:
        if asset.target_pct < 10:
            raise HTTPException(400, f"{asset.symbol} 비중이 너무 낮습니다 (최소 10%)")
    symbols = [a.symbol.upper() for a in req.assets]
    if len(symbols) != len(set(symbols)):
        raise HTTPException(400, "중복 종목이 있습니다")

    if not user.get("is_dry_run"):
        from app.db.database import get_db
        from app.db.models import BotConfig
        from app.core.crypto import decrypt
        from sqlalchemy import select
        with get_db() as db:
            access_row = db.execute(
                select(BotConfig).where(
                    BotConfig.user_id == user["user_id"],
                    BotConfig.key == ("UPBIT_ACCESS_KEY" if req.exchange == "upbit" else "BITHUMB_ACCESS_KEY")
                )
            ).scalar_one_or_none()
            if not access_row:
                raise HTTPException(400, "API 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")
            secret_row = db.execute(
                select(BotConfig).where(
                    BotConfig.user_id == user["user_id"],
                    BotConfig.key == ("UPBIT_SECRET_KEY" if req.exchange == "upbit" else "BITHUMB_SECRET_KEY")
                )
            ).scalar_one_or_none()
            access_key = decrypt(access_row.value) if access_row and access_row.value else ""
            secret_key = decrypt(secret_row.value) if secret_row and secret_row.value else ""
            if not access_key:
                raise HTTPException(400, "API 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")
            if not secret_key:
                raise HTTPException(400, "API 시크릿 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO rebalancing_strategies
            (user_id, exchange, name, trigger_type, interval_hours, threshold_pct, status,
             rebal_method, min_order_krw, max_adjust_pct, max_adjust_krw, use_new_fund,
             daily_max_count, daily_max_krw, asset_max_pct, asset_min_pct, error_stop_count)
            VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE',
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user["user_id"], req.exchange, req.name,
              req.trigger_type, req.interval_hours, req.threshold_pct,
              req.rebal_method, req.min_order_krw, req.max_adjust_pct,
              req.max_adjust_krw, req.use_new_fund,
              req.daily_max_count, req.daily_max_krw,
              req.asset_max_pct, req.asset_min_pct, req.error_stop_count))
        strategy_id = cur.fetchone()[0]

        for asset in req.assets:
            cur.execute("""
                INSERT INTO rebalancing_assets
                (strategy_id, user_id, symbol, target_pct)
                VALUES (%s, %s, %s, %s)
            """, (strategy_id, user["user_id"], asset.symbol.upper(), asset.target_pct))

        conn.commit()
        return {"success": True, "strategy_id": strategy_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/strategies")
def list_strategies(user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, exchange, name, status, trigger_type,
               interval_hours, threshold_pct,
               total_value_krw, last_rebal_at, rebal_count, created_at,
               rebal_method, min_order_krw, max_adjust_pct, use_new_fund,
               daily_max_count, asset_max_pct, asset_min_pct
        FROM rebalancing_strategies
        WHERE user_id=%s ORDER BY created_at DESC
    """, (user["user_id"],))
    rows = cur.fetchall()
    strategies = []
    for r in rows:
        strat_id = r[0]
        cur.execute("""
            SELECT symbol, target_pct, current_pct, current_qty,
                   current_value_krw, avg_price
            FROM rebalancing_assets
            WHERE strategy_id=%s ORDER BY target_pct DESC
        """, (strat_id,))
        assets = cur.fetchall()
        strategies.append({
            "id": strat_id,
            "exchange": r[1], "name": r[2], "status": r[3],
            "trigger_type": r[4],
            "interval_hours": float(r[5] or 24),
            "threshold_pct": float(r[6] or 5),
            "total_value_krw": float(r[7] or 0),
            "last_rebal_at": str(r[8]) if r[8] else None,
            "rebal_count": r[9] or 0,
            "created_at": str(r[10]),
            "rebal_method": r[11] or "BOTH",
            "min_order_krw": float(r[12] or 10000),
            "max_adjust_pct": float(r[13] or 25),
            "use_new_fund": bool(r[14]) if r[14] else False,
            "daily_max_count": r[15] or 10,
            "asset_max_pct": float(r[16] or 80),
            "asset_min_pct": float(r[17] or 5),
            "assets": [
                {
                    "symbol": a[0],
                    "target_pct": float(a[1]),
                    "current_pct": float(a[2] or 0),
                    "current_qty": float(a[3] or 0),
                    "current_value_krw": float(a[4] or 0),
                    "avg_price": float(a[5] or 0),
                }
                for a in assets
            ]
        })
    cur.close()
    conn.close()
    return {"strategies": strategies}


@router.get("/strategies/{strategy_id}/orders")
def get_orders(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT symbol, side, price, amount_krw, qty,
               before_pct, after_pct, target_pct, status, created_at
        FROM rebalancing_orders
        WHERE strategy_id=%s AND user_id=%s
        ORDER BY created_at DESC LIMIT 100
    """, (strategy_id, user["user_id"]))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"orders": [
        {
            "symbol": r[0], "side": r[1],
            "price": float(r[2] or 0), "amount_krw": float(r[3] or 0),
            "qty": float(r[4] or 0),
            "before_pct": float(r[5] or 0), "after_pct": float(r[6] or 0),
            "target_pct": float(r[7] or 0),
            "status": r[8], "created_at": str(r[9])
        }
        for r in rows
    ]}


@router.post("/strategies/{strategy_id}/pause")
def pause_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET status='PAUSED', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.post("/strategies/{strategy_id}/resume")
def resume_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET status='ACTIVE', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.delete("/strategies/{strategy_id}")
def stop_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET status='STOPPED', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.delete("/strategies/{strategy_id}/delete")
def delete_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM rebalancing_orders WHERE strategy_id=%s AND user_id=%s",
                (strategy_id, user["user_id"]))
    cur.execute("DELETE FROM rebalancing_assets WHERE strategy_id=%s AND user_id=%s",
                (strategy_id, user["user_id"]))
    cur.execute(
        "DELETE FROM rebalancing_strategies WHERE id=%s AND user_id=%s AND status='STOPPED'",
        (strategy_id, user["user_id"])
    )
    deleted = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not deleted:
        raise HTTPException(400, "삭제 실패 (종료된 전략만 삭제 가능)")
    return {"success": True}


@router.post("/strategies/{strategy_id}/rebalance-now")
def rebalance_now(strategy_id: int, user=Depends(get_current_user)):
    """즉시 리밸런싱 강제 실행"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET last_rebal_at=NULL, updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True, "message": "다음 엔진 사이클에 즉시 리밸런싱됩니다"}
