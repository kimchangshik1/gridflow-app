import os
import base64
from cryptography.fernet import Fernet
from pathlib import Path

# 고정 프로젝트 경로 — gridflowsvc(ubuntu 그룹) 읽기 가능 (640, ubuntu:ubuntu)
KEY_FILE = Path(__file__).resolve().parents[2] / ".upbit_bot_key"


def get_or_create_key() -> bytes:
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()
    # 키 파일이 없으면 신규 생성 금지 — 운영 오류로 처리
    raise FileNotFoundError(
        f"[CRYPTO] 암호화 키 파일이 없습니다: {KEY_FILE}\n"
        "키 파일을 해당 경로에 배치한 후 앱을 재시작하세요."
    )


def encrypt(value: str) -> str:
    f = Fernet(get_or_create_key())
    return f.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    f = Fernet(get_or_create_key())
    return f.decrypt(value.encode()).decode()
