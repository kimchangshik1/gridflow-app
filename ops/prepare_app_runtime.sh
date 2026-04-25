#!/usr/bin/env bash
set -euo pipefail

EXECUTE=false
APP_DIR=""
PYTHON_BIN="python3"
FAILURES=0

usage() {
  cat <<'EOF'
Usage:
  bash ops/prepare_app_runtime.sh --app-dir /path/to/app
  bash ops/prepare_app_runtime.sh --app-dir /path/to/app --python-bin /usr/bin/python3.12
  bash ops/prepare_app_runtime.sh --app-dir /path/to/app --execute

Behavior:
  default: dry-run only
  --execute: create venv, install requirements, verify runtime
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir)
      APP_DIR="${2:-}"
      shift 2
      ;;
    --python-bin)
      PYTHON_BIN="${2:-}"
      shift 2
      ;;
    --execute)
      EXECUTE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$APP_DIR" ]]; then
  echo "FAIL arg --app-dir: required"
  echo "overall: FAIL"
  exit 1
fi

REQ_FILE="${APP_DIR}/requirements-web.txt"
VENV_DIR="${APP_DIR}/venv"
VENV_PY3="${VENV_DIR}/bin/python3"
VENV_PY="${VENV_DIR}/bin/python"
PIP_BIN="${VENV_DIR}/bin/pip"

pass() {
  echo "PASS $1"
}

fail() {
  echo "FAIL $1"
  FAILURES=$((FAILURES + 1))
}

echo "mode: $([[ \"$EXECUTE\" == \"true\" ]] && echo execute || echo dry-run)"
echo "app_dir: $APP_DIR"
echo "python_bin: $PYTHON_BIN"
echo "planned steps:"
echo "- verify app dir exists"
echo "- verify requirements-web.txt exists"
echo "- create venv at ${VENV_DIR}"
echo "- install packages with ${PIP_BIN} install -r ${REQ_FILE}"
echo "- verify ${VENV_PY3} or ${VENV_PY} is executable"

if [[ "$EXECUTE" != "true" ]]; then
  echo "status: dry-run only, no files modified"
  exit 0
fi

if [[ -d "$APP_DIR" ]]; then
  pass "app-dir exists: ${APP_DIR}"
else
  fail "app-dir exists: ${APP_DIR}"
fi

if [[ -f "$REQ_FILE" ]]; then
  pass "requirements exists: ${REQ_FILE}"
else
  fail "requirements exists: ${REQ_FILE}"
fi

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  fail "python-bin available: ${PYTHON_BIN}"
fi

if (( FAILURES > 0 )); then
  echo "overall: FAIL"
  exit 1
fi

if "$PYTHON_BIN" -m venv "$VENV_DIR"; then
  pass "venv create: ${VENV_DIR}"
else
  fail "venv create: ${VENV_DIR}"
fi

if (( FAILURES > 0 )); then
  echo "overall: FAIL"
  exit 1
fi

if "$PIP_BIN" install -r "$REQ_FILE"; then
  pass "pip install: ${REQ_FILE}"
else
  fail "pip install: ${REQ_FILE}"
fi

RUNTIME_BIN=""
if [[ -x "$VENV_PY3" ]]; then
  RUNTIME_BIN="$VENV_PY3"
elif [[ -x "$VENV_PY" ]]; then
  RUNTIME_BIN="$VENV_PY"
fi

if [[ -n "$RUNTIME_BIN" ]]; then
  pass "runtime python executable: ${RUNTIME_BIN}"
else
  fail "runtime python executable: ${VENV_PY3} or ${VENV_PY}"
fi

if (( FAILURES > 0 )); then
  echo "overall: FAIL"
  exit 1
fi

echo "overall: PASS"
