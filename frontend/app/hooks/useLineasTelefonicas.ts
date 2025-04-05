'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAPIHost } from '@/hooks/useAPIHost';

// --- Interfaces --- //
interface LineaTelefonica {
  id: number;
  numero: string;
  operador: string;
}

interface LineasResponse {
  total: number;
  items: LineaTelefonica[];
}

interface FetchLineasParams {
  currentPage: number;
  lineasPerPage: number;
  searchTerm?: string;
}

interface LineaCreatePayload {
  numero: string;
  operador: string;
}

interface LineaUpdatePayload {
  numero?: string;
  operador?: string;
}

// --- Funciones Utilitarias y Fetch --- //
const getApiBaseUrl = (): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }
    const url = new URL(baseUrl);
    if (url.protocol === 'http:' && url.hostname !== 'localhost') {
        url.protocol = 'https:';
    }
    return url.toString().replace(/\/$/, ''); // Asegurar que no termine con barra
};

const fetchLineas = async ({ currentPage, lineasPerPage, searchTerm }: FetchLineasParams): Promise<LineasResponse> => {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    skip: ((currentPage - 1) * lineasPerPage).toString(),
    limit: lineasPerPage.toString(),
  });
  if (searchTerm) queryParams.append('search', searchTerm);

  const fetchUrl = `${baseUrl}/api/lineas_telefonicas/?${queryParams.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de líneas`);
  }
  return response.json();
};

const createLinea = async (payload: LineaCreatePayload): Promise<LineaTelefonica> => {
    const baseUrl = getApiBaseUrl();
    const fetchUrl = `${baseUrl}/api/lineas_telefonicas/`;
    const response = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: No se pudo crear la línea`);
    }
    return response.json();
};

const updateLinea = async ({ lineaId, payload }: { lineaId: number; payload: LineaUpdatePayload }): Promise<LineaTelefonica> => {
    const baseUrl = getApiBaseUrl();
    const fetchUrl = `${baseUrl}/api/lineas_telefonicas/${lineaId}`;
    const response = await fetch(fetchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: No se pudo actualizar la línea`);
    }
    return response.json();
};

const deleteLinea = async (lineaId: number): Promise<void> => {
    const baseUrl = getApiBaseUrl();
    const fetchUrl = `${baseUrl}/api/lineas_telefonicas/${lineaId}`;
    const response = await fetch(fetchUrl, { method: "DELETE" });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: No se pudo eliminar la línea`);
    }
    // No se devuelve contenido en DELETE exitoso usualmente
};

// --- Hooks --- //

// Definir una interfaz para la respuesta paginada
export interface LineasResponse {
    items: LineaTelefonica[];
    total: number;
}

export const useLineasTelefonicas = (params: { currentPage: number; lineasPerPage: number; searchTerm: string }) => {
    const { currentPage, lineasPerPage, searchTerm } = params;
    const queryClient = useQueryClient();
    const { APIHost } = useAPIHost(); // Obtener el host desde el hook

    const queryKey = ['lineasTelefonicas', currentPage, lineasPerPage, searchTerm];

    return useQuery<LineasResponse, Error>({ // Especificar el tipo de retorno aquí
        queryKey: queryKey,
        queryFn: async (): Promise<LineasResponse> => {
            if (!APIHost) throw new Error('API host no definido');
            const query = new URLSearchParams({
                skip: ((currentPage - 1) * lineasPerPage).toString(),
                limit: lineasPerPage.toString(),
                ...(searchTerm && { search: searchTerm }),
            }).toString();
            const response = await fetch(`${APIHost}/api/lineas_telefonicas/?${query}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            // Asegurarse de que la respuesta tenga el formato esperado
            if (typeof data === 'object' && data !== null && Array.isArray(data.items) && typeof data.total === 'number') {
                return data as LineasResponse;
            } else {
                // Si la API devuelve un array directamente (caso antiguo?)
                if (Array.isArray(data)){
                    return { items: data, total: data.length }; // Asumir total basado en la longitud si falta
                }
                throw new Error('Formato de respuesta inesperado de la API');
            }
        },
        enabled: !!APIHost, // Solo ejecutar la query si APIHost está definido
        placeholderData: (oldData) => oldData, // Usar datos anteriores como placeholder mientras carga
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
};

export const useCreateLineaTelefonica = () => {
    const queryClient = useQueryClient();
    return useMutation<LineaTelefonica, Error, LineaCreatePayload>({
        mutationFn: createLinea,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineasTelefonicas'] });
        },
    });
};

export const useUpdateLineaTelefonica = () => {
    const queryClient = useQueryClient();
    return useMutation<LineaTelefonica, Error, { lineaId: number; payload: LineaUpdatePayload }>({
        mutationFn: updateLinea,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineasTelefonicas'] });
        },
    });
};

export const useDeleteLineaTelefonica = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, number>({
        mutationFn: deleteLinea,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lineasTelefonicas'] });
        },
    });
}; 