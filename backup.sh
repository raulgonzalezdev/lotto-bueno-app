#!/bin/bash

# Variables de conexión a la base de datos
DB_USER="lottobueno"
DB_HOST="localhost"
DB_PORT="5532"
DB_NAME="lottobueno"
BACKUP_FILE="lottobueno_backup.dump"

# Comando de backup
PGPASSFILE=~/.pgpass pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -F c -b -v -f $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"

