import os
import sys
from pathlib import Path
import random
import base64
import json
import asyncio
import time
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
    if user_state and user_state.get("state") == "menu_post_registro":
        handle_post_registro_menu(notification, sender, message_data)
        return
    
    # Intentar obtener la cédula de ambas posibles estructuras
    extended_text_message_data = message_data.get("extendedTextMessageData", {})
    cedula = extended_text_message_data.get("textMessage") or extended_text_message_data.get("text")

    if not cedula:
        text_message_data = message_data.get("textMessageData", {})
        cedula = text_message_data.get("textMessage")

    print(f"message_data: {message_data}")
    print(f"cedula: {cedula}")

    # Si el texto es /start o no se pudo obtener la cédula, enviar mensaje de bienvenida
    if cedula == "/start" or not cedula:
        notification.answer(
            f"👋 Hola, {sender_name}. Para validar tu registro, por favor envíame tu número de cédula."
        )
        return

    print(f"Procesando cédula: {cedula}")
    db = next(get_db())
    elector_response = asyncio.run(verificar_cedula(CedulaRequest(numero_cedula=cedula), db))

    if elector_response.get("elector"):
        elector_data = elector_response.get("elector")
        nombre_completo = f"{elector_data['p_nombre']} {elector_data['s_nombre']} {elector_data['p_apellido']} {elector_data['s_apellido']}"
        

        # Llamada a la API para obtener el ticket por cédula
        try:
            response = requests.get(f"{NEXT_PUBLIC_API_URL}/tickets/cedula/{cedula}")
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
        except Exception as err:
            print(f"Unexpected error: {err}")
            notification.answer(f"Error inesperado: {err}")
    else:
        print("Cédula no registrada.")
        notification.answer("El número de cédula proporcionado no está registrado. Por favor intenta nuevamente.")

def show_post_registro_menu(notification: Notification, nombre: str):
    """Muestra el menú de opciones después del registro"""
    menu_message = f"¿Qué te gustaría hacer ahora?\n\n" \
                  f"*1*. Visitar nuestro sitio web 🌐\n" \
                  f"*2*. Unirte a nuestro canal de Telegram 📣\n" \
                  f"*3*. Finalizar conversación 👋\n\n" \
                  f"Responde con el número de la opción deseada."
    notification.answer(menu_message)

def handle_post_registro_menu(notification: Notification, sender: str, message_data: dict):
    """Maneja las opciones del menú post-registro"""
    # Intentar obtener la opción seleccionada
    extended_text_message_data = message_data.get("extendedTextMessageData", {})
    option = extended_text_message_data.get("textMessage") or extended_text_message_data.get("text")
    
    if not option:
        text_message_data = message_data.get("textMessageData", {})
        option = text_message_data.get("textMessage")
    
    # Obtener el estado y nombre del usuario
    user_state = notification.state_manager.get_state(sender)
    nombre = user_state.get("nombre", "Usuario")
    
    if option == "1":
        # Opción 1: Visitar sitio web
        notification.answer(f"¡Excelente! Puedes visitar nuestro sitio web en:\n{WEBSITE_URL}")
        notification.answer("¿Hay algo más en lo que pueda ayudarte?")
    elif option == "2":
        # Opción 2: Unirse al canal de Telegram
        notification.answer(f"¡Genial! Únete a nuestro canal de Telegram para recibir noticias y actualizaciones:\n{TELEGRAM_CHANNEL}")
        notification.answer("¿Hay algo más en lo que pueda ayudarte?")
    elif option == "3":
        # Opción 3: Finalizar conversación
        notification.answer(f"¡Gracias por registrarte, {nombre}! Estamos emocionados de tenerte como participante en Lotto Bueno. Te notificaremos si eres el ganador. ¡Buena suerte! 🍀")
        notification.state_manager.delete_state(sender)
    else:
        # Opción no válida
        notification.answer("Por favor, selecciona una opción válida (1, 2 o 3):")
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
