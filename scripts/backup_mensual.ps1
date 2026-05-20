$CONTAINER_NAME = "trapoapp-postgres-1"
$DB_USER = "trapo_user"
$DB_NAME = "trapo_db"
$BACKUP_DIR = "./database/backups"

$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$FILE_NAME = "backup_vendedor_$DATE.sql"

New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

Write-Host "[INFO] Iniciando backup de base de datos TrapoApp: $(Get-Date)"
Write-Host "[INFO] Ejecutando pg_dump en el contenedor $CONTAINER_NAME..."

docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME -F p > "$BACKUP_DIR/$FILE_NAME"

Write-Host "[INFO] Comprimiendo archivo SQL resultante..."
docker run --rm -v "C:\Users\eulal\OneDrive\Documents\TrapoApp:/app" -w /app alpine gzip -f "$BACKUP_DIR/$FILE_NAME"

Write-Host "[SUCCESS] Backup finalizado existosamente. Guardado y comprimido en: $BACKUP_DIR/$FILE_NAME.gz"
