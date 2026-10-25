#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if (echo >/dev/tcp/localhost/5432) >/dev/null 2>&1; then
  echo "OK: PostgreSQL is reachable on localhost:5432"
  exit 0
fi

echo "ERROR: Cannot reach PostgreSQL at localhost:5432"
echo ""
echo "Your .env expects: postgresql://cirvia:cirvia_secret@localhost:5432/cirvia_db"
echo ""
echo "Quick fix (Docker — recommended):"
echo "  sudo apt update"
echo "  sudo apt install -y docker.io docker-compose-v2"
echo "  sudo usermod -aG docker \"\$USER\""
echo "  # Log out and back in, then:"
echo "  cd backend-api && npm run db:up && npm run db:migrate:deploy"
echo ""
echo "Or one command after Docker is installed:"
echo "  cd backend-api && npm run db:setup"
exit 1
