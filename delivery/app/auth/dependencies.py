from fastapi import HTTPException, Cookie, Request
from typing import Optional
from app.auth.auth import get_session


def get_current_user(
    request: Request,
    session: Optional[str] = Cookie(None),
) -> dict:
    """모든 API에서 호출하는 인증 의존성"""
    if not session:
        raise HTTPException(401, "로그인이 필요합니다")
    user = get_session(session)
    if not user:
        raise HTTPException(401, "세션이 만료됐습니다. 다시 로그인하세요")
    if user.get("is_guest"):
        user["is_dry_run"] = True
    return user


def get_admin_user(
    request: Request,
    session: Optional[str] = Cookie(None),
) -> dict:
    """관리자 전용 API 의존성"""
    user = get_current_user(request=request, session=session)
    if not user.get("is_admin"):
        raise HTTPException(403, "관리자 권한이 필요합니다")
    return user
