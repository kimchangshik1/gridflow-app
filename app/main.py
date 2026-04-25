from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.api.bithumb_routes import router as bithumb_router
from app.api.config_routes import router as config_router
from app.api.auth_routes import router as auth_router
from app.api.grid_routes import router as grid_router
from app.api.dca_routes import router as dca_router
from app.api.backtest_routes import router as backtest_router
from app.api.rebalancing_routes import router as rebalancing_router
from app.db.database import init_db, check_db_connection
from app.core.config import DRY_RUN


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[BOOT] DRY_RUN={DRY_RUN}")
    if not check_db_connection():
        raise RuntimeError("[FATAL] DB 연결 실패 — 종료")
    init_db()
    print("[BOOT] DB 준비 완료")
    print("[BOOT] 웹 앱 기동 완료")
    yield
    print("[SHUTDOWN] 종료")


app = FastAPI(title="Upbit Bot", lifespan=lifespan)

_STATE_CHANGE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_PROTECTED_PREFIXES = ("/api", "/bapi", "/config", "/auth", "/grid", "/dca", "/backtest", "/rebalancing")
_STATE_CHANGE_HEADER = "X-GridFlow-State-Change"
_STATE_CHANGE_HEADER_VALUE = "1"


def _has_origin_context(request: Request) -> bool:
    return any((request.headers.get(header_name) or "").strip() for header_name in ("origin", "referer"))


def _is_same_origin_state_change(request: Request) -> bool:
    expected_host = (request.headers.get("host") or "").strip().lower()
    if not expected_host:
        return False

    for header_name in ("origin", "referer"):
        raw_value = (request.headers.get(header_name) or "").strip()
        if not raw_value:
            continue
        parsed = urlparse(raw_value)
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc.lower() == expected_host:
            return True
    return False


@app.middleware("http")
async def protect_state_change_requests(request: Request, call_next):
    if request.method in _STATE_CHANGE_METHODS and request.url.path.startswith(_PROTECTED_PREFIXES):
        header_value = request.headers.get(_STATE_CHANGE_HEADER)
        if header_value != _STATE_CHANGE_HEADER_VALUE:
            return JSONResponse(
                status_code=403,
                content={"detail": "상태 변경 요청 검증에 실패했습니다"},
            )
        # Browser-originated mutations should not cross hosts. Non-browser callers without
        # Origin/Referer still rely on the existing custom-header contract.
        if _has_origin_context(request) and not _is_same_origin_state_change(request):
            return JSONResponse(
                status_code=403,
                content={"detail": "요청 출처 검증에 실패했습니다"},
            )
    return await call_next(request)


app.include_router(router, prefix="/api")
app.include_router(bithumb_router, prefix="/bapi")
app.include_router(config_router, prefix="/config")
app.include_router(auth_router, prefix="/auth")
app.include_router(grid_router, prefix="/grid")
app.include_router(dca_router, prefix="/dca")
app.include_router(backtest_router, prefix="/backtest")
app.include_router(rebalancing_router, prefix="/rebalancing")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def index():
    import time
    response = FileResponse("static/index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response
