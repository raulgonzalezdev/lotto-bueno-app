from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import SessionLocal
from app.models import Elector, Geografico, CentroVotacion
from app.schemas import ElectorList, GeograficoList, CentroVotacionList, ElectorCreate, GeograficoCreate, CentroVotacionCreate, ElectorDetail
from redis.asyncio import Redis
import json
import os
from datetime import date, datetime

app = FastAPI()

# Configuración de Redis
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6380/0')
redis = Redis.from_url(redis_url, decode_responses=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para convertir los objetos SQLAlchemy a diccionarios
def to_dict(obj):
    if obj is None:
        return None
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}

# Función personalizada para manejar la serialización de objetos no serializables
def custom_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f'Type {obj.__class__.__name__} not serializable')

# Función para obtener un elector y almacenarlo en la caché si no está presente
async def get_elector_from_cache(elector_id: int, db: Session):
    cache_key = f"elector:{elector_id}"
    elector = await redis.get(cache_key)
    if elector:
        return json.loads(elector)
    else:
        db_elector = db.query(Elector).filter(Elector.id == elector_id).first()
        if db_elector:
            await redis.set(cache_key, json.dumps(to_dict(db_elector), default=custom_serializer), ex=60*60)  # Cache por 1 hora
        return to_dict(db_elector)

# Función para obtener un elector por número de cédula y almacenarlo en la caché si no está presente
async def get_elector_by_cedula_from_cache(numero_cedula: int, db: Session):
    cache_key = f"elector:cedula:{numero_cedula}"
    elector = await redis.get(cache_key)
    if elector:
        return json.loads(elector)
    else:
        db_elector = db.query(Elector).filter(Elector.numero_cedula == numero_cedula).first()
        if db_elector:
            print(f"Elector found: {db_elector}")
            centro_votacion = db.query(CentroVotacion).filter(CentroVotacion.codificacion_nueva_cv == db_elector.codigo_centro_votacion).first()
            print(f"Centro Votacion found: {centro_votacion}")
            geografico = db.query(Geografico).filter(
                Geografico.codigo_estado == db_elector.codigo_estado,
                Geografico.codigo_municipio == db_elector.codigo_municipio,
                Geografico.codigo_parroquia == db_elector.codigo_parroquia
            ).first()
            print(f"Geografico found: {geografico}")
            
            result = {
                "elector": to_dict(db_elector),
                "centro_votacion": to_dict(centro_votacion),
                "geografico": to_dict(geografico)
            }
            await redis.set(cache_key, json.dumps(result, default=custom_serializer), ex=60*60)  # Cache por 1 hora
            return result
        return None

# Función para obtener estadísticas por estado
async def get_statistics_from_cache(stat_type: str, db: Session):
    cache_key = f"stats:{stat_type}"
    stats = await redis.get(cache_key)
    if stats:
        return json.loads(stats)
    else:
        if stat_type == "estado":
            stats = db.query(Elector.codigo_estado, func.count(Elector.id)).group_by(Elector.codigo_estado).all()
        elif stat_type == "municipio":
            stats = db.query(Elector.codigo_municipio, func.count(Elector.id)).group_by(Elector.codigo_municipio).all()
        elif stat_type == "parroquia":
            stats = db.query(Elector.codigo_parroquia, func.count(Elector.id)).group_by(Elector.codigo_parroquia).all()
        elif stat_type == "centro_votacion":
            stats = db.query(Elector.codigo_centro_votacion, func.count(Elector.id)).group_by(Elector.codigo_centro_votacion).all()
        
        stats_dict = [{"key": key, "count": count} for key, count in stats]
        await redis.set(cache_key, json.dumps(stats_dict), ex=60*60)  # Cache por 1 hora
        return stats_dict

# Endpoints para Electores
@app.get("/electores/", response_model=list[ElectorList])
async def read_electores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    electores = db.query(Elector).offset(skip).limit(limit).all()
    return [to_dict(elector) for elector in electores]

@app.get("/electores/{elector_id}", response_model=ElectorList)
async def read_elector(elector_id: int, db: Session = Depends(get_db)):
    elector = await get_elector_from_cache(elector_id, db)
    if not elector:
        raise HTTPException(status_code=404, detail="Elector not found")
    return elector

@app.post("/electores/", response_model=ElectorList)
async def create_elector(elector: ElectorCreate, db: Session = Depends(get_db)):
    db_elector = Elector(**elector.model_dump())
    db.add(db_elector)
    db.commit()
    db.refresh(db_elector)
    await redis.delete(f"elector:{db_elector.id}")  # Clear cache for this elector
    return to_dict(db_elector)

# Endpoint para buscar elector por número de cédula usando Redis
@app.get("/electores/cedula/{numero_cedula}", response_model=ElectorDetail)
async def read_elector_by_cedula(numero_cedula: int, db: Session = Depends(get_db)):
    result = await get_elector_by_cedula_from_cache(numero_cedula, db)
    if not result:
        raise HTTPException(status_code=404, detail="Elector not found")
    return result

# Endpoint para buscar elector por número de cédula sin usar Redis
@app.get("/electores/cedula_no_cache/{numero_cedula}", response_model=ElectorDetail)
async def read_elector_by_cedula_no_cache(numero_cedula: int, db: Session = Depends(get_db)):
    db_elector = db.query(Elector).filter(Elector.numero_cedula == numero_cedula).first()
    if db_elector:
        print(f"Elector found: {db_elector}")
        centro_votacion = db.query(CentroVotacion).filter(CentroVotacion.codificacion_nueva_cv == db_elector.codigo_centro_votacion).first()
        print(f"Centro Votacion found: {centro_votacion}")
        geografico = db.query(Geografico).filter(
            Geografico.codigo_estado == db_elector.codigo_estado,
            Geografico.codigo_municipio == db_elector.codigo_municipio,
            Geografico.codigo_parroquia == db_elector.codigo_parroquia
        ).first()
        print(f"Geografico found: {geografico}")
        
        result = {
            "elector": to_dict(db_elector),
            "centro_votacion": to_dict(centro_votacion),
            "geografico": to_dict(geografico)
        }
        return result
    else:
        raise HTTPException(status_code=404, detail="Elector not found")

# Endpoints para Geograficos
@app.get("/geograficos/", response_model=list[GeograficoList])
async def read_geograficos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    geograficos = db.query(Geografico).offset(skip).limit(limit).all()
    return [to_dict(geografico) for geografico in geograficos]

@app.post("/geograficos/", response_model=GeograficoList)
async def create_geografico(geografico: GeograficoCreate, db: Session = Depends(get_db)):
    db_geografico = Geografico(**geografico.model_dump())
    db.add(db_geografico)
    db.commit()
    db.refresh(db_geografico)
    return to_dict(db_geografico)

# Endpoints para Centros de Votacion
@app.get("/centros_votacion/", response_model=list[CentroVotacionList])
async def read_centros_votacion(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    centros = db.query(CentroVotacion).offset(skip).limit(limit).all()
    return [to_dict(centro) for centro in centros]

@app.post("/centros_votacion/", response_model=CentroVotacionList)
async def create_centro_votacion(centro: CentroVotacionCreate, db: Session = Depends(get_db)):
    db_centro = CentroVotacion(**centro.model_dump())
    db.add(db_centro)
    db.commit()
    db.refresh(db_centro)
    return to_dict(db_centro)

# Endpoints para estadísticas
@app.get("/stats/{stat_type}")
async def get_statistics(stat_type: str, db: Session = Depends(get_db)):
    valid_stats = ["estado", "municipio", "parroquia", "centro_votacion"]
    if stat_type not in valid_stats:
        raise HTTPException(status_code=400, detail="Invalid statistics type")
    stats = await get_statistics_from_cache(stat_type, db)
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
