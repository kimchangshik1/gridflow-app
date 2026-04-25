#!/usr/bin/env bash
set -euo pipefail

EXECUTE=false
TARGET_APP_DIR=""
SOURCE_DIR="$(pwd)"
FAILURES=0

EXCLUDES=(
  "--exclude=.git/"
  "--exclude=venv/"
  "--exclude=__pycache__/"
  "--exclude=*.pyc"
  "--exclude=.pytest_cache/"
  "--exclude=.mypy_cache/"
  "--exclude=_install_render/"
  "--exclude=_install_render_rehearsal/"
  "--exclude=_install_render_ops_assets/"
  "--exclude=_install_render_full_rehearsal/"
  "--exclude=bot.log"
  "--exclude=bot.log.*"
  "--exclude=monitor.log"
  "--exclude=monitor.log.*"
  "--exclude=monitor_8010.log"
  "--exclude=monitor_8010.log.*"
  "--exclude=monitor_uvicorn.log"
  "--exclude=monitor_uvicorn.log.*"
  "--exclude=nohup.out"
  "--exclude=nohup.out.*"
)

usage() {
  cat <<'EOF'
Usage:
  bash ops/deploy_source_tree.sh --target-app-dir /path/to/app
  bash ops/deploy_source_tree.sh --target-app-dir /path/to/app --source-dir /path/to/source
  bash ops/deploy_source_tree.sh --target-app-dir /path/to/app --execute

Behavior:
  default: dry-run only
  --execute: deploy source tree with rsync
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-app-dir)
      TARGET_APP_DIR="${2:-}"
      shift 2
      ;;
    --source-dir)
      SOURCE_DIR="${2:-}"
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

if [[ -z "$TARGET_APP_DIR" ]]; then
  echo "FAIL arg --target-app-dir: required"
  echo "overall: FAIL"
  exit 1
fi

SOURCE_DIR="$(realpath "$SOURCE_DIR")"
TARGET_APP_DIR="$(realpath -m "$TARGET_APP_DIR")"

pass() {
  echo "PASS $1"
}

fail() {
  echo "FAIL $1"
  FAILURES=$((FAILURES + 1))
}

echo "mode: $([[ \"$EXECUTE\" == \"true\" ]] && echo execute || echo dry-run)"
echo "source_dir: $SOURCE_DIR"
echo "target_app_dir: $TARGET_APP_DIR"
echo "exclude rules:"
for rule in "${EXCLUDES[@]}"; do
  echo "- ${rule#--exclude=}"
done
echo "planned steps:"
echo "- verify source dir exists"
echo "- verify rsync exists"
echo "- create target parent dir"
echo "- rsync source tree into target app dir"

if [[ "$EXECUTE" != "true" ]]; then
  echo "status: dry-run only, no files modified"
  exit 0
fi

if [[ -d "$SOURCE_DIR" ]]; then
  pass "source dir exists: $SOURCE_DIR"
else
  fail "source dir exists: $SOURCE_DIR"
fi

if command -v rsync >/dev/null 2>&1; then
  pass "rsync available: $(command -v rsync)"
else
  fail "rsync available"
fi

if (( FAILURES > 0 )); then
  echo "overall: FAIL"
  exit 1
fi

if mkdir -p "$(dirname "$TARGET_APP_DIR")"; then
  pass "target parent ready: $(dirname "$TARGET_APP_DIR")"
else
  fail "target parent ready: $(dirname "$TARGET_APP_DIR")"
fi

if (( FAILURES > 0 )); then
  echo "overall: FAIL"
  exit 1
fi

if rsync -a "${EXCLUDES[@]}" "$SOURCE_DIR"/ "$TARGET_APP_DIR"/; then
  pass "rsync deploy: $TARGET_APP_DIR"
else
  fail "rsync deploy: $TARGET_APP_DIR"
fi

if [[ -f "$TARGET_APP_DIR/requirements-web.txt" ]] && [[ -d "$TARGET_APP_DIR/app" ]] && [[ -d "$TARGET_APP_DIR/ops" ]]; then
  pass "deployed source shape verified: requirements-web.txt, app/, ops/"
else
  fail "deployed source shape verified: requirements-web.txt, app/, ops/"
fi

if (( FAILURES > 0 )); then
  echo "overall: FAIL"
  exit 1
fi

echo "overall: PASS"
