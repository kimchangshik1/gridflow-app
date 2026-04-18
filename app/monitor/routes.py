import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel

_log = logging.getLogger(__name__)

from app.monitor.auth import (
    _CONFIG_PATH,
    clear_monitor_config,
    create_monitor_session,
    delete_monitor_session,
    get_monitor_user,
    has_monitor_password,
    has_saved_monitor_config,
    invalidate_all_sessions,
    is_valid_session,
    set_monitor_password,
    verify_monitor_password,
    write_monitor_config,
)
from app.monitor.repo import list_recent_activity, list_recent_orders
from app.monitor.tier import get_current_tier


router = APIRouter()


# ── 브루트포스 방지 ───────────────────────────────────────────────
# 10분 내 로그인 실패 5회 초과 시 10분 차단 (메모리 기반)

_FAIL_WINDOW = timedelta(minutes=10)
_FAIL_LIMIT = 5
_login_failures: dict[str, list] = defaultdict(list)  # ip → [실패 시각, ...]


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    """실패 횟수 초과 시 HTTPException 429."""
    now = datetime.utcnow()
    cutoff = now - _FAIL_WINDOW
    _login_failures[ip] = [t for t in _login_failures[ip] if t > cutoff]
    if len(_login_failures[ip]) >= _FAIL_LIMIT:
        raise HTTPException(status_code=429, detail="잠시 후 다시 시도하세요")


def _record_failure(ip: str) -> None:
    _login_failures[ip].append(datetime.utcnow())


def _reset_failures(ip: str) -> None:
    _login_failures.pop(ip, None)


# ── 모델 ─────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    password: str
    mode: str = "login"   # "login" | "setup"
    confirm: Optional[str] = None


class SetupRequest(BaseModel):
    exchange: str
    api_key: str
    api_secret: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm: str


# ── 인증 엔드포인트 ───────────────────────────────────────────────

@router.get("/auth-status")
def get_auth_status():
    """비밀번호 설정 여부 확인 (인증 불필요)."""
    return {"has_password": has_monitor_password()}


@router.post("/login")
def monitor_login(req: LoginRequest, request: Request, response: Response):
    ip = _client_ip(request)
    _check_rate_limit(ip)  # 차단 중이면 여기서 429

    if req.mode == "setup":
        if has_monitor_password():
            raise HTTPException(400, "비밀번호가 이미 설정되어 있습니다")
        if ip not in ("127.0.0.1", "::1"):
            raise HTTPException(403, "초기 설정은 서버 로컬에서만 허용됩니다")
        if not req.confirm or req.password != req.confirm:
            _record_failure(ip)  # setup 실패도 레이트 리밋 카운터에 포함
            raise HTTPException(400, "비밀번호가 일치하지 않습니다")
        if len(req.password) < 8:
            _record_failure(ip)  # setup 실패도 레이트 리밋 카운터에 포함
            raise HTTPException(400, "비밀번호는 8자 이상이어야 합니다")
        set_monitor_password(req.password)
    else:
        if not has_monitor_password():
            raise HTTPException(400, "비밀번호가 설정되지 않았습니다. 먼저 비밀번호를 설정하세요.")
        if not verify_monitor_password(req.password):
            _record_failure(ip)  # 틀린 비밀번호만 카운트
            raise HTTPException(401, "비밀번호가 틀렸습니다")

    _reset_failures(ip)  # 성공 시 카운터 초기화
    token = create_monitor_session()
    response.set_cookie(
        "monitor_session",
        token,
        httponly=True,
        samesite="strict",
        max_age=28800,  # 8시간
    )
    return {"ok": True}


@router.post("/logout")
def monitor_logout(
    response: Response,
    monitor_session: Optional[str] = Cookie(None),
):
    if monitor_session:
        delete_monitor_session(monitor_session)
    response.delete_cookie("monitor_session")
    return {"ok": True}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    response: Response,
    user=Depends(get_monitor_user),
):
    if not verify_monitor_password(req.current_password):
        raise HTTPException(400, "현재 비밀번호가 올바르지 않습니다")
    if len(req.new_password) < 8:
        raise HTTPException(400, "새 비밀번호는 8자 이상이어야 합니다")
    if req.new_password != req.confirm:
        raise HTTPException(400, "새 비밀번호 확인이 일치하지 않습니다")
    set_monitor_password(req.new_password)
    invalidate_all_sessions()
    response.delete_cookie("monitor_session")
    return {"ok": True}


# ── API 설정 엔드포인트 ───────────────────────────────────────────

@router.get("/api-status")
def get_api_status(user=Depends(get_monitor_user)):
    """저장된 API 설정 상태 반환. secret 전체값 미포함."""
    if not _CONFIG_PATH.exists():
        return {"saved": False}
    cfg = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    saved = has_saved_monitor_config()
    key = cfg.get("api_key", "")
    if len(key) >= 8:
        key_masked = key[:4] + "..." + key[-4:]
    elif len(key) >= 4:
        key_masked = key[:2] + "..." + key[-2:]
    elif key:
        key_masked = "****"
    else:
        key_masked = ""
    return {
        "saved": saved,
        "exchange": cfg.get("exchange", ""),
        "key_masked": key_masked,
        "has_secret": bool(cfg.get("api_secret", "")),
    }


@router.post("/setup")
def save_setup(req: SetupRequest, user=Depends(get_monitor_user)):
    try:
        write_monitor_config(req.model_dump())
    except Exception as e:
        _log.error("monitor setup 저장 실패: %s", e)
        raise HTTPException(500, "설정 저장 중 오류가 발생했습니다")
    return {"ok": True}


@router.delete("/setup")
def delete_setup(user=Depends(get_monitor_user)):
    """저장된 API 설정 초기화. inode를 유지해 권한 드리프트를 막는다."""
    clear_monitor_config()
    return {"ok": True}


# ── 데이터 엔드포인트 ─────────────────────────────────────────────

@router.get("/tier")
def get_tier(user=Depends(get_monitor_user)):
    """현재 monitor tier 반환."""
    return {"tier": get_current_tier()}


@router.get("/orders")
def get_monitor_orders(user=Depends(get_monitor_user)):
    return list_recent_orders()


@router.get("/activity")
def get_monitor_activity(user=Depends(get_monitor_user)):
    return list_recent_activity()
