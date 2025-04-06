# Documentación de API de SMS con Google Cloud

Este documento detalla la implementación de envío de SMS a través de Google Cloud Communications API, con soporte para número corto (`77111`).

## Características principales

- **Envío individual de SMS**: Envía mensajes a un solo destinatario
- **Envío masivo**: Procesamiento eficiente en lotes para envío a múltiples destinatarios
- **Identificadores únicos**: Cada mensaje tiene un ID único para seguimiento
- **Agrupación en conversaciones**: Los mensajes se pueden agrupar en hilos de conversación
- **Seguimiento de estado**: Consulta el estado de entrega de mensajes
- **Reintentos automáticos**: Mecanismo de reintento con backoff exponencial
- **Validación de números**: Validación específica para números venezolanos

## Configuración

Las siguientes variables de entorno son necesarias en el archivo `.env`:

```
# IMPORTANTE: Reemplaza estas credenciales con tus propias claves
# NO incluyas credenciales reales en repositorios de código
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SMS_SHORTCODE=77111
SMS_PROVIDER_URL=https://ccaiplatform.com
SMS_SUBDOMAIN=lottobueno
SMS_MAX_RETRIES=3
SMS_RETRY_DELAY=2.0
```

> **⚠️ ADVERTENCIA DE SEGURIDAD**: Nunca incluyas credenciales reales en el código fuente o documentación. Utiliza variables de entorno o archivos de configuración que no se incluyan en el control de versiones.

## Backend API

### Endpoints Disponibles

#### 1. Envío de SMS individual

```
POST /api/google/send_sms
```

Cuerpo de la solicitud:
```json
{
  "phone": "04141234567",
  "message": "Texto del mensaje"
}
```

Respuesta:
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "message_id": "client-a1b2c3d4e5f6g7h8",
  "thread_key": "conv-a1b2c3d4e5f6",
  "request_id": "123456"
}
```

#### 2. Envío de SMS con clave de conversación

```
POST /api/google/send_sms_with_thread
```

Cuerpo de la solicitud:
```json
{
  "phone": "04141234567",
  "message": "Texto del mensaje",
  "thread_key": "conv-a1b2c3d4e5f6"
}
```

#### 3. Envío masivo de SMS

```
POST /api/google/send_bulk_sms_batched
```

Cuerpo de la solicitud:
```json
{
  "messages": [
    {
      "phone": "04141234567",
      "message": "Texto del mensaje"
    },
    {
      "phone": "04161234567",
      "message": "Texto del mensaje"
    }
  ],
  "batch_size": 25
}
```

#### 4. Consulta de estado de mensaje

```
GET /api/google/message_status/{message_id}
```

Respuesta:
```json
{
  "exists": true,
  "details": {
    "phone": "04141234567",
    "message": "Texto del mensaje",
    "thread_key": "conv-a1b2c3d4e5f6",
    "timestamp": "2023-07-01T12:00:00.000Z",
    "status": "delivered",
    "delivered_at": "2023-07-01T12:00:05.000Z",
    "request_id": "123456"
  }
}
```

#### 5. Consulta de mensajes de una conversación

```
GET /api/google/conversation/{thread_key}
```

Respuesta:
```json
{
  "thread_key": "conv-a1b2c3d4e5f6",
  "messages": [
    {
      "message_id": "client-a1b2c3d4e5f6g7h8",
      "phone": "04141234567",
      "message": "Primer mensaje",
      "timestamp": "2023-07-01T12:00:00.000Z",
      "status": "delivered"
    },
    {
      "message_id": "client-i9j0k1l2m3n4o5p6",
      "phone": "04141234567",
      "message": "Segundo mensaje",
      "timestamp": "2023-07-01T12:05:00.000Z",
      "status": "delivered"
    }
  ],
  "count": 2
}
```

## Hooks React

### Hooks disponibles

#### 1. Envío de SMS individual

```typescript
import { useSendGoogleSMS } from '../hooks/useSendSMS';

// En tu componente
const { mutate, isLoading, isError, data } = useSendGoogleSMS();

// Usar el hook
mutate({
  phone: '04141234567',
  message: 'Texto del mensaje',
  thread_key: 'opcional-clave-de-conversacion'
});
```

#### 2. Envío masivo de SMS

```typescript
import { useSendGoogleBulkSMS } from '../hooks/useSendSMS';

// En tu componente
const { mutate, isLoading, isError, data } = useSendGoogleBulkSMS();

// Usar el hook
mutate({
  messages: [
    { phone: '04141234567', message: 'Texto del mensaje' },
    { phone: '04161234567', message: 'Texto del mensaje' }
  ],
  batch_size: 25
});
```

#### 3. Consulta de estado de mensaje

```typescript
import { useMessageStatus } from '../hooks/useSendSMS';

// En tu componente
const { data, isLoading, isError } = useMessageStatus('client-a1b2c3d4e5f6g7h8');
```

#### 4. Consulta de mensajes de una conversación

```typescript
import { useConversation } from '../hooks/useSendSMS';

// En tu componente
const { data, isLoading, isError } = useConversation('conv-a1b2c3d4e5f6');
```

## Limitaciones y consideraciones

- El tamaño máximo del mensaje es de 320 caracteres
- El envío masivo está limitado a 100 destinatarios por lote
- Hay un mecanismo de reintento automático con backoff exponencial (por defecto 3 intentos)
- Los mensajes aparecerán con el número corto 77111 en los dispositivos de los destinatarios
- Solo se soportan números de teléfono venezolanos
- La API valida automáticamente los números antes de enviar los mensajes

## Ejemplo de uso en el frontend

```typescript
import { useState } from 'react';
import { useSendGoogleSMS, useMessageStatus } from '../hooks/useSendSMS';

const SMSComponent = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [messageId, setMessageId] = useState<string | null>(null);
  
  const sendSMS = useSendGoogleSMS();
  const messageStatus = useMessageStatus(messageId);
  
  const handleSendSMS = () => {
    sendSMS.mutate(
      { phone, message },
      {
        onSuccess: (data) => {
          setMessageId(data.message_id || null);
          alert('Mensaje enviado exitosamente');
        },
        onError: (error) => {
          alert(`Error al enviar mensaje: ${error.message}`);
        }
      }
    );
  };
  
  return (
    <div>
      <h2>Enviar SMS</h2>
      <div>
        <label>Teléfono:</label>
        <input 
          type="text" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
        />
      </div>
      <div>
        <label>Mensaje:</label>
        <textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
        />
      </div>
      <button 
        onClick={handleSendSMS} 
        disabled={sendSMS.isLoading}
      >
        {sendSMS.isLoading ? 'Enviando...' : 'Enviar SMS'}
      </button>
      
      {messageId && (
        <div>
          <h3>Estado del mensaje:</h3>
          {messageStatus.isLoading ? (
            <p>Cargando estado...</p>
          ) : messageStatus.isError ? (
            <p>Error al cargar estado: {messageStatus.error.message}</p>
          ) : messageStatus.data?.exists ? (
            <div>
              <p>Estado: {messageStatus.data.details?.status}</p>
              <p>Enviado: {messageStatus.data.details?.timestamp}</p>
              <p>Entregado: {messageStatus.data.details?.delivered_at || 'Pendiente'}</p>
            </div>
          ) : (
            <p>Mensaje no encontrado</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SMSComponent;
``` 