#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/upbit_bot"
BACKUP_DIR="${GRIDFLOW_BACKUP_DIR:-/var/backups/gridflow}"
LOG_FILE="${GRIDFLOW_RESTORE_VERIFY_LOG:-/var/log/gridflow_restore_verify.log}"
VERIFY_DB="gridflow_restore_verify_$(date -u '+%Y%m%d_%H%M%S')"

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"
}

latest_dump="${1:-}"
if [[ -z "$latest_dump" ]]; then
  latest_dump="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'upbit_bot_*.dump' -printf '%T@ %p\n' | sort -nr | awk 'NR==1 {print $2}')"
fi

if [[ -z "$latest_dump" || ! -r "$latest_dump" ]]; then
  log "ERROR readable dump file not found"
  exit 1
fi

touch "$LOG_FILE"
chmod 0640 "$LOG_FILE"

cleanup() {
  sudo -u postgres dropdb --if-exists "$VERIFY_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "START restore_verify dump=${latest_dump} db=${VERIFY_DB}"
sudo -u postgres createdb -O tradingbot "$VERIFY_DB"
sudo -u postgres pg_restore --no-owner --no-acl --dbname="$VERIFY_DB" < "$latest_dump"

table_count="$(sudo -u postgres psql -d "$VERIFY_DB" -Atc "select count(*) from information_schema.tables where table_schema='public';")"
row_summary="$(sudo -u postgres psql -d "$VERIFY_DB" -Atc "select coalesce(sum(n_live_tup), 0)::bigint from pg_stat_user_tables;")"
key_tables="$(sudo -u postgres psql -d "$VERIFY_DB" -Atc "select string_agg(tablename, ', ' order by tablename) from pg_tables where schemaname='public' and tablename in ('users','grid_strategies','grid_orders','planned_orders','activity_logs');")"

log "OK restore_verify tables=${table_count} estimated_rows=${row_summary} key_tables=${key_tables}"
