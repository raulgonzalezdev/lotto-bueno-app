import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import sys

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

# Definir las posibles URLs de conexión
DATABASE_URLS = [
    "postgresql+psycopg2://lottobueno:lottobueno@localhost:5432/lottobueno",
    "postgresql://lottobueno:lottobueno@localhost:5432/lottobueno",
    "postgresql+psycopg2://lottobueno:lottobueno@postgres:5432/lottobueno",
    "postgresql+psycopg2://lottobueno:lottobueno@172.21.0.3:5432/lottobueno"
]

# Intentar establecer una conexión
engine = None
for db_url in DATABASE_URLS:
    try:
        engine = create_engine(db_url)
        # Realizar una consulta simple para verificar la conexión
        connection = engine.connect()
        connection.close()
        print(f"Conectado exitosamente usando: {db_url}")
        break
    except Exception as e:
        print(f"Fallo al conectar usando {db_url}: {e}")

# Si no se pudo conectar con ninguna URL, se termina la ejecución
if engine is None:
    print("No se pudo establecer conexión con ninguna de las bases de datos proporcionadas.")
    sys.exit(1)

# Configuración de SQLAlchemy
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa para los modelos
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()


