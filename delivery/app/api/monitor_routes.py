from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import PlannedOrder


router = APIRouter()


@router.get("/orders")
def get_monitor_orders(user=Depends(get_current_user)):
    with get_db() as db:
        rows = (
            db.query(PlannedOrder)
            .filter(PlannedOrder.user_id == user["user_id"])
            .order_by(PlannedOrder.created_at.desc())
            .limit(50)
            .all()
        )
        return {
            "orders": [
                {
                    "id": row.id,
                    "exchange": row.exchange,
                    "symbol": row.symbol,
                    "side": row.side,
                    "status": row.status,
                    "price": float(row.price or 0),
                    "qty": float(row.filled_qty or 0),
                    "created_at": str(row.created_at),
                }
                for row in rows
            ]
        }


@router.get("/activity")
def get_monitor_activity(user=Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            text(
                """
                SELECT id, event_type, status, symbol, exchange, status_ko, created_at
                FROM activity_logs
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT 50
                """
            ),
            {"user_id": user["user_id"]},
        ).mappings().all()
        return {
            "activity": [
                {
                    "id": row["id"],
                    "event_type": row["event_type"],
                    "status": row["status"],
                    "symbol": row["symbol"],
                    "exchange": row["exchange"],
                    "message": row["status_ko"],
                    "created_at": str(row["created_at"]),
                }
                for row in rows
            ]
        }
