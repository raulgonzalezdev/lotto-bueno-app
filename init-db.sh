#!/bin/bash

# Variables de conexión a la base de datos
DB_USER="lottobueno"
DB_PASS="lottobueno"
DB_NAME="lottobueno"
PG_PORT="5432" # Puerto dentro del contenedor
BACKUP_FILE="/docker-entrypoint-initdb.d/lottobueno_backup.dump"

echo "Checking for existing database and user..."

# Comprobación de la existencia de la base de datos
if [ "$(psql -U $DB_USER -d $DB_NAME -p $PG_PORT -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" == '1' ]; then
    echo "Database '$DB_NAME' already exists."
else
    echo "Creating database '$DB_NAME'..."
    psql -U $DB_USER -d postgres -p $PG_PORT -c "CREATE DATABASE $DB_NAME"
    echo "Database '$DB_NAME' created."
fi

# Comprobación de la existencia del usuario
if [ "$(psql -U $DB_USER -d $DB_NAME -p $PG_PORT -tAc "SELECT 1 FROM pg_user WHERE usename='$DB_USER'")" == '1' ]; then
    echo "User '$DB_USER' already exists."
else
    echo "Creating user '$DB_USER' with password..."
    psql -U $DB_USER -d $DB_NAME -p $PG_PORT -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS'"
    echo "User '$DB_USER' created."
fi

# Otorgar privilegios
echo "Granting privileges to user '$DB_USER' on database '$DB_NAME'..."
psql -U $DB_USER -d $DB_NAME -p $PG_PORT -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER"
echo "Privileges granted."

# Otorgar permisos de superusuario
echo "Granting SUPERUSER role to user '$DB_USER'..."
psql -U $DB_USER -d $DB_NAME -p $PG_PORT -c "ALTER USER $DB_USER WITH SUPERUSER;"
echo "SUPERUSER role granted."

# Otorgar permisos sobre el esquema public
echo "Granting ALL PRIVILEGES on schema public to '$DB_USER'..."
psql -U $DB_USER -d $DB_NAME -p $PG_PORT -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;"
psql -U $DB_USER -d $DB_NAME -p $PG_PORT -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
echo "ALL PRIVILEGES on schema public granted."

# Crear extensión pgvector
echo "Creating extension pgvector..."
psql -U $DB_USER -d $DB_NAME -p $PG_PORT -c "CREATE EXTENSION IF NOT EXISTS vector;"
echo "Extension pgvector created."

# Restaurar la base de datos desde el archivo de backup
if [ -f "$BACKUP_FILE" ]; then
    echo "Restoring database from backup file..."
    pg_restore -U $DB_USER -d $DB_NAME -p $PG_PORT -v $BACKUP_FILE
    echo "Database restored from backup file."
else
    echo "Backup file not found. Skipping restore."
fi

# Mantener el contenedor en ejecución
tail -f /dev/null
