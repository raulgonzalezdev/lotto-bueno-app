'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Interfaces --- //
interface Ticket {
  id: number;
  numero_ticket: string;
  qr_ticket: string;
  cedula: string;
  nombre: string;
  telefono: string;
  estado: string;
  municipio: string;
  parroquia: string;
  referido_id: number | null;
  validado: boolean;
  ganador: boolean;
  created_at: string;
  // Otros campos según tu modelo Ticket
}

interface TicketsResponse {
  total: number;
  items: Ticket[];
}

interface FetchTicketsParams {
  currentPage: number;
  ticketsPerPage: number;
  searchTerm?: string;
  estadoFiltro?: string;
  recolectorFiltro?: string;
}

interface TicketUpdatePayload {
  validado?: boolean;
  ganador?: boolean;
}

// --- Funciones Fetch --- //

const getApiBaseUrl = (): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }
    const url = new URL(baseUrl);
    if (url.protocol === 'http:' && url.hostname !== 'localhost') {
        url.protocol = 'https:';
    }
    return url.toString();
};

const fetchTickets = async ({ currentPage, ticketsPerPage, searchTerm, estadoFiltro, recolectorFiltro }: FetchTicketsParams): Promise<TicketsResponse> => {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    skip: ((currentPage - 1) * ticketsPerPage).toString(),
    limit: ticketsPerPage.toString(),
  });

  if (searchTerm) queryParams.append('search', searchTerm);
  if (estadoFiltro) queryParams.append('codigo_estado', estadoFiltro);
  if (recolectorFiltro) queryParams.append('referido_id', recolectorFiltro);

  const fetchUrl = new URL(`api/tickets/?${queryParams.toString()}`, baseUrl).toString();
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de tickets`);
  }
  return response.json();
};

const updateTicket = async ({ ticketId, payload }: { ticketId: number; payload: TicketUpdatePayload }): Promise<Ticket> => {
    const baseUrl = getApiBaseUrl();
    const fetchUrl = new URL(`api/tickets/${ticketId}`, baseUrl).toString();

    const response = await fetch(fetchUrl, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: No se pudo actualizar el ticket`);
    }
    return response.json();
};

// --- Hooks --- //

// Hook para obtener tickets paginados y filtrados
export const useTickets = (params: FetchTicketsParams) => {
  return useQuery<TicketsResponse, Error>({
    // La clave de la query incluye todos los parámetros para re-fetch automático
    queryKey: ['tickets', params],
    queryFn: () => fetchTickets(params),
    placeholderData: (oldData) => oldData, // Útil para paginación para no ver pantalla en blanco
  });
};

// Hook para la mutación de actualizar ticket
export const useUpdateTicket = () => {
    const queryClient = useQueryClient();
    return useMutation<Ticket, Error, { ticketId: number; payload: TicketUpdatePayload }>({
        mutationFn: updateTicket,
        onSuccess: (updatedTicket) => {
            // Invalidar la query de tickets para refrescar la lista después de la actualización
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            // Opcionalmente, actualizar el caché directamente si se desea una respuesta más rápida
            // queryClient.setQueryData(['tickets', { id: updatedTicket.id }], updatedTicket);
        },
        // onError se puede manejar en el componente que llama a la mutación
    });
}; 