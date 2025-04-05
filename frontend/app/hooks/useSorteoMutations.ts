'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

// --- Interfaces --- //
// Reutilizar la interfaz Ticket si ya está definida globalmente o importarla
interface Ticket {
    id: number;
    numero_ticket: string;
    cedula: string;
    nombre: string;
    telefono: string;
    estado: string;
    municipio: string;
    parroquia: string;
    referido_id: number | null;
    validado: boolean;
    ganador: boolean;
}

interface RealizarSorteoPayload {
    cantidad_ganadores: number;
    estado?: string; // Usar descripción del estado
    municipio?: string; // Usar descripción del municipio
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
    return url.toString().replace(/\/$/, ''); 
};

const realizarSorteo = async (payload: RealizarSorteoPayload): Promise<Ticket[]> => {
    const baseUrl = getApiBaseUrl();
    const fetchUrl = `${baseUrl}/api/sorteo/ganadores`;
    const response = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Usar el mensaje específico de la API si existe
        throw new Error(errorData.message || `Error ${response.status}: No se pudo realizar el sorteo`);
    }
    return response.json();
};

const quitarGanadores = async (): Promise<void> => {
    const baseUrl = getApiBaseUrl();
    const fetchUrl = `${baseUrl}/api/sorteo/quitar_ganadores`;
    const response = await fetch(fetchUrl, { method: "POST" });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: No se pudo quitar la marca de ganadores`);
    }
};

// --- Hooks --- //

export const useRealizarSorteo = () => {
    const queryClient = useQueryClient();
    return useMutation<Ticket[], Error, RealizarSorteoPayload>({
        mutationFn: (payload) => apiClient.post<Ticket[]>('api/sorteo/ganadores', payload),
        onSuccess: () => {
            // Invalidar queries relacionadas si es necesario, por ejemplo, la lista de tickets
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
};

export const useQuitarGanadores = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, void>({
        mutationFn: () => apiClient.post<void>('api/sorteo/quitar_ganadores', {}),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
}; 