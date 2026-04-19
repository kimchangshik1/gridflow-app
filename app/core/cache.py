import asyncio
import requests
from datetime import datetime, timezone

_upbit_cache = {}
_bithumb_cache = {}


def get_upbit_ticker_cache() -> dict:
    return _upbit_cache


def get_bithumb_ticker_cache() -> dict:
    return _bithumb_cache


def set_bithumb_ticker_cache(data: dict) -> dict:
    global _bithumb_cache
    _bithumb_cache = data if isinstance(data, dict) else {}
    return _bithumb_cache


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
        r = requests.get(
            "https://api.bithumb.com/public/ticker/ALL_KRW",
            timeout=5
        )
        data = r.json().get("data", {})
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
