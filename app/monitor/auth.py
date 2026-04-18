import json
import os
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import bcrypt
from fastapi import Cookie, Header, HTTPException, Request

_CONFIG_PATH = Path(
    os.getenv("MONITOR_CONFIG_PATH", "/etc/gridflow/monitor_config.json")
)
_AUTH_PATH = Path(
    os.getenv("MONITOR_AUTH_PATH", "/etc/gridflow/monitor_auth.json")
)

_SESSION_TTL = timedelta(hours=8)
_sessions: dict = {}  # token -> expires_at (datetime)

_LOCAL_USER = {
    "user_id": 1,
    "username": "local",
    "is_admin": True,
    "is_guest": False,
}


# ── 비밀번호 관리 ────────────────────────────────────────────────

def _write_monitor_json(path: Path, payload: dict, *, indent: Optional[int] = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # In-place rewrite preserves owner/group/mode when the file already exists.
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=indent)
        handle.write("\n")


def has_saved_monitor_config() -> bool:
    if not _CONFIG_PATH.exists():
        return False
    try:
        data = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return False
    return bool(data.get("exchange") and data.get("api_key") and data.get("api_secret"))


def write_monitor_config(data: dict) -> None:
    _write_monitor_json(_CONFIG_PATH, data, indent=2)


def clear_monitor_config() -> None:
    write_monitor_config({"exchange": "", "api_key": "", "api_secret": ""})

def has_monitor_password() -> bool:
    return _AUTH_PATH.exists()


def set_monitor_password(password: str) -> None:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    _write_monitor_json(_AUTH_PATH, {"password_hash": hashed})


def verify_monitor_password(password: str) -> bool:
    if not _AUTH_PATH.exists():
        return False
    data = json.loads(_AUTH_PATH.read_text(encoding="utf-8"))
    stored = data.get("password_hash", "")
    if not stored:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))


# ── 세션 관리 ────────────────────────────────────────────────────

def create_monitor_session() -> str:
    token = secrets.token_hex(32)
    _sessions[token] = datetime.now(timezone.utc) + _SESSION_TTL
    return token


def is_valid_session(token: str) -> bool:
    if not token:
        return False
    exp = _sessions.get(token)
    if not exp:
        return False
    if datetime.now(timezone.utc) > exp:
        del _sessions[token]
        return False
    return True


def delete_monitor_session(token: str) -> None:
    _sessions.pop(token, None)


def invalidate_all_sessions() -> None:
    _sessions.clear()


# ── FastAPI 의존성 ────────────────────────────────────────────────

def get_monitor_user(
    request: Request,
    monitor_session: Optional[str] = Cookie(None),
) -> dict:
    """세션 쿠키 검증 — 유효하지 않으면 401."""
    if not is_valid_session(monitor_session):
        raise HTTPException(
            status_code=401,
            detail="로그인이 필요합니다",
        )
    return _LOCAL_USER
