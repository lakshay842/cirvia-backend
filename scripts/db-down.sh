#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found — nothing to stop."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  docker compose stop postgres redis
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose stop postgres redis
else
  echo "Docker compose not available."
  exit 1
fi

echo "Stopped postgres and redis containers."
