from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.db.models import BotConfig, PlannedOrder, AuditLog
from app.core.crypto import encrypt, decrypt
from app.auth.dependencies import get_current_user
from sqlalchemy import select, update as _sa_update
import json
import subprocess

router = APIRouter()
_SYSTEMCTL_BIN = "/usr/bin/systemctl"
_BOT_SERVICE_NAME = "upbit-bot.service"


def _cancel_live_orders(user_id: int, exchanges: list) -> dict:
    """
    키 삭제 직전 거래소 미체결 주문 취소.
    대상: SUBMITTED / ACTIVE / PARTIALLY_FILLED / UNKNOWN / RECONCILE_NEEDED
    정책: best-effort — 취소 실패해도 키 삭제 진행.
    - exchange_order_id 있는 경우만 취소 시도
    - exchange_order_id 없는 UNKNOWN/RECONCILE_NEEDED는 cannot_attempt 기록 (침묵 방치 금지)
    """
    from app.exchange.upbit_client import UpbitClient as _UC
    from app.exchange.bithumb_client import BithumbClient as _BC

    _CANCEL_STATUSES = [
        "SUBMITTED", "ACTIVE", "PARTIALLY_FILLED",
        "UNKNOWN", "RECONCILE_NEEDED",
    ]
    _AMBIGUOUS = {"UNKNOWN", "RECONCILE_NEEDED"}

    results = {"cancelled": [], "failed": [], "cannot_attempt": []}

    # 1. 키 + 대상 주문 스냅샷 (DB 세션 짧게 유지)
    with get_db() as db:
        ua = _get_config(db, "UPBIT_ACCESS_KEY", user_id) if "upbit" in exchanges else None
        us = _get_config(db, "UPBIT_SECRET_KEY", user_id) if "upbit" in exchanges else None
        ba = _get_config(db, "BITHUMB_ACCESS_KEY", user_id) if "bithumb" in exchanges else None
        bs = _get_config(db, "BITHUMB_SECRET_KEY", user_id) if "bithumb" in exchanges else None

        all_live = db.execute(
            select(PlannedOrder).where(
                PlannedOrder.user_id == user_id,
                PlannedOrder.status.in_(_CANCEL_STATUSES),
                PlannedOrder.exchange.in_(exchanges),
            )
        ).scalars().all()

        snapshots = []
        for o in all_live:
            entry = {
                "id": o.id,
                "status": o.status,
                "exchange": o.exchange,
                "exchange_order_id": o.exchange_order_id,
                "symbol": o.symbol,
                "side": o.side,
            }
            if not o.exchange_order_id:
                # exchange_order_id 없으면 취소 불가 — 침묵 방치 금지, 이유 기록
                reason = "no_exchange_id_ambiguous" if o.status in _AMBIGUOUS else "no_exchange_id"
                results["cannot_attempt"].append({"id": o.id, "status": o.status, "reason": reason})
                print(f"[KEY_DELETE] 취소 불가(exchange_order_id 없음): order_id={o.id} status={o.status}")
            else:
                snapshots.append(entry)

    # 2. 거래소 클라이언트 생성 (키 없으면 None)
    uc = _UC(access_key=ua, secret_key=us) if (ua and us) else None
    bc = _BC(access_key=ba, secret_key=bs) if (ba and bs) else None

    # 3. 거래소 취소 호출 (네트워크 I/O — DB 세션 밖)
    cancelled_ids = []
    for snap in snapshots:
        oid = snap["id"]
        eid = snap["exchange_order_id"]
        exch = snap["exchange"]
        status = snap["status"]
        try:
            if exch == "bithumb":
                if not bc:
                    results["failed"].append({"id": oid, "status": status, "reason": "no_bithumb_key"})
                    continue
                ok = bc.cancel_order(eid, snap["symbol"], snap["side"])
            else:
                if not uc:
                    results["failed"].append({"id": oid, "status": status, "reason": "no_upbit_key"})
                    continue
                ok = uc.cancel_order(eid)

            if ok:
                cancelled_ids.append(oid)
                results["cancelled"].append(oid)
                print(f"[KEY_DELETE] 거래소 취소 성공: order_id={oid} status={status} exchange={exch}")
            else:
                results["failed"].append({"id": oid, "status": status, "reason": "exchange_rejected"})
                print(f"[KEY_DELETE] 거래소 취소 실패: order_id={oid} status={status} exchange={exch}")
        except Exception as e:
            results["failed"].append({"id": oid, "status": status, "reason": str(e)[:120]})
            print(f"[KEY_DELETE] 거래소 취소 오류: order_id={oid} status={status} error={e}")

    # 4. 취소 성공 주문 DB 갱신 + AuditLog 기록
    with get_db() as db:
        if cancelled_ids:
            db.execute(
                _sa_update(PlannedOrder)
                .where(PlannedOrder.id.in_(cancelled_ids))
                .values(status="CANCELLED")
            )
        db.add(AuditLog(
            event="key_delete_exchange_cancel",
            symbol=None,
            detail=json.dumps({
                "user_id": user_id,
                "exchanges": exchanges,
                "cancelled": results["cancelled"],
                "failed": results["failed"],
                "cannot_attempt": results["cannot_attempt"],
            }),
        ))

    return results


class ApiKeyRequest(BaseModel):
    upbit_access_key: Optional[str] = ""
    upbit_secret_key: Optional[str] = ""
    bithumb_access_key: Optional[str] = ""
    bithumb_secret_key: Optional[str] = ""


def _get_config(db, key: str, user_id: int) -> str:
    row = db.execute(
        select(BotConfig).where(
            BotConfig.key == key,
            BotConfig.user_id == user_id
        )
    ).scalar_one_or_none()
    if not row:
        return ""
    try:
        return decrypt(row.value)
    except Exception:
        return ""


def _set_config(db, key: str, value: str, user_id: int):
    row = db.execute(
        select(BotConfig).where(
            BotConfig.key == key,
            BotConfig.user_id == user_id
        )
    ).scalar_one_or_none()
    encrypted = encrypt(value)
    if row:
        row.value = encrypted
    else:
        db.add(BotConfig(key=key, value=encrypted, user_id=user_id))


@router.get("/keys")
def get_keys(user=Depends(get_current_user)):
    user_id = user["user_id"]
    with get_db() as db:
        upbit_access = _get_config(db, "UPBIT_ACCESS_KEY", user_id)
        bithumb_access = _get_config(db, "BITHUMB_ACCESS_KEY", user_id)
        return {
            "upbit_access_key": upbit_access[:8] + "****" if upbit_access else "",
            "upbit_secret_key": "****" if _get_config(db, "UPBIT_SECRET_KEY", user_id) else "",
            "bithumb_access_key": bithumb_access[:8] + "****" if bithumb_access else "",
            "bithumb_secret_key": "****" if _get_config(db, "BITHUMB_SECRET_KEY", user_id) else "",
        }


@router.post("/keys")
def save_keys(req: ApiKeyRequest, user=Depends(get_current_user)):
    user_id = user["user_id"]
    with get_db() as db:
        if req.upbit_access_key:
            _set_config(db, "UPBIT_ACCESS_KEY", req.upbit_access_key, user_id)
        if req.upbit_secret_key:
            _set_config(db, "UPBIT_SECRET_KEY", req.upbit_secret_key, user_id)
        if req.bithumb_access_key:
            _set_config(db, "BITHUMB_ACCESS_KEY", req.bithumb_access_key, user_id)
        if req.bithumb_secret_key:
            _set_config(db, "BITHUMB_SECRET_KEY", req.bithumb_secret_key, user_id)

    if user.get("is_admin"):
        try:
            subprocess.Popen([_SUDO_BIN, _SYSTEMCTL_BIN, "restart", _BOT_SERVICE_NAME])
        except Exception as e:
            print(f"[CONFIG] 봇 재시작 실패: {e}")

    return {"success": True, "message": "API 키 저장 완료."}


@router.delete("/keys")
def delete_keys(user=Depends(get_current_user)):
    """내 API 키 전체 삭제"""
    user_id = user["user_id"]
    # 1단계: 키 삭제 전 거래소 미체결 주문 먼저 취소 (best-effort)
    cancel_result = _cancel_live_orders(user_id, ["upbit", "bithumb"])
    # 2단계: 키 삭제 + PLANNED/QUEUED 주문 즉시 취소
    with get_db() as db:
        rows = db.execute(
            select(BotConfig).where(BotConfig.user_id == user_id)
        ).scalars().all()
        for row in rows:
            db.delete(row)
        deleted = len(rows)
        db.execute(
            _sa_update(PlannedOrder)
            .where(
                PlannedOrder.user_id == user_id,
                PlannedOrder.status.in_(["PLANNED", "QUEUED"])
            )
            .values(status="CANCELLED")
        )
    return {"success": True, "deleted_keys": deleted, "exchange_cancels": cancel_result}


@router.delete("/keys/upbit")
def delete_upbit_keys(user=Depends(get_current_user)):
    """Upbit API 키 삭제"""
    user_id = user["user_id"]
    # 1단계: 업비트 미체결 주문 먼저 취소 (best-effort)
    cancel_result = _cancel_live_orders(user_id, ["upbit"])
    # 2단계: 업비트 키 삭제 + PLANNED/QUEUED 주문 즉시 취소
    with get_db() as db:
        rows = db.execute(
            select(BotConfig).where(
                BotConfig.user_id == user_id,
                BotConfig.key.in_(["UPBIT_ACCESS_KEY", "UPBIT_SECRET_KEY"])
            )
        ).scalars().all()
        deleted = len(rows)
        for row in rows:
            db.delete(row)
        db.execute(
            _sa_update(PlannedOrder)
            .where(
                PlannedOrder.user_id == user_id,
                PlannedOrder.status.in_(["PLANNED", "QUEUED"]),
                PlannedOrder.exchange != "bithumb"
            )
            .values(status="CANCELLED")
        )
    return {"success": True, "deleted_keys": deleted, "exchange_cancels": cancel_result}


@router.delete("/keys/bithumb")
def delete_bithumb_keys(user=Depends(get_current_user)):
    """Bithumb API 키 삭제"""
    user_id = user["user_id"]
    # 1단계: 빗썸 미체결 주문 먼저 취소 (best-effort)
    cancel_result = _cancel_live_orders(user_id, ["bithumb"])
    # 2단계: 빗썸 키 삭제 + PLANNED/QUEUED 주문 즉시 취소
    with get_db() as db:
        rows = db.execute(
            select(BotConfig).where(
                BotConfig.user_id == user_id,
                BotConfig.key.in_(["BITHUMB_ACCESS_KEY", "BITHUMB_SECRET_KEY"])
            )
        ).scalars().all()
        deleted = len(rows)
        for row in rows:
            db.delete(row)
        db.execute(
            _sa_update(PlannedOrder)
            .where(
                PlannedOrder.user_id == user_id,
                PlannedOrder.status.in_(["PLANNED", "QUEUED"]),
                PlannedOrder.exchange == "bithumb"
            )
            .values(status="CANCELLED")
        )
    return {"success": True, "deleted_keys": deleted, "exchange_cancels": cancel_result}


@router.get("/status")
def get_status(user=Depends(get_current_user)):
    try:
        result = subprocess.run(
            [_SYSTEMCTL_BIN, "is-active", _BOT_SERVICE_NAME],
            capture_output=True, text=True
        )
        raw_status = result.stdout.strip().lower()
        if raw_status in {"active", "inactive", "failed", "activating", "deactivating", "reloading"}:
            bot_status = raw_status
        else:
            bot_status = "unknown"
    except Exception:
        bot_status = "unknown"
    return {"bot_status": bot_status}
