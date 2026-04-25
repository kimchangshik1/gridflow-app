#!/usr/bin/env bash
set -euo pipefail

MODE="dry-run"
SOURCE_DIR="$(pwd)"
TARGET_APP_DIR=""
VALUES_JSON=""
TARGET_ROOT="/"
ALLOW_LIVE_ROOT=0
ALLOW_NON_CLEAN_HOST=0

usage() {
  cat <<'EOF'
Usage:
  bash ops/run_clean_vm_live_install.sh \
    --values <json> \
    --target-app-dir <path> \
    [--source-dir <path>] \
    [--target-root <path>] \
    [--allow-live-root] \
    [--allow-non-clean-host] \
    [--execute]

Notes:
  - default mode is dry-run
  - --execute runs the first-execute wrapper, then activation, then smoke
  - target-root=/ is blocked unless --allow-live-root is also set
  - --execute is blocked on non-clean hosts unless --allow-non-clean-host is set
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --values)
      VALUES_JSON="${2:-}"
      shift 2
      ;;
    --target-app-dir)
      TARGET_APP_DIR="${2:-}"
      shift 2
      ;;
    --source-dir)
      SOURCE_DIR="${2:-}"
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
    --allow-non-clean-host)
      ALLOW_NON_CLEAN_HOST=1
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

if [[ -z "$VALUES_JSON" || -z "$TARGET_APP_DIR" ]]; then
  echo "missing required arguments" >&2
  usage >&2
  exit 2
fi

if [[ "$TARGET_ROOT" == "/" && "$ALLOW_LIVE_ROOT" -ne 1 ]]; then
  echo "target-root=/ is blocked; pass --allow-live-root to override" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

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

check_clean_vm_guard() {
  local traces=()

  [[ -e /etc/gridflow ]] && traces+=("/etc/gridflow")
  [[ -e /etc/systemd/system/gridflow-app.service ]] && traces+=("/etc/systemd/system/gridflow-app.service")
  [[ -e /etc/systemd/system/upbit-bot.service ]] && traces+=("/etc/systemd/system/upbit-bot.service")
  [[ -e /etc/systemd/system/orderlens-ops.service ]] && traces+=("/etc/systemd/system/orderlens-ops.service")
  [[ -e /etc/nginx/sites-available/gridflow ]] && traces+=("/etc/nginx/sites-available/gridflow")
  [[ -e "${TARGET_APP_DIR}" ]] && traces+=("${TARGET_APP_DIR}")

  if (( ${#traces[@]} == 0 )); then
    echo "clean-vm-guard: no blocking traces found"
    return 0
  fi

  echo "clean-vm-guard: non-clean host traces detected:" >&2
  printf '%s\n' "${traces[@]}" >&2
  return 1
}

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

load_db_url_from_values() {
  local output_var="$1"
  local value

  value="$(python3 -c "import json, pathlib; print(json.loads(pathlib.Path('${VALUES_JSON}').read_text())['DB_URL'])")"
  printf -v "$output_var" '%s' "$value"
}

get_masked_db_url_from_values() {
  local value
  load_db_url_from_values value
  mask_db_url "$value"
}

run_first_execute() {
  local cmd=(
    bash "${ROOT_DIR}/ops/clean_install_first_execute.sh"
    --source-dir "${SOURCE_DIR}"
    --target-app-dir "${TARGET_APP_DIR}"
    --values "${VALUES_JSON}"
    --target-root "${TARGET_ROOT}"
  )
  if [[ "$ALLOW_LIVE_ROOT" -eq 1 ]]; then
    cmd+=(--allow-live-root)
  fi
  if [[ "$MODE" == "execute" ]]; then
    cmd+=(--execute)
  fi
  "${cmd[@]}"
}

run_activation() {
  local script_path="${TARGET_APP_DIR}/ops/post_install_activate.sh"
  if [[ ! -f "$script_path" ]]; then
    script_path="${ROOT_DIR}/ops/post_install_activate.sh"
  fi

  if [[ "$MODE" == "execute" ]]; then
    bash "$script_path" --execute
  else
    bash "$script_path"
  fi
}

run_prepare_db() {
  local db_url
  load_db_url_from_values db_url
  local script_path="${TARGET_APP_DIR}/ops/prepare_clean_vm_db.sh"
  if [[ ! -f "$script_path" ]]; then
    script_path="${ROOT_DIR}/ops/prepare_clean_vm_db.sh"
  fi

  if [[ "$MODE" == "execute" ]]; then
    bash "$script_path" --app-dir "${TARGET_APP_DIR}" --db-url "${db_url}" --execute
  else
    bash "$script_path" --app-dir "${TARGET_APP_DIR}" --db-url "${db_url}"
  fi
}

run_smoke() {
  local script_path="${TARGET_APP_DIR}/ops/post_install_smoke_check.sh"
  if [[ ! -f "$script_path" ]]; then
    script_path="${ROOT_DIR}/ops/post_install_smoke_check.sh"
  fi

  if [[ "$MODE" == "execute" ]]; then
    bash "$script_path" --execute
  else
    bash "$script_path"
  fi
}

echo "mode: ${MODE}"
echo "source_dir: ${SOURCE_DIR}"
echo "target_app_dir: ${TARGET_APP_DIR}"
echo "values: ${VALUES_JSON}"
echo "db_target: $(get_masked_db_url_from_values)"
echo "target_root: ${TARGET_ROOT}"
  if [[ "$ALLOW_LIVE_ROOT" -eq 1 ]]; then
    echo "allow_live_root: yes"
else
    echo "allow_live_root: no"
fi
if [[ "$ALLOW_NON_CLEAN_HOST" -eq 1 ]]; then
  echo "allow_non_clean_host: yes"
else
  echo "allow_non_clean_host: no"
fi
echo "execution order:"
echo "- clean_install_first_execute.sh"
echo "- prepare_clean_vm_db.sh"
echo "- post_install_activate.sh"
echo "- post_install_smoke_check.sh"

if [[ "$MODE" == "execute" && "$ALLOW_NON_CLEAN_HOST" -ne 1 ]]; then
  run_step "clean_vm_guard" check_clean_vm_guard
fi

run_step "clean_install_first_execute" run_first_execute
run_step "prepare_clean_vm_db" run_prepare_db
run_step "post_install_activate" run_activation
run_step "post_install_smoke_check" run_smoke

echo "overall: PASS"
