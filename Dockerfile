FROM postgres:latest

ENV POSTGRES_DB=lottobueno
ENV POSTGRES_USER=lottobueno
ENV POSTGRES_PASSWORD=lottobueno

# Instalar pgvector
RUN apt-get update && apt-get install -y postgresql-$PG_MAJOR-pgvector

# Copiar el archivo de backup al contenedor
COPY lottobueno_backup.dump /docker-entrypoint-initdb.d/
COPY init-db.sh /docker-entrypoint-initdb.d/

# Iniciar PostgreSQL
CMD ["postgres"]

