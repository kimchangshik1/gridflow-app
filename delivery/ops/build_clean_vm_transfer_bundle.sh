#!/usr/bin/env bash
set -euo pipefail

MODE="dry-run"
SOURCE_DIR="$(pwd)"
OUTPUT_DIR=""

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
  "--exclude=_install_render_first_execute/"
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
  "--exclude=*.tmp"
  "--exclude=*.log"
  "--exclude=/tmp/"
  "--exclude=gridflow_first_execute_evidence/"
)

KEY_FILES=(
  "ops/run_clean_vm_live_install.sh"
  "ops/capture_clean_vm_first_execute.sh"
  "ops/prepare_clean_vm_db.sh"
  "ops/templates/install_values.example.json"
  "CLEAN_VM_EXECUTION_PACKET.txt"
  "CLEAN_VM_LIVE_INSTALL.txt"
  "CLEAN_VM_FIRST_EXECUTE_EVIDENCE_RUNBOOK.txt"
)

usage() {
  cat <<'EOF'
Usage:
  bash ops/build_clean_vm_transfer_bundle.sh --output-dir /tmp/gridflow_clean_vm_bundle_out
  bash ops/build_clean_vm_transfer_bundle.sh --source-dir /path/to/repo --output-dir /tmp/gridflow_clean_vm_bundle_out --execute

Behavior:
  default: dry-run only
  --execute: create a tar.gz transfer bundle for clean VM handoff
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-dir)
      SOURCE_DIR="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
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

if [[ -z "$OUTPUT_DIR" ]]; then
  echo "missing required argument: --output-dir" >&2
  usage >&2
  exit 2
fi

SOURCE_DIR="$(realpath "$SOURCE_DIR")"
OUTPUT_DIR="$(realpath -m "$OUTPUT_DIR")"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BUNDLE_PATH="${OUTPUT_DIR}/gridflow_clean_vm_bundle_${TIMESTAMP}.tar.gz"
ROOT_NAME="$(basename "$SOURCE_DIR")"

pass() {
  echo "PASS $1"
}

fail() {
  echo "FAIL $1"
  echo "overall: FAIL"
  exit 1
}

echo "mode: $MODE"
echo "source_dir: $SOURCE_DIR"
echo "output_dir: $OUTPUT_DIR"
echo "bundle_path: $BUNDLE_PATH"
echo "included key files:"
for path in "${KEY_FILES[@]}"; do
  echo "- $path"
done
echo "exclude rules:"
for rule in "${EXCLUDES[@]}"; do
  echo "- ${rule#--exclude=}"
done

[[ -d "$SOURCE_DIR" ]] || fail "source dir missing: $SOURCE_DIR"
pass "source dir exists: $SOURCE_DIR"

for path in "${KEY_FILES[@]}"; do
  [[ -e "$SOURCE_DIR/$path" ]] || fail "key file missing: $path"
done
pass "key files present"

if [[ "$MODE" != "execute" ]]; then
  echo "status: dry-run only, no bundle created"
  echo "overall: PASS"
  exit 0
fi

mkdir -p "$OUTPUT_DIR" || fail "output dir create: $OUTPUT_DIR"
pass "output dir ready: $OUTPUT_DIR"

(
  cd "$(dirname "$SOURCE_DIR")"
  tar -czf "$BUNDLE_PATH" "${EXCLUDES[@]}" "$ROOT_NAME"
) || fail "bundle create: $BUNDLE_PATH"
pass "bundle create: $BUNDLE_PATH"

[[ -f "$BUNDLE_PATH" ]] || fail "bundle missing after create: $BUNDLE_PATH"
pass "bundle exists: $BUNDLE_PATH"

echo "overall: PASS"
