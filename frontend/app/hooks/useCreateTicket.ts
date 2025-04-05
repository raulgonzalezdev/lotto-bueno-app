'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

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

// Hook personalizado useCreateTicket
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateTicketResponse, Error, CreateTicketPayload>({
    mutationFn: (payload) => apiClient.post<CreateTicketResponse>('api/generate_tickets', payload),
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