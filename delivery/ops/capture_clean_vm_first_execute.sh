#!/usr/bin/env bash
set -euo pipefail

MODE="dry-run"
SOURCE_DIR="$(pwd)"
TARGET_APP_DIR=""
VALUES_JSON=""
TARGET_ROOT="/"
ALLOW_LIVE_ROOT=0
ALLOW_NON_CLEAN_HOST=0
EVIDENCE_DIR=""

usage() {
  cat <<'EOF'
Usage:
  bash ops/capture_clean_vm_first_execute.sh \
    --values <json> \
    --target-app-dir <path> \
    --evidence-dir <path> \
    [--source-dir <path>] \
    [--target-root <path>] \
    [--allow-live-root] \
    [--allow-non-clean-host] \
    [--execute]

Notes:
  - default mode is dry-run
  - --execute runs install, then collects read-only evidence files
  - target-root=/ is blocked unless --allow-live-root is also set
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
    --evidence-dir)
      EVIDENCE_DIR="${2:-}"
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

if [[ -z "$VALUES_JSON" || -z "$TARGET_APP_DIR" || -z "$EVIDENCE_DIR" ]]; then
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
RUN_LOG="${EVIDENCE_DIR}/run_clean_vm_live_install.log"
SYSTEMD_STATUS="${EVIDENCE_DIR}/systemd_status.txt"
HTTP_CHECKS="${EVIDENCE_DIR}/http_checks.txt"
NGINX_TEST="${EVIDENCE_DIR}/nginx_test.txt"
FILE_INVENTORY="${EVIDENCE_DIR}/file_inventory.txt"
SUMMARY_FILE="${EVIDENCE_DIR}/CLEAN_VM_FIRST_EXECUTE_EVIDENCE.txt"

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

run_install_wrapper() {
  local cmd=(
    bash "${ROOT_DIR}/ops/run_clean_vm_live_install.sh"
    --values "${VALUES_JSON}"
    --target-app-dir "${TARGET_APP_DIR}"
    --source-dir "${SOURCE_DIR}"
    --target-root "${TARGET_ROOT}"
  )
  if [[ "$ALLOW_LIVE_ROOT" -eq 1 ]]; then
    cmd+=(--allow-live-root)
  fi
  if [[ "$ALLOW_NON_CLEAN_HOST" -eq 1 ]]; then
    cmd+=(--allow-non-clean-host)
  fi
  if [[ "$MODE" == "execute" ]]; then
    cmd+=(--execute)
    mkdir -p "${EVIDENCE_DIR}"
    "${cmd[@]}" 2>&1 | tee "${RUN_LOG}"
  else
    "${cmd[@]}"
  fi
}

collect_systemd_status() {
  {
    echo "systemctl is-enabled"
    systemctl is-enabled gridflow-app.service upbit-bot.service orderlens-ops.service gridflow-pg-backup.timer gridflow-health-alert.timer
    echo
    echo "systemctl is-active"
    systemctl is-active gridflow-app.service upbit-bot.service orderlens-ops.service gridflow-pg-backup.timer gridflow-health-alert.timer
  } > "${SYSTEMD_STATUS}" 2>&1
}

collect_http_checks() {
  {
    echo "GET http://127.0.0.1:8000/"
    curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/
    echo "GET http://127.0.0.1:8010/monitor"
    curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8010/monitor
  } > "${HTTP_CHECKS}" 2>&1
}

collect_nginx_test() {
  nginx -t > "${NGINX_TEST}" 2>&1
}

collect_file_inventory() {
  {
    printf 'target_app_dir=%s\n' "${TARGET_APP_DIR}"
    printf 'target_root=%s\n' "${TARGET_ROOT}"
    for path in \
      "${TARGET_APP_DIR}" \
      "${TARGET_APP_DIR}/venv/bin/python3" \
      "${TARGET_ROOT}/etc/gridflow/gridflow.env" \
      "${TARGET_ROOT}/etc/gridflow/monitor_config.json" \
      "${TARGET_ROOT}/etc/gridflow/monitor_auth.json" \
      "${TARGET_ROOT}/etc/systemd/system/gridflow-app.service" \
      "${TARGET_ROOT}/etc/systemd/system/upbit-bot.service" \
      "${TARGET_ROOT}/etc/systemd/system/orderlens-ops.service" \
      "${TARGET_ROOT}/etc/systemd/system/gridflow-pg-backup.timer" \
      "${TARGET_ROOT}/etc/systemd/system/gridflow-health-alert.timer" \
      "${TARGET_ROOT}/etc/nginx/sites-available/gridflow"; do
      if [[ -e "$path" ]]; then
        printf 'PASS exists %s\n' "$path"
      else
        printf 'FAIL missing %s\n' "$path"
      fi
    done
  } > "${FILE_INVENTORY}" 2>&1
}

write_summary() {
  local db_bootstrap_summary="not collected"
  if [[ -f "${RUN_LOG}" ]]; then
    db_bootstrap_summary="$(grep -E 'PASS prepare_clean_vm_db|PASS alembic upgrade head|PASS db verification' "${RUN_LOG}" || true)"
    if [[ -z "${db_bootstrap_summary}" ]]; then
      db_bootstrap_summary="prepare_clean_vm_db result not found in run log"
    fi
  fi

  cat > "${SUMMARY_FILE}" <<EOF
Clean VM First Execute Evidence
mode: ${MODE}
values: ${VALUES_JSON}
source_dir: ${SOURCE_DIR}
target_app_dir: ${TARGET_APP_DIR}
target_root: ${TARGET_ROOT}
evidence_dir: ${EVIDENCE_DIR}

Saved files
- ${RUN_LOG}
- ${SYSTEMD_STATUS}
- ${HTTP_CHECKS}
- ${NGINX_TEST}
- ${FILE_INVENTORY}
- ${SUMMARY_FILE}

DB bootstrap evidence
${db_bootstrap_summary}

Collection order
1. run_clean_vm_live_install.sh
2. prepare_clean_vm_db.sh result captured inside run_clean_vm_live_install.log
3. systemctl is-enabled/is-active
4. curl local endpoints
5. nginx -t
6. target app dir and target root file inventory
EOF
}

echo "mode: ${MODE}"
echo "source_dir: ${SOURCE_DIR}"
echo "target_app_dir: ${TARGET_APP_DIR}"
echo "values: ${VALUES_JSON}"
echo "target_root: ${TARGET_ROOT}"
echo "evidence_dir: ${EVIDENCE_DIR}"
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
echo "planned evidence files:"
echo "- ${RUN_LOG}"
echo "- ${SYSTEMD_STATUS}"
echo "- ${HTTP_CHECKS}"
echo "- ${NGINX_TEST}"
echo "- ${FILE_INVENTORY}"
echo "- ${SUMMARY_FILE}"

if [[ "$MODE" != "execute" ]]; then
  echo "planned steps:"
  echo "- run_clean_vm_live_install.sh"
  echo "- capture DB bootstrap evidence from run_clean_vm_live_install.log"
  echo "- collect systemctl is-enabled/is-active"
  echo "- collect curl HTTP checks"
  echo "- collect nginx -t"
  echo "- collect target file inventory"
  echo "status: dry-run only, no live commands executed"
  echo "overall: PASS"
  exit 0
fi

run_step "run_clean_vm_live_install" run_install_wrapper
run_step "collect_systemd_status" collect_systemd_status
run_step "collect_http_checks" collect_http_checks
run_step "collect_nginx_test" collect_nginx_test
run_step "collect_file_inventory" collect_file_inventory
run_step "write_summary" write_summary

echo "overall: PASS"
