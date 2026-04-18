#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/upbit_bot"
ENV_FILE="${GRIDFLOW_ENV_FILE:-/etc/gridflow/gridflow.env}"
BACKUP_DIR="${GRIDFLOW_BACKUP_DIR:-/var/backups/gridflow}"
RETENTION_DAYS="${GRIDFLOW_BACKUP_RETENTION_DAYS:-14}"
LOG_FILE="${GRIDFLOW_BACKUP_LOG:-/var/log/gridflow_backup.log}"
LOCK_FILE="/run/gridflow_pg_backup.lock"

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"
}

if [[ ! -r "$ENV_FILE" ]]; then
  log "ERROR env file is not readable: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [[ -z "${DB_URL:-}" ]]; then
  log "ERROR DB_URL is not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 0750 "$BACKUP_DIR"
touch "$LOG_FILE"
chmod 0640 "$LOG_FILE"

(
  flock -n 9 || {
    log "ERROR another backup is already running"
    exit 1
  }

  stamp="$(date -u '+%Y%m%d_%H%M%S')"
  out="${BACKUP_DIR}/upbit_bot_${stamp}.dump"
  tmp="${out}.tmp"

  log "START backup target=${out}"
  pg_dump --format=custom --no-owner --no-acl --file="$tmp" "$DB_URL"
  chmod 0640 "$tmp"
  mv "$tmp" "$out"
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'upbit_bot_*.dump' -mtime +"$RETENTION_DAYS" -delete
  log "OK backup file=${out}"
) 9>"$LOCK_FILE"
