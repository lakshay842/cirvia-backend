#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

echo "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U cirvia -d cirvia_db > /dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npm run db:seed

echo "Database setup complete."
