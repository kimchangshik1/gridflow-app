#!/usr/bin/env bash
set -euo pipefail

EXECUTE=false
FAILURES=0

usage() {
  cat <<'EOF'
Usage:
  bash ops/post_install_smoke_check.sh
  bash ops/post_install_smoke_check.sh --execute

Behavior:
  default: dry-run only
  --execute: run read-only smoke checks
EOF
}

for arg in "$@"; do
  case "$arg" in
    --execute)
      EXECUTE=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

checks=(
  "systemctl is-enabled gridflow-app.service upbit-bot.service orderlens-ops.service"
  "systemctl is-active gridflow-app.service upbit-bot.service orderlens-ops.service"
  "systemctl is-enabled gridflow-pg-backup.timer gridflow-health-alert.timer"
  "systemctl is-active gridflow-pg-backup.timer gridflow-health-alert.timer"
  "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/"
  "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8010/monitor"
)

echo "mode: $([[ \"$EXECUTE\" == \"true\" ]] && echo execute || echo dry-run)"
echo "planned smoke checks:"
for check in "${checks[@]}"; do
  echo "- $check"
done

if [[ "$EXECUTE" != "true" ]]; then
  echo "status: dry-run only, no live checks executed"
  exit 0
fi

pass() {
  echo "PASS $1"
}

fail() {
  echo "FAIL $1"
  FAILURES=$((FAILURES + 1))
}

check_systemctl_expect_all() {
  local label="$1"
  local expected="$2"
  shift 2
  local cmd=(systemctl "$@")
  local output
  if ! output="$("${cmd[@]}" 2>&1)"; then
    fail "${label}: command error: ${output}"
    return
  fi

  local bad=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if [[ "$line" != "$expected" ]]; then
      bad=1
      break
    fi
  done <<< "$output"

  if (( bad == 0 )); then
    pass "${label}: ${expected}"
  else
    fail "${label}: expected all=${expected}, got=$(printf '%s' "$output" | tr '\n' ',' | sed 's/,$//')"
  fi
}

check_http_code() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local code
  if ! code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)"; then
    fail "${label}: curl error"
    return
  fi
  if [[ "$code" == "$expected" ]]; then
    pass "${label}: ${code}"
  else
    fail "${label}: expected ${expected}, got ${code}"
  fi
}

check_systemctl_expect_all "service enabled" "enabled" is-enabled gridflow-app.service upbit-bot.service orderlens-ops.service
check_systemctl_expect_all "service active" "active" is-active gridflow-app.service upbit-bot.service orderlens-ops.service
check_systemctl_expect_all "timer enabled" "enabled" is-enabled gridflow-pg-backup.timer gridflow-health-alert.timer
check_systemctl_expect_all "timer active" "active" is-active gridflow-pg-backup.timer gridflow-health-alert.timer
check_http_code "local app GET /" "http://127.0.0.1:8000/" "200"
check_http_code "local monitor GET /monitor" "http://127.0.0.1:8010/monitor" "302"

if (( FAILURES > 0 )); then
  echo "status: failed checks=${FAILURES}"
  exit 1
fi

echo "status: all checks passed"
