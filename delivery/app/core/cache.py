import asyncio
import requests
import threading
import time
from datetime import datetime, timezone

_upbit_cache = {}
_bithumb_cache = {}
_bithumb_cache_fetched_at = 0.0
_BITHUMB_CACHE_TTL_SEC = 2.5
_bithumb_refresh_inflight = False
_bithumb_cache_cond = threading.Condition()


def get_upbit_ticker_cache() -> dict:
    return _upbit_cache


def get_bithumb_ticker_cache() -> dict:
    return _bithumb_cache


def get_bithumb_ticker_cache_with_state(max_age_sec: float | None = None, soft_age_sec: float | None = None) -> tuple[dict, str]:
    with _bithumb_cache_cond:
        if not _bithumb_cache:
            return {}, "empty"

        ttl = _BITHUMB_CACHE_TTL_SEC if max_age_sec is None else max_age_sec
        age_sec = (time.time() - _bithumb_cache_fetched_at) if _bithumb_cache_fetched_at > 0 else 0.0
        if ttl is not None and _bithumb_cache_fetched_at > 0 and age_sec >= ttl:
            return _bithumb_cache, "stale_refreshing" if _bithumb_refresh_inflight else "stale"

        if soft_age_sec is not None and _bithumb_cache_fetched_at > 0 and age_sec >= soft_age_sec:
            return _bithumb_cache, "warming" if not _bithumb_refresh_inflight else "warming_refreshing"

        return _bithumb_cache, "warm"


def _fetch_bithumb_ticker_data() -> dict:
    r = requests.get(
        "https://api.bithumb.com/public/ticker/ALL_KRW",
        timeout=5
    )
    return r.json().get("data", {})


def set_bithumb_ticker_cache(data: dict) -> dict:
    global _bithumb_cache
    global _bithumb_cache_fetched_at
    with _bithumb_cache_cond:
        _bithumb_cache = data if isinstance(data, dict) else {}
        _bithumb_cache_fetched_at = time.time() if _bithumb_cache else 0.0
        return _bithumb_cache


def refresh_bithumb_cache_blocking() -> dict:
    global _bithumb_refresh_inflight
    with _bithumb_cache_cond:
        while _bithumb_refresh_inflight:
            _bithumb_cache_cond.wait(timeout=5.5)
            if _bithumb_cache:
                return _bithumb_cache
        _bithumb_refresh_inflight = True

    try:
        data = _fetch_bithumb_ticker_data()
        set_bithumb_ticker_cache(data)
        return get_bithumb_ticker_cache()
    finally:
        with _bithumb_cache_cond:
            _bithumb_refresh_inflight = False
            _bithumb_cache_cond.notify_all()


def ensure_bithumb_cache_refresh_async() -> bool:
    global _bithumb_refresh_inflight
    with _bithumb_cache_cond:
        if _bithumb_refresh_inflight:
            return False
        _bithumb_refresh_inflight = True

    def _runner():
        global _bithumb_refresh_inflight
        try:
            data = _fetch_bithumb_ticker_data()
            set_bithumb_ticker_cache(data)
        except Exception as e:
            print(f"[CACHE] Bithumb background refresh 실패: {e}")
        finally:
            with _bithumb_cache_cond:
                _bithumb_refresh_inflight = False
                _bithumb_cache_cond.notify_all()

    threading.Thread(target=_runner, name="bithumb-cache-refresh", daemon=True).start()
    return True


async def refresh_upbit_cache(symbols: list):
    global _upbit_cache
    try:
        result = {}
        for i in range(0, len(symbols), 100):
            chunk = symbols[i:i+100]
            markets = ",".join(chunk)
            r = requests.get(
                f"https://api.upbit.com/v1/ticker?markets={markets}",
                timeout=5
            )
            for t in r.json():
                result[t["market"]] = t
        _upbit_cache = result
        print(f"[CACHE] Upbit {len(result)}개 갱신 완료")
    except Exception as e:
        print(f"[CACHE] Upbit 갱신 실패: {e}")


async def refresh_bithumb_cache():
    try:
        data = _fetch_bithumb_ticker_data()
        set_bithumb_ticker_cache(data)
        print(f"[CACHE] Bithumb {len(data)}개 갱신 완료")
    except Exception as e:
        print(f"[CACHE] Bithumb 갱신 실패: {e}")


async def cache_refresh_loop(symbols: list):
    print("[CACHE] 캐시 갱신 루프 시작")
    while True:
        await refresh_upbit_cache(symbols)
        await refresh_bithumb_cache()
        await asyncio.sleep(30)
