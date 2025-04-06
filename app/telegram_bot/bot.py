import os
import sys
import logging
import asyncio
import base64
from io import BytesIO
import requests
from pathlib import Path

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Añadir el directorio raíz al PYTHONPATH
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import (
    Updater, CommandHandler, MessageHandler, Filters, 
    CallbackContext, CallbackQueryHandler, ConversationHandler
)
from app.main import get_db, send_qr_code, obtener_numero_contacto, verificar_cedula
from app.schemas import CedulaRequest

# Estados para el ConversationHandler
ESPERANDO_CEDULA, MENU_POST_REGISTRO = range(2)

# Configuración
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "8187061957:AAEKVKWfBKuECSC7G63qFYzKbZJiFx4N18Q")
NEXT_PUBLIC_API_URL = os.getenv("NEXT_PUBLIC_API_URL", "https://applottobueno.com")
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://applottobueno.com")
TELEGRAM_CHANNEL = os.getenv("TELEGRAM_CHANNEL", "https://t.me/applottobueno")

# Opciones del menú
VISITAR_WEB = 'web'
UNIRSE_CANAL = 'canal'
FINALIZAR = 'finalizar'

def start(update: Update, context: CallbackContext) -> int:
    """Iniciar conversación y solicitar cédula"""
    user = update.effective_user
    update.message.reply_text(
        f"👋 Hola, {user.first_name}. Para validar tu registro, por favor envíame tu número de cédula."
    )
    return ESPERANDO_CEDULA

async def procesar_cedula(update: Update, context: CallbackContext) -> int:
    """Procesar la cédula ingresada por el usuario"""
    cedula = update.message.text.strip()
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    
    # Logging para depuración
    logger.info(f"Procesando cédula: {cedula}")
    
    # Obtener conexión a la base de datos
    db = next(get_db())
    
    try:
        # Verificar cédula en la base de datos
        elector_response = await verificar_cedula(CedulaRequest(numero_cedula=cedula), db)
        
        if not elector_response.get("elector"):
            update.message.reply_text(
                "El número de cédula proporcionado no está registrado. Por favor intenta nuevamente."
            )
            return ESPERANDO_CEDULA
        
        # Obtener datos del elector
        elector_data = elector_response.get("elector")
        nombre_completo = f"{elector_data['p_nombre']} {elector_data['s_nombre']} {elector_data['p_apellido']} {elector_data['s_apellido']}"
        
        # Llamada a la API para obtener el ticket por cédula
        response = requests.get(f"{NEXT_PUBLIC_API_URL}/tickets/cedula/{cedula}")
        response.raise_for_status()
        existing_ticket = response.json()
        
        # Extraer el QR del ticket
        qr_code_base64 = existing_ticket["qr_ticket"]
        qr_bytes = base64.b64decode(qr_code_base64)
        
        # Mensaje de bienvenida
        message = f"{nombre_completo}, hoy es tu día de suerte!\n\n" \
                f"Desde este momento estás participando en el Lotto Bueno y este es tu número de ticket {existing_ticket['id']} ¡El número ganador!\n\n" \
                f"Es importante que guardes nuestro contacto, así podremos anunciarte que tú eres el afortunado ganador.\n" \
                f"No pierdas tu número de ticket y guarda nuestro contacto, ¡prepárate para celebrar!\n\n" \
                f"¡Mucha suerte!\n" \
                f"Lotto Bueno: ¡Tu mejor oportunidad de ganar!"
        
        # Enviar mensaje
        update.message.reply_text(message)
        
        # Enviar el QR como imagen
        with BytesIO(qr_bytes) as bio:
            update.message.reply_photo(bio, caption=f"Ticket #{existing_ticket['id']}")
        
        # Guardar información del usuario en el contexto
        context.user_data['nombre'] = nombre_completo
        
        # Mostrar menú post-registro
        return mostrar_menu_post_registro(update, context)
        
    except Exception as e:
        logger.error(f"Error al procesar cédula: {str(e)}")
        update.message.reply_text(
            f"Ha ocurrido un error al procesar tu solicitud. Por favor intenta de nuevo más tarde."
        )
        return ConversationHandler.END

def mostrar_menu_post_registro(update: Update, context: CallbackContext) -> int:
    """Mostrar menú post-registro"""
    keyboard = [
        [InlineKeyboardButton("Visitar Sitio Web 🌐", callback_data=VISITAR_WEB)],
        [InlineKeyboardButton("Unirme al Canal de Telegram 📣", callback_data=UNIRSE_CANAL)],
        [InlineKeyboardButton("Finalizar Conversación 👋", callback_data=FINALIZAR)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Enviar mensaje con el menú
    if update.message:
        update.message.reply_text(
            "¿Qué te gustaría hacer ahora?",
            reply_markup=reply_markup
        )
    else:
        # Si no hay mensaje (por ejemplo, si viene de un callback), actualizar el mensaje anterior
        query = update.callback_query
        query.edit_message_text(
            "¿Qué te gustaría hacer ahora?",
            reply_markup=reply_markup
        )
    
    return MENU_POST_REGISTRO

def button_callback(update: Update, context: CallbackContext) -> int:
    """Manejar los callbacks de los botones"""
    query = update.callback_query
    query.answer()
    
    # Obtener la opción seleccionada
    opcion = query.data
    
    if opcion == VISITAR_WEB:
        query.edit_message_text(
            f"¡Excelente! Puedes visitar nuestro sitio web en:\n{WEBSITE_URL}"
        )
        return mostrar_menu_post_registro(update, context)
    
    elif opcion == UNIRSE_CANAL:
        query.edit_message_text(
            f"¡Genial! Únete a nuestro canal para recibir noticias y actualizaciones:\n{TELEGRAM_CHANNEL}"
        )
        return mostrar_menu_post_registro(update, context)
    
    elif opcion == FINALIZAR:
        nombre = context.user_data.get('nombre', 'Usuario')
        query.edit_message_text(
            f"¡Gracias por registrarte, {nombre}! Estamos emocionados de tenerte como participante en Lotto Bueno. "
            "Te notificaremos si eres el ganador. ¡Buena suerte! 🍀"
        )
        return ConversationHandler.END
    
    return MENU_POST_REGISTRO

def cancel(update: Update, context: CallbackContext) -> int:
    """Cancelar y finalizar la conversación"""
    update.message.reply_text("Conversación finalizada. Envía /start para comenzar de nuevo.")
    return ConversationHandler.END

def main():
    """Función principal para iniciar el bot"""
    updater = Updater(TELEGRAM_TOKEN)
    dispatcher = updater.dispatcher
    
    # Crear el manejador de conversación
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            ESPERANDO_CEDULA: [
                MessageHandler(Filters.text & ~Filters.command, lambda update, context: asyncio.run(procesar_cedula(update, context)))
            ],
            MENU_POST_REGISTRO: [
                CallbackQueryHandler(button_callback)
            ]
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    # Añadir el manejador al dispatcher
    dispatcher.add_handler(conv_handler)
    
    # Iniciar el bot
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main() 