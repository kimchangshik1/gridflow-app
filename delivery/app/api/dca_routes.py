from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.api.validation import normalize_market_symbol
from app.auth.dependencies import get_current_user
from app.core.config import DB_URL
import psycopg2

router = APIRouter()

def get_conn():
    return psycopg2.connect(DB_URL)


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


def _validate_dca_request(req: DCARequest):
    if req.exchange not in ("upbit", "bithumb"):
        raise HTTPException(400, "exchange는 upbit 또는 bithumb")
    req.symbol = normalize_market_symbol(req.symbol)
    if req.strategy_type not in ("DCA", "ACCUMULATE"):
        raise HTTPException(400, "strategy_type: DCA / ACCUMULATE")
    if req.total_amount <= 0:
        raise HTTPException(400, "total_amount는 0보다 커야 합니다")
    if req.amount_per_order < 5500:
        raise HTTPException(400, "회차별 금액 최소 5,500원")
    if req.amount_per_order > req.total_amount:
        raise HTTPException(400, "amount_per_order는 total_amount를 초과할 수 없습니다")
    if req.total_rounds < 1 or req.total_rounds > 365:
        raise HTTPException(400, "횟수는 1~365 사이")
    if req.interval_type not in ("PRICE", "TIME"):
        raise HTTPException(400, "interval_type: PRICE / TIME")
    if req.price_drop_pct is not None and req.price_drop_pct <= 0:
        raise HTTPException(400, "price_drop_pct는 0보다 커야 합니다")
    if req.time_interval_hours is not None and req.time_interval_hours <= 0:
        raise HTTPException(400, "time_interval_hours는 0보다 커야 합니다")
    if req.stop_loss_price is not None and req.stop_loss_price <= 0:
        raise HTTPException(400, "stop_loss_price는 0보다 커야 합니다")
    if req.max_avg_price is not None and req.max_avg_price <= 0:
        raise HTTPException(400, "max_avg_price는 0보다 커야 합니다")
    if req.strategy_type == "DCA":
        req.accumulate_schedule = None
        if req.interval_type == "PRICE":
            if req.price_drop_pct is None:
                raise HTTPException(400, "PRICE 간격은 price_drop_pct가 필요합니다")
            req.time_interval_hours = None
        else:
            if req.time_interval_hours is None:
                raise HTTPException(400, "TIME 간격은 time_interval_hours가 필요합니다")
            req.price_drop_pct = None
    if req.strategy_type == "ACCUMULATE":
        if req.accumulate_schedule not in ("DAILY", "WEEKLY", "MONTHLY"):
            raise HTTPException(400, "적립식은 DAILY / WEEKLY / MONTHLY 스케줄 필요")
        req.price_drop_pct = None
        req.time_interval_hours = None


@router.post("/strategies")
def create_dca(req: DCARequest, user=Depends(get_current_user)):
    _validate_dca_request(req)

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
        print(f"[DCA] 전략 생성 오류: {e}")
        raise HTTPException(500, "요청 처리 중 오류가 발생했습니다")
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
               stop_loss_price, max_avg_price, interval_type, created_at
        FROM dca_strategies WHERE user_id=%s ORDER BY created_at DESC
    """, (user["user_id"],))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    strategies = []
    for r in rows:
        interval_type = r[19] or "PRICE"
        price_drop_pct = float(r[14] or 0)
        time_interval_hours = r[15]
        if r[3] == "DCA":
            if interval_type == "TIME":
                price_drop_pct = 0.0
            else:
                time_interval_hours = None
        strategies.append({
            "id": r[0], "exchange": r[1], "symbol": r[2],
            "strategy_type": r[3], "status": r[4],
            "total_amount": float(r[5]), "amount_per_order": float(r[6]),
            "total_rounds": r[7], "completed_rounds": r[8],
            "avg_price": float(r[9] or 0), "total_qty": float(r[10] or 0),
            "total_invested": float(r[11] or 0),
            "last_buy_price": float(r[12] or 0),
            "last_buy_at": str(r[13]) if r[13] else None,
            "interval_type": interval_type,
            "price_drop_pct": price_drop_pct,
            "time_interval_hours": time_interval_hours,
            "accumulate_schedule": r[16],
            "stop_loss_price": float(r[17] or 0) if r[17] else None,
            "max_avg_price": float(r[18] or 0) if r[18] else None,
            "created_at": str(r[20]),
        })
    return {"strategies": strategies}


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
