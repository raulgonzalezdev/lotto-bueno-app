import os
import sys
import logging
import asyncio
import base64
import re
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
ESPERANDO_CEDULA, ESPERANDO_TELEFONO, MENU_POST_REGISTRO, MENU_PRINCIPAL = range(4)

# Configuración
TELEGRAM_TOKEN = os.getenv("API_TELEGRAM_TOKEN", "8187061957:AAEKVKWfBKuECSC7G63qFYzKbZJiFx4N18Q")
NEXT_PUBLIC_API_URL = os.getenv("NEXT_PUBLIC_API_URL", "https://applottobueno.com")
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://applottobueno.com")
TELEGRAM_CHANNEL = os.getenv("TELEGRAM_CHANNEL", "https://t.me/applottobueno")
WHATSAPP_URL = os.getenv("WHATSAPP_URL", "https://wa.me/17867234220")

# Opciones del menú post-registro
VISITAR_WEB = 'web'
UNIRSE_WHATSAPP = 'whatsapp'
FINALIZAR = 'finalizar'

# Opciones del menú principal
REGISTRARSE = 'register'
VISITAR_WEB_PRINCIPAL = 'web_principal'
UNIRSE_WHATSAPP_PRINCIPAL = 'whatsapp_principal'
INTENTAR_CEDULA = 'cedula'
FINALIZAR_PRINCIPAL = 'finalizar_principal'

def extract_cedula(text):
    """
    Extrae el número de cédula de un texto.
    Busca un número que tenga entre 6 y 10 dígitos.
    """
    if not text:
        return None
        
    # Eliminar /start si está presente
    if text.startswith('/start'):
        text = text[6:].strip()
    
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

def start(update: Update, context: CallbackContext) -> int:
    """Iniciar conversación y solicitar cédula"""
    user = update.effective_user
    
    # Verificar si hay una cédula en el comando /start
    message_text = update.message.text
    cedula = extract_cedula(message_text)
    
    if cedula:
        # Si encontramos una cédula en el mensaje, procesarla directamente
        context.user_data['cedula'] = cedula
        return asyncio.run(procesar_cedula(update, context))
    
    # Si no hay cédula, pedir una
    update.message.reply_text(
        f"👋 Hola, {user.first_name}. Para validar tu registro, por favor envíame tu número de cédula."
    )
    return ESPERANDO_CEDULA

async def procesar_cedula(update: Update, context: CallbackContext) -> int:
    """Procesar la cédula ingresada por el usuario"""
    # Obtener la cédula del mensaje o del contexto si viene de /start
    cedula = context.user_data.get('cedula')
    if not cedula:
        cedula = update.message.text.strip()
        cedula = extract_cedula(cedula)
    
    # Limpiar la cédula del contexto para futuras interacciones
    if 'cedula' in context.user_data:
        del context.user_data['cedula']
    
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    user_name = update.effective_user.first_name
    
    # Logging para depuración
    logger.info(f"Procesando cédula: {cedula}")
    
    # Si no se pudo extraer una cédula válida
    if not cedula:
        update.message.reply_text(
            f"No he podido identificar un número de cédula válido en tu mensaje. Por favor, envía solo tu número de cédula (entre 6 y 10 dígitos)."
        )
        # Mostrar menú principal como alternativa
        return mostrar_menu_principal(update, context)
    
    # Obtener conexión a la base de datos
    db = next(get_db())
    
    try:
        # Verificar cédula en la base de datos
        elector_response = await verificar_cedula(CedulaRequest(numero_cedula=cedula), db)
        
        if not elector_response.get("elector"):
            update.message.reply_text(
                f"El número de cédula {cedula} no está registrado en nuestra base de datos."
            )
            update.message.reply_text(
                "¿Te gustaría registrarte con esta cédula para participar en Lotto Bueno?"
            )
            
            # Guardar la cédula en el contexto para usarla durante el registro
            context.user_data['cedula_registro'] = cedula
            
            # Solicitar el número de teléfono
            update.message.reply_text(
                "Por favor, envíame tu número de teléfono (con formato 04XX-XXXXXXX):"
            )
            return ESPERANDO_TELEFONO
        
        # Obtener datos del elector
        elector_data = elector_response.get("elector")
        nombre_completo = f"{elector_data['p_nombre']} {elector_data['s_nombre']} {elector_data['p_apellido']} {elector_data['s_apellido']}"
        
        # Guardar información del usuario en el contexto
        context.user_data['nombre'] = nombre_completo
        
        try:
            # Llamada a la API para obtener el ticket por cédula
            response = requests.get(f"{NEXT_PUBLIC_API_URL}/api/tickets/cedula/{cedula}")
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
            
            # Mostrar menú post-registro
            return mostrar_menu_post_registro(update, context)
        except Exception as e:
            logger.error(f"Error al procesar ticket: {str(e)}")
            update.message.reply_text(
                f"Ha ocurrido un error al procesar tu ticket. Por favor intenta de nuevo más tarde."
            )
            # Mostrar menú principal como fallback
            return mostrar_menu_principal(update, context)
        
    except Exception as e:
        logger.error(f"Error al procesar cédula: {str(e)}")
        update.message.reply_text(
            f"Ha ocurrido un error al procesar tu solicitud. Por favor intenta de nuevo más tarde."
        )
        # Mostrar menú principal como fallback
        return mostrar_menu_principal(update, context)

def registrar_usuario(update: Update, context: CallbackContext) -> int:
    """Procesar el teléfono y registrar al usuario"""
    user_name = update.effective_user.first_name
    chat_id = update.effective_chat.id
    
    # Obtener la cédula guardada anteriormente
    cedula = context.user_data.get('cedula_registro')
    if not cedula:
        update.message.reply_text("No se encontró la cédula para el registro. Por favor inicia el proceso nuevamente.")
        return mostrar_menu_principal(update, context)
    
    # Extraer el número de teléfono del mensaje
    phone_text = update.message.text
    telefono = extract_phone_number(phone_text)
    
    if not telefono:
        update.message.reply_text(
            "No he podido identificar un número de teléfono válido. Por favor, envía tu número con formato 04XX-XXXXXXX:"
        )
        return ESPERANDO_TELEFONO
    
    # Mostrar mensaje de procesamiento
    update.message.reply_text(f"Estoy procesando tu registro con la cédula {cedula} y el teléfono {telefono}...")
    
    try:
        # Preparar la solicitud a la API
        payload = {
            "cedula": cedula,
            "telefono": telefono,
            "referido_id": 1  # Valor por defecto para registros desde el bot
        }
        
        # Llamar a la API para registrar al usuario
        response = requests.post(
            f"{NEXT_PUBLIC_API_URL}/api/generate_tickets", 
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
        # Mensaje de éxito
        update.message.reply_text("¡Felicidades! Tu registro ha sido completado exitosamente.")
        
        # Si hay un QR code, mostrarlo
        if data.get("qr_code"):
            qr_bytes = base64.b64decode(data["qr_code"])
            with BytesIO(qr_bytes) as bio:
                update.message.reply_photo(bio, caption=f"Ticket #{data.get('id', 'generado')}")
        
        # Mensaje informativo
        message = f"¡Bienvenido a Lotto Bueno! Tu ticket ha sido generado.\n\n" \
                  f"Es importante que guardes nuestro contacto, así podremos anunciarte si eres el afortunado ganador.\n" \
                  f"No pierdas tu ticket y guarda nuestro contacto, ¡prepárate para celebrar!\n\n" \
                  f"¡Mucha suerte!\n" \
                  f"Lotto Bueno: ¡Tu mejor oportunidad de ganar!"
        
        update.message.reply_text(message)
        
        # Limpiar datos del contexto que ya no necesitamos
        if 'cedula_registro' in context.user_data:
            del context.user_data['cedula_registro']
        
        # Guardar el nombre del usuario para usarlo en los menús
        context.user_data['nombre'] = user_name
        
        # Mostrar menú post-registro
        return mostrar_menu_post_registro(update, context)
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"Error HTTP al registrar: {e}")
        update.message.reply_text(f"Ha ocurrido un error durante el registro: {str(e)}")
        return mostrar_menu_principal(update, context)
    except Exception as e:
        logger.error(f"Error inesperado al registrar: {e}")
        update.message.reply_text("Ha ocurrido un error inesperado. Por favor, intenta nuevamente más tarde.")
        return mostrar_menu_principal(update, context)

def mostrar_menu_principal(update: Update, context: CallbackContext) -> int:
    """Mostrar menú principal para usuarios sin cédula registrada"""
    user_name = update.effective_user.first_name
    
    keyboard = [
        [InlineKeyboardButton("Registrarme en Lotto Bueno 📝", callback_data=REGISTRARSE)],
        [InlineKeyboardButton("Visitar sitio web 🌐", callback_data=VISITAR_WEB_PRINCIPAL)],
        [InlineKeyboardButton("Contactarnos por WhatsApp 📱", callback_data=UNIRSE_WHATSAPP_PRINCIPAL)],
        [InlineKeyboardButton("Verificar otra cédula 🔢", callback_data=INTENTAR_CEDULA)],
        [InlineKeyboardButton("Finalizar conversación 👋", callback_data=FINALIZAR_PRINCIPAL)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Enviar mensaje con el menú
    if update.message:
        update.message.reply_text(
            f"Hola {user_name}, estamos aquí para ayudarte. ¿Qué te gustaría hacer?",
            reply_markup=reply_markup
        )
    else:
        # Si no hay mensaje (por ejemplo, si viene de un callback), actualizar el mensaje anterior
        query = update.callback_query
        query.edit_message_text(
            f"Hola {user_name}, estamos aquí para ayudarte. ¿Qué te gustaría hacer?",
            reply_markup=reply_markup
        )
    
    return MENU_PRINCIPAL

def mostrar_menu_post_registro(update: Update, context: CallbackContext) -> int:
    """Mostrar menú post-registro"""
    keyboard = [
        [InlineKeyboardButton("Visitar Sitio Web 🌐", callback_data=VISITAR_WEB)],
        [InlineKeyboardButton("Contactarnos por WhatsApp 📱", callback_data=UNIRSE_WHATSAPP)],
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

def handle_menu_principal_callback(update: Update, context: CallbackContext) -> int:
    """Manejar los callbacks del menú principal"""
    query = update.callback_query
    query.answer()
    
    # Obtener la opción seleccionada
    opcion = query.data
    
    if opcion == REGISTRARSE:
        query.edit_message_text(
            "Para registrarte en Lotto Bueno, necesito algunos datos.\n\n"
            "Por favor, envíame tu número de cédula:"
        )
        return ESPERANDO_CEDULA
    
    elif opcion == VISITAR_WEB_PRINCIPAL:
        query.edit_message_text(
            f"¡Excelente! Puedes visitar nuestro sitio web en:\n{WEBSITE_URL}"
        )
        # Volver a mostrar el menú para continuar interactuando
        return mostrar_menu_principal(update, context)
    
    elif opcion == UNIRSE_WHATSAPP_PRINCIPAL:
        query.edit_message_text(
            f"¡Genial! Puedes contactarnos por WhatsApp en el siguiente enlace:\n{WHATSAPP_URL}"
        )
        # Volver a mostrar el menú para continuar interactuando
        return mostrar_menu_principal(update, context)
    
    elif opcion == INTENTAR_CEDULA:
        query.edit_message_text(
            "Por favor, envíame tu número de cédula para verificar tu registro:"
        )
        return ESPERANDO_CEDULA
    
    elif opcion == FINALIZAR_PRINCIPAL:
        user_name = update.effective_user.first_name
        query.edit_message_text(
            f"¡Gracias por contactarnos, {user_name}! Esperamos verte pronto en Lotto Bueno. "
            "¡Que tengas un excelente día! 🍀"
        )
        return ConversationHandler.END
    
    return MENU_PRINCIPAL

def button_callback(update: Update, context: CallbackContext) -> int:
    """Manejar los callbacks de los botones del menú post-registro"""
    query = update.callback_query
    query.answer()
    
    # Obtener la opción seleccionada
    opcion = query.data
    
    if opcion == VISITAR_WEB:
        query.edit_message_text(
            f"¡Excelente! Puedes visitar nuestro sitio web en:\n{WEBSITE_URL}"
        )
        # Volver a mostrar el menú para continuar interactuando
        return mostrar_menu_post_registro(update, context)
    
    elif opcion == UNIRSE_WHATSAPP:
        query.edit_message_text(
            f"¡Genial! Puedes contactarnos por WhatsApp en el siguiente enlace:\n{WHATSAPP_URL}"
        )
        # Volver a mostrar el menú para continuar interactuando
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
            ESPERANDO_TELEFONO: [
                MessageHandler(Filters.text & ~Filters.command, registrar_usuario)
            ],
            MENU_POST_REGISTRO: [
                CallbackQueryHandler(button_callback)
            ],
            MENU_PRINCIPAL: [
                CallbackQueryHandler(handle_menu_principal_callback)
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