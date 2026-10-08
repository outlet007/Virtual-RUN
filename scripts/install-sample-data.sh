#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
SUPABASE_DIR="${1:-/webserver/supabase-project}"
SEED_FILE="${APP_DIR}/supabase/sample-data/virtual-run-v3.8.sql"

if [[ ! -r "${SEED_FILE}" ]]; then
  echo "ERROR: sample data file is not readable: ${SEED_FILE}" >&2
  exit 1
fi

if [[ ! -d "${SUPABASE_DIR}" ]]; then
  echo "ERROR: Supabase project directory was not found: ${SUPABASE_DIR}" >&2
  echo "Usage: $0 /path/to/supabase-project" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker command was not found." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 is required." >&2
  exit 1
fi

if ! (cd "${SUPABASE_DIR}" && docker compose config --services) | grep -qx 'db'; then
  echo "ERROR: Docker Compose service 'db' was not found in ${SUPABASE_DIR}." >&2
  exit 1
fi

if ! (cd "${SUPABASE_DIR}" && docker compose ps --status running --services) | grep -qx 'db'; then
  echo "ERROR: Supabase database service 'db' is not running." >&2
  echo "Start the existing Supabase stack before installing sample data." >&2
  exit 1
fi

echo "Installing synthetic Virtual RUN sample data..."
(
  cd "${SUPABASE_DIR}"
  docker compose exec -T db \
    psql -X --set=ON_ERROR_STOP=1 --username=postgres --dbname=postgres \
    < "${SEED_FILE}"
)

echo "Sample data installation completed. No Supabase service restart is required."
