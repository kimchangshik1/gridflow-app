import re

from fastapi import HTTPException


_MARKET_SYMBOL_RE = re.compile(r"^KRW-[A-Z0-9]{2,20}$")


def normalize_market_symbol(value: str, *, field_name: str = "symbol") -> str:
    if not isinstance(value, str):
        raise HTTPException(400, f"{field_name} 형식이 올바르지 않습니다")

    normalized = value.strip().upper()
    if not normalized:
        raise HTTPException(400, f"{field_name}이 비어 있습니다")
    if not _MARKET_SYMBOL_RE.fullmatch(normalized):
        raise HTTPException(400, f"{field_name} 형식 오류: '{value}' (예: KRW-BTC)")
    return normalized
