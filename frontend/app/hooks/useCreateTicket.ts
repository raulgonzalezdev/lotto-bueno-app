'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

// Interfaz para los datos que necesita la mutación (la API)
interface CreateTicketPayload {
  cedula: string;
  telefono: string;
  referido_id: number;
}

// Interfaz para la respuesta esperada de la API al crear un ticket
// Exportar la interfaz para poder usarla en otros archivos
export interface CreateTicketResponse {
  status: 'success' | 'error';
  message: string;
  ticket_number?: string;
  qr_code?: string;
  // Añade otros campos si la API devuelve más datos
}

// Función que realiza la petición POST para crear el ticket
const createTicket = async (payload: CreateTicketPayload): Promise<CreateTicketResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }

  const endpointPath = 'api/generate_tickets'; // Endpoint para crear tickets
  const submitUrl = new URL(endpointPath, baseUrl).toString();

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data: CreateTicketResponse = await response.json();

  if (!response.ok) {
    // Lanza un error con el mensaje de la API si está disponible
    throw new Error(data.message || `Error ${response.status}: No se pudo crear el ticket`);
  }
  
  // Si la API responde con 2xx pero indica un error en su campo 'status'
  if (data.status === 'error') {
     throw new Error(data.message || 'La API indicó un error al crear el ticket');
  }

  return data; // Devuelve la respuesta exitosa
};

// Hook personalizado useCreateTicket
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateTicketResponse, Error, CreateTicketPayload>({
    mutationFn: createTicket, // La función se pasa aquí
    // Opciones de useMutation (onSuccess, onError, etc. van dentro del objeto)
    onSuccess: (data: CreateTicketResponse) => { // Añadir tipo explícito para data
      // Opcional: Invalidar queries relacionadas
      // queryClient.invalidateQueries({ queryKey: ['tickets'] }); // v5 usa objeto
      
      console.log('Ticket creado con éxito:', data);
    },
    onError: (error: Error) => { // Añadir tipo explícito para error
      console.error('Error al crear el ticket:', error);
    },
    // onSettled: () => {
    //   console.log('Mutación de crear ticket finalizada.');
    // },
  });
}; 