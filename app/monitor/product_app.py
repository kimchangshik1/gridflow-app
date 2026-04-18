import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.db.database import check_db_connection
from app.monitor.auth import has_saved_monitor_config, is_valid_session
from app.monitor.routes import router as monitor_router

_log = logging.getLogger(__name__)

_STATIC_DIR = Path(__file__).resolve().parents[2] / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not check_db_connection():
        raise RuntimeError("[MONITOR][FATAL] DB 연결 실패")
    print("[MONITOR] DB 연결 확인 완료")
    yield
    print("[MONITOR] 종료")


app = FastAPI(
    title="Order / Activity Monitor",
    lifespan=lifespan,
)

app.include_router(monitor_router, prefix="/monitor")


@app.exception_handler(RequestValidationError)
async def _validation_error_handler(request: Request, exc: RequestValidationError):
    """422 요청 파싱 오류 — 내부 필드 상세 노출 방지."""
    return JSONResponse(status_code=422, content={"detail": "요청 형식이 올바르지 않습니다"})


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    """처리되지 않은 서버 오류 — stack trace 클라이언트 노출 방지."""
    _log.error("monitor unhandled error [%s %s]: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "서버 오류가 발생했습니다"})

_LOGIN_HTML = _STATIC_DIR / "monitor_login.html"
_SETUP_HTML = _STATIC_DIR / "monitor_setup.html"
_HOME_HTML = _STATIC_DIR / "monitor.html"


def _has_session(request: Request) -> bool:
    token = request.cookies.get("monitor_session")
    return is_valid_session(token)


@app.get("/monitor")
def monitor_home(request: Request):
    if not _has_session(request):
        return RedirectResponse("/monitor/login", status_code=302)
    if not has_saved_monitor_config():
        return RedirectResponse("/monitor/setup", status_code=302)
    return FileResponse(_HOME_HTML)


@app.get("/monitor/login")
def login_page():
    return FileResponse(_LOGIN_HTML)


@app.get("/monitor/setup")
def setup_page(request: Request):
    if not _has_session(request):
        return RedirectResponse("/monitor/login", status_code=302)
    return FileResponse(_SETUP_HTML)


# /static → 프로젝트 루트의 static/ 폴더 직접 서빙
app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")
