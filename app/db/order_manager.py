import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.models import PlannedOrder, StateTransitionLog, AuditLog
from app.core.config import MAX_PLANNED_ORDERS_PER_SYMBOL, MAX_ACTIVE_ORDERS_PER_SYMBOL


def now_utc():
    return datetime.now(timezone.utc)


VALID_TRANSITIONS = {
    "PLANNED":          ["QUEUED", "CANCELLED"],
    "QUEUED":           ["SUBMITTED", "FAILED", "CANCELLED", "PLANNED"],
    "SUBMITTED":        ["ACTIVE", "FAILED", "UNKNOWN", "CANCELLED", "FILLED"],
    "ACTIVE":           ["PARTIALLY_FILLED", "FILLED", "CANCELLED", "RECONCILE_NEEDED"],
    "PARTIALLY_FILLED": ["FILLED", "CANCELLED", "RECONCILE_NEEDED"],
    "UNKNOWN":          ["ACTIVE", "FILLED", "CANCELLED", "RECONCILE_NEEDED"],
    "RECONCILE_NEEDED": ["ACTIVE", "FILLED", "CANCELLED"],
    "FILLED":           [],
    "CANCELLED":        [],
    "FAILED":           ["PLANNED"],
}

TERMINAL_STATUSES = {"FILLED", "CANCELLED", "FAILED"}
ACTIVE_STATUSES   = {"SUBMITTED", "ACTIVE", "PARTIALLY_FILLED", "UNKNOWN", "RECONCILE_NEEDED"}


def _log_transition(
    db: Session,
    order: PlannedOrder,
    from_status: str,
    to_status: str,
    reason: str = "",
    extra: dict = None,
):
    log = StateTransitionLog(
        planned_order_id=order.id,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        extra=json.dumps(extra) if extra else None,
    )
    db.add(log)


def _audit(db: Session, event: str, symbol: str = None, detail: dict = None):
    db.add(AuditLog(
        event=event,
        symbol=symbol,
        detail=json.dumps(detail) if detail else None,
    ))


def transition(
    db: Session,
    order: PlannedOrder,
    to_status: str,
    reason: str = "",
    extra: dict = None,
) -> bool:
    """
    상태 전이 — 허용된 전이만 실행
    실패 시 False 반환 (절대 강제 전이 없음)
    """
    from_status = order.status
    allowed = VALID_TRANSITIONS.get(from_status, [])

    if to_status not in allowed:
        _audit(db, "invalid_transition", order.symbol, {
            "order_id": order.id,
            "from": from_status,
            "to": to_status,
            "reason": reason,
        })
        return False

    order.status = to_status
    order.updated_at = now_utc()

    if to_status == "SUBMITTED":
        order.submitted_at = now_utc()
    if to_status == "FILLED":
        order.filled_at = now_utc()

    _log_transition(db, order, from_status, to_status, reason, extra)
    return True


def create_planned_order(
    db: Session,
    symbol: str,
    side: str,
    price: float,
    amount_krw: float,
    idempotency_key: str,
    note: str = "",
    user_id: int = None,
    exchange: str = "upbit",
) -> Optional[PlannedOrder]:
    """
    예약주문 생성
    - 종목당 최대 50개 제한
    - 중복 idempotency_key 방지
    """
    # 중복 키 체크
    existing = db.execute(
        select(PlannedOrder).where(PlannedOrder.idempotency_key == idempotency_key)
    ).scalar_one_or_none()
    if existing:
        _audit(db, "duplicate_order_blocked", symbol, {"idempotency_key": idempotency_key})
        return existing

    # 종목당 최대 주문 수 체크
    active_count = db.execute(
        select(PlannedOrder).where(
            PlannedOrder.symbol == symbol,
            PlannedOrder.status.notin_(TERMINAL_STATUSES),
        )
    ).scalars().all()

    if len(active_count) >= MAX_PLANNED_ORDERS_PER_SYMBOL:
        _audit(db, "order_limit_exceeded", symbol, {
            "current": len(active_count),
            "max": MAX_PLANNED_ORDERS_PER_SYMBOL,
        })
        return None

    order = PlannedOrder(
        idempotency_key=idempotency_key,
        symbol=symbol,
        side=side.upper(),
        price=price,
        amount_krw=amount_krw,
        status="PLANNED",
        note=note,
        user_id=user_id,
        exchange=exchange,
    )
    db.add(order)
    db.flush()
    _log_transition(db, order, "NEW", "PLANNED", "created")
    _audit(db, "order_created", symbol, {
        "id": order.id,
        "side": side,
        "price": price,
        "amount_krw": amount_krw,
    })
    return order


def get_active_orders(db: Session, symbol: str) -> list[PlannedOrder]:
    """거래소에 제출된 활성 주문 목록"""
    return db.execute(
        select(PlannedOrder).where(
            PlannedOrder.symbol == symbol,
            PlannedOrder.status.in_(ACTIVE_STATUSES),
        )
    ).scalars().all()


def get_planned_orders(db: Session, symbol: str) -> list[PlannedOrder]:
    """아직 제출 안 된 예약주문 목록"""
    return db.execute(
        select(PlannedOrder).where(
            PlannedOrder.symbol == symbol,
            PlannedOrder.status == "PLANNED",
        )
    ).scalars().all()


def get_reconcile_needed(db: Session) -> list[PlannedOrder]:
    """정합성 확인 필요한 주문 목록"""
    return db.execute(
        select(PlannedOrder).where(
            PlannedOrder.status.in_(["UNKNOWN", "RECONCILE_NEEDED"])
        )
    ).scalars().all()


def cancel_planned_order(
    db: Session, order_id: int, reason: str = "user_cancelled"
) -> bool:
    """예약주문 취소 (거래소 미제출 상태만)"""
    order = db.get(PlannedOrder, order_id)
    if not order:
        return False
    if order.status not in ("PLANNED", "QUEUED"):
        _audit(db, "cancel_rejected", order.symbol, {
            "order_id": order_id,
            "status": order.status,
            "reason": "already_submitted",
        })
        return False
    return transition(db, order, "CANCELLED", reason)
