#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage:"
  echo "  $0 <mysql_dump.sql> <qdrant_backup.tar>"
  echo ""
  echo "Example:"
  echo "  $0 backups/mysql/mysql_20260526_120000.sql backups/qdrant/qdrant_20260526_120000.tar"
  exit 1
fi

MYSQL_DUMP="$1"
QDRANT_TAR="$2"

if [[ ! -f "$MYSQL_DUMP" ]]; then
  echo "ERROR: file not found: $MYSQL_DUMP"
  exit 1
fi
if [[ ! -f "$QDRANT_TAR" ]]; then
  echo "ERROR: file not found: $QDRANT_TAR"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

MYSQL_DB="${MYSQL_DATABASE:-}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE" || true
  MYSQL_DB="${MYSQL_DB:-${MYSQL_DATABASE:-}}"
  MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
fi

if [[ -z "${MYSQL_ROOT_PASSWORD}" ]]; then
  echo "ERROR: MYSQL_ROOT_PASSWORD not set in .env or env."
  exit 1
fi

echo "==> Restoring MySQL from ${MYSQL_DUMP}"
cat "${MYSQL_DUMP}" | docker exec -i mysql_db sh -lc \
  "mysql -uroot -p\"${MYSQL_ROOT_PASSWORD}\""

echo "==> Restoring Qdrant storage from ${QDRANT_TAR}"
echo "    (This will wipe current Qdrant storage directory contents.)"

# Stop qdrant to avoid writing while restoring (recommended)
docker compose stop qdrant_db

# Clear storage + restore tar
docker exec qdrant_db sh -lc "rm -rf /qdrant/storage/*"
cat "${QDRANT_TAR}" | docker exec -i qdrant_db sh -lc "tar -C /qdrant/storage -xf -"

# Start qdrant again
docker compose start qdrant_db

echo "==> Restore complete."