from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session
import os

# Cargar las variables de entorno desde el archivo .env
from dotenv import load_dotenv
load_dotenv()

# Definir las posibles URLs de conexión
DATABASE_URLS = [
    # "postgresql+psycopg2://lottobueno:lottobueno@localhost:5432/lottobueno",
    # "postgresql://lottobueno:lottobueno@localhost:5432/lottobueno",
    "postgresql+psycopg2://lottobueno:lottobueno@postgres:5432/lottobueno"
    # "postgresql://lottobueno:lottobueno@postgres:5432/lottobueno",
    # "postgresql+psycopg2://lottobueno:lottobueno@172.21.0.3:5432/lottobueno",
    # "postgresql://lottobueno:lottobueno@172.21.0.3:5432/lottobueno",
    # "postgresql+psycopg2://lottobueno:lottobueno@172.21.0.4:5432/lottobueno",
    # "postgresql+psycopg2://lottobueno:lottobueno@172.17.0.4:5432/lottobueno",
    # "postgresql+psycopg2://lottobueno:lottobueno@172.17.0.3:5432/lottobueno",
    # "postgresql://lottobueno:lottobueno@172.17.0.4:5432/lottobueno",
    # "postgresql://lottobueno:lottobueno@172.17.0.3:5432/lottobueno"
]

engine = None
SessionLocal = None

for db_url in DATABASE_URLS:
    try:
        engine = create_engine(db_url)
        # Probar la conexión
        with engine.connect() as conn:
            print(f"Conectado exitosamente usando: {db_url}")
            break  # Salir del bucle si la conexión es exitosa
    except SQLAlchemyError as e:
        print(f"Fallo al conectar usando {db_url}: {e}")

if engine is not None:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    print("No se pudo establecer conexión con ninguna de las bases de datos proporcionadas.")
    os._exit(1)

# Base declarativa para los modelos
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
