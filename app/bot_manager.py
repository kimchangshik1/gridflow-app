import asyncio
import psycopg2
from app.core.config import DB_URL
from app.core.crypto import decrypt
from app.exchange.upbit_client import UpbitClient
from app.exchange.bithumb_client import BithumbClient
from app.strategy.order_gateway import OrderGateway
from app.strategy.bithumb_order_gateway import BithumbOrderGateway
from app.exchange.bithumb_reconciler import BithumbReconciler
from app.exchange.reconciler import Reconciler


def get_active_users_with_keys():
    """DB에서 API 키가 있는 활성 유저 목록 반환"""
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.username,
                MAX(CASE WHEN bc.key = 'UPBIT_ACCESS_KEY' THEN bc.value END) as upbit_access,
                MAX(CASE WHEN bc.key = 'UPBIT_SECRET_KEY' THEN bc.value END) as upbit_secret,
                MAX(CASE WHEN bc.key = 'BITHUMB_ACCESS_KEY' THEN bc.value END) as bithumb_access,
                MAX(CASE WHEN bc.key = 'BITHUMB_SECRET_KEY' THEN bc.value END) as bithumb_secret
            FROM users u
            LEFT JOIN bot_configs bc ON bc.user_id = u.id
            WHERE u.is_active = TRUE
            GROUP BY u.id, u.username
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        users = []
        for row in rows:
            uid, uname, ua_enc, us_enc, ba_enc, bs_enc = row
            try:
                ua = decrypt(ua_enc) if ua_enc else None
                us = decrypt(us_enc) if us_enc else None
                ba = decrypt(ba_enc) if ba_enc else None
                bs = decrypt(bs_enc) if bs_enc else None
            except Exception:
                ua = us = ba = bs = None
            users.append({
                "id": uid,
                "username": uname,
                "upbit_access": ua,
                "upbit_secret": us,
                "bithumb_access": ba,
                "bithumb_secret": bs,
            })
        return users
    except Exception as e:
        print(f"[USERMGR] DB 조회 오류: {e}")
        return []


class UserBot:
    """유저 1명의 봇 인스턴스"""
    def __init__(self, user_id: int, username: str,
                 upbit_access: str, upbit_secret: str,
                 bithumb_access: str = None, bithumb_secret: str = None):
        self.user_id = user_id
        self.username = username
        self.upbit_access = upbit_access
        self.upbit_secret = upbit_secret
        self.bithumb_access = bithumb_access
        self.bithumb_secret = bithumb_secret
        self._tasks = []
        self._bithumb_tasks = {}
        self._running = False

        if upbit_access and upbit_secret:
            self.upbit_client = UpbitClient(
                access_key=upbit_access,
                secret_key=upbit_secret
            )
            self.gateway = OrderGateway(
                self.upbit_client,
                interval_sec=5,
                user_id=user_id
            )
            self.reconciler = Reconciler(
                self.upbit_client,
                interval_sec=30,
                user_id=user_id
            )
        else:
            class _NoopRunner:
                async def start(self):
                    return None

                def stop(self):
                    pass

            self.upbit_client = None
            self.gateway = _NoopRunner()
            self.reconciler = _NoopRunner()
        if bithumb_access and bithumb_secret:
            self.bithumb_client = BithumbClient(
                access_key=bithumb_access,
                secret_key=bithumb_secret
            )
            self.bithumb_gateway = BithumbOrderGateway(
                self.bithumb_client,
                interval_sec=5,
                user_id=user_id
            )
            self.bithumb_reconciler = BithumbReconciler(
                self.bithumb_client,
                interval_sec=30,
                user_id=user_id
            )
        else:
            self.bithumb_client = None
            self.bithumb_gateway = None
            self.bithumb_reconciler = None

    async def start(self):
        self._running = True
        print(f"[USERMGR] 유저 봇 시작: {self.username} (id={self.user_id})")
        coros = []
        if self.upbit_access and self.upbit_secret:
            coros.extend([self.gateway.start(), self.reconciler.start()])
        self._tasks = [asyncio.create_task(c) for c in coros]
        if self.bithumb_gateway:
            self._start_bithumb_task("gateway", self.bithumb_gateway.start)
        if self.bithumb_reconciler:
            self._start_bithumb_task("reconciler", self.bithumb_reconciler.start)

    def _start_bithumb_task(self, name: str, starter):
        task = asyncio.create_task(starter())
        self._bithumb_tasks[name] = task
        task.add_done_callback(lambda t, n=name, s=starter: self._bithumb_task_done(n, s, t))
        self._tasks.append(task)

    def _bithumb_task_done(self, name: str, starter, task):
        if not self._running or task.cancelled():
            return
        try:
            exc = task.exception()
        except asyncio.CancelledError:
            return
        print(f"[USERMGR] Bithumb {name} task stopped for user {self.user_id}: {exc}")
        self._tasks = [t for t in self._tasks if t is not task]
        asyncio.create_task(self._restart_bithumb_task(name, starter))

    async def _restart_bithumb_task(self, name: str, starter):
        await asyncio.sleep(5)
        if self._running:
            print(f"[USERMGR] Bithumb {name} task restart for user {self.user_id}")
            self._start_bithumb_task(name, starter)

    def stop(self):
        self._running = False
        self.gateway.stop()
        self.reconciler.stop()
        if self.bithumb_gateway:
            self.bithumb_gateway.stop()
        if self.bithumb_reconciler:
            self.bithumb_reconciler.stop()
        for t in self._tasks:
            t.cancel()
        print(f"[USERMGR] 유저 봇 종료: {self.username} (id={self.user_id})")


class UserBotManager:
    """전체 유저 봇 관리자"""
    def __init__(self, interval_sec: int = 30):
        self.interval_sec = interval_sec
        self._user_bots: dict[int, UserBot] = {}
        self._running = False

    def _key_changed(self, existing: UserBot, user_data: dict) -> bool:
        """키가 변경됐는지 확인"""
        return (
            existing.upbit_access != user_data["upbit_access"] or
            existing.upbit_secret != user_data["upbit_secret"] or
            existing.bithumb_access != user_data["bithumb_access"] or
            existing.bithumb_secret != user_data["bithumb_secret"]
        )

    async def _sync_users(self):
        """DB 유저 목록과 실행 중인 봇 동기화"""
        users = get_active_users_with_keys()
        active_ids = set()

        for u in users:
            uid = u["id"]
            has_upbit = bool(u.get("upbit_access") and u.get("upbit_secret"))
            has_bithumb = bool(u.get("bithumb_access") and u.get("bithumb_secret"))
            if not has_upbit and not has_bithumb:
                continue
            active_ids.add(uid)

            if uid in self._user_bots:
                # 키 변경됐으면 재시작
                if self._key_changed(self._user_bots[uid], u):
                    print(f"[USERMGR] 키 변경 감지 → 재시작: {u['username']}")
                    self._user_bots[uid].stop()
                    del self._user_bots[uid]
                else:
                    continue

            # 새 유저 봇 시작
            bot = UserBot(
                user_id=uid,
                username=u["username"],
                upbit_access=u["upbit_access"],
                upbit_secret=u["upbit_secret"],
                bithumb_access=u["bithumb_access"],
                bithumb_secret=u["bithumb_secret"],
            )
            await bot.start()
            self._user_bots[uid] = bot

        # 비활성화된 유저 봇 종료
        for uid in list(self._user_bots.keys()):
            if uid not in active_ids:
                print(f"[USERMGR] 유저 비활성화 → 봇 종료: id={uid}")
                self._user_bots[uid].stop()
                del self._user_bots[uid]

    async def start(self):
        self._running = True
        print("[USERMGR] 유저 봇 매니저 시작")
        while self._running:
            try:
                await self._sync_users()
            except Exception as e:
                print(f"[USERMGR] 동기화 오류: {e}")
            await asyncio.sleep(self.interval_sec)

    def stop(self):
        self._running = False
        for bot in self._user_bots.values():
            bot.stop()
        print("[USERMGR] 유저 봇 매니저 종료")
