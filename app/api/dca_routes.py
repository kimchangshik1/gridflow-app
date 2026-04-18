from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
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


def _log_dca_activity(conn, user_id, strategy_id, status, status_ko):
    try:
        cur2 = conn.cursor()
        cur2.execute("SELECT symbol, exchange FROM dca_strategies WHERE id=%s", (strategy_id,))
        row = cur2.fetchone()
        if row:
            cur2.execute(
                "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, 'DCA')",
                (user_id, row[0], row[1], status, status_ko)
            )
        cur2.close()
    except Exception as e:
        print(f"[ACTIVITY][DCA] {e}")


class DCARequest(BaseModel):
    exchange: str = "upbit"
    symbol: str
    strategy_type: str = "DCA"       # DCA / ACCUMULATE
    total_amount: float
    amount_per_order: float
    total_rounds: int = 10
    interval_type: str = "PRICE"      # PRICE / TIME
    price_drop_pct: Optional[float] = None
    time_interval_hours: Optional[int] = None
    accumulate_schedule: Optional[str] = None   # DAILY / WEEKLY / MONTHLY
    stop_loss_price: Optional[float] = None
    max_avg_price: Optional[float] = None


@router.post("/strategies")
def create_dca(req: DCARequest, user=Depends(get_current_user)):
    if req.amount_per_order < 5500:
        raise HTTPException(400, "회차별 금액 최소 5,500원")
    if req.total_rounds < 1 or req.total_rounds > 365:
        raise HTTPException(400, "횟수는 1~365 사이")
    if req.strategy_type == "DCA" and not req.price_drop_pct and not req.time_interval_hours:
        raise HTTPException(400, "DCA 전략은 가격간격 또는 시간간격 중 하나 필요")
    if req.strategy_type == "ACCUMULATE" and not req.accumulate_schedule:
        raise HTTPException(400, "적립식은 스케줄 설정 필요 (DAILY/WEEKLY/MONTHLY)")

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
            INSERT INTO dca_strategies
            (user_id, exchange, symbol, strategy_type, total_amount,
             amount_per_order, total_rounds, interval_type,
             price_drop_pct, time_interval_hours, accumulate_schedule,
             stop_loss_price, max_avg_price, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'ACTIVE')
            RETURNING id
        """, (user["user_id"], req.exchange, req.symbol, req.strategy_type,
              req.total_amount, req.amount_per_order, req.total_rounds,
              req.interval_type, req.price_drop_pct, req.time_interval_hours,
              req.accumulate_schedule, req.stop_loss_price, req.max_avg_price))
        strategy_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "strategy_id": strategy_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/strategies")
def list_dca(user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, exchange, symbol, strategy_type, status,
               total_amount, amount_per_order, total_rounds, completed_rounds,
               avg_price, total_qty, total_invested, last_buy_price, last_buy_at,
               price_drop_pct, time_interval_hours, accumulate_schedule,
               stop_loss_price, max_avg_price, created_at
        FROM dca_strategies WHERE user_id=%s ORDER BY created_at DESC
    """, (user["user_id"],))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"strategies": [
        {
            "id": r[0], "exchange": r[1], "symbol": r[2],
            "strategy_type": r[3], "status": r[4],
            "total_amount": float(r[5]), "amount_per_order": float(r[6]),
            "total_rounds": r[7], "completed_rounds": r[8],
            "avg_price": float(r[9] or 0), "total_qty": float(r[10] or 0),
            "total_invested": float(r[11] or 0),
            "last_buy_price": float(r[12] or 0),
            "last_buy_at": str(r[13]) if r[13] else None,
            "price_drop_pct": float(r[14] or 0),
            "time_interval_hours": r[15],
            "accumulate_schedule": r[16],
            "stop_loss_price": float(r[17] or 0) if r[17] else None,
            "max_avg_price": float(r[18] or 0) if r[18] else None,
            "created_at": str(r[19]),
        }
        for r in rows
    ]}


@router.get("/strategies/{strategy_id}/orders")
def get_dca_orders(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, round_num, price, amount_krw, qty, status, created_at
        FROM dca_orders WHERE strategy_id=%s AND user_id=%s ORDER BY round_num
    """, (strategy_id, user["user_id"]))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"orders": [
        {"id": r[0], "round_num": r[1], "price": float(r[2]),
         "amount_krw": float(r[3]), "qty": float(r[4] or 0),
         "status": r[5], "created_at": str(r[6])}
        for r in rows
    ]}


@router.post("/strategies/{strategy_id}/pause")
def pause_dca(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE dca_strategies SET status='PAUSED', updated_at=NOW() WHERE id=%s AND user_id=%s AND status='ACTIVE'",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    if updated:
        _log_dca_activity(conn, user["user_id"], strategy_id, 'PAUSED', '일시정지')
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.post("/strategies/{strategy_id}/resume")
def resume_dca(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE dca_strategies SET status='ACTIVE', updated_at=NOW() WHERE id=%s AND user_id=%s AND status='PAUSED'",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    if updated:
        _log_dca_activity(conn, user["user_id"], strategy_id, 'ACTIVE', '실행중')
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.delete("/strategies/{strategy_id}")
def stop_dca(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE dca_strategies SET status='STOPPED', updated_at=NOW() WHERE id=%s AND user_id=%s AND status!='STOPPED'",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    if updated:
        _log_dca_activity(conn, user["user_id"], strategy_id, 'STOPPED', '종료')
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.delete("/strategies/{strategy_id}/delete")
def delete_dca(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM dca_orders WHERE strategy_id=%s AND user_id=%s",
                (strategy_id, user["user_id"]))
    cur.execute(
        "DELETE FROM dca_strategies WHERE id=%s AND user_id=%s AND status IN ('STOPPED','COMPLETED')",
        (strategy_id, user["user_id"])
    )
    deleted = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not deleted:
        raise HTTPException(400, "삭제 실패 (종료/완료된 전략만 삭제 가능)")
    return {"success": True}
