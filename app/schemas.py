from pydantic import BaseModel
from typing import Optional
from datetime import date

class ElectorBase(BaseModel):
    letra_cedula: Optional[str]
    numero_cedula: Optional[int]
    p_apellido: Optional[str]
    s_apellido: Optional[str]
    p_nombre: Optional[str]
    s_nombre: Optional[str]
    sexo: Optional[str]
    fecha_nacimiento: Optional[date]
    codigo_estado: Optional[int]
    codigo_municipio: Optional[int]
    codigo_parroquia: Optional[int]
    codigo_centro_votacion: Optional[int]

class ElectorCreate(ElectorBase):
    pass

class ElectorList(ElectorBase):
    id: int

    class Config:
        orm_mode = True

class GeograficoBase(BaseModel):
    codigo_estado: Optional[int]
    codigo_municipio: Optional[int]
    codigo_parroquia: Optional[int]
    estado: Optional[str]
    municipio: Optional[str]
    parroquia: Optional[str]

class GeograficoCreate(GeograficoBase):
    pass

class GeograficoList(GeograficoBase):
    id: int

    class Config:
        orm_mode = True

class CentroVotacionBase(BaseModel):
    codificacion_vieja_cv: Optional[int]
    codificacion_nueva_cv: Optional[int]
    condicion: Optional[int]
    codigo_estado: Optional[int]
    codigo_municipio: Optional[int]
    codigo_parroquia: Optional[int]
    nombre_cv: Optional[str]
    direccion_cv: Optional[str]

class CentroVotacionCreate(CentroVotacionBase):
    pass

class CentroVotacionList(CentroVotacionBase):
    id: int

    class Config:
        orm_mode = True

class ElectorDetail(BaseModel):
    elector: ElectorList
    centro_votacion: Optional[CentroVotacionList]
    geografico: Optional[GeograficoList]

    class Config:
        orm_mode = True
