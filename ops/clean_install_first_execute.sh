#!/usr/bin/env bash
set -euo pipefail

MODE="dry-run"
SOURCE_DIR="$(pwd)"
TARGET_APP_DIR=""
VALUES_JSON=""
TARGET_ROOT=""
ALLOW_LIVE_ROOT=0

usage() {
  cat <<'EOF'
Usage:
  bash ops/clean_install_first_execute.sh \
    --target-app-dir <path> \
    --values <json> \
    --target-root <path> \
    [--source-dir <path>] \
    [--allow-live-root] \
    [--execute]

Notes:
  - default mode is dry-run
  - --execute performs deploy/runtime/preflight/render/apply/permissions
  - activation and smoke steps stay in dry-run mode even with --execute
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-dir)
      SOURCE_DIR="${2:-}"
      shift 2
      ;;
    --target-app-dir)
      TARGET_APP_DIR="${2:-}"
      shift 2
      ;;
    --values)
      VALUES_JSON="${2:-}"
      shift 2
      ;;
    --target-root)
      TARGET_ROOT="${2:-}"
      shift 2
      ;;
    --allow-live-root)
      ALLOW_LIVE_ROOT=1
      shift
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

if [[ -z "$TARGET_APP_DIR" || -z "$VALUES_JSON" || -z "$TARGET_ROOT" ]]; then
  echo "missing required arguments" >&2
  usage >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RENDER_DIR="${TARGET_APP_DIR}/_install_render_first_execute"
STAGED_VALUES_JSON="${TARGET_APP_DIR}/ops/.clean_install_first_execute.values.json"

step_pass() {
  printf 'PASS %s\n' "$1"
}

step_fail() {
  printf 'FAIL %s\n' "$1" >&2
  printf 'overall: FAIL\n' >&2
  exit 1
}

step_plan() {
  local step_name="$1"
  local detail="$2"
  printf 'PASS %s: planned-only (%s)\n' "$step_name" "$detail"
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

run_apply_permissions_execute() {
  local cmd=(python3 "${TARGET_APP_DIR}/ops/apply_install_permissions.py" --target-root "${TARGET_ROOT}")
  if [[ "$ALLOW_LIVE_ROOT" -eq 1 ]]; then
    cmd+=(--allow-live-root)
  fi
  sudo -n "${cmd[@]}"
}

stage_values_into_target() {
  python3 - "$VALUES_JSON" "$STAGED_VALUES_JSON" <<'PY'
import json
import pathlib
import sys

src = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])
data = json.loads(src.read_text())
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(json.dumps(data, indent=2) + "\n")
PY
}

echo "mode: ${MODE}"
echo "source_dir: ${SOURCE_DIR}"
echo "target_app_dir: ${TARGET_APP_DIR}"
echo "values: ${VALUES_JSON}"
echo "target_root: ${TARGET_ROOT}"
echo "render_dir: ${RENDER_DIR}"
echo "staged_values: ${STAGED_VALUES_JSON}"
if [[ "$ALLOW_LIVE_ROOT" -eq 1 ]]; then
  echo "allow_live_root: yes"
else
  echo "allow_live_root: no"
fi

if [[ "$MODE" == "dry-run" ]]; then
  run_step "deploy_source_tree" \
    bash "${ROOT_DIR}/ops/deploy_source_tree.sh" \
      --source-dir "${SOURCE_DIR}" \
      --target-app-dir "${TARGET_APP_DIR}"

  run_step "prepare_app_runtime" \
    bash "${ROOT_DIR}/ops/prepare_app_runtime.sh" \
      --app-dir "${TARGET_APP_DIR}"

  run_step "pre_install_preflight_input" \
    python3 -c "import json, pathlib; json.loads(pathlib.Path('${VALUES_JSON}').read_text())"
  step_plan "pre_install_preflight" "target APP_DIR and VENV_PYTHON are materialized by execute path"
  step_plan "render_install_payload" "render requires a real output tree under the deployed source root"
  step_plan "apply_install_payload" "apply requires rendered payload artifacts"
  step_plan "apply_install_permissions" "permission apply requires rendered files under target root"

  run_step "post_install_activate_dry_run" \
    bash "${ROOT_DIR}/ops/post_install_activate.sh"

  run_step "post_install_smoke_check_dry_run" \
    bash "${ROOT_DIR}/ops/post_install_smoke_check.sh"
else
  run_step "deploy_source_tree" \
    bash "${ROOT_DIR}/ops/deploy_source_tree.sh" \
      --source-dir "${SOURCE_DIR}" \
      --target-app-dir "${TARGET_APP_DIR}" \
      --execute

  run_step "prepare_app_runtime" \
    bash "${TARGET_APP_DIR}/ops/prepare_app_runtime.sh" \
      --app-dir "${TARGET_APP_DIR}" \
      --execute

  run_step "stage_values_for_target" stage_values_into_target

  run_step "pre_install_preflight" \
    python3 "${TARGET_APP_DIR}/ops/pre_install_preflight.py" \
      --values "${STAGED_VALUES_JSON}"

  run_step "render_install_payload" \
    python3 "${TARGET_APP_DIR}/ops/render_install_payload.py" \
      --values "${STAGED_VALUES_JSON}" \
      --output-dir "${RENDER_DIR}"

  APPLY_PAYLOAD_CMD=(
    python3 "${TARGET_APP_DIR}/ops/apply_install_payload.py"
    --source-root "${RENDER_DIR}"
    --target-root "${TARGET_ROOT}"
  )
  if [[ "$ALLOW_LIVE_ROOT" -eq 1 ]]; then
    APPLY_PAYLOAD_CMD+=(--allow-live-root)
  fi
  run_step "apply_install_payload" "${APPLY_PAYLOAD_CMD[@]}"

  run_step "apply_install_permissions" run_apply_permissions_execute

  run_step "post_install_activate_dry_run" \
    bash "${TARGET_APP_DIR}/ops/post_install_activate.sh"

  run_step "post_install_smoke_check_dry_run" \
    bash "${TARGET_APP_DIR}/ops/post_install_smoke_check.sh"
fi

echo "overall: PASS"
