#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GRIDFLOW_ALERT_ENV_FILE:-${GRIDFLOW_ENV_FILE:-/etc/gridflow/gridflow.env}}"
LOG_FILE="${GRIDFLOW_ALERT_LOG:-/var/log/gridflow_alert.log}"
STATE_DIR="${GRIDFLOW_ALERT_STATE_DIR:-/var/lib/gridflow}"
STATE_FILE="${STATE_DIR}/health_alert.last"
PUSH_STATE_FILE="${STATE_DIR}/health_alert.push.last"
PUSH_COOLDOWN_SECONDS="${GRIDFLOW_ALERT_PUSH_COOLDOWN_SECONDS:-1800}"
WEBHOOK_URL="${GRIDFLOW_ALERT_WEBHOOK_URL:-${DISCORD_WEBHOOK_URL:-}}"
HOST="$(hostname -f 2>/dev/null || hostname)"

SERVICES=(
  "gridflow-app.service"
  "orderlens-ops.service"
  "upbit-bot.service"
  "nginx.service"
  "postgresql@16-main.service"
)

ENDPOINTS=(
  "app:http://127.0.0.1:8000/"
  "monitor:http://127.0.0.1:8010/monitor"
)

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  WEBHOOK_URL="${GRIDFLOW_ALERT_WEBHOOK_URL:-${DISCORD_WEBHOOK_URL:-${WEBHOOK_URL:-}}}"
fi

mkdir -p "$STATE_DIR"
touch "$LOG_FILE"
chmod 0640 "$LOG_FILE"

problems=()
problem_keys=()

json_escape() {
  sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'
}

send_webhook_alert() {
  local text="$1"
  [[ -n "${WEBHOOK_URL:-}" ]] || return 0

  local payload
  payload="$(printf '{"content":"%s"}' "$(printf '%s' "$text" | json_escape)")"

  curl -fsS --max-time 10 \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    "$WEBHOOK_URL" >/dev/null
}

for svc in "${SERVICES[@]}"; do
  active="$(systemctl is-active "$svc" 2>/dev/null || true)"
  substate="$(systemctl show -p SubState --value "$svc" 2>/dev/null || true)"
  if [[ "$active" != "active" ]]; then
    problems+=("service ${svc} active=${active:-unknown} substate=${substate:-unknown}")
    problem_keys+=("service:${svc}")
  fi
done

for item in "${ENDPOINTS[@]}"; do
  name="${item%%:*}"
  url="${item#*:}"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)"
  if [[ -z "$code" || "$code" == "000" ]]; then
    problems+=("endpoint ${name} unreachable url=${url}")
    problem_keys+=("endpoint:${name}")
  fi
done

if (( ${#problems[@]} == 0 )); then
  printf 'OK %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$STATE_FILE"
  exit 0
fi

msg="GridFlow health alert on ${HOST}: ${problems[*]}"
last="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [[ "$last" != "$msg" ]]; then
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$msg" | tee -a "$LOG_FILE"
  logger -p daemon.err -t gridflow-health "$msg"
  printf '%s\n' "$msg" > "$STATE_FILE"
fi

if (( ${#problem_keys[@]} > 0 )); then
  failure_key="$(
    printf '%s\n' "${problem_keys[@]}" | sort -u | sha256sum | awk '{print $1}'
  )"
  now_epoch="$(date -u '+%s')"
  last_push_key=""
  last_push_epoch=0

  if [[ -f "$PUSH_STATE_FILE" ]]; then
    read -r last_push_key last_push_epoch < "$PUSH_STATE_FILE" || true
  fi

  if [[ "$failure_key" != "$last_push_key" ]] || (( now_epoch - last_push_epoch >= PUSH_COOLDOWN_SECONDS )); then
    if send_webhook_alert "$msg"; then
      printf '%s %s\n' "$failure_key" "$now_epoch" > "$PUSH_STATE_FILE"
    else
      printf '%s webhook delivery failed\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> "$LOG_FILE"
    fi
  fi
fi

exit 2
