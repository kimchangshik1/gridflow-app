import asyncio
from datetime import datetime, timezone
from app.db.database import get_db, check_db_connection
from app.db.models import PlannedOrder, AuditLog
from app.exchange.upbit_client import UpbitClient
from app.db.order_manager import transition, ACTIVE_STATUSES
from sqlalchemy import select
import json


def now_utc():
    return datetime.now(timezone.utc)


class EmergencyStop:
    """
    비상정지 모니터
    - DB 연결 실패 → 신규 주문 차단
    - 잔고 조회 실패 → 신규 주문 차단
    - WebSocket 끊김 → 신규 주문 차단
    fail-closed: 불확실하면 멈춤
    """
    def __init__(self, client: UpbitClient, interval_sec: int = 10):
        self.client = client
        self.interval_sec = interval_sec
        self._running = False
        self.is_stopped = False
        self.stop_reason = ""

    def _audit(self, event: str, detail: dict = None):
        try:
            with get_db() as db:
                db.add(AuditLog(
                    event=event,
                    detail=json.dumps(detail) if detail else None,
                ))
        except Exception:
            print(f"[EMERGENCY] 감사로그 실패: {event}")

    def trigger(self, reason: str):
        if not self.is_stopped:
            self.is_stopped = True
            self.stop_reason = reason
            print(f"[EMERGENCY] 비상정지 발동: {reason}")
            self._audit("emergency_stop_triggered", {"reason": reason})

    def reset(self, reason: str = "manual_reset"):
        self.is_stopped = False
        self.stop_reason = ""
        print(f"[EMERGENCY] 비상정지 해제: {reason}")
        self._audit("emergency_stop_reset", {"reason": reason})

    async def _check(self):
        # 1. DB 연결 확인
        if not check_db_connection():
            self.trigger("db_connection_failed")
            return

        # 2. 잔고 조회 확인
        balances = self.client.get_balances()
        if balances is None:
            self.trigger("balance_query_failed")
            return
        if balances == {} and not self.client.get_krw_balance():
            self.trigger("balance_query_failed")
            return

        # 3. 정상이면 자동 해제
        if self.is_stopped and self.stop_reason in (
            "db_connection_failed", "balance_query_failed"
        ):
            self.reset("auto_recovered")

    async def start(self):
        self._running = True
        self._fail_count = 0
        print(f"[EMERGENCY] 모니터 시작 — 주기={self.interval_sec}초")
        while self._running:
            try:
                await self._check()
                if self.is_stopped:
                    print(f"[EMERGENCY] 정지 상태: {self.stop_reason}")
                    self._fail_count += 1
                    # rate limit 걸리면 백오프: 최대 60초
                    wait = min(self.interval_sec * self._fail_count, 60)
                    await asyncio.sleep(wait)
                    continue
                else:
                    self._fail_count = 0
            except Exception as e:
                print(f"[EMERGENCY] 체크 오류: {e}")
                self.trigger(f"monitor_error: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
