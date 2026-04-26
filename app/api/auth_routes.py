from fastapi import APIRouter, HTTPException, Cookie, Response, Header, Request
from pydantic import BaseModel
from typing import Optional
from app.auth.auth import (
    verify_login, create_session, delete_session, get_session,
    get_all_users, create_user, create_guest_user, delete_user, deactivate_user,
    set_dry_run, get_user_dry_run
)
from app.core.config import DB_URL
import bcrypt
import psycopg2
import re
from datetime import datetime, timezone, timedelta

# ── 계정 기준 로그인 잠금 (DB 기반, sliding window) ────────────────────────
# 컬럼: users.login_fail_count / login_locked_until / login_fail_window_start
# 정책: 15분 window 내 5회 실패 → 30분 잠금
# 서버 재시작 후에도 유지됨

_ACCOUNT_FAIL_WINDOW   = timedelta(minutes=15)   # 실패 집계 기간
_ACCOUNT_FAIL_LIMIT    = 5                        # window 내 허용 실패 횟수
_ACCOUNT_LOCK_DURATION = timedelta(minutes=30)    # 임계치 초과 시 잠금 시간

def _check_lockout(username: str) -> Optional[str]:
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            "SELECT login_locked_until FROM users WHERE username = %s AND is_guest = FALSE",
            (username,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row or row[0] is None:
            return None
        locked_until = row[0]
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < locked_until:
            return "너무 많은 로그인 시도입니다. 30분 후 다시 시도하세요"
        return None
    except Exception as e:
        print(f"[AUTH] lockout 체크 오류: {e}")
        raise HTTPException(status_code=503, detail="서비스 일시적 오류입니다. 잠시 후 다시 시도하세요")

def _record_failure(username: str):
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            "SELECT login_fail_count, login_fail_window_start FROM users WHERE username = %s AND is_guest = FALSE",
            (username,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return
        count, window_start = row
        now = datetime.now(timezone.utc)
        # window_start가 없거나 15분 window 만료 시 새 window 시작
        if window_start is None:
            count = 1
            window_start = now
        else:
            if window_start.tzinfo is None:
                window_start = window_start.replace(tzinfo=timezone.utc)
            if now - window_start > _ACCOUNT_FAIL_WINDOW:
                # window 만료: 카운터 초기화 후 새 window
                count = 1
                window_start = now
            else:
                count = (count or 0) + 1
        if count >= _ACCOUNT_FAIL_LIMIT:
            locked_until = now + _ACCOUNT_LOCK_DURATION
            cur.execute(
                "UPDATE users SET login_fail_count = 0, login_locked_until = %s, login_fail_window_start = NULL WHERE username = %s",
                (locked_until, username)
            )
        else:
            cur.execute(
                "UPDATE users SET login_fail_count = %s, login_locked_until = NULL, login_fail_window_start = %s WHERE username = %s",
                (count, window_start, username)
            )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[AUTH] 실패 기록 오류: {e}")

def _record_success(username: str):
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET login_fail_count = 0, login_locked_until = NULL, login_fail_window_start = NULL WHERE username = %s",
            (username,)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[AUTH] 성공 초기화 오류: {e}")

# ── IP 기반 보조 잠금 (DB 기반, sliding window) ────────────────────────────
# 테이블: ip_login_failures (ip PK, fail_count, locked_until, fail_window_start, updated_at)
# 정책: 30분 window 내 10회 실패 → 15분 잠금 / 성공 로그인 시 즉시 초기화 금지
# IP 판별: X-Real-IP (nginx가 $remote_addr 설정) 우선, 없으면 request.client.host

_IP_FAIL_WINDOW   = timedelta(minutes=30)   # 실패 집계 기간 (TTL)
_IP_FAIL_LIMIT    = 10                       # window 내 허용 실패 횟수
_IP_LOCK_DURATION = timedelta(minutes=15)    # 임계치 초과 시 잠금 시간
_DEFAULT_LOGIN_SESSION_TTL = timedelta(hours=1)
_REMEMBER_LOGIN_SESSION_TTL = timedelta(days=7)

def _get_client_ip(request: Request) -> str:
    # nginx: proxy_set_header X-Real-IP $remote_addr → 클라이언트 위조 불가
    # X-Forwarded-For는 gridflow location에 nginx가 설정 안 하므로 사용 금지
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"

def _check_ip_lockout(ip: str) -> Optional[str]:
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT locked_until FROM ip_login_failures WHERE ip = %s", (ip,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row or row[0] is None:
            return None
        locked_until = row[0]
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < locked_until:
            return "너무 많은 로그인 시도입니다. 잠시 후 다시 시도하세요"
        return None
    except Exception as e:
        print(f"[AUTH] IP lockout 체크 오류: {e}")
        raise HTTPException(status_code=503, detail="서비스 일시적 오류입니다. 잠시 후 다시 시도하세요")

def _record_ip_failure(ip: str):
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT fail_count, fail_window_start FROM ip_login_failures WHERE ip = %s", (ip,))
        row = cur.fetchone()
        now = datetime.now(timezone.utc)
        if row is None:
            count = 1
            window_start = now
        else:
            count, window_start = row
            if window_start is None:
                count = 1
                window_start = now
            else:
                if window_start.tzinfo is None:
                    window_start = window_start.replace(tzinfo=timezone.utc)
                if now - window_start > _IP_FAIL_WINDOW:
                    # 30분 window 만료 → 카운터 초기화 후 새 window
                    count = 1
                    window_start = now
                else:
                    count = (count or 0) + 1
        if count >= _IP_FAIL_LIMIT:
            locked_until = now + _IP_LOCK_DURATION
            cur.execute("""
                INSERT INTO ip_login_failures (ip, fail_count, locked_until, fail_window_start, updated_at)
                VALUES (%s, 0, %s, NULL, NOW())
                ON CONFLICT (ip) DO UPDATE
                SET fail_count = 0, locked_until = %s, fail_window_start = NULL, updated_at = NOW()
            """, (ip, locked_until, locked_until))
        else:
            cur.execute("""
                INSERT INTO ip_login_failures (ip, fail_count, locked_until, fail_window_start, updated_at)
                VALUES (%s, %s, NULL, %s, NOW())
                ON CONFLICT (ip) DO UPDATE
                SET fail_count = %s, locked_until = NULL, fail_window_start = %s, updated_at = NOW()
            """, (ip, count, window_start, count, window_start))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[AUTH] IP 실패 기록 오류: {e}")

def _clear_ip_failures(ip: str):
    # 관리자 수동 초기화용 — 성공 로그인 시 호출하지 않음
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("""
            UPDATE ip_login_failures
            SET fail_count = 0, locked_until = NULL, fail_window_start = NULL, updated_at = NOW()
            WHERE ip = %s
        """, (ip,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[AUTH] IP 실패 초기화 오류: {e}")

# ── 회원가입 요청 rate limit (in-memory) ───────────────────────────────────
_register_attempts: dict = {}  # ip -> [timestamps]

def _register_rate_ok(ip: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    attempts = [t for t in _register_attempts.get(ip, []) if now - t < 60]
    if len(attempts) >= 5:
        _register_attempts[ip] = attempts
        return False
    attempts.append(now)
    _register_attempts[ip] = attempts
    return True

# ── 서버사이드 입력 검증 ────────────────────────────────────────────────────
def _validate_username(uname: str) -> Optional[str]:
    if len(uname) < 4 or len(uname) > 20:
        return "아이디는 4~20자여야 합니다"
    if not re.match(r'^[a-zA-Z0-9]+$', uname):
        return "아이디는 영문과 숫자만 사용 가능합니다"
    return None

def _validate_password(pw: str) -> Optional[str]:
    if len(pw) < 8:
        return "비밀번호는 최소 8자 이상이어야 합니다"
    if not re.search(r'[A-Z]', pw):
        return "대문자를 포함해야 합니다"
    if not re.search(r'[a-z]', pw):
        return "소문자를 포함해야 합니다"
    if not re.search(r'[0-9]', pw):
        return "숫자를 포함해야 합니다"
    if not re.search(r'[^a-zA-Z0-9]', pw):
        return "특수문자를 포함해야 합니다 (!@#$%^&* 등)"
    return None

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

class CreateUserRequest(BaseModel):
    username: str
    password: str
    # is_admin 필드 제거 — 관리자 지정은 직접 DB 수정 전용

class DeleteKeysRequest(BaseModel):
    user_id: int

@router.post("/register")
def register(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not _register_rate_ok(ip):
        raise HTTPException(429, "너무 많은 요청입니다. 1분 후 다시 시도하세요")
    err = _validate_username(req.username)
    if err:
        raise HTTPException(400, err)
    err = _validate_password(req.password)
    if err:
        raise HTTPException(400, err)
    result = create_user(req.username, req.password, False)
    if not result:
        raise HTTPException(400, "이미 사용 중인 아이디입니다")
    return {"success": True, "message": "회원가입이 완료되었습니다"}

@router.post("/login")
def login(req: LoginRequest, response: Response, request: Request):
    ip = _get_client_ip(request)
    # IP 잠금 체크 (보조)
    ip_msg = _check_ip_lockout(ip)
    if ip_msg:
        raise HTTPException(429, ip_msg)
    # username 잠금 체크 (주)
    lockout_msg = _check_lockout(req.username)
    if lockout_msg:
        raise HTTPException(429, lockout_msg)
    user = verify_login(req.username, req.password)
    if not user:
        _record_failure(req.username)
        _record_ip_failure(ip)
        raise HTTPException(401, "아이디 또는 비밀번호가 올바르지 않습니다")
    _record_success(req.username)
    # IP 카운터는 30분 window 만료로 자연 소멸 — 즉시 초기화 금지
    session_ttl = _REMEMBER_LOGIN_SESSION_TTL if req.remember_me else _DEFAULT_LOGIN_SESSION_TTL
    user["session_ttl"] = session_ttl
    token = create_session(user)
    cookie_kwargs = {
        "key": "session",
        "value": token,
        "httponly": True,
        "samesite": "lax",
    }
    if req.remember_me:
        cookie_kwargs["max_age"] = int(session_ttl.total_seconds())
    response.set_cookie(**cookie_kwargs)
    return {
        "success": True,
        "user_id": user["id"],
        "username": user["username"],
        "is_admin": user["is_admin"],
        "is_guest": False,
        "is_dry_run": get_user_dry_run(user["id"]),
    }

@router.post("/guest/session")
def create_guest_session(response: Response):
    guest = create_guest_user()
    if not guest:
        raise HTTPException(500, "게스트 세션 생성 실패")
    token = create_session(guest)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        max_age=3600,
        samesite="lax"
    )
    return {
        "success": True,
        "user_id": guest["id"],
        "username": guest["username"],
        "is_admin": False,
        "is_guest": True,
        "expires_at": guest["expires_at"].isoformat() if guest.get("expires_at") else None,
    }

@router.post("/guest/logout")
def logout_guest(
    response: Response,
    session: Optional[str] = Cookie(None),
):
    if not session:
        raise HTTPException(401, "로그인이 필요합니다")
    user = get_session(session)
    if not user:
        raise HTTPException(401, "세션이 만료됐습니다")
    if not user.get("is_guest"):
        return {"success": True, "guest": False}
    if not delete_user(user["user_id"]):
        raise HTTPException(500, "게스트 세션 정리 실패")
    response.delete_cookie("session")
    return {"success": True, "guest": True}

@router.post("/logout")
def logout(response: Response, session: Optional[str] = Cookie(None)):
    if session:
        delete_session(session)
    response.delete_cookie("session")
    return {"success": True}

@router.get("/me")
def me(session: Optional[str] = Cookie(None)):
    if not session:
        raise HTTPException(401, "로그인이 필요합니다")
    user = get_session(session)
    if not user:
        raise HTTPException(401, "세션이 만료됐습니다")
    return user

# 관리자 전용
@router.get("/users")
def list_users(session: Optional[str] = Cookie(None)):
    user = get_session(session) if session else None
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    return {"users": get_all_users()}

@router.post("/users")
def add_user(req: CreateUserRequest, session: Optional[str] = Cookie(None)):
    user = get_session(session) if session else None
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    result = create_user(req.username, req.password, False)  # 항상 일반 유저
    if not result:
        raise HTTPException(400, "유저 생성 실패 (중복된 아이디)")
    return {"success": True, "user": result}

@router.delete("/users/{user_id}")
def remove_user(user_id: int, session: Optional[str] = Cookie(None)):
    user = get_session(session) if session else None
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    if not delete_user(user_id):
        raise HTTPException(400, "삭제 실패")
    return {"success": True}

@router.post("/users/{user_id}/deactivate")
def disable_user(user_id: int, session: Optional[str] = Cookie(None)):
    user = get_session(session) if session else None
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    if not deactivate_user(user_id):
        raise HTTPException(400, "비활성화 실패")
    return {"success": True}

@router.post("/users/{user_id}/dryrun")
def toggle_dry_run(user_id: int, session: Optional[str] = Cookie(None)):
    """유저 DRY_RUN 토글 (관리자 전용)"""
    user = get_session(session) if session else None
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    current = get_user_dry_run(user_id)
    result = set_dry_run(user_id, not current)
    if not result:
        raise HTTPException(400, "설정 실패")
    return {"success": True, "user_id": user_id, "is_dry_run": not current}


@router.delete("/users/{user_id}/keys")
def delete_user_keys(user_id: int, session: Optional[str] = Cookie(None)):
    """유저 API 키 긴급 삭제"""
    user = get_session(session) if session else None
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("DELETE FROM bot_configs WHERE user_id = %s", (user_id,))
        deleted = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True, "deleted_keys": deleted}
    except Exception as e:
        print(f"[AUTH][ADMIN] API 키 삭제 오류: {e}")
        raise HTTPException(500, "내부 서버 오류")
