#!/usr/bin/env bash
set -euo pipefail

EXECUTE=false

usage() {
  cat <<'EOF'
Usage:
  bash ops/post_install_activate.sh
  bash ops/post_install_activate.sh --execute

Behavior:
  default: dry-run only
  --execute: run activation commands
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

commands=(
  "systemctl daemon-reload"
  "systemctl enable gridflow-app.service upbit-bot.service orderlens-ops.service"
  "systemctl enable gridflow-pg-backup.timer gridflow-health-alert.timer"
  "systemctl restart gridflow-app.service upbit-bot.service orderlens-ops.service"
  "systemctl start gridflow-pg-backup.timer gridflow-health-alert.timer"
  "nginx -t"
  "systemctl reload nginx"
)

mode="dry-run"
if [[ "$EXECUTE" == "true" ]]; then
  mode="execute"
fi

echo "mode: $mode"
echo "activation commands:"
for cmd in "${commands[@]}"; do
  echo "- $cmd"
done

if [[ "$EXECUTE" != "true" ]]; then
  echo "status: dry-run only, no live commands executed"
  exit 0
fi

for cmd in "${commands[@]}"; do
  echo "+ $cmd"
  eval "$cmd"
done

echo "status: completed"
