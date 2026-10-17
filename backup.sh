#!/bin/sh
# Tägliches pg_dump in /backups, ältere Dumps als BACKUP_KEEP_DAYS werden gelöscht.
# Manuell auslösen: docker exec weight_training_backup sh /backup.sh once
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

dump() {
  file="/backups/weight_training_$(date +%Y-%m-%d_%H%M%S).dump"
  if pg_dump -Fc -f "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "$(date -Iseconds) Backup erstellt: $file"
  else
    rm -f "$file.tmp"
    echo "$(date -Iseconds) Backup FEHLGESCHLAGEN" >&2
  fi
  find /backups -name 'weight_training_*.dump' -mtime +"$KEEP_DAYS" -delete
}

if [ "${1:-}" = "once" ]; then
  dump
  exit 0
fi

while true; do
  dump
  sleep "$INTERVAL"
done
