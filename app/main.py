from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
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
