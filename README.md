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

anexar . env 
docker exec -i 221be13201f0 sh -c "echo 'POSTGRES_DB=lottobueno\nPOSTGRES_USER=lottobueno\nPOSTGRES_PASSWORD=lottobueno\nDATABASE_URL=postgresql+psycopg://lottobueno:lottobueno@localhost:5432/lottobueno\nAPI_URL_BASE=https://7103.api.greenapi.com/waInstance7103942544\nAPI_TOKEN=1b64dc5c3ccc4d9aa01265ce553b874784d414aa81d64777a0\nREDIS_URL=redis://localhost:6380/0\nFASTAPI_BASE_URL=http://20.233.248.245:8003\nCOMPANY_PHONE_CONTACT=584129476026\nSECRET_KEY=J-yMKNjjVaUJUj-vC-cAun_qlyXH68p55er0WIlgFuo\nALGORITHM=HS256' > /app/.env"


```
