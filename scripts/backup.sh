#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MYSQL_OUT="${ROOT_DIR}/backups/mysql/mysql_${TS}.sql"
QDRANT_OUT="${ROOT_DIR}/backups/qdrant/qdrant_${TS}.tar"

# Read DB name + root password from your .env if present
ENV_FILE="${ROOT_DIR}/.env"
MYSQL_DB="${MYSQL_DATABASE:-}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE" || true
  MYSQL_DB="${MYSQL_DB:-${MYSQL_DATABASE:-}}"
  MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
fi

if [[ -z "${MYSQL_DB}" ]]; then
  echo "ERROR: MYSQL_DATABASE not set. Put it in .env or export MYSQL_DATABASE."
  exit 1
fi

if [[ -z "${MYSQL_ROOT_PASSWORD}" ]]; then
  echo "ERROR: MYSQL_ROOT_PASSWORD not set. Put it in .env or export MYSQL_ROOT_PASSWORD."
  exit 1
fi

echo "==> Backing up MySQL database '${MYSQL_DB}' -> ${MYSQL_OUT}"
docker exec mysql_db sh -lc \
  "mysqldump -uroot -p\"${MYSQL_ROOT_PASSWORD}\" --databases \"${MYSQL_DB}\" --single-transaction --quick --lock-tables=false" \
  > "${MYSQL_OUT}"

echo "==> Backing up Qdrant storage volume -> ${QDRANT_OUT}"
# This backs up the whole Qdrant storage directory from the container.
docker exec qdrant_db sh -lc "tar -C /qdrant/storage -cf - ." > "${QDRANT_OUT}"

echo "==> Done."
echo "MySQL:  ${MYSQL_OUT}"
echo "Qdrant: ${QDRANT_OUT}"

# Optional: upload backups to MinIO (if you want)
# Requires: MinIO client 'mc' installed on your host OR do it in a container.
# echo "==> Uploading to MinIO... (optional)"