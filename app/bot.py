import asyncio
from app.bot_manager import UserBotManager
from app.strategy.grid_engine import GridEngine
from app.strategy.dca_engine import DCAEngine
from app.strategy.rebalancing_engine import RebalancingEngine
from app.exchange.upbit_client import UpbitClient
from app.exchange.websocket_client import UpbitWebSocketClient
from app.monitor.emergency_stop import EmergencyStop
from app.core.cache import cache_refresh_loop
from app.core.config import UPBIT_ACCESS_KEY, UPBIT_SECRET_KEY
from app.db.database import init_db, check_db_connection


async def main():
    print("[BOT] 시작")
    if not check_db_connection():
        print("[FATAL] DB 연결 실패 -- 종료")
        return
    init_db()

    # 공용 클라이언트 (심볼 로딩 / WebSocket / EmergencyStop용)
    shared_client = UpbitClient()
    symbols = shared_client.load_symbols()
    print(f"[BOT] 심볼 {len(symbols)}개 로딩 완료")

    # 공용 컴포넌트
    emergency = None
    if UPBIT_ACCESS_KEY and UPBIT_SECRET_KEY:
        emergency = EmergencyStop(shared_client, interval_sec=10)
    else:
        print("[EMERGENCY] skip: shared upbit client not configured")
    ws_client = UpbitWebSocketClient(symbols)

    # 유저별 봇 매니저
    user_manager = UserBotManager(interval_sec=30)

    # 그리드 엔진 — S2-2: user_manager 전달로 유저별 실제 API 키 클라이언트 사용
    grid_engine = GridEngine(shared_client, interval_sec=5, user_manager=user_manager)
    dca_engine = DCAEngine(shared_client, interval_sec=60, user_manager=user_manager)
    rebal_engine = RebalancingEngine(shared_client, interval_sec=60, user_manager=user_manager)

    tasks = [
        ws_client.start(),
        cache_refresh_loop(symbols),
        user_manager.start(),
        grid_engine.start(),
        dca_engine.start(),
        rebal_engine.start(),
    ]
    if emergency is not None:
        tasks.insert(0, emergency.start())

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
