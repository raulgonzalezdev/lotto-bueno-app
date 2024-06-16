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
ssh -i ~/.ssh/id_rsa_1.pem azureuser@20.233.251.193

anexar . env 
docker exec -i f70448e24996  sh -c "echo 'POSTGRES_DB=lottobueno\nPOSTGRES_USER=lottobueno\nPOSTGRES_PASSWORD=lottobueno\nDATABASE_URL=postgresql+psycopg://lottobueno:lottobueno@localhost:5432/lottobueno\nAPI_URL_BASE=https://7103.api.greenapi.com/waInstance7103942544\nAPI_TOKEN=1b64dc5c3ccc4d9aa01265ce553b874784d414aa81d64777a0\nREDIS_URL=redis://localhost:6380/0\nFASTAPI_BASE_URL=http://localhost:8000\nCOMPANY_PHONE_CONTACT=584129476026\nSECRET_KEY=J-yMKNjjVaUJUj-vC-cAun_qlyXH68p55er0WIlgFuo\nALGORITHM=HS256' > /app/.env"




echo 'POSTGRES_DB=lottobueno
POSTGRES_USER=lottobueno
POSTGRES_PASSWORD=lottobueno
DATABASE_URL=postgresql+psycopg://lottobueno:lottobueno@postgres:5432/lottobueno
API_URL_BASE=https://7103.api.greenapi.com/waInstance7103942544
API_TOKEN=1b64dc5c3ccc4d9aa01265ce553b874784d414aa81d64777a0
REDIS_URL=redis://localhost:6380/0
FASTAPI_BASE_URL=http://localhost:8000
COMPANY_PHONE_CONTACT=584129476026
SECRET_KEY=J-yMKNjjVaUJUj-vC-cAun_qlyXH68p55er0WIlgFuo
ALGORITHM=HS256' > /.env



docker cp /home/soyrauldev/proyectos/Brito/lotto-bueno-app/app/main.py 9b065fb16cfb:/app/app/main.py

docker cp /home/soyrauldev/proyectos/Brito/lotto-bueno-app/.env f05d0fe05f38:/app/app/.env
docker exec -i 843036f6045f sh -c "PGUSER=lottobueno PGHOST=localhost PGPORT=5432 PGDATABASE=lottobueno PGPASSWORD=lottobueno pg_restore -U lottobueno -h localhost -p 5432 -d lottobueno -v /docker-entrypoint-initdb.d/lottobueno_backup.dump"


```
apagar las lineas del respaldo antes para luego hacer el respaldo manual
