# main.py
import os
import random
import string
import qrcode
import json
import base64
import requests
import jwt
import logging
import re
from pathlib import Path


from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from io import BytesIO
from fastapi import FastAPI, HTTPException, Depends, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from werkzeug.security import generate_password_hash, check_password_hash
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy import distinct
from datetime import datetime, date
from redis.asyncio import Redis


from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session



from app.models import Elector, Geografico, CentroVotacion, Ticket, Recolector, Users, LineaTelefonica
from app.schemas import LineaTelefonicaList, LineaTelefonicaCreate, LineaTelefonicaUpdate, RecolectorEstadisticas,ElectorList,UserCreate, UserList, GeograficoList, CentroVotacionList,TicketUpdate,TicketUpdate, TicketUpdate, ElectorCreate, GeograficoCreate, CentroVotacionCreate, ElectorDetail, TicketCreate, TicketList, RecolectorCreate, RecolectorList, RecolectorUpdate
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

Base = declarative_base()

app = FastAPI()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# Configuración de CORS
origins = [
    # "http://localhost",
    "http://sas.uaenorth.cloudapp.azure.com:8000",
    "http://localhost:8000/",
    # "http://sas.uaenorth.cloudapp.azure.com:8000",
    # "http://lot.uaenorth.cloudapp.azure.com",
    # "http://localhost:8002", 
    # "http://localhost:8003", 
    # "http://localhost:8004",
    # "http://localhost:8005",
    "http://localhost:3000",
    # "http://localhost:3002",
    # "http://localhost:3001",
    "https://7103.api.greenapi.com",
    # "http://sas.uaenorth.cloudapp.azure.com:8000/api/settings",
    # "https://lotto-bueno-app-tbsd.vercel.app/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL_BASE = os.getenv("API_URL_BASE")
API_TOKEN = os.getenv("API_TOKEN")
REDIS_URL = os.getenv("REDIS_URL")
FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL" )
SECRET_KEY = os.getenv("SECRET_KEY", "J-yMKNjjVaUJUj-vC-cAun_qlyXH68p55er0WIlgFuo")
ALGORITHM = os.getenv("ALGORITHM", "HS256")





BASE_DIR = Path(__file__).resolve().parent



redis = Redis.from_url(REDIS_URL, decode_responses=True)

class PhoneNumberRequest(BaseModel):
    phone_number: str

class MessageRequest(BaseModel):
    chat_id: str
    message: str

class CedulaRequest(BaseModel):
    numero_cedula: str

class ContactRequest(BaseModel):
    chat_id: str
    phone_contact: str
    first_name: str
    last_name: str
    company: str

class TicketRequest(BaseModel):
    cedula: str
    telefono: str
    referido_id: Optional[int] = None
    
class Estado(BaseModel):
    codigo_estado: int
    estado: str
    



def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def check_whatsapp(phone_number: str):
    url = f"{API_URL_BASE}/checkWhatsapp/{API_TOKEN}"
    payload = json.dumps({"phoneNumber": phone_number})
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        return {"status": "api", "message": "Error de HTTP en la verificación de WhatsApp"}
    except Exception as err:
        return {"status": "error", "message": "No se pudo conectar a la API de verificación de WhatsApp"}



app.mount(
    "/static/_next",
    StaticFiles(directory=BASE_DIR / "frontend/out/_next"),
    name="next-assets",
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "frontend/out"), name="app")

@app.get("/")
@app.head("/")
async def serve_frontend():
    return FileResponse(os.path.join(BASE_DIR, "frontend/out/index.html"))

@app.post("/check_whatsapp")
def api_check_whatsapp(request: PhoneNumberRequest):
    result = check_whatsapp(request.phone_number)
    if result.get("status") == "api":
        return {"status": "api", "message": "El servicio de verificación de WhatsApp no está disponible en este momento. Por favor, inténtalo más tarde."}
    if not result.get("existsWhatsapp"):
        raise HTTPException(status_code=400, detail="El número no tiene WhatsApp")
    return {"status": "Número válido"}

def send_message(chat_id: str, message: str):
    url = f"{API_URL_BASE}/sendMessage/{API_TOKEN}"
    payload = json.dumps({
        "chatId": f"{chat_id}@c.us",
        "message": message
    })
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        response_data = response.json()
        
        # Revisar si la respuesta contiene el idMessage
        if "idMessage" in response_data:
            return {"status": "success", "data": response_data}
        else:
            return {"status": "error", "message": "La API respondió pero no indicó éxito", "data": response_data}
    except requests.exceptions.HTTPError as http_err:
        return {"status": "error", "message": f"Error de HTTP al enviar el mensaje: {http_err}"}
    except Exception as err:
        return {"status": "error", "message": f"No se pudo conectar a la API de envío de mensajes: {err}"}

@app.post("/send_message")
def api_send_message(request: MessageRequest):
    result = send_message(request.chat_id, request.message)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    
    return {"status": "Mensaje enviado", "data": result.get("data")}



# @app.post("/verificar_cedula")
# def verificar_cedula(request: CedulaRequest):
#     numero_cedula = request.numero_cedula
#     url = f"{FASTAPI_BASE_URL}/electores/cedula/{numero_cedula}"
#     try:
#         response = requests.get(url)
#         response.raise_for_status()
#         data = response.json()
#         if not data["elector"]:
#             raise HTTPException(status_code=404, detail="Cédula no encontrada")
#         return data
#     except requests.exceptions.HTTPError as http_err:
#         raise HTTPException(status_code=response.status_code, detail=str(http_err))
#     # except Exception as err:
#     #     raise HTTPException(status_code=500, detail="Error al conectar con el servicio de verificación de cédulas")

@app.post("/verificar_cedula")
def verificar_cedula(request: CedulaRequest, db: Session = Depends(get_db)):
    numero_cedula = request.numero_cedula
    result = get_elector_by_cedula_from_cache(numero_cedula, db)
    if not result:
        raise HTTPException(status_code=404, detail="Cédula no encontrada")
    return result

def generate_ticket_number():
    characters = string.ascii_letters + string.digits
    ticket_number = ''.join(random.choice(characters) for _ in range(12))
    return ticket_number

def send_qr_code(chat_id: str, qr_buf: BytesIO):
    url = f"{API_URL_BASE}/sendFileByUpload/{API_TOKEN}"
    files = {
        'file': ('qrcode.png', qr_buf, 'image/png')
    }
    payload = {
        'chatId': f'{chat_id}@c.us'
    }
    headers = {}

    try:
        response = requests.post(url, headers=headers, files=files, data=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        return {"status": "error", "message": "Error de HTTP al enviar el código QR"}
    except Exception as err:
        return {"status": "error", "message": "No se pudo conectar a la API de envío de códigos QR"}

# Definición de los endpoints y modelos
@app.post("/generate_ticket")
def api_generate_ticket(request: TicketRequest, db: Session = Depends(get_db)):
    # Verificar si el número de WhatsApp es válido
    whatsapp_check = check_whatsapp(request.telefono)
    if "status" in whatsapp_check:
        return {"status": "error", "message": "El número no tiene WhatsApp"}

    # Verificar la cédula usando la función verificar_cedula
    try:
        #elector_response = verificar_cedula(request.cedula)
        elector_response = verificar_cedula(CedulaRequest(numero_cedula=request.cedula))
        if not elector_response.get("elector"):
            # Enviar mensaje de texto por WhatsApp indicando que la cédula no es válida
            message = "La cédula proporcionada no es válida para participar en Lotto Bueno."
            send_message(request.telefono, message)
            return {"status": "error", "message": "La cédula no es válida"}
    except HTTPException as e:
        # Enviar mensaje de texto por WhatsApp indicando que la cédula no es válida
        message = "La cédula proporcionada no es válida para participar en Lotto Bueno."
        send_message(request.telefono, message)
        return {"status": "error", "message": str(e.detail)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

    # Procesar los datos del elector
    elector_data = elector_response.get("elector")
    nombre = f"{elector_data['p_nombre']} {elector_data['s_nombre']} {elector_data['p_apellido']} {elector_data['s_apellido']}"
    elector_geografico = elector_response.get("geografico")
    estado = elector_geografico['estado']
    municipio = elector_geografico['municipio']
    parroquia = elector_geografico['parroquia']

    # Verificar si ya existe un ticket con la cédula o el teléfono proporcionados
    existing_ticket = db.query(Ticket).filter((Ticket.cedula == request.cedula) | (Ticket.telefono == request.telefono)).first()
    if existing_ticket:
        # Enviar mensaje de texto por WhatsApp con el ID del ticket existente
        message = f"Hola, {existing_ticket.nombre}. Tu ya estás participando en Lotto Bueno con el ID de ticket: {existing_ticket.id}. No hace falta que envíes más datos, solo agrega nuestro número para futuras promociones."
        send_message(request.telefono, message)
        
        # Enviar contacto de la empresa
        send_contact(request.telefono)
        
        # Enviar código QR por WhatsApp
        qr_code_base64 = existing_ticket.qr_ticket
        qr_buf = BytesIO(base64.b64decode(qr_code_base64))
        send_qr_code(request.telefono, qr_buf)

        return {
            "status": "success",
            "message": message,
            "ticket_number": existing_ticket.numero_ticket,
            "qr_code": qr_code_base64
        }

    ticket_number = generate_ticket_number()

    # Determinar el id del recolector
    referido_id = request.referido_id if request.referido_id is not None else get_system_recolector_id(db)

    # Incluir datos de la persona y el número de ticket en el QR
    qr_data = {
        "ticket_number": ticket_number,
        "cedula": request.cedula,
        "nombre": nombre,
        "telefono": request.telefono,
        "estado": estado,
        "municipio": municipio,
        "parroquia": parroquia,
        "referido_id": referido_id
        
    }
    qr_data_json = json.dumps(qr_data)

    # Crear código QR
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data_json)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf)
    buf.seek(0)

    # Enviar código QR por WhatsApp
    send_result = send_qr_code(request.telefono, buf)
    if send_result.get("status") == "error":
        return {"status": "error", "message": send_result["message"]}

    # Guardar el ticket en la base de datos
    qr_code_base64 = base64.b64encode(buf.getvalue()).decode()
    new_ticket = TicketCreate(
        numero_ticket=ticket_number,
        qr_ticket=qr_code_base64,
        cedula=request.cedula,
        nombre=nombre,
        telefono=request.telefono,
        estado=estado,
        municipio=municipio,
        parroquia=parroquia,
        referido_id=referido_id,
        validado=False,
        ganador=False,
        created_at=datetime.now(),  # Establece el momento actual si es necesario
        updated_at=datetime.now()   #
    )
    
    try:
        db_ticket = Ticket(**new_ticket.dict())
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
    except Exception as e:
        print(f"Error al guardar en la base de datos: {e}")
        return {"status": "error", "message": "Error interno del servidor no se guardo la tabla ticket"}

    # Enviar mensaje de texto por WhatsApp con el ID del nuevo ticket
    message = f"Hola. {db_ticket.nombre} Apartir de este momento.  Estás participando en Lotto Bueno con el ID de ticket: {db_ticket.id}"
    send_message(request.telefono, message)
    
    # Enviar contacto de la empresa
    send_contact(request.telefono)

    return {
        "status": "success",
        "message": message,
        "ticket_number": ticket_number,
        "qr_code": qr_code_base64
    }


def send_contact(chat_id: int, db: Session = Depends(get_db)):
    # Intentar obtener un número de contacto aleatorio de la tabla 'lineas_telefonicas'
    try:
        # Obtener todos los números de contacto
        phone_contacts = db.query(LineaTelefonica.numero).all()
        if phone_contacts:
            # Seleccionar un número de contacto aleatorio
            phone_contact = random.choice(phone_contacts)[0]
        else:
            # Usar la variable de ambiente si no hay números disponibles
            phone_contact = os.getenv("COMPANY_PHONE_CONTACT", "584129476026")
    except Exception as e:
        # Usar la variable de ambiente en caso de cualquier error
        phone_contact = os.getenv("COMPANY_PHONE_CONTACT", "584129476026")

    contact_request = ContactRequest(
        chat_id=chat_id,
        phone_contact=phone_contact,
        first_name="Empresa",
        last_name="Lotto Bueno",
        company="Lotto Bueno"
    )
    result = enviar_contacto(contact_request.chat_id, contact_request.phone_contact, contact_request.first_name, contact_request.last_name, contact_request.company)
    if result.get("status") == "Error":
        raise HTTPException(status_code=500, detail=result["detail"])
    
def get_system_recolector_id(db: Session) -> int:
    system_recolector = db.query(Recolector).filter(Recolector.nombre == 'system').first()
    if system_recolector is None:
        system_recolector = Recolector(nombre='system', cedula='', telefono='', es_referido=False)
        db.add(system_recolector)
        db.commit()
        db.refresh(system_recolector)
    return system_recolector.id


def obtener_numero_instancia():
    url = f"{API_URL_BASE}/getSettings/{API_TOKEN}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data["wid"]
    except requests.exceptions.HTTPError as http_err:
        return None
    except Exception as err:
        return None

def verificar_numero_whatsapp(phone_number):
    url = f"{FASTAPI_BASE_URL}/check_whatsapp"
    payload = {"phone_number": phone_number}
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        return {"status": "Error", "detail": str(http_err)}
    except Exception as err:
        return {"status": "Error", "detail": str(err)}

@app.post("/enviar_contacto")
def api_enviar_contacto(request: ContactRequest):
    result = enviar_contacto(request.chat_id, request.phone_contact, request.first_name, request.last_name, request.company)
    if result.get("status") == "Error":
        raise HTTPException(status_code=500, detail=result["detail"])
    return {"status": "Contacto enviado"}

def enviar_contacto(chat_id, phone_contact, first_name, last_name, company):
    url = f"{API_URL_BASE}/sendContact/{API_TOKEN}"
    payload = {
        "chatId": f"{chat_id}@c.us",
        "contact": {
            "phoneContact": phone_contact,
            "firstName": first_name,
            "lastName": last_name,
            "company": company
        }
    }
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        return {"status": "Error", "detail": str(http_err)}
    except Exception as err:
        return {"status": "Error", "detail": str(err)}

@app.post("/reboot_instance")
def api_reboot_instance():
    try:
        reboot_instance()
        return {"status": "Instancia reiniciada"}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

def reboot_instance():
    url = f"{API_URL_BASE}/reboot/{API_TOKEN}"
    headers = {}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        print("Instance rebooted successfully.")
        print(response.text.encode('utf8'))
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        raise
    except Exception as err:
        print(f"Other error occurred: {err}")
        raise

async def get_elector_from_cache(elector_id: int, db: Session):
    cache_key = f"elector:{elector_id}"
    elector = await redis.get(cache_key)
    if elector:
        return json.loads(elector)
    else:
        db_elector = db.query(Elector).filter(Elector.id == elector_id).first()
        if db_elector:
            await redis.set(cache_key, json.dumps(to_dict(db_elector), default=custom_serializer), ex=60*60)
        return to_dict(db_elector)

async def get_elector_by_cedula_from_cache(numero_cedula: int, db: Session):
    cache_key = f"elector:cedula:{numero_cedula}"
    elector = await redis.get(cache_key)
    if elector:
        return json.loads(elector)
    else:
        db_elector = db.query(Elector).filter(Elector.numero_cedula == numero_cedula).first()
        if db_elector:
            centro_votacion = db.query(CentroVotacion).filter(CentroVotacion.codificacion_nueva_cv == db_elector.codigo_centro_votacion).first()
            geografico = db.query(Geografico).filter(
                Geografico.codigo_estado == db_elector.codigo_estado,
                Geografico.codigo_municipio == db_elector.codigo_municipio,
                Geografico.codigo_parroquia == db_elector.codigo_parroquia
            ).first()
            result = {
                "elector": to_dict(db_elector),
                "centro_votacion": to_dict(centro_votacion),
                "geografico": to_dict(geografico)
            }
            await redis.set(cache_key, json.dumps(result, default=custom_serializer), ex=60*60)
            return result
        return None

def to_dict(obj):
    if obj is None:
        return None
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}

def custom_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f'Type {obj.__class__.__name} not serializable')


router = APIRouter()

@router.get("/total/electores", response_model=int)
def get_total_electores(
    codigo_estado: Optional[int] = None,
    codigo_municipio: Optional[int] = None,
    codigo_parroquia: Optional[int] = None,
    codigo_centro_votacion: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Elector)
    
    if codigo_estado is not None:
        query = query.filter(Elector.codigo_estado == codigo_estado)
    if codigo_municipio is not None:
        query = query.filter(Elector.codigo_municipio == codigo_municipio)
    if codigo_parroquia is not None:
        query = query.filter(Elector.codigo_parroquia == codigo_parroquia)
    if codigo_centro_votacion is not None:
        query = query.filter(Elector.codigo_centro_votacion == codigo_centro_votacion)
    
    total = query.count()
    return total

@app.get("/electores/", response_model=List[ElectorList])
async def read_electores(
    skip: int = 0,
    limit: int = 100,
    codigo_estado: int = Query(None),
    codigo_municipio: int = Query(None),
    codigo_parroquia: int = Query(None),
    codigo_centro_votacion: int = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Elector)
    if codigo_estado:
        query = query.filter(Elector.codigo_estado == codigo_estado)
    if codigo_municipio:
        query = query.filter(Elector.codigo_municipio == codigo_municipio)
    if codigo_parroquia:
        query = query.filter(Elector.codigo_parroquia == codigo_parroquia)
    if codigo_centro_votacion:
        query = query.filter(Elector.codigo_centro_votacion == codigo_centro_votacion)

    electores = query.offset(skip).limit(limit).all()
    return [elector for elector in electores]

@app.get("/electores/{elector_id}", response_model=ElectorList)
async def read_elector(elector_id: int, db: Session = Depends(get_db)):
    elector = db.query(Elector).filter(Elector.id == elector_id).first()
    if not elector:
        raise HTTPException(status_code=404, detail="Elector not found")
    return elector

@app.get("/electores/cedula/{numero_cedula}", response_model=ElectorDetail)
async def read_elector_by_cedula(numero_cedula: int, db: Session = Depends(get_db)):
    result = await get_elector_by_cedula_from_cache(numero_cedula, db)
    if not result:
        raise HTTPException(status_code=404, detail="Elector not found")
    return result

@app.get("/electores/cedula_no_cache/{numero_cedula}", response_model=ElectorDetail)
async def read_elector_by_cedula_no_cache(numero_cedula: int, db: Session = Depends(get_db)):
    db_elector = db.query(Elector).filter(Elector.numero_cedula == numero_cedula).first()
    if db_elector:
        centro_votacion = db.query(CentroVotacion).filter(CentroVotacion.codificacion_nueva_cv == db_elector.codigo_centro_votacion).first()
        geografico = db.query(Geografico).filter(
            Geografico.codigo_estado == db_elector.codigo_estado,
            Geografico.codigo_municipio == db_elector.codigo_municipio,
            Geografico.codigo_parroquia == db_elector.codigo_parroquia
        ).first()
        result = {
            "elector": to_dict(db_elector),
            "centro_votacion": to_dict(centro_votacion),
            "geografico": to_dict(geografico)
        }
        return result
    else:
        raise HTTPException(status_code=404, detail="Elector not found")

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

@app.get("/stats/{stat_type}")
async def get_statistics(stat_type: str, db: Session = Depends(get_db)):
    valid_stats = ["estado", "municipio", "parroquia", "centro_votacion"]
    if stat_type not in valid_stats:
        raise HTTPException(status_code=400, detail="Invalid statistics type")
    stats = await get_statistics_from_cache(stat_type, db)
    return stats

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
        await redis.set(cache_key, json.dumps(stats_dict), ex=60*60)
        return stats_dict

# CRUD para Ticket

@app.get("/tickets/", response_model=list[TicketList])
async def read_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tickets = db.query(Ticket).offset(skip).limit(limit).all()
    return [to_dict(ticket) for ticket in tickets]

@app.get("/tickets/{ticket_id}", response_model=TicketList)
async def read_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return to_dict(ticket)

@app.post("/tickets/", response_model=TicketList)
async def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    db_ticket = Ticket(**ticket.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return to_dict(db_ticket)

@app.patch("/tickets/{ticket_id}", response_model=TicketList)
async def update_ticket(ticket_id: int, ticket: TicketUpdate, db: Session = Depends(get_db)):
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if "validado" in ticket.dict(exclude_unset=True):
        db_ticket.validado = ticket.validado
    if "ganador" in ticket.dict(exclude_unset=True):
        db_ticket.ganador = ticket.ganador
    db.commit()
    db.refresh(db_ticket)
    return to_dict(db_ticket)


@app.get("/tickets/estados", response_model=List[str])
async def get_estados(db: Session = Depends(get_db)):
    estados = db.query(distinct(Ticket.estado)).all()
    return [estado[0] for estado in estados]

@app.get("/tickets/municipios", response_model=List[str])
async def get_municipios(estado: str, db: Session = Depends(get_db)):
    municipios = db.query(distinct(Ticket.municipio)).filter(Ticket.estado == estado).all()
    return [municipio[0] for municipio in municipios]
# CRUD para Recolector

# CRUD para Recolector

@app.get("/recolectores/", response_model=list[RecolectorList])
async def read_recolectores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    recolectores = db.query(Recolector).offset(skip).limit(limit).all()
    return [to_dict(recolector) for recolector in recolectores]

@app.get("/recolectores/{recolector_id}", response_model=RecolectorList)
async def read_recolector(recolector_id: int, db: Session = Depends(get_db)):
    recolector = db.query(Recolector).filter(Recolector.id == recolector_id).first()
    if not recolector:
        raise HTTPException(status_code=404, detail="Recolector not found")
    return to_dict(recolector)

@app.post("/recolectores/", response_model=RecolectorList)
async def create_recolector(recolector: RecolectorCreate, db: Session = Depends(get_db)):
    db_recolector = Recolector(**recolector.model_dump())
    db.add(db_recolector)
    db.commit()
    db.refresh(db_recolector)
    return to_dict(db_recolector)

@app.delete("/recolectores/{recolector_id}", response_model=dict)
async def delete_recolector(recolector_id: int, db: Session = Depends(get_db)):
    recolector = db.query(Recolector).filter(Recolector.id == recolector_id).first()
    if not recolector:
        raise HTTPException(status_code=404, detail="Recolector not found")
    db.delete(recolector)
    db.commit()
    return {"message": "Recolector deleted successfully"}

@app.patch("/recolectores/{recolector_id}", response_model=RecolectorList)
async def update_recolector(recolector_id: int, recolector: RecolectorUpdate, db: Session = Depends(get_db)):
    db_recolector = db.query(Recolector).filter(Recolector.id == recolector_id).first()
    if not db_recolector:
        raise HTTPException(status_code=404, detail="Recolector not found")
    for key, value in recolector.dict(exclude_unset=True).items():
        setattr(db_recolector, key, value)
    db.commit()
    db.refresh(db_recolector)
    return to_dict(db_recolector)

@app.get("/recolectores/estadisticas/", response_model=List[RecolectorEstadisticas])
async def get_recolector_estadisticas(recolector_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = (
        db.query(
            Recolector.id,
            Recolector.nombre,
            func.count(Ticket.id).label("tickets_count")
        )
        .join(Ticket, Ticket.referido_id == Recolector.id, isouter=True)
        .group_by(Recolector.id, Recolector.nombre)
    )

    if recolector_id:
        query = query.filter(Recolector.id == recolector_id)

    estadisticas = query.all()
    
    return [{"recolector_id": est.id, "nombre": est.nombre, "tickets_count": est.tickets_count} for est in estadisticas]


def read_settings():
    try:
        with open("app/settings.json", "r") as file:
            return json.load(file)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Settings file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error decoding JSON from settings file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def write_settings(settings: dict):
    try:
        with open("app/settings.json", "w") as file:
            json.dump(settings, file, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get settings
@app.get("/api/settings")
async def get_settings():
    settings = read_settings()
    return JSONResponse(status_code=200, content=settings)

# Endpoint to update settings
@app.post("/api/settings")
async def update_settings(payload: dict):
    try:
        settings = read_settings()

        # Actualiza el valor de currentTemplate
        if "currentTemplate" in payload:
            settings["currentTemplate"] = payload["currentTemplate"]

        current_template = settings.get("currentTemplate")

        if not current_template:
            raise HTTPException(status_code=400, detail="currentTemplate not set in settings")

        if current_template not in settings:
            raise HTTPException(status_code=400, detail=f"Template {current_template} not found in settings")

        # Update the correct template
        template_settings = settings[current_template]
        for section_key, section_value in payload.get(current_template, {}).items():
            if section_key in template_settings:
                if isinstance(template_settings[section_key], dict) and isinstance(section_value, dict):
                    template_settings[section_key].update(section_value)
                else:
                    template_settings[section_key] = section_value
            else:
                template_settings[section_key] = section_value

        write_settings(settings)
        return JSONResponse(status_code=200, content={"message": "Settings saved"})
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})




class UpdateHTMLSettings(BaseModel):
    title: str
    description: str
    faviconUrl: str
    

BASE_DIR = Path(__file__).resolve().parent

@app.post("/api/update-html")
async def update_html(settings: UpdateHTMLSettings):
    try:
        # Path to index.html
        html_path = BASE_DIR / "frontend/out/index.html"
        with open(html_path, 'r', encoding='utf-8') as file:
            html_content = file.read()

        # Update the index.html file
        html_content = re.sub(r'<title>.*?</title>', f'<title>{settings.title}</title>', html_content)
        html_content = re.sub(
            r'<meta name="description" content=".*?"/>',
            f'<meta name="description" content="{settings.description}"/>',
            html_content
        )
        html_content = re.sub(
            r'<link rel="icon" href=".*?" type="image/x-icon"/>',
            f'<link rel="icon" href="{settings.faviconUrl}" type="image/x-icon"/>',
            html_content
        )
        
        with open(html_path, 'w', encoding='utf-8') as file:
            file.write(html_content)
        
        # Update the _next directory files
        _next_dir = BASE_DIR / "frontend/out/_next/static/chunks/app"
        for root, _, files in os.walk(_next_dir):
            for name in files:
                if name.endswith(".js"):
                    file_path = os.path.join(root, name)
                    with open(file_path, 'r', encoding='utf-8') as file:
                        file_content = file.read()
                    
                    # Update the JavaScript content
                    file_content = re.sub(
                        r'title:t.title\|\|"[^"]+"',
                        f'title:t.title||"{settings.title}"',
                        file_content
                    )
                    file_content = re.sub(
                        r'description:t.description\|\|"[^"]+"',
                        f'description:t.description||"{settings.description}"',
                        file_content
                    )
                    file_content = re.sub(
                        r'faviconUrl:t.faviconUrl\|\|"[^"]+"',
                        f'faviconUrl:t.faviconUrl||"{settings.faviconUrl}"',
                        file_content
                    )
                    
                    with open(file_path, 'w', encoding='utf-8') as file:
                        file.write(file_content)

        return {"message": "HTML and chunks updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UserCreate(BaseModel):
    username: str
    email: str
    isAdmin: bool
    password: str

# Crear usuario
# Crear usuario
@app.post("/api/users", response_model=UserList)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    hashed_password = generate_password_hash(user.password)
    new_user = Users(
        username=user.username,
        email=user.email,
        isAdmin=user.isAdmin,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Leer usuario por ID
@app.get("/api/users/{user_id}", response_model=UserList)
async def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Leer todos los usuarios
@app.get("/api/users", response_model=list[UserList])
async def get_users(db: Session = Depends(get_db)):
    users = db.query(Users).all()
    return users

# Actualizar usuario
@app.put("/api/users/{user_id}", response_model=UserList)
async def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(Users).filter(Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    hashed_password = generate_password_hash(user.password)
    db_user.username = user.username
    db_user.email = user.email
    db_user.hashed_password = hashed_password
    db_user.isAdmin = user.isAdmin
    db_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)
    return db_user

# Eliminar usuario
@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(Users).filter(Users.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

# Login de usuario
@app.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.username == form_data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    if not check_password_hash(user.hashed_password, form_data.password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "isAdmin": user.isAdmin}

# Logout de usuario
@app.post("/api/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    return {"message": "User logged out successfully"}





# Example endpoint
@app.get("/estados/", response_model=list[GeograficoList])
async def read_estados(db: Session = Depends(get_db)):
    estados = db.query(Geografico.codigo_estado, Geografico.estado).distinct().all()
    return [{"codigo_estado": estado[0], "estado": estado[1], "codigo_municipio": None, "codigo_parroquia": None, "municipio": None, "parroquia": None, "id": i} for i, estado in enumerate(estados)]

@app.get("/municipios/{codigo_estado}", response_model=list[GeograficoList])
async def read_municipios(codigo_estado: int, db: Session = Depends(get_db)):
    municipios = db.query(Geografico.codigo_municipio, Geografico.municipio).filter(Geografico.codigo_estado == codigo_estado).distinct().all()
    return [{"codigo_municipio": municipio[0], "municipio": municipio[1], "codigo_estado": codigo_estado, "codigo_parroquia": None, "estado": None, "parroquia": None, "id": i} for i, municipio in enumerate(municipios)]

@app.get("/parroquias/{codigo_estado}/{codigo_municipio}", response_model=list[GeograficoList])
async def read_parroquias(codigo_estado: int, codigo_municipio: int, db: Session = Depends(get_db)):
    parroquias = db.query(Geografico.codigo_parroquia, Geografico.parroquia).filter(Geografico.codigo_estado == codigo_estado, Geografico.codigo_municipio == codigo_municipio).distinct().all()
    return [{"codigo_parroquia": parroquia[0], "parroquia": parroquia[1], "codigo_estado": codigo_estado, "codigo_municipio": codigo_municipio, "estado": None, "municipio": None, "id": i} for i, parroquia in enumerate(parroquias)]

@app.get("/centros_votacion/{codigo_estado}/{codigo_municipio}/{codigo_parroquia}", response_model=List[CentroVotacionList])
async def read_centros_votacion(codigo_estado: int, codigo_municipio: int, codigo_parroquia: int, db: Session = Depends(get_db)):
    centros = db.query(CentroVotacion).filter(
        CentroVotacion.codigo_estado == codigo_estado,
        CentroVotacion.codigo_municipio == codigo_municipio,
        CentroVotacion.codigo_parroquia == codigo_parroquia
    ).distinct().all()
    
    return [
        CentroVotacionList(
            id=centro.id,
            codificacion_vieja_cv=str(centro.codificacion_vieja_cv),
            codificacion_nueva_cv=str(centro.codificacion_nueva_cv),
            condicion=str(centro.condicion),
            codigo_estado=centro.codigo_estado,
            codigo_municipio=centro.codigo_municipio,
            codigo_parroquia=centro.codigo_parroquia,
            nombre_cv=centro.nombre_cv,
            direccion_cv=centro.direccion_cv
        )
        for centro in centros
    ]
    
    
@app.get("/lineas_telefonicas/", response_model=list[LineaTelefonicaList])
async def read_lineas_telefonicas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    lineas_telefonicas = db.query(LineaTelefonica).offset(skip).limit(limit).all()
    return lineas_telefonicas

@app.get("/lineas_telefonicas/{linea_telefonica_id}", response_model=LineaTelefonicaList)
async def read_linea_telefonica(linea_telefonica_id: int, db: Session = Depends(get_db)):
    linea_telefonica = db.query(LineaTelefonica).filter(LineaTelefonica.id == linea_telefonica_id).first()
    if not linea_telefonica:
        raise HTTPException(status_code=404, detail="LineaTelefonica not found")
    return linea_telefonica

@app.post("/lineas_telefonicas/", response_model=LineaTelefonicaList)
async def create_linea_telefonica(linea_telefonica: LineaTelefonicaCreate, db: Session = Depends(get_db)):
    db_linea_telefonica = LineaTelefonica(**linea_telefonica.dict())
    db.add(db_linea_telefonica)
    db.commit()
    db.refresh(db_linea_telefonica)
    return db_linea_telefonica

@app.patch("/lineas_telefonicas/{linea_telefonica_id}", response_model=LineaTelefonicaList)
async def update_linea_telefonica(linea_telefonica_id: int, linea_telefonica: LineaTelefonicaUpdate, db: Session = Depends(get_db)):
    db_linea_telefonica = db.query(LineaTelefonica).filter(LineaTelefonica.id == linea_telefonica_id).first()
    if not db_linea_telefonica:
        raise HTTPException(status_code=404, detail="LineaTelefonica not found")
    db_linea_telefonica.numero = linea_telefonica.numero
    db_linea_telefonica.operador = linea_telefonica.operador
    db.commit()
    db.refresh(db_linea_telefonica)
    return db_linea_telefonica

@app.delete("/lineas_telefonicas/{linea_telefonica_id}", response_model=LineaTelefonicaList)
async def delete_linea_telefonica(linea_telefonica_id: int, db: Session = Depends(get_db)):
    db_linea_telefonica = db.query(LineaTelefonica).filter(LineaTelefonica.id == linea_telefonica_id).first()
    if not db_linea_telefonica:
        raise HTTPException(status_code=404, detail="LineaTelefonica not found")
    db.delete(db_linea_telefonica)
    db.commit()
    return db_linea_telefonica



class SorteoRequest(BaseModel):
    cantidad_ganadores: int
    estado: Optional[str]
    municipio: Optional[str]

@app.post("/sorteo/ganadores", response_model=List[TicketList])
async def sorteo_ganadores(request: SorteoRequest, db: Session = Depends(get_db)):
    query = db.query(Ticket).filter(Ticket.validado == True, Ticket.ganador == False)
    
    if request.estado:
        query = query.filter(Ticket.estado == request.estado)
    
    if request.municipio:
        query = query.filter(Ticket.municipio == request.municipio)
    
    tickets_validos = query.all()
    
    if len(tickets_validos) < request.cantidad_ganadores:
        return JSONResponse(
            status_code=400,
            content={"message": "No hay suficientes tickets válidos para seleccionar la cantidad de ganadores solicitada"}
        )

    ganadores = random.sample(tickets_validos, request.cantidad_ganadores)

    for ganador in ganadores:
        ganador.ganador = True
        db.commit()
        db.refresh(ganador)
    
    return ganadores

@app.post("/sorteo/quitar_ganadores")
async def quitar_ganadores(db: Session = Depends(get_db)):
    tickets_ganadores = db.query(Ticket).filter(Ticket.ganador == True).all()
    for ticket in tickets_ganadores:
        ticket.ganador = False
        db.commit()
        db.refresh(ticket)
    return {"message": "Marca de ganadores eliminada de todos los tickets"}

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
