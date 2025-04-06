import os
import json
import logging
import requests
import uuid
import time
import hashlib
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta

# Configuración de logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("google_sms")

class GoogleCloudSMS:
    """
    Clase para manejar la integración con Google Cloud Communications API para envío de SMS
    """
    
    def __init__(self):
        """Inicializa la configuración para la API de Google Cloud Communications"""
        self.project_id = os.getenv("GOOGLE_PROJECT_ID")
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.sms_shortcode = os.getenv("SMS_SHORTCODE", "77111")
        self.provider_url = os.getenv("SMS_PROVIDER_URL", "https://ccaiplatform.com")
        self.subdomain = os.getenv("SMS_SUBDOMAIN", "lottobueno")
        self.max_retries = int(os.getenv("SMS_MAX_RETRIES", "3"))
        self.retry_delay = float(os.getenv("SMS_RETRY_DELAY", "2.0"))
        
        # Verificar si faltan credenciales
        if not self.project_id or not self.client_id or not self.client_secret:
            missing = []
            if not self.project_id: missing.append("GOOGLE_PROJECT_ID")
            if not self.client_id: missing.append("GOOGLE_CLIENT_ID")
            if not self.client_secret: missing.append("GOOGLE_CLIENT_SECRET")
            
            warning_msg = f"⚠️ ADVERTENCIA: Faltan credenciales de Google Cloud: {', '.join(missing)}. "
            warning_msg += "El envío de SMS no funcionará hasta que se configuren."
            logger.warning(warning_msg)
            print(warning_msg)
        
        self.base_url = f"https://{self.subdomain}.{self.provider_url}/apps/api/v1"
        self.token = None
        self.token_expires_at = 0
        
        # Cache para mensajes enviados
        self._message_cache = {}
        # Cache para conversaciones
        self._conversation_cache = {}
        
    def _get_auth_token(self) -> str:
        """
        Obtiene un token de autenticación para la API con manejo de caché
        
        Returns:
            str: Token de autenticación
        """
        # Si ya tenemos un token válido, lo retornamos
        if self.token and time.time() < self.token_expires_at:
            return self.token
            
        # URL para obtener token
        token_url = "https://oauth2.googleapis.com/token"
        
        # Payload para el token
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
            "scope": "https://www.googleapis.com/auth/cloud-platform"
        }
        
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Obteniendo token de autenticación (intento {attempt+1})")
                response = requests.post(token_url, data=data, timeout=10)
                response.raise_for_status()
                token_data = response.json()
                
                # Guardar token y su tiempo de expiración
                self.token = token_data.get("access_token")
                # Establecer expiración 5 minutos antes para evitar problemas
                expires_in = token_data.get("expires_in", 3600) - 300
                self.token_expires_at = time.time() + expires_in
                
                logger.info(f"Token obtenido exitosamente, válido por {expires_in} segundos")
                return self.token
            except Exception as e:
                logger.error(f"Error al obtener token (intento {attempt+1}): {str(e)}")
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)  # Retraso exponencial
                    logger.info(f"Reintentando en {wait_time} segundos...")
                    time.sleep(wait_time)
                else:
                    logger.error("Se agotaron los reintentos para obtener token")
                    raise
    
    def _generate_message_id(self, to_phone: str, message: str) -> str:
        """
        Genera un ID único para un mensaje
        
        Args:
            to_phone (str): Número de teléfono del destinatario
            message (str): Contenido del mensaje
            
        Returns:
            str: ID único para el mensaje
        """
        # Crear un hash basado en el número, mensaje y timestamp
        base = f"{to_phone}:{message}:{time.time()}"
        hash_obj = hashlib.md5(base.encode())
        return f"client-{hash_obj.hexdigest()[:16]}"
    
    def _get_conversation_id(self, phone: str) -> str:
        """
        Obtiene o crea un ID de conversación para un número de teléfono
        
        Args:
            phone (str): Número de teléfono
            
        Returns:
            str: ID de conversación
        """
        # Normalizar el número de teléfono
        formatted_phone = self._format_phone_number(phone)
        
        # Si ya existe una conversación para este número, retornarla
        if formatted_phone in self._conversation_cache:
            return self._conversation_cache[formatted_phone]
            
        # Crear un nuevo ID de conversación
        conversation_id = f"conv-{uuid.uuid4().hex[:12]}"
        self._conversation_cache[formatted_phone] = conversation_id
        
        logger.info(f"Nueva conversación creada: {conversation_id} para {formatted_phone}")
        return conversation_id
    
    def send_sms(self, to_phone: str, message: str, thread_key: Optional[str] = None, 
                 retry_on_failure: bool = True) -> Dict[str, Any]:
        """
        Envía un mensaje SMS a un número específico
        
        Args:
            to_phone (str): Número de teléfono del destinatario
            message (str): Mensaje a enviar
            thread_key (Optional[str]): Clave de conversación para agrupar mensajes
            retry_on_failure (bool): Si debe reintentar en caso de fallos
            
        Returns:
            Dict[str, Any]: Respuesta de la API
        """
        # Asegurar que el número tenga el formato correcto
        formatted_phone = self._format_phone_number(to_phone)
        
        # Generar un ID de mensaje único
        message_id = self._generate_message_id(to_phone, message)
        
        # Si no se proporciona thread_key, usar o crear uno basado en el número
        if not thread_key:
            thread_key = self._get_conversation_id(to_phone)
            
        # Registrar el mensaje en caché
        timestamp = datetime.now().isoformat()
        self._message_cache[message_id] = {
            "phone": to_phone,
            "message": message,
            "thread_key": thread_key,
            "timestamp": timestamp,
            "status": "pending"
        }
            
        logger.info(f"Preparando envío de SMS a {to_phone} (ID: {message_id}, Conversación: {thread_key})")
        
        # Iniciar proceso de envío con reintentos
        max_attempts = self.max_retries if retry_on_failure else 1
        
        for attempt in range(max_attempts):
            try:
                # Obtener token de autenticación
                token = self._get_auth_token()
                
                # Endpoint para enviar SMS
                url = f"{self.base_url}/sessionless_sms"
                
                # Headers con token de autenticación
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Message-ID": message_id,
                    "X-Thread-Key": thread_key
                }
                
                # Payload para el SMS
                payload = {
                    "from_phone": self.sms_shortcode,
                    "to_phones": [formatted_phone],
                    "messages": [message],
                    "message_id": message_id,
                    "thread_key": thread_key
                }
                
                logger.info(f"Enviando SMS (intento {attempt+1}): {message_id}")
                response = requests.post(url, headers=headers, json=payload, timeout=15)
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"SMS enviado exitosamente a {to_phone}, ID: {message_id}, Request ID: {result.get('request_id', 'N/A')}")
                
                # Actualizar estado en caché
                self._message_cache[message_id]["status"] = "delivered"
                self._message_cache[message_id]["delivered_at"] = datetime.now().isoformat()
                self._message_cache[message_id]["request_id"] = result.get("request_id")
                
                return {
                    "success": True,
                    "message": "Mensaje enviado exitosamente",
                    "message_id": message_id,
                    "thread_key": thread_key,
                    "request_id": result.get("request_id"),
                    "details": result
                }
                
            except requests.HTTPError as http_err:
                error_msg = f"Error HTTP al enviar SMS (intento {attempt+1}): {http_err}"
                if response.text:
                    try:
                        error_details = response.json()
                        error_msg = f"{error_msg}. Detalles: {error_details}"
                    except Exception:
                        error_msg = f"{error_msg}. Respuesta: {response.text}"
                
                logger.error(error_msg)
                
                # Si hay más intentos disponibles, esperar y reintentar
                if attempt < max_attempts - 1 and retry_on_failure:
                    wait_time = self.retry_delay * (2 ** attempt)  # Retraso exponencial
                    logger.info(f"Reintentando en {wait_time} segundos...")
                    time.sleep(wait_time)
                else:
                    # Actualizar estado en caché
                    self._message_cache[message_id]["status"] = "failed"
                    self._message_cache[message_id]["error"] = error_msg
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "message_id": message_id,
                        "thread_key": thread_key
                    }
                
            except Exception as e:
                error_msg = f"Error al enviar SMS (intento {attempt+1}): {str(e)}"
                logger.error(error_msg)
                
                # Si hay más intentos disponibles, esperar y reintentar
                if attempt < max_attempts - 1 and retry_on_failure:
                    wait_time = self.retry_delay * (2 ** attempt)  # Retraso exponencial
                    logger.info(f"Reintentando en {wait_time} segundos...")
                    time.sleep(wait_time)
                else:
                    # Actualizar estado en caché
                    self._message_cache[message_id]["status"] = "failed"
                    self._message_cache[message_id]["error"] = error_msg
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "message_id": message_id,
                        "thread_key": thread_key
                    }
    
    def send_bulk_sms(self, to_phones: List[str], message: str, 
                     batch_size: int = 25, retry_on_failure: bool = True) -> Dict[str, Any]:
        """
        Envía un mensaje SMS a múltiples números con procesamiento por lotes
        
        Args:
            to_phones (List[str]): Lista de números de teléfono de destinatarios
            message (str): Mensaje a enviar
            batch_size (int): Tamaño del lote para envíos masivos
            retry_on_failure (bool): Si debe reintentar en caso de fallos
            
        Returns:
            Dict[str, Any]: Respuesta de la API con resultados por número
        """
        # Validar que no se excedan los límites de la API
        if len(message) > 320:
            return {
                "success": False,
                "error": "El mensaje no puede exceder los 320 caracteres",
                "results": []
            }
            
        start_time = time.time()
        logger.info(f"Iniciando envío masivo de SMS a {len(to_phones)} números")
        
        # Procesar los números en lotes
        results = []
        success_count = 0
        fail_count = 0
        
        # ID de grupo para este envío masivo
        batch_id = f"batch-{uuid.uuid4().hex[:8]}"
        
        # Dividir los números en lotes para evitar sobrecargar la API
        for i in range(0, len(to_phones), batch_size):
            batch = to_phones[i:i + batch_size]
            logger.info(f"Procesando lote {i//batch_size + 1} de {len(to_phones)//batch_size + 1} ({len(batch)} números)")
            
            # Enviar mensajes en este lote
            batch_results = self._send_batch(batch, message, batch_id, retry_on_failure)
            
            # Procesar resultados de este lote
            for result in batch_results:
                results.append(result)
                if result.get("success"):
                    success_count += 1
                else:
                    fail_count += 1
        
        elapsed_time = time.time() - start_time
        logger.info(f"Envío masivo completado en {elapsed_time:.2f} segundos. Éxitos: {success_count}, Fallos: {fail_count}")
        
        return {
            "success": fail_count == 0,
            "message": f"Envío masivo completado. {success_count} exitosos, {fail_count} fallidos",
            "batch_id": batch_id,
            "results": results,
            "summary": {
                "total": len(to_phones),
                "success": success_count,
                "failed": fail_count,
                "elapsed_time": f"{elapsed_time:.2f} segundos"
            }
        }
    
    def _send_batch(self, phones: List[str], message: str, batch_id: str, 
                  retry_on_failure: bool = True) -> List[Dict[str, Any]]:
        """
        Envía un lote de mensajes a los números especificados
        
        Args:
            phones (List[str]): Lista de números de teléfono para este lote
            message (str): Mensaje a enviar
            batch_id (str): ID del lote para agrupación
            retry_on_failure (bool): Si debe reintentar en caso de fallos
            
        Returns:
            List[Dict[str, Any]]: Resultados para cada número en el lote
        """
        if not phones:
            return []
            
        # Si solo hay un número, usar envío individual
        if len(phones) == 1:
            result = self.send_sms(phones[0], message, thread_key=f"thread-{batch_id}", retry_on_failure=retry_on_failure)
            return [{
                "phone": phones[0],
                "success": result.get("success", False),
                "message": result.get("message", ""),
                "error": result.get("error", ""),
                "message_id": result.get("message_id", ""),
                "thread_key": result.get("thread_key", ""),
                "request_id": result.get("request_id", "")
            }]
        
        # Preparar para envío masivo
        formatted_phones = [self._format_phone_number(phone) for phone in phones]
        message_ids = {phone: self._generate_message_id(phone, message) for phone in phones}
        
        # Registrar mensajes en caché
        timestamp = datetime.now().isoformat()
        for phone in phones:
            message_id = message_ids[phone]
            thread_key = f"thread-{batch_id}"
            self._message_cache[message_id] = {
                "phone": phone,
                "message": message,
                "thread_key": thread_key,
                "timestamp": timestamp,
                "status": "pending",
                "batch_id": batch_id
            }
        
        # Iniciar proceso de envío con reintentos
        max_attempts = self.max_retries if retry_on_failure else 1
        
        for attempt in range(max_attempts):
            try:
                # Obtener token de autenticación
                token = self._get_auth_token()
                
                # Endpoint para enviar SMS masivos
                url = f"{self.base_url}/sessionless_sms"
                
                # Headers con token de autenticación
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Batch-ID": batch_id
                }
                
                # Payload para los SMS masivos
                payload = {
                    "from_phone": self.sms_shortcode,
                    "to_phones": formatted_phones,
                    "messages": [message],
                    "batch_id": batch_id
                }
                
                logger.info(f"Enviando lote de {len(phones)} SMS (intento {attempt+1}): {batch_id}")
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"Lote de SMS enviado exitosamente a {len(phones)} números, ID: {batch_id}, Request ID: {result.get('request_id', 'N/A')}")
                
                # Actualizar estado en caché para todos los mensajes en este lote
                for phone in phones:
                    message_id = message_ids[phone]
                    self._message_cache[message_id]["status"] = "delivered"
                    self._message_cache[message_id]["delivered_at"] = datetime.now().isoformat()
                    self._message_cache[message_id]["request_id"] = result.get("request_id")
                
                # Construir resultados detallados
                detailed_results = []
                for phone in phones:
                    message_id = message_ids[phone]
                    detailed_results.append({
                        "phone": phone,
                        "success": True,
                        "message": "Mensaje enviado exitosamente",
                        "message_id": message_id,
                        "thread_key": f"thread-{batch_id}",
                        "request_id": result.get("request_id")
                    })
                
                return detailed_results
                
            except requests.HTTPError as http_err:
                error_msg = f"Error HTTP al enviar lote de SMS (intento {attempt+1}): {http_err}"
                if response.text:
                    try:
                        error_details = response.json()
                        error_msg = f"{error_msg}. Detalles: {error_details}"
                    except Exception:
                        error_msg = f"{error_msg}. Respuesta: {response.text}"
                
                logger.error(error_msg)
                
                # Si hay más intentos disponibles, esperar y reintentar
                if attempt < max_attempts - 1 and retry_on_failure:
                    wait_time = self.retry_delay * (2 ** attempt)  # Retraso exponencial
                    logger.info(f"Reintentando en {wait_time} segundos...")
                    time.sleep(wait_time)
                else:
                    # Actualizar estado en caché para todos los mensajes en este lote
                    for phone in phones:
                        message_id = message_ids[phone]
                        self._message_cache[message_id]["status"] = "failed"
                        self._message_cache[message_id]["error"] = error_msg
                    
                    # Construir resultados de error
                    error_results = []
                    for phone in phones:
                        message_id = message_ids[phone]
                        error_results.append({
                            "phone": phone,
                            "success": False,
                            "error": error_msg,
                            "message_id": message_id,
                            "thread_key": f"thread-{batch_id}"
                        })
                    
                    return error_results
                
            except Exception as e:
                error_msg = f"Error al enviar lote de SMS (intento {attempt+1}): {str(e)}"
                logger.error(error_msg)
                
                # Si hay más intentos disponibles, esperar y reintentar
                if attempt < max_attempts - 1 and retry_on_failure:
                    wait_time = self.retry_delay * (2 ** attempt)  # Retraso exponencial
                    logger.info(f"Reintentando en {wait_time} segundos...")
                    time.sleep(wait_time)
                else:
                    # Actualizar estado en caché para todos los mensajes en este lote
                    for phone in phones:
                        message_id = message_ids[phone]
                        self._message_cache[message_id]["status"] = "failed"
                        self._message_cache[message_id]["error"] = error_msg
                    
                    # Construir resultados de error
                    error_results = []
                    for phone in phones:
                        message_id = message_ids[phone]
                        error_results.append({
                            "phone": phone,
                            "success": False,
                            "error": error_msg,
                            "message_id": message_id,
                            "thread_key": f"thread-{batch_id}"
                        })
                    
                    return error_results
    
    def get_message_status(self, message_id: str) -> Dict[str, Any]:
        """
        Obtiene el estado de un mensaje específico
        
        Args:
            message_id (str): ID del mensaje
            
        Returns:
            Dict[str, Any]: Información del mensaje
        """
        if message_id in self._message_cache:
            return {
                "exists": True,
                "details": self._message_cache[message_id]
            }
        else:
            return {
                "exists": False,
                "error": "Mensaje no encontrado"
            }
    
    def get_conversation_messages(self, thread_key: str) -> Dict[str, Any]:
        """
        Obtiene todos los mensajes de una conversación
        
        Args:
            thread_key (str): Clave de la conversación
            
        Returns:
            Dict[str, Any]: Mensajes de la conversación
        """
        messages = []
        
        for message_id, message_data in self._message_cache.items():
            if message_data.get("thread_key") == thread_key:
                messages.append({
                    "message_id": message_id,
                    **message_data
                })
        
        # Ordenar por timestamp
        messages.sort(key=lambda m: m.get("timestamp", ""))
        
        return {
            "thread_key": thread_key,
            "messages": messages,
            "count": len(messages)
        }
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Formatea un número de teléfono al formato requerido por la API
        
        Args:
            phone (str): Número de teléfono a formatear
            
        Returns:
            str: Número de teléfono formateado
        """
        # Eliminar todos los caracteres no numéricos
        digits_only = ''.join(filter(str.isdigit, phone))
        
        # Para números venezolanos, asegurar el formato internacional correcto
        if digits_only.startswith('0'):
            # Si comienza con 0, reemplazar por 58
            formatted = f"+58{digits_only[1:]}"
        elif digits_only.startswith('58'):
            # Si ya comienza con 58 (código de país), agregar +
            formatted = f"+{digits_only}"
        elif len(digits_only) == 10:
            # Asumir que es un número sin código de país
            formatted = f"+58{digits_only}"
        else:
            # Por defecto, agregar + al inicio
            formatted = f"+{digits_only}"
            
        return formatted 