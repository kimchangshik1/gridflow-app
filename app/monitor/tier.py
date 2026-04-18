"""
Monitor tier 설정 로더.

tier 값은 monitor_config.json 의 "tier" 키에서 읽는다.
값이 없거나 허용 범위 밖이면 반드시 "lite" 를 반환한다.
이 파일이 tier의 단일 소스(source of truth)다.
"""

import json
import os
from pathlib import Path

_CONFIG_PATH = Path(
    os.getenv("MONITOR_CONFIG_PATH", "/etc/gridflow/monitor_config.json")
)

ALLOWED_TIERS = frozenset({"lite", "pro", "signature"})
FALLBACK_TIER = "lite"


def get_current_tier() -> str:
    """
    monitor_config.json 의 tier 값을 읽어 검증 후 반환.
    허용 값: lite / pro / signature
    허용 범위 밖이거나 읽기 실패 시 항상 "lite" 반환.
    """
    try:
        if not _CONFIG_PATH.exists():
            return FALLBACK_TIER
        data = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
        raw = str(data.get("tier", "")).strip().lower()
        if raw in ALLOWED_TIERS:
            return raw
        return FALLBACK_TIER
    except Exception:
        return FALLBACK_TIER
