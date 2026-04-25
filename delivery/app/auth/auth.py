import bcrypt
import secrets
import psycopg2
from psycopg2 import sql
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.config import DB_URL

_DEFAULT_SANDBOX_KRW_BALANCE = 10_000_000


def _get_user_child_tables(cur) -> tuple[str, ...]:
    """users FK를 가진 child table 목록을 실제 스키마 기준으로 조회"""
    cur.execute(
        """
        SELECT DISTINCT conrelid::regclass::text
        FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'users'::regclass
        ORDER BY conrelid::regclass::text
        """
    )
    return tuple(row[0] for row in cur.fetchall())

def get_conn():
    return psycopg2.connect(DB_URL)

def verify_login(username: str, password: str) -> Optional[dict]:
    """아이디/비밀번호 검증 → 성공시 유저 정보 반환"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, username, password_hash, is_admin, is_active FROM users WHERE username = %s",
            (username,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return None
        user_id, uname, pw_hash, is_admin, is_active = row
        if not is_active:
            return None
        if not bcrypt.checkpw(password.encode("utf-8"), pw_hash.encode("utf-8")):
            return None
        # 마지막 로그인 시간 업데이트
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET last_login_at = %s WHERE id = %s",
            (datetime.now(timezone.utc), user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"id": user_id, "username": uname, "is_admin": is_admin}
    except Exception as e:
        print(f"[AUTH] 로그인 오류: {e}")
        return None

def create_session(user: dict) -> str:
    """세션 토큰 생성 및 DB 저장"""
    token = secrets.token_hex(32)
    ttl = user.get("session_ttl") or timedelta(hours=24)
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_sessions (token, user_id, username, is_admin, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (token) DO NOTHING
        """, (token, user["id"], user["username"], user["is_admin"],
              datetime.now(timezone.utc) + ttl))
        conn.commit()
        cur.close()
        conn.close()
        print(f"[AUTH] 세션 생성: {user['username']} ({user['id']})")
    except Exception as e:
        print(f"[AUTH] 세션 저장 오류: {e}")
    return token

def get_session(token: str) -> Optional[dict]:
    """토큰으로 DB 세션 조회"""
    if not token:
        return None
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT s.user_id, s.username, s.is_admin, u.is_dry_run, u.is_guest, u.expires_at
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = %s
              AND s.expires_at > NOW()
              AND u.is_active = TRUE
              AND (u.expires_at IS NULL OR u.expires_at > NOW())
        """, (token,))
        row = cur.fetchone()
        if not row:
            # 만료된 guest 자동 삭제 (is_guest=TRUE, expires_at 초과)
            cur.execute("""
                SELECT u.id FROM user_sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token = %s
                  AND u.is_guest = TRUE
                  AND u.expires_at IS NOT NULL
                  AND u.expires_at <= NOW()
            """, (token,))
            expired = cur.fetchone()
            if expired:
                guest_user_id = expired[0]
                cur.execute("DELETE FROM user_sessions WHERE user_id = %s", (guest_user_id,))
                cur.execute("DELETE FROM users WHERE id = %s AND is_guest = TRUE", (guest_user_id,))
                conn.commit()
                print(f"[AUTH] 만료된 guest 자동 삭제: user_id={guest_user_id}")
            cur.close()
            conn.close()
            return None
        cur.close()
        conn.close()
        return {
            "user_id": row[0],
            "username": row[1],
            "is_admin": row[2],
            "is_dry_run": row[3],
            "is_guest": row[4],
            "expires_at": row[5].isoformat() if row[5] else None,
        }
    except Exception as e:
        print(f"[AUTH] 세션 조회 오류: {e}")
        return None

def delete_session(token: str):
    """세션 삭제 (로그아웃)"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM user_sessions WHERE token = %s", (token,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[AUTH] 세션 삭제 오류: {e}")

def get_all_users() -> list:
    """전체 유저 목록 (관리자용)"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, username, is_admin, is_active, created_at, last_login_at, is_dry_run FROM users ORDER BY id"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            {
                "id": r[0],
                "username": r[1],
                "is_admin": r[2],
                "is_active": r[3],
                "created_at": str(r[4]),
                "last_login_at": str(r[5]) if r[5] else None,
                "is_dry_run": r[6],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"[AUTH] 유저 목록 오류: {e}")
        return []

def create_user(username: str, password: str, is_admin: bool = False) -> Optional[dict]:
    """새 유저 생성 — is_admin은 항상 False로 강제 (관리자 지정은 직접 DB 수정 전용)"""
    try:
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (%s, %s, %s) RETURNING id, username",
            (username, hashed, False)  # is_admin 파라미터 무시 — 항상 일반 유저로 생성
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {"id": row[0], "username": row[1]}
    except Exception as e:
        print(f"[AUTH] 유저 생성 오류: {e}")
        return None


def create_guest_user() -> Optional[dict]:
    """60분 TTL을 가진 임시 게스트 유저 생성"""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    for _ in range(3):
        username = "guest_" + secrets.token_hex(8)
        password = secrets.token_urlsafe(24)
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        conn = None
        cur = None
        try:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO users (
                    username, password_hash, is_admin, is_active,
                    is_dry_run, is_guest, expires_at
                )
                VALUES (%s, %s, FALSE, TRUE, TRUE, TRUE, %s)
                RETURNING id, username, is_admin, is_guest, expires_at
            """, (username, hashed, expires_at))
            row = cur.fetchone()
            cur.execute(
                """
                INSERT INTO sandbox_balances (user_id, krw_balance)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO UPDATE
                SET krw_balance = EXCLUDED.krw_balance,
                    updated_at = NOW()
                """,
                (row[0], _DEFAULT_SANDBOX_KRW_BALANCE),
            )
            conn.commit()
            cur.close()
            conn.close()
            return {
                "id": row[0],
                "username": row[1],
                "is_admin": row[2],
                "is_guest": row[3],
                "expires_at": row[4],
                "session_ttl": timedelta(minutes=60),
            }
        except Exception as e:
            try:
                if conn is not None:
                    conn.rollback()
            except psycopg2.Error as rollback_error:
                print(f"[AUTH] 게스트 유저 롤백 실패: {rollback_error}")
            try:
                if cur is not None:
                    cur.close()
            except psycopg2.Error as close_error:
                print(f"[AUTH] 게스트 유저 cursor close 실패: {close_error}")
            try:
                if conn is not None:
                    conn.close()
            except psycopg2.Error as close_error:
                print(f"[AUTH] 게스트 유저 connection close 실패: {close_error}")
            print(f"[AUTH] 게스트 유저 생성 오류: {e}")
    return None

def delete_user(user_id: int) -> bool:
    """유저 삭제"""
    conn = None
    cur = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM users WHERE id = %s AND is_admin = FALSE",
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return False

        # users FK들은 ON DELETE CASCADE가 아니라서 child row를 먼저 정리해야 한다.
        for table_name in _get_user_child_tables(cur):
            cur.execute(
                sql.SQL("DELETE FROM {} WHERE user_id = %s").format(
                    sql.Identifier(table_name)
                ),
                (user_id,),
            )
        cur.execute("DELETE FROM users WHERE id = %s AND is_admin = FALSE", (user_id,))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted
    except Exception as e:
        try:
            if conn is not None:
                conn.rollback()
        except Exception:
            pass
        try:
            if cur is not None:
                cur.close()
        except Exception:
            pass
        try:
            if conn is not None:
                conn.close()
        except Exception:
            pass
        print(f"[AUTH] 유저 삭제 오류: {e}")
        return False

def set_dry_run(user_id: int, is_dry_run: bool) -> bool:
    """유저 DRY_RUN 설정"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET is_dry_run = %s WHERE id = %s",
            (is_dry_run, user_id)
        )
        updated = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return updated
    except Exception as e:
        print(f"[AUTH] DRY_RUN 설정 오류: {e}")
        return False


def get_user_dry_run(user_id: int) -> bool:
    """유저 DRY_RUN 여부 조회"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT is_dry_run FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        return row[0] if row else False
    except Exception as e:
        print(f"[AUTH] DRY_RUN 조회 오류: {e}")
        return False


def deactivate_user(user_id: int) -> bool:
    """유저 비활성화"""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET is_active = FALSE WHERE id = %s AND is_admin = FALSE",
            (user_id,)
        )
        updated = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return updated
    except Exception as e:
        print(f"[AUTH] 유저 비활성화 오류: {e}")
        return False
