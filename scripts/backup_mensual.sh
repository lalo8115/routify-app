#!/bin/bash
CONTAINER_NAME="trapoapp-postgres-1"
DB_USER="trapo_user"
DB_NAME="trapo_db"
BACKUP_DIR="./database/backups"

DATE=$(date +"%Y%m%d_%H%M%S")
FILE_NAME="backup_vendedor_$DATE.sql"

mkdir -p "$BACKUP_DIR"

echo "[INFO] Iniciando backup de base de datos TrapoApp: $(date)"

echo "[INFO] Ejecutando pg_dump en el contenedor $CONTAINER_NAME..."
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME -F p > "$BACKUP_DIR/$FILE_NAME"

echo "[INFO] Comprimiendo archivo SQL resultante..."
gzip -f "$BACKUP_DIR/$FILE_NAME"

echo "[SUCCESS] Backup finalizado existosamente. Guardado y comprimido en: $BACKUP_DIR/$FILE_NAME.gz"
