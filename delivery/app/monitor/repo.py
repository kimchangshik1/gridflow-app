import json
import os
from pathlib import Path
from requests import RequestException
from sqlalchemy import text

from app.db.database import get_db

_CONFIG_PATH = Path(
    os.getenv("MONITOR_CONFIG_PATH", "/etc/gridflow/monitor_config.json")
)
_BAD_ACTIVITY_STATUSES = {"FAILED", "CANCELLED", "RECONCILE_NEEDED"}
# 클라이언트에 노출 허용된 extra 키 목록 (신규 키는 여기 추가 후 노출)
_SAFE_EXTRA_KEYS = frozenset({"filled_qty", "filled_krw", "exchange_state", "exchange_id"})
_REASON_LABELS = {
    "bithumb_submit_failed": "빗썸 주문 제출 실패",
    "exchange_submit_failed": "업비트 주문 제출 실패",
    "under_min_total": "최소 주문 금액 미달",
    "bithumb_sell_exception": "빗썸 매도 처리 중 오류",
    "bithumb_order_not_found": "빗썸 주문 조회 실패",
    "user_cancelled": "사용자 취소",
    "reconcile_no_exchange_id": "거래소 주문번호 누락",
    "rest_query_failed": "거래소 체결 조회 실패",
}


def _is_bad_activity_status(status: str) -> bool:
    return str(status or "").upper() in _BAD_ACTIVITY_STATUSES


def _reason_label(reason: str) -> str:
    value = str(reason or "").strip()
    return _REASON_LABELS.get(value, value)


def _format_activity_message(status: str, status_ko: str, reason: str, extra: str) -> str:
    message = status_ko or ""
    if not _is_bad_activity_status(status):
        return message

    details = [_reason_label(reason)] if reason else []
    if extra:
        parsed = None
        try:
            parsed = json.loads(extra)
            if isinstance(parsed, dict):
                # 허용된 키만 노출 — 미지정 키(내부 상태, 오류 원문 등)는 클라이언트에 전달하지 않음
                details.extend(
                    f"{key}={value}"
                    for key, value in parsed.items()
                    if key in _SAFE_EXTRA_KEYS
                )
            # else: 비구조화 extra는 노출하지 않음
        except (TypeError, ValueError):
            parsed = None  # 파싱 실패 시 raw extra 미노출

    if details and message:
        return f"{message} ({'; '.join(details)})"
    return message or "; ".join(details)


def load_monitor_config() -> dict:
    with open(_CONFIG_PATH) as f:
        return json.load(f)


def _make_client(cfg: dict):
    exchange = cfg.get("exchange", "").lower()
    api_key = cfg.get("api_key", "")
    api_secret = cfg.get("api_secret", "")
    if exchange == "upbit":
        from app.exchange.upbit_client import UpbitClient
        return "upbit", UpbitClient(access_key=api_key, secret_key=api_secret)
    elif exchange == "bithumb":
        from app.exchange.bithumb_client import BithumbClient
        return "bithumb", BithumbClient(api_key=api_key, api_secret=api_secret)
    return None, None


def _fetch_balances(client) -> dict:
    try:
        result = client.get_balances()
        return result if result else {}
    except Exception as e:
        print(f"[monitor] 잔고 조회 실패: {e}")
        return {}


def _fetch_orders(exchange: str, client, balances: dict) -> list:
    orders = []
    symbols = [f"KRW-{cur}" for cur in balances if cur != "KRW"] if isinstance(balances, dict) else []
    for symbol in symbols:
        rows = []
        try:
            rows = client.get_open_orders(symbol)
        except (AttributeError, RequestException, TypeError, ValueError) as exc:
            print(f"[monitor] 주문 조회 실패 {symbol}: {exc}")
        for r in (rows or []):
            orders.append({
                "id": r.get("uuid") or r.get("order_id") or "",
                "exchange": exchange,
                "symbol": symbol,
                "side": r.get("side", ""),
                "status": r.get("state") or r.get("status", "wait"),
                "price": float(r.get("price") or 0),
                "qty": float(r.get("executed_volume") or r.get("filled_qty") or 0),
                "created_at": str(r.get("created_at", "")),
            })
    return orders


def list_recent_orders() -> dict:
    with get_db() as db:
        rows = db.execute(
            text(
                """
                SELECT id, exchange, symbol, side, status, price, amount_krw, filled_qty, created_at
                FROM planned_orders
                ORDER BY created_at DESC
                LIMIT 50
                """
            )
        ).mappings().all()
        return {
            "balances": {},
            "orders": [
                {
                    "id": row["id"],
                    "exchange": str(row["exchange"] or "").strip().lower(),
                    "symbol": row["symbol"],
                    "side": row["side"],
                    "status": row["status"],
                    "price": float(row["price"] or 0),
                    "amount_krw": float(row["amount_krw"] or 0),
                    "qty": float(row["filled_qty"] or 0),
                    "created_at": str(row["created_at"]),
                }
                for row in rows
            ],
        }


def list_recent_activity() -> dict:
    with get_db() as db:
        rows = db.execute(
            text(
                """
                SELECT
                    al.id,
                    al.event_type,
                    al.status,
                    al.symbol,
                    al.exchange,
                    al.status_ko,
                    st.reason,
                    st.extra,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN LATERAL (
                    SELECT st.reason, st.extra
                    FROM planned_orders po
                    JOIN state_transition_logs st
                      ON st.planned_order_id = po.id
                     AND st.to_status = al.status
                    WHERE po.symbol = al.symbol
                      AND po.exchange = al.exchange
                      AND po.status = al.status
                      AND po.updated_at BETWEEN al.created_at - interval '2 seconds'
                                            AND al.created_at + interval '2 seconds'
                    ORDER BY st.created_at DESC
                    LIMIT 1
                ) st ON al.status IN ('FAILED', 'CANCELLED', 'RECONCILE_NEEDED')
                ORDER BY al.created_at DESC
                LIMIT 50
                """
            )
        ).mappings().all()
        return {
            "activity": [
                {
                    "id": row["id"],
                    "event_type": row["event_type"],
                    "status": row["status"],
                    "symbol": row["symbol"],
                    "exchange": str(row["exchange"] or "").strip().lower(),
                    "message": _format_activity_message(
                        row["status"],
                        row["status_ko"],
                        row["reason"],
                        row["extra"],
                    ),
                    "created_at": str(row["created_at"]),
                }
                for row in rows
            ]
        }
