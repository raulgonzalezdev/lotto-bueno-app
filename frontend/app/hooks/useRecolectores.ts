'use client';

import { useQuery } from '@tanstack/react-query';

// Definir la interfaz para un Recolector según tu API
interface Recolector {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  es_referido: boolean;
  // Añade otros campos si son necesarios
}

// Definir la interfaz para la respuesta de la API
interface RecolectoresResponse {
  total: number;
  items: Recolector[];
}

// Función para obtener los recolectores de la API
const fetchRecolectores = async (): Promise<RecolectoresResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }

  const endpointPath = 'api/recolectores/'; // Asegúrate que la ruta es correcta
  const fetchUrl = new URL(endpointPath, baseUrl).toString();

  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Intenta obtener detalles del error
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de recolectores`);
  }

  return response.json();
};

// Hook personalizado
export const useRecolectores = () => {
  return useQuery<RecolectoresResponse, Error>({
    queryKey: ['recolectores'], // La clave ahora es un array
    queryFn: fetchRecolectores, // La función se pasa aquí
    // Opciones adicionales (opcional)
    // staleTime: 5 * 60 * 1000, 
    // cacheTime: 10 * 60 * 1000, 
    // refetchOnWindowFocus: false, 
  });
}; 