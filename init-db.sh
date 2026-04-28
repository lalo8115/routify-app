#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no está instalado o no está en PATH."
  exit 1
fi

cd "$PROJECT_ROOT"

echo "Deteniendo el stack y borrando el volumen de PostgreSQL..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true

echo "Levantando PostgreSQL para ejecutar la inicialización automática..."
DATABASE_SOURCE=local docker compose -f "$COMPOSE_FILE" up -d postgres

echo "Esperando a que PostgreSQL esté listo..."
for attempt in {1..60}; do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U trapo_user -d trapo_db >/dev/null 2>&1; then
    echo "PostgreSQL listo."
    break
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "PostgreSQL no respondió a tiempo."
    exit 1
  fi

  sleep 2
done

echo "Levantando app y balanceador..."
DATABASE_SOURCE=local docker compose -f "$COMPOSE_FILE" up -d app1 app2 nginx

echo "Listo."
echo "- PostgreSQL: localhost:5432"
echo "- App vía Nginx: http://localhost"