import csv
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Elector, Geografico, CentroVotacion

def load_electors(filepath: str):
    db = SessionLocal()
    with open(filepath, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header
        for row in reader:
            elector = Elector(
                letra_cedula=row[0],
                numero_cedula=int(row[1]),
                p_apellido=row[2],
                s_apellido=row[3],
                p_nombre=row[4],
                s_nombre=row[5],
                sexo=row[6],
                fecha_nacimiento=datetime.strptime(row[7], '%Y-%m-%d'),
                codigo_estado=int(row[8]),
                codigo_municipio=int(row[9]),
                codigo_parroquia=int(row[10]),
                codigo_centro_votacion=int(row[11])
            )
            db.add(elector)
        db.commit()
    db.close()

def load_geographic_data(filepath: str):
    db = SessionLocal()
    with open(filepath, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header
        for row in reader:
            geographic = Geografico(
                codigo_estado=int(row[0]),
                codigo_municipio=int(row[1]),
                codigo_parroquia=int(row[2]),
                estado=row[3],
                municipio=row[4],
                parroquia=row[5]
            )
            db.add(geographic)
        db.commit()
    db.close()

def load_voting_centers(filepath: str):
    db = SessionLocal()
    with open(filepath, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header
        for row in reader:
            center = CentroVotacion(
                codificacion_vieja_cv=int(row[0]),
                codificacion_nueva_cv=int(row[1]),
                condicion=int(row[2]),
                codigo_estado=int(row[3]),
                codigo_municipio=int(row[4]),
                codigo_parroquia=int(row[5]),
                nombre_cv=row[6],
                direccion_cv=row[7]
            )
            db.add(center)
        db.commit()
    db.close()

# Paths to your data files
electors_file_path = 'data/re20240416_pp.txt'
geographic_file_path = 'data/geo20240416_pp.txt'
voting_centers_file_path = 'data/cva20240416.txt'

# Load data into the database
load_electors(electors_file_path)
load_geographic_data(geographic_file_path)
load_voting_centers(voting_centers_file_path)
