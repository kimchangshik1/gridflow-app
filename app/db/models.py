from sqlalchemy import (
    Column, String, Numeric, Integer, Boolean,
    DateTime, Text, UniqueConstraint, Index, ForeignKey
)
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    """유저 계정"""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    is_admin      = Column(Boolean, default=False, nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime(timezone=True), default=now_utc)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    is_dry_run    = Column(Boolean, default=False, nullable=False)
    is_guest      = Column(Boolean, default=False, nullable=False)
    expires_at    = Column(DateTime(timezone=True), nullable=True)
    login_fail_count   = Column(Integer, default=0, nullable=False)
    login_locked_until = Column(DateTime(timezone=True), nullable=True)


class PlannedOrder(Base):
    """
    사용자가 등록한 내부 예약주문 (source of truth)
    거래소에 아직 제출 안 된 상태 포함
    """
    __tablename__ = "planned_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    idempotency_key = Column(String(64), unique=True, nullable=False)

    symbol      = Column(String(20), nullable=False)   # ex) KRW-BTC
    side        = Column(String(4),  nullable=False)   # BUY / SELL
    price       = Column(Numeric(20, 2), nullable=False)
    amount_krw  = Column(Numeric(20, 2), nullable=False)  # 주문 금액 (원)

    # 상태: PLANNED / QUEUED / SUBMITTED / ACTIVE / PARTIALLY_FILLED
    #       FILLED / CANCELLED / FAILED / UNKNOWN / RECONCILE_NEEDED
    status      = Column(String(20), nullable=False, default="PLANNED")

    exchange = Column(String(20), nullable=True, default="upbit")  # 거래소 구분
    exchange_order_id = Column(String(64), nullable=True)   # 거래소 주문 ID
    filled_amount_krw = Column(Numeric(20, 2), default=0)   # 체결된 금액
    filled_qty        = Column(Numeric(20, 8), default=0)   # 체결된 수량

    user_id     = Column(Integer, ForeignKey('users.id'), nullable=True)
    note        = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    filled_at    = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_planned_orders_symbol_status", "symbol", "status"),
        Index("ix_planned_orders_exchange_order_id", "exchange_order_id"),
    )


class StateTransitionLog(Base):
    """
    모든 상태 전이 기록 — 추적 가능성 보장
    """
    __tablename__ = "state_transition_logs"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    planned_order_id = Column(Integer, nullable=False)
    from_status     = Column(String(20), nullable=False)
    to_status       = Column(String(20), nullable=False)
    reason          = Column(String(100), nullable=True)
    extra           = Column(Text, nullable=True)  # JSON 문자열
    created_at      = Column(DateTime(timezone=True), default=now_utc)


class Position(Base):
    """
    종목별 현재 포지션 요약
    """
    __tablename__ = "positions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    symbol      = Column(String(20), unique=True, nullable=False)
    avg_price   = Column(Numeric(20, 2), default=0)
    total_qty   = Column(Numeric(20, 8), default=0)
    total_invested_krw = Column(Numeric(20, 2), default=0)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class AuditLog(Base):
    """
    시스템 전체 감사 로그 — 삭제/수정 불가
    """
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    event      = Column(String(50), nullable=False)
    symbol     = Column(String(20), nullable=True)
    detail     = Column(Text, nullable=True)  # JSON 문자열
    created_at = Column(DateTime(timezone=True), default=now_utc)


class BotConfig(Base):
    """
    API 키 등 설정값 저장 — 암호화 저장
    """
    __tablename__ = "bot_configs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    key        = Column(String(100), nullable=False)
    value      = Column(Text, nullable=False)
    user_id    = Column(Integer, ForeignKey('users.id'), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    __table_args__ = (
        Index("ix_bot_configs_user_key", "user_id", "key", unique=True),
    )
