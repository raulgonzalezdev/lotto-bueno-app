# main.py
import os
import random
import string
import qrcode
import json
import base64
import requests
import jwt

from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from io import BytesIO
from fastapi import FastAPI, HTTPException, Depends, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from werkzeug.security import generate_password_hash, check_password_hash
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, date
from redis.asyncio import Redis
from app.database import SessionLocal
from app.models import Elector, Geografico, CentroVotacion, Ticket, Recolector, Users
from app.schemas import ElectorList,UserCreate, UserList, GeograficoList, CentroVotacionList, ElectorCreate, GeograficoCreate, CentroVotacionCreate, ElectorDetail, TicketCreate, TicketList, RecolectorCreate, RecolectorList
from dotenv import load_dotenv


load_dotenv()

app = FastAPI()

# Configuración de CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:3000",
    "http://localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL_BASE = os.getenv("API_URL_BASE")
API_TOKEN = os.getenv("API_TOKEN")
REDIS_URL = os.getenv("REDIS_URL")
FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "J-yMKNjjVaUJUj-vC-cAun_qlyXH68p55er0WIlgFuo")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

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
    

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

@app.post("/verificar_cedula")
def verificar_cedula(request: CedulaRequest):
    numero_cedula = request.numero_cedula
    url = f"{FASTAPI_BASE_URL}/electores/cedula/{numero_cedula}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if not data["elector"]:
            raise HTTPException(status_code=404, detail="Cédula no encontrada")
        return data
    except requests.exceptions.HTTPError as http_err:
        raise HTTPException(status_code=response.status_code, detail=str(http_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail="Error al conectar con el servicio de verificación de cédulas")


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

@app.post("/generate_ticket")
def api_generate_ticket(request: TicketRequest, db: Session = Depends(get_db)):
    # Verificar si el número de WhatsApp es válido
    whatsapp_check = check_whatsapp(request.telefono)
    if "status" in whatsapp_check:
        raise HTTPException(status_code=400, detail="El número no tiene WhatsApp")
    
    # Verificar la cédula usando la función verificar_cedula
    try:
        elector_response = verificar_cedula(CedulaRequest(numero_cedula=request.cedula))
        if not elector_response.get("elector"):
            # Enviar mensaje de texto por WhatsApp indicando que la cédula no es válida
            message = "La cédula proporcionada no es válida para participar en Lotto Bueno."
            send_message(request.telefono, message)
            raise HTTPException(status_code=400, detail="La cédula no es válida")
    except HTTPException as e:
        # Enviar mensaje de texto por WhatsApp indicando que la cédula no es válida
        message = "La cédula proporcionada no es válida para participar en Lotto Bueno."
        send_message(request.telefono, message)
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
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
        raise HTTPException(status_code=500, detail=send_result["message"])

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
        validado=False
    )
    
    db_ticket = Ticket(**new_ticket.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    # Enviar mensaje de texto por WhatsApp con el ID del nuevo ticket
    message = f"Hola. {db_ticket.nombre} Apartir de este momento.  Estás participando en Lotto Bueno con el ID de ticket: {db_ticket.id}"
    send_message(request.telefono, message)
    
        # Enviar contacto de la empresa
    send_contact(request.telefono)

    return {
        "ticket_number": ticket_number,
        "qr_code": qr_code_base64
    }

def send_contact(chat_id):
    phone_contact = os.getenv("COMPANY_PHONE_CONTACT", "584129476026")  # Variable de ambiente para el número de contacto de la empresa
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

@app.get("/electores/", response_model=list[ElectorList])
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
    await redis.delete(f"elector:{db_elector.id}")
    return to_dict(db_elector)

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


# Endpoint to get settings
@app.get("/api/settings")
async def get_settings():
    try:
        settings = read_settings()
        return JSONResponse(status_code=200, content=settings)
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"error": "Settings file not found"})
    except json.JSONDecodeError:
        return JSONResponse(status_code=500, content={"error": "Error decoding JSON from settings file"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

def read_settings():
    with open("app/settings.json", "r") as file:
        return json.load(file)

# Endpoint to update settings
@app.post("/api/settings")
async def update_settings(payload: dict):
    try:
        settings = read_settings()
        settings.update(payload)
        write_settings(settings)
        return JSONResponse(status_code=200, content={"message": "Settings saved"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

def write_settings(settings: dict):
    with open("app/settings.json", "w") as file:
        json.dump(settings, file, indent=4)



class UserCreate(BaseModel):
    username: str
    email: str
    password: str

# Crear usuario
# Crear usuario
@app.post("/api/users", response_model=UserList)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    hashed_password = generate_password_hash(user.password)
    new_user = Users(
        username=user.username,
        email=user.email,
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
    return {"access_token": access_token, "token_type": "bearer"}

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

@app.get("/centros_votacion/{codigo_estado}/{codigo_municipio}/{codigo_parroquia}", response_model=list[CentroVotacionList])
async def read_centros_votacion(codigo_estado: int, codigo_municipio: int, codigo_parroquia: int, db: Session = Depends(get_db)):
    centros = db.query(CentroVotacion).filter(
        CentroVotacion.codigo_estado == codigo_estado,
        CentroVotacion.codigo_municipio == codigo_municipio,
        CentroVotacion.codigo_parroquia == codigo_parroquia
    ).distinct().all()
    return [centro for centro in centros]

router = APIRouter()

@router.get("/electores/total", response_model=int)
def get_total_electores(
    codigo_estado: Optional[int] = None,
    codigo_municipio: Optional[int] = None,
    codigo_parroquia: Optional[int] = None,
    codigo_centro_votacion: Optional[int] = None,
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
    
    total = query.count()
    return total


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
