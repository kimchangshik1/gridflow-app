import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = Path(os.getenv("GRIDFLOW_ENV_FILE", "/etc/gridflow/gridflow.env"))
if not os.getenv("DB_URL") and ENV_FILE.exists():
    load_dotenv(ENV_FILE)
elif not os.getenv("DB_URL"):
    load_dotenv(BASE_DIR / ".env")

UPBIT_ACCESS_KEY = os.getenv("UPBIT_ACCESS_KEY", "")
UPBIT_SECRET_KEY = os.getenv("UPBIT_SECRET_KEY", "")
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError(
        f"DB_URL is required. Set it in {ENV_FILE} or the service environment."
    )
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
MAX_ACTIVE_ORDERS_PER_SYMBOL = int(os.getenv("MAX_ACTIVE_ORDERS_PER_SYMBOL", "10"))
MAX_PLANNED_ORDERS_PER_SYMBOL = int(os.getenv("MAX_PLANNED_ORDERS_PER_SYMBOL", "50"))

BITHUMB_ACCESS_KEY = os.getenv("BITHUMB_ACCESS_KEY", "")
BITHUMB_SECRET_KEY = os.getenv("BITHUMB_SECRET_KEY", "")
