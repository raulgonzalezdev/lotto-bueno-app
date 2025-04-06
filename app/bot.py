import os
import sys
from pathlib import Path
import random
import base64
import json
import asyncio
import time
import re
from io import BytesIO
import requests

# Añadir el directorio donde se encuentra whatsapp_chatbot_python al PYTHONPATH
sys.path.append(str(Path(__file__).resolve().parent.parent))

from whatsapp_chatbot_python import GreenAPIBot, Notification
from fastapi import HTTPException
from app.schemas import CedulaRequest
from app.main import get_db, send_message, send_qr_code, obtener_numero_contacto, enviar_contacto, verificar_cedula

API_INSTANCE = os.getenv("API_INSTANCE", "7103942544")
API_TOKEN = os.getenv("API_TOKEN", "1b64dc5c3ccc4d9aa01265ce553b874784d414aa81d64777a0")
NEXT_PUBLIC_API_URL = os.getenv("NEXT_PUBLIC_API_URL", "https://applottobueno.com")
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://applottobueno.com")
TELEGRAM_CHANNEL = os.getenv("TELEGRAM_CHANNEL", "https://t.me/applottobueno")

# Constante para el tiempo máximo de inactividad (5 minutos)
MAX_INACTIVITY_TIME_SECONDS = 300

# Diccionario para almacenar el último tiempo de interacción de cada usuario
user_last_interaction = {}

bot = GreenAPIBot(API_INSTANCE, API_TOKEN)

def extract_cedula(text):
    """
    Extrae el número de cédula de un texto.
    Busca un número que tenga entre 6 y 10 dígitos.
    """
    if not text:
        return None
        
    # Eliminar /start si está presente
    text = text.replace("/start", "")
    
    # Buscar patrones de cédula (números de 6-10 dígitos)
    cedula_matches = re.findall(r'\b\d{6,10}\b', text)
    
    if cedula_matches:
        # Tomar el primer número que parece una cédula
        return cedula_matches[0]
    
    # Si no encuentra números que parezcan cédula, intentar limpiar y extraer solo dígitos
    digits_only = ''.join(filter(str.isdigit, text))
    if len(digits_only) >= 6:
        return digits_only[:10]  # Limitar a 10 dígitos máximo
        
    return None

def extract_phone_number(text):
    """
    Extrae un número de teléfono de un texto y lo formatea para la API.
    El formato final debe ser 584XXXXXXXXX (12 dígitos).
    """
    if not text:
        return None
    
    # Eliminar espacios, guiones y paréntesis
    text = re.sub(r'[\s\-\(\)]', '', text)
    
    # Extraer solo los dígitos
    digits_only = ''.join(filter(str.isdigit, text))
    
    # Manejar diferentes formatos
    if len(digits_only) >= 10:
        # Si comienza con 58, verificar que tenga al menos 12 dígitos
        if digits_only.startswith('58'):
            # Verificar que después del 58 tenga un código de operadora válido
            if re.match(r'^58(412|414|416|424|426)', digits_only):
                return digits_only[:12]  # Tomar solo los primeros 12 dígitos
            else:
                return None
        
        # Si comienza con 0, quitar el 0 y agregar 58
        elif digits_only.startswith('0'):
            # Verificar que sea una operadora venezolana válida
            if re.match(r'^0(412|414|416|424|426)', digits_only):
                return '58' + digits_only[1:11]  # Formato: 58 + 10 dígitos sin el 0
            else:
                return None
        
        # Si comienza directamente con el código de operadora (sin 0)
        elif re.match(r'^(412|414|416|424|426)', digits_only):
            return '58' + digits_only[:10]  # Formato: 58 + 10 dígitos
        
        # Otros casos no válidos
        else:
            return None
    
    return None

@bot.router.message()
def obtener_cedula(notification: Notification) -> None:
    sender = notification.sender
    message_data = notification.event.get("messageData", {})
    
    # Actualizar tiempo de la última interacción
    user_last_interaction[sender] = time.time()
    
    # Obtener el nombre del remitente
    sender_data = notification.event["senderData"]
    sender_name = sender_data["senderName"]
    
    # Verificar si hay datos de estado para este usuario
    user_state = notification.state_manager.get_state(sender)
    
    # Verificar si el usuario está en estado de menú post-registro
    if user_state:
        try:
            if hasattr(user_state, "state") and user_state.state == "menu_post_registro":
                handle_post_registro_menu(notification, sender, message_data)
                return
            # Verificar si el usuario está en estado de menú principal
            elif hasattr(user_state, "state") and user_state.state == "menu_principal":
                handle_menu_principal(notification, sender, message_data)
                return
            # Verificar si el usuario está en proceso de registro (esperando teléfono)
            elif hasattr(user_state, "state") and user_state.state == "esperando_telefono":
                handle_registro_telefono(notification, sender, message_data)
                return
        except Exception as e:
            print(f"Error al verificar estado del usuario: {e}")
            # Si hay error al procesar el estado, continuar con el flujo normal
    
    # Obtener el texto del mensaje
    message_text = None
    
    # Intentar obtener el texto de diferentes estructuras de mensaje
    extended_text_message_data = message_data.get("extendedTextMessageData", {})
    if extended_text_message_data:
        message_text = extended_text_message_data.get("textMessage") or extended_text_message_data.get("text")
    
    if not message_text:
        text_message_data = message_data.get("textMessageData", {})
        if text_message_data:
            message_text = text_message_data.get("textMessage")

    print(f"message_data: {message_data}")
    print(f"Mensaje recibido: {message_text}")

    # Si no hay texto o es solo /start, enviar mensaje de bienvenida
    if not message_text or message_text.strip() == "/start":
        notification.answer(
            f"👋 Hola, {sender_name}. Para validar tu registro, por favor envíame tu número de cédula."
        )
        return

    # Extraer la cédula del mensaje
    cedula = extract_cedula(message_text)
    
    if not cedula:
        notification.answer(
            f"No he podido identificar un número de cédula válido en tu mensaje. Por favor, envía solo tu número de cédula (entre 6 y 10 dígitos)."
        )
        # Mostrar el menú principal como alternativa
        show_menu_principal(notification, sender_name)
        notification.state_manager.set_state(sender, {"state": "menu_principal", "nombre": sender_name})
        return

    print(f"Procesando cédula: {cedula}")
    db = next(get_db())
    
    try:
        elector_response = asyncio.run(verificar_cedula(CedulaRequest(numero_cedula=cedula), db))

        if elector_response.get("elector"):
            elector_data = elector_response.get("elector")
            nombre_completo = f"{elector_data['p_nombre']} {elector_data['s_nombre']} {elector_data['p_apellido']} {elector_data['s_apellido']}"
            

            # Llamada a la API para obtener el ticket por cédula
            try:
                response = requests.get(f"{NEXT_PUBLIC_API_URL}/api/tickets/cedula/{cedula}")
                response.raise_for_status()
                existing_ticket = response.json()
                print(f"Ticket encontrado: {existing_ticket}")
                chat_id = existing_ticket["telefono"]

                qr_code_base64 = existing_ticket["qr_ticket"]
                qr_buf = BytesIO(base64.b64decode(qr_code_base64))

                message = f"{nombre_completo}, hoy es tu día de suerte!\n\n" \
                        f"Desde este momento estás participando en el Lotto Bueno y este es tu número de ticket {existing_ticket['id']} ¡El número ganador!\n\n" \
                        f"Es importante que guardes nuestro contacto, así podremos anunciarte que tú eres el afortunado ganador.\n" \
                        f"No pierdas tu número de ticket y guarda nuestro contacto, ¡prepárate para celebrar!\n\n" \
                        f"¡Mucha suerte!\n" \
                        f"Lotto Bueno: ¡Tu mejor oportunidad de ganar!"

                send_message(chat_id, message)
                send_qr_code(chat_id, qr_buf)

                phone_contact = obtener_numero_contacto(db)
                print(f"phone_contact: {phone_contact}")
                if phone_contact:
                    enviar_contacto(chat_id, phone_contact.split('@')[0], "Lotto", "Bueno", "Lotto Bueno Inc")
                
                # Mostrar el menú después del registro
                show_post_registro_menu(notification, nombre_completo)
                
                # Guardar el estado del usuario como "en menú post-registro"
                notification.state_manager.set_state(sender, {"state": "menu_post_registro", "nombre": nombre_completo})
            except requests.HTTPError as http_err:
                print(f"HTTP error: {http_err}")
                notification.answer(f"Error al obtener ticket: {http_err}")
                # Mostrar menú principal como fallback
                show_menu_principal(notification, sender_name)
                notification.state_manager.set_state(sender, {"state": "menu_principal", "nombre": sender_name})
            except Exception as err:
                print(f"Unexpected error: {err}")
                notification.answer(f"Error inesperado: {err}")
                # Mostrar menú principal como fallback
                show_menu_principal(notification, sender_name)
                notification.state_manager.set_state(sender, {"state": "menu_principal", "nombre": sender_name})
        else:
            print("Cédula no registrada.")
            notification.answer(f"El número de cédula {cedula} no está registrado en nuestra base de datos.")
            notification.answer("¿Te gustaría registrarte con esta cédula para participar en Lotto Bueno?")
            
            # Iniciar proceso de registro
            notification.state_manager.set_state(sender, {
                "state": "esperando_telefono", 
                "nombre": sender_name,
                "cedula": cedula
            })
            notification.answer("Por favor, envíame tu número de teléfono (con formato 04XX-XXXXXXX):")
    except Exception as e:
        print(f"Error al verificar cédula: {e}")
        notification.answer("Ha ocurrido un error al procesar tu solicitud. Por favor intenta nuevamente con solo tu número de cédula.")
        # Mostrar menú principal como fallback
        show_menu_principal(notification, sender_name)
        notification.state_manager.set_state(sender, {"state": "menu_principal", "nombre": sender_name})

def handle_registro_telefono(notification: Notification, sender: str, message_data: dict):
    """Maneja la entrada del teléfono durante el proceso de registro"""
    # Obtener el texto del mensaje
    message_text = None
    
    # Intentar obtener el texto de diferentes estructuras de mensaje
    extended_text_message_data = message_data.get("extendedTextMessageData", {})
    if extended_text_message_data:
        message_text = extended_text_message_data.get("textMessage") or extended_text_message_data.get("text")
    
    if not message_text:
        text_message_data = message_data.get("textMessageData", {})
        if text_message_data:
            message_text = text_message_data.get("textMessage")
    
    # Obtener la cédula guardada anteriormente
    user_state = notification.state_manager.get_state(sender)
    
    # Acceder a los atributos del objeto State
    cedula = None
    nombre = "Usuario"
    
    if user_state:
        try:
            if hasattr(user_state, "cedula"):
                cedula = user_state.cedula
            if hasattr(user_state, "nombre"):
                nombre = user_state.nombre
        except Exception as e:
            print(f"Error al obtener atributos del estado: {e}")
    
    if not cedula:
        notification.answer("No he podido recuperar tus datos de registro. Por favor intenta nuevamente.")
        show_menu_principal(notification, nombre)
        return
    
    if not message_text:
        notification.answer("No he podido obtener tu mensaje. Por favor, envía tu número de teléfono (ejemplo: 0414-1234567):")
        return
    
    # Extraer el número de teléfono
    telefono = extract_phone_number(message_text)
    
    if not telefono:
        notification.answer("No he podido identificar un número de teléfono válido. Por favor, envía tu número con formato 04XX-XXXXXXX:")
        return
    
    # Llamar a la API para registrar al usuario
    try:
        notification.answer(f"Estoy procesando tu registro con la cédula {cedula} y el teléfono {telefono}...")
        
        # Preparar la solicitud a la API
        payload = {
            "cedula": cedula,
            "telefono": telefono,
            "referido_id": 1  # Valor por defecto para registros desde el bot
        }
        
        response = requests.post(
            f"{NEXT_PUBLIC_API_URL}/api/generate_tickets", 
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
        # Si el registro fue exitoso
        notification.answer(f"¡Felicidades! Tu registro ha sido completado exitosamente.")
        
        if data.get("qr_code"):
            qr_buf = BytesIO(base64.b64decode(data["qr_code"]))
            send_qr_code(sender, qr_buf)
        
        message = f"¡Bienvenido a Lotto Bueno! Tu ticket ha sido generado.\n\n" \
                  f"Es importante que guardes nuestro contacto, así podremos anunciarte si eres el afortunado ganador.\n" \
                  f"No pierdas tu ticket y guarda nuestro contacto, ¡prepárate para celebrar!\n\n" \
                  f"¡Mucha suerte!\n" \
                  f"Lotto Bueno: ¡Tu mejor oportunidad de ganar!"
                  
        notification.answer(message)
        
        # Obtener un contacto aleatorio para compartir
        db = next(get_db())
        phone_contact = obtener_numero_contacto(db)
        if phone_contact:
            enviar_contacto(sender, phone_contact.split('@')[0], "Lotto", "Bueno", "Lotto Bueno Inc")
        
        # Mostrar el menú después del registro
        show_post_registro_menu(notification, nombre)
        
        # Actualizar el estado del usuario - Usando un diccionario serializado para el estado
        notification.state_manager.set_state(sender, {"state": "menu_post_registro", "nombre": nombre})
        
    except requests.exceptions.HTTPError as e:
        print(f"Error HTTP al registrar: {e}")
        notification.answer(f"Ha ocurrido un error durante el registro: {str(e)}")
        show_menu_principal(notification, nombre)
        notification.state_manager.set_state(sender, {"state": "menu_principal", "nombre": nombre})
    except Exception as e:
        print(f"Error inesperado al registrar: {e}")
        notification.answer("Ha ocurrido un error inesperado. Por favor, intenta nuevamente más tarde.")
        show_menu_principal(notification, nombre)
        notification.state_manager.set_state(sender, {"state": "menu_principal", "nombre": nombre})

def show_menu_principal(notification: Notification, nombre: str):
    """Muestra el menú principal para usuarios sin cédula registrada"""
    menu_message = f"Hola {nombre}, estamos aquí para ayudarte. ¿Qué te gustaría hacer?\n\n" \
                  f"*1.* Registrarme en Lotto Bueno 📝\n" \
                  f"*2.* Visitar nuestro sitio web 🌐\n" \
                  f"*3.* Unirme al canal de Telegram 📣\n" \
                  f"*4.* Verificar otra cédula 🔢\n" \
                  f"*5.* Finalizar conversación 👋\n\n" \
                  f"Responde con el *número* de la opción deseada."
    
    # Enviar con formato de WhatsApp
    notification.answer(menu_message)
    print(f"Menú principal enviado a {notification.sender}")

def handle_menu_principal(notification: Notification, sender: str, message_data: dict):
    """Maneja las opciones del menú principal"""
    # Obtener el texto del mensaje
    message_text = None
    
    extended_text_message_data = message_data.get("extendedTextMessageData", {})
    if extended_text_message_data:
        message_text = extended_text_message_data.get("textMessage") or extended_text_message_data.get("text")
    
    if not message_text:
        text_message_data = message_data.get("textMessageData", {})
        if text_message_data:
            message_text = text_message_data.get("textMessage")
    
    print(f"Mensaje recibido en menú principal: {message_text}")
    
    # Extraer opción del mensaje - más robusto
    option = None
    if message_text:
        # Intentar encontrar un número al principio del mensaje
        match = re.match(r'^[^\d]*(\d+)', message_text)
        if match:
            option = match.group(1)
        # Si no, buscar números en cualquier parte
        else:
            for char in message_text:
                if char.isdigit():
                    option = char
                    break
    
    # Obtener el estado y nombre del usuario
    user_state = notification.state_manager.get_state(sender)
    nombre = "Usuario"
    
    if user_state:
        try:
            if hasattr(user_state, "nombre"):
                nombre = user_state.nombre
        except Exception as e:
            print(f"Error al obtener nombre del usuario: {e}")
    
    print(f"Opción seleccionada: {option}")
    
    if option == "1":
        # Opción 1: Registrarse en Lotto Bueno
        notification.answer("¡Excelente! Para registrarte en Lotto Bueno, por favor envíame tu número de cédula:")
        notification.state_manager.delete_state(sender)  # Reiniciar el estado para iniciar el proceso de registro
    elif option == "2":
        # Opción 2: Visitar sitio web
        notification.answer(f"¡Excelente! Puedes visitar nuestro sitio web en:\n{WEBSITE_URL}")
        # Volver a mostrar el menú para permitir al usuario elegir otra opción
        show_menu_principal(notification, nombre)
    elif option == "3":
        # Opción 3: Unirse al canal de Telegram
        notification.answer(f"¡Genial! Únete a nuestro canal de Telegram para recibir noticias y actualizaciones:\n{TELEGRAM_CHANNEL}")
        # Volver a mostrar el menú para permitir al usuario elegir otra opción
        show_menu_principal(notification, nombre)
    elif option == "4":
        # Opción 4: Verificar otra cédula
        notification.answer("Por favor, envíame el número de cédula que deseas verificar:")
        notification.state_manager.delete_state(sender)  # Reiniciar el estado para procesar la nueva cédula
    elif option == "5":
        # Opción 5: Finalizar conversación
        notification.answer(f"¡Gracias por contactarnos, {nombre}! Esperamos verte pronto en Lotto Bueno. ¡Que tengas un excelente día! 🍀")
        notification.state_manager.delete_state(sender)
    else:
        # Opción no válida
        notification.answer("No he podido entender tu selección. Por favor, responde con el número de la opción deseada (1, 2, 3, 4 o 5):")
        show_menu_principal(notification, nombre)

def show_post_registro_menu(notification: Notification, nombre: str):
    """Muestra el menú de opciones después del registro"""
    menu_message = f"¿Qué te gustaría hacer ahora?\n\n" \
                  f"*1.* Visitar nuestro sitio web 🌐\n" \
                  f"*2.* Unirte a nuestro canal de Telegram 📣\n" \
                  f"*3.* Finalizar conversación 👋\n\n" \
                  f"Responde con el *número* de la opción deseada."
    
    # Enviar con formato de WhatsApp
    notification.answer(menu_message)
    print(f"Menú post-registro enviado a {notification.sender}")

def handle_post_registro_menu(notification: Notification, sender: str, message_data: dict):
    """Maneja las opciones del menú post-registro"""
    # Obtener el texto del mensaje
    message_text = None
    
    extended_text_message_data = message_data.get("extendedTextMessageData", {})
    if extended_text_message_data:
        message_text = extended_text_message_data.get("textMessage") or extended_text_message_data.get("text")
    
    if not message_text:
        text_message_data = message_data.get("textMessageData", {})
        if text_message_data:
            message_text = text_message_data.get("textMessage")
    
    print(f"Mensaje recibido en menú post-registro: {message_text}")
    
    # Extraer opción del mensaje - más robusto
    option = None
    if message_text:
        # Intentar encontrar un número al principio del mensaje
        match = re.match(r'^[^\d]*(\d+)', message_text)
        if match:
            option = match.group(1)
        # Si no, buscar números en cualquier parte
        else:
            for char in message_text:
                if char.isdigit():
                    option = char
                    break
    
    # Obtener el estado y nombre del usuario
    user_state = notification.state_manager.get_state(sender)
    nombre = "Usuario"
    
    if user_state:
        try:
            if hasattr(user_state, "nombre"):
                nombre = user_state.nombre
        except Exception as e:
            print(f"Error al obtener nombre del usuario: {e}")
    
    print(f"Opción seleccionada post-registro: {option}")
    
    if option == "1":
        # Opción 1: Visitar sitio web
        notification.answer(f"¡Excelente! Puedes visitar nuestro sitio web en:\n{WEBSITE_URL}")
        # Volver a mostrar el menú para que el usuario pueda elegir otra opción
        show_post_registro_menu(notification, nombre)
    elif option == "2":
        # Opción 2: Unirse al canal de Telegram
        notification.answer(f"¡Genial! Únete a nuestro canal de Telegram para recibir noticias y actualizaciones:\n{TELEGRAM_CHANNEL}")
        # Volver a mostrar el menú para que el usuario pueda elegir otra opción
        show_post_registro_menu(notification, nombre)
    elif option == "3":
        # Opción 3: Finalizar conversación
        notification.answer(f"¡Gracias por registrarte, {nombre}! Estamos emocionados de tenerte como participante en Lotto Bueno. Te notificaremos si eres el ganador. ¡Buena suerte! 🍀")
        notification.state_manager.delete_state(sender)
    else:
        # Opción no válida
        notification.answer("No he podido entender tu selección. Por favor, responde con el número de la opción deseada (1, 2 o 3):")
        show_post_registro_menu(notification, nombre)

def check_inactive_users():
    """Verifica y cierra las sesiones inactivas"""
    current_time = time.time()
    inactive_users = []
    
    for sender, last_time in user_last_interaction.items():
        if current_time - last_time > MAX_INACTIVITY_TIME_SECONDS:
            inactive_users.append(sender)
    
    for sender in inactive_users:
        # Eliminar el estado del usuario
        bot.router.state_manager.delete_state(sender)
        # Eliminar el registro de tiempo de interacción
        del user_last_interaction[sender]
        
        # Opcional: enviar un mensaje de cierre de sesión
        try:
            send_message(sender, "Tu sesión ha finalizado debido a inactividad. Envía cualquier mensaje para comenzar de nuevo.")
        except Exception as e:
            print(f"Error enviando mensaje de inactividad a {sender}: {e}")

# Agregar una función para serializar y deserializar el estado
def set_user_state(notification, sender, state_dict):
    """Guarda el estado del usuario de forma compatible con la biblioteca"""
    try:
        notification.state_manager.set_state(sender, state_dict)
    except Exception as e:
        print(f"Error al guardar estado del usuario: {e}")
        # Intentar otras formas de guardar estado si la primera falla
        try:
            serialized_state = json.dumps(state_dict)
            notification.state_manager.set_state(sender, serialized_state)
        except Exception as e2:
            print(f"Error al guardar estado serializado: {e2}")

def get_user_state(notification, sender):
    """Obtiene el estado del usuario manejando diferentes formatos posibles"""
    try:
        state = notification.state_manager.get_state(sender)
        
        # Si es None, retornar un diccionario vacío
        if state is None:
            return {}
            
        # Si es un objeto, intentar convertirlo a diccionario
        if hasattr(state, "__dict__"):
            return state.__dict__
            
        # Si es un string, intentar parsearlo como JSON
        if isinstance(state, str):
            try:
                return json.loads(state)
            except:
                pass
                
        # Si es un diccionario, retornarlo directamente
        if isinstance(state, dict):
            return state
            
        # Último recurso: crear un diccionario con los atributos del objeto
        result = {}
        for attr in dir(state):
            if not attr.startswith('_') and not callable(getattr(state, attr)):
                result[attr] = getattr(state, attr)
        return result
    except Exception as e:
        print(f"Error al obtener estado del usuario: {e}")
        return {}

if __name__ == "__main__":
    # Iniciar un hilo que verifique los usuarios inactivos cada minuto
    import threading
    
    def inactivity_checker():
        while True:
            check_inactive_users()
            time.sleep(60)  # Verificar cada minuto
    
    threading.Thread(target=inactivity_checker, daemon=True).start()
    
    # Iniciar el bot
    bot.run_forever()
