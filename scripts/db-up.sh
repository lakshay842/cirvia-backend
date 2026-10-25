#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -r "$ROOT/package.json" ]]; then
  echo "ERROR: Cannot read package.json in $ROOT"
  echo ""
  echo "You are logged in as: $(whoami)"
  echo "This project is owned by lakshay under /home/lakshay/Documents/cirvia"
  echo ""
  echo "Do NOT use 'su coolboots' for npm/docker here — coolboots cannot access lakshay's home."
  echo ""
  echo "Fix:"
  echo "  1. exit   # leave su coolboots, back to lakshay"
  echo "  2. sudo usermod -aG docker lakshay"
  echo "  3. newgrp docker   # or log out and log back in"
  echo "  4. cd ~/Documents/cirvia/backend-api && npm run db:setup"
  exit 1
fi

wait_for_port() {
  local host="$1" port="$2" attempts="${3:-30}"
  for ((i = 1; i <= attempts; i++)); do
    if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

docker_can_connect() {
  docker info >/dev/null 2>&1
}

docker_group_name() {
  getent group docker | cut -d: -f1 || echo "docker"
}

user_in_docker_group() {
  id -nG 2>/dev/null | grep -qw docker && return 0
  getent group docker | grep -qw "\b$(whoami)\b"
}

run_compose_up() {
  local use_sg="${1:-false}"
  local cmd

  if docker compose version >/dev/null 2>&1; then
    cmd="docker compose up -d postgres redis"
  elif command -v docker-compose >/dev/null 2>&1; then
    cmd="docker-compose up -d postgres redis"
  else
    echo "Docker is installed but compose is missing. Install docker-compose-v2."
    return 1
  fi

  if [[ "$use_sg" == "true" ]]; then
    sg "$(docker_group_name)" -c "cd '$ROOT' && $cmd"
  else
    eval "$cmd"
  fi
}

show_docker_group_help() {
  cat <<'EOF'
Docker permission denied on /var/run/docker.sock.

You were added to the docker group, but this terminal session does not have it yet.

Run ONE of:
  newgrp docker
  # then: npm run db:setup

Or open a new terminal / log out and back in, then:
  cd ~/Documents/cirvia/backend-api && npm run db:setup
EOF
}

if wait_for_port localhost 5432 1; then
  echo "PostgreSQL already reachable on localhost:5432"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  cat <<'EOF'
PostgreSQL is not running and Docker was not found.

Install Docker:
  sudo apt update
  sudo apt install -y docker.io docker-compose-v2
  sudo usermod -aG docker "$USER"
  newgrp docker
  cd ~/Documents/cirvia/backend-api && npm run db:setup
EOF
  exit 1
fi

echo "Starting Cirvia Postgres + Redis via Docker Compose..."

if docker_can_connect; then
  run_compose_up false
elif user_in_docker_group; then
  echo "Refreshing docker group for this command (session not in docker group yet)..."
  if ! run_compose_up true; then
    show_docker_group_help
    exit 1
  fi
else
  echo "ERROR: Docker daemon not accessible."
  echo ""
  echo "Add your user to docker, then refresh the session:"
  echo "  sudo usermod -aG docker $(whoami)"
  echo "  newgrp docker"
  echo "  npm run db:setup"
  exit 1
fi

echo "Waiting for PostgreSQL..."
if ! wait_for_port localhost 5432 60; then
  echo "PostgreSQL did not become ready on localhost:5432"
  if docker_can_connect; then
    docker compose logs postgres 2>/dev/null || docker-compose logs postgres 2>/dev/null || true
  elif user_in_docker_group; then
    sg "$(docker_group_name)" -c "docker compose logs postgres" 2>/dev/null || true
  fi
  exit 1
fi

echo "PostgreSQL is ready."
