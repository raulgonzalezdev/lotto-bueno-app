# Lotto Bueno App

## Descripción

Esta aplicación es un sistema de gestión de datos electorales utilizando FastAPI, PostgreSQL y Redis.

## Instrucciones para el Backup y Restauración de la Base de Datos

### Backup

Para realizar un backup de la base de datos, utiliza el script `backup.sh`:

```bash
./backup.sh

docker compose --env-file .env up -d --build

uvicorn app.main:app --host 0.0.0.0 --port 8003
ssh -i ~/.ssh/id_rsa_1.pem azureuser@20.233.248.245



```
