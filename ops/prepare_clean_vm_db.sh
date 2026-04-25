#!/usr/bin/env bash
set -euo pipefail

MODE="dry-run"
APP_DIR=""
DB_URL=""

usage() {
  cat <<'EOF'
Usage:
  bash ops/prepare_clean_vm_db.sh --app-dir <path> --db-url <url> [--execute]

Notes:
  - default mode is dry-run
  - --execute runs alembic upgrade head against the provided DB URL only
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir)
      APP_DIR="${2:-}"
      shift 2
      ;;
    --db-url)
      DB_URL="${2:-}"
      shift 2
      ;;
    --execute)
      MODE="execute"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$APP_DIR" || -z "$DB_URL" ]]; then
  echo "missing required arguments" >&2
  usage >&2
  exit 2
fi

ALEMBIC_INI="${APP_DIR}/alembic.ini"
ALEMBIC_ENV="${APP_DIR}/alembic/env.py"
ALEMBIC_REV="${APP_DIR}/alembic/versions/20260420_01_live_public_baseline.py"
APP_PYTHON="${APP_DIR}/venv/bin/python"

mask_db_url() {
  local raw="$1"
  local scheme rest hostpath

  if [[ -z "$raw" ]]; then
    printf 'unset\n'
    return
  fi

  if [[ "$raw" != *"://"* ]]; then
    printf '[redacted]\n'
    return
  fi

  scheme="${raw%%://*}"
  rest="${raw#*://}"
  if [[ "$rest" == *"@"* ]]; then
    hostpath="${rest#*@}"
    printf '%s://***@%s\n' "$scheme" "$hostpath"
    return
  fi

  printf '%s://[redacted]\n' "$scheme"
}

step_pass() {
  printf 'PASS %s\n' "$1"
}

step_fail() {
  printf 'FAIL %s\n' "$1" >&2
  printf 'overall: FAIL\n' >&2
  exit 1
}

run_step() {
  local step_name="$1"
  shift
  if "$@"; then
    step_pass "$step_name"
  else
    step_fail "$step_name"
  fi
}

check_path_exists() {
  local path="$1"
  [[ -e "$path" ]]
}

run_alembic_upgrade() {
  (
    cd "${APP_DIR}"
    DB_URL="${DB_URL}" "${APP_PYTHON}" -m alembic upgrade head
  )
}

verify_db_state() {
  DB_URL="${DB_URL}" "${APP_PYTHON}" -c '
import os
from urllib.parse import urlparse
import psycopg2

db_url = os.environ["DB_URL"]
parts = urlparse(db_url)
conn = psycopg2.connect(
    dbname=(parts.path or "").lstrip("/"),
    user=parts.username,
    password=parts.password,
    host=parts.hostname,
    port=parts.port,
)
try:
    with conn.cursor() as cur:
        cur.execute("select version_num from alembic_version")
        version = cur.fetchone()
        if not version:
            raise SystemExit("missing alembic version row")

        cur.execute("select count(*) from pg_tables where schemaname = %s and tablename <> %s", ("public", "alembic_version"))
        table_count = cur.fetchone()[0]
        if table_count != 19:
            raise SystemExit(f"expected 19 public app tables, got {table_count}")
finally:
    conn.close()
'
}

echo "mode: ${MODE}"
echo "app_dir: ${APP_DIR}"
echo "db_target: $(mask_db_url "${DB_URL}")"
echo "planned steps:"
echo "- verify ${ALEMBIC_INI}"
echo "- verify ${ALEMBIC_ENV}"
echo "- verify ${ALEMBIC_REV}"
echo "- verify ${APP_PYTHON}"
echo "- run alembic upgrade head with DB_URL scoped to that command"
echo "- verify alembic_version exists"
echo "- verify public app table count = 19"

run_step "alembic.ini exists" check_path_exists "${ALEMBIC_INI}"
run_step "alembic env exists" check_path_exists "${ALEMBIC_ENV}"
run_step "baseline revision exists" check_path_exists "${ALEMBIC_REV}"
run_step "app python exists" check_path_exists "${APP_PYTHON}"

if [[ "${MODE}" != "execute" ]]; then
  echo "status: dry-run only, no DB changes executed"
  echo "overall: PASS"
  exit 0
fi

run_step "alembic upgrade head" run_alembic_upgrade
run_step "db verification" verify_db_state

echo "overall: PASS"
