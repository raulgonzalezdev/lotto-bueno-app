from sqlalchemy import Column, Integer, String, Date, Index
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Elector(Base):
    __tablename__ = 'electores'

    id = Column(Integer, primary_key=True, index=True)
    letra_cedula = Column(String(1))
    numero_cedula = Column(Integer, index=True)  # Añadir índice aquí
    p_apellido = Column(String(35))
    s_apellido = Column(String(35))
    p_nombre = Column(String(35))
    s_nombre = Column(String(35))
    sexo = Column(String(1))
    fecha_nacimiento = Column(Date)
    codigo_estado = Column(Integer)
    codigo_municipio = Column(Integer)
    codigo_parroquia = Column(Integer)
    codigo_centro_votacion = Column(Integer)

    __table_args__ = (
        Index('ix_numero_cedula', 'numero_cedula'),
    )

class Geografico(Base):
    __tablename__ = 'geograficos'

    id = Column(Integer, primary_key=True, index=True)
    codigo_estado = Column(Integer)
    codigo_municipio = Column(Integer)
    codigo_parroquia = Column(Integer)
    estado = Column(String(35))
    municipio = Column(String(35))
    parroquia = Column(String(35))

class CentroVotacion(Base):
    __tablename__ = 'centros_votacion'

    id = Column(Integer, primary_key=True, index=True)
    codificacion_vieja_cv = Column(Integer)
    codificacion_nueva_cv = Column(Integer)
    condicion = Column(Integer)
    codigo_estado = Column(Integer)
    codigo_municipio = Column(Integer)
    codigo_parroquia = Column(Integer)
    nombre_cv = Column(String(255))
    direccion_cv = Column(String(755))
